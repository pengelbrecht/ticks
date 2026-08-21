import { describe, expect, it } from "vitest";
import contract from "./fixtures/worker-boot-contract.json";
import {
  ORCHESTRATOR_COMMAND,
  WORKER_ACTOR,
  WORKER_BRANCH_PREFIX,
  WORKER_COMMAND,
  WORKER_EXIT,
  WORKER_PROBE_ARG,
  WORKER_PROBE_COMMAND,
  WORKER_PROBE_MARKER,
  WORKER_PUSH_MARGIN_MS,
  workerBootEnv,
  workerBranch,
  workerHarnessTimeoutSeconds,
  workerProbeSpec,
  workerResultFile,
  workerTask,
  workerWorkSpec,
} from "../src/worker-boot";
import { DEFAULT_WAIT_TIMEOUT_MS, evaluateProbeOutput } from "../src/worker-dispatch";

const boot = {
  repo_url: "https://github.com/example/repo.git",
  base_sha: "930f1cf4dbcac5505cce506cbf2a8412d8248b92",
  epic: "1vn",
  tick: "tap",
  run_id: "run_abc",
  gateway_base_url: "https://factory.example.com/api/gateway",
  gateway_token: "tkr_0123456789abcdef",
};

// The whole reason this file and its Go twin exist: three readers of one
// contract (the shell, tk, the control plane), pinned to one file. A fix that
// lands in TypeScript only is the failure this repository has already paid for.
describe("the worker boot contract", () => {
  it("matches the shared fixture", () => {
    expect(ORCHESTRATOR_COMMAND).toBe(contract.orchestrator_command);
    expect(WORKER_COMMAND).toBe(contract.worker_command);
    expect(WORKER_PROBE_ARG).toBe(contract.probe_arg);
    expect(WORKER_PROBE_COMMAND).toBe(contract.probe_command);
    expect(WORKER_PROBE_MARKER).toBe(contract.probe_marker);
    expect(WORKER_ACTOR).toBe(contract.worker_actor);
    expect(WORKER_BRANCH_PREFIX).toBe(contract.branch_prefix);
    expect(WORKER_EXIT.push).toBe(contract.exit_codes.push);
    expect(WORKER_EXIT.no_work).toBe(contract.exit_codes.no_work);
    expect(WORKER_EXIT.agent).toBe(contract.exit_codes.agent);
  });

  it("derives the branch and report names the collector reads", () => {
    const b = contract.branch_example;
    expect(workerBranch(b.epic, b.tick)).toBe(b.branch);
    expect(workerResultFile(contract.result_file_example.tick)).toBe(contract.result_file_example.path);
    expect(workerTask(b.epic, b.tick, boot.base_sha)).toEqual({
      tick_id: b.tick,
      branch: b.branch,
      base_sha: boot.base_sha,
    });
  });
});

describe("the probe spec", () => {
  // The green-start trap is only a trap if the marker the dispatcher checks
  // for is the marker the container prints. This is that join, asserted
  // through the dispatcher's own evaluator rather than by eye.
  it("passes the dispatcher's evaluator on the entrypoint's own line", () => {
    const spec = workerProbeSpec(boot);
    const real = `ticks-worker: ${WORKER_PROBE_MARKER} tick=tap tk=0.31.0 harness=omp git version 2.43.0\n`;
    expect(evaluateProbeOutput(real, spec.expect, 0)).toEqual({ ok: true });
  });

  it("fails a container that starts cleanly and says nothing useful", () => {
    const spec = workerProbeSpec(boot);
    const green = evaluateProbeOutput("11.0.6\n", spec.expect, 0);
    expect(green.ok).toBe(false);
    if (!green.ok) expect(green.reason).toBe("wrong-output");
    const silent = evaluateProbeOutput("", spec.expect, 0);
    expect(silent.ok).toBe(false);
    if (!silent.ok) expect(silent.reason).toBe("no-output");
  });

  it("probes in the same environment the real command gets", () => {
    const spec = workerWorkSpec(boot);
    expect(spec.probe.env).toEqual(spec.env);
    expect(spec.command).toBe(WORKER_COMMAND);
  });
});

describe("the boot environment", () => {
  it("names the tick, the epic and the base the branch is cut from", () => {
    const env = workerBootEnv(boot);
    expect(env.TICKS_TICK).toBe("tap");
    expect(env.TICKS_EPIC).toBe("1vn");
    expect(env.TICKS_BASE_SHA).toBe(boot.base_sha);
    expect(env.AI_GATEWAY_TOKEN).toBe(boot.gateway_token);
  });

  // Absent is not the same as empty to a shell reading ${VAR:-default}: an
  // exported empty string defeats every default the entrypoint has.
  it("omits what the caller did not supply rather than exporting empty strings", () => {
    const env = workerBootEnv(boot);
    for (const name of ["TICKS_MODEL", "GITHUB_TOKEN", "TICKS_WORKDIR", "TICKS_FACTORY_URL"]) {
      expect(name in env).toBe(false);
    }
    expect(workerBootEnv({ ...boot, model: "" }).TICKS_MODEL).toBeUndefined();
    expect(workerBootEnv({ ...boot, model: "anthropic/claude-fable-5" }).TICKS_MODEL).toBe(
      "anthropic/claude-fable-5"
    );
  });

  it("runs the repository's setup unless the caller opts the wave out", () => {
    expect(workerBootEnv(boot).TICKS_WORKER_SETUP).toBe(contract.setup_modes.always);
    expect(workerBootEnv({ ...boot, setup: "skip" }).TICKS_WORKER_SETUP).toBe(contract.setup_modes.skip);
  });
});

describe("the harness bound", () => {
  // A worker killed at the dispatcher's wait timeout pushes nothing, so the
  // container's own bound has to land INSIDE that window with room to commit
  // and push.
  it("leaves the container room to push before the wave stops waiting", () => {
    const seconds = workerHarnessTimeoutSeconds(DEFAULT_WAIT_TIMEOUT_MS);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds * 1000).toBeLessThanOrEqual(DEFAULT_WAIT_TIMEOUT_MS - WORKER_PUSH_MARGIN_MS);
    expect(workerBootEnv({ ...boot, wait_timeout_ms: DEFAULT_WAIT_TIMEOUT_MS }).TICKS_WORKER_TIMEOUT).toBe(
      String(seconds)
    );
  });

  // A bound of a few seconds would fail every worker rather than rescue any,
  // so a window with no room in it leaves the harness unbounded.
  it("is off when there is no wait to fit inside, or no room in it", () => {
    expect(workerHarnessTimeoutSeconds(undefined)).toBe(0);
    expect(workerHarnessTimeoutSeconds(WORKER_PUSH_MARGIN_MS)).toBe(0);
    expect(workerBootEnv(boot).TICKS_WORKER_TIMEOUT).toBeUndefined();
    expect(workerBootEnv({ ...boot, wait_timeout_ms: 1_000 }).TICKS_WORKER_TIMEOUT).toBeUndefined();
  });
});
