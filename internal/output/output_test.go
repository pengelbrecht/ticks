package output

import (
	"bytes"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

// mockBoardSink records calls for verification.
type mockBoardSink struct {
	events []boardEvent
}

type boardEvent struct {
	epicID    string
	eventType string
	data      any
}

func (m *mockBoardSink) BroadcastRunEvent(epicID string, eventType string, data any) {
	m.events = append(m.events, boardEvent{epicID, eventType, data})
}

func (m *mockBoardSink) WriteEpicStatus(epicID string, status any) error { return nil }
func (m *mockBoardSink) WriteLiveRecord(tickID string, snap any) error   { return nil }

// mockRunLogSink records calls for verification.
type mockRunLogSink struct {
	calls []logCall
}

type logCall struct {
	method string
	args   []any
}

func (m *mockRunLogSink) LogIterationStart(iteration int, taskID, taskTitle string) {
	m.calls = append(m.calls, logCall{"LogIterationStart", []any{iteration, taskID, taskTitle}})
}
func (m *mockRunLogSink) LogIterationEnd(iteration int, taskID string, duration time.Duration, tokensIn, tokensOut int, cost float64, signal, errStr string, isTimeout bool) {
	m.calls = append(m.calls, logCall{"LogIterationEnd", []any{iteration, taskID}})
}
func (m *mockRunLogSink) LogContextGenerationStarted(epicID string, taskCount int) {
	m.calls = append(m.calls, logCall{"LogContextGenerationStarted", []any{epicID, taskCount}})
}
func (m *mockRunLogSink) LogContextGenerationCompleted(epicID string, contentLength int) {
	m.calls = append(m.calls, logCall{"LogContextGenerationCompleted", []any{epicID, contentLength}})
}
func (m *mockRunLogSink) LogContextGenerationFailed(epicID string, errMsg string) {
	m.calls = append(m.calls, logCall{"LogContextGenerationFailed", []any{epicID, errMsg}})
}
func (m *mockRunLogSink) LogContextSkipped(epicID string, reason string, taskCount int) {
	m.calls = append(m.calls, logCall{"LogContextSkipped", []any{epicID, reason}})
}
func (m *mockRunLogSink) LogContextLoadFailed(epicID string, errMsg string) {
	m.calls = append(m.calls, logCall{"LogContextLoadFailed", []any{epicID, errMsg}})
}
func (m *mockRunLogSink) LogContextSaveFailed(epicID string, errMsg string) {
	m.calls = append(m.calls, logCall{"LogContextSaveFailed", []any{epicID, errMsg}})
}
func (m *mockRunLogSink) LogContextError(epicID string, errMsg string, phase string) {
	m.calls = append(m.calls, logCall{"LogContextError", []any{epicID, errMsg, phase}})
}
func (m *mockRunLogSink) LogRunConfig(maxIter int, maxCost float64, maxDuration, agentTimeout time.Duration, maxTaskRetries int, watch bool, watchTimeout, watchPollInterval time.Duration) {
	m.calls = append(m.calls, logCall{"LogRunConfig", nil})
}
func (m *mockRunLogSink) LogRunEnd(epicID string, iterations int, totalTokens int, totalCost float64, duration time.Duration, signal, exitReason string) {
	m.calls = append(m.calls, logCall{"LogRunEnd", []any{epicID, iterations}})
}
func (m *mockRunLogSink) LogAgentTimeout(taskID string, timeout time.Duration, partialOutputLen int) {
	m.calls = append(m.calls, logCall{"LogAgentTimeout", []any{taskID}})
}
func (m *mockRunLogSink) LogAgentError(taskID string, errMsg string) {
	m.calls = append(m.calls, logCall{"LogAgentError", []any{taskID, errMsg}})
}
func (m *mockRunLogSink) LogTaskCompleted(taskID string, verificationPassed bool) {
	m.calls = append(m.calls, logCall{"LogTaskCompleted", []any{taskID}})
}
func (m *mockRunLogSink) LogNoTaskAvailable(reason string, hasOpen bool, watchMode bool) {
	m.calls = append(m.calls, logCall{"LogNoTaskAvailable", []any{reason}})
}
func (m *mockRunLogSink) LogEpicCompleted(reason string, completedTasks []string) {
	m.calls = append(m.calls, logCall{"LogEpicCompleted", []any{reason}})
}
func (m *mockRunLogSink) LogBudgetCheck(limitType string, shouldStop bool, stopReason string, iteration, totalTokens int, totalCost float64) {
	m.calls = append(m.calls, logCall{"LogBudgetCheck", []any{limitType}})
}
func (m *mockRunLogSink) LogSignalDetected(signal string, reason string, taskID string) {
	m.calls = append(m.calls, logCall{"LogSignalDetected", []any{signal, taskID}})
}
func (m *mockRunLogSink) LogSignalHandled(signal string, taskID string, action string, awaitingState string) {
	m.calls = append(m.calls, logCall{"LogSignalHandled", []any{signal, taskID}})
}
func (m *mockRunLogSink) LogIdleEntered(reason string, pollInterval time.Duration) {
	m.calls = append(m.calls, logCall{"LogIdleEntered", []any{reason}})
}
func (m *mockRunLogSink) LogIdleFileChange(path string) {
	m.calls = append(m.calls, logCall{"LogIdleFileChange", []any{path}})
}
func (m *mockRunLogSink) LogIdleTaskCheck(taskFound bool, taskID string) {
	m.calls = append(m.calls, logCall{"LogIdleTaskCheck", []any{taskFound, taskID}})
}

func TestNew_Defaults(t *testing.T) {
	o := New()
	if o.w != nil || o.errw != nil || o.board != nil || o.cloud != nil || o.runLog != nil || o.jsonl {
		t.Fatal("expected all fields to be zero-value")
	}
}

func TestNew_WithOptions(t *testing.T) {
	var stdout, stderr bytes.Buffer
	board := &mockBoardSink{}
	runLog := &mockRunLogSink{}

	o := New(
		WithStdout(&stdout),
		WithStderr(&stderr),
		WithBoard(board),
		WithRunLog(runLog),
		WithJSONL(true),
	)

	if o.w != &stdout {
		t.Error("stdout not set")
	}
	if o.errw != &stderr {
		t.Error("stderr not set")
	}
	if o.board != board {
		t.Error("board not set")
	}
	if o.runLog != runLog {
		t.Error("runLog not set")
	}
	if !o.jsonl {
		t.Error("jsonl not set")
	}
}

func TestAgentInfo_WritesToTerminal(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.AgentInfo("claude", "/tmp/worktree")

	got := stdout.String()
	if got != "Agent: claude\nWorktree: /tmp/worktree\n" {
		t.Errorf("unexpected output: %q", got)
	}
}

func TestAgentInfo_SuppressedInJSONL(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout), WithJSONL(true))

	o.AgentInfo("claude", "/tmp/worktree")

	if stdout.Len() != 0 {
		t.Errorf("expected no output in JSONL mode, got: %q", stdout.String())
	}
}

func TestBoardURL_WritesToTerminal(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.BoardURL(8080)

	if got := stdout.String(); got != "Board: http://localhost:8080\n" {
		t.Errorf("unexpected output: %q", got)
	}
}

func TestContextGenerating_RoutesToAllSinks(t *testing.T) {
	board := &mockBoardSink{}
	runLog := &mockRunLogSink{}
	o := New(WithBoard(board), WithRunLog(runLog))

	o.ContextGenerating("epic-1", 5)

	if len(board.events) != 1 || board.events[0].eventType != "context_generating" {
		t.Error("board sink not called correctly")
	}
	if len(runLog.calls) != 1 || runLog.calls[0].method != "LogContextGenerationStarted" {
		t.Error("runLog sink not called correctly")
	}
}

func TestTaskStarted_RoutesToAllSinks(t *testing.T) {
	board := &mockBoardSink{}
	runLog := &mockRunLogSink{}
	o := New(WithBoard(board), WithRunLog(runLog))

	o.TaskStarted(1, "task-1", "Do the thing")

	if len(board.events) != 1 || board.events[0].eventType != "task_started" {
		t.Error("board sink not called")
	}
	if len(runLog.calls) != 1 || runLog.calls[0].method != "LogIterationStart" {
		t.Error("runLog sink not called")
	}
}

func TestTaskCompleted_RoutesToAllSinks(t *testing.T) {
	board := &mockBoardSink{}
	runLog := &mockRunLogSink{}
	o := New(WithBoard(board), WithRunLog(runLog))

	o.TaskCompleted(IterationResult{
		Iteration: 1,
		TaskID:    "task-1",
		TaskTitle: "Test task",
		Duration:  5 * time.Second,
		TokensIn:  100,
		TokensOut: 50,
		Cost:      0.01,
	})

	if len(board.events) != 1 || board.events[0].eventType != "task_completed" {
		t.Error("board sink not called")
	}
	if len(runLog.calls) != 1 || runLog.calls[0].method != "LogIterationEnd" {
		t.Error("runLog sink not called")
	}
}

func TestRunComplete_RoutesToAllSinks(t *testing.T) {
	board := &mockBoardSink{}
	runLog := &mockRunLogSink{}
	o := New(WithBoard(board), WithRunLog(runLog))

	o.RunComplete(RunResult{
		EpicID:     "epic-1",
		Iterations: 3,
		ExitReason: "all tasks completed",
	})

	if len(board.events) != 1 || board.events[0].eventType != "run_complete" {
		t.Error("board sink not called")
	}
	if len(runLog.calls) != 1 || runLog.calls[0].method != "LogRunEnd" {
		t.Error("runLog sink not called")
	}
}

func TestWrapupStepResult_Output(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.WrapupStepResult("verify", true, nil)
	o.WrapupStepResult("merge", false, errors.New("conflict"))

	got := stdout.String()
	expected := "[PASS] verify\n[FAIL] merge: conflict\n"
	if got != expected {
		t.Errorf("got %q, want %q", got, expected)
	}
}

func TestWrapupStepResult_SuppressedInJSONL(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout), WithJSONL(true))

	o.WrapupStepResult("verify", true, nil)

	if stdout.Len() != 0 {
		t.Error("expected no output in JSONL mode")
	}
}

func TestWarnError_WriteToStderr(t *testing.T) {
	var stderr bytes.Buffer
	o := New(WithStderr(&stderr))

	o.Warn("something %s", "happened")
	o.Error("bad %s", "thing")

	got := stderr.String()
	expected := "Warning: something happened\nError: bad thing\n"
	if got != expected {
		t.Errorf("got %q, want %q", got, expected)
	}
}

func TestNilSinks_NoPanic(t *testing.T) {
	o := New() // no sinks at all

	// None of these should panic
	o.AgentInfo("claude", "/tmp")
	o.BoardURL(8080)
	o.ContextGenerating("e1", 3)
	o.ContextProgress("e1", time.Second, 100, 50)
	o.ContextGenerated("e1", 1000)
	o.ContextLoaded("e1")
	o.ContextSkipped("e1", "reason")
	o.ContextFailed("e1", "err")
	o.WaveStarted(1, []string{"t1"})
	o.TaskStarted(1, "t1", "title")
	o.TaskCompleted(IterationResult{})
	o.AgentOutput("chunk")
	o.RunComplete(RunResult{})
	o.WrapupStepResult("step", true, nil)
	o.MergeResult("branch", true, nil)
	o.WorktreePreserved("/tmp", "reason")
	o.Warn("test")
	o.Error("test")
}

func TestMergeResult_Output(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.MergeResult("feature-1", true, nil)
	o.MergeResult("feature-2", false, errors.New("conflict"))

	got := stdout.String()
	expected := "Merged branch feature-1\nMerge failed for feature-2: conflict\n"
	if got != expected {
		t.Errorf("got %q, want %q", got, expected)
	}
}

func TestWorktreePreserved_Output(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.WorktreePreserved("/tmp/wt", "tasks awaiting")

	got := stdout.String()
	expected := "Worktree preserved at /tmp/wt (tasks awaiting)\n"
	if got != expected {
		t.Errorf("got %q, want %q", got, expected)
	}
}

func TestContextGenerating_TerminalOutput(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.ContextGenerating("epic-1", 5)

	got := stdout.String()
	expected := "\nGenerating epic context for epic-1 (5 tasks)...\n"
	if got != expected {
		t.Errorf("got %q, want %q", got, expected)
	}
}

func TestContextGenerating_SuppressedInJSONL(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout), WithJSONL(true))

	o.ContextGenerating("epic-1", 5)

	if stdout.Len() != 0 {
		t.Errorf("expected no output in JSONL mode, got: %q", stdout.String())
	}
}

func TestContextProgress_TerminalOutput(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.ContextProgress("epic-1", 5*time.Second, 100, 50)

	got := stdout.String()
	if got != "\r  Context: 5s elapsed, 100 tokens in, 50 tokens out" {
		t.Errorf("unexpected output: %q", got)
	}
}

func TestContextProgress_ClearsLongerPreviousLine(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	// First call with longer output
	o.ContextProgress("epic-1", 100*time.Second, 10000, 5000)
	stdout.Reset()

	// Second call with shorter output — should pad with spaces
	o.ContextProgress("epic-1", 5*time.Second, 10, 5)
	got := stdout.String()
	if got == "\r  Context: 5s elapsed, 10 tokens in, 5 tokens out" {
		t.Error("expected padding spaces to clear previous longer line")
	}
	if !strings.HasPrefix(got, "\r  Context: 5s elapsed, 10 tokens in, 5 tokens out") {
		t.Errorf("unexpected prefix: %q", got)
	}
}

func TestContextProgress_SuppressedInJSONL(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout), WithJSONL(true))

	o.ContextProgress("epic-1", 5*time.Second, 100, 50)

	if stdout.Len() != 0 {
		t.Errorf("expected no output in JSONL mode, got: %q", stdout.String())
	}
}

func TestContextGenerated_TerminalOutput(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.ContextGenerated("epic-1", 5000)

	got := stdout.String()
	if !strings.HasPrefix(got, "\rContext generated (~5000 tokens)") {
		t.Errorf("unexpected output: %q", got)
	}
	if !strings.HasSuffix(got, "\n") {
		t.Error("expected trailing newline")
	}
}

func TestContextLoaded_TerminalOutput(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.ContextLoaded("epic-1")

	if got := stdout.String(); got != "Using existing context for epic-1\n" {
		t.Errorf("got %q", got)
	}
}

func TestContextSkipped_TerminalOutput(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.ContextSkipped("epic-1", "no tasks need context")

	if got := stdout.String(); got != "Context skipped: no tasks need context\n" {
		t.Errorf("got %q", got)
	}
}

func TestContextFailed_TerminalOutput(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.ContextFailed("epic-1", "timeout")

	if got := stdout.String(); got != "Context generation failed: timeout\n" {
		t.Errorf("got %q", got)
	}
}

func TestTaskStarted_TerminalOutput(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.TaskStarted(1, "task-1", "Do the thing")

	if got := stdout.String(); got != "\n=== Iteration 1: task-1 (Do the thing) ===\n" {
		t.Errorf("got %q", got)
	}
}

func TestTaskStarted_SuppressedInJSONL(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout), WithJSONL(true))

	o.TaskStarted(1, "task-1", "Do the thing")

	if stdout.Len() != 0 {
		t.Errorf("expected no output in JSONL mode, got: %q", stdout.String())
	}
}

func TestTaskCompleted_TerminalOutput(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.TaskCompleted(IterationResult{
		Iteration: 2,
		TaskID:    "task-1",
		TokensIn:  1000,
		TokensOut: 500,
		Cost:      0.0123,
	})

	expected := "\n--- Iteration 2 complete (tokens: 1000 in, 500 out, cost: $0.0123) ---\n"
	if got := stdout.String(); got != expected {
		t.Errorf("got %q, want %q", got, expected)
	}
}

func TestTaskCompleted_SuppressedInJSONL(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout), WithJSONL(true))

	o.TaskCompleted(IterationResult{Iteration: 1, TokensIn: 100, TokensOut: 50, Cost: 0.01})

	if stdout.Len() != 0 {
		t.Errorf("expected no output in JSONL mode, got: %q", stdout.String())
	}
}

func TestRunComplete_TerminalOutput(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.RunComplete(RunResult{
		EpicID:         "epic-1",
		Iterations:     3,
		TotalTokens:    5000,
		TotalCost:      0.1234,
		Duration:       2*time.Minute + 30*time.Second,
		CompletedTasks: []string{"t1", "t2", "t3"},
		ExitReason:     "all tasks completed",
	})

	got := stdout.String()
	if !strings.Contains(got, "=== Run Complete ===") {
		t.Error("missing header")
	}
	if !strings.Contains(got, "Epic: epic-1") {
		t.Error("missing epic ID")
	}
	if !strings.Contains(got, "Iterations: 3") {
		t.Error("missing iterations")
	}
	if !strings.Contains(got, "Tokens: 5000") {
		t.Error("missing tokens")
	}
	if !strings.Contains(got, "Cost: $0.1234") {
		t.Error("missing cost")
	}
	if !strings.Contains(got, "Duration: 2m30s") {
		t.Error("missing duration")
	}
	if !strings.Contains(got, "Completed tasks: 3") {
		t.Error("missing completed tasks count")
	}
	if !strings.Contains(got, "Exit reason: all tasks completed") {
		t.Error("missing exit reason")
	}
	// Should NOT contain signal lines when signal is empty
	if strings.Contains(got, "Signal:") {
		t.Error("signal line should not appear when signal is empty")
	}
}

func TestRunComplete_TerminalOutput_WithSignal(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout))

	o.RunComplete(RunResult{
		EpicID:       "epic-1",
		Iterations:   1,
		ExitReason:   "signal received",
		Signal:       "stop",
		SignalReason: "user requested",
	})

	got := stdout.String()
	if !strings.Contains(got, "Signal: stop") {
		t.Errorf("missing signal, got: %q", got)
	}
	if !strings.Contains(got, "Signal reason: user requested") {
		t.Errorf("missing signal reason, got: %q", got)
	}
}

func TestRunComplete_JSONL(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout), WithJSONL(true))

	o.RunComplete(RunResult{
		EpicID:         "epic-1",
		Iterations:     3,
		TotalTokens:    5000,
		TotalCost:      0.1234,
		Duration:       150 * time.Second,
		CompletedTasks: []string{"t1", "t2"},
		ExitReason:     "done",
		Signal:         "stop",
		SignalReason:   "user",
	})

	got := stdout.String()
	// Should be valid JSON
	var parsed map[string]any
	if err := json.Unmarshal([]byte(got), &parsed); err != nil {
		t.Fatalf("invalid JSON: %v\noutput: %q", err, got)
	}
	if parsed["epic_id"] != "epic-1" {
		t.Errorf("epic_id = %v", parsed["epic_id"])
	}
	if parsed["iterations"].(float64) != 3 {
		t.Errorf("iterations = %v", parsed["iterations"])
	}
	if parsed["exit_reason"] != "done" {
		t.Errorf("exit_reason = %v", parsed["exit_reason"])
	}
	if parsed["signal"] != "stop" {
		t.Errorf("signal = %v", parsed["signal"])
	}
	// Should NOT contain human-readable output
	if strings.Contains(got, "=== Run Complete ===") {
		t.Error("human output should be suppressed in JSONL mode")
	}
}

func TestRunComplete_JSONL_OmitsEmptySignal(t *testing.T) {
	var stdout bytes.Buffer
	o := New(WithStdout(&stdout), WithJSONL(true))

	o.RunComplete(RunResult{
		EpicID:     "epic-1",
		Iterations: 1,
		ExitReason: "done",
	})

	got := stdout.String()
	if strings.Contains(got, `"signal"`) {
		t.Errorf("empty signal should be omitted from JSONL: %s", got)
	}
}
