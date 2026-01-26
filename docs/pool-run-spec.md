# Pool Run Specification

A Go-coordinated pool of parallel agents working on tasks within a single epic.

## Overview

Pool mode enables N concurrent Claude agents to work on independent tasks from the same epic. Tasks are claimed atomically using the `in_progress` status, with stale claim detection via a new `started_at` timestamp field.

## Motivation

Current execution modes:
- **Ralph (default)**: Sequential - one task at a time within an epic
- **Parallel**: Concurrent epics, each in its own worktree
- **Swarm**: Claude orchestrator spawns subagents via Task tool

Pool mode fills the gap: parallel task execution within a single epic, coordinated by Go for better control and debugging.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| File conflicts | Trust the graph | User ensures wave tasks don't conflict |
| Coordination | Go-level pool | Better control, debugging, metrics |
| Stale timeout | 1 hour default | Configurable via `--stale-timeout` |
| Claiming | `in_progress` + `started_at` | Existing status, new timestamp for aging |

## Schema Change

Add `started_at` to `schemas/tick.schema.json`:

```json
"started_at": {
  "type": "string",
  "format": "date-time",
  "description": "ISO timestamp when the tick entered in_progress status"
}
```

Lifecycle:
- `open` → `in_progress`: set `started_at = now()`
- `in_progress` → `closed`: set `closed_at = now()`, clear `started_at = nil`
- `in_progress` → `open` (release/timeout): clear `started_at = nil`

## CLI Interface

```bash
# Single epic with 4 parallel workers
tk run <epic> --pool 4

# Override stale timeout (default 1h)
tk run <epic> --pool 4 --stale-timeout 2h

# Combined: 2 epics in worktrees, 4 workers each
tk run epic1 epic2 --parallel 2 --pool 4
```

## Architecture

```
tk run abc --pool 4
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                   RunPool(epicID, 4)                    │
├─────────────────────────────────────────────────────────┤
│  1. Stale recovery: reset abandoned in_progress → open  │
│  2. Spawn 4 worker goroutines                           │
│  3. Wait for all workers, aggregate metrics             │
└─────────────────────────────────────────────────────────┘
         │
         ├──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Worker 1│ │Worker 2│ │Worker 3│ │Worker 4│
    └────────┘ └────────┘ └────────┘ └────────┘
         │
         ▼
    Worker Loop:
    ┌─────────────────────────────────────┐
    │ 1. Lock                             │
    │ 2. Find open + unblocked task       │
    │ 3. Set status=in_progress           │
    │ 4. Set started_at=now()             │
    │ 5. Unlock                           │
    │ 6. Build prompt, run Claude         │
    │ 7. On success: close task           │
    │    On failure: reset to open        │
    │ 8. Repeat until no tasks            │
    └─────────────────────────────────────┘
```

## Package Structure

```
internal/pool/
├── runner.go     # RunPool(epicID, n, cfg) - main coordinator
├── worker.go     # Worker struct and loop
├── claim.go      # Atomic claiming: open → in_progress
└── stale.go      # Recovery: reset stale in_progress → open
```

### runner.go

```go
type Config struct {
    PoolSize     int
    StaleTimeout time.Duration  // default 1h
    EpicID       string
    // ... agent config, budget, etc.
}

type Result struct {
    TasksCompleted int
    TasksFailed    int
    TotalCost      float64
    TotalTokens    int
    Duration       time.Duration
    WorkerResults  []WorkerResult
}

func RunPool(ctx context.Context, cfg Config) (*Result, error) {
    // 1. Stale recovery
    RecoverStaleTasks(cfg.EpicID, cfg.StaleTimeout)

    // 2. Spawn workers
    var wg sync.WaitGroup
    results := make(chan WorkerResult, cfg.PoolSize)

    for i := 0; i < cfg.PoolSize; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()
            w := NewWorker(workerID, cfg)
            results <- w.Run(ctx)
        }(i)
    }

    // 3. Wait and aggregate
    wg.Wait()
    close(results)
    return aggregateResults(results), nil
}
```

### worker.go

```go
type Worker struct {
    ID     int
    Config Config
    Agent  agent.Agent
}

type WorkerResult struct {
    WorkerID       int
    TasksCompleted int
    TasksFailed    int
    Cost           float64
    Tokens         int
}

func (w *Worker) Run(ctx context.Context) WorkerResult {
    result := WorkerResult{WorkerID: w.ID}

    for {
        // Claim next available task
        task, err := ClaimTask(ctx, w.Config.EpicID)
        if err == ErrNoTasksAvailable {
            // Check if all tasks are done or just temporarily blocked
            if AllTasksComplete(w.Config.EpicID) {
                return result
            }
            // Wait and retry - other workers may complete blocking tasks
            time.Sleep(5 * time.Second)
            continue
        }

        // Build prompt and run
        prompt := buildPrompt(task)
        runResult, err := w.Agent.Run(ctx, prompt)

        if err != nil || !runResult.Success {
            ReleaseTask(task.ID)  // Reset to open
            result.TasksFailed++
        } else {
            CloseTask(task.ID, runResult)
            result.TasksCompleted++
        }

        result.Cost += runResult.Cost
        result.Tokens += runResult.Tokens
    }
}
```

### claim.go

```go
var claimMu sync.Mutex

var ErrNoTasksAvailable = errors.New("no tasks available")

// ClaimTask atomically claims the next available task.
// Returns ErrNoTasksAvailable if no open unblocked tasks exist.
func ClaimTask(ctx context.Context, epicID string) (*tick.Tick, error) {
    claimMu.Lock()
    defer claimMu.Unlock()

    // Get all open tasks for epic
    tasks, err := listOpenTasks(epicID)
    if err != nil {
        return nil, err
    }

    // Find first unblocked task
    for _, t := range tasks {
        if isBlocked(t) {
            continue
        }
        if t.IsAwaitingHuman() {
            continue
        }

        // Claim it
        now := time.Now()
        t.Status = tick.StatusInProgress
        t.StartedAt = &now
        t.UpdatedAt = now

        if err := saveTask(t); err != nil {
            return nil, err
        }

        logActivity(t.ID, "start", epicID)
        return t, nil
    }

    return nil, ErrNoTasksAvailable
}

// ReleaseTask resets a task back to open (on failure or timeout).
func ReleaseTask(taskID string) error {
    claimMu.Lock()
    defer claimMu.Unlock()

    t, err := loadTask(taskID)
    if err != nil {
        return err
    }

    t.Status = tick.StatusOpen
    t.StartedAt = nil
    t.UpdatedAt = time.Now()

    return saveTask(t)
}
```

### stale.go

```go
// RecoverStaleTasks resets in_progress tasks older than timeout back to open.
func RecoverStaleTasks(epicID string, timeout time.Duration) (int, error) {
    tasks, err := listInProgressTasks(epicID)
    if err != nil {
        return 0, err
    }

    recovered := 0
    for _, t := range tasks {
        if t.StartedAt == nil {
            continue
        }
        if time.Since(*t.StartedAt) > timeout {
            if err := ReleaseTask(t.ID); err != nil {
                log.Printf("failed to recover stale task %s: %v", t.ID, err)
                continue
            }
            logActivity(t.ID, "stale_recovery", epicID)
            recovered++
        }
    }

    return recovered, nil
}
```

## Activity Log

New actions:

| Action | Description |
|--------|-------------|
| `start` | Task claimed by pool worker |
| `stale_recovery` | Task reset after stale timeout |

Example:
```json
{"ts":"2026-01-26T10:00:00Z","tick":"abc","action":"start","actor":"pool-worker-2","epic":"xyz"}
{"ts":"2026-01-26T11:30:00Z","tick":"abc","action":"stale_recovery","actor":"pool","epic":"xyz"}
```

## Tick Board Enhancements

### 1. Display `started_at` in Detail Drawer

Show when task entered `in_progress`:

```
Status: In Progress
Started: 12 minutes ago (10:48 AM)
```

### 2. Time in Progress Indicator

Show elapsed time on cards in the "Agent" column:

```
┌─────────────────────────────┐
│ [P2] Implement auth flow    │
│ ⏱ Working for 8m            │
└─────────────────────────────┘
```

Update in real-time (every 30s or via WebSocket).

### UI Component Changes

**tick-card.ts:**
```typescript
// Add time-in-progress display for in_progress tasks
private renderTimeInProgress() {
  if (this.tick.status !== 'in_progress' || !this.tick.started_at) {
    return nothing;
  }

  const elapsed = formatDistanceToNow(new Date(this.tick.started_at));
  return html`<span class="time-in-progress">⏱ ${elapsed}</span>`;
}
```

**tick-detail-drawer.ts:**
```typescript
// Add started_at to status section
private renderStatus() {
  // ... existing status display ...

  if (this.tick.status === 'in_progress' && this.tick.started_at) {
    const started = new Date(this.tick.started_at);
    return html`
      <div class="status-detail">
        <span class="label">Started:</span>
        <span class="value">${formatDistanceToNow(started)} ago</span>
        <span class="timestamp">(${format(started, 'h:mm a')})</span>
      </div>
    `;
  }
}
```

## Integration with Parallel Mode

When `--parallel` and `--pool` are combined:

```bash
tk run epic1 epic2 --parallel 2 --pool 4
```

```
┌─────────────────────────────────────────────────────┐
│                  Parallel Runner                     │
│  Creates worktree per epic (existing behavior)       │
└─────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
   ┌──────────────┐           ┌──────────────┐
   │  Worktree 1  │           │  Worktree 2  │
   │   (epic1)    │           │   (epic2)    │
   └──────────────┘           └──────────────┘
         │                           │
         ▼                           ▼
   ┌──────────────┐           ┌──────────────┐
   │  RunPool(4)  │           │  RunPool(4)  │
   │  4 workers   │           │  4 workers   │
   └──────────────┘           └──────────────┘
```

Each epic's pool operates independently within its worktree.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Worker crashes mid-task | Task stays `in_progress`, recovered after stale timeout |
| Claude returns error | Task released back to `open`, can be retried |
| All workers blocked | Workers poll every 5s until tasks become available |
| Ctrl+C | Graceful shutdown, in_progress tasks recovered on next run |
| Budget exhausted | Workers stop claiming, aggregate partial results |

## Metrics

Pool run reports:
- Total tasks completed / failed
- Per-worker breakdown
- Aggregate cost and tokens
- Wall-clock duration
- Parallelism efficiency (tasks/worker)

## Future Considerations

Not in scope but possible enhancements:

- **Wave sync mode**: `--wave-sync` to enforce sequential waves
- **Visual stale warning**: Amber indicator for tasks approaching timeout
- **Pool status panel**: Live dashboard of worker activity
- **Dynamic pool sizing**: Add/remove workers based on available tasks

---

*Specification created January 2026*
