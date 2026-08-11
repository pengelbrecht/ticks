// Package notify turns a herd run's worker states into the two notifications
// an operator actually needs: a worker is BLOCKED and wants you, and a WAVE is
// finished and wants you.
//
// It is the third consumer of the run-state manifests (`internal/herd/state`),
// after paint and dashboard, and it is the only one that can interrupt a
// human. That difference drives the whole design.
//
// # Why once-semantics are the feature
//
// `notification.show` is not `pane.report_metadata`. The metadata channel is
// idempotent and TTL'd: repainting the same badge is invisible, and forgetting
// to repaint is self-healing. A notification is neither. Every call is a
// separate chime, and there is no expiry to undo one. So a notifier driven by
// an event hook — which fires many times per second during a wave, including
// on the paint feedback bounce (a pane.report_metadata makes herdr emit
// pane.agent_status_changed for that pane; see repo-wiki/herd-helper-cli.md) —
// must decide, itself, that it has already said this.
//
// That decision cannot live in a time-window debounce like paint's. A
// time window elides events; here an elided event is a lost transition, and a
// blocked worker nobody was told about is exactly the failure this package
// exists to prevent. So notify is EDGE-triggered against persisted state
// instead:
//
//	blocked        a tick is notified when it is blocked and was not
//	               notified for this episode. Leaving `blocked` re-arms it,
//	               so a worker that blocks, is answered, and blocks again
//	               chimes twice — which is correct, that is two requests.
//	wave complete   fires when every in-flight worker of the epic is settled
//	               and at least one of them has not been counted in a
//	               previous completion. A NEW worker manifest is therefore
//	               what re-arms the wave chime, and a cleanup that shrinks
//	               the roster is not.
//
// Both live in one small JSON file per epic, beside the manifests it is about:
// `.tick/logs/herd/<epic>/.notify-state.json`. The manifest directory is the
// natural home — it is already the run's gitignored scratch space, it is
// deleted with the run, and a state file that outlived its manifests would be
// re-arming against workers that no longer exist.
//
// # What "settled" means
//
// A worker is settled when herdr reports it `idle`, `done` or `blocked`.
// Blocked counts as settled ON PURPOSE: the wave is not going to progress
// without a human either way, and a wave whose last worker is stuck waiting
// for approval is precisely the moment an operator wants to be told. The
// blocked chime and the wave chime can therefore both fire in one run; they
// are answering different questions ("this one wants you" / "nothing is
// running").
//
// In-flight means the manifest's pane is present in the live `agent.list`. A
// manifest whose agent is gone is finished business, not an unsettled worker
// holding the wave open forever.
//
// # Read-only
//
// Nothing here touches `.tick/` beyond its own state file, never renames a
// pane, never moves focus and never prompts an agent. The worst a bad run can
// do is chime when it should not have.
package notify
