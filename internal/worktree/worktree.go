// Package worktree provides git worktree management for isolated feature development.
package worktree

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// DefaultWorktreeDir is the default directory name for storing worktrees.
const DefaultWorktreeDir = ".worktrees"

// BranchPrefix is the prefix for worktree branch names.
const BranchPrefix = "tick/"

// metadataFileName is the name of the metadata file stored in each worktree.
const metadataFileName = ".tk-metadata"

// ErrNotGitRepo is returned when the directory is not a git repository.
var ErrNotGitRepo = errors.New("not a git repository")

// ErrWorktreeExists is returned when a worktree already exists for the epic.
var ErrWorktreeExists = errors.New("worktree already exists")

// ErrWorktreeNotFound is returned when a worktree doesn't exist for the epic.
var ErrWorktreeNotFound = errors.New("worktree not found")

// Worktree represents an active git worktree.
type Worktree struct {
	Path         string    // Absolute path to worktree directory
	Branch       string    // Branch name (e.g., tick/abc123)
	EpicID       string    // Associated epic ID
	Created      time.Time // When worktree was created
	ParentBranch string    // Branch from which this worktree was created
}

// worktreeMetadata stores metadata about a worktree in JSON format.
type worktreeMetadata struct {
	ParentBranch string    `json:"parentBranch"`
	CreatedAt    time.Time `json:"createdAt"`
}

// Manager handles git worktree lifecycle.
type Manager struct {
	repoRoot    string // Root of main repository
	worktreeDir string // Base directory for worktrees (default: .worktrees)
}

// NewManager creates a worktree manager for the given repository.
// Returns error if not a git repository.
func NewManager(repoRoot string) (*Manager, error) {
	// Verify it's a git repository by checking for .git
	gitDir := filepath.Join(repoRoot, ".git")
	info, err := os.Stat(gitDir)
	if err != nil {
		return nil, ErrNotGitRepo
	}
	// .git can be a directory (normal repo) or a file (worktree itself)
	if !info.IsDir() && !info.Mode().IsRegular() {
		return nil, ErrNotGitRepo
	}

	return &Manager{
		repoRoot:    repoRoot,
		worktreeDir: filepath.Join(repoRoot, DefaultWorktreeDir),
	}, nil
}

// Prune removes references to worktrees that no longer exist on disk.
// This cleans up orphaned entries in .git/worktrees/ that can occur when
// worktree directories are deleted without using `git worktree remove`.
func (m *Manager) Prune() error {
	cmd := exec.Command("git", "worktree", "prune")
	cmd.Dir = m.repoRoot
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to prune worktrees: %s: %w", strings.TrimSpace(string(output)), err)
	}
	return nil
}

// Create creates a new worktree for an epic.
// Branch name: tick/<epic-id>
// Path: <repoRoot>/.worktrees/<epic-id>
// Creates branch from current HEAD if it doesn't exist.
func (m *Manager) Create(epicID string) (*Worktree, error) {
	wtPath := m.worktreePath(epicID)
	branch := m.branchName(epicID)

	// Get the current branch before creating the worktree.
	// This will be empty string if HEAD is detached.
	parentBranch := getCurrentBranch(m.repoRoot)

	// Prune orphaned worktree references before checking/creating.
	// This handles cases where a previous run crashed and left the worktree
	// directory deleted but git's internal tracking still has it registered.
	_ = m.Prune()

	// Check if worktree path already exists
	if _, err := os.Stat(wtPath); err == nil {
		return nil, ErrWorktreeExists
	}

	// Ensure .worktrees/ is gitignored before creating any worktrees
	if _, err := EnsureGitignore(m.repoRoot); err != nil {
		return nil, fmt.Errorf("ensuring gitignore: %w", err)
	}

	// Ensure worktree directory exists
	if err := os.MkdirAll(m.worktreeDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create worktree directory: %w", err)
	}

	// Check if branch already exists
	branchExists := m.branchExists(branch)

	var cmd *exec.Cmd
	if branchExists {
		// Use existing branch
		cmd = exec.Command("git", "worktree", "add", wtPath, branch)
	} else {
		// Create new branch from HEAD
		cmd = exec.Command("git", "worktree", "add", wtPath, "-b", branch)
	}
	cmd.Dir = m.repoRoot

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to create worktree: %s: %w", strings.TrimSpace(string(output)), err)
	}

	// Symlink .tick/ from main repo into worktree so agent can access tick data.
	// This ensures all worktrees share the same tick database as the main repo.
	// Steps:
	// 1. Mark .tick files as skip-worktree so git ignores the deletion
	// 2. Remove the copied .tick directory (git copies tracked files to worktree)
	// 3. Create symlink to main repo's .tick
	tickSource := filepath.Join(m.repoRoot, ".tick")
	tickTarget := filepath.Join(wtPath, ".tick")
	if _, err := os.Stat(tickSource); err == nil {
		// First, mark all .tick files as skip-worktree so git ignores changes
		// This must be done before deleting the files
		cmd := exec.Command("git", "ls-files", ".tick")
		cmd.Dir = wtPath
		if output, err := cmd.Output(); err == nil && len(output) > 0 {
			files := strings.Split(strings.TrimSpace(string(output)), "\n")
			for _, file := range files {
				if file != "" {
					skipCmd := exec.Command("git", "update-index", "--skip-worktree", file)
					skipCmd.Dir = wtPath
					_ = skipCmd.Run()
				}
			}
		}

		// Remove the copied .tick directory
		_ = os.RemoveAll(tickTarget)
		// Create symlink to main repo's .tick
		_ = os.Symlink(tickSource, tickTarget)
	}

	// Write metadata with parent branch and creation time
	createdAt := time.Now()
	meta := worktreeMetadata{
		ParentBranch: parentBranch,
		CreatedAt:    createdAt,
	}
	if err := writeMetadata(wtPath, meta); err != nil {
		// Log warning but don't fail - metadata is supplementary
		// The worktree itself was created successfully
	}

	return &Worktree{
		Path:         wtPath,
		Branch:       branch,
		EpicID:       epicID,
		Created:      createdAt,
		ParentBranch: parentBranch,
	}, nil
}

// Remove deletes a worktree and its branch.
// Force removes even if there are uncommitted changes.
func (m *Manager) Remove(epicID string) error {
	wtPath := m.worktreePath(epicID)
	branch := m.branchName(epicID)

	// Check if worktree exists
	if _, err := os.Stat(wtPath); os.IsNotExist(err) {
		return ErrWorktreeNotFound
	}

	// Remove worktree (force to handle uncommitted changes)
	cmd := exec.Command("git", "worktree", "remove", wtPath, "--force")
	cmd.Dir = m.repoRoot
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to remove worktree: %s: %w", strings.TrimSpace(string(output)), err)
	}

	// Delete the branch
	if m.branchExists(branch) {
		cmd = exec.Command("git", "branch", "-D", branch)
		cmd.Dir = m.repoRoot
		output, err = cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("failed to delete branch: %s: %w", strings.TrimSpace(string(output)), err)
		}
	}

	return nil
}

// Get returns the worktree for an epic, or nil if not exists.
func (m *Manager) Get(epicID string) (*Worktree, error) {
	worktrees, err := m.List()
	if err != nil {
		return nil, err
	}

	for _, wt := range worktrees {
		if wt.EpicID == epicID {
			return wt, nil
		}
	}

	return nil, nil
}

// List returns all active tick worktrees.
func (m *Manager) List() ([]*Worktree, error) {
	cmd := exec.Command("git", "worktree", "list", "--porcelain")
	cmd.Dir = m.repoRoot

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list worktrees: %w", err)
	}

	worktrees, err := m.parseWorktreeList(output)
	if err != nil {
		return nil, err
	}

	// Populate ParentBranch from metadata for each worktree
	for _, wt := range worktrees {
		wt.ParentBranch = readMetadata(wt.Path)
	}

	return worktrees, nil
}

// Exists checks if a worktree exists for the epic.
func (m *Manager) Exists(epicID string) bool {
	wtPath := m.worktreePath(epicID)
	_, err := os.Stat(wtPath)
	return err == nil
}

// worktreePath returns the path for an epic's worktree.
func (m *Manager) worktreePath(epicID string) string {
	return filepath.Join(m.worktreeDir, epicID)
}

// branchName returns the branch name for an epic.
func (m *Manager) branchName(epicID string) string {
	return BranchPrefix + epicID
}

// branchExists checks if a branch exists.
func (m *Manager) branchExists(branch string) bool {
	cmd := exec.Command("git", "show-ref", "--verify", "--quiet", "refs/heads/"+branch)
	cmd.Dir = m.repoRoot
	return cmd.Run() == nil
}

// parseWorktreeList parses the output of `git worktree list --porcelain`.
// Format:
//
//	worktree /path/to/worktree
//	HEAD <commit>
//	branch refs/heads/<branch>
//	<blank line>
func (m *Manager) parseWorktreeList(output []byte) ([]*Worktree, error) {
	var worktrees []*Worktree
	var current *Worktree

	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "worktree ") {
			// Start of new worktree entry
			path := strings.TrimPrefix(line, "worktree ")
			current = &Worktree{Path: path}
		} else if strings.HasPrefix(line, "branch ") && current != nil {
			// Branch line
			branch := strings.TrimPrefix(line, "branch refs/heads/")
			current.Branch = branch

			// Check if this is a tick worktree
			if strings.HasPrefix(branch, BranchPrefix) {
				current.EpicID = strings.TrimPrefix(branch, BranchPrefix)
				worktrees = append(worktrees, current)
			}
			current = nil
		} else if line == "" {
			// End of entry - reset current
			current = nil
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("failed to parse worktree list: %w", err)
	}

	return worktrees, nil
}

// IsDirty checks if the main repository has uncommitted changes.
// Returns true if there are modified, staged, or untracked files (excluding .worktrees/).
func (m *Manager) IsDirty() (bool, []string, error) {
	cmd := exec.Command("git", "status", "--porcelain")
	cmd.Dir = m.repoRoot

	output, err := cmd.Output()
	if err != nil {
		return false, nil, fmt.Errorf("failed to check git status: %w", err)
	}

	if len(output) == 0 {
		return false, nil, nil
	}

	// Parse output and filter out .worktrees/ and .tick/ (expected to be dirty)
	var dirtyFiles []string
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		if len(line) < 3 {
			continue
		}
		// Format: "XY filename" where XY is 2-char status
		filename := strings.TrimSpace(line[2:])
		// Skip .worktrees/ and .tick/ directories
		if strings.HasPrefix(filename, ".worktrees/") || strings.HasPrefix(filename, ".tick/") {
			continue
		}
		dirtyFiles = append(dirtyFiles, filename)
	}

	if err := scanner.Err(); err != nil {
		return false, nil, fmt.Errorf("failed to parse git status: %w", err)
	}

	return len(dirtyFiles) > 0, dirtyFiles, nil
}

// IsOnlyTickFilesDirty checks if only .tick/ files are dirty.
// Returns true if all dirty files are in .tick/ directory, false if there are other dirty files.
// Also returns the list of dirty tick files.
func (m *Manager) IsOnlyTickFilesDirty(dirtyFiles []string) (bool, []string) {
	if len(dirtyFiles) == 0 {
		return false, nil
	}

	var tickFiles []string
	for _, f := range dirtyFiles {
		if strings.HasPrefix(f, ".tick/") {
			tickFiles = append(tickFiles, f)
		} else {
			// Non-tick file found, not only tick files dirty
			return false, nil
		}
	}

	return len(tickFiles) > 0, tickFiles
}

// AutoCommitTickFiles commits only .tick/ files with a standard commit message.
// Returns nil if successful, error otherwise.
func (m *Manager) AutoCommitTickFiles() error {
	// Stage all .tick/ files
	cmd := exec.Command("git", "add", ".tick/")
	cmd.Dir = m.repoRoot
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to stage tick files: %s: %w", strings.TrimSpace(string(output)), err)
	}

	// Commit with standard message
	cmd = exec.Command("git", "commit", "-m", "chore: auto-commit tick status updates")
	cmd.Dir = m.repoRoot
	output, err = cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to commit tick files: %s: %w", strings.TrimSpace(string(output)), err)
	}

	return nil
}

// getCurrentBranch returns the current branch name for the given repository root.
// Returns empty string if HEAD is detached or an error occurs.
func getCurrentBranch(repoRoot string) string {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = repoRoot
	output, err := cmd.Output()
	if err != nil {
		return ""
	}
	branch := strings.TrimSpace(string(output))
	// "HEAD" is returned when in detached HEAD state
	if branch == "HEAD" {
		return ""
	}
	return branch
}

// writeMetadata writes worktree metadata to a JSON file in the worktree directory.
func writeMetadata(wtPath string, meta worktreeMetadata) error {
	data, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}
	metaPath := filepath.Join(wtPath, metadataFileName)
	if err := os.WriteFile(metaPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write metadata: %w", err)
	}
	return nil
}

// readMetadata reads the ParentBranch from a worktree's metadata file.
// Returns empty string if the file doesn't exist or cannot be read.
func readMetadata(wtPath string) string {
	metaPath := filepath.Join(wtPath, metadataFileName)
	data, err := os.ReadFile(metaPath)
	if err != nil {
		return ""
	}
	var meta worktreeMetadata
	if err := json.Unmarshal(data, &meta); err != nil {
		return ""
	}
	return meta.ParentBranch
}
