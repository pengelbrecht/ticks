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
- `runner.ts` composes graph/config/state/supervisor/boundary/merge/dashboard into the opt-in epic loop, including verifier and post-wave gates.
- `index.ts` registers `/ticks-plan`, `/ticks-run`, `/ticks-status`, `/ticks-dashboard`, and `/ticks`, and adapts live output to TUI and RPC surfaces.

## Current UX

`/ticks-run <epic>` is a non-mutating dry-run by default. `/ticks-run <epic> --execute` requires a clean non-default feature branch and runs implementation ticks in isolated worktrees (implicitly enabled), with optional `--max-parallel N`. The extension uses footer/widget status for compact TUI/RPC visibility and the same live model for the dashboard overlay.

Environment and Testing bullets execute only from an isolated Markdown inline-code span; labels and trailing prose are display-only. Environment prose that cannot be extracted blocks execution. Child failures, correctness/scope concerns, verifier failures, merge failures, and post-wave test failures remain open and retain artifacts/worktrees for repair. Ready review/closeout process ticks stop explicitly rather than being misrouted to ordinary implementers.
