package engine

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/budget"
	configpkg "github.com/pengelbrecht/ticks/internal/config"
	epiccontext "github.com/pengelbrecht/ticks/internal/context"
	"github.com/pengelbrecht/ticks/internal/output"
	"github.com/pengelbrecht/ticks/internal/runrecord"
	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/ticks"
	"github.com/pengelbrecht/ticks/internal/wave"
)

// TicksClient defines the interface for ticks operations used by the Engine.
// This allows for mocking in tests while the production code uses *ticks.Client.
type TicksClient interface {
	GetEpic(epicID string) (*ticks.Epic, error)
	GetTask(taskID string) (*ticks.Task, error)
	NextTask(epicID string) (*ticks.Task, error)
	ListTasks(epicID string) ([]ticks.Task, error)
	HasOpenTasks(epicID string) (bool, error)
	CloseTask(taskID, reason string) error
	CloseEpic(epicID, reason string) error
	ReopenTask(taskID string) error
	AddNote(issueID, message string, extraArgs ...string) error
	GetNotes(epicID string) ([]string, error)
	GetHumanNotes(issueID string) ([]ticks.Note, error)
	SetStatus(issueID, status string) error
	SetAwaiting(taskID, awaiting, note string) error
	SetRunRecord(taskID string, record *agent.RunRecord) error
	GetRunRecord(taskID string) (*agent.RunRecord, error)
	ListTickTasks(epicID string) ([]*tick.Tick, error)
}

// Engine orchestrates the wave-based execution loop.
type Engine struct {
	agent  agent.Agent
	ticks  TicksClient
	budget *budget.Tracker
	prompt *PromptBuilder

	// Context generation components (optional)
	contextStore     *epiccontext.Store
	contextGenerator *epiccontext.Generator

	// Run record store for live file tracking (optional, used by wave.Runner)
	runRecordStore *runrecord.Store

	// Output is the unified output sink for all run events.
	// When nil, all output is silently discarded (safe for tests).
	Output *output.RunOutput
}

// RunConfig configures an engine run.
type RunConfig struct {
	// EpicID is the epic to work on.
	EpicID string

	// TickDir is the path to the .tick directory.
	TickDir string

	// WorkDir is the working directory for agents (worktree path).
	// The engine does not manage worktree lifecycle - that's run.go's job.
	WorkDir string

	// MaxIterations is the maximum number of wave iterations (0 = 50 default).
	MaxIterations int

	// MaxCost is the maximum cost in USD (0 = disabled/unlimited).
	MaxCost float64

	// MaxDuration is the maximum wall-clock time (0 = unlimited).
	MaxDuration time.Duration

	// AgentTimeout is the per-task timeout for the agent (0 = 30 minutes default).
	AgentTimeout time.Duration

	// MaxTaskRetries is the maximum retries per task before marking stuck (0 = 3 default).
	MaxTaskRetries int

	// Watch enables watch mode - engine idles when no tasks available instead of exiting.
	Watch bool

	// WatchTimeout is the maximum duration to watch for tasks (0 = unlimited).
	// Only used when Watch is true.
	WatchTimeout time.Duration

	// WatchPollInterval is how often to poll for new tasks when idle (0 = 10s default).
	// Only used when Watch is true.
	WatchPollInterval time.Duration

	// Policy contains Tickflow policy controls loaded from config.
	// When nil, defaults are used.
	Policy *configpkg.PolicyConfig
}

// Defaults for RunConfig.
const (
	DefaultMaxIterations     = 50
	DefaultMaxCost           = 0 // Disabled by default (most users have subscriptions)
	DefaultAgentTimeout      = 30 * time.Minute
	DefaultMaxTaskRetries    = 3
	DefaultWatchPollInterval = 10 * time.Second
)

// Exit reason constants for worktree cleanup decisions.
const (
	// ExitReasonAllTasksCompleted indicates epic is fully done - cleanup worktree.
	ExitReasonAllTasksCompleted = "all tasks completed"

	// ExitReasonNoTasksFound indicates no tasks to work on - cleanup worktree.
	ExitReasonNoTasksFound = "no tasks found"

	// ExitReasonTasksAwaitingHuman indicates tasks are blocked/awaiting - preserve worktree.
	ExitReasonTasksAwaitingHuman = "no ready tasks (remaining tasks are blocked or awaiting human)"

	// ExitReasonWatchTimeout indicates watch mode timed out - preserve worktree.
	ExitReasonWatchTimeout = "watch timeout"
)

// ShouldCleanupWorktree determines if a worktree should be removed based on exit reason.
// Returns true only when the epic is fully complete (all tasks done or no tasks found).
// Returns false for handoffs, budget limits, interruptions, and other cases where
// the worktree should be preserved for resumption.
func ShouldCleanupWorktree(exitReason string) bool {
	switch exitReason {
	case ExitReasonAllTasksCompleted, ExitReasonNoTasksFound:
		return true
	default:
		return false
	}
}

// RunResult contains the outcome of an engine run.
type RunResult struct {
	// EpicID is the epic that was worked on.
	EpicID string

	// Iterations is the total number of wave iterations completed.
	Iterations int

	// TotalTokens is the cumulative token usage.
	TotalTokens int

	// TotalCost is the cumulative cost in USD.
	TotalCost float64

	// Duration is the total wall-clock time.
	Duration time.Duration

	// CompletedTasks lists task IDs that were closed.
	CompletedTasks []string

	// Signal is the exit signal (if any).
	Signal Signal

	// SignalReason is the reason for EJECT or BLOCKED signals.
	SignalReason string

	// ExitReason describes why the run ended.
	ExitReason string
}

// IterationResult contains the outcome of a single task within a wave.
type IterationResult struct {
	// Iteration is the wave iteration number (1-indexed).
	Iteration int

	// TaskID is the task that was worked on.
	TaskID string

	// TaskTitle is the title of the task.
	TaskTitle string

	// Output is the agent's full output.
	Output string

	// TokensIn is the input token count.
	TokensIn int

	// TokensOut is the output token count.
	TokensOut int

	// Cost is the iteration cost in USD.
	Cost float64

	// Duration is how long the iteration took.
	Duration time.Duration

	// Signal is any signal detected in the output.
	Signal Signal

	// SignalReason is the reason for EJECT or BLOCKED signals.
	SignalReason string

	// Error is any error that occurred.
	Error error

	// IsTimeout indicates the iteration was terminated due to timeout.
	// When true, Output may contain partial output captured before timeout.
	IsTimeout bool
}

// NewEngine creates a new engine with the given dependencies.
func NewEngine(a agent.Agent, t TicksClient, b *budget.Tracker) *Engine {
	return &Engine{
		agent:  a,
		ticks:  t,
		budget: b,
		prompt: NewPromptBuilder(),
	}
}

// SetContextComponents sets the context store and generator for epic context.
// When both are set, the engine will generate context before the first wave
// of an epic (if the epic has >1 children and context doesn't already exist).
func (e *Engine) SetContextComponents(store *epiccontext.Store, generator *epiccontext.Generator) {
	e.contextStore = store
	e.contextGenerator = generator
}

// ensureEpicContext generates epic context if needed.
// Context is generated when:
//   - Context store and generator are configured
//   - Context doesn't already exist for this epic
//   - Epic has >1 children (no benefit for single-task epics)
//
// Errors are logged but do not abort the run (context is optional).
func (e *Engine) ensureEpicContext(ctx context.Context, epic *ticks.Epic) {
	// Skip if context components are not configured
	if e.contextStore == nil || e.contextGenerator == nil {
		return
	}

	// Skip if context already exists - will be loaded in loadEpicContext
	if e.contextStore.Exists(epic.ID) {
		if e.Output != nil {
			e.Output.ContextSkipped(epic.ID, "already exists")
		}
		return
	}

	// Get epic tasks to check count and for generation
	tasks, err := e.ticks.ListTasks(epic.ID)
	if err != nil {
		if e.Output != nil {
			e.Output.ContextError(epic.ID, err.Error(), "list_tasks")
		}
		return
	}

	// Skip for epics with ≤1 children (no amortization benefit)
	if len(tasks) <= 1 {
		if e.Output != nil {
			e.Output.ContextSkipped(epic.ID, "single-task epic")
		}
		return
	}

	// Signal context generation start
	if e.Output != nil {
		e.Output.ContextGenerating(epic.ID, len(tasks))
		e.Output.EpicStatus(epic.ID, &runrecord.EpicStatus{
			EpicID:    epic.ID,
			Status:    "context_generating",
			Message:   fmt.Sprintf("Generating epic context (%d tasks)...", len(tasks)),
			TaskCount: len(tasks),
		})
	}

	// Generate context using the AI agent
	var progressFn epiccontext.ProgressFunc
	if e.Output != nil {
		epicID := epic.ID
		out := e.Output
		progressFn = func(elapsed time.Duration, tokensIn, tokensOut int) {
			out.ContextProgress(epicID, elapsed, tokensIn, tokensOut)
		}
	}
	content, err := e.contextGenerator.GenerateWithProgress(ctx, epic, tasks, progressFn)
	if err != nil {
		if e.Output != nil {
			e.Output.ContextGenerationFailed(epic.ID, err.Error())
			e.Output.EpicStatus(epic.ID, &runrecord.EpicStatus{
				EpicID:  epic.ID,
				Status:  "context_failed",
				Message: fmt.Sprintf("Context generation failed: %s", err.Error()),
			})
		}
		return
	}

	// Save the generated context
	if err := e.contextStore.Save(epic.ID, content); err != nil {
		if e.Output != nil {
			e.Output.ContextSaveFailed(epic.ID, err.Error())
			e.Output.EpicStatus(epic.ID, &runrecord.EpicStatus{
				EpicID:  epic.ID,
				Status:  "context_failed",
				Message: fmt.Sprintf("Context save failed: %s", err.Error()),
			})
		}
		return
	}

	tokenCount := len(content) / 4
	if e.Output != nil {
		e.Output.ContextGenerated(epic.ID, tokenCount)
		e.Output.EpicStatus(epic.ID, &runrecord.EpicStatus{
			EpicID:     epic.ID,
			Status:     "context_generated",
			Message:    fmt.Sprintf("Context generated (~%d tokens)", tokenCount),
			TokenCount: tokenCount,
		})
	}
}

// loadEpicContext loads the epic context from storage.
// Returns empty string if context doesn't exist or components aren't configured.
func (e *Engine) loadEpicContext(epicID string) string {
	if e.contextStore == nil {
		return ""
	}

	content, err := e.contextStore.Load(epicID)
	if err != nil {
		if e.Output != nil {
			e.Output.ContextFailed(epicID, err.Error())
		}
		return ""
	}

	if content != "" && e.Output != nil {
		e.Output.ContextLoaded(epicID)
		tokenCount := len(content) / 4
		e.Output.EpicStatus(epicID, &runrecord.EpicStatus{
			EpicID:     epicID,
			Status:     "context_loaded",
			Message:    fmt.Sprintf("Using existing context (~%d tokens)", tokenCount),
			TokenCount: tokenCount,
		})
	}

	return content
}

// SetRunRecordStore sets the run record store for live file tracking.
func (e *Engine) SetRunRecordStore(s *runrecord.Store) {
	e.runRecordStore = s
}

// Run executes the wave-based engine loop until completion, signal, or budget exceeded.
func (e *Engine) Run(ctx context.Context, config RunConfig) (result *RunResult, err error) {
	// Apply defaults
	if config.MaxIterations == 0 {
		config.MaxIterations = DefaultMaxIterations
	}
	if config.MaxTaskRetries == 0 {
		config.MaxTaskRetries = DefaultMaxTaskRetries
	}
	if config.AgentTimeout == 0 {
		config.AgentTimeout = DefaultAgentTimeout
	}
	if config.Watch && config.WatchPollInterval == 0 {
		config.WatchPollInterval = DefaultWatchPollInterval
	}

	// Log configuration after defaults applied
	if e.Output != nil {
		e.Output.RunConfig(config.MaxIterations, config.MaxCost, config.MaxDuration, config.AgentTimeout, config.MaxTaskRetries, config.Watch, config.WatchTimeout, config.WatchPollInterval)
		if config.Policy != nil {
			e.Output.PolicyConfig(PolicySummary(config.Policy))
		}
	}

	// Calculate watch deadline (0 = unlimited)
	var watchDeadline time.Time
	if config.Watch && config.WatchTimeout > 0 {
		watchDeadline = time.Now().Add(config.WatchTimeout)
	}

	// Initialize state
	state := &runState{
		epicID:         config.EpicID,
		iteration:      0,
		completedTasks: []string{},
		workDir:        config.WorkDir,
		startTime:      time.Now(),
	}
	initPolicyTracking(state)

	// Resolve effective policy (from config or defaults)
	effectivePolicy := config.Policy
	if effectivePolicy == nil {
		effectivePolicy = &configpkg.PolicyConfig{}
	}

	// Get epic info
	epic, err := e.ticks.GetEpic(config.EpicID)
	if err != nil {
		return nil, fmt.Errorf("getting epic: %w", err)
	}

	// Validate that the ID refers to an epic, not a task
	if epic.Type != "epic" {
		errMsg := fmt.Sprintf("'%s' is a %s, not an epic", config.EpicID, epic.Type)
		task, taskErr := e.ticks.GetTask(config.EpicID)
		if taskErr == nil && task.Parent != "" {
			parentEpic, parentErr := e.ticks.GetEpic(task.Parent)
			if parentErr == nil {
				errMsg = fmt.Sprintf("%s\nParent epic: %s (%s)\nRun: tk run %s",
					errMsg, task.Parent, parentEpic.Title, task.Parent)
			}
		}
		return nil, errors.New(errMsg)
	}

	state.epic = epic

	// Ensure epic context is generated before first wave
	e.ensureEpicContext(ctx, epic)

	// Load epic context for use in prompts
	state.epicContext = e.loadEpicContext(epic.ID)

	// Create wave runner with engine prompt builder
	runner := &wave.Runner{
		Agent:       e.agent,
		WorkDir:     config.WorkDir,
		RecordStore: e.runRecordStore,
		Timeout:     config.AgentTimeout,
		BuildPrompt: e.makePromptFunc(state, effectivePolicy),
	}

	// Wave loop
	for {
		// Check context cancellation
		if ctx.Err() != nil {
			e.writeInterruptionNotes(state, config.EpicID)
			return state.toResult("context cancelled", e.budget.Usage()), ctx.Err()
		}

		// Check budget limits before starting wave
		if shouldStop, reason := e.budget.ShouldStop(); shouldStop {
			if e.Output != nil {
				usage := e.budget.Usage()
				e.Output.BudgetExceeded("budget", true, reason, state.iteration, usage.TotalTokens(), usage.Cost)
			}
			return state.toResult(reason, e.budget.Usage()), nil
		}

		// Get all tasks and compute waves
		tickTasks, err := e.ticks.ListTickTasks(config.EpicID)
		if err != nil {
			return nil, fmt.Errorf("listing tasks for wave computation: %w", err)
		}

		waveResult := wave.Compute(tickTasks)

		// No waves available
		if len(waveResult.Waves) == 0 {
			// Check if there are still open tasks (blocked/awaiting)
			hasOpen, err := e.ticks.HasOpenTasks(config.EpicID)
			if err != nil {
				return nil, fmt.Errorf("checking open tasks: %w", err)
			}

			if hasOpen {
				// Tasks exist but are all blocked or awaiting human
				if e.Output != nil {
					e.Output.NoTaskAvailable("all tasks blocked or awaiting human", hasOpen, config.Watch)
				}
				if config.Watch {
					// Watch mode: enter idle state and wait for changes
					idleResult := e.handleWatchIdle(ctx, config, state, watchDeadline)
					if idleResult != nil {
						return idleResult, nil
					}
					// Tasks became available, re-compute waves
					continue
				}
				// Non-watch mode: exit
				return state.toResult(ExitReasonTasksAwaitingHuman, e.budget.Usage()), nil
			}

			// All tasks are closed - epic complete
			state.signal = SignalComplete
			reason := ExitReasonAllTasksCompleted
			if state.iteration == 0 {
				reason = ExitReasonNoTasksFound
			}
			if e.Output != nil {
				e.Output.NoTaskAvailable(reason, hasOpen, config.Watch)
				e.Output.EpicCompleted(reason, state.completedTasks)
			}
			if err := e.ticks.CloseEpic(config.EpicID, reason); err != nil {
				if e.Output != nil {
					e.Output.Warn("failed to close epic %s: %v", config.EpicID, err)
				}
			}
			return state.toResult(reason, e.budget.Usage()), nil
		}

		// Execute the first wave
		firstWave := waveResult.Waves[0]
		state.iteration++

		if e.Output != nil {
			taskIDs := make([]string, len(firstWave.Tasks))
			for i, t := range firstWave.Tasks {
				taskIDs[i] = t.ID
			}
			e.Output.WaveStarted(state.iteration, taskIDs)

			// Notify that context is active for this wave (if context exists)
			if state.epicContext != "" {
				e.Output.ContextActive(state.epicID)
			}
		}

		// Check policy limits before executing - skip tasks that have exceeded limits
		for _, t := range firstWave.Tasks {
			if skip, reason := checkPolicyLimits(state, effectivePolicy, t.ID); skip {
				if e.Output != nil {
					e.Output.Warn("policy limit reached: %s", reason)
				}
				_ = e.ticks.AddNote(config.EpicID, fmt.Sprintf("Policy: %s — marking stuck", reason))
				_ = e.ticks.SetAwaiting(t.ID, "work", fmt.Sprintf("Policy limit: %s", reason))
			}
		}

		// Mark tasks as in_progress
		for _, t := range firstWave.Tasks {
			if err := e.ticks.SetStatus(t.ID, "in_progress"); err != nil {
				_ = e.ticks.AddNote(config.EpicID, fmt.Sprintf("Warning: could not mark %s as in_progress: %v", t.ID, err))
			}
		}

		// Execute wave
		results := runner.RunWave(ctx, firstWave)

		// Process results: update budget, handle signals, run verification
		for i, tr := range results {
			taskTick := firstWave.Tasks[i]

			// Parse signals from output
			sig, sigCtx := ParseSignals(tr.Output)

			signalStr := ""
			if sig != SignalNone {
				signalStr = sig.String()
			}

			iterResult := &IterationResult{
				Iteration:    state.iteration,
				TaskID:       tr.TaskID,
				TaskTitle:    taskTick.Title,
				Output:       tr.Output,
				TokensIn:     tr.TokensIn,
				TokensOut:    tr.TokensOut,
				Cost:         tr.Cost,
				Duration:     tr.Duration,
				Signal:       sig,
				SignalReason: sigCtx,
				Error:        tr.Error,
				IsTimeout:    errors.Is(tr.Error, agent.ErrTimeout),
			}

			// Update budget
			e.budget.Add(tr.TokensIn, tr.TokensOut, tr.Cost)

			// Report task completion to output
			if e.Output != nil {
				e.Output.TaskCompleted(output.IterationResult{
					Iteration:    state.iteration,
					TaskID:       tr.TaskID,
					TaskTitle:    taskTick.Title,
					Output:       tr.Output,
					TokensIn:     tr.TokensIn,
					TokensOut:    tr.TokensOut,
					Cost:         tr.Cost,
					Duration:     tr.Duration,
					Signal:       signalStr,
					SignalReason: sigCtx,
					Error:        tr.Error,
					IsTimeout:    iterResult.IsTimeout,
				})
			}

			// Record attempt for policy tracking
			recordTaskAttempt(state, tr.TaskID, tr.Output)

			// Handle timeout
			if iterResult.IsTimeout {
				if e.Output != nil {
					e.Output.AgentTimeout(tr.TaskID, config.AgentTimeout, len(tr.Output))
				}
				note := buildTimeoutNote(state.iteration, tr.TaskID, config.AgentTimeout, tr.Output)
				_ = e.ticks.AddNote(config.EpicID, note)
				continue
			}

			// Handle errors
			if tr.Error != nil {
				if e.Output != nil {
					e.Output.AgentError(tr.TaskID, tr.Error.Error())
				}
				_ = e.ticks.AddNote(config.EpicID, fmt.Sprintf("Wave %d error on task %s: %v", state.iteration, tr.TaskID, tr.Error))
				continue
			}

			// Track completed tasks
			{
				taskClosed, err := e.wasTaskClosed(tr.TaskID)
				if err != nil {
					_ = e.ticks.AddNote(config.EpicID, fmt.Sprintf("Warning: could not check task status: %v", err))
				} else if taskClosed {
					if e.Output != nil {
						e.Output.TaskClosed(tr.TaskID, true)
					}
					state.completedTasks = append(state.completedTasks, tr.TaskID)
				}
			}

			// Handle signals
			if sig != SignalNone {
				state.signal = sig
				state.signalReason = sigCtx

				if e.Output != nil {
					e.Output.Signal(signalStr, sigCtx, tr.TaskID)
				}

				if sig == SignalComplete {
					if e.Output != nil {
						e.Output.SignalHandled(signalStr, tr.TaskID, "ignored (tk run handles completion automatically)", "")
					}
				} else {
					// All other signals set the task to awaiting state
					awaitingState := signalToAwaiting[sig]
					task, taskErr := e.ticks.GetTask(tr.TaskID)
					if taskErr != nil {
						_ = e.ticks.AddNote(config.EpicID, fmt.Sprintf("Warning: could not get task %s for signal handling: %v", tr.TaskID, taskErr))
					} else {
						if err := e.handleSignal(task, sig, sigCtx); err != nil {
							_ = e.ticks.AddNote(config.EpicID, fmt.Sprintf("Warning: could not update task %s awaiting state: %v", tr.TaskID, err))
						}
					}
					if e.Output != nil {
						e.Output.SignalHandled(signalStr, tr.TaskID, "set task awaiting", awaitingState)
					}
				}
			}
		}

		// Check iteration limit
		if state.iteration >= config.MaxIterations {
			return state.toResult(fmt.Sprintf("max iterations (%d) reached", config.MaxIterations), e.budget.Usage()), nil
		}

		// Loop to re-compute waves (completed tasks may have unblocked next wave)
	}
}

// runState holds the mutable state during a run.
type runState struct {
	epicID         string
	epic           *ticks.Epic
	iteration      int
	completedTasks []string
	startTime      time.Time
	signal         Signal
	signalReason   string

	// Current task being worked on (for interruption notes)
	currentTaskID    string
	currentTaskTitle string

	// Policy-related tracking
	taskAttempts         map[string]int            // taskID -> total attempts
	taskNoProgressCount  map[string]int            // taskID -> consecutive no-progress attempts
	taskVerifierFailures map[string]map[string]int // taskID -> verifierCmd -> failure count
	taskLastOutputHash   map[string]string         // taskID -> hash of last output for progress detection

	// Working directory for agent (worktree path or empty for current dir)
	workDir string

	// Epic context (pre-computed context for the epic, loaded once at start)
	epicContext string
}

// toResult converts run state to a RunResult.
func (s *runState) toResult(exitReason string, budgetUsage budget.Usage) *RunResult {
	return &RunResult{
		EpicID:         s.epicID,
		Iterations:     s.iteration,
		CompletedTasks: s.completedTasks,
		Duration:       time.Since(s.startTime),
		Signal:         s.signal,
		SignalReason:   s.signalReason,
		ExitReason:     exitReason,
		TotalCost:      budgetUsage.Cost,
		TotalTokens:    budgetUsage.TotalTokens(),
	}
}

// makePromptFunc creates a prompt builder function for the wave runner.
// It captures the current engine state (epic, notes, context) and builds
// prompts using the engine's full PromptBuilder for each task.
func (e *Engine) makePromptFunc(state *runState, policy *configpkg.PolicyConfig) wave.PromptFunc {
	// Pre-compute policy info for prompt contract
	var policyInfo *PolicyInfo
	if policy != nil {
		policyInfo = &PolicyInfo{
			MaxAttempts:           policy.GetMaxAttempts(),
			MaxNoProgressAttempts: policy.GetMaxNoProgressAttempts(),
			RequireCommit:         policy.GetRequireCommit(),
			SecretsExposure:       string(policy.GetSecretsExposure()),
			Sandbox:               policy.GetSandbox(),
		}
	}

	return func(t *tick.Tick) string {
		// Refresh epic notes for each task
		notes, _ := e.ticks.GetNotes(state.epicID)
		humanNotes, _ := e.ticks.GetHumanNotes(t.ID)

		// Convert tick.Tick to ticks.Task for the prompt builder
		task := &ticks.Task{
			ID:          t.ID,
			Title:       t.Title,
			Description: t.Description,
			Status:      t.Status,
			Requires:    t.Requires,
		}

		iterCtx := IterationContext{
			Iteration:     state.iteration,
			Epic:          state.epic,
			Task:          task,
			EpicNotes:     notes,
			HumanFeedback: humanNotes,
			EpicContext:   state.epicContext,
			Policy:        policyInfo,
		}

		if e.Output != nil {
			e.Output.TaskStarted(state.iteration, task.ID, task.Title)
		}

		return e.prompt.Build(iterCtx)
	}
}

// buildTimeoutNote creates a detailed note about a timeout for recovery.
func buildTimeoutNote(iteration int, taskID string, timeout time.Duration, partialOutput string) string {
	note := fmt.Sprintf("Iteration %d timed out after %v on task %s.", iteration, timeout, taskID)

	if partialOutput != "" {
		const maxOutputLen = 500
		outputSummary := partialOutput
		if len(outputSummary) > maxOutputLen {
			outputSummary = "..." + outputSummary[len(outputSummary)-maxOutputLen:]
		}
		outputSummary = strings.ReplaceAll(outputSummary, "\n", " ")
		outputSummary = strings.Join(strings.Fields(outputSummary), " ")
		note += fmt.Sprintf(" Partial output: %s", outputSummary)
	} else {
		note += " No output captured before timeout."
	}

	return note
}

// writeInterruptionNotes writes notes to both the epic and current task when interrupted.
func (e *Engine) writeInterruptionNotes(state *runState, epicID string) {
	if state.currentTaskID == "" {
		_ = e.ticks.AddNote(epicID, fmt.Sprintf("Run interrupted by user at wave %d. No task was in progress.", state.iteration))
		return
	}

	msg := fmt.Sprintf("Run interrupted by user at wave %d while working on task %s (%s).",
		state.iteration, state.currentTaskID, state.currentTaskTitle)

	_ = e.ticks.AddNote(epicID, msg+" Task may be partially complete - review before continuing.")
	_ = e.ticks.AddNote(state.currentTaskID, "Work on this task was interrupted by user. May be partially complete.")
}

// wasTaskClosed checks if a task was closed by the agent.
func (e *Engine) wasTaskClosed(taskID string) (bool, error) {
	task, err := e.ticks.GetTask(taskID)
	if err != nil {
		return false, err
	}
	return task.Status == "closed", nil
}

// signalToAwaiting maps signals to their corresponding awaiting states.
var signalToAwaiting = map[Signal]string{
	SignalEject:           "work",
	SignalBlocked:         "input",
	SignalApprovalNeeded:  "approval",
	SignalInputNeeded:     "input",
	SignalReviewRequested: "review",
	SignalContentReview:   "content",
	SignalEscalate:        "escalation",
	SignalCheckpoint:      "checkpoint",
}

// handleSignal processes an agent signal and updates the task state accordingly.
func (e *Engine) handleSignal(task *ticks.Task, signal Signal, context string) error {
	if signal == SignalNone {
		return nil
	}

	if signal == SignalComplete {
		if task.Requires != nil && *task.Requires != "" {
			note := "Work complete, requires " + *task.Requires
			return e.ticks.SetAwaiting(task.ID, *task.Requires, note)
		}
		return e.ticks.CloseTask(task.ID, "Completed by agent")
	}

	awaiting, ok := signalToAwaiting[signal]
	if !ok {
		return nil
	}
	return e.ticks.SetAwaiting(task.ID, awaiting, context)
}

// truncateOutput truncates output to max length with ellipsis.
func truncateOutput(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

// handleWatchIdle enters idle state and watches for new tasks.
func (e *Engine) handleWatchIdle(ctx context.Context, config RunConfig, state *runState, watchDeadline time.Time) *RunResult {
	if e.Output != nil {
		e.Output.IdleEntered("tasks blocked or awaiting human", config.WatchPollInterval)
		e.Output.Idle()
	}

	watcher := NewTicksWatcher(state.workDir)
	defer watcher.Close()

	fileChanges := watcher.Changes()

	for {
		if !watchDeadline.IsZero() && time.Now().After(watchDeadline) {
			return state.toResult(ExitReasonWatchTimeout, e.budget.Usage())
		}

		select {
		case <-ctx.Done():
			e.writeInterruptionNotes(state, config.EpicID)
			return state.toResult("context cancelled while idle", e.budget.Usage())

		case <-fileChanges:
			if e.Output != nil {
				e.Output.IdleFileChange(".tick/issues")
			}
			task, err := e.ticks.NextTask(config.EpicID)
			if err != nil {
				continue
			}
			if task != nil {
				if e.Output != nil {
					e.Output.IdleTaskCheck(true, task.ID)
				}
				return nil
			}
			if e.Output != nil {
				e.Output.IdleTaskCheck(false, "")
			}
			select {
			case <-ctx.Done():
				e.writeInterruptionNotes(state, config.EpicID)
				return state.toResult("context cancelled while idle", e.budget.Usage())
			case <-time.After(200 * time.Millisecond):
			}
			task, err = e.ticks.NextTask(config.EpicID)
			if err == nil && task != nil {
				if e.Output != nil {
					e.Output.IdleTaskCheck(true, task.ID)
				}
				return nil
			}
			result := e.checkForEpicCompletion(config, state)
			if result != nil {
				return result
			}

		case <-time.After(config.WatchPollInterval):
			task, err := e.ticks.NextTask(config.EpicID)
			if err == nil && task != nil {
				if e.Output != nil {
					e.Output.IdleTaskCheck(true, task.ID)
				}
				return nil
			}
			if e.Output != nil {
				e.Output.IdleTaskCheck(false, "")
			}

			result := e.checkForEpicCompletion(config, state)
			if result != nil {
				return result
			}

			if e.Output != nil {
				e.Output.Idle()
			}
		}
	}
}

// checkForEpicCompletion checks if all tasks are done and the epic should be closed.
func (e *Engine) checkForEpicCompletion(config RunConfig, state *runState) *RunResult {
	hasOpen, err := e.ticks.HasOpenTasks(config.EpicID)
	if err != nil {
		return nil
	}

	if !hasOpen {
		state.signal = SignalComplete
		reason := ExitReasonAllTasksCompleted
		if err := e.ticks.CloseEpic(config.EpicID, reason); err != nil {
			if e.Output != nil {
				e.Output.Warn("failed to close epic %s: %v", config.EpicID, err)
			}
		}
		return state.toResult(reason, e.budget.Usage())
	}

	return nil
}

// initPolicyTracking initializes the policy tracking maps on runState.
func initPolicyTracking(state *runState) {
	state.taskAttempts = make(map[string]int)
	state.taskNoProgressCount = make(map[string]int)
	state.taskVerifierFailures = make(map[string]map[string]int)
	state.taskLastOutputHash = make(map[string]string)
}

// outputHash computes a short hash of agent output for progress detection.
func outputHash(output string) string {
	h := sha256.Sum256([]byte(output))
	return hex.EncodeToString(h[:8])
}

// checkPolicyLimits checks whether a task has exceeded policy limits.
// Returns (shouldSkip bool, reason string).
func checkPolicyLimits(state *runState, policy *configpkg.PolicyConfig, taskID string) (bool, string) {
	maxAttempts := policy.GetMaxAttempts()
	if attempts := state.taskAttempts[taskID]; attempts >= maxAttempts {
		return true, fmt.Sprintf("task %s exceeded max_attempts (%d/%d)", taskID, attempts, maxAttempts)
	}

	maxNoProg := policy.GetMaxNoProgressAttempts()
	if noProg := state.taskNoProgressCount[taskID]; noProg >= maxNoProg {
		return true, fmt.Sprintf("task %s exceeded max_no_progress_attempts (%d/%d)", taskID, noProg, maxNoProg)
	}

	maxVerifierFails := policy.GetMaxSameVerifierFailures()
	if vfMap, ok := state.taskVerifierFailures[taskID]; ok {
		for cmd, count := range vfMap {
			if count >= maxVerifierFails {
				return true, fmt.Sprintf("task %s exceeded max_same_verifier_failures for %q (%d/%d)", taskID, cmd, count, maxVerifierFails)
			}
		}
	}

	return false, ""
}

// recordTaskAttempt records that a task was attempted and tracks progress.
func recordTaskAttempt(state *runState, taskID, agentOutput string) {
	state.taskAttempts[taskID]++

	hash := outputHash(agentOutput)
	if prev, ok := state.taskLastOutputHash[taskID]; ok && prev == hash {
		// Same output as last time = no progress
		state.taskNoProgressCount[taskID]++
	} else {
		// Output changed = progress made
		state.taskNoProgressCount[taskID] = 0
	}
	state.taskLastOutputHash[taskID] = hash
}

// recordVerifierFailure records a verifier command failure for a task.
func recordVerifierFailure(state *runState, taskID, verifierCmd string) {
	if state.taskVerifierFailures[taskID] == nil {
		state.taskVerifierFailures[taskID] = make(map[string]int)
	}
	state.taskVerifierFailures[taskID][verifierCmd]++
}

// PolicySummary returns a human-readable summary of active policy controls.
func PolicySummary(policy *configpkg.PolicyConfig) map[string]interface{} {
	summary := map[string]interface{}{
		"max_attempts":                policy.GetMaxAttempts(),
		"max_no_progress_attempts":    policy.GetMaxNoProgressAttempts(),
		"max_same_verifier_failures":  policy.GetMaxSameVerifierFailures(),
		"require_commit":              policy.GetRequireCommit(),
		"require_verifiers_for_priority": policy.GetRequireVerifiersForPriority(),
		"sandbox":                     policy.GetSandbox(),
		"secrets_exposure":            string(policy.GetSecretsExposure()),
	}
	return summary
}
