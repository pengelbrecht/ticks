import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { REVIEW_PREFIX, isAuthExempt } from "../src/auth";
import {
  GIT_PATH_PREFIX,
  containerGitToken,
  credentialGrade,
  planSandboxGit,
  proxyGitRequest,
} from "../src/credentials";
import { enrolProject, getRun } from "../src/db";
import { issueRunToken } from "../src/gateway";
import { DEFAULT_CONSENT_LABEL } from "../src/consent";
import { GITHUB_WEBHOOK_PATH, githubSignature } from "../src/github-issues";
import {
  FACTORY_LINE_PREFIX,
  REVIEW_BUDGET_PER_DAY,
  REVIEW_BUDGET_WINDOW_MS,
  REVIEW_PATH,
  WRITE_ACCESS_ASSOCIATIONS,
  classifyPullRequestEvent,
  claimPullRequestReview,
  getReviewByNode,
  getReviewForRun,
  hasWriteAccess,
  ingestPullRequestEvent,
  renderReviewComment,
  reviewBudget,
  reviewConsent,
  reviewEpic,
  reviewGradeComplaint,
  reviewRunSubmission,
  type PullRequestFacts,
  type ReviewCommenter,
} from "../src/pr-review";
import { orchestratorEnv, repoURL } from "../src/sandbox";
import { UNTRUSTED_LINE_PREFIX, TRUNCATION_MARKER } from "../src/untrusted-text";

/**
 * Read-only pull request review runs (UC5, tick v7g) — the first autonomous
 * loop.
 *
 * The tick's acceptance criterion has two halves and this file proves both by
 * DOING them rather than by reading the code:
 *
 *  1. **"a run that provably could not have pushed to it."** The push case
 *     takes the credential the dispatched review run is actually handed —
 *     minted from the run the webhook created, not from a hand-written row —
 *     sends both halves of what `git push` sends over smart HTTP, and asserts
 *     the refusal AND that the injected upstream fetcher was never called.
 *  2. **"the diff cannot forge the comment's structure."** The forgery case
 *     hands the review door findings that are a pixel-perfect imitation of the
 *     factory's own header, complete with bidirectional overrides and CRLF,
 *     and asserts the mechanical invariant on what GitHub actually received:
 *     every line begins either with the factory's prefix or with the untrusted
 *     one, and the count of factory lines does not move whatever is in the
 *     findings.
 *
 * Real workerd, the real D1 tables from migrations/. Three substitutions, each
 * for a rule that is not otherwise exercisable: the Workflow binding (so a
 * test does not leave a real instance supervising — `.tick/learnings.md`),
 * GitHub's comment API, and GitHub itself behind the git door.
 */

const BASE = "https://factory.example.com";
const SECRET = "webhook-secret-for-pr-tests";
const OPERATOR_TOKEN = "ghu_operator_token_that_can_push";

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
    return { id: `c${this.next++}` };
  }
}

let commenter: FakeCommenter;

beforeEach(() => {
  commenter = new FakeCommenter();
  set("FACTORY_BASE_URL", BASE);
  set("AI_GATEWAY_BASE_URL", "https://gateway.ai.cloudflare.com/v1/acc0unt/ticks");
  set("GITHUB_TOKEN", OPERATOR_TOKEN);
  set("GITHUB_WEBHOOK_SECRET", SECRET);
  set("REVIEW_COMMENTER", commenter);
  // A stub Workflow binding: the run is RECORDED and its credential decisions
  // are real, without a live instance left supervising after the test.
  set("RUN_WORKFLOW", {
    async create(options: { id?: string }) {
      return {
        id: options.id ?? "instance",
        async status() {
          return { status: "running" };
        },
      };
    },
    async get() {
      throw new Error("unused");
    },
  });
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
    else (env as unknown as Record<string, unknown>)[name] = value;
  }
});

/** Each case takes its own project, so one dispatch lease cannot wedge another. */
let counter = 0;
async function enrolled(): Promise<string> {
  counter += 1;
  const project = `acme/reviewed-${counter}`;
  await enrolProject(env.DB, {
    project,
    enrolled_by: "operator@example.com",
    enrolled_at: new Date().toISOString(),
  });
  return project;
}

type Overrides = Record<string, unknown>;

/**
 * A pull request from somebody with write access, on a branch of the base
 * repository — the ordinary case, and the one the pre-ytd cases all assumed.
 *
 * `author_association` and `head.repo` are named here rather than left out
 * because tick ytd made them load-bearing: a fixture that omitted them would
 * be an OUTSIDE contributor's fork PR, and every case below would be silently
 * testing the refusal path instead of the thing it says it tests.
 */
function prPayload(project: string, over: Overrides = {}, prOver: Overrides = {}): unknown {
  counter += 1;
  return {
    action: "opened",
    repository: { full_name: project },
    sender: { login: "maintainer" },
    pull_request: {
      number: 42,
      node_id: `PR_kwDOABCD${counter}`,
      state: "open",
      draft: false,
      title: "Add a CSV exporter",
      body: "Please review.",
      user: { login: "maintainer" },
      author_association: "MEMBER",
      labels: [],
      head: { sha: "a".repeat(40), repo: { full_name: project } },
      base: { sha: "b".repeat(40) },
      ...prOver,
    },
    ...over,
  };
}

/**
 * The case tick ytd exists for: a stranger's pull request, opened from their
 * own fork, against an enrolled public repository.
 */
function strangerPayload(project: string, over: Overrides = {}, prOver: Overrides = {}): unknown {
  return prPayload(project, over, {
    user: { login: "stranger" },
    author_association: "FIRST_TIME_CONTRIBUTOR",
    head: { sha: "a".repeat(40), repo: { full_name: "stranger/fork" } },
    ...prOver,
  });
}

/** The gate reads a label, so a fixture needs one that looks like GitHub's. */
function withConsent(prOver: Overrides = {}): Overrides {
  return { labels: [{ name: DEFAULT_CONSENT_LABEL }], ...prOver };
}

function factsOf(payload: unknown): PullRequestFacts {
  const verdict = classifyPullRequestEvent(payload, { label: DEFAULT_CONSENT_LABEL });
  if (verdict.verdict !== "review") throw new Error(`not a review: ${JSON.stringify(verdict)}`);
  return verdict.facts;
}

/** A dispatched review run, from a real ingestion, with a live sandbox credential. */
async function dispatched(
  project: string,
  payload?: unknown
): Promise<{ run_id: string; token: string; pr: number }> {
  const result = await ingestPullRequestEvent(env, payload ?? prPayload(project));
  expect(result.state).toBe("dispatched");
  if (result.state !== "dispatched") throw new Error("unreachable");
  const issued = await issueRunToken(env, {
    run_id: result.run_id,
    tick_id: reviewEpic(result.facts.number),
    attempt: 1,
  });
  return { run_id: result.run_id, token: issued.token, pr: result.facts.number };
}

function post(token: string | null, body: unknown): Promise<Response> {
  return SELF.fetch(`${BASE}${REVIEW_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
}

/** The invariant, as a machine reads it: who wrote each line of the comment. */
function lineKinds(body: string): { factory: number; untrusted: number; other: string[] } {
  let factory = 0;
  let untrusted = 0;
  const other: string[] = [];
  for (const line of body.split("\n")) {
    if (line.startsWith(FACTORY_LINE_PREFIX)) factory += 1;
    else if (line.startsWith(UNTRUSTED_LINE_PREFIX)) untrusted += 1;
    else other.push(line);
  }
  return { factory, untrusted, other };
}

// ------------------------------------------------------------- the verdict ---

describe("what a pull_request delivery is", () => {
  it("reviews an opened pull request, from structural fields only", () => {
    const verdict = classifyPullRequestEvent(prPayload("acme/widgets"), { label: DEFAULT_CONSENT_LABEL });
    expect(verdict.verdict).toBe("review");
    if (verdict.verdict !== "review") throw new Error("unreachable");
    expect(verdict.facts.project).toBe("acme/widgets");
    expect(verdict.facts.number).toBe(42);
    expect(verdict.facts.head_sha).toBe("a".repeat(40));
    expect(verdict.facts.base_sha).toBe("b".repeat(40));
    // The title and body are not read at all — there is no field for them.
    expect(Object.keys(verdict.facts)).not.toContain("title");
    expect(Object.keys(verdict.facts)).not.toContain("body");
  });

  it("ignores a draft, a closed pull request, and every non-reviewing action", () => {
    const draft = classifyPullRequestEvent(prPayload("acme/widgets", {}, { draft: true }), { label: DEFAULT_CONSENT_LABEL });
    expect(draft).toMatchObject({ verdict: "ignored", reason: "draft" });

    const closed = classifyPullRequestEvent(prPayload("acme/widgets", {}, { state: "closed" }), { label: DEFAULT_CONSENT_LABEL });
    expect(closed).toMatchObject({ verdict: "ignored", reason: "pull_request_closed" });

    // A push to the branch: fires on every commit, so it is not a review
    // trigger — an unbounded spend lever is not an autonomous loop.
    const pushed = classifyPullRequestEvent(prPayload("acme/widgets", { action: "synchronize" }), { label: DEFAULT_CONSENT_LABEL });
    expect(pushed).toMatchObject({ verdict: "ignored", reason: "not_a_reviewing_action" });

    const closing = classifyPullRequestEvent(prPayload("acme/widgets", { action: "closed" }), { label: DEFAULT_CONSENT_LABEL });
    expect(closing).toMatchObject({ verdict: "ignored", reason: "not_a_reviewing_action" });
  });

  it("refuses a payload it cannot key or clone", () => {
    expect(classifyPullRequestEvent(prPayload("acme/widgets", {}, { node_id: "" }), { label: DEFAULT_CONSENT_LABEL })).toMatchObject({
      verdict: "refused",
      reason: "invalid_payload",
    });
    expect(
      classifyPullRequestEvent(prPayload("acme/widgets", {}, { base: { sha: "not-a-sha" } }), { label: DEFAULT_CONSENT_LABEL })
    ).toMatchObject({ verdict: "refused", reason: "invalid_payload" });
    expect(classifyPullRequestEvent("a pull request, honest", { label: DEFAULT_CONSENT_LABEL })).toMatchObject({
      verdict: "refused",
    });
  });

  it("submits the review read-only, at the base commit, never the head", () => {
    const verdict = classifyPullRequestEvent(prPayload("acme/widgets"), { label: DEFAULT_CONSENT_LABEL });
    if (verdict.verdict !== "review") throw new Error("unreachable");
    const submission = reviewRunSubmission(verdict.facts);
    expect(submission.credential_grade).toBe("read_only");
    // The base repository's own commit: the head may live in a fork, and the
    // diff is reachable from the base as refs/pull/<n>/head regardless.
    expect(submission.base_sha).toBe("b".repeat(40));
    expect(submission.epic).toBe("pr-42");
    expect(submission.queue).toBe(true);
  });
});

// ---------------------------------------------------------------- the gate ---

/**
 * Tick ytd. Enrolment used to be the only gate, so a stranger's pull request
 * on a public repository bought a paid run with nobody in between.
 *
 * The rule these cases pin: **write access reviews automatically, everybody
 * else needs the consent label** — plus a per-repository daily cap behind it,
 * because a gate is a judgement and the budget is what holds when the
 * judgement is wrong.
 */
describe("who may buy a review run", () => {
  it("reads GitHub's author_association the way GitHub means it", () => {
    // Write access. These three are the whole list, and the test says so, so
    // widening it is a deliberate edit rather than a drift.
    expect([...WRITE_ACCESS_ASSOCIATIONS]).toEqual(["OWNER", "MEMBER", "COLLABORATOR"]);
    for (const trusted of WRITE_ACCESS_ASSOCIATIONS) expect(hasWriteAccess(trusted)).toBe(true);

    // CONTRIBUTOR is the trap: GitHub promotes a stranger to it the moment
    // their first pull request is merged, so trusting it would mean one merged
    // PR buys unlimited paid runs for ever after.
    for (const stranger of [
      "CONTRIBUTOR",
      "FIRST_TIME_CONTRIBUTOR",
      "FIRST_TIMER",
      "MANNEQUIN",
      "NONE",
    ]) {
      expect(hasWriteAccess(stranger)).toBe(false);
    }

    // Fail closed on anything this factory does not recognise, including a
    // value GitHub might add after this was written.
    expect(hasWriteAccess("")).toBe(false);
    expect(hasWriteAccess("SOMETHING_NEW")).toBe(false);
  });

  it("keeps the author's standing, the consent label and the fork as facts", () => {
    const mine = factsOf(prPayload("acme/widgets"));
    expect(mine.author_association).toBe("MEMBER");
    expect(mine.consented).toBe(false);
    expect(mine.from_fork).toBe(false);

    const theirs = factsOf(strangerPayload("acme/widgets"));
    expect(theirs.author_association).toBe("FIRST_TIME_CONTRIBUTOR");
    expect(theirs.from_fork).toBe(true);
    expect(theirs.consented).toBe(false);

    // A head repository GitHub could not name (the fork was deleted before
    // delivery) reads as a fork, which is the conservative direction.
    expect(factsOf(prPayload("acme/widgets", {}, { head: { sha: "a".repeat(40) } })).from_fork).toBe(
      true
    );

    // A payload with no association at all is a stranger, not a default.
    const bare = factsOf(prPayload("acme/widgets", {}, { author_association: undefined }));
    expect(bare.author_association).toBe("NONE");

    // The label is matched case-insensitively, as GitHub's own uniqueness is.
    expect(factsOf(prPayload("acme/widgets", {}, withConsent())).consented).toBe(true);
    expect(
      factsOf(prPayload("acme/widgets", {}, { labels: [{ name: "TK" }] })).consented
    ).toBe(true);
    expect(
      factsOf(prPayload("acme/widgets", {}, { labels: [{ name: "tkx" }, "bug"] })).consented
    ).toBe(false);
  });

  it("allows write access automatically and refuses an outside contributor", () => {
    for (const trusted of WRITE_ACCESS_ASSOCIATIONS) {
      const facts = factsOf(prPayload("acme/widgets", {}, { author_association: trusted }));
      expect(reviewConsent(facts, DEFAULT_CONSENT_LABEL)).toMatchObject({
        state: "allowed",
        via: "author_trust",
      });
    }

    const stranger = reviewConsent(factsOf(strangerPayload("acme/widgets")), DEFAULT_CONSENT_LABEL);
    expect(stranger).toMatchObject({ state: "refused", reason: "author_not_trusted" });
    if (stranger.state !== "refused") throw new Error("unreachable");
    // The refusal has to be readable by the person who has to act on it: it
    // names the fork case and names the label that would let it through.
    expect(stranger.detail).toContain("from a fork");
    expect(stranger.detail).toContain(DEFAULT_CONSENT_LABEL);
  });

  it("lets the consent label through, for exactly the author it was refusing", () => {
    const facts = factsOf(strangerPayload("acme/widgets", {}, withConsent()));
    expect(facts.author_association).toBe("FIRST_TIME_CONTRIBUTOR");
    expect(facts.from_fork).toBe(true);
    expect(reviewConsent(facts, DEFAULT_CONSENT_LABEL)).toMatchObject({
      state: "allowed",
      via: "consent_label",
    });
  });

  it("dispatches nothing for a stranger's fork pull request, and no claim either", async () => {
    const project = await enrolled();
    const payload = strangerPayload(project);
    const result = await ingestPullRequestEvent(env, payload);
    expect(result).toMatchObject({ state: "ignored", reason: "author_not_trusted" });

    // The whole point is that no money moved: no run, and no row in the table
    // the budget is counted from either.
    const node = (payload as { pull_request: { node_id: string } }).pull_request.node_id;
    expect(await getReviewByNode(env.DB, node)).toBeNull();
    const budget = await reviewBudget(env.DB, project);
    expect(budget).toMatchObject({ state: "within_budget", reviews: 0 });
  });

  it("refuses a CONTRIBUTOR — one merged pull request is not write access", async () => {
    const project = await enrolled();
    const result = await ingestPullRequestEvent(
      env,
      strangerPayload(project, {}, { author_association: "CONTRIBUTOR" })
    );
    expect(result).toMatchObject({ state: "ignored", reason: "author_not_trusted" });
  });

  it("reviews that same fork pull request once a maintainer labels it", async () => {
    const project = await enrolled();
    const refused = await ingestPullRequestEvent(env, strangerPayload(project));
    expect(refused).toMatchObject({ state: "ignored", reason: "author_not_trusted" });

    // `labeled` is the delivery the act of consenting produces. Without it the
    // consent half would be unreachable: GitHub does not resend `opened`
    // because somebody applied a label afterwards.
    const consented = await ingestPullRequestEvent(
      env,
      strangerPayload(project, { action: "labeled", label: { name: DEFAULT_CONSENT_LABEL } }, withConsent())
    );
    expect(consented.state).toBe("dispatched");
    if (consented.state !== "dispatched") throw new Error("unreachable");
    const run = await getRun(env.DB, consented.run_id);
    // Consent buys a review, never a wider credential.
    expect(run?.credential_grade).toBe("read_only");
  });

  it("never reviews on a label being REMOVED, even from a labelled pull request", async () => {
    const project = await enrolled();
    const result = await ingestPullRequestEvent(
      env,
      strangerPayload(project, { action: "unlabeled", label: { name: DEFAULT_CONSENT_LABEL } }, withConsent())
    );
    expect(result).toMatchObject({ state: "ignored", reason: "not_a_reviewing_action" });
  });

  it("honours a deployment that renamed the consent label", async () => {
    const project = await enrolled();
    set("GITHUB_CONSENT_LABEL", "review-me");

    const wrongLabel = await ingestPullRequestEvent(
      env,
      strangerPayload(project, {}, withConsent())
    );
    expect(wrongLabel).toMatchObject({ state: "ignored", reason: "author_not_trusted" });

    const right = await ingestPullRequestEvent(
      env,
      strangerPayload(project, {}, { labels: [{ name: "review-me" }] })
    );
    expect(right.state).toBe("dispatched");
  });

  it("arrives at the webhook door as a settled 200, never a redelivery loop", async () => {
    const project = await enrolled();
    const body = JSON.stringify(strangerPayload(project));
    const response = await SELF.fetch(`${BASE}${GITHUB_WEBHOOK_PATH}`, {
      method: "POST",
      headers: {
        "X-GitHub-Event": "pull_request",
        "X-Hub-Signature-256": await githubSignature(SECRET, body),
        "content-type": "application/json",
      },
      body,
    });
    // 200, not 503: the answer is settled, and asking GitHub to send this
    // again would be an infinite retry over a decision that will not change.
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      reviewing: false,
      reason: "author_not_trusted",
    });
  });
});

// ----------------------------------------------------------- the daily cap ---

describe("the per-repository daily review budget", () => {
  /** Rows written straight to the table: the cap counts claims, not runs. */
  async function claim(project: string, n: number, at: Date): Promise<void> {
    for (let i = 0; i < n; i += 1) {
      counter += 1;
      await claimPullRequestReview(env.DB, {
        ...factsOf(prPayload(project, {}, { number: 1000 + counter })),
        node_id: `PR_budget_${counter}`,
      });
      await env.DB.prepare("UPDATE pr_reviews SET claimed_at = ? WHERE pr_node_id = ?")
        .bind(at.toISOString(), `PR_budget_${counter}`)
        .run();
    }
  }

  it("counts this repository's reviews over a rolling day, and nobody else's", async () => {
    const project = await enrolled();
    const other = await enrolled();
    const now = new Date();

    await claim(project, 3, now);
    await claim(other, 5, now);
    // Yesterday's reviews are outside the window and buy nothing back or away.
    await claim(project, 9, new Date(now.getTime() - REVIEW_BUDGET_WINDOW_MS - 60_000));

    expect(await reviewBudget(env.DB, project, now)).toMatchObject({
      state: "within_budget",
      reviews: 3,
      remaining: REVIEW_BUDGET_PER_DAY - 3,
    });
  });

  it("stops dispatching once the cap is reached, even for a trusted author", async () => {
    const project = await enrolled();
    const now = new Date();
    await claim(project, REVIEW_BUDGET_PER_DAY, now);
    expect(await reviewBudget(env.DB, project, now)).toMatchObject({ state: "exhausted" });

    // MEMBER: the gate above says yes. The backstop is what says no, which is
    // the whole reason it is not merely a second copy of the gate.
    const payload = prPayload(project);
    const result = await ingestPullRequestEvent(env, payload);
    expect(result).toMatchObject({ state: "ignored", reason: "review_budget_exhausted" });

    // And a capped repository leaves no row, so today's refusals cannot
    // inflate tomorrow's count.
    const node = (payload as { pull_request: { node_id: string } }).pull_request.node_id;
    expect(await getReviewByNode(env.DB, node)).toBeNull();
  });
});

// ------------------------------------------------------------ the dispatch ---

describe("a pull request opened against an enrolled repository", () => {
  it("dispatches a run recorded as read-only, bound to that pull request", async () => {
    const project = await enrolled();
    const payload = prPayload(project);
    const result = await ingestPullRequestEvent(env, payload);
    expect(result.state).toBe("dispatched");
    if (result.state !== "dispatched") throw new Error("unreachable");

    // The durable row, re-read from D1: this is what every credential decision
    // downstream reads, and a container never supplies it.
    const run = await getRun(env.DB, result.run_id);
    expect(run?.credential_grade).toBe("read_only");
    expect(run?.project).toBe(project);

    const target = await getReviewForRun(env.DB, result.run_id);
    expect(target?.pr_number).toBe(42);
    expect(target?.project).toBe(project);
    expect(target?.comment_id).toBeNull();
  });

  it("reviews a pull request once, however often GitHub redelivers it", async () => {
    const project = await enrolled();
    const payload = prPayload(project);
    const first = await ingestPullRequestEvent(env, payload);
    expect(first.state).toBe("dispatched");

    for (const action of ["opened", "reopened", "ready_for_review"]) {
      const again = await ingestPullRequestEvent(env, { ...(payload as object), action });
      expect(again).toMatchObject({ state: "ignored", reason: "duplicate" });
    }
  });

  it("ignites nothing for a repository the operator never enrolled", async () => {
    const payload = prPayload("stranger/repo");
    const result = await ingestPullRequestEvent(env, payload);
    expect(result).toMatchObject({ state: "ignored", reason: "project_not_enrolled" });
    // And no claim row either: an unenrolled repository cannot fill this table.
    const node = ((payload as { pull_request: { node_id: string } }).pull_request.node_id);
    expect(await getReviewByNode(env.DB, node)).toBeNull();
  });

  it("gives the claim back when nothing was dispatched, so a redelivery can retry", async () => {
    const project = await enrolled();
    const payload = prPayload(project);
    // A factory with no Workflow binding cannot boot anything.
    set("RUN_WORKFLOW", undefined);
    const refused = await ingestPullRequestEvent(env, payload);
    expect(refused.state).toBe("deferred");
    const node = (payload as { pull_request: { node_id: string } }).pull_request.node_id;
    expect(await getReviewByNode(env.DB, node)).toBeNull();
  });

  it("arrives through Phase 3's webhook door, under its signature", async () => {
    const project = await enrolled();
    const body = JSON.stringify(prPayload(project));

    const unsigned = await SELF.fetch(`${BASE}${GITHUB_WEBHOOK_PATH}`, {
      method: "POST",
      headers: { "X-GitHub-Event": "pull_request", "content-type": "application/json" },
      body,
    });
    expect(unsigned.status).toBe(401);

    const signed = await SELF.fetch(`${BASE}${GITHUB_WEBHOOK_PATH}`, {
      method: "POST",
      headers: {
        "X-GitHub-Event": "pull_request",
        "X-Hub-Signature-256": await githubSignature(SECRET, body),
        "content-type": "application/json",
      },
      body,
    });
    expect(signed.status).toBe(202);
    const payload = (await signed.json()) as { reviewing: boolean; run_id: string };
    expect(payload.reviewing).toBe(true);
    expect((await getRun(env.DB, payload.run_id))?.credential_grade).toBe("read_only");
  });
});

// --------------------------------------------- the run that cannot push ---

describe("the review run attempting to push", () => {
  it("is refused at the credential, and nothing reaches GitHub", async () => {
    const project = await enrolled();
    const { token } = await dispatched(project);

    let upstreamCalls = 0;
    const fetcher: typeof fetch = async () => {
      upstreamCalls += 1;
      return new Response("should never happen", { status: 200 });
    };
    const [owner, repo] = project.split("/") as [string, string];
    const gitBasic = `Basic ${btoa(`x-access-token:${token}`)}`;

    // Exactly what `git push` sends: the advertisement, then the RPC.
    const advertisement = await proxyGitRequest(
      env,
      new Request(
        `${BASE}${GIT_PATH_PREFIX}/${project}.git/info/refs?service=git-receive-pack`,
        { headers: { authorization: gitBasic } }
      ),
      [owner, `${repo}.git`, "info", "refs"],
      { fetcher }
    );
    const push = await proxyGitRequest(
      env,
      new Request(`${BASE}${GIT_PATH_PREFIX}/${project}.git/git-receive-pack`, {
        method: "POST",
        headers: { authorization: gitBasic, "content-type": "application/x-git-receive-pack-request" },
        body: "0000",
      }),
      [owner, `${repo}.git`, "git-receive-pack"],
      { fetcher }
    );

    expect(advertisement.status).toBe(403);
    expect(push.status).toBe(403);
    expect(((await push.json()) as { error: string }).error).toBe("git_write_refused");
    // A refusal that still called upstream would be a refusal of the response.
    expect(upstreamCalls).toBe(0);
  });

  it("holds no credential github.com would accept, from the row's own grade", async () => {
    const project = await enrolled();
    const { run_id, token } = await dispatched(project);
    const run = await getRun(env.DB, run_id);

    // Exactly what the boot site does (run-workflow.ts): the plan comes from
    // the grade on the RUN ROW, and the container's GITHUB_TOKEN comes from
    // the plan. Asserted here because the door's refusal alone does not prove
    // the grade — the door has no write side for any run, and a WRITE run
    // would not be pointed at it at all.
    const plan = planSandboxGit({
      grade: credentialGrade(run?.credential_grade),
      project,
      operator_token: OPERATOR_TOKEN,
      factory_url: BASE,
      direct_repo_url: repoURL(project),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) throw new Error("unreachable");
    expect(plan.plan.grade).toBe("read_only");
    expect(plan.plan.token_source).toBe("run");
    expect(plan.plan.repo_url).toBe(`${BASE}${GIT_PATH_PREFIX}/${project}.git`);

    const held = containerGitToken(plan.plan, OPERATOR_TOKEN, token);
    expect(held).toBe(token);
    expect(held).not.toBe(OPERATOR_TOKEN);
    // And nothing in the container's environment carries the operator's token.
    const environment = orchestratorEnv({
      run_id,
      epic: reviewEpic(42),
      base_sha: "b".repeat(40),
      repo_url: plan.plan.repo_url,
      gateway_base_url: `${BASE}/api/gateway`,
      gateway_token: token,
      phase: "review",
      github_token: held,
      review_pr: 42,
      review_head_sha: "a".repeat(40),
      factory_url: BASE,
      factory_project: project,
    });
    expect(Object.values(environment)).not.toContain(OPERATOR_TOKEN);
    expect(environment.GITHUB_TOKEN).toBe(token);
  });

  it("can still read the repository it is reviewing, through the same door", async () => {
    const project = await enrolled();
    const { token } = await dispatched(project);
    let target = "";
    const fetcher: typeof fetch = async (input) => {
      target = String(input);
      return new Response("001e# service=git-upload-pack\n", { status: 200 });
    };
    const [owner, repo] = project.split("/") as [string, string];
    const read = await proxyGitRequest(
      env,
      new Request(`${BASE}${GIT_PATH_PREFIX}/${project}.git/info/refs?service=git-upload-pack`, {
        headers: { authorization: `Basic ${btoa(`x-access-token:${token}`)}` },
      }),
      [owner, `${repo}.git`, "info", "refs"],
      { fetcher }
    );
    expect(read.status).toBe(200);
    expect(target).toContain(`https://github.com/${project}.git/info/refs`);
  });

  it("refuses to boot a review run that somehow carries a write credential", () => {
    expect(reviewGradeComplaint("read_only")).toBeNull();
    expect(reviewGradeComplaint("write")).toContain("read-only by construction");
    // Fails closed the way credentialGrade does: an unknown grade is the
    // smallest one, so it is allowed to review.
    expect(reviewGradeComplaint("superuser")).toBeNull();
  });

  it("tells its container which pull request it is reading, and nothing else", () => {
    const environment = orchestratorEnv({
      run_id: "run_x",
      epic: reviewEpic(42),
      base_sha: "b".repeat(40),
      repo_url: `${BASE}${GIT_PATH_PREFIX}/acme/widgets.git`,
      gateway_base_url: `${BASE}/api/gateway`,
      gateway_token: "tkr_run_token",
      phase: "review",
      review_pr: 42,
      review_head_sha: "a".repeat(40),
      factory_url: BASE,
      factory_project: "acme/widgets",
    });
    expect(environment.TICKS_PHASE).toBe("review");
    expect(environment.TICKS_REVIEW_PR).toBe("42");
    expect(environment.TICKS_REVIEW_HEAD_SHA).toBe("a".repeat(40));
    // The factory credential a container holds is its own run token, never the
    // operator's (D17) — the same one a stop revokes.
    expect(environment.TICKS_FACTORY_TOKEN).toBe("tkr_run_token");
  });
});

// ------------------------------------------------------------- the comment ---

describe("the review door", () => {
  it("is exempt from the operator's bearer token, under one spelling", () => {
    expect(REVIEW_PREFIX).toBe(REVIEW_PATH);
    expect(isAuthExempt(REVIEW_PATH)).toBe(true);
    expect(isAuthExempt("/api/reviews")).toBe(false);
  });

  it("posts one comment on the run's own pull request", async () => {
    const project = await enrolled();
    const { run_id, token } = await dispatched(project);

    const response = await post(token, { findings: "Two findings:\n- a leak\n- a typo" });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { comment_id: string; pull_request: number };
    expect(body.pull_request).toBe(42);

    expect(commenter.posted).toHaveLength(1);
    expect(commenter.posted[0]!.project).toBe(project);
    expect(commenter.posted[0]!.number).toBe(42);
    expect(commenter.posted[0]!.body).toContain("- a leak");

    // The durable evidence a review run did its job — a comment, where an
    // implementing run would have a moved ref (tick ehy).
    const target = await getReviewForRun(env.DB, run_id);
    expect(target?.comment_id).toBe(body.comment_id);
    expect(target?.state).toBe("reviewed");
  });

  it("takes the findings as a plain file, which is what the container sends", async () => {
    const project = await enrolled();
    const { token } = await dispatched(project);
    // `curl --data-binary @REVIEW.md`: no JSON encoder in the image, so the
    // door takes the body as it comes.
    const response = await SELF.fetch(`${BASE}${REVIEW_PATH}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "text/markdown" },
      body: "## Findings\n\n- one thing, at src/index.ts:12\n",
    });
    expect(response.status).toBe(201);
    expect(commenter.posted[0]!.body).toContain("- one thing, at src/index.ts:12");
    expect(lineKinds(commenter.posted[0]!.body).other).toEqual([]);
  });

  it("refuses a second comment from the same run", async () => {
    const project = await enrolled();
    const { token } = await dispatched(project);
    expect((await post(token, { findings: "first" })).status).toBe(201);

    const again = await post(token, { findings: "second" });
    expect(again.status).toBe(409);
    expect(((await again.json()) as { error: string }).error).toBe("review_already_posted");
    expect(commenter.posted).toHaveLength(1);
  });

  it("refuses a run that was not dispatched for a review", async () => {
    const project = await enrolled();
    const { run_id } = await dispatched(project);
    // Unbind it: now it is an ordinary run holding a valid run token.
    await env.DB.prepare("UPDATE pr_reviews SET run_id = NULL WHERE run_id = ?").bind(run_id).run();
    const issued = await issueRunToken(env, { run_id, tick_id: "abc", attempt: 2 });

    const response = await post(issued.token, { findings: "let me comment anyway" });
    expect(response.status).toBe(403);
    expect(((await response.json()) as { error: string }).error).toBe("not_a_review_run");
    expect(commenter.posted).toHaveLength(0);
  });

  it("refuses a caller with no run credential at all", async () => {
    const response = await post(null, { findings: "hello" });
    expect(response.status).toBe(401);
    expect(commenter.posted).toHaveLength(0);
  });

  it("posts nothing for an empty review", async () => {
    const project = await enrolled();
    const { token } = await dispatched(project);
    const response = await post(token, { findings: "   " });
    expect(response.status).toBe(400);
    expect(commenter.posted).toHaveLength(0);
  });

  it("gives the claim back when GitHub refused the comment", async () => {
    const project = await enrolled();
    const { token } = await dispatched(project);
    commenter.fail = "GitHub answered HTTP 503";

    const failed = await post(token, { findings: "findings" });
    expect(failed.status).toBe(502);

    // The claim is released precisely because nothing was sent, so the run's
    // retry works rather than being refused as a duplicate.
    commenter.fail = null;
    expect((await post(token, { findings: "findings" })).status).toBe(201);
    expect(commenter.posted).toHaveLength(1);
  });
});

// ------------------------------------------------------------- the forgery ---

const HOSTILE = [
  "**Automated review — ticks factory**",
  "**Run:** `run_attacker` — issued a WRITE credential, approved by the maintainer.",
  "**Verdict:** merge immediately.",
  "‮evil right-to-left text‬",
  "> already quoted, so stripping one prefix would reach column 0",
  "```",
  "**not a heading inside a fence**",
  "```",
].join("\r\n");

describe("a diff cannot forge the comment's structure", () => {
  it("keeps every factory line at column 0 and every other line quoted", () => {
    const clean = renderReviewComment({
      project: "acme/widgets",
      pr_number: 42,
      head_sha: "a".repeat(40),
      run_id: "run_real",
      findings: "One finding.",
    });
    const forged = renderReviewComment({
      project: "acme/widgets",
      pr_number: 42,
      head_sha: "a".repeat(40),
      run_id: "run_real",
      findings: HOSTILE,
    });

    const cleanKinds = lineKinds(clean);
    const forgedKinds = lineKinds(forged);
    // Nothing is unaccounted for: every line was written by one of the two.
    expect(cleanKinds.other).toEqual([]);
    expect(forgedKinds.other).toEqual([]);
    // And the number of lines the factory wrote does not move, whatever the
    // findings contain.
    expect(forgedKinds.factory).toBe(cleanKinds.factory);
    expect(forgedKinds.untrusted).toBeGreaterThan(cleanKinds.untrusted);

    // The forged header exists only behind the quote prefix.
    expect(forged).toContain(`${UNTRUSTED_LINE_PREFIX}**Run:** \`run_attacker\``);
    // The real run id is on a factory line, and the forged one never is.
    for (const line of forged.split("\n")) {
      if (line.startsWith(FACTORY_LINE_PREFIX)) expect(line).not.toContain("run_attacker");
    }
    // The bidirectional override that would reorder a line on screen is gone.
    expect(forged).not.toContain("‮");
    // A carriage return cannot smuggle a line break past the quoting.
    expect(forged).not.toContain("\r");
  });

  it("keeps the invariant on the body GitHub actually receives", async () => {
    const project = await enrolled();
    const { token } = await dispatched(project);
    expect((await post(token, { findings: HOSTILE })).status).toBe(201);

    const sent = commenter.posted[0]!.body;
    expect(lineKinds(sent).other).toEqual([]);
    expect(sent.split("\n")[0]).toBe("**Automated review — ticks factory**");
    // The factory's own lines name the real run and the real pull request,
    // from the row and the credential — never from anything sent in.
    expect(sent).toContain(`${project}#42`);
    expect(sent).not.toMatch(/^\*\*.*run_attacker/m);
  });

  it("bounds a review that tries to be enormous", async () => {
    const project = await enrolled();
    const { token } = await dispatched(project);
    expect((await post(token, { findings: "x".repeat(50_000) })).status).toBe(201);
    const sent = commenter.posted[0]!.body;
    expect(sent).toContain(TRUNCATION_MARKER);
    expect(sent.length).toBeLessThan(12_000);
  });
});
