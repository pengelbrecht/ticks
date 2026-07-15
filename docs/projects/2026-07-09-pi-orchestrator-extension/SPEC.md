# Pi Ticks Orchestrator Extension

## Goal

Build a first-class Pi extension/package for running Ticks epics from Pi. The extension should feel like a purpose-built orchestration console rather than a thin wrapper around generic subagents: it owns tick state, worktrees, subprocess supervision, verification, merge flow, recovery, and rich live status.

Existing `skills/ticks/references/pi-runner.md` is the runner contract. The implementation should use Pi extension APIs and borrow proven patterns from Pi's `examples/extensions/subagent/` (JSON-mode child Pi processes, streaming event capture, concurrent execution, usage aggregation), but Ticks orchestration must be Ticks-specific.

## Non-goals

- Do not resurrect standalone `tk run` as the primary runner.
- Do not require tmux.
- Do not store Pi session IDs as durable orchestration state.
- Do not let implementer agents own `.tick/` mutations or authoritative `tk` state transitions.

## User experience

Expose these commands:

- `/ticks-plan <epic-or-requirements>` — plan with parallel read-only scouts and frontier synthesis, then create ticks.
- `/ticks-run <epic-id>` — run/resume an epic wave-by-wave from durable `tk graph` state.
- `/ticks-status` — show active and recoverable runs, worktrees, branches, reports, awaiting gates, stale leases, and failed verifications.
- `/ticks-dashboard [run-id]` — open an interactive control-tower overlay for live and historical runs.

The dashboard should be richer than generic subagents:

- **Wave timeline** — current wave, completed waves, upcoming blocked waves, critical path.
- **Agent cards** — tick id/title, role tier, model/provider, worktree, branch, elapsed time, status, current tool/action, recent output.
- **Verification lane** — per-tick verifier status, post-wave test gate, failures with links to artifacts/logs.
- **Merge queue** — branch readiness, `.tick/` boundary check, merge result, conflicts, cleanup state.
- **Cost/context telemetry** — turns, tokens, cache read/write, cost, context usage by child agent and by wave.
- **Recovery panel** — stale leases, orphaned worktrees, partial reports, resume actions.
- **Human gates** — awaiting approval/review/input/checkpoint surfaced with approve/reject actions only after detail review.

Use `ctx.ui.setStatus` and `ctx.ui.setWidget` for lightweight always-on status. Use `ctx.ui.custom(..., { overlay: true })` for the rich dashboard. Custom tool/result renderers may be used for child-agent event streams, but command-driven orchestration should remain usable in non-TUI modes with textual summaries.

## Durable state

Durable state remains runner-neutral:

- `.tick/` issue state and activity
- deterministic branches and git worktrees
- per-tick prompt/report/log artifacts under a tracked-or-ignored run directory according to repo policy
- runner-state notes containing branch/worktree/model provenance

Pi extension process memory, PIDs, dashboard component state, and Pi session IDs are convenience state only. Resume must reconstruct from git + `.tick/` + artifacts.

## Execution architecture

1. Read `.tick/config.md` fresh at run start, including `Testing`, `Environment`, `Rules`, and optional `Pi Orchestrator` model routing.
2. Export/use `TK_ACTOR=pi:orchestrator` for orchestrator-owned tracker writes.
3. Call `tk graph <epic> --json`; repair missing EPIC-SKELETON ticks before wave 1.
4. For every ready tick in the wave, create a deterministic worktree/branch and mark the tick in progress.
5. Spawn one child Pi process or SDK session per tick, with `cwd` set to that worktree, JSON/RPC event capture, model/thinking selected by tier, and a strict implementer prompt.
6. Guard boundaries: prompt enforcement, child `tk` wrapper or tool-call guards where applicable, no `.tick/**` edits, and mandatory pre-merge `.tick/` diff check.
7. Persist compact per-tick reports plus full JSONL/RPC logs.
8. Integrate successful branches, close ticks with concrete reasons, clean up worktrees/branches after durable success.
9. Run post-wave tests on the integration checkout before launching dependents.
10. Route failures to continuation, repair, human gate, or escalation with durable notes/artifacts.
11. Treat tracker acceptance as untrusted prose. Closeout evidence is authorized item-by-item only by controller-owned `.tick/config.md` mappings to exact Testing commands; never use a generic Testing×acceptance Cartesian product.

## Packaging

Distribute as a Pi package containing both the skill and extension:

```text
package.json                  # pi.skills + pi.extensions manifest
skills/ticks/                 # existing skill + references
extensions/ticks-runner/      # first-class Pi extension
```

The root package should be installable with `pi install git:github.com/pengelbrecht/ticks` or a local path. If a generic skill installer only installs skill files, the skill should detect/report that the extension is missing and explain the Pi package install path.

## Acceptance for the epic

The epic is complete when:

- A Pi package manifest loads both the ticks skill and the ticks orchestrator extension.
- `/ticks-run`, `/ticks-plan`, `/ticks-status`, and `/ticks-dashboard` exist with useful dry-run/status behavior.
- `/ticks-run <epic> --dry-run` shows wave/tick/worktree/model plan without launching agents.
- Worktree-mode execution can run at least one disposable tick through child Pi JSON/RPC supervision, artifact capture, boundary check, merge, tick close, and cleanup. `scripts/pi-ticks-live-scenario.ts` provides the isolated real-tk/real-Pi proof; dry validation is no-model, while explicit live execution retains evidence outside and removes its temporary repository.
- The dashboard shows wave progress, agent cards, verifier/merge lanes, cost/context telemetry, and recovery state.
- Docs explain installation, commands, configuration, durable-state model, recovery, and limitations.
