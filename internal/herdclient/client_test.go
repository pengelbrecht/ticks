package herdclient

import (
	"bufio"
	"encoding/json"
	"net"
	"os"
	"path/filepath"
	"testing"
)

// fakeServer is a minimal in-process unix-socket herdr stand-in: one
// connection per request, one line in, one line out. It exists so this
// package's tests do not need internal/herd/herdtest, which retired with the
// rest of the execution machinery — this package only ever needs to prove its
// own three methods decode correctly.
type fakeServer struct {
	t    *testing.T
	path string
	ln   net.Listener
	// handle answers one decoded request, returning the raw JSON line to
	// write back.
	handle func(req request) string
}

func newFakeServer(t *testing.T, handle func(req request) string) *fakeServer {
	t.Helper()
	// A short, top-level temp dir: t.TempDir() nests the test name into the
	// path, which a long test name pushes past the unix socket path limit.
	dir, err := os.MkdirTemp("", "herdclient")
	if err != nil {
		t.Fatalf("MkdirTemp: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })
	path := filepath.Join(dir, "herdr.sock")
	ln, err := net.Listen("unix", path)
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	s := &fakeServer{t: t, path: path, ln: ln, handle: handle}
	t.Cleanup(func() { _ = ln.Close() })
	go s.serve()
	return s
}

func (s *fakeServer) serve() {
	for {
		conn, err := s.ln.Accept()
		if err != nil {
			return
		}
		go func() {
			defer conn.Close()
			line, err := bufio.NewReader(conn).ReadBytes('\n')
			if err != nil {
				return
			}
			var req request
			if err := json.Unmarshal(line, &req); err != nil {
				return
			}
			out := s.handle(req)
			_, _ = conn.Write([]byte(out + "\n"))
		}()
	}
}

func pongLine(id string) string {
	return `{"id":"` + id + `","result":{"type":"pong","version":"0.9.0","protocol":20}}`
}

func TestPingDecodesServerInfo(t *testing.T) {
	srv := newFakeServer(t, func(req request) string { return pongLine(req.ID) })
	c, err := New(t.Context(), Options{SocketPath: srv.path})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	info, err := c.Ping(t.Context())
	if err != nil {
		t.Fatalf("Ping: %v", err)
	}
	if info.Version != "0.9.0" || info.Protocol != 20 {
		t.Fatalf("info = %+v, want version 0.9.0 protocol 20", info)
	}
}

func TestAgentPromptSendsTextAndDecodesStatus(t *testing.T) {
	var gotMethod string
	var gotText string
	srv := newFakeServer(t, func(req request) string {
		if req.Method == MethodPing {
			return pongLine(req.ID)
		}
		gotMethod = req.Method
		params, _ := json.Marshal(req.Params)
		var p AgentPromptParams
		_ = json.Unmarshal(params, &p)
		gotText = p.Text
		return `{"id":"` + req.ID + `","result":{"type":"agent_prompted","agent":{"terminal_id":"t1","agent_status":"working","workspace_id":"w1","tab_id":"tab1","pane_id":"w1:p1"}}}`
	})
	c, err := New(t.Context(), Options{SocketPath: srv.path})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	info, err := c.AgentPrompt(t.Context(), AgentPromptParams{Target: "tick-abc", Text: "use staging"})
	if err != nil {
		t.Fatalf("AgentPrompt: %v", err)
	}
	if gotMethod != MethodAgentPrompt || gotText != "use staging" {
		t.Fatalf("server saw method=%q text=%q", gotMethod, gotText)
	}
	if info.AgentStatus != StatusWorking {
		t.Fatalf("AgentStatus = %q, want working", info.AgentStatus)
	}
}

func TestAgentGetReturnsAPIErrorOnUnknownTarget(t *testing.T) {
	srv := newFakeServer(t, func(req request) string {
		if req.Method == MethodPing {
			return pongLine(req.ID)
		}
		return `{"id":"` + req.ID + `","error":{"code":"agent_not_found","message":"no such agent"}}`
	})
	c, err := New(t.Context(), Options{SocketPath: srv.path})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	_, err = c.AgentGet(t.Context(), "tick-nope")
	if !IsCode(err, CodeAgentNotFound) {
		t.Fatalf("AgentGet err = %v, want CodeAgentNotFound", err)
	}
}
