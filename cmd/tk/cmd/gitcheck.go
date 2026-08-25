package cmd

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// IsTickDirGitignored checks if .tick/ is covered by .gitignore.
// Uses git check-ignore to handle complex gitignore patterns.
// Returns true if the .tick directory would be ignored by git.
func IsTickDirGitignored(repoRoot string) bool {
	cmd := exec.Command("git", "check-ignore", "-q", ".tick/")
	cmd.Dir = repoRoot
	err := cmd.Run()
	// Exit 0 means the path is ignored
	return err == nil
}

// IsLinkedWorktree reports whether repoRoot is a LINKED git worktree rather
// than the repository's main checkout.
//
// It matters because a tick is a FILE in the working tree. Written from a
// linked worktree it exists only on that worktree's branch, and the
// stage-explicit-paths discipline every multi-agent run follows means no
// later commit picks it up: the branch merges clean and the tick never
// existed. Six open reports were lost this way in one repository, sitting
// untracked in a worktree whose own work had long since merged.
//
// The test is git's own: in a linked worktree the git dir is a subdirectory
// of the common dir (`.git/worktrees/<name>`), so the two paths differ. In
// the main checkout they are the same directory.
func IsLinkedWorktree(repoRoot string) bool {
	gitDir, ok := gitPath(repoRoot, "--git-dir")
	if !ok {
		return false
	}
	commonDir, ok := gitPath(repoRoot, "--git-common-dir")
	if !ok {
		return false
	}
	return gitDir != commonDir
}

// gitPath runs one `git rev-parse <flag>` in dir and returns the result as an
// absolute, symlink-resolved path. A repo-relative answer (git answers ".git"
// for the main checkout) is resolved against dir first, so the two paths this
// file compares are always in the same form.
func gitPath(dir, flag string) (string, bool) {
	cmd := exec.Command("git", "rev-parse", flag)
	cmd.Dir = dir
	out, err := cmd.Output()
	if err != nil {
		return "", false
	}
	path := strings.TrimSpace(string(out))
	if path == "" {
		return "", false
	}
	if !filepath.IsAbs(path) {
		path = filepath.Join(dir, path)
	}
	if resolved, err := filepath.EvalSymlinks(path); err == nil {
		path = resolved
	}
	return filepath.Clean(path), true
}

// warnIfFiledInLinkedWorktree tells the caller, on stderr, that the tick it
// just created lives only in this worktree until it is committed here. It is
// deliberately silent in the main checkout, where the file is already where
// everyone looks.
func warnIfFiledInLinkedWorktree(root, id string) {
	if !IsLinkedWorktree(root) {
		return
	}
	rel := filepath.Join(".tick", "issues", id+".json")
	os.Stderr.WriteString(
		"warning: filed in a linked worktree — " + rel + " exists only here.\n" +
			"         Nothing else will pick it up: commit it from this worktree\n" +
			"         (git add " + rel + ") or the tick is lost when the worktree goes.\n")
}
