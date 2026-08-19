/**
 * RunRoom Durable Object — the project's single arbiter.
 *
 * One instance per project (`idFromName(project)`). It owns the two pieces of
 * run state that are filesystem-shaped today and awkward for a filesystem:
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
 * The room is addressed by project, not project+epic: the lease arbitrates
 * *between* epic runs, so an epic-scoped room would hand every run its own
 * lease and arbitrate nothing. See docs/design/cloud-factory.md ("The RunRoom
 * DO", D4, D5, D19).
 *
 * Reconcile alarms and `run_event` fan-out to the board's ProjectRoom are
 * later phases. The DO alarm is currently the lease's alone; the next user
 * must multiplex it (earliest deadline wins, each handler re-arming for the
 * next one) rather than calling `setAlarm` behind the lease's back.
 */

import { DurableObject } from "cloudflare:workers";
import type { Env } from "./index";

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
  | { ok: true; released: DispatchLeaseView }
  | { ok: false; error: "not_holder"; holder: DispatchLeaseView | null; detail: string }
  | RequestInvalid;

export type RenewLeaseResult =
  | { ok: true; lease: DispatchLease }
  | { ok: false; error: "lease_lost"; holder: DispatchLeaseView | null; detail: string }
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
    `);
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
    await this.ctx.storage.setAlarm(record.expires_at);

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
    await this.ctx.storage.setAlarm(record.expires_at);
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
    await this.ctx.storage.deleteAlarm();
    return { ok: true, released: this.#leaseView(current) };
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
    const current = this.#readLease();
    if (current === null) return;
    if (current.expires_at > Date.now()) {
      await this.ctx.storage.setAlarm(current.expires_at);
      return;
    }
    this.ctx.storage.sql.exec(
      "DELETE FROM dispatch_lease WHERE id = ? AND run_id = ? AND token = ?",
      LEASE_ROW,
      current.run_id,
      current.token
    );
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
