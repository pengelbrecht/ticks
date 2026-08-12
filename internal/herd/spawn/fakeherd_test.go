package spawn

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

// A local fake of the herdr socket API. herd/client's and herd/wait's fakes are
// package-internal and must stay that way, so this package builds its own seam.
// It is a real unix listener speaking the real wire protocol, which means these
// tests exercise the production transport rather than a stubbed Conn.
//
// The one protocol fact it has to honour is that herdr answers exactly one
// request per connection and then hangs up: spawn issues five or six calls, so
// the fake must accept that many sequential connections. Push events are not
// modelled — spawn is request/response only.

type fakeReq struct {
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

// handlerFunc returns the complete reply line for one request.
type handlerFunc func(req fakeReq) string

type fakeHerd struct {
	t    *testing.T
	path string
	ln   net.Listener

	mu       sync.Mutex
	requests []fakeReq
	dials    int
	routes   map[string]handlerFunc

	// paneTexts is the scripted pane.read output, consumed in order; the
	// last entry repeats once exhausted.
	paneTexts []string
	paneReads int

	wg sync.WaitGroup
}

func newFakeHerd(t *testing.T) *fakeHerd {
	t.Helper()
	// Unix socket paths are length-limited on darwin; keep the prefix short.
	dir, err := os.MkdirTemp("", "hs")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	path := filepath.Join(dir, "h.sock")
	ln, err := net.Listen("unix", path)
	if err != nil {
		t.Fatalf("listen %s: %v", path, err)
	}
	s := &fakeHerd{t: t, path: path, ln: ln, routes: map[string]handlerFunc{}}
	s.installDefaults()
	s.wg.Add(1)
	go s.acceptLoop()
	t.Cleanup(s.Close)
	return s
}

func (s *fakeHerd) Close() {
	_ = s.ln.Close()
	s.wg.Wait()
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
		s.mu.Lock()
		s.dials++
		s.mu.Unlock()
		s.wg.Add(1)
		go func() {
			defer s.wg.Done()
			s.serve(conn)
		}()
	}
}

// serve answers one request and closes, exactly as herdr does for every method
// spawn uses.
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
	h, ok := s.routes[req.Method]
	s.mu.Unlock()

	var reply string
	if ok {
		reply = h(req)
	} else {
		reply = errLine(req.ID, client.CodeInvalidRequest, "unexpected method "+req.Method)
	}
	w := bufio.NewWriter(conn)
	_, _ = w.WriteString(reply + "\n")
	_ = w.Flush()
}

func (s *fakeHerd) route(method string, h handlerFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.routes[method] = h
}

// setPaneTexts scripts the pane.read replies, one per read in order.
func (s *fakeHerd) setPaneTexts(texts ...string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.paneTexts = texts
}

func (s *fakeHerd) nextPaneText() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.paneTexts) == 0 {
		return ""
	}
	i := s.paneReads
	s.paneReads++
	if i >= len(s.paneTexts) {
		i = len(s.paneTexts) - 1
	}
	return s.paneTexts[i]
}

func (s *fakeHerd) Requests() []fakeReq {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]fakeReq(nil), s.requests...)
}

func (s *fakeHerd) Methods() []string {
	var out []string
	for _, r := range s.Requests() {
		out = append(out, r.Method)
	}
	return out
}

// Dials counts accepted connections. Since the protocol is one request per
// connection, it is also the number of calls made — including the handshake.
func (s *fakeHerd) Dials() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.dials
}

// countMethod reports how many times a method was called.
func (s *fakeHerd) countMethod(method string) int {
	n := 0
	for _, m := range s.Methods() {
		if m == method {
			n++
		}
	}
	return n
}

// installDefaults wires the happy-path replies. Individual tests override one
// route at a time.
func (s *fakeHerd) installDefaults() {
	s.routes[client.MethodPing] = func(req fakeReq) string {
		return resultLine(req.ID, `{"type":"pong","version":"0.8.0","protocol":19}`)
	}
	s.routes[client.MethodWorktreeCreate] = func(req fakeReq) string {
		return resultLine(req.ID, `{"type":"worktree_created",
			"workspace":{"workspace_id":"w7","label":"tick","agent_status":"unknown"},
			"tab":{"tab_id":"w7:t1","workspace_id":"w7"},
			"root_pane":{"pane_id":"w7:p1","workspace_id":"w7","tab_id":"w7:t1","agent_status":"unknown"},
			"worktree":{"path":"/herdr/worktrees/repo/tick-1aw","label":"tick-1aw","branch":"tick/1aw"}}`)
	}
	s.routes[client.MethodAgentStart] = func(req fakeReq) string {
		var p struct {
			Args []string `json:"args"`
			Name string   `json:"name"`
			Kind string   `json:"kind"`
		}
		_ = json.Unmarshal(req.Params, &p)
		argv, _ := json.Marshal(append([]string{p.Kind}, p.Args...))
		return resultLine(req.ID, `{"type":"agent_started","agent":{"pane_id":"w7:p1","agent_status":"idle",
			"name":"`+p.Name+`","interactive_ready":true},"argv":`+string(argv)+`}`)
	}
	s.routes[client.MethodAgentPrompt] = func(req fakeReq) string {
		return resultLine(req.ID, `{"type":"agent_prompted","agent":{"pane_id":"w7:p1","agent_status":"idle",
			"agent_session":{"source":"herdr:claude","agent":"claude","kind":"id","value":"sess-123"}}}`)
	}
	s.routes[client.MethodPaneRead] = func(req fakeReq) string {
		body, _ := json.Marshal(map[string]any{
			"type": "pane_read",
			"read": map[string]any{
				"pane_id": "w7:p1",
				"source":  "recent_unwrapped",
				"format":  "text",
				"text":    s.nextPaneText(),
			},
		})
		return resultLine(req.ID, string(body))
	}
	s.routes[client.MethodAgentGet] = func(req fakeReq) string {
		return resultLine(req.ID, `{"type":"agent_info","agent":{"pane_id":"w7:p1","agent_status":"idle"}}`)
	}
}

func resultLine(id, result string) string {
	// Compact the hand-written result so the reply is a single wire line.
	var v any
	if err := json.Unmarshal([]byte(result), &v); err != nil {
		return errLine(id, "internal", "bad fixture: "+err.Error())
	}
	body, _ := json.Marshal(map[string]any{"id": id, "result": v})
	return string(body)
}

func errLine(id, code, message string) string {
	body, _ := json.Marshal(map[string]any{
		"id":    id,
		"error": map[string]string{"code": code, "message": message},
	})
	return string(body)
}

// paneAfterAnswer is a pane snapshot where the probe echoed and was answered.
func paneAfterAnswer(probe string) string {
	return "  ✻ Welcome to the CLI\n\n> " + probe + "\n\n⏺ OK\n\n❯ \n"
}

// paneUntouched is the silent-drop snapshot: the CLI's banner and an empty
// composer, with no echo of the probe anywhere.
const paneUntouched = "  ✻ Welcome to the CLI\n\n❯ \n"

// paneErrorContent is the green-start trap: the probe echoed, then an error
// instead of an answer.
func paneErrorContent(probe string) string {
	return "> " + probe + "\n\n■ {\"type\":\"error\",\"status\":400,\"error\":{\"message\":\"The 'gpt-5.1-codex' model is not supported\"}}\n"
}
