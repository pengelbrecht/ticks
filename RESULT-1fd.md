# RESULT — tick 1fd

Branch: `tick/1fd`

## What was done

Added `TestOfflineParkResolveNotifiesAgent` in `cmd/tk/cmd/offline_answer_test.go`
(committed; only file changed). It drives the real CLI end to end:

1. **park** — `tk ask abc123 --question "..."` via `ExecuteArgs`, with no operator
   channel configured. Asserts exit code `ExitNotFound` (degraded-mode park,
   `askParkedError`) and that the tick is parked `awaiting: input`.
2. **list** — `tk list --awaiting= --all --json` via `ExecuteArgs` (stdout
   captured through an `os.Pipe`, since `list.go`'s JSON path writes straight
   to `os.Stdout` rather than `cmd.OutOrStdout()`). Asserts the parked tick is
   surfaced.
3. **resolve** — `tk answer abc123 eu-west-1` via `ExecuteArgs`.
4. **agent notified** — a goroutine started before step 3 calls
   `operator.Engine.Await` directly on the pending entry's id, 20ms poll
   interval. This is the literal mechanism a blocked run/agent relies on to
   learn of an answer (`askAwait` calls the same `Engine.Await`); simulating
   it directly proves the exact code path a blocked process depends on
   unblocks correctly with no channel involved. Asserts it returns
   `OutcomeAnswered` / `"eu-west-1"` within 15s, and that the tick's notes
   carry `[human] eu-west-1` with `awaiting` cleared.

The whole test additionally installs a blocking `http.RoundTripper` as
`http.DefaultTransport` for its duration and asserts zero calls were made —
so a future regression that makes any part of this path reach for a network
client, not just a specific one, fails loudly rather than silently passing
against a real endpoint.

`go test ./...` — full suite green (see below).

## The loud finding — the offline guarantee has a live, non-obvious escape hatch

While writing this guard *before* looking at whether it would trivially pass,
it did not — it hit a real network endpoint on this machine. Root cause,
confirmed by instrumenting and reverting (no production code changed in the
final commit):

- `askChannel()` (`cmd/tk/cmd/ask.go`), used by both `tk ask` and `tk answer`,
  falls back to `factoryOperatorChannel()` (`cmd/tk/cmd/factory_operator.go`)
  whenever no Telegram channel is configured in `.tick`/`TK_HOME`.
- `factoryOperatorChannel()` first checks `TICKS_FACTORY_URL` /
  `TICKS_FACTORY_TOKEN` env vars, and if either is empty, falls back to
  **`~/.ticksrc`** (`internal/ticksrc`, via `os.UserHomeDir()` — i.e. the real
  `$HOME`, not `TK_HOME`).
- On any machine that has ever run `tk factory deploy` (this one included),
  `~/.ticksrc` carries a live `factory_url` and bearer `factory_token`. With
  no channel configured and no `TICKS_FACTORY_*` env vars set, `tk ask` /
  `tk answer` **silently construct a real `telegram.FactoryChannel` and make
  real HTTPS calls to a real deployed Cloudflare Worker**, using a real
  credential. This is exactly the "offline path secretly depends on a
  transport" failure mode this tick was written to catch — it just isn't the
  Telegram bot poller, it's the factory bridge, which lives in the same
  package.
- Confirmed this is **pre-existing, not something Phase 4b would introduce**:
  the existing test `TestAskUnconfiguredChannelParksTick`
  (`cmd/tk/cmd/ask_test.go`) does not isolate `$HOME` either, and on this
  machine it *also* reaches the real factory and gets a real
  `*telegram.FactoryChannel` back — it only keeps passing by coincidence
  (the bot's `bot.Calls()` check watches the *fakebot* server, not the real
  one it never touches; and the real factory's fast 404 for a nonexistent
  tick happens to produce the same exit code the test expects). This is a
  latent hermeticity gap in the existing suite worth a follow-up (isolate
  `$HOME` — or add a `ticksrc` override hook — in `askTestEnv`/
  `channelTestHome`), not fixed here since it isn't blocking verification of
  this tick (my new test isolates `$HOME` itself and is unaffected).
- **This changes the shape of the Phase 4b deletion tick.** Epic 9oy's own
  description says: *"Retire `internal/operator/telegram/**` ... and repoint
  `tk channel` and `tk tell` at the factory's API."* But
  `internal/operator/telegram/factory.go` — living inside that same
  directory the plan blanket-retires — **is** `tk ask`/`tk answer`'s existing
  connection to the factory's API (`FactoryChannel`, used by
  `factoryOperatorChannel()` above, and also directly by `cmd/tk/cmd/answer.go`
  for `runRemoteAnswer`/cloud RunRoom answers). A literal `rm -rf
  internal/operator/telegram` would delete the thing the plan says should
  survive (repointed), not just the bot poller. The deletion tick needs an
  explicit carve-out/move for `factory.go` (and whatever it depends on
  in-package) before the directory goes, or the cloud-answering bridge and
  this exact fallback path break.

## What stays clean (verified, not just assumed)

- `internal/operator/*.go` (engine.go, pending.go, channel.go, config.go,
  mapping.go, markdownlite.go, context.go) — the question store and
  resolution engine this tick was asked to pin — has **zero import** of
  `internal/operator/telegram`. Confirmed with
  `grep -n "github.com/pengelbrecht/ticks/internal/operator/telegram"` across
  every non-test file in `internal/operator/`: no hits. Only string constants
  (`AnsweredByTelegram = "telegram"` etc.) reference the name. This part of
  the plan (telegram/markdown.go goes, markdownlite.go stays) is safe as
  written.
- The mechanism a blocked agent actually depends on
  (`operator.Engine.Await` polling the pending store on disk) is pure
  filesystem I/O — proven by this test running it directly with a
  network-blocking transport installed and zero calls recorded.

## Next tick should know

- When touching `internal/operator/telegram/**` for the actual retirement,
  handle `factory.go` (`FactoryChannel`) as a **move/keep**, not a delete —
  it is load-bearing for `tk ask`/`tk answer`'s cloud-RunRoom answer path and
  the local-CLI factory fallback, both still wanted per the epic's own
  "repoint at the factory's API" language.
- Any test asserting "no channel configured" behavior for `tk ask`/`tk answer`
  should isolate `$HOME` (not just `TK_HOME`/`TICKS_FACTORY_*`), or it is
  silently non-hermetic on a machine with a real `~/.ticksrc`. This test does
  it (`t.Setenv("HOME", t.TempDir())`); the older
  `TestAskUnconfiguredChannelParksTick` does not, and should probably be
  updated as a follow-up.

## Full suite

`go test ./...` — all packages `ok`, including `cmd/tk/cmd` (74.5s) which now
carries this guard. No production code was modified; the only committed
change is the new test file.

STATUS: DONE_WITH_CONCERNS — see "The loud finding" above: `internal/operator/telegram/factory.go`'s `FactoryChannel` is a live dependency of the terminal `tk ask`/`tk answer` path and must be carved out (moved/kept), not deleted, when Phase 4b retires `internal/operator/telegram/**`. This is a planning input for the deletion tick, not a defect in this tick's own deliverable.
