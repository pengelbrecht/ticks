// Package pool provides atomic task claiming for pool-based parallel execution.
package pool

import (
	"context"
	"errors"
	"sync"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// claimMu provides atomic task claiming across all pool workers.
var claimMu sync.Mutex

// ErrNoTasksAvailable is returned when no open unblocked tasks exist.
var ErrNoTasksAvailable = errors.New("no tasks available")

// ClaimTask atomically claims the next available task for the given epic.
// Returns ErrNoTasksAvailable if no open unblocked tasks exist.
// The task is transitioned to in_progress status and activity is logged.
func ClaimTask(ctx context.Context, tickDir string, epicID string) (*tick.Tick, error) {
	claimMu.Lock()
	defer claimMu.Unlock()

	store := tick.NewStore(tickDir)

	// Get all ticks to build the blocking index
	allTicks, err := store.List()
	if err != nil {
		return nil, err
	}

	// Filter to tasks under the given epic (exclude epics themselves)
	var candidates []tick.Tick
	for _, t := range allTicks {
		if t.Type != tick.TypeEpic && t.Parent == epicID && t.Status == tick.StatusOpen {
			candidates = append(candidates, t)
		}
	}

	// Find ready tasks (open, unblocked, not awaiting human)
	readyTasks := query.Ready(candidates, allTicks)
	if len(readyTasks) == 0 {
		return nil, ErrNoTasksAvailable
	}

	// Sort by priority to claim highest priority first
	query.SortByPriorityCreatedAt(readyTasks)

	// Claim the first ready task
	taskToClaim := readyTasks[0]
	taskToClaim.Start() // Sets status=in_progress, started_at=now, updated_at=now

	// Save the claimed task
	if err := store.Write(taskToClaim); err != nil {
		return nil, err
	}

	// Log the start activity
	_ = store.LogActivity(taskToClaim.ID, tick.ActivityStart, "pool", epicID, map[string]interface{}{
		"title": taskToClaim.Title,
	})

	return &taskToClaim, nil
}

// ReleaseTask resets a task back to open status (on failure or timeout).
// This allows the task to be picked up by another worker.
func ReleaseTask(tickDir string, taskID string) error {
	claimMu.Lock()
	defer claimMu.Unlock()

	store := tick.NewStore(tickDir)

	t, err := store.Read(taskID)
	if err != nil {
		return err
	}

	t.Release() // Sets status=open, started_at=nil, updated_at=now

	return store.Write(t)
}
