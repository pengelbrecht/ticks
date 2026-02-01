// Package pool provides atomic task claiming for pool-based parallel execution.
package pool

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sync"
	"sync/atomic"
	"time"
)

// PoolReporter formats and outputs pool run status.
// Supports both human-readable and JSONL output modes.
type PoolReporter struct {
	jsonl         bool
	writer        io.Writer
	epicID        string
	poolSize      int
	activeWorkers int32 // atomic counter
	currentPhase  int
	totalPhases   int
	mu            sync.Mutex
}

// NewPoolReporter creates a new pool reporter.
func NewPoolReporter(jsonl bool, epicID string, poolSize, totalPhases int) *PoolReporter {
	return &PoolReporter{
		jsonl:       jsonl,
		writer:      os.Stdout,
		epicID:      epicID,
		poolSize:    poolSize,
		totalPhases: totalPhases,
	}
}

// PhaseStart outputs the start of a phase.
func (r *PoolReporter) PhaseStart(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.currentPhase++

	if r.jsonl {
		r.writeJSON(map[string]interface{}{
			"type":  "phase_start",
			"phase": name,
			"index": r.currentPhase,
			"total": r.totalPhases,
		})
	} else {
		fmt.Fprintf(r.writer, "[%d/%d] %s...", r.currentPhase, r.totalPhases, name)
	}
}

// PhaseDone outputs phase completion.
func (r *PoolReporter) PhaseDone(detail string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.jsonl {
		r.writeJSON(map[string]interface{}{
			"type":   "phase_done",
			"phase":  r.currentPhase,
			"detail": detail,
		})
	} else {
		fmt.Fprintf(r.writer, " %s\n", detail)
	}
}

// PhaseSkip outputs that a phase was skipped.
func (r *PoolReporter) PhaseSkip(name, reason string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.currentPhase++

	if r.jsonl {
		r.writeJSON(map[string]interface{}{
			"type":   "phase_skip",
			"phase":  name,
			"reason": reason,
		})
	} else {
		fmt.Fprintf(r.writer, "[%d/%d] %s... Skipped (%s)\n", r.currentPhase, r.totalPhases, name, reason)
	}
}

// TaskStart outputs when a worker starts a task.
func (r *PoolReporter) TaskStart(workerID int, taskID, title string) {
	active := atomic.AddInt32(&r.activeWorkers, 1)

	if r.jsonl {
		r.writeJSON(map[string]interface{}{
			"type":      "task_start",
			"worker_id": workerID,
			"task_id":   taskID,
			"title":     title,
			"active":    active,
		})
	} else {
		fmt.Fprintf(r.writer, "Worker %d -> [%s] %s (%d of %d active)\n",
			workerID, taskID, truncate(title, 50), active, r.poolSize)
	}
}

// TaskDone outputs when a worker completes a task.
func (r *PoolReporter) TaskDone(workerID int, taskID, title string, cost float64, duration time.Duration) {
	atomic.AddInt32(&r.activeWorkers, -1)

	if r.jsonl {
		r.writeJSON(map[string]interface{}{
			"type":        "task_done",
			"worker_id":   workerID,
			"task_id":     taskID,
			"title":       title,
			"cost":        cost,
			"duration_ms": duration.Milliseconds(),
		})
	} else {
		fmt.Fprintf(r.writer, "Worker %d OK [%s] %s ($%.2f, %s)\n",
			workerID, taskID, truncate(title, 50), cost, formatDuration(duration))
	}
}

// TaskFail outputs when a worker fails a task.
func (r *PoolReporter) TaskFail(workerID int, taskID, title, errMsg string) {
	atomic.AddInt32(&r.activeWorkers, -1)

	if r.jsonl {
		r.writeJSON(map[string]interface{}{
			"type":      "task_fail",
			"worker_id": workerID,
			"task_id":   taskID,
			"title":     title,
			"error":     errMsg,
		})
	} else {
		if errMsg != "" {
			fmt.Fprintf(r.writer, "Worker %d FAIL [%s] %s (%s)\n",
				workerID, taskID, truncate(title, 50), errMsg)
		} else {
			fmt.Fprintf(r.writer, "Worker %d FAIL [%s] %s\n",
				workerID, taskID, truncate(title, 50))
		}
	}
}

// Summary outputs the final summary.
func (r *PoolReporter) Summary(result *Result) {
	if r.jsonl {
		r.writeJSON(map[string]interface{}{
			"type":            "complete",
			"epic_id":         r.epicID,
			"tasks_completed": result.TasksCompleted,
			"tasks_failed":    result.TasksFailed,
			"total_cost":      result.TotalCost,
			"total_tokens":    result.TotalTokens,
			"duration_sec":    result.Duration.Seconds(),
			"stale_tasks":     result.StaleTasks,
			"worker_count":    len(result.WorkerResults),
		})
	} else {
		fmt.Fprintf(r.writer, "\n=== Pool Run Complete ===\n")
		fmt.Fprintf(r.writer, "Epic: %s\n", r.epicID)
		fmt.Fprintf(r.writer, "Tasks completed: %d, failed: %d\n", result.TasksCompleted, result.TasksFailed)
		fmt.Fprintf(r.writer, "Total cost: $%.2f\n", result.TotalCost)
		fmt.Fprintf(r.writer, "Duration: %s\n", formatDuration(result.Duration))
		if result.StaleTasks > 0 {
			fmt.Fprintf(r.writer, "Stale tasks recovered: %d\n", result.StaleTasks)
		}
		fmt.Fprintf(r.writer, "\nWorker breakdown:\n")
		for _, wr := range result.WorkerResults {
			fmt.Fprintf(r.writer, "  Worker %d: %d completed, %d failed, $%.2f\n",
				wr.WorkerID, wr.TasksCompleted, wr.TasksFailed, wr.Cost)
		}
	}
}

// writeJSON writes a JSON object to the output.
func (r *PoolReporter) writeJSON(v interface{}) {
	enc := json.NewEncoder(r.writer)
	_ = enc.Encode(v)
}

// formatDuration formats a duration in a human-readable way.
func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		mins := int(d.Minutes())
		secs := int(d.Seconds()) % 60
		return fmt.Sprintf("%dm %ds", mins, secs)
	}
	hours := int(d.Hours())
	mins := int(d.Minutes()) % 60
	return fmt.Sprintf("%dh %dm", hours, mins)
}

// truncate truncates a string to maxLen, adding "..." if truncated.
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}
