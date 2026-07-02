package query

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// ---------------------------------------------------------------------------
// Scenario 1 — Project-less regression
//
// A flat epic roadmap (epics linked by blocked-by/after edges, no project
// containers) must drive NextPlannableEpics and EpicsNeedingPlanning EXACTLY
// as before. This is the backwards-compat guard from design §8.
// ---------------------------------------------------------------------------

// TestProjectlessRegression_NextPlannableMatchesFlatPath asserts that on a
// roadmap with no project containers, NextPlannableEpics returns the identical
// set and ordering that the flat tk-next path produces via
// EpicsNeedingPlanning + SortBySoftOrderPriorityCreatedAt.
//
// Fixture:
//
//	e1 (open, p1, planned — has task child)
//	e2 (open, p2, childless, priority 3)
//	e3 (open, p1, childless, priority 2) — highest-priority plannable
//	e4 (open, p2, childless, priority 2, blocked_by e3 — still open → excluded)
//	e5 (closed — excluded)
//	t1 (task, child of e1 — makes e1 a container)
func TestProjectlessRegression_NextPlannableMatchesFlatPath(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	mkEpic := func(id, status string, priority int, created time.Time) tick.Tick {
		return tick.Tick{
			ID:        id,
			Title:     "Epic " + id,
			Status:    status,
			Priority:  priority,
			Type:      tick.TypeEpic,
			Owner:     "test",
			CreatedBy: "test",
			CreatedAt: created,
			UpdatedAt: created,
		}
	}

	e1 := mkEpic("e1", tick.StatusOpen, 2, base)
	e2 := mkEpic("e2", tick.StatusOpen, 3, base.Add(time.Minute))
	e3 := mkEpic("e3", tick.StatusOpen, 2, base.Add(2*time.Minute)) // same prio as e1, created later than e1
	e4 := mkEpic("e4", tick.StatusOpen, 2, base.Add(3*time.Minute))
	e4.BlockedBy = []string{"e3"} // blocked by an open epic → excluded

	e5 := mkEpic("e5", tick.StatusClosed, 1, base.Add(4*time.Minute))

	t1 := tick.Tick{
		ID:        "t1",
		Title:     "task t1",
		Status:    tick.StatusOpen,
		Type:      tick.TypeTask,
		Parent:    "e1", // makes e1 a container → already planned
		Owner:     "test",
		CreatedBy: "test",
		CreatedAt: base,
		UpdatedAt: base,
	}

	all := []tick.Tick{e1, e2, e3, e4, e5, t1}

	// Reference: flat tk-next path.
	epicCandidates := []tick.Tick{e1, e2, e3, e4, e5}
	ref := EpicsNeedingPlanning(epicCandidates, all)
	SortBySoftOrderPriorityCreatedAt(ref, all)

	// Subject: NextPlannableEpics.
	got := NextPlannableEpics(all)

	// Must match count and order exactly — the backwards-compat guarantee.
	if len(got) != len(ref) {
		t.Fatalf("count mismatch: NextPlannableEpics=%d %v, flat path=%d %v",
			len(got), tickIDs(got), len(ref), tickIDs(ref))
	}
	for i := range got {
		if got[i].ID != ref[i].ID {
			t.Errorf("position %d: NextPlannableEpics=%q, flat path=%q", i, got[i].ID, ref[i].ID)
		}
	}

	// Spot-check: e1 (has child) and e4 (open blocker) must be absent.
	gotSet := make(map[string]bool, len(got))
	for _, tk := range got {
		gotSet[tk.ID] = true
	}
	if gotSet["e1"] {
		t.Error("e1 must be excluded (has a task child — already planned)")
	}
	if gotSet["e4"] {
		t.Error("e4 must be excluded (blocked_by open e3)")
	}
	if gotSet["e5"] {
		t.Error("e5 must be excluded (closed)")
	}
}

// TestProjectlessRegression_SoftOrderAfterEdge verifies that in a flat roadmap
// an epic with an open after-target sorts behind undeferred epics, while the
// after-target itself (which is open and feasible) sorts first.
func TestProjectlessRegression_SoftOrderAfterEdge(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	mkEpic := func(id string, prio int, created time.Time, after ...string) tick.Tick {
		tk := tick.Tick{
			ID:        id,
			Title:     "Epic " + id,
			Status:    tick.StatusOpen,
			Priority:  prio,
			Type:      tick.TypeEpic,
			Owner:     "test",
			CreatedBy: "test",
			CreatedAt: created,
			UpdatedAt: created,
		}
		if len(after) > 0 {
			tk.After = after
		}
		return tk
	}

	eFirst := mkEpic("eFirst", 2, base)                          // no constraints
	eLate := mkEpic("eLate", 1, base.Add(time.Minute), "eFirst") // higher prio but soft-deferred behind eFirst

	all := []tick.Tick{eFirst, eLate}

	got := NextPlannableEpics(all)
	if len(got) != 2 {
		t.Fatalf("expected 2 plannable epics, got %d: %v", len(got), tickIDs(got))
	}
	// eFirst must sort before eLate despite eLate having higher nominal priority.
	if got[0].ID != "eFirst" {
		t.Errorf("first position: got %q, want eFirst (eLate must yield while eFirst is open)", got[0].ID)
	}
	if got[1].ID != "eLate" {
		t.Errorf("second position: got %q, want eLate", got[1].ID)
	}
}

// ---------------------------------------------------------------------------
// Scenario 2 — Project completion + checkpoint halt
//
// A project grouping epics, where every epic/leaf is closed:
//   - CompletedProjectsNeedingCloseout returns it.
//   - A project close-out tick carrying awaiting:checkpoint HALTS planning
//     past the boundary when autonomous-mode is OFF.
// ---------------------------------------------------------------------------

// TestCheckpointHalts_ProjectCompletionAndPlanningGate builds a two-project
// roadmap where project A is done (all leaves closed) and its close-out tick
// is awaiting:checkpoint, and project B's epic is queued after project A's
// close-out. With autonomous-mode OFF, the checkpoint must gate planning so
// project B's epic is not returned as plannable.
//
// Fixture:
//
//	projA (open, RoleProject — has epic child eA1 which itself has task children)
//	├── eA1 (epic, closed, has task children)
//	│   ├── tA1 (task, closed)
//	│   └── tA2 (task, closed)
//	closeoutA (epic, open, awaiting:checkpoint, blocked_by eA1 → now open for planning
//	           but gated by checkpoint await)
//
//	projB (open, RoleProject)
//	└── eB1 (epic, open, childless, blocked_by closeoutA — so doubly gated)
func TestCheckpointHalts_ProjectCompletionAndPlanningGate(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	checkpointAwaiting := tick.AwaitingCheckpoint

	// Project A — fully done (all leaves closed, project itself still open).
	projA := tick.Tick{
		ID: "projA", Title: "Project A", Status: tick.StatusOpen,
		Type: tick.TypeTask, Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	eA1 := tick.Tick{
		ID: "eA1", Title: "Epic A1", Status: tick.StatusClosed,
		Type: tick.TypeEpic, Parent: "projA", Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	tA1 := tick.Tick{
		ID: "tA1", Title: "Task A1", Status: tick.StatusClosed,
		Type: tick.TypeTask, Parent: "eA1", Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	tA2 := tick.Tick{
		ID: "tA2", Title: "Task A2", Status: tick.StatusClosed,
		Type: tick.TypeTask, Parent: "eA1", Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}

	// Close-out epic for project A: open, childless (needs planning), awaiting checkpoint.
	closeoutA := tick.Tick{
		ID: "closeoutA", Title: "Project A close-out", Status: tick.StatusOpen,
		Type: tick.TypeEpic, Awaiting: &checkpointAwaiting,
		Owner: "test", CreatedBy: "test",
		CreatedAt: base.Add(time.Minute), UpdatedAt: base.Add(time.Minute),
	}

	// Project B — its epic is blocked by the closeout.
	projB := tick.Tick{
		ID: "projB", Title: "Project B", Status: tick.StatusOpen,
		Type: tick.TypeTask, Owner: "test", CreatedBy: "test",
		CreatedAt: base.Add(2 * time.Minute), UpdatedAt: base.Add(2 * time.Minute),
	}
	eB1 := tick.Tick{
		ID: "eB1", Title: "Epic B1", Status: tick.StatusOpen,
		Type: tick.TypeEpic, Parent: "projB",
		BlockedBy: []string{"closeoutA"},
		Owner:     "test", CreatedBy: "test",
		CreatedAt: base.Add(3 * time.Minute), UpdatedAt: base.Add(3 * time.Minute),
	}

	all := []tick.Tick{projA, eA1, tA1, tA2, closeoutA, projB, eB1}

	// Part 1: CompletedProjectsNeedingCloseout must identify projA.
	needsCloseout := CompletedProjectsNeedingCloseout(all)
	if len(needsCloseout) != 1 || needsCloseout[0].ID != "projA" {
		t.Errorf("CompletedProjectsNeedingCloseout: got %v, want [projA]", tickIDs(needsCloseout))
	}

	// Part 2: autonomous-mode OFF — checkpoint gates continuation.
	//
	// closeoutA is childless+open but awaiting:checkpoint → excluded.
	// eB1 is blocked_by closeoutA (open) → also excluded.
	// Result: nothing plannable.
	gotOff := EpicsNeedingPlanningWithMode([]tick.Tick{closeoutA, eB1}, false, all)
	if len(gotOff) != 0 {
		t.Errorf("autonomous OFF: checkpoint must gate; got plannable %v, want []", tickIDs(gotOff))
	}

	// Also verify via NextPlannableEpics (which always runs in OFF mode).
	nextOff := NextPlannableEpics(all)
	for _, tk := range nextOff {
		if tk.ID == "closeoutA" {
			t.Errorf("NextPlannableEpics (OFF mode): closeoutA must not surface (checkpoint await gates it)")
		}
		if tk.ID == "eB1" {
			t.Errorf("NextPlannableEpics (OFF mode): eB1 must not surface (blocked_by open closeoutA)")
		}
	}
}

// ---------------------------------------------------------------------------
// Scenario 3 — Autonomous-mode flow-through
//
// Same fixture as scenario 2, but:
//   - autonomous=true: checkpoint await is bypassed → closeoutA becomes plannable.
//   - approval await is NOT bypassed even with autonomous=true.
// ---------------------------------------------------------------------------

// TestAutonomousMode_CheckpointBypassed verifies that EpicsNeedingPlanningWithMode
// with autonomous=true surfaces a checkpoint-awaiting epic while an
// approval-awaiting epic still gates.
func TestAutonomousMode_CheckpointBypassed(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	mkAwaitingEpic := func(id, awaiting string) tick.Tick {
		a := awaiting
		return tick.Tick{
			ID: id, Title: "Epic " + id, Status: tick.StatusOpen,
			Type: tick.TypeEpic, Awaiting: &a,
			Owner: "test", CreatedBy: "test",
			CreatedAt: base, UpdatedAt: base,
		}
	}

	checkpointEpic := mkAwaitingEpic("eCheckpoint", tick.AwaitingCheckpoint)
	approvalEpic := mkAwaitingEpic("eApproval", tick.AwaitingApproval)
	normalEpic := tick.Tick{
		ID: "eNormal", Title: "Normal epic", Status: tick.StatusOpen,
		Type: tick.TypeEpic, Owner: "test", CreatedBy: "test",
		CreatedAt: base.Add(time.Minute), UpdatedAt: base.Add(time.Minute),
	}

	all := []tick.Tick{checkpointEpic, approvalEpic, normalEpic}

	// OFF: both awaiting epics gated, only normal surfaces.
	offResult := EpicsNeedingPlanningWithMode(all, false, all)
	offIDs := make(map[string]bool)
	for _, tk := range offResult {
		offIDs[tk.ID] = true
	}
	if offIDs["eCheckpoint"] {
		t.Error("autonomous OFF: checkpoint epic must not surface")
	}
	if offIDs["eApproval"] {
		t.Error("autonomous OFF: approval epic must not surface")
	}
	if !offIDs["eNormal"] {
		t.Error("autonomous OFF: normal epic must surface")
	}

	// ON: checkpoint bypassed, approval still gated, normal still surfaces.
	onResult := EpicsNeedingPlanningWithMode(all, true, all)
	onIDs := make(map[string]bool)
	for _, tk := range onResult {
		onIDs[tk.ID] = true
	}
	if !onIDs["eCheckpoint"] {
		t.Error("autonomous ON: checkpoint epic must surface (bypass active)")
	}
	if onIDs["eApproval"] {
		t.Error("autonomous ON: approval epic must still be gated (bypass scoped to checkpoint only)")
	}
	if !onIDs["eNormal"] {
		t.Error("autonomous ON: normal epic must surface")
	}
}

// TestAutonomousMode_FullProjectFixture verifies the full two-project scenario:
// autonomous ON → closeoutA (checkpoint) surfaces as plannable; eB1 remains
// blocked (it is blocked_by closeoutA which is still open, regardless of mode).
func TestAutonomousMode_FullProjectFixture(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	checkpointAwaiting := tick.AwaitingCheckpoint

	projA := tick.Tick{
		ID: "projA", Title: "Project A", Status: tick.StatusOpen,
		Type: tick.TypeTask, Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	eA1 := tick.Tick{
		ID: "eA1", Title: "Epic A1", Status: tick.StatusClosed,
		Type: tick.TypeEpic, Parent: "projA", Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	tA1 := tick.Tick{
		ID: "tA1", Title: "Task A1", Status: tick.StatusClosed,
		Type: tick.TypeTask, Parent: "eA1", Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	closeoutA := tick.Tick{
		ID: "closeoutA", Title: "Project A close-out", Status: tick.StatusOpen,
		Type: tick.TypeEpic, Awaiting: &checkpointAwaiting,
		Owner: "test", CreatedBy: "test",
		CreatedAt: base.Add(time.Minute), UpdatedAt: base.Add(time.Minute),
	}
	projB := tick.Tick{
		ID: "projB", Title: "Project B", Status: tick.StatusOpen,
		Type: tick.TypeTask, Owner: "test", CreatedBy: "test",
		CreatedAt: base.Add(2 * time.Minute), UpdatedAt: base.Add(2 * time.Minute),
	}
	eB1 := tick.Tick{
		ID: "eB1", Title: "Epic B1", Status: tick.StatusOpen,
		Type: tick.TypeEpic, Parent: "projB",
		BlockedBy: []string{"closeoutA"},
		Owner:     "test", CreatedBy: "test",
		CreatedAt: base.Add(3 * time.Minute), UpdatedAt: base.Add(3 * time.Minute),
	}

	all := []tick.Tick{projA, eA1, tA1, closeoutA, projB, eB1}

	epicCandidates := []tick.Tick{closeoutA, eB1}

	// ON: closeoutA should surface (checkpoint bypass), eB1 still blocked.
	onResult := EpicsNeedingPlanningWithMode(epicCandidates, true, all)
	onIDs := make(map[string]bool)
	for _, tk := range onResult {
		onIDs[tk.ID] = true
	}
	if !onIDs["closeoutA"] {
		t.Error("autonomous ON: closeoutA (checkpoint) must surface as plannable")
	}
	if onIDs["eB1"] {
		t.Error("autonomous ON: eB1 must still be blocked (blocked_by open closeoutA)")
	}
}

// TestAutonomousMode_NonCheckpointAwaitStillGates runs through every non-checkpoint
// awaiting type and confirms none are bypassed under autonomous mode.
func TestAutonomousMode_NonCheckpointAwaitStillGates(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	nonCheckpointTypes := []string{
		tick.AwaitingApproval,
		tick.AwaitingInput,
		tick.AwaitingReview,
		tick.AwaitingContent,
		tick.AwaitingEscalation,
		tick.AwaitingWork,
	}

	for _, awaitType := range nonCheckpointTypes {
		awaitType := awaitType // capture
		t.Run(awaitType, func(t *testing.T) {
			a := awaitType
			epic := tick.Tick{
				ID: "e1", Title: "Epic", Status: tick.StatusOpen,
				Type: tick.TypeEpic, Awaiting: &a,
				Owner: "test", CreatedBy: "test",
				CreatedAt: base, UpdatedAt: base,
			}
			candidates := []tick.Tick{epic}
			got := EpicsNeedingPlanningWithMode(candidates, true, candidates)
			if len(got) != 0 {
				t.Errorf("autonomous ON: awaiting:%s must still gate planning; got %v", awaitType, tickIDs(got))
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Scenario 4 — Per-project no-checkpoint flows through
//
// A project whose close-out tick has NO checkpoint await flows through with
// autonomous-mode OFF (nothing to gate, no checkpoint boundary).
// ---------------------------------------------------------------------------

// TestNoCheckpointFlowsThrough verifies that a project close-out epic with NO
// awaiting state (or a non-checkpoint await that has been cleared) is returned
// as plannable even when autonomous mode is OFF. This is the "no checkpoint"
// case: the project boundary exists but imposes no human gate.
//
// Fixture:
//
//	projA (open, has epic child → RoleProject)
//	└── eA1 (epic, closed, has task child → container)
//	    └── tA1 (task, closed)
//	closeoutA (epic, open, childless, NO awaiting state → plannable normally)
func TestNoCheckpointFlowsThrough(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	projA := tick.Tick{
		ID: "projA", Title: "Project A", Status: tick.StatusOpen,
		Type: tick.TypeTask, Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	eA1 := tick.Tick{
		ID: "eA1", Title: "Epic A1", Status: tick.StatusClosed,
		Type: tick.TypeEpic, Parent: "projA", Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	tA1 := tick.Tick{
		ID: "tA1", Title: "Task A1", Status: tick.StatusClosed,
		Type: tick.TypeTask, Parent: "eA1", Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}

	// Close-out epic with NO awaiting state: it should flow through in OFF mode.
	closeoutA := tick.Tick{
		ID: "closeoutA", Title: "Project A close-out", Status: tick.StatusOpen,
		Type:  tick.TypeEpic, // No Awaiting field set
		Owner: "test", CreatedBy: "test",
		CreatedAt: base.Add(time.Minute), UpdatedAt: base.Add(time.Minute),
	}

	all := []tick.Tick{projA, eA1, tA1, closeoutA}

	// autonomous OFF: closeoutA must be plannable (no checkpoint gate).
	got := EpicsNeedingPlanningWithMode([]tick.Tick{closeoutA}, false, all)
	if len(got) != 1 || got[0].ID != "closeoutA" {
		t.Errorf("no-checkpoint close-out must flow through in OFF mode; got %v, want [closeoutA]", tickIDs(got))
	}

	// NextPlannableEpics (always OFF) must also include it.
	next := NextPlannableEpics(all)
	found := false
	for _, tk := range next {
		if tk.ID == "closeoutA" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("NextPlannableEpics must include closeoutA (no-await close-out); got %v", tickIDs(next))
	}
}

// TestNoCheckpointFlowsThrough_CompletedProjectStillDetected verifies that even
// when the close-out epic has no await (flows through), the project itself is
// still detected by CompletedProjectsNeedingCloseout (the two things are
// orthogonal: detection vs. gating).
func TestNoCheckpointFlowsThrough_CompletedProjectStillDetected(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	projA := tick.Tick{
		ID: "projA", Title: "Project A", Status: tick.StatusOpen,
		Type: tick.TypeTask, Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	eA1 := tick.Tick{
		ID: "eA1", Title: "Epic A1", Status: tick.StatusClosed,
		Type: tick.TypeEpic, Parent: "projA", Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	tA1 := tick.Tick{
		ID: "tA1", Title: "Task A1", Status: tick.StatusClosed,
		Type: tick.TypeTask, Parent: "eA1", Owner: "test", CreatedBy: "test",
		CreatedAt: base, UpdatedAt: base,
	}
	// No-await close-out (not inside project, so it doesn't affect leaf count).
	closeoutA := tick.Tick{
		ID: "closeoutA", Title: "close-out", Status: tick.StatusOpen,
		Type: tick.TypeEpic, Owner: "test", CreatedBy: "test",
		CreatedAt: base.Add(time.Minute), UpdatedAt: base.Add(time.Minute),
	}

	all := []tick.Tick{projA, eA1, tA1, closeoutA}

	// projA still needs closeout (its own leaves are all done, project still open).
	needsCloseout := CompletedProjectsNeedingCloseout(all)
	if len(needsCloseout) != 1 || needsCloseout[0].ID != "projA" {
		t.Errorf("CompletedProjectsNeedingCloseout: got %v, want [projA]", tickIDs(needsCloseout))
	}
}
