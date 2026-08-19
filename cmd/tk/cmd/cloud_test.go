package cmd

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

type cloudFactoryRequest struct {
	Method string
	Path   string
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
		request := cloudFactoryRequest{Method: r.Method, Path: r.URL.Path, Auth: r.Header.Get("Authorization")}
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

	config, err := ticksrc.LoadFrom(filepath.Join(home, ticksrc.FileName))
	if err != nil {
		t.Fatalf("load ticksrc: %v", err)
	}
	config.Set(ticksrc.KeyFactoryURL, endpoint)
	config.Set(ticksrc.KeyFactoryToken, "tkf_test-token")
	if err := config.Save(); err != nil {
		t.Fatalf("save ticksrc: %v", err)
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
	now := time.Now().UTC().Truncate(time.Second)
	store := tick.NewStore(filepath.Join(repo, ".tick"))
	if err := store.Write(tick.Tick{
		ID:        id,
		Title:     "Cloud test epic",
		Status:    tick.StatusOpen,
		Priority:  2,
		Type:      tick.TypeEpic,
		Owner:     "operator",
		CreatedBy: "operator",
		CreatedAt: now,
		UpdatedAt: now,
	}); err != nil {
		t.Fatalf("write cloud epic: %v", err)
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

func TestCloudRunRejectsAnUnpushedEpicBeforeSubmitting(t *testing.T) {
	repo, _, _ := setupCloudRepo(t, false)
	writeCloudEpic(t, repo, "epic1")

	var calls int
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		calls++
		return http.StatusCreated, map[string]any{"run": map[string]any{"run_id": "run_should_not_start"}}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "run", "epic1"})
	if err == nil {
		t.Fatal("cloud run accepted an epic whose tick file was not pushed")
	}
	if !strings.Contains(err.Error(), "epic1") || !strings.Contains(strings.ToLower(err.Error()), "push") {
		t.Fatalf("error does not explain how to publish the epic: %v", err)
	}
	if calls != 0 {
		t.Fatalf("factory received %d submission(s) after the local push check failed", calls)
	}
}

func TestCloudRunPushesAndSubmitsThePinnedCommit(t *testing.T) {
	repo, _, baseSHA := setupCloudRepo(t, true)
	execTestCmd(t, repo, "git", "commit", "--allow-empty", "-m", "local change")
	localSHA := strings.TrimSpace(string(execTestOutput(t, repo, "git", "rev-parse", "HEAD")))

	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method != http.MethodPost || request.Path != "/api/runs" {
			return http.StatusNotFound, map[string]any{"error": "not_found"}
		}
		return http.StatusCreated, map[string]any{
			"run":      map[string]any{"run_id": "run_started", "state": "starting"},
			"workflow": map[string]any{"id": "run_started", "status": "running"},
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "run", "epic1", "--notify", "telegram"}); err != nil {
		t.Fatalf("cloud run: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), "run_started") {
		t.Fatalf("cloud run did not print the run id:\n%s", buf.String())
	}
	if len(*requests) != 1 {
		t.Fatalf("factory received %d request(s), want one", len(*requests))
	}
	request := (*requests)[0]
	if request.Auth != "Bearer tkf_test-token" {
		t.Errorf("authorization = %q", request.Auth)
	}
	for field, want := range map[string]any{
		"project":      "acme/project",
		"epic":         "epic1",
		"base_sha":     localSHA,
		"requested_by": "operator@example.com",
		"notify":       "telegram",
	} {
		if got := request.Body[field]; got != want {
			t.Errorf("request %s = %#v, want %#v", field, got, want)
		}
	}
	remoteSHA := strings.Fields(string(execTestOutput(t, repo, "git", "ls-remote", "origin", "refs/heads/main")))[0]
	if remoteSHA != localSHA {
		t.Errorf("remote branch = %s, want pushed HEAD %s (base was %s)", remoteSHA, localSHA, baseSHA)
	}
}

func TestCloudRunNamesLeaseHolderAndQueueIsOptIn(t *testing.T) {
	setupCloudRepo(t, true)
	var submissions int
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Path != "/api/runs" {
			return http.StatusNotFound, map[string]any{"error": "not_found"}
		}
		submissions++
		switch submissions {
		case 1:
			return http.StatusCreated, map[string]any{"run": map[string]any{"run_id": "run_holder", "state": "starting"}}
		case 2:
			return http.StatusConflict, map[string]any{
				"error":  "lease_held",
				"detail": "project is already running",
				"holder": map[string]any{"run_id": "run_holder", "epic": "epic1"},
			}
		default:
			return http.StatusAccepted, map[string]any{
				"queued": map[string]any{"run_id": "run_queued", "blocked_by": "run_holder"},
				"holder": map[string]any{"run_id": "run_holder"},
			}
		}
	})
	configureCloudFactory(t, endpoint)

	if err := ExecuteArgs([]string{"cloud", "run", "epic1"}); err != nil {
		t.Fatalf("first cloud run: %v", err)
	}
	err := ExecuteArgs([]string{"cloud", "run", "epic1"})
	if err == nil || !strings.Contains(err.Error(), "run_holder") {
		t.Fatalf("lease refusal = %v, want holder run id", err)
	}
	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "run", "epic1", "--queue"}); err != nil {
		t.Fatalf("queued cloud run: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), "run_queued") || !strings.Contains(buf.String(), "run_holder") {
		t.Fatalf("queue output does not identify the parked run and holder:\n%s", buf.String())
	}
	if got := (*requests)[1].Body["queue"]; got != false {
		t.Errorf("refused submission queue = %#v, want false", got)
	}
	if got := (*requests)[2].Body["queue"]; got != true {
		t.Errorf("queued submission queue = %#v, want true", got)
	}
}

func TestCloudStopAndStatusUseTheFactoryRunSurface(t *testing.T) {
	setupCloudRepo(t, true)
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		switch {
		case request.Method == http.MethodPost && request.Path == "/api/runs":
			return http.StatusCreated, map[string]any{"run": map[string]any{"run_id": "run_live", "state": "starting"}}
		case request.Method == http.MethodPost && request.Path == "/api/runs/run_live/stop":
			return http.StatusOK, map[string]any{"run": map[string]any{"run_id": "run_live", "state": "stopping"}}
		case request.Method == http.MethodGet && request.Path == "/api/runs":
			return http.StatusOK, map[string]any{
				"runs":     []any{map[string]any{"run_id": "run_live", "state": "stopping", "epic": "epic1"}},
				"projects": []any{map[string]any{"project": "acme/project", "lease": map[string]any{"run_id": "run_live"}}},
			}
		default:
			return http.StatusNotFound, map[string]any{"error": "not_found"}
		}
	})
	configureCloudFactory(t, endpoint)

	if err := ExecuteArgs([]string{"cloud", "run", "epic1"}); err != nil {
		t.Fatalf("cloud run: %v", err)
	}
	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "stop", "run_live"}); err != nil {
		t.Fatalf("cloud stop: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), "run_live") || !strings.Contains(buf.String(), "stopping") {
		t.Fatalf("stop output lacks run and state:\n%s", buf.String())
	}
	if err := ExecuteArgs([]string{"cloud", "status"}); err != nil {
		t.Fatalf("cloud status: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), "run_live") || !strings.Contains(buf.String(), "stopping") {
		t.Fatalf("status output lacks live run:\n%s", buf.String())
	}
	if len(*requests) != 3 || (*requests)[1].Path != "/api/runs/run_live/stop" || (*requests)[2].Path != "/api/runs" {
		t.Fatalf("factory requests = %#v, want run, stop, status", *requests)
	}
	if (*requests)[1].Auth != "Bearer tkf_test-token" || (*requests)[2].Auth != "Bearer tkf_test-token" {
		t.Errorf("stop/status did not use the factory bearer token")
	}
}

func TestCloudWithoutFactoryConfigurationNamesSetup(t *testing.T) {
	setupCloudRepo(t, false)
	t.Setenv("HOME", t.TempDir())
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "status"})
	if err == nil {
		t.Fatal("cloud status succeeded without a factory")
	}
	if !strings.Contains(err.Error(), "tk factory setup") {
		t.Fatalf("missing-factory error does not name setup: %v", err)
	}
}

func TestCloudExposesOnlyTheClosedCommandVocabulary(t *testing.T) {
	want := map[string]bool{"run": true, "stop": true, "status": true}
	commands := cloudCmd.Commands()
	if len(commands) != len(want) {
		t.Fatalf("cloud commands = %d, want exactly %d", len(commands), len(want))
	}
	for _, command := range commands {
		if !want[command.Name()] {
			t.Errorf("unexpected cloud command %q", command.Name())
		}
	}
}
