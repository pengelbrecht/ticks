package tick

import "time"

// ProcessVerdict processes a verdict on an awaiting tick and returns whether the tick was closed.
// This is the core state machine for agent-human workflow.
//
// Logic:
//   - Terminal states (work, approval, review, content): close on approved
//   - Non-terminal states (input, escalation): close on rejected (can't/won't proceed)
//   - Checkpoint: never closes, always returns to agent
//
// After processing, Awaiting and Verdict are cleared regardless of outcome.
func ProcessVerdict(t *Tick) (closed bool, err error) {
	if t.Verdict == nil || t.Awaiting == nil {
		return false, nil // No-op
	}

	shouldClose := false

	switch *t.Awaiting {
	case AwaitingWork:
		// Human completed work
		shouldClose = (*t.Verdict == VerdictApproved)
	case AwaitingApproval, AwaitingReview, AwaitingContent:
		// Terminal states - approved means done
		shouldClose = (*t.Verdict == VerdictApproved)
	case AwaitingInput:
		// Approved = answer provided, continue; Rejected = can't proceed
		shouldClose = (*t.Verdict == VerdictRejected)
	case AwaitingEscalation:
		// Approved = direction given, continue; Rejected = won't do
		shouldClose = (*t.Verdict == VerdictRejected)
	case AwaitingCheckpoint:
		// Never closes - always back to agent
		shouldClose = false
	}

	// Clear awaiting state (also clears legacy Manual field)
	t.ClearAwaiting()

	// Clear verdict only if not closing - preserve verdict on closed ticks for audit trail
	if !shouldClose {
		t.Verdict = nil
	}

	if shouldClose {
		t.Status = StatusClosed
		now := time.Now()
		t.ClosedAt = &now
	}

	return shouldClose, nil
}
