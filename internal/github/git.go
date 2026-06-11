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

	// Probe for the newer tick-activity driver (not tick) so existing clones that
	// already have the old tick driver but lack tick-activity get upgraded too.
	cmd := exec.Command("git", "config", "--get", "merge.tick-activity.driver")
	cmd.Dir = repoRoot
	out, err := cmd.Output()
	if err == nil && strings.TrimSpace(string(out)) != "" {
		// Both drivers already configured — nothing to do.
		return nil
	}
	// key absent (exit 1) or empty — install / upgrade all drivers.
	return ConfigureMergeDriver(repoRoot)
}

const mergeAttributeLine = ".tick/issues/*.json merge=tick"
const mergeActivityAttributeLine = ".tick/activity/activity.jsonl merge=tick-activity"

// EnsureGitAttributes adds the tick and tick-activity merge driver lines to
// .gitattributes if missing. It is idempotent — calling it when both lines
// already exist is a no-op.
func EnsureGitAttributes(repoRoot string) error {
	path := filepath.Join(repoRoot, ".gitattributes")
	data, err := os.ReadFile(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("read .gitattributes: %w", err)
	}

	contents := string(data)

	required := []string{mergeAttributeLine, mergeActivityAttributeLine}
	var missing []string
	for _, want := range required {
		found := false
		for _, line := range strings.Split(contents, "\n") {
			if strings.TrimSpace(line) == want {
				found = true
				break
			}
		}
		if !found {
			missing = append(missing, want)
		}
	}

	if len(missing) == 0 {
		return nil
	}

	if contents != "" && !strings.HasSuffix(contents, "\n") {
		contents += "\n"
	}
	for _, line := range missing {
		contents += line + "\n"
	}

	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		return fmt.Errorf("write .gitattributes: %w", err)
	}
	return nil
}

// ConfigureMergeDriver sets the local git merge driver configuration for both
// the tick (JSON) and tick-activity (JSONL) drivers.
func ConfigureMergeDriver(repoRoot string) error {
	if err := runGitConfig(repoRoot, "merge.tick.name", "tick JSON merge"); err != nil {
		return err
	}
	if err := runGitConfig(repoRoot, "merge.tick.driver", "tk merge-file %O %A %B %P"); err != nil {
		return err
	}
	if err := runGitConfig(repoRoot, "merge.tick-activity.name", "tick-activity JSONL merge"); err != nil {
		return err
	}
	if err := runGitConfig(repoRoot, "merge.tick-activity.driver", "tk merge-activity %O %A %B %P"); err != nil {
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
