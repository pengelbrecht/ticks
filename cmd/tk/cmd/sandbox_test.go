package cmd

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	herdconfig "github.com/pengelbrecht/ticks/internal/herd/config"
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

const unroutedRunners = `version = 2

[roles.implement]
kind = "claude"
`

const orchestratorModelRunners = `version = 2

[orchestrator]
harness = "omp"
kind = "pi"
model = "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast"

[roles.implement]
kind = "claude"
model = "sonnet"
`

// captureSandboxStreams keeps stdout and stderr apart, which these tests need:
// the routed model goes to stdout because a boot script parses it, and the
// cell it came from goes to stderr because a human reads it.
func captureSandboxStreams(t *testing.T) (stdout, stderr *bytes.Buffer) {
	t.Helper()
	var out, err bytes.Buffer
	rootCmd.SetOut(&out)
	rootCmd.SetErr(&err)
	t.Cleanup(func() {
		rootCmd.SetOut(nil)
		rootCmd.SetErr(nil)
	})
	return &out, &err
}

// `tk sandbox model` is what the entrypoint asks after its clone, so that the
// container never learns to parse routing config itself.
func TestSandboxModelPrintsTheRoutedOrchestratorModel(t *testing.T) {
	root := sandboxRepo(t, orchestratorModelRunners)
	out, notes := captureSandboxStreams(t)
	if err := ExecuteArgs([]string{"sandbox", "model", "--root", root}); err != nil {
		t.Fatalf("tk sandbox model: %v", err)
	}
	if got := strings.TrimSpace(out.String()); got != "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast" {
		t.Errorf("model = %q, want the orchestrator table's", got)
	}
	if !strings.Contains(notes.String(), "orchestrator.model") {
		t.Errorf("the note does not name the cell the model came from:\n%s", notes.String())
	}
}

// No orchestrator model: the role/tier table answers, exactly as it does for
// every other role.
func TestSandboxModelFallsBackToTheRoleTable(t *testing.T) {
	root := sandboxRepo(t, validRunners)
	out, notes := captureSandboxStreams(t)
	if err := ExecuteArgs([]string{"sandbox", "model", "--root", root}); err != nil {
		t.Fatalf("tk sandbox model: %v", err)
	}
	if got := strings.TrimSpace(out.String()); got != "sonnet" {
		t.Errorf("model = %q, want the implement role's", got)
	}
	if !strings.Contains(notes.String(), "roles.implement.model") {
		t.Errorf("the note does not name the cell the model came from:\n%s", notes.String())
	}
}

// Nothing routed prints nothing to stdout — the caller's parse must not see a
// substituted default — and succeeds, because refusing to boot is the boot
// script's decision, not this command's.
func TestSandboxModelIsSilentWhenNothingIsRouted(t *testing.T) {
	root := sandboxRepo(t, unroutedRunners)
	out, notes := captureSandboxStreams(t)
	if err := ExecuteArgs([]string{"sandbox", "model", "--root", root}); err != nil {
		t.Fatalf("tk sandbox model: %v", err)
	}
	if got := strings.TrimSpace(out.String()); got != "" {
		t.Errorf("stdout = %q, want nothing a boot script could mistake for a model", got)
	}
	// Silent to a parser, not to a human: the reason is what turns a refused
	// boot into something an operator can fix.
	if !strings.Contains(notes.String(), "routes no model") {
		t.Errorf("nothing said why there is no model:\n%s", notes.String())
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

// ---------------------------------------------------------------------------
// `tk sandbox substrate`
//
// The container asks this the way it asks for the model: `tk` owns the
// runners.toml parser, so the boot script never learns the format. Two lines on
// stdout are the contract a shell parses — the resolved substrate, then the
// runner-state note to record — and the reasoning goes to stderr, where a boot
// log reads it.
// ---------------------------------------------------------------------------

const substrateRunners = `version = 2

[orchestrator]
harness = "claude"

[orchestration]
substrate = "herdr"
max_parallel = 3

[roles.implement]
kind = "claude"
model = "sonnet"
`

// captureCmdStreams keeps stdout and stderr apart: the two-line stdout is a
// machine contract and the notes are not.
func captureCmdStreams(t *testing.T) (*bytes.Buffer, *bytes.Buffer) {
	t.Helper()
	var out, errBuf bytes.Buffer
	rootCmd.SetOut(&out)
	rootCmd.SetErr(&errBuf)
	t.Cleanup(func() {
		rootCmd.SetOut(nil)
		rootCmd.SetErr(nil)
	})
	return &out, &errBuf
}

func TestSandboxSubstrateHonoursTheOverride(t *testing.T) {
	root := sandboxRepo(t, substrateRunners)
	t.Setenv(herdconfig.SubstrateEnvVar, string(herdconfig.SubstrateHarness))
	out, errOut := captureCmdStreams(t)
	if err := ExecuteArgs([]string{"sandbox", "substrate", "--root", root}); err != nil {
		t.Fatalf("tk sandbox substrate: %v", err)
	}
	lines := strings.Split(strings.TrimSpace(out.String()), "\n")
	if len(lines) != 2 {
		t.Fatalf("stdout = %q, want the substrate then the note line", out.String())
	}
	if lines[0] != "harness" {
		t.Errorf("resolved substrate = %q, want harness", lines[0])
	}
	for _, want := range []string{"runner-state: substrate=harness", "config=herdr", "source=" + herdconfig.SubstrateEnvVar} {
		if !strings.Contains(lines[1], want) {
			t.Errorf("note line %q missing %q", lines[1], want)
		}
	}
	// The reason a reader needs and the wave width that comes with it.
	for _, want := range []string{herdconfig.SubstrateEnvVar, "max_parallel", "3"} {
		if !strings.Contains(errOut.String(), want) {
			t.Errorf("stderr missing %q:\n%s", want, errOut.String())
		}
	}
}

// Without an override the file decides, so a local run is untouched: this repo
// pins herdr, and the command reports herdr as requested.
func TestSandboxSubstrateWithoutAnOverrideReadsTheFile(t *testing.T) {
	root := sandboxRepo(t, substrateRunners)
	t.Setenv(herdconfig.SubstrateEnvVar, "")
	out, _ := captureCmdStreams(t)
	if err := ExecuteArgs([]string{"sandbox", "substrate", "--root", root}); err != nil {
		t.Fatalf("tk sandbox substrate: %v", err)
	}
	note := out.String()
	if !strings.Contains(note, "requested=herdr") {
		t.Errorf("stdout does not report the file's own pin:\n%s", note)
	}
	if strings.Contains(note, "source=") {
		t.Errorf("a run with no override names one:\n%s", note)
	}
}

// Fail closed: a substrate nothing can parse is a stop naming the variable, not
// a silent fall back to the file.
func TestSandboxSubstrateRefusesAnUnknownOverride(t *testing.T) {
	root := sandboxRepo(t, substrateRunners)
	t.Setenv(herdconfig.SubstrateEnvVar, "subagents")
	captureCmdStreams(t)
	err := ExecuteArgs([]string{"sandbox", "substrate", "--root", root})
	if err == nil {
		t.Fatal("an unknown override was accepted")
	}
	if !strings.Contains(err.Error(), herdconfig.SubstrateEnvVar) || !strings.Contains(err.Error(), "subagents") {
		t.Errorf("error does not name the variable and its value: %v", err)
	}
}

// The two ways a run ends up on subagents with no herdr, told apart on the
// channel a boot log actually reads. `auto` finding nothing is the ordinary
// path — stated, not announced — and a pin that cannot be satisfied is loud and
// says what to write instead.
func TestSandboxSubstrateStatesTheOrdinaryPathQuietly(t *testing.T) {
	root := sandboxRepo(t, `version = 2

[orchestrator]
harness = "claude"

[orchestration]
substrate = "auto"
socket = "/tmp/no-such-herdr.sock"

[roles.implement]
kind = "claude"
model = "sonnet"
`)
	t.Setenv(herdconfig.SubstrateEnvVar, "")
	t.Setenv(herdconfig.EnvVar, "")
	out, errOut := captureCmdStreams(t)
	if err := ExecuteArgs([]string{"sandbox", "substrate", "--root", root}); err != nil {
		t.Fatalf("tk sandbox substrate: %v", err)
	}
	if !strings.Contains(out.String(), "reason=auto-no-herdr") {
		t.Errorf("the durable note does not distinguish the ordinary path:\n%s", out.String())
	}
	if !strings.Contains(errOut.String(), `substrate = "auto"`) {
		t.Errorf("the resolution was not stated at all:\n%s", errOut.String())
	}
	for _, unwanted := range []string{"Falling back", "Cross-vendor role routing"} {
		if strings.Contains(errOut.String(), unwanted) {
			t.Errorf("the ordinary path was announced as a degradation (%q):\n%s", unwanted, errOut.String())
		}
	}
}

func TestSandboxSubstrateStaysLoudForAnUnsatisfiablePin(t *testing.T) {
	root := sandboxRepo(t, `version = 2

[orchestrator]
harness = "claude"

[orchestration]
substrate = "herdr"
socket = "/tmp/no-such-herdr.sock"

[roles.implement]
kind = "claude"
model = "sonnet"
`)
	t.Setenv(herdconfig.SubstrateEnvVar, "")
	t.Setenv(herdconfig.EnvVar, "")
	out, errOut := captureCmdStreams(t)
	if err := ExecuteArgs([]string{"sandbox", "substrate", "--root", root}); err != nil {
		t.Fatalf("tk sandbox substrate: %v", err)
	}
	if !strings.Contains(out.String(), "reason=herdr-unavailable") {
		t.Errorf("the durable note does not record the refused assertion:\n%s", out.String())
	}
	for _, want := range []string{"Falling back", `substrate = "auto"`} {
		if !strings.Contains(errOut.String(), want) {
			t.Errorf("stderr missing %q — the loud case must say what went wrong and what to write instead:\n%s", want, errOut.String())
		}
	}
}
