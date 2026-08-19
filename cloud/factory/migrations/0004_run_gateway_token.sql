-- Per-run AI Gateway credentials (D17).
--
-- All cloud model traffic goes through the operator's own AI Gateway, and the
-- credential a sandbox carries is scoped to ONE run: the run and tick ids on
-- the row are what stamp every request's gateway metadata, so spend is
-- attributable per run without trusting anything the agent says about itself.
--
-- Revoking the row is the kill switch. It stops a wedged or adversarial
-- orchestrator's model traffic at the credential layer, which is enforcement
-- that survives an agent that ignores every message it is sent — the same
-- reason budgets live in the Workflow rather than in a prompt (D14, D15).
--
-- Only the SHA-256 of the token is stored. The plaintext exists in the
-- sandbox's environment and nowhere else, and nothing ever reads it back.
CREATE TABLE IF NOT EXISTS run_gateway_token (
  token_hash     TEXT PRIMARY KEY,
  run_id         TEXT NOT NULL,
  -- The tick the credential is scoped to. Phase 1 boots one sandbox per run,
  -- so this is the epic; Phase 2's per-tick sandboxes mint one token each and
  -- the metadata narrows with no change here.
  tick_id        TEXT NOT NULL,
  -- Which orchestrator boot the token was issued for. Every boot rotates: the
  -- previous container's credential is dead before the replacement starts.
  attempt        INTEGER NOT NULL DEFAULT 1,
  issued_at      TEXT NOT NULL,
  revoked_at     TEXT,
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_run_gateway_token_run ON run_gateway_token (run_id);
