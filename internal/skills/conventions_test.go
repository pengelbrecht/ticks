package skills

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectConventionDirsNeitherExists(t *testing.T) {
	root := t.TempDir()
	got, err := DetectConventionDirs(root)
	if err != nil {
		t.Fatalf("DetectConventionDirs: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("got %v, want none detected", got)
	}
}

func TestDetectConventionDirsClaudeOnly(t *testing.T) {
	root := t.TempDir()
	claude := filepath.Join(root, ".claude", "skills")
	if err := os.MkdirAll(claude, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	got, err := DetectConventionDirs(root)
	if err != nil {
		t.Fatalf("DetectConventionDirs: %v", err)
	}
	if len(got) != 1 || got[0] != claude {
		t.Errorf("got %v, want [%s]", got, claude)
	}
}

func TestDetectConventionDirsAgentOnly(t *testing.T) {
	root := t.TempDir()
	agent := filepath.Join(root, ".agents", "skills")
	if err := os.MkdirAll(agent, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	got, err := DetectConventionDirs(root)
	if err != nil {
		t.Fatalf("DetectConventionDirs: %v", err)
	}
	if len(got) != 1 || got[0] != agent {
		t.Errorf("got %v, want [%s]", got, agent)
	}
}

func TestDetectConventionDirsBoth(t *testing.T) {
	root := t.TempDir()
	claude := filepath.Join(root, ".claude", "skills")
	agent := filepath.Join(root, ".agents", "skills")
	if err := os.MkdirAll(claude, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.MkdirAll(agent, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	got, err := DetectConventionDirs(root)
	if err != nil {
		t.Fatalf("DetectConventionDirs: %v", err)
	}
	want := []string{claude, agent}
	if len(got) != 2 || got[0] != want[0] || got[1] != want[1] {
		t.Errorf("got %v, want %v (claude before agent)", got, want)
	}
}

func TestDetectConventionDirsIgnoresNonDirs(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, ".claude"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	// .claude/skills exists but is a file, not a directory: not a valid
	// convention target.
	if err := os.WriteFile(filepath.Join(root, ".claude", "skills"), []byte("oops"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	got, err := DetectConventionDirs(root)
	if err != nil {
		t.Fatalf("DetectConventionDirs: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("got %v, want none detected (skills is a file, not a dir)", got)
	}
}
