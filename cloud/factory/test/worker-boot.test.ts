import { describe, expect, it } from "vitest";
import contract from "./fixtures/worker-boot-contract.json";
import {
  ORCHESTRATOR_COMMAND,
  WORKER_ACTOR,
  WORKER_BRANCH_PREFIX,
  WORKER_COMMAND,
  WORKER_DEFAULT_HARNESS,
  WORKER_DEFAULT_MODEL,
  WORKER_EXIT,
  WORKER_PROBE_ARG,
  WORKER_PROBE_COMMAND,
  WORKER_PROBE_MARKER,
  WORKER_PUSH_MARGIN_MS,
  DEFAULT_WORKER_HARNESS_BUDGET_MS,
  MIN_WORKER_HARNESS_BUDGET_MS,
  waveWaitTimeoutMs,
  workerBootEnv,
  workerBranch,
  workerHarnessBudgetMs,
  workerHarnessTimeoutSeconds,
  workerProbeSpec,
  workerResultFile,
  workerTask,
  workerWorkSpec,
} from "../src/worker-boot";
import { BOUNDARY_REPORT_MARKER } from "../src/worker-collect";
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
    // The boundary guard's two strings (tick dxk). The refusal is the
    // container's alone — it is asserted against the shell in
    // internal/sandbox — but the report marker is read on THIS side, so both
    // are pinned here for the same reason the probe marker is.
    expect(BOUNDARY_REPORT_MARKER).toBe(contract.boundary.report_marker);
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
    for (const name of ["GITHUB_TOKEN", "TICKS_WORKDIR", "TICKS_FACTORY_URL"]) {
      expect(name in env).toBe(false);
    }
    // TICKS_HARNESS/TICKS_MODEL are the exception — see the dedicated
    // describe block below — but an explicit override still wins, and an
    // explicit empty string still means "let the container decide" rather
    // than "use the worker default".
    expect(workerBootEnv({ ...boot, model: "" }).TICKS_MODEL).toBeUndefined();
    expect(workerBootEnv({ ...boot, model: "anthropic/claude-fable-5" }).TICKS_MODEL).toBe(
      "anthropic/claude-fable-5"
    );
  });

  it("runs the repository's setup unless the caller opts the wave out", () => {
    expect(workerBootEnv(boot).TICKS_WORKER_SETUP).toBe(contract.setup_modes.always);
    expect(workerBootEnv({ ...boot, setup: "skip" }).TICKS_WORKER_SETUP).toBe(contract.setup_modes.skip);
  });

  // tick ys3: per-tick container fan-out failed on EVERY wave, deterministically.
  // The worker resolves `.tick/runners.toml`'s [roles.implement] cell
  // (kind="claude", model="sonnet") whenever TICKS_MODEL is unset, and the
  // factory gateway routes Workers AI only — no anthropic route, no
  // ANTHROPIC_API_KEY. `probe_model` died EXIT_MODEL before the harness ever
  // started. [roles.implement] is also what `tk herd spawn` resolves for
  // LOCAL worker CLIs, which authenticate straight to Anthropic — repointing
  // it at a workers-ai model would have fixed the container and broken every
  // local epic run in the same commit. So the worker's own default lives
  // here, in the factory, not in the repository's routing table.
  describe("the worker's own harness and model default (tick ys3)", () => {
    it("defaults an unconfigured worker to omp on the measured workers-ai model, never the repository's implement role", () => {
      const env = workerBootEnv(boot);
      expect(env.TICKS_HARNESS).toBe(WORKER_DEFAULT_HARNESS);
      expect(env.TICKS_MODEL).toBe(WORKER_DEFAULT_MODEL);
      // Locks the specific id tick y45 measured against this account's own
      // `GET /ai/models/search` catalog, so a drift in the constant is a
      // visible test failure rather than a silent routing change.
      expect(WORKER_DEFAULT_HARNESS).toBe("omp");
      expect(WORKER_DEFAULT_MODEL).toBe("workers-ai/@cf/deepseek-ai/deepseek-v4-flash-0731");
    });

    it("still lets the run config or an operator override the worker default", () => {
      const env = workerBootEnv({
        ...boot,
        harness: "claude",
        model: "workers-ai/@cf/deepseek-ai/deepseek-v4-pro-0813",
      });
      expect(env.TICKS_HARNESS).toBe("claude");
      expect(env.TICKS_MODEL).toBe("workers-ai/@cf/deepseek-ai/deepseek-v4-pro-0813");
    });

    it("the worker default is served through workerProbeSpec/workerWorkSpec too, since the probe must run in the real command's environment", () => {
      expect(workerProbeSpec(boot).env?.TICKS_MODEL).toBe(WORKER_DEFAULT_MODEL);
      expect(workerWorkSpec(boot).env?.TICKS_MODEL).toBe(WORKER_DEFAULT_MODEL);
    });
  });
});

describe("the harness budget (tick 5fg)", () => {
  const MINUTE = 60_000;

  // The measurement, not taste: tick y45 recorded a COMPLETE one-tick epic at
  // 78 minutes on deepseek-v4-pro, and the worker default model is FLASH,
  // which takes more steps than pro for the same work. A default under 78
  // minutes is a decision to kill real work.
  it("defaults to a budget above the 78-minute measurement when no wall clock bounds it", () => {
    expect(workerHarnessBudgetMs()).toBe(DEFAULT_WORKER_HARNESS_BUDGET_MS);
    expect(DEFAULT_WORKER_HARNESS_BUDGET_MS).toBeGreaterThanOrEqual(78 * MINUTE);
    expect(workerHarnessBudgetMs({})).toBe(DEFAULT_WORKER_HARNESS_BUDGET_MS);
  });

  // The bug in one sentence: run_2e66e765 was submitted with --max-wall-clock
  // 90m and its workers were still killed at ~29 minutes, because the bound
  // came from a constant and nothing else.
  it("derives the budget from the run's remaining wall clock, so a 90m run does not kill its workers at 29m", () => {
    const budget = workerHarnessBudgetMs({ remaining_wall_clock_ms: 90 * MINUTE });
    expect(budget).toBeGreaterThan(80 * MINUTE);
    expect(budget).toBe(90 * MINUTE - WORKER_PUSH_MARGIN_MS);
    // What the old constant gave every worker regardless of the run's own bound.
    expect(budget).toBeGreaterThan(30 * MINUTE);
  });

  // The run's own bound is a ceiling on the worker's, never raised past it:
  // a worker allowed to outlive the run it belongs to is a container the
  // wall-clock trip has to kill, which is the failure this tick is about.
  it("never lets a worker outlive the run's remaining wall clock", () => {
    const budget = workerHarnessBudgetMs({ remaining_wall_clock_ms: 40 * MINUTE });
    expect(budget).toBe(40 * MINUTE - WORKER_PUSH_MARGIN_MS);
    expect(waveWaitTimeoutMs(budget)).toBeLessThanOrEqual(40 * MINUTE);
  });

  // A generous deployment ceiling is not a licence to hand ONE tick the whole
  // run: the default caps what any single worker may take.
  it("caps a long run's worker at the measured default rather than the whole run", () => {
    expect(workerHarnessBudgetMs({ remaining_wall_clock_ms: 6 * 60 * MINUTE })).toBe(
      DEFAULT_WORKER_HARNESS_BUDGET_MS
    );
  });

  it("honours a deployment's own cap when it names one", () => {
    expect(workerHarnessBudgetMs({ cap_ms: 20 * MINUTE })).toBe(20 * MINUTE);
    expect(
      workerHarnessBudgetMs({ remaining_wall_clock_ms: 6 * 60 * MINUTE, cap_ms: 20 * MINUTE })
    ).toBe(20 * MINUTE);
  });

  // A bound of a few seconds fails every worker rather than rescuing any, so
  // a window with no room left in it still buys the harness a usable floor —
  // the run's own wall-clock trip is what stops a wave that is out of time
  // (tick k24), not a budget of nine seconds.
  it("floors the derived budget rather than handing a worker seconds", () => {
    expect(workerHarnessBudgetMs({ remaining_wall_clock_ms: 30_000 })).toBe(
      MIN_WORKER_HARNESS_BUDGET_MS
    );
    expect(workerHarnessBudgetMs({ remaining_wall_clock_ms: 0 })).toBe(
      MIN_WORKER_HARNESS_BUDGET_MS
    );
  });
});

describe("the harness bound", () => {
  const MINUTE = 60_000;

  // A worker killed at the dispatcher's wait timeout pushes nothing, so the
  // container's own bound has to land INSIDE that window with room to commit
  // and push. The derivation now runs the other way — the agent's budget is
  // the decision and the wave's wait is that budget plus the margin — but the
  // invariant the margin exists for is the same one.
  it("leaves the container room to push before the wave stops waiting", () => {
    const budget = workerHarnessBudgetMs();
    const seconds = workerHarnessTimeoutSeconds(budget);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds * 1000).toBeLessThanOrEqual(waveWaitTimeoutMs(budget) - WORKER_PUSH_MARGIN_MS);
    expect(waveWaitTimeoutMs(budget)).toBe(budget + WORKER_PUSH_MARGIN_MS);
    expect(workerBootEnv({ ...boot, harness_budget_ms: budget }).TICKS_WORKER_TIMEOUT).toBe(
      String(seconds)
    );
  });

  // worker-boot.ts already takes its types from worker-dispatch.ts, so the
  // dispatcher's own default cannot import the budget back without closing the
  // cycle. Two constants that must agree, pinned here — the shape this repo
  // already uses for a limit that lives in two places.
  it("keeps the dispatcher's own default wait equal to the budget plus the margin", () => {
    expect(DEFAULT_WAIT_TIMEOUT_MS).toBe(waveWaitTimeoutMs(DEFAULT_WORKER_HARNESS_BUDGET_MS));
  });

  it("passes the derived budget through to the container, in whole seconds", () => {
    const env = workerBootEnv({ ...boot, harness_budget_ms: 90 * MINUTE });
    expect(env.TICKS_WORKER_TIMEOUT).toBe(String(90 * 60));
  });

  // A bound of a few seconds would fail every worker rather than rescue any,
  // so a window with no room in it leaves the harness unbounded.
  it("is off when the caller bounds nothing", () => {
    expect(workerHarnessTimeoutSeconds(undefined)).toBe(0);
    expect(workerHarnessTimeoutSeconds(0)).toBe(0);
    expect(workerBootEnv(boot).TICKS_WORKER_TIMEOUT).toBeUndefined();
    expect(workerBootEnv({ ...boot, harness_budget_ms: 0 }).TICKS_WORKER_TIMEOUT).toBeUndefined();
  });
});
