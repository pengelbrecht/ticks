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
4. Ticks exposes no new surface to serve this — no public Go API, and no
   plugin or dispatch mechanism. Nothing leaves `internal/`; `tk` never learns
   that a factory exists. Two programs, one text interface, dependency pointing
   one way.
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
`schemas/**` · `Makefile`, `package.json`, `install.sh`,
`.goreleaser.yaml` (all already factory-free). `internal/ticksrc` does **not**
stay — see "Phase 3 decisions" below: it is deleted, and `~/.ticksrc` (board
sync only, post-split) keeps its existing sole reader,
`internal/tickboard/cloud/client.go`.

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

3. **The credential split.** `~/.ticksrc` carries fifteen `KeyFactory*`
   constants today, including live GitHub OAuth refresh tokens and a Cloudflare
   API token. **Decided** in tick `elt` — see "Phase 3 decisions" below: the
   factory writes its own file (`~/.ticfacrc`), not a namespaced API served
   from ticks.

4. **`ticfac` is its own binary with its own name.** `ticfac deploy`,
   `ticfac run`, `ticfac status`. No dispatch mechanism, no shim, no plugin
   protocol — `tk` never learns that a factory exists.

   *(Revised 2026-08-27 on Peter's steer: "don't overload tk — lean towards the
   unix philosophy, composable tools with minimum dependencies." The earlier
   draft proposed git-style PATH dispatch so `tk factory …` kept working from
   outside the binary. That was wrong on both counts.)*

   **The cost I cited for a separate binary was near-zero and I overstated it.**
   The argument against it was "breaks every doc and all muscle memory". But
   `tk factory` has NEVER SHIPPED — verified against every published tag,
   including v0.31.1: zero `cmd/tk/cmd/factory*` files in any release. There are
   no users to break and no installed docs to invalidate. The habit exists in one
   repository's own working tree.

   **And dispatch would have made ticks bigger to make it smaller.** A PATH
   resolver, argument and exit-code passthrough, and a suggestion path that still
   behaves for genuinely unknown commands — all of it new code in `tk`, existing
   solely to serve a product that had just been removed from the repo for being
   out of scope. Deleting a command file already removes the command
   (`init()` self-registration, no central registry) — with ONE hand-maintained
   exception found while measuring `ffy`: `ResetFlags` in `cmd/tk/cmd/root.go`
   lists every command's flag variables, so a removed command file breaks the
   build there and nowhere else. Deleting the corresponding lines is the fix.
   That correction does not change this decision: a few lines in a test helper
   is still nothing next to a dispatch mechanism, and it is a cost the move pays
   once either way.

   The composition happens where Unix puts it: **two independent programs, one
   text interface.** `ticfac` runs `tk … --json` to read the tracker; `tk` runs
   nothing. The dependency points one way and only one way.

   Consequences, stated so they are not surprises:
   - **The sandbox image installs two binaries** rather than one plus a shim.
     `cloud/sandbox/required-tk-commands` splits: `tk sandbox …` stays a `tk`
     dependency, `cloud branch` becomes a `ticfac` command the image gets from
     `ticfac` itself. Two lists, each owned by the product that ships it.
   - **`tk cloud …` does not survive as a `tk` command.** It becomes
     `ticfac …`. Whether `cloud` survives as a SUBSTRATE NAME in
     `.tick/runners.toml` is a separate question (Phase 6) and the answer is
     probably yes — the file already names `herdr` without ticks owning it.

5. **Its own `embedded.go`** in the new repo, carrying `cloud/factory` and
   `cloud/sandbox`. Ticks' root `embedded.go` keeps only `skills/`.

6. **Skills split.** `skills/ticks/references/{agent-runner,runners-config,tk-commands}.md`
   describe factory and cloud surfaces. Decide per-file whether it belongs to the
   ticks skill or a new factory skill.

## Phase 3 decisions — the credential split (tick `elt`)

*(Decided 2026-08-31. Context that shaped this, from the orchestrator: Phase 4b
found that `tk ask`/`tk answer` — pure terminal commands — silently read
`~/.ticksrc` and made live HTTPS calls to a deployed Worker with a real bearer
token, because factory credentials lived in a file (and a package) the
terminal path could reach. Nobody wrote that on purpose; a fallback chain
found them because they were reachable. The question below is not "where
should these keys go" but "what arrangement makes that class of accident
structurally impossible" — every option is judged against that, not against
tidiness.)*

Mapping before deciding (epic `9hu`'s note): `internal/ticksrc` defines
fifteen `KeyFactory*` constants against two non-factory ones (`KeyToken`,
`KeyURL`, board sync). `internal/tickboard/cloud/client.go` parses
`~/.ticksrc` by hand for the board keys and never imports `internal/ticksrc` —
a second, independent parser of the same file. `cmd/tk/cmd/upgrade.go:59-79`
reads `KeyFactoryURL`/`KeyFactoryVersion` to warn a deployed factory is stale
— a `tk`-side reach into factory state, in a core command. Confirmed by grep
while mapping this tick: `KeyToken`/`KeyURL` have **zero production readers**
through `internal/ticksrc` today — board sync goes entirely through
`internal/tickboard/cloud`'s own parser, and nothing in `tk` ever *writes*
`token=`/`url=` (`board.go` only tells the user, in help text, to add it by
hand).

### A. Where factory credentials live

**Decision: the factory gets its own file, `~/.ticfacrc` (0600), read and
written by code living inside `internal/factory` that imports nothing from
`internal/ticksrc`.** Not a namespaced API served from ticks.

Rejected: a namespaced section of `~/.ticksrc` with a ticks-side API that
"refuses to define factory keys" but still exposes a generic namespaced
read/write. That option still puts factory credentials one call away from any
command in the `tk` binary — the exact reachability that produced the
`tk ask`/`tk answer` accident. A generic-namespace API is a coupling wearing
a namespace: it doesn't enumerate `KeyFactoryGatewayProvider` by name, but it
still hands out the *contents* of a factory-scoped key on request, from ticks
code — which is the property that mattered. Physical separation — a
different file, read by code that is unreachable from `tk`'s core commands
unless they explicitly import `internal/factory` — makes the leak
structurally impossible rather than merely undocumented.

The credential-file mechanics (line-oriented, comment/unknown-line
preserving, atomic temp+rename, 0600, `Get`/`Set`/`Save`) are adapted from
`internal/ticksrc.File` almost unchanged — proven by six existing tests, no
reason to redesign the format. They are **duplicated, not shared**, into
`internal/factory` (e.g. `internal/factory/credentials.go`), because
`internal/factory` relocates whole in Phase 5, and Go forbids an external
module from importing anything under another module's `internal/`
(Finding 3) — a shared helper package would just be a new dependency edge
Phase 5 has to cut again. ~90 lines duplicated once is cheaper than a shared
package that must later be promoted to a public API (a direction Finding 3
already rejects) or cut a second time. Constants keep their current spelling
minus the now-redundant `Factory` prefix (`KeyFactoryGitHubToken` becomes
`credentials.KeyGitHubToken`, etc.) — a rename, not a reshape, settled here so
the implementer doesn't have to.

Consequence for "the chosen design leaves ticks with no enumeration of
factory-specific keys": after this lands, whatever remains under
`internal/ticksrc`'s old surface holds only `KeyToken`/`KeyURL` — see B, which
finds it holds nothing at all, because the package itself goes away. Every
`KeyFactory*` constant moves to `internal/factory`.

### B. The two board keys — `internal/ticksrc` does not survive

**Decision: delete `internal/ticksrc` as a package.** It was built for
fifteen keys and, once they leave, it does not "serve two" — grep confirms
**zero production call sites read `KeyToken`/`KeyURL` through
`internal/ticksrc`** today. Board sync has always gone through
`internal/tickboard/cloud/client.go`'s own hand-rolled `readConfigFile()`,
which never imported `internal/ticksrc` in the first place. `internal/ticksrc`'s
only real consumers are `internal/factory`, `internal/gatewaytrace`, and the
`cmd/tk/cmd/{cloud,factory}*.go` wrappers — every one of them factory, every
one of them already under "What moves". Keeping a package around to serve two
keys nothing reads through it defends a header comment, not a capability.

`internal/tickboard/cloud/client.go` keeps its existing reader unchanged — it
already does the whole job for board sync (read-only; nothing in `tk` writes
`~/.ticksrc`'s board keys, so there is no `Set`/`Save` need to replace).
`~/.ticksrc`'s meaning going forward is simply "the board sync file" — the
name stops describing a lie once the factory keys are gone.

### C. The duplicate parser

**Decision: they read different files, and each file keeps exactly one
reader once migration completes.** `~/.ticksrc` (board, `token=`/`url=`)
stays owned solely by `internal/tickboard/cloud`, unchanged. `~/.ticfacrc`
(factory, up to fifteen keys) is owned solely by the new code in
`internal/factory` (A). There is no shared library between them — A explains
why: Phase 5's module boundary rules out a shared `internal/` package.

This is not "two parsers of one format with no contract" surviving the split
— that duplication is resolved by **elimination** (`internal/ticksrc`'s
generic engine goes away with the package, B) rather than by convergence,
because the two remaining readers no longer parse the same format at all: two
files, two shapes, two owners, one reader each — which is what should have
been true from the start.

One real divergence worth recording so it isn't silently inherited:
`internal/tickboard/cloud`'s reader treats a bare first line with no `=` as a
legacy token value; `internal/ticksrc.File.Get` treats the same line as an
unrecognized line it preserves but never parses
(`TestLegacyBareTokenLineIsPreserved`). The new `internal/factory` credential
code has no legacy bare-line convention to carry forward — the factory format
has always been `key=value` — so this divergence does not recur there; it was
specific to the board key's history and stays exactly where it already lives,
`internal/tickboard/cloud`.

### D. The migration

The only irreversible constraint: a real machine's `~/.ticksrc` today can
hold a live GitHub OAuth refresh token and a Cloudflare API token. The
migration must never lose one, never strand a deployment mid-upgrade, and
never rewrite a credentials file without telling the operator.

**Mechanism — a merge-and-drain loader, run at the top of every
factory-credential-touching command** (`tk factory setup`, `tk factory
deploy`, `tk factory status`, `tk cloud …`, `tk channel`/dashboard/trace —
every current `ticksrc.Load()`/`loadConfig()` call site in `internal/factory`
and `cmd/tk/cmd/{cloud,factory}*.go`). Replace those calls with
`factory.LoadCredentials()`, which on every invocation:

1. Reads `~/.ticksrc` (if it exists) and checks it for any `factory_*`-prefixed
   key, by a plain line scan — this does not need `internal/ticksrc`, which is
   deleted (B); it is a few lines of `strings.HasPrefix`.
2. For each `factory_*` key found there **that `~/.ticfacrc` does not already
   have a value for**, copies it into the in-memory `~/.ticfacrc` credentials.
   Never overwrites a value already present in the new file — a value set
   post-migration (e.g. by rotating a token with `tk factory deploy
   --rotate-token`) must not be clobbered by a stale copy from the old file.
3. If anything was copied in step 2: `Save()`s `~/.ticfacrc` (atomic
   temp+rename, 0600 — the pattern `ticksrc.File.Save` already uses), then
   rewrites `~/.ticksrc` with every `factory_*` line removed and everything
   else — `token=`, `url=`, comments, blank lines, any other unrecognized
   line — preserved byte-for-byte in place (the same "preserve everything I
   didn't touch" guarantee `ticksrc.File.Save` already gives), then prints
   once to stderr:

   > `Moved N factory credential(s) from ~/.ticksrc to ~/.ticfacrc. Board sync
   > credentials in ~/.ticksrc are unchanged. See docs/factory-credentials.md.`

4. If nothing was found in step 1 (fresh install, or migration already
   complete), does nothing and prints nothing — silence is correct exactly
   when there is nothing to protect.

This is **idempotent and resumable from any crash point**: a process killed
between step 3's two writes leaves `~/.ticfacrc` correct and `~/.ticksrc`
still carrying the (now-redundant but harmless) old lines; the next
invocation's scan in step 1 finds them again and finishes the drain. It does
not gate on "does `~/.ticfacrc` exist" — it re-checks `~/.ticksrc`'s actual
content every time, which is what also makes it self-healing against a
restored backup dotfile.

**How long the old shape is read:** indefinitely by default — the loader's
cost is a stat and a small read of a local file, so there is no pressure to
time-box it. `~/.ticksrc` reaches zero `factory_*` keys the first time any
factory command runs post-upgrade on a given machine; there is no forced
deadline before that. A follow-up tick may later delete the merge step once a
declared deprecation window (e.g. two minor releases) makes it safe — that
removal is out of scope here and is its own decision, not a consequence of
this one.

**Verification the acceptance criterion requires:** a migration test built on
a fixture that is the *current* populated file shape — all fifteen
`factory_*` keys with realistic-looking values, `token=`/`url=`, a comment
line, and (for C's edge case) a legacy bare line — run through
`LoadCredentials()`, asserting: (a) all fifteen values land in `~/.ticfacrc`
and are readable by the new factory credential constants; (b) `~/.ticksrc`
retains `token=`, `url=`, the comment, and the bare line, verbatim, with zero
`factory_*` lines; (c) a second run is a true no-op (no notice printed, no
file touched — check mtimes or content hash); (d) a stub-server `tk factory
status` call against the migrated `~/.ticfacrc` succeeds, standing in for
"still authenticates" in the epic's acceptance criterion.

**What a user sees:** the one-time stderr line above, at the next factory
command they run after upgrading — not at `tk upgrade` time itself (`tk
upgrade` never touches this file; see E), and not as a silent rewrite.
`docs/factory-credentials.md` and the CHANGELOG get a short note pointing at
the new file location — writing those is implementation work for the next
tick, not this one.

### E. `tk upgrade`'s factory-stale warning

**Decision: delete it from `tk upgrade` entirely; the equivalent check moves
to `tk factory status` (→ `ticfac status` post-move), which already has
everything it needs.**

The epic note calls this "the clearest remaining ticks→factory coupling in a
core command", and every other decision above (A–D) is built specifically so
ticks ends up with zero `KeyFactory*` awareness. Keeping
`factoryRedeployNotice` in `cmd/tk/cmd/upgrade.go` — even rewritten to call a
factory-owned helper instead of enumerating constants itself — would still be
a core `tk` command importing `internal/factory` on purpose: exactly the edge
Finding 2(a) already flags as trivial-to-cut for `DefaultHarnessBytes`, and
Goal 4 rules out for the finished state ("tk never learns that a factory
exists"). No reason to let this one edge survive Phase 3 only to be cut again
later.

The replacement loses no capability: `internal/factory/status.go` already
reads the deployed version (`report.Deployment.Summary += " (tk " + version +
")"`) and already knows its own running binary's version the same way
`deploy.go` already threads `opts.Version` through today
(`cfg.Set(ticksrc.KeyFactoryVersion, opts.Version)`, soon
`credentials.KeyVersion`). Extending `tk factory status` to compare the two
and print the same "redeploy" hint is a same-shape, same-file change with a
natural home, and it never has to leave `internal/factory`.

**Accepted UX regression, stated plainly (same pattern as Phase 4b's accepted
regression):** a user who runs `tk upgrade` and never separately runs `tk
factory status` will not be proactively nagged that their deployed factory is
stale, where they are today. Deliberate: the alternative is a permanent
core-command dependency on the thing being extracted. `tk factory status` (or
`deploy`) already gets run whenever anyone actually interacts with their
deployment, which is the only time the notice is actionable anyway.

Concretely for whoever implements this: delete `factoryRedeployNotice` and
its call site in `cmd/tk/cmd/upgrade.go`, delete its coverage in
`cmd/tk/cmd/factory_test.go`, and add the version comparison to
`internal/factory/status.go`'s `Status()` alongside its existing
deployment-summary line.

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

**Phase 3 — split credentials.** Implement the split decided in "Phase 3
decisions" above (`~/.ticfacrc` owned by `internal/factory`, `internal/ticksrc`
deleted, the merge-and-drain migration loader, `tk upgrade`'s factory-stale
warning moved into `tk factory status`) and migrate existing files. *Done
when:* a machine with a deployed factory still authenticates after upgrading
both sides, proven by the migration test over a fixture of the current file
shape.

**Phase 4 — REMOVED.** This was "add git-style PATH subcommand dispatch to
`tk`". It is deleted from the plan, not deferred: `ticfac` is its own binary
(see *What gets built*, item 4), so no dispatch mechanism is needed and adding
one would make ticks bigger in order to make it smaller. Phase numbering is
left alone so existing references stay valid.

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
- **Credential migration** (What gets built, 3; decided in "Phase 3 decisions").
  The only step that can break a user's live deployment. The merge-and-drain
  loader is the mitigation: it never deletes a value from the old file without
  having already durably written it to the new one, and it is idempotent
  against a crash at any point.
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
