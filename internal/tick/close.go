package tick

import (
	"fmt"
	"strings"
	"time"
)

// HandleClose processes a close request for a tick.
// If the tick has a required gate (Requires field set), it routes to human instead of closing.
// Returns (routed bool) indicating whether the tick was routed to human instead of closed.
//
// When routed:
//   - Sets Awaiting = Requires
//   - Adds note explaining work is complete, awaiting specified review
//   - Does NOT close the tick
//
// When closing:
//   - Sets Status = closed
//   - Sets ClosedAt = now
//   - Sets ClosedReason = reason
//
// The Requires field persists, so if human rejects and agent completes again,
// it will route to human again.
func HandleClose(t *Tick, reason string) (routed bool) {
	now := time.Now().UTC()

	if t.HasRequiredGate() {
		// Route to human instead of closing (also clears legacy Manual field)
		t.SetAwaiting(*t.Requires)

		// Add note explaining the routing
		note := fmt.Sprintf("Work complete, awaiting %s", *t.Requires)
		timestamp := now.Format("2006-01-02 15:04")
		line := fmt.Sprintf("%s - %s", timestamp, note)
		if strings.TrimSpace(t.Notes) == "" {
			t.Notes = line
		} else {
			t.Notes = strings.TrimRight(t.Notes, "\n") + "\n" + line
		}

		t.UpdatedAt = now
		return true
	}

	// Normal close logic
	t.Status = StatusClosed
	t.ClosedAt = &now
	t.ClosedReason = strings.TrimSpace(reason)
	t.StartedAt = nil // Clear started timestamp on close
	t.UpdatedAt = now
	return false
}
