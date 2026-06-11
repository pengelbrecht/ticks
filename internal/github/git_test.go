package github

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestEnsureGitAttributes(t *testing.T) {
	t.Run("empty file gets both lines", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, ".gitattributes")

		if err := EnsureGitAttributes(dir); err != nil {
			t.Fatalf("ensure: %v", err)
		}

		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read: %v", err)
		}
		contents := string(data)
		if !containsLine(contents, mergeAttributeLine) {
			t.Errorf("expected issues merge driver line in .gitattributes")
		}
		if !containsLine(contents, mergeActivityAttributeLine) {
			t.Errorf("expected activity merge driver line in .gitattributes")
		}
	})

	t.Run("only issues line present, activity line added without duplicating issues", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, ".gitattributes")

		if err := os.WriteFile(path, []byte(mergeAttributeLine+"\n"), 0o644); err != nil {
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
			t.Errorf("expected issues merge driver line in .gitattributes")
		}
		if !containsLine(contents, mergeActivityAttributeLine) {
			t.Errorf("expected activity merge driver line in .gitattributes")
		}
		// Count occurrences of the issues line — must not be duplicated
		count := 0
		for _, line := range splitLines(contents) {
			if line == mergeAttributeLine {
				count++
			}
		}
		if count != 1 {
			t.Errorf("issues merge driver line appears %d times, want exactly 1", count)
		}
	})

	t.Run("both lines already present, idempotent", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, ".gitattributes")

		initial := mergeAttributeLine + "\n" + mergeActivityAttributeLine + "\n"
		if err := os.WriteFile(path, []byte(initial), 0o644); err != nil {
			t.Fatalf("write: %v", err)
		}

		if err := EnsureGitAttributes(dir); err != nil {
			t.Fatalf("ensure: %v", err)
		}

		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read: %v", err)
		}
		if string(data) != initial {
			t.Errorf("file was modified when both lines already present\ngot:  %q\nwant: %q", string(data), initial)
		}
	})
}

func TestConfigureMergeDriver(t *testing.T) {
	dir := setupGitRepo(t)

	if err := ConfigureMergeDriver(dir); err != nil {
		t.Fatalf("ConfigureMergeDriver: %v", err)
	}

	// Verify tick driver
	checkGitConfig(t, dir, "merge.tick.driver", "tk merge-file %O %A %B %P")
	checkGitConfig(t, dir, "merge.tick.name", "tick JSON merge")

	// Verify tick-activity driver
	checkGitConfig(t, dir, "merge.tick-activity.driver", "tk merge-activity %O %A %B %P")
	checkGitConfig(t, dir, "merge.tick-activity.name", "tick-activity JSONL merge")
}

// setupGitRepo creates a temporary directory with an initialized git repo.
func setupGitRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, out)
		}
	}

	run("init")
	run("config", "user.email", "test@test.com")
	run("config", "user.name", "Test User")
	return dir
}

// checkGitConfig asserts that a git config key has the expected value.
func checkGitConfig(t *testing.T, dir, key, want string) {
	t.Helper()
	cmd := exec.Command("git", "config", "--get", key)
	cmd.Dir = dir
	out, err := cmd.Output()
	if err != nil {
		t.Errorf("git config --get %s: %v", key, err)
		return
	}
	got := strings.TrimSpace(string(out))
	if got != want {
		t.Errorf("git config %s = %q, want %q", key, got, want)
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
