// Package herdtest is the one canonical fake herdr server used by every test
// in this repo that needs to talk the herdr wire protocol.
//
// It exists because six hand-rolled fakes drifted apart: each package grew its
// own listener, its own reply literals and its own idea of which fields herdr
// actually returns. One of them was missing `interactive_ready` on agent.start,
// which hid a real defect until review. There is now exactly one place where a
// reply shape is written down, and it is here.
//
// # What it is
//
// A real unix listener speaking the real newline-delimited JSON protocol, so
// consumers exercise the production transport in [github.com/pengelbrecht/ticks/internal/herd/client]
// rather than a stubbed Conn. Like herdr, it answers exactly one request per
// connection and hangs up; events.subscribe is the single exception, where the
// same connection streams envelopes after the subscription_started reply.
//
// # Live-verified properties it reproduces
//
//   - A pane.agent_status_changed subscription carrying a concrete
//     agent_status filter replays the pane's CURRENT status immediately; an
//     unfiltered subscription does not. This is what closes the
//     list-then-subscribe window in internal/herd/wait, and it is captured in
//     internal/herd/client/testdata/event_stream_scoped.ndjson.
//   - herdr probes subscriptions in order and reports only the FIRST invalid
//     one, encoding its 0-based index in the error's request id
//     ("<id>:sub:<index>:probe").
//   - agent.start and agent.get both report `interactive_ready`.
//
// # Why it is not a _test package
//
// It is imported from test files in other packages, so it must be a normal
// package. It has no side effects at import time and takes a *testing.T in its
// constructor. It deliberately does NOT import internal/herd/client: that
// package's own tests live in `package client` and importing herdtest from
// them would be an import cycle. Consumers that want client types convert at
// their own seam.
//
// # Using it
//
// [New] starts a server with the built-in routes for every method the herd
// engines call. Per-test deviations go through [Server.Route], which replaces
// one method's handler; everything else keeps answering canonically.
package herdtest
