# Codex Runner Adapter

Read [`agent-runner.md`](agent-runner.md) first. This file maps its capability contract onto Codex. It uses standard git worktrees plus `codex exec`, so it works even when the current Codex harness does not expose an in-process subagent tool.

## Capability mapping

| Shared capability | Codex primitive |
|---|---|
| Isolation | `git worktree add -b tick/<epic>/<tick> <path> <integration-commit>` |
| Parallel dispatch | One background `codex exec -C <worktree>` process per ready tick |
| Completion | Shell `wait` plus `--output-last-message <report>` |
| Continuation | `codex exec resume` when a session is available; otherwise redispatch in the same worktree |
| Review | `codex exec review` or a read-only `codex exec` against the diff |

Set `TK_ACTOR=codex:orchestrator` before tracker writes.

## Dispatch

Create worktrees from the current integration commit, not from an assumed default branch:

```bash
repo=$(git rev-parse --show-toplevel)
integration_commit=$(git rev-parse HEAD)
codex_model="${CODEX_MODEL:-gpt-5.5}" # verify current strongest model when latest matters
branch="tick/<epic-id>/<tick-id>"
worktree="$(dirname "$repo")/.ticks-worktrees/<tick-id>"
report="$(dirname "$repo")/.ticks-worktrees/<tick-id>.report"
log="$(dirname "$repo")/.ticks-worktrees/<tick-id>.log"

git worktree add -b "$branch" "$worktree" "$integration_commit"
tk note <tick-id> "runner-state: runner=codex branch=$branch worktree=$worktree base=$integration_commit"

codex exec \
  -C "$worktree" \
  --model "$codex_model" \
  --config 'model_reasoning_effort="medium"' \
  --sandbox workspace-write \
  --output-last-message "$report" \
  - < "$prompt_file" > "$log" 2>&1 &
pid=$!
```

Prepare `prompt_file` from the shared implementer template. Launch every ready tick before waiting. Keep an in-memory `tick -> pid` map, then use shell `wait <pid>` for completion. This is blocking process supervision, not polling. Read the small report first; inspect the log only for failures or missing status.

After a successful merge and tick close, remove the manually created worktree before deleting its merged branch:

```bash
git worktree remove "$worktree"
git branch -d "$branch"
rm -f "$report" "$log" "$prompt_file"
```

Do not clean up a blocked or incomplete worktree; it is durable handoff state.

## Model and effort policy

Codex cost control is primarily an **effort** decision, not a small-model decision. Do not automatically downshift implementation to mini/nano models. Unless the user configures another mapping, use the current strongest generally available Codex model for every role and vary `model_reasoning_effort`:

| Work | Model | Reasoning effort |
|---|---|---|
| Mechanical implementation with precise acceptance | strongest Codex model | `low` |
| Normal implementation | strongest Codex model | `medium` |
| Subtle or integration-heavy implementation | strongest Codex model | `high` |
| Epic planning and decomposition | strongest Codex model | `high` |
| Foundation, security, and final review | strongest Codex model | `high` |

At the time this adapter was updated, the recommended strongest model is `gpt-5.5`; verify the current Codex model catalog when "latest" matters. Prefer project profiles for stable automation, for example `codex exec --profile implementation-low` and `--profile review-high`. Mini, nano, or other reduced-capability models are opt-in only.

## Continuation and handoff

`codex exec resume <session-id>` is useful within one live orchestration session, but session IDs are not durable runner state. After a crash or cross-runner handoff, run a fresh `codex exec -C <existing-worktree>` with the tick, prior report, review feedback, and current branch state. Never create a second branch for the tick.

Codex loads `AGENTS.md` automatically. The implementer prompt must also tell it to read `.tick/config.md` and `.tick/learnings.md`; those files are execution inputs even though the implementer must not modify `.tick/`.

## Boundary hardening

Use Codex exec policies or hooks, when available, to deny `tk` and writes under `.tick/**`. `workspace-write` limits filesystem access but does not by itself enforce that logical boundary, so the orchestrator must still run the pre-merge `.tick/` diff check.
