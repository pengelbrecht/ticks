import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import {
  harnessLogKey,
  harnessSegmentKey,
  readHarnessOutput,
  runPrefix,
  writeCombinedHarnessLog,
  writeHarnessSegment,
} from "../src/artifacts";
import {
  DEFAULT_MAX_COST_USD,
  DEFAULT_MAX_WALL_CLOCK_MS,
  MAX_POLL_MS,
  MIN_POLL_MS,
  pollDelay,
  renewalTtl,
  runConfig,
} from "../src/run-workflow";
import { isTerminalExit, orchestratorEnv, sandboxName } from "../src/sandbox";

/**
 * The pieces the supervision loop leans on that a run-level test would only
 * cover by accident: log key ordering, budget parsing, cadence.
 */

const PROJECT = "example-org/example-repo";

describe("the harness log stream", () => {
  it("keeps segments in order past the ten and hundred boundaries", async () => {
    const runID = "run_order";
    for (const seq of [1, 2, 9, 10, 11, 99, 100, 101]) {
      await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, seq, `${seq}\n`);
    }

    // R2 lists lexicographically: unpadded keys would put 10 before 9 and
    // silently reorder the log.
    expect(await readHarnessOutput(env.ARTIFACTS, PROJECT, runID)).toBe(
      "1\n2\n9\n10\n11\n99\n100\n101\n"
    );
  });

  it("orders one boot's output before the next boot's", async () => {
    const runID = "run_boots";
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 7, "first sandbox\n");
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 2, 1, "replacement sandbox\n");

    expect(await readHarnessOutput(env.ARTIFACTS, PROJECT, runID)).toBe(
      "first sandbox\nreplacement sandbox\n"
    );
  });

  it("writes nothing for a poll that saw no output", async () => {
    const runID = "run_quiet";
    expect(await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 1, "")).toBe(false);

    const listed = await env.ARTIFACTS.list({ prefix: runPrefix(PROJECT, runID) });
    expect(listed.objects).toHaveLength(0);
  });

  it("keeps every run's artifacts under its own project-scoped prefix", () => {
    expect(harnessSegmentKey(PROJECT, "run_x", 2, 5)).toBe(
      `runs/${PROJECT}/run_x/artifacts/orchestrator/harness/002/000005.log`
    );
    expect(harnessLogKey(PROJECT, "run_x")).toBe(
      `runs/${PROJECT}/run_x/artifacts/orchestrator/harness.log`
    );
  });

  it("collapses the stream into one object at finalize without losing it", async () => {
    const runID = "run_combined";
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 1, "a\n");
    await writeHarnessSegment(env.ARTIFACTS, PROJECT, runID, 1, 2, "b\n");
    await writeCombinedHarnessLog(env.ARTIFACTS, PROJECT, runID);

    const combined = await env.ARTIFACTS.get(harnessLogKey(PROJECT, runID));
    await expect(combined!.text()).resolves.toBe("a\nb\n");
    // The segments remain the durable record; the combined log is a copy.
    expect(await readHarnessOutput(env.ARTIFACTS, PROJECT, runID)).toBe("a\nb\n");
  });
});

describe("budget configuration", () => {
  it("falls back to the defaults when nothing is set", () => {
    const config = runConfig({} as never);

    expect(config.max_wall_clock_ms).toBe(DEFAULT_MAX_WALL_CLOCK_MS);
    expect(config.max_cost_usd).toBe(DEFAULT_MAX_COST_USD);
    expect(config.poll_interval_ms).toBeNull();
  });

  it("ignores an unusable budget rather than taking the factory down", () => {
    const config = runConfig({
      RUN_MAX_WALL_CLOCK_MS: "soon",
      RUN_MAX_COST_USD: "-4",
    } as never);

    expect(config.max_wall_clock_ms).toBe(DEFAULT_MAX_WALL_CLOCK_MS);
    expect(config.max_cost_usd).toBe(DEFAULT_MAX_COST_USD);
  });

  it("reads a fractional cost budget but an integral clock", () => {
    const config = runConfig({ RUN_MAX_COST_USD: "2.50", RUN_MAX_WALL_CLOCK_MS: "60000" } as never);

    expect(config.max_cost_usd).toBe(2.5);
    expect(config.max_wall_clock_ms).toBe(60_000);
  });
});

describe("observation cadence", () => {
  it("starts fast and backs off to a cadence a long run can afford", () => {
    const config = runConfig({} as never);

    expect(pollDelay(config, 0)).toBe(MIN_POLL_MS);
    expect(pollDelay(config, 5)).toBeGreaterThan(MIN_POLL_MS);
    expect(pollDelay(config, 99)).toBe(MAX_POLL_MS);
  });

  it("honours a fixed interval when the deployment sets one", () => {
    const config = runConfig({ RUN_POLL_INTERVAL_MS: "1000" } as never);

    expect(pollDelay(config, 0)).toBe(1000);
    expect(pollDelay(config, 50)).toBe(1000);
  });

  it("renews the lease for longer than the gap to the next look", () => {
    // Otherwise the run expires its own lease between two observations and
    // hands the project to a queued submission while it is still working.
    for (const poll of [1, MIN_POLL_MS, MAX_POLL_MS]) {
      expect(renewalTtl(poll)).toBeGreaterThan(poll);
    }
  });
});

describe("the image contract", () => {
  it("treats the entrypoint's configuration exits as terminal", () => {
    // 2 config, 3 clone, 4 tk version, 5 pre-flight — see cloud/sandbox.
    for (const code of [2, 3, 4, 5]) expect(isTerminalExit(code)).toBe(true);
    // A crashed harness is a reboot, not a verdict.
    for (const code of [1, 42, 137, 143]) expect(isTerminalExit(code)).toBe(false);
    expect(isTerminalExit(null)).toBe(false);
  });

  it("names a fresh sandbox per boot", () => {
    expect(sandboxName("run_a", 1)).not.toBe(sandboxName("run_a", 2));
  });

  it("omits optional variables rather than setting them empty", () => {
    const built = orchestratorEnv({
      run_id: "run_a",
      epic: "ko8",
      base_sha: "b".repeat(40),
      repo_url: "https://github.com/example-org/example-repo.git",
      gateway_base_url: "https://factory.example.com/api/gateway",
      gateway_token: "tkr_deadbeef",
      phase: "run",
      github_token: "",
    });

    // An empty GITHUB_TOKEN would install a credential helper that answers
    // with no password, which fails later and less clearly than not being set.
    expect(built).not.toHaveProperty("GITHUB_TOKEN");
    expect(built).not.toHaveProperty("TICKS_STOP_REASON");
    expect(built.TICKS_PHASE).toBe("run");
    // The run's gateway credential is not optional: a sandbox with no token
    // cannot make a model call at all (D17).
    expect(built.AI_GATEWAY_TOKEN).toBe("tkr_deadbeef");
  });
});
