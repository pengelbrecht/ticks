import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
  DISPATCH_REASONS,
  getRun,
  getSignal,
  insertDispatchLog,
  insertRun,
  insertSignal,
  listDispatchLogs,
  type DispatchReason,
  type DispatchLog,
  type Run,
  type Signal,
} from "../src/db";

describe("factory D1 query layer", () => {
  it("round-trips a run through the migrated D1 table", async () => {
    const run: Run = {
      run_id: "run-xp9",
      project: "ticks",
      epic: "ko8",
      base_sha: "3e15bff81cd888e82dfe521c507a46f4ddf6913b",
      requested_by: "operator@example.com",
      state: "running",
      started_at: "2026-08-19T12:00:00.000Z",
      ended_at: null,
      cost_usd: 1.25,
    };

    await insertRun(env.DB, run);

    await expect(getRun(env.DB, run.run_id)).resolves.toEqual(run);
  });

  it("round-trips a signal through the migrated D1 table", async () => {
    const signal: Signal = {
      signal_id: "signal-xp9",
      source: "github",
      external_ref: "github:event:xp9",
      payload_digest: "sha256:payload-xp9",
      verdict: "accepted",
      tick_id: "tick-xp9",
      received_at: "2026-08-19T12:01:00.000Z",
    };

    await insertSignal(env.DB, signal);

    await expect(getSignal(env.DB, signal.signal_id)).resolves.toEqual(signal);
  });

  it("round-trips a dispatch decision and keeps refusal reasons closed", async () => {
    const reason: DispatchReason = "lease_held_by";
    const dispatch: DispatchLog = {
      run_id: "run-xp9",
      tick_id: "tick-xp9",
      decision: "refused",
      reason,
      at: "2026-08-19T12:02:00.000Z",
    };

    await insertDispatchLog(env.DB, dispatch);

    await expect(listDispatchLogs(env.DB, dispatch.run_id, dispatch.tick_id)).resolves.toEqual([
      dispatch,
    ]);
    expect(DISPATCH_REASONS).toEqual([
      "budget_exhausted",
      "lease_held_by",
      "flake_gate",
      "awaiting_approval",
      "strike_out",
    ]);
  });

  it("rejects a dispatch reason outside the policy vocabulary", async () => {
    await expect(
      env.DB.prepare(
        'INSERT INTO dispatch_log (run_id, tick_id, decision, reason, "at") VALUES (?, ?, ?, ?, ?)'
      )
        .bind(
          "run-invalid-reason",
          "tick-invalid-reason",
          "refused",
          "unknown",
          "2026-08-19T12:03:00.000Z"
        )
        .run()
    ).rejects.toThrow();
  });
});
