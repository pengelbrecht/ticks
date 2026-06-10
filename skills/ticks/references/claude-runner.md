# Running Epics with Claude Code

Run a Ticks epic by orchestrating subagents from your current Claude Code session. You read the dependency graph, launch one subagent per ready tick — each in its own isolated git worktree — and integrate their work wave by wave.

This is the way the skill executes ticks. (Ticks also ships a standalone runner, `tk run`, with its own worktree and cost-tracking machinery. It's intentionally out of scope here for now — see `SKILL.md`.)

## Mental model

- **You are the orchestrator.** You own all tick state: you spawn implementers, wait for them, integrate their branches, and update ticks. You don't write feature code yourself during a run — you coordinate.
- **One tick = one subagent = one worktree = one mergeable branch.** This maps directly onto the "atomic, committable piece of work" principle behind a well-formed tick.
- **Waves are your unit of parallelism.** `tk graph` groups ticks into waves; everything in a wave can run at once because nothing in it depends on anything else in it.

## Orchestration-evolution principle

The ticks skill must stay high-level enough to take best advantage of whatever orchestration capabilities and models are current. Speak in capabilities and tiers, never hardcoded model names or harness specifics; the orchestrator resolves them to the best available at runtime. When the harness offers a better primitive than what this doc describes, prefer the primitive and note the gap so this text can be updated.

## Before you start: don't run on main

Orchestration produces commits and merges. If you're on `main`/`master`, create a feature branch first (e.g. `git switch -c epic/<epic-id>`) or start the run from your own worktree (`EnterWorktree`). Running an epic directly on the default branch is the one thing not to do without the user explicitly asking.

## The loop

```
0. Read .tick/config.md (if present) — run its Environment pre-flight checks now, before wave 1.
1. tk graph <epic> --json          → waves + max_parallel
2. For each wave:
   a. Mark the wave's ticks in_progress
   b. Launch one Agent per tick — all in a SINGLE message — worktree-isolated, in the background
   c. Wait. The harness notifies you as each agent finishes. Do NOT poll.
   d. Integrate each finished tick: merge its branch, then close it (or route it to a human)
   e. When the whole wave is integrated, go to the next wave
3. The final-review tick and close-out tick unblock in sequence — tk next returns each in turn.
   Execute them like any other tick (see "Meta-work ticks" below).
```

Order matters: integrate a wave's work *before* launching the next, so wave N+1 agents branch from a tree that already contains wave N's changes.

### Meta-work ticks

When the orchestrator fleshes an epic into implementation ticks, it also creates two **process ticks** at planning time:

```
Epic X
├── (implementation ticks, waves as usual)
├── "Final review of epic X diff"            --blocked-by <every last-wave implementation tick>
└── "Close out epic X: retro + plan (next)"  --blocked-by <final review tick>
```

**Why at planning time:** with these ticks in the tracker from the start, every `tk next` result maps to exactly one action — implement, review, or close out. A session that dies mid-run resumes by re-invoking the skill and calling `tk next`; no state reconstruction is needed (see *Resuming a run*).

**Final-review tick** — its work is to review the epic's full diff (run a reviewer subagent for substantial epics, per the "Reviewing the work" section above) and resolve or route any findings before the close-out tick unblocks.

**Close-out tick** — this is the existing close-out convention (retro + plan the next epic). It is defined in SKILL.md's Roadmaps section; do not redefine it here. What is new: the close-out tick now has a formal predecessor (the final-review tick) and both are created at planning time rather than ad-hoc at run end.

Both meta-ticks are owned by the orchestrator, not by implementer subagents. They follow the same integrator–tick-state invariant: only the orchestrator runs `tk`; implementers never touch `.tick/`.

### Run-start: reading `.tick/config.md`

Before calling `tk graph`, read `.tick/config.md` (if present). It contains up to three sections:

- **Testing** — the exact test commands to pass on to implementers.
- **Environment** — a set of pre-flight checks to run *right now*, once, before wave 1. Each check should be a command that verifies the condition (e.g. `which docker`, `pg_isready -h localhost`). If a check fails, surface it to the user and stop; don't start a wave on a broken environment.
- **Rules** — project-specific constraints to include verbatim in every implementer prompt.

**Read it fresh at run start** — same rule as `.tick/learnings.md`. Do not inline a copy from a previous session; re-read the file from the worktree each time you start or resume a run. If the file is absent, fall back to current behavior: implementers discover test commands themselves.

**Run continuously.** Once the user has asked you to execute the epic, work wave to wave without stopping to ask "should I continue?". The only reasons to stop are: a blocker you can't resolve, genuine ambiguity that prevents progress, or the epic is done. Progress-summary check-ins between waves just cost the user time.

## Discipline rules

These rules complement the "run continuously" guidance above. Name them internally so you can act on them rather than drift past them.

- **Scope never shrinks.** You may split, merge, or reorder ticks, and scope may grow (bugs, discovered gaps) — but only the human removes scope. If the Epic-close retro's outside-in verification finds an undelivered scope item, fix it now; never relabel it "follow-up."
- **No known-failure closes.** A tick cannot close with failing acceptance criteria. There is no "close with known issues" state — it passes, or it stays open/blocked/awaiting.
- **Name the stall instinct.** Completing a large body of work triggers the instinct to summarize and hand control back. Epic boundaries with a close-out tick are waypoints, not stopping points. The "run continuously" rule above is the explicit counter to this instinct.
- **Two-tier stopping rule.** Intra-roadmap epic boundaries auto-continue (unless the downstream epic is gated with `--awaiting checkpoint` or `--requires approval`). The roadmap end — or a checkpoint/approval gate — is the hard stop where you write a completion report and yield.

## Launching agents

Use the `Agent` tool. Spawn every tick in the current wave in **one message** so they truly run in parallel:

```
Agent(
  subagent_type: "general-purpose",
  name: "<epic-slug>-w<wave>-<tick-id>",   # e.g. auth-w1-abc — readable in logs, addressable via SendMessage
  description: "Implement <tick-title>",     # 3-5 words
  prompt: <implementer prompt, see below>,
  isolation: "worktree",                     # own git worktree, auto-cleaned if it makes no changes
  run_in_background: true,                    # async — you're notified on completion
  mode: "bypassPermissions",                 # autonomous; shouldn't stop for tool-permission prompts
  model: "sonnet"                            # example — see capability tier selection below
)
```

### Choosing a capability tier per tick

Pick the tier for each tick, not once for the run. Use the least capable tier that can do the job — it's faster and cheaper, and most well-specified ticks are mechanical. The harness resolves each tier to the best available model at runtime; don't hardcode model names in prompts or scripts.

| Tick shape | Tier |
|---|---|
| 1-2 files, complete spec, mechanical work | **fastest/cheapest** — e.g. haiku-class (dated example) |
| Multiple files, integration concerns | **balanced default** — e.g. sonnet-class |
| Design judgment, broad codebase understanding, ambiguous specs | **most capable** — e.g. opus-class |

**REVIEWER-TIER RULE:** review with a model at least as capable as the one that wrote the code. Epic final reviews default to the most-capable tier.

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
git merge <agent-branch>     # branch name comes from the agent's report
tk close <tick-id> --reason "Completed via Claude orchestration"
```

Because agents only ever touch code — never `.tick/`, never `tk` — their branches change different files than your tick-state updates, so merges stay clean. Hold that invariant: **agents implement; the orchestrator owns tick state.**

## Reviewing the work

Ticks are designed to carry their own success criteria (tests in the acceptance), and implementers verify those before reporting `DONE`. On top of that:

- **Always** run one final review over the epic's full diff before closing the epic (see "Closing the epic").
- **Per-tick review is worth it** for ticks created with `--requires review`/`--requires approval`, and for any tick that needed the most-capable tier. When you want it, run a two-stage review (cheaper than debugging later):
  1. **Spec compliance** — does the diff match the tick's description + acceptance, with nothing missing and nothing extra? (Can be a quick inline check or a cheap reviewer subagent.)
  2. **Code quality** — only after spec compliance passes. Dispatch a reviewer subagent over the tick's branch.

  If a reviewer finds issues, `SendMessage` the original implementer to fix them, then re-review. Don't move on with open issues.

Skipping per-tick review for routine, well-specified ticks is fine — that's the speed dividend of a good tick. Reserve the heavier review for the ticks that earn it.

**FOUNDATION-REVIEW:** When a wave-1 tick defines a contract consumed by multiple dependents (an API shape, a shared type, a DB schema), review it before launching the dependent wave. This is the cheapest, highest-leverage review in the run — a contract bug caught here saves fixing it across every tick that depended on it.

**Review severity policy:**
- **Blocker** — must be fixed before the epic is closed out. Do not close with a known blocker.
- **Should-fix** — fix now if feasible; if deferred, record it explicitly in the retro report as accepted tech debt.
- **Nit** — fix opportunistically; silence is fine if cost is not worth it.

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
   - **Needs more reasoning** → re-dispatch at a more-capable tier.
   - **Too big** → split the tick, re-graph.
   - **The plan itself is wrong** → stop and raise it with the user.
4. Keep going with the rest of the wave. A blocked tick may leave its dependents blocked — that's fine; report them at the end.

## Closing the epic

```bash
# Final review over everything the epic produced
git diff <base-branch>...HEAD          # base branch from `tk notes <epic-id>` (see "Resuming a run"), never assumed
# (dispatch a reviewer subagent over this diff if the epic is substantial)

tk list --parent <epic-id> --status open     # anything left?
tk close <epic-id> --reason "All tasks completed via Claude orchestration"   # if all done
tk list --parent <epic-id> --awaiting=        # otherwise, report what's waiting on a human
```

Before closing the epic, run the **Epic-close retro** (see below). Write the retro report as the close reason (or as a note on the epic tick if the reason field is short).

**Merge, not squash.** Use `git merge`, never `git merge --squash`. Tick-stamped commits (`tick <id>: …`) are the audit trail the retro mines — squashing destroys it.

**Integration status.** The completion report must state the epic branch's integration status: *merged*, *awaiting PR*, or *awaiting human*. For repos with CI, the default is a PR + CI gate before merging to the default branch; configure the requirement in `.tick/config.md` Rules so every agent prompt inherits it.

---

## Epic-close retro

The retro runs inside every epic close-out task, **before** the `tk close` call. It takes 6 steps.

### `.tick/learnings.md` — format and conventions

Operational learnings for future implementer agents live in `.tick/learnings.md`. This file travels with the tracker (`.tick/` is version-controlled by design) and is read in full by every implementer and at every planning pass, so its size is a direct per-agent context tax.

**Format:** short `Problem → Cause → Rule` entries, grouped under category headers. Example:

```markdown
## Build

**Problem:** pnpm install fails in worktrees.
**Cause:** `.npmrc` references a workspace root path that doesn't exist in a bare worktree checkout.
**Rule:** Run `pnpm install --frozen-lockfile` from the package directory, not the repo root, in every implementer.
```

**Hard cap: 150 lines.** Enforce this at every retro (step 3 below).

**Read fresh at point of use — never inline from the orchestrator's context.** The orchestrator session spans epic boundaries; any copy inlined before a retro is stale after one. Implementers already have the current version in their worktree. Instruct them to read the file directly (the implementer prompt template does this), and re-read it yourself at each planning and partitioning pass rather than relying on an earlier in-context copy.

### Retro steps

#### 1. Harvest

Gather the raw material:

- `tk notes <tick-id>` for every tick in the epic — look for anything an implementer learned, flagged, or worked around.
- All `DONE_WITH_CONCERNS` reports from this epic's agents.
- Anything you noted as orchestrator during integration: merge conflicts, re-dispatches, blocked ticks, unexpected dependencies.

#### 2. Promote by tier

Each learning goes to **exactly one** destination:

| Learning kind | Destination |
|---|---|
| Rule that would have prevented a mistake, applies to any future work | `CLAUDE.md` (keep it terse; respect its size) |
| Permanent architectural / how-the-codebase-works knowledge | `docs/` |
| Operational gotcha for future implementer agents (test quirks, env traps, recurring build issues) | `.tick/learnings.md` |
| One-off detail, only matters to this epic | stays in tick notes (already persisted — do nothing) |
| A doc proven wrong by this epic | fix or delete the doc |
| Learning about the orchestration process itself (harness behavior, worktree/branching gotchas, prompt patterns) | `skills/ticks/references/claude-runner.md` or `tick-patterns.md` — so it travels to every repo |

Per-repo `.tick/learnings.md` stays for repo-specific operational gotchas; process knowledge must live in the skill to transfer across repos.

Write the promotions to their destinations now, before moving on.

#### 3. Compact `.tick/learnings.md`

Re-read the file immediately after adding new entries:

1. Merge duplicates (same problem stated twice, or a new rule that supersedes an old one).
2. Delete entries the codebase has outgrown (the trap they described no longer exists).
3. Count lines. If over 150, cut the lowest-signal entries until you are at or under the cap.

The 150-line cap is hard. Compaction is the mechanism that keeps it honest — without this step the file grows indefinitely and stops being read.

#### 4. Outside-in verification

For each scope item of the epic, verify against the *code*, not the tick status:

- The behavior exists in the code.
- Tests cover it (and pass).
- Acceptance commands from the tick actually run and succeed.

Gaps get **fixed now** or explicitly surfaced to the human. Never silently defer an undelivered scope item into the next epic.

#### 5. Drift review

Skim the epic's full diff (`git diff <base-branch>...HEAD`) for agent-typical patches:

- Workaround flags or suppressed errors (e.g., `--force`, `|| true`, `try/catch` with empty body).
- Copy-paste variants that should have been a shared utility.
- Defensive bloat added "just in case."
- `HACK`, `workaround`, `TODO: remove`, `XXX` comments.

Real drift (anything that degrades quality or increases maintenance burden) becomes cleanup ticks in the **next** epic. Scope may grow to accommodate them; it may not silently shrink.

For very large epics, this step can be fanned out with `Workflow` — one subagent per diff segment — the same way a large final review can be. Single-pass is the default.

#### 6. Retro report

Write a short summary as the epic's close reason or as a note on the epic tick. Include:

- Learnings promoted, by destination (a few bullet points per tier that received anything).
- Verification table: one row per scope item — scope item, verified yes/no, gap action if no.
- Drift found and cleanup ticks created (or "none").
- Proposed roadmap adjustments, if any, for the human to accept or reject (you may propose, not execute, roadmap changes).

---

## Resuming a run

Re-entry is just re-invoking the skill. Before starting the first wave, run the stale-state and worktree checks below, then proceed from `tk graph`/`tk next` as usual. Because meta-work is ticks, every `tk next` result maps to exactly one action:

| `tk next` result | Action |
|---|---|
| `action: implement` | Dispatch an implementer subagent (standard wave loop) |
| `action: plan` | Flesh the epic out into ticks (SKILL.md Roadmaps guidance + foundation-first procedure) |
| `action: await` | Route to the human — something is waiting on a decision or approval |
| Final-review tick unblocked | Review the epic's full diff (reviewer subagent for substantial epics) |
| Close-out tick unblocked | Run the epic-close retro, then plan and continue into the next epic |
| `tk next` returns nothing and all roadmap epics are closed | Roadmap end: write a completion report and stop |

### Stale state recovery

Run this **before the first wave on every (re)entry**, even on a fresh start (guarding against a crashed previous session costs nothing):

1. List stuck ticks: `tk list --status in_progress --all`. The `--json` output carries a `last_activity` timestamp per tick.
2. For each `in_progress` tick with no live agent and a meaningful last-activity age: it is stale. Reset it: `tk update <id> --status open`.
   - **What stays closed:** any tick already closed before the session died. Completed work is never re-opened.
   - **What re-opens:** only ticks that were still in_progress when the session died — incomplete work must be re-run from the reopened tick.
3. **Childless-epic edge case:** an `in_progress` epic with no child ticks maps to `action: implement` in `tk next`, which is unroutable — `EpicsNeedingPlanning` only considers epics with status `open`. Reset it to `open` so it correctly surfaces as `action: plan`.

### Worktree branch reconciliation

List leftover agent branches: `git branch --list 'worktree-agent-*'` and `git worktree list`. For each leftover branch:

- **If its tick is already closed, or if the agent reported `DONE` before the session died:** merge the branch now (`git merge <branch>`) then delete it.
- **Otherwise:** the work is incomplete. Remove the worktree (`git worktree remove --force <path>`) and delete the branch (`git branch -D <branch>`). The tick was reset to `open` in the step above; it re-runs from a fresh worktree.

Never leave orphaned `worktree-agent-*` branches unaccounted for. They carry uncommitted agent state that becomes stale the moment its tick re-runs from scratch.

> **Shell cwd warning (from `.tick/learnings.md`):** if your orchestration shell is cwd'd inside an agent worktree (`.claude/worktrees/agent-*`), `git merge` will target the worktree branch and `tk` will resolve the worktree's `.tick/`. Prefix every merge/`tk` chain with an explicit `cd <repo-root>` using the absolute path — don't trust the inherited cwd.

### Base branch

At run start, record the run's base branch as a first-class field on the epic tick:

```bash
tk update <epic-id> --base-branch <name>
```

Ask once if the base branch is ambiguous (e.g. the user is on a feature branch of a feature branch); from that point on, read it back via:

```bash
tk show <epic-id> --json | jq -r '.base_branch'
# or human-readable:
tk show <epic-id>   # → "Base branch:" line
```

Use this value everywhere a base branch appears: merges, final-review diffs (`git diff <base>...HEAD`), and resume. Never assume `main`. The existing rule still holds: don't run orchestration directly on the default branch.

**Fallback for older `tk` versions without `--base-branch`:** record it as a note instead (`tk note <epic-id> "base-branch: <name>"`) and read it back with `tk notes <epic-id>`.

---

## Implementer prompt template

Subagents start fresh with none of your context — give them everything. Don't make them read a plan file or guess where the task fits.

```
You are implementing one task from the Ticks issue tracker, working in an isolated git worktree.

IMPORTANT FIRST STEP: your worktree was likely created from the repo's default branch. The work you must build on lives on branch `<base-branch>`. Run `git merge <base-branch> --no-edit` first and verify `<artifact>` exists; report STATUS: BLOCKED if not.

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
1. Read `.tick/learnings.md` (if present) — accumulated gotchas from earlier epics.
2. Read `.tick/config.md` (if present) — test commands and project-specific rules for implementers.
3. Read the relevant existing code before changing anything.
4. Implement the task test-first: write the failing test, then make it pass.
5. Run the tests named in the acceptance criteria and confirm they pass.
6. Commit your changes in this worktree: `git add -A && git commit -m "tick <tick-id>: <short summary>"`.

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

- **Resumable, not continuous.** Runs resume cleanly from tick state: re-invoke the skill, run the stale-state and worktree-reconciliation checks (see *Resuming a run*), and continue from `tk next`. In-flight agents do not survive a session crash — they are identified via the stale-state check and their ticks are reset to `open` for re-dispatch. Completed work is never re-opened.
- **Cost is yours to watch.** There's no built-in spend cap here; keep an eye on how wide and how deep you run, and lean on cheaper models for mechanical ticks.
