package engine

import (
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
)

// -----------------------------------------------------------------------------
// Streaming Messages - Engine communication types for TUI
// -----------------------------------------------------------------------------

// IterationStartMsg signals the start of an iteration.
type IterationStartMsg struct {
	Iteration int
	TaskID    string
	TaskTitle string
}

// IterationEndMsg signals the end of an iteration with metrics.
type IterationEndMsg struct {
	Iteration int
	Cost      float64
	Tokens    int
}

// OutputMsg contains a chunk of agent output.
type OutputMsg string

// SignalMsg contains a control signal from the engine.
type SignalMsg struct {
	Signal string // COMPLETE, EJECT, BLOCKED
	Reason string
}

// ErrorMsg contains an error from the engine.
type ErrorMsg struct {
	Err error
}

// RunCompleteMsg signals that the run has finished.
type RunCompleteMsg struct {
	Reason     string
	Signal     string
	Iterations int
	Cost       float64
}

// TasksUpdateMsg contains an updated task list.
type TasksUpdateMsg struct {
	Tasks []TaskInfo
}

// TaskRunRecordMsg contains a RunRecord for a completed task.
// Sent when a task is completed and its run data should be stored.
type TaskRunRecordMsg struct {
	TaskID    string           // The task ID this record belongs to
	RunRecord *agent.RunRecord // The completed run record (nil to clear)
}

// -----------------------------------------------------------------------------
// Verification Messages - Verification status updates
// -----------------------------------------------------------------------------

// VerifyStartMsg signals that verification has started.
type VerifyStartMsg struct {
	TaskID string // The task being verified
}

// VerifyResultMsg contains verification results.
type VerifyResultMsg struct {
	TaskID  string // The task that was verified
	Passed  bool   // Whether verification passed
	Summary string // Human-readable summary of results
}

// IdleMsg indicates the engine has entered idle state (watch mode).
type IdleMsg struct{}

// -----------------------------------------------------------------------------
// Context Generation Messages - Epic context generation status updates
// -----------------------------------------------------------------------------

// ContextStatus represents the current state of epic context.
type ContextStatus string

const (
	ContextStatusNone       ContextStatus = "none"       // No context (single-task epic or not configured)
	ContextStatusGenerating ContextStatus = "generating" // Context generation in progress
	ContextStatusReady      ContextStatus = "ready"      // Context loaded and ready
	ContextStatusFailed     ContextStatus = "failed"     // Context generation failed
)

// ContextGeneratingMsg signals that context generation has started.
type ContextGeneratingMsg struct {
	EpicID    string // The epic being processed
	TaskCount int    // Number of tasks in the epic
}

// ContextGeneratedMsg signals that context was generated successfully.
type ContextGeneratedMsg struct {
	EpicID string // The epic ID
	Tokens int    // Approximate token count of generated context
}

// ContextLoadedMsg signals that existing context was loaded from cache.
type ContextLoadedMsg struct {
	EpicID string // The epic ID
}

// ContextSkippedMsg signals that context generation was skipped.
type ContextSkippedMsg struct {
	EpicID string // The epic ID
	Reason string // Why context was skipped (e.g., "single-task epic")
}

// ContextFailedMsg signals that context generation failed.
type ContextFailedMsg struct {
	EpicID string // The epic ID
	Error  string // Error message
}

// -----------------------------------------------------------------------------
// Multi-Epic Messages - For parallel epic execution
// -----------------------------------------------------------------------------

// EpicTabStatus represents the status of an epic tab.
type EpicTabStatus string

const (
	EpicTabStatusRunning  EpicTabStatus = "running"
	EpicTabStatusComplete EpicTabStatus = "completed"
	EpicTabStatusFailed   EpicTabStatus = "failed"
	EpicTabStatusConflict EpicTabStatus = "conflict"
)

// EpicAddedMsg signals a new epic tab was added.
type EpicAddedMsg struct {
	EpicID string
	Title  string
}

// EpicStatusMsg updates an epic's tab status.
type EpicStatusMsg struct {
	EpicID string
	Status EpicTabStatus
}

// EpicConflictMsg signals a merge conflict for a specific epic.
type EpicConflictMsg struct {
	EpicID       string
	Files        []string // Conflicting files
	Branch       string   // Branch that failed to merge
	WorktreePath string   // Path to worktree for inspection
}

// EpicContextGeneratingMsg signals context generation started for a specific epic (multi-epic mode).
type EpicContextGeneratingMsg struct {
	EpicID    string // The epic being processed
	TaskCount int    // Number of tasks in the epic
}

// EpicContextGeneratedMsg signals context was generated for a specific epic (multi-epic mode).
type EpicContextGeneratedMsg struct {
	EpicID string // The epic ID
	Tokens int    // Approximate token count of generated context
}

// EpicContextLoadedMsg signals context was loaded for a specific epic (multi-epic mode).
type EpicContextLoadedMsg struct {
	EpicID string // The epic ID
}

// EpicContextSkippedMsg signals context was skipped for a specific epic (multi-epic mode).
type EpicContextSkippedMsg struct {
	EpicID string // The epic ID
	Reason string // Why context was skipped
}

// EpicContextFailedMsg signals context failed for a specific epic (multi-epic mode).
type EpicContextFailedMsg struct {
	EpicID string // The epic ID
	Error  string // Error message
}

// EpicIterationStartMsg signals iteration start for a specific epic (multi-epic mode).
type EpicIterationStartMsg struct {
	EpicID    string
	Iteration int
	TaskID    string
	TaskTitle string
}

// EpicIterationEndMsg signals iteration end for a specific epic (multi-epic mode).
type EpicIterationEndMsg struct {
	EpicID    string
	Iteration int
	Cost      float64
	Tokens    int
}

// EpicOutputMsg contains output for a specific epic (multi-epic mode).
type EpicOutputMsg struct {
	EpicID string
	Text   string
}

// EpicTasksUpdateMsg contains updated tasks for a specific epic (multi-epic mode).
type EpicTasksUpdateMsg struct {
	EpicID string
	Tasks  []TaskInfo
}

// EpicTaskRunRecordMsg contains a RunRecord for a completed task in a specific epic (multi-epic mode).
type EpicTaskRunRecordMsg struct {
	EpicID    string           // The epic this task belongs to
	TaskID    string           // The task ID this record belongs to
	RunRecord *agent.RunRecord // The completed run record (nil to clear)
}

// EpicRunCompleteMsg signals run completion for a specific epic (multi-epic mode).
type EpicRunCompleteMsg struct {
	EpicID     string
	Reason     string
	Signal     string
	Iterations int
	Cost       float64
}

// -----------------------------------------------------------------------------
// Agent Streaming Messages - Rich agent output events
// These messages map to AgentState changes for real-time TUI updates.
// -----------------------------------------------------------------------------

// AgentTextMsg contains a delta of agent output text.
// Sent when the agent writes response text (non-thinking content).
type AgentTextMsg struct {
	Text string // Delta text to append to output
}

// AgentThinkingMsg contains a delta of agent thinking/reasoning content.
// Sent during extended thinking blocks.
type AgentThinkingMsg struct {
	Text string // Delta thinking text to append
}

// AgentToolStartMsg signals that a tool invocation has started.
// Sent when a tool_use content block begins.
type AgentToolStartMsg struct {
	ID   string // Unique tool invocation ID
	Name string // Tool name (e.g., "Read", "Edit", "Bash")
}

// AgentToolEndMsg signals that a tool invocation has completed.
// Sent when a tool_use content block ends.
type AgentToolEndMsg struct {
	ID       string        // Tool invocation ID (matches AgentToolStartMsg.ID)
	Name     string        // Tool name
	Duration time.Duration // How long the tool ran
	IsError  bool          // Whether the tool returned an error
}

// AgentMetricsMsg contains updated usage metrics.
// Sent when token counts or cost information is updated.
type AgentMetricsMsg struct {
	InputTokens         int     // Total input tokens used
	OutputTokens        int     // Total output tokens generated
	CacheReadTokens     int     // Tokens read from cache
	CacheCreationTokens int     // Tokens used to create cache
	CostUSD             float64 // Total cost in USD
	Model               string  // Model name (set on first update, may be empty)
}

// AgentStatusMsg signals a change in agent run status.
// Maps to agent.RunStatus values.
type AgentStatusMsg struct {
	Status agent.RunStatus // New status (starting, thinking, writing, tool_use, complete, error)
	Error  string          // Error message if Status is "error"
}

// GlobalStatusMsg displays a global status message in the status bar.
// Used for setup phases like worktree creation, merging, etc.
type GlobalStatusMsg struct {
	Message string // Status message to display (empty to clear)
}
