# How the factory gets `contracts/`

The factory's vitest suite asserts against the cross-language contracts in the
repository root `contracts/` directory — the same files the Go parity tests
read. `contracts/README.md` says what they are and why a one-sided edit is the
thing they exist to catch. This file says how the **TypeScript** side gets hold
of them, today and after the factory is extracted into its own repository.

Implementation: `contracts.pin.json` and `scripts/contracts.mjs`.

## The problem this solves

Today the factory lives inside the ticks repository, so `contracts/` is three
directories up and a relative import is the whole mechanism:

```ts
import layout from "../../../contracts/tracker-layout.json";
```

After the extraction the factory is a separate repository. There is no `../../..`
that reaches ticks, and the contracts are still owned by ticks — the Go readers
stay there, and so does at least one TypeScript reader that is **not** moving
(`extensions/ticks-runner`). So `contracts/` will permanently have consumers on
both sides of the split. The directory does not move; a copy has to travel.

The requirement is not that a copy exists. It is that **a Go/TS divergence
fails a build after the split** — which means the copy has to be pinned to a
known ticks version and verified, and every way that verification can fail has
to be loud.

## What was chosen

**Vendor a copy of the pinned `ticks` module version into the consuming
repository's root `contracts/`, verified on every test run by an offline
digest check.**

Two commands, and the split between them is the entire safety argument:

| | `pnpm contracts:check` | `pnpm contracts:sync` |
|---|---|---|
| when | every `pnpm test`, every `pnpm typecheck`, its own CI step | only when a human bumps the pin |
| network | **never** | required |
| on failure | exit 1 | exit 1, writes nothing |

`check` is the gate and it makes no network call, so **no network failure can
turn a test run green by skipping.** `sync` is the only thing that needs the
proxy, and it is not on the test path, so a proxy outage can only make a
deliberate pin bump fail — never make a test run lie.

### Why the module proxy, and why a pin

`cloud/sandbox/Dockerfile` already consumes ticks as a published,
version-pinned artifact: it `go install`s `tk` at `TK_SOURCE_REF` through the
public Go module proxy, and the checksum database verifies what it got. The
image is *already* a downstream consumer of a pinned ticks version.

`contracts:sync` is the same shape — same public proxy, same module, a pinned
version — rather than a second, differently-shaped mechanism. A Go module zip
contains the module's non-Go files too, so `contracts/*.json` is in it. The
per-file sha256 digests recorded in `contracts.pin.json` give the check its
guarantee without needing a Go toolchain in the consuming repository's CI.

### Why the copy lands at the repository root

The vendored copy goes to the **consuming repository's root** `contracts/`,
which is exactly where the ticks copy sits relative to `cloud/factory`. That is
deliberate: `../../../contracts/<name>.json` resolves to the right file in both
worlds, so **the extraction does not touch a single test file.** Thirteen
imports stay as they are.

### Why not the alternatives

**Fetch at test time from a pinned ref.** Rejected. It makes the test suite
network-dependent, which is a standing cost paid on every run for a check that
changes only when someone bumps a pin — and it puts a network call on the path
that must fail closed, which is precisely where you least want one. The moment
it is network-dependent, somebody offline adds a fallback, and the fallback is
the silent no-op the requirement forbids.

**Publish an npm package alongside the `schemas` codegen.** Rejected on two
counts. It needs publishing infrastructure and a registry identity that this
project does not have and would have to maintain, for fourteen JSON files. And it
diverges from the precedent already in the tree: the sandbox image consumes
ticks through the module proxy, and a second distribution channel for the same
repository is a second thing to keep in step. Note also that `contracts/README.md`
argues against filing these under `schemas/` at all — there is nothing to
generate from them.

**A git submodule.** Rejected. It pins, but it is verified by nothing except
git, and the standard failure mode is an un-initialised submodule producing an
empty directory. An empty `contracts/` must be an error, and with a submodule
it is a very quiet one.

### The bundle version, and what it is pinned by

`contracts/` is a **versioned bundle**, not a directory of files. Its manifest
`contracts/bundle.json` carries a `version`, the file list, a sha256 per file,
and `version_digests` — the append-only ledger recording the digest each
version was first cut with, which is what makes "do not re-cut without bumping"
a check rather than a habit. `contracts/CHANGELOG.md` says what each version
changed and who has to follow. This package pins that version **by exact
value** in `contracts.pin.json`:

```json
"bundleVersion": "2.1.1"
```

The pin is what makes the extraction survivable. `ref` says which *ticks
module version* the vendored copy came from — a mechanical fact about a
download. `bundleVersion` says which *contract version this package's code was
written against* — a claim about behaviour, and the one the ticfac SPEC (§3.2)
requires. They move together at extraction and independently afterwards: ticks
can publish twenty module versions that do not touch a contract, and the bundle
version stays where it is.

### What `check` actually asserts

1. `contracts.pin.json` exists, parses, and names a known mode.
2. The set of contracts pinned is **exactly** the set the test suite imports.
   Both directions are fatal: a contract imported but not pinned is one nothing
   vendors or verifies; a contract pinned but not imported is a fixture with a
   single reader, which `contracts/README.md` is explicit detects nothing. This
   is what stops the file list rotting into a no-op as contracts are added.
3. Every pinned file is present in `contracts/` and parses as JSON.
4. **In every mode:** `contracts/bundle.json` exists, its `version` equals
   `bundleVersion`, its file list equals the pinned list, every listed file
   hashes to the digest it records, no unlisted `*.json` is sitting in
   `contracts/`, and `contracts/CHANGELOG.md` has an entry for the version.
5. **In `pinned` mode only:** every file's sha256 also matches the digest
   recorded in `contracts.pin.json` for the pinned module version.

Steps 4 and 5 answer different questions, which is why both exist. Step 4 asks
*does this bundle version still name these bytes* — a question about the
contract. Step 5 asks *is this the copy ticks published at `ref`* — a question
about the download. Step 4 is meaningful in workspace mode because the version
is pinned there too; step 5 is not, because nothing was downloaded.

> **Note on an earlier decision.** This file previously argued that a digest
> check in `workspace` mode "would add nothing a second reader does not already
> provide" and would turn a real rule into a ritual. That was right when the
> only thing a digest could verify was a vendored copy — and in workspace mode
> there is no vendored copy. A *versioned* bundle changes the question. Once a
> consumer pins `1.0.0` by exact value, the same version quietly coming to mean
> different bytes is the one failure it cannot see, and the repository that
> authors the fixtures is exactly where that happens. So the digests are now
> checked in place, and the cost — you cannot change a contract without bumping
> the version and writing the changelog entry — is the thing being bought, not
> a ritual.

### Proving the check can fail

`scripts/contracts.test.mjs` (run by `pnpm contracts:test`, chained into
`pnpm test`, and its own CI step) breaks the bundle in a throwaway copy and
asserts `verifyBundle` refuses each break — an edited fixture, an unlisted
fixture, a missing fixture, a stale version pin, a version with no changelog
entry, a disagreeing file list, an absent `bundleVersion`, a manifest re-cut at
an unchanged version, and a version whose `version_digests` entry has been
deleted. `internal/contracts/bundle_test.go` does the same on the Go side, and
also asserts that Go's canonical digest form agrees with the JavaScript
generator's — two independent conventions that happen to agree today would not
be a cross-language check.

They run under plain `node --test` rather than vitest because the factory suite
executes inside workerd, which has no filesystem to build a broken bundle in.

This is the SPEC's requirement discharged in the only form that means anything:
a deliberate fixture break **is shown** to fail a build, rather than asserted
to.

## Failure behaviour, stated plainly

This is the part that matters, so it is enumerated rather than implied. **No
path through `scripts/contracts.mjs` warns and continues.**

| situation | what happens |
|---|---|
| offline, `pnpm test` | **passes**, and correctly so — `check` never touches the network, and the vendored files are checked in |
| offline, `pnpm contracts:sync` | exit 1, names the proxy, writes nothing; the on-disk vendor is left intact |
| pinned ref does not exist | exit 1 on HTTP 404/410, explaining that the ref must be a *resolved module version* (a tag or pseudo-version), not a branch or short sha |
| proxy returns any other error | exit 1 with the status code |
| network drops mid-fetch | exit 1; files are staged in memory and written only after **every** pinned file resolved, so a half-updated `contracts/` cannot be left behind |
| pinned version has no `contracts/` dir, or is missing one file | exit 1 naming the missing files, **nothing written** — a partial vendor is exactly the half-updated state these fixtures exist to prevent |
| a vendored file was edited locally | exit 1 on digest mismatch, on the next `pnpm test` |
| `contracts/` absent or empty | exit 1 |
| `contracts.pin.json` deleted | exit 1 |
| a new contract import added without pinning it | exit 1 |
| a pinned contract no longer imported | exit 1 |
| `contracts/bundle.json` absent or unparseable | exit 1 |
| the bundle version is not `bundleVersion` | exit 1, naming both |
| a fixture edited without the bundle being re-cut | exit 1 on digest mismatch |
| a fixture on disk that the bundle does not list | exit 1 |
| a bundle version with no `contracts/CHANGELOG.md` entry | exit 1 |
| the manifest re-cut at a version `version_digests` already records | exit 1, naming both digests |
| `version_digests` has no entry for the version on disk | exit 1 |
| `bundleVersion` absent from the pin | exit 1 |
| archive is corrupt or uses an unexpected compression method | exit 1 |

The one row worth dwelling on is the first: **offline test runs pass.** That is
the reason vendoring was chosen over fetch-at-test-time. The check still runs
offline and still fails on a tampered or missing file — it is not skipped, it is
answerable without a network. The only thing that needs the network is the act
of adopting a new ticks version, which is a deliberate, online act by a person.

## What the extraction phase must do

The mechanism is in the tree and passing today in `workspace` mode. Extraction
turns it on. In order:

1. **Publish a ticks version containing `contracts/`.** A tag is simplest; a
   pseudo-version for an unreleased commit works too. `contracts:sync` resolves
   through the module proxy, so the version must be *resolvable* — `go list -m
   github.com/pengelbrecht/ticks@<commit>` prints the pseudo-version to use. A
   branch name or a short sha is **not** resolvable and `sync` will 404 and say
   so.
2. **Keep `cloud/factory` two levels below the new repository's root**, or
   change `REPO_ROOT` in `scripts/contracts.mjs` *and* every
   `../../../contracts/...` import in `test/` together. Keeping the position is
   free and means no test file changes.
3. **Edit `contracts.pin.json`:** set `"mode": "pinned"` and `"ref"` to the
   version from step 1. Leave `files` alone unless readers changed — `check`
   verifies it against the imports and will tell you if it is wrong. Leave
   `bundleVersion` alone too: it is the contract version, not the module
   version, and extraction does not change which contracts the code follows.
4. **Run `pnpm contracts:sync`.** It writes `contracts/` at the new repository's
   root — the fixtures plus `bundle.json` and `CHANGELOG.md`, which travel with
   them because a vendored copy that cannot say which bundle version it is has
   been copied, not pinned — and fills in `digests`. Commit `contracts/` **and**
   `contracts.pin.json` together — the digests are meaningless apart from the
   files they describe.
5. **Check `contracts/` in.** Do not gitignore it. Vendoring is what makes
   offline test runs work; a gitignored directory would force a network fetch
   on every fresh clone and re-open exactly the failure mode this design
   rejects.
6. **Carry the CI steps.** `.github/workflows/ci.yml` runs `pnpm contracts:check`
   *and* `pnpm contracts:test` as their own named steps in the `factory` job. Reproduce it in the new
   repository's CI. `pnpm test` and `pnpm typecheck` chain the same check, so it
   is belt-and-braces rather than the only line of defence — but a named step is
   what makes a contracts problem legible in a CI log instead of surfacing as a
   module-resolution error inside vitest.
7. **Decide how the pin gets bumped.** Nothing here bumps it automatically, by
   design: an automatic bump would silently adopt a contract change, and the
   whole point is that adopting one is a visible act whose parity tests then run.
   A scheduled job that bumps `ref` and opens a PR is the right shape — the PR
   goes red if ticks changed a rule the factory has not followed, which is the
   divergence-fails-a-build requirement, discharged.

### What stays in ticks

`contracts/` itself, its `README.md`, the Go parity tests, and
`extensions/ticks-runner`'s readers. Ticks is the **owner**: contracts are
authored there and read in place, with no mechanism involved. Nothing in
`scripts/contracts.mjs` affects them, and the ticks-side readers do not need it.
This mechanism is one-directional — it exists solely so a consumer that has left
the repository can still be held to the same files.

## Adding a contract to the factory

1. Land the JSON in ticks `contracts/` with its Go reader (see
   `contracts/README.md`).
2. Add the TypeScript reader importing `../../../contracts/<name>.json`.
3. Add the file name to `files` in `contracts.pin.json`. `pnpm contracts:check`
   fails until you do, and names the file.
4. In `pinned` mode, also `pnpm contracts:sync` — the pinned version has to be
   one that actually contains the new file.
