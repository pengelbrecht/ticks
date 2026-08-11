package cmd

import (
	"bufio"
	"encoding/json"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/reconcile"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// ---------------------------------------------------------------------------
// A minimal fake herdr server for the reconcile command tests.
//
// herd/client's, herd/wait's and herd/reconcile's fakes are package-internal by
// design, so this package builds its own. Like herdr, it answers exactly one
// request per connection; reconcile makes three calls (ping, agent.list,
// session.snapshot) and no live herdr session is ever contacted.
// ---------------------------------------------------------------------------

type reconcileFakeAgent struct {
	name        string
	paneID      string
	workspaceID string
	status      string
	session     string
}

type reconcileFakeHerd struct {
	t    *testing.T
	path string
	ln   net.Listener

	mu         sync.Mutex
	agents     []reconcileFakeAgent
	workspaces []string
	methods    []string

	wg sync.WaitGroup
}

func newReconcileFakeHerd(t *testing.T, workspaces []string, agents ...reconcileFakeAgent) *reconcileFakeHerd {
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
		t.Fatalf("listen: %v", err)
	}
	s := &reconcileFakeHerd{t: t, path: path, ln: ln, agents: agents, workspaces: workspaces}
	s.wg.Add(1)
	go s.acceptLoop()
	t.Cleanup(func() {
		_ = s.ln.Close()
		s.wg.Wait()
	})
	return s
}

func (s *reconcileFakeHerd) acceptLoop() {
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

func (s *reconcileFakeHerd) agentJSON(a reconcileFakeAgent) map[string]any {
	m := map[string]any{
		"terminal_id":  a.paneID,
		"agent_status": a.status,
		"workspace_id": a.workspaceID,
		"tab_id":       a.workspaceID + ":t1",
		"pane_id":      a.paneID,
		"revision":     1,
		"name":         a.name,
	}
	if a.session != "" {
		m["agent_session"] = map[string]any{
			"source": "herdr:claude", "agent": "claude", "kind": "id", "value": a.session,
		}
	}
	return m
}

func (s *reconcileFakeHerd) serve(conn net.Conn) {
	defer conn.Close()
	line, err := bufio.NewReader(conn).ReadBytes('\n')
	if err != nil {
		return
	}
	var req struct {
		ID     string `json:"id"`
		Method string `json:"method"`
	}
	if err := json.Unmarshal(line, &req); err != nil {
		return
	}
	s.mu.Lock()
	s.methods = append(s.methods, req.Method)
	agents := append([]reconcileFakeAgent(nil), s.agents...)
	workspaces := append([]string(nil), s.workspaces...)
	s.mu.Unlock()

	var result any
	switch req.Method {
	case "ping":
		result = map[string]any{"type": "pong", "version": "0.8.0", "protocol": 19}
	case "agent.list":
		listed := make([]map[string]any, 0, len(agents))
		for _, a := range agents {
			listed = append(listed, s.agentJSON(a))
		}
		result = map[string]any{"type": "agent_list", "agents": listed}
	case "session.snapshot":
		all := make([]map[string]any, 0, len(agents))
		for _, a := range agents {
			all = append(all, s.agentJSON(a))
		}
		ws := make([]map[string]any, 0, len(workspaces))
		for i, id := range workspaces {
			ws = append(ws, map[string]any{
				"workspace_id": id, "number": i + 1, "label": id,
				"pane_count": 1, "tab_count": 1, "active_tab_id": id + ":t1",
				"agent_status": "idle",
			})
		}
		result = map[string]any{
			"type": "session_snapshot",
			"snapshot": map[string]any{
				"version": "0.8.0", "protocol": 19,
				"workspaces": ws, "tabs": []any{}, "panes": []any{},
				"agents": all, "layouts": []any{},
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// setupReconcileRepo builds a real git repo (chdir'd into, as the commands
// expect) with one commit, and returns its root and base commit.
func setupReconcileRepo(t *testing.T, runners string) (string, string) {
	t.Helper()
	dir, _ := setupTestRepo(t)
	execTestCmd(t, dir, "git", "commit", "--allow-empty", "-m", "base")
	base := strings.TrimSpace(gitOutput(t, dir, "rev-parse", "HEAD"))

	if runners != "" {
		if err := os.MkdirAll(filepath.Join(dir, ".tick"), 0o755); err != nil {
			t.Fatalf("mkdir .tick: %v", err)
		}
		if err := os.WriteFile(filepath.Join(dir, ".tick", "runners.toml"), []byte(runners), 0o644); err != nil {
			t.Fatalf("write runners.toml: %v", err)
		}
	}
	return dir, base
}

// gitOutput runs one git command in dir and returns its output.
func gitOutput(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, out)
	}
	return string(out)
}

// addReconcileWorktree creates a real worktree on a new branch.
func addReconcileWorktree(t *testing.T, repo, branch, base string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "wt-"+strings.ReplaceAll(branch, "/", "-"))
	execTestCmd(t, repo, "git", "worktree", "add", "-b", branch, path, base)
	return path
}

const reconcileRunners = `version = 1

[orchestrator]
harness = "claude"

[roles.implement]
kind = "claude"
model = "sonnet"
`

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// TestHerdReconcileUnreachableSocket pins that an unreachable herdr is an
// operational failure with an explicit exit code — and that --socket is
// honoured so no live herdr session is ever contacted.
func TestHerdReconcileUnreachableSocket(t *testing.T) {
	setupReconcileRepo(t, reconcileRunners)
	socket := filepath.Join(t.TempDir(), "absent.sock")

	err := ExecuteArgs([]string{"herd", "reconcile", "--socket", socket})
	if err == nil {
		t.Fatal("herd reconcile against an absent socket returned nil error")
	}
	if !strings.Contains(err.Error(), "herdr") {
		t.Errorf("error = %v, want it to name herdr", err)
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d", code, ExitGeneric)
	}
}

// TestHerdReconcilePlanExitsZeroWithUnknowns is the whole command: a live
// worker, a resumable one, a stale one and an unknown in one plan — exit 0,
// because a plan containing unknowns is a successful reconcile.
func TestHerdReconcilePlanExitsZeroWithUnknowns(t *testing.T) {
	repo, base := setupReconcileRepo(t, reconcileRunners)

	liveWT := addReconcileWorktree(t, repo, "tick/aaa", base)
	writeReconcileManifest(t, repo, state.Manifest{
		Tick: "aaa", Epic: "e1", Branch: "tick/aaa", Worktree: liveWT,
		WorkspaceID: "w1", PaneID: "w1:p1", Agent: "tick-aaa", Kind: "claude", Base: base,
	})

	resumeWT := addReconcileWorktree(t, repo, "tick/bbb", base)
	writeReconcileManifest(t, repo, state.Manifest{
		Tick: "bbb", Epic: "e1", Branch: "tick/bbb", Worktree: resumeWT,
		WorkspaceID: "w2", PaneID: "w2:p1", Agent: "tick-bbb", Kind: "claude", Base: base,
		Argv:         []string{"claude", "--permission-mode", "bypassPermissions"},
		AgentSession: &state.AgentSession{Kind: "id", Value: "sess-bbb"},
	})

	staleWT := addReconcileWorktree(t, repo, "tick/ccc", base)
	writeReconcileManifest(t, repo, state.Manifest{
		Tick: "ccc", Epic: "e1", Branch: "tick/ccc", Worktree: staleWT,
		WorkspaceID: "w3", PaneID: "w3:p1", Agent: "tick-ccc", Kind: "claude", Base: base,
	})

	writeReconcileManifest(t, repo, state.Manifest{
		Tick: "ddd", Epic: "e1", Branch: "tick/ddd",
		Worktree: filepath.Join(t.TempDir(), "gone"), WorkspaceID: "w4",
		PaneID: "w4:p1", Agent: "tick-ddd", Kind: "claude", Base: base,
	})

	srv := newReconcileFakeHerd(t, []string{"w1"}, reconcileFakeAgent{
		name: "tick-aaa", paneID: "w1:p1", workspaceID: "w1", status: "working",
	})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "reconcile", "--epic", "e1", "--socket", srv.path, "--json"}); err != nil {
		t.Fatalf("herd reconcile: %v\n%s", err, buf.String())
	}

	var report reconcile.Report
	if err := json.Unmarshal(buf.Bytes(), &report); err != nil {
		t.Fatalf("output is not one JSON document: %v\n%s", err, buf.String())
	}
	byTick := map[string]reconcile.Item{}
	for _, it := range report.Items {
		byTick[it.Tick] = it
	}
	want := map[string]reconcile.Class{
		"aaa": reconcile.ClassLiveWorker,
		"bbb": reconcile.ClassDeadResumable,
		"ccc": reconcile.ClassStaleNoWork,
		"ddd": reconcile.ClassUnknown,
	}
	for tick, class := range want {
		got, ok := byTick[tick]
		if !ok {
			t.Fatalf("tick %s missing from the plan: %+v", tick, report.Items)
		}
		if got.Class != class {
			t.Errorf("tick %s class = %s, want %s (%s)", tick, got.Class, class, got.Reason)
		}
	}
	if byTick["aaa"].Plan.Redispatch {
		t.Error("the live worker's plan proposes a redispatch")
	}
	if got := strings.Join(byTick["bbb"].Plan.Argv, " "); !strings.HasSuffix(got, "--resume sess-bbb") {
		t.Errorf("resume argv = %q, want it to end in --resume sess-bbb", got)
	}
	if len(byTick["ddd"].Plan.ProposedMutations) != 0 {
		t.Errorf("the unknown proposes mutations: %v", byTick["ddd"].Plan.ProposedMutations)
	}
	if report.BranchPrefix != "tick/" {
		t.Errorf("branch prefix = %q, want the default tick/", report.BranchPrefix)
	}
}

// TestHerdReconcileHonoursConfiguredBranchPrefix pins that the prefix comes
// from runners.toml, not from a hardcoded "tick/".
func TestHerdReconcileHonoursConfiguredBranchPrefix(t *testing.T) {
	repo, base := setupReconcileRepo(t, `version = 1

[orchestrator]
harness = "claude"

[orchestration]
worktree_branch_prefix = "wave/"

[roles.implement]
kind = "claude"
model = "sonnet"
`)
	wt := addReconcileWorktree(t, repo, "wave/eee", base)
	writeReconcileManifest(t, repo, state.Manifest{
		Tick: "eee", Epic: "e1", Branch: "wave/eee", Worktree: wt,
		WorkspaceID: "w5", PaneID: "w5:p1", Agent: "tick-eee", Kind: "claude", Base: base,
	})
	srv := newReconcileFakeHerd(t, nil)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "reconcile", "--epic", "e1", "--socket", srv.path, "--json"}); err != nil {
		t.Fatalf("herd reconcile: %v\n%s", err, buf.String())
	}
	var report reconcile.Report
	if err := json.Unmarshal(buf.Bytes(), &report); err != nil {
		t.Fatalf("output is not one JSON document: %v\n%s", err, buf.String())
	}
	if report.BranchPrefix != "wave/" {
		t.Fatalf("branch prefix = %q, want wave/ from the config", report.BranchPrefix)
	}
	if len(report.Items) != 1 || report.Items[0].Class != reconcile.ClassStaleNoWork {
		t.Fatalf("items = %+v, want one stale-no-work (the branch must be visible under its own prefix)", report.Items)
	}
	if !report.Items[0].Evidence.BranchExists {
		t.Error("branch not found under the configured prefix — the prefix was hardcoded somewhere")
	}
}

// TestHerdReconcileAdoptRefreshesOnlyLiveManifests pins that --adopt is the
// only write, and that it is scoped to live, consistent workers.
func TestHerdReconcileAdoptRefreshesOnlyLiveManifests(t *testing.T) {
	repo, base := setupReconcileRepo(t, reconcileRunners)

	liveWT := addReconcileWorktree(t, repo, "tick/fff", base)
	writeReconcileManifest(t, repo, state.Manifest{
		Tick: "fff", Epic: "e1", Branch: "tick/fff", Worktree: liveWT,
		WorkspaceID: "w6", PaneID: "w6:p1", Agent: "tick-fff", Kind: "claude", Base: base,
	})
	staleWT := addReconcileWorktree(t, repo, "tick/ggg", base)
	writeReconcileManifest(t, repo, state.Manifest{
		Tick: "ggg", Epic: "e1", Branch: "tick/ggg", Worktree: staleWT,
		WorkspaceID: "w7", PaneID: "w7:p1", Agent: "tick-ggg", Kind: "claude", Base: base,
	})
	staleBefore, _ := os.ReadFile(state.Path(repo, "e1", "ggg"))

	srv := newReconcileFakeHerd(t, []string{"w6"}, reconcileFakeAgent{
		// A respawn: prefix-matched, and the manifest must learn the new name.
		name: "tick-fff-r2", paneID: "w6:p8", workspaceID: "w6",
		status: "idle", session: "sess-fff",
	})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "reconcile", "--epic", "e1", "--socket", srv.path, "--adopt"}); err != nil {
		t.Fatalf("herd reconcile --adopt: %v\n%s", err, buf.String())
	}

	got, err := state.Read(state.Path(repo, "e1", "fff"))
	if err != nil {
		t.Fatalf("read refreshed manifest: %v", err)
	}
	if got.Agent != "tick-fff-r2" || got.PaneID != "w6:p8" {
		t.Errorf("manifest = %+v, want the respawned agent name and pane", got)
	}
	if got.AgentSession == nil || got.AgentSession.Value != "sess-fff" {
		t.Errorf("manifest session = %+v, want sess-fff", got.AgentSession)
	}

	staleAfter, _ := os.ReadFile(state.Path(repo, "e1", "ggg"))
	if string(staleBefore) != string(staleAfter) {
		t.Error("--adopt rewrote a manifest that is not a live worker's")
	}
	// Git is untouched: both branches are still there.
	for _, branch := range []string{"tick/fff", "tick/ggg"} {
		if out := gitOutput(t, repo, "branch", "--list", branch); strings.TrimSpace(out) == "" {
			t.Errorf("branch %s is gone — reconcile mutated git", branch)
		}
	}
	if !strings.Contains(buf.String(), "adopted") {
		t.Errorf("output does not report the adoption:\n%s", buf.String())
	}
}

// TestHerdReconcileTextOutputNamesTheEvidence pins the human rendering: an
// operator must see the class, the evidence and the proposal without --json.
func TestHerdReconcileTextOutputNamesTheEvidence(t *testing.T) {
	repo, base := setupReconcileRepo(t, reconcileRunners)
	wt := addReconcileWorktree(t, repo, "tick/hhh", base)
	writeReconcileManifest(t, repo, state.Manifest{
		Tick: "hhh", Epic: "e1", Branch: "tick/hhh", Worktree: wt,
		WorkspaceID: "w8", PaneID: "w8:p1", Agent: "tick-hhh", Kind: "claude", Base: base,
	})
	srv := newReconcileFakeHerd(t, nil)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "reconcile", "--epic", "e1", "--socket", srv.path}); err != nil {
		t.Fatalf("herd reconcile: %v\n%s", err, buf.String())
	}
	out := buf.String()
	for _, want := range []string{
		"tick hhh  stale-no-work",
		"branch    tick/hhh (exists, 0 commit(s) beyond base)",
		"propose   herdr worktree remove --workspace w8",
		"propose   git branch -d tick/hhh",
		"stale-no-work=1",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q:\n%s", want, out)
		}
	}
}

// TestHerdReconcileFlagsResetBetweenExecutions pins the ResetFlags contract for
// the flags this command adds.
func TestHerdReconcileFlagsResetBetweenExecutions(t *testing.T) {
	setupReconcileRepo(t, reconcileRunners)
	socket := filepath.Join(t.TempDir(), "absent.sock")

	_ = ExecuteArgs([]string{"herd", "reconcile", "--epic", "e1", "--socket", socket, "--json", "--adopt"})
	_ = ExecuteArgs([]string{"herd", "reconcile", "--socket", socket})

	if herdReconcileEpic != "" {
		t.Errorf("herdReconcileEpic = %q, want it reset", herdReconcileEpic)
	}
	if herdReconcileJSON {
		t.Error("herdReconcileJSON leaked across executions")
	}
	if herdReconcileAdopt {
		t.Error("herdReconcileAdopt leaked across executions")
	}
}

// writeReconcileManifest writes a run-state manifest into a temp repo.
func writeReconcileManifest(t *testing.T, repo string, m state.Manifest) {
	t.Helper()
	if _, err := state.Write(repo, m); err != nil {
		t.Fatalf("write manifest %s: %v", m.Tick, err)
	}
}
