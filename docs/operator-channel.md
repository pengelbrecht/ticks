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

## Commands

| Command | Description |
|---------|-------------|
| `tk channel setup telegram` | Pair your Telegram bot with this machine (token stays out of the repo) |
| `tk channel setup telegram --token <token>` | Same, without an interactive prompt |
| `tk channel status` | Show what is configured, who it is paired with, and whether the token works |
| `tk channel status --offline` | Show configuration without checking the token live |
| `tk channel status --check` | Exit nonzero when a configured token is rejected |

All `tk channel` subcommands support `--help` for the full flag reference.
