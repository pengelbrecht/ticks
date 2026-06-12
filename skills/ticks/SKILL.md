---
name: ticks
description: Work with Ticks issue tracker and AI agent runner. Use when managing tasks or issues with tk commands, running AI agents on epics, breaking down requirements into ticks, or working in a repo with a .tick directory. Triggers on phrases like create ticks, tk, run ticker, epic, close the task, plan this, break this down.
---

# Ticks Workflow

Ticks is an issue tracker designed for AI agents. The `tk` CLI manages tasks, and `tk board` provides a web-based board for monitoring; epics are executed by orchestrating Claude Code subagents (see references/claude-runner.md).

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
which tk || echo "Install: curl -fsSL https://raw.githubusercontent.com/pengelbrecht/ticks/main/scripts/install.sh | sh"
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

**Why not `CLAUDE.md`?** `CLAUDE.md` is for anyone working interactively in the repo (humans and interactive agents alike). `.tick/config.md` is specifically the contract for dispatched implementer agents and is consumed programmatically. Projects may of course cross-reference one from the other, but the distinction keeps the operator-facing config separate from the interactive config.

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

**Dispatch planning at frontier tier.** The decomposition step — partitioning work, sequencing dependencies, identifying wave conflicts, defining contracts-first ordering — is the highest-leverage decision in the whole epic. Always synthesize at frontier tier, even when the current session is running on a lower model. Because Claude supports nested subagents, the right shape is: dispatch a frontier planning subagent that itself spawns cheap exploration sub-agents to read the codebase, then synthesizes their findings into the tick structure. See `references/claude-runner.md` → "Planning tier" for details.

Transform the gathered requirements into ticks organized by epic.

### Roadmaps (multi-epic work)

When the spec spans multiple epics, create a **roadmap**: a set of epics linked with ordering edges. Two edge types exist, and choosing the right one is the core roadmap decision:

- **`--blocked-by` = hard dependency (feasibility).** The downstream epic is never ready until the blocker closes. Use it only where the epic *genuinely needs* its predecessor — including sequencing chosen to avoid same-file merge conflicts between epics (that is a real constraint, not a preference).
- **`--after` = soft ordering (preference).** It orders, but never gates readiness. `tk next` sorts soft-deferred candidates last but never hides them — when the preferred epic is infeasible (hard-blocked or gated), selection naturally skips ahead to the first feasible epic; no flag needed. Missing or closed `--after` targets are ignored.

Only the front epic gets child ticks. Downstream epics exist as parent-only ticks — give each a rough scope description (a paragraph plus a deliverables list), not detailed tasks. This is just-in-time detailing: future epics stay cheap to reorder or rescope.

```bash
# Create the roadmap up front — only epic A gets child ticks now
tk create "Auth foundation" -t epic -d "<rough scope>"                          # A — flesh out now
tk create "Team workspaces" -t epic -d "<rough scope>" --blocked-by <A>         # B — genuinely needs A's auth model
tk create "Billing" -t epic -d "<rough scope>" --after <B>                      # C — preferred order only, no real dependency
```

**Parallel fronts.** Because `--after` never gates readiness, more than one epic can be ready at once — the roadmap has a *front* of feasible epics, not a single head. `tk show` renders soft edges on an `After:` line; `tk roadmap` layers waves on the union of both edge types and annotates each kind distinctly (`← blocked by:` vs the softer `← after:`); queued status comes from hard edges only — an epic whose only open predecessors are soft stays ready/active.

**Always append a close-out task as the final child of the front epic.** This task is real work:

```bash
tk create "Close out <epic A>: run epic retro, then flesh out the next feasible epic into ticks" \
  --parent <A> \
  --blocked-by <last-task-in-A>
```

Executing this task means: run the epic-close retro (see `references/claude-runner.md`), then pick the next **feasible** epic in soft order — skip any epic that is hard-blocked or gated — read its rough scope, partition it into child ticks, and continue with `tk graph <that-epic>`. The epic boundary is handled structurally — no discretionary handoff, no human re-prompt needed.

**Planning triggers from `tk`.** Two CLI signals tell you that an epic needs to be fleshed out now:

- `tk next <roadmap-epic> --json` returns `{"action":"plan",...}` when the next item is an unblocked childless epic. Human-readable output looks like `<id>  P<n> epic  <title>  (needs planning — no child ticks)`. The `action` field is present on **all** `tk next --json` results: `implement` for a ready task, `plan` for an unplannable epic, and `await` for `--awaiting` mode results — so orchestration can branch on it directly.
- `tk graph <epic> --json` returns `{"needs_planning": true,...}` when that specific epic is plannable now (zero children and unblocked). Blocked childless epics and fully-closed-children epics carry `false` with explanatory human output.

When either signal fires, the move is: flesh the epic out into child ticks (per the roadmap guidance above and the foundation-first procedure in `references/tick-patterns.md`), then continue with `tk graph <epic>`.

**Human gates are chosen at roadmap creation time.** Create a downstream epic with `--awaiting checkpoint` or `--requires approval` to force a stop at that boundary. Without either flag the run auto-continues through the boundary. Default: **auto-continue**.

```bash
# Auto-continue into epic B (default) — hard edge because B genuinely needs A
tk create "Team workspaces" -t epic -d "<rough scope>" --blocked-by <A>

# Stop for human review before starting epic C — soft ordering plus a gate
tk create "Billing" -t epic -d "<rough scope>" --after <B> --awaiting checkpoint
```

**Roadmap-level changes — adding, removing, or reordering epics — are human decisions.** The agent may propose them in the retro report but must not execute them unilaterally.

This rule also covers phased specs: focus on creating ticks for the current/next phase only. Future phases are downstream epics in the roadmap — parent-only, rough scope, no detailed tasks yet.

**Epic organization:**
1. Group related tasks into logical epics (auth, API, UI, etc.)
2. Create tasks with dependencies using `--blocked-by`
3. Mark human-required tasks with `--awaiting work`

**Designing for parallel execution:**
Ticks in the same wave (no blocking relationship) run concurrently, each in its own git worktree. Worktrees keep agents from clobbering each other mid-run, but two ticks that edit the same file will still collide at merge time. To keep merges clean:
- If two ticks edit the same file, make one block the other so they land in different waves
- Use `tk graph <epic>` to see the waves and confirm ticks in the same wave touch different files
- Example: Task A edits `auth.go`, Task B edits `auth.go` → B should block on A
- Lockfiles count: two same-wave ticks that each add a dependency will both rewrite `pnpm-lock.yaml`/`go.sum` and conflict — serialize them, or put all dependency additions in one early tick (see `references/tick-patterns.md`)

```bash
# Create epics
tk create "Authentication" -t epic
tk create "API Endpoints" -t epic

# Create tasks with acceptance criteria
tk create "Add JWT token generation" \
  -d "Implement JWT signing and verification" \
  --acceptance "JWT tests pass" \
  --parent <auth-epic>

tk create "Add login endpoint" \
  -d "POST /api/login with email/password" \
  --acceptance "Login endpoint tests pass" \
  --parent <api-epic> \
  --blocked-by <jwt-task>

# Human-only tasks (skipped by tk next)
tk create "Set up production database" --awaiting work \
  -d "Create RDS instance and configure access"

tk create "Create Stripe API keys" --awaiting work \
  -d "Set up Stripe account and get API credentials"
```

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

Execute the epic by orchestrating subagents from this Claude Code session. The full workflow is in **`references/claude-runner.md`** — that file is the authoritative source; speak in capability tiers and harness primitives, never hardcoded model names, so the skill stays aligned with the best available tools. The shape is:

1. `tk graph <epic-id> --json` — get the waves and how wide you can run. If the result contains `"needs_planning": true`, the epic has no child ticks yet — flesh it out first (see Roadmaps above), then re-run `tk graph`.
2. For each wave, launch one subagent per ready tick — **all in one message**, each in its own git worktree (`isolation: "worktree"`), in the background.
3. Wait for the completion notifications (no polling), merge each finished tick's branch, and update tick state.
4. Run the test suite on the merged tree, then move to the next wave; review and close the epic when everything's done.

You own all tick state; subagents only write code in their worktrees. That keeps parallel work conflict-free and tick history clean. Run wave to wave continuously — don't stop to check in between waves unless you hit a real blocker.

> Ticks previously shipped a standalone runner (`tk run`) with its own worktree and cost-tracking machinery. That runner has been **removed** — execution now goes exclusively through Claude orchestration as described above.

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
```

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
tk graph <epic-id> --json    # JSON output; needs_planning:true means epic needs child ticks
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

**Actor convention (orchestrated runs):** export `TK_ACTOR=orchestrator` at run start so activity
entries are stamped with a recognisable actor. Use `--actor <name>` to override for a single call.
Precedence: `--actor` flag > `TK_ACTOR` env > tick-owner default.

### Running the Epic

Drive execution from this Claude Code session (full details in `references/claude-runner.md`):

```bash
# 1. Get the dependency graph (waves + max parallelism)
tk graph <epic-id> --json
```

```
# 2. For each wave, launch one Agent per ready tick — all in ONE message:
#    Agent(subagent_type: "general-purpose",
#          isolation: "worktree",
#          run_in_background: true,
#          mode: "bypassPermissions",
#          model: "sonnet")   # example — pick by capability tier (see claude-runner.md)
#    (some harness versions also take name: — check the Agent tool's schema)
#
# 3. Wait for completion notifications (no polling), then integrate each tick:
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
