# Tickflow Parallel Approvals Dogfood

This dogfood run validates that Tickflow can dispatch several approval-gated tasks in parallel, keep each agent's work isolated, and surface completed work clearly for human review. It is intended to exercise the end-to-end path from task selection through parallel execution, verifier reporting, and the dashboard state transition into `awaiting approval`.

## Goals

- Confirm that a wave of independent ticks can run concurrently without agents blocking one another.
- Verify that each agent works in its own isolated checkout and produces a focused, reviewable diff.
- Exercise human approval gates as first-class workflow states rather than implicit handoff notes.
- Make dashboard behavior observable enough for operators to identify running, completed, approved, and rejected work at a glance.

## Run Command

Run the dogfood wave from the controller environment with worktrees enabled so each tick receives a separate workspace:

```bash
tk run --parallel --worktrees --requires-approval
```

Use the concrete tick selector, project filter, or epic identifier for the actual run when launching against a prepared dogfood batch. The important properties are that the run starts multiple independent tasks at once, uses worktree isolation, and routes completed tasks to a human approval gate before they are considered done.

Worktrees are enabled for this dogfood because they reduce cross-agent interference: each task can edit files, run verifier commands, and produce a diff without sharing an index or working directory with other agents. This makes parallel execution safer and makes failed or rejected work easier to inspect and clean up.

## Expected Dashboard Signals

The dashboard should make the parallel wave visible as a set of distinct task cards or rows with clear per-task state. Operators should be able to see:

- Multiple tasks entering `in_progress` at roughly the same time.
- A worktree or workspace identifier for each running task, where available.
- Live or recent agent activity, including verifier commands and completion summaries.
- Tasks that finish implementation moving to `awaiting approval` rather than disappearing from the active run.
- Any failed tasks, blocked tasks, or verifier failures remaining distinguishable from tasks waiting on a human.
- Approved tasks transitioning to a completed state only after the approval action is recorded.

## Approval Gates

Human approval gates should appear as explicit review checkpoints in the dashboard. A completed agent task should present enough context for a reviewer to decide whether to approve or reject without re-running the entire workflow manually:

- Tick title, description, and acceptance criteria.
- Changed files and diff summary.
- Verifier command results, including pass/fail status.
- Agent completion summary and any follow-up notes.
- Clear approve and reject actions, with rejection requiring actionable feedback.

A task at the approval gate is not complete yet. It is waiting for a human reviewer to confirm that the implementation is scoped correctly, verifier commands passed, and no unsafe or unrelated changes were introduced. Rejected work should return to the workflow with the rejection reason attached; approved work should proceed to the final completed state and become eligible for integration.
