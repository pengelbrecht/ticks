/**
 * AgentHub Durable Object
 *
 * Manages WebSocket connections from local tickboard agents.
 * Relays HTTP requests to connected agents and returns responses.
 */

import type { Env } from "./index";

interface AgentConnection {
  socket: WebSocket;
  boardName: string;
  machineId: string;
  token: string;
  lastSeen: number;
  pendingRequests: Map<string, {
    resolve: (response: RelayResponse) => void;
    reject: (error: Error) => void;
    timeout: number;
  }>;
}

interface RegisterMessage {
  token: string;
  board_name: string;
  machine_id: string;
}

interface RelayRequest {
  id: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}

interface RelayResponse {
  id: string;
  status_code: number;
  headers?: Record<string, string>;
  body?: string;
}

interface Message {
  type: string;
  data?: unknown;
}

export class AgentHub {
  private state: DurableObjectState;
  private env: Env;
  private agents: Map<WebSocket, AgentConnection> = new Map();
  private boardIndex: Map<string, WebSocket> = new Map(); // boardName -> socket

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Set up WebSocket hibernation handlers
    this.state.getWebSockets().forEach((ws) => {
      const meta = ws.deserializeAttachment() as AgentConnection | null;
      if (meta) {
        this.agents.set(ws, {
          ...meta,
          socket: ws,
          pendingRequests: new Map(),
        });
        this.boardIndex.set(meta.boardName, ws);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade for /agent
    if (url.pathname === "/agent") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Accept the WebSocket with hibernation
      this.state.acceptWebSocket(server);

      // Initialize connection state (will be populated on register message)
      const conn: AgentConnection = {
        socket: server,
        boardName: "",
        machineId: "",
        token: "",
        lastSeen: Date.now(),
        pendingRequests: new Map(),
      };
      this.agents.set(server, conn);

      return new Response(null, { status: 101, webSocket: client });
    }

    // Proxy request: /proxy/:boardId/*
    if (url.pathname.startsWith("/proxy/")) {
      const parts = url.pathname.split("/");
      const boardId = parts[2];
      const path = "/" + parts.slice(3).join("/") + url.search;

      return this.proxyRequest(boardId, request, path);
    }

    // List connected boards (for debugging/admin)
    if (url.pathname === "/boards") {
      const boards = Array.from(this.boardIndex.keys());
      return Response.json({ boards, count: boards.length });
    }

    return new Response("Not found", { status: 404 });
  }

  // WebSocket message handler
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const conn = this.agents.get(ws);
    if (!conn) return;

    conn.lastSeen = Date.now();

    try {
      const msg: Message = JSON.parse(
        typeof message === "string" ? message : new TextDecoder().decode(message)
      );

      switch (msg.type) {
        case "register":
          await this.handleRegister(ws, conn, msg.data as RegisterMessage);
          break;

        case "pong":
          // Keepalive response, just update lastSeen
          break;

        case "response":
          this.handleResponse(conn, msg.data as RelayResponse);
          break;

        default:
          console.log(`Unknown message type: ${msg.type}`);
      }
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  }

  // WebSocket close handler
  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    this.removeAgent(ws);
  }

  // WebSocket error handler
  async webSocketError(ws: WebSocket, error: unknown) {
    console.error("WebSocket error:", error);
    this.removeAgent(ws);
  }

  private async handleRegister(
    ws: WebSocket,
    conn: AgentConnection,
    data: RegisterMessage
  ) {
    // Validate token (simple check for now)
    if (!data.token || data.token.length < 8) {
      ws.send(JSON.stringify({ type: "error", data: "Invalid token" }));
      ws.close(4001, "Invalid token");
      return;
    }

    // TODO: Validate token against database/KV

    conn.token = data.token;
    conn.boardName = data.board_name;
    conn.machineId = data.machine_id;

    // Serialize attachment for hibernation
    ws.serializeAttachment({
      boardName: conn.boardName,
      machineId: conn.machineId,
      token: conn.token,
      lastSeen: conn.lastSeen,
    });

    // Index by board name (overwrites if same board reconnects)
    this.boardIndex.set(conn.boardName, ws);

    console.log(`Agent registered: ${conn.boardName}/${conn.machineId}`);

    ws.send(JSON.stringify({ type: "registered", data: { board_name: conn.boardName } }));
  }

  private handleResponse(conn: AgentConnection, data: RelayResponse) {
    const pending = conn.pendingRequests.get(data.id);
    if (pending) {
      clearTimeout(pending.timeout);
      conn.pendingRequests.delete(data.id);
      pending.resolve(data);
    }
  }

  private removeAgent(ws: WebSocket) {
    const conn = this.agents.get(ws);
    if (conn) {
      // Reject all pending requests
      for (const [id, pending] of conn.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Agent disconnected"));
      }

      // Remove from indexes
      if (conn.boardName && this.boardIndex.get(conn.boardName) === ws) {
        this.boardIndex.delete(conn.boardName);
      }
      this.agents.delete(ws);

      console.log(`Agent disconnected: ${conn.boardName || "unregistered"}`);
    }
  }

  private async proxyRequest(
    boardId: string,
    request: Request,
    path: string
  ): Promise<Response> {
    // Find the agent for this board
    const ws = this.boardIndex.get(boardId);
    if (!ws) {
      return Response.json(
        { error: "Board not connected", board: boardId },
        { status: 503 }
      );
    }

    const conn = this.agents.get(ws);
    if (!conn) {
      return Response.json(
        { error: "Agent connection lost" },
        { status: 503 }
      );
    }

    // Generate request ID
    const requestId = crypto.randomUUID();

    // Build relay request
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => {
      // Skip hop-by-hop headers
      if (!["host", "connection", "upgrade"].includes(k.toLowerCase())) {
        headers[k] = v;
      }
    });

    const body = request.body ? await request.text() : undefined;

    const relayReq: RelayRequest = {
      id: requestId,
      method: request.method,
      path: path,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body,
    };

    // Send request to agent
    try {
      const response = await this.sendAndWait(conn, relayReq, 30000);

      // Build response
      const respHeaders = new Headers(response.headers || {});
      return new Response(response.body || null, {
        status: response.status_code,
        headers: respHeaders,
      });
    } catch (err) {
      return Response.json(
        { error: `Relay failed: ${err}` },
        { status: 502 }
      );
    }
  }

  private sendAndWait(
    conn: AgentConnection,
    req: RelayRequest,
    timeoutMs: number
  ): Promise<RelayResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        conn.pendingRequests.delete(req.id);
        reject(new Error("Request timeout"));
      }, timeoutMs) as unknown as number;

      conn.pendingRequests.set(req.id, {
        resolve,
        reject,
        timeout: timeoutId,
      });

      const msg: Message = { type: "request", data: req };
      conn.socket.send(JSON.stringify(msg));
    });
  }

  // Periodic alarm for keepalive and cleanup
  async alarm() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [ws, conn] of this.agents) {
      // Send ping to active connections
      if (now - conn.lastSeen < staleThreshold) {
        try {
          ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          this.removeAgent(ws);
        }
      } else {
        // Close stale connections
        try {
          ws.close(4000, "Connection stale");
        } catch {
          // Already closed
        }
        this.removeAgent(ws);
      }
    }

    // Schedule next alarm
    this.state.storage.setAlarm(Date.now() + 60000); // Every minute
  }
}
