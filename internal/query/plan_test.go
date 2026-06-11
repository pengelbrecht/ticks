package query

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func TestEpicsNeedingPlanning(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	realNow := time.Now()
	past := realNow.Add(-24 * time.Hour)
	future := realNow.Add(24 * time.Hour)
	awaiting := tick.AwaitingApproval

	tests := []struct {
		name       string
		candidates []tick.Tick
		allTicks   []tick.Tick
		wantIDs    []string
	}{
		{
			name: "open unblocked childless epic is returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: []string{"e1"},
		},
		{
			name: "epic with one open child is not returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
				{ID: "t1", Type: tick.TypeTask, Status: tick.StatusOpen, Parent: "e1", CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: nil,
		},
		{
			name: "epic with only closed children is not returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
				{ID: "t1", Type: tick.TypeTask, Status: tick.StatusClosed, Parent: "e1", CreatedAt: now, UpdatedAt: now},
				{ID: "t2", Type: tick.TypeTask, Status: tick.StatusClosed, Parent: "e1", CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: nil,
		},
		{
			name: "epic blocked by an open epic is not returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, BlockedBy: []string{"e2"}, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, BlockedBy: []string{"e2"}, CreatedAt: now, UpdatedAt: now},
				{ID: "e2", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: nil,
		},
		{
			name: "epic blocked by a closed epic is returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, BlockedBy: []string{"e2"}, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, BlockedBy: []string{"e2"}, CreatedAt: now, UpdatedAt: now},
				{ID: "e2", Type: tick.TypeEpic, Status: tick.StatusClosed, CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: []string{"e1"},
		},
		{
			name: "epic blocked by a missing blocker is returned (missing = closed)",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, BlockedBy: []string{"missing"}, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, BlockedBy: []string{"missing"}, CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: []string{"e1"},
		},
		{
			name: "in_progress epic is not returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusInProgress, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusInProgress, CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: nil,
		},
		{
			name: "awaiting epic is not returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, Awaiting: &awaiting, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, Awaiting: &awaiting, CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: nil,
		},
		{
			name: "deferred epic (future DeferUntil) is not returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, DeferUntil: &future, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, DeferUntil: &future, CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: nil,
		},
		{
			name: "deferred epic with past DeferUntil is returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, DeferUntil: &past, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, DeferUntil: &past, CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: []string{"e1"},
		},
		{
			name: "non-epic tick is not returned",
			candidates: []tick.Tick{
				{ID: "t1", Type: tick.TypeTask, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
				{ID: "b1", Type: tick.TypeBug, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
				{ID: "f1", Type: tick.TypeFeature, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "t1", Type: tick.TypeTask, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
				{ID: "b1", Type: tick.TypeBug, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
				{ID: "f1", Type: tick.TypeFeature, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: nil,
		},
		{
			name: "closed epic is not returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusClosed, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusClosed, CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: nil,
		},
		{
			name: "children outside candidates slice are still detected via allTicks",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
				// child lives outside the candidates slice
				{ID: "t1", Type: tick.TypeTask, Status: tick.StatusOpen, Parent: "e1", CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: nil,
		},
		{
			name: "multiple epics — only childless unblocked ones returned",
			candidates: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},                            // needs planning
				{ID: "e2", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},                            // has child -> no
				{ID: "e3", Type: tick.TypeEpic, Status: tick.StatusOpen, BlockedBy: []string{"e4"}, CreatedAt: now, UpdatedAt: now}, // blocked -> no
				{ID: "e4", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},                            // needs planning
			},
			allTicks: []tick.Tick{
				{ID: "e1", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
				{ID: "e2", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
				{ID: "e3", Type: tick.TypeEpic, Status: tick.StatusOpen, BlockedBy: []string{"e4"}, CreatedAt: now, UpdatedAt: now},
				{ID: "e4", Type: tick.TypeEpic, Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now},
				{ID: "t1", Type: tick.TypeTask, Status: tick.StatusOpen, Parent: "e2", CreatedAt: now, UpdatedAt: now},
			},
			wantIDs: []string{"e1", "e4"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := EpicsNeedingPlanning(tt.candidates, tt.allTicks)
			gotIDs := make([]string, len(got))
			for i, g := range got {
				gotIDs[i] = g.ID
			}

			if len(gotIDs) != len(tt.wantIDs) {
				t.Fatalf("EpicsNeedingPlanning() = %v, want %v", gotIDs, tt.wantIDs)
			}

			wantSet := make(map[string]bool, len(tt.wantIDs))
			for _, id := range tt.wantIDs {
				wantSet[id] = true
			}
			for _, id := range gotIDs {
				if !wantSet[id] {
					t.Fatalf("unexpected id %q in result %v, want %v", id, gotIDs, tt.wantIDs)
				}
			}
		})
	}
}
