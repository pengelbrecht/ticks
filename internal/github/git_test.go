package github

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestEnsureGitAttributes(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".gitattributes")

	if err := os.WriteFile(path, []byte("*.go text\n"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	if err := EnsureGitAttributes(dir); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	contents := string(data)
	if !containsLine(contents, mergeAttributeLine) {
		t.Fatalf("expected merge driver line in .gitattributes")
	}

	if err := EnsureGitAttributes(dir); err != nil {
		t.Fatalf("ensure second time: %v", err)
	}
}

// setupGitRepo creates a minimal git repo in a temp directory and returns its path.
func setupGitRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	runCmd := func(args ...string) {
		t.Helper()
		cmd := exec.Command(args[0], args[1:]...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("command %v: %v\n%s", args, err, out)
		}
	}
	runCmd("git", "init")
	runCmd("git", "config", "user.email", "test@example.com")
	runCmd("git", "config", "user.name", "Test User")
	return dir
}

func TestCheckAndInstallMergeDrivers_InstallsWhenAbsent(t *testing.T) {
	dir := setupGitRepo(t)

	// Drivers should not be configured yet.
	if err := CheckAndInstallMergeDrivers(dir); err != nil {
		t.Fatalf("CheckAndInstallMergeDrivers: %v", err)
	}

	// Verify the driver was actually installed.
	cmd := exec.Command("git", "config", "--get", "merge.tick.driver")
	cmd.Dir = dir
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("git config --get merge.tick.driver: %v", err)
	}
	if strings.TrimSpace(string(out)) == "" {
		t.Fatal("expected merge.tick.driver to be set after install")
	}
}

func TestCheckAndInstallMergeDrivers_IdempotentWhenAlreadyConfigured(t *testing.T) {
	dir := setupGitRepo(t)

	// Install drivers once.
	if err := CheckAndInstallMergeDrivers(dir); err != nil {
		t.Fatalf("first CheckAndInstallMergeDrivers: %v", err)
	}

	// Read the driver value after the first install.
	cmd := exec.Command("git", "config", "--get", "merge.tick.driver")
	cmd.Dir = dir
	out1, err := cmd.Output()
	if err != nil {
		t.Fatalf("git config after first install: %v", err)
	}

	// Install again — must be a no-op, must return nil.
	if err := CheckAndInstallMergeDrivers(dir); err != nil {
		t.Fatalf("second CheckAndInstallMergeDrivers: %v", err)
	}

	// Driver value must be unchanged.
	cmd2 := exec.Command("git", "config", "--get", "merge.tick.driver")
	cmd2.Dir = dir
	out2, err := cmd2.Output()
	if err != nil {
		t.Fatalf("git config after second install: %v", err)
	}
	if string(out1) != string(out2) {
		t.Fatalf("driver value changed: %q -> %q", strings.TrimSpace(string(out1)), strings.TrimSpace(string(out2)))
	}
}

func TestCheckAndInstallMergeDrivers_NotAGitRepo(t *testing.T) {
	// A plain temp dir (no .git) — must return nil silently.
	dir := t.TempDir()
	if err := CheckAndInstallMergeDrivers(dir); err != nil {
		t.Fatalf("expected nil for non-git dir, got: %v", err)
	}
}

func containsLine(contents, line string) bool {
	for _, candidate := range splitLines(contents) {
		if candidate == line {
			return true
		}
	}
	return false
}

func splitLines(contents string) []string {
	var lines []string
	start := 0
	for i, r := range contents {
		if r == '\n' {
			lines = append(lines, contents[start:i])
			start = i + 1
		}
	}
	if start < len(contents) {
		lines = append(lines, contents[start:])
	}
	return lines
}
