import { describe, expect, it } from "vitest";

import contract from "../../../contracts/job-protocol.json";
import credentialOwnership from "../../../contracts/credential-ownership.json";
import collectVocabulary from "../../../contracts/collect-vocabulary.json";
import { parseDefs, parseSchema, validate, type Defs, type Schema } from "./json-schema";

/**
 * The TypeScript reader for `contracts/job-protocol.json` — the record schemas
 * for ticfac's four-operation executor protocol (SPEC §4.3), the role-result
 * envelope (§4.4) and the evidence record (§10.1).
 *
 * Its Go twin is `internal/factory/jobprotocol/contract_test.go`, and unlike
 * the tk --json manifest — where the Go side can run a real binary and this
 * side cannot — the two halves here assert the SAME things on purpose. There
 * is no executor to run yet: Phase 0 step 3 freezes these schemas *before*
 * code moves, so what needs proving is not behaviour but that two independent
 * validators agree about which documents this contract admits. A schema that
 * has only ever been read by one implementation has not been shown to mean
 * anything.
 *
 * That is why `expect_error_contains` in the fixture is pinned to exact
 * refusal text, and why `./json-schema.ts` mirrors Go's message strings
 * character for character. "Something failed" is also satisfied by a validator
 * that has quietly stopped checking the thing the case was written about.
 */

/** The seven records, and the schema_id each one publishes. */
const SCHEMA_IDS: Record<string, string> = {
  job_spec: "ticfac.job-spec.v1",
  job_handle: "ticfac.job-handle.v1",
  job_status: "ticfac.job-status.v1",
  cancel_ack: "ticfac.cancel-ack.v1",
  job_result: "ticfac.job-result.v1",
  role_result: "ticfac.role-result.v1",
  evidence: "ticfac.evidence.v1",
};

/** The one golden example that is SPEC §4.3's printed JobSpec byte for byte. */
const ILLUSTRATION_SOURCE = "SPEC §4.3 — the illustrative JobSpec";

type RecordEntry = { schema_id: string; description: string; schema: unknown };

const records = contract.records as unknown as Record<string, RecordEntry>;
const defs: Defs = parseDefs((contract as { $defs: unknown }).$defs);
const schemas: Record<string, Schema> = Object.fromEntries(
  Object.entries(records).map(([name, entry]) => [name, parseSchema(entry.schema, name)]),
);

/** Resolve a record's schema (each is a `$ref` into `$defs`). */
function resolved(name: string): Schema {
  const schema = schemas[name];
  if (!schema?.$ref) return schema;
  const target = defs[schema.$ref.slice("#/$defs/".length)];
  expect(target, `record ${name}: unresolvable ${schema.$ref}`).toBeDefined();
  return target;
}

function def(name: string): Schema {
  const found = defs[name];
  expect(found, `$defs.${name} is missing`).toBeDefined();
  return found;
}

describe("the job protocol contract is what a consumer can pin", () => {
  it("declares its version and name", () => {
    expect(contract.schema_version).toBe(1);
    expect(contract.contract).toBe("ticfac.job-protocol");
  });

  it("states the versioning rule that lets the records be closed", () => {
    // Without it, `additionalProperties: false` would make every added field a
    // silent break instead of a version bump — the opposite of what closing
    // the records is for.
    expect(contract.versioning.rule).toBeTruthy();
    expect(contract.versioning.adding_a_field).toBeTruthy();
    expect(contract.versioning.records_are_closed).toBeTruthy();
  });

  it("publishes exactly the seven records, with their schema ids", () => {
    expect(Object.keys(records).sort()).toEqual(Object.keys(SCHEMA_IDS).sort());
    for (const [name, schemaId] of Object.entries(SCHEMA_IDS)) {
      expect(records[name].schema_id, `record ${name}`).toBe(schemaId);
      expect(records[name].description, `record ${name}: description`).toBeTruthy();
    }
  });

  it("wires the four operations to the right records", () => {
    // WorkerProvider, Worker, Workspace and AgentRunner collapse into exactly
    // these four (SPEC §4.3). A fifth operation, or one wired to the wrong
    // record, is a different protocol wearing this one's name.
    const want = [
      { operation: "start", input: "job_spec", output: "job_handle" },
      { operation: "inspect", input: "job_handle", output: "job_status" },
      { operation: "cancel", input: "job_handle", output: "cancel_ack" },
      { operation: "collect", input: "job_handle", output: "job_result" },
    ];

    expect(contract.operations).toHaveLength(want.length);
    contract.operations.forEach((got, i) => {
      expect(got.operation).toBe(want[i].operation);
      expect(got.input).toBe(want[i].input);
      expect(got.output).toBe(want[i].output);
      // The protocol has to work as Unix-style JSON commands, not only as a
      // library, so the argv form is part of the contract.
      expect(got.argv).toBe(`ticfac-exec-<name> ${want[i].operation}`);
      expect(got.rule).toBeTruthy();
      expect(records[got.input], `${got.operation}: input`).toBeDefined();
      expect(records[got.output], `${got.operation}: output`).toBeDefined();
    });
  });

  it("has no dangling $ref", () => {
    const refs: string[] = [];
    const collect = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const item of node) collect(item);
        return;
      }
      if (node === null || typeof node !== "object") return;
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key === "$ref" && typeof value === "string") refs.push(value);
        else collect(value);
      }
    };
    collect(contract.records);
    collect((contract as { $defs: unknown }).$defs);

    expect(refs.length, "the contract uses no $ref at all — have the $defs been inlined away?").toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref, `${ref} is not a local #/$defs/<name> reference`).toMatch(/^#\/\$defs\/[A-Za-z0-9_]+$/);
      expect(Object.hasOwn(defs, ref.slice("#/$defs/".length)), `${ref} points at a $def that does not exist`).toBe(
        true,
      );
    }
  });
});

describe("the golden examples validate", () => {
  const golden = contract.examples.golden as ReadonlyArray<{
    name: string;
    record: string;
    source: string;
    document: unknown;
  }>;

  it("ships golden documents", () => {
    expect(golden.length).toBeGreaterThan(0);
  });

  it("gives every record at least one", () => {
    // A schema no document has ever been checked against is a schema nobody
    // has read carefully.
    const covered = new Set(golden.map((example) => example.record));
    for (const name of Object.keys(SCHEMA_IDS)) {
      expect(covered.has(name), `record ${name} has no golden example`).toBe(true);
    }
  });

  for (const example of golden) {
    it(`accepts: ${example.name}`, () => {
      expect(schemas[example.record], `unknown record ${example.record}`).toBeDefined();
      expect(example.source, "a golden example must say where it comes from").toBeTruthy();
      expect(validate(schemas[example.record], defs, example.document)).toEqual([]);
    });
  }

  it("carries SPEC §4.3's illustration verbatim", () => {
    // The join between the design document and the bundle. This JobSpec is
    // what a reader copies first; if it stops validating, either the schema or
    // the SPEC is wrong and somebody has to say which.
    const illustration = golden.find(
      (example) => example.record === "job_spec" && example.source.startsWith(ILLUSTRATION_SOURCE),
    );
    expect(illustration, "no golden example is sourced from SPEC §4.3 — the illustration is unchecked").toBeDefined();

    const document = illustration!.document as Record<string, unknown>;
    expect(validate(schemas.job_spec, defs, document)).toEqual([]);
    expect(document.credentials).toEqual({ model: "issued-by-host", source: "read-only" });
  });
});

describe("the negative examples are refused", () => {
  const negative = contract.examples.negative as ReadonlyArray<{
    name: string;
    record: string;
    why: string;
    expect_error_contains: string;
    document: unknown;
  }>;

  it("ships negative documents", () => {
    // The half that matters more: a validator nobody has watched refuse
    // anything is not known to refuse anything.
    expect(negative.length).toBeGreaterThan(0);
  });

  for (const example of negative) {
    it(`refuses: ${example.name}`, () => {
      expect(schemas[example.record], `unknown record ${example.record}`).toBeDefined();
      expect(example.why, "a negative example must say what it is testing").toBeTruthy();
      expect(example.expect_error_contains, "a negative example must pin the refusal it expects").toBeTruthy();

      const errors = validate(schemas[example.record], defs, example.document);
      expect(errors.length, `${example.name} VALIDATED — the schema does not refuse it`).toBeGreaterThan(0);
      expect(
        errors.join("\n"),
        `${example.name}: no error contains ${JSON.stringify(example.expect_error_contains)}`,
      ).toContain(example.expect_error_contains);
    });
  }
});

describe("the credential grant is part of the protocol", () => {
  it("requires both halves on every JobSpec", () => {
    // SPEC §4.3: credentials are part of the protocol, not an adapter detail.
    // A spec that names no source grade is not "unrestricted" — it is a job
    // nobody can afterwards say what it was allowed to touch.
    const spec = resolved("job_spec");
    expect(spec.required).toContain("credentials");

    const credentials = def("credentials");
    expect(credentials.required).toEqual(expect.arrayContaining(["model", "source"]));
  });

  it("keeps the source grade a closed vocabulary", () => {
    expect(def("source_grade").enum).toEqual(["read-only", "write"]);
  });

  it("spells cost the way credential-ownership.json spells it", () => {
    // THE CROSS-CONTRACT CHECK. The metered/flat-rate split already exists in
    // credential-ownership.json. Two spellings of one rule is exactly the
    // drift contracts/ exists to catch, and it would be invisible: each file
    // is internally consistent with itself.
    const cost = credentialOwnership.lifecycle.cost;

    const metered = def("metered_cost");
    expect(metered.properties?.budget_field.enum).toEqual([cost.metered.budget_field]);
    expect(metered.properties?.telemetry.enum).toEqual([cost.metered.telemetry]);

    // "A flat-rate credential has no per-request cost to bound AND SAYS SO."
    // Saying so is what makes it checkable: budget_field is required and typed
    // null, so a flat-rate grant carrying a budget is refused outright rather
    // than half-enforced.
    const flat = def("flat_rate_cost");
    expect(flat.required).toContain("budget_field");
    expect(flat.properties?.budget_field.type).toEqual(["null"]);
    expect(flat.properties?.quota_failure.enum).toEqual([cost.flat_rate_seat.quota_failure]);

    // Quota exhaustion is its own failure class and is never reported as a
    // broken route, so JobResult needs a slot for it.
    expect(def("failure_class").enum).toContain(cost.flat_rate_seat.quota_failure);
  });

  it("states the same stop rules as credential-ownership.json", () => {
    const stop = credentialOwnership.lifecycle.stop;
    const revocation = contract.credentials.revocation;

    expect(revocation.revoke_before_stop).toBe(stop.revoke_before_stop);
    expect(revocation.refuse_issue_before_every_boot).toBe(stop.refuse_issue_before_every_boot);
    expect(revocation.cancelled_handle_cannot_reissue).toBe(stop.cancelled_handle_cannot_reissue);
    expect(contract.credentials.owned_by).toBe("contracts/credential-ownership.json");
  });

  it("makes cancel's revocation something a document can fail", () => {
    // `cancel` MUST revoke credentials BEFORE requesting a stop, and a
    // cancelled handle can never obtain a fresh one. Both are encoded as
    // one-value enums, because a validator can refuse a wrong value and cannot
    // refuse a wrong clock.
    const ack = resolved("cancel_ack");
    expect(ack.required).toEqual(expect.arrayContaining(["credentials_revoked", "order", "reissue"]));
    expect(ack.properties?.credentials_revoked.enum).toEqual([true]);
    expect(ack.properties?.order.enum).toEqual(["revoke-then-stop"]);
    expect(ack.properties?.reissue.enum).toEqual(["refused"]);
  });
});

describe("the role result stays on the vocabulary this repository already has", () => {
  it("uses collect-vocabulary.json's four statuses, exactly", () => {
    // A fifth spelling of "done" makes a cloud run and a herd run disagree
    // about what happened to the same tick with nothing failing — the bug
    // collect-vocabulary.json was written to stop.
    const want = Object.entries(collectVocabulary.statuses)
      .filter(([key]) => key !== "why")
      .map(([, value]) => value as string)
      .sort();

    const status = def("report_status");
    expect([...(status.enum as string[])].sort()).toEqual(want);
    expect(resolved("role_result").properties?.status.$ref).toBe("#/$defs/report_status");
  });
});

describe("the evidence record carries SPEC §10.1's minimum", () => {
  it("requires every field, including the ones that are often empty", () => {
    // A record that omits `integration_ref` and one that states it as null are
    // different claims, and only the second is evidence.
    const minimal = [
      "schema_version",
      "run_id",
      "tick_id",
      "attempt",
      "source_ref",
      "source_sha",
      "integration_ref",
      "phase",
      "executor",
      "workspace_id",
      "backend",
      "role",
      "profile_digest",
      "model",
      "context_manifest_digest",
      "check",
      "started_at",
      "finished_at",
      "exit_code",
      "output",
      "result",
      "acceptance",
      "content_digest",
      "persistence_uri",
    ];
    expect(resolved("evidence").required).toEqual(expect.arrayContaining(minimal));
  });

  it("says terminal output is not the completion contract", () => {
    // SPEC §10.1, and the rule cloud/factory/src/worker-collect.ts already
    // enforces: durable git refs and RESULT-<tick-id>.md reports drive
    // collection. The rule survives the move only if the file states it.
    const rule = contract.rules.completion_contract;
    expect(rule.drives_collection.length).toBeGreaterThan(0);
    expect(rule.never_drives_collection).toContain("terminal output");
    expect(rule.why).toBeTruthy();
  });

  it("says when a workspace may be disposed", () => {
    expect(contract.rules.disposal.allowed_only_after.length).toBeGreaterThan(0);
    expect(contract.rules.disposal.why).toBeTruthy();
  });
});

describe("the validator both readers share actually refuses things", () => {
  // The negative control for the negative controls. Every assertion above
  // rests on `./json-schema.ts` being strict; a validator that silently
  // ignored a keyword would make every golden example pass and every negative
  // example depend on luck.
  it("refuses a keyword it cannot enforce", () => {
    expect(() => parseSchema({ type: "string", minLength: 3 })).toThrow(/unsupported keyword "minLength"/);
  });

  it("refuses a type it does not know", () => {
    expect(() => parseSchema({ type: "date" })).toThrow(/unknown type "date"/);
  });

  it("refuses a remote $ref", () => {
    expect(() => parseSchema({ $ref: "https://example.invalid/schema.json" })).toThrow(/only #\/\$defs\//);
  });
});
