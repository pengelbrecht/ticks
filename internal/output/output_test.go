package output

import (
	"bytes"
	"errors"
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
func (m *mockRunLogSink) LogIterationEnd(iteration int, taskID string, duration time.Duration, tokensIn, tokensOut int, cost float64, err error) {
	m.calls = append(m.calls, logCall{"LogIterationEnd", []any{iteration, taskID}})
}
func (m *mockRunLogSink) LogContextGenerationStarted(epicID string, taskCount int) {
	m.calls = append(m.calls, logCall{"LogContextGenerationStarted", []any{epicID, taskCount}})
}
func (m *mockRunLogSink) LogContextGenerationCompleted(epicID string, tokenCount int) {
	m.calls = append(m.calls, logCall{"LogContextGenerationCompleted", []any{epicID, tokenCount}})
}
func (m *mockRunLogSink) LogContextSkipped(epicID string, reason string, tokenCount int) {
	m.calls = append(m.calls, logCall{"LogContextSkipped", []any{epicID, reason}})
}
func (m *mockRunLogSink) LogContextLoadFailed(epicID string, err string) {
	m.calls = append(m.calls, logCall{"LogContextLoadFailed", []any{epicID, err}})
}
func (m *mockRunLogSink) LogRunEnd(epicID string, iterations int, totalTokens int, totalCost float64, duration time.Duration, signal, exitReason string) {
	m.calls = append(m.calls, logCall{"LogRunEnd", []any{epicID, iterations}})
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
