# Cross-language contracts

The JSON files in this directory are **case tables and pinned surfaces that more
than one language reads**. Every one of them describes a format that `ticks`
owns — `.tick/runners.toml`, the tracker's on-disk layout, the sandbox worker
boot handshake, the message context the operator composes — and that at least one other
implementation — usually the factory Worker's TypeScript — has to parse too.

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
| `bundle.json` | the manifest — `version`, the file list, and a sha256 per file |
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

Do **not** re-cut the digests without bumping the version. A consumer pinned to
`1.0.0` cannot see that `1.0.0` came to mean something else; that invisibility
is exactly what the version exists to remove.

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

The TypeScript readers live in the factory's vitest suite (`worker-boot.test.ts`,
`repo-config.test.ts`, `message-context.test.ts`, `tick-membership.test.ts`,
`sweep-contract.test.ts`, `collect-vocabulary.test.ts`, `tk-json-manifest.test.ts`,
`credential-ownership.test.ts`, and their siblings).
They import from here by relative path — `../../../contracts/<name>.json` — and
there is deliberately no second copy under `cloud/factory/test/fixtures/`. Two
copies of a parity fixture is the one arrangement guaranteed to defeat it: a
one-sided edit then passes both suites. `cloud/factory/CONTRACTS.md` records how
the factory keeps reaching these files once it is extracted into its own
repository, which is the only reason a copy will ever exist again.

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
