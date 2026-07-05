# Claude Code Runner Adapter

Read [`agent-runner.md`](agent-runner.md) first. This file maps its capability contract onto Claude Code; it does not redefine tick semantics or recovery.

## Capability mapping

| Shared capability | Claude Code primitive |
|---|---|
| Isolation | `Agent(..., isolation: "worktree")` |
| Parallel dispatch | Put all `Agent` calls for a wave in one message with `run_in_background: true` |
| Completion | Agent completion notifications and the value returned by `Agent` |
| Continuation | `SendMessage` to the named agent or returned agent ID (live agents in this session only — see "Continuation after a crash") |
| Review | A read-only reviewer `Agent` (see "Review" below for axis mapping; "Workflow" before reaching for fan-out) |

Set `TK_ACTOR=claude:orchestrator` before tracker writes. For orchestrator self-isolation (the "don't run on main" rule), `EnterWorktree` gives the orchestrating session its own worktree as an alternative to creating a feature branch.

## Tier resolution

Resolve the shared capability tiers to Claude model classes. The tier names are the contract; the parenthesized models are dated examples — resolve each against what the harness offers today, and when it exposes fewer levels, collapse adjacent tiers downward (balanced and strong merge first).

| Shared tier | Claude model class |
|---|---|
| economy implementation | smallest current model (haiku-class, dated example) |
| balanced implementation | mid-tier workhorse (sonnet-class, dated example) |
| strong implementation | large non-frontier model (opus-class, dated example) |
| frontier | most capable model available (fable-class, dated example) |

The shared tier table is guidance, not enforcement: the orchestrator is assumed to run on a frontier-class model and is trusted to weigh each tick's actual complexity — round up when a "mechanical" tick hides judgment (load-bearing docs, deletions needing reference triage).

**`model=` is REQUIRED on every `Agent` call.** Omitting it is not "defaulting to balanced" — the subagent silently inherits the orchestrator's model, which is normally frontier. Pick a tier first, then resolve it; never omit.

## Dispatch

```text
Agent(
  subagent_type: "general-purpose",
  description: "Implement <tick-title>",
  prompt: <shared implementer prompt>,
  isolation: "worktree",
  run_in_background: true,
  mode: "bypassPermissions",
  model: "<resolved tier>",
  name: "tick-<tick-id>"  # when supported
)
```

## Worktree provisioning under `isolation: "worktree"`

The harness creates the worktree **at agent launch**, so the orchestrator cannot provision it beforehand. Two resolutions of the shared protocol's provisioning step (`agent-runner.md` → "Provisioning: runnable worktrees"):

- **Default: implementer self-provisions.** The shared prompt template's step 3 handles it — the agent applies the profile's recipe as its first action, before touching code. This requires the recipe to already exist in `.tick/profile.md` (discovered solo at run start, step 0.5), or the wave's agents will each rediscover it.
- **Alternative: orchestrator-created worktrees.** When provisioning must precede the agent (heavy setup, private resources, or you want to verify runnability before paying for a dispatch), create the worktree yourself with the shared deterministic naming (`../.ticks-worktrees/<tick-id>`), provision it, then dispatch a normal `Agent` **without** `isolation: "worktree"` and point its prompt at that directory and branch.

Watch the concurrency cost: N simultaneous full dependency installs can thrash disk/network — prefer profile recipes that share immutable state safely from the main checkout, and remember the shared-deps **no-install** boundary from the shared protocol. Apply the shared **economic gate** before provisioning wide — when a wave is too narrow/short to repay provisioning, deliberate-and-noted sequential is the correct call. Do NOT let a provisioning failure silently degrade the run to shared-tree sequential execution — that forfeits the wave's parallelism, which is the point of isolation; if provisioning fails, fix the recipe (or fall back deliberately and note it), don't drift.

If worktrees are **pooled** across ticks (shared protocol → "Amortize: pool worktrees"), the manual-worktree dispatch path above is the natural fit (harness-created `isolation: "worktree"` trees are single-shot); run the successful-integration cleanup below at pool retirement (epic end), not per tick.

## Successful-integration cleanup

This is the adapter's resolution of the shared protocol's "run the active adapter's successful-integration cleanup" step (`agent-runner.md`). **Claude isolation worktrees are not self-cleaning once they hold commits.** The harness auto-removes an `isolation: "worktree"` directory only while it is *unchanged*; every tick implementer commits code, so its worktree and `worktree-agent-*` branch persist after the run and accumulate under `.claude/worktrees/` (multi-GB leaks across a few epics). The orchestrator must remove them explicitly — do not assume the harness will.

After a tick's branch is merged and the tick is closed (and only then), remove its worktree and branch:

```bash
# branch comes from the agent's report, e.g. worktree-agent-a1bdb1ab…
git worktree remove ".claude/worktrees/${branch#worktree-}"   # path = .claude/worktrees/agent-<id>
git branch -d "$branch"                                        # safe delete; -d fails if not merged
```

`git branch -d` (not `-D`) is the guard: it refuses to delete a branch whose commits aren't merged, so a mis-derived branch name or an un-integrated tick won't silently lose work. As with the other adapters, **do not clean up a blocked or incomplete worktree** — it is durable handoff state (see "Continuation after a crash").

Note `git branch -d` checks ancestry against the *current* branch. Run cleanup while still on the epic integration branch (where the real `git merge` made the tick branch an ancestor), not after a later squash-merge to the default branch — squashing rewrites SHAs, after which `-d` can no longer recognize the branch as merged and will refuse. If a sweep finds branches stranded that way but you've confirmed their content is in the default branch, `git branch -D` is the deliberate override.

If the orchestrator took its own worktree via `EnterWorktree` for self-isolation, release it with `ExitWorktree` at epic end rather than leaving it behind.

## Branch naming and crash recovery

Claude-managed worktrees do not use the deterministic shared convention: the harness assigns the branch name (historically `worktree-agent-*`, under `.claude/worktrees/`), and the orchestrator only learns it from the implementer's report. So the shared protocol's "record the branch in a durable note" happens **when the report arrives**, not before launch — write `tk note <tick-id> "runner-state: runner=claude branch=<reported-branch>"` as the first integration step for every finished tick.

That leaves a window: a session that dies mid-wave has live branches with no note. During worktree reconciliation, sweep for them explicitly — `git branch --list 'worktree-agent-*'` and `git worktree list` (look under `.claude/worktrees/`) — and match each to its tick by commit messages (`tick <id>: …`) or diff content. On handoff, branch plus tick ID is authoritative; the Claude agent ID is optional continuation metadata.

## Continuation after a crash

`SendMessage` only reaches agents alive in the current session. To continue incomplete work in an existing worktree after a crash or handoff, dispatch a fresh `Agent` **without** `isolation: "worktree"` and instruct it in the prompt to work in the existing worktree directory on the existing branch (give it the absolute path and branch name, plus the prior report and what remains). Never let it create a second branch for the tick.

## Workflow

The execution loop does **not** fit the `Workflow` tool: a Workflow script can't run `git merge` or `tk close`, so keep wave orchestration on the `Agent` path. `Workflow` fan-out is strictly an optional upgrade to the read-only *review* step (one agent per axis, then verify findings) for epics big enough to earn it; a single reviewer `Agent` remains the default.

## Review

The shared doc defines the review-axis menu (spec compliance, correctness, security, performance, error handling, test quality, type/contract design, comment accuracy) and the severity + confidence output. Map those axes onto Claude subagents two ways:

- **Purpose-built agents, if installed.** Claude Code's `pr-review-toolkit` plugin ships axis-specialized reviewers — `silent-failure-hunter` (error handling), `pr-test-analyzer` (test quality), `type-design-analyzer` (type/contract design), `comment-analyzer` (comment accuracy), `code-reviewer` (general quality + spec compliance), `code-simplifier` (simplification, which doubles as the retro drift pass). When a consuming repo has these — or equivalents — as `subagent_type` values, dispatch them directly, one per axis the diff earns.
- **Otherwise, a focused `general-purpose` Agent per axis.** Give it a single axis as its remit and the shared severity + confidence format. Don't ask one agent to cover every axis at once — independent passes are the point of fan-out.

Resolve the reviewer to a model **at least as capable as the implementer** (shared REVIEWER-TIER RULE), and to the frontier class for the epic final review. To parallelize, put the axis `Agent` calls in one message with `run_in_background: true`; the orchestrator then verifies findings against the code — low-confidence ones especially — before acting. Agents review; the orchestrator adjudicates.

## Boundary hardening

For repeated use, define a project-level `.claude/agents/ticks-implementer.md` that denies `tk` and writes under `.tick/**`, then use that subagent type. PreToolUse hooks receive parameters nested under `tool_input` (not at the top level); on exit 2, write the explanation to stderr — Claude Code feeds stderr back to the model. Test new hooks against the real input shape before committing them.

Do not use `TaskOutput` for subagent results; it can load the full transcript. Use the `Agent` result and completion notification.
