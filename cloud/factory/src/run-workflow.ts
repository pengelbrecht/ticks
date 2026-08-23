/**
 * The Run Workflow — the thing that makes a run survive everything below it.
 *
 * A run is a supervisor and a container, and only one of them is durable. The
 * container is *expected* to die: context exhaustion, container eviction, an
 * API that stops answering. The supervisor cannot be lost, which is why it is a
 * Cloudflare Workflow: every step is checkpointed, so a run outlives the Worker
 * isolate, the sandbox, and the region.
 *
 * Five rules shape this module.
 *
 * 1. **The sandbox is disposable, the run is not.** A dead orchestrator is a
 *    reboot, not a failure. The fresh sandbox's first instruction is the
 *    reconcile protocol (`TICKS_PHASE=reconcile`), which adopts pushed state
 *    instead of redoing merged work — the same protocol a local `tk herd
 *    reconcile` runs, and the same one an operator's stop-edit-restart rides.
 *    Boots are bounded: a container that dies three times is telling you
 *    something a fourth boot will not fix.
 * 2. **Budgets are enforced HERE, never in a prompt.** A model can be talked
 *    out of a budget; a Workflow step cannot (D14). Wall-clock and cost are
 *    checked at every observation, against ground truth — the elapsed time this
 *    module measured and the `cost_usd` this module reads back from AI Gateway
 *    logs — never against anything the agent reports. And enforcement does not
 *    stop at killing a process: a trip revokes the run's gateway token, so an
 *    orchestrator that survives its own kill still cannot spend (D17).
 * 3. **Exhaustion is a clean stop, identical to the operator stop path
 *    (D15).** Both trip the same branch: give the in-flight work a bounded
 *    grace window, then boot a `closeout` orchestrator that reconciles and runs
 *    review and closeout on what is done. There is no "abandon the run" path,
 *    because an abandoned run leaves merged work with no tracker state.
 * 4. **Harness output streams to R2 during the run, never at exit (D20).** The
 *    crashed run is exactly the run whose logs you need, so every observation
 *    flushes what the orchestrator has printed since the last one. Reading the
 *    stream mid-run is a supported operation, not a debugging accident.
 * 5. **Finalize always runs.** Whatever happened — completed, stopped, failed,
 *    unprovisioned — the lease is released, the index row reaches a terminal
 *    state, and `run.json` says why. A run that ends without releasing its
 *    lease wedges the project until the lease ttl expires.
 * 6. **Completion is proved, never inferred from an exit status (tick ehy).**
 *    A harness exits 0 when it has nothing left to say, which is not the same
 *    as having done something: the first run whose boot chain fully succeeded
 *    printed 271 bytes, dispatched no wave, pushed no branch, left the epic's
 *    ticks open — and was recorded COMPLETED and charged for. So the exit
 *    status only decides whether to reboot; whether the epic MOVED is decided
 *    against the durable layer (src/progress.ts: the remote's refs, before and
 *    after). A run that stopped without advancing anything is `stopped`, and
 *    `completed` means the epic actually moved.
 * 7. **A mandatory closeout is not a stop (tick 074).** A cloud wave always
 *    hands off to a closeout orchestrator, because per-tick workers implement
 *    and push and nothing else. That handoff travels as its own `handoff`
 *    outcome rather than as a trip, so a wave that went perfectly is not
 *    recorded — in the index row, the dispatch log or `run.json` — as a run
 *    somebody stopped. `state` alone has to be readable.
 *
 * See docs/design/cloud-factory.md (Phase 1, UC1, UC1b, D14, D15, D19, D20).
 */

import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import {
  readWaveRequest,
  workerLogSink,
  writeHarnessSegment,
  writeCombinedHarnessLog,
  writeReconcileRecord,
  writeRunRecord,
  writeWaveOutcomes,
  type RunRecord,
} from "./artifacts";
import { getRun, recordRunProgress, updateRunState } from "./db";
import {
  factoryBaseURL,
  issueRunToken,
  modelRoutingComplaint,
  revokeRunTokens,
  runGatewayEndpoint,
  spendFailureRemedy,
  syncRunCost,
} from "./gateway";
import type { Env } from "./index";
import {
  compareSnapshots,
  snapshotRefs,
  unverifiedProgress,
  type RefSnapshot,
  type RunProgress,
} from "./progress";
import {
  NOT_ASKED,
  adoptions,
  dispatchable,
  manifestRecorder,
  reconcileWave,
  settled,
  settledOutcome,
} from "./reconcile";
import { readDeclaredMaxParallel, readDeclaredSandboxImage } from "./repo-config";
import {
  epicCompleted,
  epicStarted,
  publishRunEvents,
  tickCompleted,
  tickStarted,
} from "./run-events";
import { MAX_LEASE_TTL_MS, DEFAULT_LEASE_TTL_MS, type LeaseLostReason } from "./run-room";
import { logDispatch, roomFor, type RunWorkflowParams } from "./runs";
import {
  deploymentImage,
  isTerminalExit,
  orchestratorEnv,
  repoURL,
  resolveSandboxImage,
  sandboxBinding,
  sandboxName,
  ORCHESTRATOR_COMMAND,
  type OrchestratorPhase,
  type SandboxProcessState,
} from "./sandbox";
import {
  DEFAULT_WORKER_HARNESS_BUDGET_MS,
  waveWaitTimeoutMs,
  workerHarnessBudgetMs,
  workerTask,
  workerHarness,
  workerModel,
  workerWorkSpec,
} from "./worker-boot";
import { MAX_RUN_WAVES } from "./wave-request";
import { workerCollector, type WorkerCollector } from "./worker-collect";
import {
  DEFAULT_CONFIRM_TIMEOUT_MS,
  DEFAULT_SALVAGE_GRACE_MS,
  DEFAULT_WAIT_POLL_MS,
  dispatchWave,
  probeTimeoutMs,
  waveCanceller,
  workerSandboxName,
  type WaveCancellation,
  type WorkerWaveOutcome,
} from "./worker-dispatch";
import { STEP_WORK_BUDGET_MS, shareStepBudget, stepBudget } from "./workflow-limits";

// ------------------------------------------------------------- the shape ---

/**
 * How many orchestrator sandboxes one run may burn through.
 *
 * Bounded on purpose. A container that cannot stay alive is usually a broken
 * environment, and an unbounded reboot loop spends real money reaching the same
 * answer with a bigger bill.
 */
export const MAX_SANDBOX_BOOTS = 3;

/** The closeout pass gets its own, smaller allowance for the same reason. */
export const MAX_CLOSEOUT_BOOTS = 2;

/**
 * This deployment's `[[containers]] max_instances` ceiling, mirrored into a
 * `[vars]` string because wrangler does not hand a container application's own
 * config back to the Worker at runtime (tick b6e). Kept in step with
 * `wrangler.toml`'s `max_instances = 3` by hand; raising one without the
 * other reintroduces the exact silent serialization wave 3 measured, one
 * layer up.
 */
export const DEFAULT_FACTORY_MAX_INSTANCES = 3;

/**
 * How many cloud worker containers a run may run concurrently.
 *
 * `FACTORY_MAX_INSTANCES` is `[vars]`, not `RUN_*`: it is a fact about this
 * deployment's account, not a per-run budget, so it is read once rather than
 * through `runConfig`'s per-submission override machinery.
 */
export function factoryMaxInstances(env: Env): number {
  return positiveVar(env, "FACTORY_MAX_INSTANCES", DEFAULT_FACTORY_MAX_INSTANCES, true);
}

/**
 * Observations per boot.
 *
 * Cloudflare caps a Workflow instance's step count, and each observation costs
 * two steps (a sleep and a check). This bound, times the boot allowances above,
 * is what keeps a long run inside that cap — see `pollDelay` for how the
 * interval stretches to cover a long run within a fixed number of looks.
 *
 * Running out of looks is NOT a dead orchestrator. It is a run that outlived
 * what this Workflow instance can watch, and it takes the clean-stop path: the
 * one thing it must never do is boot a second orchestrator alongside a healthy
 * one, which would put two writers on the same `.tick/` (D4).
 */
export const MAX_OBSERVATIONS = 80;

/** Defaults for the deployment-configurable budgets. */
export const DEFAULT_MAX_WALL_CLOCK_MS = 21_600_000; // 6 hours
export const DEFAULT_MAX_COST_USD = 25;
/** How long the in-flight work has to land before a clean stop kills it. */
export const DEFAULT_STOP_GRACE_MS = 300_000; // 5 minutes
/**
 * What a dispatching orchestrator pass is told `TICKS_SUBSTRATE` is (tick wiy).
 *
 * The container's own default is `harness` and that default is load-bearing:
 * left to infer from a checkout that declares `substrate = "cloud"`, an
 * orchestrator container would read "my workers are cloud sandboxes" and "I am
 * one of them" as the same statement. This is the control plane saying
 * otherwise, explicitly, for a pass it is prepared to dispatch a wave for.
 */
const CLOUD_SUBSTRATE = "cloud";

/** A closeout that has not closed out in this long is not going to. */
export const DEFAULT_CLOSEOUT_MS = 1_800_000; // 30 minutes

/**
 * Observation cadence. Fast at first — a broken boot, a missing toolchain and
 * the first harness output all happen early — then backing off to a cadence a
 * multi-hour run can afford within `MAX_OBSERVATIONS` looks.
 */
export const MIN_POLL_MS = 15_000;
export const MAX_POLL_MS = 300_000;
const POLL_BACKOFF = 1.25;

/**
 * How much of the remaining cost headroom one sleep may be projected to spend.
 *
 * `detectTrip` only runs on an observation, so whatever a run burns during a
 * sleep is spent unwatched — the backoff above widens that window to five
 * minutes exactly when a run is long-lived and expensive, which is when it
 * matters. Measured on run_62c289d1: `RUN_MAX_COST_USD` was 5, `syncRunCost`
 * recorded 5.86 correctly, and the run was still `running` with no trip. The
 * accounting was right; the cadence was not.
 *
 * So the sleep before each look is capped at the time the *observed* burn rate
 * says it would take to spend this fraction of what is left. The remaining
 * headroom halves each look as the ceiling nears, until the cap reaches
 * `MIN_POLL_MS` and the overshoot is bounded by one fast poll's worth of spend
 * rather than one backed-off poll's worth. It costs a handful of extra looks,
 * and only in the last stretch before a trip.
 *
 * The wall clock rides the same cadence and so overshot the same way — on
 * run a1f87597 a 45-minute ceiling was crossed at 11:29:52 and the token was
 * revoked at 11:31:59, two minutes late because the crossing happened partway
 * through a sleep. That one needs no projection: see `deadlineCap`.
 */
export const BUDGET_POLL_HEADROOM = 0.5;

/** Retry policies. Named so the intent survives the config literal. */
const CONTEXT_RETRIES = { retries: { limit: 3, delay: 1_000, backoff: "exponential" } } as const;
const BOOT_RETRIES = { retries: { limit: 2, delay: 2_000, backoff: "exponential" } } as const;
const OBSERVE_RETRIES = { retries: { limit: 3, delay: 500, backoff: "constant" } } as const;
const FINALIZE_RETRIES = { retries: { limit: 5, delay: 1_000, backoff: "exponential" } } as const;

// ------------------------------------------------------------ the config ---

export type RunConfig = {
  max_wall_clock_ms: number;
  max_cost_usd: number;
  /** Whether the deployment explicitly supplied a cost budget override. */
  cost_budget_configured: boolean;
  stop_grace_ms: number;
  closeout_ms: number;
  /** A fixed cadence when the deployment asks for one; else the backoff above. */
  poll_interval_ms: number | null;
  /** Looks per boot before the run is stopped cleanly rather than watched on. */
  max_observations: number;
  /**
   * How long one dispatch leg of a cloud wave watches its containers before
   * checkpointing and starting another (tick 2xm). Bounded by what a single
   * Cloudflare Workflow step may execute for; see `WAVE_LEG_MS`.
   */
  wave_leg_ms: number;
  harness: string | null;
  model: string | null;
  /**
   * A deployment's own ceiling on what any ONE worker container's harness may
   * spend (`RUN_WORKER_BUDGET_MS`), or null for the measured default. See
   * {@link cloudWaveBudget}.
   */
  worker_budget_ms: number | null;
  /**
   * This deployment's standing choice of harness and model for a per-tick
   * WORKER container (`RUN_WORKER_HARNESS`/`RUN_WORKER_MODEL`), or null to
   * leave the built-in default standing (tick 1cd).
   *
   * Separate from `harness`/`model` above because they answer a different
   * question: those are what THIS RUN asked for and apply to the orchestrator
   * too, these are what this factory routes its workers at when a run asks for
   * nothing. `workerHarness`/`workerModel` resolve the two together —
   * run submission > deployment var > built-in default.
   */
  worker_harness: string | null;
  worker_model: string | null;
};

/**
 * Reads a positive numeric var, ignoring an unusable value with a log rather
 * than failing the run — a typo'd budget must not take the factory down, and
 * the default it falls back to is the safe direction.
 */
function positiveVar(env: Env, name: keyof Env, fallback: number, integer: boolean): number {
  const raw = env[name];
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  const usable = integer ? Number.isSafeInteger(parsed) : Number.isFinite(parsed);
  if (!usable || parsed <= 0) {
    console.error(
      `factory run-workflow: ${String(name)} must be a positive number; ignoring "${raw}" and using ${fallback}`
    );
    return fallback;
  }
  return parsed;
}

function textVar(env: Env, name: keyof Env): string | null {
  const raw = env[name];
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

function hasPositiveVar(env: Env, name: keyof Env, integer: boolean): boolean {
  const raw = textVar(env, name);
  if (raw === null) return false;
  const parsed = Number(raw);
  return (integer ? Number.isSafeInteger(parsed) : Number.isFinite(parsed)) && parsed > 0;
}

/**
 * What one submission asked its own budget to be (tick wn5).
 *
 * Both fields are optional and both are bounded by the deployment's ceiling on
 * the way in: a flag may lower a budget, never raise it. The ceiling is the
 * operator's standing decision, and a submission is something an agent can
 * make — so "cheap and bounded" is a per-invocation choice while "how much may
 * anything spend at all" stays a deployment one.
 */
export type RunBudgetOverride = {
  max_cost_usd?: number;
  max_wall_clock_ms?: number;
};

/**
 * The requested budget, clamped to the ceiling.
 *
 * An unusable value is ignored with a log rather than failing the run, exactly
 * as `positiveVar` treats a typo'd var — and both fallbacks are toward the
 * ceiling, which is the bound that was already agreed to. A submission's value
 * is validated at the edge (`parseSubmission`), so reaching this with garbage
 * means something upstream is broken, not that a run should widen its budget.
 */
function boundedBudget(
  ceiling: number,
  requested: number | undefined,
  name: string,
  integer: boolean
): { value: number; applied: boolean } {
  if (requested === undefined) return { value: ceiling, applied: false };
  const usable = integer ? Number.isSafeInteger(requested) : Number.isFinite(requested);
  if (!usable || requested <= 0) {
    console.error(
      `factory run-workflow: ${name} must be a positive number; ignoring ${String(requested)} and using ${ceiling}`
    );
    return { value: ceiling, applied: false };
  }
  if (requested > ceiling) {
    // Said, not silently honoured and not refused: the run is bounded either
    // way, and an operator who asked for more must be able to read back that
    // the deployment ceiling is what it actually got.
    console.error(
      `factory run-workflow: ${name} ${requested} exceeds the deployment ceiling ${ceiling}; ` +
        "a submission may lower a budget, never raise it"
    );
    return { value: ceiling, applied: true };
  }
  return { value: requested, applied: true };
}

export function runConfig(env: Env, override: RunBudgetOverride = {}): RunConfig {
  const poll = textVar(env, "RUN_POLL_INTERVAL_MS");
  const wallCeiling = positiveVar(env, "RUN_MAX_WALL_CLOCK_MS", DEFAULT_MAX_WALL_CLOCK_MS, true);
  const costCeiling = positiveVar(env, "RUN_MAX_COST_USD", DEFAULT_MAX_COST_USD, false);
  const cost = boundedBudget(costCeiling, override.max_cost_usd, "max_cost_usd", false);
  const wall = boundedBudget(wallCeiling, override.max_wall_clock_ms, "max_wall_clock_ms", true);
  return {
    max_wall_clock_ms: wall.value,
    max_cost_usd: cost.value,
    // A submission that named a cost budget has asked for one, so it is
    // enforced like a configured var — including the part that matters: a
    // budget whose telemetry cannot be read stops the run rather than letting
    // it spend unmeasured.
    cost_budget_configured: hasPositiveVar(env, "RUN_MAX_COST_USD", false) || cost.applied,
    stop_grace_ms: positiveVar(env, "RUN_STOP_GRACE_MS", DEFAULT_STOP_GRACE_MS, true),
    closeout_ms: positiveVar(env, "RUN_CLOSEOUT_MS", DEFAULT_CLOSEOUT_MS, true),
    poll_interval_ms: poll === null ? null : positiveVar(env, "RUN_POLL_INTERVAL_MS", MIN_POLL_MS, true),
    max_observations: positiveVar(env, "RUN_MAX_OBSERVATIONS", MAX_OBSERVATIONS, true),
    // Clamped, never trusted: a leg longer than a step may execute for is the
    // bug this tick fixed, and a var is exactly how it would come back.
    wave_leg_ms: stepBudget(positiveVar(env, "RUN_WAVE_LEG_MS", WAVE_LEG_MS, true)),
    harness: textVar(env, "RUN_HARNESS"),
    model: textVar(env, "RUN_MODEL"),
    // Null rather than a number, so `cloudWaveBudget` can tell "this
    // deployment named a ceiling" from "use the measured default" — an
    // unusable value is ignored exactly as every other budget var's is.
    worker_budget_ms: hasPositiveVar(env, "RUN_WORKER_BUDGET_MS", true)
      ? positiveVar(env, "RUN_WORKER_BUDGET_MS", DEFAULT_WORKER_HARNESS_BUDGET_MS, true)
      : null,
    // Null rather than the constant, for the same reason as the budget above:
    // "this deployment named a worker model" and "use the built-in default"
    // are different facts, and only `workerModel` gets to collapse them.
    worker_harness: textVar(env, "RUN_WORKER_HARNESS"),
    worker_model: textVar(env, "RUN_WORKER_MODEL"),
  };
}

/**
 * The budget a submission will ACTUALLY run under (tick 7zk).
 *
 * An operator asked for `--max-cost 40` and got $8, because `RUN_MAX_COST_USD`
 * was 8 and a submission may only lower a budget. That is the correct policy
 * and it was applied silently: `tk cloud run` printed nothing about $8, and the
 * first place the real number appeared was the cancellation that ended the run.
 * It is the third time in this epic a deployment ceiling replaced an operator's
 * number with no line anywhere saying so (tick 5fg found two for wall clock),
 * and `.tick/learnings.md` now carries the rule: when a bound does not take
 * effect, enumerate every layer that can lower it.
 *
 * So the submission path answers with the number that will govern, and says
 * when it is not the number that was asked for. Nothing here decides anything —
 * `runConfig` is still the one clamp — this only reports its result at the one
 * moment an operator is still reading.
 */
export type EffectiveRunBudget = {
  /** What this run may spend, in USD, after clamping. */
  max_cost_usd: number;
  /** What this run may take, in ms, after clamping. */
  max_wall_clock_ms: number;
  /** What the submission asked for, when it asked at all. */
  requested_max_cost_usd: number | null;
  requested_max_wall_clock_ms: number | null;
  /** Whether the deployment ceiling lowered what was asked for. */
  cost_clamped: boolean;
  wall_clock_clamped: boolean;
};

export function effectiveRunBudget(env: Env, override: RunBudgetOverride = {}): EffectiveRunBudget {
  const wallCeiling = positiveVar(env, "RUN_MAX_WALL_CLOCK_MS", DEFAULT_MAX_WALL_CLOCK_MS, true);
  const costCeiling = positiveVar(env, "RUN_MAX_COST_USD", DEFAULT_MAX_COST_USD, false);
  const config = runConfig(env, override);
  const asked = (value: number | undefined): number | null =>
    value === undefined || !Number.isFinite(value) || value <= 0 ? null : value;
  const cost = asked(override.max_cost_usd);
  const wall = asked(override.max_wall_clock_ms);
  return {
    max_cost_usd: config.max_cost_usd,
    max_wall_clock_ms: config.max_wall_clock_ms,
    requested_max_cost_usd: cost,
    requested_max_wall_clock_ms: wall,
    cost_clamped: cost !== null && cost > costCeiling,
    wall_clock_clamped: wall !== null && wall > wallCeiling,
  };
}

/**
 * What one observation learned about spend, carried to the next sleep.
 *
 * The rate is measured across the most recent gap rather than averaged over
 * the run: a run that idles through boot and then burns hard has an average
 * that badly understates what the next five minutes will cost.
 */
export type SpendSample = {
  cost_usd: number;
  at_ms: number;
  /** Dollars per millisecond across the most recent gap; null until one shows spend. */
  rate_usd_per_ms: number | null;
};

/**
 * Folds an observation's spend reading into the running sample.
 *
 * An observation that read no cost at all (budgets not enforced on this pass,
 * or a look that tripped before the read) leaves the previous sample standing:
 * a missing reading is not a reading of zero.
 */
export function spendSample(
  previous: SpendSample | null,
  cost_usd: number | null,
  at_ms: number
): SpendSample | null {
  if (cost_usd === null) return previous;
  const carried = previous === null ? null : previous.rate_usd_per_ms;
  if (previous === null || at_ms <= previous.at_ms) {
    return { cost_usd, at_ms, rate_usd_per_ms: carried };
  }
  const spent = cost_usd - previous.cost_usd;
  // A quiet gap is not evidence the run stopped spending — gateway logs land in
  // batches, so a look can read the same total twice — which is why the last
  // observed rate stands rather than the window reopening to the full backoff.
  const measured = spent > 0 ? spent / (at_ms - previous.at_ms) : null;
  return { cost_usd, at_ms, rate_usd_per_ms: measured ?? carried };
}

/**
 * What the next sleep must respect beyond the backoff.
 *
 * Both budgets are sampled on the same cadence, so both overshoot by whatever
 * the sleep costs — and they are bounded differently because they are known
 * differently. The wall clock is known exactly, so the sleep simply stops at
 * the deadline. Spend is only ever projected, so it gets the headroom rule.
 */
export type Cadence = {
  /** Now, on the same clock as `deadline_ms` — the last checkpointed reading. */
  now_ms: number;
  /** The earliest deadline in force (run wall clock, pass window), or null. */
  deadline_ms: number | null;
  /** The last observation's spend reading, or null before the first one. */
  spend: SpendSample | null;
};

/** The first of two absolute deadlines to arrive, when either exists. */
export function earliestDeadline(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

/** The backoff the cadence starts from, before any budget caps it. */
function baseDelay(config: RunConfig, n: number): number {
  if (config.poll_interval_ms !== null) return config.poll_interval_ms;
  return Math.min(Math.round(MIN_POLL_MS * POLL_BACKOFF ** n), MAX_POLL_MS);
}

/** Never sleep past a deadline: the look that trips should be the next one. */
function deadlineCap(cadence: Cadence): number | null {
  if (cadence.deadline_ms === null) return null;
  return cadence.deadline_ms - cadence.now_ms;
}

/**
 * Never sleep through more than `BUDGET_POLL_HEADROOM` of what is left.
 *
 * With no rate yet there is nothing to project from and the backoff stands —
 * a run that has not been seen spending is not the run this bounds.
 */
function spendCap(config: RunConfig, spend: SpendSample | null): number | null {
  if (spend === null) return null;
  const remaining = config.max_cost_usd - spend.cost_usd;
  // Already at or over the ceiling: the next look is the one that trips, and
  // every millisecond until it is unwatched spend.
  if (remaining <= 0) return MIN_POLL_MS;
  const rate = spend.rate_usd_per_ms;
  if (rate === null || !(rate > 0)) return null;
  return (remaining / rate) * BUDGET_POLL_HEADROOM;
}

/**
 * The gap before observation `n` (0-based) of a boot.
 *
 * Without a cadence this is the bare backoff — the pre-sleep lease renewal
 * asks for exactly that. With one, the backoff is the ceiling and the budgets
 * only ever shorten it, never below the fast cadence (or below a deliberately
 * tiny fixed interval, which is already faster than that floor).
 */
export function pollDelay(config: RunConfig, n: number, cadence: Cadence | null = null): number {
  const base = baseDelay(config, n);
  if (cadence === null) return base;

  const caps: number[] = [];
  const deadline = deadlineCap(cadence);
  if (deadline !== null) caps.push(deadline);
  const spend = spendCap(config, cadence.spend);
  if (spend !== null) caps.push(spend);
  if (caps.length === 0) return base;

  const floor = Math.min(base, MIN_POLL_MS);
  return Math.max(floor, Math.min(base, Math.round(Math.min(...caps))));
}

/**
 * The lease ttl a renewal asks for.
 *
 * It has to outlive the gap to the *next* observation, or the run would expire
 * its own lease between two looks and hand the project to a queued submission
 * while it is still working.
 */
export function renewalTtl(pollMs: number): number {
  return Math.min(Math.max(pollMs * 3, DEFAULT_LEASE_TTL_MS), MAX_LEASE_TTL_MS);
}

/**
 * What one renewal returned, kept as the RunRoom answered it (tick 7n7).
 *
 * `null` is "the renewal could not be made" — a DO hop that threw — and is
 * NOT a lost lease: a failed read has never been a stop in this file
 * (`hardStopRecord`, `waveCanceller`), and treating one as a stop would kill
 * runs on a transient. `ok: false` is a verdict, and it carries WHICH of the
 * two ways the lease went.
 */
export type LeaseRenewal =
  | { ok: true }
  | { ok: false; lost: LeaseLostReason; holder: string | null; detail: string };

/**
 * Extends the run's hold on its project, and reports the verdict verbatim.
 *
 * Every renewal in this file goes through here so that the two callers — the
 * watched-orchestrator loop and the container wave — cannot drift into
 * answering the same question differently (`.tick/learnings.md`: if two
 * endpoints answer the same question, they must run the same check).
 */
export async function renewRunLease(
  env: Env,
  params: RunWorkflowParams,
  ttlMs: number
): Promise<LeaseRenewal | null> {
  try {
    const renewed = await roomFor(env, params.project).renewDispatchLease({
      run_id: params.run_id,
      token: params.lease_token,
      ttl_ms: ttlMs,
    });
    if (renewed.ok) return { ok: true };
    if (renewed.error !== "lease_lost") {
      // A malformed call is this supervisor's own bug, not a lost lease.
      console.error(
        `factory run-workflow: ${params.run_id} could not renew its lease: ${renewed.detail}`
      );
      return null;
    }
    return {
      ok: false,
      lost: renewed.lost,
      holder: renewed.holder?.run_id ?? null,
      detail: renewed.detail,
    };
  } catch (error) {
    console.error(
      `factory run-workflow: ${params.run_id} could not renew its lease: ${String(error)}`
    );
    return null;
  }
}

/**
 * The stop a lost lease produces, told apart by HOW it was lost (tick 7n7).
 *
 * Both end the run — D4 is one arbiter per project, and a run that is not the
 * arbiter must not keep writing — but they are opposite failures and an
 * operator has to be able to tell which one happened. run_659b7cf2 read "the
 * dispatch lease was lost to another run" when no other run existed: its
 * ten-minute lease had simply lapsed under an eighty-eight-minute container
 * wave that renewed nothing. That message sent the diagnosis looking for a
 * competing run for as long as it stood.
 */
export function leaseLostTrip(renewal: { lost: LeaseLostReason; holder: string | null }): Trip {
  if (renewal.lost === "taken") {
    return {
      kind: "stop",
      hard: true,
      detail:
        "the dispatch lease was taken by another run" +
        (renewal.holder === null ? "" : ` (${renewal.holder})`),
    };
  }
  return {
    kind: "stop",
    hard: true,
    detail:
      "the dispatch lease expired before it was renewed — no other run has taken it, " +
      "so this run simply stopped being the project's arbiter",
  };
}

// ----------------------------------------------------------- the context ---

export type RunContext = {
  repo_url: string;
  /**
   * The gateway endpoint the sandbox is pointed at: this factory's own
   * `/api/gateway` prefix, which exchanges the run's token for the operator's
   * provider key and stamps the run/tick metadata on the way to their AI
   * Gateway (D17, src/gateway.ts).
   */
  gateway_base_url: string;
  started_at_ms: number;
  config: RunConfig;
  /**
   * Why gateway cost telemetry is unavailable for a run allowed to continue
   * without an explicit cost budget. The fact is recorded rather than left to
   * look like a run that spent nothing.
   */
  cost_telemetry: string | null;
  /**
   * The remote's branch heads as they were when the run started (tick ehy).
   *
   * Finalize compares this against a second read to decide whether the epic
   * actually moved. It is taken here, before a container exists, so the
   * baseline cannot include anything this run pushed — and a read that failed
   * is carried as a failure, so an unreadable remote produces `unknown`
   * rather than a comparison against nothing.
   */
  refs_baseline: RefSnapshot;
  /**
   * The image this run's containers boot: the `[sandbox].image` its repository
   * declares at the submitted SHA, else this deployment's own (tick x3v).
   *
   * Resolved once, before any container or credential exists, because a
   * declared image this deployment cannot serve is a configuration verdict —
   * a reboot reaches the identical answer, and the run should never have been
   * started.
   */
  sandbox_image: string;
  /**
   * A wave of ticks to run as per-tick cloud worker containers (tick b6e), or
   * null for the unchanged Phase 1 path.
   *
   * Resolved once, before any container exists, for the same reason
   * `sandbox_image` is: the width is a configuration decision (two ceilings
   * reconciled — `resolveDispatchWidth`), and it cannot change mid-run without
   * the dispatch-log record of it becoming a lie.
   */
  cloud_wave: CloudWavePlan | null;
};

/**
 * A resolved wave: which ticks, and how many of their containers may run at
 * once.
 */
export type CloudWavePlan = {
  tick_ids: string[];
  /**
   * The commit this wave's containers clone at.
   *
   * The submitted wave uses the run's base. Every wave AFTER it uses the run
   * branch head its orchestrator pass pushed (tick wiy) — a wave-2 worker that
   * cloned the original base would implement its tick against a tree wave 1's
   * merged work never landed in, which is not a slow wave, it is a wrong one.
   */
  base_sha: string;
  width: number;
  /** True when `[orchestration].max_parallel` asked for more than the deployment can serve. */
  capped: boolean;
  /** Why `width` is what it is — always said, never silent (tick b6e, wave 3's finding). */
  detail: string;
};

/**
 * How many worker containers a cloud wave may run at once.
 *
 * Two ceilings, and per the tick's own instruction they must not disagree
 * silently. `maxParallel` — `[orchestration].max_parallel` in the
 * repository's tracked config — is the project's own choice, and it is the
 * SAME number `kji` enforces on the tick claim inside each worker's
 * entrypoint: a width wider than it would only book containers whose claim
 * gets refused, wasting a boot for nothing. `deploymentCeiling` —
 * `FACTORY_MAX_INSTANCES`, mirroring `wrangler.toml`'s `[[containers]]
 * max_instances` — is a hard platform limit on concurrent containers across
 * the WHOLE factory, not just this run.
 *
 * `max_parallel` is authoritative for INTENT (it is the operator's explicit
 * per-project choice); the deployment ceiling is authoritative for
 * ENFORCEMENT (it is a resource limit, not a preference) and can only
 * narrow the width, never widen it past what `max_parallel` asked for. When
 * the two disagree the wave is capped at the tighter one and it SAYS SO
 * (`capped`/`detail`) — the alternative wave 3 found is Cloudflare's own
 * container scheduler serializing the overflow invisibly.
 */
export function resolveDispatchWidth(
  deploymentCeiling: number,
  maxParallel: number | null
): { width: number; capped: boolean; detail: string } {
  const requested = maxParallel ?? deploymentCeiling;
  if (requested <= deploymentCeiling) {
    return {
      width: requested,
      capped: false,
      detail:
        maxParallel === null
          ? `wave width ${requested}, from this deployment's container ceiling — no ` +
            "[orchestration].max_parallel is declared"
          : `wave width ${requested}, from [orchestration].max_parallel`,
    };
  }
  return {
    width: deploymentCeiling,
    capped: true,
    detail:
      `[orchestration].max_parallel (${maxParallel}) exceeds this deployment's container ` +
      `ceiling (${deploymentCeiling}); the wave is capped at ${deploymentCeiling} and runs in ` +
      "batches rather than silently serializing wider than that",
  };
}

export type ContextResult =
  | { ok: true; context: RunContext }
  | { ok: false; detail: string };

/**
 * Everything the run needs before it boots anything, checked once.
 *
 * A deployment that cannot boot a container or cannot reach a gateway is a
 * broken deploy, not a run that should be attempted: both refusals happen here,
 * before a sandbox exists and before any credential is handed to one.
 */
export async function acquireContext(
  env: Env,
  params: RunWorkflowParams
): Promise<ContextResult> {
  const run = await getRun(env.DB, params.run_id);
  if (run === null) {
    return { ok: false, detail: `run ${params.run_id} has no index row — it was never recorded` };
  }

  if (sandboxBinding(env) === null) {
    return {
      ok: false,
      detail:
        "the SANDBOXES binding is not configured on this deployment, so no orchestrator " +
        "sandbox can be booted; re-run `tk factory deploy`",
    };
  }

  // D17: all cloud model traffic goes through the operator's own gateway, and
  // it gets there through this factory's proxy. Absence is an actionable stop
  // naming the command that fixes it, never a silent fall back to a vendor.
  const routing = modelRoutingComplaint(env);
  if (routing !== null) return { ok: false, detail: routing };

  const config = runConfig(env, {
    ...(params.max_cost_usd === undefined ? {} : { max_cost_usd: params.max_cost_usd }),
    ...(params.max_wall_clock_ms === undefined
      ? {}
      : { max_wall_clock_ms: params.max_wall_clock_ms }),
  });
  const telemetry = await syncRunCost(env, params.run_id);
  if (!telemetry.ok) {
    console.error(
      `factory run-workflow: ${params.run_id} has no gateway cost telemetry: ${telemetry.detail}`
    );
    if (config.cost_budget_configured) {
      // Which failure it was decides what the operator should do: a query this
      // factory got wrong is a bug report, a 5xx is a retry, and a missing
      // credential is a setup command. One message for all three sent a live
      // run's operator to reconfigure a token that was already correct.
      return {
        ok: false,
        detail:
          "the configured cost budget cannot be enforced because AI Gateway cost telemetry " +
          `could not be read: ${telemetry.detail}; ${spendFailureRemedy(telemetry.kind)}`,
      };
    }
  }

  // Before anything boots: what the remote looked like with none of this run's
  // work on it. An unreadable remote is not a refusal — the run may still do
  // real work, and the record will say the evidence could not be read.
  const refs = await snapshotRefs(env, params.project);
  if (!refs.ok) {
    console.error(
      `factory run-workflow: ${params.run_id} could not read the branches of ` +
        `${params.project} before booting: ${refs.detail}`
    );
  }

  // Which image this run boots, decided before a container exists (tick x3v).
  //
  // The declaration lives in the repository's tracked config at the submitted
  // SHA — never in a submission parameter, because an image is arbitrary code
  // and this container holds the run's credentials. The read is best effort:
  // its parser is a second reader of a Go-owned format, so a file it cannot
  // read leaves the base image standing and the entrypoint's own check — made
  // with the authoritative reader — refuses the boot if that was wrong.
  const declared = await readDeclaredSandboxImage(env, params.project, params.base_sha);
  if (declared.unread !== null) {
    console.error(
      `factory run-workflow: ${params.run_id} booted this deployment's image because ` +
        `${declared.unread}; the container checks its own checkout`
    );
  }
  const image = resolveSandboxImage({
    declared: declared.image,
    deployment: deploymentImage(env),
    at: params.base_sha,
  });
  if (!image.ok) return { ok: false, detail: image.detail };

  // A wave of ticks to fan out as per-tick cloud worker containers (tick
  // b6e), or null for the unchanged Phase 1 path — an ADDED path, decided
  // once here, before any container exists, same as the image above.
  let cloud_wave: CloudWavePlan | null = null;
  if (params.tick_ids !== undefined && params.tick_ids.length > 0) {
    const declaredParallel = await readDeclaredMaxParallel(env, params.project, params.base_sha);
    if (declaredParallel.unread !== null) {
      console.error(
        `factory run-workflow: ${params.run_id} could not read [orchestration].max_parallel: ` +
          `${declaredParallel.unread}; falling back to this deployment's own ceiling`
      );
    }
    const resolved = resolveDispatchWidth(factoryMaxInstances(env), declaredParallel.max_parallel);
    cloud_wave = {
      tick_ids: params.tick_ids,
      base_sha: params.base_sha,
      width: resolved.width,
      capped: resolved.capped,
      detail: resolved.detail,
    };
    // "Must not disagree silently" (tick b6e): a durable record of the width
    // this run actually dispatched with, queryable the same way any other
    // dispatch decision is (`tk factory trace`) — not just a console line.
    await logDispatch(env, {
      run_id: params.run_id,
      epic: params.epic,
      decision: `cloud_wave:width=${resolved.width}${resolved.capped ? ":capped" : ""}`,
      reason: null,
    });
  }

  const context: RunContext = {
    repo_url: repoURL(params.project),
    gateway_base_url: runGatewayEndpoint(factoryBaseURL(env)!),
    started_at_ms: Date.now(),
    config,
    cost_telemetry: telemetry.ok ? null : telemetry.detail,
    refs_baseline: refs,
    sandbox_image: image.image,
    cloud_wave,
  };

  // The run identifies itself in R2 before it does anything, so a run whose
  // Workflow is lost entirely still leaves a record of what it was.
  await writeRunRecord(env.ARTIFACTS, {
    run_id: run.run_id,
    project: run.project,
    epic: run.epic,
    base_sha: run.base_sha,
    requested_by: run.requested_by,
    // From the INDEX ROW, not from the Workflow params: the row is what
    // `tk cloud logs` and `tk cloud status` answer from, so taking it from the
    // same place keeps the two records unable to disagree about which chain
    // this run belongs to.
    ...(run.trace_id === null ? {} : { trace_id: run.trace_id }),
    ...(params.notify === undefined ? {} : { notify: params.notify }),
    started_at: run.started_at,
    state: "running",
  });

  // `starting` belongs to the submit route; the Workflow owns the run now.
  await updateRunState(env.DB, params.run_id, "running");

  // The board finds out a run exists here — after the refusals above, so it
  // never draws a run that a broken deploy was about to reject, and before any
  // container boots, so the first thing an operator sees is the run appearing.
  // `publishRunEvents` cannot throw: nothing below the record above may depend
  // on a picture of it reaching a screen (tick bne).
  await publishRunEvents(env, params.project, [
    epicStarted({
      epic: params.epic,
      run_id: params.run_id,
      ...(run.trace_id === null ? {} : { trace_id: run.trace_id }),
      status:
        cloud_wave === null
          ? "one orchestrator container"
          : `${cloud_wave.tick_ids.length} tick(s), ${cloud_wave.width} at a time`,
    }),
  ]);

  return { ok: true, context };
}

// -------------------------------------------------------------- watching ---

/** Why a run is stopping cleanly. Both kinds take the identical path (D15). */
/**
 * Why a pass ended early, and how fast the credential has to die with it.
 *
 * `hard` is the whole of tick gyl: a clean stop revokes at the END of the
 * grace window so in-flight work can land, and a budget breach or an operator
 * kill must revoke at the START of it. A run at twice its budget spending
 * through its own stop is not an unwind, it is an unmetered four minutes.
 */
export type Trip = { hard: boolean } & (
  | { kind: "stop"; detail: string }
  | { kind: "budget"; budget: "wall_clock" | "cost"; detail: string }
);

/** The reason a revocation is recorded under, so the row says which stop killed it. */
function tripRevokeReason(trip: Trip): string {
  if (trip.kind === "budget") return `budget:${trip.budget}`;
  return trip.hard ? "stopped:hard" : "stopped";
}

type Observation = {
  process: SandboxProcessState;
  exit_code: number | null;
  /** Cursor into the orchestrator's output, carried to the next observation. */
  offset: number;
  /** Segment counter, so each flush writes a new immutable object. */
  seq: number;
  trip: Trip | null;
  at_ms: number;
  /**
   * The spend this look read back, or null when it read none — a pass that
   * does not enforce budgets, or a look that tripped before the read. It feeds
   * the next sleep's cost cap, so a missing reading must stay distinguishable
   * from a reading of zero.
   */
  cost_usd: number | null;
};

type ObserveInput = {
  params: RunWorkflowParams;
  context: RunContext;
  boot: number;
  sandbox: string;
  process_id: string;
  offset: number;
  seq: number;
  poll_ms: number;
  /** Absolute deadline for this pass; null when only the run budget applies. */
  pass_deadline_ms: number | null;
  enforce_budgets: boolean;
};

/**
 * One look at the run: drain the log, renew the lease, check the stop record,
 * check the budgets, report the process.
 *
 * Order matters. Output is flushed FIRST, so an observation that then decides
 * to kill the orchestrator has already preserved what it printed.
 */
export async function observe(env: Env, input: ObserveInput): Promise<Observation> {
  const { params } = input;
  const binding = sandboxBinding(env);
  if (binding === null) {
    return {
      process: "gone",
      exit_code: null,
      offset: input.offset,
      seq: input.seq,
      trip: null,
      at_ms: Date.now(),
      cost_usd: null,
    };
  }
  const sandbox = await binding.get(input.sandbox);

  let offset = input.offset;
  let seq = input.seq;
  try {
    const output = await sandbox.readOutput(input.process_id, offset);
    if (output.text !== "") {
      const wrote = await writeHarnessSegment(
        env.ARTIFACTS,
        params.project,
        params.run_id,
        input.boot,
        seq,
        output.text
      );
      if (wrote) seq += 1;
      offset = output.offset;
    }
  } catch (error) {
    // A sandbox that cannot be read is a sandbox that is probably dying. That
    // is the process check's verdict to make, not this one's.
    console.error(
      `factory run-workflow: ${params.run_id} could not drain its harness output: ${String(error)}`
    );
  }

  // The lease has to outlive the gap to the next look, or the run expires its
  // own lease between two observations.
  const renewal = await renewRunLease(env, params, renewalTtl(input.poll_ms));
  const leaseLost = renewal !== null && renewal.ok === false ? renewal : null;

  const view = await sandbox.getProcess(input.process_id).catch(() => null);
  const at = Date.now();

  const checked = input.enforce_budgets
    ? await detectTrip(env, input, at, leaseLost)
    : {
        trip: (await hardStopTrip(env, input)) ?? passDeadlineTrip(input, at),
        cost_usd: null,
      };

  return {
    process: view === null ? "gone" : view.state,
    exit_code: view === null ? null : view.exit_code,
    offset,
    seq,
    trip: checked.trip,
    at_ms: at,
    cost_usd: checked.cost_usd,
  };
}

function passDeadlineTrip(input: ObserveInput, at: number): Trip | null {
  if (input.pass_deadline_ms === null || at < input.pass_deadline_ms) return null;
  return {
    kind: "budget",
    budget: "wall_clock",
    hard: true,
    detail: "the closeout window elapsed before the orchestrator finished closing out",
  };
}

/**
 * A hard stop, read at every observation of every pass — budgets or no.
 *
 * The closeout pass deliberately does not enforce budgets (it exists to land
 * the work the budget interrupted), and that used to mean it read no stop
 * record at all: an operator killing a run mid-closeout was talking to nobody,
 * and every closeout reboot minted a fresh credential over their revocation.
 * A hard stop is not a budget, so it is not on that switch.
 */
async function hardStopTrip(env: Env, input: ObserveInput): Promise<Trip | null> {
  const stop = await hardStopRecord(env, input.params);
  if (stop === null) return null;
  return {
    kind: "stop",
    hard: true,
    detail: `a hard stop was requested by ${stop.requested_by} at ${stop.requested_at}`,
  };
}

/** The standing hard stop for a run, or null. A read failure is not a stop. */
async function hardStopRecord(
  env: Env,
  params: RunWorkflowParams
): Promise<{ requested_by: string; requested_at: string } | null> {
  const stop = await roomFor(env, params.project)
    .stopRequest(params.run_id)
    .catch(() => null);
  if (stop === null || stop.mode !== "hard") return null;
  return { requested_by: stop.requested_by, requested_at: stop.requested_at };
}

/** What one budget check learned: whether to trip, and the spend it read. */
type TripCheck = { trip: Trip | null; cost_usd: number | null };

/**
 * The stop and budget check.
 *
 * The operator's stop wins over a budget: it is the more specific intent, and
 * both end in the same clean stop anyway, so the only thing that differs is
 * what the closeout orchestrator and the dispatch log are told.
 *
 * It also reports the spend it read, because the cadence that decides when
 * this next runs is derived from it — see `pollDelay`.
 */
async function detectTrip(
  env: Env,
  input: ObserveInput,
  at: number,
  leaseLost: { lost: LeaseLostReason; holder: string | null } | null
): Promise<TripCheck> {
  const { params, context } = input;

  const stop = await roomFor(env, params.project)
    .stopRequest(params.run_id)
    .catch(() => null);
  if (stop !== null) {
    const hard = stop.mode === "hard";
    return {
      trip: {
        kind: "stop",
        hard,
        detail: `a ${hard ? "hard" : "clean"} stop was requested by ${stop.requested_by} at ${stop.requested_at}`,
      },
      cost_usd: null,
    };
  }

  if (leaseLost !== null) {
    // This run is no longer the project's arbiter. Exactly one `.tick/` writer
    // per project (D4), so it stops rather than racing whoever is — and it
    // stops spending immediately. WHY it is no longer the arbiter is the
    // operator's first question, so the trip answers it (tick 7n7).
    return { trip: leaseLostTrip(leaseLost), cost_usd: null };
  }

  const elapsed = at - context.started_at_ms;
  if (elapsed >= context.config.max_wall_clock_ms) {
    return {
      trip: {
        kind: "budget",
        budget: "wall_clock",
        hard: true,
        detail:
          `the wall-clock budget is exhausted: ${Math.round(elapsed / 1000)}s of ` +
          `${Math.round(context.config.max_wall_clock_ms / 1000)}s`,
      },
      cost_usd: null,
    };
  }

  // Ground truth, not a self-report: the index row's cost is read back from AI
  // Gateway logs at every observation. An agent can misreport; an invoice
  // cannot — and a telemetry read that fails leaves the last known number
  // standing rather than inventing one.
  const spend = await syncRunCost(env, params.run_id);
  if (!spend.ok) {
    console.error(
      `factory run-workflow: ${params.run_id} could not read gateway spend: ${spend.detail}`
    );
  }
  const run = await getRun(env.DB, params.run_id).catch(() => null);
  const cost = run?.cost_usd ?? 0;
  if (cost >= context.config.max_cost_usd) {
    return {
      trip: {
        kind: "budget",
        budget: "cost",
        hard: true,
        detail: `the cost budget is exhausted: $${cost.toFixed(2)} of $${context.config.max_cost_usd.toFixed(2)}`,
      },
      cost_usd: cost,
    };
  }

  return { trip: null, cost_usd: cost };
}

// ------------------------------------------------------------ the passes ---

type PassOutcome =
  /**
   * `detail` is optional and is the pass's own account of what it did. A
   * single orchestrator pass has nothing to add — it finished the epic, which
   * is what `completed` already says. A wave LOOP does: the per-tick verdicts
   * of every wave it ran are written down nowhere else, and a completion that
   * dropped them would leave an operator with a green run and no way to see
   * which containers produced it (tick wiy, keeping tick 074's evidence).
   */
  | { kind: "completed"; boots: number; detail?: string }
  | { kind: "failed"; detail: string; boots: number }
  | { kind: "tripped"; trip: Trip; boots: number }
  /**
   * The pass finished everything it was for, and the run still owes the epic
   * a closeout boot. Only `superviseCloudWave` produces one: per-tick workers
   * implement and push and nothing else, so a wave that went perfectly is
   * still not an ending.
   *
   * It exists because folding that into `tripped` — which was the shortest
   * way to reach the mandatory closeout leg — made every successful wave
   * finish in state `stopped` (tick 074). A handoff is not a stop, and the
   * two must not share a carrier.
   */
  | {
      kind: "handoff";
      detail: string;
      boots: number;
      /**
       * Whether the pass reached its own end or died on the way (tick wiy).
       *
       * Both owe the epic a closeout — "there is no abandon path" applies to a
       * continuation pass that crashed exactly as it applies to a budget trip
       * — but they are not the same run. A clean handoff may still be promoted
       * to `completed` when the durable layer agrees; one carrying a dead pass
       * may not, whatever its closeout does, because the run did not do what
       * it set out to do. Absent means clean.
       */
      clean?: boolean;
    };

type PassOptions = {
  label: string;
  phase: OrchestratorPhase;
  stop_reason?: string;
  max_boots: number;
  enforce_budgets: boolean;
  /** Wall-clock allowance for this pass alone; null when only run budgets apply. */
  pass_max_ms: number | null;
  /** What running out of observations means for this pass. */
  on_exhausted: "stop" | "fail";
  /**
   * Which wave this pass is allowed to ask for, if it may ask at all (tick
   * wiy). Absent means it may not: the container is booted without
   * `TICKS_PASS`, and the dispatch endpoint refuses a request that carries no
   * pass number. A closeout is exactly such a pass — it is winding the run up,
   * not continuing it.
   */
  pass?: number;
  /**
   * `TICKS_SUBSTRATE` for this pass. Absent leaves the container's own
   * `harness` default standing, which is the correct default for every pass
   * that is not driving a container wave.
   */
  substrate?: string;
  /**
   * The wave this pass inherits — what the control plane just dispatched, so
   * the container can fan it back in without the local manifests that died
   * with the previous container.
   */
  wave_ticks?: string[];
  wave_base_sha?: string;
};

/** Mutable across passes so sandbox names and R2 segment folders never collide. */
type BootCounter = { next: number };

/**
 * Boot an orchestrator, watch it, reboot it if it dies — until it finishes,
 * trips, or runs out of allowances.
 */
async function supervisePass(
  env: Env,
  step: WorkflowStep,
  params: RunWorkflowParams,
  context: RunContext,
  counter: BootCounter,
  options: PassOptions
): Promise<PassOutcome> {
  let lastDetail = "the orchestrator never started";
  let lastSeen: { state: SandboxProcessState; exit_code: number | null } = {
    state: "gone",
    exit_code: null,
  };

  for (let attempt = 1; attempt <= options.max_boots; attempt++) {
    // Before anything is credentialled — before a boot is even counted: does a
    // hard stop stand?
    //
    // This is the half of the kill switch that was missing. Revoking a run's
    // token stopped nothing on a live run because the very next boot minted a
    // replacement — the supervisor undoing the operator's revocation every
    // time the harness died of it, closeout boots included, until the
    // container application itself was deleted. A hard stop is therefore a
    // durable refusal to mint, not a one-off revocation (tick gyl).
    const killed = await step.do(`${options.label}:killcheck:${attempt}`, OBSERVE_RETRIES, () =>
      hardStopRecord(env, params)
    );
    if (killed !== null) {
      await step.do(`${options.label}:killrevoke:${attempt}`, OBSERVE_RETRIES, async () => {
        const revoked = await revokeRunTokens(env, params.run_id, "stopped:hard");
        return { revoked };
      });
      return {
        kind: "tripped",
        trip: {
          kind: "stop",
          hard: true,
          detail:
            `a hard stop requested by ${killed.requested_by} at ${killed.requested_at} ` +
            "stands, so no orchestrator was credentialled",
        },
        boots: counter.next - 1,
      };
    }

    const boot = counter.next++;
    // A reboot is a *fresh* container by construction: the previous one is
    // presumed broken, and reusing its name is how you inherit what broke it.
    const name = sandboxName(params.run_id, boot);
    // Only the very first boot of a run is a plain `run`; every later one
    // reconciles first, whatever the pass asked for.
    //
    // `closeout` and `wave` are the exceptions, and for the same reason: both
    // already begin with the reconcile protocol in their own prompt, and both
    // carry an instruction that `reconcile` does not have and the run depends
    // on — wind this run up, or integrate the last wave and ask for the next.
    // Flattening either into `reconcile` would boot a container that adopts
    // the state correctly and then does the wrong thing with it.
    const phase: OrchestratorPhase =
      options.phase === "closeout" || options.phase === "wave"
        ? options.phase
        : boot === 1
          ? "run"
          : "reconcile";

    const booted = await step.do(`${options.label}:boot:${attempt}`, BOOT_RETRIES, async () => {
      const binding = sandboxBinding(env);
      if (binding === null) throw new Error("the SANDBOXES binding disappeared mid-run");
      // Every boot rotates the run's gateway credential (D17). The container
      // being replaced may still be alive somewhere; its token dies before the
      // replacement's is live, so two orchestrators can never both spend
      // against one run — and the token this one gets carries the run and tick
      // ids that stamp every model request it makes.
      const credential = await issueRunToken(env, {
        run_id: params.run_id,
        tick_id: params.epic,
        attempt: boot,
      });
      // The image is a parameter of the boot, not a constant of the call site
      // (tick 3q2's seam), and since tick x3v the value can be the
      // repository's own: `acquireContext` resolved it from the tracked config
      // at the submitted SHA, and refused the run outright if this deployment
      // could not serve it. The container is told which image it got, so its
      // own reader can refuse a boot that is not what the repository declared.
      const image = context.sandbox_image;
      const sandbox = await binding.get(name, { image });
      const started = await sandbox.startProcess(ORCHESTRATOR_COMMAND, {
        env: orchestratorEnv({
          run_id: params.run_id,
          epic: params.epic,
          base_sha: params.base_sha,
          repo_url: context.repo_url,
          gateway_base_url: context.gateway_base_url,
          gateway_token: credential.token,
          phase,
          // The chain this container belongs to (tick hyi). Every boot of the
          // orchestrator carries it, including a reconcile's replacement: the
          // replacement is the same causal chain as the sandbox it succeeds.
          ...(params.trace_id === undefined ? {} : { trace_id: params.trace_id }),
          ...(options.stop_reason === undefined ? {} : { stop_reason: options.stop_reason }),
          ...(env.GITHUB_TOKEN === undefined ? {} : { github_token: env.GITHUB_TOKEN }),
          ...(context.config.harness === null ? {} : { harness: context.config.harness }),
          ...(context.config.model === null ? {} : { model: context.config.model }),
          sandbox_image: image,
          // The dispatch half (tick wiy). Given per PASS, never per run: a
          // container that may not ask for a wave is not told how to, and a
          // closeout cannot be talked into starting one because it has no
          // pass number, no substrate override and no factory URL to ask.
          ...(options.substrate === undefined ? {} : { substrate: options.substrate }),
          ...(options.pass === undefined ? {} : { pass: options.pass }),
          ...(options.wave_ticks === undefined ? {} : { wave_ticks: options.wave_ticks }),
          ...(options.wave_base_sha === undefined
            ? {}
            : { wave_base_sha: options.wave_base_sha }),
          ...(options.pass === undefined || factoryBaseURL(env) === null
            ? {}
            : { factory_url: factoryBaseURL(env)!, factory_project: params.project }),
        }),
      });
      return { process_id: started.id, at_ms: Date.now() };
    });

    // Renew the lease the moment the container is up, BEFORE the first sleep.
    //
    // The lease is acquired at submit, and until this existed the next renewal
    // was the first observation — which sits behind boot plus a poll delay.
    // A boot that clones, installs a toolchain, probes the model and the
    // harness and runs pre-flight takes about a minute, so the first renewal
    // reliably arrived after the lease it was renewing had already expired.
    // renewDispatchLease then answered lease_lost, detectTrip read that as a
    // HARD trip, and the run revoked its own gateway token roughly a minute
    // in: measured on run_d941c5ee as a 403 run_token_revoked on the harness's
    // first real call, with nobody having asked for a stop (tick 4ef).
    //
    // Acquiring for longer is the other half of the fix (BOOT_LEASE_TTL_MS in
    // runs.ts) and neither half is sufficient alone: a slow boot outlives any
    // fixed acquire ttl, and a renewal that only happens after the first sleep
    // is always too late. A failure here is not fatal on its own — the first
    // observation re-reads the lease and trips properly if it really is gone.
    //
    // What it returns is the VERDICT, not a boolean. `{"ok":false}` is what
    // this step recorded on run_659b7cf2, and it is the reason the diagnosis
    // of that run had to start from a guess: the one call that knew whether
    // the lease had been taken or had merely lapsed threw the answer away
    // (`.tick/learnings.md`: persist a remote step's return value at its
    // return site, before anything interprets it).
    await step.do(`${options.label}:lease:${attempt}`, OBSERVE_RETRIES, async () => {
      const renewal = await renewRunLease(env, params, renewalTtl(pollDelay(context.config, 0)));
      if (renewal === null) return { ok: false, unreadable: true };
      if (renewal.ok) return { ok: true };
      console.error(
        `factory run-workflow: ${params.run_id} could not renew its lease after boot ${boot}: ` +
          `${renewal.detail}`
      );
      return { ok: false, lost: renewal.lost, holder: renewal.holder, detail: renewal.detail };
    });

    const deadline =
      options.pass_max_ms === null ? null : booted.at_ms + options.pass_max_ms;
    // Every absolute deadline a sleep on this pass must not run past: the run's
    // wall clock while budgets are enforced, this pass's own window otherwise.
    // Whichever comes first is the one the cadence stops at.
    const cadenceDeadline = earliestDeadline(
      options.enforce_budgets ? context.started_at_ms + context.config.max_wall_clock_ms : null,
      deadline
    );

    let offset = 0;
    let seq = 1;
    // Assume the container outlives the watch until an observation says
    // otherwise: falling out of the loop with this unchanged means the
    // orchestrator is still ALIVE, which is a different problem from a dead one.
    let ending: "dead" | "exhausted" = "exhausted";
    // What the last look knew about spend, and when it knew it. Both come from
    // checkpointed step results, never a live `Date.now()`, so a replayed
    // Workflow recomputes the identical cadence.
    let spend: SpendSample | null = null;
    let lastAt = booted.at_ms;

    for (let look = 0; look < context.config.max_observations; look++) {
      const pollMs = pollDelay(context.config, look, {
        now_ms: lastAt,
        deadline_ms: cadenceDeadline,
        spend,
      });
      await step.sleep(`${options.label}:wait:${attempt}:${look}`, pollMs);

      const seen = await step.do(
        `${options.label}:watch:${attempt}:${look}`,
        OBSERVE_RETRIES,
        async () =>
          observe(env, {
            params,
            context,
            boot,
            sandbox: name,
            process_id: booted.process_id,
            offset,
            seq,
            poll_ms: pollMs,
            pass_deadline_ms: deadline,
            enforce_budgets: options.enforce_budgets,
          })
      );
      offset = seen.offset;
      seq = seen.seq;
      spend = spendSample(spend, seen.cost_usd, seen.at_ms);
      lastAt = seen.at_ms;

      if (seen.trip !== null) {
        const trip = seen.trip;
        const reason = tripRevokeReason(trip);
        const revoke = (label: string) =>
          step.do(`${options.label}:${label}:${attempt}`, OBSERVE_RETRIES, async () => {
            const revoked = await revokeRunTokens(env, params.run_id, reason);
            return { revoked };
          });

        // The kill switch, at the layer that does not need the agent's
        // cooperation (D17): whatever survived the kill cannot spend another
        // cent, because its gateway token is dead.
        //
        // WHEN it fires is the difference a live run paid for. A clean stop
        // revokes after the grace window, because the point of that window is
        // to let in-flight work land. A budget breach or an operator kill has
        // no such claim on the money: the run is already over its allowance,
        // so the credential dies FIRST and the unwind happens on a container
        // that can no longer spend (tick gyl).
        if (trip.hard) await revoke("revoke");
        // The in-flight work still gets its bounded window to land, then the
        // orchestrator is killed and closeout takes over. Nothing durable is
        // lost either way — tracker state is committed to the run branch.
        await step.sleep(`${options.label}:grace:${attempt}`, context.config.stop_grace_ms);
        await step.do(`${options.label}:drain:${attempt}`, OBSERVE_RETRIES, () =>
          drainAndKill(env, params, name, booted.process_id, boot, offset, seq)
        );
        // The closeout boot mints a fresh credential — a stop must still reach
        // review and closeout (D15) — unless a hard stop stands, which the
        // boot guard above refuses.
        if (!trip.hard) await revoke("revoke:clean");
        return { kind: "tripped", trip, boots: counter.next - 1 };
      }

      if (seen.process === "completed" && (seen.exit_code ?? 0) === 0) {
        return { kind: "completed", boots: counter.next - 1 };
      }

      if (seen.process === "completed" || seen.process === "failed" || seen.process === "gone") {
        const code = seen.exit_code;
        lastDetail =
          seen.process === "gone"
            ? `the orchestrator sandbox died (boot ${boot})`
            : `the orchestrator exited ${code ?? "unknown"} (boot ${boot})`;
        if (isTerminalExit(code)) {
          // A configuration verdict from the entrypoint: the SHA still will not
          // check out, the pre-flight still fails. Another container reaches the
          // identical answer and only costs money.
          return {
            kind: "failed",
            detail: `${lastDetail} — a configuration failure, so no sandbox was rebooted`,
            boots: counter.next - 1,
          };
        }
        lastSeen = { state: seen.process, exit_code: code };
        ending = "dead";
        break;
      }
    }

    if (ending === "exhausted") {
      // The orchestrator is still running and this instance is out of looks.
      // Stop it cleanly — never boot a replacement beside a live one.
      await step.do(`${options.label}:drain:${attempt}`, OBSERVE_RETRIES, () =>
        drainAndKill(env, params, name, booted.process_id, boot, offset, seq)
      );
      const detail =
        `the run outlived its observation budget (${context.config.max_observations} looks)`;
      return options.on_exhausted === "fail"
        ? { kind: "failed", detail, boots: counter.next - 1 }
        : {
            kind: "tripped",
            trip: { kind: "budget", budget: "wall_clock", hard: true, detail },
            boots: counter.next - 1,
          };
    }

    // The container is done for. Record why, then boot a replacement whose
    // first instruction reconciles.
    if (attempt < options.max_boots) {
      await step.do(`${options.label}:reconcile:${attempt}`, OBSERVE_RETRIES, async () => {
        await writeReconcileRecord(env.ARTIFACTS, params.project, {
          run_id: params.run_id,
          attempt: boot,
          at: new Date().toISOString(),
          previous: lastSeen,
          detail: lastDetail,
        });
        await logDispatch(env, {
          run_id: params.run_id,
          epic: params.epic,
          decision: `reboot:${boot}`,
          reason: null,
        });
        // Stop paying for the container being written off, and make sure the
        // orchestrator inside it cannot come back to life beside its
        // replacement: exactly one `.tick/` writer per project (D4).
        const binding = sandboxBinding(env);
        if (binding !== null) {
          try {
            const dying = await binding.get(name);
            await dying.killProcess(booted.process_id);
            await dying.destroy();
          } catch (error) {
            console.error(
              `factory run-workflow: ${params.run_id} could not tear down sandbox ${boot}: ${String(error)}`
            );
          }
        }
        return { logged: true };
      });
    }
  }

  return {
    kind: "failed",
    detail: `${lastDetail}; ${options.max_boots} orchestrator boots were not enough`,
    boots: counter.next - 1,
  };
}

/** Last flush before the orchestrator is killed, so its final words survive. */
async function drainAndKill(
  env: Env,
  params: RunWorkflowParams,
  name: string,
  processID: string,
  boot: number,
  offset: number,
  seq: number
): Promise<{ killed: boolean }> {
  const binding = sandboxBinding(env);
  if (binding === null) return { killed: false };
  const sandbox = await binding.get(name);
  try {
    const output = await sandbox.readOutput(processID, offset);
    await writeHarnessSegment(
      env.ARTIFACTS,
      params.project,
      params.run_id,
      boot,
      seq,
      output.text
    );
  } catch (error) {
    console.error(
      `factory run-workflow: ${params.run_id} could not make a final log flush: ${String(error)}`
    );
  }
  await sandbox.killProcess(processID).catch((error: unknown) => {
    console.error(
      `factory run-workflow: ${params.run_id} could not kill its orchestrator: ${String(error)}`
    );
  });
  return { killed: true };
}

// ------------------------------------------------------------ cloud wave ---

/**
 * One `step.do` retry for a batch dispatch, not the usual three.
 *
 * A batch can legitimately run for tens of minutes (`CLOUD_WAVE_WAIT_TIMEOUT_MS`
 * below); a naive retry limit would let a flaky retry TRIPLE a run's worst-case
 * duration for the same reason `supervisePass`'s own boot/observe steps use
 * narrower policies than a quick D1 read does. One retry still recovers a
 * transient failure without compounding a slow one.
 */
const CLOUD_DISPATCH_RETRIES = { retries: { limit: 1, delay: 2_000, backoff: "constant" } } as const;

/**
 * What one worker container in this run may spend: how long its harness may
 * WORK, and how long its wave watches it (tick 5fg).
 *
 * These were one constant — `CLOUD_WAVE_WAIT_TIMEOUT_MS = 30 * 60_000` — and
 * the harness bound was that constant minus the push margin, so every worker
 * got ~29 minutes no matter what the tick was or what the run's own
 * `--max-wall-clock` said. Run run_2e66e765 was submitted with 90 minutes and
 * its three containers were still killed `exit 124` at ~29, each having made
 * 393+ real model calls and committed nothing.
 *
 * Two bounds doing two jobs, derived in the order they actually depend on each
 * other. The AGENT'S budget is decided first, from what the run has LEFT
 * (`workerHarnessBudgetMs`: never more than the run, never more than the
 * deployment's per-worker ceiling, defaulting to the measured 90 minutes); the
 * supervisor's patience is then that budget plus the push margin, which keeps
 * the mechanism that turns a timeout into a pushed branch rather than a
 * destroyed container.
 */
export function cloudWaveBudget(
  config: Pick<RunConfig, "max_wall_clock_ms" | "worker_budget_ms">,
  elapsedMs: number
): { harness_budget_ms: number; wait_timeout_ms: number } {
  const remaining = Math.max(0, config.max_wall_clock_ms - Math.max(0, elapsedMs));
  const harness_budget_ms = workerHarnessBudgetMs({
    remaining_wall_clock_ms: remaining,
    ...(config.worker_budget_ms === null ? {} : { cap_ms: config.worker_budget_ms }),
  });
  return { harness_budget_ms, wait_timeout_ms: waveWaitTimeoutMs(harness_budget_ms) };
}

/** Splits a wave into batches of at most `width`, preserving order. */
export function chunkWave(tickIDs: string[], width: number): string[][] {
  if (width <= 0) return tickIDs.length === 0 ? [] : [tickIDs];
  const batches: string[][] = [];
  for (let i = 0; i < tickIDs.length; i += width) {
    batches.push(tickIDs.slice(i, i + width));
  }
  return batches;
}

/**
 * The stop-and-budget check a cloud wave answers to, at a batch boundary AND
 * while a batch is in flight (tick k24).
 *
 * It is deliberately the same function in both places. The between-batch check
 * used to read only the hard stop record, which meant the budgets this run was
 * given were enforced on the Phase 1 orchestrator path and on NO cloud path at
 * all — a wave could run every batch it was handed at any cost, because the
 * only thing watching the money was `observe`, and a cloud wave never calls it.
 *
 * `detectTrip` is the model, minus the pieces that belong to a single watched
 * PROCESS (log drain, process state). A clean stop is not here on purpose:
 * "clean" means the in-flight work gets its window, and a wave's in-flight
 * work is a container that will finish on its own.
 *
 * ## The lease renewal, and why it belongs here (tick 7n7)
 *
 * The lease was left out of this function as another single-process concern.
 * It is not one: the lease is the RUN's hold on the project, and a container
 * wave is the run working. Nothing else renewed it while a wave ran —
 * `runWaveBatch`'s legs are supervisor-side and touched only sandboxes — so a
 * wave outlived the ten-minute lease `runs.ts` acquires at submit and the run
 * silently stopped being its project's arbiter while its containers worked on.
 *
 * Measured, not reasoned: run_659b7cf253e4462aa6c0dfebbe820ddd ran fifteen
 * `cloud:dispatch` legs from 00:30:35Z to 01:50:59Z — eighty minutes, no
 * lease step between them — and the `wave:1` pass that booted at 01:50:59Z
 * failed its very first renewal and hard-stopped fifteen seconds later. No
 * other run had taken it (the run index shows none started in that window,
 * and the project's lease read back null): it had expired at ~00:40Z and sat
 * unheld for seventy minutes.
 *
 * This is the shared cancellation probe, so it runs on the run's own poll
 * cadence inside every leg's wait AND at every between-batch checkpoint —
 * which is exactly the cadence a heartbeat wants. The ttl asked for outlives a
 * whole leg, so a leg that dispatches without waiting (and therefore never
 * polls) still cannot let the lease lapse underneath it.
 *
 * A renewal that could not be MADE is not a trip — same fail-open rule as
 * `hardStopRecord` and `waveCanceller`. A renewal that came back lost is.
 */
/**
 * The shared, in-memory state one wave's checks pass between themselves.
 *
 * Not checkpointed and not meant to be. `complained` dedupes a log line;
 * `renewed_at_ms` paces the lease heartbeat. Both are safe to lose on a
 * replay: a fresh object costs one extra log line and one extra renewal, and
 * neither changes what the wave decides.
 */
export type WaveWatch = {
  complained: boolean;
  /** When the lease was last renewed, so the heartbeat runs on its own cadence. */
  renewed_at_ms?: number;
};

/**
 * The run's heartbeat on its project, at the cadence a heartbeat wants
 * (tick 7n7).
 *
 * `runs.ts` acquires the dispatch lease for ten minutes and everything after
 * that depends on something renewing it. `observe` does that on the
 * watched-orchestrator path. On the container-wave path NOTHING did — a leg
 * only ever addressed sandboxes — so a wave of real containers, sixty to
 * ninety minutes of it, ran its whole length under a lease that had lapsed
 * after ten, and the run silently stopped being its project's arbiter while
 * its containers worked on. Measured on run_659b7cf2: fifteen dispatch legs,
 * 00:30:35Z to 01:50:59Z, with no lease step between any of them.
 *
 * It hangs off `cloudWaveTrip` because that is the one thing already called
 * from everywhere a wave passes through — every batch boundary and, as the
 * shared cancellation probe, every poll of every leg. But it must NOT run at
 * that function's rate: the probe polls on the run's own cadence (15s
 * deployed, 25ms under test), and one RunRoom write plus one DO alarm re-arm
 * per poll is both pointless — the ttl is three legs long — and heavy enough
 * to wedge the shared workerd runtime the suite runs in. So it renews once
 * per third of a ttl and is a free no-op the rest of the time.
 *
 * Returns the loss when a renewal came back lost, `null` otherwise. A renewal
 * that could not be MADE is not a loss: same fail-open rule as
 * `hardStopRecord` and `waveCanceller` — a failed read has never been a stop.
 */
async function waveLeaseHeartbeat(
  env: Env,
  params: RunWorkflowParams,
  context: RunContext,
  watch: WaveWatch
): Promise<{ lost: LeaseLostReason; holder: string | null } | null> {
  const ttl = renewalTtl(context.config.wave_leg_ms);
  const now = Date.now();
  // A third of the ttl: two whole heartbeats may be missed — to a slow leg, a
  // failed read, a replayed step — before the lease is anywhere near lapsing.
  if (watch.renewed_at_ms !== undefined && now - watch.renewed_at_ms < ttl / 3) return null;

  const renewal = await renewRunLease(env, params, ttl);
  if (renewal === null) return null;
  if (renewal.ok) {
    watch.renewed_at_ms = now;
    return null;
  }
  return { lost: renewal.lost, holder: renewal.holder };
}

async function cloudWaveTrip(
  env: Env,
  params: RunWorkflowParams,
  context: RunContext,
  telemetry: WaveWatch
): Promise<Trip | null> {
  const stop = await hardStopRecord(env, params);
  if (stop !== null) {
    return {
      kind: "stop",
      hard: true,
      detail: `a hard stop requested by ${stop.requested_by} at ${stop.requested_at} stands`,
    };
  }

  const renewal = await waveLeaseHeartbeat(env, params, context, telemetry);
  if (renewal !== null) return leaseLostTrip(renewal);

  const elapsed = Date.now() - context.started_at_ms;
  if (elapsed >= context.config.max_wall_clock_ms) {
    return {
      kind: "budget",
      budget: "wall_clock",
      hard: true,
      detail:
        `the wall-clock budget is exhausted: ${Math.round(elapsed / 1000)}s of ` +
        `${Math.round(context.config.max_wall_clock_ms / 1000)}s`,
    };
  }

  // Ground truth from the gateway logs, exactly as `detectTrip` reads it. A
  // failed read leaves the last known number standing and is complained about
  // ONCE per wave — this runs on the poll cadence, and a per-read log would
  // bury the run's output in the same line a few thousand times.
  const spend = await syncRunCost(env, params.run_id);
  if (!spend.ok && !telemetry.complained) {
    telemetry.complained = true;
    console.error(
      `factory run-workflow: ${params.run_id} could not read gateway spend for its cloud wave: ` +
        `${spend.detail}`
    );
  }
  const run = await getRun(env.DB, params.run_id).catch(() => null);
  const cost = run?.cost_usd ?? 0;
  if (cost >= context.config.max_cost_usd) {
    return {
      kind: "budget",
      budget: "cost",
      hard: true,
      detail: `the cost budget is exhausted: $${cost.toFixed(2)} of $${context.config.max_cost_usd.toFixed(2)}`,
    };
  }

  return null;
}

/**
 * A mid-batch cancellation, back as the trip that caused it.
 *
 * A `step.do` result is what survives a Workflow replay, so the reason a batch
 * was cancelled has to travel inside the step's return value — a variable the
 * step's callback closed over is simply not re-assigned when the step replays
 * from its checkpoint, and the run would sail on into the next batch of a
 * stopped wave. `reason` is the same string the credential revocation is
 * recorded under, so the two can never describe different stops.
 */
function tripFromCancellation(cancellation: WaveCancellation): Trip {
  if (cancellation.reason === "budget:cost") {
    return { kind: "budget", budget: "cost", hard: true, detail: cancellation.detail };
  }
  if (cancellation.reason === "budget:wall_clock") {
    return { kind: "budget", budget: "wall_clock", hard: true, detail: cancellation.detail };
  }
  return { kind: "stop", hard: true, detail: cancellation.detail };
}

/**
 * What a cancellation cost this wave, counted rather than implied (tick 7zk).
 *
 * Run `run_f7bd5a36` reported three ticks as `no-commits` with
 * `branch_exists: false`. That is true and it reads like three containers that
 * did nothing, when in fact all three were working, all three were destroyed
 * mid-tick, and the run had just spent its entire $8.00 allowance producing
 * them. A silent `no-commits` is the wrong shape of fact for the most
 * expensive failure this substrate has.
 */
export type CloudWaveLoss = {
  /** Containers that were still working when the wave was cancelled. */
  mid_work: number;
  /** Of those, the ones whose branch carries work: the grace window paid. */
  rescued: string[];
  /** Of those, the ones destroyed with nothing on their branch: the work is gone. */
  lost: string[];
};

/**
 * Counts what a cancelled wave destroyed while it was still working.
 *
 * Mid-work is decided by what the container was DOING, never by the verdict: a
 * tick whose worker was `running` when the wave was cancelled was mid-work
 * whether or not its salvage then landed anything, and folding the two
 * together is how "we destroyed live work" disappears into "the branch is
 * empty".
 */
export function cloudWaveLoss(outcomes: WorkerWaveOutcome[]): CloudWaveLoss {
  const rescued: string[] = [];
  const lost: string[] = [];
  let mid = 0;
  for (const outcome of outcomes) {
    if (outcome.cancelled === null || !outcome.launched) continue;
    // Either the wait caught it running, or the salvage window found something
    // alive to ask. A container already over when the wave stopped lost
    // nothing and is not counted.
    const working =
      outcome.salvage?.requested === true ||
      (outcome.salvage === undefined && outcome.wait?.state === "running");
    if (!working) continue;
    mid += 1;
    if (outcome.collect.branch_exists && outcome.collect.commits > 0) {
      rescued.push(outcome.collect.tick_id);
    } else {
      lost.push(outcome.collect.tick_id);
    }
  }
  return { mid_work: mid, rescued, lost };
}

/**
 * The same counts as a sentence an operator reads in the run's outcome.
 *
 * Empty when nothing was mid-work, so an ordinary stop between batches does
 * not grow a clause about destruction that did not happen.
 */
export function describeCloudWaveLoss(loss: CloudWaveLoss): string {
  if (loss.mid_work === 0) return "";
  const parts = [`${loss.mid_work} container(s) were still working when they were cut`];
  if (loss.rescued.length > 0) {
    parts.push(
      `${loss.rescued.length} pushed what they had inside the salvage window ` +
        `(${loss.rescued.join(", ")})`
    );
  }
  if (loss.lost.length > 0) {
    parts.push(
      `${loss.lost.length} were DESTROYED MID-WORK with nothing on their branch, so that ` +
        `work is lost and the run paid for it (${loss.lost.join(", ")})`
    );
  }
  return parts.join("; ");
}

/** A short, greppable summary of what a wave's containers actually did. */
export function summarizeCloudWave(outcomes: WorkerWaveOutcome[]): string {
  const counts = new Map<string, number>();
  for (const outcome of outcomes) {
    // A tick the reconcile settled and one this wave adopted are both reported
    // as what they are, never folded into "not-launched": an operator reading
    // a recovered run has to be able to see which containers it did not have
    // to boot (tick s7f).
    const label =
      outcome.settled !== undefined
        ? outcome.settled
        : outcome.adopted
          ? `${outcome.collect.verdict} (adopted)`
          : outcome.launched
            ? outcome.collect.verdict
            : "not-launched";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, n]) => `${n} ${label}`)
    .join(", ");
}

/**
 * How long ONE dispatch leg may watch a wave's containers.
 *
 * The number this exists to respect is Cloudflare's: a Workflow step may
 * EXECUTE for ten minutes (`WORKFLOW_STEP_TIMEOUT_MS`), and a step that runs
 * longer kills the whole instance — supervisor, run record, lease and all
 * (tick 2xm, src/workflow-limits.ts). A wave's containers work for up to
 * ninety minutes, so the wait is spread across legs of this length instead of
 * being one blocking call.
 *
 * `STEP_WORK_BUDGET_MS` is what a step may be sized for; the minute held back
 * here is for everything the leg does BESIDES waiting — the reconcile's git
 * reads, the collect at the end of each container's cycle, the teardowns, and
 * the R2 write of the leg's outcomes.
 *
 * `DEFAULT_SALVAGE_GRACE_MS` is held back on top of it (tick 7zk). A leg that
 * is cancelled at its very last second then holds every container's grace
 * window open INSIDE the same step, and a leg sized without it would put the
 * one step that matters most — the one ending a run that has just spent its
 * whole budget — past the cap that kills the supervisor. The window is only
 * ever paid on a cancelled leg; the arithmetic has to survive it anyway.
 */
export const WAVE_LEG_MS = STEP_WORK_BUDGET_MS - 60_000 - DEFAULT_SALVAGE_GRACE_MS;

/**
 * The most legs one batch may burn.
 *
 * A backstop, not a budget: the wave's real bound is `wait_timeout_ms` (the
 * worker budget plus the push margin) and the run's own wall clock, both
 * enforced below. This only stops a pathological batch from spending the
 * Workflow instance's whole step allowance — at a full leg it is more than
 * four hours of watching, well past any wave budget this deployment can issue.
 */
export const MAX_WAVE_LEGS = 40;

/**
 * How many times one tick may have a container STARTED for it inside a batch.
 *
 * A leg that finds a tick's container gone redispatches it — that is the
 * eviction recovery the reconcile protocol exists for (tick s7f). Unbounded,
 * across a dozen legs, it is also a way to boot a dozen containers for one
 * tick that cannot stay up. Two attempts: the first one, and the recovery.
 */
export const MAX_WORKER_DISPATCHES = 2;

/**
 * The bounded waits inside ONE dispatch leg's step, budgeted together.
 *
 * Two independently reasonable timeouts — a green-start probe sized for a cold
 * container and a dispatch confirm sized for a harness launch — summed to 598s
 * of the 600s a step may execute for, which is a step with no room for the
 * reconcile in front of it. Sizing the probe for the width this wave actually
 * runs at (`probeTimeoutMs`) is what buys the room back; `shareStepBudget` is
 * the backstop that keeps the sum inside the cap for any width at all.
 */
export function waveSpawnBudget(width: number): {
  probe_timeout_ms: number;
  confirm_timeout_ms: number;
} {
  const shared = shareStepBudget(
    { probe: probeTimeoutMs(width), confirm: DEFAULT_CONFIRM_TIMEOUT_MS },
    `a cloud wave ${width} container(s) wide`
  );
  return { probe_timeout_ms: shared.probe!, confirm_timeout_ms: shared.confirm! };
}

/** What one batch of a wave did, folded across every leg it took. */
type WaveBatchOutcome = {
  /** One per tick in the batch, each from the leg that settled it. */
  outcomes: WorkerWaveOutcome[];
  /** Set when a stop or a budget cancelled the batch mid-flight. */
  cancelled: WaveCancellation | null;
  /** The reconcile summary leg 0 drew, for the dispatch log. */
  reconcile: string;
  /** Every leg's reconcile summary, in order — what each one found still live. */
  legs: string[];
};

/**
 * Runs one batch of a cloud wave, across as many bounded steps as it takes.
 *
 * THE SHAPE, and why it is not one step (tick 2xm). `dispatchWave` blocks
 * until every container in the batch settles, and since tick 5fg that is up to
 * ninety-one minutes. A Cloudflare Workflow step may EXECUTE for ten. The
 * previous version of this code called `dispatchWave` inside a single
 * `step.do`, so every real wave killed its own supervisor at minute ten:
 * `status: errored, "Execution timed out after 600000ms"`, run record frozen
 * at `running`, lease unrenewed, containers orphaned and still spending. Both
 * live fan-out runs died exactly there.
 *
 * So a batch is a sequence of LEGS, each its own step, each sized to fit
 * inside the cap:
 *
 *  - **leg 0 dispatches.** Reconcile, then boot the containers that need
 *    booting and confirm their work started — and wait zero. Its cost is the
 *    probe plus the confirm, budgeted together by `waveSpawnBudget`.
 *  - **later legs watch.** Reconcile again, adopt every container that is
 *    still running, and wait one `WAVE_LEG_MS`. A container still working when
 *    the leg ends is LEFT RUNNING (`on_wait_timeout: "leave"`) for the next
 *    leg to adopt; nothing is torn down for the crime of outliving a step.
 *  - **the last leg is the wave's deadline.** It waits with the default
 *    `teardown` policy, so a container that outlived the whole wave budget is
 *    killed exactly as it always was.
 *
 * Every leg re-establishes the wave from the DURABLE LAYER — manifests, git,
 * the container's own process list — rather than from anything held in a
 * closure, because a step that was in flight when the isolate died runs again
 * from the top and a resumed Workflow has none of the previous attempt's
 * memory. That is the same `reconcileWave` call the single-step version made
 * for the same reason (tick s7f); it now runs once per leg instead of once per
 * batch, which is what turns "the supervisor died mid-wave" from a special
 * case into the ordinary flow of control.
 *
 * What did NOT change, because a wave that cannot be stopped is worse than a
 * wave that dies: cancellation is still `cloudWaveTrip` through a shared
 * `waveCanceller` polled on the run's own cadence INSIDE each leg, the
 * credential is still revoked before any teardown (tick gyl's ordering), a
 * cancelled container is still torn down before anything else is done with it,
 * and the outcomes of every leg are still written to R2 at the return site so
 * a failing wave stays diagnosable (tick ys3).
 */
async function runWaveBatch(
  env: Env,
  step: WorkflowStep,
  params: RunWorkflowParams,
  context: RunContext,
  plan: CloudWavePlan,
  collector: WorkerCollector,
  batch: string[],
  input: {
    wave: number;
    index: number;
    tag: string;
    token: string;
    telemetry: WaveWatch;
    cancel_poll_ms: number;
  }
): Promise<WaveBatchOutcome> {
  const label = `${input.tag}${input.index}`;
  const batchNumber = input.wave * 1000 + input.index + 1;
  const spawnBudget = waveSpawnBudget(plan.width);
  const legMs = context.config.wave_leg_ms;

  /** The outcome that stands for each tick, replaced as later legs learn more. */
  const merged = new Map<string, WorkerWaveOutcome>();
  /** How far each container's output has been streamed, so no leg re-streams it. */
  const offsets = new Map<string, number>();
  /** Containers started per tick, against `MAX_WORKER_DISPATCHES`. */
  const dispatches = new Map<string, number>();
  const legs: string[] = [];
  /** The ticks still being watched — every leg after the first acts only on these. */
  let pending = [...batch];
  let cancelled: WaveCancellation | null = null;
  let firstPlan = "";
  /** Leg 0's clock, and the wave window it computed. Both checkpointed values. */
  let startedAtMs = 0;
  /** When the leg that just ran started, on the same checkpointed clock. */
  let lastLegAtMs = 0;
  let waveWaitMs = 0;
  let legCount = 2;

  for (let leg = 0; leg < legCount && pending.length > 0; leg++) {
    // The last leg is the wave's deadline: it may not start new containers, and
    // whatever is still running when it ends is killed rather than left for a
    // leg that will not come.
    // Projected from CHECKPOINTED clocks — the leg that just ran reported the
    // time it started — never from a live `Date.now()`, so a replayed Workflow
    // decides the same legs are final as the original run did.
    const projectedEndMs = lastLegAtMs === 0 ? 0 : lastLegAtMs + legMs;
    const final =
      leg === legCount - 1 || (waveWaitMs > 0 && projectedEndMs - startedAtMs >= waveWaitMs);
    // Leg 0 keeps the original, unprefixed step name so a run in flight across
    // a deploy replays its checkpoint rather than re-dispatching its batch.
    const name = leg === 0 ? `cloud:dispatch:${label}` : `cloud:dispatch:${label}:${leg}`;
    const legTicks = [...pending];
    const priorOutcomes = [...merged.values()].filter(
      (outcome) => !legTicks.includes(outcome.collect.tick_id)
    );
    const adoptOffsets = Object.fromEntries(offsets);
    const started = Object.fromEntries(dispatches);

    const ran = await step.do(name, CLOUD_DISPATCH_RETRIES, async () => {
      const binding = sandboxBinding(env);
      if (binding === null) throw new Error("the SANDBOXES binding disappeared mid-run");
      const taskFor = (tick: string) => workerTask(params.epic, tick, params.base_sha);
      const sandboxNameFor = (tick: string) => workerSandboxName(params.run_id, tick);
      const at_ms = Date.now();

      // The reconcile protocol, run INSIDE this step and on every attempt at
      // it (tick s7f).
      //
      // That placement is the whole point. A Workflow step that completes is
      // checkpointed and never runs again, but a step that was IN FLIGHT when
      // the isolate died runs from the top — and this is the step that boots
      // containers. Without a reconcile here, a supervisor replacing one that
      // died mid-batch addresses the same per-tick sandbox names and starts a
      // second worker process in each of them, on the same branch, with the
      // first one still working. A reconcile hoisted into its own step would
      // be no better: its verdict would be the checkpointed one, taken before
      // the containers it describes existed.
      //
      // So the evidence is re-established from the durable layer every time
      // this step runs, and only the ticks the plan says to dispatch are
      // dispatched. Since tick 2xm that is once per LEG rather than once per
      // batch, which is what lets leg N+1 pick up exactly the containers leg N
      // left running.
      const reconciled = await reconcileWave({
        bucket: env.ARTIFACTS,
        project: params.project,
        run_id: params.run_id,
        epic: params.epic,
        tick_ids: legTicks,
        binding,
        collector,
        sandboxNameFor,
        taskFor,
      });
      const adopted = adoptions(reconciled);
      // A container is started for a tick only while the batch has attempts
      // left for it, and never on the final leg: the wave is ending, and a
      // container booted into the last few seconds of it is pure spend.
      const fresh = final
        ? []
        : dispatchable(reconciled)
            .map((item) => item.tick_id)
            .filter((tick) => (started[tick] ?? 0) < MAX_WORKER_DISPATCHES);
      const acting = new Set([...fresh, ...adopted.keys()]);
      const tasks = legTicks.filter((tick) => acting.has(tick)).map(taskFor);
      // Every tick the plan left alone, reported with the evidence that left
      // it alone — never dropped. A tick missing from a wave's outcomes is a
      // tick the board and the run record cannot account for.
      const untouched = settled(reconciled).map((item) =>
        settledOutcome(item, taskFor(item.tick_id))
      );
      // What this batch's containers may spend, computed HERE rather than
      // hoisted: a Workflow step that ran, died and re-ran has to be sized by
      // the wall clock the run has left NOW, not by what it had left when the
      // wave started. Recomputed per batch — and per leg — for the same
      // reason: batch 3 does not get batch 1's allowance, and a container
      // booted by leg 6 does not get leg 0's.
      const waveBudget = cloudWaveBudget(context.config, Date.now() - context.started_at_ms);
      // A leg either DISPATCHES or WAITS, never both, and that is what keeps
      // it inside the step cap: spawning costs the probe plus the confirm, and
      // a leg that then also waited a full leg would be sized past ten
      // minutes — the exact arithmetic this tick exists to fix, one layer
      // down. A leg that started something hands the waiting to the next one.
      const waitMs = fresh.length > 0 ? 0 : legMs;
      // One canceller for the whole leg, built fresh inside the step so a
      // retry of it gets a fresh one rather than an already-latched verdict.
      const cancel = waveCanceller(
        async () => {
          const trip = await cloudWaveTrip(env, params, context, input.telemetry);
          return trip === null ? null : { reason: tripRevokeReason(trip), detail: trip.detail };
        },
        {
          poll_ms: input.cancel_poll_ms,
          // The money dies before the containers do. Destroying a container is
          // the stronger stop but also the slower one, and every second of
          // teardown is a second the harness inside it can still spend — so
          // the credential is revoked the instant the wave is found cancelled,
          // ahead of the teardowns (tick gyl's ordering, at wave scale). The
          // step-level revoke below is the durable, replay-safe half.
          on_cancel: async (cancellation) => {
            await revokeRunTokens(env, params.run_id, cancellation.reason);
          },
        }
      );
      const batch_outcomes = await dispatchWave(
        binding,
        (tickID) => workerSandboxName(params.run_id, tickID),
        tasks,
        (task) =>
          workerWorkSpec({
            repo_url: context.repo_url,
            // The PLAN's base, not the submission's: wave 2 stands on wave 1's
            // merged work (tick wiy).
            base_sha: plan.base_sha,
            epic: params.epic,
            tick: task.tick_id,
            run_id: params.run_id,
            gateway_base_url: context.gateway_base_url,
            gateway_token: input.token,
            // Resolved, not spread: a worker's route always has a concrete
            // answer, and the ladder that produces it is
            // run submission > deployment var > built-in default (tick 1cd).
            // `context.config.harness`/`.model` are the run's own choice and
            // still win; `RUN_WORKER_*` is this deployment's standing one;
            // `WORKER_DEFAULT_*` is the floor. The orchestrator's own boot
            // above deliberately does NOT read the worker vars — it is not a
            // worker, and giving it their model was never the question.
            harness: workerHarness(context.config.harness, context.config.worker_harness),
            model: workerModel(context.config.model, context.config.worker_model),
            ...(env.GITHUB_TOKEN === undefined ? {} : { github_token: env.GITHUB_TOKEN }),
            sandbox_image: context.sandbox_image,
            harness_budget_ms: waveBudget.harness_budget_ms,
            // Into the container, so everything it prints and every `tk` it
            // runs belongs to a chain a reader can name (tick hyi).
            ...(params.trace_id === undefined ? {} : { trace_id: params.trace_id }),
          }),
        {
          wait_timeout_ms: waitMs,
          // A leg shorter than the default look interval must still get a
          // look: `waitForWorker` checks its deadline between polls, so a
          // 15-second poll inside a shorter leg would overrun the leg it is
          // supposed to bound. Real legs are minutes long and keep the
          // default cadence unchanged.
          wait_poll_ms: waitMs > 0 ? Math.min(DEFAULT_WAIT_POLL_MS, waitMs) : DEFAULT_WAIT_POLL_MS,
          // Everything still working when this leg's wait ends is left exactly
          // as it is, for the next leg's reconcile to adopt — unless this is
          // the wave's last leg, which IS the deadline and kills what it finds.
          on_wait_timeout: final ? "teardown" : "leave",
          ...spawnBudget,
          cancel,
          adopt: (task) => {
            const adoption = adopted.get(task.tick_id);
            if (adoption === undefined) return null;
            const offset = adoptOffsets[task.tick_id];
            // The cursor the PREVIOUS leg reached, so a ninety-minute wave
            // streams each container's output once instead of once per leg.
            return offset === undefined ? adoption : { ...adoption, output_offset: offset };
          },
          // The manifest lands before each container is addressed, so the
          // next reconcile — this step's own retry, and every later leg —
          // can see it.
          record: manifestRecorder(env.ARTIFACTS, params.project, {
            run_id: params.run_id,
            epic: params.epic,
            batch: batchNumber,
            // Recorded on the manifest AND written as the head of the
            // container's log stream, before the container is addressed. The
            // manifest says what was dispatched; the banner puts the same id
            // in the text an operator reads. A container that dies before it
            // prints anything still leaves both (tick hyi).
            ...(params.trace_id === undefined ? {} : { trace_id: params.trace_id }),
          }),
          // Each container's own stdout/stderr, streamed to its own R2 key as
          // it appears (tick 0fg). The orchestrator sandbox has had this since
          // D20; a worker's went nowhere, so a container that died at boot took
          // the one message that explained it with it. One sink for the wave,
          // one stream per tick: a shared key would interleave the batch's
          // containers into nonsense.
          ...(env.ARTIFACTS === undefined
            ? {}
            : { logs: workerLogSink(env.ARTIFACTS, params.project, params.run_id) }),
        },
        collector
      );
      const all_outcomes = [...batch_outcomes, ...untouched];

      // Record what dispatch actually returned, before anything interprets it.
      //
      // Tick ys3 twice instrumented a branch the live failure did not take, and
      // seven live runs produced no diagnosis. This is at the return site, so
      // whatever path an outcome came from it is in this array. The batch's
      // whole picture is written, not just this leg's, so the artifact reads
      // as the state of the batch rather than of whichever leg wrote last.
      // Best-effort: a wave must not fail because its telemetry could not be
      // written.
      if (env.ARTIFACTS !== undefined) {
        try {
          await writeWaveOutcomes(env.ARTIFACTS, params.project, params.run_id, batchNumber, [
            ...priorOutcomes,
            ...all_outcomes,
          ]);
        } catch (error) {
          console.error(
            `factory run-workflow: ${params.run_id} could not record batch ${input.index + 1} ` +
              `leg ${leg} outcomes: ${String(error)}`
          );
        }
      }

      return {
        outcomes: all_outcomes,
        cancelled: cancel.cancelled,
        reconcile: reconciled.summary,
        at_ms,
        wait_timeout_ms: waveBudget.wait_timeout_ms,
        dispatched: fresh,
      };
    });

    legs.push(ran.reconcile);
    lastLegAtMs = ran.at_ms;
    if (leg === 0) {
      firstPlan = ran.reconcile;
      startedAtMs = ran.at_ms;
      waveWaitMs = ran.wait_timeout_ms;
      // Enough legs to cover the wave's own window, plus one for the leg that
      // only dispatched and one for the recovery leg an evicted container
      // costs. Bounded by `MAX_WAVE_LEGS` whatever the arithmetic says.
      legCount = Math.min(
        MAX_WAVE_LEGS,
        2 + Math.ceil(Math.max(waveWaitMs, 0) / Math.max(legMs, 1))
      );
    }
    for (const tick of ran.dispatched) dispatches.set(tick, (dispatches.get(tick) ?? 0) + 1);

    const stillRunning: string[] = [];
    for (const outcome of ran.outcomes) {
      const tick = outcome.collect.tick_id;
      merged.set(tick, outcome);
      const streamed = outcome.wait?.offset ?? outcome.output_offset ?? 0;
      offsets.set(tick, Math.max(offsets.get(tick) ?? 0, streamed));
      // A container this leg LEFT RUNNING: its wait ran out with nothing
      // wrong, so it is mid-tick and the next leg adopts it. Anything else —
      // a terminal state, a container that vanished, a failed probe, a
      // cancellation — is this tick's answer for the batch.
      if (
        outcome.launched &&
        outcome.settled === undefined &&
        outcome.wait !== null &&
        outcome.wait.timed_out &&
        outcome.wait.cancelled === null
      ) {
        stillRunning.push(tick);
      }
    }
    pending = stillRunning;

    if (ran.cancelled !== null) {
      cancelled = ran.cancelled;
      break;
    }
  }

  return {
    outcomes: batch.map(
      (tick) =>
        merged.get(tick) ??
        settledOutcome(
          {
            tick_id: tick,
            class: "unknown",
            action: "inspect",
            redispatch: false,
            adopt_process_id: null,
            reason:
              "the wave's legs ended without an outcome for this tick — nothing may vanish " +
              "from a batch's account",
            contradictions: [],
            evidence: {
              tick_id: tick,
              manifest: null,
              report: null,
              liveness: NOT_ASKED,
              branch: workerTask(params.epic, tick, params.base_sha).branch,
              sandbox_name: workerSandboxName(params.run_id, tick),
            },
          },
          workerTask(params.epic, tick, params.base_sha)
        )
    ),
    cancelled,
    reconcile: firstPlan,
    legs,
  };
}

/**
 * Dispatches a run's cloud wave: one container per tick, `plan.width` at a
 * time, through `dispatchWave` (0ds) — the call site tick b6e exists to wire
 * up.
 *
 * Returns a `PassOutcome` so `superviseRun` can fold it into the SAME
 * outcome-derivation logic the harness-substrate pass already has, rather
 * than growing a second one. Both endings send `superviseRun` down its
 * existing closeout leg — per-tick workers only implement and push (tap);
 * nothing merges, runs the integrated gate, or does epic-level review and
 * closeout the way a Phase 1 orchestrator does before it exits 0, so a REAL
 * orchestrator boot in `closeout` phase is mandatory after every cloud wave,
 * not just an interrupted one — but they arrive as DIFFERENT outcomes:
 *
 * - a mid-wave stop is `tripped`, and the run is stopping;
 * - a wave that dispatched every batch is `handoff`, and the run is not.
 *
 * Tick 074 is that distinction. While both were `tripped`, the mandatory
 * closeout made every successful wave terminate in `stopped` — technically
 * true of the code path and false about the run, which is the class of signal
 * that has already cost this session real time on `tk cloud trace` (c5i).
 *
 * Budgets and stops are enforced at BOTH scales (tick k24): `cloudWaveTrip`
 * runs between batches, and the same function is the wave's shared
 * cancellation probe while a batch is in flight, so an operator's hard stop or
 * a blown budget no longer waits for up to `max_instances` containers to
 * finish. This repo has paid for that lesson twice already — cts (a budget
 * that could not trip) and gyl (a kill switch a reboot undid) — and both times
 * the enforcement existed somewhere that could not act in time.
 */
export async function superviseCloudWave(
  env: Env,
  step: WorkflowStep,
  params: RunWorkflowParams,
  context: RunContext,
  plan: CloudWavePlan,
  /**
   * Which wave of this run's epic this is — 0 for the submitted one, then 1, 2
   * … as its orchestrator asks for more (tick wiy).
   *
   * It is in every step name below, and that is not cosmetic: a Workflow
   * identifies a checkpoint by its step name, so a second wave reusing
   * `cloud:dispatch:0` would replay the FIRST wave's checkpointed result and
   * dispatch nothing at all while reporting that it had.
   */
  wave: number = 0
): Promise<PassOutcome> {
  const collector = workerCollector(env, params.project);
  const batches = chunkWave(plan.tick_ids, plan.width);
  // The step-name namespace for this wave. Wave 0 keeps the original,
  // unprefixed names so a run in flight across a deploy replays its
  // checkpoints rather than re-dispatching its first wave.
  const tag = wave === 0 ? "" : `${wave}:`;
  const outcomes: WorkerWaveOutcome[] = [];
  // How often a batch in flight looks for a reason to stop: the run's own
  // observation cadence, so a deployment that tightens one tightens both.
  const cancelPollMs = context.config.poll_interval_ms ?? MIN_POLL_MS;
  const telemetry: WaveWatch = { complained: false };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;

    // Mirrors `supervisePass`'s own killcheck: a hard stop that stands — or a
    // budget already spent — refuses to credential ANOTHER batch, the same way
    // it refuses to credential another orchestrator boot (tick gyl).
    const standing = await step.do(`cloud:killcheck:${tag}${i}`, OBSERVE_RETRIES, () =>
      cloudWaveTrip(env, params, context, telemetry)
    );
    if (standing !== null) {
      await step.do(`cloud:killrevoke:${tag}${i}`, OBSERVE_RETRIES, async () => {
        const revoked = await revokeRunTokens(env, params.run_id, tripRevokeReason(standing));
        return { revoked };
      });
      return {
        kind: "tripped",
        trip: {
          ...standing,
          detail:
            `${standing.detail}, so no further cloud workers were dispatched ` +
            `(${outcomes.length}/${plan.tick_ids.length} already ran)`,
        },
        boots: outcomes.length,
      };
    }

    // One credential per BATCH, shared by every worker dispatched concurrently
    // in it — never one per worker. `issueRunToken` revokes the run's previous
    // token as part of minting a new one (D17's rotation), so calling it once
    // per worker would have concurrent workers killing each other's gateway
    // access mid-run.
    const credential = await step.do(`cloud:credential:${tag}${i}`, BOOT_RETRIES, () =>
      issueRunToken(env, {
        run_id: params.run_id,
        tick_id: params.epic,
        // Wave and batch, so two waves' batches are distinguishable in the
        // gateway's own logs rather than both reading as `attempt: 1`.
        attempt: wave * 1000 + i + 1,
      })
    );

    // The board learns which ticks are in flight BEFORE the containers are
    // booted, because a wave that boots and then wedges is exactly the run an
    // operator needs to see the shape of. One publish per batch, never one per
    // tick: a wave's events are generated together and one DO hop carries them.
    await step.do(`cloud:events:started:${tag}${i}`, OBSERVE_RETRIES, async () =>
      publishRunEvents(
        env,
        params.project,
        batch.map((tick) =>
          tickStarted({
            epic: params.epic,
            tick,
            batch: i + 1,
            ...(params.trace_id === undefined ? {} : { trace_id: params.trace_id }),
          })
        )
      )
    );

    const ran = await runWaveBatch(env, step, params, context, plan, collector, batch, {
      wave,
      index: i,
      tag,
      token: credential.token,
      telemetry,
      cancel_poll_ms: cancelPollMs,
    });
    const dispatched = { outcomes: ran.outcomes, cancelled: ran.cancelled };
    await step.do(`cloud:reconciled:${tag}${i}`, OBSERVE_RETRIES, async () => {
      // `ran.reconcile` is the PLAN leg 0 drew, established from the durable
      // layer BEFORE this batch's containers were addressed (the big comment
      // above `reconcileWave` explains why it has to run there). This step
      // logs it only after every leg has finished, so by wall clock it lands
      // after whatever the dispatch attempt did — a probe failure included.
      // "cloud_reconcile_plan" names it as the pre-dispatch snapshot it is: a
      // bare "cloud_reconcile:1:1 never-dispatched" sitting after a
      // "task-started" line reads as a post-dispatch verdict ("the container
      // was never dispatched") when it is really the trivial, correct fact
      // that nothing had been dispatched YET when the plan was drawn (tick
      // ys3; same misread class as 074 and c5i — technically true, reliably
      // misread).
      await logDispatch(env, {
        run_id: params.run_id,
        epic: params.epic,
        decision: `cloud_reconcile_plan:${tag}${i + 1}:${ran.reconcile}`,
        reason: null,
      });
      // What the batch cost in STEPS, and what each leg found when it
      // re-established the wave from the durable layer (tick 2xm). A wave that
      // needed more than one leg is the normal case for real containers — a
      // tick takes longer than the ten minutes one step may execute for — and
      // this line is how an operator sees that the supervisor watched it the
      // whole way instead of dying inside a single blocking step.
      if (ran.legs.length > 1) {
        await logDispatch(env, {
          run_id: params.run_id,
          epic: params.epic,
          decision: `cloud_wave_legs:${tag}${i + 1}:${ran.legs.length}:${ran.legs.join(" | ")}`,
          reason: null,
        });
      }
      return { logged: true };
    });
    outcomes.push(...dispatched.outcomes);

    // What the DURABLE LAYER said about each tick, never what its container
    // printed or its report claimed: `success` on the board is
    // `verdict === "ready-to-merge"` and nothing else (tick bne). A worker
    // that writes STATUS: DONE onto a branch with no commits is the case
    // collect exists to catch, and a board that believed the report would be
    // drawing green over an empty branch.
    //
    // Published BEFORE the cancellation return (tick k24) on purpose: a wave
    // cancelled mid-batch is exactly when an operator most needs the board to
    // show what the containers that did run actually produced. Returning first
    // would hide a cancelled batch's real outcomes behind the cancellation.
    await step.do(`cloud:events:collected:${tag}${i}`, OBSERVE_RETRIES, async () =>
      publishRunEvents(
        env,
        params.project,
        dispatched.outcomes.map((outcome) => {
          // A tick the reconcile settled without addressing a container was
          // not "not-launched": its verdict is what the durable layer said
          // about it, and an `already-landed` tick showing as unlaunched
          // would draw a merged branch as a failure (tick s7f).
          const reported = outcome.launched || outcome.settled !== undefined;
          return tickCompleted({
            epic: params.epic,
            tick: outcome.collect.tick_id,
            verdict: reported ? outcome.collect.verdict : "not-launched",
            status: outcome.collect.status,
            detail: reported ? outcome.collect.detail : outcome.detail,
            ...(params.trace_id === undefined ? {} : { trace_id: params.trace_id }),
          });
        })
      )
    );

    if (dispatched.cancelled !== null) {
      const trip = tripFromCancellation(dispatched.cancelled);
      // Idempotent with the canceller's own revoke: that one is fast, this one
      // is checkpointed, and a replayed Workflow only ever runs the second.
      await step.do(`cloud:cancelrevoke:${tag}${i}`, OBSERVE_RETRIES, async () => {
        const revoked = await revokeRunTokens(env, params.run_id, tripRevokeReason(trip));
        return { revoked };
      });
      // What the cancellation destroyed, said out loud (tick 7zk). A budget
      // trip is the most expensive failure this substrate has — the run has by
      // definition just spent its entire allowance — and until this line the
      // only account of it was three ticks reading `no-commits`, which is what
      // a container that never started looks like. The loss is counted from
      // the outcomes and logged as its own dispatch decision, so it is
      // greppable in D1 as well as readable in the run's ending.
      const loss = cloudWaveLoss(outcomes);
      const lossDetail = describeCloudWaveLoss(loss);
      if (lossDetail !== "") {
        await step.do(`cloud:waveloss:${tag}${i}`, OBSERVE_RETRIES, async () => {
          await logDispatch(env, {
            run_id: params.run_id,
            epic: params.epic,
            decision: `cloud_wave_loss:${tag}${i + 1}:${lossDetail}`,
            // `budget_exhausted` only when that is what did it: the reason
            // column is a closed vocabulary and a stop is not a budget.
            reason: trip.kind === "budget" ? "budget_exhausted" : null,
          });
          return { logged: true };
        });
      }
      return {
        kind: "tripped",
        trip: {
          ...trip,
          detail:
            `${trip.detail}, so the cloud wave was cancelled mid-batch and its containers ` +
            `were torn down (${outcomes.length}/${plan.tick_ids.length} tick(s) dispatched)` +
            (lossDetail === "" ? "" : ` — ${lossDetail}`),
        },
        boots: outcomes.length,
      };
    }
  }

  // The batch token has done its job; closeout mints its own fresh one, the
  // same way a clean stop revokes the work pass's token before closeout boots
  // (tick gyl) — dead hygiene, not a functional requirement, since nobody
  // holds it once the last batch's containers are torn down.
  await step.do(`cloud:revoke:done:${tag}`, OBSERVE_RETRIES, async () => {
    const revoked = await revokeRunTokens(env, params.run_id, "stopped");
    return { revoked };
  });

  // Only containers this wave actually ATTEMPTED can fail a green-start probe.
  // A tick the reconcile adopted or settled never ran one, and counting it as
  // a probe failure would fail a run whose work is sitting in git (tick s7f).
  const attempted = outcomes.filter((outcome) => outcome.settled === undefined && !outcome.adopted);
  if (attempted.length > 0 && attempted.every((outcome) => !outcome.launched)) {
    return {
      kind: "failed",
      detail:
        `every worker container in the cloud wave failed its green-start probe ` +
        `(${attempted.length} tick(s)) — a configuration failure, so no closeout was attempted`,
      // Zero ORCHESTRATOR sandboxes, which is what `boots` means to
      // `finalize`'s teardown loop (`sandboxName(run_id, boot)`) — every
      // worker container this wave booted is already torn down by
      // `dispatchWave`'s own `teardownWorker` call, per task, unconditionally.
      // Reporting the worker count here would make finalize ADDRESS —
      // and so provision — orchestrator-named sandboxes that were never
      // booted, exactly the mistake its own teardown comment warns against.
      boots: 0,
    };
  }

  // Every batch ran and nothing stopped anything. That is a HANDOFF, not a
  // trip: the wave is over because it is finished, and the closeout boot it
  // hands to is the run's normal ending rather than the salvage of an
  // interrupted one (tick 074).
  return {
    kind: "handoff",
    // What this wave DID, and nothing about what happens next: since tick wiy
    // a wave can be followed by an integrate-and-plan pass that requests
    // another one, or by review and closeout, and the caller is what knows
    // which. Baking "handing off for review and closeout" in here made every
    // wave claim to be the last.
    detail:
      `the cloud wave dispatched ${outcomes.length} per-tick worker container(s): ` +
      `${summarizeCloudWave(outcomes)}`,
    boots: outcomes.length,
  };
}

/**
 * The whole fan-out: wave, integrate, wave, integrate — until the epic is done
 * (tick wiy).
 *
 * ## What this replaced
 *
 * A cloud run used to dispatch the wave it was submitted with and then hand
 * off to a single-sandbox closeout orchestrator, which ran everything the
 * first wave had unblocked as harness subagents inside one container. Only
 * wave 1 of a multi-wave epic ever reached a container, and the runs where
 * that mattered most were the long ones.
 *
 * ## Why the loop is shaped like this
 *
 * The obvious loop — compute the next wave here and dispatch it — needs
 * readiness in TypeScript, which is the cross-language port this repository
 * has already paid for once (`.tick/learnings.md`) and which
 * `docs/design/cloud-factory.md` decided against. The second door that doc
 * left open is the one used: `wave.Compute` runs INSIDE the orchestrator, in
 * the Go `tk` the container already carries.
 *
 * Which puts the two halves of a wave in two different places, and the
 * alternation below is what joins them:
 *
 *  - only the orchestrator can decide the next wave. It is standing on the
 *    merged run branch and it is the only party that knows what wave 1
 *    actually landed, which tick the integrated gate rejected, and what that
 *    left ready;
 *  - only the Workflow can dispatch one. The `SANDBOXES` binding is here, and
 *    so are the checkpoints, the budgets and the kill switch (D14/D15/D17). A
 *    container that booted its own siblings would be fanning out with none of
 *    that.
 *
 * So the orchestrator pass ENDS by asking (`src/wave-request.ts`), and this
 * loop reads the request the moment the pass exits and dispatches it here.
 * The pass exiting is not a failure and not a stop — it is the handshake. A
 * pass that asks for nothing has finished the epic, and the run is over.
 *
 * The alternative — keeping one orchestrator container alive across waves
 * while this supervisor dispatched underneath it — was rejected: the wave
 * dispatch would have to run inside the watch loop that also drains the
 * container's logs and renews the project lease, so a 30-minute wave would
 * stall a lease renewal and hand the project to whatever came next. A pass per
 * wave costs a container boot and buys a checkpoint, a bounded pass, and a
 * reconcile against the durable layer at every wave boundary.
 */
async function superviseWaveLoop(
  env: Env,
  step: WorkflowStep,
  params: RunWorkflowParams,
  context: RunContext,
  counter: BootCounter,
  first: CloudWavePlan
): Promise<PassOutcome> {
  let plan = first;
  // Every wave's own account, kept because nothing else records the per-tick
  // verdicts (tick 074's evidence, through tick wiy's loop).
  const ran_waves: string[] = [];

  /** Everything the run's waves did so far, as one readable clause. */
  const account = (): string =>
    ran_waves.length === 1
      ? ran_waves[0]!
      : `${ran_waves.length} container waves — ${ran_waves.join("; then ")}`;

  /**
   * A trip or failure from anywhere in the loop, with the waves that already
   * ran kept in front of it.
   *
   * Without this, a run stopped during wave 3 reports only wave 3's reason and
   * an operator loses every verdict waves 1 and 2 produced — the same loss
   * tick 074 fixed for the single-wave case and the reason `applyProgress`
   * keeps an outcome's own account rather than replacing it.
   */
  const withHistory = (outcome: PassOutcome): PassOutcome => {
    if (ran_waves.length === 0) return outcome;
    const prefix = `${account()}; then `;
    switch (outcome.kind) {
      case "tripped":
        return { ...outcome, trip: { ...outcome.trip, detail: `${prefix}${outcome.trip.detail}` } };
      case "failed":
      case "handoff":
        return { ...outcome, detail: `${prefix}${outcome.detail}` };
      case "completed":
        return outcome.detail === undefined
          ? { ...outcome, detail: `${account()}; the orchestrator then finished the epic` }
          : outcome;
    }
  };

  for (let wave = 0; ; wave++) {
    const ran = await superviseCloudWave(env, step, params, context, plan, wave);
    // A trip or a configuration failure ends the run the way it always did:
    // `superviseRun`'s closeout leg. Only a handoff — a wave that dispatched
    // every batch and stopped because it was finished — continues here.
    if (ran.kind !== "handoff") return withHistory(ran);
    ran_waves.push(ran.detail);

    const pass = wave + 1;
    // The integrate-and-plan pass. Its phase is `wave`, never `closeout`:
    // closeout means a run being wound up early and its prompt forbids new
    // work, and tick 074 already had to undo one conflation of "this finished"
    // with "somebody stopped this".
    const continued = await supervisePass(env, step, params, context, counter, {
      label: `wave:${pass}`,
      phase: "wave",
      // What this pass inherits, in the container's own TICKS_STOP_REASON
      // slot: the wave that just ran, and what it is expected to do with it.
      stop_reason:
        `${ran.detail}; integrate what they pushed, then request the next wave ` +
        "or finish the epic",
      max_boots: MAX_SANDBOX_BOOTS,
      enforce_budgets: true,
      pass_max_ms: null,
      on_exhausted: "stop",
      // What makes this pass able to ask for the next wave at all.
      pass,
      substrate: CLOUD_SUBSTRATE,
      // And what it needs to fan the last one back in.
      wave_ticks: plan.tick_ids,
      wave_base_sha: plan.base_sha,
    });
    // A pass that TRIPPED takes the run down its existing closeout leg.
    if (continued.kind === "tripped") return withHistory(continued);
    // A pass that DIED owes the epic the same closeout, and must not simply
    // end the run: containers have already pushed branches, and a run that
    // stops there leaves merged-able work with no tracker state — the one
    // outcome rule 3 says a stop must never produce. It is handed off as an
    // unclean one, so nothing downstream can promote it to `completed`.
    if (continued.kind === "failed") {
      return withHistory({
        kind: "handoff",
        detail:
          `the orchestrator integrating wave ${wave + 1} did not finish (${continued.detail})`,
        boots: continued.boots,
        clean: false,
      });
    }
    if (continued.kind !== "completed") return withHistory(continued);

    const next = await step.do(`cloud:waverequest:${pass}`, OBSERVE_RETRIES, async () => {
      const request = await readWaveRequest(env.ARTIFACTS, params.project, params.run_id, pass);
      // Returned as a nullable field rather than a bare null: a `step.do` that
      // resolves to null and one that was never reached are indistinguishable
      // in a replay, and this decides whether an epic continues.
      return { request };
    });
    if (next.request === null) {
      // The pass integrated the last wave, found nothing left to dispatch, and
      // ran the epic's own review and closeout — that is what a `wave` pass
      // does when it asks for no wave. There is no closeout boot to add: the
      // run is complete, and `applyProgress` still decides whether the durable
      // layer agrees (tick ehy).
      return withHistory({ kind: "completed", boots: continued.boots });
    }
    if (pass >= MAX_RUN_WAVES) {
      // A ceiling reached is a hand-off, not a failure: everything dispatched
      // so far is real work that still needs merging and closing out.
      return withHistory({
        kind: "handoff",
        detail:
          `the run reached its ceiling of ${MAX_RUN_WAVES} container wave(s) with another ` +
          `still requested (${next.request.tick_ids.length} tick(s)), so it is handing off ` +
          "for review and closeout on what did run",
        boots: continued.boots,
      });
    }

    plan = {
      tick_ids: next.request.tick_ids,
      base_sha: next.request.base_sha,
      // The width is a deployment decision and does not change mid-run — it is
      // the same reconciliation of the same two ceilings that produced wave 1.
      width: first.width,
      capped: first.capped,
      detail: first.detail,
    };
    await step.do(`cloud:wavenext:${pass}`, OBSERVE_RETRIES, async () => {
      await logDispatch(env, {
        run_id: params.run_id,
        epic: params.epic,
        decision: `cloud_wave:next=${pass}:${plan.tick_ids.length}@${plan.base_sha.slice(0, 12)}`,
        reason: null,
      });
      return { logged: true };
    });
  }
}

// ------------------------------------------------------------- finalizing ---

export type RunOutcome = {
  state: "completed" | "stopped" | "failed";
  detail: string;
  boots: number;
};

/**
 * Release the lease, close the index row, finish the artifact tree.
 *
 * Every branch of the run ends here, including the ones that never booted
 * anything: a run that ends without releasing its lease wedges the project
 * until the ttl expires, which is a self-inflicted outage.
 */
export async function finalize(
  env: Env,
  params: RunWorkflowParams,
  outcome: RunOutcome,
  boots: number,
  costTelemetry: string | null = null,
  progress: RunProgress = unverifiedProgress("the run ended before its progress was assessed")
): Promise<void> {
  const endedAt = new Date().toISOString();

  // Model access ends when the run does, whatever else happens below. A run
  // whose lease release fails is a delay; a run that leaves a live gateway
  // credential behind is a container that can still spend (D17).
  await revokeRunTokens(env, params.run_id, `finished:${outcome.state}`).catch(
    (error: unknown) => {
      console.error(
        `factory run-workflow: ${params.run_id} could not revoke its gateway tokens: ${String(error)}`
      );
      return 0;
    }
  );

  // One last telemetry read, so the closing record carries what the run
  // actually spent rather than what it had spent at the last observation.
  const finalSpend = await syncRunCost(env, params.run_id);
  const telemetry = finalSpend.ok ? null : (costTelemetry ?? finalSpend.detail);

  const run = await getRun(env.DB, params.run_id);

  // The run's last word to the board (tick bne), before the index row goes
  // terminal rather than after — so "the run is finished" cannot be true
  // anywhere before the picture of it has been offered, and so nothing
  // downstream of this line (the lease release, the record, the container
  // teardown) can be reordered by how slow a board is.
  //
  // `spend` is the AI Gateway read taken above and nothing else:
  // `epicCompleted` has no parameter an agent's self-reported cost would fit,
  // which is what keeps a self-report from re-entering the protocol through
  // `metrics.costUsd`. A read that failed publishes NO cost rather than a
  // zero — unknown and free are different facts about a run.
  await publishRunEvents(env, params.project, [
    epicCompleted({
      epic: params.epic,
      run_id: params.run_id,
      state: outcome.state,
      detail: outcome.detail,
      spend: finalSpend,
      ...(params.trace_id === undefined ? {} : { trace_id: params.trace_id }),
      ...(run?.started_at === undefined
        ? {}
        : { duration_ms: Math.max(0, Date.parse(endedAt) - Date.parse(run.started_at)) }),
    }),
  ]);

  // The dispatch log's own closing line, written before the row goes terminal
  // for the same reason the board event is: a caller who polls state and sees
  // it flip to a terminal value must find `finished:<state>` already in the
  // log, not a window where the row says done and the log does not yet agree.
  // Best-effort like the release below — losing one audit line must not cost
  // the run its terminal state.
  await logDispatch(env, {
    run_id: params.run_id,
    epic: params.epic,
    decision: `finished:${outcome.state}`,
    reason: null,
  }).catch((error: unknown) => {
    console.error(
      `factory run-workflow: ${params.run_id} could not log its finish decision: ${String(error)}`
    );
  });

  await updateRunState(env.DB, params.run_id, outcome.state, endedAt);
  // The evidence the state was decided from, stamped beside it: an operator
  // reading `stopped` has to be able to see whether the run stopped having done
  // work or stopped having done nothing, without re-deriving it from a log.
  await recordRunProgress(
    env.DB,
    params.run_id,
    { progress: progress.state, detail: progress.detail },
    endedAt
  ).catch((error: unknown) => {
    console.error(
      `factory run-workflow: ${params.run_id} could not stamp its progress verdict: ${String(error)}`
    );
  });

  // The index row first, the Workflow params second: the row is what every
  // read surface answers from, and a run whose row was written before this
  // field existed still has whatever its instance was created with.
  const traceID = run?.trace_id ?? params.trace_id ?? "";
  const record: RunRecord = {
    run_id: params.run_id,
    project: params.project,
    epic: params.epic,
    base_sha: params.base_sha,
    requested_by: params.requested_by,
    // The finished record names the chain too, so R2 alone answers "which
    // message produced this run" for a run whose D1 row is long since read.
    ...(traceID === "" ? {} : { trace_id: traceID }),
    ...(params.notify === undefined ? {} : { notify: params.notify }),
    started_at: run?.started_at ?? endedAt,
    state: outcome.state,
    ended_at: endedAt,
    cost_usd: run?.cost_usd ?? 0,
    cost_source: telemetry === null ? "gateway" : `unavailable: ${telemetry}`,
    detail: outcome.detail,
    progress: progress.state,
    progress_detail: progress.detail,
    attempts: boots,
  };
  await writeRunRecord(env.ARTIFACTS, record);
  await writeCombinedHarnessLog(env.ARTIFACTS, params.project, params.run_id).catch(
    (error: unknown) => {
      console.error(
        `factory run-workflow: ${params.run_id} could not write a combined harness log: ${String(error)}`
      );
    }
  );

  // Tear down every container this run booted — and only those. `destroy` on a
  // sandbox that is already gone is a no-op worth attempting (a leaked
  // container bills), but *addressing* a sandbox creates it, so a run that
  // never booted one must not reach for one on its way out.
  const binding = sandboxBinding(env);
  if (binding !== null) {
    for (let boot = 1; boot <= boots; boot++) {
      try {
        const sandbox = await binding.get(sandboxName(params.run_id, boot));
        await sandbox.destroy();
      } catch (error) {
        console.error(
          `factory run-workflow: ${params.run_id} could not destroy sandbox ${boot}: ${String(error)}`
        );
      }
    }
  }

  try {
    await roomFor(env, params.project).releaseDispatchLease({
      run_id: params.run_id,
      token: params.lease_token,
    });
  } catch (error) {
    // The lease expires on the RunRoom's alarm anyway; losing the release is a
    // delay, not a wedge, and must not fail a finalize that already landed.
    console.error(
      `factory run-workflow: ${params.run_id} could not release its lease: ${String(error)}`
    );
  }
}

// -------------------------------------------------------------- the run ---

/** The dispatch-log reason a trip is recorded under, from the closed vocabulary. */
function tripReason(trip: Trip): "budget_exhausted" | null {
  return trip.kind === "budget" && trip.budget === "cost" ? "budget_exhausted" : null;
}

/**
 * What the durable layer says happened, read at the end of the run.
 *
 * The second half of the comparison the context opened. Deliberately its own
 * function so it is one Workflow step: the read is a network call, and a run
 * must not lose a finalize to a GitHub hiccup.
 */
export async function assessProgress(
  env: Env,
  params: RunWorkflowParams,
  context: RunContext
): Promise<RunProgress> {
  return compareSnapshots(context.refs_baseline, await snapshotRefs(env, params.project));
}

/**
 * The outcome the evidence supports, which is not always the one the process
 * suggested.
 *
 * This is the whole point of tick ehy. A harness that exits 0 has said it has
 * nothing more to do; it has NOT said it did anything, and only the durable
 * layer can say that. So:
 *
 * - evidence of change  → `completed`. The epic moved.
 * - no change at all    → `stopped`. Work-preserving, nothing lost, nothing
 *                         done — and visibly different from a run that
 *                         advanced the epic, which is what an operator needs
 *                         to see before submitting the same epic again.
 * - evidence unreadable → `completed`, saying so. Downgrading a run that may
 *                         well have done the work, on the strength of a
 *                         GitHub 503, would invent a failure exactly the way
 *                         inferring success invents a success.
 *
 * Only a `completed` outcome is revisited: a stop or a failure already carries
 * a truer reason than "nothing moved", and `run_progress` records the verdict
 * for those runs regardless.
 */
export function applyProgress(outcome: RunOutcome, progress: RunProgress): RunOutcome {
  if (outcome.state !== "completed") return outcome;
  switch (progress.state) {
    case "none":
      return {
        state: "stopped",
        // The outcome's own account is kept, not replaced (tick 074): for a
        // cloud wave it is the only place the per-tick verdicts are written
        // down, and "nothing moved" without "here is what ran" leaves an
        // operator with a stop and no way to tell which stop it was.
        detail:
          `${outcome.detail}, but the epic did not move: ${progress.detail}. ` +
          "An exit status is not completion",
        boots: outcome.boots,
      };
    case "unknown":
      return {
        state: "completed",
        detail: `${outcome.detail}; progress could not be verified (${progress.detail})`,
        boots: outcome.boots,
      };
    default:
      return {
        state: "completed",
        detail: `${outcome.detail}; ${progress.detail}`,
        boots: outcome.boots,
      };
  }
}

/**
 * The whole lifecycle, exported so it reads as one thing rather than as a class
 * body: context, work, clean stop if something tripped, finalize.
 */
export async function superviseRun(
  env: Env,
  params: RunWorkflowParams,
  step: WorkflowStep
): Promise<RunOutcome> {
  const acquired = await step.do("context", CONTEXT_RETRIES, () => acquireContext(env, params));
  if (!acquired.ok) {
    const outcome: RunOutcome = { state: "failed", detail: acquired.detail, boots: 0 };
    const never = unverifiedProgress(
      "the run never booted an orchestrator, so nothing could have advanced the epic"
    );
    await step.do("finalize", FINALIZE_RETRIES, async () => {
      await finalize(env, params, outcome, 0, null, never);
      return { finalized: true };
    });

    return outcome;
  }
  const context = acquired.context;
  const counter: BootCounter = { next: 1 };

  // substrate = cloud (tick b6e): a resolved wave fans out per-tick worker
  // containers instead of the Phase 1 single orchestrator. Absent, this is
  // the unchanged path — an ADDED one, not a replacement.
  const work =
    context.cloud_wave !== null
      ? await superviseWaveLoop(env, step, params, context, counter, context.cloud_wave)
      : await supervisePass(env, step, params, context, counter, {
          label: "work",
          phase: "run",
          max_boots: MAX_SANDBOX_BOOTS,
          enforce_budgets: true,
          pass_max_ms: null,
          on_exhausted: "stop",
        });

  let outcome: RunOutcome;
  if (work.kind === "completed") {
    outcome = {
      state: "completed",
      detail: work.detail ?? "the orchestrator finished the epic",
      boots: work.boots,
    };
  } else if (work.kind === "failed") {
    outcome = { state: "failed", detail: work.detail, boots: work.boots };
  } else {
    // Two ways to arrive here, and they owe the epic the same closeout boot —
    // but they are not the same event and must not be recorded as one.
    //
    // `tripped` is an interruption: the clean stop, identical for a budget and
    // for an operator (D15). What differs is the reason the closeout
    // orchestrator and the log are given.
    //
    // `handoff` is a cloud wave that finished. Nothing stopped it; the pass is
    // over because per-tick workers do not close an epic out. Recording it as
    // a stop — a `stopping` row, a `stopping:operator` log line, a terminal
    // `stopped` — was tick 074's bug: every successful wave read back as a run
    // somebody had killed.
    const trip = work.kind === "tripped" ? work.trip : null;
    const reason = work.kind === "tripped" ? work.trip.detail : work.detail;
    // A handoff whose own pass died is still a handoff — it owes the epic a
    // closeout — but it is not a run that finished what it started, so it is
    // never promoted below (tick wiy).
    const clean = work.kind !== "handoff" || work.clean !== false;

    if (trip === null) {
      await step.do("handoff:record", OBSERVE_RETRIES, async () => {
        await logDispatch(env, {
          run_id: params.run_id,
          epic: params.epic,
          decision: "handoff:closeout",
          reason: null,
        });
        // Deliberately NO `stopping` write: the run is still running, which is
        // both true and what keeps its closeout credential spendable
        // (`SPENDABLE_RUN_STATES`) and an operator's stop still meaningful
        // (`ACTIVE_RUN_STATES`).
        return { logged: true };
      });
    } else {
      await step.do("stop:record", OBSERVE_RETRIES, async () => {
        await logDispatch(env, {
          run_id: params.run_id,
          epic: params.epic,
          decision: trip.kind === "budget" ? `stopping:budget:${trip.budget}` : "stopping:operator",
          reason: tripReason(trip),
        });
        await updateRunState(env.DB, params.run_id, "stopping");
        return { logged: true };
      });
    }

    const closeout = await supervisePass(env, step, params, context, counter, {
      label: "closeout",
      phase: "closeout",
      stop_reason: reason,
      max_boots: MAX_CLOSEOUT_BOOTS,
      // A closeout must not be stopped by the budget that started it, or the
      // run would never reach review and closeout at all.
      enforce_budgets: false,
      pass_max_ms: context.config.closeout_ms,
      // A closeout that ran out of looks is over; there is nothing further to
      // stop cleanly into.
      on_exhausted: "fail",
    });

    const closed =
      closeout.kind === "completed"
        ? "review and closeout ran"
        : `review and closeout did not finish (${
            closeout.kind === "tripped"
              ? // A tripped closeout has its own reason, and a hard stop's is
                // the one an operator most needs to read back: the run stopped
                // spending because they said so, not because a window elapsed.
                closeout.trip.detail
              : closeout.detail
          })`;
    const detail = `${reason}; ${closed}`;

    // A run that was stopped is `stopped` however well its closeout went — the
    // stop is the truer fact about it. A HANDOFF whose closeout ran is a run
    // that did everything it set out to do, so it is offered as `completed`
    // and `applyProgress` below decides whether the durable layer agrees,
    // exactly as it does for a Phase 1 orchestrator that exited 0 (tick ehy).
    // A handoff whose closeout did NOT finish never reached review and
    // closeout: the run really did stop short, and `stopped` is honest.
    outcome =
      trip === null && clean && closeout.kind === "completed"
        ? { state: "completed", detail, boots: closeout.boots }
        : { state: "stopped", detail, boots: closeout.boots };
  }

  // Nothing above this line may call the run complete. The passes report what
  // the PROCESS did; the durable layer reports what the RUN did, and only the
  // second one can promote an exit into a completion (tick ehy).
  const progress = await step.do("progress", OBSERVE_RETRIES, () =>
    assessProgress(env, params, context)
  );
  outcome = applyProgress(outcome, progress);

  await step.do("finalize", FINALIZE_RETRIES, async () => {
    await finalize(env, params, outcome, outcome.boots, context.cost_telemetry, progress);
    return { finalized: true };
  });
  return outcome;
}

/**
 * The Workflow itself. It is deliberately a thin shell: everything worth
 * testing is in `superviseRun`, and everything durable is a `step`.
 */
export class RunWorkflow extends WorkflowEntrypoint<Env, RunWorkflowParams> {
  override async run(
    event: Readonly<WorkflowEvent<RunWorkflowParams>>,
    step: WorkflowStep
  ): Promise<RunOutcome> {
    return superviseRun(this.env, event.payload, step);
  }
}
