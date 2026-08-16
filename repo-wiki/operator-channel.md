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
