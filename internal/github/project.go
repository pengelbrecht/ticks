package github

import (
	"fmt"
	"strings"
)

// ParseProjectFromRemote extracts owner/repo from a git remote URL.
//
// It handles the common GitHub forms (scp-like SSH "git@host:owner/repo" and
// "scheme://[user@]host[:port]/owner/repo") as well as proxied remotes that
// prepend path segments, e.g. the sandbox form
// "http://local_proxy@127.0.0.1:PORT/git/owner/repo". The owner/repo pair is
// taken from the last two path segments.
func ParseProjectFromRemote(remote string) (string, error) {
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

	return parsePath(path)
}

// DetectProject resolves the current git remote project via origin.
func DetectProject(run CommandRunner) (string, error) {
	if run == nil {
		run = defaultRunner
	}
	out, err := run("git", "remote", "get-url", "origin")
	if err != nil {
		return "", fmt.Errorf("failed to read git remote: %w", err)
	}
	project, err := ParseProjectFromRemote(string(out))
	if err != nil {
		return "", err
	}
	return project, nil
}

func parsePath(path string) (string, error) {
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
