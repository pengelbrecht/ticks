# Factory Extraction Specification

> **Status: scoping.** No code has moved. This document exists to establish what
> the factory actually is, what genuinely couples it to ticks, and the order of
> operations that keeps both repos green throughout. Evidence is a full
> dependency map of the current tree, cited inline.

## Problem

The cloud factory grew inside the ticks repo and is now roughly the same size as
the thing it was meant to be a feature of:

| | Lines |
|---|---|
| `cloud/factory/src/**` (46 modules) | 29,568 |
| `cloud/factory/test/**` (44 vitest files) | 26,252 |
| `internal/factory/**` (Go, non-test) | 7,337 |
| `cloud/sandbox/**` (container image) | 2,866 |
| factory docs + repo-wiki | ~5,500 |

Thirteen numbered D1 migrations have been applied against a live database. Real
money has been spent — `cloud/factory/wrangler.toml` carries post-mortem cost
data from actual runs. 21 of `tk`'s 84 subcommands are factory or cloud.

Meanwhile `docs/design/cloud-factory.md:3-4` still says **"Status: design
exploration. Nothing here is implemented."** That header is a ~30,000-line lie,
and it is the clearest symptom of the problem: nobody has re-decided whether the
factory belongs here since the day it was a sketch.

The cost of leaving it is not disk space. It is that every ticks contributor now
carries the factory's surface area — its CI jobs, its credential keys in
`~/.ticksrc`, its bundle embedded in every released `tk` binary, its concepts in
the skills — whether or not they will ever deploy a Cloudflare Worker.

## Goals

1. The factory lives in its own repo, with its own release cadence, and depends
   on ticks as a **published module** rather than as a sibling directory.
2. Ticks gets smaller and stops knowing the factory exists.
3. Both repos stay green at every step. No flag day.
4. The cross-language contracts that currently prevent Go/TypeScript drift keep
   working after the split — they are load-bearing, not incidental.

## Non-goals

- **Not a rewrite.** Every line moves as-is or stays. Behaviour changes are out
  of scope and should be separate ticks.
- **Not a change to the factory's deployment model.** It stays a deployable
  users install into their own Cloudflare account.
- **Not extracting the board.** `cloud/worker/**` is the ticks.sh board — the
  D1 `tickboard`, the `ProjectRoom`/`AgentHub` Durable Objects, the static asset
  server. It lives under `cloud/` and is *not* factory. The `deploy-cloud`
  release job deploys this, not the factory. It stays.
- **Not extracting the question store.** The operator *transport* (Telegram)
  goes; the durable park-a-question-answer-it-later machinery stays. See
  Finding 1 — this is the split that most changes the shape of the work.

## Finding 1 — the operator channel splits; it does not move whole

*(Revised 2026-08-27 after Peter's steer: the operator channel is an unused
experiment and belongs with the factory. That is right about the transport and
wrong about the package — the two are fused under one name.)*

`internal/operator` is **two things wearing one name**:

| | Lines (non-test) | What it is |
|---|---|---|
| `internal/operator/*.go` | 2,636 | A durable **question store**: an agent parks a question, a human resolves it later |
| `internal/operator/telegram/**` | 3,064 | A **remote transport** — and the only `Channel` implemented (`cmd/tk/cmd/channel.go:37`) |

The question store is not remote plumbing. `cmd/tk/cmd/herd_wait.go:209-215`
shows the no-channel path explicitly: with nothing configured, a blocked agent's
question is *"parked for terminal answer with `tk answer <id> <answer>`"*.
`cmd/tk/cmd/ask.go:22,47` says the same in as many words — a question resolves on
*"EITHER surface — the phone or the terminal"*, where terminal means
`tk answer` / `tk approve` / `tk reject`.

**That is the product.** An agent that can park a question instead of dying, and
a human who answers it whenever they next look, is exactly what "optimised for
the longest autonomous runs possible" means at a terminal. Removing it would make
runs *shorter*, not more focused.

The transport half is the experiment, and it should go — with one wrinkle worth
knowing: **the factory already has its own Telegram**, `cloud/factory/src/telegram.ts`
(606 lines, TypeScript, running in the Worker). The Go implementation (3,064
lines + 4,454 of test) is the *local* side — a laptop talking to Telegram
directly. They are genuinely different jobs, but only `cmd/tk/cmd/factory_operator.go`
links them, and the Go one has no users.

### The split

**Stays in ticks** — the question store. `Engine`, `Pending`, `Question`,
`Outcome`, mapping, locking, `tk ask`, `tk answer`, and `internal/herd/relay`
(which already degrades to the terminal path when no channel is configured).
Recommend renaming the package to say what it is — `internal/parking` or
`internal/questions` — since "operator" is what caused the confusion.

**Goes to the factory** — `internal/operator/telegram/**`, `tk channel`,
`tk tell` (which exits 4, "no channel configured", without a transport — it is
pure transport), and `cmd/tk/cmd/factory_operator.go`.

**The seam already exists.** `internal/operator/channel.go` defines `Channel` as
an interface with optional capability interfaces (`Adopter`, `ContextualChannel`,
`FormattedSender`, `AttachmentSender`). It was written to be implemented from
outside. It stays in ticks as the extension point; the factory registers against
it.

**Open decision for the factory's owner, not for this spec:** whether the Go
Telegram is worth keeping at all once it lives beside a working TypeScript one.
Move it rather than delete it here — retiring it is the new repo's call to make
with its own context.

### The two packages that genuinely do stay

Unchanged from the original finding, and both are small:

- `internal/sandbox/**` — `cmd/tk/cmd/herd_spawn.go:134` calls `sandbox.Setup`.
- `internal/wave` — `cmd/tk/cmd/graph.go` and `internal/herd/dashboard` call
  `wave.Compute`.

## Finding 2 — the dependency arrow already points both ways

"Core doesn't depend on factory" is false today. Four edges, in increasing order
of difficulty:

**(a) One import, one constant.** `cmd/tk/cmd/root.go:13` imports
`internal/factory/dashboard` for `dashboard.DefaultHarnessBytes` (line 638).
Trivial — move the constant.

**(b) Eight core tests read the factory's test fixtures.** This runs *backwards*
from what anyone would predict:

| Core test | Fixture in `cloud/factory/test/fixtures/` |
|---|---|
| `internal/herd/config/runners_config_parity_test.go` | `runners-config-contract.json` |
| `internal/herd/config/signal_parity_test.go` | `signal-source-cases.json` |
| `internal/herd/config/sweep_parity_test.go` (×2) | `sweep-policy-cases.json`, `sweep-selection-contract.json` |
| `internal/sandbox/image_parity_test.go` | `sandbox-image-cases.json` |
| `internal/sandbox/worker_parity_test.go` | `worker-boot-contract.json` |
| `internal/operator/message_context_parity_test.go` | `message-context.json` |
| `internal/tick/tracker_layout_parity_test.go` | `tracker-layout.json` |

These are deliberate two-language drift detectors: `.tick/runners.toml` is parsed
by Go (`internal/herd/config`) *and* re-implemented in TypeScript
(`cloud/factory/src/toml.ts`, `repo-config.ts`). The fixtures are what stop the
two parsers diverging. `internal/gatewaytrace/trace_test.go:332-342` does the
same for constants pinned against `cloud/factory/src/gateway.ts`.

**A naive move relocates the fixtures into the other repo and silently disables
eight drift detectors.** That is the single most likely way this project does
damage.

**(c) `embedded.go` at the module root.** It carries
`//go:embed cloud/factory/{...}`, `//go:embed cloud/sandbox/{...}` and
`//go:embed all:skills` in one unit. Its doc comment explains it must sit at the
module root because `go:embed` cannot reach above its own package. `tk factory
deploy` deploys the bundle baked into that exact binary — that is the version
pin. Extracting `cloud/**` breaks this by construction.

**(d) `tk` is a runtime dependency *inside* the factory's container.**
`cloud/sandbox/required-tk-commands` lists `cloud branch`, seven `sandbox …`
subcommands, and `version`; the image's last Dockerfile layer runs each against
the `tk` it just built, and the build fails if any is missing. So the arrow does
not cleanly reverse: the factory's container needs core `tk` to keep shipping
`tk sandbox`.

Convenient consequence: `cloud/sandbox/Dockerfile` already `go install`s `tk` at
a pinned ref from the public module proxy. **The image is already consuming
ticks as a published module** — a working precedent for the whole direction.

## Finding 3 — everything the factory needs is `internal/`

An external Go module physically cannot import `internal/…`. The factory-side
packages import, by count:

`ticksrc` ×11 · `tick` ×9 · `operator` ×9 · `herd/config` ×7 ·
`operator/telegram/fakebot` ×4 · `herd/collect` ×2 · `cloud/state` ×2 ·
`styles` · `herd/gitcmd` · `herd/dashboard` · `github` · `gatewaytrace` ×1 each

Every one needs promotion to a public package or duplication. **This is the
largest single piece of work in the project**, and it is work that has to happen
in the ticks repo, before anything moves.

It is also the part with independent value: a public Go API for the tracker is
what would let *anything* build on ticks, not just the factory.

## What moves

| | Lines |
|---|---|
| `cloud/factory/**` | ~56k |
| `cloud/sandbox/**` | 2,866 |
| `internal/factory/**` (+ `dashboard/`) | 13,062 |
| `internal/cloud/{collect,lease,state}` | 1,250 |
| `internal/gatewaytrace/**` | 1,221 |
| `cmd/tk/cmd/{factory,cloud}*.go` (+ tests) | ~9k |
| `internal/operator/telegram/**`, `tk channel`, `tk tell`, `factory_operator.go` | ~7.5k incl. tests |
| `docs/design/cloud-factory.md`, `docs/factory-credentials.md`, 16 `repo-wiki/` pages | ~5k |
| `scripts/verify-factory-deploy.sh`, `bench_sandbox_start.py`, `bench_workers_ai_models.py`, `benchmarks/**` | ~1k |
| CI: the `factory`, `sandbox` and `changes` jobs in `.github/workflows/ci.yml` | — |

## What stays

`cloud/worker/**` (the board) · the question store (`internal/operator/*.go`,
recommend renaming) and `tk ask`/`tk answer` · `internal/herd/relay` ·
`internal/sandbox/**` and `tk sandbox` · `internal/wave` ·
`internal/tick` · `internal/herd/**` · `internal/github` · `internal/styles` ·
`internal/ticksrc` · `schemas/**` · `Makefile`, `package.json`, `install.sh`,
`.goreleaser.yaml` (all already factory-free).

## What gets built

These are the actual deliverables. The move itself is the easy half.

1. **A public Go API** — promote the packages in Finding 3 out of `internal/`.
   Recommend `pkg/tick` (store), `pkg/runners` (the `.tick/runners.toml` model),
   `pkg/operator` (channel client), `pkg/collect`, `pkg/gitcmd`. Semver from day
   one; the factory pins a version.

2. **A published contract artifact** replacing the eight parity fixtures.
   The fixtures move to a versioned package both repos consume — a Go module and
   an npm package built from one source, or a JSON Schema bundle in ticks that
   the factory's CI fetches. Non-negotiable: after the split, a Go/TS parser
   divergence must still fail someone's build. `skills/ticks/references/runners-config.schema.json`
   is the natural seed.

3. **A credential-namespace API** for `~/.ticksrc`. It carries 30 `KeyFactory*`
   constants today, including live GitHub OAuth refresh tokens and a Cloudflare
   API token. Either the factory writes its own file, or ticks exposes a
   namespaced read/write API and stops defining factory keys. **Decide before
   moving anything** — this touches real credentials on real machines.

4. **A binary and command-surface decision.** Three options; recommend (b):
   - **(a) Separate binary** (`tkf …`). Cleanest boundary, worst ergonomics,
     breaks every doc and muscle memory.
   - **(b) PATH-discovered subcommand** — a `tk-factory` binary that `tk factory
     …` dispatches to, git-style. Ticks needs a small generic dispatcher (which
     is useful independently); the factory repo ships the binary. Preserves the
     command surface, keeps ticks unaware of what a factory is, and the repo
     already has plugin/extension precedent (`plugins/herdr-ticks`,
     `extensions/ticks-runner`).
   - **(c) Factory repo imports ticks and ships a superset binary.** Rejected —
     two binaries claiming `tk` is worse than either alternative.

5. **Its own `embedded.go`** in the new repo, carrying `cloud/factory` and
   `cloud/sandbox`. Ticks' root `embedded.go` keeps only `skills/`.

6. **Skills split.** `skills/ticks/references/{agent-runner,runners-config,tk-commands}.md`
   describe factory and cloud surfaces. Decide per-file whether it belongs to the
   ticks skill or a new factory skill.

## Order of operations

Strangler, not flag day. Ticks stays green throughout; the factory does not move
until it is already consuming the public API from where it sits.

**Phase 0 — tell the truth.** Fix the `docs/design/cloud-factory.md` status
header. One line, and it is currently misleading every reader.

**Phase 1 — publish the API, in place.** Promote `internal/` → `pkg/`, leaving
shims behind. Move `DefaultHarnessBytes` out of `internal/factory/dashboard`.
Factory code still lives in the ticks repo but imports only `pkg/…`. *Done when:*
nothing under `cloud/factory` or `internal/factory` imports a ticks `internal/`
package, and `go test ./...` is green.

**Phase 2 — publish the contract.** Extract the eight parity fixtures into the
versioned artifact and repoint both the Go tests and the TS tests at it.
*Done when:* deliberately breaking `cloud/factory/src/toml.ts` still fails a Go
test, with the fixtures no longer read by relative path.

**Phase 3 — split credentials.** Implement the `~/.ticksrc` namespace decision
and migrate existing files. *Done when:* a machine with a deployed factory still
authenticates after upgrading both sides.

**Phase 4 — the dispatcher.** Add generic PATH-based subcommand dispatch to
`tk`, with `tk factory` still resolving to the in-repo implementation.
*Done when:* an external `tk-hello` binary on PATH is invocable as `tk hello`.

**Phase 5 — move.** Create the repo, move the files, wire its CI, remove the
factory jobs and files from ticks, shrink `embedded.go`. *Done when:* both repos
green, `tk factory deploy` works from the new binary, and a sandbox image builds.

**Phase 6 — cut over.** Release both. Document the install path. Delete the
shims from Phase 1.

Phases 1–4 are all independently valuable to ticks even if the extraction is
abandoned — which is the property that makes this safe to start.

## Risks

- **Silent loss of drift detection** (Finding 2b). Mitigated by Phase 2 landing
  before Phase 5, and by proving it with a deliberate break.
- **`tk`-in-container circularity** (Finding 2d). The factory's image depends on
  core `tk`; core `tk` must not depend on the factory. Keeping `internal/sandbox`
  and `tk sandbox` in ticks resolves it, but it means `tk` keeps a command
  surface whose only consumer is the factory's container. Accepted, and noted:
  it is the one place the boundary stays untidy.
- **Credential migration** (What gets built, 3). The only step that can break a
  user's live deployment. Needs a migration path, not a cut.
- **The factory is being built *by* the factory.** Git log shows sustained
  tick-by-tick delivery through 2026-08. Extraction competes with active
  development; Phases 1–4 are non-disruptive, Phase 5 is not.

## Open questions

1. Does the new repo carry the sandbox image, or does the image belong with
   whatever ships `tk`? It currently `go install`s `tk` at a pinned ref, so it
   is already loosely coupled — but `internal/sandbox`'s 6,425 lines of Go test
   actually *execute* `cloud/sandbox/*.sh`, and those tests stay in ticks.
2. Public or private repo? The factory's wrangler config and wiki carry real
   cost post-mortems and account details.
3. Does `tk cloud …` follow the factory, or is "cloud" a substrate name ticks
   keeps? `.tick/runners.toml` resolves `substrate = cloud` as a peer of
   `harness` and `herdr`, which argues the *vocabulary* stays in ticks even if
   the implementation leaves.
