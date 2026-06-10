package query

import (
	"sort"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// RoadmapEpic is the consumer-facing view of one epic in the roadmap.
//
// Status values (what a UI should show, not internal predicates):
//   - "done"   — epic is closed.
//   - "active" — epic is in_progress, OR open with at least one open child,
//     OR open with all children closed (needs closing — surfaces in tk graph).
//   - "ready"  — epic is open, unblocked, and has zero children (needs planning;
//     same predicate as EpicsNeedingPlanning, minus the awaiting/deferred checks
//     since those become "gated").
//   - "queued" — epic is open but blocked by at least one open epic.
//   - "gated"  — epic is open and IsAwaitingHuman(); takes priority over all
//     other statuses. AwaitingType carries the badge value.
type RoadmapEpic struct {
	ID             string   `json:"id"`
	Title          string   `json:"title"`
	Status         string   `json:"status"`
	AwaitingType   string   `json:"awaiting_type,omitempty"`
	BlockedBy      []string `json:"blocked_by,omitempty"` // epic IDs only
	ChildrenTotal  int      `json:"children_total"`
	ChildrenClosed int      `json:"children_closed"`
}

// Roadmap is the result of epic-chain computation. Waves are ordered from
// earliest (wave 0 = no epic blockers) to latest; within each wave epics are
// sorted by ID for deterministic output. Epics that are part of a cycle (rare)
// are placed in the final wave.
type Roadmap struct {
	Waves [][]RoadmapEpic `json:"waves"`
}

// epicRoadmapStatusDone is the status value for closed epics.
const (
	epicStatusDone   = "done"
	epicStatusActive = "active"
	epicStatusReady  = "ready"
	epicStatusQueued = "queued"
	epicStatusGated  = "gated"
)

// ComputeRoadmap computes an epic-level dependency view over all ticks.
//
// Only epics (Type == TypeEpic) appear as nodes. Edges are BlockedBy entries
// that point at another epic; task-level blockers are ignored for chain
// purposes. Missing blockers are treated as closed (same semantics as ready.go).
//
// Waves are computed with Kahn's topological layering: wave 0 contains epics
// with no epic blockers still in the working set; each subsequent wave contains
// epics whose blockers are all in earlier waves. Epics involved in cycles (if
// any) are appended as a final wave.
func ComputeRoadmap(allTicks []tick.Tick) Roadmap {
	// Collect all epics.
	var epics []tick.Tick
	epicSet := make(map[string]bool)
	for _, t := range allTicks {
		if t.Type == tick.TypeEpic {
			epics = append(epics, t)
			epicSet[t.ID] = true
		}
	}

	if len(epics) == 0 {
		return Roadmap{}
	}

	// Build children stats per epic: total count and closed count.
	childrenTotal := make(map[string]int)
	childrenClosed := make(map[string]int)
	for _, t := range allTicks {
		if t.Parent != "" && epicSet[t.Parent] {
			childrenTotal[t.Parent]++
			if t.Status == tick.StatusClosed {
				childrenClosed[t.Parent]++
			}
		}
	}

	// Filter BlockedBy to epic-only edges, then compute Kahn in-degrees.
	// epicBlockers[id] = epic IDs that this epic is blocked by (epic-only).
	epicBlockers := make(map[string][]string, len(epics))
	for _, e := range epics {
		var epicDeps []string
		for _, blocker := range e.BlockedBy {
			if epicSet[blocker] {
				epicDeps = append(epicDeps, blocker)
			}
			// Task-level blockers are ignored for chain/wave computation.
		}
		epicBlockers[e.ID] = epicDeps
	}

	// Kahn's algorithm: iteratively peel off zero-in-degree layers.
	inDegree := make(map[string]int, len(epics))
	dependents := make(map[string][]string) // blocker -> list of epics blocked by it
	epicByID := make(map[string]tick.Tick, len(epics))
	for _, e := range epics {
		inDegree[e.ID] = 0
		epicByID[e.ID] = e
	}
	for _, e := range epics {
		for _, dep := range epicBlockers[e.ID] {
			inDegree[e.ID]++
			dependents[dep] = append(dependents[dep], e.ID)
		}
	}

	remaining := make(map[string]bool, len(epics))
	for _, e := range epics {
		remaining[e.ID] = true
	}

	// We need to track which wave each epic lands in to determine "queued" status:
	// queued = open + blocked by an open epic (not all blockers are done/closed).
	var waves [][]RoadmapEpic

	// We process in deterministic order within each wave (sort by ID).
	epicIDs := make([]string, 0, len(epics))
	for _, e := range epics {
		epicIDs = append(epicIDs, e.ID)
	}
	sort.Strings(epicIDs)

	for len(remaining) > 0 {
		// Collect zero-in-degree epics.
		var ready []string
		for _, id := range epicIDs {
			if remaining[id] && inDegree[id] == 0 {
				ready = append(ready, id)
			}
		}

		if len(ready) == 0 {
			// Cycle: flush remaining epics as the final wave.
			var cycleEpics []string
			for _, id := range epicIDs {
				if remaining[id] {
					cycleEpics = append(cycleEpics, id)
				}
			}
			var waveItems []RoadmapEpic
			for _, id := range cycleEpics {
				e := epicByID[id]
				waveItems = append(waveItems, buildRoadmapEpic(e, epicBlockers[id], epicSet, epicByID, childrenTotal[id], childrenClosed[id]))
			}
			waves = append(waves, waveItems)
			break
		}

		var waveItems []RoadmapEpic
		for _, id := range ready {
			e := epicByID[id]
			waveItems = append(waveItems, buildRoadmapEpic(e, epicBlockers[id], epicSet, epicByID, childrenTotal[id], childrenClosed[id]))
		}
		waves = append(waves, waveItems)

		// Remove ready epics and decrement dependents.
		for _, id := range ready {
			delete(remaining, id)
			for _, depID := range dependents[id] {
				if remaining[depID] {
					inDegree[depID]--
				}
			}
		}
	}

	return Roadmap{Waves: waves}
}

// buildRoadmapEpic computes the consumer-facing status for a single epic.
func buildRoadmapEpic(e tick.Tick, epicDeps []string, epicSet map[string]bool, epicByID map[string]tick.Tick, totalChildren, closedChildren int) RoadmapEpic {
	re := RoadmapEpic{
		ID:             e.ID,
		Title:          e.Title,
		ChildrenTotal:  totalChildren,
		ChildrenClosed: closedChildren,
	}

	// Populate BlockedBy with epic IDs only (task blockers already filtered out).
	if len(epicDeps) > 0 {
		re.BlockedBy = make([]string, len(epicDeps))
		copy(re.BlockedBy, epicDeps)
	}

	re.Status = epicConsumerStatus(e, epicDeps, epicByID, totalChildren, closedChildren)
	if re.Status == epicStatusGated {
		re.AwaitingType = e.GetAwaitingType()
	}
	return re
}

// epicConsumerStatus returns the consumer-facing status string for an epic.
// Priority order: gated > done > queued > active > ready.
//
// Note on "active with all-closed children": an open epic whose children are all
// closed is treated as active (not ready), because it has work already done and
// needs closing — ready means zero children, i.e. needs planning. This surfaces
// naturally in tk graph.
func epicConsumerStatus(e tick.Tick, epicDeps []string, epicByID map[string]tick.Tick, totalChildren, closedChildren int) string {
	// Gated takes priority: open + awaiting human action.
	if e.Status != tick.StatusClosed && e.IsAwaitingHuman() {
		return epicStatusGated
	}

	// Closed = done.
	if e.Status == tick.StatusClosed {
		return epicStatusDone
	}

	// Open or in_progress below here.
	// Queued: open and blocked by at least one open epic.
	if e.Status == tick.StatusOpen {
		for _, depID := range epicDeps {
			dep, ok := epicByID[depID]
			if !ok {
				// Missing blocker treated as closed → not a blocker.
				continue
			}
			if dep.Status != tick.StatusClosed {
				return epicStatusQueued
			}
		}
	}

	// Active: in_progress; OR open with at least one open child; OR open with
	// all children closed (has work done, needs closing — not needing planning).
	if e.Status == tick.StatusInProgress {
		return epicStatusActive
	}
	// e.Status == StatusOpen here.
	if totalChildren > 0 {
		// Has children (some open, some closed, or all closed) → active.
		return epicStatusActive
	}

	// Open, unblocked, zero children → needs planning.
	return epicStatusReady
}
