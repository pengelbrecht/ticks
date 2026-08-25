-- Branch ownership stops being a naming convention (tick t4y, closing am2).
--
-- Tick am2 settled, deliberately, that `ci-remediation.ts` decided ownership
-- by a PREFIX MATCH on the branch name and nothing else. Its reasoning was
-- sound and it wrote the residual risk down rather than implying it: a branch
-- a person names the way the factory names its own is a branch the factory
-- will push to, and in this repository that is not hypothetical —
-- `tk herd spawn` defaults `orchestration.worktree_branch_prefix` to `tick/`
-- and creates branches in the factory's first namespace, by the dozen, on an
-- operator's laptop, every wave.
--
-- am2 gave three reasons not to fix it yet. Tick `zaw` removed one of them by
-- landing the daily digest, so a refusal finally has somewhere to be seen.
-- This migration is the other two: it is the WRITE side that did not exist,
-- and the record of a refusal that would otherwise be silent.
--
-- Re-runnable, like every migration here.

-- ------------------------------------------------------- the positive record ---
--
-- One row per branch somebody has DECIDED about. The absence of a row is not
-- "human" and not "factory" — it is "nobody has said", which is a third answer
-- and the only one worth building a table for. `ci-remediation.ts` refuses on
-- it and `loop-digest.ts` reports it, because a refusal nobody sees is how a
-- loop stops working for a month without anybody noticing (tick zaw).
--
-- Two owners, and both are useful:
--
--  * `factory` — this branch was created by a run of this factory. Remediation
--    may drive it back to green with a `write`-grade run.
--  * `human` — a person has said this branch is theirs. Remediation refuses,
--    permanently and quietly. It is not a complaint; it is an ANSWER, which is
--    what takes the branch out of the digest.
--
-- The primary key is (project, branch) and every write is `INSERT OR IGNORE`:
-- the FIRST record wins. That is deliberate. A record is evidence of who
-- created a branch, not a setting somebody adjusts — and a door that let a
-- later caller overwrite an earlier claim would let a container relabel a
-- branch a person had already claimed, which is the whole boundary this table
-- exists to hold. Changing an answer is an operator deleting the row.
CREATE TABLE IF NOT EXISTS factory_branch (
  project     TEXT NOT NULL,
  branch      TEXT NOT NULL,
  owner       TEXT NOT NULL CHECK (owner IN ('factory', 'human')),
  -- Who said so: `run:<run-id>` for a container claiming what it just created,
  -- `operator` for a person at the operator door. Never a free-text label a
  -- caller chose — the door derives it from the credential presented.
  recorded_by TEXT NOT NULL,
  -- The run that created the branch, when a run did. NULL at the operator door.
  run_id      TEXT,
  -- The epic the branch belongs to, as the recorder understood it.
  epic        TEXT,
  -- How the branch came to exist, in the recorder's own words. Read by a
  -- person deciding whether a claim looks right, never by a decision here.
  detail      TEXT,
  recorded_at TEXT NOT NULL,
  PRIMARY KEY (project, branch)
);

-- The dispatcher's question, asked on every check-run delivery that got past
-- the name parse: "did anything create this branch?"
CREATE INDEX IF NOT EXISTS idx_factory_branch_owner
  ON factory_branch (project, owner, recorded_at);

-- ----------------------------------------------- the refusal that must be loud ---
--
-- am2's third reason for not doing this yet, quoted: "A lost record orphans a
-- real factory branch: remediation refuses work it should do. That refusal
-- would land in `dispatch_log` and nowhere else, which is a trace you read
-- once you already suspect something."
--
-- This is that trace promoted to a finding. Every delivery for a branch that
-- parses as factory-shaped and has NO record writes here, and the daily digest
-- reads it. The safe direction is still to refuse — acting on a human's branch
-- is the worse failure — but a safe direction taken silently is in dangerous
-- company: it is indistinguishable from a loop that is working.
--
-- Keyed by (project, branch) rather than by delivery, for the reason
-- `ci_webhook_fault` is keyed by fault shape: GitHub redelivers, and a row per
-- delivery would turn one unanswered question into a daily list of the same
-- question. `refusals` counts how often it has been asked.
--
-- There is no `cleared_at` here, and that is `loop-digest.ts`'s rule rather
-- than an omission. This row gates nothing, so its release is EVIDENCE, never
-- an acknowledgement: the finding disappears when a record appears in
-- `factory_branch` (whichever owner it names — an answer is an answer), or
-- when the branch stops producing failures the factory is asked about.
CREATE TABLE IF NOT EXISTS unrecorded_branch (
  project       TEXT NOT NULL,
  branch        TEXT NOT NULL,
  -- The most recent failing check and commit, so the digest can say what was
  -- actually refused without a second read.
  check_name    TEXT NOT NULL,
  head_sha      TEXT NOT NULL,
  refusals      INTEGER NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  PRIMARY KEY (project, branch)
);

-- The digest's question: what has been refused lately and still has no answer?
CREATE INDEX IF NOT EXISTS idx_unrecorded_branch_seen
  ON unrecorded_branch (last_seen_at);
