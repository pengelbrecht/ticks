/**
 * Tickboard Cloud Worker
 *
 * Routes:
 * - /agent - WebSocket endpoint for local tickboard agents
 * - /b/:boardId/* - Proxy requests to connected agents
 * - /api/auth/* - Authentication endpoints
 * - /api/tokens/* - Token management
 * - /api/boards - List boards
 */

import * as auth from "./auth";

export interface Env {
  AGENT_HUB: DurableObjectNamespace;
  DB: D1Database;
  TICKBOARD_SECRET?: string;
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
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // WebSocket endpoint for agents
    if (url.pathname === "/agent") {
      // Route to the global AgentHub instance
      const id = env.AGENT_HUB.idFromName("global");
      const hub = env.AGENT_HUB.get(id);
      return hub.fetch(request);
    }

    // Board proxy endpoint: /b/:boardId/*
    if (url.pathname.startsWith("/b/")) {
      const parts = url.pathname.split("/");
      if (parts.length >= 3) {
        const boardId = parts[2];
        const path = "/" + parts.slice(3).join("/");

        const id = env.AGENT_HUB.idFromName("global");
        const hub = env.AGENT_HUB.get(id);

        // Forward to hub with board context
        const proxyUrl = new URL(request.url);
        proxyUrl.pathname = `/proxy/${boardId}${path}`;
        return hub.fetch(new Request(proxyUrl, request));
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

    // Health check
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  },
};

// Re-export the Durable Object
export { AgentHub } from "./agent-hub";
