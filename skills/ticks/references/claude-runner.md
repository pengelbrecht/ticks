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
