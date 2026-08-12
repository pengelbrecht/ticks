package cmd

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestSkillsDiffIdenticalExitsZero checks a freshly installed skill diffs
// clean against the embedded bundle: exit 0, "no drift" in the output.
func TestSkillsDiffIdenticalExitsZero(t *testing.T) {
	prevVersion := Version
	SetVersion("9.9.9-test")
	t.Cleanup(func() { SetVersion(prevVersion) })

	dir := filepath.Join(t.TempDir(), "ticks")
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", dir}); err != nil {
		t.Fatalf("install: %v", err)
	}

	out, err := captureStdoutArgs(t, []string{"skills", "diff", "ticks", "--dir", dir})
	if err != nil {
		t.Fatalf("skills diff on an identical install: %v", err)
	}
	if code := GetExitCode(err); code != ExitSuccess {
		t.Errorf("exit code = %d, want %d", code, ExitSuccess)
	}
	if !strings.Contains(out, "no drift") {
		t.Errorf("expected %q in output, got %q", "no drift", out)
	}
}

// TestSkillsDiffChangedFileExitsOne checks editing an installed file is
// reported as drift with exit 1, via an explicit ExitError.
func TestSkillsDiffChangedFileExitsOne(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "ticks")
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", dir}); err != nil {
		t.Fatalf("install: %v", err)
	}

	target := filepath.Join(dir, "SKILL.md")
	data, rerr := os.ReadFile(target)
	if rerr != nil {
		t.Fatalf("read: %v", rerr)
	}
	if err := os.WriteFile(target, append(data, []byte("\nedited\n")...), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	out, err := captureStdoutArgs(t, []string{"skills", "diff", "ticks", "--dir", dir})
	if err == nil {
		t.Fatal("expected an error for a diff with drift")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d (generic/drift): %v", code, ExitGeneric, err)
	}
	if !strings.Contains(out, "SKILL.md") {
		t.Errorf("expected changed-file output to name SKILL.md, got %q", out)
	}
}

// TestSkillsDiffVersionMismatchExitsOne checks that a byte-identical
// install still reports drift (exit 1) when the stamped version doesn't
// match this binary's version.
func TestSkillsDiffVersionMismatchExitsOne(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "ticks")

	prevVersion := Version
	SetVersion("1.0.0-test")
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", dir}); err != nil {
		t.Fatalf("install: %v", err)
	}

	SetVersion("2.0.0-test")
	t.Cleanup(func() { SetVersion(prevVersion) })

	out, err := captureStdoutArgs(t, []string{"skills", "diff", "ticks", "--dir", dir})
	if err == nil {
		t.Fatal("expected an error for a version-mismatched diff")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d (generic/drift): %v", code, ExitGeneric, err)
	}
	if !strings.Contains(out, "1.0.0-test") || !strings.Contains(out, "2.0.0-test") {
		t.Errorf("expected both versions named in output, got %q", out)
	}
}

// TestSkillsDiffUnknownSkillExitsNotFound checks an unknown skill name is
// classified distinctly from drift.
func TestSkillsDiffUnknownSkillExitsNotFound(t *testing.T) {
	_, err := captureStdoutArgs(t, []string{"skills", "diff", "no-such-skill", "--dir", t.TempDir()})
	if err == nil {
		t.Fatal("expected an error for an unknown skill")
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Errorf("exit code = %d, want %d (not found): %v", code, ExitNotFound, err)
	}
}

// TestSkillsDiffFlagsResetAcrossExecutions checks --dir on 'skills diff'
// does not leak into the next in-process ExecuteArgs call.
func TestSkillsDiffFlagsResetAcrossExecutions(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "ticks")
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", dir}); err != nil {
		t.Fatalf("install: %v", err)
	}
	if _, err := captureStdoutArgs(t, []string{"skills", "diff", "ticks", "--dir", dir}); err != nil {
		t.Fatalf("first diff exec: %v", err)
	}
	if skillsDiffDir != dir {
		t.Fatalf("expected skillsDiffDir set after first exec, got %q", skillsDiffDir)
	}

	if _, err := captureStdoutArgs(t, []string{"skills", "list"}); err != nil {
		t.Fatalf("second exec: %v", err)
	}
	if skillsDiffDir != "" {
		t.Errorf("expected skillsDiffDir reset before second exec, got %q", skillsDiffDir)
	}
}
