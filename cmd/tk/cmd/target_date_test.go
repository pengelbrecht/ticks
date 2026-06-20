package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/config"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// setupTickConfig writes a default .tick/config.json into repoDir so that
// tk create can load it (mirrors what TestCreateWithAfter does).
func setupTickConfig(t *testing.T, repoDir string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(repoDir, ".tick"), 0o755); err != nil {
		t.Fatalf("mkdir .tick: %v", err)
	}
	if err := config.Save(filepath.Join(repoDir, ".tick", "config.json"), config.Default()); err != nil {
		t.Fatalf("save config: %v", err)
	}
}

// captureStdoutStr captures stdout for a command call and returns the output as a string.
// Unlike captureStdout (in after_test.go) this one does NOT fatalf on runErr —
// the caller decides how to handle errors.
func captureStdoutStr(t *testing.T, fn func() error) (string, error) {
	t.Helper()
	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	runErr := fn()

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	return buf.String(), runErr
}

// --- tk create --target-date tests ---

// TestCreateTargetDateSetsField verifies that `tk create --target-date 2026-09-30 "x"`
// persists the target_date on the tick.
func TestCreateTargetDateSetsField(t *testing.T) {
	repoDir, store := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"create", "x", "--target-date", "2026-09-30"})
	})
	if err != nil {
		t.Fatalf("ExecuteArgs create: %v", err)
	}
	id := strings.TrimSpace(out)
	if id == "" {
		t.Fatal("create did not print a tick id")
	}

	loaded, err := store.Read(id)
	if err != nil {
		t.Fatalf("read created tick: %v", err)
	}
	if loaded.TargetDate != "2026-09-30" {
		t.Errorf("TargetDate: got %q, want %q", loaded.TargetDate, "2026-09-30")
	}
}

// TestCreateTargetDateAppearsInJSON verifies that `tk create --target-date ... --json`
// includes target_date in the JSON output.
func TestCreateTargetDateAppearsInJSON(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"create", "y", "--target-date", "2026-09-30", "--json"})
	})
	if err != nil {
		t.Fatalf("ExecuteArgs create --json: %v", err)
	}

	var m map[string]any
	if jsonErr := json.Unmarshal([]byte(out), &m); jsonErr != nil {
		t.Fatalf("unmarshal JSON: %v\nraw: %s", jsonErr, out)
	}
	if got, ok := m["target_date"]; !ok || got != "2026-09-30" {
		t.Errorf("target_date in JSON: got %v, want %q", got, "2026-09-30")
	}
}

// TestCreateTargetDateInvalidRejectsWithError verifies that a bad date value
// produces a non-zero exit and a clear error message.
func TestCreateTargetDateInvalidRejectsWithError(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	// Suppress stderr from error reporting.
	origStderr := os.Stderr
	devNull, _ := os.Open(os.DevNull)
	os.Stderr = devNull
	defer func() { os.Stderr = origStderr; _ = devNull.Close() }()

	badValues := []string{"2026-13-40", "next week", "2026-09", "not-a-date"}
	for _, bad := range badValues {
		t.Run(bad, func(t *testing.T) {
			_, err := captureStdoutStr(t, func() error {
				return ExecuteArgs([]string{"create", "z", "--target-date", bad})
			})
			if err == nil {
				t.Errorf("expected error for --target-date %q, got nil", bad)
			}
		})
	}
}

// TestCreateNoTargetDateOmitsField verifies that when --target-date is not
// passed, the field is absent (empty) on the created tick.
func TestCreateNoTargetDateOmitsField(t *testing.T) {
	repoDir, store := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"create", "no-date"})
	})
	if err != nil {
		t.Fatalf("ExecuteArgs create: %v", err)
	}
	id := strings.TrimSpace(out)

	loaded, err := store.Read(id)
	if err != nil {
		t.Fatalf("read created tick: %v", err)
	}
	if loaded.TargetDate != "" {
		t.Errorf("TargetDate should be empty when flag not passed, got %q", loaded.TargetDate)
	}
}

// --- tk update --target-date tests ---

// TestUpdateTargetDateSetsField verifies that `tk update <id> --target-date 2026-10-15`
// sets the field on the stored tick.
func TestUpdateTargetDateSetsField(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("td1")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if err := ExecuteArgs([]string{"update", "td1", "--target-date", "2026-10-15"}); err != nil {
		t.Fatalf("ExecuteArgs update --target-date: %v", err)
	}

	loaded, err := store.Read("td1")
	if err != nil {
		t.Fatalf("read tick after update: %v", err)
	}
	if loaded.TargetDate != "2026-10-15" {
		t.Errorf("TargetDate: got %q, want %q", loaded.TargetDate, "2026-10-15")
	}
}

// TestUpdateTargetDateAppearsInJSON verifies that `tk update --target-date ... --json`
// includes target_date in the JSON output.
func TestUpdateTargetDateAppearsInJSON(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("td2")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	runErr := ExecuteArgs([]string{"update", "td2", "--target-date", "2026-10-15", "--json"})

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	if runErr != nil {
		t.Fatalf("ExecuteArgs update --json: %v", runErr)
	}

	var m map[string]any
	if jsonErr := json.Unmarshal(buf.Bytes(), &m); jsonErr != nil {
		t.Fatalf("unmarshal JSON: %v\nraw: %s", jsonErr, buf.String())
	}
	if got, ok := m["target_date"]; !ok || got != "2026-10-15" {
		t.Errorf("target_date in JSON: got %v, want %q", got, "2026-10-15")
	}
}

// TestUpdateTargetDateClearByEmptyString verifies that --target-date ""
// clears the field (following the update.go convention for optional string fields).
func TestUpdateTargetDateClearByEmptyString(t *testing.T) {
	repoDir, store := setupTestRepo(t)

	task := makeTestTask("td3")
	task.TargetDate = "2026-09-30"
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if err := ExecuteArgs([]string{"update", "td3", "--target-date", ""}); err != nil {
		t.Fatalf("ExecuteArgs update --target-date \"\": %v", err)
	}

	loaded, err := store.Read("td3")
	if err != nil {
		t.Fatalf("read tick after clear: %v", err)
	}
	if loaded.TargetDate != "" {
		t.Errorf("TargetDate should be empty after clearing, got %q", loaded.TargetDate)
	}

	// The field is omitempty, so the stored JSON must not contain it.
	raw, err := os.ReadFile(filepath.Join(repoDir, ".tick", "issues", "td3.json"))
	if err != nil {
		t.Fatalf("read tick file: %v", err)
	}
	if strings.Contains(string(raw), `"target_date"`) {
		t.Errorf("stored JSON should omit \"target_date\" after clearing, got: %s", raw)
	}
}

// TestUpdateTargetDateInvalidRejectsWithError verifies that a bad date value
// on update produces a non-zero exit and a clear error.
func TestUpdateTargetDateInvalidRejectsWithError(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("td4")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	origStderr := os.Stderr
	devNull, _ := os.Open(os.DevNull)
	os.Stderr = devNull
	defer func() { os.Stderr = origStderr; _ = devNull.Close() }()

	badValues := []string{"2026-13-40", "next week", "2026-09", "not-a-date"}
	for _, bad := range badValues {
		t.Run(bad, func(t *testing.T) {
			err := ExecuteArgs([]string{"update", "td4", "--target-date", bad})
			if err == nil {
				t.Errorf("expected error for --target-date %q, got nil", bad)
			}
		})
	}
}

// TestUpdateTargetDateUnsetDoesNotChangeField verifies that if --target-date
// is NOT passed, the existing value is preserved.
func TestUpdateTargetDateUnsetDoesNotChangeField(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("td5")
	task.TargetDate = "2026-12-01"
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	// Update something unrelated — title only.
	if err := ExecuteArgs([]string{"update", "td5", "--title", "New title"}); err != nil {
		t.Fatalf("ExecuteArgs update --title: %v", err)
	}

	loaded, err := store.Read("td5")
	if err != nil {
		t.Fatalf("read tick after update: %v", err)
	}
	if loaded.TargetDate != "2026-12-01" {
		t.Errorf("TargetDate should be unchanged when flag not passed, got %q", loaded.TargetDate)
	}
}

// TestUpdateTargetDateAbsentFromJSONWhenUnset verifies that when target_date is
// not set on a tick, it is absent from JSON output (omitempty honoured).
func TestUpdateTargetDateAbsentFromJSONWhenUnset(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("td6")
	// target_date is intentionally not set.
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	runErr := ExecuteArgs([]string{"update", "td6", "--title", "Unchanged", "--json"})

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	if runErr != nil {
		t.Fatalf("ExecuteArgs: %v", runErr)
	}

	if strings.Contains(buf.String(), `"target_date"`) {
		t.Errorf("JSON output should not contain target_date when unset: %s", buf.String())
	}
}

// TestUpdateTargetDateChangesExistingDate verifies that the date can be updated
// from one value to another.
func TestUpdateTargetDateChangesExistingDate(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("td7")
	task.TargetDate = "2026-09-30"
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if err := ExecuteArgs([]string{"update", "td7", "--target-date", "2026-10-15"}); err != nil {
		t.Fatalf("ExecuteArgs update --target-date: %v", err)
	}

	loaded, err := store.Read("td7")
	if err != nil {
		t.Fatalf("read tick after update: %v", err)
	}
	if loaded.TargetDate != "2026-10-15" {
		t.Errorf("TargetDate: got %q, want %q", loaded.TargetDate, "2026-10-15")
	}

	// Verify Validate() still passes.
	if err := loaded.Validate(); err != nil {
		t.Errorf("Validate() after target-date change: %v", err)
	}
}

// Explicit import to satisfy the tick package reference in the file (Validate test above).
var _ = tick.TargetDateLayout

// --- tk list --overdue tests ---

// TestListOverdueShowsOnlyOverdue verifies that `tk list --overdue --all`
// returns only ticks whose derived slip status is SlipOverdue.
// We write one overdue tick (past target_date + open) and one on-track tick
// (future target_date), then assert only the overdue one appears in JSON output.
func TestListOverdueShowsOnlyOverdue(t *testing.T) {
	_, store := setupTestRepo(t)

	// An overdue tick: target_date in the distant past, status open.
	overdue := makeTestTask("ov1")
	overdue.TargetDate = "2020-01-01" // well in the past
	if err := store.Write(overdue); err != nil {
		t.Fatalf("write overdue tick: %v", err)
	}

	// An on-track tick: target_date in the future.
	onTrack := makeTestTask("ok1")
	onTrack.TargetDate = "2099-12-31"
	if err := store.Write(onTrack); err != nil {
		t.Fatalf("write on-track tick: %v", err)
	}

	// An undated tick (no target_date).
	undated := makeTestTask("nd1")
	if err := store.Write(undated); err != nil {
		t.Fatalf("write undated tick: %v", err)
	}

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"list", "--all", "--overdue", "--json"})
	})
	if err != nil {
		t.Fatalf("ExecuteArgs list --overdue: %v", err)
	}

	var result struct {
		Ticks []map[string]any `json:"ticks"`
	}
	if jsonErr := json.Unmarshal([]byte(out), &result); jsonErr != nil {
		t.Fatalf("unmarshal JSON: %v\nraw: %s", jsonErr, out)
	}

	if len(result.Ticks) != 1 {
		t.Fatalf("expected 1 overdue tick, got %d: %s", len(result.Ticks), out)
	}
	if got := result.Ticks[0]["id"]; got != "ov1" {
		t.Errorf("expected overdue tick id=ov1, got %v", got)
	}
}

// --- tk list --due-before tests ---

// TestListDueBeforeFiltersCorrectly verifies that `tk list --due-before DATE`
// returns only ticks whose target_date is strictly before that day, excluding
// undated ticks.
func TestListDueBeforeFiltersCorrectly(t *testing.T) {
	_, store := setupTestRepo(t)

	before := makeTestTask("bf1")
	before.TargetDate = "2026-08-15" // before 2026-09-01
	if err := store.Write(before); err != nil {
		t.Fatalf("write before tick: %v", err)
	}

	onCutoff := makeTestTask("oc1")
	onCutoff.TargetDate = "2026-09-01" // not strictly before → excluded
	if err := store.Write(onCutoff); err != nil {
		t.Fatalf("write on-cutoff tick: %v", err)
	}

	afterCutoff := makeTestTask("af1")
	afterCutoff.TargetDate = "2026-10-01"
	if err := store.Write(afterCutoff); err != nil {
		t.Fatalf("write after-cutoff tick: %v", err)
	}

	undated := makeTestTask("ud1")
	if err := store.Write(undated); err != nil {
		t.Fatalf("write undated tick: %v", err)
	}

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"list", "--all", "--due-before", "2026-09-01", "--json"})
	})
	if err != nil {
		t.Fatalf("ExecuteArgs list --due-before: %v", err)
	}

	var result struct {
		Ticks []map[string]any `json:"ticks"`
	}
	if jsonErr := json.Unmarshal([]byte(out), &result); jsonErr != nil {
		t.Fatalf("unmarshal JSON: %v\nraw: %s", jsonErr, out)
	}

	if len(result.Ticks) != 1 {
		t.Fatalf("expected 1 tick (bf1), got %d: %s", len(result.Ticks), out)
	}
	if got := result.Ticks[0]["id"]; got != "bf1" {
		t.Errorf("expected bf1, got %v", got)
	}
}

// TestListDueBeforeInvalidDateReturnsError verifies that an invalid date
// argument to --due-before returns a non-nil error.
func TestListDueBeforeInvalidDateReturnsError(t *testing.T) {
	setupTestRepo(t)

	_, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"list", "--all", "--due-before", "not-a-date", "--json"})
	})
	if err == nil {
		t.Error("expected error for invalid --due-before date, got nil")
	}
}

// --- tk list --sort target_date tests ---

// TestListSortTargetDateOrdersAscendingUndatedLast verifies that
// `tk list --sort target_date` returns ticks in ascending target_date order
// with undated ticks last.
func TestListSortTargetDateOrdersAscendingUndatedLast(t *testing.T) {
	_, store := setupTestRepo(t)

	t1 := makeTestTask("td-z")
	t1.TargetDate = "2026-12-01"
	if err := store.Write(t1); err != nil {
		t.Fatalf("write t1: %v", err)
	}

	t2 := makeTestTask("td-a")
	t2.TargetDate = "2026-07-01"
	if err := store.Write(t2); err != nil {
		t.Fatalf("write t2: %v", err)
	}

	t3 := makeTestTask("td-nd")
	// no target_date → last
	if err := store.Write(t3); err != nil {
		t.Fatalf("write t3: %v", err)
	}

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"list", "--all", "--sort", "target_date", "--json"})
	})
	if err != nil {
		t.Fatalf("ExecuteArgs list --sort target_date: %v", err)
	}

	var result struct {
		Ticks []map[string]any `json:"ticks"`
	}
	if jsonErr := json.Unmarshal([]byte(out), &result); jsonErr != nil {
		t.Fatalf("unmarshal JSON: %v\nraw: %s", jsonErr, out)
	}

	if len(result.Ticks) != 3 {
		t.Fatalf("expected 3 ticks, got %d: %s", len(result.Ticks), out)
	}
	wantOrder := []string{"td-a", "td-z", "td-nd"}
	for i, want := range wantOrder {
		if got := result.Ticks[i]["id"]; got != want {
			t.Errorf("position %d: got %v, want %v", i, got, want)
		}
	}
}

// TestListDefaultSortUnchangedWithoutFlag verifies that the default sort
// (priority/created_at) is used when --sort is not passed.
func TestListDefaultSortUnchangedWithoutFlag(t *testing.T) {
	_, store := setupTestRepo(t)

	// Two ticks: same target_date but different priorities.
	// Without --sort target_date, priority determines order.
	highPrio := makeTestTask("hp1")
	highPrio.Priority = 0
	highPrio.TargetDate = "2026-12-01"
	if err := store.Write(highPrio); err != nil {
		t.Fatalf("write highPrio: %v", err)
	}

	lowPrio := makeTestTask("lp1")
	lowPrio.Priority = 3
	lowPrio.TargetDate = "2026-07-01" // earlier date but lower priority
	if err := store.Write(lowPrio); err != nil {
		t.Fatalf("write lowPrio: %v", err)
	}

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"list", "--all", "--json"}) // no --sort
	})
	if err != nil {
		t.Fatalf("ExecuteArgs list (no sort): %v", err)
	}

	var result struct {
		Ticks []map[string]any `json:"ticks"`
	}
	if jsonErr := json.Unmarshal([]byte(out), &result); jsonErr != nil {
		t.Fatalf("unmarshal JSON: %v\nraw: %s", jsonErr, out)
	}

	if len(result.Ticks) != 2 {
		t.Fatalf("expected 2 ticks, got %d", len(result.Ticks))
	}
	// Default sort: priority ascending → high-prio (0) first, low-prio (3) second.
	if got := result.Ticks[0]["id"]; got != "hp1" {
		t.Errorf("default sort: expected hp1 first (priority 0), got %v", got)
	}
}
