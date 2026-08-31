# Tick 2f8: Remove tk tell, tk channel and the transport seam

Branch: `tick/2f8`

## Summary

Removed the Go Telegram poller and every in-process transport seam it needed,
leaving parking (`tk ask`), terminal answering (`tk answer`, `tk approve`,
`tk reject`), the question store, and `markdownlite.go` untouched in
substance. This was completed across two work sessions (the second picked up
after the machine slept mid-session); both are committed:

- `80ea31b8` — the bulk removal (telegram package, Channel/Consumer, tell,
  channel, factory_operator, channel_context; ask.go/answer.go/herd_wait.go/
  relay.go repointed to the terminal-only design).
- `e196ecd0` — this session: fixed the one thing left broken
  (`answer_test.go` still imported the deleted `telegram`/`fakebot`
  packages), and hardened tick 1fd's offline guard.

## What's gone

- `cmd/tk/cmd/{tell,channel,channel_context,factory_operator}.go` and their
  tests — no stub, no commented-out remnant.
- `internal/operator/telegram/**` (channel.go, client.go, factory.go,
  markdown.go, fakebot, all tests).
- `operator.Channel` and its capability interfaces (`Adopter`,
  `ContextualChannel`, `FormattedSender`, `AttachmentSender`), `Consumer` and
  `PendingRegistrar` in `engine.go`, `FakeChannel`, the global
  `OperatorConfig`/`ChannelConfig` (bot-token storage), `MessageContext`.
- `Engine.RegisterDelivered` and the photo-gate path in `tk ask`
  (`--photo`/`--caption`) — both existed solely to serve `AttachmentSender`.
- `mapping.go`'s `ResolveOperator`/`resolveOperator` — the only code that
  bridged `.tick/operators.json` to the now-deleted global bot-token config.

## What survived, and why

- `PendingStore`, `Pending`, `Question`, `Option`, `MessageRef`, `Outcome`
  (moved into a new `internal/operator/question.go` since their old home,
  `channel.go`, is gone), the consumer/apply file locks, `markdownlite.go`.
- `.tick/operators.json` (`Mapping`, `OperatorIdentity`, `LoadMapping`,
  `SaveMapping`, `UpsertOperator`) — confirmed via `docs/design/cloud-factory.md`
  that the **cloud factory Worker** (TypeScript, outside this repo's Go
  build) is the intended reader, resolving `telegram:<user_id>` → tk operator
  name. Nothing else in Go read it beyond the now-deleted `tk channel`
  command and mapping.go's own tests.
- `internal/herd/relay` — parks a blocked agent's question and waits for a
  terminal answer via `engine.Await`; only the `Channel` field and the
  Telegram-escalation half of its tests were removed.

## Design decision: what `tk ask` means with no channel, ever

Tick 1fd's offline guard (`offline_answer_test.go`) already pinned the exact
contract: a plain `tk ask` degrades to exit 4 (parked, not blocking) the
moment no channel is configured — it never blocked waiting. Since a channel
can now never exist, that degraded branch became the *only* branch:

- Plain `tk ask <id> --question ...`: registers, returns exit 4 always. It
  never blocks — `tk ask --collect --wait` or a direct `tk answer` are the
  ways to actually get an answer.
- `tk ask --async`: registers and now **succeeds** (exit 0, prints the id) —
  previously this also degraded to exit 4 without a channel, since delivery
  was baked into the same early-return. Async's whole point (park now,
  collect later) never needed a transport, so this is a real behavior
  improvement, not just a rename.
- `tk ask --collect [--wait]`: unchanged in substance — it already worked
  from the local pending store; only the channel/consumer plumbing around it
  was removed.
- `--escalate-after` / `NotBefore` stays on the `Pending` entry as pure
  metadata; nothing in this repo's Go code reads it for delivery any more
  (the dashboard already reads `NotBefore` independently for display).

## This session's specific fix

`answer_test.go` had 10 tests fixtured on a bot-backed `askTestEnv` (from the
deleted `ask_test.go`/`channel_test.go` era). Rebuilt on the new bot-free
`askTestEnv` (now `(repo, store)`, no `fakebot.Bot`) in `ask_test.go`. Nine of
the ten were genuinely terminal-answer tests that only *incidentally* used
the bot fixture (waiting for a delivered message, editing it) — those
assertions were dropped, the terminal-side assertions kept. One test,
`TestStalePressAfterAnswerIsAcknowledgedOnly`, constructed an
`operator.Consumer` over a `telegram.Channel` and asserted a stale Telegram
button press is acknowledged without double-applying — that tests a
mechanism that no longer exists, so it was deleted rather than faked into a
shape that still compiles.

## Offline guard hardened

`TestOfflineParkResolveNotifiesAgent` (tick 1fd) previously isolated `$HOME`
to an *empty* temp dir — proving the offline path works when `~/.ticksrc`
doesn't exist, but never exercising the actual regression 1fd found: a
**populated** `~/.ticksrc` (a live factory URL + bearer token, exactly what
`tk factory deploy` leaves behind) being silently read by `askChannel()` →
`factoryOperatorChannel()` and used to make real HTTPS calls. That fallback
function is now structurally deleted (`ask.go`/`answer.go` no longer import
`internal/ticksrc` at all — confirmed by grep), but the test no longer trusts
that absence implicitly: it now writes a real-looking `~/.ticksrc` via
`internal/ticksrc.LoadFrom`/`.Save()` before running `tk ask`/`tk answer`,
and still asserts zero calls through the network-blocking transport. Passes.

## Verification

- `go build ./...` — clean.
- `go vet ./...` — clean.
- `go test ./...` — **all packages ok**, including
  `TestOfflineParkResolveNotifiesAgent` and the full `cmd/tk/cmd` suite
  (57.7s) and `internal/operator` (cached from a prior green run this
  session).
- `grep` confirms zero remaining references to `api.telegram.org`, `BotAPI`,
  `getUpdates`, `sendMessage`, or `operator.Channel` anywhere in Go source.

## Next tick should know

- `.tick/operators.json` is now Go-write-only-by-hand (no `tk channel setup`
  writer exists any more); if a future tick wants a CLI to populate it again,
  that's new surface, not a restoration.
- `internal/factory/dashboard` independently mirrors `Pending`/`NotBefore`
  shapes for the web dashboard — untouched, unaffected, already had its own
  types.
- `skills/ticks/references/agent-runner.md` still documents `--async`,
  `--escalate-after`, and `tk herd wait --relay-blocked-after` in terms that
  assumed a channel existed ("delivery to Telegram", "reaches the operator
  channel"). Their *registration* behavior is unchanged or improved
  (`--async` now succeeds), but the doc's phone-delivery framing is now
  stale and should be updated in whatever tick owns runner-neutral docs.

STATUS: DONE
