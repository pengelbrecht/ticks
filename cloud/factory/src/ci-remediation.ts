/**
 * CI-failure remediation: the loop with teeth (UC4, D10, tick meo).
 *
 * CI goes red on a branch the factory pushed; the factory dispatches a run to
 * drive it back to green. It is the loop that makes this a factory rather than
 * a launcher — the output feeds back in as the input — and for exactly that
 * reason it is the most dangerous thing in the bundle. Every other path spends
 * money once per human decision. This one spends money in response to its own
 * previous spend, so a wrong answer does not cost a run, it costs every run
 * until somebody notices.
 *
 * Three rules hold it, and all three are enforced HERE, in the dispatcher,
 * rather than asked of the agent's prompt. `.tick/learnings.md`, tick dxk: a
 * boundary the substrate can enforce must not rest on instruction-following —
 * compliance is a property of the model, not of the system. Phase 3 proved it
 * the expensive way, with a worker that committed tracker state its prompt
 * forbade in as many words.
 *
 * ## 1. Ownership is structural, and the type system carries it
 *
 * The factory may drive its OWN branches to green. It may never push to a
 * branch a person owns — that is UC5's problem (review it, do not touch it).
 *
 * "Owns" is a branch-name namespace ({@link FACTORY_BRANCH_NAMESPACES}), and
 * the check is not a condition somebody remembers to write at each call site.
 * {@link factoryOwnedBranch} is the ONLY constructor of
 * {@link FactoryOwnedBranch}, a branded string; {@link CheckFailureFacts}
 * carries that type and nothing else; {@link dispatchRemediation} accepts only
 * those facts. A remediation targeting `main` is therefore not a bug somebody
 * could write and a reviewer could miss — it does not typecheck.
 *
 * A brand is a compile-time argument, so the runtime keeps its own: the
 * dispatch site re-derives ownership from the branch string it was handed and
 * throws if it is not factory-owned. That assertion is unreachable through
 * this module's own doors. It exists for the caller who reaches for a cast,
 * and it is pinned by a test that performs exactly that cast.
 *
 * The namespace list is a compile-time constant and deliberately NOT
 * configurable. A repository-supplied ownership rule is a repository-supplied
 * way to widen what the factory may push to, and `worktree_branch_prefix` in
 * the Go herd config is a different question with a different blast radius:
 * that one names where a LOCAL orchestrator puts its work; this one is the
 * list of branches a cloud run may be pointed at without a person asking.
 *
 * ### What the brand does not prove, and what now does (ticks am2, t4y)
 *
 * All of the above is about PARSING, and it holds: the Phase 4 final review
 * went looking for the cast, the JSON boundary and a second constructor and
 * found none. What none of it does is verify that a branch is ACTUALLY the
 * factory's. Tick am2 examined that, chose to document rather than fix it, and
 * wrote the exposure down per namespace instead of implying it. That
 * documentation is below, unchanged and still true — it is the reason the
 * record exists, and the reason the name test can never be the whole answer.
 *
 * In this repository the naming convention is shared, and not narrowly:
 *
 *  - `tk herd spawn` names a worker's branch `<worktree_branch_prefix><tick-id>`
 *    and that prefix DEFAULTS TO `tick/`. Branches in the factory's first
 *    namespace are created on an operator's laptop, by the dozen, every wave.
 *  - The distinction is not repairable by shape. `tick/<epic>/<tick>` looks
 *    like the cloud worker's own two-segment name, but
 *    `skills/ticks/references/herdr-runner.md` documents setting
 *    `worktree_branch_prefix = "tick/<epic-id>/"` for exactly that layout — so
 *    a segment count separates nothing either.
 *  - `epic/<id>` is pushed by whichever orchestrator ran the epic. A cloud
 *    closeout pushes one; so does a person's local orchestrator, which is what
 *    happens in this repository today.
 *
 * And the exposure is not evenly spread over those three. This repo's
 * `.github/workflows/ci.yml` fires on `pull_request` and on pushes to `main`,
 * and nothing opens a pull request from a per-tick worker branch — so the
 * factory's OWN branches produce no `check_run` at all, while `.tick/config.md`
 * requires every epic to reach the default branch through a PR whose CI must be
 * green. The one branch in the claimed set that this repository actually grades
 * is therefore the one a person pushed.
 *
 * The fix the review named is a positive record: the factory writes down the
 * branches it creates, and ownership becomes a lookup. am2 gave three reasons
 * it was not that tick's, and tick t4y is what happened to them.
 *
 *  1. **The write side did not exist where the risk is.** A wave dispatch
 *     could record `tick/<epic>/<tick>` easily enough. The branches that
 *     matter are pushed from INSIDE a sandbox container, which has no D1
 *     handle — and "a record complete on the namespace with no live exposure
 *     and empty on the namespace that carries it is not a safety property, it
 *     is a decoration". **This was the actual work.** A container is not
 *     without a voice: tick wiy gave it an authenticated door to the control
 *     plane, identity taken from the run's own gateway token rather than
 *     claimed in a body. `branch-ownership.ts` is the same shape — a container
 *     records the branch it just created, for its own run's project and epic
 *     and no other. `cloud/sandbox/entrypoint.sh` and `worker.sh` call it at
 *     the moment they create a branch, so the record is written by the
 *     substrate rather than asked of an agent's prompt (`.tick/learnings.md`,
 *     tick dxk).
 *  2. **Required, it would refuse every delivery this repo can make.** It
 *     still refuses them — and that is now the DESIGNED behaviour rather than
 *     an outage, because the refusal is reported and answerable. A person
 *     records the branch (`POST /api/ci/branches`) and the loop resumes; a
 *     person records it as `human` and the loop leaves it alone for good. What
 *     changed is that "the loop is off" cannot happen quietly.
 *  3. **Its failure mode could not be made loud.** Tick zaw landed the daily
 *     digest in the same wave. A branch refused for want of a record is
 *     written to `unrecorded_branch` and reported every day until somebody
 *     answers — released by the record appearing, never by a clock and never
 *     by an acknowledgement.
 *
 * So {@link BRANCH_OWNERSHIP_BASIS} is now `creation_record`, and the name
 * test has become a NECESSARY condition rather than a sufficient one: a branch
 * outside {@link FACTORY_BRANCH_NAMESPACES} is refused without a database read
 * (cheapest, most final first), and a branch inside them still has to be
 * looked up. Nothing was removed — the brand, the single constructor and the
 * runtime re-derivation all still stand, and am2's per-namespace statement of
 * who else creates branches here is why the lookup exists.
 *
 * The residual risk am2 stated — **a branch a person named the way the factory
 * names its own is a branch this factory will push to** — is what this closes.
 * The two bounds it named still hold underneath: the branch must carry a
 * failing check on an ENROLLED project that survives the flake gate and the
 * strike budget, and the run that results is issued exactly
 * {@link REMEDIATION_CREDENTIAL_GRADE}.
 *
 * {@link FACTORY_BRANCH_NAMESPACE_OVERLAP} carries the per-namespace statement,
 * and a test requires an entry for every namespace claimed: the list cannot be
 * widened without saying who else is already there.
 *
 * ## 2. The flake gate: reproduce before you pay
 *
 * A test that fails intermittently must not be "fixed" over and over at cost.
 * This is not a theoretical risk in this repository: tick vy2 covers
 * load-dependent flakes here, Phase 2 lost time to a `TestSmokeGolden` flake
 * that a bisect finally settled, and tick vuz had to make one of 8sm's own
 * tests deterministic. The gate will meet real flakes.
 *
 * {@link flakeGate} answers with evidence, in this order:
 *
 *  - **A redelivery is not a second failure.** Every outcome is recorded under
 *    the check run's node id, which is UNIQUE in D1. GitHub redelivers freely,
 *    and a gate that counted deliveries would let GitHub's retry machinery
 *    manufacture the very reproduction the gate exists to demand.
 *  - **Both answers on one commit means flaky.** A success recorded for this
 *    check on this exact SHA — in the factory's own observations or in
 *    GitHub's history for the SHA — settles it. Same code, both outcomes.
 *  - **Red on the base branch is not ours.** If the check is already failing
 *    on the branch this one forked from, the branch did not break it, and a
 *    run sent to fix it would be sent to fix something it did not cause.
 *  - **One failure is a report; two are a reproduction.** A first failure
 *    records the observation, asks GitHub to re-run that check, and dispatches
 *    NOTHING. The re-run's own delivery is the second observation, and only
 *    then does a run start.
 *
 * When GitHub cannot be asked, the gate reaches NO verdict and records
 * nothing decisive — the door answers 503 and the delivery comes back. Tick
 * t2x's rule in a different system: "could not ask GitHub" must never resolve
 * to "assume the answer I wanted".
 *
 * ## 3. The strike budget: bounded attempts, then a person
 *
 * {@link STRIKE_BUDGET} remediation runs per branch per
 * {@link STRIKE_WINDOW_MS}. The budget counts DISPATCHES, not
 * failures-to-converge, because Phase 2 measured what a non-converging agent
 * costs — 100% of its tokens for 0% of the work; deepseek-v4-flash finished
 * one of three real ticks while spending the full budget on all three — and an
 * attempt whose outcome is still unknown has already spent the money. A fix
 * that works ends the loop by itself: the branch stops failing, so no further
 * signal arrives. Nothing has to notice that it worked.
 *
 * Past the budget the branch is ESCALATED, not retried: a durable row, one
 * message to the operator channel, and every later failure on that branch
 * refused in silence. The row is written before the message because the row is
 * the escalation and the message is only its delivery — a Telegram outage must
 * not be able to make a struck-out branch look un-escalated to the next
 * delivery and drop the loop back into dispatching.
 *
 * And the escalation is READ, which is the correction tick uls made. The
 * budget bounds a window; it never bounded the branch. For as long as that row
 * went unread, a struck-out branch resumed spending the moment its oldest
 * strike aged out of the rolling 24h — with `write` credentials, and silently,
 * because the escalation deduped against the row it had already written. What
 * reopens an escalated branch is a PERSON ({@link clearEscalation}, reachable
 * at {@link CI_ESCALATIONS_PATH}), and the release is named in the escalation
 * message itself. "Time passes" is the answer that caused the bug.
 *
 * ## 4. And when something unforeseen breaks
 *
 * The three governors above cover the failures this module predicted. An
 * unexpected throw is the failure it did not, and before tick uls it became an
 * unhandled 5xx — so the one path built to page a human was the one path that
 * said nothing when something genuinely unknown went wrong. `ci-webhook.ts`
 * catches at the door and writes a durable, alertable fault record instead,
 * deduped by the SHAPE of the failure for the same reason escalation is deduped
 * by branch: a redelivered crash must not be able to page anybody twice.
 *
 * ## The order of the governors, which is itself a decision
 *
 * Strike budget BEFORE flake gate. The gate's unconfirmed branch asks GitHub
 * to re-run a check, which spends CI minutes and produces another delivery; a
 * branch that has already exhausted its budget must not be able to keep
 * ordering re-runs. Cheapest, most final answer first.
 */

import {
  CI_BRANCHES_PATH,
  branchRecord,
  noteUnrecordedBranch,
  type BranchRecord,
} from "./branch-registry";
import { credentialGrade, type RunCredentialGrade } from "./credentials";
import {
  getEnrolledProject,
  insertDispatchLog,
  type DispatchReason,
} from "./db";
import { GITHUB_API_BASE_URL } from "./progress";
import { sendTelegramReport } from "./telegram";
import { newTraceID } from "./trace";
import { sanitizeUntrustedLine } from "./untrusted-text";
import { newRunID, submitRun, type RunSubmission } from "./runs";

import type { Env } from "./index";

// ------------------------------------------------------------- ownership ---

/**
 * The branch namespaces the factory owns, and the whole of the ownership test.
 *
 * `tick/` and `tick-run/` are what the design doc names for UC4; `epic/` is
 * what this repository's own integration branches use (`epic/szp`). A branch
 * outside these prefixes belongs to a person, whoever pushed it and whatever
 * it contains.
 *
 * Frozen at compile time on purpose — see the module note. Widening this list
 * is a code change with a review, which is the correct weight for "the set of
 * branches an autonomous loop may push to".
 *
 * A branch INSIDE the list is a branch the factory will push to, and that is a
 * naming convention rather than a fact it checked — see
 * {@link BRANCH_OWNERSHIP_BASIS} and {@link FACTORY_BRANCH_NAMESPACE_OVERLAP}
 * for who else creates branches here and what the residual risk is.
 */
export const FACTORY_BRANCH_NAMESPACES = ["tick/", "tick-run/", "epic/"] as const;

/** One of the namespaces {@link FACTORY_BRANCH_NAMESPACES} claims. */
export type FactoryBranchNamespace = (typeof FACTORY_BRANCH_NAMESPACES)[number];

/**
 * How ownership is decided, named so that nothing has to infer it.
 *
 * `creation_record` means a row in `factory_branch` written by whatever
 * created the branch (tick t4y). It was `naming_convention` until then — a
 * prefix match and nothing else — and the module note above records what
 * changed and why the prefix match survives as the cheap first half.
 *
 * The name test is now NECESSARY and not sufficient: {@link factoryOwnedBranch}
 * still refuses everything outside {@link FACTORY_BRANCH_NAMESPACES} before
 * any database is touched, and {@link branchOwnership} decides what happens to
 * what is left. Changing the basis changes this constant, which is the point
 * of having it.
 */
export const BRANCH_OWNERSHIP_BASIS = "creation_record" as const;

/** Who else creates branches in a namespace the factory claims, and what that costs. */
export type BranchNamespaceOverlap = {
  namespace: FactoryBranchNamespace;
  /** The other actors that create branches here. Never empty. */
  also_created_by: string[];
  /** How they come to be, concretely enough to check. */
  detail: string;
  /** What this factory may therefore do to a branch it did not create. */
  residual_risk: string;
};

/**
 * The overlap, per namespace, written down at the same weight as the claim.
 *
 * A test requires one entry for every namespace in
 * {@link FACTORY_BRANCH_NAMESPACES}, so a future widening of the claimed set
 * cannot land without naming who is already there. That is the whole mechanism:
 * the convention is allowed to stand, it is not allowed to be implicit.
 */
export const FACTORY_BRANCH_NAMESPACE_OVERLAP: readonly BranchNamespaceOverlap[] = [
  {
    namespace: "tick/",
    also_created_by: ["tk herd spawn (a person's laptop)"],
    detail:
      "the Go herd names a worker branch `<worktree_branch_prefix><tick-id>` and the prefix " +
      "defaults to `tick/`; herdr-runner.md documents `tick/<epic-id>/` too, which is the same " +
      "shape as the cloud worker's own `tick/<epic>/<tick>`, so no segment rule separates them",
    residual_risk:
      "a locally spawned worker branch is indistinguishable from one this factory pushed, and a " +
      "failing check on it would be treated as the factory's to fix",
  },
  {
    namespace: "tick-run/",
    also_created_by: ["nothing in this repository, today"],
    detail:
      "D9's other half, named by the design doc and created by no current code path; it is " +
      "claimed ahead of its use, which is the cheapest kind of overlap to carry and the easiest " +
      "to forget is there",
    residual_risk:
      "an unused claim is a claim: whoever first creates a `tick-run/` branch, factory or person, " +
      "inherits factory ownership without asking for it",
  },
  {
    namespace: "epic/",
    also_created_by: ["a local orchestrator (a person's laptop)", "a cloud closeout run"],
    detail:
      "the epic's integration branch is pushed by whichever orchestrator ran the epic, and " +
      "`.tick/config.md` requires it to reach the default branch through a pull request whose CI " +
      "is green — which, with `pull_request` and `push: main` triggers, makes it the only branch " +
      "in the claimed set this repository actually produces check runs for",
    residual_risk:
      "the branch most likely to reach this loop is the one a person pushed; a red epic PR buys a " +
      "`write`-grade run against a human's integration branch",
  },
];

/** Who a branch belongs to. There is no third answer and no "probably". */
export type BranchOwner = "factory" | "human";

/**
 * What a git branch name may look like before this module will read it at all.
 *
 * Deliberately narrower than git's own rules. Everything outside
 * `[A-Za-z0-9._/-]` — whitespace, control characters, the Unicode homoglyphs
 * that make `tісk/x` (Cyrillic і) render as `tick/x` — is not a branch this
 * factory has an opinion about, it is a branch this factory refuses. A
 * character class is a thing a reader can check; "looks like ours" is not.
 */
const BRANCH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;

/** Sequences git itself refuses, and the ones a path-traversal reflex reaches for. */
const BRANCH_FORBIDDEN = ["..", "//", "@{", "\\", ".lock/"];

/**
 * `branch` if the factory owns it, `null` otherwise. The only way to obtain a
 * {@link FactoryOwnedBranch}, and therefore the only way anything downstream
 * can name a push target.
 *
 * Fails CLOSED at every step: a value that is not a string, not shaped like a
 * branch, or shaped like a branch but outside the namespaces is `null`. The
 * comparison is case-sensitive because git refs are; `Tick/x` is a different
 * branch from `tick/x` and this factory owns exactly one of them.
 *
 * The value is NOT trimmed first, deliberately. Git branch names contain no
 * whitespace, so `"tick/meo\n"` is not a branch this factory owns with a
 * newline attached — it is a value that did not come from a branch, and
 * trimming it would be this function inventing the input it wanted.
 */
export function factoryOwnedBranch(branch: unknown): FactoryOwnedBranch | null {
  if (typeof branch !== "string") return null;
  const name = branch;
  if (!BRANCH_PATTERN.test(name)) return null;
  if (name.endsWith("/") || name.endsWith(".lock")) return null;
  for (const forbidden of BRANCH_FORBIDDEN) {
    if (name.includes(forbidden)) return null;
  }
  for (const namespace of FACTORY_BRANCH_NAMESPACES) {
    // The remainder must be non-empty: `tick/` names no branch, and a bare
    // prefix must never satisfy a prefix test.
    if (name.startsWith(namespace) && name.length > namespace.length) {
      return name as FactoryOwnedBranch;
    }
  }
  return null;
}

/**
 * {@link factoryOwnedBranch} as a plain verdict, for logs and refusal messages.
 *
 * The NAME test only. Since tick t4y this answers "could this branch be the
 * factory's" and not "is it" — {@link branchOwnership} answers that, and it
 * needs a database. Kept as the runtime re-derivation at the dispatch site,
 * which is a check about a branded value having been laundered, not a check
 * about who created the branch.
 */
export function branchOwner(branch: unknown): BranchOwner {
  return factoryOwnedBranch(branch) === null ? "human" : "factory";
}

/**
 * What the positive record says about a branch that already passed the name
 * test (tick t4y).
 *
 * Three answers, and the third is the one that made this worth building:
 * `unrecorded` is "nobody has said", which is neither of the other two and
 * must not be quietly folded into either.
 */
export type BranchOwnershipVerdict =
  /** A run of this factory created it. Remediation may proceed. */
  | { state: "recorded"; record: BranchRecord }
  /** A person has claimed it. Remediation refuses, and says nothing further. */
  | { state: "disclaimed"; record: BranchRecord }
  /** Nothing recorded creating it. Remediation refuses AND reports. */
  | { state: "unrecorded" };

/**
 * Who owns a branch, from the record rather than from its name.
 *
 * Fails CLOSED: no record is a refusal, not a pass. That direction is the
 * cheap one to be wrong in — refusing work the factory should have done costs
 * a person answering a message, while the other direction spends a
 * `write`-grade run on somebody else's branch — but it is only acceptable
 * because the refusal is REPORTED. See {@link noteUnrecordedBranch} and
 * `loop-digest.ts`: a fail-closed gate whose refusals are invisible is a loop
 * that stops working without anybody noticing.
 */
export async function branchOwnership(
  env: Env,
  project: string,
  branch: string
): Promise<BranchOwnershipVerdict> {
  const record = await branchRecord(env, project, branch);
  if (record === null) return { state: "unrecorded" };
  return record.owner === "factory"
    ? { state: "recorded", record }
    : { state: "disclaimed", record };
}

declare const FACTORY_OWNED_BRAND: unique symbol;

/**
 * A branch this factory owns, proven by construction.
 *
 * A branded string: assignable TO `string` everywhere, and constructible only
 * by {@link factoryOwnedBranch}. That asymmetry is the point — a function that
 * demands one cannot be handed `"main"`, and no amount of plumbing in between
 * can launder a human-owned name into one without an explicit cast that a
 * reviewer sees.
 */
export type FactoryOwnedBranch = string & { readonly [FACTORY_OWNED_BRAND]: true };

/**
 * The epic a factory-owned branch belongs to: the first segment after the
 * namespace.
 *
 * `tick/<epic>/<tick>` (what `cloud/sandbox/worker.sh` pushes) and `tick/<id>`
 * (what the local herd pushes) both answer with their first segment, and both
 * answers are the right one. No GitHub round trip: a remediation run must be
 * decidable from the delivery, because the alternative is a network call in
 * the middle of a decision about whether to make network calls.
 *
 * Exactly ONE namespace is stripped, and it is the same namespace
 * {@link factoryOwnedBranch} matched on. The previous fold walked the whole
 * list and stripped each prefix that still matched, so `tick/tick-run/x`
 * answered `x` rather than `tick-run` — the epic of a branch that does not
 * exist. No current caller could reach it, which is precisely why it was worth
 * removing rather than documenting.
 */
export function epicOfBranch(branch: FactoryOwnedBranch): string {
  const name = branch as string;
  const namespace = FACTORY_BRANCH_NAMESPACES.find(
    (candidate) => name.startsWith(candidate) && name.length > candidate.length
  );
  const rest = namespace === undefined ? name : name.slice(namespace.length);
  const [first] = rest.split("/");
  return first === undefined || first === "" ? rest : first;
}

// -------------------------------------------------------------- the facts ---

/** The conclusions this module distinguishes. Everything else is `other`. */
export const CHECK_CONCLUSIONS = ["success", "failure", "other"] as const;
export type CheckConclusion = (typeof CHECK_CONCLUSIONS)[number];

/** GitHub conclusions that mean the check ran and did not pass. */
const FAILING_CONCLUSIONS = new Set(["failure", "timed_out", "action_required"]);
/** GitHub conclusions that mean the check ran and passed. */
const PASSING_CONCLUSIONS = new Set(["success"]);

/**
 * Normalises GitHub's conclusion vocabulary onto three answers.
 *
 * `cancelled`, `skipped`, `stale` and `neutral` fold to `other` and are
 * evidence of nothing: a cancelled check did not fail, and counting it as a
 * failure would let a person clicking Cancel twice buy a dispatched run.
 */
export function checkConclusion(raw: unknown): CheckConclusion {
  if (typeof raw !== "string") return "other";
  const value = raw.trim().toLowerCase();
  if (PASSING_CONCLUSIONS.has(value)) return "success";
  if (FAILING_CONCLUSIONS.has(value)) return "failure";
  return "other";
}

const SHA_PATTERN = /^[0-9a-f]{7,64}$/;
const PROJECT_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const NODE_ID_PATTERN = /^[A-Za-z0-9_=-]{1,255}$/;
/** A check name is repository-authored text; it is shown to a human, never obeyed. */
export const MAX_CHECK_NAME_CHARS = 200;

/**
 * One check-run delivery, once the payload's structural fields have been read.
 *
 * Every field comes from a payload field GitHub controls. Nothing here is read
 * out of a check name, a workflow title or a commit message: those are strings
 * a contributor writes, and the only place one of them reaches is a message a
 * human reads, sanitised on the way.
 */
export type CheckFailureFacts = {
  project: string;
  /** Proven factory-owned by construction. See {@link FactoryOwnedBranch}. */
  branch: FactoryOwnedBranch;
  head_sha: string;
  /** The branch this one is measured against — red here means "not ours". */
  base_branch: string;
  check_name: string;
  /** The check run's numeric id, which is what a re-run request needs. */
  check_run_id: number;
  /** The check run's node id: the dedup key, stable across redelivery. */
  external_ref: string;
  conclusion: CheckConclusion;
  details_url: string | null;
};

export type CheckClassification =
  | { state: "failure"; facts: CheckFailureFacts }
  /** A non-failing outcome on a branch we own: evidence for the gate, not work. */
  | { state: "outcome"; facts: CheckFailureFacts }
  | { state: "refused"; reason: "human_owned_branch"; detail: string; branch: string }
  | { state: "ignored"; reason: string; detail: string };

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Reads a `check_run` delivery into facts, or says why it is not work.
 *
 * This function is the ownership door. It is the only producer of
 * {@link CheckFailureFacts}, and it produces none for a branch outside
 * {@link FACTORY_BRANCH_NAMESPACES} — so "the factory dispatched against a
 * human's branch" is not a path with a missing guard on it, it is a path with
 * no values to travel down.
 */
export function classifyCheckEvent(payload: unknown): CheckClassification {
  const body = record(payload);
  if (body === null) {
    return { state: "ignored", reason: "invalid_payload", detail: "the payload is not an object" };
  }

  const action = str(body.action);
  if (action !== "completed") {
    return {
      state: "ignored",
      reason: "action_not_completed",
      detail: `a check run only settles anything when it completes, not on \`${action || "?"}\``,
    };
  }

  const checkRun = record(body.check_run);
  if (checkRun === null) {
    return { state: "ignored", reason: "invalid_payload", detail: "the payload carries no check_run" };
  }

  const repository = record(body.repository);
  const project = str(repository?.full_name).replace(/\.git$/, "");
  if (!PROJECT_PATTERN.test(project)) {
    return {
      state: "ignored",
      reason: "invalid_payload",
      detail: "the payload names no repository this factory can read",
    };
  }

  const suite = record(checkRun.check_suite);
  // Read RAW, not trimmed: the ownership test is the one place in this bundle
  // where normalising the input before checking it would be normalising away
  // the reason to refuse it.
  const branchName =
    typeof checkRun.head_branch === "string" && checkRun.head_branch !== ""
      ? checkRun.head_branch
      : typeof suite?.head_branch === "string"
        ? suite.head_branch
        : "";
  if (branchName === "") {
    return {
      state: "ignored",
      reason: "invalid_payload",
      detail: "the check run names no head branch",
    };
  }

  const branch = factoryOwnedBranch(branchName);
  if (branch === null) {
    // The one refusal that is a security boundary rather than a policy: this
    // is where a human's branch stops. Named separately from `ignored` so the
    // dispatch log can say which of the two happened.
    return {
      state: "refused",
      reason: "human_owned_branch",
      branch: sanitizeUntrustedLine(branchName, MAX_CHECK_NAME_CHARS),
      detail:
        `${sanitizeUntrustedLine(branchName, MAX_CHECK_NAME_CHARS)} is outside ` +
        `${FACTORY_BRANCH_NAMESPACES.join(", ")}, so the factory does not own it and will ` +
        "never push to it; a pull request from it is a review, not a remediation",
    };
  }

  const headSha = str(checkRun.head_sha).toLowerCase() || str(suite?.head_sha).toLowerCase();
  if (!SHA_PATTERN.test(headSha)) {
    return { state: "ignored", reason: "invalid_payload", detail: "the check run names no head sha" };
  }

  const externalRef = str(checkRun.node_id);
  if (!NODE_ID_PATTERN.test(externalRef)) {
    // Without a stable dedup key the gate cannot tell a redelivery from a
    // re-run, and a gate that cannot tell them apart is not a gate.
    return {
      state: "ignored",
      reason: "invalid_payload",
      detail: "the check run carries no node id, so its outcome cannot be deduplicated",
    };
  }

  const checkName = sanitizeUntrustedLine(checkRun.name, MAX_CHECK_NAME_CHARS);
  if (checkName === "") {
    return { state: "ignored", reason: "invalid_payload", detail: "the check run has no name" };
  }

  const pulls = Array.isArray(checkRun.pull_requests) ? checkRun.pull_requests : [];
  const firstPull = record(pulls[0]);
  const baseBranch =
    str(record(firstPull?.base)?.ref) || str(repository?.default_branch) || "main";

  const detailsURL = str(checkRun.details_url);
  const facts: CheckFailureFacts = {
    project,
    branch,
    head_sha: headSha,
    base_branch: baseBranch,
    check_name: checkName,
    check_run_id: typeof checkRun.id === "number" && Number.isSafeInteger(checkRun.id) ? checkRun.id : 0,
    external_ref: externalRef,
    conclusion: checkConclusion(checkRun.conclusion),
    details_url: detailsURL.startsWith("https://") ? detailsURL : null,
  };

  return facts.conclusion === "failure"
    ? { state: "failure", facts }
    : { state: "outcome", facts };
}

// --------------------------------------------------------- the GitHub port ---

/**
 * What the gate needs from GitHub, and nothing else.
 *
 * A seam for the same reason `ISSUE_LABELS` and `TICK_TRACKER` are seams: the
 * cases worth testing — a check that passed once and failed once on identical
 * code, a base branch that is already red, a re-run request GitHub refuses —
 * cannot be staged against real GitHub, and a gate whose decisive branches are
 * untestable is a gate nobody can trust.
 */
export interface CheckHistoryReader {
  /**
   * Every conclusion GitHub records for `check_name` at `ref` (a SHA or a
   * branch name), newest first. `null` means "this factory cannot see it" —
   * an ANSWER, distinct from throwing, which means "could not ask".
   */
  conclusions(project: string, ref: string, checkName: string): Promise<CheckConclusion[] | null>;
  /** Asks GitHub to run this check again. `false` means GitHub declined. */
  rerun(project: string, checkRunID: number): Promise<boolean>;
}

const CHECK_PAGE_SIZE = 100;

/**
 * The real reader: GitHub's check-runs-for-ref listing and its rerequest
 * endpoint, with the same headers every other GitHub read in this bundle uses.
 */
export function githubCheckHistory(env: Env): CheckHistoryReader {
  const base = (env.GITHUB_API_BASE_URL ?? GITHUB_API_BASE_URL).replace(/\/+$/, "");
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    // GitHub rejects an API request with no user agent outright.
    "user-agent": "ticks-factory",
  };
  const token = env.GITHUB_TOKEN;
  if (typeof token === "string" && token.trim() !== "") {
    headers.authorization = `Bearer ${token.trim()}`;
  }

  return {
    async conclusions(project, ref, checkName) {
      const url =
        `${base}/repos/${project}/commits/${encodeURIComponent(ref)}/check-runs` +
        `?per_page=${CHECK_PAGE_SIZE}&check_name=${encodeURIComponent(checkName)}`;
      const response = await fetch(url, { headers });
      // 404 and 422 are answers: this factory cannot see that ref's checks.
      if (response.status === 404 || response.status === 422) return null;
      if (!response.ok) {
        throw new Error(
          `GitHub answered HTTP ${response.status} reading check runs for ${project}@${ref}`
        );
      }
      const body = (await response.json()) as unknown;
      const runs = record(body)?.check_runs;
      if (!Array.isArray(runs)) {
        throw new Error(`GitHub returned no check_runs list for ${project}@${ref}`);
      }
      return runs.map((entry) => checkConclusion(record(entry)?.conclusion));
    },

    async rerun(project, checkRunID) {
      if (checkRunID <= 0) return false;
      const response = await fetch(
        `${base}/repos/${project}/check-runs/${checkRunID}/rerequest`,
        { method: "POST", headers }
      );
      return response.ok || response.status === 201 || response.status === 202;
    },
  };
}

/** The reader in use: the injected seam when there is one, GitHub otherwise. */
export function checkHistory(env: Env): CheckHistoryReader {
  const injected = env.CHECK_HISTORY;
  return injected === undefined || injected === null ? githubCheckHistory(env) : injected;
}

// --------------------------------------------------------- the flake gate ---

/**
 * Failing observations of one check on one commit before a run is worth
 * paying for.
 *
 * Two, and two is the smallest number that can mean anything: one failure is a
 * report, two independent runs of identical code failing the same way is a
 * reproduction. Raising it buys more certainty at the price of a slower loop;
 * lowering it to one deletes the gate.
 */
export const FLAKE_GATE_CONFIRMATIONS = 2;

export type FlakeVerdict =
  /** Two distinct failing runs of this check on this commit. Pay for a fix. */
  | { state: "reproduced"; failures: number }
  /** First failure recorded, a re-run asked for. Nothing dispatched. */
  | { state: "unconfirmed"; failures: number; rerun_requested: boolean }
  /** The same check both passed and failed on this commit. */
  | { state: "flaky"; detail: string }
  /** Already red on the base branch: this branch did not break it. */
  | { state: "red_on_base"; detail: string }
  /** This exact check run has already been counted. GitHub redelivered. */
  | { state: "duplicate_delivery"; detail: string }
  /** No verdict and nothing decided: GitHub could not be asked. */
  | { state: "deferred"; detail: string };

/**
 * Records one outcome, returning whether it was new.
 *
 * `INSERT OR IGNORE` on a UNIQUE `external_ref`: the redelivery loses the race
 * with itself rather than being counted twice. This is the single most
 * load-bearing line in the gate — see the migration's note on why a gate that
 * counts deliveries counts GitHub's retry policy.
 */
async function recordObservation(env: Env, facts: CheckFailureFacts): Promise<boolean> {
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO ci_check_observation
       (external_ref, project, branch, head_sha, check_name, conclusion, observed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      facts.external_ref,
      facts.project,
      facts.branch,
      facts.head_sha,
      facts.check_name,
      facts.conclusion,
      new Date().toISOString()
    )
    .run();
  return (result.meta.changes ?? 0) > 0;
}

async function observedConclusions(
  env: Env,
  facts: CheckFailureFacts
): Promise<{ failures: number; successes: number }> {
  const rows = await env.DB.prepare(
    `SELECT conclusion, COUNT(*) AS n
       FROM ci_check_observation
      WHERE project = ? AND head_sha = ? AND check_name = ?
      GROUP BY conclusion`
  )
    .bind(facts.project, facts.head_sha, facts.check_name)
    .all<{ conclusion: string; n: number }>();

  let failures = 0;
  let successes = 0;
  for (const row of rows.results ?? []) {
    if (row.conclusion === "failure") failures += Number(row.n);
    if (row.conclusion === "success") successes += Number(row.n);
  }
  return { failures, successes };
}

/**
 * Is this failure worth a run?
 *
 * Assumes the observation has already been recorded — the caller records
 * first, because evidence is written whatever the verdict turns out to be.
 */
export async function flakeGate(
  env: Env,
  facts: CheckFailureFacts,
  reader: CheckHistoryReader
): Promise<FlakeVerdict> {
  const observed = await observedConclusions(env, facts);

  // Both answers on one commit. The factory's own observations settle this
  // without asking anyone, so it is checked first and for free.
  if (observed.successes > 0) {
    return {
      state: "flaky",
      detail:
        `${facts.check_name} has both passed and failed on ${facts.head_sha} — identical code, ` +
        "two answers; a fix for that is a guess, so nothing is dispatched",
    };
  }

  // GitHub's own history for this exact SHA, which sees runs that predate this
  // factory's interest in the branch.
  let headHistory: CheckConclusion[] | null;
  try {
    headHistory = await reader.conclusions(facts.project, facts.head_sha, facts.check_name);
  } catch (error) {
    return {
      state: "deferred",
      detail: `could not read ${facts.check_name}'s history on ${facts.head_sha}: ${String(error)}`,
    };
  }
  if (headHistory !== null && headHistory.includes("success")) {
    return {
      state: "flaky",
      detail:
        `GitHub records a passing ${facts.check_name} on ${facts.head_sha} as well as this ` +
        "failure; identical code with two answers is a flake, not a bug to buy a fix for",
    };
  }

  // Red on the base branch: the branch did not break this, so driving the
  // branch to green cannot fix it. Park it; do not burn compute.
  let baseHistory: CheckConclusion[] | null;
  try {
    baseHistory = await reader.conclusions(facts.project, facts.base_branch, facts.check_name);
  } catch (error) {
    return {
      state: "deferred",
      detail: `could not read ${facts.check_name}'s history on ${facts.base_branch}: ${String(error)}`,
    };
  }
  if (baseHistory !== null && baseHistory[0] === "failure") {
    return {
      state: "red_on_base",
      detail:
        `${facts.check_name} is already failing on ${facts.base_branch}, so ${facts.branch} did ` +
        "not break it and a run sent to fix it would be sent to fix somebody else's failure",
    };
  }

  if (observed.failures >= FLAKE_GATE_CONFIRMATIONS) {
    return { state: "reproduced", failures: observed.failures };
  }

  // One failure. Ask for the re-run whose delivery becomes the second
  // observation, and dispatch nothing. A re-run GitHub declines is not fatal:
  // the next natural failure on this SHA still confirms it.
  let requested = false;
  try {
    requested = await reader.rerun(facts.project, facts.check_run_id);
  } catch (error) {
    console.error(
      `factory ci: could not ask GitHub to re-run check ${facts.check_run_id} on ` +
        `${facts.project}: ${String(error)}`
    );
  }
  return { state: "unconfirmed", failures: observed.failures, rerun_requested: requested };
}

// ------------------------------------------------------- the strike budget ---

/**
 * Where an operator reads and releases escalations (`src/ci-escalations.ts`).
 *
 * Declared here rather than beside the route because the escalation MESSAGE
 * has to name it — a gate whose release is not written on the page that tells
 * you about the gate is a gate people work around — and a decision module
 * importing its own HTTP surface would be a cycle. The route re-exports it.
 */
export const CI_ESCALATIONS_PATH = "/api/ci/escalations";

/** Remediation runs one branch may buy inside {@link STRIKE_WINDOW_MS}. */
export const STRIKE_BUDGET = 3;

/** The rolling window the budget is counted over: one day, as the design doc says. */
export const STRIKE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type RemediationAttempt = {
  run_id: string;
  head_sha: string;
  check_name: string;
  dispatched_at: string;
};

export type StrikeVerdict =
  | { state: "within_budget"; strikes: number; remaining: number }
  | { state: "struck_out"; strikes: number; history: RemediationAttempt[] }
  /** A person owns this branch already. The clock has no opinion here. */
  | { state: "escalated"; escalation: EscalationRecord };

/** The escalation row as it is stored, plus the release that may have ended it. */
export type EscalationRecord = {
  project: string;
  branch: string;
  head_sha: string;
  check_name: string;
  strikes: number;
  opened_at: string;
  notified_at: string | null;
  /** `open` means the factory dispatches nothing against this branch. */
  state: "open" | "cleared";
  /** When a person last released it — the strike budget's floor, kept across a re-escalation. */
  cleared_at: string | null;
  cleared_by: string | null;
};

/** The escalation row for a branch, released or not. Null when there never was one. */
export async function escalationFor(
  env: Env,
  project: string,
  branch: string
): Promise<EscalationRecord | null> {
  const row = await env.DB.prepare(
    `SELECT project, branch, head_sha, check_name, strikes, opened_at, notified_at,
            state, cleared_at, cleared_by
       FROM ci_escalation
      WHERE project = ? AND branch = ?`
  )
    .bind(project, branch)
    .first<EscalationRecord>();
  return row ?? null;
}

/** Every branch this factory has given up on and nobody has taken back. */
export async function listOpenEscalations(env: Env): Promise<EscalationRecord[]> {
  const rows = await env.DB.prepare(
    `SELECT project, branch, head_sha, check_name, strikes, opened_at, notified_at,
            state, cleared_at, cleared_by
       FROM ci_escalation
      WHERE state = 'open'
      ORDER BY opened_at DESC`
  ).all<EscalationRecord>();
  return rows.results ?? [];
}

/**
 * May this branch buy a remediation run?
 *
 * ONE function answers it, and that is the correction this whole tick is
 * (Phase 4 review, tick uls). The budget and the escalation used to be two
 * separate questions with one of them unasked: `ci_escalation` had two write
 * sites and zero reads, so the only thing between a struck-out branch and a
 * fresh `write`-grade dispatch was a ROLLING window. The moment the oldest of
 * the three strikes aged past {@link STRIKE_WINDOW_MS}, the branch the factory
 * had already handed to a person silently resumed spending — and escalation
 * deduped against the row it had already written, so nobody was told twice.
 *
 * So the escalation is read FIRST, and it is not a rate:
 *
 *  - **An open escalation refuses, full stop.** No window, no arithmetic. The
 *    clock cannot reopen a branch, because "time passes" is the answer that
 *    caused the bug. Only {@link clearEscalation} — a person — can.
 *  - **A release forgives the strikes that caused it.** The floor is the later
 *    of `now - STRIKE_WINDOW_MS` and `cleared_at`. Leaving the three strikes
 *    standing would re-escalate the branch on its very next failure, which is
 *    a release in name only.
 *
 * The budget itself is unchanged, and still counted over (project, branch)
 * rather than (project, branch, check): three runs that each fixed one check
 * and broke the next are three runs, and the money is spent per run. Counting
 * per check would let a branch with five failing checks buy fifteen.
 */
export async function strikeBudget(
  env: Env,
  facts: CheckFailureFacts,
  now = new Date()
): Promise<StrikeVerdict> {
  const escalation = await escalationFor(env, facts.project, facts.branch);
  if (escalation !== null && escalation.state === "open") {
    return { state: "escalated", escalation };
  }

  const windowStart = new Date(now.getTime() - STRIKE_WINDOW_MS).toISOString();
  const released = escalation?.cleared_at ?? null;
  const since = released !== null && released > windowStart ? released : windowStart;
  const rows = await env.DB.prepare(
    `SELECT run_id, head_sha, check_name, dispatched_at
       FROM ci_remediation_attempt
      WHERE project = ? AND branch = ? AND dispatched_at >= ?
      ORDER BY dispatched_at ASC`
  )
    .bind(facts.project, facts.branch, since)
    .all<RemediationAttempt>();

  const history = rows.results ?? [];
  if (history.length >= STRIKE_BUDGET) {
    return { state: "struck_out", strikes: history.length, history };
  }
  return {
    state: "within_budget",
    strikes: history.length,
    remaining: STRIKE_BUDGET - history.length,
  };
}

/**
 * A person taking a struck-out branch back: the only thing that reopens one.
 *
 * Returns whether THIS call released it. A branch nobody escalated, and a
 * branch already released, both answer `false` rather than stamping a fresh
 * release over the real one — who released it and when is evidence, and the
 * second caller did not produce it.
 *
 * `cleared_at` deliberately outlives the release (see migrations/0011): it is
 * the strike budget's floor, so it survives a later re-escalation and is
 * overwritten only by the next release.
 */
export async function clearEscalation(
  env: Env,
  release: { project: string; branch: string; cleared_by?: string },
  now = new Date()
): Promise<boolean> {
  const cleared = await env.DB.prepare(
    `UPDATE ci_escalation
        SET state = 'cleared', cleared_at = ?, cleared_by = ?
      WHERE project = ? AND branch = ? AND state = 'open'`
  )
    .bind(
      now.toISOString(),
      sanitizeUntrustedLine(release.cleared_by ?? "", 120) || null,
      release.project,
      release.branch
    )
    .run();
  return (cleared.meta.changes ?? 0) > 0;
}

/**
 * Hands the branch to a person: a durable row first, one message second.
 *
 * Returns whether THIS call opened the escalation. Every later failure on a
 * branch that is already escalated gets `false` and stays silent — replacing
 * an unbounded spend loop with an unbounded notification loop is not a fix.
 *
 * A branch a person RELEASED and which then struck out again is a different
 * case, and it opens again and pages again (tick uls). The old `INSERT OR
 * IGNORE` could not tell the two apart: the row was the whole memory, so once
 * it existed the operator was never told anything about that branch again.
 * The upsert below reopens only a `cleared` row, and keeps `cleared_at` —
 * that is the budget's floor, not a field about the current escalation.
 */
export async function escalate(
  env: Env,
  facts: CheckFailureFacts,
  verdict: { strikes: number; history: RemediationAttempt[] }
): Promise<boolean> {
  const opened = await env.DB.prepare(
    `INSERT INTO ci_escalation
       (project, branch, head_sha, check_name, strikes, opened_at, notified_at, state)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 'open')
     ON CONFLICT (project, branch) DO UPDATE SET
       head_sha    = excluded.head_sha,
       check_name  = excluded.check_name,
       strikes     = excluded.strikes,
       opened_at   = excluded.opened_at,
       notified_at = NULL,
       state       = 'open'
     WHERE ci_escalation.state = 'cleared'`
  )
    .bind(
      facts.project,
      facts.branch,
      facts.head_sha,
      facts.check_name,
      verdict.strikes,
      new Date().toISOString()
    )
    .run();
  if ((opened.meta.changes ?? 0) === 0) return false;

  // The message is best effort and says so in the code: the row above IS the
  // escalation. A deployment with no Telegram configured escalates exactly as
  // durably; it just has nowhere to shout.
  try {
    await sendTelegramReport(env, escalationReport(facts, verdict));
    await env.DB.prepare(
      `UPDATE ci_escalation SET notified_at = ? WHERE project = ? AND branch = ?`
    )
      .bind(new Date().toISOString(), facts.project, facts.branch)
      .run();
  } catch (error) {
    console.error(
      `factory ci: escalation for ${facts.project} ${facts.branch} was recorded but could not ` +
        `be delivered: ${String(error)}`
    );
  }
  return true;
}

/**
 * The escalation's text: what was tried, on what, and what the person's three
 * choices are.
 *
 * `sendTelegramReport` HTML-escapes this, and the one repository-authored
 * string in it — the check name — was sanitised at classification. The failure
 * history is here rather than in a link because the point of an escalation is
 * that nobody was watching: it has to be readable without opening anything.
 */
export function escalationReport(
  facts: CheckFailureFacts,
  verdict: { strikes: number; history: RemediationAttempt[] }
): string {
  const attempts = verdict.history
    .map((a, i) => `  ${i + 1}. run ${a.run_id} on ${a.head_sha.slice(0, 12)} at ${a.dispatched_at}`)
    .join("\n");
  return (
    `CI remediation struck out on ${facts.project} ${facts.branch}.\n` +
    `${facts.check_name} is still failing on ${facts.head_sha.slice(0, 12)} after ` +
    `${verdict.strikes} of ${STRIKE_BUDGET} attempts in the last 24h:\n` +
    `${attempts || "  (no attempts recorded)"}\n` +
    "The factory has stopped dispatching against this branch and is waiting for you: " +
    "keep trying (raise the budget), take it over yourself, or close the branch.\n" +
    // A gate with no documented release is a gate that gets worked around, and
    // the release is deliberately NOT the clock (tick uls): this branch stays
    // shut until a person says otherwise, however long that is.
    "Nothing here expires. When you have dealt with it, release the branch:\n" +
    `  POST ${CI_ESCALATIONS_PATH}/clear ` +
    `{"project":"${facts.project}","branch":"${facts.branch}","cleared_by":"<you>"}\n` +
    "That forgives the strikes above and lets the factory try again."
  );
}

// ------------------------------------------------------------ the dispatch ---

export type RemediationDecision =
  | { state: "dispatched"; run_id: string; trace_id: string; strikes: number }
  | { state: "escalated"; strikes: number; opened: boolean; detail: string }
  | { state: "refused"; code: string; detail: string }
  /** Nothing decided, nothing recorded: the delivery should come back. */
  | { state: "deferred"; code: string; detail: string };

/** The grade a remediation run is issued, and where it comes from. */
export const REMEDIATION_CREDENTIAL_GRADE: RunCredentialGrade = credentialGrade("write");

/**
 * The single site that turns a failure into a run. There is no other.
 *
 * The first statement is a runtime re-derivation of ownership from the branch
 * string itself, and it throws rather than returning: reaching it means a
 * caller cast its way past {@link FactoryOwnedBranch}, which is a bug in the
 * caller and not a condition to report politely to GitHub. Between the type
 * and this line there is no route from a human-owned branch to `submitRun`.
 *
 * The credential grade is DERIVED here from the same fact, never passed in.
 * `write` is what a remediation needs — it pushes a fix — and the only reason
 * this call may ask for it is that the branch it will push to is one the
 * factory made. A read-only remediation would be a run that cannot do its job;
 * a write run on a human's branch is the thing this module exists to prevent.
 */
export async function dispatchRemediation(
  env: Env,
  facts: CheckFailureFacts,
  verdict: { strikes: number }
): Promise<RemediationDecision> {
  if (branchOwner(facts.branch) !== "factory") {
    throw new Error(
      `factory ci: refusing to dispatch against ${String(facts.branch)}, which is not a ` +
        "factory-owned branch; this is unreachable through classifyCheckEvent and means a caller " +
        "cast past FactoryOwnedBranch"
    );
  }
  // And the record, re-read here for the same reason the name is (tick t4y).
  // Ownership is `creation_record` now, so a re-derivation that checked only
  // the name would be re-deriving the thing that stopped being the answer.
  // Unreachable through `remediateCheckFailure`, which asked before it spent
  // anything; it exists for the caller who reaches for a cast.
  if ((await branchOwnership(env, facts.project, facts.branch)).state !== "recorded") {
    throw new Error(
      `factory ci: refusing to dispatch against ${String(facts.branch)}, which no record says ` +
        "this factory created; this is unreachable through remediateCheckFailure and means a " +
        `caller skipped the ownership door (answer it at POST ${CI_BRANCHES_PATH})`
    );
  }

  const runID = newRunID();
  const traceID = newTraceID();
  const submission: RunSubmission = {
    project: facts.project,
    epic: epicOfBranch(facts.branch),
    // The failing commit itself: a fix for a failure you cannot reproduce is a
    // guess, so the run starts from the exact tree that went red.
    base_sha: facts.head_sha,
    requested_by: REMEDIATION_ACTOR,
    trace_id: traceID,
    queue: false,
    credential_grade: REMEDIATION_CREDENTIAL_GRADE,
  };

  const result = await submitRun(env, submission);
  if (result.outcome !== "started") {
    const detail =
      "detail" in result ? result.detail : `the submission came back ${result.outcome}`;
    return { state: "refused", code: `submission_${result.outcome}`, detail };
  }

  // Recorded AFTER the run exists, so a strike is only ever charged for a run
  // that actually started. The other order would let a failed ignition spend
  // the budget it never used.
  await env.DB.prepare(
    `INSERT INTO ci_remediation_attempt
       (run_id, project, branch, head_sha, check_name, trace_id, dispatched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      result.started.run.run_id,
      facts.project,
      facts.branch,
      facts.head_sha,
      facts.check_name,
      traceID,
      new Date().toISOString()
    )
    .run();

  return {
    state: "dispatched",
    run_id: result.started.run.run_id,
    trace_id: traceID,
    strikes: verdict.strikes + 1,
  };
}

/** Who a remediation run is requested by. A machine actor, never a person's name. */
export const REMEDIATION_ACTOR = "ci-remediation";

async function logCIDispatch(
  env: Env,
  entry: { epic: string; decision: string; reason: DispatchReason | null }
): Promise<void> {
  await insertDispatchLog(env.DB, {
    // A refusal has no run behind it, so the decision gets its own id — the
    // shape `submitRun` already uses when it refuses before igniting.
    run_id: newRunID(),
    tick_id: entry.epic,
    decision: entry.decision,
    reason: entry.reason,
    at: new Date().toISOString(),
  });
}

/**
 * A `check_run` delivery, all the way to a run or to a reason there is none.
 *
 * The order is name, enrolment, RECORD, evidence, budget, gate, dispatch —
 * cheapest and most final first. The record sits inside ownership, right after
 * the name test it completes (tick t4y): a branch nothing created is refused
 * before a single observation, strike or GitHub read is spent on it. Every
 * outcome except `deferred` is settled and written down: `tk factory trace`
 * answers "why did this not run" from D1, never from Workers logs.
 */
export async function remediateCheckFailure(
  env: Env,
  payload: unknown,
  reader?: CheckHistoryReader
): Promise<RemediationDecision> {
  const classified = classifyCheckEvent(payload);

  if (classified.state === "refused") {
    // The security refusal, and the only one worth a durable row of its own:
    // it says a human's branch reached the door and was turned away.
    await logCIDispatch(env, {
      epic: classified.branch,
      decision: `refused:human_owned_branch:${classified.branch}`,
      reason: "awaiting_approval",
    });
    return { state: "refused", code: "human_owned_branch", detail: classified.detail };
  }
  if (classified.state === "ignored") {
    return { state: "refused", code: classified.reason, detail: classified.detail };
  }

  const facts = classified.facts;

  // Enrolment before anything durable or billable. The webhook secret proves
  // the delivery is GitHub's; it does not say the operator pointed this
  // factory at this repository (migrations/0003).
  if ((await getEnrolledProject(env.DB, facts.project)) === null) {
    return {
      state: "refused",
      code: "not_enrolled",
      detail: `${facts.project} is not enrolled with this factory`,
    };
  }

  // The positive record (tick t4y). This is the OTHER half of the ownership
  // door: `classifyCheckEvent` proved the name is one the factory could own,
  // and this proves something actually created it. Asked here — after
  // enrolment, before any evidence or budget — because it is an ownership
  // question, and ownership is the first and most final of the governors.
  const ownership = await branchOwnership(env, facts.project, facts.branch);
  if (ownership.state !== "recorded") {
    if (ownership.state === "unrecorded") {
      // Refused for want of a record, and REPORTED rather than only logged.
      // am2's third reason for leaving this undone was that a lost record
      // would orphan a real factory branch quietly; this row is what the daily
      // digest reads so it cannot (tick zaw, `loop-digest.ts`).
      await noteUnrecordedBranch(env, {
        project: facts.project,
        branch: facts.branch,
        check_name: facts.check_name,
        head_sha: facts.head_sha,
      });
    }
    await logCIDispatch(env, {
      epic: epicOfBranch(facts.branch),
      decision: `refused:${
        ownership.state === "unrecorded" ? "branch_unrecorded" : "branch_disclaimed"
      }:${facts.branch}`,
      // The branch is waiting on a person to say whose it is, which is exactly
      // what this reason means everywhere else it is used.
      reason: "awaiting_approval",
    });
    return {
      state: "refused",
      code: ownership.state === "unrecorded" ? "branch_unrecorded" : "branch_disclaimed",
      detail:
        ownership.state === "unrecorded"
          ? `nothing recorded creating ${facts.branch}, so this factory does not know it is ` +
            "its own branch and will not push to it; the name matches a namespace the factory " +
            "uses, which is a claim anybody can make. Say whose it is: " +
            `POST ${CI_BRANCHES_PATH} {"project":"${facts.project}","branch":"${facts.branch}",` +
            '"owner":"factory"|"human"}. Until then this is reported in the daily digest'
          : `${facts.branch} is recorded as a person's branch (by ` +
            `${ownership.record.recorded_by} at ${ownership.record.recorded_at}); the factory ` +
            "reviews a human's branch, it never pushes to it",
    };
  }

  // Evidence is recorded whatever the verdict — including for a success, which
  // is the gate's best flake detector.
  const fresh = await recordObservation(env, facts);
  if (classified.state === "outcome") {
    return {
      state: "refused",
      code: "not_a_failure",
      detail: `${facts.check_name} concluded \`${facts.conclusion}\`; recorded as evidence, no work`,
    };
  }
  if (!fresh) {
    return {
      state: "refused",
      code: "duplicate_delivery",
      detail:
        `check run ${facts.external_ref} has already been counted; a redelivery is not a ` +
        "second failure",
    };
  }

  // The budget first: a struck-out branch must not even be able to order the
  // re-runs the gate's unconfirmed branch asks for. `strikeBudget` reads the
  // open escalation before it reads the clock, so a branch a person now owns
  // never reaches the arithmetic at all (tick uls).
  const budget = await strikeBudget(env, facts);
  if (budget.state === "escalated") {
    // Silent by design, and silent for as long as it takes: this branch was
    // handed to a person, the person was told once, and nothing has changed.
    // The next thing that changes anything is that person releasing it.
    return {
      state: "escalated",
      strikes: budget.escalation.strikes,
      opened: false,
      detail:
        `${facts.branch} was escalated at ${budget.escalation.opened_at} and no one has ` +
        `released it; the factory dispatches nothing against it until somebody does ` +
        `(POST ${CI_ESCALATIONS_PATH}/clear)`,
    };
  }
  if (budget.state === "struck_out") {
    const opened = await escalate(env, facts, budget);
    if (opened) {
      await logCIDispatch(env, {
        epic: epicOfBranch(facts.branch),
        decision: `refused:strike_out:${facts.branch}`,
        reason: "strike_out",
      });
    }
    return {
      state: "escalated",
      strikes: budget.strikes,
      opened,
      detail:
        `${facts.branch} has spent its ${STRIKE_BUDGET} remediation attempts in the last 24h; ` +
        "a person now owns it",
    };
  }

  const gate = await flakeGate(env, facts, reader ?? checkHistory(env));
  if (gate.state === "deferred") {
    return { state: "deferred", code: "check_history_unavailable", detail: gate.detail };
  }
  if (gate.state !== "reproduced") {
    await logCIDispatch(env, {
      epic: epicOfBranch(facts.branch),
      decision: `refused:${gate.state}:${facts.check_name}`,
      reason: "flake_gate",
    });
    return {
      state: "refused",
      code: gate.state,
      detail:
        gate.state === "unconfirmed"
          ? `${facts.check_name} has failed once on ${facts.head_sha}; ` +
            `${FLAKE_GATE_CONFIRMATIONS} failing runs are needed before a fix is paid for` +
            (gate.rerun_requested ? " (a re-run was requested)" : "")
          : gate.detail,
    };
  }

  return dispatchRemediation(env, facts, budget);
}
