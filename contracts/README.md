# Contracts

This directory is the **contract bundle for ticks' own formats**: the two
surfaces another product may build against without compiling ticks. Since
bundle 7.0.0 it holds exactly two contract files:

| file | what it pins | Go reader in this repo |
|---|---|---|
| `tk-json-manifest.json` | the published `tk --json` command surface: which commands a consumer may call, their argv, and the JSON schema of what they print | `cmd/tk/cmd/tk_json_contract_test.go` (runs every listed command), `internal/tkcontract` (embedded copy, `--json-contract` negotiation) |
| `tracker-layout.json` | the on-disk tracker layout (`.tick/issues/<id>.json`, field names, status vocabulary, trace id shape) for a host that reads or writes records without running `tk` | `internal/tick/tracker_layout_parity_test.go` |

The other side of each is **ticfac**, which runs `tk` for every tracker read and
write, and whose control plane reads and writes records directly where it cannot
run a Go binary.

Everything that used to sit beside these — the executor job protocol, run state,
lifecycle invariants, collect vocabulary, run event feed, runners config, worker
boot, message context, sweep selection and policy, signal sources, sandbox image
and credential ownership fixtures — describes ticfac's formats, not ticks'. They
left the bundle at 7.0.0 and ticfac authors them (see `CHANGELOG.md`, 7.0.0).

## The bundle: versioned, pinned, executable

The two files are a **bundle with a version**, because their consumer lives in
another repository and pins it by exact value. Three files make that real:

| file | what it is |
|---|---|
| `bundle.json` | the manifest — `version`, the file list, a sha256 per file, and `version_digests` |
| `CHANGELOG.md` | what each version changed, and the rule that governs bumps |
| ticfac's `contracts.pin.json` | the consumer's pin: `bundleVersion`, by exact value |

A version is only worth anything if it always names the same bytes, so the
manifest records a digest per file and `version_digests` — an append-only ledger
binding each version to a digest over its digests, written the first time the
version is cut and never rewritten. `make contracts-bundle-check`
(`scripts/contracts-bundle.mjs --check`) re-hashes the files here and refuses a
stale manifest, a version with no changelog entry, and a re-cut at a version
the ledger already records. ticfac's verifier does the same from its side.

### Changing a contract

1. Edit the file and the code that implements it in one commit.
2. Bump `version` in `bundle.json` — MAJOR when a consumer that does nothing is
   now wrong (a rule changed, a file or field removed), MINOR when it is still
   correct but incomplete (something added), PATCH for prose only.
3. Add the `CHANGELOG.md` entry: what changed and what a consumer must do.
4. `make contracts-bundle` to rewrite `files`, `digests` and the ledger entry —
   once, when the bytes are final.
5. ticfac moves its pin when it has read the entry.

## `tk-json-manifest.json`

A **published API surface**, not a case table: its second implementation is
whatever consumes released `tk` behaviour. Three things follow:

1. **Its Go reader runs every command it lists.**
   `tk_json_contract_test.go` looks each entry up in the real command tree,
   executes it against a fixture repository, and validates the actual stdout
   against the schema published here. Every fixture also asserts the result is
   substantive — an empty list validates against every schema and proves
   nothing.
2. **The binary carries it.** It is embedded (`embedded.go`) and reported by
   `tk version --json`, so a consumer holding only an executable can ask which
   contract it serves.
3. **A consumer can pin it, and tk fails closed.** `--json-contract <n>` (or
   `TK_JSON_CONTRACT`) declares the contract the caller was built against. A
   version this build cannot serve is refused before the command runs, with exit
   code 11 — its own slot, distinguishable from a routing refusal (1) or a usage
   error (2) without parsing stderr.

The manifest also records what it does **not** publish (its top-level
`$comment`): invocations a design document sketched that are not a JSON surface.
A test asserts the note against the manifest, so publishing one of them without
editing the note fails.

Schemas keep `additionalProperties` open on purpose: within a contract version
tk may add fields, and only a removal or a type change is a break. Removing,
renaming or retyping a field, or dropping a command, is a new contract number,
added to `supported_contracts` beside the old one for as long as consumers need
it. The bundle version and the contract number are different claims: the first
names bytes, the second names the command surface a caller may rely on.

## `tracker-layout.json`

The tracker's record format as seen by a host that cannot run `tk`. Go's
`internal/tick` Store owns the format and writes every record `tk` writes; a
reader or writer in another language pins itself to this file instead of
re-deriving the layout from Go source. It matters because such a reader fails
open — a record it cannot parse reads as "unreadable", not as an error — so a
layout change landing in Go alone would silently disable its checks. The parity
test is what makes that change fail here first.

## Why here, and not `schemas/`

`schemas/` is the JSON Schema → generated types pipeline (`make codegen-go`,
`make codegen-ts`), gated on regenerating output. These files are not type
schemas and generate nothing; filing them there would put a codegen gate that
produces no output in front of every contract edit.
