package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// setupTestRepo creates a minimal git repo with a .tick store and returns its
// path. It chdirs into the repo so repoRoot() and DetectProject() resolve
// correctly, and restores the original dir on t.Cleanup.
func setupTestRepo(t *testing.T) (repoDir string, store *tick.Store) {
	t.Helper()

	dir := t.TempDir()

	// Minimal git repo + remote so DetectProject succeeds.
	execTestCmd(t, dir, "git", "init")
	execTestCmd(t, dir, "git", "remote", "add", "origin", "https://github.com/test/repo.git")

	origDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("chdir to temp repo: %v", err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(origDir)
	})

	store = tick.NewStore(filepath.Join(dir, ".tick"))
	return dir, store
}

// execTestCmd runs an external command in dir, failing the test on error.
func execTestCmd(t *testing.T, dir string, name string, args ...string) {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("command %s %v: %v\n%s", name, args, err, out)
	}
}

func makeTestEpic(id string) tick.Tick {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	return tick.Tick{
		ID:        id,
		Title:     "Test epic " + id,
		Status:    tick.StatusOpen,
		Priority:  2,
		Type:      tick.TypeEpic,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func makeTestTask(id string) tick.Tick {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	return tick.Tick{
		ID:        id,
		Title:     "Test task " + id,
		Status:    tick.StatusOpen,
		Priority:  2,
		Type:      tick.TypeTask,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// TestUpdateBaseBranchOnEpic verifies that --base-branch sets the field and
// the JSON output contains base_branch.
func TestUpdateBaseBranchOnEpic(t *testing.T) {
	_, store := setupTestRepo(t)

	epic := makeTestEpic("e1b")
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	// Capture stdout for --json output.
	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	runErr := ExecuteArgs([]string{"update", "e1b", "--base-branch", "epic/my-feature", "--json"})

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	if runErr != nil {
		t.Fatalf("ExecuteArgs returned error: %v", runErr)
	}

	// Verify JSON output contains base_branch.
	var m map[string]any
	if err := json.Unmarshal(buf.Bytes(), &m); err != nil {
		t.Fatalf("unmarshal JSON output: %v\nraw: %s", err, buf.String())
	}
	if got, ok := m["base_branch"]; !ok || got != "epic/my-feature" {
		t.Errorf("base_branch in JSON output: got %v, want %q", got, "epic/my-feature")
	}

	// Also verify the tick was persisted correctly.
	loaded, err := store.Read("e1b")
	if err != nil {
		t.Fatalf("read epic after update: %v", err)
	}
	if loaded.BaseBranch != "epic/my-feature" {
		t.Errorf("stored BaseBranch: got %q, want %q", loaded.BaseBranch, "epic/my-feature")
	}
}

// TestUpdateBaseBranchOnTaskErrors verifies that --base-branch on a non-epic
// tick returns a usage error.
func TestUpdateBaseBranchOnTaskErrors(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("t1b")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	// Suppress stderr output from the error message.
	origStderr := os.Stderr
	devNull, _ := os.Open(os.DevNull)
	os.Stderr = devNull
	defer func() { os.Stderr = origStderr; _ = devNull.Close() }()

	err := ExecuteArgs([]string{"update", "t1b", "--base-branch", "some-branch"})
	if err == nil {
		t.Fatal("expected error when setting --base-branch on a task, got nil")
	}
	if !strings.Contains(err.Error(), "epic") {
		t.Errorf("error message should mention 'epic', got: %s", err.Error())
	}
	if GetExitCode(err) != ExitUsage {
		t.Errorf("expected ExitUsage exit code, got %d", GetExitCode(err))
	}
}

// TestUpdateBaseBranchClear verifies that setting --base-branch to empty string
// clears the field.
func TestUpdateBaseBranchClear(t *testing.T) {
	_, store := setupTestRepo(t)

	epic := makeTestEpic("e2b")
	epic.BaseBranch = "epic/old-branch"
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	err := ExecuteArgs([]string{"update", "e2b", "--base-branch", ""})
	if err != nil {
		t.Fatalf("ExecuteArgs: %v", err)
	}

	loaded, err := store.Read("e2b")
	if err != nil {
		t.Fatalf("read epic after clear: %v", err)
	}
	if loaded.BaseBranch != "" {
		t.Errorf("BaseBranch should be empty after clear, got %q", loaded.BaseBranch)
	}
}

// TestUpdateBaseBranchUnsetAbsentFromJSON verifies that a tick without
// BaseBranch set does not include "base_branch" in its JSON output.
func TestUpdateBaseBranchUnsetAbsentFromJSON(t *testing.T) {
	_, store := setupTestRepo(t)

	epic := makeTestEpic("e3b")
	// BaseBranch is NOT set.
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	origStdout := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	runErr := ExecuteArgs([]string{"update", "e3b", "--title", "Updated epic e3b", "--json"})

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	if runErr != nil {
		t.Fatalf("ExecuteArgs: %v", runErr)
	}

	if strings.Contains(buf.String(), `"base_branch"`) {
		t.Errorf("JSON output should not contain base_branch when unset: %s", buf.String())
	}
}
