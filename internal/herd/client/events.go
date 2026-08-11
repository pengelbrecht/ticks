package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"
)

// EventKind is the discriminator on a pushed event envelope.
type EventKind string

// The event kinds herdr pushes. Subscription-only kinds are grouped last.
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

	// EventPaneOutputMatched arrives only for a [SubPaneOutputMatched]
	// subscription.
	EventPaneOutputMatched EventKind = "pane_output_matched"
	// EventPaneScrollChanged arrives only for a [SubPaneScrollChanged]
	// subscription.
	EventPaneScrollChanged EventKind = "pane_scroll_changed"
)

// SubscriptionType names a subscription. Note that these are dotted
// (`pane.agent_status_changed`) while the events they deliver are underscored
// ([EventPaneAgentStatusChanged]) — herdr spells the two namespaces
// differently, and this package does not paper over it.
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

// Subscription is one entry of an events.subscribe request. Which fields
// matter depends on Type: the pane-scoped types require PaneID, and
// [SubPaneOutputMatched] additionally requires Source and Match.
//
// There is no wildcard: a pane-scoped subscription names exactly one pane, and
// herdr rejects the whole subscribe call if any pane id does not resolve.
type Subscription struct {
	Type SubscriptionType `json:"type"`
	// PaneID scopes a pane subscription. Required for the pane.* types
	// other than pane.created/closed/updated/focused/moved/exited, which
	// are session-wide.
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

// SubscribeAgentStatus returns a subscription to one pane's agent status
// changes. Pass an empty status for all of them.
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

// AgentStatusChanged decodes an [EventPaneAgentStatusChanged] payload. It
// returns an error for any other event kind.
func (e Event) AgentStatusChanged() (*PaneAgentStatusChanged, error) {
	if e.Kind != EventPaneAgentStatusChanged {
		return nil, fmt.Errorf("herd/client: event is %s, not %s", e.Kind, EventPaneAgentStatusChanged)
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

// OutputMatched decodes an [EventPaneOutputMatched] payload. It returns an
// error for any other event kind.
func (e Event) OutputMatched() (*PaneOutputMatched, error) {
	if e.Kind != EventPaneOutputMatched {
		return nil, fmt.Errorf("herd/client: event is %s, not %s", e.Kind, EventPaneOutputMatched)
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
// nil), or when the connection or a payload fails (Err non-nil).
//
// The channel is unbuffered by default ([Options] does not tune it): a slow
// consumer applies backpressure to the socket rather than silently dropping
// events.
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

// Close ends the subscription and releases the connection. It blocks until the
// reader goroutine has stopped, and is safe to call more than once.
func (s *EventStream) Close() error {
	s.closeOnce.Do(func() {
		s.cancel()
		_ = s.conn.Close()
	})
	<-s.done
	return nil
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
// herdr validates every subscription up front, so one unresolvable pane id
// fails the whole call — with an [APIError] whose RequestID is a derived probe
// id rather than the request's own.
func (c *Client) EventsSubscribe(ctx context.Context, subs []Subscription) (*EventStream, error) {
	if len(subs) == 0 {
		return nil, errors.New("herd/client: events.subscribe needs at least one subscription")
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
		return nil, err
	}
	if err := decodeTyped(MethodEventsSubscribe, resultSubscriptionStarted, raw, nil); err != nil {
		conn.Close()
		cancel()
		return nil, err
	}

	stream := &EventStream{
		events: make(chan Event),
		conn:   conn,
		cancel: cancel,
		done:   make(chan struct{}),
	}
	go stream.run(streamCtx)
	return stream, nil
}

// subscribeAckTimeout bounds the subscription_started handshake.
const subscribeAckTimeout = 10 * time.Second

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
			s.setErr(fmt.Errorf("herd/client: malformed event: %w", err))
			return
		}
		if ev.Kind == "" {
			// Not an event envelope — an out-of-band error response.
			if _, respErr := decodeResponse(MethodEventsSubscribe, "", line); respErr != nil {
				s.setErr(respErr)
				return
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
// status" — the one match herdr 0.8.0 implements for events.wait.
func MatchAgentStatus(paneID string, status AgentStatus) EventMatch {
	return EventMatch{Event: EventPaneAgentStatusChanged, PaneID: paneID, AgentStatus: status}
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
	var out struct {
		Event Event `json:"event"`
	}
	if err := c.callNoTimeout(ctx, MethodEventsWait, resultWaitMatched, params, &out); err != nil {
		return nil, err
	}
	return &out.Event, nil
}
