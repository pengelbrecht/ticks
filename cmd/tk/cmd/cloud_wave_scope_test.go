package cmd

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// Tick wiy (from the Phase 2 final review, oun).
//
// The Run Workflow resolves its cloud wave ONCE, from the `tick_ids` this
// command submits, and its mandatory closeout pass never re-derives or
// re-dispatches a second one — so an epic needing more than one wave gets
// per-tick containers for the first wave only, and everything after it runs as
// harness subagents inside the closeout orchestrator's single sandbox. That is
// the shipped behaviour. What was missing is that nothing SAID so: an operator
// typing `--tick-ids` under a heading that reads "cloud substrate fan-out"
// reasonably assumes every wave fans out, and the runs where it silently does
// not are the long multi-wave epics where it matters most.
//
// The limit therefore has to be said where the operator is standing, and this
// verb is the earlier of the two places they stand — before the push, before
// the spend. The later one is the run's own status, its dispatch log and the
// reason its closeout orchestrator is given (`cloud/factory/src/run-workflow.ts`).

// cloudWaveScopeFixture is the one sentence both tellers are pinned to. It is
// located from this file rather than from the working directory: the cloud
// tests chdir into a temporary repository, so a relative path is only correct
// before the first setup helper runs.
func cloudWaveScopeFixture(t *testing.T) struct {
	Note         string `json:"note"`
	StatusSuffix string `json:"status_suffix"`
} {
	t.Helper()
	var contract struct {
		Note         string `json:"note"`
		StatusSuffix string `json:"status_suffix"`
	}
	_, self, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot locate this test file, so the shared scope fixture cannot be read")
	}
	path := filepath.Join(filepath.Dir(self), "..", "..", "..",
		"cloud", "factory", "test", "fixtures", "cloud-wave-scope.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	if err := json.Unmarshal(data, &contract); err != nil {
		t.Fatalf("decode %s: %v", path, err)
	}
	if strings.TrimSpace(contract.Note) == "" {
		t.Fatalf("%s carries no note", path)
	}
	return contract
}

// Two independent tellers, one sentence. A limit phrased two ways stops being
// legible, and this repository has already paid once for a fix that landed in
// one language only (`.tick/learnings.md`, "Cross-language parity").
func TestCloudWaveScopeMatchesTheFactorySentence(t *testing.T) {
	contract := cloudWaveScopeFixture(t)
	if cloudWaveScope != contract.Note {
		t.Errorf("cloudWaveScope and the shared fixture have drifted:\n go: %q\nfix: %q",
			cloudWaveScope, contract.Note)
	}
}

// The operator is told before the wave is submitted, not after reading a run
// record and wondering where the other containers went.
func TestCloudRunHelpSaysFanOutIsFirstWaveOnly(t *testing.T) {
	contract := cloudWaveScopeFixture(t)
	if !strings.Contains(cloudRunCmd.Long, "first-wave-only") {
		t.Errorf("`tk cloud run --help` does not say fan-out is first-wave-only:\n%s", cloudRunCmd.Long)
	}
	if !strings.Contains(cloudRunCmd.Long, "closeout orchestrator") {
		t.Errorf("`tk cloud run --help` does not say where the rest of the epic runs:\n%s", cloudRunCmd.Long)
	}
	flag := cloudRunCmd.Flags().Lookup("tick-ids")
	if flag == nil {
		t.Fatal("cloud run has no --tick-ids flag")
	}
	if !strings.Contains(flag.Usage, "first wave") {
		t.Errorf("--tick-ids usage does not name the limit: %q", flag.Usage)
	}
	// The long help carries the full sentence, so the two surfaces cannot say
	// different things about the same limit.
	if !strings.Contains(collapseSpace(cloudRunCmd.Long), collapseSpace(contract.Note)) {
		t.Errorf("`tk cloud run --help` does not carry the shared sentence:\n%s", cloudRunCmd.Long)
	}
}

// collapseSpace folds newlines and runs of whitespace into single spaces, so a
// wrapped help paragraph can be compared against a one-line sentence.
func collapseSpace(s string) string { return strings.Join(strings.Fields(s), " ") }

// And again at the moment the wave is accepted: the line that reports what was
// dispatched is where an operator forms their expectation of the run.
func TestCloudRunWaveOutputSaysFanOutIsFirstWaveOnly(t *testing.T) {
	contract := cloudWaveScopeFixture(t)
	setupCloudWaveRepo(t, "cloud", "aaa", "bbb")
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
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
	out := buf.String()
	if !strings.Contains(out, "2 tick(s)") {
		t.Errorf("output does not report the dispatched wave:\n%s", out)
	}
	if !strings.Contains(collapseSpace(out), collapseSpace(contract.Note)) {
		t.Errorf("output does not say fan-out is first-wave-only:\n%s", out)
	}
}

// A Phase 1 submission fans nothing out and has no wave to scope, so the note
// would be noise there — and a note printed for every run is a note nobody
// reads by the time it matters.
func TestCloudRunWithoutAWaveSaysNothingAboutWaveScope(t *testing.T) {
	contract := cloudWaveScopeFixture(t)
	setupCloudRepo(t, true)
	endpoint, _ := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		return http.StatusCreated, map[string]any{"run": map[string]any{"run_id": "run_plain"}}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "run", "epic1"}); err != nil {
		t.Fatalf("cloud run: %v\n%s", err, buf.String())
	}
	if strings.Contains(collapseSpace(buf.String()), collapseSpace(contract.Note)) {
		t.Errorf("a single-sandbox run was told about wave scope:\n%s", buf.String())
	}
}
