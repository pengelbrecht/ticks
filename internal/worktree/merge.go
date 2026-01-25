package worktree

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

// ErrMergeConflict is returned when a merge cannot be completed due to conflicts.
var ErrMergeConflict = errors.New("merge conflict")

// ErrNoMergeInProgress is returned when trying to abort with no merge in progress.
var ErrNoMergeInProgress = errors.New("no merge in progress")

// ErrParentBranchNotFound is returned when the parent branch no longer exists.
var ErrParentBranchNotFound = errors.New("parent branch no longer exists")

// ErrNoTargetBranch is returned when no target branch is specified and no parent branch is recorded.
var ErrNoTargetBranch = errors.New("no target branch specified and no parent branch recorded")

// MergeOptions contains options for the Merge operation.
type MergeOptions struct {
	TargetBranch string // Target branch to merge into (overrides worktree's ParentBranch)
}

// MergeResult represents the outcome of a merge attempt.
type MergeResult struct {
	Success      bool     // True if merge completed successfully
	Merged       bool     // True if merge was performed (not just fast-forward check)
	Conflicts    []string // List of conflicting files if any
	MergeCommit  string   // Commit hash of merge commit (if success)
	ErrorMessage string   // Error details if failed
	TargetBranch string   // The branch that was merged into
}

// MergeManager handles merging worktree branches to their target branch.
type MergeManager struct {
	repoRoot   string
	mainBranch string // Usually "main" or "master"
}

// NewMergeManager creates a merge manager for the given repository.
// Auto-detects the main branch name (main or master).
func NewMergeManager(repoRoot string) (*MergeManager, error) {
	mainBranch, err := detectMainBranch(repoRoot)
	if err != nil {
		return nil, fmt.Errorf("detecting main branch: %w", err)
	}

	return &MergeManager{
		repoRoot:   repoRoot,
		mainBranch: mainBranch,
	}, nil
}

// MainBranch returns the detected main branch name.
func (m *MergeManager) MainBranch() string {
	return m.mainBranch
}

// Merge merges the worktree branch into the target branch.
// Must be called from main repo (not worktree).
// Returns MergeResult with conflict details if merge fails.
//
// Target branch resolution:
// 1. If opts.TargetBranch is set, use it
// 2. Else if wt.ParentBranch is set, use it
// 3. Else return ErrNoTargetBranch
func (m *MergeManager) Merge(wt *Worktree, opts MergeOptions) (*MergeResult, error) {
	// Resolve target branch
	var targetBranch string
	var targetFromOpts bool
	if opts.TargetBranch != "" {
		targetBranch = opts.TargetBranch
		targetFromOpts = true
	} else if wt.ParentBranch != "" {
		targetBranch = wt.ParentBranch
	} else {
		return nil, ErrNoTargetBranch
	}

	// Check if target branch exists
	if !branchExists(m.repoRoot, targetBranch) {
		if targetFromOpts {
			return nil, fmt.Errorf("target branch %q does not exist", targetBranch)
		}
		return nil, ErrParentBranchNotFound
	}

	// First, checkout target branch
	if err := m.checkoutBranch(targetBranch); err != nil {
		return &MergeResult{
			Success:      false,
			TargetBranch: targetBranch,
			ErrorMessage: fmt.Sprintf("failed to checkout %s: %v", targetBranch, err),
		}, nil
	}

	// Attempt merge with --no-ff to always create merge commit
	mergeMsg := fmt.Sprintf("Merge %s", wt.Branch)
	cmd := exec.Command("git", "merge", wt.Branch, "--no-ff", "-m", mergeMsg)
	cmd.Dir = m.repoRoot

	output, err := cmd.CombinedOutput()
	if err != nil {
		// Check if it's a conflict
		conflicts := m.getConflictingFiles()
		if len(conflicts) > 0 {
			return &MergeResult{
				Success:      false,
				Merged:       true, // Merge was attempted
				Conflicts:    conflicts,
				TargetBranch: targetBranch,
				ErrorMessage: "merge conflict",
			}, nil
		}

		// Some other error
		return &MergeResult{
			Success:      false,
			TargetBranch: targetBranch,
			ErrorMessage: fmt.Sprintf("merge failed: %s", strings.TrimSpace(string(output))),
		}, nil
	}

	// Get the merge commit hash
	commitHash, err := m.getHeadCommit()
	if err != nil {
		return &MergeResult{
			Success:      true,
			Merged:       true,
			TargetBranch: targetBranch,
			ErrorMessage: fmt.Sprintf("merge succeeded but failed to get commit hash: %v", err),
		}, nil
	}

	return &MergeResult{
		Success:      true,
		Merged:       true,
		MergeCommit:  commitHash,
		TargetBranch: targetBranch,
	}, nil
}

// AbortMerge aborts an in-progress merge.
func (m *MergeManager) AbortMerge() error {
	if !m.HasConflict() {
		return ErrNoMergeInProgress
	}

	cmd := exec.Command("git", "merge", "--abort")
	cmd.Dir = m.repoRoot

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to abort merge: %s: %w", strings.TrimSpace(string(output)), err)
	}

	return nil
}

// HasConflict checks if there's an unresolved merge in progress.
func (m *MergeManager) HasConflict() bool {
	// Check for MERGE_HEAD file which indicates merge in progress
	cmd := exec.Command("git", "rev-parse", "--verify", "MERGE_HEAD")
	cmd.Dir = m.repoRoot
	return cmd.Run() == nil
}

// checkoutBranch switches to the specified branch.
func (m *MergeManager) checkoutBranch(branch string) error {
	cmd := exec.Command("git", "checkout", branch)
	cmd.Dir = m.repoRoot

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %w", strings.TrimSpace(string(output)), err)
	}

	return nil
}

// getConflictingFiles returns a list of files with merge conflicts.
// Uses git status --porcelain to detect files with UU (unmerged) status.
func (m *MergeManager) getConflictingFiles() []string {
	cmd := exec.Command("git", "status", "--porcelain")
	cmd.Dir = m.repoRoot

	output, err := cmd.Output()
	if err != nil {
		return nil
	}

	var conflicts []string
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		// Conflict markers: UU (both modified), AA (both added), etc.
		if len(line) >= 2 {
			status := line[:2]
			if status == "UU" || status == "AA" || status == "DD" ||
				status == "AU" || status == "UA" ||
				status == "DU" || status == "UD" {
				// Extract filename (starts at position 3)
				if len(line) > 3 {
					conflicts = append(conflicts, strings.TrimSpace(line[3:]))
				}
			}
		}
	}

	return conflicts
}

// getHeadCommit returns the current HEAD commit hash.
func (m *MergeManager) getHeadCommit() (string, error) {
	cmd := exec.Command("git", "rev-parse", "HEAD")
	cmd.Dir = m.repoRoot

	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(string(output)), nil
}

// branchExists checks if a branch exists in the repository.
func branchExists(repoRoot, branch string) bool {
	cmd := exec.Command("git", "show-ref", "--verify", "--quiet", "refs/heads/"+branch)
	cmd.Dir = repoRoot
	return cmd.Run() == nil
}

// detectMainBranch detects whether the repository uses 'main' or 'master'.
func detectMainBranch(repoRoot string) (string, error) {
	// Check for 'main' branch first (more common in newer repos)
	cmd := exec.Command("git", "show-ref", "--verify", "--quiet", "refs/heads/main")
	cmd.Dir = repoRoot
	if cmd.Run() == nil {
		return "main", nil
	}

	// Check for 'master' branch
	cmd = exec.Command("git", "show-ref", "--verify", "--quiet", "refs/heads/master")
	cmd.Dir = repoRoot
	if cmd.Run() == nil {
		return "master", nil
	}

	// Neither exists, return error
	return "", errors.New("no main or master branch found")
}
