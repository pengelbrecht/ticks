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
 *
 * See docs/design/cloud-factory.md (Phase 1, UC1, UC1b, D14, D15, D19, D20).
 */

import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import {
  writeHarnessSegment,
  writeCombinedHarnessLog,
  writeReconcileRecord,
  writeRunRecord,
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
import { MAX_LEASE_TTL_MS, DEFAULT_LEASE_TTL_MS } from "./run-room";
import { logDispatch, roomFor, type RunWorkflowParams } from "./runs";
import {
  isTerminalExit,
  orchestratorEnv,
  repoURL,
  sandboxBinding,
  sandboxImage,
  sandboxName,
  ORCHESTRATOR_COMMAND,
  type OrchestratorPhase,
  type SandboxProcessState,
} from "./sandbox";

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
  harness: string | null;
  model: string | null;
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

export function runConfig(env: Env): RunConfig {
  const poll = textVar(env, "RUN_POLL_INTERVAL_MS");
  return {
    max_wall_clock_ms: positiveVar(env, "RUN_MAX_WALL_CLOCK_MS", DEFAULT_MAX_WALL_CLOCK_MS, true),
    max_cost_usd: positiveVar(env, "RUN_MAX_COST_USD", DEFAULT_MAX_COST_USD, false),
    cost_budget_configured: hasPositiveVar(env, "RUN_MAX_COST_USD", false),
    stop_grace_ms: positiveVar(env, "RUN_STOP_GRACE_MS", DEFAULT_STOP_GRACE_MS, true),
    closeout_ms: positiveVar(env, "RUN_CLOSEOUT_MS", DEFAULT_CLOSEOUT_MS, true),
    poll_interval_ms: poll === null ? null : positiveVar(env, "RUN_POLL_INTERVAL_MS", MIN_POLL_MS, true),
    max_observations: positiveVar(env, "RUN_MAX_OBSERVATIONS", MAX_OBSERVATIONS, true),
    harness: textVar(env, "RUN_HARNESS"),
    model: textVar(env, "RUN_MODEL"),
  };
}

/** The gap before observation `n` (0-based) of a boot. */
export function pollDelay(config: RunConfig, n: number): number {
  if (config.poll_interval_ms !== null) return config.poll_interval_ms;
  return Math.min(Math.round(MIN_POLL_MS * POLL_BACKOFF ** n), MAX_POLL_MS);
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
};

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

  const config = runConfig(env);
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

  const context: RunContext = {
    repo_url: repoURL(params.project),
    gateway_base_url: runGatewayEndpoint(factoryBaseURL(env)!),
    started_at_ms: Date.now(),
    config,
    cost_telemetry: telemetry.ok ? null : telemetry.detail,
    refs_baseline: refs,
  };

  // The run identifies itself in R2 before it does anything, so a run whose
  // Workflow is lost entirely still leaves a record of what it was.
  await writeRunRecord(env.ARTIFACTS, {
    run_id: run.run_id,
    project: run.project,
    epic: run.epic,
    base_sha: run.base_sha,
    requested_by: run.requested_by,
    ...(params.notify === undefined ? {} : { notify: params.notify }),
    started_at: run.started_at,
    state: "running",
  });

  // `starting` belongs to the submit route; the Workflow owns the run now.
  await updateRunState(env.DB, params.run_id, "running");

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

  const room = roomFor(env, params.project);

  // The lease has to outlive the gap to the next look, or the run expires its
  // own lease between two observations.
  let leaseLost = false;
  try {
    const renewed = await room.renewDispatchLease({
      run_id: params.run_id,
      token: params.lease_token,
      ttl_ms: renewalTtl(input.poll_ms),
    });
    leaseLost = renewed.ok === false && renewed.error === "lease_lost";
  } catch (error) {
    console.error(
      `factory run-workflow: ${params.run_id} could not renew its lease: ${String(error)}`
    );
  }

  const view = await sandbox.getProcess(input.process_id).catch(() => null);
  const at = Date.now();

  const trip = input.enforce_budgets
    ? await detectTrip(env, input, at, leaseLost)
    : ((await hardStopTrip(env, input)) ?? passDeadlineTrip(input, at));

  return {
    process: view === null ? "gone" : view.state,
    exit_code: view === null ? null : view.exit_code,
    offset,
    seq,
    trip,
    at_ms: at,
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

/**
 * The stop and budget check.
 *
 * The operator's stop wins over a budget: it is the more specific intent, and
 * both end in the same clean stop anyway, so the only thing that differs is
 * what the closeout orchestrator and the dispatch log are told.
 */
async function detectTrip(
  env: Env,
  input: ObserveInput,
  at: number,
  leaseLost: boolean
): Promise<Trip | null> {
  const { params, context } = input;

  const stop = await roomFor(env, params.project)
    .stopRequest(params.run_id)
    .catch(() => null);
  if (stop !== null) {
    const hard = stop.mode === "hard";
    return {
      kind: "stop",
      hard,
      detail: `a ${hard ? "hard" : "clean"} stop was requested by ${stop.requested_by} at ${stop.requested_at}`,
    };
  }

  if (leaseLost) {
    // Somebody else holds the project. Exactly one `.tick/` writer per project
    // (D4), so this run stops rather than racing the new holder — and it stops
    // spending immediately, because the other holder is the one doing the work
    // now.
    return { kind: "stop", hard: true, detail: "the dispatch lease was lost to another run" };
  }

  const elapsed = at - context.started_at_ms;
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
      kind: "budget",
      budget: "cost",
      hard: true,
      detail: `the cost budget is exhausted: $${cost.toFixed(2)} of $${context.config.max_cost_usd.toFixed(2)}`,
    };
  }

  return null;
}

// ------------------------------------------------------------ the passes ---

type PassOutcome =
  | { kind: "completed"; boots: number }
  | { kind: "failed"; detail: string; boots: number }
  | { kind: "tripped"; trip: Trip; boots: number };

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
    const phase: OrchestratorPhase =
      options.phase === "closeout" ? "closeout" : boot === 1 ? "run" : "reconcile";

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
      // (tick 3q2's seam). The container is told which one it got, so a
      // repository whose tracked config asks for another is reported by the
      // entrypoint rather than silently ignored.
      const image = sandboxImage(env);
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
          ...(options.stop_reason === undefined ? {} : { stop_reason: options.stop_reason }),
          ...(env.GITHUB_TOKEN === undefined ? {} : { github_token: env.GITHUB_TOKEN }),
          ...(context.config.harness === null ? {} : { harness: context.config.harness }),
          ...(context.config.model === null ? {} : { model: context.config.model }),
          sandbox_image: image,
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
    await step.do(`${options.label}:lease:${attempt}`, OBSERVE_RETRIES, async () => {
      const renewed = await roomFor(env, params.project).renewDispatchLease({
        run_id: params.run_id,
        token: params.lease_token,
        ttl_ms: renewalTtl(pollDelay(context.config, 0)),
      });
      if (renewed.ok === false) {
        console.error(
          `factory run-workflow: ${params.run_id} could not renew its lease after boot ${boot}: ` +
            `${renewed.error}`
        );
      }
      return { ok: renewed.ok };
    });

    const deadline =
      options.pass_max_ms === null ? null : booted.at_ms + options.pass_max_ms;

    let offset = 0;
    let seq = 1;
    // Assume the container outlives the watch until an observation says
    // otherwise: falling out of the loop with this unchanged means the
    // orchestrator is still ALIVE, which is a different problem from a dead one.
    let ending: "dead" | "exhausted" = "exhausted";

    for (let look = 0; look < context.config.max_observations; look++) {
      const pollMs = pollDelay(context.config, look);
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

  const record: RunRecord = {
    run_id: params.run_id,
    project: params.project,
    epic: params.epic,
    base_sha: params.base_sha,
    requested_by: params.requested_by,
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

  await logDispatch(env, {
    run_id: params.run_id,
    epic: params.epic,
    decision: `finished:${outcome.state}`,
    reason: null,
  });
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
        detail:
          `the orchestrator exited 0 but the epic did not move: ${progress.detail}. ` +
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

  const work = await supervisePass(env, step, params, context, counter, {
    label: "work",
    phase: "run",
    max_boots: MAX_SANDBOX_BOOTS,
    enforce_budgets: true,
    pass_max_ms: null,
    on_exhausted: "stop",
  });

  let outcome: RunOutcome;
  if (work.kind === "completed") {
    outcome = { state: "completed", detail: "the orchestrator finished the epic", boots: work.boots };
  } else if (work.kind === "failed") {
    outcome = { state: "failed", detail: work.detail, boots: work.boots };
  } else {
    // The clean stop, identical for a budget and for an operator (D15). What
    // differs is the reason the closeout orchestrator and the log are given.
    const trip = work.trip;
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

    const closeout = await supervisePass(env, step, params, context, counter, {
      label: "closeout",
      phase: "closeout",
      stop_reason: trip.detail,
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
            closeout.kind === "failed"
              ? closeout.detail
              : // A tripped closeout has its own reason, and a hard stop's is
                // the one an operator most needs to read back: the run stopped
                // spending because they said so, not because a window elapsed.
                closeout.trip.detail
          })`;
    outcome = { state: "stopped", detail: `${trip.detail}; ${closed}`, boots: closeout.boots };
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
