package collect

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// ---------------------------------------------------------------------------
// Fixtures: a real temp git repo, because every check here is a real git
// question. Stubbing git would test the stub.
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

// newRepo builds a repo with one commit on the default branch and returns its
// path plus that commit — the "integration commit" a worker branches from.
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

func writeFile(t *testing.T, path, body string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

// commitOnBranch creates branch from base and commits the given files on it.
func commitOnBranch(t *testing.T, repo, branch, base string, files map[string]string) {
	t.Helper()
	run(t, repo, "git", "checkout", "-q", "-b", branch, base)
	for name, body := range files {
		writeFile(t, filepath.Join(repo, name), body)
	}
	run(t, repo, "git", "add", "-A")
	run(t, repo, "git", "commit", "-m", "work on "+branch)
	run(t, repo, "git", "checkout", "-q", "-")
}

// worktreeWithResult is the worker's report artifact, in a directory standing
// in for the path herdr chose. Collect must not care that it is not a real
// git worktree: it reads the recorded path, it does not derive one.
func worktreeWithResult(t *testing.T, tick, body string) string {
	t.Helper()
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "RESULT-"+tick+".md"), body)
	return dir
}

func manifest(tick, branch, base, worktree string) state.Manifest {
	return state.Manifest{Tick: tick, Epic: "gyz", Branch: branch, Base: base, Worktree: worktree}
}

// ---------------------------------------------------------------------------
// The four verdicts
// ---------------------------------------------------------------------------

func TestCollectReadyToMerge(t *testing.T) {
	repo, base := newRepo(t)
	commitOnBranch(t, repo, "tick/nhk", base, map[string]string{"src/a.go": "package a\n"})
	wt := worktreeWithResult(t, "nhk", "# report\n\nAll good.\n\nSTATUS: DONE\n")

	r, err := Collect(repo, manifest("nhk", "tick/nhk", base, wt), "/m/nhk.json")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != ReadyToMerge {
		t.Errorf("verdict = %q, want %q (%+v)", r.Verdict, ReadyToMerge, r)
	}
	if r.Status != StatusDone {
		t.Errorf("status = %q, want DONE", r.Status)
	}
	if r.Commits != 1 || !r.BranchExists {
		t.Errorf("commits = %d, branchExists = %v, want 1 and true", r.Commits, r.BranchExists)
	}
	if len(r.BoundaryFiles) != 0 {
		t.Errorf("boundary files = %v, want none", r.BoundaryFiles)
	}
	if !r.OK() {
		t.Error("OK() = false for a ready-to-merge report")
	}
	if r.ResultPath != filepath.Join(wt, "RESULT-nhk.md") {
		t.Errorf("result path = %q, want it under the RECORDED worktree", r.ResultPath)
	}
}

func TestCollectNoCommits(t *testing.T) {
	repo, base := newRepo(t)
	// The branch exists but the worker never committed.
	run(t, repo, "git", "branch", "tick/nhk", base)
	wt := worktreeWithResult(t, "nhk", "STATUS: DONE\n")

	r, err := Collect(repo, manifest("nhk", "tick/nhk", base, wt), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != NoCommits {
		t.Errorf("verdict = %q, want %q", r.Verdict, NoCommits)
	}
	if r.OK() {
		t.Error("OK() = true with no commits — an empty branch is never mergeable")
	}
}

func TestCollectMissingBranchIsNoCommits(t *testing.T) {
	repo, base := newRepo(t)
	r, err := Collect(repo, manifest("nhk", "tick/nhk", base, t.TempDir()), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.BranchExists {
		t.Error("branch_exists = true for a branch that was never created")
	}
	if r.Verdict != NoCommits {
		t.Errorf("verdict = %q, want %q", r.Verdict, NoCommits)
	}
}

func TestCollectMissingResult(t *testing.T) {
	repo, base := newRepo(t)
	commitOnBranch(t, repo, "tick/nhk", base, map[string]string{"src/a.go": "package a\n"})

	r, err := Collect(repo, manifest("nhk", "tick/nhk", base, t.TempDir()), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != MissingResult {
		t.Errorf("verdict = %q, want %q", r.Verdict, MissingResult)
	}
	if r.ResultExists {
		t.Error("result_exists = true with no report written")
	}
}

func TestCollectResultWithoutStatusLineIsMissingResult(t *testing.T) {
	repo, base := newRepo(t)
	commitOnBranch(t, repo, "tick/nhk", base, map[string]string{"src/a.go": "package a\n"})
	wt := worktreeWithResult(t, "nhk", "# report\n\nI did the thing and forgot the last line.\n")

	r, err := Collect(repo, manifest("nhk", "tick/nhk", base, wt), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if !r.ResultExists {
		t.Error("result_exists = false, want true — the file is there")
	}
	if r.Status != "" {
		t.Errorf("status = %q, want empty", r.Status)
	}
	if r.Verdict != MissingResult {
		t.Errorf("verdict = %q, want %q — a report with no status is not a result",
			r.Verdict, MissingResult)
	}
}

func TestCollectBoundaryViolation(t *testing.T) {
	repo, base := newRepo(t)
	commitOnBranch(t, repo, "tick/nhk", base, map[string]string{
		"src/a.go":         "package a\n",
		".tick/ticks/x.md": "the orchestrator owns this\n",
	})
	wt := worktreeWithResult(t, "nhk", "STATUS: DONE\n")

	r, err := Collect(repo, manifest("nhk", "tick/nhk", base, wt), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != BoundaryViolation {
		t.Errorf("verdict = %q, want %q", r.Verdict, BoundaryViolation)
	}
	if len(r.BoundaryFiles) != 1 || r.BoundaryFiles[0] != ".tick/ticks/x.md" {
		t.Errorf("boundary files = %v, want the one .tick/ path", r.BoundaryFiles)
	}
}

// TestCollectBoundaryEvidenceSurvivesAnEarlierVerdict pins that the single
// verdict label never hides evidence: a worker that both skipped its report
// and wrote under .tick/ reports the boundary files anyway.
func TestCollectBoundaryEvidenceSurvivesAnEarlierVerdict(t *testing.T) {
	repo, base := newRepo(t)
	commitOnBranch(t, repo, "tick/nhk", base, map[string]string{".tick/ticks/x.md": "nope\n"})

	r, err := Collect(repo, manifest("nhk", "tick/nhk", base, t.TempDir()), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != MissingResult {
		t.Errorf("verdict = %q, want %q (doc order)", r.Verdict, MissingResult)
	}
	if len(r.BoundaryFiles) != 1 {
		t.Errorf("boundary files = %v, want them reported under any verdict", r.BoundaryFiles)
	}
}

// TestCollectIgnoresTickChangesOnTheBaseSide pins the three-dot diff: work the
// integration branch gained after the worker branched is not the worker's
// boundary violation.
func TestCollectIgnoresTickChangesOnTheBaseSide(t *testing.T) {
	repo, base := newRepo(t)
	commitOnBranch(t, repo, "tick/nhk", base, map[string]string{"src/a.go": "package a\n"})
	// The orchestrator's own tracker commit lands on main afterwards.
	writeFile(t, filepath.Join(repo, ".tick", "ticks", "nhk.json"), "{}\n")
	run(t, repo, "git", "add", "-A")
	run(t, repo, "git", "commit", "-m", "tracker state")
	wt := worktreeWithResult(t, "nhk", "STATUS: DONE\n")

	r, err := Collect(repo, manifest("nhk", "tick/nhk", base, wt), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if len(r.BoundaryFiles) != 0 {
		t.Errorf("boundary files = %v, want none — those commits are on the base side",
			r.BoundaryFiles)
	}
	if r.Verdict != ReadyToMerge {
		t.Errorf("verdict = %q, want %q", r.Verdict, ReadyToMerge)
	}
}

// ---------------------------------------------------------------------------
// Status parsing
// ---------------------------------------------------------------------------

func TestParseStatusAllFour(t *testing.T) {
	cases := []struct {
		body       string
		wantStatus string
		wantDetail string
	}{
		{"STATUS: DONE\n", StatusDone, ""},
		{"STATUS: DONE_WITH_CONCERNS — check the retry path\n", StatusDoneWithConcerns, "check the retry path"},
		{"STATUS: NEEDS_CONTEXT — which socket path?\n", StatusNeedsContext, "which socket path?"},
		{"STATUS: BLOCKED — the base commit is missing\n", StatusBlocked, "the base commit is missing"},
		{"prose\n\n**STATUS: DONE**\n", StatusDone, ""},
		{"- STATUS: BLOCKED - no network\n", StatusBlocked, "no network"},
		{"STATUS: DONE\n\nSTATUS: BLOCKED — later beats earlier\n", StatusBlocked, "later beats earlier"},
		{"nothing to see\n", "", ""},
		{"STATUS: MAYBE\n", "", ""},
	}
	for _, c := range cases {
		status, detail, line := ParseStatus(c.body)
		if status != c.wantStatus {
			t.Errorf("ParseStatus(%q) status = %q, want %q", c.body, status, c.wantStatus)
		}
		if detail != c.wantDetail {
			t.Errorf("ParseStatus(%q) detail = %q, want %q", c.body, detail, c.wantDetail)
		}
		if c.wantStatus != "" && !strings.Contains(line, c.wantStatus) {
			t.Errorf("ParseStatus(%q) line = %q, want it to carry the status", c.body, line)
		}
	}
}

// TestCollectReportsStatusOfABlockedWorker pins that verdict and status are
// independent: a blocked worker that still committed and reported is
// mergeable-shaped, and NeedsHuman is what flags it.
func TestCollectReportsStatusOfABlockedWorker(t *testing.T) {
	repo, base := newRepo(t)
	commitOnBranch(t, repo, "tick/nhk", base, map[string]string{"src/a.go": "package a\n"})
	wt := worktreeWithResult(t, "nhk", "STATUS: BLOCKED — needs a decision\n")

	r, err := Collect(repo, manifest("nhk", "tick/nhk", base, wt), "")
	if err != nil {
		t.Fatalf("Collect: %v", err)
	}
	if r.Verdict != ReadyToMerge {
		t.Errorf("verdict = %q, want %q — the artifacts are there", r.Verdict, ReadyToMerge)
	}
	if !r.NeedsHuman() {
		t.Error("NeedsHuman() = false for a BLOCKED report")
	}
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

func TestCollectRejectsManifestWithoutBranchOrBase(t *testing.T) {
	repo, base := newRepo(t)
	if _, err := Collect(repo, state.Manifest{Tick: "nhk", Base: base}, ""); err == nil {
		t.Error("a manifest with no branch collected without error")
	}
	if _, err := Collect(repo, state.Manifest{Tick: "nhk", Branch: "tick/nhk"}, ""); err == nil {
		t.Error("a manifest with no base collected without error")
	}
}

func TestCollectUnknownBaseIsAnError(t *testing.T) {
	repo, _ := newRepo(t)
	run(t, repo, "git", "branch", "tick/nhk")
	_, err := Collect(repo, manifest("nhk", "tick/nhk", "0000000000000000000000000000000000000000", t.TempDir()), "")
	if err == nil {
		t.Fatal("an unresolvable base commit produced a verdict instead of an error")
	}
}
