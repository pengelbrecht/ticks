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

### `--timeout` and exit 5

`tk ask` waits `--timeout` (default 10m) for an answer. When it expires, the
tick stays `awaiting` and the pending question is left on disk for a later run
or a human to settle, and the command exits `5`. See
[Exit codes](#exit-codes) below — `5` means two different things on `tk ask`,
told apart by the stderr text.

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
chasing questions asked afterward; a waiting collect that times out exits `5`
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

### `tk answer`: the terminal twin

```bash
tk answer abc123 eu-west-1
tk answer abc123 "Deep Green"
tk answer abc123 eu us          # a multi-select question
tk answer abc123 approve        # an approval gate
```

`tk answer <id> <answer...>` takes no flags and settles the oldest question
still open on the tick — find them with `tk list --awaiting` or the entries
under `.tick/pending`. For a question with options, give an option label or
its id (matching is case-insensitive); a word that doesn't match any option is
a usage error, not a free-text answer — unless the question has no options at
all, or `allow_other`, in which case whatever was typed is accepted as free
text.

### Dual-surface answering

The same question can be answered from the phone or the terminal — whichever
lands first wins. `tk answer` and a Telegram reply both resolve through the
same pending entry, so the losing surface is told the question already moved:
a second `tk answer` exits `4` naming the earlier answer, and a stale button
press on the phone gets its own explanation. Either way, the channel message
is edited to show what was decided — exactly as if the winning surface's
decision had happened there, so the operator's phone never keeps showing a
live question nobody is listening to.

### Exit codes

| Exit | `tk ask` | `tk answer` |
|------|----------|-------------|
| `0` | Answered, on either surface | Answered |
| `2` | Usage error (bad flags, or malformed `--json` input) | Usage error — the answer doesn't match any option the question offers |
| `3` | Not in a git repository | Not in a git repository |
| `4` | No operator channel is configured — the question is still registered and the tick still parked awaiting a human | No question is parked on that tick, or every question on it is already answered |
| `5` | The wait timed out *(see note)*, or project detection failed | Project detection failed *(never a timeout — `tk answer` doesn't wait)* |

`5` is `ExitTimeout` on a blocking `tk ask`, but both `tk ask` and `tk answer`
also use the *same numeric value* for `ExitGitHub` when they can't read or
parse the `origin` git remote before the question is even registered or
looked up. The two meanings are told apart by the stderr text: a timeout says
`no answer to <id> within <duration>`; a project-detection failure says
`failed to detect project`. An orchestrator branching on exit `5` from `tk
ask` should default to reading it as "still unanswered" and consult stderr
only if the distinction matters; for `tk answer`, exit `5` always means
project detection failed.

## Commands

| Command | Description |
|---------|-------------|
| `tk channel setup telegram` | Pair your Telegram bot with this machine (token stays out of the repo) |
| `tk channel setup telegram --token <token>` | Same, without an interactive prompt |
| `tk channel status` | Show what is configured, who it is paired with, and whether the token works |
| `tk channel status --offline` | Show configuration without checking the token live |
| `tk channel status --check` | Exit nonzero when a configured token is rejected |
| `tk tell [text...]` | Send a one-way announcement to the operator channel |
| `tk ask <id> --question "..."` | Ask a question and block until it's answered |
| `tk ask <id> --question "..." --gate approve` | Ask as an approval gate |
| `tk ask <id> --question "..." --async` | Register and deliver, print the question id, and return |
| `tk ask --collect [--wait]` | Drain settled questions asked with `--async` |
| `tk answer <id> <answer...>` | Answer a question `tk ask` parked, from the terminal |

All of `tk channel`, `tk tell`, `tk ask`, and `tk answer` support `--help` for
the full flag reference.
