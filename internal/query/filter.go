package query

import (
	"sort"
	"strings"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Filter describes filtering criteria for ticks.
type Filter struct {
	Owner   string
	Status  string
	Priority *int
	Type    string
	Label   string
	LabelAny []string
	Parent  string
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
