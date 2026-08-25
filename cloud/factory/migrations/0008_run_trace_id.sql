-- The trace id on the run index (D20, tick hyi).
--
-- One identifier joins "a message arrived" to "a container did this". It is
-- minted at whichever edge the work entered the factory through — an ingested
-- signal, or a run submitted straight from `tk cloud run` — and carried from
-- there onto the tick record, this row, the run's events and each worker
-- container's log stream.
--
-- Nullable, and null is honest rather than sloppy: a run recorded before this
-- column existed belongs to no traced chain, and backfilling an id would claim
-- a join that was never made. Every run started after this migration has one.
--
-- D1 has no `ADD COLUMN IF NOT EXISTS`, so unlike 0007 this file is not
-- self-guarding. It does not need to be: `wrangler d1 migrations apply` — what
-- `tk factory deploy` runs, and what test/apply-migrations.ts mirrors — records
-- each applied file in its own ledger and never re-runs one. A retried deploy
-- therefore skips this, rather than failing on a duplicate column.
ALTER TABLE runs ADD COLUMN trace_id TEXT;

-- The second of the three joins tick hyi's acceptance criterion asks for: one
-- query from a trace id to the run that implemented it.
CREATE INDEX IF NOT EXISTS idx_runs_trace_id ON runs (trace_id);
