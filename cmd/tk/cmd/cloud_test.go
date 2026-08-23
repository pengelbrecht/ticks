package cmd

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
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

// D21 fixes the operator-to-orchestrator COMMAND vocabulary at run, stop,
// status and answer: no chat, no prompt injection, no mid-run mutation channel.
// Steering is stop -> edit the tracker -> run again.
//
// Two other kinds of command live under `tk cloud` and neither widens that
// vocabulary. Observation — `logs` reads what the container printed, `trace`
// reads what the model said — is read-only records of a run that has already
// happened, with no path from either to the orchestrator (tick l4l).
//
// DISPATCH is the second, and it is a different AXIS rather than a wider
// vocabulary (D19, tick bmo). `spawn`, `wait`, `collect` and `reconcile` are
// what an ORCHESTRATOR uses to drive its own workers — the same verbs
// `tk herd` exposes for herdr panes — and the cloud substrate is deliberately
// drivable from any orchestrator location, including a laptop. An operator
// typing them IS the orchestrator at that moment, exactly as they are when
// they type `tk herd spawn`; nothing here steers a run that is already
// orchestrating itself, and a Workflow-hosted run is untouched by them.
//
// The split is pinned here rather than left implicit, because a reader
// counting subcommands would otherwise conclude D21 had been violated.
func TestCloudExposesOnlyTheClosedCommandVocabulary(t *testing.T) {
	steering := map[string]bool{"run": true, "stop": true}
	observation := map[string]bool{"status": true, "logs": true, "trace": true}
	// The orchestrator's own hands (D19): dispatch, fan-in, verdict, recovery.
	dispatch := map[string]bool{"spawn": true, "wait": true, "collect": true, "reconcile": true}
	// The third kind: reads the checkout it is run in, prints, and touches no
	// factory at all. `pr-body` composes a closeout PR body from git — it
	// neither commands a run nor reads one, so it is outside D21 rather than an
	// addition to it. It still has to say so in its own help.
	local := map[string]bool{"pr-body": true}

	for _, command := range cloudCmd.Commands() {
		name := command.Name()
		if !steering[name] && !observation[name] && !dispatch[name] && !local[name] {
			t.Errorf("unexpected cloud command %q: it is neither a D21 verb, a D19 dispatch verb, a read-only observation, nor a local git read", name)
		}
		if (observation[name] || local[name]) && !strings.Contains(command.Long, "D21") {
			// Said in the help text, not just in a design doc: the next reader
			// of `tk cloud --help` counts the subcommands against a four-verb
			// vocabulary and needs the answer where they are looking.
			t.Errorf("cloud %s does not say why a non-steering command does not widen D21's vocabulary", name)
		}
		if dispatch[name] && !strings.Contains(command.Long, "D19") {
			t.Errorf("cloud %s does not say it is a D19 dispatch verb — the one thing that distinguishes it from steering a run", name)
		}
	}
	if len(cloudCmd.Commands()) != len(steering)+len(observation)+len(dispatch)+len(local) {
		t.Fatalf("cloud commands = %d, want exactly %d", len(cloudCmd.Commands()),
			len(steering)+len(observation)+len(dispatch)+len(local))
	}

	// The half of the surface that COMMANDS A RUN is exactly D21's verbs, and
	// stays so. Dispatch verbs mutate too — a spawn starts containers — but
	// they are the orchestrator acting, never an operator steering an
	// orchestrator, which is the vocabulary D21 closes.
	mutating := []string{}
	for _, command := range cloudCmd.Commands() {
		if steering[command.Name()] {
			mutating = append(mutating, command.Name())
		}
	}
	sort.Strings(mutating)
	if strings.Join(mutating, ",") != "run,stop" {
		t.Fatalf("the mutating cloud vocabulary is %v; D21 fixes it at run and stop (answer lives on tk answer)", mutating)
	}
}

// The dispatch verbs mirror `tk herd`'s vocabulary on purpose: an orchestrator
// swapping substrates must not have to relearn its commands (D19). If one
// family grows a verb the other lacks, that promise has quietly lapsed.
func TestCloudDispatchVerbsMirrorTheHerdVocabulary(t *testing.T) {
	cloudVerbs := map[string]bool{}
	for _, command := range cloudCmd.Commands() {
		cloudVerbs[command.Name()] = true
	}
	herdVerbs := map[string]bool{}
	for _, command := range herdCmd.Commands() {
		herdVerbs[command.Name()] = true
	}
	for _, verb := range []string{"spawn", "wait", "collect", "reconcile"} {
		if !cloudVerbs[verb] {
			t.Errorf("tk cloud has no %s verb; the cloud substrate is not drivable by a local orchestrator without it", verb)
		}
		if !herdVerbs[verb] {
			t.Errorf("tk herd has no %s verb; the two families no longer mirror each other", verb)
		}
	}
}

// The image a run booted is the difference between "the fix did not work" and
// "the fix was never running" (tick z1b). A single-run status has to say which
// container the run executed.
func TestCloudStatusNamesTheImageTheRunBooted(t *testing.T) {
	setupCloudRepo(t, true)
	digest := "sha256:" + strings.Repeat("b", 64)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method == http.MethodGet && request.Path == "/api/runs/run_live" {
			return http.StatusOK, map[string]any{
				"run":   map[string]any{"run_id": "run_live", "state": "running", "epic": "epic1"},
				"image": map[string]any{"image_ref": "registry.example.com/acct/ticks-orchestrator@" + digest, "image_digest": digest},
			}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	configureCloudFactory(t, endpoint)

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "status", "run_live"}); err != nil {
		t.Fatalf("cloud status run_live: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), digest) {
		t.Errorf("status does not name the image the run booted:\n%s", buf.String())
	}
}

// A run that exited 0 having changed nothing is not a completion (tick ehy).
// The state carries the distinction and status has to make it legible, or an
// operator resubmits an epic believing the last run advanced it.
func TestCloudStatusDistinguishesAStoppedNoOpFromACompletion(t *testing.T) {
	setupCloudRepo(t, true)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		switch request.Path {
		case "/api/runs/run_noop":
			return http.StatusOK, map[string]any{
				"run": map[string]any{"run_id": "run_noop", "state": "stopped", "epic": "epic1"},
				"progress": map[string]any{
					"progress": "none",
					"detail":   "no branch on origin changed while the run was alive",
				},
			}
		case "/api/runs/run_real":
			return http.StatusOK, map[string]any{
				"run": map[string]any{"run_id": "run_real", "state": "completed", "epic": "epic1"},
				"progress": map[string]any{
					"progress": "advanced",
					"detail":   "1 branch on origin changed while the run was alive (epic/epic1)",
				},
			}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	configureCloudFactory(t, endpoint)

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "status", "run_noop"}); err != nil {
		t.Fatalf("cloud status run_noop: %v\n%s", err, buf.String())
	}
	noop := buf.String()
	if !strings.Contains(noop, "state: stopped") {
		t.Errorf("a run that did nothing is not reported as stopped:\n%s", noop)
	}
	if !strings.Contains(noop, "progress: none") {
		t.Errorf("status does not say the run changed nothing:\n%s", noop)
	}
	if !strings.Contains(noop, "no branch on origin changed") {
		t.Errorf("status does not say why the run changed nothing:\n%s", noop)
	}

	buf = captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "status", "run_real"}); err != nil {
		t.Fatalf("cloud status run_real: %v\n%s", err, buf.String())
	}
	real := buf.String()
	if !strings.Contains(real, "state: completed") || !strings.Contains(real, "progress: advanced") {
		t.Errorf("a run that advanced the epic is not reported as such:\n%s", real)
	}
}

// A run finalized before durable-evidence finalization existed has no verdict.
// Silence would read as "advanced", which is the assumption this whole change
// exists to remove.
func TestCloudStatusSaysWhenNoProgressVerdictWasRecorded(t *testing.T) {
	setupCloudRepo(t, true)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Path == "/api/runs/run_legacy" {
			return http.StatusOK, map[string]any{
				"run": map[string]any{"run_id": "run_legacy", "state": "completed", "epic": "epic1"},
			}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	configureCloudFactory(t, endpoint)

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "status", "run_legacy"}); err != nil {
		t.Fatalf("cloud status run_legacy: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), "progress: unrecorded") {
		t.Errorf("status is silent about the missing progress verdict:\n%s", buf.String())
	}
}

// A live run has no verdict yet, and saying "unrecorded" about one still
// working would be noise rather than a fact.
func TestCloudStatusIsSilentAboutProgressForALiveRun(t *testing.T) {
	setupCloudRepo(t, true)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Path == "/api/runs/run_live" {
			return http.StatusOK, map[string]any{
				"run": map[string]any{"run_id": "run_live", "state": "running", "epic": "epic1"},
			}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	configureCloudFactory(t, endpoint)

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "status", "run_live"}); err != nil {
		t.Fatalf("cloud status run_live: %v\n%s", err, buf.String())
	}
	if strings.Contains(buf.String(), "progress:") {
		t.Errorf("status reports a progress verdict for a run still working:\n%s", buf.String())
	}
}

// A run with no recorded image says so. Omitting the line would read as "the
// same image as every other run", which is the assumption that cost the
// diagnose-fix-deploy cycles this exists to prevent.
func TestCloudStatusSaysWhenNoImageWasRecorded(t *testing.T) {
	setupCloudRepo(t, true)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method == http.MethodGet && request.Path == "/api/runs/run_old" {
			return http.StatusOK, map[string]any{
				"run": map[string]any{"run_id": "run_old", "state": "completed", "epic": "epic1"},
			}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	configureCloudFactory(t, endpoint)

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "status", "run_old"}); err != nil {
		t.Fatalf("cloud status run_old: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), "image: unrecorded") {
		t.Errorf("status is silent about the missing image:\n%s", buf.String())
	}
}

// TestCloudStopNowAsksForAHardStopAndSaysWhichItPerformed pins tick gyl's
// operator-facing half: `--now` must reach the factory as a hard stop, and the
// output must say which stop happened rather than leaving an operator to
// assume the one they asked for is the one they got.
func TestCloudStopNowAsksForAHardStopAndSaysWhichItPerformed(t *testing.T) {
	setupCloudRepo(t, true)
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method == http.MethodPost && request.Path == "/api/runs/run_live/stop" {
			mode, _ := request.Body["mode"].(string)
			return http.StatusOK, map[string]any{
				"run":            map[string]any{"run_id": "run_live", "state": "stopping"},
				"mode":           mode,
				"tokens_revoked": 1,
			}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	configureCloudFactory(t, endpoint)

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "stop", "run_live", "--now"}); err != nil {
		t.Fatalf("cloud stop --now: %v\n%s", err, buf.String())
	}
	if got := (*requests)[0].Body["mode"]; got != "hard" {
		t.Fatalf("stop mode = %#v, want hard", got)
	}
	out := buf.String()
	if !strings.Contains(out, "hard stop") {
		t.Fatalf("--now output does not say a hard stop was performed:\n%s", out)
	}
	if !strings.Contains(out, "gateway credentials revoked: 1") {
		t.Fatalf("--now output does not report the revocation:\n%s", out)
	}

	// The default is still the clean stop, and says so — including how to ask
	// for the other one.
	buf.Reset()
	if err := ExecuteArgs([]string{"cloud", "stop", "run_live"}); err != nil {
		t.Fatalf("cloud stop: %v\n%s", err, buf.String())
	}
	if got := (*requests)[1].Body["mode"]; got != "clean" {
		t.Fatalf("default stop mode = %#v, want clean", got)
	}
	clean := buf.String()
	if !strings.Contains(clean, "clean stop") || !strings.Contains(clean, "--now") {
		t.Fatalf("clean stop output does not name the hard variant:\n%s", clean)
	}
}

// A budget is a per-invocation choice, not a redeploy. The flags ride the
// submit payload; the deployment ceiling still bounds them on the far side.
func TestCloudRunCarriesPerRunBudgetOverridesInTheSubmission(t *testing.T) {
	setupCloudRepo(t, true)
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method != http.MethodPost || request.Path != "/api/runs" {
			return http.StatusNotFound, map[string]any{"error": "not_found"}
		}
		return http.StatusCreated, map[string]any{"run": map[string]any{"run_id": "run_bounded"}}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "run", "epic1", "--max-cost", "2.50", "--max-wall-clock", "45m"}); err != nil {
		t.Fatalf("bounded cloud run: %v", err)
	}
	body := (*requests)[0].Body
	if got := body["max_cost_usd"]; got != 2.5 {
		t.Errorf("max_cost_usd = %#v, want 2.5", got)
	}
	if got := body["max_wall_clock_ms"]; got != float64(2_700_000) {
		t.Errorf("max_wall_clock_ms = %#v, want 2700000", got)
	}

	// Without the flags the submission carries no budget at all, so the
	// deployment's own ceiling stands rather than being restated by the CLI.
	ResetFlags()
	if err := ExecuteArgs([]string{"cloud", "run", "epic1"}); err != nil {
		t.Fatalf("unbounded cloud run: %v", err)
	}
	plain := (*requests)[1].Body
	if _, ok := plain["max_cost_usd"]; ok {
		t.Errorf("submission carries max_cost_usd with no flag set: %#v", plain["max_cost_usd"])
	}
	if _, ok := plain["max_wall_clock_ms"]; ok {
		t.Errorf("submission carries max_wall_clock_ms with no flag set: %#v", plain["max_wall_clock_ms"])
	}
}

// tick 7zk. The operator asked for --max-cost 40 and got $8, because the
// deployment's RUN_MAX_COST_USD was 8 and a submission may only lower a budget.
// The policy is right; the silence was not. The number that will actually
// govern has to appear at the moment the flag is typed, not in the cancellation
// that ends the run — the third time in one epic a deployment ceiling replaced
// an operator's number with no line anywhere saying so.
func TestCloudRunPrintsTheEffectiveBudgetItWillActuallyRunUnder(t *testing.T) {
	setupCloudRepo(t, true)
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method != http.MethodPost || request.Path != "/api/runs" {
			return http.StatusNotFound, map[string]any{"error": "not_found"}
		}
		return http.StatusCreated, map[string]any{
			"run": map[string]any{"run_id": "run_clamped", "state": "starting"},
			"budget": map[string]any{
				"max_cost_usd":                8,
				"max_wall_clock_ms":           14_400_000,
				"requested_max_cost_usd":      40,
				"requested_max_wall_clock_ms": nil,
				"cost_clamped":                true,
				"wall_clock_clamped":          false,
			},
		}
	})
	configureCloudFactory(t, endpoint)
	out := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "run", "epic1", "--max-cost", "40"}); err != nil {
		t.Fatalf("cloud run: %v", err)
	}
	printed := out.String()
	// The number that governs.
	if !strings.Contains(printed, "cost budget: $8.00") {
		t.Errorf("the effective cost budget is not printed:\n%s", printed)
	}
	if !strings.Contains(printed, "wall-clock budget: 4h0m0s") {
		t.Errorf("the effective wall-clock budget is not printed:\n%s", printed)
	}
	// And that it is not the number that was asked for.
	if !strings.Contains(printed, "--max-cost $40.00 was lowered") {
		t.Errorf("the clamp is not reported:\n%s", printed)
	}
}

// A factory deployed before the budget was reported answers without it. Saying
// "$0.00" there would be worse than saying nothing.
func TestCloudRunSaysNothingAboutABudgetTheFactoryDidNotReport(t *testing.T) {
	setupCloudRepo(t, true)
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusCreated, map[string]any{"run": map[string]any{"run_id": "run_old"}}
	})
	configureCloudFactory(t, endpoint)
	out := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "run", "epic1"}); err != nil {
		t.Fatalf("cloud run: %v", err)
	}
	if strings.Contains(out.String(), "budget") {
		t.Errorf("a budget line was invented for a factory that reported none:\n%s", out.String())
	}
}

func TestCloudRunRefusesANonPositiveBudgetBeforeSubmitting(t *testing.T) {
	setupCloudRepo(t, true)
	var calls int
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		calls++
		return http.StatusCreated, map[string]any{"run": map[string]any{"run_id": "run_should_not_start"}}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	for _, args := range [][]string{
		{"cloud", "run", "epic1", "--max-cost", "0"},
		{"cloud", "run", "epic1", "--max-wall-clock", "-5m"},
	} {
		ResetFlags()
		err := ExecuteArgs(args)
		if err == nil {
			t.Fatalf("%v was accepted, want a refusal", args)
		}
		if !strings.Contains(err.Error(), "positive") {
			t.Errorf("%v error does not say the budget must be positive: %v", args, err)
		}
	}
	if calls != 0 {
		t.Fatalf("factory received %d submission(s) after an invalid budget", calls)
	}
}

// --tick-ids is the CLI's only route to the per-tick-container path (tick
// pjq): before it, `tick_ids` was reachable from `tk cloud spawn` — the LOCAL
// orchestrator's verb — or by POSTing to /api/runs by hand, so an operator
// igniting a cloud-orchestrated run could not ask for a wave at all.
func TestCloudRunTickIDsCarryTheWaveIntoTheSubmission(t *testing.T) {
	setupCloudWaveRepo(t, "cloud", "aaa", "bbb")
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method != http.MethodPost || request.Path != "/api/runs" {
			return http.StatusNotFound, map[string]any{"error": "not_found"}
		}
		return http.StatusCreated, map[string]any{
			"run": map[string]any{"run_id": "run_wave", "state": "starting"},
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "run", "epic1", "--tick-ids", "aaa,bbb"}); err != nil {
		t.Fatalf("cloud run --tick-ids: %v\n%s", err, buf.String())
	}
	if len(*requests) != 1 {
		t.Fatalf("factory received %d request(s), want one", len(*requests))
	}
	body := (*requests)[0].Body
	wave, ok := body["tick_ids"].([]any)
	if !ok {
		t.Fatalf("submission tick_ids = %#v, want the wave", body["tick_ids"])
	}
	if len(wave) != 2 || wave[0] != "aaa" || wave[1] != "bbb" {
		t.Errorf("submission tick_ids = %#v, want [aaa bbb]", wave)
	}
	if got := body["queue"]; got != false {
		t.Errorf("submission queue = %#v, want false", got)
	}
	if out := buf.String(); !strings.Contains(out, "run_wave") ||
		!strings.Contains(out, "aaa") || !strings.Contains(out, "bbb") {
		t.Errorf("output does not report the dispatched wave:\n%s", out)
	}
}

// A plain `tk cloud run` must stay a Phase 1 submission: no empty wave field
// that the factory would have to interpret.
func TestCloudRunWithoutTickIDsSubmitsNoWave(t *testing.T) {
	setupCloudRepo(t, true)
	endpoint, requests := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusCreated, map[string]any{"run": map[string]any{"run_id": "run_plain"}}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "run", "epic1"}); err != nil {
		t.Fatalf("cloud run: %v", err)
	}
	if _, ok := (*requests)[0].Body["tick_ids"]; ok {
		t.Errorf("submission carries tick_ids with no flag set: %#v", (*requests)[0].Body["tick_ids"])
	}
}

// The factory refuses queue+tick_ids with a 400 because the RunRoom's queued
// submission has no tick_ids column and would lose the wave on ignition. The
// CLI says so itself, before a push and before the network, rather than
// letting the operator meet it as an HTTP error.
func TestCloudRunRefusesTickIDsWithQueue(t *testing.T) {
	repo, _, sha := setupCloudWaveRepo(t, "cloud", "aaa")
	var calls int
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		calls++
		return http.StatusCreated, map[string]any{"run": map[string]any{"run_id": "run_should_not_start"}}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)
	execTestCmd(t, repo, "git", "commit", "--allow-empty", "-m", "unpushed change")

	err := ExecuteArgs([]string{"cloud", "run", "epic1", "--tick-ids", "aaa", "--queue"})
	if err == nil {
		t.Fatal("cloud run accepted --tick-ids together with --queue")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
	for _, want := range []string{"--tick-ids", "--queue"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("refusal %q does not name %s", err.Error(), want)
		}
	}
	if calls != 0 {
		t.Fatalf("factory received %d submission(s) for a combination it refuses", calls)
	}
	remote := strings.Fields(string(execTestOutput(t, repo, "git", "ls-remote", "origin", "refs/heads/main")))[0]
	if remote != sha {
		t.Errorf("origin/main = %s, want %s: the refusal cost a push", remote, sha)
	}
}

// The same wave checks `tk cloud spawn` makes, for the same reason: a worker
// container clones at the epic's base, so a tick from another epic would be
// implemented against a base its own epic never chose. Refused locally, before
// anything is pushed.
func TestCloudRunRefusesAnUnusableWaveBeforeSubmitting(t *testing.T) {
	repo, _, _ := setupCloudWaveRepo(t, "cloud", "aaa")
	writeCloudEpic(t, repo, "epic2")
	writeCloudTick(t, repo, "ccc", "epic2")
	execTestCmd(t, repo, "git", "add", "-A")
	execTestCmd(t, repo, "git", "commit", "-m", "second epic")
	execTestCmd(t, repo, "git", "push", "origin", "main")

	var calls int
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		calls++
		return http.StatusCreated, map[string]any{"run": map[string]any{"run_id": "run_should_not_start"}}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	for name, tc := range map[string]struct {
		args []string
		want string
	}{
		"duplicate":    {[]string{"cloud", "run", "epic1", "--tick-ids", "aaa,aaa"}, "more than once"},
		"unknown tick": {[]string{"cloud", "run", "epic1", "--tick-ids", "zzz"}, "zzz"},
		"another epic": {[]string{"cloud", "run", "epic1", "--tick-ids", "ccc"}, "epic1"},
		"blank only":   {[]string{"cloud", "run", "epic1", "--tick-ids", " "}, "--tick-ids"},
	} {
		ResetFlags()
		err := ExecuteArgs(tc.args)
		if err == nil {
			t.Fatalf("%s: %v was accepted, want a refusal", name, tc.args)
		}
		if !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: refusal %q does not mention %q", name, err.Error(), tc.want)
		}
	}
	if calls != 0 {
		t.Fatalf("factory received %d submission(s) for an unusable wave", calls)
	}
}
