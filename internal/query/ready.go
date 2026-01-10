package query

import (
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Ready returns open ticks that are not blocked by open blockers.
// Missing blockers are treated as open (not ready).
func Ready(ticks []tick.Tick) []tick.Tick {
	index := indexByID(ticks)
	var out []tick.Tick
	for _, t := range ticks {
		if isReady(t, index) {
			out = append(out, t)
		}
	}
	return out
}

// Blocked returns ticks that are open or in_progress with open blockers.
// Missing blockers are treated as open (blocked).
func Blocked(ticks []tick.Tick) []tick.Tick {
	index := indexByID(ticks)
	var out []tick.Tick
	for _, t := range ticks {
		if isBlocked(t, index) {
			out = append(out, t)
		}
	}
	return out
}

func isReady(t tick.Tick, index map[string]tick.Tick) bool {
	if t.Status != tick.StatusOpen {
		return false
	}
	// Deferred tasks are not ready until the defer date passes
	if t.DeferUntil != nil && t.DeferUntil.After(time.Now()) {
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
