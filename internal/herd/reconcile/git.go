package reconcile

import (
	"fmt"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/pengelbrecht/ticks/internal/herd/gitcmd"
)

// gitState is the git half of the evidence: which worker branches exist and
// which worktrees are registered. It is read once per reconcile.
type gitState struct {
	// branches holds every branch matching the configured prefix.
	branches map[string]bool
	// worktreeBranch maps a resolved worktree path to the branch checked out
	// there ("" for a detached worktree).
	worktreeBranch map[string]string
	// branchWorktree maps a branch to the worktree path it is checked out in.
	branchWorktree map[string]string
}

// readGit collects the git evidence for a repository. prefix is the configured
// worktree branch prefix — never assume "tick/", it is a config value.
func readGit(repoRoot, prefix string) (*gitState, error) {
	g := &gitState{
		branches:       map[string]bool{},
		worktreeBranch: map[string]string{},
		branchWorktree: map[string]string{},
	}

	out, err := git(repoRoot, "branch", "--list", prefix+"*", "--format=%(refname:short)")
	if err != nil {
		return nil, fmt.Errorf("herd/reconcile: listing branches %s*: %w", prefix, err)
	}
	for _, line := range strings.Split(out, "\n") {
		if name := strings.TrimSpace(line); name != "" {
			g.branches[name] = true
		}
	}

	out, err = git(repoRoot, "worktree", "list", "--porcelain")
	if err != nil {
		return nil, fmt.Errorf("herd/reconcile: listing worktrees: %w", err)
	}
	var path string
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimRight(line, "\r")
		switch {
		case strings.HasPrefix(line, "worktree "):
			path = resolvePath(strings.TrimPrefix(line, "worktree "))
			g.worktreeBranch[path] = ""
		case strings.HasPrefix(line, "branch "):
			ref := strings.TrimPrefix(line, "branch ")
			branch := strings.TrimPrefix(ref, "refs/heads/")
			if path != "" {
				g.worktreeBranch[path] = branch
				g.branchWorktree[branch] = path
			}
		case line == "":
			path = ""
		}
	}
	return g, nil
}

// hasBranch reports whether a branch exists. The prefix listing is the source
// of truth for worker branches; a branch outside the prefix is not one.
func (g *gitState) hasBranch(branch string) bool { return branch != "" && g.branches[branch] }

// worktreeRegistered reports whether git knows a worktree at this path.
func (g *gitState) worktreeRegistered(path string) bool {
	if path == "" {
		return false
	}
	_, ok := g.worktreeBranch[resolvePath(path)]
	return ok
}

// commitsAhead counts the commits on branch beyond base. The second return is
// false when the question cannot be answered — a missing branch or a base this
// repository does not have. "Cannot tell" is never folded into "zero": zero
// commits is what authorises a reset, and a reset on a failed count would
// delete work.
func commitsAhead(repoRoot, base, branch string) (int, bool) {
	if base == "" || branch == "" {
		return 0, false
	}
	out, err := git(repoRoot, "rev-list", "--count", base+".."+branch)
	if err != nil {
		return 0, false
	}
	n, err := strconv.Atoi(strings.TrimSpace(out))
	if err != nil {
		return 0, false
	}
	return n, true
}

// git runs one git command in repoRoot and returns its trimmed stdout. It is
// the shared runner: an alias kept so this package's call sites read the same
// as they always did.
func git(repoRoot string, args ...string) (string, error) {
	return gitcmd.Run(repoRoot, args...)
}

// resolvePath normalises a path for comparison. Worktree paths come from two
// sources — herdr's spawn response (recorded in the manifest) and git's own
// listing — and on macOS one of them routinely carries /private/var where the
// other has /var. Symlink resolution is best effort: a path that no longer
// exists cannot be resolved, and its cleaned form is the right answer anyway.
func resolvePath(p string) string {
	p = strings.TrimSpace(p)
	if p == "" {
		return ""
	}
	if resolved, err := filepath.EvalSymlinks(p); err == nil {
		return filepath.Clean(resolved)
	}
	return filepath.Clean(p)
}
