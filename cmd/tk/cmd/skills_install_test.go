package cmd

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/skills"
)

// TestSkillsInstallWritesTreeAndStamp checks a fresh 'tk skills install
// <name> --dir PATH' writes the skill files and a version stamp, and never
// touches anything outside the given --dir.
func TestSkillsInstallWritesTreeAndStamp(t *testing.T) {
	prevVersion := Version
	SetVersion("9.9.9-test")
	t.Cleanup(func() { SetVersion(prevVersion) })

	dir := filepath.Join(t.TempDir(), "ticks")
	out, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", dir})
	if err != nil {
		t.Fatalf("skills install: %v", err)
	}
	if !strings.Contains(out, "ticks") || !strings.Contains(out, dir) {
		t.Errorf("expected install output to mention the skill and target dir, got %q", out)
	}

	if _, statErr := os.Stat(filepath.Join(dir, "SKILL.md")); statErr != nil {
		t.Errorf("expected SKILL.md written: %v", statErr)
	}
	stamp, serr := skills.ReadStamp(dir)
	if serr != nil {
		t.Fatalf("ReadStamp: %v", serr)
	}
	if stamp.Version != "9.9.9-test" || stamp.Skill != "ticks" {
		t.Errorf("stamp = %+v, want skill=ticks version=9.9.9-test", stamp)
	}
}

// TestSkillsInstallUnknownSkillExitsNotFound checks an unknown skill name is
// an explicit ExitError(ExitNotFound).
func TestSkillsInstallUnknownSkillExitsNotFound(t *testing.T) {
	dir := t.TempDir()
	_, err := captureStdoutArgs(t, []string{"skills", "install", "no-such-skill", "--dir", dir})
	if err == nil {
		t.Fatal("expected an error for an unknown skill")
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Errorf("exit code = %d, want %d (not found): %v", code, ExitNotFound, err)
	}
}

// TestSkillsInstallRefusesUnmanagedDirThenForceOverrides checks the
// unmanaged-directory refusal is an explicit usage-classified ExitError, and
// that --force overrides it.
func TestSkillsInstallRefusesUnmanagedDirThenForceOverrides(t *testing.T) {
	dir := t.TempDir()
	handEdited := filepath.Join(dir, "notes.txt")
	if err := os.WriteFile(handEdited, []byte("hand-written"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	_, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", dir})
	if err == nil {
		t.Fatal("expected refusal installing over an unmanaged directory")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
	}
	if _, statErr := os.ReadFile(handEdited); statErr != nil {
		t.Errorf("expected notes.txt to survive the refused install: %v", statErr)
	}

	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", dir, "--force"}); err != nil {
		t.Fatalf("skills install --force: %v", err)
	}
	if _, statErr := os.Stat(filepath.Join(dir, "SKILL.md")); statErr != nil {
		t.Errorf("expected SKILL.md written after --force install: %v", statErr)
	}
}

// TestSkillsInstallUpgradesStampedDir checks re-installing over a
// tk-stamped directory succeeds without --force and updates the stamp.
func TestSkillsInstallUpgradesStampedDir(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "ticks")

	prevVersion := Version
	SetVersion("1.0.0-test")
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", dir}); err != nil {
		t.Fatalf("first install: %v", err)
	}

	SetVersion("2.0.0-test")
	t.Cleanup(func() { SetVersion(prevVersion) })
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", dir}); err != nil {
		t.Fatalf("upgrade install: %v", err)
	}

	stamp, serr := skills.ReadStamp(dir)
	if serr != nil {
		t.Fatalf("ReadStamp: %v", serr)
	}
	if stamp.Version != "2.0.0-test" {
		t.Errorf("stamp.Version = %q after upgrade, want 2.0.0-test", stamp.Version)
	}
}

// TestSkillsInstallFlagsResetAcrossExecutions checks --dir/--force do not
// leak into the next in-process ExecuteArgs call, per ResetFlags() in
// root.go. The default (no --dir) install target — ~/.claude/skills/<name>
// — is covered directly against skills.DefaultDir in internal/skills'
// install_test.go; every cmd-layer test here passes --dir explicitly so
// tests never touch the real ~/.claude.
func TestSkillsInstallFlagsResetAcrossExecutions(t *testing.T) {
	dir := t.TempDir()
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", dir, "--force"}); err != nil {
		t.Fatalf("first exec: %v", err)
	}
	if skillsInstallDir != dir || !skillsInstallForce {
		t.Fatalf("expected flags set after first exec: dir=%q force=%v", skillsInstallDir, skillsInstallForce)
	}

	other := filepath.Join(t.TempDir(), "ticks")
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", other}); err != nil {
		t.Fatalf("second exec: %v", err)
	}
	if skillsInstallForce {
		t.Errorf("expected --force reset before second exec, got %v", skillsInstallForce)
	}
}
