package cmd

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
)

// `tk sandbox` is how the cloud entrypoint reaches the repository's own
// `[sandbox]` declaration: the container shells out to it after its clone
// rather than teaching a shell script to parse TOML. These tests pin that
// surface, because a boot script depends on it.

const sandboxRunners = `version = 2

[roles.implement]
kind = "claude"
model = "sonnet"

[sandbox]
image = "registry.example.com/acme/orchestrator:2.0.0"
toolchain = ["rust@1.90.0", "python@3.13"]
setup = [
  { command = "echo warmed >> $PWD/warm.log", description = "warm the caches" },
]
`

func sandboxRepo(t *testing.T, runners string) string {
	t.Helper()
	dir, _ := setupSpawnRepo(t, runners)
	return dir
}

func TestSandboxImageFallsBackToTheVersionPinnedBase(t *testing.T) {
	root := sandboxRepo(t, validRunners)
	out := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"sandbox", "image", "--root", root, "--tk-version", "0.32.0"}); err != nil {
		t.Fatalf("tk sandbox image: %v", err)
	}
	if got := strings.TrimSpace(out.String()); got != "ticks-orchestrator:0.32.0" {
		t.Errorf("image = %q, want the version-pinned base", got)
	}
}

func TestSandboxImageReportsADeclaredImage(t *testing.T) {
	root := sandboxRepo(t, sandboxRunners)
	out := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"sandbox", "image", "--root", root, "--tk-version", "0.32.0"}); err != nil {
		t.Fatalf("tk sandbox image: %v", err)
	}
	if !strings.Contains(out.String(), "registry.example.com/acme/orchestrator:2.0.0") {
		t.Errorf("image output does not carry the declared reference:\n%s", out.String())
	}
}

// `--declared-only` is what the entrypoint asks with: it wants to know whether
// the repository is asking for something the control plane did not boot, and
// silence is the answer for the 99% path.
func TestSandboxImageDeclaredOnlyIsSilentWhenNothingIsDeclared(t *testing.T) {
	root := sandboxRepo(t, validRunners)
	out := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"sandbox", "image", "--root", root, "--declared-only"}); err != nil {
		t.Fatalf("tk sandbox image: %v", err)
	}
	if got := strings.TrimSpace(out.String()); got != "" {
		t.Errorf("output = %q, want nothing", got)
	}
}

func TestSandboxToolchainPrintsTheDeclaredPins(t *testing.T) {
	root := sandboxRepo(t, sandboxRunners)
	out := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"sandbox", "toolchain", "--root", root}); err != nil {
		t.Fatalf("tk sandbox toolchain: %v", err)
	}
	if got := strings.TrimSpace(out.String()); got != "rust@1.90.0\npython@3.13" {
		t.Errorf("toolchain = %q, want both pins in file order", got)
	}

	plain := sandboxRepo(t, validRunners)
	out2 := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"sandbox", "toolchain", "--root", plain}); err != nil {
		t.Fatalf("tk sandbox toolchain: %v", err)
	}
	if got := strings.TrimSpace(out2.String()); got != "" {
		t.Errorf("output = %q, want nothing for a repo that declares no extra toolchain", got)
	}
}

const environmentRunners = `version = 2

[roles.implement]
kind = "claude"

[environment.commands]
marker = { command = "touch $TICKS_TEST_ENV_MARKER", description = "migrated marker" }
`

func TestSandboxEnvironmentRunsMigratedChecks(t *testing.T) {
	root := sandboxRepo(t, environmentRunners)
	marker := filepath.Join(root, "environment-check-ran")
	t.Setenv("TICKS_TEST_ENV_MARKER", marker)
	out := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"sandbox", "environment", "--root", root}); err != nil {
		t.Fatalf("tk sandbox environment: %v\n%s", err, out.String())
	}
	if _, err := os.Stat(marker); err != nil {
		t.Fatalf("migrated environment check did not run: %v\n%s", err, out.String())
	}
	if !strings.Contains(out.String(), "migrated marker") {
		t.Errorf("output does not name the migrated check:\n%s", out.String())
	}
}

func TestSandboxEnvironmentNamesAFailingCheck(t *testing.T) {
	root := sandboxRepo(t, `version = 2

[roles.implement]
kind = "claude"

[environment.commands]
database = { command = "false", description = "database available" }
`)
	out := captureCmdOutput(t)

	err := ExecuteArgs([]string{"sandbox", "environment", "--root", root})
	if err == nil {
		t.Fatalf("a failing environment check returned nil\n%s", out.String())
	}
	if !strings.Contains(out.String(), "database available") {
		t.Errorf("failure does not name the check:\n%s", out.String())
	}
	if !strings.Contains(out.String(), "environment pre-flight red") {
		t.Errorf("failure does not identify the red pre-flight:\n%s", out.String())
	}
}

func TestSandboxEnvironmentReportsWhenNoChecksAreDeclared(t *testing.T) {
	root := sandboxRepo(t, validRunners)
	out := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"sandbox", "environment", "--root", root}); err != nil {
		t.Fatalf("tk sandbox environment: %v\n%s", err, out.String())
	}
	if !strings.Contains(out.String(), "no [environment.commands]") {
		t.Errorf("empty environment declaration is not distinguishable in the log:\n%s", out.String())
	}
}

func TestSandboxSetupRunsAndThenSkips(t *testing.T) {
	root := sandboxRepo(t, sandboxRunners)
	out := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"sandbox", "setup", "--root", root}); err != nil {
		t.Fatalf("tk sandbox setup: %v", err)
	}
	log, err := os.ReadFile(filepath.Join(root, "warm.log"))
	if err != nil {
		t.Fatalf("the setup command did not run: %v\n%s", err, out.String())
	}
	if strings.Count(string(log), "warmed") != 1 {
		t.Errorf("warm log = %q, want one line", log)
	}

	again := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"sandbox", "setup", "--root", root}); err != nil {
		t.Fatalf("second tk sandbox setup: %v", err)
	}
	log, _ = os.ReadFile(filepath.Join(root, "warm.log"))
	if strings.Count(string(log), "warmed") != 1 {
		t.Errorf("warm log = %q — the same checkout warmed twice", log)
	}
	if !strings.Contains(again.String(), "already warm") {
		t.Errorf("the second run does not say it skipped:\n%s", again.String())
	}
}

func TestSandboxSetupIsANoOpWithoutADeclaration(t *testing.T) {
	root := sandboxRepo(t, validRunners)
	out := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"sandbox", "setup", "--root", root}); err != nil {
		t.Fatalf("tk sandbox setup: %v", err)
	}
	if !strings.Contains(out.String(), "nothing to warm") {
		t.Errorf("output does not report the empty declaration:\n%s", out.String())
	}
}

// A repository whose config does not validate authorises nothing — the same
// fail-closed rule the command surface has, applied to the one table that runs
// shell before any worker exists.
func TestSandboxSetupRefusesAnInvalidConfig(t *testing.T) {
	root := sandboxRepo(t, sandboxRunners+"\nbanana = true\n")
	if err := ExecuteArgs([]string{"sandbox", "setup", "--root", root}); err == nil {
		t.Fatal("an invalid runners.toml was accepted")
	}
	if _, err := os.Stat(filepath.Join(root, "warm.log")); err == nil {
		t.Error("a setup command ran out of an invalid config")
	}
}

// The local half of "the same section warms a local herdr worker": the spawner
// applies the worktree's own declaration between `worktree.create` and
// `agent.start`, so the worker starts in a warm tree.
func TestHerdSpawnWarmsTheWorktreeFromTheSandboxTable(t *testing.T) {
	setupSpawnRepo(t, sandboxRunners)

	// The worker's worktree is a real directory carrying the same tracked
	// declaration — which is what herdr hands back from worktree.create.
	worktree := t.TempDir()
	if err := os.MkdirAll(filepath.Join(worktree, ".tick"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(worktree, ".tick", "runners.toml"), []byte(sandboxRunners), 0o644); err != nil {
		t.Fatal(err)
	}

	srv := herdtest.New(t, herdtest.Config{
		Worktree: herdtest.Worktree{
			Path:   worktree,
			Label:  "tick-a1w",
			Branch: "tick/a1w",
		},
		AgentSession: "sess-abc",
		PaneTexts:    []string{"> Reply with the single word OK\n\n⏺ OK\n"},
	})

	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd spawn: %v", err)
	}
	log, err := os.ReadFile(filepath.Join(worktree, "warm.log"))
	if err != nil {
		t.Fatalf("the worker's worktree was never warmed: %v", err)
	}
	if !strings.Contains(string(log), "warmed") {
		t.Errorf("warm log = %q", log)
	}
}
