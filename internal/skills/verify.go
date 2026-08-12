package skills

import (
	"bytes"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"

	ticks "github.com/pengelbrecht/ticks"
)

// Drift is the result of comparing an on-disk skills tree against the embedded
// bundle. All paths are slash-separated and relative to the skills/ directory,
// e.g. "ticks/references/tk-commands.md".
type Drift struct {
	// Checked is the number of bundle files compared.
	Checked int
	// Missing lists bundle files absent from the on-disk tree.
	Missing []string
	// Extra lists on-disk files the bundle does not contain.
	Extra []string
	// Differing lists files present in both whose bytes do not match.
	Differing []string
}

// OK reports whether the on-disk tree is byte-for-byte identical to the bundle.
func (d Drift) OK() bool {
	return len(d.Missing) == 0 && len(d.Extra) == 0 && len(d.Differing) == 0
}

// String renders a human-readable summary, including for a clean result.
func (d Drift) String() string {
	if d.OK() {
		return fmt.Sprintf("no drift: %d files match the embedded bundle", d.Checked)
	}
	var b strings.Builder
	fmt.Fprintf(&b, "drift against the embedded bundle (%d files checked)", d.Checked)
	section := func(label string, paths []string) {
		if len(paths) == 0 {
			return
		}
		fmt.Fprintf(&b, "\n%s (%d):", label, len(paths))
		for _, p := range paths {
			fmt.Fprintf(&b, "\n  %s", p)
		}
	}
	section("missing on disk", d.Missing)
	section("not in bundle", d.Extra)
	section("contents differ", d.Differing)
	return b.String()
}

// Verify compares the on-disk skills tree under root against the embedded
// bundle, byte for byte. root is the directory that CONTAINS skills/ (the
// repository root, or a copy of it); a missing or unreadable root/skills is an
// error, while any content difference is reported through the returned Drift.
func Verify(root string) (Drift, error) {
	var d Drift

	diskRoot := filepath.Join(root, bundleRoot)
	info, err := os.Stat(diskRoot)
	if err != nil {
		return d, fmt.Errorf("verify skills tree: %w", err)
	}
	if !info.IsDir() {
		return d, fmt.Errorf("verify skills tree: %s is not a directory", diskRoot)
	}

	bundle, err := bundleFiles()
	if err != nil {
		return d, err
	}

	onDisk := map[string]bool{}
	err = filepath.WalkDir(diskRoot, func(p string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(diskRoot, p)
		if err != nil {
			return err
		}
		onDisk[filepath.ToSlash(rel)] = true
		return nil
	})
	if err != nil {
		return d, fmt.Errorf("verify skills tree: %w", err)
	}

	for _, rel := range sortedKeys(bundle) {
		d.Checked++
		if !onDisk[rel] {
			d.Missing = append(d.Missing, rel)
			continue
		}
		want := bundle[rel]
		got, err := os.ReadFile(filepath.Join(diskRoot, filepath.FromSlash(rel)))
		if err != nil || !bytes.Equal(got, want) {
			d.Differing = append(d.Differing, rel)
		}
	}

	for _, rel := range sortedKeys(onDisk) {
		if _, ok := bundle[rel]; !ok {
			d.Extra = append(d.Extra, rel)
		}
	}

	return d, nil
}

// bundleFiles reads the whole embedded bundle into memory, keyed by path
// relative to skills/.
func bundleFiles() (map[string][]byte, error) {
	fsys := ticks.SkillsFS()
	out := map[string][]byte{}
	err := fs.WalkDir(fsys, bundleRoot, func(p string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		data, err := fs.ReadFile(fsys, p)
		if err != nil {
			return err
		}
		rel := strings.TrimPrefix(p, bundleRoot+"/")
		out[path.Clean(rel)] = data
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("read embedded bundle: %w", err)
	}
	return out, nil
}

func sortedKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
