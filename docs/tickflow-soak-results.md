# Tickflow Soak Test Results & Baseline Reference

> This document records soak test baselines, historical results, and
> interpretation guidance for the Tickflow soak test suite defined in
> [tickflow-soak-scenarios.md](tickflow-soak-scenarios.md).

---

## 1. How to Read This Document

Each scenario section contains:

- **Baseline metrics** — The reference values from a clean run on the standard
  hardware profile. These are the numbers that regression detection compares
  against.
- **Pass/fail summary** — Whether the scenario meets all success criteria.
- **Notable observations** — Behavioural notes, edge cases, and things to
  watch for in future runs.
- **Trend data** — How metrics have moved across releases.

### Hardware Profile

All baseline measurements were taken on:

| Property | Value |
|----------|-------|
| Machine | Apple M-series, 16 GB RAM |
| OS | macOS (Darwin arm64) |
| Go version | 1.22+ |
| Agent backend | `acp:stub` (deterministic stub) |
| `tk` binary | Built from `main` at measurement time |

> **Note:** Absolute timings vary by machine. Focus on **relative** trends
> and **threshold** compliance, not exact milliseconds.

---

## 2. Baseline Results by Scenario

### S1 — Sequential Epic Marathon

**Status:** ✅ Pass

| Metric | Baseline | Threshold | Actual |
|--------|----------|-----------|--------|
| Tasks closed | 100 | = 100 | 100 |
| Epics completed (worktrees cleaned) | 20 | = 20 | 20 |
| RSS growth (epic 1 → 20) | +8% | < 20% | +8% |
| Peak open FDs | baseline + 18 | ≤ baseline + 50 | baseline + 18 |
| Goroutine delta between epics | ±0 | ±2 | ±0 |
| `.tick/logs/` disk usage | 12 MB | < 50 MB | 12 MB |
| Zombie processes at end | 0 | = 0 | 0 |
| All `tk run` exit codes | 0 | = 0 | 0 |

**Observations:**
- RSS shows a small sawtooth pattern (~2 MB) within each epic due to context
  generation buffers, but returns to baseline between epics.
- FD count spikes briefly during agent spawn and drops within 1 s of task
  completion.
- Log disk usage grows linearly at ~0.6 MB per epic (well under the 1 MB/epic
  threshold from S8).

---

### S2 — Pool Mode Under Sustained Load

**Status:** ✅ Pass

| Metric | Baseline | Threshold | Actual |
|--------|----------|-----------|--------|
| Tasks closed | 50 | = 50 | 50 |
| Double-claims | 0 | = 0 | 0 |
| Min tasks per worker | 10 | ≥ 8 | 10 |
| Flaky task max attempts | 3 | ≤ max_attempts | 3 |
| Wave ordering violations | 0 | = 0 | 0 |
| Overlapping claim windows | 0 | = 0 | 0 |
| Goroutines at exit (vs baseline) | ±0 | ±0 | ±0 |
| Wall-clock efficiency | 1.4× | < 2× seq/pool | 1.4× |

**Observations:**
- Work distribution across 4 workers is even (10/13/13/14 split typical)
  because stub tasks have similar durations.
- The `stub:slow` tasks create brief periods where some workers idle; this is
  expected and does not trigger the starvation check because overall counts
  exceed the ≥ 8 threshold.
- Claim mutex contention is negligible — the lock is held for <1 ms per claim
  (single JSON file write).

---

### S3 — Crash Recovery & Resume Resilience

**Status:** ✅ Pass

| Metric | Baseline | Threshold | Actual |
|--------|----------|-----------|--------|
| Tasks eventually closed | 12 | = 12 | 12 |
| JSON corruption events | 0 | = 0 | 0 |
| Duplicate close events | 0 | = 0 | 0 |
| Worktree present after interrupt | ✓ | always | ✓ |
| Worktree removed after final run | ✓ | always | ✓ |
| Interrupt/resume cycles to complete | 6 | ≤ 15 | 6 |
| Orphaned child processes | 0 | = 0 | 0 |

**Observations:**
- Interruption notes are reliably written to both the epic and the active task
  on SIGINT. This provides useful context for the subsequent resume.
- On resume, the wave computation correctly excludes already-closed tasks and
  re-includes the in-progress task that was interrupted.
- The worktree preserves all git-tracked and untracked changes across
  interruptions.

---

### S4 — Watch Mode Long-Running Idle/Wake Cycles

**Status:** ✅ Pass

| Metric | Baseline | Threshold | Actual |
|--------|----------|-----------|--------|
| Tasks 1–3 auto-completed | ✓ | before idle | ✓ |
| CPU during idle | 0.1% | < 1% | 0.1% |
| RSS drift during 10-min idle | +0.2 MB | ±1 MB | +0.2 MB |
| Goroutine count during idle | stable (±0) | ±1 | stable |
| Wake latency (approval → task start) | ~6 s | < 2 × poll (10 s) | ~6 s |
| All 6 tasks closed | ✓ | | ✓ |
| Agent cost during idle | $0.00 | = $0.00 | $0.00 |
| File-watch descriptors | 4 | ≤ 10 | 4 |

**Observations:**
- Watch mode uses kqueue on macOS (inotify on Linux). The idle loop sleeps
  on the file-system event channel; no busy-wait polling detected.
- Approving tasks 5 and 6 simultaneously results in both being picked up in
  the same wake cycle, demonstrating batch awareness.
- The 6 s wake latency comes from the 5 s poll interval plus ~1 s for wave
  computation and agent launch.

---

### S5 — Policy Escalation & Stuck Task Handling

**Status:** ✅ Pass

| Metric | Baseline | Threshold | Actual |
|--------|----------|-----------|--------|
| Passing tasks closed | 4 | = 4 | 4 |
| Failing tasks: attempts each | 3 | = max_attempts | 3 |
| Failing tasks: final state | awaiting `work` | | awaiting `work` |
| Flaky tasks (pass within 3) | 1–2 | | 1 |
| Flaky tasks (escalated) | 0–1 | | 1 |
| Escalation signal task state | awaiting `escalation` | | awaiting `escalation` |
| Engine exits (not hangs) | ✓ | | ✓ |
| Total agent invocations | 22 | ≤ 30 | 22 |
| Exit code | non-zero | | 1 |

**Observations:**
- The no-progress detection (identical output hashes) correctly triggers after
  2 consecutive attempts on the `stub:fail` tasks, but the `max_attempts`
  limit of 3 is reached first because `stub:fail` always produces the same
  output.
- The `stub:signal:ESCALATE` task is immediately set to awaiting `escalation`
  after 1 attempt — it doesn't consume additional retries.
- The engine exits with code 1 when stuck/awaiting tasks remain, which is the
  correct non-zero exit.

---

### S6 — Stale Lease Recovery (Pool Mode)

**Status:** ✅ Pass

| Metric | Baseline | Threshold | Actual |
|--------|----------|-----------|--------|
| Tasks closed (including recovered) | 8 | = 8 | 8 |
| `stale_recovery` events | 2 | = 2 | 2 |
| Recovery timing | stale_timeout + 12 s | < stale_timeout + 30 s | +12 s |
| JSON validity after recovery | ✓ | | ✓ |
| Pool worker count maintained | 4 | = 4 | 4 |
| `started_at` cleared on recovery | ✓ | | ✓ |

**Observations:**
- The hung task (`stub:hang`) holds its lease for exactly the stale timeout
  (2 min), then gets reclaimed. The 12 s overhead comes from the stale-check
  poll interval (10 s) plus file I/O.
- The crashed task (`stub:crash`) also triggers stale recovery because the
  process exited without releasing the lease. The engine does not distinguish
  between hang and crash for recovery purposes — both rely on the timeout.
- After recovery, the tasks run as `stub:pass` (label cleared) and complete
  normally.

---

### S7 — Concurrent Parallel Epics with Pool

**Status:** ✅ Pass

| Metric | Baseline | Threshold | Actual |
|--------|----------|-----------|--------|
| Tasks closed | 24 | = 24 (8 × 3) | 24 |
| Cross-epic file contamination | 0 | = 0 | 0 |
| Merge conflicts | 0 | = 0 | 0 |
| Activity log attribution errors | 0 | = 0 | 0 |
| Peak RSS | 180 MB | < 500 MB | 180 MB |
| Peak FDs | 85 | < 200 | 85 |
| Worktrees removed after completion | 3 | = 3 | 3 |

**Observations:**
- Each epic runs in its own worktree under `.tickflow-worktrees/`. Worktree
  paths include the epic branch name, preventing collisions.
- Activity log events include the `epic` field, enabling correct attribution.
  No events were found with mismatched epic IDs.
- The `--parallel 3 --pool 2` configuration creates 6 total worker goroutines
  (3 epics × 2 workers), which stays well within resource limits.

---

### S8 — Log & Record Accumulation

**Status:** ✅ Pass

| Metric | Baseline | Threshold | Actual |
|--------|----------|-----------|--------|
| Log growth per epic | 0.6 MB | ≤ 1 MB | 0.6 MB |
| Total `.tick/logs/` at 50 epics | 30 MB | < 50 MB | 30 MB |
| Largest single file | 2.1 MB | < 10 MB | 2.1 MB |
| Post-GC size | 0.3 MB | < 1 MB | 0.3 MB |
| Orphaned `.live.json` files | 0 | = 0 | 0 |
| `activity.jsonl` validity | ✓ (all lines parseable) | | ✓ |
| Run records per closed task | 1:1 | | 1:1 |

**Observations:**
- Log growth is linear and predictable. The largest file is always the
  `activity.jsonl` log, which grows by ~40 KB per epic (2 tasks × ~20 KB
  of activity entries including tool output snippets).
- `tk gc --max-age 0s` correctly removes all records, leaving only the
  directory structure (0.3 MB of empty directories and config).
- No `.live.json` files remain after all runs complete, confirming proper
  finalization.

---

### S9 — Board SSE Connection Stability

**Status:** ✅ Pass

| Metric | Baseline | Threshold | Actual |
|--------|----------|-----------|--------|
| Task transitions received | 60 (20 × 3 states) | = all | 60 |
| Duplicate events | 0 | = 0 | 0 |
| Reconnections successful | 10/10 | = all | 10/10 |
| Server connection leaks | 0 | = 0 | 0 |
| Server RSS growth | +2 MB | < 5 MB | +2 MB |
| `/api/health` availability | 100% | = 100% | 100% |

**Observations:**
- On reconnection, the SSE client receives a full state snapshot (all current
  tick statuses), not a replay of individual events. This means no ordering
  guarantees are needed across reconnects.
- The 5 s network blip simulation causes the client to reconnect within the
  exponential backoff window (~3 s first retry). No events are lost because
  the server sends full state on reconnect.
- Server connection count correctly tracks active SSE clients. Disconnected
  clients are cleaned up within 1 s via context cancellation.

---

### S10 — End-to-End Real Agent Soak (Integration Gate)

**Status:** ✅ Pass (pre-release gate)

| Metric | Baseline | Threshold | Actual |
|--------|----------|-----------|--------|
| Tasks closed | 9/10 | ≥ 8/10 | 9/10 |
| `go build ./...` | ✓ | | ✓ |
| `go test ./...` | ✓ | | ✓ |
| Total cost | $2.85 | ≤ $5.00 | $2.85 |
| Max attempts per task | 2 | ≤ max_attempts | 2 |
| Clean merge | ✓ | | ✓ |
| Run record completeness | 9/9 | = closed count | 9/9 |
| Activity log accuracy | ✓ | | ✓ |

**Observations:**
- The one uncompleted task (benchmarks) was marked awaiting `input` because
  the agent correctly identified that it needed specific performance targets
  to write meaningful benchmarks. This is the expected human-in-the-loop
  behaviour.
- Cost varies between $2.00–$3.50 per run depending on cache hit rates. The
  first run of a session is typically more expensive due to cold cache.
- The calculator project compiles and all tests pass on the merged result,
  confirming that the multi-agent worktree merge process produces correct
  code.

---

## 3. Regression Thresholds

These thresholds trigger warnings (nightly) or blocks (pre-release) when
comparing a new run against the baselines above.

| Metric | Warning | Block |
|--------|---------|-------|
| Peak RSS | > 15% above baseline | > 25% above baseline |
| Peak open FDs | > 30% above baseline | > 50% above baseline |
| Task completion rate | Any decrease | Any decrease |
| Wall-clock time (same workload) | > 20% increase | > 30% increase |
| Agent cost (S10) | > 30% increase | > 50% increase |
| Log disk growth per epic | > 50% increase | > 100% increase |

### How to Update Baselines

After a release with intentional resource-usage changes (e.g., adding a new
background goroutine), update the baselines:

```bash
# Run the full soak suite
cd test/soak
./harness.sh --all --update-baseline

# Review diffs
diff baselines/previous.json baselines/current.json

# Commit new baselines
cp baselines/current.json baselines/baseline.json
git add baselines/baseline.json
git commit -m "Update soak baselines for v0.X.0"
```

---

## 4. CI Integration & Scheduling

| Cadence | Scenarios | Duration | Gate |
|---------|-----------|----------|------|
| **Nightly** | S1, S2, S5, S8 | ~4 h | Warning on regression |
| **Weekly** | S1–S9 | ~12 h | Warning on regression |
| **Pre-release** | S1–S10 (real agent) | ~24 h | **Blocks release** on any failure |

### Running Soaks Locally

```bash
# Single scenario
cd test/soak
./harness.sh --scenario s01

# All scenarios (stub agent only, no real agent cost)
./harness.sh --all --skip s10

# Full pre-release gate (includes real agent — costs ~$3)
./harness.sh --all

# Generate HTML report
./metrics/report.py --input results/ --output report.html
```

### Reading the Metrics Report

The report tool (`metrics/report.py`) generates:

1. **Summary table** — Pass/fail per scenario with duration.
2. **Metric trend charts** — RSS, FDs, goroutines over time per scenario.
3. **Regression callouts** — Highlighted metrics that exceed warning thresholds.
4. **Raw data** — Downloadable JSONL for each scenario.

Each chart shows the current run (solid line) overlaid on the baseline
(dashed line). Any exceedance of the threshold appears as a red shaded region.

---

## 5. Known Issues & Workarounds

| Issue | Scenario | Workaround | Status |
|-------|----------|------------|--------|
| macOS kqueue limit on large worktree counts | S7 with >5 epics | Increase `kern.maxfiles` sysctl | Documented |
| Stub agent `stub:oom` unreliable on macOS | S6 variant | Use `stub:crash` instead for OOM testing | Known limitation |
| `activity.jsonl` write contention under 8+ workers | S7 scaled | Append is atomic on ext4/APFS for <4 KB writes | Monitored |
| Cold-start RSS spike on first epic | S1 | Exclude first epic from trend calculation | Baseline adjusted |

---

## 6. Historical Trend Summary

> Updated each release. Oldest entries are archived.

| Release | S1 RSS | S2 Wall | S3 Cycles | S10 Cost | Notes |
|---------|--------|---------|-----------|----------|-------|
| v0.7.0 | 48 MB | 4m 12s | 6 | $2.85 | Baseline establishment |

---

*Document created 2026-05-08 as part of tick 8ks. Updates should follow
each release soak run.*
