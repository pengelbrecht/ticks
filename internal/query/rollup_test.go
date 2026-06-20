package query

import (
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// makeTick is a convenience constructor for test ticks.
func makeTick(id, parent, status string) tick.Tick {
	return tick.Tick{
		ID:     id,
		Title:  id,
		Status: status,
		Type:   tick.TypeTask,
		Parent: parent,
	}
}

// TestDescendantProgress_NestedTree exercises the primary use-case: a three-level
// hierarchy (project → epics → tasks) with a mix of open and closed leaves.
//
// Tree:
//
//	project (p1)
//	├── epic (e1)
//	│   ├── task (t1) — closed
//	│   └── task (t2) — open
//	└── epic (e2)
//	    ├── task (t3) — closed
//	    ├── task (t4) — closed
//	    └── task (t5) — open
func TestDescendantProgress_NestedTree(t *testing.T) {
	allTicks := []tick.Tick{
		makeTick("p1", "", tick.StatusOpen),
		makeTick("e1", "p1", tick.StatusOpen),
		makeTick("e2", "p1", tick.StatusInProgress),
		makeTick("t1", "e1", tick.StatusClosed),
		makeTick("t2", "e1", tick.StatusOpen),
		makeTick("t3", "e2", tick.StatusClosed),
		makeTick("t4", "e2", tick.StatusClosed),
		makeTick("t5", "e2", tick.StatusOpen),
	}

	tests := []struct {
		name        string
		tickID      string
		wantClosed  int
		wantTotal   int
	}{
		{
			// Project sees all 5 leaf tasks: 3 closed, 2 open.
			name:       "project level",
			tickID:     "p1",
			wantClosed: 3,
			wantTotal:  5,
		},
		{
			// Epic e1 has 2 leaf tasks: 1 closed, 1 open.
			name:       "epic e1",
			tickID:     "e1",
			wantClosed: 1,
			wantTotal:  2,
		},
		{
			// Epic e2 has 3 leaf tasks: 2 closed, 1 open.
			name:       "epic e2",
			tickID:     "e2",
			wantClosed: 2,
			wantTotal:  3,
		},
		{
			// A closed leaf reports (1, 1).
			name:       "closed leaf t1",
			tickID:     "t1",
			wantClosed: 1,
			wantTotal:  1,
		},
		{
			// An open leaf reports (0, 1).
			name:       "open leaf t2",
			tickID:     "t2",
			wantClosed: 0,
			wantTotal:  1,
		},
	}

	// Build a tick-by-ID map for test lookups.
	byID := buildTickByID(allTicks)

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			root, ok := byID[tc.tickID]
			if !ok {
				t.Fatalf("tick %q not found in test data", tc.tickID)
			}
			closed, total := DescendantProgress(root, allTicks)
			if closed != tc.wantClosed || total != tc.wantTotal {
				t.Errorf("DescendantProgress(%q) = (%d, %d), want (%d, %d)",
					tc.tickID, closed, total, tc.wantClosed, tc.wantTotal)
			}
		})
	}
}

// TestDescendantProgress_LeafDirect verifies the leaf-passed-in convention:
// a leaf returns (1,1) if closed, (0,1) if open or in_progress.
func TestDescendantProgress_LeafDirect(t *testing.T) {
	tests := []struct {
		status     string
		wantClosed int
		wantTotal  int
	}{
		{tick.StatusClosed, 1, 1},
		{tick.StatusOpen, 0, 1},
		{tick.StatusInProgress, 0, 1},
	}

	for _, tc := range tests {
		t.Run(tc.status, func(t *testing.T) {
			leaf := makeTick("leaf1", "", tc.status)
			allTicks := []tick.Tick{leaf}
			closed, total := DescendantProgress(leaf, allTicks)
			if closed != tc.wantClosed || total != tc.wantTotal {
				t.Errorf("DescendantProgress(leaf, status=%q) = (%d, %d), want (%d, %d)",
					tc.status, closed, total, tc.wantClosed, tc.wantTotal)
			}
		})
	}
}

// TestDescendantProgress_CycleSafe verifies that a malformed parent loop
// (cycle) does not cause infinite recursion or a hang.
//
// Cycle: a → b → a (both ticks point at each other as parent).
// Note: BuildChildIndex uses the Parent field, so we construct the cycle by
// making each tick the parent of the other, which is impossible in a strict
// tree. We simulate it by manually crafting the ticks and confirming the
// function returns without hanging.
func TestDescendantProgress_CycleSafe(t *testing.T) {
	// In a real tick graph, cycles should never happen, but a corrupt file
	// or merge error could produce one. We verify the guard holds.
	//
	// tick "a" has parent "b", tick "b" has parent "a" — mutual cycle.
	// Neither has children according to the index (each appears as the other's
	// parent), so the ChildIndex will be:
	//   "b" → ["a"]   (a's parent is b)
	//   "a" → ["b"]   (b's parent is a)
	// This IS a cycle from the child-traversal perspective.
	a := makeTick("a", "b", tick.StatusOpen)
	b := makeTick("b", "a", tick.StatusOpen)
	allTicks := []tick.Tick{a, b}

	// Should complete without hanging. The visited set will block re-entry.
	closedA, totalA := DescendantProgress(a, allTicks)
	closedB, totalB := DescendantProgress(b, allTicks)

	// With the cycle guard, the traversal starting at "a" visits "a" (marks
	// visited), descends into child "b" (marks visited), descends into child
	// "a" — already visited, returns (0,0). So b contributes (0,0) as a
	// container with no effective leaves, and "a" contributes (0,0) as well.
	// Both are containers (each has a child), so neither is counted as a leaf.
	_ = closedA
	_ = totalA
	_ = closedB
	_ = totalB
	// The key assertion: we reached here without hanging or panicking.
}

// TestDescendantProgress_SingleContainer verifies a container whose only
// children are all closed returns (n, n).
func TestDescendantProgress_SingleContainer(t *testing.T) {
	allTicks := []tick.Tick{
		makeTick("parent", "", tick.StatusOpen),
		makeTick("c1", "parent", tick.StatusClosed),
		makeTick("c2", "parent", tick.StatusClosed),
		makeTick("c3", "parent", tick.StatusClosed),
	}
	parent := allTicks[0]
	closed, total := DescendantProgress(parent, allTicks)
	if closed != 3 || total != 3 {
		t.Errorf("all-closed container: got (%d, %d), want (3, 3)", closed, total)
	}
}

// TestDescendantProgress_DeepNesting ensures rollup works at arbitrary depth
// (not just two levels).
func TestDescendantProgress_DeepNesting(t *testing.T) {
	// Chain: root → mid → leaf (closed)
	allTicks := []tick.Tick{
		makeTick("root", "", tick.StatusOpen),
		makeTick("mid", "root", tick.StatusOpen),
		makeTick("leaf", "mid", tick.StatusClosed),
	}

	root := allTicks[0]
	closed, total := DescendantProgress(root, allTicks)
	if closed != 1 || total != 1 {
		t.Errorf("deep nesting: got (%d, %d), want (1, 1)", closed, total)
	}

	mid := allTicks[1]
	closed, total = DescendantProgress(mid, allTicks)
	if closed != 1 || total != 1 {
		t.Errorf("mid level: got (%d, %d), want (1, 1)", closed, total)
	}
}
