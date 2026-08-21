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

import type { OrchestratorSandbox, SandboxBinding, SandboxProcessState } from "./sandbox";
import type { WorkerCollector, WorkerReport, WorkerTask } from "./worker-collect";

// ------------------------------------------------------------- the timing ---

export const DEFAULT_PROBE_TIMEOUT_MS = 30_000;
export const DEFAULT_PROBE_POLL_MS = 1_000;
export const DEFAULT_CONFIRM_TIMEOUT_MS = 60_000;
export const DEFAULT_CONFIRM_POLL_MS = 1_000;
export const DEFAULT_WAIT_TIMEOUT_MS = 30 * 60_000;
export const DEFAULT_WAIT_POLL_MS = 15_000;

/** Injectable so a test drives the polling loops without real wall-clock time. */
export type Sleeper = (ms: number) => Promise<void>;

/** The Workers runtime's own delay primitive (global `scheduler`); every loop below defaults to it. */
export const defaultSleeper: Sleeper = (ms) => scheduler.wait(ms);

function excerpt(text: string, max = 200): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
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
      reason: "no-output" | "wrong-output" | "process-gone" | "timeout";
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
  opts: { timeoutMs: number; pollMs: number; sleep: Sleeper }
): Promise<ProbeOutcome> {
  const deadline = Date.now() + opts.timeoutMs;
  let output = "";
  let offset = 0;
  for (;;) {
    const chunk = await sandbox.readOutput(processID, offset);
    output += chunk.text;
    offset = chunk.offset;
    const view = await sandbox.getProcess(processID);
    if (view === null) {
      return { ok: false, reason: "process-gone", detail: "the probe process vanished before it finished", output };
    }
    if (view.state === "completed" || view.state === "failed") {
      return evaluateProbeOutput(output, expect, view.exit_code);
    }
    if (Date.now() >= deadline) {
      return { ok: false, reason: "timeout", detail: `the probe had not finished after ${opts.timeoutMs}ms`, output };
    }
    await opts.sleep(opts.pollMs);
  }
}

// --------------------------------------------------------- confirm dispatch ---

export type ConfirmOutcome =
  | { confirmed: true; detail: string }
  | { confirmed: false; detail: string };

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
  opts: { timeoutMs: number; pollMs: number; sleep?: Sleeper }
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
      };
    }
    if (view.state === "completed" || view.state === "failed") {
      return {
        confirmed: true,
        detail: `the worker reached a terminal state (${view.state}) before the confirm window closed`,
      };
    }
    if (!sawOutput) {
      const chunk = await sandbox.readOutput(processID, offset);
      offset = chunk.offset;
      if (chunk.text !== "") sawOutput = true;
    }
    if (view.state === "running" && sawOutput) {
      return { confirmed: true, detail: "the worker is running and has produced output" };
    }
    if (Date.now() >= deadline) {
      return {
        confirmed: false,
        detail: `no evidence the worker started within ${opts.timeoutMs}ms (state ${view.state})`,
      };
    }
    await sleep(opts.pollMs);
  }
}

// ------------------------------------------------------------------ spawn ---

export type WorkSpec = {
  probe: ProbeSpec;
  command: string;
  env?: Record<string, string>;
};

export type SpawnOptions = {
  probe_timeout_ms?: number;
  probe_poll_ms?: number;
  confirm_timeout_ms?: number;
  confirm_poll_ms?: number;
  sleep?: Sleeper;
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
  const sandbox = await binding.get(sandboxName);

  const probeStarted = await sandbox.startProcess(spec.probe.command, { env: spec.probe.env ?? {} });
  const probe = await watchProbe(sandbox, probeStarted.id, spec.probe.expect, {
    timeoutMs: opts.probe_timeout_ms ?? DEFAULT_PROBE_TIMEOUT_MS,
    pollMs: opts.probe_poll_ms ?? DEFAULT_PROBE_POLL_MS,
    sleep,
  });
  if (!probe.ok) {
    return {
      tick_id: task.tick_id,
      sandbox_name: sandboxName,
      launched: false,
      probe,
      confirm: null,
      process_id: null,
      detail: `green-start trap: ${probe.detail}`,
    };
  }

  const work = await sandbox.startProcess(spec.command, { env: spec.env ?? {} });
  const confirm = await confirmDispatch(sandbox, work.id, {
    timeoutMs: opts.confirm_timeout_ms ?? DEFAULT_CONFIRM_TIMEOUT_MS,
    pollMs: opts.confirm_poll_ms ?? DEFAULT_CONFIRM_POLL_MS,
    sleep,
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
    detail: confirm.confirmed ? confirm.detail : `dispatched but unconfirmed: ${confirm.detail}`,
  };
}

// ------------------------------------------------------------------- wait ---

export type WaitOutcome = {
  state: SandboxProcessState | "gone";
  exit_code: number | null;
  timed_out: boolean;
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
  opts: { timeoutMs?: number; pollMs?: number; sleep?: Sleeper } = {}
): Promise<WaitOutcome> {
  const sleep = opts.sleep ?? defaultSleeper;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
  const pollMs = opts.pollMs ?? DEFAULT_WAIT_POLL_MS;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const sandbox = await binding.get(sandboxName);
    const view = await sandbox.getProcess(processID);
    if (view === null) return { state: "gone", exit_code: null, timed_out: false };
    if (view.state === "completed" || view.state === "failed") {
      return { state: view.state, exit_code: view.exit_code, timed_out: false };
    }
    if (Date.now() >= deadline) {
      return { state: view.state, exit_code: view.exit_code, timed_out: true };
    }
    await sleep(pollMs);
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
};

export type WorkerWaveOutcome = SpawnResult & {
  wait: WaitOutcome | null;
  collect: WorkerReport;
  teardown: TeardownOutcome;
};

async function dispatchOneWorker(
  binding: SandboxBinding,
  sandboxName: string,
  task: WorkerTask,
  spec: WorkSpec,
  opts: WaveOptions,
  collector: WorkerCollector
): Promise<WorkerWaveOutcome> {
  const spawned = await spawnWorker(binding, sandboxName, task, spec, opts);

  let wait: WaitOutcome | null = null;
  if (spawned.launched && spawned.process_id !== null) {
    wait = await waitForWorker(binding, sandboxName, spawned.process_id, {
      timeoutMs: opts.wait_timeout_ms,
      pollMs: opts.wait_poll_ms,
      sleep: opts.sleep,
    });
  }

  // Collect ALWAYS runs, whatever spawn/wait decided: a green-start trap or
  // a timed-out wait is a fact about this attempt at the container, not
  // about the branch — and reconcile's own rule applies at the tick level
  // too, so a prior attempt's pushed work must still be found.
  const collect = await collector.collect(task);

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
