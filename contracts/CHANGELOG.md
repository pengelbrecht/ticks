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
match, each refuses a version with no entry here, and each refuses a manifest
re-cut at a version `version_digests` already records (see below).

Versioning is semver over *consumer obligation*, not over file size:

| bump | when |
|---|---|
| MAJOR | a rule changed, or a fixture was removed or renamed — an unchanged consumer is now **wrong** |
| MINOR | a contract or case was added — an unchanged consumer is still correct but no longer complete |
| PATCH | comment, formatting or ordering only — no consumer has anything to do |

Do **not** re-cut the digests without bumping the version — and since `2.1.1`
you cannot. `bundle.json`'s `version_digests` records a sha256 over each
version's own `version` + `digests` the first time that version is cut, and
never rewrites it, so a re-cut at an unchanged version is refused by
`make contracts-bundle`, by `contracts.Verify` (Go) and by `verifyBundle`
(TypeScript). That was the one change a pinned consumer could not see, which is
precisely why it is the one the version exists to make loud.

## How to cut a bump

1. Edit the fixture, and every implementation of the rule, in one commit
   (`contracts/README.md` — a one-sided edit is what these files exist to catch).
2. Bump `version` in `contracts/bundle.json`.
3. Add the entry below.
4. `make contracts-bundle` — rewrites `files` and `digests`, and records the new
   version's entry in `version_digests`. It refuses if the version is one it
   has already cut with different bytes.
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

- the fourteen flat provenance fields are now one `provenance` object, the
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
`implement-tick`. Every provenance field is REQUIRED, and ten of the fourteen
are also nullable — SPEC §10.1's reading, not a uniform rule. `run_id`,
`source_ref` and `source_sha` are plain strings and `phase` is a bare `$ref`,
because a record with no run, no source or no phase is not evidence of
anything. The other ten are required-and-nullable, as the evidence record's
fields already were: a record that omits `integration_ref` and one that states
it as null are different claims, and only the second is evidence.

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

## 3.0.0

MAJOR. The `credential-ownership.json` schema changed shape, and one
`job-protocol.json` golden changed values — an unchanged consumer that copied
either is now **wrong**. Nothing outside `cloud/factory` pins the bundle yet,
so the honest number costs nothing.

Cut by the epic 692 final review, and it carries **two ticks' worth of repairs**
that landed in the same integration: `wh8`'s contract and reader fixes, and
`dtp`'s comment-only manifest edit with the `version_digests` mechanism it
brought. `dtp`'s half was briefly cut as `2.1.1` on the integration branch;
one version supersedes both, because a consumer should have one number to adopt
rather than two it can only take together.

Most of what follows is the same failure in a different file: **a fixture that
reads as if it asserted something, with nothing on either side actually
asserting it.**

- **`credential-ownership.json`'s schema is rewritten in the strict subset.**
  It was the one contract using `oneOf`, `const`, `minLength`, `format` and
  `pattern`, none of which `internal/tkcontract/schema.go` or
  `cloud/factory/test/json-schema.ts` implements. So both readers hand-rolled a
  partial walk over it, both silently ignored the keywords they did not carry,
  and `format: uri` meant `url.ParseRequestURI` in Go and `new URL` in
  TypeScript — two different claims wearing one word. The block is now
  `type`/`enum`/`additionalProperties` only, validated by the strict validator
  on both sides; what the subset cannot enforce (a URI, an RFC3339 instant,
  `owner/repo`) is a `description`, which is honest about being prose.
- **Every negative example everywhere now pins the refusal it expects.**
  `credential-ownership.json` had no negative at all — nothing had ever watched
  its schema refuse a document — and now ships five. `ticfac-run-state.json`'s
  seven carried a `why` sentence and nothing else, so a case could start failing
  for an unrelated reason and stay green. Both files now carry
  `expect_error_contains` and both readers assert it, as `job-protocol.json`
  already did. This is what `cloud/factory/test/json-schema.ts` matching Go's
  refusal text character for character is *for*.
- **One TypeScript strict-subset validator, not two.**
  `cloud/factory/test/schema-subset.ts` was a second, weaker copy —
  `required` checked with `in`, keyword values not type-checked, divergent error
  text, no unknown-keyword test — and `ticfac-run-state.test.ts` was the only
  file reading it. Deleted; that reader now uses `json-schema.ts`. Two
  validators for one subset is the drift these contracts exist to catch,
  reproduced inside the machinery meant to catch it.
- **`tk-json-manifest.json`'s schemas are parsed strictly on both sides.** Go
  has always decoded the manifest with `DisallowUnknownFields` and walked every
  `$defs` entry through `Schema.check`; the TypeScript reader only checked that
  `$ref`s resolved. A host that cannot run `tk` reimplements the manifest from
  those schemas, so it has to be told in its own language which keywords it is
  required to honour.
- **The lifecycle thresholds are pinned to the substrate, not to each other.**
  `wipe_threshold_ms` was `600000` — which is `WORKFLOW_STEP_TIMEOUT_MS`, the
  Workflow step cap, not a wipe threshold. The real one is
  `SANDBOX_SLEEP_AFTER = "20m"`. Every inequality the two readers asserted held,
  both agreed, and the fixture described a host that does not exist. Each
  threshold now names the constant it must equal (`harness.thresholds.substrate`);
  the TypeScript reader IMPORTS `SANDBOX_SLEEP_AFTER`, `MAX_POLL_MS` and
  `STEP_WORK_BUDGET_MS` and asserts equality, and the Go reader reads
  `entrypoint.sh`'s `TICKS_KEEPER_INTERVAL` default and checks every named
  symbol is still in its named file. `wipe_threshold_ms` is now `1200000` and
  A4's sequence advances past it.
- **The negative controls are per guard.** Disabling an invariant's guards
  together cannot see a dead guard: A1 and A13 have two each, and the first
  one's divergence satisfied the whole control. Each guard is now disabled ON
  ITS OWN and must make at least one sequence stop matching — plus a blast-radius
  assertion that every other invariant stays green while it is off, which turns
  "a guard belongs to the rule it enforces" into something executable.
- **A10's protected prefixes live in the JSON.** `.tick/` and `.ticfac/` were
  hard-coded in both harnesses, so the fixture described a boundary it did not
  define and the two copies could drift apart with every sequence green.
- **`job-protocol.json`'s review-epic golden is epic-level.** It had
  `tick_id: "abc"`, an attempt branch as `source_ref`, `integration_ref: null`
  and `acceptance: "advisory"` — a `review-epic` record SPEC §6.3 could not have
  produced, since review runs against the integrated EpicRun ref and is
  required. Now `tick_id: null`, the integration ref in both ref fields, and
  `acceptance: "required"`.
- **`tk-json-manifest.json` records what it does not publish.** SPEC §3.1's
  illustrative list named `tk sandbox image|setup|substrate|worker-prompt
  --json` and `tk ask … --json`; no `sandbox` subcommand registers `--json` at
  all, and `tk ask --json` means *read the question from stdin as JSON*, so a
  consumer reimplementing that list would have blocked on an empty stdin. The
  gap is in the file's `$comment` and asserted from both sides; §3.1 and
  `contracts/README.md` were corrected to the manifest rather than the reverse.
  No new `--json` flag was implemented — that is a release decision about tk's
  published surface.
- **`tk-json-manifest.json` `request.$comment` says WHERE the refusal is
  enforced.** `tk`'s root `PersistentPreRunE`, which runs for every command
  including the git merge drivers `tk` registers. A bad `TK_JSON_CONTRACT`
  exported into a shell therefore makes `git merge` exit 11. That is by
  design — a contract this build cannot serve is refused everywhere rather
  than in the commands a caller remembered to check — but it is surprising
  enough that the contract now says it.

**The manifest gained a mechanism, and it is why this is a version rather than
an unversioned re-cut.** `bundle.json` now carries `version_digests`: an
append-only ledger mapping each version to a sha256 over that version's own
`version` + `digests` map. It closes the one hole in the bundle's own rule.
Until now, "do not re-cut the digests without bumping the version" was
discipline — a fixture edit plus `make contracts-bundle` at an unchanged
version left a manifest that was internally consistent again, that `Verify`
and `verifyBundle` both accepted, and that a consumer pinned by exact value
could not see. Now the ledger already holds what that version was cut with,
so the re-cut contradicts it and all three refuse: `contracts.Verify` (Go),
`verifyBundle` (TypeScript) and `make contracts-bundle` itself, which never
rewrites an entry it has written. Both negative-control suites gained a case
that performs exactly the dishonest re-cut and asserts the refusal.

The ledger begins at `2.1.1`. The bytes of `1.0.0` through `2.1.0` are not
recoverable from the manifest, so it records `2.1.1` onward and the verifiers
check the entry for the version on disk. **Its `2.1.1` entry stays in
`bundle.json` although no `## 2.1.1` heading survives above**: `2.1.1` was cut
on the epic integration branch and superseded by this version before either
reached a release. The ledger is append-only and records what was CUT, not what
shipped — rewriting it to tidy away a version that existed is precisely the
edit it exists to make impossible.

Consumers: `cloud/factory` moves its pin to `3.0.0`. A reader of
`credential-ownership.json`'s `schema` drops any handling of `oneOf`, `const`,
`minLength`, `format` and `pattern` and validates with a strict-subset
validator; a consumer that copied the `review-epic` evidence golden re-reads it;
anything that pinned `lifecycle-invariants.json`'s `wipe_threshold_ms` was
pinned to the wrong number and now gets the substrate's. A consumer that
re-implements the bundle check should add the ledger check; one that only reads
fixtures has nothing to follow there.
