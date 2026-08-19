-- Deployment bookkeeping for the factory's D1 database.
--
-- The feature tables (signals, dispatch log, run index) land with the phases
-- that need them — see docs/design/cloud-factory.md. This first migration
-- exists so `tk factory deploy` has a migration to apply from day one and so
-- the deployed bundle's identity is recorded server-side: the operator can ask
-- a live factory which tk version and which bundle it is running, which is
-- what makes `tk upgrade` able to offer a redeploy against remote truth rather
-- than only against ~/.ticksrc.
--
-- One deployment serves one operator (D16), so this is a single-row table.

CREATE TABLE IF NOT EXISTS factory_deployment (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  tk_version    TEXT NOT NULL,
  bundle_sha256 TEXT NOT NULL,
  deployed_at   TEXT NOT NULL
);
