// Package ticksrc reads and writes ~/.ticksrc, the single per-user file that
// holds tk's cloud credentials.
//
// The file predates this package: internal/tickboard/cloud reads `token=` and
// `url=` from it for board sync (the TICKS_TOKEN convention). `tk factory
// deploy` adds `factory_url=`, `factory_token=` and `factory_version=` for the
// personal factory (D16 in docs/design/cloud-factory.md), which means a writer
// now exists for a file that was previously read-only — and it must be able to
// add a key without disturbing anything already there.
//
// So [File] is line-oriented rather than a struct: it keeps the file's own
// lines, comments, ordering and unrecognised keys, and [File.Set] rewrites
// exactly one line (or appends one). A deploy therefore can never silently
// unconfigure board sync, and a future key added by some other command
// survives a deploy that knows nothing about it.
package ticksrc

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// FileName is the config file's name in the user's home directory. It matches
// cloud.ConfigFileName; the two are deliberately not cross-imported, because
// internal/tickboard/cloud pulls in the websocket board client.
const FileName = ".ticksrc"

// Keys written into the file. token/url are board sync's (owned by
// internal/tickboard/cloud); the factory_* keys are this repo's factory.
const (
	// KeyToken is the ticks.sh board-sync token (TICKS_TOKEN).
	KeyToken = "token"
	// KeyURL is the ticks.sh board-sync endpoint (TICKS_URL).
	KeyURL = "url"

	// KeyFactoryURL is the deployed factory Worker's base URL.
	KeyFactoryURL = "factory_url"
	// KeyFactoryToken is the factory bearer token in plaintext. Only its
	// PBKDF2 hash ever reaches the Worker, so this file is the sole copy —
	// losing it means rotating (`tk factory deploy --rotate-token`).
	KeyFactoryToken = "factory_token"
	// KeyFactoryVersion is the tk version whose embedded bundle was last
	// deployed, so `tk upgrade` can tell a stale factory from a current one.
	KeyFactoryVersion = "factory_version"

	// The credentials `tk factory setup` walks the operator through. Each one
	// is pushed to the deployment as a Worker secret — write-only there — and
	// mirrored here so `tk factory status` can re-check it live and a later
	// setup can offer to keep it. This file is 0600 and outside any repo; the
	// mirror never goes anywhere else (see factory.SecretSinks).

	// KeyFactoryGitHubToken is the fine-grained, repo-scoped PAT the factory
	// clones and pushes with (the first rung of the D11 credential ladder).
	KeyFactoryGitHubToken = "factory_github_token"
	// KeyFactoryGitHubLogin is the account the PAT authenticated as — public
	// identity, kept so status can report whose token is installed.
	KeyFactoryGitHubLogin = "factory_github_login"
	// KeyFactoryGitHubRepo is the owner/repo the PAT was verified against.
	KeyFactoryGitHubRepo = "factory_github_repo"

	// KeyFactoryGatewayURL is the operator's AI Gateway base URL (D17). It is
	// not a secret in the cryptographic sense but it carries their Cloudflare
	// account id, so it lives here and in a Worker secret, never in the repo.
	KeyFactoryGatewayURL = "factory_gateway_url"
	// KeyFactoryGatewayProvider is the provider rung behind the gateway:
	// workers-ai (no key — same account) or a BYOK vendor.
	KeyFactoryGatewayProvider = "factory_gateway_provider"
	// KeyFactoryGatewayKey is the provider key, empty for workers-ai.
	KeyFactoryGatewayKey = "factory_gateway_key"
)

// fileMode is owner-only: the file holds bearer tokens.
const fileMode = 0o600

// File is a parsed ~/.ticksrc that remembers its own layout.
type File struct {
	path  string
	lines []string
}

// Path returns the location of ~/.ticksrc. The file need not exist.
func Path() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("locating home directory: %w", err)
	}
	return filepath.Join(home, FileName), nil
}

// Load reads ~/.ticksrc. A missing file is not an error — it yields an empty
// File that Save will create.
func Load() (*File, error) {
	path, err := Path()
	if err != nil {
		return nil, err
	}
	return LoadFrom(path)
}

// LoadFrom reads the config file at path.
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
// and the legacy bare-token line. Matching is on the whole key, so `url` and
// `factory_url` never collide.
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
		return fmt.Errorf("ticksrc: no path to save to")
	}
	content := ""
	if len(f.lines) > 0 {
		content = strings.Join(f.lines, "\n") + "\n"
	}

	dir := filepath.Dir(f.path)
	tmp, err := os.CreateTemp(dir, ".ticksrc-*.tmp")
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
