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

1. The factory lives in its own repo with its own release cadence, and reaches
   ticks through the **`tk` CLI** — the interface ticks already supports — not
   through Go imports.
2. Ticks gets smaller and stops knowing the factory exists.
3. Both repos stay green at every step. No flag day.
4. Ticks exposes no new public Go surface to serve this. Nothing leaves
   `internal/`; nothing becomes a frozen API for one consumer's benefit.
5. The cross-language contracts that currently prevent Go/TypeScript drift keep
   working after the split — they are load-bearing, not incidental.
6. **No duplicated functionality survives the split.** Where the same job is done
   twice, extraction resolves it to one implementation. Where two runtimes
   genuinely force two implementations, they are held together by an executable
   contract, not by hope. See Finding 4.

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

**The Go Telegram does not move — it is superseded.** See Finding 4: the two
implementations cannot coexist against one bot token, and the webhook wins.

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

## Finding 3 — the interface already exists: it is the `tk` CLI

*(Revised 2026-08-27 after Peter's challenge: "couldn't ticfac simply interact
with ticks through the tk CLI running in the various sandboxes it runs on?" It
can, and the first draft of this section was wrong — it counted import edges
without checking what they were for.)*

Go forbids an external module from importing a package under `internal/`, so at
first glance the factory's ~50 import edges into ticks look like ~50 things
needing promotion to a public Go API. They are not. Counted by what they
actually do:

| What the factory borrows | Edges | Disposition |
|---|---|---|
| `internal/ticksrc` — the credentials file | 11 | Phase 3 splits it regardless; ticfac writes its own |
| `internal/operator` — `Pending` as a **wire type** in `dashboard/client.go:121,168` | 3 | ticfac defines its own wire struct; this was never a tracker call |
| `internal/cloud/state`, `internal/gatewaytrace` | 3 | The factory's own packages — they move with it |
| `internal/styles` (TUI theme), `internal/github` (device flow), `internal/herd/gitcmd`, `internal/herd/collect`, `internal/herd/dashboard` | 1 each | Small one-offs; see below |

**None of them is the tracker.** The tracker touch lives in the thin command
wrappers (`cmd/tk/cmd/cloud*.go`), and it is five symbols: `tick.NewStore`,
`tick.Tick`, `tick.TypeEpic`, `tick.TypeTask`, `tick.StatusOpen` — open the
store, read a tick, check its type and status.

Every one of those already has a `tk … --json` equivalent. **36 `tk` commands
support `--json`**, and the types are generated from JSON Schema in `schemas/`
(`make codegen-go` / `codegen-ts`), so it is a maintained contract rather than
scraped output.

### The consistency argument, which is the strongest one

The sandbox already does exactly this. `cloud/sandbox/required-tk-commands`
declares the `tk` subcommands the container must have, and the image's last
Dockerfile layer install-checks every one against the `tk` it just built. The
container has never imported Go from ticks — it shells out.

Having the container side shell out while the laptop side imports Go is **two
answers to one question**. Picking the CLI makes them the same answer, and it is
the answer already proven in production.

### What this avoids

Promoting packages out of `internal/` is a promise: once public, renaming a
function is a breaking change for a downstream consumer. Phase 1 as originally
drafted would have forced a decision about *which internals of ticks become a
frozen surface* — a large, permanent commitment made to serve one consumer.

The CLI is already that surface. It is versioned, tested, schema-backed and
documented, and ticks already supports it for humans and for the sandbox.

### The one-offs, each with an answer

- **`internal/styles`** — a TUI theme. ticfac's dashboard is its own product
  surface; give it its own theme rather than binding two products' visual
  identity together.
- **`internal/github`** — the device-flow login used by `factory setup`.
  Duplicate it (it is small and stable) or shell to `gh`. Do NOT promote it: it
  holds token exchange, and a frozen public API around credential handling is a
  liability.
- **`internal/herd/gitcmd`, `internal/herd/collect`** — git helpers. Either
  ticfac carries its own, or they reach `tk` where an equivalent command exists.
  Decide per call site; both are one edge.
- **`internal/herd/dashboard`** — one reference, and the comment at the import
  says it is deliberate. Check whether it survives at all once ticfac owns its
  own dashboard.

### The cost to keep an eye on

Shelling out costs a process launch per call. Checked, and the hot path is fine:
`internal/factory/dashboard/model.go:21` refreshes every 2s and reads the
**factory's HTTP API**, not the local tracker; cost telemetry is 30s; the 1s
display tick reads nothing. No `tk` invocation sits in a render loop.

The rule for the phase: if a call site needs many ticks at once, use one batched
`tk … --json` call, not a loop of small ones. If a genuine hot path appears
later, that is the moment to consider a Go API — with a real measurement behind
it, not in advance.

## Finding 4 — the two Telegram implementations are mutually exclusive

This is not ordinary duplication. The two cannot both run.

| | Transport | Evidence |
|---|---|---|
| Go, `internal/operator/telegram/client.go` | `getUpdates` **long-polling** | *"a getUpdates consumer per token is a Bot API requirement (a second one gets 409)"* — `client.go:84` |
| TypeScript, `cloud/factory/src/telegram.ts` | `setWebhook` | *"the Bot API allows a single reader per token, so `setWebhook` and `getUpdates` are mutually exclusive and the front door is the choice this deployment makes"* — module doc |

**One bot token has exactly one reader.** Deploying the factory registers a
webhook, which silently stops any local poller; starting the local poller against
a webhooked bot fails with a 409. Today they do not collide only because the Go
side has no users — which is luck, not design.

### Resolution: the webhook wins; the poller is deleted, not moved

1. **It is the one that runs.** The factory is deployed and consuming updates.
2. **A poller needs a live process.** A laptop long-polling Telegram stops when
   the lid closes — the exact failure the factory exists to remove. Shipping it
   into the factory repo would be shipping the problem next to its own fix.
3. **The choice is already made in the code.** The Worker module doc states the
   front door explicitly. Moving the poller would relitigate a settled decision.

So `internal/operator/telegram/**` (2,171 non-test + 1,852 test) is **retired**,
not relocated. `tk channel` and `tk tell` keep their command surface but stop
speaking Telegram: they become thin clients of the factory's API, which owns the
bot. Consequences worth stating plainly:

- **No bot token on the laptop.** A credential leaves the local machine
  entirely — a security improvement that falls out for free.
- **Remote answering requires a deployed factory.** That is the product line
  already drawn: terminal answering is ticks and works offline; phone answering
  is a cloud feature and needs the cloud.
- **`internal/operator/markdownlite.go` stays** (it is the store's formatting,
  used by the terminal path); `telegram/markdown.go` — Telegram-specific
  escaping — goes with the transport.

### The other duplication, and why it is different

Three more places do the same job twice, and they must NOT be collapsed the same
way, because two runtimes genuinely need two implementations:

| Job | Go | TypeScript |
|---|---|---|
| Parse `.tick/runners.toml` | `internal/herd/config` | `cloud/factory/src/{toml,repo-config}.ts` |
| Sandbox worker boot | `internal/sandbox/worker.go` | `cloud/factory/src/worker-boot.ts` + `cloud/sandbox/worker.sh` |
| Message context / trace IDs | `internal/operator/context.go`, `internal/trace` | `cloud/factory/src/{message-context,trace}.ts` |

The laptop cannot run TypeScript in a Worker and the Worker cannot run Go. These
stay two implementations — but they are exactly what the eight parity fixtures in
Finding 2b exist to hold together. **The rule this project enforces: duplicated
behaviour is permitted only where two runtimes force it, and only when an
executable contract fails a build on drift.** Anything else gets one
implementation.

That makes Phase 2 (publish the contract) load-bearing rather than hygiene: after
the split it is the only thing standing between these three pairs and silent
divergence.

## What moves

| | Lines |
|---|---|
| `cloud/factory/**` | ~56k |
| `cloud/sandbox/**` | 2,866 |
| `internal/factory/**` (+ `dashboard/`) | 13,062 |
| `internal/cloud/{collect,lease,state}` | 1,250 |
| `internal/gatewaytrace/**` | 1,221 |
| `cmd/tk/cmd/{factory,cloud}*.go` (+ tests) | ~9k |
| `tk channel`, `tk tell`, `factory_operator.go` — as factory-API clients | ~1.5k |
| `docs/design/cloud-factory.md`, `docs/factory-credentials.md`, 16 `repo-wiki/` pages | ~5k |
| `scripts/verify-factory-deploy.sh`, `bench_sandbox_start.py`, `bench_workers_ai_models.py`, `benchmarks/**` | ~1k |
| CI: the `factory`, `sandbox` and `changes` jobs in `.github/workflows/ci.yml` | — |

**Retired, not moved:** `internal/operator/telegram/**` (4,023 lines incl. test)
— superseded by the Worker's webhook (Finding 4).

## What stays

`cloud/worker/**` (the board) · the question store (`internal/operator/*.go`,
recommend renaming) and `tk ask`/`tk answer` · `internal/herd/relay` ·
`internal/sandbox/**` and `tk sandbox` · `internal/wave` ·
`internal/tick` · `internal/herd/**` · `internal/github` · `internal/styles` ·
`internal/ticksrc` · `schemas/**` · `Makefile`, `package.json`, `install.sh`,
`.goreleaser.yaml` (all already factory-free).

## What gets built

These are the actual deliverables. The move itself is the easy half.

1. **A declared `tk` CLI dependency surface.** ticfac names the `tk … --json`
   commands it relies on, in the same shape as
   `cloud/sandbox/required-tk-commands`, and ticks treats that list as a
   compatibility contract. No package leaves `internal/`. The five tracker
   symbols the command wrappers use become `tk` calls; the one-offs (theme,
   GitHub device flow, git helpers) are duplicated or dropped per Finding 3.

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

**Phase 0 — tell the truth.** DONE 2026-08-27. The
`docs/design/cloud-factory.md` header now states what is built, what is verified
against real runs, and what is written-but-unexercised. It was tracked as an epic
briefly; that was over-structuring a one-line problem, and it was simply done.

**Phase 1 — cut the Go dependency, in place.** Repoint the factory's tracker
reads at `tk … --json`, resolve the one-off borrowings, move
`DefaultHarnessBytes` out of `internal/factory/dashboard`, and give ticfac its
own wire struct for `operator.Pending`. The factory still lives in this repo —
it just stops importing ticks. Publish the required-command list and add a test
that fails when ticks removes or renames one of them. *Done when:* nothing under
`cloud/factory` or `internal/factory` imports a ticks `internal/` package, no
package has been promoted out of `internal/`, and `go test ./...` is green.

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

**Phase 4b — one bot reader.** Repoint `tk channel` and `tk tell` at the
factory's API and retire `internal/operator/telegram/**`. *Done when:* no Go
code calls the Bot API, no bot token is read from a laptop, and answering from
Telegram still resolves a parked question. This is the duplication fix (Finding
4) and it is the one step that changes user-visible behaviour — it must land
before the move, while both implementations are still in one tree and one test
run can prove the handover.

**Phase 5 — move.** Create the repo, move the files, wire its CI, remove the
factory jobs and files from ticks, shrink `embedded.go`. *Done when:* both repos
green, `tk factory deploy` works from the new binary, and a sandbox image builds.

**Phase 6 — cut over.** Release both. Document the install path. (No Phase 1
shims to unwind — nothing was promoted.)

Phases 1–4 are all independently valuable to ticks even if the extraction is
abandoned — which is the property that makes this safe to start. Phase 1 in
particular now leaves ticks *unchanged*: it removes a consumer's reach into the
internals rather than freezing those internals into a public API. Phase 4b is
valuable on its own terms too: it removes a bot token from every operator's
laptop and settles which process reads the bot.

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
- **Phase 4b is the only user-visible behaviour change in the project.** Remote
  answering starts requiring a deployed factory. For anyone who had the local
  poller working this is a regression in reach, traded for one bot reader and no
  laptop credential. Nobody is in that position today (the Go transport has no
  users), which is precisely why now is the cheapest moment to do it.
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
