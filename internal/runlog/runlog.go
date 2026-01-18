// Package runlog provides structured logging for ticker runs.
// Each run creates a JSONL file in .ticker/runs/<run-id>.jsonl that documents
// every decision and action in the control flow loop.
package runlog

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// EventType identifies the type of logged event.
type EventType string

const (
	// Run lifecycle events
	EventRunStart  EventType = "run_start"
	EventRunEnd    EventType = "run_end"
	EventRunConfig EventType = "run_config"

	// Worktree events
	EventWorktreeCreated EventType = "worktree_created"
	EventWorktreeReused  EventType = "worktree_reused"
	EventWorktreeCleanup EventType = "worktree_cleanup"

	// Checkpoint events
	EventCheckpointLoaded EventType = "checkpoint_loaded"
	EventCheckpointSaved  EventType = "checkpoint_saved"

	// Iteration events
	EventIterationStart EventType = "iteration_start"
	EventIterationEnd   EventType = "iteration_end"

	// Task selection events
	EventTaskSelected    EventType = "task_selected"
	EventNoTaskAvailable EventType = "no_task_available"
	EventTaskDebounce    EventType = "task_debounce"

	// Budget events
	EventBudgetCheck EventType = "budget_check"

	// Pause events (TUI only)
	EventPauseEntered EventType = "pause_entered"
	EventPauseExited  EventType = "pause_exited"

	// Stuck loop detection
	EventStuckLoopWarning  EventType = "stuck_loop_warning"
	EventStuckLoopExceeded EventType = "stuck_loop_exceeded"

	// Agent events
	EventAgentStarted   EventType = "agent_started"
	EventAgentCompleted EventType = "agent_completed"
	EventAgentTimeout   EventType = "agent_timeout"
	EventAgentError     EventType = "agent_error"

	// Signal events
	EventSignalDetected EventType = "signal_detected"
	EventSignalHandled  EventType = "signal_handled"

	// Verification events
	EventVerificationStarted   EventType = "verification_started"
	EventVerifierResult        EventType = "verifier_result"
	EventVerificationCompleted EventType = "verification_completed"
	EventTaskReopened          EventType = "task_reopened"
	EventTaskCompleted         EventType = "task_completed"

	// Watch mode events
	EventIdleEntered    EventType = "idle_entered"
	EventIdleTaskCheck  EventType = "idle_task_check"
	EventIdleFileChange EventType = "idle_file_change"

	// Epic events
	EventEpicCompleted EventType = "epic_completed"
)

// Event is a single logged event with timestamp and type-specific data.
type Event struct {
	Time    time.Time       `json:"time"`
	Type    EventType       `json:"type"`
	Data    json.RawMessage `json:"data,omitempty"`
	Message string          `json:"message,omitempty"`
}

// Logger writes run events to a JSONL file.
type Logger struct {
	runID    string
	epicID   string
	file     *os.File
	mu       sync.Mutex
	closed   bool
	filePath string
}

// New creates a new run logger.
// Creates .ticker/runs/ directory if needed and opens the log file.
func New(epicID string) (*Logger, error) {
	runID := generateRunID()

	// Create .ticker/runs directory
	dir := filepath.Join(".ticker", "runs")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("creating run log directory: %w", err)
	}

	// Open log file
	filePath := filepath.Join(dir, runID+".jsonl")
	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, fmt.Errorf("opening run log file: %w", err)
	}

	return &Logger{
		runID:    runID,
		epicID:   epicID,
		file:     file,
		filePath: filePath,
	}, nil
}

// NewWithWorkDir creates a new run logger in a specific working directory.
func NewWithWorkDir(epicID, workDir string) (*Logger, error) {
	runID := generateRunID()

	// Create .ticker/runs directory in workDir
	dir := filepath.Join(workDir, ".ticker", "runs")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("creating run log directory: %w", err)
	}

	// Open log file
	filePath := filepath.Join(dir, runID+".jsonl")
	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, fmt.Errorf("opening run log file: %w", err)
	}

	return &Logger{
		runID:    runID,
		epicID:   epicID,
		file:     file,
		filePath: filePath,
	}, nil
}

// RunID returns the unique identifier for this run.
func (l *Logger) RunID() string {
	return l.runID
}

// FilePath returns the path to the log file.
func (l *Logger) FilePath() string {
	return l.filePath
}

// Close closes the log file.
func (l *Logger) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.closed {
		return nil
	}
	l.closed = true

	return l.file.Close()
}

// log writes an event to the log file.
func (l *Logger) log(eventType EventType, message string, data interface{}) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.closed {
		return
	}

	event := Event{
		Time:    time.Now(),
		Type:    eventType,
		Message: message,
	}

	if data != nil {
		jsonData, err := json.Marshal(data)
		if err == nil {
			event.Data = jsonData
		}
	}

	line, err := json.Marshal(event)
	if err != nil {
		return
	}

	_, _ = l.file.Write(line)
	_, _ = l.file.Write([]byte("\n"))
}

// generateRunID creates a unique run identifier.
func generateRunID() string {
	return time.Now().Format("20060102-150405")
}

// --- Run Lifecycle Events ---

// RunStartData contains data for run start events.
type RunStartData struct {
	EpicID   string `json:"epic_id"`
	Mode     string `json:"mode"` // "tui" or "headless"
	Headless bool   `json:"headless"`
}

// LogRunStart logs the start of a run.
func (l *Logger) LogRunStart(mode string, headless bool) {
	l.log(EventRunStart, fmt.Sprintf("Starting run for epic %s in %s mode", l.epicID, mode), RunStartData{
		EpicID:   l.epicID,
		Mode:     mode,
		Headless: headless,
	})
}

// RunConfigData contains the applied run configuration.
type RunConfigData struct {
	MaxIterations     int           `json:"max_iterations"`
	MaxCost           float64       `json:"max_cost,omitempty"`
	MaxDuration       time.Duration `json:"max_duration,omitempty"`
	AgentTimeout      time.Duration `json:"agent_timeout"`
	MaxTaskRetries    int           `json:"max_task_retries"`
	CheckpointEvery   int           `json:"checkpoint_every"`
	UseWorktree       bool          `json:"use_worktree"`
	Watch             bool          `json:"watch"`
	WatchTimeout      time.Duration `json:"watch_timeout,omitempty"`
	WatchPollInterval time.Duration `json:"watch_poll_interval,omitempty"`
	DebounceInterval  time.Duration `json:"debounce_interval,omitempty"`
	VerifyEnabled     bool          `json:"verify_enabled"`
	SkipVerify        bool          `json:"skip_verify"`
	ResumeFrom        string        `json:"resume_from,omitempty"`
}

// LogRunConfig logs the applied run configuration.
func (l *Logger) LogRunConfig(data RunConfigData) {
	l.log(EventRunConfig, "Run configuration applied", data)
}

// RunEndData contains data for run end events.
type RunEndData struct {
	ExitReason     string        `json:"exit_reason"`
	Iterations     int           `json:"iterations"`
	CompletedTasks []string      `json:"completed_tasks"`
	TotalTokens    int           `json:"total_tokens"`
	TotalCost      float64       `json:"total_cost"`
	Duration       time.Duration `json:"duration"`
	Signal         string        `json:"signal,omitempty"`
	SignalReason   string        `json:"signal_reason,omitempty"`
}

// LogRunEnd logs the end of a run.
func (l *Logger) LogRunEnd(data RunEndData) {
	l.log(EventRunEnd, fmt.Sprintf("Run ended: %s", data.ExitReason), data)
}

// --- Worktree Events ---

// WorktreeData contains worktree event data.
type WorktreeData struct {
	EpicID string `json:"epic_id"`
	Path   string `json:"path"`
}

// LogWorktreeCreated logs worktree creation.
func (l *Logger) LogWorktreeCreated(path string) {
	l.log(EventWorktreeCreated, fmt.Sprintf("Created worktree at %s", path), WorktreeData{
		EpicID: l.epicID,
		Path:   path,
	})
}

// LogWorktreeReused logs worktree reuse.
func (l *Logger) LogWorktreeReused(path string) {
	l.log(EventWorktreeReused, fmt.Sprintf("Reusing existing worktree at %s", path), WorktreeData{
		EpicID: l.epicID,
		Path:   path,
	})
}

// WorktreeCleanupData contains worktree cleanup event data.
type WorktreeCleanupData struct {
	EpicID     string `json:"epic_id"`
	Path       string `json:"path"`
	ExitReason string `json:"exit_reason"`
	Cleaned    bool   `json:"cleaned"`
}

// LogWorktreeCleanup logs worktree cleanup decision.
func (l *Logger) LogWorktreeCleanup(path, exitReason string, cleaned bool) {
	action := "preserved"
	if cleaned {
		action = "removed"
	}
	l.log(EventWorktreeCleanup, fmt.Sprintf("Worktree %s: %s", action, exitReason), WorktreeCleanupData{
		EpicID:     l.epicID,
		Path:       path,
		ExitReason: exitReason,
		Cleaned:    cleaned,
	})
}

// --- Checkpoint Events ---

// CheckpointData contains checkpoint event data.
type CheckpointData struct {
	CheckpointID   string   `json:"checkpoint_id"`
	Iteration      int      `json:"iteration"`
	CompletedTasks []string `json:"completed_tasks,omitempty"`
}

// LogCheckpointLoaded logs checkpoint resume.
func (l *Logger) LogCheckpointLoaded(checkpointID string, iteration int) {
	l.log(EventCheckpointLoaded, fmt.Sprintf("Resumed from checkpoint %s at iteration %d", checkpointID, iteration), CheckpointData{
		CheckpointID: checkpointID,
		Iteration:    iteration,
	})
}

// LogCheckpointSaved logs checkpoint creation.
func (l *Logger) LogCheckpointSaved(checkpointID string, iteration int, completedTasks []string) {
	l.log(EventCheckpointSaved, fmt.Sprintf("Saved checkpoint at iteration %d", iteration), CheckpointData{
		CheckpointID:   checkpointID,
		Iteration:      iteration,
		CompletedTasks: completedTasks,
	})
}

// --- Iteration Events ---

// IterationStartData contains iteration start event data.
type IterationStartData struct {
	Iteration int    `json:"iteration"`
	TaskID    string `json:"task_id"`
	TaskTitle string `json:"task_title"`
}

// LogIterationStart logs the start of an iteration.
func (l *Logger) LogIterationStart(iteration int, taskID, taskTitle string) {
	l.log(EventIterationStart, fmt.Sprintf("Iteration %d: starting task %s", iteration, taskID), IterationStartData{
		Iteration: iteration,
		TaskID:    taskID,
		TaskTitle: taskTitle,
	})
}

// IterationEndData contains iteration end event data.
type IterationEndData struct {
	Iteration int           `json:"iteration"`
	TaskID    string        `json:"task_id"`
	Duration  time.Duration `json:"duration"`
	TokensIn  int           `json:"tokens_in"`
	TokensOut int           `json:"tokens_out"`
	Cost      float64       `json:"cost"`
	Signal    string        `json:"signal,omitempty"`
	Error     string        `json:"error,omitempty"`
	IsTimeout bool          `json:"is_timeout,omitempty"`
}

// LogIterationEnd logs the end of an iteration.
func (l *Logger) LogIterationEnd(data IterationEndData) {
	msg := fmt.Sprintf("Iteration %d: completed in %v", data.Iteration, data.Duration)
	if data.Error != "" {
		msg = fmt.Sprintf("Iteration %d: error - %s", data.Iteration, data.Error)
	} else if data.IsTimeout {
		msg = fmt.Sprintf("Iteration %d: timed out", data.Iteration)
	}
	l.log(EventIterationEnd, msg, data)
}

// --- Task Selection Events ---

// TaskSelectedData contains task selection event data.
type TaskSelectedData struct {
	TaskID        string `json:"task_id"`
	TaskTitle     string `json:"task_title"`
	SameTaskCount int    `json:"same_task_count"`
}

// LogTaskSelected logs task selection.
func (l *Logger) LogTaskSelected(taskID, taskTitle string, sameTaskCount int) {
	l.log(EventTaskSelected, fmt.Sprintf("Selected task %s (%s)", taskID, taskTitle), TaskSelectedData{
		TaskID:        taskID,
		TaskTitle:     taskTitle,
		SameTaskCount: sameTaskCount,
	})
}

// NoTaskData contains no-task event data.
type NoTaskData struct {
	Reason     string `json:"reason"`
	HasOpen    bool   `json:"has_open_tasks"`
	WatchMode  bool   `json:"watch_mode"`
	WillIdle   bool   `json:"will_idle"`
	WillFinish bool   `json:"will_finish"`
}

// LogNoTaskAvailable logs when no task is available.
func (l *Logger) LogNoTaskAvailable(reason string, hasOpen, watchMode bool) {
	willIdle := hasOpen && watchMode
	willFinish := !hasOpen
	l.log(EventNoTaskAvailable, reason, NoTaskData{
		Reason:     reason,
		HasOpen:    hasOpen,
		WatchMode:  watchMode,
		WillIdle:   willIdle,
		WillFinish: willFinish,
	})
}

// DebounceData contains debounce event data.
type DebounceData struct {
	TaskID   string        `json:"task_id"`
	Duration time.Duration `json:"duration"`
}

// LogTaskDebounce logs task debounce wait.
func (l *Logger) LogTaskDebounce(taskID string, duration time.Duration) {
	l.log(EventTaskDebounce, fmt.Sprintf("Debouncing task %s for %v", taskID, duration), DebounceData{
		TaskID:   taskID,
		Duration: duration,
	})
}

// --- Budget Events ---

// BudgetCheckData contains budget check event data.
type BudgetCheckData struct {
	LimitType   string  `json:"limit_type"` // "iterations", "cost", "duration"
	Current     float64 `json:"current"`
	Limit       float64 `json:"limit"`
	ShouldStop  bool    `json:"should_stop"`
	StopReason  string  `json:"stop_reason,omitempty"`
	Iteration   int     `json:"iteration"`
	TotalTokens int     `json:"total_tokens"`
	TotalCost   float64 `json:"total_cost"`
}

// LogBudgetCheck logs a budget limit check.
func (l *Logger) LogBudgetCheck(data BudgetCheckData) {
	msg := fmt.Sprintf("Budget check (%s): %.2f / %.2f", data.LimitType, data.Current, data.Limit)
	if data.ShouldStop {
		msg = fmt.Sprintf("Budget exceeded (%s): %s", data.LimitType, data.StopReason)
	}
	l.log(EventBudgetCheck, msg, data)
}

// --- Pause Events ---

// PauseData contains pause event data.
type PauseData struct {
	Iteration int `json:"iteration"`
}

// LogPauseEntered logs entering pause state.
func (l *Logger) LogPauseEntered(iteration int) {
	l.log(EventPauseEntered, fmt.Sprintf("Paused at iteration %d", iteration), PauseData{Iteration: iteration})
}

// LogPauseExited logs exiting pause state.
func (l *Logger) LogPauseExited(iteration int) {
	l.log(EventPauseExited, fmt.Sprintf("Resumed at iteration %d", iteration), PauseData{Iteration: iteration})
}

// --- Stuck Loop Events ---

// StuckLoopData contains stuck loop event data.
type StuckLoopData struct {
	TaskID       string `json:"task_id"`
	RetryCount   int    `json:"retry_count"`
	MaxRetries   int    `json:"max_retries"`
	WillContinue bool   `json:"will_continue"`
}

// LogStuckLoopWarning logs a stuck loop warning.
func (l *Logger) LogStuckLoopWarning(taskID string, retryCount, maxRetries int) {
	l.log(EventStuckLoopWarning, fmt.Sprintf("Same task %s for %d/%d iterations", taskID, retryCount, maxRetries), StuckLoopData{
		TaskID:       taskID,
		RetryCount:   retryCount,
		MaxRetries:   maxRetries,
		WillContinue: true,
	})
}

// LogStuckLoopExceeded logs stuck loop limit exceeded.
func (l *Logger) LogStuckLoopExceeded(taskID string, retryCount, maxRetries int) {
	l.log(EventStuckLoopExceeded, fmt.Sprintf("Stuck on task %s after %d iterations - needs manual review", taskID, retryCount), StuckLoopData{
		TaskID:       taskID,
		RetryCount:   retryCount,
		MaxRetries:   maxRetries,
		WillContinue: false,
	})
}

// --- Agent Events ---

// AgentStartedData contains agent start event data.
type AgentStartedData struct {
	TaskID       string        `json:"task_id"`
	PromptLength int           `json:"prompt_length"`
	Timeout      time.Duration `json:"timeout"`
	WorkDir      string        `json:"work_dir,omitempty"`
}

// LogAgentStarted logs agent invocation start.
func (l *Logger) LogAgentStarted(taskID string, promptLength int, timeout time.Duration, workDir string) {
	l.log(EventAgentStarted, fmt.Sprintf("Starting agent for task %s", taskID), AgentStartedData{
		TaskID:       taskID,
		PromptLength: promptLength,
		Timeout:      timeout,
		WorkDir:      workDir,
	})
}

// AgentCompletedData contains agent completion event data.
type AgentCompletedData struct {
	TaskID       string        `json:"task_id"`
	Duration     time.Duration `json:"duration"`
	TokensIn     int           `json:"tokens_in"`
	TokensOut    int           `json:"tokens_out"`
	Cost         float64       `json:"cost"`
	OutputLength int           `json:"output_length"`
}

// LogAgentCompleted logs agent completion.
func (l *Logger) LogAgentCompleted(data AgentCompletedData) {
	l.log(EventAgentCompleted, fmt.Sprintf("Agent completed for task %s in %v", data.TaskID, data.Duration), data)
}

// AgentTimeoutData contains agent timeout event data.
type AgentTimeoutData struct {
	TaskID        string        `json:"task_id"`
	Timeout       time.Duration `json:"timeout"`
	PartialOutput int           `json:"partial_output_length"`
}

// LogAgentTimeout logs agent timeout.
func (l *Logger) LogAgentTimeout(taskID string, timeout time.Duration, partialOutputLen int) {
	l.log(EventAgentTimeout, fmt.Sprintf("Agent timed out for task %s after %v", taskID, timeout), AgentTimeoutData{
		TaskID:        taskID,
		Timeout:       timeout,
		PartialOutput: partialOutputLen,
	})
}

// AgentErrorData contains agent error event data.
type AgentErrorData struct {
	TaskID string `json:"task_id"`
	Error  string `json:"error"`
}

// LogAgentError logs agent error.
func (l *Logger) LogAgentError(taskID, errMsg string) {
	l.log(EventAgentError, fmt.Sprintf("Agent error for task %s: %s", taskID, errMsg), AgentErrorData{
		TaskID: taskID,
		Error:  errMsg,
	})
}

// --- Signal Events ---

// SignalDetectedData contains signal detection event data.
type SignalDetectedData struct {
	Signal string `json:"signal"`
	Reason string `json:"reason,omitempty"`
	TaskID string `json:"task_id"`
}

// LogSignalDetected logs signal detection in agent output.
func (l *Logger) LogSignalDetected(signal, reason, taskID string) {
	msg := fmt.Sprintf("Detected signal %s", signal)
	if reason != "" {
		msg = fmt.Sprintf("Detected signal %s: %s", signal, reason)
	}
	l.log(EventSignalDetected, msg, SignalDetectedData{
		Signal: signal,
		Reason: reason,
		TaskID: taskID,
	})
}

// SignalHandledData contains signal handling event data.
type SignalHandledData struct {
	Signal        string `json:"signal"`
	TaskID        string `json:"task_id"`
	Action        string `json:"action"`
	AwaitingState string `json:"awaiting_state,omitempty"`
}

// LogSignalHandled logs signal handling action.
func (l *Logger) LogSignalHandled(signal, taskID, action, awaitingState string) {
	l.log(EventSignalHandled, fmt.Sprintf("Handled signal %s: %s", signal, action), SignalHandledData{
		Signal:        signal,
		TaskID:        taskID,
		Action:        action,
		AwaitingState: awaitingState,
	})
}

// --- Verification Events ---

// VerificationStartedData contains verification start event data.
type VerificationStartedData struct {
	TaskID string `json:"task_id"`
}

// LogVerificationStarted logs verification start.
func (l *Logger) LogVerificationStarted(taskID string) {
	l.log(EventVerificationStarted, fmt.Sprintf("Starting verification for task %s", taskID), VerificationStartedData{
		TaskID: taskID,
	})
}

// VerifierResultData contains detailed results from a single verifier.
type VerifierResultData struct {
	TaskID   string        `json:"task_id"`
	Verifier string        `json:"verifier"`
	Passed   bool          `json:"passed"`
	Output   string        `json:"output"`
	Error    string        `json:"error,omitempty"`
	Duration time.Duration `json:"duration"`
	WorkDir  string        `json:"work_dir,omitempty"`
}

// LogVerifierResult logs detailed results from a single verifier.
func (l *Logger) LogVerifierResult(data VerifierResultData) {
	status := "passed"
	if !data.Passed {
		status = "failed"
	}
	msg := fmt.Sprintf("Verifier %s %s for task %s", data.Verifier, status, data.TaskID)
	if data.Error != "" {
		msg = fmt.Sprintf("Verifier %s error for task %s: %s", data.Verifier, data.TaskID, data.Error)
	}
	l.log(EventVerifierResult, msg, data)
}

// VerificationCompletedData contains verification completion event data.
type VerificationCompletedData struct {
	TaskID    string   `json:"task_id"`
	AllPassed bool     `json:"all_passed"`
	Verifiers []string `json:"verifiers,omitempty"`
	Failed    []string `json:"failed,omitempty"`
}

// LogVerificationCompleted logs verification completion.
func (l *Logger) LogVerificationCompleted(taskID string, allPassed bool, verifiers, failed []string) {
	msg := fmt.Sprintf("Verification passed for task %s", taskID)
	if !allPassed {
		msg = fmt.Sprintf("Verification failed for task %s: %v", taskID, failed)
	}
	l.log(EventVerificationCompleted, msg, VerificationCompletedData{
		TaskID:    taskID,
		AllPassed: allPassed,
		Verifiers: verifiers,
		Failed:    failed,
	})
}

// TaskReopenedData contains task reopened event data.
type TaskReopenedData struct {
	TaskID string `json:"task_id"`
	Reason string `json:"reason"`
}

// LogTaskReopened logs task reopening.
func (l *Logger) LogTaskReopened(taskID, reason string) {
	l.log(EventTaskReopened, fmt.Sprintf("Reopened task %s: %s", taskID, reason), TaskReopenedData{
		TaskID: taskID,
		Reason: reason,
	})
}

// TaskCompletedData contains task completed event data.
type TaskCompletedData struct {
	TaskID           string `json:"task_id"`
	VerificationPass bool   `json:"verification_passed"`
}

// LogTaskCompleted logs task completion (passed verification).
func (l *Logger) LogTaskCompleted(taskID string, verificationPassed bool) {
	l.log(EventTaskCompleted, fmt.Sprintf("Task %s completed (verification: %v)", taskID, verificationPassed), TaskCompletedData{
		TaskID:           taskID,
		VerificationPass: verificationPassed,
	})
}

// --- Watch Mode Events ---

// IdleData contains idle event data.
type IdleData struct {
	Reason       string        `json:"reason"`
	PollInterval time.Duration `json:"poll_interval,omitempty"`
}

// LogIdleEntered logs entering idle state.
func (l *Logger) LogIdleEntered(reason string, pollInterval time.Duration) {
	l.log(EventIdleEntered, fmt.Sprintf("Entering idle state: %s", reason), IdleData{
		Reason:       reason,
		PollInterval: pollInterval,
	})
}

// IdleCheckData contains idle task check event data.
type IdleCheckData struct {
	TaskFound bool   `json:"task_found"`
	TaskID    string `json:"task_id,omitempty"`
}

// LogIdleTaskCheck logs an idle task check.
func (l *Logger) LogIdleTaskCheck(taskFound bool, taskID string) {
	msg := "No tasks available"
	if taskFound {
		msg = fmt.Sprintf("Task %s now available", taskID)
	}
	l.log(EventIdleTaskCheck, msg, IdleCheckData{
		TaskFound: taskFound,
		TaskID:    taskID,
	})
}

// LogIdleFileChange logs file change detection during idle.
func (l *Logger) LogIdleFileChange(path string) {
	l.log(EventIdleFileChange, fmt.Sprintf("File change detected: %s", path), map[string]string{"path": path})
}

// --- Epic Events ---

// EpicCompletedData contains epic completed event data.
type EpicCompletedData struct {
	EpicID         string   `json:"epic_id"`
	Reason         string   `json:"reason"`
	CompletedTasks []string `json:"completed_tasks"`
}

// LogEpicCompleted logs epic completion.
func (l *Logger) LogEpicCompleted(reason string, completedTasks []string) {
	l.log(EventEpicCompleted, fmt.Sprintf("Epic %s completed: %s", l.epicID, reason), EpicCompletedData{
		EpicID:         l.epicID,
		Reason:         reason,
		CompletedTasks: completedTasks,
	})
}

// --- Context Generation Events ---

// EventType constants for context generation.
const (
	EventContextSkipped             EventType = "context_skipped"
	EventContextError               EventType = "context_error"
	EventContextGenerationStarted   EventType = "context_generation_started"
	EventContextGenerationFailed    EventType = "context_generation_failed"
	EventContextSaveFailed          EventType = "context_save_failed"
	EventContextGenerationCompleted EventType = "context_generation_completed"
	EventContextLoadFailed          EventType = "context_load_failed"
)

// ContextSkippedData contains context skipped event data.
type ContextSkippedData struct {
	EpicID    string `json:"epic_id"`
	Reason    string `json:"reason"`
	TaskCount int    `json:"task_count,omitempty"`
}

// LogContextSkipped logs when context generation is skipped.
func (l *Logger) LogContextSkipped(epicID, reason string, taskCount int) {
	l.log(EventContextSkipped, fmt.Sprintf("Context generation skipped for epic %s: %s", epicID, reason), ContextSkippedData{
		EpicID:    epicID,
		Reason:    reason,
		TaskCount: taskCount,
	})
}

// ContextErrorData contains context error event data.
type ContextErrorData struct {
	EpicID string `json:"epic_id"`
	Error  string `json:"error"`
	Phase  string `json:"phase"`
}

// LogContextError logs a context generation error.
func (l *Logger) LogContextError(epicID, errMsg, phase string) {
	l.log(EventContextError, fmt.Sprintf("Context error for epic %s during %s: %s", epicID, phase, errMsg), ContextErrorData{
		EpicID: epicID,
		Error:  errMsg,
		Phase:  phase,
	})
}

// ContextGenerationStartedData contains context generation start event data.
type ContextGenerationStartedData struct {
	EpicID    string `json:"epic_id"`
	TaskCount int    `json:"task_count"`
}

// LogContextGenerationStarted logs context generation start.
func (l *Logger) LogContextGenerationStarted(epicID string, taskCount int) {
	l.log(EventContextGenerationStarted, fmt.Sprintf("Starting context generation for epic %s with %d tasks", epicID, taskCount), ContextGenerationStartedData{
		EpicID:    epicID,
		TaskCount: taskCount,
	})
}

// ContextGenerationFailedData contains context generation failure event data.
type ContextGenerationFailedData struct {
	EpicID string `json:"epic_id"`
	Error  string `json:"error"`
}

// LogContextGenerationFailed logs context generation failure.
func (l *Logger) LogContextGenerationFailed(epicID, errMsg string) {
	l.log(EventContextGenerationFailed, fmt.Sprintf("Context generation failed for epic %s: %s", epicID, errMsg), ContextGenerationFailedData{
		EpicID: epicID,
		Error:  errMsg,
	})
}

// ContextSaveFailedData contains context save failure event data.
type ContextSaveFailedData struct {
	EpicID string `json:"epic_id"`
	Error  string `json:"error"`
}

// LogContextSaveFailed logs context save failure.
func (l *Logger) LogContextSaveFailed(epicID, errMsg string) {
	l.log(EventContextSaveFailed, fmt.Sprintf("Context save failed for epic %s: %s", epicID, errMsg), ContextSaveFailedData{
		EpicID: epicID,
		Error:  errMsg,
	})
}

// ContextGenerationCompletedData contains context generation completion event data.
type ContextGenerationCompletedData struct {
	EpicID        string `json:"epic_id"`
	ContentLength int    `json:"content_length"`
}

// LogContextGenerationCompleted logs context generation completion.
func (l *Logger) LogContextGenerationCompleted(epicID string, contentLength int) {
	l.log(EventContextGenerationCompleted, fmt.Sprintf("Context generation completed for epic %s (%d bytes)", epicID, contentLength), ContextGenerationCompletedData{
		EpicID:        epicID,
		ContentLength: contentLength,
	})
}

// ContextLoadFailedData contains context load failure event data.
type ContextLoadFailedData struct {
	EpicID string `json:"epic_id"`
	Error  string `json:"error"`
}

// LogContextLoadFailed logs context load failure.
func (l *Logger) LogContextLoadFailed(epicID, errMsg string) {
	l.log(EventContextLoadFailed, fmt.Sprintf("Context load failed for epic %s: %s", epicID, errMsg), ContextLoadFailedData{
		EpicID: epicID,
		Error:  errMsg,
	})
}
