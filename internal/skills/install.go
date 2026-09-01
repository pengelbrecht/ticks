package skills

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// StampFile is the name of the marker file Install writes at the root of
// every directory it installs, recording the tk version and install time.
// Its presence is what makes a directory "tk-managed": Install refuses to
// overwrite a non-empty directory that lacks it unless force is true.
const StampFile = ".tk-skills-version"

// Stamp is the parsed content of a skill directory's StampFile.
type Stamp struct {
	Skill       string    `json:"skill"`
	Version     string    `json:"version"`
	InstalledAt time.Time `json:"installed_at"`
}

// ErrUnmanaged reports that Install's target directory exists, is non-empty,
// and carries no StampFile — so overwriting it would destroy content tk
// never wrote. Install wraps it; callers can match with errors.Is.
var ErrUnmanaged = errors.New("target directory is not tk-managed (no " + StampFile + " stamp)")

// ErrSkillsParent reports that Install's target directory is a skills PARENT
// — it holds other skills as children rather than being one skill's own
// directory. Installing there would delete every sibling skill, which is a
// categorically different accident from overwriting one unmanaged skill, and
// is why --force does NOT bypass this check.
//
// Field-observed 2026-09-01: `tk skills install ticks --dir ~/.claude/skills`
// read as "put ticks in my skills folder" and in fact meant "make
// ~/.claude/skills BE the ticks skill". The first attempt was refused as
// ErrUnmanaged, --force silenced it, and 44 sibling skills were destroyed.
// The stamp check could not see the difference; this one can.
var ErrSkillsParent = errors.New("target directory holds other skills as children — installing here would delete them")

// skillsInParent reports the names of child directories of dir that look like
// installed skills (they contain a SKILL.md), which makes dir a skills parent
// rather than a skill. A directory with its own SKILL.md at the root is a
// skill — possibly one being upgraded — and is never a parent, whatever its
// children look like. Symlinked children count: that is how skills.sh installs.
func skillsInParent(dir string) []string {
	if _, err := os.Stat(filepath.Join(dir, "SKILL.md")); err == nil {
		return nil // dir is itself a skill
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	var found []string
	for _, e := range entries {
		// Follow symlinks: skills.sh installs into ~/.agents/skills and
		// symlinks them into ~/.claude/skills, so the children a harness
		// actually loads are usually links, not real directories.
		child := filepath.Join(dir, e.Name())
		info, err := os.Stat(child)
		if err != nil || !info.IsDir() {
			continue
		}
		if _, err := os.Stat(filepath.Join(child, "SKILL.md")); err == nil {
			found = append(found, e.Name())
		}
	}
	return found
}

// ReadStamp reads and parses the StampFile at the root of dir. It returns an
// error (os.ErrNotExist in the chain, when absent) if the file is missing,
// unreadable, or not valid JSON.
func ReadStamp(dir string) (Stamp, error) {
	var s Stamp
	data, err := os.ReadFile(filepath.Join(dir, StampFile))
	if err != nil {
		return s, err
	}
	if err := json.Unmarshal(data, &s); err != nil {
		return s, fmt.Errorf("parse %s: %w", StampFile, err)
	}
	return s, nil
}

// Install writes the named skill's embedded bundle to dir, replacing
// whatever is there. It refuses to touch a dir that exists, is non-empty,
// and has no StampFile (wraps ErrUnmanaged) unless force is true. An empty
// existing directory (including one freshly created by a caller, e.g.
// t.TempDir()) is treated the same as a nonexistent one: there is nothing
// to lose, so no stamp is required.
//
// The swap is atomic-ish, not atomic: Install writes the full tree to a
// temp directory alongside dir, then — if dir already exists — removes dir
// and renames the temp directory into place. There is a brief window
// between the removal and the rename where dir does not exist; a crash in
// that window leaves dir absent rather than half-written, but a reader
// racing a concurrent Install can observe a missing directory. Nothing from
// the old tree is preserved: every file Install did not just write is gone,
// including hand-added extras in a stamped (upgrade) target.
func Install(name, dir string, force bool) (Stamp, error) {
	var stamp Stamp

	paths, err := Paths(name)
	if err != nil {
		return stamp, err
	}

	info, statErr := os.Stat(dir)

	// A skills PARENT is refused before anything else, and --force does not
	// bypass it: the cost of being wrong is every sibling skill, and no
	// legitimate install targets a directory full of other skills.
	if statErr == nil && info.IsDir() {
		if siblings := skillsInParent(dir); len(siblings) > 0 {
			// Name a few so the operator recognises the directory, but do
			// not paste 59 skill names into a terminal — the "did you mean"
			// is the actionable part and must not scroll away.
			shown := siblings
			if len(shown) > 5 {
				shown = shown[:5]
			}
			listed := strings.Join(shown, ", ")
			if len(shown) < len(siblings) {
				listed += fmt.Sprintf(", and %d more", len(siblings)-len(shown))
			}
			return stamp, fmt.Errorf(
				"install %s to %s: %w (%d found: %s) — did you mean %s?",
				name, dir, ErrSkillsParent, len(siblings), listed,
				filepath.Join(dir, name))
		}
	}

	switch {
	case statErr == nil && !info.IsDir():
		return stamp, fmt.Errorf("install %s: %s exists and is not a directory", name, dir)
	case statErr == nil && !force:
		managed, err := isManaged(dir)
		if err != nil {
			return stamp, fmt.Errorf("install %s: %w", name, err)
		}
		if !managed {
			return stamp, fmt.Errorf("install %s to %s: %w", name, dir, ErrUnmanaged)
		}
	case statErr != nil && !errors.Is(statErr, os.ErrNotExist):
		return stamp, fmt.Errorf("install %s: stat %s: %w", name, dir, statErr)
	}
	exists := statErr == nil

	parent := filepath.Dir(dir)
	if err := os.MkdirAll(parent, 0o755); err != nil {
		return stamp, fmt.Errorf("install %s: %w", name, err)
	}

	// Sweep stale temp trees from crashed installs first: a fully populated
	// <name>.tk-tmp-* sibling contains a complete SKILL.md and a harness may
	// load it as a duplicate skill.
	if stale, _ := filepath.Glob(filepath.Join(parent, filepath.Base(dir)+".tk-tmp-*")); len(stale) > 0 {
		for _, d := range stale {
			_ = os.RemoveAll(d)
		}
	}

	tmp, err := os.MkdirTemp(parent, filepath.Base(dir)+".tk-tmp-*")
	if err != nil {
		return stamp, fmt.Errorf("install %s: %w", name, err)
	}
	cleanup := true
	defer func() {
		if cleanup {
			os.RemoveAll(tmp)
		}
	}()

	for _, p := range paths {
		data, err := Read(name, p)
		if err != nil {
			return stamp, fmt.Errorf("install %s: %w", name, err)
		}
		dest := filepath.Join(tmp, filepath.FromSlash(p))
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			return stamp, fmt.Errorf("install %s: %w", name, err)
		}
		if err := os.WriteFile(dest, data, 0o644); err != nil {
			return stamp, fmt.Errorf("install %s: %w", name, err)
		}
	}

	stamp = Stamp{Skill: name, Version: Version(), InstalledAt: time.Now().UTC()}
	stampData, err := json.MarshalIndent(stamp, "", "  ")
	if err != nil {
		return stamp, fmt.Errorf("install %s: encode stamp: %w", name, err)
	}
	if err := os.WriteFile(filepath.Join(tmp, StampFile), stampData, 0o644); err != nil {
		return stamp, fmt.Errorf("install %s: %w", name, err)
	}

	if exists {
		if err := os.RemoveAll(dir); err != nil {
			return stamp, fmt.Errorf("install %s: removing old %s: %w", name, dir, err)
		}
	}
	if err := os.Rename(tmp, dir); err != nil {
		return stamp, fmt.Errorf("install %s: %w", name, err)
	}
	cleanup = false

	return stamp, nil
}

// isManaged reports whether dir is safe for Install to overwrite without
// --force: empty (nothing to lose), or carrying a StampFile.
func isManaged(dir string) (bool, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return false, fmt.Errorf("read %s: %w", dir, err)
	}
	if len(entries) == 0 {
		return true, nil
	}
	if _, err := os.Stat(filepath.Join(dir, StampFile)); err == nil {
		return true, nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return false, fmt.Errorf("stat %s: %w", filepath.Join(dir, StampFile), err)
	}
	return false, nil
}
