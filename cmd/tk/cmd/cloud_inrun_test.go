package cmd

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/sandbox"
)

// Tick wiy.
//
// `tk cloud spawn` is the dispatch verb a LOCAL orchestrator uses: it submits a
// new run, and that run takes the project's dispatch lease. An orchestrator
// running INSIDE a cloud run can do neither — its own run holds the lease, so
// it would be refused by itself, and a second submission would nest a whole
// Workflow inside this one.
//
// So the same verb takes a different door from inside a run: it asks the run's
// own supervisor to dispatch the wave, under the lease this run already holds.
// These tests pin that split, and pin that the local path is untouched by it.

// inRunEnv puts a test inside a cloud run's orchestrator container: the
// environment the control plane sets on a `wave` phase boot.
func inRunEnv(t *testing.T, endpoint string) {
	t.Helper()
	t.Setenv(sandbox.EnvPass, "1")
	t.Setenv(sandbox.EnvRunID, "run_inrun")
	t.Setenv(sandbox.EnvEpic, "epic1")
	t.Setenv(sandbox.EnvFactoryURL, endpoint)
	t.Setenv(sandbox.EnvFactoryToken, "tkr_run_scoped")
	t.Setenv(sandbox.EnvFactoryProject, "example-org/example-repo")
}

// The whole point: from inside a run, spawn asks its own supervisor rather
// than submitting a second run that would be refused by its own lease.
func TestCloudSpawnInsideARunRequestsAWaveInsteadOfSubmittingARun(t *testing.T) {
	setupCloudWaveRepo(t, "cloud", "aaa", "bbb")
	endpoint, requests := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		if request.Method == http.MethodPost && request.Path == "/api/wave" {
			return http.StatusAccepted, map[string]any{"wave": map[string]any{"pass": 1}}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	inRunEnv(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa,bbb"}); err != nil {
		t.Fatalf("cloud spawn inside a run: %v\n%s", err, buf.String())
	}

	if len(*requests) != 1 {
		t.Fatalf("factory received %d request(s), want exactly one", len(*requests))
	}
	got := (*requests)[0]
	// Never /api/runs: a second run would take a second lease and boot a
	// nested Workflow with its own closeout container.
	if got.Path != "/api/wave" {
		t.Fatalf("spawn posted to %s, want /api/wave", got.Path)
	}
	// The credential is the run's own gateway token, never the operator's
	// factory token: a container must not hold a credential that commands the
	// whole control plane (D17).
	if got.Auth != "Bearer tkr_run_scoped" {
		t.Errorf("wave request authorization = %q, want the run's own token", got.Auth)
	}
	if got.Body["epic"] != "epic1" {
		t.Errorf("wave request epic = %#v", got.Body["epic"])
	}
	if pass, _ := got.Body["pass"].(float64); int(pass) != 1 {
		t.Errorf("wave request pass = %#v, want the container's TICKS_PASS", got.Body["pass"])
	}
	ids, _ := got.Body["tick_ids"].([]any)
	if len(ids) != 2 || ids[0] != "aaa" || ids[1] != "bbb" {
		t.Errorf("wave request tick_ids = %#v, want [aaa bbb]", got.Body["tick_ids"])
	}
	// The base is the commit spawn pushed, so wave N+1 stands on wave N's
	// merged work rather than on the run's original base.
	if sha, _ := got.Body["base_sha"].(string); len(sha) != 40 {
		t.Errorf("wave request base_sha = %#v, want the pushed commit", got.Body["base_sha"])
	}

	// And the one instruction the orchestrator must not get wrong: the
	// containers do not exist yet, so waiting here would watch for nothing.
	out := buf.String()
	if !strings.Contains(out, "once this pass exits") || !strings.Contains(out, "Do not wait") {
		t.Errorf("spawn did not tell the orchestrator to exit rather than wait:\n%s", out)
	}
}

// A refusal must not read as a success. An orchestrator that exits 0 on a
// refused wave leaves the epic short by a wave and looks like it meant to.
func TestCloudSpawnInsideARunSurfacesTheFactorysRefusal(t *testing.T) {
	setupCloudWaveRepo(t, "cloud", "aaa")
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusConflict, map[string]any{
			"error":  "lease_held_by",
			"detail": "the dispatch lease for example-org/example-repo is held by run_other",
		}
	})
	inRunEnv(t, endpoint)
	buf := captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa"})
	if err == nil {
		t.Fatalf("a refused wave exited 0:\n%s", buf.String())
	}
	if !strings.Contains(err.Error(), "lease_held_by") || !strings.Contains(err.Error(), "run_other") {
		t.Errorf("the refusal does not name what happened: %v", err)
	}
}

// The local path is what it always was. A laptop orchestrator has no
// TICKS_PASS, so it still submits a run and still takes a lease.
func TestCloudSpawnOutsideARunStillSubmitsARun(t *testing.T) {
	setupCloudWaveRepo(t, "cloud", "aaa")
	endpoint, requests := enrolledFactory(t, "acme/project", func(cloudFactoryRequest) (int, any) {
		return http.StatusCreated, map[string]any{
			"run": map[string]any{"run_id": "run_local", "state": "starting"},
		}
	})
	configureCloudFactory(t, endpoint)
	// Deliberately NOT inRunEnv: no pass, so no in-run dispatch.
	t.Setenv(sandbox.EnvPass, "")
	captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa"}); err != nil {
		t.Fatalf("cloud spawn: %v", err)
	}
	var submission *cloudFactoryRequest
	for i := range *requests {
		if (*requests)[i].Path == "/api/runs" {
			submission = &(*requests)[i]
		}
		if (*requests)[i].Path == "/api/wave" {
			t.Fatalf("a local spawn used the in-run dispatch door: %#v", (*requests)[i])
		}
	}
	if submission == nil {
		t.Fatalf("local spawn did not submit a run: %#v", *requests)
	}
	if origin := submission.Body["origin"]; origin != "local" {
		t.Errorf("local spawn recorded origin %#v, want local", origin)
	}
}

// A container booted WITHOUT a pass number is not a dispatching pass, whatever
// the agent inside it believes. Permission is the control plane's to give:
// this is what keeps a closeout — which gets no pass — from starting new work.
func TestCloudSpawnWithoutAPassIsNotAnInRunDispatch(t *testing.T) {
	t.Setenv(sandbox.EnvRunID, "run_inrun")
	t.Setenv(sandbox.EnvFactoryURL, "https://factory.example.test")
	t.Setenv(sandbox.EnvFactoryToken, "tkr_run_scoped")
	for _, pass := range []string{"", "0", "-1", "closeout"} {
		t.Setenv(sandbox.EnvPass, pass)
		if _, ok := cloudInRunContext(); ok {
			t.Errorf("TICKS_PASS=%q was accepted as a dispatching pass", pass)
		}
	}
}

// The wave a pass INHERITS, which is the half that makes the loop usable: the
// containers that just ran were dispatched by a different container, and the
// manifests it wrote died with it.
func TestInRunPassInheritsTheWaveTheControlPlaneDispatched(t *testing.T) {
	base := strings.Repeat("c", 40)
	t.Setenv(sandbox.EnvPass, "2")
	t.Setenv(sandbox.EnvRunID, "run_inrun")
	t.Setenv(sandbox.EnvEpic, "epic1")
	t.Setenv(sandbox.EnvFactoryURL, "https://factory.example.test")
	t.Setenv(sandbox.EnvFactoryProject, "example-org/example-repo")
	t.Setenv(sandbox.EnvWaveTicks, "aaa, bbb ")
	t.Setenv(sandbox.EnvWaveBase, base)

	manifests := cloudInheritedManifests("epic1", nil)
	if len(manifests) != 2 {
		t.Fatalf("inherited %d manifest(s), want 2: %#v", len(manifests), manifests)
	}
	if manifests[0].Tick != "aaa" || manifests[1].Tick != "bbb" {
		t.Errorf("inherited the wrong ticks: %#v", manifests)
	}
	if manifests[0].Branch != "tick/epic1/aaa" {
		t.Errorf("inherited branch = %q", manifests[0].Branch)
	}
	// Measured against the commit those containers actually cloned — the
	// previous pass's merged head, not this pass's HEAD.
	if manifests[0].Base != base {
		t.Errorf("inherited base = %q, want the wave's own base", manifests[0].Base)
	}
	if manifests[0].RunID != "run_inrun" || manifests[0].LeaseOrigin != "cloud" {
		t.Errorf("inherited manifest misreports its run: %#v", manifests[0])
	}

	// A tick the control plane did NOT name is not invented: the "was this
	// wave spawned from another checkout?" refusal still stands for it.
	if got := cloudInheritedManifests("epic1", []string{"aaa", "zzz"}); got != nil {
		t.Errorf("invented a manifest for a tick this pass never dispatched: %#v", got)
	}
	// Nor is another epic's wave answered with this one's.
	if got := cloudInheritedManifests("epic2", nil); got != nil {
		t.Errorf("answered epic2 with epic1's wave: %#v", got)
	}
}

// Nothing is inherited outside a run, so every existing refusal is untouched.
func TestNoWaveIsInheritedOutsideACloudRun(t *testing.T) {
	t.Setenv(sandbox.EnvPass, "")
	t.Setenv(sandbox.EnvWaveTicks, "aaa")
	t.Setenv(sandbox.EnvWaveBase, strings.Repeat("c", 40))
	if got := cloudInheritedManifests("epic1", nil); got != nil {
		t.Errorf("a local checkout inherited a wave: %#v", got)
	}
}

// The request body is the contract the factory validates; this pins the shape
// so a rename on either side fails here rather than in a live run.
func TestWaveRequestBodyCarriesTheFieldsTheFactoryRequires(t *testing.T) {
	setupCloudWaveRepo(t, "cloud", "aaa")
	endpoint, requests := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusAccepted, map[string]any{"wave": map[string]any{}}
	})
	inRunEnv(t, endpoint)
	captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa"}); err != nil {
		t.Fatalf("cloud spawn inside a run: %v", err)
	}
	encoded, err := json.Marshal((*requests)[0].Body)
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	for _, field := range []string{"epic", "pass", "base_sha", "tick_ids"} {
		if !strings.Contains(string(encoded), `"`+field+`"`) {
			t.Errorf("the wave request omits %q: %s", field, encoded)
		}
	}
}
