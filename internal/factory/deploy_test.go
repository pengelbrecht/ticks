package factory

import (
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

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// harness wires a deploy against the fake wrangler in testdata and a fake
// factory endpoint, so a full `tk factory deploy` runs end to end without a
// Cloudflare account. Everything the real command does — provisioning, the
// migration, the deploy, the secret, ~/.ticksrc, the authenticated probe — is
// exercised; only the far side is simulated.
type harness struct {
	t          *testing.T
	stateDir   string
	logPath    string
	bundleDir  string
	ticksrc    string
	server     *httptest.Server
	secretHash atomic.Pointer[string]
	authProbes atomic.Int32
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
		hashPtr := h.secretHash.Load()
		configured := hashPtr != nil && *hashPtr != ""
		if r.URL.Path == "/health" {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "ok",
				"service": "ticks-factory",
				"auth":    map[string]any{"required": true, "configured": configured},
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

	binDir := t.TempDir()
	fake, err := filepath.Abs(filepath.Join("testdata", "fake-wrangler.sh"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(fake, filepath.Join(binDir, "wrangler")); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	return h
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
		Version:     "1.2.3",
		BundleDir:   h.bundleDir,
		ConfigPath:  h.ticksrc,
		Out:         io.Discard,
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
	} {
		if countLines(lines, want) == 0 {
			t.Errorf("wrangler was never called with %q:\n%s", want, h.log())
		}
	}
	if h.authProbes.Load() == 0 {
		t.Error("the deploy never made an authenticated request against the endpoint")
	}
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

	// A PATH with npx but no wrangler.
	binDir := t.TempDir()
	fakeNpx, err := filepath.Abs(filepath.Join("testdata", "fake-npx.sh"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(fakeNpx, filepath.Join(binDir, "npx")); err != nil {
		t.Fatal(err)
	}
	// The npx fake forwards to the wrangler fake beside it, so both have to
	// live in the directory PATH resolves npx from. Only "npx" is a command
	// name, so this still leaves no `wrangler` on PATH.
	fakeWrangler, err := filepath.Abs(filepath.Join("testdata", "fake-wrangler.sh"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(fakeWrangler, filepath.Join(binDir, "fake-wrangler.sh")); err != nil {
		t.Fatal(err)
	}
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

// The npx fallback must never install wrangler on the operator's behalf: an
// npx that can only resolve a package by downloading it is a missing
// prerequisite, reported as one.
func TestDeployWithAnNpxThatCannotResolveWranglerStops(t *testing.T) {
	h := newHarness(t)
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
