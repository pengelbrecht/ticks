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

Full benchmark methodology and results in `benchmarks/`.

**Choose ticks if you want:**
- Team-friendly multiplayer with owner scoping
- Simple flat files you can `cat` and debug
- No daemon, no SQLite, no infrastructure
- Git-native conflict resolution
- Minimal agent integration (just add output of `tk snippet` to CLAUDE.md)

**Choose beads if you need:**
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

## Upgrading

```bash
# Shell/Go installs: self-update
tk upgrade

# Homebrew
brew upgrade pengelbrecht/tap/ticks
```

## Agent Integration

Run `tk snippet` to get CLAUDE.md content for AI agent integration:

```bash
tk snippet >> CLAUDE.md
```

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
| `tk run <epic>` | Run agent on epic |
| `tk run --board` | Start web board UI |
| `tk run --cloud` | Board with cloud sync |
| `tk approve <id>` | Approve awaiting tick |
| `tk reject <id>` | Reject with feedback |
| `tk snippet` | Output CLAUDE.md content |

All commands support `--help` for options and `--json` for machine-readable output.

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
# Run with local board UI
tk run --board

# Run agent on epic with board
tk run abc --board

# Board on custom port
tk run --board --port 8080
```

Opens a web kanban board at `http://localhost:3000` with real-time updates. Built with Lit web components and Shoelace UI.

- Drag-free kanban columns: Blocked, Agent Queue, In Progress, Needs Human, Done
- Real-time SSE updates when ticks change
- Mobile-responsive with tab navigation
- Keyboard navigation (`hjkl`, `?` for help)
- PWA support for offline use

See `internal/tickboard/ui/README.md` for development docs.

## Cloud Sync

Access your ticks from anywhere at [ticks.sh](https://ticks.sh).

### Setup

1. Get a token from https://ticks.sh/settings
2. Add to `~/.ticksrc`:
   ```
   token=your-token-here
   ```
3. Run with `--cloud` flag:
   ```bash
   tk run abc --cloud    # Agent + board + cloud sync
   tk run --cloud        # Board + cloud sync, no agent
   ```

### How It Works

- Local `tk run --cloud` connects to Cloudflare Durable Object
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
