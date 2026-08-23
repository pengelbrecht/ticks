/**
 * Which project, epic and tick a message is about.
 *
 * One bot and one chat now serve MANY projects, because one factory does.
 * Machine routing was never the problem: the RunRoom is per project, question
 * ids are unique by registration, and callback data carries the question id, so
 * a press has always landed on the right question. What was missing is that
 * nothing composed the project into the message TEXT — so two repositories
 * asking the same question produced two indistinguishable messages, and a chat
 * shared by several projects stopped being usable by the human in it.
 *
 * Every gate message, report and completion this Worker sends goes through
 * `withContext`, so the answer to "which repo is this about?" is in the message
 * rather than in the reader's memory of which run they started last.
 *
 * The exact line is pinned by test/fixtures/message-context.json, which
 * internal/operator/message_context_parity_test.go checks too: the local
 * Telegram channel composes the same line into the same chat, and a drift
 * between the two is invisible to both suites.
 */

export const MESSAGE_CONTEXT_SEPARATOR = " · ";
export const MESSAGE_CONTEXT_EPIC_PREFIX = "epic ";
export const MESSAGE_CONTEXT_TICK_PREFIX = "tick ";

export type MessageContext = {
  /** The canonical owner/repo pair. */
  project?: string;
  /** The epic tick id a run is working through, when there is one. */
  epic?: string;
  /** The tick the message is about, when there is one. */
  tick?: string;
};

/**
 * The context as one plain-text line: "acme/web · epic 4f2 · tick 8sm".
 *
 * Fields are trimmed, and an empty one is omitted rather than rendered as an
 * empty slot. A context that names nothing composes an empty string, never a
 * frame with nothing in it.
 */
export function contextLine(context: MessageContext | undefined): string {
  if (context === undefined) return "";
  const parts: string[] = [];
  const project = context.project?.trim() ?? "";
  const epic = context.epic?.trim() ?? "";
  const tick = context.tick?.trim() ?? "";
  if (project !== "") parts.push(project);
  if (epic !== "") parts.push(`${MESSAGE_CONTEXT_EPIC_PREFIX}${epic}`);
  if (tick !== "") parts.push(`${MESSAGE_CONTEXT_TICK_PREFIX}${tick}`);
  return parts.join(MESSAGE_CONTEXT_SEPARATOR);
}

/**
 * Puts the context line above `body`, separated by one newline. A context that
 * names nothing returns `body` unchanged.
 *
 * Both arguments are plain text; the caller escapes for its transport.
 */
export function withContext(context: MessageContext | undefined, body: string): string {
  const line = contextLine(context);
  if (line === "") return body;
  if (body === "") return line;
  return `${line}\n${body}`;
}
