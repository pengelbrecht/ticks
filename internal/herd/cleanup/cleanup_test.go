package cleanup

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// ---------------------------------------------------------------------------
// Fixtures: a real temp git repo, because "is this branch merged" is a real
// git question and a stub would be testing the stub.
// ---------------------------------------------------------------------------

func run(t *testing.T, dir, name string, args ...string) string {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("%s %s: %v\n%s", name, strings.Join(args, " "), err, out)
	}
	return strings.TrimSpace(string(out))
}

func writeFile(t *testing.T, path, body string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func newRepo(t *testing.T) (repo, base string) {
	t.Helper()
	repo = t.TempDir()
	run(t, repo, "git", "init", "-b", "main")
	run(t, repo, "git", "config", "user.email", "test@example.com")
	run(t, repo, "git", "config", "user.name", "Test User")
	writeFile(t, filepath.Join(repo, "README.md"), "base\n")
	run(t, repo, "git", "add", "-A")
	run(t, repo, "git", "commit", "-m", "base")
	return repo, run(t, repo, "git", "rev-parse", "HEAD")
}

// workerBranch creates the worker's branch with one commit. merged says
// whether the orchestrator has already merged it into HEAD — the state
// cleanup is supposed to run in.
func workerBranch(t *testing.T, repo, branch, base string, merged bool) {
	t.Helper()
	run(t, repo, "git", "checkout", "-q", "-b", branch, base)
	writeFile(t, filepath.Join(repo, strings.ReplaceAll(branch, "/", "-")+".go"), "package a\n")
	run(t, repo, "git", "add", "-A")
	run(t, repo, "git", "commit", "-m", "work")
	run(t, repo, "git", "checkout", "-q", "main")
	if merged {
		run(t, repo, "git", "merge", "--no-ff", "-m", "merge "+branch, branch)
	}
}

// manifestOnDisk writes a real manifest and returns it with its path — the
// removal ordering test needs the file to actually exist.
func manifestOnDisk(t *testing.T, repo string, m state.Manifest) (state.Manifest, string) {
	t.Helper()
	path, err := state.Write(repo, m)
	if err != nil {
		t.Fatalf("state.Write: %v", err)
	}
	return m, path
}

func newManifest(tick, branch string) state.Manifest {
	return state.Manifest{
		Tick:        tick,
		Epic:        "gyz",
		Branch:      branch,
		Worktree:    "/herdr/worktrees/repo/" + strings.ReplaceAll(branch, "/", "-"),
		WorkspaceID: "w-" + tick,
		Agent:       "tick-" + tick,
		Base:        "deadbeef",
	}
}

func opts(repo string, m state.Manifest, path string, apply bool) Options {
	return Options{
		RepoRoot:      repo,
		Manifests:     []state.Manifest{m},
		ManifestPaths: map[string]string{m.Tick: path},
		Apply:         apply,
	}
}

func actions(p Plan) []string {
	var out []string
	for _, s := range p.Steps {
		out = append(out, string(s.Action)+":"+s.Target)
	}
	return out
}

// ---------------------------------------------------------------------------
// Preview and apply
// ---------------------------------------------------------------------------

// TestPreviewListsExactlyWhatApplyRemoves is the headline promise: the preview
// is the plan, and applying it removes exactly those three things.
func TestPreviewListsExactlyWhatApplyRemoves(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	herd := srv.Client(t)

	preview, err := Run(t.Context(), herd, opts(repo, m, path, false))
	if err != nil {
		t.Fatalf("preview: %v", err)
	}
	if len(preview) != 1 {
		t.Fatalf("preview has %d plans, want 1", len(preview))
	}
	want := []string{"remove-workspace:w-nhk", "delete-branch:tick/nhk", "remove-manifest:" + path}
	if got := actions(preview[0]); strings.Join(got, ",") != strings.Join(want, ",") {
		t.Errorf("preview steps = %v, want %v", got, want)
	}
	if preview[0].Applied {
		t.Error("preview reported Applied — a preview must not act")
	}
	// A preview touches nothing.
	if len(srv.Removed()) != 0 {
		t.Errorf("preview removed workspaces %v", srv.Removed())
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("preview removed the manifest: %v", err)
	}
	if !branchExists(repo, "tick/nhk") {
		t.Error("preview deleted the branch")
	}

	applied, err := Run(t.Context(), herd, opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	if got := actions(applied[0]); strings.Join(got, ",") != strings.Join(want, ",") {
		t.Errorf("apply steps = %v, want the previewed %v", got, want)
	}
	if !applied[0].Applied || !applied[0].OK() {
		t.Errorf("apply plan = %+v, want a clean apply", applied[0])
	}
	if got := srv.Removed(); len(got) != 1 || got[0] != "w-nhk" {
		t.Errorf("removed workspaces = %v, want [w-nhk]", got)
	}
	if branchExists(repo, "tick/nhk") {
		t.Error("apply left the branch behind")
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Errorf("apply left the manifest behind: %v", err)
	}
}

// TestApplyRemovesManifestLast pins the ordering rule: a failed workspace
// removal must leave the manifest on disk, or the tick becomes invisible to
// the next reconcile.
func TestApplyRemovesManifestLast(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	srv.removeErr = "no such workspace"

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if p.Applied || p.OK() {
		t.Errorf("plan = %+v, want a failed apply", p)
	}
	if p.Steps[0].Error == "" {
		t.Error("the failing step carries no error")
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("a failed teardown removed the manifest anyway: %v", err)
	}
	if !branchExists(repo, "tick/nhk") {
		t.Error("apply continued past a failed step and deleted the branch")
	}
}

// TestApplySkipsMissingBranchAndWorkspace pins that an already-partly-cleaned
// tick still finishes rather than erroring on the parts that are gone.
func TestApplySkipsMissingBranchAndWorkspace(t *testing.T) {
	repo, _ := newRepo(t)
	m := newManifest("nhk", "tick/nhk")
	m.WorkspaceID = ""
	_, path := manifestOnDisk(t, repo, m)
	srv := newFakeHerd(t)

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if got := actions(p); len(got) != 1 || got[0] != "remove-manifest:"+path {
		t.Errorf("steps = %v, want only the manifest removal", got)
	}
	if len(p.Notes) != 2 {
		t.Errorf("notes = %v, want one for the workspace and one for the branch", p.Notes)
	}
	if !p.Applied {
		t.Errorf("plan = %+v, want it applied", p)
	}
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

func TestRefusesUnmergedBranch(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, false)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if !p.Refused || p.Reason != UnmergedBranch {
		t.Fatalf("plan = %+v, want a %s refusal", p, UnmergedBranch)
	}
	if len(p.Steps) != 0 {
		t.Errorf("a refused plan carries steps: %v", actions(p))
	}
	if !branchExists(repo, "tick/nhk") || len(srv.Removed()) != 0 {
		t.Error("a refusal removed something")
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("a refusal removed the manifest: %v", err)
	}
}

func TestRefusesLiveWorker(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	srv.setAgents(agent("tick-nhk", "working"))

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if !p.Refused || p.Reason != LiveWorker {
		t.Fatalf("plan = %+v, want a %s refusal", p, LiveWorker)
	}
	if branchExists(repo, "tick/nhk") == false {
		t.Error("a live worker's branch was deleted")
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("a live worker's manifest was removed: %v", err)
	}
}

// TestRefusesRespawnedWorkerByPrefix pins the -r2 rule: a herdr agent name is
// released when its process exits, so the second worker for a tick carries a
// fresh name. An exact-name check would clean a live pane out from under it.
func TestRefusesRespawnedWorkerByPrefix(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	srv.setAgents(agent("tick-nhk-r2", "idle"))

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if !p.Refused || p.Reason != LiveWorker {
		t.Fatalf("plan = %+v, want a %s refusal for the respawned worker", p, LiveWorker)
	}
	if !strings.Contains(p.Detail, "tick-nhk-r2") {
		t.Errorf("detail = %q, want it to name the live agent", p.Detail)
	}
}

// TestUnrelatedAgentIsNotThisTicksWorker pins that the prefix match does not
// over-reach onto a neighbouring tick's worker.
func TestUnrelatedAgentIsNotThisTicksWorker(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	srv.setAgents(agent("tick-nhk2", "working"), agent("tick-q3x", "idle"))

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, false))
	if err != nil {
		t.Fatalf("preview: %v", err)
	}
	if plans[0].Refused {
		t.Errorf("plan = %+v, want no refusal — neither agent belongs to nhk", plans[0])
	}
}

func TestRefusesBlockedWorker(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	srv.setAgents(agent("tick-nhk", "blocked"))

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if !p.Refused || p.Reason != BlockedWorker {
		t.Fatalf("plan = %+v, want a %s refusal", p, BlockedWorker)
	}
	if len(srv.Removed()) != 0 {
		t.Error("a blocked worker's workspace was removed — that is the handoff state")
	}
}

// TestRefusalIsPerTick pins that one refused tick does not strand the rest of
// a wave.
func TestRefusalIsPerTick(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/aaa", base, true)
	workerBranch(t, repo, "tick/bbb", base, true)
	a, aPath := manifestOnDisk(t, repo, newManifest("aaa", "tick/aaa"))
	b, bPath := manifestOnDisk(t, repo, newManifest("bbb", "tick/bbb"))
	srv := newFakeHerd(t)
	srv.setAgents(agent("tick-aaa", "idle"))

	plans, err := Run(t.Context(), srv.Client(t), Options{
		RepoRoot:      repo,
		Manifests:     []state.Manifest{a, b},
		ManifestPaths: map[string]string{"aaa": aPath, "bbb": bPath},
		Apply:         true,
	})
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	if !plans[0].Refused {
		t.Error("the live tick was not refused")
	}
	if !plans[1].Applied {
		t.Errorf("the clean tick was not applied: %+v", plans[1])
	}
	if got := srv.Removed(); len(got) != 1 || got[0] != "w-bbb" {
		t.Errorf("removed = %v, want only the clean tick's workspace", got)
	}
	// One agent.list for the whole wave, not one per tick.
	if n := strings.Count(strings.Join(srv.Methods(), ","), "agent.list"); n != 1 {
		t.Errorf("agent.list called %d times, want 1 for the wave", n)
	}
}

// TestBranchDeleteUsesLowercaseD pins that the guard is git's own: a branch
// that looks merged to us but not to git is still refused by git, and we never
// reach for -D.
func TestBranchDeleteUsesLowercaseD(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	m.WorkspaceID = ""
	srv := newFakeHerd(t)

	// Move HEAD back before the merge: git now considers the branch unmerged.
	run(t, repo, "git", "reset", "--hard", base)

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	if !plans[0].Refused || plans[0].Reason != UnmergedBranch {
		t.Fatalf("plan = %+v, want the unmerged refusal", plans[0])
	}
	if !branchExists(repo, "tick/nhk") {
		t.Fatal("the unmerged branch was deleted")
	}
}
