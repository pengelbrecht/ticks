import { describe, expect, it } from "vitest";

import contract from "../../../contracts/run-event-feed.json";
import runState from "../../../contracts/ticfac-run-state.json";

import { parseSchema, validate, type Schema } from "./json-schema";

/**
 * The TypeScript reader for `contracts/run-event-feed.json` — the run event
 * feed, the one thing a NON-PARTICIPANT can subscribe to.
 *
 * It is a deliberately small reader, and the smallness is the statement: this
 * host is a SUBSCRIBER, never the writer and never the authority. The durable
 * truth of a tick is the evidence on the integration branch; the feed is a
 * local append-only hint about when to look, and this side pins exactly the
 * three things a subscriber can be harmed by getting wrong:
 *
 *   - the LINE SHAPE — closed, with run/tick/attempt identity on every line,
 *     so a dashboard that sorts by attempt never meets a string in one of them;
 *   - the HINT RULE — the contract must SAY that a line means "worth looking
 *     now, never the work is finished", because a feed a dashboard mistakes
 *     for a verdict is one more hand-rolled watcher waiting to be wrong;
 *   - the CROSS-FILE CLAIM — the feed's path is exhaust under the `.ticfac/logs/`
 *     entry `ticfac-run-state.json` already carries, which is why this
 *     contract adds a path without touching that contract's layout.
 *
 * The `expect_error_contains` strings are pinned once and mean the same to the
 * Go reader (`internal/contracts/parity/run_event_feed_test.go`), because the
 * two validators refuse with identical text — see `./json-schema.ts`.
 */

const feedSchema = parseSchema(
  contract.records.feed_event.schema,
  "run-event-feed records.feed_event.schema",
);

const golden = contract.golden as Record<string, unknown>;
const invalid = contract.invalid as Array<{
  record: string;
  why: string;
  expect_error_contains: string;
  document: unknown;
}>;

/** Every golden document is a line of the ONE line schema this contract has. */
function lineSchema(): { schema: Schema; schemaId: string } {
  expect(contract.records.feed_event.schema_id).toBe("ticfac.run_event.v1");
  return { schema: feedSchema, schemaId: contract.records.feed_event.schema_id };
}

describe("the run event feed identifies itself", () => {
  it("is the contract this reader was written against", () => {
    expect(contract.schema_version).toBe(1);
    expect(contract.contract).toBe("ticfac.run_event_feed");
    expect(contract.spec_sections).toContain("10.4");
  });

  it("is exhaust, not a record", () => {
    // The one thing a subscriber must not mistake: this is not durable state.
    expect(contract.layout.committed).toBe(false);
    expect(contract.boundary.only_writer).toBe("the reconciler");
    expect(contract.boundary.workers_write).toBe(false);
    expect(contract.boundary.is_authority).toBe(false);
  });

  it("says the hint rule, in the words a dashboard must not soften", () => {
    expect(String(contract.subscribe.a_line_means)).toContain("worth looking now");
    expect(String(contract.subscribe.a_line_means)).toContain("never");
    expect(String(contract.subscribe.completion_is_decided_by)).toContain("durable evidence");
  });
});

describe("the feed's path is the run-state contract's exhaust", () => {
  it("sits under the .ticfac/logs/ entry ticfac-run-state.json already carries", () => {
    const entries = (runState.layout as { entries: Array<{ path: string; committed: boolean }> }).entries;
    const logs = entries.find((e) => e.path === ".ticfac/logs/");
    expect(logs, "ticfac-run-state.json layout declares .ticfac/logs/").toBeDefined();
    expect(logs!.committed).toBe(false);
    expect(contract.layout.path.startsWith(".ticfac/logs/")).toBe(true);
    expect(contract.layout.path).toContain("<run-id>");
  });
});

describe("the line schema admits its golden documents and refuses the negative ones", () => {
  it("validates every golden line, dispatch-scoped and run-level", () => {
    const { schema } = lineSchema();
    expect(Object.keys(golden).sort()).toEqual(["feed_event", "feed_event_run_level"]);
    for (const [name, document] of Object.entries(golden)) {
      expect(validate(schema, {}, document), `golden.${name}`).toEqual([]);
    }
  });

  it("carries identity on every golden line, null where a claim is genuinely absent", () => {
    const dispatchLine = golden.feed_event as Record<string, unknown>;
    expect(typeof dispatchLine.run_id).toBe("string");
    expect(dispatchLine.tick_id).toBe("u9l");
    expect(dispatchLine.attempt).toBe(1);

    const runLevel = golden.feed_event_run_level as Record<string, unknown>;
    expect(runLevel.tick_id).toBeNull();
    expect(runLevel.attempt).toBeNull();
  });

  it("requires tick_id and attempt rather than letting them be omitted", () => {
    const { schema } = lineSchema();
    const required = (contract.records.feed_event.schema as { required: string[] }).required;
    expect(required).toContain("tick_id");
    expect(required).toContain("attempt");
    expect(required).toContain("run_id");
    const { tick_id: _omitted, ...withoutTick } = golden.feed_event as Record<string, unknown>;
    expect(validate(schema, {}, withoutTick)).toContainEqual('$: missing required property "tick_id"');
  });

  it("refuses every negative document with the pinned refusal", () => {
    const { schema } = lineSchema();
    expect(invalid.length).toBeGreaterThan(0);
    for (const bad of invalid) {
      const errors = validate(schema, {}, bad.document);
      expect(
        errors.some((e) => e.includes(bad.expect_error_contains)),
        `${bad.why}: expected ${bad.expect_error_contains}, got ${JSON.stringify(errors)}`,
      ).toBe(true);
    }
  });
});
