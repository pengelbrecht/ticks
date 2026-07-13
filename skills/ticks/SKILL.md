---
name: ticks
description: Work with Ticks issue tracker and AI agent runner. Use when managing tasks or issues with tk commands, running AI agents on epics, breaking down requirements into ticks, or working in a repo with a .tick directory. Triggers on phrases like create ticks, tk, run ticker, epic, close the task, plan this, break this down.
---

# Ticks Workflow

Ticks is an issue tracker designed for AI agents. The `tk` CLI manages tasks, and `tk board` provides a web-based board for monitoring; epics are executed by the current harness using the shared protocol in `references/agent-runner.md` and its Claude, Codex, or Pi adapter.

## When to Use Ticks vs TodoWrite

**Use Ticks (`tk`) for work that:**
- Spans multiple sessions or conversations
- Has dependencies on other tasks
- Is discovered during other work and should be tracked
- Needs human handoff or approval gates
- Benefits from persistent history and notes

**Use TodoWrite for:**
- Simple single-session tasks
- Work that will be completed in the current conversation
- Tracking progress on immediate work

Don't over-index on creating ticks for every small thing. Use your judgment.

## Skill Workflow

When invoked, follow this workflow:

### Step 0: Check Prerequisites

**1. Git repository:**
```bash
git status 2>/dev/null || git init
```

**2. Ticks initialized:**
```bash
ls .tick/ 2>/dev/null || tk init
```

**3. tk installed:**
```bash
which tk || echo "Install: curl -fsSL https://ticks.sh/install | sh"
```

**4. Git tracking (important):**

The `.tick/` directory should be tracked by git, not gitignored. Ticks are designed to be version-controlled so they sync across machines and team members via normal git workflows.

If you see `.tick` or `.tick/` in the project's `.gitignore`, remove it. The only things that should be gitignored are internal/local files, which is handled by `.tick/.gitignore` (ignores `.index.json` and `logs/`).

```bash
# Check if .tick is gitignored (should return nothing)
git check-ignore .tick/

# If it returns ".tick/", remove the entry from .gitignore
```

**5. Per-project runner config (`.tick/config.md`):**

Projects can place a `.tick/config.md` file in the tracked `.tick/` directory to give dispatched implementers reliable, project-specific guidance. Three recognized sections:

- **Testing** — exact test commands, including surgical per-package invocations. Eliminates the most common repeated failure: every fresh agent re-deriving (or guessing wrong) how to run the tests.
- **Environment** — pre-flight checks the orchestrator runs once before launching wave 1: CLI tools present, services up, env vars set. Write these as commands that *verify* the condition, not as instructions that ask the agent to ask the human. *Test, don't ask.*
- **Rules** — project-specific constraints for implementers (naming conventions, forbidden patterns, required review steps, etc.).

**Read fresh at point of use** — same rule as `.tick/learnings.md`. The orchestrator reads it at run start; implementers read it from their worktree. Neither inlines a stale copy from an earlier session.

**Fallback when absent:** current behavior — implementers discover test commands themselves. The file is purely additive.

**Why not `AGENTS.md` or `CLAUDE.md`?** Those files guide interactive agents in their respective harnesses. `.tick/config.md` is the runner-neutral contract for dispatched implementers and is consumed programmatically. Projects may cross-reference them, but runner config must not depend on one vendor's instruction file.

**6. Pi executable extension (when running an epic in Pi):**

Check whether Pi registered `/ticks-run`, `/ticks-status`, and `/ticks-dashboard` (RPC clients can inspect `get_commands`). If they are absent, explain that the skill supplies instructions but cannot activate extension code, and recommend the package:

```bash
pi install git:github.com/pengelbrecht/ticks
# Local checkout:
pi install /absolute/path/to/ticks
```

Do not claim that loading or invoking this skill enables those commands. A generic skill installer may have installed only `skills/ticks/`. The user may install the package or choose the manual Pi adapter flow in `references/pi-runner.md`.

### Step 1: Gather What's Already Known

Before creating ticks, collect whatever requirements already exist:

- **Existing docs** — a spec, PRD, design doc, README section, or issue description (check the repo root and `docs/`, but follow whatever convention the repo uses)
- **The conversation** — what the user has already told you

Read what you find. Don't re-ask things that are already answered.

### Step 2: Close the Gaps

Judge whether you understand the work well enough to decompose it. You should be able to answer:

- What problem does this solve, and for whom?
- What's in scope vs. nice-to-have?
- Any technical constraints or preferences?
- What does "done" look like?

If there are gaps, close them through conversation: let the user describe the full idea uninterrupted, then ask targeted questions about what's unclear (AskUserQuestion works well for quick multiple-choice decisions).

**Capture the understanding in proportion to the work:**
- *Small, clear task* — a brief restatement of scope in conversation is enough; confirm and move on
- *Larger feature or epic* — write it down (e.g. `SPEC.md`, or update the existing doc) so the ticks have a stable reference; if a doc already exists, fill in its gaps rather than starting over

Once you can answer the questions above, proceed to creating ticks.

## Creating Good Tasks

**Every task should be an atomic, committable piece of work with tests.**

The ideal task:
- Has a clear, single deliverable
- Can be verified by running tests
- Results in demoable software that builds on previous work
- Is completable in 1-3 agent iterations

**Good task:**
```bash
tk create "Add email validation to registration" \
  -d "Validate email format on blur, show error below input.

Test cases:
- valid@example.com -> valid
- invalid@ -> invalid
- @nodomain.com -> invalid

Run: go test ./internal/validation/..." \
  --acceptance "All validation tests pass" \
  --parent <epic-id>
```

**Bad task:**
```bash
tk create "Add email validation" -d "Make sure emails are valid"
# No test cases, no verification criteria - agent will guess
```

Run the **Definition of Ready** checklist in `references/tick-patterns.md` against each tick before creating it; see that file for the full patterns.

### Step 3: Create Ticks from Requirements

**Dispatch planning at frontier tier.** Decomposition is the highest-leverage decision in the epic. Always synthesize at frontier tier, even when implementation will use a cheaper model or lower reasoning effort. Use parallel read-only exploration when the harness supports it. See `references/agent-runner.md` → "Planning tier" and the active harness adapter.

Transform the gathered requirements into ticks organized by epic.

### Big picture — roadmaps, projects, and dates

> Opt-in structure conventions (ladder, container DoR, cycle/milestone/initiative): `references/big-picture.md`

Most work starts here: a flat roadmap of sequenced epics, dependencies, and nothing else. That is the **"just ship it"** default, and it is all you ever need for a single workstream. The features below — projects, buckets, `target_date` — layer on top when the work grows large enough to need them.

#### The hierarchy: tick → epic → project

Ticks has one recursive container type. Role is derived from structure and the explicit `epic` marker:

| Has children? | `epic` marker? | Children contain | Role |
|---|---|---|---|
| no | no | — | **tick** — atomic work |
| no | yes | — | **empty epic** — needs planning |
| yes | yes | any | **epic** — orchestration unit (waves, close-out, retro) |
| yes | no | all atomic | **bucket** — passive grouping only |
| yes | no | includes a container | **project** — grouping + human checkpoint |

The core principle: **containment is free and passive; orchestration is opt-in.**

- Any tick with children is a **container**: it rolls up progress and groups its descendants. No execution cost.
- The **`-t epic`** marker turns a container into an **orchestration unit**: `tk next` runs its children as waves, it gets the EPIC-SKELETON process ticks (final review + close-out/retro — see below), it is a roadmap node. The marker means the same thing whether the epic is empty or populated — it is never derived from structure alone. **Promoting an existing container to an epic (`tk update <id> -t epic`) triggers the EPIC-SKELETON check immediately** — promotion bypasses the normal planning flow, so verify/create the two process ticks at the moment of promotion, not later.
- A container *without* the marker and with only atomic children is a **bucket** — its children flow through the normal ready queue independently, never coordinated as a unit. Use a bucket when you want to group a pile of unrelated tasks for visibility without running them as an epic.
- A container *without* the marker that holds at least one other container is a **project**. A project groups and provides a human checkpoint (see continuation below). An "initiative" is just a project of projects — same type, different convention.

#### Epic definition of done (strongly encouraged)

Give every epic an explicit **definition of done**: the outside-in, user-visible conditions that mean the whole epic is complete — not merely that its child ticks closed. Store it as the epic's `--acceptance`:

```bash
tk create "Auth foundation" -t epic -d "<rough scope>" \
  --acceptance "New user can sign up, log in, and see their profile end-to-end against a real DB. \`go test ./internal/auth/...\` and the e2e signup test pass. No auth route 5xxs on the happy path."
```

Optional, but strongly encouraged — it is the single thing that lets a run know when it is *actually* finished rather than just out of ticks. The Epic-close retro verifies the code against this definition item by item (`references/agent-runner.md` → Outside-in verification); without it, the retro falls back to re-deriving scope from the epic's prose.

**Make it goal-compatible.** A definition of done is *goal-compatible* when an agent can confirm it is met with no human in the loop:

- **Checkable** — each item is a runnable command or an observable behavior, never "works well" or "feels polished".
- **Bounded** — it names what is in scope and stops; "and whatever else users want" is not a done.
- **Outside-in** — user-visible behavior and the commands that prove it, not internal implementation detail.

A goal-compatible done is what makes an epic safe to hand off and walk away from (see *Goal-ready handoff*). Items that genuinely need human taste ("looks right", "feels fast") are fine to write down, but keep them behind an `--awaiting` gate instead of expecting an autonomous run to settle them.

#### Roadmap edges

When the spec spans multiple epics, link them with ordering edges. Two types exist, and choosing correctly is the core decision:

- **`--blocked-by` = hard dependency (feasibility).** The downstream epic is never ready until the blocker closes. Use it only where the epic genuinely needs its predecessor — including sequencing chosen to avoid same-file merge conflicts (that is a real constraint, not a preference).
- **`--after` = soft ordering (preference).** It orders, but never gates readiness. `tk next` sorts soft-deferred candidates last but never hides them — when the preferred epic is infeasible, selection naturally skips ahead to the first feasible epic. Missing or closed `--after` targets are ignored.

`tk roadmap` layers epics into waves on the union of both edge types and annotates each distinctly (`← blocked by:` vs the softer `← after:`); queued status comes from hard edges only — an epic whose only open predecessors are soft stays ready/active.

Only the front epic gets child ticks. Downstream epics exist as parent-only ticks — give each a rough scope description (a paragraph plus a deliverables list), not detailed tasks. This is just-in-time detailing: future epics stay cheap to reorder or rescope.

```bash
# Create the roadmap up front — only epic A gets child ticks now
tk create "Auth foundation" -t epic -d "<rough scope>"                      # A — flesh out now
tk create "Team workspaces" -t epic -d "<rough scope>" --blocked-by <A>    # B — genuinely needs A's auth model
tk create "Billing" -t epic -d "<rough scope>" --after <B>                 # C — preferred order only, no real dependency
```

**EPIC-SKELETON invariant: every runnable epic ends with two process ticks — a final-review tick, then a close-out tick.** Create both at planning time, immediately after the implementation ticks, whenever an epic gets child ticks (front epic now; downstream epics when their close-out fleshes them out):

```bash
# 1. Final review — blocked by every last-wave implementation tick
tk create "Final review of <epic A> diff" \
  --parent <A> --role review \
  --blocked-by <last-wave-tick-1> --blocked-by <last-wave-tick-2>   # every last-wave tick

# 2. Close-out — blocked by the final review, always the last child
tk create "Close out <epic A>: run epic retro, then flesh out the next feasible epic into ticks" \
  --parent <A> --role closeout \
  --blocked-by <final-review-tick>
```

The `--role review|closeout` flag makes the skeleton **structural**: `tk graph <epic> --json` reports `missing_process_ticks` (the roles no child carries) from this field, so a missing or incomplete skeleton is detected mechanically, never by title-matching. If an epic already has these ticks without roles, repair with `tk update <id> --role review|closeout`.

The final-review tick's work is reviewing the epic's full diff and resolving or routing findings before close-out unblocks (full semantics: `references/agent-runner.md` → "Meta-work ticks"). Executing the close-out means: run the epic-close retro (see `references/agent-runner.md`), then pick the next **feasible** epic in soft order — skip any that is hard-blocked or gated — read its rough scope, partition it into child ticks **including its own EPIC-SKELETON pair**, and continue with `tk graph <that-epic>`. The epic boundary is handled structurally — no discretionary handoff, no human re-prompt needed.

**Planning triggers from `tk`.** Three CLI signals tell you that an epic needs planning or repair now:

- `tk next <roadmap-epic> --json` returns `{"action":"plan",...}` when the next item is an unblocked childless epic. Human-readable output looks like `<id>  P<n> epic  <title>  (needs planning — no child ticks)`. The `action` field is present on **all** `tk next --json` results: `implement` for a ready task, `plan` for an unplannable epic, and `await` for `--awaiting` mode results — so orchestration can branch on it directly.
- `tk graph <epic> --json` returns `{"needs_planning": true,...}` when that specific epic is plannable now (zero children and unblocked). Blocked childless epics and fully-closed-children epics carry `false` with explanatory human output.
- `tk graph <epic> --json` returns `missing_process_ticks` (e.g. `["review","closeout"]`) when the epic has children but its EPIC-SKELETON is incomplete — no child carries that `--role`. The fix is repair, not replanning: create the missing process ticks (templates above). Empty array means the skeleton is complete; for a childless epic it is also empty because `needs_planning` is the signal and planning creates the skeleton.

When either signal fires, the move is: flesh the epic out into child ticks (per the roadmap guidance above and the foundation-first procedure in `references/tick-patterns.md`), then continue with `tk graph <epic>`.

**Roadmap-level changes — adding, removing, or reordering epics — are human decisions.** The agent may propose them in the retro report but must not execute them unilaterally.

This rule also covers phased specs: focus on creating ticks for the current/next phase only. Future phases are downstream epics in the roadmap — parent-only, rough scope, no detailed tasks yet.

#### Continuation and stopping

Epics auto-continue across epic boundaries by default. **Project boundaries stop for a human checkpoint** — the project's final child carries `--awaiting checkpoint` by default, so the run pauses for a human to look before the next project begins.

```bash
# Auto-continue into epic B (default) — hard edge because B genuinely needs A
tk create "Team workspaces" -t epic -d "<rough scope>" --blocked-by <A>

# Force a human review before starting epic C — soft ordering plus a gate
tk create "Billing" -t epic -d "<rough scope>" --after <B> --awaiting checkpoint
```

To run fully hands-off through all project checkpoints, pass `--autonomous` to `tk next`, or set `policy.autonomous_mode: true` in `.tick/config.json`. Other awaiting types (work, approval, input, …) still gate in autonomous mode — only checkpoint boundaries flow through.

#### Goal-ready handoff

When the front epic has a goal-compatible definition of done (above), the plan is ready to hand off: the run can flesh it out, implement, review, close it, and continue down the roadmap without checking in. After planning, make this an explicit decision *with the user* rather than sliding into the run:

- **Done is goal-compatible** → recommend the walk-away path and give the one command: run the epic from the harness (Step 5), adding `--autonomous` to `tk next` (or `policy.autonomous_mode: true`) to flow through project checkpoints as well.
- **Done is missing or not goal-compatible** → say what is unclear, offer to tighten it first, or run with the default human checkpoint at each project boundary.

This is where you decide *how far* the run goes before it stops for you — one epic, one project, or the whole roadmap — instead of discovering it mid-run.

#### Target dates and the slip signal

Any tick can carry an optional `target_date` (precise ISO day). The signal is **derived**, never stored — so it cannot go stale or produce merge conflicts:

- **overdue** — past `target_date` with at least one open descendant.
- **on track** — has a `target_date`, not yet past it.
- (no date) — no signal; work is purely dependency-driven.

Dates never gate execution. They produce a flag for humans and for filter queries.

```bash
tk create "v2.0 launch" -d "<release outcome>" --target-date 2026-09-30
tk update <id> --target-date 2026-10-15   # revise the date
tk list --overdue                          # past target_date with open work
tk list --due-before 2026-08-01           # target_date strictly before this date
tk list --sort target_date                # ascending; undated ticks sort last
```

#### Worked examples

**Example 1 — dated release grouping epics (a project)**

```bash
# "v2.0 launch" is created without -t epic, so it is a project — it groups and
# provides a checkpoint boundary but is not "run as a unit" itself.
# Its epics run exactly as epics do today.
tk create "v2.0 launch" -d "<release outcome>" --target-date 2026-09-30
tk create "Auth revamp" -t epic --parent <v2>                    # front epic — flesh out now
tk create "Billing"     -t epic --parent <v2> --after <auth>     # downstream — rough scope only
tk create "Dashboard"   -t epic --parent <v2> --after <billing>

# Epics auto-continue into each other. When the last one closes, the v2.0
# project boundary stops for human sign-off. target_date feeds the overdue /
# on-track signal; it never gates execution.
```

**Example 2 — nested projects (what Linear calls an "initiative" — pure convention)**

```bash
tk create "Q3 Platform" --target-date 2026-09-30                  # top-level project
tk create "Payments"    --parent <q3> --target-date 2026-08-15    # sub-project (milestone-ish)
tk create "Auth revamp" -t epic --parent <payments>               # epic under the sub-project

# Each sub-project boundary is its own checkpoint; the engine ascends the tree as
# each level completes.
```

**Example 3 — passive bucket (grouping without orchestration)**

```bash
# No -t epic means a bucket. Groups for visibility and rolls up a count;
# the bugs inside flow through the normal ready queue independently, never
# coordinated as a unit.
tk create "Q3 bug triage"
tk create "Fix flaky login test"       --parent <triage>
tk create "Dashboard chart off-by-one" --parent <triage>
```

#### Designing for parallel execution

Ticks in the same wave (no blocking relationship) run concurrently, each in its own git worktree. Worktrees keep agents from clobbering each other mid-run, but two ticks that edit the same file will still collide at merge time. To keep merges clean:
- If two ticks edit the same file, make one block the other so they land in different waves
- Use `tk graph <epic>` to see the waves and confirm ticks in the same wave touch different files
- Example: Task A edits `auth.go`, Task B edits `auth.go` → B should block on A
- Lockfiles count: two same-wave ticks that each add a dependency will both rewrite `pnpm-lock.yaml`/`go.sum` and conflict — serialize them, or put all dependency additions in one early tick (see `references/tick-patterns.md`)

**Slice vertically.** Carve the epic into ticks by user-visible capability (one feature front-to-back), not by layer (all schema, then all API, then all UI). Each tick should leave the system working and demoable. See `references/tick-patterns.md` for the full reasoning and the parallel-safety caveat.

**Define shared contracts first.** When several ticks consume the same interface (an API shape, a DB schema, a shared type), make one tick that defines it and have the others `--blocked-by` it. A stable contract up front lets the dependents run in parallel against a known shape instead of guessing — and keeps their descriptions naming things the same way.

**Order for working state and fail fast.** Sequence ticks so each leaves the build green and the app runnable, and put the riskiest or most uncertain ticks early — discover a wrong assumption on tick 2, not tick 12. For a phase boundary where you want to look before continuing, create an `--awaiting checkpoint` tick; for a genuinely open question, create an `--awaiting input` tick rather than guessing.

**Before running, review the epic's ticks.** Once the ticks exist, do a quick pass:
1. **Coverage** — walk each requirement from the gathered understanding (for this phase) and point to the tick that implements it. Add ticks for any gaps.
2. **Sizing** — split any tick whose title needs an "and" or whose acceptance won't fit in 3 bullets.
3. **Naming consistency** — the same interface should be called the same thing across tick descriptions; a contract named `clearLayers` in one tick and `clearFullLayers` in another is a latent bug.
4. **Wave safety** — run `tk graph <epic>` and confirm ticks in the same wave touch different files.

This review is cheap and catches the partitioning mistakes that are expensive to unwind once agents are running.

### Step 4: Guide User Through Blocking Human Tasks

If human tasks block automated tasks, guide the user through them before running the agent.

```bash
# Check for blocking human tasks
tk list --awaiting work
tk blocked  # See what's waiting
```

Walk the user through each blocking task, then close it:
```bash
tk close <id> --reason "Completed - connection string in .env"
```

### Step 5: Run the Epic

Execute the epic from the current harness. Read **`references/agent-runner.md`** first, then your harness adapter — **`references/codex-runner.md`** if you are running in Codex, **`references/claude-runner.md`** if you are running in Claude Code, **`references/pi-runner.md`** if you are running in Pi. If you haven't already, settle the *Goal-ready handoff* decision (above) before launching: how far should this run go before it stops for a human? The shape is:

1. `tk graph <epic-id> --json` — get the waves and how wide you can run. If the result contains `"needs_planning": true`, the epic has no child ticks yet — flesh it out first (see the Big picture section above), then re-run `tk graph`.
2. EPIC-SKELETON pre-flight — if the same result carries a non-empty `missing_process_ticks`, create the missing process ticks now with `--role` (templates in the Big picture section above), before wave 1.
3. For each wave, launch one implementer per ready tick, each in its own git worktree, using the adapter's parallel dispatch primitive.
4. Wait with the adapter's completion primitive, merge each finished tick's branch, and update tick state.
5. Run the test suite on the merged tree, then move to the next wave; the final-review and close-out ticks unblock in sequence when the implementation waves are done.

You own all tick state; implementers only write code in their worktrees. Run wave to wave continuously unless you hit a real blocker.

> Ticks previously shipped a standalone runner (`tk run`). It has been removed; execution now goes through a supported harness adapter.

## Quick Reference

### Creating Ticks

```bash
tk create "Title" -d "Description" --acceptance "Tests pass"  # Task
tk create "Title" -t epic                                     # Epic
tk create "Title" --parent <epic-id>                          # Under epic
tk create "Title" --blocked-by <task-id>                      # Blocked (hard dependency)
tk create "Title" --after <task-id>                           # Soft ordering preference (never blocks)
tk create "Title" --awaiting work                             # Human task
tk create "Title" --requires approval                         # Needs approval gate
tk create "Title" --parent <epic> --role review               # Epic's final-review process tick
tk create "Title" --parent <epic> --role closeout             # Epic's close-out process tick
```

> Epics take `--acceptance` too — use it for the epic's **definition of done** (strongly encouraged; see *Epic definition of done*). A goal-compatible done is what lets you hand the epic off and walk away.

> `tk` uses standard double-dash for long flags. `-acceptance`/`-parent`/`-blocked-by` (single dash) do **not** work — use `--acceptance`/`--parent`/`--blocked-by`. Single-letter shorthands like `-d`, `-t`, `-p`, `-l`, `-b` are fine.

### Querying

```bash
tk list                      # All open ticks
tk list -t epic              # Epics only
tk list --parent <epic-id>   # Tasks in epic
tk ready                     # Unblocked tasks
tk next <epic-id>            # Next task for agent
tk next <epic-id> --json     # JSON: action field is "implement" | "plan" | "await"
tk blocked                   # Blocked tasks
tk list --awaiting=          # Tasks awaiting human
tk graph <epic-id>           # Dependency graph with parallelization
tk graph <epic-id> --json    # JSON output; needs_planning:true means epic needs child ticks;
                             # non-empty missing_process_ticks means EPIC-SKELETON needs repair
```

### Managing

```bash
tk show <id>                                           # Show details
tk close <id> --reason "Completed: <one-line summary>" # Close tick — always pass --reason
tk note <id> "text"                                    # Add note
tk approve <id>                                        # Approve awaiting tick
tk reject <id> "feedback"                              # Reject with required feedback
```

**Close-reason convention:** always pass `--reason` with a concrete summary when closing.
`tk close <id> --reason "Completed: <one-line summary of what landed>"` — never a bare `tk close`.

**Actor convention (orchestrated runs):** export `TK_ACTOR=<runner>:orchestrator` at run start, such as `claude:orchestrator`, `codex:orchestrator`, or `pi:orchestrator`, so activity entries preserve runner provenance. Use `--actor <name>` to override for a single call.
Precedence: `--actor` flag > `TK_ACTOR` env > tick-owner default.

### Running the Epic

Drive execution from the current harness (shared details in `references/agent-runner.md`; then `codex-runner.md` for Codex, `claude-runner.md` for Claude Code, `pi-runner.md` for Pi):

```bash
# 1. Get the dependency graph (waves + max parallelism)
tk graph <epic-id> --json
```

```
# 2. Select the role tier, then launch one isolated implementer per ready tick.
#    Planning and final review use frontier settings. Implementation uses the
#    adapter's economy/balanced/strong mapping.
#
# 3. Wait using the adapter's native primitive, then integrate each tick:
git diff --name-only HEAD...<agent-branch> -- .tick/   # boundary check: must be empty
git merge <agent-branch>   # if it conflicts: abort, have the agent rebase + resolve in its worktree
tk close <tick-id> --reason "Completed: <one-line summary of what landed>"

# 4. After the wave's merges land, run the test suite before launching the next wave
```

### Planning Parallel Execution

Before launching agents, use `tk graph` to understand the parallelism:

```bash
tk graph <epic-id>        # Human-readable wave breakdown
tk graph <epic-id> --json # Machine-readable for orchestration
```

The graph shows:
- **Waves**: groups of ticks that can run in parallel
- **Max parallel**: how many subagents you can launch at once in the widest wave
- **Critical path**: minimum number of sequential waves to finish the epic
- **Dependencies**: what each tick is blocked by

Launch up to `max_parallel` subagents per wave (cap it if you want to limit cost or noise), and merge each wave before starting the next so dependent ticks build on completed work.

See `references/tk-commands.md` for full reference.

## Assisting with Awaiting Ticks

When working interactively, help users process awaiting ticks:

```bash
tk list --awaiting=   # Find ticks awaiting human
tk next --awaiting=   # Next one needing attention
```

Use AskUserQuestion to help users decide, then execute:

```bash
# User approves
tk approve <id>

# User rejects
tk reject <id> "feedback here"

# User provides input
tk note <id> "Use sliding window algorithm" --from human
tk approve <id>
```

Always use `--from human` when adding notes on behalf of the user.
