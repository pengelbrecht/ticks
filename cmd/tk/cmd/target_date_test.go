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
