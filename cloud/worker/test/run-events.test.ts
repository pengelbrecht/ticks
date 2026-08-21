import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * The board's `run_event` ingest door (tick bne).
 *
 * The protocol has carried run events over the local agent's WebSocket since
 * it was written and nothing ever produced one. Phase 2's cloud factory has no
 * laptop in it, so its RunRoom forwards over HTTP instead — this route — and
 * the room fans the message out to the browsers watching the project.
 *
 * What these pin down is that the door is OBSERVABILITY: it reaches only cloud
 * viewers, it stores nothing, and nothing arriving on it can move tracker
 * state.
 */

const DB_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
  `CREATE TABLE IF NOT EXISTS tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, token_hash TEXT NOT NULL, last_used_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()), revoked_at INTEGER, UNIQUE(user_id, name))`,
  `CREATE TABLE IF NOT EXISTS boards (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, machine_id TEXT, last_seen_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(user_id, name))`,
];

interface SyncMessage {
  type: string;
  [key: string]: unknown;
}

function randomId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  const email = `${userId}@example.com`;
  const token = randomId("session-token");

  await env.DB.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)")
    .bind(userId, email, await hashPassword("password123"))
    .run();
  await env.DB.prepare("INSERT INTO tokens (id, user_id, name, token_hash) VALUES (?, ?, ?, ?)")
    .bind(randomId("token"), userId, "test-session", await hashPassword(token))
    .run();

  return { token, userId };
}

function createSocketQueue(ws: WebSocket) {
  const queued: SyncMessage[] = [];
  const waiters: {
    predicate: (message: SyncMessage) => boolean;
    resolve: (message: SyncMessage) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }[] = [];

  ws.addEventListener("message", (event) => {
    const raw =
      typeof event.data === "string"
        ? event.data
        : new TextDecoder().decode(event.data as ArrayBuffer);
    const message = JSON.parse(raw) as SyncMessage;

    const index = waiters.findIndex(({ predicate }) => predicate(message));
    if (index !== -1) {
      const waiter = waiters.splice(index, 1)[0];
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
      const index = queued.findIndex(predicate);
      if (index !== -1) return queued.splice(index, 1)[0];

      return new Promise<SyncMessage>((resolve, reject) => {
        const timeout = setTimeout(() => {
          const at = waiters.findIndex((waiter) => waiter.resolve === resolve);
          if (at !== -1) waiters.splice(at, 1);
          reject(new Error("timed out waiting for websocket message"));
        }, timeoutMs);
        waiters.push({ predicate, resolve, reject, timeout });
      });
    },
    /** Everything received so far, without waiting. */
    seen(): SyncMessage[] {
      return [...queued];
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
    { headers: { Upgrade: "websocket" } }
  );

  expect(response.status).toBe(101);
  const socket = response.webSocket!;
  const queue = createSocketQueue(socket);
  socket.accept();
  return { socket, queue };
}

async function closeSocket(socket: WebSocket): Promise<void> {
  if (socket.readyState >= WebSocket.CLOSING) return;
  socket.close();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** What a cloud factory's RunRoom forwards for one per-tick worker. */
function runEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "run_event",
    epicId: "ko8",
    taskId: "aaa",
    source: "cloud:worker",
    event: {
      type: "task-completed",
      timestamp: "2026-08-21T10:00:00.000Z",
      status: "ready-to-merge",
      success: true,
      message: "DONE — ready to merge",
    },
    ...overrides,
  };
}

async function post(
  projectId: string,
  token: string | null,
  body: unknown
): Promise<Response> {
  return SELF.fetch(
    `https://example.com/api/projects/${encodeURIComponent(projectId)}/run-events`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token === null ? {} : { authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    }
  );
}

describe("the board's run_event ingest door", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("fans a forwarded run event out to the browsers watching the project", async () => {
    const { token } = await createUserToken();
    const projectId = `run-events/live-${crypto.randomUUID().slice(0, 8)}`;

    // A local agent registers the board, then a browser watches it.
    const local = await connectSync(projectId, token, "local");
    await local.queue.next((m) => m.type === "state_full");
    // The viewer's own `state_full` waits on the local agent answering a
    // sync request, which this fake local never does — irrelevant here: what
    // matters is that a run event reaches it either way.
    const viewer = await connectSync(projectId, token, "cloud");

    const response = await post(projectId, token, runEvent());
    expect(response.status).toBe(200);

    const seen = await viewer.queue.next((m) => m.type === "run_event");
    expect(seen).toMatchObject({
      type: "run_event",
      epicId: "ko8",
      taskId: "aaa",
      source: "cloud:worker",
    });
    expect((seen.event as Record<string, unknown>).status).toBe("ready-to-merge");

    await closeSocket(viewer.socket);
    await closeSocket(local.socket);
  });

  it("reaches a browser with no local agent connected at all", async () => {
    // The whole point of the HTTP door: a cloud run has no laptop in it, and
    // the board must still show it live, from anywhere.
    const { token, userId } = await createUserToken();
    const projectId = `run-events/headless-${crypto.randomUUID().slice(0, 8)}`;
    await env.DB.prepare("INSERT INTO boards (id, user_id, name) VALUES (?, ?, ?)")
      .bind(randomId("board"), userId, projectId)
      .run();

    const viewer = await connectSync(projectId, token, "cloud");
    await viewer.queue.next((m) => m.type === "state_full");

    expect((await post(projectId, token, runEvent({ taskId: "bbb" }))).status).toBe(200);

    const seen = await viewer.queue.next((m) => m.type === "run_event");
    expect(seen.taskId).toBe("bbb");

    await closeSocket(viewer.socket);
  });

  it("stores nothing and moves no tick: the board is observability", async () => {
    const { token, userId } = await createUserToken();
    const projectId = `run-events/transient-${crypto.randomUUID().slice(0, 8)}`;
    await env.DB.prepare("INSERT INTO boards (id, user_id, name) VALUES (?, ?, ?)")
      .bind(randomId("board"), userId, projectId)
      .run();

    // A run's whole stream arrives while nobody is watching.
    for (const type of ["epic-started", "task-started", "task-completed", "epic-completed"]) {
      const response = await post(
        projectId,
        token,
        runEvent({ event: { type, timestamp: "2026-08-21T10:00:00.000Z" } })
      );
      expect(response.status).toBe(200);
    }

    // A viewer arriving afterwards is handed tick state and no run history:
    // run events are transient, and none of them created a tick.
    const viewer = await connectSync(projectId, token, "cloud");
    const state = await viewer.queue.next((m) => m.type === "state_full");
    expect(Object.keys(state.ticks as Record<string, unknown>)).toHaveLength(0);
    expect(viewer.queue.seen().some((m) => m.type === "run_event")).toBe(false);

    await closeSocket(viewer.socket);
  });

  it("refuses a source the schema does not describe", async () => {
    const { token, userId } = await createUserToken();
    const projectId = `run-events/bad-source-${crypto.randomUUID().slice(0, 8)}`;
    await env.DB.prepare("INSERT INTO boards (id, user_id, name) VALUES (?, ?, ?)")
      .bind(randomId("board"), userId, projectId)
      .run();

    // Tick zjp retired `ralph`; a producer that still emitted it is a bug the
    // board names rather than relays.
    const response = await post(projectId, token, runEvent({ source: "ralph" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("ralph") });
  });

  it("refuses a payload with no type or timestamp", async () => {
    const { token, userId } = await createUserToken();
    const projectId = `run-events/bad-payload-${crypto.randomUUID().slice(0, 8)}`;
    await env.DB.prepare("INSERT INTO boards (id, user_id, name) VALUES (?, ?, ?)")
      .bind(randomId("board"), userId, projectId)
      .run();

    expect((await post(projectId, token, runEvent({ event: {} }))).status).toBe(400);
    expect((await post(projectId, token, { type: "tick_update" })).status).toBe(400);
  });

  it("requires a token, and one that owns the project", async () => {
    const { token } = await createUserToken();
    const owner = await createUserToken();
    const projectId = `run-events/auth-${crypto.randomUUID().slice(0, 8)}`;
    await env.DB.prepare("INSERT INTO boards (id, user_id, name) VALUES (?, ?, ?)")
      .bind(randomId("board"), owner.userId, projectId)
      .run();

    expect((await post(projectId, null, runEvent())).status).toBe(401);
    // A valid token for someone else's project is not enough.
    expect((await post(projectId, token, runEvent())).status).toBe(403);
    expect((await post(projectId, owner.token, runEvent())).status).toBe(200);
  });
});
