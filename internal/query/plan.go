package query

import (
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// EpicsNeedingPlanning returns epics from candidates that have no children and
// are ready to be planned. An epic needs planning when ALL of the following hold:
//   - Type is TypeEpic and Status is StatusOpen (in_progress epics are being worked)
//   - Not blocked: every BlockedBy entry is closed or missing (missing = treated as closed)
//   - Not deferred (DeferUntil nil or in the past)
//   - Not awaiting human action (IsAwaitingHuman() is false)
//   - Has zero children in allTicks (no tick of any status has Parent == epic.ID)
//
// Note: an epic whose children are all closed does NOT need planning — it needs
// closing. Zero-children is the test, not zero-open-children.
//
// If allTicks is provided it is used to look up blocker status and child presence
// (for when candidates is a filtered subset and children/blockers may live outside it).
func EpicsNeedingPlanning(candidates []tick.Tick, allTicks ...[]tick.Tick) []tick.Tick {
	return EpicsNeedingPlanningWithMode(candidates, false, allTicks...)
}

// EpicsNeedingPlanningWithMode is EpicsNeedingPlanning with an explicit
// autonomous-mode switch. When autonomous is false the result is identical to
// EpicsNeedingPlanning. When autonomous is true, an epic whose ONLY reason to be
// gated is awaiting: checkpoint (a project close-out boundary, design §5/§8) is
// no longer excluded — continuation flows through the project boundary. No other
// awaiting type is affected. See gatesHuman for the exact bypass scope.
func EpicsNeedingPlanningWithMode(candidates []tick.Tick, autonomous bool, allTicks ...[]tick.Tick) []tick.Tick {
	lookup := candidates
	if len(allTicks) > 0 {
		lookup = allTicks[0]
	}
	index := indexByID(lookup)
	childIndex := BuildChildIndex(lookup)

	var out []tick.Tick
	for _, t := range candidates {
		if needsPlanning(t, index, childIndex, autonomous) {
			out = append(out, t)
		}
	}
	return out
}

func needsPlanning(t tick.Tick, index map[string]tick.Tick, childIndex ChildIndex, autonomous bool) bool {
	// Must be an epic
	if t.Type != tick.TypeEpic {
		return false
	}
	// Must be open (not in_progress, not closed)
	if t.Status != tick.StatusOpen {
		return false
	}
	// Not deferred into the future
	if t.DeferUntil != nil && t.DeferUntil.After(time.Now()) {
		return false
	}
	// Not awaiting human action. Under autonomous mode a pure
	// awaiting: checkpoint boundary does not gate (gatesHuman bypasses ONLY
	// checkpoint); every other awaiting type still gates.
	if gatesHuman(t, autonomous) {
		return false
	}
	// Not blocked by any open blocker
	for _, blocker := range t.BlockedBy {
		blockedTick, ok := index[blocker]
		if !ok {
			// Missing blocker treated as closed
			continue
		}
		if blockedTick.Status != tick.StatusClosed {
			return false
		}
	}
	// Must have zero children (of any status). A childless epic is RoleEmptyEpic
	// (design §2) — the planning frontier; any epic that has become a container
	// is already planned. IsContainer over the shared public ChildIndex is the
	// same test the old private buildChildIndex performed.
	if IsContainer(t, childIndex) {
		return false
	}
	return true
}
