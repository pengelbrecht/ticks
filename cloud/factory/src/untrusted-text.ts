/**
 * Text a stranger wrote, made safe to carry and safe to place in a message a
 * human acts on with a button.
 *
 * Lifted out of `github-issues.ts` by tick 0vb, unchanged in behaviour and
 * deliberately so: vuz's RESULT note called this the piece that is "not
 * GitHub-specific at all and should move to a shared module the moment there
 * is a second consumer". Generic webhook sources are that second consumer, and
 * three copies of the bidirectional-character list would drift — which is the
 * cross-implementation failure `.tick/learnings.md` already records once.
 *
 * The one invariant every consumer keeps, and the reason this module is split
 * into two functions rather than one:
 *
 *   **Every line the factory wrote begins at column 0, and every line an
 *   outsider wrote begins with {@link UNTRUSTED_LINE_PREFIX}.**
 *
 * {@link sanitizeUntrusted} makes text safe to *carry*. It cannot promise the
 * caller quoted it, so it does not pretend to: {@link quoteUntrusted} is the
 * function that puts a line behind the prefix, and a renderer that wants the
 * invariant calls both.
 */

/**
 * The prefix on every line of outsider-written text, in a tick description and
 * in a channel render alike.
 *
 * One prefix rather than two because the invariant is one sentence. `> ` also
 * renders as a blockquote on every markdown surface a description reaches, so
 * the same characters do the same job for a human as for the test.
 */
export const UNTRUSTED_LINE_PREFIX = "> ";

/** What a bounded body says in place of the text it dropped. */
export const TRUNCATION_MARKER = "[truncated by the ticks factory]";

/**
 * The default bounds on untrusted prose.
 *
 * Well inside the funnel's own `MAX_SIGNAL_DESCRIPTION`, because quoting adds
 * two bytes per line and a description that overflows would be REFUSED by the
 * funnel — turning a hostile body into a way to make a *consented* signal
 * unfilable.
 */
export const MAX_UNTRUSTED_CHARS = 8_000;
export const MAX_UNTRUSTED_LINES = 400;

/**
 * Everything that can move a line break, hide a character or reverse the
 * reading order of one.
 *
 * The bidirectional overrides matter as much as the control codes: `U+202E`
 * renders the text after it right-to-left, which is how a quoted line can be
 * made to *look* like it starts somewhere else entirely while every byte of it
 * still sits inside the quote. Tab and newline survive; nothing else in the
 * C0/C1 ranges does.
 */
const INVISIBLE =
  /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** Every way a payload can express "new line", folded to the one this module quotes. */
function normalizeNewlines(text: string): string {
  return text.replace(/\r\n|\r|\u2028|\u2029|\u0085/g, "\n");
}

/**
 * Outsider-written prose, made safe to carry — but NOT yet safe to place at
 * column 0. That is {@link quoteUntrusted}'s job, and the split is deliberate:
 * this function has no way to promise the caller quoted it.
 */
export function sanitizeUntrusted(
  raw: unknown,
  bounds: { maxChars?: number; maxLines?: number } = {}
): string {
  if (typeof raw !== "string") return "";
  const maxChars = bounds.maxChars ?? MAX_UNTRUSTED_CHARS;
  const maxLines = bounds.maxLines ?? MAX_UNTRUSTED_LINES;

  let text = normalizeNewlines(raw).replace(INVISIBLE, "");
  // Lone surrogates survive JSON but not a round trip through TextEncoder;
  // dropping them here keeps the committed record byte-stable.
  text = text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
  // Trailing whitespace per line, then runs of blank lines: a body padded with
  // 4,000 empty lines is a way to push the real content out of a message.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  let truncated = false;
  if (text.length > maxChars) {
    let cut = text.slice(0, maxChars);
    // Never end on a lone high surrogate.
    if (/[\uD800-\uDBFF]$/.test(cut)) cut = cut.slice(0, -1);
    text = cut;
    truncated = true;
  }
  const lines = text.split("\n");
  if (lines.length > maxLines) {
    text = lines.slice(0, maxLines).join("\n");
    truncated = true;
  }
  return truncated ? `${text}\n${TRUNCATION_MARKER}` : text;
}

/**
 * A single line of outsider-written text — a title, a login that failed its
 * pattern, anything that must not carry a newline into a rendered message.
 */
export function sanitizeUntrustedLine(raw: unknown, maxChars: number): string {
  if (typeof raw !== "string") return "";
  const text = normalizeNewlines(raw)
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

/**
 * Puts every line of `text` behind {@link UNTRUSTED_LINE_PREFIX}.
 *
 * Applied unconditionally — a line that already starts with the prefix is
 * simply prefixed again. Stripping an existing one would hand the writer a way
 * to reach column 0 by writing it themselves.
 */
export function quoteUntrusted(text: string): string {
  return text
    .split("\n")
    .map((line) => `${UNTRUSTED_LINE_PREFIX}${line}`)
    .join("\n");
}
