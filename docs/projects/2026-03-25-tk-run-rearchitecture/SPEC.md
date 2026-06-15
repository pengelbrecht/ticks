# tk run Rearchitecture Specification

> **Archived / superseded.** This spec proposed rearchitecting the standalone `tk run` runner; that runner was subsequently removed entirely rather than rearchitected. Orchestration is now harness-driven and runner-neutral (Claude Code and Codex), with `.tick/` + git as the durable coordination layer. Retained as a historical record. See [`skills/ticks/references/agent-runner.md`](../../../skills/ticks/references/agent-runner.md) for the current contract.

**Created:** 2026-03-25
**Status:** Draft

## Problem

`tk run` has accumulated three execution modes (pool, ralph, swarm), optional worktree support, parallel epic orchestration, and ~10,200 LOC across 7+ packages. Much of this complexity exists to orchestrate parallelism that Claude Code can now handle natively, or that belongs outside `tk` entirely (multi-epic orchestration). The result is hard to reason about, has conflicting worktree lifecycle ownership with Claude, and lacks a post-run review workflow.

### Specific issues

1. **Three execution modes** (`--pool`, `--ralph`, `--swarm`) with overlapping concerns and different tradeoffs that users must choose between.
2. **Optional worktree** adds conditional branching throughout the codebase (`if runWorktree`, `WorkDir` vs `WorktreeName` fallback paths).
3. **`--worktree` flag conflict** — tk pre-creates worktrees, then passes `--worktree` to Claude which tries to create them again. Two systems fighting over lifecycle ownership.
4. **No post-run review** — after a run completes, changes sit uncommitted with no automated review, testing, or PR creation.
5. **Multi-epic orchestration in Go** — `internal/parallel/` adds 350 LOC for something the user can do with multiple terminal tabs.
6. **No dedicated branch** — without `--worktree`, runs happen in the user's working tree with no isolation.

## Goals

1. **Single execution mode** — one way to run, no mode flags.
2. **Always-worktree** — every run gets a dedicated branch and worktree. No conditional paths.
3. **Clean worktree ownership** — tk owns the full lifecycle; Claude runs in the directory without knowing it's a worktree.
4. **Wave-based parallelism** — Go orchestrates waves from the dependency graph, spawning parallel Claude agents per wave.
5. **Post-run wrap-up phase** — configurable review tasks (test, lint, diff review, draft PR).
6. **Single-epic scope** — `tk run` runs one epic. Multi-epic parallelism is the caller's responsibility.
7. **Significant LOC reduction** — target ~4,000 LOC from ~10,200.

## Non-goals

- Multi-epic orchestration within `tk run`.
- Replacing the tick data model or board UI.
- Changing the signal/approval workflow (it works well as-is).

## Architecture

### Three-phase run

```
tk run <epic-id> [flags]

Phase 1: Setup
  Create worktree + branch
  Symlink .tick/ from main repo
  Compute wave graph

Phase 2: Implementation
  For each wave:
    Spawn N Claude agents (one per task)
    Stream output -> per-task .live.json
    Parse signals, park awaiting tasks
    Wait for wave completion
  Between waves:
    Re-compute waves (approvals may have unblocked tasks)
    If watch mode: fsnotify wait for human verdicts

Phase 3: Wrap-up
  Run configured review steps
  Generate run report
  Merge worktree branch (or preserve on failure)
  Clean up worktree
```

### Phase 1: Setup

Always creates a worktree. No `--worktree` flag; it's the only path.

```go
func setup(epicID string) (*Worktree, []Wave, error) {
    wtManager := worktree.NewManager(repoRoot)
    wt, err := wtManager.Create(epicID)
    // Branch: worktree-tk-<epic-id>
    // Path:   .claude/worktrees/tk-<epic-id>/
    // .tick/  symlinked from main repo

    waves := computeWaves(epicID) // Kahn's algorithm on dependency graph
    return wt, waves, nil
}
```

### Phase 2: Implementation

Go is the orchestrator. Claude agents are workers.

```go
func implement(ctx context.Context, wt *Worktree, waves []Wave) {
    for {
        waves = computeWaves(epicID) // Re-compute each iteration
        if len(waves) == 0 { break }

        currentWave := waves[0] // Only run the first ready wave
        results := runWave(ctx, currentWave, wt)

        for _, r := range results {
            handleSignals(r)     // Park tasks with APPROVAL_NEEDED etc.
            budget.Update(r)     // Track cost/tokens
        }

        if budget.Exceeded() { break }

        // If tasks remain but all awaiting human:
        if allAwaitingHuman() {
            if watchMode {
                waitForFileChange(".tick/issues/") // fsnotify
            } else {
                break
            }
        }
    }
}

func runWave(ctx context.Context, wave Wave, wt *Worktree) []TaskResult {
    var wg sync.WaitGroup
    results := make([]TaskResult, len(wave.Tasks))

    for i, task := range wave.Tasks {
        wg.Add(1)
        go func(i int, task Task) {
            defer wg.Done()
            results[i] = agent.Run(buildPrompt(task), RunOpts{
                WorkDir: wt.Path,
                StateCallback: func(snap AgentStateSnapshot) {
                    runrecord.WriteLive(task.ID, snap)
                },
                Timeout: taskTimeout,
            })
        }(i, task)
    }

    wg.Wait()
    return results
}
```

#### Wave computation

Re-uses the existing `tk graph` logic (Kahn's algorithm):

1. Filter to open, non-awaiting tasks in the epic.
2. Build in-degree map from `BlockedBy` relationships.
3. Group tasks with in-degree 0 into a wave.
4. Return waves in order.

Only the first wave is executed per iteration. After execution, waves are re-computed because completed tasks may unblock the next wave, and approved tasks may re-enter the graph.

#### Signal handling

Unchanged from current implementation:

1. Agent emits `<promise>SIGNAL_TYPE: context</promise>`.
2. Go parses signal from stream output.
3. `SetAwaiting(taskID, awaitingType)` parks the task.
4. Task excluded from `NextTask()` / wave computation.
5. Human runs `tk approve <id>` or `tk reject <id> "feedback"`.
6. `ProcessVerdict()` transitions task state.
7. Next wave computation picks up the unblocked task.
8. New Claude agent receives human feedback via `GetHumanNotes()`.

#### Board live updates

Each agent gets a `StateCallback` that writes `<task-id>.live.json`. The board server's existing file watcher detects changes and broadcasts SSE events. This is exactly how ralph mode works today — extended to multiple concurrent agents per wave.

Per-task data available to the board:
- Streaming output text
- Thinking/reasoning blocks
- Active tool (name, input, output)
- Tool history
- Metrics (tokens, cost, duration)
- Status (starting, thinking, writing, tool_use, complete, error)

### Phase 3: Wrap-up

New phase. Runs after implementation completes (all tasks closed or budget exceeded).

```go
func wrapUp(wt *Worktree, epicID string) error {
    // 1. Run configured review steps
    for _, step := range config.WrapUp {
        runReviewStep(step, wt.Path)
    }

    // 2. Generate run report
    report := generateReport(epicID, wt)

    // 3. Merge or preserve
    if allTasksClosed(epicID) {
        mergeResult := mergeManager.Merge(wt, MergeOptions{})
        if mergeResult.Success {
            wtManager.Remove(epicID)
        }
        // Optionally create draft PR
        if config.AutoPR {
            createDraftPR(wt.Branch, report)
        }
    } else {
        // Preserve worktree for resumption
        fmt.Printf("Worktree preserved at: %s\n", wt.Path)
    }
}
```

#### Configurable review steps

Review steps are defined in `.tick/config.yaml` (or epic-level config):

```yaml
wrap_up:
  # Shell commands run in the worktree
  - run: "pnpm test"
    name: "Tests"
    continue_on_failure: true

  - run: "pnpm lint"
    name: "Lint"
    continue_on_failure: true

  # Claude reviews the full diff
  - review: true
    prompt: "Review the diff for correctness, security issues, and style"

  # Auto-create draft PR
  - pr: draft
```

If no config exists, wrap-up defaults to: commit all changes, print summary.

#### Run report

Generated automatically, used as PR body if `pr: draft` is configured:

```markdown
## Run Report: <epic-title>

### Tasks completed
- [x] <task-1-title> (cost: $0.12, 3.2k tokens)
- [x] <task-2-title> (cost: $0.08, 2.1k tokens)
- [ ] <task-3-title> (awaiting: approval)

### Files changed
- src/foo.go (+45, -12)
- src/bar.go (+20, -3)

### Metrics
- Total cost: $0.20
- Total tokens: 5,300
- Duration: 4m 32s
- Waves: 3
```

## Worktree ownership

### Principle

tk owns the full worktree lifecycle. Claude runs in the worktree directory without knowing it's a worktree.

### What changes from current implementation

**Revert `--worktree` flag adoption** (from commit `a86e376`):

| Before (current) | After |
|---|---|
| `RunOpts.WorktreeName` + `RunOpts.RepoRoot` | `RunOpts.WorkDir` only |
| `supportsNativeWorktree()` detection | Removed |
| `--worktree tk-<id>` passed to Claude CLI | Not passed |
| `cmd.Dir = opts.RepoRoot` (Claude enters worktree) | `cmd.Dir = opts.WorkDir` (tk sets cwd to worktree) |

**Keep from `a86e376`**:
- Path convention: `.claude/worktrees/tk-<epic-id>/`
- Branch convention: `worktree-tk-<epic-id>`
- `Name()`, `Branch()`, `Path()` helpers
- `WorktreeNamePrefix` (`tk-`) namespace isolation
- `isWorktreeContainerDir()` for dirty-check filtering
- Legacy `.worktrees/` path in dirty-check filter

**Agent invocation simplifies to**:

```go
args := []string{
    "--dangerously-skip-permissions",
    "--print",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--no-session-persistence",
    prompt,
}
cmd := exec.CommandContext(ctx, "claude", args...)
cmd.Dir = opts.WorkDir // Always the worktree path
```

### Worktree lifecycle

```
Create (tk)
  git worktree add .claude/worktrees/tk-<id> -b worktree-tk-<id>
  symlink .tick/ from main repo
  write .tk-metadata (parentBranch, createdAt)

Run agents (tk spawns Claude processes)
  cmd.Dir = worktree path
  Claude operates in the directory, unaware it's a worktree

Merge (tk, on success)
  git merge worktree-tk-<id> --no-ff (from parent branch)

Cleanup (tk, after successful merge)
  git worktree remove .claude/worktrees/tk-<id> --force
  git branch -D worktree-tk-<id>

Preserve (on interruption/awaiting/budget)
  Worktree left intact for resumption
```

### Resume support

When `tk run <epic-id>` is invoked and a worktree already exists for that epic:

1. Detect existing worktree via `wtManager.Get(epicID)`.
2. Re-use it (don't create a new one).
3. Re-compute waves from current task state.
4. Continue execution.

The branch is the checkpoint. No separate checkpoint system needed.

## What gets deleted

| Package | LOC | Reason |
|---|---|---|
| `internal/pool/` | ~600 | Replaced by wave-based spawning in the engine |
| `internal/swarm/` | ~200 | Go does the orchestration, not Claude |
| `internal/parallel/` | ~350 | Multi-epic is external to tk |
| `internal/checkpoint/` | ~150 | Branch is the checkpoint |
| `internal/verify/` | ~700 | Moves to Phase 3 wrap-up |
| `internal/taskrunner/` | ~150 | No longer needed (pool adapter) |
| Engine conditional paths | ~700 | No mode branching, no optional worktree |

**Total removed:** ~2,850 LOC of package code + ~700 LOC of conditional paths in engine/run.go

## What gets simplified

| Package | Before | After |
|---|---|---|
| `internal/engine/` | 1,540 LOC, ralph iteration loop, mode dispatch | ~600 LOC, wave loop |
| `internal/agent/` | 1,471 LOC, WorkDir/WorktreeName/RepoRoot, native detection | ~1,200 LOC, WorkDir only |
| `cmd/tk/cmd/run.go` | ~600 LOC, mode flags, parallel dispatch | ~300 LOC, single path |

## What gets added

| Component | LOC (est.) | Purpose |
|---|---|---|
| Wave runner | ~200 | Spawn parallel agents per wave, collect results |
| Wrap-up phase | ~300 | Review steps, report generation, PR creation |
| Wrap-up config | ~100 | Parse `.tick/config.yaml` wrap-up section |

## CLI changes

### Flags removed

| Flag | Reason |
|---|---|
| `--worktree` | Always on |
| `--pool [N\|auto]` | Single mode |
| `--ralph` | Single mode |
| `--swarm` | Single mode |
| `--parallel N` | Multi-epic is external |
| `--checkpoint-interval` | Branch is the checkpoint |
| `--skip-dep-analysis` | No file-level conflict detection (waves handle ordering) |
| `--stale-timeout` | No pool workers to go stale |

### Flags kept

| Flag | Purpose |
|---|---|
| `--max-iterations` | Budget: cap iterations |
| `--max-cost` | Budget: cap USD |
| `--timeout` | Budget: per-task timeout |
| `--max-task-retries` | Retry failed tasks |
| `--watch` | Watch mode: wait for human verdicts, re-run |
| `--auto` | Auto-select next ready epic |
| `--board` | Start board UI |
| `--cloud` | Cloud sync |
| `--port` | Board server port |
| `--skip-verify` | Skip wrap-up review steps |
| `--jsonl` | JSONL output |
| `--skip-wrap-up` | Skip Phase 3 entirely |

### New flags

| Flag | Purpose |
|---|---|
| `--skip-wrap-up` | Skip Phase 3 |
| `--no-merge` | Don't merge on completion (leave branch for manual review) |
| `--pr` | Create draft PR after successful run |

### Usage examples

```bash
# Run a single epic (always in worktree)
tk run abc123

# Run with board UI
tk run abc123 --board

# Run, skip wrap-up, don't merge (just leave the branch)
tk run abc123 --skip-wrap-up --no-merge

# Run with auto draft PR
tk run abc123 --pr

# Watch mode: grind through tasks, wait for approvals
tk run abc123 --watch

# Multi-epic: user's responsibility
tk run epic1 &
tk run epic2 &
wait
```

## Multi-epic parallelism (external)

With always-worktree, each `tk run` is fully isolated. Users can run multiple epics in parallel:

```bash
# Simple: background processes
tk run epic1 &
tk run epic2 &
tk run epic3 &
wait

# With board: all runs share the same .tick/ via symlink
# Board shows all tasks across all runs
tk run epic1 --board &
tk run epic2 &
tk run epic3 &
```

Each run gets its own worktree and branch. The shared `.tick/` symlink means all runs see the same task state, and the board shows everything.

Conflicts between epics modifying the same files are resolved at merge time, not during execution. This is simpler and more predictable than the current file-prediction-based dependency injection.

## Migration

### Breaking changes

1. `--pool`, `--ralph`, `--swarm`, `--parallel` flags removed.
2. `--worktree` flag removed (always on).
3. `--checkpoint-interval` flag removed.
4. Multi-epic arguments (`tk run epic1 epic2`) no longer supported. Use multiple `tk run` invocations.

### Data compatibility

- `.tick/` format unchanged.
- Existing worktrees at `.claude/worktrees/` are compatible (resume works).
- Old worktrees at `.worktrees/` (pre-migration) are not detected. Users should clean up manually.

## Implementation order

1. **Revert `--worktree` flag in agent** — drop `WorktreeName`, `RepoRoot`, `supportsNativeWorktree()`. Use `WorkDir` only.
2. **New wave runner** — extract wave computation from `tk graph`, implement `runWave()` with parallel agent spawning.
3. **Simplify engine** — replace ralph loop + pool dispatch with wave loop. Remove mode branching.
4. **Always-worktree in `run.go`** — remove `--worktree` flag, always create worktree. Remove `--pool`, `--ralph`, `--swarm`, `--parallel` flags.
5. **Delete packages** — `internal/pool/`, `internal/swarm/`, `internal/parallel/`, `internal/checkpoint/`, `internal/verify/`, `internal/taskrunner/`.
6. **Add wrap-up phase** — review steps, report generation, merge-or-preserve logic.
7. **Add `--pr` flag** — draft PR creation with run report.
8. **Update tests** — remove mode-specific tests, add wave runner tests.
