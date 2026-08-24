-- What releases an escalated branch, and what a webhook crash leaves behind
-- (Phase 4 review, tick uls).
--
-- 0010 gave the CI remediation loop a durable escalation row and then never
-- read it. That was not a missing query, it was a missing decision: with
-- nothing asking "is this branch escalated?", the only thing standing between
-- a struck-out branch and a fresh WRITE-grade dispatch was the rolling strike
-- window — so as soon as the oldest of the three strikes aged out of 24h, the
-- branch the factory had already given up on silently resumed spending. And
-- because escalation deduped on a row that already existed, the human paged
-- once was never paged again.
--
-- The answer this migration encodes: a branch is released by a PERSON, never
-- by the clock. These columns are what "by a person" needs in order to be
-- durable — a state to be in, and a record of who ended it and when.

-- ------------------------------------------------- releasing an escalation ---
--
-- `state` is the gate the dispatcher reads: 'open' means the factory
-- dispatches nothing against this branch, whatever the strike window says.
-- Defaulting to 'open' is the safe backfill — every row written before this
-- migration WAS an open escalation, and a branch this factory gave up on
-- yesterday must not be released by a schema change.
ALTER TABLE ci_escalation ADD COLUMN state TEXT NOT NULL DEFAULT 'open';

-- When a person last released this branch, and who they said they were.
--
-- `cleared_at` deliberately OUTLIVES the release: it is also the strike
-- budget's floor. Clearing an escalation while the three strikes that caused
-- it are still inside the 24h window would otherwise release the branch into
-- an instant re-escalation on the next failure, which is a release in name
-- only. Attempts from before the clear are forgiven because the person who
-- cleared it is saying they have dealt with them.
--
-- It therefore survives a re-escalation (the row goes back to 'open' and keeps
-- the clear that preceded it) and is overwritten only by the NEXT clear.
ALTER TABLE ci_escalation ADD COLUMN cleared_at TEXT;
ALTER TABLE ci_escalation ADD COLUMN cleared_by TEXT;

-- The dispatcher's question, asked on every check-run delivery.
CREATE INDEX IF NOT EXISTS idx_ci_escalation_state
  ON ci_escalation (state, project, branch);

-- --------------------------------------------------- the webhook's own faults ---
--
-- The escalation above is what the loop does when it FAILS IN A WAY IT
-- PREDICTED. This table is what it does when it fails in a way it did not:
-- before this, an unexpected throw anywhere under the `check_run` door became
-- an unhandled 5xx, which means the one path built to page a human was the one
-- path that stayed silent when something unforeseen broke.
--
-- Keyed by the SHAPE of the failure rather than by the delivery, for the same
-- reason the escalation row exists: GitHub redelivers, and a fault that
-- alerted per delivery would replace a silent crash with an unbounded
-- notification loop. The first sighting alerts; every later sighting of the
-- same shape increments `occurrences` and says nothing. `cleared_at` releases
-- it exactly the way an escalation is released, so a fault that returns after
-- a person has dealt with it alerts again.
--
-- `fault_id` is a DIGEST of that shape, not the shape itself. The shape
-- includes the error message, and the id is handed back to whoever posted the
-- delivery — an opaque id lets an operator find the row without the door
-- reciting this factory's internals to the caller that broke it.
CREATE TABLE IF NOT EXISTS ci_webhook_fault (
  fault_id      TEXT PRIMARY KEY,
  event         TEXT NOT NULL,
  project       TEXT,
  branch        TEXT,
  detail        TEXT NOT NULL,
  occurrences   INTEGER NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  notified_at   TEXT,
  cleared_at    TEXT,
  cleared_by    TEXT
);

-- The operator's question: what is still waiting on a person?
CREATE INDEX IF NOT EXISTS idx_ci_webhook_fault_open
  ON ci_webhook_fault (cleared_at, last_seen_at);
