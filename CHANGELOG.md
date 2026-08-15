# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.29.0] - 2026-08-15

### Added

- **A claim the diff *writes* is also untested** (`SKILL.md`) — the stale-claims rule catches sentences an epic invalidates; it cannot catch the ones an epic is born with. A tick that adds a safety mechanism usually documents it in the same commit, and that new sentence is asserted rather than tested: it describes what the author intended, which is exactly where an implementation gap hides. Field-observed: a wiki page written by the same epic said an attempts counter "keeps a poison row walking the MAX_ATTEMPTS ladder instead of being reclaimed forever", while the code consumed that counter on only one of the two failure paths — the ladder was counted and had no top, so a row whose delivery threw was reclaimed indefinitely. Grepping old files cannot find that one; treating every new invariant sentence as a test that has not been written yet can.

## [0.28.0] - 2026-08-15

### Changed

- **Slimmer dashboard worker rows** — the row repeated itself twice over: the timer prefixed itself with the status the status column already named (`working … working 4m12s`), and the branch was the conventional worktree prefix plus the tick id sitting in the first column. Both are gone; the row now ends in one unlabelled timer, how long the worker has been alive. A worker whose manifest carries no parseable spawn time renders no timer rather than a zero duration that would read as "just spawned". The branch and the time-in-current-status both remain in the tick detail view, which has room for them. The timer advances on the board's existing once-a-second display tick — armed only while some worker is unsettled, so a finished board is still never woken.

## [0.27.0] - 2026-08-15

### Changed

- **The dashboard orders epics by activity and folds finished ones** — an unpinned board lists every epic with run state, and it listed them by id, so on a project run three finished epics filled the screen above the one actually running and their closed ticks pushed the live wave below the fold. Epics now sort by running workers, then open ticks, then id. "Running" excludes `done` and `idle` (herdr's own terminal statuses) and gone workers — a closed epic keeps its `done` manifests until cleanup, so counting them was what pinned finished epics to the top; `blocked` does count, since an agent waiting on a human is the most active thing on the board. The id tiebreak keeps the order stable across the reloads that fire on a timer and on every filesystem event. An epic whose ticks are all closed folds to a single line with its tick count; epic headers are now cursor rows and `enter` on one folds or unfolds it, while `enter` on a tick still opens the detail view. The fold default is decided once per epic on first sight and never re-derived, so an operator's toggle survives the next refresh and an epic that closes its last tick while being watched does not fold up under the cursor.

- **Mission control is no longer pinned to one epic** (`references/herdr-runner.md`) — the run-start ritual passed `--env TICKS_EPIC=<epic>` when opening the dashboard pane, but `tk herd dashboard` with no `--epic` already watches every epic with run state under `.tick/logs/herd/`. Pinning meant the board kept showing a *finished* epic for the rest of a multi-epic run: live workers, live panes, and an operator reasonably concluding the run had stalled. The ritual now opens the board unpinned, and `TICKS_EPIC` is documented as the deliberate single-epic case (which is what the `ticks://` link handler wants).
- **The stall instinct gets an operational test** (`references/agent-runner.md`) — knowing the rule was not enough: an orchestrator that had quoted the "epic boundaries are waypoints" line still stopped after closing an epic mid-project. The rule now states the test — *end a turn on a dispatch, never on a close* — because the retro-and-close is the most satisfying output of a run and reads like a finished task, which is exactly where the stall lands. A turn whose last action was `tk close` on an epic or its close-out is not finished; the close-out's own acceptance is retro **and** flesh out the next feasible epic, so the same turn plans and spawns the next wave or names the blocker.

### Added

- **Callers' claims are a planning-time constraint surface** (`SKILL.md`) — when an epic changes a shared mechanism, the code depending on it carries sentences explaining why *it* is safe (module headers, invariant comments, published docs), and those sentences do not move with the code. Across four consecutive epics in one project, every final review's most-cited finding was a claim the epic had falsified. Grep the mechanism's name and its guarantee words (`safe`, `no-op`, `cannot`, `always`, `only`) during partitioning, list the hits, and give them to a tick the same way you would a seam file.
- **Docs pages are a constraint surface too** (`SKILL.md`) — an epic that changes a subsystem gives several ticks the same reason to fix the same architecture or decision page, and doc edits look harmless during planning precisely because nobody lists them as files touched. Three ticks in one epic rewrote the same two wiki pages in sequence and merged cleanly *by luck*: prose conflicts are textual, so git resolves them silently into an incoherent merge rather than a conflict a human reviews. Name the pages an epic will touch and give each to one tick, or let the close-out own them all.
- **The review phase is invisible to the operator** (`references/herdr-runner.md`) — review is deliberately not a helper capability, so a reviewer is a harness subagent at the controller checkout: it appears in no pane, in `herdr agent list`, on the board, or in the badges. An operator sees the implementers go quiet and then nothing at all for the length of a whole-epic diff review. Two consequences now stated rather than fixed silently: the orchestrator should *say* when it dispatches a review and roughly what it covers, since the board cannot; and unlike a worker, a reviewer does not survive an orchestrator crash — the review tick stays open and is re-reviewed, which is safe because the pass is read-only.

## [0.26.0] - 2026-08-14

### Added

- **Resolved model on the dashboard's worker rows** — `tk herd dashboard` listed each worker's kind (`claude`, `codex`) but not its model, so a board under tier routing could not tell a haiku worker from an opus one; after a cross-vendor tier the kind is the only thing that changes, making the model the field an operator actually wants. The workers section now carries a model column beside the kind. The value is the *resolved* capability dimension recorded in the run manifest, and an empty one renders as an em dash — the kind's own default, never a substituted name — matching what the tick detail view already showed.

## [0.25.0] - 2026-08-14

### Added

- **Project-level goal design** (`skills/ticks/references/goal-design.md`) — a protocol for turning an idea into a verifiable project goal *before* any epic is planned: rearticulate → interview → fact sheet → write-back → verify. Pure skill-layer convention, no new tick fields and no CLI commands: the goal statement lives in the project's description and the fact sheet as `[A<n>]`-marked lines in its `acceptance_criteria`. Epics already had the full goal→plan→work→verify loop; projects had the middle but not the ends — a free-text description going in and a checkpoint coming out with nothing stated to check against. The project checkpoint now walks the facts item by item under the same fail-closed evidence rules as epic close-out, and autonomous mode's flow-through becomes conditional: verification failure outranks it. Keep `A<n>` IDs unique across containers — `.tick/config.md` Acceptance Evidence is one namespace and ambiguity fails closed.
- **Human-in-the-loop planning rules** (`skills/ticks/references/tick-patterns.md`) — *planning is interactive, execution is autonomous.* Human attention is spent during planning, where the human is present and latency is zero; a human tick surviving into execution should be one planning genuinely could not resolve. Adds a three-way triage of every anticipated human touchpoint (resolve questions now, do human setup tasks now, reduce approvals by converting to a test / pre-authorizing / agreeing the bar / batching), a frontier-based question algorithm (compute the frontier of decisions whose prerequisites are settled, prune branches the work itself will answer, look facts up rather than asking, ask the whole frontier in one numbered message with a recommendation each, repeat until empty), graph-shaping rules for the survivors (ask early / block late, split around the decision, target the interface, scrutinize gate edges), a Step 6 in the foundation-first procedure, a *no unresolved decisions* line in the Definition of Ready, and two anti-patterns. The epic retro now treats a mid-run `--awaiting input`/`escalation` as a planning-quality signal into `.tick/learnings.md`.

### Fixed

- **Only a human can clear a human gate** — `ProcessVerdict` closed an `awaiting work` tick on any `approved` verdict without checking the actor, so an orchestrator running as `TK_ACTOR=<runner>:orchestrator` could `tk approve` its own human tick; the tick graph's "a human must do this" edge had no teeth at the state-machine layer, and the routing error even advertised `tk close --force` as a bypass. A verdict from a runner-shaped actor (colon-scoped, or ending in `orchestrator`) is now refused on `tk approve`, `tk reject`, `tk update --verdict`, `tk close --force` over a `--requires` gate, plain `tk close` on an already-`--awaiting` tick, and an epic `--force` cascade over any gated child. `--actor` is provenance rather than authorization, so a runner-shaped `--actor` is refused too. Unchanged: `tk close` on a `--requires` tick that has not been routed yet still routes it to a human — the agent's normal path. `--from human` is the only attestation and stamps the activity actor `human` rather than the runner name, the same durable provenance boundary `tk note --from human` already established. The state machine stays pure: it is shared by the CLI, TUI, tickboard server and cloud client, which have different provenance stories, so the check lives at the write path. This is deliberately not tamper-proof — a local CLI cannot stop an agent from typing the flag — so epic close-out gains a **gate audit** asserting every gated tick was cleared by a human actor, fail-closed like Acceptance Evidence.

## [0.24.0] - 2026-08-13

### Added

- **opencode as a verified worker kind** — `kind = "opencode"` in `.tick/runners.toml` (second cross-provider kind): `--auto` full-auto template, provider-qualified `--model` ids, `-s` flag resume, no sandbox restrictions. Effort levels are refused for this kind (opencode's variant mechanism is config-side; escape hatch documented). Includes a strict model-family check because opencode silently substitutes its default model for unresolvable ids — verify the pane footer's model name, not just the first answer.


## [0.23.0] - 2026-08-13

### Added

- **Dashboard tick detail view** — Enter on the cursor-selected tick opens a read-only detail view (description, acceptance criteria, blockers, worker info with elapsed timers); esc returns; content live-refreshes while open. The board's selection cursor now has a purpose.


## [0.22.0] - 2026-08-12

### Added

- **Dashboard worker timers** — each worker row in `tk herd dashboard` now carries an elapsed-time summary (`working 4m12s · age 9m01s`): time in the current status, and total age since the manifest was written. A worker stuck in one status is the thing an operator is watching for, and a static status column never showed it.

### Changed

- **Normalized `ExitNoRepo` / `ExitNotFound` across every command** — `approve`, `reject`, `merge` and the `tk herd` family already returned typed exit codes for "not in a git repository" (3) and "no such tick" (4); the ~25 other commands wrapped the identical failures with a bare `fmt.Errorf` and exited 1, so an orchestrator could not branch on either condition without parsing message text. Classification is now central: `repoRoot()` itself returns `ExitError{ExitNoRepo}`, and every tick lookup goes through `notFoundIfMissing`, so a command added later inherits the codes instead of opting in. No condition changed from success to failure or vice versa — only the code each failure reports. Observable changes:
  - `tk init`, `create`, `show`, `update`, `close`, `reopen`, `delete`, `block`, `unblock`, `note`, `notes`, `list`, `ready`, `next`, `blocked`, `label add|rm|list`, `labels`, `deps`, `graph`, `roadmap`, `status`, `stats`, `rebuild`, `migrate`, `gc`, `import` and `tui` run outside a git repository now exit **3 (no repo) instead of 1**. Rationale: exit 1 is "the command ran and failed"; an orchestrator that sees 3 knows to fix the working directory rather than retry or escalate.
  - `tk skills install` / `tk skills diff` with no `--dir` and no enclosing git repository now exit **3 instead of 1**, matching every other command's no-repo failure. Rationale: the two commands' own `--help` used to fold "not inside a repo" together with "neither convention directory exists", which are different faults with different fixes (chdir/`--dir` vs. create a skills directory); the latter still exits 1.
  - `tk show`, `update`, `close`, `reopen`, `delete`, `note`, `notes`, `deps`, `graph`, `label add|rm|list`, `block` (target or any blocker) and `unblock` given an id that names no tick now exit **4 (not found) instead of 1**. Rationale: "this id does not exist" is a recoverable, distinguishable outcome — an orchestrator can create the tick or correct the id — and reporting it as a generic failure sent every such caller down the retry path.
  - `tk roadmap <epic>` for an epic absent from the roadmap now exits **4 instead of 1**, for the same reason.
  - Unchanged on purpose: a tick file that exists but cannot be read or parsed still exits 1, never 4 — this is the boundary `tk herd collect` already draws for run manifests, because a caller reading 4 as "never created" would act on damaged state instead of stopping.

### Fixed

- **Codex workers can commit from a linked worktree** — a codex worker started with the verified full-auto pair (`-a never -s workspace-write`) did its work and then could not commit it: a linked worktree's `.git` is a file pointing at `<git-common-dir>/worktrees/<name>/`, so the index, refs and objects a commit writes all land outside the sandbox. `tk herd spawn` now grants that one directory with `--add-dir <git-common-dir>` (resolved with `git rev-parse --git-common-dir`, never assumed to be `<root>/.git`), keeping the sandbox rather than dropping it. Kinds that need it fail closed: an unresolvable path refuses the spawn instead of starting a worker that cannot commit.
- **`tk herd cleanup` no longer stalls on the worker's own RESULT file** — the worker template deliberately leaves `RESULT-<tick-id>.md` uncommitted, and worktree removal (never forced) refuses any dirty worktree, so every cleanup after a successful run failed at remove-workspace. Cleanup now archives that file beside the run manifest as `<tick>.RESULT.md`, removes it and proceeds — only when it is the sole change in the worktree. Any other modification or untracked file still refuses exactly as before; the no-force guard is unchanged.

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
