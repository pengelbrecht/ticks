import { env, SELF } from "cloudflare:test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  listWorkerLogStreams,
  readWorkerLogTail,
  workerLogSink,
  writeHarnessSegment,
  writeWorkerLogSegment,
} from "../src/artifacts";
import { deriveTokenHash, mintFactoryToken } from "../src/auth";
import { insertRun } from "../src/db";
import type {
  OrchestratorSandbox,
  SandboxBinding,
  SandboxOutput,
  SandboxProcessState,
  SandboxProcessView,
} from "../src/sandbox";
import type { WorkerCollector, WorkerReport, WorkerTask } from "../src/worker-collect";
import { dispatchWave, type Sleeper, type WorkSpec } from "../src/worker-dispatch";

/**
 * A worker container's OWN output (tick 0fg).
 *
 * `tk cloud logs <run>` streams the orchestrator sandbox's stdout/stderr from
 * R2. A worker container's went nowhere durable: diagnosing the exit-7 wave
 * cost seven paid runs because the one thing that would have answered it in
 * one — what the container printed before it died — was unreadable anywhere.
 *
 * The stream is per (run, tick) by construction. Reusing the orchestrator's
 * single key would interleave a wave's containers into nonsense.
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

const get = (path: string) =>
  SELF.fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });

async function recordedRun(runID: string): Promise<void> {
  await insertRun(env.DB, {
    run_id: runID,
    project: PROJECT,
    epic: "1vn",
    base_sha: "b".repeat(40),
    requested_by: "operator@example.com",
    state: "running",
    started_at: new Date(0).toISOString(),
    ended_at: null,
    cost_usd: 0,
    trace_id: null,
    credential_grade: "write",
  });
}

// ------------------------------------------------------------ the stream ---

describe("a worker container's log stream", () => {
  it("keeps one stream per tick — a wave's containers never interleave", async () => {
    const runID = "run_worker_streams";
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "aaa", 1, 1, "aaa is booting\n");
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "bbb", 1, 1, "bbb is booting\n");
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "aaa", 1, 2, "aaa is working\n");

    expect((await readWorkerLogTail(env.ARTIFACTS, PROJECT, runID, "aaa")).text).toBe(
      "aaa is booting\naaa is working\n"
    );
    expect((await readWorkerLogTail(env.ARTIFACTS, PROJECT, runID, "bbb")).text).toBe(
      "bbb is booting\n"
    );
  });

  it("orders a later attempt after an earlier one, and never overwrites it", async () => {
    const runID = "run_worker_attempts";
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "aaa", 1_700_000_000_000, 1, "first supervisor\n");
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "aaa", 1_700_000_009_000, 1, "replacement supervisor\n");

    expect((await readWorkerLogTail(env.ARTIFACTS, PROJECT, runID, "aaa")).text).toBe(
      "first supervisor\nreplacement supervisor\n"
    );
  });

  it("bounds a read from the END and says it did", async () => {
    const runID = "run_worker_big";
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "aaa", 1, 1, "oldest\n");
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "aaa", 1, 2, "newest\n");

    const output = await readWorkerLogTail(env.ARTIFACTS, PROJECT, runID, "aaa", 7);
    expect(output.text).toBe("newest\n");
    expect(output.truncated).toBe(true);
    expect(output.total_bytes).toBe(14);
  });

  it("reports a tick that has no stream as empty rather than truncated", async () => {
    const output = await readWorkerLogTail(env.ARTIFACTS, PROJECT, "run_worker_none", "zzz");
    expect(output).toEqual({ text: "", bytes: 0, total_bytes: 0, truncated: false });
  });

  it("lists the streams a run has, and never counts the orchestrator's own as a tick", async () => {
    const runID = "run_worker_listing";
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 1, "ticks-orchestrator: hello\n");
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "bbb", 1, 1, "bbb\n");
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "aaa", 1, 1, "aaa\n");
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "aaa", 1, 2, "aaa again\n");

    expect(await listWorkerLogStreams(env.ARTIFACTS, PROJECT, runID)).toEqual([
      { tick_id: "aaa", bytes: 14, segments: 2 },
      { tick_id: "bbb", bytes: 4, segments: 1 },
    ]);
  });
});

describe("workerLogSink", () => {
  it("shares one sequence per tick, so two writers cannot overwrite each other", async () => {
    const runID = "run_worker_sink";
    const sink = workerLogSink(env.ARTIFACTS, PROJECT, runID, 1);
    // Two independently bound writers for the same tick: `spawnWorker` binds
    // one and `dispatchOneWorker` binds another, and both write the same
    // container's output.
    await sink.forTick("aaa")("one\n");
    await sink.forTick("aaa")("two\n");
    await sink.forTick("bbb")("other\n");

    expect((await readWorkerLogTail(env.ARTIFACTS, PROJECT, runID, "aaa")).text).toBe("one\ntwo\n");
    expect((await readWorkerLogTail(env.ARTIFACTS, PROJECT, runID, "bbb")).text).toBe("other\n");
  });

  it("writes nothing for an empty flush", async () => {
    const runID = "run_worker_sink_empty";
    await workerLogSink(env.ARTIFACTS, PROJECT, runID, 1).forTick("aaa")("");
    expect(await listWorkerLogStreams(env.ARTIFACTS, PROJECT, runID)).toEqual([]);
  });
});

// ------------------------------------------------------------- the route ---

describe("GET /api/runs/:id/logs?tick=", () => {
  it("serves one tick's container output", async () => {
    const runID = "run_worker_route";
    await recordedRun(runID);
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "0fg", 1, 1, "worker.sh: died\n");

    const res = await get(`/api/runs/${runID}/logs?tick=0fg`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.tick_id).toBe("0fg");
    expect(body.text).toBe("worker.sh: died\n");
    expect(body.state).toBe("running");
  });

  it("lists which streams exist, so a default read says what else can be read", async () => {
    const runID = "run_worker_route_list";
    await recordedRun(runID);
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 1, "ticks-orchestrator: hello\n");
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "0fg", 1, 1, "worker\n");

    const body = (await (await get(`/api/runs/${runID}/logs`)).json()) as Record<string, unknown>;
    expect(body.text).toBe("ticks-orchestrator: hello\n");
    expect(body.streams).toEqual([{ tick_id: "0fg", bytes: 7, segments: 1 }]);
    expect(body.tick_id).toBeUndefined();
  });

  it("answers a tick with no stream with the streams that do exist, never a bare empty", async () => {
    const runID = "run_worker_route_miss";
    await recordedRun(runID);
    await writeWorkerLogSegment(env.ARTIFACTS, PROJECT, runID, "0fg", 1, 1, "worker\n");

    const body = (await (await get(`/api/runs/${runID}/logs?tick=zzz`)).json()) as Record<
      string,
      unknown
    >;
    expect(body.text).toBe("");
    expect(body.streams).toEqual([{ tick_id: "0fg", bytes: 7, segments: 1 }]);
  });

  it("refuses a tick id that could address something other than a tick", async () => {
    const runID = "run_worker_route_bad";
    await recordedRun(runID);
    const res = await get(`/api/runs/${runID}/logs?tick=${encodeURIComponent("../orchestrator")}`);
    expect(res.status).toBe(400);
  });
});

// ------------------------------------------------------- end to end ---

/** The smallest sandbox that can die at boot the way a real worker does. */
class FakeProcess {
  state: SandboxProcessState = "running";
  exit_code: number | null = null;
  output = "";

  constructor(readonly id: string, readonly command: string) {}
}

class FakeSandbox implements OrchestratorSandbox {
  readonly processes: FakeProcess[] = [];
  destroyed = false;
  #next = 0;

  constructor(readonly name: string) {}

  async startProcess(command: string): Promise<SandboxProcessView> {
    const process = new FakeProcess(`${this.name}-p${++this.#next}`, command);
    this.processes.push(process);
    return { id: process.id, state: process.state, exit_code: null };
  }

  async getProcess(id: string): Promise<SandboxProcessView | null> {
    const process = this.processes.find((p) => p.id === id);
    return process === undefined
      ? null
      : { id: process.id, state: process.state, exit_code: process.exit_code };
  }

  async listProcesses(): Promise<SandboxProcessView[]> {
    return this.processes.map((p) => ({
      id: p.id,
      state: p.state,
      exit_code: p.exit_code,
      command: p.command,
    }));
  }

  async readOutput(id: string, offset: number): Promise<SandboxOutput> {
    const process = this.processes.find((p) => p.id === id);
    if (process === undefined) return { text: "", offset };
    return { text: process.output.slice(offset), offset: process.output.length };
  }

  async killProcess(): Promise<void> {}

  async destroy(): Promise<void> {
    this.destroyed = true;
  }

  get current(): FakeProcess {
    const process = this.processes.at(-1);
    if (process === undefined) throw new Error(`sandbox ${this.name} started nothing`);
    return process;
  }
}

class FakeSandboxes implements SandboxBinding {
  readonly #byName = new Map<string, FakeSandbox>();

  async get(name: string): Promise<OrchestratorSandbox> {
    let sandbox = this.#byName.get(name);
    if (sandbox === undefined) {
      sandbox = new FakeSandbox(name);
      this.#byName.set(name, sandbox);
    }
    return sandbox;
  }

  named(name: string): FakeSandbox {
    const sandbox = this.#byName.get(name);
    if (sandbox === undefined) throw new Error(`no sandbox named ${name}`);
    return sandbox;
  }
}

const stubReport = (task: WorkerTask): WorkerReport => ({
  tick_id: task.tick_id,
  branch: task.branch,
  base_sha: task.base_sha,
  verdict: "no-commits",
  branch_exists: false,
  commits: 0,
  result_path: `RESULT-${task.tick_id}.md`,
  result_exists: false,
  status: "",
  status_detail: "",
  status_line: "",
  boundary_files: [],
  detail: "the worker pushed nothing",
});

const collector: WorkerCollector = { async collect(task) { return stubReport(task); } };

const WORK_SPEC: WorkSpec = {
  probe: { command: "ticks-worker --probe", expect: "ticks-worker-probe-ok" },
  command: "ticks-worker",
};

/**
 * The acceptance case, end to end through the real R2 binding: a container
 * that dies at boot leaves its own stderr behind, and the route prints it.
 *
 * This is the exit-7 failure exactly — `worker.sh` dies in `probe_model` with
 * a message naming the gateway route and the HTTP body, and the container is
 * torn down moments later.
 */
describe("a worker that dies at boot", () => {
  it("leaves its own stderr in R2, readable per tick", async () => {
    const runID = "run_worker_e2e";
    await recordedRun(runID);
    const binding = new FakeSandboxes();
    const sandboxNameFor = (tickID: string) => `${runID}-tick-${tickID}`;
    const died =
      "ticks-worker: probing the model route\n" +
      "ticks-worker: FATAL POST https://gateway.example.com/v1/chat/completions -> 404 " +
      '{"error":"no route for model sonnet"}\n';
    // Driven from inside the sleep, the way every dispatch test does it:
    // `spawnWorker` suspends before its probe process even exists.
    const sleep: Sleeper = async () => {
      const process = binding.named(sandboxNameFor("0fg")).current;
      process.output += died;
      process.state = "failed";
      process.exit_code = 7;
    };

    const [outcome] = await dispatchWave(
      binding,
      sandboxNameFor,
      [{ tick_id: "0fg", branch: "tick/1vn/0fg", base_sha: "c".repeat(40) }],
      () => WORK_SPEC,
      {
        probe_timeout_ms: 5_000,
        probe_poll_ms: 1,
        sleep,
        logs: workerLogSink(env.ARTIFACTS, PROJECT, runID),
      },
      collector
    );

    // The container was written off and destroyed — and its account of itself
    // survived it.
    expect(outcome!.launched).toBe(false);
    expect(binding.named(sandboxNameFor("0fg")).destroyed).toBe(true);

    const body = (await (await get(`/api/runs/${runID}/logs?tick=0fg`)).json()) as Record<
      string,
      unknown
    >;
    expect(body.text).toBe(died);
  });
});
