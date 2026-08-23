package spawn

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/pengelbrecht/ticks/internal/herd/gitcmd"
)

// slugRe matches runs of characters that are not part of a herdr-safe name.
var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

// RepoName derives a short, herdr-safe, unique repository qualifier for agent
// names.
//
// Tick ids are only unique within one repository, but a herdr agent name is
// global across every repo sharing the same server. Two repos that both hold
// tick `1aw` would otherwise spawn the same agent name and each other's
// wait/collect/reconcile could adopt a foreign worker. The qualifier makes the
// name repo-scoped.
//
// The qualifier is the repo's slugged name (from the origin remote when one is
// set, else the checkout's directory name) plus a 6-hex-char hash of the
// canonical repo root. The hash is what guarantees uniqueness when two same-
// named checkouts share a server; the slug is what keeps the name readable in
// `herd ps`. The slug is capped at 12 runes so the qualifier is at most 19
// chars and a full name still fits herdr's 32-char limit with a respawn suffix.
func RepoName(repoRoot string) (string, error) {
	if repoRoot == "" {
		return "", fmt.Errorf("herd/spawn: deriving the repo name: no repo root given")
	}
	abs, err := filepath.Abs(repoRoot)
	if err != nil {
		return "", fmt.Errorf("herd/spawn: deriving the repo name of %s: %w", repoRoot, err)
	}
	canon := abs
	if real, err := filepath.EvalSymlinks(abs); err == nil {
		canon = real
	}

	name := ""
	if remote, err := gitcmd.Run(repoRoot, "config", "--get", "remote.origin.url"); err == nil && remote != "" {
		name = remoteBasename(remote)
	}
	if name == "" {
		name = filepath.Base(canon)
	}

	slug := slugName(name)
	if runes := []rune(slug); len(runes) > 12 {
		slug = string(runes[:12])
	}
	sum := sha256.Sum256([]byte(canon))
	return slug + "-" + hex.EncodeToString(sum[:])[:6], nil
}

// remoteBasename takes the repository name off a git remote URL, which comes in
// three shapes: `https://host/owner/repo.git`, `ssh://git@host/path/repo.git`,
// and scp-like `git@host:owner/repo.git`. The last path segment (or, for the
// scp shape, the segment after the final colon) is the repo, minus any `.git`.
func remoteBasename(url string) string {
	u := strings.TrimSpace(url)
	u = strings.TrimSuffix(u, "/")
	if i := strings.LastIndex(u, "/"); i >= 0 {
		u = u[i+1:]
	} else if i := strings.LastIndex(u, ":"); i >= 0 {
		u = u[i+1:]
	}
	return strings.TrimSuffix(u, ".git")
}

// slugName lowercases and reduces a name to `[a-z0-9]` runs joined by single
// hyphens, so it always satisfies the `[a-z][a-z0-9_-]{0,31}` shape herdr
// enforces.
func slugName(s string) string {
	s = slugRe.ReplaceAllString(strings.ToLower(s), "-")
	return strings.Trim(s, "-")
}
