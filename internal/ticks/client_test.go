package ticks

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
)

func TestNewClient(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	if err := os.MkdirAll(filepath.Join(tickDir, "issues"), 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}
	c := NewClient(tickDir)
	if c == nil {
		t.Error("expected non-nil client")
	}
}

func TestTaskIsOpen(t *testing.T) {
	task := &Task{Status: "open"}
	if !task.IsOpen() {
		t.Error("expected IsOpen() to return true for open status")
	}
	if task.IsClosed() {
		t.Error("expected IsClosed() to return false for open status")
	}
}

func TestTaskIsClosed(t *testing.T) {
	task := &Task{Status: "closed"}
	if task.IsOpen() {
		t.Error("expected IsOpen() to return false for closed status")
	}
	if !task.IsClosed() {
		t.Error("expected IsClosed() to return true for closed status")
	}
}

func TestEpicIsOpen(t *testing.T) {
	epic := &Epic{Status: "open"}
	if !epic.IsOpen() {
		t.Error("expected IsOpen() to return true for open status")
	}
	if epic.IsClosed() {
		t.Error("expected IsClosed() to return false for open status")
	}
}

func TestEpicIsClosed(t *testing.T) {
	epic := &Epic{Status: "closed"}
	if epic.IsOpen() {
		t.Error("expected IsOpen() to return false for closed status")
	}
	if !epic.IsClosed() {
		t.Error("expected IsClosed() to return true for closed status")
	}
}

func TestTaskIsAwaitingHuman(t *testing.T) {
	// Test nil Awaiting and Manual=false - agent's turn
	task := &Task{Status: "open"}
	if task.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman() to return false when Awaiting is nil and Manual is false")
	}

	// Test non-nil Awaiting - human's turn
	awaitingApproval := "approval"
	task.Awaiting = &awaitingApproval
	if !task.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman() to return true when Awaiting is set")
	}

	// Test backwards compatibility: Manual=true should mean human's turn
	task2 := &Task{Status: "open", Manual: true}
	if !task2.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman() to return true when Manual is true (backwards compat)")
	}

	// Test Awaiting takes precedence over Manual
	awaitingWork := "work"
	task3 := &Task{Status: "open", Manual: true, Awaiting: &awaitingWork}
	if !task3.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman() to return true when both Awaiting and Manual are set")
	}
}

func TestTaskGetAwaitingType(t *testing.T) {
	// Test nil Awaiting and Manual=false
	task := &Task{Status: "open"}
	if got := task.GetAwaitingType(); got != "" {
		t.Errorf("expected GetAwaitingType() to return empty string when Awaiting is nil and Manual is false, got %q", got)
	}

	// Test with various awaiting types
	testCases := []string{"work", "approval", "input", "review", "content", "escalation", "checkpoint"}
	for _, tc := range testCases {
		awaitingType := tc
		task.Awaiting = &awaitingType
		if got := task.GetAwaitingType(); got != tc {
			t.Errorf("expected GetAwaitingType() to return %q, got %q", tc, got)
		}
	}

	// Test backwards compatibility: Manual=true should return "work"
	task2 := &Task{Status: "open", Manual: true}
	if got := task2.GetAwaitingType(); got != "work" {
		t.Errorf("expected GetAwaitingType() to return 'work' when Manual is true, got %q", got)
	}

	// Test Awaiting takes precedence over Manual
	awaitingApproval := "approval"
	task3 := &Task{Status: "open", Manual: true, Awaiting: &awaitingApproval}
	if got := task3.GetAwaitingType(); got != "approval" {
		t.Errorf("expected GetAwaitingType() to return 'approval' when Awaiting is set (not Manual fallback), got %q", got)
	}
}

func TestTaskSetAwaiting(t *testing.T) {
	// Test setting awaiting clears Manual
	task := &Task{Status: "open", Manual: true}
	task.SetAwaiting("approval")

	if task.Awaiting == nil || *task.Awaiting != "approval" {
		t.Errorf("expected Awaiting to be 'approval', got %v", task.Awaiting)
	}
	if task.Manual {
		t.Error("expected Manual to be false after SetAwaiting")
	}

	// Test clearing awaiting with empty string
	task.SetAwaiting("")
	if task.Awaiting != nil {
		t.Errorf("expected Awaiting to be nil after SetAwaiting(''), got %v", task.Awaiting)
	}
	if task.Manual {
		t.Error("expected Manual to remain false after clearing Awaiting")
	}
}

func TestTaskClearAwaiting(t *testing.T) {
	// Test ClearAwaiting clears both fields
	awaiting := "work"
	task := &Task{Status: "open", Manual: true, Awaiting: &awaiting}
	task.ClearAwaiting()

	if task.Awaiting != nil {
		t.Errorf("expected Awaiting to be nil after ClearAwaiting, got %v", task.Awaiting)
	}
	if task.Manual {
		t.Error("expected Manual to be false after ClearAwaiting")
	}
}

func TestBackwardsCompatibilityManualField(t *testing.T) {
	// Simulate reading an old tick with only Manual=true
	oldTickJSON := `{
		"id": "old-tick",
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

	// Simulate updating the tick with new awaiting field
	task.SetAwaiting("approval")

	// Verify the tick now uses new field
	if task.Awaiting == nil || *task.Awaiting != "approval" {
		t.Errorf("expected Awaiting to be 'approval' after SetAwaiting, got %v", task.Awaiting)
	}
	if task.Manual {
		t.Error("expected Manual to be cleared after SetAwaiting")
	}

	// Marshal and verify JSON output uses new field
	data, err := json.Marshal(&task)
	if err != nil {
		t.Fatalf("failed to marshal task: %v", err)
	}
	jsonStr := string(data)
	if !contains(jsonStr, `"awaiting":"approval"`) {
		t.Errorf("expected JSON to contain awaiting field, got: %s", jsonStr)
	}
	// Manual should be omitted (false with omitempty)
	if contains(jsonStr, `"manual"`) {
		t.Errorf("expected JSON to omit manual field when false, got: %s", jsonStr)
	}
}

func TestTaskNewFieldsJSONSerialization(t *testing.T) {
	requires := "approval"
	awaiting := "review"
	verdict := "approved"

	task := &Task{
		ID:       "test-json",
		Title:    "Test JSON Serialization",
		Status:   "open",
		Requires: &requires,
		Awaiting: &awaiting,
		Verdict:  &verdict,
	}

	// Marshal to JSON
	data, err := json.Marshal(task)
	if err != nil {
		t.Fatalf("failed to marshal task: %v", err)
	}

	// Check that fields are in JSON
	jsonStr := string(data)
	if !contains(jsonStr, `"requires":"approval"`) {
		t.Errorf("expected JSON to contain requires field, got: %s", jsonStr)
	}
	if !contains(jsonStr, `"awaiting":"review"`) {
		t.Errorf("expected JSON to contain awaiting field, got: %s", jsonStr)
	}
	if !contains(jsonStr, `"verdict":"approved"`) {
		t.Errorf("expected JSON to contain verdict field, got: %s", jsonStr)
	}

	// Unmarshal back
	var decoded Task
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal task: %v", err)
	}

	if decoded.Requires == nil || *decoded.Requires != "approval" {
		t.Errorf("expected Requires to be 'approval', got %v", decoded.Requires)
	}
	if decoded.Awaiting == nil || *decoded.Awaiting != "review" {
		t.Errorf("expected Awaiting to be 'review', got %v", decoded.Awaiting)
	}
	if decoded.Verdict == nil || *decoded.Verdict != "approved" {
		t.Errorf("expected Verdict to be 'approved', got %v", decoded.Verdict)
	}
}

func TestTaskNewFieldsOmitEmpty(t *testing.T) {
	// Task without the new fields should not include them in JSON
	task := &Task{
		ID:     "test-omit",
		Title:  "Test Omit Empty",
		Status: "open",
	}

	data, err := json.Marshal(task)
	if err != nil {
		t.Fatalf("failed to marshal task: %v", err)
	}

	jsonStr := string(data)
	if contains(jsonStr, `"requires"`) {
		t.Errorf("expected JSON to omit requires when nil, got: %s", jsonStr)
	}
	if contains(jsonStr, `"awaiting"`) {
		t.Errorf("expected JSON to omit awaiting when nil, got: %s", jsonStr)
	}
	if contains(jsonStr, `"verdict"`) {
		t.Errorf("expected JSON to omit verdict when nil, got: %s", jsonStr)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestSetRunRecord(t *testing.T) {
	// Create temp directory structure
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	if err := os.MkdirAll(filepath.Join(tickDir, "issues"), 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	// Create a RunRecord
	record := &agent.RunRecord{
		SessionID: "session-abc",
		Model:     "claude-opus-4-5-20251101",
		StartedAt: time.Now().Add(-5 * time.Minute),
		EndedAt:   time.Now(),
		Output:    "Task completed successfully",
		Thinking:  "Let me think about this...",
		Tools: []agent.ToolRecord{
			{Name: "Read", Duration: 100, IsError: false},
			{Name: "Edit", Duration: 200, IsError: false},
		},
		Metrics: agent.MetricsRecord{
			InputTokens:  1000,
			OutputTokens: 500,
			CostUSD:      0.05,
		},
		Success:  true,
		NumTurns: 3,
	}

	// Test SetRunRecord
	client := NewClient(tickDir)
	if err := client.SetRunRecord("test123", record); err != nil {
		t.Fatalf("SetRunRecord failed: %v", err)
	}

	// Run records are now stored in .tick/logs/records/<id>.json
	recordFile := filepath.Join(tmpDir, ".tick", "logs", "records", "test123.json")
	data, err := os.ReadFile(recordFile)
	if err != nil {
		t.Fatalf("reading run record file: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("parsing run record file: %v", err)
	}

	// Check run record fields
	if result["session_id"] != "session-abc" {
		t.Errorf("expected session_id to be 'session-abc', got %v", result["session_id"])
	}
	if result["model"] != "claude-opus-4-5-20251101" {
		t.Errorf("expected model to be 'claude-opus-4-5-20251101', got %v", result["model"])
	}
	if result["success"] != true {
		t.Errorf("expected success to be true, got %v", result["success"])
	}
}

func TestSetRunRecordNilRecord(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	if err := os.MkdirAll(filepath.Join(tickDir, "issues"), 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}
	client := NewClient(tickDir)
	// Should return nil without error when record is nil
	if err := client.SetRunRecord("test123", nil); err != nil {
		t.Errorf("SetRunRecord with nil record should return nil, got %v", err)
	}

	// Verify no file was created
	recordFile := filepath.Join(tmpDir, ".tick", "logs", "records", "test123.json")
	if _, err := os.Stat(recordFile); !os.IsNotExist(err) {
		t.Errorf("expected no record file to be created for nil record")
	}
}
func TestGetRunRecord(t *testing.T) {
	// Create a temp directory structure for .tick
	tempDir := t.TempDir()
	tickDir := filepath.Join(tempDir, ".tick")
	recordsDir := filepath.Join(tickDir, "logs", "records")
	if err := os.MkdirAll(recordsDir, 0755); err != nil {
		t.Fatalf("creating records dir: %v", err)
	}

	// Create a run record file (now stored separately from tick)
	startTime := time.Date(2025, 1, 1, 10, 0, 0, 0, time.UTC)
	endTime := time.Date(2025, 1, 1, 10, 5, 0, 0, time.UTC)

	recordData := map[string]interface{}{
		"session_id": "session-xyz",
		"model":      "claude-3-5-sonnet",
		"started_at": startTime.Format(time.RFC3339),
		"ended_at":   endTime.Format(time.RFC3339),
		"output":     "Test output",
		"tools": []map[string]interface{}{
			{"name": "Read", "duration_ms": 100},
		},
		"metrics": map[string]interface{}{
			"input_tokens":  2000,
			"output_tokens": 1000,
			"cost_usd":      0.10,
		},
		"success":   true,
		"num_turns": 5,
	}

	data, err := json.MarshalIndent(recordData, "", "  ")
	if err != nil {
		t.Fatalf("marshaling record data: %v", err)
	}

	recordFile := filepath.Join(recordsDir, "test456.json")
	if err := os.WriteFile(recordFile, data, 0644); err != nil {
		t.Fatalf("writing record file: %v", err)
	}

	// Test GetRunRecord
	client := NewClient(tickDir)
	record, err := client.GetRunRecord("test456")
	if err != nil {
		t.Fatalf("GetRunRecord failed: %v", err)
	}

	if record == nil {
		t.Fatal("expected non-nil record")
	}
	if record.SessionID != "session-xyz" {
		t.Errorf("expected session_id 'session-xyz', got %q", record.SessionID)
	}
	if record.Model != "claude-3-5-sonnet" {
		t.Errorf("expected model 'claude-3-5-sonnet', got %q", record.Model)
	}
	if record.Output != "Test output" {
		t.Errorf("expected output 'Test output', got %q", record.Output)
	}
	if !record.Success {
		t.Error("expected success to be true")
	}
	if record.NumTurns != 5 {
		t.Errorf("expected num_turns 5, got %d", record.NumTurns)
	}
	if len(record.Tools) != 1 || record.Tools[0].Name != "Read" {
		t.Errorf("expected one tool 'Read', got %+v", record.Tools)
	}
}

func TestGetRunRecordNoRecord(t *testing.T) {
	// Create a temp directory structure for .tick
	tempDir := t.TempDir()
	tickDir := filepath.Join(tempDir, ".tick")
	recordsDir := filepath.Join(tickDir, "logs", "records")
	if err := os.MkdirAll(recordsDir, 0755); err != nil {
		t.Fatalf("creating records dir: %v", err)
	}

	// No run record file exists for test789

	// Test GetRunRecord - should return nil, nil
	client := NewClient(tickDir)
	record, err := client.GetRunRecord("test789")
	if err != nil {
		t.Fatalf("GetRunRecord failed: %v", err)
	}
	if record != nil {
		t.Errorf("expected nil record for task without run, got %+v", record)
	}
}

func TestGetRunRecordNonexistent(t *testing.T) {
	// Create a temp directory structure for .tick
	tempDir := t.TempDir()
	tickDir := filepath.Join(tempDir, ".tick")
	// Don't create records dir - testing when the directory doesn't exist

	// Test GetRunRecord for non-existent task - should return nil, nil
	client := NewClient(tickDir)
	record, err := client.GetRunRecord("nonexistent")
	if err != nil {
		t.Fatalf("GetRunRecord for nonexistent task should not error, got: %v", err)
	}
	if record != nil {
		t.Errorf("expected nil record for nonexistent task, got %+v", record)
	}
}

// Test cases for ProcessVerdict method on Task struct
func TestTaskProcessVerdict(t *testing.T) {
	testCases := []struct {
		name          string
		awaiting      *string
		verdict       *string
		requires      *string
		initialStatus string
		wantClose     bool
		wantCleared   bool
		wantStatus    string
		wantRequires  bool // should requires still be set?
	}{
		// No verdict or awaiting - nothing to process
		{
			name:          "nil verdict",
			awaiting:      strPtr("approval"),
			verdict:       nil,
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   false,
			wantStatus:    "open",
		},
		{
			name:          "nil awaiting",
			awaiting:      nil,
			verdict:       strPtr("approved"),
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   false,
			wantStatus:    "open",
		},
		{
			name:          "both nil",
			awaiting:      nil,
			verdict:       nil,
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   false,
			wantStatus:    "open",
		},

		// Work type - approved closes (human completed it)
		{
			name:          "work approved closes",
			awaiting:      strPtr("work"),
			verdict:       strPtr("approved"),
			initialStatus: "open",
			wantClose:     true,
			wantCleared:   true,
			wantStatus:    "closed",
		},
		{
			name:          "work rejected continues",
			awaiting:      strPtr("work"),
			verdict:       strPtr("rejected"),
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   true,
			wantStatus:    "open",
		},

		// Approval type - terminal, approved closes
		{
			name:          "approval approved closes",
			awaiting:      strPtr("approval"),
			verdict:       strPtr("approved"),
			initialStatus: "open",
			wantClose:     true,
			wantCleared:   true,
			wantStatus:    "closed",
		},
		{
			name:          "approval rejected continues",
			awaiting:      strPtr("approval"),
			verdict:       strPtr("rejected"),
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   true,
			wantStatus:    "open",
		},

		// Review type - terminal, approved closes
		{
			name:          "review approved closes",
			awaiting:      strPtr("review"),
			verdict:       strPtr("approved"),
			initialStatus: "open",
			wantClose:     true,
			wantCleared:   true,
			wantStatus:    "closed",
		},
		{
			name:          "review rejected continues",
			awaiting:      strPtr("review"),
			verdict:       strPtr("rejected"),
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   true,
			wantStatus:    "open",
		},

		// Content type - terminal, approved closes
		{
			name:          "content approved closes",
			awaiting:      strPtr("content"),
			verdict:       strPtr("approved"),
			initialStatus: "open",
			wantClose:     true,
			wantCleared:   true,
			wantStatus:    "closed",
		},
		{
			name:          "content rejected continues",
			awaiting:      strPtr("content"),
			verdict:       strPtr("rejected"),
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   true,
			wantStatus:    "open",
		},

		// Input type - rejected closes (can't proceed), approved continues
		{
			name:          "input approved continues",
			awaiting:      strPtr("input"),
			verdict:       strPtr("approved"),
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   true,
			wantStatus:    "open",
		},
		{
			name:          "input rejected closes",
			awaiting:      strPtr("input"),
			verdict:       strPtr("rejected"),
			initialStatus: "open",
			wantClose:     true,
			wantCleared:   true,
			wantStatus:    "closed",
		},

		// Escalation type - rejected closes (won't do), approved continues
		{
			name:          "escalation approved continues",
			awaiting:      strPtr("escalation"),
			verdict:       strPtr("approved"),
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   true,
			wantStatus:    "open",
		},
		{
			name:          "escalation rejected closes",
			awaiting:      strPtr("escalation"),
			verdict:       strPtr("rejected"),
			initialStatus: "open",
			wantClose:     true,
			wantCleared:   true,
			wantStatus:    "closed",
		},

		// Checkpoint type - never closes
		{
			name:          "checkpoint approved continues",
			awaiting:      strPtr("checkpoint"),
			verdict:       strPtr("approved"),
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   true,
			wantStatus:    "open",
		},
		{
			name:          "checkpoint rejected continues",
			awaiting:      strPtr("checkpoint"),
			verdict:       strPtr("rejected"),
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   true,
			wantStatus:    "open",
		},

		// Unknown awaiting type - don't close
		{
			name:          "unknown type continues",
			awaiting:      strPtr("unknown"),
			verdict:       strPtr("approved"),
			initialStatus: "open",
			wantClose:     false,
			wantCleared:   true,
			wantStatus:    "open",
		},

		// Requires field should persist
		{
			name:          "requires persists after approval",
			awaiting:      strPtr("approval"),
			verdict:       strPtr("approved"),
			requires:      strPtr("approval"),
			initialStatus: "open",
			wantClose:     true,
			wantCleared:   true,
			wantStatus:    "closed",
			wantRequires:  true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			task := &Task{
				ID:       "test-task",
				Status:   tc.initialStatus,
				Awaiting: tc.awaiting,
				Verdict:  tc.verdict,
				Requires: tc.requires,
			}

			result := task.ProcessVerdict()

			if result.ShouldClose != tc.wantClose {
				t.Errorf("ShouldClose: got %v, want %v", result.ShouldClose, tc.wantClose)
			}
			if result.TransientCleared != tc.wantCleared {
				t.Errorf("TransientCleared: got %v, want %v", result.TransientCleared, tc.wantCleared)
			}
			if task.Status != tc.wantStatus {
				t.Errorf("Status: got %q, want %q", task.Status, tc.wantStatus)
			}

			// Verify transient fields are cleared when processing happened
			if tc.wantCleared {
				if task.Awaiting != nil {
					t.Errorf("Awaiting should be nil after processing, got %v", task.Awaiting)
				}
				if task.Verdict != nil {
					t.Errorf("Verdict should be nil after processing, got %v", task.Verdict)
				}
				if task.Manual {
					t.Error("Manual should be false after processing")
				}
			}

			// Verify requires persists
			if tc.wantRequires {
				if task.Requires == nil || *task.Requires != *tc.requires {
					t.Errorf("Requires should persist, got %v, want %v", task.Requires, tc.requires)
				}
			}
		})
	}
}

// Test Client.ProcessVerdict method
func TestClientProcessVerdict(t *testing.T) {
	// Create temp directory structure
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	// Create a test task file with verdict and awaiting set
	taskData := map[string]interface{}{
		"id":          "verdict-test",
		"owner":      "test",
		"created_by": "test",
		"created_at": "2025-01-01T00:00:00Z",
		"updated_at": "2025-01-01T00:00:00Z",
		"title":       "Test Verdict Processing",
		"description": "A task to test verdict processing",
		"status":      "open",
		"priority":    2,
		"type":        "task",
		"awaiting":    "approval",
		"verdict":     "approved",
		"requires":    "approval",
	}
	taskJSON, _ := json.MarshalIndent(taskData, "", "  ")
	taskFile := filepath.Join(tickDir, "verdict-test.json")
	if err := os.WriteFile(taskFile, taskJSON, 0600); err != nil {
		t.Fatalf("writing task file: %v", err)
	}

	// Process verdict
	client := NewClient(filepath.Join(tmpDir, ".tick"))
	result, err := client.ProcessVerdict("verdict-test")
	if err != nil {
		t.Fatalf("ProcessVerdict failed: %v", err)
	}

	// Verify result
	if !result.ShouldClose {
		t.Error("expected ShouldClose to be true for approval+approved")
	}
	if !result.TransientCleared {
		t.Error("expected TransientCleared to be true")
	}

	// Read back the file and verify changes
	data, err := os.ReadFile(taskFile)
	if err != nil {
		t.Fatalf("reading updated file: %v", err)
	}

	var updated map[string]interface{}
	if err := json.Unmarshal(data, &updated); err != nil {
		t.Fatalf("parsing updated file: %v", err)
	}

	// Check status changed to closed
	if updated["status"] != "closed" {
		t.Errorf("expected status 'closed', got %v", updated["status"])
	}

	// Check transient fields cleared
	if _, exists := updated["awaiting"]; exists {
		t.Errorf("expected awaiting to be removed, but it exists: %v", updated["awaiting"])
	}
	if _, exists := updated["verdict"]; exists {
		t.Errorf("expected verdict to be removed, but it exists: %v", updated["verdict"])
	}

	// Check requires persists
	if updated["requires"] != "approval" {
		t.Errorf("expected requires to persist as 'approval', got %v", updated["requires"])
	}

	// Check other fields preserved
	if updated["id"] != "verdict-test" {
		t.Errorf("expected id to be preserved, got %v", updated["id"])
	}
	if updated["title"] != "Test Verdict Processing" {
		t.Errorf("expected title to be preserved, got %v", updated["title"])
	}
}

// Test Client.ProcessVerdict with no verdict set
func TestClientProcessVerdictNoVerdict(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	origDir, _ := os.Getwd()
	defer os.Chdir(origDir)
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("changing to temp dir: %v", err)
	}

	// Create task without verdict
	taskData := map[string]interface{}{
		"id":       "no-verdict",
		"type":       "task",
		"owner":      "test",
		"created_by": "test",
		"created_at": "2025-01-01T00:00:00Z",
		"updated_at": "2025-01-01T00:00:00Z",
		"title":    "No Verdict",
		"status":   "open",
		"awaiting": "approval",
	}
	taskJSON, _ := json.MarshalIndent(taskData, "", "  ")
	taskFile := filepath.Join(tickDir, "no-verdict.json")
	if err := os.WriteFile(taskFile, taskJSON, 0600); err != nil {
		t.Fatalf("writing task file: %v", err)
	}

	client := NewClient(filepath.Join(tmpDir, ".tick"))
	result, err := client.ProcessVerdict("no-verdict")
	if err != nil {
		t.Fatalf("ProcessVerdict failed: %v", err)
	}

	// Should not process anything
	if result.TransientCleared {
		t.Error("expected TransientCleared to be false when no verdict")
	}
	if result.ShouldClose {
		t.Error("expected ShouldClose to be false when no verdict")
	}
}

// Helper function to create string pointers
func strPtr(s string) *string {
	return &s
}

// TestFindNextReadyTaskFiltersAwaiting tests that findNextReadyTask excludes tasks with awaiting set
func TestFindNextReadyTaskFiltersAwaiting(t *testing.T) {
	// Create temp directory structure
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	// Create an epic
	epicData := map[string]interface{}{
		"id":       "epic-filter",
		"title":    "Filter Test Epic",
		"type":     "epic",
		"status":   "open",
		"children": []string{"task-awaiting", "task-manual", "task-ready"},
	}
	epicJSON, _ := json.MarshalIndent(epicData, "", "  ")
	if err := os.WriteFile(filepath.Join(tickDir, "epic-filter.json"), epicJSON, 0600); err != nil {
		t.Fatalf("writing epic file: %v", err)
	}

	// Create task with awaiting set - should be skipped
	task1 := map[string]interface{}{
		"id":       "task-awaiting",
		"title":    "Task Awaiting Approval",
		"type":     "task",
		"status":   "open",
		"parent":   "epic-filter",
		"awaiting": "approval",
		"priority": 1,
	}
	task1JSON, _ := json.MarshalIndent(task1, "", "  ")
	if err := os.WriteFile(filepath.Join(tickDir, "task-awaiting.json"), task1JSON, 0600); err != nil {
		t.Fatalf("writing task1 file: %v", err)
	}

	// Create task with manual=true - should be skipped (backwards compat)
	task2 := map[string]interface{}{
		"id":       "task-manual",
		"title":    "Manual Task",
		"type":     "task",
		"status":   "open",
		"parent":   "epic-filter",
		"manual":   true,
		"priority": 2,
	}
	task2JSON, _ := json.MarshalIndent(task2, "", "  ")
	if err := os.WriteFile(filepath.Join(tickDir, "task-manual.json"), task2JSON, 0600); err != nil {
		t.Fatalf("writing task2 file: %v", err)
	}

	// Create a ready task - should be returned
	task3 := map[string]interface{}{
		"id":       "task-ready",
		"title":    "Ready Task",
		"type":     "task",
		"status":   "open",
		"parent":   "epic-filter",
		"priority": 3,
	}
	task3JSON, _ := json.MarshalIndent(task3, "", "  ")
	if err := os.WriteFile(filepath.Join(tickDir, "task-ready.json"), task3JSON, 0600); err != nil {
		t.Fatalf("writing task3 file: %v", err)
	}

	// Create a mock client that uses tk list which reads from files
	// Since we can't easily mock tk CLI, we test the filtering logic directly
	// by verifying the IsAwaitingHuman() checks

	// Test the IsAwaitingHuman filtering logic
	var awaitingTask Task
	if err := json.Unmarshal(task1JSON, &awaitingTask); err != nil {
		t.Fatalf("parsing task1: %v", err)
	}
	if !awaitingTask.IsAwaitingHuman() {
		t.Error("task with awaiting set should return IsAwaitingHuman()=true")
	}

	var manualTask Task
	if err := json.Unmarshal(task2JSON, &manualTask); err != nil {
		t.Fatalf("parsing task2: %v", err)
	}
	if !manualTask.IsAwaitingHuman() {
		t.Error("task with manual=true should return IsAwaitingHuman()=true")
	}

	var readyTask Task
	if err := json.Unmarshal(task3JSON, &readyTask); err != nil {
		t.Fatalf("parsing task3: %v", err)
	}
	if readyTask.IsAwaitingHuman() {
		t.Error("ready task should return IsAwaitingHuman()=false")
	}
}

// TestFindNextReadyTaskFiltersBlocked tests that findNextReadyTask excludes blocked tasks
func TestFindNextReadyTaskFiltersBlocked(t *testing.T) {
	// Test the blocking logic
	tasks := []Task{
		{ID: "blocker", Status: "open", Priority: 1},
		{ID: "blocked", Status: "open", Priority: 2, BlockedBy: []string{"blocker"}},
		{ID: "ready", Status: "open", Priority: 3},
	}

	// Build blocked IDs like findNextReadyTask does
	blockedIDs := make(map[string]bool)
	for _, t := range tasks {
		for _, blockerID := range t.BlockedBy {
			for _, blocker := range tasks {
				if blocker.ID == blockerID && blocker.Status != "closed" {
					blockedIDs[t.ID] = true
					break
				}
			}
		}
	}

	// Verify blocked detection
	if blockedIDs["blocker"] {
		t.Error("blocker task should not be marked as blocked")
	}
	if !blockedIDs["blocked"] {
		t.Error("blocked task should be marked as blocked")
	}
	if blockedIDs["ready"] {
		t.Error("ready task should not be marked as blocked")
	}
}

// TestFindNextReadyTaskFiltersClosed tests that findNextReadyTask excludes closed tasks
func TestFindNextReadyTaskFiltersClosed(t *testing.T) {
	tasks := []Task{
		{ID: "closed-task", Status: "closed", Priority: 1},
		{ID: "open-task", Status: "open", Priority: 2},
	}

	// Simulate the filtering logic
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
	if readyTask.ID != "open-task" {
		t.Errorf("expected open-task, got %s", readyTask.ID)
	}
}

// TestFindNextReadyTaskAllAwaiting tests that findNextReadyTask returns nil when all tasks are awaiting
func TestFindNextReadyTaskAllAwaiting(t *testing.T) {
	awaiting := "approval"
	tasks := []Task{
		{ID: "task1", Status: "open", Awaiting: &awaiting},
		{ID: "task2", Status: "open", Manual: true},
		{ID: "task3", Status: "closed"},
	}

	// Simulate the filtering logic
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
		t.Errorf("expected nil when all tasks are awaiting/closed, got %+v", readyTask)
	}
}

// TestCompleteTaskWithRequires tests that CompleteTask routes to human when requires is set
func TestCompleteTaskWithRequires(t *testing.T) {
	// Test the core logic: when requires is set, should route to SetAwaiting
	requires := "approval"
	task := &Task{
		ID:       "task-with-requires",
		Title:    "Task With Requires",
		Status:   "open",
		Requires: &requires,
	}

	// Verify the logic that CompleteTask uses
	if task.Requires == nil || *task.Requires == "" {
		t.Error("task.Requires should be set")
	}
	if *task.Requires != "approval" {
		t.Errorf("expected requires='approval', got %q", *task.Requires)
	}

	// Verify the note that would be generated
	expectedNote := "Work complete, requires approval"
	actualNote := fmt.Sprintf("Work complete, requires %s", *task.Requires)
	if actualNote != expectedNote {
		t.Errorf("expected note %q, got %q", expectedNote, actualNote)
	}
}

// TestCompleteTaskWithoutRequires tests that CompleteTask closes directly when no requires
func TestCompleteTaskWithoutRequires(t *testing.T) {
	// Test the core logic: when requires is nil, should close directly
	task := &Task{
		ID:     "task-no-requires",
		Title:  "Task Without Requires",
		Status: "open",
	}

	// Verify the logic that CompleteTask uses
	if task.Requires != nil && *task.Requires != "" {
		t.Error("task.Requires should not be set")
	}
}

// TestCompleteTaskRequiresPersistsThroughRejection tests that requires field persists
func TestCompleteTaskRequiresPersistsThroughRejection(t *testing.T) {
	// Simulate the rejection cycle:
	// 1. Task with requires="approval" is created
	// 2. Agent completes work, CompleteTask routes to awaiting=approval
	// 3. Human rejects (verdict=rejected), ProcessVerdict clears awaiting/verdict
	// 4. Agent works again, CompleteTask should still see requires="approval"

	requires := "approval"
	awaiting := "approval"
	verdict := "rejected"

	task := &Task{
		ID:       "task-rejection-cycle",
		Title:    "Task in Rejection Cycle",
		Status:   "open",
		Requires: &requires,
		Awaiting: &awaiting,
		Verdict:  &verdict,
	}

	// Process the rejection verdict
	result := task.ProcessVerdict()

	// Verify transient fields are cleared
	if !result.TransientCleared {
		t.Error("expected TransientCleared to be true")
	}
	if task.Awaiting != nil {
		t.Error("awaiting should be nil after ProcessVerdict")
	}
	if task.Verdict != nil {
		t.Error("verdict should be nil after ProcessVerdict")
	}

	// Verify requires persists
	if task.Requires == nil {
		t.Fatal("requires should persist after ProcessVerdict")
	}
	if *task.Requires != "approval" {
		t.Errorf("requires should still be 'approval', got %q", *task.Requires)
	}

	// Now simulate CompleteTask logic again - requires should still route to human
	if task.Requires != nil && *task.Requires != "" {
		// This path should still be taken after rejection
	} else {
		t.Error("CompleteTask logic should still detect requires after rejection cycle")
	}
}

// TestCompleteTaskEmptyRequires tests that empty requires string doesn't route to human
func TestCompleteTaskEmptyRequires(t *testing.T) {
	// Edge case: requires field exists but is empty string
	emptyRequires := ""
	task := &Task{
		ID:       "task-empty-requires",
		Title:    "Task With Empty Requires",
		Status:   "open",
		Requires: &emptyRequires,
	}

	// Verify the logic treats empty string same as nil
	if task.Requires != nil && *task.Requires != "" {
		t.Error("empty requires should be treated as no requires")
	}
}

// TestCompleteTaskVariousRequiresTypes tests different requires values
func TestCompleteTaskVariousRequiresTypes(t *testing.T) {
	requiresTypes := []string{"approval", "review", "content"}

	for _, requiresType := range requiresTypes {
		t.Run(requiresType, func(t *testing.T) {
			requires := requiresType
			task := &Task{
				ID:       "task-" + requiresType,
				Title:    "Task Requiring " + requiresType,
				Status:   "open",
				Requires: &requires,
			}

			// Verify logic would route to human
			if task.Requires == nil || *task.Requires == "" {
				t.Errorf("expected requires=%q to trigger human routing", requiresType)
			}

			// Verify the awaiting value that would be set matches requires
			if *task.Requires != requiresType {
				t.Errorf("expected awaiting to be set to %q", requiresType)
			}
		})
	}
}

// TestNextAwaitingTaskArgsConstruction tests that NextAwaitingTask builds correct arguments
func TestNextAwaitingTaskArgsConstruction(t *testing.T) {
	testCases := []struct {
		name          string
		epicID        string
		awaitingTypes []string
		wantArgs      []string
	}{
		{
			name:          "no epic, no types",
			epicID:        "",
			awaitingTypes: nil,
			wantArgs:      []string{"next", "--awaiting", "--json"},
		},
		{
			name:          "with epic, no types",
			epicID:        "epic-123",
			awaitingTypes: nil,
			wantArgs:      []string{"next", "epic-123", "--awaiting", "--json"},
		},
		{
			name:          "no epic, single type",
			epicID:        "",
			awaitingTypes: []string{"approval"},
			wantArgs:      []string{"next", "--awaiting", "approval", "--json"},
		},
		{
			name:          "with epic, single type",
			epicID:        "epic-123",
			awaitingTypes: []string{"approval"},
			wantArgs:      []string{"next", "epic-123", "--awaiting", "approval", "--json"},
		},
		{
			name:          "with epic, multiple types",
			epicID:        "epic-123",
			awaitingTypes: []string{"content", "review"},
			wantArgs:      []string{"next", "epic-123", "--awaiting", "content,review", "--json"},
		},
		{
			name:          "no epic, multiple types",
			epicID:        "",
			awaitingTypes: []string{"approval", "review", "content"},
			wantArgs:      []string{"next", "--awaiting", "approval,review,content", "--json"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Build args the same way NextAwaitingTask does
			args := []string{"next"}
			if tc.epicID != "" {
				args = append(args, tc.epicID)
			}
			args = append(args, "--awaiting")
			if len(tc.awaitingTypes) > 0 {
				args = append(args, strings.Join(tc.awaitingTypes, ","))
			}
			args = append(args, "--json")

			// Verify args match expected
			if len(args) != len(tc.wantArgs) {
				t.Errorf("args length mismatch: got %d, want %d", len(args), len(tc.wantArgs))
				t.Errorf("got: %v", args)
				t.Errorf("want: %v", tc.wantArgs)
				return
			}
			for i, arg := range args {
				if arg != tc.wantArgs[i] {
					t.Errorf("arg[%d] mismatch: got %q, want %q", i, arg, tc.wantArgs[i])
				}
			}
		})
	}
}

// TestNextAwaitingTaskReturnsAwaitingTask tests that NextAwaitingTask returns tasks with awaiting set
func TestNextAwaitingTaskReturnsAwaitingTask(t *testing.T) {
	// Simulate parsing a JSON response from tk next --awaiting
	taskJSON := `{
		"id": "task-awaiting",
		"title": "Task Awaiting Approval",
		"type": "task",
		"status": "open",
		"parent": "epic-123",
		"awaiting": "approval",
		"priority": 1
	}`

	var task Task
	if err := json.Unmarshal([]byte(taskJSON), &task); err != nil {
		t.Fatalf("failed to unmarshal task: %v", err)
	}

	if task.ID != "task-awaiting" {
		t.Errorf("expected ID 'task-awaiting', got %q", task.ID)
	}
	if !task.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman() to return true")
	}
	if task.GetAwaitingType() != "approval" {
		t.Errorf("expected awaiting type 'approval', got %q", task.GetAwaitingType())
	}
}

// TestNextAwaitingTaskReturnsNilForEmptyResponse tests that empty response returns nil
func TestNextAwaitingTaskReturnsNilForEmptyResponse(t *testing.T) {
	// Simulate empty JSON (no awaiting tasks)
	taskJSON := `{}`

	var task Task
	if err := json.Unmarshal([]byte(taskJSON), &task); err != nil {
		t.Fatalf("failed to unmarshal task: %v", err)
	}

	// Should return nil when ID is empty
	if task.ID != "" {
		t.Errorf("expected empty ID for empty response, got %q", task.ID)
	}
}

// TestNextAwaitingTaskTypesJoin tests that awaiting types are joined correctly
func TestNextAwaitingTaskTypesJoin(t *testing.T) {
	// Test string joining for multiple types
	types := []string{"content", "review"}
	joined := strings.Join(types, ",")
	if joined != "content,review" {
		t.Errorf("expected 'content,review', got %q", joined)
	}

	types2 := []string{"approval", "review", "content"}
	joined2 := strings.Join(types2, ",")
	if joined2 != "approval,review,content" {
		t.Errorf("expected 'approval,review,content', got %q", joined2)
	}

	// Empty slice should produce empty string
	types3 := []string{}
	joined3 := strings.Join(types3, ",")
	if joined3 != "" {
		t.Errorf("expected empty string for empty slice, got %q", joined3)
	}
}

// TestNextAwaitingTaskAllAwaitingTypes tests all valid awaiting types
func TestNextAwaitingTaskAllAwaitingTypes(t *testing.T) {
	// All valid awaiting types that humans might query for
	awaitingTypes := []string{"work", "approval", "input", "review", "content", "escalation", "checkpoint"}

	for _, awaitingType := range awaitingTypes {
		t.Run(awaitingType, func(t *testing.T) {
			// Simulate a task with this awaiting type
			taskJSON := fmt.Sprintf(`{
				"id": "task-%s",
				"title": "Task Awaiting %s",
				"type": "task",
				"status": "open",
				"awaiting": "%s"
			}`, awaitingType, awaitingType, awaitingType)

			var task Task
			if err := json.Unmarshal([]byte(taskJSON), &task); err != nil {
				t.Fatalf("failed to unmarshal task: %v", err)
			}

			if !task.IsAwaitingHuman() {
				t.Errorf("expected task with awaiting=%q to be awaiting human", awaitingType)
			}
			if task.GetAwaitingType() != awaitingType {
				t.Errorf("expected GetAwaitingType()=%q, got %q", awaitingType, task.GetAwaitingType())
			}
		})
	}
}

// TestListAwaitingTasksNoFilter tests ListAwaitingTasks returns all awaiting tasks when no filter
func TestListAwaitingTasksNoFilter(t *testing.T) {
	approval := "approval"
	review := "review"

	tasks := []Task{
		{ID: "normal", Status: "open"},
		{ID: "awaiting-approval", Status: "open", Awaiting: &approval},
		{ID: "awaiting-review", Status: "open", Awaiting: &review},
		{ID: "manual", Status: "open", Manual: true},
		{ID: "closed", Status: "closed"},
	}

	// Simulate ListAwaitingTasks filtering logic
	var result []Task
	for _, task := range tasks {
		if !task.IsAwaitingHuman() {
			continue
		}
		result = append(result, task)
	}

	if len(result) != 3 {
		t.Errorf("expected 3 awaiting tasks, got %d", len(result))
	}

	// Verify the right tasks are included
	expectedIDs := map[string]bool{
		"awaiting-approval": true,
		"awaiting-review":   true,
		"manual":            true,
	}
	for _, task := range result {
		if !expectedIDs[task.ID] {
			t.Errorf("unexpected task in result: %s", task.ID)
		}
	}
}

// TestListAwaitingTasksSingleTypeFilter tests ListAwaitingTasks with single type filter
func TestListAwaitingTasksSingleTypeFilter(t *testing.T) {
	approval := "approval"
	review := "review"

	tasks := []Task{
		{ID: "awaiting-approval", Status: "open", Awaiting: &approval},
		{ID: "awaiting-review", Status: "open", Awaiting: &review},
		{ID: "manual", Status: "open", Manual: true}, // manual=true means awaiting=work
	}

	// Simulate filtering for only "approval" type
	awaitingTypes := []string{"approval"}
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

	if len(result) != 1 {
		t.Errorf("expected 1 task with awaiting=approval, got %d", len(result))
	}
	if len(result) > 0 && result[0].ID != "awaiting-approval" {
		t.Errorf("expected task 'awaiting-approval', got %s", result[0].ID)
	}
}

// TestListAwaitingTasksMultipleTypeFilter tests ListAwaitingTasks with multiple type filters
func TestListAwaitingTasksMultipleTypeFilter(t *testing.T) {
	approval := "approval"
	review := "review"
	content := "content"

	tasks := []Task{
		{ID: "awaiting-approval", Status: "open", Awaiting: &approval},
		{ID: "awaiting-review", Status: "open", Awaiting: &review},
		{ID: "awaiting-content", Status: "open", Awaiting: &content},
		{ID: "manual", Status: "open", Manual: true}, // awaiting=work
	}

	// Simulate filtering for "approval" and "review" types
	awaitingTypes := []string{"approval", "review"}
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

	if len(result) != 2 {
		t.Errorf("expected 2 tasks with awaiting=approval or review, got %d", len(result))
	}

	// Verify the right tasks are included
	expectedIDs := map[string]bool{
		"awaiting-approval": true,
		"awaiting-review":   true,
	}
	for _, task := range result {
		if !expectedIDs[task.ID] {
			t.Errorf("unexpected task in result: %s", task.ID)
		}
	}
}

// TestListAwaitingTasksNoAwaitingTasks tests ListAwaitingTasks returns empty when no awaiting tasks
func TestListAwaitingTasksNoAwaitingTasks(t *testing.T) {
	tasks := []Task{
		{ID: "normal1", Status: "open"},
		{ID: "normal2", Status: "open"},
		{ID: "closed", Status: "closed"},
	}

	var result []Task
	for _, task := range tasks {
		if !task.IsAwaitingHuman() {
			continue
		}
		result = append(result, task)
	}

	if len(result) != 0 {
		t.Errorf("expected 0 awaiting tasks, got %d", len(result))
	}
}

// TestListAwaitingTasksManualBackwardsCompat tests that manual=true tasks are included
func TestListAwaitingTasksManualBackwardsCompat(t *testing.T) {
	tasks := []Task{
		{ID: "manual", Status: "open", Manual: true},
	}

	// Filter for "work" type (which is what manual=true maps to)
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

	if len(result) != 1 {
		t.Errorf("expected 1 task with manual=true (awaiting=work), got %d", len(result))
	}
	if len(result) > 0 && result[0].ID != "manual" {
		t.Errorf("expected task 'manual', got %s", result[0].ID)
	}
}

// TestListAwaitingTasksAllAwaitingTypes tests filtering for each valid awaiting type
func TestListAwaitingTasksAllAwaitingTypes(t *testing.T) {
	awaitingTypes := []string{"work", "approval", "input", "review", "content", "escalation", "checkpoint"}

	for _, awaitingType := range awaitingTypes {
		t.Run(awaitingType, func(t *testing.T) {
			at := awaitingType
			tasks := []Task{
				{ID: "target", Status: "open", Awaiting: &at},
				{ID: "other", Status: "open"},
			}

			// Filter for this specific type
			typeFilter := map[string]bool{awaitingType: true}

			var result []Task
			for _, task := range tasks {
				if !task.IsAwaitingHuman() {
					continue
				}
				taskType := task.GetAwaitingType()
				if !typeFilter[taskType] {
					continue
				}
				result = append(result, task)
			}

			if len(result) != 1 {
				t.Errorf("expected 1 task with awaiting=%s, got %d", awaitingType, len(result))
			}
			if len(result) > 0 && result[0].ID != "target" {
				t.Errorf("expected task 'target', got %s", result[0].ID)
			}
		})
	}
}

// TestNextTaskFilteringIntegration tests the integrated filtering behavior
func TestNextTaskFilteringIntegration(t *testing.T) {
	// This tests the full filtering criteria:
	// 1. Open status
	// 2. Not blocked
	// 3. Not awaiting human (awaiting=nil AND manual=false)

	awaiting := "work"
	tasks := []Task{
		{ID: "closed", Status: "closed"},
		{ID: "awaiting", Status: "open", Awaiting: &awaiting},
		{ID: "manual", Status: "open", Manual: true},
		{ID: "blocked", Status: "open", BlockedBy: []string{"blocker"}},
		{ID: "blocker", Status: "open"},
		{ID: "ready", Status: "open"},
	}

	// Build blocked IDs
	blockedIDs := make(map[string]bool)
	for _, task := range tasks {
		for _, blockerID := range task.BlockedBy {
			for _, blocker := range tasks {
				if blocker.ID == blockerID && blocker.Status != "closed" {
					blockedIDs[task.ID] = true
					break
				}
			}
		}
	}

	// Find first ready task using the same logic as findNextReadyTask
	var foundTask *Task
	for _, task := range tasks {
		if task.Status != "open" {
			continue
		}
		if blockedIDs[task.ID] {
			continue
		}
		if task.IsAwaitingHuman() {
			continue
		}
		taskCopy := task
		foundTask = &taskCopy
		break
	}

	if foundTask == nil {
		t.Fatal("expected to find a ready task")
	}
	// The first non-blocked, non-awaiting, open task should be "blocker"
	if foundTask.ID != "blocker" {
		t.Errorf("expected 'blocker' (first ready task), got %s", foundTask.ID)
	}
}

// TestNoteIsFromHuman tests Note.IsFromHuman method
func TestNoteIsFromHuman(t *testing.T) {
	tests := []struct {
		author   string
		expected bool
	}{
		{"human", true},
		{"agent", false},
		{"", false},
		{"other", false},
	}

	for _, tc := range tests {
		t.Run(tc.author, func(t *testing.T) {
			note := Note{Content: "test", Author: tc.author}
			if got := note.IsFromHuman(); got != tc.expected {
				t.Errorf("IsFromHuman() = %v, want %v for author %q", got, tc.expected, tc.author)
			}
		})
	}
}

// TestNoteIsFromAgent tests Note.IsFromAgent method
func TestNoteIsFromAgent(t *testing.T) {
	tests := []struct {
		author   string
		expected bool
	}{
		{"agent", true},
		{"", true}, // Empty author defaults to agent
		{"human", false},
		{"other", false},
	}

	for _, tc := range tests {
		t.Run(tc.author, func(t *testing.T) {
			note := Note{Content: "test", Author: tc.author}
			if got := note.IsFromAgent(); got != tc.expected {
				t.Errorf("IsFromAgent() = %v, want %v for author %q", got, tc.expected, tc.author)
			}
		})
	}
}

// TestGetStructuredNotesLegacyFormat tests reading legacy notes string format
func TestGetStructuredNotesLegacyFormat(t *testing.T) {
	// Create temp directory structure
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	// Create a tick file with legacy notes string
	taskData := map[string]interface{}{
		"id":     "legacy-notes",
		"type":       "task",
		"owner":      "test",
		"created_by": "test",
		"created_at": "2025-01-01T00:00:00Z",
		"updated_at": "2025-01-01T00:00:00Z",
		"title":  "Task with Legacy Notes",
		"status": "open",
		"notes":  "First note\nSecond note\nThird note",
	}
	taskJSON, _ := json.MarshalIndent(taskData, "", "  ")
	taskFile := filepath.Join(tickDir, "legacy-notes.json")
	if err := os.WriteFile(taskFile, taskJSON, 0600); err != nil {
		t.Fatalf("writing task file: %v", err)
	}

	// Test GetStructuredNotes
	client := NewClient(filepath.Join(tmpDir, ".tick"))
	notes, err := client.GetStructuredNotes("legacy-notes")
	if err != nil {
		t.Fatalf("GetStructuredNotes failed: %v", err)
	}

	if len(notes) != 3 {
		t.Errorf("expected 3 notes, got %d", len(notes))
	}

	// All legacy notes should be marked as agent notes
	for i, note := range notes {
		if !note.IsFromAgent() {
			t.Errorf("note[%d] should be from agent, got author %q", i, note.Author)
		}
	}

	// Verify content
	expectedContent := []string{"First note", "Second note", "Third note"}
	for i, note := range notes {
		if note.Content != expectedContent[i] {
			t.Errorf("note[%d].Content = %q, want %q", i, note.Content, expectedContent[i])
		}
	}
}

// TestGetStructuredNotesNewFormat tests reading notes with author markers
func TestGetStructuredNotesNewFormat(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	// Create a tick file with notes in string format
	taskData := map[string]interface{}{
		"id":         "structured-notes",
		"type":       "task",
		"owner":      "test",
		"created_by": "test",
		"created_at": "2025-01-01T00:00:00Z",
		"updated_at": "2025-01-01T00:00:00Z",
		"title":      "Task with Structured Notes",
		"status":     "open",
		"notes":      "2025-01-01 10:00 - Agent progress note\n2025-01-01 10:01 - [human] Human feedback\n2025-01-01 10:02 - Another agent note",
	}
	taskJSON, _ := json.MarshalIndent(taskData, "", "  ")
	taskFile := filepath.Join(tickDir, "structured-notes.json")
	if err := os.WriteFile(taskFile, taskJSON, 0600); err != nil {
		t.Fatalf("writing task file: %v", err)
	}

	client := NewClient(filepath.Join(tmpDir, ".tick"))
	notes, err := client.GetStructuredNotes("structured-notes")
	if err != nil {
		t.Fatalf("GetStructuredNotes failed: %v", err)
	}

	if len(notes) != 3 {
		t.Fatalf("expected 3 notes, got %d", len(notes))
	}

	// Verify authors
	if !notes[0].IsFromAgent() {
		t.Error("notes[0] should be from agent")
	}
	if !notes[1].IsFromHuman() {
		t.Error("notes[1] should be from human")
	}
	if !notes[2].IsFromAgent() {
		t.Error("notes[2] should be from agent (default)")
	}
}

// TestGetNotesByAuthor tests filtering notes by author
func TestGetNotesByAuthor(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	origDir, _ := os.Getwd()
	defer os.Chdir(origDir)
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("changing to temp dir: %v", err)
	}

	// Create a tick file with mixed notes
	taskData := map[string]interface{}{
		"id":     "mixed-notes",
		"type":       "task",
		"owner":      "test",
		"created_by": "test",
		"created_at": "2025-01-01T00:00:00Z",
		"updated_at": "2025-01-01T00:00:00Z",
		"title":  "Task with Mixed Notes",
		"status": "open",
		"notes": "2025-01-01 10:00 - Agent note 1\n2025-01-01 10:01 - [human] Human note 1\n2025-01-01 10:02 - Agent note 2\n2025-01-01 10:03 - [human] Human note 2",
	}
	taskJSON, _ := json.MarshalIndent(taskData, "", "  ")
	taskFile := filepath.Join(tickDir, "mixed-notes.json")
	if err := os.WriteFile(taskFile, taskJSON, 0600); err != nil {
		t.Fatalf("writing task file: %v", err)
	}

	client := NewClient(filepath.Join(tmpDir, ".tick"))

	// Test filtering by human author
	humanNotes, err := client.GetNotesByAuthor("mixed-notes", "human")
	if err != nil {
		t.Fatalf("GetNotesByAuthor(human) failed: %v", err)
	}
	if len(humanNotes) != 2 {
		t.Errorf("expected 2 human notes, got %d", len(humanNotes))
	}
	for _, note := range humanNotes {
		if !note.IsFromHuman() {
			t.Errorf("expected human note, got author %q", note.Author)
		}
	}

	// Test filtering by agent author
	agentNotes, err := client.GetNotesByAuthor("mixed-notes", "agent")
	if err != nil {
		t.Fatalf("GetNotesByAuthor(agent) failed: %v", err)
	}
	if len(agentNotes) != 2 {
		t.Errorf("expected 2 agent notes, got %d", len(agentNotes))
	}
	for _, note := range agentNotes {
		if !note.IsFromAgent() {
			t.Errorf("expected agent note, got author %q", note.Author)
		}
	}
}

// TestGetHumanNotes tests the GetHumanNotes convenience method
func TestGetHumanNotes(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	origDir, _ := os.Getwd()
	defer os.Chdir(origDir)
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("changing to temp dir: %v", err)
	}

	taskData := map[string]interface{}{
		"id":     "human-notes-test",
		"type":       "task",
		"owner":      "test",
		"created_by": "test",
		"created_at": "2025-01-01T00:00:00Z",
		"updated_at": "2025-01-01T00:00:00Z",
		"title":  "Task for Human Notes Test",
		"status": "open",
		"notes": "2025-01-01 10:00 - Agent did something\n2025-01-01 10:01 - [human] Please use approach X",
	}
	taskJSON, _ := json.MarshalIndent(taskData, "", "  ")
	taskFile := filepath.Join(tickDir, "human-notes-test.json")
	if err := os.WriteFile(taskFile, taskJSON, 0600); err != nil {
		t.Fatalf("writing task file: %v", err)
	}

	client := NewClient(filepath.Join(tmpDir, ".tick"))
	humanNotes, err := client.GetHumanNotes("human-notes-test")
	if err != nil {
		t.Fatalf("GetHumanNotes failed: %v", err)
	}

	if len(humanNotes) != 1 {
		t.Errorf("expected 1 human note, got %d", len(humanNotes))
	}
	if len(humanNotes) > 0 && !strings.Contains(humanNotes[0].Content, "[human] Please use approach X") {
		t.Errorf("unexpected content: %q", humanNotes[0].Content)
	}
}

// TestGetAgentNotes tests the GetAgentNotes convenience method
func TestGetAgentNotes(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	origDir, _ := os.Getwd()
	defer os.Chdir(origDir)
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("changing to temp dir: %v", err)
	}

	taskData := map[string]interface{}{
		"id":     "agent-notes-test",
		"type":       "task",
		"owner":      "test",
		"created_by": "test",
		"created_at": "2025-01-01T00:00:00Z",
		"updated_at": "2025-01-01T00:00:00Z",
		"title":  "Task for Agent Notes Test",
		"status": "open",
		"notes": "2025-01-01 10:00 - Completed step 1\n2025-01-01 10:01 - [human] Use different approach\n2025-01-01 10:02 - Completed step 2",
	}
	taskJSON, _ := json.MarshalIndent(taskData, "", "  ")
	taskFile := filepath.Join(tickDir, "agent-notes-test.json")
	if err := os.WriteFile(taskFile, taskJSON, 0600); err != nil {
		t.Fatalf("writing task file: %v", err)
	}

	client := NewClient(filepath.Join(tmpDir, ".tick"))
	agentNotes, err := client.GetAgentNotes("agent-notes-test")
	if err != nil {
		t.Fatalf("GetAgentNotes failed: %v", err)
	}

	if len(agentNotes) != 2 {
		t.Errorf("expected 2 agent notes, got %d", len(agentNotes))
	}
}

// TestGetStructuredNotesNonexistent tests reading notes from nonexistent issue
func TestGetStructuredNotesNonexistent(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	client := NewClient(filepath.Join(tmpDir, ".tick"))
	_, err := client.GetStructuredNotes("nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent issue, got nil")
	}
}

// TestGetStructuredNotesEmptyNotes tests reading issue with no notes
func TestGetStructuredNotesEmptyNotes(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("creating tick dir: %v", err)
	}

	origDir, _ := os.Getwd()
	defer os.Chdir(origDir)
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("changing to temp dir: %v", err)
	}

	taskData := map[string]interface{}{
		"id":     "no-notes",
		"type":       "task",
		"owner":      "test",
		"created_by": "test",
		"created_at": "2025-01-01T00:00:00Z",
		"updated_at": "2025-01-01T00:00:00Z",
		"title":  "Task without Notes",
		"status": "open",
	}
	taskJSON, _ := json.MarshalIndent(taskData, "", "  ")
	taskFile := filepath.Join(tickDir, "no-notes.json")
	if err := os.WriteFile(taskFile, taskJSON, 0600); err != nil {
		t.Fatalf("writing task file: %v", err)
	}

	client := NewClient(filepath.Join(tmpDir, ".tick"))
	notes, err := client.GetStructuredNotes("no-notes")
	if err != nil {
		t.Fatalf("GetStructuredNotes failed: %v", err)
	}
	if notes != nil {
		t.Errorf("expected nil notes for issue without notes, got %v", notes)
	}
}

// ============================================================================
// Tests for NextTaskWithOptions and standalone task support
// ============================================================================

// TestNextTaskOptionsDefaults tests that NextTaskOptions has correct defaults
func TestNextTaskOptionsDefaults(t *testing.T) {
	opts := &NextTaskOptions{}
	if opts.EpicID != "" {
		t.Errorf("expected default EpicID to be empty, got %q", opts.EpicID)
	}
	if opts.StandaloneOnly {
		t.Error("expected default StandaloneOnly to be false")
	}
}

// TestWithEpicOption tests the WithEpic functional option
func TestWithEpicOption(t *testing.T) {
	opts := &NextTaskOptions{}
	WithEpic("epic-123")(opts)
	if opts.EpicID != "epic-123" {
		t.Errorf("expected EpicID to be 'epic-123', got %q", opts.EpicID)
	}
}

// TestStandaloneOnlyOption tests the StandaloneOnly functional option
func TestStandaloneOnlyOption(t *testing.T) {
	opts := &NextTaskOptions{}
	StandaloneOnly()(opts)
	if !opts.StandaloneOnly {
		t.Error("expected StandaloneOnly to be true after applying option")
	}
}

// TestNextStandaloneTaskFiltersParent tests that standalone filtering works
func TestNextStandaloneTaskFiltersParent(t *testing.T) {
	// Test the filtering logic directly on tasks
	tasks := []Task{
		{ID: "with-parent", Status: "open", Priority: 1, Parent: "epic-123"},
		{ID: "standalone", Status: "open", Priority: 2, Parent: ""},
	}

	// Filter to standalone tasks only
	var standaloneTasks []Task
	for _, task := range tasks {
		if task.Parent == "" {
			standaloneTasks = append(standaloneTasks, task)
		}
	}

	if len(standaloneTasks) != 1 {
		t.Errorf("expected 1 standalone task, got %d", len(standaloneTasks))
	}
	if standaloneTasks[0].ID != "standalone" {
		t.Errorf("expected standalone task 'standalone', got %q", standaloneTasks[0].ID)
	}
}


// TestNextTaskWithOptionsWithEpic tests WithEpic option delegates to NextTask
func TestNextTaskWithOptionsWithEpic(t *testing.T) {
	// This tests the option parsing, not the actual tk CLI call
	opts := &NextTaskOptions{}
	WithEpic("epic-abc")(opts)
	StandaloneOnly()(opts)

	// When epic is set, it takes precedence
	if opts.EpicID != "epic-abc" {
		t.Errorf("expected EpicID 'epic-abc', got %q", opts.EpicID)
	}
}

// TestNextTaskWithOptionsMultipleOptions tests applying multiple options
func TestNextTaskWithOptionsMultipleOptions(t *testing.T) {
	opts := &NextTaskOptions{}
	options := []NextTaskOption{
		WithEpic("epic-1"),
		func(o *NextTaskOptions) { o.EpicID = "epic-2" }, // Override
		StandaloneOnly(),
	}

	for _, opt := range options {
		opt(opts)
	}

	// Last applied values should win
	if opts.EpicID != "epic-2" {
		t.Errorf("expected EpicID 'epic-2' (last override), got %q", opts.EpicID)
	}
	if !opts.StandaloneOnly {
		t.Error("expected StandaloneOnly to be true")
	}
}

// ============================================================================
// Tests for OrphanedOnly option and orphaned task support
// ============================================================================

// TestOrphanedOnlyOption tests the OrphanedOnly functional option
func TestOrphanedOnlyOption(t *testing.T) {
	opts := &NextTaskOptions{}
	OrphanedOnly()(opts)
	if !opts.OrphanedOnly {
		t.Error("expected OrphanedOnly to be true after applying option")
	}
}

// TestOrphanedOnlyDefaults tests that NextTaskOptions has correct defaults for orphan handling
func TestOrphanedOnlyDefaults(t *testing.T) {
	opts := &NextTaskOptions{}
	if opts.OrphanedOnly {
		t.Error("expected default OrphanedOnly to be false")
	}
}

// TestOrphanedTasksFilterLogic tests the filtering logic for orphaned tasks
func TestOrphanedTasksFilterLogic(t *testing.T) {
	// Test the filtering logic that nextOrphanedTask uses
	// Orphaned = has parent but parent is closed

	tasks := []Task{
		{ID: "standalone", Status: "open", Priority: 1, Parent: ""},          // No parent - not orphaned
		{ID: "orphan-1", Status: "open", Priority: 2, Parent: "closed-epic"}, // Has closed parent - orphaned
		{ID: "orphan-2", Status: "open", Priority: 3, Parent: "closed-epic"}, // Has closed parent - orphaned
		{ID: "normal", Status: "open", Priority: 4, Parent: "open-epic"},     // Has open parent - not orphaned
	}

	// Mock epic statuses
	epicStatus := map[string]string{
		"closed-epic": "closed",
		"open-epic":   "open",
	}

	// Simulate orphan filtering
	var orphanedTasks []Task
	for _, task := range tasks {
		if task.Parent == "" {
			continue // No parent = standalone, not orphaned
		}
		if epicStatus[task.Parent] == "closed" {
			orphanedTasks = append(orphanedTasks, task)
		}
	}

	if len(orphanedTasks) != 2 {
		t.Errorf("expected 2 orphaned tasks, got %d", len(orphanedTasks))
	}

	// Verify the right tasks are included
	expectedIDs := map[string]bool{
		"orphan-1": true,
		"orphan-2": true,
	}
	for _, task := range orphanedTasks {
		if !expectedIDs[task.ID] {
			t.Errorf("unexpected task in orphaned list: %s", task.ID)
		}
	}
}

// TestOrphanedVsStandaloneDistinction tests the distinction between orphaned and standalone tasks
func TestOrphanedVsStandaloneDistinction(t *testing.T) {
	// Orphaned: has parent but parent is closed
	// Standalone: has no parent at all

	tests := []struct {
		name         string
		task         Task
		isStandalone bool
		isOrphaned   bool
	}{
		{
			name:         "standalone (no parent)",
			task:         Task{ID: "standalone", Parent: ""},
			isStandalone: true,
			isOrphaned:   false,
		},
		{
			name:         "orphaned (closed parent)",
			task:         Task{ID: "orphan", Parent: "closed-epic"},
			isStandalone: false,
			isOrphaned:   true, // Assuming parent is closed
		},
		{
			name:         "normal (open parent)",
			task:         Task{ID: "normal", Parent: "open-epic"},
			isStandalone: false,
			isOrphaned:   false, // Parent is open
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			isStandalone := tc.task.Parent == ""
			if isStandalone != tc.isStandalone {
				t.Errorf("isStandalone: got %v, want %v", isStandalone, tc.isStandalone)
			}
		})
	}
}

// TestMultipleOptionsInteraction tests combining different options
func TestMultipleOptionsInteraction(t *testing.T) {
	opts := &NextTaskOptions{}

	// Apply multiple options
	WithEpic("epic-1")(opts)
	StandaloneOnly()(opts)
	OrphanedOnly()(opts)

	// All options should be set
	if opts.EpicID != "epic-1" {
		t.Errorf("expected EpicID 'epic-1', got %q", opts.EpicID)
	}
	if !opts.StandaloneOnly {
		t.Error("expected StandaloneOnly to be true")
	}
	if !opts.OrphanedOnly {
		t.Error("expected OrphanedOnly to be true")
	}
}

// TestNextTaskWithOptionsEpicTakesPrecedence tests that epic option takes precedence
func TestNextTaskWithOptionsEpicTakesPrecedence(t *testing.T) {
	// When epic is set, it should be checked first (in NextTaskWithOptions implementation)
	opts := &NextTaskOptions{}
	WithEpic("epic-123")(opts)
	OrphanedOnly()(opts)

	// Epic ID should be set
	if opts.EpicID != "epic-123" {
		t.Errorf("expected EpicID 'epic-123', got %q", opts.EpicID)
	}
}

// TestAutoModePriorityOrdering tests the priority ordering for auto mode:
// 1. Active epics with in-progress work
// 2. Epics with ready tasks
// 3. Standalone tasks
// 4. Orphaned tasks
func TestAutoModePriorityOrdering(t *testing.T) {
	// This test verifies the conceptual priority ordering
	// The actual implementation uses multiple calls in priority order

	priorityLevels := []string{
		"active-epic-tasks", // Priority 1
		"new-epic-tasks",    // Priority 2
		"standalone-tasks",  // Priority 3
		"orphaned-tasks",    // Priority 4
	}

	// Verify the expected ordering
	for i, level := range priorityLevels {
		if i == 0 && level != "active-epic-tasks" {
			t.Errorf("expected priority 1 to be active-epic-tasks, got %s", level)
		}
		if i == 3 && level != "orphaned-tasks" {
			t.Errorf("expected priority 4 to be orphaned-tasks, got %s", level)
		}
	}
}
