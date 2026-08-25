-- A review that never ran, and the comment that said so (tick 6tx).
--
-- A PR review is submitted with `queue: true`, so it parks behind a live
-- dispatch lease rather than bouncing (D22). Phase 2 measured container waves
-- at 60-90 minutes and the default queue window is 30, so a review submitted
-- while an epic run holds the project's lease does not merely *sometimes*
-- expire — expiring is the normal outcome.
--
-- The lease behaviour is D4 working as designed and an epic genuinely outranks
-- a review. The defect was the SILENCE: the room deleted the parked row on an
-- alarm and nothing else happened, so from outside the pull request "no review
-- because nothing was wrong" and "no review because the window closed behind
-- somebody else's run" looked identical. That is exactly the collapse Phase 2
-- ruled out (`.tick/learnings.md`: never collapse distinct failure classes
-- into one message).
--
-- Two columns rather than one, and the split is the point:
--
--  * `expired_at` is the FACT — this pull request's review window closed with
--    no run ever started. It is written first, by a conditional UPDATE, which
--    is also the at-most-once claim on announcing it (`WHERE expired_at IS
--    NULL AND comment_id IS NULL`): two rooms, a retry, or an alarm that fires
--    twice cannot each post a notice.
--
--  * `expiry_comment_id` is the TELLING — the comment the PR author can
--    actually read. Separate from `comment_id` deliberately: `comment_id` is
--    the durable evidence a review run did its job (migrations/0010), and a
--    notice that no review happened is not that. Folding them would make a
--    reviewed pull request and an abandoned one indistinguishable in the one
--    column every other reader treats as "this was reviewed".
--
-- The gap between them is a third distinct outcome and stays legible: a row
-- with `expired_at` and no `expiry_comment_id` is a review that expired AND
-- whose author was never told, which the daily digest (tick zaw) reports as a
-- finding of its own.
--
-- Re-runnable is not available for ADD COLUMN in SQLite, so these run once,
-- like 0009 — wrangler's own migration bookkeeping is what stops a re-apply.
ALTER TABLE pr_reviews ADD COLUMN expired_at TEXT;
ALTER TABLE pr_reviews ADD COLUMN expiry_comment_id TEXT;

-- The digest's question: which reviews expired unrun, most recent first, and
-- was the author told?
CREATE INDEX IF NOT EXISTS idx_pr_reviews_expired
  ON pr_reviews (expired_at, expiry_comment_id);
