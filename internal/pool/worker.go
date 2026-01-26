// Package pool provides atomic task claiming for pool-based parallel execution.
package pool

import (
	"context"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Worker represents a single pool worker that processes tasks from an epic.
type Worker struct {
	ID       int
	TickDir  string
	EpicID   string
	OnStatus StatusCallback // optional callback for status updates
}

// WorkerResult contains the execution metrics from a worker's run.
type WorkerResult struct {
	WorkerID       int
	TasksCompleted int
	TasksFailed    int
	Cost           float64
	Tokens         int
}

// NewWorker creates a new worker with the given ID and epic configuration.
func NewWorker(id int, tickDir string, epicID string) *Worker {
	return &Worker{
		ID:      id,
		TickDir: tickDir,
		EpicID:  epicID,
	}
}

// Run executes the worker loop, claiming and processing tasks until done.
// The runTask function is called to execute each claimed task, returning
// success status, cost, and token count.
func (w *Worker) Run(ctx context.Context, runTask func(ctx context.Context, task *tick.Tick) (success bool, cost float64, tokens int)) WorkerResult {
	result := WorkerResult{WorkerID: w.ID}

	for {
		// Check for cancellation
		select {
		case <-ctx.Done():
			return result
		default:
		}

		// Claim next available task
		task, err := ClaimTask(ctx, w.TickDir, w.EpicID)
		if err == ErrNoTasksAvailable {
			// Check if all tasks are done or just temporarily blocked
			if AllTasksComplete(w.TickDir, w.EpicID) {
				return result
			}
			// Wait and retry - other workers may complete blocking tasks
			select {
			case <-ctx.Done():
				return result
			case <-time.After(5 * time.Second):
				continue
			}
		}
		if err != nil {
			// Unexpected error - wait and retry
			select {
			case <-ctx.Done():
				return result
			case <-time.After(5 * time.Second):
				continue
			}
		}

		// Notify task starting
		if w.OnStatus != nil {
			w.OnStatus(TaskEvent{
				WorkerID: w.ID,
				TaskID:   task.ID,
				Title:    task.Title,
				Status:   "starting",
			})
		}

		// Run the task
		success, cost, tokens := runTask(ctx, task)

		if success {
			// Close the task on success
			if err := closeTask(w.TickDir, task.ID); err != nil {
				// Failed to close - release it back
				_ = ReleaseTask(w.TickDir, task.ID)
				result.TasksFailed++
				if w.OnStatus != nil {
					w.OnStatus(TaskEvent{
						WorkerID: w.ID,
						TaskID:   task.ID,
						Title:    task.Title,
						Status:   "failed",
						Error:    "failed to close task: " + err.Error(),
						Cost:     cost,
						Tokens:   tokens,
					})
				}
			} else {
				result.TasksCompleted++
				if w.OnStatus != nil {
					w.OnStatus(TaskEvent{
						WorkerID: w.ID,
						TaskID:   task.ID,
						Title:    task.Title,
						Status:   "completed",
						Cost:     cost,
						Tokens:   tokens,
					})
				}
			}
		} else {
			// Release the task back to open on failure
			_ = ReleaseTask(w.TickDir, task.ID)
			result.TasksFailed++
			if w.OnStatus != nil {
				w.OnStatus(TaskEvent{
					WorkerID: w.ID,
					TaskID:   task.ID,
					Title:    task.Title,
					Status:   "failed",
					Error:    "task execution failed",
					Cost:     cost,
					Tokens:   tokens,
				})
			}
		}

		result.Cost += cost
		result.Tokens += tokens
	}
}

// AllTasksComplete returns true if all tasks under the epic are closed.
// This is used to determine if the worker should exit or wait for
// blocked tasks to become available.
func AllTasksComplete(tickDir string, epicID string) bool {
	store := tick.NewStore(tickDir)

	allTicks, err := store.List()
	if err != nil {
		return false
	}

	// Check all non-epic tasks under the given epic
	for _, t := range allTicks {
		if t.Type != tick.TypeEpic && t.Parent == epicID {
			if t.Status != tick.StatusClosed {
				return false
			}
		}
	}

	return true
}

// closeTask closes a task after successful completion.
// Uses the tick.HandleClose function to properly handle required gates.
func closeTask(tickDir string, taskID string) error {
	store := tick.NewStore(tickDir)

	t, err := store.Read(taskID)
	if err != nil {
		return err
	}

	// HandleClose handles required gates (may route to human instead of closing)
	tick.HandleClose(&t, "completed by pool worker")

	return store.WriteAs(t, "pool")
}
