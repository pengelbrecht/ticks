// Package paint decorates a herd run's herdr workspaces with the tracker
// state of the tick each worker is implementing.
//
// It exists because a wave of herdr workers is unreadable without it: half a
// dozen workspaces all labelled after the same repo, each running an agent CLI
// whose own title says what the model is thinking about rather than which tick
// it was dispatched for. Paint puts the tick id, the role and the tracker
// status where the operator already looks.
//
// # What it paints, and where
//
// herdr's display-only metadata channel is asymmetric, and the asymmetry
// decides the layout:
//
//	pane       title, state labels AND tokens (pane.report_metadata)
//	workspace  tokens ONLY (workspace.report_metadata)
//
// So the human-readable line — `<tick-id> · <role> · <status>` — goes on the
// worker's agent PANE, which is what herdr renders in the workspace's chrome,
// and the workspace itself carries the same facts as tokens. Both are painted
// for every worker, from the same [Badge], so they can never disagree.
//
// # Why it is safe to run from an event hook
//
// Three properties, all of them load-bearing:
//
//	display-only  nothing here renames a pane, moves focus or touches an
//	              agent. A wrong paint is a wrong badge, never a wrong action.
//	sourced       every report is namespaced by client.SourceHerdPaint, so a
//	              paint can only overwrite a previous paint of this run's own.
//	TTL'd         badges expire. When the run ends — or the painter simply
//	              stops being invoked — herdr drops them by itself. There is
//	              no unpaint step to forget, and a crashed orchestrator does
//	              not leave a session covered in stale tick ids.
//
// # Ownership
//
// A run paints ONLY what its own manifests name. The manifests written by
// `tk herd spawn` are the ownership record: a workspace with no manifest is
// somebody else's window and is never touched. The guard is taken twice —
// the workspace must be in the manifest set AND live in the session snapshot,
// and a pane is painted only when the snapshot agrees it sits in that same
// workspace. A manifest whose workspace has already gone away is reported as
// skipped, not painted and not an error: that is the ordinary state of a
// cleaned-up worker whose manifest has not been removed yet.
//
// Everything here is read-only with respect to the tracker: tick status is
// read straight out of the `.tick/` store, never by shelling out to `tk`.
package paint
