# Operator Channel — Telegram-first human reach for autonomous runs (2026-08-16)

Project `9m8` (goal facts `[A10]`–`[A20]`; epics `54v` foundation → `d0d` ask/tell → `au6`
skill integration; checkpoint `nq3`). Extends the human-interaction model (see
`human-interaction-model.md`): planning stays interactive, but *execution* gains a delivery
channel to the operator's phone for the touchpoints that legitimately survive planning —
approval gates, escalations, checkpoint sign-offs, completion reports.

## Architecture decisions (settled in planning, 2026-08-16)

- **Per-operator personal Telegram bot; no global bot, no webhook, no cloud.** Telegram's Bot
  API allows exactly one `getUpdates` consumer per token (409 otherwise) and the token grants
  full bot control, so a shared/global bot forces a hosted relay — rejected as a product
  choice, not a technical one. tk long-polls `api.telegram.org` directly. A hosted relay (or
  Slack via Socket Mode) can slot in later behind the same interface.
- **Channel-neutral interface, Telegram as the only v1 implementation.** No Go multi-platform
  interactive-chat lib worth adopting exists (nikoksr/notify is send-only; go-joe/go-sarah own
  the event loop). We own a small `internal/operator.Channel` interface sized to ask/tell;
  Telegram wire types appear only in `internal/operator/telegram`.
- **Secrets split:** credentials (token, chat binding) live globally in `~/.tick/operator.json`
  (`TK_HOME` override; 0600 file / 0700 dir, atomic temp+rename writes). The repo gets only
  a non-secret multiplayer mapping `.tick/operators.json` (operator name → bot username +
  telegram user_id); a token-shaped string in the repo file is rejected on load. Global config
  is per-user by design — one pairing serves every repo.
- **Auth = bound user id.** Pairing (`tk channel setup telegram`: token → getMe → one-time
  `/start <code>`) binds the operator's numeric Telegram id; all other senders' updates are
  dropped at the transport. Replies match pending questions by message id (ForceReply /
  callback), so concurrent questions disambiguate.
- **The tick is the source of truth, never the chat.** Answers land as `tk note --from human`
  (telegram identity recorded) and clear awaiting state with human-stamped activity — passing
  the epic gate audit. Out-of-band `tk approve` wins over a late button press; resolved
  messages get edited (buttons removed) and stale presses acknowledged as already-resolved.
- **Only the orchestrator touches the channel; workers never do** — one poll consumer per
  machine, batching, and the existing worker boundary stays intact.
- **`tk ask` blocks by default (`--timeout` leaves the tick awaiting, distinct exit code);
  `--async` + collect for orchestrators ("ask early, block late"). `tk tell`** is one-way;
  unconfigured channel = distinct exit code + no-op, so prompts may call unconditionally.
- **Full AskUserQuestion parity in v1**: free text (ForceReply), single-select buttons,
  multi-select toggle keyboard + Done, "Other…" fallback. `callback_data` ≤64 bytes → buttons
  carry short option ids; labels stay local in pending-question state.
- **Announce points are prompt-driven, not hardcoded**: run-level completion, checkpoint
  reports, and parked-tick notices by default; waves stay silent. The ask-bar doctrine is
  unchanged — a question planning could have resolved is still a planning miss (retro audits).

## Contract as landed (epic 54v tick u5o, post foundation review)

```go
type Channel interface {
    Send(ctx context.Context, text string) error
    AskDeliver(ctx context.Context, q Question) (MessageRef, error)
    Events(ctx context.Context) <-chan Event   // closes on ctx cancel or fatal EventError
    Resolve(ctx context.Context, ref MessageRef, outcome Outcome) error
}
```

Foundation review forced two pre-freeze changes: ctx-first on all ops (they're blocking HTTP
in every real transport) and an `EventError` kind distinguishing "channel dead" (revoked
token) from "operator quiet". `MessageRef` is the correlation key for concurrent questions;
unsolicited operator text is an `EventAnswer` with zero Ref. Config ids are strings (not
int64) so non-numeric channels fit; Telegram code must `strconv.ParseInt`.

## Telegram transport as landed (epic 54v tick pwd)

`internal/operator/telegram` is raw net/http + encoding/json; Bot API wire structs are
**unexported** so the schema cannot leak — the exported surface is `Client` (GetMe,
SendMessage, EditMessageText, EditMessageReplyMarkup, AnswerCallbackQuery, GetUpdates),
`Channel` (the `operator.Channel` impl), and neutral value types (`BotInfo`, `Update`,
`OutgoingMessage`, `Button`, `Error`).

- **Offset lives in the Client**, not the caller: `GetUpdates(ctx, timeout)` confirms the
  previous batch itself. Crucially the offset advances past *dropped* updates too —
  filtering after computing it, so a stranger's traffic can't wedge the poll loop forever.
  `SetOffset` exists for resuming from persisted state.
- **`UserID: 0` means unfiltered** — that's the pairing mode (tk channel setup hasn't learned
  the operator's id yet). Any non-zero id drops every other sender at the transport (A14 half).
- **Callback data scheme** (≤64 bytes by construction): `o<index>` single-select press,
  `t<index>` multi-select toggle, `d` Done, `x` Other…. The index is into the question's
  option slice; labels and caller option ids never leave the process (`pendingQuestion` state
  keyed by question message id). Presses correlate by *message id*, not callback payload.
- **`Error.Fatal()` is the transient/fatal split** the `Events` contract needs: 401/403/404/409
  → `EventError` + stream close; everything else retried with doubling backoff (409 counts as
  fatal because another getUpdates consumer owns the token). Network errors are wrapped in a
  `transportError` that redacts the token — `url.Error` would otherwise print it.
- **Clearing an inline keyboard = omitting `reply_markup`** on an edit. `Resolve` uses that,
  and re-renders the original question body + outcome so the chat keeps the record.
- **`fakebot` speaks HTTP only** — it does not import the client package, so a wire-format bug
  can't be cancelled out by a shared Go type. It caps its own long-poll wait
  (`MaxPollWait`, 150ms) because Telegram's `timeout` is whole seconds; `FailNext` injects
  status codes to drive the transient-vs-fatal paths. Reuse it for pairing (tick jmk) and epic 2.

## Fact-sheet numbering gotcha

`.tick/config.md` Acceptance Evidence is a single namespace across all containers; A1–A6 were
already claimed by the Pi-extension epic, so this project uses A10–A20 and epic 54v uses
A30–A32. Always grep existing usage before numbering a new fact sheet.

## Epic 54v closed (2026-08-16)

Foundation shipped: `internal/operator` (contract + config + fake), `internal/operator/telegram`
(client, Channel, fakebot), `tk channel setup telegram`/`status` (pairing with no-echo token
prompt, offset-confirmed `/start`, chat+user filtering), README + `docs/operator-channel.md`.
Frontier final review APPROVEd; all 6 findings repaired in-epic (notably: `Channel.Send` is
PLAIN TEXT at the interface — transports escape; pairing update offset-confirmed so later
polls don't replay it). Epic 2 (`d0d`) inherits two review notes: backlog replay semantics on
first poll, and durable pending-question state for cross-restart button matching.

## Epic d0d engine layer as landed (tick v6z, 2026-08-16)

Durable ask state lives in `.tick/pending/` (atomic writes; entries record the parked
`awaiting` value as the out-of-band baseline). One consumer per repo via flock
(`lock_unix.go`/`lock_windows.go` — LockFileEx port made `golang.org/x/sys` a direct dep);
losers of the election get `ErrConsumerBusy` and watch their resolution file instead — never a
second Events stream. `Engine.Register` parks awaiting + writes the entry; `Await` blocks on
either surface, applies human-provenance tick state itself (note `[human]` + `(via telegram
user <id>)`, explicit approve/reject activity on gates), and returns `OutOfBand` so callers
settle the stale Telegram message via `channel.Resolve`. Non-answered outcomes (timeout)
deliberately touch no tick state. Escalation delay = `not-before` on the entry; the consumer
withholds channel delivery until then, so local surfaces always see questions first.

## Epic d0d rich ask surface as landed (tick lwl, 2026-08-16)

Four non-obvious things fell out of making `tk ask` async and `tk answer` first-class:

- **Applying a resolution is exactly-once, enforced, not hoped for.** Two processes can hold
  the same answer — a local `tk answer` and the `tk ask` blocked on it both run
  `Engine.Apply` — and a second apply would write the `[human]` note twice. Apply now takes
  `.tick/pending/.apply.lock` (blocking flock, 30s ceiling), re-reads the entry under it, and
  skips when `resolution.applied_at` is stamped, reporting `Applied.AlreadyApplied` while
  still returning the outcome so the loser can tell its caller what was decided. The stamp is
  written last: a crash between the tick write and the stamp costs an idempotent re-apply,
  never a lost answer.
- **`operator.Adopter` is why async works across processes.** The Telegram transport keeps
  option labels and multi-select state in memory keyed by message id, so a press on a message
  a *previous* run delivered is unroutable — it reads as a stale button. `Consumer.Deliver` is
  therefore a reconcile sweep, not just a poster: delivered-and-unresolved entries are handed
  back through the optional `Adopter` interface. `Run` calls `Deliver` **before** subscribing
  to `Events`, because the first poll can return an update for a question not yet adopted.
  Adopted multi-selects start with an empty selection — the toggles lived in the dead process.
- **`--collect` owns entry deletion.** Nothing else removes a `.tick/pending` file: a question
  stays on disk, visible to `tk list --awaiting` and answerable from either surface, until
  somebody takes delivery of the answer. `--collect --wait` snapshots the entry set at start
  so it terminates instead of chasing new questions.
- **`tk answer` refuses to guess.** On an option question a non-matching word is exit 2 naming
  the options, never a silent free-text answer — free text is accepted only where the question
  allows it (no options, or `allow_other`). It targets the *oldest* open question on the tick;
  answering a newer one would strand the older behind a tick the engine now reads as
  out-of-band.

## Epic d0d final-review repairs (tick gqh, 2026-08-16)

Eight findings from the epic's final review; the five that change a contract:

- **A gate answered with `tk answer` is a verdict, and goes through the same guard as
  `tk approve`.** `cmd/tk/cmd/verdictguard.go:resolveVerdictActor` is now called from
  `runAnswer` for `PendingGate` entries, *before* anything is written, so a runner-shaped
  `TK_ACTOR` is refused (exit 2) with the gate untouched unless `--from human` attests a
  relayed human decision. Without this, `tk ask --gate approve` + `tk answer approve` was a
  self-approval path the CLI otherwise closes. `--from` on a plain ask is a usage error: a
  note is not a verdict.
- **A timeout no longer resolves the question.** `askGiveUp` used to write an
  `OutcomeTimedOut` resolution, which spent the entry's one resolution on "nobody was
  around" — a later `tk answer` then hit "already answered" and the operator's real answer
  applied to nothing. It now only *reads* the entry: if an answer landed during the deadline
  it wins, otherwise the entry is left open and the timeout outcome exists solely to edit the
  channel message ("the run stopped waiting, but this question is still open"). Same
  semantics `--collect --wait` always had.
- **`ExitTimeout` is 7, no longer sharing 5 with `ExitGitHub`.** Branching on "still
  unanswered" no longer requires reading stderr.
- **`PendingStore.Resolve` takes the apply lock around load-check-save.** First-resolution-wins
  was a comment, not a guarantee: two simultaneous resolvers both read an unresolved entry and
  the second overwrote the first. Callers must NOT hold the apply lock when calling `Resolve`
  (flock per open file description ⇒ a nested take deadlocks); `Engine.Apply` takes it
  separately, after `Resolve` returns. `internal/operator/resolve_race_test.go` fails
  deterministically without the lock.
- **`Engine.Apply` clears awaiting only when no OTHER open entry names the tick.** A tick can
  carry several questions; clearing on the first answer made the engine read every sibling as
  out-of-band and cancel it unanswered. The last answer clears it (`Engine.otherOpen`).

Two provenance repairs worth knowing: the `[human]` note is stamped with
`resolution.answered_at` (the decision), not apply time — a late `--collect` no longer
misdates the audit trail; and `Consumer.Route` stamps `telegram_user_id` from the new
`Event.SenderID` (read off the update) rather than the configured bound id. Behaviour is
identical while the transport's sender filter holds, which is the point: the note is a fact
about the decision. `tk tell` with empty args and empty/whitespace stdin is now exit 2
before any HTTP.
