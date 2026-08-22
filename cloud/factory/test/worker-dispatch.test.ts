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
  waveCanceller,
  workerSandboxName,
  type Canceller,
  type Sleeper,
  type WaveCancellation,
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

  /** The live sandbox list — the reconcile protocol's third source (tick s7f). */
  async listProcesses(): Promise<SandboxProcessView[]> {
    if (this.vanished) return [];
    return this.processes.map((p) => ({ ...p.view, command: p.command }));
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
  /**
   * Every address, in order (tick k24). `binding.get` is called once by spawn,
   * once per wait poll and once by teardown, so a test can tell which stage of
   * the cycle a worker is in without guessing at timing.
   */
  readonly gets: string[] = [];
  readonly #byName = new Map<string, FakeSandbox>();

  async get(name: string): Promise<OrchestratorSandbox> {
    this.gets.push(name);
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

  /** Like `named`, but for a caller that wants to know a sandbox was never addressed. */
  find(name: string): FakeSandbox | undefined {
    return this.#byName.get(name);
  }
}

/** Never sees a sandbox at all — the structural proof collect cannot read one. */
class FakeCollector implements WorkerCollector {
  readonly asked: WorkerTask[] = [];
  reports = new Map<string, WorkerReport>();
  /**
   * tick k24: what the container looked like at the moment collect was asked,
   * so a test can assert the ORDER of teardown and collect rather than only
   * that both happened.
   */
  seenDestroyed = new Map<string, boolean>();
  watch: FakeSandboxes | null = null;
  runAtCollect: (() => void) | null = null;

  set(tickID: string, report: WorkerReport): void {
    this.reports.set(tickID, report);
  }

  async collect(task: WorkerTask): Promise<WorkerReport> {
    this.asked.push(task);
    if (this.watch !== null) {
      const sandbox = this.watch.find(workerSandboxName("run1", task.tick_id));
      this.seenDestroyed.set(task.tick_id, sandbox?.destroyed ?? false);
    }
    this.runAtCollect?.();
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
    expect(outcome).toEqual({ state: "completed", exit_code: 0, timed_out: false, cancelled: null });
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
    expect(outcome).toEqual({ state: "gone", exit_code: null, timed_out: false, cancelled: null });
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
      () => WORK_SPEC,
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
      () => WORK_SPEC,
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

  // tick b6e: the call site needs a distinct TICKS_TICK per container, or a
  // wave of N tasks boots N containers all implementing the SAME tick.
  it("gives every task its own spec rather than sharing one across the wave", async () => {
    const binding = new FakeSandboxes();
    const tasks = [task("aaa"), task("bbb")];

    const sleep: Sleeper = async () => {
      for (const sandbox of binding.booted) {
        const proc = sandbox.processes.at(-1);
        if (proc === undefined || proc.state !== "running") continue;
        if (proc.command === PROBE_SPEC.command) {
          proc.say("READY\n");
          proc.finish(0);
        } else {
          proc.finish(0);
        }
      }
    };

    const collector = new FakeCollector();
    await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run1", tickID),
      tasks,
      (t) => ({ probe: PROBE_SPEC, command: "ticks-worker", env: { TICKS_TICK: t.tick_id } }),
      { probe_timeout_ms: 2_000, probe_poll_ms: 1, confirm_timeout_ms: 2_000, confirm_poll_ms: 1, sleep },
      collector
    );

    const aaa = binding.named(workerSandboxName("run1", "aaa"));
    const bbb = binding.named(workerSandboxName("run1", "bbb"));
    const workEnv = (sandbox: FakeSandbox) =>
      sandbox.processes.find((p) => p.command === "ticks-worker")!.env.TICKS_TICK;
    expect(workEnv(aaa)).toBe("aaa");
    expect(workEnv(bbb)).toBe("bbb");
  });
});

describe("workerSandboxName", () => {
  it("is distinct per tick within a run", () => {
    expect(workerSandboxName("run1", "aaa")).not.toBe(workerSandboxName("run1", "bbb"));
  });
});

// ------------------------------------------------------- the cancellation seam ---

/**
 * tick k24: a wave in flight has to be interruptible.
 *
 * The gap this closes had teeth: the hard-stop check ran BETWEEN batches, so an
 * operator's kill — or a blown budget — waited for up to `max_instances`
 * containers to finish, each of them watched for up to thirty minutes, before
 * anything reacted. `cts` (a budget that could not trip) and `gyl` (a kill
 * switch a reboot undid) are the same shape: enforcement that existed somewhere
 * it could not act in time.
 *
 * Every case below drives the seam directly against the fake sandbox — no wall
 * clock, no timing assumptions, and no "wait and hope": a canceller with
 * `poll_ms: 0` reads on every look, and the fake sleeper is what advances the
 * world.
 */

/** A probe that answers "keep going" for `after` looks and then cancels. */
function cancelsAfter(after: number, cancellation: WaveCancellation): { probe: () => Promise<WaveCancellation | null>; looks: () => number } {
  let looks = 0;
  return {
    probe: async () => {
      looks += 1;
      return looks > after ? cancellation : null;
    },
    looks: () => looks,
  };
}

const STOPPED: WaveCancellation = { reason: "stopped:hard", detail: "a hard stop stands" };

describe("waveCanceller", () => {
  it("latches: once cancelled it never asks again", async () => {
    const { probe, looks } = cancelsAfter(0, STOPPED);
    const cancel = waveCanceller(probe, { poll_ms: 0 });

    expect(await cancel.check()).toEqual(STOPPED);
    expect(await cancel.check()).toEqual(STOPPED);
    expect(await cancel.check()).toEqual(STOPPED);
    expect(cancel.cancelled).toEqual(STOPPED);
    expect(looks()).toBe(1);
  });

  // The wave shares ONE canceller precisely so N containers cost one read, not
  // N — and so they cannot disagree about whether the run may still spend.
  it("dedupes concurrent readers onto a single read", async () => {
    let looks = 0;
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const cancel = waveCanceller(
      async () => {
        looks += 1;
        await gate;
        return null;
      },
      { poll_ms: 0 }
    );

    const answers = Promise.all([cancel.check(), cancel.check(), cancel.check()]);
    release!();
    expect(await answers).toEqual([null, null, null]);
    expect(looks).toBe(1);
    expect(cancel.reads).toBe(1);
  });

  it("reads at most once per poll interval, whatever the caller's cadence", async () => {
    const { probe, looks } = cancelsAfter(1000, STOPPED);
    const cancel = waveCanceller(probe, { poll_ms: 60_000 });

    // The first look always reads; a minute has not passed before the rest.
    for (let i = 0; i < 20; i++) expect(await cancel.check()).toBeNull();
    expect(looks()).toBe(1);
  });

  // A stop record that cannot be read is a failed read, not a stop —
  // `hardStopRecord`'s own rule. Fail-open is safe here only because the
  // between-batch check and the per-observation check still stand behind it.
  it("treats a probe that throws as no cancellation, not as one", async () => {
    const cancel = waveCanceller(async () => {
      throw new Error("D1 is unreachable");
    }, { poll_ms: 0 });

    expect(await cancel.check()).toBeNull();
    expect(cancel.cancelled).toBeNull();
  });

  // tick gyl, at wave scale: the credential dies FIRST, because tearing a
  // container down is the stronger stop but also the slower one.
  it("runs its on-cancel hook once, before it answers", async () => {
    const order: string[] = [];
    const cancel = waveCanceller(async () => STOPPED, {
      poll_ms: 0,
      on_cancel: async (cancellation) => {
        order.push(`revoked:${cancellation.reason}`);
      },
    });

    order.push(`answered:${(await cancel.check())!.reason}`);
    await cancel.check();
    expect(order).toEqual(["revoked:stopped:hard", "answered:stopped:hard"]);
  });

  it("does not let a failing hook swallow the cancellation", async () => {
    const cancel = waveCanceller(async () => STOPPED, {
      poll_ms: 0,
      on_cancel: async () => {
        throw new Error("the revocation failed");
      },
    });

    expect(await cancel.check()).toEqual(STOPPED);
  });
});

describe("cancelling a worker mid-cycle", () => {
  it("stops a container during its probe, and never starts its real command", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "aaa");
    const cancel = waveCanceller(async () => STOPPED, { poll_ms: 0 });
    // The probe never finishes: without the seam this would poll until the
    // probe timeout, and in a real wave the operator would wait it out.
    const result = await spawnWorker(binding, name, task("aaa"), WORK_SPEC, {
      probe_timeout_ms: 5_000,
      probe_poll_ms: 1,
      sleep: noWait,
      cancel,
    });

    expect(result.launched).toBe(false);
    expect(result.cancelled).toEqual(STOPPED);
    expect(result.probe.ok === false && result.probe.reason).toBe("cancelled");
    // Only the probe ever ran: a cancelled wave does not start real work.
    expect(binding.named(name).processes).toHaveLength(1);
    expect(binding.named(name).processes[0]!.command).toBe(PROBE_SPEC.command);
  });

  it("stops a container whose dispatch is still unconfirmed, and reports it launched", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "aaa");
    const { probe } = cancelsAfter(1, STOPPED);
    const cancel = waveCanceller(probe, { poll_ms: 0 });
    let sleeps = 0;
    const sleep: Sleeper = async () => {
      sleeps += 1;
      if (sleeps === 1) {
        const p = binding.named(name).processes[0]!;
        p.say("READY\n");
        p.finish(0);
      }
      // The real command then produces nothing, so confirm keeps polling —
      // which is where the cancellation lands.
    };

    const result = await spawnWorker(binding, name, task("aaa"), WORK_SPEC, {
      probe_timeout_ms: 5_000,
      probe_poll_ms: 1,
      confirm_timeout_ms: 5_000,
      confirm_poll_ms: 1,
      sleep,
      cancel,
    });

    // The real command IS running in that container — which is exactly why the
    // caller has to be told, so it tears the thing down.
    expect(result.launched).toBe(true);
    expect(result.process_id).not.toBeNull();
    expect(result.cancelled).toEqual(STOPPED);
    expect(result.confirm?.confirmed).toBe(false);
  });

  // The wait is where a wave spends nearly all of its wall clock — up to
  // `wait_timeout_ms` (thirty minutes in production) per batch.
  it("stops waiting on a live container instead of watching it to the timeout", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "aaa");
    const sandbox = await binding.get(name);
    const started = await sandbox.startProcess("ticks-worker", { env: {} });
    const cancel = waveCanceller(async () => STOPPED, { poll_ms: 0 });

    const outcome = await waitForWorker(binding, name, started.id, {
      // A timeout no test may sit through: reaching it is the failure.
      timeoutMs: 30 * 60_000,
      pollMs: 15_000,
      sleep: noWait,
      cancel,
    });

    expect(outcome.cancelled).toEqual(STOPPED);
    expect(outcome.timed_out).toBe(false);
    expect(outcome.state).toBe("running");
  });

  // The cancellation cadence is independent of the caller's poll interval: a
  // fifteen-minute wait must not mean fifteen minutes of not noticing.
  it("looks for a stop on its own cadence, not the wait loop's", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "aaa");
    const sandbox = await binding.get(name);
    const started = await sandbox.startProcess("ticks-worker", { env: {} });
    // A canceller whose cadence (1ms) is five times finer than the wait loop's
    // (5ms), driven by look count rather than by the clock so the assertion
    // below is about the chunking and not about how fast a machine is.
    let looked = 0;
    const cancel: Canceller = {
      pollMs: 1,
      reads: 0,
      cancelled: null,
      check: async () => (++looked > 4 ? STOPPED : null),
    };
    const looks = () => looked;
    const slept: number[] = [];
    const sleep: Sleeper = async (ms) => void slept.push(ms);

    const outcome = await waitForWorker(binding, name, started.id, {
      timeoutMs: 30 * 60_000,
      // One poll of the container, sliced into five looks for a stop.
      pollMs: 5,
      sleep,
      cancel,
    });

    expect(outcome.cancelled).toEqual(STOPPED);
    // Five looks inside a single container poll — the sleep was chunked, not
    // waited out whole and then checked.
    expect(looks()).toBe(5);
    expect(slept).toEqual([1, 1, 1, 1, 1]);
  });
});

describe("dispatchWave: a batch in flight is interruptible", () => {
  it("tears every container down as soon as the wave is cancelled", async () => {
    const binding = new FakeSandboxes();
    const tasks = [task("aaa"), task("bbb"), task("ccc")];
    const collector = new FakeCollector();
    collector.watch = binding;
    // Cancel once every container is up and INSIDE ITS WAIT — the thirty-minute
    // window that used to be uninterruptible — rather than before the wave
    // starts, which would prove nothing about a batch in flight. A worker is in
    // its wait once the wave has addressed its sandbox a second time.
    const inWait = () =>
      tasks.every(
        (t) =>
          binding.gets.filter((name) => name === workerSandboxName("run1", t.tick_id)).length >= 2
      );
    const cancel = waveCanceller(async () => (inWait() ? STOPPED : null), { poll_ms: 0 });

    const sleep: Sleeper = async () => {
      for (const sandbox of binding.booted) {
        const proc = sandbox.processes.at(-1);
        if (proc === undefined || proc.state !== "running") continue;
        if (proc.command === PROBE_SPEC.command) {
          proc.say("READY\n");
          proc.finish(0);
        } else {
          // The real work says something and then just keeps running: the
          // thirty-minute wait nobody could interrupt.
          proc.say("implementing\n");
        }
      }
    };

    const outcomes = await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run1", tickID),
      tasks,
      () => WORK_SPEC,
      {
        probe_timeout_ms: 2_000,
        probe_poll_ms: 1,
        confirm_timeout_ms: 2_000,
        confirm_poll_ms: 1,
        wait_timeout_ms: 30 * 60_000,
        wait_poll_ms: 15_000,
        sleep,
        cancel,
      },
      collector
    );

    expect(outcomes).toHaveLength(3);
    for (const outcome of outcomes) {
      expect(outcome.cancelled).toEqual(STOPPED);
      expect(outcome.teardown.destroyed).toBe(true);
      // A live process is killed, not left running in a destroyed container.
      expect(outcome.teardown.killed).toBe(true);
      // Nothing timed out: the wave was stopped, not waited out.
      expect(outcome.wait?.timed_out ?? false).toBe(false);
    }
    for (const sandbox of binding.booted) {
      expect(sandbox.destroyed).toBe(true);
      expect(sandbox.killed).toHaveLength(1);
    }
  });

  // On a hard stop or a blown budget, collect's GitHub round trips are seconds
  // the container keeps spending in. Git does not forget while a container is
  // torn down, so the teardown goes first and the durable read follows.
  it("tears down BEFORE it reads the durable layer, the reverse of the ordinary order", async () => {
    const binding = new FakeSandboxes();
    const collector = new FakeCollector();
    collector.watch = binding;
    const cancel = waveCanceller(
      async () =>
        binding.gets.filter((name) => name === workerSandboxName("run1", "aaa")).length >= 2
          ? STOPPED
          : null,
      { poll_ms: 0 }
    );

    const sleep: Sleeper = async () => {
      for (const sandbox of binding.booted) {
        const proc = sandbox.processes.at(-1);
        if (proc === undefined || proc.state !== "running") continue;
        if (proc.command === PROBE_SPEC.command) {
          proc.say("READY\n");
          proc.finish(0);
        } else {
          proc.say("implementing\n");
        }
      }
    };

    const outcomes = await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run1", tickID),
      [task("aaa")],
      () => WORK_SPEC,
      {
        probe_timeout_ms: 2_000,
        probe_poll_ms: 1,
        confirm_timeout_ms: 2_000,
        confirm_poll_ms: 1,
        wait_timeout_ms: 30 * 60_000,
        wait_poll_ms: 15_000,
        sleep,
        cancel,
      },
      collector
    );

    // Collect still ran — a cancelled attempt may still have pushed work.
    expect(collector.asked.map((t) => t.tick_id)).toEqual(["aaa"]);
    expect(outcomes[0]!.collect.verdict).toBe("ready-to-merge");
    // …and the container was already gone when it did.
    expect(collector.seenDestroyed.get("aaa")).toBe(true);
  });

  // `binding.get` PROVISIONS a container on Cloudflare. A wave that is already
  // cancelled must not address one: addressing is how a stopped run boots the
  // containers it was stopped to prevent (`finalize`'s own teardown rule).
  it("addresses no container at all when the wave is cancelled before it starts", async () => {
    const binding = new FakeSandboxes();
    const collector = new FakeCollector();
    const cancel = waveCanceller(async () => STOPPED, { poll_ms: 0 });

    const outcomes = await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run1", tickID),
      [task("aaa"), task("bbb")],
      () => WORK_SPEC,
      { probe_poll_ms: 1, confirm_poll_ms: 1, sleep: noWait, cancel },
      collector
    );

    expect(binding.booted).toHaveLength(0);
    for (const outcome of outcomes) {
      expect(outcome.launched).toBe(false);
      expect(outcome.cancelled).toEqual(STOPPED);
      expect(outcome.teardown.destroyed).toBe(false);
      expect(outcome.detail).toContain("before this container was addressed");
    }
    // The durable layer is still read: a previous attempt's work must be found.
    expect(collector.asked.map((t) => t.tick_id).sort()).toEqual(["aaa", "bbb"]);
  });

  it("an uncancelled wave behaves exactly as it did before the seam existed", async () => {
    const binding = new FakeSandboxes();
    const collector = new FakeCollector();
    collector.watch = binding;
    const cancel: Canceller = waveCanceller(async () => null, { poll_ms: 0 });

    const givenOutput = new Set<string>();
    const sleep: Sleeper = async () => {
      for (const sandbox of binding.booted) {
        const proc = sandbox.processes.at(-1);
        if (proc === undefined || proc.state !== "running") continue;
        if (proc.command === PROBE_SPEC.command) {
          proc.say("READY\n");
          proc.finish(0);
        } else if (givenOutput.has(proc.id)) {
          proc.finish(0);
        } else {
          givenOutput.add(proc.id);
          proc.say("working\n");
        }
      }
    };

    const outcomes = await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run1", tickID),
      [task("aaa"), task("bbb")],
      () => WORK_SPEC,
      {
        probe_timeout_ms: 2_000,
        probe_poll_ms: 1,
        confirm_timeout_ms: 2_000,
        confirm_poll_ms: 1,
        wait_poll_ms: 1,
        sleep,
        cancel,
      },
      collector
    );

    for (const outcome of outcomes) {
      expect(outcome.launched).toBe(true);
      expect(outcome.cancelled).toBeNull();
      expect(outcome.wait?.state).toBe("completed");
      expect(outcome.teardown.destroyed).toBe(true);
      // The ordinary order: the durable read happens while the container is
      // still there.
      expect(collector.seenDestroyed.get(outcome.tick_id)).toBe(false);
    }
  });
});

// -------------------------------------------------- adoption and manifests ---

/**
 * Taking over a live worker instead of replacing it (tick s7f).
 *
 * The reconcile protocol decides WHICH workers are live; this is the seam that
 * makes acting on that decision possible at all. Everything downstream of
 * acquiring the process is deliberately unchanged — the wave waits, collects
 * and tears down an adopted worker exactly as it does one it launched.
 */
describe("dispatchWave: adopting a live worker", () => {
  it("starts nothing at all in a container it adopts", async () => {
    const binding = new FakeSandboxes();
    const name = workerSandboxName("run1", "aaa");
    // A worker a dead supervisor left mid-tick, in a container that already
    // exists — which is what `binding.get` returns to its replacement.
    const sandbox = (await binding.get(name)) as unknown as FakeSandbox;
    const work = await sandbox.startProcess(WORK_SPEC.command, { env: {} });

    const sleep: Sleeper = async () => {
      const process = binding.named(name).processes.find((p) => p.id === work.id)!;
      if (process.state === "running") process.finish(0);
    };

    const collector = new FakeCollector();
    const outcomes = await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run1", tickID),
      [task("aaa")],
      () => WORK_SPEC,
      {
        probe_timeout_ms: 2_000,
        probe_poll_ms: 1,
        confirm_timeout_ms: 2_000,
        confirm_poll_ms: 1,
        wait_poll_ms: 1,
        sleep,
        adopt: () => ({ process_id: work.id, detail: "a worker process is running" }),
      },
      collector
    );

    const outcome = outcomes[0]!;
    expect(outcome.adopted).toBe(true);
    expect(outcome.launched).toBe(true);
    expect(outcome.process_id).toBe(work.id);
    // No second worker, and no probe: the container was left exactly as the
    // dead supervisor left it.
    expect(binding.named(name).processes).toHaveLength(1);
    // And the rest of the cycle ran unchanged.
    expect(outcome.wait?.state).toBe("completed");
    expect(collector.asked.map((t) => t.tick_id)).toEqual(["aaa"]);
    expect(outcome.teardown.destroyed).toBe(true);
  });

  it("launches normally for a task the plan does not adopt", async () => {
    const binding = new FakeSandboxes();
    const sleep: Sleeper = async () => {
      for (const sandbox of binding.booted) {
        const process = sandbox.processes.at(-1);
        if (process === undefined || process.state !== "running") continue;
        if (process.command === PROBE_SPEC.command) {
          process.say("READY\n");
          process.finish(0);
        } else {
          process.say("working\n");
          process.finish(0);
        }
      }
    };

    const outcomes = await dispatchWave(
      binding,
      (tickID) => workerSandboxName("run1", tickID),
      [task("aaa")],
      () => WORK_SPEC,
      {
        probe_timeout_ms: 2_000,
        probe_poll_ms: 1,
        confirm_timeout_ms: 2_000,
        confirm_poll_ms: 1,
        wait_poll_ms: 1,
        sleep,
        adopt: () => null,
      },
      new FakeCollector()
    );

    expect(outcomes[0]!.adopted).toBe(false);
    expect(outcomes[0]!.launched).toBe(true);
  });
});

describe("the dispatch manifest lands before the container does", () => {
  // The ordering IS the guarantee. A manifest written after the boot would
  // leave a window in which a running container has no durable record, and a
  // reconcile reading no manifest correctly concludes nothing was dispatched
  // — and boots a second worker onto the same tick.
  it("records the dispatch before the sandbox is addressed, and the process after it starts", async () => {
    const binding = new FakeSandboxes();
    const trace: string[] = [];
    const sleep: Sleeper = async () => {
      for (const sandbox of binding.booted) {
        const process = sandbox.processes.at(-1);
        if (process === undefined || process.state !== "running") continue;
        if (process.command === PROBE_SPEC.command) {
          process.say("READY\n");
          process.finish(0);
        } else {
          process.say("working\n");
          process.finish(0);
        }
      }
    };

    await spawnWorker(
      new Proxy(binding, {
        get(target, property, receiver) {
          if (property === "get") {
            return async (name: string) => {
              trace.push(`address:${name}`);
              return target.get(name);
            };
          }
          const value = Reflect.get(target, property, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        },
      }),
      workerSandboxName("run1", "aaa"),
      task("aaa"),
      WORK_SPEC,
      {
        probe_timeout_ms: 2_000,
        probe_poll_ms: 1,
        confirm_timeout_ms: 2_000,
        confirm_poll_ms: 1,
        sleep,
        record: {
          async dispatched(t, name) {
            trace.push(`manifest:${t.tick_id}:${name}`);
          },
          async started(t, _name, processID) {
            trace.push(`process:${t.tick_id}:${processID}`);
          },
        },
      }
    );

    expect(trace[0]).toBe(`manifest:aaa:${workerSandboxName("run1", "aaa")}`);
    expect(trace[1]).toBe(`address:${workerSandboxName("run1", "aaa")}`);
    expect(trace[2]).toMatch(/^process:aaa:/);
  });

  it("aborts the dispatch rather than booting a container no manifest names", async () => {
    const binding = new FakeSandboxes();

    await expect(
      spawnWorker(binding, workerSandboxName("run1", "aaa"), task("aaa"), WORK_SPEC, {
        sleep: noWait,
        record: {
          async dispatched() {
            throw new Error("R2 is unreachable");
          },
          async started() {},
        },
      })
    ).rejects.toThrow("R2 is unreachable");

    expect(binding.booted).toHaveLength(0);
  });
});
