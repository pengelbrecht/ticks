package verify

import (
	"context"
	"testing"
	"time"
)

// mockVerifier is a test verifier that returns a configurable result.
type mockVerifier struct {
	name   string
	passed bool
	output string
	delay  time.Duration
}

func (m *mockVerifier) Name() string {
	return m.name
}

func (m *mockVerifier) Verify(ctx context.Context, taskID string, agentOutput string) *Result {
	start := time.Now()

	// Simulate delay (check for cancellation during delay)
	if m.delay > 0 {
		select {
		case <-ctx.Done():
			return &Result{
				Verifier: m.name,
				Passed:   false,
				Output:   "cancelled",
				Duration: time.Since(start),
				Error:    ctx.Err(),
			}
		case <-time.After(m.delay):
		}
	}

	return &Result{
		Verifier: m.name,
		Passed:   m.passed,
		Output:   m.output,
		Duration: time.Since(start),
	}
}

func TestRunner_Run_NoVerifiers(t *testing.T) {
	runner := NewRunner("/tmp")
	results := runner.Run(context.Background(), "task-1", "agent output")

	if !results.AllPassed {
		t.Error("Run() with no verifiers should return AllPassed=true")
	}
	if len(results.Results) != 0 {
		t.Errorf("Run() with no verifiers should return empty results, got %d", len(results.Results))
	}
}

func TestRunner_Run_AllPassing(t *testing.T) {
	runner := NewRunner("/tmp",
		&mockVerifier{name: "git", passed: true, output: "clean"},
		&mockVerifier{name: "test", passed: true, output: "ok"},
	)

	results := runner.Run(context.Background(), "task-1", "agent output")

	if !results.AllPassed {
		t.Error("Run() with all passing verifiers should return AllPassed=true")
	}
	if len(results.Results) != 2 {
		t.Errorf("Run() should return 2 results, got %d", len(results.Results))
	}
	if results.Results[0].Verifier != "git" {
		t.Errorf("First result should be 'git', got %q", results.Results[0].Verifier)
	}
	if results.Results[1].Verifier != "test" {
		t.Errorf("Second result should be 'test', got %q", results.Results[1].Verifier)
	}
}

func TestRunner_Run_SomeFailing(t *testing.T) {
	runner := NewRunner("/tmp",
		&mockVerifier{name: "git", passed: true, output: "clean"},
		&mockVerifier{name: "test", passed: false, output: "FAIL: test_foo.go"},
		&mockVerifier{name: "lint", passed: true, output: "ok"},
	)

	results := runner.Run(context.Background(), "task-1", "agent output")

	if results.AllPassed {
		t.Error("Run() with some failing verifiers should return AllPassed=false")
	}
	if len(results.Results) != 3 {
		t.Errorf("Run() should return 3 results (no short-circuit), got %d", len(results.Results))
	}

	// Verify all results collected even after failure
	if !results.Results[0].Passed {
		t.Error("First verifier (git) should pass")
	}
	if results.Results[1].Passed {
		t.Error("Second verifier (test) should fail")
	}
	if !results.Results[2].Passed {
		t.Error("Third verifier (lint) should pass")
	}
}

func TestRunner_Run_ContextCancellation(t *testing.T) {
	// Create a context that's already cancelled
	ctx, cancel := context.WithCancel(context.Background())

	runner := NewRunner("/tmp",
		&mockVerifier{name: "git", passed: true, delay: 100 * time.Millisecond},
		&mockVerifier{name: "test", passed: true, delay: 100 * time.Millisecond},
	)

	// Cancel immediately
	cancel()

	results := runner.Run(ctx, "task-1", "agent output")

	// Should return immediately with empty results since context was already cancelled
	if len(results.Results) != 0 {
		t.Errorf("Run() with pre-cancelled context should return 0 results, got %d", len(results.Results))
	}
}

func TestRunner_Run_ContextCancellationMidway(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())

	// First verifier runs fast, second is slow
	runner := NewRunner("/tmp",
		&mockVerifier{name: "git", passed: true},
		&mockVerifier{name: "slow", passed: true, delay: 500 * time.Millisecond},
		&mockVerifier{name: "never", passed: true},
	)

	// Cancel after a short delay (after first completes, during second)
	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	start := time.Now()
	results := runner.Run(ctx, "task-1", "agent output")
	elapsed := time.Since(start)

	// Should complete faster than if all verifiers ran
	if elapsed > 400*time.Millisecond {
		t.Errorf("Run() took too long after cancellation: %v", elapsed)
	}

	// Should have partial results (at least the first one that completed)
	if len(results.Results) < 1 {
		t.Error("Run() should have at least one result before cancellation")
	}
	// Should not have all 3 results
	if len(results.Results) == 3 {
		t.Error("Run() should not have completed all verifiers after cancellation")
	}
}

func TestRunner_Run_OrderPreserved(t *testing.T) {
	runner := NewRunner("/tmp",
		&mockVerifier{name: "first", passed: true},
		&mockVerifier{name: "second", passed: false},
		&mockVerifier{name: "third", passed: true},
	)

	results := runner.Run(context.Background(), "task-1", "")

	if len(results.Results) != 3 {
		t.Fatalf("Expected 3 results, got %d", len(results.Results))
	}

	expected := []string{"first", "second", "third"}
	for i, name := range expected {
		if results.Results[i].Verifier != name {
			t.Errorf("Result[%d] should be %q, got %q", i, name, results.Results[i].Verifier)
		}
	}
}

func TestRunner_Run_PassesContextToVerifiers(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Verifier with delay that checks context
	slow := &mockVerifier{name: "slow", passed: true, delay: 200 * time.Millisecond}
	runner := NewRunner("/tmp", slow)

	// Cancel during execution
	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	start := time.Now()
	results := runner.Run(ctx, "task-1", "")
	elapsed := time.Since(start)

	// Should complete fast due to cancellation inside verifier
	if elapsed > 150*time.Millisecond {
		t.Errorf("Verifier should have respected context cancellation, took %v", elapsed)
	}

	// Result should indicate cancellation
	if len(results.Results) == 1 && results.Results[0].Error != context.Canceled {
		t.Error("Result should indicate context was cancelled")
	}
}
