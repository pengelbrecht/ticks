package recovery

import (
	"bufio"
	"bytes"
	"os"
	"os/exec"
	"strings"
)

// GitWorktreeProber is a WorktreeProber that uses git to inspect real worktrees.
type GitWorktreeProber struct {
	// repoRoot is the root of the main repository (for fallback resolution).
	repoRoot string

	// worktreeBaseDir is the base directory where tk worktrees live
	// (typically <repo>/.claude/worktrees).
	worktreeBaseDir string
}

// NewGitWorktreeProber creates a prober rooted at the given repository.
func NewGitWorktreeProber(repoRoot, worktreeBaseDir string) *GitWorktreeProber {
	return &GitWorktreeProber{
		repoRoot:        repoRoot,
		worktreeBaseDir: worktreeBaseDir,
	}
}

// ProbeWorktree checks if a worktree exists on disk and whether it has dirty
// (uncommitted) changes. It first tries the path from the lease, then falls
// back to the conventional location for the epic.
func (p *GitWorktreeProber) ProbeWorktree(worktreePath, epicID string) WorktreeInfo {
	// Try the path from the lease first
	if worktreePath != "" {
		if info, ok := p.probe(worktreePath); ok {
			return info
		}
	}

	// Fall back to the conventional tk worktree path: <base>/tk-<epicID>
	if epicID != "" && p.worktreeBaseDir != "" {
		conventional := p.worktreeBaseDir + "/tk-" + epicID
		if info, ok := p.probe(conventional); ok {
			return info
		}
	}

	return WorktreeInfo{Exists: false}
}

// probe checks a single path for existence and dirty status.
func (p *GitWorktreeProber) probe(path string) (WorktreeInfo, bool) {
	info, err := os.Stat(path)
	if err != nil || !info.IsDir() {
		return WorktreeInfo{}, false
	}

	dirty, files := gitDirtyFiles(path)
	return WorktreeInfo{
		Exists:     true,
		Path:       path,
		Dirty:      dirty,
		DirtyFiles: files,
	}, true
}

// gitDirtyFiles runs `git status --porcelain` in the given directory and
// returns whether there are dirty files and which files they are.
// Files in .tick/ are excluded since those are symlinked shared state.
func gitDirtyFiles(dir string) (bool, []string) {
	cmd := exec.Command("git", "status", "--porcelain")
	cmd.Dir = dir

	output, err := cmd.Output()
	if err != nil {
		// Can't determine status; assume clean to avoid false preserves.
		return false, nil
	}

	if len(output) == 0 {
		return false, nil
	}

	var files []string
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		if len(line) < 3 {
			continue
		}
		filename := strings.TrimSpace(line[2:])
		// Skip .tick/ files (shared symlinked state, always "dirty")
		if strings.HasPrefix(filename, ".tick/") {
			continue
		}
		files = append(files, filename)
	}

	return len(files) > 0, files
}
