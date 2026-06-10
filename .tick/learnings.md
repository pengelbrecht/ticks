# Learnings

Operational gotchas for implementer agents and the orchestrator. Format: Problem → Cause → Rule
under category headers. Hard cap 150 lines — compact at every epic retro.
See `skills/ticks/references/claude-runner.md` (Epic-close retro) for conventions.

## Orchestration

**Problem:** Agent worktrees start from the wrong base — work from earlier waves (or the epic's
own setup commits) is missing in the agent's checkout.
**Cause:** Worktrees created via `Agent(isolation: "worktree")` branch from the repo's default
branch, not from the orchestrator's current branch.
**Rule:** When orchestrating on a non-default branch, make the implementer's first instruction:
`git merge <epic-branch> --no-edit`, then verify a file landed by the prior wave exists before
editing. Abort with STATUS: BLOCKED if it doesn't.

**Problem:** `git merge` of an agent branch reports "Already up to date" without merging, and
`tk` commands read or write the wrong `.tick/` directory.
**Cause:** The orchestrator's shell cwd can silently end up inside an agent worktree
(`.claude/worktrees/agent-*`); git then merges into the worktree branch and `tk` resolves the
worktree's repo root.
**Rule:** In orchestration shells, prefix merge/`tk` command chains with an explicit
`cd <repo-root>` (absolute path) — don't trust the inherited cwd.
