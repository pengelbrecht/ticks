package worktree

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// gitignoreEntry is the pattern added to .gitignore.
const gitignoreEntry = ".worktrees/"

// gitignoreComment is the comment added before the entry.
const gitignoreComment = "# Ticker worktrees"

// EnsureGitignore checks if .worktrees/ is in .gitignore and adds it if not.
// Creates .gitignore if it doesn't exist.
// Returns true if .gitignore was modified.
func EnsureGitignore(repoRoot string) (bool, error) {
	// First check if .worktrees/ is already ignored (handles complex .gitignore patterns)
	ignored, err := isIgnored(repoRoot, DefaultWorktreeDir)
	if err != nil {
		return false, err
	}
	if ignored {
		return false, nil
	}

	// Need to add .worktrees/ to .gitignore
	gitignorePath := filepath.Join(repoRoot, ".gitignore")

	// Read existing content if file exists
	var existingContent []byte
	existingContent, err = os.ReadFile(gitignorePath)
	if err != nil && !os.IsNotExist(err) {
		return false, err
	}

	// Build new content
	var newContent strings.Builder

	if len(existingContent) > 0 {
		content := string(existingContent)
		newContent.WriteString(content)

		// Ensure trailing newline before adding our entry
		if !strings.HasSuffix(content, "\n") {
			newContent.WriteString("\n")
		}
		newContent.WriteString("\n") // Blank line before our section
	}

	// Add our entry with comment
	newContent.WriteString(gitignoreComment)
	newContent.WriteString("\n")
	newContent.WriteString(gitignoreEntry)
	newContent.WriteString("\n")

	// Write the file
	if err := os.WriteFile(gitignorePath, []byte(newContent.String()), 0644); err != nil {
		return false, err
	}

	return true, nil
}

// isIgnored checks if a path is covered by .gitignore.
// Uses git check-ignore to handle complex gitignore patterns.
// Adds trailing slash to check as directory since worktrees dir may not exist yet.
func isIgnored(repoRoot, path string) (bool, error) {
	// Add trailing slash to indicate we're checking for a directory
	// This allows git check-ignore to match patterns like ".worktrees/"
	// even when the directory doesn't exist yet
	checkPath := strings.TrimSuffix(path, "/") + "/"

	cmd := exec.Command("git", "check-ignore", "-q", checkPath)
	cmd.Dir = repoRoot

	err := cmd.Run()
	if err == nil {
		// Exit 0 means path is ignored
		return true, nil
	}

	// Exit 1 means path is not ignored
	if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
		return false, nil
	}

	// Other errors (git command failed)
	return false, err
}
