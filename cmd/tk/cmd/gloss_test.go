package cmd

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func quietStderr(t *testing.T) {
	t.Helper()
	orig := os.Stderr
	devNull, _ := os.Open(os.DevNull)
	os.Stderr = devNull
	t.Cleanup(func() { os.Stderr = orig; _ = devNull.Close() })
}

func TestCreateGlossPersistsAndAppearsInJSON(t *testing.T) {
	repoDir, store := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"create", "Add Google OAuth login to signup and settings", "--gloss", "add google oauth login", "--json"})
	})
	if err != nil {
		t.Fatalf("create --gloss: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(out), &m); err != nil {
		t.Fatalf("unmarshal: %v\nraw: %s", err, out)
	}
	if m["gloss"] != "add google oauth login" {
		t.Errorf("gloss in JSON: got %v", m["gloss"])
	}
	loaded, err := store.Read(m["id"].(string))
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if loaded.Gloss != "add google oauth login" {
		t.Errorf("persisted gloss: got %q", loaded.Gloss)
	}
}

func TestCreateWithoutGlossOmitsTheField(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"create", "Fix auth", "--json"})
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if strings.Contains(out, `"gloss"`) {
		t.Errorf("an empty gloss was emitted rather than omitted:\n%s", out)
	}
}

func TestCreateRefusesAnOverlongGlossAndWritesNothing(t *testing.T) {
	repoDir, store := setupTestRepo(t)
	setupTickConfig(t, repoDir)
	quietStderr(t)

	_, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"create", "x", "--gloss", strings.Repeat("g", 41)})
	})
	if err == nil {
		t.Fatal("a 41-character gloss was accepted")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code: got %d, want %d (usage)", code, ExitUsage)
	}
	if !strings.Contains(err.Error(), "the limit is 40") {
		t.Errorf("refusal does not name the limit: %v", err)
	}
	ticks, _ := store.List()
	if len(ticks) != 0 {
		t.Errorf("a refused create wrote %d tick(s)", len(ticks))
	}
}

func TestUpdateGlossSetsRefusesAndClears(t *testing.T) {
	repoDir, store := setupTestRepo(t)
	setupTickConfig(t, repoDir)
	quietStderr(t)

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"create", "Running the done is the authoritative verdict on a finding"})
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	id := strings.TrimSpace(out)

	if _, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"update", id, "--gloss", "done decides gating"})
	}); err != nil {
		t.Fatalf("update --gloss: %v", err)
	}
	if got, _ := store.Read(id); got.Gloss != "done decides gating" {
		t.Errorf("after set: gloss %q", got.Gloss)
	}

	_, err = captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"update", id, "--gloss", strings.Repeat("g", 41)})
	})
	if GetExitCode(err) != ExitUsage {
		t.Errorf("overlong update: got %v, want a usage refusal", err)
	}
	if got, _ := store.Read(id); got.Gloss != "done decides gating" {
		t.Errorf("a refused update changed the gloss to %q", got.Gloss)
	}

	if _, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"update", id, "--gloss", ""})
	}); err != nil {
		t.Fatalf("update --gloss \"\": %v", err)
	}
	if got, _ := store.Read(id); got.Gloss != "" {
		t.Errorf("--gloss \"\" did not clear: %q", got.Gloss)
	}
}

func TestShowAndListPrintTheGloss(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"create", "Add Google OAuth login to signup and settings", "--gloss", "add google oauth login"})
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	id := strings.TrimSpace(out)

	shown, err := captureStdoutStr(t, func() error { return ExecuteArgs([]string{"show", id}) })
	if err != nil {
		t.Fatalf("show: %v", err)
	}
	if !strings.Contains(shown, "(add google oauth login)") || !strings.Contains(shown, "Add Google OAuth login to signup") {
		t.Errorf("show does not print both the gloss and the full title:\n%s", shown)
	}

	listed, err := captureStdoutStr(t, func() error { return ExecuteArgs([]string{"list"}) })
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if !strings.Contains(listed, "add google oauth login") {
		t.Errorf("list does not print the gloss:\n%s", listed)
	}
}
