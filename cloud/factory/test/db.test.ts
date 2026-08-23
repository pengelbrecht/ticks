import { applyD1Migrations, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
  DISPATCH_REASONS,
  enrolProject,
  getEnrolledProject,
  getRun,
  listEnrolledProjects,
  listRuns,
  removeEnrolledProject,
  updateRunState,
  getSignal,
  insertDispatchLog,
  insertRun,
  insertSignal,
  listDispatchLogs,
  type DispatchReason,
  type DispatchLog,
  type EnrolledProject,
  type Run,
  type Signal,
} from "../src/db";

describe("factory D1 query layer", () => {
  it("re-applies the deploy migration set without changing the schema", async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    const tables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?, ?) ORDER BY name"
    )
      .bind("dispatch_log", "runs", "signals")
      .all<{ name: string }>();

    expect(tables.results.map(({ name }) => name)).toEqual([
      "dispatch_log",
      "runs",
      "signals",
    ]);
  });

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
      trace_id: "tr_0123456789abcdef0123456789abcdef",
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

  it("moves a run's state and lists it back", async () => {
    const run: Run = {
      run_id: "run-daq-state",
      project: "ticks/state",
      epic: "ko8",
      base_sha: "c".repeat(40),
      requested_by: "operator@example.com",
      state: "starting",
      started_at: "2026-08-19T12:00:00.000Z",
      ended_at: null,
      cost_usd: 0,
      trace_id: null,
    };
    await insertRun(env.DB, run);

    const stopping = await updateRunState(env.DB, run.run_id, "stopping");
    expect(stopping).toMatchObject({ run_id: run.run_id, state: "stopping", ended_at: null });

    const ended = await updateRunState(env.DB, run.run_id, "completed", "2026-08-19T13:00:00.000Z");
    expect(ended).toMatchObject({ state: "completed", ended_at: "2026-08-19T13:00:00.000Z" });

    await expect(listRuns(env.DB, { project: "ticks/state" })).resolves.toHaveLength(1);
    await expect(listRuns(env.DB, { project: "ticks/state", state: "starting" })).resolves.toEqual(
      []
    );
    // A state change for a run that does not exist is not an error, it is null.
    await expect(updateRunState(env.DB, "run-missing", "failed")).resolves.toBeNull();
  });

  // Enrolment is a security boundary (migrations/0003): the bearer token says
  // who the operator is, not which repositories they pointed the factory at.
  it("round-trips project enrolment and withdraws it", async () => {
    const project: EnrolledProject = {
      project: "ticks/enrolled",
      enrolled_by: "operator@example.com",
      enrolled_at: "2026-08-19T12:00:00.000Z",
    };

    await enrolProject(env.DB, project);
    await expect(getEnrolledProject(env.DB, project.project)).resolves.toEqual(project);
    await expect(listEnrolledProjects(env.DB)).resolves.toContainEqual(project);

    // Re-enrolling refreshes rather than failing on the primary key.
    await enrolProject(env.DB, { ...project, enrolled_by: "telegram" });
    await expect(getEnrolledProject(env.DB, project.project)).resolves.toMatchObject({
      enrolled_by: "telegram",
    });

    await expect(removeEnrolledProject(env.DB, project.project)).resolves.toBe(true);
    await expect(getEnrolledProject(env.DB, project.project)).resolves.toBeNull();
    await expect(removeEnrolledProject(env.DB, project.project)).resolves.toBe(false);
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
