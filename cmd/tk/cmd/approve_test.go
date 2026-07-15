package cmd

import (
	"encoding/json"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func TestApproveCheckpointJSONMatchesNonTerminalStateAndRecordsDecision(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("checkpoint-json")
	task.SetAwaiting(tick.AwaitingCheckpoint)
	if err := store.Write(task); err != nil {
		t.Fatalf("write checkpoint: %v", err)
	}

	t.Setenv("TK_ACTOR", "human-reviewer")
	out, err := captureStdoutArgs(t, []string{"approve", task.ID, "--json"})
	if err != nil {
		t.Fatalf("approve checkpoint: %v", err)
	}
	var payload struct {
		Tick   map[string]any `json:"tick"`
		Closed bool           `json:"closed"`
	}
	if err := json.Unmarshal([]byte(out), &payload); err != nil {
		t.Fatalf("parse approve JSON: %v\n%s", err, out)
	}
	if payload.Closed {
		t.Fatal("checkpoint approval must be non-terminal")
	}
	if _, exists := payload.Tick["awaiting"]; exists {
		t.Errorf("real non-terminal JSON must omit cleared awaiting: %v", payload.Tick)
	}
	if _, exists := payload.Tick["verdict"]; exists {
		t.Errorf("real non-terminal JSON must omit cleared verdict: %v", payload.Tick)
	}
	if payload.Tick["status"] == tick.StatusClosed {
		t.Errorf("checkpoint unexpectedly closed: %v", payload.Tick)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatal(err)
	}
	for _, activity := range activities {
		if activity.TickID == task.ID && activity.Action == tick.ActivityApprove {
			if activity.Actor != "human-reviewer" || activity.Data["awaiting"] != tick.AwaitingCheckpoint {
				t.Fatalf("wrong durable approval activity: %+v", activity)
			}
			return
		}
	}
	t.Fatalf("missing durable non-terminal approve activity: %+v", activities)
}

func TestCloseRequiresReturnsErrorAfterDurablyRoutingThenApproveCloses(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("requires-real")
	requires := tick.RequiresApproval
	task.Requires = &requires
	task.Status = tick.StatusInProgress
	if err := store.Write(task); err != nil {
		t.Fatal(err)
	}
	if err := ExecuteArgs([]string{"close", task.ID, "--reason", "implemented"}); err == nil {
		t.Fatal("requires close must return nonzero/error after routing")
	}
	routed, err := store.Read(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if routed.Status == tick.StatusClosed || routed.Awaiting == nil || *routed.Awaiting != tick.AwaitingApproval {
		t.Fatalf("close error did not preserve expected durable gate transition: %+v", routed)
	}
	if _, err := captureStdoutArgs(t, []string{"approve", task.ID, "--json"}); err != nil {
		t.Fatal(err)
	}
	approved, err := store.Read(task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if approved.Status != tick.StatusClosed || approved.Awaiting != nil || approved.Verdict == nil || *approved.Verdict != tick.VerdictApproved {
		t.Fatalf("terminal requires approval did not close faithfully: %+v", approved)
	}
}

func TestHumanNoteActivityHasExactHumanActorDespiteOrchestratorEnv(t *testing.T) {
	_, store := setupTestRepo(t)
	task := makeTestTask("human-note")
	if err := store.Write(task); err != nil {
		t.Fatal(err)
	}
	t.Setenv("TK_ACTOR", "pi:orchestrator")
	if err := ExecuteArgs([]string{"note", task.ID, "project-rule-evidence:0123456789abcdef PR 42 green", "--from", "human"}); err != nil {
		t.Fatal(err)
	}
	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatal(err)
	}
	for _, activity := range activities {
		if activity.TickID == task.ID && activity.Action == tick.ActivityNote {
			if activity.Actor != "human" {
				t.Fatalf("human note actor = %q, want exact human", activity.Actor)
			}
			return
		}
	}
	t.Fatalf("missing note activity: %+v", activities)
}
