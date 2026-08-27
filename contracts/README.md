# Cross-language contracts

The JSON files in this directory are **case tables and pinned surfaces that more
than one language reads**. Every one of them describes a format that `ticks`
owns — `.tick/runners.toml`, the tracker's on-disk layout, the sandbox worker
boot handshake, the message context the operator composes — and that a second
implementation, written in TypeScript, has to parse too.

Go reads these files from its `*_parity_test.go` tests. The factory Worker's
vitest suite reads the same files. That is the whole point: **the two sides are
pinned to one file, so a rule changed on one side and not the other fails a
test.**

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
Change the rule in *both* implementations and in the fixture, in one commit, or
do not change it.

Corollary: never "fix" a red parity test by relaxing the fixture to match
whichever side you just edited. That silently disables the detector and leaves
the two implementations disagreeing.

## The files

| File | Contract | Go reader |
|---|---|---|
| `runners-config-contract.json` | `[sandbox].image` and `[orchestration].max_parallel` validation in `.tick/runners.toml` | `internal/herd/config/runners_config_parity_test.go` |
| `signal-source-cases.json` | accepted/refused webhook signal sources | `internal/herd/config/signal_parity_test.go` |
| `sweep-policy-cases.json` | sweep policy parsing and refusals | `internal/herd/config/sweep_parity_test.go` |
| `sweep-selection-contract.json` | which ticks a sweep selects, and the fields that decide it | `internal/herd/config/sweep_parity_test.go`, `internal/tick/sweep_selection_parity_test.go` |
| `sandbox-image-cases.json` | sandbox image reference acceptance | `internal/sandbox/image_parity_test.go` |
| `worker-boot-contract.json` | per-tick worker boot commands, probe and cancel markers | `internal/sandbox/worker_parity_test.go` |
| `message-context.json` | the message context block the operator composes | `internal/operator/message_context_parity_test.go` |
| `tracker-layout.json` | the tracker's on-disk record layout and field order | `internal/tick/tracker_layout_parity_test.go` |

The TypeScript readers live in the factory's vitest suite (`worker-boot.test.ts`,
`repo-config.test.ts`, `message-context.test.ts`, `tick-membership.test.ts`,
`sweep-contract.test.ts`, and their siblings).

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
