/**
 * Tickboard Cloud Worker
 *
 * Routes:
 * - /agent - WebSocket endpoint for local tickboard agents
 * - /b/:boardId/* - Proxy requests to connected agents
 */

export interface Env {
  AGENT_HUB: DurableObjectNamespace;
  TICKBOARD_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

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

    // Health check
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  },
};

// Re-export the Durable Object
export { AgentHub } from "./agent-hub";
