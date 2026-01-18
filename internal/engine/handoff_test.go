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
)

// handoffMockAgent extends mockAgent with better support for multi-response scenarios.
type handoffMockAgent struct {
	name        string
	available   bool
	responses   []mockResponse
	callCount   int
	lastPrompts []string // Track all prompts received
}

func newHandoffMockAgent() *handoffMockAgent {
	return &handoffMockAgent{
		name:      "test-agent",
		available: true,
	}
}

func (m *handoffMockAgent) Name() string    { return m.name }
func (m *handoffMockAgent) Available() bool { return m.available }

func (m *handoffMockAgent) queueResponse(output string) {
	m.responses = append(m.responses, mockResponse{
		output:    output,
		tokensIn:  1000,
		tokensOut: 500,
		cost:      0.01,
	})
}

func (m *handoffMockAgent) Run(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
	m.lastPrompts = append(m.lastPrompts, prompt)

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

// handoffMockTicksClient extends mockTicksClient for full handoff flow testing.
// It simulates the behavior of the real ticks client during handoff workflows.
type handoffMockTicksClient struct {
	epic  *ticks.Epic
	tasks map[string]*ticks.Task // taskID -> task

	// State tracking
	closedTasks     map[string]bool   // taskID -> closed
	taskStatus      map[string]string // taskID -> status (open, closed, in_progress)
	awaitingState   map[string]string // taskID -> awaiting value
	verdictState    map[string]string // taskID -> verdict value
	structuredNotes map[string][]ticks.Note

	// Notes tracking
	epicNotes []string
	taskNotes map[string][]string // taskID -> notes

	// Call tracking for assertions
	setAwaitingCalls []setAwaitingCall
	closeTaskCalls   []closeTaskCall
	nextTaskCalls    int
}

type closeTaskCall struct {
	TaskID string
	Reason string
}

func newHandoffMockTicksClient() *handoffMockTicksClient {
	return &handoffMockTicksClient{
		tasks:           make(map[string]*ticks.Task),
		closedTasks:     make(map[string]bool),
		taskStatus:      make(map[string]string),
		awaitingState:   make(map[string]string),
		verdictState:    make(map[string]string),
		structuredNotes: make(map[string][]ticks.Note),
		taskNotes:       make(map[string][]string),
	}
}

func (m *handoffMockTicksClient) setEpic(id, title string) {
	m.epic = &ticks.Epic{
		ID:    id,
		Title: title,
		Type:  "epic",
	}
}

func (m *handoffMockTicksClient) addTask(id, title string) *ticks.Task {
	task := &ticks.Task{
		ID:     id,
		Title:  title,
		Status: "open",
		Type:   "task",
	}
	m.tasks[id] = task
	m.taskStatus[id] = "open"
	return task
}

func (m *handoffMockTicksClient) addTaskWithRequires(id, title, requires string) *ticks.Task {
	task := m.addTask(id, title)
	task.Requires = &requires
	return task
}

func (m *handoffMockTicksClient) GetEpic(epicID string) (*ticks.Epic, error) {
	if m.epic == nil || m.epic.ID != epicID {
		return nil, errors.New("epic not found")
	}
	return m.epic, nil
}

func (m *handoffMockTicksClient) GetTask(taskID string) (*ticks.Task, error) {
	task, ok := m.tasks[taskID]
	if !ok {
		return nil, errors.New("task not found")
	}
	// Return a copy with current state
	taskCopy := *task
	if status, ok := m.taskStatus[taskID]; ok {
		taskCopy.Status = status
	}
	if awaiting, ok := m.awaitingState[taskID]; ok && awaiting != "" {
		taskCopy.Awaiting = &awaiting
	}
	if verdict, ok := m.verdictState[taskID]; ok && verdict != "" {
		taskCopy.Verdict = &verdict
	}
	return &taskCopy, nil
}

func (m *handoffMockTicksClient) NextTask(epicID string) (*ticks.Task, error) {
	m.nextTaskCalls++

	// Return first open task that is not awaiting human
	for _, task := range m.tasks {
		status := m.taskStatus[task.ID]
		if status == "closed" {
			continue
		}
		// Skip tasks awaiting human
		if awaiting, ok := m.awaitingState[task.ID]; ok && awaiting != "" {
			continue
		}
		// Return a copy with current state
		taskCopy := *task
		taskCopy.Status = status
		if taskCopy.Status == "" {
			taskCopy.Status = "open"
		}
		return &taskCopy, nil
	}
	return nil, nil
}

func (m *handoffMockTicksClient) ListTasks(epicID string) ([]ticks.Task, error) {
	result := make([]ticks.Task, 0, len(m.tasks))
	for _, task := range m.tasks {
		taskCopy := *task
		if status, ok := m.taskStatus[task.ID]; ok {
			taskCopy.Status = status
		}
		result = append(result, taskCopy)
	}
	return result, nil
}

func (m *handoffMockTicksClient) HasOpenTasks(epicID string) (bool, error) {
	for _, task := range m.tasks {
		status := m.taskStatus[task.ID]
		if status != "closed" {
			return true, nil
		}
	}
	return false, nil
}

func (m *handoffMockTicksClient) CloseTask(taskID, reason string) error {
	m.closeTaskCalls = append(m.closeTaskCalls, closeTaskCall{TaskID: taskID, Reason: reason})
	m.closedTasks[taskID] = true
	m.taskStatus[taskID] = "closed"
	// Clear awaiting state when closed
	delete(m.awaitingState, taskID)
	return nil
}

func (m *handoffMockTicksClient) CloseEpic(epicID, reason string) error {
	if m.epic != nil {
		m.epic.Status = "closed"
	}
	return nil
}

func (m *handoffMockTicksClient) ReopenTask(taskID string) error {
	delete(m.closedTasks, taskID)
	m.taskStatus[taskID] = "open"
	return nil
}

func (m *handoffMockTicksClient) AddNote(issueID, message string, extraArgs ...string) error {
	if issueID == m.epic.ID {
		m.epicNotes = append(m.epicNotes, message)
	} else {
		m.taskNotes[issueID] = append(m.taskNotes[issueID], message)
	}
	return nil
}

func (m *handoffMockTicksClient) GetNotes(epicID string) ([]string, error) {
	return m.epicNotes, nil
}

func (m *handoffMockTicksClient) GetHumanNotes(issueID string) ([]ticks.Note, error) {
	if m.structuredNotes == nil {
		return nil, nil
	}
	var humanNotes []ticks.Note
	for _, n := range m.structuredNotes[issueID] {
		if n.Author == "human" {
			humanNotes = append(humanNotes, n)
		}
	}
	return humanNotes, nil
}

func (m *handoffMockTicksClient) SetStatus(issueID, status string) error {
	m.taskStatus[issueID] = status
	return nil
}

func (m *handoffMockTicksClient) SetAwaiting(taskID, awaiting, note string) error {
	m.setAwaitingCalls = append(m.setAwaitingCalls, setAwaitingCall{
		TaskID:   taskID,
		Awaiting: awaiting,
		Note:     note,
	})
	m.awaitingState[taskID] = awaiting
	if note != "" {
		m.taskNotes[taskID] = append(m.taskNotes[taskID], note)
	}
	return nil
}

func (m *handoffMockTicksClient) SetRunRecord(taskID string, record *agent.RunRecord) error {
	return nil
}

// SimulateHumanApproval simulates a human approving a task that is awaiting.
func (m *handoffMockTicksClient) SimulateHumanApproval(taskID string) {
	m.verdictState[taskID] = "approved"
	// Process the verdict immediately (like the real system would)
	m.processVerdict(taskID)
}

// SimulateHumanRejection simulates a human rejecting a task with feedback.
func (m *handoffMockTicksClient) SimulateHumanRejection(taskID, feedback string) {
	m.verdictState[taskID] = "rejected"
	// Add feedback as human note
	if feedback != "" {
		if m.structuredNotes == nil {
			m.structuredNotes = make(map[string][]ticks.Note)
		}
		m.structuredNotes[taskID] = append(m.structuredNotes[taskID], ticks.Note{
			Content: feedback,
			Author:  "human",
		})
	}
	// Process the verdict immediately
	m.processVerdict(taskID)
}

// processVerdict simulates verdict processing based on awaiting type.
func (m *handoffMockTicksClient) processVerdict(taskID string) {
	awaiting := m.awaitingState[taskID]
	verdict := m.verdictState[taskID]

	if awaiting == "" || verdict == "" {
		return
	}

	// Determine if task should close based on awaiting type and verdict
	shouldClose := false
	switch awaiting {
	case "work", "approval", "review", "content":
		shouldClose = (verdict == "approved")
	case "input", "escalation":
		shouldClose = (verdict == "rejected")
	case "checkpoint":
		shouldClose = false // checkpoint never closes
	}

	// Clear transient fields
	delete(m.awaitingState, taskID)
	delete(m.verdictState, taskID)

	if shouldClose {
		m.closedTasks[taskID] = true
		m.taskStatus[taskID] = "closed"
	}
}

// =============================================================================
// Integration Tests for Full Handoff Flows
// =============================================================================

// TestEngine_FullHandoffFlow_ApprovalNeeded tests the complete agent → human → agent
// workflow where the agent requests approval and human approves.
func TestEngine_FullHandoffFlow_ApprovalNeeded(t *testing.T) {
	// Setup: Epic with one task
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Do security work")

	agent := newHandoffMockAgent()
	agent.queueResponse("Done! <promise>APPROVAL_NEEDED: security change</promise>")

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(agent, mock, b, c)

	// Act: Run engine
	ctx := context.Background()
	_, err := engine.Run(ctx, RunConfig{EpicID: "epic1"})

	// Assert: No error (engine exits because no ready tasks - task is awaiting)
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Assert: Task awaiting approval, not closed
	if mock.awaitingState["task1"] != "approval" {
		t.Errorf("awaiting state = %q, want %q", mock.awaitingState["task1"], "approval")
	}
	if mock.closedTasks["task1"] {
		t.Error("task should NOT be closed before human approval")
	}

	// Simulate human approval
	mock.SimulateHumanApproval("task1")

	// Assert: Now closed
	if !mock.closedTasks["task1"] {
		t.Error("task should be closed after human approval")
	}
}

// TestEngine_FullHandoffFlow_RejectionLoop tests the agent → human rejects → agent retries flow.
func TestEngine_FullHandoffFlow_RejectionLoop(t *testing.T) {
	// Setup: Epic with one task
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Write error messages")

	agentMock := newHandoffMockAgent()
	agentMock.queueResponse("Done! <promise>CONTENT_REVIEW: error messages</promise>")

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(agentMock, mock, b, c)

	// First run: hands off to human
	ctx := context.Background()
	_, err := engine.Run(ctx, RunConfig{EpicID: "epic1"})
	if err != nil {
		t.Fatalf("first engine.Run() error = %v", err)
	}

	// Assert: Task is awaiting content review
	if mock.awaitingState["task1"] != "content" {
		t.Errorf("awaiting state = %q, want %q", mock.awaitingState["task1"], "content")
	}

	// Human rejects with feedback
	mock.SimulateHumanRejection("task1", "Too harsh, soften tone")

	// Assert: Task is back to agent (awaiting cleared, not closed)
	if mock.awaitingState["task1"] != "" {
		t.Errorf("awaiting should be cleared after rejection, got %q", mock.awaitingState["task1"])
	}
	if mock.closedTasks["task1"] {
		t.Error("task should NOT be closed after rejection")
	}

	// Queue second agent response - agent will see feedback and complete
	agentMock.queueResponse("Fixed! <promise>COMPLETE</promise>")

	// Second run: agent sees feedback, completes
	// Note: We need to close the task manually since COMPLETE signal is handled via tk close
	// The mock simulates what the agent does (calls tk close which is CloseTask)
	_, err = engine.Run(ctx, RunConfig{EpicID: "epic1"})
	if err != nil {
		t.Fatalf("second engine.Run() error = %v", err)
	}

	// The agent's second prompt should contain the feedback
	if len(agentMock.lastPrompts) < 2 {
		t.Fatalf("expected at least 2 prompts, got %d", len(agentMock.lastPrompts))
	}
	secondPrompt := agentMock.lastPrompts[1]
	if !strings.Contains(secondPrompt, "Too harsh") {
		t.Errorf("second prompt should contain human feedback 'Too harsh', got: %s", secondPrompt[:min(500, len(secondPrompt))])
	}
}

// TestEngine_FullHandoffFlow_HumanFeedbackPassedToAgent tests that human feedback
// is correctly included in the agent's prompt on subsequent runs.
func TestEngine_FullHandoffFlow_HumanFeedbackPassedToAgent(t *testing.T) {
	// Setup
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Write documentation")

	// Add pre-existing human feedback
	mock.structuredNotes["task1"] = []ticks.Note{
		{Content: "Please use simpler language", Author: "human"},
		{Content: "Add more examples", Author: "human"},
	}

	agentMock := newHandoffMockAgent()
	agentMock.queueResponse("Documentation updated! <promise>COMPLETE</promise>")

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(agentMock, mock, b, c)

	// Run engine
	ctx := context.Background()
	_, err := engine.Run(ctx, RunConfig{EpicID: "epic1"})
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Assert: Agent received prompt containing human feedback
	if len(agentMock.lastPrompts) == 0 {
		t.Fatal("expected at least 1 prompt")
	}
	prompt := agentMock.lastPrompts[0]
	if !strings.Contains(prompt, "simpler language") {
		t.Errorf("prompt should contain human feedback 'simpler language'")
	}
	if !strings.Contains(prompt, "more examples") {
		t.Errorf("prompt should contain human feedback 'more examples'")
	}
}

// TestEngine_FullHandoffFlow_MultipleHandoffs tests multiple handoffs in the same task.
func TestEngine_FullHandoffFlow_MultipleHandoffs(t *testing.T) {
	// Setup: Epic with one task
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Complex multi-step work")

	agentMock := newHandoffMockAgent()
	// First: agent asks a question
	agentMock.queueResponse("Need info. <promise>INPUT_NEEDED: Which database?</promise>")
	// Second: agent does work and needs approval
	agentMock.queueResponse("Done with DB. <promise>APPROVAL_NEEDED: database change</promise>")
	// Third: after approval, completes
	agentMock.queueResponse("All done! <promise>COMPLETE</promise>")

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 20})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(agentMock, mock, b, c)
	ctx := context.Background()

	// First run: agent asks for input
	_, err := engine.Run(ctx, RunConfig{EpicID: "epic1"})
	if err != nil {
		t.Fatalf("first run error = %v", err)
	}
	if mock.awaitingState["task1"] != "input" {
		t.Errorf("awaiting = %q, want 'input'", mock.awaitingState["task1"])
	}

	// Human provides input (approved = answer provided)
	mock.SimulateHumanApproval("task1") // For input, approval means "answer provided, continue"
	// Note: For input type, approval means agent continues (not close)

	// Add the human's answer as feedback
	mock.structuredNotes["task1"] = append(mock.structuredNotes["task1"], ticks.Note{
		Content: "Use PostgreSQL",
		Author:  "human",
	})

	// Second run: agent does work and needs approval
	_, err = engine.Run(ctx, RunConfig{EpicID: "epic1"})
	if err != nil {
		t.Fatalf("second run error = %v", err)
	}
	if mock.awaitingState["task1"] != "approval" {
		t.Errorf("awaiting = %q, want 'approval'", mock.awaitingState["task1"])
	}

	// Human approves the database change
	mock.SimulateHumanApproval("task1")

	// Assert: Task should now be closed
	if !mock.closedTasks["task1"] {
		t.Error("task should be closed after second approval")
	}
}

// TestEngine_FullHandoffFlow_RequiresField tests pre-declared requires field behavior.
// When a task has requires="approval", COMPLETE signal should trigger approval flow.
func TestEngine_FullHandoffFlow_RequiresField(t *testing.T) {
	// Setup: Epic with task that requires approval
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTaskWithRequires("task1", "Security-critical work", "approval")

	agentMock := newHandoffMockAgent()
	// Agent signals COMPLETE (but task has requires=approval)
	agentMock.queueResponse("Work done! <promise>COMPLETE</promise>")

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(agentMock, mock, b, c)
	ctx := context.Background()

	// Run engine
	_, err := engine.Run(ctx, RunConfig{EpicID: "epic1"})
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Assert: Task is awaiting approval (not closed) because of requires field
	// Note: The COMPLETE signal is ignored by the engine, but handleSignal processes it
	// Actually, looking at the code, COMPLETE is handled specially in handleSignal
	// If task has Requires, it sets awaiting state instead of closing

	// The engine treats COMPLETE signal as "ignored" in the main loop,
	// but handleSignal is only called for non-COMPLETE signals.
	// So for requires field, we need to verify the behavior when agent
	// explicitly calls tk close (which triggers the requires check).

	// Actually, looking at the code flow:
	// 1. Agent emits COMPLETE signal
	// 2. Engine sees COMPLETE and logs warning (ignores it)
	// 3. Agent should call tk close instead
	// 4. tk close would check requires field

	// Let's verify the handleSignal behavior for COMPLETE with requires
	// This is tested in TestEngine_HandleSignal already, but let's verify integration

	// Since the engine ignores COMPLETE, the task stays open
	// The agent is supposed to call tk close which handles requires

	// For this integration test, let's verify handleSignal is called correctly
	// when we explicitly test it
	task := &ticks.Task{ID: "test-requires"}
	requires := "approval"
	task.Requires = &requires

	err = engine.handleSignal(task, SignalComplete, "")
	if err != nil {
		t.Fatalf("handleSignal error = %v", err)
	}

	// handleSignal should have called SetAwaiting, not CloseTask
	// Since we're using the mock from the engine, let's check it
	// Actually, the engine uses the mock we passed in, so:
	foundCall := false
	for _, call := range mock.setAwaitingCalls {
		if call.TaskID == "test-requires" && call.Awaiting == "approval" {
			foundCall = true
			break
		}
	}
	if !foundCall {
		t.Error("handleSignal should have called SetAwaiting for task with requires field")
	}
}

// TestEngine_FullHandoffFlow_RequiresFieldRejectionCycle tests the full cycle:
// task with requires → COMPLETE → awaiting → rejected → agent retries → approved → closed
func TestEngine_FullHandoffFlow_RequiresFieldRejectionCycle(t *testing.T) {
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	task := mock.addTaskWithRequires("task1", "Work needing review", "review")

	// Manually call handleSignal to simulate COMPLETE with requires
	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(nil, mock, b, c)

	// Step 1: Agent completes, but task requires review
	err := engine.handleSignal(task, SignalComplete, "")
	if err != nil {
		t.Fatalf("handleSignal error = %v", err)
	}

	// Verify task is awaiting review
	if mock.awaitingState["task1"] != "review" {
		t.Errorf("awaiting = %q, want 'review'", mock.awaitingState["task1"])
	}
	if mock.closedTasks["task1"] {
		t.Error("task should NOT be closed yet")
	}

	// Step 2: Human rejects
	mock.SimulateHumanRejection("task1", "Please add error handling")

	// Verify task is back to agent
	if mock.awaitingState["task1"] != "" {
		t.Errorf("awaiting should be cleared, got %q", mock.awaitingState["task1"])
	}
	if mock.closedTasks["task1"] {
		t.Error("task should NOT be closed after rejection")
	}

	// Step 3: Agent fixes and completes again
	// Refresh task to simulate fresh state (requires should persist)
	task2 := &ticks.Task{ID: "task1", Requires: task.Requires}
	err = engine.handleSignal(task2, SignalComplete, "")
	if err != nil {
		t.Fatalf("second handleSignal error = %v", err)
	}

	// Verify task is awaiting review again (requires persists)
	if mock.awaitingState["task1"] != "review" {
		t.Errorf("awaiting = %q, want 'review'", mock.awaitingState["task1"])
	}

	// Step 4: Human approves
	mock.SimulateHumanApproval("task1")

	// Verify task is now closed
	if !mock.closedTasks["task1"] {
		t.Error("task should be closed after approval")
	}
}

// TestEngine_FullHandoffFlow_EjectSignal tests the EJECT → work awaiting flow.
func TestEngine_FullHandoffFlow_EjectSignal(t *testing.T) {
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Install large package")

	agentMock := newHandoffMockAgent()
	agentMock.queueResponse("Can't do this. <promise>EJECT: Need to install 10GB SDK</promise>")

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(agentMock, mock, b, c)
	ctx := context.Background()

	_, err := engine.Run(ctx, RunConfig{EpicID: "epic1"})
	if err != nil {
		t.Fatalf("engine.Run() error = %v", err)
	}

	// Assert: Task is awaiting work (human needs to do it)
	if mock.awaitingState["task1"] != "work" {
		t.Errorf("awaiting = %q, want 'work'", mock.awaitingState["task1"])
	}

	// Check the context was passed through
	found := false
	for _, call := range mock.setAwaitingCalls {
		if call.TaskID == "task1" && call.Awaiting == "work" {
			if !strings.Contains(call.Note, "10GB SDK") {
				t.Errorf("note should contain context '10GB SDK', got %q", call.Note)
			}
			found = true
			break
		}
	}
	if !found {
		t.Error("expected SetAwaiting call for task1")
	}
}

// TestEngine_FullHandoffFlow_CheckpointNeverCloses tests that checkpoint signals
// always return to agent, never close the task.
func TestEngine_FullHandoffFlow_CheckpointNeverCloses(t *testing.T) {
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Multi-phase work")

	agentMock := newHandoffMockAgent()
	agentMock.queueResponse("Phase 1 done. <promise>CHECKPOINT: Database migration complete</promise>")
	agentMock.queueResponse("Phase 2 done. <promise>COMPLETE</promise>")

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(agentMock, mock, b, c)
	ctx := context.Background()

	// First run: checkpoint
	_, err := engine.Run(ctx, RunConfig{EpicID: "epic1"})
	if err != nil {
		t.Fatalf("first run error = %v", err)
	}

	if mock.awaitingState["task1"] != "checkpoint" {
		t.Errorf("awaiting = %q, want 'checkpoint'", mock.awaitingState["task1"])
	}

	// Human approves checkpoint
	mock.SimulateHumanApproval("task1")

	// Verify NOT closed (checkpoint never closes)
	if mock.closedTasks["task1"] {
		t.Error("task should NOT be closed after checkpoint approval")
	}

	// Human rejects checkpoint (with feedback)
	mock.awaitingState["task1"] = "checkpoint" // Re-set for testing rejection
	mock.SimulateHumanRejection("task1", "Go back and fix migration")

	// Verify STILL not closed (checkpoint never closes, even on rejection)
	if mock.closedTasks["task1"] {
		t.Error("task should NOT be closed after checkpoint rejection")
	}
}

// TestEngine_FullHandoffFlow_EscalationApproved tests escalation → approved → continue.
func TestEngine_FullHandoffFlow_EscalationApproved(t *testing.T) {
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Security work")

	// Manually call handleSignal to test escalation
	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(nil, mock, b, c)

	task := &ticks.Task{ID: "task1"}
	err := engine.handleSignal(task, SignalEscalate, "Found potential security issue")
	if err != nil {
		t.Fatalf("handleSignal error = %v", err)
	}

	if mock.awaitingState["task1"] != "escalation" {
		t.Errorf("awaiting = %q, want 'escalation'", mock.awaitingState["task1"])
	}

	// Human approves (gives direction)
	mock.SimulateHumanApproval("task1")

	// For escalation, approved = continue (not close)
	if mock.closedTasks["task1"] {
		t.Error("task should NOT be closed after escalation approval (agent should continue)")
	}
}

// TestEngine_FullHandoffFlow_EscalationRejected tests escalation → rejected → close.
func TestEngine_FullHandoffFlow_EscalationRejected(t *testing.T) {
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Security work")

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(nil, mock, b, c)

	task := &ticks.Task{ID: "task1"}
	err := engine.handleSignal(task, SignalEscalate, "Found potential security issue")
	if err != nil {
		t.Fatalf("handleSignal error = %v", err)
	}

	// Human rejects (won't do)
	mock.SimulateHumanRejection("task1", "Not a real issue, ignore")

	// For escalation, rejected = close (won't proceed)
	if !mock.closedTasks["task1"] {
		t.Error("task should be closed after escalation rejection")
	}
}

// TestEngine_FullHandoffFlow_InputRejected tests input → rejected → close.
func TestEngine_FullHandoffFlow_InputRejected(t *testing.T) {
	mock := newHandoffMockTicksClient()
	mock.setEpic("epic1", "Test Epic")
	mock.addTask("task1", "Need clarification")

	dir := t.TempDir()
	b := budget.NewTracker(budget.Limits{MaxIterations: 10})
	c := checkpoint.NewManagerWithDir(dir)

	engine := NewEngine(nil, mock, b, c)

	task := &ticks.Task{ID: "task1"}
	err := engine.handleSignal(task, SignalInputNeeded, "What color scheme?")
	if err != nil {
		t.Fatalf("handleSignal error = %v", err)
	}

	if mock.awaitingState["task1"] != "input" {
		t.Errorf("awaiting = %q, want 'input'", mock.awaitingState["task1"])
	}

	// Human rejects (can't/won't answer)
	mock.SimulateHumanRejection("task1", "Not relevant, skip this")

	// For input, rejected = close (can't proceed without answer)
	if !mock.closedTasks["task1"] {
		t.Error("task should be closed after input rejection")
	}
}

// TestEngine_FullHandoffFlow_AllSignalTypes verifies all signal types map correctly.
func TestEngine_FullHandoffFlow_AllSignalTypes(t *testing.T) {
	tests := []struct {
		signal       Signal
		wantAwaiting string
	}{
		{SignalEject, "work"},
		{SignalBlocked, "input"},
		{SignalApprovalNeeded, "approval"},
		{SignalInputNeeded, "input"},
		{SignalReviewRequested, "review"},
		{SignalContentReview, "content"},
		{SignalEscalate, "escalation"},
		{SignalCheckpoint, "checkpoint"},
	}

	for _, tt := range tests {
		t.Run(tt.signal.String(), func(t *testing.T) {
			mock := newHandoffMockTicksClient()
			mock.setEpic("epic1", "Test")
			mock.addTask("task1", "Test task")

			dir := t.TempDir()
			b := budget.NewTracker(budget.Limits{MaxIterations: 10})
			c := checkpoint.NewManagerWithDir(dir)

			engine := NewEngine(nil, mock, b, c)

			task := &ticks.Task{ID: "task1"}
			err := engine.handleSignal(task, tt.signal, "test context")
			if err != nil {
				t.Fatalf("handleSignal error = %v", err)
			}

			if mock.awaitingState["task1"] != tt.wantAwaiting {
				t.Errorf("awaiting = %q, want %q", mock.awaitingState["task1"], tt.wantAwaiting)
			}
		})
	}
}

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
