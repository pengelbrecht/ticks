/**
 * RunRoom Durable Object — the project's single arbiter.
 *
 * One instance per project (`idFromName(project)`). It owns the run state that
 * is filesystem-shaped today and awkward for a filesystem:
 *
 * 1. **The dispatch lease** — one per project. `acquireDispatchLease` never
 *    blocks: a conflict comes back naming the holding run, which is what turns
 *    a second ignition into a refusal (`lease_held_by:<run>`) instead of a
 *    queue. Release is compare-and-delete, so a superseded holder cannot free
 *    its successor's lease, and an abandoned lease expires on a DO alarm.
 *    This is the SAME lease a *local* run takes on an enrolled project (D19):
 *    exactly one `.tick/` writer per project (D4), wherever the orchestrator
 *    sits. Un-enrolled projects keep the checkout-scoped file lease in
 *    `extensions/ticks-runner/state.ts`, whose semantics this mirrors.
 * 2. **The pending-question store** — replaces `.tick/pending/*.json` plus the
 *    `.consumer.lock` flock. A DO is single-threaded by construction, so
 *    first-wins arbitration across surfaces (phone vs terminal) needs no lock:
 *    the loser gets an `already_answered` response naming the winning surface
 *    (D5). Entry field names are identical to the Go entry's json tags
 *    (`internal/operator/pending.go`, `internal/operator/channel.go`) because
 *    the laptop's pending watch reads relayed entries from here in Phase 3.
 *
 * 3. **The submission queue** (D22) — a submission refused by a live lease may
 *    park here instead of bouncing. It ignites on release, is visible to
 *    `status`, and expires on a configurable window, because a queue that
 *    silently ignites work hours later is worse than a refusal.
 * 4. **The stop record** (D15/UC1b) — a clean stop is control-plane state, not
 *    a message the orchestrator has to read. It lands here, where the Run
 *    Workflow reads it at a step boundary, so a wedged orchestrator cannot
 *    decline to be stopped.
 *
 * The room is addressed by project, not project+epic: the lease arbitrates
 * *between* epic runs, so an epic-scoped room would hand every run its own
 * lease and arbitrate nothing. See docs/design/cloud-factory.md ("The RunRoom
 * DO", D4, D5, D19).
 *
 * Reconcile alarms and `run_event` fan-out to the board's ProjectRoom are
 * later phases. The DO alarm is multiplexed: `#armAlarm` takes the earliest of
 * the lease deadline and the queue's expiries, and every handler re-arms for
 * the next one. Nothing may call `setAlarm` behind it.
 */

import { DurableObject } from "cloudflare:workers";
import type { Env } from "./index";
import { MAX_QUEUE_TTL_MS, MIN_QUEUE_TTL_MS, startRun } from "./runs";

/**
 * Lease lifetime, mirroring `DEFAULT_CONTROLLER_LEASE_MS` in the Pi extension's
 * file lease so an enrolled and an un-enrolled project behave the same. A run
 * outlives it many times over and renews on a heartbeat; the ttl bounds how
 * long an *abandoned* run wedges the project, not how long a run may take.
 */
export const DEFAULT_LEASE_TTL_MS = 60_000;
/** Same floor as the file lease: below this, clock skew alone expires a live lease. */
export const MIN_LEASE_TTL_MS = 100;
/** A ceiling so a bad caller cannot wedge a project for a day on one typo. */
export const MAX_LEASE_TTL_MS = 3_600_000;

/** Where the orchestrator holding the lease runs (D19). */
export type LeaseOrigin = "local" | "cloud";

/** The lease as its holder sees it — `token` is the release credential. */
export type DispatchLease = {
  run_id: string;
  /** Opaque fencing token. Only the acquirer ever receives it. */
  token: string;
  epic: string;
  origin: LeaseOrigin;
  requested_by?: string;
  acquired_at: string;
  expires_at: string;
};

/**
 * The lease as everyone else sees it. The token is withheld: handing a refused
 * caller the holder's token would let it release a lease it does not hold,
 * which is the one thing compare-and-delete exists to prevent.
 */
export type DispatchLeaseView = Omit<DispatchLease, "token">;

export type AcquireLeaseRequest = {
  run_id: string;
  epic: string;
  origin?: LeaseOrigin;
  requested_by?: string;
  ttl_ms?: number;
};

/**
 * A malformed call. Every RunRoom method returns its failures rather than
 * throwing: a thrown RPC error reaches the caller as an opaque rejection and
 * is *also* logged as an uncaught DO exception, so a typed refusal keeps both
 * the contract and the logs honest.
 */
export type RequestInvalid = { ok: false; error: "invalid_request"; detail: string };

export type LeaseGranted = { ok: true; lease: DispatchLease; renewed: boolean };
export type LeaseRefused = {
  ok: false;
  error: "lease_held";
  /** The dispatch-log refusal reason (see docs/design/cloud-factory.md). */
  reason: string;
  holder: DispatchLeaseView;
  detail: string;
};
export type AcquireLeaseResult = LeaseGranted | LeaseRefused | RequestInvalid;

export type HolderCredentials = { run_id: string; token: string };

export type ReleaseLeaseResult =
  | { ok: true; released: DispatchLeaseView; ignited: QueuedSubmission | null }
  | { ok: false; error: "not_holder"; holder: DispatchLeaseView | null; detail: string }
  | RequestInvalid;

export type RenewLeaseResult =
  | { ok: true; lease: DispatchLease }
  | { ok: false; error: "lease_lost"; holder: DispatchLeaseView | null; detail: string }
  | RequestInvalid;

/**
 * A submission parked behind a live lease (D22).
 *
 * It already carries the run id it will ignite as, so the operator has
 * something to name and `status` something to show before the run exists.
 */
export type QueuedSubmission = {
  run_id: string;
  project: string;
  epic: string;
  base_sha: string;
  requested_by: string;
  notify?: string;
  /**
   * The submission's own budget (tick wn5). Parked with the entry rather than
   * re-read at ignition: a budget that survives the submission but not the
   * queue is a run the operator believes is bounded and is not.
   */
  max_cost_usd?: number;
  max_wall_clock_ms?: number;
  /** The run holding the lease when this parked — why it is waiting. */
  blocked_by: string;
  queued_at: string;
  expires_at: string;
};

export type QueueSubmissionRequest = {
  run_id: string;
  project: string;
  epic: string;
  base_sha: string;
  requested_by: string;
  notify?: string;
  max_cost_usd?: number;
  max_wall_clock_ms?: number;
  blocked_by: string;
  ttl_ms?: number;
};

export type QueueSubmissionResult =
  | { ok: true; queued: QueuedSubmission }
  | { ok: false; error: "already_queued"; queued: QueuedSubmission; detail: string }
  | RequestInvalid;

export type CancelQueuedResult =
  | { ok: true; cancelled: QueuedSubmission }
  | { ok: false; error: "not_queued"; detail: string }
  | RequestInvalid;

/**
 * How hard a stop is, and what the difference buys.
 *
 * `clean` is D15's stop: the in-flight work gets a bounded window to land, and
 * the run's credential dies at the end of it. `hard` is the runaway case (tick
 * gyl) — the credential dies FIRST, before the grace window, and no later boot
 * of this run may mint another. A stop that lets a run at twice its budget
 * keep spending while it unwinds is not a kill switch, and the alternative an
 * operator was left with was deleting the container application for every run.
 *
 * A stop only ever escalates: `hard` supersedes a `clean` record, and a
 * `clean` request never softens a `hard` one.
 */
export type StopMode = "clean" | "hard";

/** A stop asked of a run — D15 semantics, recorded rather than sent. */
export type StopRequest = {
  run_id: string;
  /** There is still no "abandon the run" verb (UC1b): both modes close out. */
  mode: StopMode;
  requested_by: string;
  requested_at: string;
};

export type RequestStopResult =
  | { ok: true; stop: StopRequest; already: boolean }
  | RequestInvalid;

/** Mirrors operator.PendingKind. */
export type PendingKind = "ask" | "gate" | "agent_relay";
/** Mirrors operator.AnsweredBy. */
export type AnsweredBy = "telegram" | "terminal" | "out_of_band";
/** Mirrors operator.OutcomeStatus. */
export type OutcomeStatus = "answered" | "cancelled" | "timed_out";

export type QuestionOption = { id: string; label: string };

/** Mirrors operator.Question. */
export type Question = {
  id?: string;
  header?: string;
  text: string;
  options?: QuestionOption[];
  multi_select?: boolean;
  allow_other?: boolean;
};

/** Mirrors operator.MessageRef. */
export type MessageRef = { channel_id?: string; message_id?: string };

/** Mirrors operator.Outcome. */
export type Outcome = { status: OutcomeStatus; text?: string; option_ids?: string[] };

/** Mirrors operator.PendingResolution. */
export type PendingResolution = {
  outcome: Outcome;
  answered_by: AnsweredBy;
  telegram_user_id?: string;
  answered_at: string;
  applied_at?: string;
};

/** Mirrors operator.Pending. */
export type PendingEntry = {
  id: string;
  tick_id?: string;
  agent_target?: string;
  kind: PendingKind;
  awaiting?: string;
  question: Question;
  ref?: MessageRef;
  created_at: string;
  not_before?: string;
  resolution?: PendingResolution;
};

export type RegisterQuestionRequest = {
  id: string;
  tick_id?: string;
  agent_target?: string;
  kind: PendingKind;
  awaiting?: string;
  question: Question;
  not_before?: string;
};

export type RegisterQuestionResult =
  | { ok: true; entry: PendingEntry }
  | { ok: false; error: "already_registered"; entry: PendingEntry; detail: string }
  | RequestInvalid;

export type AnswerQuestionRequest = {
  id: string;
  outcome: Outcome;
  answered_by: AnsweredBy;
  telegram_user_id?: string;
  answered_at?: string;
};

export type AnswerQuestionResult =
  | { ok: true; entry: PendingEntry }
  | {
      ok: false;
      error: "already_answered";
      entry: PendingEntry;
      answered_by: AnsweredBy;
      answered_at: string;
      detail: string;
    }
  | { ok: false; error: "unknown_question"; detail: string }
  | RequestInvalid;

export type MarkDeliveredResult =
  | { ok: true; entry: PendingEntry }
  | { ok: false; error: "unknown_question"; detail: string }
  | RequestInvalid;

export type ClaimApplicationResult =
  | { ok: true; entry: PendingEntry }
  | { ok: false; error: "already_applied" | "not_answered" | "unknown_question"; detail: string }
  | RequestInvalid;

export type ListQuestionsFilter = { tick_id?: string; include_resolved?: boolean };

export type RunRoomStatus = {
  object: "RunRoom";
  lease: DispatchLeaseView | null;
  pending: { open: number; resolved: number };
  queued: QueuedSubmission[];
};

/** Single-row table: the lease is one per project, and the room *is* the project. */
const LEASE_ROW = "dispatch";

type LeaseRecord = {
  run_id: string;
  token: string;
  epic: string;
  origin: string;
  requested_by: string | null;
  acquired_at: number;
  expires_at: number;
};

type QueuedRecord = {
  run_id: string;
  project: string;
  epic: string;
  base_sha: string;
  requested_by: string;
  notify: string | null;
  max_cost_usd: number | null;
  max_wall_clock_ms: number | null;
  blocked_by: string;
  queued_at: number;
  expires_at: number;
};

type StopRecord = {
  run_id: string;
  mode: string;
  requested_by: string;
  requested_at: number;
};

type QuestionRecord = {
  id: string;
  tick_id: string | null;
  agent_target: string | null;
  kind: string;
  awaiting: string | null;
  question: string;
  ref: string | null;
  created_at: number;
  not_before: number | null;
  resolution: string | null;
};

const stamp = (ms: number): string => new Date(ms).toISOString();

/** Returns a complaint when the field is not a non-empty string, else null. */
function badText(value: unknown, field: string): string | null {
  return typeof value === "string" && value.trim() !== "" ? null : `${field} is required`;
}

/**
 * Returns a complaint when the ttl is outside the pinned bounds, else null.
 * The bounds are named constants with this guard so a limit change has to pass
 * a test rather than only a review.
 */
function badTtl(ttl: unknown): string | null {
  if (ttl === undefined) return null;
  return Number.isSafeInteger(ttl) &&
    (ttl as number) >= MIN_LEASE_TTL_MS &&
    (ttl as number) <= MAX_LEASE_TTL_MS
    ? null
    : `lease ttl must be an integer between ${MIN_LEASE_TTL_MS} and ${MAX_LEASE_TTL_MS} ms, got ${String(ttl)}`;
}

/** The same shape of guard as badTtl, for the queue window's own bounds. */
function badQueueTtl(ttl: unknown): string | null {
  if (ttl === undefined) return null;
  return Number.isSafeInteger(ttl) &&
    (ttl as number) >= MIN_QUEUE_TTL_MS &&
    (ttl as number) <= MAX_QUEUE_TTL_MS
    ? null
    : `queue ttl must be an integer between ${MIN_QUEUE_TTL_MS} and ${MAX_QUEUE_TTL_MS} ms, got ${String(ttl)}`;
}

function invalid(complaint: string): RequestInvalid {
  return { ok: false, error: "invalid_request", detail: `RunRoom: ${complaint}` };
}

export class RunRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Synchronous, so it is complete before any request or alarm is delivered
    // — DO storage SQL does not yield.
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS dispatch_lease (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        token TEXT NOT NULL,
        epic TEXT NOT NULL,
        origin TEXT NOT NULL,
        requested_by TEXT,
        acquired_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pending_question (
        id TEXT PRIMARY KEY,
        tick_id TEXT,
        agent_target TEXT,
        kind TEXT NOT NULL,
        awaiting TEXT,
        question TEXT NOT NULL,
        ref TEXT,
        created_at INTEGER NOT NULL,
        not_before INTEGER,
        resolution TEXT
      );
      CREATE INDEX IF NOT EXISTS pending_question_by_tick ON pending_question (tick_id);
      CREATE TABLE IF NOT EXISTS queued_submission (
        run_id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        epic TEXT NOT NULL,
        base_sha TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        notify TEXT,
        max_cost_usd REAL,
        max_wall_clock_ms INTEGER,
        blocked_by TEXT NOT NULL,
        queued_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS queued_submission_by_age ON queued_submission (queued_at);
      CREATE TABLE IF NOT EXISTS run_stop (
        run_id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        requested_at INTEGER NOT NULL
      );
    `);

    // `CREATE TABLE IF NOT EXISTS` is a no-op on a room that already exists, so
    // a column added after a room's first request would never appear in it —
    // and every project this factory has ever run has such a room. The add is
    // attempted and its "duplicate column name" is the expected answer.
    for (const column of ["max_cost_usd REAL", "max_wall_clock_ms INTEGER"]) {
      try {
        ctx.storage.sql.exec(`ALTER TABLE queued_submission ADD COLUMN ${column}`);
      } catch {
        // The column is already there: this room was created with it.
      }
    }
  }

  // ---------------------------------------------------------------- lease ---

  /**
   * Takes the project's dispatch lease, or reports who holds it.
   *
   * Never blocks and never queues: a caller that cannot have the lease is told
   * the holding run's id so the refusal is actionable (UC1 step 2). A second
   * acquire by the *same* run is a renewal, so a retried submission is
   * idempotent rather than a self-conflict.
   */
  async acquireDispatchLease(request: AcquireLeaseRequest): Promise<AcquireLeaseResult> {
    const complaint =
      badText(request?.run_id, "run_id") ?? badText(request?.epic, "epic") ?? badTtl(request?.ttl_ms);
    if (complaint !== null) return invalid(complaint);
    const runID = request.run_id;
    const epic = request.epic;
    const ttl = request.ttl_ms ?? DEFAULT_LEASE_TTL_MS;
    const now = Date.now();

    // Read and write with no `await` in between: DO storage SQL is
    // synchronous, so nothing can interleave and observe the same free lease.
    // This is what the file lease needed flock for.
    const current = this.#readLease();
    const live = current !== null && current.expires_at > now;

    if (live && current!.run_id !== runID) {
      const holder = this.#leaseView(current!);
      return {
        ok: false,
        error: "lease_held",
        reason: `lease_held_by:${current!.run_id}`,
        holder,
        detail: `the dispatch lease is held by run ${current!.run_id} (epic ${holder.epic}, ${holder.origin}) until ${holder.expires_at}`,
      };
    }

    const renewed = live && current!.run_id === runID;
    const record: LeaseRecord = {
      run_id: runID,
      // A renewal keeps the holder's token: it is the release credential, and
      // rotating it under a live holder would lock it out of its own lease.
      token: renewed ? current!.token : crypto.randomUUID(),
      epic,
      origin: request.origin ?? "cloud",
      requested_by: request.requested_by ?? null,
      acquired_at: renewed ? current!.acquired_at : now,
      expires_at: now + ttl,
    };
    this.#writeLease(record);
    await this.#armAlarm();

    return { ok: true, lease: this.#lease(record), renewed };
  }

  /** Extends the lease for its holder. A lost or taken-over lease cannot be renewed. */
  async renewDispatchLease(
    request: HolderCredentials & { ttl_ms?: number }
  ): Promise<RenewLeaseResult> {
    const complaint =
      badText(request?.run_id, "run_id") ?? badText(request?.token, "token") ?? badTtl(request?.ttl_ms);
    if (complaint !== null) return invalid(complaint);
    const runID = request.run_id;
    const token = request.token;
    const ttl = request.ttl_ms ?? DEFAULT_LEASE_TTL_MS;
    const now = Date.now();

    const current = this.#readLease();
    const live = current !== null && current.expires_at > now;
    if (!live || current!.run_id !== runID || current!.token !== token) {
      return {
        ok: false,
        error: "lease_lost",
        holder: live ? this.#leaseView(current!) : null,
        detail: live
          ? `the dispatch lease is held by run ${current!.run_id}, not ${runID}`
          : `run ${runID} no longer holds the dispatch lease`,
      };
    }

    const record: LeaseRecord = { ...current!, expires_at: now + ttl };
    this.#writeLease(record);
    await this.#armAlarm();
    return { ok: true, lease: this.#lease(record) };
  }

  /**
   * Compare-and-delete release: the row is removed only when BOTH the run id
   * and the token match, so a run whose lease already expired and was taken
   * over cannot free its successor's lease on the way out.
   */
  async releaseDispatchLease(request: HolderCredentials): Promise<ReleaseLeaseResult> {
    const complaint = badText(request?.run_id, "run_id") ?? badText(request?.token, "token");
    if (complaint !== null) return invalid(complaint);
    const runID = request.run_id;
    const token = request.token;

    const current = this.#readLease();
    if (current === null || current.run_id !== runID || current.token !== token) {
      return {
        ok: false,
        error: "not_holder",
        holder: current === null ? null : this.#leaseView(current),
        detail:
          current === null
            ? "no dispatch lease is held"
            : `the dispatch lease is held by run ${current.run_id}, not ${runID}`,
      };
    }

    this.ctx.storage.sql.exec(
      "DELETE FROM dispatch_lease WHERE id = ? AND run_id = ? AND token = ?",
      LEASE_ROW,
      runID,
      token
    );
    // The lease is free for exactly as long as it takes to hand it to the next
    // parked submission — the release is what ignites a queued run (D22).
    const ignited = await this.#igniteNextQueued();
    await this.#armAlarm();
    return { ok: true, released: this.#leaseView(current), ignited };
  }

  /**
   * The live lease, or null. An expired row reads as null even before the
   * alarm deletes it, so a missed alarm cannot wedge the project.
   */
  async leaseStatus(): Promise<DispatchLeaseView | null> {
    const current = this.#readLease();
    if (current === null || current.expires_at <= Date.now()) return null;
    return this.#leaseView(current);
  }

  /**
   * Expires an abandoned lease.
   *
   * A run that dies without releasing leaves the project wedged until this
   * fires. A lease renewed since the alarm was set is followed, not dropped:
   * `setAlarm` overwrites, so an early wake must re-arm rather than assume the
   * deadline it was scheduled for is still the current one.
   */
  override async alarm(): Promise<void> {
    // One alarm serves two deadlines. Each wake does the work that is actually
    // due, then re-arms for whichever deadline is next: `setAlarm` overwrites,
    // so an early wake must never assume the deadline it was scheduled for is
    // still the current one, and a handler must never clear an alarm the other
    // deadline still needs.
    this.#pruneExpiredQueued();

    const current = this.#readLease();
    if (current !== null && current.expires_at <= Date.now()) {
      this.ctx.storage.sql.exec(
        "DELETE FROM dispatch_lease WHERE id = ? AND run_id = ? AND token = ?",
        LEASE_ROW,
        current.run_id,
        current.token
      );
      // An abandoned run must not strand the queue behind it: the expiry is a
      // release like any other.
      await this.#igniteNextQueued();
    }

    await this.#armAlarm();
  }

  // ---------------------------------------------------------------- queue ---

  /**
   * Parks a submission behind the live lease (D22).
   *
   * One parked submission per epic: a phone that sends `/run pay-4` twice
   * meant it once. The second call is told which entry already stands rather
   * than silently queueing a duplicate run.
   */
  async queueSubmission(request: QueueSubmissionRequest): Promise<QueueSubmissionResult> {
    const complaint =
      badText(request?.run_id, "run_id") ??
      badText(request?.project, "project") ??
      badText(request?.epic, "epic") ??
      badText(request?.base_sha, "base_sha") ??
      badText(request?.requested_by, "requested_by") ??
      badText(request?.blocked_by, "blocked_by") ??
      badQueueTtl(request?.ttl_ms);
    if (complaint !== null) return invalid(complaint);

    const now = Date.now();
    this.#pruneExpiredQueued(now);

    const existing = this.#liveQueue(now).find((row) => row.epic === request.epic);
    if (existing !== undefined) {
      return {
        ok: false,
        error: "already_queued",
        queued: this.#queuedView(existing),
        detail: `epic ${request.epic} is already queued as run ${existing.run_id} until ${stamp(existing.expires_at)}`,
      };
    }

    const record: QueuedRecord = {
      run_id: request.run_id,
      project: request.project,
      epic: request.epic,
      base_sha: request.base_sha,
      requested_by: request.requested_by,
      notify: request.notify ?? null,
      max_cost_usd: request.max_cost_usd ?? null,
      max_wall_clock_ms: request.max_wall_clock_ms ?? null,
      blocked_by: request.blocked_by,
      queued_at: now,
      // The window is policy and the caller states it (src/runs.ts resolves the
      // deployment's default). An omitted one means "as long as this room
      // allows", which is the bound itself — never unbounded.
      expires_at: now + (request.ttl_ms ?? MAX_QUEUE_TTL_MS),
    };
    this.ctx.storage.sql.exec(
      `INSERT INTO queued_submission
         (run_id, project, epic, base_sha, requested_by, notify, max_cost_usd,
          max_wall_clock_ms, blocked_by, queued_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.run_id,
      record.project,
      record.epic,
      record.base_sha,
      record.requested_by,
      record.notify,
      record.max_cost_usd,
      record.max_wall_clock_ms,
      record.blocked_by,
      record.queued_at,
      record.expires_at
    );
    await this.#armAlarm();
    return { ok: true, queued: this.#queuedView(record) };
  }

  /**
   * The submissions still waiting. Expired entries read as absent even before
   * the alarm deletes them, exactly as an expired lease does — a missed alarm
   * must not ignite work the window already dropped.
   */
  async listQueuedSubmissions(): Promise<QueuedSubmission[]> {
    return this.#liveQueue().map((record) => this.#queuedView(record));
  }

  /** Withdraws a parked submission before it ignites. */
  async cancelQueuedSubmission(runID: string): Promise<CancelQueuedResult> {
    const complaint = badText(runID, "run_id");
    if (complaint !== null) return invalid(complaint);

    const rows = [
      ...this.ctx.storage.sql.exec<QueuedRecord>(
        "DELETE FROM queued_submission WHERE run_id = ? RETURNING *",
        runID
      ),
    ];
    if (rows.length === 0) {
      return { ok: false, error: "not_queued", detail: `no submission ${runID} is queued` };
    }
    await this.#armAlarm();
    return { ok: true, cancelled: this.#queuedView(rows[0]!) };
  }

  // ----------------------------------------------------------------- stop ---

  /**
   * Records a stop for a run (D15, UC1b).
   *
   * The record IS the enforcement point: the Run Workflow reads it at a step
   * boundary and finishes the in-flight tick, then runs review and closeout.
   * Nothing is sent to the orchestrator, so a wedged or adversarial one cannot
   * decline. Repeating a stop is not an error — it is the same stop.
   *
   * A `hard` request over a `clean` record is the exception, and the only
   * mutation this table has: it is not a repeat, it is an operator deciding
   * the clean stop is not stopping anything, so the record is upgraded and
   * reported as a new stop rather than as one that already stood.
   */
  async requestStop(request: {
    run_id: string;
    requested_by?: string;
    mode?: StopMode;
  }): Promise<RequestStopResult> {
    const complaint = badText(request?.run_id, "run_id");
    if (complaint !== null) return invalid(complaint);
    if (request?.mode !== undefined && request.mode !== "clean" && request.mode !== "hard") {
      return invalid(`stop mode must be "clean" or "hard", not "${String(request.mode)}"`);
    }
    const mode: StopMode = request?.mode === "hard" ? "hard" : "clean";
    const requestedBy = request.requested_by?.trim() || "unknown";

    const existing = this.#readStop(request.run_id);
    if (existing !== null) {
      // Never downgrade: a clean request over a hard record is the same stop.
      if (mode === "clean" || existing.mode === "hard") {
        return { ok: true, stop: this.#stopView(existing), already: true };
      }
      const upgraded: StopRecord = {
        run_id: existing.run_id,
        mode: "hard",
        requested_by: requestedBy,
        requested_at: Date.now(),
      };
      this.ctx.storage.sql.exec(
        `UPDATE run_stop SET mode = ?, requested_by = ?, requested_at = ? WHERE run_id = ?`,
        upgraded.mode,
        upgraded.requested_by,
        upgraded.requested_at,
        upgraded.run_id
      );
      return { ok: true, stop: this.#stopView(upgraded), already: false };
    }

    const record: StopRecord = {
      run_id: request.run_id,
      mode,
      requested_by: requestedBy,
      requested_at: Date.now(),
    };
    this.ctx.storage.sql.exec(
      `INSERT INTO run_stop (run_id, mode, requested_by, requested_at) VALUES (?, ?, ?, ?)`,
      record.run_id,
      record.mode,
      record.requested_by,
      record.requested_at
    );
    return { ok: true, stop: this.#stopView(record), already: false };
  }

  /** The stop asked of this run, or null. Read by the Run Workflow at a step boundary. */
  async stopRequest(runID: string): Promise<StopRequest | null> {
    if (badText(runID, "run_id") !== null) return null;
    const record = this.#readStop(runID);
    return record === null ? null : this.#stopView(record);
  }

  // -------------------------------------------------------------- pending ---

  /** Registers a question. The id is the correlation key every surface uses. */
  async registerQuestion(request: RegisterQuestionRequest): Promise<RegisterQuestionResult> {
    const complaint =
      badText(request?.id, "id") ??
      badText(request?.kind, "kind") ??
      badText(request?.question?.text, "question.text");
    if (complaint !== null) return invalid(complaint);
    const id = request.id;
    const kind = request.kind;

    const existing = this.#readQuestion(id);
    if (existing !== null) {
      return {
        ok: false,
        error: "already_registered",
        entry: this.#entry(existing),
        detail: `question ${id} is already registered`,
      };
    }

    const record: QuestionRecord = {
      id,
      tick_id: request.tick_id ?? null,
      agent_target: request.agent_target ?? null,
      kind,
      awaiting: request.awaiting ?? null,
      question: JSON.stringify(request.question),
      ref: null,
      created_at: Date.now(),
      not_before: request.not_before === undefined ? null : Date.parse(request.not_before),
      resolution: null,
    };
    this.ctx.storage.sql.exec(
      `INSERT INTO pending_question
         (id, tick_id, agent_target, kind, awaiting, question, ref, created_at, not_before, resolution)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.tick_id,
      record.agent_target,
      record.kind,
      record.awaiting,
      record.question,
      record.ref,
      record.created_at,
      record.not_before,
      record.resolution
    );
    return { ok: true, entry: this.#entry(record) };
  }

  /** Records the channel message a question was posted as, so an event routes back to it. */
  async markDelivered(id: string, ref: MessageRef): Promise<MarkDeliveredResult> {
    const complaint = badText(id, "id");
    if (complaint !== null) return invalid(complaint);
    const key = id;
    const rows = [
      ...this.ctx.storage.sql.exec<QuestionRecord>(
        "UPDATE pending_question SET ref = ? WHERE id = ? RETURNING *",
        JSON.stringify(ref),
        key
      ),
    ];
    if (rows.length === 0) {
      return { ok: false, error: "unknown_question", detail: `no question ${key} is registered` };
    }
    return { ok: true, entry: this.#entry(rows[0]!) };
  }

  /**
   * Records how a question ended. **First answer wins.**
   *
   * The conditional UPDATE is one statement, so two surfaces answering
   * together cannot both see an open entry — the arbitration the
   * `.consumer.lock` flock used to provide, now free from the DO's single
   * thread. The loser is told who answered and with what, which is the
   * "already answered by …" reply every surface shows (D5).
   */
  async answerQuestion(request: AnswerQuestionRequest): Promise<AnswerQuestionResult> {
    const complaint =
      badText(request?.id, "id") ??
      badText(request?.answered_by, "answered_by") ??
      badText(request?.outcome?.status, "outcome.status");
    if (complaint !== null) return invalid(complaint);
    const id = request.id;
    const answeredBy = request.answered_by;

    const resolution: PendingResolution = {
      outcome: request.outcome,
      answered_by: answeredBy,
      ...(request.telegram_user_id === undefined
        ? {}
        : { telegram_user_id: request.telegram_user_id }),
      answered_at: request.answered_at ?? stamp(Date.now()),
    };

    const rows = [
      ...this.ctx.storage.sql.exec<QuestionRecord>(
        "UPDATE pending_question SET resolution = ? WHERE id = ? AND resolution IS NULL RETURNING *",
        JSON.stringify(resolution),
        id
      ),
    ];
    if (rows.length > 0) return { ok: true, entry: this.#entry(rows[0]!) };

    const existing = this.#readQuestion(id);
    if (existing === null) {
      return { ok: false, error: "unknown_question", detail: `no question ${id} is registered` };
    }
    const entry = this.#entry(existing);
    const settled = entry.resolution!;
    return {
      ok: false,
      error: "already_answered",
      entry,
      answered_by: settled.answered_by,
      answered_at: settled.answered_at,
      detail: `question ${id} was already answered by ${settled.answered_by} at ${settled.answered_at}: ${
        settled.outcome.text ?? settled.outcome.status
      }`,
    };
  }

  /**
   * Claims the right to write this resolution into tick state, exactly once.
   *
   * A resolution can reach two processes (a local `tk answer` and a blocked
   * `tk ask`) and only one of them may write the note — the flock's other job,
   * kept as a compare-and-set on `applied_at`.
   */
  async claimApplication(id: string): Promise<ClaimApplicationResult> {
    const complaint = badText(id, "id");
    if (complaint !== null) return invalid(complaint);
    const key = id;
    // No `await` between the read and the write, so two claims cannot both
    // observe an unapplied resolution.
    const existing = this.#readQuestion(key);
    if (existing === null) {
      return { ok: false, error: "unknown_question", detail: `no question ${key} is registered` };
    }
    if (existing.resolution === null) {
      return { ok: false, error: "not_answered", detail: `question ${key} is not answered yet` };
    }
    const resolution = JSON.parse(existing.resolution) as PendingResolution;
    if (resolution.applied_at !== undefined) {
      return {
        ok: false,
        error: "already_applied",
        detail: `question ${key} was already applied at ${resolution.applied_at}`,
      };
    }

    resolution.applied_at = stamp(Date.now());
    const rows = [
      ...this.ctx.storage.sql.exec<QuestionRecord>(
        "UPDATE pending_question SET resolution = ? WHERE id = ? RETURNING *",
        JSON.stringify(resolution),
        key
      ),
    ];
    return { ok: true, entry: this.#entry(rows[0]!) };
  }

  async getQuestion(id: string): Promise<PendingEntry | null> {
    if (badText(id, "id") !== null) return null;
    const record = this.#readQuestion(id);
    return record === null ? null : this.#entry(record);
  }

  /** Open questions by default — resolved entries are history, not work. */
  async listQuestions(filter: ListQuestionsFilter = {}): Promise<PendingEntry[]> {
    const clauses: string[] = [];
    const values: (string | null)[] = [];
    if (filter.tick_id !== undefined) {
      clauses.push("tick_id = ?");
      values.push(filter.tick_id);
    }
    if (filter.include_resolved !== true) clauses.push("resolution IS NULL");
    const where = clauses.length === 0 ? "" : ` WHERE ${clauses.join(" AND ")}`;

    return [
      ...this.ctx.storage.sql.exec<QuestionRecord>(
        `SELECT * FROM pending_question${where} ORDER BY created_at, id`,
        ...values
      ),
    ].map((record) => this.#entry(record));
  }

  // --------------------------------------------------------------- status ---

  /** What the room holds right now: the lease (token withheld) and question counts. */
  async status(): Promise<RunRoomStatus> {
    const counts = [
      ...this.ctx.storage.sql.exec<{ open: number; resolved: number }>(
        `SELECT
           COUNT(*) FILTER (WHERE resolution IS NULL) AS open,
           COUNT(*) FILTER (WHERE resolution IS NOT NULL) AS resolved
         FROM pending_question`
      ),
    ][0] ?? { open: 0, resolved: 0 };

    return {
      object: "RunRoom",
      lease: await this.leaseStatus(),
      pending: { open: counts.open, resolved: counts.resolved },
      queued: await this.listQueuedSubmissions(),
    };
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/status") return Response.json(await this.status());
    // The Worker reaches the room over RPC; HTTP exists for a human-readable
    // probe, so an unknown path is simply absent.
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  // ------------------------------------------------------------- internals ---

  #readLease(): LeaseRecord | null {
    const rows = [
      ...this.ctx.storage.sql.exec<LeaseRecord>(
        "SELECT run_id, token, epic, origin, requested_by, acquired_at, expires_at FROM dispatch_lease WHERE id = ?",
        LEASE_ROW
      ),
    ];
    return rows[0] ?? null;
  }

  #writeLease(record: LeaseRecord): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO dispatch_lease (id, run_id, token, epic, origin, requested_by, acquired_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         run_id = excluded.run_id,
         token = excluded.token,
         epic = excluded.epic,
         origin = excluded.origin,
         requested_by = excluded.requested_by,
         acquired_at = excluded.acquired_at,
         expires_at = excluded.expires_at`,
      LEASE_ROW,
      record.run_id,
      record.token,
      record.epic,
      record.origin,
      record.requested_by,
      record.acquired_at,
      record.expires_at
    );
  }

  #lease(record: LeaseRecord): DispatchLease {
    return { ...this.#leaseView(record), token: record.token };
  }

  #leaseView(record: LeaseRecord): DispatchLeaseView {
    return {
      run_id: record.run_id,
      epic: record.epic,
      origin: record.origin as LeaseOrigin,
      ...(record.requested_by === null ? {} : { requested_by: record.requested_by }),
      acquired_at: stamp(record.acquired_at),
      expires_at: stamp(record.expires_at),
    };
  }

  /**
   * Arms the single DO alarm at the earliest live deadline.
   *
   * The lease and the queue both need to wake this room, and `setAlarm`
   * overwrites rather than adding, so every mutation of either deadline goes
   * through here. No deadline at all clears the alarm.
   */
  async #armAlarm(): Promise<void> {
    const deadlines: number[] = [];
    const lease = this.#readLease();
    if (lease !== null) deadlines.push(lease.expires_at);
    const soonest = [
      ...this.ctx.storage.sql.exec<{ expires_at: number }>(
        "SELECT MIN(expires_at) AS expires_at FROM queued_submission"
      ),
    ][0]?.expires_at;
    if (typeof soonest === "number") deadlines.push(soonest);

    if (deadlines.length === 0) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(Math.min(...deadlines));
  }

  #liveQueue(now: number = Date.now()): QueuedRecord[] {
    return [
      ...this.ctx.storage.sql.exec<QueuedRecord>(
        "SELECT * FROM queued_submission WHERE expires_at > ? ORDER BY queued_at, run_id",
        now
      ),
    ];
  }

  #pruneExpiredQueued(now: number = Date.now()): void {
    this.ctx.storage.sql.exec("DELETE FROM queued_submission WHERE expires_at <= ?", now);
  }

  /**
   * Hands the free lease to the oldest live parked submission and boots it.
   *
   * The lease is taken BEFORE the run is started, because `startRun` awaits and
   * anything may interleave at an await inside a DO. If the boot then fails the
   * lease is handed straight back and the submission stays parked, so a broken
   * ignition costs a retry rather than wedging the project for a lease ttl.
   */
  async #igniteNextQueued(): Promise<QueuedSubmission | null> {
    const now = Date.now();
    this.#pruneExpiredQueued(now);

    const next = this.#liveQueue(now)[0];
    if (next === undefined) return null;
    if (this.#readLease() !== null) return null;

    const token = crypto.randomUUID();
    this.#writeLease({
      run_id: next.run_id,
      token,
      epic: next.epic,
      origin: "cloud",
      requested_by: next.requested_by,
      acquired_at: now,
      expires_at: now + DEFAULT_LEASE_TTL_MS,
    });

    try {
      await startRun(this.env, {
        run_id: next.run_id,
        project: next.project,
        epic: next.epic,
        base_sha: next.base_sha,
        requested_by: next.requested_by,
        ...(next.notify === null ? {} : { notify: next.notify }),
        ...(next.max_cost_usd === null ? {} : { max_cost_usd: next.max_cost_usd }),
        ...(next.max_wall_clock_ms === null
          ? {}
          : { max_wall_clock_ms: next.max_wall_clock_ms }),
        lease_token: token,
      });
    } catch (error) {
      this.ctx.storage.sql.exec(
        "DELETE FROM dispatch_lease WHERE id = ? AND run_id = ? AND token = ?",
        LEASE_ROW,
        next.run_id,
        token
      );
      console.error(
        `RunRoom: queued submission ${next.run_id} (epic ${next.epic}) could not ignite; ` +
          `it stays queued until ${stamp(next.expires_at)}: ${String(error)}`
      );
      return null;
    }

    this.ctx.storage.sql.exec("DELETE FROM queued_submission WHERE run_id = ?", next.run_id);
    return this.#queuedView(next);
  }

  #queuedView(record: QueuedRecord): QueuedSubmission {
    return {
      run_id: record.run_id,
      project: record.project,
      epic: record.epic,
      base_sha: record.base_sha,
      requested_by: record.requested_by,
      ...(record.notify === null ? {} : { notify: record.notify }),
      ...(record.max_cost_usd === null ? {} : { max_cost_usd: record.max_cost_usd }),
      ...(record.max_wall_clock_ms === null
        ? {}
        : { max_wall_clock_ms: record.max_wall_clock_ms }),
      blocked_by: record.blocked_by,
      queued_at: stamp(record.queued_at),
      expires_at: stamp(record.expires_at),
    };
  }

  #readStop(runID: string): StopRecord | null {
    const rows = [
      ...this.ctx.storage.sql.exec<StopRecord>(
        "SELECT run_id, mode, requested_by, requested_at FROM run_stop WHERE run_id = ?",
        runID
      ),
    ];
    return rows[0] ?? null;
  }

  #stopView(record: StopRecord): StopRequest {
    return {
      run_id: record.run_id,
      mode: record.mode === "hard" ? "hard" : "clean",
      requested_by: record.requested_by,
      requested_at: stamp(record.requested_at),
    };
  }

  #readQuestion(id: string): QuestionRecord | null {
    const rows = [
      ...this.ctx.storage.sql.exec<QuestionRecord>(
        "SELECT * FROM pending_question WHERE id = ?",
        id
      ),
    ];
    return rows[0] ?? null;
  }

  /**
   * Renders a row as the pending entry the rest of ticks knows. Absent fields
   * are omitted rather than nulled, matching the Go entry's `omitempty` /
   * `omitzero` tags — a relayed entry has to be indistinguishable from one
   * `.tick/pending/` wrote.
   */
  #entry(record: QuestionRecord): PendingEntry {
    return {
      id: record.id,
      ...(record.tick_id === null ? {} : { tick_id: record.tick_id }),
      ...(record.agent_target === null ? {} : { agent_target: record.agent_target }),
      kind: record.kind as PendingKind,
      ...(record.awaiting === null ? {} : { awaiting: record.awaiting }),
      question: JSON.parse(record.question) as Question,
      ...(record.ref === null ? {} : { ref: JSON.parse(record.ref) as MessageRef }),
      created_at: stamp(record.created_at),
      ...(record.not_before === null ? {} : { not_before: stamp(record.not_before) }),
      ...(record.resolution === null
        ? {}
        : { resolution: JSON.parse(record.resolution) as PendingResolution }),
    };
  }
}
