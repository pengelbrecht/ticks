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

The TypeScript readers live in the factory's vitest suite (`worker-boot.test.ts`,
`repo-config.test.ts`, `message-context.test.ts`, `tick-membership.test.ts`,
`sweep-contract.test.ts`, `collect-vocabulary.test.ts`, and their siblings).

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
