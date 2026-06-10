package migrate

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/runrecord"
)

func TestRunRecordMigration_NoIssuesDir(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatal(err)
	}

	m := NewRunRecordMigration(tickDir)
	result, err := m.Run()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Migrated != 0 {
		t.Errorf("expected 0 migrated, got %d", result.Migrated)
	}
	if result.Skipped != 0 {
		t.Errorf("expected 0 skipped, got %d", result.Skipped)
	}
}

func TestRunRecordMigration_NoRunField(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Create a tick without a run field
	tick := map[string]interface{}{
		"id":         "abc",
		"title":      "Test tick",
		"status":     "open",
		"priority":   2,
		"type":       "task",
		"owner":      "user@example.com",
		"created_by": "user@example.com",
		"created_at": time.Now().Format(time.RFC3339),
		"updated_at": time.Now().Format(time.RFC3339),
	}
	data, _ := json.MarshalIndent(tick, "", "  ")
	if err := os.WriteFile(filepath.Join(issuesDir, "abc.json"), data, 0644); err != nil {
		t.Fatal(err)
	}

	m := NewRunRecordMigration(tickDir)
	result, err := m.Run()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Migrated != 0 {
		t.Errorf("expected 0 migrated, got %d", result.Migrated)
	}
	if result.Skipped != 1 {
		t.Errorf("expected 1 skipped, got %d", result.Skipped)
	}
}

func TestRunRecordMigration_WithRunField(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Create a tick with a run field
	tick := map[string]interface{}{
		"id":         "xyz",
		"title":      "Test tick with run",
		"status":     "closed",
		"priority":   2,
		"type":       "task",
		"owner":      "user@example.com",
		"created_by": "user@example.com",
		"created_at": time.Now().Format(time.RFC3339),
		"updated_at": time.Now().Format(time.RFC3339),
		"run": map[string]interface{}{
			"session_id": "test-session-123",
			"model":      "claude-3",
			"started_at": time.Now().Add(-time.Hour).Format(time.RFC3339),
			"ended_at":   time.Now().Format(time.RFC3339),
			"output":     "Task completed successfully",
			"success":    true,
			"num_turns":  5,
			"metrics": map[string]interface{}{
				"input_tokens":  100,
				"output_tokens": 200,
				"cost_usd":      0.05,
				"duration_ms":   5000,
			},
		},
	}
	data, _ := json.MarshalIndent(tick, "", "  ")
	tickPath := filepath.Join(issuesDir, "xyz.json")
	if err := os.WriteFile(tickPath, data, 0644); err != nil {
		t.Fatal(err)
	}

	m := NewRunRecordMigration(tickDir)
	result, err := m.Run()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Migrated != 1 {
		t.Errorf("expected 1 migrated, got %d", result.Migrated)
	}
	if result.Skipped != 0 {
		t.Errorf("expected 0 skipped, got %d", result.Skipped)
	}

	// Verify the run record was written to the new location
	store := runrecord.NewStore(tmpDir)
	record, err := store.Read("xyz")
	if err != nil {
		t.Fatalf("failed to read migrated record: %v", err)
	}
	if record.SessionID != "test-session-123" {
		t.Errorf("expected session_id 'test-session-123', got '%s'", record.SessionID)
	}
	if record.Output != "Task completed successfully" {
		t.Errorf("expected output 'Task completed successfully', got '%s'", record.Output)
	}

	// Verify the run field was removed from the tick JSON
	data, err = os.ReadFile(tickPath)
	if err != nil {
		t.Fatalf("failed to read updated tick: %v", err)
	}
	var updatedTick map[string]json.RawMessage
	if err := json.Unmarshal(data, &updatedTick); err != nil {
		t.Fatalf("failed to parse updated tick: %v", err)
	}
	if _, hasRun := updatedTick["run"]; hasRun {
		t.Error("run field should have been removed from tick JSON")
	}
	// Verify other fields are preserved
	if _, hasID := updatedTick["id"]; !hasID {
		t.Error("id field should be preserved")
	}
	if _, hasTitle := updatedTick["title"]; !hasTitle {
		t.Error("title field should be preserved")
	}
}

func TestRunRecordMigration_DryRun(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Create a tick with a run field
	tick := map[string]interface{}{
		"id":         "dry",
		"title":      "Test dry run",
		"status":     "closed",
		"priority":   2,
		"type":       "task",
		"owner":      "user@example.com",
		"created_by": "user@example.com",
		"created_at": time.Now().Format(time.RFC3339),
		"updated_at": time.Now().Format(time.RFC3339),
		"run": map[string]interface{}{
			"session_id": "dry-run-session",
			"model":      "claude-3",
			"started_at": time.Now().Format(time.RFC3339),
			"ended_at":   time.Now().Format(time.RFC3339),
			"output":     "Output",
			"success":    true,
			"num_turns":  1,
			"metrics":    map[string]interface{}{},
		},
	}
	data, _ := json.MarshalIndent(tick, "", "  ")
	tickPath := filepath.Join(issuesDir, "dry.json")
	if err := os.WriteFile(tickPath, data, 0644); err != nil {
		t.Fatal(err)
	}

	m := NewRunRecordMigration(tickDir)
	m.SetDryRun(true)
	result, err := m.Run()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Migrated != 1 {
		t.Errorf("expected 1 migrated (in dry run), got %d", result.Migrated)
	}

	// Verify the run record was NOT written
	store := runrecord.NewStore(tmpDir)
	if store.Exists("dry") {
		t.Error("run record should not be written in dry run mode")
	}

	// Verify the tick JSON was NOT modified
	data, _ = os.ReadFile(tickPath)
	var updatedTick map[string]json.RawMessage
	json.Unmarshal(data, &updatedTick)
	if _, hasRun := updatedTick["run"]; !hasRun {
		t.Error("run field should still be present in dry run mode")
	}
}

func TestRunRecordMigration_MultipleTicks(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Create ticks - some with run records, some without
	ticks := []struct {
		id     string
		hasRun bool
	}{
		{"t1", true},
		{"t2", false},
		{"t3", true},
		{"t4", false},
		{"t5", true},
	}

	for _, tc := range ticks {
		tick := map[string]interface{}{
			"id":         tc.id,
			"title":      "Test " + tc.id,
			"status":     "open",
			"priority":   2,
			"type":       "task",
			"owner":      "user@example.com",
			"created_by": "user@example.com",
			"created_at": time.Now().Format(time.RFC3339),
			"updated_at": time.Now().Format(time.RFC3339),
		}
		if tc.hasRun {
			tick["run"] = map[string]interface{}{
				"session_id": "session-" + tc.id,
				"model":      "claude-3",
				"started_at": time.Now().Format(time.RFC3339),
				"ended_at":   time.Now().Format(time.RFC3339),
				"output":     "Output for " + tc.id,
				"success":    true,
				"num_turns":  1,
				"metrics":    map[string]interface{}{},
			}
		}
		data, _ := json.MarshalIndent(tick, "", "  ")
		if err := os.WriteFile(filepath.Join(issuesDir, tc.id+".json"), data, 0644); err != nil {
			t.Fatal(err)
		}
	}

	m := NewRunRecordMigration(tickDir)
	result, err := m.Run()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Migrated != 3 {
		t.Errorf("expected 3 migrated, got %d", result.Migrated)
	}
	if result.Skipped != 2 {
		t.Errorf("expected 2 skipped, got %d", result.Skipped)
	}

	// Verify records were migrated
	store := runrecord.NewStore(tmpDir)
	for _, tc := range ticks {
		exists := store.Exists(tc.id)
		if tc.hasRun && !exists {
			t.Errorf("expected record for %s to exist", tc.id)
		}
		if !tc.hasRun && exists {
			t.Errorf("expected no record for %s", tc.id)
		}
	}
}

func TestNeedsMigration(t *testing.T) {
	t.Run("no issues dir", func(t *testing.T) {
		tmpDir := t.TempDir()
		tickDir := filepath.Join(tmpDir, ".tick")
		os.MkdirAll(tickDir, 0755)

		needs, err := NeedsMigration(tickDir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if needs {
			t.Error("expected no migration needed")
		}
	})

	t.Run("no run fields", func(t *testing.T) {
		tmpDir := t.TempDir()
		tickDir := filepath.Join(tmpDir, ".tick")
		issuesDir := filepath.Join(tickDir, "issues")
		os.MkdirAll(issuesDir, 0755)

		tick := map[string]interface{}{
			"id":         "abc",
			"title":      "Test",
			"status":     "open",
			"priority":   2,
			"type":       "task",
			"owner":      "user@example.com",
			"created_by": "user@example.com",
			"created_at": time.Now().Format(time.RFC3339),
			"updated_at": time.Now().Format(time.RFC3339),
		}
		data, _ := json.MarshalIndent(tick, "", "  ")
		os.WriteFile(filepath.Join(issuesDir, "abc.json"), data, 0644)

		needs, err := NeedsMigration(tickDir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if needs {
			t.Error("expected no migration needed")
		}
	})

	t.Run("has run field", func(t *testing.T) {
		tmpDir := t.TempDir()
		tickDir := filepath.Join(tmpDir, ".tick")
		issuesDir := filepath.Join(tickDir, "issues")
		os.MkdirAll(issuesDir, 0755)

		tick := map[string]interface{}{
			"id":         "abc",
			"title":      "Test",
			"status":     "open",
			"priority":   2,
			"type":       "task",
			"owner":      "user@example.com",
			"created_by": "user@example.com",
			"created_at": time.Now().Format(time.RFC3339),
			"updated_at": time.Now().Format(time.RFC3339),
			"run": map[string]interface{}{
				"session_id": "test",
				"model":      "claude-3",
			},
		}
		data, _ := json.MarshalIndent(tick, "", "  ")
		os.WriteFile(filepath.Join(issuesDir, "abc.json"), data, 0644)

		needs, err := NeedsMigration(tickDir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !needs {
			t.Error("expected migration needed")
		}
	})
}

func TestRunRecordMigration_PreservesFieldOrder(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Create a tick with specific field ordering (JSON object iteration is random in Go,
	// but we should ensure all fields are preserved)
	tick := map[string]interface{}{
		"id":            "order",
		"title":         "Test field preservation",
		"description":   "A description",
		"notes":         "Some notes",
		"status":        "closed",
		"priority":      1,
		"type":          "task",
		"owner":         "user@example.com",
		"labels":        []string{"bug", "urgent"},
		"blocked_by":    []string{"other"},
		"parent":        "epic123",
		"created_by":    "user@example.com",
		"created_at":    time.Now().Format(time.RFC3339),
		"updated_at":    time.Now().Format(time.RFC3339),
		"closed_at":     time.Now().Format(time.RFC3339),
		"closed_reason": "Done",
		"run": map[string]interface{}{
			"session_id": "preserve-test",
			"model":      "claude-3",
			"started_at": time.Now().Format(time.RFC3339),
			"ended_at":   time.Now().Format(time.RFC3339),
			"output":     "Output",
			"success":    true,
			"num_turns":  1,
			"metrics":    map[string]interface{}{},
		},
	}
	data, _ := json.MarshalIndent(tick, "", "  ")
	tickPath := filepath.Join(issuesDir, "order.json")
	if err := os.WriteFile(tickPath, data, 0644); err != nil {
		t.Fatal(err)
	}

	m := NewRunRecordMigration(tickDir)
	if _, err := m.Run(); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	// Read back and verify all fields except 'run' are preserved
	data, _ = os.ReadFile(tickPath)
	var updatedTick map[string]json.RawMessage
	json.Unmarshal(data, &updatedTick)

	expectedFields := []string{
		"id", "title", "description", "notes", "status", "priority", "type",
		"owner", "labels", "blocked_by", "parent", "created_by", "created_at",
		"updated_at", "closed_at", "closed_reason",
	}
	for _, field := range expectedFields {
		if _, ok := updatedTick[field]; !ok {
			t.Errorf("field '%s' should be preserved", field)
		}
	}

	if _, hasRun := updatedTick["run"]; hasRun {
		t.Error("run field should be removed")
	}
}

// Ensure agent.RunRecord is imported and used
var _ = agent.RunRecord{}
