package cleanup

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/spawn"
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

// worktreeDir creates a REAL git worktree checked out to branch. The RESULT-
// file consumption logic runs `git status` in the worktree, so a fabricated
// path (as [newManifest] otherwise uses) would never exercise it.
func worktreeDir(t *testing.T, repo, branch string) string {
	t.Helper()
	dir := filepath.Join(t.TempDir(), "wt")
	run(t, repo, "git", "worktree", "add", "-q", dir, branch)
	return dir
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
	// A REAL failure, not workspace_not_found: an absent workspace is the end
	// state this step wants, so it no longer strands the manifest.
	srv.SetRemoveError("worktree has uncommitted changes")

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

// TestApplyTreatsMissingWorkspaceAsDone pins that a workspace herdr no longer
// has finishes the teardown instead of stranding it. The manifest is removed
// LAST, so reading "already gone" as a failure left it on disk forever and
// every later cleanup refused the same tick again — the exact state seven
// canonify manifests were found in.
func TestApplyTreatsMissingWorkspaceAsDone(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	srv.SetRemoveErrorCode("workspace_not_found", "workspace w7 not found")

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if !p.Applied || !p.OK() {
		t.Errorf("plan = %+v, want a completed apply", p)
	}
	if p.Steps[0].Error != "" {
		t.Errorf("the already-gone workspace still carries an error: %s", p.Steps[0].Error)
	}
	var noted bool
	for _, n := range p.Notes {
		if strings.Contains(n, "already gone") {
			noted = true
		}
	}
	if !noted {
		t.Errorf("notes = %v, want one saying the workspace was already gone", p.Notes)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Errorf("the manifest survived a completed teardown: %v", err)
	}
	if branchExists(repo, "tick/nhk") {
		t.Error("the branch survived a completed teardown")
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

// TestRefusesWorkingWorker pins the surviving half of the liveness rule: an
// agent that is mid-turn may be about to commit, so nothing is removed.
func TestRefusesWorkingWorker(t *testing.T) {
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
	srv.setAgents(agent("tick-nhk-r2", "working"))

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

// TestSettledLiveWorkerOnMergedBranchIsCleaned pins the end-of-wave case that
// a liveness-only refusal broke: an interactive agent CLI does not exit when
// it finishes, so at cleanup time herdr still lists it. On a merged branch
// that is the NORMAL state, and worktree.remove tears the agent down with the
// workspace. Refusing here made the command unusable in its own happy path —
// every tick of a live smoke run refused with live-worker after a clean merge.
func TestSettledLiveWorkerOnMergedBranchIsCleaned(t *testing.T) {
	for _, status := range []string{"idle", "done", "unknown"} {
		t.Run(status, func(t *testing.T) {
			repo, base := newRepo(t)
			workerBranch(t, repo, "tick/nhk", base, true)
			m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
			srv := newFakeHerd(t)
			srv.setAgents(agent("tick-nhk", status))

			plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
			if err != nil {
				t.Fatalf("apply: %v", err)
			}
			p := plans[0]
			if p.Refused {
				t.Fatalf("plan = %+v, want no refusal for a settled worker on a merged branch", p)
			}
			if !p.Applied {
				t.Fatalf("plan was not applied: %+v", p)
			}
			if branchExists(repo, "tick/nhk") {
				t.Error("the merged branch was not deleted")
			}
			if _, err := os.Stat(path); !os.IsNotExist(err) {
				t.Errorf("the manifest survived a clean teardown: %v", err)
			}
			if len(srv.Removed()) != 1 {
				t.Errorf("workspaces removed = %d, want 1", len(srv.Removed()))
			}
			var noted bool
			for _, n := range p.Notes {
				if strings.Contains(n, "still live") {
					noted = true
				}
			}
			if !noted {
				t.Errorf("notes = %v, want the live-but-settled agent recorded", p.Notes)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------

// TestApplyRestoresStolenFocus pins the user-visible side effect: herdr moves
// focus to a NEIGHBOURING workspace when one is removed, regardless of the
// focus:false this run passed on the way in. Measured live — a teardown moved
// the user's view off their own workspace and onto one the run had created.
// The run that caused it is the only thing that knows where they were.
func TestApplyRestoresStolenFocus(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	// The user is on w-user; removing the worker's workspace steals focus
	// onto the run's own source-checkout workspace, w-src.
	srv.setSession("w-user", "w-src", "w-user", "w-src")

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	if !plans[0].Applied {
		t.Fatalf("plan was not applied: %+v", plans[0])
	}
	if got := srv.FocusCalls(); len(got) != 1 || got[0] != "w-user" {
		t.Fatalf("workspace.focus calls = %v, want exactly [w-user]", got)
	}
	var noted bool
	for _, n := range plans[0].Notes {
		if strings.Contains(n, "restored focus to workspace w-user") {
			noted = true
		}
	}
	if !noted {
		t.Errorf("notes = %v, want the focus restoration recorded", plans[0].Notes)
	}
}

// TestApplyDoesNotTouchFocusWhenItDidNotMove pins that the restoration is a
// repair, not a policy: a teardown that left focus alone calls nothing.
func TestApplyDoesNotTouchFocusWhenItDidNotMove(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	srv.setSession("w-user", "", "w-user", "w-src")

	if _, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true)); err != nil {
		t.Fatalf("apply: %v", err)
	}
	if got := srv.FocusCalls(); len(got) != 0 {
		t.Errorf("workspace.focus calls = %v, want none — focus never moved", got)
	}
}

// TestApplyLeavesFocusAloneWhenTheFocusedWorkspaceIsGone pins that the run
// never re-focuses a workspace it just removed: herdr's own choice stands.
func TestApplyLeavesFocusAloneWhenTheFocusedWorkspaceIsGone(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	// The focused workspace before teardown is the worker's own, and it is
	// not in the post-teardown workspace list.
	srv.setSession("w-nhk", "w-src", "w-user", "w-src")

	if _, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true)); err != nil {
		t.Fatalf("apply: %v", err)
	}
	if got := srv.FocusCalls(); len(got) != 0 {
		t.Errorf("workspace.focus calls = %v, want none — the focused workspace was removed", got)
	}
}

// TestPreviewNeverTouchesFocus pins that a dry run stays a dry run.
func TestPreviewNeverTouchesFocus(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	srv.setSession("w-user", "w-src", "w-user", "w-src")

	if _, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, false)); err != nil {
		t.Fatalf("preview: %v", err)
	}
	joined := strings.Join(srv.Methods(), ",")
	if strings.Contains(joined, "workspace.focus") || strings.Contains(joined, "session.snapshot") {
		t.Errorf("a preview called %s — it must only list agents", joined)
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
	srv.setAgents(agent("tick-aaa", "working"))

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
	// One planning agent.list for the whole wave, plus one apply-time
	// re-check for each plan that got as far as its destructive step. The
	// refused tick never reaches a re-check.
	if n := strings.Count(strings.Join(srv.Methods(), ","), "agent.list"); n != 2 {
		t.Errorf("agent.list called %d times, want 2 (wave snapshot + one re-check for the clean tick)", n)
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

// ---------------------------------------------------------------------------
// Apply-time liveness re-check (the TOCTOU window)
// ---------------------------------------------------------------------------

// TestApplyRechecksLivenessBeforeRemoving is the TOCTOU pin. The wave's plans
// are built from ONE agent.list and then applied one at a time; a worker that
// was idle in that snapshot can be prompted and be mid-turn by the time its
// own worktree.remove is issued — which would kill the pane and the running
// agent together. The check that authorises the removal is therefore taken
// again, next to the removal.
func TestApplyRechecksLivenessBeforeRemoving(t *testing.T) {
	for _, tc := range []struct {
		status string
		reason Reason
	}{
		{"working", LiveWorker},
		{"blocked", BlockedWorker},
	} {
		t.Run(tc.status, func(t *testing.T) {
			repo, base := newRepo(t)
			workerBranch(t, repo, "tick/nhk", base, true)
			m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
			srv := newFakeHerd(t)
			// Idle when the plan is built, live when it is applied.
			srv.setAgents(agent("tick-nhk", "idle"))
			srv.setAgentsAfterFirstList(agent("tick-nhk", tc.status))

			plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
			if err != nil {
				t.Fatalf("apply: %v", err)
			}
			p := plans[0]
			if !p.Refused || p.Reason != tc.reason {
				t.Fatalf("plan = %+v, want a %s refusal from the apply-time re-check", p, tc.reason)
			}
			if len(p.Steps) != 0 {
				t.Errorf("steps = %v, want none on a refusal", actions(p))
			}
			if !strings.Contains(p.Detail, "after this plan was built") {
				t.Errorf("detail = %q, want it to say the status changed after planning", p.Detail)
			}
			if got := srv.Removed(); len(got) != 0 {
				t.Errorf("removed = %v, want nothing torn down under a live worker", got)
			}
			if !branchExists(repo, "tick/nhk") {
				t.Error("the branch was deleted despite the re-check refusal")
			}
			if _, err := os.Stat(path); err != nil {
				t.Errorf("the manifest was removed despite the re-check refusal: %v", err)
			}
		})
	}
}

// TestRecheckRefusalIsPerPlan pins that one worker waking up does not strand
// the rest of the wave: its plan refuses, the others still apply.
func TestRecheckRefusalIsPerPlan(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/aaa", base, true)
	workerBranch(t, repo, "tick/bbb", base, true)
	a, aPath := manifestOnDisk(t, repo, newManifest("aaa", "tick/aaa"))
	b, bPath := manifestOnDisk(t, repo, newManifest("bbb", "tick/bbb"))
	srv := newFakeHerd(t)
	srv.setAgents(agent("tick-aaa", "idle"), agent("tick-bbb", "idle"))
	srv.setAgentsAfterFirstList(agent("tick-aaa", "working"), agent("tick-bbb", "idle"))

	plans, err := Run(t.Context(), srv.Client(t), Options{
		RepoRoot:      repo,
		Manifests:     []state.Manifest{a, b},
		ManifestPaths: map[string]string{"aaa": aPath, "bbb": bPath},
		Apply:         true,
	})
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	if !plans[0].Refused || plans[0].Reason != LiveWorker {
		t.Errorf("plans[0] = %+v, want the woken worker refused", plans[0])
	}
	if !plans[1].Applied {
		t.Errorf("plans[1] was not applied: %+v", plans[1])
	}
	if got := srv.Removed(); len(got) != 1 || got[0] != "w-bbb" {
		t.Errorf("removed = %v, want only the still-settled tick's workspace", got)
	}
}

// TestPreviewDoesNotRecheck pins that the extra round-trip belongs to --apply
// only: a preview removes nothing, so there is nothing to re-check.
func TestPreviewDoesNotRecheck(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	srv.setAgents(agent("tick-nhk", "idle"))

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, false))
	if err != nil {
		t.Fatalf("preview: %v", err)
	}
	if plans[0].Refused {
		t.Fatalf("preview refused: %+v", plans[0])
	}
	if n := strings.Count(strings.Join(srv.Methods(), ","), "agent.list"); n != 1 {
		t.Errorf("agent.list called %d times in a preview, want 1", n)
	}
}

// TestRecheckFailureRefuses pins the fail-safe: herdr going quiet between the
// snapshot and the teardown is not evidence that killing an agent is safe.
func TestRecheckFailureRefuses(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	m, path := manifestOnDisk(t, repo, newManifest("nhk", "tick/nhk"))
	srv := newFakeHerd(t)
	srv.setListErrorAfterFirstList("herdr is shutting down")

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply returned a run error, want a per-plan refusal: %v", err)
	}
	p := plans[0]
	if !p.Refused || p.Reason != RecheckFailed {
		t.Fatalf("plan = %+v, want a %s refusal", p, RecheckFailed)
	}
	if got := srv.Removed(); len(got) != 0 {
		t.Errorf("removed = %v, want nothing torn down on an unanswerable re-check", got)
	}
	if _, err := os.Stat(path); err != nil {
		t.Errorf("the manifest was removed on an unanswerable re-check: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Consuming the tick's own uncommitted RESULT file
// ---------------------------------------------------------------------------
//
// The hardened worker template leaves RESULT-<tick-id>.md deliberately
// uncommitted, and worktree.remove without Force refuses any dirty
// worktree — so a design collision made every post-fix cleanup fail at
// remove-workspace. These tests pin the one narrow exception: the RESULT
// file, and only the RESULT file, is archived and deleted before the
// removal is attempted.

// TestApplyConsumesOnlyResultFileAndArchivesIt is the headline case: a
// worktree whose only dirt is the tick's own RESULT file proceeds without
// Force, and the report is archived beside the manifest before it is
// deleted from the worktree.
func TestApplyConsumesOnlyResultFileAndArchivesIt(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	wt := worktreeDir(t, repo, "tick/nhk")
	resultPath := filepath.Join(wt, spawn.ResultFile("nhk"))
	writeFile(t, resultPath, "STATUS: DONE\n")

	m := newManifest("nhk", "tick/nhk")
	m.Worktree = wt
	// The fake herd only records worktree.remove, it does not tear down the
	// real git worktree — unlike production herdr, which removes it as part
	// of the same call, freeing the branch for `git branch -d`. Leave branch
	// deletion out of scope for this test by recording none, since it is not
	// what consumeOwnResultFile is about.
	m.Branch = ""
	m, path := manifestOnDisk(t, repo, m)
	srv := newFakeHerd(t)

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if p.Refused || !p.Applied || !p.OK() {
		t.Fatalf("plan = %+v, want a clean apply", p)
	}
	if _, err := os.Stat(resultPath); !os.IsNotExist(err) {
		t.Errorf("RESULT file left behind in the worktree: %v", err)
	}
	archivePath := filepath.Join(filepath.Dir(path), "nhk.RESULT.md")
	body, err := os.ReadFile(archivePath)
	if err != nil {
		t.Fatalf("archive not written next to the manifest: %v", err)
	}
	if string(body) != "STATUS: DONE\n" {
		t.Errorf("archive content = %q, want the RESULT file's own content", body)
	}
	if got := srv.Removed(); len(got) != 1 || got[0] != "w-nhk" {
		t.Errorf("removed workspaces = %v, want [w-nhk]", got)
	}
	var noted bool
	for _, n := range p.Notes {
		if strings.Contains(n, "archived") {
			noted = true
		}
	}
	if !noted {
		t.Errorf("notes = %v, want the archive recorded", p.Notes)
	}
}

// TestApplyRefusesWhenOtherUntrackedFileAccompaniesResult pins that the
// exception is exact: a second untracked file means the worktree is left
// completely alone and worktree.remove refuses exactly as it always has.
func TestApplyRefusesWhenOtherUntrackedFileAccompaniesResult(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	wt := worktreeDir(t, repo, "tick/nhk")
	resultPath := filepath.Join(wt, spawn.ResultFile("nhk"))
	writeFile(t, resultPath, "STATUS: DONE\n")
	writeFile(t, filepath.Join(wt, "scratch.txt"), "leftover\n")

	m := newManifest("nhk", "tick/nhk")
	m.Worktree = wt
	m, path := manifestOnDisk(t, repo, m)
	srv := newFakeHerd(t)
	srv.SetRemoveError("worktree has uncommitted changes")

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if p.Applied || p.OK() {
		t.Fatalf("plan = %+v, want a failed apply — other dirt must still refuse", p)
	}
	if _, err := os.Stat(resultPath); err != nil {
		t.Errorf("RESULT file was removed despite other untracked dirt in the worktree: %v", err)
	}
	if _, err := os.Stat(filepath.Join(wt, "scratch.txt")); err != nil {
		t.Errorf("the other untracked file was touched: %v", err)
	}
	archivePath := filepath.Join(filepath.Dir(path), "nhk.RESULT.md")
	if _, err := os.Stat(archivePath); !os.IsNotExist(err) {
		t.Errorf("the RESULT file was archived despite other dirt in the worktree")
	}
}

// TestApplyRefusesWhenResultAccompaniesModifiedTrackedFile pins the other
// half: a tracked-file modification is dirt too, even with no other
// untracked file present.
func TestApplyRefusesWhenResultAccompaniesModifiedTrackedFile(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	wt := worktreeDir(t, repo, "tick/nhk")
	resultPath := filepath.Join(wt, spawn.ResultFile("nhk"))
	writeFile(t, resultPath, "STATUS: DONE\n")
	// workerBranch commits "tick-nhk.go" on this branch; modify it in place.
	writeFile(t, filepath.Join(wt, "tick-nhk.go"), "package a\n\n// modified\n")

	m := newManifest("nhk", "tick/nhk")
	m.Worktree = wt
	m, path := manifestOnDisk(t, repo, m)
	srv := newFakeHerd(t)
	srv.SetRemoveError("worktree has uncommitted changes")

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if p.Applied || p.OK() {
		t.Fatalf("plan = %+v, want a failed apply — a modified tracked file must still refuse", p)
	}
	if _, err := os.Stat(resultPath); err != nil {
		t.Errorf("RESULT file was removed despite a modified tracked file: %v", err)
	}
	archivePath := filepath.Join(filepath.Dir(path), "nhk.RESULT.md")
	if _, err := os.Stat(archivePath); !os.IsNotExist(err) {
		t.Errorf("the RESULT file was archived despite a modified tracked file")
	}
}

// TestApplyProceedsNormallyWhenWorktreeHasNoResultFile pins that a clean
// worktree with no RESULT file at all behaves exactly as before this
// exception existed: no archive, no note, just the ordinary apply.
func TestApplyProceedsNormallyWhenWorktreeHasNoResultFile(t *testing.T) {
	repo, base := newRepo(t)
	workerBranch(t, repo, "tick/nhk", base, true)
	wt := worktreeDir(t, repo, "tick/nhk")

	m := newManifest("nhk", "tick/nhk")
	m.Worktree = wt
	// See the comment in TestApplyConsumesOnlyResultFileAndArchivesIt: the
	// fake herd does not tear down the real git worktree, so branch deletion
	// is out of scope here.
	m.Branch = ""
	m, path := manifestOnDisk(t, repo, m)
	srv := newFakeHerd(t)

	plans, err := Run(t.Context(), srv.Client(t), opts(repo, m, path, true))
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	p := plans[0]
	if !p.Applied || !p.OK() {
		t.Fatalf("plan = %+v, want a clean apply", p)
	}
	archivePath := filepath.Join(filepath.Dir(path), "nhk.RESULT.md")
	if _, err := os.Stat(archivePath); !os.IsNotExist(err) {
		t.Errorf("an archive was created despite no RESULT file ever existing")
	}
	for _, n := range p.Notes {
		if strings.Contains(n, "archived") {
			t.Errorf("notes = %v, want no archive note when there was no RESULT file", p.Notes)
		}
	}
}
