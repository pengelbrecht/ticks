package cmd

import (
	"bufio"
	"bytes"
	"encoding/json"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/spawn"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// ---------------------------------------------------------------------------
// A minimal fake herdr server for the command tests.
//
// herd/client's and herd/wait's fakes are package-internal by design, so this
// package builds its own. It is a real unix listener speaking the real wire
// protocol and, like herdr, answers exactly one request per connection — spawn
// makes five or six sequential calls. No events: spawn is request/response only.
// ---------------------------------------------------------------------------

type spawnFakeHerd struct {
	t    *testing.T
	path string
	ln   net.Listener

	mu       sync.Mutex
	methods  []string
	dials    int
	paneText string

	wg sync.WaitGroup
}

func newSpawnFakeHerd(t *testing.T) *spawnFakeHerd {
	t.Helper()
	// Unix socket paths are length-limited on darwin; keep the prefix short.
	dir, err := os.MkdirTemp("", "hx")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	path := filepath.Join(dir, "h.sock")
	ln, err := net.Listen("unix", path)
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	s := &spawnFakeHerd{
		t: t, path: path, ln: ln,
		paneText: "> " + spawn.DefaultGateProbe + "\n\n⏺ OK\n",
	}
	s.wg.Add(1)
	go s.acceptLoop()
	t.Cleanup(func() {
		_ = s.ln.Close()
		s.wg.Wait()
	})
	return s
}

func (s *spawnFakeHerd) acceptLoop() {
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

func (s *spawnFakeHerd) serve(conn net.Conn) {
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
	paneText := s.paneText
	s.mu.Unlock()

	var result any
	switch req.Method {
	case "ping":
		result = map[string]any{"type": "pong", "version": "0.8.0", "protocol": 19}
	case "worktree.create":
		result = map[string]any{
			"type":      "worktree_created",
			"workspace": map[string]any{"workspace_id": "w7"},
			"tab":       map[string]any{"tab_id": "w7:t1"},
			"root_pane": map[string]any{"pane_id": "w7:p1"},
			"worktree":  map[string]any{"path": "/herdr/worktrees/repo/tick-a1w"},
		}
	case "agent.start":
		var p struct {
			Args []string `json:"args"`
			Kind string   `json:"kind"`
		}
		_ = json.Unmarshal(req.Params, &p)
		result = map[string]any{
			"type": "agent_started",
			"agent": map[string]any{
				"pane_id":           "w7:p1",
				"agent_status":      "idle",
				"interactive_ready": true,
			},
			"argv": append([]string{p.Kind}, p.Args...),
		}
	case "agent.get":
		result = map[string]any{
			"type":  "agent_info",
			"agent": map[string]any{"pane_id": "w7:p1", "agent_status": "idle"},
		}
	case "agent.prompt":
		result = map[string]any{
			"type": "agent_prompted",
			"agent": map[string]any{
				"pane_id":      "w7:p1",
				"agent_status": "idle",
				"agent_session": map[string]any{
					"source": "herdr:claude", "agent": "claude",
					"kind": "id", "value": "sess-abc",
				},
			},
		}
	case "pane.read":
		result = map[string]any{
			"type": "pane_read",
			"read": map[string]any{"pane_id": "w7:p1", "source": "recent_unwrapped", "text": paneText},
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

func (s *spawnFakeHerd) Dials() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.dials
}

func (s *spawnFakeHerd) Methods() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string(nil), s.methods...)
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// setupSpawnRepo builds a git repo with one commit, an epic, a child tick and
// the given runners.toml body (empty writes no file).
func setupSpawnRepo(t *testing.T, runners string) (string, *tick.Store) {
	t.Helper()
	dir, store := setupTestRepo(t)
	// herd spawn records the repo's HEAD as the worker's base, so the repo
	// needs a commit.
	execTestCmd(t, dir, "git", "commit", "--allow-empty", "-m", "base")

	epic := makeTestEpic("gy1")
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	task := makeTestTask("a1w")
	task.Parent = epic.ID
	task.Description = "deliver the spawn command"
	task.AcceptanceCriteria = "go test green"
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if runners != "" {
		if err := os.MkdirAll(filepath.Join(dir, ".tick"), 0o755); err != nil {
			t.Fatalf("mkdir .tick: %v", err)
		}
		if err := os.WriteFile(filepath.Join(dir, ".tick", "runners.toml"), []byte(runners), 0o644); err != nil {
			t.Fatalf("write runners.toml: %v", err)
		}
	}
	return dir, store
}

const validRunners = `version = 1

[orchestrator]
harness = "claude"

[roles.implement]
kind = "claude"
model = "sonnet"
`

// captureCmdOutput redirects the cobra command output for one test.
func captureCmdOutput(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	rootCmd.SetOut(&buf)
	rootCmd.SetErr(&buf)
	t.Cleanup(func() {
		rootCmd.SetOut(nil)
		rootCmd.SetErr(nil)
	})
	return &buf
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// TestHerdSpawnRequiresTickID pins the usage gate.
func TestHerdSpawnRequiresTickID(t *testing.T) {
	err := ExecuteArgs([]string{"herd", "spawn"})
	if err == nil {
		t.Fatal("herd spawn with no tick id returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

// TestHerdSpawnUnknownTick pins that an id nobody tracks is a not-found error
// and never reaches herdr.
func TestHerdSpawnUnknownTick(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)

	err := ExecuteArgs([]string{"herd", "spawn", "zzz", "--socket", srv.path})
	if err == nil {
		t.Fatal("herd spawn on an unknown tick returned nil error")
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Errorf("exit code = %d, want %d (not found): %v", code, ExitNotFound, err)
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0 — an unknown tick must not touch herdr", srv.Dials())
	}
}

// TestHerdSpawnRefusalMakesNoDials pins the fail-closed contract: an impossible
// kind/model cell is refused with the config package's own message, before any
// herdr connection, so no half-made workspace is left behind.
func TestHerdSpawnRefusalMakesNoDials(t *testing.T) {
	setupSpawnRepo(t, `version = 1

[orchestrator]
harness = "claude"

[roles.implement]
kind = "claude"
model = "gpt-5.6-luna"
`)
	srv := newSpawnFakeHerd(t)

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.path})
	if err == nil {
		t.Fatal("herd spawn with an impossible kind/model returned nil error")
	}
	msg := err.Error()
	for _, want := range []string{"roles.implement", `kind = "claude"`, `model = "gpt-5.6-luna"`} {
		if !strings.Contains(msg, want) {
			t.Errorf("refusal message %q missing %q — the message is the contract", msg, want)
		}
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0 — a refusal must cost zero herdr calls", srv.Dials())
	}
}

// TestHerdSpawnInvalidConfigIsAStop pins that a config that does not validate
// is never silently replaced by defaults.
func TestHerdSpawnInvalidConfigIsAStop(t *testing.T) {
	setupSpawnRepo(t, `version = 1

[roles.implement]
kind = "claude"
bogus_key = true
`)
	srv := newSpawnFakeHerd(t)

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.path})
	if err == nil {
		t.Fatal("herd spawn with an invalid runners.toml returned nil error")
	}
	if !strings.Contains(err.Error(), "runners.toml") {
		t.Errorf("error = %v, want it to name the config file", err)
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0", srv.Dials())
	}
}

// TestHerdSpawnMissingConfigNamesTheFix pins that a repo with no runners.toml
// gets a message pointing at [roles.implement] rather than a nil-map panic.
func TestHerdSpawnMissingConfigNamesTheFix(t *testing.T) {
	setupSpawnRepo(t, "")
	srv := newSpawnFakeHerd(t)

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.path})
	if err == nil {
		t.Fatal("herd spawn without runners.toml returned nil error")
	}
	if !strings.Contains(err.Error(), "roles.implement") {
		t.Errorf("error = %v, want it to name [roles.implement]", err)
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0", srv.Dials())
	}
}

// TestHerdSpawnEndToEnd is the whole command against the fake server:
// worktree → start → gate → implementer prompt → manifest + note line.
func TestHerdSpawnEndToEnd(t *testing.T) {
	repo, _ := setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.path}); err != nil {
		t.Fatalf("herd spawn: %v\noutput:\n%s", err, buf.String())
	}

	// The full spawn sequence, gate included.
	want := "ping,worktree.create,agent.start,agent.prompt,pane.read,agent.prompt"
	if got := strings.Join(srv.Methods(), ","); got != want {
		t.Errorf("herdr calls = %s, want %s", got, want)
	}

	out := buf.String()
	noteIdx := strings.Index(out, "runner-state: ")
	if noteIdx < 0 {
		t.Fatalf("output has no runner-state: note line:\n%s", out)
	}
	note := strings.TrimSpace(out[noteIdx:])
	for _, w := range []string{
		"substrate=herdr", "kind=claude", "branch=tick/a1w",
		"worktree=/herdr/worktrees/repo/tick-a1w", "workspace=w7",
		"agent=tick-a1w", "session=sess-abc",
	} {
		if !strings.Contains(note, w) {
			t.Errorf("note %q missing %q", note, w)
		}
	}

	// The manifest lands at exactly one path, under the epic.
	path := filepath.Join(repo, ".tick", "logs", "herd", "gy1", "a1w.json")
	m, err := state.Read(path)
	if err != nil {
		t.Fatalf("read manifest %s: %v", path, err)
	}
	if m.Tick != "a1w" || m.Epic != "gy1" || m.Branch != "tick/a1w" || m.Kind != "claude" || m.Model != "sonnet" {
		t.Errorf("manifest = %+v, want the resolved routing", m)
	}
	if m.Agent != "tick-a1w" || m.PaneID != "w7:p1" || m.WorkspaceID != "w7" {
		t.Errorf("manifest identifiers = %+v, want them read off the responses", m)
	}
	if m.AgentSession == nil || m.AgentSession.Value != "sess-abc" {
		t.Errorf("manifest agent_session = %+v, want the id captured after the gate", m.AgentSession)
	}
	if m.Base == "" {
		t.Error("manifest base is empty, want the repo HEAD it branched from")
	}
	if strings.Join(m.Argv, " ") != "claude --permission-mode bypassPermissions --model sonnet" {
		t.Errorf("manifest argv = %v, want the argv herdr echoed", m.Argv)
	}
	if m.GateAttempts != 1 {
		t.Errorf("manifest gate_attempts = %d, want 1", m.GateAttempts)
	}

	// Nothing else under .tick/logs/ — the manifest is the only write.
	entries, err := os.ReadDir(filepath.Dir(path))
	if err != nil {
		t.Fatalf("readdir: %v", err)
	}
	if len(entries) != 1 {
		t.Errorf("manifest directory holds %d entries, want 1 (no temp leftovers)", len(entries))
	}
}

// TestHerdSpawnJSONOutput pins the machine-readable shape the orchestrator
// consumes, including the note it must pass to tk note itself.
func TestHerdSpawnJSONOutput(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.path, "--json"}); err != nil {
		t.Fatalf("herd spawn --json: %v\n%s", err, buf.String())
	}

	var doc struct {
		Manifest     state.Manifest `json:"manifest"`
		ManifestPath string         `json:"manifest_path"`
		Note         string         `json:"note"`
		PromptWaited bool           `json:"prompt_waited"`
	}
	if err := json.Unmarshal(buf.Bytes(), &doc); err != nil {
		t.Fatalf("output is not one JSON document: %v\n%s", err, buf.String())
	}
	if doc.Manifest.Tick != "a1w" {
		t.Errorf("manifest.tick = %q, want a1w", doc.Manifest.Tick)
	}
	if !strings.HasPrefix(doc.Note, "runner-state: ") {
		t.Errorf("note = %q, want the runner-state: prefix", doc.Note)
	}
	if !strings.HasSuffix(filepath.ToSlash(doc.ManifestPath), ".tick/logs/herd/gy1/a1w.json") {
		t.Errorf("manifest_path = %q, want the documented path", doc.ManifestPath)
	}
	if doc.PromptWaited {
		t.Error("prompt_waited = true, want a non-blocking dispatch by default")
	}
}

// TestHerdSpawnGateFailureLeavesNoManifest pins that a worker that failed its
// content gate is not recorded as a live worker — and that the pane excerpt
// reaches the operator.
func TestHerdSpawnGateFailureLeavesNoManifest(t *testing.T) {
	repo, _ := setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)
	srv.paneText = "> " + spawn.DefaultGateProbe + "\n\n■ error 400: model not supported\n"

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.path})
	if err == nil {
		t.Fatal("herd spawn past a failed gate returned nil error")
	}
	if !strings.Contains(err.Error(), "model not supported") {
		t.Errorf("error = %v, want the pane excerpt", err)
	}
	if _, statErr := os.Stat(filepath.Join(repo, ".tick", "logs", "herd", "gy1", "a1w.json")); statErr == nil {
		t.Error("a manifest was written for a worker that never passed its gate")
	}
}

// TestHerdSpawnRejectsNonPositiveTimeouts pins that there is no unbounded call.
func TestHerdSpawnRejectsNonPositiveTimeouts(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	for _, flag := range []string{"--startup-timeout", "--gate-timeout", "--prompt-timeout"} {
		err := ExecuteArgs([]string{"herd", "spawn", "a1w", flag, "0"})
		if err == nil {
			t.Fatalf("herd spawn %s 0 returned nil error", flag)
		}
		if code := GetExitCode(err); code != ExitUsage {
			t.Errorf("%s: exit code = %d, want %d", flag, code, ExitUsage)
		}
	}
}

// TestHerdSpawnFlagsResetBetweenExecutions pins the ResetFlags contract for the
// flags this command adds.
func TestHerdSpawnFlagsResetBetweenExecutions(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)

	_ = ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.path, "--json", "--tier", "strong", "--wait"})
	_ = ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.path})

	if herdSpawnJSON {
		t.Error("herdSpawnJSON leaked across executions")
	}
	if herdSpawnWait {
		t.Error("herdSpawnWait leaked across executions")
	}
	if herdSpawnTier != "" {
		t.Errorf("herdSpawnTier = %q, want it reset", herdSpawnTier)
	}
	if herdSpawnRole != "implement" {
		t.Errorf("herdSpawnRole = %q, want the default restored", herdSpawnRole)
	}
}
