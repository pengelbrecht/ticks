package cmd

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/cleanup"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
)

// ---------------------------------------------------------------------------
// The fake herdr server is internal/herd/herdtest — one canonical fake for the
// whole repo, a real unix listener speaking the real wire protocol. Like herdr
// it answers exactly one request per connection: cleanup makes one agent.list
// plus one worktree.remove per applied plan.
// ---------------------------------------------------------------------------

// newCleanupFakeHerd starts the canonical fake and adds the one assertion that
// belongs to this command rather than to the protocol: cleanup must never pass
// force:true to worktree.remove. The route wraps the canonical handler, so the
// reply itself still comes from herdtest.
func newCleanupFakeHerd(t *testing.T) *herdtest.Server {
	t.Helper()
	srv := herdtest.New(t, herdtest.Config{})
	remove := srv.Builtin(herdtest.MethodWorktreeRemove)
	srv.Route(herdtest.MethodWorktreeRemove, func(t *testing.T, req herdtest.Request, w *herdtest.ConnWriter) error {
		var p struct {
			Force bool `json:"force"`
		}
		_ = json.Unmarshal(req.Params, &p)
		if p.Force {
			t.Error("cleanup passed force:true to worktree.remove — it must never force")
		}
		return remove(t, req, w)
	})
	return srv
}

func cleanupAgent(name, status string) herdtest.Agent {
	return herdtest.Agent{PaneID: "w1:p1", Name: name, Status: status}
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
func setupCleanupTick(t *testing.T, merged bool) (repo, manifestPath string, srv *herdtest.Server) {
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

	if err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.Path(), "--json"}); err != nil {
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
	if err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.Path(), "--preview", "--json"}); err != nil {
		t.Fatalf("preview: %v", err)
	}
	preview := decodeCleanupJSON(t, previewBuf.String())
	previewBuf.Reset()

	applyBuf, _ := captureHerdOutput(t)
	if err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.Path(), "--apply", "--json"}); err != nil {
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
	srv.SetRemoveError("no such workspace")
	buf, _ := captureHerdOutput(t)

	err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.Path(), "--apply", "--json"})
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
	err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.Path(), "--preview", "--apply"})
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
		agents []herdtest.Agent
		reason cleanup.Reason
	}{
		{"unmerged branch", false, nil, cleanup.UnmergedBranch},
		{"working worker", true, []herdtest.Agent{cleanupAgent("tick-nhk", "working")}, cleanup.LiveWorker},
		{"respawned worker still working", true, []herdtest.Agent{cleanupAgent("tick-nhk-r2", "working")}, cleanup.LiveWorker},
		{"blocked worker", true, []herdtest.Agent{cleanupAgent("tick-nhk", "blocked")}, cleanup.BlockedWorker},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			repo, manifestPath, srv := setupCleanupTick(t, c.merged)
			srv.SetAgents(c.agents...)
			buf, _ := captureHerdOutput(t)

			err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.Path(), "--apply", "--json"})
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
	err := ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.Path(), "--apply"})
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
	srv.SetAgents(cleanupAgent("tick-aaa", "working"))
	buf, _ := captureHerdOutput(t)

	err := ExecuteArgs([]string{"herd", "cleanup", "--epic", "gyz", "--socket", srv.Path(), "--apply", "--json"})
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
	_ = ExecuteArgs([]string{"herd", "cleanup", "nhk", "--socket", srv.Path(), "--epic", "gyz", "--json", "--apply"})
	_ = ExecuteArgs([]string{"herd", "cleanup", "nhk"})
	if herdCleanupJSON || herdCleanupApply || herdCleanupPreview {
		t.Error("a cleanup bool flag leaked across executions")
	}
	if herdCleanupEpic != "" || herdCleanupSocket != "" {
		t.Errorf("epic = %q, socket = %q, want both reset", herdCleanupEpic, herdCleanupSocket)
	}
}
