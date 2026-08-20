-- What the durable layer said about a run when it ended.
--
-- The run's index state answers "how did this end"; this answers "did anything
-- happen". They were the same question for exactly as long as completion was
-- inferred from the harness's exit status — which is how a run that printed 271
-- bytes and exited was recorded as COMPLETED and charged for, having dispatched
-- no wave, pushed no branch and left the epic's ticks open (tick ehy).
--
-- `progress` is `advanced`, `none` or `unknown`; `detail` is why, in the
-- operator's words. `unknown` is a real answer and deliberately distinct from
-- `none`: a remote nobody could read and a remote where nothing moved are
-- different facts about a run, the same way an unreadable cost and a zero cost
-- are (migrations/0004, run.cost_source).
--
-- A separate table rather than columns on `runs`, matching run_image
-- (migrations/0005): additive, created IF NOT EXISTS, and re-runnable, because
-- deploys may be retried after the migration has already been applied.

CREATE TABLE IF NOT EXISTS run_progress (
  run_id      TEXT PRIMARY KEY,
  progress    TEXT NOT NULL CHECK (progress IN ('advanced', 'none', 'unknown')),
  detail      TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);
