package factory

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// harness wires a deploy against the fake wrangler in testdata and a fake
// factory endpoint, so a full `tk factory deploy` runs end to end without a
// Cloudflare account. Everything the real command does — provisioning, the
// migration, the deploy, the secret, ~/.ticksrc, the authenticated probe — is
// exercised; only the far side is simulated.
type harness struct {
	t                   *testing.T
	stateDir            string
	logPath             string
	bundleDir           string
	ticksrc             string
	server              *httptest.Server
	secretHash          atomic.Pointer[string]
	authProbes          atomic.Int32
	propagationFailures atomic.Int32
	propagationStatus   int
	propagationBody     string
	// noSandboxBinding makes /health report a deployment with no container
	// binding — the shape the live factory had before this was declared.
	noSandboxBinding atomic.Bool
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	if runtime.GOOS == "windows" {
		t.Skip("the wrangler fake is a POSIX shell script")
	}

	h := &harness{
		t:         t,
		stateDir:  t.TempDir(),
		bundleDir: filepath.Join(t.TempDir(), "bundle"),
		ticksrc:   filepath.Join(t.TempDir(), ".ticksrc"),
	}
	h.logPath = filepath.Join(h.stateDir, "wrangler.log")

	// The fake worker verifies the presented bearer token against the hash
	// the deploy pushed, exactly as src/auth.ts does — so a deploy that wrote
	// a hash for a different token fails the probe here too.
	h.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if h.consumePropagationFailure() {
			status := h.propagationStatus
			if status == 0 {
				status = http.StatusServiceUnavailable
			}
			w.WriteHeader(status)
			if h.propagationBody != "" {
				_, _ = io.WriteString(w, h.propagationBody)
			}
			return
		}
		hashPtr := h.secretHash.Load()
		configured := hashPtr != nil && *hashPtr != ""
		if r.URL.Path == "/health" {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":   "ok",
				"service":  "ticks-factory",
				"bindings": map[string]any{"sandboxes": !h.noSandboxBinding.Load()},
				"auth":     map[string]any{"required": true, "configured": configured},
			})
			return
		}
		h.authProbes.Add(1)
		if !configured {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		ok, err := verifyTokenAgainstHash(token, *hashPtr)
		if err != nil || !ok {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": "not_found"})
	}))
	t.Cleanup(h.server.Close)

	// The fake wrangler writes the secret to a file; mirror it into the fake
	// worker before each verification by reading it lazily.
	t.Setenv("FAKE_WRANGLER_STATE", h.stateDir)
	t.Setenv("FAKE_WRANGLER_LOG", h.logPath)
	t.Setenv("FAKE_WRANGLER_URL", h.server.URL)

	// wrangler, the container engine and the package manager are all shelled
	// out to by a deploy, so all three are faked: a test that used the real
	// docker or the real pnpm would build an image and hit the network.
	binDir := t.TempDir()
	for name, script := range map[string]string{
		"wrangler": "fake-wrangler.sh",
		"docker":   "fake-docker.sh",
		"pnpm":     "fake-pnpm.sh",
	} {
		linkFake(t, binDir, name, script)
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv(dockerEnvVar, "")

	return h
}

// testdataDir is resolved at package initialization, before any test chdirs.
// Resolving "testdata" later would silently produce a dangling symlink in a
// test that moved the working directory, and a dangling symlink is not a
// command — which surfaces as "Docker is not installed" rather than as the
// test's own bug.
var testdataDir = mustAbs("testdata")

func mustAbs(path string) string {
	abs, err := filepath.Abs(path)
	if err != nil {
		panic(err)
	}
	return abs
}

// linkFake symlinks one of the testdata stand-ins into dir under a command
// name. Tests that build their own PATH use it for the tools every deploy
// needs regardless of which wrangler it resolves.
func linkFake(t *testing.T, dir, name, script string) {
	t.Helper()
	if err := os.Symlink(filepath.Join(testdataDir, script), filepath.Join(dir, name)); err != nil {
		t.Fatal(err)
	}
}

func (h *harness) consumePropagationFailure() bool {
	for {
		remaining := h.propagationFailures.Load()
		if remaining <= 0 {
			return false
		}
		if h.propagationFailures.CompareAndSwap(remaining, remaining-1) {
			return true
		}
	}
}

// syncSecret copies whatever the fake wrangler last stored into the fake
// worker, which is what `wrangler secret put` does for real.
func (h *harness) syncSecret() {
	data, err := os.ReadFile(filepath.Join(h.stateDir, "secret-"+SecretName))
	if err != nil {
		return
	}
	s := string(data)
	h.secretHash.Store(&s)
}

func (h *harness) options() Options {
	return Options{
		Version:    "1.2.3",
		BundleDir:  h.bundleDir,
		ConfigPath: h.ticksrc,
		Out:        io.Discard,
		// A complete tk: the gate that keeps the image's tk in step with the
		// entrypoint has its own tests, and every other deploy test wants to
		// get past it.
		HasCommand:  func([]string) bool { return true },
		onSecretPut: h.syncSecret,
	}
}

func (h *harness) log() string {
	h.t.Helper()
	data, err := os.ReadFile(h.logPath)
	if err != nil {
		return ""
	}
	return string(data)
}

func (h *harness) logLines() []string {
	var lines []string
	for _, l := range strings.Split(strings.TrimSpace(h.log()), "\n") {
		if l != "" {
			lines = append(lines, l)
		}
	}
	return lines
}

func countLines(lines []string, prefix string) int {
	n := 0
	for _, l := range lines {
		if strings.HasPrefix(l, prefix) {
			n++
		}
	}
	return n
}

// A clean account: one command produces a working authenticated endpoint and a
// ~/.ticksrc entry.
func TestDeployFromCleanAccount(t *testing.T) {
	h := newHarness(t)

	result, err := Deploy(context.Background(), h.options())
	if err != nil {
		t.Fatalf("Deploy: %v\nwrangler calls:\n%s", err, h.log())
	}

	if result.URL != h.server.URL {
		t.Errorf("URL = %q, want %q", result.URL, h.server.URL)
	}
	if !strings.HasPrefix(result.Token, TokenPrefix) {
		t.Errorf("token %q is not a factory token", result.Token)
	}
	if result.Rotated != true {
		t.Errorf("Rotated = false on a first deploy; a token was minted")
	}
	if result.DatabaseID == "" {
		t.Error("no D1 database id recorded")
	}

	cfg, err := ticksrc.LoadFrom(h.ticksrc)
	if err != nil {
		t.Fatal(err)
	}
	if got := cfg.Get(ticksrc.KeyFactoryURL); got != h.server.URL {
		t.Errorf("~/.ticksrc factory_url = %q, want %q", got, h.server.URL)
	}
	if got := cfg.Get(ticksrc.KeyFactoryToken); got != result.Token {
		t.Errorf("~/.ticksrc factory_token = %q, want %q", got, result.Token)
	}
	if got := cfg.Get(ticksrc.KeyFactoryVersion); got != "1.2.3" {
		t.Errorf("~/.ticksrc factory_version = %q, want the tk version", got)
	}

	lines := h.logLines()
	for _, want := range []string{
		"whoami",
		"r2 bucket create " + BucketName,
		"d1 create " + DatabaseName,
		"d1 migrations apply " + DatabaseName + " --remote",
		"deploy",
		"secret put " + SecretName,
		"secret put " + SecretFactoryBaseURL,
	} {
		if countLines(lines, want) == 0 {
			t.Errorf("wrangler was never called with %q:\n%s", want, h.log())
		}
	}
	if h.authProbes.Load() == 0 {
		t.Error("the deploy never made an authenticated request against the endpoint")
	}

	// The Worker has to know its own endpoint: a run's sandbox is pointed at
	// <FACTORY_BASE_URL>/api/gateway for every model call it makes (D17), and
	// the deploy is the one place that endpoint is known.
	if got := h.secret(SecretFactoryBaseURL); got != h.server.URL {
		t.Errorf("Worker secret %s = %q, want the deployed endpoint %q", SecretFactoryBaseURL, got, h.server.URL)
	}
}

// secret returns what the fake wrangler stored for a Worker secret.
func (h *harness) secret(name string) string {
	data, err := os.ReadFile(filepath.Join(h.stateDir, "secret-"+name))
	if err != nil {
		return ""
	}
	return string(data)
}

// Re-running upgrades in place: no duplicate resources, same token.
func TestDeployIsIdempotent(t *testing.T) {
	h := newHarness(t)

	first, err := Deploy(context.Background(), h.options())
	if err != nil {
		t.Fatalf("first Deploy: %v\n%s", err, h.log())
	}
	second, err := Deploy(context.Background(), h.options())
	if err != nil {
		t.Fatalf("second Deploy: %v\n%s", err, h.log())
	}

	if second.Token != first.Token {
		t.Errorf("token changed on re-deploy: %q then %q", first.Token, second.Token)
	}
	if second.Rotated {
		t.Error("Rotated = true on a re-deploy without --rotate-token")
	}
	if second.DatabaseID != first.DatabaseID {
		t.Errorf("database id changed: %q then %q", first.DatabaseID, second.DatabaseID)
	}

	lines := h.logLines()
	if n := countLines(lines, "d1 create "); n != 1 {
		t.Errorf("d1 create ran %d times, want 1:\n%s", n, h.log())
	}
	if n := countLines(lines, "r2 bucket create "); n != 1 {
		t.Errorf("r2 bucket create ran %d times, want 1:\n%s", n, h.log())
	}
	if n := countLines(lines, "deploy"); n != 2 {
		t.Errorf("deploy ran %d times, want 2:\n%s", n, h.log())
	}
}

func TestDeployRotateTokenMintsANewOne(t *testing.T) {
	h := newHarness(t)

	first, err := Deploy(context.Background(), h.options())
	if err != nil {
		t.Fatalf("first Deploy: %v", err)
	}

	opts := h.options()
	opts.RotateToken = true
	second, err := Deploy(context.Background(), opts)
	if err != nil {
		t.Fatalf("rotating Deploy: %v\n%s", err, h.log())
	}

	if second.Token == first.Token {
		t.Error("--rotate-token kept the old token")
	}
	if !second.Rotated {
		t.Error("Rotated = false after --rotate-token")
	}
	cfg, _ := ticksrc.LoadFrom(h.ticksrc)
	if got := cfg.Get(ticksrc.KeyFactoryToken); got != second.Token {
		t.Errorf("~/.ticksrc still holds the old token: %q", got)
	}
}

// The bundle pin: the deployed config is this binary's bundle, and the version
// is recorded both locally and in D1.
func TestDeployPinsTheBundleToTheTkVersion(t *testing.T) {
	h := newHarness(t)

	result, err := Deploy(context.Background(), h.options())
	if err != nil {
		t.Fatalf("Deploy: %v", err)
	}

	if result.BundleSHA != BundleSHA() {
		t.Errorf("BundleSHA = %q, want the embedded bundle's %q", result.BundleSHA, BundleSHA())
	}
	sql, err := os.ReadFile(filepath.Join(h.stateDir, "execute.log"))
	if err != nil {
		t.Fatalf("the deploy never recorded its version in D1: %v", err)
	}
	if !strings.Contains(string(sql), "1.2.3") || !strings.Contains(string(sql), BundleSHA()) {
		t.Errorf("recorded deployment row does not carry the version and bundle sha:\n%s", sql)
	}
	// The deployed wrangler.toml must carry the operator's real database id.
	deployed, err := os.ReadFile(filepath.Join(h.stateDir, "deployed-wrangler.toml"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(deployed), result.DatabaseID) {
		t.Errorf("deployed config does not bind the provisioned database:\n%s", deployed)
	}
}

// Existing ~/.ticksrc content (board sync's token=/url=) survives a deploy.
func TestDeployPreservesBoardSyncConfig(t *testing.T) {
	h := newHarness(t)
	if err := os.WriteFile(h.ticksrc, []byte("token=board-token\nurl=wss://ticks.sh/api/projects\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	if _, err := Deploy(context.Background(), h.options()); err != nil {
		t.Fatalf("Deploy: %v", err)
	}

	cfg, _ := ticksrc.LoadFrom(h.ticksrc)
	if got := cfg.Get(ticksrc.KeyToken); got != "board-token" {
		t.Errorf("board sync token = %q, want it untouched", got)
	}
	if got := cfg.Get(ticksrc.KeyURL); got != "wss://ticks.sh/api/projects" {
		t.Errorf("board sync url = %q, want it untouched", got)
	}
}

func TestDeployWithoutWranglerNamesThePrerequisite(t *testing.T) {
	h := newHarness(t)
	// Keep a developer's repository-local Wrangler out of this PATH-only
	// scenario; the resolver is intentionally allowed to find that copy.
	restore := chdir(t, t.TempDir())
	defer restore()
	// An empty PATH: wrangler cannot be found.
	t.Setenv("PATH", t.TempDir())

	_, err := Deploy(context.Background(), h.options())
	if err == nil {
		t.Fatal("Deploy succeeded without wrangler on PATH")
	}
	var prereq *PrerequisiteError
	if !errors.As(err, &prereq) {
		t.Fatalf("error is not a PrerequisiteError: %v", err)
	}
	msg := err.Error()
	if !strings.Contains(msg, "wrangler") {
		t.Errorf("error does not name wrangler: %s", msg)
	}
	if !strings.Contains(msg, "npm install") && !strings.Contains(msg, "pnpm") {
		t.Errorf("error does not say how to install wrangler: %s", msg)
	}
	if _, statErr := os.Stat(h.ticksrc); !os.IsNotExist(statErr) {
		t.Error("a failed precondition still wrote ~/.ticksrc")
	}
}

func TestDeployWithUnauthenticatedWranglerStops(t *testing.T) {
	h := newHarness(t)
	t.Setenv("FAKE_WRANGLER_UNAUTH", "1")

	_, err := Deploy(context.Background(), h.options())
	if err == nil {
		t.Fatal("Deploy succeeded with an unauthenticated wrangler")
	}
	var prereq *PrerequisiteError
	if !errors.As(err, &prereq) {
		t.Fatalf("error is not a PrerequisiteError: %v", err)
	}
	if !strings.Contains(err.Error(), "wrangler login") {
		t.Errorf("error does not point at `wrangler login`: %v", err)
	}
	lines := h.logLines()
	if countLines(lines, "r2 ") != 0 || countLines(lines, "d1 ") != 0 {
		t.Errorf("the deploy provisioned resources despite failing its precondition:\n%s", h.log())
	}
}

// An older wrangler without `r2 bucket info` must still reach a correct
// idempotent outcome via the list fallback.
func TestDeployToleratesWranglerWithoutBucketInfo(t *testing.T) {
	h := newHarness(t)
	t.Setenv("FAKE_WRANGLER_NO_INFO", "1")

	if _, err := Deploy(context.Background(), h.options()); err != nil {
		t.Fatalf("first Deploy: %v\n%s", err, h.log())
	}
	if _, err := Deploy(context.Background(), h.options()); err != nil {
		t.Fatalf("second Deploy: %v\n%s", err, h.log())
	}

	if n := countLines(h.logLines(), "r2 bucket create "); n != 1 {
		t.Errorf("r2 bucket create ran %d times, want 1:\n%s", n, h.log())
	}
}

// The endpoint check is a real end-to-end proof, so a factory that comes back
// unauthenticated must fail the command rather than report success.
func TestDeployFailsWhenTheEndpointDoesNotAuthenticate(t *testing.T) {
	h := newHarness(t)
	opts := h.options()
	opts.onSecretPut = func() {} // the secret never reaches the worker
	opts.verifyAttempts = 1

	_, err := Deploy(context.Background(), opts)
	if err == nil {
		t.Fatal("Deploy reported success against an endpoint that rejects its token")
	}
	if !strings.Contains(err.Error(), "verif") && !strings.Contains(err.Error(), "auth") {
		t.Errorf("error does not explain the verification failure: %v", err)
	}
	// The credential is still recorded: the deploy happened, and a re-run must
	// be able to reuse the token rather than orphan it.
	cfg, _ := ticksrc.LoadFrom(h.ticksrc)
	if cfg.Get(ticksrc.KeyFactoryToken) == "" {
		t.Error("the minted token was lost when verification failed")
	}
}

func TestDeployToleratesSecretPropagationErrors(t *testing.T) {
	tests := []struct {
		name   string
		status int
		body   string
	}{
		{name: "auth not configured", status: http.StatusServiceUnavailable},
		{name: "cloudflare edge 1042", status: http.StatusBadGateway, body: "Error 1042: edge propagation in progress"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := newHarness(t)
			// Five stale-version responses require the sixth default probe. Keep
			// the test quick while preserving the production attempt count.
			h.propagationFailures.Store(5)
			h.propagationStatus = tt.status
			h.propagationBody = tt.body

			opts := h.options()
			opts.verifyDelay = time.Millisecond
			if _, err := Deploy(context.Background(), opts); err != nil {
				t.Fatalf("Deploy after propagation lag: %v\n%s", err, h.log())
			}
			if remaining := h.propagationFailures.Load(); remaining != 0 {
				t.Fatalf("verification stopped with %d propagation responses left", remaining)
			}
		})
	}
}

func TestDeployURLOverrideSkipsDetection(t *testing.T) {
	h := newHarness(t)
	t.Setenv("FAKE_WRANGLER_URL", "https://not-the-endpoint.example.com")
	opts := h.options()
	opts.URL = h.server.URL

	result, err := Deploy(context.Background(), opts)
	if err != nil {
		t.Fatalf("Deploy: %v\n%s", err, h.log())
	}
	if result.URL != h.server.URL {
		t.Errorf("URL = %q, want the override %q", result.URL, h.server.URL)
	}
}

// Plenty of operators never install a global wrangler — `npx wrangler` is the
// whole of their setup. Refusing to deploy for them would be a prerequisite
// that is not actually missing.
func TestDeployResolvesWranglerThroughNpx(t *testing.T) {
	h := newHarness(t)
	fakeNpx, err := filepath.Abs(filepath.Join("testdata", "fake-npx.sh"))
	if err != nil {
		t.Fatal(err)
	}
	fakeWrangler, err := filepath.Abs(filepath.Join("testdata", "fake-wrangler.sh"))
	if err != nil {
		t.Fatal(err)
	}
	// This scenario has only npx available. It must not accidentally use the
	// repository's own dependency when the tests run from a checkout.
	restore := chdir(t, t.TempDir())
	defer restore()

	// A PATH with npx but no wrangler.
	binDir := t.TempDir()
	if err := os.Symlink(fakeNpx, filepath.Join(binDir, "npx")); err != nil {
		t.Fatal(err)
	}
	// The npx fake forwards to the wrangler fake beside it, so both have to
	// live in the directory PATH resolves npx from. Only "npx" is a command
	// name, so this still leaves no `wrangler` on PATH.
	if err := os.Symlink(fakeWrangler, filepath.Join(binDir, "fake-wrangler.sh")); err != nil {
		t.Fatal(err)
	}
	// Docker and pnpm are needed by every deploy, whichever wrangler it finds.
	linkFake(t, binDir, "docker", "fake-docker.sh")
	linkFake(t, binDir, "pnpm", "fake-pnpm.sh")
	// The shell fakes need the standard utilities; what matters here is that
	// the harness's `wrangler` directory is gone from PATH.
	t.Setenv("PATH", binDir+":/usr/bin:/bin")

	result, err := Deploy(context.Background(), h.options())
	if err != nil {
		t.Fatalf("Deploy through npx: %v\n%s", err, h.log())
	}
	if result.URL != h.server.URL {
		t.Errorf("URL = %q, want %q", result.URL, h.server.URL)
	}
	if countLines(h.logLines(), "deploy") == 0 {
		t.Errorf("npx never reached the wrangler deploy:\n%s", h.log())
	}
}

func TestDeployResolvesWranglerFromStagedBundle(t *testing.T) {
	h := newHarness(t)

	localBin := filepath.Join(h.bundleDir, "node_modules", ".bin")
	if err := os.MkdirAll(localBin, 0o755); err != nil {
		t.Fatal(err)
	}
	fake, err := filepath.Abs(filepath.Join("testdata", "fake-wrangler.sh"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(fake, filepath.Join(localBin, "wrangler")); err != nil {
		t.Fatal(err)
	}

	// Shadow any real PATH candidates with failing stand-ins. The staged copy
	// must be found directly, without relying on npx to resolve it or install it.
	pathBin := t.TempDir()
	for _, name := range []string{"wrangler", "npx"} {
		if err := os.WriteFile(filepath.Join(pathBin, name), []byte("#!/bin/sh\nexit 1\n"), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	linkFake(t, pathBin, "docker", "fake-docker.sh")
	linkFake(t, pathBin, "pnpm", "fake-pnpm.sh")
	t.Setenv("PATH", pathBin+string(os.PathListSeparator)+"/usr/bin:/bin")

	var out bytes.Buffer
	opts := h.options()
	opts.Out = &out
	result, err := Deploy(context.Background(), opts)
	if err != nil {
		t.Fatalf("Deploy through staged Wrangler: %v\n%s", err, h.log())
	}
	if result.URL != h.server.URL {
		t.Errorf("URL = %q, want %q", result.URL, h.server.URL)
	}
	if !strings.Contains(out.String(), "staged bundle") {
		t.Errorf("deploy did not report the staged Wrangler candidate:\n%s", out.String())
	}
}

// The npx fallback must never install wrangler on the operator's behalf: an
// npx that can only resolve a package by downloading it is a missing
// prerequisite, reported as one.
func TestDeployWithAnNpxThatCannotResolveWranglerStops(t *testing.T) {
	h := newHarness(t)
	// Keep this PATH-only failure scenario independent of a local install in
	// the checkout where the tests are run.
	restore := chdir(t, t.TempDir())
	defer restore()
	binDir := t.TempDir()
	script := "#!/bin/sh\necho 'npx: could not determine executable to run' >&2\nexit 1\n"
	if err := os.WriteFile(filepath.Join(binDir, "npx"), []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", binDir)

	_, err := Deploy(context.Background(), h.options())
	if err == nil {
		t.Fatal("Deploy succeeded with an npx that cannot resolve wrangler")
	}
	var prereq *PrerequisiteError
	if !errors.As(err, &prereq) {
		t.Fatalf("error is not a PrerequisiteError: %v", err)
	}
	if !strings.Contains(err.Error(), "npx wrangler") {
		t.Errorf("the error does not mention the npx path as an option: %v", err)
	}
}

// The image the container binding points at has to exist before the Worker
// that boots it is uploaded, and the Worker's runtime dependency has to be
// installed before wrangler can bundle it. Both are staged work, and both must
// happen before the deploy — not after it, and not never.
func TestDeployStagesTheImageAndInstallsBeforeDeploying(t *testing.T) {
	h := newHarness(t)

	if _, err := Deploy(context.Background(), h.options()); err != nil {
		t.Fatalf("Deploy: %v\n%s", err, h.log())
	}

	sandboxDir := SandboxDir(h.bundleDir)
	if _, err := os.Stat(filepath.Join(sandboxDir, "Dockerfile")); err != nil {
		t.Errorf("the orchestrator image context was not staged in %s: %v", sandboxDir, err)
	}
	if _, err := os.Stat(filepath.Join(h.bundleDir, "node_modules")); err != nil {
		t.Errorf("the bundle's runtime dependencies were never installed: %v", err)
	}

	lines := h.logLines()
	install, deploy := -1, -1
	for i, line := range lines {
		if strings.HasPrefix(line, "pnpm install") && install == -1 {
			install = i
		}
		if line == "deploy" && deploy == -1 {
			deploy = i
		}
	}
	if install == -1 {
		t.Fatalf("the deploy never installed the bundle:\n%s", h.log())
	}
	if !strings.Contains(lines[install], "--frozen-lockfile") {
		t.Errorf("the install did not use the bundle's lockfile: %q", lines[install])
	}
	if deploy == -1 || install > deploy {
		t.Errorf("the install did not run before `wrangler deploy`:\n%s", h.log())
	}
}

// A stopped Docker and an absent Docker are different problems with different
// remedies, and a deploy that collapses them sends the operator to the wrong
// one. Neither may create anything first.
func TestDeployStopsWhenTheDockerDaemonIsNotRunning(t *testing.T) {
	h := newHarness(t)
	t.Setenv("FAKE_DOCKER_DOWN", "1")

	_, err := Deploy(context.Background(), h.options())

	var prerequisite *PrerequisiteError
	if !errors.As(err, &prerequisite) {
		t.Fatalf("Deploy error = %v, want a PrerequisiteError", err)
	}
	if !strings.Contains(prerequisite.Missing, "daemon") {
		t.Errorf("the stop names %q, not the daemon", prerequisite.Missing)
	}
	for _, forbidden := range []string{"d1 create", "r2 bucket create", "deploy"} {
		if countLines(h.logLines(), forbidden) != 0 {
			t.Errorf("the deploy ran %q after the prerequisite failed:\n%s", forbidden, h.log())
		}
	}
}

func TestDeployStopsWhenDockerIsNotInstalled(t *testing.T) {
	h := newHarness(t)
	// Not "remove docker from PATH": the fakes need the standard utilities,
	// and wrangler's own override is the honest way to point at a binary that
	// is not there.
	t.Setenv(dockerEnvVar, "tk-test-no-such-container-engine")

	_, err := Deploy(context.Background(), h.options())

	var prerequisite *PrerequisiteError
	if !errors.As(err, &prerequisite) {
		t.Fatalf("Deploy error = %v, want a PrerequisiteError", err)
	}
	if !strings.Contains(prerequisite.Error(), "cloud/sandbox") {
		t.Errorf("the stop does not say what the image is for:\n%s", prerequisite.Error())
	}
	if countLines(h.logLines(), "deploy") != 0 {
		t.Errorf("a factory was deployed with no image to boot:\n%s", h.log())
	}
}

func TestDeployStopsWhenThePackageManagerIsMissing(t *testing.T) {
	h := newHarness(t)
	// A PATH holding every tool but pnpm.
	binDir := t.TempDir()
	linkFake(t, binDir, "wrangler", "fake-wrangler.sh")
	linkFake(t, binDir, "docker", "fake-docker.sh")
	t.Setenv("PATH", binDir+":/usr/bin:/bin")

	_, err := Deploy(context.Background(), h.options())

	var prerequisite *PrerequisiteError
	if !errors.As(err, &prerequisite) {
		t.Fatalf("Deploy error = %v, want a PrerequisiteError", err)
	}
	if !strings.Contains(prerequisite.Missing, "pnpm") {
		t.Errorf("the stop names %q, not pnpm", prerequisite.Missing)
	}
}

// The whole point of the tick: a deployed Worker with no container binding is
// a factory that refuses every run. The deploy that produced it must say so,
// rather than reporting success and leaving the discovery to a submission.
func TestDeployFailsWhenHealthReportsNoContainerBinding(t *testing.T) {
	h := newHarness(t)
	h.noSandboxBinding.Store(true)
	opts := h.options()
	opts.verifyAttempts = 1
	opts.verifyDelay = time.Millisecond

	_, err := Deploy(context.Background(), opts)

	if err == nil {
		t.Fatal("the deploy reported success with no container binding on the deployment")
	}
	if !strings.Contains(err.Error(), "sandboxes") {
		t.Errorf("the failure does not name the missing binding: %v", err)
	}
}

// The image builds its tk from the deploying binary's own source, so the pins
// wrangler builds with are the deploy's answers — not whatever the committed
// Dockerfile happened to say last release. That is the whole mechanism keeping
// the container's tk in step with the bundle it boots.
func TestDeployPinsTheImagesTkToItsOwnSource(t *testing.T) {
	h := newHarness(t)

	result, err := Deploy(context.Background(), h.options())
	if err != nil {
		t.Fatalf("Deploy: %v\n%s", err, h.log())
	}
	if result.SourceRef != "v1.2.3" {
		t.Errorf("Result.SourceRef = %q, want the deploying version's tag", result.SourceRef)
	}

	data, err := os.ReadFile(filepath.Join(SandboxDir(h.bundleDir), "Dockerfile"))
	if err != nil {
		t.Fatalf("staged Dockerfile: %v", err)
	}
	for _, want := range []string{"\nARG TK_VERSION=1.2.3\n", "\nARG TK_SOURCE_REF=v1.2.3\n"} {
		if !strings.Contains(string(data), want) {
			t.Errorf("the staged Dockerfile does not carry %q:\n%s", strings.TrimSpace(want), data)
		}
	}
}

// The failure this replaces: a deploy that succeeded, then a container that
// booted, streamed, and died at exit 6 with "unknown command: sandbox". It has
// to be a stop that names the subcommand — and it has to happen before the
// account is touched, because a half-provisioned account is worse than no
// deploy at all.
func TestDeployStopsWhenThisTkCannotRunTheEntrypoint(t *testing.T) {
	h := newHarness(t)
	opts := h.options()
	opts.HasCommand = func(chain []string) bool {
		return !(len(chain) > 0 && chain[0] == "sandbox")
	}

	_, err := Deploy(context.Background(), opts)

	var missing *MissingTkCommandsError
	if !errors.As(err, &missing) {
		t.Fatalf("Deploy did not stop on a tk that cannot run the entrypoint: %v", err)
	}
	if !strings.Contains(err.Error(), "`tk sandbox environment`") {
		t.Errorf("the stop does not name a missing subcommand: %v", err)
	}
	if lines := h.logLines(); len(lines) != 0 {
		t.Errorf("the deploy ran wrangler before checking its own tk:\n%s", h.log())
	}
}

// A deploy that cannot ask what this tk implements must not quietly skip the
// check — that is how the stale pin survived a release in the first place.
func TestDeployRefusesWithoutACommandSet(t *testing.T) {
	h := newHarness(t)
	opts := h.options()
	opts.HasCommand = nil

	if _, err := Deploy(context.Background(), opts); err == nil {
		t.Fatal("Deploy ran with no way to check its own command set")
	}
}

// ---------------------------------------------------------------------------
// The container rollout (tick z1b).
//
// `wrangler deploy` creates the container rollout and returns without waiting
// for it, so a green deploy used to be compatible with a factory still serving
// the previous image — and a run started immediately afterwards booted the old
// code. These cover the wait that closes that gap and, just as importantly,
// what the deploy says when it cannot close it.
// ---------------------------------------------------------------------------

// rolloutOptions is h.options() with a wait short enough for a test.
func (h *harness) rolloutOptions() Options {
	opts := h.options()
	opts.rolloutTimeout = 2 * time.Second
	opts.rolloutPoll = time.Millisecond
	return opts
}

func TestDeployWaitsForTheContainerRolloutToServeTheNewImage(t *testing.T) {
	h := newHarness(t)
	// The application reports the previous image for the first three listings,
	// which is exactly the window that used to be invisible.
	t.Setenv("FAKE_WRANGLER_ROLLOUT_LAG", "3")

	result, err := Deploy(context.Background(), h.rolloutOptions())
	if err != nil {
		t.Fatalf("Deploy: %v\nwrangler calls:\n%s", err, h.log())
	}

	if !result.RolloutConfirmed {
		t.Error("Deploy returned success without confirming the container rollout")
	}
	wantDigest := "sha256:" + strings.Repeat("2", 64)
	if result.ImageDigest != wantDigest {
		t.Errorf("ImageDigest = %q, want the pushed digest %q", result.ImageDigest, wantDigest)
	}
	if !strings.Contains(result.ImageRef, ContainerAppName) {
		t.Errorf("ImageRef = %q, want the orchestrator image reference", result.ImageRef)
	}

	if n := countLines(h.logLines(), "containers list"); n < 4 {
		t.Errorf("the deploy polled the container application %d times, want it to keep asking "+
			"until the new digest appeared:\n%s", n, h.log())
	}

	// The confirmed image is recorded server-side, so the Worker can stamp the
	// runs it starts with the image they boot.
	execLog := h.execLog()
	if !strings.Contains(execLog, "factory_deployment_image") || !strings.Contains(execLog, wantDigest) {
		t.Errorf("the confirmed image was not recorded in D1:\n%s", execLog)
	}
}

// execLog returns the SQL the fake wrangler was asked to execute.
func (h *harness) execLog() string {
	data, err := os.ReadFile(filepath.Join(h.stateDir, "execute.log"))
	if err != nil {
		return ""
	}
	return string(data)
}

// The whole point: a rollout that never lands must not exit 0. A green deploy
// in front of a stale container is what made a correct fix look broken.
func TestDeployFailsWhenTheRolloutNeverLands(t *testing.T) {
	h := newHarness(t)
	t.Setenv("FAKE_WRANGLER_ROLLOUT_STUCK", "1")

	var out bytes.Buffer
	opts := h.rolloutOptions()
	opts.rolloutTimeout = 30 * time.Millisecond
	opts.Out = &out

	result, err := Deploy(context.Background(), opts)
	if err == nil {
		t.Fatalf("Deploy reported success while the container application still served the old image\n%s", out.String())
	}
	var rollout *RolloutError
	if !errors.As(err, &rollout) {
		t.Fatalf("Deploy error = %T (%v), want a *RolloutError", err, err)
	}
	if rollout.Expected == "" || rollout.Serving == "" {
		t.Errorf("the failure names expected=%q serving=%q; both digests have to be in the message",
			rollout.Expected, rollout.Serving)
	}
	if rollout.Serving == rollout.Expected {
		t.Error("the failure claims the application is serving the image it was waiting for")
	}

	// The deployment itself landed, and the result still carries what it knows:
	// the operator needs the credentials and the digest, not a rollback.
	if result == nil || result.URL == "" {
		t.Fatal("Deploy dropped its result on an unconfirmed rollout; the credentials still landed")
	}
	if result.RolloutConfirmed {
		t.Error("RolloutConfirmed = true on a rollout that never landed")
	}
	if result.ImageDigest == "" {
		t.Error("the result does not carry the digest the deploy pushed, so the operator cannot compare")
	}

	// Nothing may record an image the application never reported.
	if strings.Contains(h.execLog(), "factory_deployment_image") {
		t.Errorf("an unconfirmed image was recorded in D1:\n%s", h.execLog())
	}
}

// A wrangler whose container listing this build cannot read is still a "cannot
// confirm", not a success.
func TestDeployFailsWhenTheContainerApplicationCannotBeRead(t *testing.T) {
	h := newHarness(t)
	t.Setenv("FAKE_WRANGLER_NO_CONTAINERS", "1")

	opts := h.rolloutOptions()
	opts.rolloutTimeout = 30 * time.Millisecond
	if _, err := Deploy(context.Background(), opts); err == nil {
		t.Fatal("Deploy reported success without being able to read the container application")
	} else if !strings.Contains(err.Error(), "could not be confirmed") {
		t.Errorf("error does not say the rollout was unconfirmed: %v", err)
	}
}

func TestDeployFailsWhenTheAccountDoesNotListTheApplication(t *testing.T) {
	h := newHarness(t)
	t.Setenv("FAKE_WRANGLER_NO_SUCH_APP", "1")

	opts := h.rolloutOptions()
	opts.rolloutTimeout = 30 * time.Millisecond
	if _, err := Deploy(context.Background(), opts); err == nil {
		t.Fatal("Deploy reported success while the account lists no orchestrator application")
	} else if !strings.Contains(err.Error(), ContainerAppName) {
		t.Errorf("error does not name the missing application: %v", err)
	}
}

// A deploy whose output names no digest has nothing to compare, which is the
// same "cannot confirm" — never a silent pass.
func TestDeployFailsWhenNoImageDigestCanBeRead(t *testing.T) {
	h := newHarness(t)
	t.Setenv("FAKE_WRANGLER_NO_CONTAINER_BLOCK", "1")

	if _, err := Deploy(context.Background(), h.rolloutOptions()); err == nil {
		t.Fatal("Deploy reported success without a digest to confirm against")
	} else if !strings.Contains(err.Error(), "no digest-pinned") {
		t.Errorf("error does not say the digest could not be read: %v", err)
	}
}

// The escape hatch exists, and it says out loud that nothing was confirmed.
func TestDeploySkipRolloutWaitSaysNothingWasConfirmed(t *testing.T) {
	h := newHarness(t)
	t.Setenv("FAKE_WRANGLER_ROLLOUT_STUCK", "1")

	var out bytes.Buffer
	opts := h.rolloutOptions()
	opts.Out = &out
	opts.SkipRolloutWait = true

	result, err := Deploy(context.Background(), opts)
	if err != nil {
		t.Fatalf("Deploy with --skip-rollout-wait: %v", err)
	}
	if result.RolloutConfirmed {
		t.Error("RolloutConfirmed = true when the wait was skipped")
	}
	if !strings.Contains(out.String(), "NOT confirmed") {
		t.Errorf("the skipped wait is not reported in the output:\n%s", out.String())
	}
	if n := countLines(h.logLines(), "containers list"); n != 0 {
		t.Errorf("the container application was polled %d times despite --skip-rollout-wait", n)
	}
}

// A re-deploy that changes nothing still confirms: wrangler prints the image
// the application is already on, and the wait converges on the first look.
func TestDeployConfirmsAnUnchangedRolloutImmediately(t *testing.T) {
	h := newHarness(t)

	first, err := Deploy(context.Background(), h.rolloutOptions())
	if err != nil {
		t.Fatalf("first Deploy: %v\n%s", err, h.log())
	}
	// The second deploy pushes nothing new: the application is already serving
	// what the deploy names.
	t.Setenv("FAKE_WRANGLER_SERVING_DIGEST", first.ImageDigest)
	t.Setenv("FAKE_WRANGLER_PUSH_DIGEST", first.ImageDigest)

	second, err := Deploy(context.Background(), h.rolloutOptions())
	if err != nil {
		t.Fatalf("second Deploy: %v\n%s", err, h.log())
	}
	if !second.RolloutConfirmed || second.ImageDigest != first.ImageDigest {
		t.Errorf("an unchanged re-deploy did not confirm: confirmed=%v digest=%q want %q",
			second.RolloutConfirmed, second.ImageDigest, first.ImageDigest)
	}
}
