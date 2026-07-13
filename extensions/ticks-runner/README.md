# Ticks Runner for Pi

A Pi package extension that runs Ticks implementation waves as supervised Pi subprocesses. The package also ships the `ticks` skill. Pi is the operator console; git, `.tick/`, and repository-namespaced artifacts are the recoverable state.

## Prerequisites and installation

Install the `tk` and `pi` executables first. Review the package before loading it: Pi extensions execute with your user permissions.

```bash
# Git install (user scope)
pi install git:github.com/pengelbrecht/ticks

# Project-local git install; records the package in .pi/settings.json
pi install -l git:github.com/pengelbrecht/ticks

# Local checkout (user or project scope)
pi install /absolute/path/to/ticks
pi install -l /absolute/path/to/ticks

# Try without installing
pi -e /absolute/path/to/ticks
```

A local directory is referenced in place; a git source is cloned and updateable by Pi. Run `pi list` to inspect installed packages, `pi config` to enable/disable resources, and `/reload` after changing an installed local checkout. The package manifest loads both `skills/ticks/` and `extensions/ticks-runner/`. Installing only the skill with a generic skill installer does **not** activate extension code.

For extension-only development:

```bash
pi -e ./extensions/ticks-runner/index.ts
```

## Commands

### `/ticks`

Lists the four primary commands.

### `/ticks-plan [<epic-id-or-requirements>]`

Shows the intended Ticks planning flow and echoes the target. It does not currently launch scouts, call a planner model, or mutate the tracker. Plan with the loaded ticks skill, then use `/ticks-run` after the epic has child ticks and its `review`/`closeout` process ticks.

### `/ticks-run <epic-id> [--execute] [--resume] [--worktrees] [--max-parallel N] [--autonomous] [--compact]`

**Dry-run is the default.** Without `--execute`, the command reads `.tick/config.md` and `tk graph <epic-id> --json`, reconstructs recovery state, and prints waves, the resolved concurrency cap, model selection, deterministic branch/worktree/artifact paths, and blocking preflight findings. It does not run Environment checks, mutate `.tick/` or git, create worktrees, or start a model.

```text
/ticks-run qfs
/ticks-run qfs --worktrees
/ticks-run qfs --max-parallel 2
```

`--worktrees` makes dry-run display isolated worktree paths for implementation ticks. Review and closeout always display the controller checkout because they use dedicated read-only process execution, never an ordinary source worktree. `--max-parallel N` must be a positive integer. The effective cap is the minimum of ready work, `tk graph`'s maximum, and the command/config cap.

Execution requires the explicit safety switch:

```text
/ticks-run qfs --execute
/ticks-run qfs --execute --max-parallel 2
/ticks-run qfs --execute --resume
/ticks-run qfs --execute --autonomous
```

Execution uses isolated worktrees for implementation ticks, so `--worktrees` is implicit. Review and closeout run read-only in the clean controller checkout. `--resume` is an operator-visible hint; the same safe reconciliation runs on every execution. `--autonomous` passes through `tk next <epic> --autonomous --json`; it bypasses checkpoint awaits only, while approval, input, review, content, escalation, and work remain blocking. In TUI mode, execution opens a live control-tower overlay by default without delaying runner startup; `--compact` (or `--no-dashboard`) keeps only the compact status/widget.

Before any mutation, execution requires:

- a clean controller checkout on a non-default branch;
- every `## Environment` bullet to be executable and passing;
- an epic that is planned; a missing EPIC-SKELETON is self-repaired and committed before the first child launch;
- no fresh active lease or ambiguous duplicate branch/worktree/manifest claim.

Before wave 1, `missing_process_ticks` triggers idempotent repair. Exact canonical legacy roleless ticks are tagged only when matching is unique; otherwise new role ticks are created. Review is blocked by every terminal implementation node derived from dependency edges, closeout is blocked by review, and all repair mutations are committed before launch.

For each ready implementation wave, the runner creates or reuses one deterministic branch/worktree per tick, writes the child prompt, installs tracker boundary guards, marks and notes ticks as `pi:orchestrator`, launches up to the cap concurrently, captures Pi JSON events, classifies the final status protocol, and runs configured tests in each child. On POSIX, child Pi and configured shell commands run as detached process-group leaders so TERM/KILL cancellation reaches grandchildren; Windows uses a direct-child fallback. Session shutdown aborts every active epic command and awaits its settlement before the extension runtime is torn down. Accepted branches merge provisionally with merge commits while tracker closure and cleanup remain deferred. The runner persists an integrated-wave transaction, runs and persists the post-wave gate, and only then closes the whole wave durably and cleans worktrees/branches. A failed gate keeps every affected tick open, retains repair state, and blocks dependents.

A ready `role: review` tick launches the configured frontier reviewer in the controller checkout with only `read,grep,find,ls`; extensions, bash, edit, write, tracker authority, and source worktrees are absent. The reviewer reads a persisted full source diff from the epic's validated `base_branch` plus description/acceptance/specs and must emit strict JSON findings. Malformed output fails closed. Blockers—and should-fix findings under the default `repair` policy—become controller-created repair ticks discovered from the review and block it. A clean/routable review closes only after persisted configured-test evidence.

A ready `role: closeout` tick executes strictly parsed acceptance commands and final configured tests, then asks the dedicated read-only closeout model to verify every acceptance item using only controller-issued passing evidence IDs. Missing, malformed, or unverified evidence leaves closeout and epic open. A pass persists the report and retro/learned notes, closes closeout and then the epic, and reports the next feasible action returned by `tk next --epic --json` without changing the roadmap.

### `/ticks-status [<epic-id>]`

Performs a bounded, read-only reconstruction from public tracker JSON (with issue-file compatibility fallback), manifests and reports, `runner-state:` notes, `git worktree list`, and `tick/*` branches. Tracker `active`, `in_progress`, and `running` spellings share one active classification. Awaiting manifests/gates, failed or partial lanes, and completed cleanup debt are reported separately; terminal agent, verification, merge, decision, and artifact history remains visible. Omit the epic to scan the repository namespace.

### `/ticks-dashboard [<epic-or-run-id>] [--epic <id>] [--demo] [--dump] [--width N]`

In TUI mode, opens the control-tower overlay. In RPC/non-TUI mode it automatically emits text. Options:

- `--epic <id>` (or a positional target): combine the dry plan with recovery state for an epic; an exact run ID selects that run.
- `--demo`: render frozen fixture data without tracker state.
- `--dump`: print the same transport-neutral model and renderer used by the overlay.
- `--width N`: text width, default `120`, clamped to at least `24`.

Dashboard sections include the wave timeline, child cards with the selected capability tier and routing reason plus model/usage/cost, verification lane, merge queue, recovery actions/artifacts, and human gates. The overlay reads a mutable session model, so child/tool/verifier/merge/cost updates render while it is open. Closing it does not cancel the run; `/ticks-dashboard` reopens the current model.

Controls: `Up`/`Down` navigates agents and gates, `Enter` or `Space` toggles details, `c` confirms cancellation of an active run, and `q`, `Esc`, or `Ctrl-C` closes the overlay. Gate actions are deliberately detail-first: the first `a` or `x` on a selected gate opens its detail; only a second matching action prompts and runs `tk approve` or `tk reject`. Input gates require recorded non-empty human input, work gates cannot be approved from the dashboard, stale snapshots are rejected, and controller mutations carry `pi:orchestrator` provenance.

## Configuration

The extension reads `.tick/config.md` fresh. Commands are only executable when a bullet contains exactly one Markdown inline-code span, optionally preceded by `Label:` and followed by prose:

```markdown
## Environment
- Git: `git --version` — checked once before any execution mutation
- `test -n "$DATABASE_URL"`

## Testing
- Runner: `node --test extensions/ticks-runner/*.test.ts` — per tick and after each merged wave
- Go: `go test ./...`

## Rules
- Do not add npm lockfiles; use pnpm for JavaScript package operations.
- Preserve public JSON compatibility.

## Pi Orchestrator
- planner_model: openai-codex/gpt-5.6-sol:xhigh
- scout_model: openai-codex/gpt-5.6-sol:low
- implement_economy_model: openai-codex/gpt-5.6-sol:low
- implement_balanced_model: openai-codex/gpt-5.6-sol:medium
- implement_strong_model: openai-codex/gpt-5.6-sol:high
- review_model: openai-codex/gpt-5.6-sol:xhigh
- closeout_model: openai-codex/gpt-5.6-sol:xhigh
- review_should_fix: repair
- max_parallel: 4
```

Prose outside the inline-code span is never sent to a shell. A prose-only Environment bullet blocks execution; a prose-only Testing bullet remains a child prompt hint but is not executed. Commands run through `/bin/sh -lc` on POSIX or `cmd.exe /d /s /c` on Windows and stop at the first failure.

Environment overrides take precedence:

| Key | Override |
|---|---|
| `planner_model` | `TICKS_PI_PLANNER_MODEL` |
| `scout_model` | `TICKS_PI_SCOUT_MODEL` |
| `implement_economy_model` | `TICKS_PI_IMPLEMENT_ECONOMY_MODEL` |
| `implement_balanced_model` | `TICKS_PI_IMPLEMENT_BALANCED_MODEL` |
| `implement_strong_model` | `TICKS_PI_IMPLEMENT_STRONG_MODEL` |
| `review_model` | `TICKS_PI_REVIEW_MODEL` |
| `closeout_model` | `TICKS_PI_CLOSEOUT_MODEL` |
| `review_should_fix` | `TICKS_PI_REVIEW_SHOULD_FIX` (`repair` default, or `record`) |
| `max_parallel` | `TICKS_PI_MAX_PARALLEL` |

Model syntax is `[provider/]model[:thinking]`. With Codex OAuth use `openai-codex/...`, not the separately billed `openai/...`. Ordinary implementation ticks route deterministically among the configured capability tiers: explicit tracker tier/labels first; security, integration, subtle/large metadata and P0/P1 work conservatively use strong; complete mechanical work scoped to one or two named files may use economy; everything else uses balanced. Shape routing never invents a model family—the configured model string is authoritative. Review and closeout have dedicated frontier process tiers/models and read-only controller execution. If `closeout_model` is absent, it falls back to `planner_model`; execution blocks rather than using Pi's ambient default when the applicable process model is unconfigured. `review_should_fix: repair` creates blocking repair ticks; `record` permits a validated should-fix to be recorded as accepted debt, but blockers always route to repair. Dry plans, dashboards, child reports, and verification lanes include role and routing evidence.

## Artifacts and durable identity

The default state root is `.ticks-worktrees` beside the primary checkout. Paths are namespaced by normalized remote (or git common directory), with hashes preventing collisions between similarly named repositories:

```text
<state-root>/<repo-slug>--<hash>/
├── worktrees/<epic>/<tick>/
└── runs/<epic>--<hash>/
    ├── run.json
    ├── dashboard-history.json
    ├── artifacts/<tick>/
    │   ├── prompt.md
    │   ├── events.jsonl
    │   ├── report.md
    │   ├── verifier.md
    │   ├── epic.diff / findings.json / review-tests.md      # review role
    │   ├── acceptance-evidence.md / closeout-report.json    # closeout role
    │   ├── retro.md                                          # closeout role
    │   ├── attempts/attempt-N/                               # archived process retries
    │   └── tk-denials.jsonl
    └── waves/
        ├── wave-<n>-transaction.json
        └── wave-<n>-tests.md
```

Branches are `tick/<epic>/<tick>`. Manifests are atomically written and carry no PID or Pi session ID. Event logs may be large: status lists them but never loads them. Recovery reads reports with byte/file/count limits. Each run also writes a bounded `dashboard-history.json` containing the latest normalized model plus a short status history; later status/dashboard reconstruction restores agent, verification, merge, and usage lanes from this file without reading event logs.

## Boundary model

The extension—not a child—owns tracker state.

1. Prompts forbid `tk` and `.tick/**` mutation.
2. Each child runs in its own worktree.
3. A child-facing `tk` wrapper allows an explicit read-only command list and records denied mutations.
4. `.tick/` permissions add best-effort read-only friction (not a sandbox).
5. Source staging excludes `.tick/**`.
6. Pre-merge git diff checks reject committed tracker changes.
7. Only the controller runs tracker writes with `TK_ACTOR=pi:orchestrator` and commits them.
8. Post-wave evidence is persisted before any success transition; cleanup occurs only after the whole integrated gate passes and tracker closure is durable.

The child process still has the user's OS permissions. Use containers or stronger host sandboxing for hostile code; chmod and prompts are defense in depth, not isolation.

## Recovery playbook

1. Run `/ticks-status <epic>` before retrying.
2. If a run/lease is fresh, find the live controller; do not start a duplicate.
3. For a stale lease, inspect the listed report/log/branch/worktree. A later `/ticks-run <epic> --execute` reopens it only after clean-controller and Environment preflight, then reuses the unique state.
4. For an unattached branch, let execution attach it to the deterministic worktree. For useful existing work, resume in place; never create a second branch.
5. Inspect `report.md`, `verifier.md`, `wave-*-transaction.json`, or `wave-*-tests.md` for failed child, protocol, interrupted integration, or post-wave gates. Failed-gate ticks stay open; repair on the retained branch/worktree, then rerun. A transaction interrupted after all merges resumes the gate without redispatch.
6. Resolve duplicate claims or malformed manifests manually. The runner blocks rather than choosing.
7. For `completed-but-not-cleaned`, confirm both merge ancestry and durable tracker closure before removing worktree then branch.
8. Never delete incomplete artifacts merely to make status green. They are the cross-session/cross-runner handoff.

A stale `runner-state:` note is only a hint. Repository identity + epic/tick ID, tracker status, git branches/worktrees, and reports are authoritative.

## Testing

No live model is needed for the suite:

```bash
node --test extensions/ticks-runner/*.test.ts

# Package discovery (response must include ticks-* and skill:ticks)
printf '%s\n' '{"type":"get_commands"}' | pi --mode rpc --no-session -e .

# Extension-only discovery
printf '%s\n' '{"type":"get_commands"}' | pi --mode rpc --no-session \
  -e ./extensions/ticks-runner/index.ts
```

Use `/ticks-run <real-epic>` without `--execute`, `/ticks-status [epic]`, and `/ticks-dashboard --demo --dump --width 80` for read-only smoke tests. Command output is immediate and never invokes a model: TUI uses a rendered session entry, RPC uses bounded extension UI with a full-result artifact when needed, print writes text, and JSON writes an `extension_output` JSONL event.

## Known limitations

- `/ticks-plan` is an informational planning entrypoint; it does not run scouts/planner or create ticks.
- Recovery is resumable, not process-continuous: graceful session shutdown cancels and awaits child settlement; abrupt controller loss is recovered from durable tracker/git/artifact state rather than a private session handle.
- No built-in spend cap is enforced. The dashboard reports usage/cost emitted by providers.
- Rich interaction requires Pi TUI. RPC receives status/widget requests and text dumps; the overlay itself is TUI-only.
