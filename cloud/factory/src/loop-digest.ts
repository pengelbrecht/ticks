/**
 * The daily digest: the one thing that ASKS whether the unattended loops are
 * still working (Phase 4 review, tick zaw).
 *
 * ## The gap, and why it is not a missing feature
 *
 * CI remediation pages a person when it strikes out (`ci-remediation.ts`) and
 * again when it breaks in a way it has no rule for (`ci-fault.ts`). Sweeps and
 * PR review do neither. Both keep excellent records — every sweep firing is a
 * `sweep_selection` row whether or not it selected anything, every claimed
 * pull request is a `pr_reviews` row — and both records are *pull-only*: they
 * are discovered by somebody going and looking.
 *
 * For an epic whose premise is that nobody is watching, that is a hole, and it
 * is **Phase 2's hardest lesson one level up**. There, a supervisor could not
 * report its own death, because the record was written by the thing that died.
 * Here, a sweep can refuse every night for a week and nothing reports it,
 * because nothing is asking. Tick `acy` landed `tk cloud supervisor`, which
 * answers "is this run's supervisor alive" perfectly — on demand. The clock
 * never asks it.
 *
 * ## Why a digest and not an alert
 *
 * The question this module answers is deliberately narrow: *is there ANY path
 * by which a loop failing every night reaches a person before someone happens
 * to look?* It is NOT "should every failure notify" — it should not. Tick
 * `uls` spent a whole tick on one half of that trade (an escalation that fired
 * once and then went quiet while spending resumed) and `ci-fault.ts` spends
 * its design on the other (a redelivered crash must not page anybody twice). A
 * channel that cries wolf is worse than no channel, because the message people
 * learn to skip is the one that mattered.
 *
 * So: **one message a day, only when there is something to say.**
 *
 *  - A **quiet day sends nothing**. Not an all-clear — an all-clear delivered
 *    every morning is a message that trains its reader to ignore the channel.
 *    The row in `loop_digest` is what proves the watch ran (see the migration).
 *  - A finding is **repeated daily for as long as it is still true**, and
 *    stops the moment the loop works again. That is the deliberate opposite of
 *    `ci-fault.ts`'s alert-once rule, and the difference is what the record
 *    GATES: a fault row gates a dispatch decision, so a person must release
 *    it; this row gates nothing. Its release is therefore evidence of
 *    recovery — a sweep that fires without refusing, a review that comments —
 *    never a clock and never an acknowledgement. Tick `uls`'s rule ("time
 *    passes" is the answer that caused the bug) is kept: nothing here is
 *    released by the passage of time.
 *  - Every finding names **the command an operator should run**. A message
 *    that says something is wrong and not what to do with it is a message that
 *    costs attention and returns nothing.
 *
 * ## What counts as a failure, and what deliberately does not
 *
 * **A sweep** is failing when its most recent {@link SWEEP_FAILURE_STREAK}
 * firings in a row all `refused` — an unreadable policy, an unreadable
 * frontier, no epic, a submission the factory would not take. `empty` is NOT a
 * failure (the frontier held nothing this filter wanted, which is a working
 * sweep on a quiet tracker) and neither is `queued` or `ignited`. Three in a
 * row rather than one, because a sweep that refused once for a transient
 * reason and worked the next morning is not news, and news that is not news is
 * how a channel gets muted.
 *
 * **A review** is failing when its `pr_reviews` row has been in flight for
 * more than {@link REVIEW_STALE_HOURS} with no comment posted. That covers
 * both shapes the review loop can die in: a run that was dispatched and never
 * came back (the stale-supervisor case, which is exactly what
 * `tk cloud supervisor` was built to answer), and a claim that was never bound
 * to a run at all — a crash between the claim and the dispatch, which leaves
 * that pull request permanently unreviewable because every redelivery after it
 * is answered as a duplicate.
 *
 * **A review that EXPIRED unrun** (tick 6tx) is a third thing again, and gets
 * its own kind rather than being folded into either. It has no run to ask
 * about — it never started, because an epic run held the project's one
 * dispatch slot for longer than the review's queue window — so reporting it as
 * a stalled review would hand an operator `tk cloud supervisor <run-id>` for a
 * run that never booted. It is reported for a day rather than until it
 * recovers, because it cannot recover: it is settled, the author has already
 * been told on the pull request itself, and what an operator does with it is
 * decide whether the queue window fits how long their runs take.
 *
 * **A branch** is failing when CI remediation refused it because nothing
 * records who created it (tick t4y, `branch-registry.ts`). That refusal is the
 * SAFE direction — the factory does not push to a branch it cannot prove is
 * its own — and it is here for exactly that reason: tick `am2` declined to
 * build the ownership record at all partly because "a lost record orphans a
 * real factory branch, so remediation refuses work it should do", and that
 * refusal would have landed in `dispatch_log` and nowhere else. It lands here
 * now. Unlike an expiry it is NOT settled: it is a question, and it is
 * released by an ANSWER either way — recording the branch as the factory's
 * puts the loop back to work, recording it as a person's ends the question for
 * good. So it follows this file's ordinary rule and repeats until answered.
 *
 * Those four kinds are the whole taxonomy, and the thing they have in common
 * is worth stating once: **each is a loop that stopped producing work without
 * anybody being told.** They differ in what releases them, and the differences
 * are deliberate rather than incidental — see {@link LOOP_LABELS}, which is
 * where a fifth kind has to declare itself.
 *
 * | Kind | Released by |
 * |---|---|
 * | `sweep` | a firing that does not refuse — evidence of recovery |
 * | `pr_review` | a comment posted — the thing a review run exists to produce |
 * | `pr_review_expired` | nothing; it is settled, so it ages out after a day |
 * | `branch_record` | a person answering, either way |
 *
 * What is deliberately NOT here: a sweep whose run ignited and then failed.
 * That run has its own completion gate, its own record and its own notify
 * channel; a second opinion about it from here would be the duplicate
 * notification this module exists to avoid. The digest reports loops that are
 * not producing runs, not runs that produced a bad answer.
 *
 * ## Where it runs
 *
 * The Worker's `scheduled` handler, on the trigger whose UTC hour matches
 * {@link DIGEST_HOUR_UTC}. It reuses the hourly cron that already wakes the
 * factory for sweeps rather than declaring a second trigger — the sweeps'
 * trigger is the thing whose failures it reports, and a watcher on its own
 * schedule is a second schedule to keep correct.
 */

import {
  CI_BRANCHES_PATH,
  listUnrecordedBranches,
  type UnrecordedBranch,
} from "./branch-registry";
import { sendTelegramReport } from "./telegram";
import { sanitizeUntrustedLine } from "./untrusted-text";

import type { Env } from "./index";

// ------------------------------------------------------------- the policy ---

/**
 * The UTC hour the digest is built at, when `DIGEST_HOUR` says nothing.
 *
 * 07:00 UTC: after a nightly sweep has fired and failed, early enough that the
 * message is waiting when somebody starts their day. It must be an hour the
 * deployment's `[triggers] crons` actually covers — with the default hourly
 * trigger, every hour is.
 */
export const DIGEST_HOUR_UTC = 7;

/** Consecutive refusals before a sweep is worth a person's attention. */
export const SWEEP_FAILURE_STREAK = 3;

/**
 * How far back the sweep question is asked.
 *
 * Long enough that a *weekly* sweep can accumulate a streak, which a 24-hour
 * window could never see. The streak is what decides; this only bounds the read.
 */
export const SWEEP_LOOKBACK_DAYS = 21;

/** How many sweep firings one digest will read. A bound on the query, not on the answer. */
export const SWEEP_FIRING_LIMIT = 500;

/** How long a claimed pull request may be in flight before it is stuck. */
export const REVIEW_STALE_HOURS = 24;

/**
 * How far back an expired review is still news (tick 6tx).
 *
 * A review whose queue window closed behind an epic run is a SETTLED outcome,
 * not a stuck one: the author has been told on the pull request itself
 * (`queue-expiry.ts`), and nothing is going to change. Reporting it forever
 * would be the cry-wolf failure this module is built to avoid, so it is
 * reported for a day — long enough that an operator watching one repository
 * starve its reviews sees the pattern, short enough that a settled fact stops
 * occupying the channel.
 *
 * That is a deliberate exception to this file's "repeated until it works
 * again" rule, and the exception is what the rule is FOR: a finding is
 * repeated while it is still actionable. An expiry stops being actionable the
 * moment it is announced.
 */
export const REVIEW_EXPIRY_LOOKBACK_HOURS = 24;

/**
 * How recently a branch must have been refused for want of a record to still
 * be worth reporting (tick t4y).
 *
 * NOT the same kind of bound as {@link REVIEW_EXPIRY_LOOKBACK_HOURS} above,
 * and the difference is the point. An expiry is settled, so the clock is its
 * whole release. This finding's real release is EVIDENCE — a record appears,
 * of either owner, and the question is answered
 * (`listUnrecordedBranches` joins it away). This bound only asks whether the
 * refusal is still HAPPENING: a branch nothing has asked the factory about in
 * a fortnight is not a live refusal, and a digest that recites dead branches
 * forever is a digest people learn to skip. Longer than the sweep streak's
 * reach because a branch can go a week between CI runs.
 */
export const UNRECORDED_BRANCH_ACTIVE_DAYS = 14;

/** How many findings one message carries before it says "and N more". */
export const MAX_DIGEST_FINDINGS = 20;

/** How much of a record's own detail line the digest quotes. */
const DETAIL_MAX_CHARS = 220;

/**
 * Where an operator reads what a sweep actually did.
 *
 * The path is routed in `index.ts`; it is named here because the MESSAGE has
 * to carry it — a report that says a sweep is broken without saying where the
 * account of it lives sends the reader looking. Pinned against the real route
 * by a test, for the same reason `CI_ESCALATIONS_PATH` is named beside the
 * escalation message that has to recite it.
 */
export const SWEEP_RECORDS_PATH = "/api/sweeps";

/**
 * Where an operator answers the branch-ownership question, re-exported for the
 * same reason {@link SWEEP_RECORDS_PATH} is declared here: the message recites
 * it. It is owned by `branch-registry.ts` and pinned against the real route by
 * a test.
 */
export { CI_BRANCHES_PATH };

// ------------------------------------------------------------ the findings ---

/** One loop that is not working, in the words the digest will use. */
export type LoopFinding = {
  /**
   * Which loop. Every kind here earned its own name rather than being folded
   * into a neighbour, and twice for the same reason — the two ticks that added
   * one arrived at it independently:
   *
   *  - `pr_review_expired` (tick 6tx): a review that is STUCK and one that
   *    EXPIRED unrun need different commands and mean different things about
   *    the factory. Folded together, an expired review would be offered
   *    `tk cloud supervisor <run-id>` for a run that never booted.
   *  - `branch_record` (tick t4y): a branch CI remediation refused for want of
   *    a creation record is a QUESTION, not a broken loop, and the operator
   *    answers it rather than fixing anything.
   *
   * Folding any of them into another would be the collapse this whole epic
   * keeps ruling out. Adding a fifth means adding a {@link LOOP_LABELS} entry,
   * which the compiler requires.
   */
  loop: "sweep" | "pr_review" | "pr_review_expired" | "branch_record";
  /**
   * What is broken: `project/sweep-name`, `project#pr-number`, or
   * `project branch`.
   */
  subject: string;
  project: string;
  /**
   * How bad: consecutive refusals for a sweep, hours in flight for a review,
   * refusals so far for a branch.
   */
  measure: string;
  /** The oldest failure still being reported, ISO. */
  since: string;
  /** The record's own last word on why, sanitized — a repository writes into it. */
  detail: string;
  /** What the person reading this should run. */
  command: string;
};

/** A sweep firing, as `sweep_selection` records it. */
export type SweepFiring = {
  project: string;
  sweep: string;
  fired_at: string;
  outcome: string;
  detail: string;
};

/** A pull request this factory claimed and has not commented on. */
export type InFlightReview = {
  project: string;
  pr_number: number;
  run_id: string | null;
  state: string;
  claimed_at: string;
  detail: string | null;
};

/** A pull request whose review expired on the dispatch queue without ever running (tick 6tx). */
export type ExpiredReview = {
  project: string;
  pr_number: number;
  run_id: string | null;
  claimed_at: string;
  expired_at: string;
  /** The comment that told the author, or NULL — which is a finding in itself. */
  expiry_comment_id: string | null;
  detail: string | null;
};

/** The UTC day a digest is claimed under. */
export function digestDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/**
 * The hour this deployment builds its digest at.
 *
 * An unusable `DIGEST_HOUR` is logged and ignored rather than obeyed or
 * fatal — `sweep-dispatch.ts` treats `SWEEP_MAX_PROJECTS` the same way. A typo
 * in a var must not be able to silence the thing that reports silence.
 */
export function digestHour(env: Env): number {
  const raw = env.DIGEST_HOUR;
  if (typeof raw !== "string" || raw.trim() === "") return DIGEST_HOUR_UTC;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 23) {
    console.error(
      `factory digest: DIGEST_HOUR must be an hour 0-23; ignoring "${raw}" and using ` +
        `${DIGEST_HOUR_UTC}`
    );
    return DIGEST_HOUR_UTC;
  }
  return parsed;
}

/**
 * Sweeps whose last {@link SWEEP_FAILURE_STREAK} firings all refused.
 *
 * Pure. The streak is counted per declared sweep (`project` + `sweep`) rather
 * than per project, because two sweeps on one repository fail for unrelated
 * reasons and folding them together would report a healthy sweep as broken.
 *
 * The walk stops at the first firing that was not a refusal, which is what
 * makes recovery the release: one `ignited`, `queued` or `empty` morning ends
 * the streak, and the finding disappears the next day without anybody
 * acknowledging anything.
 */
export function assessSweeps(firings: SweepFiring[]): LoopFinding[] {
  const groups = new Map<string, SweepFiring[]>();
  for (const firing of firings) {
    const key = `${firing.project} ${firing.sweep}`;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [firing]);
    else group.push(firing);
  }

  const findings: LoopFinding[] = [];
  for (const group of groups.values()) {
    // Newest first, whatever order the rows arrived in: the streak is defined
    // by the clock, not by the query plan.
    const ordered = [...group].sort((a, b) => (a.fired_at < b.fired_at ? 1 : -1));
    let streak = 0;
    let oldest = "";
    for (const firing of ordered) {
      if (firing.outcome !== "refused") break;
      streak += 1;
      oldest = firing.fired_at;
    }
    if (streak < SWEEP_FAILURE_STREAK) continue;
    const newest = ordered[0]!;
    findings.push({
      loop: "sweep",
      subject: `${newest.project}/${newest.sweep}`,
      project: newest.project,
      measure: `${streak} firings in a row refused, most recently ${newest.fired_at}`,
      since: oldest,
      detail: sanitizeUntrustedLine(newest.detail, DETAIL_MAX_CHARS),
      command: `${SWEEP_RECORDS_PATH}?project=${newest.project}`,
    });
  }
  // Deterministic order, so two digests over the same evidence read the same.
  findings.sort((a, b) => (a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0));
  return findings;
}

/**
 * Claimed pull requests that have been in flight too long with no comment.
 *
 * Pure. A row with a `run_id` is the stale-supervisor case, and its command is
 * tick `acy`'s: `tk cloud supervisor` says whether the supervisor is alive,
 * which step it is on and whether it errored. A row WITHOUT one never reached
 * a dispatch at all, so there is no run to ask about and the honest report is
 * that the claim is stuck — every redelivery of that pull request is answered
 * as a duplicate, so it will not be reviewed until the row is dealt with.
 */
export function assessReviews(reviews: InFlightReview[], now: Date): LoopFinding[] {
  const cutoff = now.getTime() - REVIEW_STALE_HOURS * 3_600_000;
  const findings: LoopFinding[] = [];
  for (const review of reviews) {
    const claimed = Date.parse(review.claimed_at);
    // An unparseable timestamp is reported rather than skipped: it is itself a
    // broken record, and skipping it would hide the review it belongs to.
    if (Number.isFinite(claimed) && claimed > cutoff) continue;
    const hours = Number.isFinite(claimed)
      ? Math.floor((now.getTime() - claimed) / 3_600_000)
      : null;
    findings.push({
      loop: "pr_review",
      subject: `${review.project}#${review.pr_number}`,
      project: review.project,
      measure:
        (hours === null
          ? `claimed at an unreadable time (${sanitizeUntrustedLine(review.claimed_at, 60)})`
          : `${hours}h in flight`) + `, state ${sanitizeUntrustedLine(review.state, 40)}, no comment posted`,
      since: review.claimed_at,
      detail:
        review.run_id === null
          ? "no run was ever bound to this claim, so nothing is running and every redelivery is " +
            "answered as a duplicate: this pull request will not be reviewed until the row is released"
          : sanitizeUntrustedLine(review.detail ?? "", DETAIL_MAX_CHARS),
      command:
        review.run_id === null
          ? `nothing to inspect — there is no run; the stuck record is the pr_reviews row for ` +
            `${review.project}#${review.pr_number}`
          : `tk cloud supervisor ${sanitizeUntrustedLine(review.run_id, 80)}`,
    });
  }
  findings.sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : 0));
  return findings;
}

/**
 * Reviews that expired on the dispatch queue without ever running (tick 6tx).
 *
 * Pure. These are NOT the stale reviews above and must never be reported as
 * them: a stale review has a run to ask about (`tk cloud supervisor`), and an
 * expired one never had a run at all, so that command would answer about
 * nothing. Before this kind existed, an expired row was a `pr_reviews` row
 * with no comment and an old `claimed_at`, which is exactly the shape
 * {@link assessReviews} reports — so it would have been reported as a stalled
 * supervisor, naming a run id that never booted.
 *
 * The measure carries the one distinction the record keeps: whether the pull
 * request's author was told. An expiry that was announced is a factory working
 * as designed under load; an expiry that was not is a person waiting on
 * nothing, and the two get different words.
 */
export function assessExpiredReviews(reviews: ExpiredReview[], now: Date): LoopFinding[] {
  const cutoff = now.getTime() - REVIEW_EXPIRY_LOOKBACK_HOURS * 3_600_000;
  const findings: LoopFinding[] = [];
  for (const review of reviews) {
    const expired = Date.parse(review.expired_at);
    // An unreadable timestamp is reported rather than skipped, for
    // `assessReviews`' reason: it is itself a broken record.
    if (Number.isFinite(expired) && expired < cutoff) continue;
    const told = review.expiry_comment_id !== null && review.expiry_comment_id !== "";
    findings.push({
      loop: "pr_review_expired",
      subject: `${review.project}#${review.pr_number}`,
      project: review.project,
      measure: told
        ? "expired on the dispatch queue without running; the author was told on the pull request"
        : "expired on the dispatch queue without running, AND the notice never reached the pull " +
          "request — nobody outside this factory knows",
      since: review.expired_at,
      detail: sanitizeUntrustedLine(review.detail ?? "", DETAIL_MAX_CHARS),
      // There is no run to inspect: the whole point is that none was ever
      // started. What an operator can act on is the queue window against how
      // long this project's runs actually take.
      command:
        `no run exists to inspect — this review never started. RUN_QUEUE_TTL_MS is the window ` +
        `it waited in; compare it with how long ${review.project}'s epic runs hold the ` +
        `dispatch lease`,
    });
  }
  findings.sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : 0));
  return findings;
}

/**
 * Branches CI remediation refused because nothing recorded creating them
 * (tick t4y).
 *
 * Pure. This is the one finding that is a QUESTION rather than a broken loop,
 * and it is here for the reason tick `am2` named when it declined to build the
 * ownership record at all: a lost or missing record orphans a REAL factory
 * branch, so remediation refuses work it should do — and that refusal would
 * otherwise land in `dispatch_log` and nowhere else, "a trace you read once
 * you already suspect something".
 *
 * The refusal is the SAFE direction (acting on a person's branch is the worse
 * failure), which is exactly why it needs saying out loud: a fail-closed gate
 * whose refusals are invisible is indistinguishable from a loop that is
 * working. Both readings are put in front of the operator, because the factory
 * genuinely cannot tell them apart — that is what the record is for — and the
 * two answers are one call each.
 */
export function assessUnrecordedBranches(rows: UnrecordedBranch[]): LoopFinding[] {
  const findings = rows.map((row) => ({
    loop: "branch_record" as const,
    subject: `${row.project} ${row.branch}`,
    project: row.project,
    measure:
      `${row.refusals} refusal${row.refusals === 1 ? "" : "s"}, most recently ${row.last_seen_at}`,
    since: row.first_seen_at,
    detail:
      `${sanitizeUntrustedLine(row.check_name, DETAIL_MAX_CHARS)} is failing on ` +
      `${row.head_sha.slice(0, 12)} and nothing records who created ${row.branch}. Either the ` +
      "factory made it and the record was lost — remediation is refusing work it should do — or " +
      "a person named a branch the way the factory names its own, and refusing is correct.",
    command:
      `POST ${CI_BRANCHES_PATH} {"project":"${row.project}","branch":"${row.branch}",` +
      '"owner":"factory"} to let the loop work on it, or "owner":"human" to leave it alone ' +
      "for good; either answer ends this finding",
  }));
  // Deterministic order, so two digests over the same evidence read the same.
  findings.sort((a, b) => (a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0));
  return findings;
}

// --------------------------------------------------------------- the reads ---

/** Every sweep firing inside the lookback, newest first. */
export async function readSweepFirings(env: Env, now: Date): Promise<SweepFiring[]> {
  const since = new Date(now.getTime() - SWEEP_LOOKBACK_DAYS * 86_400_000).toISOString();
  const rows = await env.DB.prepare(
    `SELECT project, sweep, fired_at, outcome, detail
       FROM sweep_selection
      WHERE fired_at >= ?
      ORDER BY fired_at DESC
      LIMIT ?`
  )
    .bind(since, SWEEP_FIRING_LIMIT)
    .all<SweepFiring>();
  return rows.results ?? [];
}

/**
 * Every claimed pull request with no comment on it, oldest claim first.
 *
 * `comment_id IS NULL` is the whole filter, and it is deliberately the DURABLE
 * evidence rather than `state`: `state` is bookkeeping for a human reading the
 * table (`migrations/0010_pr_reviews.sql` says so in as many words), and a
 * watcher that trusted it would be reading the field the loop updates last.
 * The comment id is the thing a review run exists to produce.
 *
 * `expired_at IS NULL` is the second half of the filter and it is the same
 * argument (tick 6tx): a review that expired unrun also has no comment and an
 * old `claimed_at`, so without this it would arrive here and be reported as a
 * stalled supervisor — naming a run id that never booted. It is a settled
 * outcome with its own read and its own finding below.
 */
export async function readInFlightReviews(env: Env, now: Date): Promise<InFlightReview[]> {
  const cutoff = new Date(now.getTime() - REVIEW_STALE_HOURS * 3_600_000).toISOString();
  const rows = await env.DB.prepare(
    `SELECT project, pr_number, run_id, state, claimed_at, detail
       FROM pr_reviews
      WHERE comment_id IS NULL AND expired_at IS NULL AND claimed_at <= ?
      ORDER BY claimed_at ASC
      LIMIT ?`
  )
    .bind(cutoff, MAX_DIGEST_FINDINGS + 1)
    .all<InFlightReview>();
  return rows.results ?? [];
}

/**
 * Every review that expired unrun inside the lookback, most recent first.
 *
 * `expired_at IS NOT NULL` is the whole filter, and it is durable evidence for
 * the same reason `comment_id IS NULL` is above: `state` is bookkeeping, and
 * the timestamp is what the room's conditional UPDATE actually claimed.
 */
export async function readExpiredReviews(env: Env, now: Date): Promise<ExpiredReview[]> {
  const cutoff = new Date(
    now.getTime() - REVIEW_EXPIRY_LOOKBACK_HOURS * 3_600_000
  ).toISOString();
  const rows = await env.DB.prepare(
    `SELECT project, pr_number, run_id, claimed_at, expired_at, expiry_comment_id, detail
       FROM pr_reviews
      WHERE expired_at IS NOT NULL AND expired_at >= ?
      ORDER BY expired_at DESC
      LIMIT ?`
  )
    .bind(cutoff, MAX_DIGEST_FINDINGS + 1)
    .all<ExpiredReview>();
  return rows.results ?? [];
}

/**
 * Branch-ownership questions still unanswered, oldest first.
 *
 * The join that releases a finding lives in `branch-registry.ts`; this only
 * bounds how far back a refusal still counts as live. See
 * {@link UNRECORDED_BRANCH_ACTIVE_DAYS}.
 */
export async function readUnrecordedBranches(env: Env, now: Date): Promise<UnrecordedBranch[]> {
  const since = new Date(
    now.getTime() - UNRECORDED_BRANCH_ACTIVE_DAYS * 86_400_000
  ).toISOString();
  return listUnrecordedBranches(env, since, MAX_DIGEST_FINDINGS + 1);
}

/**
 * Everything the digest has to say today.
 *
 * The ORDER is a decision, not the order the kinds happened to be added in —
 * six ticks have now touched this path, and an order nobody stated is an order
 * the next tick appends to blindly. It groups by LOOP, so a reader scanning
 * one morning's message sees one subsystem at a time:
 *
 *  1. **sweeps** — the loop that produces work at all;
 *  2. **reviews**, stuck then expired — the two ways one loop fails, adjacent
 *     because an operator comparing them is deciding one thing (is my queue
 *     window too short, or did a run die?);
 *  3. **branches** — last, because it is the only kind that is a question for
 *     a person rather than a report about a loop, and it is the one an
 *     operator can settle without looking anything up.
 *
 * Each assessor already sorts within its own kind, so the whole message is
 * deterministic: two digests over the same evidence read identically.
 */
export async function collectFindings(env: Env, now: Date): Promise<LoopFinding[]> {
  const [firings, reviews, expired, unrecorded] = await Promise.all([
    readSweepFirings(env, now),
    readInFlightReviews(env, now),
    readExpiredReviews(env, now),
    readUnrecordedBranches(env, now),
  ]);
  return [
    ...assessSweeps(firings),
    ...assessReviews(reviews, now),
    ...assessExpiredReviews(expired, now),
    ...assessUnrecordedBranches(unrecorded),
  ];
}

// ------------------------------------------------------------- the message ---

/**
 * How each kind of finding names itself in the message.
 *
 * A table rather than a ternary, so adding a kind cannot silently inherit
 * another kind's label — which is how "expired unrun" would have arrived
 * reading as an ordinary stalled "review" (tick 6tx). Typed
 * `Record<LoopFinding["loop"], string>`, so the compiler, not a reviewer, is
 * what makes a new kind declare its own word: tick t4y's `branch_record` was
 * added here because tsc refused the file until it was.
 *
 * The labels are what a person scans, so they are what the finding IS rather
 * than which module produced it — "branch", not "branch record".
 */
const LOOP_LABELS: Record<LoopFinding["loop"], string> = {
  sweep: "sweep",
  pr_review: "review",
  pr_review_expired: "review never ran",
  branch_record: "branch",
};

/**
 * What the person reads.
 *
 * Plain text: `sendTelegramReport` escapes what it is given, and every line
 * that came from a repository has already been through
 * `sanitizeUntrustedLine` at the point it entered a finding.
 *
 * The last paragraph states the cadence on purpose. A reader who does not know
 * that silence means "nothing to report" cannot tell it from "the watcher is
 * broken", and that is the exact confusion this whole tick is about.
 */
export function renderDigest(findings: LoopFinding[], day: string): string {
  const shown = findings.slice(0, MAX_DIGEST_FINDINGS);
  const lines = [
    `The factory's unattended loops have ${findings.length} problem${
      findings.length === 1 ? "" : "s"
    } to report (${day}).`,
    "",
  ];
  for (const finding of shown) {
    lines.push(
      `${LOOP_LABELS[finding.loop]}: ${finding.subject}`,
      `  ${finding.measure}`,
      `  since ${finding.since}`,
      ...(finding.detail === "" ? [] : [`  ${finding.detail}`]),
      `  run: ${finding.command}`,
      ""
    );
  }
  if (findings.length > shown.length) {
    lines.push(`and ${findings.length - shown.length} more, not listed here.`, "");
  }
  lines.push(
    "This is a daily digest, not an alert: it is sent only on the days it has something to " +
      "say, and a problem is repeated every day until it is dealt with — a loop that works " +
      "again, or a question answered. An expired review is the one exception: it is settled, " +
      "so it is reported once and ages out. Nothing here was retried and nothing was " +
      "escalated. A sweep that refuses, a review that never comments, a review that never " +
      "ran and a branch the factory will not touch all stop quietly, which is why this " +
      "message exists."
  );
  return lines.join("\n");
}

/** The sentence a quiet day's row carries, so the record says why it sent nothing. */
export const QUIET_DETAIL =
  "every sweep, every claimed pull request and every branch the factory was asked about was " +
  "healthy; no message was sent, because a daily all-clear is a message people learn to skip";

// ---------------------------------------------------------------- the pass ---

export type DigestOutcome =
  /** This trigger is not the digest's hour. */
  | { state: "not_due"; detail: string }
  /** Today's digest was already built by an earlier invocation. */
  | { state: "already_built"; detail: string }
  /** Nothing to say. The row was written; no message was sent. */
  | { state: "quiet"; detail: string }
  | { state: "sent"; findings: LoopFinding[]; report: string }
  /** Built, but the channel would not take it. The row keeps it. */
  | { state: "undeliverable"; findings: LoopFinding[]; detail: string };

/**
 * One digest pass. Called from `scheduled`; never throws.
 *
 * The order is the argument, and it is `ci-fault.ts`'s: the row is written
 * BEFORE the message, because the row is the digest and the message is only
 * its delivery. The row is also the claim — `INSERT OR IGNORE` on the day's
 * primary key, so a cron trigger that fires twice for the same hour cannot
 * send two messages.
 *
 * A digest that could not be delivered is NOT retried inside the day. The
 * conditions it reports on are still true tomorrow (that is what makes them
 * worth reporting), so a failed delivery costs a day of latency rather than a
 * finding, and retrying it would risk the double message the claim exists to
 * prevent.
 */
export async function runDailyDigest(env: Env, at: Date): Promise<DigestOutcome> {
  const hour = digestHour(env);
  if (at.getUTCHours() !== hour) {
    return {
      state: "not_due",
      detail: `the digest is built at ${String(hour).padStart(2, "0")}:00 UTC`,
    };
  }

  const day = digestDay(at);
  let findings: LoopFinding[];
  try {
    findings = await collectFindings(env, at);
  } catch (error) {
    // The watcher's own failure. There is nothing durable to write it to that
    // is not the database which just refused, so it is logged — and logged
    // rather than swallowed, because a silent watcher is the failure this
    // module was written about.
    console.error(`factory digest: ${day} could not be built: ${String(error)}`);
    return { state: "undeliverable", findings: [], detail: `could not be built: ${String(error)}` };
  }

  const report = findings.length === 0 ? QUIET_DETAIL : renderDigest(findings, day);
  let claimed = false;
  try {
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO loop_digest (digest_date, built_at, findings, detail, sent_at)
       VALUES (?, ?, ?, ?, NULL)`
    )
      .bind(day, at.toISOString(), findings.length, report)
      .run();
    claimed = (result.meta.changes ?? 0) > 0;
  } catch (error) {
    console.error(`factory digest: ${day} could not be claimed: ${String(error)}`);
    return { state: "undeliverable", findings, detail: `could not be claimed: ${String(error)}` };
  }
  if (!claimed) {
    return { state: "already_built", detail: `the digest for ${day} was already built` };
  }

  if (findings.length === 0) return { state: "quiet", detail: QUIET_DETAIL };

  try {
    await sendTelegramReport(env, report);
  } catch (error) {
    console.error(
      `factory digest: ${day} found ${findings.length} problem(s) but could not be delivered: ` +
        String(error)
    );
    return {
      state: "undeliverable",
      findings,
      detail: `could not be delivered: ${String(error)}`,
    };
  }
  try {
    await env.DB.prepare(`UPDATE loop_digest SET sent_at = ? WHERE digest_date = ?`)
      .bind(at.toISOString(), day)
      .run();
  } catch (error) {
    // The message went; only the bookkeeping failed. Said, never silent: the
    // row now understates what happened, and an operator reading it must not
    // conclude the digest was lost.
    console.error(`factory digest: ${day} was delivered but not marked sent: ${String(error)}`);
  }
  return { state: "sent", findings, report };
}
