package merge

import (
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func TestMergeLabelsBlockedBy(t *testing.T) {
	base := tick.Tick{}
	ours := tick.Tick{Labels: []string{"a", "b"}, BlockedBy: []string{"x"}}
	theirs := tick.Tick{Labels: []string{"b", "c"}, BlockedBy: []string{"y"}}

	merged := Merge(base, ours, theirs)
	if len(merged.Labels) != 3 {
		t.Fatalf("expected 3 labels, got %v", merged.Labels)
	}
	if len(merged.BlockedBy) != 2 {
		t.Fatalf("expected 2 blockers, got %v", merged.BlockedBy)
	}
}

func TestMergeStatusPriority(t *testing.T) {
	base := tick.Tick{}
	ours := tick.Tick{Status: tick.StatusOpen, Priority: 2}
	theirs := tick.Tick{Status: tick.StatusClosed, Priority: 1}

	merged := Merge(base, ours, theirs)
	if merged.Status != tick.StatusClosed {
		t.Fatalf("expected closed status, got %s", merged.Status)
	}
	if merged.Priority != 1 {
		t.Fatalf("expected priority 1, got %d", merged.Priority)
	}
}

func TestMergeNotes(t *testing.T) {
	base := tick.Tick{Notes: "base"}
	ours := tick.Tick{Notes: "base\nours"}
	theirs := tick.Tick{Notes: "base\ntheirs"}

	merged := Merge(base, ours, theirs)
	if !strings.Contains(merged.Notes, notesMergeMarker) {
		t.Fatalf("expected merge marker, got %q", merged.Notes)
	}
	if !strings.Contains(merged.Notes, "ours") || !strings.Contains(merged.Notes, "theirs") {
		t.Fatalf("expected both note entries, got %q", merged.Notes)
	}
}

func TestMergeUpdatedAt(t *testing.T) {
	base := tick.Tick{}
	older := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	newer := time.Date(2025, 1, 8, 11, 0, 0, 0, time.UTC)

	ours := tick.Tick{UpdatedAt: older}
	theirs := tick.Tick{UpdatedAt: newer}
	merged := Merge(base, ours, theirs)
	if !merged.UpdatedAt.Equal(newer) {
		t.Fatalf("expected updated_at %v, got %v", newer, merged.UpdatedAt)
	}
}
