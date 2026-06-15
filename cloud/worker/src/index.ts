/**
 * Ticks Cloud Worker
 *
 * Routes:
 * - /api/projects/:project/sync - WebSocket sync endpoint for ProjectRooms
 * - /api/auth/* - Authentication endpoints
 * - /api/tokens/* - Token management
 * - /api/boards - List boards
 */

import * as auth from "./auth";
import { landingPage } from "./landing";
import { docsPage } from "./docs-page";
import type { ProjectRoom } from "./project-room";

export interface Env {
  AGENT_HUB: DurableObjectNamespace;
  PROJECT_ROOMS: DurableObjectNamespace<ProjectRoom>;
  DB: D1Database;
  ASSETS?: Fetcher; // Static UI assets
  ADMIN_SECRET?: string; // Optional admin secret for maintenance endpoints
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

// Helper to authenticate user and verify project ownership
// Returns userId on success, or a Response (error) on failure
async function withProjectAuth(
  env: Env,
  request: Request,
  projectId: string
): Promise<{ userId: string } | Response> {
  // Authenticate user
  const user = await auth.getUserFromRequest(env, request);
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Verify ownership
  const ownsProject = await auth.userOwnsProject(env, user.userId, projectId);
  if (!ownsProject) {
    return jsonResponse({ error: "Project not found or access denied" }, 403);
  }

  return { userId: user.userId };
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
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ProjectRoom sync endpoint: /api/projects/:project/sync
    // Handles real-time WebSocket sync for tick state
    // Project ID is URL-encoded (e.g., owner%2Frepo for owner/repo)
    const projectSyncMatch = url.pathname.match(/^\/api\/projects\/(.+?)\/sync/);
    if (projectSyncMatch) {
      const projectId = decodeURIComponent(projectSyncMatch[1]);

      // Extract token from Sec-WebSocket-Protocol header (preferred, more secure)
      // Format: "ticks-v1, token-<encoded_token>"
      // Falls back to query param for backward compatibility during migration
      let token: string | null = null;
      const protocols = request.headers.get("Sec-WebSocket-Protocol") || "";
      const tokenMatch = protocols.match(/token-([^,\s]+)/);
      if (tokenMatch) {
        token = decodeURIComponent(tokenMatch[1]);
      }

      // Fallback to query param (legacy, will be removed after migration)
      if (!token) {
        token = url.searchParams.get("token");
      }

      if (!token) {
        return jsonResponse({ error: "Unauthorized - token required" }, 401);
      }

      // Validate token
      const tokenInfo = await auth.validateToken(env, token);
      if (!tokenInfo) {
        return jsonResponse({ error: "Invalid or expired token" }, 401);
      }

      // Check connection type (local = tk board --cloud, cloud = browser)
      const connType = url.searchParams.get("type") || "cloud";

      // For local connections, auto-register the board if it doesn't exist
      // For cloud connections, require the board to already exist
      const ownsProject = await auth.userOwnsProject(env, tokenInfo.userId, projectId);
      if (!ownsProject) {
        if (connType === "local") {
          // Auto-register the board for local connections
          await auth.registerBoard(env, tokenInfo.userId, projectId, "sync");
        } else {
          return jsonResponse({ error: "Project not found or access denied" }, 403);
        }
      }

      // Pass validated userId via header (like AgentHub pattern)
      const headers = new Headers(request.headers);
      headers.set("X-Validated-User-Id", tokenInfo.userId);
      headers.set("X-Validated-Project-Id", projectId);
      headers.set("X-Token-Id", tokenInfo.tokenId);
      headers.set("X-Token-Expires-At", String(tokenInfo.expiresAt));

      // If token was provided via Sec-WebSocket-Protocol, tell ProjectRoom to accept "ticks-v1" protocol
      if (tokenMatch) {
        headers.set("X-Accept-Protocol", "ticks-v1");
      }

      const modifiedRequest = new Request(request.url, {
        method: request.method,
        headers,
        body: request.body,
      });

      // Each project gets its own Durable Object instance
      const doId = env.PROJECT_ROOMS.idFromName(projectId);
      const room = env.PROJECT_ROOMS.get(doId);
      return room.fetch(modifiedRequest);
    }

    // NOTE: Debug endpoints (/state, /connections) removed for security.
    // Use wrangler tail or DO logging for debugging.

    // =========================================================================
    // Tick Operations API - Forward to ProjectRoom via RPC
    // =========================================================================

    // Add note: POST /api/projects/:project/ticks/:tickId/note
    const addNoteMatch = url.pathname.match(/^\/api\/projects\/(.+?)\/ticks\/([^\/]+)\/note$/);
    if (addNoteMatch && request.method === "POST") {
      const projectId = decodeURIComponent(addNoteMatch[1]);
      const tickId = decodeURIComponent(addNoteMatch[2]);

      // Auth check
      const authResult = await withProjectAuth(env, request, projectId);
      if (authResult instanceof Response) {
        return authResult;
      }

      try {
        const body = await request.json() as { message?: string };
        if (!body.message) {
          return jsonResponse({ error: "Message is required" }, 400);
        }

        const doId = env.PROJECT_ROOMS.idFromName(projectId);
        const room = env.PROJECT_ROOMS.get(doId);
        const tick = await room.addNote(tickId, body.message, authResult.userId);
        return jsonResponse(tick);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResponse({ error: message }, 500);
      }
    }

    // Approve tick: POST /api/projects/:project/ticks/:tickId/approve
    const approveMatch = url.pathname.match(/^\/api\/projects\/(.+?)\/ticks\/([^\/]+)\/approve$/);
    if (approveMatch && request.method === "POST") {
      const projectId = decodeURIComponent(approveMatch[1]);
      const tickId = decodeURIComponent(approveMatch[2]);

      // Auth check
      const authResult = await withProjectAuth(env, request, projectId);
      if (authResult instanceof Response) {
        return authResult;
      }

      try {
        const doId = env.PROJECT_ROOMS.idFromName(projectId);
        const room = env.PROJECT_ROOMS.get(doId);
        const tick = await room.approveTick(tickId, authResult.userId);
        return jsonResponse(tick);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResponse({ error: message }, 500);
      }
    }

    // Reject tick: POST /api/projects/:project/ticks/:tickId/reject
    const rejectMatch = url.pathname.match(/^\/api\/projects\/(.+?)\/ticks\/([^\/]+)\/reject$/);
    if (rejectMatch && request.method === "POST") {
      const projectId = decodeURIComponent(rejectMatch[1]);
      const tickId = decodeURIComponent(rejectMatch[2]);

      // Auth check
      const authResult = await withProjectAuth(env, request, projectId);
      if (authResult instanceof Response) {
        return authResult;
      }

      try {
        const body = await request.json() as { reason?: string };
        if (!body.reason) {
          return jsonResponse({ error: "Reason is required" }, 400);
        }

        const doId = env.PROJECT_ROOMS.idFromName(projectId);
        const room = env.PROJECT_ROOMS.get(doId);
        const tick = await room.rejectTick(tickId, body.reason, authResult.userId);
        return jsonResponse(tick);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResponse({ error: message }, 500);
      }
    }

    // Close tick: POST /api/projects/:project/ticks/:tickId/close
    const closeMatch = url.pathname.match(/^\/api\/projects\/(.+?)\/ticks\/([^\/]+)\/close$/);
    if (closeMatch && request.method === "POST") {
      const projectId = decodeURIComponent(closeMatch[1]);
      const tickId = decodeURIComponent(closeMatch[2]);

      // Auth check
      const authResult = await withProjectAuth(env, request, projectId);
      if (authResult instanceof Response) {
        return authResult;
      }

      try {
        const body = await request.json() as { reason?: string };
        const doId = env.PROJECT_ROOMS.idFromName(projectId);
        const room = env.PROJECT_ROOMS.get(doId);
        const tick = await room.closeTick(tickId, body.reason, authResult.userId);
        return jsonResponse(tick);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResponse({ error: message }, 500);
      }
    }

    // Reopen tick: POST /api/projects/:project/ticks/:tickId/reopen
    const reopenMatch = url.pathname.match(/^\/api\/projects\/(.+?)\/ticks\/([^\/]+)\/reopen$/);
    if (reopenMatch && request.method === "POST") {
      const projectId = decodeURIComponent(reopenMatch[1]);
      const tickId = decodeURIComponent(reopenMatch[2]);

      // Auth check
      const authResult = await withProjectAuth(env, request, projectId);
      if (authResult instanceof Response) {
        return authResult;
      }

      try {
        const doId = env.PROJECT_ROOMS.idFromName(projectId);
        const room = env.PROJECT_ROOMS.get(doId);
        const tick = await room.reopenTick(tickId, authResult.userId);
        return jsonResponse(tick);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResponse({ error: message }, 500);
      }
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
    const tAuthStart = Date.now();
    const user = await auth.getUserFromRequest(env, request);
    const authDuration = Date.now() - tAuthStart;
    if (user) {
      console.log(`auth: validateToken took ${authDuration}ms`);
    }

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
      const t0 = Date.now();
      if (!user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      // Get online boards from AgentHub (this is the Durable Object call)
      const tHubStart = Date.now();
      const hubId = env.AGENT_HUB.idFromName("global");
      const hub = env.AGENT_HUB.get(hubId);
      const boardsResp = await hub.fetch(new Request("http://internal/boards"));
      const boardsData = await boardsResp.json() as { boards: string[] };
      const onlineBoards = new Set(boardsData.boards);
      const tHub = Date.now() - tHubStart;

      const tDbStart = Date.now();
      const response = await auth.listBoards(env, user.userId, onlineBoards);
      const tDb = Date.now() - tDbStart;
      const tTotal = Date.now() - t0;

      console.log(`/api/boards: total=${tTotal}ms (auth=${authDuration}ms hub=${tHub}ms db=${tDb}ms)`);

      // Add Server-Timing header (auth already happened before this route)
      const headers = new Headers(response.headers);
      headers.set("Server-Timing", `auth;dur=${authDuration}, hub;dur=${tHub}, db;dur=${tDb}, total;dur=${tTotal + authDuration}`);
      return new Response(response.body, { status: response.status, headers });
    }

    // Delete board
    if (url.pathname.startsWith("/api/boards/") && request.method === "DELETE") {
      if (!user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const boardId = decodeURIComponent(url.pathname.split("/")[3]);
      return auth.deleteBoard(env, user.userId, boardId);
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    // Admin: clear stale sync boards (requires authenticated user)
    if (url.pathname === "/api/admin/clear-sync-boards" && request.method === "POST") {
      if (!user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const hubId = env.AGENT_HUB.idFromName("global");
      const hub = env.AGENT_HUB.get(hubId);
      const clearResp = await hub.fetch(new Request("http://internal/sync-clear"));
      const result = await clearResp.json();
      return jsonResponse(result);
    }

    // Install script redirect
    if (url.pathname === "/install") {
      return Response.redirect(
        "https://raw.githubusercontent.com/pengelbrecht/ticks/main/install.sh",
        302
      );
    }

    // Docs / quickstart page
    if (url.pathname === "/docs") {
      return new Response(docsPage, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Landing page at root
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(landingPage, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // App pages (login/dashboard) - served from static assets
    if (url.pathname === "/login" || url.pathname === "/app") {
      if (env.ASSETS) {
        const appRequest = new Request(new URL("/app.html", url.origin), request);
        return env.ASSETS.fetch(appRequest);
      }
    }

    // Serve static assets for board UI
    if (env.ASSETS) {
      // Try to serve the exact file first (for assets, icons, etc.)
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }

      // Handle /p/assets/* - relative paths from /p/projectname resolve here
      // (because ./assets/foo from /p/projectname becomes /p/assets/foo)
      if (url.pathname.startsWith("/p/assets/")) {
        const assetPath = url.pathname.replace(/^\/p/, ""); // /p/assets/foo -> /assets/foo
        const assetRequest = new Request(new URL(assetPath, url.origin), request);
        return env.ASSETS.fetch(assetRequest);
      }

      // Board routes get the board SPA
      // But first check if this is an asset request under /p/projectname/ (relative path resolution)
      if (url.pathname.startsWith("/p/")) {
        // Check if this looks like an asset request (has file extension)
        const lastSegment = url.pathname.split("/").pop() || "";
        if (lastSegment.includes(".") && !lastSegment.startsWith(".")) {
          // This is an asset request with a file extension - try to serve from /assets/
          const assetPath = url.pathname.replace(/^\/p\/[^/]+/, "");
          const assetRequest = new Request(new URL(assetPath, url.origin), request);
          const assetResp = await env.ASSETS.fetch(assetRequest);
          if (assetResp.status !== 404) {
            return assetResp;
          }
        }
        // Otherwise serve the SPA
        const indexRequest = new Request(new URL("/index.html", url.origin), request);
        return env.ASSETS.fetch(indexRequest);
      }
    }

    return new Response("Not found", { status: 404 });
}

// Re-export Durable Objects
export { AgentHub } from "./agent-hub";
export { ProjectRoom } from "./project-room";
