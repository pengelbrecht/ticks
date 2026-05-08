package runstate

import (
	"encoding/json"
	"sync"
	"testing"
	"time"
)

func TestNewBuilder(t *testing.T) {
	b := NewBuilder("abc123")
	vm := b.Snapshot()

	if vm.EpicID != "abc123" {
		t.Errorf("EpicID = %q, want %q", vm.EpicID, "abc123")
	}
	if vm.Phase != PhaseStarting {
		t.Errorf("Phase = %q, want %q", vm.Phase, PhaseStarting)
	}
	if vm.Wave != 0 {
		t.Errorf("Wave = %d, want 0", vm.Wave)
	}
	if len(vm.Tasks) != 0 {
		t.Errorf("Tasks = %d, want 0", len(vm.Tasks))
	}
	if vm.StartedAt.IsZero() {
		t.Error("StartedAt should not be zero")
	}
}

func TestPhaseTransitions(t *testing.T) {
	b := NewBuilder("e1")

	tests := []struct {
		phase Phase
	}{
		{PhaseContextGenerating},
		{PhaseRunning},
		{PhaseIdle},
		{PhaseWrapUp},
		{PhaseDone},
	}

	for _, tt := range tests {
		b.SetPhase(tt.phase)
		vm := b.Snapshot()
		if vm.Phase != tt.phase {
			t.Errorf("Phase = %q, want %q", vm.Phase, tt.phase)
		}
	}
}

func TestRegisterTask(t *testing.T) {
	b := NewBuilder("e1")

	b.RegisterTask("t1", "Task One", nil, "")
	b.RegisterTask("t2", "Task Two", []string{"t1"}, "")
	b.RegisterTask("t3", "Task Three", nil, "approval")

	vm := b.Snapshot()
	if len(vm.Tasks) != 3 {
		t.Fatalf("Tasks = %d, want 3", len(vm.Tasks))
	}

	// t1: ready (no blockers, no awaiting)
	if vm.Tasks[0].State != TaskReady {
		t.Errorf("t1 state = %q, want %q", vm.Tasks[0].State, TaskReady)
	}

	// t2: blocked (has blocker t1)
	if vm.Tasks[1].State != TaskBlocked {
		t.Errorf("t2 state = %q, want %q", vm.Tasks[1].State, TaskBlocked)
	}
	if len(vm.Tasks[1].BlockedBy) != 1 || vm.Tasks[1].BlockedBy[0] != "t1" {
		t.Errorf("t2 BlockedBy = %v, want [t1]", vm.Tasks[1].BlockedBy)
	}

	// t3: awaiting (has awaiting type)
	if vm.Tasks[2].State != TaskAwaiting {
		t.Errorf("t3 state = %q, want %q", vm.Tasks[2].State, TaskAwaiting)
	}
	if vm.Tasks[2].AwaitingType != "approval" {
		t.Errorf("t3 AwaitingType = %q, want %q", vm.Tasks[2].AwaitingType, "approval")
	}
}

func TestTaskLifecycle(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Task One", nil, "")

	// Start wave
	b.RecordWave(1, []string{"t1"})
	b.RecordTaskStart("t1", "Task One")

	vm := b.Snapshot()
	if vm.Wave != 1 {
		t.Errorf("Wave = %d, want 1", vm.Wave)
	}
	tv := vm.TaskByID("t1")
	if tv == nil {
		t.Fatal("TaskByID returned nil")
	}
	if tv.State != TaskRunning {
		t.Errorf("state = %q, want %q", tv.State, TaskRunning)
	}
	if tv.Wave != 1 {
		t.Errorf("task wave = %d, want 1", tv.Wave)
	}
	if len(vm.ActiveTaskIDs) != 1 || vm.ActiveTaskIDs[0] != "t1" {
		t.Errorf("ActiveTaskIDs = %v, want [t1]", vm.ActiveTaskIDs)
	}

	// Complete the task
	b.RecordTaskEnd(RecordTaskEndParams{
		TaskID:   "t1",
		TokensIn: 1000, TokensOut: 500,
		Cost:     0.05,
		Duration: 10 * time.Second,
		Closed:   true,
	})

	vm = b.Snapshot()
	tv = vm.TaskByID("t1")
	if tv.State != TaskCompleted {
		t.Errorf("state = %q, want %q", tv.State, TaskCompleted)
	}
	if tv.Attempts != 1 {
		t.Errorf("Attempts = %d, want 1", tv.Attempts)
	}
	if tv.TokensIn != 1000 {
		t.Errorf("TokensIn = %d, want 1000", tv.TokensIn)
	}
	if len(vm.ActiveTaskIDs) != 0 {
		t.Errorf("ActiveTaskIDs = %v, want empty", vm.ActiveTaskIDs)
	}
	if len(vm.CompletedTasks) != 1 || vm.CompletedTasks[0] != "t1" {
		t.Errorf("CompletedTasks = %v, want [t1]", vm.CompletedTasks)
	}
}

func TestTaskFailure(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Failing Task", nil, "")

	b.RecordWave(1, []string{"t1"})
	b.RecordTaskStart("t1", "Failing Task")
	b.RecordTaskEnd(RecordTaskEndParams{
		TaskID:   "t1",
		Duration: 5 * time.Second,
		Error:    "agent crashed",
	})

	vm := b.Snapshot()
	tv := vm.TaskByID("t1")
	if tv.State != TaskFailed {
		t.Errorf("state = %q, want %q", tv.State, TaskFailed)
	}
	if tv.Error != "agent crashed" {
		t.Errorf("Error = %q, want %q", tv.Error, "agent crashed")
	}
}

func TestTaskTimeout(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Slow Task", nil, "")

	b.RecordWave(1, []string{"t1"})
	b.RecordTaskStart("t1", "Slow Task")
	b.RecordTaskEnd(RecordTaskEndParams{
		TaskID:    "t1",
		Duration:  30 * time.Minute,
		Error:     "timeout",
		IsTimeout: true,
	})

	vm := b.Snapshot()
	tv := vm.TaskByID("t1")
	if !tv.IsTimeout {
		t.Error("IsTimeout should be true")
	}
	if tv.State != TaskFailed {
		t.Errorf("state = %q, want %q", tv.State, TaskFailed)
	}
}

func TestSignals(t *testing.T) {
	b := NewBuilder("e1")
	b.SetPhase(PhaseRunning)
	b.RecordWave(1, nil)

	b.RecordSignal("INPUT_NEEDED", "what color?", "t1")
	b.RecordSignal("ESCALATE", "blocked on API", "t2")

	vm := b.Snapshot()
	if len(vm.Signals) != 2 {
		t.Fatalf("Signals = %d, want 2", len(vm.Signals))
	}
	// Most recent first
	if vm.Signals[0].Signal != "ESCALATE" {
		t.Errorf("Signals[0] = %q, want ESCALATE", vm.Signals[0].Signal)
	}
	if vm.Signals[1].Signal != "INPUT_NEEDED" {
		t.Errorf("Signals[1] = %q, want INPUT_NEEDED", vm.Signals[1].Signal)
	}
}

func TestContextEvents(t *testing.T) {
	b := NewBuilder("e1")

	b.SetContextGenerating(5)
	vm := b.Snapshot()
	if vm.Context.Status != "generating" {
		t.Errorf("Context.Status = %q, want generating", vm.Context.Status)
	}
	if vm.Context.TaskCount != 5 {
		t.Errorf("Context.TaskCount = %d, want 5", vm.Context.TaskCount)
	}

	b.SetContextGenerated(2000)
	vm = b.Snapshot()
	if vm.Context.Status != "generated" {
		t.Errorf("Context.Status = %q, want generated", vm.Context.Status)
	}
	if vm.Context.TokenCount != 2000 {
		t.Errorf("Context.TokenCount = %d, want 2000", vm.Context.TokenCount)
	}
}

func TestContextFailed(t *testing.T) {
	b := NewBuilder("e1")

	b.SetContextFailed("model error")
	vm := b.Snapshot()
	if vm.Context.Status != "failed" {
		t.Errorf("Context.Status = %q, want failed", vm.Context.Status)
	}
	if vm.Context.Error != "model error" {
		t.Errorf("Context.Error = %q, want 'model error'", vm.Context.Error)
	}
}

func TestBudgetView(t *testing.T) {
	b := NewBuilder("e1")
	b.SetBudget(50, 10.0)
	b.RecordWave(3, nil)

	vm := b.Snapshot()
	if vm.Budget.MaxIterations != 50 {
		t.Errorf("MaxIterations = %d, want 50", vm.Budget.MaxIterations)
	}
	if vm.Budget.MaxCost != 10.0 {
		t.Errorf("MaxCost = %f, want 10.0", vm.Budget.MaxCost)
	}
	if vm.Budget.IterationsUsed != 3 {
		t.Errorf("IterationsUsed = %d, want 3", vm.Budget.IterationsUsed)
	}
	if vm.Budget.IterationsRemaining() != 47 {
		t.Errorf("IterationsRemaining = %d, want 47", vm.Budget.IterationsRemaining())
	}
}

func TestBudgetUnlimited(t *testing.T) {
	b := NewBuilder("e1")
	// Don't call SetBudget → 0 = unlimited

	vm := b.Snapshot()
	if vm.Budget.IterationsRemaining() != -1 {
		t.Errorf("IterationsRemaining = %d, want -1 (unlimited)", vm.Budget.IterationsRemaining())
	}
	if vm.Budget.CostRemaining() != -1 {
		t.Errorf("CostRemaining = %f, want -1 (unlimited)", vm.Budget.CostRemaining())
	}
}

func TestMetricsAggregation(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Task 1", nil, "")
	b.RegisterTask("t2", "Task 2", nil, "")
	b.RegisterTask("t3", "Task 3", nil, "approval")

	// Complete t1
	b.RecordWave(1, []string{"t1", "t2"})
	b.RecordTaskStart("t1", "Task 1")
	b.RecordTaskEnd(RecordTaskEndParams{
		TaskID: "t1", TokensIn: 100, TokensOut: 50,
		Cost: 0.01, Duration: 5 * time.Second, Closed: true,
	})

	// Fail t2
	b.RecordTaskStart("t2", "Task 2")
	b.RecordTaskEnd(RecordTaskEndParams{
		TaskID: "t2", TokensIn: 200, TokensOut: 100,
		Cost: 0.02, Duration: 3 * time.Second, Error: "crash",
	})

	vm := b.Snapshot()
	m := vm.Metrics
	if m.TotalTokensIn != 300 {
		t.Errorf("TotalTokensIn = %d, want 300", m.TotalTokensIn)
	}
	if m.TotalTokensOut != 150 {
		t.Errorf("TotalTokensOut = %d, want 150", m.TotalTokensOut)
	}
	if m.TasksCompleted != 1 {
		t.Errorf("TasksCompleted = %d, want 1", m.TasksCompleted)
	}
	if m.TasksFailed != 1 {
		t.Errorf("TasksFailed = %d, want 1", m.TasksFailed)
	}
	if m.TasksAwaiting != 1 {
		t.Errorf("TasksAwaiting = %d, want 1", m.TasksAwaiting)
	}
}

func TestDone(t *testing.T) {
	b := NewBuilder("e1")
	b.SetDone("all tasks completed", "")

	vm := b.Snapshot()
	if vm.Phase != PhaseDone {
		t.Errorf("Phase = %q, want %q", vm.Phase, PhaseDone)
	}
	if vm.ExitReason != "all tasks completed" {
		t.Errorf("ExitReason = %q, want %q", vm.ExitReason, "all tasks completed")
	}
}

func TestDoneWithError(t *testing.T) {
	b := NewBuilder("e1")
	b.SetDone("budget exceeded", "max cost reached")

	vm := b.Snapshot()
	if vm.Error != "max cost reached" {
		t.Errorf("Error = %q, want 'max cost reached'", vm.Error)
	}
}

func TestIsRunning(t *testing.T) {
	b := NewBuilder("e1")

	// Starting → not running
	if b.Snapshot().IsRunning() {
		t.Error("Starting phase should not be running")
	}

	b.SetPhase(PhaseRunning)
	if !b.Snapshot().IsRunning() {
		t.Error("Running phase should be running")
	}

	b.SetPhase(PhaseIdle)
	if b.Snapshot().IsRunning() {
		t.Error("Idle phase should not be running")
	}

	b.SetPhase(PhaseWrapUp)
	if !b.Snapshot().IsRunning() {
		t.Error("WrapUp phase should be running")
	}

	b.SetPhase(PhaseDone)
	if b.Snapshot().IsRunning() {
		t.Error("Done phase should not be running")
	}
}

func TestProgress(t *testing.T) {
	b := NewBuilder("e1")

	// No tasks → 0
	if b.Snapshot().Progress() != 0 {
		t.Errorf("Progress with no tasks = %f, want 0", b.Snapshot().Progress())
	}

	b.RegisterTask("t1", "Task 1", nil, "")
	b.RegisterTask("t2", "Task 2", nil, "")

	// 0/2 complete
	if b.Snapshot().Progress() != 0 {
		t.Errorf("Progress 0/2 = %f, want 0", b.Snapshot().Progress())
	}

	// Complete one
	b.RecordWave(1, []string{"t1"})
	b.RecordTaskStart("t1", "Task 1")
	b.RecordTaskEnd(RecordTaskEndParams{TaskID: "t1", Closed: true})

	p := b.Snapshot().Progress()
	if p != 0.5 {
		t.Errorf("Progress 1/2 = %f, want 0.5", p)
	}
}

func TestTaskByID(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Task 1", nil, "")

	vm := b.Snapshot()
	if vm.TaskByID("t1") == nil {
		t.Error("TaskByID(t1) should not be nil")
	}
	if vm.TaskByID("nonexistent") != nil {
		t.Error("TaskByID(nonexistent) should be nil")
	}
}

func TestJSON(t *testing.T) {
	b := NewBuilder("e1")
	b.SetEpicTitle("My Epic")
	b.RegisterTask("t1", "Task 1", nil, "")

	vm := b.Snapshot()
	data, err := vm.JSON()
	if err != nil {
		t.Fatalf("JSON() error: %v", err)
	}

	// Verify it's valid JSON
	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("JSON output is invalid: %v", err)
	}

	if parsed["epic_id"] != "e1" {
		t.Errorf("JSON epic_id = %v, want e1", parsed["epic_id"])
	}
	if parsed["epic_title"] != "My Epic" {
		t.Errorf("JSON epic_title = %v, want My Epic", parsed["epic_title"])
	}
}

func TestSnapshotImmutability(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Task 1", nil, "")

	vm1 := b.Snapshot()

	// Mutate after snapshot
	b.RecordWave(1, []string{"t1"})
	b.RecordTaskStart("t1", "Task 1")

	// vm1 should still show ready state
	if vm1.TaskByID("t1").State != TaskReady {
		t.Error("Snapshot should be immutable - t1 should still be ready")
	}
	if vm1.Wave != 0 {
		t.Error("Snapshot should be immutable - wave should still be 0")
	}

	// New snapshot should show running
	vm2 := b.Snapshot()
	if vm2.TaskByID("t1").State != TaskRunning {
		t.Error("New snapshot should show t1 as running")
	}
}

func TestConcurrentAccess(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Task 1", nil, "")
	b.RegisterTask("t2", "Task 2", nil, "")

	var wg sync.WaitGroup

	// Writer goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		for i := 0; i < 100; i++ {
			b.RecordWave(i+1, []string{"t1"})
			b.RecordTaskStart("t1", "Task 1")
			b.RecordTaskEnd(RecordTaskEndParams{
				TaskID: "t1", TokensIn: 10, TokensOut: 5, Cost: 0.001,
			})
		}
	}()

	// Reader goroutines
	for j := 0; j < 5; j++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < 100; i++ {
				vm := b.Snapshot()
				_ = vm.IsRunning()
				_ = vm.Progress()
				_ = vm.TaskByID("t1")
			}
		}()
	}

	wg.Wait()
}

func TestUpdateTaskLive(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Task 1", nil, "")

	b.RecordWave(1, []string{"t1"})
	b.RecordTaskStart("t1", "Task 1")

	tool := &ToolView{Name: "Edit", Input: "file.go"}
	b.UpdateTaskLive("t1", 5, tool)

	vm := b.Snapshot()
	tv := vm.TaskByID("t1")
	if tv.NumTurns != 5 {
		t.Errorf("NumTurns = %d, want 5", tv.NumTurns)
	}
	if tv.ActiveTool == nil || tv.ActiveTool.Name != "Edit" {
		t.Errorf("ActiveTool = %v, want Edit", tv.ActiveTool)
	}
}

func TestTaskRetryAccumulatesMetrics(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Retry Task", nil, "")

	// First attempt fails
	b.RecordWave(1, []string{"t1"})
	b.RecordTaskStart("t1", "Retry Task")
	b.RecordTaskEnd(RecordTaskEndParams{
		TaskID: "t1", TokensIn: 100, TokensOut: 50, Cost: 0.01,
		Duration: 5 * time.Second, Error: "oops",
	})

	// Second attempt succeeds
	b.RecordWave(2, []string{"t1"})
	b.RecordTaskStart("t1", "Retry Task")
	b.RecordTaskEnd(RecordTaskEndParams{
		TaskID: "t1", TokensIn: 200, TokensOut: 100, Cost: 0.02,
		Duration: 10 * time.Second, Closed: true,
	})

	vm := b.Snapshot()
	tv := vm.TaskByID("t1")
	if tv.Attempts != 2 {
		t.Errorf("Attempts = %d, want 2", tv.Attempts)
	}
	if tv.TokensIn != 300 {
		t.Errorf("TokensIn = %d, want 300 (accumulated)", tv.TokensIn)
	}
	if tv.Cost != 0.03 {
		t.Errorf("Cost = %f, want 0.03 (accumulated)", tv.Cost)
	}
	if tv.State != TaskCompleted {
		t.Errorf("State = %q, want completed", tv.State)
	}
}

func TestRecordTaskSkipped(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Skipped Task", nil, "")

	b.RecordTaskSkipped("t1", "policy limit")

	vm := b.Snapshot()
	tv := vm.TaskByID("t1")
	if tv.State != TaskSkipped {
		t.Errorf("State = %q, want skipped", tv.State)
	}
	if tv.Error != "policy limit" {
		t.Errorf("Error = %q, want 'policy limit'", tv.Error)
	}
}

func TestRecordTaskAwaiting(t *testing.T) {
	b := NewBuilder("e1")
	b.RegisterTask("t1", "Task 1", nil, "")

	b.RecordWave(1, []string{"t1"})
	b.RecordTaskStart("t1", "Task 1")
	b.RecordTaskEnd(RecordTaskEndParams{TaskID: "t1"})
	b.RecordTaskAwaiting("t1", "review")

	vm := b.Snapshot()
	tv := vm.TaskByID("t1")
	if tv.State != TaskAwaiting {
		t.Errorf("State = %q, want awaiting", tv.State)
	}
	if tv.AwaitingType != "review" {
		t.Errorf("AwaitingType = %q, want review", tv.AwaitingType)
	}
}

func TestTaskStartAutoRegisters(t *testing.T) {
	b := NewBuilder("e1")
	// Don't call RegisterTask - RecordTaskStart should auto-create
	b.RecordWave(1, []string{"t1"})
	b.RecordTaskStart("t1", "Auto Task")

	vm := b.Snapshot()
	if len(vm.Tasks) != 1 {
		t.Fatalf("Tasks = %d, want 1", len(vm.Tasks))
	}
	if vm.Tasks[0].Title != "Auto Task" {
		t.Errorf("Title = %q, want 'Auto Task'", vm.Tasks[0].Title)
	}
}

func TestSetEpicTitle(t *testing.T) {
	b := NewBuilder("e1")
	b.SetEpicTitle("My Epic Title")

	vm := b.Snapshot()
	if vm.EpicTitle != "My Epic Title" {
		t.Errorf("EpicTitle = %q, want 'My Epic Title'", vm.EpicTitle)
	}
}

func TestLifecycleEvents(t *testing.T) {
	b := NewBuilder("e1")

	// Record a few lifecycle events
	b.RecordLifecycleEvent(LifecycleWorktree, "Worktree created", "/tmp/wt")
	b.RecordLifecycleEvent(LifecycleTick, "Tick launched: Fix bug", "t1")
	b.RecordLifecycleEvent(LifecycleMerge, "Merged to main", "")

	vm := b.Snapshot()
	if len(vm.Events) != 3 {
		t.Fatalf("Events = %d, want 3", len(vm.Events))
	}

	// Most recent first
	if vm.Events[0].Category != LifecycleMerge {
		t.Errorf("Events[0].Category = %q, want %q", vm.Events[0].Category, LifecycleMerge)
	}
	if vm.Events[0].Message != "Merged to main" {
		t.Errorf("Events[0].Message = %q, want 'Merged to main'", vm.Events[0].Message)
	}
	if vm.Events[1].Category != LifecycleTick {
		t.Errorf("Events[1].Category = %q, want %q", vm.Events[1].Category, LifecycleTick)
	}
	if vm.Events[2].Category != LifecycleWorktree {
		t.Errorf("Events[2].Category = %q, want %q", vm.Events[2].Category, LifecycleWorktree)
	}
	if vm.Events[2].Detail != "/tmp/wt" {
		t.Errorf("Events[2].Detail = %q, want '/tmp/wt'", vm.Events[2].Detail)
	}
}

func TestLifecycleEventsCapped(t *testing.T) {
	b := NewBuilder("e1")

	// Record more than maxLifecycleEvents
	for i := 0; i < maxLifecycleEvents+20; i++ {
		b.RecordLifecycleEvent(LifecycleEngine, "event", "")
	}

	vm := b.Snapshot()
	if len(vm.Events) != maxLifecycleEvents {
		t.Errorf("Events = %d, want %d (capped)", len(vm.Events), maxLifecycleEvents)
	}
}

func TestLifecycleEventsImmutable(t *testing.T) {
	b := NewBuilder("e1")
	b.RecordLifecycleEvent(LifecycleWorktree, "first", "")

	vm1 := b.Snapshot()

	b.RecordLifecycleEvent(LifecycleMerge, "second", "")

	// vm1 should still have only 1 event
	if len(vm1.Events) != 1 {
		t.Errorf("Snapshot should be immutable: Events = %d, want 1", len(vm1.Events))
	}

	vm2 := b.Snapshot()
	if len(vm2.Events) != 2 {
		t.Errorf("New snapshot should have 2 events, got %d", len(vm2.Events))
	}
}

func TestLifecycleEventsJSON(t *testing.T) {
	b := NewBuilder("e1")
	b.RecordLifecycleEvent(LifecycleWorktree, "Worktree created", "/tmp/wt")

	vm := b.Snapshot()
	data, err := vm.JSON()
	if err != nil {
		t.Fatalf("JSON() error: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("JSON output is invalid: %v", err)
	}

	events, ok := parsed["events"].([]interface{})
	if !ok || len(events) != 1 {
		t.Fatalf("Expected 1 event in JSON, got %v", parsed["events"])
	}

	evt := events[0].(map[string]interface{})
	if evt["category"] != "worktree" {
		t.Errorf("event category = %v, want worktree", evt["category"])
	}
	if evt["message"] != "Worktree created" {
		t.Errorf("event message = %v, want 'Worktree created'", evt["message"])
	}
}
