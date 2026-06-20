package query

import (
	"sort"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Filter describes filtering criteria for ticks.
type Filter struct {
	Owner         string
	Status        string
	Priority      *int
	Type          string
	Label         string
	LabelAny      []string
	Parent        string
	TitleContains string
	DescContains  string
	NotesContains string
	// Awaiting filters by awaiting state. Use pointer to distinguish:
	// - nil: no filter (show all)
	// - pointer to empty string: show only ticks with awaiting=null (not awaiting human)
	// - pointer to value: show only ticks with that specific awaiting value
	Awaiting *string
	// AwaitingAny filters to ticks matching any of the listed awaiting values.
	// Treats Manual=true as awaiting="work" for backwards compatibility.
	AwaitingAny []string

	// Overdue, when true, retains only ticks whose derived slip status is
	// SlipOverdue. Requires AllTicks and Now to be set for the Slip computation.
	Overdue bool
	// DueBefore retains only ticks with a target_date strictly before this day.
	// Ticks with no target_date are excluded. Zero value means no filter.
	DueBefore time.Time
	// AllTicks is the full tick set required by Overdue (for DescendantProgress).
	// Ignored when Overdue is false.
	AllTicks []tick.Tick
	// Now is the reference instant for Overdue. Callers should pass time.Now();
	// tests pass a fixed value for determinism. Ignored when Overdue is false.
	Now time.Time
}

// Apply filters ticks according to Filter fields.
func Apply(ticks []tick.Tick, f Filter) []tick.Tick {
	out := make([]tick.Tick, 0, len(ticks))
	for _, t := range ticks {
		if f.Owner != "" && t.Owner != f.Owner {
			continue
		}
		if f.Status != "" && t.Status != f.Status {
			continue
		}
		if f.Priority != nil && t.Priority != *f.Priority {
			continue
		}
		if f.Type != "" && t.Type != f.Type {
			continue
		}
		if f.Label != "" && !containsString(t.Labels, f.Label) {
			continue
		}
		if len(f.LabelAny) > 0 && !containsAnyString(t.Labels, f.LabelAny) {
			continue
		}
		if f.Parent != "" && t.Parent != f.Parent {
			continue
		}
		if f.TitleContains != "" && !containsFold(t.Title, f.TitleContains) {
			continue
		}
		if f.DescContains != "" && !containsFold(t.Description, f.DescContains) {
			continue
		}
		if f.NotesContains != "" && !containsFold(t.Notes, f.NotesContains) {
			continue
		}
		if f.Awaiting != nil && !matchesAwaiting(t, *f.Awaiting) {
			continue
		}
		if len(f.AwaitingAny) > 0 && !matchesAwaitingAny(t, f.AwaitingAny) {
			continue
		}
		if f.Overdue && Slip(t, f.AllTicks, f.Now) != SlipOverdue {
			continue
		}
		if !f.DueBefore.IsZero() {
			if t.TargetDate == "" {
				continue
			}
			d, err := time.Parse(tick.TargetDateLayout, t.TargetDate)
			if err != nil {
				continue // malformed date: exclude
			}
			// Truncate both to calendar day for a clean day-level comparison.
			targetDay := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, time.UTC)
			cutDay := time.Date(f.DueBefore.Year(), f.DueBefore.Month(), f.DueBefore.Day(), 0, 0, 0, 0, time.UTC)
			if !targetDay.Before(cutDay) {
				continue
			}
		}
		out = append(out, t)
	}
	return out
}

// matchesAwaiting checks if a tick matches the awaiting filter.
// Empty string filter means "not awaiting human" (awaiting=null and not manual).
// Non-empty filter matches specific awaiting value (Manual=true treated as "work").
func matchesAwaiting(t tick.Tick, filter string) bool {
	awaitingType := t.GetAwaitingType()
	if filter == "" {
		// Filter for ticks NOT awaiting human action
		return awaitingType == ""
	}
	// Filter for specific awaiting type
	return awaitingType == filter
}

// matchesAwaitingAny checks if a tick's awaiting type matches any in the list.
// Manual=true is treated as awaiting="work" for backwards compatibility.
func matchesAwaitingAny(t tick.Tick, filters []string) bool {
	awaitingType := t.GetAwaitingType()
	for _, filter := range filters {
		if awaitingType == filter {
			return true
		}
	}
	return false
}

// SortByPriorityCreatedAt sorts ticks by status (in_progress first), priority, created_at, then id.
func SortByPriorityCreatedAt(ticks []tick.Tick) {
	sort.Slice(ticks, func(i, j int) bool {
		// in_progress tasks come before open tasks (resume incomplete work first)
		iInProgress := ticks[i].Status == tick.StatusInProgress
		jInProgress := ticks[j].Status == tick.StatusInProgress
		if iInProgress != jInProgress {
			return iInProgress
		}
		if ticks[i].Priority != ticks[j].Priority {
			return ticks[i].Priority < ticks[j].Priority
		}
		if !ticks[i].CreatedAt.Equal(ticks[j].CreatedAt) {
			return ticks[i].CreatedAt.Before(ticks[j].CreatedAt)
		}
		return strings.Compare(ticks[i].ID, ticks[j].ID) < 0
	})
}

// SortByTargetDate sorts ticks ascending by target_date. Ticks with no
// target_date sort last. Within equal dates (including the group of undated
// ticks) the secondary key is priority then created_at then id, matching the
// convention from SortByPriorityCreatedAt.
func SortByTargetDate(ticks []tick.Tick) {
	sort.Slice(ticks, func(i, j int) bool {
		di := ticks[i].TargetDate
		dj := ticks[j].TargetDate
		// Undated ticks sort last.
		if di == "" && dj == "" {
			return secondaryLess(ticks[i], ticks[j])
		}
		if di == "" {
			return false // i is undated, j has a date → j comes first
		}
		if dj == "" {
			return true // i has a date, j is undated → i comes first
		}
		// Both dated: simple lexicographic comparison works because
		// TargetDateLayout is YYYY-MM-DD (ISO 8601, lexicographic order is
		// chronological order).
		if di != dj {
			return di < dj
		}
		return secondaryLess(ticks[i], ticks[j])
	})
}

// secondaryLess is the tiebreaker used by SortByTargetDate: priority → created_at → id.
func secondaryLess(a, b tick.Tick) bool {
	if a.Priority != b.Priority {
		return a.Priority < b.Priority
	}
	if !a.CreatedAt.Equal(b.CreatedAt) {
		return a.CreatedAt.Before(b.CreatedAt)
	}
	return strings.Compare(a.ID, b.ID) < 0
}

func containsString(values []string, value string) bool {
	for _, item := range values {
		if item == value {
			return true
		}
	}
	return false
}

func containsAnyString(values []string, needles []string) bool {
	for _, needle := range needles {
		if containsString(values, needle) {
			return true
		}
	}
	return false
}

func containsFold(haystack, needle string) bool {
	haystack = strings.ToLower(haystack)
	needle = strings.ToLower(needle)
	return strings.Contains(haystack, needle)
}
