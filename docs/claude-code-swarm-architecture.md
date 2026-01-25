# Claude Code Swarm Architecture

Research findings on how team spawning and parallel agent execution works in Claude Code.

## Overview

Claude Code has a built-in "swarm" capability that enables parallel agent execution in coordinated waves. This document captures research findings on how this system works internally.

## Key Components

### Tools in Base Context

These tools are always available:

| Tool | Purpose |
|------|---------|
| `Task` | Spawn subagents with `subagent_type`, `name`, `team_name` params |
| `TaskCreate` | Create tasks with subject, description, activeForm |
| `TaskUpdate` | Update status, owner, dependencies (blockedBy/blocks) |
| `TaskList` | List all tasks and their status |
| `TaskGet` | Get full task details by ID |
| `EnterPlanMode` | Switch to read-only planning mode |
| `ExitPlanMode` | Exit planning with optional `launchSwarm` and `teammateCount` |
| `ToolSearch` | Search for and load deferred tools |

### Tools Injected for Swarm Mode

**TeammateTool** - Only available when swarm mode is activated:

| Operation | Purpose |
|-----------|---------|
| `spawnTeam` | Create team + task directory at `~/.claude/teams/` |
| `discoverTeams` | List available teams |
| `requestJoin` | Request to join a team |
| `approveJoin` / `rejectJoin` | Leader accepts/denies members |
| `approvePlan` | Leader approves teammate's plan |
| `rejectPlan` | Leader rejects with feedback |
| `requestShutdown` | Leader requests graceful termination |
| `approveShutdown` / `rejectShutdown` | Teammate accepts/declines |
| `write` | Message single teammate |
| `broadcast` | Team-wide message (expensive) |
| `cleanup` | Remove team resources when done |

## ExitPlanMode Parameters

```
ExitPlanMode parameters:
├── allowedPrompts      # Bash permissions needed for the plan
├── launchSwarm         # Boolean - whether to launch a swarm
├── teammateCount       # Number of teammates to spawn
├── pushToRemote        # Push plan to remote Claude.ai session
├── remoteSessionId     # Remote session ID if pushed
├── remoteSessionTitle  # Remote session title
└── remoteSessionUrl    # Remote session URL
```

## Task Tool Parameters for Teams

The `Task` tool has team-related parameters:

```
Task parameters:
├── subagent_type       # Agent type (general-purpose, Explore, Plan, etc.)
├── prompt              # Task instructions
├── description         # Short description (3-5 words)
├── name                # Name for the spawned agent
├── team_name           # Team name for spawning
├── model               # Optional model override (sonnet, opus, haiku)
├── mode                # Permission mode (plan, acceptEdits, etc.)
├── run_in_background   # Run asynchronously
├── resume              # Agent ID to resume
└── max_turns           # Maximum agentic turns
```

## Swarm Activation Flow

When `ExitPlanMode` is called with `launchSwarm=true`:

```
ExitPlanMode(launchSwarm=true, teammateCount=N)
         │
         ▼
   ┌─────────────────────────────────────┐
   │ System injects:                     │
   │  • TeammateTool                     │
   │  • Swarm prompt template            │
   │  • Environment variables            │
   └─────────────────────────────────────┘
         │
         ▼
   Agent follows swarm prompt:
   1. Parse plan → TaskCreate for each item
   2. TeammateTool.spawnTeam("plan-implementation")
   3. Task(team_name=..., name="worker-N") × teammateCount
   4. TaskUpdate(taskId=..., owner="worker-N")
   5. Monitor, coordinate, gather results
```

## Swarm System Prompt

When swarm mode activates, this prompt is injected (from cc version 2.1.16):

```markdown
User has approved your plan AND requested a team of ${NUM_WORKERS} teammates.

Please follow these steps to launch the swarm:

1. **Create tasks from your plan** - Parse your plan and create tasks using
   TaskCreateTool for each actionable item.

2. **Create a team** - Use TeammateTool with operation: "spawnTeam":
   {
     "operation": "spawnTeam",
     "team_name": "plan-implementation",
     "description": "Team implementing the approved plan"
   }

3. **Spawn ${NUM_WORKERS} teammates** - Use Task tool with team_name and name:
   {
     "subagent_type": "general-purpose",
     "name": "worker-1",
     "prompt": "You are part of a team implementing a plan...",
     "team_name": "plan-implementation"
   }

4. **Assign tasks to teammates** - Use TaskUpdate with owner:
   {
     "taskId": "1",
     "owner": "<teammate name from spawn>"
   }

5. **Gather findings and post summary** - Monitor progress, synthesize results.
```

## Environment Variables for Teammates

Spawned teammates receive:

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_AGENT_ID` | Unique identifier |
| `CLAUDE_CODE_AGENT_TYPE` | Agent role |
| `CLAUDE_CODE_TEAM_NAME` | Team affiliation |
| `CLAUDE_CODE_PLAN_MODE_REQUIRED` | Whether plan approval needed |

## File System Structure

Teams create artifacts at:

```
~/.claude/
├── teams/
│   └── {team-name}.json      # Team configuration
└── tasks/
    └── {team-name}/          # Task list directory
```

## Why Programmatic Triggering Fails

When calling `ExitPlanMode` with `launchSwarm=true` outside of proper plan mode:

1. The tool call **succeeds** (returns "User has approved")
2. But **TeammateTool is not injected** into the context
3. Without TeammateTool, cannot execute `spawnTeam`
4. Tasks remain pending, no agents spawn

The injection of TeammateTool appears to require:
- Being in an interactive session
- Proper plan mode workflow (EnterPlanMode → plan file → ExitPlanMode)
- User approval at the UI level
- Claude Code runtime detecting swarm flags and injecting tools

## Workarounds for Non-Interactive Swarm

### Option 1: Manual Parallel Tasks

Spawn multiple agents in a single message without TeammateTool:

```python
# Multiple Task tool calls in one message = parallel execution
Task(subagent_type="general-purpose", prompt="Task 1...", run_in_background=True)
Task(subagent_type="general-purpose", prompt="Task 2...", run_in_background=True)
Task(subagent_type="general-purpose", prompt="Task 3...", run_in_background=True)
```

Limitation: No team coordination, messaging, or leader/worker hierarchy.

### Option 2: Claude Agent SDK

Use the SDK for programmatic control:

```bash
claude -p "prompt" --permission-mode plan --allowedTools "Read,Edit,Bash"
```

### Option 3: External Orchestration

Third-party frameworks that provide swarm-like behavior:

- **Claude-Flow** - Enterprise agent orchestration with wave-based execution
- **ccswarm** - Git worktree-based multi-agent system
- **Swarm-IOSM** - Continuous dispatch scheduling with quality gates

## Plan Mode Details

Plan mode is implemented via:

1. **System reminder** prepended to each message:
   ```
   <system-reminder>
   Plan mode is active. You MUST NOT make any edits, run non-readonly tools,
   or make changes to the system.
   </system-reminder>
   ```

2. **Restricted tools**: Only Read, Glob, Grep, AskUserQuestion, WebFetch, WebSearch

3. **Bash restrictions**: Only `ls`, `git status`, `git log`, `find`, `cat`

4. **Plan file**: Written to disk, read by ExitPlanMode

## Known Issues

- **ExitPlanMode auto-approval bug** ([issue #9701](https://github.com/anthropics/claude-code/issues/9701)):
  Returns "User has approved" even without actual user approval, making programmatic
  swarm execution unreliable.

## Sources

- [Claude Code System Prompts Repository](https://github.com/Piebald-AI/claude-code-system-prompts)
- [TeammateTool Description](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/tool-description-teammatetool.md)
- [Armin Ronacher's Plan Mode Analysis](https://lucumr.pocoo.org/2025/12/17/what-is-plan-mode/)
- [Claude Code Documentation](https://code.claude.com/docs/)

---

*Research conducted January 2026*
