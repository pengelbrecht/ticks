# Human Approval Drill

This drill describes the human review step after Tickflow routes completed agent work to `awaiting approval`. The goal is to make the approval gate consistent, auditable, and fast enough to dogfood during parallel task runs.

## Approval Criteria

Approve a task only when all of the following are true:

- The task is in the `awaiting approval` state and corresponds to the work being reviewed.
- The implementation matches the tick title, description, and acceptance criteria without adding unrelated scope.
- Required verifier commands, tests, builds, or lint checks have passed, or any skipped checks are explicitly justified.
- The git diff is limited to expected files and contains no accidental changes, secrets, generated noise, or edits to `.tick` internals.
- The work is understandable enough for the next operator: docs, comments, or handoff notes exist where needed.
- Any follow-up work is either not required for acceptance or has been captured as a separate tick by the controller workflow.

## Rejection Criteria

Reject the task when any of the following are true:

- Acceptance criteria are not met or verifier commands fail.
- The work solves a different problem, is incomplete, or includes speculative changes outside the tick scope.
- The diff contains unsafe changes, secrets, broken formatting, merge conflict markers, or edits to files that should not have changed.
- Tests were not run when practical and no clear reason was provided.
- The implementation introduces obvious regressions, inconsistent behavior, or unclear operational risk.
- The handoff lacks enough context for the agent or a human to correct the work.

## Commands

Use read-only inspection first, then approve or reject from the controller environment:

```bash
# Find items waiting for human review
tk list --awaiting approval

# Inspect the tick and its acceptance criteria
tk show <tick-id>

# Inspect the submitted work
git status --short
git diff --stat
git diff

# Run the tick-specific verifier commands from the tick description
test -f docs/dogfood/tickflow-parallel-approvals/human-approval-drill.md && \
  grep -q 'Approval Criteria' docs/dogfood/tickflow-parallel-approvals/human-approval-drill.md

# Approve if the work meets the criteria
tk approve <tick-id>

# Reject with actionable feedback if it does not
tk reject <tick-id> "Describe the failed criterion, evidence, and required correction."
```

When rejecting, include the exact command output or file path that demonstrates the problem and the smallest acceptable correction.

## Expected Outcome

A human reviewer can reliably move each completed Tickflow task from `awaiting approval` to approved or rejected. Approved tasks have verified, scoped work ready for integration. Rejected tasks return to the workflow with actionable feedback that lets the next agent correct the issue without re-discovering the review context.
