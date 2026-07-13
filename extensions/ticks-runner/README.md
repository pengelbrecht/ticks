# Ticks Runner Pi Extension

Project/package extension for running Ticks epics from Pi.

Commands:

- `/ticks-plan <epic-or-requirements>` — planning entrypoint. The scaffold currently explains the intended planner flow.
- `/ticks-run <epic-id> [--dry-run] [--worktrees]` — inspect the next runnable wave and, later, run it.
- `/ticks-status` — show recoverable Ticks/Pi orchestration state from git worktrees and `.tick` notes.
- `/ticks-dashboard [--dump]` — show the richer status dashboard as text or an interactive Pi overlay.

This extension is intentionally Ticks-specific. It borrows Pi's subagent extension pattern for child process supervision, but durable orchestration state remains git + `.tick/` + per-run artifacts.

Current scaffold status:

- Registers all slash commands.
- Loads `tk graph <epic> --json` for dry-run planning.
- Derives a durable repository identity and computes repo-namespaced run manifests plus collision-resistant branch/worktree/prompt/report/log paths for ready ticks.
- Renders a textual status/dashboard model and a simple TUI overlay.
- Does not yet launch child implementer agents or merge worktrees.
