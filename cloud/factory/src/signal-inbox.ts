/**
 * SignalInbox Durable Object — the funnel every signal source pours into
 * (tick 8sm), and the human gate at the end of it (tick la9).
 *
 * ## The gate, and why a draft is not a tick with a flag
 *
 * A signal does not become a tick when it arrives. It becomes a DRAFT: a row
 * in this object's own storage, with a Create / Dispatch / Discard decision
 * still to be made by a person. Only `decide()` reaches the tracker writer,
 * and it only reaches it with a draft id somebody pressed.
 *
 * The alternative — file the tick and mark it `draft` — was rejected because
 * it makes invisibility a filtering problem: every reader of `.tick/` (`tk
 * next`, `tk ready`, a wave's sweep, the board) would have to remember to
 * exclude it, and the one that forgets dispatches a stranger's issue into a
 * paid run. Here there is nothing to filter. A pending draft has no tick id,
 * no record in `.tick/issues/`, and no commit; `tk` reads the repository, and
 * the repository does not contain it. The tracker's status vocabulary has no
 * fourth value either (`internal/tick/tick.go`: open, in_progress, closed), so
 * a draft could not be expressed as a record even by a writer that wanted to —
 * `Tick.Validate` refuses any other status, and the parity fixture pins it.
 *
 * Discard is the same argument from the other side: it leaves the dedup row
 * and nothing else, so the signal is settled without a tick ever existing and
 * its source's next redelivery is a duplicate rather than a fresh proposal.
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
 * ## Eviction, and the one path redelivery does NOT cover
 *
 * That argument covers {@link SignalInbox.submit}, whose caller is a machine
 * that retries. It does not extend one inch to {@link SignalInbox.decide},
 * because the thing that started that work is a person pressing a button and
 * nothing in the world presses it again. A decided draft is marked
 * `committing` synchronously and the commit is a network call with backoff; a
 * Durable Object may be evicted anywhere inside it (a `wrangler deploy` is
 * enough), and then neither write-back runs. The row stays `committing`
 * forever, every later press is told `already_decided`, and the operator is
 * told the proposal was handled when nothing was filed AND nothing discarded.
 *
 * So a row found in `committing` that THIS instance is not working on is not a
 * decision, it is a question, and {@link SignalInbox.decide} answers it before
 * doing anything else — see `#reconcileCommitting`. The row alone cannot say
 * whether the commit happened, so the reconciler does not guess from it: it
 * asks the tracker, which is the only authority, using the candidate ids the
 * claim persisted for exactly this purpose. Guessing "it committed" strands
 * the signal behind a settled-looking row; guessing "it did not" files the
 * tick twice. Asking is neither.
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

import { parseTickRecord, trackerReader, type TrackerReader } from "./tick-membership";

import { carriedTraceID } from "./trace";

import type { Env } from "./index";

/**
 * How many ACCEPTED drafts may be committing at once in one project.
 *
 * A bound because the queue is memory and every waiting caller is holding a
 * request open. Since the human gate this bounds presses, not arrivals: a
 * source's delivery no longer waits on a network commit at all.
 */
export const SIGNAL_INBOX_QUEUE_LIMIT = 64;

/**
 * How many proposals may wait for a human in one project.
 *
 * The gate's own bound, and the one a runaway source now meets first. A
 * chat with a thousand unanswered Create buttons is not a triage surface, and
 * a source told `drafts_full` redelivers once the pile has been worked down —
 * nothing is lost, which is the same contract every other deferral has.
 */
export const MAX_PENDING_DRAFTS = 200;

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
  /**
   * Admitted as a PROPOSAL. Nothing is in the repository yet and nothing will
   * be until a human decides — see {@link SignalInbox.decide}.
   */
  | {
      state: "drafted";
      seq: number;
      draft_id: string;
      project: string;
      external_ref: string;
      /** The id minted for this arrival, which every later record carries (tick hyi). */
      trace_id: string;
    }
  /**
   * This `(source, external_ref)` has been seen. No second proposal was made,
   * whatever the human did with the first one — including discarding it, which
   * is what stops a source re-proposing the same signal forever.
   */
  | {
      state: "duplicate";
      seq: number;
      draft_id: string;
      /** What became of the first one: `draft`, `created` or `discarded`. */
      draft_state: string;
      /** The tick it became, when a human accepted it. */
      tick_id: string | null;
      external_ref: string;
      first_seen_at: string;
      deliveries: number;
      /**
       * The FIRST delivery's trace id, not this one's.
       *
       * Every delivery of one signal is the same causal chain, so they share
       * an id: a redelivery that reported a fresh one would join to nothing
       * that already exists, which is the failure the id is for.
       */
      trace_id: string;
    }
  /**
   * The signal itself is not filable. A redelivery of it will not be either.
   *
   * It still carries a trace id: the id is minted before the payload is
   * parsed, so a source told "no" can quote one identifier to an operator who
   * then finds the refusal in the Worker's log. A refusal nobody can look up
   * is the shape of the Phase 2 failure at the very first hop.
   */
  | { state: "refused"; reason: string; detail: string; trace_id: string }
  /** Nothing was committed and the signal is still valid. Redeliver it. */
  | { state: "deferred"; reason: string; detail: string; trace_id: string };

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
 * project's inbox — which admits it as a DRAFT.
 *
 * A source calls this AFTER it has established who is speaking — the
 * credential decides that, never the body (see `wave-request.ts`). This
 * function trusts `created_by` because by the time it is reached the caller
 * has already been authenticated by whatever door it came through.
 *
 * There is no second front door that files a tick directly, and that absence
 * is the human gate (tick la9). A source cannot opt out of it, because the
 * only entry point it has is this one and the only thing this one produces is
 * a proposal. A gate a source could choose to skip would be a convention; this
 * is the shape of the API.
 */
export async function submitSignal(
  env: Env,
  raw: unknown,
  options: SubmitOptions = {}
): Promise<SignalOutcome> {
  // MINTED HERE, before the payload is even parsed (D20, tick hyi). This
  // function is the single front door every source pours into, which makes it
  // the edge — and an id minted at the edge covers the refusal path too, so a
  // source told "this is not filable" can still quote one identifier that
  // appears in the Worker's log beside the reason.
  //
  // Not minted inside the Durable Object: an inbox hop that fails leaves the
  // caller with nothing to name, and the refusals above never reach one.
  const trace = carriedTraceID(options.trace_id);
  const parsed = parseSignal(raw);
  if (!parsed.ok) {
    return { state: "refused", reason: parsed.reason, detail: parsed.detail, trace_id: trace };
  }
  return inboxFor(env, parsed.signal.project).submit(parsed.signal, {
    ...options,
    trace_id: trace,
  });
}

// ------------------------------------------------------------ the object ---

type DedupRow = {
  tick_id: string;
  draft_id: string;
  state: string;
  first_seen_at: number;
  deliveries: number;
  /** The FIRST delivery's trace id — every redelivery reports this one. */
  trace_id: string;
};

/**
 * Where one signal is in the human gate.
 *
 * `committing` is a state and not a boolean because two presses of the same
 * Create button are two RPCs: the first claims the draft in its synchronous
 * prefix, so the second sees a draft that is no longer `pending` and files
 * nothing. A commit that does not settle puts it back to `pending`, because
 * nothing was written and the operator may press again.
 *
 * It is also the one state that can outlive the instance that wrote it, which
 * is why it is not terminal and never reads as a decision on its own — see
 * this module's header, and `#reconcileCommitting`.
 */
export const DRAFT_STATES = ["pending", "committing", "created", "dispatched", "discarded"] as const;
export type DraftState = (typeof DRAFT_STATES)[number];

/** What a human may do with a proposal. Three, and there is no fourth. */
export const DRAFT_ACTIONS = ["create", "dispatch", "discard"] as const;
export type DraftAction = (typeof DRAFT_ACTIONS)[number];

/** Where the proposal was posted, so the decision can be shown on the same message. */
export type DraftMessageRef = { channel_id: string; message_id: string };

/**
 * One proposal: a signal that has been admitted and deduped, and has NOT been
 * written to `.tick/`.
 *
 * This record lives in the inbox's own storage and nowhere else. It is not a
 * tick with a flag on it — there is no tick — which is what makes it invisible
 * to `tk next` and to a wave by construction rather than by filtering.
 */
export type Draft = {
  id: string;
  seq: number;
  project: string;
  source: string;
  external_ref: string;
  /**
   * The trace id minted for the arrival this proposal came from (tick hyi).
   *
   * THIS COLUMN IS THE DISCONTINUITY. A signal arrives, becomes a draft, and
   * then sits — possibly for days — until a person presses Create or Dispatch,
   * and the run is started later, by a different actor, from a different
   * surface. So the trace id cannot be a request-scoped value threaded on a
   * stack: it has to be parked in durable state at the edge and read back out
   * of it by the dispatch path. This is where it is parked.
   */
  trace_id: string;
  title: string;
  /** The tick type this would be filed as. The one field the human may retype. */
  type: string;
  state: DraftState;
  /** The channel's rendered block for this proposal, as the source composed it. */
  presentation: string;
  /** The whole signal, so accepting needs nothing but this row. */
  signal: Signal;
  tick_id: string | null;
  commit_sha: string | null;
  run_id: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  message: DraftMessageRef | null;
};

/** What a decision did. Every case the channel has to say out loud is its own state. */
export type DraftDecision =
  /** Filed. `tick_id` is a normal open tick from this moment on. */
  | {
      state: "accepted";
      action: DraftAction;
      draft: Draft;
      tick_id: string;
      path: string;
      commit_sha: string;
      attempts: number;
    }
  /** Nothing was filed, and the dedup record remains so it is not re-proposed. */
  | { state: "discarded"; draft: Draft }
  /** Somebody (or the other surface) already decided this one. */
  | { state: "already_decided"; draft: Draft }
  | { state: "unknown_draft"; detail: string }
  /** Nothing was committed and the draft is still pending. The human may press again. */
  | { state: "deferred"; reason: string; detail: string; draft: Draft }
  /**
   * A `committing` row left behind by an evicted instance was resolved against
   * the tracker, and the commit HAD landed. The tick exists; this press filed
   * nothing and started nothing.
   */
  | { state: "reconciled"; draft: Draft; tick_id: string };

/** What editing a draft did. */
export type DraftEdit =
  | { ok: true; draft: Draft }
  | { ok: false; error: "unknown_draft" | "already_decided" | "invalid_type"; detail: string };

/** One admitted signal, as `status()` reports it. */
export type AdmissionRow = {
  seq: number;
  source: string;
  external_ref: string;
  state: string;
  tick_id: string | null;
  admitted_at: string;
  /** The trace id this arrival was attributed to. */
  trace_id: string;
};

export type InboxStatus = {
  object: "SignalInbox";
  /** Accepted drafts whose commit has not settled yet. */
  in_flight: number;
  /** Proposals waiting for a human. */
  pending_drafts: number;
  /** Distinct `(source, external_ref)` pairs this inbox has seen. */
  deduped: number;
  recent: AdmissionRow[];
};

/** How many admissions `status()` reports. Observability, not a log. */
export const STATUS_ADMISSION_LIMIT = 20;

/** How many drafts `listDrafts` returns without being asked for fewer. */
export const DRAFT_LIST_LIMIT = 50;

/**
 * A draft id: short enough to ride in Telegram callback data beside a verb and
 * two separators, random enough that a press cannot be aimed at somebody
 * else's proposal by guessing.
 */
export function newDraftID(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** What a source may say about a signal that is not part of the tick record. */
export type SubmitOptions = {
  /**
   * The channel's rendered block for this proposal. Composed by the source,
   * because only the source knows which of its text is untrusted — see
   * `github-issues.ts`, whose render is the anti-forgery invariant itself.
   */
  presentation?: string;
  /**
   * The trace id this arrival already has, if the caller minted one earlier
   * (D20, tick hyi).
   *
   * Optional, and normally absent: {@link submitSignal} is the edge, so it
   * mints. A source that logged an id BEFORE calling — because it did work of
   * its own first, as `github-issues.ts` does when it resolves consent —
   * passes that id here so one arrival does not end up with two.
   */
  trace_id?: string;
};

export class SignalInbox extends DurableObject<Env> {
  /**
   * The serialiser. Every ACCEPTED draft appends its commit to this chain, so
   * exactly one commit is ever in flight and they land in the order the human
   * pressed. Rejections are swallowed when extending it: one commit's failure
   * must not poison the queue behind it.
   */
  #tail: Promise<unknown> = Promise.resolve();
  /** Accepted and not yet committed — what {@link SIGNAL_INBOX_QUEUE_LIMIT} bounds. */
  #inFlight = 0;
  /**
   * The drafts THIS instance is committing right now.
   *
   * In memory on purpose, and the whole trick: a `committing` row plus a live
   * entry here is a commit in flight, and a `committing` row with no entry is a
   * commit whose instance is gone — because this set is exactly what an
   * eviction destroys and the row is exactly what it does not. Nothing else
   * available to a later invocation tells those two apart, and treating them
   * alike is either a stranded signal or a duplicate tick.
   */
  #committing = new Set<string>();

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
        trace_id TEXT NOT NULL DEFAULT '',
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
        settled_at INTEGER,
        trace_id TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS signal_admission_by_state ON signal_admission (state);
      CREATE TABLE IF NOT EXISTS signal_draft (
        id TEXT PRIMARY KEY,
        seq INTEGER NOT NULL,
        project TEXT NOT NULL,
        source TEXT NOT NULL,
        external_ref TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        state TEXT NOT NULL,
        presentation TEXT NOT NULL,
        signal TEXT NOT NULL,
        tick_id TEXT,
        commit_sha TEXT,
        run_id TEXT,
        channel_id TEXT,
        message_id TEXT,
        decided_by TEXT,
        decided_at INTEGER,
        created_at INTEGER NOT NULL,
        trace_id TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS signal_draft_by_state ON signal_draft (state);
      -- One query from a trace id to the proposal it produced, which is the
      -- first of the three joins tick hyi's acceptance criterion asks for.
      CREATE INDEX IF NOT EXISTS signal_draft_by_trace ON signal_draft (trace_id);
    `);
    // The dedup index predates the human gate (tick 8sm), where a row was
    // written only after a commit and therefore always had a tick id. Since
    // la9 a row is written when the DRAFT is admitted, so it also has to be
    // able to say which draft, and that a discarded signal is settled with no
    // tick at all. Added rather than recreated: an inbox already holding rows
    // must keep deduping the signals it has seen.
    const columns = new Set(
      [...ctx.storage.sql.exec<{ name: string }>("PRAGMA table_info(signal_dedup)")].map(
        (row) => String(row.name)
      )
    );
    if (!columns.has("draft_id")) {
      ctx.storage.sql.exec("ALTER TABLE signal_dedup ADD COLUMN draft_id TEXT NOT NULL DEFAULT ''");
    }
    if (!columns.has("state")) {
      // Every row that existed before the gate was a committed tick.
      ctx.storage.sql.exec("ALTER TABLE signal_dedup ADD COLUMN state TEXT NOT NULL DEFAULT 'created'");
    }
    // The trace id (tick hyi) is younger than all three tables, and an inbox
    // that already holds drafts must keep answering about them rather than be
    // recreated. Added, defaulting to '' — which is the honest value: a signal
    // admitted before trace ids existed has no chain to join, and inventing
    // one here would claim a join that was never made.
    this.#addColumn(ctx, "signal_dedup", "trace_id");
    this.#addColumn(ctx, "signal_draft", "trace_id");
    this.#addColumn(ctx, "signal_admission", "trace_id");
    // The candidate tick ids one press claimed, written in the SAME synchronous
    // prefix as `state = 'committing'` so an eviction cannot separate the two.
    // Without them a stranded row is unanswerable: `commitTickRecord` mints its
    // ids at commit time, so nobody else knows which paths to look at, and
    // GitHub's contents API cannot be asked "which record carries this external
    // ref". With them the reconciler has an exact question to ask.
    this.#addColumn(ctx, "signal_draft", "candidates");
  }

  /**
   * Adds one TEXT column to a table that may already have it.
   *
   * `CREATE TABLE IF NOT EXISTS` above is a no-op on an inbox that already
   * exists, so a column added later would never appear in one — and every
   * project this factory has ingested for has such an object.
   */
  #addColumn(ctx: DurableObjectState, table: string, column: string): void {
    const columns = new Set(
      [...ctx.storage.sql.exec<{ name: string }>(`PRAGMA table_info(${table})`)].map((row) =>
        String(row.name)
      )
    );
    if (columns.has(column)) return;
    ctx.storage.sql.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
  }

  /**
   * Admits one signal as a DRAFT, or says why it did not.
   *
   * Nothing is committed here and nothing can be: this method never reaches
   * the tracker writer. It is also entirely synchronous — the dedup read and
   * the two writes that follow it sit in one prefix with no `await` between
   * them, and a Durable Object runs that prefix to completion before it
   * delivers the next event. So dedup is airtight without needing the commit
   * queue to make it so, which is a stronger position than the pre-gate funnel
   * had: a redelivery racing its original is not a race, it is the next event.
   */
  async submit(signal: Signal, options: SubmitOptions = {}): Promise<SignalOutcome> {
    // Carried, not minted: `submitSignal` is the edge and has already minted
    // one. The fallback exists because this method is also an RPC surface —
    // an inbox reached without going through the front door still produces a
    // traceable draft rather than an untraceable one.
    const trace = carriedTraceID(options.trace_id);
    const parsed = parseSignal(signal);
    if (!parsed.ok) {
      return { state: "refused", reason: parsed.reason, detail: parsed.detail, trace_id: trace };
    }
    const admitted = parsed.signal;

    const pending = this.#countDrafts("pending");
    if (pending >= MAX_PENDING_DRAFTS) {
      return {
        state: "deferred",
        reason: "drafts_full",
        detail:
          `${admitted.project} already has ${pending} proposal(s) waiting for a human; nothing ` +
          "was lost, redeliver this one once some have been triaged",
        trace_id: trace,
      };
    }

    const at = Date.now();
    const already = this.#dedup(admitted.source, admitted.external_ref);
    if (already !== null) {
      const deliveries = already.deliveries + 1;
      this.ctx.storage.sql.exec(
        "UPDATE signal_dedup SET last_seen_at = ?, deliveries = ? WHERE source = ? AND external_ref = ?",
        at,
        deliveries,
        admitted.source,
        admitted.external_ref
      );
      // The ORIGINAL's trace id, not the one minted for this delivery. Every
      // delivery of one signal is one causal chain, and a redelivery that
      // reported a fresh id would hand its sender an identifier joined to
      // nothing — the precise failure the id exists to prevent, reintroduced
      // at the one hop where a duplicate is the normal case. The freshly
      // minted id is dropped rather than recorded beside it, because two ids
      // for one chain is not a trace.
      const carried = already.trace_id === "" ? trace : already.trace_id;
      const seq = this.#admit(
        admitted,
        at,
        "duplicate",
        already.tick_id === "" ? null : already.tick_id,
        carried
      );
      return {
        state: "duplicate",
        seq,
        draft_id: already.draft_id,
        draft_state: already.state,
        tick_id: already.tick_id === "" ? null : already.tick_id,
        external_ref: formatExternalRef(admitted.source, admitted.external_ref),
        first_seen_at: new Date(Number(already.first_seen_at)).toISOString(),
        deliveries,
        trace_id: carried,
      };
    }

    const seq = this.#admit(admitted, at, "drafted", null, trace);
    const id = newDraftID();
    this.ctx.storage.sql.exec(
      "INSERT INTO signal_draft (id, seq, project, source, external_ref, title, type, state, presentation, signal, created_at, trace_id) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)",
      id,
      seq,
      admitted.project,
      admitted.source,
      admitted.external_ref,
      admitted.title,
      admitted.type ?? DEFAULT_TICK_TYPE,
      options.presentation ?? "",
      JSON.stringify(admitted),
      at,
      trace
    );
    // Written WITH the draft, in the same synchronous prefix, and with no tick
    // id because there is no tick. This ordering is the opposite of the
    // pre-gate funnel's and for the opposite reason: there, a dedup row
    // written before the commit would have suppressed the redelivery that was
    // the only thing that could still file the tick. Here nothing can fail
    // between the two writes, and the row has to exist from this moment so a
    // DISCARD leaves something behind — a signal that is re-proposed forever
    // is the failure this record prevents.
    this.ctx.storage.sql.exec(
      "INSERT INTO signal_dedup (source, external_ref, tick_id, commit_sha, first_seen_at, last_seen_at, deliveries, draft_id, state, trace_id) " +
        "VALUES (?, ?, '', '', ?, ?, 1, ?, 'draft', ?)",
      admitted.source,
      admitted.external_ref,
      at,
      at,
      id,
      trace
    );

    return {
      state: "drafted",
      seq,
      draft_id: id,
      project: admitted.project,
      external_ref: formatExternalRef(admitted.source, admitted.external_ref),
      trace_id: trace,
    };
  }

  /** What this inbox already knows about one `(source, external_ref)`. */
  async lookup(
    source: string,
    externalRef: string
  ): Promise<{
    tick_id: string;
    draft_id: string;
    state: string;
    deliveries: number;
    trace_id: string;
  } | null> {
    const row = this.#dedup(source.trim().toLowerCase(), externalRef.trim());
    return row === null
      ? null
      : {
          tick_id: row.tick_id,
          draft_id: row.draft_id,
          state: row.state,
          deliveries: row.deliveries,
          trace_id: row.trace_id,
        };
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
        trace_id: string | null;
      }>(
        "SELECT seq, source, external_ref, state, tick_id, admitted_at, trace_id FROM signal_admission " +
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
      trace_id: row.trace_id ?? "",
    }));
    return {
      object: "SignalInbox",
      in_flight: this.#inFlight,
      pending_drafts: this.#countDrafts("pending"),
      deduped: Number(deduped),
      recent,
    };
  }

  // ------------------------------------------------------------- drafts ---

  async getDraft(id: string): Promise<Draft | null> {
    return this.#draft(id.trim());
  }

  async listDrafts(options: { state?: DraftState; limit?: number } = {}): Promise<Draft[]> {
    const limit = Math.min(Math.max(options.limit ?? DRAFT_LIST_LIMIT, 1), DRAFT_LIST_LIMIT);
    const rows =
      options.state === undefined
        ? [
            ...this.ctx.storage.sql.exec<DraftRow>(
              "SELECT * FROM signal_draft ORDER BY seq DESC LIMIT ?",
              limit
            ),
          ]
        : [
            ...this.ctx.storage.sql.exec<DraftRow>(
              "SELECT * FROM signal_draft WHERE state = ? ORDER BY seq DESC LIMIT ?",
              options.state,
              limit
            ),
          ];
    return rows.map(draftFromRow);
  }

  /** Remembers where the proposal was posted, so its decision lands on it. */
  async attachDraftMessage(id: string, ref: DraftMessageRef): Promise<Draft | null> {
    const draft = this.#draft(id);
    if (draft === null) return null;
    this.ctx.storage.sql.exec(
      "UPDATE signal_draft SET channel_id = ?, message_id = ? WHERE id = ?",
      ref.channel_id,
      ref.message_id,
      draft.id
    );
    return this.#draft(draft.id);
  }

  /** Records the run a dispatch ignited. */
  async attachDraftRun(id: string, runID: string): Promise<Draft | null> {
    const draft = this.#draft(id);
    if (draft === null) return null;
    this.ctx.storage.sql.exec("UPDATE signal_draft SET run_id = ? WHERE id = ?", runID, draft.id);
    return this.#draft(draft.id);
  }

  /**
   * Retypes a proposal before it is accepted.
   *
   * The one field the gate lets a human change, and it is here because the
   * alternative is worse: `github-issues.ts` files every consented issue as a
   * `bug` (UC3's own case, and never read from the issue text), so the cost of
   * being wrong should be one press before the tick exists rather than an edit
   * afterwards. A decided draft is not editable — retyping a filed tick is
   * `tk update`'s job, not this gate's.
   */
  async setDraftType(id: string, type: string, by: string): Promise<DraftEdit> {
    const wanted = type.trim();
    if (!(TICK_TYPES as readonly string[]).includes(wanted)) {
      return {
        ok: false,
        error: "invalid_type",
        detail: `type must be one of ${TICK_TYPES.join(", ")}`,
      };
    }
    const draft = this.#draft(id.trim());
    if (draft === null) return { ok: false, error: "unknown_draft", detail: `no draft ${id}` };
    if (draft.state !== "pending") {
      return {
        ok: false,
        error: "already_decided",
        detail: `draft ${draft.id} is ${draft.state}; its type is the filed tick's now`,
      };
    }
    this.ctx.storage.sql.exec(
      "UPDATE signal_draft SET type = ?, signal = ? WHERE id = ?",
      wanted,
      JSON.stringify({ ...draft.signal, type: wanted }),
      draft.id
    );
    void by;
    return { ok: true, draft: this.#draft(draft.id)! };
  }

  /**
   * The gate itself: a human accepts this proposal into the tracker, or
   * discards it.
   *
   * Create and Dispatch differ nowhere in here. Both commit exactly one normal
   * open tick; whether a run follows is the caller's business, because
   * igniting one is a control-plane act (lease, budget, Workflow) and not an
   * inbox one.
   */
  async decide(id: string, action: DraftAction, decidedBy: string): Promise<DraftDecision> {
    if (!(DRAFT_ACTIONS as readonly string[]).includes(action)) {
      return { state: "unknown_draft", detail: `no such decision: ${action}` };
    }
    let draft = this.#draft(id.trim());
    if (draft === null) {
      return { state: "unknown_draft", detail: `no draft ${id} in this project's inbox` };
    }
    if (draft.state === "committing" && !this.#committing.has(draft.id)) {
      // Not a decision — a question this instance inherited. Answer it against
      // the tracker before this press is allowed to mean anything, because
      // both readings of the row are wrong until something checks: report it
      // as decided and a real signal is stranded behind a dead button; treat
      // it as pending and a commit that DID land is filed a second time.
      const reconciled = await this.#reconcileCommitting(draft);
      if (reconciled.state !== "revived") return reconciled.decision;
      draft = reconciled.draft;
    }
    if (draft.state !== "pending") return { state: "already_decided", draft };

    const at = Date.now();
    if (action === "discard") {
      this.ctx.storage.sql.exec(
        "UPDATE signal_draft SET state = 'discarded', decided_by = ?, decided_at = ? WHERE id = ?",
        decidedBy,
        at,
        draft.id
      );
      // The dedup row stays, and stays keyed on exactly what a redelivery
      // presents. That it SURVIVES the discard is the point: the same signal
      // must not be proposed again every time its source retries.
      this.ctx.storage.sql.exec(
        "UPDATE signal_dedup SET state = 'discarded' WHERE source = ? AND external_ref = ?",
        draft.source,
        draft.external_ref
      );
      this.#settle(draft.seq, "discarded", null, null, `discarded by ${decidedBy}`);
      return { state: "discarded", draft: this.#draft(draft.id)! };
    }

    if (this.#inFlight >= SIGNAL_INBOX_QUEUE_LIMIT) {
      return {
        state: "deferred",
        reason: "inbox_full",
        detail:
          `${draft.project} already has ${this.#inFlight} accepted draft(s) being committed; ` +
          "nothing was filed and this one is still pending, so pressing again is safe",
        draft,
      };
    }
    this.#inFlight += 1;
    // Claimed in the synchronous prefix, before the first await: two presses of
    // the same button are two RPCs, and the second must find a draft that is no
    // longer pending rather than a second chance to file the same tick.
    //
    // The candidate ids are minted and written HERE rather than inside the
    // commit, in the same prefix and for the same reason the state is: they
    // are the only handle a later invocation has on what this press may have
    // written, and a claim whose evidence lands one await later is a claim an
    // eviction can separate from its evidence.
    const candidates = tickIDCandidates();
    this.ctx.storage.sql.exec(
      "UPDATE signal_draft SET state = 'committing', decided_by = ?, decided_at = ?, candidates = ? WHERE id = ?",
      decidedBy,
      at,
      JSON.stringify(candidates),
      draft.id
    );
    this.#committing.add(draft.id);

    const claimed = this.#draft(draft.id)!;
    const work = this.#tail.then(
      () => this.#accept(claimed, action, candidates),
      () => this.#accept(claimed, action, candidates)
    );
    this.#tail = work.then(
      () => undefined,
      () => undefined
    );
    try {
      return await work;
    } finally {
      this.#inFlight -= 1;
      this.#committing.delete(draft.id);
    }
  }

  // -------------------------------------------------------------- internals ---

  #countDrafts(state: DraftState): number {
    return Number(
      [
        ...this.ctx.storage.sql.exec<{ n: number }>(
          "SELECT COUNT(*) AS n FROM signal_draft WHERE state = ?",
          state
        ),
      ][0].n
    );
  }

  #draft(id: string): Draft | null {
    const rows = [
      ...this.ctx.storage.sql.exec<DraftRow>("SELECT * FROM signal_draft WHERE id = ?", id),
    ];
    return rows.length === 0 ? null : draftFromRow(rows[0]);
  }

  /** Records one arrival and returns its `seq`. Synchronous, so seq is arrival order. */
  #admit(
    signal: Signal,
    at: number,
    state: string,
    tickID: string | null,
    traceID: string
  ): number {
    this.ctx.storage.sql.exec(
      "INSERT INTO signal_admission (source, external_ref, title, admitted_at, state, tick_id, trace_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      signal.source,
      signal.external_ref,
      signal.title,
      at,
      state,
      tickID,
      traceID
    );
    return Number(
      [...this.ctx.storage.sql.exec<{ seq: number }>("SELECT last_insert_rowid() AS seq")][0].seq
    );
  }

  #dedup(source: string, externalRef: string): DedupRow | null {
    const rows = [
      ...this.ctx.storage.sql.exec<DedupRow>(
        "SELECT tick_id, draft_id, state, first_seen_at, deliveries, trace_id FROM signal_dedup WHERE source = ? AND external_ref = ?",
        source,
        externalRef
      ),
    ];
    if (rows.length === 0) return null;
    const row = rows[0]!;
    // A row admitted before trace ids existed reads as no chain rather than as
    // a chain nobody can find. Empty is the honest answer; the alternative is
    // a fabricated id that joins to nothing.
    return { ...row, trace_id: row.trace_id ?? "" };
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
   * The candidate ids one `committing` claim persisted, or an empty list.
   *
   * Empty for a row stranded by an instance that predates this column — see
   * `#reconcileCommitting`, which refuses to guess about one.
   */
  #candidates(id: string): string[] {
    const rows = [
      ...this.ctx.storage.sql.exec<{ candidates: string | null }>(
        "SELECT candidates FROM signal_draft WHERE id = ?",
        id
      ),
    ];
    const raw = rows.length === 0 ? "" : (rows[0]!.candidates ?? "");
    if (raw === "") return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }

  /** The three writes that turn an accepted draft into a filed tick. */
  #recordCommitted(
    draft: Draft,
    action: DraftAction,
    tickID: string,
    commitSHA: string,
    detail: string | null
  ): void {
    this.ctx.storage.sql.exec(
      "UPDATE signal_draft SET state = ?, tick_id = ?, commit_sha = ?, candidates = '' WHERE id = ?",
      action === "dispatch" ? "dispatched" : "created",
      tickID,
      commitSHA,
      draft.id
    );
    this.ctx.storage.sql.exec(
      "UPDATE signal_dedup SET tick_id = ?, commit_sha = ?, state = 'created' WHERE source = ? AND external_ref = ?",
      tickID,
      commitSHA,
      draft.source,
      draft.external_ref
    );
    this.#settle(draft.seq, "created", tickID, commitSHA === "" ? null : commitSHA, detail);
  }

  /**
   * Resolves a `committing` row this instance is not working on.
   *
   * The row says a human pressed and says nothing about what happened next,
   * and the two possibilities are opposite: the commit never went out, or it
   * went out and the object died before either write-back ran. The tracker is
   * the only thing that knows, so the tracker is asked — one read per
   * candidate id the claim persisted, stopping at the first record whose
   * `external_ref` is this draft's.
   *
   * The external ref, not the mere existence of a file at a candidate path:
   * `commitTickRecord` walks past ids that are already taken (422 `exists`),
   * so a record sitting at one of these paths may easily be somebody else's
   * tick. The ref is the dedup key — `<source>:<ref>` — and a record carrying
   * this draft's is this draft's tick and nothing else's.
   *
   * Three verdicts, and the third one is the honest one:
   *
   *  - a record with our ref: the commit landed. The draft is settled as
   *    filed, with the dedup row and the admission row finally catching up.
   *  - every candidate read cleanly and none is ours: nothing was committed.
   *    Back to `pending`, and the press that found it goes on to decide.
   *  - a read failed, or the claim recorded no candidates at all: no verdict.
   *    The row stays `committing` and the caller is told to try again rather
   *    than told a lie in either direction. A GitHub blip must not file a
   *    second tick.
   */
  async #reconcileCommitting(
    draft: Draft
  ): Promise<{ state: "revived"; draft: Draft } | { state: "settled"; decision: DraftDecision }> {
    // Claimed for the duration, so a second press arriving mid-reconcile is
    // told "being filed right now" instead of starting a second reconcile that
    // could revive the row underneath this one.
    this.#committing.add(draft.id);
    try {
      const candidates = this.#candidates(draft.id);
      if (candidates.length === 0) {
        return {
          state: "settled",
          decision: {
            state: "deferred",
            reason: "commit_unreconcilable",
            detail:
              `draft ${draft.id} was left mid-commit by an instance that recorded no candidate ` +
              `ids, so this inbox cannot ask the tracker whether ${formatExternalRef(draft.source, draft.external_ref)} ` +
              "was filed; check .tick/issues/ for that external ref before pressing again",
            draft,
          },
        };
      }

      const reader = trackerReader(this.env);
      const ref = draft.signal.branch ?? "";
      const wanted = formatExternalRef(draft.signal.source, draft.signal.external_ref);
      let found: string | null = null;
      try {
        found = await findCommittedTick(reader, draft.project, ref, candidates, wanted);
      } catch (error) {
        return {
          state: "settled",
          decision: {
            state: "deferred",
            reason: "commit_unreconciled",
            detail:
              `draft ${draft.id} was left mid-commit and the tracker could not be read to say ` +
              `whether it was filed (${String(error)}); nothing was changed, so pressing again is safe`,
            draft,
          },
        };
      }

      if (found === null) {
        // A definite no from a tracker this inbox could see: the commit never
        // landed, so the proposal is exactly as undecided as it was before the
        // press that died. Nothing about the dedup row changes — it has said
        // `draft` with an empty tick id since admission, which is precisely
        // the state a signal that was never filed should be in.
        this.ctx.storage.sql.exec(
          "UPDATE signal_draft SET state = 'pending', decided_by = NULL, decided_at = NULL, candidates = '' WHERE id = ?",
          draft.id
        );
        this.#settle(
          draft.seq,
          "drafted",
          null,
          null,
          `a commit claimed by ${draft.decided_by ?? "an operator"} did not reach the tracker; the proposal is pending again`
        );
        return { state: "revived", draft: this.#draft(draft.id)! };
      }

      // The commit DID land. The tick has existed all along; what was missing
      // was every record of it on this side. The commit sha is not recoverable
      // from a contents read, and an invented one would be worse than none.
      const action: DraftAction = "create";
      this.#recordCommitted(
        draft,
        action,
        found,
        "",
        `reconciled after an interrupted commit: ${wanted} is filed as ${found}`
      );
      return {
        state: "settled",
        decision: { state: "reconciled", draft: this.#draft(draft.id)!, tick_id: found },
      };
    } finally {
      this.#committing.delete(draft.id);
    }
  }

  /**
   * One accepted draft's turn at the tracker.
   *
   * Runs alone — the chain in `decide` guarantees it — so a project's commits
   * are single-file however many buttons were pressed at once. This is the
   * ONLY method in this Worker that reaches the tracker writer with a tick
   * record, and it is reachable only from `decide`, which is reachable only
   * with a draft id a human pressed.
   */
  async #accept(draft: Draft, action: DraftAction, candidates: string[]): Promise<DraftDecision> {
    const signal = draft.signal;
    const externalRef = formatExternalRef(signal.source, signal.external_ref);
    const at = new Date().toISOString();

    const outcome = await commitTickRecord(trackerWriter(this.env), {
      project: signal.project,
      branch: signal.branch,
      retryMs: commitRetryMs(this.env),
      // The ids the claim persisted, not a fresh draw. The reconciler's whole
      // question — "did this press write one of these?" — is only answerable
      // if the commit is confined to the ids the row already names.
      candidates,
      record: {
        title: signal.title,
        description: signal.description,
        // The only status this path ever writes, and `tk`'s vocabulary has no
        // other value that would mean "not yet triaged" — see
        // internal/tick/tick.go. A draft is not a tick in a special state; it
        // is not a tick.
        status: DEFAULT_TICK_STATUS,
        priority: signal.priority,
        type: draft.type,
        owner: signal.owner ?? signal.created_by,
        labels: signal.labels,
        parent: signal.parent,
        acceptance_criteria: signal.acceptance_criteria,
        external_ref: externalRef,
        // Read back out of the draft row, days after it was minted, by a
        // different actor on a different surface. This line is the far side of
        // the discontinuity described on `Draft.trace_id`: nothing here mints,
        // and the record the operator's repository ends up with names the
        // message that proposed it.
        ...(draft.trace_id === "" ? {} : { trace_id: draft.trace_id }),
        created_by: signal.created_by,
        at,
      },
    });

    if (outcome.state === "unsettled") {
      // Nothing was committed, so the proposal goes back to pending and the
      // operator can press again. Leaving it `committing` would strand a real
      // signal behind a button that no longer does anything.
      this.ctx.storage.sql.exec(
        "UPDATE signal_draft SET state = 'pending', decided_by = NULL, decided_at = NULL, candidates = '' WHERE id = ?",
        draft.id
      );
      this.#settle(draft.seq, "unsettled", null, null, outcome.detail);
      return {
        state: "deferred",
        reason: "commit_unsettled",
        detail: `${outcome.detail}; nothing was committed, so accepting this draft again is safe`,
        draft: this.#draft(draft.id)!,
      };
    }

    this.#recordCommitted(draft, action, outcome.tick_id, outcome.commit_sha, null);

    return {
      state: "accepted",
      action,
      draft: this.#draft(draft.id)!,
      tick_id: outcome.tick_id,
      path: outcome.path,
      commit_sha: outcome.commit_sha,
      attempts: outcome.attempts,
    };
  }
}

/**
 * The first candidate id whose tick record carries `externalRef`, or null.
 *
 * Sequential rather than parallel on purpose: this is a recovery path that
 * runs after an eviction, the answer is almost always in the first candidate
 * (an id collision is rare), and six concurrent contents reads against a
 * repository a run may be pushing to buys nothing worth the burst.
 *
 * A read that throws is re-thrown, not skipped. "I could not read candidate 3"
 * is not evidence that candidate 3 is not ours, and treating it as such is the
 * duplicate-tick failure with extra steps.
 */
export async function findCommittedTick(
  reader: TrackerReader,
  project: string,
  ref: string,
  candidates: string[],
  externalRef: string
): Promise<string | null> {
  for (const id of candidates) {
    const text = await reader.read(project, ref, id);
    if (text === null) continue;
    const record = parseTickRecord(text);
    // A record this reader cannot parse is not an answer about whose tick it
    // is, and the walk must not conclude "not ours" from it.
    if (record === null) {
      throw new Error(`.tick/issues/${id}.json in ${project} is not a tick record this reader understands`);
    }
    if (record.external_ref === externalRef) return id;
  }
  return null;
}

type DraftRow = {
  id: string;
  seq: number;
  project: string;
  source: string;
  external_ref: string;
  trace_id: string | null;
  title: string;
  type: string;
  state: string;
  presentation: string;
  signal: string;
  tick_id: string | null;
  commit_sha: string | null;
  run_id: string | null;
  channel_id: string | null;
  message_id: string | null;
  decided_by: string | null;
  decided_at: number | null;
  created_at: number;
  /** JSON array of the candidate ids a `committing` claim persisted. */
  candidates: string | null;
};

function draftFromRow(row: DraftRow): Draft {
  return {
    id: row.id,
    seq: Number(row.seq),
    project: row.project,
    source: row.source,
    external_ref: row.external_ref,
    trace_id: row.trace_id ?? "",
    title: row.title,
    type: row.type,
    state: row.state as DraftState,
    presentation: row.presentation,
    signal: JSON.parse(row.signal) as Signal,
    tick_id: row.tick_id === null || row.tick_id === "" ? null : row.tick_id,
    commit_sha: row.commit_sha === null || row.commit_sha === "" ? null : row.commit_sha,
    run_id: row.run_id === null || row.run_id === "" ? null : row.run_id,
    decided_by: row.decided_by,
    decided_at: row.decided_at === null ? null : new Date(Number(row.decided_at)).toISOString(),
    created_at: new Date(Number(row.created_at)).toISOString(),
    message:
      row.channel_id === null || row.message_id === null
        ? null
        : { channel_id: row.channel_id, message_id: row.message_id },
  };
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
