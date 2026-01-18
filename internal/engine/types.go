package engine

import "time"

// TaskStatus represents the state of a task in the run.
type TaskStatus string

const (
	TaskStatusOpen       TaskStatus = "open"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusClosed     TaskStatus = "closed"
)

// TaskInfo represents a task in the task list for TUI display.
type TaskInfo struct {
	ID        string
	Title     string
	Status    TaskStatus
	BlockedBy []string
	IsCurrent bool   // currently executing task
	Awaiting  string // awaiting type: work, approval, input, review, content, escalation, checkpoint, or empty
}

// IsBlocked returns true if the task is blocked by other tasks.
func (t TaskInfo) IsBlocked() bool {
	return len(t.BlockedBy) > 0
}

// ToolActivityInfo represents a tool invocation for display in the TUI.
// Tracks active and completed tools with timing information.
type ToolActivityInfo struct {
	ID        string        // Unique tool invocation ID
	Name      string        // Tool name (e.g., "Read", "Edit", "Bash")
	Input     string        // Truncated input summary for display
	StartedAt time.Time     // When the tool started
	Duration  time.Duration // How long the tool ran (0 if still active)
	IsError   bool          // Whether the tool returned an error
}
