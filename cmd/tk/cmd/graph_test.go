package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// captureChildlessOutput runs handleChildlessEpic with graphJSON set to
// jsonMode and returns captured stdout. We manipulate the package-level
// graphJSON flag directly because we are in the same package.
func captureChildlessOutput(t *testing.T, jsonMode bool, epic tick.Tick, allTicks []tick.Tick) string {
	t.Helper()

	prev := graphJSON
	graphJSON = jsonMode
	defer func() { graphJSON = prev }()

	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	runErr := handleChildlessEpic(epic, allTicks)

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	if runErr != nil {
		t.Fatalf("handleChildlessEpic returned error: %v", runErr)
	}
	return buf.String()
}

// TestGraphOutputStructHasNeedsPlanning verifies that the graphOutput struct
// includes the NeedsPlanning field and that it serializes correctly.
func TestGraphOutputStructHasNeedsPlanning(t *testing.T) {
	t.Run("needs_planning_true_serializes", func(t *testing.T) {
		output := graphOutput{
			Epic:          graphEpic{ID: "e1", Title: "My Epic"},
			NeedsPlanning: true,
			Stats:         graphStats{},
			CriticalPath:  0,
		}
		data, err := json.Marshal(output)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}
		var m map[string]any
		if err := json.Unmarshal(data, &m); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if m["needs_planning"] != true {
			t.Errorf("expected needs_planning=true, got %v", m["needs_planning"])
		}
	})

	t.Run("needs_planning_false_serializes", func(t *testing.T) {
		output := graphOutput{
			Epic:          graphEpic{ID: "e1", Title: "My Epic"},
			NeedsPlanning: false,
			Stats:         graphStats{TotalTasks: 3},
			CriticalPath:  1,
		}
		data, err := json.Marshal(output)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}
		var m map[string]any
		if err := json.Unmarshal(data, &m); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if m["needs_planning"] != false {
			t.Errorf("expected needs_planning=false, got %v", m["needs_planning"])
		}
		// Existing fields must still be present.
		if m["waves"] != nil {
			t.Errorf("expected waves to be nil/absent for empty output, got %v", m["waves"])
		}
		stats, ok := m["stats"].(map[string]any)
		if !ok {
			t.Fatalf("expected stats to be an object")
		}
		if stats["total_tasks"] != float64(3) {
			t.Errorf("expected total_tasks=3, got %v", stats["total_tasks"])
		}
	})
}

// TestHandleChildlessEpicJSON verifies the JSON shape. needs_planning is true
// only when the epic is plannable NOW (zero children AND unblocked) — the
// orchestration loop consumes this field to decide "plan this epic", and it
// must agree with tk next's action:plan gating.
func TestHandleChildlessEpicJSON(t *testing.T) {
	now := time.Now()

	t.Run("unblocked_childless_epic_json", func(t *testing.T) {
		epic := tick.Tick{
			ID:        "abc",
			Title:     "Unblocked Epic",
			Type:      tick.TypeEpic,
			Status:    tick.StatusOpen,
			CreatedAt: now,
			UpdatedAt: now,
		}

		raw := captureChildlessOutput(t, true, epic, []tick.Tick{epic})

		var out graphOutput
		if err := json.Unmarshal([]byte(raw), &out); err != nil {
			t.Fatalf("parse json: %v (raw: %s)", err, raw)
		}

		if !out.NeedsPlanning {
			t.Errorf("expected NeedsPlanning=true for unblocked childless epic")
		}
		if out.Epic.ID != "abc" {
			t.Errorf("expected epic id=abc, got %s", out.Epic.ID)
		}
		if len(out.Waves) != 0 {
			t.Errorf("expected empty waves for childless epic, got %v", out.Waves)
		}
	})

	t.Run("blocked_childless_epic_json", func(t *testing.T) {
		blocker := tick.Tick{
			ID:        "blk",
			Title:     "Blocker Epic",
			Type:      tick.TypeEpic,
			Status:    tick.StatusOpen,
			CreatedAt: now,
			UpdatedAt: now,
		}
		epic := tick.Tick{
			ID:        "xyz",
			Title:     "Blocked Epic",
			Type:      tick.TypeEpic,
			Status:    tick.StatusOpen,
			BlockedBy: []string{"blk"},
			CreatedAt: now,
			UpdatedAt: now,
		}

		raw := captureChildlessOutput(t, true, epic, []tick.Tick{blocker, epic})

		var out graphOutput
		if err := json.Unmarshal([]byte(raw), &out); err != nil {
			t.Fatalf("parse json: %v (raw: %s)", err, raw)
		}

		// A blocked childless epic is NOT plannable now: needs_planning must be
		// false so it agrees with tk next's action:plan gating.
		if out.NeedsPlanning {
			t.Errorf("expected NeedsPlanning=false for blocked childless epic")
		}
	})

	t.Run("all_closed_children_epic_json", func(t *testing.T) {
		epic := tick.Tick{
			ID:        "fin",
			Title:     "Finished Epic",
			Type:      tick.TypeEpic,
			Status:    tick.StatusOpen,
			CreatedAt: now,
			UpdatedAt: now,
		}
		child := tick.Tick{
			ID:        "c1",
			Title:     "Done Task",
			Type:      tick.TypeTask,
			Status:    tick.StatusClosed,
			Parent:    "fin",
			CreatedAt: now,
			UpdatedAt: now,
		}

		raw := captureChildlessOutput(t, true, epic, []tick.Tick{epic, child})

		var out graphOutput
		if err := json.Unmarshal([]byte(raw), &out); err != nil {
			t.Fatalf("parse json: %v (raw: %s)", err, raw)
		}

		// Epic with (all-closed) children does not need planning — it needs closing.
		if out.NeedsPlanning {
			t.Errorf("expected NeedsPlanning=false for epic whose children are all closed")
		}
	})
}

// TestHandleChildlessEpicHuman verifies that human output distinguishes
// unblocked, blocked, and complete (all children closed) cases.
func TestHandleChildlessEpicHuman(t *testing.T) {
	now := time.Now()

	t.Run("unblocked_prints_needs_planning", func(t *testing.T) {
		epic := tick.Tick{
			ID:        "e1",
			Title:     "Unblocked Epic",
			Type:      tick.TypeEpic,
			Status:    tick.StatusOpen,
			CreatedAt: now,
			UpdatedAt: now,
		}

		output := captureChildlessOutput(t, false, epic, []tick.Tick{epic})

		if !strings.Contains(output, "needs planning") {
			t.Errorf("expected 'needs planning' in output for unblocked epic, got: %s", output)
		}
		if strings.Contains(output, "blocked") {
			t.Errorf("expected no 'blocked' mention for unblocked epic, got: %s", output)
		}
	})

	t.Run("blocked_prints_blocked_with_blocker_ids", func(t *testing.T) {
		blocker := tick.Tick{
			ID:        "blk",
			Type:      tick.TypeEpic,
			Status:    tick.StatusOpen,
			CreatedAt: now,
			UpdatedAt: now,
		}
		epic := tick.Tick{
			ID:        "e2",
			Title:     "Blocked Epic",
			Type:      tick.TypeEpic,
			Status:    tick.StatusOpen,
			BlockedBy: []string{"blk"},
			CreatedAt: now,
			UpdatedAt: now,
		}

		output := captureChildlessOutput(t, false, epic, []tick.Tick{blocker, epic})

		if !strings.Contains(output, "blocked") {
			t.Errorf("expected 'blocked' in output for blocked epic, got: %s", output)
		}
		if !strings.Contains(output, "blk") {
			t.Errorf("expected blocker id 'blk' in output, got: %s", output)
		}
		// Should NOT say "needs planning" (that's reserved for the unblocked path).
		if strings.Contains(output, "needs planning") {
			t.Errorf("expected no 'needs planning' in blocked-path output, got: %s", output)
		}
	})

	t.Run("all_closed_children_prints_complete", func(t *testing.T) {
		epic := tick.Tick{
			ID:        "e3",
			Title:     "Finished Epic",
			Type:      tick.TypeEpic,
			Status:    tick.StatusOpen,
			CreatedAt: now,
			UpdatedAt: now,
		}
		child := tick.Tick{
			ID:        "c1",
			Title:     "Done Task",
			Type:      tick.TypeTask,
			Status:    tick.StatusClosed,
			Parent:    "e3",
			CreatedAt: now,
			UpdatedAt: now,
		}

		output := captureChildlessOutput(t, false, epic, []tick.Tick{epic, child})

		if !strings.Contains(output, "complete") {
			t.Errorf("expected 'complete' in output for epic with all children closed, got: %s", output)
		}
		if !strings.Contains(output, "tk close e3") {
			t.Errorf("expected 'tk close e3' hint in output, got: %s", output)
		}
		if strings.Contains(output, "needs planning") {
			t.Errorf("expected no 'needs planning' for complete epic, got: %s", output)
		}
		if strings.Contains(output, "open blockers") {
			t.Errorf("expected no misleading 'open blockers' message for complete epic, got: %s", output)
		}
	})
}
