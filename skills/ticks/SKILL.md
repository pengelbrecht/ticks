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

### Step 5: Run Agent

```bash
# Run on specific epic
tk run <epic-id>

# Run multiple epics in parallel
tk run <epic1> <epic2> --parallel 2

# Auto-select next ready epic
tk run --auto

# Run in isolated worktree (recommended for parallel runs)
tk run <epic-id> --worktree
```

**Monitor progress with the web board:**
```bash
tk board  # Opens http://localhost:3000
```

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
```

### Managing

```bash
tk show <id>                 # Show details
tk close <id> "reason"       # Close tick
tk note <id> "text"          # Add note
tk approve <id>              # Approve awaiting tick
tk reject <id> "feedback"    # Reject with feedback
```

### Running Agent

```bash
tk run <epic-id>                      # Run on epic
tk run --auto                         # Auto-select epic
tk run <epic-id> --worktree           # Use git worktree
tk run <epic-id> --max-iterations 10  # Limit iterations
tk run <epic-id> --max-cost 5.00      # Cost limit
tk run <epic-id> --watch              # Restart when tasks ready
tk board                              # Web interface
```

See `references/tk-commands.md` for full reference.

## Handoff Signal Protocol

When working on a tick, signal completion or handoff with XML tags:

| Signal | Format | When to Use |
|--------|--------|-------------|
| COMPLETE | `<promise>COMPLETE</promise>` | Task fully done, all tests pass |
| APPROVAL_NEEDED | `<promise>APPROVAL_NEEDED: reason</promise>` | Work done, needs human sign-off |
| INPUT_NEEDED | `<promise>INPUT_NEEDED: question</promise>` | Need human to answer/decide |
| REVIEW_REQUESTED | `<promise>REVIEW_REQUESTED: pr_url</promise>` | PR needs review |
| CONTENT_REVIEW | `<promise>CONTENT_REVIEW: description</promise>` | UI/copy needs judgment |
| ESCALATE | `<promise>ESCALATE: issue</promise>` | Found issue needing direction |
| CHECKPOINT | `<promise>CHECKPOINT: summary</promise>` | Phase done, verify before continuing |
| EJECT | `<promise>EJECT: reason</promise>` | Cannot complete, human must do it |

### When to Use Each Signal

**COMPLETE** - Work is done and verified. Tests pass.

**APPROVAL_NEEDED** - For security-sensitive changes, migrations, API changes, or anything with production risk.

**INPUT_NEEDED** - When you need a decision: which approach, which library, clarification on requirements.

**REVIEW_REQUESTED** - After creating a PR. Include the full URL.

**CONTENT_REVIEW** - For user-facing text, UI styling, or anything subjective.

**ESCALATE** - Security issues found, scope much larger than expected, conflicting requirements.

**CHECKPOINT** - Multi-phase work where you want verification before continuing.

**EJECT** - Needs credentials you don't have, physical setup, or genuinely requires human hands.

### Format Examples

```xml
<promise>COMPLETE</promise>

<promise>APPROVAL_NEEDED: Database migration adds user_preferences table</promise>

<promise>INPUT_NEEDED: Should rate limiter use sliding or fixed window?</promise>

<promise>REVIEW_REQUESTED: https://github.com/org/repo/pull/123</promise>

<promise>EJECT: Task requires AWS Console access to configure IAM</promise>
```

## Reading Human Feedback

When you pick up a task, check for human feedback:

1. **Human Feedback section** - In the prompt, shows responses from humans
2. **Task notes** - Check for answers or feedback on rejected work

If feedback exists:
- Read and understand all points
- Address each issue raised
- Don't re-ask answered questions

## Pre-Declared Gates (requires field)

Tasks can have a `requires` field set at creation:

| requires | Meaning |
|----------|---------|
| `approval` | Must have human sign-off before closing |
| `review` | Must have PR review before closing |
| `content` | Must have content review before closing |

You don't need to check this - just signal `COMPLETE` when done. The system routes to human approval based on `requires`.

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
