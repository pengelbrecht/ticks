import { describe, expect, it } from "vitest";

import contract from "../../../contracts/ticfac-run-state.json";
import jobProtocol from "../../../contracts/job-protocol.json";

import { FakeGit, canonical, type Content, type Step } from "./git-cas-fake";
import { parseSchema, validate, type Schema } from "./schema-subset";

/**
 * The TypeScript reader for `contracts/ticfac-run-state.json`.
 *
 * Mirrors `internal/factory/runstate/contract_test.go`, and the mirroring is
 * the deliverable rather than a duplication to be tidied away. SPEC §4.2 says
 * an effect is idempotent when the compare-and-swap that precedes it proves it
 * has not already happened — and the two hosts reach that compare-and-swap
 * through entirely different machinery:
 *
 *   local host  `git push --force-with-lease`
 *   this host   the GitHub contents API, which is a compare-and-swap on the
 *               branch ref (the signal funnel already relies on it)
 *
 * One rule, two mechanisms, no compiler between them. That is the shape
 * contracts/README.md exists for, and the failure is the quiet kind: a guard
 * that has stopped guarding does not raise — it lets a second reconciler
 * dispatch the same attempt and pays for both jobs.
 *
 * So this side is not a weaker copy of the Go reader. It reads the contract as
 * the host that has NO GIT AND NO FILESYSTEM: the layout is a set of paths it
 * will PUT through an HTTP API, the schemas are documents it must validate
 * itself (with its own validator, written independently — a golden example
 * that only one language validates proves one language agrees with itself),
 * and the CAS sequences run against its own copy of the in-memory fake.
 *
 * What it deliberately does NOT assert: that this repository's `.gitignore`
 * actually carries the fragment, and that git honours it. Both need a
 * filesystem and a git binary; `internal/factory/runstate` owns them.
 */

type LayoutEntry = {
  path: string;
  record?: string | null;
  committed: boolean;
  cardinality?: string;
  cas?: string;
  first_write?: string;
  rebuildable?: boolean;
  hosted_equivalent?: string;
  why?: string;
};

type CasMode = {
  mode: string;
  guard: string;
  on_conflict: string;
  effect_permitted_on_conflict: boolean;
  records: string[];
};

type Sequence = {
  id: string;
  why: string;
  steps: Step[];
  final: { origin_writes: number; files: Record<string, Content> };
};

const layout = contract.layout.entries as LayoutEntry[];
const modes = contract.cas.modes as CasMode[];
const sequences = contract.cas.sequences as unknown as Sequence[];
const golden = contract.golden as Record<string, unknown>;
const invalid = contract.invalid as Array<{ record: string; why: string; document: Content }>;

/**
 * `evidence` is the one indirection in the file: a record this contract PLACES
 * and does not DEFINE. It owns where the file goes, how it is written, and
 * SPEC §10.4's envelope; contracts/job-protocol.json owns what is in it
 * (§10.1). Bundle 1.2.0 kept a second, looser `evidence_envelope` schema here
 * as well, and the two shapes disagreed — no document satisfied both, and
 * neither suite noticed, because each validated its own examples against its
 * own schema. There is now a pointer and no schema, and the pointer is
 * followed rather than trusted.
 */
function referenced(record: string): boolean {
  return Object.hasOwn(contract.references, record);
}

const jobProtocolRecords = jobProtocol.records as unknown as Record<string, { schema_id: string; schema: unknown }>;
const jobProtocolDefs: Record<string, Schema> = Object.fromEntries(
  Object.entries((jobProtocol as { $defs: Record<string, unknown> }).$defs).map(([name, raw]) => [
    name,
    parseSchema(raw, `job-protocol $defs.${name}`),
  ]),
);

/** Resolve a referenced record's schema out of the contract that defines it. */
function referencedSchema(record: string): { schema: Schema; defs: Record<string, Schema>; schemaId: string } {
  const ref = contract.references[record as keyof typeof contract.references] as {
    schema_id: string;
    contract: string;
    file: string;
    pointer: string;
  };
  expect(ref, `references.${record}`).toBeDefined();
  expect(ref.file, `references.${record}.file`).toBe("job-protocol.json");
  expect(ref.contract, `references.${record}.contract`).toBe(jobProtocol.contract);

  const entry = jobProtocolRecords[ref.pointer.replace("#/records/", "")];
  expect(entry, `references.${record}.pointer ${ref.pointer} resolves to nothing`).toBeDefined();
  expect(entry.schema_id, `references.${record}.schema_id`).toBe(ref.schema_id);

  return {
    schema: parseSchema(entry.schema, `job-protocol ${ref.pointer}`),
    defs: jobProtocolDefs,
    schemaId: ref.schema_id,
  };
}

const defs: Record<string, Schema> = Object.fromEntries(
  Object.entries(contract.$defs as Record<string, unknown>).map(([name, raw]) => [name, parseSchema(raw, `$defs.${name}`)]),
);
const schemas: Record<string, Schema> = Object.fromEntries(
  Object.entries(contract.schemas as Record<string, unknown>).map(([name, raw]) => [name, parseSchema(raw, `schemas.${name}`)]),
);

describe("the .ticfac/ run-state contract identifies itself", () => {
  it("is the contract this reader was written against", () => {
    expect(contract.schema_version).toBe(1);
    expect(contract.contract).toBe("ticfac.run_state");
    expect(contract.spec_sections).toContain("10.4");
    expect(contract.spec_sections).toContain("4.2");
  });
});

describe("the layout, read as paths a Worker will PUT", () => {
  it("places every record SPEC §10.4 names, and nothing else", () => {
    const committed = layout.filter((e) => e.committed).map((e) => e.path);
    expect(committed.sort()).toEqual(
      [
        ".ticfac/runs/<run-id>/attempts/<n>.json",
        ".ticfac/runs/<run-id>/checkpoint.json",
        ".ticfac/runs/<run-id>/decisions/<n>.json",
        ".ticfac/runs/<run-id>/evidence/<key>.json",
      ].sort(),
    );
  });

  it("keeps the derived index and the logs out of the repository", () => {
    const exhaust = layout.filter((e) => !e.committed);
    expect(exhaust.map((e) => e.path).sort()).toEqual([".ticfac/.index.json", ".ticfac/logs/"]);

    // The index is the hosted equivalent of D1, and that is precisely why it
    // is not committed and not the authority: SPEC §12 Phase 0 step 6 says run
    // state never lands in D1 as authority. A Worker that started answering
    // "what happened in this run?" from D1 would be answering from a cache it
    // is allowed to lose.
    const index = exhaust.find((e) => e.path === ".ticfac/.index.json");
    expect(index?.rebuildable).toBe(true);
    expect(index?.hosted_equivalent).toBe("D1");
    expect(contract.authority.d1_is_authority).toBe(false);
    expect(contract.authority.hosted_index_is_derived).toBe(true);
  });

  it("gives every committed path exactly one guard", () => {
    for (const entry of layout.filter((e) => e.committed)) {
      const mode = modes.find((m) => m.mode === entry.cas);
      expect(mode, `${entry.path} declares cas ${entry.cas}`).toBeDefined();
      expect(mode?.records).toContain(entry.record);
      expect(mode?.effect_permitted_on_conflict).toBe(false);
    }
  });

  it("makes the checkpoint the only record that is ever updated", () => {
    const updated = modes.find((m) => m.mode === "sha_guarded_update");
    expect(updated?.records).toEqual(["checkpoint"]);

    const created = modes.find((m) => m.mode === "create_if_absent");
    expect(created?.records.sort()).toEqual(["attempt", "decision", "evidence"]);

    // Every other record is written once. A file whose existence is the proof
    // an effect happened cannot also be a file that gets rewritten.
    const checkpoint = layout.find((e) => e.record === "checkpoint");
    expect(checkpoint?.first_write).toBe("create_if_absent");
  });
});

describe("the persistence policy a Worker has to honour", () => {
  it("means pushed on origin, because the writer can be wiped", () => {
    expect(contract.persistence.durable_means).toBe("pushed on origin");
    expect(contract.persistence.local_commit_is_durable).toBe(false);
    expect(contract.persistence.write_commit_push_is_one_operation).toBe(true);
    expect(contract.persistence.cas_ref).toBe("origin");
    expect(contract.cas.local_ref_is_authority).toBe(false);
  });

  it("writes on state change, not on observation", () => {
    // This one is a cost rule as much as a correctness rule: a Worker pays
    // GitHub API rate limits for these commits. Ten an hour is negligible; one
    // per poll is not.
    expect(contract.persistence.checkpoint_on).toBe("state change");
    expect(contract.persistence.checkpoint_on_observation).toBe(false);
  });

  it("lands the terminal record on the target ref exactly once", () => {
    expect(contract.persistence.terminal_record.times).toBe(1);
    expect(contract.persistence.terminal_record.intermediate_commits_land_on_target).toBe(false);
    expect(contract.persistence.terminal_record.collapsed_by).toContain("squash");
  });

  it("tags the run branch at terminal state, published or not", () => {
    expect(contract.persistence.tag.pattern).toBe("ticfac/run-<run-id>");
    expect(contract.persistence.tag.placed_at).toBe("terminal state");
    expect(contract.persistence.tag.placed_on_unpublished_runs).toBe(true);
    expect(contract.persistence.gc.command).toBe("ticfac gc");
  });

  it("treats a conflict as the signal rather than something to retry", () => {
    expect(contract.persistence.conflict_is).toBe("the signal");
    expect(contract.persistence.conflict_retry_blindly).toBe(false);
  });

  it("names both mechanisms, which is the pair that can drift", () => {
    expect(contract.cas.mechanisms.local_host).toContain("force-with-lease");
    expect(contract.cas.mechanisms.worker).toContain("contents API");
  });
});

describe("the boundary, mirrored from .tick/", () => {
  it("keeps the reconciler the only writer and the dependency one-way", () => {
    expect(contract.boundary.only_writer).toBe("the reconciler");
    expect(contract.boundary.workers_write).toBe(false);
    expect(contract.boundary.ticks_reads_ticfac).toBe(false);
    expect(contract.boundary.is_configuration).toBe(false);
  });
});

describe("the .gitignore fragment", () => {
  it("is delimited, so a reconciler can rewrite it without eating the file", () => {
    const fragment = contract.gitignore.fragment;
    expect(fragment[0]).toBe(contract.gitignore.begin_marker);
    expect(fragment[fragment.length - 1]).toBe(contract.gitignore.end_marker);
  });

  it("covers exactly the paths the layout calls exhaust", () => {
    const fragment = contract.gitignore.fragment as string[];
    for (const entry of layout) {
      if (entry.committed) {
        expect(fragment, `${entry.path} is the run's durable record`).not.toContain(entry.path);
      } else {
        expect(fragment, `${entry.path} is exhaust`).toContain(entry.path);
      }
    }
  });

  it("gives an example of every committed record kind, so the fragment is fully tested by the Go side", () => {
    // The tracked examples are what `git check-ignore` is pointed at in
    // internal/factory/runstate. One per committed record kind, or half the
    // fragment is only asserted in prose.
    const kinds = layout.filter((e) => e.committed).length;
    expect(contract.gitignore.tracked_examples.length).toBeGreaterThanOrEqual(kinds);
    expect(contract.gitignore.ignored_examples.length).toBeGreaterThan(0);
  });
});

describe("every committed record carries the envelope", () => {
  it("requires schema_version and provenance, as SPEC §10.4 says", () => {
    for (const [name, schema] of Object.entries(schemas)) {
      for (const field of contract.envelope.required_on_every_committed_record) {
        expect(schema.required, `schemas.${name}`).toContain(field);
      }
      // One shared provenance definition, not four copies that can drift.
      expect(schema.properties?.provenance?.$ref).toBe("#/$defs/provenance");
    }
  });

  it("closes provenance over the fields §10.1 lists", () => {
    const provenance = defs.provenance;
    expect(provenance.required).toEqual([
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
    ]);
    expect(provenance.additionalProperties).toBe(false);
  });

  it("uses the SAME provenance object job-protocol.json defines, not a compatible one", () => {
    // The strict subset has no cross-file $ref, so these $defs are copies. Two
    // spellings of one shape is what bundle 1.2.0 shipped, so the copy is
    // compared rather than trusted.
    for (const name of ["provenance", "phase", "executor", "role"]) {
      expect(
        (contract.$defs as Record<string, unknown>)[name],
        `$defs.${name} differs from job-protocol.json`,
      ).toEqual((jobProtocol as { $defs: Record<string, unknown> }).$defs[name]);
    }
  });
});

describe("the golden examples validate here too", () => {
  for (const [record, document] of Object.entries(golden)) {
    it(`golden.${record}`, () => {
      if (referenced(record)) {
        // Validated against the contract that DEFINES the record. This is the
        // cross-file check bundle 1.2.0 had in neither direction.
        const { schema, defs: refDefs, schemaId } = referencedSchema(record);
        expect(validate(schema, refDefs, document), `golden.${record} against ${schemaId}`).toEqual([]);
        return;
      }
      const schema = schemas[record];
      expect(schema, `schema for ${record}`).toBeDefined();
      expect(validate(schema, defs, document)).toEqual([]);
    });
  }

  it("covers every record the layout places", () => {
    const records = layout.filter((e) => e.committed).map((e) => e.record);
    expect(Object.keys(golden).sort()).toEqual([...records].sort());
  });
});

describe("and the negative examples are refused", () => {
  for (const [i, bad] of invalid.entries()) {
    it(`invalid[${i}] — ${bad.why}`, () => {
      if (referenced(bad.record)) {
        const { schema, defs: refDefs } = referencedSchema(bad.record);
        expect(validate(schema, refDefs, bad.document).length).toBeGreaterThan(0);
        return;
      }
      const schema = schemas[bad.record];
      expect(schema, `schema for ${bad.record}`).toBeDefined();
      // A schema nothing has ever seen refuse a document is not known to
      // refuse anything.
      expect(validate(schema, defs, bad.document).length).toBeGreaterThan(0);
    });
  }

  it("gives every schema and every referenced record at least one refusal to prove", () => {
    const covered = new Set(invalid.map((bad) => bad.record));
    expect([...covered].sort()).toEqual([...Object.keys(schemas), ...Object.keys(contract.references)].sort());
  });
});

describe("the compare-and-swap sequences, against this side's fake", () => {
  for (const sequence of sequences) {
    it(sequence.id, () => {
      const git = new FakeGit();
      for (const [i, step] of sequence.steps.entries()) {
        const before = git.writes;
        const outcome = git.run(step);
        expect(outcome, `step ${i}: ${step.actor} ${step.op} ${step.path ?? ""}`).toBe(step.expect);

        // A refused compare-and-swap writes nothing — otherwise the guard is
        // advisory. Neither does a local commit or an observation.
        if (outcome !== "created" && outcome !== "updated") {
          expect(git.writes, `step ${i} returned ${outcome} but origin moved`).toBe(before);
        }
        if (step.op === "commit_local") {
          expect(git.origin.has(step.path as string), `step ${i} committed locally and reached origin`).toBe(false);
        }
        if (step.effect_permitted !== undefined) {
          expect(!outcome.startsWith("conflict_"), `step ${i} effect_permitted`).toBe(step.effect_permitted);
        }
      }

      expect(git.writes).toBe(sequence.final.origin_writes);
      expect([...git.origin.keys()].sort()).toEqual(Object.keys(sequence.final.files).sort());
      for (const [path, content] of Object.entries(sequence.final.files)) {
        expect(canonical(git.origin.get(path)?.content), path).toBe(canonical(content));
      }
    });
  }

  // The negative control. contracts/README.md: a check nothing has ever seen
  // fail is not known to be a check.
  it("goes red when the compare-and-swap is disabled", () => {
    let guardTests = 0;
    const survived: string[] = [];

    for (const sequence of sequences) {
      // Only a sequence that expects a refusal is testing the guard. The
      // single-writer sequences prove different rules and reach the same place
      // either way, by construction.
      if (!sequence.steps.some((step) => step.expect.startsWith("conflict_"))) continue;
      guardTests += 1;

      const git = new FakeGit();
      git.unguarded = true;
      let refused = false;
      for (const step of sequence.steps) {
        const outcome = git.run(step);
        if (outcome !== step.expect) refused = true;
      }
      if (!refused && git.writes === sequence.final.origin_writes) survived.push(sequence.id);
    }

    expect(guardTests).toBeGreaterThan(0);
    expect(survived).toEqual([]);
  });

  it("uses only the ops and outcomes the contract declares, and uses all of them", () => {
    const declared = new Map(contract.cas.fake.ops.map((op) => [op.op, new Set(op.outcomes)]));
    const usedOutcomes = new Map<string, Set<string>>();

    for (const sequence of sequences) {
      for (const step of sequence.steps) {
        const outcomes = declared.get(step.op);
        expect(outcomes, `${sequence.id} uses op ${step.op}`).toBeDefined();
        expect([...(outcomes ?? [])]).toContain(step.expect);
        if (!usedOutcomes.has(step.op)) usedOutcomes.set(step.op, new Set());
        usedOutcomes.get(step.op)?.add(step.expect);
      }
    }

    for (const [op, outcomes] of declared) {
      expect([...(usedOutcomes.get(op) ?? [])].sort(), `op ${op}`).toEqual([...outcomes].sort());
    }
  });

  it("reaches both conflict outcomes the modes declare", () => {
    const seen = new Set(sequences.flatMap((sequence) => sequence.steps.map((step) => step.expect)));
    for (const mode of modes) {
      expect(seen, `mode ${mode.mode}`).toContain(mode.on_conflict);
    }
  });
});
