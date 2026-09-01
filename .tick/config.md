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

## Standing orders

Decision classes pre-delegated to autonomous runs, with their defaults. Rung 2 of
the decide-and-log ladder (`references/agent-runner.md` → *Decide and log*).

The general test: **does the PR review see it?** Epic integration here goes through
a PR + CI gate (see Rules), so a human reads every reversible decision with the diff
in front of them. If the diff carries it, decide and log — do not spend a round trip
asking for sign-off the PR already provides.

**Decide and log** — `tk decide <id> --question … --choice … --reason …`, then keep moving:

- **Library or dependency choice within the existing stack.** Go stdlib-first; pnpm
  for JS. A genuinely new third-party dependency is still yours to make — name the
  alternative you rejected in the reason.
- **Naming, internal API shape, file layout**, including exported identifiers inside
  `internal/` (external modules cannot import them, so the blast radius is this repo).
- **Test strategy and fixture design** — what to assert, table-driven or not, where a
  fixture lives.
- **Wave partitioning and tick surgery within an epic** — splitting an oversized tick,
  giving a seam file one owner, sequencing to avoid a predictable merge conflict.
- **Discovered bugs, stale docs, and gaps → create a tick, never ask.** Scope may grow
  without permission; only the human removes it.
- **Base-branch and merge mechanics** — re-pointing a base, merging `origin/main` in,
  handing a conflict to a worker that holds the context.
- **Anything one follow-up commit reverts.** The list above is what this has meant in
  practice, not a closed set.

**Always ask** — `tk ask` when the frontier is empty, park-and-`tk tell` when it is
still moving. Never a bare question in session output:

- **Spending money, or consuming a paid quota.** Live example (2026-08-20): the
  Cloudflare credit funds Workers AI *native* inference only — gateway pass-through
  to a vendor is cash.
- **Credentials, and which account something deploys into** — including the *grade* of
  a credential. The gh-OAuth-token-vs-fine-grained-PAT call (2026-08-20) turned on
  blast radius (`admin:org`), not convenience.
- **Touching a live external system** — deploying a Worker, publishing a release,
  pushing a tag, `wrangler` against a real account, sending to a real channel.
- **Removing scope, deleting a subsystem, retiring a feature.** Every "retire fully" /
  "delete entirely" call in this repo's history was the human's and stays that way.
- **Roadmap changes** — adding, removing, or re-ordering *epics*. Re-ordering ticks
  inside an epic is the run's (above).
- **Architecture posture that outlives the epic** — one-factory-many-projects, the
  two-axis substrate model, TOML-vs-markdown for structured config. The tell: it
  changes what *future* epics assume, not just what this one ships.
- **Force-pushes, history rewrites, anything destructive outside a worktree.**
- **Prose and doctrine sign-off where the wording IS the deliverable** — skill text,
  public docs, user-facing naming.

Not a decision class: the public-repository rule in Rules above is a hard constraint,
never a judgment call. An operator-specific identifier is a rule violation, not a
trade-off to log.
