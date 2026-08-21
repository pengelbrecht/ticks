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

const (
	// The gateway a run is handed is the factory's own proxy prefix, which
	// exchanges the run token below for the operator's provider key.
	testGatewayURL   = "https://factory.example.com/api/gateway"
	testGatewayToken = "tkr_0123456789abcdef"
)

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
	tkRecord string // the tk stub's recording of `tk sandbox ...` calls
	curlRec  string // the curl stub's recording of the model probe
	probeRec string // the harness stub's recording of the pre-flight round-trip
	binDir   string // the stub bin directory at the front of PATH
	home     string // the container HOME the harness reads its config out of
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

// harnessStubPreamble answers the two calls the container makes on a harness
// binary before the run itself: `omp config path`, and the pre-flight
// round-trip. A stub that overrides the fixture's harness has to answer them
// too, or it silently becomes a test of the probe.
const harnessStubPreamble = `if [ "$1" = "config" ] && [ "$2" = "path" ]; then
  printf '%s\n' "$HOME/.omp/agent"
  exit 0
fi
if [ -n "${TICKS_HARNESS_PROBE:-}" ]; then
  printf 'READY\n'
  exit 0
fi
`

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
	// The harness stub answers three different calls, because the container
	// makes three: `omp config path` (where does omp keep its provider
	// config), the pre-flight round-trip (marked by TICKS_HARNESS_PROBE), and
	// the run itself. Recording the probe separately is what keeps
	// harnessStarted() meaning "the run began" rather than "the binary ran".
	harness := `if [ "$1" = "config" ] && [ "$2" = "path" ]; then
  printf '%s\n' "$HOME/.omp/agent"
  exit 0
fi
if [ -n "${TICKS_HARNESS_PROBE:-}" ]; then
  {
    printf 'CWD=%s\n' "$PWD"
    printf 'BIN=%s\n' "$(basename "$0")"
    for a in "$@"; do printf 'ARG=%s\n' "$a"; done
    env
  } >> "$TICKS_TEST_HARNESS_PROBE_RECORD"
  printf '%s\n' "${TICKS_TEST_HARNESS_PROBE_ANSWER-READY}"
  exit "${TICKS_TEST_HARNESS_PROBE_EXIT:-0}"
fi
{
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
	// `tk` is stubbed the way the toolchains are: the entrypoint's job is to
	// DELEGATE the repository's [sandbox] declaration to tk, and this records
	// that it did. What tk then does with the declaration is proved against the
	// real implementation in setup_test.go, not against a shell stub.
	writeStub(t, filepath.Join(binDir, "tk"), `case "$1" in
  version) echo "tk ${TICKS_TEST_TK_VERSION}"; echo "Update available: pretend" ;;
  sandbox)
    printf '%s\n' "$*" >> "$TICKS_TEST_TK_RECORD"
    case "$2" in
      toolchain) [ -z "${TICKS_TEST_SANDBOX_TOOLCHAIN:-}" ] || printf '%s\n' $TICKS_TEST_SANDBOX_TOOLCHAIN ;;
      image) [ -z "${TICKS_TEST_SANDBOX_IMAGE_DECLARED:-}" ] || printf '%s\n' "$TICKS_TEST_SANDBOX_IMAGE_DECLARED" ;;
      model)
        if [ -n "${TICKS_TEST_SANDBOX_MODEL_ERROR:-}" ]; then
          printf '%s\n' "$TICKS_TEST_SANDBOX_MODEL_ERROR" >&2
          exit 1
        fi
        [ -z "${TICKS_TEST_SANDBOX_MODEL:-}" ] || printf '%s\n' "$TICKS_TEST_SANDBOX_MODEL"
        ;;
      substrate)
        if [ -n "${TICKS_TEST_SANDBOX_SUBSTRATE_ERROR:-}" ]; then
          printf '%s\n' "$TICKS_TEST_SANDBOX_SUBSTRATE_ERROR" >&2
          exit 1
        fi
        resolved="${TICKS_TEST_SANDBOX_SUBSTRATE:-harness}"
        printf '%s\n' "$resolved"
        printf 'runner-state: substrate=%s requested=%s config=herdr source=TICKS_SUBSTRATE reason=explicit-override\n' \
          "$resolved" "${TICKS_SUBSTRATE:-unset}"
        printf 'note: %s is set for this run, so the effective substrate is %s\n' "TICKS_SUBSTRATE" "$resolved" >&2
        ;;
      setup) exit "${TICKS_TEST_SANDBOX_SETUP_EXIT:-0}" ;;
      environment)
        if [ -z "${TICKS_TEST_ENV_CHECK:-}" ]; then
          printf '%s\n' 'sandbox: no [environment.commands] in .tick/runners.toml — nothing to check'
          exit 0
        fi
        printf 'sandbox: [1/1] running %s: %s\n' "${TICKS_TEST_ENV_LABEL:-environment check}" "$TICKS_TEST_ENV_CHECK"
        bash -c "$TICKS_TEST_ENV_CHECK"
        check_status=$?
        if [ "$check_status" -eq 0 ]; then
          printf 'sandbox: [1/1] PASS  %s: %s\n' "${TICKS_TEST_ENV_LABEL:-environment check}" "$TICKS_TEST_ENV_CHECK"
          printf '%s\n' 'sandbox: 1 of 1 environment checks green'
          exit 0
        fi
        printf 'sandbox: [1/1] FAILED  %s: %s (exit %s)\n' "${TICKS_TEST_ENV_LABEL:-environment check}" "$TICKS_TEST_ENV_CHECK" "$check_status"
        printf 'sandbox: environment pre-flight red: 1 of 1 checks failed\n'
        printf 'sandbox:   failing check: %s: %s\n' "${TICKS_TEST_ENV_LABEL:-environment check}" "$TICKS_TEST_ENV_CHECK"
        exit 1
        ;;
    esac
    ;;
  *) exit 0 ;;
esac
`)
	// The model probe is a real HTTP call in a container and a stub here: the
	// entrypoint's job is to make one bounded request and act on its status,
	// and a worker sandbox has no loopback socket to serve a real one from.
	writeStub(t, filepath.Join(binDir, "curl"), `out=""
url=""
data=""
prev=""
for a in "$@"; do
  case "$prev" in
    -o) out="$a" ;;
    --data) data="$a" ;;
  esac
  case "$a" in
    http*) url="$a" ;;
  esac
  prev="$a"
done
{
  printf 'URL=%s\n' "$url"
  printf 'DATA=%s\n' "$data"
  for a in "$@"; do printf 'ARG=%s\n' "$a"; done
} >> "$TICKS_TEST_CURL_RECORD"
[ -z "$out" ] || printf '%s' "${TICKS_TEST_CURL_BODY:-{\"ok\":true}}" > "$out"
printf '%s' "${TICKS_TEST_CURL_STATUS:-200}"
`)

	f := &fixture{
		t: t, root: root, source: source,
		workdir:  filepath.Join(root, "work"),
		record:   record,
		mise:     mise,
		tkRecord: filepath.Join(root, "tk-record"),
		curlRec:  filepath.Join(root, "curl-record"),
		probeRec: filepath.Join(root, "harness-probe-record"),
		binDir:   binDir,
		home:     filepath.Join(root, "home"),
		firstSHA: first, headSHA: head,
	}
	f.env = map[string]string{
		"PATH":                            binDir + string(os.PathListSeparator) + os.Getenv("PATH"),
		"HOME":                            filepath.Join(root, "home"),
		"XDG_CONFIG_HOME":                 filepath.Join(root, "home", ".config"),
		EnvRepoURL:                        source,
		EnvBaseSHA:                        head,
		EnvEpic:                           "ko8",
		EnvGatewayBaseURL:                 testGatewayURL,
		EnvGatewayToken:                   testGatewayToken,
		EnvWorkdir:                        f.workdir,
		EnvCacheDir:                       filepath.Join(root, "cache"),
		EnvTkVersion:                      "0.31.0",
		EnvRunID:                          "run_test",
		"TICKS_TEST_RECORD":               record,
		"TICKS_TEST_MISE_RECORD":          mise,
		"TICKS_TEST_TK_RECORD":            f.tkRecord,
		"TICKS_TEST_TK_VERSION":           "0.31.0",
		"TICKS_TEST_CURL_RECORD":          f.curlRec,
		"TICKS_TEST_HARNESS_PROBE_RECORD": f.probeRec,
		// The control plane's model, which is what a factory with RUN_MODEL
		// set hands the container. Tests that exercise the repository's own
		// role/tier routing delete it.
		EnvModel: "claude-fable-5",
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

// tkCalls returns every `tk sandbox ...` invocation the stub saw.
func (f *fixture) tkCalls() string {
	f.t.Helper()
	b, err := os.ReadFile(f.tkRecord)
	if err != nil {
		return ""
	}
	return string(b)
}

// harnessProbeCalls returns what the harness stub saw on the pre-flight
// round-trip, empty when the entrypoint never probed the harness.
func (f *fixture) harnessProbeCalls() string {
	f.t.Helper()
	b, err := os.ReadFile(f.probeRec)
	if err != nil {
		return ""
	}
	return string(b)
}

// ompProviderConfig returns the provider file the entrypoint wrote for omp,
// empty when it wrote none.
func (f *fixture) ompProviderConfig() string {
	f.t.Helper()
	b, err := os.ReadFile(filepath.Join(f.home, ".omp", "agent", "models.yml"))
	if err != nil {
		return ""
	}
	return string(b)
}

// probeCalls returns what the curl stub was asked to send, empty when the
// entrypoint never probed.
func (f *fixture) probeCalls() string {
	f.t.Helper()
	b, err := os.ReadFile(f.curlRec)
	if err != nil {
		return ""
	}
	return string(b)
}

// routeModelThroughTheRepository takes the control plane's model away and
// commits a runners.toml routing the orchestrator instead, so `tk sandbox
// model` is what answers. The stub tk is told the same value: this fixture
// isolates the entrypoint's DELEGATION, exactly as it does for image,
// toolchain and setup — what tk reads out of the file is proved against the
// real implementation in model_test.go and by the real-tk entrypoint test.
func (f *fixture) routeModelThroughTheRepository(runners, model string) {
	f.t.Helper()
	if err := os.WriteFile(filepath.Join(f.source, ".tick", "runners.toml"), []byte(runners), 0o644); err != nil {
		f.t.Fatal(err)
	}
	git(f.t, f.source, "add", "-A")
	git(f.t, f.source, "commit", "-q", "-m", "route the orchestrator")
	f.headSHA = git(f.t, f.source, "rev-parse", "HEAD")
	f.env[EnvBaseSHA] = f.headSHA
	delete(f.env, EnvModel)
	if model != "" {
		f.env["TICKS_TEST_SANDBOX_MODEL"] = model
	}
}

// addMigratedEnvironment adds the structured run config to the submitted
// repository and configures the tk stub to exercise that command path. The
// command tests cover the real tk implementation; this fixture isolates the
// entrypoint's delegation and boot-stop behavior.
func (f *fixture) addMigratedEnvironment(label, command string) {
	f.t.Helper()
	runners := fmt.Sprintf(`version = 2

[roles.implement]
kind = "claude"

[environment.commands]
check = { command = %q, description = %q }
`, command, label)
	if err := os.WriteFile(filepath.Join(f.source, ".tick", "runners.toml"), []byte(runners), 0o644); err != nil {
		f.t.Fatal(err)
	}
	git(f.t, f.source, "add", "-A")
	git(f.t, f.source, "commit", "-q", "-m", "migrate environment checks")
	f.headSHA = git(f.t, f.source, "rev-parse", "HEAD")
	f.env[EnvBaseSHA] = f.headSHA
	f.env["TICKS_TEST_ENV_LABEL"] = label
	f.env["TICKS_TEST_ENV_CHECK"] = command
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

// The credential a run's model traffic carries is the run's own token, never
// the operator's vendor key: it is revocable mid-run, and the gateway stamps
// the run and tick ids on every request made with it (D17).
func TestEntrypointPresentsTheRunTokenAsTheModelCredential(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	if _, code := f.run(); code != 0 {
		t.Fatalf("exit %d, want 0", code)
	}
	rec := f.harnessRecord()
	for _, want := range []string{
		"AI_GATEWAY_TOKEN=" + testGatewayToken,
		"ANTHROPIC_AUTH_TOKEN=" + testGatewayToken,
		"ANTHROPIC_API_KEY=" + testGatewayToken,
		"OPENAI_API_KEY=" + testGatewayToken,
		"OPENROUTER_API_KEY=" + testGatewayToken,
	} {
		mustContain(t, rec, want, "every vendor credential is the run's gateway token")
	}
}

// A container with no token could not make a single model call, so it says so
// at boot rather than after a clone, a provision and a pre-flight.
func TestEntrypointRefusesWithoutARunGatewayToken(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	delete(f.env, EnvGatewayToken)
	out, code := f.run()
	if code != ExitConfig {
		t.Fatalf("exit %d, want %d\n%s", code, ExitConfig, out)
	}
	mustContain(t, out, EnvGatewayToken, "the refusal names the missing variable")
	if f.harnessStarted() {
		t.Error("the harness started with no model credential")
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
	f := newFixture(t, "")
	f.addMigratedEnvironment("git identity", "false")
	out, code := f.run()
	if code != ExitPreflight {
		t.Fatalf("exit %d, want %d\n%s", code, ExitPreflight, out)
	}
	mustContain(t, out, "git identity", "the failure names the failing check")
	if f.harnessStarted() {
		t.Error("the harness started on a broken environment")
	}
}

func TestEntrypointRunsMigratedEnvironmentChecks(t *testing.T) {
	f := newFixture(t, "")
	marker := filepath.Join(f.root, "migrated-environment-check-ran")
	f.env["TICKS_TEST_ENV_MARKER"] = marker
	f.addMigratedEnvironment("migrated marker", "touch $TICKS_TEST_ENV_MARKER")

	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if _, err := os.Stat(marker); err != nil {
		t.Fatalf("the migrated environment check did not run: %v\n%s", err, out)
	}
	mustContain(t, out, "migrated marker", "the migrated check is named in the boot log")
	if !strings.Contains(f.tkCalls(), "sandbox environment --root "+f.workdir) {
		t.Errorf("the entrypoint did not delegate the migrated checks to tk:\n%s", f.tkCalls())
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
	f.env[EnvModel] = "anthropic/claude-fable-5"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, "BIN=claude", "the requested harness runs")
	mustContain(t, rec, "ARG=-p", "the harness runs headless")
	// The provider qualifier selected the route; what reaches --model is the
	// id Anthropic itself knows.
	mustContain(t, rec, "ARG=claude-fable-5", "the model selection is passed through")
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
	writeStub(t, filepath.Join(f.root, "bin", "omp"), harnessStubPreamble+`echo "harness: started"
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
	writeStub(t, filepath.Join(f.root, "bin", "omp"), harnessStubPreamble+"exit 42\n")
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
	mustContain(t, rec, "MISE_GLOBAL_CONFIG_FILE="+cache, "what was provisioned is recorded beside the tools")
	mustContain(t, rec, filepath.Join(cache, "mise", "data", "shims"), "provisioned tools are on PATH")
}

// ---------------------------------------------------------------- phases ---

// The Workflow can only talk to the image through the environment, so the boot
// phase is a variable. A default boot runs the epic; nothing about the prompt
// changes for the 99% path.
func TestEntrypointDefaultsToTheRunPhase(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	if _, code := f.run(); code != 0 {
		t.Fatalf("exit %d, want 0", code)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, EnvPhase+"="+PhaseRun, "the phase is exported for the harness")
	if strings.Contains(rec, "reconcile protocol") {
		t.Error("a first boot was told to reconcile")
	}
}

// The sandbox is expected to die. The fresh one's FIRST instruction is the
// reconcile protocol — that is the whole recovery mechanism (D20, UC1b).
func TestEntrypointRebootsIntoTheReconcileProtocol(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvPhase] = PhaseReconcile
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, EnvPhase+"="+PhaseReconcile, "the phase is exported for the harness")
	mustContain(t, rec, "reconcile", "the prompt names the reconcile protocol")
	mustContain(t, rec, "manifests", "the prompt names the evidence order")
	mustContain(t, rec, "ko8", "a reboot still runs the same epic")
}

// A budget or operator stop is a CLEAN stop: review and closeout still run, and
// no new work starts. The Workflow decides that; the prompt only carries it.
func TestEntrypointBootsTheCloseoutPhase(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvPhase] = PhaseCloseout
	f.env[EnvStopReason] = "budget_exhausted: $10.00 of $10.00"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, EnvPhase+"="+PhaseCloseout, "the phase is exported for the harness")
	mustContain(t, rec, "reconcile", "a closeout boot adopts the pushed state first")
	mustContain(t, rec, "review", "the prompt still runs review")
	mustContain(t, rec, "closeout", "the prompt still runs closeout")
	mustContain(t, rec, "budget_exhausted", "the prompt carries why the run is stopping")
	if !strings.Contains(rec, "do not start") && !strings.Contains(rec, "Do not start") {
		t.Errorf("the closeout prompt does not forbid new work:\n%s", rec)
	}
}

// An unknown phase is a Workflow bug, and a Workflow bug must not become a run
// that quietly does the wrong thing.
func TestEntrypointRefusesAnUnknownPhase(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvPhase] = "improvise"
	out, code := f.run()
	if code != ExitConfig {
		t.Fatalf("exit %d, want %d\n%s", code, ExitConfig, out)
	}
	mustContain(t, out, "improvise", "the refusal names the unknown phase")
	if f.harnessStarted() {
		t.Error("the harness started on an unknown phase")
	}
}

// --------------------------------------------- the repository's own sandbox ---

// The 99% path, stated as a test: a repository that declares no [sandbox]
// still boots the base image, provisions nothing extra and reaches the harness.
// The entrypoint asks anyway — asking is free, and the answer is silence.
func TestEntrypointRunsUnchangedWithoutASandboxDeclaration(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if !f.harnessStarted() {
		t.Fatal("the harness never started")
	}
	if calls := f.miseCalls(); calls != "" {
		t.Errorf("nothing was declared but the version manager was used:\n%s", calls)
	}
	if calls := f.tkCalls(); !strings.Contains(calls, "sandbox setup") {
		t.Errorf("the entrypoint never asked about the repository's sandbox:\n%s", calls)
	}
}

// A repository that declares extra toolchain gets it provisioned through the
// version manager, into the persistent cache — the same path the ecosystem's
// own pins take, so the "already satisfied" skip and the warm cache apply
// unchanged.
func TestEntrypointProvisionsTheDeclaredSandboxToolchain(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_SANDBOX_TOOLCHAIN"] = "rust@1.90.0"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if calls := f.miseCalls(); !strings.Contains(calls, "rust@1.90.0") {
		t.Errorf("the declared toolchain was not provisioned, calls were:\n%s", calls)
	}
}

// The setup step runs after the checkout and before the harness, delegated to
// tk so the tracked config is parsed by one reader rather than by a shell.
func TestEntrypointRunsTheRepositorySetupBeforeTheHarness(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	calls := f.tkCalls()
	if !strings.Contains(calls, "sandbox setup --root "+f.workdir) {
		t.Errorf("setup was not run against the checkout:\n%s", calls)
	}
	if !f.harnessStarted() {
		t.Error("the harness never started")
	}
}

// A declared warm step that fails stops the run with its own exit code. It is
// deliberately NOT best effort: a wave started on a half-provisioned sandbox
// fails in every worker, at model prices.
func TestEntrypointStopsWhenTheRepositorySetupFails(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_SANDBOX_SETUP_EXIT"] = "1"
	out, code := f.run()
	if code != ExitSetup {
		t.Fatalf("exit %d, want %d\n%s", code, ExitSetup, out)
	}
	mustContain(t, out, "setup", "the failure says what stage failed")
	mustContain(t, out, ".tick/runners.toml", "the failure names the file to fix")
	if f.harnessStarted() {
		t.Error("the harness started on a half-provisioned sandbox")
	}
}

// THE security boundary, at the container's edge: setup comes from the tracked
// config in the checkout, so nothing in this container's environment — which is
// where an API parameter, a signal payload or a tick note would have to arrive
// — can add a command to it.
func TestEntrypointIgnoresSetupInjectedThroughTheEnvironment(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	marker := filepath.Join(f.root, "pwned")
	for _, name := range []string{
		"TICKS_SANDBOX_SETUP", "TICKS_SETUP", "TICKS_REPO_SETUP", "SANDBOX_SETUP",
	} {
		f.env[name] = "touch " + marker
	}
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if _, err := os.Stat(marker); err == nil {
		t.Fatal("a setup command injected through the environment ran")
	}
	if strings.Contains(f.tkCalls(), marker) {
		t.Errorf("the injected command was passed to tk:\n%s", f.tkCalls())
	}
}

// The control plane boots the image a repository declares (tick x3v), so a
// container that is NOT that image is a configuration failure — not a warning
// it works through. The container cannot change what it is running, and
// continuing means provisioning, warming and spending in an environment the
// repository explicitly said was the wrong one.
func TestEntrypointRefusesAnImageItsRepositoryDidNotDeclare(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_SANDBOX_IMAGE_DECLARED"] = "registry.example.com/acme/orchestrator:2.0.0"
	f.env[EnvSandboxImage] = "ticks-orchestrator:0.31.0"
	out, code := f.run()
	if code != ExitSetup {
		t.Fatalf("exit %d, want %d (a [sandbox] configuration verdict)\n%s", code, ExitSetup, out)
	}
	mustContain(t, out, "registry.example.com/acme/orchestrator:2.0.0", "the refusal names the declared image")
	mustContain(t, out, "ticks-orchestrator:0.31.0", "the refusal names the booted image")
	mustContain(t, out, "remove [sandbox].image", "the refusal names a remedy")
	if f.harnessStarted() {
		t.Error("the harness ran in an image the repository did not declare")
	}
}

// The other side of the same rule: the declared image IS what booted, so the
// boot continues without so much as a warning. This is the escape hatch
// working — a repository pinning its own image and getting it.
func TestEntrypointRunsWhenTheDeclaredImageIsTheBootedOne(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_SANDBOX_IMAGE_DECLARED"] = "registry.example.com/acme/orchestrator:2.0.0"
	f.env[EnvSandboxImage] = "registry.example.com/acme/orchestrator:2.0.0"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if strings.Contains(out, "warning") && strings.Contains(out, "sandbox image") {
		t.Errorf("the image the repository declared was warned about:\n%s", out)
	}
	if !f.harnessStarted() {
		t.Error("a repository that got the image it declared did not start")
	}
}

// A hand-driven boot: nothing told this container what it is, so there is
// nothing to compare a declaration against. That is reported and worked
// through — refusing here would make the image undrivable by hand, and the
// container still has no way to know it is wrong.
func TestEntrypointReportsADeclaredImageItCannotConfirm(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_SANDBOX_IMAGE_DECLARED"] = "registry.example.com/acme/orchestrator:2.0.0"
	delete(f.env, EnvSandboxImage)
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, out, "warning", "an unconfirmable declaration is reported")
	mustContain(t, out, "registry.example.com/acme/orchestrator:2.0.0", "the warning names the declared image")
	if !f.harnessStarted() {
		t.Error("a boot nothing identified was stopped by a declaration it could not check")
	}
}

// --------------------------------------------------------------- the model ---
//
// The tick these close: a container booted, cloned, passed its pre-flight,
// started the harness — and then sat at "Working..." forever, because it had a
// reachable gateway and no model it could call. Every test below asserts the
// same property from a different side: an unusable model configuration must
// produce a message, not silence.

// The documented no-key rung has to have a route, or a factory configured for
// it has a gateway it cannot address.
func TestEntrypointExportsTheWorkersAIRoute(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	if _, code := f.run(); code != 0 {
		t.Fatalf("exit %d, want 0", code)
	}
	mustContain(t, f.harnessRecord(), "WORKERS_AI_BASE_URL="+testGatewayURL+"/workers-ai",
		"the workers-ai route is exported like every other provider's")
}

// Routing is config: the model comes out of the checkout's role/tier table,
// through the one component that owns the runners.toml format.
func TestEntrypointRoutesTheOrchestratorModelFromTheRepository(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.routeModelThroughTheRepository(`version = 2

[orchestrator]
harness = "omp"
kind = "pi"
model = "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast"

[roles.implement]
kind = "claude"
`, "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast")

	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, f.tkCalls(), "sandbox model", "the entrypoint asked tk for the routed model")
	rec := f.harnessRecord()
	mustContain(t, rec, "TICKS_MODEL=workers-ai/meta/llama-3.3-70b-instruct-fp8-fast",
		"the routed model is exported")
	mustContain(t, rec, "TICKS_MODEL_ID=@cf/meta/llama-3.3-70b-instruct-fp8-fast",
		"the id in the provider's own namespace is recorded")
	mustContain(t, rec, "ARG=cloudflare-ai-gateway/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
		"the harness is given that id through the provider it names for the route")
}

// The control plane's model is an operator override, not something the
// repository's config quietly wins over.
func TestEntrypointPrefersTheControlPlanesModel(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_SANDBOX_MODEL"] = "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, f.harnessRecord(), "TICKS_MODEL=claude-fable-5", "TICKS_MODEL wins")
	if strings.Contains(f.tkCalls(), "sandbox model") {
		t.Errorf("the entrypoint asked the repository for a model it had already been given:\n%s", f.tkCalls())
	}
}

// The heart of the tick: no model anywhere is a stop with a message, never a
// harness that starts and hangs.
func TestEntrypointStopsWhenNothingRoutesAModel(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.routeModelThroughTheRepository(`version = 2

[roles.implement]
kind = "claude"
`, "")

	out, code := f.run()
	if code != ExitModel {
		t.Fatalf("exit %d, want %d\n%s", code, ExitModel, out)
	}
	mustContain(t, out, "no model to run on", "the stop says what is wrong")
	mustContain(t, out, "runners.toml", "the stop names the file that fixes it")
	mustContain(t, out, "hangs", "the stop says why silence is not an option")
	if f.harnessStarted() {
		t.Error("the harness started with no model — the exact hang this tick closes")
	}
}

// A Workers AI model rides the OpenAI-compatible route, because that is the
// shape a cross-provider harness can be pointed at.
func TestEntrypointRunsWorkersAIThroughTheOpenAICompatibleRoute(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvModel] = "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, "OPENAI_BASE_URL="+testGatewayURL+"/workers-ai/v1",
		"the OpenAI-style provider points at the route serving the model")
	mustContain(t, rec, "TICKS_MODEL_PROVIDER=workers-ai", "the provider decision is recorded")
	mustContain(t, rec, "TICKS_MODEL_ID=@cf/meta/llama-3.3-70b-instruct-fp8-fast",
		"an id that omits the constant @cf namespace still has it restored")
	mustContain(t, f.probeCalls(), testGatewayURL+"/workers-ai/v1/chat/completions",
		"the probe went to the workers-ai route")
}

// The routing schema can now spell `@cf/`, so a config may name a Workers AI
// model in full. The entrypoint must pass that id through untouched rather
// than prefix a namespace it already carries.
func TestEntrypointKeepsAnExplicitWorkersAINamespace(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvModel] = "workers-ai/@cf/openai/gpt-oss-120b"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, "TICKS_MODEL_ID=@cf/openai/gpt-oss-120b",
		"the id the config wrote reaches the harness with exactly one @cf/")
	if strings.Contains(rec, "@cf/@cf/") {
		t.Errorf("the namespace was prefixed onto an id that already carried it:\n%s", rec)
	}
	mustContain(t, rec, "TICKS_MODEL_PROVIDER=workers-ai", "the provider decision is recorded")
	mustContain(t, f.probeCalls(), testGatewayURL+"/workers-ai/v1/chat/completions",
		"the probe went to the workers-ai route")
}

// An Anthropic model keeps the Anthropic route and the Anthropic wire shape.
func TestEntrypointProbesAnthropicOnItsOwnRoute(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	probe := f.probeCalls()
	mustContain(t, probe, testGatewayURL+"/anthropic/v1/messages", "the probe used the messages endpoint")
	mustContain(t, probe, "anthropic-version", "the probe sent the Anthropic version header")
	mustContain(t, probe, `"model":"claude-fable-5"`, "the probe asked for the routed model")
	mustContain(t, f.harnessRecord(), "OPENAI_BASE_URL="+testGatewayURL+"/openai",
		"an Anthropic run leaves the other vendor routes where they were")
}

// The content gate: one bounded call proves the route before the harness is
// handed it, and its result is in the streamed output.
func TestEntrypointProbesTheGatewayBeforeStartingTheHarness(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if f.probeCalls() == "" {
		t.Fatal("the harness started without the model route being proved")
	}
	mustContain(t, out, "model probe green", "the successful call is evidence in the run's own output")
	mustContain(t, f.probeCalls(), "--max-time", "the probe for a hang is itself bounded")
}

// A gateway that refuses is an error at boot, quoting what it said — the
// refusals name `tk factory setup` themselves, so collapsing them would throw
// away the fix.
func TestEntrypointStopsWhenTheModelProbeIsRefused(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_CURL_STATUS"] = "503"
	f.env["TICKS_TEST_CURL_BODY"] =
		`{"error":"provider_not_configured","detail":"this factory has no CLOUDFLARE_API_TOKEN behind its gateway; run ` + "`tk factory setup`" + `"}`
	out, code := f.run()
	if code != ExitModel {
		t.Fatalf("exit %d, want %d\n%s", code, ExitModel, out)
	}
	mustContain(t, out, "503", "the stop carries the status")
	mustContain(t, out, "provider_not_configured", "the stop quotes what the gateway said")
	mustContain(t, out, "tk factory setup", "the gateway's own remedy survives")
	if f.harnessStarted() {
		t.Error("the harness started on a route the gateway refused")
	}
}

// The claude CLI speaks one vendor's API. Pointing it elsewhere is a run that
// cannot make a single call, so it never starts.
func TestEntrypointRefusesANonAnthropicModelOnTheClaudeHarness(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvHarness] = "claude"
	f.env[EnvModel] = "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast"
	out, code := f.run()
	if code != ExitModel {
		t.Fatalf("exit %d, want %d\n%s", code, ExitModel, out)
	}
	mustContain(t, out, "workers-ai", "the refusal names the provider")
	mustContain(t, out, "TICKS_HARNESS=omp", "the refusal names a way out")
	if f.harnessStarted() {
		t.Error("the claude harness started on a non-Anthropic model")
	}
}

// A model whose provider cannot be named has no route, and guessing one is how
// a container ends up calling something nothing authorised.
func TestEntrypointRefusesAModelWithNoKnownProvider(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvModel] = "some-model-7b"
	out, code := f.run()
	if code != ExitModel {
		t.Fatalf("exit %d, want %d\n%s", code, ExitModel, out)
	}
	mustContain(t, out, "some-model-7b", "the refusal names the model")
	mustContain(t, out, "workers-ai/", "the refusal shows how to qualify it")
	if f.harnessStarted() {
		t.Error("the harness started on a model with no route")
	}
}

// "This config is broken" and "this config routes no model" need opposite
// actions from an operator, so they never share a message.
func TestEntrypointDistinguishesABrokenConfigFromAMissingModel(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.routeModelThroughTheRepository("version = 2\n\n[roles.implement]\nkind = \"claude\"\n", "")
	f.env["TICKS_TEST_SANDBOX_MODEL_ERROR"] = ".tick/runners.toml: roles.implement: unknown key \"nope\""

	out, code := f.run()
	if code != ExitModel {
		t.Fatalf("exit %d, want %d\n%s", code, ExitModel, out)
	}
	mustContain(t, out, "could not read", "the stop says the config is unreadable")
	mustContain(t, out, "not a missing model", "the two classes are told apart")
	if strings.Contains(out, "no model to run on") {
		t.Errorf("a broken config was reported as a missing model:\n%s", out)
	}
	if f.harnessStarted() {
		t.Error("the harness started on a config tk could not read")
	}
}

// No HTTP answer at all is a different investigation from a status code, and
// it is the failure mode closest to the hang this tick closes.
func TestEntrypointStopsWhenTheGatewayNeverAnswersTheProbe(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_CURL_STATUS"] = "000"
	f.env[EnvModelProbeTimeout] = "3"
	out, code := f.run()
	if code != ExitModel {
		t.Fatalf("exit %d, want %d\n%s", code, ExitModel, out)
	}
	mustContain(t, out, "did not answer", "the stop names the silence")
	mustContain(t, out, "3s", "the stop names the bound it waited")
	mustContain(t, f.probeCalls(), "--max-time", "the probe honoured the configured bound")
	if f.harnessStarted() {
		t.Error("the harness started against a gateway that never answered")
	}
}

// ---------------------------------------------------------------------------
// The per-kind half of the gateway wiring.
//
// A run got further than any before it and still died: environment green,
// model resolved, model probe GREEN, and then
//
//	error: No API key found for cloudflare-ai-gateway.
//
// The container exported the VENDOR-shaped variables the claude kind reads.
// omp reads none of them — it resolves a provider by name and asks that
// provider for its own credential and its own base URL. Every test below
// asserts one half of that: the credential is under the name the kind reads,
// the provider points at the route the probe proved, and the harness itself is
// made to prove it before the run starts.
// ---------------------------------------------------------------------------

// The credential, under omp's own name for it.
func TestEntrypointGivesOmpTheGatewayCredentialUnderItsOwnProviderName(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvModel] = "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, f.harnessRecord(), "CLOUDFLARE_AI_GATEWAY_API_KEY="+testGatewayToken,
		"omp names the gateway route `cloudflare-ai-gateway` and reads that provider's own credential")
}

// The provider, pointed at the route the model probe just proved. omp's
// built-in entry for this provider carries a PLACEHOLDER base URL, so a
// credential with no base URL would post to a literal `<account>`.
func TestEntrypointPinsTheOmpProviderToTheProvedRoute(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvModel] = "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	config := f.ompProviderConfig()
	if config == "" {
		t.Fatal("the entrypoint wrote omp no provider config, so omp would resolve the route from its own catalog")
	}
	for _, want := range []string{
		"cloudflare-ai-gateway:",
		`baseUrl: "` + testGatewayURL + `/workers-ai/v1"`,
		`api: "openai-completions"`,
		`apiKey: "CLOUDFLARE_AI_GATEWAY_API_KEY"`,
		`- id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"`,
	} {
		mustContain(t, config, want, "the provider config states the route the probe proved")
	}
	if strings.Contains(config, "<account>") || strings.Contains(config, "<gateway>") {
		t.Errorf("the provider config kept a placeholder base URL:\n%s", config)
	}
}

// `apiKey` in that file is an environment VARIABLE NAME, which omp resolves per
// request. The run's token is the one thing that must not land on disk.
func TestEntrypointKeepsTheRunTokenOutOfTheOmpProviderConfig(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvModel] = "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
	if _, code := f.run(); code != 0 {
		t.Fatalf("exit %d, want 0", code)
	}
	if config := f.ompProviderConfig(); strings.Contains(config, testGatewayToken) {
		t.Errorf("the run's gateway token was written to omp's config file:\n%s", config)
	}
}

// Handed a bare id, omp fuzzy-matches its own catalog — which is how `@cf/…`
// resolved to a provider nothing here had authorised. The provider is named.
func TestEntrypointHandsOmpAProviderQualifiedModel(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvModel] = "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, f.harnessRecord(), "ARG=cloudflare-ai-gateway/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
		"the model flag names the provider omp should resolve it through")
}

// An Anthropic-routed omp run uses omp's `anthropic` provider and the Anthropic
// wire shape — the same table, a different row.
func TestEntrypointRoutesAnAnthropicOmpRunAtTheAnthropicProvider(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	out, code := f.run() // the fixture's default model is claude-fable-5
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	config := f.ompProviderConfig()
	for _, want := range []string{
		"anthropic:",
		`baseUrl: "` + testGatewayURL + `/anthropic"`,
		`api: "anthropic-messages"`,
		`apiKey: "ANTHROPIC_API_KEY"`,
		`- id: "claude-fable-5"`,
	} {
		mustContain(t, config, want, "the anthropic row of the kind table")
	}
	mustContain(t, f.harnessRecord(), "ARG=anthropic/claude-fable-5",
		"the model flag names the provider for this route too")
}

// The claude kind consumes a gateway through the vendor variables and has no
// provider file — stating that is the point of a table.
func TestEntrypointWritesNoProviderConfigForTheClaudeHarness(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvHarness] = "claude"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if config := f.ompProviderConfig(); config != "" {
		t.Errorf("the claude harness got an omp provider config:\n%s", config)
	}
	mustContain(t, f.harnessRecord(), "ARG=claude-fable-5",
		"claude takes the vendor's own id, not a provider-qualified selector")
}

// ---------------------------------------------------------------------------
// The harness probe: the gap the model probe cannot close.
//
// probe_model proves the GATEWAY answers. It is curl holding the token, so it
// cannot prove the HARNESS can call it — which is exactly the run that died
// four lines after a green probe.
// ---------------------------------------------------------------------------

func TestEntrypointProvesTheHarnessCanCallTheGatewayBeforeStartingIt(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvModel] = "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	probe := f.harnessProbeCalls()
	if probe == "" {
		t.Fatal("the run started without the harness ever having made a model call")
	}
	mustContain(t, probe, "ARG=cloudflare-ai-gateway/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
		"the probe exercises the same selector the run will use")
	mustContain(t, probe, "CLOUDFLARE_AI_GATEWAY_API_KEY="+testGatewayToken,
		"the probe exercises the same credential the run will use")
	mustContain(t, out, "harness probe green",
		"the successful round-trip is evidence in the run's own streamed output")
}

// The failure that forced this tick: the harness starts and dies. It must be a
// pre-flight stop with its own code, not the run's exit status.
func TestEntrypointStopsWhenTheHarnessCannotCallTheGateway(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvModel] = "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast"
	f.env["TICKS_TEST_HARNESS_PROBE_EXIT"] = "1"
	f.env["TICKS_TEST_HARNESS_PROBE_ANSWER"] = "error: No API key found for cloudflare-ai-gateway."
	out, code := f.run()
	if code != ExitHarness {
		t.Fatalf("exit %d, want %d\n%s", code, ExitHarness, out)
	}
	mustContain(t, out, "No API key found for cloudflare-ai-gateway",
		"the harness's own message is quoted verbatim rather than summarised")
	mustContain(t, out, "CLOUDFLARE_AI_GATEWAY_API_KEY",
		"the stop names the variable the harness reads")
	mustContain(t, out, "model probe above was GREEN",
		"the stop says the gateway is not the fault, so nobody re-diagnoses the route")
	if f.harnessStarted() {
		t.Error("the run started on a harness that cannot make a model call")
	}
}

// A harness that exits 0 saying nothing is the green-start trap: the run would
// have begun and done nothing.
func TestEntrypointStopsWhenTheHarnessProbeAnswersNothing(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_HARNESS_PROBE_ANSWER"] = ""
	out, code := f.run()
	if code != ExitHarness {
		t.Fatalf("exit %d, want %d\n%s", code, ExitHarness, out)
	}
	mustContain(t, out, "without answering the probe", "the stop says what was missing")
	if f.harnessStarted() {
		t.Error("the run started on a harness that answered nothing")
	}
}

// The gate is the ANSWER, not the exit status. Observed for real while building
// this: omp exited 0 having made three calls that all came back with no
// assistant text, printing only its own progress line. Exit status and
// non-empty output both said green.
func TestEntrypointStopsWhenTheHarnessExitsCleanWithoutCompletingARoundTrip(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_HARNESS_PROBE_ANSWER"] = "Working..."
	out, code := f.run()
	if code != ExitHarness {
		t.Fatalf("exit %d, want %d — a progress line is not an answer\n%s", code, ExitHarness, out)
	}
	mustContain(t, out, "green-start trap", "the stop names the class")
	mustContain(t, out, "Working...", "the stop quotes what the harness did say")
	if f.harnessStarted() {
		t.Error("the run started on a harness that never completed a round-trip")
	}
}

// "Ready." is a model complying. A gate that fails on it cries wolf.
func TestEntrypointAcceptsTheProbeAnswerInAnyCase(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_HARNESS_PROBE_ANSWER"] = "Ready."
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, out, "harness probe green", "a compliant answer in another case still passes")
}

// The two probes are two classes, and a reader of a dead sandbox's log has only
// the exit code to tell them apart.
func TestEntrypointKeepsTheHarnessFailureDistinctFromTheGatewayFailure(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_CURL_STATUS"] = "503"
	out, code := f.run()
	if code != ExitModel {
		t.Fatalf("exit %d, want %d (a refused gateway is not a harness failure)\n%s", code, ExitModel, out)
	}
	if f.harnessProbeCalls() != "" {
		t.Error("the harness was probed after the gateway had already refused the route")
	}
}

// The claude kind is probed too — the check is about harnesses, not about omp.
func TestEntrypointProvesTheClaudeHarnessToo(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvHarness] = "claude"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	probe := f.harnessProbeCalls()
	if probe == "" {
		t.Fatal("the claude harness started without ever having made a model call")
	}
	mustContain(t, probe, "BIN=claude", "the probe ran the kind this boot will start")
	mustContain(t, probe, "ANTHROPIC_API_KEY="+testGatewayToken,
		"claude's credential is the run's gateway token, same as the run's")
}

// The probe runs before provisioning and setup for the same reason the model
// probe does: a run that cannot make a model call is over either way, and those
// are the slow steps.
func TestEntrypointProbesTheHarnessBeforeTheSlowSteps(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env["TICKS_TEST_HARNESS_PROBE_EXIT"] = "1"
	out, code := f.run()
	if code != ExitHarness {
		t.Fatalf("exit %d, want %d\n%s", code, ExitHarness, out)
	}
	if calls := f.tkCalls(); strings.Contains(calls, "sandbox setup") || strings.Contains(calls, "sandbox environment") {
		t.Errorf("the entrypoint ran the repository's setup and pre-flight for a run that could not start:\n%s", calls)
	}
}

// The probe is bounded: a probe for a hang that itself hangs is the hang.
func TestEntrypointBoundsTheHarnessProbe(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvHarnessProbeTimeout] = "7"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, f.harnessProbeCalls(), "ARG=--max-time",
		"the omp probe carries the harness's own wall-clock bound")
	mustContain(t, f.harnessProbeCalls(), "ARG=7", "the bound is the configured one")
}

// The kind table is per-kind knowledge, so it is written down where the next
// person adding a kind will look — beside the claude/omp gateway wiring.
func TestSandboxReadmeDocumentsThePerKindGatewayCredentials(t *testing.T) {
	p, err := Path("README.md")
	if err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(p)
	if err != nil {
		t.Fatal(err)
	}
	readme := string(b)
	for _, want := range []string{
		"CLOUDFLARE_AI_GATEWAY_API_KEY",
		"cloudflare-ai-gateway",
		"models.yml",
	} {
		mustContain(t, readme, want, "cloud/sandbox/README.md documents what each kind reads")
	}
	mustContain(t, readme, "| 8 |", "the new exit class is in the exit-code table")
}

// ---------------------------------------------------------------------------
// Dispatch substrate
//
// The FIRST cloud run that completed a real agent turn died here: it read a
// checkout pinned to `substrate = "herdr"` — right for that repository's LOCAL
// runs — found no herdr socket in the container, and stopped, exactly as the
// orchestration protocol says to. The agent was right. Nothing had told the
// container that a cloud sandbox runs the harness substrate.
// ---------------------------------------------------------------------------

// TestEntrypointResolvesTheSubstrateBeforeTheHarness: the container asks tk,
// says what it resolved and why, and hands the harness both the substrate and
// the note to record. A cloud boot with no control-plane opinion resolves the
// harness substrate — Phase 1's design — rather than inheriting a local pin.
func TestEntrypointResolvesTheSubstrateBeforeTheHarness(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, f.tkCalls(), "sandbox substrate", "the entrypoint asks tk, not a TOML parser of its own")
	mustContain(t, out, "substrate harness", "the boot log states the resolved substrate")
	mustContain(t, out, "runner-state: substrate=harness", "the boot log carries the durable note line")

	rec := f.harnessRecord()
	mustContain(t, rec, EnvSubstrate+"="+string(DefaultCloudSubstrate),
		"the harness inherits the override, so everything it spawns resolves the same substrate")
	mustContain(t, rec, "runner-state: substrate=harness", "the prompt carries the note to record")
	mustContain(t, rec, "tk note", "the prompt says how to record it")
	mustContain(t, rec, "harness", "the prompt names the resolved substrate")
}

// The control plane can still ask for something else — the override is a
// parameter, not a constant. Whatever it asks for, tk resolves it and the run
// says so.
func TestEntrypointPassesTheControlPlanesSubstrateThrough(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvSubstrate] = "auto"
	f.env["TICKS_TEST_SANDBOX_SUBSTRATE"] = "herdr"
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	mustContain(t, f.harnessRecord(), EnvSubstrate+"=auto", "the harness sees what the control plane asked for")
	mustContain(t, out, "substrate herdr", "the boot log states what tk actually resolved")
}

// Fail closed, and before the expensive part: a substrate tk cannot resolve is
// a stop that names the variable, not a run that starts on a substrate nobody
// chose.
func TestEntrypointStopsOnAnUnresolvableSubstrate(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	f.env[EnvSubstrate] = "subagents"
	f.env["TICKS_TEST_SANDBOX_SUBSTRATE_ERROR"] = "TICKS_SUBSTRATE=\"subagents\" is not a substrate"
	out, code := f.run()
	if code != ExitConfig {
		t.Fatalf("exit %d, want %d (a malformed input)\n%s", code, ExitConfig, out)
	}
	mustContain(t, out, "subagents", "the stop quotes tk's own reason")
	if f.harnessStarted() {
		t.Error("the harness started on an unresolved substrate")
	}
}
