package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

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

// TestHandleChildlessEpicJSON exercises handleChildlessEpic JSON output via
// the exported graphJSON package-level variable, which is set during cobra
// command execution. We manipulate it directly because we are in the same
// package (package cmd).
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
		allTicks := []tick.Tick{epic}

		graphJSON = true
		defer func() { graphJSON = false }()

		// Capture stdout.
		origStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := handleChildlessEpic(nil, epic, allTicks)

		_ = w.Close()
		os.Stdout = origStdout

		var buf bytes.Buffer
		_, _ = buf.ReadFrom(r)
		_ = r.Close()

		if err != nil {
			t.Fatalf("handleChildlessEpic returned error: %v", err)
		}

		var out graphOutput
		if err := json.Unmarshal(buf.Bytes(), &out); err != nil {
			t.Fatalf("parse json: %v (raw: %s)", err, buf.String())
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
		allTicks := []tick.Tick{blocker, epic}

		graphJSON = true
		defer func() { graphJSON = false }()

		origStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := handleChildlessEpic(nil, epic, allTicks)

		_ = w.Close()
		os.Stdout = origStdout

		var buf bytes.Buffer
		_, _ = buf.ReadFrom(r)
		_ = r.Close()

		if err != nil {
			t.Fatalf("handleChildlessEpic returned error: %v", err)
		}

		var out graphOutput
		if err := json.Unmarshal(buf.Bytes(), &out); err != nil {
			t.Fatalf("parse json: %v (raw: %s)", err, buf.String())
		}

		// Blocked epic still has no children so needs_planning is true.
		if !out.NeedsPlanning {
			t.Errorf("expected NeedsPlanning=true for blocked childless epic")
		}
	})
}

// TestHandleChildlessEpicHuman verifies that human output distinguishes
// unblocked from blocked childless epics.
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

		graphJSON = false

		origStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := handleChildlessEpic(nil, epic, []tick.Tick{epic})

		_ = w.Close()
		os.Stdout = origStdout

		var buf bytes.Buffer
		_, _ = buf.ReadFrom(r)
		_ = r.Close()

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		output := buf.String()
		if !bytes.Contains([]byte(output), []byte("needs planning")) {
			t.Errorf("expected 'needs planning' in output for unblocked epic, got: %s", output)
		}
		if bytes.Contains([]byte(output), []byte("blocked")) {
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

		graphJSON = false

		origStdout := os.Stdout
		r, w, _ := os.Pipe()
		os.Stdout = w

		err := handleChildlessEpic(nil, epic, []tick.Tick{blocker, epic})

		_ = w.Close()
		os.Stdout = origStdout

		var buf bytes.Buffer
		_, _ = buf.ReadFrom(r)
		_ = r.Close()

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		output := buf.String()
		if !bytes.Contains([]byte(output), []byte("blocked")) {
			t.Errorf("expected 'blocked' in output for blocked epic, got: %s", output)
		}
		if !bytes.Contains([]byte(output), []byte("blk")) {
			t.Errorf("expected blocker id 'blk' in output, got: %s", output)
		}
		// Should NOT say "needs planning" (that's reserved for the unblocked path).
		if bytes.Contains([]byte(output), []byte("needs planning")) {
			t.Errorf("expected no 'needs planning' in blocked-path output, got: %s", output)
		}
	})
}
