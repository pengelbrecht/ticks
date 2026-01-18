package worktree

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEnsureGitignore(t *testing.T) {
	t.Run("adds entry to existing .gitignore", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Create existing .gitignore
		gitignorePath := filepath.Join(dir, ".gitignore")
		existingContent := "node_modules/\n*.log\n"
		if err := os.WriteFile(gitignorePath, []byte(existingContent), 0644); err != nil {
			t.Fatalf("failed to create .gitignore: %v", err)
		}

		modified, err := EnsureGitignore(dir)
		if err != nil {
			t.Fatalf("EnsureGitignore() error = %v", err)
		}
		if !modified {
			t.Error("EnsureGitignore() should return true when file is modified")
		}

		// Verify content
		content, err := os.ReadFile(gitignorePath)
		if err != nil {
			t.Fatalf("failed to read .gitignore: %v", err)
		}
		contentStr := string(content)

		// Should preserve existing content
		if !strings.Contains(contentStr, "node_modules/") {
			t.Error(".gitignore should preserve existing node_modules/ entry")
		}
		if !strings.Contains(contentStr, "*.log") {
			t.Error(".gitignore should preserve existing *.log entry")
		}

		// Should add our entry
		if !strings.Contains(contentStr, gitignoreComment) {
			t.Error(".gitignore should contain ticker comment")
		}
		if !strings.Contains(contentStr, gitignoreEntry) {
			t.Error(".gitignore should contain .worktrees/ entry")
		}
	})

	t.Run("creates .gitignore if missing", func(t *testing.T) {
		dir := createTempGitRepo(t)

		gitignorePath := filepath.Join(dir, ".gitignore")

		// Verify .gitignore doesn't exist
		if _, err := os.Stat(gitignorePath); !os.IsNotExist(err) {
			t.Fatal(".gitignore should not exist initially")
		}

		modified, err := EnsureGitignore(dir)
		if err != nil {
			t.Fatalf("EnsureGitignore() error = %v", err)
		}
		if !modified {
			t.Error("EnsureGitignore() should return true when file is created")
		}

		// Verify file was created
		content, err := os.ReadFile(gitignorePath)
		if err != nil {
			t.Fatalf("failed to read .gitignore: %v", err)
		}
		contentStr := string(content)

		if !strings.Contains(contentStr, gitignoreComment) {
			t.Error(".gitignore should contain ticker comment")
		}
		if !strings.Contains(contentStr, gitignoreEntry) {
			t.Error(".gitignore should contain .worktrees/ entry")
		}
	})

	t.Run("handles .gitignore without trailing newline", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Create .gitignore without trailing newline
		gitignorePath := filepath.Join(dir, ".gitignore")
		existingContent := "node_modules/" // No trailing newline
		if err := os.WriteFile(gitignorePath, []byte(existingContent), 0644); err != nil {
			t.Fatalf("failed to create .gitignore: %v", err)
		}

		modified, err := EnsureGitignore(dir)
		if err != nil {
			t.Fatalf("EnsureGitignore() error = %v", err)
		}
		if !modified {
			t.Error("EnsureGitignore() should return true when file is modified")
		}

		// Verify content is properly formatted
		content, err := os.ReadFile(gitignorePath)
		if err != nil {
			t.Fatalf("failed to read .gitignore: %v", err)
		}
		contentStr := string(content)

		// Should have proper separation between existing and new content
		if !strings.Contains(contentStr, "node_modules/\n\n") {
			t.Error(".gitignore should have newline added after existing content without trailing newline")
		}
		if !strings.Contains(contentStr, gitignoreEntry) {
			t.Error(".gitignore should contain .worktrees/ entry")
		}
	})

	t.Run("idempotent - does not add duplicate", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// First call - should modify
		modified1, err := EnsureGitignore(dir)
		if err != nil {
			t.Fatalf("EnsureGitignore() first call error = %v", err)
		}
		if !modified1 {
			t.Error("First call should modify .gitignore")
		}

		// Read content after first call
		gitignorePath := filepath.Join(dir, ".gitignore")
		content1, err := os.ReadFile(gitignorePath)
		if err != nil {
			t.Fatalf("failed to read .gitignore: %v", err)
		}

		// Second call - should not modify (idempotent)
		modified2, err := EnsureGitignore(dir)
		if err != nil {
			t.Fatalf("EnsureGitignore() second call error = %v", err)
		}
		if modified2 {
			t.Error("Second call should NOT modify .gitignore (idempotent)")
		}

		// Verify content unchanged
		content2, err := os.ReadFile(gitignorePath)
		if err != nil {
			t.Fatalf("failed to read .gitignore: %v", err)
		}
		if string(content1) != string(content2) {
			t.Error("Content should be unchanged after second call")
		}

		// Verify only one entry
		if strings.Count(string(content2), gitignoreEntry) != 1 {
			t.Errorf("Should have exactly one .worktrees/ entry, got content:\n%s", content2)
		}
	})

	t.Run("detects existing coverage", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Create .gitignore that already covers .worktrees/
		gitignorePath := filepath.Join(dir, ".gitignore")
		existingContent := ".worktrees/\n"
		if err := os.WriteFile(gitignorePath, []byte(existingContent), 0644); err != nil {
			t.Fatalf("failed to create .gitignore: %v", err)
		}

		modified, err := EnsureGitignore(dir)
		if err != nil {
			t.Fatalf("EnsureGitignore() error = %v", err)
		}
		if modified {
			t.Error("EnsureGitignore() should return false when path is already ignored")
		}

		// Verify content unchanged (no duplicate)
		content, err := os.ReadFile(gitignorePath)
		if err != nil {
			t.Fatalf("failed to read .gitignore: %v", err)
		}
		if string(content) != existingContent {
			t.Errorf("Content should be unchanged, got:\n%s", content)
		}
	})

	t.Run("detects wildcard coverage", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Create .gitignore with pattern that covers .worktrees
		gitignorePath := filepath.Join(dir, ".gitignore")
		existingContent := ".*\n" // Ignores all dotfiles/directories
		if err := os.WriteFile(gitignorePath, []byte(existingContent), 0644); err != nil {
			t.Fatalf("failed to create .gitignore: %v", err)
		}

		modified, err := EnsureGitignore(dir)
		if err != nil {
			t.Fatalf("EnsureGitignore() error = %v", err)
		}
		if modified {
			t.Error("EnsureGitignore() should return false when path is covered by wildcard pattern")
		}
	})
}

func TestIsIgnored(t *testing.T) {
	t.Run("returns true for ignored path", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Create .gitignore with directory pattern
		gitignorePath := filepath.Join(dir, ".gitignore")
		if err := os.WriteFile(gitignorePath, []byte("ignored/\n"), 0644); err != nil {
			t.Fatalf("failed to create .gitignore: %v", err)
		}

		// isIgnored checks with trailing slash, so "ignored" matches "ignored/"
		ignored, err := isIgnored(dir, "ignored")
		if err != nil {
			t.Fatalf("isIgnored() error = %v", err)
		}
		if !ignored {
			t.Error("isIgnored() should return true for ignored path")
		}
	})

	t.Run("returns true for ignored path with trailing slash", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Create .gitignore with directory pattern
		gitignorePath := filepath.Join(dir, ".gitignore")
		if err := os.WriteFile(gitignorePath, []byte("ignored/\n"), 0644); err != nil {
			t.Fatalf("failed to create .gitignore: %v", err)
		}

		// Test with trailing slash in input
		ignored, err := isIgnored(dir, "ignored/")
		if err != nil {
			t.Fatalf("isIgnored() error = %v", err)
		}
		if !ignored {
			t.Error("isIgnored() should return true for ignored path with trailing slash")
		}
	})

	t.Run("returns false for non-ignored path", func(t *testing.T) {
		dir := createTempGitRepo(t)

		// Create .gitignore without our path
		gitignorePath := filepath.Join(dir, ".gitignore")
		if err := os.WriteFile(gitignorePath, []byte("other/\n"), 0644); err != nil {
			t.Fatalf("failed to create .gitignore: %v", err)
		}

		ignored, err := isIgnored(dir, "notignored")
		if err != nil {
			t.Fatalf("isIgnored() error = %v", err)
		}
		if ignored {
			t.Error("isIgnored() should return false for non-ignored path")
		}
	})

	t.Run("returns false when no .gitignore exists", func(t *testing.T) {
		dir := createTempGitRepo(t)

		ignored, err := isIgnored(dir, ".worktrees")
		if err != nil {
			t.Fatalf("isIgnored() error = %v", err)
		}
		if ignored {
			t.Error("isIgnored() should return false when no .gitignore exists")
		}
	})
}
