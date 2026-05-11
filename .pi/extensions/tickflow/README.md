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

When `--worktrees` runs without `--dry-run`, Tickflow creates the planned git worktree with branch `tf/<runId>/<tick-id>` and records a `tickflow_lease` on the controller tick before spawning the child agent. Existing worktree paths with a `.git` file are treated as reusable for future resume flows; non-worktree path collisions fail safely.

The absolute worktree path is stored in `tickflow_lease.worktree` when worktree lifecycle support claims a tick.

## Worktree agent boundary and `.tick` protection

In worktree mode, child agents are not allowed to authoritatively mutate tick state. Tickflow installs `<worktree>/.tickflow-bin/tk` and prepends it to the child `PATH`:

- read-only commands (`show`, `list`, `graph`, `ready`, `next`, `blocked`, `deps`, `notes`, `status`, `version`) proxy to the controller repo
- mutation commands (`close`, `update`, `note`, `create`, etc.) fail with guidance to emit a `<promise>...</promise>` signal

Tickflow also applies filesystem-level friction to `.tick` in child worktrees. In `sandbox: auto`, it chooses a supported sandbox label when available and falls back to `readonly-dot-tick`, which recursively removes write bits from `<worktree>/.tick`. Attempt evidence records the active sandbox mode and runtime resources.

Worktree prompts are stricter than shared-workspace prompts: agents are told not to run `tk close/update/note/create` or edit `.tick`; completion should be reported with `<promise>COMPLETE: ...</promise>` and the controller updates ticks.

## Merge policy

When a worktree agent is accepted, Tickflow verifies that `.tick` is clean in the child worktree, stages only non-`.tick` paths, refuses staged `.tick` files, commits the worktree branch, and merges it back into the controller branch with `--no-ff`.

If `.tick` was modified, commit fails, merge is skipped, the worktree is preserved, and the controller routes the tick to `awaiting=escalation` with a note. If the merge conflicts, Tickflow aborts the merge, preserves the worktree, and routes the tick to `awaiting=escalation` with conflict files.

Cleanup only happens after durable success: commit/merge succeeds, the controller closes or routes the tick through its required gate, the lease is cleared, and the worktree is removed.

## Runtime resources

`.tick/pi-runner.yaml` can declare local files, bootstrap commands, and dev server descriptors for worktree agents. Secrets are not exposed by default (`secrets_mode: none`). With `secrets_mode: copy`, configured `local_files` are copied into the worktree with `0600` permissions; with `symlink`, Tickflow creates symlinks. Bootstrap commands run in the child worktree before the agent starts. Runtime resources are injected into the child prompt and environment so agents know about shared dev servers and should not start duplicates.

## Supervisor outcomes

- `accept`: tick is closed and verifiers pass
- `handoff`: tick is awaiting human action or a promise signal maps to an awaiting state
- `repair`: verifier failures remain and attempts are available
- `continue`: tick remains open but attempts are available
- `escalate`: max attempts/no attempts/failing closed tick policy

Agent output is advisory. Durable tick state and verifier evidence decide outcomes.

## Config and verifier inference

Tickflow optionally loads `.tick/pi-runner.yaml`. Missing config is fine; defaults are used.

```yaml
defaults:
  max_attempts: 5
  require_commit: false
  sandbox: auto

verifiers:
  - name: go tests
    run: go test ./...

policies:
  max_no_progress_attempts: 1

worktrees:
  root: ../.tickflow-worktrees
  secrets_mode: none
  local_files:
    - .env.local
  bootstrap:
    - pnpm install --frozen-lockfile

runtime:
  env:
    TICKFLOW: "1"
  dev_servers:
    - name: web
      command: pnpm dev
      url: http://localhost:3000
      shared: true
```

Config-derived verifiers are shown by `/tickflow-contract <tick-id>` and run before inferred acceptance verifiers. Tickflow also infers verifier commands from acceptance criteria patterns such as:

```text
Run: go test ./internal/tick/...
- `pnpm build` succeeds
go test ./... passes
```

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

## Status and resume

```text
/tickflow-status
```

Lists all active/recoverable Tickflow state for the current repository:

- **Persisted runs**: discovered from worktree directories under `../.tickflow-worktrees/<repoSlug>/run-*/`
- **Active leases**: scanned from `.tick/issues/*.json` files with `tickflow_lease` metadata, including expiry and worktree existence checks
- **Git worktrees**: all tickflow-managed worktrees (branches matching `tf/`) from `git worktree list`
- **Last decisions**: the most recent attempt evidence per tick from `.tick/logs/pi-runner/<tickId>/`

```text
/tickflow-resume <run-id>
```

Resumes an interrupted dry/manual run without deleting existing work:

1. Locates the run directory under `../.tickflow-worktrees/<repoSlug>/<run-id>/`
2. Extracts the epic ID from the run-id format
3. Enumerates tick worktree directories from the run
4. For each tick, checks authoritative state via `tk show` — **closed and awaiting ticks are skipped**
5. Verifies the worktree still exists on disk (`.git` marker present)
6. Reconnects to the existing worktree, re-provisions runtime resources (tk wrapper, secrets, bootstrap)
7. Re-applies sandbox protection to `.tick`
8. Updates the tickflow lease and runs the supervised tick attempt
9. On acceptance, merges the worktree branch back to the controller and cleans up
10. Reports per-tick results: accepted/merged, skipped, escalated, etc.

This allows safe recovery from interrupted `--worktrees` runs. Work in existing worktrees is preserved and continued from the current repository state.

## Dashboard debugging

```text
/tickflow-dashboard --dump
/tickflow-dashboard --debug [/path/to/debug.jsonl]
/tickflow-dashboard --timeout 10s
```

- `--dump` renders a non-interactive dashboard summary into the conversation, useful when the custom TUI is suspect.
- `--debug` writes JSONL lifecycle/input/render diagnostics. Without a path, it writes to the system temp directory. You can also set `PI_TICKFLOW_DASHBOARD_DEBUG=/tmp/tickflow-dashboard.jsonl`.
- `--timeout` arms an optional watchdog that closes the custom dashboard after the given duration (`ms`, `s`, or `m`).

The interactive dashboard opens immediately with a loading state and loads run records in the background so `q`, `Esc`, and `Ctrl-C` can close it even if state loading becomes slow.

## MVP limitations

- Shared workspace mode can conflict when parallel ticks edit the same files; prefer `--worktrees` for parallel implementation work.
- Worktree mode has merge guardrails, but full resume/status UX is still pending.
- `sandbox: auto` currently applies a best-effort label plus `readonly-dot-tick` fallback; full OS-enforced `sandbox-exec`/`bubblewrap` invocation remains a hardening target.
- Verifier inference is intentionally simple; use `.tick/pi-runner.yaml` for explicit verifiers.
- Attempt artifacts are persisted, but full resume UX is not implemented yet.
- Pi JSON command output does not render extension UI messages in print mode; use interactive Pi for normal operation.

## Manual verification

### Basic extension checks

1. Reload Pi or start Pi in this repo so `.pi/extensions/tickflow/index.ts` is discovered.
2. Run `/tickflow-contract <tick-id>` on a real tick with acceptance criteria.
3. Run `/tickflow-run <epic-id> --dry-run` to inspect the first ready wave.
4. Run `/tickflow-run <epic-id> --worktrees --dry-run` and verify the output includes:
   - `Repo slug: <basename>-<hash>`
   - `Run ID: run-...`
   - worktree path under `../.tickflow-worktrees/<repoSlug>/<runId>/<tick-id>`
   - branch `tf/<runId>/<tick-id>`
5. Optionally run `/tickflow-run-tick --smoke` to verify child Pi process spawning.
6. For a disposable tick, run `/tickflow-run-tick <tick-id>` and inspect `.tick/logs/pi-runner/<tick-id>/attempt-NNN.json`.

### Worktree boundary checks

Create or use a disposable worktree from `/tickflow-run <epic> --worktrees` and verify:

```bash
# The child wrapper should be first in PATH for child agents.
ls <worktree>/.tickflow-bin/tk

# Read commands should proxy to the controller repo.
PATH="<worktree>/.tickflow-bin:$PATH" TICKFLOW_CONTROLLER_REPO="$PWD" tk show <tick-id>

# Mutation commands should fail with exit 42 and guidance to use promises.
PATH="<worktree>/.tickflow-bin:$PATH" TICKFLOW_CONTROLLER_REPO="$PWD" tk close <tick-id>
```

### Direct `.tick` write prevention

With the default `readonly-dot-tick` fallback, direct writes should fail for normal child processes:

```bash
echo '{}' > <worktree>/.tick/issues/should-not-write.json
# expect: permission denied
```

If this succeeds on a platform/filesystem, the merge guard must still prevent those changes from landing.

### Merge guard checks

In a disposable worktree:

```bash
# Forbidden operational state change.
echo '# dirty' >> <worktree>/.tick/activity/activity.jsonl

# Source change that would otherwise be mergeable.
echo '# test' >> <worktree>/README.md
```

Then run the relevant Tickflow task to acceptance. Expected behavior:

- Tickflow refuses to commit/merge `.tick` changes.
- The worktree is preserved.
- The controller tick is routed to `awaiting=escalation` with a note explaining the forbidden `.tick` mutation.

### Merge conflict checks

Create conflicting edits on the controller branch and the worktree branch, then let Tickflow merge. Expected behavior:

- Tickflow aborts the failed merge.
- The worktree is preserved.
- The controller tick is routed to `awaiting=escalation` with conflict file names.

### Runtime resource checks

With a config such as:

```yaml
worktrees:
  secrets_mode: copy
  local_files:
    - .env.local
  bootstrap:
    - echo bootstrap-ok > .tickflow-bootstrap-check
runtime:
  dev_servers:
    - name: web
      url: http://localhost:3000
      shared: true
```

Expected behavior:

- `.env.local` is copied into the worktree with `0600` permissions.
- bootstrap command runs in the worktree.
- attempt evidence and prompts list the configured runtime resources.
