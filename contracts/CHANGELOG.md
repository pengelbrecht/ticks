# Contract bundle changelog

The bundle in this directory is versioned so a consumer outside this repository
can pin it by exact value: `cloud/factory/contracts.pin.json` does today, and
`ticfac` will from its own repository
(`docs/projects/2026-09-01-ticfac-architecture/SPEC.md` §3.2). This file is the
other half of that pin — the version says *which bytes*, the entry below says
*what changed and who has to follow*.

## The rule

**Every change to a file in `contracts/` bumps `version` in `bundle.json` and
adds an entry here, in the same commit.** Both halves are enforced:
`internal/contracts` (Go) and `cloud/factory/scripts/contracts.mjs`
(TypeScript) each re-hash the fixtures and refuse a manifest that does not
match, and each refuses a version with no entry here.

Versioning is semver over *consumer obligation*, not over file size:

| bump | when |
|---|---|
| MAJOR | a rule changed, or a fixture was removed or renamed — an unchanged consumer is now **wrong** |
| MINOR | a contract or case was added — an unchanged consumer is still correct but no longer complete |
| PATCH | comment, formatting or ordering only — no consumer has anything to do |

Do **not** re-cut the digests without bumping the version. That is the one
change a pinned consumer cannot see, and it is precisely what the version
exists to make loud.

## How to cut a bump

1. Edit the fixture, and every implementation of the rule, in one commit
   (`contracts/README.md` — a one-sided edit is what these files exist to catch).
2. Bump `version` in `contracts/bundle.json`.
3. Add the entry below.
4. `make contracts-bundle` — rewrites `files` and `digests`.
5. Set `bundleVersion` in `cloud/factory/contracts.pin.json` to the new version.

---

## 1.0.0

First cut. Freezes the nine contracts that already existed, unchanged, as
bundle `1.0.0`: runner config, signal sources, sweep policy, sweep selection,
sandbox image, worker boot, message context, tracker layout, and the collect
vocabulary.

No fixture bytes changed. What is new is the manifest, the version, this file,
and the executable checks on both sides — the bundle is now a thing that can be
pinned rather than a directory that can be copied.

Consumers: `cloud/factory` pins `1.0.0`. Nothing to follow.

## 1.1.0

MINOR. Two contracts added by ticfac Phase 0 (epic 692); no existing fixture
byte changed, so an unchanged consumer is still correct but no longer complete.

- `tk-json-manifest.json` — the published `tk --json` surface: every command a
  consumer may call, its argv, its JSON schema, and the contract version it
  was added in (tick rs2, SPEC §3.1).
- `credential-ownership.json` — which credentials belong to ticfac and which to
  ticks, the `~/.ticfacrc` schema, grant grades and stop rules (tick uzq,
  SPEC §3.3).

## 1.2.0

MINOR. Two contracts added by ticfac Phase 0 (epic 692), in one version because
neither was released separately; no existing fixture byte changed, so an
unchanged consumer is still correct but no longer complete.

- `job-protocol.json` — the versioned record schemas for the four-operation
  executor protocol (JobSpec, JobHandle, JobStatus, cancel acknowledgement,
  JobResult), the role-result envelope, and the evidence record, with the
  golden documents from the SPEC and the negative documents each schema must
  refuse (tick q8j, SPEC §4.3, §4.4, §10.1).

  Two things in it are cross-checked against contracts already in the bundle,
  because a second spelling of a rule already written down is the drift this
  directory exists to catch: the metered/flat-rate cost semantics and the
  cancel-time stop rules must match `credential-ownership.json`, and the
  role-result status vocabulary must match `collect-vocabulary.json`.

- `ticfac-run-state.json` — the `.ticfac/` layout, the persistence policy and
  the compare-and-swap rules (tick x1w, SPEC §4.2 and §10.4). It carries the
  record schemas for `checkpoint.json`, `attempts/<n>.json`,
  `decisions/<n>.json` and the envelope of `evidence/<key>.json`, golden and
  negative examples for each, the `.gitignore` fragment for the two
  gitignored paths, and seven compare-and-swap sequences written as executable
  table tests against an in-memory git fake.

  Adopting it costs a consumer two things. First, the record shapes: a
  reconciler that writes `.ticfac/` must satisfy these schemas, envelope
  included — every committed file carries a `schema_version` and the
  provenance fields of an evidence record. Second, and the reason the fixture
  is executable rather than prose: the guard is against the **origin** ref, so
  a host reaching it through the GitHub contents API and a host reaching it
  through `git push --force-with-lease` must produce the same outcome for
  every sequence in `cas.sequences`.

**Where the two meet.** Both contracts describe the same file:
`ticfac-run-state.json` places an evidence record at
`.ticfac/runs/<run-id>/evidence/<key>.json` and pins its path, its
compare-and-swap mode and its envelope, while `job-protocol.json`'s
`records.evidence` pins the record's own fields. The division of labour is
deliberate — one owns *where the file goes and how it is written*, the other
owns *what is in it*.

**In 1.2.0 the two shapes were not reconciled, and a consumer of 1.2.0 must not
assume they are.** `records.evidence` was flat and closed; `evidence_envelope`
required a nested `provenance` object and a `key` and was open past them. No
document satisfied both — validating the run-state golden evidence example
against `records.evidence` produced 22 violations — and neither suite saw it,
because each validated its own examples against its own schema. **2.0.0 settles
it; read that entry before adopting either contract.**

## 2.0.0

MAJOR. One evidence record. The two shapes 1.2.0 shipped are reconciled into a
single definition, so a document that satisfies the contract now satisfies the
whole bundle. Every consumer that wrote or read an evidence record against
1.2.0 is wrong until it follows.

**The record.** `job-protocol.json` `records.evidence` (`ticfac.evidence.v1`)
is the ONLY definition in the bundle. It is closed (`additionalProperties:
false`, SPEC §10.1 bounded and redacted) and nested:

- the fifteen flat provenance fields are now one `provenance` object, the
  shared `$defs.provenance` that checkpoint, attempt, decision and evidence all
  carry — the shape `ticfac-run-state.json` already used, because SPEC §10.4
  says every committed file carries "the provenance fields of an evidence
  record", and one object is the only way to say that once;
- `key` is required: the record's identity, and the `<key>` in
  `.ticfac/runs/<run-id>/evidence/<key>.json`;
- `evidence_ref` (how `job_result` and `role_result` cite evidence) names that
  same `key` — `evidence_id` is gone, so a citation resolves to the record it
  names;
- `acceptance` keeps its one vocabulary, `required | advisory`. The run-state
  golden example's `"accepted"` was a *result* wearing an acceptance's name and
  is now a negative example.

**The pointer.** `ticfac-run-state.json` no longer defines the record. Its
`schemas.evidence_envelope` is deleted and replaced by `references.evidence`,
which names the contract, the file, the pointer and the schema_id. It still
owns the path, the compare-and-swap mode and the envelope. Its `$defs`
`provenance`, `phase`, `executor` and `role` are byte-identical copies of
job-protocol's — the strict subset has no cross-file `$ref` — and the readers
compare them structurally rather than trusting the copy.

**Vocabularies closed by the shared provenance.** `phase` is now the gate
enum (`worker | post-wave | integrated | review | closeout`), `executor` and
`role` the job-protocol enums. The run-state golden and negative examples move
onto them: `gate` → `post-wave`/`integrated`, `dispatch` → `worker`,
`frontier_review` → `review` with role `review-epic`, `implement` →
`implement-tick`. Every provenance field is required and nullable, as the
evidence record's fields already were.

**The tests that would have caught it**, and are the reason this is a version
rather than a patch:

- each contract's golden evidence example is validated against the OTHER
  contract's rule, from both languages
  (`internal/factory/jobprotocol/evidence_cross_contract_test.go`,
  `internal/factory/runstate/evidence_cross_contract_test.go`,
  `cloud/factory/test/evidence-record.test.ts`);
- a bundle-wide rule: **a `schema_id` that appears in more than one contract
  file resolves to exactly one definition** — `contracts.VerifySchemaIDs` (Go)
  and `verifySchemaIds` in `cloud/factory/scripts/contracts.mjs`, each with a
  negative control that re-creates the 1.2.0 shape and asserts a refusal;
- the flat 1.2.0 record and the `"accepted"` acceptance are kept as negative
  examples, so the shape that used to validate against half the bundle now
  fails loudly.

Consumers: `cloud/factory` moves its pin to `2.0.0`. A writer of `.ticfac/`
records nests its provenance, adds `key`, and spells `acceptance` `required`
or `advisory`; a reader of `job_result.evidence[]` reads `key` where it read
`evidence_id`. SPEC §10.1 and §10.4 name the one record.

## 2.1.0

MINOR. One contract added by ticfac Phase 0 (epic 692), SPEC §12 Phase 0 step
7; no existing fixture byte changed, so an unchanged consumer is still correct
but no longer complete.

- `lifecycle-invariants.json` — **SPEC Appendix A's thirteen lifecycle
  invariants as a conformance suite**, each with the live failure that earned
  it, the symbols it lives in today, and executable sequences against a fake
  harness. Read from Go by `internal/factory/lifecycle` and from TypeScript by
  `cloud/factory/test/lifecycle-invariants.test.ts`.

Three things make it a contract rather than a list:

- **It is executable before the code it constrains exists.** The `harness`
  block describes a small state machine — a stop record, credentials, jobs, an
  origin, a host step, a poll cadence, holds, claims, a budget, evidence — that
  both readers implement independently, so the thirteen rules can be tested in
  Phase 0 with no reconciler, no container, no git and no network. That is what
  lets ticfac inherit the suite unchanged in Phase 1.
- **Every invariant names a guard, and every guard is proven to bite.** Each
  reader replays an invariant's sequences with its guard(s) turned off and
  requires at least one of them to stop matching. This is
  `ticfac-run-state.json`'s CAS negative control generalised to fifteen named
  guards; a rule whose sequences pass either way is describing a series of
  operations, not testing anything.
- **The cross-file rule bundle 2.0.0 added is used again.** Appendix A #13's
  four fingerprint fields are not defined here: `harness.fingerprint_fields`
  maps Appendix A's English names onto `job-protocol.json`'s
  `$defs.provenance`, and both readers follow the pointer — asserting each
  field is a property of provenance AND required by it — rather than restating
  the shape. A record two contracts describe is a record one of them must
  define.

The suite is also a claim about who has to run it: `gate` names the reconciler
and each executor the SPEC plans, and says the invariants may not be waived by
a profile, a deployment var or a prompt. A new EXECUTOR is what re-runs this
suite; a new runner on an existing executor is not (§12 Phase 1 step 3).

Consumers: `cloud/factory` moves its pin to `2.1.0`. Nothing existing to
follow — but an implementation of a ticfac executor now has a defined gate, and
`internal/factory/lifecycle` is the reference for what passing it means.
