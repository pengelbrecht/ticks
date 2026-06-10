package tick

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// writeLearnings writes content to <dir>/learnings.md, creating dir as needed.
func writeLearnings(t *testing.T, dir, content string) {
	t.Helper()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "learnings.md"), []byte(content), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
}

// makeLines returns a string with n non-empty lines.
func makeLines(n int) string {
	lines := make([]string, n)
	for i := range lines {
		lines[i] = "line"
	}
	return strings.Join(lines, "\n") + "\n"
}

func TestCheckLearningsCap_MissingFile(t *testing.T) {
	dir := t.TempDir()
	lines, over, err := CheckLearningsCap(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if over {
		t.Errorf("over = true, want false for missing file")
	}
	if lines != 0 {
		t.Errorf("lines = %d, want 0 for missing file", lines)
	}
}

func TestCheckLearningsCap_EmptyFile(t *testing.T) {
	dir := t.TempDir()
	writeLearnings(t, dir, "")
	lines, over, err := CheckLearningsCap(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if over {
		t.Errorf("over = true, want false for empty file")
	}
	// Convention: empty file → 0 lines
	if lines != 0 {
		t.Errorf("lines = %d, want 0 for empty file", lines)
	}
}

func TestCheckLearningsCap_ExactlyAtCap(t *testing.T) {
	dir := t.TempDir()
	writeLearnings(t, dir, makeLines(LearningsCap))
	lines, over, err := CheckLearningsCap(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if over {
		t.Errorf("over = true, want false for exactly %d lines", LearningsCap)
	}
	if lines != LearningsCap {
		t.Errorf("lines = %d, want %d", lines, LearningsCap)
	}
}

func TestCheckLearningsCap_OneOverCap(t *testing.T) {
	dir := t.TempDir()
	n := LearningsCap + 1
	writeLearnings(t, dir, makeLines(n))
	lines, over, err := CheckLearningsCap(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !over {
		t.Errorf("over = false, want true for %d lines", n)
	}
	if lines != n {
		t.Errorf("lines = %d, want %d", lines, n)
	}
}

func TestCheckLearningsCap_WellOverCap(t *testing.T) {
	dir := t.TempDir()
	n := 200
	writeLearnings(t, dir, makeLines(n))
	lines, over, err := CheckLearningsCap(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !over {
		t.Errorf("over = false, want true for %d lines", n)
	}
	if lines != n {
		t.Errorf("lines = %d, want %d", lines, n)
	}
}

func TestCheckLearningsCap_LearningsCapConstant(t *testing.T) {
	if LearningsCap != 150 {
		t.Errorf("LearningsCap = %d, want 150", LearningsCap)
	}
}
