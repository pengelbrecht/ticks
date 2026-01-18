package verify

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// GitVerifier checks that there are no uncommitted changes.
// If a baseline is set, only reports changes that are new since the baseline.
type GitVerifier struct {
	dir      string
	baseline map[string]bool // Files that were already uncommitted at task start
}

// excludedPaths are paths that GitVerifier ignores.
// These are ticker's own metadata files that change during execution.
var excludedPaths = []string{
	".tick/",
	".ticker/",
}

// NewGitVerifier creates a git verifier for the given directory.
// Returns nil if directory is not a git repository.
func NewGitVerifier(dir string) *GitVerifier {
	// Check if .git exists in the directory
	gitDir := filepath.Join(dir, ".git")
	info, err := os.Stat(gitDir)
	if err != nil || !info.IsDir() {
		return nil
	}
	return &GitVerifier{dir: dir}
}

// CaptureBaseline captures current uncommitted files as a baseline.
// Call this at task start to later compare against.
// After setting a baseline, Verify() will only flag NEW changes.
func (v *GitVerifier) CaptureBaseline() error {
	files, err := v.getUncommittedFiles()
	if err != nil {
		return err
	}
	v.baseline = files
	return nil
}

// SetBaseline sets the baseline of pre-existing uncommitted files.
// Files in this map will be ignored during verification.
func (v *GitVerifier) SetBaseline(files map[string]bool) {
	v.baseline = files
}

// GetBaseline returns the current baseline map.
// Returns nil if no baseline has been captured.
func (v *GitVerifier) GetBaseline() map[string]bool {
	return v.baseline
}

// getUncommittedFiles returns a map of currently uncommitted file paths.
func (v *GitVerifier) getUncommittedFiles() (map[string]bool, error) {
	cmd := exec.Command("git", "status", "--porcelain")
	cmd.Dir = v.dir

	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	files := make(map[string]bool)
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if line == "" {
			continue
		}
		// Git status --porcelain format: first 2 chars are status, then space, then path
		if len(line) > 3 {
			path := line[3:]
			// Skip excluded paths
			excluded := false
			for _, excludedPath := range excludedPaths {
				if strings.HasPrefix(path, excludedPath) {
					excluded = true
					break
				}
			}
			if !excluded {
				files[path] = true
			}
		}
	}
	return files, nil
}

// Name returns "git".
func (v *GitVerifier) Name() string {
	return "git"
}

// Verify checks for uncommitted changes using git status.
// Passes if working tree is clean (nothing to commit).
// Fails if there are uncommitted changes, listing them in output.
// If a baseline is set, only reports changes that are new since the baseline.
func (v *GitVerifier) Verify(ctx context.Context, taskID string, agentOutput string) *Result {
	start := time.Now()

	result := &Result{
		Verifier: v.Name(),
	}

	// Run git status --porcelain
	cmd := exec.CommandContext(ctx, "git", "status", "--porcelain")
	cmd.Dir = v.dir

	output, err := cmd.Output()
	result.Duration = time.Since(start)

	if err != nil {
		// Check if git is not installed
		if execErr, ok := err.(*exec.Error); ok {
			result.Passed = false
			result.Error = execErr
			result.Output = "git command not found"
			return result
		}
		// Other error (e.g., not a git repo, though NewGitVerifier should catch that)
		result.Passed = false
		result.Error = err
		result.Output = err.Error()
		return result
	}

	// Filter out excluded paths (ticker metadata) and baseline files
	outputStr := strings.TrimSpace(v.filterChanges(string(output)))

	// Empty output means clean working tree (or all changes pre-existing)
	if outputStr == "" {
		result.Passed = true
		if len(v.baseline) > 0 {
			result.Output = "no new uncommitted changes (pre-existing changes ignored)"
		} else {
			result.Output = "working tree clean"
		}
		return result
	}

	// Non-empty output means new uncommitted changes
	result.Passed = false
	result.Output = outputStr
	return result
}

// filterChanges removes excluded paths and baseline files from git status output.
// Git status --porcelain format: "XY PATH" where XY is status, PATH is file path.
func (v *GitVerifier) filterChanges(output string) string {
	if output == "" {
		return ""
	}

	lines := strings.Split(output, "\n")
	var filtered []string

	for _, line := range lines {
		if line == "" {
			continue
		}

		// Git status --porcelain format: first 2 chars are status, then space, then path
		path := ""
		if len(line) > 3 {
			path = line[3:] // Skip "XY " prefix
		}

		// Skip excluded paths (ticker metadata)
		excluded := false
		for _, excludedPath := range excludedPaths {
			if strings.HasPrefix(path, excludedPath) {
				excluded = true
				break
			}
		}
		if excluded {
			continue
		}

		// Skip files that were in the baseline (pre-existing uncommitted changes)
		if v.baseline != nil && v.baseline[path] {
			continue
		}

		filtered = append(filtered, line)
	}

	return strings.Join(filtered, "\n")
}
