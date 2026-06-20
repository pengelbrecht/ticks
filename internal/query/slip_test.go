package query

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// fixedNow is the reference instant used throughout these tests. Using a fixed
// value makes every case deterministic — Slip never calls time.Now().
var fixedNow = time.Date(2026, 6, 20, 0, 0, 0, 0, time.UTC)

// makeTickWithDate wraps makeTick adding an optional targetDate string.
func makeTickWithDate(id, parent, status, targetDate string) tick.Tick {
	t := makeTick(id, parent, status)
	t.TargetDate = targetDate
	return t
}

// TestSlip_NoDate verifies that a tick with no target_date returns SlipNone.
func TestSlip_NoDate(t *testing.T) {
	leaf := makeTickWithDate("leaf1", "", tick.StatusOpen, "")
	allTicks := []tick.Tick{leaf}

	got := Slip(leaf, allTicks, fixedNow)
	if got != SlipNone {
		t.Errorf("Slip(no date) = %q, want %q", got, SlipNone)
	}
}

// TestSlip_FutureDate verifies that a tick with a future target_date is on-track.
func TestSlip_FutureDate(t *testing.T) {
	// fixedNow = 2026-06-20; target 2026-06-21 is in the future.
	leaf := makeTickWithDate("leaf1", "", tick.StatusOpen, "2026-06-21")
	allTicks := []tick.Tick{leaf}

	got := Slip(leaf, allTicks, fixedNow)
	if got != SlipOnTrack {
		t.Errorf("Slip(future date) = %q, want %q", got, SlipOnTrack)
	}
}

// TestSlip_TodayIsOnTrack verifies the boundary condition: target_date == today
// is on-track (not overdue).
func TestSlip_TodayIsOnTrack(t *testing.T) {
	// fixedNow = 2026-06-20; target is also 2026-06-20.
	leaf := makeTickWithDate("leaf1", "", tick.StatusOpen, "2026-06-20")
	allTicks := []tick.Tick{leaf}

	got := Slip(leaf, allTicks, fixedNow)
	if got != SlipOnTrack {
		t.Errorf("Slip(today) = %q, want %q (today must be on-track)", got, SlipOnTrack)
	}
}

// TestSlip_Overdue verifies that a past-dated tick with an open leaf descendant
// is reported as overdue.
//
// Tree: epic (e1) → task (t1 open), task (t2 closed)
// target_date = 2026-06-19 (yesterday relative to fixedNow).
func TestSlip_Overdue(t *testing.T) {
	epic := makeTickWithDate("e1", "", tick.StatusInProgress, "2026-06-19")
	t1 := makeTick("t1", "e1", tick.StatusOpen)
	t2 := makeTick("t2", "e1", tick.StatusClosed)
	allTicks := []tick.Tick{epic, t1, t2}

	got := Slip(epic, allTicks, fixedNow)
	if got != SlipOverdue {
		t.Errorf("Slip(past date + open descendant) = %q, want %q", got, SlipOverdue)
	}
}

// TestSlip_PastDateAllClosed verifies that a past-dated tick whose descendants
// are ALL closed is NOT overdue — the work landed.
//
// Tree: epic (e1) → task (t1 closed), task (t2 closed)
// target_date = 2026-06-01 (in the past).
func TestSlip_PastDateAllClosed(t *testing.T) {
	epic := makeTickWithDate("e1", "", tick.StatusClosed, "2026-06-01")
	t1 := makeTick("t1", "e1", tick.StatusClosed)
	t2 := makeTick("t2", "e1", tick.StatusClosed)
	allTicks := []tick.Tick{epic, t1, t2}

	got := Slip(epic, allTicks, fixedNow)
	if got != SlipOnTrack {
		t.Errorf("Slip(past date + all closed) = %q, want %q (work landed)", got, SlipOnTrack)
	}
}

// TestSlip_LeafOverdue verifies that a leaf tick itself (no children) with a
// past date and open status is overdue — DescendantProgress counts the leaf
// itself as the unit of work.
func TestSlip_LeafOverdue(t *testing.T) {
	leaf := makeTickWithDate("leaf1", "", tick.StatusOpen, "2026-06-19")
	allTicks := []tick.Tick{leaf}

	got := Slip(leaf, allTicks, fixedNow)
	if got != SlipOverdue {
		t.Errorf("Slip(leaf, past date, open) = %q, want %q", got, SlipOverdue)
	}
}

// TestSlip_LeafClosedPastDate verifies that a closed leaf with a past date is
// NOT overdue.
func TestSlip_LeafClosedPastDate(t *testing.T) {
	leaf := makeTickWithDate("leaf1", "", tick.StatusClosed, "2026-06-19")
	allTicks := []tick.Tick{leaf}

	got := Slip(leaf, allTicks, fixedNow)
	if got != SlipOnTrack {
		t.Errorf("Slip(leaf, past date, closed) = %q, want %q", got, SlipOnTrack)
	}
}

// TestSlip_InProgressLeafPastDate verifies that an in_progress leaf is treated
// as open (not closed) for slip purposes.
func TestSlip_InProgressLeafPastDate(t *testing.T) {
	leaf := makeTickWithDate("leaf1", "", tick.StatusInProgress, "2026-06-19")
	allTicks := []tick.Tick{leaf}

	got := Slip(leaf, allTicks, fixedNow)
	if got != SlipOverdue {
		t.Errorf("Slip(leaf, past date, in_progress) = %q, want %q", got, SlipOverdue)
	}
}
