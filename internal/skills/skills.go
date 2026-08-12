package skills

import (
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"
	"sync"

	ticks "github.com/pengelbrecht/ticks"
)

// bundleRoot is the directory prefix the embedded FS uses for the skills tree.
const bundleRoot = "skills"

// devVersion is what Version reports before SetVersion is called (and for
// builds that were never stamped by goreleaser).
const devVersion = "dev"

var (
	versionMu sync.RWMutex
	version   = devVersion
)

// Version returns the tk build version the embedded bundle belongs to.
// See the package doc for why the value is propagated in rather than read
// from cmd/tk.
func Version() string {
	versionMu.RLock()
	defer versionMu.RUnlock()
	return version
}

// SetVersion propagates the tk build version (main.Version) into this package.
// An empty value resets to "dev". It mirrors cmd/tk/cmd.SetVersion; wire it from
// the same place so both stay in sync.
func SetVersion(v string) {
	versionMu.Lock()
	defer versionMu.Unlock()
	if v == "" {
		v = devVersion
	}
	version = v
}

// List returns the names of the embedded skills, sorted. Today that is just
// "ticks"; anything added under skills/ is picked up automatically.
func List() []string {
	fsys := ticks.SkillsFS()
	entries, err := fs.ReadDir(fsys, bundleRoot)
	if err != nil {
		// Unreachable: the directory is embedded at compile time.
		return nil
	}
	var names []string
	for _, e := range entries {
		if e.IsDir() {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	return names
}

// Files returns an fs.FS rooted at the named skill, so "SKILL.md" and
// "references/tk-commands.md" are valid paths. It fails for an unknown skill.
func Files(name string) (fs.FS, error) {
	if err := validName(name); err != nil {
		return nil, err
	}
	fsys := ticks.SkillsFS()
	sub, err := fs.Sub(fsys, path.Join(bundleRoot, name))
	if err != nil {
		return nil, fmt.Errorf("skill %q: %w", name, err)
	}
	// fs.Sub succeeds for a non-existent directory, so probe it.
	if _, err := fs.ReadDir(sub, "."); err != nil {
		return nil, fmt.Errorf("unknown skill %q", name)
	}
	return sub, nil
}

// Read returns the contents of one file inside a skill, e.g.
// Read("ticks", "references/tk-commands.md"). filePath is slash-separated and
// relative to the skill root; escaping the skill is an error.
func Read(name, filePath string) ([]byte, error) {
	fsys, err := Files(name)
	if err != nil {
		return nil, err
	}
	clean := path.Clean(filePath)
	if !fs.ValidPath(clean) || clean == "." {
		return nil, fmt.Errorf("invalid path %q in skill %q", filePath, name)
	}
	data, err := fs.ReadFile(fsys, clean)
	if err != nil {
		return nil, fmt.Errorf("skill %q: %w", name, err)
	}
	return data, nil
}

// Paths returns every file in a skill, sorted, as slash-separated paths
// relative to the skill root.
func Paths(name string) ([]string, error) {
	fsys, err := Files(name)
	if err != nil {
		return nil, err
	}
	var out []string
	err = fs.WalkDir(fsys, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			out = append(out, p)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("skill %q: %w", name, err)
	}
	sort.Strings(out)
	return out, nil
}

func validName(name string) error {
	if name == "" || strings.ContainsAny(name, `/\`) || name == "." || name == ".." {
		return fmt.Errorf("invalid skill name %q", name)
	}
	return nil
}
