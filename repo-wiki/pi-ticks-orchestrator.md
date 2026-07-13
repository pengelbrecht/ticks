# Pi Ticks Orchestrator

The root is a Pi package: `package.json` loads the distributable `skills/ticks/` instructions and the executable `extensions/ticks-runner/` operator console. It can be installed from `git:github.com/pengelbrecht/ticks`, a local directory, or loaded temporarily with `pi -e <path>`. Skill activation alone cannot execute or activate extension code.

## Architectural contract

- Pi supervises; `tk`, git, and bounded artifacts persist.
- One implementation tick maps to one child Pi JSON-mode process, deterministic `tick/<epic>/<tick>` branch, and isolated worktree.
- Waves launch concurrently up to the graph/config/command cap and merge before dependent waves.
- The controller alone mutates `.tick/`, as `pi:orchestrator`; children may read tracker state through a restricted wrapper.
- Repository identity + epic/tick ID—not PID or Pi session ID—keys recovery.
- Known failures stay open. Cleanup follows both source integration and durable tracker closure.

The supervisor borrows process/event mechanics from Pi's generic subagent example (JSON subprocesses, streaming event parsing, concurrency limits, cancellation, usage and compact UI), but adds Ticks-specific tracker waves, worktrees, boundary enforcement, merge gates, recovery, and dashboard state. It is independent of the generic `subagent` extension.

## Module map

- `index.ts` — slash commands, TUI/RPC adaptation, active-run cancellation, compact widget, overlay entrypoint.
- `config.ts` — `.tick/config.md` section parsing, exact inline-code command extraction, environment precedence, model and concurrency resolution.
- `graph.ts` — validates public `tk graph --json`, identifies ready waves, EPIC-SKELETON/planning blockers, dry plans and deterministic work plans.
- `state.ts` — normalizes repository identity; creates collision-resistant repo/run IDs, branch/worktree/artifact paths, atomic manifests, and stale-run discovery.
- `supervisor.ts` — spawns without a shell, incrementally decodes JSONL/UTF-8, captures current action/output/model/usage/cost, persists event logs and reports, and propagates TERM/KILL cancellation.
- `boundary.ts` — absolute-cwd subprocesses, child `tk` read allowlist/denial log, best-effort `.tick/` read-only friction, and committed-diff boundary checks.
- `merge.ts` — create/attach/reuse worktrees, exclude `.tick/` while staging, merge with merge commits, abort conflicts, and gate cleanup on ancestry + tracker durability.
- `recovery.ts` — bounded read-only correlation of tracker JSON/fallback issues, notes, manifests/reports, worktrees, and branches; classifies active, stale, failed, partial, orphaned, duplicate, gated, and cleanup states.
- `dashboard.ts` — one transport-neutral model for live widget, TUI overlay, RPC, demo, snapshots, and `--dump`.
- `runner.ts` — composes preflight, recovery, preparation, concurrent supervision, protocol classification, child verification, integration, durable tracker transitions, cleanup, post-wave gates, and re-graphing.

## Execution sequence

`/ticks-run <epic>` is always read-only. It computes graph/config/recovery and prints what `/ticks-run <epic> --execute` would do. Execution requires a clean non-default controller branch and passing Environment checks before tracker/worktree mutation.

For each wave:

1. Reconcile existing manifest/branches/worktrees and reject fresh or ambiguous duplicate claims.
2. Create/reuse worktrees; write prompts; install the `tk` wrapper and permission friction.
3. Claim ticks and commit tracker state.
4. Launch Pi children concurrently; stream snapshots and periodically touch the repo+epic manifest lease.
5. Require a valid final `STATUS:` line. Correctness/scope concerns, blocked/context/protocol/supervisor failures, or denied tracker mutations reopen for repair.
6. Run configured Testing commands in the child worktree.
7. Boundary-check, commit source if needed, merge, close and commit tracker state, then cleanup.
8. Run Testing commands on the merged controller. Stop dependents if this gate fails.
9. Re-run `tk graph`.

`review` and `closeout` process ticks currently stop with `awaiting`; the skill/operator performs final review and retro/closeout. `/ticks-plan` is informational rather than an automated model launcher.

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
    └── waves/wave-<n>-tests.md
```

The manifest is atomically replaced and has no process/session identity. Status bounds manifest, issue, artifact, item, and per-file reads; it lists but never loads event logs. Cross-repository manifests are ignored.

## Recovery model

`/ticks-status [epic]` is the primary diagnosis command. Authority is tracker + integration history + git branch/worktree + reports; `runner-state:` notes are hints.

- **active-run / in-progress** — find the current controller; a second execute blocks.
- **stale-manifest / stale-lease** — inspect artifacts; execute reopens only after preflight and resumes the unique existing worktree.
- **unattached-branch** — attach and continue; do not create a duplicate.
- **missing/partial/failed report** — inspect event/report tail and redispatch in the same worktree.
- **failed-verification** — repair before merge/dependent launch. Post-wave failure has a `waves/` evidence file and already-merged ticks remain closed.
- **duplicate-conflict / invalid-manifest / occupied path** — resolve explicitly. The runner never guesses.
- **completed-but-not-cleaned** — verify branch ancestry and durable tracker closure, then remove worktree before branch.
- **awaiting-gate** — obtain the human decision. `--autonomous` does not currently bypass tracker selection gates.

Never delete incomplete worktrees/artifacts just to clear status. They are durable handoff state.

## Operator troubleshooting

### Commands missing

Use Pi `get_commands` or `/` completion. If `skill:ticks` exists but `/ticks-run` does not, only the skill is installed. Run `pi install git:github.com/pengelbrecht/ticks` (or install a local path), check `pi config`, trust project-local packages when appropriate, then `/reload`.

### Package fails to load

Run `pi -e .` from the package root and inspect stderr. The runtime imports must resolve from Pi's peer packages (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`). Validate `package.json` and avoid adding npm lockfiles; project package operations use pnpm.

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

Use `/ticks-dashboard --demo --dump --width 80` to separate renderer problems from repository state. TUI keys are Up/Down, Enter/Space, and q/Esc/Ctrl-C. RPC does not open the overlay; it receives text plus status/widget events.

## Validation without live models

```bash
node --test extensions/ticks-runner/*.test.ts
printf '%s\n' '{"type":"get_commands"}' | pi --mode rpc --no-session -e .
printf '%s\n' '{"type":"get_commands"}' | pi --mode rpc --no-session \
  -e ./extensions/ticks-runner/index.ts
```

Smoke `/ticks-run <epic>` without `--execute`, `/ticks-status [epic]`, and `/ticks-dashboard --demo --dump`. The runner tests inject fake tracker/child processes and never call a live model.
