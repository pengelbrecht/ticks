package spawn

import (
	"fmt"
	"path/filepath"

	"github.com/pengelbrecht/ticks/internal/herd/gitcmd"
)

// GitCommonDir resolves a repository's git common directory: the one directory
// that holds its refs, its objects and the `worktrees/<name>/` metadata of
// every LINKED worktree.
//
// It is the path a worker writes to when it commits from a worktree, and it is
// the reason a sandboxed worker cannot: a linked worktree's `.git` is a *file*
// pointing back here, so an index write, a ref update and an object write all
// land outside the worktree the sandbox bounds. See config.SpawnContext.
//
// The layout is read from git, never assumed: `--git-common-dir` is exactly
// the "give me the main repo's git dir, not this worktree's" question, and a
// repo may keep it somewhere other than `<root>/.git` (a separate git dir, a
// `GIT_DIR` in the environment, a submodule). A relative answer — git returns
// a bare `.git` for the common case — is resolved against repoRoot, because
// the caller is not necessarily running in it.
func GitCommonDir(repoRoot string) (string, error) {
	if repoRoot == "" {
		return "", fmt.Errorf("herd/spawn: resolving the git common dir: no repo root given")
	}
	dir, err := gitcmd.Run(repoRoot, "rev-parse", "--git-common-dir")
	if err != nil {
		return "", fmt.Errorf("herd/spawn: resolving the git common dir of %s: %w", repoRoot, err)
	}
	if dir == "" {
		return "", fmt.Errorf("herd/spawn: resolving the git common dir: git -C %s rev-parse --git-common-dir printed nothing",
			repoRoot)
	}
	if !filepath.IsAbs(dir) {
		dir = filepath.Join(repoRoot, dir)
	}
	abs, err := filepath.Abs(dir)
	if err != nil {
		return "", fmt.Errorf("herd/spawn: resolving the git common dir %q to an absolute path: %w", dir, err)
	}
	// Canonicalised, because the consumer is a sandbox allow-list: a grant
	// written as `/var/…` does not obviously cover a write the kernel reports
	// under `/private/var/…`. git itself is inconsistent here — it answers a
	// linked worktree with a fully resolved path and the main checkout with a
	// bare relative `.git` — so resolve both the same way. A path that cannot
	// be resolved (it must exist to be a git dir) is returned as-is rather
	// than failing the spawn over a cosmetic step.
	if real, err := filepath.EvalSymlinks(abs); err == nil {
		return real, nil
	}
	return abs, nil
}
