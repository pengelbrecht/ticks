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

### `/ticks-plan <childless-epic-id> [--apply] [--scouts 3..6] [--scout-cap 2..4] [--compact]`

### `/ticks-plan --requirements "<new epic requirements>" [--apply] [--scouts 3..6] [--scout-cap 2..4] [--compact]`

`--new` is an alias for `--requirements`. Planning is automated and **model-running dry-run is the default**: without `--apply`, the command launches bounded read-only scouts in parallel, launches the configured frontier planner at `xhigh`, validates its strict JSON, persists logs/reports, and displays implementation waves, models, usage, and cost. It performs no tracker mutation. This differs from `/ticks-run` dry-run, which is a no-model graph preview.

The default scouts separately map subsystems, tests, and contracts. `--scouts` may add integration, risk, and documentation scouts, but is bounded to 3–6; `--scout-cap` is bounded to 2–4 and is also capped by configured `max_parallel` (planning fails before models if configuration permits fewer than two parallel scouts). Scouts run with exactly `read,grep,find,ls`, no bash and no extensions. The planner receives requirements or existing epic details, bounded scout summaries, fresh Testing/Rules configuration, and bundled tick-authoring patterns. `scout_model` and `planner_model` must be configured; no ambient-model fallback is accepted.

The planner may return only schema `ticks-plan/v1`: new-epic metadata when applicable and 1–12 implementation tasks with safe client IDs, title/description/acceptance, priority/type/tier/files, hard `blocked_by`, and optional soft `after`. Acceptance is prose-only: backticks and model-authored command/code snippets are rejected, so planner output can never become closeout shell. New epic acceptance uses stable `[A<n>]` bullet IDs. Planning reports that the controller must separately map each item under `## Acceptance Evidence` before closeout; executable verification evidence comes from that controller-owned configuration, not model prose. Validation also rejects unknown shell/tracker/process fields, malformed or oversized text, unsafe/duplicate IDs and files, missing dependencies, hard cycles, model-supplied review/closeout, non-atomic horizontal task shapes, missing acceptance, and same-wave file conflicts. Rejection occurs before controller mutation.

`--apply` is the only tracker-writing mode. It requires a clean non-default branch and validates an existing recorded base when present; otherwise it derives one resolvable, Git-valid base branch from `origin/HEAD` (or a single local `main`/`master` fallback). Ambiguous base context fails before models or tracker writes. The controller records that `base_branch` on both new and existing target epics so review/closeout can use it later. TUI mode also asks for explicit confirmation; in RPC/print command contexts, the flag itself is confirmation because a terminal dialog is unsafe or unavailable. The controller creates a requirements epic or freshly verifies an existing epic is open, childless, and plannable; creates/maps implementation tasks as `pi:orchestrator`; wires hard/soft edges; then appends canonical role-tagged review blocked by terminal implementation tasks and closeout blocked by review. The model cannot inject this process skeleton or change roadmap-level ordering.

Tracker calls are argv-only and tracker state is committed. Every controller-created entity receives target-key and entity-specific labels in the same atomic `tk create`; this closes the crash window between a durable create and the next local state write. Apply state binds the exact target, plan digest, base branch, epic title, and mapped IDs. Recovery re-discovers missing mappings by labels and verifies requested epic, parent, title, type, role, marker, and base branch before reuse. A failed command stops immediately, commits partial tracker state when possible, and reports the epic/task mapping plus failed step. Retrying the same target reuses the validated plan and mapped IDs without rerunning models or blindly recreating tasks; if local recovery is missing but a tracker marker exists, apply refuses a duplicate and identifies the prior epic. Planning paths fail closed when the state root or any preexisting artifact ancestor is symlinked.

Planning feeds the live dashboard/widget. Cards show every scout and the planner with process/tool state, models, elapsed time, tokens, and cost; `c` cancels the supervised process tree. `--compact` keeps only the status/widget.

### `/ticks-run <epic-id> [--execute] [--resume] [--worktrees] [--max-parallel N] [--autonomous] [--compact]`

**Dry-run is the default.** Without `--execute`, the command reads `.tick/config.md` and `tk graph <epic-id> --json`, reconstructs recovery state, and prints every graph wave and tick with its resolved model/tier plus deterministic branch/worktree/artifact paths. Ready work is marked `ready now`; future blocked work is explicitly marked planned-only/not-ready, including review and closeout controller-checkout routing. It does not run Environment checks, mutate `.tick/` or git, create worktrees, or start a model.

```text
/ticks-run qfs
/ticks-run qfs --worktrees
/ticks-run qfs --max-parallel 2
```

`--worktrees` makes dry-run display isolated worktree paths for implementation ticks. Review and closeout in every wave always display the controller checkout because they use dedicated read-only process execution, never an ordinary source worktree. `--max-parallel N` must be a positive integer. The effective cap is the minimum of ready work, `tk graph`'s maximum, and the command/config cap.

Execution requires the explicit safety switch:

```text
/ticks-run qfs --execute
/ticks-run qfs --execute --max-parallel 2
/ticks-run qfs --execute --resume
/ticks-run qfs --execute --autonomous
```

Execution uses isolated worktrees for implementation ticks, so `--worktrees` is implicit. Review and closeout run read-only in the clean controller checkout. `--resume` is an operator-visible hint; the same safe reconciliation runs on every execution. `--autonomous` passes through `tk next <epic> --autonomous --json`; it bypasses checkpoint awaits only, while approval, input, review, content, escalation, and work remain blocking. In TUI mode, execution opens a live control-tower overlay by default without delaying runner startup; `--compact` (or `--no-dashboard`) keeps only the compact status/widget.

Before any mutation, execution requires:

- a clean controller checkout on a branch that is neither the repository default nor the epic's safely parsed recorded `base_branch` (including a nested feature base);
- every `## Environment` bullet to be executable and passing;
- an epic that is planned; a missing EPIC-SKELETON is self-repaired and committed before the first child launch;
- no fresh checkout-wide controller lease or ambiguous duplicate branch/worktree/manifest claim. The lease is keyed by the canonical checkout root (not epic ID), so same-epic and cross-epic runs cannot share one Git index/tracker authority; manifests and telemetry remain epic-specific.

Before wave 1, `missing_process_ticks` triggers idempotent repair. Exact canonical legacy roleless ticks are tagged only when matching is unique; otherwise new role ticks are created. Review is blocked by every terminal implementation node derived from dependency edges, closeout is blocked by review, and all repair mutations are committed before launch.

For each ready implementation wave, the runner creates or reuses one deterministic branch/worktree per tick, writes the child prompt, installs tracker boundary guards, marks and notes ticks as `pi:orchestrator`, launches up to the cap concurrently, captures Pi JSON events, classifies the final status protocol, and runs configured tests in each child. Tracker commits enumerate and verify their exact `.tick/` paths and refuse a pre-existing staged index rather than absorbing another authority's state. On POSIX, child Pi and configured shell commands run as detached process-group leaders so TERM/KILL cancellation reaches grandchildren; Windows uses a direct-child fallback. Session shutdown or checkout-controller-lease loss aborts every active epic command and awaits its settlement before the extension runtime is torn down or stale recovery can proceed. Release is compare-and-delete, so an expired owner cannot unlink its successor. Accepted branches merge provisionally with merge commits while tracker closure and cleanup remain deferred. The runner persists an integrated-wave transaction, runs and persists the post-wave gate, and only then closes the whole wave durably and cleans worktrees/branches. A failed gate keeps every affected tick open, retains repair state, and blocks dependents.

Real `tk graph --json` omits awaiting-human children from `waves` while retaining them in `stats.awaiting_human`. The runner treats that statistic as authoritative, resolves the concrete gate with `tk next <epic> --awaiting= --json`, and returns `status: awaiting` with tick ID, title, gate type, and operator action. An awaiting-only epic is never reported completed.

A ready `role: review` tick launches the configured frontier reviewer in the controller checkout with only `read,grep,find,ls`; extensions, bash, edit, write, tracker authority, and source worktrees are absent. The reviewer reads a persisted full source diff from the epic's validated `base_branch` plus description/acceptance/specs and must emit strict JSON findings. Malformed output fails closed. Blockers—and should-fix findings under the default `repair` policy—become controller-created repair ticks discovered from the review and block it. A clean/routable review closes only after persisted configured-test evidence.

A ready `role: closeout` tick treats every tracker acceptance item as prose. It executes only exact commands explicitly authorized for that item in controller-owned `.tick/config.md` under `## Acceptance Evidence`; each mapped command must also exist verbatim as one executable `## Testing` command. There is no Cartesian Testing×acceptance fallback. Stable `[A<n>]` IDs are recommended in epic acceptance (legacy untagged lines deterministically receive A1, A2, …). Unknown, duplicate, stale, or missing mappings fail closed before the closeout model starts. The controller issues distinct item-scoped evidence IDs only for mapped passing commands, then the dedicated read-only model verifies each item using IDs issued for that same item. Cross-item IDs are rejected. A pass persists the report and retro/learned notes, closes closeout and then the epic, and reports the next feasible action returned by `tk next --epic --json` without changing the roadmap.

### `/ticks-status [<epic-id>]`

Performs a bounded, read-only reconstruction from public tracker JSON (with issue-file compatibility fallback), manifests and reports, `runner-state:` notes, `git worktree list`, and `tick/*` branches. Tracker `active`, `in_progress`, and `running` spellings share one active classification. Awaiting manifests/gates, failed or partial lanes, and completed cleanup debt are reported separately; terminal agent, verification, merge, decision, and artifact history remains visible. Omit the epic to scan the repository namespace.

### `/ticks-dashboard [<epic-or-run-id>] [--epic <id>] [--demo] [--dump] [--width N]`

In TUI mode, opens the control-tower overlay. In RPC/non-TUI mode it automatically emits text. Options:

- `--epic <id>` (or a positional target): combine the dry plan with recovery state for an epic; an exact run ID selects that run.
- `--demo`: render frozen fixture data without tracker state.
- `--dump`: print the same transport-neutral model and renderer used by the overlay.
- `--width N`: text width, default `120`, clamped to at least `24`.

Dashboard sections include the wave timeline, child cards with the selected capability tier and routing reason plus model/usage/cost, verification lane, merge queue, recovery actions/artifacts, and human gates. The overlay reads a mutable session model, so child/tool/verifier/merge/cost updates render while it is open. Closing it does not cancel the run; `/ticks-dashboard` reopens the current model.

Controls: `Up`/`Down` navigates agents and gates and automatically scrolls the selected card into view. `PageUp`/`PageDown` scrolls the dashboard body, while `Home`/`End` jumps to its first/last content; the run header and responsive control hints remain visible at small terminal heights. `Enter` or `Space` toggles details, `c` confirms cancellation of an active run, and `q`, `Esc`, or `Ctrl-C` closes the overlay. Gate actions are deliberately detail-first: the first `a` or `x` on a selected gate opens its detail; only a second matching action prompts and runs `tk approve` or `tk reject`. Input gates require recorded non-empty human input. Approval, review, content, and checkpoint gates use guarded `tk approve`; work and escalation gates cannot be approved or rejected from the dashboard. Stale snapshots are rejected, and controller mutations carry `pi:orchestrator` provenance.

## Configuration

The extension reads `.tick/config.md` fresh. Commands are only executable when a bullet contains exactly one Markdown inline-code span, optionally preceded by `Label:` and followed by prose:

```markdown
## Environment
- Git: `git --version` — checked once before any execution mutation
- `test -n "$DATABASE_URL"`

## Testing
- Runner: `node --test extensions/ticks-runner/*.test.ts` — per tick and after each merged wave
- Go: `go test ./...`

## Acceptance Evidence
- A1: `node --test extensions/ticks-runner/*.test.ts`
- A2: `go test ./...` — trailing audit prose is allowed

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

Prose outside the inline-code span is never sent to a shell. A prose-only Environment bullet blocks execution; a prose-only Testing bullet remains a child prompt hint but is not executed. Acceptance criteria and Rules are always prose, even when they contain backticks; they never authorize shell execution. `Acceptance Evidence` is a strict bounded authorization table: `- A<n>: \`exact command\``. The command must match exactly one executable Testing entry, every current epic item must have at least one mapping, and mappings for unknown items are rejected. Reusing one command for multiple items requires a separate explicit line for each item. Commands run through `/bin/sh -lc` on POSIX or `cmd.exe /d /s /c` on Windows and stop at the first failure.

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
    │   ├── attempts/attempt-N/                               # archived implementation/verifier/process retries
    │   └── tk-denials.jsonl
    └── waves/
        ├── wave-<n>-transaction.json
        ├── wave-<n>-tests.md
        └── attempts/wave-<n>-attempt-<k>/   # bounded archived transaction/tests before retry
<state-root>/<repo-slug>--<hash>/plans/<target>--<idempotency-key>/
├── apply-state.json                         # --apply recovery only
└── attempts/<plan-run-id>/
    ├── artifacts/scout-*/{prompt.md,events.jsonl,report.md}
    ├── artifacts/frontier-planner/{prompt.md,events.jsonl,report.md}
    ├── planner-output.json
    ├── validated-plan.json
    ├── planning-report.md
    └── dashboard-history.json
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

For a partial `/ticks-plan --apply`, retry the exact same epic ID or requirements text. The deterministic `apply-state.json`, pending-create journal, and create-time labels reuse the validated plan and client-ID mapping, including a true controller SIGKILL immediately after `tk create` persisted but before the controller wrote the returned ID. A dead owner lock may be taken over; the retry commits only the exact journaled marked issue plus its single append-only `pi:orchestrator` create activity, and refuses every unrelated dirty path. If that artifact is unavailable but the epic carries an idempotency note/label, the controller refuses a blind duplicate and reports the prior epic for manual inspection. Corrupted cross-target mappings or mismatched parent/title/role/marker/base fields fail closed.

For epic execution:

1. Run `/ticks-status <epic>` before retrying.
2. If a run/lease is fresh, find the live controller; do not start a duplicate.
3. For a stale lease, inspect the listed report/log/branch/worktree. A later `/ticks-run <epic> --execute` reopens it only after clean-controller and Environment preflight, then reuses the unique state.
4. For an unattached branch, let execution attach it to the deterministic worktree. For useful existing work, resume in place; never create a second branch.
5. Inspect `report.md`, `verifier.md`, `attempts/attempt-N/`, `wave-*-transaction.json`, `wave-*-tests.md`, or `waves/attempts/wave-*-attempt-*/` for failed child, protocol, interrupted integration, or post-wave gates. Recovery recognizes role-tagged strict JSON review/closeout reports as complete; malformed process JSON remains partial. Failed-gate ticks stay open; repair on the retained branch/worktree, then rerun. A transaction interrupted after all merges resumes the gate without redispatch.
6. Resolve duplicate claims or malformed manifests manually. The runner blocks rather than choosing.
7. For `completed-but-not-cleaned`, confirm both merge ancestry and durable tracker closure before removing worktree then branch.
8. Never delete incomplete artifacts merely to make status green. They are the cross-session/cross-runner handoff.

A stale `runner-state:` note is only a hint. Repository identity + epic/tick ID, tracker status, git branches/worktrees, and reports are authoritative. Role-tagged review/closeout notes may name the controller branch/checkout for provenance; recovery never treats those fields as deterministic implementation branch/worktree claims, while still validating their role-specific reports and artifacts strictly.

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

### Disposable real tk + real Pi scenario

Dry validation is safe for ordinary tests and never looks up or launches `tk`/Pi:

```bash
node --no-warnings scripts/pi-ticks-live-scenario.ts --validate
```

The live scenario is explicit and billable. It requires working `tk`, authenticated Pi Codex OAuth, and the configured `openai-codex` model. It creates a temporary git repository with real `.tick` state/config/epic, runs one tiny implementation through real Pi JSON subprocess supervision, verifies artifacts/boundary/merge/close/cleanup, copies retained evidence outside the source repository (default `~/.local/state/ticks/live-scenarios/`), and removes the temporary repository even on failure:

```bash
node --no-warnings scripts/pi-ticks-live-scenario.ts --execute \
  --model openai-codex/gpt-5.6-sol:medium
```

Use `--evidence-dir /absolute/path/outside/the/source/repo` to choose the retained evidence root, or `--tk`/`--pi` to select real executable paths. The harness rejects evidence paths inside this source checkout and snapshots the source HEAD/status to prove it remained untouched. Ordinary test suites run only `--validate`; they never invoke a live model.

## Known limitations

- Planning/apply recovery is durable, but an interrupted model-only dry-run starts a new planning attempt rather than attaching to an old live process.
- Epic execution recovery is resumable, not process-continuous: graceful session shutdown cancels and awaits child settlement; abrupt controller loss is recovered from durable tracker/git/artifact state rather than a private session handle.
- Scout count/concurrency are bounded, but no dollar spend cap is enforced. The dashboard reports usage/cost emitted by providers.
- Rich interaction requires Pi TUI. RPC receives status/widget requests and text dumps; the overlay itself is TUI-only.
