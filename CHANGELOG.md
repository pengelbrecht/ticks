# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
