# Pi Ticks Orchestrator

The Pi integration is a package-distributed extension under `extensions/ticks-runner/`, bundled with `skills/ticks/` by the root `package.json` Pi manifest.

## Contract

- Pi is the operator console; `tk`, git branches/worktrees, and run artifacts are durable state.
- One implementation tick maps to one child Pi process, branch, and isolated worktree.
- Implementers never own `.tick/` mutations; the orchestrator performs tracker writes and verifies the boundary before merge.
- OpenAI-backed roles use the `openai-codex` OAuth provider. Repo defaults select `gpt-5.6-sol` and vary thinking level by role.

## Core modules

- `config.ts` parses `.tick/config.md`, applies environment overrides, resolves role models and concurrency, and reports unsafe provider configuration.
- `graph.ts` validates `tk graph --json`, computes preflight issues, waves, ready work, model tiers, and dry-run output.
- `state.ts` creates repo-namespaced deterministic run IDs, branches, worktrees, artifact paths, atomic manifests, and stale-run discovery. Pi PIDs and session IDs are deliberately excluded from durable authority.
- `index.ts` registers `/ticks-plan`, `/ticks-run`, `/ticks-status`, `/ticks-dashboard`, and `/ticks`, and adapts output to TUI and RPC surfaces.

## Current UX

Dry-run and status are available in TUI and RPC. The extension uses footer/widget status for compact visibility and an overlay for the dashboard. Live child supervision, verification/merge lanes, and recovery controls are layered onto the same run model as the qfs epic progresses.
