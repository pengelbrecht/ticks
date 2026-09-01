package cmd

import (
	"os"
	"path/filepath"
	"testing"
)

// The orchestrator watchdog was dead on every run since it shipped: a WORKER is
// supervised as a side effect of being dispatched (tk herd notify enumerates the
// manifests spawn writes), but the ORCHESTRATOR was supervised only if somebody
// typed `tk herd watch` — and nothing in the codebase ever did. These tests pin
// the two halves of the fix: spawn arms it, and a bare `tk herd watch` can
// self-target from the pane herdr put it in.

func armTestRepo(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, ".tick", "logs", "herd"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	return root
}

func TestArmOrchestratorWatchUsesOwnPane(t *testing.T) {
	root := armTestRepo(t)
	t.Setenv("HERDR_PANE_ID", "w9T:p1")

	target, err := armOrchestratorWatch(root)
	if err != nil {
		t.Fatalf("arm: %v", err)
	}
	if target != "w9T:p1" {
		t.Fatalf("target = %q, want w9T:p1", target)
	}
	s, ok := loadWatchState(root)
	if !ok {
		t.Fatal("no watch state written")
	}
	if s.Target != "w9T:p1" {
		t.Fatalf("persisted target = %q", s.Target)
	}
	if s.NudgeMax != watchDefaultNudgeMax {
		t.Fatalf("nudge max = %d, want the shared default %d", s.NudgeMax, watchDefaultNudgeMax)
	}
}

// Outside a herdr pane there is no orchestrator pane to watch. Arming must be a
// silent no-op, never an error: `tk herd spawn` calls this on a path where
// failing would turn "no safety net" into "no dispatch".
func TestArmOrchestratorWatchNoPaneIsNoOp(t *testing.T) {
	root := armTestRepo(t)
	t.Setenv("HERDR_PANE_ID", "")

	target, err := armOrchestratorWatch(root)
	if err != nil {
		t.Fatalf("arm: %v", err)
	}
	if target != "" {
		t.Fatalf("target = %q, want empty", target)
	}
	if _, ok := loadWatchState(root); ok {
		t.Fatal("wrote watch state with no HERDR_PANE_ID")
	}
}

// An existing registration always wins. Re-arming on every spawn would reset the
// guard's episode memory (nudge budget, last status) mid-stall — precisely when
// it must not be reset — and would silently discard a hand-set --nudge-max.
func TestArmOrchestratorWatchNeverOverridesExisting(t *testing.T) {
	root := armTestRepo(t)
	existing := watchState{
		Target:               "orchestrator",
		RegisteredAt:         "2026-09-01T00:00:00Z",
		NudgeMax:             7,
		NudgeIntervalSeconds: 30,
		NudgeCount:           2,
		LastStatus:           "idle",
	}
	if err := saveWatchState(root, existing); err != nil {
		t.Fatalf("seed: %v", err)
	}
	t.Setenv("HERDR_PANE_ID", "w9T:p1")

	target, err := armOrchestratorWatch(root)
	if err != nil {
		t.Fatalf("arm: %v", err)
	}
	if target != "" {
		t.Fatalf("target = %q, want empty (armed nothing)", target)
	}
	s, _ := loadWatchState(root)
	if s.Target != "orchestrator" || s.NudgeMax != 7 || s.NudgeCount != 2 {
		t.Fatalf("existing registration was clobbered: %+v", s)
	}
}

func TestOrchestratorSelfTargetTrimsAndReportsAbsence(t *testing.T) {
	t.Setenv("HERDR_PANE_ID", "  w9T:p1  ")
	if got := orchestratorSelfTarget(); got != "w9T:p1" {
		t.Fatalf("got %q, want trimmed w9T:p1", got)
	}
	t.Setenv("HERDR_PANE_ID", "   ")
	if got := orchestratorSelfTarget(); got != "" {
		t.Fatalf("whitespace-only pane id became target %q", got)
	}
}
