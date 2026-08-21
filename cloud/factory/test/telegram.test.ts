import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import {
  isPairedTelegramUpdate,
  parseTelegramAnswer,
  type TelegramWebhookUpdate,
} from "../src/telegram";

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
