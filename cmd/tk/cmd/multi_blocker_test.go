package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"reflect"
	"testing"
)

// captureStdoutArgs runs ExecuteArgs while capturing stdout, returning the
// captured output and the command error.
func captureStdoutArgs(t *testing.T, args []string) (string, error) {
	t.Helper()

	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	runErr := ExecuteArgs(args)

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	return buf.String(), runErr
}

// TestBlockMultipleBlockers verifies tk block accepts several blocker ids in
// one invocation and records them all.
func TestBlockMultipleBlockers(t *testing.T) {
	_, store := setupTestRepo(t)

	for _, id := range []string{"t1m", "b1m", "b2m"} {
		if err := store.Write(makeTestTask(id)); err != nil {
			t.Fatalf("write tick %s: %v", id, err)
		}
	}

	if err := ExecuteArgs([]string{"block", "t1m", "b1m", "b2m"}); err != nil {
		t.Fatalf("ExecuteArgs: %v", err)
	}

	loaded, err := store.Read("t1m")
	if err != nil {
		t.Fatalf("read tick after block: %v", err)
	}
	want := []string{"b1m", "b2m"}
	if !reflect.DeepEqual(loaded.BlockedBy, want) {
		t.Errorf("BlockedBy: got %v, want %v", loaded.BlockedBy, want)
	}
}

// TestBlockMissingBlockerFailsAtomically verifies that one unknown blocker id
// fails the whole command without recording any of the blockers.
func TestBlockMissingBlockerFailsAtomically(t *testing.T) {
	_, store := setupTestRepo(t)

	for _, id := range []string{"t2m", "b3m"} {
		if err := store.Write(makeTestTask(id)); err != nil {
			t.Fatalf("write tick %s: %v", id, err)
		}
	}

	if err := ExecuteArgs([]string{"block", "t2m", "b3m", "nope"}); err == nil {
		t.Fatal("expected error for unknown blocker id, got nil")
	}

	loaded, err := store.Read("t2m")
	if err != nil {
		t.Fatalf("read tick after failed block: %v", err)
	}
	if len(loaded.BlockedBy) != 0 {
		t.Errorf("BlockedBy after failed block: got %v, want empty", loaded.BlockedBy)
	}
}

// TestCreateRepeatedBlockedByFlags verifies that repeating --blocked-by
// accumulates blockers instead of last-flag-wins.
func TestCreateRepeatedBlockedByFlags(t *testing.T) {
	setupTestRepo(t)
	if err := ExecuteArgs([]string{"init"}); err != nil {
		t.Fatalf("tk init: %v", err)
	}

	out, err := captureStdoutArgs(t, []string{
		"create", "Repeated blockers",
		"--blocked-by", "b1m",
		"--blocked-by", "b2m",
		"--json",
	})
	if err != nil {
		t.Fatalf("ExecuteArgs: %v", err)
	}

	var m struct {
		BlockedBy []string `json:"blocked_by"`
	}
	if err := json.Unmarshal([]byte(out), &m); err != nil {
		t.Fatalf("unmarshal JSON output: %v\nraw: %s", err, out)
	}
	want := []string{"b1m", "b2m"}
	if !reflect.DeepEqual(m.BlockedBy, want) {
		t.Errorf("blocked_by: got %v, want %v", m.BlockedBy, want)
	}
}

// TestCreateCommaAndRepeatedBlockedBy verifies the comma-separated form still
// works and mixes with repeated flags.
func TestCreateCommaAndRepeatedBlockedBy(t *testing.T) {
	setupTestRepo(t)
	if err := ExecuteArgs([]string{"init"}); err != nil {
		t.Fatalf("tk init: %v", err)
	}

	out, err := captureStdoutArgs(t, []string{
		"create", "Mixed blockers",
		"-b", "b1m, b2m",
		"-b", "b3m",
		"--json",
	})
	if err != nil {
		t.Fatalf("ExecuteArgs: %v", err)
	}

	var m struct {
		BlockedBy []string `json:"blocked_by"`
	}
	if err := json.Unmarshal([]byte(out), &m); err != nil {
		t.Fatalf("unmarshal JSON output: %v\nraw: %s", err, out)
	}
	want := []string{"b1m", "b2m", "b3m"}
	if !reflect.DeepEqual(m.BlockedBy, want) {
		t.Errorf("blocked_by: got %v, want %v", m.BlockedBy, want)
	}
}
