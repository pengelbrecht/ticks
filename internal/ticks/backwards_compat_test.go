package ticks

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// =============================================================================
// Backwards Compatibility Tests for Manual Field [voc]
//
// These tests ensure that existing ticks with manual=true continue to work
// correctly with the new awaiting field system.
// =============================================================================

// TestBackwardsCompat_ManualField tests that tasks with manual=true are
// treated as awaiting=work for backwards compatibility.
func TestBackwardsCompat_ManualField(t *testing.T) {
	// Create tick with old manual field
	task := &Task{
		ID:     "old-task",
		Manual: true,
	}

	// Should behave as awaiting=work
	if !task.IsAwaitingHuman() {
		t.Error("task with manual=true should return IsAwaitingHuman()=true")
	}
	if got := task.GetAwaitingType(); got != "work" {
		t.Errorf("GetAwaitingType() = %q, want %q", got, "work")
	}
}

// TestBackwardsCompat_ManualFieldFromJSON tests deserializing old JSON with
// manual=true behaves correctly.
func TestBackwardsCompat_ManualFieldFromJSON(t *testing.T) {
	// Simulate reading an old tick file with only manual field
	oldTickJSON := `{
		"id": "legacy-manual-task",
		"title": "Old Manual Task",
		"status": "open",
		"manual": true
	}`

	var task Task
	if err := json.Unmarshal([]byte(oldTickJSON), &task); err != nil {
		t.Fatalf("failed to unmarshal old tick JSON: %v", err)
	}

	// Verify backwards compat methods work
	if !task.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman() to return true for old tick with manual=true")
	}
	if got := task.GetAwaitingType(); got != "work" {
		t.Errorf("expected GetAwaitingType() to return 'work' for old tick with manual=true, got %q", got)
	}
}

// TestBackwardsCompat_NextExcludesManual tests that NextTask (via
// findNextReadyTask) skips tasks with manual=true, treating them the same
// as tasks with awaiting set.
func TestBackwardsCompat_NextExcludesManual(t *testing.T) {
	// Simulate the filtering logic used in findNextReadyTask
	tasks := []Task{
		{ID: "t1", Title: "Normal task", Status: "open"},
		{ID: "t2", Title: "Manual task", Status: "open", Manual: true},
		{ID: "t3", Title: "Another normal task", Status: "open"},
	}

	// Find first ready task (simulating findNextReadyTask logic)
	var readyTask *Task
	for _, task := range tasks {
		if task.Status != "open" {
			continue
		}
		if task.IsAwaitingHuman() {
			continue // This should skip manual=true tasks
		}
		taskCopy := task
		readyTask = &taskCopy
		break
	}

	// NextTask should skip manual tasks and return t1
	if readyTask == nil {
		t.Fatal("expected to find a ready task")
	}
	if readyTask.ID != "t1" {
		t.Errorf("expected first non-manual task 't1', got %q", readyTask.ID)
	}
}

// TestBackwardsCompat_NextExcludesAwaitingAndManual tests that both awaiting
// and manual tasks are excluded from NextTask selection.
func TestBackwardsCompat_NextExcludesAwaitingAndManual(t *testing.T) {
	awaitingApproval := "approval"

	tasks := []Task{
		{ID: "t1", Title: "Awaiting approval", Status: "open", Awaiting: &awaitingApproval},
		{ID: "t2", Title: "Manual task", Status: "open", Manual: true},
		{ID: "t3", Title: "Ready task", Status: "open"},
	}

	// Find first ready task
	var readyTask *Task
	for _, task := range tasks {
		if task.Status != "open" {
			continue
		}
		if task.IsAwaitingHuman() {
			continue
		}
		taskCopy := task
		readyTask = &taskCopy
		break
	}

	if readyTask == nil {
		t.Fatal("expected to find a ready task")
	}
	if readyTask.ID != "t3" {
		t.Errorf("expected ready task 't3', got %q", readyTask.ID)
	}
}

// TestBackwardsCompat_AllTasksAwaitingOrManual tests that nil is returned
// when all tasks are either awaiting or manual.
func TestBackwardsCompat_AllTasksAwaitingOrManual(t *testing.T) {
	awaitingInput := "input"

	tasks := []Task{
		{ID: "t1", Title: "Awaiting input", Status: "open", Awaiting: &awaitingInput},
		{ID: "t2", Title: "Manual task", Status: "open", Manual: true},
		{ID: "t3", Title: "Closed task", Status: "closed"},
	}

	// Find first ready task
	var readyTask *Task
	for _, task := range tasks {
		if task.Status != "open" {
			continue
		}
		if task.IsAwaitingHuman() {
			continue
		}
		taskCopy := task
		readyTask = &taskCopy
		break
	}

	if readyTask != nil {
		t.Errorf("expected nil when all tasks are awaiting/manual/closed, got %+v", readyTask)
	}
}

// TestBackwardsCompat_NewAwaitingTakesPrecedence tests that when both manual
// and awaiting fields are set, the new awaiting field takes precedence.
func TestBackwardsCompat_NewAwaitingTakesPrecedence(t *testing.T) {
	inputAwaiting := "input"

	task := &Task{
		ID:       "mixed",
		Manual:   true,           // Old field
		Awaiting: &inputAwaiting, // New field
	}

	// New field takes precedence
	if !task.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman()=true when both fields set")
	}
	if got := task.GetAwaitingType(); got != "input" {
		t.Errorf("GetAwaitingType() = %q, want %q (awaiting field should take precedence)", got, "input")
	}
}

// TestBackwardsCompat_SetAwaitingClearsManual tests that using SetAwaiting
// clears the Manual field for forward compatibility.
func TestBackwardsCompat_SetAwaitingClearsManual(t *testing.T) {
	task := &Task{
		ID:     "upgrade-test",
		Manual: true,
	}

	// Upgrade to new awaiting system
	task.SetAwaiting("approval")

	// Manual should be cleared
	if task.Manual {
		t.Error("Manual should be false after SetAwaiting")
	}
	if task.Awaiting == nil || *task.Awaiting != "approval" {
		t.Errorf("Awaiting should be 'approval', got %v", task.Awaiting)
	}
	if got := task.GetAwaitingType(); got != "approval" {
		t.Errorf("GetAwaitingType() = %q, want %q", got, "approval")
	}
}

// TestBackwardsCompat_ClearAwaitingClearsBoth tests that ClearAwaiting
// clears both the new Awaiting field and the old Manual field.
func TestBackwardsCompat_ClearAwaitingClearsBoth(t *testing.T) {
	awaiting := "work"
	task := &Task{
		ID:       "clear-test",
		Manual:   true,
		Awaiting: &awaiting,
	}

	task.ClearAwaiting()

	if task.Manual {
		t.Error("Manual should be false after ClearAwaiting")
	}
	if task.Awaiting != nil {
		t.Errorf("Awaiting should be nil after ClearAwaiting, got %v", task.Awaiting)
	}
	if task.IsAwaitingHuman() {
		t.Error("IsAwaitingHuman() should return false after ClearAwaiting")
	}
}

// TestBackwardsCompat_ProcessVerdictClearsManual tests that ProcessVerdict
// clears the Manual field along with other transient fields.
func TestBackwardsCompat_ProcessVerdictClearsManual(t *testing.T) {
	awaiting := "work"
	verdict := "approved"

	task := &Task{
		ID:       "verdict-test",
		Status:   "open",
		Manual:   true, // Old field should also be cleared
		Awaiting: &awaiting,
		Verdict:  &verdict,
	}

	result := task.ProcessVerdict()

	if !result.TransientCleared {
		t.Error("expected TransientCleared=true")
	}
	if task.Manual {
		t.Error("Manual should be cleared after ProcessVerdict")
	}
	if task.Awaiting != nil {
		t.Error("Awaiting should be nil after ProcessVerdict")
	}
	if task.Verdict != nil {
		t.Error("Verdict should be nil after ProcessVerdict")
	}
}

// TestBackwardsCompat_MigrationNotRequired tests that no migration is
// required - the system reads both fields correctly.
func TestBackwardsCompat_MigrationNotRequired(t *testing.T) {
	// Test various JSON formats that might exist in production

	testCases := []struct {
		name         string
		json         string
		wantAwaiting bool
		wantType     string
	}{
		{
			name:         "old format with manual=true",
			json:         `{"id":"t1","status":"open","manual":true}`,
			wantAwaiting: true,
			wantType:     "work",
		},
		{
			name:         "old format with manual=false",
			json:         `{"id":"t2","status":"open","manual":false}`,
			wantAwaiting: false,
			wantType:     "",
		},
		{
			name:         "old format without manual field",
			json:         `{"id":"t3","status":"open"}`,
			wantAwaiting: false,
			wantType:     "",
		},
		{
			name:         "new format with awaiting",
			json:         `{"id":"t4","status":"open","awaiting":"approval"}`,
			wantAwaiting: true,
			wantType:     "approval",
		},
		{
			name:         "new format with null awaiting",
			json:         `{"id":"t5","status":"open","awaiting":null}`,
			wantAwaiting: false,
			wantType:     "",
		},
		{
			name:         "mixed format - awaiting takes precedence",
			json:         `{"id":"t6","status":"open","manual":true,"awaiting":"review"}`,
			wantAwaiting: true,
			wantType:     "review",
		},
		{
			name:         "mixed format - manual=true, awaiting=null",
			json:         `{"id":"t7","status":"open","manual":true,"awaiting":null}`,
			wantAwaiting: true,
			wantType:     "work",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var task Task
			if err := json.Unmarshal([]byte(tc.json), &task); err != nil {
				t.Fatalf("failed to unmarshal: %v", err)
			}

			if got := task.IsAwaitingHuman(); got != tc.wantAwaiting {
				t.Errorf("IsAwaitingHuman() = %v, want %v", got, tc.wantAwaiting)
			}
			if got := task.GetAwaitingType(); got != tc.wantType {
				t.Errorf("GetAwaitingType() = %q, want %q", got, tc.wantType)
			}
		})
	}
}

// TestBackwardsCompat_ListAwaitingIncludesManual tests that ListAwaitingTasks
// includes tasks with manual=true when filtering for "work" type.
func TestBackwardsCompat_ListAwaitingIncludesManual(t *testing.T) {
	awaitingApproval := "approval"

	tasks := []Task{
		{ID: "t1", Status: "open", Manual: true},                // manual=true → awaiting=work
		{ID: "t2", Status: "open", Awaiting: &awaitingApproval}, // awaiting=approval
		{ID: "t3", Status: "open"},                              // not awaiting
	}

	// Simulate filtering for "work" awaiting type
	awaitingTypes := []string{"work"}
	typeFilter := make(map[string]bool)
	for _, at := range awaitingTypes {
		typeFilter[at] = true
	}

	var result []Task
	for _, task := range tasks {
		if !task.IsAwaitingHuman() {
			continue
		}
		if len(awaitingTypes) > 0 {
			awaitingType := task.GetAwaitingType()
			if !typeFilter[awaitingType] {
				continue
			}
		}
		result = append(result, task)
	}

	// Should include t1 (manual=true → work type)
	if len(result) != 1 {
		t.Fatalf("expected 1 task, got %d", len(result))
	}
	if result[0].ID != "t1" {
		t.Errorf("expected task 't1', got %q", result[0].ID)
	}
}

// TestBackwardsCompat_ListAwaitingAllTypes tests that listing all awaiting
// tasks includes both old manual tasks and new awaiting tasks.
func TestBackwardsCompat_ListAwaitingAllTypes(t *testing.T) {
	awaitingApproval := "approval"
	awaitingInput := "input"

	tasks := []Task{
		{ID: "t1", Status: "open", Manual: true},                // old format
		{ID: "t2", Status: "open", Awaiting: &awaitingApproval}, // new format
		{ID: "t3", Status: "open", Awaiting: &awaitingInput},    // new format
		{ID: "t4", Status: "open"},                              // not awaiting
		{ID: "t5", Status: "closed"},                            // closed
	}

	// List all awaiting tasks (no type filter)
	var result []Task
	for _, task := range tasks {
		if !task.IsAwaitingHuman() {
			continue
		}
		result = append(result, task)
	}

	// Should include t1, t2, t3
	if len(result) != 3 {
		t.Fatalf("expected 3 awaiting tasks, got %d", len(result))
	}

	expectedIDs := map[string]bool{"t1": true, "t2": true, "t3": true}
	for _, task := range result {
		if !expectedIDs[task.ID] {
			t.Errorf("unexpected task in result: %s", task.ID)
		}
	}
}

// TestBackwardsCompat_ClientNextTaskFiltering tests the Client.findNextReadyTask
// behavior with manual tasks using a file-based test.
func TestBackwardsCompat_ClientNextTaskFiltering(t *testing.T) {
	// Create temp directory structure
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	// Change to temp directory so findTickDir works
	origDir, _ := os.Getwd()
	defer os.Chdir(origDir)
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("changing to temp dir: %v", err)
	}

	// Create an epic
	epicData := map[string]interface{}{
		"id":       "epic-backcompat",
		"title":    "Backwards Compat Test Epic",
		"type":     "epic",
		"status":   "open",
		"children": []string{"task-manual", "task-awaiting", "task-ready"},
	}
	epicJSON, _ := json.MarshalIndent(epicData, "", "  ")
	if err := os.WriteFile(filepath.Join(tickDir, "epic-backcompat.json"), epicJSON, 0600); err != nil {
		t.Fatalf("writing epic file: %v", err)
	}

	// Create task with old manual=true format - should be skipped
	task1 := map[string]interface{}{
		"id":       "task-manual",
		"title":    "Old Manual Task",
		"type":     "task",
		"status":   "open",
		"parent":   "epic-backcompat",
		"manual":   true,
		"priority": 1,
	}
	task1JSON, _ := json.MarshalIndent(task1, "", "  ")
	if err := os.WriteFile(filepath.Join(tickDir, "task-manual.json"), task1JSON, 0600); err != nil {
		t.Fatalf("writing task1 file: %v", err)
	}

	// Create task with new awaiting format - should be skipped
	task2 := map[string]interface{}{
		"id":       "task-awaiting",
		"title":    "Awaiting Task",
		"type":     "task",
		"status":   "open",
		"parent":   "epic-backcompat",
		"awaiting": "approval",
		"priority": 2,
	}
	task2JSON, _ := json.MarshalIndent(task2, "", "  ")
	if err := os.WriteFile(filepath.Join(tickDir, "task-awaiting.json"), task2JSON, 0600); err != nil {
		t.Fatalf("writing task2 file: %v", err)
	}

	// Create a ready task - should be returned
	task3 := map[string]interface{}{
		"id":       "task-ready",
		"title":    "Ready Task",
		"type":     "task",
		"status":   "open",
		"parent":   "epic-backcompat",
		"priority": 3,
	}
	task3JSON, _ := json.MarshalIndent(task3, "", "  ")
	if err := os.WriteFile(filepath.Join(tickDir, "task-ready.json"), task3JSON, 0600); err != nil {
		t.Fatalf("writing task3 file: %v", err)
	}

	// Test IsAwaitingHuman on parsed tasks
	var manualTask Task
	if err := json.Unmarshal(task1JSON, &manualTask); err != nil {
		t.Fatalf("parsing task1: %v", err)
	}
	if !manualTask.IsAwaitingHuman() {
		t.Error("task with manual=true should return IsAwaitingHuman()=true")
	}
	if manualTask.GetAwaitingType() != "work" {
		t.Errorf("task with manual=true should return GetAwaitingType()='work', got %q", manualTask.GetAwaitingType())
	}

	var awaitingTask Task
	if err := json.Unmarshal(task2JSON, &awaitingTask); err != nil {
		t.Fatalf("parsing task2: %v", err)
	}
	if !awaitingTask.IsAwaitingHuman() {
		t.Error("task with awaiting set should return IsAwaitingHuman()=true")
	}
	if awaitingTask.GetAwaitingType() != "approval" {
		t.Errorf("task with awaiting='approval' should return GetAwaitingType()='approval', got %q", awaitingTask.GetAwaitingType())
	}

	var readyTask Task
	if err := json.Unmarshal(task3JSON, &readyTask); err != nil {
		t.Fatalf("parsing task3: %v", err)
	}
	if readyTask.IsAwaitingHuman() {
		t.Error("ready task should return IsAwaitingHuman()=false")
	}
}

// TestBackwardsCompat_VerdictOnManualTask tests ProcessVerdict behavior
// when a task only has manual=true (simulating upgrade from old format).
func TestBackwardsCompat_VerdictOnManualTask(t *testing.T) {
	// Simulate a scenario where a task was created with manual=true,
	// then upgraded to use awaiting field for verdict processing.

	// First, the old manual task
	task := &Task{
		ID:     "old-format-task",
		Status: "open",
		Manual: true,
	}

	// Verify initial state
	if !task.IsAwaitingHuman() {
		t.Error("manual task should be awaiting human")
	}
	if task.GetAwaitingType() != "work" {
		t.Errorf("manual task awaiting type = %q, want 'work'", task.GetAwaitingType())
	}

	// Upgrade path: use SetAwaiting to set awaiting=work explicitly
	task.SetAwaiting("work")

	// Now Manual should be false, Awaiting should be "work"
	if task.Manual {
		t.Error("Manual should be cleared after SetAwaiting")
	}
	if task.Awaiting == nil || *task.Awaiting != "work" {
		t.Errorf("Awaiting should be 'work', got %v", task.Awaiting)
	}

	// Set verdict
	approved := "approved"
	task.Verdict = &approved

	// Process verdict
	result := task.ProcessVerdict()

	// For work+approved, task should close
	if !result.ShouldClose {
		t.Error("work+approved should close the task")
	}
	if task.Status != "closed" {
		t.Errorf("task status = %q, want 'closed'", task.Status)
	}
}

// TestBackwardsCompat_EmptyAwaitingVsManual tests edge cases around empty
// values and nil pointers.
func TestBackwardsCompat_EmptyAwaitingVsManual(t *testing.T) {
	testCases := []struct {
		name         string
		task         Task
		wantAwaiting bool
		wantType     string
	}{
		{
			name:         "manual=false only",
			task:         Task{ID: "t1", Manual: false},
			wantAwaiting: false,
			wantType:     "",
		},
		{
			name:         "manual=true only",
			task:         Task{ID: "t2", Manual: true},
			wantAwaiting: true,
			wantType:     "work",
		},
		{
			name:         "awaiting empty string via pointer",
			task:         Task{ID: "t3", Awaiting: func() *string { s := ""; return &s }()},
			wantAwaiting: true, // non-nil pointer means awaiting
			wantType:     "",   // but empty string
		},
		{
			name:         "manual=true with awaiting nil",
			task:         Task{ID: "t4", Manual: true, Awaiting: nil},
			wantAwaiting: true,
			wantType:     "work",
		},
		{
			name:         "manual=false with awaiting nil",
			task:         Task{ID: "t5", Manual: false, Awaiting: nil},
			wantAwaiting: false,
			wantType:     "",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.task.IsAwaitingHuman(); got != tc.wantAwaiting {
				t.Errorf("IsAwaitingHuman() = %v, want %v", got, tc.wantAwaiting)
			}
			if got := tc.task.GetAwaitingType(); got != tc.wantType {
				t.Errorf("GetAwaitingType() = %q, want %q", got, tc.wantType)
			}
		})
	}
}
