package ticks

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/pengelbrecht/ticks/internal/agent"
)

// Client wraps the tk CLI for programmatic access to the Ticks issue tracker.
type Client struct {
	// Command is the path to the tk binary. Defaults to "tk".
	Command string
}

// NewClient creates a new Ticks client with default settings.
func NewClient() *Client {
	return &Client{Command: "tk"}
}

// isNoTasksError returns true if the error indicates no tasks were found.
func isNoTasksError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "no open") ||
		strings.Contains(msg, "No tasks") ||
		strings.Contains(msg, "no ready") ||
		strings.Contains(msg, "No ready") ||
		strings.Contains(msg, "no awaiting") ||
		strings.Contains(msg, "No awaiting")
}

// parseTaskJSON parses JSON output into a Task. Returns nil for empty output or empty ID.
func parseTaskJSON(out []byte) (*Task, error) {
	out = bytes.TrimSpace(out)
	if len(out) == 0 {
		return nil, nil
	}

	var task Task
	if err := json.Unmarshal(out, &task); err != nil {
		return nil, fmt.Errorf("parse task JSON: %w", err)
	}
	if task.ID == "" {
		return nil, nil
	}
	return &task, nil
}

// parseEpicJSON parses JSON output into an Epic. Returns nil for empty output or empty ID.
func parseEpicJSON(out []byte) (*Epic, error) {
	out = bytes.TrimSpace(out)
	if len(out) == 0 {
		return nil, nil
	}

	var epic Epic
	if err := json.Unmarshal(out, &epic); err != nil {
		return nil, fmt.Errorf("parse epic JSON: %w", err)
	}
	if epic.ID == "" {
		return nil, nil
	}
	return &epic, nil
}

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

// NextTask returns the next open, unblocked task for the given epic that is ready for agent work.
// Returns nil if no tasks are available.
// Uses --all to see tasks from all owners (important for blockers check).
// Excludes tasks where awaiting is set or manual=true (backwards compat).
func (c *Client) NextTask(epicID string) (*Task, error) {
	out, err := c.run("next", epicID, "--all", "--json")
	if err != nil {
		if isNoTasksError(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("tk next %s: %w", epicID, err)
	}

	task, err := parseTaskJSON(out)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, nil
	}

	// If the task is awaiting human action, find the next ready task
	if task.IsAwaitingHuman() {
		return c.findNextReadyTask(epicID)
	}
	return task, nil
}

// NextTaskWithOptions returns the next open, unblocked task ready for agent work.
// Uses functional options to configure behavior:
//   - WithEpic(epicID): search within a specific epic (default behavior of NextTask)
//   - StandaloneOnly(): only return tasks without a parent epic
//   - OrphanedOnly(): only return tasks whose parent epic is closed
//
// If no options are provided, searches all tasks (any epic or standalone).
// Returns nil if no tasks are available.
func (c *Client) NextTaskWithOptions(opts ...NextTaskOption) (*Task, error) {
	options := &NextTaskOptions{}
	for _, opt := range opts {
		opt(options)
	}

	// If epic is specified, use the existing NextTask behavior
	if options.EpicID != "" {
		return c.NextTask(options.EpicID)
	}

	// If standalone only, search for tasks without a parent
	if options.StandaloneOnly {
		return c.nextStandaloneTask()
	}

	// If orphaned only, search for tasks with a closed parent epic
	if options.OrphanedOnly {
		return c.nextOrphanedTask()
	}

	// Otherwise, search all tasks (any epic or standalone)
	return c.nextAnyTask()
}

// nextAnyTask finds the next ready task from all open tasks, regardless of epic.
// Tasks are evaluated in priority order (lowest number = highest priority).
// Returns nil if no tasks are available.
func (c *Client) nextAnyTask() (*Task, error) {
	tasks, err := c.ListAllTasks()
	if err != nil {
		return nil, err
	}

	return c.findReadyTaskFromList(tasks)
}

// nextStandaloneTask finds the next ready task that has no parent epic.
// Tasks are evaluated in priority order (lowest number = highest priority).
// Returns nil if no standalone tasks are available.
func (c *Client) nextStandaloneTask() (*Task, error) {
	tasks, err := c.ListAllTasks()
	if err != nil {
		return nil, err
	}

	// Filter to only standalone tasks (no parent)
	var standaloneTasks []Task
	for _, t := range tasks {
		if t.Parent == "" {
			standaloneTasks = append(standaloneTasks, t)
		}
	}

	return c.findReadyTaskFromList(standaloneTasks)
}

// nextOrphanedTask finds the next ready task whose parent epic is closed.
// Tasks are evaluated in priority order (lowest number = highest priority).
// Returns nil if no orphaned tasks are available.
func (c *Client) nextOrphanedTask() (*Task, error) {
	tasks, err := c.ListAllTasks()
	if err != nil {
		return nil, err
	}

	// Build a cache of parent epic statuses to avoid repeated lookups
	epicStatusCache := make(map[string]string)

	// Filter to only orphaned tasks (parent exists but is closed)
	var orphanedTasks []Task
	for _, t := range tasks {
		if t.Parent == "" {
			continue // No parent = standalone, not orphaned
		}

		// Check if parent epic is closed (cache the result)
		parentStatus, ok := epicStatusCache[t.Parent]
		if !ok {
			parent, err := c.GetEpic(t.Parent)
			if err != nil {
				// If we can't get the parent, skip this task
				continue
			}
			parentStatus = parent.Status
			epicStatusCache[t.Parent] = parentStatus
		}

		if parentStatus == "closed" {
			orphanedTasks = append(orphanedTasks, t)
		}
	}

	return c.findReadyTaskFromList(orphanedTasks)
}

// findReadyTaskFromList finds the first ready task from a list of tasks.
// A task is ready if it is:
// 1. Open (not closed)
// 2. Not blocked by any open task
// 3. Not awaiting human action (awaiting=nil AND manual=false)
// Tasks are sorted by priority (lowest number = highest priority) before selection.
func (c *Client) findReadyTaskFromList(tasks []Task) (*Task, error) {
	if len(tasks) == 0 {
		return nil, nil
	}

	// Sort by priority (lowest number = highest priority)
	sort.Slice(tasks, func(i, j int) bool {
		return tasks[i].Priority < tasks[j].Priority
	})

	// Build a map of all task IDs for checking blocker status
	taskMap := make(map[string]*Task)
	for i := range tasks {
		taskMap[tasks[i].ID] = &tasks[i]
	}

	// Build a set of blocked task IDs
	blockedIDs := make(map[string]bool)
	for _, t := range tasks {
		for _, blockerID := range t.BlockedBy {
			// A task is blocked if any of its blockers exist and are not closed
			// We need to check all tasks, not just ones in our list
			blocker, exists := taskMap[blockerID]
			if exists && blocker.Status != "closed" {
				blockedIDs[t.ID] = true
				break
			}
			// For blockers not in our list, we need to fetch them
			if !exists {
				blockerTask, err := c.GetTask(blockerID)
				if err == nil && blockerTask != nil && blockerTask.Status != "closed" {
					blockedIDs[t.ID] = true
					break
				}
			}
		}
	}

	// Find the first task that is ready
	for _, t := range tasks {
		if t.Status != "open" {
			continue
		}
		if blockedIDs[t.ID] {
			continue
		}
		if t.IsAwaitingHuman() {
			continue
		}
		// Found a ready task
		taskCopy := t
		return &taskCopy, nil
	}

	return nil, nil
}

// ListAwaitingTasks returns all tasks awaiting human attention under the given epic.
// If awaitingTypes are provided, filters to only those types (e.g., "approval", "review").
// If no awaitingTypes are provided, returns all awaiting tasks.
// This is implemented locally since tk list may not support --awaiting filter.
func (c *Client) ListAwaitingTasks(epicID string, awaitingTypes ...string) ([]Task, error) {
	tasks, err := c.ListTasks(epicID)
	if err != nil {
		return nil, err
	}

	// Build a set of awaiting types for efficient lookup
	typeFilter := make(map[string]bool)
	for _, t := range awaitingTypes {
		typeFilter[t] = true
	}

	var result []Task
	for _, t := range tasks {
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
		result = append(result, t)
	}
	return result, nil
}

// NextAwaitingTask returns the next task awaiting human attention.
// If epicID is empty, searches across all epics.
// If awaitingTypes are provided, filters to only those types (e.g., "approval", "review").
// Returns nil if no tasks are awaiting human attention.
func (c *Client) NextAwaitingTask(epicID string, awaitingTypes ...string) (*Task, error) {
	args := []string{"next"}
	if epicID != "" {
		args = append(args, epicID)
	}
	args = append(args, "--awaiting")
	if len(awaitingTypes) > 0 {
		args = append(args, strings.Join(awaitingTypes, ","))
	}
	args = append(args, "--json")

	out, err := c.run(args...)
	if err != nil {
		if isNoTasksError(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("tk next --awaiting: %w", err)
	}

	return parseTaskJSON(out)
}

// findNextReadyTask finds the next task ready for agent work by filtering locally.
// This handles the case where tk next returns a task that's awaiting human action.
func (c *Client) findNextReadyTask(epicID string) (*Task, error) {
	tasks, err := c.ListTasks(epicID)
	if err != nil {
		return nil, err
	}
	return c.findReadyTaskFromList(tasks)
}

// GetTask returns details for a specific task.
func (c *Client) GetTask(taskID string) (*Task, error) {
	out, err := c.run("show", taskID, "--json")
	if err != nil {
		return nil, fmt.Errorf("tk show %s: %w", taskID, err)
	}

	var task Task
	if err := json.Unmarshal(out, &task); err != nil {
		return nil, fmt.Errorf("parse task JSON: %w", err)
	}
	return &task, nil
}

// GetEpic returns details for a specific epic.
func (c *Client) GetEpic(epicID string) (*Epic, error) {
	out, err := c.run("show", epicID, "--json")
	if err != nil {
		return nil, fmt.Errorf("tk show %s: %w", epicID, err)
	}

	var epic Epic
	if err := json.Unmarshal(out, &epic); err != nil {
		return nil, fmt.Errorf("parse epic JSON: %w", err)
	}
	return &epic, nil
}

// ListTasks returns all tasks under the given parent epic.
func (c *Client) ListTasks(epicID string) ([]Task, error) {
	out, err := c.run("list", "--parent", epicID, "--all", "--json")
	if err != nil {
		return nil, fmt.Errorf("tk list --parent %s: %w", epicID, err)
	}

	out = bytes.TrimSpace(out)
	if len(out) == 0 {
		return nil, nil
	}

	// tk list --json returns {"ticks": [...]}
	var wrapper listOutput
	if err := json.Unmarshal(out, &wrapper); err != nil {
		return nil, fmt.Errorf("parse tasks JSON: %w", err)
	}
	return wrapper.Ticks, nil
}

// ListAllTasks returns all tasks regardless of parent epic.
// Tasks are returned sorted by priority (lowest number = highest priority).
func (c *Client) ListAllTasks() ([]Task, error) {
	out, err := c.run("list", "--type", "task", "--status", "open", "--all", "--json")
	if err != nil {
		return nil, fmt.Errorf("tk list --type task: %w", err)
	}

	out = bytes.TrimSpace(out)
	if len(out) == 0 {
		return nil, nil
	}

	// tk list --json returns {"ticks": [...]}
	var wrapper listOutput
	if err := json.Unmarshal(out, &wrapper); err != nil {
		return nil, fmt.Errorf("parse tasks JSON: %w", err)
	}
	return wrapper.Ticks, nil
}

// NextReadyEpic returns the next ready (unblocked) epic.
// Returns nil if no epics are available.
func (c *Client) NextReadyEpic() (*Epic, error) {
	out, err := c.run("next", "--epic", "--all", "--json")
	if err != nil {
		if isNoTasksError(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("tk next --epic: %w", err)
	}

	return parseEpicJSON(out)
}

// ListReadyEpics returns all open epics (for picker display).
func (c *Client) ListReadyEpics() ([]Epic, error) {
	out, err := c.run("list", "--type", "epic", "--status", "open", "--all", "--json")
	if err != nil {
		return nil, fmt.Errorf("tk list --type epic: %w", err)
	}

	out = bytes.TrimSpace(out)
	if len(out) == 0 {
		return nil, nil
	}

	// tk list --json returns {"ticks": [...]}
	var wrapper epicListOutput
	if err := json.Unmarshal(out, &wrapper); err != nil {
		return nil, fmt.Errorf("parse epics JSON: %w", err)
	}
	return wrapper.Ticks, nil
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
	_, err := c.run("close", taskID, "--reason", reason)
	if err != nil {
		return fmt.Errorf("tk close %s: %w", taskID, err)
	}
	return nil
}

// CompleteTask handles task completion, respecting the requires field.
// If the task has a requires field set (e.g., "approval", "review", "content"),
// the task is routed to human review via SetAwaiting instead of closing.
// Tasks without requires are closed directly with the provided summary.
func (c *Client) CompleteTask(taskID string, summary string) error {
	task, err := c.GetTask(taskID)
	if err != nil {
		return fmt.Errorf("getting task for completion: %w", err)
	}

	if task.Requires == nil || *task.Requires == "" {
		return c.CloseTask(taskID, summary)
	}

	note := fmt.Sprintf("Work complete, requires %s", *task.Requires)
	return c.SetAwaiting(taskID, *task.Requires, note)
}

// ReopenTask reopens a closed task.
func (c *Client) ReopenTask(taskID string) error {
	_, err := c.run("reopen", taskID)
	if err != nil {
		return fmt.Errorf("tk reopen %s: %w", taskID, err)
	}
	return nil
}

// CloseEpic closes an epic with the given reason.
func (c *Client) CloseEpic(epicID, reason string) error {
	return c.CloseTask(epicID, reason)
}

// AddNote adds a note to an epic or task.
// Optional extra args can be passed (e.g., "--from", "human").
func (c *Client) AddNote(issueID, message string, extraArgs ...string) error {
	args := []string{"note", issueID, message}
	args = append(args, extraArgs...)
	_, err := c.run(args...)
	if err != nil {
		return fmt.Errorf("tk note %s: %w", issueID, err)
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

// SetStatus updates the status of an issue (open, in_progress, closed).
func (c *Client) SetStatus(issueID, status string) error {
	_, err := c.run("update", issueID, "--status", status)
	if err != nil {
		return fmt.Errorf("tk update %s --status %s: %w", issueID, status, err)
	}
	return nil
}

// SetAwaiting updates the awaiting field of a task via tk update.
// If note is provided, it is added as a note to provide context.
func (c *Client) SetAwaiting(taskID string, awaiting string, note string) error {
	_, err := c.run("update", taskID, "--awaiting", awaiting)
	if err != nil {
		return fmt.Errorf("tk update %s --awaiting %s: %w", taskID, awaiting, err)
	}

	// Add context as note if provided
	if note != "" {
		return c.AddNote(taskID, note)
	}
	return nil
}

// ClearAwaiting clears the awaiting field of a task, indicating it's ready for agent work.
func (c *Client) ClearAwaiting(taskID string) error {
	_, err := c.run("update", taskID, "--awaiting=")
	if err != nil {
		return fmt.Errorf("tk update %s --awaiting=: %w", taskID, err)
	}
	return nil
}

// SetVerdict sets the verdict on a task and optionally adds feedback as a note.
// The feedback note is added BEFORE setting the verdict to ensure the note is
// available when the verdict triggers any downstream processing.
func (c *Client) SetVerdict(taskID string, verdict string, feedback string) error {
	// Add feedback note first (if provided) to avoid race condition
	if feedback != "" {
		if err := c.AddNote(taskID, feedback, "--from", "human"); err != nil {
			return fmt.Errorf("adding feedback note: %w", err)
		}
	}

	// Set verdict - this triggers processing in tk CLI
	_, err := c.run("update", taskID, "--verdict", verdict)
	if err != nil {
		return fmt.Errorf("tk update %s --verdict %s: %w", taskID, verdict, err)
	}
	return nil
}

// Approve sets verdict=approved on a task, triggering verdict processing.
// This is a convenience method for human reviewers to approve awaiting tasks.
func (c *Client) Approve(taskID string) error {
	return c.SetVerdict(taskID, "approved", "")
}

// Reject sets verdict=rejected on a task with optional feedback.
// The feedback is added as a note with --from human before setting the verdict.
// This is a convenience method for human reviewers to reject awaiting tasks.
func (c *Client) Reject(taskID string, feedback string) error {
	return c.SetVerdict(taskID, "rejected", feedback)
}

// ProcessVerdict reads a task, processes its verdict, and saves the result.
// This is used when ticker needs to process verdicts set by humans.
// Returns the VerdictResult indicating what changes were made.
func (c *Client) ProcessVerdict(taskID string) (VerdictResult, error) {
	filePath, err := tickFilePath(taskID)
	if err != nil {
		return VerdictResult{}, err
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return VerdictResult{}, fmt.Errorf("reading tick file %s: %w", taskID, err)
	}

	// Parse into Task struct
	var task Task
	if err := json.Unmarshal(data, &task); err != nil {
		return VerdictResult{}, fmt.Errorf("parsing tick file %s: %w", taskID, err)
	}

	// Process the verdict
	result := task.ProcessVerdict()

	// If nothing was processed, return early
	if !result.TransientCleared {
		return result, nil
	}

	// Save the updated task back to file
	// Use a generic map to preserve any extra fields
	var tickData map[string]interface{}
	if err := json.Unmarshal(data, &tickData); err != nil {
		return VerdictResult{}, fmt.Errorf("parsing tick file for save %s: %w", taskID, err)
	}

	// Update the fields that ProcessVerdict modified
	delete(tickData, "awaiting") // cleared
	delete(tickData, "verdict")  // cleared
	delete(tickData, "manual")   // cleared
	tickData["status"] = task.Status

	// Write back with indentation
	output, err := json.MarshalIndent(tickData, "", "  ")
	if err != nil {
		return VerdictResult{}, fmt.Errorf("marshaling tick file %s: %w", taskID, err)
	}

	if err := os.WriteFile(filePath, output, 0600); err != nil {
		return VerdictResult{}, fmt.Errorf("writing tick file %s: %w", taskID, err)
	}

	return result, nil
}

// GetNotes returns the notes for an epic or task as newline-separated strings.
func (c *Client) GetNotes(epicID string) ([]string, error) {
	epic, err := c.GetEpic(epicID)
	if err != nil {
		return nil, err
	}
	if epic.Notes == "" {
		return nil, nil
	}

	return splitNonEmpty(epic.Notes), nil
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

// GetStructuredNotes returns notes as structured Note objects with author metadata.
// Reads from the "structured_notes" field if present, otherwise parses legacy "notes" string.
// Each legacy note line is treated as an agent note (default author).
func (c *Client) GetStructuredNotes(issueID string) ([]Note, error) {
	filePath, err := tickFilePath(issueID)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading tick file %s: %w", issueID, err)
	}

	var tickData struct {
		Notes           string `json:"notes,omitempty"`
		StructuredNotes []Note `json:"structured_notes,omitempty"`
	}
	if err := json.Unmarshal(data, &tickData); err != nil {
		return nil, fmt.Errorf("parsing tick file %s: %w", issueID, err)
	}

	if len(tickData.StructuredNotes) > 0 {
		return tickData.StructuredNotes, nil
	}
	if tickData.Notes == "" {
		return nil, nil
	}

	// Convert legacy notes to structured format
	lines := splitNonEmpty(tickData.Notes)
	notes := make([]Note, len(lines))
	for i, line := range lines {
		notes[i] = Note{Content: line, Author: "agent"}
	}
	return notes, nil
}

// GetNotesByAuthor returns notes filtered by author.
// Pass "human" to get only human notes, "agent" (or empty) for agent notes.
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

// SetRunRecord stores a RunRecord on a task by updating the tick file directly.
// Since the tk CLI doesn't support the run field, we read-modify-write the JSON file.
func (c *Client) SetRunRecord(taskID string, record *agent.RunRecord) error {
	if record == nil {
		return nil
	}

	filePath, err := tickFilePath(taskID)
	if err != nil {
		return err
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("reading tick file %s: %w", taskID, err)
	}

	var tickData map[string]interface{}
	if err := json.Unmarshal(data, &tickData); err != nil {
		return fmt.Errorf("parsing tick file %s: %w", taskID, err)
	}

	tickData["run"] = record

	output, err := json.MarshalIndent(tickData, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling tick file %s: %w", taskID, err)
	}

	if err := os.WriteFile(filePath, output, 0600); err != nil {
		return fmt.Errorf("writing tick file %s: %w", taskID, err)
	}
	return nil
}

// GetRunRecord retrieves the RunRecord for a task by reading the tick file directly.
// Returns nil if no RunRecord exists.
func (c *Client) GetRunRecord(taskID string) (*agent.RunRecord, error) {
	filePath, err := tickFilePath(taskID)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading tick file %s: %w", taskID, err)
	}

	var tickData struct {
		Run *agent.RunRecord `json:"run,omitempty"`
	}
	if err := json.Unmarshal(data, &tickData); err != nil {
		return nil, fmt.Errorf("parsing tick file %s: %w", taskID, err)
	}

	return tickData.Run, nil
}

// tickFilePath returns the path to a tick's JSON file.
func tickFilePath(tickID string) (string, error) {
	tickDir, err := findTickDir()
	if err != nil {
		return "", fmt.Errorf("finding .tick directory: %w", err)
	}
	return filepath.Join(tickDir, "issues", tickID+".json"), nil
}

// findTickDir locates the .tick directory by walking up from cwd.
func findTickDir() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		tickPath := filepath.Join(dir, ".tick")
		if info, err := os.Stat(tickPath); err == nil && info.IsDir() {
			return tickPath, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf(".tick directory not found")
		}
		dir = parent
	}
}

// run executes a tk command and returns the output.
func (c *Client) run(args ...string) ([]byte, error) {
	cmd := exec.Command(c.Command, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg == "" {
			errMsg = err.Error()
		}
		return nil, fmt.Errorf("%s", errMsg)
	}
	return stdout.Bytes(), nil
}
