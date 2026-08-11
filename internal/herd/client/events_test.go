package client

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

// streamFixtureHandler answers events.subscribe with subscription_started and
// then replays the captured event lines, blocking until the client hangs up.
func streamFixtureHandler(release <-chan struct{}) fakeHandler {
	return func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
		if err := respond(w, req.ID, `{"type":"subscription_started"}`); err != nil {
			return err
		}
		for _, line := range strings.Split(strings.TrimSpace(loadFixture(t, "event_stream.ndjson")), "\n") {
			if err := w.writeLine(line); err != nil {
				return err
			}
		}
		<-release
		return nil
	}
}

func TestEventsSubscribeStreamsToChannel(t *testing.T) {
	release := make(chan struct{})
	defer close(release)

	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: streamFixtureHandler(release),
	})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{
		{Type: SubPaneUpdated},
		SubscribeAgentStatus("w3S:p1", ""),
	})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}
	defer stream.Close()

	want := []EventKind{
		EventPaneUpdated,
		EventLayoutUpdated,
		EventPaneAgentStatusChanged,
		EventPaneAgentStatusChanged,
	}
	var got []EventKind
	var statuses []AgentStatus
	for range want {
		select {
		case ev, ok := <-stream.Events():
			if !ok {
				t.Fatalf("stream closed early after %d events (err=%v)", len(got), stream.Err())
			}
			got = append(got, ev.Kind)
			if ev.Kind == EventPaneAgentStatusChanged {
				changed, err := ev.AgentStatusChanged()
				if err != nil {
					t.Fatalf("AgentStatusChanged: %v", err)
				}
				if changed.PaneID != "w3S:p1" || changed.WorkspaceID != "w3S" {
					t.Errorf("changed = %+v", changed)
				}
				statuses = append(statuses, changed.AgentStatus)
			}
		case <-time.After(5 * time.Second):
			t.Fatalf("timed out waiting for event %d", len(got))
		}
	}

	for i := range want {
		if got[i] != want[i] {
			t.Errorf("event %d = %q, want %q", i, got[i], want[i])
		}
	}
	// The point of the stream: a worker going working → idle without polling.
	if len(statuses) != 2 || statuses[0] != StatusWorking || statuses[1] != StatusIdle {
		t.Errorf("statuses = %v", statuses)
	}

	// The subscription request must carry both subscriptions verbatim.
	var params struct {
		Subscriptions []Subscription `json:"subscriptions"`
	}
	reqs := srv.Requests()
	found := false
	for _, req := range reqs {
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
	if len(params.Subscriptions) != 2 {
		t.Fatalf("subscriptions = %+v", params.Subscriptions)
	}
	if params.Subscriptions[0].Type != SubPaneUpdated {
		t.Errorf("subscription[0] = %+v", params.Subscriptions[0])
	}
	if params.Subscriptions[1].Type != SubPaneAgentStatusChanged || params.Subscriptions[1].PaneID != "w3S:p1" {
		t.Errorf("subscription[1] = %+v", params.Subscriptions[1])
	}
	if params.Subscriptions[1].AgentStatus != "" {
		t.Errorf("empty status must be omitted, got %q", params.Subscriptions[1].AgentStatus)
	}
}

func TestEventsSubscribeContextCancelClosesChannel(t *testing.T) {
	release := make(chan struct{})
	defer close(release)

	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: streamFixtureHandler(release),
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
		MethodEventsSubscribe: streamFixtureHandler(release),
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

func TestEventsSubscribeReportsStreamFailure(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			if err := respond(w, req.ID, `{"type":"subscription_started"}`); err != nil {
				return err
			}
			return w.writeLine(`{"event":"pane_updated","data":`) // truncated JSON
		},
	})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{{Type: SubPaneUpdated}})
	if err != nil {
		t.Fatalf("EventsSubscribe: %v", err)
	}
	defer stream.Close()

	select {
	case _, ok := <-stream.Events():
		if ok {
			t.Fatal("expected no event from a malformed line")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("stream did not end on malformed event")
	}
	if err := stream.Err(); err == nil || !strings.Contains(err.Error(), "malformed event") {
		t.Errorf("Err = %v, want a malformed-event error", err)
	}
}

func TestEventsSubscribeRejectsProbeFailure(t *testing.T) {
	// herdr validates subscriptions up front and answers a bad pane id with
	// an error whose id is derived from the request id, not equal to it.
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodEventsSubscribe: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respondErr(w, req.ID+":sub:1:probe", CodePaneNotFound, "pane nope not found")
		},
	})

	stream, err := c.EventsSubscribe(t.Context(), []Subscription{SubscribeAgentStatus("nope", StatusIdle)})
	if stream != nil {
		t.Error("EventsSubscribe returned a stream alongside the error")
	}
	apiErr, ok := AsAPIError(err)
	if !ok {
		t.Fatalf("error is %T (%v), want *APIError", err, err)
	}
	if apiErr.Code != CodePaneNotFound {
		t.Errorf("code = %q", apiErr.Code)
	}
	if !strings.HasSuffix(apiErr.RequestID, ":sub:1:probe") {
		t.Errorf("request id = %q, want the derived probe id", apiErr.RequestID)
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
