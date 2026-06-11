package tick

import (
	"encoding/json"
	"path/filepath"
	"testing"
	"time"
)

func TestStoreCRUD(t *testing.T) {
	root := filepath.Join(t.TempDir(), ".tick")
	store := NewStore(root)

	now := time.Date(2025, 1, 8, 10, 30, 0, 0, time.UTC)
	tick := Tick{
		ID:        "a1b",
		Title:     "Fix auth",
		Status:    StatusOpen,
		Priority:  2,
		Type:      TypeBug,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := store.Write(tick); err != nil {
		t.Fatalf("write tick: %v", err)
	}

	loaded, err := store.Read("a1b")
	if err != nil {
		t.Fatalf("read tick: %v", err)
	}
	if loaded.ID != tick.ID {
		t.Fatalf("expected id %s, got %s", tick.ID, loaded.ID)
	}

	list, err := store.List()
	if err != nil {
		t.Fatalf("list ticks: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 tick, got %d", len(list))
	}

	if err := store.Delete("a1b"); err != nil {
		t.Fatalf("delete tick: %v", err)
	}
}

// TestActivityOpenToInProgress verifies that saving an open->in_progress
// transition emits an "start" activity entry and sets started_at.
func TestActivityOpenToInProgress(t *testing.T) {
	root := filepath.Join(t.TempDir(), ".tick")
	store := NewStore(root)

	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	tk := Tick{
		ID:        "s1t",
		Title:     "Start me",
		Status:    StatusOpen,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := store.Write(tk); err != nil {
		t.Fatalf("write initial tick: %v", err)
	}

	// Transition to in_progress
	tk.Status = StatusInProgress
	before := time.Now().UTC()
	tk.StartedAt = &before
	tk.UpdatedAt = before
	if err := store.Write(tk); err != nil {
		t.Fatalf("write in_progress tick: %v", err)
	}
	after := time.Now().UTC()

	// Verify started_at is set on the persisted tick
	loaded, err := store.Read("s1t")
	if err != nil {
		t.Fatalf("read tick after start: %v", err)
	}
	if loaded.StartedAt == nil {
		t.Error("started_at should be set after open->in_progress transition")
	} else if loaded.StartedAt.Before(before) || loaded.StartedAt.After(after) {
		t.Errorf("started_at %v not in expected range [%v, %v]", loaded.StartedAt, before, after)
	}

	// Verify activity log contains "start" entry
	activities, err := store.ReadActivity(10)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "s1t" && a.Action == ActivityStart {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected activity entry with action=%q for tick s1t; got %+v", ActivityStart, activities)
	}
}

// TestActivityInProgressToOpen verifies that saving an in_progress->open
// transition clears started_at and emits an "update" activity with status from/to.
func TestActivityInProgressToOpen(t *testing.T) {
	root := filepath.Join(t.TempDir(), ".tick")
	store := NewStore(root)

	startTime := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	tk := Tick{
		ID:        "r1t",
		Title:     "Release me",
		Status:    StatusInProgress,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: startTime,
		UpdatedAt: startTime,
		StartedAt: &startTime,
	}
	if err := store.Write(tk); err != nil {
		t.Fatalf("write initial in_progress tick: %v", err)
	}

	// Transition back to open
	tk.Status = StatusOpen
	tk.StartedAt = nil
	tk.UpdatedAt = time.Now().UTC()
	if err := store.Write(tk); err != nil {
		t.Fatalf("write open tick: %v", err)
	}

	// Verify started_at is cleared
	loaded, err := store.Read("r1t")
	if err != nil {
		t.Fatalf("read tick after release: %v", err)
	}
	if loaded.StartedAt != nil {
		t.Errorf("started_at should be nil after in_progress->open transition, got %v", loaded.StartedAt)
	}

	// Verify activity log contains "update" entry with status from/to
	activities, err := store.ReadActivity(10)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "r1t" && a.Action == ActivityUpdate {
			// Check data has status from/to
			if statusData, ok := a.Data["status"]; ok {
				statusMap, ok := statusData.(map[string]interface{})
				if !ok {
					// Try JSON round-trip
					b, _ := json.Marshal(statusData)
					var m map[string]interface{}
					if err := json.Unmarshal(b, &m); err == nil {
						statusMap = m
					}
				}
				if statusMap["from"] == StatusInProgress && statusMap["to"] == StatusOpen {
					found = true
					break
				}
			}
		}
	}
	if !found {
		t.Errorf("expected activity entry with action=%q and status from/to for tick r1t; got %+v", ActivityUpdate, activities)
	}
}

// TestActivityOpenToClosedRegression verifies that the close path still emits
// action="close" (regression guard for the open->in_progress changes).
func TestActivityOpenToClosedRegression(t *testing.T) {
	root := filepath.Join(t.TempDir(), ".tick")
	store := NewStore(root)

	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	tk := Tick{
		ID:        "c1t",
		Title:     "Close me",
		Status:    StatusOpen,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := store.Write(tk); err != nil {
		t.Fatalf("write initial tick: %v", err)
	}

	closedAt := time.Now().UTC()
	tk.Status = StatusClosed
	tk.ClosedAt = &closedAt
	tk.UpdatedAt = closedAt
	if err := store.Write(tk); err != nil {
		t.Fatalf("write closed tick: %v", err)
	}

	activities, err := store.ReadActivity(10)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "c1t" && a.Action == ActivityClose {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected activity entry with action=%q for tick c1t; got %+v", ActivityClose, activities)
	}
}

// TestActivityLastActivityAfterStart verifies that after saving an
// open->in_progress transition, LastActivityForTicks returns a timestamp
// >= the claim time.
func TestActivityLastActivityAfterStart(t *testing.T) {
	root := filepath.Join(t.TempDir(), ".tick")
	store := NewStore(root)

	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	tk := Tick{
		ID:        "l1t",
		Title:     "Last activity test",
		Status:    StatusOpen,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := store.Write(tk); err != nil {
		t.Fatalf("write initial tick: %v", err)
	}

	claimTime := time.Now().UTC()

	// Transition to in_progress — store.Write must emit a "start" activity entry
	// so that LastActivityForTicks returns a timestamp >= the moment of the write.
	startedAt := claimTime
	tk.Status = StatusInProgress
	tk.StartedAt = &startedAt
	tk.UpdatedAt = claimTime
	if err := store.Write(tk); err != nil {
		t.Fatalf("write in_progress tick: %v", err)
	}
	afterWrite := time.Now().UTC()

	result, err := store.LastActivityForTicks([]string{"l1t"})
	if err != nil {
		t.Fatalf("LastActivityForTicks: %v", err)
	}

	lastActivity, ok := result["l1t"]
	if !ok || lastActivity == nil {
		t.Fatal("expected LastActivityForTicks to return an entry for l1t")
	}

	// The "start" activity must have been logged during or after the write,
	// so its timestamp must be >= claimTime and <= afterWrite.
	if lastActivity.Before(claimTime) {
		t.Errorf("last_activity %v should be >= claim time %v (start event missing or too old)", lastActivity, claimTime)
	}
	if lastActivity.After(afterWrite) {
		t.Errorf("last_activity %v should be <= afterWrite %v", lastActivity, afterWrite)
	}
}
