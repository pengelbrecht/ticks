# Tick Run Configuration

## Testing

- Pi runner: `node --test --no-warnings extensions/ticks-runner/*.test.ts`
- Go: `go test -short -count=1 ./...`
- Go note: internal/worktree can fail locally when temporary repositories lack git identity; it passes in CI. Do not chase that environmental baseline.
- UI hint: when UI source changes, run pnpm install frozen, TypeScript noEmit, and targeted Vitest files; the full suite has pre-existing failures.
- Worker hint: when worker source changes, run pnpm install frozen, TypeScript noEmit, and targeted Vitest files; full pnpm test has a known workerd boot crash.

## Pi Orchestrator

- planner_model: openai-codex/gpt-5.6-sol:xhigh
- scout_model: openai-codex/gpt-5.6-sol:low
- implement_economy_model: openai-codex/gpt-5.6-sol:low
- implement_balanced_model: openai-codex/gpt-5.6-sol:medium
- implement_strong_model: openai-codex/gpt-5.6-sol:high
- review_model: openai-codex/gpt-5.6-sol:xhigh
- max_parallel: 4

## Environment

- `which go` — Go toolchain on PATH
- `which pnpm` — pnpm on PATH (never npm/yarn in this repo)
- `git config user.email` — git identity configured

## Rules

- Epic integration goes through a PR + CI gate: the orchestrator pushes the epic branch and opens a PR; the epic close-out may not complete until the CI workflow (`.github/workflows/ci.yml`) is green on that PR. No direct merges of epic branches to the default branch.
- Package management is pnpm only — never npm or yarn.
- After UI source changes, run `scripts/build-ui.sh` and commit regenerated `internal/tickboard/server/static/`.
- Any edit under `schemas/` must run both `make codegen-go` and `make codegen-ts` and commit all regenerated output together.
