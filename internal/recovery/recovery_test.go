package recovery

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// --- test doubles ---

// mockProber implements WorktreeProber for testing.
type mockProber struct {
	worktrees map[string]WorktreeInfo // keyed by worktree path or epic ID
}

func newMockProber() *mockProber {
	return &mockProber{worktrees: make(map[string]WorktreeInfo)}
}

func (m *mockProber) Set(key string, info WorktreeInfo) {
	m.worktrees[key] = info
}

func (m *mockProber) ProbeWorktree(worktreePath, epicID string) WorktreeInfo {
	if worktreePath != "" {
		if info, ok := m.worktrees[worktreePath]; ok {
			return info
		}
	}
	if info, ok := m.worktrees[epicID]; ok {
		return info
	}
	return WorktreeInfo{} // not found = not exists
}

// mockWriter implements TickWriter for testing.
type mockWriter struct {
	ticks      map[string]tick.Tick
	activities []activityLog
	writeErr   error
}

type activityLog struct {
	tickID string
	action string
	actor  string
	epic   string
	data   map[string]interface{}
}

func newMockWriter() *mockWriter {
	return &mockWriter{ticks: make(map[string]tick.Tick)}
}

func (m *mockWriter) Add(t tick.Tick) {
	m.ticks[t.ID] = t
}

func (m *mockWriter) Read(id string) (tick.Tick, error) {
	t, ok := m.ticks[id]
	if !ok {
		return tick.Tick{}, fmt.Errorf("tick %s not found", id)
	}
	return t, nil
}

func (m *mockWriter) Write(t tick.Tick) error {
	if m.writeErr != nil {
		return m.writeErr
	}
	m.ticks[t.ID] = t
	return nil
}

func (m *mockWriter) LogActivity(tickID, action, actor, epic string, data map[string]interface{}) error {
	m.activities = append(m.activities, activityLog{
		tickID: tickID,
		action: action,
		actor:  actor,
		epic:   epic,
		data:   data,
	})
	return nil
}

// --- helpers ---

func makeTick(id, title, parent string) tick.Tick {
	now := time.Now().UTC()
	return tick.Tick{
		ID:        id,
		Title:     title,
		Status:    tick.StatusInProgress,
		Priority:  2,
		Type:      tick.TypeTask,
		Owner:     "test",
		Parent:    parent,
		CreatedBy: "test",
		CreatedAt: now.Add(-time.Hour),
		UpdatedAt: now,
		StartedAt: &now,
	}
}

func withLease(t tick.Tick, worktree string, acquiredAt time.Time, expiresAt *time.Time) tick.Tick {
	t.TickflowLease = &tick.TickflowLease{
		Runner:     "pi-tickflow",
		SessionID:  "test-session",
		Worktree:   worktree,
		AcquiredAt: acquiredAt,
		ExpiresAt:  expiresAt,
	}
	return t
}

func timePtr(t time.Time) *time.Time { return &t }

// --- tests ---

func TestRecoverExpiredLease_WorktreeMissing_Releases(t *testing.T) {
	now := time.Now().UTC()
	expires := now.Add(-10 * time.Minute) // expired 10 min ago

	tk := withLease(makeTick("t1", "Fix auth", "epic1"), "/tmp/wt/t1", now.Add(-time.Hour), &expires)

	prober := newMockProber()
	// worktree does not exist (not registered in prober)

	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{Now: now})

	if res.Scanned != 1 {
		t.Fatalf("expected 1 scanned, got %d", res.Scanned)
	}
	if res.Released != 1 {
		t.Fatalf("expected 1 released, got %d", res.Released)
	}
	if res.Preserved != 0 {
		t.Fatalf("expected 0 preserved, got %d", res.Preserved)
	}

	// Verify tick was reset to open
	recovered := writer.ticks["t1"]
	if recovered.Status != tick.StatusOpen {
		t.Errorf("expected status open, got %s", recovered.Status)
	}
	if recovered.TickflowLease != nil {
		t.Error("expected lease to be cleared")
	}
	if recovered.StartedAt != nil {
		t.Error("expected started_at to be cleared")
	}

	// Verify recovery note
	if !strings.Contains(recovered.Notes, "[recovery]") {
		t.Errorf("expected recovery note, got: %s", recovered.Notes)
	}
	if !strings.Contains(recovered.Notes, "released back to open") {
		t.Errorf("expected 'released back to open' in note, got: %s", recovered.Notes)
	}

	// Verify activity log
	if len(writer.activities) != 1 {
		t.Fatalf("expected 1 activity, got %d", len(writer.activities))
	}
	if writer.activities[0].action != tick.ActivityStaleRecovery {
		t.Errorf("expected stale_recovery action, got %s", writer.activities[0].action)
	}

	// Verify StaleTick detail
	if len(res.StaleTicks) != 1 {
		t.Fatalf("expected 1 stale tick, got %d", len(res.StaleTicks))
	}
	st := res.StaleTicks[0]
	if st.Decision != DecisionRelease {
		t.Errorf("expected release decision, got %s", st.Decision)
	}
}

func TestRecoverExpiredLease_WorktreeDirty_Preserves(t *testing.T) {
	now := time.Now().UTC()
	expires := now.Add(-10 * time.Minute)

	tk := withLease(makeTick("t2", "Add tests", "epic1"), "/tmp/wt/t2", now.Add(-time.Hour), &expires)

	prober := newMockProber()
	prober.Set("/tmp/wt/t2", WorktreeInfo{
		Exists:     true,
		Path:       "/tmp/wt/t2",
		Dirty:      true,
		DirtyFiles: []string{"src/auth.go", "src/auth_test.go"},
	})

	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{Now: now})

	if res.Preserved != 1 {
		t.Fatalf("expected 1 preserved, got %d", res.Preserved)
	}
	if res.Released != 0 {
		t.Fatalf("expected 0 released, got %d", res.Released)
	}

	// Verify tick is awaiting escalation (not released)
	preserved := writer.ticks["t2"]
	if preserved.Status != tick.StatusInProgress {
		t.Errorf("expected status in_progress (preserved), got %s", preserved.Status)
	}
	if preserved.Awaiting == nil || *preserved.Awaiting != tick.AwaitingEscalation {
		t.Errorf("expected awaiting escalation, got %v", preserved.Awaiting)
	}

	// Verify note mentions preserved work location
	if !strings.Contains(preserved.Notes, "/tmp/wt/t2") {
		t.Errorf("expected worktree path in note, got: %s", preserved.Notes)
	}
	if !strings.Contains(preserved.Notes, "uncommitted files") {
		t.Errorf("expected dirty file count in note, got: %s", preserved.Notes)
	}

	// Verify StaleTick detail
	st := res.StaleTicks[0]
	if st.Decision != DecisionPreserve {
		t.Errorf("expected preserve decision, got %s", st.Decision)
	}
	if len(st.DirtyFiles) != 2 {
		t.Errorf("expected 2 dirty files, got %d", len(st.DirtyFiles))
	}
}

func TestRecoverExpiredLease_WorktreeClean_Releases(t *testing.T) {
	now := time.Now().UTC()
	expires := now.Add(-5 * time.Minute)

	tk := withLease(makeTick("t3", "Refactor", "epic1"), "/tmp/wt/t3", now.Add(-time.Hour), &expires)

	prober := newMockProber()
	prober.Set("/tmp/wt/t3", WorktreeInfo{
		Exists: true,
		Path:   "/tmp/wt/t3",
		Dirty:  false,
	})

	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{Now: now})

	if res.Released != 1 {
		t.Fatalf("expected 1 released, got %d", res.Released)
	}

	recovered := writer.ticks["t3"]
	if recovered.Status != tick.StatusOpen {
		t.Errorf("expected status open, got %s", recovered.Status)
	}

	// Verify reason mentions worktree clean
	st := res.StaleTicks[0]
	hasCleanReason := false
	for _, r := range st.Reasons {
		if r == ReasonWorktreeClean {
			hasCleanReason = true
		}
	}
	if !hasCleanReason {
		t.Errorf("expected worktree_clean reason, got %v", st.Reasons)
	}
}

func TestRecoverActiveLease_Noop(t *testing.T) {
	now := time.Now().UTC()
	expires := now.Add(30 * time.Minute) // 30 min in the future

	tk := withLease(makeTick("t4", "Active task", "epic1"), "/tmp/wt/t4", now.Add(-10*time.Minute), &expires)

	prober := newMockProber()
	prober.Set("/tmp/wt/t4", WorktreeInfo{
		Exists: true,
		Path:   "/tmp/wt/t4",
		Dirty:  true, // dirty but lease is active
	})

	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{Now: now})

	if res.Continued != 1 {
		t.Fatalf("expected 1 continued, got %d", res.Continued)
	}
	if res.Released != 0 || res.Preserved != 0 {
		t.Fatalf("expected no releases or preserves, got released=%d preserved=%d", res.Released, res.Preserved)
	}

	// Verify tick was not modified
	original := writer.ticks["t4"]
	if original.Status != tick.StatusInProgress {
		t.Errorf("expected status unchanged, got %s", original.Status)
	}
}

func TestRecoverNoLease_StartedAtExpired_Releases(t *testing.T) {
	now := time.Now().UTC()
	started := now.Add(-2 * time.Hour)

	tk := makeTick("t5", "Legacy task", "epic1")
	tk.StartedAt = &started
	tk.TickflowLease = nil // no lease

	prober := newMockProber()
	// worktree missing

	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{
		Now:          now,
		StaleTimeout: time.Hour,
	})

	if res.Released != 1 {
		t.Fatalf("expected 1 released, got %d", res.Released)
	}

	st := res.StaleTicks[0]
	hasStartedReason := false
	for _, r := range st.Reasons {
		if r == ReasonStartedAtExpired {
			hasStartedReason = true
		}
	}
	if !hasStartedReason {
		t.Errorf("expected started_at_expired reason, got %v", st.Reasons)
	}
}

func TestRecoverNoLease_RecentStartedAt_Continues(t *testing.T) {
	now := time.Now().UTC()
	started := now.Add(-10 * time.Minute) // only 10 min ago

	tk := makeTick("t6", "Recent task", "epic1")
	tk.StartedAt = &started
	tk.TickflowLease = nil

	prober := newMockProber()
	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{
		Now:          now,
		StaleTimeout: time.Hour,
	})

	if res.Continued != 1 {
		t.Fatalf("expected 1 continued, got %d", res.Continued)
	}
}

func TestRecoverWorktreeMissing_LeaseNotExpired_Releases(t *testing.T) {
	// Lease says it hasn't expired yet, but the worktree is gone.
	// This means the runner crashed. We should release.
	now := time.Now().UTC()
	expires := now.Add(30 * time.Minute) // not expired

	tk := withLease(makeTick("t7", "Orphaned task", "epic1"), "/tmp/gone/t7", now.Add(-10*time.Minute), &expires)

	prober := newMockProber()
	// worktree does NOT exist

	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{Now: now})

	if res.Released != 1 {
		t.Fatalf("expected 1 released, got %d", res.Released)
	}

	st := res.StaleTicks[0]
	hasWtMissing := false
	for _, r := range st.Reasons {
		if r == ReasonWorktreeMissing {
			hasWtMissing = true
		}
	}
	if !hasWtMissing {
		t.Errorf("expected worktree_missing reason, got %v", st.Reasons)
	}
}

func TestRecoverDryRun_NoMutations(t *testing.T) {
	now := time.Now().UTC()
	expires := now.Add(-10 * time.Minute)

	tk := withLease(makeTick("t8", "Dry run task", "epic1"), "/tmp/wt/t8", now.Add(-time.Hour), &expires)

	prober := newMockProber()
	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{
		Now:    now,
		DryRun: true,
	})

	if res.Released != 1 {
		t.Fatalf("expected 1 released (dry run), got %d", res.Released)
	}

	// Verify tick was NOT modified
	original := writer.ticks["t8"]
	if original.Status != tick.StatusInProgress {
		t.Errorf("expected status unchanged in dry run, got %s", original.Status)
	}
	if len(writer.activities) != 0 {
		t.Errorf("expected no activities in dry run, got %d", len(writer.activities))
	}
}

func TestRecoverSkipsNonInProgress(t *testing.T) {
	now := time.Now().UTC()
	closedAt := now.Add(-time.Hour)

	tk := makeTick("t9", "Closed task", "epic1")
	tk.Status = tick.StatusClosed
	tk.ClosedAt = &closedAt
	tk.ClosedReason = "done"

	prober := newMockProber()
	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{Now: now})

	if res.Scanned != 0 {
		t.Fatalf("expected 0 scanned (non in_progress skipped), got %d", res.Scanned)
	}
}

func TestRecoverMultipleTicks(t *testing.T) {
	now := time.Now().UTC()
	expired := now.Add(-10 * time.Minute)
	active := now.Add(30 * time.Minute)

	ticks := []tick.Tick{
		withLease(makeTick("t10", "Expired+missing", "epic1"), "/tmp/wt/t10", now.Add(-time.Hour), &expired),
		withLease(makeTick("t11", "Expired+dirty", "epic1"), "/tmp/wt/t11", now.Add(-time.Hour), &expired),
		withLease(makeTick("t12", "Active", "epic1"), "/tmp/wt/t12", now.Add(-10*time.Minute), &active),
	}

	prober := newMockProber()
	// t10: missing
	prober.Set("/tmp/wt/t11", WorktreeInfo{Exists: true, Path: "/tmp/wt/t11", Dirty: true, DirtyFiles: []string{"file.go"}})
	prober.Set("/tmp/wt/t12", WorktreeInfo{Exists: true, Path: "/tmp/wt/t12"})

	writer := newMockWriter()
	for _, tk := range ticks {
		writer.Add(tk)
	}

	res := Recover(ticks, prober, writer, Config{Now: now})

	if res.Scanned != 3 {
		t.Fatalf("expected 3 scanned, got %d", res.Scanned)
	}
	if res.Released != 1 {
		t.Errorf("expected 1 released, got %d", res.Released)
	}
	if res.Preserved != 1 {
		t.Errorf("expected 1 preserved, got %d", res.Preserved)
	}
	if res.Continued != 1 {
		t.Errorf("expected 1 continued, got %d", res.Continued)
	}
}

func TestRecoverWriteError_CountsAsContinued(t *testing.T) {
	now := time.Now().UTC()
	expires := now.Add(-10 * time.Minute)

	tk := withLease(makeTick("t13", "Write fails", "epic1"), "/tmp/wt/t13", now.Add(-time.Hour), &expires)

	prober := newMockProber()
	writer := newMockWriter()
	writer.Add(tk)
	writer.writeErr = fmt.Errorf("disk full")

	res := Recover([]tick.Tick{tk}, prober, writer, Config{Now: now})

	// Write failed, so it should be counted as continued (not released)
	if res.Released != 0 {
		t.Errorf("expected 0 released (write failed), got %d", res.Released)
	}
	if res.Continued != 1 {
		t.Errorf("expected 1 continued (fallback), got %d", res.Continued)
	}
	if len(res.Errors) != 1 {
		t.Fatalf("expected 1 error, got %d", len(res.Errors))
	}
	if !strings.Contains(res.Errors[0].Error(), "disk full") {
		t.Errorf("expected disk full error, got: %s", res.Errors[0])
	}
}

func TestRecoverCustomActor(t *testing.T) {
	now := time.Now().UTC()
	expires := now.Add(-10 * time.Minute)

	tk := withLease(makeTick("t14", "Custom actor", "epic1"), "/tmp/wt/t14", now.Add(-time.Hour), &expires)

	prober := newMockProber()
	writer := newMockWriter()
	writer.Add(tk)

	Recover([]tick.Tick{tk}, prober, writer, Config{
		Now:   now,
		Actor: "pool-coordinator",
	})

	if len(writer.activities) != 1 {
		t.Fatalf("expected 1 activity, got %d", len(writer.activities))
	}
	if writer.activities[0].actor != "pool-coordinator" {
		t.Errorf("expected actor pool-coordinator, got %s", writer.activities[0].actor)
	}
}

func TestBuildNoteRelease(t *testing.T) {
	st := StaleTick{
		TickID:   "t1",
		Decision: DecisionRelease,
		Reasons:  []Reason{ReasonLeaseExpired, ReasonWorktreeMissing},
	}
	note := buildNote(st, time.Now())

	if !strings.Contains(note, "released back to open") {
		t.Errorf("expected 'released back to open' in note, got: %s", note)
	}
	if !strings.Contains(note, "lease expired") {
		t.Errorf("expected 'lease expired' in note, got: %s", note)
	}
}

func TestBuildNotePreserve(t *testing.T) {
	st := StaleTick{
		TickID:       "t2",
		Decision:     DecisionPreserve,
		Reasons:      []Reason{ReasonLeaseExpired, ReasonWorktreeDirty},
		WorktreePath: "/home/user/.claude/worktrees/tk-epic1",
		DirtyFiles:   []string{"a.go", "b.go", "c.go"},
	}
	note := buildNote(st, time.Now())

	if !strings.Contains(note, "preserving for human review") {
		t.Errorf("expected 'preserving for human review' in note, got: %s", note)
	}
	if !strings.Contains(note, "/home/user/.claude/worktrees/tk-epic1") {
		t.Errorf("expected worktree path in note, got: %s", note)
	}
	if !strings.Contains(note, "3 uncommitted files") {
		t.Errorf("expected '3 uncommitted files' in note, got: %s", note)
	}
}

func TestRecoverLeaseWithoutExpiry_WorktreeExists_Continues(t *testing.T) {
	// Lease without expiry (ExpiresAt == nil) with existing worktree should continue
	now := time.Now().UTC()

	tk := withLease(makeTick("t15", "No expiry", "epic1"), "/tmp/wt/t15", now.Add(-10*time.Minute), nil)

	prober := newMockProber()
	prober.Set("/tmp/wt/t15", WorktreeInfo{Exists: true, Path: "/tmp/wt/t15"})

	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{Now: now})

	if res.Continued != 1 {
		t.Fatalf("expected 1 continued, got %d", res.Continued)
	}
}

func TestRecoverLeaseWithoutExpiry_WorktreeMissing_Releases(t *testing.T) {
	// Lease without expiry but worktree gone = crash
	now := time.Now().UTC()

	tk := withLease(makeTick("t16", "No expiry, gone", "epic1"), "/tmp/gone/t16", now.Add(-10*time.Minute), nil)

	prober := newMockProber()
	// worktree does NOT exist

	writer := newMockWriter()
	writer.Add(tk)

	res := Recover([]tick.Tick{tk}, prober, writer, Config{Now: now})

	if res.Released != 1 {
		t.Fatalf("expected 1 released, got %d", res.Released)
	}
}
