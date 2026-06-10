package query

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func TestReadyAndBlocked(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "a", Status: tick.StatusOpen, BlockedBy: []string{"b"}, CreatedAt: now, UpdatedAt: now},       // ready (b is closed)
		{ID: "b", Status: tick.StatusClosed, CreatedAt: now, UpdatedAt: now},                               // not ready (closed)
		{ID: "c", Status: tick.StatusOpen, BlockedBy: []string{"missing"}, CreatedAt: now, UpdatedAt: now}, // ready (missing treated as closed)
		{ID: "d", Status: tick.StatusOpen, BlockedBy: nil, CreatedAt: now, UpdatedAt: now},                 // ready
		{ID: "e", Status: tick.StatusOpen, BlockedBy: []string{"d"}, CreatedAt: now, UpdatedAt: now},       // blocked (d is open)
	}

	ready := Ready(items)
	if len(ready) != 3 {
		t.Fatalf("expected 3 ready ticks (a, c, d), got %d: %v", len(ready), ready)
	}

	blocked := Blocked(items)
	if len(blocked) != 1 {
		t.Fatalf("expected 1 blocked tick (e), got %d", len(blocked))
	}
	if blocked[0].ID != "e" {
		t.Fatalf("expected blocked tick 'e', got %s", blocked[0].ID)
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

func TestReadyExcludesAwaitingTicks(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	awaiting := "approval"
	items := []tick.Tick{
		{ID: "a", Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},                            // ready
		{ID: "b", Status: tick.StatusOpen, Awaiting: &awaiting, CreatedAt: now, UpdatedAt: now},       // not ready (awaiting)
		{ID: "c", Status: tick.StatusInProgress, CreatedAt: now, UpdatedAt: now},                      // ready
		{ID: "d", Status: tick.StatusInProgress, Awaiting: &awaiting, CreatedAt: now, UpdatedAt: now}, // not ready (awaiting)
		{ID: "e", Status: tick.StatusOpen, Manual: true, CreatedAt: now, UpdatedAt: now},              // not ready (manual/legacy)
	}

	ready := Ready(items)
	if len(ready) != 2 {
		t.Fatalf("expected 2 ready ticks, got %d", len(ready))
	}

	// Verify only non-awaiting ticks are ready
	ids := map[string]bool{}
	for _, r := range ready {
		ids[r.ID] = true
	}
	if !ids["a"] || !ids["c"] {
		t.Fatalf("expected ticks a and c to be ready, got %v", ids)
	}
	if ids["b"] || ids["d"] || ids["e"] {
		t.Fatalf("expected ticks b, d, e (awaiting/manual) to be excluded, got %v", ids)
	}
}

func TestReadyExcludesAllAwaitingTypes(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	// Test each awaiting type is excluded
	tests := []struct {
		name     string
		awaiting string
	}{
		{"awaiting approval", tick.AwaitingApproval},
		{"awaiting work", tick.AwaitingWork},
		{"awaiting input", tick.AwaitingInput},
		{"awaiting review", tick.AwaitingReview},
		{"awaiting content", tick.AwaitingContent},
		{"awaiting escalation", tick.AwaitingEscalation},
		{"awaiting checkpoint", tick.AwaitingCheckpoint},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			awaiting := tt.awaiting
			items := []tick.Tick{
				{ID: "awaiting", Status: tick.StatusOpen, Awaiting: &awaiting, CreatedAt: now, UpdatedAt: now},
				{ID: "ready", Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
			}

			ready := Ready(items)
			if len(ready) != 1 {
				t.Fatalf("expected 1 ready tick, got %d", len(ready))
			}
			if ready[0].ID != "ready" {
				t.Fatalf("expected 'ready' tick, got %s", ready[0].ID)
			}
		})
	}
}

func TestReadyManualFlagBackwardsCompat(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	items := []tick.Tick{
		{ID: "manual", Status: tick.StatusOpen, Manual: true, CreatedAt: now, UpdatedAt: now},
		{ID: "ready", Status: tick.StatusOpen, Manual: false, CreatedAt: now, UpdatedAt: now},
	}

	ready := Ready(items)
	if len(ready) != 1 {
		t.Fatalf("expected 1 ready tick, got %d", len(ready))
	}
	if ready[0].ID != "ready" {
		t.Fatalf("expected 'ready' tick, got %s", ready[0].ID)
	}
}

func TestReadyIncludesNullAwaiting(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	items := []tick.Tick{
		{ID: "a", Status: tick.StatusOpen, Awaiting: nil, CreatedAt: now, UpdatedAt: now},
		{ID: "b", Status: tick.StatusInProgress, Awaiting: nil, CreatedAt: now, UpdatedAt: now},
	}

	ready := Ready(items)
	if len(ready) != 2 {
		t.Fatalf("expected 2 ready ticks (both with nil awaiting), got %d", len(ready))
	}
}

func TestReadyRespectsBlockedBy(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	items := []tick.Tick{
		{ID: "blocker", Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
		{ID: "blocked", Status: tick.StatusOpen, BlockedBy: []string{"blocker"}, CreatedAt: now, UpdatedAt: now},
		{ID: "ready", Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
	}

	ready := Ready(items)
	if len(ready) != 2 {
		t.Fatalf("expected 2 ready ticks, got %d", len(ready))
	}

	ids := map[string]bool{}
	for _, r := range ready {
		ids[r.ID] = true
	}
	if !ids["blocker"] || !ids["ready"] {
		t.Fatalf("expected blocker and ready, got %v", ids)
	}
	if ids["blocked"] {
		t.Fatalf("blocked tick should not be ready")
	}
}

func TestReadyRespectsDeferUntil(t *testing.T) {
	now := time.Now()
	past := now.Add(-24 * time.Hour)
	future := now.Add(24 * time.Hour)

	items := []tick.Tick{
		{ID: "deferred-future", Status: tick.StatusOpen, DeferUntil: &future, CreatedAt: now, UpdatedAt: now},
		{ID: "deferred-past", Status: tick.StatusOpen, DeferUntil: &past, CreatedAt: now, UpdatedAt: now},
		{ID: "not-deferred", Status: tick.StatusOpen, DeferUntil: nil, CreatedAt: now, UpdatedAt: now},
	}

	ready := Ready(items)
	if len(ready) != 2 {
		t.Fatalf("expected 2 ready ticks (past + nil defer), got %d", len(ready))
	}

	ids := map[string]bool{}
	for _, r := range ready {
		ids[r.ID] = true
	}
	if ids["deferred-future"] {
		t.Fatalf("future deferred tick should not be ready")
	}
	if !ids["deferred-past"] || !ids["not-deferred"] {
		t.Fatalf("expected deferred-past and not-deferred, got %v", ids)
	}
}

func TestReadyWithBlockersOutsideFilteredSet(t *testing.T) {
	// This test simulates the bug where filtering by parent, then calling Ready(),
	// fails to find blockers that exist outside the filtered set.
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	// Setup:
	// - epic1 (closed) - blocker epic, not a parent
	// - epic2 (open) - parent epic we'll filter by
	// - task1 under epic2, blocked by epic1 (closed) - should be ready
	// - orphan1 (closed) - blocker with no parent
	// - task2 under epic2, blocked by orphan1 (closed) - should be ready
	// - epic3 (open) - another epic
	// - task3 under epic3 (closed) - blocker under different epic
	// - task4 under epic2, blocked by task3 (closed) - should be ready

	allTicks := []tick.Tick{
		{ID: "epic1", Type: tick.TypeEpic, Status: tick.StatusClosed, CreatedAt: now, UpdatedAt: now},
		{ID: "epic2", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
		{ID: "task1", Type: tick.TypeTask, Status: tick.StatusOpen, Parent: "epic2", BlockedBy: []string{"epic1"}, CreatedAt: now, UpdatedAt: now},
		{ID: "orphan1", Type: tick.TypeTask, Status: tick.StatusClosed, CreatedAt: now, UpdatedAt: now},
		{ID: "task2", Type: tick.TypeTask, Status: tick.StatusOpen, Parent: "epic2", BlockedBy: []string{"orphan1"}, CreatedAt: now, UpdatedAt: now},
		{ID: "epic3", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
		{ID: "task3", Type: tick.TypeTask, Status: tick.StatusClosed, Parent: "epic3", CreatedAt: now, UpdatedAt: now},
		{ID: "task4", Type: tick.TypeTask, Status: tick.StatusOpen, Parent: "epic2", BlockedBy: []string{"task3"}, CreatedAt: now, UpdatedAt: now},
	}

	// Filter to only epic2's children (simulates tk next epic2)
	filtered := Apply(allTicks, Filter{Parent: "epic2"})
	if len(filtered) != 3 {
		t.Fatalf("expected 3 ticks under epic2, got %d", len(filtered))
	}

	// Now check ready status - pass allTicks for blocker lookup
	ready := Ready(filtered, allTicks)

	// All 3 tasks should be ready (their blockers are all closed)
	if len(ready) != 3 {
		t.Errorf("expected 3 ready ticks, got %d", len(ready))
		for _, r := range ready {
			t.Logf("  ready: %s", r.ID)
		}
		t.Logf("blockers epic1=%s, orphan1=%s, task3=%s are all closed but not in filtered set",
			tick.StatusClosed, tick.StatusClosed, tick.StatusClosed)
	}
}

func TestReadyIncludeAwaitingIncludesAwaitingTicks(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	awaiting := "approval"
	items := []tick.Tick{
		{ID: "a", Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},                            // ready
		{ID: "b", Status: tick.StatusOpen, Awaiting: &awaiting, CreatedAt: now, UpdatedAt: now},       // awaiting but included
		{ID: "c", Status: tick.StatusInProgress, CreatedAt: now, UpdatedAt: now},                      // ready
		{ID: "d", Status: tick.StatusInProgress, Awaiting: &awaiting, CreatedAt: now, UpdatedAt: now}, // awaiting but included
		{ID: "e", Status: tick.StatusOpen, Manual: true, CreatedAt: now, UpdatedAt: now},              // manual but included
		{ID: "f", Status: tick.StatusClosed, CreatedAt: now, UpdatedAt: now},                          // not included (closed)
	}

	ready := ReadyIncludeAwaiting(items)

	// Should include all open/in_progress ticks regardless of awaiting status
	if len(ready) != 5 {
		t.Fatalf("expected 5 ready ticks (including awaiting), got %d", len(ready))
	}

	// Verify all expected ticks are present
	ids := map[string]bool{}
	for _, r := range ready {
		ids[r.ID] = true
	}
	if !ids["a"] || !ids["b"] || !ids["c"] || !ids["d"] || !ids["e"] {
		t.Fatalf("expected ticks a, b, c, d, e to be ready, got %v", ids)
	}
	if ids["f"] {
		t.Fatalf("closed tick f should not be ready")
	}
}

func TestReadyIncludeAwaitingRespectsOtherFilters(t *testing.T) {
	now := time.Now()
	future := now.Add(24 * time.Hour)
	awaiting := "approval"
	items := []tick.Tick{
		{ID: "a", Status: tick.StatusOpen, Awaiting: &awaiting, CreatedAt: now, UpdatedAt: now},                                 // awaiting, included
		{ID: "b", Status: tick.StatusOpen, Awaiting: &awaiting, DeferUntil: &future, CreatedAt: now, UpdatedAt: now},            // awaiting but deferred, excluded
		{ID: "c", Status: tick.StatusOpen, Awaiting: &awaiting, BlockedBy: []string{"missing"}, CreatedAt: now, UpdatedAt: now}, // awaiting, included (missing blocker treated as closed)
		{ID: "d", Status: tick.StatusOpen, Awaiting: &awaiting, BlockedBy: []string{"a"}, CreatedAt: now, UpdatedAt: now},       // awaiting but blocked by open tick, excluded
	}

	ready := ReadyIncludeAwaiting(items)

	// Should include a and c (not blocked/deferred), exclude b (deferred) and d (blocked by open tick)
	if len(ready) != 2 {
		t.Fatalf("expected 2 ready ticks, got %d", len(ready))
	}

	ids := map[string]bool{}
	for _, r := range ready {
		ids[r.ID] = true
	}
	if !ids["a"] || !ids["c"] {
		t.Fatalf("expected ticks a and c, got %v", ids)
	}
}

func TestOrphanedBlockersAreTreatedAsClosed(t *testing.T) {
	// This test verifies that when a blocker is deleted, tasks that reference it
	// are no longer blocked. Non-existent blockers should be treated as closed.
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "a", Status: tick.StatusOpen, BlockedBy: []string{"deleted-task"}, CreatedAt: now, UpdatedAt: now},
		{ID: "b", Status: tick.StatusOpen, BlockedBy: []string{"typo-id"}, CreatedAt: now, UpdatedAt: now},
		{ID: "c", Status: tick.StatusOpen, BlockedBy: []string{"deleted-task", "typo-id"}, CreatedAt: now, UpdatedAt: now},
	}

	// All should be ready since non-existent blockers are treated as closed
	ready := Ready(items)
	if len(ready) != 3 {
		t.Fatalf("expected 3 ready ticks (all orphaned blockers treated as closed), got %d", len(ready))
	}

	// None should be blocked
	blocked := Blocked(items)
	if len(blocked) != 0 {
		t.Fatalf("expected 0 blocked ticks, got %d", len(blocked))
	}
}

func TestMixedOrphanedAndRealBlockers(t *testing.T) {
	// Test that a tick with both orphaned and real blockers is still blocked
	// if any real blocker is open
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "open-blocker", Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},                                             // ready (open, no blockers)
		{ID: "closed-blocker", Status: tick.StatusClosed, CreatedAt: now, UpdatedAt: now},                                         // NOT ready (closed status)
		{ID: "a", Status: tick.StatusOpen, BlockedBy: []string{"deleted-task", "open-blocker"}, CreatedAt: now, UpdatedAt: now},   // blocked (open-blocker is open)
		{ID: "b", Status: tick.StatusOpen, BlockedBy: []string{"deleted-task", "closed-blocker"}, CreatedAt: now, UpdatedAt: now}, // ready (both treated as closed)
	}

	ready := Ready(items)
	// Expected: open-blocker (open), b (blockers resolved)
	// Not ready: closed-blocker (closed status), a (blocked by open-blocker)
	if len(ready) != 2 {
		t.Fatalf("expected 2 ready ticks (open-blocker, b), got %d", len(ready))
	}

	ids := map[string]bool{}
	for _, r := range ready {
		ids[r.ID] = true
	}
	if !ids["open-blocker"] || !ids["b"] {
		t.Fatalf("expected open-blocker and b to be ready, got %v", ids)
	}
	if ids["a"] {
		t.Fatalf("tick a should be blocked by open-blocker")
	}
	if ids["closed-blocker"] {
		t.Fatalf("closed-blocker should not be ready (it's closed)")
	}
}
