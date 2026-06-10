import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

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

interface SyncMessage {
  type: string;
  [key: string]: unknown;
}

function makeTick(id: string, title = id): Record<string, unknown> {
  return {
    id,
    title,
    description: "",
    status: "open",
    priority: 2,
    type: "task",
    owner: "sync@test.com",
    created_by: "sync@test.com",
    created_at: "2026-03-21T12:00:00.000Z",
    updated_at: "2026-03-21T12:00:00.000Z",
  };
}

function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resetDatabase(): Promise<void> {
  await env.DB.batch(DB_SCHEMA_STATEMENTS.map((sql) => env.DB.prepare(sql)));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM boards"),
    env.DB.prepare("DELETE FROM tokens"),
    env.DB.prepare("DELETE FROM users"),
  ]);
}

async function createUserToken(): Promise<{ token: string; userId: string }> {
  const userId = randomId("user");
  const tokenId = randomId("token");
  const email = `${userId}@test.com`;
  const passwordHash = await hashPassword("password123");
  const token = randomId("session-token");
  const tokenHash = await hashPassword(token);

  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)"
  )
    .bind(userId, email, passwordHash)
    .run();

  await env.DB.prepare(
    "INSERT INTO tokens (id, user_id, name, token_hash) VALUES (?, ?, ?, ?)"
  )
    .bind(tokenId, userId, "test-session", tokenHash)
    .run();

  return { token, userId };
}

function createSocketQueue(ws: WebSocket) {
  const queued: SyncMessage[] = [];
  const waiters: Array<{
    predicate: (message: SyncMessage) => boolean;
    resolve: (message: SyncMessage) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = [];

  ws.addEventListener("message", (event) => {
    const raw = typeof event.data === "string"
      ? event.data
      : new TextDecoder().decode(event.data as ArrayBuffer);
    const message = JSON.parse(raw) as SyncMessage;

    const waiterIndex = waiters.findIndex(({ predicate }) => predicate(message));
    if (waiterIndex !== -1) {
      const waiter = waiters.splice(waiterIndex, 1)[0];
      clearTimeout(waiter.timeout);
      waiter.resolve(message);
      return;
    }

    queued.push(message);
  });

  return {
    async next(
      predicate: (message: SyncMessage) => boolean = () => true,
      timeoutMs = 2000
    ): Promise<SyncMessage> {
      const queuedIndex = queued.findIndex(predicate);
      if (queuedIndex !== -1) {
        return queued.splice(queuedIndex, 1)[0];
      }

      return new Promise<SyncMessage>((resolve, reject) => {
        const timeout = setTimeout(() => {
          const waiterIndex = waiters.findIndex((waiter) => waiter.resolve === resolve);
          if (waiterIndex !== -1) {
            waiters.splice(waiterIndex, 1);
          }
          reject(new Error("timed out waiting for websocket message"));
        }, timeoutMs);

        waiters.push({ predicate, resolve, reject, timeout });
      });
    },
  };
}

async function connectSync(
  projectId: string,
  token: string,
  type: "local" | "cloud"
): Promise<{ socket: WebSocket; queue: ReturnType<typeof createSocketQueue> }> {
  const response = await SELF.fetch(
    `https://example.com/api/projects/${encodeURIComponent(projectId)}/sync?token=${encodeURIComponent(token)}&type=${type}`,
    {
      headers: { Upgrade: "websocket" },
    }
  );

  expect(response.status).toBe(101);
  expect(response.webSocket).toBeDefined();

  const socket = response.webSocket!;
  const queue = createSocketQueue(socket);
  socket.accept();

  return {
    socket,
    queue,
  };
}

async function closeSocket(socket: WebSocket): Promise<void> {
  if (socket.readyState >= WebSocket.CLOSING) {
    return;
  }

  socket.close();
  // Let async close handlers flush unregister work before the test exits.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("ProjectRoom sync behavior", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("requests a fresh snapshot before serving an empty state to cloud viewers", async () => {
    const { token } = await createUserToken();
    const projectId = `sync/test-project-${crypto.randomUUID().slice(0, 8)}`;

    const local = await connectSync(projectId, token, "local");
    await local.queue.next((message) => message.type === "state_full");

    const cloud = await connectSync(projectId, token, "cloud");

    const localStatus = await cloud.queue.next((message) => message.type === "local_status");
    expect(localStatus.connected).toBe(true);

    const requestSync = await local.queue.next((message) => message.type === "request_sync");
    expect(requestSync.reason).toBe("cloud-viewer-connected");

    local.socket.send(JSON.stringify({
      type: "sync_full",
      ticks: {
        abc: makeTick("abc", "Alpha"),
      },
    }));

    const cloudState = await cloud.queue.next((message) => message.type === "state_full");
    expect(cloudState.ticks).toEqual({
      abc: makeTick("abc", "Alpha"),
    });

    await closeSocket(cloud.socket);
    await closeSocket(local.socket);
  });

  it("treats sync_full as authoritative and removes remote-only ticks", async () => {
    const { token } = await createUserToken();
    const projectId = `sync/test-project-${crypto.randomUUID().slice(0, 8)}`;

    const local = await connectSync(projectId, token, "local");
    await local.queue.next((message) => message.type === "state_full");

    local.socket.send(JSON.stringify({
      type: "sync_full",
      ticks: {
        abc: makeTick("abc", "Alpha"),
        def: makeTick("def", "Delta"),
      },
    }));
    await local.queue.next((message) =>
      message.type === "state_full" &&
      Object.keys((message.ticks as Record<string, unknown>) || {}).length === 2
    );

    const cloud = await connectSync(projectId, token, "cloud");
    const initialStatus = await cloud.queue.next((message) => message.type === "local_status");
    expect(initialStatus.connected).toBe(true);
    const initialState = await cloud.queue.next((message) => message.type === "state_full");
    expect(Object.keys(initialState.ticks as Record<string, unknown>)).toEqual(["abc", "def"]);

    local.socket.send(JSON.stringify({
      type: "sync_full",
      ticks: {
        abc: makeTick("abc", "Alpha"),
      },
    }));

    await local.queue.next((message) =>
      message.type === "state_full" &&
      Object.keys((message.ticks as Record<string, unknown>) || {}).length === 1
    );
    const refreshedState = await cloud.queue.next((message) =>
      message.type === "state_full" &&
      Object.keys((message.ticks as Record<string, unknown>) || {}).length === 1
    );

    expect(refreshedState.ticks).toEqual({
      abc: makeTick("abc", "Alpha"),
    });

    await closeSocket(cloud.socket);
    await closeSocket(local.socket);
  });
});

describe("tick_operation actor propagation", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("forwards session identity as actor in tick_operation sent to local client", async () => {
    const { token, userId } = await createUserToken();
    const projectId = `sync/test-project-${crypto.randomUUID().slice(0, 8)}`;

    // Connect local client — this auto-registers the board so the HTTP approve endpoint
    // can verify project ownership.
    const local = await connectSync(projectId, token, "local");
    await local.queue.next((m) => m.type === "state_full");

    // Seed the local state with a tick that is awaiting approval.
    const awaiting_tick = {
      ...makeTick("tick1"),
      status: "open",
      awaiting: "approval",
    };
    local.socket.send(JSON.stringify({
      type: "sync_full",
      ticks: { tick1: awaiting_tick },
    }));
    await local.queue.next((m) => m.type === "state_full");

    // Call the cloud HTTP approve endpoint, authenticated as the same user.
    // Because this is async (the local client has to respond), we fire the
    // HTTP request and simultaneously wait for the tick_operation on the local
    // WebSocket so we can verify the actor field before responding.
    const approvePromise = SELF.fetch(
      `https://example.com/api/projects/${encodeURIComponent(projectId)}/ticks/tick1/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      }
    );

    // Local client should receive tick_operation with actor=userId.
    const opMsg = await local.queue.next(
      (m) => m.type === "tick_operation" && (m as SyncMessage & { tickId?: string }).tickId === "tick1",
      4000
    );
    expect(opMsg.type).toBe("tick_operation");
    expect((opMsg as SyncMessage & { actor?: string }).actor).toBe(userId);

    // Let the local client respond so the approve HTTP call resolves (avoids timeout).
    local.socket.send(JSON.stringify({
      type: "tick_operation_response",
      requestId: (opMsg as SyncMessage & { requestId?: string }).requestId,
      success: true,
      tick: { ...awaiting_tick, status: "closed" },
    }));

    await approvePromise;

    await closeSocket(local.socket);
  });
});
