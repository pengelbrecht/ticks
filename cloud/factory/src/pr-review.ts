/**
 * Read-only pull request review runs (UC5, tick v7g) — the first autonomous
 * loop, and deliberately the safest one.
 *
 * A pull request is opened against an enrolled repository; Phase 3's webhook
 * door receives it; a run is dispatched on the READ-ONLY credential grade tick
 * pzf built; the run reads the diff, writes its findings, and this module
 * turns them into one comment on that pull request.
 *
 * It is sequenced before CI remediation on purpose: **the worst outcome of a
 * bad review is a bad comment; the worst outcome of bad remediation is a bad
 * commit.** So the shape is proven here, where the blast radius is prose.
 *
 * ## Four rules, and each one is a mechanism rather than an instruction
 *
 * **1. The run could not have pushed.** The submission names
 * `credential_grade: "read_only"`, which is settled at submission and recorded
 * on the run row — never supplied by a container. From there tick pzf's
 * machinery does the rest: the sandbox never receives the operator's GitHub
 * credential at all, its remote points at the factory's own git door, and that
 * door has no write side. A `git push` dies at the door; a direct call to
 * github.com is anonymous, because the only secret in the container is a
 * `tkr_` token github.com has never heard of. See `repo-wiki/credential-grades.md`.
 *
 * **2. The run cannot name the pull request it comments on.** The credential
 * says which run is speaking ({@link authorizeRunCredential}); the
 * `pr_reviews` row says which pull request that run was dispatched for. There
 * is no field in the request body for a PR number, so a container cannot ask
 * to comment somewhere else — the same rule `wave-request.ts` establishes for
 * dispatch, and the reason the wiki asked for a narrow endpoint rather than a
 * path-allowlisted REST proxy: a proxy hands the caller the whole request, and
 * "the caller may not forge the body" would have been an instruction again.
 *
 * **3. The diff cannot forge the comment's structure.** A PR body and a diff
 * are written by whoever opened the pull request, and the review comment is a
 * surface a maintainer reads and acts on. Phase 3's invariant therefore
 * carries over unchanged, and this is the second surface to keep it:
 *
 * > Every line the factory wrote begins at column 0; every line that came from
 * > anywhere else begins with {@link UNTRUSTED_LINE_PREFIX}.
 *
 * Note *anywhere else* — it is wider here than in `github-issues.ts`. There
 * the untrusted half was the reporter's body. Here the findings themselves are
 * untrusted: they were written by a model that had just read a hostile diff,
 * so text the diff planted can reach the comment through the reviewer without
 * the reviewer being compromised in any interesting sense. {@link
 * renderReviewComment} quotes them for exactly that reason, and the factory's
 * own lines carry nothing but structural fields (project, number, sha, run id)
 * — no title, no branch name, no author-supplied string of any kind.
 *
 * **4. A pull request is reviewed once, and commented on at most once.** The
 * `pr_reviews` row's UNIQUE `pr_node_id` is the dedup (GitHub redelivers, with
 * no bound on how late), and `posted_at` is claimed by a conditional UPDATE
 * before the comment is sent, so two concurrent posts cannot both reach
 * GitHub. Posting is at-most-once by construction: a factory that dies between
 * the claim and the comment loses that comment rather than sending two, which
 * is the safe direction for a write onto a stranger's pull request.
 *
 * ## What is deliberately NOT here
 *
 * No second webhook door. `POST /api/hooks/github` already verifies GitHub's
 * HMAC over the raw body and already knows about enrolment; this module is
 * dispatched from it on the `pull_request` event, exactly as `issues` is
 * dispatched to `github-issues.ts`.
 *
 * No second dispatch mechanism either. The review runs through `submitRun` and
 * the Run Workflow like every other run — same lease, same budgets, same
 * gateway credential, same stop — booting one container in the `review` phase.
 * A separate "review executor" would have been a second supervisor to keep
 * correct.
 */

import { credentialGrade, gradeMayWrite } from "./credentials";
import { getEnrolledProject } from "./db";
import { authorizeRunCredential, type GatewayDenial } from "./gateway";
import { GITHUB_API_BASE_URL } from "./progress";
import { submitRun, type RunSubmission } from "./runs";
import { newTraceID } from "./trace";
import {
  MAX_UNTRUSTED_CHARS,
  MAX_UNTRUSTED_LINES,
  UNTRUSTED_LINE_PREFIX,
  quoteUntrusted,
  sanitizeUntrusted,
  sanitizeUntrustedLine,
} from "./untrusted-text";

import type { Env } from "./index";

// ------------------------------------------------------------- vocabulary ---

/** The webhook event this module reads. `github-issues.ts` reads `issues`. */
export const PULL_REQUEST_EVENT = "pull_request";

/**
 * The actions that dispatch a review.
 *
 * `opened` is the acceptance criterion's own word. `reopened` is here because
 * a PR closed and reopened is being asked for again, and `ready_for_review` is
 * how a draft says it is now asking — a draft is explicitly NOT asking, which
 * is why {@link classifyPullRequestEvent} ignores one however it was opened.
 *
 * `synchronize` — a push to the PR branch — is deliberately absent. It fires
 * on every commit, so reviewing on it would make one contributor's push loop
 * an unbounded spend on the operator's account, and the dedup below would
 * refuse the second review anyway. Re-review on push is a per-repository
 * policy question, and this tick's job is to prove the shape.
 */
export const REVIEWING_ACTIONS = ["opened", "reopened", "ready_for_review"] as const;

/**
 * The door a review run posts its findings to. Exempt from the FACTORY bearer
 * token in `src/auth.ts` for the same reason `/api/wave` is: its caller is a
 * sandbox, and a sandbox must never hold the operator's credential.
 *
 * There is no PR number in the path, and that is rule 2 above expressed as a
 * URL: the credential decides which run is speaking, and the run's row decides
 * which pull request it may reach.
 */
export const REVIEW_PATH = "/api/review";

/**
 * What a review run's `epic` field says.
 *
 * A review run has no epic — it implements no tick and closes nothing — but
 * `runs.epic` is NOT NULL and is what the RunRoom's queue and the dispatch log
 * are keyed by. So it carries the one identifier that is actually true of this
 * run, in a form no tick id can collide with (tick ids are 3-4 base36 chars).
 */
export const REVIEW_EPIC_PREFIX = "pr-";

export function reviewEpic(number: number): string {
  return `${REVIEW_EPIC_PREFIX}${number}`;
}

/** Bounds on the findings. Same numbers as every other untrusted field. */
export const MAX_FINDINGS_CHARS = MAX_UNTRUSTED_CHARS;
export const MAX_FINDINGS_LINES = MAX_UNTRUSTED_LINES;

const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const NODE_ID_PATTERN = /^[A-Za-z0-9_=-]{1,255}$/;
const PROJECT_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;

// ------------------------------------------------------------- the verdict ---

/** What a `pull_request` delivery is, once its structural fields are read. */
export type PullRequestFacts = {
  /** `owner/repo` of the BASE repository — never the head, which may be a fork. */
  project: string;
  action: string;
  number: number;
  /** The dedup key: stable across edit, rename, reopen and transfer. */
  node_id: string;
  /** The commit under review, on the base repository's `refs/pull/<n>/head`. */
  head_sha: string;
  /** The commit the run clones: a pushed SHA on the base repository (D3). */
  base_sha: string;
  /** The author. A stranger, in the case this module is about. */
  author: string;
};

export type PullRequestVerdict =
  | { verdict: "review"; facts: PullRequestFacts }
  | { verdict: "ignored"; reason: string; detail: string }
  | { verdict: "refused"; reason: string; detail: string };

function ignored(reason: string, detail: string): PullRequestVerdict {
  return { verdict: "ignored", reason, detail };
}

function refused(reason: string, detail: string): PullRequestVerdict {
  return { verdict: "refused", reason, detail };
}

function login(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  return LOGIN_PATTERN.test(value) ? value : "";
}

function sha(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return SHA_PATTERN.test(value) ? value : "";
}

/**
 * Reads one `pull_request` payload and says whether it is a review to run.
 *
 * Pure, for `classifyIssueEvent`'s reason: this is the rule, and a rule
 * reachable only through an HTTP route with a valid HMAC is a rule that gets
 * tested once.
 *
 * Every field it keeps comes from a structural field GitHub itself controls.
 * The title and body are not among them — not sanitised-and-kept, simply not
 * read. Nothing downstream needs them (the comment lands ON the pull request,
 * where a human already sees its title), and a field that is never read is a
 * field no sanitiser can be wrong about.
 */
export function classifyPullRequestEvent(payload: unknown): PullRequestVerdict {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return refused("invalid_payload", "a pull_request event must be an object");
  }
  const event = payload as Record<string, unknown>;

  const repository = event.repository as { full_name?: unknown } | undefined;
  const project = typeof repository?.full_name === "string" ? repository.full_name.trim() : "";
  if (!PROJECT_PATTERN.test(project)) {
    return refused("invalid_payload", "repository.full_name must be owner/repo");
  }

  const action = typeof event.action === "string" ? event.action.trim() : "";
  if (action === "") return refused("invalid_payload", "the event names no action");

  const pr = event.pull_request as Record<string, unknown> | undefined;
  if (pr === null || pr === undefined || typeof pr !== "object") {
    return refused("invalid_payload", "the event carries no pull_request");
  }

  const number =
    typeof pr.number === "number" && Number.isInteger(pr.number) && pr.number > 0 ? pr.number : -1;
  if (number < 0) return refused("invalid_payload", "the pull request has no number");

  const nodeID = typeof pr.node_id === "string" ? pr.node_id.trim() : "";
  if (!NODE_ID_PATTERN.test(nodeID)) {
    return refused(
      "invalid_payload",
      `${project}#${number} carries no usable node id, which is the dedup key — without it a ` +
        "redelivery would be a second paid run and a second comment"
    );
  }

  if (!(REVIEWING_ACTIONS as readonly string[]).includes(action)) {
    return ignored(
      "not_a_reviewing_action",
      `${project}#${number}: nothing is reviewed on \`${action}\``
    );
  }

  // A draft is the author saying "not yet". `ready_for_review` is the action
  // that withdraws that, and it carries `draft: false`, so nothing is lost by
  // declining here — and an unattended comment on work somebody is still
  // writing is exactly the noise this loop must not produce.
  if (pr.draft === true) {
    return ignored("draft", `${project}#${number} is a draft`);
  }

  const state = typeof pr.state === "string" ? pr.state.trim() : "open";
  if (state !== "open") return ignored("pull_request_closed", `${project}#${number} is ${state}`);

  const head = pr.head as Record<string, unknown> | undefined;
  const base = pr.base as Record<string, unknown> | undefined;
  const headSHA = sha(head?.sha);
  const baseSHA = sha(base?.sha);
  if (headSHA === "" || baseSHA === "") {
    return refused(
      "invalid_payload",
      `${project}#${number} names no head/base commit; a run is submitted at a pushed SHA (D3)`
    );
  }

  const author = login((pr.user as { login?: unknown } | undefined)?.login);

  return {
    verdict: "review",
    facts: {
      project,
      action,
      number,
      node_id: nodeID,
      head_sha: headSHA,
      base_sha: baseSHA,
      author: author === "" ? "unknown" : author,
    },
  };
}

// ------------------------------------------------------------ the claim row ---

/** One pull request this factory has claimed, dispatched or reviewed. */
export type ReviewTarget = {
  pr_node_id: string;
  project: string;
  pr_number: number;
  head_sha: string;
  base_sha: string;
  run_id: string | null;
  state: string;
  detail: string | null;
  posted_at: string | null;
  comment_id: string | null;
  claimed_at: string;
};

/**
 * Claims a pull request for review, or reports that it is already claimed.
 *
 * The UNIQUE `pr_node_id` is what decides — an `INSERT` that violates it is
 * the duplicate answer, not an error to handle — so two concurrent deliveries
 * of the same pull request cannot both dispatch a run.
 */
export async function claimPullRequestReview(
  db: D1Database,
  facts: PullRequestFacts
): Promise<{ claimed: boolean; existing: ReviewTarget | null }> {
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO pr_reviews
         (pr_node_id, project, pr_number, head_sha, base_sha, run_id, state, detail, posted_at, comment_id, claimed_at)
       VALUES (?, ?, ?, ?, ?, NULL, 'claiming', NULL, NULL, NULL, ?)`
    )
    .bind(
      facts.node_id,
      facts.project,
      facts.number,
      facts.head_sha,
      facts.base_sha,
      new Date().toISOString()
    )
    .run();
  if ((result.meta.changes ?? 0) > 0) return { claimed: true, existing: null };
  return { claimed: false, existing: await getReviewByNode(db, facts.node_id) };
}

/** Releases a claim that dispatched nothing, so a redelivery may retry it. */
export async function releasePullRequestClaim(db: D1Database, nodeID: string): Promise<void> {
  await db
    .prepare("DELETE FROM pr_reviews WHERE pr_node_id = ? AND run_id IS NULL")
    .bind(nodeID)
    .run();
}

/** Binds a claimed pull request to the run that will review it. */
export async function bindReviewRun(
  db: D1Database,
  nodeID: string,
  runID: string,
  state: string,
  detail: string | null
): Promise<void> {
  await db
    .prepare("UPDATE pr_reviews SET run_id = ?, state = ?, detail = ? WHERE pr_node_id = ?")
    .bind(runID, state, detail, nodeID)
    .run();
}

export async function getReviewByNode(
  db: D1Database,
  nodeID: string
): Promise<ReviewTarget | null> {
  return await db
    .prepare("SELECT * FROM pr_reviews WHERE pr_node_id = ?")
    .bind(nodeID)
    .first<ReviewTarget>();
}

/**
 * The pull request a run was dispatched for, or null for a run that was not.
 *
 * This is the whole of "a container cannot name a pull request": every caller
 * that needs a PR number asks this, keyed by the run the CREDENTIAL named.
 */
export async function getReviewForRun(db: D1Database, runID: string): Promise<ReviewTarget | null> {
  return await db
    .prepare("SELECT * FROM pr_reviews WHERE run_id = ?")
    .bind(runID)
    .first<ReviewTarget>();
}

/**
 * Claims the right to post this run's one comment.
 *
 * `WHERE posted_at IS NULL` is the whole of at-most-once: the second caller
 * changes no rows and is refused, whether it is a retry, a second container or
 * a confused agent calling twice.
 */
export async function claimReviewPost(
  db: D1Database,
  runID: string,
  at: string
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE pr_reviews SET posted_at = ?, state = 'posting' WHERE run_id = ? AND posted_at IS NULL")
    .bind(at, runID)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

/** Gives the claim back after a post that did not happen. */
export async function releaseReviewPost(db: D1Database, runID: string): Promise<void> {
  await db
    .prepare(
      "UPDATE pr_reviews SET posted_at = NULL, state = 'dispatched' WHERE run_id = ? AND comment_id IS NULL"
    )
    .bind(runID)
    .run();
}

/** Records the comment that landed — the durable evidence a review run did its job. */
export async function recordReviewComment(
  db: D1Database,
  runID: string,
  commentID: string
): Promise<void> {
  await db
    .prepare("UPDATE pr_reviews SET comment_id = ?, state = 'reviewed' WHERE run_id = ?")
    .bind(commentID, runID)
    .run();
}

// ------------------------------------------------------------ the dispatch ---

/**
 * The run one pull request becomes.
 *
 * Two fields carry the whole tick:
 *
 *  - `credential_grade: "read_only"` — asked for at submission, because a
 *    grade is never inferred (tick pzf) and a review has no business holding a
 *    credential that can push to the branch it is reviewing.
 *  - `base_sha` — the pull request's BASE commit, which is a pushed commit on
 *    the repository the factory is enrolled against. The head may live in a
 *    fork the operator's credential has no business cloning; the diff is
 *    reachable from the base repository regardless, because GitHub serves a
 *    pull request's head as `refs/pull/<n>/head` there — which the factory's
 *    read-only git door forwards like any other read.
 *
 * `queue: true` because a review must not be lost to an epic run holding the
 * project's dispatch lease. It parks and ignites on release, as the same run
 * id, so the binding written by {@link ingestPullRequestEvent} still names it.
 */
export function reviewRunSubmission(facts: PullRequestFacts, traceID?: string): RunSubmission {
  return {
    project: facts.project,
    epic: reviewEpic(facts.number),
    base_sha: facts.base_sha,
    // Attribution, never authority: nothing downstream reads this to decide
    // anything, and the login has already been through GitHub's own alphabet.
    requested_by: `github-pr:${facts.author}`,
    trace_id: traceID ?? newTraceID(),
    queue: true,
    credential_grade: "read_only",
    origin: "cloud",
  };
}

export type PullRequestIngestResult =
  | {
      state: "dispatched";
      run_id: string;
      queued: boolean;
      facts: PullRequestFacts;
      detail: string;
    }
  | { state: "ignored"; reason: string; detail: string }
  | { state: "refused"; reason: string; detail: string }
  /** Nothing was recorded and nothing dispatched: the caller answers 503. */
  | { state: "deferred"; reason: string; detail: string };

/**
 * One pull request, all the way to a dispatched review run.
 *
 * The order of the three gates is the argument, and it is `github-issues.ts`'s
 * order for the same reasons:
 *
 *  1. **The payload** — settled by a pure function, so a malformed delivery
 *     costs nothing.
 *  2. **Enrolment** — a fact about THIS deployment. A pull request opened
 *     against a repository the operator never enrolled must not spend their
 *     money, and checking it before the claim means an unenrolled repository
 *     cannot fill this table either.
 *  3. **The claim** — the dedup, and the point past which a redelivery is
 *     answered from the row rather than by a second run.
 */
export async function ingestPullRequestEvent(
  env: Env,
  payload: unknown
): Promise<PullRequestIngestResult> {
  const verdict = classifyPullRequestEvent(payload);
  if (verdict.verdict !== "review") {
    return { state: verdict.verdict, reason: verdict.reason, detail: verdict.detail };
  }
  const facts = verdict.facts;

  if ((await getEnrolledProject(env.DB, facts.project)) === null) {
    return {
      state: "ignored",
      reason: "project_not_enrolled",
      detail:
        `${facts.project} is not enrolled with this factory; anyone can open a pull request ` +
        "against a public repository, and enrolment is the operator saying which repositories " +
        "may spend their money",
    };
  }

  const claim = await claimPullRequestReview(env.DB, facts);
  if (!claim.claimed) {
    const existing = claim.existing;
    return {
      state: "ignored",
      reason: "duplicate",
      detail:
        `${facts.project}#${facts.number} was already claimed for review` +
        (existing?.run_id === null || existing?.run_id === undefined
          ? ""
          : ` by run ${existing.run_id}`) +
        (existing?.comment_id === null || existing?.comment_id === undefined
          ? ""
          : `, which has already commented (${existing.comment_id})`),
    };
  }

  const submission = reviewRunSubmission(facts);
  let result;
  try {
    result = await submitRun(env, submission);
  } catch (error) {
    await releasePullRequestClaim(env.DB, facts.node_id);
    return {
      state: "deferred",
      reason: "submission_failed",
      detail: `${facts.project}#${facts.number} could not be submitted: ${String(error)}`,
    };
  }

  if (result.outcome === "started") {
    const runID = result.started.run.run_id;
    const detail = `${facts.project}#${facts.number} is being reviewed by run ${runID}`;
    await bindReviewRun(env.DB, facts.node_id, runID, "dispatched", detail);
    return { state: "dispatched", run_id: runID, queued: false, facts, detail };
  }
  if (result.outcome === "queued") {
    const runID = result.queued.run_id;
    const detail =
      `${facts.project}#${facts.number} is queued behind run ${result.holder.run_id}; it ` +
      `ignites as run ${runID} when the project's dispatch lease frees`;
    await bindReviewRun(env.DB, facts.node_id, runID, "queued", detail);
    return { state: "dispatched", run_id: runID, queued: true, facts, detail };
  }

  // Nothing is running, so the claim is given back: a claim that outlives the
  // run it was taken for would make this pull request permanently unreviewable
  // by a redelivery that could otherwise have worked.
  await releasePullRequestClaim(env.DB, facts.node_id);
  if (result.outcome === "unavailable") {
    return { state: "deferred", reason: "factory_unavailable", detail: result.detail };
  }
  return { state: "refused", reason: result.outcome, detail: result.detail };
}

// --------------------------------------------------------- the presentation ---

/**
 * The line every factory-written line of a review comment begins with.
 *
 * Markdown's bold marker rather than `github-issues.ts`'s `<b>`, because a
 * GitHub comment is markdown where a Telegram message is HTML — but the same
 * invariant, checkable the same way: a reader (and a test) can tell who wrote
 * a line by looking at its first two characters.
 */
export const FACTORY_LINE_PREFIX = "**";

/** What the factory says about itself, so a reader knows what produced this. */
export const REVIEW_COMMENT_HEADING = "**Automated review — ticks factory**";

export type ReviewCommentInput = {
  project: string;
  pr_number: number;
  head_sha: string;
  run_id: string;
  /** The run's own words, which are NOT trusted. See the module header. */
  findings: string;
};

/**
 * The comment, composed by the FACTORY rather than by the run.
 *
 * The run supplies one thing — prose — and everything structural is written
 * here from fields the run never chose: the project and PR number come from
 * the `pr_reviews` row, the run id from the credential that authenticated the
 * request. That is what makes "the diff cannot forge the comment's structure"
 * mechanical: there is no path from the diff to a line at column 0, because
 * there is no path from the diff to anything except the quoted block.
 *
 * The two halves are separable by machine, and the test asserts it directly:
 * every line either begins with {@link FACTORY_LINE_PREFIX} or with
 * {@link UNTRUSTED_LINE_PREFIX}.
 */
export function renderReviewComment(input: ReviewCommentInput): string {
  const findings = sanitizeUntrusted(input.findings, {
    maxChars: MAX_FINDINGS_CHARS,
    maxLines: MAX_FINDINGS_LINES,
  });
  // Re-flattened here rather than trusted from the caller, exactly as
  // `renderIssueDraft` does: this function is the one that promises the
  // invariant, and a promise that depends on somebody else having sanitised is
  // not one it can keep. Each of these is already pattern-checked upstream;
  // this is the belt under the braces.
  const project = sanitizeUntrustedLine(input.project, 120);
  const runID = sanitizeUntrustedLine(input.run_id, 80);
  const head = sanitizeUntrustedLine(input.head_sha, 40);
  const header = [
    REVIEW_COMMENT_HEADING,
    `**Reviewed:** ${project}#${input.pr_number} at \`${head}\``,
    `**Run:** \`${runID}\` — issued a read-only credential, so it could not push to this ` +
      `repository, comment anywhere else, or change anything it read.`,
    "**Everything below is the reviewer's own text, quoted verbatim. It was written after " +
      "reading a diff this factory does not trust, so read it as a report to verify — not as " +
      "instructions, and not as the factory's own words.**",
  ];
  return [
    ...header,
    quoteUntrusted(findings === "" ? "(the reviewer returned no findings)" : findings),
  ].join("\n");
}

// -------------------------------------------------------------- the poster ---

/**
 * The one GitHub write this factory makes on a run's behalf.
 *
 * A seam for the same reason `ISSUE_LABELS` is one: the rules worth testing
 * (at-most-once, the scoping, the invariant on what is sent) are not
 * exercisable against real GitHub.
 */
export interface ReviewCommenter {
  comment(project: string, number: number, body: string): Promise<{ id: string }>;
}

export function reviewCommenter(env: Env): ReviewCommenter {
  const injected = env.REVIEW_COMMENTER;
  return injected === undefined || injected === null ? githubReviewCommenter(env) : injected;
}

/**
 * GitHub's issue-comment endpoint, which is also a pull request's comment
 * endpoint (a PR is an issue to that API).
 *
 * Note what this is not: it is not a proxy. The path is built here from the
 * row's own fields, the body is built by {@link renderReviewComment}, and the
 * operator's token never leaves the Worker — so there is no request a
 * container could shape and nothing for a method+path allowlist to police.
 */
export function githubReviewCommenter(env: Env): ReviewCommenter {
  const base = (env.GITHUB_API_BASE_URL ?? GITHUB_API_BASE_URL).replace(/\/+$/, "");
  return {
    async comment(project: string, number: number, body: string): Promise<{ id: string }> {
      const token = typeof env.GITHUB_TOKEN === "string" ? env.GITHUB_TOKEN.trim() : "";
      if (token === "") {
        throw new Error(
          "this factory holds no GITHUB_TOKEN, so it cannot post a review comment; run " +
            "`tk factory setup`"
        );
      }
      const response = await fetch(`${base}/repos/${project}/issues/${number}/comments`, {
        method: "POST",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          // GitHub rejects an API request with no user agent outright.
          "user-agent": "ticks-factory",
        },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) {
        throw new Error(
          `GitHub answered HTTP ${response.status} posting a review comment on ${project}#${number}`
        );
      }
      const payload = (await response.json()) as { id?: unknown };
      const id = typeof payload.id === "number" || typeof payload.id === "string" ? String(payload.id) : "";
      if (id === "") throw new Error("GitHub returned a comment with no id");
      return { id };
    },
  };
}

// ---------------------------------------------------------------- the door ---

export type ReviewPostResult =
  | { ok: true; comment_id: string; project: string; pr_number: number; body: string }
  | { ok: false; denial: GatewayDenial };

/**
 * `POST /api/review` — a review run handing in its findings.
 *
 * The order of the checks is the argument, and it mirrors the git door's:
 *
 * 1. **The credential decides which run is speaking.** A container cannot name
 *    a run it is not.
 * 2. **The run's own row decides which pull request it may reach.** A run with
 *    no row is not a review run and is refused — including every ordinary epic
 *    run, which is what stops this door being a way for any container to
 *    comment on any pull request in an enrolled repository.
 * 3. **The post is claimed before it is sent.** At-most-once, by a conditional
 *    UPDATE rather than by a check-then-act.
 */
export async function postReviewFindings(env: Env, request: Request): Promise<ReviewPostResult> {
  const authorized = await authorizeRunCredential(env, extractRunToken(request));
  if (!authorized.ok) return { ok: false, denial: authorized.denial };
  const run = authorized.run;

  const target = await getReviewForRun(env.DB, run.run_id);
  if (target === null) {
    return {
      ok: false,
      denial: {
        status: 403,
        error: "not_a_review_run",
        detail:
          `run ${run.run_id} was not dispatched for a pull request review, so it has no pull ` +
          `request to comment on; ${REVIEW_PATH} is not a general GitHub door`,
      },
    };
  }
  if (target.project !== run.project) {
    // Unreachable through the ingestion path — the row is written with the
    // submission's own project — and checked anyway, because this is the one
    // place a mismatch would turn into a write on somebody else's repository.
    console.error(
      `factory review: run ${run.run_id} (project ${run.project}) is bound to a review on ${target.project}`
    );
    return {
      ok: false,
      denial: {
        status: 403,
        error: "review_project_mismatch",
        detail: `run ${run.run_id} belongs to ${run.project}, not to ${target.project}`,
      },
    };
  }

  // Two shapes, and the plain one is the shape the container actually uses.
  //
  // A review's findings are a markdown FILE, and `curl --data-binary @file`
  // puts a file on the wire with nothing in between. Wrapping it in JSON first
  // would add an encoding step to the one path where a mistake is a mangled
  // review or a refused post — and the encoder is the container's `jq`, which
  // is present but is one more thing to be right about arbitrary UTF-8 in a
  // shell pipeline. So the door takes the body as it comes; JSON is the
  // convenience form for a caller that already has one.
  const raw = await request.text();
  let findings: string;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("application/json")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        denial: { status: 400, error: "invalid_request", detail: "the body is not JSON" },
      };
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        denial: {
          status: 400,
          error: "invalid_request",
          detail: "a JSON body must be an object with a `findings` string",
        },
      };
    }
    const field = (parsed as { findings?: unknown }).findings;
    findings = typeof field === "string" ? field : "";
  } else {
    findings = raw;
  }
  if (findings.trim() === "") {
    return {
      ok: false,
      denial: {
        status: 400,
        error: "empty_findings",
        detail:
          "a review comment is not posted for an empty review: a run with nothing to say says " +
          "nothing, rather than leaving a maintainer an empty comment to read",
      },
    };
  }

  if (!(await claimReviewPost(env.DB, run.run_id, new Date().toISOString()))) {
    const current = await getReviewForRun(env.DB, run.run_id);
    return {
      ok: false,
      denial: {
        status: 409,
        error: "review_already_posted",
        detail:
          `run ${run.run_id} has already posted its review of ${target.project}#${target.pr_number}` +
          (current?.comment_id === null || current?.comment_id === undefined
            ? ""
            : ` (comment ${current.comment_id})`),
      },
    };
  }

  const body = renderReviewComment({
    project: target.project,
    pr_number: target.pr_number,
    head_sha: target.head_sha,
    run_id: run.run_id,
    findings,
  });

  let posted: { id: string };
  try {
    posted = await reviewCommenter(env).comment(target.project, target.pr_number, body);
  } catch (error) {
    // The claim goes back only because nothing was sent. A failure AFTER the
    // comment landed would strand the claim instead, which is the direction
    // this trade is deliberately biased in: one lost comment beats two posted.
    await releaseReviewPost(env.DB, run.run_id);
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      denial: {
        status: 502,
        error: "review_comment_failed",
        detail: `the review of ${target.project}#${target.pr_number} could not be posted: ${detail}`,
      },
    };
  }

  await recordReviewComment(env.DB, run.run_id, posted.id);
  return {
    ok: true,
    comment_id: posted.id,
    project: target.project,
    pr_number: target.pr_number,
    body,
  };
}

/**
 * The credential a container presents here.
 *
 * `Authorization: Bearer` and `x-api-key`, the two shapes every other run-token
 * door accepts — the container has the token in `TICKS_FACTORY_TOKEN`, and
 * curl is what sends it.
 */
export function extractRunToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header !== null) {
    const bearer = /^Bearer[ \t]+([^\s]+)$/i.exec(header.trim());
    if (bearer !== null) return bearer[1]!;
  }
  const apiKey = request.headers.get("x-api-key");
  return apiKey !== null && apiKey.trim() !== "" ? apiKey.trim() : null;
}

// ------------------------------------------------------------ the evidence ---

/**
 * Whether a review run actually did the job, read from the durable record.
 *
 * Tick ehy's rule, applied to a run that changes no branch by construction: a
 * process that exited 0 has said it has nothing more to do, not that it did
 * anything. For an implementing run the evidence is a moved ref; for a review
 * run it is a posted comment, and this is where the Run Workflow reads it.
 */
export async function reviewEvidence(
  db: D1Database,
  runID: string
): Promise<{ posted: boolean; detail: string }> {
  const target = await getReviewForRun(db, runID);
  if (target === null) {
    return { posted: false, detail: `run ${runID} has no pull request review record` };
  }
  if (target.comment_id === null) {
    return {
      posted: false,
      detail:
        `no review comment reached ${target.project}#${target.pr_number}: the run ended without ` +
        "posting one",
    };
  }
  return {
    posted: true,
    detail: `review comment ${target.comment_id} posted on ${target.project}#${target.pr_number}`,
  };
}

/**
 * A last defence at the boot site: a review run must be read-only.
 *
 * The submission always asks for `read_only`, so this can only fire on a row
 * that was edited by hand or written by a bundle that did not know about
 * grades. It refuses rather than downgrading, for `planSandboxGit`'s reason —
 * the failure mode of this path must never be "the run got more than it asked
 * for".
 */
export function reviewGradeComplaint(storedGrade: string | null | undefined): string | null {
  const grade = credentialGrade(storedGrade);
  if (!gradeMayWrite(grade)) return null;
  return (
    `this run is dispatched for a pull request review but carries a ${grade} credential; a ` +
    "review is read-only by construction and is refused rather than booted with a credential " +
    "that can push to the branch it is reviewing"
  );
}
