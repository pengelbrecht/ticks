package runstate

import (
	"strings"
	"testing"
	"time"
)

func TestRenderWidget_EmptyViewModel(t *testing.T) {
	vm := &ViewModel{
		EpicID: "test-epic",
		Phase:  PhaseStarting,
	}
	result := RenderWidget(vm, 60)
	if result == "" {
		t.Fatal("expected non-empty widget output")
	}
	if !strings.Contains(result, "test-epic") {
		t.Error("expected widget to contain epic ID")
	}
	if !strings.Contains(result, "starting") {
		t.Error("expected widget to contain phase")
	}
}

func TestRenderWidget_RunningWithTasks(t *testing.T) {
	vm := &ViewModel{
		EpicID:    "abc",
		EpicTitle: "Build the thing",
		Phase:     PhaseRunning,
		Wave:      2,
		Tasks: []TaskView{
			{ID: "t1", Title: "Task 1", State: TaskCompleted},
			{ID: "t2", Title: "Task 2", State: TaskRunning, ActiveTool: &ToolView{Name: "edit"}, NumTurns: 5},
			{ID: "t3", Title: "Task 3", State: TaskReady},
			{ID: "t4", Title: "Task 4", State: TaskBlocked, BlockedBy: []string{"t1"}},
		},
		ActiveTaskIDs: []string{"t2"},
		Metrics: RunMetrics{
			Iterations:     2,
			TotalTokensIn:  1000,
			TotalTokensOut: 500,
			TotalCost:      0.15,
			Duration:       3*time.Minute + 42*time.Second,
			TasksCompleted: 1,
			TasksFailed:    0,
			TasksAwaiting:  0,
			TasksBlocked:   1,
			TasksRemaining: 1,
		},
		Budget: BudgetView{
			MaxIterations:  50,
			IterationsUsed: 2,
		},
		StartedAt:  time.Now().Add(-3*time.Minute - 42*time.Second),
		SnapshotAt: time.Now(),
	}

	result := RenderWidget(vm, 70)

	// Check key elements
	checks := []string{
		"Build the thing",
		"running",
		"1/4 tasks",
		"wave 2",
		"Task 2",
		"edit",
		"blocked",
		"ready",
		"Budget",
	}
	for _, check := range checks {
		if !strings.Contains(result, check) {
			t.Errorf("expected widget to contain %q, got:\n%s", check, result)
		}
	}
}

func TestRenderWidget_DonePhase(t *testing.T) {
	vm := &ViewModel{
		EpicID:     "done-epic",
		EpicTitle:  "Finished epic",
		Phase:      PhaseDone,
		ExitReason: "all tasks completed",
		Tasks: []TaskView{
			{ID: "t1", State: TaskCompleted},
		},
		Metrics: RunMetrics{
			TasksCompleted: 1,
		},
	}

	result := RenderWidget(vm, 60)
	if !strings.Contains(result, "done") {
		t.Error("expected done phase")
	}
	if !strings.Contains(result, "all tasks completed") {
		t.Error("expected exit reason")
	}
}

func TestRenderWidget_WithSignals(t *testing.T) {
	vm := &ViewModel{
		EpicID: "sig-epic",
		Phase:  PhaseRunning,
		Signals: []SignalEvent{
			{Signal: "INPUT_NEEDED", Reason: "Need API key", TaskID: "t1", Wave: 1},
		},
	}

	result := RenderWidget(vm, 60)
	if !strings.Contains(result, "INPUT_NEEDED") {
		t.Error("expected signal in widget")
	}
	if !strings.Contains(result, "Need API key") {
		t.Error("expected signal reason in widget")
	}
}

func TestRenderWidget_ContextGenerating(t *testing.T) {
	vm := &ViewModel{
		EpicID: "ctx-epic",
		Phase:  PhaseContextGenerating,
		Context: ContextView{
			Status:    "generating",
			TaskCount: 5,
		},
	}

	result := RenderWidget(vm, 60)
	if !strings.Contains(result, "context") {
		t.Error("expected context status in widget")
	}
}

func TestRenderWidget_ProgressBar(t *testing.T) {
	// 50% complete
	result := renderProgress(0.5, 50)
	if !strings.Contains(result, "50%") {
		t.Errorf("expected 50%%, got %s", result)
	}
	if !strings.Contains(result, "█") {
		t.Error("expected filled blocks in progress bar")
	}
	if !strings.Contains(result, "░") {
		t.Error("expected empty blocks in progress bar")
	}
}

func TestRenderWidget_ZeroWidth(t *testing.T) {
	vm := &ViewModel{EpicID: "test", Phase: PhaseRunning}
	result := RenderWidget(vm, 0)
	if result == "" {
		t.Fatal("expected non-empty output even with 0 width")
	}
}

func TestRenderWidget_NarrowWidth(t *testing.T) {
	vm := &ViewModel{EpicID: "test", Phase: PhaseRunning}
	result := RenderWidget(vm, 20)
	if result == "" {
		t.Fatal("expected non-empty output with narrow width")
	}
}

func TestRenderWidget_BudgetWarning(t *testing.T) {
	vm := &ViewModel{
		EpicID: "budget-epic",
		Phase:  PhaseRunning,
		Budget: BudgetView{
			MaxIterations:  10,
			IterationsUsed: 9,
			MaxCost:        1.0,
			CostUsed:       0.95,
		},
	}
	result := RenderWidget(vm, 60)
	if !strings.Contains(result, "Budget") {
		t.Error("expected budget info in widget")
	}
	if !strings.Contains(result, "9/10") {
		t.Error("expected iteration count in budget")
	}
}
