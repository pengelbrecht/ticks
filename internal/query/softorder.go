package query

import (
	"sort"
	"strings"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// SortBySoftOrderPriorityCreatedAt sorts ticks like SortByPriorityCreatedAt,
// but with soft ordering applied: candidates that are soft-deferred (at least
// one after-target is still open) sort behind candidates whose after-targets
// are all closed. Soft order is a preference, never a gate — a soft-deferred
// tick is still returned when it is the only candidate; it merely yields to
// feasible-first work.
//
// Key order: status (in_progress first, to resume incomplete work), then
// soft-deferred flag (false first), then priority ascending, created_at
// ascending, and id as the final tiebreaker.
//
// allTicks is the full tick universe used to resolve after-target status.
// Missing targets are treated as closed (handles orphaned references),
// matching blocker semantics in ready.go.
func SortBySoftOrderPriorityCreatedAt(ticks []tick.Tick, allTicks []tick.Tick) {
	index := indexByID(allTicks)
	sort.SliceStable(ticks, func(i, j int) bool {
		// in_progress tasks come before open tasks (resume incomplete work
		// first); started work is never soft-deferred behind unstarted work.
		iInProgress := ticks[i].Status == tick.StatusInProgress
		jInProgress := ticks[j].Status == tick.StatusInProgress
		if iInProgress != jInProgress {
			return iInProgress
		}
		iDeferred := isSoftDeferred(ticks[i], index)
		jDeferred := isSoftDeferred(ticks[j], index)
		if iDeferred != jDeferred {
			return jDeferred
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

// isSoftDeferred reports whether t has at least one after-target that exists
// in index and is not closed. Missing targets are treated as closed, matching
// blocker semantics in ready.go.
func isSoftDeferred(t tick.Tick, index map[string]tick.Tick) bool {
	for _, target := range t.After {
		afterTick, ok := index[target]
		if !ok {
			// Missing after-target treated as closed (handles orphaned references)
			continue
		}
		if afterTick.Status != tick.StatusClosed {
			return true
		}
	}
	return false
}
