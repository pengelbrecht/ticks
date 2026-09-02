# Cross-language contracts

The JSON files in this directory are **case tables and pinned surfaces that more
than one language reads**, each owned by whichever product defines the format.
Most describe something `ticks` owns — `.tick/runners.toml`, the tracker's
on-disk layout, the sandbox worker boot handshake, the message context the
operator composes. Three are ticfac's: `job-protocol.json`,
`ticfac-run-state.json` and `lifecycle-invariants.json` pin the executor
protocol, the `.ticfac/` layout and SPEC Appendix A, and they live here because
`ticks` is where both readers are today, not because `ticks` owns them — they
travel to ticfac with the bundle. Either way the rule is the same: at least one
other implementation — usually the factory Worker's TypeScript — has to parse
the same file.

Go reads these files from its parity tests. The factory Worker's vitest suite
reads the same files. That is the whole point: **every implementation of a rule
is pinned to one file, so a rule changed in one of them and not the others fails
a test.** Most are two-sided (Go and TypeScript); `collect-vocabulary.json` is
three-sided.

Note that "cross-language" is the common case, not the requirement — two Go
packages that re-implement the same rule have the same drift problem and belong
here too.

## The bundle: versioned, pinned, executable

These files are not just a directory. They are a **bundle with a version**,
because they have a consumer that is leaving the repository: `cloud/factory`
today, `ticfac` tomorrow
(`docs/projects/2026-09-01-ticfac-architecture/SPEC.md` §3.2). Three files make
that real:

| file | what it is |
|---|---|
| `bundle.json` | the manifest — `version`, the file list, a sha256 per file, and `version_digests` |
| `CHANGELOG.md` | what each version changed, and the rule that governs bumps |
| `cloud/factory/contracts.pin.json` | the consumer's pin: `"bundleVersion"`, by exact value |

The version is only worth anything if it always names the same bytes, so both
languages re-hash the fixtures against the manifest on every build:

- **Go** — `internal/contracts` (`Verify`, `VerifyChangelog`), run by the CI
  `go` job's *Contract bundle and parity fixtures* step.
- **TypeScript** — `cloud/factory/scripts/contracts.mjs` (`verifyBundle`), run
  by `pnpm contracts:check` on every `pnpm test` and `pnpm typecheck`, and as
  its own CI step.

And both sides carry **negative controls** — `internal/contracts/bundle_test.go`
and `cloud/factory/scripts/contracts.test.mjs` — that break a fixture in a
throwaway copy and assert the check refuses it. That is the point the SPEC
insists on: *a copied JSON file without an executable check is not a contract*,
and a check nothing has ever seen fail is not known to be a check.

### Changing a contract

`contracts/CHANGELOG.md` has the full rule. In short, one commit contains all
of: the fixture edit, every implementation of the rule, a bumped `version` in
`bundle.json`, a `CHANGELOG.md` entry, `make contracts-bundle`, and the moved
`bundleVersion` in `cloud/factory/contracts.pin.json`. Stop anywhere short of
that and a build goes red naming what is missing.

Do **not** re-cut the digests without bumping the version, and you cannot: a
consumer pinned to `2.1.1` cannot see that `2.1.1` came to mean something else,
so the manifest does the seeing for it. `version_digests` maps each version to
a sha256 over that version's own `version` + `digests` — written the first time
that version is cut and never rewritten — so a re-cut at an unchanged version
contradicts the ledger and is refused three times over:

- `make contracts-bundle` refuses to write it, naming the bump it wants;
- `contracts.Verify` (Go) refuses the manifest;
- `verifyBundle` (`cloud/factory/scripts/contracts.mjs`) refuses it too, from
  the consumer's side, which is the side that could not otherwise tell.

Both negative-control suites carry the dishonest re-cut — edit a fixture,
regenerate the digests, leave `version` alone — and assert the refusal. The
ledger begins at `2.1.1`, the version that introduced it; the bytes of earlier
versions are not recoverable from the manifest, so the check is on the version
on disk.

## Why they exist at all

`.tick/learnings.md` records the bug this repository has already paid for, under
"Cross-language parity": a fix landed in TypeScript only, the Go half kept
minting unusable records, and **both test suites stayed green** — because each
side was internally consistent with itself. A comment saying "mirrored from
`internal/herd/config/load.go`" does not catch that. Nothing catches it except a
single artifact that both suites assert against.

So: **a one-sided edit is exactly what these files exist to catch.** If you
change a rule in `internal/herd/config`, or in `cloud/factory/src`, and a test
here goes red, the test is not in your way — it is doing the only job it has.
Change the rule in *every* implementation and in the fixture, in one commit, or
do not change it.

Corollary: never "fix" a red parity test by relaxing the fixture to match
whichever side you just edited. That silently disables the detector and leaves
the implementations disagreeing.

## The files

| File | Contract | Go reader(s) |
|---|---|---|
| `runners-config-contract.json` | `[sandbox].image` and `[orchestration].max_parallel` validation in `.tick/runners.toml` | `internal/herd/config/runners_config_parity_test.go` |
| `signal-source-cases.json` | accepted/refused webhook signal sources | `internal/herd/config/signal_parity_test.go` |
| `sweep-policy-cases.json` | sweep policy parsing and refusals | `internal/herd/config/sweep_parity_test.go` |
| `sweep-selection-contract.json` | which ticks a sweep selects, and the fields that decide it | `internal/herd/config/sweep_parity_test.go`, `internal/tick/sweep_selection_parity_test.go` |
| `sandbox-image-cases.json` | sandbox image reference acceptance | `internal/sandbox/image_parity_test.go` |
| `worker-boot-contract.json` | per-tick worker boot commands, probe and cancel markers | `internal/sandbox/worker_parity_test.go` |
| `message-context.json` | the message context block the operator composes | `internal/operator/message_context_parity_test.go` |
| `tracker-layout.json` | the tracker's on-disk record layout and field order | `internal/tick/tracker_layout_parity_test.go` |
| `collect-vocabulary.json` | the collect verdict/status vocabulary and the status-line parse cases | `internal/herd/collect/contract_test.go`, `internal/cloud/collect/contract_test.go` |
| `tk-json-manifest.json` | the published `tk --json` command surface: every command a consumer may call, its argv, its output schema, and the contract version this build serves | `cmd/tk/cmd/tk_json_contract_test.go`, `internal/tkcontract` |
| `credential-ownership.json` | which product owns each credential type, the `~/.ticfacrc` key set and its redacted example, and the stop/cost/security lifecycle rules | `internal/factory/credentials/contract_test.go` |
| `job-protocol.json` | the versioned record schemas for the four-operation executor protocol (JobSpec, JobHandle, JobStatus, cancel acknowledgement, JobResult), the role-result envelope and **the bundle's one evidence record** (`ticfac.evidence.v1`, referenced by `ticfac-run-state.json`), with the golden documents each admits and the negative documents each must refuse | `internal/factory/jobprotocol/contract_test.go`, `internal/factory/jobprotocol/evidence_cross_contract_test.go` |
| `ticfac-run-state.json` | the `.ticfac/` layout, the persistence policy (durable means pushed on origin) and the compare-and-swap rules, with record schemas, a reference to the evidence record it places but does not define, golden and negative examples, the `.gitignore` fragment and executable CAS sequences | `internal/factory/runstate/contract_test.go`, `internal/factory/runstate/cas_fake_test.go`, `internal/factory/runstate/evidence_cross_contract_test.go` |
| `lifecycle-invariants.json` | SPEC Appendix A's thirteen lifecycle invariants as a conformance suite: each invariant's statement, the live failure that earned it, the symbols it lives in today, and executable sequences against a fake reconciler/executor harness with a named guard per rule | `internal/factory/lifecycle` (`invariants_test.go`, `harness_test.go`, `contract_test.go`) |

The TypeScript readers live in the factory's vitest suite (`worker-boot.test.ts`,
`repo-config.test.ts`, `message-context.test.ts`, `tick-membership.test.ts`,
`sweep-contract.test.ts`, `collect-vocabulary.test.ts`, `tk-json-manifest.test.ts`,
`credential-ownership.test.ts`, `job-protocol.test.ts`,
`ticfac-run-state.test.ts`, `evidence-record.test.ts`, `lifecycle-invariants.test.ts`, and their
siblings).
They import from here by relative path — `../../../contracts/<name>.json` — and
there is deliberately no second copy under `cloud/factory/test/fixtures/`. Two
copies of a parity fixture is the one arrangement guaranteed to defeat it: a
one-sided edit then passes both suites. `cloud/factory/CONTRACTS.md` records how
the factory keeps reaching these files once it is extracted into its own
repository, which is the only reason a copy will ever exist again.

### `job-protocol.json` carries schemas, and is still not `schemas/`

It holds JSON Schema documents, which makes it look like it belongs one
directory over. It does not, for the reason the last section of this file
gives: nothing is generated from it. There are no ticfac types in this
repository to generate — the whole point of freezing these records in Phase 0
is that they are defined *before* the code that implements them, and the code
lands in another repository. What this file needs is not a codegen step but two
validators that disagree loudly, which is what its readers are.

Its schemas are written in the strict subset `internal/tkcontract/schema.go`
and `cloud/factory/test/json-schema.ts` implement — `$ref` (local only),
`type`, `required`, `properties`, `additionalProperties`, `items`, `enum`,
`anyOf`, `description`, `$comment`. A keyword outside that set makes the
contract fail to *parse* on both sides rather than being ignored, so a schema
cannot read as if it constrained something no validator checks.

Note also that its records are **closed** (`additionalProperties: false`),
which is the opposite of the rule the `tk --json` manifest keeps below. That is
deliberate and the two reasons do not conflict: tk publishes one surface many
consumers read, so it must be able to add a field without breaking them, while
an executor record is exchanged between two components that ship together —
there, a field one side invents and the other ignores *is* the bug.

### The `tk --json` manifest is the odd one out

`tk-json-manifest.json` is a **published API surface**, not an input → expected
case table, and its second implementation is not TypeScript-in-this-repo — it is
whatever consumes released `tk` behaviour. Today that is ticfac (SPEC §3.1: "tk
--json is the only tracker API"); tomorrow it is anything else that orchestrates
a tracker it did not compile against.

Three things follow, and they are why the file looks different from its
neighbours:

1. **Its Go reader RUNS every command it lists.**
   `cmd/tk/cmd/tk_json_contract_test.go` looks each entry up in the real command
   tree, executes it against a fixture repository, and validates the actual
   stdout against the schema published here. Every fixture also asserts the
   result is *substantive* — an empty list validates against every schema in the
   file and would prove nothing.
2. **The binary carries it.** It is embedded (`embedded.go`) and reported by
   `tk version --json`, so a consumer holding only an executable can ask which
   contract it serves. A manifest read off disk at runtime could disagree with
   the binary beside it; embedding removes that state.
3. **A consumer can pin it, and tk fails closed.** `--json-contract <n>` (or
   `TK_JSON_CONTRACT`) declares the contract the caller was built against. A
   version this build cannot serve is refused **before the command runs**, with
   exit code 11 — its own slot, so "install a different tk" is distinguishable
   from a routing refusal (1) or a usage error (2) without parsing stderr.

A fourth thing, added when the manifest and SPEC §3.1 were reconciled: **the
manifest records what it does not publish.** §3.1's illustrative call list
named `tk sandbox image|setup|substrate|worker-prompt --json` and `tk ask …
--json`; no `sandbox` subcommand registers a `--json` flag at all, and `tk ask
--json` means *read the question from stdin as JSON* rather than *print the
answer as JSON*, so a consumer reimplementing the list would have blocked on an
empty stdin. The gap is written into the file's top-level `$comment` and
asserted from both sides — publishing one of those commands without editing the
note fails a test — and §3.1 was corrected to the manifest rather than the
reverse. A design document's sketch is not a published surface, and the
difference has to be legible to the host that reimplements from the manifest
alone.

Schemas here keep `additionalProperties` open on purpose: within a contract
version tk may **add** fields, and only a removal or a type change is a break.
Removing a field, renaming one, retyping one, or dropping a command is a new
contract number, added to `supported_contracts` alongside the old one for as
long as consumers need it.

The §3.1 qualification lives in the file's `hosts` block rather than only in the
design doc, because it is part of the contract: a Cloudflare Workflow or isolate
cannot execute a Go binary, so on that host the reconciler **implements this
same contract in its own language** — and proves it with the fixtures in this
directory, `tracker-layout.json` first among them, not by inspection. Such an
implementation is a consumer of the contract, not a second tracker. Every host
that can run `tk` runs `tk`.

### The run-state contract carries a fake, not just a table

`ticfac-run-state.json` is the first fixture here whose case table is not
input → expected but **a sequence of operations against a model**. `cas.fake`
describes a five-operation in-memory git — a shared origin, and per-actor views
of it that can go stale — and `cas.sequences` replays races, restarts and stale
views against it. Both readers implement that fake independently
(`internal/factory/runstate/cas_fake_test.go`,
`cloud/factory/test/git-cas-fake.ts`).

That shape is forced by what the contract pins. SPEC §4.2 defines an idempotent
effect as one whose compare-and-swap proved it had not already happened, and
the two hosts reach that compare-and-swap through different machinery: a local
host through `git push --force-with-lease`, a Worker through the GitHub
contents API. A static table cannot express "B's update is refused because A
moved the ref after B fetched" — that is a sequence, and the guard is only
observable as the difference between two orderings. Both readers also carry the
negative control the same way: disable the guard and every sequence that
expects a refusal must go red.

Because the failure is the quiet kind. A CAS that has stopped guarding does not
raise; it lets a second reconciler dispatch the same attempt, and the run pays
for both jobs.

Two smaller things worth knowing. The evidence record's own fields are **not**
pinned here and no longer have a second schema here either: `references.evidence`
names `job-protocol.json`'s `records.evidence` (`ticfac.evidence.v1`) by
schema_id, and this contract pins the path, the guard and the envelope. One
contract owns where an evidence file goes and how it is written, the other owns
what is in it.

> **Settled in bundle 2.0.0.** In 1.2.0 those were two shapes, not two halves:
> `records.evidence` was flat and closed while this file's `evidence_envelope`
> required a nested `provenance` object and a `key` and was open past it. No
> document satisfied both, and neither reader noticed, because each validated
> its own examples against its own schema. The two contracts landed in the same
> wave from parallel ticks (q8j and x1w) and were merged without reconciling it.
>
> What the fix added is the part worth keeping: **nothing in the bundle was
> looking across files.** Two checks now do, and both have negative controls.
> Each contract's golden evidence example is validated against the OTHER
> contract's rule (`internal/factory/jobprotocol/evidence_cross_contract_test.go`,
> `internal/factory/runstate/evidence_cross_contract_test.go`,
> `cloud/factory/test/evidence-record.test.ts`), and a bundle-wide rule requires
> that **a `schema_id` appearing in more than one contract file resolves to
> exactly one definition** (`contracts.VerifySchemaIDs`, and `verifySchemaIds`
> in `cloud/factory/scripts/contracts.mjs`). A record two contracts describe is
> a record one of them must define.
>
> The strict subset has no cross-file `$ref`, so `$defs.provenance`, `phase`,
> `executor` and `role` are copied into this file and compared structurally by
> the readers. A copy nothing compares is how the first divergence happened.

And the `.gitignore` fragment is
asserted against the real file with `git check-ignore` — ticks is a ticfac
target like any other, so "the fragment is defined" has to mean git applies it,
not that a JSON file mentions it.

For one wave there were **two** TypeScript strict-subset validators —
`json-schema.ts` (job-protocol) and `schema-subset.ts` (run-state) — written
independently against the same subset of `internal/tkcontract/schema.go`, and
left in place with the call deferred to the epic's final review. That review
made it (bundle `3.0.0`): there is **one**, `cloud/factory/test/json-schema.ts`.
The second copy was the weaker of the two — `required` checked with `in`,
keyword values not type-checked, divergent refusal text, no unknown-keyword
test — and a second spelling of one rule is precisely the drift these fixtures
exist to catch, reproduced inside the machinery meant to catch it. Every
TypeScript reader here now validates through the one file, which is also what
lets a fixture pin `expect_error_contains` once and have it mean the same thing
to Go and to TypeScript.

### The invariant suite is a gate, not a case table

`lifecycle-invariants.json` is the second fixture here whose cases are
sequences against a model rather than input -> expected, and the first that is
a **claim about who has to run it**. SPEC Appendix A's thirteen invariants were
each paid for by a failed live run; §12 Phase 0 step 7 says to encode them
"before any reconciler code exists", which is why they are in `contracts/` and
not in a package.

Three things follow from that, and they are what make the file different from
its neighbours:

1. **It ships with its own executor.** `harness` describes a small state
   machine — a stop record, credentials, jobs, an origin, a host step, a poll
   cadence, holds, claims, a budget, evidence — with a closed op vocabulary,
   and both readers implement it independently
   (`internal/factory/lifecycle/harness_test.go`,
   `cloud/factory/test/lifecycle-harness.ts`). No git, no container, no
   network, no clock: the suite runs where the reconciler does not exist yet,
   and ticfac inherits it unchanged.
2. **Every rule names a guard, and every guard is proven to bite.** Fifteen
   named guards, one or two per invariant. Each reader replays an invariant's
   sequences with its guards turned OFF and requires at least one to stop
   matching the contract. This is the run-state CAS negative control
   generalised: these thirteen failures are all the quiet kind — a boundary
   that stopped enforcing, a poll that stopped keeping alive, a fingerprint
   nobody checks — and none of them raise. The vocabulary is closed over both
   modes on purpose, because the guard-off answers (`recorded`,
   `stuck_awaiting_claimer`, `reported_requested`) are exactly what a WRONG
   implementation produces.
3. **`gate` is part of the contract.** It names the reconciler and each
   executor the SPEC plans, and says the invariants may not be waived by a
   profile, a deployment var or a prompt. A new EXECUTOR re-runs this suite; a
   new runner on an existing executor does not (§12 Phase 1 step 3: claude,
   codex and pi are runners on one worktree-per-attempt executor, so Appendix A
   is tested once).

Each invariant also carries `earned_from` — the live failure — and `today`, the
file-and-symbol list of where the rule lives now. **The Go reader is the one
that greps**: `internal/factory/lifecycle` opens each named file and requires
each named symbol to still be in it. The vitest reader cannot — it executes
inside workerd, which has no filesystem — so it checks the cross-reference's
shape (every invariant names a site, every site names symbols and a note) and
leaves the existence check to Go. One side greps, both sides read the same
file, and that is enough: §9.2 preserves run-workflow.ts's symbols when it is
decomposed, this preserves the reasons, and a cross-reference nobody verifies
rots into a list of names that used to exist.

Appendix A #13's four fingerprint fields are the one thing the file does not
define: `harness.fingerprint_fields` maps Appendix A's English names onto
`job-protocol.json`'s `$defs.provenance` and both readers follow the pointer,
asserting each field is a property of provenance *and* required by it. That is
the bundle 2.0.0 rule applied a third time — a record two contracts describe is
a record one of them must define.

### What is NOT a contract

`cloud/factory/test/fixtures/omp-tool-call-exchange.json` looks like it belongs
here and does not. It is not a hand-written case table pinning a rule two
implementations must agree on — it is a **recording** of real traffic, written
by `scripts/verify-harness-tool-execution.mjs` from an actual omp binary and
replayed by `gateway-tool-calls.test.ts`. It has one reader by nature: there is
no second implementation to drift from, only a third-party CLI whose behaviour
it captures. Re-record it, do not reconcile it, and leave it where it is.

`collect-vocabulary.json` is the one with **three** implementations rather than
two: `internal/herd/collect` (local runs), `internal/cloud/collect` (the laptop
side of a cloud run) and `cloud/factory/src/worker-collect.ts` (the Worker). The
two Go halves used to be the same type by import, so drift between them was
impossible by construction; they are now copies, and this fixture is what stands
in for the compiler. A verdict or status string re-spelled in one of the three
makes a cloud run and a herd run disagree about what happened to the same tick,
with nothing failing — the report just quietly means something else.

## Why here, and not `schemas/`

`schemas/` is the JSON Schema → generated types pipeline: `make codegen-go` and
`make codegen-ts` turn those schemas into Go and TypeScript type declarations,
and `schemas/fixtures/` holds *instances* of those generated types for roundtrip
tests. Repo policy gates every edit under `schemas/` on running both codegen
targets and committing the regenerated output.

These files are not type schemas and there is nothing to generate from them.
They are behavioural case tables — accepted and refused inputs, exact refusal
message text, ordering rules, marker strings. Filing them under `schemas/` would
subject every fixture edit to a codegen gate that produces no output, which
turns a real rule into a ritual. Hence a sibling directory.

## Adding a contract

1. Put the JSON here, kebab-case, named for the thing it pins. Use `*-cases.json`
   for input → expected tables and `*-contract.json` (or a bare noun) for a
   pinned surface.
2. Add the Go reader as a `*_parity_test.go` in the package that owns the
   format, reading by relative path from this directory.
3. Add the TypeScript reader in the same commit, or the next one — a fixture
   with only one reader detects nothing.
4. Add a row to the table above.
5. Bump `version` in `bundle.json` (a new contract is a MINOR bump), add the
   `CHANGELOG.md` entry, run `make contracts-bundle`, and add the file to
   `files` — plus `bundleVersion` — in `cloud/factory/contracts.pin.json`. The
   checks on both sides name whichever of these you skipped.
