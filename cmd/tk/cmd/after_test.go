package cmd

import (
	"bytes"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/config"
)

// captureStdout runs fn while capturing everything written to os.Stdout and
// returns it as a string.
func captureStdout(t *testing.T, fn func() error) string {
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

	if runErr != nil {
		t.Fatalf("ExecuteArgs returned error: %v\noutput: %s", runErr, buf.String())
	}
	return buf.String()
}

// TestCreateWithAfter verifies that `tk create x --after a1,b2` stores the
// tick with after ["a1","b2"].
func TestCreateWithAfter(t *testing.T) {
	repoDir, store := setupTestRepo(t)

	// tk create loads the repo config, so write the defaults first.
	if err := os.MkdirAll(filepath.Join(repoDir, ".tick"), 0o755); err != nil {
		t.Fatalf("mkdir .tick: %v", err)
	}
	if err := config.Save(filepath.Join(repoDir, ".tick", "config.json"), config.Default()); err != nil {
		t.Fatalf("save config: %v", err)
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"create", "x", "--after", "a1,b2"})
	})
	id := strings.TrimSpace(out)
	if id == "" {
		t.Fatal("create did not print a tick id")
	}

	loaded, err := store.Read(id)
	if err != nil {
		t.Fatalf("read created tick: %v", err)
	}
	want := []string{"a1", "b2"}
	if !reflect.DeepEqual(loaded.After, want) {
		t.Errorf("stored After: got %v, want %v", loaded.After, want)
	}
}

// TestUpdateAfterSetAndClear verifies that --after replaces the whole list
// and that an explicit empty value clears the field (omitted from JSON).
func TestUpdateAfterSetAndClear(t *testing.T) {
	repoDir, store := setupTestRepo(t)

	task := makeTestTask("af1")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if err := ExecuteArgs([]string{"update", "af1", "--after", "c3"}); err != nil {
		t.Fatalf("ExecuteArgs update --after c3: %v", err)
	}
	loaded, err := store.Read("af1")
	if err != nil {
		t.Fatalf("read tick after update: %v", err)
	}
	if want := []string{"c3"}; !reflect.DeepEqual(loaded.After, want) {
		t.Errorf("After after set: got %v, want %v", loaded.After, want)
	}

	if err := ExecuteArgs([]string{"update", "af1", "--after", ""}); err != nil {
		t.Fatalf("ExecuteArgs update --after \"\": %v", err)
	}
	loaded, err = store.Read("af1")
	if err != nil {
		t.Fatalf("read tick after clear: %v", err)
	}
	if len(loaded.After) != 0 {
		t.Errorf("After should be empty after clearing, got %v", loaded.After)
	}

	// The field is omitempty, so the stored JSON must not contain it.
	raw, err := os.ReadFile(filepath.Join(repoDir, ".tick", "issues", "af1.json"))
	if err != nil {
		t.Fatalf("read tick file: %v", err)
	}
	if strings.Contains(string(raw), `"after"`) {
		t.Errorf("stored JSON should omit \"after\" after clearing, got: %s", raw)
	}
}

// TestShowRendersAfterLine verifies that `tk show` renders an After: line
// with the target ids when the field is set.
func TestShowRendersAfterLine(t *testing.T) {
	_, store := setupTestRepo(t)

	target := makeTestTask("tg1")
	if err := store.Write(target); err != nil {
		t.Fatalf("write target task: %v", err)
	}
	task := makeTestTask("af2")
	task.After = []string{"tg1", "zz9"}
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"show", "af2"})
	})
	if !strings.Contains(out, "After:") {
		t.Errorf("show output should contain \"After:\", got:\n%s", out)
	}
	if !strings.Contains(out, "tg1") {
		t.Errorf("show output should contain after target id tg1, got:\n%s", out)
	}
	if !strings.Contains(out, "zz9") {
		t.Errorf("show output should contain after target id zz9, got:\n%s", out)
	}
}

// TestShowOmitsAfterLineWhenEmpty verifies that `tk show` omits the After:
// line when the field is not set.
func TestShowOmitsAfterLineWhenEmpty(t *testing.T) {
	_, store := setupTestRepo(t)

	task := makeTestTask("af3")
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"show", "af3"})
	})
	if strings.Contains(out, "After:") {
		t.Errorf("show output should not contain \"After:\" for a tick without after, got:\n%s", out)
	}
}
