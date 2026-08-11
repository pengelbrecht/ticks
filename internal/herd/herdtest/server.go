package herdtest

import (
	"bufio"
	"encoding/json"
	"errors"
	"net"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

// Method names, exactly as herdr spells them. They mirror the constants in
// internal/herd/client, which this package cannot import (see doc.go); route
// keys are plain strings, so consumers may pass either spelling.
const (
	MethodPing            = "ping"
	MethodSessionSnapshot = "session.snapshot"
	MethodWorktreeCreate  = "worktree.create"
	MethodWorktreeList    = "worktree.list"
	MethodWorktreeRemove  = "worktree.remove"
	MethodWorkspaceFocus  = "workspace.focus"
	MethodAgentStart      = "agent.start"
	MethodAgentPrompt     = "agent.prompt"
	MethodAgentWait       = "agent.wait"
	MethodAgentList       = "agent.list"
	MethodAgentGet        = "agent.get"
	MethodPaneRead        = "pane.read"
	MethodEventsSubscribe = "events.subscribe"
	MethodEventsWait      = "events.wait"
	// The display-only metadata channel. Both answer a bare `{"type":"ok"}`
	// — the live shape, verified against herdr 0.8.0 — and the fake records
	// every report so a painter's output can be asserted on.
	MethodPaneReportMetadata      = "pane.report_metadata"
	MethodWorkspaceReportMetadata = "workspace.report_metadata"
)

// Error codes this fake produces on its own initiative.
const (
	CodeInvalidRequest    = "invalid_request"
	CodePaneNotFound      = "pane_not_found"
	CodeWorkspaceNotFound = "workspace_not_found"
)

// Request is a decoded request as the fake saw it. Params stays raw so tests
// can assert on the exact JSON the client emitted.
type Request struct {
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

// ConnWriter writes protocol lines on one connection. A handler owns
// everything written on its connection, including any push events it emits
// after its reply.
type ConnWriter struct {
	conn net.Conn
	w    *bufio.Writer
	mu   sync.Mutex
	// after runs once the connection has been closed. It is how a built-in
	// handler schedules a state change for the window between one call's
	// reply and the client's next call.
	after func()
}

// WriteLine writes one raw protocol line.
func (w *ConnWriter) WriteLine(line string) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if _, err := w.w.WriteString(line + "\n"); err != nil {
		return err
	}
	return w.w.Flush()
}

// Handler answers one request. Returning an error abandons the connection.
type Handler func(t *testing.T, req Request, w *ConnWriter) error

// HandlerN is a Handler that also sees n, the 1-based index of this call among
// the calls to the same method. It is how a test scripts a server that answers
// differently the second time — the shape every time-of-check/time-of-use pin
// needs.
type HandlerN func(t *testing.T, req Request, w *ConnWriter, n int) error

// Agent is one agent-bearing pane in the fake session.
type Agent struct {
	// Name is the herdr agent name (the "tick-<id>" the engines match on).
	Name string
	// PaneID is the pane the agent runs in. WorkspaceID defaults to the
	// part before the first ":".
	PaneID string
	// WorkspaceID overrides the workspace derived from PaneID.
	WorkspaceID string
	// Status is the agent_status ("idle", "working", "done", "blocked",
	// "unknown"). Empty means "unknown".
	Status string
	// Session, when set, is the agent_session id herdr reports.
	Session string
	// ListHidden keeps the agent out of agent.list while leaving it in
	// session.snapshot — how herdr looks when a pane is gone but the session
	// identity is still remembered.
	ListHidden bool
	// NoInteractiveReady reports interactive_ready:false for this agent.
	NoInteractiveReady bool
}

// workspaceID is the workspace the agent belongs to.
func (a Agent) workspaceID() string {
	if a.WorkspaceID != "" {
		return a.WorkspaceID
	}
	for i := 0; i < len(a.PaneID); i++ {
		if a.PaneID[i] == ':' {
			return a.PaneID[:i]
		}
	}
	return a.PaneID
}

// Worktree is what worktree.create hands back.
type Worktree struct {
	Path        string
	Label       string
	Branch      string
	WorkspaceID string
	TabID       string
	PaneID      string
}

// Config is the fake's initial state. The zero value is a usable server with
// canonical replies for every modelled method.
type Config struct {
	// Strict serves only ping plus the explicitly supplied Routes; every
	// other method is answered with invalid_request. It is what a test of the
	// client itself wants: nothing is answered by accident.
	Strict bool
	// Handler, when set, answers EVERY request, bypassing routes and the
	// built-ins entirely.
	Handler Handler
	// Version and Protocol are what the ping handshake advertises.
	Version  string
	Protocol int
	// Routes overrides or adds one handler per method.
	Routes map[string]Handler

	// Agents seeds agent.list and session.snapshot.
	Agents []Agent
	// Workspaces are the workspace ids session.snapshot lists.
	Workspaces []string
	// Focused is the focused workspace id session.snapshot reports; empty
	// omits the field.
	Focused string
	// FocusSteal is where focus moves the first time a workspace is removed
	// — herdr moves focus to a neighbour. Empty means focus does not move.
	FocusSteal string

	// Worktree is what worktree.create answers with.
	Worktree Worktree
	// LaunchPending makes agent.start answer with the PENDING launch herdr
	// really returns while it has typed the command into the pane but has not
	// detected the agent yet: `launch_pending: true`,
	// `interactive_ready: false`, `agent_status: unknown`. It is a success,
	// not an error — and prompting that agent fails with agent_not_ready, so a
	// consumer has to sample agent.get until readiness flips.
	LaunchPending bool
	// AgentSession is the agent_session id agent.prompt reports.
	AgentSession string
	// PaneTexts scripts pane.read, one entry per read in order; the last
	// entry repeats once exhausted.
	PaneTexts []string
}

// Server is an in-process herdr server on a real unix socket.
type Server struct {
	t    *testing.T
	path string
	ln   net.Listener
	cfg  Config

	mu       sync.Mutex
	requests []Request
	dials    int
	routes   map[string]Handler
	agents   []Agent
	// agentsAfterFirstList, when non-nil, is what agent.list answers from the
	// SECOND call on — the time-of-check/time-of-use seam: a planning
	// snapshot sees one status, an apply-time re-check another.
	agentsAfterFirstList []Agent
	// listErrAfterFirstList, when set, makes every agent.list after the first
	// fail — herdr going quiet between the snapshot and the re-check.
	listErrAfterFirstList string
	workspaces            []string
	focused               string
	focusSteal            string
	removeErr             string
	removed               []string
	focusCalls            []string
	paneTexts             []string
	paneReads             int
	paneMeta              []MetadataReport
	workspaceMeta         []MetadataReport
	metaErr               string
	lists                 int
	subs                  int
	lastSubs              []Subscription
	streams               []*stream

	afterList func(n int)
	rejectSub func(n int) (index int, ok bool)
	killSub   func(n int) bool

	serverDone chan struct{}
	closeOnce  sync.Once
	wg         sync.WaitGroup
}

// New starts a fake herdr server on a temporary socket and registers its
// shutdown with the test.
func New(t *testing.T, cfg Config) *Server {
	t.Helper()
	if cfg.Version == "" {
		cfg.Version = "0.8.0"
	}
	if cfg.Protocol == 0 {
		cfg.Protocol = defaultProtocol
	}
	if cfg.AgentSession == "" {
		cfg.AgentSession = "sess-123"
	}
	cfg.Worktree = withWorktreeDefaults(cfg.Worktree)

	// Unix socket paths are length-limited (104 bytes on darwin), so keep the
	// temp dir prefix short rather than using t.TempDir().
	dir, err := os.MkdirTemp("", "hd")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	path := filepath.Join(dir, "h.sock")
	ln, err := net.Listen("unix", path)
	if err != nil {
		t.Fatalf("listen %s: %v", path, err)
	}

	s := &Server{
		t:          t,
		path:       path,
		ln:         ln,
		cfg:        cfg,
		routes:     map[string]Handler{},
		agents:     append([]Agent(nil), cfg.Agents...),
		workspaces: append([]string(nil), cfg.Workspaces...),
		focused:    cfg.Focused,
		focusSteal: cfg.FocusSteal,
		paneTexts:  append([]string(nil), cfg.PaneTexts...),
		serverDone: make(chan struct{}),
	}
	for method, h := range cfg.Routes {
		s.routes[method] = h
	}
	s.wg.Add(1)
	go s.acceptLoop()
	t.Cleanup(s.Close)
	return s
}

// Path is the socket path clients dial.
func (s *Server) Path() string { return s.path }

// Close stops the listener, releases every live stream and waits for the
// connection goroutines. It is safe to call more than once.
func (s *Server) Close() {
	s.closeOnce.Do(func() { close(s.serverDone) })
	_ = s.ln.Close()
	s.wg.Wait()
}

// Route replaces the handler for one method. It is the per-test escape hatch:
// everything not routed keeps answering canonically.
func (s *Server) Route(method string, h Handler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.routes[method] = h
}

// RouteN replaces the handler for one method with a call-count-aware one. The
// count is taken from the requests already recorded, so it is 1 on the first
// call to that method.
func (s *Server) RouteN(method string, h HandlerN) {
	s.Route(method, func(t *testing.T, req Request, w *ConnWriter) error {
		return h(t, req, w, s.CountMethod(method))
	})
}

// Builtin returns this fake's canonical handler for a method. A test that
// overrides a route with [Server.Route] uses it to fall through to the normal
// reply once its own scripted deviation is over — the alternative being a
// hand-written reply literal, which is what this package exists to prevent.
func (s *Server) Builtin(method string) Handler {
	s.mu.Lock()
	defer s.mu.Unlock()
	if method == MethodPing {
		return s.handlePing
	}
	h, ok := s.builtin(method)
	if !ok {
		s.t.Fatalf("herdtest: no canonical handler for %s", method)
	}
	return h
}

// Requests returns a copy of every request the server has decoded.
func (s *Server) Requests() []Request {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]Request(nil), s.requests...)
}

// Methods returns the method name of every request, in order.
func (s *Server) Methods() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]string, 0, len(s.requests))
	for _, r := range s.requests {
		out = append(out, r.Method)
	}
	return out
}

// CountMethod reports how many times a method was called.
func (s *Server) CountMethod(method string) int {
	n := 0
	for _, m := range s.Methods() {
		if m == method {
			n++
		}
	}
	return n
}

// Dials counts accepted connections. Since the protocol is one request per
// connection, it is also the number of calls made — the handshake included.
func (s *Server) Dials() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.dials
}

// Lists reports how many agent.list calls the fake has seen.
func (s *Server) Lists() int { return s.CountMethod(MethodAgentList) }

// Subscribes reports how many events.subscribe calls the fake has seen,
// rejected ones included.
func (s *Server) Subscribes() int { return s.CountMethod(MethodEventsSubscribe) }

// SetAgents replaces the modelled session.
func (s *Server) SetAgents(agents ...Agent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.agents = append([]Agent(nil), agents...)
}

// SetAgentsAfterFirstList scripts the time-of-check/time-of-use seam: the
// first agent.list answers with [Server.SetAgents]' session, every later one —
// the apply-time re-checks — answers with this one.
func (s *Server) SetAgentsAfterFirstList(agents ...Agent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.agentsAfterFirstList = append([]Agent(nil), agents...)
}

// SetListErrorAfterFirstList makes every agent.list after the first fail —
// herdr going quiet mid-teardown, which must never read as "safe to remove".
func (s *Server) SetListErrorAfterFirstList(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.listErrAfterFirstList = msg
}

// SetStatus changes an agent's status without announcing it — the state a
// later agent.list or a replaying subscription will report.
func (s *Server) SetStatus(name, status string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.agents {
		if s.agents[i].Name == name {
			s.agents[i].Status = status
			return
		}
	}
	s.t.Errorf("herdtest: SetStatus: no agent %q", name)
}

// RemoveAgent drops an agent from the session, as an exited pane would be.
func (s *Server) RemoveAgent(name string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	kept := s.agents[:0]
	for _, a := range s.agents {
		if a.Name != name {
			kept = append(kept, a)
		}
	}
	s.agents = kept
}

// SetSession scripts the focus model: focused is what session.snapshot
// reports, steal is where focus moves the first time a workspace is removed
// (empty means focus does not move), and workspaces is the id list.
func (s *Server) SetSession(focused, steal string, workspaces ...string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.focused = focused
	s.focusSteal = steal
	s.workspaces = append([]string(nil), workspaces...)
}

// SetRemoveError makes every worktree.remove fail with the given message.
func (s *Server) SetRemoveError(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.removeErr = msg
}

// Removed lists the workspace ids worktree.remove accepted, in order.
func (s *Server) Removed() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string(nil), s.removed...)
}

// FocusCalls lists the workspace ids workspace.focus was called with.
func (s *Server) FocusCalls() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string(nil), s.focusCalls...)
}

// SetPaneTexts scripts the pane.read replies, one per read in order; the last
// entry repeats once exhausted.
func (s *Server) SetPaneTexts(texts ...string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.paneTexts = append([]string(nil), texts...)
	s.paneReads = 0
}

// SetAfterList installs a hook that runs, unlocked and after the connection
// has been closed, once the nth agent.list has been answered. It is how a test
// opens the list-then-subscribe window.
func (s *Server) SetAfterList(fn func(n int)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.afterList = fn
}

// SetRejectSubscribe makes the nth events.subscribe fail with a probe error
// naming the returned subscription index — herdr reports only the first
// invalid subscription, by index.
func (s *Server) SetRejectSubscribe(fn func(n int) (index int, ok bool)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.rejectSub = fn
}

// SetKillSubscribe makes the nth events.subscribe hang up right after the
// subscription_started reply, simulating a broken stream.
func (s *Server) SetKillSubscribe(fn func(n int) bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.killSub = fn
}

func (s *Server) acceptLoop() {
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

// serve reads one request, runs its handler, then closes the connection —
// exactly what herdr does for every method except events.subscribe, whose
// handler blocks while it streams.
func (s *Server) serve(conn net.Conn) {
	line, err := bufio.NewReader(conn).ReadBytes('\n')
	if err != nil {
		_ = conn.Close()
		return
	}
	var req Request
	if err := json.Unmarshal(line, &req); err != nil {
		_ = conn.Close()
		return
	}
	s.mu.Lock()
	s.requests = append(s.requests, req)
	h := s.handlerFor(req.Method)
	s.mu.Unlock()

	w := &ConnWriter{conn: conn, w: bufio.NewWriter(conn)}
	err = h(s.t, req, w)
	_ = conn.Close()
	if err != nil && !errors.Is(err, net.ErrClosed) {
		return
	}
	if w.after != nil {
		w.after()
	}
}

// handlerFor picks the handler for a method. The caller holds s.mu.
func (s *Server) handlerFor(method string) Handler {
	if s.cfg.Handler != nil {
		return s.cfg.Handler
	}
	if h, ok := s.routes[method]; ok {
		return h
	}
	if method == MethodPing {
		return s.handlePing
	}
	if !s.cfg.Strict {
		if h, ok := s.builtin(method); ok {
			return h
		}
	}
	return func(_ *testing.T, req Request, w *ConnWriter) error {
		return RespondErr(w, req.ID, CodeInvalidRequest, "unexpected method "+req.Method)
	}
}

// builtin maps a method to its canonical handler. The caller holds s.mu.
func (s *Server) builtin(method string) (Handler, bool) {
	switch method {
	case MethodAgentList:
		return s.handleAgentList, true
	case MethodSessionSnapshot:
		return s.handleSessionSnapshot, true
	case MethodWorktreeCreate:
		return s.handleWorktreeCreate, true
	case MethodWorktreeRemove:
		return s.handleWorktreeRemove, true
	case MethodWorkspaceFocus:
		return s.handleWorkspaceFocus, true
	case MethodAgentStart:
		return s.handleAgentStart, true
	case MethodAgentPrompt:
		return s.handleAgentPrompt, true
	case MethodAgentGet:
		return s.handleAgentGet, true
	case MethodAgentWait:
		return s.handleAgentWait, true
	case MethodPaneRead:
		return s.handlePaneRead, true
	case MethodEventsSubscribe:
		return s.handleEventsSubscribe, true
	case MethodPaneReportMetadata:
		return s.handlePaneReportMetadata, true
	case MethodWorkspaceReportMetadata:
		return s.handleWorkspaceReportMetadata, true
	}
	return nil, false
}

// waitFor polls fn until it reports true or the deadline elapses.
func (s *Server) waitFor(what string, fn func() bool) {
	s.t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if fn() {
			return
		}
		time.Sleep(time.Millisecond)
	}
	s.t.Fatalf("herdtest: timed out waiting for %s", what)
}
