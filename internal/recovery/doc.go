// Package recovery detects and recovers stale tickflow leases.
//
// When a tickflow runner crashes or is interrupted, ticks may be left in
// in_progress status with an expired or orphaned lease. This package
// cross-references tickflow_lease metadata with the git worktree list
// to classify each stale tick and decide the safest recovery action:
//
//   - Release: tick's worktree is gone (or clean), safe to reset to open.
//   - Preserve: worktree exists with dirty (uncommitted) work; escalate for
//     human review rather than losing changes.
//   - Continue: lease is still active (not expired, worktree exists); no action.
//
// Recovery never deletes dirty work. Every action is annotated with a
// recovery note explaining what happened and where preserved work lives.
package recovery
