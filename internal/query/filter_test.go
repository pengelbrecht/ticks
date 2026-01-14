package query

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func TestApplyFilter(t *testing.T) {
	base := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "a", Owner: "alice", Status: tick.StatusOpen, Priority: 1, Type: tick.TypeBug, Labels: []string{"backend"}, Parent: "epic1", CreatedAt: base},
		{ID: "b", Owner: "bob", Status: tick.StatusClosed, Priority: 2, Type: tick.TypeTask, Labels: []string{"frontend"}, Parent: "epic2", CreatedAt: base.Add(time.Minute)},
	}

	prio := 1
	filtered := Apply(items, Filter{Owner: "alice", Priority: &prio})
	if len(filtered) != 1 || filtered[0].ID != "a" {
		t.Fatalf("unexpected filter result: %+v", filtered)
	}

	filtered = Apply(items, Filter{Label: "frontend"})
	if len(filtered) != 1 || filtered[0].ID != "b" {
		t.Fatalf("unexpected label filter result: %+v", filtered)
	}
}

func TestSortByPriorityCreatedAt(t *testing.T) {
	base := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "b", Priority: 2, CreatedAt: base},
		{ID: "a", Priority: 1, CreatedAt: base.Add(time.Minute)},
		{ID: "c", Priority: 1, CreatedAt: base},
	}

	SortByPriorityCreatedAt(items)
	if items[0].ID != "c" || items[1].ID != "a" || items[2].ID != "b" {
		t.Fatalf("unexpected order: %v, %v, %v", items[0].ID, items[1].ID, items[2].ID)
	}
}

func TestSortInProgressFirst(t *testing.T) {
	base := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "a", Status: tick.StatusOpen, Priority: 1, CreatedAt: base},
		{ID: "b", Status: tick.StatusInProgress, Priority: 2, CreatedAt: base}, // lower priority but in_progress
		{ID: "c", Status: tick.StatusOpen, Priority: 1, CreatedAt: base.Add(time.Minute)},
	}

	SortByPriorityCreatedAt(items)
	// in_progress should come first, even though it has lower priority
	if items[0].ID != "b" {
		t.Fatalf("in_progress task should be first, got: %v", items[0].ID)
	}
	// then open tasks by priority, then created_at
	if items[1].ID != "a" || items[2].ID != "c" {
		t.Fatalf("unexpected order for open tasks: %v, %v", items[1].ID, items[2].ID)
	}
}

func TestFilterAwaitingNilShowsAll(t *testing.T) {
	base := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	approval := tick.AwaitingApproval
	work := tick.AwaitingWork

	items := []tick.Tick{
		{ID: "a", Status: tick.StatusOpen, CreatedAt: base},
		{ID: "b", Status: tick.StatusOpen, Awaiting: &approval, CreatedAt: base},
		{ID: "c", Status: tick.StatusOpen, Awaiting: &work, CreatedAt: base},
		{ID: "d", Status: tick.StatusOpen, Manual: true, CreatedAt: base},
	}

	// Filter with Awaiting=nil should show all
	filtered := Apply(items, Filter{})
	if len(filtered) != 4 {
		t.Fatalf("expected 4 ticks (no awaiting filter), got %d", len(filtered))
	}
}

func TestFilterAwaitingEmptyShowsOnlyNotAwaiting(t *testing.T) {
	base := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	approval := tick.AwaitingApproval
	empty := ""

	items := []tick.Tick{
		{ID: "not-awaiting", Status: tick.StatusOpen, CreatedAt: base},
		{ID: "awaiting-approval", Status: tick.StatusOpen, Awaiting: &approval, CreatedAt: base},
		{ID: "manual", Status: tick.StatusOpen, Manual: true, CreatedAt: base},
	}

	// Filter with Awaiting="" should show only ticks not awaiting human
	filtered := Apply(items, Filter{Awaiting: &empty})
	if len(filtered) != 1 {
		t.Fatalf("expected 1 tick (not awaiting), got %d", len(filtered))
	}
	if filtered[0].ID != "not-awaiting" {
		t.Fatalf("expected 'not-awaiting' tick, got %s", filtered[0].ID)
	}
}

func TestFilterAwaitingSpecificValue(t *testing.T) {
	base := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	approval := tick.AwaitingApproval
	work := tick.AwaitingWork
	input := tick.AwaitingInput

	items := []tick.Tick{
		{ID: "not-awaiting", Status: tick.StatusOpen, CreatedAt: base},
		{ID: "awaiting-approval", Status: tick.StatusOpen, Awaiting: &approval, CreatedAt: base},
		{ID: "awaiting-work", Status: tick.StatusOpen, Awaiting: &work, CreatedAt: base},
		{ID: "awaiting-input", Status: tick.StatusOpen, Awaiting: &input, CreatedAt: base},
	}

	// Filter for Awaiting="approval"
	filter := tick.AwaitingApproval
	filtered := Apply(items, Filter{Awaiting: &filter})
	if len(filtered) != 1 {
		t.Fatalf("expected 1 tick (awaiting approval), got %d", len(filtered))
	}
	if filtered[0].ID != "awaiting-approval" {
		t.Fatalf("expected 'awaiting-approval' tick, got %s", filtered[0].ID)
	}
}

func TestFilterAwaitingAnyMatchesMultiple(t *testing.T) {
	base := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	approval := tick.AwaitingApproval
	review := tick.AwaitingReview
	work := tick.AwaitingWork

	items := []tick.Tick{
		{ID: "not-awaiting", Status: tick.StatusOpen, CreatedAt: base},
		{ID: "awaiting-approval", Status: tick.StatusOpen, Awaiting: &approval, CreatedAt: base},
		{ID: "awaiting-review", Status: tick.StatusOpen, Awaiting: &review, CreatedAt: base},
		{ID: "awaiting-work", Status: tick.StatusOpen, Awaiting: &work, CreatedAt: base},
	}

	// Filter for AwaitingAny=["approval", "review"]
	filtered := Apply(items, Filter{AwaitingAny: []string{tick.AwaitingApproval, tick.AwaitingReview}})
	if len(filtered) != 2 {
		t.Fatalf("expected 2 ticks (approval + review), got %d", len(filtered))
	}

	ids := map[string]bool{}
	for _, f := range filtered {
		ids[f.ID] = true
	}
	if !ids["awaiting-approval"] || !ids["awaiting-review"] {
		t.Fatalf("expected awaiting-approval and awaiting-review, got %v", ids)
	}
}

func TestFilterAwaitingManualAsWork(t *testing.T) {
	base := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	work := tick.AwaitingWork

	items := []tick.Tick{
		{ID: "not-awaiting", Status: tick.StatusOpen, CreatedAt: base},
		{ID: "awaiting-work", Status: tick.StatusOpen, Awaiting: &work, CreatedAt: base},
		{ID: "manual", Status: tick.StatusOpen, Manual: true, CreatedAt: base},
	}

	// Filter for Awaiting="work" should match both awaiting-work and manual ticks
	filter := tick.AwaitingWork
	filtered := Apply(items, Filter{Awaiting: &filter})
	if len(filtered) != 2 {
		t.Fatalf("expected 2 ticks (work + manual), got %d", len(filtered))
	}

	ids := map[string]bool{}
	for _, f := range filtered {
		ids[f.ID] = true
	}
	if !ids["awaiting-work"] || !ids["manual"] {
		t.Fatalf("expected awaiting-work and manual, got %v", ids)
	}
}

func TestFilterAwaitingAnyWithManual(t *testing.T) {
	base := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	approval := tick.AwaitingApproval

	items := []tick.Tick{
		{ID: "not-awaiting", Status: tick.StatusOpen, CreatedAt: base},
		{ID: "awaiting-approval", Status: tick.StatusOpen, Awaiting: &approval, CreatedAt: base},
		{ID: "manual", Status: tick.StatusOpen, Manual: true, CreatedAt: base},
	}

	// AwaitingAny=["approval", "work"] should match awaiting-approval and manual
	filtered := Apply(items, Filter{AwaitingAny: []string{tick.AwaitingApproval, tick.AwaitingWork}})
	if len(filtered) != 2 {
		t.Fatalf("expected 2 ticks (approval + manual as work), got %d", len(filtered))
	}

	ids := map[string]bool{}
	for _, f := range filtered {
		ids[f.ID] = true
	}
	if !ids["awaiting-approval"] || !ids["manual"] {
		t.Fatalf("expected awaiting-approval and manual, got %v", ids)
	}
}
