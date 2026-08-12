package skills

import (
	"bytes"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// InstallDiff is the result of comparing an installed skill directory
// (laid out like a skill root — SKILL.md at its top, e.g. an Install
// target) against the embedded bundle, via DiffDir.
type InstallDiff struct {
	// Added lists files present on disk that the bundle does not contain.
	// The StampFile itself is never included.
	Added []string
	// Removed lists bundle files absent from disk.
	Removed []string
	// Changed lists files present in both whose bytes differ.
	Changed []string
	// StampVersion is the tk version recorded in the installed directory's
	// StampFile, or "" if it has none (never installed by tk, or unreadable).
	StampVersion string
	// BundleVersion is the tk version this binary's embedded bundle belongs to.
	BundleVersion string
}

// OK reports whether the installed directory is byte-for-byte identical to
// the bundle AND was stamped by the same tk version this binary ships —
// i.e. there is nothing a re-install would change.
func (d InstallDiff) OK() bool {
	return len(d.Added) == 0 && len(d.Removed) == 0 && len(d.Changed) == 0 &&
		d.StampVersion != "" && d.StampVersion == d.BundleVersion
}

// String renders a human-readable summary, including for a clean result.
func (d InstallDiff) String() string {
	if d.OK() {
		return fmt.Sprintf("no drift: matches the embedded bundle (version %s)", d.BundleVersion)
	}
	stampDesc := d.StampVersion
	if stampDesc == "" {
		stampDesc = "(unstamped)"
	}
	var b strings.Builder
	fmt.Fprintf(&b, "drift against the embedded bundle: installed=%s bundle=%s", stampDesc, d.BundleVersion)
	section := func(label string, paths []string) {
		if len(paths) == 0 {
			return
		}
		fmt.Fprintf(&b, "\n%s (%d):", label, len(paths))
		for _, p := range paths {
			fmt.Fprintf(&b, "\n  %s", p)
		}
	}
	section("added", d.Added)
	section("removed", d.Removed)
	section("changed", d.Changed)
	return b.String()
}

// DiffDir compares dir against the named skill's embedded bundle: which
// bundle files are missing from dir, which files on disk aren't in the
// bundle, which differ in content, and how dir's StampFile version compares
// to this binary's. dir must exist; a missing dir is an error, not drift.
func DiffDir(name, dir string) (InstallDiff, error) {
	var out InstallDiff
	out.BundleVersion = Version()

	bundlePaths, err := Paths(name)
	if err != nil {
		return out, err
	}
	bundle := make(map[string][]byte, len(bundlePaths))
	for _, p := range bundlePaths {
		data, err := Read(name, p)
		if err != nil {
			return out, fmt.Errorf("diff %s: %w", name, err)
		}
		bundle[p] = data
	}

	if info, err := os.Stat(dir); err != nil {
		return out, fmt.Errorf("diff %s: %w", name, err)
	} else if !info.IsDir() {
		return out, fmt.Errorf("diff %s: %s is not a directory", name, dir)
	}

	if stamp, err := ReadStamp(dir); err == nil {
		out.StampVersion = stamp.Version
	} else if !errors.Is(err, os.ErrNotExist) {
		return out, fmt.Errorf("diff %s: read stamp: %w", name, err)
	}

	onDisk := map[string]bool{}
	err = filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(dir, p)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		if rel == StampFile {
			return nil
		}
		onDisk[rel] = true
		return nil
	})
	if err != nil {
		return out, fmt.Errorf("diff %s: walk %s: %w", name, dir, err)
	}

	for _, p := range bundlePaths {
		if !onDisk[p] {
			out.Removed = append(out.Removed, p)
			continue
		}
		got, err := os.ReadFile(filepath.Join(dir, filepath.FromSlash(p)))
		if err != nil || !bytes.Equal(got, bundle[p]) {
			out.Changed = append(out.Changed, p)
		}
	}
	for p := range onDisk {
		if _, ok := bundle[p]; !ok {
			out.Added = append(out.Added, p)
		}
	}
	sort.Strings(out.Added)
	sort.Strings(out.Removed)
	sort.Strings(out.Changed)

	return out, nil
}
