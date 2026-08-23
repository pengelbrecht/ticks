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
 *       artifacts/<tick_id>/harness/<epoch>/<seq>.log  (that container's own output)
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

import type { WorkerLogSink } from "./worker-dispatch";

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
  /**
   * The trace id joining this run to the message that caused it (D20, tick
   * hyi). Absent for a run that belongs to no traced chain.
   */
  trace_id?: string;
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
  return readStreamTail(bucket, harnessStreamPrefix(project, runID), maxBytes);
}

/**
 * Every object under one segment prefix, paged to exhaustion and in key order.
 *
 * Paged to exhaustion rather than to a fixed number of looks, for the reason
 * `.tick/learnings.md` states about pagination bounds: a listing that stops
 * early reads as a stream that ends early, and a log that quietly ends early
 * is the exact false statement a log is read to avoid.
 */
async function listSegments(
  bucket: R2Bucket,
  prefix: string
): Promise<{ key: string; size: number }[]> {
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
  return objects;
}

/**
 * The tail of ONE segment stream, whichever container wrote it.
 *
 * Shared by the orchestrator's stream and by every worker container's own
 * (tick 0fg): the two are the same kind of record at two places in the tree,
 * and a second copy of this logic is a second place for the bound to be
 * reported wrongly.
 */
async function readStreamTail(
  bucket: R2Bucket,
  prefix: string,
  maxBytes: number
): Promise<HarnessOutput> {
  const objects = await listSegments(bucket, prefix);

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
  /**
   * The trace id this container is working under (tick hyi).
   *
   * On the manifest as well as in the container's log banner because the two
   * answer different questions: the banner says what the container printed,
   * the manifest says what the control plane DISPATCHED. A container that
   * never printed anything still has a manifest, and that manifest still names
   * the chain — which is precisely the case Phase 2 could not diagnose.
   */
  trace_id?: string;
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

/**
 * Every outcome `dispatchWave` returned for one batch, verbatim.
 *
 * Written at the RETURN SITE rather than inside any branch of `spawnWorker`,
 * because two attempts to explain a failing wave (tick `ys3`) each
 * instrumented a path the live failure did not take, and seven live runs
 * produced no diagnosis as a result. Whatever path an outcome came from, it is
 * in the array this records — so this cannot miss the way a branch can.
 *
 * Best-effort by construction: a wave must not fail because its telemetry
 * could not be written.
 */
export function waveOutcomesKey(project: string, runID: string, batch: number): string {
  return `${runPrefix(project, runID)}artifacts/wave/${String(batch).padStart(3, "0")}.json`;
}

export async function writeWaveOutcomes(
  bucket: R2Bucket,
  project: string,
  runID: string,
  batch: number,
  outcomes: unknown
): Promise<void> {
  await bucket.put(
    waveOutcomesKey(project, runID, batch),
    JSON.stringify({ run_id: runID, batch, at: new Date().toISOString(), outcomes }, null, 2),
    { httpMetadata: { contentType: "application/json" } }
  );
}

/**
 * A wave the run's own orchestrator asked for, from inside its container
 * (tick wiy).
 *
 * This is the handshake that makes every wave of a multi-wave epic fan out
 * into containers rather than only the first. Readiness is computed in Go,
 * where `wave.Compute` already lives and is already tested, by the
 * orchestrator standing on the merged run branch — the only party that knows
 * what wave 1 actually landed. It cannot boot containers itself (only the
 * Worker holds the `SANDBOXES` binding), so it records what it wants here and
 * the Workflow dispatches it through the same checkpointed, budget-enforced,
 * stop-enforced path the first wave takes.
 *
 * Keyed by PASS, not overwritten in place. A Workflow step that completes is
 * checkpointed and never runs again, but the R2 object beside it has no
 * version: a step that read "the wave request" by a fixed name could, on
 * replay, read a LATER pass's request and dispatch it twice. The pass number
 * is in the key, so a replay reads the object it read the first time.
 */
export type WaveRequest = {
  run_id: string;
  epic: string;
  /** Which orchestrator pass asked. Wave 1 (the submitted one) is pass 0. */
  pass: number;
  /**
   * The commit the wave's containers clone at.
   *
   * Emphatically not the run's submitted base: a wave-2 worker must stand on
   * wave 1's merged work or it will implement a tick against a tree its
   * dependencies never landed in. This is the run branch's head as the
   * orchestrator pushed it.
   */
  base_sha: string;
  tick_ids: string[];
  requested_at: string;
};

export function waveRequestKey(project: string, runID: string, pass: number): string {
  return `${runPrefix(project, runID)}artifacts/wave-request/${String(pass).padStart(3, "0")}.json`;
}

export async function writeWaveRequest(
  bucket: R2Bucket,
  project: string,
  request: WaveRequest
): Promise<void> {
  await bucket.put(
    waveRequestKey(project, request.run_id, request.pass),
    JSON.stringify(request, null, 2),
    { httpMetadata: { contentType: "application/json" } }
  );
}

/**
 * The wave requested by one pass, or null if that pass asked for none.
 *
 * "None" is the normal way a cloud run ENDS: an orchestrator that finds no
 * ready tick left has finished the epic, and the absence of this object is how
 * it says so. So an unreadable bucket must not be mistaken for it — a read
 * that throws is propagated rather than folded into null, because a dispatch
 * loop that treats an R2 hiccup as "the epic is done" would drop the tail of
 * every epic it happened to.
 */
export async function readWaveRequest(
  bucket: R2Bucket,
  project: string,
  runID: string,
  pass: number
): Promise<WaveRequest | null> {
  const object = await bucket.get(waveRequestKey(project, runID, pass));
  if (object === null) return null;
  return (await object.json()) as WaveRequest;
}

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

// ------------------------------------------------ worker container logs ---

/**
 * What one worker container printed — its own stdout and stderr, per tick
 * (tick 0fg).
 *
 * `tk cloud logs <run>` served the ORCHESTRATOR sandbox's stream and nothing
 * else, so a worker container that booted, ran `cloud/sandbox/worker.sh` and
 * died on `die $EXIT_MODEL` left a message naming the exact gateway route and
 * HTTP body — and that message went nowhere durable. Diagnosing that cost
 * seven paid runs. This is the container's TEXT; `WorkerManifest` (and its
 * `probe_failure`) is the dispatch OUTCOME. Two records, two questions.
 *
 * ONE STREAM PER (RUN, TICK), never the orchestrator's single key: a wave runs
 * its containers concurrently, and one shared stream would interleave them
 * into nonsense. It lives beside the tick's manifest, under the
 * `artifacts/<tick_id>/` folder this module's header already reserves for
 * worker artifacts, and it is written the same way the orchestrator's is —
 * continuously, as immutable segments, never exported at exit. The exit is the
 * thing being diagnosed, so an export-at-exit design cannot answer it.
 */
export function workerLogStreamPrefix(project: string, runID: string, tickID: string): string {
  return `${runPrefix(project, runID)}artifacts/${tickID}/harness/`;
}

/** The folder under `artifacts/` that is the orchestrator's, not a tick's. */
const ORCHESTRATOR_DIR = "orchestrator";

/** The path component a stream's segments live under, for both roles. */
const STREAM_DIR = "harness";

/**
 * Milliseconds since the epoch are 13 digits until the year 2286 — wide enough
 * that a fixed pad keeps lexicographic order numeric, which is what makes
 * attempt N+1's segments sort after attempt N's.
 */
const EPOCH_WIDTH = 13;

/**
 * One segment of one worker container's output.
 *
 * `epoch` plays the part `attempt` plays for the orchestrator: it separates
 * what one supervisor wrote from what its replacement wrote. It is a
 * wall-clock stamp rather than a counter because no counter survives a
 * Workflow step boundary — a retried dispatch step starts a fresh sequence at
 * 1, and without the epoch it would PUT straight over the segments of the
 * attempt whose failure is the reason anyone is reading (`.tick/learnings.md`:
 * a crashed attempt's diagnostics are the ones that matter).
 */
export function workerLogSegmentKey(
  project: string,
  runID: string,
  tickID: string,
  epoch: number,
  seq: number
): string {
  return (
    `${workerLogStreamPrefix(project, runID, tickID)}` +
    `${pad(epoch, EPOCH_WIDTH)}/${pad(seq, SEQ_WIDTH)}.log`
  );
}

/**
 * The epoch reserved for the control plane's own header segment.
 *
 * Zero, so it sorts before every real epoch (a wall-clock stamp is 13 digits
 * and never zero), and therefore before every byte the container itself ever
 * writes. A reader concatenating the prefix in key order gets the banner
 * first, whichever supervisor attempt wrote the rest.
 */
export const CONTROL_PLANE_LOG_EPOCH = 0;

/**
 * Heads one worker container's log stream with its trace id, before the
 * container is addressed (tick hyi).
 *
 * WRITTEN BY THE CONTROL PLANE, NOT PRINTED BY THE CONTAINER, and that is the
 * whole design. The container is the thing being diagnosed: a container that
 * dies in its image pull, or is refused by its probe, or hangs before its
 * first `say`, prints nothing at all — and those are exactly the containers
 * anyone reads a log for. A banner that depends on the container getting far
 * enough to print it is missing from every log that matters. The container
 * prints its own line too (`cloud/sandbox/worker.sh`), which corroborates this
 * one rather than replacing it.
 *
 * Best effort by construction, like every other write in this module that a
 * dispatch awaits: a log header that could not be stored must never be the
 * reason a wave does not run.
 */
export async function writeWorkerLogHeader(
  bucket: R2Bucket,
  project: string,
  runID: string,
  tickID: string,
  banner: string
): Promise<boolean> {
  if (banner === "") return false;
  await bucket.put(
    workerLogSegmentKey(project, runID, tickID, CONTROL_PLANE_LOG_EPOCH, 0),
    banner,
    { httpMetadata: { contentType: "text/plain; charset=utf-8" } }
  );
  return true;
}

/** One flush of a worker container's output. Empty text writes nothing. */
export async function writeWorkerLogSegment(
  bucket: R2Bucket,
  project: string,
  runID: string,
  tickID: string,
  epoch: number,
  seq: number,
  text: string
): Promise<boolean> {
  if (text === "") return false;
  await bucket.put(workerLogSegmentKey(project, runID, tickID, epoch, seq), text, {
    httpMetadata: { contentType: "text/plain; charset=utf-8" },
  });
  return true;
}

/** The tail of one worker container's output, with what it left out stated. */
export async function readWorkerLogTail(
  bucket: R2Bucket,
  project: string,
  runID: string,
  tickID: string,
  maxBytes: number = HARNESS_TAIL_MAX_BYTES
): Promise<HarnessOutput> {
  return readStreamTail(bucket, workerLogStreamPrefix(project, runID, tickID), maxBytes);
}

/** One tick's stream, as the default `tk cloud logs` read names it. */
export type WorkerLogStream = {
  tick_id: string;
  bytes: number;
  segments: number;
};

/**
 * Which worker streams a run has, in tick order.
 *
 * This is what makes `--tick` discoverable: an operator reading a failed wave
 * does not know which containers got far enough to print, and a flag whose
 * valid values are unlisted is a flag nobody uses. The orchestrator's own
 * stream is skipped rather than reported as a tick — it sits under the same
 * `harness/` name one level over, and calling it a tick would invent a tick
 * id that no board, manifest or branch has ever heard of.
 */
export async function listWorkerLogStreams(
  bucket: R2Bucket,
  project: string,
  runID: string
): Promise<WorkerLogStream[]> {
  const prefix = `${runPrefix(project, runID)}artifacts/`;
  const byTick = new Map<string, WorkerLogStream>();
  for (const object of await listSegments(bucket, prefix)) {
    const rest = object.key.slice(prefix.length).split("/");
    // <tick_id>/harness/<epoch>/<seq>.log
    if (rest.length !== 4 || rest[1] !== STREAM_DIR) continue;
    const tickID = rest[0]!;
    if (tickID === ORCHESTRATOR_DIR) continue;
    const seen = byTick.get(tickID);
    if (seen === undefined) byTick.set(tickID, { tick_id: tickID, bytes: object.size, segments: 1 });
    else {
      seen.bytes += object.size;
      seen.segments += 1;
    }
  }
  return [...byTick.values()].sort((a, b) => a.tick_id.localeCompare(b.tick_id));
}

/**
 * The sink a live wave streams its containers' output through.
 *
 * The sequence counter is per tick and lives in this closure, SHARED by every
 * writer `forTick` hands out: a wave's spawn and its wait each bind their own
 * writer for the same container, and two counters would mean two writers
 * PUTting `000001.log` over each other. One epoch per sink, taken once at
 * construction, so everything one supervisor writes for one wave sorts
 * together and after whatever an earlier supervisor left.
 */
export function workerLogSink(
  bucket: R2Bucket,
  project: string,
  runID: string,
  epoch: number = Date.now()
): WorkerLogSink {
  const seq = new Map<string, number>();
  return {
    forTick(tickID: string) {
      return async (text: string): Promise<void> => {
        const next = (seq.get(tickID) ?? 0) + 1;
        const wrote = await writeWorkerLogSegment(
          bucket,
          project,
          runID,
          tickID,
          epoch,
          next,
          text
        );
        // Only a flush that actually wrote bytes advances the sequence, so
        // segment N always holds something — the rule `writeHarnessSegment`
        // already keeps for the orchestrator's stream.
        if (wrote) seq.set(tickID, next);
      };
    },
  };
}
