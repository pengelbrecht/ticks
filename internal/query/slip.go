package query

import (
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// SlipStatus is the derived schedule-slip signal for a tick. It is NEVER
// stored — always computed on demand from target_date and descendant status.
type SlipStatus string

const (
	// SlipOverdue means the tick has a target_date in the past AND at least one
	// open (not closed) leaf descendant. A fully-closed container past its date
	// is NOT overdue — the work landed.
	SlipOverdue SlipStatus = "overdue"

	// SlipOnTrack means the tick has a target_date that is today or in the future.
	SlipOnTrack SlipStatus = "on_track"

	// SlipNone means the tick has no target_date set; no signal.
	SlipNone SlipStatus = "none"
)

// Slip computes the schedule-slip signal for t over the full tick set allTicks,
// relative to the reference instant now. The caller must supply now; Slip never
// calls time.Now() so tests can be fully deterministic.
//
// Signal rules (precise-day semantics):
//   - SlipNone    — t.TargetDate is empty.
//   - SlipOnTrack — target_date >= today's date (today is on-track, not overdue).
//   - SlipOverdue — target_date < today's date AND there is at least one open
//     leaf descendant (total - closed > 0 from DescendantProgress).
//     A past-dated tick with all descendants closed is SlipOnTrack-equivalent:
//     the work landed, it just finished after the target.
//
// allTicks must be the full tick set for DescendantProgress to be accurate.
func Slip(t tick.Tick, allTicks []tick.Tick, now time.Time) SlipStatus {
	if t.TargetDate == "" {
		return SlipNone
	}

	target, err := time.Parse(tick.TargetDateLayout, t.TargetDate)
	if err != nil {
		// Malformed target_date — treat as no signal rather than panicking.
		return SlipNone
	}

	// Truncate both sides to date granularity (midnight UTC) for a day-only
	// comparison. Using time.Date with the calendar fields from now ensures we
	// compare calendar days, not wall-clock instants.
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	targetDay := time.Date(target.Year(), target.Month(), target.Day(), 0, 0, 0, 0, time.UTC)

	if !targetDay.Before(today) {
		// target_date >= today → on track.
		return SlipOnTrack
	}

	// target_date is in the past. Overdue only if there is open work remaining.
	closed, total := DescendantProgress(t, allTicks)
	if total-closed > 0 {
		return SlipOverdue
	}

	// Past-dated but all work landed — treat the same as on-track (no slip).
	return SlipOnTrack
}
