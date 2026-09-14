package cmd

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/cloudcredentials"
)

type cloudFactoryRequest struct {
	Method string
	Path   string
	Query  url.Values
	Body   map[string]any
	Auth   string
}

type cloudRoundTripper func(*http.Request) (*http.Response, error)

func (f cloudRoundTripper) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func newCloudFactory(t *testing.T, handler func(cloudFactoryRequest) (int, any)) (string, *[]cloudFactoryRequest) {
	t.Helper()
	var mu sync.Mutex
	requests := make([]cloudFactoryRequest, 0)
	previousClient := cloudHTTPClient
	cloudHTTPClient = &http.Client{Transport: cloudRoundTripper(func(r *http.Request) (*http.Response, error) {
		request := cloudFactoryRequest{
			Method: r.Method, Path: r.URL.Path, Query: r.URL.Query(), Auth: r.Header.Get("Authorization"),
		}
		if r.Body != nil {
			data, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("read factory request: %v", err)
			}
			if len(strings.TrimSpace(string(data))) > 0 {
				if err := json.Unmarshal(data, &request.Body); err != nil {
					t.Fatalf("decode factory request: %v", err)
				}
			}
		}
		mu.Lock()
		requests = append(requests, request)
		mu.Unlock()

		status, body := handler(request)
		encoded := []byte{}
		if body != nil {
			var err error
			encoded, err = json.Marshal(body)
			if err != nil {
				return nil, err
			}
		}
		return &http.Response{
			StatusCode: status,
			Status:     http.StatusText(status),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body:       io.NopCloser(strings.NewReader(string(encoded))),
			Request:    r,
		}, nil
	})}
	t.Cleanup(func() { cloudHTTPClient = previousClient })
	return "https://factory.test", &requests
}

func configureCloudFactory(t *testing.T, endpoint string) {
	t.Helper()
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("TICK_OWNER", "operator@example.com")

	config, err := cloudcredentials.LoadFrom(filepath.Join(home, cloudcredentials.FileName))
	if err != nil {
		t.Fatalf("load credentials: %v", err)
	}
	config.Set(cloudcredentials.KeyURL, endpoint)
	config.Set(cloudcredentials.KeyToken, "tkf_test-token")
	if err := config.Save(); err != nil {
		t.Fatalf("save credentials: %v", err)
	}
}

func setupCloudRepo(t *testing.T, withEpic bool) (repo, remote, sha string) {
	t.Helper()
	root := t.TempDir()
	repo = filepath.Join(root, "checkout")
	remote = filepath.Join(root, "acme", "project.git")
	if err := os.MkdirAll(filepath.Dir(remote), 0o755); err != nil {
		t.Fatalf("mkdir remote parent: %v", err)
	}
	execTestCmd(t, root, "git", "init", "--bare", remote)
	execTestCmd(t, root, "git", "init", repo)
	execTestCmd(t, repo, "git", "checkout", "-b", "main")
	execTestCmd(t, repo, "git", "config", "user.email", "operator@example.com")
	execTestCmd(t, repo, "git", "config", "user.name", "Operator")
	execTestCmd(t, repo, "git", "remote", "add", "origin", "file://"+remote)
	if err := os.WriteFile(filepath.Join(repo, "README.md"), []byte("cloud test\n"), 0o644); err != nil {
		t.Fatalf("write README: %v", err)
	}
	execTestCmd(t, repo, "git", "add", "README.md")
	execTestCmd(t, repo, "git", "commit", "-m", "base")
	execTestCmd(t, repo, "git", "push", "-u", "origin", "main")

	if withEpic {
		writeCloudEpic(t, repo, "epic1")
		execTestCmd(t, repo, "git", "add", ".tick")
		execTestCmd(t, repo, "git", "commit", "-m", "add epic")
		execTestCmd(t, repo, "git", "push", "origin", "main")
	}

	sha = strings.TrimSpace(string(execTestOutput(t, repo, "git", "rev-parse", "HEAD")))
	origDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("get working directory: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir to cloud repo: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(origDir) })
	return repo, remote, sha
}

func writeCloudEpic(t *testing.T, repo, id string) {
	t.Helper()
	writeCloudTickFixture(t, repo, cloudTickFixture{
		ID: id, Title: "Cloud test epic", Type: "epic",
		Owner: "operator", CreatedBy: "operator",
	})
}

// cloudTickFixture is the handful of fields a cloud test needs to seed a
// tick on disk. It exists so writeCloudTickFixture stays a plain literal at
// every call site instead of a long positional argument list.
type cloudTickFixture struct {
	ID        string
	Title     string
	Type      string
	Parent    string
	Owner     string
	CreatedBy string
}

// writeCloudTickFixture writes a tick fixture directly as the JSON document
// cloudReadTracker parses back out via `tk show`/`tk list --all` (cloud.go).
//
// It is a copy of what internal/tick's Store.Write does for these fields, not
// an import of it: Phase 1 already treats the tracker as a JSON contract for
// READS in cloud.go rather than importing internal/tick's Go API, and a test
// file in this package follows the same rule for writes, so that neither side
// of a cloud-command test depends on the tracker's internal Go types (5yk).
// Keep the field set in sync by hand with internal/tick.Tick's JSON tags if
// cloudReadTracker ever starts reading more of them.
func writeCloudTickFixture(t *testing.T, repo string, f cloudTickFixture) {
	t.Helper()
	if f.ID == "" {
		t.Fatalf("tick fixture is missing an id")
	}
	now := time.Now().UTC().Truncate(time.Second)
	doc := map[string]any{
		"id": f.ID, "title": f.Title, "status": "open", "priority": 2,
		"type": f.Type, "owner": f.Owner, "created_by": f.CreatedBy,
		"created_at": now, "updated_at": now,
	}
	if f.Parent != "" {
		doc["parent"] = f.Parent
	}
	data, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		t.Fatalf("encode tick fixture %s: %v", f.ID, err)
	}
	dir := filepath.Join(repo, ".tick", "issues")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("mkdir .tick/issues: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, f.ID+".json"), data, 0o644); err != nil {
		t.Fatalf("write tick fixture %s: %v", f.ID, err)
	}
}

func execTestOutput(t *testing.T, dir, name string, args ...string) []byte {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("command %s %v: %v\n%s", name, args, err, out)
	}
	return out
}

func TestCloudWithoutFactoryConfigurationNamesSetup(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	_, err := newCloudClient()
	if err == nil {
		t.Fatal("newCloudClient succeeded without a factory configured")
	}
	if !strings.Contains(err.Error(), "ticfac factory setup") {
		t.Fatalf("missing-factory error does not name setup: %v", err)
	}
}

// Igniting, stopping and inspecting a cloud run itself moved to ticfac
// (tick 3r2: 'ticfac cloud run|stop|status|logs|trace|supervisor'). What
// stays in `tk cloud` is exactly what a LOCAL orchestrator uses to drive
// cloud workers directly (D19) plus the in-run branch record (tick t4y) and
// the local git read `pr-body`.
func TestCloudExposesOnlyTheLocalOrchestratorVocabulary(t *testing.T) {
	want := map[string]bool{
		"branch": true, "spawn": true, "wait": true,
		"collect": true, "reconcile": true, "pr-body": true,
	}
	got := map[string]bool{}
	for _, command := range cloudCmd.Commands() {
		got[command.Name()] = true
	}
	for name := range want {
		if !got[name] {
			t.Errorf("tk cloud has no %s command", name)
		}
	}
	for name := range got {
		if !want[name] {
			t.Errorf("unexpected cloud command %q: run/stop/status/logs/trace/supervisor moved to ticfac (tick 3r2)", name)
		}
	}
}
