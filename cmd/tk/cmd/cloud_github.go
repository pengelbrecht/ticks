package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// cloudDetectOwner and cloudDetectProject below are a deliberate COPY of
// internal/github's DetectOwner and DetectProject (owner.go, project.go),
// not an import.
//
// internal/github is never split or partially promoted out of internal/:
// alongside these two lookups it also carries the project's OAuth
// device-flow token exchange, and a frozen public API around credential
// handling has been refused three times already for the same reason (5yk).
// The cloud and factory command files' edge into that package is cut by
// duplicating the handful of lines they actually use, not by carving a new
// export surface out of a package that also holds credential logic. Keep
// this file in sync by hand with internal/github/owner.go and project.go.

// cloudDetectOwner resolves the operator identity: TICK_OWNER if set,
// otherwise `git config user.email`.
func cloudDetectOwner() (string, error) {
	if owner := strings.TrimSpace(os.Getenv("TICK_OWNER")); owner != "" {
		return owner, nil
	}

	out, err := exec.Command("git", "config", "user.email").Output()
	if err != nil {
		return "", fmt.Errorf("failed to resolve owner via git config user.email: %w", err)
	}

	owner := strings.TrimSpace(string(out))
	if owner == "" {
		return "", fmt.Errorf("git config user.email returned empty owner")
	}

	return owner, nil
}

// cloudDetectProject resolves the current git remote project (owner/repo)
// via origin.
func cloudDetectProject() (string, error) {
	out, err := exec.Command("git", "remote", "get-url", "origin").Output()
	if err != nil {
		return "", fmt.Errorf("failed to read git remote: %w", err)
	}
	project, err := cloudParseProjectFromRemote(string(out))
	if err != nil {
		return "", err
	}
	return project, nil
}

// cloudParseProjectFromRemote extracts owner/repo from a git remote URL.
//
// It handles the common GitHub forms (scp-like SSH "git@host:owner/repo" and
// "scheme://[user@]host[:port]/owner/repo") as well as proxied remotes that
// prepend path segments, e.g. the sandbox form
// "http://local_proxy@127.0.0.1:PORT/git/owner/repo". The owner/repo pair is
// taken from the last two path segments.
func cloudParseProjectFromRemote(remote string) (string, error) {
	remote = strings.TrimSpace(remote)

	var path string
	switch {
	case strings.Contains(remote, "://"):
		// URL form: drop scheme and authority, keep the path.
		rest := remote[strings.Index(remote, "://")+len("://"):]
		slash := strings.IndexByte(rest, '/')
		if slash == -1 {
			return "", fmt.Errorf("unsupported remote format: %s", remote)
		}
		path = rest[slash+1:]
	case strings.ContainsRune(remote, ':'):
		// scp-like SSH form: [user@]host:owner/repo
		path = remote[strings.IndexByte(remote, ':')+1:]
	default:
		return "", fmt.Errorf("unsupported remote format: %s", remote)
	}

	return cloudParseProjectPath(path)
}

func cloudParseProjectPath(path string) (string, error) {
	path = strings.TrimSuffix(strings.TrimSpace(path), ".git")

	var parts []string
	for _, p := range strings.Split(path, "/") {
		if p != "" {
			parts = append(parts, p)
		}
	}
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid remote path: %s", path)
	}

	owner := parts[len(parts)-2]
	repo := parts[len(parts)-1]
	return owner + "/" + repo, nil
}
