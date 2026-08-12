// Package collect verifies one herdr worker's DURABLE result and reports a
// verdict. It never merges anything.
//
// The completion authority under this substrate is not a lifecycle state —
// skills/ticks/references/herdr-runner.md is explicit that a settled worker
// means "worth looking now", never "the work is finished", and that terminal
// scraping is forbidden as a result channel. What counts is what survived the
// worker: commits on its branch, and a `RESULT-<tick-id>.md` in its worktree
// carrying a final STATUS: line. This package checks exactly that, plus the
// non-negotiable `.tick/` boundary diff, against the run-state manifest
// internal/herd/state wrote at spawn time.
//
// # Nothing is re-derived
//
// Branch, base commit and worktree path all come out of the manifest. herdr
// chose the worktree path (under its own state directory, not under the repo),
// so deriving it here would be a guess; the manifest records what the spawn
// response actually said.
//
// # Verdict versus status
//
// The verdict answers "are the durable artifacts there and mergeable-shaped":
// [ReadyToMerge], [NoCommits], [MissingResult], [BoundaryViolation]. The status
// answers "what did the worker say about its own work": DONE,
// DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED. They are independent — a worker
// can commit, write a report and still report BLOCKED — so a caller must read
// both. [Report.NeedsHuman] flags the two statuses that are an escalation
// regardless of verdict.
//
// Every check runs on every call, so a report whose verdict is [MissingResult]
// still carries BoundaryFiles: the single verdict label is the first failing
// check in the documented order, never a reason evidence went missing.
package collect
