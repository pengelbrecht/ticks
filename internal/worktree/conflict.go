package worktree

import (
	"os/exec"
	"strings"
	"sync"
	"time"
)

// ConflictState tracks an unresolved merge conflict.
type ConflictState struct {
	EpicID       string    // Epic that had the conflict
	Branch       string    // Branch name (e.g., tick/abc123)
	Conflicts    []string  // List of conflicting files
	WorktreePath string    // Worktree path (preserved for inspection)
	DetectedAt   time.Time // When conflict was detected
	TargetBranch string    // Branch that was being merged into (e.g., main, feature/auth)
}

// ConflictHandler manages the conflict lifecycle.
// It tracks active conflicts and checks for resolution.
type ConflictHandler struct {
	repoRoot string
	merge    *MergeManager

	mu        sync.RWMutex
	conflicts map[string]*ConflictState // epicID -> conflict state
}

// NewConflictHandler creates a conflict handler for the given repository.
func NewConflictHandler(repoRoot string, merge *MergeManager) *ConflictHandler {
	return &ConflictHandler{
		repoRoot:  repoRoot,
		merge:     merge,
		conflicts: make(map[string]*ConflictState),
	}
}

// HandleConflict is called when a merge fails due to conflict.
// It aborts the merge (to clean up git state) but leaves the worktree intact
// for user inspection. Returns ConflictState for tracking/display.
// The targetBranch parameter is the branch that was being merged into (from MergeResult.TargetBranch).
func (h *ConflictHandler) HandleConflict(wt *Worktree, conflicts []string, targetBranch string) *ConflictState {
	// Abort the in-progress merge to clean up git state
	// Ignore errors - merge might have already been aborted
	_ = h.merge.AbortMerge()

	state := &ConflictState{
		EpicID:       wt.EpicID,
		Branch:       wt.Branch,
		Conflicts:    conflicts,
		WorktreePath: wt.Path,
		DetectedAt:   time.Now(),
		TargetBranch: targetBranch,
	}

	h.mu.Lock()
	h.conflicts[wt.EpicID] = state
	h.mu.Unlock()

	return state
}

// CheckResolved checks if a conflict has been manually resolved.
// User resolves by:
//  1. cd to main repo
//  2. git checkout main
//  3. git merge tick/<epic-id>
//  4. Resolve conflicts
//  5. git commit
//
// Returns true if the worktree branch is now merged into main.
func (h *ConflictHandler) CheckResolved(epicID string) bool {
	h.mu.RLock()
	state, exists := h.conflicts[epicID]
	h.mu.RUnlock()

	if !exists {
		return false
	}

	// Check if the branch has been merged into main
	if h.isBranchMerged(state.Branch) {
		h.mu.Lock()
		delete(h.conflicts, epicID)
		h.mu.Unlock()
		return true
	}

	return false
}

// GetActiveConflicts returns all unresolved conflicts.
// Returns a copy of the conflict states to avoid races.
func (h *ConflictHandler) GetActiveConflicts() []*ConflictState {
	h.mu.RLock()
	defer h.mu.RUnlock()

	result := make([]*ConflictState, 0, len(h.conflicts))
	for _, state := range h.conflicts {
		result = append(result, state.copy())
	}
	return result
}

// GetConflict returns the conflict state for a specific epic, or nil if none.
func (h *ConflictHandler) GetConflict(epicID string) *ConflictState {
	h.mu.RLock()
	defer h.mu.RUnlock()

	state, exists := h.conflicts[epicID]
	if !exists {
		return nil
	}
	return state.copy()
}

// copy returns a deep copy of the conflict state to avoid races.
func (s *ConflictState) copy() *ConflictState {
	stateCopy := *s
	stateCopy.Conflicts = make([]string, len(s.Conflicts))
	copy(stateCopy.Conflicts, s.Conflicts)
	return &stateCopy
}

// ClearConflict removes a conflict from tracking (e.g., after worktree cleanup).
func (h *ConflictHandler) ClearConflict(epicID string) {
	h.mu.Lock()
	delete(h.conflicts, epicID)
	h.mu.Unlock()
}

// HasConflict checks if a specific epic has an active conflict.
func (h *ConflictHandler) HasConflict(epicID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	_, exists := h.conflicts[epicID]
	return exists
}

// isBranchMerged checks if a branch has been merged into main.
// Uses git merge-base --is-ancestor to check if branch is ancestor of main.
func (h *ConflictHandler) isBranchMerged(branch string) bool {
	// First check if branch still exists
	cmd := exec.Command("git", "show-ref", "--verify", "--quiet", "refs/heads/"+branch)
	cmd.Dir = h.repoRoot
	if cmd.Run() != nil {
		// Branch doesn't exist - consider it merged (or deleted)
		return true
	}

	// Check if branch is merged into main
	// git merge-base --is-ancestor <branch> <main>
	// Returns 0 if branch is ancestor of main (i.e., merged)
	cmd = exec.Command("git", "merge-base", "--is-ancestor", branch, h.merge.MainBranch())
	cmd.Dir = h.repoRoot
	return cmd.Run() == nil
}

// ConflictInfo returns a human-readable summary of the conflict.
func (s *ConflictState) ConflictInfo() string {
	// Use target branch if set, otherwise default to "main" for backward compatibility
	targetBranch := s.TargetBranch
	if targetBranch == "" {
		targetBranch = "main"
	}

	var sb strings.Builder
	sb.WriteString("Merge conflict in epic ")
	sb.WriteString(s.EpicID)
	sb.WriteString("\n")
	sb.WriteString("Branch: ")
	sb.WriteString(s.Branch)
	sb.WriteString("\n")
	sb.WriteString("Worktree: ")
	sb.WriteString(s.WorktreePath)
	sb.WriteString("\n")
	sb.WriteString("Conflicting files:\n")
	for _, f := range s.Conflicts {
		sb.WriteString("  - ")
		sb.WriteString(f)
		sb.WriteString("\n")
	}
	sb.WriteString("\nTo resolve:\n")
	sb.WriteString("  1. cd ")
	sb.WriteString(s.WorktreePath)
	sb.WriteString("  (inspect changes)\n")
	sb.WriteString("  2. git checkout ")
	sb.WriteString(targetBranch)
	sb.WriteString("  (from main repo)\n")
	sb.WriteString("  3. git merge ")
	sb.WriteString(s.Branch)
	sb.WriteString("\n")
	sb.WriteString("  4. Resolve conflicts and commit\n")
	return sb.String()
}
