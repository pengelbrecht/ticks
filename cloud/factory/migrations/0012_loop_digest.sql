-- The daily digest's memory: one row per day the digest was built (tick zaw).
--
-- The gap this closes is Phase 2's hardest lesson one level up. There, a
-- supervisor could not report its own death because the record was written by
-- the thing that died. Here, a sweep can refuse every night for a week and a
-- review run can die without commenting, and nothing reports either — not
-- because the records are missing (`sweep_selection` and `pr_reviews` have
-- them) but because NOTHING ASKS. `tk cloud supervisor` answers on demand;
-- the clock never asks it.
--
-- So one cron trigger a day asks, and the answer becomes at most one message.
-- The table exists for two jobs, and neither of them is storage:
--
--  1. **At-most-once per day.** `digest_date` is the primary key and the claim
--     is an `INSERT OR IGNORE`: only the invocation that actually inserts the
--     row sends the message. Cloudflare may run a cron trigger more than once
--     for the same minute, and a digest that alerted per invocation would be
--     the cry-wolf failure this design exists to avoid.
--
--  2. **Telling "nothing to say" apart from "nothing ran".** A quiet day still
--     writes its row, with `findings = 0` and `sent_at` NULL. The digest sends
--     NO all-clear message — a daily "all fine" is a message people learn to
--     skip, and the day it says something they skip that too — so the row is
--     the only evidence the watch ran at all. This is `sweep_selection`'s rule
--     (a record is written whether or not anything happened) applied to the
--     watcher rather than to the work.
--
-- `sent_at` NULL beside a non-zero `findings` is a digest that was built and
-- could not be delivered. It is deliberately NOT retried within the day: the
-- conditions it reports on are still true tomorrow, so a lost delivery costs
-- one day of latency rather than a finding. The row is what an operator reads
-- to know that happened.
--
-- Re-runnable, like every migration here.
CREATE TABLE IF NOT EXISTS loop_digest (
  -- The UTC day this digest reports on, YYYY-MM-DD. The claim, not a label.
  digest_date TEXT PRIMARY KEY,
  built_at    TEXT NOT NULL,
  findings    INTEGER NOT NULL,
  -- The report as composed, or the sentence explaining a quiet day.
  detail      TEXT NOT NULL,
  sent_at     TEXT
);

-- The operator's question: when did this factory last have something to say?
CREATE INDEX IF NOT EXISTS idx_loop_digest_sent
  ON loop_digest (sent_at, digest_date);
