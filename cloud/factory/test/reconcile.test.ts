import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import {
  listWorkerManifests,
  readWorkerManifest,
  writeWorkerManifest,
  workerManifestKey,
  type WorkerManifest,
} from "../src/artifacts";
import {
  NOT_ASKED,
  adoptions,
  classifyWorker,
  dispatchable,
  manifestRecorder,
  probeLiveness,
  reconcileWave,
  settled,
  settledOutcome,
  summarizeReconcile,
  type Liveness,
  type WorkerEvidence,
} from "../src/reconcile";
import type {
  OrchestratorSandbox,
  SandboxBinding,
  SandboxOutput,
  SandboxProcessState,
  SandboxProcessView,
} from "../src/sandbox";
import { WORKER_COMMAND, WORKER_PROBE_COMMAND, workerBranch, workerTask } from "../src/worker-boot";
import type { WorkerCollector, WorkerReport, WorkerTask } from "../src/worker-collect";
import { workerSandboxName } from "../src/worker-dispatch";

/**
 * The reconcile protocol on the cloud substrate (tick s7f).
 *
 * The one rule everything here exists to hold: a live worker is never
 * redispatched, whatever its branch looks like. Every other case — merged
 * work, a dead container, an unreadable remote — is a corollary of reading the
 * evidence in the documented order and refusing to fold "cannot tell" into
 * "nothing is there".
 */

const PROJECT = "example-org/example-repo";
const EPIC = "1vn";
const BASE = "a".repeat(40);

// --------------------------------------------------------------- the fakes ---

class FakeProcess {
  state: SandboxProcessState = "running";
  exit_code: number | null = null;
  constructor(
    readonly id: string,
    readonly command: string
  ) {}
  get view(): SandboxProcessView {
    return { id: this.id, state: this.state, exit_code: this.exit_code, command: this.command };
  }
}

class FakeSandbox implements OrchestratorSandbox {
  readonly processes: FakeProcess[] = [];
  destroyed = false;
  /** The container answers, but its process list throws — "nobody can say". */
  listThrows = false;
  #next = 0;

  constructor(readonly name: string) {}

  running(command: string): FakeProcess {
    const process = new FakeProcess(`${this.name}-p${++this.#next}`, command);
    this.processes.push(process);
    return process;
  }

  async startProcess(command: string): Promise<SandboxProcessView> {
    return this.running(command).view;
  }
  async getProcess(id: string): Promise<SandboxProcessView | null> {
    return this.processes.find((p) => p.id === id)?.view ?? null;
  }
  async listProcesses(): Promise<SandboxProcessView[]> {
    if (this.listThrows) throw new Error("the container is not answering");
    return this.processes.map((p) => p.view);
  }
  async readOutput(_id: string, offset: number): Promise<SandboxOutput> {
    return { text: "", offset };
  }
  async killProcess(): Promise<void> {}
  async destroy(): Promise<void> {
    this.destroyed = true;
  }
}

class FakeSandboxes implements SandboxBinding {
  /** Every name addressed, in order — addressing one is what provisions it. */
  readonly gets: string[] = [];
  getThrows = new Set<string>();
  readonly #byName = new Map<string, FakeSandbox>();

  async get(name: string): Promise<OrchestratorSandbox> {
    this.gets.push(name);
    if (this.getThrows.has(name)) throw new Error(`${name} could not be addressed`);
    let sandbox = this.#byName.get(name);
    if (sandbox === undefined) {
      sandbox = new FakeSandbox(name);
      this.#byName.set(name, sandbox);
    }
    return sandbox;
  }

  /** Provisions the container without recording it as a reconcile address. */
  seed(name: string): FakeSandbox {
    const sandbox = new FakeSandbox(name);
    this.#byName.set(name, sandbox);
    return sandbox;
  }
}

class FakeCollector implements WorkerCollector {
  readonly asked: string[] = [];
  reports = new Map<string, WorkerReport>();
  throwsFor = new Set<string>();

  async collect(task: WorkerTask): Promise<WorkerReport> {
    this.asked.push(task.tick_id);
    if (this.throwsFor.has(task.tick_id)) throw new Error("GitHub said 503");
    return this.reports.get(task.tick_id) ?? noCommits(task.tick_id);
  }
}

function report(tickID: string, overrides: Partial<WorkerReport> = {}): WorkerReport {
  return {
    tick_id: tickID,
    branch: workerBranch(EPIC, tickID),
    base_sha: BASE,
    verdict: "ready-to-merge",
    branch_exists: true,
    commits: 3,
    result_path: `RESULT-${tickID}.md`,
    result_exists: true,
    status: "DONE",
    status_detail: "",
    status_line: "STATUS: DONE",
    boundary_files: [],
    detail: "ready to merge",
    ...overrides,
  };
}

/** What the remote says about a worker that has pushed nothing yet. */
function noCommits(tickID: string): WorkerReport {
  return report(tickID, {
    verdict: "no-commits",
    branch_exists: false,
    commits: 0,
    result_exists: false,
    status: "",
    status_line: "",
    detail: "the branch is not on the remote",
  });
}

function manifest(runID: string, tickID: string, overrides: Partial<WorkerManifest> = {}): WorkerManifest {
  return {
    run_id: runID,
    epic: EPIC,
    tick_id: tickID,
    sandbox_name: workerSandboxName(runID, tickID),
    branch: workerBranch(EPIC, tickID),
    base_sha: BASE,
    batch: 1,
    dispatched_at: "2026-08-22T00:00:00.000Z",
    ...overrides,
  };
}

function live(overrides: Partial<Liveness> = {}): Liveness {
  return {
    known: true,
    live: true,
    work_process_id: "p2",
    running: [WORKER_COMMAND],
    detail: "1 process(es) running",
    ...overrides,
  };
}

const dead: Liveness = {
  known: true,
  live: false,
  work_process_id: null,
  running: [],
  detail: "nothing is running",
};

function evidence(overrides: Partial<WorkerEvidence> = {}): WorkerEvidence {
  const tick = overrides.tick_id ?? "s7f";
  return {
    tick_id: tick,
    manifest: manifest("run_1", tick),
    report: noCommits(tick),
    liveness: dead,
    branch: workerBranch(EPIC, tick),
    sandbox_name: workerSandboxName("run_1", tick),
    ...overrides,
  };
}

// -------------------------------------------------- the rule with the scar ---

describe("a live worker is never redispatched, whatever its branch looks like", () => {
  // The failure this whole module exists to prevent. Phase 1 hit it for real:
  // a worker died mid-turn holding 643 uncommitted lines and settled looking
  // finished. An empty branch is what a live worker looks like.
  it("adopts a worker that is mid-turn with an EMPTY branch", () => {
    const item = classifyWorker(evidence({ liveness: live(), report: noCommits("s7f") }));

    expect(item.class).toBe("live-worker");
    expect(item.action).toBe("adopt");
    expect(item.redispatch).toBe(false);
    expect(item.adopt_process_id).toBe("p2");
  });

  it("adopts it when the branch exists with zero commits, and says why that proves nothing", () => {
    const item = classifyWorker(
      evidence({
        liveness: live(),
        report: report("s7f", { verdict: "no-commits", branch_exists: true, commits: 0 }),
      })
    );

    expect(item.class).toBe("live-worker");
    expect(item.redispatch).toBe(false);
    expect(item.reason).toContain("no commits yet");
    expect(item.reason).toContain("not evidence of a dead worker");
  });

  it("adopts it even when the remote cannot be read at all", () => {
    const item = classifyWorker(evidence({ liveness: live(), report: null }));

    // Source 3 settles it before source 2 is ever consulted.
    expect(item.class).toBe("live-worker");
    expect(item.redispatch).toBe(false);
  });

  it("refuses to redispatch a container it could not ask", () => {
    const item = classifyWorker(
      evidence({
        liveness: { known: false, live: false, work_process_id: null, running: [], detail: "timed out" },
      })
    );

    expect(item.class).toBe("unknown");
    expect(item.action).toBe("inspect");
    expect(item.redispatch).toBe(false);
    expect(item.contradictions[0]).toContain("never redispatched");
  });

  it("refuses to redispatch a container busy with something that is not the work command", () => {
    const item = classifyWorker(
      evidence({
        liveness: live({ work_process_id: null, running: [WORKER_PROBE_COMMAND] }),
      })
    );

    expect(item.class).toBe("unknown");
    expect(item.action).toBe("inspect");
    expect(item.redispatch).toBe(false);
    expect(item.contradictions[0]).toContain(WORKER_PROBE_COMMAND);
  });

  it("prefers durable git evidence over a busy container when git is already conclusive", () => {
    // tick oun: the container being busy with something other than the work
    // command is a safe reason not to redispatch, but it is not a reason to
    // escalate to a human when git already shows the tick landed.
    const item = classifyWorker(
      evidence({
        liveness: live({ work_process_id: null, running: [WORKER_PROBE_COMMAND] }),
        report: report("s7f"),
      })
    );

    expect(item.class).toBe("already-landed");
    expect(item.action).toBe("skip");
    expect(item.redispatch).toBe(false);
    expect(item.contradictions).toEqual([]);
  });
});

// -------------------------------------------------------- the dead classes ---

describe("classifying a tick whose container is gone", () => {
  it("redispatches ONTO THE BRANCH when the dead worker pushed commits", () => {
    const item = classifyWorker(
      evidence({ report: report("s7f", { verdict: "missing-result", commits: 2 }) })
    );

    expect(item.class).toBe("dead-with-work");
    expect(item.action).toBe("redispatch-from-branch");
    expect(item.redispatch).toBe(true);
    expect(item.reason).toContain("never gets a second branch");
  });

  it("dispatches again when a dispatched container left nothing behind", () => {
    const item = classifyWorker(evidence({}));

    expect(item.class).toBe("stale-no-work");
    expect(item.action).toBe("dispatch");
    expect(item.redispatch).toBe(true);
  });

  it("never redoes work that already landed", () => {
    const item = classifyWorker(evidence({ report: report("s7f") }));

    expect(item.class).toBe("already-landed");
    expect(item.action).toBe("skip");
    expect(item.redispatch).toBe(false);
  });

  it("leaves a dispatched tick alone when the remote could not be read", () => {
    // "Cannot tell" is not zero commits. Redispatching on an unreadable remote
    // is how a reconcile overwrites work nobody has looked at.
    const item = classifyWorker(
      evidence({ report: report("s7f", { verdict: "unknown", detail: "GitHub said 503" }) })
    );

    expect(item.class).toBe("unknown");
    expect(item.action).toBe("inspect");
    expect(item.redispatch).toBe(false);
    expect(item.contradictions[0]).toContain("not zero commits");
  });

  it("dispatches a tick with no manifest, because no manifest means no container", () => {
    const item = classifyWorker(evidence({ manifest: null, liveness: NOT_ASKED }));

    expect(item.class).toBe("never-dispatched");
    expect(item.action).toBe("dispatch");
    // Not a redispatch: nothing was ever dispatched for this tick.
    expect(item.redispatch).toBe(false);
  });

  it("still dispatches a tick with no manifest when the remote is unreadable", () => {
    const item = classifyWorker(
      evidence({ manifest: null, liveness: NOT_ASKED, report: null })
    );

    expect(item.class).toBe("never-dispatched");
    expect(item.action).toBe("dispatch");
  });
});

// ---------------------------------------------------- the live sandbox list ---

describe("probeLiveness", () => {
  let binding: FakeSandboxes;

  beforeEach(() => {
    binding = new FakeSandboxes();
  });

  it("finds the running work process and ignores a finished probe", async () => {
    const sandbox = binding.seed("box");
    const probe = sandbox.running(WORKER_PROBE_COMMAND);
    probe.state = "completed";
    probe.exit_code = 0;
    const work = sandbox.running(WORKER_COMMAND);

    const liveness = await probeLiveness(binding, "box");

    expect(liveness.known).toBe(true);
    expect(liveness.live).toBe(true);
    expect(liveness.work_process_id).toBe(work.id);
  });

  it("reports an empty container as dead, not as unknown", async () => {
    binding.seed("box");

    const liveness = await probeLiveness(binding, "box");

    expect(liveness.known).toBe(true);
    expect(liveness.live).toBe(false);
  });

  it("reports a container that cannot be asked as unknown, not as empty", async () => {
    binding.seed("box").listThrows = true;

    const liveness = await probeLiveness(binding, "box");

    expect(liveness.known).toBe(false);
    expect(liveness.live).toBe(false);
  });

  it("reports a container that cannot be addressed as unknown", async () => {
    binding.getThrows.add("box");

    expect((await probeLiveness(binding, "box")).known).toBe(false);
  });
});

// ------------------------------------------------------- the whole protocol ---

describe("reconcileWave", () => {
  let binding: FakeSandboxes;
  let collector: FakeCollector;
  const RUN = "run_reconcile";

  const input = (tickIDs: string[], runID = RUN) => ({
    bucket: env.ARTIFACTS as R2Bucket,
    project: PROJECT,
    run_id: runID,
    epic: EPIC,
    tick_ids: tickIDs,
    binding,
    collector,
    sandboxNameFor: (tick: string) => workerSandboxName(runID, tick),
    taskFor: (tick: string) => workerTask(EPIC, tick, BASE),
  });

  beforeEach(() => {
    binding = new FakeSandboxes();
    collector = new FakeCollector();
  });

  it("asks manifests first, and NEVER addresses a container no manifest names", async () => {
    // Addressing a container is what provisions it on this substrate, so a
    // reconcile that probes an undispatched tick boots the container it was
    // run to avoid booting. The evidence order is what prevents that.
    const runID = `${RUN}_order`;
    await writeWorkerManifest(env.ARTIFACTS, PROJECT, manifest(runID, "aaa"));

    const plan = await reconcileWave(input(["aaa", "bbb"], runID));

    expect(binding.gets).toEqual([workerSandboxName(runID, "aaa")]);
    expect(plan.items.find((i) => i.tick_id === "bbb")!.class).toBe("never-dispatched");
    expect(plan.items.find((i) => i.tick_id === "bbb")!.evidence.liveness).toEqual(NOT_ASKED);
  });

  it("adopts the live worker and dispatches the one that was never booted", async () => {
    const runID = `${RUN}_mixed`;
    await writeWorkerManifest(env.ARTIFACTS, PROJECT, manifest(runID, "aaa"));
    binding.seed(workerSandboxName(runID, "aaa")).running(WORKER_COMMAND);

    const plan = await reconcileWave(input(["aaa", "bbb"], runID));

    expect(plan.counts["live-worker"]).toBe(1);
    expect(plan.counts["never-dispatched"]).toBe(1);
    expect(adoptions(plan).has("aaa")).toBe(true);
    expect(dispatchable(plan).map((i) => i.tick_id)).toEqual(["bbb"]);
    expect(plan.summary).toContain("1 live-worker");
  });

  it("falls through to git when the container came back empty — the cold path", async () => {
    // Snapshot/restore is an accelerator. With the container gone, the same
    // recovery still works from git alone: the branch it pushed is continued.
    const runID = `${RUN}_cold`;
    await writeWorkerManifest(env.ARTIFACTS, PROJECT, manifest(runID, "aaa"));
    collector.reports.set("aaa", report("aaa", { verdict: "missing-result", commits: 4 }));

    const plan = await reconcileWave(input(["aaa"], runID));

    expect(plan.items[0]!.class).toBe("dead-with-work");
    expect(plan.items[0]!.action).toBe("redispatch-from-branch");
  });

  it("leaves every tick unknown when the manifests themselves cannot be listed", async () => {
    const broken = {
      ...input(["aaa"]),
      bucket: {
        list: async () => {
          throw new Error("R2 is unreachable");
        },
      } as unknown as R2Bucket,
    };

    const plan = await reconcileWave(broken);

    // A listing that failed is not an empty listing: it must never read as
    // "nothing was dispatched".
    expect(plan.items[0]!.class).toBe("unknown");
    expect(dispatchable(plan)).toHaveLength(0);
    expect(binding.gets).toHaveLength(0);
  });

  it("treats a collector that throws as an unreadable remote, not as an empty branch", async () => {
    const runID = `${RUN}_throw`;
    await writeWorkerManifest(env.ARTIFACTS, PROJECT, manifest(runID, "aaa"));
    collector.throwsFor.add("aaa");

    const plan = await reconcileWave(input(["aaa"], runID));

    expect(plan.items[0]!.class).toBe("unknown");
    expect(plan.items[0]!.redispatch).toBe(false);
  });

  it("reports the ticks it left alone rather than dropping them from the wave", async () => {
    const runID = `${RUN}_settled`;
    await writeWorkerManifest(env.ARTIFACTS, PROJECT, manifest(runID, "aaa"));
    collector.reports.set("aaa", report("aaa"));

    const plan = await reconcileWave(input(["aaa"], runID));
    const item = settled(plan)[0]!;
    const outcome = settledOutcome(item, workerTask(EPIC, "aaa", BASE));

    expect(item.class).toBe("already-landed");
    expect(outcome.launched).toBe(false);
    expect(outcome.adopted).toBe(false);
    expect(outcome.settled).toBe("already-landed");
    // Nothing was addressed for it, so nothing is torn down.
    expect(outcome.teardown.destroyed).toBe(false);
    expect(outcome.collect.verdict).toBe("ready-to-merge");
  });
});

// ---------------------------------------------------------- the manifests ---

describe("the manifest store", () => {
  it("round-trips, lists in tick order, and ignores the orchestrator's own artifacts", async () => {
    const runID = "run_manifests";
    await env.ARTIFACTS.put(
      `runs/${PROJECT}/${runID}/artifacts/orchestrator/reconcile/001.json`,
      "{}"
    );
    for (const tick of ["ccc", "aaa", "bbb"]) {
      await writeWorkerManifest(env.ARTIFACTS, PROJECT, manifest(runID, tick));
    }

    const listed = await listWorkerManifests(env.ARTIFACTS, PROJECT, runID);

    expect(listed.map((m) => m.tick_id)).toEqual(["aaa", "bbb", "ccc"]);
    expect((await readWorkerManifest(env.ARTIFACTS, PROJECT, runID, "aaa"))!.branch).toBe(
      workerBranch(EPIC, "aaa")
    );
    expect(workerManifestKey(PROJECT, runID, "aaa")).toContain(`/${runID}/artifacts/aaa/`);
  });

  it("records the dispatch before the container exists, then the work process on top", async () => {
    const runID = "run_recorder";
    const recorder = manifestRecorder(env.ARTIFACTS, PROJECT, {
      run_id: runID,
      epic: EPIC,
      batch: 2,
    });
    const task = workerTask(EPIC, "s7f", BASE);
    const name = workerSandboxName(runID, "s7f");

    await recorder.dispatched(task, name);
    const first = (await readWorkerManifest(env.ARTIFACTS, PROJECT, runID, "s7f"))!;
    await recorder.started(task, name, "proc-9");
    const second = (await readWorkerManifest(env.ARTIFACTS, PROJECT, runID, "s7f"))!;

    expect(first.sandbox_name).toBe(name);
    expect(first.batch).toBe(2);
    expect(first.process_id).toBeUndefined();
    expect(second.process_id).toBe("proc-9");
    // The rest of the manifest survives the update.
    expect(second.dispatched_at).toBe(first.dispatched_at);
  });

  it("records a failed probe's output beside the manifest (tick ys3)", async () => {
    const runID = "run_probe_failure";
    const recorder = manifestRecorder(env.ARTIFACTS, PROJECT, {
      run_id: runID,
      epic: EPIC,
      batch: 1,
    });
    const task = workerTask(EPIC, "3nh", BASE);
    const name = workerSandboxName(runID, "3nh");

    await recorder.dispatched(task, name);
    await recorder.probeFailed!(task, name, {
      ok: false,
      reason: "wrong-output",
      detail: "the probe exited 0 without producing \"ticks-worker-probe-ok\": PATH resolved but tk did not",
      output: "8.19.2\n",
    });
    const manifest_ = (await readWorkerManifest(env.ARTIFACTS, PROJECT, runID, "3nh"))!;

    expect(manifest_.probe_failure).toBeDefined();
    expect(manifest_.probe_failure!.reason).toBe("wrong-output");
    expect(manifest_.probe_failure!.output).toBe("8.19.2\n");
    expect(manifest_.probe_failure!.detail).toContain("ticks-worker-probe-ok");
    // The rest of the manifest — written by `dispatched` before the probe
    // ever ran — survives: a probe failure does not erase what was known.
    expect(manifest_.sandbox_name).toBe(name);
    expect(manifest_.batch).toBe(1);
  });
});

describe("summarizeReconcile", () => {
  it("names only the classes that occurred", () => {
    expect(
      summarizeReconcile({
        "live-worker": 2,
        "already-landed": 1,
        "dead-with-work": 0,
        "stale-no-work": 0,
        "never-dispatched": 0,
        unknown: 0,
      })
    ).toBe("1 already-landed, 2 live-worker");
  });
});
