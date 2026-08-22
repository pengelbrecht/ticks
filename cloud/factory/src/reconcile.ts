/**
 * The reconcile protocol on the cloud substrate — what a replacement
 * supervisor establishes before it starts anything (tick s7f).
 *
 * The orchestrator is EXPECTED to die: context exhaustion, container eviction,
 * an API that stops answering. Phase 1 boots a replacement (`TICKS_PHASE=
 * reconcile`, src/run-workflow.ts). This module is what makes the replacement
 * *correct*, and it lives in the durable layer for the same reason the budgets
 * do: a prompt can be talked out of a rule, and a Workflow step cannot. The
 * container is still told to reconcile — `cloud/sandbox/entrypoint.sh` words
 * it — but nothing depends on it having listened.
 *
 * # The evidence order
 *
 * `docs/design/cloud-factory.md` fixes it, `internal/herd/reconcile` field-
 * tested it on the herdr substrate, and [reconcileWave] follows it exactly:
 *
 *  1. **Manifests** ([listWorkerManifests]) — the authority on what was
 *     *dispatched*. Written to R2 BEFORE a tick's container is addressed, and
 *     addressing a container is what provisions it, so an absent manifest is a
 *     durable statement that no container exists for that tick. Nothing else
 *     in this protocol can say that, which is why the order starts here.
 *  2. **Git** — the authority on what *work exists*: the branch, its commits
 *     beyond the epic base, and the report, read through the same
 *     `WorkerCollector` a live wave collects with. Only the durable layer is
 *     consulted; a container's terminal output is never evidence.
 *  3. **The live sandbox list** — the authority on what is *still running*.
 *     Asked only of containers a manifest names, because asking a container
 *     anything provisions it, and a reconcile that boots the containers it was
 *     run to avoid is worse than no reconcile at all.
 *
 * # The rule this substrate inherits
 *
 * **A live worker is never redispatched, whatever its branch looks like.** A
 * branch with no commits is exactly what a worker that has not committed yet
 * looks like — Phase 1 hit this for real when a worker died mid-turn holding
 * 643 uncommitted lines and settled looking finished. So git evidence is read
 * (it is cheap, and an operator needs it) but it never overrules the live
 * process list, and a container that cannot be ASKED what is running in it is
 * `unknown`, never a redispatch.
 *
 * # Cold reconstruction always works
 *
 * Axiom 1: durable state is git plus `.tick/` plus the run's artifacts.
 * Nothing here depends on a container surviving, on a snapshot being
 * restorable, or on any in-memory state of the supervisor that died. A
 * container that came back empty simply produces no live process, the plan
 * falls through to the git evidence, and the tick is redispatched onto its
 * EXISTING branch — which `cloud/sandbox/worker.sh` adopts from origin. That
 * is the same recovery, only slower: the work the dead container had not
 * pushed is the work that gets redone.
 *
 * This module mutates nothing. It produces a plan; the caller decides.
 */

import {
  listWorkerManifests,
  readWorkerManifest,
  writeWorkerManifest,
  type WorkerManifest,
} from "./artifacts";
import type { OrchestratorSandbox, SandboxBinding } from "./sandbox";
import { WORKER_COMMAND } from "./worker-boot";
import type { WorkerCollector, WorkerReport, WorkerTask } from "./worker-collect";
import {
  NOT_ADDRESSED,
  type Adoption,
  type ProbeOutcome,
  type WorkerRecorder,
  type WorkerWaveOutcome,
} from "./worker-dispatch";

// ------------------------------------------------------------ the classes ---

/**
 * What one tick of a wave actually is, right now. Exhaustive and mutually
 * exclusive, mirroring `internal/herd/reconcile`'s five classes with the two
 * differences a container substrate forces: there is no native session to
 * resume (a dead container is gone, not suspended), and a tick whose work has
 * already reached the remote is worth naming separately, because redoing
 * merged work is the other half of what a reconcile exists to prevent.
 */
export type WorkerClass =
  /** A process is running in this tick's container. Adopt it; never redispatch. */
  | "live-worker"
  /** Nothing is running, and git already carries a mergeable branch. Nothing to do. */
  | "already-landed"
  /** Nothing is running, but the branch carries commits. Redispatch ONTO THAT BRANCH. */
  | "dead-with-work"
  /** A container was dispatched, nothing is running, and nothing was pushed. */
  | "stale-no-work"
  /** No manifest: no container was ever booted for this tick in this run. */
  | "never-dispatched"
  /** The evidence contradicts itself. Surfaced, never auto-resolved. */
  | "unknown";

/** What the plan proposes. One per class. */
export type WorkerAction =
  /** Wait on the process that is already running, then collect it as usual. */
  | "adopt"
  /** Boot a container for this tick. */
  | "dispatch"
  /** Boot a container that continues the pushed branch rather than a second one. */
  | "redispatch-from-branch"
  /** Leave it entirely alone — its work is already in git. */
  | "skip"
  /** A human decides. The plan proposes no mutation at all. */
  | "inspect";

// ----------------------------------------------------------- the evidence ---

/** What the live sandbox list said about one tick's container. */
export type Liveness = {
  /**
   * Whether the container could be asked at all. A listing that threw leaves
   * this false, and "I could not ask" must never read as "nothing is running"
   * — that is the evidence gap that redispatches a live worker.
   */
  known: boolean;
  /** At least one process in the container is running. */
  live: boolean;
  /**
   * The running WORK process, when there is one. A running green-start probe
   * is live but not adoptable: there is no work process to wait on yet.
   */
  work_process_id: string | null;
  /** Every running command, for the operator who has to read an `unknown`. */
  running: string[];
  detail: string;
};

/** A container that was never asked, because no manifest named one. */
export const NOT_ASKED: Liveness = {
  known: true,
  live: false,
  work_process_id: null,
  running: [],
  detail: "no manifest names a container for this tick, so none was addressed",
};

/** Everything the three sources said about one tick, reported whole. */
export type WorkerEvidence = {
  tick_id: string;
  /** Source 1. Null means no container was ever booted for this tick. */
  manifest: WorkerManifest | null;
  /** Source 2. Null only when the collector itself could not be run. */
  report: WorkerReport | null;
  /** Source 3. */
  liveness: Liveness;
  branch: string;
  sandbox_name: string;
};

/** One classified tick. */
export type ReconcileItem = {
  tick_id: string;
  class: WorkerClass;
  action: WorkerAction;
  /**
   * Whether the plan starts a NEW worker for a tick this run already
   * dispatched one for. False for every live worker — the invariant that
   * keeps a crash recovery from doubling up on a tick.
   */
  redispatch: boolean;
  /** The process to wait on, set exactly when the action is `adopt`. */
  adopt_process_id: string | null;
  reason: string;
  /** Non-empty only for `unknown`; each entry names both sides of the disagreement. */
  contradictions: string[];
  evidence: WorkerEvidence;
};

/** The whole plan. Nothing in it has been executed. */
export type ReconcilePlan = {
  run_id: string;
  epic: string;
  items: ReconcileItem[];
  counts: Record<WorkerClass, number>;
  summary: string;
};

// -------------------------------------------------------- classification ---

/**
 * The verdict for one tick, from its evidence alone.
 *
 * Pure and total: every evidence shape lands in exactly one class, and the
 * ordering of the checks IS the protocol. Liveness is consulted before git,
 * and an unanswerable container short-circuits both.
 */
export function classifyWorker(evidence: WorkerEvidence): ReconcileItem {
  const item = (
    cls: WorkerClass,
    action: WorkerAction,
    reason: string,
    extra: { redispatch?: boolean; adopt?: string | null; contradictions?: string[] } = {}
  ): ReconcileItem => ({
    tick_id: evidence.tick_id,
    class: cls,
    action,
    redispatch: extra.redispatch ?? false,
    adopt_process_id: extra.adopt ?? null,
    reason,
    contradictions: extra.contradictions ?? [],
    evidence,
  });

  const { manifest, report, liveness } = evidence;

  // A container that cannot be asked is not a container that is empty. This
  // check comes first because every branch below it would otherwise be
  // reasoning from an absence it has no right to treat as a fact.
  if (!liveness.known) {
    return item(
      "unknown",
      "inspect",
      "the container could not be asked what is running in it",
      {
        contradictions: [
          `the manifest records container ${evidence.sandbox_name} for this tick, but its ` +
            `process list could not be read (${liveness.detail}); a worker that cannot be ` +
            "proved dead is never redispatched",
        ],
      }
    );
  }

  if (liveness.live && liveness.work_process_id !== null) {
    const branch =
      report !== null && report.branch_exists && report.commits === 0
        ? `. Its branch has no commits yet — that is not evidence of a dead worker`
        : "";
    return item(
      "live-worker",
      "adopt",
      `a worker process is running in ${evidence.sandbox_name} — adopt it and wait; never ` +
        `redispatch a live worker, whatever its branch looks like${branch}`,
      { adopt: liveness.work_process_id }
    );
  }

  if (liveness.live) {
    // The container's business is genuinely ambiguous on its own — but when
    // git already carries a mergeable branch, that evidence is durable and
    // conclusive regardless of what the container is doing, and escalating to
    // a human here would ask them to adjudicate a question git already
    // answered (tick 6uv).
    if (report !== null && report.verdict === "ready-to-merge") {
      return item(
        "already-landed",
        "skip",
        `${evidence.branch} already carries ${report.commits} commit(s) and ${report.result_path}: ` +
          `the work is in git, and a reconcile never redoes work that landed — ${evidence.sandbox_name} ` +
          "is still busy with something other than the work command, but durable evidence is " +
          "unambiguous, so it is left alone rather than escalated"
      );
    }
    return item("unknown", "inspect", "the container is busy with something that is not the work command", {
      contradictions: [
        `${evidence.sandbox_name} has ${liveness.running.length} running process(es) ` +
          `(${liveness.running.join(", ")}) and none of them is ${WORKER_COMMAND}: the ` +
          "dispatch was in flight when the supervisor died. Nothing is adopted and nothing " +
          "is redispatched — a second container here would put two workers on one tick",
      ],
    });
  }

  // Nothing is running. Now, and only now, git decides.
  if (report === null || report.verdict === "unknown") {
    const why = report === null ? "the collector could not be run" : report.detail;
    if (manifest === null) {
      // The manifest's absence is decisive on its own: no container was ever
      // booted for this tick, so booting one cannot double up — and
      // `cloud/sandbox/worker.sh` adopts any branch it finds at this base.
      return item(
        "never-dispatched",
        "dispatch",
        `no manifest, so no container was ever booted for this tick; the remote could not be ` +
          `read (${why}) but that cannot make a first dispatch unsafe`
      );
    }
    return item("unknown", "inspect", "the remote could not be read for a tick that was dispatched", {
      contradictions: [
        `container ${evidence.sandbox_name} was dispatched and is no longer running, but ` +
          `${evidence.branch} could not be read (${why}); "cannot tell" is not zero commits, ` +
          "and redispatching on it would overwrite work nobody has looked at",
      ],
    });
  }

  if (report.verdict === "ready-to-merge") {
    return item(
      "already-landed",
      "skip",
      `${evidence.branch} already carries ${report.commits} commit(s) and ${report.result_path}: ` +
        "the work is in git, and a reconcile never redoes work that landed"
    );
  }

  if (report.commits > 0) {
    return item(
      "dead-with-work",
      "redispatch-from-branch",
      `nothing is running and ${evidence.branch} carries ${report.commits} commit(s) beyond the ` +
        "base: dispatch a fresh container that CONTINUES that branch. One tick never gets a " +
        "second branch",
      { redispatch: true }
    );
  }

  if (manifest === null) {
    return item(
      "never-dispatched",
      "dispatch",
      "no manifest and no pushed work: this tick has not been dispatched in this run"
    );
  }

  return item(
    "stale-no-work",
    "dispatch",
    `container ${evidence.sandbox_name} was dispatched, nothing is running in it, and ` +
      `${evidence.branch} carries no commits: there is nothing to recover, so dispatch it again`,
    { redispatch: true }
  );
}

// ------------------------------------------------------------- the sources ---

/**
 * Asks one container what is running in it.
 *
 * Every failure is reported as `known: false` rather than as an empty list.
 * A binding that throws, a container that has gone away, a listing that times
 * out — all of them mean "nobody can say", and this protocol's whole point is
 * that "nobody can say" is a different answer from "nothing is running".
 */
export async function probeLiveness(
  binding: SandboxBinding,
  sandboxName: string,
  workCommand: string = WORKER_COMMAND
): Promise<Liveness> {
  let sandbox: OrchestratorSandbox;
  try {
    sandbox = await binding.get(sandboxName);
  } catch (error) {
    return {
      known: false,
      live: false,
      work_process_id: null,
      running: [],
      detail: `the container could not be addressed: ${String(error)}`,
    };
  }
  let processes;
  try {
    processes = await sandbox.listProcesses();
  } catch (error) {
    return {
      known: false,
      live: false,
      work_process_id: null,
      running: [],
      detail: `the container's process list could not be read: ${String(error)}`,
    };
  }
  const running = processes.filter((p) => p.state === "running");
  // The work command, not merely "some process": the green-start probe runs
  // in the same container and a finished probe proves nothing about the work.
  const work = running.find((p) => (p.command ?? "") === workCommand) ?? null;
  return {
    known: true,
    live: running.length > 0,
    work_process_id: work === null ? null : work.id,
    running: running.map((p) => p.command ?? p.id),
    detail:
      running.length === 0
        ? `nothing is running in ${sandboxName}`
        : `${running.length} process(es) running in ${sandboxName}`,
  };
}

/** What [reconcileWave] needs to establish the state of a wave. */
export type ReconcileInput = {
  bucket: R2Bucket;
  project: string;
  run_id: string;
  epic: string;
  /** The ticks the plan must cover — the batch, or the whole wave. */
  tick_ids: string[];
  binding: SandboxBinding;
  collector: WorkerCollector;
  sandboxNameFor: (tickID: string) => string;
  taskFor: (tickID: string) => WorkerTask;
};

/**
 * Establishes what is actually going on, in the documented evidence order,
 * and returns the plan.
 *
 * Read-only. It boots nothing, kills nothing and writes nothing — including
 * when the evidence is contradictory, which is exactly when a helpful
 * mutation would be most expensive.
 */
export async function reconcileWave(input: ReconcileInput): Promise<ReconcilePlan> {
  // 1. Manifests. One listing for the whole run: they are the authority on
  //    what was dispatched, and every later source is asked on their say-so.
  let manifests: WorkerManifest[] = [];
  try {
    manifests = await listWorkerManifests(input.bucket, input.project, input.run_id);
  } catch (error) {
    // A manifest listing that failed is NOT an empty listing. Treating it as
    // one would say "nothing was dispatched" about a run that dispatched a
    // wave, so every tick is left unknown instead.
    const detail = `the run's worker manifests could not be listed: ${String(error)}`;
    const items = input.tick_ids.map((tick) => ({
      tick_id: tick,
      class: "unknown" as const,
      action: "inspect" as const,
      redispatch: false,
      adopt_process_id: null,
      reason: "the first evidence source could not be read",
      contradictions: [
        `${detail}; without them nothing can say whether a container exists for this tick, ` +
          "and a reconcile that guesses boots a second worker",
      ],
      evidence: {
        tick_id: tick,
        manifest: null,
        report: null,
        liveness: NOT_ASKED,
        branch: input.taskFor(tick).branch,
        sandbox_name: input.sandboxNameFor(tick),
      },
    }));
    return plan(input, items);
  }
  const byTick = new Map(manifests.map((m) => [m.tick_id, m]));

  const items = await Promise.all(
    input.tick_ids.map(async (tick) => {
      const manifest = byTick.get(tick) ?? null;
      const task = input.taskFor(tick);
      const sandbox_name = manifest?.sandbox_name ?? input.sandboxNameFor(tick);

      // 2. Git. Always read — it is what an operator needs to see even for a
      //    tick whose container is alive — but it never overrules source 3.
      let report: WorkerReport | null = null;
      try {
        report = await input.collector.collect(task);
      } catch (error) {
        console.error(
          `factory reconcile: ${input.run_id} could not read ${task.branch}: ${String(error)}`
        );
      }

      // 3. The live sandbox list, asked ONLY of containers a manifest names.
      //    `binding.get` provisions on this substrate, so probing a tick with
      //    no manifest would boot the very container the reconcile exists to
      //    avoid booting.
      const liveness =
        manifest === null ? NOT_ASKED : await probeLiveness(input.binding, sandbox_name);

      return classifyWorker({
        tick_id: tick,
        manifest,
        report,
        liveness,
        branch: task.branch,
        sandbox_name,
      });
    })
  );

  return plan(input, items);
}

function plan(input: ReconcileInput, items: ReconcileItem[]): ReconcilePlan {
  const counts = {
    "live-worker": 0,
    "already-landed": 0,
    "dead-with-work": 0,
    "stale-no-work": 0,
    "never-dispatched": 0,
    unknown: 0,
  } satisfies Record<WorkerClass, number>;
  for (const item of items) counts[item.class]++;
  return {
    run_id: input.run_id,
    epic: input.epic,
    items,
    counts,
    summary: summarizeReconcile(counts),
  };
}

/** A short, greppable line: what the evidence said, by class. */
export function summarizeReconcile(counts: Record<WorkerClass, number>): string {
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cls, n]) => `${n} ${cls}`);
  return parts.length === 0 ? "no ticks" : parts.join(", ");
}

// ----------------------------------------------------------- reading a plan ---

/** The ticks a wave may boot a container for — and only those. */
export function dispatchable(plan: ReconcilePlan): ReconcileItem[] {
  return plan.items.filter(
    (item) => item.action === "dispatch" || item.action === "redispatch-from-branch"
  );
}

/** The live workers the wave takes over instead of replacing. */
export function adoptable(plan: ReconcilePlan): ReconcileItem[] {
  return plan.items.filter((item) => item.action === "adopt");
}

/**
 * The ticks a wave addresses no container for: work that already landed, and
 * evidence a human has to look at. Both are reported; neither is touched.
 */
export function settled(plan: ReconcilePlan): ReconcileItem[] {
  return plan.items.filter((item) => item.action === "skip" || item.action === "inspect");
}

// ------------------------------------------------------ acting on a plan ---

/**
 * The adoptions a wave hands `dispatchWave` — one per live worker.
 *
 * Built from the plan rather than from a fresh probe: the plan already asked
 * the container's own process list, and asking twice would let a worker that
 * settled in between look like one that was never there.
 */
export function adoptions(plan: ReconcilePlan): Map<string, Adoption> {
  const map = new Map<string, Adoption>();
  for (const item of adoptable(plan)) {
    if (item.adopt_process_id === null) continue;
    map.set(item.tick_id, { process_id: item.adopt_process_id, detail: item.reason });
  }
  return map;
}

/**
 * The outcome of a tick the wave deliberately left alone.
 *
 * `launched` is false and the teardown is `NOT_ADDRESSED`, both literally
 * true: no container was booted, so none is destroyed. `collect` carries the
 * report the reconcile already read, or a synthetic `unknown` when the remote
 * could not be read at all — never a fabricated verdict.
 */
export function settledOutcome(item: ReconcileItem, task: WorkerTask): WorkerWaveOutcome {
  const report: WorkerReport = item.evidence.report ?? {
    tick_id: task.tick_id,
    branch: task.branch,
    base_sha: task.base_sha,
    verdict: "unknown",
    branch_exists: false,
    commits: 0,
    result_path: `RESULT-${task.tick_id}.md`,
    result_exists: false,
    status: "",
    status_detail: "",
    status_line: "",
    boundary_files: [],
    detail: item.reason,
  };
  return {
    tick_id: item.tick_id,
    sandbox_name: item.evidence.sandbox_name,
    launched: false,
    probe: { ok: true },
    confirm: null,
    process_id: null,
    adopted: false,
    cancelled: null,
    detail: item.reason,
    wait: null,
    collect: report,
    teardown: NOT_ADDRESSED,
    settled: item.class,
  };
}

// --------------------------------------------------------- the manifest ---

/**
 * The recorder a live wave writes its manifests with.
 *
 * The write is awaited before the container is addressed and is allowed to
 * throw: a dispatch whose manifest did not land is a dispatch a later
 * reconcile cannot see, and a container nobody can see is worse than a tick
 * that was not dispatched this batch. `started` is best effort by contrast —
 * the live process list, not the manifest, is what settles liveness, so a
 * missing process id costs a reader some context and costs correctness
 * nothing.
 */
export function manifestRecorder(
  bucket: R2Bucket,
  project: string,
  run: { run_id: string; epic: string; batch: number }
): WorkerRecorder {
  return {
    async dispatched(task: WorkerTask, sandboxName: string): Promise<void> {
      await writeWorkerManifest(bucket, project, {
        run_id: run.run_id,
        epic: run.epic,
        tick_id: task.tick_id,
        sandbox_name: sandboxName,
        branch: task.branch,
        base_sha: task.base_sha,
        batch: run.batch,
        dispatched_at: new Date().toISOString(),
      });
    },
    async started(task: WorkerTask, sandboxName: string, processID: string): Promise<void> {
      try {
        const existing = await readWorkerManifest(bucket, project, run.run_id, task.tick_id);
        await writeWorkerManifest(bucket, project, {
          ...(existing ?? {
            run_id: run.run_id,
            epic: run.epic,
            tick_id: task.tick_id,
            sandbox_name: sandboxName,
            branch: task.branch,
            base_sha: task.base_sha,
            batch: run.batch,
            dispatched_at: new Date().toISOString(),
          }),
          process_id: processID,
        });
      } catch (error) {
        console.error(
          `factory reconcile: ${run.run_id} could not record the work process of ` +
            `${task.tick_id}: ${String(error)}`
        );
      }
    },
    async probeFailed(
      task: WorkerTask,
      sandboxName: string,
      probe: Extract<ProbeOutcome, { ok: false }>
    ): Promise<void> {
      try {
        const existing = await readWorkerManifest(bucket, project, run.run_id, task.tick_id);
        await writeWorkerManifest(bucket, project, {
          ...(existing ?? {
            run_id: run.run_id,
            epic: run.epic,
            tick_id: task.tick_id,
            sandbox_name: sandboxName,
            branch: task.branch,
            base_sha: task.base_sha,
            batch: run.batch,
            dispatched_at: new Date().toISOString(),
          }),
          probe_failure: {
            reason: probe.reason,
            detail: probe.detail,
            output: probe.output,
            at: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error(
          `factory reconcile: ${run.run_id} could not record the probe failure of ` +
            `${task.tick_id}: ${String(error)}`
        );
      }
    },
  };
}
