package cmd

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/config"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// writeAutonomousConfig writes a .tick/config.json with policy.autonomous_mode
// set to the given value.
func writeAutonomousConfig(t *testing.T, repoDir string, on bool) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(repoDir, ".tick"), 0o755); err != nil {
		t.Fatalf("mkdir .tick: %v", err)
	}
	v := on
	cfg := config.Config{
		Version:  config.DefaultVersion,
		IDLength: config.DefaultIDLength,
		Policy:   &config.PolicyConfig{AutonomousMode: &v},
	}
	if err := config.Save(filepath.Join(repoDir, ".tick", "config.json"), cfg); err != nil {
		t.Fatalf("save config: %v", err)
	}
}

// checkpointEpic returns an open childless epic that is awaiting: checkpoint —
// a project close-out boundary that gates planning unless autonomous mode is on.
func checkpointEpic(id, awaiting string) tick.Tick {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	e := makeNextEpic(id, "petere", now)
	a := awaiting
	e.Awaiting = &a
	return e
}

// TestNextAutonomousFlagBypassesCheckpoint verifies that `tk next --autonomous`
// surfaces a checkpoint-awaiting epic (action plan), while the default run
// (autonomous off) returns null for the same fixture.
func TestNextAutonomousFlagBypassesCheckpoint(t *testing.T) {
	_, store := setupTestRepo(t)

	e := checkpointEpic("eC", tick.AwaitingCheckpoint)
	if err := store.Write(e); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	// OFF (default): checkpoint gates planning → no next.
	off := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json")
	if off != nil {
		t.Fatalf("autonomous OFF: checkpoint epic must gate, got %v", off)
	}

	// ON via flag: checkpoint bypassed → epic surfaces with action plan.
	on := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json", "--autonomous")
	if on == nil {
		t.Fatal("autonomous ON: expected checkpoint epic to surface, got null")
	}
	if on["id"] != "eC" {
		t.Errorf("autonomous ON: id got %v, want eC", on["id"])
	}
	if on["action"] != "plan" {
		t.Errorf("autonomous ON: action got %v, want plan", on["action"])
	}
}

// TestNextAutonomousFlagDoesNotBypassOtherAwaiting verifies that the bypass is
// scoped to checkpoint: an approval-awaiting epic still gates even with
// --autonomous set.
func TestNextAutonomousFlagDoesNotBypassOtherAwaiting(t *testing.T) {
	_, store := setupTestRepo(t)

	e := checkpointEpic("eA", tick.AwaitingApproval)
	if err := store.Write(e); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	on := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json", "--autonomous")
	if on != nil {
		t.Fatalf("autonomous ON must NOT bypass approval, got %v", on)
	}
}

// TestNextAutonomousFromConfig verifies the bypass is also driven by
// policy.autonomous_mode in config when the flag is not passed.
func TestNextAutonomousFromConfig(t *testing.T) {
	repoDir, store := setupTestRepo(t)
	writeAutonomousConfig(t, repoDir, true)

	e := checkpointEpic("eC", tick.AwaitingCheckpoint)
	if err := store.Write(e); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json")
	if got == nil {
		t.Fatal("config autonomous_mode=true: expected checkpoint epic to surface, got null")
	}
	if got["id"] != "eC" {
		t.Errorf("id got %v, want eC", got["id"])
	}
	if got["action"] != "plan" {
		t.Errorf("action got %v, want plan", got["action"])
	}
}

// TestNextAutonomousConfigOffRegression confirms the OFF config path leaves
// existing behavior unchanged: a checkpoint-awaiting epic still gates.
func TestNextAutonomousConfigOffRegression(t *testing.T) {
	repoDir, store := setupTestRepo(t)
	writeAutonomousConfig(t, repoDir, false)

	e := checkpointEpic("eC", tick.AwaitingCheckpoint)
	if err := store.Write(e); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json")
	if got != nil {
		t.Fatalf("config autonomous_mode=false: checkpoint epic must gate, got %v", got)
	}
}
