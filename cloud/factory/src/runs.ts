/**
 * Run submission, stop and status — the logic behind the authenticated
 * `/api/runs` surface (UC1b, D21, D22).
 *
 * The routing layer in src/index.ts does HTTP; this module does the control
 * plane. Four rules shape it:
 *
 * 1. **The RunRoom is the arbiter, D1 is the index.** Whether a submission may
 *    ignite is decided by the project's RunRoom DO (single-threaded, so three
 *    transports need no cross-transport locking); the `runs` row and the
 *    `dispatch_log` trail are the durable record of what that decision was.
 *    When the two disagree the DO is right — a row is written after the lease
 *    is taken, never before.
 * 2. **A refusal is a logged event, not just a status code.** Every ignition
 *    and every refusal writes `dispatch_log` with a reason from the closed
 *    policy vocabulary (D20), so `tk factory trace` can answer "why did this
 *    not run" from the database rather than from Workers logs.
 * 3. **Enrolment is a security boundary, not bookkeeping.** The bearer token
 *    says "you are this deployment's operator"; it does not say which
 *    repositories the operator pointed their GitHub credential at. A
 *    submission for an unenrolled project is refused before the lease is even
 *    asked for, so the token alone cannot aim the factory at any repo its PAT
 *    can reach (migrations/0003).
 * 4. **Stop is control-plane state.** `stopRun` writes a stop record into the
 *    RunRoom and flips the run's index state; it does not send the
 *    orchestrator a message and does not need it to cooperate (UC1b). The Run
 *    Workflow reads that record and enforces D15's clean stop — finish the
 *    in-flight tick, then review and closeout.
 */

import {
  deleteRun,
  getEnrolledProject,
  getRun,
  insertDispatchLog,
  insertRun,
  listRuns,
  updateRunState,
  type DispatchReason,
  type Run,
} from "./db";
import { modelRoutingComplaint } from "./gateway";
import type { Env } from "./index";
import type {
  DispatchLeaseView,
  PendingEntry,
  QueuedSubmission,
  RunRoom,
  StopRequest,
} from "./run-room";

/**
 * Run lifecycle states written to the `runs` index.
 *
 * `starting` is this module's; everything after it belongs to the Run Workflow
 * (tick ldr), which owns the run once the instance exists. `stopping` is the
 * one state the control plane sets on a live run: it is the durable half of a
 * clean stop, and it is set here rather than by the orchestrator precisely so
 * a wedged orchestrator cannot refuse it.
 */
export const RUN_STATES = [
  "starting",
  "running",
  "stopping",
  "stopped",
  "completed",
  "failed",
] as const;
export type RunState = (typeof RUN_STATES)[number];

/** States in which a run still exists as work: a stop is meaningful here. */
export const ACTIVE_RUN_STATES: readonly RunState[] = ["starting", "running", "stopping"];

/** Runs asked for without a filter. Bounded so `tk cloud status` cannot page a whole history. */
export const DEFAULT_RUN_LIMIT = 50;
export const MAX_RUN_LIMIT = 200;

/**
 * How long a queued submission stays ignitable (D22). A queue that silently
 * ignites work hours later is worse than a refusal, so the window is short by
 * default, per-deployment configurable through the `RUN_QUEUE_TTL_MS` var, and
 * per-submission overridable within the bounds below.
 */
export const DEFAULT_QUEUE_TTL_MS = 1_800_000;

/**
 * Queue window bounds (D22), enforced both here (a fast 400 on a bad
 * submission) and in the RunRoom, which imports them from this module so the
 * two can never drift apart.
 */
export const MIN_QUEUE_TTL_MS = 100;
export const MAX_QUEUE_TTL_MS = 86_400_000;

/** A pushed commit, in full 40-hex form — the submission boundary is a pushed SHA (D3). */
const BASE_SHA_PATTERN = /^[0-9a-f]{40}$/;

/**
 * The canonical `owner/repo` project pair.
 *
 * Remote URLs are deliberately NOT parsed here. `internal/github` already owns
 * that parsing in Go and the CLI resolves the pair before submitting; a second
 * URL parser in TypeScript would be a cross-language format to keep in parity
 * for no gain. An unresolved remote is refused with an actionable message.
 */
const PROJECT_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/** Longest accepted free-text field (epic id, requested_by, notify channel). */
const MAX_FIELD_LENGTH = 200;

// ------------------------------------------------------------- workflow ---

/** Parameters the Run Workflow (tick ldr) boots a run from. */
export type RunWorkflowParams = {
  run_id: string;
  project: string;
  epic: string;
  base_sha: string;
  requested_by: string;
  notify?: string;
  /**
   * The dispatch lease's release credential. The Workflow renews it while the
   * run lives and releases it at finalize; nobody else ever sees it, which is
   * what compare-and-delete release depends on.
   */
  lease_token: string;
};

export type WorkflowInstanceStatus = { status: string; error?: unknown; output?: unknown };

/** The instance handle this module uses — a structural subset of Cloudflare's. */
export interface RunWorkflowInstance {
  id: string;
  status(): Promise<WorkflowInstanceStatus>;
  sendEvent?(event: { type: string; payload?: unknown }): Promise<void>;
}

/**
 * The Workflows binding this module uses, as a structural subset of
 * `Workflow<RunWorkflowParams>`.
 *
 * Declared structurally rather than imported so the seam is testable (a fake
 * binding can be assigned to `env`) and so this bundle compiles before tick
 * ldr binds the real Workflow in wrangler.toml.
 */
export interface RunWorkflowBinding {
  create(options: { id?: string; params?: RunWorkflowParams }): Promise<RunWorkflowInstance>;
  get(id: string): Promise<RunWorkflowInstance>;
}

/**
 * The Workflows binding, or null when the deployment has none.
 *
 * A factory with no Run Workflow cannot run anything, so submission fails
 * closed (503) rather than recording a run that will never boot — the same
 * "an unprovisioned deployment is a broken deploy" rule auth applies to a
 * missing token secret.
 */
export function runWorkflowBinding(env: Env): RunWorkflowBinding | null {
  const binding = env.RUN_WORKFLOW;
  return binding === undefined || binding === null ? null : binding;
}

// ----------------------------------------------------------- submission ---

export type RunSubmission = {
  project: string;
  epic: string;
  base_sha: string;
  requested_by: string;
  notify?: string;
  queue: boolean;
  queue_ttl_ms?: number;
};

export type SubmissionParse =
  | { ok: true; submission: RunSubmission }
  | { ok: false; detail: string };

function text(value: unknown, field: string, into: (v: string) => void): string | null {
  if (typeof value !== "string" || value.trim() === "") return `${field} is required`;
  const trimmed = value.trim();
  if (trimmed.length > MAX_FIELD_LENGTH) {
    return `${field} must be at most ${MAX_FIELD_LENGTH} characters`;
  }
  into(trimmed);
  return null;
}

/**
 * Validates a submission body. Returns the reason it cannot be accepted rather
 * than throwing, so the route can answer 400 with something actionable.
 */
export function parseSubmission(body: unknown): SubmissionParse {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, detail: "the request body must be a JSON object" };
  }
  const raw = body as Record<string, unknown>;

  let project = "";
  let epic = "";
  let baseSha = "";
  let requestedBy = "";
  const complaint =
    text(raw.project, "project", (v) => (project = v)) ??
    text(raw.epic, "epic", (v) => (epic = v)) ??
    text(raw.base_sha, "base_sha", (v) => (baseSha = v)) ??
    text(raw.requested_by, "requested_by", (v) => (requestedBy = v));
  if (complaint !== null) return { ok: false, detail: complaint };

  project = project.replace(/\.git$/, "");
  if (!PROJECT_PATTERN.test(project)) {
    return {
      ok: false,
      detail: `project must be the canonical owner/repo pair, got "${project}"`,
    };
  }

  if (!BASE_SHA_PATTERN.test(baseSha)) {
    return {
      ok: false,
      detail: "base_sha must be a full 40-character commit sha the epic is pushed at",
    };
  }

  let notify: string | undefined;
  if (raw.notify !== undefined && raw.notify !== null) {
    const bad = text(raw.notify, "notify", (v) => (notify = v));
    if (bad !== null) return { ok: false, detail: bad };
  }

  if (raw.queue !== undefined && typeof raw.queue !== "boolean") {
    return { ok: false, detail: "queue must be a boolean" };
  }

  let queueTtl: number | undefined;
  if (raw.queue_ttl_ms !== undefined && raw.queue_ttl_ms !== null) {
    const value = raw.queue_ttl_ms;
    if (
      !Number.isSafeInteger(value) ||
      (value as number) < MIN_QUEUE_TTL_MS ||
      (value as number) > MAX_QUEUE_TTL_MS
    ) {
      return {
        ok: false,
        detail: `queue_ttl_ms must be an integer between ${MIN_QUEUE_TTL_MS} and ${MAX_QUEUE_TTL_MS} ms, got ${String(value)}`,
      };
    }
    queueTtl = value as number;
  }

  return {
    ok: true,
    submission: {
      project,
      epic,
      base_sha: baseSha,
      requested_by: requestedBy,
      ...(notify === undefined ? {} : { notify }),
      queue: raw.queue === true,
      ...(queueTtl === undefined ? {} : { queue_ttl_ms: queueTtl }),
    },
  };
}

/**
 * The queue window for this deployment: the submission's own value, else the
 * `RUN_QUEUE_TTL_MS` var, else the default. An unusable var is ignored with a
 * log rather than failing a submission — a typo'd window must not take the
 * factory down.
 */
export function queueTtlMs(env: Env, requested?: number): number {
  if (requested !== undefined) return requested;
  const configured = env.RUN_QUEUE_TTL_MS;
  if (typeof configured === "string" && configured.trim() !== "") {
    const parsed = Number(configured);
    if (Number.isSafeInteger(parsed) && parsed >= MIN_QUEUE_TTL_MS && parsed <= MAX_QUEUE_TTL_MS) {
      return parsed;
    }
    console.error(
      `factory runs: RUN_QUEUE_TTL_MS must be an integer between ${MIN_QUEUE_TTL_MS} and ` +
        `${MAX_QUEUE_TTL_MS} ms; ignoring "${configured}" and using ${DEFAULT_QUEUE_TTL_MS}`
    );
  }
  return DEFAULT_QUEUE_TTL_MS;
}

/** A run id, prefixed so it is identifiable in a log line, an R2 key or a PR body. */
export function newRunID(): string {
  return `run_${crypto.randomUUID().replaceAll("-", "")}`;
}

/** The project's arbiter. One room per project — the lease is per project (D4, D19). */
export function roomFor(env: Env, project: string): DurableObjectStub<RunRoom> {
  return env.RUN_ROOMS.get(env.RUN_ROOMS.idFromName(project));
}

// -------------------------------------------------------------- ignition ---

export type StartRunInput = {
  run_id: string;
  project: string;
  epic: string;
  base_sha: string;
  requested_by: string;
  notify?: string;
  lease_token: string;
};

export type StartedRun = { run: Run; workflow: { id: string; status: string } };

/**
 * Records and boots a run whose lease is already held.
 *
 * Called from the submit route and from the RunRoom's ignite-on-release path,
 * so a queued submission becomes exactly the same run as a direct one. The
 * caller owns the lease: if this throws, it must release it, because a lease
 * held by a run that never booted wedges the project until the ttl expires.
 */
export async function startRun(env: Env, input: StartRunInput): Promise<StartedRun> {
  const workflow = runWorkflowBinding(env);
  if (workflow === null) {
    throw new Error("RUN_WORKFLOW binding is not configured on this deployment");
  }

  const run: Run = {
    run_id: input.run_id,
    project: input.project,
    epic: input.epic,
    base_sha: input.base_sha,
    requested_by: input.requested_by,
    state: "starting",
    started_at: new Date().toISOString(),
    ended_at: null,
    cost_usd: 0,
  };
  await insertRun(env.DB, run);

  // The instance id IS the run id: one trace ID threads every layer (D20), and
  // it means status needs no workflow_id column to find the instance again.
  let instance: RunWorkflowInstance;
  try {
    instance = await workflow.create({
      id: run.run_id,
      params: {
        run_id: run.run_id,
        project: run.project,
        epic: run.epic,
        base_sha: run.base_sha,
        requested_by: run.requested_by,
        ...(input.notify === undefined ? {} : { notify: input.notify }),
        lease_token: input.lease_token,
      },
    });
  } catch (error) {
    // Undo the index row before rethrowing. A run recorded with no instance
    // behind it would read as live forever, and its id — which the caller may
    // well retry with — would collide on the primary key rather than failing
    // for the reason it actually failed.
    await deleteRun(env.DB, run.run_id);
    throw error;
  }

  await logDispatch(env, {
    run_id: run.run_id,
    epic: run.epic,
    decision: "dispatched",
    reason: null,
  });

  return { run, workflow: { id: instance.id, status: await instanceStatus(instance) } };
}

async function instanceStatus(instance: RunWorkflowInstance): Promise<string> {
  try {
    return (await instance.status()).status;
  } catch (error) {
    // An instance that cannot report is not a run that failed: status is
    // observability, and a broken read must not turn a live run into an error.
    console.error(`factory runs: workflow instance ${instance.id} status failed: ${String(error)}`);
    return "unknown";
  }
}

/**
 * Writes one dispatch decision.
 *
 * `tick_id` is the epic: a run-level decision is about the epic tick that was
 * submitted, which is what makes the trail joinable to the tracker. The reason
 * vocabulary is closed by the D1 CHECK constraint (see src/db.ts), so the
 * holder's run id travels in `decision` — `lease_held_by:<run>` as the design's
 * dispatch taxonomy writes it — rather than being lost to a log line.
 */
export async function logDispatch(
  env: Env,
  entry: {
    run_id: string;
    epic: string;
    decision: string;
    /** From the closed policy vocabulary the D1 CHECK constraint enforces. */
    reason: DispatchReason | null;
  }
): Promise<void> {
  await insertDispatchLog(env.DB, {
    run_id: entry.run_id,
    tick_id: entry.epic,
    decision: entry.decision,
    reason: entry.reason,
    at: new Date().toISOString(),
  });
}

export type SubmitResult =
  | { outcome: "started"; started: StartedRun }
  | { outcome: "not_enrolled"; detail: string; run_id: string }
  | { outcome: "queued"; queued: QueuedSubmission; holder: DispatchLeaseView }
  | {
      outcome: "refused";
      reason: string;
      holder: DispatchLeaseView;
      detail: string;
      run_id: string;
    }
  | { outcome: "invalid"; detail: string }
  | { outcome: "unavailable"; detail: string };

/**
 * The submit path: lease, then ignite — or refuse, or park.
 *
 * The lease is asked for before anything durable is written, so a refused
 * submission leaves no half-run behind; only the dispatch_log entry records
 * that it happened at all.
 */
export async function submitRun(env: Env, submission: RunSubmission): Promise<SubmitResult> {
  if (runWorkflowBinding(env) === null) {
    // Fail closed and say which binding: a run recorded now would never boot.
    console.error("factory runs: RUN_WORKFLOW binding is missing; refusing every submission");
    return {
      outcome: "unavailable",
      detail: "RUN_WORKFLOW binding is not configured on this deployment",
    };
  }

  // All cloud model traffic goes through the operator's own AI Gateway (D17).
  // A deployment with none configured must say so HERE, at submission, while
  // there is still an operator reading the answer — never by booting a sandbox
  // that quietly falls back to a vendor default, and never by failing a run
  // minutes later with a message nobody is watching for.
  const routing = modelRoutingComplaint(env);
  if (routing !== null) {
    console.error(`factory runs: refusing every submission — ${routing}`);
    return { outcome: "unavailable", detail: routing };
  }

  const runID = newRunID();

  // Enrolment first: a project this factory was never pointed at must not even
  // reach the arbiter, and the refusal is a dispatch decision like any other.
  if ((await getEnrolledProject(env.DB, submission.project)) === null) {
    await logDispatch(env, {
      run_id: runID,
      epic: submission.epic,
      decision: `refused:not_enrolled:${submission.project}`,
      reason: "awaiting_approval",
    });
    return {
      outcome: "not_enrolled",
      run_id: runID,
      detail:
        `project ${submission.project} is not enrolled with this factory. ` +
        `Enrol it with POST /api/projects {"project":"${submission.project}"} ` +
        `before submitting a run.`,
    };
  }

  const room = roomFor(env, submission.project);
  const lease = await room.acquireDispatchLease({
    run_id: runID,
    epic: submission.epic,
    origin: "cloud",
    requested_by: submission.requested_by,
  });

  if (lease.ok) {
    try {
      return {
        outcome: "started",
        started: await startRun(env, {
          run_id: runID,
          project: submission.project,
          epic: submission.epic,
          base_sha: submission.base_sha,
          requested_by: submission.requested_by,
          ...(submission.notify === undefined ? {} : { notify: submission.notify }),
          lease_token: lease.lease.token,
        }),
      };
    } catch (error) {
      // Hand the project back rather than wedging it for a lease ttl on a
      // failure that has nothing to do with contention.
      await room.releaseDispatchLease({ run_id: runID, token: lease.lease.token });
      console.error(`factory runs: ignition failed for ${runID}: ${String(error)}`);
      return { outcome: "unavailable", detail: `run ${runID} could not be started` };
    }
  }

  if (lease.error === "invalid_request") return { outcome: "invalid", detail: lease.detail };

  // Refused. Both branches below are dispatch decisions and both are logged:
  // "why did this not run" must be answerable from D1 (D20).
  if (!submission.queue) {
    await logDispatch(env, {
      run_id: runID,
      epic: submission.epic,
      decision: `refused:${lease.reason}`,
      reason: "lease_held_by",
    });
    return {
      outcome: "refused",
      reason: lease.reason,
      holder: lease.holder,
      detail: lease.detail,
      run_id: runID,
    };
  }

  const parked = await room.queueSubmission({
    run_id: runID,
    project: submission.project,
    epic: submission.epic,
    base_sha: submission.base_sha,
    requested_by: submission.requested_by,
    ...(submission.notify === undefined ? {} : { notify: submission.notify }),
    blocked_by: lease.holder.run_id,
    ttl_ms: queueTtlMs(env, submission.queue_ttl_ms),
  });
  if (parked.ok === false && parked.error === "invalid_request") {
    return { outcome: "invalid", detail: parked.detail };
  }

  // A repeat park for the same epic comes back as the entry that already
  // stands (`already_queued`), which is the same answer the operator wants.
  const queued = parked.queued;
  await logDispatch(env, {
    run_id: queued.run_id,
    epic: submission.epic,
    decision: `queued:${lease.reason}`,
    reason: "lease_held_by",
  });
  return { outcome: "queued", queued, holder: lease.holder };
}

// ------------------------------------------------------------------ stop ---

export type StopResult =
  | { outcome: "stopping"; run: Run; stop: StopRequest; already: boolean; workflow_notified: boolean }
  | { outcome: "unknown_run" }
  | { outcome: "not_active"; run: Run }
  | { outcome: "invalid"; detail: string };

/**
 * A clean stop (D15 semantics), enforced at the control plane.
 *
 * The stop record lands in the project's RunRoom — the arbiter the Run
 * Workflow reads at every step boundary — and the run's index state flips to
 * `stopping`. The orchestrator is never asked: a wedged or adversarial one
 * would not honour a message it never reads, so the Workflow enforces this at
 * its own layer. The `sendEvent` below is an optimisation that lets a waiting
 * Workflow react immediately; the record is what makes the stop true, so a
 * failure to deliver it is reported, not fatal.
 */
export async function stopRun(
  env: Env,
  runID: string,
  requestedBy: string
): Promise<StopResult> {
  if (typeof runID !== "string" || runID.trim() === "") {
    return { outcome: "invalid", detail: "run id is required" };
  }

  const run = await getRun(env.DB, runID);
  if (run === null) return { outcome: "unknown_run" };
  if (!ACTIVE_RUN_STATES.includes(run.state as RunState)) {
    return { outcome: "not_active", run };
  }

  const room = roomFor(env, run.project);
  const requested = await room.requestStop({ run_id: runID, requested_by: requestedBy });
  if (requested.ok === false) return { outcome: "invalid", detail: requested.detail };

  const updated = (await updateRunState(env.DB, runID, "stopping")) ?? { ...run, state: "stopping" };

  let notified = false;
  const workflow = runWorkflowBinding(env);
  if (workflow !== null) {
    try {
      const instance = await workflow.get(runID);
      if (typeof instance.sendEvent === "function") {
        await instance.sendEvent({ type: "stop", payload: requested.stop });
        notified = true;
      }
    } catch (error) {
      // Expected whenever the instance is not waiting on an event. The stop is
      // already durable; the Workflow reads it at its next step boundary.
      console.error(
        `factory runs: could not deliver the stop event to workflow ${runID} ` +
          `(the stop record stands): ${String(error)}`
      );
    }
  }

  return {
    outcome: "stopping",
    run: updated,
    stop: requested.stop,
    already: requested.already,
    workflow_notified: notified,
  };
}

// ---------------------------------------------------------------- status ---

export type RunStatus = {
  run: Run;
  phase: { state: string; workflow: { id: string; status: string } | null };
  lease: DispatchLeaseView | null;
  queued: QueuedSubmission[];
  gates: PendingEntry[];
  stop: StopRequest | null;
};

/** Everything `tk cloud status <run>` shows: index row, Workflow step state, lease, gates, queue. */
export async function runStatus(env: Env, runID: string): Promise<RunStatus | null> {
  const run = await getRun(env.DB, runID);
  if (run === null) return null;

  const room = roomFor(env, run.project);
  const [lease, queued, gates, stop] = await Promise.all([
    room.leaseStatus(),
    room.listQueuedSubmissions(),
    room.listQuestions(),
    room.stopRequest(runID),
  ]);

  return {
    run,
    phase: { state: run.state, workflow: await workflowPhase(env, run) },
    lease,
    queued,
    gates,
    stop,
  };
}

async function workflowPhase(
  env: Env,
  run: Run
): Promise<{ id: string; status: string } | null> {
  const workflow = runWorkflowBinding(env);
  if (workflow === null) return null;
  try {
    const instance = await workflow.get(run.run_id);
    return { id: instance.id, status: await instanceStatus(instance) };
  } catch (error) {
    // A run whose instance is gone (retention, or never created) still has an
    // index row and a lease worth reporting.
    console.error(`factory runs: workflow instance ${run.run_id} is unavailable: ${String(error)}`);
    return null;
  }
}

export type ProjectStatus = {
  project: string;
  lease: DispatchLeaseView | null;
  queued: QueuedSubmission[];
};

export type RunListing = { runs: Run[]; projects: ProjectStatus[] };

/**
 * The run list plus per-project arbiter state.
 *
 * Queued submissions live in the DO, not in `runs` — they are not runs yet —
 * so a listing that only read D1 would answer "nothing is happening" while a
 * parked submission waits. Every project the listing mentions is asked.
 */
export async function listRunStatus(
  env: Env,
  filter: { project?: string; state?: string; limit?: number }
): Promise<RunListing> {
  const runs = await listRuns(env.DB, filter);

  const projects = new Set(runs.map((run) => run.project));
  if (filter.project !== undefined) projects.add(filter.project);

  const statuses = await Promise.all(
    [...projects].sort().map(async (project): Promise<ProjectStatus> => {
      const room = roomFor(env, project);
      const [lease, queued] = await Promise.all([
        room.leaseStatus(),
        room.listQueuedSubmissions(),
      ]);
      return { project, lease, queued };
    })
  );

  return { runs, projects: statuses };
}
