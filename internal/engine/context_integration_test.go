package engine

import (
	"context"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/budget"
	"github.com/pengelbrecht/ticks/internal/checkpoint"
	epiccontext "github.com/pengelbrecht/ticks/internal/context"
	"github.com/pengelbrecht/ticks/internal/ticks"
)

// mockAgentForContext is a mock agent that tracks calls for context generation testing.
type mockAgentForContext struct {
	name          string
	available     bool
	runCallCount  int
	lastPrompt    string
	contextOutput string   // Output for context generation call
	taskOutputs   []string // Outputs for task iteration calls
	err           error
}

func (m *mockAgentForContext) Name() string    { return m.name }
func (m *mockAgentForContext) Available() bool { return m.available }

func (m *mockAgentForContext) Run(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
	m.lastPrompt = prompt
	callIdx := m.runCallCount
	m.runCallCount++

	if m.err != nil {
		return nil, m.err
	}

	// First call is for context generation (if epic has >1 tasks)
	// Subsequent calls are for task iterations
	var output string
	if callIdx == 0 && m.contextOutput != "" {
		output = m.contextOutput
	} else if callIdx < len(m.taskOutputs) {
		output = m.taskOutputs[callIdx]
	} else if callIdx > 0 && callIdx-1 < len(m.taskOutputs) {
		// If context was generated, task outputs start at index 1
		output = m.taskOutputs[callIdx-1]
	} else {
		output = "default output"
	}

	return &agent.Result{
		Output:    output,
		TokensIn:  100,
		TokensOut: 50,
		Cost:      0.01,
		Duration:  100 * time.Millisecond,
	}, nil
}

// mockTicksClientForContext extends the base mock with full state tracking.
type mockTicksClientForContext struct {
	epic          *ticks.Epic
	tasks         []*ticks.Task
	taskIndex     int
	closedTasks   map[string]bool
	closedEpic    bool
	notes         []string
	addedNotes    []string
	statusUpdates map[string]string
}

func newMockTicksClientForContext() *mockTicksClientForContext {
	return &mockTicksClientForContext{
		closedTasks:   make(map[string]bool),
		statusUpdates: make(map[string]string),
	}
}

func (m *mockTicksClientForContext) GetEpic(epicID string) (*ticks.Epic, error) {
	return m.epic, nil
}

func (m *mockTicksClientForContext) GetTask(taskID string) (*ticks.Task, error) {
	for _, t := range m.tasks {
		if t.ID == taskID {
			// Return with current status
			status := m.statusUpdates[taskID]
			if status == "" {
				status = t.Status
			}
			return &ticks.Task{
				ID:          t.ID,
				Title:       t.Title,
				Description: t.Description,
				Status:      status,
			}, nil
		}
	}
	return nil, nil
}

func (m *mockTicksClientForContext) NextTask(epicID string) (*ticks.Task, error) {
	// Find next non-closed task
	for m.taskIndex < len(m.tasks) {
		task := m.tasks[m.taskIndex]
		if !m.closedTasks[task.ID] {
			m.taskIndex++
			return task, nil
		}
		m.taskIndex++
	}
	return nil, nil
}

func (m *mockTicksClientForContext) ListTasks(epicID string) ([]ticks.Task, error) {
	result := make([]ticks.Task, 0, len(m.tasks))
	for _, t := range m.tasks {
		result = append(result, *t)
	}
	return result, nil
}

func (m *mockTicksClientForContext) HasOpenTasks(epicID string) (bool, error) {
	for _, t := range m.tasks {
		if !m.closedTasks[t.ID] {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockTicksClientForContext) CloseTask(taskID, reason string) error {
	m.closedTasks[taskID] = true
	return nil
}

func (m *mockTicksClientForContext) CloseEpic(epicID, reason string) error {
	m.closedEpic = true
	return nil
}

func (m *mockTicksClientForContext) ReopenTask(taskID string) error {
	delete(m.closedTasks, taskID)
	return nil
}

func (m *mockTicksClientForContext) AddNote(issueID, message string, extraArgs ...string) error {
	m.addedNotes = append(m.addedNotes, message)
	return nil
}

func (m *mockTicksClientForContext) GetNotes(epicID string) ([]string, error) {
	return m.notes, nil
}

func (m *mockTicksClientForContext) GetHumanNotes(issueID string) ([]ticks.Note, error) {
	return nil, nil
}

func (m *mockTicksClientForContext) SetStatus(issueID, status string) error {
	m.statusUpdates[issueID] = status
	return nil
}

func (m *mockTicksClientForContext) SetAwaiting(taskID, awaiting, note string) error {
	return nil
}

func (m *mockTicksClientForContext) SetRunRecord(taskID string, record *agent.RunRecord) error {
	return nil
}

// =============================================================================
// Integration Tests for Engine Context Generation
// =============================================================================

func TestEngine_ContextGeneration_ThreeTasks(t *testing.T) {
	// Test: Epic with 3 tasks - context generated before first task
	dir := t.TempDir()
	contextDir := filepath.Join(dir, "context")
	checkpointDir := filepath.Join(dir, "checkpoints")

	mockTicks := newMockTicksClientForContext()
	mockTicks.epic = &ticks.Epic{
		ID:          "epic-123",
		Title:       "Test Epic",
		Description: "Epic with multiple tasks",
		Type:        "epic",
	}
	mockTicks.tasks = []*ticks.Task{
		{ID: "task-1", Title: "First Task", Description: "Do first thing", Status: "open"},
		{ID: "task-2", Title: "Second Task", Description: "Do second thing", Status: "open"},
		{ID: "task-3", Title: "Third Task", Description: "Do third thing", Status: "open"},
	}

	mockAg := &mockAgentForContext{
		name:          "test",
		available:     true,
		contextOutput: "# Generated Context\n\n## Key Files\n- src/main.go\n- src/utils.go",
		taskOutputs:   []string{"Task 1 done", "Task 2 done", "Task 3 done"},
	}

	b := budget.NewTracker(budget.Limits{MaxIterations: 1})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := &Engine{
		agent:      mockAg,
		ticks:      mockTicks,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	// Set up context components
	store := epiccontext.NewStoreWithDir(contextDir)
	generator, err := epiccontext.NewGenerator(mockAg)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}
	engine.SetContextComponents(store, generator)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = engine.Run(ctx, RunConfig{
		EpicID:        "epic-123",
		MaxIterations: 1,
		AgentTimeout:  1 * time.Second,
	})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	// Verify context was generated and saved
	if !store.Exists("epic-123") {
		t.Error("context file should exist after generation")
	}

	content, err := store.Load("epic-123")
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if !strings.Contains(content, "Generated Context") {
		t.Errorf("context content = %q, should contain 'Generated Context'", content)
	}

	// Agent should have been called at least twice: once for context, once for task
	if mockAg.runCallCount < 2 {
		t.Errorf("agent.Run() called %d times, want at least 2", mockAg.runCallCount)
	}
}

func TestEngine_ContextGeneration_SingleTask(t *testing.T) {
	// Test: Epic with 1 task - context generation skipped
	dir := t.TempDir()
	contextDir := filepath.Join(dir, "context")
	checkpointDir := filepath.Join(dir, "checkpoints")

	mockTicks := newMockTicksClientForContext()
	mockTicks.epic = &ticks.Epic{
		ID:          "epic-single",
		Title:       "Single Task Epic",
		Description: "Epic with only one task",
		Type:        "epic",
	}
	mockTicks.tasks = []*ticks.Task{
		{ID: "task-only", Title: "Only Task", Description: "Do the thing", Status: "open"},
	}

	mockAg := &mockAgentForContext{
		name:          "test",
		available:     true,
		contextOutput: "Should not be used",
		taskOutputs:   []string{"Task done"},
	}

	b := budget.NewTracker(budget.Limits{MaxIterations: 1})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := &Engine{
		agent:      mockAg,
		ticks:      mockTicks,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	store := epiccontext.NewStoreWithDir(contextDir)
	generator, err := epiccontext.NewGenerator(mockAg)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}
	engine.SetContextComponents(store, generator)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = engine.Run(ctx, RunConfig{
		EpicID:        "epic-single",
		MaxIterations: 1,
		AgentTimeout:  1 * time.Second,
	})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	// Context should NOT be generated for single-task epic
	if store.Exists("epic-single") {
		t.Error("context file should NOT exist for single-task epic")
	}

	// Agent should have been called only once (for the task)
	if mockAg.runCallCount != 1 {
		t.Errorf("agent.Run() called %d times, want 1 (no context generation)", mockAg.runCallCount)
	}
}

func TestEngine_ContextGeneration_AlreadyExists(t *testing.T) {
	// Test: Context already exists - generation skipped
	dir := t.TempDir()
	contextDir := filepath.Join(dir, "context")
	checkpointDir := filepath.Join(dir, "checkpoints")

	// Pre-create the context file
	store := epiccontext.NewStoreWithDir(contextDir)
	existingContext := "# Pre-existing Context\n\nThis was already generated."
	if err := store.Save("epic-exists", existingContext); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	mockTicks := newMockTicksClientForContext()
	mockTicks.epic = &ticks.Epic{
		ID:    "epic-exists",
		Title: "Epic With Existing Context",
		Type:  "epic",
	}
	mockTicks.tasks = []*ticks.Task{
		{ID: "task-1", Title: "Task 1", Description: "Do thing 1", Status: "open"},
		{ID: "task-2", Title: "Task 2", Description: "Do thing 2", Status: "open"},
	}

	mockAg := &mockAgentForContext{
		name:          "test",
		available:     true,
		contextOutput: "NEW CONTEXT - should not be used",
		taskOutputs:   []string{"Task 1 done"},
	}

	b := budget.NewTracker(budget.Limits{MaxIterations: 1})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := &Engine{
		agent:      mockAg,
		ticks:      mockTicks,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	generator, err := epiccontext.NewGenerator(mockAg)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}
	engine.SetContextComponents(store, generator)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = engine.Run(ctx, RunConfig{
		EpicID:        "epic-exists",
		MaxIterations: 1,
		AgentTimeout:  1 * time.Second,
	})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	// Context should still be the pre-existing content
	content, err := store.Load("epic-exists")
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if content != existingContext {
		t.Errorf("context was overwritten, got %q, want %q", content, existingContext)
	}

	// Agent should be called only once (for the task, not for context)
	if mockAg.runCallCount != 1 {
		t.Errorf("agent.Run() called %d times, want 1 (context should be skipped)", mockAg.runCallCount)
	}
}

func TestEngine_ContextGeneration_GeneratorFails(t *testing.T) {
	// Test: Generation fails - run proceeds without context
	dir := t.TempDir()
	contextDir := filepath.Join(dir, "context")
	checkpointDir := filepath.Join(dir, "checkpoints")

	mockTicks := newMockTicksClientForContext()
	mockTicks.epic = &ticks.Epic{
		ID:    "epic-fail",
		Title: "Epic Where Context Fails",
		Type:  "epic",
	}
	mockTicks.tasks = []*ticks.Task{
		{ID: "task-1", Title: "Task 1", Description: "Do thing 1", Status: "open"},
		{ID: "task-2", Title: "Task 2", Description: "Do thing 2", Status: "open"},
	}

	// Track which call fails
	callCount := 0
	failingAgent := &mockAgentForContext{
		name:      "test",
		available: true,
	}

	// Custom agent that fails on first call (context gen) but succeeds on second (task)
	customAgent := &mockAgentFailFirst{
		name:      "test",
		available: true,
	}

	b := budget.NewTracker(budget.Limits{MaxIterations: 1})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := &Engine{
		agent:      customAgent,
		ticks:      mockTicks,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	store := epiccontext.NewStoreWithDir(contextDir)
	generator, err := epiccontext.NewGenerator(failingAgent)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}
	// Use the failing agent for context generation
	failingAgent.err = context.DeadlineExceeded
	engine.SetContextComponents(store, generator)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Run should succeed even if context generation fails
	_, err = engine.Run(ctx, RunConfig{
		EpicID:        "epic-fail",
		MaxIterations: 1,
		AgentTimeout:  1 * time.Second,
	})
	if err != nil {
		t.Fatalf("Run() error = %v (should proceed despite context failure)", err)
	}

	// Context should NOT exist
	if store.Exists("epic-fail") {
		t.Error("context file should NOT exist when generation fails")
	}

	// Task agent should still have been called
	if customAgent.runCallCount < 1 {
		t.Errorf("task agent.Run() called %d times, want at least 1", customAgent.runCallCount)
	}

	_ = callCount // unused variable warning fix
}

// mockAgentFailFirst fails on first call, succeeds on subsequent calls.
type mockAgentFailFirst struct {
	name         string
	available    bool
	runCallCount int
}

func (m *mockAgentFailFirst) Name() string    { return m.name }
func (m *mockAgentFailFirst) Available() bool { return m.available }

func (m *mockAgentFailFirst) Run(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
	m.runCallCount++
	// First call always succeeds - context generation uses a different agent instance
	return &agent.Result{
		Output:    "Task iteration output",
		TokensIn:  100,
		TokensOut: 50,
		Cost:      0.01,
		Duration:  50 * time.Millisecond,
	}, nil
}

func TestEngine_ContextInjectedIntoPrompt(t *testing.T) {
	// Test: Context injected into prompt correctly
	dir := t.TempDir()
	contextDir := filepath.Join(dir, "context")
	checkpointDir := filepath.Join(dir, "checkpoints")

	// Pre-create context that we expect to see in the prompt
	store := epiccontext.NewStoreWithDir(contextDir)
	testContext := "## Key Files\n- internal/api/handler.go\n- internal/db/models.go\n\n## Architecture\nThe system uses a hexagonal architecture."
	if err := store.Save("epic-prompt", testContext); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	mockTicks := newMockTicksClientForContext()
	mockTicks.epic = &ticks.Epic{
		ID:    "epic-prompt",
		Title: "Epic to Test Prompt Injection",
		Type:  "epic",
	}
	mockTicks.tasks = []*ticks.Task{
		{ID: "task-1", Title: "Task 1", Description: "Do thing 1", Status: "open"},
		{ID: "task-2", Title: "Task 2", Description: "Do thing 2", Status: "open"},
	}

	var capturedPrompt string
	mockAg := &mockAgentCapture{
		name:      "test",
		available: true,
		onRun: func(prompt string) {
			capturedPrompt = prompt
		},
	}

	b := budget.NewTracker(budget.Limits{MaxIterations: 1})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := &Engine{
		agent:      mockAg,
		ticks:      mockTicks,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	// Don't create a generator - just use the store so context isn't regenerated
	engine.SetContextComponents(store, nil)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := engine.Run(ctx, RunConfig{
		EpicID:        "epic-prompt",
		MaxIterations: 1,
		AgentTimeout:  1 * time.Second,
	})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	// Verify the context was included in the prompt
	if !strings.Contains(capturedPrompt, "## Epic Context") {
		t.Error("prompt should contain '## Epic Context' header")
	}

	if !strings.Contains(capturedPrompt, "internal/api/handler.go") {
		t.Errorf("prompt should contain context content, got:\n%s", capturedPrompt)
	}

	if !strings.Contains(capturedPrompt, "hexagonal architecture") {
		t.Errorf("prompt should contain 'hexagonal architecture', got:\n%s", capturedPrompt)
	}
}

func TestEngine_ContextOmittedWhenEmpty(t *testing.T) {
	// Test: Context section omitted from prompt when no context exists
	dir := t.TempDir()
	contextDir := filepath.Join(dir, "context")
	checkpointDir := filepath.Join(dir, "checkpoints")

	mockTicks := newMockTicksClientForContext()
	mockTicks.epic = &ticks.Epic{
		ID:    "epic-no-context",
		Title: "Epic Without Context",
		Type:  "epic",
	}
	mockTicks.tasks = []*ticks.Task{
		{ID: "task-1", Title: "Task 1", Description: "Do thing 1", Status: "open"},
	}

	var capturedPrompt string
	mockAg := &mockAgentCapture{
		name:      "test",
		available: true,
		onRun: func(prompt string) {
			capturedPrompt = prompt
		},
	}

	b := budget.NewTracker(budget.Limits{MaxIterations: 1})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := &Engine{
		agent:      mockAg,
		ticks:      mockTicks,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	// Set up store but no context file exists
	store := epiccontext.NewStoreWithDir(contextDir)
	engine.SetContextComponents(store, nil)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := engine.Run(ctx, RunConfig{
		EpicID:        "epic-no-context",
		MaxIterations: 1,
		AgentTimeout:  1 * time.Second,
	})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	// Verify the context section is NOT in the prompt
	if strings.Contains(capturedPrompt, "## Epic Context") {
		t.Errorf("prompt should NOT contain '## Epic Context' when no context exists, got:\n%s", capturedPrompt)
	}
}

// mockAgentCapture captures the prompt for inspection.
type mockAgentCapture struct {
	name         string
	available    bool
	onRun        func(prompt string)
	runCallCount int
}

func (m *mockAgentCapture) Name() string    { return m.name }
func (m *mockAgentCapture) Available() bool { return m.available }

func (m *mockAgentCapture) Run(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
	m.runCallCount++
	if m.onRun != nil {
		m.onRun(prompt)
	}
	return &agent.Result{
		Output:    "iteration complete",
		TokensIn:  100,
		TokensOut: 50,
		Cost:      0.01,
		Duration:  50 * time.Millisecond,
	}, nil
}

func TestEngine_ContextComponentsNil(t *testing.T) {
	// Test: Engine works fine when context components are not set
	dir := t.TempDir()
	checkpointDir := filepath.Join(dir, "checkpoints")

	mockTicks := newMockTicksClientForContext()
	mockTicks.epic = &ticks.Epic{
		ID:    "epic-no-components",
		Title: "Epic Without Context Components",
		Type:  "epic",
	}
	mockTicks.tasks = []*ticks.Task{
		{ID: "task-1", Title: "Task 1", Description: "Do thing 1", Status: "open"},
		{ID: "task-2", Title: "Task 2", Description: "Do thing 2", Status: "open"},
	}

	mockAg := &mockAgentCapture{
		name:      "test",
		available: true,
	}

	b := budget.NewTracker(budget.Limits{MaxIterations: 1})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := &Engine{
		agent:      mockAg,
		ticks:      mockTicks,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	// Don't set context components at all

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := engine.Run(ctx, RunConfig{
		EpicID:        "epic-no-components",
		MaxIterations: 1,
		AgentTimeout:  1 * time.Second,
	})
	if err != nil {
		t.Fatalf("Run() error = %v (should work without context components)", err)
	}

	// Agent should have been called for the task
	if mockAg.runCallCount != 1 {
		t.Errorf("agent.Run() called %d times, want 1", mockAg.runCallCount)
	}
}

func TestEngine_SetContextComponents(t *testing.T) {
	// Test: SetContextComponents properly configures the engine
	dir := t.TempDir()

	engine := &Engine{
		prompt: NewPromptBuilder(),
	}

	// Initially nil
	if engine.contextStore != nil {
		t.Error("contextStore should be nil initially")
	}
	if engine.contextGenerator != nil {
		t.Error("contextGenerator should be nil initially")
	}

	// Set components
	store := epiccontext.NewStoreWithDir(dir)
	mockAg := &mockAgentCapture{name: "test", available: true}
	generator, err := epiccontext.NewGenerator(mockAg)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	engine.SetContextComponents(store, generator)

	if engine.contextStore != store {
		t.Error("contextStore not set correctly")
	}
	if engine.contextGenerator != generator {
		t.Error("contextGenerator not set correctly")
	}
}

func TestEngine_ContextFilePath(t *testing.T) {
	// Test: Context file is created at the correct path
	dir := t.TempDir()
	contextDir := filepath.Join(dir, "custom-context-dir")
	checkpointDir := filepath.Join(dir, "checkpoints")

	mockTicks := newMockTicksClientForContext()
	mockTicks.epic = &ticks.Epic{
		ID:    "my-epic-id",
		Title: "Test Epic",
		Type:  "epic",
	}
	mockTicks.tasks = []*ticks.Task{
		{ID: "task-1", Title: "Task 1", Status: "open"},
		{ID: "task-2", Title: "Task 2", Status: "open"},
	}

	mockAg := &mockAgentForContext{
		name:          "test",
		available:     true,
		contextOutput: "Generated content",
		taskOutputs:   []string{"Task done"},
	}

	b := budget.NewTracker(budget.Limits{MaxIterations: 1})
	c := checkpoint.NewManagerWithDir(checkpointDir)

	engine := &Engine{
		agent:      mockAg,
		ticks:      mockTicks,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	store := epiccontext.NewStoreWithDir(contextDir)
	generator, err := epiccontext.NewGenerator(mockAg)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}
	engine.SetContextComponents(store, generator)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = engine.Run(ctx, RunConfig{
		EpicID:        "my-epic-id",
		MaxIterations: 1,
		AgentTimeout:  1 * time.Second,
	})
	if err != nil {
		t.Fatalf("Run() error = %v", err)
	}

	// Verify file exists at expected path
	expectedPath := filepath.Join(contextDir, "my-epic-id.md")
	if !fileExists(expectedPath) {
		t.Errorf("context file not found at expected path: %s", expectedPath)
	}
}

func fileExists(path string) bool {
	_, err := filepath.Glob(path)
	if err != nil {
		return false
	}
	// Use store.Exists logic
	store := epiccontext.NewStoreWithDir(filepath.Dir(path))
	return store.Exists(filepath.Base(path[:len(path)-3])) // Remove .md extension
}
