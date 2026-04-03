package wave

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/runrecord"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// PromptFunc builds a prompt string for a given task.
// When set on a Runner, it overrides the default simple prompt builder.
type PromptFunc func(t *tick.Tick) string

// Runner executes waves by spawning parallel agents.
// When the agent implements SessionAgent, each task in a wave gets its own
// ACP session (subprocess), running fully in parallel. Within a session,
// multiple prompts can be sent sequentially if needed.
type Runner struct {
	Agent       agent.Agent
	WorkDir     string           // Worktree path
	RecordStore *runrecord.Store // For writing live records (optional)
	Timeout     time.Duration    // Per-task timeout
	BuildPrompt PromptFunc       // Custom prompt builder (optional, uses default if nil)
}

// TaskResult contains the outcome of running a single task.
type TaskResult struct {
	TaskID    string
	Success   bool
	Output    string
	Cost      float64
	TokensIn  int
	TokensOut int
	Duration  time.Duration
	Error     error
}

// RunWave executes all tasks in a wave in parallel and returns results.
// Results are returned in the same order as w.Tasks.
// If the context is cancelled, running agents are stopped and partial
// results (with errors) are returned for unfinished tasks.
func (r *Runner) RunWave(ctx context.Context, w Wave) []TaskResult {
	results := make([]TaskResult, len(w.Tasks))
	var wg sync.WaitGroup

	for i, task := range w.Tasks {
		wg.Add(1)
		go func(i int, task *tick.Tick) {
			defer wg.Done()
			results[i] = r.runTask(ctx, task)
		}(i, task)
	}

	wg.Wait()
	return results
}

// runTask executes a single task. If the agent implements SessionAgent,
// it opens a dedicated session for this task (its own subprocess), enabling
// persistent context within the task and parallel execution across tasks.
// Otherwise, it falls back to one-shot Agent.Run().
func (r *Runner) runTask(ctx context.Context, t *tick.Tick) TaskResult {
	start := time.Now()

	var prompt string
	if r.BuildPrompt != nil {
		prompt = r.BuildPrompt(t)
	} else {
		prompt = r.defaultPrompt(t)
	}

	opts := agent.RunOpts{
		WorkDir: r.WorkDir,
		Timeout: r.Timeout,
	}

	// Set up live record callback if a record store is configured.
	if r.RecordStore != nil {
		opts.StateCallback = func(snap agent.AgentStateSnapshot) {
			// Best-effort write; ignore errors to avoid blocking the agent.
			_ = r.RecordStore.WriteLive(t.ID, snap)
		}
	}

	var res *agent.Result
	var err error

	if sa, ok := r.Agent.(agent.SessionAgent); ok {
		// Open a dedicated session for this task. Each task in the wave
		// gets its own subprocess, so they run fully in parallel.
		session, openErr := sa.Open(ctx, opts)
		if openErr != nil {
			return TaskResult{
				TaskID:   t.ID,
				Success:  false,
				Duration: time.Since(start),
				Error:    fmt.Errorf("open session: %w", openErr),
			}
		}
		defer session.Close()

		res, err = session.Prompt(ctx, prompt, opts)
	} else {
		res, err = r.Agent.Run(ctx, prompt, opts)
	}

	duration := time.Since(start)

	if err != nil {
		tr := TaskResult{
			TaskID:   t.ID,
			Success:  false,
			Duration: duration,
			Error:    err,
		}
		// Capture partial output on timeout.
		if res != nil {
			tr.Output = res.Output
			tr.Cost = res.Cost
			tr.TokensIn = res.TokensIn
			tr.TokensOut = res.TokensOut
		}
		return tr
	}

	return TaskResult{
		TaskID:    t.ID,
		Success:   true,
		Output:    res.Output,
		Cost:      res.Cost,
		TokensIn:  res.TokensIn,
		TokensOut: res.TokensOut,
		Duration:  res.Duration,
		Error:     nil,
	}
}

// defaultPrompt constructs a simple prompt for a task.
func (r *Runner) defaultPrompt(t *tick.Tick) string {
	var prompt string

	prompt = fmt.Sprintf("# Task: %s\n\n", t.Title)

	if t.Description != "" {
		prompt += fmt.Sprintf("## Description\n\n%s\n\n", t.Description)
	}

	prompt += `## Instructions

1. Complete the task as described above.
2. Run tests to verify your changes.
3. Close the task when done: ` + fmt.Sprintf("`tk close %s --reason \"<summary>\"`", t.ID) + `
4. Commit your changes with the task ID in the message.

## Signals

When you need human involvement, emit a signal:

| Signal | When to Use |
|--------|-------------|
| ` + "`<promise>COMPLETE</promise>`" + ` | All work done |
| ` + "`<promise>EJECT: reason</promise>`" + ` | Cannot complete |
| ` + "`<promise>INPUT_NEEDED: question</promise>`" + ` | Need human input |
| ` + "`<promise>ESCALATE: issue</promise>`" + ` | Unexpected issue |

Begin working on the task now.
`
	return prompt
}
