package skills

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDiffDirIdenticalAfterInstall(t *testing.T) {
	withVersion(t, "1.0.0-test")
	dir := filepath.Join(t.TempDir(), "ticks")
	if _, err := Install("ticks", dir, false); err != nil {
		t.Fatalf("Install: %v", err)
	}

	diff, err := DiffDir("ticks", dir)
	if err != nil {
		t.Fatalf("DiffDir: %v", err)
	}
	if !diff.OK() {
		t.Errorf("expected DiffDir to report no drift right after install, got %+v\n%s", diff, diff)
	}
	if diff.StampVersion != "1.0.0-test" || diff.BundleVersion != "1.0.0-test" {
		t.Errorf("versions = installed:%q bundle:%q, want both 1.0.0-test", diff.StampVersion, diff.BundleVersion)
	}
}

func TestDiffDirDetectsChangedFile(t *testing.T) {
	withVersion(t, "1.0.0-test")
	dir := filepath.Join(t.TempDir(), "ticks")
	if _, err := Install("ticks", dir, false); err != nil {
		t.Fatalf("Install: %v", err)
	}

	target := filepath.Join(dir, "SKILL.md")
	data, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if err := os.WriteFile(target, append(data, []byte("\nedited\n")...), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	diff, err := DiffDir("ticks", dir)
	if err != nil {
		t.Fatalf("DiffDir: %v", err)
	}
	if diff.OK() {
		t.Fatal("expected drift after editing a file")
	}
	if !contains(diff.Changed, "SKILL.md") {
		t.Errorf("Changed = %v, want SKILL.md", diff.Changed)
	}
	if len(diff.Added) != 0 || len(diff.Removed) != 0 {
		t.Errorf("expected only Changed to be populated, got Added=%v Removed=%v", diff.Added, diff.Removed)
	}
}

func TestDiffDirDetectsAddedAndRemovedFiles(t *testing.T) {
	withVersion(t, "1.0.0-test")
	dir := filepath.Join(t.TempDir(), "ticks")
	if _, err := Install("ticks", dir, false); err != nil {
		t.Fatalf("Install: %v", err)
	}

	if err := os.Remove(filepath.Join(dir, "references", "code-smells.md")); err != nil {
		t.Fatalf("remove: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "extra.md"), []byte("x"), 0o644); err != nil {
		t.Fatalf("write extra: %v", err)
	}

	diff, err := DiffDir("ticks", dir)
	if err != nil {
		t.Fatalf("DiffDir: %v", err)
	}
	if diff.OK() {
		t.Fatal("expected drift after add/remove")
	}
	if !contains(diff.Removed, "references/code-smells.md") {
		t.Errorf("Removed = %v, want references/code-smells.md", diff.Removed)
	}
	if !contains(diff.Added, "extra.md") {
		t.Errorf("Added = %v, want extra.md", diff.Added)
	}
}

func TestDiffDirVersionMismatchAloneIsDrift(t *testing.T) {
	withVersion(t, "1.0.0-test")
	dir := filepath.Join(t.TempDir(), "ticks")
	if _, err := Install("ticks", dir, false); err != nil {
		t.Fatalf("Install: %v", err)
	}

	// No files touched, but the binary now reports a different version.
	withVersion(t, "2.0.0-test")

	diff, err := DiffDir("ticks", dir)
	if err != nil {
		t.Fatalf("DiffDir: %v", err)
	}
	if diff.OK() {
		t.Fatal("expected drift when stamp version differs from bundle version, even with identical files")
	}
	if len(diff.Added) != 0 || len(diff.Removed) != 0 || len(diff.Changed) != 0 {
		t.Errorf("expected no file-level drift, got Added=%v Removed=%v Changed=%v", diff.Added, diff.Removed, diff.Changed)
	}
	if diff.StampVersion != "1.0.0-test" || diff.BundleVersion != "2.0.0-test" {
		t.Errorf("versions = installed:%q bundle:%q, want 1.0.0-test / 2.0.0-test", diff.StampVersion, diff.BundleVersion)
	}
}

func TestDiffDirMissingDirIsError(t *testing.T) {
	if _, err := DiffDir("ticks", filepath.Join(t.TempDir(), "nope")); err == nil {
		t.Error("DiffDir(missing dir) = nil error, want error")
	}
}

func TestDiffDirUnknownSkillErrors(t *testing.T) {
	if _, err := DiffDir("no-such-skill", t.TempDir()); err == nil {
		t.Error("DiffDir(no-such-skill) = nil error, want error")
	}
}

func TestDiffDirUnstampedDirReportsDrift(t *testing.T) {
	dir := t.TempDir()
	// A directory that happens to have byte-identical content but was never
	// installed by tk (no stamp) is still reported as drift: the version
	// comparison can't be made.
	if _, err := Install("ticks", dir, false); err != nil {
		t.Fatalf("Install: %v", err)
	}
	if err := os.Remove(filepath.Join(dir, StampFile)); err != nil {
		t.Fatalf("remove stamp: %v", err)
	}

	diff, err := DiffDir("ticks", dir)
	if err != nil {
		t.Fatalf("DiffDir: %v", err)
	}
	if diff.OK() {
		t.Fatal("expected drift for an unstamped directory")
	}
	if diff.StampVersion != "" {
		t.Errorf("StampVersion = %q, want empty for a missing stamp", diff.StampVersion)
	}
}
