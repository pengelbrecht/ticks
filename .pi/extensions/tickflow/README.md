# Tickflow Pi Extension MVP

Tickflow is a project-local Pi extension that runs Ticks work as supervised contracts instead of trusting agent prose.

## Commands

```text
/tickflow-contract <tick-id>
```

Loads `tk show <tick-id> --json`, compiles a `TickContract`, and displays:

- title and description
- dependencies
- `requires` human gate
- acceptance criteria
- verifier commands inferred from acceptance criteria

```text
/tickflow-run-tick <tick-id>
```

Runs one tick through the MVP supervisor:

1. marks the tick `in_progress`
2. spawns a child Pi process in JSON print mode
3. captures final assistant output and usage
4. collects durable evidence from `tk show`, `git status`, `git diff --stat`, promise signals, and verifier results
5. writes an attempt artifact to `.tick/logs/pi-runner/<tick-id>/attempt-NNN.json`
6. accepts, retries, repairs, hands off, or escalates based on tick state and verifier evidence

Smoke test:

```text
/tickflow-run-tick --smoke
```

```text
/tickflow-run <epic-id> [--agents N] [--dry-run] [--worktrees]
```

Loads `tk graph <epic-id> --json`, selects the ready wave, and supervises ready ticks with configurable concurrency. The scheduler recomputes the graph after each wave and advances only after each tick reaches a supervised outcome.

Use `--dry-run` to inspect the first ready wave without running subagents. With `--worktrees --dry-run`, Tickflow also prints the planned repo-namespaced worktree paths and branch names.

Before launching a graph candidate, Tickflow re-loads each tick and its `blocked_by` dependencies with `tk show`. This authoritative state guard prevents cross-epic blockers from being bypassed when `tk graph <epic>` omits blockers outside the current epic.

## Worktree path planning

Worktree mode uses a collision-resistant namespace because tick IDs are only repo-local. The planner computes:

```text
repoSlug = <repo-basename>-<sha256(remote-url-or-repo-root)[0:8]>
runId = run-<epic-id>-<timestamp>-<random>
worktreePath = ../.tickflow-worktrees/<repoSlug>/<runId>/<tick-id>
branchName = tf/<runId>/<tick-id>
```

The absolute worktree path is intended to be stored in `tickflow_lease.worktree` when worktree lifecycle support claims a tick.

## Supervisor outcomes

- `accept`: tick is closed and verifiers pass
- `handoff`: tick is awaiting human action or a promise signal maps to an awaiting state
- `repair`: verifier failures remain and attempts are available
- `continue`: tick remains open but attempts are available
- `escalate`: max attempts/no attempts/failing closed tick policy

Agent output is advisory. Durable tick state and verifier evidence decide outcomes.

## Verifier inference

The MVP infers verifier commands from acceptance criteria patterns such as:

```text
Run: go test ./internal/tick/...
- `pnpm build` succeeds
go test ./... passes
```

Future work should add project config for explicit verifiers and per-tick policy overrides.

## Lease metadata

The tick schema now supports optional `tickflow_lease` metadata for Pi-style schedulers:

```json
{
  "tickflow_lease": {
    "runner": "pi-tickflow",
    "session_id": "...",
    "attempt": 1,
    "worktree": "...",
    "owner": "agent-1",
    "acquired_at": "2026-05-08T06:00:00Z",
    "expires_at": "2026-05-08T07:00:00Z"
  }
}
```

This is optional and backwards-compatible. Runners can use it to identify ownership and recover stale `in_progress` work. `Tick.Release()` clears the lease.

## MVP limitations

- Shared workspace mode can conflict when parallel ticks edit the same files.
- Worktree isolation and merge conflict handling are post-MVP.
- Verifier inference is intentionally simple.
- Attempt artifacts are persisted, but full resume UX is not implemented yet.
- Pi JSON command output does not render extension UI messages in print mode; use interactive Pi for normal operation.

## Manual verification

1. Reload Pi or start Pi in this repo so `.pi/extensions/tickflow/index.ts` is discovered.
2. Run `/tickflow-contract <tick-id>` on a real tick with acceptance criteria.
3. Run `/tickflow-run <epic-id> --dry-run` to inspect the first ready wave.
4. Optionally run `/tickflow-run-tick --smoke` to verify child Pi process spawning.
5. For a disposable tick, run `/tickflow-run-tick <tick-id>` and inspect `.tick/logs/pi-runner/<tick-id>/attempt-NNN.json`.
