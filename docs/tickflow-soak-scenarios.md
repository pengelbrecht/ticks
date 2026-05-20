# Tickflow Soak Test Scenarios & Success Criteria

> Soak tests validate Tickflow's reliability, correctness, and resource hygiene
> under sustained, realistic workloads. Each scenario targets a specific failure
> mode that unit and integration tests cannot catch because the bug only
> manifests over time, across many iterations, or under concurrent pressure.

---

## 1. Overview

| Property | Value |
|----------|-------|
| Minimum soak duration | 4 hours (per scenario) |
| Long soak duration | 24 hours (stability gate) |
| Test repo | Synthetic Go project with 3–5 packages, ~500 LOC |
| Agent backend | `acp` with a stub agent that completes/fails deterministically |
| Metrics collection | JSONL log scraped every 30 s by a metrics harness |
| Pass gate | All success criteria for a scenario must hold **continuously** |

### Stub Agent Modes

The stub agent (`acp:stub`) supports deterministic control via task labels:

| Label | Stub behaviour |
|-------|----------------|
| `stub:pass` | Emit `COMPLETE` after 2–5 s (random) |
| `stub:fail` | Exit non-zero after 1–3 s |
| `stub:slow` | Emit `COMPLETE` after 30–60 s |
| `stub:hang` | Never exit (tests stale-lease recovery) |
| `stub:flaky` | 50 % chance of pass or fail per attempt |
| `stub:signal:<SIG>` | Emit the given signal (e.g., `stub:signal:INPUT_NEEDED`) |
| `stub:crash` | SIGKILL self after 1–3 s (simulates hard crash) |
| `stub:oom` | Allocate until OOM-killed (tests resource limits) |
| (none) | Default: `stub:pass` |

---

## 2. Scenarios

### S1 — Sequential Epic Marathon

**Goal:** Verify that the engine can run many sequential epics back-to-back
without leaking goroutines, file descriptors, or worktrees.

**Setup:**
- 20 epics, each with 5 tasks (all `stub:pass`), no dependencies.
- `--max-iterations 200` per run.
- Run epics one at a time via a driver script that calls `tk run <epic>`.

**Procedure:**
1. Generate 20 epics and populate tasks.
2. Loop: `for epic in epics; do tk run $epic; done`.
3. After each epic, record: PID RSS, open FD count, worktree count, goroutine
   count (via `/debug/pprof/goroutine` if http debug enabled), and disk usage
   under `.tick/logs/`.

**Success Criteria:**

| Metric | Criterion |
|--------|-----------|
| All 100 tasks closed | `tk list --status closed --all \| wc -l` = 100 |
| All 20 epics completed | No worktrees remaining in `.tickflow-worktrees/` |
| RSS growth | < 20 % increase from epic 1 to epic 20 |
| Open FDs | Peak ≤ baseline + 50; returns to baseline ±5 between epics |
| Goroutines | Returns to baseline ±2 between epics |
| Log disk usage | `.tick/logs/` < 50 MB total |
| No zombie processes | `ps aux \| grep defunct` = 0 at end |
| Exit codes | All `tk run` invocations exit 0 |

---

### S2 — Pool Mode Under Sustained Load

**Goal:** Validate that pool-mode workers correctly claim, execute, and release
tasks without deadlocks, starvation, or double-claims over a long run.

**Setup:**
- 1 epic with 50 tasks across 5 waves (10 tasks per wave, dependency chain).
- `--pool 4 --stale-timeout 10m`.
- Mix of labels: 40 × `stub:pass`, 5 × `stub:slow`, 5 × `stub:flaky`.

**Procedure:**
1. Create epic and all 50 tasks with dependency graph.
2. `tk run <epic> --pool 4 --stale-timeout 10m`.
3. Monitor activity log, run records, and process tree.

**Success Criteria:**

| Metric | Criterion |
|--------|-----------|
| All 50 tasks reach `closed` | No tasks left `in_progress` or `open` |
| No double-claims | Activity log: each task has exactly 1 `start` event (unless retried after failure) |
| No starvation | All 4 workers claim ≥ 8 tasks |
| Flaky tasks retried | Each flaky task attempted ≤ `max_attempts` times |
| Wave ordering respected | No task executed before all its `blocked_by` tasks are `closed` |
| Claim mutex correctness | No two `start` events for same task with overlapping time windows |
| Pool termination clean | All 4 workers exit; goroutine count returns to baseline |
| Wall-clock efficiency | Total wall time < 2× theoretical sequential time / pool_size |

---

### S3 — Crash Recovery & Resume Resilience

**Goal:** Ensure that `tk run` can be interrupted at any point and resume
correctly, with no data loss or duplicate work.

**Setup:**
- 1 epic, 12 tasks, 3 waves of 4.
- Labels: all `stub:pass` (but each takes 5–10 s to allow interruption).
- Driver script sends SIGINT to `tk run` at random intervals (every 10–30 s).

**Procedure:**
1. Create epic and tasks.
2. Run loop:
   ```bash
   while ! all_tasks_closed; do
     tk run $EPIC --max-iterations 10 &
     PID=$!
     sleep $(( RANDOM % 20 + 10 ))
     kill -INT $PID 2>/dev/null
     wait $PID
   done
   ```
3. Count total resumes until all tasks are closed.

**Success Criteria:**

| Metric | Criterion |
|--------|-----------|
| All 12 tasks eventually closed | `tk list --parent $EPIC --status closed \| wc -l` = 12 |
| No data corruption | All `.tick/issues/*.json` are valid JSON (validated with `jq .`) |
| No duplicate work | Each task closed exactly once (1 `close` event in activity log) |
| Worktree preserved on interrupt | After each SIGINT, worktree directory exists |
| Worktree merged on completion | After final run, worktree is removed |
| Interruption notes written | Tasks interrupted mid-run have engine notes appended |
| Resumes ≤ 15 | Completes within 15 interrupt/resume cycles |
| No orphaned child processes | `pgrep -P <dead-pid>` returns nothing after each interrupt |

---

### S4 — Watch Mode Long-Running Idle/Wake Cycles

**Goal:** Verify that watch mode correctly idles, detects changes, and resumes
without accumulating resources during idle periods.

**Setup:**
- 1 epic, 6 tasks. Task 1–3 are `stub:pass`; tasks 4–6 have `--requires approval`.
- `tk run <epic> --watch --poll 5s --timeout 2h`.

**Procedure:**
1. Start watch mode.
2. Wait for tasks 1–3 to complete (engine enters idle state).
3. Wait 10 minutes (idle soak).
4. Approve task 4 → engine wakes and executes.
5. Wait 10 minutes (idle soak).
6. Approve tasks 5 and 6 simultaneously → engine wakes.
7. Wait for completion.

**Success Criteria:**

| Metric | Criterion |
|--------|-----------|
| Tasks 1–3 auto-completed | Closed before idle |
| Engine idles cleanly | CPU < 1 % during idle periods (no busy-wait) |
| RSS during idle | No growth (±1 MB) over 10-minute idle windows |
| Goroutines during idle | Stable count (±1) |
| Approval triggers wake | Tasks 4–6 start within 2 × poll interval of approval |
| All 6 tasks closed | Epic completes successfully |
| Total agent cost during idle | $0.00 (no tokens consumed while waiting) |
| File-watch descriptors | ≤ 10 inotify/kqueue watches |

---

### S5 — Policy Escalation & Stuck Task Handling

**Goal:** Validate that policy limits correctly escalate tasks and that the
engine does not spin forever on failing tasks.

**Setup:**
- 1 epic, 10 tasks.
- Policy: `max_attempts: 3`, `max_no_progress_attempts: 2`,
  `max_same_verifier_failures: 2`.
- Labels: 4 × `stub:pass`, 3 × `stub:fail`, 2 × `stub:flaky`, 1 × `stub:signal:ESCALATE`.

**Procedure:**
1. Configure strict policy in `.tick/config.json`.
2. `tk run <epic>`.
3. Observe engine behaviour for failing and flaky tasks.

**Success Criteria:**

| Metric | Criterion |
|--------|-----------|
| Passing tasks (4) | All closed normally |
| Failing tasks (3) | Each attempted exactly `max_attempts` (3) times, then set to awaiting `work` |
| Flaky tasks (2) | Completed if they pass within 3 attempts; otherwise escalated |
| Escalation signal task | Set to awaiting `escalation` after 1 attempt |
| No infinite loops | Engine exits (not hangs) when all remaining tasks are stuck/awaiting |
| Activity log correctness | Attempt counts in run records match policy limits |
| Engine exit code | Non-zero if any tasks remain open/stuck |
| Total attempts | ≤ 10 tasks × 3 max_attempts = 30 total agent invocations |

---

### S6 — Stale Lease Recovery (Pool Mode)

**Goal:** Ensure that stale-lease detection correctly reclaims tasks from
crashed or hung workers without data loss.

**Setup:**
- 1 epic, 8 tasks.
- `--pool 4 --stale-timeout 2m` (shortened for test).
- Labels: 6 × `stub:pass`, 1 × `stub:hang`, 1 × `stub:crash`.

**Procedure:**
1. Start pool run.
2. The hanging task's worker will hold it indefinitely.
3. The crashing task's worker will SIGKILL itself.
4. After stale timeout (2 min), engine should reclaim both tasks.
5. On retry, the stub behaviour is cleared (tasks run as `stub:pass`).

**Success Criteria:**

| Metric | Criterion |
|--------|-----------|
| All 8 tasks closed | Including the previously hung and crashed tasks |
| Stale recovery logged | 2 `stale_recovery` events in activity log |
| Recovery timing | Tasks reclaimed within stale_timeout + 30 s |
| No data corruption | Hung/crashed task JSON files are valid after recovery |
| Worker replacement | Pool maintains 4 active workers (dead worker slots are refilled or tasks redistributed) |
| `started_at` lifecycle | Cleared on recovery, re-set on re-claim |

---

### S7 — Concurrent Parallel Epics with Pool

**Goal:** Validate that multiple epics running in parallel with pool workers
do not interfere with each other's worktrees, task claims, or merge operations.

**Setup:**
- 3 epics, each with 8 tasks (2 waves of 4).
- `tk run epic1 epic2 epic3 --parallel 3 --pool 2`.
- All tasks `stub:pass`.

**Success Criteria:**

| Metric | Criterion |
|--------|-----------|
| All 24 tasks closed | 8 per epic, all `closed` |
| Worktree isolation | Each epic has its own worktree; no cross-contamination of files |
| No merge conflicts | All worktrees merge back cleanly |
| Activity log integrity | Events are correctly attributed to their respective epics |
| Resource usage | Peak RSS < 500 MB; peak FDs < 200 |
| Clean exit | All worktrees removed after completion |

---

### S8 — Log & Record Accumulation

**Goal:** Ensure that run records, activity logs, and debug logs do not grow
unboundedly over many runs, and that `tk gc` correctly reclaims space.

**Setup:**
- Run 50 small epics (2 tasks each, `stub:pass`) sequentially.
- Do NOT run `tk gc` during the soak.

**Procedure:**
1. Run all 50 epics.
2. Measure `.tick/logs/` size after each 10 epics.
3. Run `tk gc --max-age 0s` (clean everything).
4. Measure final size.

**Success Criteria:**

| Metric | Criterion |
|--------|-----------|
| Log growth is linear | `.tick/logs/` grows ≤ 1 MB per epic (50 MB max) |
| No runaway log files | No single file > 10 MB |
| `tk gc` reclaims space | Post-GC size < 1 MB |
| Live records cleaned | No `.live.json` files remain after all runs complete |
| Activity log structure | `activity.jsonl` remains valid JSONL (every line parseable) |
| Records are complete | Every closed task has a corresponding `.json` record in `logs/records/` |

---

### S9 — Board SSE Connection Stability

**Goal:** Verify that the board's Server-Sent Events (SSE) connection remains
stable during long runs, reconnects cleanly, and does not leak connections.

**Setup:**
- `tk run <epic> --board --port 8080` with 20 tasks across 5 waves.
- SSE client harness that connects, logs all events, and verifies ordering.

**Procedure:**
1. Start run with board.
2. Connect SSE client harness.
3. Disconnect/reconnect the SSE client 10 times during the run.
4. Simulate network blip (block port for 5 s, then unblock).
5. Run to completion.

**Success Criteria:**

| Metric | Criterion |
|--------|-----------|
| All task state transitions received | SSE client sees every `open → in_progress → closed` |
| No duplicate events | Event IDs are unique |
| Reconnection works | After disconnect, client receives full current state on reconnect |
| No connection leaks | Server connection count ≤ active clients + 1 |
| Server memory stable | HTTP server RSS growth < 5 MB over full run |
| Board remains responsive | HTTP health check (`/api/health`) returns 200 throughout |

---

### S10 — End-to-End Real Agent Soak (Integration Gate)

**Goal:** Full end-to-end validation with a real Claude agent on a real (but
small) codebase, testing the complete lifecycle over many tasks.

**Setup:**
- Real Go project: a CLI calculator with add/subtract/multiply/divide.
- 1 epic, 10 feature tasks: add operations, tests, error handling, CLI flags,
  help text, README, CI config, linting, benchmarks, release notes.
- `tk run <epic> --max-cost 5.00 --max-iterations 50`.
- Agent: `claude` backend (real Claude Code).

**Procedure:**
1. Create epic and tasks using `scripts/create-calculator-test-epic.sh`.
2. `tk run <epic>`.
3. Observe full lifecycle: context generation, wave execution, verifiers,
   wrap-up, merge.

**Success Criteria:**

| Metric | Criterion |
|--------|-----------|
| ≥ 8 of 10 tasks closed | At least 80 % task completion rate |
| Code compiles | `go build ./...` succeeds in final worktree |
| Tests pass | `go test ./...` succeeds (if test tasks completed) |
| Cost within budget | Total cost ≤ $5.00 |
| No stuck loops | No task attempted > `max_attempts` times |
| Clean merge | Worktree merges to parent branch without conflicts |
| Run record completeness | Every completed task has a run record with cost/token data |
| Activity log accuracy | All state transitions logged with correct timestamps |

---

## 3. Infrastructure Requirements

### 3.1 Soak Test Harness

```
test/soak/
├── harness.sh           # Main soak runner (selects scenario, collects metrics)
├── stub-agent/          # Deterministic stub agent binary
│   └── main.go
├── metrics/
│   ├── collector.sh     # Polls PID RSS, FDs, goroutines every 30s
│   └── report.py        # Generates pass/fail report from metrics JSONL
├── scenarios/
│   ├── s01-sequential-marathon.sh
│   ├── s02-pool-sustained.sh
│   ├── s03-crash-recovery.sh
│   ├── s04-watch-idle.sh
│   ├── s05-policy-escalation.sh
│   ├── s06-stale-lease.sh
│   ├── s07-parallel-epics.sh
│   ├── s08-log-accumulation.sh
│   ├── s09-sse-stability.sh
│   └── s10-real-agent-e2e.sh
└── fixtures/
    ├── calculator-project/  # Template project for S10
    └── epic-templates/      # JSON templates for generating epics
```

### 3.2 Metrics Collection

Each scenario emits metrics to `<scenario>.metrics.jsonl`:

```json
{"ts":"2026-05-08T10:00:30Z","rss_mb":45,"fds":23,"goroutines":8,"tasks_closed":3,"tasks_open":7,"disk_mb":2.1}
```

The report tool (`metrics/report.py`) reads the JSONL and evaluates success
criteria as pass/fail with trend graphs.

### 3.3 CI Integration

Soak tests are too long for regular CI. Run on a schedule:

| Cadence | Scenarios | Duration |
|---------|-----------|----------|
| Nightly | S1, S2, S5, S8 | ~4 h |
| Weekly | All S1–S9 | ~12 h |
| Pre-release | All S1–S10 (with real agent) | ~24 h |

Gate: A release **must not** ship if any soak scenario fails at the
pre-release gate.

---

## 4. Success Criteria Summary

### Per-Scenario Pass/Fail

A scenario **passes** if and only if **all** of its criteria hold for the
entire duration of the soak. Any single criterion violation is a **fail**.

### Overall Soak Gate

| Gate | Requirement |
|------|-------------|
| Nightly | S1 + S2 + S5 + S8 all pass |
| Weekly | S1–S9 all pass |
| Pre-release | S1–S10 all pass |

### Regression Detection

Compare current run metrics against the previous baseline:

| Metric | Regression threshold |
|--------|---------------------|
| Peak RSS | > 25 % increase from baseline |
| Peak FDs | > 50 % increase from baseline |
| Task completion rate | Any decrease |
| Wall-clock time | > 30 % increase for same workload |
| Agent cost (S10) | > 50 % increase for same tasks |

Regressions trigger a warning (nightly) or block (pre-release).

---

## 5. Known Failure Modes (What Soaks Are Designed to Catch)

| Failure mode | Caught by | Mechanism |
|--------------|-----------|-----------|
| Goroutine leak in wave runner | S1, S2 | Goroutine count monitoring between epics |
| File descriptor leak in agent spawning | S1, S2 | FD count monitoring |
| Worktree accumulation after crashes | S3 | Check `.tickflow-worktrees/` after resume |
| Double-claim in pool mode | S2, S6 | Activity log analysis |
| Stale lease never reclaimed | S6 | Timeout + recovery event verification |
| Watch mode busy-wait CPU waste | S4 | CPU usage monitoring during idle |
| Activity log corruption under concurrency | S2, S7 | JSONL validity check |
| Run records growing unboundedly | S8 | Disk usage monitoring + GC verification |
| SSE connection leak on reconnect | S9 | Server connection count monitoring |
| Policy bypass (infinite retry loop) | S5 | Attempt count verification |
| Cross-epic worktree contamination | S7 | File content verification across worktrees |
| Merge conflict on worktree return | S3, S7 | Clean merge verification |
| Real agent cost blowup | S10 | Budget tracking |
| Interrupted task data loss | S3 | Before/after state comparison |

---

*Document created 2026-05-08 as part of tick h3i.*
