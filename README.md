# ticks

A multiplayer-first issue tracker for AI coding agents.

```bash
curl -fsSL https://ticks.sh/install | sh
tk init
tk ready
```

## Why Ticks?

### The Problem

AI coding agents lose context between sessions. They forget what they were working on, what's blocked, and what they discovered along the way. Traditional issue trackers like GitHub Issues aren't designed for this—they're slow to query, require network access, and aren't optimized for agent workflows.

Ticks gives agents persistent memory that survives session restarts, context compaction, and even switching between different AI tools. Issues live in your repo as simple JSON files, tracked by git, queryable in milliseconds.

### Why Not GitHub Issues?

- **Speed**: `tk ready` returns in ~35ms with 1000 issues. GitHub API calls take seconds.
- **Offline**: Works without network access.
- **Agent-native**: Commands like `tk next` and `--json` output are designed for agents.
- **Git-tracked**: Issues travel with your code. Branch, merge, fork—issues come along.
- **Multiplayer**: Built-in owner scoping for multi-agent collaboration.

GitHub recently added [dependencies](https://github.blog/changelog/2025-08-21-dependencies-on-issues/) and [sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues), but the API latency makes it impractical for agents that need to check status frequently.

### Why Ticks Over Beads?

Ticks is a radically simpler alternative to [beads](https://github.com/steveyegge/beads). Both solve the same core problem—giving AI agents persistent memory across sessions—but with different tradeoffs.

Ticks is **multiplayer-first**: designed for teams where multiple developers each have their own agents. Commands show your issues by default (`tk ready` vs `tk ready --all`), making it natural for a team to share a repo without stepping on each other's work.

Both support multi-agent workflows via git worktrees—ticks' lack of a daemon is actually an advantage here, as beads' daemon [doesn't work correctly with worktrees](https://github.com/steveyegge/beads/blob/main/docs/FAQ.md). The difference is ticks adds owner scoping for teams of humans, not just teams of agents.

| | ticks | beads |
|---|---|---|
| **Multiplayer** | Owner scoping for teams | Single-user focused |
| **Storage** | One JSON file per issue | JSONL + SQLite |
| **Conflicts** | Native git merge driver | Custom sync logic |
| **Background process** | None | Daemon required |
| **Codebase** | ~1k lines Go | ~130k lines Go |
| **Agent hooks** | Optional `tk snippet` | Complex plugin system |
| **Query speed** | ~35ms | ~67ms |

### Benchmarks

With 1000 issues, median times (ms):

| Operation | ticks | beads |
|-----------|-------|-------|
| `ready` | 35 | 69 |
| `list` | 37 | 72 |
| `list --label` | 35 | 67 |
| `list --label-any` | 35 | 67 |
| `list --title-contains` | 36 | 67 |
| `list --desc-contains` | 35 | 66 |
| `list --notes-contains` | 36 | 66 |
| `create` | 15 | 91 |
| `update` | 27 | 68 |


**Choose ticks if you want:**
- Team-friendly multiplayer with owner scoping
- Simple flat files you can `cat` and debug
- No daemon, no SQLite, no infrastructure
- Git-native conflict resolution
- Minimal agent integration (add `tk snippet` to `AGENTS.md`, `CLAUDE.md`, or both)

**Choose beads if you need:**
- Advanced multi-agent coordination
- Automatic context injection via hooks

## Install

### Shell script (macOS/Linux)

```bash
curl -fsSL https://ticks.sh/install | sh
```

### PowerShell (Windows)

```powershell
irm https://raw.githubusercontent.com/pengelbrecht/ticks/main/install.ps1 | iex
```

### From source

```bash
go install github.com/pengelbrecht/ticks/cmd/tk@latest
```

### Skill (Claude Code / Codex)

The `tk` binary tracks issues; the **ticks skill** is what lets your agent plan and orchestrate epics.

If `tk` is already installed, install the skill straight from the binary — this is the
canonical path, since the installed skill is then guaranteed to match your `tk` version:

```bash
tk skills install ticks
```

This detects `.claude/skills/` and/or `.agents/skills/` at your repo root and installs
into whichever exist (most Claude Code and Codex projects already have one). Neither
present yet? Create one, or install to an explicit location with `--dir`, e.g.
`tk skills install ticks --dir ~/.claude/skills/ticks` for a user-level install.

Before `tk` is installed, or to install the skill on its own from the marketplace:

```bash
npx skills add pengelbrecht/ticks
```

### Pi skill and orchestrator

The repository is also a Pi package containing the ticks skill and the executable Ticks runner extension. Install from git or a local checkout:

```bash
pi install git:github.com/pengelbrecht/ticks
pi install -l git:github.com/pengelbrecht/ticks   # project-local
pi install /absolute/path/to/ticks                # local development
pi -e /absolute/path/to/ticks                     # try without installing
```

Use `/ticks-plan <childless-epic-id>` or `/ticks-plan --requirements "..."` for automated **model-running** planning with zero tracker writes; add `--apply` only after reviewing the validated waves. Use `/ticks-run <epic-id>` for a no-model execution preview, `/ticks-run <epic-id> --execute` to opt in to child execution, `/ticks-status [epic-id]` for recovery, and `/ticks-dashboard --demo` or `--dump` for the control tower. Both apply and execution require a clean non-default branch. See [`extensions/ticks-runner/README.md`](extensions/ticks-runner/README.md) for strict schemas, confirmation behavior, configuration, safety boundaries, artifacts, and recovery.

A generic skill install does not activate Pi extension code; use `pi install` (or `pi -e`) when the slash commands are needed.

## Quick Start

```bash
tk init                                    # Initialize in a git repo
tk create "Fix auth timeout" -t bug -p 1   # Create an issue
tk ready                                   # See what's ready to work on
tk next                                    # Get the single next task

tk update <id> --status in_progress        # Claim work
tk note <id> "Investigating token expiry"  # Log progress
tk close <id> --reason "Fixed"             # Complete
```

## Upgrading

```bash
tk upgrade
```

## Agent Integration

Run `tk snippet` to get runner-neutral content for AI agent integration:

```bash
tk snippet >> AGENTS.md   # Codex and other AGENTS.md-aware tools
tk snippet >> CLAUDE.md   # Claude Code
```

For epic execution, the distributable skill includes a shared orchestration protocol plus Claude Code, Codex, Pi, and Prime Agent adapters. Tick files, notes, branches, and worktrees are the handoff format, so one runner can plan an epic and the other can execute or resume it.

This tells agents to use ticks for persistent tracking instead of TodoWrite.

The `tk next` command is particularly useful for agents:

```bash
tk next              # Next ready task
tk next --epic       # Next ready epic
tk next EPIC_ID      # Next ready task in a specific epic
```

## Agent-Human Workflow

Ticks supports structured handoff between agents and humans. Tasks can be routed to humans for approval, input, review, or manual work—and returned to agents with feedback.

### Awaiting States

| State | When Used |
|-------|-----------|
| `work` | Human must complete the task |
| `approval` | Agent done, needs sign-off |
| `input` | Agent needs information |
| `review` | PR needs code review |
| `content` | UI/copy needs human judgment |
| `escalation` | Agent found issue, needs direction |
| `checkpoint` | Phase complete, verify before next |

### Creating Tasks for Humans

```bash
# Task requiring approval before closing
tk create "Update auth flow" --requires approval

# Task assigned directly to human
tk create "Configure AWS credentials" --awaiting work
```

### Human Workflow

```bash
# See what needs attention
tk list --awaiting
tk next --awaiting

# Review and respond
tk show <id>
tk approve <id>
tk reject <id> "Soften the error messages"
```

### Notes for Feedback

```bash
tk note <id> "Use Stripe for payments" --from human
```

## Commands

| Command | Description |
|---------|-------------|
| `tk init` | Initialize ticks in current repo |
| `tk create "title"` | Create a new issue |
| `tk next` | Show next ready task |
| `tk ready` | List all ready tasks |
| `tk show <id>` | Show issue details |
| `tk update <id>` | Update issue fields |
| `tk note <id> "msg"` | Append a note |
| `tk close <id>` | Close an issue |
| `tk block <id> <blocker>` | Add a dependency |
| `tk graph <epic>` | Show dependency graph |
| `tk list` | List issues with filters |
| `tk view` | Interactive TUI |
| `tk board` | Start web board UI |
| `tk board --cloud` | Board with cloud sync |
| `tk approve <id>` | Approve awaiting tick |
| `tk reject <id>` | Reject with feedback |
| `tk snippet` | Output runner-neutral agent instructions |
| `tk skills …` | Inspect/install the version-matched skill bundle embedded in this binary (see below) |
| `tk herd …` | Orchestrate epic waves as herdr-managed agents (see below) |
| `tk channel …` | Pair a Telegram bot and check its status so runs can reach you (see below) |
| `tk factory deploy` | Deploy the cloud factory into your own Cloudflare account (see below) |
| `tk tell [text...]` | Send a one-way announcement to the operator channel (see below) |
| `tk tell --format` | Send the announcement as MarkdownLite, rendered on channels that support it (see below) |
| `tk tell --file <path>` | Upload a file (or photo) to the operator channel instead of sending text (see below) |
| `tk ask <id> --question "..."` | Ask the operator a question and block until it's answered, on either surface (see below) |
| `tk ask <id> --photo <path> --gate approve` | Ask as a photo approval gate — the image itself carries the approve/reject buttons (see below) |
| `tk answer <id> <answer...>` | Answer a question `tk ask` parked on a tick, from the terminal (see below) |

All commands support `--help` for options and `--json` for machine-readable output.

### Herd: agent orchestration on herdr

When an epic runs inside a [herdr](https://herdr.dev) session, the `tk herd` command
group dispatches implementers as independent, visible herdr agents — any herdr kind,
cross-vendor (e.g. codex implementers under a claude orchestrator) — instead of the
orchestrating harness's own subagents. Configure routing in `.tick/runners.toml`
(`substrate = "herdr" | "harness" | "auto"`, plus per-role kind × model/effort).

| Command | Description |
|---------|-------------|
| `tk herd spawn <id>` | Worktree + agent + content-gated first prompt + run manifest |
| `tk herd wait --agents a,b` | Event-driven wave fan-in (no polling) |
| `tk herd collect <id>` | Verify durable results: commits, RESULT file, boundary |
| `tk herd cleanup [<id>]` | Preview-first teardown; refuses live/blocked/unmerged |
| `tk herd reconcile` | Read-only crash-recovery plan after orchestrator death |
| `tk herd dashboard` | Live event-driven board TUI of the run |
| `tk herd paint` | Badge worker workspaces with tick id, role, status |
| `tk herd notify` | Blocked/wave-complete notifications with once-semantics |

The optional **mission-control herdr plugin** ([`plugins/herdr-ticks`](plugins/herdr-ticks))
adds a board pane, workspace badges via event hooks, notification chimes, and
context-menu actions. Full conventions live in the ticks skill:
[`skills/ticks/references/herdr-runner.md`](skills/ticks/references/herdr-runner.md).

### Skills: version-matched skill distribution

`tk` serves the same `skills/ticks` tree it ships with straight from the binary — no
network fetch or separate install step needed. Because the skill is embedded rather
than fetched from elsewhere, whatever `tk skills install` puts on disk always matches
the `tk` version you're running, so the skill's instructions can never drift ahead of
or behind the CLI they describe.

`install` and `diff` are detection-first: without `--dir`, they check the repo root for
`.claude/skills/` and `.agents/skills/` and act on every one that exists (both, if both
do). Neither present is an error — create one of them, or pass `--dir` for an explicit
target such as the user-level `~/.claude/skills/<name>`.

| Command | Description |
|---------|-------------|
| `tk skills list` | List embedded skills and the tk version they ship with |
| `tk skills get <name>` | Print a skill's `SKILL.md` (`--full` for the whole bundle) |
| `tk skills install <name> [--dir PATH]` | Install a skill to disk (default: detect `.claude/skills/`, `.agents/skills/` at the repo root) |
| `tk skills diff <name> [--dir PATH]` | Compare installed skill(s) against the embedded bundle |

`tk skills install ticks` is the canonical way to install or upgrade the ticks skill
once `tk` itself is installed — see [Skill (Claude Code / Codex)](#skill-claude-code--codex)
above for the bootstrap path when `tk` isn't installed yet.

This is a different thing from `tk snippet` (above): `tk snippet` prints a short,
runner-neutral instruction block meant to be pasted straight into an agent config file
like `AGENTS.md` or `CLAUDE.md`, while `tk skills` serves the full skill tree — the
complete workflow, references, and adapters that a skill-aware harness loads on its
own. They're complementary, not interchangeable: use `tk snippet` for harnesses without
skill support, and the skill (via `tk skills install` or a skill marketplace) for
harnesses that have it.

### Factory: your own cloud control plane

`tk factory deploy` installs the factory worker bundled with your `tk` build into
**your own Cloudflare account**. Ticks never operates a factory for anyone: it is a
deployable, not a service, so the compute, the model keys, the spend, and the blast
radius are yours (decision D16 in `docs/design/cloud-factory.md`). Cloudflare's floor
for Durable Objects and Workflows is the paid Workers plan (~$5/mo).

```bash
pnpm add -g wrangler          # or npm install -g wrangler, or just use npx wrangler
wrangler login                # connect your Cloudflare account
tk factory deploy
```

One command creates or reuses the D1 database and the R2 bucket, applies the bundle's
D1 migrations, mints a factory token, pushes only its salted hash as the Worker secret
`FACTORY_TOKEN_HASH`, deploys the worker, and records the endpoint and token in
`~/.ticksrc` next to the board-sync `token=` you may already have there:

```
factory_url=https://ticks-factory.<your-subdomain>.workers.dev
factory_token=tkf_…
factory_version=0.31.0
```

The plaintext token exists only in that file — the worker holds nothing but its hash
and therefore cannot leak it. `~/.ticksrc` is written 0600.

| Flag | Effect |
|---|---|
| `--rotate-token` | Mint a new token; the previous one stops working immediately |
| `--url <url>` | Record and verify a custom endpoint, when the deploy output names none |
| `--bundle-dir <path>` | Stage the worker bundle somewhere other than `~/.tick/factory/bundle` |

Re-running is the upgrade path: resources are reused, never duplicated, and the token is
preserved unless you rotate it. The deployed bundle is pinned to the `tk` version that
deployed it, so after `tk upgrade` the CLI reminds you to re-run `tk factory deploy`.

Missing prerequisites stop the command with the reason — no wrangler, or a wrangler that
is not logged in — and nothing is created or written until they pass. There is no live
Cloudflare account in CI, so the end-to-end proof runs against a documented harness:
`bash scripts/verify-factory-deploy.sh`.

### Operator channel: reach a human from an autonomous run

`tk channel` pairs a personal Telegram bot with this machine so an autonomous run can
send approvals, escalations, and completion reports to your phone instead of a
terminal you have to keep watching. Full setup, the pairing flow, and where secrets
are (and aren't) stored live in [`docs/operator-channel.md`](docs/operator-channel.md).

Once a channel is configured, three commands drive the actual interaction:
`tk tell` sends a one-way announcement — no question, no wait. `tk ask <id>`
asks a question, parks it on the tick, and blocks until it's answered on
either surface: a reply on the phone, or `tk answer` / `tk approve` / `tk
reject` in a terminal. `tk answer <id> <answer...>` is that terminal half —
the local twin of replying on the phone, settling the oldest question still
open on the tick. See [Asking from a run](docs/operator-channel.md#asking-from-a-run)
for question shapes (multiple choice, multi-select, free text), `--gate
approve` for an approval gate, `--async`/`--collect` for asking without
blocking, `--escalate-after` to give a terminal answer first crack before
paging the phone, and the exit-code table (`tk ask` exits `7` when the wait
times out — the question stays open and answerable, so a later `tk answer` or
a later run still settles it).

Both commands carry rich message support. `tk tell --format` sends the text as
MarkdownLite (bold, italic, inline code, code block, link) instead of plain
text, and `tk tell --file <path>` uploads a local file or photo (`--caption`,
`--as photo|document`) instead of a message. `tk ask <id> --photo <path>
--gate approve` delivers the image itself as the approval gate, with the
approve/reject buttons under it. Every rich send degrades automatically on a
channel that can't render it: unsupported markup falls back to plain text with
the markup stripped, and a file a channel can't upload falls back to a message
naming its path — never a hard failure. See
[Rich messages](docs/operator-channel.md#rich-messages) for the MarkdownLite
subset, attachment kinds, the upload size limit, and the fallback rules in
full.

| Command | Description |
|---------|-------------|
| `tk channel setup telegram` | Pair your Telegram bot with this machine (token stays out of the repo) |
| `tk channel status` | Show what is configured, who it is paired with, and whether the token works |
| `tk tell [text...]` | Send a one-way announcement to the operator channel (reads stdin with no args) |
| `tk tell --format` | Send the announcement as MarkdownLite, rendered where the channel supports it |
| `tk tell --file <path> [--caption "..."] [--as photo\|document]` | Upload a file or photo instead of a message |
| `tk ask <id> --question "..."` | Ask a question and block until it's answered, on either surface |
| `tk ask <id> --question "..." --gate approve` | Ask as an approval gate — approve/reject buttons, verdict answer |
| `tk ask <id> --photo <path> --gate approve [--caption "..."]` | Ask as a photo approval gate — the image carries the buttons |
| `tk ask --collect --wait` | Drain settled questions from earlier `--async` asks, optionally blocking on the rest |
| `tk answer <id> <answer...>` | Answer a question `tk ask` parked, from the terminal |

## TUI

```bash
tk view
```

- `j`/`k` or arrows: navigate
- `space`/`enter`: fold/unfold epics
- `/`: search
- `z`: focus on epic
- `a`: approve awaiting tick
- `x`: reject awaiting tick
- `q`: quit

## Web Board

```bash
# Serve the current repo
tk board

# Board on a specific port (fails if the port is busy)
tk board -p 8080

# Serve a different repo
tk board /path/to/repo

# Expose on all interfaces (LAN / Docker)
tk board --host 0.0.0.0

# Serve the UI from disk for hot reload (development)
tk board --dev
```

Opens a web kanban board at `http://localhost:3000` with real-time updates. Built with Lit web components and Shoelace UI.

- Drag-free kanban columns: Blocked, Agent Queue, In Progress, Needs Human, Done
- Real-time SSE updates when ticks change
- Mobile-responsive with tab navigation
- Keyboard navigation (`hjkl`, `?` for help)
- PWA support for offline use

The board binds `127.0.0.1` (loopback) by default so it is only accessible from the local machine. Use `--host 0.0.0.0` to expose it on all network interfaces. Without `-p/--port`, the board starts at port 3000 and takes the first free port. See `internal/tickboard/ui/README.md` for development docs.

## Cloud Sync

Access your ticks from anywhere at [ticks.sh](https://ticks.sh).

### Setup

1. Get a token from https://ticks.sh/settings
2. Add to `~/.ticksrc`:
   ```
   token=your-token-here
   ```
3. Start the board with the `--cloud` flag:
   ```bash
   tk board --cloud
   ```

### How It Works

- `tk board --cloud` connects to a Cloudflare Durable Object
- File changes sync to cloud in real-time (~50ms)
- Cloud UI edits sync back to local
- Works offline—changes queue and sync on reconnect

### Privacy

- Ticks stored in Cloudflare Durable Objects
- Only accessible with your token
- Project isolation enforced
- No telemetry or analytics

## Dependency Graph

See parallelization opportunities for an epic:

```bash
tk graph <epic-id>
```

Output shows tasks organized into "waves"—groups that can be executed in parallel:

```
Epic: Implement auth
Stats: 5 tasks, 3 waves, max 2 parallel

Wave 1 (ready now) (2 parallel)
  ○ abc P1 Design database schema
  ○ def P2 Set up OAuth provider

Wave 2
  ⊘ ghi P1 Implement user model ← abc

Wave 3
  ⊘ jkl P2 Integration tests ← ghi

Critical path: 3 waves (minimum sequential steps)
```

Use `--json` for machine-readable output (useful for agents planning parallel work).

## Search and Filtering

```bash
tk list --label-any backend,auth --all
tk list --title-contains "auth" --all
tk list --status in_progress
tk ready --owner alice
```

## Multiplayer

Commands show your issues by default. Use `--all` to see everyone's:

```bash
tk ready --all       # All ready tasks
tk next --all        # Next task from anyone
tk list --all        # All issues
```

Assign work with `--owner`:

```bash
tk create "Review API" --owner alice
tk list --owner bob
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TICK_OWNER` | Override owner detection |
| `TICK_DIR` | Override `.tick` directory location |
| `NO_COLOR` | Disable colored output |

## How It Works

Each issue is a JSON file in `.tick/issues/<id>.json`. Git handles merges naturally since different issues are different files. For the rare case of conflicting edits to the same issue, ticks provides a custom merge driver that intelligently combines changes.

## Acknowledgements

Ticks is inspired by [beads](https://github.com/steveyegge/beads) by Steve Yegge, which pioneered the idea of giving AI coding agents persistent memory through git-tracked issue management. Ticks takes a simpler approach to the same problem.

## License

MIT
