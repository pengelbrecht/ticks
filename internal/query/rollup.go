package query

import (
	"github.com/pengelbrecht/ticks/internal/tick"
)

// DescendantProgress computes a recursive progress rollup for t over the full
// tick set. It returns (closed, total) counts for the LEAF descendants of t —
// descendants with no children of their own, which are the actual units of
// work. Containers themselves are not counted.
//
// Convention for the degenerate cases:
//   - If t is itself a leaf (no children), it is counted as its own unit:
//     total=1, closed=1 if t.Status==StatusClosed, closed=0 otherwise.
//   - If t is a container with no leaf descendants (all descendants are
//     containers, which would indicate a malformed graph), total=0, closed=0.
//
// The function is cycle-safe: a visited set prevents infinite recursion if a
// parent loop exists in a malformed tick graph.
//
// allTicks must be the full tick set (not a pre-filtered subset) for role
// derivation to be accurate. The function builds a ChildIndex and tick-by-ID
// map internally.
func DescendantProgress(t tick.Tick, allTicks []tick.Tick) (closed, total int) {
	index := BuildChildIndex(allTicks)
	byID := buildTickByID(allTicks)
	visited := make(map[string]bool)
	return descendantProgressRec(t, index, byID, visited)
}

// buildTickByID builds a map from tick ID to tick for efficient lookup.
func buildTickByID(allTicks []tick.Tick) map[string]tick.Tick {
	m := make(map[string]tick.Tick, len(allTicks))
	for _, t := range allTicks {
		m[t.ID] = t
	}
	return m
}

// descendantProgressRec is the private recursive implementation of
// DescendantProgress. It operates with a pre-built ChildIndex and tick-by-ID
// map in scope, and uses visited to detect cycles.
func descendantProgressRec(t tick.Tick, index ChildIndex, byID map[string]tick.Tick, visited map[string]bool) (closed, total int) {
	// Cycle guard: if we've already visited this tick in the current traversal
	// (indicating a malformed parent loop), return zero to stop recursion.
	if visited[t.ID] {
		return 0, 0
	}
	visited[t.ID] = true

	children := index[t.ID]

	// Leaf: no children — count this tick itself as the unit of work.
	if len(children) == 0 {
		if t.Status == tick.StatusClosed {
			return 1, 1
		}
		return 0, 1
	}

	// Container: recurse into children and accumulate leaf counts.
	// This tick itself is NOT counted — only its leaf descendants are.
	var closedSum, totalSum int
	for _, childID := range children {
		child, ok := byID[childID]
		if !ok {
			// Child ID in index but not in allTicks — skip dangling reference.
			continue
		}
		c, tot := descendantProgressRec(child, index, byID, visited)
		closedSum += c
		totalSum += tot
	}
	return closedSum, totalSum
}
