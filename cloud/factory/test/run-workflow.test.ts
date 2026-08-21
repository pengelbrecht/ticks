import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  readHarnessOutput,
  readRunRecord,
  reconcileKey,
  type RunRecord,
} from "../src/artifacts";
import { enrolProject, getRun, getRunProgress, listDispatchLogs, listRunGatewayTokens } from "../src/db";
import { GATEWAY_PATH_PREFIX, proxyModelRequest } from "../src/gateway";
import type { RepoRefs } from "../src/progress";
import type { RunEventMessage, RunEventSink } from "../src/run-events";
import type { RepoConfigReader } from "../src/repo-config";
import { MAX_SANDBOX_BOOTS, chunkWave, resolveDispatchWidth, summarizeCloudWave } from "../src/run-workflow";
import { roomFor, runStatus, startRun, stopRun, submitRun } from "../src/runs";
import {
  DEFAULT_SANDBOX_IMAGE,
  ORCHESTRATOR_COMMAND,
  type OrchestratorSandbox,
  type SandboxBinding,
  type SandboxOutput,
  type SandboxProcessState,
  type SandboxProcessView,
} from "../src/sandbox";
import { WORKER_COMMAND, WORKER_PROBE_COMMAND, WORKER_PROBE_MARKER } from "../src/worker-boot";
import type { WorkerCollector, WorkerReport, WorkerTask } from "../src/worker-collect";
import { workerSandboxName } from "../src/worker-dispatch";

/**
 * The Run Workflow: boot one orchestrator sandbox, watch it, enforce the
 * budgets, finalize.
 *
 * These drive the REAL Workflow inside workerd — the binding from
 * wrangler.toml, the real RunRoom lease, the real D1 index, the real R2
 * bucket. The only substitution is the container itself, through the
 * `SANDBOXES` seam: a fake sandbox is what lets a test kill an orchestrator
 * mid-run and read the log stream while the run is still going, which is
 * exactly what this tick has to prove.
 */

// --------------------------------------------------------- the fake sandbox ---

class FakeProcess {
  state: SandboxProcessState = "running";
  exit_code: number | null = null;
  output = "";
  killed = false;

  constructor(
    readonly id: string,
    readonly command: string,
    readonly env: Record<string, string>
  ) {}

  /** Print something, as a harness would while it works. */
  say(text: string): void {
    this.output += text;
  }

  exit(code: number): void {
    this.state = code === 0 ? "completed" : "failed";
    this.exit_code = code;
  }

  get view(): SandboxProcessView {
    return { id: this.id, state: this.state, exit_code: this.exit_code };
  }
}

class FakeSandbox implements OrchestratorSandbox {
  readonly processes: FakeProcess[] = [];
  destroyed = false;
  /** The container died and came back empty: it no longer knows its process. */
  vanished = false;
  /**
   * tick b6e: a worker's probe/work command completes the instant it starts —
   * true for every test that does not care about batch timing. Set false to
   * hold the process `running` until a test drives it explicitly, the same
   * way an orchestrator process already behaves.
   */
  autoCompleteWorkers = true;
  /** tick b6e: makes this sandbox's green-start probe fail (no marker). */
  failProbe = false;
  #next = 0;

  constructor(readonly name: string) {}

  async startProcess(
    command: string,
    options: { env: Record<string, string> }
  ): Promise<SandboxProcessView> {
    const process = new FakeProcess(`${this.name}-p${++this.#next}`, command, options.env);
    this.processes.push(process);
    if (this.autoCompleteWorkers) {
      if (command === WORKER_PROBE_COMMAND) {
        if (!this.failProbe) process.say(`${WORKER_PROBE_MARKER}\n`);
        process.exit(0);
      } else if (command === WORKER_COMMAND) {
        process.say("implementing\n");
        process.exit(0);
      }
    }
    return process.view;
  }

  async getProcess(id: string): Promise<SandboxProcessView | null> {
    if (this.vanished) return null;
    const process = this.processes.find((p) => p.id === id);
    return process === undefined ? null : process.view;
  }

  async readOutput(id: string, offset: number): Promise<SandboxOutput> {
    const process = this.processes.find((p) => p.id === id);
    if (process === undefined || this.vanished) return { text: "", offset };
    return { text: process.output.slice(offset), offset: process.output.length };
  }

  async killProcess(id: string): Promise<void> {
    const process = this.processes.find((p) => p.id === id);
    if (process === undefined) return;
    process.killed = true;
    process.state = "failed";
    process.exit_code = 143;
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
  }

  get current(): FakeProcess {
    const process = this.processes.at(-1);
    if (process === undefined) throw new Error(`sandbox ${this.name} started nothing`);
    return process;
  }
}

class FakeSandboxes implements SandboxBinding {
  readonly booted: FakeSandbox[] = [];
  /** The image each `get` asked for — the boot's own parameter, per tick 3q2. */
  readonly requestedImages: (string | undefined)[] = [];
  /** tick b6e: propagated to every worker sandbox this creates from here on. */
  autoCompleteWorkers = true;
  /** tick b6e: tick ids whose green-start probe should fail when booted. */
  readonly failProbeFor = new Set<string>();
  readonly #byName = new Map<string, FakeSandbox>();

  async get(name: string, options?: { image?: string }): Promise<OrchestratorSandbox> {
    this.requestedImages.push(options?.image);
    let sandbox = this.#byName.get(name);
    if (sandbox === undefined) {
      sandbox = new FakeSandbox(name);
      sandbox.autoCompleteWorkers = this.autoCompleteWorkers;
      const tick = /-tick-([a-z0-9]+)$/.exec(name)?.[1];
      if (tick !== undefined && this.failProbeFor.has(tick)) sandbox.failProbe = true;
      this.#byName.set(name, sandbox);
      this.booted.push(sandbox);
    }
    return sandbox;
  }

  /** The sandbox the run is currently working in. */
  get latest(): FakeSandbox {
    const sandbox = this.booted.at(-1);
    if (sandbox === undefined) throw new Error("no sandbox has been booted");
    return sandbox;
  }

  /** tick b6e: the sandbox already booted under this exact name. */
  named(name: string): FakeSandbox {
    const sandbox = this.#byName.get(name);
    if (sandbox === undefined) throw new Error(`no sandbox named ${name} was booted`);
    return sandbox;
  }

  /** The process of the sandbox booted with this phase, or undefined. */
  phase(phase: string): FakeProcess | undefined {
    for (const sandbox of this.booted) {
      for (const process of sandbox.processes) {
        if (process.env.TICKS_PHASE === phase) return process;
      }
    }
    return undefined;
  }
}

// -------------------------------------------------------------- the remote ---

/**
 * The durable layer, faked: the branch heads a run's work would land on.
 *
 * Nothing else in this file can stand in for it. A fake sandbox exiting 0 is
 * exactly the run tick ehy is about — the boot chain worked, the harness had
 * nothing to say, and NOTHING HAPPENED — so a test that wants a `completed`
 * run has to push something here, the same way a real orchestrator would.
 */
class FakeRepo implements RepoRefs {
  refs: Record<string, string> = { main: BASE_SHA };
  /** Set to make the remote unreadable, as a GitHub outage would. */
  unreadable: string | null = null;
  reads = 0;

  async list(): Promise<Record<string, string>> {
    this.reads += 1;
    if (this.unreadable !== null) throw new Error(this.unreadable);
    return { ...this.refs };
  }

  /** What an orchestrator that did work leaves behind. */
  push(branch: string, sha: string): void {
    this.refs[branch] = sha;
  }

  /** Merging the epic branch and cleaning it up. */
  deleteBranch(branch: string): void {
    delete this.refs[branch];
  }
}

/**
 * The repository's tracked config, faked: what `[sandbox]` a run's checkout
 * declares at the submitted SHA.
 *
 * The control plane reads this BEFORE it boots anything, because the image a
 * repository declares is the image the run has to get (tick x3v) — and a
 * declaration cannot be read out of a container that is already running the
 * wrong one.
 */
class FakeRepoConfig implements RepoConfigReader {
  /** The file's text, or null for a repository that tracks none. */
  source: string | null = null;
  /** Set to make the file unreadable, as a GitHub outage would. */
  unreadable: string | null = null;
  readonly asked: { project: string; ref: string }[] = [];

  async read(project: string, ref: string): Promise<string | null> {
    this.asked.push({ project, ref });
    if (this.unreadable !== null) throw new Error(this.unreadable);
    return this.source;
  }

  /** What a repository pinning its own orchestrator image tracks. */
  declare(image: string): void {
    this.source = `version = 2\n\n[sandbox]\nimage = "${image}"\n`;
  }
}

/**
 * A cloud wave's per-tick verdicts, faked (tick b6e): the durable git layer
 * `collectFromGithub` would read, without a real repository.
 *
 * Defaults every tick to `ready-to-merge` — the common case — so a test only
 * has to `set` the ticks it cares about making say something else.
 */
class FakeWorkerCollector implements WorkerCollector {
  readonly asked: WorkerTask[] = [];
  readonly #reports = new Map<string, WorkerReport>();

  set(tickID: string, report: Partial<WorkerReport>): void {
    this.#reports.set(tickID, { ...defaultWorkerReport(tickID), ...report });
  }

  async collect(task: WorkerTask): Promise<WorkerReport> {
    this.asked.push(task);
    return this.#reports.get(task.tick_id) ?? defaultWorkerReport(task.tick_id);
  }
}

function defaultWorkerReport(tickID: string): WorkerReport {
  return {
    tick_id: tickID,
    branch: `tick/ko8/${tickID}`,
    base_sha: BASE_SHA,
    verdict: "ready-to-merge",
    branch_exists: true,
    commits: 1,
    result_path: `RESULT-${tickID}.md`,
    result_exists: true,
    status: "DONE",
    status_detail: "",
    status_line: "STATUS: DONE",
    boundary_files: [],
    detail: "ready to merge",
  };
}

// ------------------------------------------------------------------ harness ---

const GATEWAY = "https://gateway.ai.cloudflare.com/v1/account/ticks";
const FACTORY = "https://factory.example.com";
const PROJECT = "example-org/example-repo";
const BASE_SHA = "a".repeat(40);

let sandboxes: FakeSandboxes;
let repo: FakeRepo;
let repoConfig: FakeRepoConfig;
const saved: Record<string, unknown> = {};

/** Overrides a binding for one test, remembering what to put back. */
function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}

beforeEach(() => {
  sandboxes = new FakeSandboxes();
  set("SANDBOXES", sandboxes);
  // The remote a run's progress is proved against. It starts where the
  // submission did, so a run that pushes nothing has moved nothing.
  repo = new FakeRepo();
  set("REPO_REFS", repo);
  // The checkout's own `[sandbox]` declaration. It declares nothing by
  // default, which is the 99% path: the deployment's image stands.
  repoConfig = new FakeRepoConfig();
  set("REPO_CONFIG", repoConfig);
  set("SANDBOX_IMAGE", undefined);
  set("AI_GATEWAY_BASE_URL", GATEWAY);
  set("CLOUDFLARE_API_TOKEN", undefined);
  // A run's model traffic goes through this deployment's own gateway proxy
  // (D17), so the Workflow has to know the factory's public URL to hand a
  // gateway to a sandbox. `tk factory deploy` writes it.
  set("FACTORY_BASE_URL", FACTORY);
  set("ANTHROPIC_API_KEY", "sk-operator-key");
  // The kill-switch cases below drive the anthropic route, which a default
  // factory refuses on billing grounds (tick fw6) — this one opted in.
  set("GATEWAY_ALLOWED_PROVIDERS", "anthropic");
  // A tight, fixed cadence: the supervision loop's own backoff is not what
  // these tests are about, and an explicit interval is a supported override.
  set("RUN_POLL_INTERVAL_MS", "25");
  set("RUN_STOP_GRACE_MS", "50");
  set("RUN_MAX_WALL_CLOCK_MS", "600000");
  // No explicit cost budget by default: the harness intentionally has no
  // Cloudflare API token, so this path must remain runnable and record unknown
  // spend rather than refusing every test run.
  set("RUN_MAX_COST_USD", undefined);
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
    else (env as unknown as Record<string, unknown>)[name] = value;
    delete saved[name];
  }
});

let counter = 0;

/** Takes the lease and ignites a run, exactly as the submit route does. */
async function ignite(
  overrides: { epic?: string; project?: string; leaseTtlMs?: number; tickIDs?: string[] } = {}
) {
  const project = overrides.project ?? `${PROJECT}-${++counter}`;
  const epic = overrides.epic ?? "ko8";
  const runID = `run_wf_${++counter}`;
  const room = roomFor(env, project);
  const lease = await room.acquireDispatchLease({
    run_id: runID,
    epic,
    origin: "cloud",
    ...(overrides.leaseTtlMs === undefined ? {} : { ttl_ms: overrides.leaseTtlMs }),
  });
  if (!lease.ok) throw new Error(`the lease was refused: ${JSON.stringify(lease)}`);
  const started = await startRun(env, {
    run_id: runID,
    project,
    epic,
    base_sha: BASE_SHA,
    requested_by: "operator",
    lease_token: lease.lease.token,
    ...(overrides.tickIDs === undefined ? {} : { tick_ids: overrides.tickIDs }),
  });
  return { runID, project, epic, started, room };
}

async function waitFor<T>(
  what: string,
  probe: () => Promise<T | null | undefined | false>,
  timeoutMs = 15_000
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value !== null && value !== undefined && value !== false) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await scheduler.wait(10);
  }
}

const runState = (runID: string) => getRun(env.DB, runID).then((run) => run?.state ?? null);

/** Waits until the run reaches one of the terminal index states. */
/** Where the stubbed Cloudflare API answers; nothing else may reach the network. */
const LOGS_API = "https://api.cloudflare.example/client/v4";

/**
 * Stands in for the Cloudflare logs API on the global fetch, recording the
 * filters each read sent and refusing a dotted metadata key exactly as the
 * real API does (error 7001 over an HTTP 400).
 */
/**
 * The AI Gateway logs API, refusing what it really refuses.
 *
 * It rejects a filter key outside its enum AND a `per_page` above 50 — both
 * are 400s that grounded a budgeted live run, and a stub that answered 200 to
 * either is what let them ship. `refuse` forces a status for the tests that
 * care what the operator is told, rather than whether the query was accepted.
 */
function stubLogsAPI(
  cost: number,
  refuse?: { status: number; message: string },
  calls = 1
): {
  filters: { key: string; operator: string; value: unknown[] }[][];
  restore: () => void;
} {
  const filters: { key: string; operator: string; value: unknown[] }[][] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith(LOGS_API)) return original(input as RequestInfo, init);
    const sent = JSON.parse(new URL(url).searchParams.get("filters") ?? "[]") as {
      key: string;
      operator: string;
      value: unknown[];
    }[];
    filters.push(sent);
    for (const filter of sent) {
      if (!["metadata.key", "metadata.value"].includes(filter.key)) {
        return Response.json(
          {
            success: false,
            errors: [{ code: 7001, message: `Invalid enum value. received "${filter.key}"` }],
            result: null,
          },
          { status: 400 }
        );
      }
    }
    const perPage = Number(new URL(url).searchParams.get("per_page") ?? "0");
    if (perPage > 50) {
      return Response.json(
        {
          success: false,
          errors: [{ code: 7003, message: "Number must be less than or equal to 50" }],
          result: null,
        },
        { status: 400 }
      );
    }
    if (refuse !== undefined) {
      return Response.json(
        { success: false, errors: [{ message: refuse.message }], result: null },
        { status: refuse.status }
      );
    }
    const runID = String((sent[1]?.value ?? [])[0] ?? "");
    const page = Number(new URL(url).searchParams.get("page") ?? "1");
    const rows = Math.max(0, Math.min(perPage, calls - (page - 1) * perPage));
    return Response.json({
      success: true,
      result: Array.from({ length: rows }, () => ({
        cost,
        metadata: { run_id: runID, tick_id: "ko8" },
      })),
      // The API's real result_info: count/page/per_page/total_count, and no
      // `total_pages`. A stub that invented that field let a read stop after
      // one page and report 6% of a run's spend as its total.
      result_info: { count: rows, page, per_page: perPage, total_count: calls },
    });
  }) as typeof fetch;
  return { filters, restore: () => void (globalThis.fetch = original) };
}

async function settled(runID: string) {
  return waitFor(`run ${runID} to finish`, async () => {
    const run = await getRun(env.DB, runID);
    if (run === null) return null;
    return ["completed", "stopped", "failed"].includes(run.state) ? run : null;
  });
}

/** The SHA an orchestrator's pushed work lands at. */
const PUSHED_SHA = "b".repeat(40);

/**
 * What a run that actually did something leaves on the remote.
 *
 * Called before the harness exits in every test that expects `completed`: since
 * tick ehy the exit status alone cannot say the epic moved, so a test asserting
 * completion has to supply the evidence that says it.
 */
function orchestratorPushedWork(epic = "ko8"): void {
  repo.push(`epic/${epic}`, PUSHED_SHA);
}

/** Waits until a sandbox has been booted and started the orchestrator. */
async function firstProcess(): Promise<FakeProcess> {
  return waitFor("the orchestrator to start", async () =>
    sandboxes.booted.length > 0 && sandboxes.booted[0]!.processes.length > 0
      ? sandboxes.booted[0]!.current
      : null
  );
}

// -------------------------------------------------------------------- tests ---

describe("boot and finalize", () => {
  it("boots one sandbox on the skill loop and finalizes with a runs row", async () => {
    const { runID, project, epic } = await ignite();

    const process = await firstProcess();
    expect(process.command).toBe(ORCHESTRATOR_COMMAND);
    expect(process.env).toMatchObject({
      TICKS_REPO_URL: `https://github.com/${project}.git`,
      TICKS_BASE_SHA: BASE_SHA,
      TICKS_EPIC: epic,
      TICKS_RUN_ID: runID,
      TICKS_PHASE: "run",
      // The gateway a sandbox is pointed at is this factory's proxy, which
      // exchanges the run's token for the operator's provider key.
      AI_GATEWAY_BASE_URL: `${FACTORY}${GATEWAY_PATH_PREFIX}`,
    });
    // …and the only model credential inside the container is run-scoped.
    expect(process.env.AI_GATEWAY_TOKEN).toMatch(/^tkr_[0-9a-f]{64}$/);
    expect(JSON.stringify(process.env)).not.toContain("sk-operator-key");
    // The row says the run is live before it is over — `starting` is the
    // submit route's state, and the Workflow owns everything after it.
    await waitFor("the run to be running", async () => (await runState(runID)) === "running");

    process.say("orchestrator: wave 1\n");
    orchestratorPushedWork(epic);
    process.exit(0);

    const run = await settled(runID);
    expect(run.state).toBe("completed");
    expect(run.ended_at).not.toBeNull();
    // ONE sandbox: Phase 1 is a single-sandbox run.
    expect(sandboxes.booted).toHaveLength(1);
    expect(sandboxes.booted[0]!.destroyed).toBe(true);

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record).toMatchObject({ run_id: runID, project, epic, state: "completed" });
  });

  // The image is a parameter of the boot, not a constant of the call site: the
  // seam tick 3q2 left, now carrying a value. The container is also told which
  // image it got, which is what lets it report a repository whose tracked
  // `[sandbox].image` asks for a different one instead of ignoring it.
  it("boots the sandbox with an image reference and tells the container which one", async () => {
    const { runID } = await ignite();
    const process = await firstProcess();

    expect(sandboxes.requestedImages[0]).toBe(DEFAULT_SANDBOX_IMAGE);
    expect(process.env.TICKS_SANDBOX_IMAGE).toBe(DEFAULT_SANDBOX_IMAGE);
    // And nothing in that environment can carry a setup command: what a
    // sandbox runs to warm itself comes from the repository's tracked config
    // at the submitted SHA, read inside the container.
    for (const name of Object.keys(process.env)) expect(name).not.toMatch(/SETUP/i);

    // Let the run finish: an ignited run left alive keeps supervising, and a
    // shared workerd runtime is what the next test file has to run in.
    process.exit(0);
    await settled(runID);
  });

  // The escape hatch, working (tick x3v). A repository that pins its own image
  // in its tracked config gets that image — read from the checkout at the
  // submitted SHA, never from the submission, because an image is arbitrary
  // code and this container holds the run's credentials.
  it("boots the image the repository declares at the submitted SHA", async () => {
    const declared = "registry.example.com/acme/ticks-orchestrator:0.32.0";
    // The deployment that serves it: on this substrate an image belongs to the
    // container application, so honouring a declaration means the operator
    // deployed a factory running it.
    set("SANDBOX_IMAGE", declared);
    repoConfig.declare(declared);

    const { runID, project } = await ignite();
    const process = await firstProcess();

    expect(sandboxes.requestedImages[0]).toBe(declared);
    expect(process.env.TICKS_SANDBOX_IMAGE).toBe(declared);
    // Read from the tracked file at the run's own base commit, not at a branch
    // head that may have moved since the submission.
    expect(repoConfig.asked[0]).toEqual({ project, ref: BASE_SHA });

    process.exit(0);
    await settled(runID);
  });

  // The third clause of the tick, and the one that costs money to get wrong: a
  // declared image this deployment cannot serve must END the run, before a
  // container exists and before a credential is minted, rather than booting
  // the base image and letting a wave fail somewhere far from the cause.
  it("fails the run with an actionable error when the declared image cannot be booted", async () => {
    repoConfig.declare("registry.example.com/acme/ticks-orchestrator:0.32.0");

    const { runID, project, room } = await ignite();
    const run = await settled(runID);

    expect(run.state).toBe("failed");
    // Nothing was booted and nothing was credentialled: the refusal is the
    // whole run.
    expect(sandboxes.booted).toHaveLength(0);
    expect(await listRunGatewayTokens(env.DB, runID)).toHaveLength(0);
    // And the project is not left wedged behind a lease it never used.
    expect(await room.leaseStatus()).toBeNull();

    // What an operator reads back: both references, where the declaration
    // lives, and both ways out.
    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.state).toBe("failed");
    expect(record.detail).toContain("registry.example.com/acme/ticks-orchestrator:0.32.0");
    expect(record.detail).toContain(DEFAULT_SANDBOX_IMAGE);
    expect(record.detail).toContain(".tick/runners.toml");
    expect(record.detail).toContain("remove [sandbox].image");
  });

  // A GitHub hiccup must not fail every run: the control plane's reader is a
  // second reader of a Go-owned format, so an answer it could not get leaves
  // the deployment's image standing — and the container, which reads the
  // tracked config with the authoritative reader, refuses the boot if that was
  // the wrong call.
  it("boots this deployment's image when the tracked config cannot be read", async () => {
    repoConfig.unreadable = "GitHub answered HTTP 503";

    const { runID } = await ignite();
    const process = await firstProcess();

    expect(sandboxes.requestedImages[0]).toBe(DEFAULT_SANDBOX_IMAGE);
    expect(process.env.TICKS_SANDBOX_IMAGE).toBe(DEFAULT_SANDBOX_IMAGE);

    process.exit(0);
    await settled(runID);
  });

  it("releases the dispatch lease so the project can run again", async () => {
    const { runID, room } = await ignite();
    expect(await room.leaseStatus()).not.toBeNull();

    (await firstProcess()).exit(0);
    await settled(runID);

    expect(await room.leaseStatus()).toBeNull();
  });

  it("renews the lease as soon as the container is up, not a poll later (tick 4ef)", async () => {
    // The lease acquired at submit has to survive until the FIRST renewal, and
    // until tick 4ef that renewal was the first observation — behind boot plus
    // a poll delay. In production a boot (image pull, clone, toolchain, two
    // probes, pre-flight) took about a minute against a 60s lease, so the run
    // read its own expiry as a lost lease, treated it as a HARD trip, and
    // revoked its own gateway token: measured on run_d941c5ee as a
    // 403 run_token_revoked on the harness's first real call.
    //
    // The default test cadence (25ms) cannot express that, because the first
    // observation lands long before any lease expires. So invert the two: a
    // lease shorter than one poll delay makes "renewed only on observation"
    // fail exactly the way the real boot did.
    set("RUN_POLL_INTERVAL_MS", "3000");
    const { runID, room } = await ignite({ leaseTtlMs: 1_000 });
    const process = await firstProcess();

    // Past the point where a lease renewed only on observation is already dead.
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    const lease = await room.leaseStatus();
    expect(lease).not.toBeNull();
    expect(lease!.run_id).toBe(runID);

    // The production symptom, asserted directly: nothing revoked this run's
    // credential, so the harness can still spend.
    const tokens = await listRunGatewayTokens(env.DB, runID);
    expect(tokens.filter((token) => token.revoked_at !== null)).toEqual([]);

    const status = await runStatus(env, runID);
    expect(status?.run.state).toBe("running");

    process.exit(0);
    await settled(runID);
  });

  it("takes a lease at submit that outlives a cold boot (tick 4ef)", async () => {
    const project = `${PROJECT}-${++counter}`;
    await enrolProject(env.DB, {
      project,
      enrolled_by: "operator",
      enrolled_at: new Date().toISOString(),
    });
    const submitted = await submitRun(env, {
      project,
      epic: "ko8",
      base_sha: BASE_SHA,
      requested_by: "operator",
      queue: false,
    });
    if (submitted.outcome !== "started") {
      throw new Error(`the submission was refused: ${JSON.stringify(submitted)}`);
    }

    // The window the acquire ttl has to cover is a whole boot, so assert it in
    // those terms rather than against the constant: a minute is what the old
    // default gave, and a real boot takes about that.
    const lease = await roomFor(env, project).leaseStatus();
    expect(lease).not.toBeNull();
    expect(Date.parse(lease!.expires_at) - Date.now()).toBeGreaterThan(120_000);

    (await firstProcess()).exit(0);
    await settled(submitted.started.run.run_id);
  });

  it("renews the lease while the run is alive", async () => {
    const { runID, room } = await ignite();
    const process = await firstProcess();
    const first = (await room.leaseStatus())!.expires_at;

    await waitFor("a lease renewal", async () => {
      const lease = await room.leaseStatus();
      return lease !== null && lease.expires_at > first;
    });

    process.exit(0);
    await settled(runID);
  });
});

describe("exit 0 is not completion (tick ehy)", () => {
  // The run this comes from: everything booted, the model probe was green, the
  // HARNESS probe was green, the skill loop started — and the orchestrator then
  // produced 271 bytes stating the substrate it had resolved and the note it
  // intended to record, and exited. The Workflow marked it COMPLETED and
  // charged $0.22. No wave, no branch, no note, and the epic still had every
  // one of its open ticks.
  it("records a harness that exited 0 having pushed nothing as stopped, not completed", async () => {
    const { runID, project } = await ignite();
    const process = await firstProcess();

    process.say(
      "The dispatch substrate for this run is subagents.\n" +
        'I will record: run-state: substrate=subagents\n'
    );
    process.exit(0);

    const run = await settled(runID);
    expect(run.state).toBe("stopped");

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.state).toBe("stopped");
    expect(record.progress).toBe("none");
    // The record has to say WHY it is not a completion, or the next operator
    // reads "stopped" and assumes a budget trip.
    expect(record.detail ?? "").toMatch(/exit status is not completion/i);
    expect(record.progress_detail ?? "").toMatch(/no branch on origin changed/i);
  });

  it("still reports completed for a run that actually advanced the epic", async () => {
    const { runID, project, epic } = await ignite();
    const process = await firstProcess();

    // The durable layer, not the terminal: a branch on origin that was not
    // there when the run started.
    repo.push(`epic/${epic}`, PUSHED_SHA);
    process.exit(0);

    const run = await settled(runID);
    expect(run.state).toBe("completed");

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.progress).toBe("advanced");
    expect(record.progress_detail ?? "").toContain(`epic/${epic}`);
  });

  it("counts an epic branch that was merged and cleaned up as progress", async () => {
    // A run whose last act is merging its epic branch and deleting it leaves a
    // remote with FEWER branches than it found. That is the successful ending.
    const { runID, epic } = await ignite();
    repo.push(`epic/${epic}`, PUSHED_SHA);
    const before = await runState(runID);
    expect(before).not.toBeNull();

    const process = await firstProcess();
    repo.deleteBranch(`epic/${epic}`);
    process.exit(0);

    expect((await settled(runID)).state).toBe("completed");
  });

  // A GitHub outage must not invent a failure any more than an exit code may
  // invent a success. The run stays completed and the record says the evidence
  // could not be read — the same distinction `cost_source` draws.
  it("does not downgrade a run whose evidence could not be read, and says so", async () => {
    const { runID, project } = await ignite();
    const process = await firstProcess();

    repo.unreadable = "GitHub answered HTTP 503 for the branch listing";
    process.exit(0);

    const run = await settled(runID);
    expect(run.state).toBe("completed");

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.progress).toBe("unknown");
    expect(record.detail ?? "").toMatch(/could not be verified/i);
    expect(record.progress_detail ?? "").toContain("503");
  });

  // `tk cloud status <run>` reads this row. Two `stopped` runs — one that
  // pushed a wave before its budget tripped and one that did nothing at all —
  // are the same word without it.
  it("stamps the verdict in D1 so tk cloud status can show the distinction", async () => {
    const noop = await ignite();
    (await firstProcess()).exit(0);
    await settled(noop.runID);
    expect(await getRunProgress(env.DB, noop.runID)).toMatchObject({ progress: "none" });

    sandboxes = new FakeSandboxes();
    set("SANDBOXES", sandboxes);
    repo = new FakeRepo();
    set("REPO_REFS", repo);

    const real = await ignite();
    const process = await firstProcess();
    repo.push(`epic/${real.epic}`, PUSHED_SHA);
    process.exit(0);
    await settled(real.runID);
    expect(await getRunProgress(env.DB, real.runID)).toMatchObject({ progress: "advanced" });
  });

  // A stop is already a truthful state; the verdict rides along so an operator
  // can tell a stop that preserved work from a stop that had none to preserve.
  it("records the verdict for a clean stop without changing its state", async () => {
    const { runID, epic } = await ignite();
    await firstProcess();
    await stopRun(env, runID, "operator");

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    repo.push(`epic/${epic}`, PUSHED_SHA);
    closeout.exit(0);

    expect((await settled(runID)).state).toBe("stopped");
    expect(await getRunProgress(env.DB, runID)).toMatchObject({ progress: "advanced" });
  });
});

describe("harness output streams to R2 during the run", () => {
  it("is readable while the run is still going", async () => {
    const { runID, project } = await ignite();
    const process = await firstProcess();

    process.say("orchestrator: graph resolved\n");
    const early = await waitFor("the first harness output in R2", async () => {
      const text = await readHarnessOutput(env.ARTIFACTS, project, runID);
      return text === "" ? null : text;
    });
    expect(early).toContain("graph resolved");
    // Still going: this is not an export-at-exit log.
    expect(process.state).toBe("running");
    expect(await runState(runID)).toBe("running");

    process.say("orchestrator: wave 1 merged\n");
    await waitFor("the second flush", async () =>
      (await readHarnessOutput(env.ARTIFACTS, project, runID)).includes("wave 1 merged")
    );

    process.exit(0);
    await settled(runID);

    const full = await readHarnessOutput(env.ARTIFACTS, project, runID);
    expect(full).toBe("orchestrator: graph resolved\norchestrator: wave 1 merged\n");
  });

  it("leaves the log behind when the sandbox dies mid-run", async () => {
    const { runID, project } = await ignite();
    const process = await firstProcess();
    process.say("orchestrator: about to be killed\n");
    await waitFor("the output to reach R2", async () =>
      (await readHarnessOutput(env.ARTIFACTS, project, runID)).includes("about to be killed")
    );

    sandboxes.booted[0]!.vanished = true;

    // The dead sandbox's output survives it — that is the point of streaming.
    const second = await waitFor("a replacement sandbox", async () =>
      sandboxes.booted.length > 1 ? sandboxes.booted[1]! : null
    );
    expect(await readHarnessOutput(env.ARTIFACTS, project, runID)).toContain("about to be killed");

    second.current.exit(0);
    await settled(runID);
  });
});

describe("a dead orchestrator is replaced, not the end of the run", () => {
  it("boots a fresh sandbox whose first instruction is the reconcile protocol", async () => {
    const { runID } = await ignite();
    const first = await firstProcess();
    expect(first.env.TICKS_PHASE).toBe("run");

    sandboxes.booted[0]!.vanished = true;

    const replacement = await waitFor("a replacement sandbox", async () =>
      sandboxes.booted.length > 1 ? sandboxes.booted[1]! : null
    );
    // A FRESH container, not the broken one reused.
    expect(replacement.name).not.toBe(sandboxes.booted[0]!.name);
    const process = await waitFor("the replacement orchestrator", async () =>
      replacement.processes.length > 0 ? replacement.current : null
    );
    expect(process.env.TICKS_PHASE).toBe("reconcile");
    expect(process.env.TICKS_RUN_ID).toBe(runID);
    expect(process.env.TICKS_BASE_SHA).toBe(BASE_SHA);

    orchestratorPushedWork();
    process.exit(0);
    const run = await settled(runID);
    expect(run.state).toBe("completed");
  });

  it("reboots after a crashed harness too, and records why", async () => {
    const { runID, project } = await ignite();
    (await firstProcess()).exit(1);

    const replacement = await waitFor("a replacement sandbox", async () =>
      sandboxes.booted.length > 1 && sandboxes.booted[1]!.processes.length > 0
        ? sandboxes.booted[1]!.current
        : null
    );
    expect(replacement.env.TICKS_PHASE).toBe("reconcile");

    // One reconcile.json per reboot: what the dead orchestrator looked like
    // when it was written off (D20's artifact tree).
    const written = await waitFor("the reconcile record", async () =>
      env.ARTIFACTS.get(reconcileKey(project, runID, 1))
    );
    const record = JSON.parse(await written.text()) as {
      previous: { state: string; exit_code: number | null };
      detail: string;
    };
    expect(record.previous).toEqual({ state: "failed", exit_code: 1 });
    expect(record.detail).toContain("exited 1");

    orchestratorPushedWork();
    replacement.exit(0);
    expect((await settled(runID)).state).toBe("completed");
  });

  it("does not reboot on a configuration verdict from the entrypoint", async () => {
    const { runID } = await ignite();
    // Exit 5: an Environment pre-flight check failed. A fresh container reaches
    // the identical answer, so rebooting only spends money.
    (await firstProcess()).exit(5);

    const run = await settled(runID);
    expect(run.state).toBe("failed");
    expect(sandboxes.booted).toHaveLength(1);
  });

  it("gives up after a bounded number of boots rather than looping forever", async () => {
    const { runID } = await ignite();
    // Every orchestrator this run is allowed crashes. A container that cannot
    // stay alive is telling you something a fourth boot will not fix.
    for (let boot = 0; boot < MAX_SANDBOX_BOOTS; boot++) {
      const sandbox = await waitFor(`sandbox ${boot + 1}`, async () =>
        sandboxes.booted.length > boot && sandboxes.booted[boot]!.processes.length > 0
          ? sandboxes.booted[boot]!
          : null
      );
      sandbox.current.exit(1);
    }

    const run = await settled(runID);
    expect(run.state).toBe("failed");
    expect(sandboxes.booted).toHaveLength(MAX_SANDBOX_BOOTS);
  });
});

describe("a run that outlives what one instance can watch", () => {
  it("stops it cleanly instead of booting a second orchestrator beside it", async () => {
    // Running out of looks is not a dead orchestrator. Rebooting here would put
    // two live orchestrators on the same project's `.tick/` (D4).
    set("RUN_MAX_OBSERVATIONS", "2");
    const { runID } = await ignite();
    const process = await firstProcess();
    process.say("orchestrator: still working\n");

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    expect(process.killed).toBe(true);
    // Exactly two sandboxes: the one that was watched out, and the closeout.
    expect(sandboxes.booted).toHaveLength(2);
    expect(sandboxes.phase("reconcile")).toBeUndefined();

    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");
  });
});

describe("a clean stop runs review and closeout", () => {
  it("stops on the operator's request and still closes the run out", async () => {
    const { runID, project, epic } = await ignite();
    const process = await firstProcess();
    process.say("orchestrator: wave 1 in flight\n");

    const stopped = await stopRun(env, runID, "operator");
    expect(stopped.outcome).toBe("stopping");

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    // The work orchestrator was given its grace window and then killed — the
    // in-flight tick's evidence is on the run branch either way.
    expect(process.killed).toBe(true);
    expect(closeout.env.TICKS_EPIC).toBe(epic);
    expect(closeout.env.TICKS_STOP_REASON ?? "").toContain("operator");

    closeout.exit(0);
    const run = await settled(runID);
    expect(run.state).toBe("stopped");

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.state).toBe("stopped");
    expect(record.detail ?? "").toContain("operator");
  });

  it("treats a cost budget exactly like the operator stop path", async () => {
    const { runID, epic } = await ignite();
    const process = await firstProcess();

    // A last known ground-truth value remains enforceable when a later
    // telemetry read fails. The default budget is $25 because this test does
    // not opt into an explicit budget without a readable gateway.
    await env.DB
      .prepare("UPDATE runs SET cost_usd = ? WHERE run_id = ?")
      .bind(25.5, runID)
      .run();

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    expect(process.killed).toBe(true);
    expect(closeout.env.TICKS_STOP_REASON ?? "").toMatch(/budget|cost/i);

    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");

    // "Why did this stop" is answerable from D1, not from a log line.
    const log = await listDispatchLogs(env.DB, runID, epic);
    expect(log.some((entry) => entry.reason === "budget_exhausted")).toBe(true);
  });

  it("treats a wall-clock budget the same way", async () => {
    set("RUN_MAX_WALL_CLOCK_MS", "1");
    const { runID } = await ignite();

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    expect(closeout.env.TICKS_STOP_REASON ?? "").toMatch(/wall|time/i);

    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");
  });

  it("still finalizes when the closeout orchestrator itself fails", async () => {
    const { runID } = await ignite();
    await firstProcess();
    await stopRun(env, runID, "operator");

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    closeout.exit(1);

    // A failed closeout is still a stopped run with a released lease: an
    // abandoned run is the one outcome a stop must never produce.
    const run = await settled(runID);
    expect(run.state).toBe("stopped");
    expect(await roomFor(env, run.project).leaseStatus()).toBeNull();
  });
});

// ---------------------------------------------------- the gateway (D17) ---

/** Stands in for the operator's AI Gateway, recording what reached it. */
function fakeGateway() {
  const calls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return Response.json({ ok: true });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

/** One model request made with a sandbox's own credential. */
async function modelCall(token: string, fetcher: typeof fetch): Promise<Response> {
  return proxyModelRequest(
    env,
    new Request(`${FACTORY}${GATEWAY_PATH_PREFIX}/anthropic/v1/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
    }),
    ["anthropic", "v1", "messages"],
    { fetcher }
  );
}

describe("the run's gateway credential is the kill switch", () => {
  it("stops a running orchestrator's model traffic the moment the run trips", async () => {
    const { runID } = await ignite();
    const process = await firstProcess();
    const token = process.env.AI_GATEWAY_TOKEN!;
    const gateway = fakeGateway();

    // Mid-run: the sandbox's credential spends.
    expect((await modelCall(token, gateway.fetcher)).status).toBe(200);
    expect(gateway.calls).toHaveLength(1);

    await stopRun(env, runID, "operator");
    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );

    // The orchestrator that was stopped cannot spend another cent, whether or
    // not it noticed it was stopped — enforcement at the credential layer.
    const refused = await modelCall(token, gateway.fetcher);
    expect(refused.status).toBe(403);
    await expect(refused.json()).resolves.toMatchObject({ error: "run_token_revoked" });
    expect(gateway.calls).toHaveLength(1);

    // Rotation, not a shutdown: closeout still has to reach review and
    // closeout (D15), so it boots with a credential of its own.
    const closeoutToken = closeout.env.AI_GATEWAY_TOKEN!;
    expect(closeoutToken).not.toBe(token);
    expect((await modelCall(closeoutToken, gateway.fetcher)).status).toBe(200);

    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");
  });

  it("kills the credential before the grace window when a budget trips, not after it", async () => {
    // Tick gyl's second defect. Finishing in-flight work is right for an
    // ordinary stop and wrong for a run that is already over its allowance:
    // the grace window is time the runaway spends. So a budget trip revokes
    // FIRST, and the drain happens on a container that can no longer spend.
    set("CLOUDFLARE_API_TOKEN", "cf-api-token");
    set("CLOUDFLARE_API_BASE_URL", LOGS_API);
    set("RUN_MAX_COST_USD", "1");
    // Wide enough that "before" and "after" the grace window are not the same
    // instant — the whole point of the assertion below.
    set("RUN_STOP_GRACE_MS", "3000");
    const logs = stubLogsAPI(9.99, undefined, 50);

    try {
      const { runID } = await ignite();
      const process = await firstProcess();
      const token = process.env.AI_GATEWAY_TOKEN!;
      const gateway = fakeGateway();
      expect((await modelCall(token, gateway.fetcher)).status).toBe(200);

      // The budget trips. The credential dies while the orchestrator is still
      // running, inside the window it would otherwise have kept spending in.
      await waitFor("the run's credential to be revoked", async () => {
        const tokens = await listRunGatewayTokens(env.DB, runID);
        return tokens.length > 0 && tokens.every((entry) => entry.revoked_at !== null);
      });
      expect(process.killed).toBe(false);
      const refused = await modelCall(token, gateway.fetcher);
      expect(refused.status).toBe(403);
      await expect(refused.json()).resolves.toMatchObject({ error: "run_token_revoked" });
      expect(gateway.calls).toHaveLength(1);

      // The unwind still happens: a stop must reach review and closeout (D15),
      // and a budget trip leaves no stop record, so closeout is credentialled.
      const closeout = await waitFor("the closeout orchestrator", async () =>
        sandboxes.phase("closeout")
      );
      closeout.exit(0);
      expect((await settled(runID)).state).toBe("stopped");
    } finally {
      logs.restore();
    }
  });

  it("does not re-credential a run under a hard stop, in any pass", async () => {
    // The defect that made the kill switch decorative on a live run: revoking
    // a token stopped nothing, because the supervisor minted a replacement at
    // the next boot — and the closeout pass, which enforces no budgets, did
    // not read stop records at all. Only deleting the container application
    // halted the spend. A hard stop is a durable refusal to mint.
    const { runID } = await ignite();
    const work = await firstProcess();
    const gateway = fakeGateway();

    // A clean stop first, exactly as the incident went: the run unwinds into
    // closeout and is credentialled again, and the spend continues.
    await stopRun(env, runID, "operator");
    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    const closeoutToken = closeout.env.AI_GATEWAY_TOKEN!;
    expect(closeoutToken).not.toBe(work.env.AI_GATEWAY_TOKEN);
    expect((await modelCall(closeoutToken, gateway.fetcher)).status).toBe(200);

    // Now the operator pulls the switch.
    const stop = await stopRun(env, runID, "operator", "hard");
    expect(stop.outcome).toBe("stopping");
    if (stop.outcome === "stopping") {
      expect(stop.mode).toBe("hard");
      expect(stop.tokens_revoked).toBe(1);
    }
    expect((await modelCall(closeoutToken, gateway.fetcher)).status).toBe(403);

    // And the container dies of it, the way a harness handed 403s does. The
    // supervisor must NOT answer that with a fresh container and a fresh
    // credential.
    sandboxes.booted.at(-1)!.vanished = true;

    const run = await settled(runID);
    expect(run.state).toBe("stopped");
    expect(sandboxes.booted).toHaveLength(2);
    const tokens = await listRunGatewayTokens(env.DB, runID);
    expect(tokens).toHaveLength(2);
    expect(tokens.every((entry) => entry.revoked_at !== null)).toBe(true);
    // Two model calls in the whole run, both before the switch was pulled.
    expect(gateway.calls).toHaveLength(1);
  });

  it("rotates the credential on every boot, so a dead container cannot spend", async () => {
    const { runID } = await ignite();
    const first = await firstProcess();
    const firstToken = first.env.AI_GATEWAY_TOKEN!;
    const gateway = fakeGateway();

    sandboxes.booted[0]!.vanished = true;
    const replacement = await waitFor("the replacement orchestrator", async () => {
      const sandbox = sandboxes.booted[1];
      return sandbox !== undefined && sandbox.processes.length > 0 ? sandbox.current : null;
    });

    // The container that was written off may still be alive somewhere. Its
    // credential is not.
    expect((await modelCall(firstToken, gateway.fetcher)).status).toBe(403);
    expect((await modelCall(replacement.env.AI_GATEWAY_TOKEN!, gateway.fetcher)).status).toBe(200);

    replacement.exit(0);
    await settled(runID);
  });

  it("leaves no live credential behind when the run is over", async () => {
    const { runID } = await ignite();
    const process = await firstProcess();
    const token = process.env.AI_GATEWAY_TOKEN!;
    process.exit(0);
    await settled(runID);

    const tokens = await listRunGatewayTokens(env.DB, runID);
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.every((entry) => entry.revoked_at !== null)).toBe(true);

    const gateway = fakeGateway();
    expect((await modelCall(token, gateway.fetcher)).status).toBe(403);
    expect(gateway.calls).toHaveLength(0);
  });

  it("refuses before boot when an explicit cost budget has no gateway telemetry", async () => {
    set("RUN_MAX_COST_USD", "1");
    const { runID, project } = await ignite();

    const run = await settled(runID);
    expect(run.state).toBe("failed");
    expect(sandboxes.booted).toHaveLength(0);

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.detail ?? "").toMatch(/AI Gateway.*cost telemetry/i);
    expect(record.detail ?? "").toContain("CLOUDFLARE_API_TOKEN");
    expect(record.detail ?? "").toContain("tk factory setup");
  });

  it("boots the sandbox when a configured cost budget can read its gateway telemetry", async () => {
    // The other half of the refusal above: the guard only grounds a run whose
    // telemetry is unreadable. With a logs API that answers, a budgeted run
    // proceeds — and the number it acts on is the gateway's, not a zero.
    set("CLOUDFLARE_API_TOKEN", "cf-api-token");
    set("CLOUDFLARE_API_BASE_URL", LOGS_API);
    set("RUN_MAX_COST_USD", "5");
    const logs = stubLogsAPI(0.02);

    try {
      const { runID, project } = await ignite();
      const process = await firstProcess();
      expect(sandboxes.booted).toHaveLength(1);
      orchestratorPushedWork();
      process.exit(0);
      const run = await settled(runID);

      expect(run.state).toBe("completed");
      // Every query the run made asked for metadata the way the API models it.
      expect(logs.filters.length).toBeGreaterThan(0);
      for (const filters of logs.filters) {
        expect(filters.map((filter) => filter.key)).toEqual([
          "metadata.key",
          "metadata.value",
        ]);
        expect(filters[0]!.value).toEqual(["run_id"]);
        expect(filters[1]!.value).toEqual([runID]);
      }
      const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
      expect(record.cost_source).toBe("gateway");
      expect(run.cost_usd).toBeCloseTo(0.02, 10);
    } finally {
      logs.restore();
    }
  });

  it("trips a cost budget on a run whose spend spans many log pages", async () => {
    // The run that found this made 887 model calls for $49.31 against a $25
    // budget, and kept going: only the first page of 50 was ever counted, so
    // the recorded cost was $2.98 and no budget could trip. The stub answers
    // as the API does — 50 rows a page, no `total_pages` — and the budget has
    // to act on the whole of it.
    set("CLOUDFLARE_API_TOKEN", "cf-api-token");
    set("CLOUDFLARE_API_BASE_URL", LOGS_API);
    set("RUN_MAX_COST_USD", "25");
    const logs = stubLogsAPI(0.0556, undefined, 887);

    try {
      const { runID, epic } = await ignite();
      const process = await firstProcess();

      const closeout = await waitFor("the closeout orchestrator", async () =>
        sandboxes.phase("closeout")
      );
      expect(process.killed).toBe(true);
      // The COST budget specifically: a wall-clock trip would satisfy a looser
      // pattern while the undercount sailed on underneath it.
      expect(closeout.env.TICKS_STOP_REASON ?? "").toMatch(/cost budget/i);

      closeout.exit(0);
      const run = await settled(runID);
      expect(run.state).toBe("stopped");
      // The whole invoice, not one page of it.
      expect(run.cost_usd).toBeCloseTo(887 * 0.0556, 6);
      expect(run.cost_usd).toBeGreaterThan(25);

      const log = await listDispatchLogs(env.DB, runID, epic);
      expect(log.some((entry) => entry.reason === "budget_exhausted")).toBe(true);
    } finally {
      logs.restore();
    }
  });

  it("tells the operator to report a rejected query, not to configure what is configured", async () => {
    // The live run this came from was told "run `tk factory setup
    // --cloudflare-api-token`" for a 400 caused by our own query shape — the
    // credential was already there, and no amount of setup would have helped.
    set("CLOUDFLARE_API_TOKEN", "cf-api-token");
    set("CLOUDFLARE_API_BASE_URL", LOGS_API);
    set("RUN_MAX_COST_USD", "1");
    const logs = stubLogsAPI(0, { status: 400, message: "Number must be less than or equal to 50" });

    try {
      const { runID, project } = await ignite();
      const run = await settled(runID);
      expect(run.state).toBe("failed");
      expect(sandboxes.booted).toHaveLength(0);

      const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
      const detail = record.detail ?? "";
      expect(detail).toContain("400");
      expect(detail).toContain("Number must be less than or equal to 50");
      expect(detail).toMatch(/report/i);
      // The remedy for a missing credential is the wrong advice here.
      expect(detail).not.toContain("tk factory setup --cloudflare-api-token");
    } finally {
      logs.restore();
    }
  });

  it("tells the operator to retry when the logs API is down, not to report a bug", async () => {
    set("CLOUDFLARE_API_TOKEN", "cf-api-token");
    set("CLOUDFLARE_API_BASE_URL", LOGS_API);
    set("RUN_MAX_COST_USD", "1");
    const logs = stubLogsAPI(0, { status: 503, message: "service unavailable" });

    try {
      const { runID, project } = await ignite();
      const run = await settled(runID);
      expect(run.state).toBe("failed");

      const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
      const detail = record.detail ?? "";
      expect(detail).toContain("503");
      expect(detail).toMatch(/retry/i);
    } finally {
      logs.restore();
    }
  });

  it("says in the record when gateway cost telemetry could not be read", async () => {
    // No explicit cost budget or CLOUDFLARE_API_TOKEN in this harness: the run
    // still runs, bounded by wall clock, and its record says the cost is
    // unknown rather than $0.
    set("RUN_MAX_COST_USD", undefined);
    const { runID, project } = await ignite();
    (await firstProcess()).exit(0);
    await settled(runID);

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.cost_source ?? "").toContain("CLOUDFLARE_API_TOKEN");
  });
});

describe("an unprovisioned deployment fails closed", () => {
  it("fails the run naming the missing sandbox binding", async () => {
    set("SANDBOXES", undefined);
    delete (env as unknown as Record<string, unknown>).SANDBOXES;
    const { runID, project } = await ignite();

    const run = await settled(runID);
    expect(run.state).toBe("failed");
    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord | null;
    expect(record?.detail ?? "").toContain("SANDBOXES");
  });

  it("fails the run naming the missing gateway", async () => {
    set("AI_GATEWAY_BASE_URL", undefined);
    delete (env as unknown as Record<string, unknown>).AI_GATEWAY_BASE_URL;
    const { runID, project } = await ignite();

    const run = await settled(runID);
    expect(run.state).toBe("failed");
    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord | null;
    expect(record?.detail ?? "").toContain("tk factory setup");
    expect(sandboxes.booted).toHaveLength(0);
  });
});

// ------------------------------------------------------ substrate = cloud ---

/**
 * substrate = cloud: per-tick worker containers for a wave (tick b6e).
 *
 * `dispatchWave` (0ds) and the worker entrypoint (tap) already exist and are
 * tested; this is the call site that makes them reachable from a real run.
 * The width-reconciliation math (`resolveDispatchWidth`, `chunkWave`) is
 * pure and tested directly; the wiring is proved end to end through the same
 * real-Workflow harness every other describe block in this file uses.
 */
describe("resolveDispatchWidth: two ceilings that must not disagree silently", () => {
  it("uses the deployment ceiling when no max_parallel is declared", () => {
    expect(resolveDispatchWidth(3, null)).toMatchObject({ width: 3, capped: false });
  });

  it("uses max_parallel when it fits under the ceiling", () => {
    expect(resolveDispatchWidth(5, 2)).toMatchObject({ width: 2, capped: false });
  });

  it("caps at the deployment ceiling and says so when max_parallel is wider", () => {
    const resolved = resolveDispatchWidth(3, 10);
    expect(resolved.width).toBe(3);
    expect(resolved.capped).toBe(true);
    expect(resolved.detail).toContain("10");
    expect(resolved.detail).toContain("3");
  });

  it("treats an equal request as uncapped", () => {
    expect(resolveDispatchWidth(3, 3)).toMatchObject({ width: 3, capped: false });
  });
});

describe("chunkWave", () => {
  it("splits a wave into batches of at most width, preserving order", () => {
    expect(chunkWave(["a", "b", "c", "d", "e"], 2)).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });

  it("returns one batch when width covers the whole wave", () => {
    expect(chunkWave(["a", "b"], 5)).toEqual([["a", "b"]]);
  });

  it("returns nothing for an empty wave", () => {
    expect(chunkWave([], 3)).toEqual([]);
  });
});

describe("summarizeCloudWave", () => {
  it("counts by verdict, and by not-launched separately from any verdict", () => {
    const outcome = (tickID: string, launched: boolean, verdict?: WorkerReport["verdict"]) => ({
      tick_id: tickID,
      sandbox_name: `s-${tickID}`,
      launched,
      probe: { ok: true } as const,
      confirm: null,
      process_id: null,
      detail: "",
      wait: null,
      collect: { ...defaultWorkerReport(tickID), ...(verdict === undefined ? {} : { verdict }) },
      teardown: { killed: false, destroyed: true, liveness: null },
    });
    const summary = summarizeCloudWave([
      outcome("aaa", true, "ready-to-merge"),
      outcome("bbb", true, "ready-to-merge"),
      outcome("ccc", true, "missing-result"),
      outcome("ddd", false),
    ]);
    expect(summary).toBe("1 missing-result, 1 not-launched, 2 ready-to-merge");
  });
});

describe("submitting a wave of ticks for per-tick cloud dispatch", () => {
  let collector: FakeWorkerCollector;

  beforeEach(() => {
    collector = new FakeWorkerCollector();
    set("WORKER_COLLECTOR", collector);
  });

  it("leaves the Phase 1 path completely unchanged when tick_ids is absent", async () => {
    const { runID } = await ignite();
    const process = await firstProcess();
    expect(sandboxes.booted).toHaveLength(1);
    expect(sandboxes.booted[0]!.name).not.toContain("-tick-");
    process.exit(0);
    await settled(runID);
  });

  it("boots one container per tick instead of one orchestrator, then hands off to closeout", async () => {
    const { runID, project, epic } = await ignite({ tickIDs: ["aaa", "bbb"] });

    await waitFor("both worker containers to boot", async () => {
      try {
        sandboxes.named(workerSandboxName(runID, "aaa"));
        sandboxes.named(workerSandboxName(runID, "bbb"));
        return true;
      } catch {
        return null;
      }
    });

    // No orchestrator sandbox for the WORK phase — only the two workers. (A
    // closeout orchestrator legitimately boots afterward; this checks the
    // work phase specifically, via TICKS_PHASE, not "nothing else was ever
    // booted".)
    expect(sandboxes.phase("run")).toBeUndefined();
    expect(sandboxes.named(workerSandboxName(runID, "aaa"))).toBeDefined();
    expect(sandboxes.named(workerSandboxName(runID, "bbb"))).toBeDefined();

    // Every container was given ITS OWN tick, never a shared one.
    const aaaWork = sandboxes
      .named(workerSandboxName(runID, "aaa"))
      .processes.find((p) => p.command === WORKER_COMMAND)!;
    const bbbWork = sandboxes
      .named(workerSandboxName(runID, "bbb"))
      .processes.find((p) => p.command === WORKER_COMMAND)!;
    expect(aaaWork.env.TICKS_TICK).toBe("aaa");
    expect(bbbWork.env.TICKS_TICK).toBe("bbb");
    // Both share ONE gateway token — never one per worker (D17's rotation
    // would have them revoke each other's).
    expect(aaaWork.env.AI_GATEWAY_TOKEN).toBe(bbbWork.env.AI_GATEWAY_TOKEN);

    // Collect read the durable layer for both, never a sandbox.
    expect(collector.asked.map((t) => t.tick_id).sort()).toEqual(["aaa", "bbb"]);

    // Per-tick workers only implement and push (tap); nothing merges or
    // closes the epic out, so a real orchestrator boots for that.
    const closeout = await waitFor("the closeout orchestrator", async () => sandboxes.phase("closeout"));
    expect(closeout.env.TICKS_EPIC).toBe(epic);
    expect(closeout.env.TICKS_STOP_REASON ?? "").toContain("cloud wave dispatched 2");

    closeout.exit(0);
    const run = await settled(runID);
    expect(run.state).toBe("stopped");

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.detail).toContain("cloud wave dispatched 2");
    expect(record.detail).toContain("ready-to-merge");
  });

  it("resolves the dispatch width from the deployment ceiling when no max_parallel is declared", async () => {
    set("FACTORY_MAX_INSTANCES", "5");
    const { runID, epic } = await ignite({ tickIDs: ["aaa"] });

    const logged = await waitFor("the wave's width to be logged", async () => {
      const logs = await listDispatchLogs(env.DB, runID, epic);
      return logs.find((l) => l.decision.startsWith("cloud_wave:width=")) ?? null;
    });
    expect(logged.decision).toBe("cloud_wave:width=5");

    const closeout = await waitFor("the closeout orchestrator", async () => sandboxes.phase("closeout"));
    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");
  });

  it("caps the wave at the deployment ceiling and says so when max_parallel is wider", async () => {
    set("FACTORY_MAX_INSTANCES", "2");
    repoConfig.source = "[orchestration]\nmax_parallel = 5\n";
    const { runID, epic } = await ignite({ tickIDs: ["aaa", "bbb", "ccc"] });

    const logged = await waitFor("the wave's width to be logged", async () => {
      const logs = await listDispatchLogs(env.DB, runID, epic);
      return logs.find((l) => l.decision.startsWith("cloud_wave:width=")) ?? null;
    });
    expect(logged.decision).toBe("cloud_wave:width=2:capped");

    const closeout = await waitFor("the closeout orchestrator", async () => sandboxes.phase("closeout"));
    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");
  });

  it("defers to the project's own narrower max_parallel rather than the deployment ceiling", async () => {
    set("FACTORY_MAX_INSTANCES", "5");
    repoConfig.source = "[orchestration]\nmax_parallel = 1\n";
    const { runID, epic } = await ignite({ tickIDs: ["aaa"] });

    const logged = await waitFor("the wave's width to be logged", async () => {
      const logs = await listDispatchLogs(env.DB, runID, epic);
      return logs.find((l) => l.decision.startsWith("cloud_wave:width=")) ?? null;
    });
    expect(logged.decision).toBe("cloud_wave:width=1");

    const closeout = await waitFor("the closeout orchestrator", async () => sandboxes.phase("closeout"));
    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");
  });

  it("fails the run without addressing an orchestrator sandbox when every probe fails", async () => {
    sandboxes.failProbeFor.add("aaa");
    sandboxes.failProbeFor.add("bbb");
    const { runID, project } = await ignite({ tickIDs: ["aaa", "bbb"] });

    const run = await settled(runID);
    expect(run.state).toBe("failed");

    // Zero orchestrator boots: `finalize`'s teardown loop must never ADDRESS
    // (and so provision) a sandbox named for an orchestrator attempt that
    // never happened.
    expect(sandboxes.booted.some((s) => !s.name.includes("-tick-"))).toBe(false);

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.detail).toContain("green-start probe");
  });
});

/**
 * The board finally sees a live run (tick bne).
 *
 * These drive the REAL Workflow with a recording sink in the `RUN_EVENTS`
 * seam, so what is asserted is what a deployed factory would actually put on
 * the wire — not what a builder returns in isolation (that is
 * test/run-events.test.ts).
 */
describe("a run streams run_event to the board", () => {
  let collector: FakeWorkerCollector;
  let published: RunEventMessage[];

  /** A sink that remembers what reached it, or refuses everything. */
  class WorkflowSink implements RunEventSink {
    fail: string | null = null;
    async publish(_project: string, event: RunEventMessage) {
      if (this.fail !== null) throw new Error(this.fail);
      published.push(event);
      return { delivered: true, detail: "ok" };
    }
  }

  let sink: WorkflowSink;

  beforeEach(() => {
    collector = new FakeWorkerCollector();
    set("WORKER_COLLECTOR", collector);
    published = [];
    sink = new WorkflowSink();
    set("RUN_EVENTS", sink);
  });

  const seen = (type: string) => published.filter((e) => e.event.type === type);

  it("shows a cloud run live, with per-tick state and substrate-shaped sources", async () => {
    const { runID, epic } = await ignite({ tickIDs: ["aaa", "bbb"] });

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");

    // The run announced itself before any container existed.
    const started = seen("epic-started");
    expect(started).toHaveLength(1);
    expect(started[0]!).toMatchObject({
      type: "run_event",
      epicId: epic,
      source: "cloud:orchestrator",
    });
    expect(started[0]!.taskId).toBeUndefined();
    expect(started[0]!.event.message).toContain(runID);

    // Per-tick state: one dispatch and one verdict for each tick, attributed
    // to the worker substrate and scoped to its own tick.
    const dispatched = seen("task-started");
    expect(dispatched.map((e) => e.taskId).sort()).toEqual(["aaa", "bbb"]);
    expect(dispatched.every((e) => e.source === "cloud:worker")).toBe(true);

    const finished = seen("task-completed");
    expect(finished.map((e) => e.taskId).sort()).toEqual(["aaa", "bbb"]);
    expect(finished.every((e) => e.source === "cloud:worker")).toBe(true);
    expect(finished.every((e) => e.event.status === "ready-to-merge")).toBe(true);
    expect(finished.every((e) => e.event.success === true)).toBe(true);

    // Dispatch is announced BEFORE the verdict for the same tick — a wave that
    // boots and then wedges must still have shown what it was working on.
    const order = published.map((e) => `${e.event.type}:${e.taskId ?? "-"}`);
    expect(order.indexOf("task-started:aaa")).toBeLessThan(order.indexOf("task-completed:aaa"));

    // And the run's last word.
    expect(seen("epic-completed")).toHaveLength(1);
    expect(seen("epic-completed")[0]!.source).toBe("cloud:orchestrator");
  });

  it("reports the durable verdict, never the worker's own claim, as success", async () => {
    // A worker that writes STATUS: DONE onto a branch with no commits is
    // exactly what collect exists to catch. The board must not show it green.
    collector.set("aaa", {
      verdict: "no-commits",
      commits: 0,
      status: "DONE",
      status_line: "STATUS: DONE",
      detail: "the branch has no commits beyond the base",
    });
    const { runID } = await ignite({ tickIDs: ["aaa"] });

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    closeout.exit(0);
    await settled(runID);

    const finished = seen("task-completed");
    expect(finished).toHaveLength(1);
    expect(finished[0]!.event.success).toBe(false);
    expect(finished[0]!.event.status).toBe("no-commits");
    // The claim is still shown — an operator wants to read it — it just is not
    // what decides the badge.
    expect(finished[0]!.event.message).toContain("DONE");
  });

  it("carries the gateway's cost on the closing event and never an agent's", async () => {
    set("CLOUDFLARE_API_TOKEN", "cf-api-token");
    set("CLOUDFLARE_API_BASE_URL", LOGS_API);
    const logs = stubLogsAPI(0.5, undefined, 4);

    try {
      const { runID } = await ignite({ tickIDs: ["aaa"] });
      const closeout = await waitFor("the closeout orchestrator", async () =>
        sandboxes.phase("closeout")
      );
      closeout.exit(0);
      const run = await settled(runID);

      const completed = seen("epic-completed");
      expect(completed).toHaveLength(1);
      // The same number the gateway logs produced and the index row recorded.
      expect(completed[0]!.event.metrics?.costUsd).toBeCloseTo(4 * 0.5, 6);
      expect(completed[0]!.event.metrics?.costUsd).toBeCloseTo(run.cost_usd, 6);
      // No per-tick event carries a cost at all: a worker has no way to put
      // one there.
      expect(seen("task-completed").every((e) => e.event.metrics === undefined)).toBe(true);
    } finally {
      logs.restore();
    }
  });

  it("publishes no cost at all when the gateway telemetry could not be read", async () => {
    // Unknown and free are different facts. The default harness has no
    // Cloudflare API token, so this is the unreadable case.
    const { runID } = await ignite({ tickIDs: ["aaa"] });
    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    closeout.exit(0);
    await settled(runID);

    const completed = seen("epic-completed");
    expect(completed).toHaveLength(1);
    expect(completed[0]!.event.metrics?.costUsd).toBeUndefined();
  });

  it("completes and collects identically when every event is dropped", async () => {
    // The load-bearing claim: the stream is observability, not control. A
    // board that refuses everything must change nothing about the run.
    sink.fail = "the board is down";
    const { runID, project } = await ignite({ tickIDs: ["aaa", "bbb"] });

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    closeout.exit(0);
    const run = await settled(runID);

    expect(run.state).toBe("stopped");
    expect(published).toHaveLength(0);
    // Collect still read the durable layer for both ticks, and the run record
    // still carries their verdicts.
    expect(collector.asked.map((t) => t.tick_id).sort()).toEqual(["aaa", "bbb"]);
    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.detail).toContain("cloud wave dispatched 2");
    expect(record.detail).toContain("ready-to-merge");
  });

  it("streams the Phase 1 single-orchestrator run too, without per-tick events", async () => {
    const { runID, epic } = await ignite();
    const process = await firstProcess();
    orchestratorPushedWork(epic);
    process.exit(0);

    expect((await settled(runID)).state).toBe("completed");
    expect(seen("epic-started")).toHaveLength(1);
    expect(seen("epic-completed")).toHaveLength(1);
    expect(seen("epic-completed")[0]!.event.success).toBe(true);
    expect(seen("task-started")).toHaveLength(0);
  });
});
