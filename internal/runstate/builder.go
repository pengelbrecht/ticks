package runstate

import (
	"sync"
	"time"
)

// Builder accumulates run events and produces immutable ViewModel snapshots.
// It is safe for concurrent use; the engine goroutine can call mutation
// methods while UI goroutines call Snapshot().
type Builder struct {
	mu sync.RWMutex

	epicID    string
	epicTitle string
	phase     Phase
	wave      int
	startedAt time.Time

	// Task tracking (keyed by task ID)
	tasks         map[string]*taskEntry
	taskOrder     []string // insertion order for deterministic output
	activeTaskIDs []string

	// Metrics
	totalTokensIn  int
	totalTokensOut int
	totalCost      float64
	completedTasks []string

	// Budget
	maxIterations int
	maxCost       float64

	// Context
	context ContextView

	// Signals (most recent first)
	signals []SignalEvent

	// Lifecycle events (most recent first)
	events []LifecycleEvent

	// Terminal state
	exitReason string
	err        string
}

// taskEntry is the mutable internal state for a single task.
type taskEntry struct {
	id           string
	title        string
	state        TaskState
	wave         int
	attempts     int
	awaitingType string
	blockedBy    []string
	signal       string
	signalReason string
	duration     time.Duration
	tokensIn     int
	tokensOut    int
	cost         float64
	isTimeout    bool
	errMsg       string
	activeTool   *ToolView
	numTurns     int
	startedAt    time.Time // per-attempt start
}

// NewBuilder creates a Builder for the given epic.
func NewBuilder(epicID string) *Builder {
	return &Builder{
		epicID:    epicID,
		phase:     PhaseStarting,
		startedAt: time.Now(),
		tasks:     make(map[string]*taskEntry),
	}
}

// --- Phase transitions ---

// SetPhase updates the run phase.
func (b *Builder) SetPhase(p Phase) {
	b.mu.Lock()
	b.phase = p
	b.mu.Unlock()
}

// SetEpicTitle sets the epic title for display.
func (b *Builder) SetEpicTitle(title string) {
	b.mu.Lock()
	b.epicTitle = title
	b.mu.Unlock()
}

// SetBudget configures budget limits for display.
func (b *Builder) SetBudget(maxIterations int, maxCost float64) {
	b.mu.Lock()
	b.maxIterations = maxIterations
	b.maxCost = maxCost
	b.mu.Unlock()
}

// --- Task registration ---

// RegisterTask adds a task to the view model. Call this when loading
// the epic's tasks before the wave loop begins.
func (b *Builder) RegisterTask(id, title string, blockedBy []string, awaitingType string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	state := TaskReady
	if len(blockedBy) > 0 {
		state = TaskBlocked
	}
	if awaitingType != "" {
		state = TaskAwaiting
	}

	b.tasks[id] = &taskEntry{
		id:           id,
		title:        title,
		state:        state,
		blockedBy:    blockedBy,
		awaitingType: awaitingType,
	}
	b.taskOrder = append(b.taskOrder, id)
}

// --- Wave events ---

// RecordWave signals the start of a new wave iteration.
func (b *Builder) RecordWave(wave int, taskIDs []string) {
	b.mu.Lock()
	b.wave = wave
	b.activeTaskIDs = make([]string, len(taskIDs))
	copy(b.activeTaskIDs, taskIDs)
	b.mu.Unlock()
}

// --- Task lifecycle ---

// RecordTaskStart marks a task as running.
func (b *Builder) RecordTaskStart(taskID, title string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	entry := b.getOrCreate(taskID, title)
	entry.state = TaskRunning
	entry.startedAt = time.Now()
	entry.wave = b.wave
}

// RecordTaskEndParams contains the result of a completed task attempt.
type RecordTaskEndParams struct {
	TaskID       string
	TokensIn     int
	TokensOut    int
	Cost         float64
	Duration     time.Duration
	Signal       string
	SignalReason string
	Error        string
	IsTimeout    bool
	Closed       bool
}

// RecordTaskEnd records the completion of a task attempt.
func (b *Builder) RecordTaskEnd(p RecordTaskEndParams) {
	b.mu.Lock()
	defer b.mu.Unlock()

	entry, ok := b.tasks[p.TaskID]
	if !ok {
		return
	}

	entry.attempts++
	entry.tokensIn += p.TokensIn
	entry.tokensOut += p.TokensOut
	entry.cost += p.Cost
	entry.duration += p.Duration
	entry.signal = p.Signal
	entry.signalReason = p.SignalReason
	entry.isTimeout = p.IsTimeout
	entry.errMsg = p.Error
	entry.activeTool = nil

	b.totalTokensIn += p.TokensIn
	b.totalTokensOut += p.TokensOut
	b.totalCost += p.Cost

	if p.Closed {
		entry.state = TaskCompleted
		b.completedTasks = append(b.completedTasks, p.TaskID)
	} else if p.Error != "" || p.IsTimeout {
		entry.state = TaskFailed
	} else {
		// Task finished but wasn't closed — may be awaiting or retried
		entry.state = TaskReady
	}

	// Remove from active list
	b.activeTaskIDs = removeString(b.activeTaskIDs, p.TaskID)
}

// RecordTaskAwaiting marks a task as awaiting human action.
func (b *Builder) RecordTaskAwaiting(taskID, awaitingType string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if entry, ok := b.tasks[taskID]; ok {
		entry.state = TaskAwaiting
		entry.awaitingType = awaitingType
	}
}

// RecordTaskSkipped marks a task as skipped due to policy limits.
func (b *Builder) RecordTaskSkipped(taskID, reason string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if entry, ok := b.tasks[taskID]; ok {
		entry.state = TaskSkipped
		entry.errMsg = reason
	}
}

// UpdateTaskLive updates live streaming data for a running task.
func (b *Builder) UpdateTaskLive(taskID string, numTurns int, activeTool *ToolView) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if entry, ok := b.tasks[taskID]; ok {
		entry.numTurns = numTurns
		entry.activeTool = activeTool
	}
}

// --- Signal events ---

// RecordSignal records a signal emitted by an agent.
func (b *Builder) RecordSignal(signal, reason, taskID string) {
	b.mu.Lock()
	b.signals = append([]SignalEvent{{
		Signal: signal,
		Reason: reason,
		TaskID: taskID,
		Wave:   b.wave,
		At:     time.Now(),
	}}, b.signals...)
	b.mu.Unlock()
}

// --- Lifecycle events ---

// maxLifecycleEvents is the maximum number of lifecycle events retained.
const maxLifecycleEvents = 50

// RecordLifecycleEvent records a human-readable lifecycle status event.
// Events are stored most-recent-first, capped at maxLifecycleEvents.
func (b *Builder) RecordLifecycleEvent(category LifecycleCategory, message, detail string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	evt := LifecycleEvent{
		Category: category,
		Message:  message,
		Detail:   detail,
		At:       time.Now(),
	}
	b.events = append([]LifecycleEvent{evt}, b.events...)
	if len(b.events) > maxLifecycleEvents {
		b.events = b.events[:maxLifecycleEvents]
	}
}

// --- Context events ---

// SetContextGenerating marks context generation as started.
func (b *Builder) SetContextGenerating(taskCount int) {
	b.mu.Lock()
	b.context = ContextView{Status: "generating", TaskCount: taskCount}
	b.mu.Unlock()
}

// SetContextGenerated marks context generation as completed.
func (b *Builder) SetContextGenerated(tokenCount int) {
	b.mu.Lock()
	b.context = ContextView{Status: "generated", TokenCount: tokenCount}
	b.mu.Unlock()
}

// SetContextLoaded marks existing context as loaded.
func (b *Builder) SetContextLoaded(tokenCount int) {
	b.mu.Lock()
	b.context = ContextView{Status: "loaded", TokenCount: tokenCount}
	b.mu.Unlock()
}

// SetContextSkipped marks context as skipped.
func (b *Builder) SetContextSkipped(reason string) {
	b.mu.Lock()
	b.context = ContextView{Status: "skipped", Error: reason}
	b.mu.Unlock()
}

// SetContextFailed marks context generation as failed.
func (b *Builder) SetContextFailed(err string) {
	b.mu.Lock()
	b.context = ContextView{Status: "failed", Error: err}
	b.mu.Unlock()
}

// --- Terminal state ---

// SetDone marks the run as finished.
func (b *Builder) SetDone(exitReason string, err string) {
	b.mu.Lock()
	b.phase = PhaseDone
	b.exitReason = exitReason
	b.err = err
	b.mu.Unlock()
}

// --- Snapshot ---

// Snapshot returns an immutable ViewModel reflecting the current state.
// It is safe to call concurrently with mutation methods.
func (b *Builder) Snapshot() *ViewModel {
	b.mu.RLock()
	defer b.mu.RUnlock()

	now := time.Now()

	// Build task views in insertion order
	tasks := make([]TaskView, 0, len(b.taskOrder))
	var (
		completed int
		failed    int
		awaiting  int
		blocked   int
		remaining int
	)

	for _, id := range b.taskOrder {
		entry := b.tasks[id]

		tv := TaskView{
			ID:           entry.id,
			Title:        entry.title,
			State:        entry.state,
			Wave:         entry.wave,
			Attempts:     entry.attempts,
			AwaitingType: entry.awaitingType,
			Signal:       entry.signal,
			SignalReason: entry.signalReason,
			Duration:     entry.duration,
			TokensIn:     entry.tokensIn,
			TokensOut:    entry.tokensOut,
			Cost:         entry.cost,
			IsTimeout:    entry.isTimeout,
			Error:        entry.errMsg,
			ActiveTool:   entry.activeTool,
			NumTurns:     entry.numTurns,
		}

		if len(entry.blockedBy) > 0 {
			tv.BlockedBy = make([]string, len(entry.blockedBy))
			copy(tv.BlockedBy, entry.blockedBy)
		}

		// For running tasks, compute live duration
		if entry.state == TaskRunning && !entry.startedAt.IsZero() {
			tv.Duration = entry.duration + now.Sub(entry.startedAt)
		}

		tasks = append(tasks, tv)

		switch entry.state {
		case TaskCompleted:
			completed++
		case TaskFailed:
			failed++
		case TaskAwaiting:
			awaiting++
		case TaskBlocked:
			blocked++
		case TaskReady, TaskSkipped:
			remaining++
		case TaskRunning:
			// Running tasks count as in-progress, not remaining
		}
	}

	activeTaskIDs := make([]string, len(b.activeTaskIDs))
	copy(activeTaskIDs, b.activeTaskIDs)

	completedTasks := make([]string, len(b.completedTasks))
	copy(completedTasks, b.completedTasks)

	signals := make([]SignalEvent, len(b.signals))
	copy(signals, b.signals)

	events := make([]LifecycleEvent, len(b.events))
	copy(events, b.events)

	return &ViewModel{
		EpicID:        b.epicID,
		EpicTitle:     b.epicTitle,
		Phase:         b.phase,
		Wave:          b.wave,
		Tasks:         tasks,
		ActiveTaskIDs: activeTaskIDs,
		Metrics: RunMetrics{
			Iterations:     b.wave,
			TotalTokensIn:  b.totalTokensIn,
			TotalTokensOut: b.totalTokensOut,
			TotalCost:      b.totalCost,
			Duration:       now.Sub(b.startedAt),
			TasksCompleted: completed,
			TasksFailed:    failed,
			TasksAwaiting:  awaiting,
			TasksBlocked:   blocked,
			TasksRemaining: remaining,
		},
		Budget: BudgetView{
			MaxIterations:  b.maxIterations,
			MaxCost:        b.maxCost,
			IterationsUsed: b.wave,
			CostUsed:       b.totalCost,
		},
		Context:        b.context,
		Signals:        signals,
		Events:         events,
		ExitReason:     b.exitReason,
		Error:          b.err,
		StartedAt:      b.startedAt,
		SnapshotAt:     now,
		CompletedTasks: completedTasks,
	}
}

// --- helpers ---

func (b *Builder) getOrCreate(id, title string) *taskEntry {
	entry, ok := b.tasks[id]
	if !ok {
		entry = &taskEntry{id: id, title: title, state: TaskReady}
		b.tasks[id] = entry
		b.taskOrder = append(b.taskOrder, id)
	}
	if title != "" && entry.title == "" {
		entry.title = title
	}
	return entry
}

func removeString(slice []string, s string) []string {
	out := make([]string, 0, len(slice))
	for _, v := range slice {
		if v != s {
			out = append(out, v)
		}
	}
	return out
}
