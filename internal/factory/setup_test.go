package factory

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// ---------------------------------------------------------------------------
// Fixtures
//
// The walkthrough is verified rung by rung against live endpoints, so the
// tests stand up real ones: a fake GitHub API and a fake AI Gateway over
// HTTP, on top of the fake wrangler and fake worker the deploy tests already
// use. Nothing here is mocked at the function boundary — a probe that would
// not have been made in production is not made here either.
// ---------------------------------------------------------------------------

const (
	testPAT       = "github_pat_11EXAMPLE0000000000000000"
	testRepo      = "octo-org/octo-repo"
	testLogin     = "octo-user"
	testGatewayNS = "/v1/00000000000000000000000000000000/ticks"
	// A Cloudflare API token with AI Gateway read access — the credential that
	// turns a run's cost into gateway telemetry (D17).
	testCloudflareToken = "cf_api_token_EXAMPLE"
)

type fakeGitHub struct {
	server *httptest.Server
	token  string
	repo   string
	calls  atomic.Int32
}

func newFakeGitHub(t *testing.T, token, repo string) *fakeGitHub {
	t.Helper()
	g := &fakeGitHub{token: token, repo: repo}
	g.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		g.calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		if r.Header.Get("Authorization") != "Bearer "+g.token {
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]any{"message": "Bad credentials"})
			return
		}
		switch r.URL.Path {
		case "/user":
			_ = json.NewEncoder(w).Encode(map[string]any{"login": testLogin})
		case "/repos/" + g.repo:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"full_name":   g.repo,
				"permissions": map[string]any{"push": true, "pull": true},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(map[string]any{"message": "Not Found"})
		}
	}))
	t.Cleanup(g.server.Close)
	return g
}

func (g *fakeGitHub) base() string { return g.server.URL }

type fakeGateway struct {
	server *httptest.Server
	key    string // the key it accepts; empty means it answers unauthenticated
	calls  atomic.Int32
}

func newFakeGateway(t *testing.T, key string) *fakeGateway {
	t.Helper()
	gw := &fakeGateway{key: key}
	gw.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gw.calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		if !strings.HasSuffix(r.URL.Path, "/compat/models") {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if gw.key != "" && r.Header.Get("Authorization") != "Bearer "+gw.key {
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]any{"error": "unauthorized"})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": []any{
				map[string]any{"id": "model-alpha"},
				map[string]any{"id": "model-beta"},
			},
		})
	}))
	t.Cleanup(gw.server.Close)
	return gw
}

func (gw *fakeGateway) base() string { return gw.server.URL + testGatewayNS }

// fakeCloudflareAPI answers the AI Gateway logs read the telemetry rung proves
// its token with.
type fakeCloudflareAPI struct {
	server *httptest.Server
	token  string
	calls  atomic.Int32
}

func newFakeCloudflareAPI(t *testing.T, token string) *fakeCloudflareAPI {
	t.Helper()
	api := &fakeCloudflareAPI{token: token}
	api.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		if r.Header.Get("Authorization") != "Bearer "+api.token {
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": false,
				"errors":  []any{map[string]any{"message": "Authentication error"}},
			})
			return
		}
		if !strings.HasSuffix(r.URL.Path, "/logs") {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"success": true, "result": []any{}})
	}))
	t.Cleanup(api.server.Close)
	return api
}

func (api *fakeCloudflareAPI) base() string { return api.server.URL }

// setupHarness bundles the deploy harness with the two credential endpoints.
type setupHarness struct {
	*harness
	github     *fakeGitHub
	gateway    *fakeGateway
	cloudflare *fakeCloudflareAPI
	out        *bytes.Buffer
}

func newSetupHarness(t *testing.T, gatewayKey string) *setupHarness {
	t.Helper()
	return &setupHarness{
		harness:    newHarness(t),
		github:     newFakeGitHub(t, testPAT, testRepo),
		gateway:    newFakeGateway(t, gatewayKey),
		cloudflare: newFakeCloudflareAPI(t, testCloudflareToken),
		out:        &bytes.Buffer{},
	}
}

func (h *setupHarness) options(stdin string) SetupOptions {
	return SetupOptions{
		Version:           "1.2.3",
		BundleDir:         h.bundleDir,
		ConfigPath:        h.ticksrc,
		In:                strings.NewReader(stdin),
		Out:               h.out,
		GitHubAPIBase:     h.github.base(),
		CloudflareAPIBase: h.cloudflare.base(),
		Repo:              testRepo,
		HasCommand:        func([]string) bool { return true },
		onSecretPut:       h.syncSecret,
	}
}

func (h *setupHarness) rc(t *testing.T) *ticksrc.File {
	t.Helper()
	f, err := ticksrc.LoadFrom(h.ticksrc)
	if err != nil {
		t.Fatalf("reading %s: %v", h.ticksrc, err)
	}
	return f
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

// The headline acceptance path: a user with a Cloudflare account, a repo and a
// PAT reaches a fully configured factory through prompts alone.
func TestSetupWalksTheWholeLadderFromPromptsAlone(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")

	// deploy? / PAT / gateway URL / provider / provider key
	stdin := strings.Join([]string{"y", testPAT, h.gateway.base(), "anthropic", "sk-provider-key", ""}, "\n")
	result, err := Setup(context.Background(), h.options(stdin))
	if err != nil {
		t.Fatalf("Setup: %v\n%s\nwrangler:\n%s", err, h.out.String(), h.log())
	}

	if !result.Deployed {
		t.Error("setup did not deploy the factory when none existed")
	}
	if result.URL != h.server.URL {
		t.Errorf("URL = %q, want %q", result.URL, h.server.URL)
	}
	if result.GitHubLogin != testLogin {
		t.Errorf("GitHubLogin = %q, want %q", result.GitHubLogin, testLogin)
	}
	if result.Provider != "anthropic" {
		t.Errorf("Provider = %q, want anthropic", result.Provider)
	}
	if len(result.Models) == 0 {
		t.Error("the gateway rung did not record the models its probe listed")
	}

	// Every credential the user typed is a Worker secret.
	if got := h.secret(SecretGitHubToken); got != testPAT {
		t.Errorf("Worker secret %s = %q, want the PAT", SecretGitHubToken, got)
	}
	if got := h.secret(SecretGatewayBaseURL); got != h.gateway.base() {
		t.Errorf("Worker secret %s = %q, want %q", SecretGatewayBaseURL, got, h.gateway.base())
	}
	if got := h.secret("ANTHROPIC_API_KEY"); got != "sk-provider-key" {
		t.Errorf("Worker secret ANTHROPIC_API_KEY = %q, want the provider key", got)
	}

	// And the local mirror, which is what `tk factory status` re-checks.
	rc := h.rc(t)
	if rc.Get(ticksrc.KeyFactoryGitHubToken) != testPAT {
		t.Errorf("%s not mirrored into %s", ticksrc.KeyFactoryGitHubToken, h.ticksrc)
	}
	if rc.Get(ticksrc.KeyFactoryGitHubRepo) != testRepo {
		t.Errorf("%s = %q, want %q", ticksrc.KeyFactoryGitHubRepo, rc.Get(ticksrc.KeyFactoryGitHubRepo), testRepo)
	}
	if rc.Get(ticksrc.KeyFactoryGatewayURL) != h.gateway.base() {
		t.Errorf("%s = %q", ticksrc.KeyFactoryGatewayURL, rc.Get(ticksrc.KeyFactoryGatewayURL))
	}
	if rc.Get(ticksrc.KeyFactoryGatewayProvider) != "anthropic" {
		t.Errorf("%s = %q", ticksrc.KeyFactoryGatewayProvider, rc.Get(ticksrc.KeyFactoryGatewayProvider))
	}

	// Both rungs were proven live before they were stored.
	if h.github.calls.Load() < 2 {
		t.Errorf("GitHub probe made %d calls, want a /user and a /repos call", h.github.calls.Load())
	}
	if h.gateway.calls.Load() == 0 {
		t.Error("the gateway rung stored a base URL without listing models through it")
	}

	if runtime.GOOS != "windows" {
		info, err := os.Stat(h.ticksrc)
		if err != nil {
			t.Fatal(err)
		}
		if perm := info.Mode().Perm(); perm != 0o600 {
			t.Errorf("%s mode = %o, want 600", h.ticksrc, perm)
		}
	}
}

// The deploy rung is an offer, not an assumption: declining stops the walk with
// the command that would fix it, and persists nothing.
func TestSetupDecliningTheDeployStopsWithTheCommandToRun(t *testing.T) {
	h := newSetupHarness(t, "")

	_, err := Setup(context.Background(), h.options("n\n"))
	if err == nil {
		t.Fatal("Setup continued past a declined deploy")
	}
	if !strings.Contains(err.Error(), "tk factory deploy") {
		t.Errorf("error does not name the command to run:\n%v", err)
	}
	if _, statErr := os.Stat(h.ticksrc); !os.IsNotExist(statErr) {
		t.Error("a declined deploy still wrote the config file")
	}
	if strings.Contains(h.log(), "deploy") {
		t.Errorf("a declined deploy still ran wrangler deploy:\n%s", h.log())
	}
}

// Rung by rung: a rejected PAT stops before anything about GitHub is stored.
func TestSetupStopsOnARejectedGitHubToken(t *testing.T) {
	h := newSetupHarness(t, "")
	seedDeployment(t, h)

	opts := h.options("")
	opts.GitHubToken = "github_pat_wrong"
	_, err := Setup(context.Background(), opts)
	if err == nil {
		t.Fatal("Setup accepted a token GitHub rejected")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "github") {
		t.Errorf("error does not name the rung that failed:\n%v", err)
	}
	if got := h.secret(SecretGitHubToken); got != "" {
		t.Errorf("a rejected token was pushed as a Worker secret: %q", got)
	}
	if got := h.rc(t).Get(ticksrc.KeyFactoryGitHubToken); got != "" {
		t.Errorf("a rejected token was mirrored locally: %q", got)
	}
}

// A PAT that authenticates but cannot see the repo is the classic
// fine-grained-PAT mistake: the walk must catch it here, not at run time.
func TestSetupStopsWhenThePATCannotSeeTheRepo(t *testing.T) {
	h := newSetupHarness(t, "")
	seedDeployment(t, h)

	opts := h.options("")
	opts.GitHubToken = testPAT
	opts.Repo = "octo-org/some-other-repo"
	_, err := Setup(context.Background(), opts)
	if err == nil {
		t.Fatal("Setup accepted a token that cannot see the target repository")
	}
	if !strings.Contains(err.Error(), "octo-org/some-other-repo") {
		t.Errorf("error does not name the repository the token cannot reach:\n%v", err)
	}
	if got := h.secret(SecretGitHubToken); got != "" {
		t.Errorf("the token was stored anyway: %q", got)
	}
}

// The gateway rung fails the same way, and the GitHub rung it already settled
// stays settled — one rung at a time, verify, then persist.
func TestSetupStopsOnARejectedProviderKeyAfterKeepingTheGitHubRung(t *testing.T) {
	h := newSetupHarness(t, "sk-right")
	seedDeployment(t, h)

	opts := h.options("")
	opts.GitHubToken = testPAT
	opts.GatewayURL = h.gateway.base()
	opts.Provider = "openai"
	opts.ProviderKey = "sk-wrong"
	_, err := Setup(context.Background(), opts)
	if err == nil {
		t.Fatal("Setup accepted a key the gateway rejected")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "gateway") {
		t.Errorf("error does not name the gateway rung:\n%v", err)
	}
	if got := h.secret(SecretGitHubToken); got != testPAT {
		t.Errorf("the settled GitHub rung was rolled back: %q", got)
	}
	if got := h.secret(SecretGatewayBaseURL); got != "" {
		t.Errorf("the gateway URL was stored despite a failed probe: %q", got)
	}
	if got := h.secret("OPENAI_API_KEY"); got != "" {
		t.Errorf("a rejected provider key was stored: %q", got)
	}
}

// Workers AI is the rung where inference bills to the same account: there is no
// key to prompt for, and none is stored.
func TestSetupWorkersAIStoresNoProviderKey(t *testing.T) {
	h := newSetupHarness(t, "")
	seedDeployment(t, h)

	opts := h.options("")
	opts.GitHubToken = testPAT
	opts.GatewayURL = h.gateway.base()
	opts.Provider = "workers-ai"
	result, err := Setup(context.Background(), opts)
	if err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}

	if result.ProviderKeyStored {
		t.Error("the Workers AI rung stored a provider key")
	}
	if got := h.secret(SecretGatewayBaseURL); got != h.gateway.base() {
		t.Errorf("gateway URL secret = %q", got)
	}
	for _, spec := range Providers {
		if spec.SecretName == "" {
			continue
		}
		if got := h.secret(spec.SecretName); got != "" {
			t.Errorf("Workers AI setup stored %s = %q", spec.SecretName, got)
		}
	}
	if out := h.out.String(); !strings.Contains(out, "no key") {
		t.Errorf("the walk never says Workers AI needs no key:\n%s", out)
	}
	if h.gateway.calls.Load() == 0 {
		t.Error("the gateway URL was stored without any live probe")
	}
}

// Re-running is the reconfiguration path, not a second install.
func TestSetupIsIdempotent(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")

	stdin := strings.Join([]string{"y", testPAT, h.gateway.base(), "anthropic", "sk-provider-key", ""}, "\n")
	if _, err := Setup(context.Background(), h.options(stdin)); err != nil {
		t.Fatalf("first setup: %v\n%s", err, h.out.String())
	}
	first, _ := os.ReadFile(h.ticksrc)

	opts := h.options("")
	opts.GitHubToken = testPAT
	opts.GatewayURL = h.gateway.base()
	opts.Provider = "anthropic"
	opts.ProviderKey = "sk-provider-key"
	if _, err := Setup(context.Background(), opts); err != nil {
		t.Fatalf("second setup: %v\n%s", err, h.out.String())
	}
	second, _ := os.ReadFile(h.ticksrc)

	if string(first) != string(second) {
		t.Errorf("re-running setup changed the stored configuration:\n%s\n---\n%s", first, second)
	}
	if n := countLines(h.logLines(), "d1 create "); n != 1 {
		t.Errorf("d1 create ran %d times across two setups, want 1:\n%s", n, h.log())
	}
}

// ---------------------------------------------------------------------------
// Persistence: no secret ever lands in a tracked file
// ---------------------------------------------------------------------------

// D17's ground truth: a run's cost budget acts on what the GATEWAY billed, so
// the credential that reads gateway logs is proven live and stored like every
// other rung.
func TestSetupStoresTheCostTelemetryToken(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	opts := h.options(strings.Join([]string{"y", testPAT, h.gateway.base(), "anthropic", "sk-provider-key", ""}, "\n"))
	opts.CloudflareAPIToken = testCloudflareToken

	result, err := Setup(context.Background(), opts)
	if err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}
	if !result.CostTelemetry {
		t.Error("the walk did not record that cost telemetry is configured")
	}
	if got := h.secret(SecretCloudflareAPIToken); got != testCloudflareToken {
		t.Errorf("Worker secret %s = %q, want the API token", SecretCloudflareAPIToken, got)
	}
	if got := h.rc(t).Get(ticksrc.KeyFactoryCloudflareAPIToken); got != testCloudflareToken {
		t.Errorf("%s not mirrored into ~/.ticksrc: %q", ticksrc.KeyFactoryCloudflareAPIToken, got)
	}
	if h.cloudflare.calls.Load() == 0 {
		t.Error("the token was stored without a live read against the gateway's logs")
	}
}

// A rejected telemetry token is a stop with a reason, not a factory that
// quietly reports every run as costing nothing.
func TestSetupStopsOnARejectedCostTelemetryToken(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	opts := h.options(strings.Join([]string{"y", testPAT, h.gateway.base(), "anthropic", "sk-provider-key", ""}, "\n"))
	opts.CloudflareAPIToken = "cf_wrong_token"

	_, err := Setup(context.Background(), opts)
	if err == nil {
		t.Fatal("Setup accepted a token the API rejected")
	}
	if !strings.Contains(err.Error(), "AI Gateway read") {
		t.Errorf("error = %v, want it to name the access the token needs", err)
	}
	if got := h.secret(SecretCloudflareAPIToken); got != "" {
		t.Errorf("a rejected token was stored as a Worker secret: %q", got)
	}
}

// The one optional rung. Without it the walk still finishes — but it says what
// is lost and how to add it, rather than leaving the operator to discover that
// their cost budget never fires.
func TestSetupWithoutCostTelemetrySaysWhatIsLost(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	stdin := strings.Join([]string{"y", testPAT, h.gateway.base(), "anthropic", "sk-provider-key", ""}, "\n")

	result, err := Setup(context.Background(), h.options(stdin))
	if err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}
	if result.CostTelemetry {
		t.Error("CostTelemetry is true with no token supplied")
	}
	out := h.out.String()
	for _, want := range []string{"cost budget", "--cloudflare-api-token"} {
		if !strings.Contains(out, want) {
			t.Errorf("the walk never mentioned %q:\n%s", want, out)
		}
	}
	if h.cloudflare.calls.Load() != 0 {
		t.Error("the telemetry rung probed the API with no token to prove")
	}
}

// The persistence contract, asserted against the code that declares it: setup
// writes credentials to Worker secrets and to exactly one local file.
func TestSecretSinksAreTheWorkerAndOneLocalFile(t *testing.T) {
	workerSecrets, localFiles := SecretSinks("/home/someone/.ticksrc")

	if len(localFiles) != 1 || localFiles[0] != "/home/someone/.ticksrc" {
		t.Errorf("local secret sinks = %v, want exactly the given config path", localFiles)
	}
	want := map[string]bool{
		SecretGitHubToken:        true,
		SecretGatewayBaseURL:     true,
		SecretCloudflareAPIToken: true,
		SecretFactoryBaseURL:     true,
	}
	for _, spec := range Providers {
		if spec.SecretName != "" {
			want[spec.SecretName] = true
		}
	}
	want[SecretName] = true
	for _, name := range workerSecrets {
		if !want[name] {
			t.Errorf("unexpected Worker secret sink %q", name)
		}
		delete(want, name)
	}
	for name := range want {
		t.Errorf("Worker secret %q is written but not declared as a sink", name)
	}
}

// The acceptance criterion itself: run the whole walk with the working
// directory inside a git repository and prove the repository never sees a
// secret — not in a tracked file, not in an untracked one.
func TestSetupNeverWritesASecretIntoTheRepository(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("the wrangler fake is a POSIX shell script")
	}
	h := newSetupHarness(t, "sk-provider-key")
	repo := newTestRepo(t)

	// The config path and the bundle both live outside the repo; run from
	// inside it anyway, which is how an operator actually invokes tk.
	restore := chdir(t, repo)
	defer restore()

	opts := h.options("")
	opts.GitHubToken = testPAT
	opts.GatewayURL = h.gateway.base()
	opts.Provider = "anthropic"
	opts.ProviderKey = "sk-provider-key"
	if _, err := Setup(context.Background(), opts); err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}

	secrets := []string{testPAT, "sk-provider-key"}
	err := filepath.WalkDir(repo, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		data, readErr := os.ReadFile(path)
		if readErr != nil {
			return nil
		}
		for _, secret := range secrets {
			if bytes.Contains(data, []byte(secret)) {
				t.Errorf("secret leaked into the repository at %s", path)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	status, gitErr := exec.Command("git", "-C", repo, "status", "--porcelain").CombinedOutput()
	if gitErr != nil {
		t.Fatalf("git status: %v\n%s", gitErr, status)
	}
	if strings.TrimSpace(string(status)) != "" {
		t.Errorf("setup left changes in the repository:\n%s", status)
	}
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// seedDeployment runs a deploy so the credential rungs have a factory to push
// secrets to, then clears the output buffer.
func seedDeployment(t *testing.T, h *setupHarness) {
	t.Helper()
	opts := h.harness.options()
	opts.Out = io.Discard
	if _, err := Deploy(context.Background(), opts); err != nil {
		t.Fatalf("seeding a deployment: %v\n%s", err, h.log())
	}
	h.out.Reset()
}

// newTestRepo makes a git repository with one committed file.
func newTestRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	for _, args := range [][]string{
		{"init", "-q"},
		{"config", "user.email", "test@example.com"},
		{"config", "user.name", "Test"},
	} {
		cmd := exec.Command("git", append([]string{"-C", dir}, args...)...)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	if err := os.WriteFile(filepath.Join(dir, "README.md"), []byte("# test\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	for _, args := range [][]string{{"add", "-A"}, {"commit", "-q", "-m", "init"}} {
		cmd := exec.Command("git", append([]string{"-C", dir}, args...)...)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	return dir
}

func chdir(t *testing.T, dir string) func() {
	t.Helper()
	prev, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	return func() { _ = os.Chdir(prev) }
}
