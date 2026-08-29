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
// # The vocabulary is a contract with two other implementations
//
// internal/cloud/collect reads a remote branch from the laptop and
// cloud/factory/src/worker-collect.ts reads the same remote from the Worker.
// The first was this package's values BY IMPORT until epic 3j4; all three are
// copies now, and a re-spelling in one of them would make a cloud run and a
// herd run silently disagree about the same tick. contracts/collect-vocabulary.json
// is what stops that: all three read it, and contract_test.go is this
// package's end. It pins the status line REGEXP as well as the words, because
// the DONE_WITH_CONCERNS-before-DONE alternation order and the markdown
// decoration set are as much a part of the vocabulary as the words are.
//
// Every check runs on every call, so a report whose verdict is [MissingResult]
// still carries BoundaryFiles: the single verdict label is the first failing
// check in the documented order, never a reason evidence went missing.
package collect
