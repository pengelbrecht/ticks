package query

import (
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// frontierEpic builds a childless test epic for frontier tests. The existing
// makeEpic helper (roadmap_test.go) uses (id, title, status) — we reuse it
// directly for the common case, and add project/parent helpers below that
// don't conflict with any existing declarations.
func frontierEpicWithParent(id, parent, status string) tick.Tick {
	t := makeEpic(id, id, status)
	t.Parent = parent
	return t
}

func frontierEpicPri(id, parent, status string, priority int) tick.Tick {
	t := frontierEpicWithParent(id, parent, status)
	t.Priority = priority
	return t
}

func frontierEpicAfter(id, parent, status string, after ...string) tick.Tick {
	t := frontierEpicWithParent(id, parent, status)
	t.After = after
	return t
}

// frontierProject builds a non-epic open container. Projects are NOT typed
// epic — their RoleProject role is derived purely from having at least one
// container child. Provide container children when building the full tick slice.
func frontierProject(id, status string) tick.Tick {
	t := makeTick(id, "", status)
	return t
}

// ---------------------------------------------------------------------------
// CompletedProjectsNeedingCloseout tests
// ---------------------------------------------------------------------------

// TestCompletedProjectsNeedingCloseout_AllClosedLeaves verifies that a project
// whose epics and leaf tasks are all closed is returned by
// CompletedProjectsNeedingCloseout.
//
// Tree:
//
//	project "proj" (open, RoleProject — has an epic child that is itself a container)
//	└── epic "e1" (closed, has task children → container)
//	    ├── task "t1" (closed)
//	    └── task "t2" (closed)
func TestCompletedProjectsNeedingCloseout_AllClosedLeaves(t *testing.T) {
	proj := frontierProject("proj", tick.StatusOpen)
	e1 := frontierEpicWithParent("e1", "proj", tick.StatusClosed)
	t1 := makeTick("t1", "e1", tick.StatusClosed)
	t2 := makeTick("t2", "e1", tick.StatusClosed)
	all := []tick.Tick{proj, e1, t1, t2}

	got := CompletedProjectsNeedingCloseout(all)
	if len(got) != 1 || got[0].ID != "proj" {
		t.Errorf("expected [proj], got %v", tickIDs(got))
	}
}

// TestCompletedProjectsNeedingCloseout_OpenLeafExcluded verifies that a project
// with at least one open leaf descendant is NOT returned.
//
// Tree:
//
//	project "proj" (open)
//	└── epic "e1" (open)
//	    ├── task "t1" (closed)
//	    └── task "t2" (open)  ← open leaf: not complete
func TestCompletedProjectsNeedingCloseout_OpenLeafExcluded(t *testing.T) {
	proj := frontierProject("proj", tick.StatusOpen)
	e1 := frontierEpicWithParent("e1", "proj", tick.StatusOpen)
	t1 := makeTick("t1", "e1", tick.StatusClosed)
	t2 := makeTick("t2", "e1", tick.StatusOpen) // still open
	all := []tick.Tick{proj, e1, t1, t2}

	got := CompletedProjectsNeedingCloseout(all)
	if len(got) != 0 {
		t.Errorf("expected empty, got %v", tickIDs(got))
	}
}

// TestCompletedProjectsNeedingCloseout_AlreadyClosedProject verifies that a
// project whose own status is already closed is NOT returned — the checkpoint
// has already been performed.
func TestCompletedProjectsNeedingCloseout_AlreadyClosedProject(t *testing.T) {
	proj := frontierProject("proj", tick.StatusClosed) // already closed
	e1 := frontierEpicWithParent("e1", "proj", tick.StatusClosed)
	t1 := makeTick("t1", "e1", tick.StatusClosed)
	t2 := makeTick("t2", "e1", tick.StatusClosed)
	all := []tick.Tick{proj, e1, t1, t2}

	got := CompletedProjectsNeedingCloseout(all)
	if len(got) != 0 {
		t.Errorf("expected empty (project already closed), got %v", tickIDs(got))
	}
}

// TestCompletedProjectsNeedingCloseout_MultipleProjects verifies correct
// selection when multiple projects are present: only the fully-closed one
// (with open project tick) should be returned.
func TestCompletedProjectsNeedingCloseout_MultipleProjects(t *testing.T) {
	// projA — all leaves closed, project still open → should be returned.
	projA := frontierProject("projA", tick.StatusOpen)
	eA1 := frontierEpicWithParent("eA1", "projA", tick.StatusClosed)
	tA1 := makeTick("tA1", "eA1", tick.StatusClosed)

	// projB — has an open leaf → should NOT be returned.
	projB := frontierProject("projB", tick.StatusOpen)
	eB1 := frontierEpicWithParent("eB1", "projB", tick.StatusOpen)
	tB1 := makeTick("tB1", "eB1", tick.StatusOpen) // open leaf

	all := []tick.Tick{projA, eA1, tA1, projB, eB1, tB1}

	got := CompletedProjectsNeedingCloseout(all)
	if len(got) != 1 || got[0].ID != "projA" {
		t.Errorf("expected [projA], got %v", tickIDs(got))
	}
}

// TestCompletedProjectsNeedingCloseout_NonProjectExcluded verifies that plain
// epics and buckets (flat task groups) are never returned, even if all their
// children are closed.
func TestCompletedProjectsNeedingCloseout_NonProjectExcluded(t *testing.T) {
	// A bucket: container with all-leaf children → RoleBucket, not RoleProject.
	bucket := makeTick("bucket", "", tick.StatusOpen)
	c1 := makeTick("c1", "bucket", tick.StatusClosed)
	c2 := makeTick("c2", "bucket", tick.StatusClosed)

	// A plain epic (all tasks done).
	epic := makeEpic("epic1", "epic1 title", tick.StatusOpen)
	e1 := makeTick("et1", "epic1", tick.StatusClosed)

	all := []tick.Tick{bucket, c1, c2, epic, e1}

	got := CompletedProjectsNeedingCloseout(all)
	if len(got) != 0 {
		t.Errorf("expected empty (no projects in set), got %v", tickIDs(got))
	}
}

// ---------------------------------------------------------------------------
// NextPlannableEpics tests
// ---------------------------------------------------------------------------

// TestNextPlannableEpics_BasicOrdering verifies that NextPlannableEpics returns
// the expected childless open epics in priority order.
func TestNextPlannableEpics_BasicOrdering(t *testing.T) {
	// Three childless open epics with different priorities.
	e1 := frontierEpicPri("e1", "", tick.StatusOpen, 2)
	e2 := frontierEpicPri("e2", "", tick.StatusOpen, 1) // highest priority (lowest number)
	e3 := frontierEpicPri("e3", "", tick.StatusOpen, 3)
	all := []tick.Tick{e1, e2, e3}

	got := NextPlannableEpics(all)
	if len(got) != 3 {
		t.Fatalf("expected 3 plannable epics, got %d: %v", len(got), tickIDs(got))
	}
	// Priority 1 first, then 2, then 3.
	if got[0].ID != "e2" || got[1].ID != "e1" || got[2].ID != "e3" {
		t.Errorf("wrong order: got %v, want [e2 e1 e3]", tickIDs(got))
	}
}

// TestNextPlannableEpics_ExcludesEpicsWithChildren verifies that epics which
// already have children (i.e. have been planned) are excluded.
func TestNextPlannableEpics_ExcludesEpicsWithChildren(t *testing.T) {
	// e1 has a child → already planned, should be excluded.
	e1 := makeEpic("e1", "e1 title", tick.StatusOpen)
	child := makeTick("t1", "e1", tick.StatusOpen)
	// e2 is childless → needs planning.
	e2 := makeEpic("e2", "e2 title", tick.StatusOpen)
	all := []tick.Tick{e1, child, e2}

	got := NextPlannableEpics(all)
	if len(got) != 1 || got[0].ID != "e2" {
		t.Errorf("expected [e2], got %v", tickIDs(got))
	}
}

// TestNextPlannableEpics_ExcludesClosedAndInProgress verifies that closed and
// in_progress epics are not returned (only open epics need planning).
func TestNextPlannableEpics_ExcludesClosedAndInProgress(t *testing.T) {
	eClosed := makeEpic("eClosed", "closed epic", tick.StatusClosed)
	eInProg := makeEpic("eInProg", "in progress epic", tick.StatusInProgress)
	eOpen := makeEpic("eOpen", "open epic", tick.StatusOpen) // only this should appear
	all := []tick.Tick{eClosed, eInProg, eOpen}

	got := NextPlannableEpics(all)
	if len(got) != 1 || got[0].ID != "eOpen" {
		t.Errorf("expected [eOpen], got %v", tickIDs(got))
	}
}

// TestNextPlannableEpics_BlockedEpicExcluded verifies that a hard-blocked epic
// (BlockedBy an open tick) is not returned as plannable.
func TestNextPlannableEpics_BlockedEpicExcluded(t *testing.T) {
	blocker := makeEpic("blocker", "blocker epic", tick.StatusOpen)
	blocked := makeEpic("blocked", "blocked epic", tick.StatusOpen)
	blocked.BlockedBy = []string{"blocker"}
	free := makeEpic("free", "free epic", tick.StatusOpen) // unblocked
	all := []tick.Tick{blocker, blocked, free}

	got := NextPlannableEpics(all)
	// "blocked" should be excluded; "blocker" and "free" are childless+open+unblocked.
	ids := tickIDs(got)
	for _, id := range ids {
		if id == "blocked" {
			t.Errorf("blocked epic should not appear in plannable set, got %v", ids)
		}
	}
	// Both blocker and free should appear.
	if len(got) != 2 {
		t.Errorf("expected 2 plannable epics (blocker + free), got %v", ids)
	}
}

// TestNextPlannableEpics_SoftOrderDeferred verifies that soft-deferred epics
// (after-targets still open) sort behind non-deferred ones.
func TestNextPlannableEpics_SoftOrderDeferred(t *testing.T) {
	// e1 has a soft-order preference for e2 (which is still open), so e1 is
	// soft-deferred and should sort behind e3 despite having a higher priority.
	e1 := frontierEpicAfter("e1", "", tick.StatusOpen, "e2")
	e1.Priority = 1 // higher priority, but soft-deferred
	e2 := makeEpic("e2", "e2 title", tick.StatusOpen) // the after-target
	e2.Priority = 2
	e3 := makeEpic("e3", "e3 title", tick.StatusOpen) // no soft-defer
	e3.Priority = 2
	all := []tick.Tick{e1, e2, e3}

	got := NextPlannableEpics(all)
	// All three are childless open epics → all plannable.
	if len(got) != 3 {
		t.Fatalf("expected 3 results, got %d: %v", len(got), tickIDs(got))
	}
	// e1 is soft-deferred, so it must sort LAST despite higher priority.
	if got[len(got)-1].ID != "e1" {
		t.Errorf("soft-deferred e1 should be last, got order: %v", tickIDs(got))
	}
}

// TestNextPlannableEpics_ProjectLessRoadmapRegression verifies that on a
// project-less roadmap, NextPlannableEpics returns the same set as calling
// EpicsNeedingPlanning + SortBySoftOrderPriorityCreatedAt directly. This
// ensures the helper doesn't accidentally filter extra items in the common case.
func TestNextPlannableEpics_ProjectLessRoadmapRegression(t *testing.T) {
	// Flat roadmap: 4 epics, 1 already planned (has a child), 2 need planning, 1 closed.
	e1 := makeEpic("e1", "e1 title", tick.StatusOpen) // planned — has child
	e1Child := makeTick("e1c", "e1", tick.StatusOpen)
	e2 := frontierEpicPri("e2", "", tick.StatusOpen, 2) // needs planning
	e3 := frontierEpicPri("e3", "", tick.StatusOpen, 1) // needs planning, higher prio
	e4 := makeEpic("e4", "e4 title", tick.StatusClosed) // done — excluded
	all := []tick.Tick{e1, e1Child, e2, e3, e4}

	// Reference: what the flat tk-next path would produce.
	epicCandidates := []tick.Tick{e1, e2, e3, e4}
	ref := EpicsNeedingPlanning(epicCandidates, all)
	SortBySoftOrderPriorityCreatedAt(ref, all)

	got := NextPlannableEpics(all)

	// Same count and same order.
	if len(got) != len(ref) {
		t.Fatalf("regression: NextPlannableEpics returned %d items %v, flat selection returned %d items %v",
			len(got), tickIDs(got), len(ref), tickIDs(ref))
	}
	for i := range got {
		if got[i].ID != ref[i].ID {
			t.Errorf("position %d: got %q, ref has %q", i, got[i].ID, ref[i].ID)
		}
	}
}

// TestNextPlannableEpics_EmptyUniverse verifies no panic on an empty tick set.
func TestNextPlannableEpics_EmptyUniverse(t *testing.T) {
	got := NextPlannableEpics(nil)
	if len(got) != 0 {
		t.Errorf("expected empty result on nil input, got %v", tickIDs(got))
	}
}
