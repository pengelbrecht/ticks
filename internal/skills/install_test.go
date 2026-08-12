package skills

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func withVersion(t *testing.T, v string) {
	t.Helper()
	orig := Version()
	SetVersion(v)
	t.Cleanup(func() { SetVersion(orig) })
}

func TestInstallFreshWritesTreeAndStamp(t *testing.T) {
	withVersion(t, "1.0.0-test")
	dir := filepath.Join(t.TempDir(), "ticks")

	stamp, err := Install("ticks", dir, false)
	if err != nil {
		t.Fatalf("Install: %v", err)
	}
	if stamp.Skill != "ticks" || stamp.Version != "1.0.0-test" {
		t.Errorf("stamp = %+v, want skill=ticks version=1.0.0-test", stamp)
	}
	if stamp.InstalledAt.IsZero() {
		t.Errorf("stamp.InstalledAt is zero")
	}

	want, err := Read("ticks", "SKILL.md")
	if err != nil {
		t.Fatalf("Read: %v", err)
	}
	got, err := os.ReadFile(filepath.Join(dir, "SKILL.md"))
	if err != nil {
		t.Fatalf("read installed SKILL.md: %v", err)
	}
	if string(got) != string(want) {
		t.Errorf("installed SKILL.md differs from bundle")
	}

	onDisk, err := ReadStamp(dir)
	if err != nil {
		t.Fatalf("ReadStamp: %v", err)
	}
	if onDisk != stamp {
		t.Errorf("ReadStamp(dir) = %+v, want %+v", onDisk, stamp)
	}
}

func TestInstallIntoExistingEmptyDirNeedsNoStamp(t *testing.T) {
	dir := t.TempDir() // exists, empty, no stamp
	if _, err := Install("ticks", dir, false); err != nil {
		t.Fatalf("Install into empty existing dir: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "SKILL.md")); err != nil {
		t.Errorf("expected SKILL.md installed: %v", err)
	}
}

func TestInstallUpgradesStampedDirAndDropsExtras(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "ticks")

	withVersion(t, "1.0.0-test")
	if _, err := Install("ticks", dir, false); err != nil {
		t.Fatalf("first install: %v", err)
	}

	// Simulate leftover content from a previous version that the new bundle
	// no longer ships.
	extra := filepath.Join(dir, "stale-leftover.md")
	if err := os.WriteFile(extra, []byte("stale"), 0o644); err != nil {
		t.Fatalf("write extra: %v", err)
	}

	withVersion(t, "2.0.0-test")
	stamp, err := Install("ticks", dir, false)
	if err != nil {
		t.Fatalf("upgrade install: %v", err)
	}
	if stamp.Version != "2.0.0-test" {
		t.Errorf("stamp.Version = %q, want 2.0.0-test", stamp.Version)
	}

	if _, err := os.Stat(extra); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("expected stale-leftover.md to be gone after upgrade, stat err = %v", err)
	}

	onDisk, err := ReadStamp(dir)
	if err != nil {
		t.Fatalf("ReadStamp: %v", err)
	}
	if onDisk.Version != "2.0.0-test" {
		t.Errorf("on-disk stamp version = %q, want 2.0.0-test", onDisk.Version)
	}
}

func TestInstallRefusesUnmanagedDir(t *testing.T) {
	dir := t.TempDir()
	handEdited := filepath.Join(dir, "notes.txt")
	if err := os.WriteFile(handEdited, []byte("hand-written"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	_, err := Install("ticks", dir, false)
	if err == nil {
		t.Fatal("expected Install to refuse an unmanaged non-empty directory")
	}
	if !errors.Is(err, ErrUnmanaged) {
		t.Errorf("err = %v, want it to wrap ErrUnmanaged", err)
	}

	// The refusal must not touch the existing content.
	data, rerr := os.ReadFile(handEdited)
	if rerr != nil {
		t.Fatalf("read notes.txt after refused install: %v", rerr)
	}
	if string(data) != "hand-written" {
		t.Errorf("notes.txt content changed after refused install: %q", data)
	}
	if _, err := os.Stat(filepath.Join(dir, "SKILL.md")); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("expected no SKILL.md written after refused install, stat err = %v", err)
	}
}

func TestInstallForceOverridesUnmanagedRefusal(t *testing.T) {
	dir := t.TempDir()
	handEdited := filepath.Join(dir, "notes.txt")
	if err := os.WriteFile(handEdited, []byte("hand-written"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	if _, err := Install("ticks", dir, true); err != nil {
		t.Fatalf("Install with force: %v", err)
	}

	if _, err := os.Stat(filepath.Join(dir, "SKILL.md")); err != nil {
		t.Errorf("expected SKILL.md installed with --force: %v", err)
	}
	if _, err := os.Stat(handEdited); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("expected notes.txt gone after forced install (nothing preserved), stat err = %v", err)
	}
}

func TestInstallUnknownSkillErrors(t *testing.T) {
	if _, err := Install("no-such-skill", t.TempDir(), false); err == nil {
		t.Error("Install(no-such-skill) = nil error, want error")
	}
}

func TestDefaultDirUsesClaudeSkillsConvention(t *testing.T) {
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skipf("no home directory available: %v", err)
	}
	got, err := DefaultDir("ticks")
	if err != nil {
		t.Fatalf("DefaultDir: %v", err)
	}
	want := filepath.Join(home, ".claude", "skills", "ticks")
	if got != want {
		t.Errorf("DefaultDir(ticks) = %q, want %q", got, want)
	}
}
