package client

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// streamFixtureHandler answers events.subscribe with subscription_started and
// then replays a captured event fixture, blocking until the client hangs up.
func streamFixtureHandler(fixture string, release <-chan struct{}) fakeHandler {
	return func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
		if err := respond(w, req.ID, `{"type":"subscription_started"}`); err != nil {
			return err
		}
		for _, line := range loadEventLines(t, fixture) {
			if err := w.writeLine(line); err != nil {
				return err
			}
		}
		<-release
		return nil
	}
}

// TestEventsSubscribeStreamsSessionWideEnvelopes covers the underscored
// `event` schema that session-wide subscriptions deliver.
func TestEventsSubscribeStreamsSessionWideEnvelopes(t *testing.T) {
	release := make(chan struct{})
	defer close(release)

	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: streamFixtureHandler("event_stream.ndjson", release),
	})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{
		{Type: SubPaneUpdated},
		{Type: SubLayoutUpdated},
	})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}
	defer stream.Close()

	want := []EventKind{EventPaneUpdated, EventLayoutUpdated}
	for i, wantKind := range want {
		ev := nextEvent(t, stream)
		if ev.Kind != wantKind {
			t.Errorf("event %d = %q, want %q", i, ev.Kind, wantKind)
		}
	}

	var params struct {
		Subscriptions []Subscription `json:"subscriptions"`
	}
	found := false
	for _, req := range srv.Requests() {
		if req.Method != MethodEventsSubscribe {
			continue
		}
		found = true
		if err := json.Unmarshal(req.Params, &params); err != nil {
			t.Fatalf("decoding subscribe params: %v", err)
		}
	}
	if !found {
		t.Fatal("no events.subscribe request recorded")
	}
	if len(params.Subscriptions) != 2 || params.Subscriptions[0].Type != SubPaneUpdated {
		t.Fatalf("subscriptions = %+v", params.Subscriptions)
	}
	// A session-wide subscription must never carry a pane id — herdr would
	// accept it silently and fire for every pane.
	for i, sub := range params.Subscriptions {
		if sub.PaneID != "" {
			t.Errorf("subscription %d leaked a pane id: %+v", i, sub)
		}
	}
}

// TestEventsSubscribeStreamsScopedEnvelopes covers the dotted
// `subscription_event` schema that the three pane-scoped subscriptions
// deliver: the subscription name is reused as the event kind and the payload
// has no "type" field. The accessors must decode it all the same.
func TestEventsSubscribeStreamsScopedEnvelopes(t *testing.T) {
	release := make(chan struct{})
	defer close(release)

	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: streamFixtureHandler("event_stream_scoped.ndjson", release),
	})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{
		SubscribeAgentStatus("w3S:p1", StatusIdle),
		SubscribeOutputMatch("w3S:p1", SourceRecent, Substring("PUT")),
	})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}
	defer stream.Close()

	status := nextEvent(t, stream)
	if status.Kind != EventScopedPaneAgentStatusChanged {
		t.Fatalf("status event kind = %q, want %q", status.Kind, EventScopedPaneAgentStatusChanged)
	}
	if !status.IsAgentStatusChanged() {
		t.Error("IsAgentStatusChanged did not recognise the dotted spelling")
	}
	changed, err := status.AgentStatusChanged()
	if err != nil {
		t.Fatalf("AgentStatusChanged on a scoped event: %v", err)
	}
	if changed.PaneID != "w3S:p1" || changed.AgentStatus != StatusIdle || changed.WorkspaceID != "w3S" {
		t.Errorf("changed = %+v", changed)
	}

	matched := nextEvent(t, stream)
	if matched.Kind != EventScopedPaneOutputMatched {
		t.Fatalf("match event kind = %q, want %q", matched.Kind, EventScopedPaneOutputMatched)
	}
	out, err := matched.OutputMatched()
	if err != nil {
		t.Fatalf("OutputMatched on a scoped event: %v", err)
	}
	if !strings.Contains(out.MatchedLine, "PUT") || out.Read.PaneID != "w3S:p1" {
		t.Errorf("out = %+v", out)
	}

	// Both scoped subscriptions must have gone out with their pane id.
	var params struct {
		Subscriptions []Subscription `json:"subscriptions"`
	}
	for _, req := range srv.Requests() {
		if req.Method == MethodEventsSubscribe {
			if err := json.Unmarshal(req.Params, &params); err != nil {
				t.Fatalf("decoding subscribe params: %v", err)
			}
		}
	}
	for i, sub := range params.Subscriptions {
		if sub.PaneID != "w3S:p1" {
			t.Errorf("subscription %d = %+v, want pane w3S:p1", i, sub)
		}
	}
	if params.Subscriptions[0].AgentStatus != StatusIdle {
		t.Errorf("status filter dropped: %+v", params.Subscriptions[0])
	}
}

// TestEventAccessorsSpanBothSpellings pins the blocker: one accessor has to
// work whether the event came from events.wait or from a scoped subscription.
func TestEventAccessorsSpanBothSpellings(t *testing.T) {
	underscored := Event{
		Kind: EventPaneAgentStatusChanged,
		Data: json.RawMessage(`{"type":"pane_agent_status_changed","pane_id":"w3S:p1","workspace_id":"w3S","agent_status":"idle","agent":"claude"}`),
	}
	dotted := Event{
		Kind: EventScopedPaneAgentStatusChanged,
		Data: json.RawMessage(`{"agent":"claude","agent_status":"idle","pane_id":"w3S:p1","workspace_id":"w3S"}`),
	}

	for name, ev := range map[string]Event{"underscored": underscored, "dotted": dotted} {
		t.Run(name, func(t *testing.T) {
			if !ev.IsAgentStatusChanged() {
				t.Fatal("IsAgentStatusChanged = false")
			}
			changed, err := ev.AgentStatusChanged()
			if err != nil {
				t.Fatalf("AgentStatusChanged: %v", err)
			}
			if changed.AgentStatus != StatusIdle || changed.PaneID != "w3S:p1" {
				t.Errorf("changed = %+v", changed)
			}
		})
	}
}

func TestSubscriptionScopingIsValidated(t *testing.T) {
	c, srv := newTestClient(t, nil)

	tests := []struct {
		name string
		sub  Subscription
		want string
	}{
		{
			name: "session-wide type with a pane id",
			sub:  Subscription{Type: SubPaneUpdated, PaneID: "w3S:p1"},
			want: "silently ignore",
		},
		{
			name: "pane.agent_detected is session-wide despite the name",
			sub:  Subscription{Type: SubPaneAgentDetected, PaneID: "w3S:p1"},
			want: "session-wide",
		},
		{
			name: "scoped type without a pane id",
			sub:  Subscription{Type: SubPaneAgentStatusChanged},
			want: "needs a PaneID",
		},
		{
			name: "output match without source or match",
			sub:  Subscription{Type: SubPaneOutputMatched, PaneID: "w3S:p1"},
			want: "needs both Source and Match",
		},
		{
			name: "no type",
			sub:  Subscription{PaneID: "w3S:p1"},
			want: "no type",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := c.EventsSubscribe(t.Context(), []Subscription{tc.sub})
			if err == nil {
				t.Fatal("EventsSubscribe succeeded, want a validation error")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Errorf("err = %v, want it to mention %q", err, tc.want)
			}
		})
	}

	// Validation must happen before dialling: no subscribe ever reached the
	// server.
	for _, req := range srv.Requests() {
		if req.Method == MethodEventsSubscribe {
			t.Fatal("an invalid subscription reached the server")
		}
	}
}

func TestSubscriptionTypeIsPaneScoped(t *testing.T) {
	scoped := []SubscriptionType{SubPaneAgentStatusChanged, SubPaneOutputMatched, SubPaneScrollChanged}
	for _, st := range scoped {
		if !st.IsPaneScoped() {
			t.Errorf("%s should be pane-scoped", st)
		}
	}
	wide := []SubscriptionType{
		SubPaneUpdated, SubPaneCreated, SubPaneClosed, SubPaneFocused, SubPaneMoved,
		SubPaneExited, SubPaneAgentDetected, SubLayoutUpdated, SubWorkspaceCreated,
	}
	for _, st := range wide {
		if st.IsPaneScoped() {
			t.Errorf("%s should be session-wide", st)
		}
	}
}

func TestEventsSubscribeContextCancelClosesChannel(t *testing.T) {
	release := make(chan struct{})
	defer close(release)

	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: streamFixtureHandler("event_stream.ndjson", release),
	})

	ctx, cancel := context.WithCancel(t.Context())
	stream, err := c.EventsSubscribe(ctx, []Subscription{{Type: SubPaneUpdated}})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}

	if _, ok := <-stream.Events(); !ok {
		t.Fatal("expected at least one event before cancelling")
	}
	cancel()

	deadline := time.After(5 * time.Second)
	for {
		select {
		case _, ok := <-stream.Events():
			if !ok {
				if err := stream.Err(); err != nil {
					t.Errorf("Err after cancel = %v, want nil", err)
				}
				return
			}
		case <-deadline:
			t.Fatal("channel did not close after context cancel")
		}
	}
}

func TestEventStreamCloseIsIdempotent(t *testing.T) {
	release := make(chan struct{})
	defer close(release)

	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: streamFixtureHandler("event_stream.ndjson", release),
	})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{{Type: SubPaneUpdated}})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}
	if err := stream.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	if err := stream.Close(); err != nil {
		t.Fatalf("second Close: %v", err)
	}
	if _, ok := <-stream.Events(); ok {
		t.Error("channel still open after Close")
	}
	if err := stream.Err(); err != nil {
		t.Errorf("Err after Close = %v, want nil", err)
	}
}

// TestEventsSubscribeIdentifiesRejectedSubscription pins the 0-based index
// herdr encodes in the derived probe id. herdr reports only the first invalid
// subscription, so the index is the only way to know which one to fix.
func TestEventsSubscribeIdentifiesRejectedSubscription(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			// The good subscription is index 0; herdr stops at index 1.
			return respondErr(w, req.ID+":sub:1:probe", CodePaneNotFound, "pane bad-two not found")
		},
	})

	subs := []Subscription{
		SubscribeAgentStatus("w3S:p1", StatusIdle),
		SubscribeAgentStatus("bad-two", StatusIdle),
	}
	stream, err := c.EventsSubscribe(t.Context(), subs)
	if stream != nil {
		t.Error("EventsSubscribe returned a stream alongside the error")
	}

	var subErr *SubscribeError
	if !errors.As(err, &subErr) {
		t.Fatalf("error is %T (%v), want *SubscribeError", err, err)
	}
	if subErr.Index != 1 {
		t.Errorf("Index = %d, want 1", subErr.Index)
	}
	if subErr.Subscription.PaneID != "bad-two" {
		t.Errorf("Subscription = %+v, want the entry at index 1", subErr.Subscription)
	}
	if !strings.Contains(subErr.Error(), "bad-two") {
		t.Errorf("message omits the offending pane: %s", subErr.Error())
	}
	// It must still behave as an APIError for code-based handling.
	apiErr, ok := AsAPIError(err)
	if !ok || apiErr.Code != CodePaneNotFound {
		t.Errorf("AsAPIError = %+v, %v", apiErr, ok)
	}
}

// TestEventsSubscribeSingleBadSubscriptionIsIndexZero guards the off-by-one
// the previous test suite hid behind a HasSuffix check: with one subscription
// the real index is 0, not 1.
func TestEventsSubscribeSingleBadSubscriptionIsIndexZero(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respondErr(w, req.ID+":sub:0:probe", CodePaneNotFound, "pane nope not found")
		},
	})

	_, err := c.EventsSubscribe(t.Context(), []Subscription{SubscribeAgentStatus("nope", StatusIdle)})
	var subErr *SubscribeError
	if !errors.As(err, &subErr) {
		t.Fatalf("error is %T (%v), want *SubscribeError", err, err)
	}
	if subErr.Index != 0 {
		t.Errorf("Index = %d, want 0", subErr.Index)
	}
	if subErr.Subscription.PaneID != "nope" {
		t.Errorf("Subscription = %+v", subErr.Subscription)
	}
}

// TestEventsSubscribeUnparsableProbeIDPassesThrough keeps an unrecognised
// error id from being mis-attributed to a subscription.
func TestEventsSubscribeUnparsableProbeIDPassesThrough(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respondErr(w, "", CodeInvalidRequest, "invalid request: missing field `pane_id`")
		},
	})

	_, err := c.EventsSubscribe(t.Context(), []Subscription{SubscribeAgentStatus("w3S:p1", StatusIdle)})
	var subErr *SubscribeError
	if errors.As(err, &subErr) {
		t.Fatalf("unparsable probe id became a SubscribeError: %+v", subErr)
	}
	if !IsCode(err, CodeInvalidRequest) {
		t.Errorf("err = %v", err)
	}
}

// TestEventStreamDisconnectIsDistinguishableFromClose pins the contract a
// waiter keys on: a stream the caller stopped reports Err() == nil, a stream
// the server dropped reports a non-nil read error. Confusing the two turns a
// lost connection into a false "worker finished".
func TestEventStreamDisconnectIsDistinguishableFromClose(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			if err := respond(w, req.ID, `{"type":"subscription_started"}`); err != nil {
				return err
			}
			if err := w.writeLine(loadEventLines(t, "event_stream.ndjson")[0]); err != nil {
				return err
			}
			// Returning closes the connection: a mid-stream disconnect.
			return nil
		},
	})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{{Type: SubPaneUpdated}})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}
	defer stream.Close()

	if ev := nextEvent(t, stream); ev.Kind != EventPaneUpdated {
		t.Fatalf("first event = %q", ev.Kind)
	}
	waitStreamClosed(t, stream)

	streamErr := stream.Err()
	if streamErr == nil {
		t.Fatal("Err after a server disconnect = nil, want a read error")
	}
	if !strings.Contains(streamErr.Error(), "reading event stream") {
		t.Errorf("Err = %v, want a reading-event-stream error", streamErr)
	}
	// Close must surface the same terminal error rather than masking it.
	if closeErr := stream.Close(); closeErr == nil {
		t.Error("Close on a failed stream returned nil, want the terminal error")
	}
}

// TestEventStreamAppliesBackpressure proves a slow consumer never loses
// events: every event the server wrote arrives, in order.
func TestEventStreamAppliesBackpressure(t *testing.T) {
	const total = 60
	release := make(chan struct{})
	defer close(release)

	c, _ := newTestClientOpts(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			if err := respond(w, req.ID, `{"type":"subscription_started"}`); err != nil {
				return err
			}
			for i := range total {
				line := `{"event":"pane_updated","data":{"type":"pane_updated","seq":` + strconv.Itoa(i) + `}}`
				if err := w.writeLine(line); err != nil {
					return err
				}
			}
			<-release
			return nil
		},
	}, Options{EventBuffer: -1}) // unbuffered: every hand-off is backpressure

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{{Type: SubPaneUpdated}})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}
	defer stream.Close()

	for i := range total {
		ev := nextEvent(t, stream)
		var payload struct {
			Seq int `json:"seq"`
		}
		if err := ev.Decode(&payload); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if payload.Seq != i {
			t.Fatalf("event %d has seq %d — events were dropped or reordered", i, payload.Seq)
		}
		// Consume slowly enough that the writer must block.
		time.Sleep(time.Millisecond)
	}
}

// TestClientConcurrentFanOut runs many calls and many streams on one Client at
// once; under -race this is the check that the client is safe to share across
// a wave of workers.
func TestClientConcurrentFanOut(t *testing.T) {
	const workers = 8
	release := make(chan struct{})
	defer close(release)

	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodAgentList: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, loadFixture(t, "agent_list.json"))
		},
		MethodEventsSubscribe: streamFixtureHandler("event_stream.ndjson", release),
	})

	var wg sync.WaitGroup
	for range workers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := c.AgentList(t.Context()); err != nil {
				t.Errorf("AgentList: %v", err)
			}
		}()
		wg.Add(1)
		go func() {
			defer wg.Done()
			stream, err := c.EventsSubscribe(t.Context(), []Subscription{{Type: SubPaneUpdated}})
			if err != nil {
				t.Errorf("EventsSubscribe: %v", err)
				return
			}
			defer stream.Close()
			select {
			case <-stream.Events():
			case <-time.After(10 * time.Second):
				t.Error("timed out waiting for a fan-out event")
			}
		}()
	}
	wg.Wait()
}

// TestEventStreamCloseFromConsumerLoop closes the stream from inside a range
// over its channel — the shape a wait loop actually takes when it sees the
// event it wanted. It must not deadlock.
func TestEventStreamCloseFromConsumerLoop(t *testing.T) {
	release := make(chan struct{})
	defer close(release)

	c, _ := newTestClientOpts(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			if err := respond(w, req.ID, `{"type":"subscription_started"}`); err != nil {
				return err
			}
			// Keep pushing so the reader is mid-flight when Close lands.
			for {
				select {
				case <-release:
					return nil
				default:
				}
				if err := w.writeLine(`{"event":"pane_updated","data":{"type":"pane_updated"}}`); err != nil {
					return nil
				}
			}
		},
	}, Options{EventBuffer: -1})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{{Type: SubPaneUpdated}})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}

	done := make(chan error, 1)
	go func() {
		var closeErr error
		seen := 0
		for range stream.Events() {
			seen++
			if seen == 3 {
				closeErr = stream.Close()
			}
		}
		done <- closeErr
	}()

	select {
	case closeErr := <-done:
		if closeErr != nil {
			t.Errorf("Close from inside the loop = %v, want nil", closeErr)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("Close from inside the consumer loop deadlocked")
	}
	if err := stream.Err(); err != nil {
		t.Errorf("Err after a caller-initiated Close = %v, want nil", err)
	}
}

// TestEventStreamIgnoresUnrecognisedLine keeps a future keepalive line from
// killing a stream.
func TestEventStreamIgnoresUnrecognisedLine(t *testing.T) {
	release := make(chan struct{})
	defer close(release)

	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			if err := respond(w, req.ID, `{"type":"subscription_started"}`); err != nil {
				return err
			}
			if err := w.writeLine(`{"keepalive":true}`); err != nil {
				return err
			}
			if err := w.writeLine(`{"event":"pane_updated","data":{"type":"pane_updated"}}`); err != nil {
				return err
			}
			<-release
			return nil
		},
	})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{{Type: SubPaneUpdated}})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}
	defer stream.Close()

	if ev := nextEvent(t, stream); ev.Kind != EventPaneUpdated {
		t.Errorf("event = %q, want the line after the keepalive", ev.Kind)
	}
	if err := stream.Err(); err != nil {
		t.Errorf("Err = %v, want nil — an unknown line must not kill the stream", err)
	}
}

// TestEventStreamNamesMalformedLine checks the decode error is diagnosable.
func TestEventStreamNamesMalformedLine(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			if err := respond(w, req.ID, `{"type":"subscription_started"}`); err != nil {
				return err
			}
			return w.writeLine(`{"event":"pane_updated","data":`)
		},
	})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{{Type: SubPaneUpdated}})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}
	defer stream.Close()

	waitStreamClosed(t, stream)
	streamErr := stream.Err()
	if streamErr == nil || !strings.Contains(streamErr.Error(), "malformed event") {
		t.Fatalf("Err = %v, want a malformed-event error", streamErr)
	}
	if !strings.Contains(streamErr.Error(), "pane_updated") {
		t.Errorf("Err does not name the offending line: %v", streamErr)
	}
}

// nextEvent reads one event or fails the test.
func nextEvent(t *testing.T, s *EventStream) Event {
	t.Helper()
	select {
	case ev, ok := <-s.Events():
		if !ok {
			t.Fatalf("stream closed early (err=%v)", s.Err())
		}
		return ev
	case <-time.After(10 * time.Second):
		t.Fatal("timed out waiting for an event")
		return Event{}
	}
}

// waitStreamClosed drains until the event channel closes.
func waitStreamClosed(t *testing.T, s *EventStream) {
	t.Helper()
	deadline := time.After(10 * time.Second)
	for {
		select {
		case _, ok := <-s.Events():
			if !ok {
				return
			}
		case <-deadline:
			t.Fatal("stream did not close")
		}
	}
}

func TestEventsSubscribeRequiresSubscriptions(t *testing.T) {
	c, _ := newTestClient(t, nil)
	if _, err := c.EventsSubscribe(t.Context(), nil); err == nil {
		t.Fatal("EventsSubscribe with no subscriptions succeeded, want error")
	}
}

func TestEventsWaitReturnsMatchedEvent(t *testing.T) {
	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodEventsWait: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"wait_matched","event":{"event":"pane_agent_status_changed","data":{"type":"pane_agent_status_changed","pane_id":"w3S:p1","workspace_id":"w3S","agent_status":"idle","agent":"claude"}}}`)
		},
	})

	ev, err := c.EventsWait(t.Context(), EventsWaitParams{
		Match:   MatchAgentStatus("w3S:p1", StatusIdle),
		Timeout: 10 * time.Minute,
	})
	if err != nil {
		t.Fatalf("EventsWait: %v", err)
	}
	changed, err := ev.AgentStatusChanged()
	if err != nil {
		t.Fatalf("AgentStatusChanged: %v", err)
	}
	if changed.AgentStatus != StatusIdle || changed.PaneID != "w3S:p1" {
		t.Errorf("changed = %+v", changed)
	}
	assertParams(t, srv, MethodEventsWait, map[string]any{
		"match_event": map[string]any{
			"event":        "pane_agent_status_changed",
			"pane_id":      "w3S:p1",
			"agent_status": "idle",
		},
		"timeout_ms": float64(600000),
	})
}

func TestEventsWaitTimeoutIsAnAPIError(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsWait: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respondErr(w, req.ID, CodeTimeout, "timed out waiting for event match")
		},
	})

	_, err := c.EventsWait(t.Context(), EventsWaitParams{
		Match:   MatchAgentStatus("w3S:p1", StatusIdle),
		Timeout: time.Second,
	})
	if !IsTimeout(err) {
		t.Fatalf("IsTimeout(%v) = false, want true", err)
	}
}

func TestEventsWaitUnsupportedMatchIsSurfaced(t *testing.T) {
	// herdr 0.8.0 implements only pane agent-status matches for events.wait.
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsWait: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respondErr(w, req.ID, "unsupported_event_wait_match", "events.wait currently supports pane agent status matches")
		},
	})

	_, err := c.EventsWait(t.Context(), EventsWaitParams{
		Match: EventMatch{Event: EventPaneClosed, PaneID: "w3S:p1"},
	})
	if !IsCode(err, "unsupported_event_wait_match") {
		t.Fatalf("err = %v, want unsupported_event_wait_match", err)
	}
}

func TestEventDecodeWrongKind(t *testing.T) {
	ev := Event{Kind: EventPaneUpdated, Data: json.RawMessage(`{}`)}
	if _, err := ev.AgentStatusChanged(); err == nil {
		t.Error("AgentStatusChanged on a pane_updated event succeeded, want error")
	}
	if _, err := ev.OutputMatched(); err == nil {
		t.Error("OutputMatched on a pane_updated event succeeded, want error")
	}
}

// TestEventStreamMidStreamAPIErrorEndsStream pins that an out-of-band error
// envelope arriving after subscription_started terminates the stream with the
// mapped APIError rather than being skipped like an unrecognised line. A
// future refactor that turned this branch into a continue would make a waiter
// hang forever on a dead subscription.
func TestEventStreamMidStreamAPIErrorEndsStream(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			if err := respond(w, req.ID, `{"type":"subscription_started"}`); err != nil {
				return err
			}
			if err := w.writeLine(loadEventLines(t, "event_stream.ndjson")[0]); err != nil {
				return err
			}
			if err := respondErr(w, req.ID, CodePaneNotFound, "pane closed mid-run"); err != nil {
				return err
			}
			// Keep the connection open until the test ends: the error
			// alone must end the stream.
			<-t.Context().Done()
			return nil
		},
	})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{{Type: SubPaneUpdated}})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}
	defer stream.Close()

	if ev := nextEvent(t, stream); ev.Kind != EventPaneUpdated {
		t.Fatalf("first event = %q", ev.Kind)
	}
	waitStreamClosed(t, stream)

	streamErr := stream.Err()
	if streamErr == nil {
		t.Fatal("Err after a mid-stream API error = nil, want the mapped APIError")
	}
	if !IsCode(streamErr, CodePaneNotFound) {
		t.Errorf("Err = %v, want an APIError with code %q", streamErr, CodePaneNotFound)
	}
}
