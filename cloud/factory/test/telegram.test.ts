import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import {
  TELEGRAM_ALLOWED_UPDATES,
  TELEGRAM_WEBHOOK_PATH,
  deliverTelegramQuestion,
  isPairedTelegramUpdate,
  parseTelegramAnswer,
  parseTopicID,
  registerTelegramWebhook,
  renderOutcome,
  renderQuestion,
  sendTelegramReport,
  telegramWebhookInfo,
  unregisterTelegramWebhook,
  type TelegramRuntimeEnv,
  type TelegramWebhookUpdate,
} from "../src/telegram";
import type { Question } from "../src/run-room";

describe("Telegram webhook transport", () => {
  const paired: TelegramWebhookUpdate = {
    update_id: 7,
    callback_query: {
      id: "callback-1",
      from: { id: 424242 },
      data: "q:q123:0",
      message: { message_id: 91, chat: { id: 919191 } },
    },
  };

  it("drops a callback from an unpaired sender before resolving a room entry", () => {
    expect(
      isPairedTelegramUpdate(paired, { user_id: "777", chat_id: "919191" })
    ).toBe(false);
    expect(
      isPairedTelegramUpdate(paired, { user_id: "424242", chat_id: "123" })
    ).toBe(false);
  });

  it("accepts only the paired user in the paired chat", () => {
    expect(
      isPairedTelegramUpdate(paired, { user_id: "424242", chat_id: "919191" })
    ).toBe(true);
  });

  it("turns an inline option press into the RunRoom outcome", () => {
    const parsed = parseTelegramAnswer(paired, {
      id: "q123",
      kind: "gate",
      question: {
        text: "Ship it?",
        options: [
          { id: "approve", label: "Approve" },
          { id: "reject", label: "Reject" },
        ],
      },
    });

    expect(parsed).toEqual({
      question_id: "q123",
      outcome: { status: "answered", text: "Approve", option_ids: ["approve"] },
    });
  });

  it("drops an unpaired webhook update at the Worker transport boundary", async () => {
    const previous = {
      token: env.TELEGRAM_BOT_TOKEN,
      user: env.TELEGRAM_USER_ID,
      chat: env.TELEGRAM_CHAT_ID,
    };
    env.TELEGRAM_BOT_TOKEN = "test-bot-token";
    env.TELEGRAM_USER_ID = "424242";
    env.TELEGRAM_CHAT_ID = "919191";
    try {
      const response = await SELF.fetch("https://factory.example.com/api/channels/telegram/webhook", {
        method: "POST",
        body: JSON.stringify({
          message: { message_id: 92, chat: { id: 919191 }, from: { id: 777 }, text: "approve" },
        }),
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true, dropped: true });
    } finally {
      if (previous.token === undefined) delete env.TELEGRAM_BOT_TOKEN;
      else env.TELEGRAM_BOT_TOKEN = previous.token;
      if (previous.user === undefined) delete env.TELEGRAM_USER_ID;
      else env.TELEGRAM_USER_ID = previous.user;
      if (previous.chat === undefined) delete env.TELEGRAM_CHAT_ID;
      else env.TELEGRAM_CHAT_ID = previous.chat;
    }
  });
});

// --------------------------------------------------------------------------
// Project legibility, forum topics and webhook mode (tick spq)
// --------------------------------------------------------------------------

/** A fake Bot API on the global fetch, capturing every call's method and body. */
function fakeBotAPI(
  respond: (method: string, body: Record<string, unknown>) => unknown = () => ({ message_id: 4242 })
) {
  const calls: { method: string; body: Record<string, unknown> }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = url.slice(url.lastIndexOf("/") + 1);
    const body = init?.body === undefined ? {} : (JSON.parse(String(init.body)) as Record<string, unknown>);
    calls.push({ method, body });
    return Response.json({ ok: true, result: respond(method, body) });
  }) as typeof fetch;
  return { calls, restore: () => void (globalThis.fetch = original) };
}

/** The paired deployment every delivery test runs against. */
function telegramEnv(over: Partial<TelegramRuntimeEnv> = {}): TelegramRuntimeEnv {
  return {
    TELEGRAM_BOT_TOKEN: "test-bot-token",
    TELEGRAM_USER_ID: "424242",
    TELEGRAM_CHAT_ID: "-1001919191",
    TELEGRAM_API_BASE_URL: "https://telegram.test",
    ...over,
  };
}

const shipIt: Question = {
  header: "Merge",
  text: "Ship it?",
  options: [
    { id: "approve", label: "Approve" },
    { id: "reject", label: "Reject" },
  ],
};

describe("project legibility in the message text", () => {
  it("names project, epic and tick in a gate message", () => {
    const rendered = renderQuestion(shipIt, { project: "acme/web", epic: "4f2", tick: "8sm" });
    expect(rendered).toContain("acme/web");
    expect(rendered).toContain("epic 4f2");
    expect(rendered).toContain("tick 8sm");
    expect(rendered).toContain("Ship it?");
  });

  // The acceptance clause: the same question from two projects in one chat is
  // unambiguous to a human reader.
  it("composes two projects' identical questions differently", () => {
    const web = renderQuestion(shipIt, { project: "acme/web", epic: "4f2", tick: "8sm" });
    const api = renderQuestion(shipIt, { project: "acme/api", epic: "4f2", tick: "8sm" });

    expect(web).not.toBe(api);
    expect(web).toContain("acme/web");
    expect(web).not.toContain("acme/api");
    expect(api).toContain("acme/api");
    expect(api).not.toContain("acme/web");
  });

  it("keeps the project on the message after it is resolved", () => {
    const settled = renderOutcome(
      shipIt,
      { status: "answered", text: "Approve", option_ids: ["approve"] },
      { project: "acme/web", epic: "4f2", tick: "8sm" }
    );
    expect(settled).toContain("acme/web");
    expect(settled).toContain("tick 8sm");
    expect(settled).toContain("Answered");
  });

  it("escapes a project name rather than letting it reach the HTML parser", () => {
    const rendered = renderQuestion(shipIt, { project: "acme/<b>web</b>" });
    expect(rendered).toContain("&lt;b&gt;web&lt;/b&gt;");
  });

  it("renders no header line at all when nothing is known", () => {
    expect(renderQuestion(shipIt, {})).toBe(renderQuestion(shipIt, undefined));
  });

  it("puts the project on a delivered question and on a report", async () => {
    const api = fakeBotAPI();
    try {
      await deliverTelegramQuestion(telegramEnv(), { id: "q1", question: shipIt }, {
        context: { project: "acme/web", epic: "4f2", tick: "8sm" },
      });
      await sendTelegramReport(telegramEnv(), "Run complete: 3 ticks closed.", undefined, {
        context: { project: "acme/web", epic: "4f2" },
      });
    } finally {
      api.restore();
    }
    const sends = api.calls.filter((call) => call.method === "sendMessage");
    expect(sends).toHaveLength(2);
    for (const send of sends) {
      expect(String(send.body.text)).toContain("acme/web");
      expect(String(send.body.text)).toContain("epic 4f2");
    }
    expect(String(sends[1]!.body.text)).toContain("Run complete: 3 ticks closed.");
  });
});

describe("per-project forum topics", () => {
  it("posts a question and a report into the project's topic", async () => {
    const api = fakeBotAPI();
    try {
      await deliverTelegramQuestion(telegramEnv(), { id: "q1", question: shipIt }, {
        context: { project: "acme/web" },
        topic_id: "17",
      });
      await sendTelegramReport(telegramEnv(), "done", undefined, {
        context: { project: "acme/web" },
        topic_id: "17",
      });
    } finally {
      api.restore();
    }
    for (const send of api.calls.filter((call) => call.method === "sendMessage")) {
      expect(send.body.message_thread_id).toBe(17);
    }
  });

  it("omits message_thread_id for a project with no topic, so a plain chat still works", async () => {
    const api = fakeBotAPI();
    try {
      await deliverTelegramQuestion(telegramEnv(), { id: "q1", question: shipIt }, {
        context: { project: "acme/web" },
      });
    } finally {
      api.restore();
    }
    expect(api.calls[0]!.body).not.toHaveProperty("message_thread_id");
  });

  it("replies inside the topic of the message it answers", async () => {
    const api = fakeBotAPI();
    try {
      await sendTelegramReport(
        telegramEnv(),
        "done",
        { channel_id: "-1001919191", message_id: "88" },
        { context: { project: "acme/web" }, topic_id: "17" }
      );
    } finally {
      api.restore();
    }
    expect(api.calls[0]!.body.reply_to_message_id).toBe(88);
    expect(api.calls[0]!.body.message_thread_id).toBe(17);
  });

  it("refuses a topic id that is not a positive integer", () => {
    expect(parseTopicID("17")).toBe(17);
    expect(parseTopicID(17)).toBe(17);
    expect(parseTopicID("  17  ")).toBe(17);
    expect(parseTopicID("")).toBeNull();
    expect(parseTopicID(undefined)).toBeNull();
    expect(parseTopicID(null)).toBeNull();
    expect(parseTopicID("0")).toBeNull();
    expect(parseTopicID("-3")).toBeNull();
    expect(parseTopicID("general")).toBeNull();
    expect(parseTopicID(1.5)).toBeNull();
  });
});

describe("webhook mode", () => {
  it("registers the Worker's own webhook path with a secret and a narrow update list", async () => {
    const api = fakeBotAPI((method) =>
      method === "getMe"
        ? { id: 1, username: "ticks_bot", first_name: "Ticks", can_read_all_group_messages: false }
        : true
    );
    let registered;
    try {
      registered = await registerTelegramWebhook(
        telegramEnv({ TELEGRAM_WEBHOOK_SECRET: "shh" }),
        "https://factory.example.com"
      );
    } finally {
      api.restore();
    }
    const call = api.calls.find((entry) => entry.method === "setWebhook");
    expect(call).toBeDefined();
    expect(call!.body.url).toBe(`https://factory.example.com${TELEGRAM_WEBHOOK_PATH}`);
    expect(call!.body.secret_token).toBe("shh");
    expect(call!.body.allowed_updates).toEqual([...TELEGRAM_ALLOWED_UPDATES]);
    expect(registered!.privacy_mode).toBe(true);
  });

  // Privacy mode ON is the blast radius we want: in a group the bot then sees
  // only commands and replies to its own messages. Inline callbacks reach it
  // regardless, which is why the gate still works.
  it("refuses to register while privacy mode is off", async () => {
    const api = fakeBotAPI((method) =>
      method === "getMe"
        ? { id: 1, username: "ticks_bot", first_name: "Ticks", can_read_all_group_messages: true }
        : true
    );
    try {
      await expect(
        registerTelegramWebhook(telegramEnv(), "https://factory.example.com")
      ).rejects.toThrow(/privacy mode/i);
      expect(api.calls.some((entry) => entry.method === "setWebhook")).toBe(false);
    } finally {
      api.restore();
    }
  });

  it("unregisters by deleting the webhook, which is how polling is handed back", async () => {
    const api = fakeBotAPI(() => true);
    try {
      await unregisterTelegramWebhook(telegramEnv());
    } finally {
      api.restore();
    }
    expect(api.calls.map((entry) => entry.method)).toContain("deleteWebhook");
  });

  it("reports what Telegram believes the webhook is", async () => {
    const api = fakeBotAPI(() => ({
      url: `https://factory.example.com${TELEGRAM_WEBHOOK_PATH}`,
      pending_update_count: 0,
      last_error_message: "wrong response from the webhook",
    }));
    let info;
    try {
      info = await telegramWebhookInfo(telegramEnv());
    } finally {
      api.restore();
    }
    expect(info!.url).toBe(`https://factory.example.com${TELEGRAM_WEBHOOK_PATH}`);
    expect(info!.last_error_message).toBe("wrong response from the webhook");
  });
});

describe("reply-to routing, which privacy mode makes load-bearing", () => {
  const entry = {
    id: "q123",
    kind: "ask" as const,
    question: { text: "Which base branch?" },
    ref: { channel_id: "-1001919191", message_id: "91" },
  };

  it("routes a reply to the bot's own message onto that question", () => {
    expect(
      parseTelegramAnswer(
        {
          message: {
            message_id: 92,
            chat: { id: -1001919191 },
            from: { id: 424242 },
            message_thread_id: 17,
            reply_to_message: { message_id: 91 },
            text: "main",
          },
        },
        entry
      )
    ).toEqual({ question_id: "q123", outcome: { status: "answered", text: "main" } });
  });

  it("ignores free text that replies to nothing — privacy mode should not deliver it anyway", () => {
    expect(
      parseTelegramAnswer(
        { message: { message_id: 92, chat: { id: -1001919191 }, from: { id: 424242 }, text: "main" } },
        entry
      )
    ).toBeNull();
  });

  // Telegram threads the first message of a forum topic onto the topic's own
  // service message. That is not somebody answering a question.
  it("ignores the topic-creation service message a forum threads replies onto", () => {
    expect(
      parseTelegramAnswer(
        {
          message: {
            message_id: 92,
            chat: { id: -1001919191 },
            from: { id: 424242 },
            message_thread_id: 91,
            reply_to_message: { message_id: 91, forum_topic_created: { name: "acme/web" } },
            text: "main",
          },
        },
        entry
      )
    ).toBeNull();
  });
});
