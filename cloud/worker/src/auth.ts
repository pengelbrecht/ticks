/**
 * Auth module for user management and token handling
 */

import type { Env } from "./index";

// Retry wrapper for D1 operations to handle transient failures
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on timeout/transient errors
      if (!lastError.message.includes("timeout") &&
          !lastError.message.includes("D1_ERROR") &&
          !lastError.message.includes("reset")) {
        throw lastError;
      }
      // Exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate a random token
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate a short ID
function generateId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
}

interface Token {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  last_used_at: number | null;
  created_at: number;
}

interface Board {
  id: string;
  user_id: string;
  name: string;
  machine_id: string | null;
  last_seen_at: number | null;
  created_at: number;
}

// Signup: create new user
export async function signup(
  env: Env,
  email: string,
  password: string
): Promise<Response> {
  if (!email || !password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId();

  try {
    await withRetry(() =>
      env.DB.prepare(
        "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)"
      )
        .bind(userId, email.toLowerCase(), passwordHash)
        .run()
    );

    return Response.json({ id: userId, email: email.toLowerCase() }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }
    throw err;
  }
}

// Login: authenticate user and return session token
export async function login(
  env: Env,
  email: string,
  password: string
): Promise<Response> {
  const t0 = Date.now();
  try {
    if (!email || !password) {
      return Response.json({ error: "Email and password required" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    console.log(`login: hash took ${Date.now() - t0}ms`);

    const t1 = Date.now();
    const result = await env.DB.prepare(
      "SELECT id, email FROM users WHERE email = ? AND password_hash = ?"
    )
      .bind(email.toLowerCase(), passwordHash)
      .first<User>();
    console.log(`login: SELECT user took ${Date.now() - t1}ms`);

    if (!result) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Delete old session tokens for this user (cleanup) - fire and forget
    const t2 = Date.now();
    env.DB.prepare(
      "DELETE FROM tokens WHERE user_id = ? AND name LIKE 'session%'"
    )
      .bind(result.id)
      .run()
      .then(() => console.log(`login: DELETE sessions took ${Date.now() - t2}ms`))
      .catch(() => {});

    // Create a new session token
    const token = generateToken();
    const tokenHash = await hashPassword(token);
    const tokenId = generateId();
    const sessionName = `session-${Date.now()}`;

    const t3 = Date.now();
    await env.DB.prepare(
      "INSERT INTO tokens (id, user_id, name, token_hash) VALUES (?, ?, ?, ?)"
    )
      .bind(tokenId, result.id, sessionName, tokenHash)
      .run();
    console.log(`login: INSERT token took ${Date.now() - t3}ms`);

    console.log(`login: total ${Date.now() - t0}ms`);

    const response = Response.json({
      user: { id: result.id, email: result.email },
      token: token,
    });

    // Also set session cookie for browser-based access
    const headers = new Headers(response.headers);
    headers.set("Set-Cookie", createSessionCookie(token));

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Login error after ${Date.now() - t0}ms:`, message);
    return Response.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}

// Create API token for local agents
export async function createToken(
  env: Env,
  userId: string,
  name: string
): Promise<Response> {
  if (!name) {
    return Response.json({ error: "Token name required" }, { status: 400 });
  }

  const token = generateToken();
  const tokenHash = await hashPassword(token);
  const tokenId = generateId();

  try {
    await withRetry(() =>
      env.DB.prepare(
        "INSERT INTO tokens (id, user_id, name, token_hash) VALUES (?, ?, ?, ?)"
      )
        .bind(tokenId, userId, name, tokenHash)
        .run()
    );

    // Return the full token only once - user must save it
    return Response.json({ id: tokenId, name, token }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
      return Response.json({ error: "Token name already exists" }, { status: 409 });
    }
    throw err;
  }
}

// List user's tokens (active only - revoked are deleted)
export async function listTokens(env: Env, userId: string): Promise<Response> {
  try {
    const result = await withRetry(() =>
      env.DB.prepare(
        "SELECT id, name, last_used_at, created_at FROM tokens WHERE user_id = ? ORDER BY created_at DESC"
      )
        .bind(userId)
        .all<Token>()
    );

    return Response.json({
      tokens: result.results.map((t) => ({
        id: t.id,
        name: t.name,
        lastUsedAt: t.last_used_at,
        createdAt: t.created_at,
        revoked: false, // Active tokens only
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("List tokens error:", message);
    return Response.json({ tokens: [] }); // Return empty on error
  }
}

// Revoke (delete) a token
export async function revokeToken(
  env: Env,
  userId: string,
  tokenId: string
): Promise<Response> {
  try {
    const result = await withRetry(() =>
      env.DB.prepare(
        "DELETE FROM tokens WHERE id = ? AND user_id = ?"
      )
        .bind(tokenId, userId)
        .run()
    );

    if (result.meta.changes === 0) {
      return Response.json({ error: "Token not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Revoke token error:", message);
    return Response.json({ error: "Failed to revoke token. Please try again." }, { status: 500 });
  }
}

// Validate a token and return user info
export async function validateToken(
  env: Env,
  token: string
): Promise<{ userId: string; tokenId: string } | null> {
  const t0 = Date.now();
  try {
    const tokenHash = await hashPassword(token);

    const result = await env.DB.prepare(
      "SELECT t.id, t.user_id FROM tokens t WHERE t.token_hash = ?"
    )
      .bind(tokenHash)
      .first<{ id: string; user_id: string }>();
    console.log(`validateToken: SELECT took ${Date.now() - t0}ms`);

    if (!result) {
      return null;
    }

    // Update last used (fire and forget - don't block on this)
    env.DB.prepare("UPDATE tokens SET last_used_at = unixepoch() WHERE id = ?")
      .bind(result.id)
      .run()
      .catch(() => {}); // Ignore errors

    return { userId: result.user_id, tokenId: result.id };
  } catch (err) {
    console.error(`Validate token error after ${Date.now() - t0}ms:`, err);
    return null;
  }
}

// Register or update a board
export async function registerBoard(
  env: Env,
  userId: string,
  boardName: string,
  machineId: string
): Promise<string> {
  const boardId = generateId();

  try {
    // Upsert board
    await withRetry(() =>
      env.DB.prepare(
        `INSERT INTO boards (id, user_id, name, machine_id, last_seen_at)
         VALUES (?, ?, ?, ?, unixepoch())
         ON CONFLICT(user_id, name) DO UPDATE SET
           machine_id = excluded.machine_id,
           last_seen_at = unixepoch()`
      )
        .bind(boardId, userId, boardName, machineId)
        .run()
    );

    // Get the actual ID (in case of upsert)
    const result = await withRetry(() =>
      env.DB.prepare(
        "SELECT id FROM boards WHERE user_id = ? AND name = ?"
      )
        .bind(userId, boardName)
        .first<{ id: string }>()
    );

    return result?.id || boardId;
  } catch (err) {
    console.error("Register board error:", err);
    return boardId;
  }
}

// List user's boards with online status
export async function listBoards(
  env: Env,
  userId: string,
  onlineBoards: Set<string>
): Promise<Response> {
  try {
    const result = await withRetry(() =>
      env.DB.prepare(
        "SELECT id, name, machine_id, last_seen_at, created_at FROM boards WHERE user_id = ? ORDER BY name"
      )
        .bind(userId)
        .all<Board>()
    );

    return Response.json({
      boards: result.results.map((b) => ({
        id: b.id,
        name: b.name,
        machineId: b.machine_id,
        lastSeenAt: b.last_seen_at,
        createdAt: b.created_at,
        online: onlineBoards.has(b.name),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("List boards error:", message);
    return Response.json({ boards: [] }); // Return empty on error
  }
}

// Get user ID from request (via Authorization header or session cookie)
export async function getUserFromRequest(
  env: Env,
  request: Request
): Promise<{ userId: string; tokenId: string } | null> {
  // Try Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return validateToken(env, token);
  }

  // Try session cookie
  const cookie = request.headers.get("Cookie");
  if (cookie) {
    const sessionMatch = cookie.match(/session=([^;]+)/);
    if (sessionMatch) {
      return validateToken(env, sessionMatch[1]);
    }
  }

  return null;
}

// Check if user owns a specific board
export async function userOwnsBoard(
  env: Env,
  userId: string,
  boardName: string
): Promise<boolean> {
  try {
    const result = await withRetry(() =>
      env.DB.prepare(
        "SELECT 1 FROM boards WHERE user_id = ? AND name = ?"
      )
        .bind(userId, boardName)
        .first()
    );

    return result !== null;
  } catch (err) {
    console.error("Check board ownership error:", err);
    return false;
  }
}

// Delete a board from the user's dashboard
export async function deleteBoard(
  env: Env,
  userId: string,
  boardId: string
): Promise<Response> {
  try {
    const result = await withRetry(() =>
      env.DB.prepare(
        "DELETE FROM boards WHERE id = ? AND user_id = ?"
      )
        .bind(boardId, userId)
        .run()
    );

    if (result.meta.changes === 0) {
      return Response.json({ error: "Board not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Delete board error:", message);
    return Response.json({ error: "Failed to delete board. Please try again." }, { status: 500 });
  }
}

// Create session cookie header
export function createSessionCookie(token: string, maxAge = 30 * 24 * 60 * 60): string {
  return `session=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`;
}

// Clear session cookie header
export function clearSessionCookie(): string {
  return "session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/";
}
