/**
 * The positive record of who created a branch (tick t4y, closing am2).
 *
 * ## What this replaces
 *
 * `ci-remediation.ts` decides whether the factory may push to a branch. Until
 * this module that decision was a PREFIX MATCH and nothing else: a branch
 * called `tick/…`, `tick-run/…` or `epic/…` was the factory's, whoever had
 * actually created it. Tick am2 examined that and did not paper over it — it
 * wrote the residual risk down in as many words, per namespace, and it is
 * still written there ({@link FACTORY_BRANCH_NAMESPACE_OVERLAP} in
 * `ci-remediation.ts`), because the collision it names is real in this
 * repository: `tk herd spawn` defaults `orchestration.worktree_branch_prefix`
 * to `tick/`, so an operator's laptop creates branches in the factory's first
 * namespace every wave.
 *
 * A name is a claim anybody can make. This table is a record only something
 * that was there can write.
 *
 * ## The three answers, and why the third one is the point
 *
 *  - **`factory`** — a run of this factory created this branch. Remediation
 *    may drive it back to green with a `write`-grade run.
 *  - **`human`** — a person has said the branch is theirs. Remediation refuses
 *    for good, and says nothing further about it. This is an ANSWER, not a
 *    complaint, and answering is what takes a branch out of the digest.
 *  - **no row** — nobody has said. The factory refuses, and the refusal is
 *    REPORTED ({@link noteUnrecordedBranch}).
 *
 * That third answer is the whole design. am2's third reason for not building
 * this yet was that its failure mode could not be made loud: a lost record
 * orphans a real factory branch, so remediation refuses work it should do, and
 * that refusal would land in `dispatch_log` and nowhere else — a trace you
 * read once you already suspect something. Tick zaw landed the daily digest in
 * the same wave, so there is now somewhere for it to be seen, and
 * `loop-digest.ts` reads {@link listUnrecordedBranches} exactly the way it
 * reads a sweep that has refused three mornings running.
 *
 * ## First writer wins, deliberately
 *
 * Every write here is `INSERT OR IGNORE`. A record is EVIDENCE of who created
 * a branch, not a setting somebody adjusts — and a door that let a later
 * caller overwrite an earlier claim would let a container relabel a branch a
 * person had already claimed as theirs, which is the boundary this table
 * exists to hold. Changing an answer means an operator deleting the row, which
 * is a different verb with a different weight.
 *
 * ## Storage only
 *
 * This module deliberately knows nothing about branch NAMESPACES, and imports
 * nothing from `ci-remediation.ts`. The name parse is that module's (it is
 * where the branded {@link FactoryOwnedBranch} lives and must stay the only
 * constructor); the doors that need both live in `branch-ownership.ts`. One
 * direction of dependency, so the ownership decision cannot end up with two
 * homes again.
 */

import type { Env } from "./index";

/**
 * Where an operator answers the ownership question (`src/branch-ownership.ts`).
 *
 * Declared here, in the storage module, for the reason `CI_ESCALATIONS_PATH`
 * is declared beside the escalation it releases: the digest's message and the
 * dispatcher's refusal both have to RECITE it — a refusal that does not say
 * how to answer it is a refusal people work around — and a decision module
 * importing an HTTP surface would be a cycle. The route re-exports it, and a
 * test pins the two spellings together.
 */
export const CI_BRANCHES_PATH = "/api/ci/branches";

/**
 * Where a container records the branch it just created
 * (`src/branch-ownership.ts`).
 *
 * Exempt from the operator's bearer token and authorized by the run's own
 * gateway credential, exactly as `/api/wave` is (tick wiy): there is no run id
 * in the path, because the credential decides which run is speaking.
 */
export const BRANCH_CLAIM_PATH = "/api/branches";

/** Who a branch belongs to, once somebody has said. There is no third value. */
export const BRANCH_RECORD_OWNERS = ["factory", "human"] as const;
export type BranchRecordOwner = (typeof BRANCH_RECORD_OWNERS)[number];

export function isBranchRecordOwner(value: unknown): value is BranchRecordOwner {
  return typeof value === "string" && (BRANCH_RECORD_OWNERS as readonly string[]).includes(value);
}

/** One decided branch, as `factory_branch` stores it. */
export type BranchRecord = {
  project: string;
  branch: string;
  owner: BranchRecordOwner;
  /** `run:<run-id>` when a container claimed it, `operator` at the operator door. */
  recorded_by: string;
  run_id: string | null;
  epic: string | null;
  detail: string | null;
  recorded_at: string;
};

/** What {@link recordBranch} is asked to write. */
export type BranchClaim = {
  project: string;
  branch: string;
  owner: BranchRecordOwner;
  recorded_by: string;
  run_id?: string | null;
  epic?: string | null;
  detail?: string | null;
};

/**
 * Records who created a branch. Returns whether THIS call wrote the record.
 *
 * `false` means a record already existed — the branch was already decided, and
 * this caller is not the one who decided it. Callers report that difference
 * rather than smoothing it over: a container told "already recorded" for a
 * branch it just created is being told something worth reading.
 */
export async function recordBranch(env: Env, claim: BranchClaim, now = new Date()): Promise<boolean> {
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO factory_branch
       (project, branch, owner, recorded_by, run_id, epic, detail, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      claim.project,
      claim.branch,
      claim.owner,
      claim.recorded_by,
      claim.run_id ?? null,
      claim.epic ?? null,
      claim.detail ?? null,
      now.toISOString()
    )
    .run();
  return (result.meta.changes ?? 0) > 0;
}

/** The record for one branch, or `null` when nobody has said. */
export async function branchRecord(
  env: Env,
  project: string,
  branch: string
): Promise<BranchRecord | null> {
  const row = await env.DB.prepare(
    `SELECT project, branch, owner, recorded_by, run_id, epic, detail, recorded_at
       FROM factory_branch
      WHERE project = ? AND branch = ?`
  )
    .bind(project, branch)
    .first<BranchRecord>();
  return row ?? null;
}

/** Every decided branch for a project, newest first. The operator door's read. */
export async function listBranchRecords(
  env: Env,
  project: string,
  limit = 200
): Promise<BranchRecord[]> {
  const rows = await env.DB.prepare(
    `SELECT project, branch, owner, recorded_by, run_id, epic, detail, recorded_at
       FROM factory_branch
      WHERE project = ?
      ORDER BY recorded_at DESC
      LIMIT ?`
  )
    .bind(project, limit)
    .all<BranchRecord>();
  return rows.results ?? [];
}

/**
 * Removes a record, so the question can be asked again. Returns whether a row
 * went.
 *
 * The only way to change an answer, and it is an operator's — see the module
 * note on first-writer-wins. A branch whose record is deleted goes back to
 * being undecided, which means refused and reported, not allowed.
 */
export async function forgetBranchRecord(
  env: Env,
  project: string,
  branch: string
): Promise<boolean> {
  const result = await env.DB.prepare(
    `DELETE FROM factory_branch WHERE project = ? AND branch = ?`
  )
    .bind(project, branch)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

// ------------------------------------------------- the refusal, made visible ---

/** A branch the factory refused for want of a record, as the digest reads it. */
export type UnrecordedBranch = {
  project: string;
  branch: string;
  check_name: string;
  head_sha: string;
  refusals: number;
  first_seen_at: string;
  last_seen_at: string;
};

/**
 * Writes down that a branch was refused because nothing recorded its creation.
 *
 * One row per (project, branch), counting how often the question has been
 * asked — never one row per delivery. GitHub redelivers, and a row per
 * delivery would turn one unanswered question into a daily list of the same
 * question, which is the cry-wolf failure `loop-digest.ts` is built around.
 */
export async function noteUnrecordedBranch(
  env: Env,
  refusal: { project: string; branch: string; check_name: string; head_sha: string },
  now = new Date()
): Promise<void> {
  const at = now.toISOString();
  await env.DB.prepare(
    `INSERT INTO unrecorded_branch
       (project, branch, check_name, head_sha, refusals, first_seen_at, last_seen_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT (project, branch) DO UPDATE SET
       check_name   = excluded.check_name,
       head_sha     = excluded.head_sha,
       refusals     = unrecorded_branch.refusals + 1,
       last_seen_at = excluded.last_seen_at`
  )
    .bind(refusal.project, refusal.branch, refusal.check_name, refusal.head_sha, at, at)
    .run();
}

/**
 * Refusals still waiting for an answer, oldest first.
 *
 * The `NOT EXISTS` is the release, and it is evidence rather than an
 * acknowledgement: the moment a record exists for the branch — whichever owner
 * it names, because `human` answers the question as completely as `factory`
 * does — the finding is gone. `since` bounds it to refusals that are still
 * happening; a branch nothing has asked about in that long is not a live
 * refusal, and reporting it forever is how a digest gets muted.
 */
export async function listUnrecordedBranches(
  env: Env,
  since: string,
  limit = 100
): Promise<UnrecordedBranch[]> {
  const rows = await env.DB.prepare(
    `SELECT u.project, u.branch, u.check_name, u.head_sha, u.refusals,
            u.first_seen_at, u.last_seen_at
       FROM unrecorded_branch AS u
      WHERE u.last_seen_at >= ?
        AND NOT EXISTS (
              SELECT 1 FROM factory_branch AS f
               WHERE f.project = u.project AND f.branch = u.branch
            )
      ORDER BY u.first_seen_at ASC
      LIMIT ?`
  )
    .bind(since, limit)
    .all<UnrecordedBranch>();
  return rows.results ?? [];
}
