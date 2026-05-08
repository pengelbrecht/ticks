package output

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/runstate"
)

func TestStatusSink_BasicFlow(t *testing.T) {
	var buf bytes.Buffer
	sink := NewStatusSink("test-epic", &buf, 60)

	// Set title
	sink.OnEpicTitle("My Epic")

	// Register tasks
	b := sink.Builder()
	b.RegisterTask("t1", "Task One", nil, "")
	b.RegisterTask("t2", "Task Two", nil, "")

	// Simulate wave start
	sink.OnWaveStarted(1, []string{"t1"})

	output := buf.String()
	if !strings.Contains(output, "My Epic") {
		t.Errorf("expected epic title in output, got:\n%s", output)
	}
}

func TestStatusSink_TaskLifecycle(t *testing.T) {
	var buf bytes.Buffer
	sink := NewStatusSink("test-epic", &buf, 60)

	b := sink.Builder()
	b.RegisterTask("t1", "Task One", nil, "")

	sink.OnWaveStarted(1, []string{"t1"})
	sink.OnTaskStarted(1, "t1", "Task One")

	// Verify running state
	vm := b.Snapshot()
	tv := vm.TaskByID("t1")
	if tv == nil {
		t.Fatal("expected task t1 in snapshot")
	}
	if tv.State != runstate.TaskRunning {
		t.Errorf("expected TaskRunning, got %s", tv.State)
	}

	// Complete task
	sink.OnTaskCompleted(IterationResult{
		TaskID:   "t1",
		TokensIn: 100,
		Cost:     0.01,
		Duration: 30 * time.Second,
	})

	// Mark closed
	sink.OnTaskClosed("t1")

	vm = b.Snapshot()
	tv = vm.TaskByID("t1")
	if tv.State != runstate.TaskCompleted {
		t.Errorf("expected TaskCompleted after close, got %s", tv.State)
	}
}

func TestStatusSink_SignalRecording(t *testing.T) {
	var buf bytes.Buffer
	sink := NewStatusSink("test-epic", &buf, 60)

	sink.OnSignal("INPUT_NEEDED", "What API key?", "t1")

	vm := sink.Builder().Snapshot()
	if len(vm.Signals) != 1 {
		t.Fatalf("expected 1 signal, got %d", len(vm.Signals))
	}
	if vm.Signals[0].Signal != "INPUT_NEEDED" {
		t.Errorf("expected INPUT_NEEDED, got %s", vm.Signals[0].Signal)
	}
}

func TestStatusSink_RunComplete(t *testing.T) {
	var buf bytes.Buffer
	sink := NewStatusSink("test-epic", &buf, 60)

	sink.OnRunComplete(RunResult{
		EpicID:     "test-epic",
		ExitReason: "all tasks completed",
	})

	vm := sink.Builder().Snapshot()
	if vm.Phase != runstate.PhaseDone {
		t.Errorf("expected PhaseDone, got %s", vm.Phase)
	}
	if vm.ExitReason != "all tasks completed" {
		t.Errorf("expected exit reason, got %s", vm.ExitReason)
	}
}

func TestStatusSink_RefreshStopClean(t *testing.T) {
	var buf bytes.Buffer
	sink := NewStatusSink("test-epic", &buf, 60)

	stop := sink.StartRefresh(50 * time.Millisecond)
	time.Sleep(120 * time.Millisecond) // Let a few ticks happen
	stop()

	// Verify no panic and output was written
	if buf.Len() == 0 {
		t.Error("expected some output from refresh")
	}
}

func TestStatusSink_BudgetConfig(t *testing.T) {
	var buf bytes.Buffer
	sink := NewStatusSink("test-epic", &buf, 60)

	sink.OnBudgetConfig(50, 10.0)

	vm := sink.Builder().Snapshot()
	if vm.Budget.MaxIterations != 50 {
		t.Errorf("expected 50 max iterations, got %d", vm.Budget.MaxIterations)
	}
	if vm.Budget.MaxCost != 10.0 {
		t.Errorf("expected 10.0 max cost, got %f", vm.Budget.MaxCost)
	}
}
