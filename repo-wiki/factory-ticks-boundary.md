---
type: architecture
source: from-chat
covers: [cloud/factory, cloud/sandbox, internal/factory, internal/operator, embedded.go, cmd/tk/cmd/cloud.go, cmd/tk/cmd/factory.go]
verified_against: da494c6d
status: active
---

## Compiled Truth

**The factory is leaving this repo.** It becomes `ticfac`; ticks becomes a
terminal-first product the factory *consumes*. The full plan is
`docs/projects/2026-08-27-factory-extraction/2026-08-27-factory-extraction-spec.md`
and the tracked work is project `a4n`. This page records the boundary facts that
were expensive to establish, so nobody re-derives them.

### What is factory, what is not — the naming trap

| Path | Actually is |
|---|---|
| `cloud/factory/**` | The factory Worker. ~29.5k lines TS + ~26k test. |
| `cloud/sandbox/**` | The factory's container image. |
| `cloud/worker/**` | **The ticks.sh BOARD.** D1 `tickboard`, `ProjectRoom`/`AgentHub` DOs, serves `internal/tickboard/server/static`. NOT the factory. The `deploy-cloud` release job deploys *this*. |

Everything under `cloud/` looks like one subsystem and is two. `cloud/factory/wrangler.toml`
says so explicitly: *"this bundle never imports from or deploys with cloud/worker."*

### `internal/operator` is two things under one name

- `internal/operator/*.go` (2,636 lines) — a durable **question store**. An agent
  parks a question; a human resolves it. `cmd/tk/cmd/herd_wait.go:209` parks
  *"for terminal answer with `tk answer`"* when NO channel is configured, and
  `cmd/tk/cmd/ask.go:22` says a question resolves on *"EITHER surface — the phone
  or the terminal"*. **This is core product** — it is what lets a long autonomous
  run park instead of dying. It stays.
- `internal/operator/telegram/**` (3,064 lines) — the only `Channel` ever
  implemented. Pure remote transport. It goes.

The `Channel` interface (`internal/operator/channel.go`) already has optional
capability interfaces (`Adopter`, `ContextualChannel`, `FormattedSender`,
`AttachmentSender`) — it was written to be implemented from outside, and it stays
as the extension point.

### The two Telegram implementations are mutually exclusive

Not merely duplicated. **One bot token has exactly one reader.**

- Go (`internal/operator/telegram/client.go:84`) long-polls `getUpdates` —
  *"a second one gets 409"*.
- TypeScript (`cloud/factory/src/telegram.ts`) registers a webhook —
  *"setWebhook and getUpdates are mutually exclusive and the front door is the
  choice this deployment makes"*.

They do not collide today only because the Go side has no users. **The webhook
wins** (it is deployed; a poller needs a laptop that stays awake, which is the
failure the factory exists to remove). The Go transport is retired, not
relocated; `tk channel` / `tk tell` become factory-API clients and no bot token
lives on a laptop.

## The interface is the `tk` CLI, not a Go API

The factory's ~50 `internal/` import edges look like ~50 things needing promotion
to a public Go API. **They are not** — this was established by reading them, and
the first draft of the plan got it wrong by counting instead:

- The **tracker** touch is five symbols (`tick.NewStore`, `tick.Tick`,
  `tick.TypeEpic`, `tick.TypeTask`, `tick.StatusOpen`), in the thin
  `cmd/tk/cmd/cloud*.go` wrappers — not in the factory packages at all.
- 11 edges are `internal/ticksrc` (the credentials file), which splits anyway.
- 3 are `operator.Pending` used as a **JSON wire type** in
  `internal/factory/dashboard/client.go:121,168` — never a tracker call.
- The rest are one-offs: 8 colour constants, one GitHub function, a git exec
  helper, and (the enumeration originally undercounted this) EIGHT collect
  symbols, not two.

**Two edges survive Phase 1 on purpose, and neither is a borrowing:**
`internal/ticksrc` is deferred to the credentials split, which needs a migration
rather than a cut; `internal/gatewaytrace` and `internal/cloud/state` are the
FACTORY'S OWN packages — the spec's What-moves table sends them to ticfac, so
those edges are internal-to-ticfac and survive the move by design. An
acceptance criterion phrased as "imports no ticks internal/ package" is false
against both and should say "no package that STAYS in ticks".

So ticfac reaches ticks through `tk … --json` (36 commands support it; types are
generated from `schemas/` via `make codegen-go`/`codegen-ts`).

**The decisive argument is consistency:** `cloud/sandbox/required-tk-commands`
already declares the `tk` subcommands the container must have, and the image's
last Dockerfile layer install-checks each one. The container has never imported
Go — it shells out. Having the laptop import Go while the container shells out
was two answers to one question.

**Consequence worth defending:** nothing is promoted out of `internal/`. Making a
package public is a permanent promise; freezing ticks' internals to serve one
consumer is the thing this approach avoids.

## What factory code costs a `tk` build — measured, then deferred

Phase 1 removed the `cmd/tk/cmd/root.go` edge, but `cmd/tk/cmd/factory_dashboard.go`
still imports `internal/factory/dashboard`, so a `tk` build still compiles factory
code. Tick `ffy` asked whether that is worth fixing now with a build tag or a CLI
boundary. **Measured first** (`go1.26.2`, `darwin/arm64`, `go build ./cmd/tk`,
cold cache via `go clean -cache`; variants produced by moving command files aside
and reverted afterwards):

| Build | Binary bytes | Δ |
|---|---|---|
| `tk` as it ships | 22,728,802 | — |
| minus `factory_dashboard.go` (the edge `ffy` names) | 22,565,330 | **−163,472 B, −0.72%** |
| minus the whole `tk factory` command family | 20,659,010 | −2,069,792 B, −9.1% |

- **Dependency surface: four packages of 337, and no third-party module.** The
  packages that enter a `tk` build *only* because of the factory are
  `internal/factory`, `internal/factory/dashboard`, `crypto/pbkdf2` and
  `crypto/internal/fips140/pbkdf2`. Everything else the factory needs — cobra,
  bubbletea, `net/http` — `tk` already compiles for its own commands. The factory
  adds no module to `go.mod`'s effective build closure.
- **Compile time: no measurable difference.** Cold builds came in at 6.00 s,
  6.22 s and 6.37 s wall across the three variants — run-to-run noise, not signal.

**Decision: defer to the phase that moves the files.** Recorded so that phase
inherits the number rather than re-deriving it.

Three things make the fix-now option a bad trade at this price:

1. **The 9% column is not available to a build tag.** It is reached only by
   dropping `tk factory deploy` / `setup` / `status` / `webhook`, which is
   shipping a different `tk`, not a cheaper build of the same one. What a tag on
   `cmd/tk/cmd/factory_*.go` actually buys is the 0.72% row.
2. **A tag on `factory_*.go` would not even make `internal/factory` stop
   compiling.** `cmd/tk/cmd/cloud_logs.go` and `cmd/tk/cmd/cloud_supervisor.go`
   import it for `factory.ReadSupervisor` / `factory.Supervisor` /
   `factory.SupervisorOptions`, and those are `tk cloud` commands that stay in
   ticks. Reaching "no `internal/factory` package compiles" means relocating the
   supervisor read as well — real work, for four packages out of 337 and no
   dependency reduction.
3. **The move deletes the cost outright**, and it has to answer the supervisor
   question anyway. A build tag added now would be scaffolding torn out then, and
   a tag is not free: it doubles the build configurations every later change has
   to keep compiling.

The epic's own acceptance never promised a factory-free build closure — it
promised no promotion out of `internal/` and no `root.go` edge, both of which
hold. This is the broader reading, and it is a Phase 5 obligation, not a Phase 1
regression.

## Gotchas

- **Eight CORE Go tests read fixtures out of `cloud/factory/test/fixtures/`** —
  `internal/herd/config` (×4), `internal/sandbox` (×2), `internal/operator`,
  `internal/tick`. The dependency runs *backwards*. They are deliberate Go/TS
  drift detectors for the `.tick/runners.toml` dual parser, sandbox worker boot,
  and message context. **A naive extraction relocates them and silently disables
  eight detectors** — the likeliest way this project does real damage.
- **`embedded.go` at the module root** welds `skills/`, `cloud/factory/` and
  `cloud/sandbox/` into one `go:embed` unit. It lives at the root precisely
  because `go:embed` cannot reach above its own package. `tk factory deploy`
  deploys the bundle baked into that binary — that is the version pin.
- **`tk` is a runtime dependency INSIDE the factory's container.** Per
  `cloud/sandbox/required-tk-commands`: `cloud branch`, seven `sandbox …`
  subcommands, `version`. The image build fails if any is missing. So the arrow
  does not cleanly reverse — `internal/sandbox` and `tk sandbox` stay in ticks.
- **`tk` commands self-register** via `init()` + `rootCmd.AddCommand` with no
  central registry, so deleting a command file removes the command with zero
  edits to any *other* command. The CLI surface cuts cleanly — with **one
  exception, found while measuring `ffy`**: `ResetFlags` in `cmd/tk/cmd/root.go`
  is a hand-maintained list of every command's flag variables, so removing a
  command file breaks the build there and nowhere else. It is a test helper, and
  the fix is to delete the corresponding lines. Budget for it in the move; do not
  read the compile error as a hidden coupling.
- **`~/.ticksrc` carries 30 `KeyFactory*` constants**, including live GitHub
  OAuth refresh tokens and a Cloudflare API token. Splitting it is the only step
  that can break a live deployment; it needs a migration, not a cut.
- **Three Go/TS pairs stay duplicated on purpose** — the `runners.toml` parser,
  sandbox worker boot, message context/trace IDs. Two runtimes genuinely force
  two implementations. The rule: duplicated behaviour is permitted only where
  runtimes force it, AND only with an executable contract that fails a build on
  drift.

## Timeline
- 2026-08-27 — boundary mapped, extraction scoped as project `a4n`, factory
  design-doc status header corrected (it claimed nothing was implemented above
  ~29.5k lines of running code) — @da494c6d
- 2026-08-27 — the cost of factory code in a `tk` build measured (0.72% of the
  binary for the edge in question, four packages of 337, no third-party module,
  no compile-time signal) and the fix deferred to the move, tick `ffy`.
