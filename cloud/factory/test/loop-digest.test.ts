import { SELF, createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import worker, { type Env } from "../src/index";
import { deriveTokenHash, mintFactoryToken } from "../src/auth";
import { insertSweepSelection } from "../src/db";
import {
  MAX_DIGEST_FINDINGS,
  QUIET_DETAIL,
  REVIEW_STALE_HOURS,
  SWEEP_FAILURE_STREAK,
  SWEEP_RECORDS_PATH,
  UNRECORDED_BRANCH_ACTIVE_DAYS,
  assessExpiredReviews,
  assessReviews,
  assessSweeps,
  assessUnrecordedBranches,
  digestHour,
  renderDigest,
  runDailyDigest,
} from "../src/loop-digest";
import {
  CI_BRANCHES_PATH,
  noteUnrecordedBranch,
  recordBranch,
} from "../src/branch-registry";

/**
 * The daily loop digest (Phase 4 review, tick zaw).
 *
 * The acceptance criterion is one sentence — *either sweeps and PR review
 * reach a human when they fail repeatedly, or pull-only discovery is
 * documented as deliberate* — and this file holds the first half of that
 * choice to five properties:
 *
 *  1. **A loop failing repeatedly reaches a person.** A sweep that refused
 *     three mornings running, and a review run dispatched a day ago that never
 *     commented, both arrive as one message on the operator channel naming the
 *     command to run next.
 *  2. **A loop failing ONCE does not.** Two refusals is not news; a review
 *     claimed an hour ago is not news. The whole risk of this feature is the
 *     cry-wolf failure, and a threshold nobody tests is a threshold that drifts.
 *  3. **Recovery is the release, and it is evidence rather than a clock.** One
 *     firing that did not refuse ends the streak. Nothing here is released by
 *     time passing — tick `uls`'s rule — and nothing needs acknowledging.
 *  4. **A quiet day is silent, and still leaves a record.** No all-clear
 *     message (a daily "all fine" is a message people learn to skip), but a
 *     `loop_digest` row, so "nothing to report" is distinguishable from "the
 *     watcher never ran". That distinction IS this tick.
 *  5. **At most one message per day.** Cloudflare may fire a cron trigger more
 *     than once for a minute; the day is the claim.
 *
 * Everything runs against real workerd with the real bindings and the real D1
 * schema from migrations/. The only fake is the Telegram Bot API on
 * `globalThis.fetch`, which is how every other channel test in this bundle
 * captures what the operator would have been sent.
 */

const OPERATOR = "424242";
const CHAT = "919191";

let operatorToken: string;
let operatorTokenHash: string;
const saved: Record<string, unknown> = {};

beforeAll(async () => {
  operatorToken = mintFactoryToken();
  operatorTokenHash = await deriveTokenHash(operatorToken);
});

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}

type BotCall = { method: string; body: Record<string, unknown> };
let bot: { calls: BotCall[]; restore: () => void; fail: boolean } | null = null;

/** A fake Bot API on the global fetch, capturing what the operator is told. */
function fakeBotAPI(): void {
  const calls: BotCall[] = [];
  const original = globalThis.fetch;
  let messageID = 8000;
  const state = { calls, restore: () => void (globalThis.fetch = original), fail: false };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://telegram.test/")) return original(input as RequestInfo, init);
    const method = url.slice(url.lastIndexOf("/") + 1);
    const body =
      init?.body === undefined ? {} : (JSON.parse(String(init.body)) as Record<string, unknown>);
    calls.push({ method, body });
    if (state.fail) return Response.json({ ok: false, description: "chat not found" }, { status: 400 });
    messageID += 1;
    return Response.json({
      ok: true,
      result: method === "sendMessage" ? { message_id: messageID } : true,
    });
  }) as typeof fetch;
  bot = state;
}

const sent = (): BotCall[] => (bot?.calls ?? []).filter((c) => c.method === "sendMessage");
const messageText = (call: BotCall): string => String(call.body.text ?? "");

beforeEach(async () => {
  set("TELEGRAM_BOT_TOKEN", "test-bot-token");
  set("TELEGRAM_USER_ID", OPERATOR);
  set("TELEGRAM_CHAT_ID", CHAT);
  set("TELEGRAM_API_BASE_URL", "https://telegram.test");
  set("FACTORY_TOKEN_HASH", operatorTokenHash);
  set("DIGEST_HOUR", undefined);
  fakeBotAPI();
  // The digest asks a question OF THE WHOLE DATABASE, so one test's evidence
  // is another test's finding unless the tables start empty. Explicit rather
  // than relying on the pool's storage isolation: the property under test is
  // "was there anything to say", and it must be answered about this test only.
  await env.DB.prepare("DELETE FROM sweep_selection").run();
  await env.DB.prepare("DELETE FROM pr_reviews").run();
  await env.DB.prepare("DELETE FROM loop_digest").run();
  await env.DB.prepare("DELETE FROM unrecorded_branch").run();
  await env.DB.prepare("DELETE FROM factory_branch").run();
});

afterEach(() => {
  bot?.restore();
  bot = null;
  for (const [name, value] of Object.entries(saved)) {
    (env as unknown as Record<string, unknown>)[name] = value;
  }
});

/** 07:00 UTC on the given day: the hour the digest is built at. */
function morning(day: string): Date {
  return new Date(`${day}T07:00:00.000Z`);
}

/** One sweep firing in the record, `daysAgo` before the digest's morning. */
async function firing(options: {
  project: string;
  sweep: string;
  at: Date;
  outcome: "ignited" | "queued" | "empty" | "refused";
  detail?: string;
}): Promise<void> {
  const fired = options.at.toISOString();
  await insertSweepSelection(env.DB, {
    sweep_id: `sw_${fired}_${options.project.replace(/[^A-Za-z0-9]+/g, "-")}_${options.sweep}`,
    project: options.project,
    sweep: options.sweep,
    cron: "0 4 * * *",
    fired_at: fired,
    base_sha: "a".repeat(40),
    outcome: options.outcome,
    run_id: options.outcome === "ignited" ? `run_${fired}` : null,
    detail: options.detail ?? `${options.outcome} at ${fired}`,
    record: "null",
  });
}

/** A claimed pull request with no comment on it. */
async function claimedReview(options: {
  project: string;
  number: number;
  claimedAt: Date;
  runID: string | null;
  state: string;
}): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO pr_reviews
       (pr_node_id, project, pr_number, head_sha, base_sha, run_id, state, detail, posted_at,
        comment_id, claimed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`
  )
    .bind(
      `PR_${options.project}_${options.number}`,
      options.project,
      options.number,
      "b".repeat(40),
      "c".repeat(40),
      options.runID,
      options.state,
      `${options.project}#${options.number} is being reviewed`,
      options.claimedAt.toISOString()
    )
    .run();
}

function hoursBefore(at: Date, hours: number): Date {
  return new Date(at.getTime() - hours * 3_600_000);
}

async function digestRow(day: string): Promise<{
  digest_date: string;
  findings: number;
  detail: string;
  sent_at: string | null;
} | null> {
  return await env.DB.prepare("SELECT * FROM loop_digest WHERE digest_date = ?")
    .bind(day)
    .first();
}

// ------------------------------------------------------------------------
describe("a loop that fails repeatedly reaches a person", () => {
  it("reports a sweep that refused three mornings running, with what to run", async () => {
    const at = morning("2026-05-04");
    for (let day = 1; day <= SWEEP_FAILURE_STREAK; day += 1) {
      await firing({
        project: "acme/mill",
        sweep: "morning-bugs",
        at: hoursBefore(at, 24 * day),
        outcome: "refused",
        detail: "the sweep policy of acme/mill could not be read: unterminated table header",
      });
    }

    const outcome = await runDailyDigest(env, at);

    expect(outcome.state).toBe("sent");
    expect(sent()).toHaveLength(1);
    const text = messageText(sent()[0]!);
    expect(text).toContain("acme/mill/morning-bugs");
    expect(text).toContain("3 firings in a row refused");
    expect(text).toContain("unterminated table header");
    // The command is the half that makes the message actionable.
    expect(text).toContain(`${SWEEP_RECORDS_PATH}?project=acme/mill`);
    const row = await digestRow("2026-05-04");
    expect(row?.findings).toBe(1);
    expect(row?.sent_at).not.toBeNull();
  });

  it("reports a review run that was dispatched and never commented", async () => {
    const at = morning("2026-05-05");
    await claimedReview({
      project: "acme/mill",
      number: 41,
      claimedAt: hoursBefore(at, REVIEW_STALE_HOURS + 6),
      runID: "run_stalled",
      state: "dispatched",
    });

    const outcome = await runDailyDigest(env, at);

    expect(outcome.state).toBe("sent");
    const text = messageText(sent()[0]!);
    expect(text).toContain("acme/mill#41");
    expect(text).toContain("30h in flight");
    // Tick acy's command, which answers exactly this question on demand. The
    // whole gap was that nothing asked it unprompted.
    expect(text).toContain("tk cloud supervisor run_stalled");
  });

  it("reports a claim that never reached a run, and says nothing will retry it", async () => {
    const at = morning("2026-05-06");
    await claimedReview({
      project: "acme/mill",
      number: 42,
      claimedAt: hoursBefore(at, REVIEW_STALE_HOURS + 1),
      runID: null,
      state: "claiming",
    });

    const outcome = await runDailyDigest(env, at);

    expect(outcome.state).toBe("sent");
    const text = messageText(sent()[0]!);
    expect(text).toContain("acme/mill#42");
    expect(text).toContain("answered as a duplicate");
    expect(text).not.toContain("tk cloud supervisor");
  });

  it("says which loops are quiet by not mentioning them", async () => {
    const at = morning("2026-05-07");
    await firing({ project: "acme/mill", sweep: "a", at: hoursBefore(at, 24), outcome: "refused" });
    await firing({ project: "acme/mill", sweep: "a", at: hoursBefore(at, 48), outcome: "refused" });
    await firing({ project: "acme/mill", sweep: "a", at: hoursBefore(at, 72), outcome: "refused" });
    await firing({ project: "acme/mill", sweep: "b", at: hoursBefore(at, 24), outcome: "empty" });

    const outcome = await runDailyDigest(env, at);

    expect(outcome.state).toBe("sent");
    const text = messageText(sent()[0]!);
    expect(text).toContain("acme/mill/a");
    expect(text).not.toContain("acme/mill/b");
  });
});

// ------------------------------------------------------------------------
describe("a loop that fails once does not", () => {
  it("stays silent for two refusals", async () => {
    const at = morning("2026-05-08");
    await firing({ project: "acme/mill", sweep: "morning", at: hoursBefore(at, 24), outcome: "refused" });
    await firing({ project: "acme/mill", sweep: "morning", at: hoursBefore(at, 48), outcome: "refused" });

    const outcome = await runDailyDigest(env, at);

    expect(outcome.state).toBe("quiet");
    expect(sent()).toHaveLength(0);
  });

  it("stays silent for a sweep that keeps finding nothing to do", async () => {
    const at = morning("2026-05-09");
    for (let day = 1; day <= 6; day += 1) {
      await firing({
        project: "acme/mill",
        sweep: "morning",
        at: hoursBefore(at, 24 * day),
        outcome: "empty",
      });
    }

    expect((await runDailyDigest(env, at)).state).toBe("quiet");
    expect(sent()).toHaveLength(0);
  });

  it("stays silent for a review that is merely in progress", async () => {
    const at = morning("2026-05-10");
    await claimedReview({
      project: "acme/mill",
      number: 43,
      claimedAt: hoursBefore(at, 1),
      runID: "run_working",
      state: "dispatched",
    });

    expect((await runDailyDigest(env, at)).state).toBe("quiet");
    expect(sent()).toHaveLength(0);
  });

  it("stops reporting a sweep the moment it works again", async () => {
    const at = morning("2026-05-11");
    // Four refusals, then this morning's firing selected work. The streak is
    // broken by EVIDENCE of recovery, not by a window rolling over.
    await firing({ project: "acme/mill", sweep: "morning", at: hoursBefore(at, 3), outcome: "ignited" });
    for (let day = 1; day <= 4; day += 1) {
      await firing({
        project: "acme/mill",
        sweep: "morning",
        at: hoursBefore(at, 24 * day),
        outcome: "refused",
      });
    }

    expect((await runDailyDigest(env, at)).state).toBe("quiet");
    expect(sent()).toHaveLength(0);
  });
});

// ------------------------------------------------------------------------
describe("the cadence", () => {
  it("writes a row and sends nothing on a quiet day", async () => {
    const at = morning("2026-05-12");

    const outcome = await runDailyDigest(env, at);

    expect(outcome.state).toBe("quiet");
    expect(sent()).toHaveLength(0);
    // The row is the whole point: "nothing to report" has to be readable as
    // something other than "the watcher never ran".
    const row = await digestRow("2026-05-12");
    expect(row?.findings).toBe(0);
    expect(row?.detail).toBe(QUIET_DETAIL);
    expect(row?.sent_at).toBeNull();
  });

  it("sends at most one message per day however often the trigger fires", async () => {
    const at = morning("2026-05-13");
    for (let day = 1; day <= 3; day += 1) {
      await firing({
        project: "acme/mill",
        sweep: "morning",
        at: hoursBefore(at, 24 * day),
        outcome: "refused",
      });
    }

    const first = await runDailyDigest(env, at);
    const second = await runDailyDigest(env, new Date(at.getTime() + 30_000));

    expect(first.state).toBe("sent");
    expect(second.state).toBe("already_built");
    expect(sent()).toHaveLength(1);
  });

  it("does nothing at an hour that is not the digest's", async () => {
    const at = new Date("2026-05-14T11:00:00.000Z");
    for (let day = 1; day <= 3; day += 1) {
      await firing({
        project: "acme/mill",
        sweep: "morning",
        at: hoursBefore(at, 24 * day),
        outcome: "refused",
      });
    }

    expect((await runDailyDigest(env, at)).state).toBe("not_due");
    expect(sent()).toHaveLength(0);
    expect(await digestRow("2026-05-14")).toBeNull();
  });

  it("keeps the finding when the channel refuses the message", async () => {
    const at = morning("2026-05-15");
    for (let day = 1; day <= 3; day += 1) {
      await firing({
        project: "acme/mill",
        sweep: "morning",
        at: hoursBefore(at, 24 * day),
        outcome: "refused",
      });
    }
    bot!.fail = true;

    const outcome = await runDailyDigest(env, at);

    expect(outcome.state).toBe("undeliverable");
    // The row is written BEFORE the message, so a channel outage cannot make a
    // failing loop look healthy — and the row records what could not be sent.
    const row = await digestRow("2026-05-15");
    expect(row?.findings).toBe(1);
    expect(row?.sent_at).toBeNull();
    expect(row?.detail).toContain("acme/mill/morning");
  });

  it("honours DIGEST_HOUR and ignores a value that is not an hour", async () => {
    set("DIGEST_HOUR", "3");
    expect(digestHour(env)).toBe(3);
    set("DIGEST_HOUR", "25");
    expect(digestHour(env)).toBe(7);
    set("DIGEST_HOUR", "");
    expect(digestHour(env)).toBe(7);
  });
});

// ------------------------------------------------------------------------
describe("the assessment itself", () => {
  it("counts a streak per declared sweep, not per project", () => {
    const rows = [
      { project: "p", sweep: "a", fired_at: "2026-05-03T04:00:00Z", outcome: "refused", detail: "x" },
      { project: "p", sweep: "b", fired_at: "2026-05-03T05:00:00Z", outcome: "empty", detail: "" },
      { project: "p", sweep: "a", fired_at: "2026-05-02T04:00:00Z", outcome: "refused", detail: "x" },
      { project: "p", sweep: "b", fired_at: "2026-05-02T05:00:00Z", outcome: "refused", detail: "y" },
      { project: "p", sweep: "a", fired_at: "2026-05-01T04:00:00Z", outcome: "refused", detail: "x" },
      { project: "p", sweep: "b", fired_at: "2026-05-01T05:00:00Z", outcome: "refused", detail: "y" },
    ];

    const findings = assessSweeps(rows);

    expect(findings.map((f) => f.subject)).toEqual(["p/a"]);
    expect(findings[0]!.since).toBe("2026-05-01T04:00:00Z");
  });

  it("counts the streak by the clock, not by the order rows arrive in", () => {
    const shuffled = [
      { project: "p", sweep: "a", fired_at: "2026-05-01T04:00:00Z", outcome: "refused", detail: "x" },
      { project: "p", sweep: "a", fired_at: "2026-05-03T04:00:00Z", outcome: "refused", detail: "x" },
      { project: "p", sweep: "a", fired_at: "2026-05-02T04:00:00Z", outcome: "refused", detail: "x" },
    ];

    expect(assessSweeps(shuffled)).toHaveLength(1);
  });

  it("strips a repository's newlines out of the detail it quotes", () => {
    const findings = assessSweeps([
      { project: "p", sweep: "a", fired_at: "2026-05-03T04:00:00Z", outcome: "refused", detail: "line one\nrun: rm -rf /" },
      { project: "p", sweep: "a", fired_at: "2026-05-02T04:00:00Z", outcome: "refused", detail: "x" },
      { project: "p", sweep: "a", fired_at: "2026-05-01T04:00:00Z", outcome: "refused", detail: "x" },
    ]);

    // A sweep's detail carries repository-authored text (a parse error quotes
    // the file). It must not be able to forge a line of the report's own
    // structure — the same invariant every other operator surface keeps.
    expect(findings[0]!.detail).not.toContain("\n");
    expect(renderDigest(findings, "2026-05-03").split("\n").filter((l) => l.startsWith("  run: "))).toHaveLength(1);
  });

  it("reports a review whose claim timestamp is itself unreadable", () => {
    const findings = assessReviews(
      [
        {
          project: "p",
          pr_number: 7,
          run_id: "run_x",
          state: "dispatched",
          claimed_at: "not a date",
          detail: "d",
        },
      ],
      new Date("2026-05-03T07:00:00Z")
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]!.measure).toContain("unreadable");
  });

  it("says how many findings it left out rather than truncating in silence", () => {
    const many = Array.from({ length: MAX_DIGEST_FINDINGS + 3 }, (_, index) => ({
      loop: "sweep" as const,
      subject: `p/s${index}`,
      project: "p",
      measure: "3 firings in a row refused",
      since: "2026-05-01T04:00:00Z",
      detail: "",
      command: "x",
    }));

    expect(renderDigest(many, "2026-05-03")).toContain("and 3 more");
  });
});

// ------------------------------------------------------------------------
describe("the clock is what asks", () => {
  it("reaches a person from the cron trigger, with nobody running anything", async () => {
    const at = morning("2026-05-16");
    for (let day = 1; day <= SWEEP_FAILURE_STREAK; day += 1) {
      await firing({
        project: "acme/mill",
        sweep: "morning",
        at: hoursBefore(at, 24 * day),
        outcome: "refused",
      });
    }

    // The whole tick in one call: no operator, no request, no `tk` command —
    // just the trigger that already wakes this Worker for sweeps. Driven
    // through the module's own `scheduled` export rather than `SELF.scheduled`
    // so it runs against the bindings this file configured.
    const ctx = createExecutionContext();
    const controller = {
      scheduledTime: at.getTime(),
      cron: "0 * * * *",
      noRetry() {},
    } as ScheduledController;
    await worker.scheduled!(controller, env as unknown as Env, ctx);
    await waitOnExecutionContext(ctx);

    expect(sent()).toHaveLength(1);
    expect(messageText(sent()[0]!)).toContain("acme/mill/morning");
  });
});

// ------------------------------------------------------------------------
describe("a branch nobody can vouch for reaches the same person", () => {
  it("reports a refusal CI remediation would otherwise have made in silence", async () => {
    const at = morning("2026-05-20");
    await noteUnrecordedBranch(
      env,
      {
        project: "acme/mill",
        branch: "tick/szp/meo",
        check_name: "test (go)",
        head_sha: "1f0c2b9ab4d5e6f7",
      },
      hoursBefore(at, 6)
    );

    const outcome = await runDailyDigest(env, at);

    expect(outcome.state).toBe("sent");
    const text = messageText(sent()[0]!);
    expect(text).toContain("acme/mill tick/szp/meo");
    // Both readings, because the factory genuinely cannot tell them apart —
    // that is what the record is for — and the operator's next move differs.
    expect(text).toContain("remediation is refusing work it should do");
    // And what to do about it, in one call, either way. The quotes reach
    // Telegram HTML-escaped, exactly as the escalation message's own JSON
    // does — so the path and both answers are asserted, not the punctuation.
    expect(text).toContain(CI_BRANCHES_PATH);
    expect(text).toContain("owner");
    expect(text).toContain("human");
    expect(
      assessUnrecordedBranches([
        {
          project: "acme/mill",
          branch: "tick/szp/meo",
          check_name: "test (go)",
          head_sha: "1f0c2b9ab4d5e6f7",
          refusals: 1,
          first_seen_at: "2026-05-20T01:00:00.000Z",
          last_seen_at: "2026-05-20T01:00:00.000Z",
        },
      ])[0]!.command
    ).toContain('"owner":"human"');
  });

  it("stops the moment somebody answers, whichever answer it is", async () => {
    const at = morning("2026-05-21");
    await noteUnrecordedBranch(
      env,
      {
        project: "acme/mill",
        branch: "tick/szp/meo",
        check_name: "test (go)",
        head_sha: "1f0c2b9ab4d5e6f7",
      },
      hoursBefore(at, 6)
    );
    // The release is EVIDENCE — the question has an answer now — not an
    // acknowledgement and not a clock (tick uls's rule, tick zaw's shape).
    await recordBranch(env, {
      project: "acme/mill",
      branch: "tick/szp/meo",
      owner: "human",
      recorded_by: "operator",
    });

    const outcome = await runDailyDigest(env, at);

    expect(outcome.state).toBe("quiet");
    expect(sent()).toHaveLength(0);
  });

  it("stops reciting a branch nothing has asked about in a fortnight", async () => {
    const rows = [
      {
        project: "acme/mill",
        branch: "tick/szp/ancient",
        check_name: "test (go)",
        head_sha: "1f0c2b9ab4d5e6f7",
        refusals: 9,
        first_seen_at: "2026-01-01T00:00:00.000Z",
        last_seen_at: "2026-01-02T00:00:00.000Z",
      },
    ];
    // The assessor is pure and reports what it is handed; the bound is the
    // READ's, and this is the constant that sets it.
    expect(assessUnrecordedBranches(rows)).toHaveLength(1);
    expect(UNRECORDED_BRANCH_ACTIVE_DAYS).toBe(14);

    const at = morning("2026-05-22");
    await noteUnrecordedBranch(
      env,
      {
        project: "acme/mill",
        branch: "tick/szp/ancient",
        check_name: "test (go)",
        head_sha: "1f0c2b9ab4d5e6f7",
      },
      new Date(at.getTime() - (UNRECORDED_BRANCH_ACTIVE_DAYS + 1) * 86_400_000)
    );
    expect((await runDailyDigest(env, at)).state).toBe("quiet");
  });
});

// ------------------------------------------------------------------------
/**
 * Ticks `6tx` and `t4y` each added a finding kind to this module, in parallel,
 * for unrelated reasons. Neither branch could test the other, and
 * `.tick/learnings.md` records exactly this shape: when parallel ticks share a
 * contract, the merge gate is the only thing that tests it — and the break
 * lands in the tick that did nothing. So the union is pinned here rather than
 * left to two green branches.
 */
describe("every finding kind keeps its own words in one message", () => {
  it("renders all four kinds distinctly, in loop order", async () => {
    const at = morning("2026-05-23");
    for (let day = 1; day <= SWEEP_FAILURE_STREAK; day += 1) {
      await firing({
        project: "acme/mill",
        sweep: "morning",
        at: hoursBefore(at, 24 * day),
        outcome: "refused",
      });
    }
    await noteUnrecordedBranch(
      env,
      {
        project: "acme/mill",
        branch: "tick/szp/meo",
        check_name: "test (go)",
        head_sha: "1f0c2b9ab4d5e6f7",
      },
      hoursBefore(at, 6)
    );
    await env.DB.prepare(
      `INSERT INTO pr_reviews
         (pr_node_id, project, pr_number, head_sha, base_sha, run_id, state, detail,
          posted_at, comment_id, claimed_at, expired_at, expiry_comment_id)
       VALUES (?, ?, ?, ?, ?, NULL, 'expired', NULL, NULL, NULL, ?, ?, 'c9')`
    )
      .bind(
        "PR_expired_union",
        "acme/mill",
        41,
        "d".repeat(40),
        "e".repeat(40),
        hoursBefore(at, 8).toISOString(),
        hoursBefore(at, 7).toISOString()
      )
      .run();

    const outcome = await runDailyDigest(env, at);
    expect(outcome.state).toBe("sent");
    const text = messageText(sent()[0]!);

    // Each kind names itself. `LOOP_LABELS` is what makes this true, and it is
    // typed against the union so a fifth kind cannot inherit a fourth's word.
    expect(text).toContain("sweep: acme/mill/morning");
    expect(text).toContain("review never ran: acme/mill#41");
    expect(text).toContain("branch: acme/mill tick/szp/meo");

    // And the ORDER `collectFindings` states: loops first, the question last.
    expect(text.indexOf("sweep: acme/mill/morning")).toBeLessThan(
      text.indexOf("review never ran: acme/mill#41")
    );
    expect(text.indexOf("review never ran: acme/mill#41")).toBeLessThan(
      text.indexOf("branch: acme/mill tick/szp/meo")
    );

    // The one that would actually have bitten: an expired review must never be
    // offered `tk cloud supervisor` for a run that never booted, and a branch
    // question must never be offered it either.
    expect(text).not.toContain("tk cloud supervisor");
  });

  it("gives each kind a label of its own, with no two sharing", () => {
    const labelled = [
      ...assessSweeps([
        { project: "p", sweep: "s", fired_at: "2026-05-01T00:00:00.000Z", outcome: "refused", detail: "" },
        { project: "p", sweep: "s", fired_at: "2026-05-02T00:00:00.000Z", outcome: "refused", detail: "" },
        { project: "p", sweep: "s", fired_at: "2026-05-03T00:00:00.000Z", outcome: "refused", detail: "" },
      ]),
      ...assessReviews(
        [
          {
            project: "p",
            pr_number: 1,
            run_id: "run_x",
            state: "running",
            claimed_at: "2026-05-01T00:00:00.000Z",
            detail: null,
          },
        ],
        new Date("2026-05-10T00:00:00.000Z")
      ),
      ...assessExpiredReviews(
        [
          {
            project: "p",
            pr_number: 2,
            run_id: null,
            claimed_at: "2026-05-10T00:00:00.000Z",
            expired_at: "2026-05-10T00:30:00.000Z",
            expiry_comment_id: "c1",
            detail: null,
          },
        ],
        new Date("2026-05-10T01:00:00.000Z")
      ),
      ...assessUnrecordedBranches([
        {
          project: "p",
          branch: "tick/e/b",
          check_name: "test",
          head_sha: "abcdef123456",
          refusals: 1,
          first_seen_at: "2026-05-10T00:00:00.000Z",
          last_seen_at: "2026-05-10T00:00:00.000Z",
        },
      ]),
    ];
    expect(labelled).toHaveLength(4);

    const rendered = renderDigest(labelled, "2026-05-10");
    const labels = rendered
      .split("\n")
      .filter((line) => /^[a-z][a-z ]*: /.test(line))
      .map((line) => line.slice(0, line.indexOf(":")));
    // Four findings, four distinct words. A kind that silently inherited
    // another's label would show up here as a duplicate rather than as a
    // reader's confusion months later.
    expect(labels).toHaveLength(4);
    expect(new Set(labels).size).toBe(4);
  });
});

// ------------------------------------------------------------------------
describe("the message's command is a real one", () => {
  it("names a sweep-records path this factory actually serves", async () => {
    const response = await SELF.fetch(`https://factory.example.com${SWEEP_RECORDS_PATH}`, {
      headers: { authorization: `Bearer ${operatorToken}` },
    });

    // The digest recites this path to an operator. A message naming a route
    // that 404s is worse than no message, so the constant is pinned against
    // the router rather than against a comment.
    expect(response.status).toBe(200);
  });

  it("names a branch-ownership path this factory actually serves", async () => {
    const response = await SELF.fetch(
      `https://factory.example.com${CI_BRANCHES_PATH}?project=acme/mill`,
      { headers: { authorization: `Bearer ${operatorToken}` } }
    );
    // Same rule, for the finding tick t4y added: the one call that answers it
    // has to be a call.
    expect(response.status).toBe(200);
  });
});
