import { env, SELF } from "cloudflare:test";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { deriveTokenHash, mintFactoryToken } from "../src/auth";
import { getEnrolledProject } from "../src/db";
import { TELEGRAM_WEBHOOK_PATH } from "../src/telegram";

/**
 * The operator surface of a factory whose ONE chat serves MANY projects.
 *
 * Two things are proven here that no unit test can prove on its own: that a
 * project's forum topic is set where the project is ENROLLED rather than on a
 * configuration surface of its own, and that a gate delivered for one project
 * is legible next to the same gate delivered for another.
 */

const BASE = "https://factory.example.com";

let token: string;
const originalHash = env.FACTORY_TOKEN_HASH;
const previousTelegram = {
  token: env.TELEGRAM_BOT_TOKEN,
  user: env.TELEGRAM_USER_ID,
  chat: env.TELEGRAM_CHAT_ID,
  api: env.TELEGRAM_API_BASE_URL,
  secret: env.TELEGRAM_WEBHOOK_SECRET,
  base: env.FACTORY_BASE_URL,
};

const OPERATOR = "424242";
const CHAT = "-1001919191";

beforeAll(async () => {
  token = mintFactoryToken();
  env.FACTORY_TOKEN_HASH = await deriveTokenHash(token);
});

afterAll(() => {
  if (originalHash === undefined) delete env.FACTORY_TOKEN_HASH;
  else env.FACTORY_TOKEN_HASH = originalHash;
  restore("TELEGRAM_BOT_TOKEN", previousTelegram.token);
  restore("TELEGRAM_USER_ID", previousTelegram.user);
  restore("TELEGRAM_CHAT_ID", previousTelegram.chat);
  restore("TELEGRAM_API_BASE_URL", previousTelegram.api);
  restore("TELEGRAM_WEBHOOK_SECRET", previousTelegram.secret);
  restore("FACTORY_BASE_URL", previousTelegram.base);
});

function restore(key: keyof typeof env, value: string | undefined): void {
  const bag = env as unknown as Record<string, unknown>;
  if (value === undefined) delete bag[key];
  else bag[key] = value;
}

beforeEach(() => {
  env.TELEGRAM_BOT_TOKEN = "test-bot-token";
  env.TELEGRAM_USER_ID = OPERATOR;
  env.TELEGRAM_CHAT_ID = CHAT;
  env.TELEGRAM_API_BASE_URL = "https://telegram.test";
  env.FACTORY_BASE_URL = BASE;
});

/** A fake Bot API on the global fetch, capturing every call. */
type BotCall = { method: string; body: Record<string, unknown> };
let bot: { calls: BotCall[]; restore: () => void } | null = null;

function fakeBotAPI(
  respond: (method: string, body: Record<string, unknown>) => unknown = () => ({ message_id: 4242 })
) {
  const calls: BotCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://telegram.test/")) return original(input as RequestInfo, init);
    const method = url.slice(url.lastIndexOf("/") + 1);
    const body = init?.body === undefined ? {} : (JSON.parse(String(init.body)) as Record<string, unknown>);
    calls.push({ method, body });
    return Response.json({ ok: true, result: respond(method, body) });
  }) as typeof fetch;
  bot = { calls, restore: () => void (globalThis.fetch = original) };
  return bot;
}

afterEach(() => {
  bot?.restore();
  bot = null;
});

const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });

function post(path: string, body?: unknown, headers: Record<string, string> = auth()) {
  return SELF.fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function get(path: string, headers: Record<string, string> = auth()) {
  return SELF.fetch(`${BASE}${path}`, { headers });
}

let projectCounter = 0;
async function enrol(name: string, extra: Record<string, unknown> = {}): Promise<string> {
  const project = `ticks-topic/${name}-${projectCounter++}`;
  const res = await post("/api/projects", {
    project,
    requested_by: "operator@example.com",
    ...extra,
  });
  expect(res.status).toBe(201);
  return project;
}

const gate = {
  kind: "gate",
  question: {
    header: "Merge",
    text: "Ship it?",
    options: [
      { id: "approve", label: "Approve" },
      { id: "reject", label: "Reject" },
    ],
  },
};

describe("the per-project topic map lives in the enrolment record", () => {
  it("accepts a topic id when the project is enrolled and reports it back", async () => {
    const project = await enrol("with-topic", { telegram_topic_id: 17 });
    const record = await getEnrolledProject(env.DB, project);
    expect(record?.telegram_topic_id).toBe("17");

    const listed = (await (await get("/api/projects")).json()) as {
      projects: { project: string; telegram_topic_id?: string }[];
    };
    expect(listed.projects.find((row) => row.project === project)?.telegram_topic_id).toBe("17");
  });

  it("leaves an assigned topic alone when a re-enrolment does not mention it", async () => {
    const project = await enrol("sticky", { telegram_topic_id: "17" });
    const again = await post("/api/projects", { project, requested_by: "someone@example.com" });
    expect(again.status).toBe(201);
    expect((await getEnrolledProject(env.DB, project))?.telegram_topic_id).toBe("17");
  });

  it("clears the topic when enrolment explicitly says null", async () => {
    const project = await enrol("cleared", { telegram_topic_id: "17" });
    const again = await post("/api/projects", { project, telegram_topic_id: null });
    expect(again.status).toBe(201);
    expect((await getEnrolledProject(env.DB, project))?.telegram_topic_id).toBeUndefined();
  });

  it("refuses a topic id that is not a positive integer", async () => {
    const res = await post("/api/projects", {
      project: "ticks-topic/bad-topic",
      telegram_topic_id: "General",
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { detail: string }).detail).toContain("telegram_topic_id");
  });

  it("forgets the topic when the project is withdrawn", async () => {
    const project = await enrol("withdrawn", { telegram_topic_id: "17" });
    const removed = await SELF.fetch(`${BASE}/api/projects/${project}`, {
      method: "DELETE",
      headers: auth(),
    });
    expect(removed.status).toBe(200);
    await post("/api/projects", { project, requested_by: "operator@example.com" });
    expect((await getEnrolledProject(env.DB, project))?.telegram_topic_id).toBeUndefined();
  });
});

describe("a gate from two projects in one chat", () => {
  it("names each project, epic and tick, and posts into each project's topic", async () => {
    const api = fakeBotAPI();
    const web = await enrol("web", { telegram_topic_id: "17" });
    const apiProject = await enrol("api", { telegram_topic_id: "23" });

    for (const [project, id, epic] of [
      [web, "q-web", "4f2"],
      [apiProject, "q-api", "9kk"],
    ] as const) {
      const res = await post(`/api/projects/${project}/pending`, {
        id,
        tick_id: "8sm",
        epic,
        notify: "telegram",
        ...gate,
      });
      expect(res.status).toBe(201);
    }

    const sends = api.calls.filter((call) => call.method === "sendMessage");
    expect(sends).toHaveLength(2);

    expect(String(sends[0]!.body.text)).toContain(web);
    expect(String(sends[0]!.body.text)).toContain("epic 4f2");
    expect(String(sends[0]!.body.text)).toContain("tick 8sm");
    expect(sends[0]!.body.message_thread_id).toBe(17);

    expect(String(sends[1]!.body.text)).toContain(apiProject);
    expect(String(sends[1]!.body.text)).toContain("epic 9kk");
    expect(sends[1]!.body.message_thread_id).toBe(23);

    // The acceptance clause, stated as the assertion it is.
    expect(sends[0]!.body.text).not.toBe(sends[1]!.body.text);
    expect(String(sends[0]!.body.text)).not.toContain(apiProject);
    expect(String(sends[1]!.body.text)).not.toContain(web);
  });

  it("keeps the project on the message when a phone press settles it", async () => {
    const api = fakeBotAPI((method) => (method === "sendMessage" ? { message_id: 4242 } : true));
    const project = await enrol("settled", { telegram_topic_id: "17" });
    await post(`/api/projects/${project}/pending`, {
      id: "q-settled",
      tick_id: "8sm",
      epic: "4f2",
      notify: "telegram",
      ...gate,
    });

    const webhook = await SELF.fetch(`${BASE}${TELEGRAM_WEBHOOK_PATH}`, {
      method: "POST",
      body: JSON.stringify({
        callback_query: {
          id: "cb-1",
          from: { id: Number(OPERATOR) },
          data: "q:q-settled:0",
          message: { message_id: 4242, chat: { id: Number(CHAT) } },
        },
      }),
    });
    expect(webhook.status).toBe(200);
    expect((await webhook.json()) as Record<string, unknown>).toMatchObject({ answered: true });

    const edit = api.calls.find((call) => call.method === "editMessageText");
    expect(edit).toBeDefined();
    expect(String(edit!.body.text)).toContain(project);
    expect(String(edit!.body.text)).toContain("tick 8sm");
    expect(String(edit!.body.text)).toContain("Answered");
    // An edit names a message, topic and all; pairing it with a thread id is a
    // 400 from the Bot API.
    expect(edit!.body).not.toHaveProperty("message_thread_id");
  });

  it("names the project on a completion report and posts it into the topic", async () => {
    const api = fakeBotAPI();
    const project = await enrol("report", { telegram_topic_id: "17" });
    const res = await post(`/api/projects/${project}/reports`, {
      text: "Run complete: 3 ticks closed.",
      epic: "4f2",
    });
    expect(res.status).toBe(200);

    const send = api.calls.find((call) => call.method === "sendMessage");
    expect(String(send!.body.text)).toContain(project);
    expect(String(send!.body.text)).toContain("epic 4f2");
    expect(String(send!.body.text)).toContain("Run complete: 3 ticks closed.");
    expect(send!.body.message_thread_id).toBe(17);
  });
});

describe("webhook registration", () => {
  const REGISTRATION = "/api/channels/telegram/webhook/registration";

  it("needs the operator's token — the update path is exempt, administering it is not", async () => {
    const res = await SELF.fetch(`${BASE}${REGISTRATION}`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("points Telegram at this deployment's own webhook path", async () => {
    const api = fakeBotAPI((method) =>
      method === "getMe"
        ? { id: 1, username: "ticks_bot", can_read_all_group_messages: false }
        : true
    );
    env.TELEGRAM_WEBHOOK_SECRET = "shh";
    try {
      const res = await post(REGISTRATION);
      expect(res.status).toBe(200);
      expect((await res.json()) as Record<string, unknown>).toMatchObject({
        url: `${BASE}${TELEGRAM_WEBHOOK_PATH}`,
        privacy_mode: true,
        secret: true,
      });
    } finally {
      delete env.TELEGRAM_WEBHOOK_SECRET;
    }
    const call = api.calls.find((entry) => entry.method === "setWebhook");
    expect(call!.body.url).toBe(`${BASE}${TELEGRAM_WEBHOOK_PATH}`);
    expect(call!.body.secret_token).toBe("shh");
  });

  it("refuses while the bot's group privacy mode is off", async () => {
    const api = fakeBotAPI((method) =>
      method === "getMe" ? { id: 1, can_read_all_group_messages: true } : true
    );
    const res = await post(REGISTRATION);
    expect(res.status).toBe(409);
    expect(((await res.json()) as { detail: string }).detail).toMatch(/privacy mode/i);
    expect(api.calls.some((entry) => entry.method === "setWebhook")).toBe(false);
  });

  it("reports and withdraws the registration", async () => {
    const api = fakeBotAPI((method) =>
      method === "getWebhookInfo"
        ? { url: `${BASE}${TELEGRAM_WEBHOOK_PATH}`, pending_update_count: 0 }
        : true
    );
    const info = await get(REGISTRATION);
    expect(info.status).toBe(200);
    expect((await info.json()) as Record<string, unknown>).toMatchObject({
      url: `${BASE}${TELEGRAM_WEBHOOK_PATH}`,
    });

    const removed = await SELF.fetch(`${BASE}${REGISTRATION}`, {
      method: "DELETE",
      headers: auth(),
    });
    expect(removed.status).toBe(200);
    expect(api.calls.map((entry) => entry.method)).toContain("deleteWebhook");
  });

  it("says so when the deployment has no Telegram configured", async () => {
    delete env.TELEGRAM_BOT_TOKEN;
    const res = await post(REGISTRATION);
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("telegram_not_configured");
  });
});
