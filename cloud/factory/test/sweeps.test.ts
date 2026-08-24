import { env } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_MAX_COST_USD, runConfig } from "../src/run-workflow";
import {
  DEFAULT_MAX_RUN_COST_USD,
  MAX_DECLARED_SWEEPS,
  SWEEP_ORDER,
  SWEEP_TICKS_LIMIT,
  compareCandidates,
  cronMatches,
  declaredSweeps,
  describeClamps,
  effectiveSweepPolicy,
  parseCron,
  parseSweepCandidate,
  parseSweepFilter,
  selectSweep,
  sweepCeilings,
  type SweepCandidate,
} from "../src/sweeps";

/**
 * The sweep dispatcher's policy and arithmetic (D14/D15, tick hye).
 *
 * Everything here is pure, which is the point: the tick's first demand is that
 * selection is DETERMINISTIC — priority, then age, then id, no model call and
 * no judgement — and a rule that needs a network to exercise is a rule nobody
 * can pin. The second demand is that every clamped number is reported, and the
 * third is that the record explains the selection on its own.
 */

const DOC_EXAMPLE = `
[sweeps.morning-bugs]
cron = "0 4 * * 1-5"
filter = "type:bug priority<=2 unblocked"
max_ticks = 5
budget_usd = 10
tier = "economy"
gate_on_complete = "telegram"
`;

afterEach(() => {
  delete env.SWEEP_MAX_TICKS;
  delete env.SWEEP_MAX_TIER;
  delete env.RUN_MAX_COST_USD;
});

// ------------------------------------------------------------ declaration ---

describe("declaredSweeps", () => {
  it("reads the design doc's own example", () => {
    const [policy] = declaredSweeps(DOC_EXAMPLE);
    expect(policy).toMatchObject({
      name: "morning-bugs",
      cron: "0 4 * * 1-5",
      filter: "type:bug priority<=2 unblocked",
      max_ticks: 5,
      budget_usd: 10,
      tier: "economy",
      gate_on_complete: "telegram",
    });
    expect(policy!.terms).toEqual({
      types: ["bug"],
      labels: [],
      priority: { op: "<=", value: 2 },
      unblocked: true,
    });
  });

  it("has no sweeps when the config declares none", () => {
    expect(declaredSweeps("[sandbox]\nimage = \"ghcr.io/x:1\"\n")).toEqual([]);
  });

  it("returns them in name order whatever order they were written in", () => {
    const source = `
[sweeps.zebra]
cron = "0 4 * * *"
filter = "type:bug"
max_ticks = 1
budget_usd = 1

[sweeps.alpha]
cron = "0 5 * * *"
filter = "type:bug"
max_ticks = 1
budget_usd = 1
`;
    expect(declaredSweeps(source).map((p) => p.name)).toEqual(["alpha", "zebra"]);
  });

  it("refuses a key it does not know rather than ignoring it", () => {
    const source = DOC_EXAMPLE + "\nbugdet_usd = 500\n";
    expect(() => declaredSweeps(source)).toThrow(/bugdet_usd is not a key this reader knows/);
  });

  it("refuses a missing cron, filter, max_ticks or budget", () => {
    for (const key of ["cron", "filter", "max_ticks", "budget_usd"]) {
      const source = DOC_EXAMPLE.split("\n")
        .filter((line) => !line.startsWith(`${key} `))
        .join("\n");
      expect(() => declaredSweeps(source), key).toThrow(new RegExp(`${key} is required`));
    }
  });

  it("refuses a cron it cannot schedule", () => {
    const source = DOC_EXAMPLE.replace('"0 4 * * 1-5"', '"0 4 * *"');
    expect(() => declaredSweeps(source)).toThrow(/is not a schedule this reader understands/);
  });

  it("refuses a filter term it does not know", () => {
    const source = DOC_EXAMPLE.replace("type:bug priority<=2 unblocked", "type:bug cheap-looking");
    expect(() => declaredSweeps(source)).toThrow(/is not a filter this reader understands/);
  });

  it("refuses numbers outside their bounds", () => {
    expect(() => declaredSweeps(DOC_EXAMPLE.replace("max_ticks = 5", "max_ticks = 0"))).toThrow(
      /max_ticks must be an integer between 1 and/
    );
    expect(() =>
      declaredSweeps(DOC_EXAMPLE.replace("max_ticks = 5", `max_ticks = ${SWEEP_TICKS_LIMIT + 1}`))
    ).toThrow(/max_ticks must be an integer between 1 and/);
    expect(() => declaredSweeps(DOC_EXAMPLE.replace("budget_usd = 10", "budget_usd = 0"))).toThrow(
      /budget_usd must be a positive number/
    );
  });

  it("refuses a tier or gate outside the closed vocabulary", () => {
    expect(() => declaredSweeps(DOC_EXAMPLE.replace('"economy"', '"unlimited"'))).toThrow(
      /tier is "unlimited"; known values/
    );
    expect(() => declaredSweeps(DOC_EXAMPLE.replace('"telegram"', '"carrier-pigeon"'))).toThrow(
      /gate_on_complete is "carrier-pigeon"; known values/
    );
  });

  it("refuses a __proto__ table rather than losing it to a prototype", () => {
    const source = `
[sweeps.__proto__]
cron = "0 4 * * *"
filter = "type:bug"
max_ticks = 1
budget_usd = 1
`;
    expect(() => declaredSweeps(source)).toThrow(/is not a usable sweep name/);
  });

  it("refuses more sweeps than it will act on", () => {
    let source = "";
    for (let i = 0; i <= MAX_DECLARED_SWEEPS; i++) {
      source += `\n[sweeps.s${i}]\ncron = "0 4 * * *"\nfilter = "type:bug"\nmax_ticks = 1\nbudget_usd = 1\n`;
    }
    expect(() => declaredSweeps(source)).toThrow(/past the 8 this reader accepts/);
  });
});

// ------------------------------------------------------------------ cron ---

describe("cron", () => {
  const at = (iso: string) => new Date(iso);

  it("fires the design doc's weekday schedule at 04:00 UTC on weekdays only", () => {
    const schedule = parseCron("0 4 * * 1-5");
    // 2026-08-24 is a Monday.
    expect(cronMatches(schedule, at("2026-08-24T04:00:00Z"))).toBe(true);
    expect(cronMatches(schedule, at("2026-08-28T04:00:00Z"))).toBe(true); // Friday
    expect(cronMatches(schedule, at("2026-08-29T04:00:00Z"))).toBe(false); // Saturday
    expect(cronMatches(schedule, at("2026-08-24T05:00:00Z"))).toBe(false);
    expect(cronMatches(schedule, at("2026-08-24T04:01:00Z"))).toBe(false);
  });

  it("reads lists, ranges and steps", () => {
    const schedule = parseCron("0,30 */6 1-7 1,7 *");
    expect(cronMatches(schedule, at("2026-01-05T06:30:00Z"))).toBe(true);
    expect(cronMatches(schedule, at("2026-07-01T00:00:00Z"))).toBe(true);
    expect(cronMatches(schedule, at("2026-01-05T07:00:00Z"))).toBe(false);
    expect(cronMatches(schedule, at("2026-01-08T06:00:00Z"))).toBe(false);
    expect(cronMatches(schedule, at("2026-02-05T06:00:00Z"))).toBe(false);
  });

  it("ORs day-of-month with day-of-week when both are restricted, as Vixie cron does", () => {
    const schedule = parseCron("0 4 1 * 1");
    expect(cronMatches(schedule, at("2026-09-01T04:00:00Z"))).toBe(true); // the 1st, a Tuesday
    expect(cronMatches(schedule, at("2026-08-24T04:00:00Z"))).toBe(true); // a Monday, not the 1st
    expect(cronMatches(schedule, at("2026-08-25T04:00:00Z"))).toBe(false);
  });

  it("treats 7 as Sunday", () => {
    expect(cronMatches(parseCron("0 4 * * 7"), at("2026-08-23T04:00:00Z"))).toBe(true);
  });

  it("refuses expressions it cannot schedule", () => {
    expect(() => parseCron("0 4 * *")).toThrow(/expected 5 fields/);
    expect(() => parseCron("0 4 * * 9")).toThrow(/outside 0-6/);
    expect(() => parseCron("60 4 * * *")).toThrow(/outside 0-59/);
    expect(() => parseCron("0 4 * * mon")).toThrow(/not a number/);
    expect(() => parseCron("0 4 * * */0")).toThrow(/step must be at least 1/);
  });
});

// ---------------------------------------------------------------- filter ---

describe("parseSweepFilter", () => {
  it("reads every term shape the reader knows", () => {
    expect(parseSweepFilter("type:bug type:chore label:sentry priority>=3 unblocked")).toEqual({
      types: ["bug", "chore"],
      labels: ["sentry"],
      priority: { op: ">=", value: 3 },
      unblocked: true,
    });
    expect(parseSweepFilter("priority:1").priority).toEqual({ op: "=", value: 1 });
  });

  it("refuses an empty filter and a doubled priority", () => {
    expect(() => parseSweepFilter("   ")).toThrow(/at least one term/);
    expect(() => parseSweepFilter("priority<2 priority>4")).toThrow(/more than once/);
  });
});

// ------------------------------------------------------------- candidates ---

describe("parseSweepCandidate", () => {
  it("reads the fields Go writes and tolerates the ones it does not know", () => {
    const candidate = parseSweepCandidate(
      JSON.stringify({
        id: "abc",
        title: "t",
        status: "open",
        priority: 1,
        type: "bug",
        owner: "",
        labels: ["x"],
        blocked_by: ["zzz"],
        created_at: "2026-08-01T00:00:00Z",
        updated_at: "2026-08-01T00:00:00Z",
        something_new_in_go: 42,
      })
    );
    expect(candidate).toMatchObject({
      id: "abc",
      status: "open",
      priority: 1,
      type: "bug",
      labels: ["x"],
      blocked_by: ["zzz"],
      awaiting_human: false,
      requires: null,
    });
  });

  it("reads both spellings of waiting on a person", () => {
    expect(parseSweepCandidate('{"id":"a","awaiting":"input"}')!.awaiting_human).toBe(true);
    expect(parseSweepCandidate('{"id":"a","manual":true}')!.awaiting_human).toBe(true);
    expect(parseSweepCandidate('{"id":"a"}')!.awaiting_human).toBe(false);
  });

  it("is not a candidate when it is not a tick record", () => {
    expect(parseSweepCandidate("not json")).toBeNull();
    expect(parseSweepCandidate('{"title":"no id"}')).toBeNull();
  });

  it("sorts a record with no priority last rather than first", () => {
    expect(parseSweepCandidate('{"id":"a"}')!.priority).toBe(Number.MAX_SAFE_INTEGER);
  });
});

// -------------------------------------------------------- effective policy ---

describe("effectiveSweepPolicy", () => {
  it("mirrors the Run Workflow's own default cost ceiling", () => {
    // Mirrored rather than imported into the scheduled path; if the real one
    // moves, this is what says so.
    expect(DEFAULT_MAX_RUN_COST_USD).toBe(DEFAULT_MAX_COST_USD);
  });

  it("reports what was asked for beside what will apply", () => {
    const [policy] = declaredSweeps(DOC_EXAMPLE);
    env.RUN_MAX_COST_USD = "4";
    env.SWEEP_MAX_TICKS = "2";
    const effective = effectiveSweepPolicy(policy!, sweepCeilings(env));
    expect(effective.budget_usd).toEqual({ requested: 10, effective: 4, clamped: true });
    expect(effective.max_ticks).toEqual({ requested: 5, effective: 2, clamped: true });
    expect(effective.tier).toEqual({ requested: "economy", effective: "economy", clamped: false });
    expect(describeClamps(effective)).toBe("max_ticks 5 -> 2, budget_usd 10 -> 4");
  });

  it("says nothing when nothing was clamped", () => {
    const [policy] = declaredSweeps(DOC_EXAMPLE);
    env.RUN_MAX_COST_USD = "40";
    env.SWEEP_MAX_TICKS = "10";
    const effective = effectiveSweepPolicy(policy!, sweepCeilings(env));
    expect(effective.budget_usd.effective).toBe(10);
    expect(describeClamps(effective)).toBe("");
  });

  it("only ever moves a tier down", () => {
    const source = DOC_EXAMPLE.replace('tier = "economy"', 'tier = "standard"');
    const [policy] = declaredSweeps(source);
    env.SWEEP_MAX_TIER = "economy";
    expect(effectiveSweepPolicy(policy!, sweepCeilings(env)).tier).toEqual({
      requested: "standard",
      effective: "economy",
      clamped: true,
    });
    env.SWEEP_MAX_TIER = "standard";
    expect(effectiveSweepPolicy(policy!, sweepCeilings(env)).tier.effective).toBe("standard");
  });

  it("ignores an unusable ceiling with a log rather than widening the sweep", () => {
    env.SWEEP_MAX_TICKS = "not a number";
    env.SWEEP_MAX_TIER = "platinum";
    const ceilings = sweepCeilings(env);
    expect(ceilings.max_ticks).toBe(5);
    expect(ceilings.tier).toBe("economy");
  });

  it("is bounded by the ticks limit even when the deployment asks for more", () => {
    env.SWEEP_MAX_TICKS = String(SWEEP_TICKS_LIMIT + 100);
    expect(sweepCeilings(env).max_ticks).toBe(SWEEP_TICKS_LIMIT);
  });

  it("arms enforcement even on a deployment that names no cost ceiling", () => {
    // Load-bearing: without this, a factory whose operator never set
    // RUN_MAX_COST_USD would run an unattended sweep with no cost budget
    // configured at all, and `supervisePass` would have nothing to trip on.
    // A sweep that names a budget has asked for one.
    delete env.RUN_MAX_COST_USD;
    const [policy] = declaredSweeps(DOC_EXAMPLE);
    const effective = effectiveSweepPolicy(policy!, sweepCeilings(env));
    expect(effective.budget_usd.effective).toBe(10);
    const config = runConfig(env, { max_cost_usd: effective.budget_usd.effective });
    expect(config.max_cost_usd).toBe(10);
    expect(config.cost_budget_configured).toBe(true);
  });

  it("hands the effective budget to the very clamp the Workflow enforces with", () => {
    // The load-bearing join of D14: the number this module reports is the
    // number `runConfig` puts in front of `supervisePass`. Nothing in a prompt
    // is involved, and a budget the deployment does not allow is lowered again
    // here rather than trusted.
    env.RUN_MAX_COST_USD = "12";
    const [policy] = declaredSweeps(DOC_EXAMPLE);
    const effective = effectiveSweepPolicy(policy!, sweepCeilings(env));
    const config = runConfig(env, { max_cost_usd: effective.budget_usd.effective });
    expect(config.max_cost_usd).toBe(effective.budget_usd.effective);
    expect(config.cost_budget_configured).toBe(true);
  });
});

// ------------------------------------------------------------- selection ---

function tick(over: Partial<SweepCandidate> & { id: string }): SweepCandidate {
  return {
    type: "bug",
    status: "open",
    priority: 2,
    created_at: "2026-08-01T00:00:00Z",
    labels: [],
    blocked_by: [],
    awaiting_human: false,
    requires: null,
    ...over,
  };
}

function policyFor(source = DOC_EXAMPLE) {
  const [policy] = declaredSweeps(source);
  return policy!;
}

function selectionOf(frontier: SweepCandidate[], source = DOC_EXAMPLE) {
  const policy = policyFor(source);
  return selectSweep(policy, effectiveSweepPolicy(policy, sweepCeilings(env)), frontier);
}

describe("selectSweep", () => {
  it("orders by priority, then age, then id — and by nothing else", () => {
    const frontier = [
      tick({ id: "ddd", priority: 1, created_at: "2026-08-05T00:00:00Z" }),
      tick({ id: "aaa", priority: 1, created_at: "2026-08-05T00:00:00Z" }),
      tick({ id: "bbb", priority: 1, created_at: "2026-01-01T00:00:00Z" }),
      tick({ id: "ccc", priority: 0, created_at: "2026-08-09T00:00:00Z" }),
    ];
    expect(selectionOf(frontier).selected).toEqual(["ccc", "bbb", "aaa", "ddd"]);
    expect(SWEEP_ORDER).toBe("priority asc, created_at asc, id asc");
  });

  it("gives the same answer whatever order the frontier arrived in", () => {
    const frontier = [
      tick({ id: "aaa", priority: 2, created_at: "2026-03-01T00:00:00Z" }),
      tick({ id: "bbb", priority: 1, created_at: "2026-07-01T00:00:00Z" }),
      tick({ id: "ccc", priority: 1, created_at: "2026-02-01T00:00:00Z" }),
      tick({ id: "ddd", priority: 2, created_at: "2026-03-01T00:00:00Z" }),
      tick({ id: "eee", priority: 0, created_at: "2026-09-01T00:00:00Z" }),
    ];
    const first = JSON.stringify(selectionOf(frontier));
    // Every rotation of the same set, which is the cheapest stand-in for "the
    // order GitHub served the directory in that morning".
    for (let shift = 1; shift < frontier.length; shift++) {
      const rotated = [...frontier.slice(shift), ...frontier.slice(0, shift)];
      expect(JSON.stringify(selectionOf(rotated))).toBe(first);
    }
  });

  it("has no tie the comparator cannot break", () => {
    const a = tick({ id: "aaa" });
    const b = tick({ id: "bbb" });
    expect(compareCandidates(a, b)).toBeLessThan(0);
    expect(compareCandidates(b, a)).toBeGreaterThan(0);
    expect(compareCandidates(a, { ...a })).toBe(0);
  });

  it("stops at the effective max_ticks and says which ones it stopped at", () => {
    env.SWEEP_MAX_TICKS = "2";
    const frontier = ["aaa", "bbb", "ccc", "ddd"].map((id) => tick({ id }));
    const selection = selectionOf(frontier);
    expect(selection.selected).toEqual(["aaa", "bbb"]);
    expect(selection.considered.map((c) => [c.tick_id, c.rank, c.verdict])).toEqual([
      ["aaa", 1, "selected"],
      ["bbb", 2, "selected"],
      ["ccc", 3, "over_max_ticks"],
      ["ddd", 4, "over_max_ticks"],
    ]);
    expect(selection.effective.max_ticks).toEqual({ requested: 5, effective: 2, clamped: true });
  });

  it("drops what the filter drops, one named reason per tick", () => {
    const frontier = [
      tick({ id: "keep" }),
      tick({ id: "shut", status: "closed" }),
      tick({ id: "wait", awaiting_human: true }),
      tick({ id: "kind", type: "feature" }),
      tick({ id: "prio", priority: 4 }),
      tick({ id: "blok", blocked_by: ["open"] }),
      tick({ id: "gate", requires: "approval" }),
      tick({ id: "open", status: "open", type: "chore" }),
    ];
    const selection = selectionOf(frontier);
    expect(selection.selected).toEqual(["keep"]);
    const byID = Object.fromEntries(selection.dropped.map((d) => [d.tick_id, d.verdict]));
    expect(byID).toEqual({
      shut: "closed",
      wait: "awaiting_human",
      kind: "type",
      prio: "priority",
      blok: "blocked",
      gate: "requires_gate",
      open: "type",
    });
    expect(selection.excluded).toEqual({
      closed: 1,
      awaiting_human: 1,
      type: 2,
      priority: 1,
      blocked: 1,
      requires_gate: 1,
    });
  });

  it("counts a blocker as satisfied only when the tracker says it is closed", () => {
    const closed = [tick({ id: "aaa", blocked_by: ["zzz"] }), tick({ id: "zzz", status: "closed" })];
    expect(selectionOf(closed).selected).toEqual(["aaa"]);

    const stillOpen = [tick({ id: "aaa", blocked_by: ["zzz"] }), tick({ id: "zzz" })];
    expect(selectionOf(stillOpen).selected).toEqual(["zzz"]);

    // A blocker the frontier does not contain is not evidence of anything, so
    // the dependent stays unselected rather than being assumed unblocked.
    expect(selectionOf([tick({ id: "aaa", blocked_by: ["gone"] })]).selected).toEqual([]);
  });

  it("selects nothing rather than everything when the frontier is empty", () => {
    const selection = selectionOf([]);
    expect(selection.selected).toEqual([]);
    expect(selection.frontier).toBe(0);
    expect(selection.considered).toEqual([]);
  });

  it("explains the selection from the record alone", () => {
    env.RUN_MAX_COST_USD = "6";
    env.SWEEP_MAX_TICKS = "2";
    const frontier = [
      tick({ id: "ccc", priority: 1, created_at: "2026-05-05T00:00:00Z" }),
      tick({ id: "aaa", priority: 1, created_at: "2026-01-05T00:00:00Z" }),
      tick({ id: "bbb", priority: 3 }),
    ];
    // Everything a reader needs is IN the record: the policy as declared, the
    // numbers that will actually apply, the rule, the frontier size, every
    // candidate's ordering key and rank, and the reason for every drop. Re-run
    // the stated rule over the stated keys and the stated answer comes back.
    const record = JSON.parse(JSON.stringify(selectionOf(frontier)));
    expect(record.policy).toEqual({
      name: "morning-bugs",
      cron: "0 4 * * 1-5",
      filter: "type:bug priority<=2 unblocked",
      max_ticks: 5,
      budget_usd: 10,
      tier: "economy",
      gate_on_complete: "telegram",
    });
    expect(record.order).toBe(SWEEP_ORDER);
    expect(record.frontier).toBe(3);
    expect(record.effective.budget_usd).toEqual({ requested: 10, effective: 6, clamped: true });

    const reordered = [...record.considered].sort(
      (a: { priority: number; created_at: string; tick_id: string }, b: typeof a) =>
        a.priority - b.priority ||
        (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) ||
        (a.tick_id < b.tick_id ? -1 : 1)
    );
    expect(reordered.map((c: { tick_id: string }) => c.tick_id)).toEqual(
      record.considered.map((c: { tick_id: string }) => c.tick_id)
    );
    expect(reordered.slice(0, record.effective.max_ticks.effective).map((c: { tick_id: string }) => c.tick_id)).toEqual(
      record.selected
    );
    expect(record.dropped).toEqual([
      { tick_id: "bbb", priority: 3, created_at: "2026-08-01T00:00:00Z", verdict: "priority", rank: null },
    ]);
  });
});
