package cmd

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// ---------------------------------------------------------------------------
// Scenario 1 — Project-less regression via tk next (CLI level)
//
// A flat epic roadmap (no project containers) drives `tk next --epic` exactly
// as before. The selection sequence must match EpicsNeedingPlanning +
// SortBySoftOrderPriorityCreatedAt (pre-project behaviour).
// ---------------------------------------------------------------------------

// TestContinuation_ProjectlessRegression_TkNext verifies that on a flat roadmap
// without any project containers, `tk next --epic` returns the right epic in
// priority order and respects both hard (blocked_by) and soft (after) ordering
// — unchanged from the pre-project path.
//
// Fixture:
//
//	eA (open, priority 2, no constraints)               ← should win: lowest priority#
//	eB (open, priority 3, after: eA → soft-deferred)    ← sorted last among p3 tier
//	eC (open, priority 3, no constraints)                ← sorted before soft-deferred eB
//	eD (open, priority 2, blocked_by eA — open blocker) ← excluded (hard block)
//
// We verify the selection order across a single fixture snapshot (all epics open).
// The key assertion: eA wins first (lowest priority number, unblocked, undeferred);
// and among the remaining p3 candidates, eC sorts before eB because eB is
// soft-deferred behind the open eA.
func TestContinuation_ProjectlessRegression_TkNext(t *testing.T) {
	_, store := setupTestRepo(t)
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	eA := makeNextEpic("eA", "petere", now)
	eA.Priority = 2

	eB := makeNextEpic("eB", "petere", now.Add(time.Minute))
	eB.Priority = 3
	eB.After = []string{"eA"} // soft-deferred: eA still open

	eC := makeNextEpic("eC", "petere", now.Add(2*time.Minute))
	eC.Priority = 3 // same as eB, no soft-defer → wins over eB

	eD := makeNextEpic("eD", "petere", now.Add(3*time.Minute))
	eD.Priority = 2
	eD.BlockedBy = []string{"eA"} // hard-blocked by open eA → excluded from planning

	for _, tk := range []tick.Tick{eA, eB, eC, eD} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	// First call: eA must win (lowest priority number, unblocked, undeferred, childless).
	got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json")
	if got == nil {
		t.Fatal("projectless regression: expected a result, got null")
	}
	if got["id"] != "eA" {
		t.Errorf("first selection: got %v, want eA (priority 2, unblocked, undeferred)", got["id"])
	}
	if got["action"] != "plan" {
		t.Errorf("first selection action: got %v, want plan", got["action"])
	}

	// Now verify soft-order: close eA and eD's blocker to isolate soft-order
	// between eB (soft-deferred after eA) and eC (no soft-defer). We close eA
	// so it's no longer a soft-defer target and eD's blocker is resolved.
	eA.Status = tick.StatusClosed
	eD.BlockedBy = nil // clear to make eD available and test against eC priority tie
	if err := store.Write(eA); err != nil {
		t.Fatalf("close eA: %v", err)
	}
	if err := store.Write(eD); err != nil {
		t.Fatalf("update eD: %v", err)
	}

	// With eA closed: eB is no longer soft-deferred (its after-target is closed).
	// eC and eB are both p3; eD is p2. eD must win (lower priority number).
	got = runNextJSON(t, "next", "--epic", "--owner", "petere", "--json")
	if got == nil {
		t.Fatal("projectless regression after eA close: expected a result, got null")
	}
	if got["id"] != "eD" {
		t.Errorf("after eA close: got %v, want eD (priority 2 beats eB/eC at priority 3)", got["id"])
	}
	if got["action"] != "plan" {
		t.Errorf("after eA close: action got %v, want plan", got["action"])
	}
}

// TestContinuation_ProjectlessRegression_SoftDeferSorting verifies the soft-order
// sorting property of `tk next --epic` in isolation: among epics of equal priority,
// one with an open after-target sorts behind one without. No project containers
// are involved — this is a backwards-compat check on the flat path.
func TestContinuation_ProjectlessRegression_SoftDeferSorting(t *testing.T) {
	_, store := setupTestRepo(t)
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	// eTarget is the after-target; it stays open throughout.
	eTarget := makeNextEpic("eTarget", "other-agent", now)
	eTarget.Status = tick.StatusInProgress // claimed by someone else

	// eSoftDeferred prefers eTarget to run first but is not hard-blocked.
	eSoftDeferred := makeNextEpic("eSoftDeferred", "petere", now.Add(time.Minute))
	eSoftDeferred.Priority = 2
	eSoftDeferred.After = []string{"eTarget"}

	// eFree is undeferred, same priority.
	eFree := makeNextEpic("eFree", "petere", now.Add(2*time.Minute))
	eFree.Priority = 2

	for _, tk := range []tick.Tick{eTarget, eSoftDeferred, eFree} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	// eFree must win because eSoftDeferred is soft-deferred behind the open eTarget.
	got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json")
	if got == nil {
		t.Fatal("soft-defer sorting: expected a result, got null")
	}
	if got["id"] != "eFree" {
		t.Errorf("soft-defer: got %v, want eFree (eSoftDeferred yields to open eTarget)", got["id"])
	}
	if got["action"] != "plan" {
		t.Errorf("soft-defer: action got %v, want plan", got["action"])
	}
}

// ---------------------------------------------------------------------------
// Scenario 2 (CLI) — Project completion + checkpoint halt via tk next
//
// With autonomous-mode OFF (no flag, no config), a checkpoint-awaiting closeout
// epic gates planning past the boundary.
// ---------------------------------------------------------------------------

// TestContinuation_CheckpointHalts_TkNext verifies that `tk next --epic`
// returns null when the only plannable epic is awaiting: checkpoint with
// autonomous mode OFF (default), and surfaces it with --autonomous.
//
// Fixture:
//
//	eProject (epic, closed — satisfies blocked_by for closeout)
//	closeoutEpic (epic, open, awaiting:checkpoint) ← gates without --autonomous
func TestContinuation_CheckpointHalts_TkNext(t *testing.T) {
	_, store := setupTestRepo(t)
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	eProject := makeNextEpic("eProject", "petere", now)
	eProject.Status = tick.StatusClosed

	closeout := makeNextEpic("closeoutEpic", "petere", now.Add(time.Minute))
	closeout.BlockedBy = []string{"eProject"} // eProject is closed → not blocking
	awaitCP := tick.AwaitingCheckpoint
	closeout.Awaiting = &awaitCP

	for _, tk := range []tick.Tick{eProject, closeout} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	// Autonomous OFF (default): checkpoint gates.
	off := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json")
	if off != nil {
		t.Fatalf("autonomous OFF: checkpoint must halt planning; got %v", off)
	}

	// Autonomous ON via flag: checkpoint bypassed → closeout surfaces.
	on := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json", "--autonomous")
	if on == nil {
		t.Fatal("autonomous ON: expected closeoutEpic to surface, got null")
	}
	if on["id"] != "closeoutEpic" {
		t.Errorf("autonomous ON: id got %v, want closeoutEpic", on["id"])
	}
	if on["action"] != "plan" {
		t.Errorf("autonomous ON: action got %v, want plan", on["action"])
	}
}

// ---------------------------------------------------------------------------
// Scenario 3 (CLI) — Autonomous mode: non-checkpoint await still gates
// ---------------------------------------------------------------------------

// TestContinuation_AutonomousMode_NonCheckpointGates verifies via `tk next
// --epic --autonomous` that awaiting: approval still gates even when the
// autonomous flag is set. A co-present no-await epic must be returned instead.
//
// Fixture:
//
//	eApproval (epic, open, awaiting:approval) ← must NOT surface with --autonomous
//	eFree (epic, open, no constraints)         ← must surface
func TestContinuation_AutonomousMode_NonCheckpointGates(t *testing.T) {
	_, store := setupTestRepo(t)
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	eApproval := makeNextEpic("eApproval", "petere", now)
	awaitApproval := tick.AwaitingApproval
	eApproval.Awaiting = &awaitApproval

	eFree := makeNextEpic("eFree", "petere", now.Add(time.Minute))

	for _, tk := range []tick.Tick{eApproval, eFree} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json", "--autonomous")
	if got == nil {
		t.Fatal("expected eFree to surface with autonomous ON, got null")
	}
	if got["id"] != "eFree" {
		t.Errorf("autonomous ON: got id=%v, want eFree (approval epic must still gate)", got["id"])
	}
	if got["action"] != "plan" {
		t.Errorf("autonomous ON: action got %v, want plan", got["action"])
	}
}

// TestContinuation_AutonomousMode_OnlyApprovalEpic verifies that when the
// only candidate is an approval-awaiting epic, `tk next --epic --autonomous`
// returns null (nothing bypassed).
func TestContinuation_AutonomousMode_OnlyApprovalEpic(t *testing.T) {
	_, store := setupTestRepo(t)
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	eApproval := makeNextEpic("eApproval", "petere", now)
	awaitApproval := tick.AwaitingApproval
	eApproval.Awaiting = &awaitApproval

	if err := store.Write(eApproval); err != nil {
		t.Fatalf("write eApproval: %v", err)
	}

	got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json", "--autonomous")
	if got != nil {
		t.Errorf("autonomous ON with approval-only: must return null; got %v", got)
	}
}

// ---------------------------------------------------------------------------
// Scenario 4 (CLI) — No-checkpoint close-out flows through with mode OFF
// ---------------------------------------------------------------------------

// TestContinuation_NoCheckpointFlowsThrough_TkNext verifies that a project
// close-out epic with NO awaiting state is returned as plannable by
// `tk next --epic` even with autonomous mode OFF (default). A plain open
// childless epic is no different from the pre-project path.
//
// Fixture:
//
//	eDone (epic, closed — represents completed project work)
//	closeoutFree (epic, open, childless, no awaiting) ← must surface in OFF mode
func TestContinuation_NoCheckpointFlowsThrough_TkNext(t *testing.T) {
	_, store := setupTestRepo(t)
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	eDone := makeNextEpic("eDone", "petere", now)
	eDone.Status = tick.StatusClosed

	closeoutFree := makeNextEpic("closeoutFree", "petere", now.Add(time.Minute))
	// No Awaiting — this is the no-checkpoint path (flows through).

	for _, tk := range []tick.Tick{eDone, closeoutFree} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	// autonomous OFF (default — no flag, no config): must surface.
	got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json")
	if got == nil {
		t.Fatal("no-checkpoint close-out: must surface in OFF mode, got null")
	}
	if got["id"] != "closeoutFree" {
		t.Errorf("no-checkpoint: id got %v, want closeoutFree", got["id"])
	}
	if got["action"] != "plan" {
		t.Errorf("no-checkpoint: action got %v, want plan", got["action"])
	}
}
