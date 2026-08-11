package client

import (
	"bufio"
	"encoding/json"
	"errors"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

// fakeRequest is a decoded request as the fake server saw it. Params stays raw
// so tests can assert on the exact JSON the client emitted.
type fakeRequest struct {
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

// fakeConnWriter lets a handler push extra lines (push events) after its reply.
type fakeConnWriter struct {
	w  *bufio.Writer
	mu sync.Mutex
}

// writeLine writes one raw protocol line.
func (w *fakeConnWriter) writeLine(line string) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if _, err := w.w.WriteString(line + "\n"); err != nil {
		return err
	}
	return w.w.Flush()
}

// fakeHandler answers one request. Returning an error closes the connection.
// The handler owns everything written on that connection.
type fakeHandler func(t *testing.T, req fakeRequest, w *fakeConnWriter) error

// fakeServer is an in-process unix-socket server that speaks the herdr wire
// protocol. It is deliberately a real listener on a real socket, so the tests
// exercise the production UnixTransport and its newline framing rather than a
// stubbed-out Conn.
type fakeServer struct {
	t        *testing.T
	path     string
	ln       net.Listener
	handler  fakeHandler
	mu       sync.Mutex
	requests []fakeRequest
	wg       sync.WaitGroup
}

// newFakeServer starts a fake herdr server on a temporary socket.
func newFakeServer(t *testing.T, handler fakeHandler) *fakeServer {
	t.Helper()
	// Unix socket paths are length-limited (104 bytes on darwin), so keep the
	// temp dir prefix short rather than using t.TempDir().
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

	s := &fakeServer{t: t, path: path, ln: ln, handler: handler}
	s.wg.Add(1)
	go s.acceptLoop()
	t.Cleanup(s.Close)
	return s
}

// Path returns the socket path clients should dial.
func (s *fakeServer) Path() string { return s.path }

// Requests returns a copy of every request the server has decoded.
func (s *fakeServer) Requests() []fakeRequest {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]fakeRequest(nil), s.requests...)
}

// Close stops the listener and waits for connection goroutines.
func (s *fakeServer) Close() {
	_ = s.ln.Close()
	s.wg.Wait()
}

func (s *fakeServer) acceptLoop() {
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

// serve reads one request, runs the handler, then closes the connection —
// exactly what the real herdr server does for every method except
// events.subscribe, where the handler blocks while it streams.
func (s *fakeServer) serve(conn net.Conn) {
	defer conn.Close()

	line, err := bufio.NewReader(conn).ReadBytes('\n')
	if err != nil {
		return
	}
	var req fakeRequest
	if err := json.Unmarshal(line, &req); err != nil {
		return
	}
	s.mu.Lock()
	s.requests = append(s.requests, req)
	s.mu.Unlock()

	w := &fakeConnWriter{w: bufio.NewWriter(conn)}
	if err := s.handler(s.t, req, w); err != nil && !errors.Is(err, net.ErrClosed) {
		return
	}
}

// respond writes a success envelope wrapping the given result JSON.
func respond(w *fakeConnWriter, id, resultJSON string) error {
	return w.writeLine(`{"id":"` + id + `","result":` + resultJSON + `}`)
}

// respondErr writes an error envelope.
func respondErr(w *fakeConnWriter, id, code, message string) error {
	body, err := json.Marshal(map[string]any{
		"id":    id,
		"error": map[string]string{"code": code, "message": message},
	})
	if err != nil {
		return err
	}
	return w.writeLine(string(body))
}

// pongResult is the captured protocol-19 ping reply.
const pongResult = `{"type":"pong","version":"0.8.0","protocol":19,"capabilities":{"live_handoff":true,"detached_server_daemon":true}}`

// pongResultProtocol builds a ping reply advertising an arbitrary protocol.
func pongResultProtocol(protocol int) string {
	body, _ := json.Marshal(map[string]any{
		"type":     "pong",
		"version":  "0.9.0",
		"protocol": protocol,
	})
	return string(body)
}

// routeHandler dispatches by method, answering ping from the captured fixture
// so every test gets past the protocol handshake for free.
func routeHandler(routes map[string]fakeHandler) fakeHandler {
	return func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
		if h, ok := routes[req.Method]; ok {
			return h(t, req, w)
		}
		if req.Method == MethodPing {
			return respond(w, req.ID, pongResult)
		}
		return respondErr(w, req.ID, CodeInvalidRequest, "unexpected method "+req.Method)
	}
}

// newTestClient starts a fake server with the given routes and returns a
// client connected to it through the production unix transport.
func newTestClient(t *testing.T, routes map[string]fakeHandler) (*Client, *fakeServer) {
	t.Helper()
	return newTestClientOpts(t, routes, Options{})
}

// newTestClientOpts is newTestClient with caller-supplied options; SocketPath
// is always overridden to point at the fake server.
func newTestClientOpts(t *testing.T, routes map[string]fakeHandler, opts Options) (*Client, *fakeServer) {
	t.Helper()
	srv := newFakeServer(t, routeHandler(routes))
	opts.SocketPath = srv.Path()
	c, err := New(t.Context(), opts)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	return c, srv
}

// loadFixture reads a captured protocol payload from testdata.
func loadFixture(t *testing.T, name string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	// Fixtures are stored one JSON document per file with a trailing
	// newline; the wire format is newline-framed, so trim it.
	return strings.TrimSpace(string(data))
}

// loadEventLines reads a captured NDJSON event fixture, dropping the leading
// "#" provenance comments that record which herdr version and which
// subscription list produced it.
func loadEventLines(t *testing.T, name string) []string {
	t.Helper()
	var lines []string
	for _, line := range strings.Split(loadFixture(t, name), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		lines = append(lines, line)
	}
	if len(lines) == 0 {
		t.Fatalf("fixture %s has no event lines", name)
	}
	return lines
}
