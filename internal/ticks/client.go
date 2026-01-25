package ticks

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/runrecord"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// NextTaskOptions configures the behavior of NextTask.
type NextTaskOptions struct {
	// EpicID filters to tasks under a specific epic. Empty means search all tasks.
	EpicID string
	// StandaloneOnly when true, only returns tasks without a parent epic.
	StandaloneOnly bool
	// OrphanedOnly when true, only returns tasks whose parent epic is closed.
	OrphanedOnly bool
}

// NextTaskOption is a functional option for configuring NextTask.
type NextTaskOption func(*NextTaskOptions)

// WithEpic sets the epic ID to search within.
func WithEpic(epicID string) NextTaskOption {
	return func(opts *NextTaskOptions) {
		opts.EpicID = epicID
	}
}

// StandaloneOnly filters to tasks without a parent epic.
func StandaloneOnly() NextTaskOption {
	return func(opts *NextTaskOptions) {
		opts.StandaloneOnly = true
	}
}

// OrphanedOnly filters to tasks whose parent epic is closed.
func OrphanedOnly() NextTaskOption {
	return func(opts *NextTaskOptions) {
		opts.OrphanedOnly = true
	}
}

// splitNonEmpty splits a string by newlines and returns non-empty trimmed lines.
func splitNonEmpty(s string) []string {
	lines := strings.Split(s, "\n")
	result := make([]string, 0, len(lines))
	for _, line := range lines {
		if trimmed := strings.TrimSpace(line); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

// Client provides direct access to the Ticks issue tracker via the tick.Store.
// This avoids the overhead of exec'ing the tk CLI for each operation.
type Client struct {
	store          *tick.Store
	runrecordStore *runrecord.Store
}

// NewClient creates a new Client using the given tick directory.
// tickDir should be the .tick directory (e.g., "/path/to/project/.tick").
func NewClient(tickDir string) *Client {
	// The runrecord.Store expects the project root, not the .tick dir.
	// Since tickDir is ".tick", the parent is the project root.
	projectRoot := filepath.Dir(tickDir)
	return &Client{
		store:          tick.NewStore(tickDir),
		runrecordStore: runrecord.NewStore(projectRoot),
	}
}

// convertTickToTask converts a tick.Tick to a Task.
func convertTickToTask(t tick.Tick) Task {
	return Task{
		ID:          t.ID,
		Title:       t.Title,
		Description: t.Description,
		Status:      t.Status,
		Priority:    t.Priority,
		Type:        t.Type,
		Owner:       t.Owner,
		BlockedBy:   t.BlockedBy,
		Parent:      t.Parent,
		Manual:      t.Manual,
		Requires:    t.Requires,
		Awaiting:    t.Awaiting,
		Verdict:     t.Verdict,
		CreatedBy:   t.CreatedBy,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}

// convertTickToEpic converts a tick.Tick to an Epic.
func convertTickToEpic(t tick.Tick) Epic {
	return Epic{
		ID:          t.ID,
		Title:       t.Title,
		Description: t.Description,
		Notes:       t.Notes,
		Status:      t.Status,
		Priority:    t.Priority,
		Type:        t.Type,
		Owner:       t.Owner,
		CreatedBy:   t.CreatedBy,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}

// NextTask returns the next open, unblocked task for the given epic that is ready for agent work.
// Returns nil if no tasks are available.
func (c *Client) NextTask(epicID string) (*Task, error) {
	fmt.Fprintf(os.Stderr, "[DEBUG] NextTask called with epicID=%s\n", epicID)
	allTicks, err := c.store.List()
	if err != nil {
		return nil, err
	}

	// Filter to tasks under the given epic
	var candidates []tick.Tick
	for _, t := range allTicks {
		if t.Type != tick.TypeEpic && t.Parent == epicID {
			candidates = append(candidates, t)
		}
	}
	fmt.Fprintf(os.Stderr, "[DEBUG] NextTask found %d candidates under epic %s\n", len(candidates), epicID)

	task, err := c.findNextReadyTask(candidates, allTicks)
	if task != nil {
		fmt.Fprintf(os.Stderr, "[DEBUG] NextTask returning task %s (parent=%s)\n", task.ID, task.Parent)
	} else {
		fmt.Fprintf(os.Stderr, "[DEBUG] NextTask returning nil\n")
	}
	return task, err
}

// NextTaskWithOptions returns the next open, unblocked task ready for agent work.
// Uses functional options to configure behavior.
func (c *Client) NextTaskWithOptions(opts ...NextTaskOption) (*Task, error) {
	options := &NextTaskOptions{}
	for _, opt := range opts {
		opt(options)
	}

	// If epic is specified, use the existing NextTask behavior
	if options.EpicID != "" {
		return c.NextTask(options.EpicID)
	}

	allTicks, err := c.store.List()
	if err != nil {
		return nil, err
	}

	// Build index of epics for orphan detection
	epicStatus := make(map[string]string)
	for _, t := range allTicks {
		if t.Type == tick.TypeEpic {
			epicStatus[t.ID] = t.Status
		}
	}

	// Filter tasks based on options
	var candidates []tick.Tick
	for _, t := range allTicks {
		if t.Type == tick.TypeEpic {
			continue // Skip epics, we want tasks only
		}

		if options.StandaloneOnly {
			// Only tasks without a parent
			if t.Parent != "" {
				continue
			}
		} else if options.OrphanedOnly {
			// Only tasks whose parent epic is closed
			if t.Parent == "" {
				continue // No parent = standalone, not orphaned
			}
			parentStatus, exists := epicStatus[t.Parent]
			if !exists || parentStatus != tick.StatusClosed {
				continue // Parent doesn't exist or is not closed
			}
		}

		candidates = append(candidates, t)
	}

	return c.findNextReadyTask(candidates, allTicks)
}

// findNextReadyTask finds the first ready task from candidates.
// Uses query.Ready to filter by readiness and sorts by priority.
func (c *Client) findNextReadyTask(candidates []tick.Tick, allTicks []tick.Tick) (*Task, error) {
	if len(candidates) == 0 {
		return nil, nil
	}

	// Use query.Ready to filter to ready tasks (excludes awaiting human by default)
	readyTicks := query.Ready(candidates, allTicks)
	if len(readyTicks) == 0 {
		return nil, nil
	}

	// Sort by priority (lowest number = highest priority)
	sort.Slice(readyTicks, func(i, j int) bool {
		return readyTicks[i].Priority < readyTicks[j].Priority
	})

	// Return the first ready task
	task := convertTickToTask(readyTicks[0])
	return &task, nil
}

// ListAwaitingTasks returns all tasks awaiting human attention under the given epic.
func (c *Client) ListAwaitingTasks(epicID string, awaitingTypes ...string) ([]Task, error) {
	allTicks, err := c.store.List()
	if err != nil {
		return nil, err
	}

	// Build a set of awaiting types for efficient lookup
	typeFilter := make(map[string]bool)
	for _, t := range awaitingTypes {
		typeFilter[t] = true
	}

	var result []Task
	for _, t := range allTicks {
		// Skip if not under the given epic
		if t.Parent != epicID {
			continue
		}
		// Skip if not awaiting human
		if !t.IsAwaitingHuman() {
			continue
		}
		// If types filter is provided, check if this task's awaiting type matches
		if len(awaitingTypes) > 0 {
			awaitingType := t.GetAwaitingType()
			if !typeFilter[awaitingType] {
				continue
			}
		}
		result = append(result, convertTickToTask(t))
	}

	return result, nil
}

// NextAwaitingTask returns the next task awaiting human attention.
func (c *Client) NextAwaitingTask(epicID string, awaitingTypes ...string) (*Task, error) {
	allTicks, err := c.store.List()
	if err != nil {
		return nil, err
	}

	// Build a set of awaiting types for efficient lookup
	typeFilter := make(map[string]bool)
	for _, t := range awaitingTypes {
		typeFilter[t] = true
	}

	var candidates []tick.Tick
	for _, t := range allTicks {
		// Skip epics
		if t.Type == tick.TypeEpic {
			continue
		}
		// Skip if epic filter is set and task is not under it
		if epicID != "" && t.Parent != epicID {
			continue
		}
		// Skip if not awaiting human
		if !t.IsAwaitingHuman() {
			continue
		}
		// If types filter is provided, check if this task's awaiting type matches
		if len(awaitingTypes) > 0 {
			awaitingType := t.GetAwaitingType()
			if !typeFilter[awaitingType] {
				continue
			}
		}
		candidates = append(candidates, t)
	}

	if len(candidates) == 0 {
		return nil, nil
	}

	// Sort by priority (lowest number = highest priority)
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].Priority < candidates[j].Priority
	})

	task := convertTickToTask(candidates[0])
	return &task, nil
}

// GetTask returns details for a specific task.
func (c *Client) GetTask(taskID string) (*Task, error) {
	t, err := c.store.Read(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to read task: %w", err)
	}

	task := convertTickToTask(t)
	return &task, nil
}

// GetEpic returns details for a specific epic.
func (c *Client) GetEpic(epicID string) (*Epic, error) {
	t, err := c.store.Read(epicID)
	if err != nil {
		return nil, fmt.Errorf("failed to read epic: %w", err)
	}

	epic := convertTickToEpic(t)
	return &epic, nil
}

// ListTasks returns all tasks under the given parent epic.
func (c *Client) ListTasks(epicID string) ([]Task, error) {
	allTicks, err := c.store.List()
	if err != nil {
		return nil, err
	}

	var tasks []Task
	for _, t := range allTicks {
		if t.Type != tick.TypeEpic && t.Parent == epicID {
			tasks = append(tasks, convertTickToTask(t))
		}
	}

	return tasks, nil
}

// ListAllTasks returns all tasks regardless of parent epic.
func (c *Client) ListAllTasks() ([]Task, error) {
	allTicks, err := c.store.List()
	if err != nil {
		return nil, err
	}

	var tasks []Task
	for _, t := range allTicks {
		if t.Type != tick.TypeEpic && t.Status == tick.StatusOpen {
			tasks = append(tasks, convertTickToTask(t))
		}
	}

	return tasks, nil
}

// NextReadyEpic returns the next ready (unblocked) epic.
func (c *Client) NextReadyEpic() (*Epic, error) {
	allTicks, err := c.store.List()
	if err != nil {
		return nil, err
	}

	// Filter to epics only
	var epics []tick.Tick
	for _, t := range allTicks {
		if t.Type == tick.TypeEpic {
			epics = append(epics, t)
		}
	}

	// Use query.Ready to find ready epics
	readyEpics := query.Ready(epics, allTicks)
	if len(readyEpics) == 0 {
		return nil, nil
	}

	// Sort by priority (lowest number = highest priority)
	sort.Slice(readyEpics, func(i, j int) bool {
		return readyEpics[i].Priority < readyEpics[j].Priority
	})

	epic := convertTickToEpic(readyEpics[0])
	return &epic, nil
}

// ListReadyEpics returns all open epics (for picker display).
func (c *Client) ListReadyEpics() ([]Epic, error) {
	allTicks, err := c.store.List()
	if err != nil {
		return nil, err
	}

	var epics []Epic
	for _, t := range allTicks {
		if t.Type == tick.TypeEpic && t.Status == tick.StatusOpen {
			epics = append(epics, convertTickToEpic(t))
		}
	}

	return epics, nil
}

// HasOpenTasks returns true if the epic has any non-closed tasks.
func (c *Client) HasOpenTasks(epicID string) (bool, error) {
	tasks, err := c.ListTasks(epicID)
	if err != nil {
		return false, err
	}
	for _, t := range tasks {
		if !t.IsClosed() {
			return true, nil
		}
	}
	return false, nil
}

// CloseTask closes a task with the given reason.
func (c *Client) CloseTask(taskID, reason string) error {
	t, err := c.store.Read(taskID)
	if err != nil {
		return fmt.Errorf("failed to read task: %w", err)
	}

	t.Status = tick.StatusClosed
	t.ClosedReason = reason
	now := time.Now().UTC()
	t.ClosedAt = &now
	t.UpdatedAt = now

	if err := c.store.Write(t); err != nil {
		return fmt.Errorf("failed to close task: %w", err)
	}
	return nil
}

// CompleteTask handles task completion, respecting the requires field.
func (c *Client) CompleteTask(taskID string, summary string) error {
	t, err := c.store.Read(taskID)
	if err != nil {
		return fmt.Errorf("failed to read task: %w", err)
	}

	if t.Requires == nil || *t.Requires == "" {
		return c.CloseTask(taskID, summary)
	}

	note := fmt.Sprintf("Work complete, requires %s", *t.Requires)
	return c.SetAwaiting(taskID, *t.Requires, note)
}

// ReopenTask reopens a closed task.
func (c *Client) ReopenTask(taskID string) error {
	t, err := c.store.Read(taskID)
	if err != nil {
		return fmt.Errorf("failed to read task: %w", err)
	}

	t.Status = tick.StatusOpen
	t.ClosedAt = nil
	t.ClosedReason = ""
	t.UpdatedAt = time.Now().UTC()

	if err := c.store.Write(t); err != nil {
		return fmt.Errorf("failed to reopen task: %w", err)
	}
	return nil
}

// CloseEpic closes an epic with the given reason.
func (c *Client) CloseEpic(epicID, reason string) error {
	return c.CloseTask(epicID, reason)
}

// AddNote adds a note to an epic or task.
// extraArgs can include "--from", "human" to mark the note as from a human.
func (c *Client) AddNote(issueID, message string, extraArgs ...string) error {
	if message == "" {
		return fmt.Errorf("note message is required")
	}

	// Parse extraArgs for --from flag
	fromHuman := false
	for i := 0; i < len(extraArgs); i++ {
		if extraArgs[i] == "--from" && i+1 < len(extraArgs) {
			if extraArgs[i+1] == "human" {
				fromHuman = true
			}
			i++ // Skip the value
		}
	}

	// Read the tick
	t, err := c.store.Read(issueID)
	if err != nil {
		return fmt.Errorf("failed to read tick: %w", err)
	}

	// Format the note line
	timestamp := time.Now().Format("2006-01-02 15:04")
	var line string
	if fromHuman {
		line = fmt.Sprintf("%s - [human] %s", timestamp, message)
	} else {
		line = fmt.Sprintf("%s - %s", timestamp, message)
	}

	// Append to notes
	if strings.TrimSpace(t.Notes) == "" {
		t.Notes = line
	} else {
		t.Notes = strings.TrimRight(t.Notes, "\n") + "\n" + line
	}
	t.UpdatedAt = time.Now().UTC()

	// Write back
	if err := c.store.Write(t); err != nil {
		return fmt.Errorf("failed to update tick: %w", err)
	}
	return nil
}

// AddAgentNote adds a note from the agent (default author).
// This is the standard way for agents to leave progress notes.
func (c *Client) AddAgentNote(issueID, message string) error {
	return c.AddNote(issueID, message)
}

// AddHumanNote adds a note from a human.
// Use this for feedback, answers, and other human-provided content.
func (c *Client) AddHumanNote(issueID, message string) error {
	return c.AddNote(issueID, message, "--from", "human")
}

// SetStatus updates the status of an issue.
func (c *Client) SetStatus(issueID, status string) error {
	t, err := c.store.Read(issueID)
	if err != nil {
		return fmt.Errorf("failed to read tick: %w", err)
	}

	t.Status = status
	t.UpdatedAt = time.Now().UTC()

	if err := c.store.Write(t); err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}
	return nil
}

// SetAwaiting updates the awaiting field of a task.
func (c *Client) SetAwaiting(taskID string, awaiting string, note string) error {
	t, err := c.store.Read(taskID)
	if err != nil {
		return fmt.Errorf("failed to read task: %w", err)
	}

	t.SetAwaiting(awaiting)
	t.UpdatedAt = time.Now().UTC()

	if err := c.store.Write(t); err != nil {
		return fmt.Errorf("failed to update awaiting: %w", err)
	}

	// Add context as note if provided
	if note != "" {
		return c.AddNote(taskID, note)
	}
	return nil
}

// ClearAwaiting clears the awaiting field of a task.
func (c *Client) ClearAwaiting(taskID string) error {
	t, err := c.store.Read(taskID)
	if err != nil {
		return fmt.Errorf("failed to read task: %w", err)
	}

	t.ClearAwaiting()
	t.UpdatedAt = time.Now().UTC()

	if err := c.store.Write(t); err != nil {
		return fmt.Errorf("failed to clear awaiting: %w", err)
	}
	return nil
}

// SetVerdict sets the verdict on a task and optionally adds feedback as a note.
func (c *Client) SetVerdict(taskID string, verdict string, feedback string) error {
	// Add feedback note first (if provided) to avoid race condition
	if feedback != "" {
		if err := c.AddNote(taskID, feedback, "--from", "human"); err != nil {
			return fmt.Errorf("adding feedback note: %w", err)
		}
	}

	t, err := c.store.Read(taskID)
	if err != nil {
		return fmt.Errorf("failed to read task: %w", err)
	}

	t.Verdict = &verdict
	t.UpdatedAt = time.Now().UTC()

	if err := c.store.Write(t); err != nil {
		return fmt.Errorf("failed to set verdict: %w", err)
	}
	return nil
}

// Approve sets verdict=approved on a task.
func (c *Client) Approve(taskID string) error {
	return c.SetVerdict(taskID, "approved", "")
}

// Reject sets verdict=rejected on a task with optional feedback.
func (c *Client) Reject(taskID string, feedback string) error {
	return c.SetVerdict(taskID, "rejected", feedback)
}

// ProcessVerdict reads a task, processes its verdict, and saves the result.
func (c *Client) ProcessVerdict(taskID string) (VerdictResult, error) {
	t, err := c.store.Read(taskID)
	if err != nil {
		return VerdictResult{}, fmt.Errorf("failed to read task: %w", err)
	}

	// Check if there's a verdict to process
	if t.Verdict == nil || t.Awaiting == nil {
		return VerdictResult{}, nil
	}

	// Determine the result based on awaiting type and verdict
	awaiting := *t.Awaiting
	verdict := *t.Verdict

	var shouldClose bool
	switch awaiting {
	case tick.AwaitingWork, tick.AwaitingApproval, tick.AwaitingReview, tick.AwaitingContent:
		shouldClose = verdict == tick.VerdictApproved
	case tick.AwaitingInput, tick.AwaitingEscalation:
		shouldClose = verdict == tick.VerdictRejected
	case tick.AwaitingCheckpoint:
		shouldClose = false
	default:
		shouldClose = false
	}

	// Clear transient fields
	t.ClearAwaiting()
	t.Verdict = nil

	if shouldClose {
		t.Status = tick.StatusClosed
		now := time.Now().UTC()
		t.ClosedAt = &now
	}

	t.UpdatedAt = time.Now().UTC()

	if err := c.store.Write(t); err != nil {
		return VerdictResult{}, fmt.Errorf("failed to save task: %w", err)
	}

	return VerdictResult{
		ShouldClose:      shouldClose,
		TransientCleared: true,
	}, nil
}

// GetNotes returns the notes for an epic or task as newline-separated strings.
func (c *Client) GetNotes(issueID string) ([]string, error) {
	t, err := c.store.Read(issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to read tick: %w", err)
	}

	if t.Notes == "" {
		return nil, nil
	}

	return splitNonEmpty(t.Notes), nil
}

// GetStructuredNotes returns notes as structured Note objects with author metadata.
// Parses the legacy "notes" string format, detecting [human] prefix for human notes.
func (c *Client) GetStructuredNotes(issueID string) ([]Note, error) {
	t, err := c.store.Read(issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to read tick: %w", err)
	}

	if t.Notes == "" {
		return nil, nil
	}

	// Parse notes string into structured notes
	lines := splitNonEmpty(t.Notes)
	notes := make([]Note, 0, len(lines))
	for _, line := range lines {
		note := parseNoteLine(line)
		notes = append(notes, note)
	}

	return notes, nil
}

// parseNoteLine parses a note line into a structured Note.
// Format: "TIMESTAMP - [human] MESSAGE" for human notes
// Format: "TIMESTAMP - MESSAGE" for agent notes
func parseNoteLine(line string) Note {
	note := Note{
		Content: line,
		Author:  "agent", // Default to agent
	}

	// Try to parse timestamp and detect [human] prefix
	// Format: "2026-01-17 22:39 - [human] Message" or "2026-01-17 22:39 - Message"
	parts := strings.SplitN(line, " - ", 2)
	if len(parts) == 2 {
		// Try to parse timestamp
		timestamp := strings.TrimSpace(parts[0])
		if t, err := time.Parse("2006-01-02 15:04", timestamp); err == nil {
			note.CreatedAt = t
		}

		message := parts[1]
		// Check for [human] prefix
		if strings.HasPrefix(message, "[human] ") {
			note.Author = "human"
			note.Content = line // Keep original line as content
		}
	}

	return note
}

// GetNotesByAuthor returns notes filtered by author.
func (c *Client) GetNotesByAuthor(issueID string, author string) ([]Note, error) {
	notes, err := c.GetStructuredNotes(issueID)
	if err != nil {
		return nil, err
	}

	wantHuman := author == "human"
	var filtered []Note
	for _, note := range notes {
		if wantHuman == note.IsFromHuman() {
			filtered = append(filtered, note)
		}
	}
	return filtered, nil
}

// GetHumanNotes returns only notes from humans.
// Use this to read feedback and answers from human reviewers.
func (c *Client) GetHumanNotes(issueID string) ([]Note, error) {
	return c.GetNotesByAuthor(issueID, "human")
}

// GetAgentNotes returns only notes from agents.
// Use this to read progress notes from previous agent iterations.
func (c *Client) GetAgentNotes(issueID string) ([]Note, error) {
	return c.GetNotesByAuthor(issueID, "agent")
}

// SetRunRecord stores a RunRecord for a task.
// The RunRecord is stored in a separate file at .tick/logs/records/<task-id>.json
func (c *Client) SetRunRecord(taskID string, record *agent.RunRecord) error {
	if record == nil {
		return nil
	}
	return c.runrecordStore.Write(taskID, record)
}

// GetRunRecord retrieves the RunRecord for a task.
// Returns nil if no RunRecord exists.
func (c *Client) GetRunRecord(taskID string) (*agent.RunRecord, error) {
	record, err := c.runrecordStore.Read(taskID)
	if err == runrecord.ErrNotFound {
		return nil, nil
	}
	return record, err
}

// Compile-time assertion that Client implements TicksClient from the engine package.
// This is done via a type assertion using the interface methods.
// The actual interface is defined in internal/engine/engine.go.
var _ interface {
	GetEpic(epicID string) (*Epic, error)
	GetTask(taskID string) (*Task, error)
	NextTask(epicID string) (*Task, error)
	ListTasks(epicID string) ([]Task, error)
	HasOpenTasks(epicID string) (bool, error)
	CloseTask(taskID, reason string) error
	CloseEpic(epicID, reason string) error
	ReopenTask(taskID string) error
	AddNote(issueID, message string, extraArgs ...string) error
	GetNotes(epicID string) ([]string, error)
	GetHumanNotes(issueID string) ([]Note, error)
	SetStatus(issueID, status string) error
	SetAwaiting(taskID, awaiting, note string) error
	SetRunRecord(taskID string, record *agent.RunRecord) error
	GetRunRecord(taskID string) (*agent.RunRecord, error)
} = (*Client)(nil)
