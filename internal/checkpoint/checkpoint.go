package checkpoint

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Checkpoint represents a saved state of a ticker run that can be resumed.
type Checkpoint struct {
	// ID is the unique identifier for this checkpoint (e.g., "abc-7" for epic abc, iteration 7).
	ID string `json:"id"`

	// Timestamp is when this checkpoint was created.
	Timestamp time.Time `json:"timestamp"`

	// EpicID is the epic being worked on.
	EpicID string `json:"epic_id"`

	// Iteration is the iteration number at checkpoint time.
	Iteration int `json:"iteration"`

	// TotalTokens is the cumulative token usage up to this point.
	TotalTokens int `json:"total_tokens"`

	// TotalCost is the cumulative cost in USD up to this point.
	TotalCost float64 `json:"total_cost"`

	// CompletedTasks lists task IDs completed before this checkpoint.
	CompletedTasks []string `json:"completed_tasks"`

	// GitCommit is the commit SHA at checkpoint time for potential rollback.
	GitCommit string `json:"git_commit"`

	// WorktreePath is the path to the worktree if running in worktree mode.
	// Empty if running in normal mode (main repo).
	WorktreePath string `json:"worktree_path,omitempty"`

	// WorktreeBranch is the branch name for the worktree.
	// Used to recreate worktree if it was cleaned up.
	WorktreeBranch string `json:"worktree_branch,omitempty"`
}

// Manager handles saving, loading, and listing checkpoints.
type Manager struct {
	// dir is the directory where checkpoints are stored.
	dir string
}

// NewManager creates a new checkpoint manager with the default directory.
func NewManager() *Manager {
	return &Manager{dir: ".tick/logs/checkpoints"}
}

// NewManagerWithDir creates a new checkpoint manager with a custom directory.
func NewManagerWithDir(dir string) *Manager {
	return &Manager{dir: dir}
}

// Dir returns the checkpoint directory path.
func (m *Manager) Dir() string {
	return m.dir
}

// Save writes a checkpoint to disk as JSON.
// The filename is derived from the checkpoint ID (e.g., "abc-7.json").
func (m *Manager) Save(cp *Checkpoint) error {
	if cp.ID == "" {
		return fmt.Errorf("checkpoint ID is required")
	}

	// Ensure directory exists
	if err := os.MkdirAll(m.dir, 0755); err != nil {
		return fmt.Errorf("creating checkpoint directory: %w", err)
	}

	// Marshal to JSON
	data, err := json.MarshalIndent(cp, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling checkpoint: %w", err)
	}

	// Write to file
	filename := filepath.Join(m.dir, cp.ID+".json")
	if err := os.WriteFile(filename, data, 0644); err != nil {
		return fmt.Errorf("writing checkpoint file: %w", err)
	}

	return nil
}

// Load reads a checkpoint from disk by ID.
func (m *Manager) Load(id string) (*Checkpoint, error) {
	filename := filepath.Join(m.dir, id+".json")

	data, err := os.ReadFile(filename)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("checkpoint not found: %s", id)
		}
		return nil, fmt.Errorf("reading checkpoint file: %w", err)
	}

	var cp Checkpoint
	if err := json.Unmarshal(data, &cp); err != nil {
		return nil, fmt.Errorf("unmarshaling checkpoint: %w", err)
	}

	return &cp, nil
}

// List returns all available checkpoints, sorted by timestamp (newest first).
func (m *Manager) List() ([]Checkpoint, error) {
	entries, err := os.ReadDir(m.dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // No checkpoints directory yet
		}
		return nil, fmt.Errorf("reading checkpoint directory: %w", err)
	}

	var checkpoints []Checkpoint
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		id := strings.TrimSuffix(entry.Name(), ".json")
		cp, err := m.Load(id)
		if err != nil {
			continue // Skip invalid checkpoint files
		}
		checkpoints = append(checkpoints, *cp)
	}

	// Sort by timestamp, newest first
	sort.Slice(checkpoints, func(i, j int) bool {
		return checkpoints[i].Timestamp.After(checkpoints[j].Timestamp)
	})

	return checkpoints, nil
}

// ListForEpic returns checkpoints for a specific epic, sorted by iteration (newest first).
func (m *Manager) ListForEpic(epicID string) ([]Checkpoint, error) {
	all, err := m.List()
	if err != nil {
		return nil, err
	}

	var filtered []Checkpoint
	for _, cp := range all {
		if cp.EpicID == epicID {
			filtered = append(filtered, cp)
		}
	}

	// Sort by iteration, newest first
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].Iteration > filtered[j].Iteration
	})

	return filtered, nil
}

// Latest returns the most recent checkpoint for an epic, or nil if none exist.
func (m *Manager) Latest(epicID string) (*Checkpoint, error) {
	checkpoints, err := m.ListForEpic(epicID)
	if err != nil {
		return nil, err
	}
	if len(checkpoints) == 0 {
		return nil, nil
	}
	return &checkpoints[0], nil
}

// Delete removes a checkpoint by ID.
func (m *Manager) Delete(id string) error {
	filename := filepath.Join(m.dir, id+".json")
	if err := os.Remove(filename); err != nil {
		if os.IsNotExist(err) {
			return nil // Already deleted
		}
		return fmt.Errorf("deleting checkpoint: %w", err)
	}
	return nil
}

// GenerateID creates a checkpoint ID from epic ID and iteration number.
func GenerateID(epicID string, iteration int) string {
	return fmt.Sprintf("%s-%d", epicID, iteration)
}

// GetGitCommit returns the current HEAD commit SHA, or empty string if not in a git repo.
func GetGitCommit() string {
	cmd := exec.Command("git", "rev-parse", "HEAD")
	output, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(output))
}

// NewCheckpoint creates a new checkpoint with the current timestamp and git commit.
func NewCheckpoint(epicID string, iteration int, tokens int, cost float64, completedTasks []string) *Checkpoint {
	return &Checkpoint{
		ID:             GenerateID(epicID, iteration),
		Timestamp:      time.Now(),
		EpicID:         epicID,
		Iteration:      iteration,
		TotalTokens:    tokens,
		TotalCost:      cost,
		CompletedTasks: completedTasks,
		GitCommit:      GetGitCommit(),
	}
}

// NewCheckpointWithWorktree creates a checkpoint with worktree information.
// Use this when running in worktree mode to enable resuming in the correct worktree.
func NewCheckpointWithWorktree(epicID string, iteration int, tokens int, cost float64, completedTasks []string, worktreePath, worktreeBranch string) *Checkpoint {
	cp := NewCheckpoint(epicID, iteration, tokens, cost, completedTasks)
	cp.WorktreePath = worktreePath
	cp.WorktreeBranch = worktreeBranch
	return cp
}

// ErrWorktreeGone is returned when a worktree cannot be restored because
// both the worktree path and branch no longer exist.
var ErrWorktreeGone = fmt.Errorf("cannot resume: worktree and branch both gone")

// PrepareResume prepares the working directory for resuming from a checkpoint.
// For non-worktree checkpoints, it returns "." (current directory).
// For worktree checkpoints, it returns the existing worktree path or recreates it from the branch.
// The repoRoot parameter is used for recreating worktrees and should point to the main repository.
func (m *Manager) PrepareResume(cp *Checkpoint, repoRoot string) (workDir string, err error) {
	if cp.WorktreePath == "" {
		return ".", nil // Normal mode, use current dir
	}

	// Check if worktree exists at saved path
	if _, err := os.Stat(cp.WorktreePath); err == nil {
		return cp.WorktreePath, nil
	}

	// Worktree gone - try to recreate from branch
	if cp.WorktreeBranch == "" {
		return "", ErrWorktreeGone
	}

	// Check if the branch still exists
	if !branchExists(cp.WorktreeBranch, repoRoot) {
		return "", ErrWorktreeGone
	}

	// Recreate the worktree from the branch
	newPath, err := recreateWorktreeFromBranch(cp.EpicID, cp.WorktreeBranch, repoRoot)
	if err != nil {
		return "", fmt.Errorf("recreating worktree: %w", err)
	}

	return newPath, nil
}

// branchExists checks if a branch exists in the repository.
func branchExists(branch, repoRoot string) bool {
	cmd := exec.Command("git", "show-ref", "--verify", "--quiet", "refs/heads/"+branch)
	cmd.Dir = repoRoot
	return cmd.Run() == nil
}

// recreateWorktreeFromBranch creates a worktree at the standard location for an epic
// using an existing branch.
func recreateWorktreeFromBranch(epicID, branch, repoRoot string) (string, error) {
	worktreePath := filepath.Join(repoRoot, ".worktrees", epicID)

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(worktreePath), 0755); err != nil {
		return "", fmt.Errorf("creating worktree directory: %w", err)
	}

	// Create worktree from existing branch
	cmd := exec.Command("git", "worktree", "add", worktreePath, branch)
	cmd.Dir = repoRoot
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("git worktree add: %s: %w", strings.TrimSpace(string(output)), err)
	}

	return worktreePath, nil
}
