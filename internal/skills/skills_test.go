package skills

import (
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

// repoRoot walks up from the test's working directory until it finds go.mod.
func repoRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatalf("go.mod not found above %s", dir)
		}
		dir = parent
	}
}

func TestList(t *testing.T) {
	got := List()
	if len(got) != 1 || got[0] != "ticks" {
		t.Fatalf("List() = %v, want [ticks]", got)
	}
}

func TestFilesEnumeratesFullTree(t *testing.T) {
	fsys, err := Files("ticks")
	if err != nil {
		t.Fatalf("Files: %v", err)
	}

	var embedded []string
	err = fs.WalkDir(fsys, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			embedded = append(embedded, path)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk embedded: %v", err)
	}
	sort.Strings(embedded)

	// Enumerate the on-disk tree the bundle is built from.
	diskRoot := filepath.Join(repoRoot(t), "skills", "ticks")
	var onDisk []string
	err = filepath.WalkDir(diskRoot, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(diskRoot, path)
		if err != nil {
			return err
		}
		onDisk = append(onDisk, filepath.ToSlash(rel))
		return nil
	})
	if err != nil {
		t.Fatalf("walk disk: %v", err)
	}
	sort.Strings(onDisk)

	if strings.Join(embedded, "\n") != strings.Join(onDisk, "\n") {
		t.Fatalf("embedded tree != on-disk tree\nembedded:\n%s\non-disk:\n%s",
			strings.Join(embedded, "\n"), strings.Join(onDisk, "\n"))
	}

	// The bundle must carry SKILL.md, every references/*.md and the runners schema.
	hasSchema := false
	mdCount := 0
	for _, p := range embedded {
		switch {
		case p == "references/runners-config.schema.json":
			hasSchema = true
		case strings.HasPrefix(p, "references/") && strings.HasSuffix(p, ".md"):
			mdCount++
		}
	}
	if !contains(embedded, "SKILL.md") {
		t.Errorf("bundle missing SKILL.md")
	}
	if !hasSchema {
		t.Errorf("bundle missing references/runners-config.schema.json")
	}
	if mdCount < 10 {
		t.Errorf("bundle has %d references/*.md files, want >= 10", mdCount)
	}
}

// TestLoadBearingFilesPresent guards against a bundle that enumerates the tree
// but ships truncated or placeholder content. See doc.go on why an
// embed-vs-disk comparison alone cannot be a freshness guard.
func TestLoadBearingFilesPresent(t *testing.T) {
	// path -> minimum plausible size in bytes (well below current sizes, so
	// ordinary edits don't churn this table; a stub or empty file trips it).
	floors := map[string]int{
		"SKILL.md":                              8000,
		"references/agent-runner.md":            8000,
		"references/claude-runner.md":           2000,
		"references/codex-runner.md":            1000,
		"references/herdr-runner.md":            8000,
		"references/herdr-kinds.md":             4000,
		"references/pi-runner.md":               2000,
		"references/prime-runner.md":            4000,
		"references/runners-config.md":          4000,
		"references/runners-config.schema.json": 2000,
		"references/tick-patterns.md":           2000,
		"references/tk-commands.md":             2000,
		"references/big-picture.md":             1000,
		"references/code-smells.md":             1000,
	}
	for path, floor := range floors {
		data, err := Read("ticks", path)
		if err != nil {
			t.Errorf("Read(ticks, %s): %v", path, err)
			continue
		}
		if len(data) < floor {
			t.Errorf("Read(ticks, %s): %d bytes, want >= %d", path, len(data), floor)
		}
	}
}

func TestPaths(t *testing.T) {
	paths, err := Paths("ticks")
	if err != nil {
		t.Fatalf("Paths: %v", err)
	}
	if !sort.StringsAreSorted(paths) {
		t.Errorf("Paths not sorted: %v", paths)
	}
	if !contains(paths, "SKILL.md") || !contains(paths, "references/runners-config.schema.json") {
		t.Errorf("Paths = %v, want SKILL.md and the runners schema", paths)
	}
	if _, err := Paths("nope"); err == nil {
		t.Errorf("Paths(nope) = nil error, want error")
	}
}

func TestReadMatchesDisk(t *testing.T) {
	want, err := os.ReadFile(filepath.Join(repoRoot(t), "skills", "ticks", "SKILL.md"))
	if err != nil {
		t.Fatalf("read disk SKILL.md: %v", err)
	}
	got, err := Read("ticks", "SKILL.md")
	if err != nil {
		t.Fatalf("Read: %v", err)
	}
	if string(got) != string(want) {
		t.Errorf("embedded SKILL.md differs from disk copy")
	}
}

func TestUnknownSkill(t *testing.T) {
	if _, err := Files("nope"); err == nil {
		t.Errorf("Files(nope) = nil error, want error")
	}
	if _, err := Read("nope", "SKILL.md"); err == nil {
		t.Errorf("Read(nope, ...) = nil error, want error")
	}
	if _, err := Read("ticks", "does-not-exist.md"); err == nil {
		t.Errorf("Read(ticks, missing) = nil error, want error")
	}
	if _, err := Read("ticks", "../../go.mod"); err == nil {
		t.Errorf("Read with traversal path = nil error, want error")
	}
}

func TestVersionDefaultsToDev(t *testing.T) {
	if got := Version(); got == "" {
		t.Fatalf("Version() is empty")
	}
	orig := Version()
	t.Cleanup(func() { SetVersion(orig) })
	SetVersion("1.2.3")
	if got := Version(); got != "1.2.3" {
		t.Fatalf("Version() = %q after SetVersion, want 1.2.3", got)
	}
	SetVersion("")
	if got := Version(); got != devVersion {
		t.Fatalf("Version() = %q after SetVersion(\"\"), want %q", got, devVersion)
	}
}

func TestVerifyRepoTree(t *testing.T) {
	drift, err := Verify(repoRoot(t))
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if !drift.OK() {
		t.Fatalf("repo tree drifted from embedded bundle:\n%s", drift)
	}
	if drift.String() == "" {
		t.Errorf("Drift.String() on a clean result should still describe the result")
	}
}

func TestVerifyDetectsDrift(t *testing.T) {
	base := repoRoot(t)

	newCopy := func(t *testing.T) string {
		t.Helper()
		dst := t.TempDir()
		copyTree(t, filepath.Join(base, "skills"), filepath.Join(dst, "skills"))
		drift, err := Verify(dst)
		if err != nil {
			t.Fatalf("Verify(fresh copy): %v", err)
		}
		if !drift.OK() {
			t.Fatalf("fresh copy already drifted:\n%s", drift)
		}
		return dst
	}

	t.Run("changed file", func(t *testing.T) {
		dir := newCopy(t)
		target := filepath.Join(dir, "skills", "ticks", "SKILL.md")
		data, err := os.ReadFile(target)
		if err != nil {
			t.Fatalf("read: %v", err)
		}
		if err := os.WriteFile(target, append(data, []byte("\ndrift\n")...), 0o644); err != nil {
			t.Fatalf("write: %v", err)
		}
		drift, err := Verify(dir)
		if err != nil {
			t.Fatalf("Verify: %v", err)
		}
		if drift.OK() {
			t.Fatalf("Verify did not detect a changed file")
		}
		if !contains(drift.Differing, "ticks/SKILL.md") {
			t.Errorf("Differing = %v, want ticks/SKILL.md", drift.Differing)
		}
		if !strings.Contains(drift.String(), "ticks/SKILL.md") {
			t.Errorf("Drift.String() = %q, want it to name the changed file", drift.String())
		}
	})

	t.Run("missing file", func(t *testing.T) {
		dir := newCopy(t)
		if err := os.Remove(filepath.Join(dir, "skills", "ticks", "references", "code-smells.md")); err != nil {
			t.Fatalf("remove: %v", err)
		}
		drift, err := Verify(dir)
		if err != nil {
			t.Fatalf("Verify: %v", err)
		}
		if drift.OK() {
			t.Fatalf("Verify did not detect a missing file")
		}
		if !contains(drift.Missing, "ticks/references/code-smells.md") {
			t.Errorf("Missing = %v, want ticks/references/code-smells.md", drift.Missing)
		}
	})

	t.Run("extra file", func(t *testing.T) {
		dir := newCopy(t)
		if err := os.WriteFile(filepath.Join(dir, "skills", "ticks", "references", "extra.md"), []byte("x"), 0o644); err != nil {
			t.Fatalf("write: %v", err)
		}
		drift, err := Verify(dir)
		if err != nil {
			t.Fatalf("Verify: %v", err)
		}
		if drift.OK() {
			t.Fatalf("Verify did not detect an extra file")
		}
		if !contains(drift.Extra, "ticks/references/extra.md") {
			t.Errorf("Extra = %v, want ticks/references/extra.md", drift.Extra)
		}
	})

	t.Run("missing root", func(t *testing.T) {
		if _, err := Verify(filepath.Join(t.TempDir(), "nope")); err == nil {
			t.Errorf("Verify(missing root) = nil error, want error")
		}
	})
}

func copyTree(t *testing.T, src, dst string) {
	t.Helper()
	err := filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(target, data, 0o644)
	})
	if err != nil {
		t.Fatalf("copy tree: %v", err)
	}
}

func contains(list []string, want string) bool {
	for _, s := range list {
		if s == want {
			return true
		}
	}
	return false
}
