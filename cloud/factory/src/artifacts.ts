/**
 * Run artifacts in R2 — the tree the Pi extension already writes locally,
 * adopted wholesale as the cloud schema (D20):
 *
 *     runs/<project>/<run_id>/
 *       run.json
 *       artifacts/orchestrator/harness/<attempt>/<seq>.log
 *       artifacts/orchestrator/harness.log
 *       artifacts/orchestrator/reconcile/<attempt>.json
 *       artifacts/<tick_id>/manifest.json   (what was dispatched — src/reconcile.ts)
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
  /**
   * Where `cost_usd` came from: `gateway` when AI Gateway telemetry answered,
   * `unavailable` with the reason when it could not be read (D17). Stated
   * rather than implied, because a zero that means "nothing was spent" and a
   * zero that means "nobody could tell" are different facts about a run.
   */
  cost_source?: string;
  /** Why the run ended the way it did — the stop reason, or the failure. */
  detail?: string;
  /**
   * What the durable layer said: `advanced`, `none`, or `unknown` (tick ehy).
   *
   * The state says how the run ended; this says whether anything happened. A
   * harness that exits 0 having pushed nothing is a run that STOPPED, and this
   * field is the evidence that verdict was reached from — never the exit code.
   */
  progress?: string;
  /** Which branches moved, or why the remote could not be read. */
  progress_detail?: string;
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

/**
 * How much harness output one `tk cloud logs` read returns, in bytes.
 *
 * A long run's stream is unbounded and this Worker has to hold what it sends in
 * memory, so a read is bounded — and it is bounded from the END, because the
 * tail is what a run being debugged is read for. The bound is reported (see
 * `HarnessOutput.truncated`), never silent: a log that quietly starts partway
 * through reads as a run that started partway through.
 */
export const HARNESS_TAIL_MAX_BYTES = 1_048_576;

export type HarnessOutput = {
  /** The output, oldest first, ending at the most recent flush. */
  text: string;
  /** Bytes of the stream this read returned. */
  bytes: number;
  /** Bytes the stream holds in total. */
  total_bytes: number;
  /** True when `text` starts partway through the stream. */
  truncated: boolean;
};

/**
 * The tail of a run's harness output, with what it left out stated.
 *
 * Readable *while the run is going* — that is the whole reason the stream is
 * segments rather than one rewritten object. Segments are taken whole from the
 * newest backwards until the budget is spent, so the boundary always falls
 * between two flushes rather than mid-line, and the last segment is always
 * included even when it alone is over budget.
 */
export async function readHarnessTail(
  bucket: R2Bucket,
  project: string,
  runID: string,
  maxBytes: number = HARNESS_TAIL_MAX_BYTES
): Promise<HarnessOutput> {
  const prefix = harnessStreamPrefix(project, runID);
  const objects: { key: string; size: number }[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page: R2Objects = await bucket.list({
      prefix,
      ...(cursor === undefined ? {} : { cursor }),
    });
    objects.push(...page.objects.map((object) => ({ key: object.key, size: object.size })));
    if (!page.truncated) break;
    cursor = page.cursor;
  }
  objects.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const total = objects.reduce((sum, object) => sum + object.size, 0);
  if (objects.length === 0) return { text: "", bytes: 0, total_bytes: 0, truncated: false };

  let first = objects.length - 1;
  let budget = Math.max(1, maxBytes) - objects[first]!.size;
  while (first > 0 && budget - objects[first - 1]!.size >= 0) {
    first -= 1;
    budget -= objects[first]!.size;
  }

  const chunks: string[] = [];
  let bytes = 0;
  for (const object of objects.slice(first)) {
    const stored = await bucket.get(object.key);
    if (stored === null) continue;
    chunks.push(await stored.text());
    bytes += object.size;
  }
  return { text: chunks.join(""), bytes, total_bytes: total, truncated: first > 0 };
}

// -------------------------------------------------------- worker manifests ---

/**
 * One dispatched tick's manifest — the FIRST evidence source of the reconcile
 * protocol (src/reconcile.ts), and the reason its documented order starts with
 * manifests rather than with git or with the live sandbox list.
 *
 * It is written to R2 BEFORE the tick's container is addressed, and addressing
 * a container is what provisions it on this substrate. So "no manifest" is a
 * durable, positive statement that no container was ever booted for this tick
 * — which is exactly what a replacement supervisor needs before it may boot
 * one. A manifest written after the boot would make the absent case
 * ambiguous, and an ambiguous absence is how a live worker gets a second
 * container.
 *
 * It lives under the run's own `artifacts/<tick_id>/` folder, the tree this
 * module's header reserves for worker artifacts, so a run's whole durable
 * story is one prefix.
 */
export type WorkerManifest = {
  run_id: string;
  epic: string;
  tick_id: string;
  /** The container this tick is addressed by — `workerSandboxName(run, tick)`. */
  sandbox_name: string;
  /** `tick/<epic>/<tick>` — what collect reads and what a redispatch continues. */
  branch: string;
  base_sha: string;
  /** Which batch of the wave dispatched it, 1-based. */
  batch: number;
  dispatched_at: string;
  /**
   * The work process, once one was started. Absent is NOT "nothing is
   * running": the live process list settles that, and this is only ever a
   * convenience for a reader that wants to name the process a manifest
   * expected.
   */
  process_id?: string;
  /** Set when a later attempt adopted a container this manifest already booted. */
  adopted_at?: string;
  /**
   * Set when this dispatch attempt's green-start probe failed — the only
   * place `ProbeOutcome.output` survives the Workflow step that produced it
   * (tick ys3).
   *
   * Before this field existed a failed probe was unexplainable after the
   * fact: the container was torn down, its terminal output went nowhere, and
   * the only way to learn what `ticks-worker --probe` actually printed was to
   * re-run the wave and read a `wrangler tail` that (as observed on
   * 2026-08-22) does not even capture Workflow console output. `reason` and
   * `output` are `ProbeOutcome`'s own fields, carried here as plain strings
   * so this module does not need to import `worker-dispatch.ts`'s type.
   */
  probe_failure?: {
    reason: string;
    detail: string;
    output: string;
    at: string;
  };
};

export function workerManifestKey(project: string, runID: string, tickID: string): string {
  return `${runPrefix(project, runID)}artifacts/${tickID}/manifest.json`;
}

/** The suffix `listWorkerManifests` recognises a manifest by. */
const MANIFEST_SUFFIX = "/manifest.json";

export async function writeWorkerManifest(
  bucket: R2Bucket,
  project: string,
  manifest: WorkerManifest
): Promise<void> {
  await bucket.put(
    workerManifestKey(project, manifest.run_id, manifest.tick_id),
    JSON.stringify(manifest, null, 2),
    { httpMetadata: { contentType: "application/json" } }
  );
}

export async function readWorkerManifest(
  bucket: R2Bucket,
  project: string,
  runID: string,
  tickID: string
): Promise<WorkerManifest | null> {
  const object = await bucket.get(workerManifestKey(project, runID, tickID));
  if (object === null) return null;
  return JSON.parse(await object.text()) as WorkerManifest;
}

/**
 * Every manifest this run has written, in tick order.
 *
 * Paged to exhaustion rather than to a fixed number of looks: a listing that
 * stops early reads as a run that dispatched fewer ticks than it did, and
 * "fewer ticks were dispatched" is the exact false statement that makes a
 * reconcile boot a second container (.tick/learnings.md, "Never default a
 * pagination bound to a permissive value").
 */
export async function listWorkerManifests(
  bucket: R2Bucket,
  project: string,
  runID: string
): Promise<WorkerManifest[]> {
  const prefix = `${runPrefix(project, runID)}artifacts/`;
  const manifests: WorkerManifest[] = [];
  let cursor: string | undefined;
  for (;;) {
    const listed = await bucket.list(cursor === undefined ? { prefix } : { prefix, cursor });
    for (const object of listed.objects) {
      if (!object.key.endsWith(MANIFEST_SUFFIX)) continue;
      const body = await bucket.get(object.key);
      if (body === null) continue;
      manifests.push(JSON.parse(await body.text()) as WorkerManifest);
    }
    if (!listed.truncated) break;
    cursor = listed.cursor;
  }
  manifests.sort((a, b) => a.tick_id.localeCompare(b.tick_id));
  return manifests;
}
