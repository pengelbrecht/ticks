/**
 * What happens when a parked submission's window closes without it ever
 * running (tick 6tx).
 *
 * ## The defect this closes is the silence, not the queueing
 *
 * A PR review is submitted with `queue: true` (`pr-review.ts`), so a review
 * arriving while an epic run holds the project's dispatch lease parks behind
 * it rather than bouncing (D22). The lease is D4 working exactly as designed
 * and an epic run genuinely outranks a review, so the queueing is not the bug.
 *
 * What the queue did next was: `DELETE FROM queued_submission`. Phase 2
 * measured container waves at 60-90 minutes and `RUN_QUEUE_TTL_MS` defaults to
 * 30, so for a repository that runs epics this is not an edge case — a review
 * submitted during a wave expires unrun as the ORDINARY outcome, and the pull
 * request's author saw nothing whatsoever. No review, and no reason.
 *
 * That is the collapse `.tick/learnings.md` rules out in as many words: *never
 * collapse distinct failure classes into one message*. From outside a pull
 * request, "no review because nothing was wrong", "no review because the
 * factory is broken" and "no review because somebody else's run held the one
 * slot for half an hour" were the same observation — nothing.
 *
 * So the room now hands its expired rows here, and this module says so, in the
 * one place the person who is waiting is actually looking: on the pull request.
 *
 * ## Why the announcement lives here and not in the room
 *
 * `run-room.ts` is a Durable Object that arbitrates a lease. It has no
 * business knowing what a pull request is, and `pr-review.ts` has no business
 * knowing about queue rows. This module is the seam, and it is also where the
 * decision "which expired submissions are worth telling somebody about" is
 * written down rather than being implied by an import.
 *
 * ## Best effort, and loudly so
 *
 * Nothing here may fail a release or an alarm: the room's job is the lease,
 * and a GitHub outage must not wedge a project. Every failure is therefore
 * caught — but caught and REPORTED, never swallowed, and the durable record
 * keeps the difference. A row with `expired_at` and no `expiry_comment_id` is
 * an expiry whose author was never told, and the daily digest (tick zaw)
 * reports exactly that as a finding of its own.
 */

import {
  claimReviewExpiry,
  getReviewForRun,
  recordExpiryComment,
  renderExpiredReviewComment,
  reviewCommenter,
} from "./pr-review";

import type { Env } from "./index";
import type { QueuedSubmission } from "./run-room";

/** What became of one expired submission. Returned so a caller (and a test) can assert it. */
export type QueueExpiryOutcome =
  /** A review: the author was told, and the comment id is the evidence. */
  | { state: "announced"; run_id: string; project: string; pr_number: number; comment_id: string }
  /** A review whose expiry another caller had already claimed. Nothing was sent twice. */
  | { state: "already_announced"; run_id: string; detail: string }
  /** A review that expired and could not be commented on. The row says so; the digest reports it. */
  | { state: "undeliverable"; run_id: string; detail: string }
  /**
   * Not a review — an ordinary epic submission. It has no pull request to
   * speak on, so this is logged and left to `status` and the operator channel.
   * Named rather than folded into a silent skip, for this module's own reason.
   */
  | { state: "not_a_review"; run_id: string; detail: string };

/**
 * Tells whoever was waiting that a parked submission's window closed unrun.
 *
 * Never throws. One expired submission's failure never stops the next one
 * being announced — a batch is exactly where a single bad row would otherwise
 * take the rest of the batch's news with it.
 */
export async function announceQueueExpiry(
  env: Env,
  expired: QueuedSubmission[]
): Promise<QueueExpiryOutcome[]> {
  const outcomes: QueueExpiryOutcome[] = [];
  for (const submission of expired) {
    try {
      outcomes.push(await announceOne(env, submission));
    } catch (error) {
      const detail = `${submission.run_id} expired unrun and could not be announced: ${String(error)}`;
      console.error(`factory queue expiry: ${detail}`);
      outcomes.push({ state: "undeliverable", run_id: submission.run_id, detail });
    }
  }
  return outcomes;
}

/**
 * One expired submission.
 *
 * The order is the argument, and it is `postReviewFindings`'s:
 *
 *  1. **The row decides which pull request this may speak on.** Keyed by the
 *     run id the ROOM recorded, never by anything the submission carried — the
 *     same rule that stops a container naming a pull request also stops a
 *     queue row naming one.
 *  2. **The expiry is claimed before the comment is sent**, by a conditional
 *     UPDATE. At-most-once, so an alarm that fires twice, or a release racing
 *     an alarm, cannot each comment.
 *  3. **The comment is composed by the factory** from structural fields. There
 *     is no untrusted half: no run started, so no model wrote anything.
 */
async function announceOne(env: Env, submission: QueuedSubmission): Promise<QueueExpiryOutcome> {
  const target = await getReviewForRun(env.DB, submission.run_id);
  if (target === null) {
    const detail =
      `queued run ${submission.run_id} (epic ${submission.epic}, project ${submission.project}) ` +
      `expired unrun after waiting behind run ${submission.blocked_by}; it is not a pull request ` +
      "review, so there is nobody on a pull request to tell";
    console.error(`factory queue expiry: ${detail}`);
    return { state: "not_a_review", run_id: submission.run_id, detail };
  }

  const detail =
    `${target.project}#${target.pr_number} was never reviewed: run ${submission.run_id} parked ` +
    `behind run ${submission.blocked_by} at ${submission.queued_at} and its queue window closed ` +
    `at ${submission.expires_at} without the project's dispatch lease ever freeing`;

  const claimed = await claimReviewExpiry(
    env.DB,
    submission.run_id,
    detail,
    new Date().toISOString()
  );
  if (!claimed) {
    const already =
      `${submission.run_id}'s expiry was already recorded (state ${target.state}); no second ` +
      "notice was posted";
    return { state: "already_announced", run_id: submission.run_id, detail: already };
  }

  const body = renderExpiredReviewComment({
    project: target.project,
    pr_number: target.pr_number,
    head_sha: target.head_sha,
    run_id: submission.run_id,
    blocked_by: submission.blocked_by,
    queued_at: submission.queued_at,
    expires_at: submission.expires_at,
  });

  let posted: { id: string };
  try {
    posted = await reviewCommenter(env).comment(target.project, target.pr_number, body);
  } catch (error) {
    // The claim is NOT given back. The expiry is a fact and the row now
    // records it; what failed is the telling, and `expiry_comment_id` staying
    // NULL is how that stays distinguishable from an author who was told.
    const failure =
      `${target.project}#${target.pr_number} expired unrun and the notice could not be posted: ` +
      String(error);
    console.error(`factory queue expiry: ${failure}`);
    return { state: "undeliverable", run_id: submission.run_id, detail: failure };
  }

  await recordExpiryComment(env.DB, submission.run_id, posted.id);
  return {
    state: "announced",
    run_id: submission.run_id,
    project: target.project,
    pr_number: target.pr_number,
    comment_id: posted.id,
  };
}
