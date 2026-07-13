# Ticks Runner Pi Extension

Project/package extension for running Ticks epics from Pi.

Commands:

- `/ticks-plan <epic-or-requirements>` — planning entrypoint. The scaffold currently explains the intended planner flow.
- `/ticks-run <epic-id> [--worktrees]` — dry-run by default; inspect waves, models, and durable paths without mutation.
- `/ticks-run <epic-id> --execute [--max-parallel N] [--autonomous]` — explicitly opt in to isolated worktree execution. Worktrees are implicit for execution.
- `/ticks-status` — show recoverable Ticks/Pi orchestration state from git worktrees and `.tick` notes.
- `/ticks-dashboard [--dump]` — show the richer status dashboard as text or an interactive Pi overlay.

This extension is intentionally Ticks-specific. It borrows Pi's subagent extension pattern for child process supervision, but durable orchestration state remains git + `.tick/` + per-run artifacts.

Current module status:

- Registers all slash commands and loads `tk graph <epic> --json` for dry-run planning and wave-by-wave continuation.
- `runner.ts` enforces a clean non-default controller branch, runs extracted Environment checks before mutation, fetches strict tick details, provisions worktrees/guards, supervises ready children concurrently, classifies the status protocol, verifies, merges, performs durable tracker transitions as `pi:orchestrator`, runs post-wave tests, and re-graphs.
- Derives a durable repository identity and computes repo-namespaced run manifests plus collision-resistant branch/worktree/prompt/report/log paths for ready ticks.
- `supervisor.ts` provides a stable, non-shell child-process API for Pi JSON mode: incremental event parsing, live snapshots, usage/context/cost aggregation, durable event logs and reports, failure classification, and TERM/KILL cancellation.
- Renders the same live dashboard model through compact TUI/RPC status and the control-tower overlay.

## Executable config bullets

Environment and Testing commands execute only when a bullet contains exactly one Markdown inline-code span, optionally after a short label:

```markdown
## Environment
- `which git` — commentary is not executed

## Testing
- Unit: `node --test extensions/ticks-runner/*.test.ts` (commentary is not executed)
```

Prose-only Testing bullets remain prompt hints and are never sent to a shell. A prose-only Environment bullet blocks execution because its preflight condition cannot be verified.

## Current process-tick limit

Ready ticks with `role: review` or `role: closeout` stop with an explicit orchestrator action. They are never dispatched to an ordinary code implementer until dedicated review/retro behavior is implemented.
