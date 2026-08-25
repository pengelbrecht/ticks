import { env, runDurableObjectAlarm } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  FACTORY_LINE_PREFIX,
  REVIEW_EXPIRY_HEADING,
  claimReviewExpiry,
  getReviewByNode,
  recordReviewComment,
  renderExpiredReviewComment,
  type ReviewCommenter,
} from "../src/pr-review";
import { announceQueueExpiry } from "../src/queue-expiry";
import {
  MAX_DIGEST_FINDINGS,
  REVIEW_EXPIRY_LOOKBACK_HOURS,
  assessExpiredReviews,
  collectFindings,
  renderDigest,
  type ExpiredReview,
} from "../src/loop-digest";
import { MIN_QUEUE_TTL_MS } from "../src/runs";
import type { QueuedSubmission, RunRoom } from "../src/run-room";

/**
 * A review that never runs says so, and says why (tick 6tx).
 *
 * The defect this file pins is **the silence**, not the queueing. A PR review
 * is submitted with `queue: true`, so it parks behind a live dispatch lease
 * (D22) — which is D4 working as designed, and an epic run genuinely outranks
 * a review. But Phase 2 measured container waves at 60-90 minutes and
 * `RUN_QUEUE_TTL_MS` defaults to 30, so a review submitted during a wave
 * expiring unrun is the ORDINARY case. Before this tick the room deleted the
 * parked row and nothing else happened at all: from the pull request, "no
 * review because nothing was wrong" and "no review because somebody else held
 * the one slot" were the same observation — nothing.
 *
 * Five properties, and each is a distinct outcome kept distinct
 * (`.tick/learnings.md`: never collapse distinct failure classes into one):
 *
 *  1. **An expired review comments, and the comment says why.** It names the
 *     run that held the lease, says no review happened, and says nothing will
 *     retry it. The end-to-end case drives it through the real DO alarm.
 *  2. **At most once.** Two alarms, or an alarm racing a release, cannot post
 *     two notices — the same conditional-UPDATE claim `posted_at` uses.
 *  3. **A notice that could not be sent is still recorded, and differs.**
 *     `expired_at` set with `expiry_comment_id` NULL is "expired and NOBODY
 *     was told", which the digest reports in those words.
 *  4. **An expired review is not a stalled one.** The digest must not offer
 *     `tk cloud supervisor <run-id>` for a run that never booted.
 *  5. **A review that actually commented is never called expired**, and a
 *     queued run that is not a review comments nowhere.
 *
 * Real workerd, the real D1 schema from migrations/, the real Durable Object.
 * The one substitution is GitHub's comment API — the same seam
 * `pr-review.test.ts` uses, and for the same reason.
 */

const saved: Record<string, unknown> = {};

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
  else (env as unknown as Record<string, unknown>)[name] = value;
}

/** GitHub's comment API, in memory. Records exactly what was sent. */
class FakeCommenter implements ReviewCommenter {
  readonly posted: { project: string; number: number; body: string }[] = [];
  next = 1;
  fail: string | null = null;

  async comment(project: string, number: number, body: string): Promise<{ id: string }> {
    if (this.fail !== null) throw new Error(this.fail);
    this.posted.push({ project, number, body });
    return { id: `xc${this.next++}` };
  }
}

let commenter: FakeCommenter;
let counter = 0;

beforeEach(async () => {
  commenter = new FakeCommenter();
  set("REVIEW_COMMENTER", commenter);
  await env.DB.prepare("DELETE FROM pr_reviews").run();
  await env.DB.prepare("DELETE FROM sweep_selection").run();
});

afterEach(async () => {
  await env.DB.prepare("DELETE FROM pr_reviews").run();
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
    else (env as unknown as Record<string, unknown>)[name] = value;
  }
});

/** A pull request already claimed and bound to the run that would have reviewed it. */
async function boundReview(options: {
  project: string;
  number: number;
  runID: string;
  state?: string;
}): Promise<string> {
  const nodeID = `PR_kwDO_${options.project}_${options.number}`;
  await env.DB.prepare(
    `INSERT INTO pr_reviews
       (pr_node_id, project, pr_number, head_sha, base_sha, run_id, state, detail, posted_at,
        comment_id, claimed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`
  )
    .bind(
      nodeID,
      options.project,
      options.number,
      "d".repeat(40),
      "e".repeat(40),
      options.runID,
      options.state ?? "queued",
      `${options.project}#${options.number} is queued behind run run_epic`,
      new Date().toISOString()
    )
    .run();
  return nodeID;
}

/** The shape the room hands over when a window closes. */
function expiredSubmission(overrides: Partial<QueuedSubmission> = {}): QueuedSubmission {
  counter += 1;
  return {
    run_id: `run_review_${counter}`,
    project: "acme/mill",
    epic: "pr-41",
    base_sha: "e".repeat(40),
    requested_by: "github-pr:contributor",
    blocked_by: "run_epic_holding_the_lease",
    queued_at: "2026-08-24T09:00:00.000Z",
    expires_at: "2026-08-24T09:30:00.000Z",
    ...overrides,
  };
}

// ------------------------------------------------------------------------
describe("a review that expired unrun says so, on the pull request", () => {
  it("comments, names the run that held the lease, and records the notice", async () => {
    const submission = expiredSubmission({ project: "acme/mill", epic: "pr-41" });
    await boundReview({ project: "acme/mill", number: 41, runID: submission.run_id });

    const outcomes = await announceQueueExpiry(env, [submission]);

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      state: "announced",
      run_id: submission.run_id,
      project: "acme/mill",
      pr_number: 41,
    });
    expect(commenter.posted).toHaveLength(1);
    const posted = commenter.posted[0]!;
    expect(posted.project).toBe("acme/mill");
    expect(posted.number).toBe(41);
    // The three things a reader has to be told, in the comment itself.
    expect(posted.body).toContain("No automated review was posted");
    expect(posted.body).toContain("not a clean bill of health");
    expect(posted.body).toContain("run_epic_holding_the_lease");
    expect(posted.body).toContain("Nothing will retry it automatically");

    // The record keeps the two halves apart: the review never happened, so
    // `comment_id` — the evidence a review run did its job — stays NULL.
    const row = await getReviewByNode(env.DB, `PR_kwDO_acme/mill_41`);
    expect(row).toMatchObject({ state: "expired", comment_id: null });
    expect(row!.expired_at).not.toBeNull();
    expect(row!.expiry_comment_id).toBe("xc1");
    expect(row!.detail).toContain("was never reviewed");
    expect(row!.detail).toContain("run_epic_holding_the_lease");
  });

  it("writes every line itself — an expiry notice has no untrusted half", () => {
    const body = renderExpiredReviewComment({
      project: "acme/mill",
      pr_number: 7,
      head_sha: "f".repeat(40),
      run_id: "run_review",
      blocked_by: "run_epic",
      queued_at: "2026-08-24T09:00:00.000Z",
      expires_at: "2026-08-24T09:30:00.000Z",
    });

    expect(body.startsWith(REVIEW_EXPIRY_HEADING)).toBe(true);
    // No run started, so no model wrote anything: every line is the factory's.
    for (const line of body.split("\n")) {
      expect(line.startsWith(FACTORY_LINE_PREFIX)).toBe(true);
    }
  });

  it("posts one notice however many times the expiry is announced", async () => {
    const submission = expiredSubmission({ project: "acme/twice", epic: "pr-12" });
    await boundReview({ project: "acme/twice", number: 12, runID: submission.run_id });

    const first = await announceQueueExpiry(env, [submission]);
    const second = await announceQueueExpiry(env, [submission]);

    expect(first[0]).toMatchObject({ state: "announced" });
    expect(second[0]).toMatchObject({ state: "already_announced" });
    expect(commenter.posted).toHaveLength(1);
  });

  it("never calls a review expired once it has actually commented", async () => {
    const submission = expiredSubmission({ project: "acme/done", epic: "pr-3" });
    await boundReview({ project: "acme/done", number: 3, runID: submission.run_id });
    await recordReviewComment(env.DB, submission.run_id, "c99");

    const outcomes = await announceQueueExpiry(env, [submission]);

    expect(outcomes[0]).toMatchObject({ state: "already_announced" });
    expect(commenter.posted).toHaveLength(0);
    const row = await getReviewByNode(env.DB, `PR_kwDO_acme/done_3`);
    expect(row).toMatchObject({ state: "reviewed", comment_id: "c99" });
    expect(row!.expired_at ?? null).toBeNull();
  });

  it("records the expiry even when the notice cannot be posted, and says which", async () => {
    const submission = expiredSubmission({ project: "acme/offline", epic: "pr-8" });
    await boundReview({ project: "acme/offline", number: 8, runID: submission.run_id });
    commenter.fail = "GitHub answered HTTP 502";

    const outcomes = await announceQueueExpiry(env, [submission]);

    expect(outcomes[0]).toMatchObject({ state: "undeliverable" });
    // The expiry is a fact and the row keeps it; the telling is what failed,
    // and the NULL comment id is how the digest tells the two apart.
    const row = await getReviewByNode(env.DB, `PR_kwDO_acme/offline_8`);
    expect(row!.expired_at).not.toBeNull();
    expect(row!.expiry_comment_id ?? null).toBeNull();
  });

  it("comments nowhere for a queued run that is not a review", async () => {
    const outcomes = await announceQueueExpiry(env, [
      expiredSubmission({ project: "acme/epic", epic: "afj" }),
    ]);

    expect(outcomes[0]).toMatchObject({ state: "not_a_review" });
    expect(commenter.posted).toHaveLength(0);
  });

  it("announces the rest of a batch when one entry fails", async () => {
    const good = expiredSubmission({ project: "acme/batch", epic: "pr-21" });
    await boundReview({ project: "acme/batch", number: 21, runID: good.run_id });

    const outcomes = await announceQueueExpiry(env, [
      expiredSubmission({ project: "acme/batch", epic: "afj" }),
      good,
    ]);

    expect(outcomes.map((o) => o.state)).toEqual(["not_a_review", "announced"]);
    expect(commenter.posted).toHaveLength(1);
  });
});

// ------------------------------------------------------------------------
// The end-to-end case: the room's alarm is the wake a parked review actually
// dies on, so that is where the comment has to come from.
describe("the room announces what its queue drops", () => {
  it("comments on the pull request when the alarm expires a parked review", async () => {
    const project = "acme/alarm-expiry";
    const runID = "run_review_alarm";
    await boundReview({ project, number: 55, runID });

    const stub = env.RUN_ROOMS.get(env.RUN_ROOMS.idFromName(project));
    // A live lease, exactly as an epic run leaves one — this is what the
    // review is parked behind.
    const held = await stub.acquireDispatchLease({ run_id: "run_epic", epic: "afj" });
    expect(held.ok).toBe(true);
    const parked = await stub.queueSubmission({
      run_id: runID,
      project,
      epic: "pr-55",
      base_sha: "e".repeat(40),
      requested_by: "github-pr:contributor",
      blocked_by: "run_epic",
      ttl_ms: MIN_QUEUE_TTL_MS,
    });
    expect(parked.ok).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, MIN_QUEUE_TTL_MS + 60));
    await runDurableObjectAlarm(stub as unknown as DurableObjectStub<RunRoom>);

    // The row is gone from the queue AND the author has been told why.
    await expect(stub.listQueuedSubmissions()).resolves.toEqual([]);
    expect(commenter.posted).toHaveLength(1);
    expect(commenter.posted[0]!.number).toBe(55);
    expect(commenter.posted[0]!.body).toContain("run_epic");
    const row = await getReviewByNode(env.DB, `PR_kwDO_${project}_55`);
    expect(row).toMatchObject({ state: "expired" });
    expect(row!.expiry_comment_id).not.toBeNull();
  });
});

// ------------------------------------------------------------------------
// The digest half (tick zaw's channel, this tick's new outcome).
describe("the digest tells an expired review from a stalled one", () => {
  const NOW = new Date("2026-08-24T07:00:00.000Z");

  function expiredRow(overrides: Partial<ExpiredReview> = {}): ExpiredReview {
    return {
      project: "acme/mill",
      pr_number: 41,
      run_id: "run_review",
      claimed_at: "2026-08-24T05:00:00.000Z",
      expired_at: "2026-08-24T05:30:00.000Z",
      expiry_comment_id: "xc1",
      detail: "acme/mill#41 was never reviewed: run run_review parked behind run run_epic",
      ...overrides,
    };
  }

  it("never offers a supervisor command for a run that never booted", () => {
    const findings = assessExpiredReviews([expiredRow()], NOW);

    expect(findings).toHaveLength(1);
    expect(findings[0]!.loop).toBe("pr_review_expired");
    expect(findings[0]!.command).not.toContain("tk cloud supervisor");
    expect(findings[0]!.measure).toContain("expired on the dispatch queue");
    expect(findings[0]!.measure).toContain("the author was told");
  });

  it("says so in different words when the author was never told", () => {
    const findings = assessExpiredReviews([expiredRow({ expiry_comment_id: null })], NOW);

    expect(findings[0]!.measure).toContain("never reached the pull request");
    expect(findings[0]!.measure).toContain("nobody outside this factory knows");
  });

  it("stops reporting an expiry once it is no longer news", () => {
    const stale = expiredRow({
      expired_at: new Date(
        NOW.getTime() - (REVIEW_EXPIRY_LOOKBACK_HOURS + 1) * 3_600_000
      ).toISOString(),
    });

    expect(assessExpiredReviews([stale], NOW)).toEqual([]);
  });

  it("labels it as a review that never ran, not as a review", () => {
    const report = renderDigest(assessExpiredReviews([expiredRow()], NOW), "2026-08-24");

    expect(report).toContain("review never ran: acme/mill#41");
  });

  it("reads an expired row as expired rather than as a stalled supervisor", async () => {
    await boundReview({ project: "acme/collect", number: 9, runID: "run_review_collect" });
    // Claimed two days ago, so the stale-review rule would otherwise fire.
    await env.DB.prepare("UPDATE pr_reviews SET claimed_at = ? WHERE run_id = ?")
      .bind(new Date(NOW.getTime() - 48 * 3_600_000).toISOString(), "run_review_collect")
      .run();
    await claimReviewExpiry(
      env.DB,
      "run_review_collect",
      "acme/collect#9 was never reviewed: it parked behind run run_epic",
      new Date(NOW.getTime() - 3_600_000).toISOString()
    );

    const findings = await collectFindings(env, NOW);

    const mine = findings.filter((f) => f.subject === "acme/collect#9");
    expect(mine).toHaveLength(1);
    expect(mine[0]!.loop).toBe("pr_review_expired");
    expect(findings.length).toBeLessThanOrEqual(MAX_DIGEST_FINDINGS + 1);
  });
});
