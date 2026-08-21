package cmd

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/pengelbrecht/ticks/internal/factory"
)

// fakeWranglerOnPath puts internal/factory's wrangler stand-in at the front of
// PATH and points the whole command at a temporary home directory, so
// `tk factory deploy` runs for real against a simulated Cloudflare account.
func fakeWranglerOnPath(t *testing.T, endpoint string) (home string, stateDir string) {
	t.Helper()
	if runtime.GOOS == "windows" {
		t.Skip("the wrangler fake is a POSIX shell script")
	}

	// A `go test` binary carries no VCS stamp, so this binary looks like a dev
	// build with no commit — and the deploy refuses one, because the
	// orchestrator image builds its tk from source and can only build a commit
	// that exists. A released version is what an operator actually runs.
	restore := Version
	SetVersion("1.2.3")
	t.Cleanup(func() { SetVersion(restore) })

	home = t.TempDir()
	stateDir = t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("TK_HOME", filepath.Join(home, ".tick"))
	t.Setenv("FAKE_WRANGLER_STATE", stateDir)
	t.Setenv("FAKE_WRANGLER_LOG", filepath.Join(stateDir, "wrangler.log"))
	t.Setenv("FAKE_WRANGLER_URL", endpoint)

	// A deploy shells out to three operator-side tools: wrangler, a container
	// engine for the orchestrator image, and pnpm for the Worker's runtime
	// dependency. All three are the stand-ins — a test that used the real
	// docker would build an image, and one that used the real pnpm would
	// install from the network.
	binDir := t.TempDir()
	for name, script := range map[string]string{
		"wrangler": "fake-wrangler.sh",
		"docker":   "fake-docker.sh",
		"pnpm":     "fake-pnpm.sh",
	} {
		fake, err := filepath.Abs(filepath.Join("..", "..", "..", "internal", "factory", "testdata", script))
		if err != nil {
			t.Fatal(err)
		}
		if _, err := os.Stat(fake); err != nil {
			t.Fatalf("%s not found: %v", script, err)
		}
		if err := os.Symlink(fake, filepath.Join(binDir, name)); err != nil {
			t.Fatal(err)
		}
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
	return home, stateDir
}

// fakeFactory serves the routes `tk factory deploy` verifies, reading the
// secret the fake wrangler stored the way a real deployment would.
func fakeFactory(t *testing.T, stateDir func() string) *httptest.Server {
	t.Helper()
	var probes atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		secret, err := os.ReadFile(filepath.Join(stateDir(), "secret-FACTORY_TOKEN_HASH"))
		configured := err == nil && len(secret) > 0
		if r.URL.Path == "/health" {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "ok",
				// The deploy refuses a deployment with no container binding.
				"bindings": map[string]any{"sandboxes": true},
				"auth":     map[string]any{"required": true, "configured": configured},
			})
			return
		}
		probes.Add(1)
		if !configured || r.Header.Get("Authorization") == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestFactoryDeployWritesTicksrcAndReportsTheEndpoint(t *testing.T) {
	var stateDir string
	srv := fakeFactory(t, func() string { return stateDir })
	_, stateDir = fakeWranglerOnPath(t, srv.URL)
	home := os.Getenv("HOME")

	buf := captureCmdOutput(t)
	err := ExecuteArgs([]string{"factory", "deploy"})
	out := buf.String()
	if err != nil {
		t.Fatalf("tk factory deploy: %v\n%s", err, out)
	}

	data, readErr := os.ReadFile(filepath.Join(home, ".ticksrc"))
	if readErr != nil {
		t.Fatalf("~/.ticksrc was not written: %v", readErr)
	}
	rc := string(data)
	if !strings.Contains(rc, "factory_url="+srv.URL) {
		t.Errorf("~/.ticksrc has no factory_url for the deployed endpoint:\n%s", rc)
	}
	if !strings.Contains(rc, "factory_token=tkf_") {
		t.Errorf("~/.ticksrc has no factory token:\n%s", rc)
	}
	if !strings.Contains(rc, "factory_version=") {
		t.Errorf("~/.ticksrc does not pin the tk version:\n%s", rc)
	}
	if !strings.Contains(out, srv.URL) {
		t.Errorf("the command never told the operator the endpoint:\n%s", out)
	}
}

func TestFactoryDeployWithoutWranglerExitsNonzeroWithAnActionableError(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("PATH manipulation differs on Windows")
	}
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("TK_HOME", filepath.Join(home, ".tick"))
	t.Setenv("PATH", t.TempDir())

	err := ExecuteArgs([]string{"factory", "deploy"})
	if err == nil {
		t.Fatal("tk factory deploy succeeded without wrangler installed")
	}
	if code := GetExitCode(err); code == ExitSuccess {
		t.Errorf("exit code = %d, want nonzero", code)
	}
	msg := err.Error()
	if !strings.Contains(msg, "wrangler") {
		t.Errorf("error does not name the missing prerequisite:\n%s", msg)
	}
	if !strings.Contains(msg, "install") {
		t.Errorf("error does not say how to install it:\n%s", msg)
	}
	if _, statErr := os.Stat(filepath.Join(home, ".ticksrc")); !os.IsNotExist(statErr) {
		t.Error("a failed precondition still wrote ~/.ticksrc")
	}
}

func TestFactoryDeployIsIdempotent(t *testing.T) {
	var stateDir string
	srv := fakeFactory(t, func() string { return stateDir })
	_, stateDir = fakeWranglerOnPath(t, srv.URL)
	home := os.Getenv("HOME")

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"factory", "deploy"}); err != nil {
		t.Fatalf("first deploy: %v\n%s", err, buf)
	}
	first, _ := os.ReadFile(filepath.Join(home, ".ticksrc"))

	if err := ExecuteArgs([]string{"factory", "deploy"}); err != nil {
		t.Fatalf("second deploy: %v\n%s", err, buf)
	}
	second, _ := os.ReadFile(filepath.Join(home, ".ticksrc"))

	if string(first) != string(second) {
		t.Errorf("re-running the deploy changed the recorded credentials:\n%s\n---\n%s", first, second)
	}
	log, err := os.ReadFile(filepath.Join(stateDir, "wrangler.log"))
	if err != nil {
		t.Fatal(err)
	}
	if n := strings.Count(string(log), "d1 create "); n != 1 {
		t.Errorf("d1 create ran %d times across two deploys, want 1:\n%s", n, log)
	}
}

func TestFactoryDeployRotateToken(t *testing.T) {
	var stateDir string
	srv := fakeFactory(t, func() string { return stateDir })
	_, stateDir = fakeWranglerOnPath(t, srv.URL)
	home := os.Getenv("HOME")

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"factory", "deploy"}); err != nil {
		t.Fatalf("first deploy: %v\n%s", err, buf)
	}
	before, _ := os.ReadFile(filepath.Join(home, ".ticksrc"))

	if err := ExecuteArgs([]string{"factory", "deploy", "--rotate-token"}); err != nil {
		t.Fatalf("rotating deploy: %v\n%s", err, buf)
	}
	after, _ := os.ReadFile(filepath.Join(home, ".ticksrc"))

	if string(before) == string(after) {
		t.Error("--rotate-token left the stored token unchanged")
	}

	// The flag must not leak into the next in-process execution (ResetFlags):
	// a plain re-run keeps the token it just rotated to.
	if err := ExecuteArgs([]string{"factory", "deploy"}); err != nil {
		t.Fatalf("third deploy: %v\n%s", err, buf)
	}
	third, _ := os.ReadFile(filepath.Join(home, ".ticksrc"))
	if string(third) != string(after) {
		t.Errorf("--rotate-token leaked into the next execution:\n%s\n---\n%s", after, third)
	}
}

func TestFactoryWithoutSubcommandShowsHelp(t *testing.T) {
	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"factory"}); err != nil {
		t.Fatalf("tk factory: %v", err)
	}
	if out := buf.String(); !strings.Contains(out, "deploy") {
		t.Errorf("tk factory does not mention its deploy subcommand:\n%s", out)
	}
}

// The version pin exists so `tk upgrade` can offer a redeploy; this is that
// offer's decision table.
func TestFactoryRedeployNotice(t *testing.T) {
	cases := []struct {
		name       string
		ticksrc    string
		newVersion string
		want       string
	}{
		{"no factory deployed", "token=board-token\n", "0.31.0", ""},
		{"factory already current", "factory_url=https://f\nfactory_version=0.31.0\n", "0.31.0", ""},
		{"factory a version behind", "factory_url=https://f\nfactory_version=0.30.0\n", "0.31.0", "tk factory deploy"},
		{"factory version never recorded", "factory_url=https://f\n", "0.31.0", "tk factory deploy"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			home := t.TempDir()
			t.Setenv("HOME", home)
			if err := os.WriteFile(filepath.Join(home, ".ticksrc"), []byte(tc.ticksrc), 0o600); err != nil {
				t.Fatal(err)
			}

			got := factoryRedeployNotice(tc.newVersion)
			if tc.want == "" && got != "" {
				t.Errorf("notice = %q, want none", got)
			}
			if tc.want != "" && !strings.Contains(got, tc.want) {
				t.Errorf("notice = %q, want it to mention %q", got, tc.want)
			}
		})
	}
}

func TestFactoryRedeployNoticeIsSilentWithoutTicksrc(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	if got := factoryRedeployNotice("0.31.0"); got != "" {
		t.Errorf("notice = %q, want none when ~/.ticksrc does not exist", got)
	}
}

// ---------------------------------------------------------------------------
// setup / status
// ---------------------------------------------------------------------------

// fakeCredentialEndpoints stands up the two services the credential rungs are
// verified against, so `tk factory setup` runs its real probes.
func fakeCredentialEndpoints(t *testing.T, pat, repo, gatewayKey string) (githubBase, gatewayBase string) {
	t.Helper()
	gh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Header.Get("Authorization") != "Bearer "+pat {
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]any{"message": "Bad credentials"})
			return
		}
		switch r.URL.Path {
		case "/user":
			_ = json.NewEncoder(w).Encode(map[string]any{"login": "octo-user"})
		case "/repos/" + repo:
			_ = json.NewEncoder(w).Encode(map[string]any{
				"full_name":   repo,
				"permissions": map[string]any{"push": true},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(map[string]any{"message": "Not Found"})
		}
	}))
	t.Cleanup(gh.Close)

	gw := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if !strings.HasSuffix(r.URL.Path, "/compat/models") {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if gatewayKey != "" && r.Header.Get("Authorization") != "Bearer "+gatewayKey {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"data": []any{map[string]any{"id": "model-alpha"}}})
	}))
	t.Cleanup(gw.Close)

	return gh.URL, gw.URL + "/v1/00000000000000000000000000000000/ticks"
}

// The acceptance path through the CLI: prompts (here, the deploy offer) plus
// answers, and the user ends with a configured factory.
func TestFactorySetupConfiguresEveryRung(t *testing.T) {
	const pat = "github_pat_11EXAMPLE0000000000000000"
	const repo = "octo-org/octo-repo"
	var stateDir string
	srv := fakeFactory(t, func() string { return stateDir })
	_, stateDir = fakeWranglerOnPath(t, srv.URL)
	home := os.Getenv("HOME")
	githubBase, gatewayBase := fakeCredentialEndpoints(t, pat, repo, "sk-provider-key")

	buf := captureChannelIO(t, "y\n")
	err := ExecuteArgs([]string{"factory", "setup",
		"--repo", repo,
		"--github-token", pat,
		"--github-api-base", githubBase,
		"--gateway-url", gatewayBase,
		"--provider", "anthropic",
		"--provider-key", "sk-provider-key",
	})
	out := buf.String()
	if err != nil {
		t.Fatalf("tk factory setup: %v\n%s", err, out)
	}

	data, readErr := os.ReadFile(filepath.Join(home, ".ticksrc"))
	if readErr != nil {
		t.Fatalf("~/.ticksrc was not written: %v", readErr)
	}
	rc := string(data)
	for _, want := range []string{
		"factory_url=" + srv.URL,
		"factory_github_token=" + pat,
		"factory_github_login=octo-user",
		"factory_github_repo=" + repo,
		"factory_gateway_url=" + gatewayBase,
		"factory_gateway_provider=anthropic",
	} {
		if !strings.Contains(rc, want) {
			t.Errorf("~/.ticksrc is missing %q:\n%s", want, rc)
		}
	}

	for name, want := range map[string]string{
		"GITHUB_TOKEN":        pat,
		"AI_GATEWAY_BASE_URL": gatewayBase,
		"ANTHROPIC_API_KEY":   "sk-provider-key",
	} {
		got, _ := os.ReadFile(filepath.Join(stateDir, "secret-"+name))
		if string(got) != want {
			t.Errorf("Worker secret %s = %q, want %q", name, got, want)
		}
	}

	if !strings.Contains(out, "tk factory status") {
		t.Errorf("setup does not point at the status command:\n%s", out)
	}
}

// Setup stops on a rejected credential and exits nonzero.
func TestFactorySetupExitsNonzeroOnARejectedToken(t *testing.T) {
	const repo = "octo-org/octo-repo"
	var stateDir string
	srv := fakeFactory(t, func() string { return stateDir })
	_, stateDir = fakeWranglerOnPath(t, srv.URL)
	githubBase, gatewayBase := fakeCredentialEndpoints(t, "github_pat_right", repo, "")

	buf := captureChannelIO(t, "y\n")
	err := ExecuteArgs([]string{"factory", "setup",
		"--repo", repo,
		"--github-token", "github_pat_wrong",
		"--github-api-base", githubBase,
		"--gateway-url", gatewayBase,
		"--provider", "workers-ai",
	})
	if err == nil {
		t.Fatalf("tk factory setup accepted a rejected token:\n%s", buf.String())
	}
	if code := GetExitCode(err); code == ExitSuccess {
		t.Errorf("exit code = %d, want nonzero", code)
	}
	if _, statErr := os.Stat(filepath.Join(stateDir, "secret-GITHUB_TOKEN")); !os.IsNotExist(statErr) {
		t.Error("a rejected token was still pushed as a Worker secret")
	}
}

// Status is safe to call with nothing configured, and says what to run.
func TestFactoryStatusWithNothingConfigured(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"factory", "status"}); err != nil {
		t.Fatalf("tk factory status: %v", err)
	}
	if out := buf.String(); !strings.Contains(out, "tk factory setup") {
		t.Errorf("status does not name the command that configures a factory:\n%s", out)
	}
}

// --offline reports configuration without touching the network; --check turns
// a rejected credential into a nonzero exit, and its absence does not.
func TestFactoryStatusOfflineAndCheck(t *testing.T) {
	const repo = "octo-org/octo-repo"
	home := t.TempDir()
	t.Setenv("HOME", home)
	githubBase, _ := fakeCredentialEndpoints(t, "github_pat_right", repo, "")
	rc := strings.Join([]string{
		"factory_github_token=github_pat_revoked",
		"factory_github_login=octo-user",
		"factory_github_repo=" + repo,
		"",
	}, "\n")
	if err := os.WriteFile(filepath.Join(home, ".ticksrc"), []byte(rc), 0o600); err != nil {
		t.Fatal(err)
	}

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"factory", "status", "--offline"}); err != nil {
		t.Fatalf("tk factory status --offline: %v", err)
	}
	out := buf.String()
	if !strings.Contains(out, repo) || !strings.Contains(out, "--offline") {
		t.Errorf("offline status does not report the configuration it read:\n%s", out)
	}
	if strings.Contains(out, "github_pat_revoked") {
		t.Errorf("status printed the stored token:\n%s", out)
	}

	// Live, without --check: reported but exit 0.
	if err := ExecuteArgs([]string{"factory", "status", "--github-api-base", githubBase}); err != nil {
		t.Fatalf("tk factory status: %v\n%s", err, buf.String())
	}

	// Live, with --check: nonzero.
	err := ExecuteArgs([]string{"factory", "status", "--check", "--github-api-base", githubBase})
	if err == nil {
		t.Fatalf("tk factory status --check returned nil for a revoked token:\n%s", buf.String())
	}
	if code := GetExitCode(err); code == ExitSuccess {
		t.Errorf("exit code = %d, want nonzero", code)
	}
}

func TestFactoryHelpMentionsSetupAndStatus(t *testing.T) {
	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"factory"}); err != nil {
		t.Fatalf("tk factory: %v", err)
	}
	out := buf.String()
	for _, want := range []string{"setup", "status", "deploy"} {
		if !strings.Contains(out, want) {
			t.Errorf("tk factory does not mention %q:\n%s", want, out)
		}
	}
}

// hasCommand is what `tk factory deploy` answers the image/entrypoint gate
// with, so it has to distinguish a missing subcommand from a positional
// argument. Getting that wrong either lets a stale image through or blocks a
// correct deploy.
func TestHasCommandResolvesSubcommandChains(t *testing.T) {
	for _, tc := range []struct {
		chain []string
		want  bool
	}{
		{[]string{"version"}, true},
		{[]string{"sandbox"}, true},
		{[]string{"sandbox", "environment"}, true},
		{[]string{"sandbox", "setup"}, true},
		{[]string{"sandbox", "image"}, true},
		{[]string{"sandbox", "toolchain"}, true},
		{[]string{"sandbox", "nosuchthing"}, false},
		{[]string{"nosuchcommand"}, false},
		{nil, false},
	} {
		if got := hasCommand(tc.chain); got != tc.want {
			t.Errorf("hasCommand(%q) = %v, want %v", tc.chain, got, tc.want)
		}
	}
}

// Every subcommand the orchestrator entrypoint runs has to exist in this
// binary, or `tk factory deploy` would ship an image that boots and then dies
// mid-run. This is that assertion, run against the real command tree.
func TestThisTkCanRunTheOrchestratorEntrypoint(t *testing.T) {
	commands, err := factory.EntrypointTkCommands()
	if err != nil {
		t.Fatalf("EntrypointTkCommands: %v", err)
	}
	if len(commands) == 0 {
		t.Fatal("the scanner found no tk invocation in the entrypoint")
	}
	for _, c := range commands {
		if !hasCommand(strings.Fields(c)) {
			t.Errorf("the entrypoint runs `tk %s`, which this tk does not have", c)
		}
	}
}
