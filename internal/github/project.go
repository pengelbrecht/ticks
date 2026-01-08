package github

import (
	"fmt"
	"strings"
)

const (
	sshPrefix   = "git@github.com:"
	httpsPrefix = "https://github.com/"
)

// ParseProjectFromRemote extracts owner/repo from a git remote URL.
func ParseProjectFromRemote(remote string) (string, error) {
	remote = strings.TrimSpace(remote)
	switch {
	case strings.HasPrefix(remote, sshPrefix):
		return parsePath(strings.TrimPrefix(remote, sshPrefix))
	case strings.HasPrefix(remote, httpsPrefix):
		return parsePath(strings.TrimPrefix(remote, httpsPrefix))
	default:
		return "", fmt.Errorf("unsupported remote format: %s", remote)
	}
}

func parsePath(path string) (string, error) {
	path = strings.TrimSuffix(path, ".git")
	parts := strings.Split(path, "/")
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid remote path: %s", path)
	}
	owner := parts[0]
	repo := parts[1]
	if owner == "" || repo == "" {
		return "", fmt.Errorf("invalid remote path: %s", path)
	}
	return owner + "/" + repo, nil
}
