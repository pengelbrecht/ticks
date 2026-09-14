package cmd

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// captureCmdOutput redirects the cobra command output for one test.
func captureCmdOutput(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	rootCmd.SetOut(&buf)
	rootCmd.SetErr(&buf)
	t.Cleanup(func() {
		rootCmd.SetOut(nil)
		rootCmd.SetErr(nil)
	})
	return &buf
}

// validRunners is a runners.toml fixture other `tk` command tests still
// reach for — sandbox's model resolution in particular.
const validRunners = `version = 1

[orchestrator]
harness = "claude"

[roles.implement]
kind = "claude"
model = "sonnet"
`

// setupSpawnRepo builds a repo with an epic/task pair and, optionally, a
// runners.toml. It predates the herd spawn command it was named for (retired
// in tick nkf); sandbox's own tests still use the fixture shape.
func setupSpawnRepo(t *testing.T, runners string) (string, *tick.Store) {
	t.Helper()
	dir, store := setupTestRepo(t)
	execTestCmd(t, dir, "git", "commit", "--allow-empty", "-m", "base")

	epic := makeTestEpic("gy1")
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	task := makeTestTask("a1w")
	task.Parent = epic.ID
	task.Description = "deliver the spawn command"
	task.AcceptanceCriteria = "go test green"
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if runners != "" {
		if err := os.MkdirAll(filepath.Join(dir, ".tick"), 0o755); err != nil {
			t.Fatalf("mkdir .tick: %v", err)
		}
		if err := os.WriteFile(filepath.Join(dir, ".tick", "runners.toml"), []byte(runners), 0o644); err != nil {
			t.Fatalf("write runners.toml: %v", err)
		}
	}
	return dir, store
}
