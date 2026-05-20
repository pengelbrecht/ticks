# tk Command Reference

Complete reference for the Ticks CLI.

## Creating Ticks

```bash
tk create "Title" [flags]
```

| Flag | Description |
|------|-------------|
| `-d, --description` | Tick description |
| `--acceptance` | Acceptance criteria (how to verify done) |
| `-t, --type` | Type: `task` (default), `epic`, `bug`, `feature`, `chore` |
| `-p, --priority` | Priority: 0=Critical, 1=High, 2=Medium, 3=Low, 4=Backlog |
| `-l, --labels` | Comma-separated labels |
| `--parent` | Parent epic ID |
| `-b, --blocked-by` | Blocking tick ID(s), comma-separated |
| `-r, --requires` | Pre-declared approval gate: `approval`, `review`, `content` |
| `-a, --awaiting` | Immediate human assignment: `work`, `approval`, `input`, `review`, `content`, `escalation`, `checkpoint` |
| `--defer` | Defer until date (YYYY-MM-DD) |
| `--external-ref` | External reference (e.g., gh-42) |

> Long flags require double dashes (`--acceptance`, `--parent`, `--blocked-by`). A single dash is only for letter shorthands (`-d`, `-t`, `-p`, `-l`, `-b`, `-a`, `-r`).

**Examples:**
```bash
# Basic task
tk create "Fix login bug" -d "Users can't login with special chars" -p 1

# Task with acceptance criteria
tk create "Add email validation" \
  -d "Validate email format on registration form" \
  --acceptance "All validation tests pass"

# Epic
tk create "Auth System" -t epic -d "Complete authentication implementation"

# Task with dependencies
tk create "Add OAuth" --parent abc --blocked-by def,ghi

# Task requiring approval
tk create "Update auth flow" --requires approval -d "Security-sensitive change"

# Human-only task (skipped by agent)
tk create "Configure AWS credentials" --awaiting work
```

## Listing Ticks

```bash
tk list [flags]
```

| Flag | Description |
|------|-------------|
| `-t, --type` | Filter by type: `task`, `epic`, `bug`, `feature`, `chore` |
| `-s, --status` | Filter by status: `open`, `closed`, `all` |
| `-p, --priority` | Filter by priority (0-4) |
| `-l, --label` | Filter by label |
| `--parent` | Filter by parent epic |
| `-a, --all` | Show all owners (default: current user only) |
| `--awaiting` | Filter by awaiting status |
| `--json` | Output as JSON |

**Special commands:**
```bash
tk ready                    # List ready (unblocked) tasks
tk blocked                  # List blocked tasks
tk next <epic-id>           # Get next task for agent in epic
tk next --awaiting=         # Get next task for human
```

**Awaiting filters:**
```bash
tk list --awaiting=             # All ticks awaiting human action
tk list --awaiting approval     # Only ticks awaiting approval
tk list --awaiting input,review # Multiple awaiting types
```

## Viewing Ticks

```bash
tk show <id> [--json]
```

## Updating Ticks

```bash
tk update <id> [flags]
```

| Flag | Description |
|------|-------------|
| `--title` | New title |
| `--description` | New description |
| `--priority` | New priority |
| `--status` | New status: `open`, `in_progress`, `closed` |
| `--add-labels` / `--remove-labels` | Add or remove labels |
| `--parent` | New parent epic (empty string to clear) |
| `-a, --awaiting` | Set awaiting status (or `--awaiting=` to clear) |
| `-r, --requires` | Set approval gate (empty to clear) |
| `-v, --verdict` | Set verdict: `approved`, `rejected` |

(`tk update` has no single-letter shorthands except `-a`, `-r`, `-v` — use the long form for the rest.)

## Status Changes

```bash
tk close <id>                    # Close
tk close <id> --reason "reason"  # Close with reason
tk close <id> --force            # Close epic with all children, or bypass a requires gate
tk reopen <id>                   # Reopen closed tick
```

## Human Verdicts

Commands for humans responding to agent handoffs:

```bash
tk approve <id>             # Approve tick awaiting human verdict
tk reject <id> "feedback"   # Reject — feedback message is required (added as a human note)
```

**What happens on verdict:**

| awaiting | approved | rejected |
|----------|----------|----------|
| `work` | Closes tick | (invalid) |
| `approval` | Closes tick | Back to agent |
| `input` | Back to agent (with answer) | Closes tick |
| `review` | Closes tick (merge PR) | Back to agent |
| `content` | Closes tick | Back to agent |
| `escalation` | Back to agent (with direction) | Closes tick |
| `checkpoint` | Back to agent (next phase) | Back to agent (redo) |

## Dependencies

```bash
tk block <id> <blocker-id>        # Add blocker (id is now blocked by blocker-id)
tk unblock <id> <blocker-id>      # Remove blocker
tk deps <id>                      # Show dependency tree
```

## Notes

```bash
tk note <id> "note text"              # Add note (default: from agent)
tk note <id> "note text" --from human # Human note (feedback, answers)
tk notes <id>                         # List notes
```

**Use `--from human` for:**
- Human providing feedback after rejecting work
- Human answering a question (INPUT_NEEDED)
- Human giving direction on escalation

## Running an Epic

This skill runs epics by orchestrating Claude Code subagents — see `claude-runner.md`. The standalone `tk run` runner (and its `tk resume` / `tk checkpoints` / `tk merge` companions) is intentionally out of scope here for now, so it isn't documented in this reference.

## Web Board

```bash
tk board [path] [flags]
```

| Flag | Description |
|------|-------------|
| `-p, --port N` | Port to listen on (default 3000) |

Opens a web interface for viewing and managing ticks.

## Maintenance

```bash
tk gc [flags]                     # Garbage collect old logs
```

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would be deleted |
| `--max-age duration` | Max age for logs (default 30d) |

## Output Formats

Most commands support `--json`:

```bash
tk list --json | jq '.ticks[] | select(.priority == 1)'
tk show abc --json | jq '.description'
```

## Awaiting States Reference

| awaiting | Meaning | Human Action |
|----------|---------|--------------|
| `work` | Human must do the task | Complete work, then approve |
| `approval` | Agent done, needs sign-off | Review and approve/reject |
| `input` | Agent needs information | Provide answer in note, approve |
| `review` | PR needs code review | Review PR, approve/reject |
| `content` | UI/copy needs judgment | Judge quality, approve/reject |
| `escalation` | Agent found issue | Decide direction, approve/reject |
| `checkpoint` | Phase complete | Verify, approve to continue |
