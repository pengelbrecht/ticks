import { env, SELF } from "cloudflare:test";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { deriveTokenHash, mintFactoryToken } from "../src/auth";
import { listEnrolledProjects } from "../src/db";
import { TELEGRAM_WEBHOOK_PATH } from "../src/telegram";

/**
 * Free text arriving at the webhook, end to end.
 *
 * The unit tests next door pin the decision; this file pins that the ROUTE
 * makes it against every enrolled project at once. That is the part no unit
 * test can prove: "exactly one open question" is a total over all the projects
 * this deployment serves, so one open question in each of two projects is two
 * and must refuse.
 */

const BASE = "https://factory.example.com";
const OPERATOR = "424242";
const CHAT = "-1001919191";

let token: string;
const originalHash = env.FACTORY_TOKEN_HASH;
const previous = {
  token: env.TELEGRAM_BOT_TOKEN,
  user: env.TELEGRAM_USER_ID,
  chat: env.TELEGRAM_CHAT_ID,
  api: env.TELEGRAM_API_BASE_URL,
  base: env.FACTORY_BASE_URL,
};

beforeAll(async () => {
  token = mintFactoryToken();
  env.FACTORY_TOKEN_HASH = await deriveTokenHash(token);
});

afterAll(() => {
  if (originalHash === undefined) delete env.FACTORY_TOKEN_HASH;
  else env.FACTORY_TOKEN_HASH = originalHash;
  restore("TELEGRAM_BOT_TOKEN", previous.token);
  restore("TELEGRAM_USER_ID", previous.user);
  restore("TELEGRAM_CHAT_ID", previous.chat);
  restore("TELEGRAM_API_BASE_URL", previous.api);
  restore("FACTORY_BASE_URL", previous.base);
});

function restore(key: keyof typeof env, value: string | undefined): void {
  const bag = env as unknown as Record<string, unknown>;
  if (value === undefined) delete bag[key];
  else bag[key] = value;
}

beforeEach(async () => {
  env.TELEGRAM_BOT_TOKEN = "test-bot-token";
  env.TELEGRAM_USER_ID = OPERATOR;
  env.TELEGRAM_CHAT_ID = CHAT;
  env.TELEGRAM_API_BASE_URL = "https://telegram.test";
  env.FACTORY_BASE_URL = BASE;
  // The candidate set is a total over enrolled projects, so every test starts
  // from an empty roll rather than from whatever ran before it.
  for (const project of await listEnrolledProjects(env.DB)) {
    const res = await SELF.fetch(`${BASE}/api/projects/${project.project}`, {
      method: "DELETE",
      headers: auth(),
    });
    expect(res.status).toBe(200);
  }
});

type BotCall = { method: string; body: Record<string, unknown> };
let bot: { calls: BotCall[]; restore: () => void } | null = null;

/** A fake Bot API on the global fetch, handing back a fresh message id per send. */
function fakeBotAPI() {
  const calls: BotCall[] = [];
  const original = globalThis.fetch;
  let nextMessageID = 4242;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://telegram.test/")) return original(input as RequestInfo, init);
    const method = url.slice(url.lastIndexOf("/") + 1);
    const body = init?.body === undefined ? {} : (JSON.parse(String(init.body)) as Record<string, unknown>);
    calls.push({ method, body });
    return Response.json({
      ok: true,
      result: method === "sendMessage" ? { message_id: nextMessageID++ } : true,
    });
  }) as typeof fetch;
  bot = { calls, restore: () => void (globalThis.fetch = original) };
  return bot;
}

afterEach(() => {
  bot?.restore();
  bot = null;
});

const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });

function post(path: string, body?: unknown) {
  return SELF.fetch(`${BASE}${path}`, {
    method: "POST",
    headers: auth(),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

let counter = 0;
async function enrol(name: string): Promise<string> {
  const project = `ticks-freetext/${name}-${counter++}`;
  expect((await post("/api/projects", { project, requested_by: "operator@example.com" })).status).toBe(201);
  return project;
}

const GATE = {
  kind: "gate",
  notify: "telegram",
  question: {
    header: "Merge",
    text: "Ship it?",
    options: [
      { id: "approve", label: "Approve" },
      { id: "reject", label: "Reject" },
    ],
  },
};

const ASK = { kind: "ask", notify: "telegram", question: { text: "Which base branch?" } };

async function ask(project: string, id: string, epic: string, tick: string, body: unknown) {
  const res = await post(`/api/projects/${project}/pending`, {
    id,
    epic,
    tick_id: tick,
    ...(body as Record<string, unknown>),
  });
  expect(res.status).toBe(201);
  return (await res.json()) as { entry: { ref?: { message_id?: string } } };
}

function bareText(text: string, messageID = 900) {
  return SELF.fetch(`${BASE}${TELEGRAM_WEBHOOK_PATH}`, {
    method: "POST",
    body: JSON.stringify({
      message: {
        message_id: messageID,
        chat: { id: Number(CHAT) },
        from: { id: Number(OPERATOR) },
        text,
      },
    }),
  });
}

function replyText(text: string, replyTo: number, messageID = 901) {
  return SELF.fetch(`${BASE}${TELEGRAM_WEBHOOK_PATH}`, {
    method: "POST",
    body: JSON.stringify({
      message: {
        message_id: messageID,
        chat: { id: Number(CHAT) },
        from: { id: Number(OPERATOR) },
        reply_to_message: { message_id: replyTo },
        text,
      },
    }),
  });
}

async function resolutionOf(project: string, id: string) {
  const res = await SELF.fetch(
    `${BASE}/api/projects/${project}/pending?include_resolved=true`,
    { headers: auth() }
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    pending: { id: string; resolution?: { outcome: { text?: string }; answered_by: string } }[];
  };
  return body.pending.find((entry) => entry.id === id)?.resolution;
}

describe("bare text with exactly one open question", () => {
  it("resolves it, because there is nothing to confuse it with", async () => {
    const api = fakeBotAPI();
    const project = await enrol("only");
    await ask(project, "q-only", "4f2", "8sm", ASK);

    const res = await bareText("main");
    expect(res.status).toBe(200);
    expect((await res.json()) as Record<string, unknown>).toMatchObject({
      answered: true,
      project,
      question_id: "q-only",
    });

    const resolution = await resolutionOf(project, "q-only");
    expect(resolution?.outcome.text).toBe("main");
    expect(resolution?.answered_by).toBe("telegram");
    // Settled on the message it was asked on, not announced separately.
    expect(api.calls.some((call) => call.method === "editMessageText")).toBe(true);
  });
});

describe("bare text with two or more open questions", () => {
  it("refuses across projects and lists both candidates with project, epic and tick", async () => {
    const api = fakeBotAPI();
    const web = await enrol("web");
    const other = await enrol("api");
    await ask(web, "q-web", "4f2", "8sm", GATE);
    await ask(other, "q-api", "9kk", "3ab", ASK);

    const res = await bareText("approve");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ answered: false, refused: true, reason: "ambiguous" });

    // Neither question moved. This is the whole point: a guess would have
    // attributed the operator's approval to the wrong project's gate.
    expect(await resolutionOf(web, "q-web")).toBeUndefined();
    expect(await resolutionOf(other, "q-api")).toBeUndefined();

    const sent = api.calls.filter((call) => call.method === "sendMessage");
    const refusal = String(sent[sent.length - 1]!.body.text);
    expect(refusal).toContain(`${web} · epic 4f2 · tick 8sm`);
    expect(refusal).toContain(`${other} · epic 9kk · tick 3ab`);
    expect(refusal).toContain("Ship it?");
    expect(refusal).toContain("Which base branch?");
    expect(refusal).toMatch(/reply/i);
    // The refusal answers the operator's own message rather than shouting into
    // the chat, so it lands in the topic they typed in.
    expect(sent[sent.length - 1]!.body.reply_to_message_id).toBe(900);
  });

  it("refuses for two open questions in the SAME project too", async () => {
    fakeBotAPI();
    const project = await enrol("same");
    await ask(project, "q-one", "4f2", "8sm", ASK);
    await ask(project, "q-two", "4f2", "9dd", ASK);

    const res = await bareText("main");
    expect((await res.json()) as Record<string, unknown>).toMatchObject({ refused: true });
    expect(await resolutionOf(project, "q-one")).toBeUndefined();
    expect(await resolutionOf(project, "q-two")).toBeUndefined();
  });

  it("stops refusing once all but one are answered", async () => {
    fakeBotAPI();
    const web = await enrol("drain-web");
    const other = await enrol("drain-api");
    await ask(web, "q-drain-web", "4f2", "8sm", ASK);
    await ask(other, "q-drain-api", "9kk", "3ab", ASK);

    expect((await (await bareText("main")).json()) as Record<string, unknown>).toMatchObject({
      refused: true,
    });

    const settled = await post(`/api/projects/${web}/pending/q-drain-web/answer`, {
      outcome: { status: "answered", text: "main" },
      answered_by: "terminal",
    });
    expect(settled.status).toBe(200);

    const res = await bareText("develop", 902);
    expect((await res.json()) as Record<string, unknown>).toMatchObject({
      answered: true,
      question_id: "q-drain-api",
    });
  });
});

describe("reply-to still wins", () => {
  it("resolves its own question even while other questions are open", async () => {
    const api = fakeBotAPI();
    const web = await enrol("reply-web");
    const other = await enrol("reply-api");
    await ask(web, "q-reply-web", "4f2", "8sm", ASK);
    await ask(other, "q-reply-api", "9kk", "3ab", ASK);

    // The message id the second question was delivered on: the fake Bot API
    // hands out 4242 then 4243.
    const delivered = api.calls.filter((call) => call.method === "sendMessage");
    expect(delivered).toHaveLength(2);
    const target = 4243;

    const res = await replyText("develop", target);
    expect((await res.json()) as Record<string, unknown>).toMatchObject({
      answered: true,
      project: other,
      question_id: "q-reply-api",
    });
    expect((await resolutionOf(other, "q-reply-api"))?.outcome.text).toBe("develop");
    expect(await resolutionOf(web, "q-reply-web")).toBeUndefined();
  });

  it("drops a reply that correlates with nothing rather than falling back to a guess", async () => {
    fakeBotAPI();
    const project = await enrol("stale-reply");
    await ask(project, "q-stale", "4f2", "8sm", ASK);

    const res = await replyText("main", 999_999);
    expect((await res.json()) as Record<string, unknown>).toMatchObject({ matched: false });
    expect(await resolutionOf(project, "q-stale")).toBeUndefined();
  });
});

describe("bare text with nothing open", () => {
  it("matches nothing and says so", async () => {
    fakeBotAPI();
    await enrol("empty");
    const res = await bareText("main");
    expect((await res.json()) as Record<string, unknown>).toMatchObject({ matched: false });
  });
});
