package runstate

import (
	"encoding/json"
	"time"
)

// Phase represents the current lifecycle phase of a Tickflow run.
type Phase string

const (
	// PhaseStarting is the initial phase before the engine loop begins.
	PhaseStarting Phase = "starting"
	// PhaseContextGenerating means epic context is being generated via AI.
	PhaseContextGenerating Phase = "context_generating"
	// PhaseRunning means the wave loop is actively executing tasks.
	PhaseRunning Phase = "running"
	// PhaseIdle means the engine is in watch mode waiting for tasks.
	PhaseIdle Phase = "idle"
	// PhaseWrapUp means the run completed and wrap-up steps are executing.
	PhaseWrapUp Phase = "wrap_up"
	// PhaseDone means the run has finished (success or failure).
	PhaseDone Phase = "done"
)

// TaskState represents the state of a single task within a run.
type TaskState string

const (
	// TaskReady means the task is ready to execute (no open blockers).
	TaskReady TaskState = "ready"
	// TaskRunning means an agent is currently working on this task.
	TaskRunning TaskState = "running"
	// TaskCompleted means the agent finished and closed the task.
	TaskCompleted TaskState = "completed"
	// TaskFailed means the agent encountered an error or timeout.
	TaskFailed TaskState = "failed"
	// TaskBlocked means the task has unresolved dependencies.
	TaskBlocked TaskState = "blocked"
	// TaskAwaiting means the task is waiting for human action.
	TaskAwaiting TaskState = "awaiting"
	// TaskSkipped means the task was skipped (e.g., policy limits).
	TaskSkipped TaskState = "skipped"
)

// ViewModel is an immutable, point-in-time snapshot of a Tickflow run.
// It contains everything a UI layer needs to render the run state
// without accessing engine internals.
type ViewModel struct {
	// EpicID is the epic being executed.
	EpicID string `json:"epic_id"`

	// EpicTitle is the human-readable title of the epic.
	EpicTitle string `json:"epic_title"`

	// Phase is the current lifecycle phase of the run.
	Phase Phase `json:"phase"`

	// Wave is the current wave/iteration number (1-indexed, 0 if not started).
	Wave int `json:"wave"`

	// Tasks contains the state of every task in the epic, ordered by wave
	// assignment and priority.
	Tasks []TaskView `json:"tasks"`

	// ActiveTaskIDs lists task IDs currently being executed in the current wave.
	ActiveTaskIDs []string `json:"active_task_ids"`

	// Metrics contains aggregate run metrics.
	Metrics RunMetrics `json:"metrics"`

	// Budget describes remaining budget (iterations, cost).
	Budget BudgetView `json:"budget"`

	// Context describes the epic context state.
	Context ContextView `json:"context"`

	// Signals lists signals emitted during the run, most recent first.
	Signals []SignalEvent `json:"signals,omitempty"`

	// Events lists lifecycle events in chronological order (most recent first).
	// Persisted in run state for dashboard display after interruption.
	Events []LifecycleEvent `json:"events,omitempty"`

	// ExitReason is set when Phase == PhaseDone.
	ExitReason string `json:"exit_reason,omitempty"`

	// Error is set when the run ended due to an error.
	Error string `json:"error,omitempty"`

	// StartedAt is when the run began.
	StartedAt time.Time `json:"started_at"`

	// SnapshotAt is when this snapshot was taken.
	SnapshotAt time.Time `json:"snapshot_at"`

	// CompletedTasks lists IDs of tasks that were closed during this run.
	CompletedTasks []string `json:"completed_tasks"`
}

// TaskView is the presentation state of a single task.
type TaskView struct {
	// ID is the tick ID.
	ID string `json:"id"`

	// Title is the task title.
	Title string `json:"title"`

	// State is the current state of this task in the run.
	State TaskState `json:"state"`

	// Wave is the wave number this task was assigned to (0 if not yet assigned).
	Wave int `json:"wave,omitempty"`

	// Attempts is the number of times this task has been attempted.
	Attempts int `json:"attempts,omitempty"`

	// AwaitingType describes what the task is waiting for (e.g., "approval", "input").
	// Empty when State != TaskAwaiting.
	AwaitingType string `json:"awaiting_type,omitempty"`

	// BlockedBy lists IDs of tasks blocking this one.
	BlockedBy []string `json:"blocked_by,omitempty"`

	// Signal is the last signal emitted by the agent for this task.
	Signal string `json:"signal,omitempty"`

	// SignalReason is the context for the signal.
	SignalReason string `json:"signal_reason,omitempty"`

	// Duration is how long the task ran (cumulative across retries).
	Duration time.Duration `json:"duration,omitempty"`

	// TokensIn is the cumulative input tokens for this task.
	TokensIn int `json:"tokens_in,omitempty"`

	// TokensOut is the cumulative output tokens for this task.
	TokensOut int `json:"tokens_out,omitempty"`

	// Cost is the cumulative cost in USD for this task.
	Cost float64 `json:"cost,omitempty"`

	// IsTimeout indicates the last attempt timed out.
	IsTimeout bool `json:"is_timeout,omitempty"`

	// Error is the error message from the last failed attempt.
	Error string `json:"error,omitempty"`

	// ActiveTool describes the tool currently being used (nil when not running).
	ActiveTool *ToolView `json:"active_tool,omitempty"`

	// NumTurns is the number of agent turns so far (from live record).
	NumTurns int `json:"num_turns,omitempty"`
}

// ToolView describes an active or recently completed tool invocation.
type ToolView struct {
	Name     string        `json:"name"`
	Input    string        `json:"input,omitempty"`
	Duration time.Duration `json:"duration,omitempty"`
}

// RunMetrics contains aggregate metrics for the entire run.
type RunMetrics struct {
	// Iterations is the total number of wave iterations completed.
	Iterations int `json:"iterations"`

	// TotalTokensIn is the cumulative input token count.
	TotalTokensIn int `json:"total_tokens_in"`

	// TotalTokensOut is the cumulative output token count.
	TotalTokensOut int `json:"total_tokens_out"`

	// TotalCost is the cumulative cost in USD.
	TotalCost float64 `json:"total_cost"`

	// Duration is the total wall-clock time since run start.
	Duration time.Duration `json:"duration"`

	// TasksCompleted is the count of tasks closed during this run.
	TasksCompleted int `json:"tasks_completed"`

	// TasksFailed is the count of tasks that errored or timed out.
	TasksFailed int `json:"tasks_failed"`

	// TasksAwaiting is the count of tasks waiting for human action.
	TasksAwaiting int `json:"tasks_awaiting"`

	// TasksBlocked is the count of tasks with unresolved dependencies.
	TasksBlocked int `json:"tasks_blocked"`

	// TasksRemaining is the count of open tasks not yet started.
	TasksRemaining int `json:"tasks_remaining"`
}

// BudgetView describes the budget state for display.
type BudgetView struct {
	// MaxIterations is the configured iteration limit (0 = unlimited).
	MaxIterations int `json:"max_iterations"`

	// MaxCost is the configured cost limit in USD (0 = unlimited).
	MaxCost float64 `json:"max_cost"`

	// IterationsUsed is how many iterations have been consumed.
	IterationsUsed int `json:"iterations_used"`

	// CostUsed is how much cost has been consumed.
	CostUsed float64 `json:"cost_used"`
}

// IterationsRemaining returns the remaining iterations, or -1 if unlimited.
func (b BudgetView) IterationsRemaining() int {
	if b.MaxIterations == 0 {
		return -1
	}
	rem := b.MaxIterations - b.IterationsUsed
	if rem < 0 {
		return 0
	}
	return rem
}

// CostRemaining returns the remaining cost budget, or -1 if unlimited.
func (b BudgetView) CostRemaining() float64 {
	if b.MaxCost == 0 {
		return -1
	}
	rem := b.MaxCost - b.CostUsed
	if rem < 0 {
		return 0
	}
	return rem
}

// ContextView describes the epic context generation state.
type ContextView struct {
	// Status is the context state: "", "generating", "generated", "loaded", "skipped", "failed".
	Status string `json:"status"`

	// TaskCount is the number of tasks used for context generation.
	TaskCount int `json:"task_count,omitempty"`

	// TokenCount is the estimated token count of the generated context.
	TokenCount int `json:"token_count,omitempty"`

	// Error is set when context generation failed.
	Error string `json:"error,omitempty"`
}

// SignalEvent records a signal emitted by an agent during the run.
type SignalEvent struct {
	// Signal is the signal type (e.g., "COMPLETE", "EJECT", "INPUT_NEEDED").
	Signal string `json:"signal"`

	// Reason is the context provided with the signal.
	Reason string `json:"reason,omitempty"`

	// TaskID is the task that emitted the signal.
	TaskID string `json:"task_id"`

	// Wave is the wave number when the signal was emitted.
	Wave int `json:"wave"`

	// At is when the signal was detected.
	At time.Time `json:"at"`
}

// LifecycleCategory groups related lifecycle events.
type LifecycleCategory string

const (
	// LifecycleWorktree covers worktree planning, creation, reuse, protection, teardown.
	LifecycleWorktree LifecycleCategory = "worktree"

	// LifecycleLease covers lease acquisition and release.
	LifecycleLease LifecycleCategory = "lease"

	// LifecycleTick covers tick launch, close, handoff, and escalation.
	LifecycleTick LifecycleCategory = "tick"

	// LifecycleVerifier covers verifier start and end.
	LifecycleVerifier LifecycleCategory = "verifier"

	// LifecycleMerge covers merge start, success, and conflict.
	LifecycleMerge LifecycleCategory = "merge"

	// LifecycleEngine covers engine-level events (wave start, context, budget).
	LifecycleEngine LifecycleCategory = "engine"
)

// LifecycleEvent records a human-readable lifecycle event for the TUI and dashboard.
type LifecycleEvent struct {
	// Category groups the event (worktree, tick, merge, etc.).
	Category LifecycleCategory `json:"category"`

	// Message is the primary human-readable status message.
	Message string `json:"message"`

	// Detail provides optional additional context.
	Detail string `json:"detail,omitempty"`

	// At is when the event occurred.
	At time.Time `json:"at"`
}

// JSON returns the view model serialized as indented JSON.
func (vm *ViewModel) JSON() ([]byte, error) {
	return json.MarshalIndent(vm, "", "  ")
}

// TaskByID returns the TaskView for the given ID, or nil if not found.
func (vm *ViewModel) TaskByID(id string) *TaskView {
	for i := range vm.Tasks {
		if vm.Tasks[i].ID == id {
			return &vm.Tasks[i]
		}
	}
	return nil
}

// IsRunning returns true if the run is in an active phase (not done/idle).
func (vm *ViewModel) IsRunning() bool {
	return vm.Phase == PhaseRunning || vm.Phase == PhaseContextGenerating || vm.Phase == PhaseWrapUp
}

// Progress returns the fraction of tasks completed (0.0 to 1.0).
// Returns 0 if there are no tasks.
func (vm *ViewModel) Progress() float64 {
	if len(vm.Tasks) == 0 {
		return 0
	}
	return float64(vm.Metrics.TasksCompleted) / float64(len(vm.Tasks))
}
