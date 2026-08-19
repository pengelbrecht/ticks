-- Phase 1 run and observability records.
--
-- These tables are operational state as well as the durable trace for a
-- signal's path through dispatch. Keep the migration re-runnable: deploys may
-- be retried after the D1 migration has already been applied.

CREATE TABLE IF NOT EXISTS runs (
  run_id      TEXT PRIMARY KEY,
  project     TEXT NOT NULL,
  epic        TEXT NOT NULL,
  base_sha    TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  state       TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  ended_at    TEXT,
  cost_usd    REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_runs_project_epic ON runs (project, epic);

CREATE TABLE IF NOT EXISTS signals (
  signal_id     TEXT PRIMARY KEY,
  source        TEXT NOT NULL,
  external_ref  TEXT NOT NULL UNIQUE,
  payload_digest TEXT NOT NULL,
  verdict       TEXT NOT NULL,
  tick_id       TEXT,
  received_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signals_tick_id ON signals (tick_id);

CREATE TABLE IF NOT EXISTS dispatch_log (
  run_id   TEXT NOT NULL,
  tick_id  TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason   TEXT CHECK (
    reason IS NULL OR reason IN (
      'budget_exhausted',
      'lease_held_by',
      'flake_gate',
      'awaiting_approval',
      'strike_out'
    )
  ),
  at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dispatch_log_run_tick_at
  ON dispatch_log (run_id, tick_id, at);
