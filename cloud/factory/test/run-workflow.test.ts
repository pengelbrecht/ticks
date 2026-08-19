import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  readHarnessOutput,
  readRunRecord,
  reconcileKey,
  type RunRecord,
} from "../src/artifacts";
import { getRun, listDispatchLogs } from "../src/db";
import { MAX_SANDBOX_BOOTS } from "../src/run-workflow";
import { roomFor, startRun, stopRun } from "../src/runs";
import {
  ORCHESTRATOR_COMMAND,
  type OrchestratorSandbox,
  type SandboxBinding,
  type SandboxOutput,
  type SandboxProcessState,
  type SandboxProcessView,
} from "../src/sandbox";

/**
 * The Run Workflow: boot one orchestrator sandbox, watch it, enforce the
 * budgets, finalize.
 *
 * These drive the REAL Workflow inside workerd — the binding from
 * wrangler.toml, the real RunRoom lease, the real D1 index, the real R2
 * bucket. The only substitution is the container itself, through the
 * `SANDBOXES` seam: a fake sandbox is what lets a test kill an orchestrator
 * mid-run and read the log stream while the run is still going, which is
 * exactly what this tick has to prove.
 */

// --------------------------------------------------------- the fake sandbox ---

class FakeProcess {
  state: SandboxProcessState = "running";
  exit_code: number | null = null;
  output = "";
  killed = false;

  constructor(
    readonly id: string,
    readonly command: string,
    readonly env: Record<string, string>
  ) {}

  /** Print something, as a harness would while it works. */
  say(text: string): void {
    this.output += text;
  }

  exit(code: number): void {
    this.state = code === 0 ? "completed" : "failed";
    this.exit_code = code;
  }

  get view(): SandboxProcessView {
    return { id: this.id, state: this.state, exit_code: this.exit_code };
  }
}

class FakeSandbox implements OrchestratorSandbox {
  readonly processes: FakeProcess[] = [];
  destroyed = false;
  /** The container died and came back empty: it no longer knows its process. */
  vanished = false;
  #next = 0;

  constructor(readonly name: string) {}

  async startProcess(
    command: string,
    options: { env: Record<string, string> }
  ): Promise<SandboxProcessView> {
    const process = new FakeProcess(`${this.name}-p${++this.#next}`, command, options.env);
    this.processes.push(process);
    return process.view;
  }

  async getProcess(id: string): Promise<SandboxProcessView | null> {
    if (this.vanished) return null;
    const process = this.processes.find((p) => p.id === id);
    return process === undefined ? null : process.view;
  }

  async readOutput(id: string, offset: number): Promise<SandboxOutput> {
    const process = this.processes.find((p) => p.id === id);
    if (process === undefined || this.vanished) return { text: "", offset };
    return { text: process.output.slice(offset), offset: process.output.length };
  }

  async killProcess(id: string): Promise<void> {
    const process = this.processes.find((p) => p.id === id);
    if (process === undefined) return;
    process.killed = true;
    process.state = "failed";
    process.exit_code = 143;
  }

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
  readonly booted: FakeSandbox[] = [];
  readonly #byName = new Map<string, FakeSandbox>();

  async get(name: string): Promise<OrchestratorSandbox> {
    let sandbox = this.#byName.get(name);
    if (sandbox === undefined) {
      sandbox = new FakeSandbox(name);
      this.#byName.set(name, sandbox);
      this.booted.push(sandbox);
    }
    return sandbox;
  }

  /** The sandbox the run is currently working in. */
  get latest(): FakeSandbox {
    const sandbox = this.booted.at(-1);
    if (sandbox === undefined) throw new Error("no sandbox has been booted");
    return sandbox;
  }

  /** The process of the sandbox booted with this phase, or undefined. */
  phase(phase: string): FakeProcess | undefined {
    for (const sandbox of this.booted) {
      for (const process of sandbox.processes) {
        if (process.env.TICKS_PHASE === phase) return process;
      }
    }
    return undefined;
  }
}

// ------------------------------------------------------------------ harness ---

const GATEWAY = "https://gateway.ai.cloudflare.com/v1/account/ticks";
const PROJECT = "example-org/example-repo";
const BASE_SHA = "a".repeat(40);

let sandboxes: FakeSandboxes;
const saved: Record<string, unknown> = {};

/** Overrides a binding for one test, remembering what to put back. */
function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}

beforeEach(() => {
  sandboxes = new FakeSandboxes();
  set("SANDBOXES", sandboxes);
  set("AI_GATEWAY_BASE_URL", GATEWAY);
  // A tight, fixed cadence: the supervision loop's own backoff is not what
  // these tests are about, and an explicit interval is a supported override.
  set("RUN_POLL_INTERVAL_MS", "25");
  set("RUN_STOP_GRACE_MS", "50");
  set("RUN_MAX_WALL_CLOCK_MS", "600000");
  set("RUN_MAX_COST_USD", "25");
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
    else (env as unknown as Record<string, unknown>)[name] = value;
    delete saved[name];
  }
});

let counter = 0;

/** Takes the lease and ignites a run, exactly as the submit route does. */
async function ignite(overrides: { epic?: string; project?: string } = {}) {
  const project = overrides.project ?? `${PROJECT}-${++counter}`;
  const epic = overrides.epic ?? "ko8";
  const runID = `run_wf_${++counter}`;
  const room = roomFor(env, project);
  const lease = await room.acquireDispatchLease({ run_id: runID, epic, origin: "cloud" });
  if (!lease.ok) throw new Error(`the lease was refused: ${JSON.stringify(lease)}`);
  const started = await startRun(env, {
    run_id: runID,
    project,
    epic,
    base_sha: BASE_SHA,
    requested_by: "operator",
    lease_token: lease.lease.token,
  });
  return { runID, project, epic, started, room };
}

async function waitFor<T>(
  what: string,
  probe: () => Promise<T | null | undefined | false>,
  timeoutMs = 15_000
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value !== null && value !== undefined && value !== false) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await scheduler.wait(10);
  }
}

const runState = (runID: string) => getRun(env.DB, runID).then((run) => run?.state ?? null);

/** Waits until the run reaches one of the terminal index states. */
async function settled(runID: string) {
  return waitFor(`run ${runID} to finish`, async () => {
    const run = await getRun(env.DB, runID);
    if (run === null) return null;
    return ["completed", "stopped", "failed"].includes(run.state) ? run : null;
  });
}

/** Waits until a sandbox has been booted and started the orchestrator. */
async function firstProcess(): Promise<FakeProcess> {
  return waitFor("the orchestrator to start", async () =>
    sandboxes.booted.length > 0 && sandboxes.booted[0]!.processes.length > 0
      ? sandboxes.booted[0]!.current
      : null
  );
}

// -------------------------------------------------------------------- tests ---

describe("boot and finalize", () => {
  it("boots one sandbox on the skill loop and finalizes with a runs row", async () => {
    const { runID, project, epic } = await ignite();

    const process = await firstProcess();
    expect(process.command).toBe(ORCHESTRATOR_COMMAND);
    expect(process.env).toMatchObject({
      TICKS_REPO_URL: `https://github.com/${project}.git`,
      TICKS_BASE_SHA: BASE_SHA,
      TICKS_EPIC: epic,
      TICKS_RUN_ID: runID,
      TICKS_PHASE: "run",
      AI_GATEWAY_BASE_URL: GATEWAY,
    });
    // The row says the run is live before it is over — `starting` is the
    // submit route's state, and the Workflow owns everything after it.
    await waitFor("the run to be running", async () => (await runState(runID)) === "running");

    process.say("orchestrator: wave 1\n");
    process.exit(0);

    const run = await settled(runID);
    expect(run.state).toBe("completed");
    expect(run.ended_at).not.toBeNull();
    // ONE sandbox: Phase 1 is a single-sandbox run.
    expect(sandboxes.booted).toHaveLength(1);
    expect(sandboxes.booted[0]!.destroyed).toBe(true);

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record).toMatchObject({ run_id: runID, project, epic, state: "completed" });
  });

  it("releases the dispatch lease so the project can run again", async () => {
    const { runID, room } = await ignite();
    expect(await room.leaseStatus()).not.toBeNull();

    (await firstProcess()).exit(0);
    await settled(runID);

    expect(await room.leaseStatus()).toBeNull();
  });

  it("renews the lease while the run is alive", async () => {
    const { runID, room } = await ignite();
    const process = await firstProcess();
    const first = (await room.leaseStatus())!.expires_at;

    await waitFor("a lease renewal", async () => {
      const lease = await room.leaseStatus();
      return lease !== null && lease.expires_at > first;
    });

    process.exit(0);
    await settled(runID);
  });
});

describe("harness output streams to R2 during the run", () => {
  it("is readable while the run is still going", async () => {
    const { runID, project } = await ignite();
    const process = await firstProcess();

    process.say("orchestrator: graph resolved\n");
    const early = await waitFor("the first harness output in R2", async () => {
      const text = await readHarnessOutput(env.ARTIFACTS, project, runID);
      return text === "" ? null : text;
    });
    expect(early).toContain("graph resolved");
    // Still going: this is not an export-at-exit log.
    expect(process.state).toBe("running");
    expect(await runState(runID)).toBe("running");

    process.say("orchestrator: wave 1 merged\n");
    await waitFor("the second flush", async () =>
      (await readHarnessOutput(env.ARTIFACTS, project, runID)).includes("wave 1 merged")
    );

    process.exit(0);
    await settled(runID);

    const full = await readHarnessOutput(env.ARTIFACTS, project, runID);
    expect(full).toBe("orchestrator: graph resolved\norchestrator: wave 1 merged\n");
  });

  it("leaves the log behind when the sandbox dies mid-run", async () => {
    const { runID, project } = await ignite();
    const process = await firstProcess();
    process.say("orchestrator: about to be killed\n");
    await waitFor("the output to reach R2", async () =>
      (await readHarnessOutput(env.ARTIFACTS, project, runID)).includes("about to be killed")
    );

    sandboxes.booted[0]!.vanished = true;

    // The dead sandbox's output survives it — that is the point of streaming.
    const second = await waitFor("a replacement sandbox", async () =>
      sandboxes.booted.length > 1 ? sandboxes.booted[1]! : null
    );
    expect(await readHarnessOutput(env.ARTIFACTS, project, runID)).toContain("about to be killed");

    second.current.exit(0);
    await settled(runID);
  });
});

describe("a dead orchestrator is replaced, not the end of the run", () => {
  it("boots a fresh sandbox whose first instruction is the reconcile protocol", async () => {
    const { runID } = await ignite();
    const first = await firstProcess();
    expect(first.env.TICKS_PHASE).toBe("run");

    sandboxes.booted[0]!.vanished = true;

    const replacement = await waitFor("a replacement sandbox", async () =>
      sandboxes.booted.length > 1 ? sandboxes.booted[1]! : null
    );
    // A FRESH container, not the broken one reused.
    expect(replacement.name).not.toBe(sandboxes.booted[0]!.name);
    const process = await waitFor("the replacement orchestrator", async () =>
      replacement.processes.length > 0 ? replacement.current : null
    );
    expect(process.env.TICKS_PHASE).toBe("reconcile");
    expect(process.env.TICKS_RUN_ID).toBe(runID);
    expect(process.env.TICKS_BASE_SHA).toBe(BASE_SHA);

    process.exit(0);
    const run = await settled(runID);
    expect(run.state).toBe("completed");
  });

  it("reboots after a crashed harness too, and records why", async () => {
    const { runID, project } = await ignite();
    (await firstProcess()).exit(1);

    const replacement = await waitFor("a replacement sandbox", async () =>
      sandboxes.booted.length > 1 && sandboxes.booted[1]!.processes.length > 0
        ? sandboxes.booted[1]!.current
        : null
    );
    expect(replacement.env.TICKS_PHASE).toBe("reconcile");

    // One reconcile.json per reboot: what the dead orchestrator looked like
    // when it was written off (D20's artifact tree).
    const written = await waitFor("the reconcile record", async () =>
      env.ARTIFACTS.get(reconcileKey(project, runID, 1))
    );
    const record = JSON.parse(await written.text()) as {
      previous: { state: string; exit_code: number | null };
      detail: string;
    };
    expect(record.previous).toEqual({ state: "failed", exit_code: 1 });
    expect(record.detail).toContain("exited 1");

    replacement.exit(0);
    expect((await settled(runID)).state).toBe("completed");
  });

  it("does not reboot on a configuration verdict from the entrypoint", async () => {
    const { runID } = await ignite();
    // Exit 5: an Environment pre-flight check failed. A fresh container reaches
    // the identical answer, so rebooting only spends money.
    (await firstProcess()).exit(5);

    const run = await settled(runID);
    expect(run.state).toBe("failed");
    expect(sandboxes.booted).toHaveLength(1);
  });

  it("gives up after a bounded number of boots rather than looping forever", async () => {
    const { runID } = await ignite();
    // Every orchestrator this run is allowed crashes. A container that cannot
    // stay alive is telling you something a fourth boot will not fix.
    for (let boot = 0; boot < MAX_SANDBOX_BOOTS; boot++) {
      const sandbox = await waitFor(`sandbox ${boot + 1}`, async () =>
        sandboxes.booted.length > boot && sandboxes.booted[boot]!.processes.length > 0
          ? sandboxes.booted[boot]!
          : null
      );
      sandbox.current.exit(1);
    }

    const run = await settled(runID);
    expect(run.state).toBe("failed");
    expect(sandboxes.booted).toHaveLength(MAX_SANDBOX_BOOTS);
  });
});

describe("a run that outlives what one instance can watch", () => {
  it("stops it cleanly instead of booting a second orchestrator beside it", async () => {
    // Running out of looks is not a dead orchestrator. Rebooting here would put
    // two live orchestrators on the same project's `.tick/` (D4).
    set("RUN_MAX_OBSERVATIONS", "2");
    const { runID } = await ignite();
    const process = await firstProcess();
    process.say("orchestrator: still working\n");

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    expect(process.killed).toBe(true);
    // Exactly two sandboxes: the one that was watched out, and the closeout.
    expect(sandboxes.booted).toHaveLength(2);
    expect(sandboxes.phase("reconcile")).toBeUndefined();

    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");
  });
});

describe("a clean stop runs review and closeout", () => {
  it("stops on the operator's request and still closes the run out", async () => {
    const { runID, project, epic } = await ignite();
    const process = await firstProcess();
    process.say("orchestrator: wave 1 in flight\n");

    const stopped = await stopRun(env, runID, "operator");
    expect(stopped.outcome).toBe("stopping");

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    // The work orchestrator was given its grace window and then killed — the
    // in-flight tick's evidence is on the run branch either way.
    expect(process.killed).toBe(true);
    expect(closeout.env.TICKS_EPIC).toBe(epic);
    expect(closeout.env.TICKS_STOP_REASON ?? "").toContain("operator");

    closeout.exit(0);
    const run = await settled(runID);
    expect(run.state).toBe("stopped");

    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord;
    expect(record.state).toBe("stopped");
    expect(record.detail ?? "").toContain("operator");
  });

  it("treats a cost budget exactly like the operator stop path", async () => {
    set("RUN_MAX_COST_USD", "1");
    const { runID, epic } = await ignite();
    const process = await firstProcess();

    // Ground-truth spend lands on the index row (tick k2s wires it to gateway
    // telemetry); the Workflow acts on the number, never on a self-report.
    await env.DB.prepare("UPDATE runs SET cost_usd = ? WHERE run_id = ?").bind(1.5, runID).run();

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    expect(process.killed).toBe(true);
    expect(closeout.env.TICKS_STOP_REASON ?? "").toMatch(/budget|cost/i);

    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");

    // "Why did this stop" is answerable from D1, not from a log line.
    const log = await listDispatchLogs(env.DB, runID, epic);
    expect(log.some((entry) => entry.reason === "budget_exhausted")).toBe(true);
  });

  it("treats a wall-clock budget the same way", async () => {
    set("RUN_MAX_WALL_CLOCK_MS", "1");
    const { runID } = await ignite();

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    expect(closeout.env.TICKS_STOP_REASON ?? "").toMatch(/wall|time/i);

    closeout.exit(0);
    expect((await settled(runID)).state).toBe("stopped");
  });

  it("still finalizes when the closeout orchestrator itself fails", async () => {
    const { runID } = await ignite();
    await firstProcess();
    await stopRun(env, runID, "operator");

    const closeout = await waitFor("the closeout orchestrator", async () =>
      sandboxes.phase("closeout")
    );
    closeout.exit(1);

    // A failed closeout is still a stopped run with a released lease: an
    // abandoned run is the one outcome a stop must never produce.
    const run = await settled(runID);
    expect(run.state).toBe("stopped");
    expect(await roomFor(env, run.project).leaseStatus()).toBeNull();
  });
});

describe("an unprovisioned deployment fails closed", () => {
  it("fails the run naming the missing sandbox binding", async () => {
    set("SANDBOXES", undefined);
    delete (env as unknown as Record<string, unknown>).SANDBOXES;
    const { runID, project } = await ignite();

    const run = await settled(runID);
    expect(run.state).toBe("failed");
    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord | null;
    expect(record?.detail ?? "").toContain("SANDBOXES");
  });

  it("fails the run naming the missing gateway", async () => {
    set("AI_GATEWAY_BASE_URL", undefined);
    delete (env as unknown as Record<string, unknown>).AI_GATEWAY_BASE_URL;
    const { runID, project } = await ignite();

    const run = await settled(runID);
    expect(run.state).toBe("failed");
    const record = (await readRunRecord(env.ARTIFACTS, project, runID)) as RunRecord | null;
    expect(record?.detail ?? "").toContain("tk factory setup");
    expect(sandboxes.booted).toHaveLength(0);
  });
});
