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
   * The wave's wait timeout, if the caller bounds one.
   *
   * The container is given a slightly SHORTER bound of its own, because the
   * dispatcher's timeout ends in `teardownWorker` killing the container and a
   * killed container pushes nothing. Bounding the harness just under the wait
   * turns a hung agent into a pushed branch and a report — the difference
   * between a lost tick and a legible one. Derived here so the two bounds are
   * one decision rather than two constants that drift apart.
   */
  wait_timeout_ms?: number;
};

/** How much of the wave's wait window is reserved for committing and pushing. */
export const WORKER_PUSH_MARGIN_MS = 60_000;

/**
 * The container's own harness bound, in whole seconds, derived from the wave's
 * wait timeout. Zero (unbounded) when the caller bounds nothing or when the
 * window is too small to reserve a push margin from — a bound of a few seconds
 * would fail every worker rather than rescue any.
 */
export function workerHarnessTimeoutSeconds(waitTimeoutMs?: number): number {
  if (waitTimeoutMs === undefined || waitTimeoutMs <= WORKER_PUSH_MARGIN_MS) return 0;
  return Math.floor((waitTimeoutMs - WORKER_PUSH_MARGIN_MS) / 1000);
}

/**
 * The environment one worker container boots with.
 *
 * Only what is set is passed: the entrypoint defaults everything else, and an
 * empty string is not the same as absent to a shell reading `${VAR:-default}`.
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
    ["TICKS_HARNESS", input.harness],
    ["TICKS_MODEL", input.model],
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
  const timeout = workerHarnessTimeoutSeconds(input.wait_timeout_ms);
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
