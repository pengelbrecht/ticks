package query

import (
	"github.com/pengelbrecht/ticks/internal/tick"
)

// CompletedProjectsNeedingCloseout returns every tick whose structural role is
// RoleProject, whose own status is NOT closed (open or in_progress), and whose
// leaf descendants are ALL closed (DescendantProgress: closed == total && total > 0).
//
// This is the project checkpoint boundary from design §5 (recursive continuation
// engine): when every child epic and leaf inside a project is done but the project
// tick itself is still open, a close-out checkpoint is due before the orchestrator
// moves on to the next project-level unit.
//
// allTicks must be the full tick universe — pass a filtered subset and role
// derivation will misclassify containers whose children are outside the subset.
func CompletedProjectsNeedingCloseout(allTicks []tick.Tick) []tick.Tick {
	index := BuildChildIndex(allTicks)

	var out []tick.Tick
	for _, t := range allTicks {
		// Must be a project container (not an epic, not a flat bucket).
		if Role(t, index) != RoleProject {
			continue
		}
		// Project tick itself must still be open (close-out not yet performed).
		if t.Status == tick.StatusClosed {
			continue
		}
		// All leaf descendants must be closed (completed work, nothing left to do).
		closed, total := DescendantProgress(t, allTicks)
		if total > 0 && closed == total {
			out = append(out, t)
		}
	}
	return out
}

// NextPlannableEpics returns the set of childless epics that are ready to be
// planned right now, sorted by soft-order then priority then created-at —
// identical semantics to the flat selection that cmd/tk/cmd/next.go performs
// via EpicsNeedingPlanning + SortBySoftOrderPriorityCreatedAt.
//
// Project-awareness note: callers do NOT need to pre-filter by project or
// walk parent pointers before calling this function. Epic ordering across
// project boundaries is already encoded in the roadmap's BlockedBy/After
// edges: an epic in project B that must come after project A's epics will
// carry those as After (soft) or BlockedBy (hard) entries, and
// SortBySoftOrderPriorityCreatedAt / EpicsNeedingPlanning's blocker gate
// handle them correctly without any tree traversal. This function therefore
// surfaces the same feasible set as the flat tk-next path and packages it
// as a reusable entry point for the continuation engine (design §5).
//
// allTicks must be the full tick universe — role derivation and blocker
// resolution both need the complete graph.
func NextPlannableEpics(allTicks []tick.Tick) []tick.Tick {
	// Collect all epics from the full set as candidates.
	var epics []tick.Tick
	for _, t := range allTicks {
		if t.Type == tick.TypeEpic {
			epics = append(epics, t)
		}
	}

	// EpicsNeedingPlanning filters to childless, open, unblocked, non-deferred,
	// non-awaiting epics — the same predicate used by tk next.
	plannable := EpicsNeedingPlanning(epics, allTicks)

	// Apply soft-order-aware sort: after-deferred epics sort behind feasible-first
	// work but are never excluded; within the same soft-order tier, sort by
	// priority then created_at then id for deterministic output.
	SortBySoftOrderPriorityCreatedAt(plannable, allTicks)

	return plannable
}
