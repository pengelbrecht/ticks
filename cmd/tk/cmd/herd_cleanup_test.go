package cmd

import (
	"bufio"
	"encoding/json"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/cleanup"
)

// ---------------------------------------------------------------------------
// A minimal fake herdr server for the cleanup command tests.
//
// herd/client's, herd/wait's and herd/cleanup's fakes are package-internal by
// design, so this package builds its own. It is a real unix listener speaking
// the real wire protocol and, like herdr, answers exactly one request per
// connection: cleanup makes one agent.list plus one worktree.remove per applied
// plan.
// ---------------------------------------------------------------------------

type cleanupFakeHerd struct {
	t    *testing.T
	path string
	ln   net.Listener

	mu        sync.Mutex
	agents    []map[string]any
	removed   []string
	removeErr string

	wg sync.WaitGroup
}

func newCleanupFakeHerd(t *testing.T) *cleanupFakeHerd {
	t.Helper()
	// Unix socket paths are length-limited on darwin; keep the prefix short.
	dir, err := os.MkdirTemp("", "hk")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })

	path := filepath.Join(dir, "h.sock")
	ln, err := net.Listen("unix", path)
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	s := &cleanupFakeHerd{t: t, path: path, ln: ln}
	s.wg.Add(1)
	go s.acceptLoop()
	t.Cleanup(func() {
		_ = s.ln.Close()
		s.wg.Wait()
	})
	return s
}

func (s *cleanupFakeHerd) setAgents(agents ...map[string]any) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.agents = agents
}

func cleanupAgent(name, status string) map[string]any {
	return map[string]any{"pane_id": "w1:p1", "name": name, "agent_status": status}
}

func (s *cleanupFakeHerd) acceptLoop() {
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

func (s *cleanupFakeHerd) serve(conn net.Conn) {
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
	agents := s.agents
	removeErr := s.removeErr
	s.mu.Unlock()

	var body []byte
	switch req.Method {
	case "ping":
		body, _ = json.Marshal(map[string]any{"id": req.ID, "result": map[string]any{
			"type": "pong", "version": "0.8.0", "protocol": 19}})
	case "agent.list":
		if agents == nil {
			agents = []map[string]any{}
		}
		body, _ = json.Marshal(map[string]any{"id": req.ID, "result": map[string]any{
			"type": "agent_list", "agents": agents}})
	case "worktree.remove":
		var p struct {
			WorkspaceID string `json:"workspace_id"`
			Force       bool   `json:"force"`
		}
		_ = json.Unmarshal(req.Params, &p)
		if p.Force {
			s.t.Error("cleanup passed force:true to worktree.remove — it must never force")
		}
		if removeErr != "" {
			body, _ = json.Marshal(map[string]any{"id": req.ID,
				"error": map[string]string{"code": "workspace_not_found", "message": removeErr}})
			break
		}
		s.mu.Lock()
		s.removed = append(s.removed, p.WorkspaceID)
		s.mu.Unlock()
		body, _ = json.Marshal(map[string]any{"id": req.ID, "result": map[string]any{
			"type": "worktree_removed", "workspace_id": p.WorkspaceID, "path": "/wt", "forced": false}})
	default:
		body, _ = json.Marshal(map[string]any{"id": req.ID,
			"error": map[string]string{"code": "invalid_request", "message": "unexpected " + req.Method}})
	}
	w := bufio.NewWriter(conn)
	_, _ = w.Write(append(body, '\n'))
	_ = w.Flush()
}

func (s *cleanupFakeHerd) Removed() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string(nil), s.removed...)
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type cleanupDoc struct {
	Mode    string         `json:"mode"`
	Plans   []cleanup.Plan `json:"plans"`
	Summary struct {
		Total   int  `json:"total"`
		Clean   int  `json:"clean"`
		Refused int  `json:"refused"`
		Failed  int  `json:"failed"`
		OK      bool `json:"ok"`
	} `json:"summary"`
}

func decodeCleanupJSON(t *testing.T, out string) cleanupDoc {
	t.Helper()
	var doc cleanupDoc
	if err := json.Unmarshal([]byte(out), &doc); err != nil {
		t.Fatalf("output is not one JSON document: %v\n%s", err, out)
	}
	return doc
}

// setupCleanupTick makes a repo with a worker branch (merged or not) and its
// manifest, and returns the repo, the manifest path and the fake herdr.
func setupCleanupTick(t *testing.T, merged bool) (repo, manifestPath string, srv *cleanupFakeHerd) {
	t.Helper()
	repo, base := setupHerdRepo(t)
	herdWorkerBranch(t, repo, "tick/nhk", base, map[string]string{"a.go": "package a\n"})
	if merged {
		execTestCmd(t, repo, "git", "merge", "--no-ff", "-m", "merge tick/nhk", "tick/nhk")
	}
	wt := herdWorktree(t, "nhk", "STATUS: DONE\n")
	manifestPath = herdManifest(t, repo, herdBaseManifest("nhk", "gyz", "tick/nhk", base, wt))
	return repo, manifestPath, newCleanupFakeHerd(t)
}

func branchStillThere(t *testing.T, repo, branch string) bool {
	t.Helper()
	return strings.Contains(herdGitOut(t, repo, "branch", "--list", branch), branch)
}

// ---------------------------------------------------------------------------
// Preview / apply
// ---------------------------------------------------------------------------

// TestHerdCleanupPreviewIsTheDefaultAndTouchesNothing pins that a bare
// invocation cannot destroy anything.
func TestHerdCleanupPreviewIsTheDefaultAndTouchesNothing(t *testing.T) {
	repo, manifestPath, srv := setupCleanupTick(t, true)
	buf, _ := captureHerdOutput(t)

	if err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.path, "--json"}); err != nil {
		t.Fatalf("herd cleanup: %v\n%s", err, buf.String())
	}
	doc := decodeCleanupJSON(t, buf.String())
	if doc.Mode != "preview" {
		t.Errorf("mode = %q, want preview by default", doc.Mode)
	}
	if len(srv.Removed()) != 0 {
		t.Errorf("preview removed workspaces %v", srv.Removed())
	}
	if !branchStillThere(t, repo, "tick/nhk") {
		t.Error("preview deleted the branch")
	}
	if _, err := os.Stat(manifestPath); err != nil {
		t.Errorf("preview removed the manifest: %v", err)
	}
}

// TestHerdCleanupPreviewListsWhatApplyRemoves is the promise: the preview's
// steps are the apply's steps, and after the apply all three are gone.
func TestHerdCleanupPreviewListsWhatApplyRemoves(t *testing.T) {
	repo, manifestPath, srv := setupCleanupTick(t, true)

	previewBuf, _ := captureHerdOutput(t)
	if err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.path, "--preview", "--json"}); err != nil {
		t.Fatalf("preview: %v", err)
	}
	preview := decodeCleanupJSON(t, previewBuf.String())
	previewBuf.Reset()

	applyBuf, _ := captureHerdOutput(t)
	if err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.path, "--apply", "--json"}); err != nil {
		t.Fatalf("apply: %v\n%s", err, applyBuf.String())
	}
	applied := decodeCleanupJSON(t, applyBuf.String())

	if applied.Mode != "apply" {
		t.Errorf("mode = %q, want apply", applied.Mode)
	}
	if len(preview.Plans[0].Steps) != 3 {
		t.Fatalf("preview steps = %+v, want three", preview.Plans[0].Steps)
	}
	for i, s := range preview.Plans[0].Steps {
		got := applied.Plans[0].Steps[i]
		if s.Action != got.Action || s.Target != got.Target {
			t.Errorf("step %d: previewed %s:%s, applied %s:%s", i, s.Action, s.Target, got.Action, got.Target)
		}
	}
	// The last step is the manifest — the ordering rule, visible in the plan.
	if last := preview.Plans[0].Steps[2]; last.Action != cleanup.RemoveManifest {
		t.Errorf("last step = %s, want %s", last.Action, cleanup.RemoveManifest)
	}

	if got := srv.Removed(); len(got) != 1 || got[0] != "w-nhk" {
		t.Errorf("removed workspaces = %v, want [w-nhk]", got)
	}
	if branchStillThere(t, repo, "tick/nhk") {
		t.Error("apply left the branch behind")
	}
	if _, err := os.Stat(manifestPath); !os.IsNotExist(err) {
		t.Errorf("apply left the manifest behind: %v", err)
	}
}

// TestHerdCleanupApplyKeepsManifestWhenAStepFails pins the ordering rule end to
// end: a half-cleaned tick stays visible to the next reconcile.
func TestHerdCleanupApplyKeepsManifestWhenAStepFails(t *testing.T) {
	repo, manifestPath, srv := setupCleanupTick(t, true)
	srv.removeErr = "no such workspace"
	buf, _ := captureHerdOutput(t)

	err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.path, "--apply", "--json"})
	if err == nil {
		t.Fatal("a failed removal exited 0")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d", code, ExitGeneric)
	}
	doc := decodeCleanupJSON(t, buf.String())
	if doc.Summary.Failed != 1 {
		t.Errorf("summary = %+v, want one failure", doc.Summary)
	}
	if _, statErr := os.Stat(manifestPath); statErr != nil {
		t.Errorf("a failed teardown removed the manifest anyway: %v", statErr)
	}
	if !branchStillThere(t, repo, "tick/nhk") {
		t.Error("apply continued past a failed step and deleted the branch")
	}
}

func TestHerdCleanupPreviewAndApplyAreMutuallyExclusive(t *testing.T) {
	_, _, srv := setupCleanupTick(t, true)
	err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.path, "--preview", "--apply"})
	if err == nil {
		t.Fatal("--preview --apply together returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
	}
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

func TestHerdCleanupRefusals(t *testing.T) {
	cases := []struct {
		name   string
		merged bool
		agents []map[string]any
		reason cleanup.Reason
	}{
		{"unmerged branch", false, nil, cleanup.UnmergedBranch},
		{"live worker", true, []map[string]any{cleanupAgent("tick-nhk", "working")}, cleanup.LiveWorker},
		{"respawned worker", true, []map[string]any{cleanupAgent("tick-nhk-r2", "idle")}, cleanup.LiveWorker},
		{"blocked worker", true, []map[string]any{cleanupAgent("tick-nhk", "blocked")}, cleanup.BlockedWorker},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			repo, manifestPath, srv := setupCleanupTick(t, c.merged)
			srv.setAgents(c.agents...)
			buf, _ := captureHerdOutput(t)

			err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.path, "--apply", "--json"})
			if err == nil {
				t.Fatal("a refusal exited 0")
			}
			if code := GetExitCode(err); code != ExitGeneric {
				t.Errorf("exit code = %d, want %d", code, ExitGeneric)
			}
			doc := decodeCleanupJSON(t, buf.String())
			p := doc.Plans[0]
			if !p.Refused || p.Reason != c.reason {
				t.Fatalf("plan = %+v, want a %s refusal", p, c.reason)
			}
			if len(p.Steps) != 0 {
				t.Errorf("a refused plan carries steps: %+v", p.Steps)
			}
			// Nothing was touched, in any of the three places.
			if len(srv.Removed()) != 0 {
				t.Errorf("a refusal removed workspaces %v", srv.Removed())
			}
			if !branchStillThere(t, repo, "tick/nhk") {
				t.Error("a refusal deleted the branch")
			}
			if _, statErr := os.Stat(manifestPath); statErr != nil {
				t.Errorf("a refusal removed the manifest: %v", statErr)
			}
		})
	}
}

func TestHerdCleanupMissingManifestIsNotFound(t *testing.T) {
	setupHerdRepo(t)
	srv := newCleanupFakeHerd(t)
	err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.path, "--apply"})
	if err == nil {
		t.Fatal("cleanup with no manifest returned nil error")
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Errorf("exit code = %d, want %d (not found): %v", code, ExitNotFound, err)
	}
	if len(srv.Removed()) != 0 {
		t.Errorf("cleanup without state removed %v", srv.Removed())
	}
}

func TestHerdCleanupNoArgsWithoutEpicIsUsage(t *testing.T) {
	setupHerdRepo(t)
	err := ExecuteArgs([]string{"herd", "cleanup"})
	if err == nil {
		t.Fatal("cleanup with neither a tick id nor --epic returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
	}
}

// TestHerdCleanupWholeEpicRefusalIsPerTick pins that one live worker does not
// strand the rest of a wave.
func TestHerdCleanupWholeEpicRefusalIsPerTick(t *testing.T) {
	repo, base := setupHerdRepo(t)
	for _, id := range []string{"aaa", "bbb"} {
		herdWorkerBranch(t, repo, "tick/"+id, base, map[string]string{id + ".go": "package a\n"})
		execTestCmd(t, repo, "git", "merge", "--no-ff", "-m", "merge "+id, "tick/"+id)
		herdManifest(t, repo, herdBaseManifest(id, "gyz", "tick/"+id, base,
			herdWorktree(t, id, "STATUS: DONE\n")))
	}
	srv := newCleanupFakeHerd(t)
	srv.setAgents(cleanupAgent("tick-aaa", "idle"))
	buf, _ := captureHerdOutput(t)

	err := ExecuteArgs([]string{"herd", "cleanup", "--epic", "gyz", "--socket", srv.path, "--apply", "--json"})
	if err == nil {
		t.Fatal("a wave with a live worker exited 0")
	}
	doc := decodeCleanupJSON(t, buf.String())
	if doc.Summary.Total != 2 || doc.Summary.Refused != 1 || doc.Summary.Clean != 1 {
		t.Errorf("summary = %+v, want 2 total / 1 refused / 1 clean", doc.Summary)
	}
	if got := srv.Removed(); len(got) != 1 || got[0] != "w-bbb" {
		t.Errorf("removed = %v, want only the clean tick's workspace", got)
	}
	if !branchStillThere(t, repo, "tick/aaa") {
		t.Error("the live worker's branch was deleted")
	}
	if branchStillThere(t, repo, "tick/bbb") {
		t.Error("the clean tick's branch survived")
	}
}

// TestHerdCleanupHelpNamesTheCheckoutWorkspaceDuty pins that the one piece of
// cleanup this command does NOT do is stated where an operator will see it.
func TestHerdCleanupHelpNamesTheCheckoutWorkspaceDuty(t *testing.T) {
	long := herdCleanupCmd.Long
	for _, want := range []string{"checkout workspace", "herdr workspace close"} {
		if !strings.Contains(long, want) {
			t.Errorf("cleanup help does not mention %q", want)
		}
	}
}

// TestHerdCleanupFlagsResetBetweenExecutions pins the ResetFlags contract.
func TestHerdCleanupFlagsResetBetweenExecutions(t *testing.T) {
	_, _, srv := setupCleanupTick(t, true)
	_ = ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.path, "--epic", "gyz", "--json", "--apply"})
	_ = ExecuteArgs([]string{"herd", "cleanup", "nhk"})
	if herdCleanupJSON || herdCleanupApply || herdCleanupPreview {
		t.Error("a cleanup bool flag leaked across executions")
	}
	if herdCleanupEpic != "" || herdCleanupSocket != "" {
		t.Errorf("epic = %q, socket = %q, want both reset", herdCleanupEpic, herdCleanupSocket)
	}
}
