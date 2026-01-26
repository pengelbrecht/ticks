package tick

import (
	"strings"
	"testing"
	"time"
)

func TestHandleClose_NoRequires(t *testing.T) {
	now := time.Now().UTC()
	tick := &Tick{
		ID:        "abc",
		Title:     "Test tick",
		Status:    StatusInProgress,
		Priority:  1,
		Type:      TypeTask,
		Owner:     "test@example.com",
		CreatedBy: "test@example.com",
		CreatedAt: now.Add(-1 * time.Hour),
		UpdatedAt: now.Add(-1 * time.Hour),
	}

	routed := HandleClose(tick, "completed successfully")

	if routed {
		t.Error("expected routed=false when no requires field")
	}
	if tick.Status != StatusClosed {
		t.Errorf("expected status=closed, got %s", tick.Status)
	}
	if tick.ClosedAt == nil {
		t.Error("expected ClosedAt to be set")
	}
	if tick.ClosedReason != "completed successfully" {
		t.Errorf("expected reason='completed successfully', got %s", tick.ClosedReason)
	}
	if tick.Awaiting != nil {
		t.Error("expected Awaiting to be nil")
	}
}

func TestHandleClose_WithRequiresApproval(t *testing.T) {
	now := time.Now().UTC()
	requires := RequiresApproval
	tick := &Tick{
		ID:        "abc",
		Title:     "Test tick",
		Status:    StatusInProgress,
		Priority:  1,
		Type:      TypeTask,
		Owner:     "test@example.com",
		Requires:  &requires,
		CreatedBy: "test@example.com",
		CreatedAt: now.Add(-1 * time.Hour),
		UpdatedAt: now.Add(-1 * time.Hour),
	}

	routed := HandleClose(tick, "completed successfully")

	if !routed {
		t.Error("expected routed=true when requires field is set")
	}
	if tick.Status != StatusInProgress {
		t.Errorf("expected status to remain in_progress, got %s", tick.Status)
	}
	if tick.ClosedAt != nil {
		t.Error("expected ClosedAt to be nil when routed")
	}
	if tick.ClosedReason != "" {
		t.Errorf("expected empty reason when routed, got %s", tick.ClosedReason)
	}
	if tick.Awaiting == nil {
		t.Fatal("expected Awaiting to be set")
	}
	if *tick.Awaiting != RequiresApproval {
		t.Errorf("expected Awaiting=approval, got %s", *tick.Awaiting)
	}
	if tick.Requires == nil || *tick.Requires != RequiresApproval {
		t.Error("expected Requires to persist")
	}
	if !strings.Contains(tick.Notes, "Work complete, awaiting approval") {
		t.Errorf("expected note about routing, got %s", tick.Notes)
	}
}

func TestHandleClose_WithRequiresReview(t *testing.T) {
	now := time.Now().UTC()
	requires := RequiresReview
	tick := &Tick{
		ID:        "abc",
		Title:     "Test tick",
		Status:    StatusInProgress,
		Priority:  1,
		Type:      TypeTask,
		Owner:     "test@example.com",
		Requires:  &requires,
		CreatedBy: "test@example.com",
		CreatedAt: now.Add(-1 * time.Hour),
		UpdatedAt: now.Add(-1 * time.Hour),
	}

	routed := HandleClose(tick, "done")

	if !routed {
		t.Error("expected routed=true")
	}
	if tick.Awaiting == nil || *tick.Awaiting != RequiresReview {
		t.Error("expected Awaiting=review")
	}
	if !strings.Contains(tick.Notes, "Work complete, awaiting review") {
		t.Errorf("expected note about review, got %s", tick.Notes)
	}
}

func TestHandleClose_WithRequiresContent(t *testing.T) {
	now := time.Now().UTC()
	requires := RequiresContent
	tick := &Tick{
		ID:        "abc",
		Title:     "Test tick",
		Status:    StatusInProgress,
		Priority:  1,
		Type:      TypeTask,
		Owner:     "test@example.com",
		Requires:  &requires,
		CreatedBy: "test@example.com",
		CreatedAt: now.Add(-1 * time.Hour),
		UpdatedAt: now.Add(-1 * time.Hour),
	}

	routed := HandleClose(tick, "done")

	if !routed {
		t.Error("expected routed=true")
	}
	if tick.Awaiting == nil || *tick.Awaiting != RequiresContent {
		t.Error("expected Awaiting=content")
	}
	if !strings.Contains(tick.Notes, "Work complete, awaiting content") {
		t.Errorf("expected note about content, got %s", tick.Notes)
	}
}

func TestHandleClose_AppendsToExistingNotes(t *testing.T) {
	now := time.Now().UTC()
	requires := RequiresApproval
	tick := &Tick{
		ID:        "abc",
		Title:     "Test tick",
		Status:    StatusInProgress,
		Priority:  1,
		Type:      TypeTask,
		Owner:     "test@example.com",
		Requires:  &requires,
		Notes:     "2024-01-01 10:00 - Started work",
		CreatedBy: "test@example.com",
		CreatedAt: now.Add(-1 * time.Hour),
		UpdatedAt: now.Add(-1 * time.Hour),
	}

	routed := HandleClose(tick, "done")

	if !routed {
		t.Error("expected routed=true")
	}
	if !strings.Contains(tick.Notes, "Started work") {
		t.Error("expected existing note to be preserved")
	}
	if !strings.Contains(tick.Notes, "Work complete, awaiting approval") {
		t.Error("expected new note to be added")
	}
	// Notes should have newline between them
	lines := strings.Split(tick.Notes, "\n")
	if len(lines) < 2 {
		t.Errorf("expected multiple note lines, got %d", len(lines))
	}
}

func TestHandleClose_RequiresPersistsThroughRejectionCycle(t *testing.T) {
	now := time.Now().UTC()
	requires := RequiresApproval
	tick := &Tick{
		ID:        "abc",
		Title:     "Test tick",
		Status:    StatusInProgress,
		Priority:  1,
		Type:      TypeTask,
		Owner:     "test@example.com",
		Requires:  &requires,
		CreatedBy: "test@example.com",
		CreatedAt: now.Add(-1 * time.Hour),
		UpdatedAt: now.Add(-1 * time.Hour),
	}

	// First close attempt - routes to human
	routed := HandleClose(tick, "first attempt")
	if !routed {
		t.Error("expected first close to route")
	}

	// Simulate rejection: clear awaiting (human rejected)
	tick.Awaiting = nil

	// Second close attempt - should route again because requires persists
	routed = HandleClose(tick, "second attempt")
	if !routed {
		t.Error("expected second close to route again")
	}
	if tick.Awaiting == nil || *tick.Awaiting != RequiresApproval {
		t.Error("expected Awaiting=approval on second attempt")
	}
	if tick.Requires == nil || *tick.Requires != RequiresApproval {
		t.Error("expected Requires to still persist")
	}
}

func TestHandleClose_UpdatedAtIsSet(t *testing.T) {
	oldTime := time.Now().UTC().Add(-1 * time.Hour)
	tick := &Tick{
		ID:        "abc",
		Title:     "Test tick",
		Status:    StatusInProgress,
		Priority:  1,
		Type:      TypeTask,
		Owner:     "test@example.com",
		CreatedBy: "test@example.com",
		CreatedAt: oldTime,
		UpdatedAt: oldTime,
	}

	HandleClose(tick, "done")

	if tick.UpdatedAt.Before(oldTime) || tick.UpdatedAt.Equal(oldTime) {
		t.Error("expected UpdatedAt to be updated")
	}
}

func TestHandleClose_WithRequires_UpdatedAtIsSet(t *testing.T) {
	oldTime := time.Now().UTC().Add(-1 * time.Hour)
	requires := RequiresApproval
	tick := &Tick{
		ID:        "abc",
		Title:     "Test tick",
		Status:    StatusInProgress,
		Priority:  1,
		Type:      TypeTask,
		Owner:     "test@example.com",
		Requires:  &requires,
		CreatedBy: "test@example.com",
		CreatedAt: oldTime,
		UpdatedAt: oldTime,
	}

	HandleClose(tick, "done")

	if tick.UpdatedAt.Before(oldTime) || tick.UpdatedAt.Equal(oldTime) {
		t.Error("expected UpdatedAt to be updated when routing")
	}
}

func TestHandleClose_ClearsStartedAt(t *testing.T) {
	oldTime := time.Now().UTC().Add(-1 * time.Hour)
	startedTime := oldTime.Add(-30 * time.Minute)
	tick := &Tick{
		ID:        "abc",
		Title:     "Test tick",
		Status:    StatusInProgress,
		Priority:  1,
		Type:      TypeTask,
		Owner:     "test@example.com",
		CreatedBy: "test@example.com",
		CreatedAt: oldTime.Add(-2 * time.Hour),
		UpdatedAt: oldTime,
		StartedAt: &startedTime,
	}

	routed := HandleClose(tick, "completed successfully")

	if routed {
		t.Error("expected routed=false when no requires field")
	}
	if tick.Status != StatusClosed {
		t.Errorf("expected status=closed, got %s", tick.Status)
	}
	if tick.StartedAt != nil {
		t.Error("expected StartedAt to be cleared on close")
	}
}

func TestHandleClose_WithRequires_PreservesStartedAt(t *testing.T) {
	oldTime := time.Now().UTC().Add(-1 * time.Hour)
	startedTime := oldTime.Add(-30 * time.Minute)
	requires := RequiresApproval
	tick := &Tick{
		ID:        "abc",
		Title:     "Test tick",
		Status:    StatusInProgress,
		Priority:  1,
		Type:      TypeTask,
		Owner:     "test@example.com",
		Requires:  &requires,
		CreatedBy: "test@example.com",
		CreatedAt: oldTime.Add(-2 * time.Hour),
		UpdatedAt: oldTime,
		StartedAt: &startedTime,
	}

	routed := HandleClose(tick, "done")

	if !routed {
		t.Error("expected routed=true when requires field is set")
	}
	// StartedAt should be preserved when routing to human (not actually closing)
	if tick.StartedAt == nil {
		t.Error("expected StartedAt to be preserved when routing to human")
	}
	if !tick.StartedAt.Equal(startedTime) {
		t.Error("expected StartedAt to remain unchanged when routing")
	}
}
