package cmd

import (
	"encoding/json"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// runGraphJSON runs `tk graph <epicID> --json` via ExecuteArgs and parses the
// output into graphOutput.
func runGraphJSON(t *testing.T, epicID string) graphOutput {
	t.Helper()
	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"graph", epicID, "--json"})
	})
	var parsed graphOutput
	if err := json.Unmarshal([]byte(out), &parsed); err != nil {
		t.Fatalf("parse graph json: %v\noutput: %s", err, out)
	}
	return parsed
}

// findGraphTask returns the task with the given id and the wave number it was
// placed in. ok is false if the task is not present in any wave.
func findGraphTask(out graphOutput, id string) (gt graphTask, waveNum int, ok bool) {
	for _, w := range out.Waves {
		for _, task := range w.Tasks {
			if task.ID == id {
				return task, w.Wave, true
			}
		}
	}
	return graphTask{}, 0, false
}

// TestGraphCrossEpicBlocker verifies that a task under epic A blocked by an
// open task under epic B is not agent_ready in tk graph A --json, that the
// external blocker shows up in blocked_by, and that it becomes ready once the
// external blocker closes.
func TestGraphCrossEpicBlocker(t *testing.T) {
	_, store := setupTestRepo(t)

	epicA := makeTestEpic("epa")
	epicB := makeTestEpic("epb")
	taskA := makeTestTask("ta1")
	taskA.Parent = "epa"
	taskA.BlockedBy = []string{"tb1"}
	taskB := makeTestTask("tb1")
	taskB.Parent = "epb"

	for _, tk := range []tick.Tick{epicA, epicB, taskA, taskB} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	out := runGraphJSON(t, "epa")

	gt, waveNum, ok := findGraphTask(out, "ta1")
	if !ok {
		t.Fatalf("ta1 not found in graph output: %+v", out)
	}
	if gt.AgentReady {
		t.Errorf("ta1 should not be agent_ready while external blocker tb1 is open")
	}
	blockedBy := map[string]bool{}
	for _, id := range gt.BlockedBy {
		blockedBy[id] = true
	}
	if !blockedBy["tb1"] {
		t.Errorf("ta1 blocked_by should include external blocker tb1, got %v", gt.BlockedBy)
	}
	if waveNum == 1 {
		t.Errorf("ta1 with an open external blocker must not land in wave 1, got wave %d", waveNum)
	}
	if out.Stats.ReadyForAgent != 0 {
		t.Errorf("expected ready_for_agent=0, got %d", out.Stats.ReadyForAgent)
	}

	// Close the external blocker; ta1 becomes ready in a fresh graph run.
	closed, err := store.Read("tb1")
	if err != nil {
		t.Fatalf("read tb1: %v", err)
	}
	closed.Status = tick.StatusClosed
	if err := store.Write(closed); err != nil {
		t.Fatalf("close tb1: %v", err)
	}

	out = runGraphJSON(t, "epa")
	gt, waveNum, ok = findGraphTask(out, "ta1")
	if !ok {
		t.Fatalf("ta1 not found in graph output after closing blocker: %+v", out)
	}
	if !gt.AgentReady {
		t.Errorf("ta1 should be agent_ready after external blocker tb1 closed")
	}
	if len(gt.BlockedBy) != 0 {
		t.Errorf("ta1 blocked_by should be empty after blocker closed, got %v", gt.BlockedBy)
	}
	if waveNum != 1 {
		t.Errorf("ta1 should be in wave 1 after blocker closed, got wave %d", waveNum)
	}
	if out.Stats.ReadyForAgent != 1 {
		t.Errorf("expected ready_for_agent=1, got %d", out.Stats.ReadyForAgent)
	}
}

// TestGraphCrossEpicWavePlacement verifies wave layering with a mix of an
// unblocked task and an externally blocked task: the unblocked one is in
// wave 1 (ready) and the externally blocked one in a later wave.
func TestGraphCrossEpicWavePlacement(t *testing.T) {
	_, store := setupTestRepo(t)

	epicA := makeTestEpic("epa")
	epicB := makeTestEpic("epb")
	blocked := makeTestTask("ta1")
	blocked.Parent = "epa"
	blocked.BlockedBy = []string{"tb1"}
	free := makeTestTask("tc1")
	free.Parent = "epa"
	external := makeTestTask("tb1")
	external.Parent = "epb"

	for _, tk := range []tick.Tick{epicA, epicB, blocked, free, external} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	out := runGraphJSON(t, "epa")

	if out.Stats.TotalTasks != 2 {
		t.Fatalf("expected 2 tasks (epic A only), got %d", out.Stats.TotalTasks)
	}
	if _, _, ok := findGraphTask(out, "tb1"); ok {
		t.Errorf("external blocker tb1 must not be rendered in epic A's graph")
	}

	_, freeWave, ok := findGraphTask(out, "tc1")
	if !ok || freeWave != 1 {
		t.Errorf("tc1 should be in wave 1, got wave %d (found=%v)", freeWave, ok)
	}
	_, blockedWave, ok := findGraphTask(out, "ta1")
	if !ok {
		t.Fatalf("ta1 not found in graph output")
	}
	if blockedWave <= 1 {
		t.Errorf("ta1 should be in a later wave than 1, got wave %d", blockedWave)
	}

	for _, w := range out.Waves {
		if w.Wave == 1 && !w.Ready {
			t.Errorf("wave 1 should be marked ready")
		}
		if w.Wave != 1 && w.Ready {
			t.Errorf("wave %d should not be marked ready", w.Wave)
		}
	}
	if out.Stats.ReadyForAgent != 1 {
		t.Errorf("expected ready_for_agent=1 (only tc1), got %d", out.Stats.ReadyForAgent)
	}
}

// TestGraphMissingBlockerTreatedAsClosed verifies that a blocker id that does
// not resolve to any tick is treated as closed (orphaned reference), matching
// tk ready semantics.
func TestGraphMissingBlockerTreatedAsClosed(t *testing.T) {
	_, store := setupTestRepo(t)

	epicA := makeTestEpic("epa")
	taskA := makeTestTask("ta1")
	taskA.Parent = "epa"
	taskA.BlockedBy = []string{"zzz"}

	for _, tk := range []tick.Tick{epicA, taskA} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	out := runGraphJSON(t, "epa")
	gt, waveNum, ok := findGraphTask(out, "ta1")
	if !ok {
		t.Fatalf("ta1 not found in graph output")
	}
	if !gt.AgentReady {
		t.Errorf("ta1 should be agent_ready with a missing (orphaned) blocker")
	}
	if waveNum != 1 {
		t.Errorf("ta1 should be in wave 1, got wave %d", waveNum)
	}
	if len(gt.BlockedBy) != 0 {
		t.Errorf("missing blocker should not appear in blocked_by, got %v", gt.BlockedBy)
	}
}

// TestGraphSameEpicBlockerUnchanged verifies that the existing same-epic
// blocker behavior is preserved: blocker in wave 1, dependent in wave 2.
func TestGraphSameEpicBlockerUnchanged(t *testing.T) {
	_, store := setupTestRepo(t)

	epicA := makeTestEpic("epa")
	first := makeTestTask("ta1")
	first.Parent = "epa"
	second := makeTestTask("ta2")
	second.Parent = "epa"
	second.BlockedBy = []string{"ta1"}

	for _, tk := range []tick.Tick{epicA, first, second} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	out := runGraphJSON(t, "epa")

	gt1, wave1, ok := findGraphTask(out, "ta1")
	if !ok || wave1 != 1 || !gt1.AgentReady {
		t.Errorf("ta1 should be agent_ready in wave 1, got wave %d ready=%v", wave1, gt1.AgentReady)
	}
	gt2, wave2, ok := findGraphTask(out, "ta2")
	if !ok || wave2 != 2 || gt2.AgentReady {
		t.Errorf("ta2 should be blocked in wave 2, got wave %d ready=%v", wave2, gt2.AgentReady)
	}
	if len(gt2.BlockedBy) != 1 || gt2.BlockedBy[0] != "ta1" {
		t.Errorf("ta2 blocked_by should be [ta1], got %v", gt2.BlockedBy)
	}
	if out.Stats.WaveCount != 2 || out.CriticalPath != 2 {
		t.Errorf("expected wave_count=2 and critical_path=2, got %d and %d",
			out.Stats.WaveCount, out.CriticalPath)
	}
	if out.Stats.MaxParallel != 1 {
		t.Errorf("expected max_parallel=1, got %d", out.Stats.MaxParallel)
	}
	if out.NeedsPlanning {
		t.Errorf("epic with tasks must not be needs_planning")
	}
}

// TestGraphAfterDoesNotAffectReadiness verifies that the soft-ordering After
// field is not treated as a blocker: a task with after pointing at an open
// tick is still agent_ready and in wave 1.
func TestGraphAfterDoesNotAffectReadiness(t *testing.T) {
	_, store := setupTestRepo(t)

	epicA := makeTestEpic("epa")
	epicB := makeTestEpic("epb")
	taskA := makeTestTask("ta1")
	taskA.Parent = "epa"
	taskA.After = []string{"tb1"}
	taskB := makeTestTask("tb1")
	taskB.Parent = "epb"

	for _, tk := range []tick.Tick{epicA, epicB, taskA, taskB} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	out := runGraphJSON(t, "epa")
	gt, waveNum, ok := findGraphTask(out, "ta1")
	if !ok {
		t.Fatalf("ta1 not found in graph output")
	}
	if !gt.AgentReady {
		t.Errorf("ta1 should be agent_ready: after is soft ordering, not a blocker")
	}
	if waveNum != 1 {
		t.Errorf("ta1 should be in wave 1, got wave %d", waveNum)
	}
	if len(gt.BlockedBy) != 0 {
		t.Errorf("after targets must not appear in blocked_by, got %v", gt.BlockedBy)
	}
}
