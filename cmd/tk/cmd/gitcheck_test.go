package cmd

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func git(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %v: %v\n%s", args, err, out)
	}
}

// newWorktreeRepo returns a repo with one commit plus a linked worktree on a
// second branch, so both sides of IsLinkedWorktree are exercised against real
// git rather than a stub.
func newWorktreeRepo(t *testing.T) (main string, linked string) {
	t.Helper()
	main = t.TempDir()
	git(t, main, "init", "-q", "-b", "main")
	git(t, main, "config", "user.email", "t@example.com")
	git(t, main, "config", "user.name", "t")
	if err := os.WriteFile(filepath.Join(main, "f"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	git(t, main, "add", "f")
	git(t, main, "commit", "-qm", "one")

	linked = filepath.Join(t.TempDir(), "wt")
	git(t, main, "worktree", "add", "-q", "-b", "side", linked)
	return main, linked
}

func TestIsLinkedWorktree(t *testing.T) {
	main, linked := newWorktreeRepo(t)

	if IsLinkedWorktree(main) {
		t.Error("the main checkout was reported as a linked worktree")
	}
	if !IsLinkedWorktree(linked) {
		t.Error("a linked worktree was reported as the main checkout")
	}
}

// A path that is not a git repository at all must not be called a worktree —
// the warning it drives would be nonsense there.
func TestIsLinkedWorktreeOutsideARepo(t *testing.T) {
	if IsLinkedWorktree(t.TempDir()) {
		t.Error("a non-repo directory was reported as a linked worktree")
	}
}
