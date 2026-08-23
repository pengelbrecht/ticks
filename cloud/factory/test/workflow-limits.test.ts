import { describe, expect, it } from "vitest";

import {
  MAX_WAVE_LEGS,
  WAVE_LEG_MS,
  waveSpawnBudget,
} from "../src/run-workflow";
import {
  DEFAULT_CONFIRM_TIMEOUT_MS,
  DEFAULT_PROBE_TIMEOUT_MS,
  DEFAULT_SALVAGE_GRACE_MS,
  DEFAULT_WAIT_TIMEOUT_MS,
  FANOUT_DEGRADATION_FACTOR,
  COLD_START_BENCHMARK_MS,
  probeTimeoutMs,
} from "../src/worker-dispatch";
import {
  STEP_WORK_BUDGET_MS,
  WORKFLOW_STEP_TIMEOUT_MS,
  fitsInStep,
  shareStepBudget,
  stepBudget,
} from "../src/workflow-limits";

/**
 * Cloudflare's per-step execution cap, pinned (tick 2xm).
 *
 * `.tick/learnings.md` records the shape of this class of bug twice already:
 * PBKDF2 at 210k iterations passed sixty local tests and 503'd on every
 * deployed request, because local workerd does not enforce what the edge
 * enforces. The rule it produced — "pin each limit as a named constant with a
 * guard test" — is what this file is. A green vitest run cannot prove the edge
 * accepts a value; it can prove nothing in this package is SIZED past one.
 */
describe("the 10-minute Workflow step limit is a named, guarded constant", () => {
  it("is the number Cloudflare killed two live runs with", () => {
    // Both fan-out runs of epic 1vn errored with the literal string
    // "Execution timed out after 600000ms", in step cloud:dispatch:0-1.
    expect(WORKFLOW_STEP_TIMEOUT_MS).toBe(600_000);
  });

  it("never lets a step be sized for its whole allowance", () => {
    expect(STEP_WORK_BUDGET_MS).toBeLessThan(WORKFLOW_STEP_TIMEOUT_MS);
    // The margin is what pays for the things a step cannot plan: an R2 write,
    // a GitHub round trip, a container that answers late.
    expect(WORKFLOW_STEP_TIMEOUT_MS - STEP_WORK_BUDGET_MS).toBeGreaterThanOrEqual(60_000);
    expect(fitsInStep(STEP_WORK_BUDGET_MS)).toBe(true);
    expect(fitsInStep(STEP_WORK_BUDGET_MS + 1)).toBe(false);
    expect(stepBudget(WORKFLOW_STEP_TIMEOUT_MS * 10)).toBe(STEP_WORK_BUDGET_MS);
  });

  /**
   * THE BUG, as arithmetic. A wave's wait is longer than a step may run for,
   * so a wave cannot be waited on inside one step — which is exactly what
   * `superviseCloudWave` did until this tick.
   */
  it("cannot contain a whole wave's wait, which is why legs exist", () => {
    expect(fitsInStep(DEFAULT_WAIT_TIMEOUT_MS)).toBe(false);
    expect(DEFAULT_WAIT_TIMEOUT_MS).toBeGreaterThan(WORKFLOW_STEP_TIMEOUT_MS);
  });

  it("bounds one dispatch leg, and enough legs to cover the longest wave", () => {
    expect(fitsInStep(WAVE_LEG_MS)).toBe(true);
    // Room left inside the step for the leg's reconcile, collects, teardowns
    // and its R2 write — the leg's wait is not the leg's whole cost.
    expect(WAVE_LEG_MS).toBeLessThan(STEP_WORK_BUDGET_MS);
    // And a wave never runs out of legs before it runs out of budget.
    expect(MAX_WAVE_LEGS * WAVE_LEG_MS).toBeGreaterThan(DEFAULT_WAIT_TIMEOUT_MS);
  });

  /**
   * tick 7zk's arithmetic. A leg cancelled at its very last second then holds
   * every container's salvage window open INSIDE the same step, and the step
   * that matters most — the one ending a run that has just spent its whole
   * budget — is exactly the one that must not be the step that kills the
   * supervisor. So the window is held back from the leg, not added to it.
   */
  it("leaves room for a cancelled leg's salvage window inside the same step", () => {
    expect(fitsInStep(WAVE_LEG_MS + DEFAULT_SALVAGE_GRACE_MS)).toBe(true);
    // And still room beyond that for the leg's reconcile, collects, teardowns
    // and its R2 write, which the window does not replace.
    expect(WAVE_LEG_MS + DEFAULT_SALVAGE_GRACE_MS).toBeLessThan(STEP_WORK_BUDGET_MS);
  });

  /**
   * The second, quieter half of the same bug: a step's waits are budgeted
   * TOGETHER. A 418s probe and a 180s confirm are each reasonable and sum to
   * 598s, which is a step two seconds from the cap with a reconcile still to
   * pay for.
   */
  it("budgets a dispatch leg's probe and confirm together, not one at a time", () => {
    for (const width of [1, 2, 3, 5]) {
      const budget = waveSpawnBudget(width);
      expect(fitsInStep(budget.probe_timeout_ms + budget.confirm_timeout_ms)).toBe(true);
    }
    // At the width this deployment actually runs (`max_instances = 3`) nothing
    // is scaled down: the probe keeps its full measured allowance.
    const three = waveSpawnBudget(3);
    expect(three.probe_timeout_ms).toBe(probeTimeoutMs(3));
    expect(three.confirm_timeout_ms).toBe(DEFAULT_CONFIRM_TIMEOUT_MS);
  });

  it("scales every share when a caller asks for more than a step can spend", () => {
    const shared = shareStepBudget({ a: 400_000, b: 400_000 }, "a test");
    expect(shared.a! + shared.b!).toBeLessThanOrEqual(STEP_WORK_BUDGET_MS);
    // In proportion — never starving the last share to pay the first.
    expect(shared.a).toBe(shared.b);
  });
});

/**
 * The probe budget, degraded for the width a wave actually runs at (tick 2xm)
 * rather than for the widest one anyone has measured (tick 7go's constant).
 */
describe("probeTimeoutMs", () => {
  it("keeps tick 7go's derivation at the widest measured width", () => {
    expect(probeTimeoutMs(5)).toBe(DEFAULT_PROBE_TIMEOUT_MS);
    expect(probeTimeoutMs(5)).toBe(
      Math.ceil(COLD_START_BENCHMARK_MS * FANOUT_DEGRADATION_FACTOR * 1.2)
    );
  });

  it("charges a narrower wave only the degradation it measured", () => {
    expect(probeTimeoutMs(1)).toBe(Math.ceil(COLD_START_BENCHMARK_MS * 1.2));
    expect(probeTimeoutMs(3)).toBe(Math.ceil(COLD_START_BENCHMARK_MS * 2.22 * 1.2));
    expect(probeTimeoutMs(2)).toBeGreaterThan(probeTimeoutMs(1));
    expect(probeTimeoutMs(2)).toBeLessThan(probeTimeoutMs(3));
  });

  it("never extrapolates past the benchmark, in either direction", () => {
    // Wider than anything measured gets the widest measured factor, not a
    // number invented by extending a line off the end of the data.
    expect(probeTimeoutMs(50)).toBe(probeTimeoutMs(5));
    expect(probeTimeoutMs(0)).toBe(probeTimeoutMs(1));
    expect(probeTimeoutMs(Number.NaN)).toBe(probeTimeoutMs(1));
  });

  it("still leaves every width's probe inside one step on its own", () => {
    for (const width of [1, 3, 5, 50]) {
      expect(fitsInStep(probeTimeoutMs(width))).toBe(true);
    }
  });
});
