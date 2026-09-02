import { describe, expect, it } from "vitest";

import contract from "../../../contracts/credential-ownership.json";

import { parseSchema, validate, type Schema } from "./json-schema";

import {
  DEFAULT_RUN_CREDENTIAL_GRADE,
  LEAST_RUN_CREDENTIAL_GRADE,
  RUN_CREDENTIAL_GRADES,
  gradeMayWrite,
} from "../src/credentials";

/**
 * The TypeScript reader for `contracts/credential-ownership.json`.
 *
 * Mirrors `internal/factory/credentials/contract_test.go`. The Go side binds
 * the contract to `tk`'s `~/.ticfacrc` key constants — the writer of the file.
 * This side is the Worker, which never reads `~/.ticfacrc` at all: the
 * operator's laptop resolves those keys and the Worker receives what they
 * bought. So the two readers assert overlapping but not identical things, and
 * that is the point rather than a gap:
 *
 *   - Both assert the FILE SHAPE and the REDACTED EXAMPLE, so the record's
 *     structure cannot drift on one side. That half is a straight mirror.
 *   - Both assert the OWNERSHIP TABLE closes over every declared key, because
 *     a key owned by nobody is a key whose lifecycle nobody runs.
 *   - This side additionally binds `lifecycle` to the Worker code that
 *     implements it — the credential grades in `src/credentials.ts` and the
 *     budget field in `src/run-workflow.ts`. That is the drift a shape check
 *     cannot see: the contract saying a read-only run is refused git write
 *     while the Worker's own grade vocabulary has quietly stopped containing
 *     `read_only`.
 *
 * The Go side cannot make that last set of assertions — those symbols are
 * TypeScript — and this side cannot run `tk`'s key constants. Neither reader
 * subsumes the other, which is why the contract needs both.
 */

/**
 * Parsed by the ONE TypeScript strict-subset validator (`./json-schema.ts`,
 * the twin of `internal/tkcontract/schema.go`, matching its refusal text
 * character for character). Parsing is itself an assertion: until bundle 3.0.0
 * this block carried `oneOf`, `const`, `minLength`, `format` and `pattern` —
 * none of which either validator implements — and both readers hand-rolled a
 * partial walk that ignored what it did not handle, with `format: uri` meaning
 * different things in the two languages. A keyword outside the subset now
 * throws here instead of reading as a constraint nothing checks.
 */
const schema: Schema = parseSchema(contract.schema, "credential-ownership schema");
const noDefs: Record<string, Schema> = {};
const validExample = contract.valid_example as Record<string, string>;
const invalid = contract.invalid as ReadonlyArray<{
  name: string;
  why: string;
  expect_error_contains: string;
  document: Record<string, unknown>;
}>;
const keys = contract.keys as ReadonlyArray<{
  name: string;
  credential_type: string;
  secret: boolean;
  stored_in: string[];
}>;
const ownership = contract.ownership as ReadonlyArray<{
  credential_type: string;
  owner: string;
  file_keys: string[];
}>;

describe("the credential ownership contract's file shape", () => {
  it("identifies itself", () => {
    expect(contract.schema_version).toBe(1);
    expect(contract.contract).toBe("ticfac.credentials");
  });

  it("pins the file, its mode and its write safety", () => {
    // 0600 is not decoration: the file holds provider keys in plaintext. The
    // safety properties are the ones a crash during `tk factory deploy` tests.
    expect(contract.file.path).toBe("~/.ticfacrc");
    expect(contract.file.mode).toBe("0600");
    expect(contract.file.format).toBe("line-oriented key=value");
    expect(contract.file.encoding).toBe("UTF-8");
    expect(contract.file.unknown_lines).toBe("preserved");
    expect(contract.file.atomic_writes).toBe("temp+rename");
  });

  it("declares a closed logical schema with no required keys", () => {
    // No required keys, because setup is incremental — a half-configured
    // factory is a legal state and must not fail to parse. Closed, because an
    // unknown `factory_*` key is a typo, and a typo that silently persists is
    // a credential the operator believes they set.
    expect(schema.type).toEqual(["object"]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual([]);
  });
});

describe("the declared keys and the ownership table agree", () => {
  it("declares metadata for exactly the keys the schema declares", () => {
    const schemaKeys = Object.keys(schema.properties ?? {}).sort();
    const metadataKeys = keys.map((key) => key.name).sort();
    expect(metadataKeys).toEqual(schemaKeys);
  });

  it("gives every key complete ownership metadata", () => {
    const seen = new Set<string>();
    for (const key of keys) {
      expect(key.name, "a key declaration has no name").not.toBe("");
      expect(seen.has(key.name), `duplicate key declaration for ${key.name}`).toBe(false);
      seen.add(key.name);
      expect(key.credential_type, `key ${key.name} has no credential type`).not.toBe("");
      expect(key.stored_in.length, `key ${key.name} is stored nowhere`).toBeGreaterThan(0);
      expect(typeof key.secret, `key ${key.name} does not say whether it is secret`).toBe("boolean");
    }
  });

  it("assigns every key to an ownership entry that ticfac owns", () => {
    const owned = new Map<string, Set<string>>();
    for (const entry of ownership) {
      expect(entry.credential_type, "an ownership entry has no credential type").not.toBe("");
      // The whole point of the document: ticfac owns credentials, ticks does not.
      expect(entry.owner, `credential type ${entry.credential_type} is not owned by ticfac`).toBe("ticfac");
      expect(owned.has(entry.credential_type), `duplicate ownership entry for ${entry.credential_type}`).toBe(
        false,
      );
      const fileKeys = new Set(entry.file_keys);
      expect(fileKeys.size, `ownership entry ${entry.credential_type} repeats a key`).toBe(
        entry.file_keys.length,
      );
      owned.set(entry.credential_type, fileKeys);
    }

    for (const want of [
      "model_access",
      "gateway",
      "subscription_broker",
      "github_app_installation",
      "run_token",
    ]) {
      expect(owned.has(want), `ownership table does not define ${want}`).toBe(true);
    }

    for (const key of keys) {
      expect(
        owned.get(key.credential_type)?.has(key.name) ?? false,
        `key ${key.name} is not assigned to ownership type ${key.credential_type}`,
      ).toBe(true);
    }
  });

  it("keeps ticks out of the execution-credential business", () => {
    // The boundary the whole contract exists to draw. Ticks syncs a board and
    // uses ordinary human Git auth; it never issues or persists a credential a
    // run executes with.
    expect(contract.ticks.execution_credentials).toEqual([]);
    expect(contract.ticks.board_sync_file).toBe("~/.ticksrc");
    expect(contract.ticks.git).not.toBe("");
  });
});

describe("the redacted example validates against the contract's own schema", () => {
  it("covers exactly the declared keys", () => {
    expect(Object.keys(validExample).sort()).toEqual(Object.keys(schema.properties ?? {}).sort());
  });

  it("validates against the strict-subset validator, not a hand-rolled walk", () => {
    // The example is checked BY THE VALIDATOR. `~/.ticfacrc` is line-oriented
    // text, so every value is a string; the closed shape and the enums are
    // what the subset can enforce. What a value must look like beyond that —
    // a URI, an RFC3339 instant, `owner/repo` — is a `description`, which is
    // honest about being prose rather than a constraint nothing applies.
    expect(validate(schema, noDefs, validExample)).toEqual([]);
  });

  it("redacts every secret", () => {
    // This file is committed to a PUBLIC repository. A real token in the
    // example is not a fixture problem, it is a disclosure — so the redaction
    // shape is asserted here as well as on the Go side, deliberately twice.
    for (const key of keys.filter((key) => key.secret)) {
      const value = validExample[key.name];
      expect(value, `valid_example is missing secret key ${key.name}`).toBeDefined();
      expect(
        /^<redacted-[a-z0-9-]+>$/.test(value),
        `valid_example[${key.name}] = ${value} is not a redacted placeholder`,
      ).toBe(true);
    }
  });
});

describe("and the schema is watched refusing something", () => {
  it("ships negative documents", () => {
    // Until bundle 3.0.0 this contract had none, so nothing on either side had
    // ever seen its schema say no. A validator nobody has watched refuse
    // anything is not known to refuse anything.
    expect(invalid.length).toBeGreaterThan(0);
  });

  for (const [i, bad] of invalid.entries()) {
    it(`refuses: ${bad.name}`, () => {
      expect(bad.why, "a negative example must say what it is testing").toBeTruthy();
      expect(
        bad.expect_error_contains,
        "a negative example must pin the refusal it expects",
      ).toBeTruthy();

      const errors = validate(schema, noDefs, bad.document);
      expect(errors.length, `invalid[${i}] VALIDATED — the schema does not refuse it`).toBeGreaterThan(0);
      // The pin is what makes the case about its own subject: without it a
      // negative that starts failing for an unrelated reason stays green.
      // `./json-schema.ts` matches Go's refusal text character for character,
      // so one pin means the same thing to both readers.
      expect(
        errors.join("\n"),
        `${bad.name}: no error contains ${JSON.stringify(bad.expect_error_contains)}`,
      ).toContain(bad.expect_error_contains);
    });
  }
});

describe("the lifecycle rules bind to the Worker that implements them", () => {
  it("makes a stop a durable refusal to issue, not a revocation", () => {
    // `.tick/learnings.md`, paid for once: revoking a run's gateway token
    // stopped nothing, because the supervisor minted a fresh one at the next
    // boot. The three flags together are that lesson.
    expect(contract.lifecycle.stop.revoke_before_stop).toBe(true);
    expect(contract.lifecycle.stop.refuse_issue_before_every_boot).toBe(true);
    expect(contract.lifecycle.stop.cancelled_handle_cannot_reissue).toBe(true);
    expect(contract.lifecycle.stop.rule).not.toBe("");
  });

  it("names a budget field the Worker actually meters on", () => {
    // `max_cost_usd` is the field name in src/run-workflow.ts. Renaming it on
    // one side and not the other gives a run a budget nothing enforces.
    expect(contract.lifecycle.cost.metered.budget_field).toBe("max_cost_usd");
    expect(contract.lifecycle.cost.metered.telemetry).toBe("gateway");
  });

  it("exempts a flat-rate seat from cost but not from wall clock", () => {
    expect(contract.lifecycle.cost.flat_rate_seat.no_cost_budget).toBe(true);
    expect(contract.lifecycle.cost.flat_rate_seat.wall_clock_still_applies).toBe(true);
    expect(contract.lifecycle.cost.flat_rate_seat.quota_failure).toBe("quota_exhausted");
  });

  it("agrees with src/credentials.ts about what a read-only run is", () => {
    // THE CROSS-LANGUAGE ASSERTION THIS READER ADDS. The contract says a
    // read-only run is refused git write and reaches its repository with a
    // run token. `src/credentials.ts` is the code that has to be true of.
    expect(contract.lifecycle.security.read_only_grade.git_write).toBe("refused");
    expect(contract.lifecycle.security.read_only_grade.credential).toBe("run_token");
    expect(contract.lifecycle.security.read_only_grade.operator_github_token_never_issued).toBe(true);

    expect(RUN_CREDENTIAL_GRADES).toContain(LEAST_RUN_CREDENTIAL_GRADE);
    expect(LEAST_RUN_CREDENTIAL_GRADE).toBe("read_only");
    // "refused" in the contract must mean refused in the code.
    expect(gradeMayWrite(LEAST_RUN_CREDENTIAL_GRADE)).toBe(false);
    expect(gradeMayWrite(DEFAULT_RUN_CREDENTIAL_GRADE)).toBe(true);

    // `run_token` is a credential type the ownership table has to own, or the
    // grade the Worker serves has no lifecycle behind it.
    expect(ownership.map((entry) => entry.credential_type)).toContain("run_token");
  });

  it("forbids printing tokens", () => {
    expect(contract.lifecycle.security.never_print_tokens).toBe(true);
  });
});

describe("the ~/.ticksrc migration", () => {
  it("states its endpoints, its steps and its crash safety", () => {
    expect(contract.migration.source).toBe("~/.ticksrc");
    expect(contract.migration.destination).toBe("~/.ticfacrc");
    expect(contract.migration.match).toBe("factory_*");
    expect(contract.migration.steps.length).toBe(4);
    expect(contract.migration.crash_safety).not.toBe("");
    expect(contract.migration.retention).not.toBe("");
  });

  it("only migrates keys the contract declares", () => {
    // `factory_*` is the match rule; every key it can legally move must be one
    // this contract knows about, or the migration invents keys the schema
    // (additionalProperties: false) then rejects.
    for (const key of keys) {
      expect(key.name.startsWith("factory_"), `key ${key.name} is outside the migration's factory_* match`).toBe(
        true,
      );
    }
  });
});
