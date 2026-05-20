# Tickflow: Configuration, Run Records & Resume/Recovery

This document covers the Tickflow autonomous runner UX in depth:
configuration files, run records, resume/recovery behaviour,
stale-lease semantics, verifier support, runtime policies, and
manual verification steps.

> **Quick links**
> - [pool-run-spec.md](pool-run-spec.md) — pool-mode architecture
> - [ticker-absorption-plan.md](ticker-absorption-plan.md) — migration history

---

## 1. Configuration Files

Tickflow reads two configuration files from the `.tick/` directory:

| File | Format | Purpose |
|------|--------|---------|
| `.tick/config.json` | JSON | Project settings, agent backend, verification, context, policy |
| `.tick/config.yaml` | YAML | Wrap-up steps (shell commands, reviews) |

### 1.1 `.tick/config.json` — Full Example

```jsonc
{
  "version": 1,
  "id_length": 3,

  // Agent backend selection
  "agent": {
    "backend": "acp",          // "claude" (default, direct CLI) or "acp"
    "name": "claude",          // ACP agent name: "claude", "codex", "gemini"
    "command": []              // Custom ACP launch command (optional)
  },

  // Verification settings
  "verification": {
    "enabled": true            // Run verifier commands after tasks (default true)
  },

  // Epic context generation
  "context": {
    "enabled": true,           // Generate shared context for multi-task epics (default true)
    "max_tokens": 4000,        // Target context size (100–100,000; default 4000)
    "auto_refresh_days": 0,    // Days until auto-refresh (0 = never; default 0)
    "generation_timeout": "5m",// Max generation time (1s–1h; default "5m")
    "generation_model": ""     // Override model for generation (default "" = agent default)
  },

  // Tickflow run policy controls (supervisor-level constraints)
  "policy": {
    "max_attempts": 3,                   // Max attempts per task before stuck (1–100; default 3)
    "max_no_progress_attempts": 2,       // Consecutive no-progress attempts before stuck (1–50; default 2)
    "max_same_verifier_failures": 2,     // Same verifier failing before escalation (1–50; default 2)
    "require_commit": false,             // Require git commit for task completion (default false)
    "require_verifiers_for_priority": 0, // Priority threshold for mandatory verifiers (0=disabled; default 0)
    "sandbox": false,                    // Sandbox agent execution (default false)
    "secrets_exposure": "none"           // "none", "env", or "file" (default "none")
  }
}
```

**Field details:**

| Section | Field | Default | Range | Description |
|---------|-------|---------|-------|-------------|
| `agent` | `backend` | `"claude"` | `"claude"`, `"acp"` | Agent backend. `"claude"` uses direct Claude CLI. `"acp"` uses Agent Communication Protocol. |
| `agent` | `name` | `"claude"` | string | ACP agent name (only when `backend` is `"acp"`). |
| `agent` | `command` | `[]` | string array | Custom ACP launch command override (e.g., `["npx", "my-agent"]`). |
| `verification` | `enabled` | `true` | bool | Whether to run verifier commands after each task. |
| `context` | `enabled` | `true` | bool | Whether to generate epic context before first wave. |
| `context` | `max_tokens` | `4000` | 100–100,000 | Target size for context documents. |
| `context` | `auto_refresh_days` | `0` | 0–365 | Days until automatic context refresh (0 = never). |
| `context` | `generation_timeout` | `"5m"` | 1s–1h | Maximum time for context generation. |
| `context` | `generation_model` | `""` | string | Override model for context generation. |
| `policy` | `max_attempts` | `3` | 1–100 | Max total attempts per task. After exhaustion, task is marked stuck. |
| `policy` | `max_no_progress_attempts` | `2` | 1–50 | Consecutive attempts with identical output hashes before marking stuck. |
| `policy` | `max_same_verifier_failures` | `2` | 1–50 | Same verifier command failing N times triggers escalation. |
| `policy` | `require_commit` | `false` | bool | Require at least one git commit for task closure. |
| `policy` | `require_verifiers_for_priority` | `0` | 0–5 | Priority threshold (1=P1). E.g., `2` means P1 and P2 tasks require passing verifiers. 0 = disabled. |
| `policy` | `sandbox` | `false` | bool | Run agents in sandboxed environment. |
| `policy` | `secrets_exposure` | `"none"` | `"none"`, `"env"`, `"file"` | How secrets are exposed to agents. |

### 1.2 `.tick/config.yaml` — Wrap-Up Steps

Shell-based wrap-up steps run after an epic completes. Defined in `.tick/config.yaml` under the `wrap_up` key.

```yaml
wrap_up:
  # Shell command steps
  - run: "go build ./..."
    name: "Build"

  - run: "go vet ./..."
    name: "Vet"

  - run: "go test ./..."
    name: "Tests"
    continue_on_failure: true   # Don't abort wrap-up if tests fail

  # Diff review step (prints git diff summary)
  - review: true
    name: "Review diff"
    prompt: "Review the changes for correctness"  # Optional custom prompt
```

**Step types:**

| Type | Key | Description |
|------|-----|-------------|
| Shell | `run: "command"` | Execute a shell command in the worktree |
| Review | `review: true` | Generate a diff summary (git diff --stat) |

**Step options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | command text | Display name for the step |
| `continue_on_failure` | bool | `false` | If `true`, wrap-up continues even if this step fails |

### 1.3 `.tick/wrapup.md` — Agent-Driven Wrap-Up

For more complex post-epic tasks, create `.tick/wrapup.md` with markdown instructions. The agent decomposes these into steps and executes them automatically **after** the shell steps from `config.yaml`.

Example:

```markdown
Run /agent-skills:review to conduct a code review on all changes.

Run /simplify to review the changed code for unnecessary complexity.
```

Use `--skip-wrap-up` to skip both shell and agent wrapup steps.

---

## 2. Directory Structure & Run Records

### 2.1 Directory Layout

```
.tick/
├── config.json           # Project config (tracked in git)
├── config.yaml           # Wrap-up steps (tracked in git)
├── wrapup.md             # Agent wrap-up instructions (tracked in git)
├── .gitignore            # Ignores logs/
├── issues/               # One JSON file per tick (tracked in git)
│   ├── <id>.json
│   └── ...
├── activity/             # Tick mutation audit log (tracked in git)
│   └── activity.jsonl
└── logs/                 # Runtime state (NOT tracked, gitignored)
    ├── runs/             # Engine debug JSONL per run timestamp
    ├── records/          # Task completion JSON per tick ID
    │   ├── <id>.json         # Completed run record
    │   ├── <id>.live.json    # In-progress run snapshot
    │   ├── _epic-<id>.status.json    # Epic status
    │   └── _epic-<id>.live.json      # Epic live record (swarm mode)
    ├── checkpoints/      # (Future) Resume state JSON
    └── context/          # Cached epic context markdown per epic ID
```

**Tracking policy:**
- `issues/` + `activity/` = Issue tracker data → travels with repo via git.
- `logs/` = Runtime state → local, ephemeral, auto-cleaned (30-day retention).

### 2.2 Run Record Files

When `tk run` executes, it writes run records to `.tick/logs/records/`:

| File Pattern | Contents | Lifecycle |
|--------------|----------|-----------|
| `<tick-id>.live.json` | In-progress agent state snapshot | Written atomically during agent runs; deleted or finalized on completion |
| `<tick-id>.json` | Completed run record | Written when task finishes |
| `_epic-<id>.status.json` | Epic-level status (e.g., "context_generating") | Written during run phases |
| `_epic-<id>.live.json` | Epic-level live record (swarm orchestrator) | Written during swarm runs |

**Live record structure** (`.live.json`):

```json
{
  "session_id": "abc123",
  "model": "claude-sonnet-4-20250514",
  "started_at": "2026-05-08T10:00:00Z",
  "output": "Working on task...",
  "thinking": "",
  "tools": [
    {"name": "Read", "input": "README.md", "output": "...", "duration_ms": 150, "is_error": false}
  ],
  "active_tool": {"name": "Bash", "input": "go test ./...", "duration_ms": 3200, "is_error": false},
  "metrics": {
    "input_tokens": 15000,
    "output_tokens": 3000,
    "cache_read_tokens": 8000,
    "cache_creation_tokens": 2000,
    "cost_usd": 0.12,
    "duration_ms": 45000
  },
  "status": "running",
  "num_turns": 5,
  "last_updated": "2026-05-08T10:00:45Z"
}
```

### 2.3 Log Cleanup & Garbage Collection

Logs are automatically cleaned on `tk run` and `tk board` startup with a 30-day retention policy.

```bash
# Manual cleanup
tk gc                    # Clean logs older than 30 days
tk gc --max-age 7d       # Clean logs older than 7 days
tk gc --dry-run          # Preview what would be cleaned
```

**What gets cleaned:**

| Path | Contents | Action |
|------|----------|--------|
| `.tick/activity/activity.jsonl` | Tick change log | Trim entries older than max-age |
| `.tick/logs/records/*.json` | Completed run records | Delete older than max-age |
| `.tick/logs/records/*.live.json` | In-progress runs | **Never deleted** |
| `.tick/logs/runs/*.jsonl` | Engine debug logs | Delete older than max-age |
| `.tick/logs/checkpoints/*.json` | Checkpoint files | Delete older than max-age |
| `.tick/logs/context/*.md` | Cached context docs | Delete older than max-age |

---

## 3. Resume Flow & Recovery Behaviour

### 3.1 How `tk run` Handles State

Tickflow is designed for safe interruption and seamless resumption. The key mechanism is **worktree preservation**: when a run is interrupted or exits before completion, the git worktree is preserved with all changes, allowing the next `tk run` to pick up where it left off.

**Lifecycle:**

```
tk run <epic>
  │
  ├─ Create/reuse worktree for epic
  │    └─ Worktree path: .tickflow-worktrees/<repo>/<epic-branch>/
  │
  ├─ Generate epic context (if needed)
  │
  ├─ Wave loop:
  │    ├─ Compute waves from dependency graph
  │    ├─ Execute first wave (parallel tasks)
  │    ├─ Process results (signals, close tasks, policy checks)
  │    └─ Re-compute waves (completed tasks may unblock next wave)
  │
  ├─ Exit conditions:
  │    ├─ All tasks completed → merge & cleanup worktree
  │    ├─ Tasks awaiting human → preserve worktree
  │    ├─ Budget exceeded → preserve worktree
  │    ├─ Ctrl+C / signal → preserve worktree
  │    └─ Max iterations → preserve worktree
  │
  └─ Wrap-up (if all tasks completed):
       ├─ Shell steps from config.yaml
       ├─ Agent steps from wrapup.md
       ├─ Merge worktree to parent branch
       └─ Optional: create draft PR
```

### 3.2 Exit Reasons & Worktree Decisions

| Exit Reason | Worktree Action | Resume? |
|-------------|-----------------|---------|
| `"all tasks completed"` | **Merge & remove** | No — epic is done |
| `"no tasks found"` | **Merge & remove** | No — nothing to do |
| `"no ready tasks (remaining tasks are blocked or awaiting human)"` | **Preserve** | Yes — resolve blockers, re-run |
| `"context cancelled"` (Ctrl+C) | **Preserve** | Yes — just re-run `tk run <epic>` |
| `"max iterations (N) reached"` | **Preserve** | Yes — re-run to continue |
| `"budget: max cost exceeded"` | **Preserve** | Yes — increase `--max-cost` or re-run |
| `"watch timeout"` | **Preserve** | Yes — re-run with `--watch` |

### 3.3 Resume Workflow

Resuming is as simple as re-running `tk run`:

```bash
# Run gets interrupted (Ctrl+C, budget, etc.)
tk run abc123
# ⚠ Run ended: max iterations (50) reached
# ℹ Worktree preserved at /path/to/worktree

# Resume — picks up the same worktree, skips completed tasks
tk run abc123

# Resume with higher limits
tk run abc123 --max-iterations 100 --max-cost 10.00
```

**What happens on resume:**
1. `tk run` detects the existing worktree for the epic and reuses it.
2. The wave computation reads current task statuses from `.tick/issues/`.
3. Already-closed tasks are excluded from wave computation.
4. In-progress tasks (from a crashed previous run) are included in the next wave.
5. The engine starts executing from the first available wave.

No explicit "resume" command is needed. The state is fully captured in:
- **Tick statuses** (`.tick/issues/*.json`) — which tasks are done, in-progress, or blocked.
- **Git worktree** — code changes from previous runs.
- **Epic context** (`.tick/logs/context/<epic>.md`) — cached context survives restarts.

### 3.4 Crash Recovery

If the agent process crashes or is killed (SIGKILL, power loss):

1. **In-progress tasks remain `in_progress`** in `.tick/issues/`.
2. **Live records** (`.live.json`) may be stale but are harmless.
3. On next `tk run`, these tasks are included in wave computation and re-executed.
4. Any partial code changes in the worktree are preserved.

**Interruption notes:** When the engine detects a context cancellation (Ctrl+C), it writes notes to both the epic and the current task documenting the interruption point. This helps the next run understand the state.

### 3.5 Watch Mode for Continuous Execution

```bash
# Watch mode: idle when blocked, auto-resume when tasks become ready
tk run abc123 --watch

# Watch with timeout
tk run abc123 --watch --timeout 2h

# Watch with custom poll interval
tk run abc123 --watch --poll 30s
```

When all tasks are blocked or awaiting human action, watch mode:
1. Enters an idle state (stops consuming agent tokens).
2. Watches `.tick/issues/` for file changes.
3. Polls at the configured interval (default 10s).
4. When a task becomes ready (e.g., human approves), immediately resumes execution.

---

## 4. Stale Lease Semantics

### 4.1 The Problem

When an agent claims a task (`status: "in_progress"`), that task is locked. If the agent crashes without releasing the task, it remains locked forever — a "stale lease."

### 4.2 The Solution: `started_at` Timestamp

Every tick has an optional `started_at` field set when it transitions to `in_progress`:

```json
{
  "id": "abc",
  "status": "in_progress",
  "started_at": "2026-05-08T10:00:00Z",
  "updated_at": "2026-05-08T10:00:00Z"
}
```

**Lifecycle:**

| Transition | `started_at` |
|------------|-------------|
| `open` → `in_progress` | Set to `now()` |
| `in_progress` → `closed` | Cleared (`null`) |
| `in_progress` → `open` (release/timeout) | Cleared (`null`) |

### 4.3 Stale Recovery

In pool mode (`tk run <epic> --pool N`), stale recovery runs automatically at startup:

```
RecoverStaleTasks(epicID, staleTimeout)
  │
  ├─ Find all in_progress tasks for epic
  ├─ Check if started_at + staleTimeout < now
  └─ Reset stale tasks to open (clear started_at)
```

**Default stale timeout:** 1 hour (configurable via `--stale-timeout`).

```bash
# Pool mode with custom stale timeout
tk run abc123 --pool 4 --stale-timeout 2h
```

### 4.4 Single-Worker Recovery

In the default single-worker mode, stale leases are handled implicitly:
- On resume, wave computation includes `in_progress` tasks.
- The engine re-executes them as part of the normal wave loop.
- No explicit timeout mechanism is needed because there's only one worker.

---

## 5. Verifiers, Runtime Resources & Policies

### 5.1 Verifier Commands

Verifiers are commands that validate task completion. They are specified in tick descriptions or inferred by the supervisor. The engine tracks verifier outcomes via the policy system.

**How verifiers interact with policy:**

```jsonc
{
  "policy": {
    // After 2 failures of the same verifier, escalate the task
    "max_same_verifier_failures": 2,

    // Require passing verifiers for P1 and P2 tasks
    "require_verifiers_for_priority": 2
  }
}
```

**Policy tracking per task:**
- **Attempt count** — total times the task was tried. After `max_attempts`, the task is marked stuck (awaiting human work).
- **No-progress detection** — consecutive attempts with identical output hashes. After `max_no_progress_attempts`, the task is escalated.
- **Verifier failure count** — per verifier command. After `max_same_verifier_failures`, the task is escalated.

### 5.2 Runtime Resources

The run engine manages these runtime resources automatically:

| Resource | Location | Purpose |
|----------|----------|---------|
| Git worktree | `.tickflow-worktrees/<repo>/<branch>/` | Isolated working copy per epic |
| Epic context | `.tick/logs/context/<epic>.md` | Pre-computed project context shared across tasks |
| Run logs | `.tick/logs/runs/<timestamp>.jsonl` | Debug event stream |
| Live records | `.tick/logs/records/<tick>.live.json` | Real-time agent state for board UI |
| Activity log | `.tick/activity/activity.jsonl` | Audit trail of tick mutations |

### 5.3 Policy Configuration Examples

**Conservative policy** (human-in-the-loop):

```json
{
  "policy": {
    "max_attempts": 2,
    "max_no_progress_attempts": 1,
    "require_commit": true,
    "require_verifiers_for_priority": 3,
    "secrets_exposure": "none"
  }
}
```

**Permissive policy** (autonomous):

```json
{
  "policy": {
    "max_attempts": 10,
    "max_no_progress_attempts": 5,
    "max_same_verifier_failures": 5,
    "require_commit": false,
    "require_verifiers_for_priority": 0,
    "secrets_exposure": "env"
  }
}
```

---

## 6. Agent Signals & Handoff Protocol

During execution, agents communicate with the engine via signals embedded in their output:

| Signal | Format | Effect |
|--------|--------|--------|
| `COMPLETE` | `<promise>COMPLETE: summary</promise>` | Task marked done (or awaiting if `requires` set) |
| `EJECT` | `<promise>EJECT: reason</promise>` | Task set to awaiting `work` |
| `INPUT_NEEDED` | `<promise>INPUT_NEEDED: question</promise>` | Task set to awaiting `input` |
| `ESCALATE` | `<promise>ESCALATE: issue</promise>` | Task set to awaiting `escalation` |
| `REVIEW_REQUESTED` | `<promise>REVIEW_REQUESTED: what</promise>` | Task set to awaiting `review` |
| `CONTENT_REVIEW` | `<promise>CONTENT_REVIEW: what</promise>` | Task set to awaiting `content` |
| `APPROVAL_NEEDED` | `<promise>APPROVAL_NEEDED: what</promise>` | Task set to awaiting `approval` |
| `CHECKPOINT` | `<promise>CHECKPOINT: state</promise>` | Task set to awaiting `checkpoint` |

When a signal sets a task to an awaiting state, the engine moves to the next task. The awaiting task requires human action (`tk approve`, `tk reject`, or updating the tick) before it can be re-executed.

---

## 7. `tk run` CLI Reference

```bash
tk run [epic-id] [flags]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--max-iterations` | `50` | Maximum wave iterations per run |
| `--max-cost` | `0` (unlimited) | Maximum cost in USD |
| `--max-task-retries` | `3` | Max retries for failed tasks |
| `--timeout` | `30m` | Per-task agent timeout |
| `--auto` | `false` | Auto-select next ready epic |
| `--watch` | `false` | Watch mode — idle when blocked, resume on changes |
| `--poll` | `10s` | Poll interval for watch mode |
| `--debounce` | `0` | Debounce interval for file changes |
| `--board` | `false` | Start web board UI |
| `--port` | `3000` | Board server port |
| `--cloud` | `false` | Enable cloud sync (implies `--board`) |
| `--dev` | `false` | Serve board UI from disk for hot reload |
| `--skip-wrap-up` | `false` | Skip wrap-up phase |
| `--no-merge` | `false` | Don't merge worktree on completion |
| `--pr` | `false` | Create draft PR after successful run |
| `--agent` | (from config) | Agent backend override: `"claude"` or `"acp:<name>"` |
| `--jsonl` | `false` | Output JSONL format |
| `--all` | `false` | Run all ready tasks |
| `--include-standalone` | `false` | Include tasks without parent epic |
| `--include-orphans` | `false` | Include orphaned tasks |

---

## 8. Manual Verification Steps

Use these steps to verify Tickflow behaviour manually.

### 8.1 Verify Config Loading

```bash
# 1. Check current config
cat .tick/config.json | python3 -m json.tool

# 2. Verify config is valid (tk run will fail fast on bad config)
tk run --auto 2>&1 | head -5
# Should show "No ready epics" or start running, NOT a config parse error

# 3. Test invalid config detection
echo '{"version": 99}' > /tmp/bad-config.json
# Engine rejects unknown versions with clear error messages
```

### 8.2 Verify Wrap-Up Steps

```bash
# 1. Check config.yaml exists and parses
cat .tick/config.yaml

# 2. Create a test epic and complete it
tk create "Test wrap-up" -t epic
EPIC=$(tk list -t epic --json | jq -r '.[0].id')
tk create "Test task" --parent $EPIC
TASK=$(tk list --parent $EPIC --json | jq -r '.[0].id')
tk close $TASK --reason "test"

# 3. Run — wrap-up steps will execute on completion
tk run $EPIC
# Expected: Build, Vet, Tests steps execute and results are printed
```

### 8.3 Verify Resume Flow

```bash
# 1. Create an epic with multiple tasks
tk create "Resume test" -t epic
EPIC=$(tk list -t epic --json | jq -r '.[0].id')
tk create "Task A" --parent $EPIC
tk create "Task B" --parent $EPIC --blocked-by $(tk list --parent $EPIC --json | jq -r '.[0].id')

# 2. Run with low iteration limit (will stop early)
tk run $EPIC --max-iterations 1

# 3. Verify worktree was preserved
# Output should show: "Worktree preserved at /path/..."

# 4. Resume
tk run $EPIC
# Should reuse existing worktree and skip completed tasks
```

### 8.4 Verify Watch Mode

```bash
# Terminal 1: Start watch mode
tk run $EPIC --watch --poll 5s

# Terminal 2: When engine is idle (awaiting human), approve a task
tk approve <task-id>
# Watch mode should detect the change and resume execution
```

### 8.5 Verify Log Cleanup

```bash
# Check what would be cleaned
tk gc --dry-run

# Clean with custom retention
tk gc --max-age 7d

# Verify live files are never deleted
ls .tick/logs/records/*.live.json 2>/dev/null
```

### 8.6 Verify Policy Enforcement

```bash
# 1. Set a strict policy
cat .tick/config.json | python3 -c "
import json, sys
cfg = json.load(sys.stdin)
cfg['policy'] = {'max_attempts': 1, 'require_commit': True}
json.dump(cfg, sys.stdout, indent=2)
" > /tmp/cfg.json && cp /tmp/cfg.json .tick/config.json

# 2. Run — tasks should be marked stuck after 1 failed attempt
tk run $EPIC
# Expected: After one attempt without a commit, task is set to awaiting work

# 3. Restore default policy
cat .tick/config.json | python3 -c "
import json, sys
cfg = json.load(sys.stdin)
cfg.pop('policy', None)
json.dump(cfg, sys.stdout, indent=2)
" > /tmp/cfg.json && cp /tmp/cfg.json .tick/config.json
```

### 8.7 Verify Run Records

```bash
# During a run, check live records
ls -la .tick/logs/records/

# Read a live record
cat .tick/logs/records/*.live.json 2>/dev/null | python3 -m json.tool

# After completion, check final records
cat .tick/logs/records/*.json 2>/dev/null | python3 -m json.tool | head -30

# Check epic status
cat .tick/logs/records/_epic-*.status.json 2>/dev/null | python3 -m json.tool
```

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `tk run` says "not in a git repository" | Not in a repo or `.tick/` missing | Run `tk init` |
| `tk run` says "'xyz' is a task, not an epic" | Passed a task ID instead of epic ID | Use the parent epic ID (shown in error) |
| Worktree preserved but tasks are stuck | Policy limits reached | Check `tk list --parent <epic>` for awaiting tasks; `tk approve` or adjust policy |
| Agent not found | CLI not on PATH | Install Claude CLI or configure ACP agent in config |
| Config parse error | Invalid JSON in config.json | Validate with `python3 -m json.tool < .tick/config.json` |
| Stale in-progress tasks | Previous run crashed | Re-run `tk run` (single worker) or use `--stale-timeout` (pool mode) |
| Live records piling up | Runs crashing before finalization | `tk gc` or manually delete `.tick/logs/records/*.live.json` |

---

## 10. Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        tk run <epic>                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Load config.json (agent, policy, context, verification)      │
│  2. Create/reuse worktree                                        │
│  3. Generate epic context (if multi-task epic)                   │
│  4. Wave loop:                                                    │
│     a. Compute waves from dependency graph (Kahn's algorithm)    │
│     b. Execute first wave (parallel tasks via wave.Runner)       │
│     c. Process results: signals, policy checks, close tasks      │
│     d. Update budget tracker                                     │
│     e. Re-compute waves → repeat                                 │
│  5. Exit: merge (if complete) or preserve worktree (if partial)  │
│  6. Wrap-up: shell steps (config.yaml) + agent steps (wrapup.md)│
└─────────────────────────────────────────────────────────────────┘
          │                          │
          ▼                          ▼
   ┌──────────────┐          ┌──────────────┐
   │  .tick/issues │          │ .tick/logs/   │
   │  (state)      │          │ (runtime)     │
   └──────────────┘          └──────────────┘
```
