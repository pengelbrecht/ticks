package tick

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLogActivity(t *testing.T) {
	// Create temp directory
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	os.MkdirAll(filepath.Join(tickDir, "issues"), 0o755)

	store := NewStore(tickDir)

	err := store.LogActivity("test123", ActivityCreate, "tester@example.com", "epic1", map[string]interface{}{"title": "Test Tick"})
	if err != nil {
		t.Fatalf("LogActivity failed: %v", err)
	}

	// Read back
	activities, err := store.ReadActivity(10)
	if err != nil {
		t.Fatalf("ReadActivity failed: %v", err)
	}

	if len(activities) != 1 {
		t.Fatalf("Expected 1 activity, got %d", len(activities))
	}

	if activities[0].TickID != "test123" {
		t.Errorf("Expected tickID 'test123', got '%s'", activities[0].TickID)
	}
	if activities[0].Action != ActivityCreate {
		t.Errorf("Expected action 'create', got '%s'", activities[0].Action)
	}
}

func TestWriteLogsActivity(t *testing.T) {
	// Create temp directory
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	os.MkdirAll(filepath.Join(tickDir, "issues"), 0o755)

	store := NewStore(tickDir)

	// Create a new tick
	now := time.Now()
	tick := Tick{
		ID:        "abc",
		Title:     "Test Tick",
		Status:    StatusOpen,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "test@example.com",
		CreatedBy: "test@example.com",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := store.Write(tick); err != nil {
		t.Fatalf("Write failed: %v", err)
	}

	// Check activity was logged
	activities, err := store.ReadActivity(10)
	if err != nil {
		t.Fatalf("ReadActivity failed: %v", err)
	}

	t.Logf("Activities: %+v", activities)

	if len(activities) != 1 {
		t.Fatalf("Expected 1 activity, got %d", len(activities))
	}

	if activities[0].Action != ActivityCreate {
		t.Errorf("Expected action 'create', got '%s'", activities[0].Action)
	}
}

// TestLastActivityForTick_OutOfOrder verifies that the maximum timestamp is
// returned when entries for the same tick appear out of chronological order.
func TestLastActivityForTick_OutOfOrder(t *testing.T) {
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	store := NewStore(tickDir)

	base := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	t1 := base.Add(-2 * time.Hour) // oldest
	t2 := base.Add(3 * time.Hour)  // newest
	t3 := base                     // middle

	// Log entries out of order: middle, oldest, newest, plus an unrelated tick.
	if err := store.LogActivity("tickX", ActivityCreate, "a@b.com", "", nil); err != nil {
		t.Fatal(err)
	}
	// Write lines directly to control timestamps precisely.
	activityDir := filepath.Join(tickDir, "activity")
	if err := os.MkdirAll(activityDir, 0o755); err != nil {
		t.Fatal(err)
	}
	logPath := filepath.Join(activityDir, "activity.jsonl")
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		t.Fatal(err)
	}
	entries := []struct {
		ts   time.Time
		tick string
	}{
		{t3, "abc"}, // middle
		{t1, "abc"}, // oldest
		{t2, "abc"}, // newest
		{t3, "other"},
	}
	for _, e := range entries {
		line := fmt.Sprintf(`{"ts":%q,"tick":%q,"action":"update","actor":"x"}`, e.ts.Format(time.RFC3339Nano), e.tick)
		if _, err := fmt.Fprintln(f, line); err != nil {
			t.Fatal(err)
		}
	}
	f.Close()

	got, err := store.LastActivityForTick("abc")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got == nil {
		t.Fatal("expected non-nil timestamp")
	}
	if !got.Equal(t2) {
		t.Errorf("expected max ts %v, got %v", t2, *got)
	}
}

// TestLastActivityForTick_MissingFile verifies nil is returned (not an error)
// when the activity log does not exist.
func TestLastActivityForTick_MissingFile(t *testing.T) {
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	store := NewStore(tickDir)

	got, err := store.LastActivityForTick("abc")
	if err != nil {
		t.Fatalf("expected no error for missing file, got: %v", err)
	}
	if got != nil {
		t.Errorf("expected nil timestamp for missing file, got %v", *got)
	}
}

// TestLastActivityForTick_MalformedLines verifies malformed lines are skipped
// and valid surrounding lines are still used.
func TestLastActivityForTick_MalformedLines(t *testing.T) {
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	activityDir := filepath.Join(tickDir, "activity")
	if err := os.MkdirAll(activityDir, 0o755); err != nil {
		t.Fatal(err)
	}
	store := NewStore(tickDir)

	ts1 := time.Date(2026, 3, 1, 10, 0, 0, 0, time.UTC)
	ts2 := time.Date(2026, 3, 1, 11, 0, 0, 0, time.UTC)

	logPath := filepath.Join(activityDir, "activity.jsonl")
	content := fmt.Sprintf(
		`{"ts":%q,"tick":"abc","action":"create","actor":"x"}`+"\n"+
			`THIS IS NOT JSON`+"\n"+
			`{"ts":%q,"tick":"abc","action":"update","actor":"x"}`+"\n",
		ts1.Format(time.RFC3339Nano),
		ts2.Format(time.RFC3339Nano),
	)
	if err := os.WriteFile(logPath, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	got, err := store.LastActivityForTick("abc")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got == nil {
		t.Fatal("expected non-nil timestamp")
	}
	if !got.Equal(ts2) {
		t.Errorf("expected %v, got %v", ts2, *got)
	}
}

// TestLastActivityForTick_NoEntriesForTick verifies nil is returned when the
// file exists but has no entries for the requested tick ID.
func TestLastActivityForTick_NoEntriesForTick(t *testing.T) {
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	store := NewStore(tickDir)

	if err := store.LogActivity("other", ActivityCreate, "a@b.com", "", nil); err != nil {
		t.Fatal(err)
	}

	got, err := store.LastActivityForTick("abc")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != nil {
		t.Errorf("expected nil for tick with no entries, got %v", *got)
	}
}

// writeActivityLines writes raw lines to a store's activity.jsonl, creating
// the directory as needed.
func writeActivityLines(t *testing.T, tickDir string, lines ...string) {
	t.Helper()
	activityDir := filepath.Join(tickDir, "activity")
	if err := os.MkdirAll(activityDir, 0o755); err != nil {
		t.Fatal(err)
	}
	var content string
	for _, l := range lines {
		content += l + "\n"
	}
	if err := os.WriteFile(filepath.Join(activityDir, "activity.jsonl"), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

// TestLastActivityForTicks_Bulk verifies a single scan resolves max
// timestamps for multiple ticks at once, with out-of-order entries,
// malformed lines, and IDs without entries.
func TestLastActivityForTicks_Bulk(t *testing.T) {
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	store := NewStore(tickDir)

	aMax := time.Date(2026, 5, 1, 15, 0, 0, 0, time.UTC)
	bMax := time.Date(2026, 5, 2, 9, 30, 0, 0, time.UTC)

	writeActivityLines(t, tickDir,
		// tick "aaa": out of order, max first
		fmt.Sprintf(`{"ts":%q,"tick":"aaa","action":"update","actor":"x"}`, aMax.Format(time.RFC3339Nano)),
		fmt.Sprintf(`{"ts":%q,"tick":"aaa","action":"create","actor":"x"}`, aMax.Add(-3*time.Hour).Format(time.RFC3339Nano)),
		`NOT VALID JSON`,
		// tick "bbb": single entry
		fmt.Sprintf(`{"ts":%q,"tick":"bbb","action":"create","actor":"x"}`, bMax.Format(time.RFC3339Nano)),
		// unrelated tick, newer than everything — must not leak into results
		fmt.Sprintf(`{"ts":%q,"tick":"zzz","action":"create","actor":"x"}`, bMax.Add(24*time.Hour).Format(time.RFC3339Nano)),
	)

	got, err := store.LastActivityForTicks([]string{"aaa", "bbb", "nope"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ts := got["aaa"]; ts == nil || !ts.Equal(aMax) {
		t.Errorf("aaa: expected %v, got %v", aMax, ts)
	}
	if ts := got["bbb"]; ts == nil || !ts.Equal(bMax) {
		t.Errorf("bbb: expected %v, got %v", bMax, ts)
	}
	if ts, present := got["nope"]; present && ts != nil {
		t.Errorf("nope: expected absent/nil, got %v", *ts)
	}
	if ts, present := got["zzz"]; present && ts != nil {
		t.Errorf("zzz: was not requested but present with %v", *ts)
	}
}

// TestLastActivityForTicks_MissingFile verifies an empty map and no error
// when the activity log does not exist.
func TestLastActivityForTicks_MissingFile(t *testing.T) {
	dir := t.TempDir()
	store := NewStore(filepath.Join(dir, ".tick"))

	got, err := store.LastActivityForTicks([]string{"abc", "def"})
	if err != nil {
		t.Fatalf("expected no error for missing file, got: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("expected empty result for missing file, got %v", got)
	}
}

// TestLastActivityForTicks_EmptyIDs verifies no result (and no error) for an
// empty/nil ID slice even when the log exists.
func TestLastActivityForTicks_EmptyIDs(t *testing.T) {
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	store := NewStore(tickDir)

	if err := store.LogActivity("abc", ActivityCreate, "a@b.com", "", nil); err != nil {
		t.Fatal(err)
	}

	got, err := store.LastActivityForTicks(nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("expected empty result for nil ids, got %v", got)
	}
}
