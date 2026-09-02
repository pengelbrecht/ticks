import { describe, expect, it } from "vitest";

import contract from "../../../contracts/lifecycle-invariants.json";
import jobProtocol from "../../../contracts/job-protocol.json";

import { MAX_POLL_MS } from "../src/run-workflow";
import { SANDBOX_SLEEP_AFTER } from "../src/sandbox";
import { STEP_WORK_BUDGET_MS } from "../src/workflow-limits";

import { LifecycleHarness, type FinalState, type Step, type Thresholds } from "./lifecycle-harness";

/**
 * The TypeScript reader for `contracts/lifecycle-invariants.json` — SPEC
 * Appendix A's thirteen lifecycle invariants as a conformance suite.
 *
 * Mirrors `internal/factory/lifecycle`, and the mirroring is the deliverable
 * rather than duplication to be tidied away. Appendix A's rules were earned on
 * ONE host and have to hold on every executor the SPEC plans — a local
 * subprocess executor, Herdr, this Workflow, the Computer executor — and those
 * hosts share no code. One rule, four mechanisms, no compiler between them:
 * exactly the shape `contracts/README.md` exists for.
 *
 * Every invariant is a named `it` carrying the live failure that earned it and
 * the symbols it lives in today (SPEC §9.2 preserves the symbols when
 * run-workflow.ts is decomposed; this preserves the reasons). Each replays its
 * sequences against this side's own copy of the fake and then runs the
 * negative control ONE GUARD AT A TIME: with any single guard of that
 * invariant off, at least one sequence must stop matching the contract, and
 * every OTHER invariant must still pass.
 *
 * This suite ignites nothing. It creates no Workflow, opens no binding and
 * touches no D1 — `.tick/learnings.md`: a vitest case that starts a run and
 * does not end it times out the NEXT file in the shared workerd runtime.
 */

type Site = { file: string; symbols: string[]; note: string };
type Sequence = { id: string; why: string; steps: Step[]; final: FinalState };
type Invariant = {
  id: string;
  number: number;
  name: string;
  title: string;
  statement: string;
  earned_from: string;
  guards: string[];
  today: Site[];
  sequences: Sequence[];
};

const invariants = contract.invariants as unknown as Invariant[];
const thresholds = contract.harness.thresholds as unknown as Thresholds;
const ops = contract.harness.ops as Array<{ op: string; does: string; outcomes: string[] }>;
const guards = contract.harness.guards as Array<{ guard: string; enforces: string; off: string }>;
const fingerprintFields = contract.harness.fingerprint_fields.fields.map((f) => f.provenance_field);
const protectedPrefixes = contract.harness.protected_prefixes.prefixes as string[];

/**
 * `SANDBOX_SLEEP_AFTER` is a duration STRING (`"20m"`), because that is what
 * the Cloudflare Sandbox binding takes. The fixture holds milliseconds, so the
 * comparison needs the one conversion — written here, in the reader, rather
 * than pre-computed into the fixture, which is exactly the third copy this
 * whole assertion exists to prevent.
 */
function durationToMs(duration: string): number {
  const m = /^(\d+)(ms|s|m|h)$/.exec(duration.trim());
  if (!m) throw new Error(`cannot parse duration ${JSON.stringify(duration)}`);
  const unit = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000 }[m[2] as "ms" | "s" | "m" | "h"];
  return Number(m[1]) * unit;
}

function byID(id: string): Invariant {
  const found = invariants.find((inv) => inv.id === id);
  if (!found) throw new Error(`contracts/lifecycle-invariants.json declares no invariant ${id}`);
  return found;
}

function harness(): LifecycleHarness {
  return new LifecycleHarness(thresholds, fingerprintFields, protectedPrefixes);
}

/** Replays every sequence of one invariant and asserts each step and the final state. */
function conforms(inv: Invariant): void {
  expect(inv.sequences.length, `${inv.id} has no sequence, so it is not runnable`).toBeGreaterThan(0);
  for (const seq of inv.sequences) {
    const h = harness();
    seq.steps.forEach((step, i) => {
      expect(h.run(step), `${inv.id}/${seq.id} step ${i} (${step.op})`).toBe(step.expect);
    });
    expect(h.mismatches(seq.final), `${inv.id}/${seq.id} final state`).toEqual([]);
  }
}

/**
 * The negative control, run ONE GUARD AT A TIME.
 *
 * It used to turn all of an invariant's guards off together, which is a control
 * that cannot see a dead guard: A1 and A13 each have two, and with both off the
 * first one's divergence satisfied the whole check while the second could have
 * stopped enforcing anything. Disabling them one at a time makes each guard
 * separately load-bearing.
 *
 * Each guard also carries a BLAST RADIUS assertion: with it off, every OTHER
 * invariant still passes. That turns "a guard belongs to the rule it enforces"
 * from a naming convention into something executable — a guard whose absence
 * quietly changes another invariant's outcome is a guard two rules were
 * sharing.
 */
function eachGuardIsLoadBearing(inv: Invariant): void {
  expect(inv.guards.length, `${inv.id} names no guard`).toBeGreaterThan(0);

  for (const guard of inv.guards) {
    let broke = false;
    for (const seq of inv.sequences) {
      const h = harness();
      h.off.add(guard);
      let diverged = false;
      for (const step of seq.steps) {
        if (h.run(step) !== step.expect) diverged = true;
      }
      if (diverged || h.mismatches(seq.final).length > 0) broke = true;
    }
    expect(
      broke,
      `${inv.id} passes with ${guard} disabled — that guard is not what its sequences are testing`,
    ).toBe(true);

    otherInvariantsStayGreen(inv.id, guard);
  }
}

/** Every invariant except `owner` still conforms with `guard` turned off. */
function otherInvariantsStayGreen(owner: string, guard: string): void {
  for (const other of invariants) {
    if (other.id === owner) continue;
    for (const seq of other.sequences) {
      const h = harness();
      h.off.add(guard);
      seq.steps.forEach((step, i) => {
        expect(
          h.run(step),
          `${other.id}/${seq.id} step ${i} (${step.op}) moved when ${owner}'s guard ${guard} was disabled — the guard is shared`,
        ).toBe(step.expect);
      });
      expect(
        h.mismatches(seq.final),
        `${other.id}/${seq.id} final state moved when ${owner}'s guard ${guard} was disabled`,
      ).toEqual([]);
    }
  }
}

function check(inv: Invariant): void {
  conforms(inv);
  eachGuardIsLoadBearing(inv);
}

// -------------------------------------------------------------- the shape ---

describe("the Appendix A conformance suite", () => {
  it("identifies itself and names who must pass it", () => {
    expect(contract.schema_version).toBe(1);
    expect(contract.contract).toBe("ticfac.lifecycle_invariants");
    expect(contract.spec_sections).toContain("Appendix A");
    // The gate is as much the deliverable as the sequences: §12 Phase 0 step 7
    // asks for a suite "the reconciler and every executor must pass".
    expect(contract.gate.statement).not.toBe("");
    expect(contract.gate.not_a_style_guide).not.toBe("");
    expect(contract.gate.applies_to.length).toBeGreaterThanOrEqual(3);
    for (const who of contract.gate.applies_to) expect(who).toContain("Phase");
  });

  it("carries thirteen invariants, one per Appendix A entry, each with the failure that earned it", () => {
    expect(invariants).toHaveLength(13);
    const names = new Set<string>();
    invariants.forEach((inv, i) => {
      expect(inv.number, `invariant ${i + 1} is out of Appendix A's order`).toBe(i + 1);
      expect(inv.id).toBe(`A${inv.number}`);
      expect(names.has(inv.name), `duplicate name ${inv.name}`).toBe(false);
      names.add(inv.name);
      expect(inv.title).not.toBe("");
      expect(inv.statement).not.toBe("");
      // Guidance wearing a conformance test's clothes is the one thing
      // Appendix A's preamble says these are not.
      expect(inv.earned_from.length, `${inv.id} does not name the live failure that earned it`)
        .toBeGreaterThan(60);
      expect(inv.guards.length).toBeGreaterThan(0);
      expect(inv.sequences.length).toBeGreaterThan(0);
      for (const seq of inv.sequences) {
        expect(seq.id).not.toBe("");
        expect(seq.why, `${inv.id}/${seq.id} does not say what it proves`).not.toBe("");
      }
    });
  });

  // This reader checks the cross-reference's SHAPE, not that the symbols still
  // exist: vitest runs inside workerd, which has no filesystem to open
  // `run-workflow.ts` with. The existence check is Go's
  // (`internal/factory/lifecycle`, TestNamedSymbolsExistInTheFilesThatClaimThem)
  // — one side greps, both sides read the same contract.
  it("cross-references where each invariant lives today", () => {
    let inRunWorkflow = 0;
    for (const inv of invariants) {
      expect(inv.today.length, `${inv.id} names no implementation it was extracted from`).toBeGreaterThan(0);
      for (const site of inv.today) {
        expect(site.file).not.toBe("");
        expect(site.symbols.length).toBeGreaterThan(0);
        expect(site.note, `${inv.id}: ${site.file} carries no note`).not.toBe("");
      }
      if (inv.today.some((s) => s.file === "cloud/factory/src/run-workflow.ts")) inRunWorkflow++;
    }
    // §12 Phase 0 step 7: run-workflow.ts is 3,500 lines BECAUSE of these
    // orderings, and today ALL thirteen name a symbol in it — several name
    // another file as well (A5's timer is in the sandbox entrypoint, A11's
    // release in ci-remediation.ts), which is a second site, not a substitute.
    //
    // The assertion is a floor rather than an equality on purpose: an
    // invariant that genuinely lives somewhere else after the §9.2
    // decomposition is a fact about the code, not a regression, whereas a
    // majority that stops naming the file at all is the cross-reference
    // rotting. The floor catches the second without failing on the first.
    expect(inRunWorkflow).toBeGreaterThanOrEqual(10);
  });

  it("closes the op vocabulary over both guard modes", () => {
    const declared = new Map(ops.map((op) => [op.op, new Set(op.outcomes)]));
    expect(declared.size).toBeGreaterThan(0);
    expect(contract.harness.rules.length).toBeGreaterThan(0);
    expect(contract.harness.state.length).toBeGreaterThan(0);

    const reached = new Map<string, Set<string>>();
    const reach = (op: string, outcome: string) => {
      if (!reached.has(op)) reached.set(op, new Set());
      reached.get(op)!.add(outcome);
    };

    for (const inv of invariants) {
      for (const seq of inv.sequences) {
        for (const step of seq.steps) {
          const outcomes = declared.get(step.op);
          expect(outcomes, `${inv.id}/${seq.id} uses undeclared op ${step.op}`).toBeDefined();
          expect(outcomes!.has(step.expect), `op ${step.op} does not declare ${step.expect}`).toBe(true);
          reach(step.op, step.expect);
        }
        // The same sequence with this invariant's guards off. Whatever the fake
        // answers then is a real outcome of that op — `recorded` for a
        // supervisor's self-report, `stuck_awaiting_claimer`,
        // `reported_requested`, a clock's `released` — and every one is what a
        // WRONG implementation produces, so it belongs in the vocabulary.
        const h = harness();
        for (const guard of inv.guards) h.off.add(guard);
        for (const step of seq.steps) reach(step.op, h.run(step));
      }
    }

    for (const [op, outcomes] of declared) {
      expect(reached.has(op), `op ${op} is declared but no sequence uses it`).toBe(true);
      for (const outcome of outcomes) {
        expect(reached.get(op)!.has(outcome), `op ${op} declares ${outcome}, which nothing reaches`).toBe(true);
      }
      for (const outcome of reached.get(op)!) {
        expect(outcomes.has(outcome), `op ${op} produced undeclared outcome ${outcome}`).toBe(true);
      }
    }
  });

  it("accounts for every guard exactly once", () => {
    const declared = new Set<string>();
    for (const g of guards) {
      expect(g.enforces).not.toBe("");
      expect(g.off, `guard ${g.guard} does not say what happens with it off`).not.toBe("");
      expect(declared.has(g.guard), `guard ${g.guard} is declared twice`).toBe(false);
      declared.add(g.guard);
    }
    const claimed = new Set<string>();
    for (const inv of invariants) {
      for (const guard of inv.guards) {
        expect(declared.has(guard), `${inv.id} names undeclared guard ${guard}`).toBe(true);
        expect(claimed.has(guard), `guard ${guard} is claimed by more than one invariant`).toBe(false);
        claimed.add(guard);
      }
    }
    for (const guard of declared) {
      expect(claimed.has(guard), `guard ${guard} is declared but no invariant claims it`).toBe(true);
    }
  });

  it("pins the poll cadence under the wipe threshold in one place", () => {
    // A4's second sentence: the relationship is pinned by a constant or a test,
    // not by arithmetic in two files. This is that one place.
    expect(thresholds.max_poll_ms).toBeLessThan(thresholds.wipe_threshold_ms);
    expect(thresholds.max_poll_ms * 2).toBeLessThanOrEqual(thresholds.wipe_threshold_ms);
    expect(thresholds.push_interval_ms).toBeLessThan(thresholds.max_poll_ms);
    expect(thresholds.step_cap_ms).toBeGreaterThan(0);
  });

  it("pins those numbers to the substrate constants, not to a third copy of them", () => {
    // THE ASSERTION THIS SIDE ADDS, AND THE ONE THAT WOULD HAVE CAUGHT THE BUG.
    // Bundle 2.1.0 shipped wipe_threshold_ms = 600000, which is
    // WORKFLOW_STEP_TIMEOUT_MS — the Workflow step cap, not the substrate's
    // sleep threshold. Every inequality above held, both readers agreed, and
    // the fixture described a host that does not exist. Only importing the
    // real constants can see that; Go cannot import TypeScript, so this is the
    // half of the pin that lives here.
    const from = thresholds.substrate;
    expect(from.wipe_threshold_ms.symbol).toBe("SANDBOX_SLEEP_AFTER");
    expect(from.max_poll_ms.symbol).toBe("MAX_POLL_MS");
    expect(from.step_cap_ms.symbol).toBe("STEP_WORK_BUDGET_MS");

    expect(
      thresholds.wipe_threshold_ms,
      `wipe_threshold_ms must equal SANDBOX_SLEEP_AFTER (${SANDBOX_SLEEP_AFTER})`,
    ).toBe(durationToMs(SANDBOX_SLEEP_AFTER));
    expect(thresholds.max_poll_ms, "max_poll_ms must equal run-workflow.ts's MAX_POLL_MS").toBe(MAX_POLL_MS);
    expect(
      thresholds.step_cap_ms,
      "step_cap_ms must equal workflow-limits.ts's STEP_WORK_BUDGET_MS",
    ).toBe(STEP_WORK_BUDGET_MS);
  });

  it("keeps A10's protected prefixes in the contract, not in the two harnesses", () => {
    // Both harnesses used to hard-code `.tick/` and `.ticfac/`, so the fixture
    // described a boundary it did not define: the two copies could drift apart,
    // or away from the repository's real boundary, with every sequence green.
    expect(protectedPrefixes.length).toBeGreaterThan(0);
    expect(contract.harness.protected_prefixes.why).toHaveLength(protectedPrefixes.length);
    for (const prefix of protectedPrefixes) {
      // A bare name would also match a file that merely starts with it.
      expect(prefix.endsWith("/"), `protected prefix ${prefix} is not a directory prefix`).toBe(true);
    }

    // And the boundary A10's sequence exercises is this one.
    let refused = 0;
    let permitted = 0;
    for (const seq of byID("A10").sequences) {
      for (const step of seq.steps) {
        if (step.op !== "attempt_boundary_write") continue;
        const under = protectedPrefixes.some((prefix) => step.path!.startsWith(prefix));
        if (step.expect === "refused_and_reported") {
          refused++;
          expect(under, `A10 expects ${step.path} refused, but no declared prefix covers it`).toBe(true);
        } else if (step.expect === "permitted") {
          permitted++;
          expect(under, `A10 expects ${step.path} permitted, but a declared prefix covers it`).toBe(false);
        }
      }
    }
    expect(refused, "each prefix needs a refusal").toBeGreaterThanOrEqual(protectedPrefixes.length);
    expect(permitted, "the boundary needs a path outside it").toBeGreaterThan(0);
  });

  it("resolves A13's fingerprint fields to the evidence record's provenance", () => {
    // The fields are NOT defined here. Bundle 2.0.0 was cut because two
    // contracts described one record and disagreed with nobody noticing, so
    // this mapping is followed rather than trusted.
    const definedBy = contract.harness.fingerprint_fields.defined_by;
    expect(definedBy.file).toBe("job-protocol.json");
    expect(definedBy.pointer).toBe("#/$defs/provenance");
    expect(jobProtocol.records.evidence.schema_id).toBe(definedBy.schema_id);

    const provenance = jobProtocol.$defs.provenance as {
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(fingerprintFields).toHaveLength(4);
    for (const field of fingerprintFields) {
      expect(Object.keys(provenance.properties), `${field} is not a provenance property`).toContain(field);
      // Evidence that MAY omit a fingerprint field is not fingerprinted.
      expect(provenance.required, `${field} is not required by provenance`).toContain(field);
    }
  });
});

// --------------------------------------------------------- the thirteen ---

describe("SPEC Appendix A", () => {
  /**
   * A1 — A stop is a durable refusal to issue credentials, checked before every
   * boot; revoke before teardown, so the money dies first.
   *
   * Earned by a closeout pass that enforced no budgets and therefore read no
   * stop record at all: an operator killing a run mid-closeout was talking to
   * nobody, and every closeout reboot minted a fresh credential over their
   * revocation. The ordering half is tick gyl's.
   *
   * Lives today in src/run-workflow.ts — hardStopTrip, hardStopRecord,
   * detectTrip, tripRevokeReason, drainAndKill, runWaveBatch — over
   * src/gateway.ts's issueRunToken and revokeRunTokens.
   */
  it("A1 a stop is a durable refusal to issue credentials", () => check(byID("A1")));

  /**
   * A2 — A supervisor cannot report its own death.
   *
   * Earned by runs whose supervisor died mid-wave: the index row stayed frozen
   * at `running` with the containers orphaned and still spending, because the
   * row said the run was alive and nothing outside was asked.
   *
   * Lives today in src/run-workflow.ts — observe, renewRunLease, LeaseRenewal,
   * leaseLostTrip, updateRunState, finalize — with src/reconcile.ts's
   * probeLiveness / NOT_ASKED and src/progress.ts's ref snapshots as the
   * outside view.
   */
  it("A2 a supervisor cannot report its own death", () => check(byID("A2")));

  /**
   * A3 — No step outlives the host's cap; long waits are spread across bounded
   * steps that re-derive state from durable facts on each leg.
   *
   * Earned when dispatchWave blocked for up to ninety-one minutes inside a
   * step that may execute for ten: every real wave killed its own supervisor at
   * minute ten, run record frozen at `running`, lease unrenewed, containers
   * orphaned and still spending.
   *
   * Lives today in src/run-workflow.ts — WAVE_LEG_MS, MAX_WAVE_LEGS,
   * runWaveBatch, superviseWaveLoop, waveSpawnBudget — over
   * src/workflow-limits.ts's STEP_WORK_BUDGET_MS, stepBudget, shareStepBudget.
   */
  it("A3 no step outlives the host's cap", () => check(byID("A3")));

  /**
   * A4 — Polling is the keepalive, well under the substrate's wipe threshold,
   * pinned by a constant or a test rather than by arithmetic in two files.
   *
   * Earned by run_62c289d1 (a $5 ceiling, $5.86 recorded correctly, still
   * `running` with no trip) and run a1f87597 (a ceiling crossed at 11:29:52,
   * the token revoked at 11:31:59, two minutes inside a sleep).
   *
   * Lives today in src/run-workflow.ts — MIN_POLL_MS, MAX_POLL_MS, pollDelay,
   * deadlineCap, spendCap, BUDGET_POLL_HEADROOM, renewalTtl,
   * waveLeaseHeartbeat. renewalTtl is the ONE place the cadence and the lease
   * ttl are related.
   */
  it("A4 polling is the keepalive", () => check(byID("A4")));

  /**
   * A5 — In-progress work is pushed on a timer; a process exit is never proof
   * of completion.
   *
   * Earned by a worker that died mid-turn holding 643 uncommitted lines and
   * settled looking finished, and by tick ehy: a fully successful boot chain
   * that printed 271 bytes, pushed no branch, and was recorded COMPLETED.
   *
   * Lives today in cloud/sandbox/entrypoint.sh (start_keeper,
   * TICKS_KEEPER_INTERVAL) for the timer, with src/progress.ts and
   * run-workflow.ts's assessProgress for "the exit status only decides whether
   * to reboot".
   */
  it("A5 in-progress work is pushed on a timer", () => check(byID("A5")));

  /**
   * A6 — A live job is never redispatched; adopt by stable identity.
   *
   * Earned in Phase 1: a branch with no commits is exactly what a worker that
   * has not committed yet looks like, and one died mid-turn holding 643
   * uncommitted lines with its branch settling as finished.
   *
   * Lives today in src/reconcile.ts — reconcileWave, classifyWorker,
   * probeLiveness, NOT_ASKED, dispatchable, adoptions — and run-workflow.ts's
   * MAX_WORKER_DISPATCHES. The third answer is load-bearing: a container that
   * cannot be ASKED is `unknown`, never a redispatch.
   */
  it("A6 a live job is never redispatched", () => check(byID("A6")));

  /**
   * A7 — Read back after write.
   *
   * Earned by a wave request whose read-back returned a different pass's
   * object: a Workflow step that completes is checkpointed, but the R2 object
   * beside it is not versioned by the replay.
   *
   * Lives today in src/run-workflow.ts — readWaveRequest, writeRunRecord,
   * recordRunProgress, manifestRecorder — over src/artifacts.ts's write sites,
   * with src/sandbox.ts's `pass` as the stamp the read-back matches on.
   */
  it("A7 read back after write", () => check(byID("A7")));

  /**
   * A8 — An in-flight state is settled by whoever finds it next, from durable
   * evidence.
   *
   * Earned by a row set to `committing` before an await: a death there left it
   * stuck forever and reported as already decided, and a human button press has
   * no source that retries it.
   *
   * Lives today in src/run-workflow.ts's finalize (which ALWAYS runs),
   * src/reconcile.ts's settled / settledOutcome, and src/run-room.ts's alarm
   * expiry for the case nobody comes back at all.
   */
  it("A8 an in-flight state is settled by whoever finds it next", () => check(byID("A8")));

  /**
   * A9 — Never collapse distinct failure classes into one message.
   *
   * Earned by run_659b7cf2, which read "the dispatch lease was lost to another
   * run" when no other run existed: a ten-minute lease had lapsed under an
   * eighty-eight-minute wave that renewed nothing, and that message sent the
   * diagnosis looking for a competing run for as long as it stood.
   *
   * Lives today in src/run-workflow.ts — leaseLostTrip, LeaseRenewal,
   * renewRunLease, cloudWaveLoss, describeCloudWaveLoss. `null` from
   * renewRunLease is "the renewal could not be made" and is NOT a lost lease.
   */
  it("A9 never collapse distinct failure classes", () => check(byID("A9")));

  /**
   * A10 — Boundaries are enforced by the substrate, not requested of the model,
   * and every attempt is reported.
   *
   * Earned by a worker that committed tracker state although its prompt forbade
   * it in as many words. Compliance is a property of the model.
   *
   * Lives today in extensions/ticks-runner/boundary.ts for the local half and
   * in src/credentials.ts's grades for the cloud half, where the enforcement
   * point is the credential a job is booted with.
   */
  it("A10 boundaries are enforced by the substrate", () => check(byID("A10")));

  /**
   * A11 — A struck-out unit is released by a person, never by the clock.
   *
   * Earned by a table with two write sites and ZERO reads: a rolling window
   * re-opened a struck-out branch a day later, it silently resumed spending,
   * and the human paged once was never told again.
   *
   * Lives today in src/ci-remediation.ts — strikeBudget, escalationFor,
   * clearEscalation, escalate, STRIKE_BUDGET, STRIKE_WINDOW_MS — where an open
   * escalation refuses full stop, because "time passes" is the answer that
   * caused the bug.
   */
  it("A11 a struck-out unit is released by a person", () => check(byID("A11")));

  /**
   * A12 — Effective budgets are reported after clamping.
   *
   * Earned by an operator who asked for --max-cost 40 and got $8: the policy
   * was right and silent, and the first place the real number appeared was the
   * cancellation that ended the run.
   *
   * Lives today in src/run-workflow.ts — boundedBudget, runConfig,
   * effectiveRunBudget. runConfig is still the one clamp; effectiveRunBudget
   * only reports its result, while an operator is still reading.
   */
  it("A12 effective budgets are reported after clamping", () => check(byID("A12")));

  /**
   * A13 — Evidence is fingerprinted to what it evaluated, and publication
   * checks freshness against the current target.
   *
   * Earned by green gates reported for targets they had not evaluated:
   * parallel ticks each green alone, only the INTEGRATED gate seeing the break,
   * and the break landing in the innocent tick.
   *
   * Lives today in contracts/job-protocol.json (records.evidence over
   * $defs.provenance — the bundle's ONE evidence record), with
   * src/pr-review.ts's reviewEvidence and src/progress.ts's ref snapshots for
   * where the fingerprint is drawn from.
   */
  it("A13 evidence is fingerprinted to what it evaluated", () => check(byID("A13")));
});
