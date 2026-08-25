/**
 * The trace id — one identifier joining "a message arrived" to "a container
 * did this" (D20, tick hyi).
 *
 * ## The argument for minting it early rather than last
 *
 * Phase 2's retro. Seven paid runs were misdiagnosed because the record that
 * would have answered the question was not joined to the thing that failed:
 * the dispatch log held what the control plane BELIEVED, the container's own
 * output held what actually happened, and no identifier crossed between them.
 * Ingestion multiplies the number of doors a request can arrive through —
 * Telegram, a labelled GitHub issue, a generic webhook, `tk cloud run` from a
 * laptop — so the join has to exist before the sources do, not after.
 *
 * ## Minted at an edge, carried everywhere else
 *
 * There is exactly one rule and it is worth stating plainly: **a trace id is
 * minted where work first touches the factory, and is carried from there on.**
 * Every function below that produces an id takes an optional existing one and
 * returns it unchanged when it is usable. Nothing downstream mints a second
 * id, because two ids for one causal chain is not a trace — it is the same
 * missing join with more records in it.
 *
 * The edges are:
 *  - `submitSignal` (`signal-inbox.ts`) — every ingested signal, whichever
 *    source funnelled it, including one that turns out to be unfilable.
 *  - `parseSubmission` (`runs.ts`) — every run submission, including the ones
 *    that no signal produced.
 *
 * ## The discontinuity this format has to survive
 *
 * A signal does not become a run. It becomes a DRAFT, which then SITS —
 * possibly for days — until a person presses Create or Dispatch (tick la9).
 * The run is started later, by a different actor, from a different surface.
 * So the trace id is emphatically **not** a request-scoped context that can be
 * threaded on the stack: it has to be written into durable state at the edge
 * and read back out of that state by the dispatch path. That is why it is a
 * column on the inbox's draft row, a field on the committed tick record, and a
 * column on the run index — three durable hops, none of which share a call
 * stack with the next.
 *
 * ## Why the format is pinned across languages
 *
 * Go reads a trace id back (`tk cloud logs`, `tk cloud trace`), writes it into
 * the tracker record format it owns (`internal/tick.Tick.TraceID`), and hands
 * it to a container as `TICKS_TRACE_ID`. `.tick/learnings.md` is unambiguous
 * about what a constant crossing that boundary needs: a cross-implementation
 * golden test, because otherwise each suite stays internally consistent while
 * the two halves disagree. `test/fixtures/tracker-layout.json` is that pin and
 * `internal/trace` is Go's half.
 */

/** Marks a trace id at a glance, the way `run_` marks a run id. */
export const TRACE_ID_PREFIX = "tr_";

/** Hex characters after the prefix: 16 random bytes, a UUID's worth. */
export const TRACE_ID_HEX_LENGTH = 32;

/**
 * The whole format. Anchored, lowercase, fixed width — a validator that
 * accepted a near-miss would let two spellings of one causal chain exist,
 * which is the join failure this module exists to prevent.
 */
export const TRACE_ID_PATTERN = new RegExp(
  `^${TRACE_ID_PREFIX}[0-9a-f]{${TRACE_ID_HEX_LENGTH}}$`
);

/**
 * Mints a trace id.
 *
 * Called at an edge and nowhere else. Every other place that needs one takes
 * it from the record in front of it — see {@link carriedTraceID}.
 */
export function newTraceID(): string {
  return `${TRACE_ID_PREFIX}${crypto.randomUUID().replaceAll("-", "")}`;
}

/** Whether a value is a well-formed trace id. */
export function isTraceID(value: unknown): value is string {
  return typeof value === "string" && TRACE_ID_PATTERN.test(value);
}

/**
 * A supplied trace id, normalized, or null when it is not one.
 *
 * Case is folded, unlike an external ref's (`signal-inbox.ts` explains why
 * that one must NOT be): a trace id's alphabet is hex, so two cases are two
 * spellings of one value rather than two different values.
 */
export function parseTraceID(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toLowerCase();
  return TRACE_ID_PATTERN.test(candidate) ? candidate : null;
}

/**
 * The trace id to use here: the one already carried, or a fresh one.
 *
 * This is the only function an edge should call. It is deliberately total —
 * an unusable supplied value mints rather than refuses — because a trace id is
 * observability, and a signal refused for a malformed trace header would be a
 * diagnostic taking down the thing it exists to diagnose. What it must never
 * do is the opposite: silently DROP a usable id and mint beside it, which
 * would leave two ids for one chain.
 */
export function carriedTraceID(value?: unknown): string {
  return parseTraceID(value) ?? newTraceID();
}

/**
 * The line the control plane writes at the head of a container's own log
 * stream, so an operator reading what a container printed can read the trace
 * id out of the same text (tick hyi's acceptance criterion, third clause).
 *
 * Written by the CONTROL PLANE at dispatch rather than printed by the
 * container, and that is the point: the container is the thing being
 * diagnosed. A banner a crashed container never got far enough to print is a
 * banner missing from exactly the log anyone is reading. The container prints
 * its own line too (`cloud/sandbox/worker.sh`), which is corroboration, not
 * the record.
 */
export function traceBanner(input: {
  trace_id: string;
  run_id: string;
  tick_id: string;
  epic: string;
}): string {
  return (
    `ticks-trace: ${input.trace_id} run=${input.run_id} ` +
    `epic=${input.epic} tick=${input.tick_id}\n`
  );
}

/** The marker `traceBanner` heads its line with, and what a reader greps for. */
export const TRACE_BANNER_MARKER = "ticks-trace:";
