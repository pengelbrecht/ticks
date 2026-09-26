package cmd

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// awaiting: checkpoint is a tracker state: a boundary only a human moves past.
// The runner's way through it (tk next --autonomous, policy.autonomous_mode)
// left with the runner (epic chz); these tests pin that nothing in tk flows
// through a checkpoint any more.

// checkpointEpic returns an open childless epic awaiting the given type.
func checkpointEpic(id, awaiting string) tick.Tick {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	e := makeNextEpic(id, "petere", now)
	a := awaiting
	e.Awaiting = &a
	return e
}

func TestNextCheckpointGatesPlanning(t *testing.T) {
	_, store := setupTestRepo(t)
	if err := store.Write(checkpointEpic("eC", tick.AwaitingCheckpoint)); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	if got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json"); got != nil {
		t.Fatalf("a checkpoint epic must gate planning, got %v", got)
	}
}

// A config.json written while policy.autonomous_mode existed must still load,
// and the key must change nothing.
func TestNextIgnoresLegacyAutonomousModeConfig(t *testing.T) {
	repoDir, store := setupTestRepo(t)
	if err := os.MkdirAll(filepath.Join(repoDir, ".tick"), 0o755); err != nil {
		t.Fatalf("mkdir .tick: %v", err)
	}
	cfg := []byte(`{"version": 1, "id_length": 3, "policy": {"autonomous_mode": true}}`)
	if err := os.WriteFile(filepath.Join(repoDir, ".tick", "config.json"), cfg, 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}
	if err := store.Write(checkpointEpic("eC", tick.AwaitingCheckpoint)); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	if got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json"); got != nil {
		t.Fatalf("autonomous_mode is retired; the checkpoint must still gate, got %v", got)
	}
}

func TestNextAutonomousFlagIsGone(t *testing.T) {
	setupTestRepo(t)
	captureCmdOutput(t)
	err := ExecuteArgs([]string{"next", "--autonomous"})
	if code := GetExitCode(err); code != ExitUsage {
		t.Fatalf("tk next --autonomous: exit %d, want %d (unknown flag): %v", code, ExitUsage, err)
	}
}
