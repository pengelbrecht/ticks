package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"
)

// EventKind is the discriminator on a pushed event envelope.
//
// herdr has two envelope schemas and this type spans both:
//
//   - the `event` schema, used by [Client.EventsWait] and by every
//     session-wide subscription. Its kinds are underscored
//     ([EventPaneAgentStatusChanged]) and its data payload repeats the kind in
//     a "type" field.
//   - the `subscription_event` schema, used by the three pane-scoped
//     subscriptions. It reuses the DOTTED subscription name as the kind
//     ([EventScopedPaneAgentStatusChanged]) and its data payload has no "type"
//     field at all.
//
// The accessors ([Event.AgentStatusChanged], [Event.OutputMatched]) take both
// spellings, so a consumer that only wants the payload need not care which
// surface delivered it.
type EventKind string

// The event kinds of the underscored `event` schema: [Client.EventsWait]
// results and session-wide subscriptions.
const (
	EventWorkspaceCreated         EventKind = "workspace_created"
	EventWorkspaceUpdated         EventKind = "workspace_updated"
	EventWorkspaceMetadataUpdated EventKind = "workspace_metadata_updated"
	EventWorkspaceClosed          EventKind = "workspace_closed"
	EventWorkspaceRenamed         EventKind = "workspace_renamed"
	EventWorkspaceMoved           EventKind = "workspace_moved"
	EventWorkspaceReordered       EventKind = "workspace_reordered"
	EventWorkspaceFocused         EventKind = "workspace_focused"
	EventWorktreeCreated          EventKind = "worktree_created"
	EventWorktreeOpened           EventKind = "worktree_opened"
	EventWorktreeRemoved          EventKind = "worktree_removed"
	EventTabCreated               EventKind = "tab_created"
	EventTabClosed                EventKind = "tab_closed"
	EventTabRenamed               EventKind = "tab_renamed"
	EventTabMoved                 EventKind = "tab_moved"
	EventTabFocused               EventKind = "tab_focused"
	EventPaneCreated              EventKind = "pane_created"
	EventPaneClosed               EventKind = "pane_closed"
	EventPaneUpdated              EventKind = "pane_updated"
	EventPaneFocused              EventKind = "pane_focused"
	EventPaneMoved                EventKind = "pane_moved"
	EventPaneOutputChanged        EventKind = "pane_output_changed"
	EventPaneExited               EventKind = "pane_exited"
	EventPaneAgentDetected        EventKind = "pane_agent_detected"
	EventPaneAgentStatusChanged   EventKind = "pane_agent_status_changed"
	EventLayoutUpdated            EventKind = "layout_updated"
)

// The event kinds of the dotted `subscription_event` schema. Only the three
// pane-scoped subscriptions produce these, and they are spelled exactly like
// the subscription that asked for them.
const (
	// EventScopedPaneAgentStatusChanged is what a [SubPaneAgentStatusChanged]
	// subscription delivers. Its payload is a [PaneAgentStatusChanged] with
	// no "type" field.
	EventScopedPaneAgentStatusChanged EventKind = EventKind(SubPaneAgentStatusChanged)
	// EventScopedPaneOutputMatched is what a [SubPaneOutputMatched]
	// subscription delivers.
	EventScopedPaneOutputMatched EventKind = EventKind(SubPaneOutputMatched)
	// EventScopedPaneScrollChanged is what a [SubPaneScrollChanged]
	// subscription delivers.
	EventScopedPaneScrollChanged EventKind = EventKind(SubPaneScrollChanged)
)

// SubscriptionType names a subscription. Subscription names are always dotted;
// which spelling comes back on the stream depends on the subscription:
//
//   - a session-wide subscription (`pane.updated`, `layout.updated`, …)
//     delivers the underscored `event` schema — `pane.updated` in,
//     [EventPaneUpdated] ("pane_updated") out;
//   - the three pane-scoped subscriptions ([SubPaneAgentStatusChanged],
//     [SubPaneOutputMatched], [SubPaneScrollChanged]) deliver the
//     `subscription_event` schema, which reuses the dotted name verbatim —
//     `pane.agent_status_changed` in, [EventScopedPaneAgentStatusChanged]
//     ("pane.agent_status_changed") out.
//
// Both were verified against herdr 0.8.0; see testdata/event_stream.ndjson and
// testdata/event_stream_scoped.ndjson for the captured envelopes.
type SubscriptionType string

// The subscription types herdr accepts.
const (
	SubWorkspaceCreated         SubscriptionType = "workspace.created"
	SubWorkspaceUpdated         SubscriptionType = "workspace.updated"
	SubWorkspaceMetadataUpdated SubscriptionType = "workspace.metadata_updated"
	SubWorkspaceRenamed         SubscriptionType = "workspace.renamed"
	SubWorkspaceMoved           SubscriptionType = "workspace.moved"
	SubWorkspaceReordered       SubscriptionType = "workspace.reordered"
	SubWorkspaceClosed          SubscriptionType = "workspace.closed"
	SubWorkspaceFocused         SubscriptionType = "workspace.focused"
	SubWorktreeCreated          SubscriptionType = "worktree.created"
	SubWorktreeOpened           SubscriptionType = "worktree.opened"
	SubWorktreeRemoved          SubscriptionType = "worktree.removed"
	SubTabCreated               SubscriptionType = "tab.created"
	SubTabClosed                SubscriptionType = "tab.closed"
	SubTabFocused               SubscriptionType = "tab.focused"
	SubTabRenamed               SubscriptionType = "tab.renamed"
	SubTabMoved                 SubscriptionType = "tab.moved"
	SubPaneCreated              SubscriptionType = "pane.created"
	SubPaneClosed               SubscriptionType = "pane.closed"
	SubPaneUpdated              SubscriptionType = "pane.updated"
	SubPaneFocused              SubscriptionType = "pane.focused"
	SubPaneMoved                SubscriptionType = "pane.moved"
	SubPaneExited               SubscriptionType = "pane.exited"
	SubPaneAgentDetected        SubscriptionType = "pane.agent_detected"
	SubPaneOutputMatched        SubscriptionType = "pane.output_matched"
	SubPaneAgentStatusChanged   SubscriptionType = "pane.agent_status_changed"
	SubPaneScrollChanged        SubscriptionType = "pane.scroll_changed"
	SubLayoutUpdated            SubscriptionType = "layout.updated"
)

// Subscription is one entry of an events.subscribe request.
//
// Exactly three types are pane-scoped and require PaneID:
// [SubPaneAgentStatusChanged], [SubPaneOutputMatched] and
// [SubPaneScrollChanged]. Every other type — including
// [SubPaneAgentDetected], whose name suggests otherwise — is session-wide and
// takes no PaneID.
//
// That distinction is load-bearing because herdr silently ignores unknown
// fields: `{"type":"pane.updated","pane_id":"w1:p1"}` is accepted and then
// fires for every pane in the session (verified against herdr 0.8.0). A
// mis-scoped subscription therefore looks healthy and floods the consumer, so
// [Client.EventsSubscribe] validates scoping client-side before dialling.
//
// There is no wildcard: a pane-scoped subscription names exactly one pane.
type Subscription struct {
	Type SubscriptionType `json:"type"`
	// PaneID scopes the subscription. Required for the three pane-scoped
	// types above; it must be empty for every other type.
	PaneID string `json:"pane_id,omitempty"`
	// Source selects the output slice for [SubPaneOutputMatched].
	Source ReadSource `json:"source,omitempty"`
	// Match is the pattern for [SubPaneOutputMatched].
	Match *OutputMatch `json:"match,omitempty"`
	// Lines caps the matched output for [SubPaneOutputMatched].
	Lines *uint32 `json:"lines,omitempty"`
	// StripANSI strips escapes before matching. Nil means herdr's default.
	StripANSI *bool `json:"strip_ansi,omitempty"`
	// AgentStatus narrows [SubPaneAgentStatusChanged] to one status. Empty
	// means every status change on that pane.
	AgentStatus AgentStatus `json:"agent_status,omitempty"`
}

// scopedSubscriptions are the only subscription types that accept — and
// require — a pane id.
var scopedSubscriptions = map[SubscriptionType]bool{
	SubPaneAgentStatusChanged: true,
	SubPaneOutputMatched:      true,
	SubPaneScrollChanged:      true,
}

// IsPaneScoped reports whether this subscription type is one of the three that
// take a pane id. Every other type is session-wide.
func (t SubscriptionType) IsPaneScoped() bool { return scopedSubscriptions[t] }

// validate checks a subscription's scoping before it reaches the wire, where a
// mis-scoped one would be silently accepted.
func (s Subscription) validate(index int) error {
	switch {
	case s.Type == "":
		return fmt.Errorf("herd/client: subscription %d has no type", index)
	case s.Type.IsPaneScoped() && s.PaneID == "":
		return fmt.Errorf("herd/client: subscription %d (%s) is pane-scoped and needs a PaneID", index, s.Type)
	case !s.Type.IsPaneScoped() && s.PaneID != "":
		return fmt.Errorf(
			"herd/client: subscription %d (%s) is session-wide but sets PaneID %q; herdr would silently ignore it and fire for every pane",
			index, s.Type, s.PaneID)
	case s.Type == SubPaneOutputMatched && (s.Source == "" || s.Match == nil):
		return fmt.Errorf("herd/client: subscription %d (%s) needs both Source and Match", index, s.Type)
	}
	return nil
}

// SubscribeAgentStatus returns a subscription to one pane's agent status
// changes. Pass an empty status for all of them.
//
// Passing a specific status additionally makes the subscription fire
// immediately if the pane is already in it — see [Client.EventsSubscribe].
func SubscribeAgentStatus(paneID string, status AgentStatus) Subscription {
	return Subscription{Type: SubPaneAgentStatusChanged, PaneID: paneID, AgentStatus: status}
}

// SubscribeOutputMatch returns a subscription that fires whenever a pane's
// output matches.
func SubscribeOutputMatch(paneID string, source ReadSource, match OutputMatch) Subscription {
	return Subscription{Type: SubPaneOutputMatched, PaneID: paneID, Source: source, Match: &match}
}

// Event is a pushed event envelope. Data is left raw because herdr's event
// union is wide and grows between releases; decode the ones you care about
// with [Event.Decode] or the typed accessors.
type Event struct {
	Kind EventKind       `json:"event"`
	Data json.RawMessage `json:"data"`
}

// Decode unmarshals the event payload into v.
func (e Event) Decode(v any) error {
	if len(e.Data) == 0 {
		return fmt.Errorf("herd/client: event %s has no data", e.Kind)
	}
	if err := json.Unmarshal(e.Data, v); err != nil {
		return fmt.Errorf("herd/client: decoding %s event: %w", e.Kind, err)
	}
	return nil
}

// PaneAgentStatusChanged is the payload of an
// [EventPaneAgentStatusChanged] event — the signal a wait on a dispatched
// worker is built on.
type PaneAgentStatusChanged struct {
	PaneID       string            `json:"pane_id"`
	WorkspaceID  string            `json:"workspace_id"`
	AgentStatus  AgentStatus       `json:"agent_status"`
	Agent        *string           `json:"agent,omitempty"`
	DisplayAgent *string           `json:"display_agent,omitempty"`
	Title        *string           `json:"title,omitempty"`
	StateLabels  map[string]string `json:"state_labels,omitempty"`
}

// IsAgentStatusChanged reports whether this event is an agent status change,
// in either spelling: [EventPaneAgentStatusChanged] from [Client.EventsWait]
// or [EventScopedPaneAgentStatusChanged] from a pane-scoped subscription.
func (e Event) IsAgentStatusChanged() bool {
	return e.Kind == EventPaneAgentStatusChanged || e.Kind == EventScopedPaneAgentStatusChanged
}

// AgentStatusChanged decodes an agent-status-change payload, accepting both
// the underscored and the dotted spelling so one accessor works across
// [Client.EventsWait] and [Client.EventsSubscribe]. It returns an error for
// any other event kind.
func (e Event) AgentStatusChanged() (*PaneAgentStatusChanged, error) {
	if !e.IsAgentStatusChanged() {
		return nil, fmt.Errorf("herd/client: event is %s, not %s or %s",
			e.Kind, EventPaneAgentStatusChanged, EventScopedPaneAgentStatusChanged)
	}
	var out PaneAgentStatusChanged
	if err := e.Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// PaneOutputMatched is the payload of an [EventPaneOutputMatched] event.
type PaneOutputMatched struct {
	PaneID      string         `json:"pane_id"`
	MatchedLine string         `json:"matched_line"`
	Read        PaneReadResult `json:"read"`
}

// IsOutputMatched reports whether this event is an output match. Only a
// pane-scoped subscription produces one, so only the dotted spelling exists
// today; the underscored form is accepted for forward compatibility.
func (e Event) IsOutputMatched() bool {
	return e.Kind == EventScopedPaneOutputMatched || e.Kind == "pane_output_matched"
}

// OutputMatched decodes an output-match payload. It returns an error for any
// other event kind.
func (e Event) OutputMatched() (*PaneOutputMatched, error) {
	if !e.IsOutputMatched() {
		return nil, fmt.Errorf("herd/client: event is %s, not %s", e.Kind, EventScopedPaneOutputMatched)
	}
	var out PaneOutputMatched
	if err := e.Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// EventStream is a live events.subscribe connection. Events arrive on the
// channel returned by [EventStream.Events] until the stream ends; the channel
// is then closed and [EventStream.Err] explains why.
//
// A stream ends when the caller cancels the context passed to
// [Client.EventsSubscribe], when [EventStream.Close] is called (both leave Err
// nil), or when the connection or a payload fails (Err non-nil). That
// distinction is the contract a waiter keys on: nil Err means "you stopped
// it", non-nil means "it broke and you have a gap to reconcile".
//
// The channel is buffered to [Options.EventBuffer] events. Once the buffer
// fills, the reader blocks on the socket — a slow consumer gets backpressure,
// never a silent drop.
//
// A dead stream does not reconnect. See [Client.EventsSubscribe].
type EventStream struct {
	events chan Event
	conn   Conn
	cancel context.CancelFunc

	closeOnce sync.Once
	mu        sync.Mutex
	err       error
	done      chan struct{}
}

// Events returns the channel events arrive on. It is closed when the stream
// ends.
func (s *EventStream) Events() <-chan Event { return s.events }

// Err returns the error that ended the stream, or nil if it ended because the
// caller cancelled or closed it. Call it after the channel closes.
func (s *EventStream) Err() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.err
}

// Close ends the subscription and releases the connection, returning
// [EventStream.Err] — nil for a stream that was only ever stopped by the
// caller, the terminal error for one that had already failed.
//
// It blocks until the reader goroutine has stopped and is safe to call more
// than once, including from inside a range over [EventStream.Events]: the
// reader observes the cancellation rather than waiting to hand over another
// event.
func (s *EventStream) Close() error {
	s.closeOnce.Do(func() {
		s.cancel()
		_ = s.conn.Close()
	})
	<-s.done
	return s.Err()
}

func (s *EventStream) setErr(err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.err == nil {
		s.err = err
	}
}

// EventsSubscribe opens a push-event stream. This is the surface the herdr CLI
// does not expose, and the reason the orchestrator talks to the socket at all:
// it lets one waiter watch many panes without polling.
//
// The subscription lives as long as ctx. Cancel ctx or call
// [EventStream.Close] to end it; leaking a stream leaks a connection and a
// goroutine.
//
// Two properties of herdr 0.8.0 make this usable as a wait primitive, and both
// are verified rather than assumed:
//
// Subscribing to [SubPaneAgentStatusChanged] with a specific AgentStatus fires
// immediately when the pane is already in that status. That is what closes the
// missed-wakeup race: a waiter can subscribe after a worker has already gone
// idle and still be told. (Without an AgentStatus filter there is no such
// replay — the subscription only reports subsequent transitions.)
//
// A broken stream never reconnects. When [EventStream.Err] is non-nil the
// consumer must open a new subscription and close the gap by reconciling
// against [Client.AgentList] or [Client.SessionSnapshot]; events that occurred
// while nothing was subscribed are gone.
//
// herdr validates the subscriptions before opening the stream and reports only
// the FIRST invalid one, encoding its 0-based index in the error's request id.
// That failure comes back as a [SubscribeError] naming the index and the
// offending subscription. Since only one problem surfaces per attempt,
// pre-validating pane ids with a single [Client.AgentList] or
// [Client.SessionSnapshot] round trip beats discovering them one subscribe at
// a time.
func (c *Client) EventsSubscribe(ctx context.Context, subs []Subscription) (*EventStream, error) {
	if len(subs) == 0 {
		return nil, errors.New("herd/client: events.subscribe needs at least one subscription")
	}
	for i, sub := range subs {
		if err := sub.validate(i); err != nil {
			return nil, err
		}
	}

	streamCtx, cancel := context.WithCancel(ctx)
	params := struct {
		Subscriptions []Subscription `json:"subscriptions"`
	}{Subscriptions: subs}

	conn, id, err := c.send(streamCtx, MethodEventsSubscribe, params)
	if err != nil {
		cancel()
		return nil, err
	}

	// The handshake reply is bounded even though the stream that follows is not.
	ackCtx, ackCancel := context.WithTimeout(streamCtx, subscribeAckTimeout)
	line, err := conn.ReadMessage(ackCtx)
	ackCancel()
	if err != nil {
		conn.Close()
		cancel()
		return nil, fmt.Errorf("herd/client: reading %s response: %w", MethodEventsSubscribe, err)
	}
	raw, err := decodeResponse(MethodEventsSubscribe, id, line)
	if err != nil {
		conn.Close()
		cancel()
		return nil, asSubscribeError(err, id, subs)
	}
	if err := decodeTyped(MethodEventsSubscribe, resultSubscriptionStarted, raw, nil); err != nil {
		conn.Close()
		cancel()
		return nil, err
	}

	stream := &EventStream{
		events: make(chan Event, c.eventBuffer),
		conn:   conn,
		cancel: cancel,
		done:   make(chan struct{}),
	}
	go stream.run(streamCtx)
	return stream, nil
}

// subscribeAckTimeout bounds the subscription_started handshake.
const subscribeAckTimeout = 10 * time.Second

// SubscribeError identifies which subscription herdr rejected. herdr probes
// the subscriptions in order and stops at the first failure, encoding its
// 0-based index in the error's request id as "<request-id>:sub:<index>:probe".
//
// Only one failure is reported per attempt, so fixing the named subscription
// may simply reveal the next one.
type SubscribeError struct {
	// Index is the 0-based position of the rejected subscription.
	Index int
	// Subscription is the entry at that index.
	Subscription Subscription
	// APIError is the underlying server error, e.g. [CodePaneNotFound].
	*APIError
}

// Error implements error.
func (e *SubscribeError) Error() string {
	return fmt.Sprintf("herd/client: subscription %d (%s pane=%q) rejected: %s: %s",
		e.Index, e.Subscription.Type, e.Subscription.PaneID, e.Code, e.Message)
}

// Unwrap exposes the underlying [APIError] to errors.As and [AsAPIError].
func (e *SubscribeError) Unwrap() error { return e.APIError }

// asSubscribeError upgrades a subscribe failure to a [SubscribeError] when the
// server's derived request id names a subscription this call sent. Anything
// else passes through unchanged.
func asSubscribeError(err error, requestID string, subs []Subscription) error {
	apiErr, ok := AsAPIError(err)
	if !ok {
		return err
	}
	index, ok := parseProbeIndex(apiErr.RequestID, requestID)
	if !ok || index >= len(subs) {
		return err
	}
	return &SubscribeError{Index: index, Subscription: subs[index], APIError: apiErr}
}

// parseProbeIndex extracts n from "<requestID>:sub:<n>:probe".
func parseProbeIndex(probeID, requestID string) (int, bool) {
	rest, ok := strings.CutPrefix(probeID, requestID+":sub:")
	if !ok {
		return 0, false
	}
	digits, ok := strings.CutSuffix(rest, ":probe")
	if !ok {
		return 0, false
	}
	index, err := strconv.Atoi(digits)
	if err != nil || index < 0 {
		return 0, false
	}
	return index, true
}

// run pumps event lines onto the channel until the context ends or the
// connection fails.
func (s *EventStream) run(ctx context.Context) {
	defer close(s.done)
	defer close(s.events)
	defer s.conn.Close()

	for {
		line, err := s.conn.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() == nil {
				s.setErr(fmt.Errorf("herd/client: reading event stream: %w", err))
			}
			return
		}
		if len(line) == 0 {
			continue
		}
		var ev Event
		if err := json.Unmarshal(line, &ev); err != nil {
			s.setErr(fmt.Errorf("herd/client: malformed event %s: %w", truncateForError(line), err))
			return
		}
		if ev.Kind == "" {
			// Not an event envelope. An out-of-band error response ends the
			// stream; anything else the server may add later (a keepalive,
			// say) is ignored rather than treated as corruption.
			if _, respErr := decodeResponse(MethodEventsSubscribe, "", line); respErr != nil {
				var apiErr *APIError
				if errors.As(respErr, &apiErr) {
					s.setErr(apiErr)
					return
				}
				continue
			}
			continue
		}
		select {
		case s.events <- ev:
		case <-ctx.Done():
			return
		}
	}
}

// truncateForError renders a protocol line for an error message, keeping it
// short enough to read.
func truncateForError(line []byte) string {
	const max = 120
	if len(line) > max {
		return strconv.Quote(string(line[:max]) + "…")
	}
	return strconv.Quote(string(line))
}

// EventMatch selects the single event an events.wait call blocks for.
//
// In herdr 0.8.0 / protocol 19 the server only implements pane agent-status
// matches; any other match is rejected with code
// "unsupported_event_wait_match". Use [MatchAgentStatus] and treat the wider
// shape as forward compatibility, or use [Client.EventsSubscribe] for kinds
// events.wait cannot express.
type EventMatch struct {
	Event EventKind `json:"event"`
	// PaneID scopes a pane match.
	PaneID string `json:"pane_id,omitempty"`
	// AgentStatus is the status to wait for on an
	// [EventPaneAgentStatusChanged] match.
	AgentStatus AgentStatus `json:"agent_status,omitempty"`
	// WorkspaceID scopes a workspace match.
	WorkspaceID string `json:"workspace_id,omitempty"`
	// TabID scopes a tab match.
	TabID string `json:"tab_id,omitempty"`
	// MinRevision scopes an [EventPaneOutputChanged] match.
	MinRevision *uint64 `json:"min_revision,omitempty"`
}

// MatchAgentStatus returns the event match for "this pane's agent reached this
// status" — the one match herdr 0.8.0 implements for events.wait. Both
// arguments are required; the schema has no "any status" form.
func MatchAgentStatus(paneID string, status AgentStatus) EventMatch {
	return EventMatch{Event: EventPaneAgentStatusChanged, PaneID: paneID, AgentStatus: status}
}

// validate rejects the match shapes herdr answers with invalid_request, so the
// caller gets a useful message without a round trip.
func (m EventMatch) validate() error {
	if m.Event == "" {
		return errors.New("herd/client: events.wait needs a match event")
	}
	if m.Event == EventPaneAgentStatusChanged {
		if m.PaneID == "" {
			return errors.New("herd/client: events.wait on " + string(m.Event) + " needs a PaneID")
		}
		if m.AgentStatus == "" {
			return errors.New("herd/client: events.wait on " + string(m.Event) + " needs an AgentStatus; there is no wildcard")
		}
	}
	return nil
}

// EventsWaitParams are the parameters of events.wait.
type EventsWaitParams struct {
	// Match selects the event to wait for. Required.
	Match EventMatch `json:"match_event"`
	// Timeout bounds the wait. Zero means herdr's default; elapsing returns
	// an [APIError] with [CodeTimeout].
	Timeout time.Duration `json:"-"`
}

// MarshalJSON renders Timeout as herdr's timeout_ms.
func (p EventsWaitParams) MarshalJSON() ([]byte, error) {
	type wire EventsWaitParams
	return json.Marshal(struct {
		wire
		TimeoutMs *uint64 `json:"timeout_ms,omitempty"`
	}{wire(p), millis(p.Timeout)})
}

// EventsWait blocks until one matching event occurs and returns it. It is the
// single-shot counterpart of [Client.EventsSubscribe], and it matches on
// current state too: waiting for a status a pane is already in returns
// immediately.
//
// It does not apply the client's default call timeout; bound it with the
// context or with params.Timeout.
func (c *Client) EventsWait(ctx context.Context, params EventsWaitParams) (*Event, error) {
	if err := params.Match.validate(); err != nil {
		return nil, err
	}
	var out struct {
		Event Event `json:"event"`
	}
	if err := c.callNoTimeout(ctx, MethodEventsWait, resultWaitMatched, params, &out); err != nil {
		return nil, err
	}
	return &out.Event, nil
}
