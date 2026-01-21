package runrecord

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
)

func TestStore_WriteRead(t *testing.T) {
	dir := t.TempDir()

	store := NewStore(dir)

	record := &agent.RunRecord{
		SessionID: "test-session-123",
		Model:     "claude-sonnet-4-20250514",
		StartedAt: time.Now().Add(-5 * time.Minute),
		EndedAt:   time.Now(),
		Output:    "Task completed successfully",
		Thinking:  "Let me analyze this...",
		Tools: []agent.ToolRecord{
			{Name: "Read", Input: "file.go", Duration: 100, IsError: false},
			{Name: "Edit", Input: "file.go", Duration: 200, IsError: false},
		},
		Metrics: agent.MetricsRecord{
			InputTokens:  1000,
			OutputTokens: 500,
			CostUSD:      0.05,
			DurationMS:   30000,
		},
		Success:  true,
		NumTurns: 3,
	}

	// Write
	err := store.Write("abc", record)
	if err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	// Verify file exists
	path := filepath.Join(dir, ".tick", "logs", "records", "abc.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatal("Run record file not created")
	}

	// Read back
	got, err := store.Read("abc")
	if err != nil {
		t.Fatalf("Read failed: %v", err)
	}

	if got.SessionID != record.SessionID {
		t.Errorf("SessionID mismatch: got %q, want %q", got.SessionID, record.SessionID)
	}
	if got.Model != record.Model {
		t.Errorf("Model mismatch: got %q, want %q", got.Model, record.Model)
	}
	if got.Success != record.Success {
		t.Errorf("Success mismatch: got %v, want %v", got.Success, record.Success)
	}
	if got.NumTurns != record.NumTurns {
		t.Errorf("NumTurns mismatch: got %d, want %d", got.NumTurns, record.NumTurns)
	}
	if len(got.Tools) != len(record.Tools) {
		t.Errorf("Tools length mismatch: got %d, want %d", len(got.Tools), len(record.Tools))
	}
}

func TestStore_ReadNotFound(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	_, err := store.Read("nonexistent")
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got: %v", err)
	}
}

func TestStore_Exists(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	if store.Exists("abc") {
		t.Error("Exists returned true for nonexistent record")
	}

	record := &agent.RunRecord{SessionID: "test"}
	if err := store.Write("abc", record); err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	if !store.Exists("abc") {
		t.Error("Exists returned false for existing record")
	}
}

func TestStore_Delete(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	record := &agent.RunRecord{SessionID: "test"}
	if err := store.Write("abc", record); err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	if err := store.Delete("abc"); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	if store.Exists("abc") {
		t.Error("Record still exists after delete")
	}

	// Delete nonexistent should not error
	if err := store.Delete("nonexistent"); err != nil {
		t.Errorf("Delete nonexistent returned error: %v", err)
	}
}

func TestStore_List(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	// Empty list initially
	ids, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(ids) != 0 {
		t.Errorf("Expected empty list, got %d items", len(ids))
	}

	// Write some records
	for _, id := range []string{"abc", "def", "xyz"} {
		record := &agent.RunRecord{SessionID: id}
		if err := store.Write(id, record); err != nil {
			t.Fatalf("Write %s failed: %v", id, err)
		}
	}

	ids, err = store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(ids) != 3 {
		t.Errorf("Expected 3 items, got %d", len(ids))
	}
}

func TestStore_ListSkipsLiveFiles(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	// Create records directory
	runrecordsDir := filepath.Join(dir, ".tick", "logs", "records")
	if err := os.MkdirAll(runrecordsDir, 0755); err != nil {
		t.Fatalf("Failed to create dir: %v", err)
	}

	// Create a regular record
	if err := os.WriteFile(filepath.Join(runrecordsDir, "abc.json"), []byte("{}"), 0644); err != nil {
		t.Fatalf("Failed to create file: %v", err)
	}

	// Create a live record (should be skipped)
	if err := os.WriteFile(filepath.Join(runrecordsDir, "def.live.json"), []byte("{}"), 0644); err != nil {
		t.Fatalf("Failed to create file: %v", err)
	}

	ids, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if len(ids) != 1 {
		t.Errorf("Expected 1 item (excluding .live.json), got %d", len(ids))
	}
	if len(ids) > 0 && ids[0] != "abc" {
		t.Errorf("Expected 'abc', got %q", ids[0])
	}
}

func TestStore_WriteLive(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	snap := agent.AgentStateSnapshot{
		SessionID: "live-session-123",
		Model:     "claude-sonnet-4-20250514",
		StartedAt: time.Now(),
		Output:    "Working on task...",
		Thinking:  "Let me think...",
		Status:    agent.StatusWriting,
		NumTurns:  1,
		Metrics: agent.Metrics{
			InputTokens:  500,
			OutputTokens: 200,
			CostUSD:      0.02,
		},
		ToolHistory: []agent.ToolActivity{
			{Name: "Read", Input: "file.go", Duration: 100 * time.Millisecond},
		},
	}

	// Write live record
	err := store.WriteLive("abc", snap)
	if err != nil {
		t.Fatalf("WriteLive failed: %v", err)
	}

	// Verify .live.json file exists
	livePath := filepath.Join(dir, ".tick", "logs", "records", "abc.live.json")
	if _, err := os.Stat(livePath); os.IsNotExist(err) {
		t.Fatal("Live record file not created")
	}

	// Verify LiveExists returns true
	if !store.LiveExists("abc") {
		t.Error("LiveExists returned false for existing live record")
	}

	// Read the file and verify content
	data, err := os.ReadFile(livePath)
	if err != nil {
		t.Fatalf("Failed to read live file: %v", err)
	}

	if len(data) == 0 {
		t.Error("Live file is empty")
	}

	// Should contain the session ID
	if !contains(string(data), "live-session-123") {
		t.Error("Live file doesn't contain session ID")
	}
}

func TestStore_FinalizeLive(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	snap := agent.AgentStateSnapshot{
		SessionID: "finalize-session",
		Model:     "claude-sonnet-4-20250514",
		StartedAt: time.Now(),
		Output:    "Task complete!",
		Status:    agent.StatusComplete,
	}

	// Write live record
	err := store.WriteLive("xyz", snap)
	if err != nil {
		t.Fatalf("WriteLive failed: %v", err)
	}

	// Verify .live.json exists and .json doesn't
	livePath := filepath.Join(dir, ".tick", "logs", "records", "xyz.live.json")
	finalPath := filepath.Join(dir, ".tick", "logs", "records", "xyz.json")

	if _, err := os.Stat(livePath); os.IsNotExist(err) {
		t.Fatal("Live file should exist before finalize")
	}
	if _, err := os.Stat(finalPath); !os.IsNotExist(err) {
		t.Fatal("Final file should not exist before finalize")
	}

	// Finalize
	err = store.FinalizeLive("xyz")
	if err != nil {
		t.Fatalf("FinalizeLive failed: %v", err)
	}

	// Verify .live.json is gone and .json exists
	if _, err := os.Stat(livePath); !os.IsNotExist(err) {
		t.Error("Live file should be removed after finalize")
	}
	if _, err := os.Stat(finalPath); os.IsNotExist(err) {
		t.Error("Final file should exist after finalize")
	}

	// Verify LiveExists returns false after finalize
	if store.LiveExists("xyz") {
		t.Error("LiveExists should return false after finalize")
	}

	// Verify Exists returns true for the final record
	if !store.Exists("xyz") {
		t.Error("Exists should return true after finalize")
	}
}

func TestStore_FinalizeLiveNoOp(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	// Finalize nonexistent live file should be a no-op
	err := store.FinalizeLive("nonexistent")
	if err != nil {
		t.Errorf("FinalizeLive on nonexistent should not error: %v", err)
	}
}

func TestStore_DeleteLive(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	snap := agent.AgentStateSnapshot{
		SessionID: "delete-session",
	}

	// Write live record
	err := store.WriteLive("del", snap)
	if err != nil {
		t.Fatalf("WriteLive failed: %v", err)
	}

	if !store.LiveExists("del") {
		t.Fatal("Live record should exist before delete")
	}

	// Delete live record
	err = store.DeleteLive("del")
	if err != nil {
		t.Fatalf("DeleteLive failed: %v", err)
	}

	if store.LiveExists("del") {
		t.Error("Live record should not exist after delete")
	}

	// Delete nonexistent should not error
	err = store.DeleteLive("nonexistent")
	if err != nil {
		t.Errorf("DeleteLive nonexistent should not error: %v", err)
	}
}

func TestStore_LiveExistsFalse(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	if store.LiveExists("nonexistent") {
		t.Error("LiveExists should return false for nonexistent record")
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

func TestStore_EpicStatus_WriteRead(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	status := &EpicStatus{
		EpicID:     "epic123",
		Status:     "context_generating",
		Message:    "Generating epic context (5 tasks)...",
		TaskCount:  5,
		TokenCount: 0,
	}

	// Write
	err := store.WriteEpicStatus("epic123", status)
	if err != nil {
		t.Fatalf("WriteEpicStatus failed: %v", err)
	}

	// Verify file exists
	path := filepath.Join(dir, ".tick", "logs", "records", "_epic-epic123.status.json")
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatal("Epic status file not created")
	}

	// Read back
	got, err := store.ReadEpicStatus("epic123")
	if err != nil {
		t.Fatalf("ReadEpicStatus failed: %v", err)
	}

	if got.EpicID != status.EpicID {
		t.Errorf("EpicID mismatch: got %q, want %q", got.EpicID, status.EpicID)
	}
	if got.Status != status.Status {
		t.Errorf("Status mismatch: got %q, want %q", got.Status, status.Status)
	}
	if got.Message != status.Message {
		t.Errorf("Message mismatch: got %q, want %q", got.Message, status.Message)
	}
	if got.TaskCount != status.TaskCount {
		t.Errorf("TaskCount mismatch: got %d, want %d", got.TaskCount, status.TaskCount)
	}
	if got.LastUpdated.IsZero() {
		t.Error("LastUpdated should be set")
	}
}

func TestStore_EpicStatus_NotFound(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	_, err := store.ReadEpicStatus("nonexistent")
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got: %v", err)
	}
}

func TestStore_EpicStatus_Exists(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	if store.EpicStatusExists("epic456") {
		t.Error("EpicStatusExists returned true for nonexistent status")
	}

	status := &EpicStatus{EpicID: "epic456", Status: "running"}
	if err := store.WriteEpicStatus("epic456", status); err != nil {
		t.Fatalf("WriteEpicStatus failed: %v", err)
	}

	if !store.EpicStatusExists("epic456") {
		t.Error("EpicStatusExists returned false for existing status")
	}
}

func TestStore_EpicStatus_Delete(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(dir)

	status := &EpicStatus{EpicID: "epic789", Status: "context_generated"}
	if err := store.WriteEpicStatus("epic789", status); err != nil {
		t.Fatalf("WriteEpicStatus failed: %v", err)
	}

	if err := store.DeleteEpicStatus("epic789"); err != nil {
		t.Fatalf("DeleteEpicStatus failed: %v", err)
	}

	if store.EpicStatusExists("epic789") {
		t.Error("Epic status still exists after delete")
	}

	// Delete nonexistent should not error
	if err := store.DeleteEpicStatus("nonexistent"); err != nil {
		t.Errorf("DeleteEpicStatus nonexistent returned error: %v", err)
	}
}

func TestIsEpicStatusFile(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     bool
	}{
		{"valid epic status", "_epic-abc123.status.json", true},
		{"valid epic status with hyphen", "_epic-my-epic.status.json", true},
		{"regular json", "abc.json", false},
		{"live json", "abc.live.json", false},
		{"missing prefix", "epic-abc.status.json", false},
		{"missing suffix", "_epic-abc.json", false},
		{"too short", "_epic-.status.json", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsEpicStatusFile(tt.filename)
			if got != tt.want {
				t.Errorf("IsEpicStatusFile(%q) = %v, want %v", tt.filename, got, tt.want)
			}
		})
	}
}

func TestParseEpicStatusFilename(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     string
	}{
		{"simple epic id", "_epic-abc123.status.json", "abc123"},
		{"epic id with hyphen", "_epic-my-epic.status.json", "my-epic"},
		{"not an epic status file", "abc.json", ""},
		{"not an epic status file live", "abc.live.json", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseEpicStatusFilename(tt.filename)
			if got != tt.want {
				t.Errorf("ParseEpicStatusFilename(%q) = %q, want %q", tt.filename, got, tt.want)
			}
		})
	}
}
