---
type: architecture
source: from-chat
covers: [contracts, cloud/factory/scripts/contracts.mjs, cloud/factory/contracts.pin.json, cloud/factory/CONTRACTS.md]
verified_against: 5a1e1f7f
status: active
---

## Compiled Truth

**`contracts/` at the repo root holds every rule that more than one
implementation has to obey.** Nine files today. Both languages read them, and a
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

## Every contract is proven to bite

All nine were broken on **both** the Go and the TypeScript side and confirmed
red, then reverted and confirmed green (ticks `i0o`, `i61`).

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
- 2026-08-28 — `contracts/` established, distribution pinned, all nine proven to
  fail on drift, the runner's two readers wired in — @5a1e1f7f
