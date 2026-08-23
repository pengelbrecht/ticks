-- Which forum topic a project's operator messages go into.
--
-- One bot and one chat now serve MANY projects, because one factory does. A
-- Telegram supergroup with Topics on ('forum' in the Bot API) gives each
-- project its own topic, and posting into an existing one needs exactly one
-- field on sendMessage: message_thread_id. This table is the project -> topic
-- map, and it is deliberately keyed by the same `project` the enrolment table
-- is: which topic a project posts into is part of ENROLLING that project, not
-- a fourth configuration surface for an operator to keep in sync with the
-- other three.
--
-- Nullable by absence rather than by column: a project with no row posts to
-- the chat itself, which is what a deployment without Topics — or one that has
-- not organised its chat yet — has. So the map is optional everywhere and the
-- legibility that does NOT depend on it (project/epic/tick in the message
-- text) still stands on its own.
--
-- A separate table rather than a column on enrolled_project, matching
-- run_image (migrations/0005) and run_progress (migrations/0006): additive,
-- created IF NOT EXISTS and therefore re-runnable, which ALTER TABLE ... ADD
-- COLUMN is not on SQLite. Deploys may be retried after the migration has
-- already been applied.

CREATE TABLE IF NOT EXISTS project_topic (
  project  TEXT PRIMARY KEY,
  -- The Bot API's message_thread_id, stored as text like every other channel
  -- identifier in this bundle (config ids are strings so a non-numeric channel
  -- fits later). It is a positive integer; the Worker refuses anything else
  -- before it reaches Telegram.
  topic_id TEXT NOT NULL,
  set_at   TEXT NOT NULL
);
