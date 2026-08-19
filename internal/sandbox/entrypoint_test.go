//go:build !windows

package sandbox

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const testGatewayURL = "https://gateway.ai.cloudflare.com/v1/account/ticks"

type fixture struct {
	t        *testing.T
	root     string // scratch root
	source   string // the "remote" repository
	workdir  string // where the entrypoint clones to
	record   string // the harness stub's recording
	env      map[string]string
	firstSHA string
	headSHA  string
	mise     string // the version-manager stub's recording
}

func git(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(),
		"GIT_AUTHOR_NAME=ticks test", "GIT_AUTHOR_EMAIL=test@example.com",
		"GIT_COMMITTER_NAME=ticks test", "GIT_COMMITTER_EMAIL=test@example.com",
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, out)
	}
	return strings.TrimSpace(string(out))
}

func writeStub(t *testing.T, path, body string) {
	t.Helper()
	if err := os.WriteFile(path, []byte("#!/usr/bin/env bash\n"+body), 0o755); err != nil {
		t.Fatal(err)
	}
}

// newFixture builds a source repository with two commits, stub tk/omp/claude
// binaries on PATH, and the environment the entrypoint expects.
func newFixture(t *testing.T, environment string) *fixture {
	t.Helper()
	return newFixtureWithFiles(t, environment, nil)
}

// newFixtureWithFiles adds repository files — go.mod, package.json,
// .tool-versions — to the first commit, so the entrypoint sees them in the
// checkout.
func newFixtureWithFiles(t *testing.T, environment string, files map[string]string) *fixture {
	t.Helper()
	root := t.TempDir()
	source := filepath.Join(root, "source")
	binDir := filepath.Join(root, "bin")
	for _, d := range []string{source, binDir, filepath.Join(root, "home")} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			t.Fatal(err)
		}
	}

	git(t, source, "init", "-q", "-b", "main")
	if err := os.MkdirAll(filepath.Join(source, ".tick"), 0o755); err != nil {
		t.Fatal(err)
	}
	config := "# Tick Run Configuration\n\n## Environment\n\n" + environment + "\n"
	if err := os.WriteFile(filepath.Join(source, ".tick", "config.md"), []byte(config), 0o644); err != nil {
		t.Fatal(err)
	}
	for name, body := range files {
		if err := os.WriteFile(filepath.Join(source, name), []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	git(t, source, "add", "-A")
	git(t, source, "commit", "-q", "-m", "first")
	first := git(t, source, "rev-parse", "HEAD")
	if err := os.WriteFile(filepath.Join(source, "later.txt"), []byte("later\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	git(t, source, "add", "-A")
	git(t, source, "commit", "-q", "-m", "second")
	head := git(t, source, "rev-parse", "HEAD")

	record := filepath.Join(root, "harness-record")
	harness := `{
  printf 'CWD=%s\n' "$PWD"
  printf 'BIN=%s\n' "$(basename "$0")"
  for a in "$@"; do printf 'ARG=%s\n' "$a"; done
  env
} > "$TICKS_TEST_RECORD"
`
	writeStub(t, filepath.Join(binDir, "omp"), harness)
	writeStub(t, filepath.Join(binDir, "claude"), harness)
	// The version manager and the toolchains it decides about are stubbed so
	// the provisioning decision is deterministic, not a property of the host.
	mise := filepath.Join(root, "mise-record")
	writeStub(t, filepath.Join(binDir, "mise"), `printf '%s\n' "$*" >> "$TICKS_TEST_MISE_RECORD"
`)
	writeStub(t, filepath.Join(binDir, "go"), `echo "go version go1.24.11 linux/amd64"
`)
	writeStub(t, filepath.Join(binDir, "pnpm"), `echo "11.0.6"
`)
	writeStub(t, filepath.Join(binDir, "tk"), `case "$1" in
  version) echo "tk ${TICKS_TEST_TK_VERSION}"; echo "Update available: pretend" ;;
  *) exit 0 ;;
esac
`)

	f := &fixture{
		t: t, root: root, source: source,
		workdir:  filepath.Join(root, "work"),
		record:   record,
		mise:     mise,
		firstSHA: first, headSHA: head,
	}
	f.env = map[string]string{
		"PATH":                   binDir + string(os.PathListSeparator) + os.Getenv("PATH"),
		"HOME":                   filepath.Join(root, "home"),
		"XDG_CONFIG_HOME":        filepath.Join(root, "home", ".config"),
		EnvRepoURL:               source,
		EnvBaseSHA:               head,
		EnvEpic:                  "ko8",
		EnvGatewayBaseURL:        testGatewayURL,
		EnvWorkdir:               f.workdir,
		EnvCacheDir:              filepath.Join(root, "cache"),
		EnvTkVersion:             "0.31.0",
		EnvRunID:                 "run_test",
		"TICKS_TEST_RECORD":      record,
		"TICKS_TEST_MISE_RECORD": mise,
		"TICKS_TEST_TK_VERSION":  "0.31.0",
	}
	return f
}

func (f *fixture) command() *exec.Cmd {
	f.t.Helper()
	script, err := Path(EntrypointScript)
	if err != nil {
		f.t.Fatalf("locating %s: %v", EntrypointScript, err)
	}
	cmd := exec.Command("bash", script)
	cmd.Dir = f.root
	env := []string{}
	for k, v := range f.env {
		env = append(env, k+"="+v)
	}
	cmd.Env = env
	return cmd
}

func (f *fixture) run() (string, int) {
	f.t.Helper()
	out, err := f.command().CombinedOutput()
	code := 0
	if err != nil {
		exit, ok := err.(*exec.ExitError)
		if !ok {
			f.t.Fatalf("running the entrypoint: %v\n%s", err, out)
		}
		code = exit.ExitCode()
	}
	return string(out), code
}

func (f *fixture) harnessRecord() string {
	f.t.Helper()
	b, err := os.ReadFile(f.record)
	if err != nil {
		f.t.Fatalf("the harness never started: %v", err)
	}
	return string(b)
}

// miseCalls returns everything the version-manager stub was asked to do.
func (f *fixture) miseCalls() string {
	f.t.Helper()
	b, err := os.ReadFile(f.mise)
	if err != nil {
		return ""
	}
	return string(b)
}

func (f *fixture) harnessStarted() bool {
	_, err := os.Stat(f.record)
	return err == nil
}

func mustContain(t *testing.T, haystack, needle, what string) {
	t.Helper()
	if !strings.Contains(haystack, needle) {
		t.Errorf("%s: missing %q in\n%s", what, needle, haystack)
	}
}

// The whole point of the tick: repo URL + SHA + gateway base URL in, skill
// loop running out.
func TestEntrypointReachesTheSkillLoop(t *testing.T) {
	f := newFixture(t, "- `true` — nothing to check\n")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, "BIN=omp", "the pinned harness runs by default")
	mustContain(t, rec, "ARG=-p", "the harness runs headless")
	mustContain(t, rec, "ticks", "the prompt names the skill")
	mustContain(t, rec, "ko8", "the prompt names the epic")
	mustContain(t, rec, "CWD="+f.workdir, "the harness starts in the checkout")
	mustContain(t, rec, "TK_ACTOR="+Actor, "TK_ACTOR is exported")

	head := git(t, f.workdir, "rev-parse", "HEAD")
	if head != f.headSHA {
		t.Errorf("checked out %s, want the submitted SHA %s", head, f.headSHA)
	}
}

// The submitted SHA is the run's base, not "whatever the branch points at now".
func TestEntrypointChecksOutTheSubmittedSHANotTheTip(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvBaseSHA] = f.firstSHA
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if head := git(t, f.workdir, "rev-parse", "HEAD"); head != f.firstSHA {
		t.Errorf("checked out %s, want %s", head, f.firstSHA)
	}
	if _, err := os.Stat(filepath.Join(f.workdir, "later.txt")); err == nil {
		t.Error("the checkout carries a commit made after the submitted SHA")
	}
}

// Model traffic goes through the operator's gateway or the run does not start.
func TestEntrypointPointsModelTrafficAtTheGateway(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	if _, code := f.run(); code != 0 {
		t.Fatalf("exit %d, want 0", code)
	}
	rec := f.harnessRecord()
	for _, want := range []string{
		"ANTHROPIC_BASE_URL=" + testGatewayURL + "/anthropic",
		"OPENAI_BASE_URL=" + testGatewayURL + "/openai",
		"OPENROUTER_BASE_URL=" + testGatewayURL + "/openrouter",
	} {
		mustContain(t, rec, want, "vendor base URLs are rewritten to the gateway")
	}
}

func TestEntrypointRefusesWithoutAGateway(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	delete(f.env, EnvGatewayBaseURL)
	out, code := f.run()
	if code != ExitConfig {
		t.Fatalf("exit %d, want %d\n%s", code, ExitConfig, out)
	}
	mustContain(t, out, EnvGatewayBaseURL, "the refusal names the missing variable")
	mustContain(t, out, "tk factory setup", "the refusal names the command that fixes it")
	if f.harnessStarted() {
		t.Error("the harness started without a gateway")
	}
}

// "Never a vendor default" has to be enforced, not just documented: a gateway
// URL pointed straight at a vendor is a misconfiguration, not a gateway.
func TestEntrypointRefusesAVendorBaseURL(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvGatewayBaseURL] = "https://api.anthropic.com"
	out, code := f.run()
	if code != ExitConfig {
		t.Fatalf("exit %d, want %d\n%s", code, ExitConfig, out)
	}
	mustContain(t, out, "api.anthropic.com", "the refusal names the vendor host")
	if f.harnessStarted() {
		t.Error("the harness started pointed at a vendor")
	}
}

func TestEntrypointRefusesWithoutRepoOrSHA(t *testing.T) {
	for _, missing := range []string{EnvRepoURL, EnvBaseSHA, EnvEpic} {
		t.Run(missing, func(t *testing.T) {
			f := newFixture(t, "- `true`\n")
			delete(f.env, missing)
			out, code := f.run()
			if code != ExitConfig {
				t.Fatalf("exit %d, want %d\n%s", code, ExitConfig, out)
			}
			mustContain(t, out, missing, "the refusal names the missing variable")
		})
	}
}

func TestEntrypointVerifiesTheTkVersion(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_TK_VERSION"] = "0.1.0"
	out, code := f.run()
	if code != ExitTkVersion {
		t.Fatalf("exit %d, want %d\n%s", code, ExitTkVersion, out)
	}
	mustContain(t, out, "0.1.0", "the failure names the version found")
	mustContain(t, out, "0.31.0", "the failure names the version pinned")
	if f.harnessStarted() {
		t.Error("the harness started on the wrong tk")
	}
}

// The pre-flight failure path is an acceptance criterion of its own: nonzero,
// with the failing check named.
func TestEntrypointFailsPreflightNamingTheCheck(t *testing.T) {
	f := newFixture(t, "- git identity: `false`\n")
	out, code := f.run()
	if code != ExitPreflight {
		t.Fatalf("exit %d, want %d\n%s", code, ExitPreflight, out)
	}
	mustContain(t, out, "git identity", "the failure names the failing check")
	if f.harnessStarted() {
		t.Error("the harness started on a broken environment")
	}
}

// The orchestrator commits tracker state, so the container has a git identity
// before the pre-flight that checks for one runs.
func TestEntrypointConfiguresAGitIdentity(t *testing.T) {
	f := newFixture(t, "- `git config user.email`\n")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
}

// Dependency caches are pointed at one directory tree so the control plane can
// keep exactly one thing warm — and an empty one must still work.
func TestEntrypointPointsToolchainCachesAtTheCacheDir(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	cache := f.env[EnvCacheDir]
	if _, code := f.run(); code != 0 {
		t.Fatalf("a cold cache must not fail the run (exit %d)", code)
	}
	rec := f.harnessRecord()
	for _, want := range []string{
		"GOMODCACHE=" + cache,
		"GOCACHE=" + cache,
		"npm_config_store_dir=" + cache,
		"npm_config_cache=" + cache,
		"XDG_CACHE_HOME=" + cache,
	} {
		mustContain(t, rec, want, "toolchain caches live under the cache dir")
	}
}

func TestEntrypointRunsTheClaudeHarnessWhenAsked(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvHarness] = "claude"
	f.env[EnvModel] = "some-model"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, "BIN=claude", "the requested harness runs")
	mustContain(t, rec, "ARG=-p", "the harness runs headless")
	mustContain(t, rec, "ARG=some-model", "the model selection is passed through")
}

func TestEntrypointRefusesAnUnknownHarness(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvHarness] = "nethack"
	out, code := f.run()
	if code != ExitConfig {
		t.Fatalf("exit %d, want %d\n%s", code, ExitConfig, out)
	}
	mustContain(t, out, "nethack", "the refusal names the unknown harness")
}

// The Workflow ships stdout to R2 while the run is going, so a sandbox that
// dies mid-run still leaves its logs behind. That only holds if output is not
// buffered until exit.
func TestEntrypointStreamsHarnessOutputDuringTheRun(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	gate := filepath.Join(f.root, "gate")
	f.env["TICKS_TEST_GATE"] = gate
	writeStub(t, filepath.Join(f.root, "bin", "omp"), `echo "harness: started"
while [ ! -f "$TICKS_TEST_GATE" ]; do sleep 0.05; done
echo "harness: finished"
`)

	cmd := f.command()
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = cmd.Process.Kill() }()

	lines := make(chan string, 64)
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			lines <- scanner.Text()
		}
		close(lines)
	}()

	await := func(want string) {
		t.Helper()
		deadline := time.After(30 * time.Second)
		for {
			select {
			case line, ok := <-lines:
				if !ok {
					t.Fatalf("the entrypoint exited before printing %q", want)
				}
				if strings.Contains(line, want) {
					return
				}
			case <-deadline:
				t.Fatalf("timed out waiting for %q — output is buffered, not streamed", want)
			}
		}
	}

	// The harness is still running: it cannot exit until the gate appears.
	await("harness: started")
	if err := os.WriteFile(gate, []byte("go\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	await("harness: finished")
	if err := cmd.Wait(); err != nil {
		t.Fatalf("entrypoint: %v", err)
	}
}

// The harness's exit status is the run's exit status — the Workflow reads it
// to tell a finished run from a crashed one.
func TestEntrypointPropagatesTheHarnessExitStatus(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	writeStub(t, filepath.Join(f.root, "bin", "omp"), "exit 42\n")
	out, code := f.run()
	if code != 42 {
		t.Fatalf("exit %d, want 42\n%s", code, out)
	}
}

func TestEntrypointReportsTheRunItIsStarting(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	for _, want := range []string{"run_test", f.headSHA, "ko8"} {
		mustContain(t, out, want, "the banner identifies the run")
	}
}

func TestFixtureUsesDistinctCommits(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	if f.firstSHA == f.headSHA {
		t.Fatal(fmt.Sprintf("fixture produced one commit: %s", f.headSHA))
	}
}

// The image carries this factory's toolchain set; the version manager is the
// escape hatch. A repository that declares something the image does not
// satisfy gets it provisioned into the project's cache.
func TestEntrypointProvisionsWhatTheImageDoesNotSatisfy(t *testing.T) {
	f := newFixtureWithFiles(t, "- `true`\n", map[string]string{
		"go.mod": "module example.com/x\n\ngo 1.99.0\n",
	})
	if out, code := f.run(); code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if calls := f.miseCalls(); !strings.Contains(calls, "go@1.99.0") {
		t.Errorf("the declared toolchain was not provisioned, calls were:\n%s", calls)
	}
}

// The 99% case costs nothing at run time: what the image already carries is
// never re-provisioned.
func TestEntrypointSkipsProvisioningWhatTheImageSatisfies(t *testing.T) {
	f := newFixtureWithFiles(t, "- `true`\n", map[string]string{
		"go.mod":       "module example.com/x\n\ngo 1.20\n",
		"package.json": "{\n  \"packageManager\": \"pnpm@11.0.6\"\n}\n",
	})
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if calls := f.miseCalls(); strings.Contains(calls, "go@") || strings.Contains(calls, "pnpm@") {
		t.Errorf("the image already satisfies these pins, but they were provisioned anyway:\n%s", calls)
	}
	mustContain(t, out, "already satisfies", "the run says what it skipped")
}

// An explicit repository declaration is authoritative: mise reads its own
// config files itself.
func TestEntrypointProvisionsADeclaredToolchain(t *testing.T) {
	f := newFixtureWithFiles(t, "- `true`\n", map[string]string{
		".tool-versions": "rust 1.90.0\n",
	})
	if out, code := f.run(); code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if calls := f.miseCalls(); !strings.Contains(calls, "install") {
		t.Errorf("the declared toolchain file was ignored, calls were:\n%s", calls)
	}
}

// Provisioning is best effort — the Environment pre-flight is what decides
// whether the environment is good enough to start a wave.
func TestEntrypointSurvivesAFailedProvision(t *testing.T) {
	f := newFixtureWithFiles(t, "- `true`\n", map[string]string{
		"go.mod": "module example.com/x\n\ngo 1.99.0\n",
	})
	writeStub(t, filepath.Join(f.root, "bin", "mise"), "exit 1\n")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, out, "warning", "a failed provision is reported")
	if !f.harnessStarted() {
		t.Error("a failed provision stopped the run before the pre-flight could judge it")
	}
}

// Axiom 1 again: no convenience layer is load-bearing.
func TestEntrypointRunsWithoutAVersionManager(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_MISE_BIN"] = filepath.Join(f.root, "no-such-mise")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, out, "no version manager", "the run says what it does not have")
	if !f.harnessStarted() {
		t.Error("a missing version manager stopped the run")
	}
}

// Provisioned toolchains land in the persistent cache, not in a layer, and are
// on PATH for the harness.
func TestEntrypointKeepsProvisionedToolchainsInTheCacheDir(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	cache := f.env[EnvCacheDir]
	if _, code := f.run(); code != 0 {
		t.Fatal("the entrypoint did not reach the harness")
	}
	rec := f.harnessRecord()
	mustContain(t, rec, "MISE_DATA_DIR="+cache, "the version manager keeps its state in the cache")
	mustContain(t, rec, filepath.Join(cache, "mise", "data", "shims"), "provisioned tools are on PATH")
}
