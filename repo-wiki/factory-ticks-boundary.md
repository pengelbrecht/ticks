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
  helper, two collect symbols.

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
  edits elsewhere. The CLI surface cuts cleanly.
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
