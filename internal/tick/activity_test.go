package tick

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLogActivity(t *testing.T) {
	// Create temp directory
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	os.MkdirAll(filepath.Join(tickDir, "issues"), 0o755)
	
	store := NewStore(tickDir)
	
	err := store.LogActivity("test123", ActivityCreate, "tester@example.com", "epic1", map[string]interface{}{"title": "Test Tick"})
	if err != nil {
		t.Fatalf("LogActivity failed: %v", err)
	}
	
	// Read back
	activities, err := store.ReadActivity(10)
	if err != nil {
		t.Fatalf("ReadActivity failed: %v", err)
	}
	
	if len(activities) != 1 {
		t.Fatalf("Expected 1 activity, got %d", len(activities))
	}
	
	if activities[0].TickID != "test123" {
		t.Errorf("Expected tickID 'test123', got '%s'", activities[0].TickID)
	}
	if activities[0].Action != ActivityCreate {
		t.Errorf("Expected action 'create', got '%s'", activities[0].Action)
	}
}

func TestWriteLogsActivity(t *testing.T) {
	// Create temp directory
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	os.MkdirAll(filepath.Join(tickDir, "issues"), 0o755)
	
	store := NewStore(tickDir)
	
	// Create a new tick
	now := time.Now()
	tick := Tick{
		ID:        "abc",
		Title:     "Test Tick",
		Status:    StatusOpen,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "test@example.com",
		CreatedBy: "test@example.com",
		CreatedAt: now,
		UpdatedAt: now,
	}
	
	if err := store.Write(tick); err != nil {
		t.Fatalf("Write failed: %v", err)
	}
	
	// Check activity was logged
	activities, err := store.ReadActivity(10)
	if err != nil {
		t.Fatalf("ReadActivity failed: %v", err)
	}
	
	t.Logf("Activities: %+v", activities)
	
	if len(activities) != 1 {
		t.Fatalf("Expected 1 activity, got %d", len(activities))
	}
	
	if activities[0].Action != ActivityCreate {
		t.Errorf("Expected action 'create', got '%s'", activities[0].Action)
	}
}
