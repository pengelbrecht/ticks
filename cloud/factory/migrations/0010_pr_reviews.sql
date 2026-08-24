-- One row per pull request this factory has reviewed (UC5, tick v7g).
--
-- The table does three jobs that all reduce to the same sentence — *this run
-- was dispatched for that pull request, and it has said its piece once*:
--
--  1. **Dedup.** `pr_node_id` is UNIQUE, and it is the PR's GraphQL node id:
--     stable across edits, renames, reopens and a transfer, which the PR
--     NUMBER is not. GitHub redelivers webhooks with no bound on how late, so
--     without this a redelivery is a second paid run and a second comment on a
--     stranger's pull request.
--
--     Note the ordering this implies, and that it is the OPPOSITE of the
--     signal funnel's (`signal-inbox.ts` writes its dedup row AFTER the
--     commit): there, a claim written first would suppress the redelivery that
--     is the only thing which could still file a tick a failed commit never
--     wrote. Here the claim is written FIRST, because the two failure modes
--     are reversed — a lost redelivery costs one missed review, while a double
--     claim costs a duplicate paid run and a duplicate comment. The claim is
--     released again (the row deleted) on exactly the outcomes where nothing
--     was dispatched and a redelivery should retry.
--
--  2. **The binding a container cannot forge.** `run_id` is what
--     `POST /api/review` reads back: the run's own credential says which run is
--     speaking, and this row says which pull request that run may comment on.
--     A container therefore cannot name a PR — not because it is asked not to,
--     but because there is no field in which to say it (the same rule
--     `/api/wave` establishes for dispatch).
--
--  3. **At-most-once posting.** `posted_at` is claimed by a conditional UPDATE
--     (`WHERE run_id = ? AND posted_at IS NULL`) before the comment is sent,
--     so two concurrent posts cannot both reach GitHub. `comment_id` is the
--     durable evidence the run actually did its job — for a review run it is
--     what a changed branch is for an implementing run (tick ehy), because a
--     read-only run changes no branch by construction.
--
-- `state` is bookkeeping for an operator reading the table, never authority:
-- every decision above is made by a UNIQUE constraint or a conditional UPDATE.
CREATE TABLE IF NOT EXISTS pr_reviews (
  pr_node_id   TEXT PRIMARY KEY,
  project      TEXT NOT NULL,
  pr_number    INTEGER NOT NULL,
  head_sha     TEXT NOT NULL,
  base_sha     TEXT NOT NULL,
  run_id       TEXT,
  state        TEXT NOT NULL,
  detail       TEXT,
  posted_at    TEXT,
  comment_id   TEXT,
  claimed_at   TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pr_reviews_run ON pr_reviews (run_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_project ON pr_reviews (project, pr_number);
