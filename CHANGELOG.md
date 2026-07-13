# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Pi Ticks orchestrator package** — the root Pi package now distributes the ticks skill and the Ticks-specific runner extension for local-path or git installation. It provides explicit opt-in epic execution, parallel isolated worktrees, model routing, durable reports/manifests, bounded recovery/status, and a TUI/RPC dashboard.
- **Safe automated `/ticks-plan`** — model-running dry-run launches bounded parallel read-only scouts and frontier `xhigh` synthesis, strictly validates versioned implementation-plan JSON and wave file safety, and persists telemetry without tracker writes. Explicit confirmed `--apply` creates/verifies one epic through an argv-safe controller, maps dependencies, adds canonical process roles, commits tracker state, and recovers partial application idempotently.
- **Pi operator documentation** — installation, exact commands and defaults, `.tick/config.md` keys, dashboard controls, artifacts, boundary hardening, recovery playbook, tests, and process-tick limitations are now documented in the runner README, skill adapter, and repository wiki.

### Changed

- **Deterministic implementation capability routing** — public graph tasks now include description, acceptance criteria, type, and labels. The Pi runner selects configured economy/balanced/strong tiers from tracker metadata and conservative task shape, records its reason in plans/dashboards/reports, and keeps review/closeout execution reserved.
- **Recovery status semantics** — tracker active aliases are normalized while awaiting, failed/partial, completed cleanup debt, terminal lane history, and manifest history remain distinct.

### Fixed

- **Pi process-tree cancellation** — supervised children and configured commands use POSIX process groups with TERM/KILL escalation (and a Windows-safe fallback); graceful extension shutdown aborts and awaits active run settlement.

## [0.19.0] - 2026-07-02

### Added

- **Structural EPIC-SKELETON detection** — new optional `role` field on ticks (`review` | `closeout`) marking an epic's two process ticks (final review, close-out/retro). Set with `tk create --role` / `tk update --role` (rejected on epics themselves; `--role ""` clears). `tk graph <epic> --json` now returns `missing_process_ticks` — the skeleton roles no child tick carries — so orchestrators detect and repair an incomplete epic skeleton mechanically instead of by title-matching; human output warns inline. Wave tasks in `tk graph --json` and `tk next --json` results carry `role` so review/close-out ticks route without prose parsing. Empty for childless epics (there `needs_planning` is the signal; planning creates the skeleton).

## [0.18.1] - 2026-06-20

### Fixed

- `tk tui --help` text was stale (described only the List view and a read-only detail pane). It now accurately lists all four views (List, Board, Roadmap, Timeline), the editable detail pane, and the Ctrl-K command palette.

## [0.18.0] - 2026-06-20

### Added

- **Big-picture hierarchy** — generic `tick → epic → project` containers with role derivation (epic = run-as-a-unit, bucket = passive grouping, project = checkpoint boundary). Containment is free and passive; orchestration is opt-in.
- **Target dates** — optional `target_date` (precise ISO day) on any tick, with a derived overdue / on-track slip signal. New `tk create/update --target-date` and `tk list --overdue` / `--due-before` / `--sort target_date`.
- **Recursive continuation + project checkpoints** — the orchestration frontier ascends the project tree; project boundaries stop on a checkpoint by default. New global autonomous mode (`tk next --autonomous`, `policy.autonomous_mode`) flows through checkpoint boundaries only.
- **`tk tui` unified terminal app** — a persistent shell with a navigation sidebar (smart views + project tree), swappable **List / Board / Roadmap / Timeline** views, a ⌘K command palette, inline editing through the store, mouse support, and persisted UI state.

### Changed

- **BREAKING:** `tk view` has been removed and replaced by `tk tui`, the unified terminal app. There is no `view` alias; update any scripts invoking `tk view`.

## [0.7.0] - 2025-01-23

### Added

- **Parallel task execution** - Run multiple tasks simultaneously with `tk run --parallel N`, enabling faster epic completion by processing independent tasks concurrently
- **Git worktree isolation** - Use `--worktree` flag to run parallel tasks in isolated git worktrees, preventing file conflicts between agents
- **Dependency wave visualization** - `tk graph <epic>` shows tasks organized into parallelizable waves, helping plan concurrent execution
- **Cloud sync** - Real-time synchronization with [ticks.sh](https://ticks.sh) via `tk run --cloud` for remote board access
- **Project rooms** - Cloudflare Durable Objects enable multi-device collaboration on tick boards

### Changed

- Removed standalone `tk board` command; board is now integrated into `tk run --board`

## [0.6.0] - 2025-01-20

### Added

- `tk graph` command for epic dependency visualization with wave analysis
- Shows parallelization opportunities and critical path length

## [0.5.1] - 2025-01-15

### Added

- Styled terminal output with colors and icons for better readability
- Context generation status display in tickboard live panel

### Fixed

- Live run panel now has fixed height with scroll
- First line alignment in live output panel
- Repo name displays with "/" instead of "--" in tickboard

## [0.5.0] - 2025-01-10

### Added

- Tickboard web UI with real-time SSE updates
- Kanban columns: Blocked, Agent Queue, In Progress, Needs Human, Done
- Keyboard navigation (`hjkl`, `?` for help)
- PWA support for offline use

## [0.4.0] - 2025-01-05

### Added

- Agent-human workflow with awaiting states (work, approval, input, review, content, checkpoint, escalation)
- `tk approve` and `tk reject` commands for human review
- `--requires` and `--awaiting` flags for creating human-in-the-loop tasks

## [0.3.0] - 2024-12-20

### Added

- Watch mode with `tk run --watch` for continuous execution
- Auto-restart when tasks become ready
- Cost tracking with `--max-cost` budget limits

## [0.2.0] - 2024-12-10

### Added

- `tk run` command for AI agent execution on epics
- Checkpoint system for resuming interrupted runs
- JSONL output format with `--jsonl` flag

## [0.1.0] - 2024-12-01

### Added

- Initial release
- Core issue tracker with `tk create`, `tk update`, `tk close`
- Multiplayer support with owner scoping
- Git-native storage with custom merge driver
- `tk ready`, `tk next`, `tk list` commands
- JSON output for all commands
- Homebrew installation support
