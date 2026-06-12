# Tick Run Configuration

## Testing

- Go: `go test -short -count=1 ./...` (known baseline failure: `internal/worktree` — environmental git-identity issue in test temp repos; passes in CI. Do not chase locally.)
- UI: `cd internal/tickboard/ui && pnpm install --frozen-lockfile && pnpm exec tsc --noEmit && pnpm test` (full suite has pre-existing baseline failures — implementers run targeted `pnpm exec vitest run <files>` and must not add new failures; tsc must stay clean.)
- Worker: `cd cloud/worker && pnpm install --frozen-lockfile && pnpm exec tsc --noEmit` (full `pnpm test` has a known workerd boot crash — verify worker changes with targeted `npx vitest run test/<file>.test.ts`.)

## Environment

- `which go` — Go toolchain on PATH
- `which pnpm` — pnpm on PATH (never npm/yarn in this repo)
- `git config user.email` — git identity configured

## Rules

- Epic integration goes through a PR + CI gate: the orchestrator pushes the epic branch and opens a PR; the epic close-out may not complete until the CI workflow (`.github/workflows/ci.yml`) is green on that PR. No direct merges of epic branches to the default branch.
- Package management is pnpm only — never npm or yarn.
- After UI source changes, run `scripts/build-ui.sh` and commit regenerated `internal/tickboard/server/static/`.
- Any edit under `schemas/` must run both `make codegen-go` and `make codegen-ts` and commit all regenerated output together.
