/**
 * Ticks Cloud Worker
 *
 * Routes:
 * - /agent - WebSocket endpoint for local ticks agents
 * - /b/:boardId/* - Proxy requests to connected agents
 * - /api/auth/* - Authentication endpoints
 * - /api/tokens/* - Token management
 * - /api/boards - List boards
 */

import * as auth from "./auth";
import { landingPage, appPage } from "./landing";

export interface Env {
  AGENT_HUB: DurableObjectNamespace;
  PROJECT_ROOMS: DurableObjectNamespace;
  DB: D1Database;
  ASSETS?: Fetcher; // Static UI assets
}

// CORS headers for API responses
function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      console.error("Worker error:", err);
      return jsonResponse({ error: "Internal server error", details: String(err) }, 500);
    }
  },

  // Cron trigger to keep worker and D1 warm
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const t0 = Date.now();
    await env.DB.prepare("SELECT 1").first();
    console.log(`scheduled: D1 warmup took ${Date.now() - t0}ms`);
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // WebSocket endpoint for agents (legacy relay)
    if (url.pathname === "/agent") {
      // Pre-validate token in main worker (not in DO) to avoid D1 calls inside DO
      const token = url.searchParams.get("token");
      const boardName = url.searchParams.get("board");
      const machineId = url.searchParams.get("machine") || "unknown";
      let userId = "";

      if (token) {
        const tokenInfo = await auth.validateToken(env, token);
        if (tokenInfo) {
          userId = tokenInfo.userId;
          // Register/update board in D1 (done here, not in DO)
          if (boardName) {
            auth.registerBoard(env, userId, boardName, machineId).catch(() => {});
          }
        }
      }

      // Route to the global AgentHub instance, passing pre-validated userId
      const id = env.AGENT_HUB.idFromName("global");
      const hub = env.AGENT_HUB.get(id);

      // Pass userId via header so DO doesn't need to call D1
      const headers = new Headers(request.headers);
      headers.set("X-Validated-User-Id", userId);
      const modifiedRequest = new Request(request.url, {
        method: request.method,
        headers,
        body: request.body,
      });

      return hub.fetch(modifiedRequest);
    }

    // ProjectRoom sync endpoint: /api/projects/:project/sync
    // Handles real-time WebSocket sync for tick state
    const projectSyncMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/sync/);
    if (projectSyncMatch) {
      const projectId = projectSyncMatch[1];
      // Each project gets its own Durable Object instance
      const doId = env.PROJECT_ROOMS.idFromName(projectId);
      const room = env.PROJECT_ROOMS.get(doId);
      return room.fetch(request);
    }

    // ProjectRoom state endpoint: /api/projects/:project/state (for debugging)
    const projectStateMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/state/);
    if (projectStateMatch) {
      const projectId = projectStateMatch[1];
      const doId = env.PROJECT_ROOMS.idFromName(projectId);
      const room = env.PROJECT_ROOMS.get(doId);
      return room.fetch(request);
    }

    // ProjectRoom connections endpoint: /api/projects/:project/connections
    const projectConnsMatch = url.pathname.match(/^\/api\/projects\/([^\/]+)\/connections/);
    if (projectConnsMatch) {
      const projectId = projectConnsMatch[1];
      const doId = env.PROJECT_ROOMS.idFromName(projectId);
      const room = env.PROJECT_ROOMS.get(doId);
      return room.fetch(request);
    }

    // SSE events endpoint: /events/:boardName
    if (url.pathname.startsWith("/events/")) {
      const boardName = decodeURIComponent(url.pathname.split("/")[2]);

      // Authenticate user
      const user = await auth.getUserFromRequest(env, request);
      if (!user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      // Verify user owns this board
      const ownsBoard = await auth.userOwnsBoard(env, user.userId, boardName);
      if (!ownsBoard) {
        return jsonResponse({ error: "Board not found or access denied" }, 403);
      }

      const id = env.AGENT_HUB.idFromName("global");
      const hub = env.AGENT_HUB.get(id);
      return hub.fetch(new Request(`http://internal/events/${boardName}`, request));
    }

    // Board proxy endpoint: /b/:boardId/*
    if (url.pathname.startsWith("/b/")) {
      const parts = url.pathname.split("/");
      if (parts.length >= 3) {
        const boardName = decodeURIComponent(parts[2]);
        const path = "/" + parts.slice(3).join("/");

        // Static assets don't require auth (CSS, JS, images, fonts)
        const isStaticAsset = path.startsWith("/static/") ||
          /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(path);

        if (!isStaticAsset) {
          // Authenticate user
          const user = await auth.getUserFromRequest(env, request);
          if (!user) {
            return jsonResponse({ error: "Unauthorized" }, 401);
          }

          // Verify user owns this board
          const ownsBoard = await auth.userOwnsBoard(env, user.userId, boardName);
          if (!ownsBoard) {
            return jsonResponse({ error: "Board not found or access denied" }, 403);
          }
        }

        const id = env.AGENT_HUB.idFromName("global");
        const hub = env.AGENT_HUB.get(id);

        // Forward to hub with board context
        const proxyUrl = new URL(request.url);
        proxyUrl.pathname = `/proxy/${boardName}${path}`;
        const response = await hub.fetch(new Request(proxyUrl, request));

        // For SSE requests, pass through the streaming response with proper headers
        const acceptHeader = request.headers.get("Accept");
        if (acceptHeader?.includes("text/event-stream") ||
            response.headers.get("Content-Type")?.includes("text/event-stream")) {
          // Return streaming response as-is with CORS headers
          const headers = new Headers(response.headers);
          headers.set("Access-Control-Allow-Origin", "*");
          headers.set("Cache-Control", "no-cache");
          headers.set("Connection", "keep-alive");
          return new Response(response.body, {
            status: response.status,
            headers,
          });
        }

        return response;
      }
    }

    // Auth endpoints
    if (url.pathname === "/api/auth/signup" && request.method === "POST") {
      try {
        const body = await request.json() as { email?: string; password?: string };
        return auth.signup(env, body.email || "", body.password || "");
      } catch {
        return jsonResponse({ error: "Invalid request body" }, 400);
      }
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      try {
        const body = await request.json() as { email?: string; password?: string };
        return auth.login(env, body.email || "", body.password || "");
      } catch {
        return jsonResponse({ error: "Invalid request body" }, 400);
      }
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": auth.clearSessionCookie(),
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Protected routes - require authentication
    const user = await auth.getUserFromRequest(env, request);

    // Token management
    if (url.pathname === "/api/tokens") {
      if (!user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      if (request.method === "GET") {
        return auth.listTokens(env, user.userId);
      }

      if (request.method === "POST") {
        try {
          const body = await request.json() as { name?: string };
          return auth.createToken(env, user.userId, body.name || "");
        } catch {
          return jsonResponse({ error: "Invalid request body" }, 400);
        }
      }
    }

    // Revoke token
    if (url.pathname.startsWith("/api/tokens/") && request.method === "DELETE") {
      if (!user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const tokenId = url.pathname.split("/")[3];
      return auth.revokeToken(env, user.userId, tokenId);
    }

    // List boards
    if (url.pathname === "/api/boards" && request.method === "GET") {
      if (!user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      // Get online boards from AgentHub
      const hubId = env.AGENT_HUB.idFromName("global");
      const hub = env.AGENT_HUB.get(hubId);
      const boardsResp = await hub.fetch(new Request("http://internal/boards"));
      const boardsData = await boardsResp.json() as { boards: string[] };
      const onlineBoards = new Set(boardsData.boards);

      return auth.listBoards(env, user.userId, onlineBoards);
    }

    // Delete board
    if (url.pathname.startsWith("/api/boards/") && request.method === "DELETE") {
      if (!user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const boardId = decodeURIComponent(url.pathname.split("/")[3]);
      return auth.deleteBoard(env, user.userId, boardId);
    }

    // Health check - also warms up D1 connection
    if (url.pathname === "/health") {
      // Simple query to keep D1 connection warm
      const t0 = Date.now();
      await env.DB.prepare("SELECT 1").first();
      console.log(`health: D1 warmup took ${Date.now() - t0}ms`);
      return new Response("ok", { status: 200 });
    }

    // Landing page at root
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(landingPage, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // App pages (login/dashboard) - served from worker, not assets
    if (url.pathname === "/login" || url.pathname === "/app") {
      return new Response(appPage, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Serve static assets for board UI
    if (env.ASSETS) {
      // Try to serve the exact file first (for assets, icons, etc.)
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }

      // Board routes get the board SPA
      if (url.pathname.startsWith("/p/")) {
        const indexRequest = new Request(new URL("/index.html", url.origin), request);
        return env.ASSETS.fetch(indexRequest);
      }
    }

    return new Response("Not found", { status: 404 });
}

// Re-export Durable Objects
export { AgentHub } from "./agent-hub";
export { ProjectRoom } from "./project-room";
