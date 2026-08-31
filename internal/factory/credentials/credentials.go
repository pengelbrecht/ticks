// Package credentials reads and writes ~/.ticfacrc, the factory's own
// credential file.
//
// It used to be part of ~/.ticksrc (internal/ticksrc, deleted in the split
// this package was born from — tick `elt`/`0oa`, docs/projects/2026-08-27-
// factory-extraction/2026-08-27-factory-extraction-spec.md, "Phase 3
// decisions"). That file was reachable from every command in the `tk`
// binary, including ones with no business touching factory credentials at
// all — `tk ask`/`tk answer` read it by accident once (see the offline-path
// regression this design responds to) simply because it was one fallback
// chain away. Physical separation — a different file, read only by code that
// explicitly imports this package — makes that class of accident structurally
// impossible rather than merely undocumented.
//
// The file format and mechanics (line-oriented, comment/unknown-line
// preserving, atomic temp+rename, 0600, Get/Set/Save) are unchanged from
// ~/.ticksrc's — proven by years of production use, no reason to redesign.
// The on-disk key spellings are unchanged too (still "factory_github_token"
// etc.): only the Go constant names drop the now-redundant "Factory" prefix,
// since the file itself is factory-scoped now. This is a rename, not a
// reshape — a migration (internal/factory's LoadCredentials) can move a line
// verbatim from ~/.ticksrc into ~/.ticfacrc without touching its bytes.
package credentials

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// FileName is the factory credential file's name in the user's home
// directory.
const FileName = ".ticfacrc"

// Keys written into the file. All of them are factory-scoped; board sync's
// token/url live in ~/.ticksrc, owned solely by internal/tickboard/cloud.
const (
	// KeyURL is the deployed factory Worker's base URL.
	KeyURL = "factory_url"
	// KeyToken is the factory bearer token in plaintext. Only its PBKDF2 hash
	// ever reaches the Worker, so this file is the sole copy — losing it means
	// rotating (`tk factory deploy --rotate-token`).
	KeyToken = "factory_token"
	// KeyVersion is the tk version whose embedded bundle was last deployed, so
	// `tk factory status` can tell a stale factory from a current one.
	KeyVersion = "factory_version"

	// The credentials `tk factory setup` walks the operator through. Each one
	// is pushed to the deployment as a Worker secret — write-only there — and
	// mirrored here so `tk factory status` can re-check it live and a later
	// setup can offer to keep it. This file is 0600 and outside any repo; the
	// mirror never goes anywhere else (see factory.SecretSinks).

	// KeyGitHubToken is the credential the factory clones and pushes with (the
	// shipped rung of the D11 credential ladder): a user-to-server token from
	// the device flow, or a fine-grained PAT when one was supplied by hand.
	KeyGitHubToken = "factory_github_token"
	// KeyGitHubLogin is the account the credential authenticated as — public
	// identity, kept so status can report whose token is installed.
	KeyGitHubLogin = "factory_github_login"
	// KeyGitHubRepo is the owner/repo the credential was verified against.
	KeyGitHubRepo = "factory_github_repo"
	// KeyGitHubAuth records HOW the credential was obtained — `device-flow` or
	// `pat`. It is not cosmetic: only a device-flow credential can be renewed
	// without a browser, and only a device-flow credential is bounded by the
	// repositories chosen at install, so the two fail and recover differently
	// and a report that cannot tell them apart names the wrong remedy.
	KeyGitHubAuth = "factory_github_auth"
	// KeyGitHubTokenExpires is when the stored credential stops working
	// (RFC 3339). EMPTY MEANS IT DOES NOT EXPIRE — a GitHub App registered
	// with user-token expiration off issues exactly that, and treating an
	// absent deadline as "expired" would condemn the recommended
	// configuration.
	KeyGitHubTokenExpires = "factory_github_token_expires_at"
	// KeyGitHubRefreshToken renews the credential above without a browser. It
	// is a longer-lived secret than the token it mints, which is exactly why
	// it stays on the operator's machine and is never pushed as a Worker
	// secret or handed to a sandbox (D11).
	KeyGitHubRefreshToken = "factory_github_refresh_token"
	// KeyGitHubRefreshExpires is when the refresh token itself dies
	// (RFC 3339), after which renewal is one browser approval again.
	KeyGitHubRefreshExpires = "factory_github_refresh_token_expires_at"

	// KeyGatewayURL is the operator's AI Gateway base URL (D17). It is not a
	// secret in the cryptographic sense but it carries their Cloudflare
	// account id, so it lives here and in a Worker secret, never in the repo.
	KeyGatewayURL = "factory_gateway_url"
	// KeyGatewayProvider is the provider rung behind the gateway: workers-ai
	// (no key — same account) or a BYOK vendor.
	KeyGatewayProvider = "factory_gateway_provider"
	// KeyGatewayKey is the provider key, empty for workers-ai.
	KeyGatewayKey = "factory_gateway_key"
	// KeyCloudflareAPIToken is the Cloudflare API token the factory reads its
	// AI Gateway's logs with (D17). Gateway logs are the ground truth a run's
	// cost budget acts on — an agent can misreport its spend, an invoice
	// cannot — so a factory without one routes and attributes model traffic
	// but cannot enforce the cost budget.
	KeyCloudflareAPIToken = "factory_cloudflare_api_token"
	// KeyWorkersAIBillingMode is the AI Gateway Workers AI billing mode the
	// operator has settled on — `postpaid` (Workers AI on the Cloudflare
	// invoice, where an account credit can absorb it) or `unified` (a
	// separately purchased prepaid wallet). It is an EXPECTATION, not a
	// credential: the gateway holds the real value and one dashboard click
	// changes it, so pre-flight reads the gateway and asserts it still matches
	// what is recorded here.
	KeyWorkersAIBillingMode = "factory_workers_ai_billing_mode"
)

// fileMode is owner-only: the file holds bearer tokens.
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
		return fmt.Errorf("credentials: no path to save to")
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
