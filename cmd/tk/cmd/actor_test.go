package cmd

import (
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
