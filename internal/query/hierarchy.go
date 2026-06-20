package query

import (
	"github.com/pengelbrecht/ticks/internal/tick"
)

// RoleKind enumerates a tick's structural role in the generic
// tick -> epic -> project hierarchy. A role is *derived* from structure (does
// the tick have children, do its children have children) plus the single
// explicit `type: "epic"` marker; it is never stored. Use Role(t, index) to
// compute it.
//
// See docs/design/big-picture-tracking-projects-and-hierarchy.md §1-§2 (the
// grouping-vs-orchestration principle and the role-derivation table).
type RoleKind string

// The five derived roles. The derivation table:
//
//	has children? | epic marker? | children            | role
//	--------------|--------------|---------------------|-------------
//	no            | no           | —                   | tick
//	no            | yes          | —                   | empty epic
//	yes           | yes          | any                 | epic
//	yes           | no           | all leaves          | bucket
//	yes           | no           | includes a container| project
const (
	// RoleTick is a leaf (no children) that is not marked epic: atomic work.
	RoleTick RoleKind = "tick"
	// RoleEmptyEpic is a leaf marked type:epic: an epic awaiting planning.
	RoleEmptyEpic RoleKind = "empty_epic"
	// RoleEpic is a container marked type:epic: an orchestration unit whose
	// children are run as coordinated waves.
	RoleEpic RoleKind = "epic"
	// RoleBucket is a container NOT marked epic whose children are all leaves:
	// a passive grouping (e.g. unrelated bugs), never run as a unit.
	RoleBucket RoleKind = "bucket"
	// RoleProject is a container NOT marked epic with at least one child that is
	// itself a container: a grouping plus checkpoint boundary.
	RoleProject RoleKind = "project"
)

// ChildIndex maps a parent tick ID to the set of IDs of ticks that point their
// `parent` at it. It is the structural input the role helpers need: a tick is a
// container iff it appears as a key with at least one child.
//
// Build it once with BuildChildIndex over the full tick set and reuse it across
// many Role/IsContainer calls.
type ChildIndex map[string][]string

// BuildChildIndex indexes every tick by its parent. A tick with an empty
// `parent` contributes no edge. The returned index is keyed by parent ID; the
// value is the list of that parent's direct child IDs (order follows allTicks).
//
// Pass the full set of ticks: role derivation needs every descendant edge to
// decide container-ness, so a filtered subset can misclassify a parent.
func BuildChildIndex(allTicks []tick.Tick) ChildIndex {
	index := make(ChildIndex)
	for _, t := range allTicks {
		if t.Parent != "" {
			index[t.Parent] = append(index[t.Parent], t.ID)
		}
	}
	return index
}

// IsContainer reports whether t has at least one child in index — i.e. some tick
// points its `parent` at t. Containment is the structural fact underlying every
// non-leaf role; it is free and passive and implies nothing about execution
// (see design §1).
func IsContainer(t tick.Tick, index ChildIndex) bool {
	return len(index[t.ID]) > 0
}

// Role returns the derived structural role of t given the full child index.
//
// The explicit epic marker is the existing `type == "epic"`. "Container" means
// "has at least one child" (IsContainer). A "project" is a container whose
// children include at least one further container; a "bucket" is a container
// whose children are all leaves.
func Role(t tick.Tick, index ChildIndex) RoleKind {
	isEpic := t.Type == tick.TypeEpic

	if !IsContainer(t, index) {
		// Leaf.
		if isEpic {
			return RoleEmptyEpic
		}
		return RoleTick
	}

	// Container below here.
	if isEpic {
		return RoleEpic
	}

	// Unmarked container: project if any child is itself a container, else a
	// passive bucket.
	for _, childID := range index[t.ID] {
		if len(index[childID]) > 0 {
			return RoleProject
		}
	}
	return RoleBucket
}
