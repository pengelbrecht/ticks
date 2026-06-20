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
//   - "queued" — epic is open but blocked by at least one open epic. Only
//     hard (BlockedBy) edges count; soft (After) ordering never queues.
//   - "gated"  — epic is open and IsAwaitingHuman(); takes priority over all
//     other statuses. AwaitingType carries the badge value.
type RoadmapEpic struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Status       string `json:"status"`
	AwaitingType string `json:"awaiting_type,omitempty"`
	// Role is the derived structural role of this node: "epic" for an
	// orchestration unit, or "project" for a passive grouping/checkpoint
	// container. It is left empty for a project-less roadmap so that the only
	// shape that exists today serialises and renders byte-for-byte as before.
	// Buckets are never roadmap nodes. Renderers use Role+Parent to nest epics
	// under their parent projects (walk the tree).
	Role string `json:"role,omitempty"`
	// Parent is the ID of this node's enclosing project, or empty when the node
	// is at the roadmap root. Only populated when a project is present, so a
	// project-less roadmap leaves it empty and renders flat exactly as today.
	Parent string `json:"parent,omitempty"`
	// BlockedBy carries hard dependency edges (epic IDs only); these gate
	// feasibility and feed the "queued" status. After carries soft ordering
	// edges (epic IDs only); they influence wave placement but never status,
	// so renderers can distinguish the two edge types.
	BlockedBy      []string `json:"blocked_by,omitempty"`
	After          []string `json:"after,omitempty"`
	ChildrenTotal  int      `json:"children_total"`
	ChildrenClosed int      `json:"children_closed"`
}

// Roadmap is the result of epic-chain computation. Waves are ordered from
// earliest (wave 0 = no epic predecessors, hard or soft) to latest; within
// each wave epics are sorted by ID for deterministic output. Epics that are
// part of a cycle (rare) are placed in the final wave.
type Roadmap struct {
	Waves [][]RoadmapEpic `json:"waves"`
}

// Consumer-facing roadmap status values; see RoadmapEpic.Status.
const (
	epicStatusDone   = "done"
	epicStatusActive = "active"
	epicStatusReady  = "ready"
	epicStatusQueued = "queued"
	epicStatusGated  = "gated"
)

// ComputeRoadmap computes an epic-level dependency view over all ticks.
//
// Only epics (Type == TypeEpic) appear as nodes. Layering edges are the union
// of BlockedBy (hard) and After (soft ordering) entries that point at another
// epic; task-level and missing targets are ignored (missing blockers are
// treated as closed, same semantics as ready.go). An ID appearing in both
// BlockedBy and After counts as a single edge.
//
// Waves are computed with Kahn's topological layering: wave 0 contains epics
// with no epic predecessors still in the working set; each subsequent wave
// contains epics whose predecessors are all in earlier waves. Epics involved
// in cycles over the union graph (if any) are appended as a final wave.
//
// Status is derived from hard (BlockedBy) edges only: an epic whose only open
// predecessors are After targets is never "queued" — soft ordering shifts
// wave placement but never feasibility.
func ComputeRoadmap(allTicks []tick.Tick) Roadmap {
	// Index children once; role derivation and rollup both need it.
	childIndex := BuildChildIndex(allTicks)

	// Collect roadmap nodes. Two kinds of container are nodes:
	//   - epics   (the explicit orchestration unit, RoleEpic/RoleEmptyEpic) —
	//     exactly the set that has always appeared in the roadmap.
	//   - projects (RoleProject — a passive container of containers) — the
	//     big-picture grouping/checkpoint layer.
	// Buckets (RoleBucket — passive grouping of leaves) are deliberately
	// EXCLUDED: they are never run as a unit (design §1).
	var epics []tick.Tick
	epicSet := make(map[string]bool)
	roleOf := make(map[string]RoleKind)
	for _, t := range allTicks {
		role := Role(t, childIndex)
		switch role {
		case RoleEpic, RoleEmptyEpic, RoleProject:
			epics = append(epics, t)
			epicSet[t.ID] = true
			roleOf[t.ID] = role
		}
	}

	if len(epics) == 0 {
		return Roadmap{}
	}

	// Children stats per node: a recursive rollup over ALL leaf descendants
	// (design §3), so a container reports progress at any altitude — a project
	// aggregates across its epics' tasks, not just its direct children. For a
	// single-level epic this equals the old direct child count.
	//
	// A childless node (RoleEmptyEpic) is left at 0/0 rather than the rollup's
	// "leaf counts itself as 1" convention: the roadmap has always reported a
	// childless epic as having zero children (which is what marks it
	// needs-planning), and that contract must not change.
	childrenTotal := make(map[string]int)
	childrenClosed := make(map[string]int)
	for _, e := range epics {
		if !IsContainer(e, childIndex) {
			continue // childless → 0/0, preserving needs-planning semantics
		}
		closed, total := DescendantProgress(e, allTicks)
		childrenTotal[e.ID] = total
		childrenClosed[e.ID] = closed
	}

	// Parent linkage for tree-aware rendering: a node's Parent is its enclosing
	// roadmap container (a project), or empty when at the root. Only project
	// parents are recorded — an epic nested directly under another epic is not a
	// project boundary. This stays empty for a project-less roadmap.
	parentOf := make(map[string]string)
	for _, e := range epics {
		if roleOf[e.Parent] == RoleProject {
			parentOf[e.ID] = e.Parent
		}
	}

	// Filter BlockedBy and After to epic-only edges.
	// epicBlockers[id] = epic IDs that this epic is hard-blocked by; feeds
	// status ("queued") and RoadmapEpic.BlockedBy.
	// epicAfter[id]    = epic IDs this epic prefers to come after (soft
	// ordering); feeds RoadmapEpic.After only.
	// layerPreds[id]   = the union of both, deduped — the Kahn edge set.
	epicBlockers := make(map[string][]string, len(epics))
	epicAfter := make(map[string][]string, len(epics))
	layerPreds := make(map[string][]string, len(epics))
	for _, e := range epics {
		var epicDeps, afterDeps, preds []string
		seen := make(map[string]bool)
		for _, blocker := range e.BlockedBy {
			if epicSet[blocker] {
				epicDeps = append(epicDeps, blocker)
				if !seen[blocker] {
					seen[blocker] = true
					preds = append(preds, blocker)
				}
			}
			// Task-level blockers are ignored for chain/wave computation.
		}
		for _, target := range e.After {
			if epicSet[target] {
				afterDeps = append(afterDeps, target)
				if !seen[target] {
					seen[target] = true
					preds = append(preds, target)
				}
			}
			// Task-level and missing after targets are likewise ignored.
		}
		epicBlockers[e.ID] = epicDeps
		epicAfter[e.ID] = afterDeps
		layerPreds[e.ID] = preds
	}

	// Kahn's algorithm: iteratively peel off zero-in-degree layers.
	inDegree := make(map[string]int, len(epics))
	dependents := make(map[string][]string) // predecessor -> list of epics layered after it
	epicByID := make(map[string]tick.Tick, len(epics))
	for _, e := range epics {
		inDegree[e.ID] = 0
		epicByID[e.ID] = e
	}
	for _, e := range epics {
		for _, dep := range layerPreds[e.ID] {
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
				waveItems = append(waveItems, buildRoadmapEpic(e, epicBlockers[id], epicAfter[id], epicByID, childrenTotal[id], childrenClosed[id], roleOf[id], parentOf[id]))
			}
			waves = append(waves, waveItems)
			break
		}

		var waveItems []RoadmapEpic
		for _, id := range ready {
			e := epicByID[id]
			waveItems = append(waveItems, buildRoadmapEpic(e, epicBlockers[id], epicAfter[id], epicByID, childrenTotal[id], childrenClosed[id], roleOf[id], parentOf[id]))
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

// buildRoadmapEpic computes the consumer-facing status for a single roadmap
// node. epicDeps are hard (BlockedBy) epic edges and drive status; afterDeps are
// soft (After) epic edges and are surfaced but never affect status. role is the
// node's derived role (RoleProject for a grouping container, otherwise an epic);
// parentID is the enclosing project, if any.
func buildRoadmapEpic(e tick.Tick, epicDeps, afterDeps []string, epicByID map[string]tick.Tick, totalChildren, closedChildren int, role RoleKind, parentID string) RoadmapEpic {
	re := RoadmapEpic{
		ID:             e.ID,
		Title:          e.Title,
		Parent:         parentID,
		ChildrenTotal:  totalChildren,
		ChildrenClosed: closedChildren,
	}

	// Populate BlockedBy and After with epic IDs only (task-level and missing
	// targets already filtered out).
	if len(epicDeps) > 0 {
		re.BlockedBy = make([]string, len(epicDeps))
		copy(re.BlockedBy, epicDeps)
	}
	if len(afterDeps) > 0 {
		re.After = make([]string, len(afterDeps))
		copy(re.After, afterDeps)
	}

	if role == RoleProject {
		// Projects are passive grouping/checkpoint nodes, not orchestration
		// units: they are never "ready/needs planning" and carry no
		// awaiting/queued semantics of their own. Status is purely a rollup of
		// their descendants — done when every leaf is closed, else active.
		re.Role = "project"
		re.Status = projectStatus(totalChildren, closedChildren)
		return re
	}

	re.Status = epicConsumerStatus(e, epicDeps, epicByID, totalChildren, closedChildren)
	if re.Status == epicStatusGated {
		re.AwaitingType = e.GetAwaitingType()
	}
	return re
}

// projectStatus derives a project's consumer-facing status from its recursive
// descendant rollup. A project is "done" only when it has at least one leaf and
// all of them are closed; otherwise it is "active" (work remains, or it is an
// empty shell). Projects never surface as "ready"/"queued"/"gated" — those are
// orchestration states reserved for epics.
func projectStatus(totalChildren, closedChildren int) string {
	if totalChildren > 0 && closedChildren == totalChildren {
		return epicStatusDone
	}
	return epicStatusActive
}

// epicConsumerStatus returns the consumer-facing status string for an epic.
// Priority order: gated > done > queued > active > ready.
//
// epicDeps must be hard (BlockedBy) epic edges only. Soft (After) edges are
// deliberately excluded: an epic whose only open predecessors are After
// targets stays ready/active/gated, never queued.
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
