/**
 * Telegram webhook and delivery helpers for the factory.
 *
 * The Worker is the one getUpdates consumer for a cloud-connected bot. The
 * RunRoom remains the only answer arbiter: this module only translates Telegram
 * updates into a RunRoom outcome and renders the resulting durable entry back
 * onto the same message.
 */

import type {
  MessageRef,
  Outcome,
  PendingEntry,
  Question,
  QuestionOption,
} from "./run-room";

export type TelegramWebhookUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramMessage = {
  message_id: number;
  chat: { id: number | string };
  from?: { id: number | string };
  text?: string;
  reply_to_message?: { message_id: number };
};

export type TelegramCallbackQuery = {
  id: string;
  from: { id: number | string };
  data?: string;
  message?: { message_id: number; chat: { id: number | string } };
};

export type TelegramPairing = {
  user_id?: string;
  chat_id?: string;
};

export type TelegramRuntimeEnv = {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_USER_ID?: string;
  TELEGRAM_CHAT_ID?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_API_BASE_URL?: string;
};

export type TelegramConfig = {
  token: string;
  user_id: string;
  chat_id: string;
  webhook_secret?: string;
  api_base_url: string;
};

const DEFAULT_API_BASE_URL = "https://api.telegram.org";
const CALLBACK_LIMIT = 64;

export function telegramConfig(env: TelegramRuntimeEnv): TelegramConfig {
  const token = env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const userID = env.TELEGRAM_USER_ID?.trim() ?? "";
  const chatID = env.TELEGRAM_CHAT_ID?.trim() ?? "";
  if (token === "") throw new Error("Telegram bot token is not configured");
  if (userID === "") throw new Error("Telegram paired user id is not configured");
  if (chatID === "") throw new Error("Telegram paired chat id is not configured");
  return {
    token,
    user_id: userID,
    chat_id: chatID,
    ...(env.TELEGRAM_WEBHOOK_SECRET?.trim()
      ? { webhook_secret: env.TELEGRAM_WEBHOOK_SECRET.trim() }
      : {}),
    api_base_url: (env.TELEGRAM_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, ""),
  };
}

/**
 * The transport boundary: a Telegram update is useful only when both the
 * sender and the conversation are the paired identities. Returning false is a
 * deliberate drop, not an authorization error sent back to a stranger.
 */
export function isPairedTelegramUpdate(
  update: TelegramWebhookUpdate,
  pairing: TelegramPairing
): boolean {
  const userID = pairing.user_id?.trim() ?? "";
  const chatID = pairing.chat_id?.trim() ?? "";
  if (userID === "" || chatID === "") return false;

  if (update.message !== undefined) {
    return (
      String(update.message.from?.id ?? "") === userID &&
      String(update.message.chat.id) === chatID
    );
  }
  const message = update.callback_query?.message;
  return (
    message !== undefined &&
    String(update.callback_query?.from?.id ?? "") === userID &&
    String(message.chat.id) === chatID
  );
}

/** The small result passed from Telegram parsing to the RunRoom answer call. */
export type TelegramAnswer = {
  question_id: string;
  outcome: Outcome;
};

/**
 * Correlates a paired update with one pending entry and makes an outcome. The
 * callback payload contains the question id for normal ids; long ids use the
 * message id after delivery, which is also durable in the RunRoom ref.
 */
export function parseTelegramAnswer(
  update: TelegramWebhookUpdate,
  entry: Pick<PendingEntry, "id" | "kind" | "question" | "ref">
): TelegramAnswer | null {
  if (update.callback_query !== undefined) {
    const callback = update.callback_query;
    const message = callback.message;
    if (message === undefined || callback.data === undefined) return null;
    const parts = callback.data.split(":");
    if (parts.length !== 3 || parts[0] !== "q" && parts[0] !== "r") return null;

    if (parts[0] === "q" && parts[1] !== entry.id) return null;
    if (
      parts[0] === "r" &&
      (entry.ref?.message_id !== parts[1] || entry.ref?.channel_id !== String(message.chat.id))
    ) {
      return null;
    }
    const index = Number(parts[2]);
    if (!Number.isSafeInteger(index) || index < 0) return null;
    const option = entry.question.options?.[index];
    if (option === undefined) return null;
    return {
      question_id: entry.id,
      outcome: optionOutcome(option),
    };
  }

  const message = update.message;
  const replyTo = message?.reply_to_message?.message_id;
  if (message === undefined || replyTo === undefined || entry.ref?.message_id !== String(replyTo)) {
    return null;
  }
  const text = message.text?.trim() ?? "";
  if (text === "") return null;
  const options = entry.question.options ?? [];
  if (options.length === 0 || entry.question.allow_other === true) {
    return {
      question_id: entry.id,
      outcome: { status: "answered", text },
    };
  }
  const option = options.find(
    (candidate) =>
      candidate.id.toLowerCase() === text.toLowerCase() ||
      candidate.label.toLowerCase() === text.toLowerCase()
  );
  return option === undefined
    ? null
    : { question_id: entry.id, outcome: optionOutcome(option) };
}

function optionOutcome(option: QuestionOption): Outcome {
  return { status: "answered", text: option.label, option_ids: [option.id] };
}

/** Sends a question and returns the Telegram ref that belongs in RunRoom. */
export async function deliverTelegramQuestion(
  env: TelegramRuntimeEnv,
  entry: Pick<PendingEntry, "id" | "question">
): Promise<MessageRef> {
  const config = telegramConfig(env);
  const question = entry.question;
  const keyboard = questionKeyboard(entry.id, question);
  const useQuestionID = keyboard.every((row) =>
    row.every((button) => new TextEncoder().encode(button.callback_data).length <= CALLBACK_LIMIT)
  );
  const sent = await telegramCall<{ message_id: number }>(config, "sendMessage", {
    chat_id: config.chat_id,
    text: renderQuestion(question),
    parse_mode: "HTML",
    ...(useQuestionID && keyboard.length > 0 ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    ...(keyboard.length === 0 ? { reply_markup: { force_reply: true } } : {}),
  });
  const ref: MessageRef = {
    channel_id: config.chat_id,
    message_id: String(sent.message_id),
  };

  // A caller-supplied question id can be longer than Telegram's callback-data
  // limit. Message ids are short and are already persisted as the ref, so use
  // them as the fallback correlation key and attach the keyboard after send.
  if (keyboard.length > 0 && !useQuestionID) {
    await telegramCall(config, "editMessageReplyMarkup", {
      chat_id: config.chat_id,
      message_id: sent.message_id,
      reply_markup: { inline_keyboard: questionKeyboard(`r:${sent.message_id}`, question) },
    });
  }
  return ref;
}

/** Edits a delivered Telegram question into its durable outcome. */
export async function settleTelegramQuestion(
  env: TelegramRuntimeEnv,
  entry: Pick<PendingEntry, "question" | "ref">,
  outcome: Outcome
): Promise<void> {
  const config = telegramConfig(env);
  const ref = entry.ref;
  if (ref?.message_id === undefined) return;
  await telegramCall(config, "editMessageText", {
    chat_id: ref.channel_id ?? config.chat_id,
    message_id: Number(ref.message_id),
    text: renderOutcome(entry.question, outcome),
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [] },
  });
}

/** Posts a completion report, replying to the originating Telegram message. */
export async function sendTelegramReport(
  env: TelegramRuntimeEnv,
  text: string,
  ref?: MessageRef
): Promise<MessageRef> {
  const config = telegramConfig(env);
  const sent = await telegramCall<{ message_id: number }>(config, "sendMessage", {
    chat_id: ref?.channel_id ?? config.chat_id,
    text: escapeHTML(text),
    parse_mode: "HTML",
    ...(ref?.message_id === undefined ? {} : { reply_to_message_id: Number(ref.message_id) }),
  });
  return {
    channel_id: ref?.channel_id ?? config.chat_id,
    message_id: String(sent.message_id),
  };
}

/** Acknowledges a callback so the Telegram client stops showing its spinner. */
export async function answerTelegramCallback(
  env: TelegramRuntimeEnv,
  callbackID: string,
  text?: string
): Promise<void> {
  const config = telegramConfig(env);
  await telegramCall(config, "answerCallbackQuery", {
    callback_query_id: callbackID,
    ...(text === undefined ? {} : { text, show_alert: true }),
  });
}

export function telegramCallbackText(answeredBy: string): string {
  return `Already answered by ${answeredBy}.`;
}

function questionKeyboard(questionID: string, question: Question): { text: string; callback_data: string }[][] {
  if (question.options === undefined || question.options.length === 0) return [];
  return question.options.map((option, index) => [
    { text: option.label, callback_data: questionID.startsWith("r:") ? `r:${questionID.slice(2)}:${index}` : `q:${questionID}:${index}` },
  ]);
}

export function renderQuestion(question: Question): string {
  const lines: string[] = [];
  if (question.header !== undefined && question.header !== "") {
    lines.push(`<b>${escapeHTML(question.header)}</b>`);
  }
  lines.push(escapeHTML(question.text));
  for (const option of question.options ?? []) {
    // Descriptions are optional in the RunRoom mirror but remain useful in the
    // chat; button labels themselves stay compact.
    const description = (option as QuestionOption & { description?: string }).description;
    if (description !== undefined && description !== "") {
      lines.push(`• <b>${escapeHTML(option.label)}</b> — ${escapeHTML(description)}`);
    }
  }
  if ((question.options ?? []).length === 0) lines.push("\n<i>Reply to this message with your answer.</i>");
  return lines.join("\n");
}

export function renderOutcome(question: Question, outcome: Outcome): string {
  const heading =
    outcome.status === "answered"
      ? "Answered"
      : outcome.status === "cancelled"
        ? "Cancelled"
        : outcome.status === "timed_out"
          ? "Timed out"
          : "Resolved";
  const lines = [renderQuestion(question), `<b>${heading}</b>`];
  if (outcome.text !== undefined && outcome.text !== "") lines[1] += ` — ${escapeHTML(outcome.text)}`;
  return lines.join("\n\n");
}

export function escapeHTML(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function telegramCall<T>(config: TelegramConfig, method: string, body: unknown): Promise<T> {
  const response = await fetch(`${config.api_base_url}/bot${config.token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: T;
    description?: string;
  };
  if (!response.ok || payload.ok !== true || payload.result === undefined) {
    throw new Error(`Telegram ${method} failed: ${payload.description ?? response.statusText}`);
  }
  return payload.result;
}
