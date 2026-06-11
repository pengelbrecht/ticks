package github

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// CheckAndInstallMergeDrivers checks whether the merge drivers are registered
// in the local git config and installs them if not. It is safe to call on
// every command invocation — it skips the write if already configured.
func CheckAndInstallMergeDrivers(repoRoot string) error {
	// Guard: if repoRoot isn't actually a git repo, skip silently.
	if _, err := os.Stat(filepath.Join(repoRoot, ".git")); err != nil {
		return nil
	}

	cmd := exec.Command("git", "config", "--get", "merge.tick.driver")
	cmd.Dir = repoRoot
	out, err := cmd.Output()
	if err == nil && strings.TrimSpace(string(out)) != "" {
		// Already configured — nothing to do.
		return nil
	}
	// err != nil here means the key is absent (exit 1) — install the drivers.
	return ConfigureMergeDriver(repoRoot)
}

const mergeAttributeLine = ".tick/issues/*.json merge=tick"

// EnsureGitAttributes adds the tick merge driver line to .gitattributes if missing.
func EnsureGitAttributes(repoRoot string) error {
	path := filepath.Join(repoRoot, ".gitattributes")
	data, err := os.ReadFile(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("read .gitattributes: %w", err)
	}

	contents := string(data)
	for _, line := range strings.Split(contents, "\n") {
		if strings.TrimSpace(line) == mergeAttributeLine {
			return nil
		}
	}

	if contents != "" && !strings.HasSuffix(contents, "\n") {
		contents += "\n"
	}
	contents += mergeAttributeLine + "\n"

	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		return fmt.Errorf("write .gitattributes: %w", err)
	}
	return nil
}

// ConfigureMergeDriver sets the local git merge driver configuration.
func ConfigureMergeDriver(repoRoot string) error {
	if err := runGitConfig(repoRoot, "merge.tick.name", "tick JSON merge"); err != nil {
		return err
	}
	if err := runGitConfig(repoRoot, "merge.tick.driver", "tk merge-file %O %A %B %P"); err != nil {
		return err
	}
	return nil
}

func runGitConfig(repoRoot, key, value string) error {
	cmd := exec.Command("git", "config", key, value)
	cmd.Dir = repoRoot
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git config %s: %w", key, err)
	}
	return nil
}
