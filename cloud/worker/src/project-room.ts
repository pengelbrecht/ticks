/**
 * ProjectRoom Durable Object
 *
 * Real-time sync hub for a single project's tick state.
 * Handles WebSocket connections from both local (tk run) and cloud UI (browser).
 * Uses last-write-wins conflict resolution based on updatedAt timestamps.
 */

import type { Env } from "./index";
import { validateToken, userOwnsBoard } from "./auth";

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

type ClientMessage = SyncFullMessage | TickUpdateMessage | TickDeleteMessage;

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

type ServerMessage =
  | StateFullMessage
  | TickUpdatedMessage
  | TickCreatedMessage
  | TickDeletedMessage
  | ErrorMessage;

// Cleanup: delete DO storage after 30 days of inactivity
const CLEANUP_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CLEANUP_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Check daily

export class ProjectRoom {
  private state: DurableObjectState;
  private env: Env;
  private ticks: Map<string, Tick> = new Map();
  private connections: Map<string, Connection> = new Map();
  private projectId: string = "";
  private lastActivity: number = 0;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Restore state from storage
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<Record<string, Tick>>("ticks");
      if (stored) {
        this.ticks = new Map(Object.entries(stored));
      }

      // Restore last activity timestamp
      this.lastActivity = (await this.state.storage.get<number>("lastActivity")) || Date.now();

      // Restore WebSocket connections from hibernation
      for (const ws of this.state.getWebSockets()) {
        const meta = ws.deserializeAttachment() as Connection | null;
        if (meta) {
          this.connections.set(meta.id, {
            ...meta,
            socket: ws,
          });
        }
      }

      // Schedule cleanup alarm if we have stored data
      if (this.ticks.size > 0) {
        const currentAlarm = await this.state.storage.getAlarm();
        if (!currentAlarm) {
          await this.state.storage.setAlarm(Date.now() + CLEANUP_CHECK_INTERVAL_MS);
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
    // Extract auth token and connection type from query params
    const token = url.searchParams.get("token");
    const connType = (url.searchParams.get("type") as "local" | "cloud") || "cloud";

    if (!token) {
      return new Response("Missing token", { status: 401 });
    }

    // Validate token
    const tokenInfo = await validateToken(this.env, token);
    if (!tokenInfo) {
      return new Response("Invalid or expired token", { status: 403 });
    }

    // Verify user has access to this project/board
    const hasAccess = await userOwnsBoard(this.env, tokenInfo.userId, this.projectId);
    if (!hasAccess) {
      return new Response("Access denied to project", { status: 403 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Generate connection ID
    const connId = crypto.randomUUID();

    // Create connection record
    const conn: Connection = {
      id: connId,
      socket: server,
      type: connType,
      userId: tokenInfo.userId,
      lastSeen: Date.now(),
    };

    // Accept WebSocket with hibernation support
    this.state.acceptWebSocket(server);

    // Serialize connection metadata for hibernation recovery
    server.serializeAttachment(conn);

    // Store connection
    this.connections.set(connId, conn);

    // Send current state to new connection
    const stateMsg: StateFullMessage = {
      type: "state_full",
      ticks: Object.fromEntries(this.ticks),
    };
    server.send(JSON.stringify(stateMsg));

    console.log(
      `[ProjectRoom:${this.projectId}] Connection ${connId} (${connType}) from user ${tokenInfo.userId}`
    );

    return new Response(null, { status: 101, webSocket: client });
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
    this.removeConnection(ws);
  }

  // WebSocket error handler
  async webSocketError(ws: WebSocket, error: unknown) {
    console.error("[ProjectRoom] WebSocket error:", error);
    this.removeConnection(ws);
  }

  private removeConnection(ws: WebSocket) {
    for (const [id, conn] of this.connections) {
      if (conn.socket === ws) {
        this.connections.delete(id);
        console.log(`[ProjectRoom:${this.projectId}] Connection ${id} closed`);
        break;
      }
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
    await this.state.storage.put("ticks", Object.fromEntries(this.ticks));
    await this.state.storage.put("lastActivity", this.lastActivity);
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
        await this.state.storage.deleteAll();
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
      await this.state.storage.setAlarm(now + 60000);
    } else if (this.ticks.size > 0) {
      // No connections but have data: check daily for inactive cleanup
      await this.state.storage.setAlarm(now + CLEANUP_CHECK_INTERVAL_MS);
    }
    // No connections and no data: don't schedule (DO will hibernate/GC)
  }
}
