// Package cleanup plans and performs the per-tick teardown of a herdr run:
// the worker's workspace, its local branch, and its run-state manifest.
//
// Everything it removes was created by the run and is named by the manifest
// internal/herd/state wrote at spawn. Nothing is derived, nothing is
// discovered by pattern-matching a directory listing: "close only panes,
// workspaces and worktrees this run created" (skills/ticks/references/
// herdr-runner.md) is enforceable only if the plan comes from recorded state.
//
// # Preview is the default shape, not a courtesy
//
// [Run] with Apply false produces exactly the plan that Apply would execute,
// including its refusals. The same code path builds both, so a preview is a
// promise rather than a description.
//
// # Refusals
//
// Four conditions mean "never touch this", and the adapter is categorical
// about all of them:
//
//   - a live worker — herdr still lists an agent for this tick. A respawn
//     carries a fresh name (`tick-<id>-r2`), so the match is by prefix.
//   - a blocked worker — the pane IS the handoff state a human answers.
//   - an unmerged branch — `git branch -d` is the guard, and this package
//     never passes -D. It checks first so a refusal is a plan, not a failed
//     command.
//   - a missing manifest — with no recorded state there is nothing safe to
//     remove; the caller reports it rather than guessing.
//
// # Order
//
// Workspace, then branch, then the manifest LAST. The manifest is the record
// that makes any of this repeatable, so a failed workspace removal must leave
// it on disk: a half-cleaned tick has to stay visible to the next reconcile.
//
// # Out of scope, on purpose
//
// The run's own checkout workspace — opened when a worktree is created against
// the repo — is not per-tick state and is not removed here. Closing it at run
// end is the orchestrator's documented duty (`herdr workspace list` /
// `herdr workspace close`), and the command help says so.
package cleanup
