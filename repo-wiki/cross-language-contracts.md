---
type: architecture
source: from-chat
covers: [contracts, internal/tkcontract, scripts/contracts-bundle.mjs, embedded.go]
status: active
---

## Compiled Truth

**`contracts/` holds the formats ticks owns and a second implementation has to
obey.** After the tracker-only cut (epic `chz`) that is two files:

- `tk-json-manifest.json` — the published `tk --json` surface.
- `tracker-layout.json` — the on-disk `.tick/` layout.

Every other contract that used to live here (runner config, sandbox image and
worker boot, job protocol, run state, lifecycle invariants, collect vocabulary,
sweep and signal tables, message context, credential ownership, run events) is
ticfac's and is maintained there. The bundle CHANGELOG names where each went.

### Why here and not `schemas/`

`schemas/` is the JSON Schema to generated-types pipeline. The contracts are
pinned surfaces and case tables with nothing to generate from, and filing them
under `schemas/` would gate every edit on a codegen run that produces nothing.

### `tk-json-manifest.json` is a published API surface

Its second implementation is whatever consumes released `tk` behaviour, ticfac
first.

- **Its reader runs the surface.** `cmd/tk/cmd/tk_json_contract_test.go` looks
  each published command up in the real cobra tree, executes it against a
  fixture repository, and validates the actual stdout. Each fixture also asserts
  the result is substantive, because an empty list validates against every
  schema.
- **The binary carries it** (`embedded.go`), and `tk version --json` reports the
  contract number from those same bytes.
- **Consumers pin it and tk fails closed.** `--json-contract <n>` /
  `TK_JSON_CONTRACT` is refused before the command runs, with exit 11.

Schemas keep `additionalProperties` open, so within a contract number tk may add
fields; only a removal or a retype is a break. `internal/tkcontract`'s validator
rejects any JSON Schema keyword it does not implement rather than ignoring it.

### The bundle

`contracts/bundle.json` lists the files with a sha256 each and a version;
`contracts/CHANGELOG.md` records what each version changed. Re-cut it with
`make contracts-bundle` (`scripts/contracts-bundle.mjs`) after a contract change;
`make contracts-bundle-check` fails when it is stale. ticfac pins the bundle
version by exact value and verifies the bytes offline.

## Timeline
- 2026-08 — contracts established during the factory extraction (epic `kka`).
- 2026-09-26 — reduced to ticks' own formats (epic `chz`); the rest moved to ticfac.
