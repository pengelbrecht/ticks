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
		out = append(out, t)
	}
	return out
}

// SortByPriorityCreatedAt sorts ticks by priority, created_at, then id.
func SortByPriorityCreatedAt(ticks []tick.Tick) {
	sort.Slice(ticks, func(i, j int) bool {
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
