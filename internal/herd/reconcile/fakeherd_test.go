package reconcile

import (
	"bufio"
	"encoding/json"
	"net"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
)

// A package-internal fake of the herdr socket API — herd/client's and
// herd/wait's fakes are internal by design, so this package builds its own. It
// is a real unix listener speaking the real wire protocol and, like herdr,
// answers exactly one request per connection.
//
// Reconcile is request/response only: ping, agent.list, session.snapshot.

// fakeAgent is one agent-bearing pane in the fake session.
type fakeAgent struct {
	name        string
	paneID      string
	workspaceID string
	status      client.AgentStatus
	// session, when set, is the agent_session herdr reports for this agent.
	session string
	// listHidden keeps the agent out of agent.list while leaving it in the
	// snapshot — how herdr looks when a pane is gone but the session identity
	// is still remembered.
	listHidden bool
}

// fakeHerd is an in-process herdr server.
type fakeHerd struct {
	t    *testing.T
	path string
	ln   net.Listener

	mu         sync.Mutex
	agents     []fakeAgent
	workspaces []string
	methods    []string

	wg sync.WaitGroup
}

func newFakeHerd(t *testing.T, workspaces []string, agents ...fakeAgent) *fakeHerd {
	t.Helper()
	// Unix socket paths are length-limited on darwin; keep the prefix short.
	dir, err := os.MkdirTemp("", "hr")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	path := filepath.Join(dir, "h.sock")
	ln, err := net.Listen("unix", path)
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	s := &fakeHerd{t: t, path: path, ln: ln, agents: agents, workspaces: workspaces}
	s.wg.Add(1)
	go s.acceptLoop()
	t.Cleanup(func() {
		_ = s.ln.Close()
		s.wg.Wait()
	})
	return s
}

// Client returns a herdr client dialled at this fake.
func (s *fakeHerd) Client(t *testing.T) *client.Client {
	t.Helper()
	c, err := client.New(t.Context(), client.Options{SocketPath: s.path, CallTimeout: 5 * time.Second})
	if err != nil {
		t.Fatalf("client.New: %v", err)
	}
	return c
}

func (s *fakeHerd) Methods() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string(nil), s.methods...)
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

func (s *fakeHerd) agentJSON(a fakeAgent) map[string]any {
	m := map[string]any{
		"terminal_id":  a.paneID,
		"agent_status": string(a.status),
		"workspace_id": a.workspaceID,
		"tab_id":       a.workspaceID + ":t1",
		"pane_id":      a.paneID,
		"focused":      false,
		"revision":     1,
		"name":         a.name,
	}
	if a.session != "" {
		m["agent_session"] = map[string]any{
			"source": "herdr:claude", "agent": "claude",
			"kind": "id", "value": a.session,
		}
	}
	return m
}

func (s *fakeHerd) serve(conn net.Conn) {
	defer conn.Close()
	line, err := bufio.NewReader(conn).ReadBytes('\n')
	if err != nil {
		return
	}
	var req struct {
		ID     string          `json:"id"`
		Method string          `json:"method"`
		Params json.RawMessage `json:"params"`
	}
	if err := json.Unmarshal(line, &req); err != nil {
		return
	}

	s.mu.Lock()
	s.methods = append(s.methods, req.Method)
	agents := append([]fakeAgent(nil), s.agents...)
	workspaces := append([]string(nil), s.workspaces...)
	s.mu.Unlock()

	var result any
	switch req.Method {
	case client.MethodPing:
		result = map[string]any{"type": "pong", "version": "0.8.0", "protocol": 19}
	case client.MethodAgentList:
		listed := make([]map[string]any, 0, len(agents))
		for _, a := range agents {
			if a.listHidden {
				continue
			}
			listed = append(listed, s.agentJSON(a))
		}
		result = map[string]any{"type": "agent_list", "agents": listed}
	case client.MethodSessionSnapshot:
		all := make([]map[string]any, 0, len(agents))
		for _, a := range agents {
			all = append(all, s.agentJSON(a))
		}
		ws := make([]map[string]any, 0, len(workspaces))
		for i, id := range workspaces {
			ws = append(ws, map[string]any{
				"workspace_id": id, "number": i + 1, "label": id,
				"focused": false, "pane_count": 1, "tab_count": 1,
				"active_tab_id": id + ":t1", "agent_status": "idle",
			})
		}
		result = map[string]any{
			"type": "session_snapshot",
			"snapshot": map[string]any{
				"version": "0.8.0", "protocol": 19,
				"workspaces": ws,
				"tabs":       []any{},
				"panes":      []any{},
				"agents":     all,
				"layouts":    []any{},
			},
		}
	default:
		body, _ := json.Marshal(map[string]any{
			"id":    req.ID,
			"error": map[string]string{"code": "invalid_request", "message": "unexpected " + req.Method},
		})
		w := bufio.NewWriter(conn)
		_, _ = w.Write(append(body, '\n'))
		_ = w.Flush()
		return
	}

	body, _ := json.Marshal(map[string]any{"id": req.ID, "result": result})
	w := bufio.NewWriter(conn)
	_, _ = w.Write(append(body, '\n'))
	_ = w.Flush()
}
