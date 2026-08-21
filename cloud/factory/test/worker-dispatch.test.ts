import { describe, expect, it } from "vitest";

import type {
  OrchestratorSandbox,
  SandboxBinding,
  SandboxOutput,
  SandboxProcessState,
  SandboxProcessView,
} from "../src/sandbox";
import {
  checkLiveness,
  confirmDispatch,
  dispatchWave,
  evaluateProbeOutput,
  spawnWorker,
  teardownWorker,
  waitForWorker,
  workerSandboxName,
  type Sleeper,
  type WorkSpec,
} from "../src/worker-dispatch";
import type { WorkerCollector, WorkerReport, WorkerTask } from "../src/worker-collect";

/**
 * Per-tick worker sandboxes (tick 0ds): the three spawn-time defences —
 * green-start trap, confirmed dispatch, expiring liveness — plus concurrent
 * fan-out and a collect seam that structurally cannot read a sandbox.
 *
 * These drive the pure dispatch functions directly against a fake
 * `SandboxBinding`, the same seam `run-workflow.test.ts` uses for the
 * orchestrator sandbox — nothing here starts a real container.
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

  say(text: string): void {
    this.output += text;
  }

  finish(code: number): void {
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
  killed: string[] = [];
  /** The container died and came back empty. */
  vanished = false;
  #next = 0;

  constructor(readonly name: string) {}

  async startProcess(command: string, options: { env: Record<string, string> }): Promise<SandboxProcessView> {
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
    this.killed.push(id);
    const process = this.processes.find((p) => p.id === id);
    if (process === undefined) return;
    process.killed = true;
    process.state = "failed";
    process.exit_code = 143;
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
  }

  /** The most recently started process. */
  get current(): FakeProcess {
    const process = this.processes.at(-1);
    if (process === undefined) throw new Error(`sandbox ${this.name} started nothing`);
    return process;
  }
}

class FakeSandboxes implements SandboxBinding {
  readonly booted: FakeSandbox[] = [];
  readonly bootOrder: string[] = [];
  readonly #byName = new Map<string, FakeSandbox>();

  async get(name: string): Promise<OrchestratorSandbox> {
    let sandbox = this.#byName.get(name);
    if (sandbox === undefined) {
      sandbox = new FakeSandbox(name);
      this.#byName.set(name, sandbox);
      this.booted.push(sandbox);
      this.bootOrder.push(name);
    }
    return sandbox;
  }

  named(name: string): FakeSandbox {
    const sandbox = this.#byName.get(name);
    if (sandbox === undefined) throw new Error(`no sandbox named ${name} was booted`);
    return sandbox;
  }
}

/** Never sees a sandbox at all — the structural proof collect cannot read one. */
class FakeCollector implements WorkerCollector {
  readonly asked: WorkerTask[] = [];
  reports = new Map<string, WorkerReport>();

  set(tickID: string, report: WorkerReport): void {
    this.reports.set(tickID, report);
  }

  async collect(task: WorkerTask): Promise<WorkerReport> {
    this.asked.push(task);
    const found = this.reports.get(task.tick_id);
    if (found !== undefined) return found;
    return {
      tick_id: task.tick_id,
      branch: task.branch,
      base_sha: task.base_sha,
      verdict: "ready-to-merge",
      branch_exists: true,
      commits: 1,
      result_path: `RESULT-${task.tick_id}.md`,
      result_exists: true,
      status: "DONE",
      status_detail: "",
      status_line: "STATUS: DONE",
      boundary_files: [],
      detail: "ready to merge",
    };
  }
}

const noWait: Sleeper = async () => {};

const PROBE_SPEC = { command: "tk --version", expect: "READY" };
const WORK_SPEC: WorkSpec = { probe: PROBE_SPEC, command: "ticks-worker", env: { TICKS_TICK_ID: "0ds" } };

function task(tickID: string): WorkerTask {
  return { tick_id: tickID, branch: `tick/1vn/${tickID}`, base_sha: "a".repeat(40) };
}

// ------------------------------------------------------------ probe evaluation ---

describe("evaluateProbeOutput", () => {
  it("passes only when the exact expected content is present", () => {
    expect(evaluateProbeOutput("boot ok\nREADY\n", "READY", 0).ok).toBe(true);
  });

  // The exit code is deliberately not the criterion: an `npx` probe for a
  // missing tool prints npm's own version and exits 0 (.tick/learnings.md,
  // "Cross-language parity, parsers and formats").
  it("fails on wrong content even when the exit code is 0", () => {
    const outcome = evaluateProbeOutput("8.19.2\n", "READY", 0);
    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.reason).toBe("wrong-output");
  });

  it("distinguishes silent (no output) from wrong-content", () => {
    const outcome = evaluateProbeOutput("", "READY", 0);
    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.reason).toBe("no-output");
  });
});

// ------------------------------------------------------------- the green-start trap ---

describe("spawnWorker: the green-start trap", () => {
  // Every test here drives the fake sandbox from INSIDE the injected `sleep`
  // callback rather than mutating it right after calling `spawnWorker` —
  // `spawnWorker` is async and suspends at its first `await` before the
  // probe process even exists, so mutating "after the call" races it. The
  // sleep callback is the one point guaranteed to run only once the probe
  // (or the real command) is genuinely up and being polled.

  it("catches a container that starts cleanly and prints nothing — never counted as launched", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "0ds");
    // The probe finishes immediately with empty output — a container that
    // came up clean and did nothing.
    const sleep: Sleeper = async () => binding.named(name).current.finish(0);

    const result = await spawnWorker(binding, name, task("0ds"), WORK_SPEC, {
      probe_timeout_ms: 5_000,
      probe_poll_ms: 1,
      sleep,
    });

    expect(result.launched).toBe(false);
    expect(result.probe.ok).toBe(false);
    expect(result.process_id).toBeNull();
    // The real work command was never started: only the probe ran.
    expect(binding.named(name).processes).toHaveLength(1);
    expect(binding.named(name).processes[0]!.command).toBe(PROBE_SPEC.command);
  });

  it("catches the npx-returns-npm-version class: wrong content, exit 0", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "0ds");
    const sleep: Sleeper = async () => {
      const probe = binding.named(name).current;
      probe.say("8.19.2\n");
      probe.finish(0);
    };

    const result = await spawnWorker(binding, name, task("0ds"), WORK_SPEC, {
      probe_timeout_ms: 5_000,
      probe_poll_ms: 1,
      sleep,
    });

    expect(result.launched).toBe(false);
    expect(result.probe.ok === false && result.probe.reason).toBe("wrong-output");
    expect(binding.named(name).processes).toHaveLength(1);
  });

  it("a probe that never finishes is caught as a timeout, not trusted", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "0ds");
    // No sleeper override: this genuinely waits ~20ms of wall clock, bounded
    // and short enough to keep the suite fast.
    const result = await spawnWorker(binding, name, task("0ds"), WORK_SPEC, {
      probe_timeout_ms: 20,
      probe_poll_ms: 5,
    });

    expect(result.launched).toBe(false);
    expect(result.probe.ok === false && result.probe.reason).toBe("timeout");
    expect(binding.named(name).processes).toHaveLength(1);
  });

  it("a container that vanishes mid-probe is caught, not treated as still booting", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "0ds");
    const sleep: Sleeper = async () => {
      binding.named(name).vanished = true;
    };

    const result = await spawnWorker(binding, name, task("0ds"), WORK_SPEC, {
      probe_timeout_ms: 5_000,
      probe_poll_ms: 1,
      sleep,
    });

    expect(result.launched).toBe(false);
    expect(result.probe.ok === false && result.probe.reason).toBe("process-gone");
  });

  it("a passing probe lets the real command start", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "0ds");
    let sleeps = 0;
    const sleep: Sleeper = async () => {
      sleeps += 1;
      const sandbox = binding.named(name);
      if (sleeps === 1) {
        // First poll: the probe is still running. Make it pass.
        sandbox.processes[0]!.say("boot ok\nREADY\n");
        sandbox.processes[0]!.finish(0);
        return;
      }
      // Later polls belong to confirmDispatch, watching the real command.
      sandbox.processes[1]!.say("starting…\n");
    };

    const result = await spawnWorker(binding, name, task("0ds"), WORK_SPEC, {
      probe_timeout_ms: 5_000,
      probe_poll_ms: 1,
      confirm_timeout_ms: 5_000,
      confirm_poll_ms: 1,
      sleep,
    });

    expect(result.launched).toBe(true);
    expect(result.process_id).toBe(binding.named(name).processes[1]!.id);
    expect(binding.named(name).processes).toHaveLength(2);
    expect(binding.named(name).processes[1]!.command).toBe(WORK_SPEC.command);
    expect(binding.named(name).processes[1]!.env.TICKS_TICK_ID).toBe("0ds");
    expect(result.confirm?.confirmed).toBe(true);
  });
});

// ----------------------------------------------------------- confirmed dispatch ---

describe("confirmDispatch", () => {
  it("confirms once the process is running AND has produced output", async () => {
    const binding = new FakeSandboxes();
    const sandbox = (await binding.get("s1")) as FakeSandbox;
    const started = await sandbox.startProcess("ticks-worker", { env: {} });
    // First poll: running, no output yet. The injected sleep is what
    // simulates time passing — output appears as its side effect, exactly
    // as a real worker would only print something after doing some work.
    let polls = 0;
    const sleep: Sleeper = async () => {
      polls += 1;
      sandbox.current.say("cloning…\n");
    };

    const outcome = await confirmDispatch(sandbox, started.id, { timeoutMs: 5_000, pollMs: 1, sleep });

    expect(outcome.confirmed).toBe(true);
    expect(polls).toBe(1);
  });

  it("running with no output is NOT confirmed — that is what a green-start trap on the real command looks like", async () => {
    const binding = new FakeSandboxes();
    const sandbox = (await binding.get("s1")) as FakeSandbox;
    const started = await sandbox.startProcess("ticks-worker", { env: {} });
    // No sleeper override: genuinely waits out a short window with the
    // process stuck running and silent.
    const outcome = await confirmDispatch(sandbox, started.id, { timeoutMs: 20, pollMs: 5 });

    expect(outcome.confirmed).toBe(false);
    expect(outcome.detail).toContain("no evidence");
  });

  it("a worker that finishes before ever being observed running still counts as confirmed", async () => {
    const binding = new FakeSandboxes();
    const sandbox = (await binding.get("s1")) as FakeSandbox;
    const started = await sandbox.startProcess("ticks-worker", { env: {} });
    sandbox.current.finish(0); // completed before the first look
    const outcome = await confirmDispatch(sandbox, started.id, { timeoutMs: 5_000, pollMs: 1, sleep: noWait });

    expect(outcome.confirmed).toBe(true);
    expect(outcome.detail).toContain("terminal state");
  });

  it("a worker that vanishes before any evidence is observed is not confirmed", async () => {
    const binding = new FakeSandboxes();
    const sandbox = (await binding.get("s1")) as FakeSandbox;
    const started = await sandbox.startProcess("ticks-worker", { env: {} });
    sandbox.vanished = true;
    const outcome = await confirmDispatch(sandbox, started.id, { timeoutMs: 5_000, pollMs: 1, sleep: noWait });

    expect(outcome.confirmed).toBe(false);
    expect(outcome.detail).toContain("vanished");
  });

  it("an unconfirmed dispatch still reports launched: true — the durable layer decides, not this wait", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "0ds");
    let sleeps = 0;
    const sleep: Sleeper = async (ms) => {
      sleeps += 1;
      if (sleeps === 1) {
        const probe = binding.named(name).current;
        probe.say("READY\n");
        probe.finish(0);
        return;
      }
      // From then on: the real work process just sits there running,
      // silent, for the whole (tiny) confirm window — a genuine delay so
      // Date.now() actually advances toward the confirm deadline, rather
      // than a resolved-instantly no-op that spins forever with a clock
      // that never moves.
      await scheduler.wait(ms);
    };

    const result = await spawnWorker(binding, name, task("0ds"), WORK_SPEC, {
      probe_timeout_ms: 5_000,
      probe_poll_ms: 1,
      confirm_timeout_ms: 20,
      confirm_poll_ms: 1,
      sleep,
    });

    expect(result.launched).toBe(true);
    expect(result.confirm?.confirmed).toBe(false);
    expect(result.detail).toContain("unconfirmed");
  });
});

// -------------------------------------------------------------- expiring liveness ---

describe("checkLiveness / teardownWorker: expiring liveness", () => {
  it("teardown reads liveness fresh, not from a stale observation — a container that died is detected before the kill", async () => {
    const binding = new FakeSandboxes();
    const sandbox = (await binding.get("s1")) as FakeSandbox;
    const started = await sandbox.startProcess("ticks-worker", { env: {} });

    // At confirm time it was alive. Between then and teardown (a GitHub
    // round trip in the real flow) it dies on its own.
    let liveness = await checkLiveness(binding, "s1", started.id);
    expect(liveness.alive).toBe(true);
    sandbox.current.finish(1);

    const outcome = await teardownWorker(binding, "s1", started.id);
    expect(outcome.liveness?.alive).toBe(false);
    // Never killed: it was already dead by the time the fresh check ran.
    expect(sandbox.killed).toEqual([]);
    expect(sandbox.destroyed).toBe(true);
  });

  it("kills a genuinely still-alive process before destroying the container", async () => {
    const binding = new FakeSandboxes();
    const sandbox = (await binding.get("s1")) as FakeSandbox;
    const started = await sandbox.startProcess("ticks-worker", { env: {} });

    const outcome = await teardownWorker(binding, "s1", started.id);
    expect(outcome.killed).toBe(true);
    expect(sandbox.killed).toEqual([started.id]);
    expect(sandbox.destroyed).toBe(true);
  });

  it("still destroys a sandbox that never launched real work (green-start trap path)", async () => {
    const binding = new FakeSandboxes();
    await binding.get("s1");
    const outcome = await teardownWorker(binding, "s1", null);

    expect(outcome.killed).toBe(false);
    expect(outcome.liveness).toBeNull();
    expect(outcome.destroyed).toBe(true);
  });

  it("a sandbox already gone reports not-alive rather than throwing", async () => {
    const binding = new FakeSandboxes();
    const sandbox = (await binding.get("s1")) as FakeSandbox;
    const started = await sandbox.startProcess("ticks-worker", { env: {} });
    sandbox.vanished = true;

    const liveness = await checkLiveness(binding, "s1", started.id);
    expect(liveness).toEqual({ alive: false, state: "gone" });
  });
});

// -------------------------------------------------------------------- waitForWorker ---

describe("waitForWorker", () => {
  it("resolves once the process reaches a terminal state", async () => {
    const binding = new FakeSandboxes();
    const sandbox = (await binding.get("s1")) as FakeSandbox;
    const started = await sandbox.startProcess("ticks-worker", { env: {} });
    sandbox.current.finish(0);

    const outcome = await waitForWorker(binding, "s1", started.id, { timeoutMs: 5_000, pollMs: 1, sleep: noWait });
    expect(outcome).toEqual({ state: "completed", exit_code: 0, timed_out: false });
  });

  it("times out rather than waiting forever on a process that never finishes", async () => {
    const binding = new FakeSandboxes();
    const sandbox = (await binding.get("s1")) as FakeSandbox;
    const started = await sandbox.startProcess("ticks-worker", { env: {} });

    const outcome = await waitForWorker(binding, "s1", started.id, { timeoutMs: 20, pollMs: 5 });
    expect(outcome.timed_out).toBe(true);
    expect(outcome.state).toBe("running");
  });

  it("reports gone rather than throwing when the sandbox no longer knows the process", async () => {
    const binding = new FakeSandboxes();
    const sandbox = (await binding.get("s1")) as FakeSandbox;
    const started = await sandbox.startProcess("ticks-worker", { env: {} });
    sandbox.vanished = true;

    const outcome = await waitForWorker(binding, "s1", started.id, { timeoutMs: 5_000, pollMs: 1, sleep: noWait });
    expect(outcome).toEqual({ state: "gone", exit_code: null, timed_out: false });
  });
});

// ------------------------------------------------------------------------- the wave ---

describe("dispatchWave", () => {
  it("boots N sandboxes CONCURRENTLY — none can finish until all N have started", async () => {
    const binding = new FakeSandboxes();
    const tasks = [task("aaa"), task("bbb"), task("ccc")];
    const N = tasks.length;

    // Every probe only finishes once every sandbox has started ITS probe —
    // a serial implementation would deadlock here, because task 2's probe
    // would never even start until task 1's whole cycle (probe → confirm →
    // wait → collect → teardown) completed. Each process is advanced at
    // most twice (one output, then terminal) so the `wait` stage afterward
    // resolves quickly instead of spinning on a process left `running`
    // forever.
    const givenOutput = new Set<string>();
    const sleep: Sleeper = async () => {
      if (binding.bootOrder.length < N) return; // still waiting on siblings to boot
      for (const sandbox of binding.booted) {
        for (const process of sandbox.processes) {
          if (process.state !== "running") continue;
          if (process.command === PROBE_SPEC.command) {
            process.say("READY\n");
            process.finish(0);
          } else if (process.command === WORK_SPEC.command) {
            if (givenOutput.has(process.id)) {
              process.finish(0);
            } else {
              givenOutput.add(process.id);
              process.say("working\n");
            }
          }
        }
      }
    };

    const collector = new FakeCollector();
    const outcomes = await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run1", tickID),
      tasks,
      WORK_SPEC,
      { probe_timeout_ms: 2_000, probe_poll_ms: 1, confirm_timeout_ms: 2_000, confirm_poll_ms: 1, sleep },
      collector
    );

    expect(outcomes).toHaveLength(N);
    expect(binding.booted).toHaveLength(N);
    // One distinctly-named sandbox per tick.
    expect(new Set(binding.booted.map((s) => s.name)).size).toBe(N);
    for (const outcome of outcomes) {
      expect(outcome.launched).toBe(true);
    }
    // Every tick was asked for, by its own task — collect never saw a sandbox.
    expect(collector.asked.map((t) => t.tick_id).sort()).toEqual(["aaa", "bbb", "ccc"]);
  });

  it("collects and tears down every task even when one's probe fails the green-start trap", async () => {
    const binding = new FakeSandboxes();
    const tasks = [task("good"), task("bad")];

    // Every process gets advanced exactly once per sleep call, and each
    // advance is TERMINAL or otherwise final for that stage — never an
    // unbounded repeat — so `waitForWorker`'s wait afterward (bounded at 30
    // minutes by default) resolves quickly rather than spinning on a
    // process this callback keeps leaving `running` forever.
    const givenOutput = new Set<string>();
    const sleep: Sleeper = async () => {
      for (const sandbox of binding.booted) {
        const proc = sandbox.processes.at(-1);
        if (proc === undefined || proc.state !== "running") continue;
        if (sandbox.name.endsWith("bad")) {
          proc.finish(0); // green-start trap: finishes with no useful output
          continue;
        }
        if (proc.command === PROBE_SPEC.command) {
          proc.say("READY\n");
          proc.finish(0);
        } else if (givenOutput.has(proc.id)) {
          proc.finish(0); // confirmed already; let the real work finish
        } else {
          givenOutput.add(proc.id);
          proc.say("working\n");
        }
      }
    };

    const collector = new FakeCollector();
    const outcomes = await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run1", tickID),
      tasks,
      WORK_SPEC,
      { probe_timeout_ms: 2_000, probe_poll_ms: 1, confirm_timeout_ms: 2_000, confirm_poll_ms: 1, sleep },
      collector
    );

    const good = outcomes.find((o) => o.tick_id === "good")!;
    const bad = outcomes.find((o) => o.tick_id === "bad")!;

    expect(good.launched).toBe(true);
    expect(bad.launched).toBe(false);
    // Collect and teardown ran for BOTH, regardless of launch outcome.
    expect(good.collect).not.toBeNull();
    expect(bad.collect).not.toBeNull();
    expect(good.teardown.destroyed).toBe(true);
    expect(bad.teardown.destroyed).toBe(true);
    expect(collector.asked.map((t) => t.tick_id).sort()).toEqual(["bad", "good"]);
  });
});

describe("workerSandboxName", () => {
  it("is distinct per tick within a run", () => {
    expect(workerSandboxName("run1", "aaa")).not.toBe(workerSandboxName("run1", "bbb"));
  });
});
