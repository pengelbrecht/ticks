package query

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func awaitingPtr(v string) *string { return &v }

// TestEpicsNeedingPlanningWithMode_Checkpoint covers the autonomous-mode
// checkpoint bypass on the planning path.
func TestEpicsNeedingPlanningWithMode_Checkpoint(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	epic := func(id, awaiting string) tick.Tick {
		tk := tick.Tick{ID: id, Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now}
		if awaiting != "" {
			tk.Awaiting = awaitingPtr(awaiting)
		}
		return tk
	}

	tests := []struct {
		name       string
		candidate  tick.Tick
		autonomous bool
		want       bool // expect the epic returned (needs planning)
	}{
		{
			name:       "checkpoint OFF gates (regression)",
			candidate:  epic("e1", tick.AwaitingCheckpoint),
			autonomous: false,
			want:       false,
		},
		{
			name:       "checkpoint ON bypassed",
			candidate:  epic("e1", tick.AwaitingCheckpoint),
			autonomous: true,
			want:       true,
		},
		{
			name:       "approval ON still gates",
			candidate:  epic("e1", tick.AwaitingApproval),
			autonomous: true,
			want:       false,
		},
		{
			name:       "input ON still gates",
			candidate:  epic("e1", tick.AwaitingInput),
			autonomous: true,
			want:       false,
		},
		{
			name:       "review ON still gates",
			candidate:  epic("e1", tick.AwaitingReview),
			autonomous: true,
			want:       false,
		},
		{
			name:       "content ON still gates",
			candidate:  epic("e1", tick.AwaitingContent),
			autonomous: true,
			want:       false,
		},
		{
			name:       "escalation ON still gates",
			candidate:  epic("e1", tick.AwaitingEscalation),
			autonomous: true,
			want:       false,
		},
		{
			name:       "work ON still gates",
			candidate:  epic("e1", tick.AwaitingWork),
			autonomous: true,
			want:       false,
		},
		{
			name:       "non-awaiting epic returned regardless of mode (off)",
			candidate:  epic("e1", ""),
			autonomous: false,
			want:       true,
		},
		{
			name:       "non-awaiting epic returned regardless of mode (on)",
			candidate:  epic("e1", ""),
			autonomous: true,
			want:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			candidates := []tick.Tick{tt.candidate}
			got := EpicsNeedingPlanningWithMode(candidates, tt.autonomous, candidates)
			if (len(got) == 1) != tt.want {
				t.Fatalf("got %d results (%v), want returned=%v", len(got), got, tt.want)
			}
		})
	}
}

// TestEpicsNeedingPlanning_DefaultMatchesOffMode confirms the non-mode entry
// point is byte-identical to the OFF path (backwards-compat contract).
func TestEpicsNeedingPlanning_DefaultMatchesOffMode(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	cp := tick.AwaitingCheckpoint
	candidates := []tick.Tick{
		{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, Awaiting: &cp, CreatedAt: now, UpdatedAt: now},
		{ID: "e2", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
	}
	def := EpicsNeedingPlanning(candidates, candidates)
	off := EpicsNeedingPlanningWithMode(candidates, false, candidates)
	if len(def) != len(off) {
		t.Fatalf("default len %d != off len %d", len(def), len(off))
	}
	for i := range def {
		if def[i].ID != off[i].ID {
			t.Fatalf("default[%d]=%s != off[%d]=%s", i, def[i].ID, i, off[i].ID)
		}
	}
	// Both must exclude the checkpoint epic (e1) and keep e2.
	if len(off) != 1 || off[0].ID != "e2" {
		t.Fatalf("OFF path should keep only e2, got %v", off)
	}
}

// TestReadyWithMode_Checkpoint covers the autonomous-mode checkpoint bypass on
// the ready path for non-epic ticks.
func TestReadyWithMode_Checkpoint(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	task := func(id, awaiting string) tick.Tick {
		tk := tick.Tick{ID: id, Type: tick.TypeTask, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now}
		if awaiting != "" {
			tk.Awaiting = awaitingPtr(awaiting)
		}
		return tk
	}

	tests := []struct {
		name       string
		candidate  tick.Tick
		autonomous bool
		want       bool
	}{
		{"checkpoint OFF gates (regression)", task("t1", tick.AwaitingCheckpoint), false, false},
		{"checkpoint ON bypassed", task("t1", tick.AwaitingCheckpoint), true, true},
		{"approval ON still gates", task("t1", tick.AwaitingApproval), true, false},
		{"escalation ON still gates", task("t1", tick.AwaitingEscalation), true, false},
		{"non-awaiting ready (off)", task("t1", ""), false, true},
		{"non-awaiting ready (on)", task("t1", ""), true, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			candidates := []tick.Tick{tt.candidate}
			got := ReadyWithMode(candidates, tt.autonomous, candidates)
			if (len(got) == 1) != tt.want {
				t.Fatalf("got %d results (%v), want returned=%v", len(got), got, tt.want)
			}
		})
	}
}

// TestReady_DefaultMatchesOffMode confirms Ready == ReadyWithMode(false).
func TestReady_DefaultMatchesOffMode(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	cp := tick.AwaitingCheckpoint
	candidates := []tick.Tick{
		{ID: "t1", Type: tick.TypeTask, Status: tick.StatusOpen, Awaiting: &cp, CreatedAt: now, UpdatedAt: now},
		{ID: "t2", Type: tick.TypeTask, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
	}
	def := Ready(candidates, candidates)
	off := ReadyWithMode(candidates, false, candidates)
	if len(def) != len(off) {
		t.Fatalf("default len %d != off len %d", len(def), len(off))
	}
	if len(off) != 1 || off[0].ID != "t2" {
		t.Fatalf("OFF path should keep only t2, got %v", off)
	}
}

// TestGatesHuman_BypassScopedToCheckpoint directly exercises the predicate to
// pin down that ONLY checkpoint is bypassed under autonomous mode.
func TestGatesHuman_BypassScopedToCheckpoint(t *testing.T) {
	for _, awaiting := range tick.ValidAwaitingValues {
		a := awaiting
		tk := tick.Tick{ID: "x", Awaiting: &a}
		// OFF: every awaiting type gates.
		if !gatesHuman(tk, false) {
			t.Fatalf("OFF: awaiting %q should gate", awaiting)
		}
		// ON: only checkpoint is bypassed.
		wantGate := awaiting != tick.AwaitingCheckpoint
		if gatesHuman(tk, true) != wantGate {
			t.Fatalf("ON: awaiting %q gate=%v, want %v", awaiting, gatesHuman(tk, true), wantGate)
		}
	}
	// Manual flag must gate in both modes.
	manual := tick.Tick{ID: "m", Manual: true}
	if !gatesHuman(manual, false) || !gatesHuman(manual, true) {
		t.Fatalf("Manual flag must gate in both modes")
	}
	// Non-awaiting tick never gates.
	none := tick.Tick{ID: "n"}
	if gatesHuman(none, false) || gatesHuman(none, true) {
		t.Fatalf("non-awaiting tick must not gate")
	}
}
