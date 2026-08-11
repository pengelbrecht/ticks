package herdtest

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"testing"
)

// Subscription is one entry of an events.subscribe request, decoded far enough
// for the fake to route events and for tests to assert on what was asked for.
type Subscription struct {
	Type        string          `json:"type"`
	PaneID      string          `json:"pane_id,omitempty"`
	AgentStatus string          `json:"agent_status,omitempty"`
	Source      string          `json:"source,omitempty"`
	Match       json.RawMessage `json:"match,omitempty"`
}

// SubPaneAgentStatusChanged is the pane-scoped status subscription — the one
// with the conditional replay property.
const SubPaneAgentStatusChanged = "pane.agent_status_changed"

// stream is one live events.subscribe connection.
type stream struct {
	conn net.Conn
	w    *ConnWriter
	subs []Subscription
}

// matches reports whether this stream asked for a pane's status event.
func (st *stream) matches(pane, status string) bool {
	for _, sub := range st.subs {
		if sub.Type == SubPaneAgentStatusChanged && sub.PaneID == pane &&
			(sub.AgentStatus == "" || sub.AgentStatus == status) {
			return true
		}
	}
	return false
}

// StatusEventLine renders the pane-scoped `subscription_event` envelope, whose
// kind is the DOTTED subscription name and whose data carries no "type" field.
// See internal/herd/client/testdata/event_stream_scoped.ndjson.
func StatusEventLine(pane, status string) string {
	body, _ := json.Marshal(map[string]any{
		"event": SubPaneAgentStatusChanged,
		"data": map[string]any{
			"pane_id":      pane,
			"workspace_id": workspaceOf(pane),
			"agent":        "claude",
			"agent_status": status,
		},
	})
	return string(body)
}

// EventLine renders an envelope of the underscored `event` schema — the one
// events.wait and every session-wide subscription deliver. Its kind is
// underscored and its data repeats the kind in a "type" field; see
// internal/herd/client/testdata/event_stream.ndjson.
//
// It exists so a test can push a kind a consumer is NOT waiting on (a
// session-wide `pane_updated`, an event kind newer than the consumer) without
// writing a reply literal.
func EventLine(kind string, data map[string]any) string {
	payload := map[string]any{"type": kind}
	for k, v := range data {
		payload[k] = v
	}
	body, _ := json.Marshal(map[string]any{"event": kind, "data": payload})
	return string(body)
}

// IgnoredNonEventLine is a protocol line that is neither an event envelope nor
// an error response — the shape herdr may grow (a keepalive, say) and which a
// client must skip rather than treat as corruption. Pushing it with
// [Server.PushLine] proves a consumer survives it.
const IgnoredNonEventLine = `{"type":"keepalive"}`

// workspaceOf is the workspace id embedded in a pane id.
func workspaceOf(pane string) string {
	for i := 0; i < len(pane); i++ {
		if pane[i] == ':' {
			return pane[:i]
		}
	}
	return pane
}

// LastSubscriptions returns the subscription list of the most recent
// events.subscribe.
func (s *Server) LastSubscriptions() []Subscription {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]Subscription(nil), s.lastSubs...)
}

// PushStatus changes an agent's status and pushes the event to every live
// stream subscribed to that pane and status.
func (s *Server) PushStatus(name, status string) {
	s.SetStatus(name, status)
	s.mu.Lock()
	var pane string
	for _, a := range s.agents {
		if a.Name == name {
			pane = a.PaneID
		}
	}
	streams := append([]*stream(nil), s.streams...)
	s.mu.Unlock()
	for _, st := range streams {
		if st.matches(pane, status) {
			_ = st.w.WriteLine(StatusEventLine(pane, status))
		}
	}
}

// PushLine writes one raw line to every live stream, bypassing subscription
// matching entirely. It is how a test delivers what [Server.PushStatus] cannot:
// a status event for a pane nobody is waiting on, a session-wide event kind, or
// a line that is not an event envelope at all ([IgnoredNonEventLine]) — the
// traffic a consumer's ignore paths have to survive.
//
// Lines are written in call order on each stream's own connection, so a test
// can push stray traffic and then a real settle and rely on the consumer
// seeing the strays first.
func (s *Server) PushLine(line string) {
	s.mu.Lock()
	streams := append([]*stream(nil), s.streams...)
	s.mu.Unlock()
	for _, st := range streams {
		_ = st.w.WriteLine(line)
	}
}

// KillStreams hangs up every live stream, which a client surfaces as a
// non-nil EventStream.Err.
func (s *Server) KillStreams() {
	s.mu.Lock()
	streams := append([]*stream(nil), s.streams...)
	s.streams = nil
	s.mu.Unlock()
	for _, st := range streams {
		_ = st.conn.Close()
	}
}

// WaitForStreams blocks until at least n streams are live.
func (s *Server) WaitForStreams(n int) {
	s.t.Helper()
	s.waitFor(fmt.Sprintf("%d live streams", n), func() bool {
		s.mu.Lock()
		defer s.mu.Unlock()
		return len(s.streams) >= n
	})
}

// handleEventsSubscribe is the only method that keeps its connection: after the
// subscription_started reply it streams envelopes until the client hangs up or
// the server shuts down.
//
// It reproduces two live-verified properties:
//
//   - herdr probes the subscriptions in order and reports only the first
//     failure, encoding its 0-based index in the error's request id.
//   - a subscription carrying a concrete agent_status filter replays the
//     pane's current status immediately; an unfiltered one does not.
func (s *Server) handleEventsSubscribe(_ *testing.T, req Request, w *ConnWriter) error {
	var params struct {
		Subscriptions []Subscription `json:"subscriptions"`
	}
	if err := json.Unmarshal(req.Params, &params); err != nil {
		return RespondErr(w, req.ID, CodeInvalidRequest, "bad params")
	}

	s.mu.Lock()
	s.subs++
	n := s.subs
	s.lastSubs = params.Subscriptions
	reject := s.rejectSub
	kill := s.killSub
	known := make(map[string]string, len(s.agents))
	for _, a := range s.agents {
		known[a.PaneID] = a.Status
	}
	s.mu.Unlock()

	badIndex := -1
	if reject != nil {
		if idx, ok := reject(n); ok {
			badIndex = idx
		}
	}
	if badIndex < 0 {
		for i, sub := range params.Subscriptions {
			if sub.PaneID == "" {
				continue // session-wide subscriptions are not pane-probed
			}
			if _, ok := known[sub.PaneID]; !ok {
				badIndex = i
				break
			}
		}
	}
	if badIndex >= 0 {
		id := fmt.Sprintf("%s:sub:%d:probe", req.ID, badIndex)
		return RespondErr(w, id, CodePaneNotFound, "pane not found")
	}

	if err := Respond(w, req.ID, `{"type":"subscription_started"}`); err != nil {
		return err
	}
	if kill != nil && kill(n) {
		return nil
	}

	st := &stream{conn: w.conn, w: w, subs: params.Subscriptions}

	// Conditional replay: a subscription carrying a concrete agent_status
	// fires immediately when the pane is already in that status. Without the
	// filter there is no replay — that asymmetry is the whole reason
	// internal/herd/wait subscribes per terminal status.
	for _, sub := range params.Subscriptions {
		if sub.Type != SubPaneAgentStatusChanged || sub.AgentStatus == "" {
			continue
		}
		if known[sub.PaneID] == sub.AgentStatus {
			if err := w.WriteLine(StatusEventLine(sub.PaneID, sub.AgentStatus)); err != nil {
				return err
			}
		}
	}

	s.mu.Lock()
	s.streams = append(s.streams, st)
	s.mu.Unlock()

	clientGone := make(chan struct{})
	go func() {
		_, _ = io.Copy(io.Discard, w.conn)
		close(clientGone)
	}()
	select {
	case <-clientGone:
	case <-s.serverDone:
	}
	return nil
}
