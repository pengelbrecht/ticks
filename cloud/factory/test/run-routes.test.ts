import { env, SELF } from "cloudflare:test";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { deriveTokenHash, mintFactoryToken } from "../src/auth";
import {
  getRun,
  listDispatchLogs,
  listRunGatewayTokens,
  type DispatchLog,
} from "../src/db";
import { GATEWAY_PATH_PREFIX, issueRunToken } from "../src/gateway";
import { type QueuedSubmission } from "../src/run-room";
import {
  MIN_QUEUE_TTL_MS,
  roomFor,
  type RunWorkflowInstance,
  type RunWorkflowParams,
} from "../src/runs";

/**
 * The authenticated run surface (UC1b): submit, stop, status, queue.
 *
 * These run against real workerd with the real bindings — the D1 tables from
 * migrations/, the RunRoom DO, and a fake Workflows binding standing in for
 * the Run Workflow tick ldr lands. The fake is the ONLY substitution: it
 * exists because the binding does not, and it records exactly what the real
 * one is asked for, so the seam is proven rather than assumed.
 */

const BASE = "https://factory.example.com";

type CreatedInstance = { id: string; params: RunWorkflowParams };

/** A stand-in for the Run Workflow binding, recording what the routes ask of it. */
class FakeWorkflow {
  created: CreatedInstance[] = [];
  /** Set to make `sendEvent` throw — a Workflow not waiting on an event. */
  refuseEvents = false;
  /** Set to make the next `create` throw — a Workflows API that is having a bad day. */
  failNextCreate = false;
  events: { id: string; type: string }[] = [];
  status = "running";

  async create(options: { id?: string; params?: RunWorkflowParams }): Promise<RunWorkflowInstance> {
    if (this.failNextCreate) {
      this.failNextCreate = false;
      throw new Error("workflow instance could not be created");
    }
    const id = options.id ?? crypto.randomUUID();
    this.created.push({ id, params: options.params! });
    return this.#instance(id);
  }

  async get(id: string): Promise<RunWorkflowInstance> {
    return this.#instance(id);
  }

  #instance(id: string): RunWorkflowInstance {
    const workflow = this;
    return {
      id,
      async status() {
        return { status: workflow.status };
      },
      async sendEvent(event: { type: string }) {
        if (workflow.refuseEvents) throw new Error("instance is not waiting for an event");
        workflow.events.push({ id, type: event.type });
      },
    };
  }
}

let workflow: FakeWorkflow;
let token: string;
const originalHash = env.FACTORY_TOKEN_HASH;
const originalGateway = env.AI_GATEWAY_BASE_URL;
const originalFactoryURL = env.FACTORY_BASE_URL;

beforeAll(async () => {
  token = mintFactoryToken();
  env.FACTORY_TOKEN_HASH = await deriveTokenHash(token);
});

afterAll(() => {
  if (originalHash === undefined) delete env.FACTORY_TOKEN_HASH;
  else env.FACTORY_TOKEN_HASH = originalHash;
  if (originalGateway === undefined) delete env.AI_GATEWAY_BASE_URL;
  else env.AI_GATEWAY_BASE_URL = originalGateway;
  if (originalFactoryURL === undefined) delete env.FACTORY_BASE_URL;
  else env.FACTORY_BASE_URL = originalFactoryURL;
  delete env.RUN_WORKFLOW;
});

beforeEach(() => {
  workflow = new FakeWorkflow();
  env.RUN_WORKFLOW = workflow;
  // A submission is refused outright when the deployment has no gateway
  // configured (D17), so a harness that submits runs is a harness with one.
  env.AI_GATEWAY_BASE_URL = "https://gateway.ai.cloudflare.com/v1/account/ticks";
  env.FACTORY_BASE_URL = BASE;
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Built per call: the token is minted in beforeAll, after this module evaluates. */
const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });

function post(path: string, body?: unknown, headers: Record<string, string> = auth()) {
  return SELF.fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function get(path: string, headers: Record<string, string> = auth()) {
  return SELF.fetch(`${BASE}${path}`, { headers });
}

/** Each test takes its own project so one test's lease cannot leak into another. */
let projectCounter = 0;
async function enrolled(name: string): Promise<string> {
  const project = `ticks-test/${name}-${projectCounter++}`;
  const res = await post("/api/projects", { project, requested_by: "operator@example.com" });
  expect(res.status).toBe(201);
  return project;
}

const SHA = "3e15bff81cd888e82dfe521c507a46f4ddf6913b";
const OTHER_SHA = "a".repeat(40);

function submission(project: string, extra: Record<string, unknown> = {}) {
  return {
    project,
    epic: "ko8",
    base_sha: SHA,
    requested_by: "operator@example.com",
    ...extra,
  };
}

async function dispatchLogs(runID: string, epic = "ko8"): Promise<DispatchLog[]> {
  return listDispatchLogs(env.DB, runID, epic);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("authentication covers every run route", () => {
  const routes: [string, string][] = [
    ["POST", "/api/runs"],
    ["GET", "/api/runs"],
    ["GET", "/api/runs/run_1"],
    ["POST", "/api/runs/run_1/stop"],
    ["GET", "/api/projects"],
    ["POST", "/api/projects"],
    ["DELETE", "/api/projects/owner/repo"],
  ];

  it("rejects an absent bearer token", async () => {
    for (const [method, path] of routes) {
      const res = await SELF.fetch(`${BASE}${path}`, { method });
      expect(res.status, `${method} ${path} without a token`).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
    }
  });

  it("rejects a wrong bearer token", async () => {
    const wrong = { Authorization: `Bearer ${mintFactoryToken()}` };
    for (const [method, path] of routes) {
      const res = await SELF.fetch(`${BASE}${path}`, { method, headers: wrong });
      expect(res.status, `${method} ${path} with a wrong token`).toBe(401);
      expect(res.headers.get("WWW-Authenticate")).toContain('error="invalid_token"');
    }
  });

  it("never acts on an unauthenticated submission", async () => {
    const project = await enrolled("unauthenticated");

    await SELF.fetch(`${BASE}/api/runs`, {
      method: "POST",
      body: JSON.stringify(submission(project)),
    });

    expect(workflow.created).toEqual([]);
    await expect(roomFor(env, project).leaseStatus()).resolves.toBeNull();
  });
});

describe("project enrolment is a precondition, not bookkeeping", () => {
  it("refuses a submission for an unenrolled project with an actionable error", async () => {
    const res = await post("/api/runs", submission("ticks-test/never-enrolled"));

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string; detail: string; run_id: string };
    expect(body.error).toBe("project_not_enrolled");
    expect(body.detail).toContain("ticks-test/never-enrolled");
    expect(body.detail).toContain("/api/projects");
    // Nothing was started and no lease was taken.
    expect(workflow.created).toEqual([]);
    await expect(roomFor(env, "ticks-test/never-enrolled").leaseStatus()).resolves.toBeNull();
  });

  it("logs the unenrolled refusal to dispatch_log with a policy reason", async () => {
    const res = await post("/api/runs", submission("ticks-test/unenrolled-logged"));
    const { run_id } = (await res.json()) as { run_id: string };

    const logs = await dispatchLogs(run_id);
    expect(logs).toHaveLength(1);
    expect(logs[0]!.reason).toBe("awaiting_approval");
    expect(logs[0]!.decision).toContain("not_enrolled");
  });

  it("lists and withdraws enrolled projects", async () => {
    const project = await enrolled("enrolment-roundtrip");

    const listed = (await (await get("/api/projects")).json()) as {
      projects: { project: string }[];
    };
    expect(listed.projects.map((p) => p.project)).toContain(project);

    const removed = await SELF.fetch(`${BASE}/api/projects/${project}`, {
      method: "DELETE",
      headers: auth(),
    });
    expect(removed.status).toBe(200);

    // Withdrawn: the very next submission is refused again.
    expect((await post("/api/runs", submission(project))).status).toBe(403);
  });

  it("refuses to enrol anything but a canonical owner/repo pair", async () => {
    const res = await post("/api/projects", { project: "https://github.com/owner/repo" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_request" });
  });
});

describe("submission on a free project", () => {
  it("starts a run and reports it", async () => {
    const project = await enrolled("free");

    const res = await post("/api/runs", submission(project, { notify: "telegram" }));

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      run: { run_id: string; project: string; state: string; base_sha: string };
      workflow: { id: string; status: string };
    };
    expect(body.run.project).toBe(project);
    expect(body.run.state).toBe("starting");
    expect(body.run.base_sha).toBe(SHA);
    expect(body.run.run_id).toMatch(/^run_[0-9a-f]{32}$/);
    expect(body.workflow.id).toBe(body.run.run_id);

    // The run is in the index...
    await expect(getRun(env.DB, body.run.run_id)).resolves.toMatchObject({
      run_id: body.run.run_id,
      project,
      epic: "ko8",
      state: "starting",
    });
    // ...the Workflow was started with everything it boots from...
    expect(workflow.created).toHaveLength(1);
    expect(workflow.created[0]!.params).toMatchObject({
      run_id: body.run.run_id,
      project,
      epic: "ko8",
      base_sha: SHA,
      requested_by: "operator@example.com",
      notify: "telegram",
    });
    // ...including the lease's release credential, which nobody else sees.
    expect(workflow.created[0]!.params.lease_token).toEqual(expect.any(String));
    const responseText = JSON.stringify(body);
    expect(responseText).not.toContain(workflow.created[0]!.params.lease_token);

    // ...and the project's lease is held by it.
    await expect(roomFor(env, project).leaseStatus()).resolves.toMatchObject({
      run_id: body.run.run_id,
      epic: "ko8",
      origin: "cloud",
    });
  });

  it("writes the ignition to dispatch_log", async () => {
    const project = await enrolled("free-logged");
    const { run } = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };

    const logs = await dispatchLogs(run.run_id);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ decision: "dispatched", reason: null, tick_id: "ko8" });
  });

  it("leaves nothing behind when the Workflow refuses to start", async () => {
    const project = await enrolled("ignition-failure");
    workflow.failNextCreate = true;

    const res = await post("/api/runs", submission(project));

    expect(res.status).toBe(503);
    // The lease is handed back and the index row is undone, so the failure
    // costs a retry rather than wedging the project or burning a run id.
    await expect(roomFor(env, project).leaseStatus()).resolves.toBeNull();
    const listed = (await (
      await get(`/api/runs?project=${encodeURIComponent(project)}`)
    ).json()) as { runs: unknown[] };
    expect(listed.runs).toEqual([]);

    // And the very next submission succeeds.
    expect((await post("/api/runs", submission(project))).status).toBe(201);
  });

  it("fails closed when the deployment has no Run Workflow binding", async () => {
    const project = await enrolled("no-workflow");
    delete env.RUN_WORKFLOW;

    const res = await post("/api/runs", submission(project));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: "run_unavailable" });
    // Nothing recorded, nothing leased: a run that cannot boot is not a run.
    await expect(roomFor(env, project).leaseStatus()).resolves.toBeNull();
  });

  it("fails closed when no AI Gateway is configured, naming tk factory setup", async () => {
    // D17: a run's model traffic goes through the operator's own gateway or it
    // does not go. The stop is HERE, at submission, while there is still an
    // operator reading the answer — never a sandbox that quietly falls back to
    // a vendor default.
    const project = await enrolled("no-gateway");
    delete env.AI_GATEWAY_BASE_URL;

    const res = await post("/api/runs", submission(project));

    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; detail: string };
    expect(body.error).toBe("run_unavailable");
    expect(body.detail).toContain("tk factory setup");
    await expect(roomFor(env, project).leaseStatus()).resolves.toBeNull();
    expect(workflow.created).toHaveLength(0);
  });
});

describe("submission on a leased project", () => {
  it("refuses, naming the holding run", async () => {
    const project = await enrolled("leased");
    const first = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };

    const res = await post("/api/runs", submission(project, { epic: "afj", base_sha: OTHER_SHA }));

    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: string;
      reason: string;
      holder: { run_id: string; epic: string; origin: string; expires_at: string };
      run_id: string;
    };
    expect(body.error).toBe("lease_held");
    // The holder comes back verbatim from the lease refusal (afj), token withheld.
    expect(body.reason).toBe(`lease_held_by:${first.run.run_id}`);
    expect(body.holder).toMatchObject({
      run_id: first.run.run_id,
      epic: "ko8",
      origin: "cloud",
    });
    expect(body.holder).not.toHaveProperty("token");
    expect(body.holder.expires_at).toEqual(expect.any(String));

    // The refused submission started nothing.
    expect(workflow.created).toHaveLength(1);
    await expect(getRun(env.DB, body.run_id)).resolves.toBeNull();
  });

  it("writes the refusal to dispatch_log with its reason code", async () => {
    const project = await enrolled("leased-logged");
    const first = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };
    const refused = (await (
      await post("/api/runs", submission(project, { epic: "afj" }))
    ).json()) as { run_id: string };

    const logs = await dispatchLogs(refused.run_id, "afj");
    expect(logs).toHaveLength(1);
    expect(logs[0]!.reason).toBe("lease_held_by");
    expect(logs[0]!.decision).toContain(first.run.run_id);
  });
});

describe("queued submissions (D22)", () => {
  it("parks instead of bouncing when queue is set", async () => {
    const project = await enrolled("queue-park");
    const first = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };

    const res = await post(
      "/api/runs",
      submission(project, { epic: "afj", base_sha: OTHER_SHA, queue: true })
    );

    expect(res.status).toBe(202);
    const body = (await res.json()) as {
      queued: QueuedSubmission;
      holder: { run_id: string };
    };
    expect(body.queued).toMatchObject({
      project,
      epic: "afj",
      base_sha: OTHER_SHA,
      blocked_by: first.run.run_id,
    });
    expect(body.holder.run_id).toBe(first.run.run_id);
    // Parked, not started.
    expect(workflow.created).toHaveLength(1);

    const logs = await dispatchLogs(body.queued.run_id, "afj");
    expect(logs).toHaveLength(1);
    expect(logs[0]!.reason).toBe("lease_held_by");
    expect(logs[0]!.decision).toContain("queued");
  });

  it("ignites the parked submission when the lease releases", async () => {
    const project = await enrolled("queue-ignite");
    const first = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };
    const parked = (await (
      await post("/api/runs", submission(project, { epic: "afj", base_sha: OTHER_SHA, queue: true }))
    ).json()) as { queued: QueuedSubmission };

    // The holder finishes and releases with its own credential — exactly what
    // the Run Workflow does at finalize.
    const released = await roomFor(env, project).releaseDispatchLease({
      run_id: first.run.run_id,
      token: workflow.created[0]!.params.lease_token,
    });

    expect(released.ok).toBe(true);
    if (!released.ok) return;
    expect(released.ignited).toMatchObject({ run_id: parked.queued.run_id, epic: "afj" });

    // The queued submission is now a real run, holding the lease it waited for.
    await expect(getRun(env.DB, parked.queued.run_id)).resolves.toMatchObject({
      run_id: parked.queued.run_id,
      epic: "afj",
      base_sha: OTHER_SHA,
      state: "starting",
    });
    expect(workflow.created.map((c) => c.id)).toEqual([first.run.run_id, parked.queued.run_id]);
    await expect(roomFor(env, project).leaseStatus()).resolves.toMatchObject({
      run_id: parked.queued.run_id,
    });
    await expect(roomFor(env, project).listQueuedSubmissions()).resolves.toEqual([]);

    const logs = await dispatchLogs(parked.queued.run_id, "afj");
    expect(logs.map((l) => l.decision)).toEqual([
      expect.stringContaining("queued"),
      "dispatched",
    ]);
  });

  it("expires on its window rather than igniting work hours later", async () => {
    const project = await enrolled("queue-expiry");
    const first = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };
    await post(
      "/api/runs",
      submission(project, {
        epic: "afj",
        base_sha: OTHER_SHA,
        queue: true,
        queue_ttl_ms: MIN_QUEUE_TTL_MS,
      })
    );

    await wait(MIN_QUEUE_TTL_MS + 60);

    // Expired entries read as absent before any alarm deletes them.
    await expect(roomFor(env, project).listQueuedSubmissions()).resolves.toEqual([]);

    const released = await roomFor(env, project).releaseDispatchLease({
      run_id: first.run.run_id,
      token: workflow.created[0]!.params.lease_token,
    });
    expect(released.ok).toBe(true);
    if (released.ok) expect(released.ignited).toBeNull();
    expect(workflow.created).toHaveLength(1);
  });

  it("refuses a queue window outside the accepted bounds", async () => {
    const project = await enrolled("queue-bounds");
    await post("/api/runs", submission(project));

    const res = await post(
      "/api/runs",
      submission(project, { epic: "afj", queue: true, queue_ttl_ms: 5 })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_request" });
  });
});

describe("status", () => {
  it("reports lease, phase, gates and queued submissions for one run", async () => {
    const project = await enrolled("status-one");
    const { run } = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };
    await post("/api/runs", submission(project, { epic: "afj", base_sha: OTHER_SHA, queue: true }));
    await roomFor(env, project).registerQuestion({
      id: `gate-${run.run_id}`,
      kind: "gate",
      question: { text: "Merge wave 1?" },
    });

    const res = await get(`/api/runs/${run.run_id}`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      run: { run_id: string };
      phase: { state: string; workflow: { id: string; status: string } };
      lease: { run_id: string };
      queued: QueuedSubmission[];
      gates: { id: string; kind: string }[];
      stop: unknown;
    };
    expect(body.run.run_id).toBe(run.run_id);
    expect(body.phase).toEqual({
      state: "starting",
      workflow: { id: run.run_id, status: "running" },
    });
    expect(body.lease).toMatchObject({ run_id: run.run_id });
    expect(body.queued).toHaveLength(1);
    expect(body.queued[0]).toMatchObject({ epic: "afj" });
    expect(body.gates.map((g) => g.id)).toEqual([`gate-${run.run_id}`]);
    expect(body.stop).toBeNull();
  });

  it("404s an unknown run", async () => {
    const res = await get("/api/runs/run_missing");

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "unknown_run" });
  });

  it("lists runs with the arbiter state of every project it mentions", async () => {
    const project = await enrolled("status-list");
    const { run } = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };
    await post("/api/runs", submission(project, { epic: "afj", base_sha: OTHER_SHA, queue: true }));

    const body = (await (await get(`/api/runs?project=${encodeURIComponent(project)}`)).json()) as {
      runs: { run_id: string }[];
      projects: { project: string; lease: { run_id: string }; queued: QueuedSubmission[] }[];
    };

    expect(body.runs.map((r) => r.run_id)).toEqual([run.run_id]);
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0]!.project).toBe(project);
    expect(body.projects[0]!.lease).toMatchObject({ run_id: run.run_id });
    expect(body.projects[0]!.queued).toHaveLength(1);
  });

  it("refuses a filter outside the vocabulary rather than answering something else", async () => {
    expect((await get("/api/runs?state=vibing")).status).toBe(400);
    expect((await get("/api/runs?limit=0")).status).toBe(400);
    expect((await get("/api/runs?project=not-a-pair")).status).toBe(400);
  });
});

describe("stop is enforced at the control plane", () => {
  /** Puts a run in the state the Run Workflow would have moved it to. */
  async function markRunning(runID: string): Promise<void> {
    await env.DB.prepare("UPDATE runs SET state = 'running' WHERE run_id = ?").bind(runID).run();
  }

  it("transitions a running run to a clean stop without the orchestrator cooperating", async () => {
    const project = await enrolled("stop-clean");
    const { run } = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };
    await markRunning(run.run_id);
    // The Workflow is not waiting for an event and the orchestrator is wedged:
    // nothing downstream agrees to the stop, and it happens anyway.
    workflow.refuseEvents = true;

    const res = await post(`/api/runs/${run.run_id}/stop`, { requested_by: "operator@example.com" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      run: { state: string };
      stop: { run_id: string; mode: string; requested_by: string };
      workflow_notified: boolean;
    };
    expect(body.run.state).toBe("stopping");
    expect(body.stop).toMatchObject({
      run_id: run.run_id,
      mode: "clean",
      requested_by: "operator@example.com",
    });
    expect(body.workflow_notified).toBe(false);

    // Durable on both sides: the index and the arbiter the Workflow reads.
    await expect(getRun(env.DB, run.run_id)).resolves.toMatchObject({ state: "stopping" });
    await expect(roomFor(env, project).stopRequest(run.run_id)).resolves.toMatchObject({
      mode: "clean",
    });
    const status = (await (await get(`/api/runs/${run.run_id}`)).json()) as {
      stop: { mode: string };
      phase: { state: string };
    };
    expect(status.stop).toMatchObject({ mode: "clean" });
    expect(status.phase.state).toBe("stopping");
  });

  it("notifies a Workflow that is listening, as an optimisation on top of the record", async () => {
    const project = await enrolled("stop-notified");
    const { run } = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };
    await markRunning(run.run_id);

    const body = (await (await post(`/api/runs/${run.run_id}/stop`)).json()) as {
      workflow_notified: boolean;
    };

    expect(body.workflow_notified).toBe(true);
    expect(workflow.events).toEqual([{ id: run.run_id, type: "stop" }]);
  });

  it("is idempotent: a repeated stop is the same stop", async () => {
    const project = await enrolled("stop-twice");
    const { run } = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };
    await markRunning(run.run_id);

    const first = (await (await post(`/api/runs/${run.run_id}/stop`)).json()) as {
      stop: { requested_at: string };
      already_stopping: boolean;
    };
    const second = (await (await post(`/api/runs/${run.run_id}/stop`)).json()) as {
      stop: { requested_at: string };
      already_stopping: boolean;
    };

    expect(first.already_stopping).toBe(false);
    expect(second.already_stopping).toBe(true);
    expect(second.stop.requested_at).toBe(first.stop.requested_at);
  });

  // ------------------------------------------------------- the hard stop ---

  /** One model request made with a sandbox's own credential, through the route. */
  const modelCall = (runToken: string) =>
    SELF.fetch(`${BASE}${GATEWAY_PATH_PREFIX}/anthropic/v1/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${runToken}`, "content-type": "application/json" },
      body: "{}",
    });

  async function liveRunWithCredential(name: string): Promise<{ runID: string; token: string }> {
    const project = await enrolled(name);
    const { run } = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };
    await markRunning(run.run_id);
    const { token: runToken } = await issueRunToken(env, {
      run_id: run.run_id,
      tick_id: "ko8",
      attempt: 1,
    });
    return { runID: run.run_id, token: runToken };
  }

  it("kills the credential in the request that asks for a hard stop", async () => {
    // Tick gyl. A clean stop is right for an ordinary stop and wrong for a
    // runaway: the live run this came from was at twice its budget and kept
    // spending through its own stop. `--now` revokes first and the unwind
    // happens afterwards, on a container that can no longer spend.
    const { runID, token: runToken } = await liveRunWithCredential("stop-hard");
    workflow.refuseEvents = true;

    const res = await post(`/api/runs/${runID}/stop`, {
      requested_by: "operator@example.com",
      mode: "hard",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      run: { state: string };
      stop: { mode: string };
      mode: string;
      tokens_revoked: number;
    };
    expect(body.mode).toBe("hard");
    expect(body.stop.mode).toBe("hard");
    expect(body.tokens_revoked).toBe(1);
    expect(body.run.state).toBe("stopping");

    // The next model request, not the next observation: nothing downstream
    // agreed to anything, and the credential is already dead.
    const refused = await modelCall(runToken);
    expect(refused.status).toBe(403);
    await expect(refused.json()).resolves.toMatchObject({ error: "run_token_revoked" });
  });

  it("leaves the credential live on a clean stop, and says which stop it performed", async () => {
    const { runID } = await liveRunWithCredential("stop-clean-credential");

    const body = (await (
      await post(`/api/runs/${runID}/stop`, { requested_by: "operator@example.com" })
    ).json()) as { mode: string; tokens_revoked: number };

    expect(body.mode).toBe("clean");
    expect(body.tokens_revoked).toBe(0);
    // In-flight work still has its window: the Workflow revokes at the end of
    // the grace period, not here.
    const tokens = await listRunGatewayTokens(env.DB, runID);
    expect(tokens.every((entry) => entry.revoked_at === null)).toBe(true);
  });

  it("escalates a clean stop that is not stopping anything, and never downgrades", async () => {
    const { runID, token: runToken } = await liveRunWithCredential("stop-escalate");

    const clean = (await (await post(`/api/runs/${runID}/stop`)).json()) as {
      mode: string;
      already_stopping: boolean;
    };
    expect(clean.mode).toBe("clean");

    // The exact sequence the incident took: a clean stop, then a human
    // watching the spend continue. An escalation is a new decision, not a
    // repeat of the stop that already stood.
    const hard = (await (await post(`/api/runs/${runID}/stop`, { mode: "hard" })).json()) as {
      mode: string;
      already_stopping: boolean;
      tokens_revoked: number;
    };
    expect(hard.mode).toBe("hard");
    expect(hard.already_stopping).toBe(false);
    expect(hard.tokens_revoked).toBe(1);
    expect((await modelCall(runToken)).status).toBe(403);

    const back = (await (await post(`/api/runs/${runID}/stop`)).json()) as { mode: string };
    expect(back.mode).toBe("hard");
    await expect(roomFor(env, (await getRun(env.DB, runID))!.project).stopRequest(runID)).resolves
      .toMatchObject({ mode: "hard" });
  });

  it("refuses a stop mode it does not know rather than quietly stopping cleanly", async () => {
    const { runID } = await liveRunWithCredential("stop-mode-unknown");

    const res = await post(`/api/runs/${runID}/stop`, { mode: "immediate" });

    expect(res.status).toBe(400);
    const tokens = await listRunGatewayTokens(env.DB, runID);
    expect(tokens.every((entry) => entry.revoked_at === null)).toBe(true);
    await expect(roomFor(env, (await getRun(env.DB, runID))!.project).stopRequest(runID)).resolves
      .toBeNull();
  });

  it("404s an unknown run and 409s one that already ended", async () => {
    const project = await enrolled("stop-ended");
    const { run } = (await (await post("/api/runs", submission(project))).json()) as {
      run: { run_id: string };
    };
    await env.DB.prepare("UPDATE runs SET state = 'completed' WHERE run_id = ?")
      .bind(run.run_id)
      .run();

    expect((await post("/api/runs/run_missing/stop")).status).toBe(404);

    const ended = await post(`/api/runs/${run.run_id}/stop`);
    expect(ended.status).toBe(409);
    await expect(ended.json()).resolves.toMatchObject({ error: "run_not_active" });
  });
});

describe("request validation", () => {
  it("refuses a submission that is not pinned to a pushed sha", async () => {
    const project = await enrolled("validation-sha");

    const res = await post("/api/runs", submission(project, { base_sha: "HEAD" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "invalid_request",
      detail: expect.stringContaining("base_sha"),
    });
  });

  it("refuses a remote URL where the canonical owner/repo pair belongs", async () => {
    const res = await post(
      "/api/runs",
      submission("git@github.com:owner/repo.git", { base_sha: SHA })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_request" });
  });

  it("refuses a missing field and a non-JSON body", async () => {
    const project = await enrolled("validation-fields");

    const missing = await post("/api/runs", { project, base_sha: SHA });
    expect(missing.status).toBe(400);

    const garbage = await SELF.fetch(`${BASE}/api/runs`, {
      method: "POST",
      headers: auth(),
      body: "not json",
    });
    expect(garbage.status).toBe(400);
  });

  it("answers 405 with an Allow header for a wrong method", async () => {
    const res = await SELF.fetch(`${BASE}/api/runs`, { method: "PUT", headers: auth() });

    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, POST");
  });

  it("404s an unrouted path under /api", async () => {
    const res = await get("/api/runs/run_1/steer");

    expect(res.status).toBe(404);
  });
});

/**
 * The image a run booted (tick z1b).
 *
 * A container rollout is asynchronous: `wrangler deploy` creates it and
 * returns, so the Worker can be new while the container application still
 * serves the previous image. `tk factory deploy` now waits for that rollout and
 * records the image it confirmed; a run stamps itself with that image at
 * ignition so the operator can tell a fix that did not work from a fix that was
 * never running.
 */
describe("a run records the orchestrator image it booted", () => {
  const DIGEST = `sha256:${"b".repeat(64)}`;
  const REF = `registry.cloudflare.com/acct/ticks-orchestrator@${DIGEST}`;

  async function confirmDeployedImage(ref: string, digest: string): Promise<void> {
    await env.DB.prepare(
      `INSERT INTO factory_deployment_image (id, image_ref, image_digest, confirmed_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET image_ref=excluded.image_ref,
         image_digest=excluded.image_digest, confirmed_at=excluded.confirmed_at`
    )
      .bind(ref, digest, new Date().toISOString())
      .run();
  }

  afterEach(async () => {
    await env.DB.prepare("DELETE FROM factory_deployment_image").run();
  });

  it("reports the confirmed image on the run's status", async () => {
    await confirmDeployedImage(REF, DIGEST);
    const project = await enrolled("image-stamped");

    const started = await post("/api/runs", submission(project));
    expect(started.status).toBe(201);
    const runID = ((await started.json()) as { run: { run_id: string } }).run.run_id;

    const status = await get(`/api/runs/${runID}`);
    expect(status.status).toBe(200);
    const body = (await status.json()) as { image: { image_ref: string; image_digest: string } | null };
    expect(body.image).toEqual({ image_ref: REF, image_digest: DIGEST });
  });

  it("keeps a finished run's image after the deployment moves to a new one", async () => {
    await confirmDeployedImage(REF, DIGEST);
    const project = await enrolled("image-frozen");

    const started = await post("/api/runs", submission(project));
    const runID = ((await started.json()) as { run: { run_id: string } }).run.run_id;

    // The next deploy rolls a new image out. What the run above booted must not
    // move with it — that is the whole reason the stamp is per run.
    const nextDigest = `sha256:${"c".repeat(64)}`;
    await confirmDeployedImage(`registry.cloudflare.com/acct/ticks-orchestrator@${nextDigest}`, nextDigest);

    const status = await get(`/api/runs/${runID}`);
    const body = (await status.json()) as { image: { image_digest: string } | null };
    expect(body.image?.image_digest).toBe(DIGEST);
  });

  it("reports no image for a factory whose rollout was never confirmed", async () => {
    const project = await enrolled("image-unconfirmed");

    const started = await post("/api/runs", submission(project));
    expect(started.status).toBe(201);
    const runID = ((await started.json()) as { run: { run_id: string } }).run.run_id;

    const status = await get(`/api/runs/${runID}`);
    const body = (await status.json()) as { image: unknown };
    expect(body.image).toBeNull();
  });

  it("still ignites when the image cannot be recorded", async () => {
    await confirmDeployedImage(REF, DIGEST);
    const project = await enrolled("image-unwritable");
    // The stamp is observability: a run that ignited must not be undone
    // because a bookkeeping row could not be written.
    await env.DB.prepare("DROP TABLE run_image").run();
    try {
      const started = await post("/api/runs", submission(project));
      expect(started.status).toBe(201);
    } finally {
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS run_image (
           run_id       TEXT PRIMARY KEY,
           image_ref    TEXT NOT NULL,
           image_digest TEXT NOT NULL,
           recorded_at  TEXT NOT NULL
         )`
      ).run();
    }
  });
});
