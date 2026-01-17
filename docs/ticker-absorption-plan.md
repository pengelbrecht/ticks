# Ticker Absorption Plan (into ticks)

## Goal
Absorb the `ticker` project into `ticks` so there is only one CLI (`tk`) and one codebase. The ticker TUI is replaced by tickboard (web-based). No `ticker` binary, repo, installer, or updater remains.

## Decisions (Locked)
- **CLI framework:** Cobra (migrate existing `tk` commands to Cobra).
- **Run logs:** Stored as separate files under `.tick/runlog/` (not embedded in tick JSON).
- **TUI:** Ticker TUI is **not** absorbed; tickboard replaces it as the visual interface.
- **Run mode:** `tk run` is headless-only (no `--headless` flag needed).
- **Tickboard:** Absorbed into `tk board` command; enhanced to show streaming agent output and detailed run status.

## Phase 0: CLI Foundation (Cobra migration) ✅
**Why:** `ticker` already uses Cobra; adopting it in `ticks` provides a clean subcommand structure for `run/resume/checkpoints/merge` and removes manual flag plumbing.

**Tasks:**
- Introduce Cobra root command for `tk`.
- Port existing `tk` subcommands to Cobra commands:
  - `init`, `whoami`, `show`, `create`, `block`, `unblock`, `update`, `close`, `reopen`, `note`, `notes`, `list`, `ready`, `next`, `blocked`, `rebuild`, `delete`, `label`, `labels`, `deps`, `status`, `merge-file`, `stats`, `view`, `snippet`, `import`, `approve`, `reject`, `version`, `upgrade`.
- Preserve current flags, exit codes, and behavior.

**Status:** Complete (epic 8un)

## Phase 1: Absorb Tickboard
Move tickboard into `ticks` as the `tk board` command.

**Tasks:**
- Move `cmd/tickboard/` → `cmd/tk/cmd/board.go` (Cobra subcommand).
- Move `internal/tickboard/` → `internal/board/`.
- Move `web/` assets into `internal/board/web/` (embedded via `//go:embed`).
- Update imports to `github.com/pengelbrecht/ticks/...`.
- Preserve existing tickboard functionality (SSE, API endpoints, static serving).

**Result:** `tk board` launches the tickboard server; no standalone `tickboard` binary.

## Phase 2: Package Merge (Engine + Runner)
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

## Phase 3: Replace `tk` Exec with In-Process Store Access
`ticker/internal/ticks/client.go` shells out to `tk`. In the merged codebase, replace this with direct access to:
- `internal/tick` (store + schema)
- `internal/query` (filtering and selection)

This removes the `tk` process dependency and simplifies the runner loop.

## Phase 4: Run Log Storage (Separate Files)
**New storage path:** `.tick/runlog/<tick-id>.json`

**Tasks:**
- Define runlog schema (reuse `agent.RunRecord`).
- Implement read/write helpers in `internal/runlog`.
- Update engine usage to store run logs via `runlog` package.
- For in-progress runs, write to `.tick/runlog/<tick-id>.live.json` (deleted on completion).

### Log Retention & Cleanup
Implement `internal/gc.Cleanup(maxAge time.Duration)` to clean all temporary/log data:

| Path | Contents | Action |
|------|----------|--------|
| `.tick/activity/activity.jsonl` | Tick change log | Trim entries older than `maxAge` |
| `.tick/runlog/*.json` | Completed run records | Delete files older than `maxAge` |
| `.tick/runlog/*.live.json` | In-progress runs | **Skip** (never delete) |
| `.ticker/checkpoints/` | Checkpoint files | Delete files older than `maxAge` |

**Behavior:**
- Default `maxAge`: 30 days.
- Called async (non-blocking) at `tk run` and `tk board` startup.
- Optional `tk gc` command for manual cleanup with `--dry-run` and `--max-age` flags.

## Phase 5: Tickboard Enhancement
**Goal:** Tickboard replaces ticker TUI as the visual interface for monitoring runs.

**New APIs:**
- `GET /api/run-stream/<epic-id>` — SSE endpoint for streaming agent output.
- `GET /api/run-status/<epic-id>` — Current run state (iteration, tokens, active tool, etc.).
- `GET /api/runlog/<tick-id>` — Completed run record for a task.

**Engine Integration:**
- Engine writes streaming output to `.tick/runlog/<tick-id>.live.json` during runs.
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
- [ ] `tk board` command (replaces standalone tickboard binary)
- [ ] Runner engine + agent packages under `ticks/internal/`
- [ ] No shelling out to `tk` from within `tk`
- [ ] Run logs stored in `.tick/runlog/`
- [ ] Log cleanup on `tk run`/`tk board` startup (30-day retention)
- [ ] `tk gc` command for manual cleanup
- [ ] Tickboard enhanced with streaming output and run status
- [ ] `tk run` is headless-only
- [ ] All `ticker` runner commands available as `tk` subcommands
- [ ] Unified `ticks` skill in `ticks/skills/ticks/` (replaces `ticker` skill)
- [ ] `ticker` repo no longer required
