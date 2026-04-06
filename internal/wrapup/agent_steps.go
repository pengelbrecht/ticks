package wrapup

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/engine"
	"github.com/pengelbrecht/ticks/internal/output"
)

// AgentStepResult holds the outcome and metrics of a single agent-driven wrapup step.
type AgentStepResult struct {
	Title     string        `json:"title"`
	Status    string        `json:"status"` // completed, failed, escalated
	Cost      float64       `json:"cost"`
	TokensIn  int           `json:"tokens_in"`
	TokensOut int           `json:"tokens_out"`
	Duration  time.Duration `json:"duration"`
	Attempts  int           `json:"attempts"`
	Error     error         `json:"-"`
	ErrorMsg  string        `json:"error,omitempty"`
}

// StepProgressEntry records per-step progress for crash recovery.
type StepProgressEntry struct {
	Title     string        `json:"title"`
	Status    string        `json:"status"` // completed, failed, escalated, pending
	Attempts  int           `json:"attempts"`
	Cost      float64       `json:"cost"`
	TokensIn  int           `json:"tokens_in"`
	TokensOut int           `json:"tokens_out"`
	Duration  time.Duration `json:"duration"`
}

// StepProgress tracks overall wrapup progress for crash recovery.
type StepProgress struct {
	EpicID    string              `json:"epic_id"`
	StartedAt time.Time           `json:"started_at"`
	Steps     []StepProgressEntry `json:"steps"`
}

// WrapupRunner executes agent-driven wrapup steps.
type WrapupRunner struct {
	WorkDir           string
	TickDir           string
	Timeout           time.Duration
	MaxRetriesPerStep int
	Output            *output.RunOutput
}

const defaultMaxRetries = 2

// progressDir returns the path to the wrapup-progress directory.
func progressDir(logsDir string) string {
	return filepath.Join(logsDir, "wrapup-progress")
}

// progressPath returns the path to a progress file for a given epic.
func progressPath(logsDir, epicID string) string {
	return filepath.Join(progressDir(logsDir), epicID+".json")
}

// saveProgress persists current step results for crash recovery.
func saveProgress(logsDir, epicID string, results []AgentStepResult, startedAt time.Time) error {
	dir := progressDir(logsDir)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("creating progress dir: %w", err)
	}

	progress := StepProgress{
		EpicID:    epicID,
		StartedAt: startedAt,
	}
	for _, r := range results {
		progress.Steps = append(progress.Steps, StepProgressEntry{
			Title:     r.Title,
			Status:    r.Status,
			Attempts:  r.Attempts,
			Cost:      r.Cost,
			TokensIn:  r.TokensIn,
			TokensOut: r.TokensOut,
			Duration:  r.Duration,
		})
	}

	data, err := json.MarshalIndent(progress, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling progress: %w", err)
	}

	if err := os.WriteFile(progressPath(logsDir, epicID), data, 0o644); err != nil {
		return fmt.Errorf("writing progress: %w", err)
	}

	return nil
}

// loadProgress loads saved progress for crash recovery.
// Returns nil if no progress file exists.
func loadProgress(logsDir, epicID string) *StepProgress {
	data, err := os.ReadFile(progressPath(logsDir, epicID))
	if err != nil {
		return nil
	}

	var progress StepProgress
	if err := json.Unmarshal(data, &progress); err != nil {
		return nil
	}

	return &progress
}

// RunAgentSteps executes wrapup steps using the provided agent.
// If the agent implements SessionAgent, a single session is used across all steps.
// Otherwise, each step uses a one-shot Run() call.
func (wr *WrapupRunner) RunAgentSteps(ctx context.Context, steps []WrapupStep, epicID string, agentImpl agent.Agent) ([]AgentStepResult, error) {
	if len(steps) == 0 {
		return nil, nil
	}

	maxRetries := wr.MaxRetriesPerStep
	if maxRetries <= 0 {
		maxRetries = defaultMaxRetries
	}

	logsDir := filepath.Join(wr.TickDir, "logs")
	startedAt := time.Now()

	// Load existing progress for crash recovery
	existing := loadProgress(logsDir, epicID)
	results := make([]AgentStepResult, 0, len(steps))

	// Build list of completed step titles for progress display
	var completedTitles []string

	// Skip already-completed steps from previous run
	skipCount := 0
	if existing != nil {
		for _, entry := range existing.Steps {
			if entry.Status == "completed" || entry.Status == "escalated" {
				skipCount++
				results = append(results, AgentStepResult{
					Title:     entry.Title,
					Status:    entry.Status,
					Cost:      entry.Cost,
					TokensIn:  entry.TokensIn,
					TokensOut: entry.TokensOut,
					Duration:  entry.Duration,
					Attempts:  entry.Attempts,
				})
				completedTitles = append(completedTitles, entry.Title)
			} else {
				break
			}
		}
		startedAt = existing.StartedAt
	}

	opts := agent.RunOpts{
		WorkDir: wr.WorkDir,
		Timeout: wr.Timeout,
	}

	// Determine execution mode: session vs one-shot
	sa, useSession := agentImpl.(agent.SessionAgent)

	var session agent.Session
	if useSession {
		var err error
		session, err = sa.Open(ctx, opts)
		if err != nil {
			return nil, fmt.Errorf("open session: %w", err)
		}
		defer session.Close()
	}

	for i := skipCount; i < len(steps); i++ {
		step := steps[i]
		stepStart := time.Now()

		if wr.Output != nil {
			wr.Output.WrapupAgentStep(i+1, len(steps), step.Title, "running")
		}

		prompt := BuildStepPrompt(step, i, len(steps), completedTitles)

		var stepResult AgentStepResult
		stepResult.Title = step.Title

		var totalCost float64
		var totalIn, totalOut int

		for attempt := 0; attempt <= maxRetries; attempt++ {
			stepResult.Attempts = attempt + 1

			if attempt > 0 && wr.Output != nil {
				wr.Output.Warn("Retrying step %d: %s (attempt %d)", i+1, step.Title, attempt+1)
			}

			var result *agent.Result
			var err error

			if useSession {
				result, err = session.Prompt(ctx, prompt, opts)
			} else {
				result, err = agentImpl.Run(ctx, prompt, opts)
			}

			if err != nil {
				stepResult.Status = "failed"
				stepResult.Error = err
				stepResult.ErrorMsg = err.Error()
				stepResult.Duration = time.Since(stepStart)
				break
			}

			totalCost += result.Cost
			totalIn += result.TokensIn
			totalOut += result.TokensOut

			signal, reason := engine.ParseSignals(result.Output)

			if signal == engine.SignalStepDone {
				stepResult.Status = "completed"
				break
			}

			if signal == engine.SignalEscalate {
				stepResult.Status = "escalated"
				stepResult.ErrorMsg = reason
				break
			}

			// No recognized signal — retry if we have attempts left
			if attempt < maxRetries {
				prompt = BuildRetryPrompt(step, result.Output)
			} else {
				stepResult.Status = "failed"
				stepResult.ErrorMsg = "max retries exceeded without STEP_DONE signal"
			}
		}

		stepResult.Cost = totalCost
		stepResult.TokensIn = totalIn
		stepResult.TokensOut = totalOut
		if stepResult.Duration == 0 {
			stepResult.Duration = time.Since(stepStart)
		}

		if wr.Output != nil {
			wr.Output.WrapupAgentStep(i+1, len(steps), step.Title, stepResult.Status)
		}

		results = append(results, stepResult)

		if stepResult.Status == "completed" {
			completedTitles = append(completedTitles, step.Title)
		}

		// Save progress after each step
		if err := saveProgress(logsDir, epicID, results, startedAt); err != nil {
			if wr.Output != nil {
				wr.Output.Warn("failed to save wrapup progress: %v", err)
			} else {
				fmt.Fprintf(os.Stderr, "Warning: failed to save wrapup progress: %v\n", err)
			}
		}
	}

	return results, nil
}
