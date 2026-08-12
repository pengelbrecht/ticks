# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Normalized `ExitNoRepo` / `ExitNotFound` across every command** — `approve`, `reject`, `merge` and the `tk herd` family already returned typed exit codes for "not in a git repository" (3) and "no such tick" (4); the ~25 other commands wrapped the identical failures with a bare `fmt.Errorf` and exited 1, so an orchestrator could not branch on either condition without parsing message text. Classification is now central: `repoRoot()` itself returns `ExitError{ExitNoRepo}`, and every tick lookup goes through `notFoundIfMissing`, so a command added later inherits the codes instead of opting in. No condition changed from success to failure or vice versa — only the code each failure reports. Observable changes:
  - `tk init`, `create`, `show`, `update`, `close`, `reopen`, `delete`, `block`, `unblock`, `note`, `notes`, `list`, `ready`, `next`, `blocked`, `label add|rm|list`, `labels`, `deps`, `graph`, `roadmap`, `status`, `stats`, `rebuild`, `migrate`, `gc`, `import` and `tui` run outside a git repository now exit **3 (no repo) instead of 1**. Rationale: exit 1 is "the command ran and failed"; an orchestrator that sees 3 knows to fix the working directory rather than retry or escalate.
  - `tk skills install` / `tk skills diff` with no `--dir` and no enclosing git repository now exit **3 instead of 1**, matching every other command's no-repo failure. Rationale: the two commands' own `--help` used to fold "not inside a repo" together with "neither convention directory exists", which are different faults with different fixes (chdir/`--dir` vs. create a skills directory); the latter still exits 1.
  - `tk show`, `update`, `close`, `reopen`, `delete`, `note`, `notes`, `deps`, `graph`, `label add|rm|list`, `block` (target or any blocker) and `unblock` given an id that names no tick now exit **4 (not found) instead of 1**. Rationale: "this id does not exist" is a recoverable, distinguishable outcome — an orchestrator can create the tick or correct the id — and reporting it as a generic failure sent every such caller down the retry path.
  - `tk roadmap <epic>` for an epic absent from the roadmap now exits **4 instead of 1**, for the same reason.
  - Unchanged on purpose: a tick file that exists but cannot be read or parsed still exits 1, never 4 — this is the boundary `tk herd collect` already draws for run manifests, because a caller reading 4 as "never created" would act on damaged state instead of stopping.

## [0.21.0] - 2026-08-12

### Added

- **`tk skills` command group** — the tk binary now serves its own skills, version-matched by construction (`go:embed` of the skills tree at build time): `tk skills list`, `tk skills get <name> [--full]`, detection-first `tk skills install <name>` (installs into every convention directory present at the repo root — `.claude/skills/`, `.agents/skills/` — with a version stamp, unmanaged-directory refusal, atomic swap, and stale-temp sweep; `--dir` for explicit targets), and `tk skills diff <name>` (per-target drift report, aggregate exit).
- **Mission-control dashboard auto-refresh** — `tk herd dashboard` now watches `.tick/issues` and the herd run manifests with fsnotify, so tracker changes (claims, closes, new workers) appear within ~1s without a keypress; the 30-second re-list is demoted to a safety net.

### Fixed

- **`tk herd wait` deadline classification (final form)** — the 0.20.1 fix left a timer race between the context's deadline and deadline-induced dial errors; guards now compare wall-clock against the context deadline, which cannot race. Reproduced and fixed during this release's own herd-orchestrated development run.
- **Herd worker prompt template** — two hardening rules from production worker behavior: the final test gate must run in the foreground (harness-internal background tasks are invisible to herdr's lifecycle and read as a settled worker), and the worker's RESULT report stays uncommitted (run state, not repo content).


## [0.20.1] - 2026-08-12

### Fixed

- **`tk herd wait` deadline boundary** — when the event stream died just before the overall timeout and the recovery re-list was cut off by it, `Wait` returned the recovery error instead of the documented timeout summary. The deadline now wins: recovery failures with an expired context report `TimeoutFired` with last-known worker states. (Also fixed a test-fake hook-ordering race that masked this as CI flakiness.)

## [0.20.0] - 2026-08-12

### Added

- **Herdr substrate for epic orchestration** — the ticks skill now has a second dispatch axis: `.tick/runners.toml` selects `substrate = "herdr" | "harness" | "auto"`, letting any harness orchestrating an epic dispatch implementers as heterogeneous herdr-managed agents (any herdr kind, cross-vendor) with read-only availability probing and explicit graceful fallback to harness-native subagents. Worker spec is two-dimensional (`kind` × `model`/`effort`) compiled per kind to native argv, fail-closed on impossible cells. New references: `herdr-runner.md`, `herdr-kinds.md`, `runners-config.md` (+ JSON schema).
- **`tk herd` command group** — deterministic helpers for herdr-substrate runs: `spawn` (worktree + agent + content-gated first prompt + atomic run manifest), `wait` (event-driven wave fan-in over `events.subscribe`, no polling), `collect` (durable-result verdicts, never merges), `cleanup` (`--preview` default, apply-time liveness re-check, focus restore), `reconcile` (five-class crash-recovery plan, read-only), `paint` (workspace metadata badges), `dashboard` (live event-driven epic board TUI), `notify` (edge-triggered blocked/wave-complete notifications). Built on a typed herdr socket client (protocol 19, fail-closed on drift).
- **herdr-ticks mission-control plugin** (`plugins/herdr-ticks`) — board pane, worker-workspace badges via confirmed-firing event hooks, request/done-sound notifications, actions (open worktree, collect verdict, retry advice, open board), `ticks://` link handler. Live smoke scripts: `scripts/verify-herd-helper.sh`, `scripts/verify-herd-plugin.sh`.
- **Pi Ticks orchestrator package** — the root Pi package now distributes the ticks skill and the Ticks-specific runner extension for local-path or git installation. It provides explicit opt-in epic execution, parallel isolated worktrees, model routing, durable reports/manifests, bounded recovery/status, and a TUI/RPC dashboard.
- **Safe automated `/ticks-plan`** — model-running dry-run launches bounded parallel read-only scouts and frontier `xhigh` synthesis, strictly validates versioned implementation-plan JSON and wave file safety, and persists telemetry without tracker writes. Explicit confirmed `--apply` creates/verifies one epic through an argv-safe controller, maps dependencies, adds canonical process roles, commits tracker state, and recovers partial application idempotently.
- **Pi operator documentation** — installation, exact commands and defaults, `.tick/config.md` keys, dashboard controls, artifacts, boundary hardening, recovery playbook, tests, and process-tick limitations are now documented in the runner README, skill adapter, and repository wiki.
- **Disposable real-run proof** — a safe explicit harness builds a temporary real `tk` repository, supervises actual Pi implementation/review/closeout subprocesses, verifies artifacts/boundary/merge/close/cleanup, retains evidence outside the source checkout, and removes the temporary state. Ordinary tests use its no-model dry validator.

### Changed

- **Deterministic implementation capability routing** — public graph tasks now include description, acceptance criteria, type, and labels. The Pi runner selects configured economy/balanced/strong tiers from tracker metadata and conservative task shape, records its reason in plans/dashboards/reports, and keeps review/closeout execution reserved.
- **Recovery status semantics** — tracker active aliases are normalized while awaiting, failed/partial, completed cleanup debt, terminal lane history, and manifest history remain distinct.
- **Typed exit-code classification** — `tk`'s exit code now comes only from an `ExitError` found in the error's unwrap chain (`errors.As`); the message-substring heuristics that used to infer exit 2 from text like `accepts N arg(s)`, `unknown flag`, or `invalid argument` are gone. Cobra's flag-parse failures and positional-argument validators are converted to `ExitError{Usage}` where they occur, so genuine command-line mistakes still exit 2. Two observable changes follow:
  - A failure whose message merely *contains* `invalid argument` or `unknown flag` — most importantly a unix-socket dial failure (`connect: invalid argument`) from an unreachable herdr, but equally an `EINVAL` from the filesystem or a git subprocess echoing those words — now exits **1 (generic failure) instead of 2 (usage)**. Rationale: exit 2 tells an orchestrator to fix its command line; the command line was correct and the fault was environmental, so the old code sent every such caller down the wrong recovery path.
  - A command that takes no positional arguments (`tk list stray`, `tk status extra`, …) now exits **2 instead of 1**. Rationale: `cobra.NoArgs` phrases its rejection as `unknown command …`, which matched none of the old substrings, so an arity mistake that every sibling validator reported as usage was reported as a run failure.

### Fixed

- **Semantically scoped closeout evidence** — tracker acceptance remains prose; closeout now requires bounded controller-owned `Acceptance Evidence` mappings from stable item IDs to exact Testing commands. Missing, stale, cross-item, and generic-for-unmapped-item proof fails closed instead of receiving Cartesian test evidence.
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
