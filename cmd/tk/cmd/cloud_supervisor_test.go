package cmd

import (
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// `tk cloud supervisor` is Phase 2's rule made reachable: a supervisor cannot
// report its own death, because the run record is written BY the thing that may
// be gone. Both of Phase 2's worst defects — the ten-minute step cap (2xm) and
// the lapsed dispatch lease (7n7) — were found by curling Cloudflare's Workflow
// instance API, because nothing in tk could answer it.

type cloudflareRoundTripper func(*http.Request) (*http.Response, error)

func (f cloudflareRoundTripper) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// configureCloudflareAPI wires the operator's Cloudflare credentials into the
// ~/.ticksrc `configureCloudFactory` just wrote, and answers the Workflows API
// through a transport rather than a listener (a worker sandbox blocks loopback).
func configureCloudflareAPI(t *testing.T, handler func(*http.Request) (int, string)) *[]string {
	t.Helper()
	home := t.TempDir()
	t.Setenv("HOME", home)
	config, err := ticksrc.LoadFrom(filepath.Join(home, ticksrc.FileName))
	if err != nil {
		t.Fatalf("load ticksrc: %v", err)
	}
	config.Set(ticksrc.KeyFactoryURL, "https://factory.test")
	config.Set(ticksrc.KeyFactoryToken, "tkf_test-token")
	config.Set(ticksrc.KeyFactoryGatewayURL, "https://gateway.ai.cloudflare.com/v1/acct-test/ticks")
	config.Set(ticksrc.KeyFactoryCloudflareAPIToken, "cfut_test")
	if err := config.Save(); err != nil {
		t.Fatalf("save ticksrc: %v", err)
	}

	var mu sync.Mutex
	paths := make([]string, 0, 2)
	previous := cloudflareHTTPClient
	cloudflareHTTPClient = &http.Client{Transport: cloudflareRoundTripper(func(r *http.Request) (*http.Response, error) {
		mu.Lock()
		paths = append(paths, r.URL.Path)
		mu.Unlock()
		status, body := handler(r)
		return &http.Response{
			StatusCode: status,
			Status:     http.StatusText(status),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body:       io.NopCloser(strings.NewReader(body)),
			Request:    r,
		}, nil
	})}
	t.Cleanup(func() { cloudflareHTTPClient = previous })
	return &paths
}

// 2xm, as the API actually answers it. `cloud:credential` carries a live
// gateway token in its `output`; it is here so the test can prove nothing
// prints it.
const erroredInstance = `{"success": true, "errors": [], "result": {
  "queued": "2026-08-22T13:22:51Z", "start": "2026-08-22T13:22:53Z", "end": "2026-08-22T13:42:57Z",
  "success": false, "error": {"message": "Execution timed out after 600000ms", "name": "Error"},
  "status": "errored", "step_count": 2,
  "steps": [
    {"name": "cloud:credential:0-1", "start": "2026-08-22T13:22:55Z", "end": "2026-08-22T13:22:55Z",
     "attempts": [{"start": "2026-08-22T13:22:55Z", "end": "2026-08-22T13:22:55Z", "success": true, "error": null}],
     "output": "{\"token\":\"tkr_deadbeefdeadbeefdeadbeef\"}", "success": true, "type": "step"},
    {"name": "cloud:dispatch:0-1", "start": "2026-08-22T13:22:55Z", "end": "2026-08-22T13:42:57Z",
     "attempts": [
       {"start": "2026-08-22T13:22:55Z", "end": "2026-08-22T13:32:55Z", "success": false,
        "error": {"name": "WorkflowTimeoutError", "message": "Execution timed out after 600000ms"}},
       {"start": "2026-08-22T13:32:57Z", "end": "2026-08-22T13:42:57Z", "success": false,
        "error": {"name": "WorkflowTimeoutError", "message": "Execution timed out after 600000ms"}}],
     "output": null, "success": false, "type": "step"}]}}`

func TestCloudSupervisorReportsTheDeathTheRunRecordCannot(t *testing.T) {
	setupCloudRepo(t, false)
	// The run record's own claim: still running, hours after its supervisor died.
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{
			"run":   map[string]any{"run_id": "run_2xm", "state": "running", "project": "acme/project"},
			"phase": map[string]any{"state": "running"},
		}
	})
	configureCloudFactory(t, endpoint)
	paths := configureCloudflareAPI(t, func(*http.Request) (int, string) {
		return http.StatusOK, erroredInstance
	})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "supervisor", "run_2xm"}); err != nil {
		t.Fatalf("cloud supervisor: %v\n%s", err, buf.String())
	}
	output := buf.String()
	for _, want := range []string{
		"errored",
		"Execution timed out after 600000ms",
		"cloud:dispatch:0-1",
		"DISAGREEMENT",
		"per-step EXECUTION cap",
	} {
		if !strings.Contains(output, want) {
			t.Errorf("the report does not carry %q:\n%s", want, output)
		}
	}
	// A step's output is its return value, and one of them is a credential.
	if strings.Contains(output, "tkr_") {
		t.Fatalf("the supervisor report printed a run gateway token:\n%s", output)
	}
	if len(*paths) != 1 || !strings.HasSuffix((*paths)[0], "/workflows/ticks-run/instances/run_2xm") {
		t.Errorf("the Workflows instance was not the thing read: %v", *paths)
	}
}

// A healthy run is reported as healthy, and says which step it is on — the
// other half of "is this run actually running".
func TestCloudSupervisorNamesTheStepALiveRunIsOn(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{"run": map[string]any{"run_id": "run_live", "state": "running"}}
	})
	configureCloudFactory(t, endpoint)
	configureCloudflareAPI(t, func(*http.Request) (int, string) {
		return http.StatusOK, `{"success": true, "errors": [], "result": {
          "status": "running", "start": "2026-08-24T09:00:01Z", "end": null, "step_count": 1,
          "steps": [{"name": "cloud:dispatch:0-1", "start": "2026-08-24T09:00:04Z", "end": null,
                     "attempts": [], "success": null, "type": "step"}]}}`
	})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "supervisor", "run_live"}); err != nil {
		t.Fatalf("cloud supervisor: %v\n%s", err, buf.String())
	}
	output := buf.String()
	if !strings.Contains(output, "cloud:dispatch:0-1") || !strings.Contains(output, "in flight") {
		t.Errorf("a live run's current step was not reported:\n%s", output)
	}
	if strings.Contains(output, "DISAGREEMENT") {
		t.Errorf("a healthy run was reported as a contradiction:\n%s", output)
	}
}

// The command exists so nobody needs the Cloudflare API by hand — so when the
// credential for it is missing, it has to name the way to install one rather
// than fail obscurely.
func TestCloudSupervisorSaysHowToInstallTheCredential(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{}
	})
	configureCloudFactory(t, endpoint)
	// A configured factory always has a gateway URL — that rung is required to
	// make a model call at all. The Cloudflare API token is the optional one,
	// so it is the one an operator is actually missing here.
	home := t.TempDir()
	t.Setenv("HOME", home)
	config, err := ticksrc.LoadFrom(filepath.Join(home, ticksrc.FileName))
	if err != nil {
		t.Fatalf("load ticksrc: %v", err)
	}
	config.Set(ticksrc.KeyFactoryURL, endpoint)
	config.Set(ticksrc.KeyFactoryToken, "tkf_test-token")
	config.Set(ticksrc.KeyFactoryGatewayURL, "https://gateway.ai.cloudflare.com/v1/acct-test/ticks")
	if err := config.Save(); err != nil {
		t.Fatalf("save ticksrc: %v", err)
	}
	buf := captureCmdOutput(t)

	err = ExecuteArgs([]string{"cloud", "supervisor", "run_nocred"})
	if err == nil {
		t.Fatalf("a factory with no Cloudflare API token answered anyway:\n%s", buf.String())
	}
	if !strings.Contains(err.Error(), "--cloudflare-api-token") {
		t.Errorf("the refusal does not say how to install the credential: %v", err)
	}
}

// --steps prints the trail, which is what told 7n7 apart: fifteen dispatch legs
// with no lease step between them.
func TestCloudSupervisorPrintsTheStepTrail(t *testing.T) {
	setupCloudRepo(t, false)
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusOK, map[string]any{"run": map[string]any{"run_id": "run_7n7", "state": "stopped"}}
	})
	configureCloudFactory(t, endpoint)
	configureCloudflareAPI(t, func(*http.Request) (int, string) {
		return http.StatusOK, `{"success": true, "errors": [], "result": {
          "status": "complete", "step_count": 3,
          "steps": [
            {"name": "cloud:dispatch:0-1", "start": "2026-08-23T00:30:35Z", "end": "2026-08-23T00:40:35Z",
             "attempts": [{"start": "2026-08-23T00:30:35Z", "end": "2026-08-23T00:40:35Z", "success": true, "error": null}],
             "success": true, "type": "step"},
            {"name": "wave:1:wait:1:0-1", "start": "2026-08-23T01:51:01Z", "end": "2026-08-23T01:51:16Z",
             "finished": true, "type": "sleep", "error": null},
            {"name": "wave:1:lease:1-1", "start": "2026-08-23T01:51:16Z", "end": "2026-08-23T01:51:17Z",
             "attempts": [{"start": "2026-08-23T01:51:16Z", "end": "2026-08-23T01:51:17Z", "success": false,
                           "error": {"name": "Error", "message": "the dispatch lease was lost"}}],
             "success": false, "type": "step"}]}}`
	})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "supervisor", "run_7n7", "--steps", "3"}); err != nil {
		t.Fatalf("cloud supervisor --steps: %v\n%s", err, buf.String())
	}
	output := buf.String()
	for _, want := range []string{"cloud:dispatch:0-1", "wave:1:wait:1:0-1", "wave:1:lease:1-1", "the dispatch lease was lost"} {
		if !strings.Contains(output, want) {
			t.Errorf("the trail does not carry %q:\n%s", want, output)
		}
	}
	if !strings.Contains(output, "slept") {
		t.Errorf("a sleep step was not reported as one:\n%s", output)
	}
}
