# Operator Channel: Telegram

The operator channel is how an autonomous `tk` run reaches the human who launched it —
approvals, escalations, checkpoint sign-offs, and completion reports land in a chat
instead of a terminal you have to keep watching. Telegram is the only implemented
channel today.

## Why a personal bot, not a shared one

Telegram's Bot API allows exactly one `getUpdates` consumer per token — a second
consumer gets a `409` and long-polling breaks. A shared or global bot would need a
hosted relay in front of it just to fan updates out to multiple users, so `tk`
instead has you create your own bot and pairs it directly with this machine.
`tk` long-polls `api.telegram.org` itself; there is no daemon and no cloud
component to stand up.

Once the project is enrolled with a **cloud factory**, the consumer moves: the
factory Worker takes the token's updates by webhook, and the local process stops
polling. That is the same one-consumer rule, resolved in the other direction —
see [Webhook mode](#webhook-mode).

## Setup

1. Talk to [@BotFather](https://t.me/BotFather) on Telegram and create a bot
   (`/newbot`). BotFather gives you a token that looks like
   `123456789:AAExampleTokenAAAAAAAAAAAAAAAAAAAAAAA`.
2. Run:
   ```bash
   tk channel setup telegram
   ```
   Paste the token when prompted, or pass it directly with `--token` (useful in
   scripts, but prefer the prompt on a machine with shell history logging).
3. Setup verifies the token with a `getMe` call, then prints a one-time pairing
   code together with a `t.me` deep link:
   ```
   Open this link and press Start, or send the bot the message below:
     https://t.me/<your_bot>?start=<code>
     /start <code>
   ```
   Opening the link (or sending `/start <code>` to the bot yourself) is what
   binds your Telegram account as the operator. `tk` waits up to 5 minutes for
   this message; anyone else's message is ignored.
4. On success `tk` sends a confirmation to the paired chat and writes the
   credential to the global operator config (see below). If the current
   directory is a repo with a `.tick` directory, you're then offered a
   secret-free entry in the repo's tracked operator mapping.

Because the sender of the `/start <code>` message becomes the bound operator,
traffic from anyone else is dropped at the transport from then on — pairing is
also the auth step.

### Keep privacy mode ON

Leave the bot's group privacy mode enabled — it is BotFather's default, and
`/setprivacy -> Enable` puts it back. In a group the bot is then delivered only
commands and replies to **its own** messages, which is the blast radius this
design wants: a shared operator supergroup does not stream every unrelated word
anyone types into a Worker that talks to a model.

Inline button presses reach the bot regardless of privacy mode, so approval
gates keep working untouched. What privacy mode DOES change is that **replying
to the bot's message is load-bearing**, not a nicety: a free-text answer is
correlated to its question by `reply_to_message`, so answer by replying to the
question rather than by typing into the chat.

The factory refuses to register its webhook for a bot whose privacy mode is off
(`getMe` reports `can_read_all_group_messages`), and says so.

## Webhook mode

The Bot API allows exactly **one** update consumer per token: `setWebhook` and
`getUpdates` are mutually exclusive. A local pairing polls; a cloud factory
receives updates at its own front door, which is what lets a signal become a
draft tick with no local process running at all.

```bash
tk factory webhook            # register (or re-register) the webhook
tk factory webhook --status   # what Telegram believes it is
tk factory webhook --delete   # withdraw it and go back to polling
```

Registration is done BY the factory rather than by this command: the bot token
is a Worker secret, the URL Telegram has to reach is the deployment's own, and
the privacy-mode check happens there. The Worker asks for `message` and
`callback_query` only, sends `TELEGRAM_WEBHOOK_SECRET` as Telegram's
`secret_token` (echoed on every delivery and checked at the door), and drops
whatever queued while nothing was listening.

Because registering stops every long poll on the same token,
`tk channel setup telegram` refuses to pair while a webhook is registered and
tells you what is holding it. `--reclaim` withdraws it and pairs anyway —
register the webhook again afterwards, or the factory stops receiving answers.

## One chat, many projects

One bot and one chat now serve many projects, because one factory does. Two
things keep that readable.

**Every message names what it is about.** Gate messages, reports and completions
carry a `owner/repo · epic <id> · tick <id>` header, so two repositories asking
the same question do not produce two identical messages. `tk tell --about
<tick-id>` reads the epic and tick off the tracker:

```bash
tk tell --about 8sm "worker landed, tests green"
```

**Each project can have its own topic.** Turn on *Topics* in a Telegram
supergroup (`forum` in the Bot API), make one topic per project, and record its
`message_thread_id` when you enrol the project with the factory — the topic map
is part of enrolment, not a separate configuration surface:

```bash
curl -sS -X POST "$FACTORY_URL/api/projects" \
  -H "Authorization: Bearer $FACTORY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"project":"acme/web","telegram_topic_id":17}'
```

Passing `"telegram_topic_id": null` clears it; leaving the field out of a later
enrolment leaves the assignment alone. A project with no topic posts to the chat
itself, so a deployment without Topics works unchanged — the header alone still
tells the projects apart.

## Triaging a signal: Create, Dispatch, Discard

A factory can be pointed at sources outside the tracker — a labelled GitHub
issue today, other webhooks later. None of them files a tick. What arrives is a
**draft**: a proposal posted into the project's topic with three buttons.

```
acme/web
Draft tick — nothing runs until a human says so
Project: acme/web
Source: GitHub issue #87, opened by @alice
Consent: `tk` applied by @maintainer
Title: CSV export drops rows with embedded newlines
Issue text below is the reporter's, quoted and untrusted:
> Export a CSV whose cells contain newlines; rows go missing.
Type: bug — Create files it as this.
Nothing has been filed yet. Create accepts it as an open tick. Dispatch accepts
it and starts a run. Discard files nothing and settles the signal.

[ Create ] [ Dispatch ] [ Discard ]
[ • bug ] [ feature ] [ task ] [ chore ]
```

- **Create** commits `.tick/issues/<id>.json` as a normal open tick. From that
  moment `tk next` may pick it up, which is what accepting it meant.
- **Dispatch** does the same and then starts a run at the commit that carries
  the new tick. If the project is busy or the deployment cannot start runs, the
  tick is still filed and the message says why the run did not start.
- **Discard** files nothing. It is not a delete: the factory keeps its dedup
  record for that signal, so the source's next redelivery is recognised as one
  it has already seen rather than proposed again.
- The **type row** retypes the proposal before it is filed. GitHub ingestion
  files every consented issue as a `bug`; one press is cheaper than fixing a
  wrong tick afterwards.

A draft is not a tick in a special state — it is not a tick. Until somebody
presses Create or Dispatch there is nothing in `.tick/`, so no draft can be
picked up by `tk next`, appear in `tk ready`, or be swept into a wave. Pressing
a button twice is safe: the second press finds a proposal that has already been
decided and says so.

## Where secrets live

Two separate files are involved, and only one of them ever holds a credential:

- **`~/.tick/operator.json`** — the global, per-user config. This is where the
  bot token, your Telegram user id, the chat id, and the bot username are
  written, with the file at `0600` and its parent directory at `0700`. It is
  written once, per machine, and every repo checkout on that machine shares
  it — you don't re-pair per project. Set `TK_HOME` to point `tk` at a
  different home directory (mainly useful for tests); when set, `TK_HOME` *is*
  the home directory, not its parent, so the config lives at
  `$TK_HOME/operator.json`.
- **`.tick/operators.json`** (tracked in git, inside the repository) — maps a
  `tk` operator name to a *public* identity: bot username and numeric user id
  only. It never contains a token; loading or saving it rejects any
  token-shaped string on sight. This is what lets a checkout resolve "which
  operator is `@alice`" without carrying anyone's credentials into the repo.
  Writing this file during setup is opt-in — you're asked before anything is
  written, and declining just means running setup again later, or editing the
  file by hand.

If you ever need to see exactly what's stored, `tk channel status` prints both
the global config path and, per channel, whether the repo mapping has an
entry.

## Checking status

```bash
tk channel status
```

Reports, per configured channel: the bot's username, the paired operator (user
id and chat id), whether the current repo's `.tick/operators.json` maps a
`tk` operator name onto that identity, and whether the token still works. With
nothing configured yet, it says so and exits `0`.

The token check is a live `getMe` call against the Telegram API:

- `--offline` skips it — useful when you just want to see what's configured
  without a network round trip.
- `--check` turns a rejected token into a nonzero exit code. Without it, a
  rejected token is still reported in the output but `status` exits `0`, so
  it's safe to call unconditionally (e.g. at the start of a script) without
  `--check`; add `--check` when you want the exit code to gate on the token
  actually working.

## Asking from a run

Once a channel is configured, two more commands turn it into two-way
communication. `tk tell` sends a one-way announcement — no question, no wait:

```bash
echo "deploy finished" | tk tell
tk tell "deploy finished"
```

`tk ask` asks a question, parks it on the tick, and blocks until it's
answered — on either surface, a reply on the phone or `tk answer` in a
terminal:

```bash
tk ask abc123 --question "Which region should this deploy to?"
```

The question is delivered to the channel AND parked on the tick at the same
time, so an unconfigured or broken channel degrades to exactly what a tick
tracker did before channels existed: the tick stays `awaiting`, findable with
`tk list --awaiting`.

### Question shapes

A plain question is free text:

```bash
tk ask abc123 --question "Ship it?"
```

A richer shape — multiple choice, multi-select, or an "other" free-text
escape hatch — comes from stdin as JSON with `--json`:

```bash
echo '{"question": "Which region?",
       "header":   "Deploy",
       "options":  [{"label": "eu-west-1", "description": "Ireland"},
                    {"label": "us-east-1"}],
       "multi": false, "allow_other": false}' | tk ask abc123 --json
```

Option ids are derived from labels (`"Deep Green"` → `"deep-green"`) unless an
option carries an explicit `"id"`. `"multi": true` delivers a toggle keyboard
committed with Done; `"allow_other": true` adds an Other… button that asks for
free text and resolves the same question.

### `--gate approve`: turning a question into an approval gate

```bash
tk ask abc123 --question "Ship it?" --gate approve --timeout 30m
```

`--gate approve` renders its own approve/reject buttons — options in `--json`
are rejected alongside it — and the answer becomes a verdict rather than a
plain note on the tick.

### `--timeout` and exit 7

`tk ask` waits `--timeout` (default 10m) for an answer. When it expires the run
stops waiting — but *giving up waiting is not an answer*. The tick stays
`awaiting`, the pending question is left **open** on disk, and the command exits
`7`. The delivered message is edited to say the run stopped waiting and the
question is still open, so nothing on the phone claims the decision was missed
for good.

Because the question is still open, it is still answerable: a later
`tk answer <id> <answer...>`, or a later run's `tk ask --collect`, resolves it
and applies the answer to the tick exactly as an in-time answer would. This is
the same contract as `tk ask --collect --wait`, which also leaves the questions
it timed out on untouched.

### `--async` / `--collect`: asking without blocking

```bash
tk ask abc123 --question "Which region?" --async --escalate-after 5m
# ... run continues; the question id was printed to stdout ...
tk ask --collect --wait --timeout 30m
```

`--async` registers and delivers the question, prints its id, and returns
immediately instead of waiting. `--collect` is the other half: it drains every
*settled* question in the repository — it takes no tick id and no question —
printing one JSON line per question and deleting its pending entry once
printed; a plain `--collect` skips questions still open. `--collect --wait`
also blocks on those, snapshotting the set of pending entries at the moment it
starts, so it finishes once everything open *then* is settled rather than
chasing questions asked afterward; a waiting collect that times out exits `7`
and lists the still-open question ids in its error text.

`tk ask --json` output, and each `--collect` line, carries `id` and `tick_id`
so an async ask and its later `--collect` line can be correlated:

```json
{"id", "tick_id", "answer", "option_ids",
 "resolved_by": "telegram" | "terminal", "telegram_user_id"}
```

### `--escalate-after`: give a terminal answer first crack

```bash
tk ask abc123 --question "Which region?" --escalate-after 5m
```

`--escalate-after` delays delivery to the *channel* only — the phone doesn't
see the question until the grace window passes. Local surfaces (`tk answer`,
`tk list --awaiting`, the dashboard) see the parked question immediately, so
answering from a terminal within the window means the operator's phone is
never disturbed.

### Herdr blocked-agent relay: terminal first, Telegram second

`tk herd wait` keeps the historical behavior by default: a worker that reaches
Herdr's `blocked` state is reported as blocked and the command exits nonzero.
For a live wave where the operator may be watching a terminal, opt into a
delayed relay explicitly:

```bash
tk herd wait --agents tick-abc,tick-def \
  --relay-blocked-after 5m --timeout 1800000
```

The same option applies to an explicitly watched orchestrator pane:

```bash
tk herd wait --agents w9T:p1 --relay-blocked-after 5m --timeout 1800000
```

When the flag is set, a blocked recorded worker immediately gets a durable
free-text question parked on its tick as `awaiting escalation`. That question
is visible to `tk list --awaiting` and can be answered with `tk answer <tick>
<answer>`; that local answer wins during the grace period and no Telegram
message is created. If it remains unanswered after `--relay-blocked-after`,
the normal operator-channel consumer delivers it. The first answer is applied
to the tick, sent back to the exact Herdr agent (including a respawned `-rN`
name), and the same `tk herd wait` resumes watching that worker.

An explicitly watched target that is not a recorded tick worker — for example
the orchestrator's pane — is relayed too. Its durable question is scoped to
the Herdr agent/pane instead of a tick, and the question id printed by
`tk herd wait` is the terminal answer key: `tk answer <question-id> <answer>`.
If the operator handles that pane in the terminal before the grace deadline,
the agent-scoped question is canceled and no Telegram message is sent.

The option is intentionally opt-in, so existing waves never start sending
blocked-agent questions to a phone unexpectedly. Only targets explicitly
passed in `--agents` are watched. If no operator channel is configured, a
parked question remains terminal-only and is still answerable locally. The
overall `--timeout` remains the outer bound; when it expires, an unanswered
question stays open on disk for a later `tk answer` or run. Recorded manifests
still authorize exact worker/respawn targeting; an explicit non-worker target
is handled as an agent-scoped relay rather than being silently discarded.

### `tk answer`: the terminal twin

```bash
tk answer abc123 eu-west-1
tk answer abc123 "Deep Green"
tk answer abc123 eu us          # a multi-select question
tk answer abc123 approve        # an approval gate
```

`tk answer <id> <answer...>` settles the oldest question still open on the
tick — find them with `tk list --awaiting` or the entries under
`.tick/pending`. For a question with options, give an option label or its id
(matching is case-insensitive); a word that doesn't match any option is a usage
error, not a free-text answer — unless the question has no options at all, or
`allow_other`, in which case whatever was typed is accepted as free text.

Answering a `--gate approve` question is a **verdict**, so it carries the same
provenance rule as `tk approve`: with a runner-shaped `TK_ACTOR` (the mandated
`<runner>:orchestrator` form) the answer is refused unless `--from human`
attests that a human actually made the call, and the write is then stamped
`human` rather than the runner name. A plain question is a note, not a verdict,
and needs no attestation:

```bash
tk answer abc123 approve --from human   # a runner relaying a human decision
```

### More than one question on a tick

A tick can carry several open questions — a run that asked two things, or an
escalation asked alongside an earlier ask. Answering one of them writes its
note but leaves the tick `awaiting`, so its siblings stay open and answerable;
the *last* answer is what clears the awaiting state. (Clearing it early would
make the engine read the tick as having moved on and cancel every remaining
question unanswered.)

### Dual-surface answering

The same question can be answered from the phone or the terminal — whichever
lands first wins, including when both land at once: the resolution is written
under the repository's apply lock, so two simultaneous answers cannot overwrite
each other. `tk answer` and a Telegram reply both resolve through the same
pending entry, so the losing surface is told the question already moved:
a second `tk answer` exits `4` naming the earlier answer, and a stale button
press on the phone gets its own explanation. Either way, the channel message
is edited to show what was decided — exactly as if the winning surface's
decision had happened there, so the operator's phone never keeps showing a
live question nobody is listening to.

### What the note records

An answer becomes a `[human]` note on the tick, and the note is written to be
true about the decision rather than about the run that happened to drain it:

- the **timestamp** is when the operator answered, not when the answer was
  applied — an `--async` question collected hours later is still stamped with
  the moment it was decided;
- a channel answer additionally names the **Telegram user id read off the
  update** that carried it, not the id in the configuration. The transport only
  accepts the bound operator's traffic, so the two agree — but "user 424242
  decided this" should be a fact taken from the decision.

### Exit codes

| Exit | `tk ask` | `tk answer` |
|------|----------|-------------|
| `0` | Answered, on either surface | Answered |
| `2` | Usage error (bad flags, or malformed `--json` input) | Usage error — the answer doesn't match any option the question offers, or a runner answered a gate without `--from human` |
| `3` | Not in a git repository | Not in a git repository |
| `4` | No operator channel is configured — the question is still registered and the tick still parked awaiting a human | No question is parked on that tick, or every question on it is already answered |
| `5` | Project detection failed (the `origin` remote could not be read) | Project detection failed |
| `7` | The wait timed out — the tick is still awaiting and the question is still open | *(never — `tk answer` doesn't wait)* |

Timeout has its own code. It used to share `5` with `ExitGitHub`, which meant an
orchestrator had to read stderr to tell "nobody answered" from "the git remote
could not be read"; `7` is now unambiguous, and `5` on either command always
means project detection failed.

`tk tell` uses the same first four codes: `2` for an unknown `--channel` or an
empty message (no arguments and nothing but whitespace on stdin), `4` for no
configured channel, and a nonzero code for a delivery failure.

## Rich messages

`tk tell` and `tk ask` both carry rich delivery beyond plain text: **formatted
text** (MarkdownLite, rendered per channel) and **attachments** (a local file
or photo). Both are optional channel capabilities — a channel that lacks one
degrades to plain text automatically, never a hard failure.

### MarkdownLite

MarkdownLite is the small markup subset every channel `tk` might speak to can
render. `tk tell --format` sends the text through it:

```bash
tk tell --format "**Deploy** finished — see \`v2.3.1\` for details"
```

| Element | MarkdownLite | Telegram HTML | Block Kit equivalent |
|---|---|---|---|
| Bold | `**text**` | `<b>text</b>` | `*text*` |
| Italic | `_text_` | `<i>text</i>` | `_text_` |
| Inline code | `` `text` `` | `<code>text</code>` | `` `text` `` |
| Code block | ` ```` ```text``` ```` ` | `<pre>text</pre>` | ` ```` ```text``` ```` ` |
| Link | `[label](url)` | `<a href="url">label</a>` | `<url\|label>` |

Nothing outside this subset is markup — headings, lists, tables, and
strikethrough characters are shown literally on every channel, and an unclosed
or empty marker (`**oops`) is literal too. Block Kit is not an implemented
channel yet (Telegram is the only one today); the subset was deliberately kept
small enough to map cleanly onto it too, so that column documents the target
it was chosen to reach, not a shipped mapping.

### Attachments and the upload limit

`tk tell --file <path>` and `tk ask --photo <path>` upload a local file
instead of sending text:

```bash
tk tell --file report.pdf --caption "Nightly build report"
tk tell --file screenshot.png --as document   # force document over the photo default
```

`--as photo|document` (on `tell`) picks how the file is presented; without it,
the kind resolves from the extension — only `.png`, `.jpg`, and `.jpeg`
auto-resolve to a photo, everything else is a document. `--caption` is the
plain-text (not MarkdownLite) message shown with the file, capped at 900
characters client-side — comfortably under Telegram's 1024-character caption
limit, with margin because a photo gate's caption is rewritten on resolution
to also carry the verdict.

Uploads are capped client-side at 50 MB (52,428,800 bytes) — Telegram's own
ceiling on a file a bot can upload. `tk` checks the file's size before
starting the upload, so an over-limit file fails immediately naming the size
and the limit, rather than after streaming the whole thing to the wire.

Telegram's in-app text-file preview guesses the charset of a BOM-less UTF-8
document, and can render non-ASCII characters (em-dashes, arrows) as mojibake
(`â€"`, `â†'`) inside that preview. The uploaded bytes are unaffected —
`sendDocument` is a binary transfer, and downloading the file or opening it
elsewhere shows correct UTF-8 — as are message text and captions, which go
through a separate path. Prefer ASCII-safe punctuation in a small text
document meant to be read straight in Telegram's preview, or accept the
preview-only quirk.

### Photo gates

```bash
tk ask abc123 --photo shots/board.png --gate approve --caption "New board OK?"
```

`--photo` delivers the image itself as the gate: the approve/reject buttons
hang under the picture instead of under a separate text question. It requires
`--gate approve` — a photo on a plain (non-gated) `tk ask` isn't supported —
and otherwise behaves exactly like a text gate: the same verdict, the same
`[human]` note, and the same `--timeout`/`--async`/`--escalate-after` flags
compose with it.

### Capability fallback

Formatted text and attachments are both *optional* channel capabilities, not
guarantees:

- A channel that can't render MarkdownLite gets a `tk tell --format` message
  sent as plain text with the markup stripped (a link keeps its target:
  `label (url)`), and a warning on stderr.
- A channel that can't upload files gets a plain-text message naming the local
  path instead of the file itself (plus the caption, if any), and a warning on
  stderr.

Both fallbacks mean a prompt can call `--format` or `--file` unconditionally —
the announcement always reaches the operator, in the richest shape the
current channel supports.

## Commands

| Command | Description |
|---------|-------------|
| `tk channel setup telegram` | Pair your Telegram bot with this machine (token stays out of the repo) |
| `tk channel setup telegram --token <token>` | Same, without an interactive prompt |
| `tk channel status` | Show what is configured, who it is paired with, and whether the token works |
| `tk channel status --offline` | Show configuration without checking the token live |
| `tk channel status --check` | Exit nonzero when a configured token is rejected |
| `tk channel setup telegram --reclaim` | Withdraw a registered webhook so pairing can poll (re-register it afterwards) |
| `tk factory webhook` | Point Telegram at your factory (checks the bot's privacy mode first) |
| `tk factory webhook --status` | Report what Telegram believes the webhook is |
| `tk factory webhook --delete` | Withdraw the webhook and hand updates back to polling |
| `tk tell --about <tick-id>` | Name the epic and tick the announcement is about |
| `tk tell [text...]` | Send a one-way announcement to the operator channel |
| `tk tell --format` | Send the announcement as MarkdownLite, rendered where the channel supports it |
| `tk tell --file <path> [--caption "..."] [--as photo\|document]` | Upload a file or photo instead of a message |
| `tk ask <id> --question "..."` | Ask a question and block until it's answered |
| `tk ask <id> --question "..." --gate approve` | Ask as an approval gate |
| `tk ask <id> --photo <path> --gate approve [--caption "..."]` | Ask as a photo approval gate — the image carries the buttons |
| `tk ask <id> --question "..." --async` | Register and deliver, print the question id, and return |
| `tk ask --collect [--wait]` | Drain settled questions asked with `--async` |
| `tk answer <id> <answer...>` | Answer a question `tk ask` parked, from the terminal |
| `tk answer <id> approve --from human` | Answer an approval gate as a runner relaying a human decision |

All of `tk channel`, `tk tell`, `tk ask`, and `tk answer` support `--help` for
the full flag reference.
