package wrapup

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
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

// stepGroup holds steps that share the same Group number.
type stepGroup struct {
	groupNum int
	steps    []indexedStep
}

// indexedStep pairs a step with its original index in the flat list.
type indexedStep struct {
	index int
	step  WrapupStep
}

// groupSteps partitions steps into groups ordered by Group number.
// Group 0 steps each become their own single-step group.
func groupSteps(steps []WrapupStep) []stepGroup {
	byGroup := make(map[int][]indexedStep)
	for i, s := range steps {
		byGroup[s.Group] = append(byGroup[s.Group], indexedStep{index: i, step: s})
	}

	var groups []stepGroup

	// Group 0 steps each form their own group (sequential, one at a time).
	if zeroSteps, ok := byGroup[0]; ok {
		for _, is := range zeroSteps {
			groups = append(groups, stepGroup{groupNum: 0, steps: []indexedStep{is}})
		}
		delete(byGroup, 0)
	}

	// Collect remaining groups (ordering handled by final sort below).
	for g, steps := range byGroup {
		groups = append(groups, stepGroup{groupNum: g, steps: steps})
	}

	// Sort all groups by the minimum step index to preserve original ordering.
	sort.Slice(groups, func(i, j int) bool {
		return groups[i].steps[0].index < groups[j].steps[0].index
	})

	return groups
}

// RunAgentSteps executes wrapup steps using the provided agent.
// Steps are grouped by their Group field: steps with the same Group number
// run in parallel (each in its own session), while groups execute sequentially.
// Group 0 steps run sequentially as individual groups.
// If the agent does not implement SessionAgent, all steps run sequentially.
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
	results := make([]AgentStepResult, len(steps))

	var completedTitles []string

	// Recover already-completed steps from previous run
	recoveredCount := 0
	if existing != nil {
		for _, entry := range existing.Steps {
			if entry.Status == "completed" || entry.Status == "escalated" {
				recoveredCount++
			} else {
				break
			}
		}
		// Map recovered entries back to results by matching title+position
		for i := 0; i < recoveredCount && i < len(steps) && i < len(existing.Steps); i++ {
			entry := existing.Steps[i]
			results[i] = AgentStepResult{
				Title:     entry.Title,
				Status:    entry.Status,
				Cost:      entry.Cost,
				TokensIn:  entry.TokensIn,
				TokensOut: entry.TokensOut,
				Duration:  entry.Duration,
				Attempts:  entry.Attempts,
			}
			completedTitles = append(completedTitles, entry.Title)
		}
		startedAt = existing.StartedAt
	}

	opts := agent.RunOpts{
		WorkDir: wr.WorkDir,
		Timeout: wr.Timeout,
	}

	sa, useSession := agentImpl.(agent.SessionAgent)

	groups := groupSteps(steps)

	// Determine which groups to skip based on recovery.
	// A group is skipped if ALL its steps were recovered.
	groupStartIdx := 0
	for groupStartIdx < len(groups) {
		grp := groups[groupStartIdx]
		allRecovered := true
		for _, is := range grp.steps {
			if is.index >= recoveredCount {
				allRecovered = false
				break
			}
		}
		if !allRecovered {
			break
		}
		groupStartIdx++
	}

	// Lazily opened shared session for sequential steps.
	var sharedSession agent.Session
	openSharedSession := func() (agent.Session, error) {
		if sharedSession != nil {
			return sharedSession, nil
		}
		var err error
		sharedSession, err = sa.Open(ctx, opts)
		return sharedSession, err
	}
	defer func() {
		if sharedSession != nil {
			sharedSession.Close()
		}
	}()

	// Incremental progress accumulator for saving after each group.
	var progressResults []AgentStepResult
	for _, g := range groups[:groupStartIdx] {
		for _, is := range g.steps {
			progressResults = append(progressResults, results[is.index])
		}
	}

	for gi := groupStartIdx; gi < len(groups); gi++ {
		grp := groups[gi]

		canParallel := useSession && len(grp.steps) > 1

		if canParallel {
			var mu sync.Mutex
			var wg sync.WaitGroup

			for _, is := range grp.steps {
				if is.index < recoveredCount {
					continue
				}
				wg.Add(1)
				go func(is indexedStep) {
					defer wg.Done()
					result := wr.runSingleStep(ctx, is.step, is.index, len(steps), completedTitles, sa, nil, opts, maxRetries, true)
					mu.Lock()
					results[is.index] = result
					mu.Unlock()
				}(is)
			}
			wg.Wait()
		} else {
			for _, is := range grp.steps {
				if is.index < recoveredCount {
					continue
				}
				var sess agent.Session
				if useSession {
					var err error
					sess, err = openSharedSession()
					if err != nil {
						return nil, fmt.Errorf("open session: %w", err)
					}
				}
				result := wr.runSingleStep(ctx, is.step, is.index, len(steps), completedTitles, agentImpl, sess, opts, maxRetries, false)
				results[is.index] = result
				if result.Status == "completed" {
					completedTitles = append(completedTitles, result.Title)
				}
			}
		}

		// Collect completed titles after parallel group
		if canParallel {
			for _, is := range grp.steps {
				if results[is.index].Status == "completed" {
					completedTitles = append(completedTitles, results[is.index].Title)
				}
			}
		}

		// Append this group's results and save progress
		for _, is := range grp.steps {
			progressResults = append(progressResults, results[is.index])
		}
		if err := saveProgress(logsDir, epicID, progressResults, startedAt); err != nil {
			if wr.Output != nil {
				wr.Output.Warn("failed to save wrapup progress: %v", err)
			}
		}
	}

	return results, nil
}

// runSingleStep executes a single wrapup step with retries.
// If openOwnSession is true, it opens (and closes) its own session via the SessionAgent.
// Otherwise it uses the provided session (or falls back to one-shot Run).
func (wr *WrapupRunner) runSingleStep(
	ctx context.Context,
	step WrapupStep,
	index, total int,
	completedTitles []string,
	agentImpl agent.Agent,
	session agent.Session,
	opts agent.RunOpts,
	maxRetries int,
	openOwnSession bool,
) AgentStepResult {
	stepStart := time.Now()

	if wr.Output != nil {
		wr.Output.WrapupAgentStepStarted(index+1, total, step.Title)
	}

	prompt := BuildStepPrompt(step, index, total, completedTitles)

	var stepResult AgentStepResult
	stepResult.Title = step.Title

	var ownSession agent.Session
	if openOwnSession {
		sa := agentImpl.(agent.SessionAgent)
		var err error
		ownSession, err = sa.Open(ctx, opts)
		if err != nil {
			stepResult.Status = "failed"
			stepResult.Error = err
			stepResult.ErrorMsg = err.Error()
			stepResult.Duration = time.Since(stepStart)
			if wr.Output != nil {
				wr.Output.WrapupAgentStepCompleted(index+1, total, step.Title, stepResult.Status, stepResult.Duration)
			}
			return stepResult
		}
		defer ownSession.Close()
		session = ownSession
	}

	var totalCost float64
	var totalIn, totalOut int

	for attempt := 0; attempt <= maxRetries; attempt++ {
		stepResult.Attempts = attempt + 1

		if attempt > 0 && wr.Output != nil {
			wr.Output.Warn("Retrying step %d: %s (attempt %d)", index+1, step.Title, attempt+1)
		}

		var result *agent.Result
		var err error

		if session != nil {
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

		if attempt < maxRetries {
			prompt = BuildRetryPrompt(step)
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
		wr.Output.WrapupAgentStepCompleted(index+1, total, step.Title, stepResult.Status, stepResult.Duration)
	}

	return stepResult
}
