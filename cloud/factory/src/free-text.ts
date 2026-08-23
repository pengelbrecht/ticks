/**
 * Which question a BARE Telegram message answers — or why none of them does.
 *
 * A reply-to is the deterministic path and `parseTelegramAnswer` owns it: the
 * operator pointed at a message, the message id is the correlation key, and
 * there is nothing to decide. This module is the other case, free text that
 * points at nothing, and it exists to make ONE rule enforceable:
 *
 *   - exactly one open question across every enrolled project → it resolves,
 *   - two or more → REFUSE, and list them.
 *
 * The count is a TOTAL, deliberately. One open question in each of two
 * projects is two, not one per project, because the operator typing "approve"
 * into a chat that serves both has named neither.
 *
 * Why fail-closed rather than best-effort: an answer is not just data. An
 * approval carries human provenance into the verdict guard, so a guess does
 * not merely answer the wrong question — it attributes the operator's consent
 * to another project's gate. That is forged consent, which is why refusing is
 * the correct outcome and not a degraded one. Nothing here may be softened
 * into "closest match" or "most recent question".
 *
 * The refusal has to be ACTIONABLE, or the operator learns to ignore it. Each
 * candidate is named with the same "owner/repo · epic X · tick Y" line every
 * other message in this chat uses (`./message-context.ts`), followed by the
 * unambiguous ways to settle it.
 */

import { contextLine } from "./message-context";

import type { Outcome, PendingEntry, Question, QuestionOption } from "./run-room";
import type { TelegramWebhookUpdate } from "./telegram";

/** One open question, and the project whose room holds it. */
export type FreeTextCandidate = {
  project: string;
  entry: Pick<PendingEntry, "id" | "epic" | "tick_id" | "question" | "ref">;
};

/**
 * What a bare message did.
 *
 * `refused` carries the candidates rather than a count because the refusal is
 * only useful if it names them; `unmatched` is the single-candidate case where
 * the text is not one of that question's options, which is still a refusal to
 * guess rather than a different kind of event.
 */
export type FreeTextResolution =
  | { kind: "none" }
  | { kind: "resolved"; candidate: FreeTextCandidate; outcome: Outcome }
  | { kind: "refused"; reason: "ambiguous" | "unmatched"; candidates: FreeTextCandidate[] };

/**
 * The text of a message that answers by itself rather than by pointing.
 *
 * Returns null for everything that is NOT free text needing a decision:
 *
 *  - a callback press, which carries its own question id;
 *  - a real reply, which `parseTelegramAnswer` correlates by message id. A
 *    reply that matches nothing is dropped there and must NOT fall through to
 *    here: the operator pointed at a message, and answering a different
 *    question because that one was already settled is exactly the misattribution
 *    this module exists to prevent;
 *  - a command. Privacy mode delivers `/start` and friends to the bot in a
 *    group, and a command is addressed to the bot, not an answer to a gate;
 *  - an empty or whitespace-only message.
 *
 * A "reply" to the forum topic-creation service message IS bare text: Telegram
 * threads the first message of a topic onto it, so somebody typing into a
 * topic has replied to nothing.
 */
export function bareTextOf(update: TelegramWebhookUpdate): string | null {
  if (update.callback_query !== undefined) return null;
  const message = update.message;
  if (message === undefined) return null;
  const replyTo = message.reply_to_message;
  if (replyTo !== undefined && replyTo.forum_topic_created === undefined) return null;
  const text = message.text?.trim() ?? "";
  if (text === "" || text.startsWith("/")) return null;
  return text;
}

/**
 * Applies the operator's rule to the open questions of the whole deployment.
 *
 * `candidates` must already be every OPEN question across every enrolled
 * project, in a stable order — the refusal lists them in the order given.
 */
export function resolveFreeText(
  text: string,
  candidates: FreeTextCandidate[]
): FreeTextResolution {
  if (candidates.length === 0) return { kind: "none" };
  if (candidates.length > 1) return { kind: "refused", reason: "ambiguous", candidates };

  const only = candidates[0]!;
  const outcome = textOutcome(only.entry.question, text);
  return outcome === null
    ? { kind: "refused", reason: "unmatched", candidates }
    : { kind: "resolved", candidate: only, outcome };
}

/**
 * The outcome a typed answer makes on one question, or null when it makes none.
 *
 * Shared with the reply-to path on purpose: the two surfaces must agree on
 * what "approve" means on a question with options, or the same words would
 * settle a gate differently depending on whether the operator swiped to reply.
 * A question with no options (or one that allows other) takes the text as
 * given; otherwise the text has to BE an option, by id or by label,
 * case-insensitively. Anything else is not an answer.
 */
export function textOutcome(question: Question, text: string): Outcome | null {
  const answer = text.trim();
  if (answer === "") return null;
  const options = question.options ?? [];
  if (options.length === 0 || question.allow_other === true) {
    return { status: "answered", text: answer };
  }
  const option = options.find(
    (candidate) =>
      candidate.id.toLowerCase() === answer.toLowerCase() ||
      candidate.label.toLowerCase() === answer.toLowerCase()
  );
  return option === undefined ? null : optionOutcome(option);
}

/** The outcome of choosing one option, however it was chosen. */
export function optionOutcome(option: QuestionOption): Outcome {
  return { status: "answered", text: option.label, option_ids: [option.id] };
}

/**
 * The refusal, as plain text for the caller to escape and send.
 *
 * It opens by saying nothing was answered, because a refusal the operator
 * misreads as an acknowledgement is worse than no message at all — they would
 * walk away believing a gate is approved. Then it names each candidate the way
 * every other message in this chat names its subject, and says the two
 * unambiguous ways to settle it: reply to that question's own message, or
 * press one of its buttons.
 */
export function renderFreeTextRefusal(
  resolution: Extract<FreeTextResolution, { kind: "refused" }>
): string {
  const lines: string[] =
    resolution.reason === "ambiguous"
      ? [
          `Nothing was answered: ${resolution.candidates.length} questions are open, and ` +
            "guessing which one you meant would attribute your answer to another project's gate.",
          "",
          "Answer one of these unambiguously — reply directly to its own message above, or " +
            "press one of its buttons:",
        ]
      : [
          "Nothing was answered: that is not one of this question's options, and this bot " +
            "does not guess.",
          "",
          "Reply directly to the question's own message above, or press one of its buttons:",
        ];

  resolution.candidates.forEach((candidate, index) => {
    const line = contextLine({
      project: candidate.project,
      ...(candidate.entry.epic === undefined ? {} : { epic: candidate.entry.epic }),
      ...(candidate.entry.tick_id === undefined ? {} : { tick: candidate.entry.tick_id }),
    });
    lines.push("", `${index + 1}. ${line}`);
    const question = candidate.entry.question;
    if (question.header !== undefined && question.header !== "") {
      lines.push(`   ${question.header}: ${question.text}`);
    } else {
      lines.push(`   ${question.text}`);
    }
    const options = question.options ?? [];
    lines.push(
      options.length === 0
        ? "   Reply to that message with your answer."
        : `   Reply to that message with one of: ${options.map((option) => option.label).join(" / ")}`
    );
  });
  return lines.join("\n");
}
