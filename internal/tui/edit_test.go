package tui

import (
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// seedAwaitingTick writes a single tick into a temp .tick/ store and returns the
// store path. The tick is awaiting approval behind an approval gate so
// approve/reject exercise the full ProcessVerdict path.
func seedEditTick(t *testing.T, mut func(*tick.Tick)) (string, tick.Tick) {
	t.Helper()
	tk := validFixture("e1a", "editable tick", tick.StatusOpen, 2)
	if mut != nil {
		mut(&tk)
	}
	path := seedTickFixtures(t, []tick.Tick{tk})
	return path, tk
}

// reread loads a tick back from the store for round-trip assertions.
func reread(t *testing.T, path, id string) tick.Tick {
	t.Helper()
	got, err := tick.NewStore(path).Read(id)
	if err != nil {
		t.Fatalf("reread %s: %v", id, err)
	}
	return got
}

func TestEditSetStatusPersists(t *testing.T) {
	path, _ := seedEditTick(t, nil)
	got, err := editSetStatus(path, "alice", "e1a", tick.StatusInProgress)
	if err != nil {
		t.Fatalf("editSetStatus: %v", err)
	}
	if got.Status != tick.StatusInProgress {
		t.Errorf("returned status = %q, want in_progress", got.Status)
	}
	if rr := reread(t, path, "e1a"); rr.Status != tick.StatusInProgress {
		t.Errorf("persisted status = %q, want in_progress", rr.Status)
	}
}

func TestEditCloseAndReopen(t *testing.T) {
	path, _ := seedEditTick(t, nil)
	closed, err := editClose(path, "alice", "e1a", "done here")
	if err != nil {
		t.Fatalf("editClose: %v", err)
	}
	if closed.Status != tick.StatusClosed || closed.ClosedReason != "done here" {
		t.Errorf("close result = %+v, want closed with reason", closed)
	}
	if rr := reread(t, path, "e1a"); rr.Status != tick.StatusClosed || rr.ClosedAt == nil {
		t.Errorf("persisted close = %+v, want closed w/ ClosedAt", rr)
	}

	reopened, err := editReopen(path, "alice", "e1a")
	if err != nil {
		t.Fatalf("editReopen: %v", err)
	}
	if reopened.Status != tick.StatusOpen || reopened.ClosedAt != nil || reopened.ClosedReason != "" {
		t.Errorf("reopen result = %+v, want open and cleared", reopened)
	}
	if rr := reread(t, path, "e1a"); rr.Status != tick.StatusOpen {
		t.Errorf("persisted reopen status = %q, want open", rr.Status)
	}
}

func TestEditSetPriorityClamps(t *testing.T) {
	path, _ := seedEditTick(t, nil)
	if got, err := editSetPriority(path, "alice", "e1a", 9); err != nil {
		t.Fatalf("editSetPriority: %v", err)
	} else if got.Priority != 4 {
		t.Errorf("priority = %d, want clamped to 4", got.Priority)
	}
	if rr := reread(t, path, "e1a"); rr.Priority != 4 {
		t.Errorf("persisted priority = %d, want 4", rr.Priority)
	}
}

func TestEditSetOwnerParentLabelsTargetDate(t *testing.T) {
	path, _ := seedEditTick(t, nil)

	if _, err := editSetOwner(path, "bot", "e1a", " bob "); err != nil {
		t.Fatalf("editSetOwner: %v", err)
	}
	if _, err := editSetParent(path, "bot", "e1a", "ep9"); err != nil {
		t.Fatalf("editSetParent: %v", err)
	}
	if _, err := editSetLabels(path, "bot", "e1a", "ui, , backend"); err != nil {
		t.Fatalf("editSetLabels: %v", err)
	}
	if _, err := editSetTargetDate(path, "bot", "e1a", "2026-09-30"); err != nil {
		t.Fatalf("editSetTargetDate: %v", err)
	}

	rr := reread(t, path, "e1a")
	if rr.Owner != "bob" {
		t.Errorf("owner = %q, want bob (trimmed)", rr.Owner)
	}
	if rr.Parent != "ep9" {
		t.Errorf("parent = %q, want ep9", rr.Parent)
	}
	if len(rr.Labels) != 2 || rr.Labels[0] != "ui" || rr.Labels[1] != "backend" {
		t.Errorf("labels = %v, want [ui backend]", rr.Labels)
	}
	if rr.TargetDate != "2026-09-30" {
		t.Errorf("target_date = %q, want 2026-09-30", rr.TargetDate)
	}
}

func TestEditAddBlockerDedupes(t *testing.T) {
	path, _ := seedEditTick(t, func(tk *tick.Tick) { tk.BlockedBy = []string{"b1"} })
	if _, err := editAddBlocker(path, "alice", "e1a", "b2"); err != nil {
		t.Fatalf("editAddBlocker: %v", err)
	}
	if _, err := editAddBlocker(path, "alice", "e1a", "b1"); err != nil {
		t.Fatalf("editAddBlocker dup: %v", err)
	}
	rr := reread(t, path, "e1a")
	if len(rr.BlockedBy) != 2 || rr.BlockedBy[0] != "b1" || rr.BlockedBy[1] != "b2" {
		t.Errorf("blockers = %v, want [b1 b2] (deduped)", rr.BlockedBy)
	}
}

func TestEditNoStorePath(t *testing.T) {
	if _, err := editSetStatus("", "a", "e1a", tick.StatusOpen); err != errNoStore {
		t.Errorf("editSetStatus(no path) err = %v, want errNoStore", err)
	}
}

// awaitingApprovalTick seeds a tick gated on approval and currently awaiting it.
func awaitingApprovalTick(t *testing.T) (string, tick.Tick) {
	t.Helper()
	return seedEditTick(t, func(tk *tick.Tick) {
		tk.Status = tick.StatusInProgress
		req := tick.RequiresApproval
		tk.Requires = &req
		aw := tick.AwaitingApproval
		tk.Awaiting = &aw
	})
}

func TestEditApproveClosesAwaitingTick(t *testing.T) {
	path, _ := awaitingApprovalTick(t)
	got, closed, err := editApprove(path, "alice", "e1a")
	if err != nil {
		t.Fatalf("editApprove: %v", err)
	}
	if !closed {
		t.Errorf("approve of awaiting-approval tick should close it")
	}
	if got.Awaiting != nil {
		t.Errorf("awaiting should be cleared after approve, got %v", got.Awaiting)
	}
	rr := reread(t, path, "e1a")
	if rr.Status != tick.StatusClosed {
		t.Errorf("persisted status = %q, want closed", rr.Status)
	}
}

func TestEditApproveRejectsNonAwaiting(t *testing.T) {
	path, _ := seedEditTick(t, nil) // open, not awaiting
	if _, _, err := editApprove(path, "alice", "e1a"); err == nil {
		t.Errorf("editApprove on non-awaiting tick should error")
	}
}

func TestEditRejectReturnsToAgentWithNote(t *testing.T) {
	path, _ := awaitingApprovalTick(t)
	got, closed, err := editReject(path, "alice", "e1a", "needs more tests")
	if err != nil {
		t.Fatalf("editReject: %v", err)
	}
	if closed {
		t.Errorf("reject of awaiting-approval tick should NOT close it")
	}
	if got.Awaiting != nil {
		t.Errorf("awaiting cleared after reject, got %v", got.Awaiting)
	}
	rr := reread(t, path, "e1a")
	if rr.Status == tick.StatusClosed {
		t.Errorf("rejected approval tick should stay open, got closed")
	}
	if got, want := rr.Notes, "needs more tests"; !contains(got, want) {
		t.Errorf("notes = %q, want to contain %q", got, want)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
