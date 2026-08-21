-- Which orchestrator container image the deployment serves, and which one each
-- run booted.
--
-- `wrangler deploy` creates the container rollout and returns without waiting
-- for it, so the Worker and its bindings can be new while the container
-- application is still serving the PREVIOUS image. `tk factory deploy` now
-- waits for that rollout and records the image it confirmed serving in
-- factory_deployment_image; a run stamps itself with that image as it starts.
--
-- The stamp is what makes the residual gap visible instead of invisible. Two
-- runs producing byte-identical output across a deploy is indistinguishable
-- from a fix that did not work — unless the operator can see that both runs
-- booted the same image. `tk cloud status <run>` reads run_image for exactly
-- that.
--
-- Both tables are additive and created IF NOT EXISTS: deploys may be retried
-- after the migration has already been applied.

CREATE TABLE IF NOT EXISTS factory_deployment_image (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  -- The digest-pinned reference, as the container application reports it.
  image_ref    TEXT NOT NULL,
  image_digest TEXT NOT NULL,
  -- When the rollout was CONFIRMED, not when the deploy started: this row
  -- exists only for an image the application actually answered with.
  confirmed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS run_image (
  run_id       TEXT PRIMARY KEY,
  image_ref    TEXT NOT NULL,
  image_digest TEXT NOT NULL,
  recorded_at  TEXT NOT NULL
);
