package skills

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

// A skills PARENT — a directory holding other skills — must be refused, and
// --force must NOT bypass the refusal.
//
// This is not a hypothetical. On 2026-09-01 `tk skills install ticks --dir
// ~/.claude/skills` was read as "put ticks in my skills folder" when it in
// fact means "make ~/.claude/skills BE the ticks skill". The stamp check
// refused it as ErrUnmanaged, --force silenced that, and 44 sibling skills
// were destroyed. The stamp check cannot tell "one unmanaged skill" from "a
// folder full of other people's skills"; these tests pin the difference.
func mkSkill(t *testing.T, dir, name string) {
	t.Helper()
	d := filepath.Join(dir, name)
	if err := os.MkdirAll(d, 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", d, err)
	}
	if err := os.WriteFile(filepath.Join(d, "SKILL.md"), []byte("---\nname: "+name+"\n---\n"), 0o644); err != nil {
		t.Fatalf("write SKILL.md: %v", err)
	}
}

func TestInstallRefusesASkillsParent(t *testing.T) {
	parent := t.TempDir()
	mkSkill(t, parent, "herdr")
	mkSkill(t, parent, "gws")

	for _, force := range []bool{false, true} {
		if _, err := Install("ticks", parent, force); !errors.Is(err, ErrSkillsParent) {
			t.Fatalf("force=%v: err = %v, want ErrSkillsParent", force, err)
		}
		// The siblings must still be there — a refusal that already deleted
		// something is not a refusal.
		for _, s := range []string{"herdr", "gws"} {
			if _, err := os.Stat(filepath.Join(parent, s, "SKILL.md")); err != nil {
				t.Fatalf("force=%v: sibling %s was destroyed by a refused install", force, s)
			}
		}
	}
}

// A symlinked child still counts: skills.sh installs into ~/.agents/skills and
// symlinks into ~/.claude/skills, so the children a harness loads are links.
func TestInstallRefusesAParentOfSymlinkedSkills(t *testing.T) {
	real := t.TempDir()
	mkSkill(t, real, "recall")

	parent := t.TempDir()
	if err := os.Symlink(filepath.Join(real, "recall"), filepath.Join(parent, "recall")); err != nil {
		t.Skipf("symlinks unavailable: %v", err)
	}
	if _, err := Install("ticks", parent, true); !errors.Is(err, ErrSkillsParent) {
		t.Fatalf("err = %v, want ErrSkillsParent for a symlinked child", err)
	}
}

// A directory that IS a skill — it has its own SKILL.md — is never a parent,
// whatever its children contain. This is the ordinary upgrade path and must
// keep working.
func TestInstallAllowsUpgradingASkillDirectory(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "ticks")
	if err := os.MkdirAll(filepath.Join(dir, "references"), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte("old\n"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if _, err := Install("ticks", dir, true); err != nil {
		t.Fatalf("upgrading a skill directory should work, got %v", err)
	}
}
