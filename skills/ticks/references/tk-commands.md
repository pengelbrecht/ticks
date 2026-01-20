# tk Command Reference

Complete reference for the Ticks CLI.

## Creating Ticks

```bash
tk create "Title" [flags]
```

| Flag | Description |
|------|-------------|
| `-d, --description` | Tick description |
| `-acceptance` | Acceptance criteria (how to verify done) |
| `-t, --type` | Type: `task` (default) or `epic` |
| `-p, --priority` | Priority: 0=Critical, 1=High, 2=Medium, 3=Low, 4=Backlog |
| `-l, --labels` | Comma-separated labels |
| `-parent` | Parent epic ID |
| `-blocked-by` | Blocking tick ID(s) |
| `--requires` | Pre-declared approval gate: `approval`, `review`, `content` |
| `--awaiting` | Immediate human assignment: `work`, `approval`, `input`, `review`, `content`, `escalation`, `checkpoint` |
| `-defer` | Defer until date (YYYY-MM-DD) |
| `-external-ref` | External reference (e.g., gh-42) |

**Examples:**
```bash
# Basic task
tk create "Fix login bug" -d "Users can't login with special chars" -p 1

# Task with acceptance criteria
tk create "Add email validation" \
  -d "Validate email format on registration form" \
  -acceptance "All validation tests pass"

# Epic
tk create "Auth System" -t epic -d "Complete authentication implementation"

# Task with dependencies
tk create "Add OAuth" -parent abc -blocked-by def,ghi

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
| `-t, --type` | Filter by type: `task` or `epic` |
| `-s, --status` | Filter by status: `open` or `closed` |
| `-p, --priority` | Filter by priority (0-4) |
| `-l, --labels` | Filter by labels |
| `-parent` | Filter by parent epic |
| `--awaiting` | Filter by awaiting status |
| `--json` | Output as JSON |

**Special commands:**
```bash
tk ready                    # List ready (unblocked) tasks
tk blocked                  # List blocked tasks
tk next <epic-id>           # Get next task for agent in epic
tk next --awaiting          # Get next task for human
```

**Awaiting filters:**
```bash
tk list --awaiting              # All ticks awaiting human action
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
| `-t, --title` | New title |
| `-d, --description` | New description |
| `-p, --priority` | New priority |
| `-l, --labels` | New labels (replaces existing) |
| `--awaiting` | Set awaiting status (or `--awaiting=""` to clear) |

## Status Changes

```bash
tk close <id> "reason"      # Close with reason
tk reopen <id>              # Reopen closed tick
```

## Human Verdicts

Commands for humans responding to agent handoffs:

```bash
tk approve <id>             # Approve tick awaiting human verdict
tk reject <id>              # Reject tick (returns to agent)
tk reject <id> "feedback"   # Reject with feedback note
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
tk block <id> -b <blocker-id>     # Add blocker
tk unblock <id> -b <blocker-id>   # Remove blocker
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

## Running Agent

```bash
tk run [epic-id...] [flags]
```

| Flag | Description |
|------|-------------|
| `--auto` | Auto-select next ready epic |
| `--parallel N` | Run N tasks in parallel |
| `--worktree` | Use git worktree for isolation |
| `--watch` | Restart when tasks become ready |
| `--max-iterations N` | Max iterations per task (default 50) |
| `--max-cost N` | Max cost in USD |
| `--max-task-retries N` | Max retries for failed tasks (default 3) |
| `--timeout duration` | Task timeout (default 30m) |
| `--skip-verify` | Skip verification after completion |
| `--verify-only` | Only run verification |
| `--jsonl` | Output JSONL format |
| `--checkpoint-interval N` | Checkpoint every N iterations |

**Examples:**
```bash
tk run abc123                     # Run on specific epic
tk run abc123 def456              # Multiple epics (sequential)
tk run --auto                     # Auto-select ready epic
tk run abc123 --worktree          # Isolated git worktree
tk run abc123 --parallel 3        # 3 parallel tasks
tk run abc123 --watch             # Watch mode
tk run abc123 --max-cost 5.00     # Cost limit
```

## Resuming from Checkpoint

```bash
tk resume <checkpoint-id>         # Resume from checkpoint
tk checkpoints [epic-id]          # List available checkpoints
```

## Merging Epic Branch

```bash
tk merge <epic-id>                # Merge completed epic branch
```

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
