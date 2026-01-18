package engine

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/budget"
	"github.com/pengelbrecht/ticks/internal/checkpoint"
	"github.com/pengelbrecht/ticks/internal/ticks"
	"github.com/pengelbrecht/ticks/internal/verify"
)

// mockAgent implements agent.Agent for testing.
type mockAgent struct {
	name      string
	available bool
	responses []mockResponse
	callCount int
}

type mockResponse struct {
	output    string
	tokensIn  int
	tokensOut int
	cost      float64
	err       error
}

func (m *mockAgent) Name() string    { return m.name }
func (m *mockAgent) Available() bool { return m.available }

func (m *mockAgent) Run(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
	if m.callCount >= len(m.responses) {
		return nil, errors.New("no more mock responses")
	}

	resp := m.responses[m.callCount]
	m.callCount++

	if resp.err != nil {
		return nil, resp.err
	}

	return &agent.Result{
		Output:    resp.output,
		TokensIn:  resp.tokensIn,
		TokensOut: resp.tokensOut,
		Cost:      resp.cost,
		Duration:  100 * time.Millisecond,
	}, nil
}

// mockTicksClient simulates the ticks client for testing.
type mockTicksClient struct {
	epic        *ticks.Epic
	tasks       []*ticks.Task
	taskIndex   int
	notes       []string
	closedTasks map[string]bool // taskID -> closed (for easy lookup in tests)
	addedNotes  []string

	// Awaiting/verdict workflow support
	awaitingState   map[string]string       // taskID -> awaiting value
	verdictState    map[string]string       // taskID -> verdict value
	structuredNotes map[string][]ticks.Note // taskID -> structured notes

	// State change tracking for assertions
	setAwaitingCalls []setAwaitingCall
	setVerdictCalls  []setVerdictCall
}

// setAwaitingCall records a SetAwaiting call for test assertions.
type setAwaitingCall struct {
	TaskID   string
	Awaiting string
	Note     string
}

// setVerdictCall records a SetVerdict call for test assertions.
type setVerdictCall struct {
	TaskID   string
	Verdict  string
	Feedback string
}

// newMockTicksClient creates a new mock ticks client with initialized maps.
func newMockTicksClient() *mockTicksClient {
	return &mockTicksClient{
		closedTasks:     make(map[string]bool),
		awaitingState:   make(map[string]string),
		verdictState:    make(map[string]string),
		structuredNotes: make(map[string][]ticks.Note),
	}
}

// GetAwaiting returns the current awaiting state for a task.
func (m *mockTicksClient) GetAwaiting(taskID string) string {
	if m.awaitingState == nil {
		return ""
	}
	return m.awaitingState[taskID]
}

// GetVerdict returns the current verdict for a task.
func (m *mockTicksClient) GetVerdict(taskID string) string {
	if m.verdictState == nil {
		return ""
	}
	return m.verdictState[taskID]
}

// ClearAwaiting clears the awaiting state for a task.
func (m *mockTicksClient) ClearAwaiting(taskID string) error {
	if m.awaitingState != nil {
		delete(m.awaitingState, taskID)
	}
	return nil
}

// SimulateVerdictProcessing simulates what happens when a verdict is processed.
// For approved verdicts on approval/review/content awaiting types, the task would close.
// For rejected verdicts, the awaiting state is cleared and task returns to queue.
func (m *mockTicksClient) SimulateVerdictProcessing(taskID string) {
	awaiting := m.GetAwaiting(taskID)
	verdict := m.GetVerdict(taskID)

	if awaiting == "" || verdict == "" {
		return
	}

	// Clear transient fields
	delete(m.awaitingState, taskID)
	delete(m.verdictState, taskID)

	// Determine if task should close based on awaiting type and verdict
	shouldClose := false
	switch awaiting {
	case "work", "approval", "review", "content":
		shouldClose = (verdict == "approved")
	case "input", "escalation":
		shouldClose = (verdict == "rejected")
	case "checkpoint":
		shouldClose = false
	}

	if shouldClose {
		if m.closedTasks == nil {
			m.closedTasks = make(map[string]bool)
		}
		m.closedTasks[taskID] = true
	}
}

func (m *mockTicksClient) GetEpic(epicID string) (*ticks.Epic, error) {
	if m.epic == nil {
		return nil, errors.New("epic not found")
	}
	return m.epic, nil
}

func (m *mockTicksClient) NextTask(epicID string) (*ticks.Task, error) {
	if m.taskIndex >= len(m.tasks) {
		return nil, nil
	}
	task := m.tasks[m.taskIndex]
	m.taskIndex++
	return task, nil
}

func (m *mockTicksClient) GetNotes(epicID string) ([]string, error) {
	return m.notes, nil
}

func (m *mockTicksClient) AddNote(issueID, message string, extraArgs ...string) error {
	m.addedNotes = append(m.addedNotes, message)
	return nil
}

func (m *mockTicksClient) CloseTask(taskID, reason string) error {
	if m.closedTasks == nil {
		m.closedTasks = make(map[string]bool)
	}
	m.closedTasks[taskID] = true
	return nil
}

func (m *mockTicksClient) SetStatus(issueID, status string) error {
	return nil
}

// SetAwaiting updates the awaiting field of a task.
// Tracks the call for test assertions and updates internal state.
func (m *mockTicksClient) SetAwaiting(taskID, awaiting, note string) error {
	// Initialize map if nil
	if m.awaitingState == nil {
		m.awaitingState = make(map[string]string)
	}

	// Track the call for assertions
	m.setAwaitingCalls = append(m.setAwaitingCalls, setAwaitingCall{
		TaskID:   taskID,
		Awaiting: awaiting,
		Note:     note,
	})

	// Update state
	m.awaitingState[taskID] = awaiting

	// Add note if provided
	if note != "" {
		m.addedNotes = append(m.addedNotes, note)
	}

	return nil
}

// SetVerdict sets the verdict on a task and optionally adds feedback.
// Tracks the call for test assertions and can simulate verdict processing.
func (m *mockTicksClient) SetVerdict(taskID, verdict, feedback string) error {
	// Initialize maps if nil
	if m.verdictState == nil {
		m.verdictState = make(map[string]string)
	}
	if m.structuredNotes == nil {
		m.structuredNotes = make(map[string][]ticks.Note)
	}

	// Track the call for assertions
	m.setVerdictCalls = append(m.setVerdictCalls, setVerdictCall{
		TaskID:   taskID,
		Verdict:  verdict,
		Feedback: feedback,
	})

	// Update state
	m.verdictState[taskID] = verdict

	// Add feedback as human note if provided
	if feedback != "" {
		m.structuredNotes[taskID] = append(m.structuredNotes[taskID], ticks.Note{
			Content: feedback,
			Author:  "human",
		})
	}

	return nil
}

// GetHumanNotes returns only notes from humans for a task.
func (m *mockTicksClient) GetHumanNotes(taskID string) ([]ticks.Note, error) {
	if m.structuredNotes == nil {
		return nil, nil
	}

	var humanNotes []ticks.Note
	for _, n := range m.structuredNotes[taskID] {
		if n.Author == "human" {
			humanNotes = append(humanNotes, n)
		}
	}
	return humanNotes, nil
}

// AddHumanNote adds a note from a human to a task.
func (m *mockTicksClient) AddHumanNote(taskID, message string) error {
	if m.structuredNotes == nil {
		m.structuredNotes = make(map[string][]ticks.Note)
	}
	m.structuredNotes[taskID] = append(m.structuredNotes[taskID], ticks.Note{
		Content: message,
		Author:  "human",
	})
	return nil
}

func (m *mockTicksClient) HasOpenTasks(epicID string) (bool, error) {
	// Return true if there are tasks remaining
	return m.taskIndex < len(m.tasks), nil
}

func (m *mockTicksClient) GetTask(taskID string) (*ticks.Task, error) {
	for _, t := range m.tasks {
		if t.ID == taskID {
			return t, nil
		}
	}
	return nil, errors.New("task not found")
}

func (m *mockTicksClient) ListTasks(epicID string) ([]ticks.Task, error) {
	result := make([]ticks.Task, 0, len(m.tasks))
	for _, t := range m.tasks {
		result = append(result, *t)
	}
	return result, nil
}

func (m *mockTicksClient) CloseEpic(epicID, reason string) error {
	return nil
}

func (m *mockTicksClient) ReopenTask(taskID string) error {
	// Remove from closedTasks if present
	if m.closedTasks != nil {
		delete(m.closedTasks, taskID)
	}
	return nil
}

func (m *mockTicksClient) SetRunRecord(taskID string, record *agent.RunRecord) error {
	return nil
}

func TestNewEngine(t *testing.T) {
	a := &mockAgent{name: "test", available: true}
	tc := ticks.NewClient()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManager()

	e := NewEngine(a, tc, b, c)

	if e == nil {
		t.Fatal("NewEngine returned nil")
	}
	if e.agent != a {
		t.Error("agent not set correctly")
	}
	if e.prompt == nil {
		t.Error("prompt builder not initialized")
	}
}

func TestRunConfig_Defaults(t *testing.T) {
	// Test that defaults are applied in Run
	// This is implicitly tested through the engine run
}

func TestEngine_Run_NoTasks(t *testing.T) {
	// Setup mock with no tasks
	mockTicks := &mockTicksClient{
		epic: &ticks.Epic{
			ID:    "test-epic",
			Title: "Test Epic",
		},
		tasks: []*ticks.Task{}, // No tasks
	}

	mockAg := &mockAgent{name: "test", available: true}

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	// Create engine with mock ticks
	e := &Engine{
		agent:      mockAg,
		ticks:      ticks.NewClient(), // We'll override the methods
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	// Override with mock - we need a different approach since we can't swap the client
	// For now, test just the structure
	_ = e
	_ = mockTicks
}

func TestEngine_Run_SingleTask_Complete(t *testing.T) {
	// This test verifies the basic flow with mocked components
	// In a real scenario, we'd use interfaces for all dependencies

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	mockAg := &mockAgent{
		name:      "test",
		available: true,
		responses: []mockResponse{
			{
				output:    "Task completed. <promise>COMPLETE</promise>",
				tokensIn:  1000,
				tokensOut: 500,
				cost:      0.01,
			},
		},
	}

	e := &Engine{
		agent:      mockAg,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	// We can't fully test Run without a mock ticks client interface
	// but we can verify the engine is properly constructed
	if e.agent != mockAg {
		t.Error("agent not set")
	}
}

func TestEngine_Run_BudgetExceeded(t *testing.T) {
	// Create tracker that's already at limit
	b := budget.NewTracker(budget.Limits{MaxIterations: 1})
	b.AddIteration() // Now at limit

	shouldStop, reason := b.ShouldStop()
	if !shouldStop {
		t.Error("budget should indicate stop")
	}
	if reason == "" {
		t.Error("budget should provide reason")
	}
}

func TestIterationResult_Fields(t *testing.T) {
	result := &IterationResult{
		Iteration:    1,
		TaskID:       "task-1",
		TaskTitle:    "Test Task",
		Output:       "output",
		TokensIn:     100,
		TokensOut:    50,
		Cost:         0.001,
		Duration:     time.Second,
		Signal:       SignalComplete,
		SignalReason: "",
	}

	if result.Iteration != 1 {
		t.Error("Iteration not set")
	}
	if result.TaskID != "task-1" {
		t.Error("TaskID not set")
	}
	if result.Signal != SignalComplete {
		t.Error("Signal not set")
	}
}

func TestRunResult_Fields(t *testing.T) {
	result := &RunResult{
		EpicID:         "epic-1",
		Iterations:     5,
		TotalTokens:    10000,
		TotalCost:      1.50,
		Duration:       time.Minute,
		CompletedTasks: []string{"task-1", "task-2"},
		Signal:         SignalComplete,
		ExitReason:     "all tasks completed",
	}

	if result.EpicID != "epic-1" {
		t.Error("EpicID not set")
	}
	if len(result.CompletedTasks) != 2 {
		t.Error("CompletedTasks not set")
	}
}

func TestRunState_ToResult(t *testing.T) {
	state := &runState{
		epicID:         "epic-1",
		iteration:      5,
		completedTasks: []string{"task-1"},
		startTime:      time.Now().Add(-time.Minute),
		signal:         SignalComplete,
		signalReason:   "",
	}

	result := state.toResult("test reason", budget.Usage{Cost: 1.50, TokensIn: 1000, TokensOut: 500})

	if result.EpicID != "epic-1" {
		t.Errorf("EpicID = %q, want %q", result.EpicID, "epic-1")
	}
	if result.Iterations != 5 {
		t.Errorf("Iterations = %d, want %d", result.Iterations, 5)
	}
	if result.Signal != SignalComplete {
		t.Errorf("Signal = %v, want %v", result.Signal, SignalComplete)
	}
	if result.ExitReason != "test reason" {
		t.Errorf("ExitReason = %q, want %q", result.ExitReason, "test reason")
	}
	if result.Duration < time.Minute {
		t.Error("Duration should be at least 1 minute")
	}
	if result.TotalCost != 1.50 {
		t.Errorf("TotalCost = %v, want %v", result.TotalCost, 1.50)
	}
	if result.TotalTokens != 1500 {
		t.Errorf("TotalTokens = %d, want %d", result.TotalTokens, 1500)
	}
}

func TestEngine_Callbacks(t *testing.T) {
	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)
	mockAg := &mockAgent{name: "test", available: true}

	iterStartCalled := false
	iterEndCalled := false
	outputCalled := false
	signalCalled := false

	e := &Engine{
		agent:      mockAg,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
		OnIterationStart: func(ctx IterationContext) {
			iterStartCalled = true
		},
		OnIterationEnd: func(result *IterationResult) {
			iterEndCalled = true
		},
		OnOutput: func(chunk string) {
			outputCalled = true
		},
		OnSignal: func(signal Signal, reason string) {
			signalCalled = true
		},
	}

	// Verify callbacks are set
	if e.OnIterationStart == nil {
		t.Error("OnIterationStart not set")
	}
	if e.OnIterationEnd == nil {
		t.Error("OnIterationEnd not set")
	}
	if e.OnOutput == nil {
		t.Error("OnOutput not set")
	}
	if e.OnSignal == nil {
		t.Error("OnSignal not set")
	}

	// Call the callbacks directly to verify they work
	e.OnIterationStart(IterationContext{})
	e.OnIterationEnd(&IterationResult{})
	e.OnOutput("test")
	e.OnSignal(SignalComplete, "")

	if !iterStartCalled {
		t.Error("OnIterationStart was not called")
	}
	if !iterEndCalled {
		t.Error("OnIterationEnd was not called")
	}
	if !outputCalled {
		t.Error("OnOutput was not called")
	}
	if !signalCalled {
		t.Error("OnSignal was not called")
	}
}

func TestDefaultConstants(t *testing.T) {
	if DefaultMaxIterations != 50 {
		t.Errorf("DefaultMaxIterations = %d, want 50", DefaultMaxIterations)
	}
	if DefaultMaxCost != 0 {
		t.Errorf("DefaultMaxCost = %v, want 0 (disabled)", DefaultMaxCost)
	}
	if DefaultCheckpointEvery != 5 {
		t.Errorf("DefaultCheckpointEvery = %d, want 5", DefaultCheckpointEvery)
	}
	if DefaultAgentTimeout != 30*time.Minute {
		t.Errorf("DefaultAgentTimeout = %v, want 30m", DefaultAgentTimeout)
	}
}

func TestBuildTimeoutNote(t *testing.T) {
	tests := []struct {
		name          string
		iteration     int
		taskID        string
		timeout       time.Duration
		partialOutput string
		wantContains  []string
	}{
		{
			name:          "with partial output",
			iteration:     3,
			taskID:        "abc123",
			timeout:       30 * time.Minute,
			partialOutput: "Started working on the task...\nPartial progress made.",
			wantContains: []string{
				"Iteration 3",
				"timed out",
				"30m0s",
				"task abc123",
				"Partial output:",
				"Started working on the task",
			},
		},
		{
			name:          "no partial output",
			iteration:     5,
			taskID:        "xyz789",
			timeout:       10 * time.Minute,
			partialOutput: "",
			wantContains: []string{
				"Iteration 5",
				"timed out",
				"10m0s",
				"task xyz789",
				"No output captured before timeout",
			},
		},
		{
			name:          "long output truncated",
			iteration:     1,
			taskID:        "def456",
			timeout:       5 * time.Minute,
			partialOutput: string(make([]byte, 1000)), // 1000 bytes of nulls
			wantContains: []string{
				"Iteration 1",
				"task def456",
				"...", // truncation indicator
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			note := buildTimeoutNote(tt.iteration, tt.taskID, tt.timeout, tt.partialOutput)
			for _, want := range tt.wantContains {
				if !contains(note, want) {
					t.Errorf("buildTimeoutNote() = %q, want to contain %q", note, want)
				}
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && len(substr) > 0 && findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestIterationResult_IsTimeout(t *testing.T) {
	result := &IterationResult{
		Iteration: 1,
		TaskID:    "test-1",
		IsTimeout: true,
		Output:    "partial output",
	}

	if !result.IsTimeout {
		t.Error("IsTimeout should be true")
	}
	if result.Error != nil {
		t.Error("Error should be nil for timeout (timeout is not an error)")
	}
	if result.Output != "partial output" {
		t.Errorf("Output = %q, want %q", result.Output, "partial output")
	}
}

func TestEnableVerification(t *testing.T) {
	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)
	mockAg := &mockAgent{name: "test", available: true}

	e := &Engine{
		agent:      mockAg,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	// Initially disabled
	if e.verifyEnabled {
		t.Error("verifyEnabled should be false initially")
	}

	// Enable verification
	e.EnableVerification()

	if !e.verifyEnabled {
		t.Error("verifyEnabled should be true after EnableVerification()")
	}
}

func TestEngine_VerificationCallbacks(t *testing.T) {
	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)
	mockAg := &mockAgent{name: "test", available: true}

	verifyStartCalled := false
	verifyEndCalled := false
	var verifyStartTaskID string
	var verifyEndTaskID string
	var verifyEndResults *verify.Results

	e := &Engine{
		agent:      mockAg,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
		OnVerificationStart: func(taskID string) {
			verifyStartCalled = true
			verifyStartTaskID = taskID
		},
		OnVerificationEnd: func(taskID string, results *verify.Results) {
			verifyEndCalled = true
			verifyEndTaskID = taskID
			verifyEndResults = results
		},
	}

	// Verify callbacks are set
	if e.OnVerificationStart == nil {
		t.Error("OnVerificationStart not set")
	}
	if e.OnVerificationEnd == nil {
		t.Error("OnVerificationEnd not set")
	}

	// Call the callbacks directly to verify they work
	e.OnVerificationStart("task-123")
	testResults := verify.NewResults([]*verify.Result{
		{Verifier: "test", Passed: true},
	})
	e.OnVerificationEnd("task-123", testResults)

	if !verifyStartCalled {
		t.Error("OnVerificationStart was not called")
	}
	if verifyStartTaskID != "task-123" {
		t.Errorf("OnVerificationStart taskID = %q, want %q", verifyStartTaskID, "task-123")
	}
	if !verifyEndCalled {
		t.Error("OnVerificationEnd was not called")
	}
	if verifyEndTaskID != "task-123" {
		t.Errorf("OnVerificationEnd taskID = %q, want %q", verifyEndTaskID, "task-123")
	}
	if verifyEndResults == nil {
		t.Error("OnVerificationEnd results should not be nil")
	}
}

func TestBuildVerificationFailureNote(t *testing.T) {
	tests := []struct {
		name         string
		iteration    int
		taskID       string
		results      *verify.Results
		wantContains []string
	}{
		{
			name:      "single verifier failure",
			iteration: 3,
			taskID:    "abc123",
			results: verify.NewResults([]*verify.Result{
				{
					Verifier: "git",
					Passed:   false,
					Output:   "M  file1.go\nM  file2.go",
				},
			}),
			wantContains: []string{
				"Iteration 3",
				"task abc123",
				"[git]",
				"file1.go",
				"file2.go",
				"Please fix and close the task again",
			},
		},
		{
			name:      "multiple verifier failures",
			iteration: 5,
			taskID:    "def456",
			results: verify.NewResults([]*verify.Result{
				{
					Verifier: "git",
					Passed:   false,
					Output:   "M  modified.go",
				},
				{
					Verifier: "test",
					Passed:   false,
					Output:   "FAIL: TestSomething",
				},
			}),
			wantContains: []string{
				"Iteration 5",
				"task def456",
				"[git]",
				"modified.go",
				"[test]",
				"FAIL",
			},
		},
		{
			name:      "long output truncated",
			iteration: 1,
			taskID:    "xyz789",
			results: verify.NewResults([]*verify.Result{
				{
					Verifier: "git",
					Passed:   false,
					Output:   strings.Repeat("M  file.go\n", 100), // Very long output
				},
			}),
			wantContains: []string{
				"Iteration 1",
				"task xyz789",
				"[git]",
				"...", // truncation indicator
			},
		},
		{
			name:      "no output",
			iteration: 2,
			taskID:    "task1",
			results: verify.NewResults([]*verify.Result{
				{
					Verifier: "git",
					Passed:   false,
					Output:   "",
				},
			}),
			wantContains: []string{
				"Iteration 2",
				"task task1",
				"[git]",
				"Please fix",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			note := buildVerificationFailureNote(tt.iteration, tt.taskID, tt.results)
			for _, want := range tt.wantContains {
				if !strings.Contains(note, want) {
					t.Errorf("buildVerificationFailureNote() = %q, want to contain %q", note, want)
				}
			}
		})
	}
}

func TestRunConfig_SkipVerify(t *testing.T) {
	// Test that SkipVerify field exists and defaults to false
	config := RunConfig{
		EpicID: "test-epic",
	}

	if config.SkipVerify {
		t.Error("SkipVerify should default to false")
	}

	// Test that it can be set to true
	config.SkipVerify = true
	if !config.SkipVerify {
		t.Error("SkipVerify should be true after being set")
	}
}

func TestRunConfig_UseWorktree(t *testing.T) {
	// Test that UseWorktree field exists and defaults to false
	config := RunConfig{
		EpicID: "test-epic",
	}

	if config.UseWorktree {
		t.Error("UseWorktree should default to false")
	}

	// Test that it can be set to true
	config.UseWorktree = true
	if !config.UseWorktree {
		t.Error("UseWorktree should be true after being set")
	}

	// Test RepoRoot can be set
	config.RepoRoot = "/some/path"
	if config.RepoRoot != "/some/path" {
		t.Errorf("RepoRoot = %q, want %q", config.RepoRoot, "/some/path")
	}
}

func TestRunState_WorkDir(t *testing.T) {
	// Test that workDir field exists on runState
	state := &runState{
		epicID:  "test-epic",
		workDir: "/path/to/worktree",
	}

	if state.workDir != "/path/to/worktree" {
		t.Errorf("workDir = %q, want %q", state.workDir, "/path/to/worktree")
	}
}

func TestSignalToAwaiting(t *testing.T) {
	// Verify all signals are mapped to their correct awaiting states
	tests := []struct {
		signal Signal
		want   string
		inMap  bool
	}{
		{SignalEject, "work", true},
		{SignalBlocked, "input", true},
		{SignalApprovalNeeded, "approval", true},
		{SignalInputNeeded, "input", true},
		{SignalReviewRequested, "review", true},
		{SignalContentReview, "content", true},
		{SignalEscalate, "escalation", true},
		{SignalCheckpoint, "checkpoint", true},
		// These signals should NOT be in the map
		{SignalComplete, "", false},
		{SignalNone, "", false},
	}

	for _, tt := range tests {
		t.Run(tt.signal.String(), func(t *testing.T) {
			awaiting, ok := signalToAwaiting[tt.signal]
			if ok != tt.inMap {
				if tt.inMap {
					t.Errorf("signal %v should be in signalToAwaiting map", tt.signal)
				} else {
					t.Errorf("signal %v should NOT be in signalToAwaiting map", tt.signal)
				}
			}
			if tt.inMap && awaiting != tt.want {
				t.Errorf("signalToAwaiting[%v] = %q, want %q", tt.signal, awaiting, tt.want)
			}
		})
	}
}

func TestSignalToAwaitingMap_Completeness(t *testing.T) {
	// Ensure the map has exactly 8 entries for all handoff signals
	expected := map[Signal]string{
		SignalEject:           "work",
		SignalBlocked:         "input",
		SignalApprovalNeeded:  "approval",
		SignalInputNeeded:     "input",
		SignalReviewRequested: "review",
		SignalContentReview:   "content",
		SignalEscalate:        "escalation",
		SignalCheckpoint:      "checkpoint",
	}

	if len(signalToAwaiting) != len(expected) {
		t.Errorf("signalToAwaiting has %d entries, want %d", len(signalToAwaiting), len(expected))
	}

	for signal, want := range expected {
		got, ok := signalToAwaiting[signal]
		if !ok {
			t.Errorf("signalToAwaiting missing %v", signal)
			continue
		}
		if got != want {
			t.Errorf("signalToAwaiting[%v] = %q, want %q", signal, got, want)
		}
	}
}

func TestSignalToAwaitingMap_ExcludesNonHandoff(t *testing.T) {
	// SignalComplete and SignalNone should NOT be in the map
	// as they have special handling
	if _, ok := signalToAwaiting[SignalComplete]; ok {
		t.Error("SignalComplete should not be in signalToAwaiting")
	}
	if _, ok := signalToAwaiting[SignalNone]; ok {
		t.Error("SignalNone should not be in signalToAwaiting")
	}
}

func TestHandleSignal_RequiresFieldLogic(t *testing.T) {
	// Test the logic around requires field checking
	// This tests the condition: task.Requires != nil && *task.Requires != ""

	t.Run("nil Requires means no gate", func(t *testing.T) {
		task := &ticks.Task{ID: "task-1", Requires: nil}
		// When Requires is nil, COMPLETE should close the task directly
		// We can't call handleSignal without a real ticks client, but
		// we can verify the condition logic
		hasGate := task.Requires != nil && *task.Requires != ""
		if hasGate {
			t.Error("nil Requires should not trigger gate")
		}
	})

	t.Run("empty string Requires means no gate", func(t *testing.T) {
		emptyStr := ""
		task := &ticks.Task{ID: "task-1", Requires: &emptyStr}
		hasGate := task.Requires != nil && *task.Requires != ""
		if hasGate {
			t.Error("empty string Requires should not trigger gate")
		}
	})

	t.Run("non-empty Requires means has gate", func(t *testing.T) {
		approval := "approval"
		task := &ticks.Task{ID: "task-1", Requires: &approval}
		hasGate := task.Requires != nil && *task.Requires != ""
		if !hasGate {
			t.Error("non-empty Requires should trigger gate")
		}
	})
}

func TestHandoffSignals_ContinueToNextTask(t *testing.T) {
	// Verify that all handoff signals are in the signalToAwaiting map
	// which means they will trigger the "continue to next task" behavior
	handoffSignals := []Signal{
		SignalEject,
		SignalBlocked,
		SignalApprovalNeeded,
		SignalInputNeeded,
		SignalReviewRequested,
		SignalContentReview,
		SignalEscalate,
		SignalCheckpoint,
	}

	for _, signal := range handoffSignals {
		t.Run(signal.String(), func(t *testing.T) {
			// Handoff signals should be in signalToAwaiting map
			awaiting, ok := signalToAwaiting[signal]
			if !ok {
				t.Errorf("signal %v should be in signalToAwaiting map (triggers continue behavior)", signal)
			}
			if awaiting == "" {
				t.Errorf("signal %v has empty awaiting state", signal)
			}
		})
	}
}

func TestNonHandoffSignals_SpecialHandling(t *testing.T) {
	// Verify that COMPLETE and NONE are NOT in the signalToAwaiting map
	// because they have special handling (COMPLETE is ignored, NONE is no-op)
	nonHandoffSignals := []Signal{
		SignalComplete,
		SignalNone,
	}

	for _, signal := range nonHandoffSignals {
		t.Run(signal.String(), func(t *testing.T) {
			if _, ok := signalToAwaiting[signal]; ok {
				t.Errorf("signal %v should NOT be in signalToAwaiting map", signal)
			}
		})
	}
}

func TestShouldCleanupWorktree(t *testing.T) {
	// Test the logic for determining when to cleanup worktrees
	tests := []struct {
		name          string
		exitReason    string
		expectCleanup bool
	}{
		{
			name:          "all tasks completed - cleanup",
			exitReason:    "all tasks completed",
			expectCleanup: true,
		},
		{
			name:          "no tasks found - cleanup",
			exitReason:    "no tasks found",
			expectCleanup: true,
		},
		{
			name:          "tasks blocked/awaiting - preserve",
			exitReason:    "no ready tasks (remaining tasks are blocked or awaiting human)",
			expectCleanup: false,
		},
		{
			name:          "context cancelled - preserve",
			exitReason:    "context cancelled",
			expectCleanup: false,
		},
		{
			name:          "context cancelled while paused - preserve",
			exitReason:    "context cancelled while paused",
			expectCleanup: false,
		},
		{
			name:          "stuck on task - preserve for debugging",
			exitReason:    "stuck on task xyz after 3 iterations - may need manual review",
			expectCleanup: false,
		},
		{
			name:          "iteration limit - preserve for resume",
			exitReason:    "iteration limit reached (10/10)",
			expectCleanup: false,
		},
		{
			name:          "cost limit - preserve for resume",
			exitReason:    "cost limit reached ($5.00/$5.00)",
			expectCleanup: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ShouldCleanupWorktree(tt.exitReason)
			if result != tt.expectCleanup {
				t.Errorf("ShouldCleanupWorktree(%q) = %v, want %v", tt.exitReason, result, tt.expectCleanup)
			}
		})
	}
}

func TestWorktreePreservationExitReasons(t *testing.T) {
	// Verify the constants match expected patterns
	reasons := []string{
		ExitReasonAllTasksCompleted,
		ExitReasonNoTasksFound,
		ExitReasonTasksAwaitingHuman,
	}

	// Ensure reasons are not empty
	for _, r := range reasons {
		if r == "" {
			t.Error("Exit reason constant should not be empty")
		}
	}

	// Verify the specific values
	if ExitReasonAllTasksCompleted != "all tasks completed" {
		t.Errorf("ExitReasonAllTasksCompleted = %q, want %q", ExitReasonAllTasksCompleted, "all tasks completed")
	}
	if ExitReasonNoTasksFound != "no tasks found" {
		t.Errorf("ExitReasonNoTasksFound = %q, want %q", ExitReasonNoTasksFound, "no tasks found")
	}
	if ExitReasonTasksAwaitingHuman != "no ready tasks (remaining tasks are blocked or awaiting human)" {
		t.Errorf("ExitReasonTasksAwaitingHuman = %q, want %q", ExitReasonTasksAwaitingHuman, "no ready tasks (remaining tasks are blocked or awaiting human)")
	}
}

func TestSignalHandlingLogic(t *testing.T) {
	// Test the logic flow for signal handling in the main loop
	// This verifies that:
	// 1. SignalNone -> no action (if block not entered)
	// 2. SignalComplete -> ignored, continues
	// 3. Handoff signals -> handleSignal called, continue to next task

	tests := []struct {
		name                string
		signal              Signal
		expectHandleSignal  bool // Should handleSignal be called?
		expectContinue      bool // Should continue to next task?
		expectIgnoreWarning bool // Should emit warning for COMPLETE?
	}{
		{
			name:               "SignalNone - no action",
			signal:             SignalNone,
			expectHandleSignal: false,
			expectContinue:     false,
		},
		{
			name:                "SignalComplete - ignored with warning",
			signal:              SignalComplete,
			expectHandleSignal:  false,
			expectContinue:      false, // No explicit continue, just falls through
			expectIgnoreWarning: true,
		},
		{
			name:               "SignalEject - handoff signal",
			signal:             SignalEject,
			expectHandleSignal: true,
			expectContinue:     true,
		},
		{
			name:               "SignalBlocked - handoff signal",
			signal:             SignalBlocked,
			expectHandleSignal: true,
			expectContinue:     true,
		},
		{
			name:               "SignalApprovalNeeded - handoff signal",
			signal:             SignalApprovalNeeded,
			expectHandleSignal: true,
			expectContinue:     true,
		},
		{
			name:               "SignalInputNeeded - handoff signal",
			signal:             SignalInputNeeded,
			expectHandleSignal: true,
			expectContinue:     true,
		},
		{
			name:               "SignalReviewRequested - handoff signal",
			signal:             SignalReviewRequested,
			expectHandleSignal: true,
			expectContinue:     true,
		},
		{
			name:               "SignalContentReview - handoff signal",
			signal:             SignalContentReview,
			expectHandleSignal: true,
			expectContinue:     true,
		},
		{
			name:               "SignalEscalate - handoff signal",
			signal:             SignalEscalate,
			expectHandleSignal: true,
			expectContinue:     true,
		},
		{
			name:               "SignalCheckpoint - handoff signal",
			signal:             SignalCheckpoint,
			expectHandleSignal: true,
			expectContinue:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test the logic conditions used in the main loop

			// Condition 1: Is signal != SignalNone (enters the if block)?
			entersIfBlock := tt.signal != SignalNone

			// Condition 2: Is signal == SignalComplete (special case)?
			isComplete := tt.signal == SignalComplete

			// Condition 3: Is signal a handoff signal (in signalToAwaiting)?
			_, isHandoffSignal := signalToAwaiting[tt.signal]

			// Verify expectations
			if tt.signal == SignalNone {
				if entersIfBlock {
					t.Error("SignalNone should not enter the signal handling block")
				}
			} else if tt.signal == SignalComplete {
				if !entersIfBlock {
					t.Error("SignalComplete should enter the signal handling block")
				}
				if !isComplete {
					t.Error("SignalComplete should trigger the complete special case")
				}
				if isHandoffSignal {
					t.Error("SignalComplete should not be a handoff signal")
				}
			} else {
				// Handoff signals
				if !entersIfBlock {
					t.Errorf("%v should enter the signal handling block", tt.signal)
				}
				if isComplete {
					t.Errorf("%v should not trigger the complete special case", tt.signal)
				}
				if tt.expectHandleSignal && !isHandoffSignal {
					t.Errorf("%v should be a handoff signal (in signalToAwaiting map)", tt.signal)
				}
			}

			// Verify handleSignal expectation matches map membership
			if tt.expectHandleSignal != isHandoffSignal {
				t.Errorf("expectHandleSignal=%v but isHandoffSignal=%v", tt.expectHandleSignal, isHandoffSignal)
			}
		})
	}
}

// Tests for mockTicksClient awaiting/verdict workflow

func TestMockTicksClient_SetAwaiting(t *testing.T) {
	mock := newMockTicksClient()

	// Test SetAwaiting
	err := mock.SetAwaiting("task-1", "approval", "Work complete, needs approval")
	if err != nil {
		t.Fatalf("SetAwaiting failed: %v", err)
	}

	// Verify state was updated
	if mock.GetAwaiting("task-1") != "approval" {
		t.Errorf("awaiting state = %q, want %q", mock.GetAwaiting("task-1"), "approval")
	}

	// Verify call was tracked
	if len(mock.setAwaitingCalls) != 1 {
		t.Fatalf("expected 1 setAwaitingCall, got %d", len(mock.setAwaitingCalls))
	}
	call := mock.setAwaitingCalls[0]
	if call.TaskID != "task-1" || call.Awaiting != "approval" || call.Note != "Work complete, needs approval" {
		t.Errorf("setAwaitingCall = %+v, want TaskID=task-1, Awaiting=approval, Note=Work complete...", call)
	}

	// Verify note was added
	if len(mock.addedNotes) != 1 || mock.addedNotes[0] != "Work complete, needs approval" {
		t.Errorf("addedNotes = %v, want [Work complete, needs approval]", mock.addedNotes)
	}
}

func TestMockTicksClient_SetVerdict(t *testing.T) {
	mock := newMockTicksClient()

	// Test SetVerdict with feedback
	err := mock.SetVerdict("task-1", "rejected", "Please add more tests")
	if err != nil {
		t.Fatalf("SetVerdict failed: %v", err)
	}

	// Verify state was updated
	if mock.GetVerdict("task-1") != "rejected" {
		t.Errorf("verdict state = %q, want %q", mock.GetVerdict("task-1"), "rejected")
	}

	// Verify call was tracked
	if len(mock.setVerdictCalls) != 1 {
		t.Fatalf("expected 1 setVerdictCall, got %d", len(mock.setVerdictCalls))
	}
	call := mock.setVerdictCalls[0]
	if call.TaskID != "task-1" || call.Verdict != "rejected" || call.Feedback != "Please add more tests" {
		t.Errorf("setVerdictCall = %+v, want TaskID=task-1, Verdict=rejected, Feedback=Please add more tests", call)
	}

	// Verify feedback was added as human note
	notes, err := mock.GetHumanNotes("task-1")
	if err != nil {
		t.Fatalf("GetHumanNotes failed: %v", err)
	}
	if len(notes) != 1 || notes[0].Content != "Please add more tests" || notes[0].Author != "human" {
		t.Errorf("humanNotes = %v, want [{Content:Please add more tests Author:human}]", notes)
	}
}

func TestMockTicksClient_GetHumanNotes(t *testing.T) {
	mock := newMockTicksClient()

	// Add a mix of human and agent notes
	mock.AddHumanNote("task-1", "Human feedback 1")
	mock.AddHumanNote("task-1", "Human feedback 2")

	// Also add an agent note via addedNotes (simulating AddNote)
	mock.structuredNotes["task-1"] = append(mock.structuredNotes["task-1"], ticks.Note{
		Content: "Agent progress note",
		Author:  "agent",
	})

	// Get human notes only
	notes, err := mock.GetHumanNotes("task-1")
	if err != nil {
		t.Fatalf("GetHumanNotes failed: %v", err)
	}

	if len(notes) != 2 {
		t.Fatalf("expected 2 human notes, got %d", len(notes))
	}

	for i, note := range notes {
		if note.Author != "human" {
			t.Errorf("note[%d].Author = %q, want %q", i, note.Author, "human")
		}
	}
}

func TestMockTicksClient_SimulateVerdictProcessing(t *testing.T) {
	tests := []struct {
		name       string
		awaiting   string
		verdict    string
		wantClosed bool
	}{
		{
			name:       "approval approved - closes",
			awaiting:   "approval",
			verdict:    "approved",
			wantClosed: true,
		},
		{
			name:       "approval rejected - stays open",
			awaiting:   "approval",
			verdict:    "rejected",
			wantClosed: false,
		},
		{
			name:       "review approved - closes",
			awaiting:   "review",
			verdict:    "approved",
			wantClosed: true,
		},
		{
			name:       "content approved - closes",
			awaiting:   "content",
			verdict:    "approved",
			wantClosed: true,
		},
		{
			name:       "work approved - closes (human did it)",
			awaiting:   "work",
			verdict:    "approved",
			wantClosed: true,
		},
		{
			name:       "work rejected - stays open (back to agent)",
			awaiting:   "work",
			verdict:    "rejected",
			wantClosed: false,
		},
		{
			name:       "input approved - stays open (answer provided)",
			awaiting:   "input",
			verdict:    "approved",
			wantClosed: false,
		},
		{
			name:       "input rejected - closes (can't proceed)",
			awaiting:   "input",
			verdict:    "rejected",
			wantClosed: true,
		},
		{
			name:       "escalation approved - stays open (direction given)",
			awaiting:   "escalation",
			verdict:    "approved",
			wantClosed: false,
		},
		{
			name:       "escalation rejected - closes (won't do)",
			awaiting:   "escalation",
			verdict:    "rejected",
			wantClosed: true,
		},
		{
			name:       "checkpoint approved - stays open (always back to agent)",
			awaiting:   "checkpoint",
			verdict:    "approved",
			wantClosed: false,
		},
		{
			name:       "checkpoint rejected - stays open (always back to agent)",
			awaiting:   "checkpoint",
			verdict:    "rejected",
			wantClosed: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := newMockTicksClient()

			// Set up awaiting and verdict state
			mock.SetAwaiting("task-1", tt.awaiting, "test note")
			mock.SetVerdict("task-1", tt.verdict, "")

			// Process the verdict
			mock.SimulateVerdictProcessing("task-1")

			// Check if task was closed
			wasClosed := mock.closedTasks["task-1"]

			if wasClosed != tt.wantClosed {
				t.Errorf("task closed = %v, want %v", wasClosed, tt.wantClosed)
			}

			// Verify transient fields were cleared
			if mock.GetAwaiting("task-1") != "" {
				t.Error("awaiting should be cleared after verdict processing")
			}
			if mock.GetVerdict("task-1") != "" {
				t.Error("verdict should be cleared after verdict processing")
			}
		})
	}
}

func TestMockTicksClient_ClearAwaiting(t *testing.T) {
	mock := newMockTicksClient()

	// Set awaiting
	mock.SetAwaiting("task-1", "review", "needs review")
	if mock.GetAwaiting("task-1") != "review" {
		t.Fatal("awaiting should be set")
	}

	// Clear it
	err := mock.ClearAwaiting("task-1")
	if err != nil {
		t.Fatalf("ClearAwaiting failed: %v", err)
	}

	// Verify cleared
	if mock.GetAwaiting("task-1") != "" {
		t.Errorf("awaiting = %q, want empty after ClearAwaiting", mock.GetAwaiting("task-1"))
	}
}

func TestMockTicksClient_StateTracking(t *testing.T) {
	mock := newMockTicksClient()

	// Perform multiple operations
	mock.SetAwaiting("task-1", "approval", "note1")
	mock.SetAwaiting("task-2", "review", "note2")
	mock.SetVerdict("task-1", "approved", "looks good")
	mock.SetVerdict("task-2", "rejected", "needs changes")

	// Verify all calls were tracked
	if len(mock.setAwaitingCalls) != 2 {
		t.Errorf("expected 2 setAwaitingCalls, got %d", len(mock.setAwaitingCalls))
	}
	if len(mock.setVerdictCalls) != 2 {
		t.Errorf("expected 2 setVerdictCalls, got %d", len(mock.setVerdictCalls))
	}

	// Verify specific calls
	if mock.setAwaitingCalls[0].TaskID != "task-1" {
		t.Error("first setAwaitingCall should be task-1")
	}
	if mock.setVerdictCalls[1].Feedback != "needs changes" {
		t.Error("second setVerdictCall feedback should be 'needs changes'")
	}
}

// TestEngine_HandleSignal tests the handleSignal function with all signal types
// and verifies correct awaiting state and task closure behavior.
func TestEngine_HandleSignal(t *testing.T) {
	tests := []struct {
		name         string
		signal       Signal
		taskRequires string // task.Requires value (empty means nil)
		context      string
		wantAwaiting string
		wantClosed   bool
	}{
		// COMPLETE signal without requires - should close task
		{
			name:         "complete_no_requires",
			signal:       SignalComplete,
			taskRequires: "",
			context:      "task done",
			wantAwaiting: "",
			wantClosed:   true,
		},
		// COMPLETE signal with approval gate - should set awaiting, not close
		{
			name:         "complete_with_approval",
			signal:       SignalComplete,
			taskRequires: "approval",
			context:      "task done",
			wantAwaiting: "approval",
			wantClosed:   false,
		},
		// COMPLETE signal with review gate - should set awaiting, not close
		{
			name:         "complete_with_review",
			signal:       SignalComplete,
			taskRequires: "review",
			context:      "task done",
			wantAwaiting: "review",
			wantClosed:   false,
		},
		// COMPLETE signal with content gate
		{
			name:         "complete_with_content",
			signal:       SignalComplete,
			taskRequires: "content",
			context:      "task done",
			wantAwaiting: "content",
			wantClosed:   false,
		},
		// EJECT signal - maps to "work" awaiting
		{
			name:         "eject",
			signal:       SignalEject,
			taskRequires: "",
			context:      "needs npm install",
			wantAwaiting: "work",
			wantClosed:   false,
		},
		// BLOCKED signal - maps to "input" awaiting (legacy)
		{
			name:         "blocked",
			signal:       SignalBlocked,
			taskRequires: "",
			context:      "missing credentials",
			wantAwaiting: "input",
			wantClosed:   false,
		},
		// APPROVAL_NEEDED signal
		{
			name:         "approval_needed",
			signal:       SignalApprovalNeeded,
			taskRequires: "",
			context:      "implementation complete, needs sign-off",
			wantAwaiting: "approval",
			wantClosed:   false,
		},
		// INPUT_NEEDED signal
		{
			name:         "input_needed",
			signal:       SignalInputNeeded,
			taskRequires: "",
			context:      "which database should I use?",
			wantAwaiting: "input",
			wantClosed:   false,
		},
		// REVIEW_REQUESTED signal
		{
			name:         "review_requested",
			signal:       SignalReviewRequested,
			taskRequires: "",
			context:      "https://github.com/org/repo/pull/123",
			wantAwaiting: "review",
			wantClosed:   false,
		},
		// CONTENT_REVIEW signal
		{
			name:         "content_review",
			signal:       SignalContentReview,
			taskRequires: "",
			context:      "please review the error messages",
			wantAwaiting: "content",
			wantClosed:   false,
		},
		// ESCALATE signal
		{
			name:         "escalate",
			signal:       SignalEscalate,
			taskRequires: "",
			context:      "found security vulnerability",
			wantAwaiting: "escalation",
			wantClosed:   false,
		},
		// CHECKPOINT signal
		{
			name:         "checkpoint",
			signal:       SignalCheckpoint,
			taskRequires: "",
			context:      "phase 1 complete",
			wantAwaiting: "checkpoint",
			wantClosed:   false,
		},
		// SignalNone - no-op
		{
			name:         "signal_none",
			signal:       SignalNone,
			taskRequires: "",
			context:      "",
			wantAwaiting: "",
			wantClosed:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := newMockTicksClient()

			// Create engine with mock client
			engine := NewEngine(nil, mock, nil, nil)

			// Build task with optional Requires field
			task := &ticks.Task{ID: "test-task"}
			if tt.taskRequires != "" {
				requires := tt.taskRequires
				task.Requires = &requires
			}

			// Call handleSignal
			err := engine.handleSignal(task, tt.signal, tt.context)

			// Verify no error
			if err != nil {
				t.Fatalf("handleSignal returned error: %v", err)
			}

			// Verify awaiting state
			gotAwaiting := mock.GetAwaiting("test-task")
			if gotAwaiting != tt.wantAwaiting {
				t.Errorf("awaiting = %q, want %q", gotAwaiting, tt.wantAwaiting)
			}

			// Verify task closed state
			gotClosed := mock.closedTasks["test-task"]
			if gotClosed != tt.wantClosed {
				t.Errorf("closed = %v, want %v", gotClosed, tt.wantClosed)
			}
		})
	}
}

// TestEngine_HandleSignal_ContextPassedToSetAwaiting verifies that the context
// is correctly passed to SetAwaiting for handoff signals.
func TestEngine_HandleSignal_ContextPassedToSetAwaiting(t *testing.T) {
	tests := []struct {
		name    string
		signal  Signal
		context string
	}{
		{"eject_with_context", SignalEject, "needs manual npm install"},
		{"approval_needed_with_context", SignalApprovalNeeded, "API design needs human review"},
		{"input_needed_with_context", SignalInputNeeded, "Which database: postgres or mysql?"},
		{"review_requested_with_url", SignalReviewRequested, "https://github.com/org/repo/pull/456"},
		{"content_review_with_context", SignalContentReview, "Please check error message wording"},
		{"escalate_with_context", SignalEscalate, "Found potential SQL injection"},
		{"checkpoint_with_context", SignalCheckpoint, "Phase 1: database schema complete"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := newMockTicksClient()
			engine := NewEngine(nil, mock, nil, nil)
			task := &ticks.Task{ID: "ctx-task"}

			err := engine.handleSignal(task, tt.signal, tt.context)
			if err != nil {
				t.Fatalf("handleSignal returned error: %v", err)
			}

			// Verify the context was passed in the SetAwaiting call
			if len(mock.setAwaitingCalls) != 1 {
				t.Fatalf("expected 1 SetAwaiting call, got %d", len(mock.setAwaitingCalls))
			}

			call := mock.setAwaitingCalls[0]
			if call.TaskID != "ctx-task" {
				t.Errorf("SetAwaiting taskID = %q, want %q", call.TaskID, "ctx-task")
			}
			if call.Note != tt.context {
				t.Errorf("SetAwaiting note = %q, want %q", call.Note, tt.context)
			}
		})
	}
}

// TestEngine_HandleSignal_CompleteWithRequiresUsesCorrectNote verifies that
// when COMPLETE signal is emitted with a requires gate, the note includes
// the requires type.
func TestEngine_HandleSignal_CompleteWithRequiresUsesCorrectNote(t *testing.T) {
	tests := []struct {
		requires string
		wantNote string
	}{
		{"approval", "Work complete, requires approval"},
		{"review", "Work complete, requires review"},
		{"content", "Work complete, requires content"},
	}

	for _, tt := range tests {
		t.Run(tt.requires, func(t *testing.T) {
			mock := newMockTicksClient()
			engine := NewEngine(nil, mock, nil, nil)

			requires := tt.requires
			task := &ticks.Task{ID: "gate-task", Requires: &requires}

			err := engine.handleSignal(task, SignalComplete, "ignored context")
			if err != nil {
				t.Fatalf("handleSignal returned error: %v", err)
			}

			// Verify SetAwaiting was called with correct note
			if len(mock.setAwaitingCalls) != 1 {
				t.Fatalf("expected 1 SetAwaiting call, got %d", len(mock.setAwaitingCalls))
			}

			call := mock.setAwaitingCalls[0]
			if call.Note != tt.wantNote {
				t.Errorf("SetAwaiting note = %q, want %q", call.Note, tt.wantNote)
			}
			if call.Awaiting != tt.requires {
				t.Errorf("SetAwaiting awaiting = %q, want %q", call.Awaiting, tt.requires)
			}
		})
	}
}

// TestEngine_HandleSignal_AllSignalToAwaitingMappings verifies that all entries
// in signalToAwaiting map are correctly handled by handleSignal.
func TestEngine_HandleSignal_AllSignalToAwaitingMappings(t *testing.T) {
	for signal, expectedAwaiting := range signalToAwaiting {
		t.Run(signal.String(), func(t *testing.T) {
			mock := newMockTicksClient()
			engine := NewEngine(nil, mock, nil, nil)
			task := &ticks.Task{ID: "map-test"}

			err := engine.handleSignal(task, signal, "test context")
			if err != nil {
				t.Fatalf("handleSignal returned error: %v", err)
			}

			gotAwaiting := mock.GetAwaiting("map-test")
			if gotAwaiting != expectedAwaiting {
				t.Errorf("handleSignal(%v) set awaiting = %q, want %q", signal, gotAwaiting, expectedAwaiting)
			}

			// Should NOT close task for handoff signals
			if mock.closedTasks["map-test"] {
				t.Errorf("handleSignal(%v) should not close task", signal)
			}
		})
	}
}

// TestEngine_HandleSignal_UnknownSignalIsNoOp verifies that unknown signals
// are gracefully ignored (return nil, no state changes).
func TestEngine_HandleSignal_UnknownSignalIsNoOp(t *testing.T) {
	mock := newMockTicksClient()
	engine := NewEngine(nil, mock, nil, nil)
	task := &ticks.Task{ID: "unknown-test"}

	// Signal(999) is an unknown signal value
	unknownSignal := Signal(999)

	err := engine.handleSignal(task, unknownSignal, "should be ignored")
	if err != nil {
		t.Fatalf("handleSignal should not return error for unknown signal: %v", err)
	}

	// No awaiting state should be set
	if mock.GetAwaiting("unknown-test") != "" {
		t.Error("unknown signal should not set awaiting state")
	}

	// No SetAwaiting calls
	if len(mock.setAwaitingCalls) != 0 {
		t.Errorf("expected 0 SetAwaiting calls, got %d", len(mock.setAwaitingCalls))
	}

	// Task should not be closed
	if mock.closedTasks["unknown-test"] {
		t.Error("unknown signal should not close task")
	}
}

// =============================================================================
// Watch Mode Tests
// =============================================================================

func TestDefaultWatchPollInterval(t *testing.T) {
	// Verify the default poll interval is 10 seconds
	if DefaultWatchPollInterval != 10*time.Second {
		t.Errorf("DefaultWatchPollInterval = %v, want 10s", DefaultWatchPollInterval)
	}
}

func TestExitReasonWatchTimeout(t *testing.T) {
	// Verify the watch timeout exit reason constant
	if ExitReasonWatchTimeout != "watch timeout" {
		t.Errorf("ExitReasonWatchTimeout = %q, want %q", ExitReasonWatchTimeout, "watch timeout")
	}
}

func TestRunConfig_WatchFields(t *testing.T) {
	// Test that watch fields exist and can be set
	config := RunConfig{
		EpicID:            "test-epic",
		Watch:             true,
		WatchTimeout:      time.Hour,
		WatchPollInterval: 5 * time.Second,
	}

	if !config.Watch {
		t.Error("Watch should be true")
	}
	if config.WatchTimeout != time.Hour {
		t.Errorf("WatchTimeout = %v, want 1h", config.WatchTimeout)
	}
	if config.WatchPollInterval != 5*time.Second {
		t.Errorf("WatchPollInterval = %v, want 5s", config.WatchPollInterval)
	}
}

func TestRunConfig_WatchDefaults(t *testing.T) {
	// Test that watch fields default to zero values
	config := RunConfig{
		EpicID: "test-epic",
	}

	if config.Watch {
		t.Error("Watch should default to false")
	}
	if config.WatchTimeout != 0 {
		t.Errorf("WatchTimeout should default to 0, got %v", config.WatchTimeout)
	}
	if config.WatchPollInterval != 0 {
		t.Errorf("WatchPollInterval should default to 0, got %v", config.WatchPollInterval)
	}
}

func TestEngine_OnIdleCallback(t *testing.T) {
	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)
	mockAg := &mockAgent{name: "test", available: true}

	idleCalled := false
	idleCallCount := 0

	e := &Engine{
		agent:      mockAg,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
		OnIdle: func() {
			idleCalled = true
			idleCallCount++
		},
	}

	// Verify callback is set
	if e.OnIdle == nil {
		t.Error("OnIdle not set")
	}

	// Call the callback directly to verify it works
	e.OnIdle()

	if !idleCalled {
		t.Error("OnIdle was not called")
	}
	if idleCallCount != 1 {
		t.Errorf("OnIdle call count = %d, want 1", idleCallCount)
	}

	// Call again to verify counter increments
	e.OnIdle()
	if idleCallCount != 2 {
		t.Errorf("OnIdle call count = %d, want 2", idleCallCount)
	}
}

func TestShouldCleanupWorktree_WatchTimeout(t *testing.T) {
	// Watch timeout should NOT trigger cleanup (preserve worktree for resume)
	if ShouldCleanupWorktree(ExitReasonWatchTimeout) {
		t.Error("ShouldCleanupWorktree(ExitReasonWatchTimeout) should return false")
	}
}

// mockTicksClientForWatch extends mockTicksClient to support watch mode testing.
// It can be configured to return tasks dynamically based on call count.
type mockTicksClientForWatch struct {
	*mockTicksClient
	nextTaskCalls  int
	tasksAvailable []bool // true at index i means task available on i-th NextTask call
	hasOpenReturns []bool // return values for HasOpenTasks calls
	hasOpenCalls   int
}

func newMockTicksClientForWatch() *mockTicksClientForWatch {
	return &mockTicksClientForWatch{
		mockTicksClient: newMockTicksClient(),
		tasksAvailable:  []bool{},
		hasOpenReturns:  []bool{},
	}
}

func (m *mockTicksClientForWatch) NextTask(epicID string) (*ticks.Task, error) {
	idx := m.nextTaskCalls
	m.nextTaskCalls++

	// If we have a configured return for this call, use it
	if idx < len(m.tasksAvailable) && m.tasksAvailable[idx] {
		return &ticks.Task{ID: "task-" + string(rune('a'+idx)), Title: "Test Task"}, nil
	}
	return nil, nil
}

func (m *mockTicksClientForWatch) HasOpenTasks(epicID string) (bool, error) {
	idx := m.hasOpenCalls
	m.hasOpenCalls++

	// If we have a configured return for this call, use it
	if idx < len(m.hasOpenReturns) {
		return m.hasOpenReturns[idx], nil
	}
	// Default: return true (tasks are open but blocked)
	return true, nil
}

func TestHandleWatchIdle_CallsOnIdle(t *testing.T) {
	mock := newMockTicksClientForWatch()
	mock.epic = &ticks.Epic{ID: "test-epic", Title: "Test Epic", Type: "epic"}
	// Configure: first poll returns no task, second poll returns a task
	mock.tasksAvailable = []bool{false, true}
	mock.hasOpenReturns = []bool{true, true}

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	idleCallCount := 0
	engine := &Engine{
		ticks:      mock,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
		OnIdle: func() {
			idleCallCount++
		},
	}

	state := &runState{
		epicID:    "test-epic",
		startTime: time.Now(),
	}
	config := RunConfig{
		EpicID:            "test-epic",
		Watch:             true,
		WatchPollInterval: 10 * time.Millisecond, // Fast for testing
	}

	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	// handleWatchIdle should call OnIdle at least once and then return nil when tasks become available
	result := engine.handleWatchIdle(ctx, config, state, time.Time{})

	if result != nil {
		t.Errorf("handleWatchIdle returned result %+v, want nil (tasks became available)", result)
	}
	if idleCallCount < 1 {
		t.Errorf("OnIdle called %d times, want at least 1", idleCallCount)
	}
}

func TestHandleWatchIdle_WatchTimeout(t *testing.T) {
	mock := newMockTicksClientForWatch()
	mock.epic = &ticks.Epic{ID: "test-epic", Title: "Test Epic", Type: "epic"}
	// Never return a task
	mock.tasksAvailable = []bool{false, false, false, false, false}
	mock.hasOpenReturns = []bool{true, true, true, true, true}

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := &Engine{
		ticks:      mock,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
		OnIdle:     func() {},
	}

	state := &runState{
		epicID:    "test-epic",
		startTime: time.Now(),
	}
	config := RunConfig{
		EpicID:            "test-epic",
		Watch:             true,
		WatchPollInterval: 10 * time.Millisecond, // Fast for testing
	}

	// Set a deadline that will expire quickly
	watchDeadline := time.Now().Add(50 * time.Millisecond)

	ctx := context.Background()
	result := engine.handleWatchIdle(ctx, config, state, watchDeadline)

	if result == nil {
		t.Fatal("handleWatchIdle should return result on timeout")
	}
	if result.ExitReason != ExitReasonWatchTimeout {
		t.Errorf("ExitReason = %q, want %q", result.ExitReason, ExitReasonWatchTimeout)
	}
}

func TestHandleWatchIdle_ContextCancelled(t *testing.T) {
	mock := newMockTicksClientForWatch()
	mock.epic = &ticks.Epic{ID: "test-epic", Title: "Test Epic", Type: "epic"}
	// Never return a task
	mock.tasksAvailable = []bool{false, false, false, false, false}
	mock.hasOpenReturns = []bool{true, true, true, true, true}

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := &Engine{
		ticks:      mock,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
		OnIdle:     func() {},
	}

	state := &runState{
		epicID:    "test-epic",
		startTime: time.Now(),
	}
	config := RunConfig{
		EpicID:            "test-epic",
		Watch:             true,
		WatchPollInterval: 100 * time.Millisecond,
	}

	// Create a context that will be cancelled
	ctx, cancel := context.WithCancel(context.Background())

	// Cancel after a short delay
	go func() {
		time.Sleep(30 * time.Millisecond)
		cancel()
	}()

	result := engine.handleWatchIdle(ctx, config, state, time.Time{})

	if result == nil {
		t.Fatal("handleWatchIdle should return result on context cancellation")
	}
	if !strings.Contains(result.ExitReason, "cancelled") {
		t.Errorf("ExitReason = %q, want to contain 'cancelled'", result.ExitReason)
	}
}

func TestHandleWatchIdle_EpicCompletes(t *testing.T) {
	mock := newMockTicksClientForWatch()
	mock.epic = &ticks.Epic{ID: "test-epic", Title: "Test Epic", Type: "epic"}
	// Task not available, but epic completes (no open tasks)
	mock.tasksAvailable = []bool{false, false}
	mock.hasOpenReturns = []bool{true, false} // Second call: no open tasks

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := &Engine{
		ticks:      mock,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
		OnIdle:     func() {},
	}

	state := &runState{
		epicID:    "test-epic",
		startTime: time.Now(),
	}
	config := RunConfig{
		EpicID:            "test-epic",
		Watch:             true,
		WatchPollInterval: 10 * time.Millisecond,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	result := engine.handleWatchIdle(ctx, config, state, time.Time{})

	if result == nil {
		t.Fatal("handleWatchIdle should return result when epic completes")
	}
	if result.ExitReason != ExitReasonAllTasksCompleted {
		t.Errorf("ExitReason = %q, want %q", result.ExitReason, ExitReasonAllTasksCompleted)
	}
	if result.Signal != SignalComplete {
		t.Errorf("Signal = %v, want %v", result.Signal, SignalComplete)
	}
}

// =============================================================================
// Debounce Tests
// =============================================================================

func TestRunConfig_DebounceInterval(t *testing.T) {
	// Test that DebounceInterval field exists and defaults to zero
	config := RunConfig{
		EpicID: "test-epic",
	}

	if config.DebounceInterval != 0 {
		t.Errorf("DebounceInterval should default to 0, got %v", config.DebounceInterval)
	}

	// Test that it can be set
	config.DebounceInterval = 2 * time.Second
	if config.DebounceInterval != 2*time.Second {
		t.Errorf("DebounceInterval = %v, want 2s", config.DebounceInterval)
	}
}

// mockTicksClientForDebounce tracks GetTask calls for debounce testing.
type mockTicksClientForDebounce struct {
	*mockTicksClient
	getTaskCalls []string               // track taskIDs passed to GetTask
	taskUpdates  map[string]*ticks.Task // taskID -> updated task (simulates edits during debounce)
}

func newMockTicksClientForDebounce() *mockTicksClientForDebounce {
	return &mockTicksClientForDebounce{
		mockTicksClient: newMockTicksClient(),
		getTaskCalls:    []string{},
		taskUpdates:     make(map[string]*ticks.Task),
	}
}

func (m *mockTicksClientForDebounce) GetTask(taskID string) (*ticks.Task, error) {
	m.getTaskCalls = append(m.getTaskCalls, taskID)

	// If there's an updated version of this task, return it
	if updated, ok := m.taskUpdates[taskID]; ok {
		return updated, nil
	}

	// Fall back to base implementation
	return m.mockTicksClient.GetTask(taskID)
}

func TestGetNextTaskWithDebounce_NoDebounce(t *testing.T) {
	// When DebounceInterval is 0, should return task immediately without re-fetch
	mock := newMockTicksClientForDebounce()
	mock.tasks = []*ticks.Task{
		{ID: "task-1", Title: "Test Task"},
	}
	mock.epic = &ticks.Epic{ID: "test-epic", Title: "Test Epic", Type: "epic"}

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := &Engine{
		ticks:      mock,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	config := RunConfig{
		EpicID:           "test-epic",
		DebounceInterval: 0, // No debounce
	}

	ctx := context.Background()
	task, err := engine.getNextTaskWithDebounce(ctx, config)

	if err != nil {
		t.Fatalf("getNextTaskWithDebounce returned error: %v", err)
	}
	if task == nil {
		t.Fatal("expected task, got nil")
	}
	if task.ID != "task-1" {
		t.Errorf("task.ID = %q, want %q", task.ID, "task-1")
	}

	// Should NOT have called GetTask (no re-fetch without debounce)
	if len(mock.getTaskCalls) != 0 {
		t.Errorf("GetTask called %d times, want 0 (no debounce)", len(mock.getTaskCalls))
	}
}

func TestGetNextTaskWithDebounce_WithDebounce(t *testing.T) {
	// When DebounceInterval is set, should wait and then re-fetch task
	mock := newMockTicksClientForDebounce()
	mock.tasks = []*ticks.Task{
		{ID: "task-1", Title: "Original Title"},
	}
	mock.epic = &ticks.Epic{ID: "test-epic", Title: "Test Epic", Type: "epic"}

	// Simulate human updating the task during debounce
	mock.taskUpdates["task-1"] = &ticks.Task{
		ID:    "task-1",
		Title: "Updated Title After Debounce",
	}

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := &Engine{
		ticks:      mock,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	config := RunConfig{
		EpicID:           "test-epic",
		DebounceInterval: 10 * time.Millisecond, // Short for testing
	}

	ctx := context.Background()
	start := time.Now()
	task, err := engine.getNextTaskWithDebounce(ctx, config)
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("getNextTaskWithDebounce returned error: %v", err)
	}
	if task == nil {
		t.Fatal("expected task, got nil")
	}

	// Should have waited approximately the debounce interval
	if elapsed < config.DebounceInterval {
		t.Errorf("elapsed time %v < debounce interval %v", elapsed, config.DebounceInterval)
	}

	// Should have called GetTask to re-fetch the task
	if len(mock.getTaskCalls) != 1 {
		t.Errorf("GetTask called %d times, want 1", len(mock.getTaskCalls))
	}
	if mock.getTaskCalls[0] != "task-1" {
		t.Errorf("GetTask called with %q, want %q", mock.getTaskCalls[0], "task-1")
	}

	// Should have the updated task data
	if task.Title != "Updated Title After Debounce" {
		t.Errorf("task.Title = %q, want %q (updated version)", task.Title, "Updated Title After Debounce")
	}
}

func TestGetNextTaskWithDebounce_NoTask(t *testing.T) {
	// When NextTask returns nil, should return nil immediately (no debounce)
	mock := newMockTicksClientForDebounce()
	mock.tasks = []*ticks.Task{} // No tasks
	mock.epic = &ticks.Epic{ID: "test-epic", Title: "Test Epic", Type: "epic"}

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := &Engine{
		ticks:      mock,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	config := RunConfig{
		EpicID:           "test-epic",
		DebounceInterval: time.Second, // Would be long if debounce happened
	}

	ctx := context.Background()
	start := time.Now()
	task, err := engine.getNextTaskWithDebounce(ctx, config)
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("getNextTaskWithDebounce returned error: %v", err)
	}
	if task != nil {
		t.Errorf("expected nil task, got %+v", task)
	}

	// Should return immediately, not wait for debounce
	if elapsed >= config.DebounceInterval {
		t.Errorf("elapsed time %v >= debounce interval (should be immediate for nil task)", elapsed)
	}

	// Should NOT have called GetTask
	if len(mock.getTaskCalls) != 0 {
		t.Errorf("GetTask called %d times, want 0", len(mock.getTaskCalls))
	}
}

func TestGetNextTaskWithDebounce_ContextCancelled(t *testing.T) {
	// When context is cancelled during debounce wait, should return error
	mock := newMockTicksClientForDebounce()
	mock.tasks = []*ticks.Task{
		{ID: "task-1", Title: "Test Task"},
	}
	mock.epic = &ticks.Epic{ID: "test-epic", Title: "Test Epic", Type: "epic"}

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := &Engine{
		ticks:      mock,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	config := RunConfig{
		EpicID:           "test-epic",
		DebounceInterval: time.Second, // Long debounce
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Cancel context after a short delay
	go func() {
		time.Sleep(20 * time.Millisecond)
		cancel()
	}()

	task, err := engine.getNextTaskWithDebounce(ctx, config)

	if err == nil {
		t.Error("expected error when context cancelled")
	}
	if task != nil {
		t.Errorf("expected nil task on cancellation, got %+v", task)
	}
	if !errors.Is(err, context.Canceled) {
		t.Errorf("error = %v, want context.Canceled", err)
	}

	// Should NOT have called GetTask (cancelled before debounce completed)
	if len(mock.getTaskCalls) != 0 {
		t.Errorf("GetTask called %d times, want 0 (cancelled before re-fetch)", len(mock.getTaskCalls))
	}
}

func TestGetNextTaskWithDebounce_NegativeDebounce(t *testing.T) {
	// Negative DebounceInterval should be treated as no debounce
	mock := newMockTicksClientForDebounce()
	mock.tasks = []*ticks.Task{
		{ID: "task-1", Title: "Test Task"},
	}
	mock.epic = &ticks.Epic{ID: "test-epic", Title: "Test Epic", Type: "epic"}

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := &Engine{
		ticks:      mock,
		budget:     b,
		checkpoint: c,
		prompt:     NewPromptBuilder(),
	}

	config := RunConfig{
		EpicID:           "test-epic",
		DebounceInterval: -1 * time.Second, // Negative
	}

	ctx := context.Background()
	task, err := engine.getNextTaskWithDebounce(ctx, config)

	if err != nil {
		t.Fatalf("getNextTaskWithDebounce returned error: %v", err)
	}
	if task == nil {
		t.Fatal("expected task, got nil")
	}

	// Should NOT have called GetTask (negative treated as no debounce)
	if len(mock.getTaskCalls) != 0 {
		t.Errorf("GetTask called %d times, want 0 (negative debounce = no debounce)", len(mock.getTaskCalls))
	}
}
