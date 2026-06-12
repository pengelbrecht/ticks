# Claude Code Runner Adapter

Read [`agent-runner.md`](agent-runner.md) first. This file maps its capability contract onto Claude Code; it does not redefine tick semantics or recovery.

## Capability mapping

| Shared capability | Claude Code primitive |
|---|---|
| Isolation | `Agent(..., isolation: "worktree")` |
| Parallel dispatch | Put all `Agent` calls for a wave in one message with `run_in_background: true` |
| Completion | Agent completion notifications and the value returned by `Agent` |
| Continuation | `SendMessage` to the named agent or returned agent ID |
| Review | A read-only reviewer `Agent`; use `Workflow` fan-out only for substantial reviews |

Set `TK_ACTOR=claude:orchestrator` before tracker writes.

## Dispatch

Resolve the shared capability tier to a current Claude model. Do not omit `model`; omission may select a more expensive tier than intended.

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

Claude-managed worktree branch names may not match the deterministic shared convention. Record the actual branch in a tick note immediately after dispatch. On handoff, branch plus tick ID is authoritative; the Claude agent ID is optional continuation metadata.

## Boundary hardening

For repeated use, define a project-level `.claude/agents/ticks-implementer.md` that denies `tk` and writes under `.tick/**`, then use that subagent type. PreToolUse hooks receive parameters under `tool_input`; on exit 2, write the explanation to stderr.

Do not use `TaskOutput` for subagent results; it can load the full transcript. Use the `Agent` result and completion notification.
