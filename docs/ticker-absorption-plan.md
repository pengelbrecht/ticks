# Ticker Absorption Plan (into ticks)

## Goal
Absorb the `ticker` project into `ticks` so there is only one CLI (`tk`), one codebase, and one TUI. No `ticker` binary, repo, installer, or updater remains.

## Decisions (Locked)
- **CLI framework:** Cobra (migrate existing `tk` commands to Cobra).
- **Run logs:** Stored as separate files under `.tick/runlog/` (not embedded in tick JSON).
- **TUI:** Single split-pane UI (ticks list on left, runner output/status on right).

## Phase 0: CLI Foundation (Cobra migration)
**Why:** `ticker` already uses Cobra; adopting it in `ticks` provides a clean subcommand structure for `run/resume/checkpoints/merge` and removes manual flag plumbing.

**Tasks:**
- Introduce Cobra root command for `tk`.
- Port existing `tk` subcommands to Cobra commands:
  - `init`, `whoami`, `show`, `create`, `block`, `unblock`, `update`, `close`, `reopen`, `note`, `notes`, `list`, `ready`, `next`, `blocked`, `rebuild`, `delete`, `label`, `labels`, `deps`, `status`, `merge-file`, `stats`, `view`, `snippet`, `import`, `approve`, `reject`, `version`, `upgrade`.
- Preserve current flags, exit codes, and behavior.

## Phase 1: Package Merge (Engine + Runner)
Move the following packages from `ticker/internal/` to `ticks/internal/`:
- `engine` → `internal/engine`
- `agent` → `internal/agent`
- `worktree` → `internal/worktree`
- `verify` → `internal/verify`
- `budget` → `internal/budget`
- `checkpoint` → `internal/checkpoint`
- `parallel` → `internal/parallel`
- `runlog` → `internal/runlog`

Update imports to `github.com/pengelbrecht/ticks/...`.

## Phase 2: Replace `tk` Exec with In-Process Store Access
`ticker/internal/ticks/client.go` shells out to `tk`. In the merged codebase, replace this with direct access to:
- `internal/tick` (store + schema)
- `internal/query` (filtering and selection)

This removes the `tk` process dependency and simplifies the runner loop.

## Phase 3: Run Log Storage (Separate Files)
**New storage path:** `.tick/runlog/<tick-id>.json`

**Tasks:**
- Define runlog schema (reuse `agent.RunRecord`).
- Implement read/write helpers in `internal/runlog`.
- Update engine/TUI usage to load and store run logs via `runlog` package.
- Remove any mutation of tick JSON for run data.

## Phase 4: TUI Unification (Split Pane)
**Target layout:**
- **Left pane:** Tick list + filters (current `ticks` TUI).
- **Right pane:** Runner output + status (from `ticker` TUI).

**Tasks:**
- Merge TUI models into a single `internal/tui` package.
- Add a “run mode” with streaming output and task status.
- Ensure human workflow actions (approve/reject) remain available.

## Phase 5: CLI Surface Integration
Add runner commands to `tk`:
- `tk run [epic-id...]`
- `tk resume <checkpoint-id>`
- `tk checkpoints [epic-id]`
- `tk merge <epic-id>`

Map all flags from `ticker`:
- `--max-iterations`, `--max-cost`, `--checkpoint-interval`, `--max-task-retries`
- `--auto`, `--headless`, `--jsonl`, `--skip-verify`, `--verify-only`
- `--worktree`, `--parallel`, `--watch`, `--timeout`, `--poll`, `--debounce`
- `--include-standalone`, `--include-orphans`, `--all`

## Phase 6: Update/Install Cleanup
- Remove `ticker` installer and updater references.
- Ensure `ticks/internal/update` handles all update checks + upgrade.
- Update `ticks` install scripts to include runner in release artifacts.

## Phase 7: Docs + Repo Cleanup
- Update `ticks/README.md` and `ticks/SPEC.md` to describe runner features.
- Remove `ticker` repo (archive or delete).

## Deliverables Checklist
- [ ] Cobra-based `tk` CLI with all existing commands preserved
- [ ] Runner engine + agent packages under `ticks/internal/`
- [ ] No shelling out to `tk` from within `tk`
- [ ] Run logs stored in `.tick/runlog/`
- [ ] Single split-pane TUI
- [ ] All `ticker` commands available as `tk` subcommands
- [ ] `ticker` repo no longer required
