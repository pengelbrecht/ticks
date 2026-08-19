# Tick Run Configuration

## Testing

- Go note: internal/worktree can fail locally when temporary repositories lack git identity; it passes in CI. Do not chase that environmental baseline.
- Go note (resolved 2026-08-12): the old TestWaitTimeout/TestWaitRaceListThenSubscribe flakes were real — a herdtest AfterList hook ordering race and a wait deadline-during-recovery misclassification. Both fixed and pinned; a recurrence is a regression, not contention.
- UI hint: when UI source changes, run pnpm install frozen, TypeScript noEmit, and targeted Vitest files; the full suite has pre-existing failures.
- Worker hint: when worker source changes, run pnpm install frozen, TypeScript noEmit, and targeted Vitest files; full pnpm test has a known workerd boot crash.

## Rules

- Epic integration goes through a PR + CI gate: the orchestrator pushes the epic branch and opens a PR; the epic close-out may not complete until the CI workflow (`.github/workflows/ci.yml`) is green on that PR. No direct merges of epic branches to the default branch.
- Package management is pnpm only — never npm or yarn.
- After UI source changes, run `scripts/build-ui.sh` and commit regenerated `internal/tickboard/server/static/`.
- Any edit under `schemas/` must run both `make codegen-go` and `make codegen-ts` and commit all regenerated output together.
- **This is a public repository. Nothing operator-specific is ever committed.** That means no secrets or tokens (obviously), and also no *identifiers* tying the repo to one operator: cloud account IDs, vault/workspace IDs, organisation names, personal or work email addresses, real bucket/database names, deployment URLs. This applies to `.tick/` notes and `.tick/activity/activity.jsonl` as much as to source — tick notes are committed files. Use placeholders (`<cloudflare-account-id>`, `<operator>`) and keep the real value in the operator's own environment. Fixtures and tests use example.com addresses.
- **Third-party credential tooling is always an optional rung, never a dependency.** Doppler (the operator-side vault used by this project's maintainer) is one supported way to supply credentials; a user without it must reach the same result through environment variables, `~/.ticksrc` (0600), or an interactive prompt, with no degraded path and no error mentioning a tool they do not have. Never commit a `doppler.yaml` (or equivalent) that binds the repo to one operator's vault — scope such tools machine-locally instead.
