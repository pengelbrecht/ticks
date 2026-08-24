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
 * ## Who may spend the money (tick ytd)
 *
 * Enrolment used to be the ONLY gate, and that was an open door: anyone can
 * open a pull request against a public repository, so every stranger's PR
 * bought a paid run on the operator's account. The read-only grade bounded the
 * DAMAGE; nothing bounded the COST.
 *
 * Two mechanisms now do, and they answer different questions:
 *
 *  - **A gate**, {@link reviewConsent}. An author with write access to the
 *    base repository is reviewed automatically — that is the whole point of an
 *    automatic review, and requiring a maintainer to label their own team's
 *    pull requests would defeat it. Everybody else needs the consent label,
 *    which only somebody with triage rights can apply. See `consent.ts`.
 *  - **A backstop**, {@link reviewBudget}. A per-repository daily cap, because
 *    a gate is a judgement and a judgement can be wrong: `author_association`
 *    is GitHub's approximation of write access, not a permission check, and a
 *    trusted account can be compromised or simply prolific. Phase 2's lesson
 *    is that a bound you did not write is a bound that does not exist.
 *
 * The two are deliberately not alternatives. The gate decides WHO; the budget
 * decides HOW MUCH even when the gate said yes.
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

import { carriesLabel, consentLabel, labelNames } from "./consent";
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
 * `labeled` joined them in tick ytd, and without it the consent half of
 * {@link reviewConsent} would be unreachable: an outside contributor's pull
 * request is declined on `opened`, and GitHub does not redeliver `opened`
 * because a maintainer later applied a label. So the act of consenting has to
 * be a delivery of its own — exactly as it is for issues, where `labeled` is
 * the NORMAL path rather than the second one.
 *
 * `unlabeled` is absent for `github-issues.ts`'s reason: a removal is never an
 * act of consent. `synchronize` — a push to the PR branch — is absent for a
 * different one. It fires on every commit, so reviewing on it would make one
 * contributor's push loop an unbounded spend on the operator's account, and
 * the dedup below would refuse the second review anyway. Re-review on push is
 * a per-repository policy question.
 */
export const REVIEWING_ACTIONS = ["opened", "reopened", "ready_for_review", "labeled"] as const;

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

// ------------------------------------------------------------ author trust ---

/**
 * The `author_association` values this factory reads as "has write access to
 * the base repository".
 *
 * The field is on the `pull_request` object in every delivery, so this costs
 * no extra API call — which matters, because a gate that needs a round trip is
 * a gate that fails open the day GitHub is slow.
 *
 * **What GitHub's values actually mean**, since the gate is only as good as
 * this reading:
 *
 *  - `OWNER` — the author owns the repository.
 *  - `MEMBER` — the author is a member of the ORGANISATION that owns it.
 *  - `COLLABORATOR` — the author was granted collaborator access on the repo.
 *  - `CONTRIBUTOR` — the author has committed to the repository BEFORE but is
 *    neither. This one is the trap and it is why it is not on the list: a
 *    stranger whose first pull request was merged is promoted to
 *    `CONTRIBUTOR` for ever after, so trusting it would mean one merged PR
 *    buys unlimited paid runs.
 *  - `FIRST_TIME_CONTRIBUTOR`, `FIRST_TIMER`, `MANNEQUIN`, `NONE` — strangers.
 *
 * **And where the reading is approximate**, stated rather than implied:
 * `MEMBER` is organisation membership, not a permission check on THIS
 * repository, so an org whose base permission is `read` can have members this
 * gate calls trusted who cannot actually push; a `COLLABORATOR` can likewise
 * hold read-only access. The bias is deliberate and one-directional — the gate
 * may be slightly generous to people the operator has already let into their
 * organisation, and is never generous to a stranger. {@link reviewBudget} is
 * the bound that holds when this reading is wrong, and the read-only grade
 * still holds whatever it says.
 *
 * An association this factory does not recognise — absent, misspelled, or a
 * value GitHub adds after this was written — is untrusted. Fail closed: the
 * cost of being wrong in that direction is one review a maintainer has to ask
 * for with a label.
 */
export const WRITE_ACCESS_ASSOCIATIONS = ["OWNER", "MEMBER", "COLLABORATOR"] as const;

/** Whether an `author_association` means write access on the base repository. */
export function hasWriteAccess(association: string): boolean {
  const value = association.trim().toUpperCase();
  return (WRITE_ACCESS_ASSOCIATIONS as readonly string[]).includes(value);
}

/** GitHub's own alphabet for the field, so an unreadable one lands as `NONE`. */
const ASSOCIATION_PATTERN = /^[A-Z_]{1,40}$/;

function association(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return ASSOCIATION_PATTERN.test(value) ? value : "NONE";
}

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
  /** GitHub's own word for the author's standing. See {@link hasWriteAccess}. */
  author_association: string;
  /** Whether the consent label was on the pull request when this arrived. */
  consented: boolean;
  /**
   * Whether the head lives somewhere other than the base repository.
   *
   * Recorded, never decided on: a maintainer working from a fork is ordinary,
   * and their association says so. It is here because a fork PR from an
   * outside contributor is the exact case the gate exists for, and an operator
   * reading a refusal should be able to see it without opening GitHub. A head
   * repository that is absent (a fork deleted before delivery) reads as a
   * fork, which is the conservative direction.
   */
  from_fork: boolean;
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
 * field no sanitiser can be wrong about. The labels are read but not KEPT: the
 * facts carry one boolean, so a label named after a factory heading has no
 * path to any rendered line.
 *
 * It reads the consent facts and does not act on them — {@link reviewConsent}
 * is the gate, and it is separate so that "who may spend money" is one pure
 * function a test can enumerate rather than a branch buried in an ingestion.
 */
export function classifyPullRequestEvent(
  payload: unknown,
  options: { label: string }
): PullRequestVerdict {
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

  // The head repository, for the fork fact only. `head.repo` is null when the
  // fork was deleted between opening and delivery, and an absent name must not
  // read as "same repository" — hence the explicit default.
  const headRepo = head?.repo as { full_name?: unknown } | null | undefined;
  const headProject =
    typeof headRepo?.full_name === "string" ? headRepo.full_name.trim().toLowerCase() : "";

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
      author_association: association(pr.author_association),
      consented: carriesLabel(labelNames(pr.labels), options.label),
      from_fork: headProject !== project.toLowerCase(),
    },
  };
}

// ---------------------------------------------------------------- the gate ---

/**
 * Who may buy a review run, as one pure function.
 *
 * The rule, in one sentence: **a pull request whose author has write access to
 * the base repository is reviewed automatically; every other pull request
 * needs the consent label, which only somebody with triage rights can apply.**
 *
 * Why author trust is primary and the label is the fallback, rather than the
 * other way round (which is what issue ingestion does): the pull requests an
 * operator most wants reviewed automatically are their own team's, and a rule
 * that made a maintainer label each of those would have removed the
 * automatic-review feature to install a gate. Meanwhile the pull requests that
 * cost money without anybody asking are strangers', and those are precisely
 * the ones the association identifies. So the gate falls where the asymmetry
 * already is.
 *
 * Note what this is NOT: it is not a permission check, and it does not pretend
 * to be one — see {@link WRITE_ACCESS_ASSOCIATIONS} for exactly where the
 * reading is approximate, and {@link reviewBudget} for the bound that holds
 * when it is wrong.
 */
export type ReviewConsentVerdict =
  | { state: "allowed"; via: "author_trust" | "consent_label"; detail: string }
  | { state: "refused"; reason: "author_not_trusted"; detail: string };

export function reviewConsent(facts: PullRequestFacts, label: string): ReviewConsentVerdict {
  const where = `${facts.project}#${facts.number}`;
  if (hasWriteAccess(facts.author_association)) {
    return {
      state: "allowed",
      via: "author_trust",
      detail:
        `@${facts.author} is ${facts.author_association} on ${facts.project}, so ${where} is ` +
        "reviewed without anyone having to ask",
    };
  }
  if (facts.consented) {
    return {
      state: "allowed",
      via: "consent_label",
      detail:
        `@${facts.author} has no write access to ${facts.project} (${facts.author_association}), ` +
        `but ${where} carries \`${label}\` — which only somebody with triage rights on the ` +
        "repository can have applied",
    };
  }
  return {
    state: "refused",
    reason: "author_not_trusted",
    detail:
      `@${facts.author} has no write access to ${facts.project} (${facts.author_association}) ` +
      `and opened ${where}${facts.from_fork ? " from a fork" : ""}, so nothing is spent on it: ` +
      "enrolment says which repositories may spend the operator's money, not which strangers " +
      "may. Add " +
      `\`${label}\` to review it — applying a label needs triage rights, so the label is the ` +
      "human press",
  };
}

// ------------------------------------------------------------- the backstop ---

/**
 * Review runs one repository may buy inside {@link REVIEW_BUDGET_WINDOW_MS}.
 *
 * A backstop, not a gate. {@link reviewConsent} decides who; this decides how
 * much even when that answer was wrong — a compromised member account, an
 * organisation whose base permission turns out to be looser than the operator
 * believed, or simply a busy week nobody meant to pay for. Phase 2's lesson,
 * in one constant: the run that cost $49.80 against a $25 ceiling did so
 * because the number it checked was not the number that bounded it.
 *
 * Twenty is chosen to be invisible on a repository doing ordinary work and
 * decisive on one being farmed: a project merging twenty pull requests a day
 * is busy, a project opening a hundred is an incident. It is a constant rather
 * than a per-repository setting for `STRIKE_BUDGET`'s reason — a bound the
 * operator has to configure before it protects them is a bound that protects
 * nobody on the day it matters.
 */
export const REVIEW_BUDGET_PER_DAY = 20;

/** The rolling window the budget is counted over. One day, like the strike budget. */
export const REVIEW_BUDGET_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ReviewBudgetVerdict =
  | { state: "within_budget"; reviews: number; remaining: number }
  | { state: "exhausted"; reviews: number; detail: string };

/**
 * How much of this repository's daily review budget is left.
 *
 * Counted over the `pr_reviews` rows themselves rather than a second ledger,
 * because that table already IS the record of every pull request this factory
 * claimed — one row per review, written before the run and deleted again on
 * exactly the outcomes where nothing was dispatched. A separate counter would
 * be a second thing to keep in step with it.
 *
 * It counts rows whose run never bound as well, and that over-count is the
 * safe direction: an in-flight claim is a review about to happen, and a claim
 * that turns out to have dispatched nothing is deleted, so the over-count
 * heals itself within one delivery.
 *
 * Per (project) rather than per (project, author): the money is spent per run,
 * and counting per author would let ten accounts buy ten budgets — which is
 * the exact shape of the attack the gate above is for.
 */
export async function reviewBudget(
  db: D1Database,
  project: string,
  now = new Date()
): Promise<ReviewBudgetVerdict> {
  const since = new Date(now.getTime() - REVIEW_BUDGET_WINDOW_MS).toISOString();
  const row = await db
    .prepare("SELECT COUNT(*) AS reviews FROM pr_reviews WHERE project = ? AND claimed_at >= ?")
    .bind(project, since)
    .first<{ reviews: number }>();
  const reviews = row?.reviews ?? 0;
  if (reviews >= REVIEW_BUDGET_PER_DAY) {
    return {
      state: "exhausted",
      reviews,
      detail:
        `${project} has already bought ${reviews} review runs in the last 24 hours, which is its ` +
        `daily cap of ${REVIEW_BUDGET_PER_DAY}; nothing further is dispatched until the window ` +
        "rolls forward. This is the bound that holds when the author gate is wrong, so a run of " +
        "refusals here is worth reading as a question about who is opening these pull requests",
    };
  }
  return { state: "within_budget", reviews, remaining: REVIEW_BUDGET_PER_DAY - reviews };
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
 * The order of the gates is the argument, and it is `github-issues.ts`'s order
 * extended by tick ytd's two:
 *
 *  1. **The payload** — settled by a pure function, so a malformed delivery
 *     costs nothing.
 *  2. **Enrolment** — a fact about THIS deployment. A pull request opened
 *     against a repository the operator never enrolled must not spend their
 *     money, and checking it before the claim means an unenrolled repository
 *     cannot fill this table either.
 *  3. **Consent** — {@link reviewConsent}, and pure, so it is free and cannot
 *     fail open on a slow database. Before the budget because it is the
 *     cheaper of the two and because the budget should count the pull requests
 *     this factory would actually have reviewed.
 *  4. **The budget** — {@link reviewBudget}, one query, and before the claim
 *     so that a capped repository leaves no row (which would otherwise inflate
 *     tomorrow's count with reviews that never happened).
 *  5. **The claim** — the dedup, and the point past which a redelivery is
 *     answered from the row rather than by a second run.
 *
 * Every refusal above the claim is `ignored`, not `deferred`: each one is a
 * settled answer, and telling GitHub to redeliver a pull request whose author
 * still has no write access would be an infinite retry over a fixed decision.
 */
export async function ingestPullRequestEvent(
  env: Env,
  payload: unknown
): Promise<PullRequestIngestResult> {
  const label = consentLabel(env);
  const verdict = classifyPullRequestEvent(payload, { label });
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

  const consent = reviewConsent(facts, label);
  if (consent.state === "refused") {
    return { state: "ignored", reason: consent.reason, detail: consent.detail };
  }

  const budget = await reviewBudget(env.DB, facts.project);
  if (budget.state === "exhausted") {
    return { state: "ignored", reason: "review_budget_exhausted", detail: budget.detail };
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
    const detail =
      `${facts.project}#${facts.number} is being reviewed by run ${runID} (${consent.via})`;
    await bindReviewRun(env.DB, facts.node_id, runID, "dispatched", detail);
    return { state: "dispatched", run_id: runID, queued: false, facts, detail };
  }
  if (result.outcome === "queued") {
    const runID = result.queued.run_id;
    const detail =
      `${facts.project}#${facts.number} (${consent.via}) is queued behind run ` +
      `${result.holder.run_id}; it ignites as run ${runID} when the project's dispatch lease frees`;
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
