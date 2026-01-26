// Package pool provides atomic task claiming for pool-based parallel execution.
package pool

import (
	"log"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// RecoverStaleTasks resets in_progress tasks older than timeout back to open.
// It scans all tasks under the given epic, checks if they have been in_progress
// for longer than the timeout duration, and releases them back to open status
// so they can be picked up by another worker.
//
// Returns the count of recovered tasks and any error encountered.
func RecoverStaleTasks(tickDir string, epicID string, timeout time.Duration) (int, error) {
	store := tick.NewStore(tickDir)

	// Get all ticks
	allTicks, err := store.List()
	if err != nil {
		return 0, err
	}

	// Filter to in_progress tasks under the given epic
	var inProgressTasks []tick.Tick
	for _, t := range allTicks {
		if t.Type != tick.TypeEpic && t.Parent == epicID && t.Status == tick.StatusInProgress {
			inProgressTasks = append(inProgressTasks, t)
		}
	}

	recovered := 0
	for _, t := range inProgressTasks {
		if t.StartedAt == nil {
			continue
		}
		if time.Since(*t.StartedAt) > timeout {
			if err := ReleaseTask(tickDir, t.ID); err != nil {
				log.Printf("failed to recover stale task %s: %v", t.ID, err)
				continue
			}

			// Log stale recovery activity
			_ = store.LogActivity(t.ID, tick.ActivityStaleRecovery, "pool", epicID, map[string]interface{}{
				"title":       t.Title,
				"stale_since": t.StartedAt.Format(time.RFC3339),
				"timeout":     timeout.String(),
			})
			recovered++
		}
	}

	return recovered, nil
}
