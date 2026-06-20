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

// --- Overdue filter tests ---

// filterNow is the reference instant used for Overdue filter tests.
var filterNow = time.Date(2026, 6, 20, 12, 0, 0, 0, time.UTC)

// TestFilterOverdueRetainsOnlyOverdueTicks verifies that --overdue keeps only
// ticks whose Slip signal is SlipOverdue.
func TestFilterOverdueRetainsOnlyOverdueTicks(t *testing.T) {
	// overdue: past target_date + open leaf
	overdue := makeTickWithDate("ov1", "", tick.StatusOpen, "2026-06-19")
	// on-track: future date
	onTrack := makeTickWithDate("ok1", "", tick.StatusOpen, "2026-07-01")
	// no date
	noDate := makeTickWithDate("nd1", "", tick.StatusOpen, "")
	// past date but closed → work landed, not overdue
	closed := makeTickWithDate("cl1", "", tick.StatusClosed, "2026-06-01")

	allTicks := []tick.Tick{overdue, onTrack, noDate, closed}

	filtered := Apply(allTicks, Filter{
		Overdue:  true,
		AllTicks: allTicks,
		Now:      filterNow,
	})
	if len(filtered) != 1 || filtered[0].ID != "ov1" {
		t.Fatalf("Overdue filter: expected [ov1], got %v", tickIDs(filtered))
	}
}

// TestFilterOverdueComposesWithStatus verifies that Overdue composes with the
// Status filter (both predicates must be satisfied).
func TestFilterOverdueComposesWithStatus(t *testing.T) {
	overdueOpen := makeTickWithDate("ov-open", "", tick.StatusOpen, "2026-06-19")
	overdueInProg := makeTickWithDate("ov-ip", "", tick.StatusInProgress, "2026-06-18")
	onTrackOpen := makeTickWithDate("ok-open", "", tick.StatusOpen, "2026-07-01")

	allTicks := []tick.Tick{overdueOpen, overdueInProg, onTrackOpen}

	// Only overdue + open.
	filtered := Apply(allTicks, Filter{
		Status:   tick.StatusOpen,
		Overdue:  true,
		AllTicks: allTicks,
		Now:      filterNow,
	})
	if len(filtered) != 1 || filtered[0].ID != "ov-open" {
		t.Fatalf("Overdue+Status filter: expected [ov-open], got %v", tickIDs(filtered))
	}
}

// --- DueBefore filter tests ---

// TestFilterDueBeforeExcludesUndated verifies ticks without a target_date are
// excluded when --due-before is active.
func TestFilterDueBeforeExcludesUndated(t *testing.T) {
	dated := makeTickWithDate("d1", "", tick.StatusOpen, "2026-08-15")
	undated := makeTickWithDate("u1", "", tick.StatusOpen, "")

	cutoff := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	filtered := Apply([]tick.Tick{dated, undated}, Filter{DueBefore: cutoff})
	if len(filtered) != 1 || filtered[0].ID != "d1" {
		t.Fatalf("DueBefore: undated should be excluded, got %v", tickIDs(filtered))
	}
}

// TestFilterDueBeforeStrictlyBefore verifies the "strictly before" semantics:
// a tick dated exactly on the cutoff day is excluded.
func TestFilterDueBeforeStrictlyBefore(t *testing.T) {
	before := makeTickWithDate("b1", "", tick.StatusOpen, "2026-08-31")
	onCutoff := makeTickWithDate("oc1", "", tick.StatusOpen, "2026-09-01")
	after := makeTickWithDate("a1", "", tick.StatusOpen, "2026-09-02")

	cutoff := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	filtered := Apply([]tick.Tick{before, onCutoff, after}, Filter{DueBefore: cutoff})
	if len(filtered) != 1 || filtered[0].ID != "b1" {
		t.Fatalf("DueBefore strict: expected [b1], got %v", tickIDs(filtered))
	}
}

// TestFilterDueBeforeComposesWithOwner verifies that DueBefore composes
// correctly with another filter predicate.
func TestFilterDueBeforeComposesWithOwner(t *testing.T) {
	aliceDated := makeTickWithDate("al1", "", tick.StatusOpen, "2026-08-01")
	aliceDated.Owner = "alice"
	bobDated := makeTickWithDate("bo1", "", tick.StatusOpen, "2026-08-01")
	bobDated.Owner = "bob"

	cutoff := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	filtered := Apply([]tick.Tick{aliceDated, bobDated}, Filter{Owner: "alice", DueBefore: cutoff})
	if len(filtered) != 1 || filtered[0].ID != "al1" {
		t.Fatalf("DueBefore+Owner: expected [al1], got %v", tickIDs(filtered))
	}
}

// --- SortByTargetDate tests ---

// TestSortByTargetDateAscendingUndatedLast verifies the primary contract:
// dated ticks in ascending order, undated ticks at the end.
func TestSortByTargetDateAscendingUndatedLast(t *testing.T) {
	base := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "c", TargetDate: "2026-09-01", CreatedAt: base},
		{ID: "a", TargetDate: "2026-07-01", CreatedAt: base},
		{ID: "u", TargetDate: "", CreatedAt: base}, // undated → last
		{ID: "b", TargetDate: "2026-08-01", CreatedAt: base},
	}

	SortByTargetDate(items)

	wantOrder := []string{"a", "b", "c", "u"}
	for i, want := range wantOrder {
		if items[i].ID != want {
			t.Errorf("position %d: got %q, want %q", i, items[i].ID, want)
		}
	}
}

// TestSortByTargetDateSecondaryKey verifies that ticks with equal target_dates
// use priority then created_at as tiebreakers.
func TestSortByTargetDateSecondaryKey(t *testing.T) {
	base := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "hi-prio-late", TargetDate: "2026-08-01", Priority: 1, CreatedAt: base.Add(time.Hour)},
		{ID: "lo-prio-early", TargetDate: "2026-08-01", Priority: 2, CreatedAt: base},
		{ID: "hi-prio-early", TargetDate: "2026-08-01", Priority: 1, CreatedAt: base},
	}

	SortByTargetDate(items)

	// hi-prio-early (p=1, earlier) < hi-prio-late (p=1, later) < lo-prio-early (p=2)
	wantOrder := []string{"hi-prio-early", "hi-prio-late", "lo-prio-early"}
	for i, want := range wantOrder {
		if items[i].ID != want {
			t.Errorf("position %d: got %q, want %q (full: %v)", i, items[i].ID, want, tickIDs(items))
		}
	}
}

// TestSortByTargetDateMultipleUndated verifies that multiple undated ticks are
// sorted by secondary key among themselves.
func TestSortByTargetDateMultipleUndated(t *testing.T) {
	base := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	items := []tick.Tick{
		{ID: "u2", TargetDate: "", Priority: 2, CreatedAt: base},
		{ID: "u1", TargetDate: "", Priority: 1, CreatedAt: base},
		{ID: "d1", TargetDate: "2026-07-01", Priority: 3, CreatedAt: base},
	}

	SortByTargetDate(items)

	if items[0].ID != "d1" {
		t.Errorf("dated tick should be first, got %q", items[0].ID)
	}
	if items[1].ID != "u1" || items[2].ID != "u2" {
		t.Errorf("undated ticks secondary sort wrong: got %q %q, want u1 u2", items[1].ID, items[2].ID)
	}
}

// tickIDs returns a slice of IDs from a tick slice for readable error messages.
func tickIDs(ticks []tick.Tick) []string {
	out := make([]string, len(ticks))
	for i, t := range ticks {
		out[i] = t.ID
	}
	return out
}
