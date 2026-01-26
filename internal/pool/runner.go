// Package pool provides atomic task claiming for pool-based parallel execution.
package pool

import (
	"context"
	"sync"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// RunTaskFunc is the signature for task execution functions used by pool workers.
// Returns success status, cost in USD, and token count.
type RunTaskFunc func(ctx context.Context, task *tick.Tick) (success bool, cost float64, tokens int)

// TaskEvent represents a status update from a pool worker.
type TaskEvent struct {
	WorkerID int
	TaskID   string
	Title    string
	Status   string // "starting", "completed", "failed"
	Error    string // only set when Status == "failed"
	Cost     float64
	Tokens   int
}

// StatusCallback is called when a worker's task status changes.
type StatusCallback func(event TaskEvent)

// Config contains the configuration for running a pool of workers.
type Config struct {
	PoolSize     int
	StaleTimeout time.Duration // default 1h
	EpicID       string
	TickDir      string
	RunTask      RunTaskFunc
	OnStatus     StatusCallback // optional callback for task status updates
}

// Result contains the aggregated results from all workers in a pool run.
type Result struct {
	TasksCompleted int
	TasksFailed    int
	TotalCost      float64
	TotalTokens    int
	Duration       time.Duration
	WorkerResults  []WorkerResult
	StaleTasks     int // tasks recovered at startup
}

// RunPool is the main coordinator that runs a pool of workers to process tasks.
// It recovers any stale tasks, spawns the configured number of workers,
// waits for all workers to complete, and aggregates the results.
func RunPool(ctx context.Context, cfg Config) (*Result, error) {
	start := time.Now()

	// Apply default stale timeout if not set
	if cfg.StaleTimeout == 0 {
		cfg.StaleTimeout = time.Hour
	}

	// 1. Stale recovery - reset any abandoned tasks
	staleTasks, err := RecoverStaleTasks(cfg.TickDir, cfg.EpicID, cfg.StaleTimeout)
	if err != nil {
		// Continue anyway - this is not fatal
		staleTasks = 0
	}

	// 2. Spawn workers
	var wg sync.WaitGroup
	results := make(chan WorkerResult, cfg.PoolSize)

	for i := 0; i < cfg.PoolSize; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			w := NewWorker(workerID, cfg.TickDir, cfg.EpicID)
			w.OnStatus = cfg.OnStatus
			results <- w.Run(ctx, cfg.RunTask)
		}(i)
	}

	// 3. Wait and aggregate
	wg.Wait()
	close(results)

	result := aggregateResults(results)
	result.StaleTasks = staleTasks
	result.Duration = time.Since(start)

	return result, nil
}

// aggregateResults combines results from all workers into a single Result.
func aggregateResults(results <-chan WorkerResult) *Result {
	result := &Result{
		WorkerResults: make([]WorkerResult, 0),
	}

	for wr := range results {
		result.TasksCompleted += wr.TasksCompleted
		result.TasksFailed += wr.TasksFailed
		result.TotalCost += wr.Cost
		result.TotalTokens += wr.Tokens
		result.WorkerResults = append(result.WorkerResults, wr)
	}

	return result
}
