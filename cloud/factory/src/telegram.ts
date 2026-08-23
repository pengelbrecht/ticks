/**
 * Telegram webhook and delivery helpers for the factory.
 *
 * The Worker is the bot's ONE update consumer, and it consumes by webhook: the
 * Bot API allows a single reader per token, so `setWebhook` and `getUpdates`
 * are mutually exclusive and the front door is the choice this deployment
 * makes. `registerTelegramWebhook` is what actually makes that true on
 * Telegram's side; without it the route below exists and nothing ever knocks
 * on it.
 *
 * The RunRoom remains the only answer arbiter: this module only translates
 * Telegram updates into a RunRoom outcome and renders the resulting durable
 * entry back onto the same message.
 *
 * Two things about a SHARED chat run through every function here. First,
 * legibility: one bot and one chat serve many projects, so every message names
 * its project, epic and tick in the text (`./message-context.ts`) — machine
 * routing was never ambiguous, the human reading the chat was. Second, forum
 * topics: a supergroup with Topics on gives one topic per project through
 * `message_thread_id`, and which topic a project posts into is part of that
 * project's ENROLMENT record, not a config surface of its own.
 */

import { withContext, type MessageContext } from "./message-context";

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
  /** The forum topic the message is in, when the chat has Topics on. */
  message_thread_id?: number;
  reply_to_message?: {
    message_id: number;
    /**
     * Set when the "reply" is Telegram's own topic-creation service message
     * rather than somebody replying to a message. A forum threads the first
     * message of a topic onto it, which is not an answer to anything.
     */
    forum_topic_created?: unknown;
  };
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

/**
 * The path Telegram delivers updates to. Exported because registration has to
 * name the same path the router serves, and a typo there is a bot that goes
 * quiet with nothing in this Worker's logs to say so.
 */
export const TELEGRAM_WEBHOOK_PATH = "/api/channels/telegram/webhook";

/**
 * The only updates this deployment asks for.
 *
 * Narrow on purpose, and narrower than what the bot is entitled to: the two
 * kinds are how an operator answers — a press on an inline keyboard, and a
 * reply to one of the bot's own messages. Everything else Telegram could send
 * is traffic this Worker would drop anyway, and not receiving it at all is a
 * smaller blast radius than dropping it after the fact.
 */
export const TELEGRAM_ALLOWED_UPDATES = ["message", "callback_query"] as const;

/**
 * How a message is routed and labelled for one project.
 *
 * Both halves come from the project's enrolment record, which is deliberately
 * the only place a project's chat presence is configured.
 */
export type TelegramRouting = {
  /** Which project, epic and tick the message names in its text. */
  context?: MessageContext;
  /**
   * The forum topic (`message_thread_id`) this project's messages go into,
   * as the enrolment record holds it. Undefined posts to the chat itself,
   * which is what a deployment without Topics has.
   */
  topic_id?: string;
};

/**
 * A forum topic id, or null when the value is not one.
 *
 * `message_thread_id` is a positive integer message id. Anything else — the
 * empty string, a name, a fraction, the "General" topic, which has no id — is
 * refused here rather than sent to Telegram, because a bad thread id is a 400
 * on every message the project ever sends.
 */
export function parseTopicID(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = typeof value === "number" ? String(value) : value.trim();
  if (text === "") return null;
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/** The `message_thread_id` field for a send, or nothing when there is no topic. */
function threadField(routing?: TelegramRouting): { message_thread_id?: number } {
  const topic = parseTopicID(routing?.topic_id);
  return topic === null ? {} : { message_thread_id: topic };
}

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

  // Privacy mode stays ON, so in a group this bot is delivered only commands
  // and replies to its OWN messages. That makes reply-to load-bearing rather
  // than a nicety: it is the entire correlation key for a free-text answer.
  const message = update.message;
  const replyTo = message?.reply_to_message;
  if (
    message === undefined ||
    replyTo === undefined ||
    // A forum threads a topic's first message onto the topic-creation service
    // message. Somebody starting to type in a topic is not answering anything.
    replyTo.forum_topic_created !== undefined ||
    entry.ref?.message_id !== String(replyTo.message_id)
  ) {
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

/**
 * Sends a question and returns the Telegram ref that belongs in RunRoom.
 *
 * `routing` is the project's enrolment record in message form: which topic the
 * question is posted into, and which project/epic/tick the text names.
 */
export async function deliverTelegramQuestion(
  env: TelegramRuntimeEnv,
  entry: Pick<PendingEntry, "id" | "question">,
  routing?: TelegramRouting
): Promise<MessageRef> {
  const config = telegramConfig(env);
  const question = entry.question;
  const keyboard = questionKeyboard(entry.id, question);
  const useQuestionID = keyboard.every((row) =>
    row.every((button) => new TextEncoder().encode(button.callback_data).length <= CALLBACK_LIMIT)
  );
  const sent = await telegramCall<{ message_id: number }>(config, "sendMessage", {
    chat_id: config.chat_id,
    ...threadField(routing),
    text: renderQuestion(question, routing?.context),
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
  outcome: Outcome,
  routing?: TelegramRouting
): Promise<void> {
  const config = telegramConfig(env);
  const ref = entry.ref;
  if (ref?.message_id === undefined) return;
  // No thread field on an edit: a message id already names the message, topic
  // and all, and Telegram rejects the pair.
  await telegramCall(config, "editMessageText", {
    chat_id: ref.channel_id ?? config.chat_id,
    message_id: Number(ref.message_id),
    text: renderOutcome(entry.question, outcome, routing?.context),
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [] },
  });
}

/**
 * Posts a report or completion, replying to the originating Telegram message.
 *
 * The report names its project, epic and tick like every other message: a run
 * completion that says only "3 ticks closed" is unreadable in a chat several
 * projects report into.
 */
export async function sendTelegramReport(
  env: TelegramRuntimeEnv,
  text: string,
  ref?: MessageRef,
  routing?: TelegramRouting
): Promise<MessageRef> {
  const config = telegramConfig(env);
  const sent = await telegramCall<{ message_id: number }>(config, "sendMessage", {
    chat_id: ref?.channel_id ?? config.chat_id,
    ...threadField(routing),
    text: escapeHTML(withContext(routing?.context, text)),
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

// ------------------------------------------------------- webhook mode ---

/** What `getMe` says about this bot. */
export type TelegramBotInfo = {
  id: number;
  username?: string;
  first_name?: string;
  /**
   * TRUE means privacy mode is OFF — the bot is delivered every message in
   * every group it is in. This deployment requires the opposite.
   */
  can_read_all_group_messages?: boolean;
};

/** What Telegram believes about the registered webhook (`getWebhookInfo`). */
export type TelegramWebhookInfo = {
  url?: string;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  allowed_updates?: string[];
};

/** What registration settled on, reported back to the operator. */
export type TelegramWebhookRegistration = {
  url: string;
  allowed_updates: string[];
  /** True once getMe has confirmed privacy mode is on. */
  privacy_mode: true;
  secret: boolean;
};

export async function telegramBotInfo(env: TelegramRuntimeEnv): Promise<TelegramBotInfo> {
  return telegramCall<TelegramBotInfo>(telegramConfig(env), "getMe", {});
}

/**
 * Refuses unless the bot's group privacy mode is on.
 *
 * Privacy mode is the blast radius this design chose: in a group the bot is
 * delivered only commands and replies to its own messages, so a shared
 * operator supergroup does not stream every unrelated word anyone types into
 * a Worker that talks to a model. Inline callbacks reach the bot regardless,
 * which is why the gate keeps working — and why the reply-to correlation in
 * `parseTelegramAnswer` is load-bearing rather than a convenience.
 *
 * It cannot be set through the Bot API: it is a @BotFather setting, and all a
 * deployment can do is check it and refuse to proceed. `can_read_all_group_messages`
 * is that check, inverted.
 */
export async function assertTelegramPrivacyMode(env: TelegramRuntimeEnv): Promise<void> {
  const bot = await telegramBotInfo(env);
  if (bot.can_read_all_group_messages === true) {
    throw new Error(
      "this bot has group privacy mode DISABLED, so it would be delivered every message in " +
        "every group it is in. Turn it back on in @BotFather (/setprivacy -> Enable), remove " +
        "and re-add the bot to the chat, then register the webhook again."
    );
  }
}

/**
 * Points Telegram at this deployment's webhook path and returns what it
 * settled on.
 *
 * `baseURL` is the factory's own public origin; the path is this module's, so
 * the registration and the router cannot disagree. Registration is what makes
 * webhook mode real: `setWebhook` and `getUpdates` are mutually exclusive per
 * token, so this call is also what STOPS any long-poll consumer — a local
 * `tk` polling the same bot starts getting 409 and is told to stop, which is
 * the intended handover rather than a fault.
 *
 * Pending updates are dropped: a backlog queued while nothing was listening is
 * answers to questions that have since been settled by another surface, and
 * replaying it would resolve nothing and confuse everything.
 */
export async function registerTelegramWebhook(
  env: TelegramRuntimeEnv,
  baseURL: string
): Promise<TelegramWebhookRegistration> {
  const config = telegramConfig(env);
  const origin = baseURL.trim().replace(/\/+$/, "");
  if (origin === "") throw new Error("a webhook base URL is required");
  // Checked BEFORE the webhook is registered: a deployment that would widen
  // the bot's reach should never reach the front door in the first place.
  await assertTelegramPrivacyMode(env);

  const url = `${origin}${TELEGRAM_WEBHOOK_PATH}`;
  const allowed = [...TELEGRAM_ALLOWED_UPDATES];
  await telegramCall(config, "setWebhook", {
    url,
    allowed_updates: allowed,
    drop_pending_updates: true,
    ...(config.webhook_secret === undefined ? {} : { secret_token: config.webhook_secret }),
  });
  return {
    url,
    allowed_updates: allowed,
    privacy_mode: true,
    secret: config.webhook_secret !== undefined,
  };
}

/**
 * Withdraws the webhook, handing the token back to whoever wants to long-poll
 * it — which is what `tk channel setup telegram` needs before it can wait for
 * a `/start` message.
 */
export async function unregisterTelegramWebhook(env: TelegramRuntimeEnv): Promise<void> {
  await telegramCall(telegramConfig(env), "deleteWebhook", { drop_pending_updates: false });
}

/** What Telegram currently believes the webhook is. */
export async function telegramWebhookInfo(env: TelegramRuntimeEnv): Promise<TelegramWebhookInfo> {
  return telegramCall<TelegramWebhookInfo>(telegramConfig(env), "getWebhookInfo", {});
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

export function renderQuestion(question: Question, context?: MessageContext): string {
  const lines: string[] = [];
  const line = withContext(context, "");
  // The project line comes first and is the only thing a reader has to scan to
  // know which repository is asking.
  if (line !== "") lines.push(`<b>${escapeHTML(line)}</b>`);
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

export function renderOutcome(
  question: Question,
  outcome: Outcome,
  context?: MessageContext
): string {
  const heading =
    outcome.status === "answered"
      ? "Answered"
      : outcome.status === "cancelled"
        ? "Cancelled"
        : outcome.status === "timed_out"
          ? "Timed out"
          : "Resolved";
  const lines = [renderQuestion(question, context), `<b>${heading}</b>`];
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
