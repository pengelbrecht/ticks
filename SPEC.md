# tick

**A multiplayer-first issue tracker for AI coding agents**

CLI: `tk`

## Philosophy

tick is a radically simple alternative to beads. It solves the same core problem—giving coding agents persistent memory across sessions—but with a flat-file architecture that embraces git's natural merge capabilities rather than fighting them.

**Design principles:**

1. **One file per tick** — Git merges different files cleanly. No custom JSONL wrangling.
2. **Multiplayer by default** — Owner field on every tick. Commands scope to your ticks unless you ask for more.
3. **No infrastructure** — No daemon, no SQLite, no background processes. Just files.
4. **Git-native** — A custom merge driver handles the rare same-tick conflicts automatically.
5. **GitHub-native** — Project and owner derived from git remote and `gh` CLI. Zero config.
6. **Fast enough** — Parallel file reads + optional gitignored index. Sub-10ms for hundreds of ticks.

## File Structure

```
.tick/
  config.json                 # Minimal project configuration
  .index.json                 # Gitignored cache (optional, auto-generated)
  issues/
    <id>.json                 # One file per tick
    <id>.json
    ...
.gitattributes                # Merge driver configuration (auto-added by tk init)
```

### config.json

```json
{
  "version": 1,
  "id_length": 3
}
```

| Field | Description |
|-------|-------------|
| `version` | Config schema version |
| `id_length` | Hash length for IDs, 3-4 chars (default: 3) |

That's it. Project and owner are derived from GitHub at runtime.

### .gitignore (inside .tick/)

```
.index.json
```

## GitHub Integration

tick derives project and owner information from GitHub rather than storing it in config.

### Project Detection

Derived from git remote:

```bash
git remote get-url origin
# https://github.com/petere/chefswiz.git → petere/chefswiz
# git@github.com:petere/chefswiz.git    → petere/chefswiz
```

### Owner Detection

Resolved in order:

1. `TICK_OWNER` environment variable
2. `gh api user --jq '.login'` (GitHub CLI)
3. Error with instruction to install/auth `gh`

### Global IDs

Ticks have two ID forms:

| Form | Example | Use when |
|------|---------|----------|
| Short | `a1b` | Inside repo, CLI commands |
| Global | `petere/chefswiz:a1b` | Commit messages, PRs, Slack, cross-repo |

The global form uses the full GitHub `owner/repo` path for uniqueness.

**CLI accepts both:**

```bash
tk show a1b                    # Short form
tk show petere/chefswiz:a1b    # Global form (validates project, uses short id)
```

**Commit message convention:**

```
Fix token expiry check [chefswiz:a1b]
```

## Tick Schema

Each tick is a single JSON file: `.tick/issues/<id>.json`

```json
{
  "id": "a1b",
  "title": "Fix authentication timeout bug",
  "description": "Users are getting logged out after 5 minutes instead of 30.",
  "notes": "2025-01-08 10:30 - Started investigating, token expiry logic\n2025-01-08 11:15 - Found it, checking wrong field",
  "status": "open",
  "priority": 1,
  "type": "bug",
  "owner": "petere",
  "labels": ["backend", "auth"],
  "blocked_by": ["f1c"],
  "parent": "e1a",
  "discovered_from": null,
  "created_by": "petere",
  "created_at": "2025-01-08T10:30:00Z",
  "updated_at": "2025-01-08T14:22:00Z",
  "closed_at": null,
  "closed_reason": null
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Short identifier (e.g., `a1b`) |
| `title` | string | yes | Short summary |
| `description` | string | no | Detailed description (what/why) |
| `notes` | string | no | Freeform append-only log (progress, findings) |
| `status` | enum | yes | `open`, `in_progress`, `closed` |
| `priority` | int | yes | 0 (critical) to 4 (backlog), default 2 |
| `type` | enum | yes | `bug`, `feature`, `task`, `epic`, `chore` |
| `owner` | string | yes | GitHub username of assignee |
| `labels` | []string | no | Arbitrary tags |
| `blocked_by` | []string | no | IDs of blocking ticks |
| `parent` | string | no | ID of parent epic |
| `discovered_from` | string | no | ID of tick this was discovered while working on |
| `created_by` | string | yes | GitHub username of creator |
| `created_at` | datetime | yes | ISO 8601 timestamp |
| `updated_at` | datetime | yes | ISO 8601 timestamp, updated on every change |
| `closed_at` | datetime | no | When status changed to `closed` |
| `closed_reason` | string | no | Why it was closed |

### Description vs Notes

| Field | Purpose | Style |
|-------|---------|-------|
| `description` | What the tick is about, acceptance criteria | Written once, occasionally edited |
| `notes` | Work log, findings, progress updates | Append-only, timestamped entries |

### Status Values

| Status | Meaning |
|--------|---------|
| `open` | Ready to be worked on (or blocked) |
| `in_progress` | Actively being worked on |
| `closed` | Done |

### Priority Values

| Priority | Label | Meaning |
|----------|-------|---------|
| 0 | Critical | Drop everything |
| 1 | High | Do soon |
| 2 | Medium | Normal work (default) |
| 3 | Low | When you get to it |
| 4 | Backlog | Someday/maybe |

### Type Values

| Type | Use for |
|------|---------|
| `epic` | Large initiative containing other ticks |
| `feature` | New functionality |
| `bug` | Something broken |
| `task` | Generic work item |
| `chore` | Maintenance, cleanup, refactoring |

## ID Generation

IDs use base36 (a-z, 0-9) for short, typeable identifiers:

**Character set:**
```
abcdefghijklmnopqrstuvwxyz0123456789  (36 chars)
```

**Capacity:**
```
3 chars = 36³ = 46,656 combinations
4 chars = 36⁴ = 1,679,616 combinations
```

**Algorithm:**

1. Generate random 3-char ID from base36
2. Check collision against existing files in `.tick/issues/`
3. If collision, regenerate (up to 3 attempts)
4. If still colliding, extend to 4 chars

**Examples:**

```
a1b
xyz
7q2
m4n
```

**Typing comparison:**

| Style | Example | Keystrokes |
|-------|---------|------------|
| UUID-style | `a1b2c3d4` | 8 |
| tick | `a1b` | 3 |

**Auto-extension:**

If ID generation fails repeatedly (>3 collisions in a row), `id_length` in config is automatically bumped to 4. This handles organic project growth without manual intervention.

## CLI Reference

### Global Flags

All commands support:

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for agents) |
| `--help` | Show help |

### Initialization

#### `tk init`

Initialize tick in current repository.

```
tk init
```

**Actions:**

1. Detects GitHub project from git remote
2. Detects owner from `gh` CLI
3. Creates `.tick/` directory structure
4. Creates `.tick/config.json`
5. Adds merge driver to `.gitattributes`
6. Configures git merge driver (local config)

**Output:**

```
Detected GitHub repo: petere/chefswiz
Detected user: petere

Initialized .tick/
```

No prompts when everything can be detected.

#### `tk whoami`

Show current owner and project.

```
tk whoami [--json]
```

**Output:**

```
Owner: petere
Project: petere/chefswiz
```

### Creating Ticks

#### `tk create`

Create a new tick.

```
tk create <title> [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--description` | `-d` | Detailed description |
| `--priority` | `-p` | Priority 0-4 (default: 2) |
| `--type` | `-t` | Type (default: task) |
| `--owner` | `-o` | Assign to user (default: self) |
| `--labels` | `-l` | Comma-separated labels |
| `--blocked-by` | `-b` | Comma-separated blocker IDs |
| `--parent` | | Parent epic ID |
| `--discovered-from` | | Source tick ID |
| `--json` | | Output created tick as JSON |

**Examples:**

```bash
# Simple task
tk create "Fix login bug"

# Detailed bug
tk create "Auth timeout too short" -t bug -p 1 -d "Users logged out after 5min"

# Assigned to teammate
tk create "Review API design" -o alice

# With dependencies
tk create "Deploy to prod" --blocked-by a1b,f1c

# Child of epic
tk create "Implement OAuth" --parent e1a

# For agents: capture discovered work
tk create "Edge case in validation" --discovered-from a1b -p 3
```

### Viewing Ticks

#### `tk show`

Show full details of a tick.

```
tk show <id> [--json]
```

**Output:**

```
a1b  P1 bug  open  @petere

Fix authentication timeout bug

Description:
  Users are getting logged out after 5 minutes instead of 30.

Notes:
  2025-01-08 10:30 - Started investigating, token expiry logic
  2025-01-08 11:15 - Found it, checking wrong field

Labels: backend, auth
Blocked by: f1c (open)
Created: 2025-01-08 10:30 by petere
Updated: 2025-01-08 14:22

Global: petere/chefswiz:a1b
```

#### `tk view`

Interactive TUI for browsing ticks with epic folding.

```
tk view [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--all` | `-a` | All owners |
| `--owner` | `-o` | Filter by owner |
| `--status` | `-s` | Filter by status |
| `--priority` | `-p` | Filter by priority |
| `--type` | `-t` | Filter by type |
| `--label` | `-l` | Filter by label |
| `--parent` | | Focus on a specific epic |

**Behavior:**
- Tree view grouped by epic, with fold/unfold per epic.
- Root list includes non-epic ticks and epics.
- Child ticks are grouped under their `parent` epic.
- Sorting within each group matches `tk list`.

**Keys (default):**
- `j`/`k` or arrows: move
- `space` or `enter`: fold/unfold epic
- `/`: filter search (title + labels)
- `q`: quit

**Implementation note:** Use Bubble Tea for the TUI (`github.com/charmbracelet/bubbletea`)
with `lipgloss` for styling as needed.

#### `tk list`

List ticks with filtering.

```
tk list [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--all` | `-a` | All owners (default: own ticks only) |
| `--owner` | `-o` | Filter by owner |
| `--status` | `-s` | Filter by status |
| `--priority` | `-p` | Filter by priority |
| `--type` | `-t` | Filter by type |
| `--label` | `-l` | Filter by label (ticks must have this label) |
| `--label-any` | | Filter by labels (ticks must have at least one label) |
| `--title-contains` | | Case-insensitive title substring match |
| `--desc-contains` | | Case-insensitive description substring match |
| `--notes-contains` | | Case-insensitive notes substring match |
| `--parent` | | Filter by parent epic |
| `--json` | | Output as JSON array |

**Default behavior:** Shows own open ticks, sorted by priority then created_at.

**Output:**

```
 ID   PRI  TYPE     STATUS  TITLE
 a1b  P1   bug      open    Fix authentication timeout bug
 m4n  P2   task     open    Update API docs
 x9z  P2   feature  open    Add OAuth support

3 ticks (yours, open) · petere/chefswiz
```

**Examples:**

```bash
# My open ticks
tk list

# All open ticks in project
tk list --all

# Alice's bugs
tk list -o alice -t bug

# High priority across team
tk list -a -p 1

# Everything in an epic
tk list --parent e1a --all

# Search by title/description/notes
tk list --title-contains "auth" --all
tk list --desc-contains "token expiry" --all
tk list --notes-contains "root cause" --all

# Match any label
tk list --label-any backend,auth --all
```

### Notes

#### `tk note`

Append a note to a tick's log.

```
tk note <id> <text>
tk note <id> --edit
```

| Flag | Description |
|------|-------------|
| `--edit` | Open notes in $EDITOR |

**Append (default):**

```bash
tk note a1b "Started investigating, looks like token expiry"
```

Automatically prepends timestamp:

```
2025-01-08 10:30 - Started investigating, looks like token expiry
```

**Multiple appends build a log:**

```bash
tk note a1b "Found the bug, wrong field comparison"
tk note a1b "Fixed, needs tests"
```

Results in:

```
2025-01-08 10:30 - Started investigating, looks like token expiry
2025-01-08 11:15 - Found the bug, wrong field comparison  
2025-01-08 11:45 - Fixed, needs tests
```

**Edit in $EDITOR:**

```bash
tk note a1b --edit
```

Opens the notes field in your editor for freeform editing.

#### `tk notes`

View just the notes for a tick.

```
tk notes <id>
```

**Output:**

```
Notes for a1b (Fix authentication timeout bug):

2025-01-08 10:30 - Started investigating, looks like token expiry
2025-01-08 11:15 - Found the bug, wrong field comparison
2025-01-08 11:45 - Fixed, needs tests
```

### Updating Ticks

#### `tk update`

Modify a tick. Only specified fields are changed.

```
tk update <id> [flags]
```

| Flag | Description |
|------|-------------|
| `--title` | New title |
| `--description` | New description |
| `--notes` | Replace notes entirely (prefer `tk note` for appending) |
| `--status` | New status |
| `--priority` | New priority |
| `--type` | New type |
| `--owner` | Reassign to user |
| `--add-labels` | Add labels (comma-separated) |
| `--remove-labels` | Remove labels (comma-separated) |
| `--parent` | Change parent epic (empty string to clear) |
| `--json` | Output updated tick |

**Examples:**

```bash
# Start working on something
tk update a1b --status in_progress

# Reassign to teammate
tk update a1b --owner bob

# Bump priority
tk update a1b --priority 1

# Add labels
tk update a1b --add-labels urgent,backend

# Move to a different epic
tk update a1b --parent c2d
```

#### `tk close`

Close a tick.

```
tk close <id> [--reason <text>] [--json]
```

**Examples:**

```bash
tk close a1b
tk close a1b --reason "Fixed in commit abc123"
```

#### `tk reopen`

Reopen a closed tick.

```
tk reopen <id> [--json]
```

### Deleting Ticks

#### `tk delete`

Delete a tick permanently.

```
tk delete <id> [--force]
```

Without `--force`, prompts for confirmation. Removes the tick file and cleans up references in other ticks' `blocked_by` arrays.

### Dependencies

#### `tk block`

Add a blocker.

```
tk block <id> <blocker-id>
```

"a1b is blocked by f1c":

```bash
tk block a1b f1c
```

#### `tk unblock`

Remove a blocker.

```
tk unblock <id> <blocker-id>
```

#### `tk deps`

Show dependency tree for a tick.

```
tk deps <id> [--json]
```

Shows both what this tick is blocked by and what it blocks.

### Labels

#### `tk label`

Manage labels on a tick.

```
tk label add <id> <label>
tk label rm <id> <label>
tk label list <id>
```

#### `tk labels`

List all labels used in project with counts.

```
tk labels [--json]
```

### Work Queries

#### `tk ready`

Show ticks ready to work on (open, not blocked).

```
tk ready [flags]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--all` | `-a` | All owners |
| `--owner` | `-o` | Specific owner |
| `--label` | `-l` | Filter by label (ticks must have this label) |
| `--label-any` | | Filter by labels (ticks must have at least one label) |
| `--title-contains` | | Case-insensitive title substring match |
| `--desc-contains` | | Case-insensitive description substring match |
| `--notes-contains` | | Case-insensitive notes substring match |
| `--limit` | `-n` | Max results (default: 10) |
| `--json` | | Output as JSON |

**Ready** means: `status == "open"` AND (no `blocked_by` OR all blockers are `closed`).

Sorted by priority (ascending), then created_at (ascending).

```bash
# What should I work on?
tk ready

# What can anyone work on?
tk ready --all

# Top 5 for Alice
tk ready -o alice -n 5
```

#### `tk blocked`

Show blocked ticks.

```
tk blocked [--all] [--owner <x>] [--json]
```

#### `tk stats`

Show statistics.

```
tk stats [--all] [--json]
```

**Output:**

```
petere/chefswiz

  Total: 42 ticks
  Status: 28 open · 8 in progress · 6 closed
  Priority: P0:2 · P1:8 · P2:20 · P3:10 · P4:2
  Types: bug:12 · feature:15 · task:10 · epic:3 · chore:2

  Ready: 18
  Blocked: 10
```

### Git Integration

#### `tk status`

Show tick-related git status.

```
tk status [--json]
```

Shows:
- Uncommitted tick changes
- Recent auto-merges (if any)
- Sync state

#### `tk merge-file`

Internal command used by git merge driver. Not for direct use.

```
tk merge-file <base> <ours> <theirs> <path>
```

## Git Merge Driver

tick uses a custom merge driver to automatically resolve conflicts when two people edit the same tick.

### Setup

Created automatically by `tk init`:

**.gitattributes:**
```
.tick/issues/*.json merge=tick
```

**Git config (local):**
```
[merge "tick"]
    name = tick JSON merge
    driver = tk merge-file %O %A %B %P
```

### Merge Strategy

When git detects a conflict on a tick file, it invokes `tk merge-file` with three versions:
- **base**: Common ancestor
- **ours**: Local changes
- **theirs**: Incoming changes

**Resolution rules by field:**

| Field | Strategy |
|-------|----------|
| `labels` | Union of both arrays |
| `blocked_by` | Union of both arrays |
| `notes` | Concatenate (with merge marker if diverged) |
| `status` | Closed wins > in_progress > open |
| `priority` | Lower (more urgent) wins |
| `updated_at` | Latest timestamp |
| `closed_at` | Latest timestamp (if set) |
| `title`, `description`, `owner`, etc. | Last-write-wins via `updated_at` |

**Notes merge strategy:**

If both sides appended to notes:

```
2025-01-08 10:30 - Original note
2025-01-08 11:00 - Alice's note (ours)
--- merged from remote ---
2025-01-08 11:05 - Bob's note (theirs)
```

**Conflict-free merges:**

| Scenario | Result |
|----------|--------|
| A adds label, B changes status | Both changes applied ✓ |
| A and B add different labels | Union of labels ✓ |
| A closes, B adds description | Closed with new description ✓ |
| A sets P1, B sets P2 | P1 wins (more urgent) ✓ |
| A and B both append notes | Both notes concatenated ✓ |

**True conflicts (rare):**

If somehow the merge is irreconcilable, the driver exits non-zero and git marks it as a conflict for manual resolution. This should be rare.

### Pull Workflow

Regular `git pull` just works:

```bash
git pull
# Tick merges happen automatically via merge driver
# No wrapper command needed
```

## Index Cache (Optional)

For performance, tick maintains a gitignored index:

**.tick/.index.json:**
```json
{
  "built_at": "2025-01-08T10:00:00Z",
  "ticks": [
    { "id": "a1b", ... },
    { "id": "f1c", ... }
  ]
}
```

**Cache invalidation:**

1. On any `tk` command, check if any `.tick/issues/*.json` file has mtime > index mtime
2. If yes, rebuild index (parallel file read)
3. If no, use cached index (<1ms)

**Rebuild triggers:**
- Any tick file modified
- Any tick file added/deleted
- `tk rebuild` (manual)

## Agent Integration

### Recommended AGENTS.md addition

```markdown
## Issue Tracking

Use `tk` for tracking all work. Before starting:

    tk ready --json | head -1

Create ticks for discovered work:

    tk create "Found edge case" --discovered-from <current-tick> -p 3

Update status as you work:

    tk update <id> --status in_progress

Add notes as you go:

    tk note <id> "Investigating the auth flow"
    tk note <id> "Found root cause in token validation"

Close when done:

    tk close <id> --reason "Fixed in this session"
```

### JSON Output

All commands support `--json` for programmatic use:

```bash
# Get next task
tk ready --json | jq '.[0]'

# Create and capture ID
ID=$(tk create "New task" --json | jq -r '.id')

# Structured status
tk stats --all --json
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TICK_OWNER` | Override owner detection |
| `TICK_DIR` | Override .tick directory location |
| `NO_COLOR` | Disable colored output |

## Implementation Notes

### Go Package Structure

```
tick/
  cmd/
    tk/
      main.go           # CLI entry point
  internal/
    config/
      config.go         # Config loading
    github/
      github.go         # Project/owner detection
    tick/
      tick.go           # Tick struct and operations
      store.go          # File I/O, index cache
      query.go          # Filtering and sorting
    merge/
      merge.go          # Git merge driver logic
  go.mod
  go.sum
```

### Dependencies

Minimal:
- Standard library only for core functionality
- Optional: `github.com/goccy/go-json` for faster JSON parsing
- Optional: `github.com/fatih/color` for colored output

## Testing

### Strategy

Use a small mix of unit tests for pure logic and integration tests against a temp repo on disk.
Keep tests deterministic by seeding RNG for ID generation and using fixed timestamps when
asserting output.

### Suites

- Unit: query filtering/sorting, ready/blocked logic, merge rules, ID generation collisions.
- Integration: CLI commands (init/create/update/list/ready/close), file I/O, index cache rebuild,
  git merge driver behavior using temp repos.
- JSON output: schema shape, stable ordering, and exit codes on failure paths.
- Performance sanity: optional benchmark tests for `tk ready` with 100/500 ticks.

### Fixtures

Use `.tick/issues/*.json` fixtures in a temp directory; avoid committing large fixtures.
Prefer table-driven tests that build ticks in memory and write only when needed.

## Error Handling and Exit Codes

All errors print a short message to stderr and exit non-zero. Successful commands exit 0.

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | Generic error (unexpected failure) |
| 2 | Usage error (bad flags, missing args) |
| 3 | Not in a tick repo / missing `.tick/` |
| 4 | Tick not found / invalid tick ID |
| 5 | Git/GitHub detection error (missing remote, `gh` not auth'd) |
| 6 | IO/JSON error (read/write/parse) |

Errors should be machine-friendly (single line) and human-friendly (clear fix hint).

### Performance Targets

| Operation | Target | Method |
|-----------|--------|--------|
| `tk ready` (100 ticks) | <10ms | Parallel read or index cache |
| `tk ready` (500 ticks) | <20ms | Index cache |
| `tk create` | <5ms | Single file write |
| `tk update` | <5ms | Single file read/write |
| `tk show` | <2ms | Single file read |

## Migration from Beads

For users migrating from beads:

```bash
# Export beads to tick format
bd list --json | jq -c '.[]' | while read -r bead; do
  # Convert bd-xxx to 3-char base36
  old_id=$(echo "$bead" | jq -r '.id')
  new_id=$(echo "$old_id" | sed 's/bd-//' | cut -c1-3)
  
  echo "$bead" | jq --arg id "$new_id" '
    .id = $id |
    del(.external_ref, .content_hash, .source_repo)
  ' > ".tick/issues/${new_id}.json"
done
```

## What tick Does NOT Do

Explicitly out of scope:

| Feature | Why not |
|---------|---------|
| Web UI | Use `tk list --json` and build your own |
| Daemon | No background processes |
| Real-time sync | Git push/pull is the sync mechanism |
| Compaction | Just close old ticks |
| Templates | `tk create` flags suffice |
| Cross-repo references | Each repo is isolated |
| Comments thread | Use `notes` for a simple log |
| Time tracking | Out of scope |
| Notifications | Out of scope |
| GitHub Issues sync | They're different systems |

## Comparison with Beads

| Aspect | tick | beads |
|--------|------|-------|
| Storage | One JSON file per tick | JSONL + SQLite |
| Background process | None | Daemon |
| Git conflicts | Native merge driver | Custom JSONL merge |
| Sync | Just git | Daemon + auto-export |
| Complexity | ~800 lines Go | ~130k lines Go |
| Multi-agent | Owner field + merge driver | SQLite + daemon coordination |
| Query speed | <20ms (index cache) | <1ms (SQLite) |
| Debuggability | `cat .tick/issues/a1b.json` | `bd doctor`, daemon logs |

tick trades raw query speed for simplicity. For projects under 1000 ticks, the difference is imperceptible.

## License

MIT
