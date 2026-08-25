package factory

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"reflect"
	"strings"
	"testing"
)

// A supervisor cannot report its own death (`.tick/learnings.md`, ticks 2xm and
// 7n7): the run record is written BY the Workflow that may be gone. These tests
// pin the reader that answers the question from OUTSIDE it, against the shapes
// Cloudflare's Workflows API actually returns — the errored instance below is
// 2xm's, transcribed from the live API with the account and the run id replaced.

const testGatewayURL = "https://gateway.ai.cloudflare.com/v1/acct-test/ticks"

type supervisorTransport func(*http.Request) (*http.Response, error)

func (f supervisorTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// supervisorAPI answers one canned body, and records what was asked for. No
// loopback listener: a worker sandbox blocks those, so the seam is the
// transport (`.tick/config.md`).
func supervisorAPI(t *testing.T, status int, body string) (*http.Client, *[]*http.Request) {
	t.Helper()
	seen := make([]*http.Request, 0, 1)
	client := &http.Client{Transport: supervisorTransport(func(r *http.Request) (*http.Response, error) {
		seen = append(seen, r)
		return &http.Response{
			StatusCode: status,
			Status:     http.StatusText(status),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body:       io.NopCloser(strings.NewReader(body)),
			Request:    r,
		}, nil
	})}
	return client, &seen
}

func supervisorOptions(client *http.Client) SupervisorOptions {
	return SupervisorOptions{
		HTTPClient:         client,
		CloudflareAPIBase:  "https://api.test/client/v4",
		GatewayURL:         testGatewayURL,
		CloudflareAPIToken: "cfut_test",
	}
}

// The 10-minute per-step execution cap, as the API reports it. `output` carries
// the run's live gateway token in the `cloud:credential` step — it is in this
// fixture on purpose, so the test can prove the reader never surfaces it.
const erroredInstanceBody = `{
  "success": true,
  "errors": [],
  "result": {
    "queued": "2026-08-22T13:22:51.007Z",
    "start": "2026-08-22T13:22:53.228Z",
    "end": "2026-08-22T13:42:57.380Z",
    "success": false,
    "error": {"message": "Execution timed out after 600000ms", "name": "Error"},
    "status": "errored",
    "step_count": 3,
    "steps": [
      {"name": "context-1", "start": "2026-08-22T13:22:53.296Z", "end": "2026-08-22T13:22:55.119Z",
       "attempts": [{"start": "2026-08-22T13:22:53.296Z", "end": "2026-08-22T13:22:55.119Z", "success": true, "error": null}],
       "output": "{\"ok\":true}", "success": true, "type": "step"},
      {"name": "cloud:credential:0-1", "start": "2026-08-22T13:22:55.286Z", "end": "2026-08-22T13:22:55.334Z",
       "attempts": [{"start": "2026-08-22T13:22:55.286Z", "end": "2026-08-22T13:22:55.334Z", "success": true, "error": null}],
       "output": "{\"token\":\"tkr_c2f5f9b6b78cef2c57b7c9b45111\"}", "success": true, "type": "step"},
      {"name": "cloud:dispatch:0-1", "start": "2026-08-22T13:22:55.380Z", "end": "2026-08-22T13:42:57.380Z",
       "attempts": [
         {"start": "2026-08-22T13:22:55.380Z", "end": "2026-08-22T13:32:55.380Z", "success": false,
          "error": {"name": "WorkflowTimeoutError", "message": "Execution timed out after 600000ms"}},
         {"start": "2026-08-22T13:32:57.380Z", "end": "2026-08-22T13:42:57.380Z", "success": false,
          "error": {"name": "WorkflowTimeoutError", "message": "Execution timed out after 600000ms"}}],
       "output": null, "success": false, "type": "step"}
    ]
  }
}`

func TestReadSupervisorReportsADeadSupervisorAndTheStepThatKilledIt(t *testing.T) {
	client, seen := supervisorAPI(t, http.StatusOK, erroredInstanceBody)

	supervisor, err := ReadSupervisor(context.Background(), "run_2xm", supervisorOptions(client))
	if err != nil {
		t.Fatalf("ReadSupervisor: %v", err)
	}
	if supervisor.Alive() {
		t.Error("an errored instance was reported as a live supervisor")
	}
	if supervisor.Status != SupervisorErrored {
		t.Errorf("status = %q, want %q", supervisor.Status, SupervisorErrored)
	}
	if got := supervisor.Error.String(); !strings.Contains(got, "600000ms") {
		t.Errorf("the instance error does not carry the cap that fired: %q", got)
	}
	current := supervisor.CurrentStep()
	if current == nil || current.Name != "cloud:dispatch:0-1" {
		t.Fatalf("the step it died on was not reported: %#v", current)
	}
	failed := supervisor.FailedSteps()
	if len(failed) != 1 || failed[0].Name != "cloud:dispatch:0-1" {
		t.Fatalf("failed steps = %#v, want the dispatch leg alone", failed)
	}
	if got := failed[0].Reason(); !strings.Contains(got, "WorkflowTimeoutError") {
		t.Errorf("the failing step does not say why: %q", got)
	}
	if len(failed[0].Attempts) != 2 {
		t.Errorf("attempts = %d, want the two the cap consumed", len(failed[0].Attempts))
	}

	if len(*seen) != 1 {
		t.Fatalf("reads = %d, want one", len(*seen))
	}
	request := (*seen)[0]
	if want := "/client/v4/accounts/acct-test/workflows/ticks-run/instances/run_2xm"; request.URL.Path != want {
		t.Errorf("path = %q, want %q", request.URL.Path, want)
	}
	if request.Header.Get("Authorization") != "Bearer cfut_test" {
		t.Errorf("the Workflows read did not carry the Cloudflare API token: %q", request.Header.Get("Authorization"))
	}
}

// A step's `output` is its RETURN VALUE, and `cloud:credential:*` returns the
// run's live gateway token. The reader must never carry it, so nothing
// downstream can print what was never parsed.
func TestReadSupervisorNeverCarriesStepOutput(t *testing.T) {
	client, _ := supervisorAPI(t, http.StatusOK, erroredInstanceBody)

	supervisor, err := ReadSupervisor(context.Background(), "run_2xm", supervisorOptions(client))
	if err != nil {
		t.Fatalf("ReadSupervisor: %v", err)
	}
	for _, step := range supervisor.Steps {
		if strings.Contains(step.Reason(), "tkr_") {
			t.Fatalf("step %s leaked a credential through its reason: %q", step.Name, step.Reason())
		}
	}
	// Nothing the reader hands on may carry it, whatever a caller does with the
	// value: the whole record is re-encoded and searched, so a field added
	// later that quietly re-admits `output` fails here rather than in a
	// terminal somebody screenshots.
	encoded, err := json.Marshal(supervisor)
	if err != nil {
		t.Fatalf("marshal supervisor: %v", err)
	}
	if strings.Contains(string(encoded), "tkr_") {
		t.Fatalf("the supervisor record carries a run gateway token: %s", encoded)
	}
	for i := 0; i < reflect.TypeOf(SupervisorStep{}).NumField(); i++ {
		if name := reflect.TypeOf(SupervisorStep{}).Field(i).Name; name == "Output" {
			t.Fatal("SupervisorStep has an Output field, which carries the run's gateway token")
		}
	}
}

// A wave leg that is still executing: the last step has a start and no end, and
// that IS the answer to "which step is it on".
func TestReadSupervisorNamesTheStepALiveRunIsOn(t *testing.T) {
	body := `{"success": true, "errors": [], "result": {
      "status": "running", "success": null, "error": null,
      "queued": "2026-08-24T09:00:00.000Z", "start": "2026-08-24T09:00:01.000Z", "end": null,
      "step_count": 2,
      "steps": [
        {"name": "context-1", "start": "2026-08-24T09:00:01.000Z", "end": "2026-08-24T09:00:03.000Z",
         "attempts": [{"start": "2026-08-24T09:00:01.000Z", "end": "2026-08-24T09:00:03.000Z", "success": true, "error": null}],
         "success": true, "type": "step"},
        {"name": "cloud:dispatch:0-1", "start": "2026-08-24T09:00:04.000Z", "end": null,
         "attempts": [{"start": "2026-08-24T09:00:04.000Z", "end": null, "success": false, "error": null}],
         "success": null, "type": "step"}
      ]}}`
	client, _ := supervisorAPI(t, http.StatusOK, body)

	supervisor, err := ReadSupervisor(context.Background(), "run_live", supervisorOptions(client))
	if err != nil {
		t.Fatalf("ReadSupervisor: %v", err)
	}
	if !supervisor.Alive() {
		t.Error("a running instance was not reported as alive")
	}
	current := supervisor.CurrentStep()
	if current == nil || current.Name != "cloud:dispatch:0-1" {
		t.Fatalf("current step = %#v, want the dispatch leg", current)
	}
	if !current.Running() {
		t.Error("a step with a start and no end was not reported as in flight")
	}
	if current.Failed() {
		t.Error("an unfinished step was reported as failed")
	}
	if len(supervisor.FailedSteps()) != 0 {
		t.Errorf("failed steps = %#v, want none", supervisor.FailedSteps())
	}
}

// A `sleep` step has a different shape: `finished` instead of `success`, and no
// attempts. `step.sleep` is how a wave is spread across bounded legs, so most
// of a long run's trail is these.
func TestReadSupervisorUnderstandsSleepSteps(t *testing.T) {
	body := `{"success": true, "errors": [], "result": {
      "status": "running", "step_count": 1,
      "steps": [{"name": "wave:1:wait:1:0-1", "start": "2026-08-23T01:51:01.373Z",
                 "end": "2026-08-23T01:51:16.373Z", "finished": true, "type": "sleep", "error": null}]}}`
	client, _ := supervisorAPI(t, http.StatusOK, body)

	supervisor, err := ReadSupervisor(context.Background(), "run_sleepy", supervisorOptions(client))
	if err != nil {
		t.Fatalf("ReadSupervisor: %v", err)
	}
	step := supervisor.CurrentStep()
	if step == nil || step.Type != "sleep" {
		t.Fatalf("current step = %#v, want the sleep", step)
	}
	if step.Failed() {
		t.Error("a finished sleep was reported as a failure")
	}
	if step.Running() {
		t.Error("a sleep with an end was reported as in flight")
	}
}

// Every refusal is its own message: an absent token, a token the account
// rejects and an instance Cloudflare has never heard of send an operator to
// three different places.
func TestReadSupervisorRefusalsAreDistinct(t *testing.T) {
	client, _ := supervisorAPI(t, http.StatusOK, erroredInstanceBody)

	noToken := supervisorOptions(client)
	noToken.CloudflareAPIToken = ""
	if _, err := ReadSupervisor(context.Background(), "run_x", noToken); err == nil ||
		!strings.Contains(err.Error(), "--cloudflare-api-token") {
		t.Errorf("a missing token did not name the way to install one: %v", err)
	}

	noAccount := supervisorOptions(client)
	noAccount.GatewayURL = ""
	if _, err := ReadSupervisor(context.Background(), "run_x", noAccount); err == nil ||
		!strings.Contains(err.Error(), "account") {
		t.Errorf("a missing account did not say so: %v", err)
	}

	rejected, _ := supervisorAPI(t, http.StatusForbidden, `{"success": false, "errors": [{"message": "no"}]}`)
	if _, err := ReadSupervisor(context.Background(), "run_x", supervisorOptions(rejected)); err == nil ||
		!strings.Contains(err.Error(), "Workflows read access") {
		t.Errorf("a rejected token did not name the permission it needs: %v", err)
	}

	missing, _ := supervisorAPI(t, http.StatusNotFound, `{"success": false, "errors": [{"message": "not found"}]}`)
	_, err := ReadSupervisor(context.Background(), "run_x", supervisorOptions(missing))
	if err == nil || !strings.Contains(err.Error(), "retention") {
		t.Errorf("an absent instance did not offer the two reasons it can be absent: %v", err)
	}
}

// `unknown` is not evidence of a healthy supervisor. Reporting it as alive is
// the mistake this whole reader exists to stop being made.
func TestUnknownSupervisorIsNotAlive(t *testing.T) {
	supervisor := &Supervisor{Status: SupervisorUnknown}
	if supervisor.Alive() {
		t.Error("an unknown status was reported as alive")
	}
	if !strings.Contains(supervisor.Explain(), "not evidence") {
		t.Errorf("an unknown status does not say what it is not: %q", supervisor.Explain())
	}
	for _, status := range []string{SupervisorErrored, SupervisorTerminated, SupervisorComplete} {
		one := (&Supervisor{Status: status}).Explain()
		other := (&Supervisor{Status: SupervisorRunning}).Explain()
		if one == other || strings.TrimSpace(one) == "" {
			t.Errorf("%q does not get its own words: %q", status, one)
		}
	}
}
