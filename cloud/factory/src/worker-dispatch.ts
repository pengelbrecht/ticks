/**
 * Per-tick worker sandboxes — one container per tick (tick 0ds).
 *
 * Phase 1 boots ONE orchestrator sandbox that runs the skill loop with
 * harness-native subagents inside it. This module is the Phase 2 mechanism:
 * given a wave of ticks, boot one sandbox per tick, run it, and read back
 * only what survived in git — never sandbox terminal output
 * (`worker-collect.ts`). It reuses the `SandboxBinding`/`OrchestratorSandbox`
 * seam `sandbox.ts` already declares for the orchestrator container: nothing
 * about that seam is orchestrator-specific, and a worker is "one container"
 * in exactly the same sense.
 *
 * `docs/design/cloud-factory.md` ("Worker agents") states three spawn-time
 * defences the herd substrate documents and requires them "implemented, not
 * assumed" here. Each has one function below:
 *
 *  - GREEN-START TRAP ({@link spawnWorker}'s probe stage, `watchProbe`,
 *    `evaluateProbeOutput`): a container that starts cleanly and does
 *    nothing is caught by running trivial work FIRST and checking its
 *    CONTENT — not its exit code (an `npx` probe that prints npm's own
 *    version exits 0; see `.tick/learnings.md`, "Cross-language parity,
 *    parsers and formats") — before any real work is dispatched. A probe
 *    that fails this check means the sandbox is never counted as launched.
 *  - CONFIRMED DISPATCH ({@link confirmDispatch}): after the real command
 *    starts, wait for evidence it is actually doing something — a running
 *    state plus produced output, or a terminal state reached quickly enough
 *    that a trivial tick finished before "running" was ever sampled — rather
 *    than trusting that starting the process was accepted.
 *  - EXPIRING LIVENESS ({@link teardownWorker}, {@link checkLiveness}): the
 *    liveness check that decides whether to kill a process happens
 *    immediately before the kill, never reused from an earlier observation
 *    the sandbox could have outlived in the meantime.
 *
 * `dispatchWave` is what proves "a wave of N ticks runs in N containers
 * concurrently": every tick's spawn → wait → collect → teardown cycle runs
 * independently, fanned out with `Promise.all`, exactly as `tk herd spawn`
 * fires every worker of a wave before any wait begins.
 *
 * Not this module's job: what a worker sandbox's entrypoint actually runs —
 * `command`/`env` here are supplied by the caller, the same way
 * `run-workflow.ts` never invents `ORCHESTRATOR_COMMAND`'s behaviour, only
 * the fact of running it. See RESULT-0ds.md for what that leaves open.
 */

import type {
  OrchestratorSandbox,
  SandboxBinding,
  SandboxOutput,
  SandboxProcessState,
} from "./sandbox";
import type { WorkerCollector, WorkerReport, WorkerTask } from "./worker-collect";

// ------------------------------------------------------------- the timing ---

/**
 * The measured cold start of the orchestrator sandbox, in ms.
 *
 * Not a guess: `benchmarks/sandbox-start/2026-08-21-docker-amd64.json` records
 * `modes.cold.median_total_s = 93.24`, of which 71.9s is the image pull
 * (tick `kuf`). `internal/sandbox/benchmark_test.go` pins the budgets below
 * against that artifact so the two cannot drift apart again.
 */
export const COLD_START_BENCHMARK_MS = 93_240;

/**
 * Per-sandbox slowdown at the widest wave the deployment allows.
 *
 * `fanout_degradation_vs_n1` in the same artifact: 1.00x / 2.22x / 3.74x at
 * N=1/3/5, all of it in dependency install. A probe budget sized for a lone
 * container is not a budget for the fifth container of a wave.
 */
export const FANOUT_DEGRADATION_FACTOR = 3.74;

/**
 * The same artifact's degradation curve, by wave width.
 *
 * {@link FANOUT_DEGRADATION_FACTOR} is the WIDEST point of this curve, and
 * sizing every deployment's probe by it is what pushed a green-start probe and
 * a dispatch confirm to 598s of the 600s a Workflow step may execute for
 * (tick 2xm, src/workflow-limits.ts). A deployment that runs three containers
 * at a time paid the five-container penalty for nothing.
 *
 * Read by {@link probeTimeoutMs}: measured points, linear between them, and
 * the widest measured factor beyond the last one — never extrapolated past
 * what the benchmark actually recorded.
 */
export const FANOUT_DEGRADATION: ReadonlyArray<{ width: number; factor: number }> = [
  { width: 1, factor: 1.0 },
  { width: 3, factor: 2.22 },
  { width: 5, factor: FANOUT_DEGRADATION_FACTOR },
];

/**
 * How long a worker container has to answer its probe, at a given wave width.
 *
 * Same derivation as {@link DEFAULT_PROBE_TIMEOUT_MS} — a measured cold start,
 * degraded for fan-out, plus 20% headroom — but degraded for THIS wave's
 * width rather than for the widest wave anyone has measured.
 */
export function probeTimeoutMs(width: number): number {
  const clean = Number.isFinite(width) && width >= 1 ? width : 1;
  const last = FANOUT_DEGRADATION[FANOUT_DEGRADATION.length - 1]!;
  let factor = last.factor;
  for (let i = 0; i < FANOUT_DEGRADATION.length; i++) {
    const point = FANOUT_DEGRADATION[i]!;
    if (clean <= point.width) {
      const previous = FANOUT_DEGRADATION[i - 1];
      if (previous === undefined) {
        factor = point.factor;
      } else {
        const span = point.width - previous.width;
        const along = (clean - previous.width) / span;
        factor = previous.factor + (point.factor - previous.factor) * along;
      }
      break;
    }
  }
  return Math.ceil(COLD_START_BENCHMARK_MS * factor * 1.2);
}

/**
 * How long a worker container has to answer its probe.
 *
 * This was 30s, and every cold container in the first real wave was written
 * off before it could boot: `run_1ce4fae5` dispatched three workers at
 * 06:38:49 and reconcile classified 3 of 3 as never-dispatched at 06:39:13 —
 * 21 seconds, against a 93.24s measured cold start. The number looked generous
 * because the suite probes `FakeSandboxes`, which answers instantly; against a
 * real Cloudflare Sandbox pulling a 1.1 GB compressed image it could never be
 * met (tick `7go`).
 *
 * Derived rather than rounded: a cold start, degraded by the widest fan-out,
 * plus headroom — because the cost of waiting too long is a slow wave, and the
 * cost of not waiting long enough is declaring healthy containers dead.
 */
export const DEFAULT_PROBE_TIMEOUT_MS = Math.ceil(
  COLD_START_BENCHMARK_MS * FANOUT_DEGRADATION_FACTOR * 1.2
);
export const DEFAULT_PROBE_POLL_MS = 2_000;
/**
 * Confirming real work starts happens on an already-warm container — the probe
 * has answered by then — so this is sized for the work command's own startup,
 * not for a boot. Still generous against the old 60s: a clone at the epic base
 * plus a harness launch is not instant.
 */
export const DEFAULT_CONFIRM_TIMEOUT_MS = 180_000;
export const DEFAULT_CONFIRM_POLL_MS = 2_000;
/**
 * How long a caller who names no timeout watches one worker.
 *
 * Kept equal to `waveWaitTimeoutMs(DEFAULT_WORKER_HARNESS_BUDGET_MS)` in
 * worker-boot.ts — the measured 90-minute harness budget plus the push margin
 * — and pinned there by a guard test rather than imported, because
 * worker-boot.ts already takes its types from this module and a value import
 * back would close the cycle. It was thirty minutes, which is shorter than a
 * real tick takes (tick 5fg): a default that kills healthy work is worse than
 * no default at all, and `run-workflow.ts` now passes its own derived number
 * on every dispatch regardless.
 */
export const DEFAULT_WAIT_TIMEOUT_MS = 91 * 60_000;
export const DEFAULT_WAIT_POLL_MS = 15_000;

/** Injectable so a test drives the polling loops without real wall-clock time. */
export type Sleeper = (ms: number) => Promise<void>;

/** The Workers runtime's own delay primitive (global `scheduler`); every loop below defaults to it. */
export const defaultSleeper: Sleeper = (ms) => scheduler.wait(ms);

function excerpt(text: string, max = 200): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ------------------------------------------------------- the log stream ---

/**
 * Where one worker container's own stdout/stderr goes, one flush at a time.
 *
 * A seam rather than an R2 call, for the same reason `WorkerRecorder` and
 * `WorkerCollector` are seams: what is worth testing here is WHEN the drain
 * happens, not what storage it lands in. `artifacts.ts`'s `workerLogSink` is
 * the live implementation.
 */
export type WorkerLogWriter = (text: string) => Promise<void>;

export type WorkerLogSink = {
  /**
   * The writer for one tick's stream. Called more than once for the same tick
   * — spawn binds one, the wave's wait binds another — so an implementation
   * must SHARE whatever ordering state it keeps between them.
   */
  forTick(tickID: string): WorkerLogWriter;
};

/**
 * Reads whatever a container has printed since `offset` and flushes it.
 *
 * The read propagates: `spawnWorker` turns a probe read that throws into a
 * `probe-error` outcome, and swallowing it here would turn that into a silent
 * wait for a timeout. The WRITE never propagates — a wave must not fail
 * because its telemetry could not be written, the same rule `writeWaveOutcomes`
 * follows at the other end of the wave.
 */
async function drain(
  sandbox: OrchestratorSandbox,
  processID: string,
  offset: number,
  log: WorkerLogWriter | undefined
): Promise<SandboxOutput> {
  const chunk = await sandbox.readOutput(processID, offset);
  if (chunk.text !== "" && log !== undefined) {
    try {
      await log(chunk.text);
    } catch (error) {
      console.error(
        `factory worker-dispatch: could not stream a container's output: ${String(error)}`
      );
    }
  }
  return chunk;
}

// ------------------------------------------------- the cancellation seam ---

/**
 * Why a wave is being cancelled while it is still in flight.
 *
 * `reason` is machine-readable and is what a credential revocation is
 * recorded under (`stopped:hard`, `budget:cost`, …); `detail` is what the
 * operator reads back.
 */
export type WaveCancellation = {
  reason: string;
  detail: string;
};

/** One look at whatever can cancel a wave — a stop record, a budget, a lease. */
export type CancelProbe = () => Promise<WaveCancellation | null>;

/**
 * How often a wave in flight looks for a reason to stop, by default.
 *
 * The same cadence `run-workflow.ts` watches an orchestrator on (`MIN_POLL_MS`):
 * the point of this seam is that noticing a hard stop costs one poll interval,
 * never one batch.
 */
export const DEFAULT_CANCEL_POLL_MS = 15_000;

/**
 * The seam a wave is interrupted through.
 *
 * ONE of these is shared by every worker in a wave, which is the whole design:
 * N containers polling independently would make N stop-record reads per
 * interval, and — worse — could disagree with each other about whether the run
 * is still allowed to spend. A latched answer means the first worker to see the
 * stop decides it for all of them.
 */
export type Canceller = {
  /**
   * The current answer. Makes at most one real read per `pollMs`, dedupes
   * concurrent readers onto one read, and latches: once a wave is cancelled it
   * stays cancelled, so nothing re-reads to ask permission to keep stopping.
   */
  check(): Promise<WaveCancellation | null>;
  /** What is already known, without making a read. */
  readonly cancelled: WaveCancellation | null;
  /** The read cadence; 0 means every call reads (what the tests drive). */
  readonly pollMs: number;
  /** Real reads made — a shared canceller keeps this near one per interval. */
  readonly reads: number;
};

export type CancellerOptions = {
  poll_ms?: number;
  /**
   * Run once, awaited, the instant the wave is first found cancelled — before
   * `check` answers and therefore before any worker starts tearing down.
   *
   * This is where the money dies. `.tick/learnings.md` ("Cost, budgets and kill
   * switches"): a hard stop must revoke BEFORE the window in which the run
   * would otherwise keep spending, not after it. Tearing a container down is
   * the stronger stop, but it is also the slower one, and a failure here must
   * not swallow the cancellation — it is logged, never thrown.
   */
  on_cancel?: (cancellation: WaveCancellation) => Promise<void>;
};

/**
 * Builds the shared canceller for one wave.
 *
 * A probe that throws is NOT a cancellation: an unreadable stop record is a
 * failed read, and the run keeps going exactly as `hardStopRecord` in
 * `run-workflow.ts` already decides ("a read failure is not a stop"). Fail-open
 * is right here and only here, because the between-batch check and the
 * per-observation check both still stand behind it.
 */
export function waveCanceller(probe: CancelProbe, opts: CancellerOptions = {}): Canceller {
  const pollMs = Math.max(opts.poll_ms ?? DEFAULT_CANCEL_POLL_MS, 0);
  let latched: WaveCancellation | null = null;
  let inflight: Promise<WaveCancellation | null> | null = null;
  let nextAt = 0;
  let reads = 0;

  async function read(): Promise<WaveCancellation | null> {
    reads += 1;
    let seen: WaveCancellation | null = null;
    try {
      seen = await probe();
    } catch (error) {
      console.error(`factory worker-dispatch: a wave's cancellation probe failed: ${String(error)}`);
      return null;
    }
    nextAt = Date.now() + pollMs;
    if (seen === null) return null;
    latched = seen;
    if (opts.on_cancel !== undefined) {
      try {
        await opts.on_cancel(seen);
      } catch (error) {
        console.error(
          `factory worker-dispatch: a wave's cancellation hook failed: ${String(error)}`
        );
      }
    }
    return seen;
  }

  return {
    async check(): Promise<WaveCancellation | null> {
      if (latched !== null) return latched;
      if (pollMs > 0 && Date.now() < nextAt) return null;
      if (inflight === null) {
        inflight = read().finally(() => {
          inflight = null;
        });
      }
      return inflight;
    },
    get cancelled(): WaveCancellation | null {
      return latched;
    },
    pollMs,
    get reads(): number {
      return reads;
    },
  };
}

/**
 * Sleeps, checking for cancellation on the CANCELLER's cadence rather than the
 * caller's.
 *
 * The two cadences are deliberately independent. A wait loop that polls a
 * container every fifteen minutes must not mean fifteen minutes before a hard
 * stop is noticed; a probe loop that polls every second must not mean a
 * stop-record read every second. Whichever is shorter decides how long a sleep
 * runs before the next look.
 */
async function sleepUnlessCancelled(
  ms: number,
  sleep: Sleeper,
  cancel: Canceller | undefined
): Promise<WaveCancellation | null> {
  if (cancel === undefined) {
    await sleep(ms);
    return null;
  }
  const total = Math.max(ms, 0);
  const chunk = cancel.pollMs > 0 ? Math.min(total, cancel.pollMs) : total;
  let waited = 0;
  for (;;) {
    const remaining = total - waited;
    const step = chunk > 0 ? Math.min(chunk, remaining) : remaining;
    await sleep(step);
    waited += step;
    const hit = await cancel.check();
    if (hit !== null) return hit;
    if (waited >= total) return null;
  }
}

// -------------------------------------------------------------- the probe ---

export type ProbeSpec = {
  command: string;
  env?: Record<string, string>;
  /**
   * The substring the probe's stdout must contain to count as a real round
   * trip — not merely nonempty output. An `npx` probe that prints npm's own
   * version, or a self-update banner swallowing the gate, both produce
   * plenty of output; neither produces the expected marker.
   */
  expect: string;
};

export type ProbeOutcome =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "no-output"
        | "wrong-output"
        | "process-gone"
        | "timeout"
        | "boot-timeout"
        | "cancelled"
        | "probe-error";
      detail: string;
      output: string;
    };

/**
 * Evaluates a finished probe's output against its expectation.
 *
 * Content only, deliberately never the exit code: "a version probe must
 * validate WHAT answered, not the exit code" (`.tick/learnings.md`) is the
 * green-start trap applied to CLI discovery, and it applies here unchanged —
 * a probe that exits 0 having printed the wrong thing is exactly the trap.
 */
export function evaluateProbeOutput(output: string, expect: string, exitCode: number | null): ProbeOutcome {
  if (output.includes(expect)) return { ok: true };
  const trimmed = output.trim();
  return {
    ok: false,
    reason: trimmed === "" ? "no-output" : "wrong-output",
    detail:
      trimmed === ""
        ? `the probe exited ${exitCode ?? "unknown"} and printed nothing`
        : `the probe exited ${exitCode ?? "unknown"} without producing ${JSON.stringify(expect)}: ${excerpt(trimmed)}`,
    output,
  };
}

async function watchProbe(
  sandbox: OrchestratorSandbox,
  processID: string,
  expect: string,
  opts: {
    timeoutMs: number;
    pollMs: number;
    sleep: Sleeper;
    cancel?: Canceller;
    log?: WorkerLogWriter;
  }
): Promise<ProbeOutcome> {
  const deadline = Date.now() + opts.timeoutMs;
  let output = "";
  let offset = 0;
  for (;;) {
    const chunk = await drain(sandbox, processID, offset, opts.log);
    output += chunk.text;
    offset = chunk.offset;
    const view = await sandbox.getProcess(processID);
    if (view === null) {
      return { ok: false, reason: "process-gone", detail: "the probe process vanished before it finished", output };
    }
    if (view.state === "completed" || view.state === "failed") {
      // One more read AFTER the terminal state was observed. A container can
      // print on its way out — `worker.sh`'s `die` message is exactly that —
      // and the read at the top of this iteration happened before the death
      // this state reports. Skipping it drops the one line worth having.
      const last = await drain(sandbox, processID, offset, opts.log);
      output += last.text;
      offset = last.offset;
      return evaluateProbeOutput(output, expect, view.exit_code);
    }
    if (Date.now() >= deadline) {
      // A probe that produced NOTHING is a container that never got far enough
      // to run it; a probe that produced something and stalled is a different
      // fault with a different next action. Collapsing them would hand an
      // operator "started cleanly and did nothing" for a container that was
      // still pulling its image, which is what tick 7go was (see
      // .tick/learnings.md on never collapsing distinct failure classes).
      const booted = output.length > 0;
      return {
        ok: false,
        reason: booted ? "timeout" : "boot-timeout",
        detail: booted
          ? `the probe produced output but had not finished after ${opts.timeoutMs}ms`
          : `the container produced nothing in ${opts.timeoutMs}ms, longer than the measured ` +
            `cold start of ${Math.round(COLD_START_BENCHMARK_MS / 1000)}s degraded for fan-out — ` +
            `it never reached its probe rather than failing one`,
        output,
      };
    }
    const cancelled = await sleepUnlessCancelled(opts.pollMs, opts.sleep, opts.cancel);
    if (cancelled !== null) {
      // The wave was stopped while this container was still proving itself:
      // it never gets to run real work, and it is never counted as launched.
      return { ok: false, reason: "cancelled", detail: cancelled.detail, output };
    }
  }
}

// --------------------------------------------------------- confirm dispatch ---

/**
 * `offset` is how far into the work process's output this confirm already
 * read. Handed on to `waitForWorker` so the wait resumes the cursor rather
 * than restarting it: the two loops stream the SAME process to the same R2
 * stream, and a wait that started at zero would write everything the confirm
 * already wrote a second time (tick 0fg).
 */
export type ConfirmOutcome =
  | { confirmed: true; detail: string; offset: number }
  | { confirmed: false; detail: string; cancelled?: WaveCancellation; offset: number };

/**
 * Waits for evidence the real command actually started doing something.
 *
 * Two things count as evidence: the process is `running` AND has produced
 * output, or the process already reached a terminal state — a trivial tick
 * can finish before "running" is ever sampled, and reaching a terminal state
 * is stronger evidence than "running" would have been (mirrors
 * `internal/herd/spawn`'s dispatch-confirm wait and its own comment on
 * exactly this race). Neither "the process exists" nor "state is running
 * with no output yet" counts — that is indistinguishable from a container
 * that started cleanly and is doing nothing.
 */
export async function confirmDispatch(
  sandbox: OrchestratorSandbox,
  processID: string,
  opts: {
    timeoutMs: number;
    pollMs: number;
    sleep?: Sleeper;
    cancel?: Canceller;
    log?: WorkerLogWriter;
  }
): Promise<ConfirmOutcome> {
  const sleep = opts.sleep ?? defaultSleeper;
  const deadline = Date.now() + opts.timeoutMs;
  let offset = 0;
  let sawOutput = false;
  for (;;) {
    const view = await sandbox.getProcess(processID);
    if (view === null) {
      return {
        confirmed: false,
        detail: "the worker process vanished before any evidence of it starting was observed",
        offset,
      };
    }
    if (view.state === "completed" || view.state === "failed") {
      // A tick trivial enough to finish inside the confirm window has already
      // said everything it is ever going to say, and this is the last chance
      // to keep it: nothing downstream waits on a process that is over.
      const last = await drain(sandbox, processID, offset, opts.log);
      offset = last.offset;
      return {
        confirmed: true,
        detail: `the worker reached a terminal state (${view.state}) before the confirm window closed`,
        offset,
      };
    }
    // Drained on EVERY look, not only until the first byte proves the dispatch:
    // the confirm window is up to three minutes of a real container's output,
    // and a stream that starts once confirm happens to stop looking is a
    // stream with a hole in it.
    const chunk = await drain(sandbox, processID, offset, opts.log);
    offset = chunk.offset;
    if (chunk.text !== "") sawOutput = true;
    if (view.state === "running" && sawOutput) {
      return { confirmed: true, detail: "the worker is running and has produced output", offset };
    }
    if (Date.now() >= deadline) {
      return {
        confirmed: false,
        detail: `no evidence the worker started within ${opts.timeoutMs}ms (state ${view.state})`,
        offset,
      };
    }
    const cancelled = await sleepUnlessCancelled(opts.pollMs, sleep, opts.cancel);
    if (cancelled !== null) {
      return {
        confirmed: false,
        detail: `the wave was cancelled before the worker's dispatch was confirmed: ${cancelled.detail}`,
        cancelled,
        offset,
      };
    }
  }
}

// ------------------------------------------------------------------ spawn ---

/**
 * How a container is asked to stop and push before it is destroyed (tick 7zk).
 *
 * `command` is the door WITHOUT its reason; the reason is appended here, from
 * the `WaveCancellation` that closed the wave, because only the dispatcher
 * knows it. `marker` is the string the container prints once the request is
 * lodged — the same content-not-exit-code rule the green-start probe follows,
 * applied to the other end of a container's life.
 */
export type SalvageSpec = {
  command: string;
  env?: Record<string, string>;
  marker?: string;
};

export type WorkSpec = {
  probe: ProbeSpec;
  command: string;
  env?: Record<string, string>;
  /**
   * Absent means this container cannot be asked to stop politely, and a
   * cancelled wave goes straight to `teardownWorker` exactly as it did before
   * this tick. Present is what turns a destroyed container into a pushed
   * branch (`salvageWorker`).
   */
  salvage?: SalvageSpec;
};

export type SpawnOptions = {
  probe_timeout_ms?: number;
  probe_poll_ms?: number;
  confirm_timeout_ms?: number;
  confirm_poll_ms?: number;
  sleep?: Sleeper;
  /** The wave's shared cancellation seam; absent means nothing can interrupt. */
  cancel?: Canceller;
  /** Where this dispatch is recorded durably, for a later reconcile (tick s7f). */
  record?: WorkerRecorder;
  /**
   * Where this container's own stdout/stderr is streamed as it appears (tick
   * 0fg). Absent means nothing is kept — which is what the exit-7 wave cost
   * seven paid runs to learn.
   */
  logs?: WorkerLogSink;
};

/**
 * The durable record of a dispatch — the manifest a reconcile reads first
 * (src/reconcile.ts).
 *
 * A seam rather than an R2 call, for the same reason `WorkerCollector` is one:
 * the ORDERING is the thing worth testing, and it is the whole point.
 * `dispatched` is awaited BEFORE the container is addressed, because
 * addressing one provisions it — so an absent manifest is a durable statement
 * that no container exists for that tick, which is what lets a replacement
 * supervisor boot one without risking a second worker.
 */
export type WorkerRecorder = {
  /** Called before `binding.get`. A failure here must abort the dispatch. */
  dispatched(task: WorkerTask, sandboxName: string): Promise<void>;
  /** Called as soon as the work process exists, before anything waits on it. */
  started(task: WorkerTask, sandboxName: string, processID: string): Promise<void>;
  /**
   * Called when the green-start probe fails, before `spawnWorker` returns.
   *
   * Optional, and best-effort by design (mirrors `started`): the fact that
   * this container is not launched is already carried in `SpawnResult` and
   * must reach the caller whether or not this succeeds. What it adds is
   * durability — `ProbeOutcome.output` otherwise lives only in this
   * function's stack and vanishes with the Workflow step, which is why a
   * failed probe used to be unexplainable after the fact (tick ys3).
   */
  probeFailed?(
    task: WorkerTask,
    sandboxName: string,
    probe: Extract<ProbeOutcome, { ok: false }>
  ): Promise<void>;
};

export type SpawnResult = {
  tick_id: string;
  sandbox_name: string;
  /** False when the green-start trap caught the sandbox: it is never counted as launched. */
  launched: boolean;
  probe: ProbeOutcome;
  confirm: ConfirmOutcome | null;
  /** The real work process id, present exactly when `launched` is true. */
  process_id: string | null;
  /**
   * How much of the work process's output has already been streamed, so the
   * wave's wait resumes the cursor instead of re-streaming it (tick 0fg).
   * Absent means nothing was streamed and the wait starts at the beginning.
   */
  output_offset?: number;
  /**
   * True when this outcome took over a worker that was ALREADY running rather
   * than starting one (tick s7f). No probe was run and no process was started;
   * the container was left exactly as the dead supervisor left it.
   */
  adopted: boolean;
  /** Set when the wave was cancelled during this spawn, or before it started. */
  cancelled: WaveCancellation | null;
  detail: string;
};

/**
 * Boots one sandbox, runs the green-start probe, and — only if it passes —
 * starts the real command and waits for confirmed dispatch.
 *
 * A failed probe tears nothing else down here; the caller (`dispatchWave`)
 * still runs collect and teardown for every task, launched or not, because a
 * probe failure is a fact about THIS attempt at the container, not about
 * whatever the branch already carries from an earlier one.
 */
export async function spawnWorker(
  binding: SandboxBinding,
  sandboxName: string,
  task: WorkerTask,
  spec: WorkSpec,
  opts: SpawnOptions = {}
): Promise<SpawnResult> {
  const sleep = opts.sleep ?? defaultSleeper;
  // Bound once for this container: every loop below streams the SAME tick's
  // stream, and the sink keeps this tick's ordering state behind it.
  const log = opts.logs?.forTick(task.tick_id);
  // The manifest lands BEFORE the container is addressed. `binding.get`
  // provisions on this substrate, so a crash in the other order would leave a
  // running container that no durable record names — and a reconcile reading
  // no manifest would correctly conclude nothing was dispatched and boot a
  // second one (src/reconcile.ts).
  await opts.record?.dispatched(task, sandboxName);
  const sandbox = await binding.get(sandboxName);

  let probe: ProbeOutcome;
  try {
    const probeStarted = await sandbox.startProcess(spec.probe.command, { env: spec.probe.env ?? {} });
    probe = await watchProbe(sandbox, probeStarted.id, spec.probe.expect, {
      timeoutMs: opts.probe_timeout_ms ?? DEFAULT_PROBE_TIMEOUT_MS,
      pollMs: opts.probe_poll_ms ?? DEFAULT_PROBE_POLL_MS,
      sleep,
      ...(opts.cancel === undefined ? {} : { cancel: opts.cancel }),
      ...(log === undefined ? {} : { log }),
    });
  } catch (error) {
    // The real Sandbox SDK's `startProcess`/`getProcess`/`readOutput` are
    // network round trips to the container and can reject outright — a Durable
    // Object hiccup, a container that refuses a request mid-boot — not only
    // answer with the wrong content. Uncaught, that exception unwound
    // `spawnWorker` with no `ProbeOutcome` at all and nothing for `opts.record`
    // to persist: the exact "unexplainable after the fact" failure this tick
    // exists to end, just one step earlier than a wrong-output probe (tick ys3).
    probe = {
      ok: false,
      reason: "probe-error",
      detail: `the probe attempt raised an error before it produced any evaluable output: ${String(error)}`,
      output: "",
    };
  }
  if (!probe.ok) {
    const cancelled = probe.reason === "cancelled" ? (opts.cancel?.cancelled ?? null) : null;
    // Persisted before this attempt's account of itself is lost: the
    // container this probe ran in is torn down by the caller right after,
    // and its stdout goes nowhere else (tick ys3).
    await opts.record?.probeFailed?.(task, sandboxName, probe);
    return {
      tick_id: task.tick_id,
      sandbox_name: sandboxName,
      launched: false,
      probe,
      confirm: null,
      process_id: null,
      output_offset: 0,
      adopted: false,
      cancelled,
      detail:
        cancelled === null ? `green-start trap: ${probe.detail}` : `wave cancelled: ${probe.detail}`,
    };
  }

  const work = await sandbox.startProcess(spec.command, { env: spec.env ?? {} });
  // Recorded before anything waits on it: `confirmDispatch` can take a minute,
  // and a supervisor that died inside it would otherwise leave a manifest that
  // names a container but not the process running in it.
  await opts.record?.started(task, sandboxName, work.id);
  const confirm = await confirmDispatch(sandbox, work.id, {
    timeoutMs: opts.confirm_timeout_ms ?? DEFAULT_CONFIRM_TIMEOUT_MS,
    pollMs: opts.confirm_poll_ms ?? DEFAULT_CONFIRM_POLL_MS,
    sleep,
    ...(opts.cancel === undefined ? {} : { cancel: opts.cancel }),
    ...(log === undefined ? {} : { log }),
  });

  return {
    tick_id: task.tick_id,
    sandbox_name: sandboxName,
    // The probe passed and the real command was started: this container IS
    // launched. An unconfirmed dispatch is reported as such, not silently
    // downgraded to "never launched" — `internal/herd/spawn`'s
    // `DispatchUnconfirmed` is the precedent, because the durable layer
    // (collect), not this wait, is what actually proves the tick.
    launched: true,
    probe,
    confirm,
    process_id: work.id,
    output_offset: confirm.offset,
    adopted: false,
    // The real command IS running in this container, so it is launched — and
    // that is exactly why the cancellation has to be reported: the caller owes
    // this one a teardown before it does anything else.
    cancelled: confirm.confirmed ? null : (confirm.cancelled ?? null),
    detail: confirm.confirmed ? confirm.detail : `dispatched but unconfirmed: ${confirm.detail}`,
  };
}

// ------------------------------------------------------------------- wait ---

export type WaitOutcome = {
  state: SandboxProcessState | "gone";
  exit_code: number | null;
  timed_out: boolean;
  /** Set when the wave was cancelled while this worker was still being watched. */
  cancelled: WaveCancellation | null;
  /**
   * How far into the worker's output this wait streamed.
   *
   * Carried out of the wait because a wave is watched across MANY bounded
   * waits since tick 2xm — one per Workflow step — and the next one adopts
   * this container rather than starting it. Restarting the cursor at zero
   * would re-stream everything the container has printed so far into its R2
   * key on every leg, which for a ninety-minute wave is the same log written
   * thirteen times.
   */
  offset: number;
};

/**
 * Waits for a launched worker's process to reach a terminal state, bounded.
 *
 * Re-addresses the sandbox by name on every look rather than holding the
 * reference `spawnWorker` used, matching how each of `tk herd`'s spawn,
 * wait and collect independently resolve state by id — a caller across a
 * real boundary (a Workflow step, a `tk cloud wait` HTTP call) cannot carry
 * a live object across it either.
 */
export async function waitForWorker(
  binding: SandboxBinding,
  sandboxName: string,
  processID: string,
  opts: {
    timeoutMs?: number;
    pollMs?: number;
    sleep?: Sleeper;
    cancel?: Canceller;
    /** Where this container's output goes as the wait watches it (tick 0fg). */
    log?: WorkerLogWriter;
    /** How much of it `confirmDispatch` already streamed — never restart at 0. */
    offset?: number;
  } = {}
): Promise<WaitOutcome> {
  const sleep = opts.sleep ?? defaultSleeper;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
  const pollMs = opts.pollMs ?? DEFAULT_WAIT_POLL_MS;
  const deadline = Date.now() + timeoutMs;
  let offset = opts.offset ?? 0;

  /**
   * The wait is where a worker spends nearly all of its wall clock and prints
   * nearly everything it prints, so the drain happens HERE, on the same
   * cadence as the liveness look — continuously, never once at the end. A read
   * that fails is logged and the wait carries on: a diagnostic that can end a
   * live run is worse than a gap in a log.
   */
  const flush = async (sandbox: OrchestratorSandbox): Promise<void> => {
    if (opts.log === undefined) return;
    try {
      const chunk = await drain(sandbox, processID, offset, opts.log);
      offset = chunk.offset;
    } catch (error) {
      console.error(
        `factory worker-dispatch: could not read ${sandboxName}'s output: ${String(error)}`
      );
    }
  };

  for (;;) {
    const sandbox = await binding.get(sandboxName);
    await flush(sandbox);
    const view = await sandbox.getProcess(processID);
    if (view === null) {
      return { state: "gone", exit_code: null, timed_out: false, cancelled: null, offset };
    }
    if (view.state === "completed" || view.state === "failed") {
      // Read once more now the process is over: whatever it printed on its way
      // out landed after the flush above, and that is the half of the log a
      // failed worker is read for.
      await flush(sandbox);
      return { state: view.state, exit_code: view.exit_code, timed_out: false, cancelled: null, offset };
    }
    if (Date.now() >= deadline) {
      return { state: view.state, exit_code: view.exit_code, timed_out: true, cancelled: null, offset };
    }
    // The wait is where a wave spends nearly all of its wall clock, and it is
    // therefore where an operator's stop was being ignored for up to
    // `timeoutMs` — thirty minutes of a batch nobody could interrupt.
    const cancelled = await sleepUnlessCancelled(pollMs, sleep, opts.cancel);
    if (cancelled !== null) {
      return { state: view.state, exit_code: view.exit_code, timed_out: false, cancelled, offset };
    }
  }
}

// -------------------------------------------------------------- liveness ---

export type LivenessCheck = { alive: boolean; state: SandboxProcessState | "gone" };

/** One fresh liveness read. Never cached — see `teardownWorker`. */
export async function checkLiveness(
  binding: SandboxBinding,
  sandboxName: string,
  processID: string
): Promise<LivenessCheck> {
  const sandbox = await binding.get(sandboxName);
  const view = await sandbox.getProcess(processID);
  if (view === null) return { alive: false, state: "gone" };
  return { alive: view.state === "running", state: view.state };
}

// -------------------------------------------------------------- salvage ---

/**
 * How long a cancelled container has to commit and push before it is destroyed.
 *
 * The same sixty seconds `WORKER_PUSH_MARGIN_MS` reserves for the same work at
 * the other door (worker-boot.ts): a bounded harness stops just under the
 * wave's wait so the container can still commit, report and push, and that
 * margin has already worked live — run `run_2e66e765`'s three killed
 * containers each produced a readable branch. This is that margin, spent on
 * behalf of a container the SUPERVISOR is stopping instead of one stopping
 * itself.
 *
 * It is not a hole in the kill switch. `.tick/learnings.md` ("Cost, budgets
 * and kill switches") says to revoke BEFORE the grace window, because that
 * window is time a runaway spends — and the ordering here obeys it exactly:
 * `waveCanceller`'s `on_cancel` revokes the run's gateway token the instant
 * the wave is found cancelled, which is before any of this runs. A container
 * whose token is revoked is answered `403 run_token_revoked` by the gateway,
 * so the only thing it can do in this window is finish a git push. The money
 * dies first; the work is rescued second.
 */
export const DEFAULT_SALVAGE_GRACE_MS = 60_000;

/** How often the window looks to see whether the container is done. */
export const DEFAULT_SALVAGE_POLL_MS = 2_000;

/**
 * What one container did with its grace window.
 *
 * Recorded per tick and carried into the wave's outcomes artifact, because the
 * question this tick exists to answer — "did the run keep what it paid for?" —
 * has to be answerable after the containers are gone.
 */
export type SalvageOutcome = {
  /** Whether the container was actually asked. False when there was nothing to ask. */
  requested: boolean;
  /** Whether the worker process ended inside the window. */
  settled: boolean;
  /** How long the window was actually held open. */
  waited_ms: number;
  /** The worker process's state when the window closed. */
  state: SandboxProcessState | "gone" | "not-running";
  detail: string;
};

/** The container was never asked, because there was no live worker to ask. */
export const NOT_SALVAGED: SalvageOutcome = {
  requested: false,
  settled: false,
  waited_ms: 0,
  state: "not-running",
  detail: "no live worker process to ask",
};

/**
 * Asks one cancelled container to stop and push, and waits, bounded, for it.
 *
 * THE ASYMMETRY THIS CLOSES. `cloud/sandbox/worker.sh` already salvages
 * uncommitted work into its own commit, writes a report and pushes when the
 * WORKER's own bound fires — tick 5fg, proven live on run 3, where tick 5qj's
 * four dirty paths survived as commit adfedff5. None of it ran when the
 * SUPERVISOR ended the wave: `teardownWorker` kills the process and destroys
 * the container, and the work dies inside it. Run `run_f7bd5a36` is what that
 * costs — three containers, all working, all destroyed, `no-commits` on every
 * tick, $8.00 for nothing.
 *
 * So the ask comes first and the destruction second. What is asked is a
 * SIGNAL, not a kill: a second process in the same container which lodges the
 * request and stops the harness, so the entrypoint runs its own existing
 * salvage path. This function's job is to hold the window open for it and to
 * record what happened either way.
 *
 * Best effort throughout: every failure here degrades to the behaviour before
 * this tick (destroy the container) rather than stopping the teardown. A wave
 * that cannot be torn down is worse than a wave that loses a tick's work.
 */
export async function salvageWorker(
  binding: SandboxBinding,
  sandboxName: string,
  processID: string | null,
  spec: SalvageSpec | undefined,
  opts: {
    /** The machine-readable reason the wave stopped, handed to the container. */
    reason?: string;
    graceMs?: number;
    pollMs?: number;
    sleep?: Sleeper;
    /** This container's output stream, so the push it makes is readable later. */
    log?: WorkerLogWriter;
    /** How far that stream has already been read — never restart at 0 (tick 0fg). */
    offset?: number;
  } = {}
): Promise<SalvageOutcome> {
  if (processID === null || spec === undefined) {
    return {
      ...NOT_SALVAGED,
      detail:
        processID === null
          ? "no worker process was running in this container"
          : "this container was not booted with a salvage door",
    };
  }

  const sleep = opts.sleep ?? defaultSleeper;
  const graceMs = Math.max(opts.graceMs ?? DEFAULT_SALVAGE_GRACE_MS, 0);
  const pollMs = Math.max(opts.pollMs ?? DEFAULT_SALVAGE_POLL_MS, 1);
  let offset = opts.offset ?? 0;

  const sandbox = await binding.get(sandboxName);
  const flush = async (): Promise<void> => {
    if (opts.log === undefined) return;
    try {
      const chunk = await drain(sandbox, processID, offset, opts.log);
      offset = chunk.offset;
    } catch (error) {
      console.error(
        `factory worker-dispatch: could not read ${sandboxName}'s output during its salvage window: ${String(error)}`
      );
    }
  };

  // A fresh look, immediately before the ask, for the same reason
  // `teardownWorker` takes one before it kills: an observation from the wait
  // that just ended is already stale by the time the collect and the
  // cancellation bookkeeping in front of this have run.
  const before = await sandbox.getProcess(processID);
  if (before === null || before.state !== "running") {
    await flush();
    return {
      requested: false,
      settled: true,
      waited_ms: 0,
      state: before === null ? "gone" : before.state,
      detail:
        "the worker was already over when the wave was cancelled; nothing was mid-flight to rescue",
    };
  }

  let started = false;
  let asked = "";
  try {
    const reason = (opts.reason ?? "").trim();
    const command = reason === "" ? spec.command : `${spec.command} ${reason}`;
    const door = await sandbox.startProcess(command, { env: spec.env ?? {} });
    started = true;
    asked = command;
    // What the door itself said, read once after a single poll. It is small,
    // it is the evidence that the container understood the ask, and it is kept
    // in this outcome rather than streamed into the worker's own log — that
    // stream belongs to one process and a second one interleaved into it would
    // corrupt the cursor every later leg resumes from.
    await sleep(Math.min(pollMs, graceMs));
    const said = await sandbox.readOutput(door.id, 0).catch(() => ({ text: "", offset: 0 }));
    if (spec.marker !== undefined && said.text !== "" && !said.text.includes(spec.marker)) {
      console.error(
        `factory worker-dispatch: ${sandboxName} did not answer the salvage ask with ` +
          `${JSON.stringify(spec.marker)}: ${excerpt(said.text)}`
      );
    }
  } catch (error) {
    console.error(
      `factory worker-dispatch: could not ask ${sandboxName} to stop and push: ${String(error)}`
    );
  }

  if (!started) {
    return {
      requested: false,
      settled: false,
      waited_ms: 0,
      state: "running",
      detail: `the salvage ask could not be started in ${sandboxName}; the container is destroyed with its work`,
    };
  }

  const startedAt = Date.now();
  for (;;) {
    await flush();
    const view = await sandbox.getProcess(processID);
    const waited = Date.now() - startedAt;
    if (view === null) {
      return {
        requested: true,
        settled: true,
        waited_ms: waited,
        state: "gone",
        detail: `the worker process was gone ${waited}ms after being asked to stop and push`,
      };
    }
    if (view.state === "completed" || view.state === "failed") {
      // One more read now it is over: the push is the LAST thing the container
      // prints, so a stream that stopped at the state change stops one line
      // before the line worth having.
      await flush();
      return {
        requested: true,
        settled: true,
        waited_ms: waited,
        state: view.state,
        detail:
          `the container stopped, committed and pushed within ${waited}ms of being asked ` +
          `(${asked}); whatever it had is on its branch`,
      };
    }
    if (waited >= graceMs) {
      return {
        requested: true,
        settled: false,
        waited_ms: waited,
        state: view.state,
        detail:
          `the container was still running ${graceMs}ms after being asked to stop and push; ` +
          `it is destroyed now, and anything it had not pushed is lost`,
      };
    }
    await sleep(Math.min(pollMs, graceMs - waited));
  }
}

export type TeardownOutcome = {
  killed: boolean;
  destroyed: boolean;
  liveness: LivenessCheck | null;
};

/**
 * Tears a worker sandbox down.
 *
 * EXPIRING LIVENESS: the liveness check that decides whether `killProcess`
 * is even called happens HERE, immediately before it, rather than trusting
 * `confirmDispatch`'s or `waitForWorker`'s last observation — both of which
 * can be arbitrarily stale by the time teardown runs (collect's GitHub round
 * trips sit in between). A sandbox that died in the interval is detected
 * before anything destructive is attempted on it, never assumed alive
 * because it recently was.
 *
 * `destroy()` runs regardless of `processID` or what liveness found — a
 * sandbox that never started real work still needs its container reclaimed,
 * and `destroy()` on one already gone is a no-op worth attempting (the same
 * rule `finalize()` in run-workflow.ts applies to the orchestrator sandbox).
 */
export async function teardownWorker(
  binding: SandboxBinding,
  sandboxName: string,
  processID: string | null
): Promise<TeardownOutcome> {
  const sandbox = await binding.get(sandboxName);

  let liveness: LivenessCheck | null = null;
  if (processID !== null) {
    const view = await sandbox.getProcess(processID);
    liveness = view === null ? { alive: false, state: "gone" } : { alive: view.state === "running", state: view.state };
    if (liveness.alive) {
      await sandbox.killProcess(processID);
    }
  }
  await sandbox.destroy();
  return { killed: liveness?.alive ?? false, destroyed: true, liveness };
}

// -------------------------------------------------------------- the wave ---

export type WaveOptions = SpawnOptions & {
  wait_timeout_ms?: number;
  wait_poll_ms?: number;
  /**
   * What happens to a container whose wait ran out (tick 2xm).
   *
   * `teardown` — the default, and the only behaviour before this tick — kills
   * the process and destroys the container: the wait timeout IS the worker's
   * deadline, so a worker still running at it has had its allowance.
   *
   * `leave` means this wait was not the worker's deadline but one bounded LEG
   * of it, sized to fit inside a Cloudflare Workflow step (600s execution cap,
   * src/workflow-limits.ts). The container is left exactly as it is, still
   * working, for the next leg's reconcile to adopt. Nothing else changes: a
   * cancelled wave still tears its containers down immediately, and the last
   * leg of a wave still passes `teardown`, so a worker that outlives the whole
   * wave budget is killed exactly as it always was.
   */
  on_wait_timeout?: "teardown" | "leave";
  /**
   * How long a cancelled container is given to commit and push before it is
   * destroyed (tick 7zk). Defaults to {@link DEFAULT_SALVAGE_GRACE_MS}. Zero
   * asks the container to stop and destroys it without waiting, which is the
   * behaviour before this tick with one extra process started.
   */
  salvage_grace_ms?: number;
  /** How often that window looks; defaults to {@link DEFAULT_SALVAGE_POLL_MS}. */
  salvage_poll_ms?: number;
  /**
   * A worker already running for this tick, from the reconcile plan
   * (src/reconcile.ts). Returning one turns the whole spawn half of the cycle
   * off for that task: no probe, no second process, nothing started — the
   * wave waits on what is there, collects it and tears it down exactly as if
   * it had launched it itself.
   *
   * This is the rule the herd substrate learned the hard way, at the one
   * place that could break it: a live worker is never redispatched, whatever
   * its branch looks like.
   */
  adopt?: (task: WorkerTask) => Adoption | null;
};

/** A worker this wave takes over rather than starts. */
export type Adoption = {
  /** The running work process, from the container's own live process list. */
  process_id: string;
  /** Why this tick is being adopted — carried into the outcome's `detail`. */
  detail: string;
  /**
   * How much of this container's output has already been streamed, when the
   * adopter knows (tick 2xm's dispatch legs do: the previous leg's checkpointed
   * `WaitOutcome` says so). Absent means the cursor is unknown and the stream
   * restarts from the beginning — see {@link adoptedSpawn}.
   */
  output_offset?: number;
};

export type WorkerWaveOutcome = SpawnResult & {
  wait: WaitOutcome | null;
  collect: WorkerReport;
  teardown: TeardownOutcome;
  /**
   * What this container's grace window did, present exactly when the wave was
   * cancelled while this container existed (tick 7zk). Absent everywhere else:
   * a container that finished, or that a leg left running, was never asked to
   * stop, and reporting a salvage for it would describe a window nobody held.
   */
  salvage?: SalvageOutcome;
  /**
   * The reconcile class that settled this tick without addressing a container
   * at all (tick s7f) — `already-landed` for work that is in git, `unknown`
   * for evidence a human has to resolve. Absent for every tick the wave
   * actually dispatched or adopted.
   */
  settled?: string;
};

/** A container the wave never addressed: nothing was booted, so nothing is torn down. */
export const NOT_ADDRESSED: TeardownOutcome = { killed: false, destroyed: false, liveness: null };

/**
 * A container this LEG left running on purpose (tick 2xm).
 *
 * Shaped like `NOT_ADDRESSED` and meaning something else entirely: the
 * container exists, a worker is still in it, and the next leg is going to
 * adopt it. Named separately so a reader of an outcome — or of the wave
 * outcomes artifact — can tell "no container" from "a container we chose not
 * to kill yet".
 */
export const LEFT_RUNNING: TeardownOutcome = { killed: false, destroyed: false, liveness: null };

/**
 * The outcome of adopting a worker that was already running.
 *
 * `launched` is true because the container IS running this tick's work — the
 * field means "a work process for this tick exists in this container", not "we
 * are the ones who started it". A collect that read the branch would otherwise
 * be filed under a wave that never launched anything.
 */
function adoptedSpawn(
  task: WorkerTask,
  sandboxName: string,
  adoption: Adoption
): SpawnResult {
  return {
    tick_id: task.tick_id,
    sandbox_name: sandboxName,
    launched: true,
    // No probe was run: the container proved itself when it was first
    // dispatched, and re-probing a container that is mid-tick would start a
    // second process in it for no reason.
    probe: { ok: true },
    confirm: { confirmed: true, detail: adoption.detail, offset: adoption.output_offset ?? 0 },
    process_id: adoption.process_id,
    // Zero when the adopter cannot say where the stream got to — a DEAD
    // supervisor's cursor died with it. This attempt then streams the adopted
    // container from the beginning into its OWN attempt folder, so a reader
    // may see the pre-adoption output twice: deliberately chosen over losing
    // whatever the dead supervisor never flushed, which is the output closest
    // to why it died. A live adopter that knows the cursor — one dispatch leg
    // handing the wave to the next (tick 2xm) — passes it, and nothing is
    // re-streamed.
    output_offset: adoption.output_offset ?? 0,
    adopted: true,
    cancelled: null,
    detail: `adopted a live worker: ${adoption.detail}`,
  };
}

async function dispatchOneWorker(
  binding: SandboxBinding,
  sandboxName: string,
  task: WorkerTask,
  spec: WorkSpec,
  opts: WaveOptions,
  collector: WorkerCollector
): Promise<WorkerWaveOutcome> {
  // Before a container is even ADDRESSED. `binding.get` provisions on
  // Cloudflare, so a wave already cancelled must not touch the sandbox at all:
  // addressing one is how a stopped run boots the containers it was stopped to
  // prevent.
  const before = opts.cancel === undefined ? null : await opts.cancel.check();
  if (before !== null) {
    return {
      tick_id: task.tick_id,
      sandbox_name: sandboxName,
      launched: false,
      probe: { ok: false, reason: "cancelled", detail: before.detail, output: "" },
      confirm: null,
      process_id: null,
      output_offset: 0,
      adopted: false,
      cancelled: before,
      detail: `wave cancelled before this container was addressed: ${before.detail}`,
      wait: null,
      collect: await collector.collect(task),
      teardown: NOT_ADDRESSED,
    };
  }

  // A worker that is ALREADY running for this tick is taken over, never
  // replaced. Everything downstream — the wait, the collect, the teardown — is
  // unchanged, which is the point: adoption is a different way to acquire a
  // process, not a different lifecycle.
  const adoption = opts.adopt?.(task) ?? null;
  const spawned =
    adoption === null
      ? await spawnWorker(binding, sandboxName, task, spec, opts)
      : adoptedSpawn(task, sandboxName, adoption);

  // Bound once for the whole cycle: the wait streams this container's output,
  // and so does the salvage window after a cancellation — the same tick's
  // stream, so the same writer and the same cursor.
  const log = opts.logs?.forTick(task.tick_id);

  let wait: WaitOutcome | null = null;
  if (spawned.cancelled === null && spawned.launched && spawned.process_id !== null) {
    wait = await waitForWorker(binding, sandboxName, spawned.process_id, {
      timeoutMs: opts.wait_timeout_ms,
      pollMs: opts.wait_poll_ms,
      sleep: opts.sleep,
      offset: spawned.output_offset ?? 0,
      ...(opts.cancel === undefined ? {} : { cancel: opts.cancel }),
      ...(log === undefined ? {} : { log }),
    });
  }

  const cancelled = spawned.cancelled ?? wait?.cancelled ?? null;
  if (cancelled !== null) {
    // REVOKE, THEN GRACE, THEN DESTROY (tick 7zk).
    //
    // The revoke has already happened: it is `waveCanceller`'s `on_cancel`,
    // awaited before `check` answers and therefore before this line is
    // reached, which is tick gyl's ordering — the money dies before the
    // containers do. What that ordering BUYS is this window: a container whose
    // gateway token is revoked cannot make a model call, so the seconds spent
    // here cannot be spent on the model. They can only be spent finishing a
    // git push, and that is exactly what run_f7bd5a36 needed and did not get.
    //
    // Then teardown, still before collect — the reverse of the ordinary order
    // below. Collect makes GitHub round trips, and reading git while a
    // container is still up buys nothing: git does not forget while we tear a
    // container down.
    const salvage = await salvageWorker(binding, sandboxName, spawned.process_id, spec.salvage, {
      reason: cancelled.reason,
      ...(opts.salvage_grace_ms === undefined ? {} : { graceMs: opts.salvage_grace_ms }),
      ...(opts.salvage_poll_ms === undefined ? {} : { pollMs: opts.salvage_poll_ms }),
      ...(opts.sleep === undefined ? {} : { sleep: opts.sleep }),
      ...(log === undefined ? {} : { log }),
      offset: wait?.offset ?? spawned.output_offset ?? 0,
    });
    const teardown = await teardownWorker(binding, sandboxName, spawned.process_id);
    return { ...spawned, cancelled, wait, salvage, collect: await collector.collect(task), teardown };
  }

  // Collect ALWAYS runs, whatever spawn/wait decided: a green-start trap or
  // a timed-out wait is a fact about this attempt at the container, not
  // about the branch — and reconcile's own rule applies at the tick level
  // too, so a prior attempt's pushed work must still be found.
  const collect = await collector.collect(task);

  // The one case a container survives its wait: this wait was a bounded LEG of
  // the wave rather than the worker's deadline (tick 2xm). Killing here is what
  // the whole leg mechanism exists to avoid — the worker is mid-tick and the
  // next leg adopts it. Every other path still tears down, cancellation
  // included, and so does the final leg.
  if (
    wait !== null &&
    wait.timed_out &&
    wait.cancelled === null &&
    opts.on_wait_timeout === "leave"
  ) {
    return { ...spawned, wait, collect, teardown: LEFT_RUNNING };
  }

  const teardown = await teardownWorker(binding, sandboxName, spawned.process_id);

  return { ...spawned, wait, collect, teardown };
}

/**
 * Dispatches a wave: one sandbox per tick, booted concurrently.
 *
 * `Promise.all` is what makes "N containers concurrently" true — every
 * tick's spawn → wait → collect → teardown cycle is independent of every
 * other's, exactly as `tk herd spawn` fires every worker of a wave before
 * any wait begins rather than working through them one at a time.
 *
 * `specFor` is a function, not a shared `WorkSpec`, because a spec is PER
 * TICK — `worker-boot.ts`'s own `workerWorkSpec` says so in as many words —
 * and a single shared spec would set the identical `TICKS_TICK` in every
 * container's environment, which is the exact bug that would make "one
 * container per tick" boot N containers that all implement the SAME tick
 * (tick b6e).
 *
 * `opts.adopt` is the reconcile plan's other half (tick s7f): a task it
 * answers for is taken over rather than started, so a supervisor replacing one
 * that died mid-wave never puts a second worker on a tick that already has a
 * live one.
 *
 * `opts.on_wait_timeout` is what makes a wave that outlives one Cloudflare
 * Workflow step possible at all (tick 2xm). This function BLOCKS until every
 * container in the wave settles or its wait runs out, and a wave's wait is now
 * up to ninety-one minutes ({@link DEFAULT_WAIT_TIMEOUT_MS}) against a 600s
 * per-step execution cap (src/workflow-limits.ts) — so a caller inside a
 * Workflow step calls this repeatedly with a leg-sized `wait_timeout_ms` and
 * `on_wait_timeout: "leave"`, and each call re-establishes what is running
 * from the durable layer and adopts it. Called once with a wave-sized timeout,
 * as `superviseCloudWave` used to, it kills its own supervisor.
 *
 * `opts.cancel` is the wave's interrupt (tick k24). Without it a batch of up
 * to `max_instances` containers runs to completion no matter what an operator
 * asks for — a hard stop or a blown budget waited on the slowest container in
 * the batch, up to `wait_timeout_ms`. With it, every polling loop in the cycle
 * looks for a reason to stop on the canceller's own cadence, and a cancelled
 * worker is torn down before anything else is done with it. The canceller is
 * SHARED by the whole wave by construction: it lives in the options every task
 * is handed, so the first worker to see the stop decides it for all of them.
 */
export async function dispatchWave(
  binding: SandboxBinding,
  sandboxNameFor: (tickID: string) => string,
  tasks: WorkerTask[],
  specFor: (task: WorkerTask) => WorkSpec,
  opts: WaveOptions,
  collector: WorkerCollector
): Promise<WorkerWaveOutcome[]> {
  return Promise.all(
    tasks.map((task) =>
      dispatchOneWorker(binding, sandboxNameFor(task.tick_id), task, specFor(task), opts, collector)
    )
  );
}

/** The sandbox name one tick's worker is addressed by within a run. */
export function workerSandboxName(runID: string, tickID: string): string {
  return `${runID}-tick-${tickID}`;
}
