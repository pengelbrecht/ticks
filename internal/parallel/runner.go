package parallel

import (
	"context"
	"sync"
	"time"

	"github.com/pengelbrecht/ticks/internal/budget"
	"github.com/pengelbrecht/ticks/internal/engine"
	"github.com/pengelbrecht/ticks/internal/worktree"
)

// RunnerConfig configures parallel execution.
type RunnerConfig struct {
	// EpicIDs are the epics to run.
	EpicIDs []string

	// MaxParallel is the maximum concurrent epics (default: len(EpicIDs)).
	MaxParallel int

	// SharedBudget is shared across all epics (thread-safe).
	SharedBudget *budget.Tracker

	// WorktreeManager handles worktree creation/cleanup.
	WorktreeManager *worktree.Manager

	// MergeManager handles merging completed worktrees to their target branch.
	MergeManager *worktree.MergeManager

	// EngineFactory creates Engine instances for each epic.
	// If nil, epics cannot be run (useful for testing).
	EngineFactory EngineFactory

	// EngineConfig is the base configuration for each engine run.
	// EpicID will be set per-epic.
	EngineConfig engine.RunConfig
}

// EngineFactory creates Engine instances for parallel runs.
// Receives the epicID to allow setting up per-epic callbacks.
type EngineFactory func(epicID string) *engine.Engine

// EpicStatus represents the status of a single epic in parallel run.
type EpicStatus struct {
	EpicID      string
	Status      string // "pending", "running", "completed", "failed", "conflict"
	Worktree    *worktree.Worktree
	Result      *engine.RunResult
	Error       error
	Conflict    *ConflictState
	StartedAt   time.Time
	CompletedAt time.Time
}

// ConflictState holds information about a merge conflict.
type ConflictState struct {
	Branch   string   // Branch that failed to merge
	Files    []string // Conflicting files
	Message  string   // Error message
	Worktree string   // Path to worktree (for manual resolution)
}

// ParallelResult is the aggregate result of all epics.
type ParallelResult struct {
	Statuses    map[string]*EpicStatus
	TotalCost   float64
	TotalTokens int
	Duration    time.Duration
	AllSuccess  bool
}

// RunnerCallbacks provides hooks for TUI integration.
type RunnerCallbacks struct {
	OnEpicStart    func(epicID string)
	OnEpicComplete func(epicID string, result *engine.RunResult)
	OnEpicFailed   func(epicID string, err error)
	OnEpicConflict func(epicID string, conflict *ConflictState)
	OnStatusChange func(epicID string, status string)
	OnMessage      func(message string) // Global status messages (e.g., "Creating worktrees...")
}

// Runner orchestrates parallel epic execution.
type Runner struct {
	config    RunnerConfig
	callbacks RunnerCallbacks
	statuses  map[string]*EpicStatus
	mu        sync.RWMutex
	startTime time.Time
}

// NewRunner creates a parallel runner.
func NewRunner(config RunnerConfig) *Runner {
	// Apply defaults
	if config.MaxParallel <= 0 {
		config.MaxParallel = len(config.EpicIDs)
	}
	if config.MaxParallel > len(config.EpicIDs) {
		config.MaxParallel = len(config.EpicIDs)
	}

	// Initialize statuses
	statuses := make(map[string]*EpicStatus)
	for _, epicID := range config.EpicIDs {
		statuses[epicID] = &EpicStatus{
			EpicID: epicID,
			Status: "pending",
		}
	}

	return &Runner{
		config:   config,
		statuses: statuses,
	}
}

// SetCallbacks sets the callbacks for TUI integration.
func (r *Runner) SetCallbacks(callbacks RunnerCallbacks) {
	r.callbacks = callbacks
}

// Run executes all epics, respecting MaxParallel limit.
// Returns when all epics complete (or fail/conflict).
func (r *Runner) Run(ctx context.Context) (*ParallelResult, error) {
	r.startTime = time.Now()

	// Create semaphore for concurrency limit
	sem := make(chan struct{}, r.config.MaxParallel)

	// WaitGroup for all goroutines
	var wg sync.WaitGroup

	// Launch goroutines for each epic
	for _, epicID := range r.config.EpicIDs {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()

			// Acquire semaphore slot
			select {
			case sem <- struct{}{}:
				// Got slot, continue
			case <-ctx.Done():
				// Context cancelled, mark as failed
				r.updateStatus(id, "failed", nil, ctx.Err(), nil)
				return
			}

			// Release semaphore slot when done
			defer func() { <-sem }()

			// Run the epic
			r.runEpic(ctx, id)
		}(epicID)
	}

	// Wait for all epics to complete
	wg.Wait()

	return r.buildResult(), nil
}

// runEpic runs a single epic in its own worktree.
func (r *Runner) runEpic(ctx context.Context, epicID string) {
	// Check context before starting
	if ctx.Err() != nil {
		r.updateStatus(epicID, "failed", nil, ctx.Err(), nil)
		return
	}

	// Mark as running
	r.updateStatus(epicID, "running", nil, nil, nil)

	// Create worktree
	var wt *worktree.Worktree
	var err error
	if r.config.WorktreeManager != nil {
		r.sendMessage("Creating worktree for " + epicID + "...")
		wt, err = r.config.WorktreeManager.Create(epicID)
		if err != nil {
			// If worktree exists, try to get it
			if err == worktree.ErrWorktreeExists {
				r.sendMessage("Using existing worktree for " + epicID)
				wt, err = r.config.WorktreeManager.Get(epicID)
			}
			if err != nil {
				r.sendMessage("") // Clear status
				r.updateStatus(epicID, "failed", nil, err, nil)
				return
			}
		}
		r.sendMessage("") // Clear status after worktree ready

		// Store worktree in status
		r.mu.Lock()
		r.statuses[epicID].Worktree = wt
		r.mu.Unlock()
	}

	// Run engine
	var result *engine.RunResult
	if r.config.EngineFactory != nil {
		eng := r.config.EngineFactory(epicID)

		// Configure engine for this epic
		cfg := r.config.EngineConfig
		cfg.EpicID = epicID
		if wt != nil {
			cfg.UseWorktree = false // We already created the worktree
			cfg.WorkDir = wt.Path   // Pass the worktree path to the engine
		}

		result, err = eng.Run(ctx, cfg)
	}

	if err != nil {
		r.updateStatus(epicID, "failed", result, err, nil)
		r.cleanupWorktree(epicID)
		return
	}

	// Check for signals that indicate non-success
	if result != nil && (result.Signal == engine.SignalEject || result.Signal == engine.SignalBlocked) {
		r.updateStatus(epicID, "failed", result, nil, nil)
		r.cleanupWorktree(epicID)
		return
	}

	// Try to merge if we have a worktree and merge manager
	if wt != nil && r.config.MergeManager != nil {
		r.sendMessage("Merging " + epicID + "...")
		mergeResult, mergeErr := r.config.MergeManager.Merge(wt, worktree.MergeOptions{})
		if mergeResult != nil && mergeResult.TargetBranch != "" {
			r.sendMessage("Merged " + epicID + " to " + mergeResult.TargetBranch)
		} else {
			r.sendMessage("") // Clear status after merge attempt
		}
		if mergeErr != nil {
			r.updateStatus(epicID, "failed", result, mergeErr, nil)
			r.cleanupWorktree(epicID)
			return
		}

		if !mergeResult.Success {
			// Merge conflict - don't cleanup worktree, mark as conflict
			conflict := &ConflictState{
				Branch:   wt.Branch,
				Files:    mergeResult.Conflicts,
				Message:  mergeResult.ErrorMessage,
				Worktree: wt.Path,
			}
			r.updateStatus(epicID, "conflict", result, nil, conflict)
			return
		}
	}

	// Success - cleanup worktree
	r.updateStatus(epicID, "completed", result, nil, nil)
	r.cleanupWorktree(epicID)
}

// sendMessage sends a global status message via callback.
func (r *Runner) sendMessage(message string) {
	if r.callbacks.OnMessage != nil {
		r.callbacks.OnMessage(message)
	}
}

// cleanupWorktree removes the worktree for an epic if it exists.
func (r *Runner) cleanupWorktree(epicID string) {
	if r.config.WorktreeManager != nil {
		_ = r.config.WorktreeManager.Remove(epicID)
	}
}

// updateStatus updates the status of an epic and calls callbacks.
func (r *Runner) updateStatus(epicID, status string, result *engine.RunResult, err error, conflict *ConflictState) {
	r.mu.Lock()
	s := r.statuses[epicID]
	s.Status = status
	s.Result = result
	s.Error = err
	s.Conflict = conflict
	if status == "running" {
		s.StartedAt = time.Now()
	} else {
		s.CompletedAt = time.Now()
	}
	r.mu.Unlock()

	// Call callbacks outside lock
	r.notifyStatusChange(epicID, status, result, err, conflict)
}

// notifyStatusChange calls the appropriate callbacks for a status change.
func (r *Runner) notifyStatusChange(epicID, status string, result *engine.RunResult, err error, conflict *ConflictState) {
	if r.callbacks.OnStatusChange != nil {
		r.callbacks.OnStatusChange(epicID, status)
	}

	switch status {
	case "running":
		if r.callbacks.OnEpicStart != nil {
			r.callbacks.OnEpicStart(epicID)
		}
	case "completed":
		if r.callbacks.OnEpicComplete != nil {
			r.callbacks.OnEpicComplete(epicID, result)
		}
	case "failed":
		if r.callbacks.OnEpicFailed != nil {
			r.callbacks.OnEpicFailed(epicID, err)
		}
	case "conflict":
		if r.callbacks.OnEpicConflict != nil {
			r.callbacks.OnEpicConflict(epicID, conflict)
		}
	}
}

// GetStatus returns current status of an epic.
func (r *Runner) GetStatus(epicID string) *EpicStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	s, ok := r.statuses[epicID]
	if !ok {
		return nil
	}

	// Return a copy to avoid races
	copy := *s
	return &copy
}

// GetAllStatuses returns status of all epics.
func (r *Runner) GetAllStatuses() map[string]*EpicStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Return copies to avoid races
	result := make(map[string]*EpicStatus)
	for k, v := range r.statuses {
		copy := *v
		result[k] = &copy
	}
	return result
}

// buildResult aggregates the final result.
func (r *Runner) buildResult() *ParallelResult {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := &ParallelResult{
		Statuses:   make(map[string]*EpicStatus),
		AllSuccess: true,
		Duration:   time.Since(r.startTime),
	}

	for k, v := range r.statuses {
		copy := *v
		result.Statuses[k] = &copy

		if v.Status != "completed" {
			result.AllSuccess = false
		}

		// Aggregate metrics from engine results
		if v.Result != nil {
			result.TotalCost += v.Result.TotalCost
			result.TotalTokens += v.Result.TotalTokens
		}
	}

	return result
}
