# Ticker Absorption Plan (into ticks)

> **Archived / superseded.** This migration plan is complete and predates the removal of the standalone `tk run` runner; its `tk run` references describe the then-current execution model. Orchestration is now harness-driven and runner-neutral. Retained as a historical record. See [`skills/ticks/references/agent-runner.md`](../skills/ticks/references/agent-runner.md) for the current contract.

## Goal
Absorb the `ticker` project into `ticks` so there is only one CLI (`tk`) and one codebase. The ticker TUI is replaced by tickboard (web-based). No `ticker` binary, repo, installer, or updater remains.

## Decisions (Locked)
- **CLI framework:** Cobra (migrate existing `tk` commands to Cobra).
- **Unified logging:** All logs under `.tick/logs/` with auto-generated `.gitignore`.
- **TUI:** Ticker TUI is **not** absorbed; tickboard replaces it as the visual interface.
- **Run mode:** `tk run` is headless-only (no `--headless` flag needed).
- **Tickboard:** Absorbed into `tk board` command; enhanced to show streaming agent output and detailed run status.

## Directory Structure

```
.tick/
├── issues/              # ticks (tracked)
├── activity/            # tick mutation audit (tracked)
└── logs/                # runtime logs (NOT tracked via .gitignore)
    ├── runs/            # engine debug JSONL - per run timestamp
    ├── records/         # task completion JSON - per tick ID
    ├── checkpoints/     # resume state JSON - per checkpoint ID
    └── context/         # cached epic context MD - per epic ID
```

**Tracking policy:**
- `issues/` + `activity/` = issue tracker data (travels with repo)
- `logs/` = runtime state (local machine, ephemeral, regeneratable)

**Auto-gitignore:** `tk init` creates `.tick/.gitignore` containing `logs/`.

## Phase 0: CLI Foundation (Cobra migration) ✅
**Why:** `ticker` already uses Cobra; adopting it in `ticks` provides a clean subcommand structure for `run/resume/checkpoints/merge` and removes manual flag plumbing.

**Tasks:**
- Introduce Cobra root command for `tk`.
- Port existing `tk` subcommands to Cobra commands:
  - `init`, `whoami`, `show`, `create`, `block`, `unblock`, `update`, `close`, `reopen`, `note`, `notes`, `list`, `ready`, `next`, `blocked`, `rebuild`, `delete`, `label`, `labels`, `deps`, `status`, `merge-file`, `stats`, `view`, `snippet`, `import`, `approve`, `reject`, `version`, `upgrade`.
- Preserve current flags, exit codes, and behavior.

**Status:** Complete (epic 8un)

## Phase 1: Absorb Tickboard ✅
Move tickboard into `ticks` as the `tk board` command.

**Tasks:**
- Move `cmd/tickboard/` → `cmd/tk/cmd/board.go` (Cobra subcommand).
- Move `internal/tickboard/` → `internal/board/`.
- Move `web/` assets into `internal/board/web/` (embedded via `//go:embed`).
- Update imports to `github.com/pengelbrecht/ticks/...`.
- Preserve existing tickboard functionality (SSE, API endpoints, static serving).

**Result:** `tk board` launches the tickboard server; no standalone `tickboard` binary.

## Phase 2: Package Merge (Engine + Runner) ✅
Move the following packages from `ticker/internal/` to `ticks/internal/`:
- `engine` → `internal/engine`
- `agent` → `internal/agent`
- `worktree` → `internal/worktree`
- `verify` → `internal/verify`
- `budget` → `internal/budget`
- `checkpoint` → `internal/checkpoint`
- `parallel` → `internal/parallel`
- `runlog` → `internal/runlog`

**Note:** Ticker's `internal/tui` is **not** merged. However, the following data structures from it are needed by tickboard and should be moved to appropriate packages:
- `TaskInfo` → `internal/engine` or `internal/runlog`
- `RunRecord`, `ToolRecord`, `MetricsRecord` → `internal/agent` (already there)
- `ToolActivityInfo` → `internal/agent`
- Message types for streaming (`OutputMsg`, `IterationStartMsg`, etc.) → `internal/engine`

Update imports to `github.com/pengelbrecht/ticks/...`.

**Status:** Complete (epic ote)

## Phase 3: Replace `tk` Exec with In-Process Store Access ✅
`ticker/internal/ticks/client.go` shells out to `tk`. In the merged codebase, replace this with direct access to:
- `internal/tick` (store + schema)
- `internal/query` (filtering and selection)

This removes the `tk` process dependency and simplifies the runner loop.

**Status:** Complete (epic h66)

## Phase 4: Unified Logging Structure

**Goal:** Consolidate all logging under `.tick/` with clear separation between tracked issue data and ephemeral runtime logs.

### Directory Migration

| Old Path | New Path | Package |
|----------|----------|---------|
| `.ticker/runs/` | `.tick/logs/runs/` | `internal/runlog` |
| `.ticker/checkpoints/` | `.tick/logs/checkpoints/` | `internal/checkpoint` |
| `.ticker/context/` | `.tick/logs/context/` | `internal/context` |
| (embedded in tick JSON) | `.tick/logs/records/` | `internal/runrecord` |

### Tasks

1. **Create `internal/runrecord` package** — Store `agent.RunRecord` as `.tick/logs/records/<tick-id>.json`
2. **Update `internal/runlog`** — Change path from `.ticker/runs/` to `.tick/logs/runs/`
3. **Update `internal/checkpoint`** — Change path from `.ticker/checkpoints/` to `.tick/logs/checkpoints/`
4. **Update `internal/context`** — Change path from `.ticker/context/` to `.tick/logs/context/`
5. **Update `ticks.Client`** — Use `runrecord.Store` instead of embedding in tick JSON
6. **Migrate existing data** — Move files from `.ticker/` to `.tick/logs/`
7. **Update `tk init`** — Create `.tick/.gitignore` with `logs/` entry
8. **Remove `.ticker/` references** — Delete old directory after migration

### Log Retention & Cleanup

Implement `internal/gc.Cleanup(maxAge time.Duration)` to clean ephemeral data:

| Path | Contents | Action |
|------|----------|--------|
| `.tick/activity/activity.jsonl` | Tick change log | Trim entries older than `maxAge` |
| `.tick/logs/records/*.json` | Completed run records | Delete files older than `maxAge` |
| `.tick/logs/records/*.live.json` | In-progress runs | **Skip** (never delete) |
| `.tick/logs/runs/*.jsonl` | Engine debug logs | Delete files older than `maxAge` |
| `.tick/logs/checkpoints/*.json` | Checkpoint files | Delete files older than `maxAge` |
| `.tick/logs/context/*.md` | Cached context docs | Delete files older than `maxAge` |

**Behavior:**
- Default `maxAge`: 30 days.
- Called async (non-blocking) at `tk run` and `tk board` startup.
- Optional `tk gc` command for manual cleanup with `--dry-run` and `--max-age` flags.

## Phase 5: Tickboard Enhancement
**Goal:** Tickboard replaces ticker TUI as the visual interface for monitoring runs.

**New APIs:**
- `GET /api/run-stream/<epic-id>` — SSE endpoint for streaming agent output.
- `GET /api/run-status/<epic-id>` — Current run state (iteration, tokens, active tool, etc.).
- `GET /api/records/<tick-id>` — Completed run record for a task.

**Engine Integration:**
- Engine writes streaming output to `.tick/logs/records/<tick-id>.live.json` during runs.
- Tickboard server watches this file and relays updates via SSE.
- On run completion, `.live.json` is finalized to `.json` and broadcast.

**Browser UI Enhancements:**
- Streaming output pane (live agent stdout/stderr).
- Tool activity indicator (current tool, input preview, duration).
- Token/cost metrics display (input, output, cache read, cache creation, cost).
- Verification status display.
- Run history view for completed tasks (expandable RunRecord details).

**Data Structures to Support:**
- `TaskInfo` — task status, blocked state, awaiting type, current indicator.
- `ToolActivityInfo` — active tool name, input, start time, duration, error state.
- `RunRecord` — session metadata, output, thinking, tools log, metrics, success/error.
- Live metrics — input/output tokens, cache tokens, model, status.

## Phase 6: CLI Surface Integration
Add runner commands to `tk`:
- `tk run [epic-id...]` — Run agent loop (headless-only).
- `tk resume <checkpoint-id>` — Resume from checkpoint.
- `tk checkpoints [epic-id]` — List checkpoints.
- `tk merge <epic-id>` — Merge completed epic branch.
- `tk board` — Launch tickboard server (absorbs `cmd/tickboard`).
- `tk gc` — Manual log cleanup with `--dry-run` and `--max-age` flags.

Map flags from `ticker` (excluding `--headless`):
- `--max-iterations`, `--max-cost`, `--checkpoint-interval`, `--max-task-retries`
- `--auto`, `--jsonl`, `--skip-verify`, `--verify-only`
- `--worktree`, `--parallel`, `--watch`, `--timeout`, `--poll`, `--debounce`
- `--include-standalone`, `--include-orphans`, `--all`

## Phase 7: Update/Install Cleanup
- Remove `ticker` installer and updater references.
- Ensure `ticks/internal/update` handles all update checks + upgrade.
- Update `ticks` install scripts to include runner in release artifacts.

## Phase 8: Docs + Repo Cleanup
- Update `ticks/README.md` and `ticks/SPEC.md` to describe runner features.
- Document `tk run`, `tk board`, `tk gc` commands.
- Remove `ticker` repo (archive or delete).

## Phase 9: Skill Migration
Convert `ticker/skills/ticker/` to a unified skill in `ticks/skills/ticks/`.

**Current skill covers:**
- Spec creation workflow (SPEC.md)
- Tick creation from specs (TDD patterns)
- Manual task handling
- Running ticker (headless + TUI modes)
- Handoff signal protocol (COMPLETE, EJECT, BLOCKED, etc.)
- Human feedback workflows (approve/reject/input)
- Pre-declared gates (`requires` field)

**Updates for new architecture:**
- Single installation: `tk` binary only (no separate `ticker` install)
- Remove TUI references: `tk run` is headless-only
- Add `tk board` for visual monitoring
- Add `tk gc` for log cleanup
- Update command examples throughout
- Consolidate `tk` and `ticker` command references into unified `tk` reference

**Files to migrate:**
- `ticker/skills/ticker/SKILL.md` → `ticks/skills/ticks/SKILL.md`
- `ticker/skills/ticker/references/tk-commands.md` → `ticks/skills/ticks/references/tk-commands.md` (update with runner commands)
- `ticker/skills/ticker/references/tick-patterns.md` → `ticks/skills/ticks/references/tick-patterns.md`

## Deliverables Checklist
- [x] Cobra-based `tk` CLI with all existing commands preserved
- [x] `tk board` command (replaces standalone tickboard binary)
- [x] Runner engine + agent packages under `ticks/internal/`
- [x] No shelling out to `tk` from within `tk`
- [x] Unified logging under `.tick/logs/` (runs, records, checkpoints, context)
- [x] Auto-generated `.tick/.gitignore` with `logs/` entry
- [x] Migration from `.ticker/` to `.tick/logs/`
- [x] Log cleanup on `tk run`/`tk board` startup (30-day retention)
- [x] `tk gc` command for manual cleanup
- [x] Tickboard enhanced with streaming output and run status
- [x] `tk run` is headless-only
- [x] All `ticker` runner commands available as `tk` subcommands
- [x] Unified `ticks` skill in `ticks/skills/ticks/` (replaces `ticker` skill)
- [ ] `ticker` repo no longer required
