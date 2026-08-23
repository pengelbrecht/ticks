package collect

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	cloudstate "github.com/pengelbrecht/ticks/internal/cloud/state"
)

// The fixture is a real git repo with a real (file://) remote: a cloud worker
// is a container that pushes and disappears, so the only thing worth testing
// is what this package reads back off the remote.

type fixture struct {
	t      *testing.T
	local  string
	remote string
	base   string
}

func newFixture(t *testing.T) *fixture {
	t.Helper()
	root := t.TempDir()
	f := &fixture{t: t, local: filepath.Join(root, "checkout"), remote: filepath.Join(root, "origin.git")}

	run(t, root, "git", "init", "--bare", f.remote)
	run(t, root, "git", "init", f.local)
	run(t, f.local, "git", "checkout", "-b", "main")
	run(t, f.local, "git", "config", "user.email", "operator@example.com")
	run(t, f.local, "git", "config", "user.name", "Operator")
	run(t, f.local, "git", "remote", "add", "origin", "file://"+f.remote)
	write(t, f.local, "README.md", "base\n")
	run(t, f.local, "git", "add", "README.md")
	run(t, f.local, "git", "commit", "-m", "base")
	run(t, f.local, "git", "push", "-u", "origin", "main")
	f.base = strings.TrimSpace(output(t, f.local, "git", "rev-parse", "HEAD"))
	return f
}

// pushWorker builds what a worker container leaves behind: a branch off the
// base with its work and, when report is non-empty, a committed
// RESULT-<tick>.md.
func (f *fixture) pushWorker(tick, epic string, files map[string]string, report string) {
	f.t.Helper()
	work := filepath.Join(f.t.TempDir(), "worker-"+tick)
	run(f.t, "", "git", "clone", "--quiet", "file://"+f.remote, work)
	run(f.t, work, "git", "config", "user.email", "worker@example.com")
	run(f.t, work, "git", "config", "user.name", "Worker")
	branch := cloudstate.BranchFor(epic, tick)
	run(f.t, work, "git", "checkout", "-q", "-B", branch, f.base)
	for path, body := range files {
		write(f.t, work, path, body)
		run(f.t, work, "git", "add", "--", path)
	}
	if len(files) > 0 {
		run(f.t, work, "git", "commit", "-m", "work on "+tick)
	}
	if report != "" {
		write(f.t, work, "RESULT-"+tick+".md", report)
		run(f.t, work, "git", "add", "--", "RESULT-"+tick+".md")
		run(f.t, work, "git", "commit", "-m", "report for "+tick)
	}
	run(f.t, work, "git", "push", "-q", "origin", branch)
}

func (f *fixture) manifest(tick, epic string) cloudstate.Manifest {
	return cloudstate.Manifest{
		Tick: tick, Epic: epic, Project: "acme/project", RunID: "run_abc",
		Branch: cloudstate.BranchFor(epic, tick), Base: f.base, Remote: "origin",
	}
}

func run(t *testing.T, dir, name string, args ...string) {
	t.Helper()
	cmd := exec.Command(name, args...)
	if dir != "" {
		cmd.Dir = dir
	}
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("%s %v: %v\n%s", name, args, err, out)
	}
}

func output(t *testing.T, dir, name string, args ...string) string {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("%s %v: %v\n%s", name, args, err, out)
	}
	return string(out)
}

func write(t *testing.T, dir, rel, body string) {
	t.Helper()
	path := filepath.Join(dir, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

// TestReadyToMergeIsReadOffTheRemote is the headline: no worktree exists for a
// cloud worker, and the verdict still comes out of git.
func TestReadyToMergeIsReadOffTheRemote(t *testing.T) {
	f := newFixture(t)
	f.pushWorker("1aw", "gyz", map[string]string{"feature.go": "package feature\n"},
		"# 1aw\n\nDid the thing.\n\nSTATUS: DONE\n")

	r, err := Collect(f.local, f.manifest("1aw", "gyz"), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != ReadyToMerge {
		t.Fatalf("verdict = %q (%s), want ready-to-merge", r.Verdict, r.Detail)
	}
	if r.Status != "DONE" {
		t.Errorf("status = %q, want DONE", r.Status)
	}
	if r.Commits != 2 {
		t.Errorf("commits = %d, want 2 (work + report)", r.Commits)
	}
	if !r.Settled() {
		t.Error("a pushed report is what settles a cloud worker; Settled() was false")
	}
	if r.RemoteSHA == "" {
		t.Error("remote sha was not recorded")
	}
}

// TestCollectNeverTouchesTheWorkingTree: the branch is fetched into the
// remote-tracking namespace only. A local branch would collide with the
// operator's own checkout and with a herdr worktree of the same name.
func TestCollectNeverTouchesTheWorkingTreeOrLocalBranches(t *testing.T) {
	f := newFixture(t)
	f.pushWorker("1aw", "gyz", map[string]string{"feature.go": "package feature\n"}, "STATUS: DONE\n")

	if _, err := Collect(f.local, f.manifest("1aw", "gyz"), ""); err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if branches := output(t, f.local, "git", "branch", "--list", "tick/*"); strings.TrimSpace(branches) != "" {
		t.Errorf("collect created local branches: %q", branches)
	}
	if status := output(t, f.local, "git", "status", "--porcelain"); strings.TrimSpace(status) != "" {
		t.Errorf("collect dirtied the working tree: %q", status)
	}
	if _, err := os.Stat(filepath.Join(f.local, "feature.go")); !os.IsNotExist(err) {
		t.Error("collect checked the worker's work out into the local tree")
	}
}

func TestNoBranchOnTheRemoteIsNoCommits(t *testing.T) {
	f := newFixture(t)
	r, err := Collect(f.local, f.manifest("1aw", "gyz"), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != NoCommits {
		t.Fatalf("verdict = %q, want no-commits", r.Verdict)
	}
	if r.BranchExists {
		t.Error("branch_exists is true for a branch the remote does not have")
	}
}

func TestPushedWorkWithNoReportIsMissingResult(t *testing.T) {
	f := newFixture(t)
	f.pushWorker("1aw", "gyz", map[string]string{"feature.go": "package feature\n"}, "")

	r, err := Collect(f.local, f.manifest("1aw", "gyz"), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != MissingResult {
		t.Fatalf("verdict = %q, want missing-result", r.Verdict)
	}
	if r.Settled() {
		t.Error("a worker with no pushed report has not settled")
	}
}

func TestATrackerEditOnTheBranchIsABoundaryViolation(t *testing.T) {
	f := newFixture(t)
	f.pushWorker("1aw", "gyz", map[string]string{
		"feature.go":            "package feature\n",
		".tick/issues/1aw.json": "{}\n",
	}, "STATUS: DONE\n")

	r, err := Collect(f.local, f.manifest("1aw", "gyz"), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != BoundaryViolation {
		t.Fatalf("verdict = %q, want boundary-violation", r.Verdict)
	}
	if len(r.BoundaryFiles) != 1 || r.BoundaryFiles[0] != ".tick/issues/1aw.json" {
		t.Errorf("boundary files = %v", r.BoundaryFiles)
	}
}

// TestAReportedBlockIsStillMergeable: verdict and status are independent, the
// same rule the herd collect states.
func TestAReportedBlockIsStillMergeableAndFlagged(t *testing.T) {
	f := newFixture(t)
	f.pushWorker("1aw", "gyz", map[string]string{"feature.go": "package feature\n"},
		"STATUS: BLOCKED — the API key is missing\n")

	r, err := Collect(f.local, f.manifest("1aw", "gyz"), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != ReadyToMerge {
		t.Fatalf("verdict = %q, want ready-to-merge", r.Verdict)
	}
	if !r.NeedsHuman() {
		t.Error("a BLOCKED report must be flagged for a human")
	}
	if r.StatusDetail != "the API key is missing" {
		t.Errorf("status detail = %q", r.StatusDetail)
	}
}

// TestAnUnreachableRemoteIsUnknownNotAFailedWorker is the verdict a laptop
// needs and a Workflow does not: the network went away, and that is not a
// statement about the container.
func TestAnUnreachableRemoteIsUnknownNotAFailedWorker(t *testing.T) {
	f := newFixture(t)
	f.pushWorker("1aw", "gyz", map[string]string{"feature.go": "package feature\n"}, "STATUS: DONE\n")
	if err := os.RemoveAll(f.remote); err != nil {
		t.Fatalf("remove remote: %v", err)
	}

	r, err := Collect(f.local, f.manifest("1aw", "gyz"), "")
	if err != nil {
		t.Fatalf("Collect returned an error for an unreachable remote; want an Unknown report: %v", err)
	}
	if r.Verdict != Unknown {
		t.Fatalf("verdict = %q, want unknown", r.Verdict)
	}
	if !strings.Contains(r.Detail, "origin") {
		t.Errorf("detail %q does not name the remote", r.Detail)
	}
	if r.OK() {
		t.Error("an unknown verdict must never read as ready-to-merge")
	}
}

func TestAManifestWithNoBranchIsAnError(t *testing.T) {
	f := newFixture(t)
	m := f.manifest("1aw", "gyz")
	m.Branch = ""
	if _, err := Collect(f.local, m, ""); err == nil {
		t.Fatal("Collect accepted a manifest with no branch")
	}
}
