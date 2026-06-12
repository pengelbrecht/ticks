package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// mkTick is a helper that creates a minimal tick for testing.
func mkTick(id, typ, status string, priority int) tick.Tick {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	return tick.Tick{
		ID:        id,
		Type:      typ,
		Status:    status,
		Priority:  priority,
		Title:     "Test: " + id,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// TestNextOutputJSONFlattening verifies that nextOutput marshals with the action
// key alongside all tick fields (embedded struct flattening), and that an existing
// consumer that decodes into a plain tick.Tick still works (extra key is ignored).
func TestNextOutputJSONFlattening(t *testing.T) {
	t.Run("implement action has action key and tick fields", func(t *testing.T) {
		tk := mkTick("abc", tick.TypeTask, tick.StatusOpen, 1)
		out := nextOutput{Tick: tk, Action: "implement"}
		data, err := json.Marshal(out)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}

		// Decode into a generic map to inspect all keys
		var m map[string]any
		if err := json.Unmarshal(data, &m); err != nil {
			t.Fatalf("unmarshal to map: %v", err)
		}

		if got, ok := m["action"]; !ok || got != "implement" {
			t.Errorf("action key: got %v, want 'implement'", got)
		}
		if got, ok := m["id"]; !ok || got != "abc" {
			t.Errorf("id key: got %v, want 'abc'", got)
		}
		if got, ok := m["type"]; !ok || got != tick.TypeTask {
			t.Errorf("type key: got %v, want %q", got, tick.TypeTask)
		}
		if got, ok := m["status"]; !ok || got != tick.StatusOpen {
			t.Errorf("status key: got %v, want %q", got, tick.StatusOpen)
		}
	})

	t.Run("plan action has action key and tick fields", func(t *testing.T) {
		tk := mkTick("e1", tick.TypeEpic, tick.StatusOpen, 2)
		out := nextOutput{Tick: tk, Action: "plan"}
		data, err := json.Marshal(out)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}

		var m map[string]any
		if err := json.Unmarshal(data, &m); err != nil {
			t.Fatalf("unmarshal to map: %v", err)
		}

		if got, ok := m["action"]; !ok || got != "plan" {
			t.Errorf("action key: got %v, want 'plan'", got)
		}
		if got, ok := m["id"]; !ok || got != "e1" {
			t.Errorf("id key: got %v, want 'e1'", got)
		}
	})

	t.Run("await action has action key and tick fields (awaiting path)", func(t *testing.T) {
		tk := mkTick("a1", tick.TypeTask, tick.StatusOpen, 1)
		approval := tick.AwaitingApproval
		tk.Awaiting = &approval
		out := nextOutput{Tick: tk, Action: "await"}
		data, err := json.Marshal(out)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}

		var m map[string]any
		if err := json.Unmarshal(data, &m); err != nil {
			t.Fatalf("unmarshal to map: %v", err)
		}

		if got, ok := m["action"]; !ok || got != "await" {
			t.Errorf("action key: got %v, want 'await'", got)
		}
		if got, ok := m["id"]; !ok || got != "a1" {
			t.Errorf("id key: got %v, want 'a1'", got)
		}
		if got, ok := m["awaiting"]; !ok || got != tick.AwaitingApproval {
			t.Errorf("awaiting key: got %v, want %q", got, tick.AwaitingApproval)
		}
	})

	t.Run("existing consumer decoding into tick.Tick still works (extra key ignored)", func(t *testing.T) {
		tk := mkTick("xyz", tick.TypeTask, tick.StatusOpen, 0)
		out := nextOutput{Tick: tk, Action: "implement"}
		data, err := json.Marshal(out)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}

		var decoded tick.Tick
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("unmarshal to tick.Tick: %v", err)
		}
		if decoded.ID != "xyz" {
			t.Errorf("decoded.ID = %q, want 'xyz'", decoded.ID)
		}
		if decoded.Type != tick.TypeTask {
			t.Errorf("decoded.Type = %q, want %q", decoded.Type, tick.TypeTask)
		}
	})
}

// TestSelectPlanningCandidates verifies the scoping logic extracted from runNext.
func TestSelectPlanningCandidates(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	mkEpic := func(id, status string) tick.Tick {
		return tick.Tick{ID: id, Type: tick.TypeEpic, Status: status, Title: "Epic " + id, CreatedAt: now, UpdatedAt: now}
	}
	mkTask := func(id, parent string) tick.Tick {
		return tick.Tick{ID: id, Type: tick.TypeTask, Status: tick.StatusOpen, Parent: parent, Title: "Task " + id, CreatedAt: now, UpdatedAt: now}
	}

	t.Run("EPIC_ID scope: returns the epic itself when it needs planning", func(t *testing.T) {
		epicID := "e1"
		allTicks := []tick.Tick{
			mkEpic("e1", tick.StatusOpen), // childless → needs planning
		}
		filtered := []tick.Tick{} // children of e1 (none)

		result := selectPlanningCandidates(epicID, query.Filter{Parent: epicID}, filtered, allTicks)
		if len(result) != 1 || result[0].ID != "e1" {
			t.Errorf("got %v, want [e1]", idsOf(result))
		}
	})

	t.Run("EPIC_ID scope: epic with children is not returned", func(t *testing.T) {
		epicID := "e1"
		allTicks := []tick.Tick{
			mkEpic("e1", tick.StatusOpen),
			mkTask("t1", "e1"),
		}
		filtered := []tick.Tick{mkTask("t1", "e1")}

		result := selectPlanningCandidates(epicID, query.Filter{Parent: epicID}, filtered, allTicks)
		if len(result) != 0 {
			t.Errorf("got %v, want []", idsOf(result))
		}
	})

	t.Run("global scope: returns childless epics from filtered", func(t *testing.T) {
		allTicks := []tick.Tick{
			mkEpic("e1", tick.StatusOpen), // childless → needs planning
			mkEpic("e2", tick.StatusOpen), // has child → no
			mkTask("t1", "e2"),
			mkTask("t2", ""), // not an epic
		}
		// filtered by global filter (no type restriction, so mix)
		filtered := allTicks

		result := selectPlanningCandidates("", query.Filter{}, filtered, allTicks)
		if len(result) != 1 || result[0].ID != "e1" {
			t.Errorf("got %v, want [e1]", idsOf(result))
		}
	})

	t.Run("--epic scope: uses filtered (already all epics)", func(t *testing.T) {
		allTicks := []tick.Tick{
			mkEpic("e1", tick.StatusOpen), // childless → needs planning
			mkEpic("e2", tick.StatusOpen), // childless → needs planning
		}
		filtered := allTicks // filter.Type == TypeEpic applied

		result := selectPlanningCandidates("", query.Filter{Type: tick.TypeEpic}, filtered, allTicks)
		if len(result) != 2 {
			t.Errorf("got %v, want [e1, e2]", idsOf(result))
		}
	})

	t.Run("children outside filtered are still detected via allTicks", func(t *testing.T) {
		epicID := "e1"
		allTicks := []tick.Tick{
			mkEpic("e1", tick.StatusOpen),
			mkTask("t1", "e1"), // child lives outside filtered (it's the whole universe)
		}
		filtered := []tick.Tick{} // no children returned by filter.Parent=e1 because children exist

		result := selectPlanningCandidates(epicID, query.Filter{Parent: epicID}, filtered, allTicks)
		if len(result) != 0 {
			t.Errorf("got %v, want [] (child detected via allTicks)", idsOf(result))
		}
	})
}

// TestNextAction verifies the action label for the winning tick: a childless
// unblocked epic gets "plan" even when it was selected via the ready pool;
// everything else gets "implement".
func TestNextAction(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	mkEpic := func(id, status string) tick.Tick {
		return tick.Tick{ID: id, Type: tick.TypeEpic, Status: status, Title: "Epic " + id, CreatedAt: now, UpdatedAt: now}
	}
	mkTask := func(id, parent string) tick.Tick {
		return tick.Tick{ID: id, Type: tick.TypeTask, Status: tick.StatusOpen, Parent: parent, Title: "Task " + id, CreatedAt: now, UpdatedAt: now}
	}

	t.Run("childless unblocked epic from ready pool gets plan", func(t *testing.T) {
		epic := mkEpic("e1", tick.StatusOpen)
		allTicks := []tick.Tick{epic}
		if got := nextAction(epic, allTicks); got != "plan" {
			t.Errorf("nextAction = %q, want 'plan'", got)
		}
	})

	t.Run("epic with a child gets implement", func(t *testing.T) {
		epic := mkEpic("e1", tick.StatusOpen)
		allTicks := []tick.Tick{epic, mkTask("t1", "e1")}
		if got := nextAction(epic, allTicks); got != "implement" {
			t.Errorf("nextAction = %q, want 'implement'", got)
		}
	})

	t.Run("epic with only closed children gets implement (needs closing, not planning)", func(t *testing.T) {
		epic := mkEpic("e1", tick.StatusOpen)
		child := mkTask("t1", "e1")
		child.Status = tick.StatusClosed
		allTicks := []tick.Tick{epic, child}
		if got := nextAction(epic, allTicks); got != "implement" {
			t.Errorf("nextAction = %q, want 'implement'", got)
		}
	})

	t.Run("regular task gets implement", func(t *testing.T) {
		task := mkTask("t1", "")
		allTicks := []tick.Tick{task}
		if got := nextAction(task, allTicks); got != "implement" {
			t.Errorf("nextAction = %q, want 'implement'", got)
		}
	})
}

func idsOf(ticks []tick.Tick) []string {
	ids := make([]string, len(ticks))
	for i, t := range ticks {
		ids[i] = t.ID
	}
	return ids
}

// runNextJSON executes `tk next` via ExecuteArgs with stdout captured, decoding
// the JSON result into a map. Returns nil when the command printed "null".
func runNextJSON(t *testing.T, args ...string) map[string]any {
	t.Helper()

	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	runErr := ExecuteArgs(args)

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	if runErr != nil {
		t.Fatalf("ExecuteArgs %v: %v", args, runErr)
	}

	out := strings.TrimSpace(buf.String())
	if out == "null" {
		return nil
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(out), &m); err != nil {
		t.Fatalf("unmarshal next output: %v\nraw: %s", err, out)
	}
	return m
}

// makeNextEpic returns an open childless epic for next-selection tests.
func makeNextEpic(id, owner string, createdAt time.Time) tick.Tick {
	return tick.Tick{
		ID:        id,
		Title:     "Epic " + id,
		Status:    tick.StatusOpen,
		Priority:  2,
		Type:      tick.TypeEpic,
		Owner:     owner,
		CreatedBy: owner,
		CreatedAt: createdAt,
		UpdatedAt: createdAt,
	}
}

// TestNextEpicFeasibilitySkipsQueuedAndSoftOrderNeverHides verifies the
// end-to-end soft-ordering effect: epic A is in_progress (claimed by another
// agent), B is queued behind A (blocked_by A), and C is soft-ordered after B
// (after: [B]). `tk next --epic` must skip past infeasible B and return C with
// action "plan" — soft order never hides the only feasible epic.
func TestNextEpicFeasibilitySkipsQueuedAndSoftOrderNeverHides(t *testing.T) {
	_, store := setupTestRepo(t)
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	a := makeNextEpic("eA", "other-agent", now)
	a.Status = tick.StatusInProgress
	b := makeNextEpic("eB", "petere", now.Add(time.Minute))
	b.BlockedBy = []string{"eA"}
	c := makeNextEpic("eC", "petere", now.Add(2*time.Minute))
	c.After = []string{"eB"}

	for _, tk := range []tick.Tick{a, b, c} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json")
	if got == nil {
		t.Fatal("expected a next epic, got null (soft-deferred C must not be hidden)")
	}
	if got["id"] != "eC" {
		t.Errorf("next epic id: got %v, want eC", got["id"])
	}
	if got["action"] != "plan" {
		t.Errorf("next epic action: got %v, want plan", got["action"])
	}
}

// TestNextEpicSoftDeferredSortsLast verifies that among equal-priority feasible
// epics, the one with an open after-target (C, after B) yields to the
// undeferred one (D) even though C was created earlier.
func TestNextEpicSoftDeferredSortsLast(t *testing.T) {
	_, store := setupTestRepo(t)
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	a := makeNextEpic("eA", "other-agent", now)
	a.Status = tick.StatusInProgress
	b := makeNextEpic("eB", "petere", now.Add(time.Minute))
	b.BlockedBy = []string{"eA"}
	c := makeNextEpic("eC", "petere", now.Add(2*time.Minute))
	c.After = []string{"eB"}
	d := makeNextEpic("eD", "petere", now.Add(3*time.Minute))

	for _, tk := range []tick.Tick{a, b, c, d} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	got := runNextJSON(t, "next", "--epic", "--owner", "petere", "--json")
	if got == nil {
		t.Fatal("expected a next epic, got null")
	}
	if got["id"] != "eD" {
		t.Errorf("next epic id: got %v, want eD (undeferred wins over soft-deferred eC)", got["id"])
	}
	if got["action"] != "plan" {
		t.Errorf("next epic action: got %v, want plan", got["action"])
	}
}

// TestNextTaskSoftDeferredSortsLast verifies soft ordering for the agent-mode
// task pool within an epic: t1 (after an open tick) yields to t2 despite being
// created earlier, and t1 is still returned once its after-target closes.
func TestNextTaskSoftDeferredSortsLast(t *testing.T) {
	_, store := setupTestRepo(t)
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)

	epic := makeNextEpic("e1", "petere", now)
	dep := makeTestTask("dep") // open, outside the epic
	dep.CreatedAt = now
	dep.UpdatedAt = now
	t1 := makeTestTask("t1")
	t1.Parent = "e1"
	t1.After = []string{"dep"}
	t1.CreatedAt = now.Add(time.Minute)
	t1.UpdatedAt = t1.CreatedAt
	t2 := makeTestTask("t2")
	t2.Parent = "e1"
	t2.CreatedAt = now.Add(2 * time.Minute)
	t2.UpdatedAt = t2.CreatedAt

	for _, tk := range []tick.Tick{epic, dep, t1, t2} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	got := runNextJSON(t, "next", "e1", "--owner", "petere", "--json")
	if got == nil {
		t.Fatal("expected a next task, got null")
	}
	if got["id"] != "t2" {
		t.Errorf("next task id: got %v, want t2 (t1 is soft-deferred behind open dep)", got["id"])
	}
	if got["action"] != "implement" {
		t.Errorf("next task action: got %v, want implement", got["action"])
	}

	// Close the after-target: t1 is no longer soft-deferred and wins on created_at.
	dep.Status = tick.StatusClosed
	if err := store.Write(dep); err != nil {
		t.Fatalf("close dep: %v", err)
	}

	got = runNextJSON(t, "next", "e1", "--owner", "petere", "--json")
	if got == nil {
		t.Fatal("expected a next task, got null")
	}
	if got["id"] != "t1" {
		t.Errorf("next task id after dep closed: got %v, want t1", got["id"])
	}
}
