package wait

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
)

// This is a local fake of the herdr socket API, deliberately not shared with
// herd/client's own fake (which is package-internal, and must stay that way).
// It is a real unix listener speaking the real wire protocol, so these tests
// exercise the production transport and event stream rather than a stub.
//
// It reproduces the two live-verified behaviours this package is built on:
// a pane.agent_status_changed subscription with a concrete agent_status filter
// fires immediately when the pane is already in that status, and herdr reports
// only the first invalid subscription, by index, in the error's request id.

// fakeAgent is one agent-bearing pane in the fake session.
type fakeAgent struct {
	name   string
	paneID string
	status client.AgentStatus
}

// fakeHerd is an in-process herdr server.
type fakeHerd struct {
	t    *testing.T
	path string
	ln   net.Listener

	mu      sync.Mutex
	agents  []*fakeAgent
	streams []*fakeStream
	lists   int
	subs    int
	// lastSubs is the subscription list of the most recent events.subscribe.
	lastSubs []client.Subscription

	// afterList runs (unlocked) after the nth agent.list has been answered.
	// It is how a test opens the list→subscribe window.
	afterList func(n int)
	// rejectSub, when set, makes the nth events.subscribe fail with a probe
	// error naming the returned subscription index.
	rejectSub func(n int) (index int, ok bool)
	// killSub, when set, makes the nth events.subscribe hang up right after
	// the subscription_started reply, simulating a broken stream.
	killSub func(n int) bool

	serverDone chan struct{}
	wg         sync.WaitGroup
}

// fakeStream is one live events.subscribe connection.
type fakeStream struct {
	conn net.Conn
	w    *bufio.Writer
	mu   sync.Mutex
	subs []client.Subscription
}

func (s *fakeStream) writeLine(line string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, _ = s.w.WriteString(line + "\n")
	_ = s.w.Flush()
}

// newFakeHerd starts a fake server seeded with the given agents.
func newFakeHerd(t *testing.T, agents ...*fakeAgent) *fakeHerd {
	t.Helper()
	// Unix socket paths are length-limited on darwin; keep the prefix short.
	dir, err := os.MkdirTemp("", "hw")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	path := filepath.Join(dir, "h.sock")
	ln, err := net.Listen("unix", path)
	if err != nil {
		t.Fatalf("listen %s: %v", path, err)
	}
	s := &fakeHerd{t: t, path: path, ln: ln, agents: agents, serverDone: make(chan struct{})}
	s.wg.Add(1)
	go s.acceptLoop()
	t.Cleanup(s.Close)
	return s
}

// Close stops the listener and releases every open stream.
func (s *fakeHerd) Close() {
	select {
	case <-s.serverDone:
	default:
		close(s.serverDone)
	}
	_ = s.ln.Close()
	s.wg.Wait()
}

// Client returns a herdr client dialled at this fake.
func (s *fakeHerd) Client(t *testing.T) *client.Client {
	t.Helper()
	// Generous timeouts: under full-suite parallel load the in-process fake
	// can be slow to accept, and a dial timeout here is machine contention,
	// not the behavior under test.
	c, err := client.New(t.Context(), client.Options{SocketPath: s.path, DialTimeout: 30 * time.Second, CallTimeout: 30 * time.Second})
	if err != nil {
		t.Fatalf("client.New: %v", err)
	}
	return c
}

// Lists reports how many agent.list calls the fake has answered.
func (s *fakeHerd) Lists() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.lists
}

// Subscribes reports how many events.subscribe calls the fake has answered.
func (s *fakeHerd) Subscribes() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.subs
}

// LastSubs returns the subscriptions of the most recent events.subscribe.
func (s *fakeHerd) LastSubs() []client.Subscription {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]client.Subscription(nil), s.lastSubs...)
}

// setStatus changes an agent's status without announcing it — the state a
// later agent.list or a replaying subscription will report.
func (s *fakeHerd) setStatus(name string, status client.AgentStatus) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, a := range s.agents {
		if a.name == name {
			a.status = status
			return
		}
	}
	s.t.Fatalf("setStatus: no agent %q", name)
}

// removeAgent drops an agent from the session, as an exited pane would be.
func (s *fakeHerd) removeAgent(name string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	kept := s.agents[:0]
	for _, a := range s.agents {
		if a.name != name {
			kept = append(kept, a)
		}
	}
	s.agents = kept
}

// pushStatus changes an agent's status and pushes the event to every live
// stream subscribed to that pane and status.
func (s *fakeHerd) pushStatus(name string, status client.AgentStatus) {
	s.setStatus(name, status)
	s.mu.Lock()
	var pane string
	for _, a := range s.agents {
		if a.name == name {
			pane = a.paneID
		}
	}
	streams := append([]*fakeStream(nil), s.streams...)
	s.mu.Unlock()
	for _, st := range streams {
		if st.matches(pane, status) {
			st.writeLine(statusEventLine(pane, status))
		}
	}
}

// killStreams hangs up every live stream, which the client surfaces as a
// non-nil EventStream.Err.
func (s *fakeHerd) killStreams() {
	s.mu.Lock()
	streams := append([]*fakeStream(nil), s.streams...)
	s.streams = nil
	s.mu.Unlock()
	for _, st := range streams {
		_ = st.conn.Close()
	}
}

// waitForStreams blocks until at least n streams have been opened.
func (s *fakeHerd) waitForStreams(n int) {
	s.t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		s.mu.Lock()
		got := len(s.streams)
		s.mu.Unlock()
		if got >= n {
			return
		}
		time.Sleep(time.Millisecond)
	}
	s.t.Fatalf("timed out waiting for %d live streams", n)
}

func (st *fakeStream) matches(pane string, status client.AgentStatus) bool {
	for _, sub := range st.subs {
		if sub.Type == client.SubPaneAgentStatusChanged && sub.PaneID == pane &&
			(sub.AgentStatus == "" || sub.AgentStatus == status) {
			return true
		}
	}
	return false
}

// statusEventLine renders the pane-scoped `subscription_event` envelope, whose
// kind is the dotted subscription name and whose data has no "type" field.
func statusEventLine(pane string, status client.AgentStatus) string {
	body, _ := json.Marshal(map[string]any{
		"event": string(client.SubPaneAgentStatusChanged),
		"data": map[string]any{
			"pane_id":      pane,
			"workspace_id": "w1",
			"agent_status": string(status),
		},
	})
	return string(body)
}

func (s *fakeHerd) acceptLoop() {
	defer s.wg.Done()
	for {
		conn, err := s.ln.Accept()
		if err != nil {
			return
		}
		s.wg.Add(1)
		go func() {
			defer s.wg.Done()
			s.serve(conn)
		}()
	}
}

type fakeRequest struct {
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

func (s *fakeHerd) serve(conn net.Conn) {
	reader := bufio.NewReader(conn)
	line, err := reader.ReadBytes('\n')
	if err != nil {
		_ = conn.Close()
		return
	}
	var req fakeRequest
	if err := json.Unmarshal(line, &req); err != nil {
		_ = conn.Close()
		return
	}
	w := bufio.NewWriter(conn)
	write := func(text string) {
		_, _ = w.WriteString(text + "\n")
		_ = w.Flush()
	}

	switch req.Method {
	case client.MethodPing:
		write(`{"id":"` + req.ID + `","result":{"type":"pong","version":"0.8.0","protocol":19}}`)
		_ = conn.Close()
	case client.MethodAgentList:
		s.mu.Lock()
		s.lists++
		n := s.lists
		agents := make([]map[string]any, 0, len(s.agents))
		for _, a := range s.agents {
			agents = append(agents, map[string]any{
				"terminal_id":  a.paneID,
				"agent_status": string(a.status),
				"workspace_id": "w1",
				"tab_id":       "w1:t1",
				"pane_id":      a.paneID,
				"focused":      false,
				"revision":     1,
				"name":         a.name,
			})
		}
		after := s.afterList
		s.mu.Unlock()
		body, _ := json.Marshal(map[string]any{"type": "agent_list", "agents": agents})
		write(`{"id":"` + req.ID + `","result":` + string(body) + `}`)
		_ = conn.Close()
		if after != nil {
			after(n)
		}
	case client.MethodEventsSubscribe:
		s.serveSubscribe(conn, w, write, req)
	default:
		write(`{"id":"` + req.ID + `","error":{"code":"invalid_request","message":"unexpected method ` + req.Method + `"}}`)
		_ = conn.Close()
	}
}

func (s *fakeHerd) serveSubscribe(conn net.Conn, w *bufio.Writer, write func(string), req fakeRequest) {
	var params struct {
		Subscriptions []client.Subscription `json:"subscriptions"`
	}
	if err := json.Unmarshal(req.Params, &params); err != nil {
		write(`{"id":"` + req.ID + `","error":{"code":"invalid_request","message":"bad params"}}`)
		_ = conn.Close()
		return
	}

	s.mu.Lock()
	s.subs++
	n := s.subs
	s.lastSubs = params.Subscriptions
	reject := s.rejectSub
	kill := s.killSub
	known := map[string]client.AgentStatus{}
	for _, a := range s.agents {
		known[a.paneID] = a.status
	}
	s.mu.Unlock()

	// herdr probes the subscriptions in order and reports only the first
	// failure, encoding its 0-based index in the error's request id.
	badIndex := -1
	if reject != nil {
		if idx, ok := reject(n); ok {
			badIndex = idx
		}
	}
	if badIndex < 0 {
		for i, sub := range params.Subscriptions {
			if _, ok := known[sub.PaneID]; !ok {
				badIndex = i
				break
			}
		}
	}
	if badIndex >= 0 {
		id := fmt.Sprintf("%s:sub:%d:probe", req.ID, badIndex)
		write(`{"id":"` + id + `","error":{"code":"pane_not_found","message":"pane not found"}}`)
		_ = conn.Close()
		return
	}

	write(`{"id":"` + req.ID + `","result":{"type":"subscription_started"}}`)
	if kill != nil && kill(n) {
		_ = conn.Close()
		return
	}

	stream := &fakeStream{conn: conn, w: w, subs: params.Subscriptions}

	// Live-verified replay: a subscription carrying a concrete agent_status
	// fires immediately when the pane is already in that status.
	for _, sub := range params.Subscriptions {
		if sub.AgentStatus != "" && known[sub.PaneID] == sub.AgentStatus {
			stream.writeLine(statusEventLine(sub.PaneID, sub.AgentStatus))
		}
	}

	s.mu.Lock()
	s.streams = append(s.streams, stream)
	s.mu.Unlock()

	clientGone := make(chan struct{})
	go func() {
		_, _ = io.Copy(io.Discard, conn)
		close(clientGone)
	}()
	select {
	case <-clientGone:
	case <-s.serverDone:
	}
	_ = conn.Close()
}

// testContext is a context bounded well under `go test` patience, so a broken
// wait fails the test rather than hanging it.
func testContext(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), 20*time.Second)
	t.Cleanup(cancel)
	return ctx
}
