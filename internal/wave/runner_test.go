package wave

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/runrecord"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// mockAgent implements agent.Agent for testing.
type mockAgent struct {
	mu       sync.Mutex
	runFunc  func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error)
	runCount int
}

func (m *mockAgent) Name() string     { return "mock" }
func (m *mockAgent) Available() bool   { return true }
func (m *mockAgent) Run(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
	m.mu.Lock()
	m.runCount++
	m.mu.Unlock()

	if m.runFunc != nil {
		return m.runFunc(ctx, prompt, opts)
	}
	return &agent.Result{Output: "done", Duration: 100 * time.Millisecond}, nil
}

func (m *mockAgent) RunCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.runCount
}

func TestRunWave_SingleTask(t *testing.T) {
	ma := &mockAgent{
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			return &agent.Result{
				Output:    "task completed successfully",
				TokensIn:  1000,
				TokensOut: 500,
				Cost:      0.05,
				Duration:  200 * time.Millisecond,
			}, nil
		},
	}

	r := &Runner{
		Agent:   ma,
		WorkDir: "/tmp/test",
		Timeout: 30 * time.Second,
	}

	w := Wave{
		Number: 1,
		Tasks: []*tick.Tick{
			{ID: "t1", Title: "Test task", Description: "Do something"},
		},
	}

	results := r.RunWave(context.Background(), w)

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	res := results[0]
	if res.TaskID != "t1" {
		t.Errorf("expected task ID t1, got %s", res.TaskID)
	}
	if !res.Success {
		t.Errorf("expected success, got failure: %v", res.Error)
	}
	if res.Output != "task completed successfully" {
		t.Errorf("unexpected output: %s", res.Output)
	}
	if res.TokensIn != 1000 {
		t.Errorf("expected 1000 input tokens, got %d", res.TokensIn)
	}
	if res.TokensOut != 500 {
		t.Errorf("expected 500 output tokens, got %d", res.TokensOut)
	}
	if res.Cost != 0.05 {
		t.Errorf("expected cost 0.05, got %f", res.Cost)
	}
}

func TestRunWave_ParallelExecution(t *testing.T) {
	var running atomic.Int32
	var maxConcurrent atomic.Int32

	ma := &mockAgent{
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			cur := running.Add(1)
			// Track max concurrency.
			for {
				old := maxConcurrent.Load()
				if cur <= old || maxConcurrent.CompareAndSwap(old, cur) {
					break
				}
			}
			time.Sleep(50 * time.Millisecond)
			running.Add(-1)
			return &agent.Result{Output: "done", Duration: 50 * time.Millisecond}, nil
		},
	}

	r := &Runner{
		Agent:   ma,
		WorkDir: "/tmp/test",
		Timeout: 30 * time.Second,
	}

	tasks := make([]*tick.Tick, 5)
	for i := range tasks {
		tasks[i] = &tick.Tick{ID: fmt.Sprintf("t%d", i), Title: fmt.Sprintf("Task %d", i)}
	}

	w := Wave{Number: 1, Tasks: tasks}
	results := r.RunWave(context.Background(), w)

	if len(results) != 5 {
		t.Fatalf("expected 5 results, got %d", len(results))
	}

	// Verify all succeeded.
	for i, res := range results {
		if !res.Success {
			t.Errorf("task %d failed: %v", i, res.Error)
		}
		if res.TaskID != fmt.Sprintf("t%d", i) {
			t.Errorf("result %d has wrong task ID: %s", i, res.TaskID)
		}
	}

	// Verify parallel execution occurred.
	if maxConcurrent.Load() < 2 {
		t.Errorf("expected at least 2 concurrent tasks, got %d", maxConcurrent.Load())
	}

	if ma.RunCount() != 5 {
		t.Errorf("expected 5 agent runs, got %d", ma.RunCount())
	}
}

func TestRunWave_ContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())

	ma := &mockAgent{
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(5 * time.Second):
				return &agent.Result{Output: "done"}, nil
			}
		},
	}

	r := &Runner{
		Agent:   ma,
		WorkDir: "/tmp/test",
	}

	w := Wave{
		Number: 1,
		Tasks: []*tick.Tick{
			{ID: "t1", Title: "Task 1"},
			{ID: "t2", Title: "Task 2"},
		},
	}

	// Cancel after a short delay.
	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	results := r.RunWave(ctx, w)

	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}

	for _, res := range results {
		if res.Success {
			t.Errorf("expected failure due to cancellation for task %s", res.TaskID)
		}
		if res.Error == nil {
			t.Errorf("expected error for task %s", res.TaskID)
		}
	}
}

func TestRunWave_OutputCaptured(t *testing.T) {
	// Signal parsing is now done by the engine after RunWave returns.
	// This test verifies that output containing signals is properly captured.
	tests := []struct {
		name   string
		output string
	}{
		{
			name:   "output with complete signal",
			output: "All done! <promise>COMPLETE</promise>",
		},
		{
			name:   "output with eject signal",
			output: "Cannot proceed. <promise>EJECT: missing credentials</promise>",
		},
		{
			name:   "plain output",
			output: "Just some regular output",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ma := &mockAgent{
				runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
					return &agent.Result{Output: tt.output, Duration: 10 * time.Millisecond}, nil
				},
			}

			r := &Runner{Agent: ma, WorkDir: "/tmp/test"}
			w := Wave{
				Number: 1,
				Tasks:  []*tick.Tick{{ID: "t1", Title: "Test"}},
			}

			results := r.RunWave(context.Background(), w)

			if results[0].Output != tt.output {
				t.Errorf("expected output %q, got %q", tt.output, results[0].Output)
			}
		})
	}
}

func TestRunWave_StateCallback(t *testing.T) {
	var callbackCalled atomic.Int32

	ma := &mockAgent{
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			// Simulate the agent calling StateCallback.
			if opts.StateCallback != nil {
				opts.StateCallback(agent.AgentStateSnapshot{
					Output: "working...",
				})
				callbackCalled.Add(1)
			}
			return &agent.Result{Output: "done", Duration: 10 * time.Millisecond}, nil
		},
	}

	// Use a temp dir for the record store.
	store := runrecord.NewStore(t.TempDir())

	r := &Runner{
		Agent:       ma,
		WorkDir:     "/tmp/test",
		RecordStore: store,
	}

	w := Wave{
		Number: 1,
		Tasks:  []*tick.Tick{{ID: "t1", Title: "Test"}},
	}

	results := r.RunWave(context.Background(), w)

	if !results[0].Success {
		t.Fatalf("expected success, got error: %v", results[0].Error)
	}

	if callbackCalled.Load() == 0 {
		t.Error("expected StateCallback to be called at least once")
	}

	// Verify a live record was written.
	if !store.LiveExists("t1") {
		t.Error("expected live record to be written for task t1")
	}
}

func TestRunWave_AgentError(t *testing.T) {
	ma := &mockAgent{
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			return nil, errors.New("agent crashed")
		},
	}

	r := &Runner{Agent: ma, WorkDir: "/tmp/test"}
	w := Wave{
		Number: 1,
		Tasks:  []*tick.Tick{{ID: "t1", Title: "Test"}},
	}

	results := r.RunWave(context.Background(), w)

	if results[0].Success {
		t.Error("expected failure")
	}
	if results[0].Error == nil || results[0].Error.Error() != "agent crashed" {
		t.Errorf("expected 'agent crashed' error, got: %v", results[0].Error)
	}
}

func TestRunWave_EmptyWave(t *testing.T) {
	ma := &mockAgent{}
	r := &Runner{Agent: ma, WorkDir: "/tmp/test"}
	w := Wave{Number: 1, Tasks: nil}

	results := r.RunWave(context.Background(), w)

	if len(results) != 0 {
		t.Errorf("expected 0 results for empty wave, got %d", len(results))
	}
	if ma.RunCount() != 0 {
		t.Errorf("expected no agent runs for empty wave, got %d", ma.RunCount())
	}
}

func TestRunWave_TimeoutPartialOutput(t *testing.T) {
	ma := &mockAgent{
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			return &agent.Result{
				Output:    "partial output before timeout <promise>EJECT: took too long</promise>",
				TokensIn:  500,
				TokensOut: 200,
				Cost:      0.02,
			}, agent.ErrTimeout
		},
	}

	r := &Runner{Agent: ma, WorkDir: "/tmp/test", Timeout: 1 * time.Second}
	w := Wave{
		Number: 1,
		Tasks:  []*tick.Tick{{ID: "t1", Title: "Test"}},
	}

	results := r.RunWave(context.Background(), w)

	res := results[0]
	if res.Success {
		t.Error("expected failure on timeout")
	}
	if !errors.Is(res.Error, agent.ErrTimeout) {
		t.Errorf("expected ErrTimeout, got: %v", res.Error)
	}
	if res.Output != "partial output before timeout <promise>EJECT: took too long</promise>" {
		t.Errorf("expected partial output to be captured, got: %s", res.Output)
	}
	// Signal parsing is done by the engine, not the runner.
	// Just verify the output is captured for the engine to parse.
	if res.TokensIn != 500 {
		t.Errorf("expected 500 input tokens from partial result, got %d", res.TokensIn)
	}
}
