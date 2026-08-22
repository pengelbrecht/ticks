/**
 * What a per-tick worker sandbox is actually told to run (tick tap).
 *
 * `worker-dispatch.ts` (tick 0ds) is the mechanism — probe, confirmed
 * dispatch, expiring liveness, concurrent fan-out — and it says in as many
 * words that what a worker sandbox's entrypoint runs is not its job:
 * `command`/`env` are supplied by the caller. This module is that caller's
 * half, and the reason it is a module rather than an object literal at the
 * call site is the probe.
 *
 * THE PROBE MARKER IS NOT A GUESS. The green-start trap only works if the
 * dispatcher checks the probe's CONTENT, and content it can check for is
 * content the container has to promise. `cloud/sandbox/worker.sh` makes that
 * promise — `ticks-worker --probe` proves tk, git and the harness binary
 * answer and then prints {@link WORKER_PROBE_MARKER} — and this module is
 * where the control plane reads it rather than inventing a second spelling.
 * The two languages and the shell are pinned together by
 * `test/fixtures/worker-boot-contract.json`, checked from both suites.
 *
 * ONE IMAGE, TWO ROLES. On Cloudflare an image belongs to the containers
 * application rather than to a boot (tick x3v), so a worker container is the
 * same image as the orchestrator container. What tells it which role it is
 * playing is which entrypoint is started inside it — {@link WORKER_COMMAND}
 * rather than {@link ORCHESTRATOR_COMMAND}. There is deliberately no role flag
 * beside that: a container whose role is the command it was given cannot be
 * started in the wrong one.
 */

import type { ProbeSpec, WorkSpec } from "./worker-dispatch";
import type { WorkerTask } from "./worker-collect";

// ------------------------------------------------------------ the commands ---

export const ORCHESTRATOR_COMMAND = "/usr/local/bin/ticks-orchestrator";
export const WORKER_COMMAND = "/usr/local/bin/ticks-worker";
export const WORKER_PROBE_ARG = "--probe";
export const WORKER_PROBE_COMMAND = `${WORKER_COMMAND} ${WORKER_PROBE_ARG}`;

/**
 * The string the probe's stdout must CONTAIN for a sandbox to count as
 * launched — never its exit code, which is the whole point of
 * `evaluateProbeOutput`. Fixed, with no version or id in it, because both
 * halves of the check are a substring match and anything varying would drift.
 */
export const WORKER_PROBE_MARKER = "ticks-worker-probe-ok";

/** What the worker entrypoint exports as TK_ACTOR. */
export const WORKER_ACTOR = "cloud:worker";

// -------------------------------------------------------------- the names ---

/** The namespace a per-tick worker's branch lives in (D9's other half is `tick-run/`). */
export const WORKER_BRANCH_PREFIX = "tick/";

/**
 * The branch one tick's worker pushes — the branch `worker-collect.ts`
 * compares against the epic base and reads the report out of. Derived here and
 * in the entrypoint from the same rule, so the container and the collector
 * cannot disagree about where the work is.
 */
export function workerBranch(epic: string, tick: string): string {
  return `${WORKER_BRANCH_PREFIX}${epic}/${tick}`;
}

/** The report a worker's branch must carry. Mirrors `resultFile` in worker-collect.ts. */
export function workerResultFile(tick: string): string {
  return `RESULT-${tick}.md`;
}

/** The `WorkerTask` a wave collects one tick against, built from the same two rules. */
export function workerTask(epic: string, tick: string, baseSHA: string): WorkerTask {
  return { tick_id: tick, branch: workerBranch(epic, tick), base_sha: baseSHA };
}

// ---------------------------------------------------------- the exit codes ---

/**
 * The classes a worker container can end in that an orchestrator cannot, so a
 * caller reading `WaitOutcome.exit_code` can tell them apart. Kept here beside
 * the command that produces them; the entrypoint's `EXIT_*` constants and
 * `internal/sandbox`'s `ExitWorker*` are the same three numbers.
 */
export const WORKER_EXIT = {
  /** Commits exist and origin would not take them: the work dies with the container. */
  push: 9,
  /** Branch and report reached origin with no work commits — the green-start trap's exit counterpart. */
  no_work: 10,
  /** The harness failed or ran out of time; whatever it committed was pushed first. */
  agent: 11,
} as const;

// --------------------------------------------------------------- the boot ---

/** Whether a worker runs the repository's own `[sandbox]` setup. */
export type WorkerSetupMode = "always" | "skip";

export type WorkerBootInput = {
  repo_url: string;
  base_sha: string;
  epic: string;
  tick: string;
  run_id: string;
  gateway_base_url: string;
  gateway_token: string;
  harness?: string;
  model?: string;
  github_token?: string;
  sandbox_image?: string;
  workdir?: string;
  cache_dir?: string;
  factory_url?: string;
  factory_token?: string;
  factory_project?: string;
  /**
   * Whether this worker runs the repository's `[sandbox]` setup.
   *
   * This is the performance lever for the whole per-tick design and it is
   * exposed rather than decided: fan-out per-sandbox time degrades 3.74x at
   * N=5 and tick kuf found ALL of that in dependency install, not the image
   * pull. `always` is the default and the correct one — a worker that cannot
   * run the repository's tests cannot implement a tick — and a wave whose
   * ticks touch no dependencies can decline to pay it N times.
   */
  setup?: WorkerSetupMode;
  /**
   * How long this worker's harness may WORK, if the caller bounds it.
   *
   * The agent's budget is the decision (`workerHarnessBudgetMs`); the wave's
   * wait is derived from it (`waveWaitTimeoutMs`), not the other way round.
   * They were one constant until tick 5fg, which made "how long may the agent
   * work" a hostage of "how long does the supervisor wait before reconciling"
   * — two different jobs, and the constant answered neither from measurement.
   */
  harness_budget_ms?: number;
};

/**
 * How much of the wave's wait window is reserved for committing and pushing.
 *
 * The dispatcher's wait timeout ends in `teardownWorker` KILLING the
 * container, and a killed container pushes nothing. This margin is what turns
 * that into a pushed branch and a legible report instead. It worked exactly as
 * designed on run run_2e66e765 — three killed containers still produced three
 * readable branches — so it is deliberately unchanged by tick 5fg.
 */
export const WORKER_PUSH_MARGIN_MS = 60_000;

/**
 * The default ceiling on one worker's harness budget, in ms.
 *
 * Justified by this repository's own measurement, not by taste. Tick y45
 * recorded a COMPLETE one-tick epic at **78 minutes** on
 * `deepseek-v4-pro-0813`, and {@link WORKER_DEFAULT_MODEL} is the FLASH model,
 * which takes more steps than pro for the same work. Ninety minutes is that
 * measurement plus a small allowance for the extra steps.
 *
 * The number this replaced was thirty minutes, and it was not a safety margin:
 * on run run_2e66e765 (2026-08-22, epic 72y, ticks 201/5jo/5qj) all three
 * containers drove the loop competently — 393+ model calls each, real tool
 * use, 95-99% prompt cache — and all three were killed `exit 124` with zero
 * work commits, just before they would have committed. That is the most
 * expensive failure available: the run pays for every token and keeps nothing.
 */
export const DEFAULT_WORKER_HARNESS_BUDGET_MS = 90 * 60_000;

/**
 * The floor a DERIVED budget never drops below.
 *
 * A bound of a few seconds fails every worker rather than rescuing any. When a
 * run is genuinely out of time the thing that stops its wave is the wall-clock
 * trip (`cloudWaveTrip`, tick k24), which cancels the batch and tears the
 * containers down — not a harness budget of nine seconds.
 */
export const MIN_WORKER_HARNESS_BUDGET_MS = 5 * 60_000;

/**
 * How long one worker's harness may work, from the run's own allowance.
 *
 * `remaining_wall_clock_ms` is what the RUN has left, so a worker can never be
 * given more time than the run it belongs to — a worker that outlives its run
 * is a container the wall-clock trip has to kill, which is the failure this
 * derivation exists to stop. `cap_ms` is the deployment's own ceiling on any
 * single worker (`RUN_WORKER_BUDGET_MS`), defaulting to the measured
 * {@link DEFAULT_WORKER_HARNESS_BUDGET_MS}: a generous run allowance is not a
 * licence to hand ONE tick the whole run.
 */
export function workerHarnessBudgetMs(
  input: { remaining_wall_clock_ms?: number; cap_ms?: number } = {}
): number {
  const cap =
    input.cap_ms !== undefined && Number.isFinite(input.cap_ms) && input.cap_ms > 0
      ? input.cap_ms
      : DEFAULT_WORKER_HARNESS_BUDGET_MS;
  const remaining = input.remaining_wall_clock_ms;
  if (remaining === undefined || !Number.isFinite(remaining)) return cap;
  const usable = remaining - WORKER_PUSH_MARGIN_MS;
  if (usable >= cap) return cap;
  return Math.max(MIN_WORKER_HARNESS_BUDGET_MS, Math.floor(usable));
}

/**
 * How long the wave watches a container that may work for `harnessBudgetMs`.
 *
 * Exactly the push margin longer, and in that order: the agent's budget is the
 * decision and the supervisor's patience follows it. Deriving it the other way
 * round is what made a thirty-minute observation window silently also be every
 * agent's working life.
 */
export function waveWaitTimeoutMs(harnessBudgetMs: number): number {
  return harnessBudgetMs + WORKER_PUSH_MARGIN_MS;
}

/**
 * A worker container's own default harness — cross-provider, unlike `claude`
 * (`cloud/sandbox/common.sh` refuses `claude` outright against a non-Anthropic
 * provider, by design).
 */
export const WORKER_DEFAULT_HARNESS = "omp";

/**
 * A worker container's own default model when the run config names none.
 *
 * Deliberately NOT `.tick/runners.toml`'s `[roles.implement]` (`kind =
 * "claude"`, `model = "sonnet"`): that table is shared with `tk herd spawn`'s
 * LOCAL worker CLIs on an operator's machine, which authenticate straight to
 * Anthropic and have no factory gateway credential at all. A cloud worker
 * left to fall through to it asked the checkout's `tk sandbox model
 * --role implement` for that same `sonnet`/`anthropic` route, which the
 * factory gateway does not serve (Phase 2 routes Workers AI only) —
 * `probe_model` died `EXIT_MODEL` deterministically, on every worker, in
 * every wave, before the harness ever started (tick ys3). Repointing
 * `[roles.implement]` itself was the trap: it would have fixed the cloud
 * container and broken every local epic run in the same commit. A cloud
 * worker's harness and model come from the FACTORY, never from the
 * repository's implement role — this constant is that route, applied in
 * `workerBootEnv` only when the caller supplies none, so an operator's or the
 * run config's explicit choice still wins.
 *
 * `deepseek-v4-flash-0731`: measured against this account's own
 * `GET /ai/models/search` catalog by tick y45
 * (`docs/workers-ai-model-selection.md`), not assumed — 53.3 DeepSWE v1.1
 * (`deepseek-v4-pro-0813`, the orchestrator's own model, scores 63.0 but at
 * roughly 3x the price) with 23/23 post-warm prompt-cache hits, the best of
 * six models probed; `qwen3.8-27b` is disqualified outright at 0/27 cache
 * hits, fatal for an agentic loop regardless of score.
 */
export const WORKER_DEFAULT_MODEL = "workers-ai/@cf/deepseek-ai/deepseek-v4-flash-0731";

/**
 * The container's own harness bound, in whole seconds — `TICKS_WORKER_TIMEOUT`.
 *
 * Zero (unbounded) when the caller bounds nothing, which is what an unset
 * variable means to the entrypoint.
 */
export function workerHarnessTimeoutSeconds(harnessBudgetMs?: number): number {
  if (harnessBudgetMs === undefined || !Number.isFinite(harnessBudgetMs) || harnessBudgetMs <= 0) {
    return 0;
  }
  return Math.floor(harnessBudgetMs / 1000);
}

/**
 * The environment one worker container boots with.
 *
 * Only what is set is passed, and the entrypoint defaults everything else —
 * except `TICKS_HARNESS`/`TICKS_MODEL`, which this function itself defaults
 * (see {@link WORKER_DEFAULT_MODEL}), because the entrypoint's own fallback
 * for an unset model is the repository's `[roles.implement]`, and that route
 * is for local worker CLIs, not a factory-dispatched container. An empty
 * string is not the same as absent to a shell reading `${VAR:-default}`.
 */
export function workerBootEnv(input: WorkerBootInput): Record<string, string> {
  const env: Record<string, string> = {
    TICKS_REPO_URL: input.repo_url,
    TICKS_BASE_SHA: input.base_sha,
    TICKS_EPIC: input.epic,
    TICKS_TICK: input.tick,
    TICKS_RUN_ID: input.run_id,
    AI_GATEWAY_BASE_URL: input.gateway_base_url,
    AI_GATEWAY_TOKEN: input.gateway_token,
    TICKS_WORKER_SETUP: input.setup ?? "always",
  };
  const optional: [string, string | undefined][] = [
    // Defaulted rather than left absent, unlike everything else below: an
    // absent TICKS_MODEL falls through to the container's own
    // `resolve_model`, which asks the checkout's `[roles.implement]` — the
    // LOCAL worker route, unreachable from the factory gateway (tick ys3).
    ["TICKS_HARNESS", input.harness ?? WORKER_DEFAULT_HARNESS],
    ["TICKS_MODEL", input.model ?? WORKER_DEFAULT_MODEL],
    ["GITHUB_TOKEN", input.github_token],
    ["TICKS_SANDBOX_IMAGE", input.sandbox_image],
    ["TICKS_WORKDIR", input.workdir],
    ["TICKS_CACHE_DIR", input.cache_dir],
    ["TICKS_FACTORY_URL", input.factory_url],
    ["TICKS_FACTORY_TOKEN", input.factory_token],
    ["TICKS_FACTORY_PROJECT", input.factory_project],
  ];
  for (const [name, value] of optional) {
    if (value !== undefined && value !== "") env[name] = value;
  }
  const timeout = workerHarnessTimeoutSeconds(input.harness_budget_ms);
  if (timeout > 0) env.TICKS_WORKER_TIMEOUT = String(timeout);
  return env;
}

/**
 * The green-start probe for one worker sandbox.
 *
 * It carries the same environment as the real command so the probe answers as
 * the container that is about to do the work — a probe run in a different
 * environment proves something about a container nobody is going to use.
 */
export function workerProbeSpec(input: WorkerBootInput): ProbeSpec {
  return {
    command: WORKER_PROBE_COMMAND,
    env: workerBootEnv(input),
    expect: WORKER_PROBE_MARKER,
  };
}

/**
 * Everything `spawnWorker` needs for one tick.
 *
 * PER TICK, not per wave: `TICKS_TICK` differs for every container in a wave,
 * so a caller fanning a wave out builds one of these per task rather than
 * sharing a single `WorkSpec` across `dispatchWave`.
 */
export function workerWorkSpec(input: WorkerBootInput): WorkSpec {
  const env = workerBootEnv(input);
  return { probe: { command: WORKER_PROBE_COMMAND, env, expect: WORKER_PROBE_MARKER }, command: WORKER_COMMAND, env };
}
