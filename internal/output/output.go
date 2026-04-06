package output

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"
)

// BoardSink handles board SSE events and run record persistence.
type BoardSink interface {
	BroadcastRunEvent(epicID string, eventType string, data any)
	WriteEpicStatus(epicID string, status any) error
	WriteLiveRecord(tickID string, snap any) error
}

// CloudSink handles cloud sync of run events.
type CloudSink interface {
	SendRunEvent(epicID string, eventType string, data any) error
}

// RunLogSink handles structured run logging.
type RunLogSink interface {
	// Iteration events
	LogIterationStart(iteration int, taskID, taskTitle string)
	LogIterationEnd(iteration int, taskID string, duration time.Duration, tokensIn, tokensOut int, cost float64, signal, errStr string, isTimeout bool)

	// Context events
	LogContextGenerationStarted(epicID string, taskCount int)
	LogContextGenerationCompleted(epicID string, contentLength int)
	LogContextGenerationFailed(epicID string, errMsg string)
	LogContextSkipped(epicID string, reason string, taskCount int)
	LogContextLoadFailed(epicID string, errMsg string)
	LogContextSaveFailed(epicID string, errMsg string)
	LogContextError(epicID string, errMsg string, phase string)

	// Run lifecycle
	LogRunConfig(maxIter int, maxCost float64, maxDuration, agentTimeout time.Duration, maxTaskRetries int, watch bool, watchTimeout, watchPollInterval time.Duration)
	LogRunEnd(epicID string, iterations int, totalTokens int, totalCost float64, duration time.Duration, signal, exitReason string)

	// Task/agent events
	LogAgentTimeout(taskID string, timeout time.Duration, partialOutputLen int)
	LogAgentError(taskID string, errMsg string)
	LogTaskCompleted(taskID string, verificationPassed bool)
	LogNoTaskAvailable(reason string, hasOpen bool, watchMode bool)
	LogEpicCompleted(reason string, completedTasks []string)

	// Budget events
	LogBudgetCheck(limitType string, shouldStop bool, stopReason string, iteration, totalTokens int, totalCost float64)

	// Signal events
	LogSignalDetected(signal string, reason string, taskID string)
	LogSignalHandled(signal string, taskID string, action string, awaitingState string)

	// Watch/idle events
	LogIdleEntered(reason string, pollInterval time.Duration)
	LogIdleFileChange(path string)
	LogIdleTaskCheck(taskFound bool, taskID string)
}

// RunOutput is the single funnel for all tk run status updates.
// It routes events to up to 4 sinks: terminal (stdout/stderr),
// board SSE server, cloud client, and run log.
type RunOutput struct {
	w      io.Writer // terminal stdout
	errw   io.Writer // terminal stderr
	board  BoardSink
	cloud  CloudSink
	runLog RunLogSink
	jsonl           bool // suppress human output, emit JSONL only
	mu              sync.Mutex
	lastProgressLen int // length of last progress line for carriage-return clearing
}

// New creates a RunOutput with the given options.
// By default, stdout and stderr are nil (no terminal output).
func New(opts ...Option) *RunOutput {
	o := &RunOutput{}
	for _, opt := range opts {
		opt(o)
	}
	return o
}

// --- Setup events ---

// AgentInfo prints the agent name and worktree path.
func (o *RunOutput) AgentInfo(name, worktreePath string) {
	if o.jsonl {
		return
	}
	o.printf("Agent: %s\n", name)
	o.printf("Worktree: %s\n", worktreePath)
}

// BoardURL prints the board server URL.
func (o *RunOutput) BoardURL(port int) {
	if o.jsonl {
		return
	}
	o.printf("Board: http://localhost:%d\n", port)
}

// CloudInfo prints the cloud sync status.
func (o *RunOutput) CloudInfo(boardName string) {
	if o.jsonl {
		return
	}
	o.printf("Cloud: syncing as %s\n", boardName)
}

// --- Context events ---

// ContextGenerating signals that context generation has started.
func (o *RunOutput) ContextGenerating(epicID string, taskCount int) {
	if !o.jsonl {
		o.printf("\nGenerating epic context for %s (%d tasks)...\n", epicID, taskCount)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent(epicID, "context_generating", map[string]any{
			"task_count": taskCount,
		})
	}
	if o.runLog != nil {
		o.runLog.LogContextGenerationStarted(epicID, taskCount)
	}
}

// ContextProgress reports periodic progress during context generation.
func (o *RunOutput) ContextProgress(epicID string, elapsed time.Duration, tokensIn, tokensOut int) {
	if !o.jsonl {
		line := fmt.Sprintf("\r  Context: %s elapsed, %d tokens in, %d tokens out",
			elapsed.Truncate(time.Second), tokensIn, tokensOut)
		lineLen := len(line)
		if lineLen < o.lastProgressLen {
			line += strings.Repeat(" ", o.lastProgressLen-lineLen)
		}
		o.lastProgressLen = lineLen
		o.printf("%s", line)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent(epicID, "context_progress", map[string]any{
			"elapsed_ms": elapsed.Milliseconds(),
			"tokens_in":  tokensIn,
			"tokens_out": tokensOut,
		})
	}
}

// ContextGenerated signals that context generation completed successfully.
func (o *RunOutput) ContextGenerated(epicID string, tokenCount int) {
	if !o.jsonl {
		o.printf("\rContext generated (~%d tokens)%s\n", tokenCount, strings.Repeat(" ", 40))
	}
	if o.board != nil {
		o.board.BroadcastRunEvent(epicID, "context_generated", map[string]any{
			"token_count": tokenCount,
		})
	}
	if o.runLog != nil {
		o.runLog.LogContextGenerationCompleted(epicID, tokenCount)
	}
}

// ContextLoaded signals that existing context was loaded.
func (o *RunOutput) ContextLoaded(epicID string) {
	if !o.jsonl {
		o.printf("Using existing context for %s\n", epicID)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent(epicID, "context_loaded", nil)
	}
}

// ContextSkipped signals that context generation was skipped.
func (o *RunOutput) ContextSkipped(epicID string, reason string) {
	if !o.jsonl {
		o.printf("Context skipped: %s\n", reason)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent(epicID, "context_skipped", map[string]any{
			"reason": reason,
		})
	}
	if o.runLog != nil {
		o.runLog.LogContextSkipped(epicID, reason, 0)
	}
}

// ContextFailed signals that context generation failed.
func (o *RunOutput) ContextFailed(epicID string, err string) {
	if !o.jsonl {
		o.printf("Context generation failed: %s\n", err)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent(epicID, "context_failed", map[string]any{
			"error": err,
		})
	}
	if o.runLog != nil {
		o.runLog.LogContextLoadFailed(epicID, err)
	}
}

// --- Wave events ---

// WaveStarted signals that a new wave iteration has begun.
func (o *RunOutput) WaveStarted(iteration int, taskIDs []string) {
	if o.board != nil {
		o.board.BroadcastRunEvent("", "wave_started", map[string]any{
			"iteration": iteration,
			"task_ids":  taskIDs,
		})
	}
}

// TaskStarted signals that a task has begun execution.
func (o *RunOutput) TaskStarted(iteration int, taskID, title string) {
	if !o.jsonl {
		o.printf("\n=== Iteration %d: %s (%s) ===\n", iteration, taskID, title)
	}
	if o.runLog != nil {
		o.runLog.LogIterationStart(iteration, taskID, title)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent("", "task_started", map[string]any{
			"iteration": iteration,
			"task_id":   taskID,
			"title":     title,
		})
	}
}

// IterationResult mirrors the engine's IterationResult for output purposes.
type IterationResult struct {
	Iteration    int
	TaskID       string
	TaskTitle    string
	Output       string
	TokensIn     int
	TokensOut    int
	Cost         float64
	Duration     time.Duration
	Signal       string
	SignalReason string
	Error        error
	IsTimeout    bool
}

// TaskCompleted signals that a task has finished execution.
func (o *RunOutput) TaskCompleted(result IterationResult) {
	if !o.jsonl {
		o.printf("\n--- Iteration %d complete (tokens: %d in, %d out, cost: $%.4f) ---\n",
			result.Iteration, result.TokensIn, result.TokensOut, result.Cost)
	}
	if o.runLog != nil {
		o.runLog.LogIterationEnd(result.Iteration, result.TaskID, result.Duration, result.TokensIn, result.TokensOut, result.Cost, result.Signal, errorString(result.Error), result.IsTimeout)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent("", "task_completed", map[string]any{
			"iteration":  result.Iteration,
			"task_id":    result.TaskID,
			"task_title": result.TaskTitle,
			"tokens_in":  result.TokensIn,
			"tokens_out": result.TokensOut,
			"cost":       result.Cost,
			"duration":   result.Duration.String(),
			"signal":     result.Signal,
			"error":      errorString(result.Error),
			"is_timeout": result.IsTimeout,
		})
	}
}

// AgentOutput forwards a chunk of agent output (streaming).
func (o *RunOutput) AgentOutput(chunk string) {
	if o.board != nil {
		o.board.BroadcastRunEvent("", "agent_output", map[string]any{
			"chunk": chunk,
		})
	}
}

// AgentState forwards a structured agent state snapshot.
func (o *RunOutput) AgentState(taskID string, snap any) {
	if o.board != nil {
		o.board.WriteLiveRecord(taskID, snap) //nolint:errcheck
	}
}

// Signal reports a detected signal from agent output.
func (o *RunOutput) Signal(signal, reason, taskID string) {
	if o.runLog != nil {
		o.runLog.LogSignalDetected(signal, reason, taskID)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent("", "signal_detected", map[string]any{
			"signal":  signal,
			"reason":  reason,
			"task_id": taskID,
		})
	}
}

// SignalHandled reports how a signal was processed.
func (o *RunOutput) SignalHandled(signal, taskID, action, awaitingState string) {
	if o.runLog != nil {
		o.runLog.LogSignalHandled(signal, taskID, action, awaitingState)
	}
}

// Idle signals that the engine entered idle state (watch mode).
func (o *RunOutput) Idle() {
	if o.board != nil {
		o.board.BroadcastRunEvent("", "idle", nil)
	}
}

// ContextActive signals that existing context is being used for a wave.
func (o *RunOutput) ContextActive(epicID string) {
	if o.board != nil {
		o.board.BroadcastRunEvent(epicID, "context_active", nil)
	}
}

// ContextError reports a context-related error during a specific phase.
func (o *RunOutput) ContextError(epicID, errMsg, phase string) {
	if o.runLog != nil {
		o.runLog.LogContextError(epicID, errMsg, phase)
	}
}

// ContextGenerationFailed reports that context generation failed.
func (o *RunOutput) ContextGenerationFailed(epicID, errMsg string) {
	if !o.jsonl {
		o.printf("Context generation failed: %s\n", errMsg)
	}
	if o.runLog != nil {
		o.runLog.LogContextGenerationFailed(epicID, errMsg)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent(epicID, "context_failed", map[string]any{
			"error": errMsg,
		})
	}
}

// ContextSaveFailed reports that saving generated context failed.
func (o *RunOutput) ContextSaveFailed(epicID, errMsg string) {
	if !o.jsonl {
		o.printf("Context save failed: %s\n", errMsg)
	}
	if o.runLog != nil {
		o.runLog.LogContextSaveFailed(epicID, errMsg)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent(epicID, "context_failed", map[string]any{
			"error": errMsg,
		})
	}
}

// EpicStatus writes an epic status update to the board sink.
func (o *RunOutput) EpicStatus(epicID string, status any) {
	if o.board != nil {
		o.board.WriteEpicStatus(epicID, status) //nolint:errcheck
	}
}

// --- Run lifecycle logging (runlog-only) ---

// RunConfig logs the applied run configuration.
func (o *RunOutput) RunConfig(maxIter int, maxCost float64, maxDuration, agentTimeout time.Duration, maxTaskRetries int, watch bool, watchTimeout, watchPollInterval time.Duration) {
	if o.runLog != nil {
		o.runLog.LogRunConfig(maxIter, maxCost, maxDuration, agentTimeout, maxTaskRetries, watch, watchTimeout, watchPollInterval)
	}
}

// BudgetExceeded logs a budget limit check.
func (o *RunOutput) BudgetExceeded(limitType string, shouldStop bool, stopReason string, iteration, totalTokens int, totalCost float64) {
	if o.runLog != nil {
		o.runLog.LogBudgetCheck(limitType, shouldStop, stopReason, iteration, totalTokens, totalCost)
	}
}

// NoTaskAvailable logs when no tasks are available.
func (o *RunOutput) NoTaskAvailable(reason string, hasOpen, watchMode bool) {
	if o.runLog != nil {
		o.runLog.LogNoTaskAvailable(reason, hasOpen, watchMode)
	}
}

// EpicCompleted logs that an epic has been completed.
func (o *RunOutput) EpicCompleted(reason string, completedTasks []string) {
	if o.runLog != nil {
		o.runLog.LogEpicCompleted(reason, completedTasks)
	}
}

// AgentTimeout logs that an agent timed out.
func (o *RunOutput) AgentTimeout(taskID string, timeout time.Duration, partialOutputLen int) {
	if o.runLog != nil {
		o.runLog.LogAgentTimeout(taskID, timeout, partialOutputLen)
	}
}

// AgentError logs an agent error.
func (o *RunOutput) AgentError(taskID, errMsg string) {
	if o.runLog != nil {
		o.runLog.LogAgentError(taskID, errMsg)
	}
}

// TaskClosed logs that a task was closed by the agent.
func (o *RunOutput) TaskClosed(taskID string, verificationPassed bool) {
	if o.runLog != nil {
		o.runLog.LogTaskCompleted(taskID, verificationPassed)
	}
}

// IdleEntered logs entering idle/watch state.
func (o *RunOutput) IdleEntered(reason string, pollInterval time.Duration) {
	if o.runLog != nil {
		o.runLog.LogIdleEntered(reason, pollInterval)
	}
}

// IdleFileChange logs a file change detected during idle.
func (o *RunOutput) IdleFileChange(path string) {
	if o.runLog != nil {
		o.runLog.LogIdleFileChange(path)
	}
}

// IdleTaskCheck logs an idle task availability check.
func (o *RunOutput) IdleTaskCheck(found bool, taskID string) {
	if o.runLog != nil {
		o.runLog.LogIdleTaskCheck(found, taskID)
	}
}

// --- Completion events ---

// RunResult mirrors the engine's RunResult for output purposes.
type RunResult struct {
	EpicID         string
	Iterations     int
	TotalTokens    int
	TotalCost      float64
	Duration       time.Duration
	CompletedTasks []string
	Signal         string
	SignalReason   string
	ExitReason     string
}

// RunComplete signals that the entire run has finished.
func (o *RunOutput) RunComplete(result RunResult) {
	if o.jsonl {
		o.writeJSONL(result)
	} else {
		o.printf("\n=== Run Complete ===\n")
		o.printf("Epic: %s\n", result.EpicID)
		o.printf("Iterations: %d\n", result.Iterations)
		o.printf("Tokens: %d\n", result.TotalTokens)
		o.printf("Cost: $%.4f\n", result.TotalCost)
		o.printf("Duration: %v\n", result.Duration.Round(time.Second))
		o.printf("Completed tasks: %d\n", len(result.CompletedTasks))
		o.printf("Exit reason: %s\n", result.ExitReason)
		if result.Signal != "" {
			o.printf("Signal: %s\n", result.Signal)
			if result.SignalReason != "" {
				o.printf("Signal reason: %s\n", result.SignalReason)
			}
		}
	}
	if o.runLog != nil {
		o.runLog.LogRunEnd(result.EpicID, result.Iterations, result.TotalTokens, result.TotalCost, result.Duration, result.Signal, result.ExitReason)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent(result.EpicID, "run_complete", map[string]any{
			"iterations":      result.Iterations,
			"total_tokens":    result.TotalTokens,
			"total_cost":      result.TotalCost,
			"duration":        result.Duration.String(),
			"completed_tasks": result.CompletedTasks,
			"signal":          result.Signal,
			"exit_reason":     result.ExitReason,
		})
	}
}

// --- Wrapup events ---

// WrapupStepResult reports the result of a wrapup step (verify, report, merge, etc.).
func (o *RunOutput) WrapupStepResult(name string, success bool, err error) {
	if o.jsonl {
		return
	}
	status := "PASS"
	if !success {
		status = "FAIL"
	}
	o.printf("  [%s] %s\n", status, name)
	if !success && err != nil {
		o.eprintf("    error: %v\n", err)
	}
}

// WrapupAgentStepStarted signals that an agent wrapup step has started.
func (o *RunOutput) WrapupAgentStepStarted(index, total int, title string) {
	if !o.jsonl {
		o.printf("  [%d/%d] %s...\n", index, total, title)
	}
	if o.board != nil {
		o.board.BroadcastRunEvent("", "wrapup_agent_step_started", map[string]any{
			"index": index,
			"total": total,
			"title": title,
		})
	}
}

// WrapupAgentStepCompleted signals that an agent wrapup step has finished.
func (o *RunOutput) WrapupAgentStepCompleted(index, total int, title, status string, duration time.Duration) {
	if !o.jsonl {
		o.printf("  [%d/%d] %s — %s (%s)\n", index, total, title, status, duration.Truncate(time.Millisecond))
	}
	if o.board != nil {
		o.board.BroadcastRunEvent("", "wrapup_agent_step_completed", map[string]any{
			"index":    index,
			"total":    total,
			"title":    title,
			"status":   status,
			"duration": duration.String(),
		})
	}
}

// MergeSuccess reports a successful merge and worktree cleanup.
func (o *RunOutput) MergeSuccess(targetBranch string) {
	if o.jsonl {
		return
	}
	o.printf("Merged to %s and cleaned up worktree\n", targetBranch)
}

// PRCreated reports a successfully created pull request.
func (o *RunOutput) PRCreated(url string) {
	o.printf("PR created: %s\n", url)
}

// WorktreePreserved reports that a worktree was kept instead of cleaned up.
func (o *RunOutput) WorktreePreserved(path, reason string) {
	if o.jsonl {
		return
	}
	o.printf("Worktree preserved (%s): %s\n", reason, path)
}

// WorktreeInfo prints worktree path and branch info (e.g. for --no-merge).
func (o *RunOutput) WorktreeInfo(path, branch string) {
	if o.jsonl {
		return
	}
	o.printf("Worktree preserved (--no-merge): %s\n", path)
	o.printf("Branch: %s\n", branch)
}

// --- Error/warning events ---

// Warn prints a warning message to stderr.
func (o *RunOutput) Warn(msg string, args ...any) {
	o.eprintf("Warning: "+msg+"\n", args...)
}

// Error prints an error message to stderr.
func (o *RunOutput) Error(msg string, args ...any) {
	o.eprintf("Error: "+msg+"\n", args...)
}

// jsonlRunOutput is the JSONL output format for run results.
type jsonlRunOutput struct {
	EpicID         string   `json:"epic_id"`
	Iterations     int      `json:"iterations"`
	TotalTokens    int      `json:"total_tokens"`
	TotalCost      float64  `json:"total_cost"`
	DurationSec    float64  `json:"duration_sec"`
	CompletedTasks []string `json:"completed_tasks"`
	ExitReason     string   `json:"exit_reason"`
	Signal         string   `json:"signal,omitempty"`
	SignalReason   string   `json:"signal_reason,omitempty"`
}

// --- internal helpers ---

func (o *RunOutput) writeJSONL(result RunResult) {
	if o.w == nil {
		return
	}
	out := jsonlRunOutput{
		EpicID:         result.EpicID,
		Iterations:     result.Iterations,
		TotalTokens:    result.TotalTokens,
		TotalCost:      result.TotalCost,
		DurationSec:    result.Duration.Seconds(),
		CompletedTasks: result.CompletedTasks,
		ExitReason:     result.ExitReason,
		Signal:         result.Signal,
		SignalReason:   result.SignalReason,
	}
	o.mu.Lock()
	defer o.mu.Unlock()
	enc := json.NewEncoder(o.w)
	_ = enc.Encode(out)
}

func (o *RunOutput) printf(format string, args ...any) {
	if o.w == nil {
		return
	}
	o.mu.Lock()
	defer o.mu.Unlock()
	fmt.Fprintf(o.w, format, args...)
}

func (o *RunOutput) eprintf(format string, args ...any) {
	if o.errw == nil {
		return
	}
	o.mu.Lock()
	defer o.mu.Unlock()
	fmt.Fprintf(o.errw, format, args...)
}

func errorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
