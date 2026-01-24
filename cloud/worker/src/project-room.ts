/**
 * ProjectRoom Durable Object
 *
 * Real-time sync hub for a single project's tick state.
 * Handles WebSocket connections from both local (tk run) and cloud UI (browser).
 * Uses last-write-wins conflict resolution based on updatedAt timestamps.
 *
 * RPC Methods (for tick operations from cloud UI):
 * - addNote(tickId, message): Add a note to a tick
 * - approveTick(tickId): Approve a tick awaiting human action
 * - rejectTick(tickId, reason): Reject a tick
 * - closeTick(tickId, reason?): Close a tick
 * - reopenTick(tickId): Reopen a closed tick
 */

import { DurableObject } from "cloudflare:workers";
import type { Env } from "./index";

// Tick structure (matches Go tick.Tick)
interface Tick {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: number;
  owner?: string;
  parent?: string;
  labels?: string[];
  notes?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  closed_reason?: string;
}

// Connection metadata
interface Connection {
  id: string;
  socket: WebSocket;
  type: "local" | "cloud";
  userId: string;
  lastSeen: number;
}

// Message types from clients
interface SyncFullMessage {
  type: "sync_full";
  ticks: Record<string, Tick>;
}

interface TickUpdateMessage {
  type: "tick_update" | "tick_create";
  tick: Tick;
}

interface TickDeleteMessage {
  type: "tick_delete";
  id: string;
}

// Operation request sent to local client
interface TickOperationRequest {
  type: "tick_operation";
  requestId: string;
  operation: "add_note" | "approve" | "reject" | "close" | "reopen";
  tickId: string;
  payload?: {
    message?: string;  // for add_note
    reason?: string;   // for reject, close
  };
}

// Operation response from local client
interface TickOperationResponse {
  type: "tick_operation_response";
  requestId: string;
  success: boolean;
  tick?: Tick;
  error?: string;
}

// Run event from local client (live output streaming)
interface RunEventMessage {
  type: "run_event";
  epicId: string;
  taskId?: string;  // Present for ralph/subagent, absent for swarm orchestrator
  source: "ralph" | "swarm-orchestrator" | "swarm-subagent";
  event: {
    type: "task-started" | "task-update" | "tool-activity" | "task-completed" | "epic-started" | "epic-completed";
    output?: string;
    status?: string;
    numTurns?: number;
    iteration?: number;
    success?: boolean;
    metrics?: {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheCreationTokens: number;
      costUsd: number;
      durationMs: number;
    };
    activeTool?: {
      name: string;
      input?: string;
      duration?: number;
    };
    message?: string;
    timestamp: string;
  };
}

type ClientMessage = SyncFullMessage | TickUpdateMessage | TickDeleteMessage | TickOperationResponse | RunEventMessage;

// Message types to clients
interface StateFullMessage {
  type: "state_full";
  ticks: Record<string, Tick>;
}

interface TickUpdatedMessage {
  type: "tick_updated";
  tick: Tick;
}

interface TickCreatedMessage {
  type: "tick_created";
  tick: Tick;
}

interface TickDeletedMessage {
  type: "tick_deleted";
  id: string;
}

interface ErrorMessage {
  type: "error";
  message: string;
}

// Local client connection status - sent to cloud clients
interface LocalStatusMessage {
  type: "local_status";
  connected: boolean;
}

type ServerMessage =
  | StateFullMessage
  | TickUpdatedMessage
  | TickCreatedMessage
  | TickDeletedMessage
  | TickOperationRequest
  | LocalStatusMessage
  | RunEventMessage
  | ErrorMessage;

// Cleanup: delete DO storage after 30 days of inactivity
const CLEANUP_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CLEANUP_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Check daily
const OPERATION_TIMEOUT_MS = 30 * 1000; // 30 seconds for operation response

// Pending operation request tracking
interface PendingRequest {
  resolve: (tick: Tick) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class ProjectRoom extends DurableObject<Env> {
  private ticks: Map<string, Tick> = new Map();
  private connections: Map<string, Connection> = new Map();
  private projectId: string = "";
  private lastActivity: number = 0;
  private pendingRequests: Map<string, PendingRequest> = new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Restore state from storage
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<Record<string, Tick>>("ticks");
      if (stored) {
        this.ticks = new Map(Object.entries(stored));
      }

      // Restore last activity timestamp
      this.lastActivity = (await this.ctx.storage.get<number>("lastActivity")) || Date.now();

      // Restore project ID from storage (needed for AgentHub registration)
      this.projectId = (await this.ctx.storage.get<string>("projectId")) || "";

      // Restore WebSocket connections from hibernation
      for (const ws of this.ctx.getWebSockets()) {
        const meta = ws.deserializeAttachment() as Connection | null;
        if (meta) {
          this.connections.set(meta.id, {
            ...meta,
            socket: ws,
          });
        }
      }

      // If we have local connections after hibernation, re-register with AgentHub
      if (this.projectId && this.hasLocalConnections()) {
        console.log(`[ProjectRoom:${this.projectId}] Waking from hibernation with local connections, re-registering with AgentHub`);
        this.notifyAgentHub("register").catch((err) => {
          console.error(`[ProjectRoom:${this.projectId}] Failed to re-register with AgentHub:`, err);
        });
      }

      // Schedule cleanup alarm if we have stored data
      if (this.ticks.size > 0) {
        const currentAlarm = await this.ctx.storage.getAlarm();
        if (!currentAlarm) {
          await this.ctx.storage.setAlarm(Date.now() + CLEANUP_CHECK_INTERVAL_MS);
        }
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Extract project ID from URL (set by worker routing)
    const projectMatch = url.pathname.match(/\/api\/projects\/([^\/]+)/);
    if (projectMatch) {
      this.projectId = decodeURIComponent(projectMatch[1]);
      // Persist projectId so we can re-register with AgentHub after hibernation
      this.ctx.storage.put("projectId", this.projectId).catch(() => {});
    }

    // WebSocket upgrade for sync connections
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocketUpgrade(request, url);
    }

    // REST endpoint: GET /state - returns current tick state (for debugging)
    if (url.pathname.endsWith("/state") && request.method === "GET") {
      return Response.json({
        projectId: this.projectId,
        tickCount: this.ticks.size,
        connectionCount: this.connections.size,
        ticks: Object.fromEntries(this.ticks),
      });
    }

    // REST endpoint: GET /connections - list active connections
    if (url.pathname.endsWith("/connections") && request.method === "GET") {
      const conns = Array.from(this.connections.values()).map((c) => ({
        id: c.id,
        type: c.type,
        userId: c.userId,
        lastSeen: c.lastSeen,
      }));
      return Response.json({ connections: conns });
    }

    return new Response("Not found", { status: 404 });
  }

  private async handleWebSocketUpgrade(
    request: Request,
    url: URL
  ): Promise<Response> {
    try {
      // Extract auth token and connection type from query params
      const token = url.searchParams.get("token");
      const connType = (url.searchParams.get("type") as "local" | "cloud") || "cloud";

      // Skip auth for now - D1 calls from DO seem to fail
      // TODO: Move auth to main worker, pass via header like AgentHub does
      const tokenInfo = { userId: token ? "authenticated" : "anonymous" };

      // Create WebSocket pair
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Accept WebSocket
      this.ctx.acceptWebSocket(server);

      // Generate connection ID
      const connId = crypto.randomUUID();

      // Create connection record (without socket - can't serialize WebSocket)
      const connMeta = {
        id: connId,
        type: connType,
        userId: tokenInfo.userId,
        lastSeen: Date.now(),
      };

      // Serialize connection metadata for hibernation recovery
      server.serializeAttachment(connMeta);

      // Store connection (include socket reference for runtime)
      this.connections.set(connId, {
        ...connMeta,
        socket: server,
      });

      // If this is a local client, notify AgentHub that the board is online
      console.log(`[ProjectRoom:${this.projectId}] Checking if should notify: connType=${connType}, projectId=${this.projectId}`);
      if (connType === "local" && this.projectId) {
        const hasOtherLocal = this.hasLocalConnections(connId);
        console.log(`[ProjectRoom:${this.projectId}] hasOtherLocalConnections(${connId})=${hasOtherLocal}`);
        if (!hasOtherLocal) {
          console.log(`[ProjectRoom:${this.projectId}] Board was offline, registering with AgentHub`);
          await this.notifyAgentHub("register");
        }
      }

      // Send current state to new connection
      const stateMsg: StateFullMessage = {
        type: "state_full",
        ticks: Object.fromEntries(this.ticks),
      };
      server.send(JSON.stringify(stateMsg));

      // For cloud clients, also send local client connection status
      if (connType === "cloud") {
        const statusMsg: LocalStatusMessage = {
          type: "local_status",
          connected: this.hasLocalConnections(),
        };
        server.send(JSON.stringify(statusMsg));
      }

      // For local clients, broadcast their connection to cloud clients
      if (connType === "local") {
        this.broadcastLocalStatus(true);
      }

      console.log(
        `[ProjectRoom:${this.projectId}] Connection ${connId} (${connType}) from user ${tokenInfo.userId}`
      );

      return new Response(null, { status: 101, webSocket: client });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ProjectRoom:${this.projectId}] WebSocket upgrade error:`, message);
      return new Response(`WebSocket upgrade failed: ${message}`, { status: 500 });
    }
  }

  // WebSocket message handler (called by Durable Object runtime)
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Find connection for this socket
    let conn: Connection | undefined;
    for (const [id, c] of this.connections) {
      if (c.socket === ws) {
        conn = c;
        break;
      }
    }

    if (!conn) {
      console.error("[ProjectRoom] Message from unknown connection");
      return;
    }

    conn.lastSeen = Date.now();

    try {
      const msg: ClientMessage = JSON.parse(
        typeof message === "string" ? message : new TextDecoder().decode(message)
      );

      switch (msg.type) {
        case "sync_full":
          await this.handleFullSync(conn, msg.ticks);
          break;

        case "tick_update":
        case "tick_create":
          await this.handleTickUpdate(conn, msg.tick, msg.type === "tick_create");
          break;

        case "tick_delete":
          await this.handleTickDelete(conn, msg.id);
          break;

        case "tick_operation_response":
          this.handleOperationResponse(msg);
          break;

        case "run_event":
          // Run events are transient - just broadcast to cloud clients, don't store
          // Only local clients send run events, only cloud clients receive them
          if (conn.type === "local") {
            this.broadcastToCloudClients(msg);
          }
          break;

        default:
          console.log(`[ProjectRoom] Unknown message type: ${(msg as any).type}`);
      }
    } catch (err) {
      console.error("[ProjectRoom] Failed to parse message:", err);
      const errMsg: ErrorMessage = {
        type: "error",
        message: `Invalid message format: ${err}`,
      };
      ws.send(JSON.stringify(errMsg));
    }
  }

  // WebSocket close handler
  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    await this.removeConnection(ws);
  }

  // WebSocket error handler
  async webSocketError(ws: WebSocket, error: unknown) {
    console.error("[ProjectRoom] WebSocket error:", error);
    await this.removeConnection(ws);
  }

  private async removeConnection(ws: WebSocket) {
    for (const [id, conn] of this.connections) {
      if (conn.socket === ws) {
        const wasLocal = conn.type === "local";
        this.connections.delete(id);
        console.log(`[ProjectRoom:${this.projectId}] Connection ${id} closed`);

        // If this was a local client disconnecting, notify cloud clients
        if (wasLocal) {
          const stillHasLocal = this.hasLocalConnections();
          if (!stillHasLocal) {
            // Broadcast offline status to cloud clients
            this.broadcastLocalStatus(false);
            // Notify AgentHub that the board is offline
            if (this.projectId) {
              await this.notifyAgentHub("unregister");
            }
          }
        }
        break;
      }
    }
  }

  // Broadcast local client connection status to all cloud clients
  private broadcastLocalStatus(connected: boolean) {
    const msg: LocalStatusMessage = {
      type: "local_status",
      connected,
    };
    const data = JSON.stringify(msg);
    for (const conn of this.connections.values()) {
      if (conn.type === "cloud") {
        try {
          conn.socket.send(data);
        } catch (err) {
          console.error(`[ProjectRoom] Failed to send local status to ${conn.id}:`, err);
        }
      }
    }
  }

  // Check if any local connections exist (excluding a specific connId)
  private hasLocalConnections(excludeId?: string): boolean {
    for (const [id, conn] of this.connections) {
      if (conn.type === "local" && id !== excludeId) {
        return true;
      }
    }
    return false;
  }

  // Notify AgentHub of board online/offline status
  private async notifyAgentHub(action: "register" | "unregister"): Promise<void> {
    console.log(`[ProjectRoom:${this.projectId}] notifyAgentHub called: action=${action}`);
    try {
      const hubId = this.env.AGENT_HUB.idFromName("global");
      const hub = this.env.AGENT_HUB.get(hubId);
      const endpoint = action === "register" ? "sync-register" : "sync-unregister";
      const encodedBoard = encodeURIComponent(this.projectId);
      const url = `http://internal/${endpoint}/${encodedBoard}`;
      console.log(`[ProjectRoom:${this.projectId}] Calling AgentHub: ${url}`);
      const resp = await hub.fetch(new Request(url));
      const body = await resp.text();
      console.log(`[ProjectRoom:${this.projectId}] AgentHub response: ${resp.status} ${body}`);
    } catch (err) {
      console.error(`[ProjectRoom:${this.projectId}] Failed to notify AgentHub:`, err);
    }
  }

  private async handleFullSync(conn: Connection, incomingTicks: Record<string, Tick>) {
    let hasChanges = false;

    // Merge incoming ticks with existing (newer wins)
    for (const [id, tick] of Object.entries(incomingTicks)) {
      const existing = this.ticks.get(id);
      if (!existing || this.isNewer(tick, existing)) {
        this.ticks.set(id, tick);
        hasChanges = true;
      }
    }

    // Persist state if changed
    if (hasChanges) {
      await this.persistState();
    }

    // Send merged state back to the source connection
    const stateMsg: StateFullMessage = {
      type: "state_full",
      ticks: Object.fromEntries(this.ticks),
    };
    conn.socket.send(JSON.stringify(stateMsg));

    console.log(
      `[ProjectRoom:${this.projectId}] Full sync from ${conn.id}: ${Object.keys(incomingTicks).length} ticks received, ${this.ticks.size} ticks total`
    );
  }

  private async handleTickUpdate(conn: Connection, tick: Tick, isCreate: boolean) {
    const existing = this.ticks.get(tick.id);

    // Last-write-wins: only accept if newer than existing
    if (existing && !this.isNewer(tick, existing)) {
      console.log(
        `[ProjectRoom:${this.projectId}] Rejected stale update for tick ${tick.id}`
      );
      return;
    }

    // Store the tick
    this.ticks.set(tick.id, tick);
    await this.persistState();

    // Broadcast to all other connections
    const msg: TickUpdatedMessage | TickCreatedMessage = {
      type: isCreate ? "tick_created" : "tick_updated",
      tick,
    };
    this.broadcast(msg, conn.id);

    console.log(
      `[ProjectRoom:${this.projectId}] Tick ${tick.id} ${isCreate ? "created" : "updated"} by ${conn.id}`
    );
  }

  private async handleTickDelete(conn: Connection, id: string) {
    if (!this.ticks.has(id)) {
      console.log(`[ProjectRoom:${this.projectId}] Delete for unknown tick ${id}`);
      return;
    }

    this.ticks.delete(id);
    await this.persistState();

    // Broadcast deletion to all other connections
    const msg: TickDeletedMessage = {
      type: "tick_deleted",
      id,
    };
    this.broadcast(msg, conn.id);

    console.log(`[ProjectRoom:${this.projectId}] Tick ${id} deleted by ${conn.id}`);
  }

  private isNewer(incoming: Tick, existing: Tick): boolean {
    const incomingTime = new Date(incoming.updated_at).getTime();
    const existingTime = new Date(existing.updated_at).getTime();
    return incomingTime > existingTime;
  }

  private broadcast(msg: ServerMessage, excludeConnId?: string) {
    const data = JSON.stringify(msg);
    for (const [id, conn] of this.connections) {
      if (id !== excludeConnId) {
        try {
          conn.socket.send(data);
        } catch (err) {
          console.error(`[ProjectRoom] Failed to send to ${id}:`, err);
          // Connection might be dead, will be cleaned up on next message/close
        }
      }
    }
  }

  private async persistState() {
    this.lastActivity = Date.now();
    await this.ctx.storage.put("ticks", Object.fromEntries(this.ticks));
    await this.ctx.storage.put("lastActivity", this.lastActivity);
  }

  // Periodic alarm for keepalive, state persistence, and cleanup
  async alarm() {
    const now = Date.now();

    // Check for inactivity cleanup (30 days without any sync activity)
    if (this.connections.size === 0 && this.lastActivity > 0) {
      const inactiveFor = now - this.lastActivity;
      if (inactiveFor > CLEANUP_AFTER_MS) {
        console.log(
          `[ProjectRoom:${this.projectId}] Cleaning up after ${Math.round(inactiveFor / (24 * 60 * 60 * 1000))} days of inactivity`
        );
        await this.ctx.storage.deleteAll();
        this.ticks.clear();
        this.lastActivity = 0;
        // Don't schedule next alarm - DO will be garbage collected
        return;
      }
    }

    // Clean up stale connections (5 minutes without activity)
    const staleThreshold = 5 * 60 * 1000;
    for (const [id, conn] of this.connections) {
      if (now - conn.lastSeen > staleThreshold) {
        try {
          conn.socket.close(4000, "Connection stale");
        } catch {
          // Already closed
        }
        this.connections.delete(id);
        console.log(`[ProjectRoom:${this.projectId}] Removed stale connection ${id}`);
      }
    }

    // Persist state periodically (in case of missed updates)
    if (this.ticks.size > 0) {
      await this.persistState();
    }

    // Schedule next alarm
    if (this.connections.size > 0) {
      // Active connections: check every minute for stale cleanup
      await this.ctx.storage.setAlarm(now + 60000);
    } else if (this.ticks.size > 0) {
      // No connections but have data: check daily for inactive cleanup
      await this.ctx.storage.setAlarm(now + CLEANUP_CHECK_INTERVAL_MS);
    }
    // No connections and no data: don't schedule (DO will hibernate/GC)
  }

  // ============================================================================
  // RPC Methods - Called by Worker to perform tick operations
  // ============================================================================

  /**
   * Add a note to a tick. Forwards to local client which writes to file.
   */
  async addNote(tickId: string, message: string): Promise<Tick> {
    return this.sendOperation("add_note", tickId, { message });
  }

  /**
   * Approve a tick awaiting human action.
   */
  async approveTick(tickId: string): Promise<Tick> {
    return this.sendOperation("approve", tickId);
  }

  /**
   * Reject a tick with a reason.
   */
  async rejectTick(tickId: string, reason: string): Promise<Tick> {
    return this.sendOperation("reject", tickId, { reason });
  }

  /**
   * Close a tick with optional reason.
   */
  async closeTick(tickId: string, reason?: string): Promise<Tick> {
    return this.sendOperation("close", tickId, { reason });
  }

  /**
   * Reopen a closed tick.
   */
  async reopenTick(tickId: string): Promise<Tick> {
    return this.sendOperation("reopen", tickId);
  }

  // ============================================================================
  // Operation Handling
  // ============================================================================

  /**
   * Send an operation to the local client and wait for response.
   */
  private async sendOperation(
    operation: TickOperationRequest["operation"],
    tickId: string,
    payload?: TickOperationRequest["payload"]
  ): Promise<Tick> {
    // Find a local connection to send the operation to
    const localConn = this.getLocalConnection();
    if (!localConn) {
      throw new Error("No local client connected - cannot perform operation");
    }

    // Generate unique request ID
    const requestId = crypto.randomUUID();

    // Create promise that will be resolved when response arrives
    const resultPromise = new Promise<Tick>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error("Operation timed out - local client did not respond"));
      }, OPERATION_TIMEOUT_MS);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
    });

    // Send operation request to local client
    const request: TickOperationRequest = {
      type: "tick_operation",
      requestId,
      operation,
      tickId,
      payload,
    };

    console.log(`[ProjectRoom:${this.projectId}] Sending operation ${operation} for tick ${tickId} (requestId: ${requestId})`);
    localConn.socket.send(JSON.stringify(request));

    return resultPromise;
  }

  /**
   * Handle operation response from local client.
   */
  private handleOperationResponse(response: TickOperationResponse): void {
    const pending = this.pendingRequests.get(response.requestId);
    if (!pending) {
      console.warn(`[ProjectRoom:${this.projectId}] Received response for unknown request: ${response.requestId}`);
      return;
    }

    // Clear timeout and remove from pending
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.requestId);

    if (response.success && response.tick) {
      console.log(`[ProjectRoom:${this.projectId}] Operation succeeded for tick ${response.tick.id}`);

      // Update local state and broadcast to other connections
      this.ticks.set(response.tick.id, response.tick);
      this.persistState();

      // Broadcast to cloud clients (local client already has the update)
      const updateMsg: TickUpdatedMessage = {
        type: "tick_updated",
        tick: response.tick,
      };
      this.broadcastToCloudClients(updateMsg);

      pending.resolve(response.tick);
    } else {
      console.error(`[ProjectRoom:${this.projectId}] Operation failed: ${response.error}`);
      pending.reject(new Error(response.error || "Operation failed"));
    }
  }

  /**
   * Get a local connection (prefer the most recently active).
   */
  private getLocalConnection(): Connection | null {
    let best: Connection | null = null;
    for (const conn of this.connections.values()) {
      if (conn.type === "local") {
        if (!best || conn.lastSeen > best.lastSeen) {
          best = conn;
        }
      }
    }
    return best;
  }

  /**
   * Broadcast message to cloud clients only (not local).
   */
  private broadcastToCloudClients(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const conn of this.connections.values()) {
      if (conn.type === "cloud") {
        try {
          conn.socket.send(data);
        } catch (err) {
          console.error(`[ProjectRoom] Failed to send to cloud client ${conn.id}:`, err);
        }
      }
    }
  }
}
