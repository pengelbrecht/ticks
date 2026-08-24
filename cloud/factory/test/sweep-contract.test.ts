import { describe, expect, it } from "vitest";

import contract from "./fixtures/sweep-selection-contract.json";
import parityCases from "./fixtures/sweep-policy-cases.json";
import {
  CLOSED_STATUS,
  SWEEP_GATES,
  SWEEP_ORDER,
  SWEEP_TIERS,
  declaredSweeps,
  effectiveSweepPolicy,
  parseSweepCandidate,
  selectSweep,
  type SweepCandidate,
} from "../src/sweeps";

/**
 * The TypeScript half of the sweep's cross-language contract (tick hye).
 *
 * `internal/tick/sweep_selection_parity_test.go` holds the other half. The
 * fixture exists because of the direction this reader fails in: it is
 * deliberately tolerant, so a field renamed in Go would not make a sweep throw
 * — it would make one select from keys that are no longer there, every weekday
 * morning, with both suites green (`.tick/learnings.md`, "Cross-language
 * parity").
 */

const FIELDS = contract.fields;

/** A tick record written the way Go writes one, from the fixture's field names. */
function goRecord(values: Record<string, unknown>): string {
  return JSON.stringify(values);
}

describe("sweep selection contract", () => {
  it("reads every field the fixture names off a record spelled that way", () => {
    const candidate = parseSweepCandidate(
      goRecord({
        [FIELDS.id]: "swp",
        [FIELDS.type]: "bug",
        [FIELDS.status]: "open",
        [FIELDS.priority]: 1,
        [FIELDS.created_at]: "2026-08-01T00:00:00Z",
        [FIELDS.labels]: ["sweep"],
        [FIELDS.blocked_by]: ["aaa"],
        [FIELDS.requires]: "approval",
      })
    );
    expect(candidate).toEqual({
      id: "swp",
      type: "bug",
      status: "open",
      priority: 1,
      created_at: "2026-08-01T00:00:00Z",
      labels: ["sweep"],
      blocked_by: ["aaa"],
      awaiting_human: false,
      requires: "approval",
    });
  });

  it("honours both spellings of a tick a person is holding", () => {
    for (const field of contract.awaiting_human.fields) {
      const value = field === FIELDS.manual ? true : "input";
      const candidate = parseSweepCandidate(goRecord({ [FIELDS.id]: "swp", [field]: value }));
      expect(candidate!.awaiting_human, field).toBe(
        field === FIELDS.manual ? contract.awaiting_human.manual_true_means_awaiting : true
      );
    }
    // Both are omitempty in Go, so absent is the common case and must read as
    // "not awaiting" rather than as unreadable.
    expect(parseSweepCandidate(goRecord({ [FIELDS.id]: "swp" }))!.awaiting_human).toBe(false);
  });

  it("closes on the value the fixture says closes", () => {
    expect(CLOSED_STATUS).toBe(contract.closed_status);
  });

  it("orders by the rule the fixture states, which is not the wave's", () => {
    expect(SWEEP_ORDER).toBe(contract.order.rule);
    expect(contract.order.rule).not.toBe(contract.order.wave_compute_rule);

    // And the age term really is oldest-first, which is the half of the rule
    // wave.Compute does not have.
    const source = `
[sweeps.parity]
cron = "0 4 * * *"
filter = "type:bug"
max_ticks = 5
budget_usd = 1
`;
    const [policy] = declaredSweeps(source);
    const base: Omit<SweepCandidate, "id" | "created_at"> = {
      type: "bug",
      status: "open",
      priority: 1,
      labels: [],
      blocked_by: [],
      awaiting_human: false,
      requires: null,
    };
    const selection = selectSweep(
      policy!,
      effectiveSweepPolicy(policy!, { max_ticks: 5, budget_usd: 1, tier: "economy" }),
      [
        { ...base, id: "aaa", created_at: "2026-08-01T00:00:00Z" },
        { ...base, id: "bbb", created_at: "2020-01-01T00:00:00Z" },
      ]
    );
    expect(contract.order.age_is_oldest_first).toBe(true);
    expect(selection.selected).toEqual(["bbb", "aaa"]);
  });

  it("accepts exactly the declaration surface the fixture names", () => {
    expect(SWEEP_TIERS).toEqual(contract.declaration.tiers);
    expect(SWEEP_GATES).toEqual(contract.declaration.gates);

    const example = contract.declaration.example as Record<string, unknown>;
    const lines = Object.entries(example).map(([key, value]) =>
      typeof value === "string" ? `${key} = ${JSON.stringify(value)}` : `${key} = ${value}`
    );
    const [policy] = declaredSweeps(`[${contract.declaration.table}.parity]\n${lines.join("\n")}\n`);
    expect(policy!.name).toBe("parity");
    expect(policy!.cron).toBe(example.cron);
    expect(policy!.max_ticks).toBe(example.max_ticks);

    // Every key the fixture names is one the parser knows, and every required
    // key really is required.
    for (const required of contract.declaration.required_keys) {
      const without = lines.filter((line) => !line.startsWith(`${required} `));
      expect(
        () => declaredSweeps(`[${contract.declaration.table}.parity]\n${without.join("\n")}\n`),
        required
      ).toThrow(new RegExp(`${required} is required`));
    }
  });

  it("refuses a key the fixture does not name", () => {
    expect(() =>
      declaredSweeps(
        `[${contract.declaration.table}.parity]\ncron = "0 4 * * *"\nfilter = "type:bug"\n` +
          "max_ticks = 1\nbudget_usd = 1\nnot_a_key = 1\n"
      )
    ).toThrow(/not a key this reader knows/);
    expect(contract.declaration.keys).not.toContain("not_a_key");
  });
});

/**
 * The shared parity cases (`test/fixtures/sweep-policy-cases.json`), run
 * against this reader.
 *
 * `internal/herd/config/sweep_parity_test.go` runs the same file against the
 * one that validates a policy at author time. Two readers of one format is the
 * shape of the bug this repository has already paid for; the direction that
 * matters is `refused`, because a reader that ACCEPTS a policy the other
 * refuses is a sweep running unattended on numbers nobody checked.
 */
describe("sweep policy parity with the tk reader", () => {
  it("has cases at all", () => {
    expect(parityCases.cases.length).toBeGreaterThan(0);
  });

  for (const testCase of parityCases.cases) {
    it(testCase.name, () => {
      if (testCase.refused === true) {
        expect(() => declaredSweeps(testCase.toml), testCase.why).toThrow();
        return;
      }
      const declared = declaredSweeps(testCase.toml);
      expect(declared.map((policy) => policy.name), testCase.why).toEqual(testCase.sweeps ?? []);
    });
  }
});
