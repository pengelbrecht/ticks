package output

import (
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/pengelbrecht/ticks/internal/runstate"
)

// StatusSink receives RunOutput events and renders a live status widget
// to a terminal writer using [runstate.Builder] and [runstate.RenderWidget].
//
// It implements a subset of hooks called from RunOutput so the engine
// doesn't need to know about the widget; it only needs an output option.
type StatusSink struct {
	builder *runstate.Builder
	w       io.Writer
	mu      sync.Mutex
	width   int

	// Track the number of lines previously written for clearing.
	prevLines int
}

// NewStatusSink creates a StatusSink that writes to w.
// width sets the widget outer width; 0 means auto (60).
func NewStatusSink(epicID string, w io.Writer, width int) *StatusSink {
	return &StatusSink{
		builder: runstate.NewBuilder(epicID),
		w:       w,
		width:   width,
	}
}

// Builder returns the underlying Builder so callers can feed it
// additional events not routed through RunOutput (e.g., task registration).
func (s *StatusSink) Builder() *runstate.Builder {
	return s.builder
}

// --- Event hooks (called from RunOutput) ---

// OnEpicTitle sets the epic title for display.
func (s *StatusSink) OnEpicTitle(title string) {
	s.builder.SetEpicTitle(title)
}

// OnContextGenerating marks context generation as started.
func (s *StatusSink) OnContextGenerating(epicID string, taskCount int) {
	s.builder.SetPhase(runstate.PhaseContextGenerating)
	s.builder.SetContextGenerating(taskCount)
	s.render()
}

// OnContextGenerated marks context generation as completed.
func (s *StatusSink) OnContextGenerated(epicID string, tokenCount int) {
	s.builder.SetContextGenerated(tokenCount)
	s.render()
}

// OnContextLoaded marks context as loaded.
func (s *StatusSink) OnContextLoaded(epicID string) {
	s.builder.SetContextLoaded(0)
	s.render()
}

// OnContextSkipped marks context as skipped.
func (s *StatusSink) OnContextSkipped(epicID string, reason string) {
	s.builder.SetContextSkipped(reason)
}

// OnContextFailed marks context generation as failed.
func (s *StatusSink) OnContextFailed(epicID string, err string) {
	s.builder.SetContextFailed(err)
	s.render()
}

// OnWaveStarted records a new wave beginning.
func (s *StatusSink) OnWaveStarted(iteration int, taskIDs []string) {
	s.builder.SetPhase(runstate.PhaseRunning)
	s.builder.RecordWave(iteration, taskIDs)
	s.render()
}

// OnTaskStarted records a task beginning execution.
func (s *StatusSink) OnTaskStarted(iteration int, taskID, title string) {
	s.builder.RecordTaskStart(taskID, title)
	s.render()
}

// OnTaskCompleted records a task finishing.
func (s *StatusSink) OnTaskCompleted(result IterationResult) {
	closed := false // Will be updated by OnTaskClosed if applicable
	errStr := ""
	if result.Error != nil {
		errStr = result.Error.Error()
	}
	s.builder.RecordTaskEnd(runstate.RecordTaskEndParams{
		TaskID:       result.TaskID,
		TokensIn:     result.TokensIn,
		TokensOut:    result.TokensOut,
		Cost:         result.Cost,
		Duration:     result.Duration,
		Signal:       result.Signal,
		SignalReason: result.SignalReason,
		Error:        errStr,
		IsTimeout:    result.IsTimeout,
		Closed:       closed,
	})
	s.render()
}

// OnTaskClosed marks a task as completed/closed.
func (s *StatusSink) OnTaskClosed(taskID string) {
	// Re-record the task end as closed. The builder handles dedup.
	s.builder.RecordTaskEnd(runstate.RecordTaskEndParams{
		TaskID: taskID,
		Closed: true,
	})
	s.render()
}

// OnSignal records a signal emitted by an agent.
func (s *StatusSink) OnSignal(signal, reason, taskID string) {
	s.builder.RecordSignal(signal, reason, taskID)
	s.render()
}

// OnIdle marks the engine as idle (watch mode).
func (s *StatusSink) OnIdle() {
	s.builder.SetPhase(runstate.PhaseIdle)
	s.render()
}

// OnRunComplete marks the run as done.
func (s *StatusSink) OnRunComplete(result RunResult) {
	s.builder.SetDone(result.ExitReason, "")
	s.render()
}

// OnAgentState updates live task data (tool calls, turns).
func (s *StatusSink) OnAgentState(taskID string, numTurns int, activeTool *runstate.ToolView) {
	s.builder.UpdateTaskLive(taskID, numTurns, activeTool)
	s.render()
}

// OnLifecycleEvent records a lifecycle event in the builder.
func (s *StatusSink) OnLifecycleEvent(category, message, detail string) {
	s.builder.RecordLifecycleEvent(runstate.LifecycleCategory(category), message, detail)
	s.render()
}

// OnBudgetConfig sets budget limits for display.
func (s *StatusSink) OnBudgetConfig(maxIterations int, maxCost float64) {
	s.builder.SetBudget(maxIterations, maxCost)
}

// --- Rendering ---

// render takes a snapshot and writes the widget to the terminal,
// clearing the previous output first.
func (s *StatusSink) render() {
	vm := s.builder.Snapshot()
	rendered := runstate.RenderWidget(vm, s.width)

	s.mu.Lock()
	defer s.mu.Unlock()

	// Move cursor up to clear previous widget output
	if s.prevLines > 0 {
		fmt.Fprintf(s.w, "\033[%dA", s.prevLines) // move up
		fmt.Fprintf(s.w, "\033[J")                 // clear from cursor to end
	}

	fmt.Fprint(s.w, rendered)
	fmt.Fprint(s.w, "\n")

	// Count lines for next clear
	s.prevLines = strings.Count(rendered, "\n") + 1
}

// Flush renders one final time (e.g., before exit).
func (s *StatusSink) Flush() {
	s.render()
}

// --- Periodic refresh ---

// StartRefresh starts a goroutine that re-renders the widget at the given
// interval (e.g., every second) to keep duration/progress up to date.
// Returns a stop function that must be called to halt the goroutine.
// The stop function blocks until the goroutine has exited.
func (s *StatusSink) StartRefresh(interval time.Duration) func() {
	done := make(chan struct{})
	exited := make(chan struct{})
	go func() {
		defer close(exited)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				s.render()
			case <-done:
				return
			}
		}
	}()
	return func() {
		close(done)
		<-exited
	}
}
