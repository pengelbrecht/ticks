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

`[evidence.acceptance]` is a single namespace across all containers; A1–A6 were
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

## Epic d0d closed (2026-08-16)

`tk tell` / `tk ask` / `tk answer` shipped on the epic-1 layer: durable `.tick/pending/`
entries, flock consumer election with cross-process question adoption, dual-surface
resolution (first answer wins, stale Telegram message settles itself), gates cleared only
under the same actor guard as `tk approve` (`--from human` attests a relayed decision —
review caught `tk answer` forging human stamps; closed), `--async`/`--collect --wait`,
`--escalate-after` (channel delivery delayed, local surfaces immediate), timeout leaves
questions answerable with distinct exit 7, unconfigured = exit 4 no-op. Review REVISE →
all 8 findings repaired in-epic; whole-repo gate and race pass green.

## Project 9m8 closed (2026-08-16)

Checkpoint nq3 signed off: A10–A18 behavior+test verified (fresh gate + race green at the
boundary), A19 (skill prose) approved by Peter in-session, A20 verified LIVE — real pairing to
@pe_ticks_bot, `tk ask --gate approve` to a phone, one tap closed the drill tick with
`[human] Approve (via telegram user …)`. PR #45 green, merge on GitHub. Follow-up epic `wlo`
(operator-chosen over the channel itself via a live multi-select ask): rich operator messages —
formatted tells (HTML/Block-Kit-expressible) + attachments (documents/photos, photo+gate for
epic 7ab's screenshot review). CLI note: `tk close` on a `--requires` tick now refuses instead
of routing to awaiting (route with `tk update --awaiting`); the skill's "normal path" sentence
is stale — fix scoped to wlo or next skill pass.

## Epic wlo closed (2026-08-16): rich messages

Formatted tells + attachments shipped as OPTIONAL channel interfaces (`FormattedSender`,
`AttachmentSender` — `operator.Channel` stays frozen; capability probes + plain-text
degradation). MarkdownLite = exactly bold/italic/code/code-block/link, godoc maps each to
Telegram HTML and Slack mrkdwn; escaping proven single-pass on every path; `StripMarkdownLite`
mirrors the renderer. Attachments: `KindAuto` zero-value resolver (.png/.jpg/.jpeg→photo),
client-side 50 MB + caption-byte guards; media settles via `editMessageCaption` with a 400
text-edit fallback for adopted refs (fakebot models both). Photo gates reuse the register/
adopt/route/settle machinery via `Engine.RegisterDelivered` (no second delivery path).
CLI: `tk tell --format|--file|--caption|--as`, `tk ask --photo --gate approve`. A55 demo
signed off live by the operator over the channel itself. Gotchas documented: Telegram's
text-file preview mojibakes BOM-less UTF-8 (display AND copy path; bytes intact);
snake_case italics footgun (`_` has no word boundary — backtick identifiers).

## Epic hdt tick spq (2026-08-23): webhook mode, and project legibility in every message

Two things that had to land together because both rewrite message composition.

- **The Worker's webhook route existed since the cloud operator bridge; nothing had ever
  called `setWebhook`.** That was the whole gap. `POST /api/channels/telegram/webhook/registration`
  (authenticated — a SIBLING path, because `isAuthExempt` exempts the update path by exact match
  only) derives the URL from `FACTORY_BASE_URL` or the request's own origin, narrows
  `allowed_updates` to `message`+`callback_query`, sends `TELEGRAM_WEBHOOK_SECRET` as
  `secret_token`, and drops the pending backlog. `tk factory webhook [--status|--delete]` drives it.
- **Privacy mode is checkable but not settable.** `getMe` returns `can_read_all_group_messages`,
  which is privacy mode INVERTED; there is no API to change it (@BotFather `/setprivacy`). So
  registration reads it and refuses (409 `telegram_privacy_mode_off`) rather than widening the
  bot's reach silently. Consequence, and the seam tick yu8 builds on: **reply-to is the entire
  correlation key for free text** — `parseTelegramAnswer` matches `reply_to_message.message_id`
  against the entry's `ref.message_id`, and explicitly drops a "reply" carrying
  `forum_topic_created` (a forum threads a topic's first message onto its own service message).
- **setWebhook and getUpdates are mutually exclusive per token**, so pairing had to learn about it:
  `tk channel setup telegram` now calls `getWebhookInfo` first and REFUSES with the registered URL
  rather than spending its 5-minute window on 409s and reporting a timeout. `--reclaim` deletes the
  webhook and tells the operator to register it again. `fakebot` models the 409 for the same reason.
- **Legibility is a TEXT problem, not a routing problem.** Routing was already unambiguous (RunRoom
  per project, unique question ids, callback data carries the id). Nothing composed the project INTO
  the message, so two repos produced identical questions. Now every gate/report/completion carries
  `owner/repo · epic <id> · tick <id>`.
- **Two composers, one shared fixture.** `internal/operator/context.go` (`MessageContext`) and
  `cloud/factory/src/message-context.ts` both write into the same chat, and a drift is invisible to
  both suites — each keeps rendering a readable line. Pinned by
  `cloud/factory/test/fixtures/message-context.json`, the same pattern as `tracker-layout.json`.
- **The topic map is a FIELD OF ENROLMENT** (operator instruction, verbatim: not a fourth config
  surface). `POST /api/projects` takes `telegram_topic_id`; value sets, `null` clears, absent leaves
  alone (enrolment is re-run for unrelated reasons). Stored in its own table (`migrations/0007`)
  because SQLite has no `ADD COLUMN IF NOT EXISTS` and this repo's migrations are re-runnable —
  `db.ts` LEFT JOINs it back so it reads as a field everywhere else. Withdrawing a project drops it.
- **`pending_question` grew an `epic` column** (additive ALTER in the DO constructor, "duplicate
  column name" is the expected answer). The project is the room's identity and the tick is on the
  entry; the epic was the one of the three nothing else could supply.
- **The LOCAL channel gets legibility but NOT topics**, deliberately: a locally paired bot talks to
  the operator in a private chat, and topics are a supergroup feature belonging to the factory's
  shared chat. Giving the local channel its own topic map would have been the fourth config surface.
- Local labelling is an optional capability (`operator.ContextualChannel`, a setter) rather than an
  argument on `Send`/`AskDeliver`: the context is a property of the run, not of each message.
  `tk tell --about <tick-id>` resolves epic+tick from the tracker; an epic names itself as the epic
  and carries no tick; an unresolvable id costs the labels, never the announcement.
- Gotcha found while landing it: `tk tell --file` with no `--caption` must stay uncaptioned — a
  caption that is only a label is chrome under a file that says nothing.

## Epic hdt tick la9 (2026-08-23): the human gate — a signal is a DRAFT until somebody presses

The gate between "something arrived" and "the factory spent money on it". `cloud/factory/src/drafts.ts`
is the surface; the lifecycle lives in the project's `SignalInbox`.

- **A draft is not a tick with a flag, and that is the whole design.** The rejected shape was
  `status: "draft"` on a real record: it would sit in `.tick/issues/` in front of `tk next`, `tk ready`
  and a wave's sweep, and invisibility would be whatever every reader remembered to filter. Instead a
  pending proposal is a row in the DO — no tick id, no record, no commit — and the ONLY path to the
  tracker writer is `SignalInbox.decide(draftID, ...)`, reachable only with an id a human pressed.
  Second lock, in Go: `Tick.Validate` accepts open/in_progress/closed and nothing else, so a
  draft-flavoured record is not expressible. Pinned both sides by the `human_gate` block in
  `cloud/factory/test/fixtures/tracker-layout.json`.
- **`submitSignal` produces a proposal, full stop.** There is deliberately no second front door that
  commits directly — a gate a source could choose to skip is a convention, not a gate. This matters at
  merge time: any source built later (tick 0vb's generic webhooks included) inherits the gate by having
  nowhere else to go.
- **Discard's dedup row is a feature, not litter.** It is written when the draft is ADMITTED (not after
  a commit, as tick 8sm's ordering required) and it survives the discard, so a source that redelivers
  forever gets `duplicate` rather than a fresh proposal each time. The 8sm ordering argument dissolves
  because admission is now fully synchronous: the dedup read and both writes sit in one DO prefix with
  no await between them, so a redelivery racing its original is simply the next event.
- **Admission stopped being the thing that is serialised; PRESSES are.** `#tail` now chains accepts, and
  `SIGNAL_INBOX_QUEUE_LIMIT` bounds commits in flight. A new `MAX_PENDING_DRAFTS` bounds the pile
  waiting for a human. A double press is caught by claiming the draft (`state = 'committing'`) in the
  synchronous prefix before the first await; an unsettled commit puts it back to `pending`, because
  nothing was written and pressing again must be safe.
- **Callback data is `d:<draft id>:<verb>`** (and `y:<draft id>:<type>` for the retype row) — a press
  names one proposal in one project, which is why this surface needs none of yu8's disambiguation. Ids
  are random hex, not sequential: in a shared chat a guessable id is a button somebody else's press
  could land on. The namespaces cannot collide with the RunRoom's `q:`/`r:`, so the webhook route
  offers a press to the draft surface first and hands everything else to the question path.
- **Routing a press to a project is a scan, not a lookup.** The draft id does not carry the project (it
  would not fit the 64-byte callback limit reliably), so `findDraft` asks each enrolled project's inbox.
  Same precedent as the free-text path, and bounded by the enrolment table.
- **The forgery invariant had to survive framing.** vuz's rule — every factory line at column 0 with
  `<b>`, every reporter line behind `> ` — is now load-bearing for BUTTONS: a spoofed message is a
  spoofed button. `drafts.ts` never re-wraps or un-quotes the block the source rendered, and every line
  it adds starts at column 0 with `<b>`. `telegram.ts` gained `sendTelegramHTML`/`editTelegramHTML`
  because `sendTelegramReport` escapes what it is given and would have shown `&lt;b&gt;`; the rule that
  keeps that safe is that only a source-rendered block reaches them.
- **Dispatch's base sha is the commit that carries the accepted tick** — the first commit in which the
  tick it was dispatched to work exists. A tick with a parent dispatches as a one-tick wave under that
  epic; one without a parent IS the epic the run is addressed by. A refused ignition (project busy, no
  Workflow binding) still leaves the tick filed and says so on the message: accepting and igniting are
  two acts.
- **The one affordance: retyping.** `github-issues.ts` hardcodes `type: "bug"` per UC3 and never reads
  it from the issue; the human retypes before filing rather than fixing a wrong tick afterwards. Only
  while pending — a filed tick is `tk update`'s business.
