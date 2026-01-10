# ticks

A multiplayer-first issue tracker for AI coding agents.

```bash
brew install pengelbrecht/tap/ticks
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

Ticks is a radically simpler alternative to [beads](https://github.com/steveyegge/beads). Both solve the same core problem—giving AI agents persistent memory across sessions—but with different tradeoffs:

| | ticks | beads |
|---|---|---|
| **Storage** | One JSON file per issue | JSONL + SQLite |
| **Conflicts** | Native git merge driver | Custom sync logic |
| **Background process** | None | Daemon required |
| **Codebase** | ~1k lines Go | ~130k lines Go |
| **Agent hooks** | Optional `tk prime` | Complex plugin system |
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

Full benchmark methodology and results in `benchmarks/`.

**Choose ticks if you want:**
- Simple flat files you can `cat` and debug
- No daemon, no SQLite, no infrastructure
- Git-native conflict resolution
- Easy multiplayer via owner scoping
- Minimal agent integration (just add output of `tk prime` to CLAUDE.md)

**Choose beads if you need:**
- Sub-millisecond queries on thousands of issues
- Advanced multi-agent coordination
- Automatic context injection via hooks

## Install

### Homebrew (macOS/Linux)

```bash
brew install pengelbrecht/tap/ticks
```

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

## Agent Integration

Run `tk prime` to get CLAUDE.md content for AI agent integration:

```bash
tk prime >> CLAUDE.md
```

This tells agents to use ticks for persistent tracking instead of TodoWrite.

The `tk next` command is particularly useful for agents:

```bash
tk next              # Next ready task
tk next --epic       # Next ready epic
tk next EPIC_ID      # Next ready task in a specific epic
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
| `tk list` | List issues with filters |
| `tk view` | Interactive TUI |
| `tk prime` | Output CLAUDE.md content |

All commands support `--help` for options and `--json` for machine-readable output.

## TUI

```bash
tk view
```

- `j`/`k` or arrows: navigate
- `space`/`enter`: fold/unfold epics
- `/`: search
- `z`: focus on epic
- `q`: quit

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
