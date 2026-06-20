package tui

import (
	"fmt"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// edit.go holds the SHARED edit functions: every mutation the TUI makes to a
// tick goes through one of these, and each one writes through the same
// store/merge path the orchestrator uses (read → mutate → WriteAs). This keeps
// the tracker the single source of truth — the detail pane and the command
// palette both call these, never touching the store directly.
//
// Each function reads the freshest copy of the tick from disk (so concurrent
// orchestrator writes are not clobbered), applies one change, stamps
// UpdatedAt, and persists via Store.WriteAs (which auto-logs the activity and
// uses an atomic rename). They return the updated Tick so callers can refresh
// their in-memory copy.
//
// actor is recorded in the activity log; the TUI passes the current owner (or
// "" to fall back to the tick's owner inside WriteAs).

// errNoStore is returned when no store path is configured (e.g. a hermetic test
// App built without fixtures). Callers surface it as a status message.
type editError string

func (e editError) Error() string { return string(e) }

const errNoStore = editError("no store path configured")

// editStore opens a store at path, returning an error if the path is empty.
func editStore(path string) (*tick.Store, error) {
	if strings.TrimSpace(path) == "" {
		return nil, errNoStore
	}
	return tick.NewStore(path), nil
}

// mutate reads the tick by id, applies fn, stamps UpdatedAt, and writes it back
// through the store. It is the common spine for every single-field edit below.
func mutate(path, actor, id string, fn func(*tick.Tick)) (tick.Tick, error) {
	store, err := editStore(path)
	if err != nil {
		return tick.Tick{}, err
	}
	t, err := store.Read(id)
	if err != nil {
		return tick.Tick{}, fmt.Errorf("read tick %s: %w", id, err)
	}
	fn(&t)
	t.UpdatedAt = time.Now().UTC()
	if err := store.WriteAs(t, actor); err != nil {
		return tick.Tick{}, fmt.Errorf("save tick %s: %w", id, err)
	}
	return t, nil
}

// SetStatus writes a new status (open / in_progress / closed) to the tick.
func editSetStatus(path, actor, id, status string) (tick.Tick, error) {
	return mutate(path, actor, id, func(t *tick.Tick) {
		t.Status = status
		// Keep the closed-at stamp coherent with the status.
		if status == tick.StatusClosed {
			if t.ClosedAt == nil {
				now := time.Now().UTC()
				t.ClosedAt = &now
			}
		} else {
			t.ClosedAt = nil
			t.ClosedReason = ""
		}
	})
}

// editClose closes the tick, recording an optional reason.
func editClose(path, actor, id, reason string) (tick.Tick, error) {
	return mutate(path, actor, id, func(t *tick.Tick) {
		t.Status = tick.StatusClosed
		now := time.Now().UTC()
		t.ClosedAt = &now
		if reason != "" {
			t.ClosedReason = reason
		}
	})
}

// editReopen reopens a closed tick.
func editReopen(path, actor, id string) (tick.Tick, error) {
	return mutate(path, actor, id, func(t *tick.Tick) {
		t.Status = tick.StatusOpen
		t.ClosedAt = nil
		t.ClosedReason = ""
	})
}

// editSetPriority writes a new priority (0..4, clamped).
func editSetPriority(path, actor, id string, priority int) (tick.Tick, error) {
	if priority < 0 {
		priority = 0
	}
	if priority > 4 {
		priority = 4
	}
	return mutate(path, actor, id, func(t *tick.Tick) {
		t.Priority = priority
	})
}

// editSetOwner reassigns the tick to a new owner.
func editSetOwner(path, actor, id, owner string) (tick.Tick, error) {
	return mutate(path, actor, id, func(t *tick.Tick) {
		t.Owner = strings.TrimSpace(owner)
	})
}

// editSetParent re-parents the tick (empty string detaches it).
func editSetParent(path, actor, id, parent string) (tick.Tick, error) {
	return mutate(path, actor, id, func(t *tick.Tick) {
		t.Parent = strings.TrimSpace(parent)
	})
}

// editSetLabels replaces the tick's label set. labels is a comma-separated
// string; each label is trimmed and empties dropped.
func editSetLabels(path, actor, id, labels string) (tick.Tick, error) {
	return mutate(path, actor, id, func(t *tick.Tick) {
		t.Labels = parseLabels(labels)
	})
}

// editSetTargetDate writes the optional ISO target date (empty clears it).
func editSetTargetDate(path, actor, id, date string) (tick.Tick, error) {
	return mutate(path, actor, id, func(t *tick.Tick) {
		t.TargetDate = strings.TrimSpace(date)
	})
}

// editAddBlocker appends a blocker id if not already present.
func editAddBlocker(path, actor, id, blockerID string) (tick.Tick, error) {
	blockerID = strings.TrimSpace(blockerID)
	return mutate(path, actor, id, func(t *tick.Tick) {
		if blockerID == "" {
			return
		}
		for _, b := range t.BlockedBy {
			if b == blockerID {
				return
			}
		}
		t.BlockedBy = append(t.BlockedBy, blockerID)
	})
}

// parseLabels splits a comma-separated label string into a trimmed slice,
// dropping empties. Returns nil for an all-empty input (so omitempty kicks in).
func parseLabels(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if v := strings.TrimSpace(part); v != "" {
			out = append(out, v)
		}
	}
	return out
}

// editApprove approves a tick that is awaiting a human decision, processing the
// verdict through the same state machine the CLI uses. It is the port of the
// old Model.doApprove write-path (read → set verdict → ProcessVerdict → write).
// Returns the updated tick, whether it closed, and an error.
//
// It is an error to approve a tick that is not awaiting human action; the
// caller surfaces the message.
func editApprove(path, actor, id string) (t tick.Tick, closed bool, err error) {
	store, err := editStore(path)
	if err != nil {
		return tick.Tick{}, false, err
	}
	t, err = store.Read(id)
	if err != nil {
		return tick.Tick{}, false, fmt.Errorf("read tick %s: %w", id, err)
	}
	if !t.IsAwaitingHuman() {
		return t, false, editError("tick is not awaiting human decision")
	}
	// Migrate legacy manual flag into the awaiting field so ProcessVerdict sees it.
	if t.Awaiting == nil && t.Manual {
		t.SetAwaiting(tick.AwaitingWork)
	}
	verdict := tick.VerdictApproved
	t.Verdict = &verdict
	t.UpdatedAt = time.Now().UTC()
	closed, err = tick.ProcessVerdict(&t)
	if err != nil {
		return t, false, fmt.Errorf("process verdict: %w", err)
	}
	if err := store.WriteAs(t, actor); err != nil {
		return t, false, fmt.Errorf("save tick %s: %w", id, err)
	}
	return t, closed, nil
}

// editReject rejects a tick that is awaiting a human decision, optionally
// appending a feedback note, then processes the verdict. Port of the old
// Model.doReject write-path. Returns the updated tick, whether it closed, and an
// error.
func editReject(path, actor, id, feedback string) (t tick.Tick, closed bool, err error) {
	store, err := editStore(path)
	if err != nil {
		return tick.Tick{}, false, err
	}
	t, err = store.Read(id)
	if err != nil {
		return tick.Tick{}, false, fmt.Errorf("read tick %s: %w", id, err)
	}
	if !t.IsAwaitingHuman() {
		return t, false, editError("tick is not awaiting human decision")
	}
	if t.Awaiting == nil && t.Manual {
		t.SetAwaiting(tick.AwaitingWork)
	}
	if feedback = strings.TrimSpace(feedback); feedback != "" {
		timestamp := time.Now().Format("2006-01-02 15:04")
		line := fmt.Sprintf("%s - [human] %s", timestamp, feedback)
		if strings.TrimSpace(t.Notes) == "" {
			t.Notes = line
		} else {
			t.Notes = strings.TrimRight(t.Notes, "\n") + "\n" + line
		}
	}
	verdict := tick.VerdictRejected
	t.Verdict = &verdict
	t.UpdatedAt = time.Now().UTC()
	closed, err = tick.ProcessVerdict(&t)
	if err != nil {
		return t, false, fmt.Errorf("process verdict: %w", err)
	}
	if err := store.WriteAs(t, actor); err != nil {
		return t, false, fmt.Errorf("save tick %s: %w", id, err)
	}
	return t, closed, nil
}
