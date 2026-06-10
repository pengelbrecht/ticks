package cmd

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// TestCloseWithTKActorEnv verifies that TK_ACTOR env variable is used as the
// activity actor when closing a tick.
// TK_ACTOR=orchestrator tk close <id> --reason x -> activity entry actor="orchestrator"
func TestCloseWithTKActorEnv(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("a1")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "orchestrator")

	if err := ExecuteArgs([]string{"close", "a1", "--reason", "done"}); err != nil {
		t.Fatalf("ExecuteArgs close: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "a1" && a.Action == tick.ActivityClose {
			if a.Actor != "orchestrator" {
				t.Errorf("expected actor=%q, got %q", "orchestrator", a.Actor)
			}
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected close activity for tick a1; got %+v", activities)
	}
}

// TestCloseWithActorFlagOverridesTKActorEnv verifies that --actor flag overrides
// TK_ACTOR env when closing a tick.
// TK_ACTOR=orchestrator tk close <id> --actor human-pete -> actor="human-pete"
func TestCloseWithActorFlagOverridesTKActorEnv(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("a2")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "orchestrator")

	if err := ExecuteArgs([]string{"close", "a2", "--reason", "done", "--actor", "human-pete"}); err != nil {
		t.Fatalf("ExecuteArgs close: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "a2" && a.Action == tick.ActivityClose {
			if a.Actor != "human-pete" {
				t.Errorf("expected actor=%q, got %q", "human-pete", a.Actor)
			}
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected close activity for tick a2; got %+v", activities)
	}
}

// TestCloseNoActorFallsBackToOwner verifies that when neither TK_ACTOR nor
// --actor is set, the activity actor falls back to the tick owner.
// no env, no flag -> actor falls back to current behavior (tick owner)
func TestCloseNoActorFallsBackToOwner(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("a3")
	// makeTestTask sets Owner="petere"
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	// Ensure TK_ACTOR is not set
	t.Setenv("TK_ACTOR", "")

	if err := ExecuteArgs([]string{"close", "a3", "--reason", "done"}); err != nil {
		t.Fatalf("ExecuteArgs close: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "a3" && a.Action == tick.ActivityClose {
			// Owner is "petere" from makeTestTask; WriteAs("") defaults to Owner
			if a.Actor != "petere" {
				t.Errorf("expected actor=%q (tick owner), got %q", "petere", a.Actor)
			}
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected close activity for tick a3; got %+v", activities)
	}
}

// TestUpdateWithTKActorEnvOnStatusInProgress verifies that TK_ACTOR env is
// applied to the "start" activity entry when --status in_progress is used.
// TK_ACTOR set on tk update --status in_progress -> the 'start' activity entry carries the actor
func TestUpdateWithTKActorEnvOnStatusInProgress(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("a4")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "orchestrator")

	if err := ExecuteArgs([]string{"update", "a4", "--status", "in_progress"}); err != nil {
		t.Fatalf("ExecuteArgs update: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "a4" && a.Action == tick.ActivityStart {
			if a.Actor != "orchestrator" {
				t.Errorf("expected actor=%q, got %q", "orchestrator", a.Actor)
			}
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected start activity for tick a4; got %+v", activities)
	}
}

// TestApproveWithTKActorEnv verifies that TK_ACTOR env is applied to the
// activity entry written by tk approve. Note: approving a terminal awaiting
// state (approval/review/content/work) closes the tick, and detectChange gives
// status transitions priority, so the emitted entry has action="close" — the
// point here is that it carries the env actor.
func TestApproveWithTKActorEnv(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("a6")
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "orchestrator")

	if _, err := captureStdoutArgs(t, []string{"approve", "a6"}); err != nil {
		t.Fatalf("ExecuteArgs approve: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "a6" && a.Action == tick.ActivityClose {
			if a.Actor != "orchestrator" {
				t.Errorf("expected actor=%q, got %q", "orchestrator", a.Actor)
			}
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected close activity for tick a6 from tk approve; got %+v", activities)
	}
}

// TestCreateWithTKActorEnv verifies that TK_ACTOR env is applied to the
// "create" activity entry written by tk create.
func TestCreateWithTKActorEnv(t *testing.T) {
	_, store := setupTestRepo(t)
	if err := ExecuteArgs([]string{"init"}); err != nil {
		t.Fatalf("tk init: %v", err)
	}

	t.Setenv("TK_ACTOR", "orchestrator")

	out, err := captureStdoutArgs(t, []string{"create", "Actor env create test"})
	if err != nil {
		t.Fatalf("ExecuteArgs create: %v", err)
	}
	id := strings.TrimSpace(out)
	if id == "" {
		t.Fatal("expected created tick id on stdout")
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == id && a.Action == tick.ActivityCreate {
			if a.Actor != "orchestrator" {
				t.Errorf("expected actor=%q, got %q", "orchestrator", a.Actor)
			}
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected create activity for tick %s; got %+v", id, activities)
	}
}

// TestBlockWithTKActorEnv verifies that TK_ACTOR env is applied to the
// "block" activity entry written by tk block.
func TestBlockWithTKActorEnv(t *testing.T) {
	_, store := setupTestRepo(t)

	for _, id := range []string{"a7", "a8"} {
		if err := store.Write(makeTestTask(id)); err != nil {
			t.Fatalf("write tick %s: %v", id, err)
		}
	}

	t.Setenv("TK_ACTOR", "orchestrator")

	if err := ExecuteArgs([]string{"block", "a7", "a8"}); err != nil {
		t.Fatalf("ExecuteArgs block: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "a7" && a.Action == tick.ActivityBlock {
			if a.Actor != "orchestrator" {
				t.Errorf("expected actor=%q, got %q", "orchestrator", a.Actor)
			}
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected block activity for tick a7; got %+v", activities)
	}
}

// TestRejectWithTKActorEnv verifies that TK_ACTOR env is applied to the
// activity entry written by tk reject. Rejecting awaiting=approval returns the
// tick to the agent with a feedback note; detectChange surfaces this as a
// "note" activity entry, which must carry the env actor.
func TestRejectWithTKActorEnv(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("a9")
	task.SetAwaiting(tick.AwaitingApproval)
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "orchestrator")

	if _, err := captureStdoutArgs(t, []string{"reject", "a9", "needs more tests"}); err != nil {
		t.Fatalf("ExecuteArgs reject: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "a9" && a.Action == tick.ActivityNote {
			if a.Actor != "orchestrator" {
				t.Errorf("expected actor=%q, got %q", "orchestrator", a.Actor)
			}
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected note activity for tick a9 from tk reject; got %+v", activities)
	}
}

// TestUnblockWithTKActorEnv verifies that TK_ACTOR env is applied to the
// "unblock" activity entry written by tk unblock.
func TestUnblockWithTKActorEnv(t *testing.T) {
	_, store := setupTestRepo(t)

	blocker := makeTestTask("b10")
	if err := store.Write(blocker); err != nil {
		t.Fatalf("write blocker: %v", err)
	}
	task := makeTestTask("a10")
	task.BlockedBy = []string{"b10"}
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "orchestrator")

	if err := ExecuteArgs([]string{"unblock", "a10", "b10"}); err != nil {
		t.Fatalf("ExecuteArgs unblock: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "a10" && a.Action == tick.ActivityUnblock {
			if a.Actor != "orchestrator" {
				t.Errorf("expected actor=%q, got %q", "orchestrator", a.Actor)
			}
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected unblock activity for tick a10; got %+v", activities)
	}
}

// TestUpdateWithActorFlagOverridesTKActorEnv verifies that --actor on tk update
// overrides TK_ACTOR env.
func TestUpdateWithActorFlagOverridesTKActorEnv(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("a5")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	t.Setenv("TK_ACTOR", "orchestrator")

	if err := ExecuteArgs([]string{"update", "a5", "--status", "in_progress", "--actor", "agent-bob"}); err != nil {
		t.Fatalf("ExecuteArgs update: %v", err)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}

	var found bool
	for _, a := range activities {
		if a.TickID == "a5" && a.Action == tick.ActivityStart {
			if a.Actor != "agent-bob" {
				t.Errorf("expected actor=%q, got %q", "agent-bob", a.Actor)
			}
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected start activity for tick a5; got %+v", activities)
	}
}
