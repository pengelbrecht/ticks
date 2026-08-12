// Package dashboard is the read-only mission-control board for a herdr run:
// the waves and ticks of an epic beside the workers herdr is actually running,
// rendered as a bubbletea TUI and kept current by pushed events.
//
// # Read-only, in two senses
//
// v1 has no actions — no spawn, no cancel, no merge (tick 5yt adds them). It is
// also read-only about STATE: tick state is read straight off disk through
// [github.com/pengelbrecht/ticks/internal/tick.Store], and run state through
// [github.com/pengelbrecht/ticks/internal/herd/state], exactly the way
// internal/herd/collect does. This package never shells out to `tk` — a
// dashboard that ran the CLI on every repaint would both be slow and risk
// mutating the tracker it is supposed to observe.
//
// # Why events and not a poll loop
//
// The interesting change on a board is "a worker's agent status moved", and
// herdr pushes exactly that as pane.agent_status_changed. [Watcher] holds ONE
// events.subscribe stream carrying, per known worker pane, one subscription per
// concrete agent status. The concrete filter is load-bearing twice over:
//
//   - it is what makes a subscription REPLAY the pane's current status the
//     moment it is opened (live-verified against herdr 0.8.0; see
//     internal/herd/client and internal/herd/wait), so the board is correct
//     immediately after subscribing without a second listing; and
//   - it means a status the board did not enumerate cannot arrive, which is why
//     [SubscribedStatuses] is the full set herdr reports rather than the
//     terminal subset internal/herd/wait uses.
//
// A stream never reconnects itself, so on death the watcher reloads the whole
// snapshot (closing the gap for transitions nobody was subscribed to) and
// resubscribes, backing off between attempts. Unlike internal/herd/wait — which
// is a bounded fan-in and fails hard on a second break — a dashboard is
// long-lived, so it keeps retrying and reports the outage in its header instead
// of exiting.
//
// # Tracker changes have no herdr event
//
// herdr's events cover worker status only. A tick claim, close or merge, and
// a new run manifest, are filesystem writes under .tick/issues and
// .tick/logs/herd with no event source of their own. [FSWatcher] watches
// those directories with fsnotify (the same package internal/tickboard/server
// uses for the web board) and, after a trailing debounce coalesces a burst of
// writes into one, asks for a reload the same way stream-death recovery does:
// by emitting [ReloadMsg] onto the herdr watcher's own channel. There is one
// reload mechanism in this package, fed by two sources.
//
// # The safety re-list
//
// A slow ticker ([DefaultRefreshInterval]) reloads the snapshot regardless.
// That is a SAFETY NET, not the update mechanism: it catches what no
// subscription covers — a manifest appearing for a newly spawned worker, a tick
// closing on disk, a pane disappearing — and it is what tells the watcher the
// pane set changed so it can resubscribe. Status changes are never waited on by
// it; they arrive in milliseconds through the stream.
//
// # Testing
//
// [Model] is a plain bubbletea model over injected message sources, so its
// whole update surface is exercised with synthetic messages and no socket. The
// watcher's subscribe/replay/resubscribe behaviour is tested against
// internal/herd/herdtest, the canonical fake herdr server.
package dashboard
