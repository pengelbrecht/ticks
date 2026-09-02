---
type: architecture
source: from-chat
covers: [contracts, cloud/factory/scripts/contracts.mjs, cloud/factory/contracts.pin.json, cloud/factory/CONTRACTS.md]
verified_against: 5a1e1f7f
status: active
---

## Compiled Truth

**`contracts/` at the repo root holds every rule that more than one
implementation has to obey.** Thirteen files at bundle `2.0.0` — nine
behavioural case tables, plus `tk-json-manifest.json` (a published API surface),
`credential-ownership.json`, `job-protocol.json` (record schemas, including the
bundle's one evidence record), and `ticfac-run-state.json` (a case table over an
in-memory *model*, not over inputs — see below). Both languages read them, and a
one-sided edit fails a build — that is the whole point and it is proven, not
assumed (see *Every contract is proven to bite*).

Established by epic `kka`, the second phase of the factory extraction.

### Why here and not `schemas/`

`schemas/` is the JSON Schema → generated-types pipeline; its `fixtures/` holds
*instances of generated types*. The contracts are **behavioural case tables** —
accepted/refused input lists, exact refusal text, field ordering, probe markers.
There is nothing for codegen to generate from them.

Decisive: `.tick/config.md` mandates running **both** codegen targets on any
edit under `schemas/`. Filing case tables there would gate every fixture edit on
a codegen run producing zero output — **turning a real rule into a ritual, and
rituals get skipped**, weakening the rule for the schemas that need it.

### "Cross-language" is the common case, not the requirement

Two Go packages re-implementing one rule belong here too.
`contracts/collect-vocabulary.json` is three-sided and **two of the three are
Go** (`internal/herd/collect`, `internal/cloud/collect`) — they used to be one
type by import, so drift was impossible; they are copies now and the contract
stands in for the compiler.

### `tk-json-manifest.json` is a published API surface, not a case table

Added by tick `rs2` (ticfac Phase 0, SPEC §3.1). Its second implementation is
not TypeScript-in-this-repo — it is **whatever consumes released `tk`
behaviour**, ticfac first. Three consequences that make it look unlike its
neighbours:

- **Its reader RUNS the surface.** `cmd/tk/cmd/tk_json_contract_test.go` looks
  each of the 15 published commands up in the real cobra tree, executes it
  against a fixture repository, and validates the actual stdout. Each fixture
  additionally asserts the result is *substantive* — this caught `tk ready
  --json` and `tk next --json` passing while returning nothing, because both
  filter to the detected owner unless given `--all`, and **an empty list
  validates against every schema in the file**.
- **The binary carries it** (`embedded.go`), and `tk version --json` reports the
  contract number out of those same bytes. A manifest read off disk could
  disagree with the binary beside it.
- **Consumers pin it and tk fails closed.** `--json-contract <n>` /
  `TK_JSON_CONTRACT`, refused *before the command runs* with exit **11** — its
  own slot, because "install a different tk" is neither a retry (1) nor a
  command-line fix (2).

Two design calls worth not re-deriving: schemas keep `additionalProperties`
**open**, so within a contract number tk may add fields and only a removal or a
retype is a break; and `internal/tkcontract`'s validator **rejects any JSON
Schema keyword it does not implement** rather than ignoring it, because a
validator that skips what it does not understand publishes a schema that asserts
nothing. The subset is deliberately small; growing it is a code change.

The §3.1 non-tk-host rule lives in the file's own `hosts` block, not only in the
design doc: a Cloudflare Workflow or isolate cannot exec a Go binary, so it
implements this same contract in its own language and proves it against
`tracker-layout.json` and its siblings. Every host that *can* run `tk` runs `tk`.

### What is NOT a contract

`cloud/factory/test/fixtures/omp-tool-call-exchange.json` stays where it is. It
is a **recording** of real omp traffic written by
`scripts/verify-harness-tool-execution.mjs` and replayed by a test — one reader
by nature, no second implementation to drift from.

## Distribution after the repo split

`cloud/factory/scripts/contracts.mjs`, pinned by `contracts.pin.json`, documented
in `cloud/factory/CONTRACTS.md`.

**The safety argument is structural, not a promise:**

| | network? | when |
|---|---|---|
| `contracts:check` | **never** | chained into `pnpm test` and `pnpm typecheck`, plus its own CI step |
| `contracts:sync` | yes | only when a human bumps the pin |

Because the gate makes no network call, **no network failure can turn a run
green by skipping**. Offline runs pass correctly — the files are checked in.
Because the fetch is off the test path, a proxy outage can only make a
deliberate pin bump fail loudly.

Transport follows the existing precedent rather than inventing a second one: the
same public module proxy `cloud/sandbox/Dockerfile` already uses for
`go install …@${TK_SOURCE_REF}`. A Go module zip carries non-Go files, so
`contracts/*.json` rides along; per-file sha256 digests give the guarantee
without needing a Go toolchain in the extracted repo's CI.

`check` asserts the pinned file set **equals** the set the suite imports, both
directions fatal. That is what stops the list rotting into a no-op — it caught a
contract arriving from a sibling tick mid-work.

**Rejected:** fetch-at-test-time (puts a network call on the path that must fail
closed; the first offline developer adds the fallback that is the forbidden
no-op); npm publish (a registry identity to maintain, for nine JSON files);
git submodule (an un-initialised submodule is a very quiet empty directory).

### `ticfac-run-state.json` pins a sequence, not an input

Added by ticfac Phase 0 (tick `x1w`, SPEC §4.2/§10.4). It freezes the `.ticfac/`
run-state layout, the persistence policy and the compare-and-swap rules — and it
is the first fixture here whose case table is **a sequence of operations against
a model** rather than input → expected.

It has to be. SPEC §4.2 defines an idempotent effect as one whose
compare-and-swap proved it had not already happened, and the guard is only
observable as the difference between two orderings: *B's update is refused
because A moved the ref after B fetched* is not a row in a table. So the
contract carries `cas.fake` — a five-operation in-memory git (shared origin,
per-actor views that can go stale) — and `cas.sequences` replays races,
restarts and stale views against it. Both sides implement the fake
independently: `internal/factory/runstate/cas_fake_test.go` and
`cloud/factory/test/git-cas-fake.ts`.

Two mechanisms, one rule, no compiler between them: a local host reaches the
compare-and-swap through `git push --force-with-lease`, a Worker through the
GitHub contents API (which is a compare-and-swap on the branch ref, and is
already what the signal funnel relies on).

The negative control is built into the fixture's readers rather than performed
once by hand: **disable the guard and every sequence that expects a refusal must
go red.** That inversion is checked on both sides on every run, because the
failure mode is silent — a guard that has stopped guarding does not raise, it
lets a second reconciler dispatch the same attempt and the run pays for both
jobs.

Two smaller things worth knowing about the file:

- **The evidence record's fields are deliberately NOT pinned here.** Since
  bundle 2.0.0 there is no second schema for it either: `references.evidence`
  names `job-protocol.json`'s `ticfac.evidence.v1` by schema_id, and this
  contract owns the path, the guard and the envelope. In 1.2.0 the two files
  carried two incompatible shapes of the same record and both suites stayed
  green, because nothing in the bundle validated one contract's document
  against the other contract's rule. Two checks now do — the cross-file golden
  tests, and the rule that a `schema_id` in more than one contract file
  resolves to exactly one definition — each with a negative control.
- **The `.gitignore` fragment is asserted against the real file**, with
  `git check-ignore` — ticks is a ticfac target like any other, so "the fragment
  is defined" means git actually applies it, not that a JSON file mentions it.

## Every contract is proven to bite

All nine case tables were broken on **both** the Go and the TypeScript side and
confirmed red, then reverted and confirmed green (ticks `i0o`, `i61`).

`tk-json-manifest.json` was proven the same way and is the one exception to the
"edit the implementation, never the contract" method below: it has no second
implementation in this repo yet, so the mutation ran on the manifest itself —
a required field added, an item type flipped — and every one of the 13 JSON
subtests plus both merge-driver subtests went red (tick `rs2`).

**The method matters.** Edit an *implementation*, never the contract file —
editing the contract changes what both sides compare against, so both go red for
a trivial reason and prove nothing. A contract that fails on a Go edit but not a
TS edit is **half a contract**, and the TS half is the one that leaves at
extraction.

No silent-orphan contract was found.

## Gotchas

- **`extensions/ticks-runner` is a permanent in-repo consumer.** The collect
  vocabulary has **five** implementations, not three; the runner's two do NOT
  move to ticfac. So `contracts/` serves both sides of the split forever, and
  the distribution mechanism has to keep working for a consumer that stays.
- **The runner's two readers already disagreed when found**: `recovery.ts` had
  `DONE` before `DONE_WITH_CONCERNS` (saved only by a `\b`), and `runner.ts`
  silently failed to parse a colon separator, an en-dash, and markdown
  decoration — so a worker's blocker was dropped on the floor rather than
  reported. Both now read the contract.
- **A behavioural fixture cannot pin an alternation order.** The ordering and
  the `\b` defend the same inversion, and `_` is a word character, so `DONE\b`
  cannot match inside `DONE_WITH_CONCERNS` even with `DONE` first. The contract
  pins the **regexp source byte-for-byte** instead.
- **Adding a contract is not free.** The palette is deliberately uncontracted:
  divergence there is the design, and a fixture would fire on every legitimate
  restyle, get silenced, and rebuild the coupling the copy removed. The bar is
  *drift causes a problem someone notices*, not *drift is possible*.
- **A live render beats a fixture where one exists.** The two boards' key
  bindings are pinned by comparing their real rendered footers in the one
  package that ships both — nothing can be true in a fixture and false on screen.

## Timeline
- 2026-09-02 — bundle `2.0.0`: the evidence record reconciled to ONE definition
  (`job-protocol.json` `ticfac.evidence.v1`, nested provenance, required `key`),
  `ticfac-run-state.json` reduced to a reference, and two new checks that look
  ACROSS contract files — the cross-file golden validation and "a `schema_id` in
  more than one file resolves to exactly one definition" — tick `atx`
- 2026-09-02 — `ticfac-run-state.json` added (bundle `1.2.0`): the `.ticfac/`
  layout, persistence policy and compare-and-swap rules, with the first
  model-based case table and a built-in guard-disabled negative control — tick
  `x1w`
- 2026-08-28 — `contracts/` established, distribution pinned, all nine proven to
  fail on drift, the runner's two readers wired in — @5a1e1f7f
