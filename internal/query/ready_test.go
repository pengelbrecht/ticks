package query

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func TestReadyAndBlocked(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "a", Status: tick.StatusOpen, BlockedBy: []string{"b"}, CreatedAt: now, UpdatedAt: now},
		{ID: "b", Status: tick.StatusClosed, CreatedAt: now, UpdatedAt: now},
		{ID: "c", Status: tick.StatusOpen, BlockedBy: []string{"missing"}, CreatedAt: now, UpdatedAt: now},
		{ID: "d", Status: tick.StatusOpen, BlockedBy: nil, CreatedAt: now, UpdatedAt: now},
	}

	ready := Ready(items)
	if len(ready) != 2 {
		t.Fatalf("expected 2 ready ticks, got %d", len(ready))
	}

	blocked := Blocked(items)
	if len(blocked) != 1 {
		t.Fatalf("expected 1 blocked tick, got %d", len(blocked))
	}
}

func TestInProgressTicksAreReady(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "a", Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
		{ID: "b", Status: tick.StatusInProgress, CreatedAt: now, UpdatedAt: now},
		{ID: "c", Status: tick.StatusClosed, CreatedAt: now, UpdatedAt: now},
	}

	ready := Ready(items)
	if len(ready) != 2 {
		t.Fatalf("expected 2 ready ticks (open + in_progress), got %d", len(ready))
	}
	// Verify both open and in_progress are included
	ids := map[string]bool{}
	for _, r := range ready {
		ids[r.ID] = true
	}
	if !ids["a"] || !ids["b"] {
		t.Fatalf("expected both open (a) and in_progress (b) ticks, got %v", ids)
	}
}
