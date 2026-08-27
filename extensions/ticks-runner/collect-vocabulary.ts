/**
 * The collect status vocabulary (tick pyj), read from
 * `contracts/collect-vocabulary.json` — the file `internal/herd/collect`,
 * `internal/cloud/collect`, and `cloud/factory/src/worker-collect.ts` also
 * read.
 *
 * `extensions/ticks-runner` is the Pi orchestrator extension and does not go
 * through the ticfac extraction (tick hn1's scope note), so it carries its
 * own reader rather than importing `worker-collect.ts`, which pulls in
 * Worker-only concerns (`Env`, GitHub's compare/contents APIs). This makes it
 * a fourth AND fifth implementation — `recovery.ts` and `runner.ts` used to
 * each hand-roll a status regexp, disagreeing with each other and with the
 * three collect implementations. Both now import this module instead.
 *
 * The constants and pattern below are spelled out, not read live from the
 * JSON, so a respelling here is a one-line diff a reviewer can see — exactly
 * like the other three implementations. `collect-vocabulary.test.ts` is what
 * catches a drift: it loads the shared contract at test time and fails the
 * build the moment this file's spelling stops matching it.
 */

export const STATUS_DONE = "DONE";
export const STATUS_DONE_WITH_CONCERNS = "DONE_WITH_CONCERNS";
export const STATUS_NEEDS_CONTEXT = "NEEDS_CONTEXT";
export const STATUS_BLOCKED = "BLOCKED";

export type ProtocolStatus =
	| typeof STATUS_DONE
	| typeof STATUS_DONE_WITH_CONCERNS
	| typeof STATUS_NEEDS_CONTEXT
	| typeof STATUS_BLOCKED;

/** The two statuses that are a human escalation regardless of verdict. */
const NEEDS_HUMAN_STATUSES: ReadonlySet<string> = new Set([STATUS_BLOCKED, STATUS_NEEDS_CONTEXT]);

export function needsHuman(status: string | undefined): boolean {
	return status !== undefined && NEEDS_HUMAN_STATUSES.has(status);
}

/**
 * Matches a report or agent-output line's status. `DONE_WITH_CONCERNS` is
 * first in the alternation so it is never truncated to `DONE` — see the `why`
 * at the top of `contracts/collect-vocabulary.json` for why that ordering is
 * a trap rather than tidiness. The pattern text — ordering included — is
 * pinned byte-for-byte against `status_line_pattern.pattern` there.
 */
export const STATUS_LINE =
	/^STATUS:[ \t]*(DONE_WITH_CONCERNS|DONE|NEEDS_CONTEXT|BLOCKED)\b[ \t]*(?:[-–—:][ \t]*)?(.*)$/;

/**
 * The markdown a status line may be wrapped in, trimmed from both ends of the
 * line and of the detail — ported byte-for-byte from `contract.decoration`.
 */
const DECORATION = /^[ \t>\-*#`]+|[ \t>\-*#`]+$/g;

/**
 * Finds the FINAL status line of `text` — not merely its final line — and
 * splits it into the status word, the detail after it, and the raw matched
 * line. Everything is empty when no line carries a recognisable status.
 *
 * The scan does not stop at the first match: a report or transcript may print
 * prose (a sign-off, a trailing blank line, a quoted template) after its real
 * status line, and a reader that only inspected the literal final line — what
 * `runner.ts`'s `protocolLine` used to do — read that report as having said
 * nothing at all. The shared contract's own "the FINAL status line wins" case
 * pins this same last-*matching*-line behaviour for the other three readers;
 * this is the decision, applied here too.
 */
export function parseStatus(text: string): { status: string; detail: string; line: string } {
	let status = "";
	let detail = "";
	let line = "";
	for (const raw of text.split("\n")) {
		const trimmed = raw.replace(/\r$/, "").replace(DECORATION, "");
		const match = STATUS_LINE.exec(trimmed);
		if (match === null) continue;
		status = match[1];
		detail = (match[2] ?? "").replace(DECORATION, "").trim();
		line = trimmed;
	}
	return { status, detail, line };
}
