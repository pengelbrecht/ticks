/**
 * Auth Integration Tests
 *
 * Comprehensive tests for authentication and authorization across all endpoints.
 * Tests cover:
 * - WebSocket sync endpoint authentication
 * - Tick operation endpoint authorization
 * - Debug endpoint access control
 * - Token validation edge cases
 */

import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  SELF,
} from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";

// Test user data
const TEST_USER_1 = {
  id: "test-user-1",
  email: "user1@test.com",
  passwordHash: "", // Will be set after hashing
};

const TEST_USER_2 = {
  id: "test-user-2",
  email: "user2@test.com",
  passwordHash: "",
};

// Test token data
let validTokenUser1 = "";
let validTokenUser2 = "";
let tokenHashUser1 = "";
let tokenHashUser2 = "";

// Password hashing (matches auth.ts implementation)
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

// Database schema statements (same as schema.sql)
const DB_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE TABLE IF NOT EXISTS tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, token_hash TEXT NOT NULL, last_used_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()), revoked_at INTEGER, UNIQUE(user_id, name))`,
  `CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tokens_hash ON tokens(token_hash)`,
  `CREATE TABLE IF NOT EXISTS boards (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, machine_id TEXT, last_seen_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(user_id, name))`,
  `CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_boards_name ON boards(name)`,
];

/**
 * Setup test database with users, tokens, and boards
 */
async function setupTestData() {
  // Generate tokens
  validTokenUser1 = generateToken();
  validTokenUser2 = generateToken();

  // Hash passwords and tokens
  TEST_USER_1.passwordHash = await hashPassword("password123");
  TEST_USER_2.passwordHash = await hashPassword("password456");
  tokenHashUser1 = await hashPassword(validTokenUser1);
  tokenHashUser2 = await hashPassword(validTokenUser2);

  // Create schema using batch
  await env.DB.batch(DB_SCHEMA_STATEMENTS.map(sql => env.DB.prepare(sql)));

  // Clear existing data
  await env.DB.batch([
    env.DB.prepare("DELETE FROM boards"),
    env.DB.prepare("DELETE FROM tokens"),
    env.DB.prepare("DELETE FROM users"),
  ]);

  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)"
  )
    .bind(TEST_USER_1.id, TEST_USER_1.email, TEST_USER_1.passwordHash)
    .run();

  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)"
  )
    .bind(TEST_USER_2.id, TEST_USER_2.email, TEST_USER_2.passwordHash)
    .run();

  // Create tokens
  await env.DB.prepare(
    "INSERT INTO tokens (id, user_id, name, token_hash) VALUES (?, ?, ?, ?)"
  )
    .bind("token-1", TEST_USER_1.id, "test-token", tokenHashUser1)
    .run();

  await env.DB.prepare(
    "INSERT INTO tokens (id, user_id, name, token_hash) VALUES (?, ?, ?, ?)"
  )
    .bind("token-2", TEST_USER_2.id, "test-token", tokenHashUser2)
    .run();

  // Create boards (projects)
  // user1 owns "user1/project" and "shared-project"
  await env.DB.prepare(
    "INSERT INTO boards (id, user_id, name, machine_id) VALUES (?, ?, ?, ?)"
  )
    .bind("board-1", TEST_USER_1.id, "user1/project", "machine-1")
    .run();

  await env.DB.prepare(
    "INSERT INTO boards (id, user_id, name, machine_id) VALUES (?, ?, ?, ?)"
  )
    .bind("board-2", TEST_USER_1.id, "shared-project", "machine-1")
    .run();

  // user2 owns "user2/project"
  await env.DB.prepare(
    "INSERT INTO boards (id, user_id, name, machine_id) VALUES (?, ?, ?, ?)"
  )
    .bind("board-3", TEST_USER_2.id, "user2/project", "machine-2")
    .run();
}

// =============================================================================
// WebSocket Sync Endpoint Tests
// =============================================================================

describe("ProjectRoom WebSocket Auth", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  it("rejects connection without token", async () => {
    const response = await SELF.fetch(
      "https://example.com/api/projects/test%2Fproject/sync",
      {
        headers: { Upgrade: "websocket" },
      }
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("token required");
  });

  it("rejects connection with invalid token", async () => {
    const response = await SELF.fetch(
      "https://example.com/api/projects/test%2Fproject/sync?token=invalid-token-xyz",
      {
        headers: { Upgrade: "websocket" },
      }
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Invalid or expired token");
  });

  it("rejects connection with empty token", async () => {
    const response = await SELF.fetch(
      "https://example.com/api/projects/test%2Fproject/sync?token=",
      {
        headers: { Upgrade: "websocket" },
      }
    );

    expect(response.status).toBe(401);
  });

  it("rejects connection to non-owned project", async () => {
    // User1 trying to access User2's project
    const response = await SELF.fetch(
      `https://example.com/api/projects/user2%2Fproject/sync?token=${validTokenUser1}`,
      {
        headers: { Upgrade: "websocket" },
      }
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("access denied");
  });

  it("rejects connection to non-existent project", async () => {
    const response = await SELF.fetch(
      `https://example.com/api/projects/nonexistent%2Fproject/sync?token=${validTokenUser1}`,
      {
        headers: { Upgrade: "websocket" },
      }
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("not found");
  });

  it("accepts connection to owned project with query param token", async () => {
    const response = await SELF.fetch(
      `https://example.com/api/projects/user1%2Fproject/sync?token=${validTokenUser1}`,
      {
        headers: { Upgrade: "websocket" },
      }
    );

    // WebSocket upgrade returns 101
    expect(response.status).toBe(101);
    expect(response.webSocket).toBeDefined();

    // Clean up WebSocket - need to accept first
    if (response.webSocket) {
      response.webSocket.accept();
      response.webSocket.close();
    }
  });

  it("accepts connection with token in Sec-WebSocket-Protocol header", async () => {
    const encodedToken = encodeURIComponent(validTokenUser1);
    const response = await SELF.fetch(
      "https://example.com/api/projects/user1%2Fproject/sync",
      {
        headers: {
          Upgrade: "websocket",
          "Sec-WebSocket-Protocol": `ticks-v1, token-${encodedToken}`,
        },
      }
    );

    expect(response.status).toBe(101);
    expect(response.webSocket).toBeDefined();

    // Verify the accepted protocol is "ticks-v1"
    expect(response.headers.get("Sec-WebSocket-Protocol")).toBe("ticks-v1");

    // Clean up WebSocket - need to accept first
    if (response.webSocket) {
      response.webSocket.accept();
      response.webSocket.close();
    }
  });

  it("user2 can access their own project", async () => {
    const response = await SELF.fetch(
      `https://example.com/api/projects/user2%2Fproject/sync?token=${validTokenUser2}`,
      {
        headers: { Upgrade: "websocket" },
      }
    );

    expect(response.status).toBe(101);
    // Clean up WebSocket - need to accept first
    if (response.webSocket) {
      response.webSocket.accept();
      response.webSocket.close();
    }
  });
});

// =============================================================================
// Tick Operation Auth Tests
// =============================================================================

describe("Tick Operation Auth", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  const operations = ["note", "approve", "reject", "close", "reopen"];

  operations.forEach((op) => {
    describe(`/ticks/:id/${op}`, () => {
      it("returns 401 without auth", async () => {
        const body: Record<string, string> = {};
        if (op === "note") body.message = "test note";
        if (op === "reject") body.reason = "test reason";
        if (op === "close") body.reason = "test reason";

        const response = await SELF.fetch(
          `https://example.com/api/projects/user1%2Fproject/ticks/abc123/${op}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );

        expect(response.status).toBe(401);
        const json = await response.json();
        expect(json.error).toBe("Unauthorized");
      });

      it("returns 401 with invalid token", async () => {
        const body: Record<string, string> = {};
        if (op === "note") body.message = "test note";
        if (op === "reject") body.reason = "test reason";
        if (op === "close") body.reason = "test reason";

        const response = await SELF.fetch(
          `https://example.com/api/projects/user1%2Fproject/ticks/abc123/${op}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer invalid-token",
            },
            body: JSON.stringify(body),
          }
        );

        expect(response.status).toBe(401);
      });

      it("returns 403 for non-owned project", async () => {
        const body: Record<string, string> = {};
        if (op === "note") body.message = "test note";
        if (op === "reject") body.reason = "test reason";
        if (op === "close") body.reason = "test reason";

        // User1 trying to operate on User2's project
        const response = await SELF.fetch(
          `https://example.com/api/projects/user2%2Fproject/ticks/abc123/${op}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${validTokenUser1}`,
            },
            body: JSON.stringify(body),
          }
        );

        expect(response.status).toBe(403);
        const json = await response.json();
        expect(json.error).toContain("access denied");
      });

      it("accepts request for owned project (may fail for other reasons)", async () => {
        const body: Record<string, string> = {};
        if (op === "note") body.message = "test note";
        if (op === "reject") body.reason = "test reason";
        if (op === "close") body.reason = "test reason";

        const response = await SELF.fetch(
          `https://example.com/api/projects/user1%2Fproject/ticks/abc123/${op}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${validTokenUser1}`,
            },
            body: JSON.stringify(body),
          }
        );

        // Auth should pass - so not 401 (unauthorized) or 403 (forbidden)
        // Expected: 500 because no local client is connected to handle the operation
        // The error message should indicate the operation was authorized but couldn't be performed
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);

        // Should be 500 with "No local client connected" error
        if (response.status === 500) {
          const json = await response.json();
          expect(json.error).toContain("No local client connected");
        }
      });
    });
  });

  // Test with session cookie authentication
  describe("Session Cookie Auth", () => {
    it("accepts request with valid session cookie", async () => {
      const response = await SELF.fetch(
        "https://example.com/api/projects/user1%2Fproject/ticks/abc123/note",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session=${validTokenUser1}`,
          },
          body: JSON.stringify({ message: "test note" }),
        }
      );

      // Auth should pass (not 401/403)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("rejects request with invalid session cookie", async () => {
      const response = await SELF.fetch(
        "https://example.com/api/projects/user1%2Fproject/ticks/abc123/note",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: "session=invalid-session-token",
          },
          body: JSON.stringify({ message: "test note" }),
        }
      );

      expect(response.status).toBe(401);
    });
  });
});

// =============================================================================
// Board Proxy Endpoint Tests
// =============================================================================

describe("Board Proxy Auth", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  it("rejects unauthenticated requests to board proxy", async () => {
    const response = await SELF.fetch(
      "https://example.com/b/user1%2Fproject/api/ticks"
    );

    expect(response.status).toBe(401);
  });

  it("rejects access to non-owned board", async () => {
    const response = await SELF.fetch(
      "https://example.com/b/user2%2Fproject/api/ticks",
      {
        headers: {
          Authorization: `Bearer ${validTokenUser1}`,
        },
      }
    );

    expect(response.status).toBe(403);
  });

  it("allows static assets without auth", async () => {
    // Static assets should not require auth (CSS, JS, etc.)
    const response = await SELF.fetch(
      "https://example.com/b/user1%2Fproject/static/style.css"
    );

    // Should not be 401 - static assets bypass auth
    // May be 404 if the file doesn't exist, but that's expected
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });
});

// =============================================================================
// SSE Events Endpoint Tests
// =============================================================================

describe("SSE Events Auth", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  it("rejects unauthenticated SSE requests", async () => {
    const response = await SELF.fetch(
      "https://example.com/events/user1%2Fproject"
    );

    expect(response.status).toBe(401);
  });

  it("rejects SSE requests to non-owned board", async () => {
    const response = await SELF.fetch(
      "https://example.com/events/user2%2Fproject",
      {
        headers: {
          Authorization: `Bearer ${validTokenUser1}`,
        },
      }
    );

    expect(response.status).toBe(403);
  });
});

// =============================================================================
// Token Management Endpoint Tests
// =============================================================================

describe("Token Management Auth", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  it("rejects listing tokens without auth", async () => {
    const response = await SELF.fetch("https://example.com/api/tokens");

    expect(response.status).toBe(401);
  });

  it("allows listing tokens with valid auth", async () => {
    const response = await SELF.fetch("https://example.com/api/tokens", {
      headers: {
        Authorization: `Bearer ${validTokenUser1}`,
      },
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.tokens).toBeDefined();
  });

  it("rejects creating token without auth", async () => {
    const response = await SELF.fetch("https://example.com/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "new-token" }),
    });

    expect(response.status).toBe(401);
  });

  it("rejects revoking token without auth", async () => {
    const response = await SELF.fetch("https://example.com/api/tokens/token-1", {
      method: "DELETE",
    });

    expect(response.status).toBe(401);
  });
});

// =============================================================================
// Boards API Auth Tests
// =============================================================================

describe("Boards API Auth", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  it("rejects listing boards without auth", async () => {
    const response = await SELF.fetch("https://example.com/api/boards");

    expect(response.status).toBe(401);
  });

  it("allows listing boards with valid auth", async () => {
    const response = await SELF.fetch("https://example.com/api/boards", {
      headers: {
        Authorization: `Bearer ${validTokenUser1}`,
      },
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.boards).toBeDefined();
  });

  it("rejects deleting board without auth", async () => {
    const response = await SELF.fetch("https://example.com/api/boards/board-1", {
      method: "DELETE",
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when deleting non-owned board", async () => {
    // User1 trying to delete User2's board
    const response = await SELF.fetch("https://example.com/api/boards/board-3", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${validTokenUser1}`,
      },
    });

    // Returns 404 because the query filters by user_id
    expect(response.status).toBe(404);
  });
});

// =============================================================================
// Edge Cases and Security Tests
// =============================================================================

describe("Auth Edge Cases", () => {
  beforeAll(async () => {
    await setupTestData();
  });

  it("handles URL-encoded project IDs correctly", async () => {
    // Project with special characters
    const response = await SELF.fetch(
      `https://example.com/api/projects/user1%2Fproject/sync?token=${validTokenUser1}`,
      {
        headers: { Upgrade: "websocket" },
      }
    );

    expect(response.status).toBe(101);
    if (response.webSocket) {
      response.webSocket.accept();
      response.webSocket.close();
    }
  });

  it("rejects malformed Authorization header", async () => {
    const response = await SELF.fetch(
      "https://example.com/api/projects/user1%2Fproject/ticks/abc123/note",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "NotBearer sometoken",
        },
        body: JSON.stringify({ message: "test" }),
      }
    );

    expect(response.status).toBe(401);
  });

  it("rejects empty Authorization header", async () => {
    const response = await SELF.fetch(
      "https://example.com/api/projects/user1%2Fproject/ticks/abc123/note",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "",
        },
        body: JSON.stringify({ message: "test" }),
      }
    );

    expect(response.status).toBe(401);
  });

  it("rejects Bearer with empty token", async () => {
    const response = await SELF.fetch(
      "https://example.com/api/projects/user1%2Fproject/ticks/abc123/note",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ",
        },
        body: JSON.stringify({ message: "test" }),
      }
    );

    expect(response.status).toBe(401);
  });

  it("handles case-sensitive token correctly", async () => {
    // Tokens should be case-sensitive
    const upperCaseToken = validTokenUser1.toUpperCase();
    const response = await SELF.fetch(
      `https://example.com/api/projects/user1%2Fproject/sync?token=${upperCaseToken}`,
      {
        headers: { Upgrade: "websocket" },
      }
    );

    // Should fail because token is case-sensitive
    expect(response.status).toBe(401);
  });
});

// =============================================================================
// CORS Preflight Tests
// =============================================================================

describe("CORS Preflight", () => {
  it("responds to OPTIONS requests", async () => {
    const response = await SELF.fetch(
      "https://example.com/api/projects/user1%2Fproject/ticks/abc123/note",
      {
        method: "OPTIONS",
      }
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "POST"
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization"
    );
  });
});
