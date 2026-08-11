package cleanup

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

// A local fake of the herdr socket API. herd/client's, herd/wait's and
// herd/spawn's fakes are package-internal and must stay that way, so this
// package builds its own seam. It is a real unix listener speaking the real
// wire protocol, so these tests exercise the production transport rather than a
// stubbed Conn.
//
// The one protocol fact it must honour: herdr answers exactly one request per
// connection and then hangs up. Cleanup makes one agent.list plus one
// worktree.remove per applied plan, so the fake accepts that many sequential
// connections.

type fakeReq struct {
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

type fakeHerd struct {
	t    *testing.T
	path string
	ln   net.Listener

	mu       sync.Mutex
	requests []fakeReq
	agents   []map[string]any
	// removeErr, when set, makes every worktree.remove fail — the failed
	// teardown that must leave the manifest on disk.
	removeErr string
	removed   []string

	wg sync.WaitGroup
}

func newFakeHerd(t *testing.T) *fakeHerd {
	t.Helper()
	// Unix socket paths are length-limited on darwin; keep the prefix short.
	dir, err := os.MkdirTemp("", "hc")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	path := filepath.Join(dir, "h.sock")
	ln, err := net.Listen("unix", path)
	if err != nil {
		t.Fatalf("listen %s: %v", path, err)
	}
	s := &fakeHerd{t: t, path: path, ln: ln}
	s.wg.Add(1)
	go s.acceptLoop()
	t.Cleanup(func() {
		_ = s.ln.Close()
		s.wg.Wait()
	})
	return s
}

// setAgents scripts what agent.list answers. name is the herdr agent name;
// status is its lifecycle state.
func (s *fakeHerd) setAgents(agents ...map[string]any) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.agents = agents
}

func agent(name, status string) map[string]any {
	return map[string]any{"pane_id": "w1:p1", "name": name, "agent_status": status}
}

func (s *fakeHerd) Client(t *testing.T) *client.Client {
	t.Helper()
	c, err := client.New(t.Context(), client.Options{SocketPath: s.path, CallTimeout: 5 * time.Second})
	if err != nil {
		t.Fatalf("client.New: %v", err)
	}
	return c
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

func (s *fakeHerd) serve(conn net.Conn) {
	defer conn.Close()
	line, err := bufio.NewReader(conn).ReadBytes('\n')
	if err != nil {
		return
	}
	var req fakeReq
	if err := json.Unmarshal(line, &req); err != nil {
		return
	}
	s.mu.Lock()
	s.requests = append(s.requests, req)
	agents := s.agents
	removeErr := s.removeErr
	s.mu.Unlock()

	var body []byte
	switch req.Method {
	case client.MethodPing:
		body = okLine(req.ID, map[string]any{"type": "pong", "version": "0.8.0", "protocol": 19})
	case client.MethodAgentList:
		if agents == nil {
			agents = []map[string]any{}
		}
		body = okLine(req.ID, map[string]any{"type": "agent_list", "agents": agents})
	case client.MethodWorktreeRemove:
		var p struct {
			WorkspaceID string `json:"workspace_id"`
		}
		_ = json.Unmarshal(req.Params, &p)
		if removeErr != "" {
			body = errLine(req.ID, client.CodeWorkspaceNotFound, removeErr)
			break
		}
		s.mu.Lock()
		s.removed = append(s.removed, p.WorkspaceID)
		s.mu.Unlock()
		body = okLine(req.ID, map[string]any{
			"type": "worktree_removed", "workspace_id": p.WorkspaceID,
			"path": "/herdr/worktrees/repo/x", "forced": false,
		})
	default:
		body = errLine(req.ID, client.CodeInvalidRequest, "unexpected method "+req.Method)
	}
	w := bufio.NewWriter(conn)
	_, _ = w.Write(append(body, '\n'))
	_ = w.Flush()
}

func (s *fakeHerd) Removed() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string(nil), s.removed...)
}

func (s *fakeHerd) Methods() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []string
	for _, r := range s.requests {
		out = append(out, r.Method)
	}
	return out
}

func okLine(id string, result any) []byte {
	body, _ := json.Marshal(map[string]any{"id": id, "result": result})
	return body
}

func errLine(id, code, message string) []byte {
	body, _ := json.Marshal(map[string]any{
		"id":    id,
		"error": map[string]string{"code": code, "message": message},
	})
	return body
}
