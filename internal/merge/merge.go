package merge

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

const notesMergeMarker = "--- merged from remote ---"

// Merge combines tick changes following the spec merge rules.
func Merge(base, ours, theirs tick.Tick) tick.Tick {
	winner := ours
	if theirs.UpdatedAt.After(ours.UpdatedAt) {
		winner = theirs
	}

	merged := winner

	merged.Labels = unionStrings(ours.Labels, theirs.Labels)
	merged.BlockedBy = unionStrings(ours.BlockedBy, theirs.BlockedBy)
	merged.Status = mergeStatus(ours.Status, theirs.Status)
	merged.Priority = mergePriority(ours.Priority, theirs.Priority)
	merged.UpdatedAt = latestTime(ours.UpdatedAt, theirs.UpdatedAt)
	merged.ClosedAt = latestOptionalTime(ours.ClosedAt, theirs.ClosedAt)
	merged.Notes = mergeNotes(base.Notes, ours.Notes, theirs.Notes)

	return merged
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

func unionStrings(a, b []string) []string {
	seen := make(map[string]struct{}, len(a)+len(b))
	out := make([]string, 0, len(a)+len(b))
	add := func(items []string) {
		for _, item := range items {
			if _, ok := seen[item]; ok {
				continue
			}
			seen[item] = struct{}{}
			out = append(out, item)
		}
	}
	add(a)
	add(b)

	sort.Strings(out)
	return out
}
