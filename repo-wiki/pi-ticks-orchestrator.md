# Pi Ticks Orchestrator

The root is a Pi package: `package.json` loads the distributable `skills/ticks/` instructions and the executable `extensions/ticks-runner/` operator console. It can be installed from `git:github.com/pengelbrecht/ticks`, a local directory, or loaded temporarily with `pi -e <path>`. Skill activation alone cannot execute or activate extension code.

## Architectural contract

- Pi supervises; `tk`, git, and bounded artifacts persist.
- One implementation tick maps to one child Pi JSON-mode process, deterministic `tick/<epic>/<tick>` branch, and isolated worktree.
- Waves launch concurrently up to the graph/config/command cap and merge before dependent waves.
- The controller alone mutates `.tick/`, as `pi:orchestrator`; children may read tracker state through a restricted wrapper.
- Repository identity + epic/tick ID—not PID or Pi session ID—keys recovery.
- Known failures stay open. Wave merges are provisional; closure and cleanup follow persisted post-wave success.

The supervisor borrows process/event mechanics from Pi's generic subagent example (JSON subprocesses, streaming event parsing, concurrency limits, cancellation, usage and compact UI), but adds Ticks-specific tracker waves, worktrees, boundary enforcement, merge gates, recovery, and dashboard state. It is independent of the generic `subagent` extension.

## Module map

- `index.ts` — slash commands, TUI/RPC adaptation, abort-and-await session shutdown, compact widget, overlay entrypoint.
- `config.ts` — `.tick/config.md` section parsing, exact inline-code command extraction, environment precedence, model and concurrency resolution.
- `graph.ts` — validates public `tk graph --json`, identifies ready waves, EPIC-SKELETON/planning blockers, dry plans and deterministic work plans.
- `planning.ts` — parses bounded command syntax; supervises strict read-only scouts and frontier synthesis; validates `ticks-plan/v1`, dependencies and wave files; persists planning telemetry; and applies through an idempotent argv-safe controller with canonical process ticks.
- `state.ts` / `authority.ts` — normalize repository identity; create collision-resistant paths and atomic manifests; and enforce one heartbeat-backed checkout mutation authority shared by run, planning apply, and dashboard actions.
- `supervisor.ts` — spawns without a shell, incrementally decodes JSONL/UTF-8, captures current action/output/model/usage/cost and capability-routing reason, persists event logs and reports, and propagates TERM/KILL cancellation.
- `process.ts` — creates detached POSIX process groups, terminates complete descendant trees with TERM/KILL fallback, uses a Windows-safe direct-child fallback, and tracks session run settlement.
- `boundary.ts` — absolute-cwd subprocesses, child `tk` read allowlist/denial log, best-effort `.tick/` read-only friction, and committed-diff boundary checks.
- `merge.ts` — create/attach/reuse worktrees, exclude `.tick/` while staging, merge with merge commits, abort conflicts, and gate cleanup on ancestry + tracker durability.
- `recovery.ts` — bounded read-only correlation of tracker JSON/fallback issues, notes, manifests/reports, worktrees, and branches; classifies active, stale, failed, partial, orphaned, duplicate, gated, and cleanup states.
- `status.ts` — shared tracker/manifest/child status normalization while retaining distinct terminal outcomes.
- `dashboard.ts` — one transport-neutral model for live widget, TUI overlay, RPC, demo, snapshots, and `--dump`.
- `runner.ts` — composes preflight, recovery, preparation, concurrent supervision, protocol classification, child verification, integration, durable tracker transitions, cleanup, post-wave gates, and re-graphing.

## Execution sequence

`/ticks-run <epic>` is always read-only. It computes graph/config/recovery and prints what `/ticks-run <epic> --execute` would do. Execution first safely parses the epic, then requires a clean controller branch that is neither the repository default nor the epic's recorded base (including a nested feature base), plus passing Environment checks, before tracker/worktree mutation.

For each wave:

1. Reconcile existing manifest/branches/worktrees and reject fresh or ambiguous duplicate claims.
2. Create/reuse worktrees; write prompts; install the `tk` wrapper and permission friction.
3. Claim ticks and commit tracker state.
4. Launch Pi children concurrently; stream snapshots and periodically touch the repo+epic manifest lease.
5. Require a valid final `STATUS:` line. Correctness/scope concerns, blocked/context/protocol/supervisor failures, or denied tracker mutations reopen for repair. Dashboard cards reflect that classified outcome rather than merely the subprocess exit code.
6. Run configured Testing commands in the child worktree. Missing executable Testing commands fail closed; they never count as a skipped/pass gate.
7. Boundary-check, commit source if needed, and merge provisionally while retaining every branch/worktree. Persist the integrated-wave transaction.
8. Run and persist Testing evidence on the fully merged controller. If this gate fails, keep/reopen all affected ticks, retain repair state, and stop dependents.
9. Only after the gate passes, close the wave durably, clean worktrees/branches, and re-run `tk graph`.

Ordinary implementation ticks route from public tracker metadata first (tier/labels, risk labels, priority, type, role), then conservative shape rules. Security/integration/subtle/large work is strong; a complete mechanical task naming one or two files may be economy; the default is balanced. Routing only selects among configured implementation models and never guesses a model family. The reason appears in plans, child cards, and reports. `review` and `closeout` route to dedicated controller-checkout frontier processes with strict findings/evidence schemas. Tracker acceptance and project Rules are prose-only and never authorize shell. Each `## Acceptance Evidence` item must reference an exact controller-owned `Testing` or `Closeout Evidence Commands` entry; closeout-only commands can perform expensive/live proof without rerunning after every implementation wave. Rules requiring external facts (for example PR CI status) create a fingerprint-bound human checkpoint; the model cannot assert those facts on its own.

`/ticks-plan` is a separate two-wave supervised flow. Model-running dry-run (the default) launches 3–6 configured scouts, at least two concurrently, with only `read,grep,find,ls`; then it passes bounded subsystem/test/contract findings, target details, Testing/Rules, and tick patterns to `planner_model` at forced `xhigh`. The planner must emit only strict `ticks-plan/v1` JSON. The controller rejects unknown process/shell/tracker fields, unsafe or oversized IDs/text/files, missing/cyclic hard dependencies, model process ticks, non-atomic horizontal tasks, missing acceptance, and same-wave file overlap. Dry-run persists all telemetry and costs but performs no tracker write.

Only `/ticks-plan ... --apply` mutates. It requires a clean non-default branch (plus TUI confirmation), records a validated base branch, creates or verifies only the requested epic, maps client IDs to argv-safe controller-created task IDs, wires `blocked_by`/`after`, adds role-tagged review blocked by terminal work and closeout blocked by review, then commits `.tick/`. Stable per-entity labels plus a deterministic key, target/parent/title/role bindings, validated plan, and stepwise apply map make retries recoverable even if the process dies after `tk create` returns but before the local state write. Planning artifact ancestors are checked for symlinks. Model-authored acceptance is prose-only and never becomes controller shell input. A failed command stops and reports/commits partial tracker state rather than continuing or rolling into roadmap-level edits.

## Durable layout

```text
<primary-parent>/.ticks-worktrees/<repo-slug>--<identity-hash>/
├── worktrees/<epic>/<tick>/
└── runs/<epic>--<identity-hash>/
    ├── run.json
    ├── artifacts/<tick>/
    │   ├── prompt.md
    │   ├── events.jsonl
    │   ├── report.md
    │   ├── verifier.md
    │   └── tk-denials.jsonl
    └── waves/
        ├── wave-<n>-transaction.json
        ├── wave-<n>-tests.md
        └── attempts/wave-<n>-attempt-<k>/  # archived transaction/tests before retry
<state>/<repo-slug>--<hash>/plans/<target>--<idempotency-key>/
├── apply-state.json
└── attempts/<run>/{validated-plan.json,planner-output.json,planning-report.md,dashboard-history.json,artifacts/}
```

The manifest is atomically replaced and has no process/session identity. Status bounds manifest, issue, artifact, item, and per-file reads; it lists but never loads event logs. Cross-repository manifests are ignored.

## Recovery model

Planning apply recovery is keyed separately from epic execution. Retry the exact same epic ID or requirements text: a partial `apply-state.json` reuses the validated plan and client-to-tracker-ID mapping without rerunning models. A pending-create journal plus per-entity labels recovers a true SIGKILL after `tk create`: a dead owner lock can be taken over, and only the exact marked issue plus its append-only controller create activity is committed; unrelated dirt fails closed. If local state is gone but the matching epic note remains, the controller fails closed instead of creating a duplicate; inspect/recover the reported epic. Model-only dry-run attempts are immutable evidence and a later invocation starts a new attempt.

`/ticks-status [epic]` is the primary epic-execution diagnosis command. It normalizes tracker `active`/`in_progress`/`running`, separates awaiting state, failed/partial lanes, and completed cleanup debt, and retains terminal lane/artifact/decision history. Authority is tracker + integration history + git branch/worktree + reports; `runner-state:` notes are hints.

- **active-run / in-progress** — find the current controller; a second execute blocks. The controller heartbeats a durable lease; losing ownership aborts and settles active child process groups before a stale takeover can proceed.
- **stale-manifest / stale-lease** — inspect artifacts; execute reopens only after preflight and resumes the unique existing worktree.
- **unattached-branch** — attach and continue; do not create a duplicate.
- **missing/partial/failed report** — inspect event/report tail and redispatch in the same worktree.
- **failed-verification** — repair before merge/dependent launch. Post-wave failure has durable `waves/` transaction/evidence files; affected ticks remain open and already-merged branches/worktrees are retained. Recovery advances those branches to the integrated failure base for follow-up commits. An interruption after all merges resumes the gate without redispatch.
- **duplicate-conflict / invalid-manifest / occupied path** — resolve explicitly. The runner never guesses.
- **completed-but-not-cleaned** — verify branch ancestry and durable tracker closure, then remove worktree before branch.
- **awaiting-gate** — obtain the human decision. `--autonomous` does not currently bypass tracker selection gates.

Never delete incomplete worktrees/artifacts just to clear status. They are durable handoff state. Retries archive fixed-name implementation, verifier, review, and closeout artifacts under bounded `attempts/` directories before writing the latest attempt; failed wave transaction/test pairs are likewise moved to bounded `waves/attempts/wave-N-attempt-K/` directories without overwrite.

## Operator troubleshooting

### Commands missing

Use Pi `get_commands` or `/` completion. If `skill:ticks` exists but `/ticks-run` does not, only the skill is installed. Run `pi install git:github.com/pengelbrecht/ticks` (or install a local path), check `pi config`, trust project-local packages when appropriate, then `/reload`.

### Package fails to load

Run `pi -e .` from the package root and inspect stderr. The runtime imports must resolve from Pi's peer packages (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`). Validate `package.json` and avoid adding npm lockfiles; project package operations use pnpm.

### Planning rejected or partial

Read `planning-report.md`, the scout/planner `report.md` files, `planner-output.json`, and `apply-state.json`. Schema/dependency/file conflicts imply zero tracker mutation. For a partial apply, retry the identical target; do not delete mapping state or manually recreate mapped tasks. A note-without-local-state refusal names the epic that must be inspected.

### Execution blocked before launch

Check, in order: non-default branch, completely clean controller, executable Environment bullets, `tk graph` planning state, `missing_process_ticks`, fresh recovery claims, and duplicate branches/worktrees. Dry-run and status are safe while diagnosing.

### Environment or Testing line ignored

Use exactly one inline-code span:

```markdown
- Label: `command --flag` — prose outside code
```

A prose-only Environment line blocks execute. A prose-only Testing line is only a prompt hint.

### Child tried to mutate tracker

Inspect `tk-denials.jsonl`. The outcome is a protocol failure and is not merged. Also inspect git state for `.tick/`; source staging and pre-merge checks reject it even if the child bypassed the wrapper.

### Child finished but did not merge

Read `report.md` final status and `verifier.md`. Unlabelled `DONE_WITH_CONCERNS` is treated as correctness/scope repair; only `observation-only:`, `informational:`, or `note-only:` concerns may integrate. Merge conflicts are aborted and leave the worktree for rebase/repair.

### Dashboard

Use `/ticks-dashboard --demo --dump --width 80` to separate renderer problems from repository state. The model keeps cumulative implementation/review/closeout stages when tracker graphs omit closed work or renumber remaining waves. The TUI uses a height-aware viewport: Up/Down follow selections, PageUp/PageDown scroll, Home/End jump, Enter/Space expands, and q/Esc/Ctrl-C exits. RPC receives deterministic full text plus status/widget events.

## Validation without live models

```bash
node --test extensions/ticks-runner/*.test.ts
printf '%s\n' '{"type":"get_commands"}' | pi --mode rpc --no-session -e .
printf '%s\n' '{"type":"get_commands"}' | pi --mode rpc --no-session \
  -e ./extensions/ticks-runner/index.ts
```

Smoke `/ticks-run <epic>` without `--execute`, `/ticks-status [epic]`, and `/ticks-dashboard --demo --dump`. The runner tests inject fake tracker/child processes and never call a live model.
