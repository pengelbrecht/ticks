// Package client is a minimal typed client for the herdr unix-socket JSON API.
//
// It exists because a few capabilities the herdr orchestrator needs — chiefly
// the push-event surface (events.subscribe) — are not reachable through the
// herdr CLI. Everything else is named after herdr's own API method names so
// that the schema (`herdr api schema --json`) stays the readable authority.
//
// # Wire protocol
//
// The server speaks newline-delimited JSON over a unix stream socket. A
// request is {"id":…,"method":…,"params":{…}}; the reply is either
// {"id":…,"result":{"type":…,…}} or {"id":…,"error":{"code":…,"message":…}}.
//
// The server closes the connection after answering a single request, so every
// call dials its own connection. The one exception is events.subscribe: after
// the {"type":"subscription_started"} reply the same connection streams
// {"event":…,"data":{…}} envelopes until the client hangs up.
//
// # Two event envelopes
//
// herdr pushes two envelope schemas and they spell the same event
// differently. events.wait and session-wide subscriptions use the `event`
// schema, whose kinds are underscored ("pane_agent_status_changed") and whose
// data repeats the kind in a "type" field. The three pane-scoped
// subscriptions use the `subscription_event` schema, which reuses the dotted
// subscription name ("pane.agent_status_changed") and whose data carries no
// "type" at all. [Event]'s accessors take both spellings; see
// testdata/event_stream.ndjson and testdata/event_stream_scoped.ndjson for
// captured examples of each.
//
// # Streams do not reconnect
//
// An [EventStream] that fails is over: it does not reconnect, and events that
// occur while nothing is subscribed are not replayed. A consumer that means to
// keep watching must open a new subscription and then close the gap by
// reconciling against [Client.AgentList] or [Client.SessionSnapshot] — a
// stream is an accelerator for polling, never a substitute for a reconcile
// step. [EventStream.Err] distinguishes the two endings: nil when the caller
// stopped it, non-nil when it broke.
//
// # Protocol pinning
//
// [ProtocolVersion] pins the protocol this package was written against. [New]
// performs a ping handshake and fails closed with a [ProtocolMismatchError] if
// the server reports anything else — a drifted server is a stop, never a
// best-effort continue.
//
// # Socket path
//
// [ResolveSocketPath] implements the order documented in
// skills/ticks/references/runners-config.md: an explicit path, then
// $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock.
//
// The package depends on the standard library only.
package client
