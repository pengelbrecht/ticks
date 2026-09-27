package merge

import (
	"fmt"
	"reflect"
	"sort"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

const notesMergeMarker = "--- merged from remote ---"

// Merge is git's three-way merge of one tick record: base is the common
// ancestor, ours and theirs the two sides.
//
// It is three-way FIELD BY FIELD (tick jd5). A field only one side changed
// takes that side's value; a field neither changed keeps base's; only a field
// BOTH sides changed falls to a conflict rule. The conflict rules are the
// long-standing ones:
//   - status: the higher rank wins (closed > in_progress > open), so a close
//     beats a concurrent claim;
//   - priority: the more urgent (lower) wins;
//   - notes: both sides' text is kept, joined under a merge marker;
//   - labels, blocked_by, after: a set merge — base plus what either side
//     added, minus what either side removed;
//   - closed_at, updated_at: the later;
//   - every other field: the side updated last wins, ours on a tie.
//
// Before jd5 the whole record was "last writer wins" with a few union and
// rank rules layered on, and it ignored base. Property tests found what that
// cost: two people editing DIFFERENT fields lost one edit, a one-sided
// de-prioritisation was undone, a one-sided reopen or label removal never
// survived, and a gloss set on one side vanished.
func Merge(base, ours, theirs tick.Tick) tick.Tick {
	winner := ours
	if theirs.UpdatedAt.After(ours.UpdatedAt) {
		winner = theirs
	}

	merged := base
	mv := reflect.ValueOf(&merged).Elem()
	bv, ov, tv, wv := reflect.ValueOf(base), reflect.ValueOf(ours), reflect.ValueOf(theirs), reflect.ValueOf(winner)
	for i := 0; i < mv.NumField(); i++ {
		b, o, t := bv.Field(i).Interface(), ov.Field(i).Interface(), tv.Field(i).Interface()
		switch {
		case sameValue(o, b):
			mv.Field(i).Set(tv.Field(i))
		case sameValue(t, b), sameValue(o, t):
			mv.Field(i).Set(ov.Field(i))
		default:
			// Both sides changed this field, differently.
			mv.Field(i).Set(wv.Field(i))
			switch mv.Type().Field(i).Name {
			case "Status":
				merged.Status = mergeStatus(ours.Status, theirs.Status)
			case "Priority":
				merged.Priority = mergePriority(ours.Priority, theirs.Priority)
			case "Notes":
				merged.Notes = mergeNotes(base.Notes, ours.Notes, theirs.Notes)
			case "Labels":
				merged.Labels = mergeSet(base.Labels, ours.Labels, theirs.Labels)
			case "BlockedBy":
				merged.BlockedBy = mergeSet(base.BlockedBy, ours.BlockedBy, theirs.BlockedBy)
			case "After":
				merged.After = mergeSet(base.After, ours.After, theirs.After)
			case "ClosedAt":
				merged.ClosedAt = latestOptionalTime(ours.ClosedAt, theirs.ClosedAt)
			}
		}
	}
	merged.UpdatedAt = latestTime(ours.UpdatedAt, theirs.UpdatedAt)
	return merged
}

// sameValue compares two field values, treating nil and empty slices as equal
// (a record that decodes without a key and one that carries [] say the same).
func sameValue(a, b any) bool {
	av, bv := reflect.ValueOf(a), reflect.ValueOf(b)
	if av.Kind() == reflect.Slice && bv.Kind() == reflect.Slice && av.Len() == 0 && bv.Len() == 0 {
		return true
	}
	return reflect.DeepEqual(a, b)
}

// mergeSet is the three-way merge of a set-valued field: base, plus what
// either side added, minus what either side removed. Sorted, deduplicated.
func mergeSet(base, ours, theirs []string) []string {
	in := func(s []string) map[string]bool {
		m := make(map[string]bool, len(s))
		for _, v := range s {
			m[v] = true
		}
		return m
	}
	b, o, t := in(base), in(ours), in(theirs)
	result := map[string]bool{}
	for v := range b {
		if o[v] && t[v] {
			result[v] = true
		}
	}
	for v := range o {
		if !b[v] {
			result[v] = true
		}
	}
	for v := range t {
		if !b[v] {
			result[v] = true
		}
	}
	out := make([]string, 0, len(result))
	for v := range result {
		out = append(out, v)
	}
	sort.Strings(out)
	if len(out) == 0 {
		return nil
	}
	return out
}

func mergeStatus(a, b string) string {
	if statusRank(b) > statusRank(a) {
		return b
	}
	return a
}

func statusRank(value string) int {
	switch value {
	case tick.StatusClosed:
		return 3
	case tick.StatusInProgress:
		return 2
	case tick.StatusOpen:
		return 1
	default:
		return 0
	}
}

func mergePriority(a, b int) int {
	if a == 0 || b == 0 {
		if a == 0 {
			return 0
		}
		return 0
	}
	if a < b {
		return a
	}
	return b
}

func latestTime(a, b time.Time) time.Time {
	if b.After(a) {
		return b
	}
	return a
}

func latestOptionalTime(a, b *time.Time) *time.Time {
	switch {
	case a == nil && b == nil:
		return nil
	case a == nil:
		return b
	case b == nil:
		return a
	default:
		if b.After(*a) {
			return b
		}
		return a
	}
}

func mergeNotes(base, ours, theirs string) string {
	if ours == theirs {
		return ours
	}
	if strings.TrimSpace(ours) == "" {
		return theirs
	}
	if strings.TrimSpace(theirs) == "" {
		return ours
	}

	if base != "" && strings.HasPrefix(ours, base) && strings.HasPrefix(theirs, base) {
		return joinNotes(ours, theirs)
	}
	return joinNotes(ours, theirs)
}

func joinNotes(ours, theirs string) string {
	return fmt.Sprintf("%s\n%s\n%s", strings.TrimRight(ours, "\n"), notesMergeMarker, strings.TrimLeft(theirs, "\n"))
}
