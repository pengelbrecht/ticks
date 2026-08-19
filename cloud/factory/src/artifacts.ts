/**
 * Run artifacts in R2 — the tree the Pi extension already writes locally,
 * adopted wholesale as the cloud schema (D20):
 *
 *     runs/<project>/<run_id>/
 *       run.json
 *       artifacts/orchestrator/harness/<attempt>/<seq>.log
 *       artifacts/orchestrator/harness.log
 *       artifacts/orchestrator/reconcile/<attempt>.json
 *       artifacts/<tick_id>/...            (worker artifacts, Phase 2)
 *
 * **Written during the run, never exported at exit.** A crashed sandbox is the
 * case that matters: its logs are the only evidence of what it was doing, and a
 * log that ships at exit is a log a crash deletes. R2 has no append, so the
 * stream is a sequence of immutable segment objects — each flush is one PUT
 * that cannot corrupt what came before, and a reader concatenates the prefix in
 * key order. `harness.log` is written at finalize as a convenience for whoever
 * wants one object; it is a copy of the segments, never their source of truth.
 *
 * Segment keys are zero-padded because R2 lists lexicographically: `10.log`
 * sorting before `9.log` would silently reorder a log file.
 */

/** Widths chosen so lexicographic order is numeric order for any real run. */
const SEQ_WIDTH = 6;
const ATTEMPT_WIDTH = 3;

const pad = (value: number, width: number): string => String(value).padStart(width, "0");

/** Everything about one run lives under this prefix. */
export function runPrefix(project: string, runID: string): string {
  return `runs/${project}/${runID}/`;
}

export function runRecordKey(project: string, runID: string): string {
  return `${runPrefix(project, runID)}run.json`;
}

/** The orchestrator's own artifacts. Worker ticks get their own `<tick_id>/`. */
export function orchestratorPrefix(project: string, runID: string): string {
  return `${runPrefix(project, runID)}artifacts/orchestrator/`;
}

export function harnessStreamPrefix(project: string, runID: string): string {
  return `${orchestratorPrefix(project, runID)}harness/`;
}

export function harnessSegmentKey(
  project: string,
  runID: string,
  attempt: number,
  seq: number
): string {
  return `${harnessStreamPrefix(project, runID)}${pad(attempt, ATTEMPT_WIDTH)}/${pad(seq, SEQ_WIDTH)}.log`;
}

export function harnessLogKey(project: string, runID: string): string {
  return `${orchestratorPrefix(project, runID)}harness.log`;
}

export function reconcileKey(project: string, runID: string, attempt: number): string {
  return `${orchestratorPrefix(project, runID)}reconcile/${pad(attempt, ATTEMPT_WIDTH)}.json`;
}

/**
 * The run's own record — what was submitted, and how it ended.
 *
 * It is written at the start as well as at the end so a run whose Workflow is
 * lost entirely still identifies itself in R2. `ended_at`/`outcome` are absent
 * until finalize.
 */
export type RunRecord = {
  run_id: string;
  project: string;
  epic: string;
  base_sha: string;
  requested_by: string;
  notify?: string;
  started_at: string;
  state: string;
  ended_at?: string;
  cost_usd?: number;
  /** Why the run ended the way it did — the stop reason, or the failure. */
  detail?: string;
  /** How many orchestrator sandboxes this run went through. */
  attempts?: number;
};

export async function writeRunRecord(bucket: R2Bucket, record: RunRecord): Promise<void> {
  await bucket.put(runRecordKey(record.project, record.run_id), JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}

export async function readRunRecord(
  bucket: R2Bucket,
  project: string,
  runID: string
): Promise<RunRecord | null> {
  const object = await bucket.get(runRecordKey(project, runID));
  if (object === null) return null;
  return JSON.parse(await object.text()) as RunRecord;
}

/**
 * One flush of harness output.
 *
 * Empty text writes nothing: a poll that saw no output must not litter the
 * stream with empty objects, and the sequence number only advances when
 * something was actually written, so segment N always holds bytes.
 */
export async function writeHarnessSegment(
  bucket: R2Bucket,
  project: string,
  runID: string,
  attempt: number,
  seq: number,
  text: string
): Promise<boolean> {
  if (text === "") return false;
  await bucket.put(harnessSegmentKey(project, runID, attempt, seq), text, {
    httpMetadata: { contentType: "text/plain; charset=utf-8" },
  });
  return true;
}

/**
 * The harness output written so far, in order.
 *
 * Readable *while the run is going* — that is the whole reason the stream is
 * segments rather than one rewritten object — and it is what `tk factory trace`
 * tails. Listing is paged so a long run does not silently truncate.
 */
export async function readHarnessOutput(
  bucket: R2Bucket,
  project: string,
  runID: string
): Promise<string> {
  const prefix = harnessStreamPrefix(project, runID);
  const keys: string[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page: R2Objects = await bucket.list({ prefix, ...(cursor === undefined ? {} : { cursor }) });
    keys.push(...page.objects.map((object) => object.key));
    if (!page.truncated) break;
    cursor = page.cursor;
  }
  keys.sort();

  const chunks: string[] = [];
  for (const key of keys) {
    const object = await bucket.get(key);
    if (object !== null) chunks.push(await object.text());
  }
  return chunks.join("");
}

/**
 * Collapses the segment stream into one `harness.log`.
 *
 * Best effort and deliberately last: the segments are the durable record, so a
 * failure here costs a convenience object, never the diagnostics.
 */
export async function writeCombinedHarnessLog(
  bucket: R2Bucket,
  project: string,
  runID: string
): Promise<void> {
  const text = await readHarnessOutput(bucket, project, runID);
  if (text === "") return;
  await bucket.put(harnessLogKey(project, runID), text, {
    httpMetadata: { contentType: "text/plain; charset=utf-8" },
  });
}

/** One orchestrator reboot: why the previous sandbox stopped being useful. */
export type ReconcileRecord = {
  run_id: string;
  attempt: number;
  at: string;
  /** What the dead sandbox's process looked like when it was written off. */
  previous: { state: string; exit_code: number | null };
  detail: string;
};

export async function writeReconcileRecord(
  bucket: R2Bucket,
  project: string,
  record: ReconcileRecord
): Promise<void> {
  await bucket.put(
    reconcileKey(project, record.run_id, record.attempt),
    JSON.stringify(record, null, 2),
    { httpMetadata: { contentType: "application/json" } }
  );
}
