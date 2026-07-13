# Tick Run Configuration

## Worktree setup

A fresh worktree has the Go source but no `node_modules` — the UI and worker cannot build or test until installed. Run before implementing (skip the ones your tick doesn't touch):

- Go: nothing to do. The module cache is shared and read-only.
- UI: `cd internal/tickboard/ui && pnpm install --frozen-lockfile`
- Worker: `cd cloud/worker && pnpm install --frozen-lockfile`

These are **private** installs into the worktree, not a link to the main checkout's `node_modules`, so they are safe to run concurrently and the shared-deps no-install boundary does not apply here.

## Testing

All tiers below run **in-worktree** — they use no shared database, port, or service, so a wave can verify in parallel.

- Go: `go test -short -count=1 ./...` (known baseline failure: `internal/worktree` — environmental git-identity issue in test temp repos; passes in CI. Do not chase locally.)
- UI: `cd internal/tickboard/ui && pnpm install --frozen-lockfile && pnpm exec tsc --noEmit && pnpm test` (full suite has pre-existing baseline failures — implementers run targeted `pnpm exec vitest run <files>` and must not add new failures; tsc must stay clean.)
- Worker: `cd cloud/worker && pnpm install --frozen-lockfile && pnpm exec tsc --noEmit` (full `pnpm test` has a known workerd boot crash — verify worker changes with targeted `npx vitest run test/<file>.test.ts`.)

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
