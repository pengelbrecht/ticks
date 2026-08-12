package cmd

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/skills"
)

// chdirToRepoRoot creates a fresh temp directory with a .git marker
// (enough for repoRoot() to resolve it as a repo root, without invoking the
// git binary), chdirs into it, and restores the original working directory
// on cleanup. It returns the repo root.
func chdirToRepoRoot(t *testing.T) string {
	t.Helper()

	dir := t.TempDir()
	if err := os.Mkdir(filepath.Join(dir, ".git"), 0o755); err != nil {
		t.Fatalf("mkdir .git: %v", err)
	}

	origDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("chdir to temp repo: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(origDir) })

	return dir
}

// chdirOutsideAnyRepo chdirs into a fresh temp directory that has no .git
// anywhere in its ancestry (t.TempDir() lives under the OS temp root, which
// is not inside this repo's working tree), and restores the original
// working directory on cleanup.
func chdirOutsideAnyRepo(t *testing.T) string {
	t.Helper()

	dir := t.TempDir()
	origDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("chdir outside repo: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(origDir) })

	return dir
}

func TestSkillsInstallDetectsClaudeOnly(t *testing.T) {
	root := chdirToRepoRoot(t)
	claudeDir := filepath.Join(root, ".claude", "skills")
	if err := os.MkdirAll(claudeDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	out, err := captureStdoutArgs(t, []string{"skills", "install", "ticks"})
	if err != nil {
		t.Fatalf("skills install: %v", err)
	}
	if !strings.Contains(out, filepath.Join(claudeDir, "ticks")) {
		t.Errorf("expected output to mention %s, got %q", claudeDir, out)
	}
	if _, statErr := os.Stat(filepath.Join(claudeDir, "ticks", "SKILL.md")); statErr != nil {
		t.Errorf("expected SKILL.md under .claude/skills/ticks: %v", statErr)
	}
	if _, statErr := os.Stat(filepath.Join(root, ".agents")); !os.IsNotExist(statErr) {
		t.Errorf("expected .agents/ never created, stat err = %v", statErr)
	}
}

func TestSkillsInstallDetectsAgentOnly(t *testing.T) {
	root := chdirToRepoRoot(t)
	agentDir := filepath.Join(root, ".agents", "skills")
	if err := os.MkdirAll(agentDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	out, err := captureStdoutArgs(t, []string{"skills", "install", "ticks"})
	if err != nil {
		t.Fatalf("skills install: %v", err)
	}
	if !strings.Contains(out, filepath.Join(agentDir, "ticks")) {
		t.Errorf("expected output to mention %s, got %q", agentDir, out)
	}
	if _, statErr := os.Stat(filepath.Join(agentDir, "ticks", "SKILL.md")); statErr != nil {
		t.Errorf("expected SKILL.md under .agents/skills/ticks: %v", statErr)
	}
	if _, statErr := os.Stat(filepath.Join(root, ".claude")); !os.IsNotExist(statErr) {
		t.Errorf("expected .claude/ never created, stat err = %v", statErr)
	}
}

func TestSkillsInstallDetectsBothIndependently(t *testing.T) {
	root := chdirToRepoRoot(t)
	claudeDir := filepath.Join(root, ".claude", "skills")
	agentDir := filepath.Join(root, ".agents", "skills")
	if err := os.MkdirAll(claudeDir, 0o755); err != nil {
		t.Fatalf("mkdir claude: %v", err)
	}
	if err := os.MkdirAll(agentDir, 0o755); err != nil {
		t.Fatalf("mkdir agent: %v", err)
	}

	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks"}); err != nil {
		t.Fatalf("skills install: %v", err)
	}

	for _, dir := range []string{filepath.Join(claudeDir, "ticks"), filepath.Join(agentDir, "ticks")} {
		if _, statErr := os.Stat(filepath.Join(dir, "SKILL.md")); statErr != nil {
			t.Errorf("expected SKILL.md under %s: %v", dir, statErr)
		}
		if _, err := skills.ReadStamp(dir); err != nil {
			t.Errorf("expected a stamp under %s: %v", dir, err)
		}
	}

	// Each target must be independently diffable.
	for _, dir := range []string{claudeDir, agentDir} {
		diff, err := skills.DiffDir("ticks", filepath.Join(dir, "ticks"))
		if err != nil {
			t.Fatalf("DiffDir(%s): %v", dir, err)
		}
		if !diff.OK() {
			t.Errorf("expected %s to match the bundle, diff = %s", dir, diff.String())
		}
	}
}

func TestSkillsInstallNeitherConventionErrors(t *testing.T) {
	root := chdirToRepoRoot(t)

	out, err := captureStdoutArgs(t, []string{"skills", "install", "ticks"})
	if err == nil {
		t.Fatal("expected an error when neither convention directory exists")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d (generic): %v", code, ExitGeneric, err)
	}
	if !strings.Contains(err.Error(), ".claude/skills") || !strings.Contains(err.Error(), ".agents/skills") {
		t.Errorf("expected error to name both conventions, got %q", err)
	}
	if !strings.Contains(err.Error(), "--dir") {
		t.Errorf("expected error to mention the --dir escape, got %q", err)
	}
	if out != "" {
		t.Errorf("expected no stdout output on outright refusal, got %q", out)
	}
	if _, statErr := os.Stat(filepath.Join(root, ".claude")); !os.IsNotExist(statErr) {
		t.Errorf("expected .claude/ never created, stat err = %v", statErr)
	}
	if _, statErr := os.Stat(filepath.Join(root, ".agents")); !os.IsNotExist(statErr) {
		t.Errorf("expected .agents/ never created, stat err = %v", statErr)
	}
}

func TestSkillsInstallOutsideRepoErrorsMentionsRepo(t *testing.T) {
	chdirOutsideAnyRepo(t)

	_, err := captureStdoutArgs(t, []string{"skills", "install", "ticks"})
	if err == nil {
		t.Fatal("expected an error when run outside a git repository")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d (generic): %v", code, ExitGeneric, err)
	}
	if !strings.Contains(err.Error(), "repository") {
		t.Errorf("expected error to mention running inside a repo, got %q", err)
	}
	if !strings.Contains(err.Error(), "--dir") {
		t.Errorf("expected error to mention the --dir escape, got %q", err)
	}
}

func TestSkillsInstallPerTargetUnmanagedRefusal(t *testing.T) {
	root := chdirToRepoRoot(t)
	claudeDir := filepath.Join(root, ".claude", "skills")
	agentDir := filepath.Join(root, ".agents", "skills")
	if err := os.MkdirAll(claudeDir, 0o755); err != nil {
		t.Fatalf("mkdir claude: %v", err)
	}
	// The agent target already has hand-edited content and no tk stamp.
	agentTarget := filepath.Join(agentDir, "ticks")
	if err := os.MkdirAll(agentTarget, 0o755); err != nil {
		t.Fatalf("mkdir agent target: %v", err)
	}
	handEdited := filepath.Join(agentTarget, "notes.txt")
	if err := os.WriteFile(handEdited, []byte("hand-written"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	_, err := captureStdoutArgs(t, []string{"skills", "install", "ticks"})
	if err == nil {
		t.Fatal("expected an error: one target is unmanaged")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage/refusal): %v", code, ExitUsage, err)
	}

	// Managed (empty) claude target: install succeeded.
	if _, statErr := os.Stat(filepath.Join(claudeDir, "ticks", "SKILL.md")); statErr != nil {
		t.Errorf("expected the claude target to install despite the agent refusal: %v", statErr)
	}
	// Unmanaged agent target: refused, untouched.
	if _, statErr := os.Stat(filepath.Join(agentTarget, "SKILL.md")); !os.IsNotExist(statErr) {
		t.Errorf("expected the agent target to be refused (no SKILL.md written), stat err = %v", statErr)
	}
	if data, rerr := os.ReadFile(handEdited); rerr != nil || string(data) != "hand-written" {
		t.Errorf("expected notes.txt to survive the refused install, data=%q err=%v", data, rerr)
	}
}

func TestSkillsInstallDirFlagBypassesDetection(t *testing.T) {
	root := chdirToRepoRoot(t)
	// Neither convention directory exists, but --dir should bypass detection
	// entirely rather than erroring.
	explicit := filepath.Join(t.TempDir(), "ticks")

	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", explicit}); err != nil {
		t.Fatalf("skills install --dir: %v", err)
	}
	if _, statErr := os.Stat(filepath.Join(explicit, "SKILL.md")); statErr != nil {
		t.Errorf("expected SKILL.md at explicit --dir: %v", statErr)
	}
	if _, statErr := os.Stat(filepath.Join(root, ".claude")); !os.IsNotExist(statErr) {
		t.Errorf("expected .claude/ never created when --dir bypasses detection, stat err = %v", statErr)
	}
}

func TestSkillsDiffDetectsBothIndependently(t *testing.T) {
	root := chdirToRepoRoot(t)
	claudeDir := filepath.Join(root, ".claude", "skills")
	agentDir := filepath.Join(root, ".agents", "skills")
	if err := os.MkdirAll(claudeDir, 0o755); err != nil {
		t.Fatalf("mkdir claude: %v", err)
	}
	if err := os.MkdirAll(agentDir, 0o755); err != nil {
		t.Fatalf("mkdir agent: %v", err)
	}
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks"}); err != nil {
		t.Fatalf("skills install: %v", err)
	}

	out, err := captureStdoutArgs(t, []string{"skills", "diff", "ticks"})
	if err != nil {
		t.Fatalf("skills diff: %v", err)
	}
	if code := GetExitCode(err); code != ExitSuccess {
		t.Errorf("exit code = %d, want %d", code, ExitSuccess)
	}
	if !strings.Contains(out, filepath.Join(claudeDir, "ticks")) || !strings.Contains(out, filepath.Join(agentDir, "ticks")) {
		t.Errorf("expected output to report both targets, got %q", out)
	}
	if strings.Count(out, "no drift") != 2 {
		t.Errorf("expected two clean reports, got %q", out)
	}
}

func TestSkillsDiffAggregateExitOneIfAnyTargetDrifts(t *testing.T) {
	root := chdirToRepoRoot(t)
	claudeDir := filepath.Join(root, ".claude", "skills")
	agentDir := filepath.Join(root, ".agents", "skills")
	if err := os.MkdirAll(claudeDir, 0o755); err != nil {
		t.Fatalf("mkdir claude: %v", err)
	}
	if err := os.MkdirAll(agentDir, 0o755); err != nil {
		t.Fatalf("mkdir agent: %v", err)
	}
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks"}); err != nil {
		t.Fatalf("skills install: %v", err)
	}

	// Drift only the agent target.
	target := filepath.Join(agentDir, "ticks", "SKILL.md")
	data, rerr := os.ReadFile(target)
	if rerr != nil {
		t.Fatalf("read: %v", rerr)
	}
	if err := os.WriteFile(target, append(data, []byte("\nedited\n")...), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	out, err := captureStdoutArgs(t, []string{"skills", "diff", "ticks"})
	if err == nil {
		t.Fatal("expected an error: one target drifted")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d (drift): %v", code, ExitGeneric, err)
	}
	if strings.Count(out, "no drift") != 1 {
		t.Errorf("expected exactly one clean target reported, got %q", out)
	}
	if !strings.Contains(out, "SKILL.md") {
		t.Errorf("expected the drifted file named in output, got %q", out)
	}
}

func TestSkillsDiffNeitherConventionErrors(t *testing.T) {
	chdirToRepoRoot(t)

	_, err := captureStdoutArgs(t, []string{"skills", "diff", "ticks"})
	if err == nil {
		t.Fatal("expected an error when neither convention directory exists")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d (generic): %v", code, ExitGeneric, err)
	}
	if !strings.Contains(err.Error(), ".claude/skills") || !strings.Contains(err.Error(), ".agents/skills") {
		t.Errorf("expected error to name both conventions, got %q", err)
	}
}

func TestSkillsDiffDirFlagBypassesDetection(t *testing.T) {
	root := chdirToRepoRoot(t)
	claudeDir := filepath.Join(root, ".claude", "skills")
	if err := os.MkdirAll(claudeDir, 0o755); err != nil {
		t.Fatalf("mkdir claude: %v", err)
	}
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks"}); err != nil {
		t.Fatalf("skills install: %v", err)
	}

	// An explicit --dir pointing elsewhere should be diffed on its own,
	// ignoring the detected .claude/skills/ticks target.
	explicit := filepath.Join(t.TempDir(), "ticks")
	if _, err := captureStdoutArgs(t, []string{"skills", "install", "ticks", "--dir", explicit}); err != nil {
		t.Fatalf("skills install --dir: %v", err)
	}

	out, err := captureStdoutArgs(t, []string{"skills", "diff", "ticks", "--dir", explicit})
	if err != nil {
		t.Fatalf("skills diff --dir: %v", err)
	}
	if strings.Contains(out, claudeDir) {
		t.Errorf("expected --dir diff to ignore the detected convention target, got %q", out)
	}
}
