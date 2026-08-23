/**
 * SignalInbox Durable Object — the funnel every signal source pours into
 * (tick 8sm).
 *
 * A signal is anything outside the factory that should become a tick: a
 * Telegram message, a labelled GitHub issue, a generic webhook. None of those
 * sources is built here on purpose — this is the funnel and its safety, and it
 * lands first and alone because all of them consume it.
 *
 * ## What this object is for
 *
 * `tracker-write.ts` can commit one tick record on its own. What it cannot do
 * on its own is answer the two questions a real source asks:
 *
 * 1. **Two signals at once.** `.tick/` is the one place this project cannot
 *    tolerate a lost update (D4, one writer). One inbox per project
 *    (`idFromName(project)`, exactly as the RunRoom is addressed) makes the
 *    control plane's writes to a project's tracker single-file by
 *    construction: a Durable Object is single-threaded, and the promise chain
 *    below extends that across the `await`s a network commit contains — which
 *    plain single-threadedness does NOT, since every `await` is a yield point
 *    where the next RPC would otherwise interleave.
 * 2. **The same signal twice.** Every webhook source redelivers: Telegram
 *    retries an un-acked update, GitHub redelivers a failed hook, a generic
 *    sender retries on a timeout. Dedup on `(source, external_ref)` lives here
 *    rather than in each source because three implementations of it would
 *    drift, and because the only place that can dedup a signal against a
 *    concurrent copy of itself is the place that serialises them.
 *
 * ## The ordering guarantee, stated exactly
 *
 * Admission is synchronous: `submit()` assigns a monotonic `seq` and records
 * the admission row before its first `await`, and a Durable Object runs that
 * prefix atomically. So `seq` is arrival order at the inbox, no matter how many
 * callers race.
 *
 * Commits then run in `seq` order, one at a time: signal N+1's first contents
 * API call does not begin until signal N's commit has settled — committed,
 * deduped or given back. That is the whole guarantee, and it is what makes
 * dedup airtight rather than best effort: a redelivery that arrives while its
 * original is still in flight is not a race, it is simply the next item in the
 * queue, and by the time it is looked at the original has already recorded its
 * tick id.
 *
 * The queue is in memory and bounded ({@link SIGNAL_INBOX_QUEUE_LIMIT}). It is
 * deliberately not a durable work queue: if this object dies mid-flight the
 * caller gets an error, the source redelivers, and dedup makes the redelivery
 * safe. Durability by redelivery is what every source already provides; a
 * second, persisted copy of the same work would only add a way for the funnel
 * to file a tick nobody asked for twice.
 *
 * ## What it does NOT serialise, and why that is still safe
 *
 * A cloud run commits tracker state from a container, and no Durable Object is
 * in that path. This inbox therefore does not order a signal against a run's
 * own push, and does not try to. The safety there is structural and lives in
 * `tracker-write.ts`: this path is CREATE-ONLY, and the contents API is a
 * compare-and-swap on the branch ref, so a run pushing at the same moment
 * makes a signal's write fail with a 409 having committed nothing. The retry
 * lands on top of the run's commit. Neither writer ever computes a tree from a
 * stale read, so the interleaving cannot corrupt `.tick/` — it can only cost a
 * round trip.
 */

import { DurableObject } from "cloudflare:workers";
import {
  DEFAULT_COMMIT_RETRY_MS,
  DEFAULT_TICK_PRIORITY,
  DEFAULT_TICK_STATUS,
  DEFAULT_TICK_TYPE,
  SIGNAL_SOURCE_PATTERN,
  commitTickRecord,
  formatExternalRef,
  tickIDCandidates,
  trackerWriter,
} from "./tracker-write";

import type { Env } from "./index";

/**
 * How many signals may wait in one project's inbox.
 *
 * A bound because the queue is memory and every waiting caller is holding a
 * request open. Generous for any real source — a webhook burst is tens, not
 * thousands — so reaching it means something is looping, and a source told
 * `inbox_full` retries rather than losing the signal.
 */
export const SIGNAL_INBOX_QUEUE_LIMIT = 64;

/** Bounds on what a source may put in a tick record. Prose, not payloads. */
export const MAX_SIGNAL_TITLE = 200;
export const MAX_SIGNAL_DESCRIPTION = 32_000;
export const MAX_EXTERNAL_REF = 512;
export const MAX_SIGNAL_LABELS = 16;

/** The valid `type` values, from Go's `internal/tick/tick.go`. */
export const TICK_TYPES = ["bug", "feature", "task", "epic", "chore"] as const;

/**
 * One signal, as a source hands it to the funnel.
 *
 * `source` and `external_ref` are the dedup key and are required: a source
 * that cannot name its own delivery cannot be deduped, and a funnel that
 * accepted one anyway would file a tick per retry. Every source has such an
 * id — a Telegram update id, an issue's node id, a webhook's delivery id —
 * so requiring it costs nothing and is the difference between the guarantee
 * holding and not.
 */
export type Signal = {
  /** `owner/repo`, which is also the inbox's name. */
  project: string;
  /** Which kind of source this came from: `telegram`, `github`, a webhook's registered name. */
  source: string;
  /** The source's own id for THIS delivery's subject. Stable across redeliveries. */
  external_ref: string;
  title: string;
  description?: string;
  labels?: string[];
  priority?: number;
  type?: string;
  /** The epic this tick belongs under, when the source knows it. */
  parent?: string;
  acceptance_criteria?: string;
  owner?: string;
  /** Who the tick is attributed to. A source supplies its paired operator. */
  created_by: string;
  /** The branch the record is committed to; the repository's default branch when unset. */
  branch?: string;
};

export type SignalOutcome =
  /** The record is committed. `commit_sha` is the commit that carries it. */
  | {
      state: "created";
      seq: number;
      tick_id: string;
      path: string;
      commit_sha: string;
      external_ref: string;
      attempts: number;
    }
  /** This `(source, external_ref)` already became a tick. No second one was filed. */
  | {
      state: "duplicate";
      seq: number;
      tick_id: string;
      external_ref: string;
      first_seen_at: string;
      deliveries: number;
    }
  /** The signal itself is not filable. A redelivery of it will not be either. */
  | { state: "refused"; reason: string; detail: string }
  /** Nothing was committed and the signal is still valid. Redeliver it. */
  | { state: "deferred"; reason: string; detail: string };

/** A validation verdict on a raw payload, before it costs an inbox hop. */
export type SignalParse =
  | { ok: true; signal: Signal }
  | { ok: false; reason: string; detail: string };

const PROJECT_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const TICK_ID_PATTERN = /^[a-z0-9]{3,4}$/;

function refuse(reason: string, detail: string): SignalParse {
  return { ok: false, reason, detail };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validates one signal, without touching the inbox.
 *
 * Exported because every source parses its own payload into this shape and
 * should learn it is unfilable before a Durable Object hop, and because the
 * inbox itself re-validates: a source is another module, and the rule that
 * `.tick/` only ever receives well-formed records has to be true at the place
 * that writes them.
 */
export function parseSignal(raw: unknown): SignalParse {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return refuse("invalid_signal", "a signal must be an object");
  }
  const input = raw as Record<string, unknown>;

  const project = text(input.project);
  if (!PROJECT_PATTERN.test(project)) {
    return refuse("invalid_signal", "project must be owner/repo");
  }

  const source = text(input.source).toLowerCase();
  if (!SIGNAL_SOURCE_PATTERN.test(source)) {
    return refuse(
      "invalid_signal",
      "source must name the kind of source this came from (lowercase letters, digits, - and _): " +
        "it is half the dedup key, so an unnamed source cannot be deduped"
    );
  }

  // NOT lowercased, unlike the source: an external ref is very often a URL or
  // a case-sensitive node id, and folding its case would merge two distinct
  // signals into one tick.
  const externalRef = text(input.external_ref);
  if (externalRef === "") {
    return refuse(
      "invalid_signal",
      "external_ref must be the source's own stable id for this signal; without one a " +
        "redelivery cannot be told from a new signal and every retry would file another tick"
    );
  }
  if (externalRef.length > MAX_EXTERNAL_REF) {
    return refuse("invalid_signal", `external_ref is longer than ${MAX_EXTERNAL_REF} characters`);
  }

  const title = text(input.title).replace(/\s+/g, " ");
  if (title === "") return refuse("invalid_signal", "title is required");
  if (title.length > MAX_SIGNAL_TITLE) {
    return refuse("invalid_signal", `title is longer than ${MAX_SIGNAL_TITLE} characters`);
  }

  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (description.length > MAX_SIGNAL_DESCRIPTION) {
    return refuse(
      "invalid_signal",
      `description is ${description.length} bytes, past the ${MAX_SIGNAL_DESCRIPTION} a tick record carries`
    );
  }

  const createdBy = text(input.created_by);
  if (createdBy === "") {
    return refuse("invalid_signal", "created_by must name who this tick is attributed to");
  }
  const owner = text(input.owner) === "" ? createdBy : text(input.owner);

  let labels: string[] = [];
  if (input.labels !== undefined) {
    if (!Array.isArray(input.labels) || input.labels.some((l) => typeof l !== "string")) {
      return refuse("invalid_signal", "labels must be an array of strings");
    }
    labels = (input.labels as string[]).map((l) => l.trim()).filter((l) => l !== "");
    if (labels.length > MAX_SIGNAL_LABELS) {
      return refuse("invalid_signal", `at most ${MAX_SIGNAL_LABELS} labels`);
    }
  }

  let priority = DEFAULT_TICK_PRIORITY;
  if (input.priority !== undefined) {
    if (
      typeof input.priority !== "number" ||
      !Number.isInteger(input.priority) ||
      input.priority < 0 ||
      input.priority > 4
    ) {
      return refuse("invalid_signal", "priority must be an integer 0-4");
    }
    priority = input.priority;
  }

  let kind = DEFAULT_TICK_TYPE;
  if (input.type !== undefined) {
    const wanted = text(input.type);
    if (!(TICK_TYPES as readonly string[]).includes(wanted)) {
      return refuse("invalid_signal", `type must be one of ${TICK_TYPES.join(", ")}`);
    }
    kind = wanted;
  }

  const parent = text(input.parent);
  if (parent !== "" && !TICK_ID_PATTERN.test(parent)) {
    return refuse("invalid_signal", "parent must be a tick id");
  }

  const branch = text(input.branch);
  const acceptance = typeof input.acceptance_criteria === "string" ? input.acceptance_criteria.trim() : "";

  return {
    ok: true,
    signal: {
      project,
      source,
      external_ref: externalRef,
      title,
      ...(description === "" ? {} : { description }),
      ...(labels.length === 0 ? {} : { labels }),
      priority,
      type: kind,
      ...(parent === "" ? {} : { parent }),
      ...(acceptance === "" ? {} : { acceptance_criteria: acceptance }),
      owner,
      created_by: createdBy,
      ...(branch === "" ? {} : { branch }),
    },
  };
}

/** One inbox per project, addressed exactly as the RunRoom is. */
export function inboxFor(env: Env, project: string): DurableObjectStub<SignalInbox> {
  return env.SIGNAL_INBOXES.get(env.SIGNAL_INBOXES.idFromName(project));
}

/**
 * The funnel's front door for every source: validate, then hand to the
 * project's inbox.
 *
 * A source calls this AFTER it has established who is speaking — the
 * credential decides that, never the body (see `wave-request.ts`). This
 * function trusts `created_by` because by the time it is reached the caller
 * has already been authenticated by whatever door it came through; it is a
 * funnel, not a gate.
 */
export async function submitSignal(env: Env, raw: unknown): Promise<SignalOutcome> {
  const parsed = parseSignal(raw);
  if (!parsed.ok) return { state: "refused", reason: parsed.reason, detail: parsed.detail };
  return inboxFor(env, parsed.signal.project).submit(parsed.signal);
}

// ------------------------------------------------------------ the object ---

type DedupRow = {
  tick_id: string;
  first_seen_at: number;
  deliveries: number;
};

/** One admitted signal, as `status()` reports it. */
export type AdmissionRow = {
  seq: number;
  source: string;
  external_ref: string;
  state: string;
  tick_id: string | null;
  admitted_at: string;
};

export type InboxStatus = {
  object: "SignalInbox";
  /** Signals admitted but not yet settled, plus the one being committed. */
  in_flight: number;
  /** Distinct `(source, external_ref)` pairs that have become ticks. */
  deduped: number;
  recent: AdmissionRow[];
};

/** How many admissions `status()` reports. Observability, not a log. */
export const STATUS_ADMISSION_LIMIT = 20;

export class SignalInbox extends DurableObject<Env> {
  /**
   * The serialiser. Every admitted signal appends its commit to this chain, so
   * the chain's order IS `seq` order and exactly one commit is ever in flight.
   * Rejections are swallowed when extending it: one signal's failure must not
   * poison the queue behind it.
   */
  #tail: Promise<unknown> = Promise.resolve();
  /** Admitted and not yet settled — what {@link SIGNAL_INBOX_QUEUE_LIMIT} bounds. */
  #inFlight = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Synchronous, so it is complete before any RPC is delivered — DO storage
    // SQL does not yield. Same construction as the RunRoom's.
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS signal_dedup (
        source TEXT NOT NULL,
        external_ref TEXT NOT NULL,
        tick_id TEXT NOT NULL,
        commit_sha TEXT NOT NULL,
        first_seen_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        deliveries INTEGER NOT NULL,
        PRIMARY KEY (source, external_ref)
      );
      CREATE TABLE IF NOT EXISTS signal_admission (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        external_ref TEXT NOT NULL,
        title TEXT NOT NULL,
        admitted_at INTEGER NOT NULL,
        state TEXT NOT NULL,
        tick_id TEXT,
        commit_sha TEXT,
        detail TEXT,
        settled_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS signal_admission_by_state ON signal_admission (state);
    `);
  }

  /**
   * Files one signal as a tick, or says why it did not.
   *
   * The synchronous prefix — the depth check and the admission row — is what
   * makes the ordering guarantee hold: a Durable Object delivers events one at
   * a time and runs each one's synchronous prefix to completion, so `seq` is
   * arrival order however many callers raced to get here.
   */
  async submit(signal: Signal): Promise<SignalOutcome> {
    const parsed = parseSignal(signal);
    if (!parsed.ok) return { state: "refused", reason: parsed.reason, detail: parsed.detail };
    const admitted = parsed.signal;

    if (this.#inFlight >= SIGNAL_INBOX_QUEUE_LIMIT) {
      return {
        state: "deferred",
        reason: "inbox_full",
        detail:
          `${admitted.project}'s signal inbox already holds ${this.#inFlight} signal(s) waiting to ` +
          "be committed; nothing was lost, redeliver this one",
      };
    }
    this.#inFlight += 1;

    const at = Date.now();
    this.ctx.storage.sql.exec(
      "INSERT INTO signal_admission (source, external_ref, title, admitted_at, state) VALUES (?, ?, ?, ?, 'pending')",
      admitted.source,
      admitted.external_ref,
      admitted.title,
      at
    );
    const seq = Number(
      [...this.ctx.storage.sql.exec<{ seq: number }>("SELECT last_insert_rowid() AS seq")][0].seq
    );

    // Appended to the chain rather than awaited directly: the previous
    // signal's commit has to have settled first, and its failure must not
    // cancel this one.
    const work = this.#tail.then(
      () => this.#file(seq, admitted),
      () => this.#file(seq, admitted)
    );
    this.#tail = work.then(
      () => undefined,
      () => undefined
    );
    try {
      return await work;
    } finally {
      this.#inFlight -= 1;
    }
  }

  /** What this inbox already knows about one `(source, external_ref)`. */
  async lookup(source: string, externalRef: string): Promise<{ tick_id: string; deliveries: number } | null> {
    const row = this.#dedup(source.trim().toLowerCase(), externalRef.trim());
    return row === null ? null : { tick_id: row.tick_id, deliveries: row.deliveries };
  }

  async status(): Promise<InboxStatus> {
    const deduped = [
      ...this.ctx.storage.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM signal_dedup"),
    ][0].n;
    const recent = [
      ...this.ctx.storage.sql.exec<{
        seq: number;
        source: string;
        external_ref: string;
        state: string;
        tick_id: string | null;
        admitted_at: number;
      }>(
        "SELECT seq, source, external_ref, state, tick_id, admitted_at FROM signal_admission " +
          "ORDER BY seq DESC LIMIT ?",
        STATUS_ADMISSION_LIMIT
      ),
    ].map((row) => ({
      seq: Number(row.seq),
      source: row.source,
      external_ref: row.external_ref,
      state: row.state,
      tick_id: row.tick_id,
      admitted_at: new Date(Number(row.admitted_at)).toISOString(),
    }));
    return { object: "SignalInbox", in_flight: this.#inFlight, deduped: Number(deduped), recent };
  }

  #dedup(source: string, externalRef: string): DedupRow | null {
    const rows = [
      ...this.ctx.storage.sql.exec<DedupRow>(
        "SELECT tick_id, first_seen_at, deliveries FROM signal_dedup WHERE source = ? AND external_ref = ?",
        source,
        externalRef
      ),
    ];
    return rows.length === 0 ? null : rows[0];
  }

  #settle(seq: number, state: string, tickID: string | null, commitSHA: string | null, detail: string | null): void {
    this.ctx.storage.sql.exec(
      "UPDATE signal_admission SET state = ?, tick_id = ?, commit_sha = ?, detail = ?, settled_at = ? WHERE seq = ?",
      state,
      tickID,
      commitSHA,
      detail,
      Date.now(),
      seq
    );
  }

  /**
   * One signal's turn: dedup, then commit.
   *
   * Runs alone — the chain in `submit` guarantees it — so the dedup read and
   * the write that follows it are one critical section without a lock. That is
   * the entire reason the check is here and not in each source: in a source it
   * would be a read that another delivery could get between.
   */
  async #file(seq: number, signal: Signal): Promise<SignalOutcome> {
    const externalRef = formatExternalRef(signal.source, signal.external_ref);

    const already = this.#dedup(signal.source, signal.external_ref);
    if (already !== null) {
      const deliveries = already.deliveries + 1;
      this.ctx.storage.sql.exec(
        "UPDATE signal_dedup SET last_seen_at = ?, deliveries = ? WHERE source = ? AND external_ref = ?",
        Date.now(),
        deliveries,
        signal.source,
        signal.external_ref
      );
      this.#settle(seq, "duplicate", already.tick_id, null, `already filed as ${already.tick_id}`);
      return {
        state: "duplicate",
        seq,
        tick_id: already.tick_id,
        external_ref: externalRef,
        first_seen_at: new Date(Number(already.first_seen_at)).toISOString(),
        deliveries,
      };
    }

    const at = new Date().toISOString();
    const outcome = await commitTickRecord(trackerWriter(this.env), {
      project: signal.project,
      branch: signal.branch,
      retryMs: commitRetryMs(this.env),
      candidates: tickIDCandidates(),
      record: {
        title: signal.title,
        description: signal.description,
        status: DEFAULT_TICK_STATUS,
        priority: signal.priority,
        type: signal.type,
        owner: signal.owner ?? signal.created_by,
        labels: signal.labels,
        parent: signal.parent,
        acceptance_criteria: signal.acceptance_criteria,
        external_ref: externalRef,
        created_by: signal.created_by,
        at,
      },
    });

    if (outcome.state === "unsettled") {
      this.#settle(seq, "unsettled", null, null, outcome.detail);
      return {
        state: "deferred",
        reason: "commit_unsettled",
        detail: `${outcome.detail}; nothing was committed, so redelivering this signal is safe`,
      };
    }

    // Recorded only after the commit, and this order is load-bearing: a dedup
    // row written first would suppress the redelivery that is the only thing
    // that could still file a tick the commit failed to write.
    const now = Date.now();
    this.ctx.storage.sql.exec(
      "INSERT INTO signal_dedup (source, external_ref, tick_id, commit_sha, first_seen_at, last_seen_at, deliveries) " +
        "VALUES (?, ?, ?, ?, ?, ?, 1)",
      signal.source,
      signal.external_ref,
      outcome.tick_id,
      outcome.commit_sha,
      now,
      now
    );
    this.#settle(seq, "created", outcome.tick_id, outcome.commit_sha, null);

    return {
      state: "created",
      seq,
      tick_id: outcome.tick_id,
      path: outcome.path,
      commit_sha: outcome.commit_sha,
      external_ref: externalRef,
      attempts: outcome.attempts,
    };
  }
}

/**
 * The backoff between commit attempts, from `[vars]`.
 *
 * A deployment decision for the same reason the run budgets are: how long to
 * wait out a run's push is a property of how that repository is used, not of
 * this code. An unusable value is ignored with the default rather than taking
 * the funnel down over a typo.
 */
export function commitRetryMs(env: Env): number {
  const raw = env.SIGNAL_COMMIT_RETRY_MS;
  if (typeof raw !== "string" || raw.trim() === "") return DEFAULT_COMMIT_RETRY_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 60_000) return DEFAULT_COMMIT_RETRY_MS;
  return Math.floor(parsed);
}
