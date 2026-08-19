/**
 * The orchestrator sandbox seam — what the Run Workflow needs a container to
 * be, and the environment it boots one with.
 *
 * The contract is declared structurally here rather than imported from the
 * Cloudflare Sandbox SDK, for the same reason `RunWorkflowBinding` is declared
 * structurally in src/runs.ts: the run lifecycle is the thing under test, and a
 * lifecycle that can only be exercised by starting a real container is a
 * lifecycle nobody tests. A fake binding assigned to `env.SANDBOXES` proves the
 * supervision loop; the deployment binds the SDK's `getSandbox` behind the same
 * five methods. Nothing below is Cloudflare-specific, which is also what keeps
 * the door open for the substrate to grow a second implementation (D19).
 *
 * The environment builder is the other half of the seam. `cloud/sandbox`
 * (README, "Entrypoint contract") states the variables the image reads; this
 * module is the only place the Workflow spells them, and the names are the ones
 * `internal/sandbox` declares in Go so one value has one spelling from
 * `tk factory setup` to the container.
 */

import type { Env } from "./index";

// -------------------------------------------------------------- the image ---

/**
 * What a boot is for (`TICKS_PHASE`).
 *
 * The Workflow can only reach the image through the environment, so "you are
 * the replacement for an orchestrator that died" and "this run is stopping
 * cleanly" are variables, not messages the harness has to be listening for. The
 * phase is never the agent's decision: budget and stop enforcement live here
 * (D14/D15), never in a prompt. Mirrors `sandbox.Phase*` in Go.
 */
export type OrchestratorPhase = "run" | "reconcile" | "closeout";

/**
 * The image reference a run boots when the deployment asks for nothing else.
 *
 * A default, not a constant — `internal/sandbox.DefaultImage()` says the same
 * thing on the Go side. The tag is the tk version the image pins; the operator
 * pushes it into their own registry, so `SANDBOX_IMAGE` overrides this.
 */
export const DEFAULT_SANDBOX_IMAGE = "ticks-orchestrator";

/** The command the sandbox runs. It is on PATH in the Phase 1 image. */
export const ORCHESTRATOR_COMMAND = "/usr/local/bin/ticks-orchestrator";

/**
 * Entrypoint exit codes that are a *configuration* verdict, not a crash
 * (`cloud/sandbox/README.md`). Rebooting on one of these burns money to reach
 * the identical answer: the SHA still will not check out, `tk` is still the
 * wrong version, the pre-flight still fails. They end the run.
 */
export const TERMINAL_EXIT_CODES: readonly number[] = [
  2, // a required input is missing or malformed (including no gateway)
  3, // clone or checkout of the submitted SHA failed
  4, // tk is absent, or is not the version the image pins
  5, // an Environment pre-flight check failed
];

/** Whether a nonzero exit means "do not boot another sandbox for this run". */
export function isTerminalExit(code: number | null): boolean {
  return code !== null && TERMINAL_EXIT_CODES.includes(code);
}

// ------------------------------------------------------------ the seam ---

/** How a started process is doing. `gone` is the sandbox having lost it. */
export type SandboxProcessState = "running" | "completed" | "failed" | "gone";

export type SandboxProcessView = {
  id: string;
  state: SandboxProcessState;
  /** The entrypoint's (and therefore the harness's) exit status, once it has one. */
  exit_code: number | null;
};

/** Output produced since a cursor, plus the cursor to resume from. */
export type SandboxOutput = { text: string; offset: number };

/**
 * One orchestrator container.
 *
 * Deliberately small: start a process, ask how it is doing, read what it has
 * printed since a cursor, kill it, throw the container away. Anything richer
 * would be a capability the supervision loop does not have a use for, and every
 * method here is one a fake has to implement honestly for the tests to mean
 * something.
 */
export interface OrchestratorSandbox {
  startProcess(
    command: string,
    options: { env: Record<string, string> }
  ): Promise<SandboxProcessView>;
  /**
   * The process's current state, or `null` when this sandbox does not know it —
   * which is what a container that died and came back empty looks like.
   */
  getProcess(id: string): Promise<SandboxProcessView | null>;
  /** Everything printed after `offset` characters, with the new cursor. */
  readOutput(id: string, offset: number): Promise<SandboxOutput>;
  killProcess(id: string): Promise<void>;
  /** Tear the container down. Called once, at finalize. */
  destroy(): Promise<void>;
}

/**
 * The namespace sandboxes are addressed in. `name` is the run's sandbox name,
 * so a reboot can deliberately ask for a *different* one: a fresh container is
 * the point, not a warm one.
 */
export interface SandboxBinding {
  get(name: string, options?: { image?: string }): Promise<OrchestratorSandbox>;
}

/**
 * The sandbox binding, or null when this deployment has none.
 *
 * A factory that cannot boot a container cannot run anything, so the Workflow
 * fails the run with a message naming the binding rather than looping forever
 * — the same "an unprovisioned deployment is a broken deploy" rule auth applies
 * to a missing token secret and submission applies to a missing Workflow.
 */
export function sandboxBinding(env: Env): SandboxBinding | null {
  const binding = env.SANDBOXES;
  return binding === undefined || binding === null ? null : binding;
}

/** The sandbox name a run's containers are addressed by. */
export function sandboxName(runID: string, attempt: number): string {
  // The attempt is in the name on purpose. A reboot must land in a *fresh*
  // container: the previous one is expected to be broken, and reusing its name
  // is how you inherit whatever broke it.
  return `${runID}-${attempt}`;
}

// ------------------------------------------------------- the environment ---

export type OrchestratorEnvInput = {
  run_id: string;
  epic: string;
  base_sha: string;
  repo_url: string;
  gateway_base_url: string;
  phase: OrchestratorPhase;
  stop_reason?: string;
  github_token?: string;
  harness?: string;
  model?: string;
  workdir?: string;
  cache_dir?: string;
};

/**
 * The environment `ticks-orchestrator` is started with.
 *
 * Every name here is in `cloud/sandbox/README.md`'s entrypoint contract and in
 * `internal/sandbox`'s Go constants. Optional values are omitted rather than
 * set empty: the script distinguishes "unset" from "set to nothing" for the
 * harness kind and the model, and an empty `GITHUB_TOKEN` would install a
 * credential helper that answers with no password.
 */
export function orchestratorEnv(input: OrchestratorEnvInput): Record<string, string> {
  const env: Record<string, string> = {
    TICKS_REPO_URL: input.repo_url,
    TICKS_BASE_SHA: input.base_sha,
    TICKS_EPIC: input.epic,
    TICKS_RUN_ID: input.run_id,
    TICKS_PHASE: input.phase,
    AI_GATEWAY_BASE_URL: input.gateway_base_url,
  };
  if (input.stop_reason !== undefined && input.stop_reason !== "") {
    env.TICKS_STOP_REASON = input.stop_reason;
  }
  if (input.github_token !== undefined && input.github_token !== "") {
    env.GITHUB_TOKEN = input.github_token;
  }
  if (input.harness !== undefined && input.harness !== "") env.TICKS_HARNESS = input.harness;
  if (input.model !== undefined && input.model !== "") env.TICKS_MODEL = input.model;
  if (input.workdir !== undefined && input.workdir !== "") env.TICKS_WORKDIR = input.workdir;
  if (input.cache_dir !== undefined && input.cache_dir !== "") env.TICKS_CACHE_DIR = input.cache_dir;
  return env;
}

/**
 * The clone URL for an enrolled `owner/repo`.
 *
 * Enrolment stores the canonical GitHub pair (migrations/0003) and the
 * credential the sandbox carries is a GitHub PAT (D11), so the host is not a
 * parameter today. It is a function rather than a template at the call site so
 * the day it becomes one, there is one place to change.
 */
export function repoURL(project: string): string {
  return `https://github.com/${project}.git`;
}
