package cmd

import (
	"encoding/json"
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
			mkEpic("e1", tick.StatusOpen),        // childless → needs planning
			mkEpic("e2", tick.StatusOpen),        // has child → no
			mkTask("t1", "e2"),
			mkTask("t2", ""),                     // not an epic
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

func idsOf(ticks []tick.Tick) []string {
	ids := make([]string, len(ticks))
	for i, t := range ticks {
		ids[i] = t.ID
	}
	return ids
}
