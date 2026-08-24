-- The CI-failure remediation loop's memory (UC4, D10, tick meo).
--
-- The loop this schema governs is the highest-risk one in the factory: its own
-- output (a pushed branch) comes back in as its own input (a check result), so
-- a wrong answer does not cost one run, it costs every run until someone
-- notices. The design doc's D10 puts both governors in the DISPATCHER rather
-- than in the agent's prompt, and a dispatcher governor needs durable memory —
-- these three tables ARE that memory.
--
-- Re-runnable like every migration here: deploys may be retried after the
-- migration has already been applied.

-- ------------------------------------------------------- the flake gate ---
--
-- One row per check-run OUTCOME the factory was told about. Not "per failure":
-- a success on a head SHA that also failed is the single most decisive piece
-- of evidence the gate has (identical code, both answers => flaky), so it is
-- recorded with exactly the same weight as a failure.
--
-- `external_ref` is UNIQUE and it is the load-bearing column. GitHub redelivers
-- webhooks — after an outage, after a 5xx, sometimes for no reason at all — and
-- a gate that counts deliveries rather than distinct outcomes would let
-- GitHub's retry machinery MANUFACTURE the reproduction it is supposed to
-- prove. The ref is the check run's node id: stable across redelivery, and
-- different for a genuine re-run, which is the distinction the whole gate rests
-- on.
CREATE TABLE IF NOT EXISTS ci_check_observation (
  external_ref TEXT PRIMARY KEY,
  project      TEXT NOT NULL,
  branch       TEXT NOT NULL,
  head_sha     TEXT NOT NULL,
  check_name   TEXT NOT NULL,
  conclusion   TEXT NOT NULL,
  observed_at  TEXT NOT NULL
);

-- The gate's only query: "what has this exact check done on this exact commit?"
CREATE INDEX IF NOT EXISTS idx_ci_check_observation_sha
  ON ci_check_observation (project, head_sha, check_name);

-- ----------------------------------------------------- the strike budget ---
--
-- One row per remediation run the factory DISPATCHED. The budget counts
-- attempts, not failures-to-converge, and that is deliberate: Phase 2 measured
-- what a non-converging agent costs (100% of its tokens for 0% of the work),
-- and an attempt whose outcome is still unknown has already spent the money.
-- Counting dispatches bounds spend even when every run dies without reporting.
--
-- A fix that WORKS ends the loop by itself — the branch stops failing, so no
-- further signal arrives — which is why a successful attempt needs no discount.
CREATE TABLE IF NOT EXISTS ci_remediation_attempt (
  run_id        TEXT PRIMARY KEY,
  project       TEXT NOT NULL,
  branch        TEXT NOT NULL,
  head_sha      TEXT NOT NULL,
  check_name    TEXT NOT NULL,
  trace_id      TEXT NOT NULL,
  dispatched_at TEXT NOT NULL
);

-- The budget's only query: attempts on this branch inside the rolling window.
CREATE INDEX IF NOT EXISTS idx_ci_remediation_attempt_branch
  ON ci_remediation_attempt (project, branch, dispatched_at);

-- --------------------------------------------------------- the escalation ---
--
-- Strike-out hands the branch to a person, and this row is the durable half of
-- that handover. It exists so escalation is IDEMPOTENT: the failures keep
-- arriving after the budget is spent, and an escalation that re-fired on each
-- one would replace an unbounded spend loop with an unbounded notification
-- loop. The primary key is (project, branch) — one open escalation per branch,
-- inserted with INSERT OR IGNORE, and only the insert that actually lands
-- sends the message.
--
-- The row is written BEFORE the channel is told, because the durable record is
-- the escalation and the message is only its delivery: a Telegram outage must
-- not be able to make a struck-out branch look un-escalated to the next
-- delivery, which would put the loop straight back into dispatching.
CREATE TABLE IF NOT EXISTS ci_escalation (
  project     TEXT NOT NULL,
  branch      TEXT NOT NULL,
  head_sha    TEXT NOT NULL,
  check_name  TEXT NOT NULL,
  strikes     INTEGER NOT NULL,
  opened_at   TEXT NOT NULL,
  notified_at TEXT,
  PRIMARY KEY (project, branch)
);
