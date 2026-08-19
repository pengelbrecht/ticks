-- Project enrolment: the list of repositories this factory may run.
--
-- The bearer token proves "you are the operator of this deployment"; it does
-- NOT say which repositories the operator wants their credentials pointed at.
-- Without this table a leaked or over-shared token could submit a run for any
-- repository the deployment's GitHub credential can reach — the factory clones
-- and pushes with a repo-scoped PAT, so an unenrolled project is a blast-radius
-- question, not a bookkeeping one. A submission for a project that is not
-- enrolled is refused before the lease is asked for.
--
-- Re-runnable, like every migration here: deploys may be retried after the
-- migration has already been applied.

CREATE TABLE IF NOT EXISTS enrolled_project (
  project     TEXT PRIMARY KEY,
  enrolled_by TEXT NOT NULL,
  enrolled_at TEXT NOT NULL
);
