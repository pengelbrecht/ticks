# Running Epics with Claude Code

Run a Ticks epic by orchestrating subagents from your current Claude Code session. You read the dependency graph, launch one subagent per ready tick — each in its own isolated git worktree — and integrate their work wave by wave.

This is the way the skill executes ticks. (Ticks also ships a standalone runner, `tk run`, with its own worktree and cost-tracking machinery. It's intentionally out of scope here for now — see `SKILL.md`.)

## Mental model

- **You are the orchestrator.** You own all tick state: you spawn implementers, wait for them, integrate their branches, and update ticks. You don't write feature code yourself during a run — you coordinate.
- **One tick = one subagent = one worktree = one mergeable branch.** This maps directly onto the "atomic, committable piece of work" principle behind a well-formed tick.
- **Waves are your unit of parallelism.** `tk graph` groups ticks into waves; everything in a wave can run at once because nothing in it depends on anything else in it.

## Before you start: don't run on main

Orchestration produces commits and merges. If you're on `main`/`master`, create a feature branch first (e.g. `git switch -c epic/<epic-id>`) or start the run from your own worktree (`EnterWorktree`). Running an epic directly on the default branch is the one thing not to do without the user explicitly asking.

## The loop

```
1. tk graph <epic> --json          → waves + max_parallel
2. For each wave:
   a. Mark the wave's ticks in_progress
   b. Launch one Agent per tick — all in a SINGLE message — worktree-isolated, in the background
   c. Wait. The harness notifies you as each agent finishes. Do NOT poll.
   d. Integrate each finished tick: merge its branch, then close it (or route it to a human)
   e. When the whole wave is merged, run the project's test suite on the integrated tree
   f. When the wave is integrated and green, go to the next wave
3. Run a final review over the epic, then close it (or report what's awaiting a human)
```

Order matters: integrate a wave's work *before* launching the next, so wave N+1 agents branch from a tree that already contains wave N's changes.

**Verify the wave after merging, not just the ticks.** Each implementer ran its tests in its own worktree — against a tree that didn't contain its siblings' changes. Two branches can merge cleanly and still break each other (one renames a helper the other started calling). Disjoint files prove the merge is *textually* safe, not that the result works. So after a wave's merges land, run the project's test suite (or at minimum the build) before launching the next wave; if it fails, fix forward via `SendMessage` to the responsible implementer before anything else branches from the broken tree.

**Optional: dependency-driven launching.** Waves are a barrier: nothing in wave N+1 starts until all of wave N is integrated. But a tick is actually ready the moment *its specific blockers* are merged and verified. Since you're woken per-agent anyway, you can launch a tick as soon as its last blocker integrates instead of waiting for the whole wave — a throughput win on epics with uneven waves. Wave barriers remain the simpler default and easier to audit; if you go dependency-driven, the per-tick rules below (merge, verify, then launch dependents) still apply unchanged.

**Run continuously.** Once the user has asked you to execute the epic, work wave to wave without stopping to ask "should I continue?". The only reasons to stop are: a blocker you can't resolve, genuine ambiguity that prevents progress, or the epic is done. Progress-summary check-ins between waves just cost the user time.

## Launching agents

Use the `Agent` tool. Spawn every tick in the current wave in **one message** so they truly run in parallel:

```
Agent(
  subagent_type: "general-purpose",
  description: "Implement <tick-title>",     # 3-5 words
  prompt: <implementer prompt, see below>,
  isolation: "worktree",                     # own git worktree, auto-cleaned if it makes no changes
  run_in_background: true,                    # async — you're notified on completion
  model: "sonnet"                            # see model selection below
)
```

Some harness versions accept extra parameters — `name:` (e.g. `auth-w1-abc`, readable in logs and addressable via `SendMessage`) and `mode: "bypassPermissions"` (fully autonomous, no tool-permission prompts). Check the Agent tool's actual schema before passing them; where `name` isn't supported, address the agent via the ID the Agent call returns.

### Harden the boundary with a custom agent (recommended for repeated use)

The "don't touch `.tick/`, don't run `tk`" rule below is enforced only by the prompt — and an autonomous implementer has the permissions to break it. If you orchestrate ticks regularly in a project, define a project-level subagent (e.g. `.claude/agents/ticks-implementer.md`) that bakes in the implementer instructions and *denies* `tk` and edits under `.tick/**` via tool permission rules (or a PreToolUse hook). Then launch with `subagent_type: "ticks-implementer"` instead of `general-purpose`. That turns the boundary from a request into a guarantee, and versions the implementer contract instead of re-pasting it per launch. Either way, the orchestrator still verifies the boundary at merge time (see "Integrating finished work").

### Choosing a model per tick

Pick the model for each tick, not once for the run. Use the least powerful model that can do the job — it's faster and cheaper, and most well-specified ticks are mechanical.

| Tick shape | Model |
|---|---|
| 1-2 files, complete spec, tests to pass | `haiku` or `sonnet` |
| Multiple files, integration concerns | `sonnet` |
| Real design judgment or broad codebase understanding | `opus` |

### Why worktree isolation

Each agent gets its own working directory on its own branch, so parallel agents in a wave can't clobber each other's files or fight over the git index. That's what makes a wave safe to run wide. Worktrees that make no changes are cleaned up automatically; ones with work persist as a branch for you to merge.

For a wave with a single tick — or when you deliberately want to run sequentially — you can drop `isolation: "worktree"` and let the agent work in the shared tree. Only do that when nothing else is running concurrently; concurrent agents sharing one tree is the exact problem worktrees solve.

## Waiting for completion (no polling)

When you launch background agents, you receive a `<task-notification>` as each one finishes. Continue once you have what you need — there is no poll loop, no `sleep`, no block-waiting on output.

> `TaskOutput` is deprecated, and for a subagent its output file is the full conversation transcript — reading it will flood your context. Use the value the `Agent` tool returns instead.

This is the biggest change from older versions of this workflow: you launch a wave and **wait to be woken**, rather than babysitting a polling loop.

## Implementer status protocol

Ask each implementer to end with one of four statuses. Structured statuses let you route the result correctly instead of parsing prose.

| Status | Meaning | Your move |
|---|---|---|
| `DONE` | Implemented, tests pass, committed | Integrate (see below) |
| `DONE_WITH_CONCERNS` | Done, but flagged doubts | Read the concerns. Correctness/scope doubts → resolve before integrating. Observations → note and proceed. |
| `NEEDS_CONTEXT` | Missing info it couldn't get | Provide what's missing via `SendMessage` to the same agent (it keeps its context) |
| `BLOCKED` | Can't complete | See "When an agent is blocked" below |

Never force the same agent to retry on the same model with no change. If it's stuck, something has to change.

## Integrating finished work

Each implementer commits its code in its own worktree and reports its branch name. For each `DONE` tick:

```bash
# 1. Verify the agent stayed inside its boundary (should print nothing)
git diff --name-only HEAD...<agent-branch> -- .tick/

# 2. Merge and close
git merge <agent-branch>     # branch name comes from the agent's report
tk close <tick-id> --reason "Completed via Claude orchestration"
```

Because agents only ever touch code — never `.tick/`, never `tk` — their branches change different files than your tick-state updates, so merges stay clean. Hold that invariant: **agents implement; the orchestrator owns tick state.** The check in step 1 is how you *enforce* it rather than hope for it: if the diff shows `.tick/` changes, strip them out of the merge instead of letting them collide with your state updates:

```bash
git merge --no-commit <agent-branch>
git checkout HEAD -- .tick/          # discard the agent's .tick/ changes
git commit
tk note <tick-id> "Agent modified .tick/ — changes stripped at merge"
```

### When a merge conflicts

Planning keeps same-wave ticks on disjoint files, but "files likely touched" is a prediction — agents drift, and shared files (lockfiles, generated code, a common router) slip through. When `git merge` reports a conflict:

1. `git merge --abort` — don't hand-resolve conflicts in code you didn't write while other agents are running.
2. `SendMessage` the implementer that owns the branch: tell it to rebase its branch onto the current integration HEAD (give it the commit hash), resolve the conflicts in its own worktree — it has full context on its changes — re-run its tests, and re-commit.
3. Merge the rebased branch. It should now fast-forward or merge clean.
4. If the conflict reveals a real plan problem (two ticks genuinely needed the same edit), note it on the tick and fix the partitioning — add the missing `--blocked-by` for the rest of the epic rather than fighting the same collision every wave.

Only resolve a conflict yourself when it's mechanical and unambiguous (e.g. a lockfile regeneration) and you verify the result with the test suite afterward.

## Reviewing the work

Ticks are designed to carry their own success criteria (tests in the acceptance), and implementers verify those before reporting `DONE`. On top of that:

- **Always** run one final review over the epic's full diff before closing the epic (see "Closing the epic").
- **Per-tick review is worth it** for ticks created with `--requires review`/`--requires approval`, and for any tick that needed `opus`. When you want it, run a two-stage review (cheaper than debugging later):
  1. **Spec compliance** — does the diff match the tick's description + acceptance, with nothing missing and nothing extra? (Can be a quick inline check or a cheap reviewer subagent.)
  2. **Code quality** — only after spec compliance passes. Dispatch a reviewer subagent over the tick's branch.

  If a reviewer finds issues, `SendMessage` the original implementer to fix them, then re-review. Don't move on with open issues.

Skipping per-tick review for routine, well-specified ticks is fine — that's the speed dividend of a good tick. Reserve the heavier review for the ticks that earn it.

**Optional: fan out a substantial review with `Workflow`.** Review is read-only — it only reads the diff, it never touches `git` or `.tick/` — so it's the one part of a run that fits the `Workflow` tool cleanly (the execution loop does *not*: a Workflow script can't run `git merge` or `tk close`, so keep wave orchestration on the `Agent` path above). For a large epic diff, a Workflow can run the multi-dimension review as a fan-out — one agent per axis (correctness, security, performance, spec-compliance), then an adversarial verify pass over each finding — instead of a single reviewer subagent. This is strictly an upgrade to the *review* step, and entirely optional: `Workflow` is a newer, Claude-Code-specific tool, so a single reviewer subagent remains the portable default. Reach for it only when the epic is big enough that broader, parallelized review earns the extra machinery.

## Human-in-the-loop ticks

If a tick declared an approval gate, don't close it — route it to the human:

```bash
tk update <tick-id> --awaiting approval     # or review / content, per the tick
```

Surface it to the user. On a verdict:
- **Approved** → integrate (if not already) and `tk close`.
- **Rejected with feedback** → reopen the work. Prefer `SendMessage` to the *same* agent — it still has full context of what it built — over spawning a cold one:

```
SendMessage(to: "<agent-name>", message: "Reviewer feedback: <verbatim feedback>. Please address and re-commit.")
```

## When an agent is blocked

1. Read its report — it should name the blocker.
2. Note it on the tick: `tk note <tick-id> "Agent blocked: <reason>"`.
3. Decide:
   - **Missing context** → `SendMessage` the same agent with what it needed.
   - **Needs more reasoning** → re-dispatch on a stronger model (`opus`).
   - **Too big** → split the tick, re-graph.
   - **The plan itself is wrong** → stop and raise it with the user.
4. Keep going with the rest of the wave. A blocked tick may leave its dependents blocked — that's fine; report them at the end.

## Closing the epic

```bash
# Final review over everything the epic produced
git diff <base-branch>...HEAD          # or review the merged branches together
# (dispatch a reviewer subagent over this diff if the epic is substantial)

tk list --parent <epic-id> --status open     # anything left?
tk close <epic-id> --reason "All tasks completed via Claude orchestration"   # if all done
tk list --parent <epic-id> --awaiting=        # otherwise, report what's waiting on a human
```

## Implementer prompt template

Subagents start fresh with none of your context — give them everything. Don't make them read a plan file or guess where the task fits.

```
You are implementing one task from the Ticks issue tracker, working in an isolated git worktree.

## Task
Title: <tick-title>
Tick ID: <tick-id>
Epic: <epic-title> (<epic-id>)

## Description
<tick-description>

## Acceptance criteria
<tick-acceptance>

## How this fits
<1-2 sentences: where this sits in the epic, and what earlier ticks already built that you can rely on>

## Instructions
1. Read the relevant existing code before changing anything.
2. Implement the task test-first: write the failing test, then make it pass.
3. Run the tests named in the acceptance criteria and confirm they pass.
4. Commit your changes in this worktree: `git add -A && git commit -m "tick <tick-id>: <short summary>"`.

## Boundaries (important)
- Do NOT run any `tk` command and do NOT touch the `.tick/` directory — the orchestrator owns all tick state.
- Stay in scope: implement this tick only. Don't add features it didn't ask for.
- If the task is ambiguous or you're missing something, stop and report it — don't guess.

## Report back, ending with one status line
- Branch name (`git rev-parse --abbrev-ref HEAD`)
- Files changed and tests added
- Anything the next tick should know
- Final line, exactly one of:
  STATUS: DONE
  STATUS: DONE_WITH_CONCERNS — <what to double-check>
  STATUS: NEEDS_CONTEXT — <what you need>
  STATUS: BLOCKED — <why>
```

## Current limitations

- **Session-bound.** Orchestration lives in this Claude session; if it ends, the run stops. Tick *state* is safe on disk and in git, so you can pick up where you left off — but in-flight agents won't resume themselves.
- **Cost is yours to watch.** There's no built-in spend cap here; keep an eye on how wide and how deep you run, and lean on cheaper models for mechanical ticks.
