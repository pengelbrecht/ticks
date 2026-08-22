import { env, SELF } from "cloudflare:test";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { deriveTokenHash, mintFactoryToken } from "../src/auth";
import { insertDispatchLog, insertRun, insertRunGatewayToken } from "../src/db";
import { MAX_OBSERVE_DISPATCH, MAX_OBSERVE_EVENTS } from "../src/observe";
import { publishRunEvents, type RunEventSink } from "../src/run-events";

/**
 * `GET /api/observe` — the one read `tk factory dashboard` polls (tick t9s).
 *
 * The board needs five things at once: the runs, the phase of the one being
 * watched, the harness tail, the pending gates, and the refusals from
 * `dispatch_log`. Four of them were already readable one endpoint at a time;
 * the refusals and the `run_event` tail (tick bne) had no door at all, and a
 * TUI that opened five connections per second to assemble one frame would be
 * a worse answer than one read.
 *
 * It is OBSERVATION, not command: every assertion below reads records other
 * code wrote, nothing here starts, stops or steers a run, and the route
 * refuses every method but GET — so the operator-to-orchestrator vocabulary
 * stays run/stop/status/answer (D21).
 */

const BASE = "https://factory.example.com";
const PROJECT = "example-org/example-repo";

let token: string;
const originalHash = env.FACTORY_TOKEN_HASH;

beforeAll(async () => {
  token = mintFactoryToken();
  env.FACTORY_TOKEN_HASH = await deriveTokenHash(token);
});

afterAll(() => {
  if (originalHash === undefined) delete env.FACTORY_TOKEN_HASH;
  else env.FACTORY_TOKEN_HASH = originalHash;
});

const saved: Record<string, unknown> = {};

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
    else (env as unknown as Record<string, unknown>)[name] = value;
    delete saved[name];
  }
});

/** A sink that accepts everything, so the room records a delivered tail. */
const acceptingSink: RunEventSink = {
  async publish() {
    return { delivered: true, detail: "ok" };
  },
};

const get = (path: string, headers: Record<string, string> = { Authorization: `Bearer ${token}` }) =>
  SELF.fetch(`${BASE}${path}`, { headers });

type Observation = {
  observed_at: string;
  runs: { run_id: string; project: string; epic: string; state: string }[];
  projects: { project: string; lease: unknown; queued: unknown[] }[];
  dispatch: { run_id: string; tick_id: string; decision: string; reason: string | null }[];
  events_project: string | null;
  events: { epic: string; tick: string | null; type: string; delivered: boolean }[];
  gates: { id: string; tick_id?: string; resolution?: { answered_by: string } }[];
  focus: {
    run: { run_id: string };
    phase: { state: string; workflow: { id: string; status: string } | null };
    image: { image_ref: string; image_digest: string } | null;
    gates: { id: string; tick_id?: string; resolution?: { answered_by: string } }[];
    boot: { attempt: number; boots: number; last_issued_at: string | null };
  } | null;
};

async function recordedRun(runID: string, state = "running", project = PROJECT): Promise<void> {
  await insertRun(env.DB, {
    run_id: runID,
    project,
    epic: "t9s",
    base_sha: "c".repeat(40),
    requested_by: "operator@example.com",
    state,
    started_at: new Date(0).toISOString(),
    ended_at: null,
    cost_usd: 0,
  });
}

describe("GET /api/observe", () => {
  it("answers one read with the runs, the refusals and the event tail", async () => {
    set("RUN_EVENTS", acceptingSink);
    const project = "example-org/observe-frame";
    await recordedRun("run_observe_frame", "running", project);
    await insertDispatchLog(env.DB, {
      run_id: "run_observe_refused",
      tick_id: "t9s",
      decision: "lease_held_by:run_observe_frame",
      reason: "lease_held_by",
      at: "2026-08-22T06:00:00.000Z",
    });
    await publishRunEvents(env, project, [
      {
        type: "run_event",
        epicId: "t9s",
        taskId: "abc",
        source: "cloud:worker",
        event: { type: "task-started", timestamp: "2026-08-22T06:00:01.000Z", status: "working" },
      },
    ]);

    const response = await get(`/api/observe?project=${encodeURIComponent(project)}`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as Observation;

    expect(body.runs.map((run) => run.run_id)).toContain("run_observe_frame");
    expect(body.projects.map((entry) => entry.project)).toContain(project);
    expect(body.dispatch[0]).toMatchObject({
      run_id: "run_observe_refused",
      decision: "lease_held_by:run_observe_frame",
      reason: "lease_held_by",
    });
    expect(body.events_project).toBe(project);
    expect(body.events[0]).toMatchObject({ epic: "t9s", tick: "abc", type: "task-started" });
    expect(typeof body.observed_at).toBe("string");
    // No focus was asked for, so none is invented.
    expect(body.focus).toBeNull();
  });

  it("reports the focused run's phase, image and boot attempt", async () => {
    const runID = "run_observe_focus";
    await recordedRun(runID);
    await insertRunGatewayToken(env.DB, {
      token_hash: "hash-boot-1",
      run_id: runID,
      tick_id: "t9s",
      attempt: 1,
      issued_at: "2026-08-22T06:00:00.000Z",
      revoked_at: "2026-08-22T06:05:00.000Z",
      revoked_reason: "rotated:boot:2",
    });
    await insertRunGatewayToken(env.DB, {
      token_hash: "hash-boot-2",
      run_id: runID,
      tick_id: "t9s",
      attempt: 2,
      issued_at: "2026-08-22T06:05:00.000Z",
      revoked_at: null,
      revoked_reason: null,
    });

    const body = (await (await get(`/api/observe?run=${runID}`)).json()) as Observation;

    expect(body.focus).not.toBeNull();
    expect(body.focus!.run.run_id).toBe(runID);
    expect(body.focus!.phase.state).toBe("running");
    // The boot attempt the run is actually on — invisible until now, which
    // cost several diagnosis cycles (tick z1b).
    expect(body.focus!.boot).toEqual({
      attempt: 2,
      boots: 2,
      last_issued_at: "2026-08-22T06:05:00.000Z",
    });
    // The credential itself never leaves the control plane.
    expect(JSON.stringify(body.focus!.boot)).not.toContain("hash-boot");
  });

  it("reports the project's gates whether or not a run is focused", async () => {
    const project = "example-org/observe-gates";
    await recordedRun("run_observe_gates", "running", project);
    const room = env.RUN_ROOMS.get(env.RUN_ROOMS.idFromName(project));
    await room.registerQuestion({
      id: "gate-observe-1",
      tick_id: "t9s",
      kind: "gate",
      question: { text: "merge wave 6?" },
    });

    const body = (await (
      await get(`/api/observe?project=${encodeURIComponent(project)}`)
    ).json()) as Observation;

    // A gate belongs to the project's room, not to a run: it must be visible
    // with no focus, and it must survive the run that asked it.
    expect(body.focus).toBeNull();
    expect(body.gates.map((entry) => entry.id)).toContain("gate-observe-1");
    expect(body.gates[0]!.tick_id).toBe("t9s");
  });

  it("says a focused run is unknown rather than answering with an empty board", async () => {
    const response = await get("/api/observe?run=run_observe_missing");
    expect(response.status).toBe(404);
    expect((await response.json()) as { error: string }).toMatchObject({ error: "unknown_run" });
  });

  it("bounds the event and dispatch tails, and refuses a nonsense bound", async () => {
    const overEvents = await get(`/api/observe?events=${MAX_OBSERVE_EVENTS + 1}`);
    expect(overEvents.status).toBe(400);
    const overDispatch = await get(`/api/observe?dispatch=${MAX_OBSERVE_DISPATCH + 1}`);
    expect(overDispatch.status).toBe(400);
    expect((await get("/api/observe?events=none")).status).toBe(400);
  });

  it("is read-only: every method but GET is refused", async () => {
    const response = await SELF.fetch(`${BASE}/api/observe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: "{}",
    });
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });

  it("needs the factory token, like every other control-plane read", async () => {
    const response = await get("/api/observe", {});
    expect(response.status).toBe(401);
  });
});
