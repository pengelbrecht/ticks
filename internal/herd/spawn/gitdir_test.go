package spawn

import (
	"os/exec"
	"path/filepath"
	"testing"
)

// TestGitCommonDirMainRepo: in an ordinary checkout the common dir is the
// repo's own .git, absolute even though git answers with a bare relative name.
func TestGitCommonDirMainRepo(t *testing.T) {
	root := initTestRepo(t)

	got, err := GitCommonDir(root)
	if err != nil {
		t.Fatalf("GitCommonDir: %v", err)
	}
	if !filepath.IsAbs(got) {
		t.Errorf("GitCommonDir = %q, want an absolute path", got)
	}
	if want := realPath(t, filepath.Join(root, ".git")); got != want {
		t.Errorf("GitCommonDir = %q, want %q", got, want)
	}
}

// TestGitCommonDirLinkedWorktree is the case the mechanism exists for: from
// inside a LINKED worktree the answer must be the MAIN repo's git dir — the
// directory holding worktrees/<name>/ — not the worktree's own .git file. A
// codex sandbox granted only the worktree cannot commit; granted this, it can.
func TestGitCommonDirLinkedWorktree(t *testing.T) {
	root := initTestRepo(t)
	wt := filepath.Join(t.TempDir(), "linked")
	runGit(t, root, "worktree", "add", "-b", "tick/x", wt)

	got, err := GitCommonDir(wt)
	if err != nil {
		t.Fatalf("GitCommonDir: %v", err)
	}
	if want := realPath(t, filepath.Join(root, ".git")); got != want {
		t.Errorf("GitCommonDir(linked worktree) = %q, want the main repo's git dir %q", got, want)
	}
	// And it is really where this worktree's metadata lives.
	if !filepath.IsAbs(got) {
		t.Fatalf("GitCommonDir = %q, want an absolute path", got)
	}
}

func TestGitCommonDirFailsOutsideARepo(t *testing.T) {
	if _, err := GitCommonDir(t.TempDir()); err == nil {
		t.Error("GitCommonDir succeeded outside a repository; it must fail so the caller cannot spawn a worker that cannot commit")
	}
	if _, err := GitCommonDir(""); err == nil {
		t.Error("GitCommonDir(\"\") succeeded; an empty repo root is an error")
	}
}

// initTestRepo makes a repo with one commit. Identity is passed per-command so
// the test does not depend on a configured global git user.
func initTestRepo(t *testing.T) string {
	t.Helper()
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not on PATH")
	}
	dir := t.TempDir()
	runGit(t, dir, "init", "-b", "main")
	runGit(t, dir, "commit", "--allow-empty", "-m", "base")
	return dir
}

// realPath canonicalises a path the way [GitCommonDir] does — t.TempDir sits
// under a symlinked /var on macOS, and the grant has to name the real path.
func realPath(t *testing.T, p string) string {
	t.Helper()
	real, err := filepath.EvalSymlinks(p)
	if err != nil {
		t.Fatalf("EvalSymlinks(%q): %v", p, err)
	}
	return real
}

func runGit(t *testing.T, dir string, args ...string) {
	t.Helper()
	full := append([]string{
		"-C", dir,
		"-c", "user.email=test@example.com",
		"-c", "user.name=Test",
		"-c", "commit.gpgsign=false",
	}, args...)
	if out, err := exec.Command("git", full...).CombinedOutput(); err != nil {
		t.Fatalf("git %v: %v\n%s", args, err, out)
	}
}
