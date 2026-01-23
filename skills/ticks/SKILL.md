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
  -acceptance "All validation tests pass" \
  -parent <epic-id>
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
2. Create tasks with dependencies using `-blocked-by`
3. Mark human-required tasks with `--awaiting work`

```bash
# Create epics
tk create "Authentication" -t epic
tk create "API Endpoints" -t epic

# Create tasks with acceptance criteria
tk create "Add JWT token generation" \
  -d "Implement JWT signing and verification" \
  -acceptance "JWT tests pass" \
  -parent <auth-epic>

tk create "Add login endpoint" \
  -d "POST /api/login with email/password" \
  -acceptance "Login endpoint tests pass" \
  -parent <api-epic> \
  -blocked-by <jwt-task>

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
tk close <id> "Completed - connection string in .env"
```

### Step 5: Choose Execution Mode

Ticks supports two execution approaches. Help the user choose:

#### Option A: Native `tk run` (Recommended for most cases)

**Best when:**
- You want real-time monitoring via tickboard (local or remote via ticks.sh)
- You need rich human-in-the-loop (HITL) functionality (approvals, input requests, checkpoints)
- You're running long-lived epics that may need human intervention
- You want detailed execution logs and cost tracking

```bash
# Run on specific epic
tk run <epic-id>

# Run multiple epics in parallel (uses git worktrees for isolation)
tk run <epic1> <epic2> --parallel 2

# Auto-select next ready epic
tk run --auto

# Run in isolated worktree (recommended for parallel runs)
tk run <epic-id> --worktree
```

**Monitor progress:**
```bash
tk board              # Local web interface at http://localhost:3000
# Or use ticks.sh for remote monitoring
```

#### Option B: Claude Code Swarm Bridge

**Best when:**
- You want to leverage Claude Code's native subagent system
- Tasks are highly independent and benefit from maximum parallelization
- You're already in a Claude Code session and want seamless execution
- The epic doesn't require human intervention mid-execution

**How the bridge works:**
1. Reads the Ticks epic and its dependency graph via `tk graph --json`
2. Translates tasks to Claude Code's native Task system with dependencies
3. Executes via Claude's swarm mechanism (parallel where dependencies allow)
4. Syncs completion status back to Ticks

**To use Swarm Bridge, execute these steps:**

```bash
# 1. Get the epic's dependency graph
tk graph <epic-id> --json
```

Then translate to native Tasks:
- Create a Task for each tick using TaskCreate
- Map `blocked_by` relationships using TaskUpdate with `addBlockedBy`
- Execute tasks respecting dependency waves
- After completion, sync back to Ticks:

```bash
# Close completed ticks
tk close <tick-id> --reason "Completed via Claude Swarm"

# Close the epic when all tasks done
tk close <epic-id> --reason "All tasks completed via Claude Swarm bridge"
```

#### Comparison Table

| Aspect | `tk run` | Swarm Bridge |
|--------|----------|--------------|
| Monitoring | Tickboard (local + remote) | Claude Code UI |
| HITL | Rich (approvals, input, checkpoints) | Limited (conversation only) |
| Parallelization | Git worktrees | Native Claude subagents |
| File isolation | Worktrees (proven) | Claude's swarm mechanism |
| State persistence | Tick files (survives crashes) | Session-bound |
| Cost tracking | Built-in (`--max-cost`) | Manual |
| Best for | Production epics, HITL workflows | Quick parallel execution |

#### Helping Users Choose

When the user wants to run an epic, use AskUserQuestion:

```
Question: "How would you like to execute this epic?"
Header: "Execution"
Options:
  - "tk run (Recommended)" - "Rich monitoring via tickboard, HITL support, cost tracking"
  - "Claude Swarm" - "Native Claude Code parallelization, seamless session execution"
```

If user chooses Swarm Bridge, proceed with the bridge workflow below.

#### Swarm Bridge Execution Workflow

When executing via Claude Swarm, use Claude Code's native plan mode with `launchSwarm`:

**1. Fetch the dependency graph and tick details:**
```bash
tk graph <epic-id> --json
tk list --parent <epic-id> --json  # Get full tick details including HITL flags
```

**2. Identify HITL Requirements:**
Check each tick for human-in-the-loop flags:
- `--requires approval|review|content` - needs human sign-off after work
- `--awaiting work` - human-only task (exclude from swarm!)
- `--awaiting input` - needs human input (exclude from swarm!)

Tasks with `--awaiting work` or `--awaiting input` should NOT be included in the swarm - they require human action before agent work.

**3. Enter Plan Mode:**
Use `EnterPlanMode` tool to begin planning. This is required to access swarm capabilities.

**4. Write the Bridge Plan:**
Create a plan file that:
- Lists each tick as an implementation task
- Preserves the dependency structure (waves)
- Maps tick IDs to plan steps
- **Specifies HITL-aware state transitions for each tick**

Example plan structure:
```markdown
# Bridge Plan: Ticks Epic `<epic-id>` → Native Swarm

## Task Mapping
| Step | Tick ID | Title | Blocked By | Requires |
|------|---------|-------|------------|----------|
| 1 | abc | First task | - | - |
| 2 | def | Second task | abc | approval |
| 3 | ghi | Third task | abc | - |
| 4 | jkl | Fourth task | def, ghi | review |

## Execution Waves
- Wave 1: Step 1 (sequential)
- Wave 2: Steps 2, 3 (parallel)
- Wave 3: Step 4 (sequential)

## Swarm Configuration
- teammateCount: <max parallelism from waves>

## Post-Execution State Transitions (HITL-Aware)
| Tick ID | Requires | After Swarm → Tick State |
|---------|----------|--------------------------|
| abc | - | `tk close abc --reason "Completed via Claude Swarm"` |
| def | approval | `tk update def --awaiting approval` |
| ghi | - | `tk close ghi --reason "Completed via Claude Swarm"` |
| jkl | review | `tk update jkl --awaiting review` |

## Epic Closure
- If all ticks closed: `tk close <epic-id> --reason "All tasks completed"`
- If ticks awaiting human: Epic stays open until human approvals complete
```

**5. Exit Plan Mode with launchSwarm:**
Use `ExitPlanMode` with:
- `launchSwarm: true`
- `teammateCount: <N>` (based on max parallel tasks in any wave)

This launches Claude Code's native swarm to execute the plan with parallel teammates.

**6. Post-Swarm Sync (HITL-Aware):**
After swarm completes, apply state transitions based on HITL requirements:

```bash
# For ticks WITHOUT approval gates - close them
tk close <tick-id> --reason "Completed via Claude Swarm"

# For ticks WITH approval gates - transition to awaiting state
tk update <tick-id> --awaiting approval  # or review, content
```

**7. Notify User of Pending Human Actions:**
If any ticks are awaiting human action, inform the user:

```
Swarm execution complete. The following ticks are awaiting human review:

- def: Awaiting approval (use `tk approve def` or `tk reject def "feedback"`)
- jkl: Awaiting review (use `tk approve jkl` or `tk reject jkl "feedback"`)

Run `tk list --awaiting` to see all pending items.
```

#### HITL State Transition Reference

| Tick has... | Swarm does work? | After Swarm → Tick state | Human action |
|-------------|------------------|--------------------------|--------------|
| No gates | ✅ Yes | `tk close` | None |
| `--requires approval` | ✅ Yes | `tk update --awaiting approval` | `tk approve/reject` |
| `--requires review` | ✅ Yes | `tk update --awaiting review` | `tk approve/reject` |
| `--requires content` | ✅ Yes | `tk update --awaiting content` | `tk approve/reject` |
| `--awaiting work` | ❌ No (skip) | Unchanged | Human does work |
| `--awaiting input` | ❌ No (skip) | Unchanged | Human provides input |

**Why HITL-Aware Bridge?**
- Swarm handles parallelized execution of work
- Ticks' approval gates are preserved
- Humans still control quality gates and sign-offs
- Best of both worlds: Claude's parallelization + Ticks' HITL workflow

## Quick Reference

### Creating Ticks

```bash
tk create "Title" -d "Description" -acceptance "Tests pass"  # Task
tk create "Title" -t epic                                    # Epic
tk create "Title" -parent <epic-id>                          # Under epic
tk create "Title" -blocked-by <task-id>                      # Blocked
tk create "Title" --awaiting work                            # Human task
tk create "Title" --requires approval                        # Needs approval gate
```

### Querying

```bash
tk list                      # All open ticks
tk list -t epic              # Epics only
tk list -parent <epic-id>    # Tasks in epic
tk ready                     # Unblocked tasks
tk next <epic-id>            # Next task for agent
tk blocked                   # Blocked tasks
tk list --awaiting           # Tasks awaiting human
tk graph <epic-id>           # Dependency graph with parallelization
tk graph <epic-id> --json    # JSON output for agents
```

### Managing

```bash
tk show <id>                 # Show details
tk close <id> "reason"       # Close tick
tk note <id> "text"          # Add note
tk approve <id>              # Approve awaiting tick
tk reject <id> "feedback"    # Reject with feedback
```

### Running Agent (Two Modes)

**Mode A: Native tk run**
```bash
tk run <epic-id>                      # Run on epic
tk run --auto                         # Auto-select epic
tk run <epic-id> --worktree           # Use git worktree
tk run <epic-id> --parallel 3         # Parallel workers
tk run <epic-id> --max-iterations 10  # Limit iterations
tk run <epic-id> --max-cost 5.00      # Cost limit
tk run <epic-id> --watch              # Restart when tasks ready
tk board                              # Web interface
```

**Mode B: Claude Swarm Bridge (HITL-Aware)**
```bash
# 1. Get dependency graph and tick details
tk graph <epic-id> --json
tk list --parent <epic-id> --json  # Check for HITL flags

# 2. Enter plan mode (EnterPlanMode tool)
# 3. Write bridge plan with HITL state transitions
# 4. Exit plan mode with launchSwarm:true, teammateCount:N

# 5. After swarm completes, apply HITL-aware state transitions:
#    - No gates:          tk close <id> --reason "Completed via Claude Swarm"
#    - --requires approval: tk update <id> --awaiting approval
#    - --requires review:   tk update <id> --awaiting review

# 6. Notify user of pending human actions
tk list --awaiting  # Show ticks needing human review
```

### Planning Parallel Execution

Before running agents, use `tk graph` to understand parallelization opportunities:

```bash
tk graph <epic-id>        # Human-readable wave breakdown
tk graph <epic-id> --json # Machine-readable for planning
```

The graph shows:
- **Waves**: Groups of tasks that can run in parallel
- **Max parallel**: How many subagents you could spawn at once
- **Critical path**: Minimum sequential steps to complete the epic
- **Dependencies**: What each task is blocked by

Use this to decide how many `--parallel` workers to use with `tk run`.

See `references/tk-commands.md` for full reference.

## Assisting with Awaiting Ticks

When working interactively, help users process awaiting ticks:

```bash
tk list --awaiting    # Find ticks awaiting human
tk next --awaiting    # Next one needing attention
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
