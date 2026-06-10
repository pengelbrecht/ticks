package query

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// makeEpic is a test helper for creating minimal valid epic ticks.
func makeEpic(id, title, status string) tick.Tick {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return tick.Tick{
		ID:        id,
		Title:     title,
		Status:    status,
		Type:      tick.TypeEpic,
		Owner:     "test",
		CreatedBy: "test",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// makeTask is a test helper for creating minimal valid task ticks.
func makeTask(id, parentID, status string) tick.Tick {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return tick.Tick{
		ID:        id,
		Title:     "task " + id,
		Status:    status,
		Type:      tick.TypeTask,
		Parent:    parentID,
		Owner:     "test",
		CreatedBy: "test",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// flatWaves returns [wave0-ids, wave1-ids, ...] for easy assertion.
func flatWaves(r Roadmap) [][]string {
	out := make([][]string, len(r.Waves))
	for i, w := range r.Waves {
		ids := make([]string, len(w))
		for j, re := range w {
			ids[j] = re.ID
		}
		out[i] = ids
	}
	return out
}

// findEpic returns the RoadmapEpic for the given id, or panics.
func findEpic(r Roadmap, id string) RoadmapEpic {
	for _, w := range r.Waves {
		for _, re := range w {
			if re.ID == id {
				return re
			}
		}
	}
	panic("epic not found: " + id)
}

func TestRoadmap(t *testing.T) {
	awaiting := tick.AwaitingApproval

	tests := []struct {
		name string
		// Input ticks
		ticks []tick.Tick
		// Expected: number of waves
		wantWaves int
		// Expected: wave contents (nil = don't check)
		wantWaveIDs [][]string
		// Expected statuses per epic id (nil = don't check)
		wantStatuses map[string]string
		// Expected awaiting_type per epic id (nil = don't check)
		wantAwaitingTypes map[string]string
		// Expected blocked_by per epic id (nil = don't check)
		wantBlockedBy map[string][]string
		// Expected children counts per epic id (nil = don't check)
		wantChildrenTotal  map[string]int
		wantChildrenClosed map[string]int
	}{
		{
			name:      "empty input returns no waves",
			ticks:     nil,
			wantWaves: 0,
		},
		{
			name: "no epics returns no waves",
			ticks: []tick.Tick{
				makeTask("t1", "", tick.StatusOpen),
			},
			wantWaves: 0,
		},
		{
			name: "linear 3-epic chain: closed -> in_progress -> open blocked",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Foundation", tick.StatusClosed)
				e2 := makeEpic("e2", "Core", tick.StatusInProgress)
				e2.BlockedBy = []string{"e1"}
				e3 := makeEpic("e3", "Extension", tick.StatusOpen)
				e3.BlockedBy = []string{"e2"}
				return []tick.Tick{e1, e2, e3}
			}(),
			wantWaves:   3,
			wantWaveIDs: [][]string{{"e1"}, {"e2"}, {"e3"}},
			wantStatuses: map[string]string{
				"e1": epicStatusDone,
				"e2": epicStatusActive,
				"e3": epicStatusQueued,
			},
		},
		{
			name: "childless unblocked open epic -> ready",
			ticks: []tick.Tick{
				makeEpic("e1", "Solo", tick.StatusOpen),
			},
			wantWaves:   1,
			wantWaveIDs: [][]string{{"e1"}},
			wantStatuses: map[string]string{
				"e1": epicStatusReady,
			},
		},
		{
			name: "gated epic is gated even if also unblocked",
			ticks: func() []tick.Tick {
				e := makeEpic("e1", "Gated", tick.StatusOpen)
				e.Awaiting = &awaiting
				return []tick.Tick{e}
			}(),
			wantWaves: 1,
			wantStatuses: map[string]string{
				"e1": epicStatusGated,
			},
			wantAwaitingTypes: map[string]string{
				"e1": tick.AwaitingApproval,
			},
		},
		{
			name: "gated epic blocked by open epic is still gated (gated takes priority)",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Blocker", tick.StatusOpen)
				e2 := makeEpic("e2", "Gated", tick.StatusOpen)
				e2.BlockedBy = []string{"e1"}
				e2.Awaiting = &awaiting
				return []tick.Tick{e1, e2}
			}(),
			wantWaves: 2,
			wantStatuses: map[string]string{
				"e1": epicStatusReady,
				"e2": epicStatusGated,
			},
		},
		{
			name: "diamond dependency: correct waves",
			// e1 <- e2 \
			//           -> e4
			// e1 <- e3 /
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Root", tick.StatusClosed)
				e2 := makeEpic("e2", "Left", tick.StatusOpen)
				e2.BlockedBy = []string{"e1"}
				e3 := makeEpic("e3", "Right", tick.StatusOpen)
				e3.BlockedBy = []string{"e1"}
				e4 := makeEpic("e4", "Leaf", tick.StatusOpen)
				e4.BlockedBy = []string{"e2", "e3"}
				return []tick.Tick{e1, e2, e3, e4}
			}(),
			wantWaves:   3,
			wantWaveIDs: [][]string{{"e1"}, {"e2", "e3"}, {"e4"}},
			wantStatuses: map[string]string{
				"e1": epicStatusDone,
				"e2": epicStatusReady,
				"e3": epicStatusReady,
				"e4": epicStatusQueued,
			},
		},
		{
			name: "epic blocked by missing id is treated as unblocked",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Orphan", tick.StatusOpen)
				e1.BlockedBy = []string{"missing-id"}
				return []tick.Tick{e1}
			}(),
			wantWaves: 1,
			wantStatuses: map[string]string{
				"e1": epicStatusReady,
			},
			wantBlockedBy: map[string][]string{
				// missing-id is not an epic → not included in BlockedBy
				"e1": nil,
			},
		},
		{
			name: "task-level blockers are ignored for epic chain",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Epic", tick.StatusOpen)
				e1.BlockedBy = []string{"t1"} // t1 is a task, not an epic
				t1 := makeTask("t1", "", tick.StatusOpen)
				return []tick.Tick{e1, t1}
			}(),
			wantWaves: 1,
			wantStatuses: map[string]string{
				"e1": epicStatusReady,
			},
			wantBlockedBy: map[string][]string{
				"e1": nil, // task blocker not surfaced
			},
		},
		{
			name: "children progress counts correct with mixed statuses",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Epic", tick.StatusInProgress)
				t1 := makeTask("t1", "e1", tick.StatusClosed)
				t2 := makeTask("t2", "e1", tick.StatusClosed)
				t3 := makeTask("t3", "e1", tick.StatusOpen)
				t4 := makeTask("t4", "e1", tick.StatusInProgress)
				return []tick.Tick{e1, t1, t2, t3, t4}
			}(),
			wantWaves: 1,
			wantStatuses: map[string]string{
				"e1": epicStatusActive,
			},
			wantChildrenTotal: map[string]int{
				"e1": 4,
			},
			wantChildrenClosed: map[string]int{
				"e1": 2,
			},
		},
		{
			name: "open epic with all-closed children is active (needs closing, not planning)",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Almost done", tick.StatusOpen)
				t1 := makeTask("t1", "e1", tick.StatusClosed)
				t2 := makeTask("t2", "e1", tick.StatusClosed)
				return []tick.Tick{e1, t1, t2}
			}(),
			wantWaves: 1,
			wantStatuses: map[string]string{
				"e1": epicStatusActive,
			},
			wantChildrenTotal: map[string]int{
				"e1": 2,
			},
			wantChildrenClosed: map[string]int{
				"e1": 2,
			},
		},
		{
			name: "in_progress epic with children is active",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Running", tick.StatusInProgress)
				t1 := makeTask("t1", "e1", tick.StatusOpen)
				return []tick.Tick{e1, t1}
			}(),
			wantWaves: 1,
			wantStatuses: map[string]string{
				"e1": epicStatusActive,
			},
		},
		{
			name: "closed epic is done regardless of children state",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Done epic", tick.StatusClosed)
				t1 := makeTask("t1", "e1", tick.StatusOpen) // stale open child
				return []tick.Tick{e1, t1}
			}(),
			wantWaves: 1,
			wantStatuses: map[string]string{
				"e1": epicStatusDone,
			},
		},
		{
			name: "only epic children are counted (task children only)",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Parent", tick.StatusOpen)
				// e2 is an epic child of e1
				e2 := makeEpic("e2", "Child epic", tick.StatusClosed)
				e2.Parent = "e1"
				t1 := makeTask("t1", "e1", tick.StatusOpen)
				return []tick.Tick{e1, e2, t1}
			}(),
			wantWaves: 1,
			// e2 is a child of e1 so e1 has children → active
			wantStatuses: map[string]string{
				"e1": epicStatusActive,
			},
			wantChildrenTotal: map[string]int{
				"e1": 2, // e2 + t1
			},
			wantChildrenClosed: map[string]int{
				"e1": 1, // e2 is closed
			},
		},
		{
			name: "non-epic ticks are not nodes in the roadmap",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "Epic 1", tick.StatusOpen)
				t1 := makeTask("t1", "", tick.StatusOpen)
				return []tick.Tick{e1, t1}
			}(),
			wantWaves:   1,
			wantWaveIDs: [][]string{{"e1"}},
		},
		{
			name: "multiple independent epics are in the same wave",
			ticks: func() []tick.Tick {
				e1 := makeEpic("e1", "A", tick.StatusOpen)
				e2 := makeEpic("e2", "B", tick.StatusOpen)
				e3 := makeEpic("e3", "C", tick.StatusClosed)
				return []tick.Tick{e1, e2, e3}
			}(),
			wantWaves:   1,
			wantWaveIDs: [][]string{{"e1", "e2", "e3"}},
		},
		{
			name: "waves are sorted by ID within wave",
			ticks: func() []tick.Tick {
				// Insert in reverse alphabetical order to verify sorting.
				e3 := makeEpic("e3", "C", tick.StatusOpen)
				e1 := makeEpic("e1", "A", tick.StatusOpen)
				e2 := makeEpic("e2", "B", tick.StatusOpen)
				return []tick.Tick{e3, e1, e2}
			}(),
			wantWaves:   1,
			wantWaveIDs: [][]string{{"e1", "e2", "e3"}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ComputeRoadmap(tt.ticks)

			// Check wave count.
			if got.Waves == nil && tt.wantWaves == 0 {
				// Both empty — OK.
			} else if len(got.Waves) != tt.wantWaves {
				t.Errorf("wave count = %d, want %d; waves = %v", len(got.Waves), tt.wantWaves, flatWaves(got))
			}

			// Check wave contents.
			if tt.wantWaveIDs != nil {
				fw := flatWaves(got)
				if len(fw) != len(tt.wantWaveIDs) {
					t.Fatalf("wave count mismatch: got %v, want %v", fw, tt.wantWaveIDs)
				}
				for i, wantIDs := range tt.wantWaveIDs {
					if len(fw[i]) != len(wantIDs) {
						t.Errorf("wave[%d] ids = %v, want %v", i, fw[i], wantIDs)
						continue
					}
					for j, id := range wantIDs {
						if fw[i][j] != id {
							t.Errorf("wave[%d][%d] = %q, want %q", i, j, fw[i][j], id)
						}
					}
				}
			}

			// Check statuses.
			for id, wantStatus := range tt.wantStatuses {
				re := findEpic(got, id)
				if re.Status != wantStatus {
					t.Errorf("epic %q status = %q, want %q", id, re.Status, wantStatus)
				}
			}

			// Check awaiting types.
			for id, wantType := range tt.wantAwaitingTypes {
				re := findEpic(got, id)
				if re.AwaitingType != wantType {
					t.Errorf("epic %q awaiting_type = %q, want %q", id, re.AwaitingType, wantType)
				}
			}

			// Check blocked_by (epic IDs only).
			for id, wantBlockedBy := range tt.wantBlockedBy {
				re := findEpic(got, id)
				gotBB := re.BlockedBy
				if len(gotBB) == 0 && len(wantBlockedBy) == 0 {
					continue
				}
				if len(gotBB) != len(wantBlockedBy) {
					t.Errorf("epic %q blocked_by = %v, want %v", id, gotBB, wantBlockedBy)
					continue
				}
				bbSet := make(map[string]bool)
				for _, b := range wantBlockedBy {
					bbSet[b] = true
				}
				for _, b := range gotBB {
					if !bbSet[b] {
						t.Errorf("epic %q unexpected blocker %q in blocked_by %v", id, b, gotBB)
					}
				}
			}

			// Check children totals.
			for id, wantTotal := range tt.wantChildrenTotal {
				re := findEpic(got, id)
				if re.ChildrenTotal != wantTotal {
					t.Errorf("epic %q children_total = %d, want %d", id, re.ChildrenTotal, wantTotal)
				}
			}

			// Check children closed counts.
			for id, wantClosed := range tt.wantChildrenClosed {
				re := findEpic(got, id)
				if re.ChildrenClosed != wantClosed {
					t.Errorf("epic %q children_closed = %d, want %d", id, re.ChildrenClosed, wantClosed)
				}
			}
		})
	}
}
