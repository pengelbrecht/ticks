package github

import (
	"fmt"
	"os"
	"strings"
)

// DetectOwner resolves owner via TICK_OWNER or git config user.email.
func DetectOwner(run CommandRunner) (string, error) {
	if owner := strings.TrimSpace(os.Getenv("TICK_OWNER")); owner != "" {
		return owner, nil
	}

	if run == nil {
		run = defaultRunner
	}

	out, err := run("git", "config", "user.email")
	if err != nil {
		return "", fmt.Errorf("failed to resolve owner via git config user.email: %w", err)
	}

	owner := strings.TrimSpace(string(out))
	if owner == "" {
		return "", fmt.Errorf("git config user.email returned empty owner")
	}

	return owner, nil
}
