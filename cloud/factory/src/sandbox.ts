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

import { getSandbox, type Sandbox } from "@cloudflare/sandbox";

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

/**
 * The image this deployment boots a run in.
 *
 * A deployment-level knob, not a per-run one: the control plane picks an image
 * BEFORE it has a checkout, so it cannot yet read the `[sandbox].image` a
 * repository declares in its tracked config at the submitted SHA. What it can
 * do — and does — is tell the container which image it got, so a repository
 * asking for a different one is reported in the boot log instead of being
 * silently ignored (`TICKS_SANDBOX_IMAGE`, and the entrypoint's warning).
 * Honouring a declared image is the remaining half of that seam.
 */
export function sandboxImage(env: Env): string {
  const configured = env.SANDBOX_IMAGE;
  return typeof configured === "string" && configured.trim() !== ""
    ? configured.trim()
    : DEFAULT_SANDBOX_IMAGE;
}

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
  6, // the repository's own [sandbox] setup failed
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
  if (binding === undefined || binding === null) return null;
  return isSandboxNamespace(binding) ? sdkSandboxBinding(binding) : binding;
}

// ------------------------------------------------------- the SDK adapter ---

/**
 * How long a sandbox may go unaddressed before the platform stops it.
 *
 * Not `keepAlive`. A container that never sleeps has to be destroyed by
 * something, and the thing that would destroy it is the Workflow instance that
 * may itself have died — so an orchestrator whose supervisor is gone would bill
 * until an operator noticed. The observation loop addresses its sandbox at most
 * every RUN_POLL_MAX_MS (5 minutes), so a window several times that keeps a
 * live run awake while still putting a ceiling on a leaked one.
 */
export const SANDBOX_SLEEP_AFTER = "20m";

/**
 * The command modifier that puts one boot's whole output in one buffer.
 *
 * `getProcessLogs` returns stdout and stderr as two independently growing
 * strings, and the seam's cursor is a single offset — resuming into a
 * concatenation of two growing buffers re-emits and misaligns. The entrypoint
 * already streams everything it has to say to stdout, so the redirect makes
 * that true of the harness's stderr as well, and one cursor stays correct.
 */
const MERGE_STDERR = " 2>&1";

/**
 * The subset of the Sandbox SDK's sandbox this adapter uses.
 *
 * Declared structurally, like `SandboxBinding` above and `RunWorkflowBinding`
 * in src/runs.ts: the mapping from the SDK's process model to the seam's is the
 * thing worth testing, and a test that can only run it by starting a container
 * is a test nobody runs.
 */
export type SdkSandbox = {
  startProcess(
    command: string,
    options?: { env?: Record<string, string>; autoCleanup?: boolean }
  ): Promise<SdkProcess>;
  getProcess(id: string): Promise<SdkProcess | null>;
  getProcessLogs(id: string): Promise<{ stdout: string; stderr: string }>;
  killProcess(id: string): Promise<void>;
  destroy(): Promise<void>;
};

/** What the SDK reports about one process. */
export type SdkProcess = {
  id: string;
  status: string;
  exitCode?: number | null;
};

/** The Durable Object namespace `[[containers]]` binds the Sandbox class to. */
export type SandboxNamespace = DurableObjectNamespace<Sandbox>;

/**
 * Whether this binding is the deployment's Durable Object namespace rather
 * than a fake assigned to `env.SANDBOXES` by a test.
 *
 * `idFromName` is the discriminator because it is what a namespace has and the
 * seam does not: the seam's `get` takes a name, the namespace's takes an id.
 */
export function isSandboxNamespace(
  binding: SandboxBinding | SandboxNamespace
): binding is SandboxNamespace {
  return typeof (binding as { idFromName?: unknown }).idFromName === "function";
}

/**
 * The deployment's binding: the SDK's `getSandbox` behind the seam's five
 * methods.
 *
 * `options.image` is accepted and ignored here, because a container's image is
 * fixed by the `[[containers]]` application the Durable Object class belongs to
 * — there is one image per class, chosen at deploy time. The Workflow still
 * passes it, and still tells the container which image it got
 * (`TICKS_SANDBOX_IMAGE`), so a repository that declares a different one is
 * reported by the entrypoint instead of silently ignored.
 */
export function sdkSandboxBinding(namespace: SandboxNamespace): SandboxBinding {
  return {
    async get(name: string): Promise<OrchestratorSandbox> {
      return adaptSandbox(getSandbox(namespace, name, { sleepAfter: SANDBOX_SLEEP_AFTER }));
    },
  };
}

/** One SDK sandbox, behind the five methods the supervision loop uses. */
export function adaptSandbox(sandbox: SdkSandbox): OrchestratorSandbox {
  return {
    async startProcess(command, options) {
      // autoCleanup: false — the default erases a process record as soon as it
      // exits, and the exit status IS the run's verdict (a terminal code ends
      // the run; anything else reboots). A record that deletes itself before
      // the next observation turns every finished orchestrator into "gone".
      const started = await sandbox.startProcess(command + MERGE_STDERR, {
        env: options.env,
        autoCleanup: false,
      });
      return processView(started);
    },
    async getProcess(id) {
      const view = await sandbox.getProcess(id);
      return view === null || view === undefined ? null : processView(view);
    },
    async readOutput(id, offset) {
      const logs = await sandbox.getProcessLogs(id);
      const text = logs.stdout ?? "";
      if ((logs.stderr ?? "") !== "") {
        // Unreachable while the redirect above holds. If it ever does not, this
        // says so rather than dropping the output silently.
        console.error(
          `factory sandbox: process ${id} wrote ${logs.stderr.length} bytes to stderr, ` +
            "which the merged-output contract says cannot happen"
        );
      }
      // A cursor past the end is a buffer that was reset under us. Resuming
      // from the new end loses what was dropped; resuming from zero would
      // re-stream a run's whole log into fresh R2 segments, which is worse.
      const start = Math.min(offset, text.length);
      return { text: text.slice(start), offset: text.length };
    },
    async killProcess(id) {
      await sandbox.killProcess(id);
    },
    async destroy() {
      await sandbox.destroy();
    },
  };
}

/** The SDK's process record, in the seam's shape. */
function processView(process: SdkProcess): SandboxProcessView {
  return {
    id: process.id,
    state: processState(process.status),
    exit_code: process.exitCode === undefined ? null : process.exitCode,
  };
}

/**
 * The SDK's status vocabulary, mapped onto the seam's.
 *
 * `killed` and `error` land on `failed` deliberately: the supervision loop's
 * question is "is this orchestrator still working", and every one of them
 * answers no in a way that is not a clean completion.
 */
function processState(status: string): SandboxProcessState {
  switch (status) {
    case "starting":
    case "running":
      return "running";
    case "completed":
      return "completed";
    default:
      return "failed";
  }
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
  /**
   * The run's gateway credential (D17). Scoped to this run and this boot, and
   * revocable from the control plane while the container is still running,
   * which is what makes it a kill switch rather than a key.
   */
  gateway_token: string;
  phase: OrchestratorPhase;
  stop_reason?: string;
  github_token?: string;
  harness?: string;
  model?: string;
  workdir?: string;
  cache_dir?: string;
  /**
   * The image the control plane booted. Advisory and one-way: the container
   * cannot change what it is running, so this exists so that a repository
   * declaring a different `[sandbox].image` is visible in the log rather than
   * silently ignored.
   */
  sandbox_image?: string;
};

/**
 * The environment `ticks-orchestrator` is started with.
 *
 * Every name here is in `cloud/sandbox/README.md`'s entrypoint contract and in
 * `internal/sandbox`'s Go constants. Optional values are omitted rather than
 * set empty: the script distinguishes "unset" from "set to nothing" for the
 * harness kind and the model, and an empty `GITHUB_TOKEN` would install a
 * credential helper that answers with no password.
 *
 * Note what is NOT here: no provider key. The gateway base URL points at this
 * factory's own `/api/gateway` prefix, and the only model credential the
 * container holds is the run token — so a leaked sandbox environment leaks
 * something run-scoped and revocable rather than the operator's vendor key
 * (D17). And no setup commands: what a sandbox runs to warm itself comes from
 * the repository's tracked, PR-reviewed `.tick/runners.toml` at the submitted
 * SHA, read inside the container by `tk`. There is deliberately no variable
 * here that carries one, so no API parameter, signal payload or tick note has
 * a path into a shell holding this run's credentials.
 */
export function orchestratorEnv(input: OrchestratorEnvInput): Record<string, string> {
  const env: Record<string, string> = {
    TICKS_REPO_URL: input.repo_url,
    TICKS_BASE_SHA: input.base_sha,
    TICKS_EPIC: input.epic,
    TICKS_RUN_ID: input.run_id,
    TICKS_PHASE: input.phase,
    AI_GATEWAY_BASE_URL: input.gateway_base_url,
    AI_GATEWAY_TOKEN: input.gateway_token,
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
  if (input.sandbox_image !== undefined && input.sandbox_image !== "") {
    env.TICKS_SANDBOX_IMAGE = input.sandbox_image;
  }
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
