-- Cron sweep selections (D14/D15, tick hye).
--
-- One row per sweep FIRING, written whether or not anything ran. That is the
-- point of the table: the design doc's bar for a sweep is that "why did it
-- pick these five" has a boring answer, and an answer that only exists when a
-- run was ignited cannot explain the morning nothing happened.
--
-- `record` is the whole selection as JSON — the policy as declared, every
-- number after clamping beside what was asked for, the ordering rule in words,
-- the frontier size, every candidate that passed the filter with its ordering
-- key and rank, and every candidate that was dropped with the one reason it
-- was. It is deliberately the whole thing rather than a join: the tracker it
-- was computed from moves, and a record that needs the repository at the
-- commit it was made from to be intelligible is not a record.
--
-- Re-runnable, like every migration here: deploys may be retried after the
-- migration has already been applied.

CREATE TABLE IF NOT EXISTS sweep_selection (
  sweep_id  TEXT PRIMARY KEY,
  project   TEXT NOT NULL,
  sweep     TEXT NOT NULL,
  cron      TEXT NOT NULL,
  fired_at  TEXT NOT NULL,
  base_sha  TEXT NOT NULL,
  outcome   TEXT NOT NULL CHECK (outcome IN ('ignited', 'queued', 'empty', 'refused')),
  run_id    TEXT,
  detail    TEXT NOT NULL,
  record    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sweep_selection_project_fired
  ON sweep_selection (project, fired_at);

-- A sweep's run is the join back to everything the run then did.
CREATE INDEX IF NOT EXISTS idx_sweep_selection_run
  ON sweep_selection (run_id);
