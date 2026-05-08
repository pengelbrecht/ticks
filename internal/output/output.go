package output

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
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

	// Lifecycle events
	LogLifecycleEvent(eventType, message string)
}

// RunOutput is the single funnel for all tk run status updates.
// It routes events to up to 5 sinks: terminal (stdout/stderr),
// board SSE server, cloud client, run log, and status widget.
type RunOutput struct {
	w      io.Writer // terminal stdout
	errw   io.Writer // terminal stderr
	board  BoardSink
	cloud  CloudSink
	runLog RunLogSink
	status *StatusSink // live TUI status widget (optional)
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

// EpicInfo sets the epic metadata for display (used by status widget).
func (o *RunOutput) EpicInfo(epicID, title string) {
	if o.status != nil {
		o.status.OnEpicTitle(title)
	}
}

// RegisterTasks registers the set of tasks for the status widget.
// Must be called before the wave loop begins so the widget can show total count.
func (o *RunOutput) RegisterTasks(tasks []*tick.Tick) {
	if o.status != nil {
		for _, t := range tasks {
			awaitingType := ""
			if t.IsAwaitingHuman() {
				awaitingType = t.GetAwaitingType()
			}
			o.status.Builder().RegisterTask(t.ID, t.Title, t.BlockedBy, awaitingType)
		}
	}
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
	if o.status != nil {
		o.status.OnContextGenerating(epicID, taskCount)
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
	if o.status != nil {
		o.status.OnContextGenerated(epicID, tokenCount)
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
	if o.status != nil {
		o.status.OnContextLoaded(epicID)
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
	if o.status != nil {
		o.status.OnContextSkipped(epicID, reason)
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
	if o.status != nil {
		o.status.OnWaveStarted(iteration, taskIDs)
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
	if o.status != nil {
		o.status.OnTaskStarted(iteration, taskID, title)
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
	if o.status != nil {
		o.status.OnTaskCompleted(result)
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
	// Note: status sink receives live updates via OnAgentState, which is
	// called separately with parsed fields rather than the raw snapshot.
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
	if o.status != nil {
		o.status.OnSignal(signal, reason, taskID)
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
	if o.status != nil {
		o.status.OnIdle()
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
	if o.status != nil {
		o.status.OnBudgetConfig(maxIter, maxCost)
	}
}

// PolicyConfig logs the active policy configuration.
func (o *RunOutput) PolicyConfig(summary map[string]interface{}) {
	if o.jsonl {
		// Emit policy as JSONL event
		if o.w != nil {
			payload := map[string]interface{}{"event": "policy_config"}
			for k, v := range summary {
				payload[k] = v
			}
			o.mu.Lock()
			enc := json.NewEncoder(o.w)
			_ = enc.Encode(payload)
			o.mu.Unlock()
		}
		return
	}
	o.printf("Policy: max_attempts=%v no_progress=%v verifier_fails=%v require_commit=%v secrets=%v\n",
		summary["max_attempts"],
		summary["max_no_progress_attempts"],
		summary["max_same_verifier_failures"],
		summary["require_commit"],
		summary["secrets_exposure"],
	)
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
	if o.status != nil {
		o.status.OnTaskClosed(taskID)
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

// --- Lifecycle status events ---
// These methods emit human-readable lifecycle messages to all sinks.
// They are persisted in the ViewModel's Events list for dashboard display
// after interruption.

// WorktreePlanning signals that worktree setup is being planned.
func (o *RunOutput) WorktreePlanning(epicID string) {
	if !o.jsonl {
		o.printf("Planning worktree for epic %s...\n", epicID)
	}
	o.lifecycleEvent("worktree", fmt.Sprintf("Planning worktree for epic %s", epicID), "")
	o.broadcastLifecycle(epicID, "worktree_planning", map[string]any{"epic_id": epicID})
}

// WorktreeCreating signals that a new worktree is being created.
func (o *RunOutput) WorktreeCreating(epicID string) {
	if !o.jsonl {
		o.printf("Creating worktree for epic %s...\n", epicID)
	}
	o.lifecycleEvent("worktree", fmt.Sprintf("Creating worktree for epic %s", epicID), "")
	o.broadcastLifecycle(epicID, "worktree_creating", map[string]any{"epic_id": epicID})
}

// WorktreeCreated signals that a new worktree was created.
func (o *RunOutput) WorktreeCreated(epicID, path string) {
	if !o.jsonl {
		o.printf("Worktree created: %s\n", path)
	}
	o.lifecycleEvent("worktree", "Worktree created", path)
	o.broadcastLifecycle(epicID, "worktree_created", map[string]any{"epic_id": epicID, "path": path})
	o.logLifecycleEvent("worktree_created", fmt.Sprintf("Worktree created at %s", path))
}

// WorktreeReused signals that an existing worktree is being reused.
func (o *RunOutput) WorktreeReused(epicID, path string) {
	if !o.jsonl {
		o.printf("Reusing existing worktree: %s\n", path)
	}
	o.lifecycleEvent("worktree", "Reusing existing worktree", path)
	o.broadcastLifecycle(epicID, "worktree_reused", map[string]any{"epic_id": epicID, "path": path})
	o.logLifecycleEvent("worktree_reused", fmt.Sprintf("Reusing worktree at %s", path))
}

// WorktreeProtected signals that a worktree is being preserved (not cleaned up).
func (o *RunOutput) WorktreeProtected(path, reason string) {
	o.lifecycleEvent("worktree", "Worktree protected", fmt.Sprintf("%s (%s)", path, reason))
	o.broadcastLifecycle("", "worktree_protected", map[string]any{"path": path, "reason": reason})
	o.logLifecycleEvent("worktree_protected", fmt.Sprintf("Worktree protected: %s (%s)", path, reason))
}

// WorktreeProvisioning signals that the worktree environment is being set up.
func (o *RunOutput) WorktreeProvisioning(path string) {
	if !o.jsonl {
		o.printf("Provisioning worktree environment...\n")
	}
	o.lifecycleEvent("worktree", "Provisioning worktree environment", path)
	o.broadcastLifecycle("", "worktree_provisioning", map[string]any{"path": path})
}

// WorktreeTeardown signals that a worktree is being removed.
func (o *RunOutput) WorktreeTeardown(path string) {
	if !o.jsonl {
		o.printf("Removing worktree: %s\n", path)
	}
	o.lifecycleEvent("worktree", "Worktree teardown", path)
	o.broadcastLifecycle("", "worktree_teardown", map[string]any{"path": path})
	o.logLifecycleEvent("worktree_teardown", fmt.Sprintf("Removing worktree at %s", path))
}

// LeaseAcquired signals that a run lease was acquired for an epic.
func (o *RunOutput) LeaseAcquired(epicID string) {
	o.lifecycleEvent("lease", fmt.Sprintf("Lease acquired for epic %s", epicID), "")
	o.broadcastLifecycle(epicID, "lease_acquired", map[string]any{"epic_id": epicID})
	o.logLifecycleEvent("lease_acquired", fmt.Sprintf("Lease acquired for epic %s", epicID))
}

// LeaseReleased signals that a run lease was released.
func (o *RunOutput) LeaseReleased(epicID string) {
	o.lifecycleEvent("lease", fmt.Sprintf("Lease released for epic %s", epicID), "")
	o.broadcastLifecycle(epicID, "lease_released", map[string]any{"epic_id": epicID})
	o.logLifecycleEvent("lease_released", fmt.Sprintf("Lease released for epic %s", epicID))
}

// TickLaunched signals that a tick/task agent has been launched.
func (o *RunOutput) TickLaunched(taskID, title string) {
	if !o.jsonl {
		o.printf("Launching tick %s: %s\n", taskID, title)
	}
	o.lifecycleEvent("tick", fmt.Sprintf("Tick launched: %s", title), taskID)
	o.broadcastLifecycle("", "tick_launched", map[string]any{"task_id": taskID, "title": title})
	o.logLifecycleEvent("tick_launched", fmt.Sprintf("Tick %s launched: %s", taskID, title))
}

// TickClose signals that a tick has been closed.
func (o *RunOutput) TickClose(taskID, reason string) {
	if !o.jsonl {
		o.printf("Tick %s closed: %s\n", taskID, reason)
	}
	o.lifecycleEvent("tick", fmt.Sprintf("Tick closed: %s", taskID), reason)
	o.broadcastLifecycle("", "tick_closed", map[string]any{"task_id": taskID, "reason": reason})
	o.logLifecycleEvent("tick_closed", fmt.Sprintf("Tick %s closed: %s", taskID, reason))
}

// TickHandoff signals that a tick is being handed off to a human.
func (o *RunOutput) TickHandoff(taskID, awaitingType, reason string) {
	if !o.jsonl {
		o.printf("Tick %s → awaiting %s: %s\n", taskID, awaitingType, reason)
	}
	o.lifecycleEvent("tick", fmt.Sprintf("Tick %s → awaiting %s", taskID, awaitingType), reason)
	o.broadcastLifecycle("", "tick_handoff", map[string]any{"task_id": taskID, "awaiting_type": awaitingType, "reason": reason})
	o.logLifecycleEvent("tick_handoff", fmt.Sprintf("Tick %s handed off: awaiting %s", taskID, awaitingType))
}

// TickEscalation signals that a tick has been escalated.
func (o *RunOutput) TickEscalation(taskID, reason string) {
	if !o.jsonl {
		o.printf("⚠ Tick %s escalated: %s\n", taskID, reason)
	}
	o.lifecycleEvent("tick", fmt.Sprintf("Tick %s escalated", taskID), reason)
	o.broadcastLifecycle("", "tick_escalation", map[string]any{"task_id": taskID, "reason": reason})
	o.logLifecycleEvent("tick_escalation", fmt.Sprintf("Tick %s escalated: %s", taskID, reason))
}

// VerifierStart signals that verification has started for a task.
func (o *RunOutput) VerifierStart(taskID string, verifiers []string) {
	if !o.jsonl {
		o.printf("Verifying tick %s (%d verifiers)...\n", taskID, len(verifiers))
	}
	o.lifecycleEvent("verifier", fmt.Sprintf("Verification started for %s", taskID), fmt.Sprintf("%d verifiers", len(verifiers)))
	o.broadcastLifecycle("", "verifier_started", map[string]any{"task_id": taskID, "verifiers": verifiers})
	o.logLifecycleEvent("verifier_started", fmt.Sprintf("Verification started for %s with %d verifiers", taskID, len(verifiers)))
}

// VerifierEnd signals that verification has completed for a task.
func (o *RunOutput) VerifierEnd(taskID string, passed bool, failed []string) {
	result := "passed"
	if !passed {
		result = fmt.Sprintf("failed (%s)", strings.Join(failed, ", "))
	}
	if !o.jsonl {
		o.printf("Verification %s for tick %s\n", result, taskID)
	}
	o.lifecycleEvent("verifier", fmt.Sprintf("Verification %s for %s", result, taskID), "")
	o.broadcastLifecycle("", "verifier_ended", map[string]any{"task_id": taskID, "passed": passed, "failed": failed})
	o.logLifecycleEvent("verifier_ended", fmt.Sprintf("Verification %s for %s", result, taskID))
}

// MergeStarting signals that a merge is starting.
func (o *RunOutput) MergeStarting(branch string) {
	if !o.jsonl {
		o.printf("Merging to %s...\n", branch)
	}
	o.lifecycleEvent("merge", fmt.Sprintf("Merging to %s", branch), "")
	o.broadcastLifecycle("", "merge_starting", map[string]any{"branch": branch})
	o.logLifecycleEvent("merge_starting", fmt.Sprintf("Merge starting to %s", branch))
}

// MergeCompleted signals that a merge succeeded.
func (o *RunOutput) MergeCompleted(branch string) {
	o.lifecycleEvent("merge", fmt.Sprintf("Merged to %s", branch), "")
	o.broadcastLifecycle("", "merge_completed", map[string]any{"branch": branch})
	o.logLifecycleEvent("merge_completed", fmt.Sprintf("Merge succeeded to %s", branch))
}

// MergeConflict signals that a merge had conflicts.
func (o *RunOutput) MergeConflict(branch string, conflicts []string) {
	detail := strings.Join(conflicts, ", ")
	o.lifecycleEvent("merge", fmt.Sprintf("Merge conflicts on %s", branch), detail)
	o.broadcastLifecycle("", "merge_conflict", map[string]any{"branch": branch, "conflicts": conflicts})
	o.logLifecycleEvent("merge_conflict", fmt.Sprintf("Merge conflicts on %s: %s", branch, detail))
}

// lifecycleEvent records a lifecycle event in the status sink's builder.
func (o *RunOutput) lifecycleEvent(category, message, detail string) {
	if o.status != nil {
		o.status.OnLifecycleEvent(category, message, detail)
	}
}

// broadcastLifecycle sends a lifecycle event to the board sink.
func (o *RunOutput) broadcastLifecycle(epicID, eventType string, data map[string]any) {
	if o.board != nil {
		o.board.BroadcastRunEvent(epicID, eventType, data)
	}
}

// logLifecycleEvent logs a lifecycle event to the run log.
func (o *RunOutput) logLifecycleEvent(eventType, message string) {
	if o.runLog != nil {
		o.runLog.LogLifecycleEvent(eventType, message)
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
	if o.status != nil {
		o.status.OnRunComplete(result)
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
