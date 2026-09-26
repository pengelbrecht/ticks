# ticks

A multiplayer-first, terminal-first issue tracker for AI coding agents.

Ticks is the tracker: issues, epics, dependencies, gates and the planning skill
that authors them. It does not run agents. To run an epic, use
[ticfac](https://github.com/pengelbrecht/ticfac), which reads the tracker
through `tk --json`.

```bash
curl -fsSL https://raw.githubusercontent.com/pengelbrecht/ticks/main/install.sh | sh
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
curl -fsSL https://raw.githubusercontent.com/pengelbrecht/ticks/main/install.sh | sh
```

### PowerShell (Windows)

```powershell
irm https://raw.githubusercontent.com/pengelbrecht/ticks/main/install.ps1 | iex
```

### From source

```bash
go install github.com/pengelbrecht/ticks/cmd/tk@latest
```

Working *on* ticks rather than installing it? Build the dev binary instead —
it goes to `./bin/tk` and leaves your machine-wide `tk` alone:

```bash
make build && ./bin/tk --help
```

See [CONTRIBUTING.md](CONTRIBUTING.md#building) for why, and for the explicit
opt-in (`TK_ALLOW_MACHINE_INSTALL=1 make install`) needed to replace the
machine-wide binary.

### Skill (Claude Code / Codex)

The `tk` binary tracks issues; the **ticks skill** teaches your agent to use the tracker and to plan work as well-formed ticks and epics.

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

### Pi skill

The repository is also a Pi package containing the ticks skill:

```bash
pi install git:github.com/pengelbrecht/ticks
```

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

This tells agents to use ticks for persistent tracking instead of TodoWrite.

Running an epic end to end is [ticfac](https://github.com/pengelbrecht/ticfac)'s job (`ticfac run-epic <epic>`); ticks provides the graph it works from.

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
| `tk approve <id>` | Approve awaiting tick |
| `tk reject <id>` | Reject with feedback |
| `tk snippet` | Output runner-neutral agent instructions |
| `tk skills …` | Inspect/install the version-matched skill bundle embedded in this binary (see below) |
| `tk ask <id> --question "..."` | Park a question on a tick for a human (see [docs/questions.md](docs/questions.md)) |
| `tk answer <id> <answer...>` | Answer a question `tk ask` parked on a tick |

All commands support `--help` for options and `--json` for machine-readable output.

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
complete workflow and references that a skill-aware harness loads on its
own. They're complementary, not interchangeable: use `tk snippet` for harnesses without
skill support, and the skill (via `tk skills install` or a skill marketplace) for
harnesses that have it.

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
