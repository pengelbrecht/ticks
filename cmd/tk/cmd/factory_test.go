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
)

// fakeWranglerOnPath puts internal/factory's wrangler stand-in at the front of
// PATH and points the whole command at a temporary home directory, so
// `tk factory deploy` runs for real against a simulated Cloudflare account.
func fakeWranglerOnPath(t *testing.T, endpoint string) (home string, stateDir string) {
	t.Helper()
	if runtime.GOOS == "windows" {
		t.Skip("the wrangler fake is a POSIX shell script")
	}

	home = t.TempDir()
	stateDir = t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("TK_HOME", filepath.Join(home, ".tick"))
	t.Setenv("FAKE_WRANGLER_STATE", stateDir)
	t.Setenv("FAKE_WRANGLER_LOG", filepath.Join(stateDir, "wrangler.log"))
	t.Setenv("FAKE_WRANGLER_URL", endpoint)

	fake, err := filepath.Abs(filepath.Join("..", "..", "..", "internal", "factory", "testdata", "fake-wrangler.sh"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(fake); err != nil {
		t.Fatalf("wrangler fake not found: %v", err)
	}
	binDir := t.TempDir()
	if err := os.Symlink(fake, filepath.Join(binDir, "wrangler")); err != nil {
		t.Fatal(err)
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
				"auth":   map[string]any{"required": true, "configured": configured},
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
