import { describe, expect, it } from "vitest";

import jobProtocol from "../../../contracts/job-protocol.json";
import runState from "../../../contracts/ticfac-run-state.json";
import { parseDefs, parseSchema, validate, type Defs, type Schema } from "./json-schema";

/**
 * THE TEST THAT WOULD HAVE CAUGHT IT.
 *
 * Bundle 1.2.0 described one file — `.ticfac/runs/<run-id>/evidence/<key>.json`
 * — with two incompatible shapes. `job-protocol.json`'s `records.evidence` was
 * flat and closed: fifteen provenance fields as required top-level properties,
 * `additionalProperties: false`. `ticfac-run-state.json`'s `evidence_envelope`
 * required a nested `provenance` object and a `key`, and was open past them. No
 * document could satisfy both — the run-state golden evidence example produced
 * 22 violations against `records.evidence` — and BOTH SUITES WERE GREEN,
 * because each validated its own examples against its own schema.
 *
 * The bug was not in either file. It was in the absence of this file: nothing
 * in the bundle ever put one contract's document in front of the other
 * contract's rule. Its Go twins are
 * `internal/factory/jobprotocol/evidence_cross_contract_test.go` and
 * `internal/factory/runstate/evidence_cross_contract_test.go`.
 */

const EVIDENCE_SCHEMA_ID = "ticfac.evidence.v1";

type RecordEntry = { schema_id: string; description: string; schema: unknown };
type GoldenExample = { name: string; record: string; document: Record<string, unknown> };
type InvalidExample = { record: string; why: string; document: unknown };

const records = jobProtocol.records as unknown as Record<string, RecordEntry>;
const defs: Defs = parseDefs((jobProtocol as { $defs: unknown }).$defs);
const evidence: Schema = parseSchema(records.evidence.schema, "records.evidence");

/** `records.evidence` is a `$ref` into `$defs`; this is what it points at. */
const evidenceDef: Schema = evidence.$ref ? defs[evidence.$ref.slice("#/$defs/".length)] : evidence;

const reference = runState.references.evidence as {
  record: string;
  schema_id: string;
  contract: string;
  file: string;
  pointer: string;
};

describe("the evidence record is defined once and pointed at from the other side", () => {
  it("is published here", () => {
    expect(records.evidence.schema_id).toBe(EVIDENCE_SCHEMA_ID);
  });

  it("is referenced, not redefined, by the contract that places the file", () => {
    expect(reference.schema_id).toBe(EVIDENCE_SCHEMA_ID);
    expect(reference.contract).toBe(jobProtocol.contract);
    expect(reference.file).toBe("job-protocol.json");
    expect(reference.pointer).toBe("#/records/evidence");

    // And there is nothing beside the pointer to drift from.
    for (const name of Object.keys(runState.schemas)) {
      expect(name, "ticfac-run-state.json still defines an evidence schema").not.toContain("evidence");
    }
  });

  it("resolves through the pointer to this record", () => {
    const target = (records as Record<string, RecordEntry>)[reference.pointer.replace("#/records/", "")];
    expect(target, `${reference.pointer} resolves to nothing`).toBeDefined();
    expect(target.schema_id).toBe(reference.schema_id);
  });
});

describe("each contract's golden evidence example validates against the other's rule", () => {
  it("run-state's golden evidence validates against records.evidence", () => {
    const document = runState.golden.evidence as unknown;
    expect(document, "ticfac-run-state.json ships no golden evidence example").toBeDefined();
    expect(validate(evidence, defs, document as never)).toEqual([]);
  });

  it("run-state's invalid evidence documents are refused by records.evidence", () => {
    const bad = (runState.invalid as unknown as InvalidExample[]).filter((x) => x.record === "evidence");
    expect(bad.length, "no cross-file refusal is proven").toBeGreaterThan(0);
    for (const example of bad) {
      expect(
        validate(evidence, defs, example.document as never).length,
        `invalid (${example.why}) VALIDATES — the refusal the other contract claims is not one this schema makes`,
      ).toBeGreaterThan(0);
    }
  });

  it("job-protocol's golden evidence documents satisfy the run-state envelope", () => {
    // SPEC §10.4: every committed .ticfac/ file carries a schema_version and
    // the provenance fields of an evidence record. An evidence record IS a
    // committed file, so the envelope is a rule about these documents.
    const golden = (jobProtocol.examples.golden as unknown as GoldenExample[]).filter(
      (example) => example.record === "evidence",
    );
    expect(golden.length, "no golden evidence example crosses the seam").toBeGreaterThan(0);

    for (const example of golden) {
      for (const field of runState.envelope.required_on_every_committed_record) {
        expect(Object.hasOwn(example.document, field), `${example.name} does not carry ${field}`).toBe(true);
      }

      // `<key>` in the path is the record's own key, so it has to be usable as
      // a filename: one segment, not a path.
      const key = example.document.key;
      expect(typeof key, `${example.name}: key`).toBe("string");
      expect(key as string).not.toMatch(/[/\\]/);
      expect((key as string).startsWith("."), `${example.name}: key is a dotfile`).toBe(false);
    }
  });
});

describe("the shared provenance object is one shape, not two compatible ones", () => {
  it("is copied field for field into the contract that references it", () => {
    for (const name of ["provenance", "phase", "executor", "role"]) {
      const here = (jobProtocol as { $defs: Record<string, unknown> }).$defs[name];
      const there = (runState as { $defs: Record<string, unknown> }).$defs[name];
      expect(here, `job-protocol.json $defs.${name}`).toBeDefined();
      expect(there, `ticfac-run-state.json $defs.${name} — it references this definition`).toBeDefined();
      expect(there, `$defs.${name} differs between the two contracts`).toEqual(here);
    }
  });

  it("is what every committed run-state record carries", () => {
    for (const [name, schema] of Object.entries(runState.schemas as Record<string, { properties?: Record<string, { $ref?: string }> }>)) {
      expect(schema.properties?.provenance?.$ref, `schemas.${name}`).toBe("#/$defs/provenance");
    }
    expect(evidenceDef.properties?.provenance?.$ref).toBe("#/$defs/provenance");
  });
});
