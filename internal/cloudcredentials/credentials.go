// Package cloudcredentials reads and writes ~/.ticfacrc, the credential file
// `tk cloud …` uses to reach the deployed cloud factory's HTTP API.
//
// The factory itself (deploy/setup/status/dashboard, and the run/stop/status/
// logs/trace/supervisor command family) moved to ticfac (tick 3r2); this repo
// keeps only the commands a LOCAL orchestrator uses to drive cloud workers
// directly — `tk cloud branch/spawn/wait/collect/reconcile/prbody` — and they
// still authenticate against the same deployed factory endpoint, so they still
// need to read this file. This package is a deliberately small copy of what
// used to be internal/factory/credentials: just the URL and the bearer token,
// the two fields these commands read. The rest of that package's keys
// (GitHub, gateway, Cloudflare, billing mode) belonged to `tk factory setup`
// and `tk factory deploy`, which left with the factory.
package cloudcredentials

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// FileName is the credential file's name in the user's home directory.
const FileName = ".ticfacrc"

// Keys written into the file.
const (
	// KeyURL is the deployed factory Worker's base URL.
	KeyURL = "factory_url"
	// KeyToken is the factory bearer token in plaintext.
	KeyToken = "factory_token"
)

// fileMode is owner-only: the file holds a bearer token.
const fileMode = 0o600

// File is a parsed ~/.ticfacrc that remembers its own layout.
type File struct {
	path  string
	lines []string
}

// Path returns the location of ~/.ticfacrc. The file need not exist.
func Path() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("locating home directory: %w", err)
	}
	return filepath.Join(home, FileName), nil
}

// Load reads ~/.ticfacrc. A missing file is not an error — it yields an empty
// File that Save will create.
func Load() (*File, error) {
	path, err := Path()
	if err != nil {
		return nil, err
	}
	return LoadFrom(path)
}

// LoadFrom reads the credential file at path.
func LoadFrom(path string) (*File, error) {
	f := &File{path: path}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return f, nil
		}
		return nil, fmt.Errorf("reading %s: %w", path, err)
	}
	content := strings.TrimRight(string(data), "\n")
	if content != "" {
		f.lines = strings.Split(content, "\n")
	}
	return f, nil
}

// Path returns the file this File was loaded from and will Save to.
func (f *File) Path() string { return f.path }

// splitKey returns the key of a `key=value` line, or "" for comments, blanks
// and any unrecognised line.
func splitKey(line string) string {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" || strings.HasPrefix(trimmed, "#") {
		return ""
	}
	key, _, ok := strings.Cut(trimmed, "=")
	if !ok {
		return ""
	}
	return strings.TrimSpace(key)
}

// Get returns the value for key, or "" when it is absent.
func (f *File) Get(key string) string {
	for _, line := range f.lines {
		if splitKey(line) != key {
			continue
		}
		_, value, _ := strings.Cut(strings.TrimSpace(line), "=")
		return strings.TrimSpace(value)
	}
	return ""
}

// Set stores key=value, replacing the existing line in place when the key is
// already present and appending otherwise. Every other line is untouched.
func (f *File) Set(key, value string) {
	line := key + "=" + value
	for i, existing := range f.lines {
		if splitKey(existing) == key {
			f.lines[i] = line
			return
		}
	}
	f.lines = append(f.lines, line)
}

// Save writes the file back with owner-only permissions, replacing it
// atomically so a crash cannot leave a half-written credential file. An
// existing file that was too permissive is tightened to 0600 by the swap.
func (f *File) Save() error {
	if f.path == "" {
		return fmt.Errorf("cloudcredentials: no path to save to")
	}
	content := ""
	if len(f.lines) > 0 {
		content = strings.Join(f.lines, "\n") + "\n"
	}

	dir := filepath.Dir(f.path)
	tmp, err := os.CreateTemp(dir, ".ticfacrc-*.tmp")
	if err != nil {
		return fmt.Errorf("writing %s: %w", f.path, err)
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)

	if err := tmp.Chmod(fileMode); err != nil {
		tmp.Close()
		return fmt.Errorf("writing %s: %w", f.path, err)
	}
	if _, err := tmp.WriteString(content); err != nil {
		tmp.Close()
		return fmt.Errorf("writing %s: %w", f.path, err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("writing %s: %w", f.path, err)
	}
	if err := os.Rename(tmpName, f.path); err != nil {
		return fmt.Errorf("writing %s: %w", f.path, err)
	}
	return nil
}
