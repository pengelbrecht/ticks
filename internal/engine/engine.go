package engine

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/budget"
	epiccontext "github.com/pengelbrecht/ticks/internal/context"
	"github.com/pengelbrecht/ticks/internal/runlog"
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

	// Run record store for live file tracking (optional)
	runRecordStore *runrecord.Store

	// Run logger for control flow events (optional)
	runLog *runlog.Logger

	// Callbacks for TUI integration (optional)
	OnIterationStart func(ctx IterationContext)
	OnIterationEnd   func(result *IterationResult)
	OnOutput         func(chunk string)
	OnSignal         func(signal Signal, reason string)

	// Context generation callbacks for TUI status display (optional)
	OnContextGenerating func(epicID string, taskCount int)
	OnContextGenerated  func(epicID string, tokenCount int)
	OnContextLoaded     func(epicID string, content string) // content passed for preview/token display
	OnContextSkipped    func(epicID string, reason string)
	OnContextFailed     func(epicID string, errMsg string)
	OnContextActive     func(epicID string) // called at start of each wave when context is in use

	// Watch mode callback - called when no tasks available and entering idle state.
	OnIdle func()

	// Rich streaming callback for real-time agent state updates.
	// Called whenever agent state changes (text, thinking, tools, metrics).
	// If set, this provides structured updates; OnOutput is still called for backward compat.
	OnAgentState func(snap agent.AgentStateSnapshot)
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
		if e.runLog != nil {
			e.runLog.LogContextSkipped(epic.ID, "already exists", 0)
		}
		return
	}

	// Get epic tasks to check count and for generation
	tasks, err := e.ticks.ListTasks(epic.ID)
	if err != nil {
		if e.runLog != nil {
			e.runLog.LogContextError(epic.ID, err.Error(), "list_tasks")
		}
		return
	}

	// Skip for epics with ≤1 children (no amortization benefit)
	if len(tasks) <= 1 {
		if e.runLog != nil {
			e.runLog.LogContextSkipped(epic.ID, "too few tasks", len(tasks))
		}
		if e.OnContextSkipped != nil {
			e.OnContextSkipped(epic.ID, "single-task epic")
		}
		return
	}

	// Log context generation start
	if e.runLog != nil {
		e.runLog.LogContextGenerationStarted(epic.ID, len(tasks))
	}
	if e.OnContextGenerating != nil {
		e.OnContextGenerating(epic.ID, len(tasks))
	}
	// Write epic status for ticks board SSE
	if e.runRecordStore != nil {
		_ = e.runRecordStore.WriteEpicStatus(epic.ID, &runrecord.EpicStatus{
			EpicID:    epic.ID,
			Status:    "context_generating",
			Message:   fmt.Sprintf("Generating epic context (%d tasks)...", len(tasks)),
			TaskCount: len(tasks),
		})
	}

	// Generate context using the AI agent
	content, err := e.contextGenerator.Generate(ctx, epic, tasks)
	if err != nil {
		// Log warning but don't abort - context is optional
		if e.runLog != nil {
			e.runLog.LogContextGenerationFailed(epic.ID, err.Error())
		}
		if e.OnContextFailed != nil {
			e.OnContextFailed(epic.ID, err.Error())
		}
		if e.runRecordStore != nil {
			_ = e.runRecordStore.WriteEpicStatus(epic.ID, &runrecord.EpicStatus{
				EpicID:  epic.ID,
				Status:  "context_failed",
				Message: fmt.Sprintf("Context generation failed: %s", err.Error()),
			})
		}
		return
	}

	// Save the generated context
	if err := e.contextStore.Save(epic.ID, content); err != nil {
		if e.runLog != nil {
			e.runLog.LogContextSaveFailed(epic.ID, err.Error())
		}
		if e.OnContextFailed != nil {
			e.OnContextFailed(epic.ID, err.Error())
		}
		if e.runRecordStore != nil {
			_ = e.runRecordStore.WriteEpicStatus(epic.ID, &runrecord.EpicStatus{
				EpicID:  epic.ID,
				Status:  "context_failed",
				Message: fmt.Sprintf("Context save failed: %s", err.Error()),
			})
		}
		return
	}

	if e.runLog != nil {
		e.runLog.LogContextGenerationCompleted(epic.ID, len(content))
	}
	tokenCount := len(content) / 4
	if e.OnContextGenerated != nil {
		e.OnContextGenerated(epic.ID, tokenCount)
	}
	if e.runRecordStore != nil {
		_ = e.runRecordStore.WriteEpicStatus(epic.ID, &runrecord.EpicStatus{
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
		if e.runLog != nil {
			e.runLog.LogContextLoadFailed(epicID, err.Error())
		}
		return ""
	}

	if content != "" {
		if e.OnContextLoaded != nil {
			e.OnContextLoaded(epicID, content)
		}
		if e.runRecordStore != nil {
			tokenCount := len(content) / 4
			_ = e.runRecordStore.WriteEpicStatus(epicID, &runrecord.EpicStatus{
				EpicID:     epicID,
				Status:     "context_loaded",
				Message:    fmt.Sprintf("Using existing context (~%d tokens)", tokenCount),
				TokenCount: tokenCount,
			})
		}
	}

	return content
}

// SetRunLog sets the run logger for control flow events.
func (e *Engine) SetRunLog(l *runlog.Logger) {
	e.runLog = l
}

// SetRunRecordStore sets the run record store for live file tracking.
func (e *Engine) SetRunRecordStore(s *runrecord.Store) {
	e.runRecordStore = s
}

// RunLog returns the current run logger (may be nil).
func (e *Engine) RunLog() *runlog.Logger {
	return e.runLog
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
	if e.runLog != nil {
		e.runLog.LogRunConfig(runlog.RunConfigData{
			MaxIterations:     config.MaxIterations,
			MaxCost:           config.MaxCost,
			MaxDuration:       config.MaxDuration,
			AgentTimeout:      config.AgentTimeout,
			MaxTaskRetries:    config.MaxTaskRetries,
			Watch:             config.Watch,
			WatchTimeout:      config.WatchTimeout,
			WatchPollInterval: config.WatchPollInterval,
		})
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

	// Open a persistent session if the agent supports it.
	// This keeps the subprocess alive across waves so the agent retains
	// context (file reads, edits, thinking) between tasks.
	var session agent.Session
	if sa, ok := e.agent.(agent.SessionAgent); ok {
		s, err := sa.Open(ctx, agent.RunOpts{
			WorkDir: config.WorkDir,
			Timeout: config.AgentTimeout,
		})
		if err != nil {
			return nil, fmt.Errorf("open agent session: %w", err)
		}
		session = s
		defer session.Close()
	}

	// Create wave runner with engine prompt builder
	runner := &wave.Runner{
		Agent:       e.agent,
		Session:     session, // nil for non-session agents (falls back to Agent.Run)
		WorkDir:     config.WorkDir,
		RecordStore: e.runRecordStore,
		Timeout:     config.AgentTimeout,
		BuildPrompt: e.makePromptFunc(state),
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
			if e.runLog != nil {
				usage := e.budget.Usage()
				e.runLog.LogBudgetCheck(runlog.BudgetCheckData{
					LimitType:   "budget",
					ShouldStop:  true,
					StopReason:  reason,
					Iteration:   state.iteration,
					TotalTokens: usage.TotalTokens(),
					TotalCost:   usage.Cost,
				})
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
				if e.runLog != nil {
					e.runLog.LogNoTaskAvailable("all tasks blocked or awaiting human", hasOpen, config.Watch)
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
			if e.runLog != nil {
				e.runLog.LogNoTaskAvailable(reason, hasOpen, config.Watch)
				e.runLog.LogEpicCompleted(reason, state.completedTasks)
			}
			if err := e.ticks.CloseEpic(config.EpicID, reason); err != nil {
				fmt.Fprintf(os.Stderr, "warning: failed to close epic %s: %v\n", config.EpicID, err)
			}
			return state.toResult(reason, e.budget.Usage()), nil
		}

		// Execute the first wave
		firstWave := waveResult.Waves[0]
		state.iteration++

		if e.runLog != nil {
			taskIDs := make([]string, len(firstWave.Tasks))
			for i, t := range firstWave.Tasks {
				taskIDs[i] = t.ID
			}
			e.runLog.LogIterationStart(state.iteration, strings.Join(taskIDs, ","), fmt.Sprintf("wave %d (%d tasks)", firstWave.Number, len(firstWave.Tasks)))
		}

		// Notify that context is active for this wave (if context exists)
		if state.epicContext != "" && e.OnContextActive != nil {
			e.OnContextActive(state.epicID)
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

			// Build an IterationResult for callback compatibility
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

			// Call iteration end callback
			if e.OnIterationEnd != nil {
				e.OnIterationEnd(iterResult)
			}

			// Log iteration end
			if e.runLog != nil {
				errStr := ""
				if tr.Error != nil {
					errStr = tr.Error.Error()
				}
				signalStr := ""
				if sig != SignalNone {
					signalStr = sig.String()
				}
				e.runLog.LogIterationEnd(runlog.IterationEndData{
					Iteration: state.iteration,
					TaskID:    tr.TaskID,
					Duration:  tr.Duration,
					TokensIn:  tr.TokensIn,
					TokensOut: tr.TokensOut,
					Cost:      tr.Cost,
					Signal:    signalStr,
					Error:     errStr,
					IsTimeout: iterResult.IsTimeout,
				})
			}

			// Handle timeout
			if iterResult.IsTimeout {
				if e.runLog != nil {
					e.runLog.LogAgentTimeout(tr.TaskID, config.AgentTimeout, len(tr.Output))
				}
				note := buildTimeoutNote(state.iteration, tr.TaskID, config.AgentTimeout, tr.Output)
				_ = e.ticks.AddNote(config.EpicID, note)
				continue
			}

			// Handle errors
			if tr.Error != nil {
				if e.runLog != nil {
					e.runLog.LogAgentError(tr.TaskID, tr.Error.Error())
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
					if e.runLog != nil {
						e.runLog.LogTaskCompleted(tr.TaskID, true)
					}
					state.completedTasks = append(state.completedTasks, tr.TaskID)
				}
			}

			// Handle signals
			if sig != SignalNone {
				state.signal = sig
				state.signalReason = sigCtx

				if e.runLog != nil {
					e.runLog.LogSignalDetected(sig.String(), sigCtx, tr.TaskID)
				}

				if e.OnSignal != nil {
					e.OnSignal(sig, sigCtx)
				}

				if sig == SignalComplete {
					// COMPLETE signal is ignored (tk run handles completion via tk next)
					if e.runLog != nil {
						e.runLog.LogSignalHandled(sig.String(), tr.TaskID, "ignored (tk run handles completion automatically)", "")
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
					if e.runLog != nil {
						e.runLog.LogSignalHandled(sig.String(), tr.TaskID, "set task awaiting", awaitingState)
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
func (e *Engine) makePromptFunc(state *runState) wave.PromptFunc {
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
		}

		if e.OnIterationStart != nil {
			e.OnIterationStart(iterCtx)
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
	if e.runLog != nil {
		e.runLog.LogIdleEntered("tasks blocked or awaiting human", config.WatchPollInterval)
	}

	if e.OnIdle != nil {
		e.OnIdle()
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
			if e.runLog != nil {
				e.runLog.LogIdleFileChange(".tick/issues")
			}
			task, err := e.ticks.NextTask(config.EpicID)
			if err != nil {
				continue
			}
			if task != nil {
				if e.runLog != nil {
					e.runLog.LogIdleTaskCheck(true, task.ID)
				}
				return nil
			}
			if e.runLog != nil {
				e.runLog.LogIdleTaskCheck(false, "")
			}
			select {
			case <-ctx.Done():
				e.writeInterruptionNotes(state, config.EpicID)
				return state.toResult("context cancelled while idle", e.budget.Usage())
			case <-time.After(200 * time.Millisecond):
			}
			task, err = e.ticks.NextTask(config.EpicID)
			if err == nil && task != nil {
				if e.runLog != nil {
					e.runLog.LogIdleTaskCheck(true, task.ID)
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
				if e.runLog != nil {
					e.runLog.LogIdleTaskCheck(true, task.ID)
				}
				return nil
			}
			if e.runLog != nil {
				e.runLog.LogIdleTaskCheck(false, "")
			}

			result := e.checkForEpicCompletion(config, state)
			if result != nil {
				return result
			}

			if e.OnIdle != nil {
				e.OnIdle()
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
			fmt.Fprintf(os.Stderr, "warning: failed to close epic %s: %v\n", config.EpicID, err)
		}
		return state.toResult(reason, e.budget.Usage())
	}

	return nil
}
