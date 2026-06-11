package cmd

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// TestUpdateStatusToInProgressEmitsStartActivity verifies that
// `tk update <id> --status in_progress` emits a "start" activity entry,
// sets started_at on the tick, and the tick is findable via list.
func TestUpdateStatusToInProgressEmitsStartActivity(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("ip1")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	claimTime := time.Now().UTC()
	if err := ExecuteArgs([]string{"update", "ip1", "--status", "in_progress"}); err != nil {
		t.Fatalf("ExecuteArgs update --status in_progress: %v", err)
	}

	// Verify started_at is set on the persisted tick
	loaded, err := store.Read("ip1")
	if err != nil {
		t.Fatalf("read tick after update: %v", err)
	}
	if loaded.StartedAt == nil {
		t.Error("started_at should be set after --status in_progress")
	} else if loaded.StartedAt.Before(claimTime) {
		t.Errorf("started_at %v should be >= claim time %v", loaded.StartedAt, claimTime)
	}
	if loaded.Status != tick.StatusInProgress {
		t.Errorf("status should be in_progress, got %q", loaded.Status)
	}

	// Verify "start" activity entry was emitted
	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}
	var found bool
	for _, a := range activities {
		if a.TickID == "ip1" && a.Action == tick.ActivityStart {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected activity entry with action=%q for tick ip1; got %+v", tick.ActivityStart, activities)
	}
}

// TestUpdateStatusInProgressToOpenClearsStartedAt verifies that
// `tk update <id> --status open` on an in_progress tick clears started_at
// and emits an "update" activity entry with status from/to.
func TestUpdateStatusInProgressToOpenClearsStartedAt(t *testing.T) {
	_, store := setupTestRepo(t)

	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	task := tick.Tick{
		ID:        "ip2",
		Title:     "Test in_progress task",
		Status:    tick.StatusInProgress,
		Priority:  2,
		Type:      tick.TypeTask,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: now,
		UpdatedAt: now,
		StartedAt: &now,
	}
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if err := ExecuteArgs([]string{"update", "ip2", "--status", "open"}); err != nil {
		t.Fatalf("ExecuteArgs update --status open: %v", err)
	}

	// Verify started_at is cleared
	loaded, err := store.Read("ip2")
	if err != nil {
		t.Fatalf("read tick after update: %v", err)
	}
	if loaded.StartedAt != nil {
		t.Errorf("started_at should be nil after --status open, got %v", loaded.StartedAt)
	}
	if loaded.Status != tick.StatusOpen {
		t.Errorf("status should be open, got %q", loaded.Status)
	}

	// Verify "update" activity entry with status from/to
	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "ip2" && a.Action == tick.ActivityUpdate {
			if statusData, ok := a.Data["status"]; ok {
				b, _ := json.Marshal(statusData)
				var m map[string]interface{}
				if err := json.Unmarshal(b, &m); err == nil {
					if m["from"] == tick.StatusInProgress && m["to"] == tick.StatusOpen {
						found = true
						break
					}
				}
			}
		}
	}
	if !found {
		t.Errorf("expected activity entry with action=%q and status from/to for tick ip2; got %+v", tick.ActivityUpdate, activities)
	}
}

// TestUpdateStatusToClosedRegressionViaCmd verifies that `tk update <id> --status closed`
// still emits a "close" activity entry (regression guard).
func TestUpdateStatusToClosedRegressionViaCmd(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("ip3")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if err := ExecuteArgs([]string{"update", "ip3", "--status", "closed"}); err != nil {
		t.Fatalf("ExecuteArgs update --status closed: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "ip3" && a.Action == tick.ActivityClose {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected activity entry with action=%q for tick ip3; got %+v", tick.ActivityClose, activities)
	}
}

// makeClosedTestTask returns a closed task with closure metadata set, for
// reopen-path regression tests.
func makeClosedTestTask(id string) tick.Tick {
	task := makeTestTask(id)
	closedAt := time.Date(2025, 1, 9, 12, 0, 0, 0, time.UTC)
	task.Status = tick.StatusClosed
	task.ClosedAt = &closedAt
	task.ClosedReason = "done"
	return task
}

// TestUpdateStatusClosedToOpenClearsClosureMetadata verifies that manually
// reopening a closed tick via `tk update <id> --status open` clears ClosedAt
// and ClosedReason, and still emits the "reopen" activity entry.
func TestUpdateStatusClosedToOpenClearsClosureMetadata(t *testing.T) {
	_, store := setupTestRepo(t)

	if err := store.Write(makeClosedTestTask("ro1")); err != nil {
		t.Fatalf("write closed task: %v", err)
	}

	if err := ExecuteArgs([]string{"update", "ro1", "--status", "open"}); err != nil {
		t.Fatalf("ExecuteArgs update --status open: %v", err)
	}

	loaded, err := store.Read("ro1")
	if err != nil {
		t.Fatalf("read tick after reopen: %v", err)
	}
	if loaded.Status != tick.StatusOpen {
		t.Errorf("status should be open, got %q", loaded.Status)
	}
	if loaded.ClosedAt != nil {
		t.Errorf("ClosedAt should be nil after reopen, got %v", loaded.ClosedAt)
	}
	if loaded.ClosedReason != "" {
		t.Errorf("ClosedReason should be empty after reopen, got %q", loaded.ClosedReason)
	}

	// The closed->open transition must still emit a "reopen" activity entry.
	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}
	var found bool
	for _, a := range activities {
		if a.TickID == "ro1" && a.Action == tick.ActivityReopen {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected activity entry with action=%q for tick ro1; got %+v", tick.ActivityReopen, activities)
	}
}

// TestUpdateStatusClosedToInProgressClearsClosureMetadata verifies that
// moving a closed tick straight to in_progress clears ClosedAt/ClosedReason
// and sets started_at.
func TestUpdateStatusClosedToInProgressClearsClosureMetadata(t *testing.T) {
	_, store := setupTestRepo(t)

	if err := store.Write(makeClosedTestTask("ro2")); err != nil {
		t.Fatalf("write closed task: %v", err)
	}

	claimTime := time.Now().UTC()
	if err := ExecuteArgs([]string{"update", "ro2", "--status", "in_progress"}); err != nil {
		t.Fatalf("ExecuteArgs update --status in_progress: %v", err)
	}

	loaded, err := store.Read("ro2")
	if err != nil {
		t.Fatalf("read tick after update: %v", err)
	}
	if loaded.Status != tick.StatusInProgress {
		t.Errorf("status should be in_progress, got %q", loaded.Status)
	}
	if loaded.ClosedAt != nil {
		t.Errorf("ClosedAt should be nil after closed->in_progress, got %v", loaded.ClosedAt)
	}
	if loaded.ClosedReason != "" {
		t.Errorf("ClosedReason should be empty after closed->in_progress, got %q", loaded.ClosedReason)
	}
	if loaded.StartedAt == nil {
		t.Error("started_at should be set after closed->in_progress")
	} else if loaded.StartedAt.Before(claimTime) {
		t.Errorf("started_at %v should be >= claim time %v", loaded.StartedAt, claimTime)
	}
}

// TestUpdateStatusInProgressIdempotentReclaim verifies that re-running
// `tk update <id> --status in_progress` on an already-in_progress tick is a
// no-op for started_at (not silently reset) and emits no new activity entry,
// preserving the stale-recovery invariant (started_at fresh implies
// last_activity fresh).
func TestUpdateStatusInProgressIdempotentReclaim(t *testing.T) {
	_, store := setupTestRepo(t)

	originalStart := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	task := makeTestTask("ip5")
	task.Status = tick.StatusInProgress
	task.StartedAt = &originalStart
	if err := store.Write(task); err != nil {
		t.Fatalf("write in_progress task: %v", err)
	}

	activitiesBefore, err := store.ReadActivity(0)
	if err != nil {
		t.Fatalf("read activity before: %v", err)
	}

	if err := ExecuteArgs([]string{"update", "ip5", "--status", "in_progress"}); err != nil {
		t.Fatalf("ExecuteArgs update --status in_progress (re-claim): %v", err)
	}

	loaded, err := store.Read("ip5")
	if err != nil {
		t.Fatalf("read tick after re-claim: %v", err)
	}
	if loaded.StartedAt == nil {
		t.Fatal("started_at should still be set after idempotent re-claim")
	}
	if !loaded.StartedAt.Equal(originalStart) {
		t.Errorf("started_at should be unchanged after re-claim: got %v, want %v", loaded.StartedAt, originalStart)
	}

	activitiesAfter, err := store.ReadActivity(0)
	if err != nil {
		t.Fatalf("read activity after: %v", err)
	}
	if len(activitiesAfter) != len(activitiesBefore) {
		t.Errorf("idempotent re-claim should emit no new activity entry: had %d entries, now %d (%+v)",
			len(activitiesBefore), len(activitiesAfter), activitiesAfter)
	}
}

// TestUpdateStatusClosedToOpenClearsStartedAt verifies that reopening a
// closed tick via `tk update <id> --status open` clears a stale started_at
// left over from a previous in_progress->closed transition.
func TestUpdateStatusClosedToOpenClearsStartedAt(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeClosedTestTask("ip6")
	staleStart := time.Date(2025, 1, 9, 11, 0, 0, 0, time.UTC)
	task.StartedAt = &staleStart
	if err := store.Write(task); err != nil {
		t.Fatalf("write closed task: %v", err)
	}

	if err := ExecuteArgs([]string{"update", "ip6", "--status", "open"}); err != nil {
		t.Fatalf("ExecuteArgs update --status open: %v", err)
	}

	loaded, err := store.Read("ip6")
	if err != nil {
		t.Fatalf("read tick after reopen: %v", err)
	}
	if loaded.StartedAt != nil {
		t.Errorf("started_at should be nil after closed->open via update, got %v", loaded.StartedAt)
	}
}

// TestReopenClearsStartedAt verifies that `tk reopen` clears a stale
// started_at left over from a previous in_progress->closed transition.
func TestReopenClearsStartedAt(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeClosedTestTask("ip7")
	staleStart := time.Date(2025, 1, 9, 11, 0, 0, 0, time.UTC)
	task.StartedAt = &staleStart
	if err := store.Write(task); err != nil {
		t.Fatalf("write closed task: %v", err)
	}

	if err := ExecuteArgs([]string{"reopen", "ip7"}); err != nil {
		t.Fatalf("ExecuteArgs reopen: %v", err)
	}

	loaded, err := store.Read("ip7")
	if err != nil {
		t.Fatalf("read tick after reopen: %v", err)
	}
	if loaded.Status != tick.StatusOpen {
		t.Errorf("status should be open after reopen, got %q", loaded.Status)
	}
	if loaded.StartedAt != nil {
		t.Errorf("started_at should be nil after tk reopen, got %v", loaded.StartedAt)
	}
}

// TestUpdateStatusInProgressLastActivityAfterClaim verifies that after
// `tk update <id> --status in_progress`, the last activity timestamp for
// the tick is >= the claim time, satisfying stale-recovery requirements.
func TestUpdateStatusInProgressLastActivityAfterClaim(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("ip4")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	claimTime := time.Now().UTC()
	if err := ExecuteArgs([]string{"update", "ip4", "--status", "in_progress"}); err != nil {
		t.Fatalf("ExecuteArgs update --status in_progress: %v", err)
	}

	result, err := store.LastActivityForTicks([]string{"ip4"})
	if err != nil {
		t.Fatalf("LastActivityForTicks: %v", err)
	}
	lastActivity, ok := result["ip4"]
	if !ok || lastActivity == nil {
		t.Fatal("expected LastActivityForTicks to return an entry for ip4")
	}
	if lastActivity.Before(claimTime) {
		t.Errorf("last_activity %v should be >= claim time %v", lastActivity, claimTime)
	}
}
