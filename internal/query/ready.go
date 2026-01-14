package query

import (
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Ready returns open ticks that are not blocked by open blockers.
// Missing blockers are treated as open (not ready).
// Tasks awaiting human action are excluded (use ReadyIncludeAwaiting to include them).
// If allTicks is provided, it is used to look up blocker status (for when
// candidates is a filtered subset and blockers may be outside that subset).
func Ready(candidates []tick.Tick, allTicks ...[]tick.Tick) []tick.Tick {
	return readyWithOptions(candidates, false, allTicks...)
}

// ReadyIncludeAwaiting is like Ready but includes tasks awaiting human action.
// Use this when displaying all ready tasks including those needing human review.
func ReadyIncludeAwaiting(candidates []tick.Tick, allTicks ...[]tick.Tick) []tick.Tick {
	return readyWithOptions(candidates, true, allTicks...)
}

func readyWithOptions(candidates []tick.Tick, includeAwaiting bool, allTicks ...[]tick.Tick) []tick.Tick {
	lookup := candidates
	if len(allTicks) > 0 {
		lookup = allTicks[0]
	}
	index := indexByID(lookup)
	var out []tick.Tick
	for _, t := range candidates {
		if isReadyWithOptions(t, index, includeAwaiting) {
			out = append(out, t)
		}
	}
	return out
}

// Blocked returns ticks that are open or in_progress with open blockers.
// Missing blockers are treated as open (blocked).
// If allTicks is provided, it is used to look up blocker status (for when
// candidates is a filtered subset and blockers may be outside that subset).
func Blocked(candidates []tick.Tick, allTicks ...[]tick.Tick) []tick.Tick {
	lookup := candidates
	if len(allTicks) > 0 {
		lookup = allTicks[0]
	}
	index := indexByID(lookup)
	var out []tick.Tick
	for _, t := range candidates {
		if isBlocked(t, index) {
			out = append(out, t)
		}
	}
	return out
}

func isReady(t tick.Tick, index map[string]tick.Tick) bool {
	return isReadyWithOptions(t, index, false)
}

func isReadyWithOptions(t tick.Tick, index map[string]tick.Tick, includeAwaiting bool) bool {
	// Both 'open' and 'in_progress' ticks are considered ready.
	// in_progress means "started but not finished" - should be resumed.
	if t.Status != tick.StatusOpen && t.Status != tick.StatusInProgress {
		return false
	}
	// Deferred tasks are not ready until the defer date passes
	if t.DeferUntil != nil && t.DeferUntil.After(time.Now()) {
		return false
	}
	// Tasks awaiting human action are not ready for agent work (unless includeAwaiting is true)
	if !includeAwaiting && t.IsAwaitingHuman() {
		return false
	}
	for _, blocker := range t.BlockedBy {
		blockedTick, ok := index[blocker]
		if !ok {
			return false
		}
		if blockedTick.Status != tick.StatusClosed {
			return false
		}
	}
	return true
}

func isBlocked(t tick.Tick, index map[string]tick.Tick) bool {
	if t.Status != tick.StatusOpen && t.Status != tick.StatusInProgress {
		return false
	}
	if len(t.BlockedBy) == 0 {
		return false
	}
	for _, blocker := range t.BlockedBy {
		blockedTick, ok := index[blocker]
		if !ok {
			return true
		}
		if blockedTick.Status != tick.StatusClosed {
			return true
		}
	}
	return false
}

func indexByID(ticks []tick.Tick) map[string]tick.Tick {
	index := make(map[string]tick.Tick, len(ticks))
	for _, t := range ticks {
		index[t.ID] = t
	}
	return index
}
