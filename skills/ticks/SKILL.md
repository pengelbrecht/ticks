---
name: ticks
description: Work with Ticks issue tracker and AI agent runner. Use when managing tasks or issues with tk commands, running AI agents on epics, creating ticks from a SPEC.md, or working in a repo with a .tick directory. Triggers on phrases like create ticks, tk, run ticker, epic, close the task, plan this, break this down.
---

# Ticks Workflow

Ticks is an issue tracker designed for AI agents. The `tk` CLI manages tasks, runs agents in continuous loops, and provides a web-based board for monitoring.

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

### Step 1: Check for SPEC.md

Look for a SPEC.md (or similar spec file) in the repo root.

**If no spec exists:** Go to Step 2a (Create Spec)
**If spec exists but incomplete:** Go to Step 2b (Complete Spec)
**If spec is complete:** Skip to Step 3 (Create Ticks)

### Step 2a: Create Spec Through Conversation

Have a natural conversation with the user to understand their idea:

1. **Let them describe it** - Don't interrupt, let them explain the full vision
2. **Ask clarifying questions** - Dig into unclear areas through back-and-forth dialogue
3. **Optionally use AskUserQuestion** - For quick multiple-choice decisions
4. **Write SPEC.md** - Once you have enough detail, generate the spec

**Conversation topics to explore:**
- What problem does this solve? Who's it for?
- Core features vs nice-to-haves
- Technical constraints or preferences
- How will users interact with it?
- What does "done" look like?

### Step 2b: Complete Existing Spec

If SPEC.md exists but has gaps:

1. **Read the spec** - Identify what's missing or unclear
2. **Ask targeted questions** - Focus on the gaps, don't re-ask obvious things
3. **Update SPEC.md** - Fill in the missing details

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

See `references/tick-patterns.md` for more patterns.

### Step 3: Create Ticks from Spec

Transform the spec into ticks organized by epic.

**For phased specs:** Focus on creating ticks for the current/next phase only. Don't create ticks for future phases - they may change based on learnings.

**Epic organization:**
1. Group related tasks into logical epics (auth, API, UI, etc.)
2. Create tasks with dependencies using `--blocked-by`
3. Mark human-required tasks with `--awaiting work`

**Designing for parallel execution:**
Ticks in the same wave (no blocking relationship) run concurrently, each in its own git worktree. Worktrees keep agents from clobbering each other mid-run, but two ticks that edit the same file will still collide at merge time. To keep merges clean:
- If two ticks edit the same file, make one block the other so they land in different waves
- Use `tk graph <epic>` to see the waves and confirm ticks in the same wave touch different files
- Example: Task A edits `auth.go`, Task B edits `auth.go` → B should block on A

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

Execute the epic by orchestrating subagents from this Claude Code session. The full workflow is in **`references/claude-runner.md`**; the shape is:

1. `tk graph <epic-id> --json` — get the waves and how wide you can run.
2. For each wave, launch one subagent per ready tick — **all in one message**, each in its own git worktree (`isolation: "worktree"`), in the background.
3. Wait for the completion notifications (no polling), merge each finished tick's branch, and update tick state.
4. Move to the next wave; review and close the epic when everything's done.

You own all tick state; subagents only write code in their worktrees. That keeps parallel work conflict-free and tick history clean. Run wave to wave continuously — don't stop to check in between waves unless you hit a real blocker.

> Ticks also ships a standalone runner (`tk run`) with its own worktree and cost-tracking machinery. It's intentionally **not** the path this skill uses right now, so execution goes through Claude orchestration instead.

## Quick Reference

### Creating Ticks

```bash
tk create "Title" -d "Description" --acceptance "Tests pass"  # Task
tk create "Title" -t epic                                     # Epic
tk create "Title" --parent <epic-id>                          # Under epic
tk create "Title" --blocked-by <task-id>                      # Blocked
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
tk blocked                   # Blocked tasks
tk list --awaiting=          # Tasks awaiting human
tk graph <epic-id>           # Dependency graph with parallelization
tk graph <epic-id> --json    # JSON output for agents
```

### Managing

```bash
tk show <id>                      # Show details
tk close <id> --reason "reason"   # Close tick
tk note <id> "text"               # Add note
tk approve <id>                   # Approve awaiting tick
tk reject <id> "feedback"         # Reject with required feedback
```

### Running the Epic

Drive execution from this Claude Code session (full details in `references/claude-runner.md`):

```bash
# 1. Get the dependency graph (waves + max parallelism)
tk graph <epic-id> --json
```

```
# 2. For each wave, launch one Agent per ready tick — all in ONE message:
#    Agent(subagent_type: "general-purpose",
#          name: "<epic>-w<wave>-<tick>",
#          isolation: "worktree",
#          run_in_background: true,
#          mode: "bypassPermissions",
#          model: "sonnet")   # haiku for trivial, opus for complex
#
# 3. Wait for completion notifications (no polling), then integrate each tick:
git merge <agent-branch>
tk close <tick-id> --reason "Completed via Claude orchestration"
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
