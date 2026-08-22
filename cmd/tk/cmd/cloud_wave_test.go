package cmd

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	cloudstate "github.com/pengelbrecht/ticks/internal/cloud/state"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// The verb family under test is the one a LOCAL orchestrator drives: spawn a
// wave into cloud containers, wait for it on the durable layer, collect it,
// and reconcile after a lid closes. Every test below runs with a real git
// remote (file://) and a fake factory, because that is exactly the split the
// substrate has: git is the durable authority, the factory is the arbiter.

// writeCloudTick writes a child tick of an epic into the store.
func writeCloudTick(t *testing.T, repo, id, epic string) {
	t.Helper()
	now := time.Now().UTC().Truncate(time.Second)
	store := tick.NewStore(filepath.Join(repo, ".tick"))
	if err := store.Write(tick.Tick{
		ID: id, Title: "Tick " + id, Status: tick.StatusOpen, Priority: 2,
		Type: tick.TypeTask, Parent: epic, Owner: "operator", CreatedBy: "operator",
		CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		t.Fatalf("write tick %s: %v", id, err)
	}
}

// writeRunnersConfig declares the repo's substrate.
func writeRunnersConfig(t *testing.T, repo, substrate string) {
	t.Helper()
	body := "[orchestration]\nsubstrate = \"" + substrate + "\"\n\n[roles.implement]\nkind = \"claude\"\n"
	path := filepath.Join(repo, ".tick", "runners.toml")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir .tick: %v", err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatalf("write runners.toml: %v", err)
	}
}

// setupCloudWaveRepo builds a pushed repo with an epic and its ticks, on the
// cloud substrate.
func setupCloudWaveRepo(t *testing.T, substrate string, ticks ...string) (repo, remote, sha string) {
	t.Helper()
	repo, remote, _ = setupCloudRepo(t, false)
	writeCloudEpic(t, repo, "epic1")
	for _, id := range ticks {
		writeCloudTick(t, repo, id, "epic1")
	}
	writeRunnersConfig(t, repo, substrate)
	// What `tk init` writes: run-state manifests live under .tick/logs/ and
	// are git-ignored local state, never tracker state.
	if err := os.WriteFile(filepath.Join(repo, ".tick", ".gitignore"), []byte(".index.json\nlogs/\n"), 0o644); err != nil {
		t.Fatalf("write .tick/.gitignore: %v", err)
	}
	execTestCmd(t, repo, "git", "add", "-A")
	execTestCmd(t, repo, "git", "commit", "-m", "epic and wave")
	execTestCmd(t, repo, "git", "push", "origin", "main")
	sha = strings.TrimSpace(string(execTestOutput(t, repo, "git", "rev-parse", "HEAD")))
	return repo, remote, sha
}

// pushCloudWorkerBranch is what a worker container leaves behind: its branch
// with the work and, when report is non-empty, the COMMITTED report.
func pushCloudWorkerBranch(t *testing.T, remote, base, epic, tickID, report string, files map[string]string) {
	t.Helper()
	work := t.TempDir()
	execTestCmd(t, "", "git", "clone", "--quiet", "file://"+remote, work)
	execTestCmd(t, work, "git", "config", "user.email", "worker@example.com")
	execTestCmd(t, work, "git", "config", "user.name", "Worker")
	branch := cloudstate.BranchFor(epic, tickID)
	execTestCmd(t, work, "git", "checkout", "-q", "-B", branch, base)
	for path, body := range files {
		full := filepath.Join(work, filepath.FromSlash(path))
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			t.Fatalf("mkdir: %v", err)
		}
		if err := os.WriteFile(full, []byte(body), 0o644); err != nil {
			t.Fatalf("write %s: %v", path, err)
		}
		execTestCmd(t, work, "git", "add", "--", path)
	}
	if len(files) > 0 {
		execTestCmd(t, work, "git", "commit", "-m", "work on "+tickID)
	}
	if report != "" {
		name := "RESULT-" + tickID + ".md"
		if err := os.WriteFile(filepath.Join(work, name), []byte(report), 0o644); err != nil {
			t.Fatalf("write report: %v", err)
		}
		execTestCmd(t, work, "git", "add", "--", name)
		execTestCmd(t, work, "git", "commit", "-m", "report for "+tickID)
	}
	execTestCmd(t, work, "git", "push", "-q", "origin", branch)
}

// enrolledFactory answers the two calls a spawn makes: the enrolment probe and
// the submission. submit decides what the submission gets back.
func enrolledFactory(t *testing.T, project string, submit func(cloudFactoryRequest) (int, any)) (string, *[]cloudFactoryRequest) {
	t.Helper()
	return newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		switch {
		case request.Method == http.MethodGet && request.Path == "/api/projects":
			return http.StatusOK, map[string]any{"projects": []map[string]any{{"project": project}}}
		case request.Method == http.MethodPost && request.Path == "/api/runs":
			return submit(request)
		case request.Method == http.MethodGet && strings.HasPrefix(request.Path, "/api/runs/"):
			return http.StatusOK, map[string]any{"run": map[string]any{"run_id": "run_wave", "state": "running"}}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
}

func startedWave(cloudFactoryRequest) (int, any) {
	return http.StatusCreated, map[string]any{
		"run":      map[string]any{"run_id": "run_wave", "state": "starting"},
		"workflow": map[string]any{"id": "run_wave", "status": "running"},
	}
}

func readManifest(t *testing.T, repo, epic, tickID string) cloudstate.Manifest {
	t.Helper()
	m, err := cloudstate.Read(cloudstate.Path(repo, epic, tickID))
	if err != nil {
		t.Fatalf("read manifest for %s: %v", tickID, err)
	}
	return m
}

// --------------------------------------------------------------- spawn ---

// TestCloudSpawnDispatchesAWaveAndRecordsIt is acceptance criterion 1's first
// half: a local orchestrator on substrate = cloud dispatches a wave of
// containers, and remembers enough about it to fan back in later.
func TestCloudSpawnDispatchesAWaveAndRecordsIt(t *testing.T) {
	repo, _, sha := setupCloudWaveRepo(t, "cloud", "aaa", "bbb")
	endpoint, requests := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa,bbb"}); err != nil {
		t.Fatalf("cloud spawn: %v\n%s", err, buf.String())
	}

	var submission *cloudFactoryRequest
	for i := range *requests {
		if (*requests)[i].Path == "/api/runs" {
			submission = &(*requests)[i]
		}
	}
	if submission == nil {
		t.Fatalf("no wave submission reached the factory; requests: %+v", *requests)
	}
	ids, _ := submission.Body["tick_ids"].([]any)
	if len(ids) != 2 || ids[0] != "aaa" || ids[1] != "bbb" {
		t.Errorf("tick_ids = %#v, want [aaa bbb]", submission.Body["tick_ids"])
	}
	if got := submission.Body["origin"]; got != "local" {
		t.Errorf("origin = %#v, want local — the lease has to record that a laptop is driving this", got)
	}
	if got := submission.Body["base_sha"]; got != sha {
		t.Errorf("base_sha = %#v, want the pushed HEAD %s", got, sha)
	}

	for _, id := range []string{"aaa", "bbb"} {
		m := readManifest(t, repo, "epic1", id)
		if m.RunID != "run_wave" || m.Base != sha {
			t.Errorf("manifest %s = %+v, want run_wave at %s", id, m, sha)
		}
		if m.Branch != "tick/epic1/"+id {
			t.Errorf("manifest %s branch = %q, want tick/epic1/%s", id, m.Branch, id)
		}
		if m.LeaseOrigin != "local" || m.Arbiter != "runroom" {
			t.Errorf("manifest %s records lease %q/%q, want local/runroom", id, m.LeaseOrigin, m.Arbiter)
		}
	}
	if !strings.Contains(buf.String(), "run_wave") {
		t.Errorf("spawn did not print the run id:\n%s", buf.String())
	}
	if !strings.Contains(buf.String(), "runner-state:") {
		t.Errorf("spawn did not print the runner-state note line:\n%s", buf.String())
	}
}

// TestCloudSpawnRefusesWhenAnotherRunHoldsTheLease is acceptance criterion 2.
func TestCloudSpawnRefusesWhenAnotherRunHoldsTheLease(t *testing.T) {
	repo, _, _ := setupCloudWaveRepo(t, "cloud", "aaa")
	endpoint, _ := enrolledFactory(t, "acme/project", func(cloudFactoryRequest) (int, any) {
		return http.StatusConflict, map[string]any{
			"error":  "lease_held",
			"reason": "lease_held_by:run_holder",
			"detail": "the dispatch lease is held by run run_holder",
			"holder": map[string]any{"run_id": "run_holder", "epic": "epic9", "origin": "cloud"},
		}
	})
	configureCloudFactory(t, endpoint)
	buf := captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa"})
	if err == nil {
		t.Fatalf("cloud spawn dispatched a wave while another run held the lease\n%s", buf.String())
	}
	for _, want := range []string{"run_holder", "epic9", "cloud"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("refusal %q does not name %q", err.Error(), want)
		}
	}
	if _, statErr := os.Stat(cloudstate.Path(repo, "epic1", "aaa")); !os.IsNotExist(statErr) {
		t.Error("a refused dispatch wrote a manifest for a worker that was never started")
	}
}

// TestCloudSpawnRefusesAnotherSubstrate is the mirror of `tk herd spawn`'s
// exit-9 gate: two dispatch verbs, and each refuses the other's substrate
// rather than putting a second worker on one tick.
func TestCloudSpawnRefusesAnotherSubstrate(t *testing.T) {
	setupCloudWaveRepo(t, "herdr", "aaa")
	endpoint, requests := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa"})
	if err == nil {
		t.Fatal("cloud spawn dispatched containers for a run that dispatches herdr panes")
	}
	if code := GetExitCode(err); code != ExitWrongSubstrate {
		t.Errorf("exit code = %d, want %d (wrong substrate)", code, ExitWrongSubstrate)
	}
	if !strings.Contains(err.Error(), "herd spawn") {
		t.Errorf("refusal %q does not name the verb that does serve this run", err.Error())
	}
	if len(*requests) != 0 {
		t.Errorf("a substrate refusal cost %d factory call(s); it must cost none", len(*requests))
	}
}

// TestCloudSpawnOnAnUnenrolledCheckoutStaysOffline is acceptance criterion 3's
// mechanism: no factory means no network call at all, and the refusal points
// at enrolment rather than at another substrate.
func TestCloudSpawnOnAnUnenrolledCheckoutStaysOffline(t *testing.T) {
	setupCloudWaveRepo(t, "cloud", "aaa")
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("TICK_OWNER", "operator@example.com")
	endpoint, requests := newCloudFactory(t, func(cloudFactoryRequest) (int, any) {
		t.Error("an un-enrolled checkout reached the network")
		return http.StatusOK, map[string]any{}
	})
	_ = endpoint
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa"})
	if err == nil {
		t.Fatal("cloud spawn claimed to dispatch containers with no factory configured")
	}
	if !strings.Contains(err.Error(), "factory") {
		t.Errorf("refusal %q does not explain that no factory is configured", err.Error())
	}
	if len(*requests) != 0 {
		t.Errorf("an offline checkout made %d network call(s)", len(*requests))
	}
}

func TestCloudSpawnRequiresTicks(t *testing.T) {
	setupCloudWaveRepo(t, "cloud", "aaa")
	endpoint, _ := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "spawn", "epic1"})
	if err == nil {
		t.Fatal("cloud spawn accepted a wave with no ticks")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

func TestCloudSpawnRefusesATickOutsideTheEpic(t *testing.T) {
	repo, _, _ := setupCloudWaveRepo(t, "cloud", "aaa")
	writeCloudEpic(t, repo, "epic2")
	writeCloudTick(t, repo, "ccc", "epic2")
	execTestCmd(t, repo, "git", "add", "-A")
	execTestCmd(t, repo, "git", "commit", "-m", "second epic")
	execTestCmd(t, repo, "git", "push", "origin", "main")

	endpoint, requests := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa,ccc"})
	if err == nil {
		t.Fatal("cloud spawn dispatched a tick that belongs to another epic")
	}
	if !strings.Contains(err.Error(), "ccc") {
		t.Errorf("refusal %q does not name the tick", err.Error())
	}
	for _, r := range *requests {
		if r.Path == "/api/runs" {
			t.Error("the wave was submitted despite a tick outside the epic")
		}
	}
}

// ---------------------------------------------------------------- wait ---

// TestCloudWaitSettlesOnThePushedReport: a container is destroyed when it
// finishes, so the only completion signal is the report it pushed.
func TestCloudWaitSettlesOnThePushedReport(t *testing.T) {
	_, remote, sha := setupCloudWaveRepo(t, "cloud", "aaa", "bbb")
	endpoint, _ := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa,bbb"}); err != nil {
		t.Fatalf("cloud spawn: %v", err)
	}

	pushCloudWorkerBranch(t, remote, sha, "epic1", "aaa", "STATUS: DONE\n", map[string]string{"a.go": "package a\n"})
	pushCloudWorkerBranch(t, remote, sha, "epic1", "bbb", "STATUS: DONE_WITH_CONCERNS — check the retry\n", map[string]string{"b.go": "package b\n"})

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "wait", "--epic", "epic1", "--poll", "10", "--timeout", "20000", "--json"}); err != nil {
		t.Fatalf("cloud wait: %v\n%s", err, buf.String())
	}
	var document struct {
		Workers []struct {
			Tick    string `json:"tick"`
			State   string `json:"state"`
			Commits int    `json:"commits"`
			Status  string `json:"status"`
		} `json:"workers"`
		Summary struct {
			Settled  int      `json:"settled"`
			TimedOut []string `json:"timed_out"`
		} `json:"summary"`
	}
	if err := json.Unmarshal(buf.Bytes(), &document); err != nil {
		t.Fatalf("decode wait json: %v\n%s", err, buf.String())
	}
	if document.Summary.Settled != 2 || len(document.Summary.TimedOut) != 0 {
		t.Fatalf("summary = %+v, want two settled workers", document.Summary)
	}
	for _, w := range document.Workers {
		if w.State != "settled" || w.Commits == 0 || w.Status == "" {
			t.Errorf("worker %+v is not reported as a settled worker with evidence", w)
		}
	}
}

// TestCloudWaitTimesOutRatherThanBlockingForever: one wedged container must
// not wedge a wave, exactly as `tk herd wait` refuses an indefinite mode.
func TestCloudWaitTimesOutOnAWorkerThatNeverPushes(t *testing.T) {
	_, remote, sha := setupCloudWaveRepo(t, "cloud", "aaa", "bbb")
	endpoint, _ := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa,bbb"}); err != nil {
		t.Fatalf("cloud spawn: %v", err)
	}
	pushCloudWorkerBranch(t, remote, sha, "epic1", "aaa", "STATUS: DONE\n", map[string]string{"a.go": "package a\n"})

	buf := captureCmdOutput(t)
	err := ExecuteArgs([]string{"cloud", "wait", "--epic", "epic1", "--poll", "10", "--timeout", "300", "--json"})
	if err == nil {
		t.Fatalf("cloud wait reported success with one worker still out:\n%s", buf.String())
	}
	if !strings.Contains(buf.String(), "bbb") {
		t.Errorf("the timed-out worker is not named in the output:\n%s", buf.String())
	}
}

// TestCloudWaitStopsWhenTheRunEnded: the control plane knows something git
// does not — no further container will push — and a wait that ignored it would
// spend its whole deadline learning that.
func TestCloudWaitStopsWaitingWhenTheRunEnded(t *testing.T) {
	_, remote, sha := setupCloudWaveRepo(t, "cloud", "aaa", "bbb")
	runState := "running"
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		switch {
		case request.Method == http.MethodGet && request.Path == "/api/projects":
			return http.StatusOK, map[string]any{"projects": []map[string]any{{"project": "acme/project"}}}
		case request.Method == http.MethodPost && request.Path == "/api/runs":
			return startedWave(request)
		case request.Method == http.MethodGet && strings.HasPrefix(request.Path, "/api/runs/"):
			return http.StatusOK, map[string]any{"run": map[string]any{"run_id": "run_wave", "state": runState}}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa,bbb"}); err != nil {
		t.Fatalf("cloud spawn: %v", err)
	}
	pushCloudWorkerBranch(t, remote, sha, "epic1", "aaa", "STATUS: DONE\n", map[string]string{"a.go": "package a\n"})
	runState = "stopped"

	buf := captureCmdOutput(t)
	started := time.Now()
	// A generous deadline: the point is that the wait ends long before it.
	err := ExecuteArgs([]string{"cloud", "wait", "--epic", "epic1", "--poll", "10", "--timeout", "60000", "--json"})
	if err == nil {
		t.Fatalf("cloud wait reported success with a worker that never reported:\n%s", buf.String())
	}
	if elapsed := time.Since(started); elapsed > 30*time.Second {
		t.Fatalf("the wait took %s: it waited out the deadline instead of reading the run state", elapsed)
	}
	var document struct {
		Workers []struct {
			Tick   string `json:"tick"`
			State  string `json:"state"`
			Detail string `json:"detail"`
		} `json:"workers"`
		Summary struct {
			Settled  int      `json:"settled"`
			Exited   int      `json:"exited"`
			TimedOut []string `json:"timed_out"`
		} `json:"summary"`
	}
	// Decoded from the head of the stream: the failing exit also prints its
	// message to the same captured buffer, and the document is the first value.
	if decodeErr := json.NewDecoder(bytes.NewReader(buf.Bytes())).Decode(&document); decodeErr != nil {
		t.Fatalf("decode wait json: %v\n%s", decodeErr, buf.String())
	}
	if document.Summary.Settled != 1 || document.Summary.Exited != 1 || len(document.Summary.TimedOut) != 0 {
		t.Fatalf("summary = %+v, want one settled and one exited", document.Summary)
	}
	for _, w := range document.Workers {
		if w.Tick == "bbb" && (w.State != "exited" || !strings.Contains(w.Detail, "stopped")) {
			t.Errorf("bbb = %+v, want exited with the run state in the detail", w)
		}
	}
}

// ------------------------------------------------------------- collect ---

// TestCloudCollectReadsTheDurableLayer is acceptance criterion 1's second
// half: the wave is verified from the branches the containers pushed, and the
// verdicts are the herd substrate's own vocabulary.
func TestCloudCollectReadsTheDurableLayerAndTheWaveIsMergeable(t *testing.T) {
	repo, remote, sha := setupCloudWaveRepo(t, "cloud", "aaa", "bbb")
	endpoint, _ := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa,bbb"}); err != nil {
		t.Fatalf("cloud spawn: %v", err)
	}
	pushCloudWorkerBranch(t, remote, sha, "epic1", "aaa", "STATUS: DONE\n", map[string]string{"a.go": "package a\n"})
	pushCloudWorkerBranch(t, remote, sha, "epic1", "bbb", "STATUS: DONE\n", map[string]string{"b.go": "package b\n"})

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "collect", "--epic", "epic1", "--json"}); err != nil {
		t.Fatalf("cloud collect: %v\n%s", err, buf.String())
	}
	var document struct {
		Reports []struct {
			Tick    string `json:"tick"`
			Verdict string `json:"verdict"`
			Branch  string `json:"branch"`
		} `json:"reports"`
		Summary struct {
			Ready int `json:"ready"`
			Total int `json:"total"`
		} `json:"summary"`
	}
	if err := json.Unmarshal(buf.Bytes(), &document); err != nil {
		t.Fatalf("decode collect json: %v\n%s", err, buf.String())
	}
	if document.Summary.Ready != 2 || document.Summary.Total != 2 {
		t.Fatalf("summary = %+v, want 2/2 ready", document.Summary)
	}

	// And the wave integrates: the orchestrator merges what collect verified.
	for _, r := range document.Reports {
		if r.Verdict != "ready-to-merge" {
			t.Fatalf("verdict for %s = %q", r.Tick, r.Verdict)
		}
		execTestCmd(t, repo, "git", "merge", "--no-edit", "refs/remotes/origin/"+r.Branch)
	}
	for _, f := range []string{"a.go", "b.go"} {
		if _, err := os.Stat(filepath.Join(repo, f)); err != nil {
			t.Errorf("integration did not land %s: %v", f, err)
		}
	}
}

func TestCloudCollectFailsOnAWorkerWithNoCommits(t *testing.T) {
	_, remote, sha := setupCloudWaveRepo(t, "cloud", "aaa", "bbb")
	endpoint, _ := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa,bbb"}); err != nil {
		t.Fatalf("cloud spawn: %v", err)
	}
	pushCloudWorkerBranch(t, remote, sha, "epic1", "aaa", "STATUS: DONE\n", map[string]string{"a.go": "package a\n"})

	buf := captureCmdOutput(t)
	err := ExecuteArgs([]string{"cloud", "collect", "--epic", "epic1"})
	if err == nil {
		t.Fatalf("cloud collect passed a wave with a worker that pushed nothing:\n%s", buf.String())
	}
	if !strings.Contains(buf.String(), "no-commits") {
		t.Errorf("output does not carry the no-commits verdict:\n%s", buf.String())
	}
}

func TestCloudCollectWithNoManifestsIsNotFound(t *testing.T) {
	setupCloudWaveRepo(t, "cloud", "aaa")
	captureCmdOutput(t)
	err := ExecuteArgs([]string{"cloud", "collect", "--epic", "epic1"})
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d (no manifests)", code, ExitNotFound)
	}
}

// ----------------------------------------------------------- reconcile ---

// TestCloudReconcileAdoptsLiveWorkAfterALidCloses: the failure this substrate
// is wanted for. The orchestrator died; the containers did not.
func TestCloudReconcileClassifiesAWaveWithoutRedispatching(t *testing.T) {
	_, remote, sha := setupCloudWaveRepo(t, "cloud", "aaa", "bbb", "ccc")
	endpoint, _ := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa,bbb,ccc"}); err != nil {
		t.Fatalf("cloud spawn: %v", err)
	}
	// aaa finished, bbb is mid-turn with commits and no report, ccc pushed nothing.
	pushCloudWorkerBranch(t, remote, sha, "epic1", "aaa", "STATUS: DONE\n", map[string]string{"a.go": "package a\n"})
	pushCloudWorkerBranch(t, remote, sha, "epic1", "bbb", "", map[string]string{"b.go": "package b\n"})

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "reconcile", "--epic", "epic1", "--json"}); err != nil {
		t.Fatalf("cloud reconcile: %v\n%s", err, buf.String())
	}
	var document struct {
		Workers []struct {
			Tick   string `json:"tick"`
			Class  string `json:"class"`
			Action string `json:"action"`
		} `json:"workers"`
	}
	if err := json.Unmarshal(buf.Bytes(), &document); err != nil {
		t.Fatalf("decode reconcile json: %v\n%s", err, buf.String())
	}
	classes := map[string]string{}
	for _, w := range document.Workers {
		classes[w.Tick] = w.Class
	}
	if classes["aaa"] != "settled" {
		t.Errorf("aaa = %q, want settled", classes["aaa"])
	}
	if classes["bbb"] != "live-worker" {
		t.Errorf("bbb = %q, want live-worker — a branch with commits and no report is a worker mid-turn, never a redispatch", classes["bbb"])
	}
	if classes["ccc"] != "live-worker" {
		t.Errorf("ccc = %q, want live-worker while the run is still alive", classes["ccc"])
	}
	if strings.Contains(strings.ToLower(buf.String()), "redispatch") &&
		!strings.Contains(buf.String(), "never") {
		t.Errorf("a live wave was told to redispatch:\n%s", buf.String())
	}
}

// TestCloudReconcileAfterTheRunEndedSeparatesWorkFromNothing: once the run is
// over, a branch with commits and no report is work to salvage and an empty
// one is a safe redispatch — the distinction a fresh orchestrator needs.
func TestCloudReconcileAfterTheRunEndedSeparatesWorkFromNothing(t *testing.T) {
	_, remote, sha := setupCloudWaveRepo(t, "cloud", "aaa", "bbb")
	endpoint, _ := newCloudFactory(t, func(request cloudFactoryRequest) (int, any) {
		switch {
		case request.Method == http.MethodGet && request.Path == "/api/projects":
			return http.StatusOK, map[string]any{"projects": []map[string]any{{"project": "acme/project"}}}
		case request.Method == http.MethodPost && request.Path == "/api/runs":
			return startedWave(request)
		case request.Method == http.MethodGet && strings.HasPrefix(request.Path, "/api/runs/"):
			return http.StatusOK, map[string]any{"run": map[string]any{"run_id": "run_wave", "state": "stopped"}}
		}
		return http.StatusNotFound, map[string]any{"error": "not_found"}
	})
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa,bbb"}); err != nil {
		t.Fatalf("cloud spawn: %v", err)
	}
	pushCloudWorkerBranch(t, remote, sha, "epic1", "aaa", "", map[string]string{"a.go": "package a\n"})

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "reconcile", "--epic", "epic1", "--json"}); err != nil {
		t.Fatalf("cloud reconcile: %v\n%s", err, buf.String())
	}
	var document struct {
		Workers []struct {
			Tick  string `json:"tick"`
			Class string `json:"class"`
		} `json:"workers"`
	}
	if err := json.Unmarshal(buf.Bytes(), &document); err != nil {
		t.Fatalf("decode reconcile json: %v\n%s", err, buf.String())
	}
	classes := map[string]string{}
	for _, w := range document.Workers {
		classes[w.Tick] = w.Class
	}
	if classes["aaa"] != "dead-with-work" {
		t.Errorf("aaa = %q, want dead-with-work", classes["aaa"])
	}
	if classes["bbb"] != "stale-no-work" {
		t.Errorf("bbb = %q, want stale-no-work", classes["bbb"])
	}
}

// TestCloudReconcileMutatesNothing: it prints a plan. A recovery command that
// wrote would be a second dispatcher.
func TestCloudReconcileMutatesNothing(t *testing.T) {
	repo, remote, sha := setupCloudWaveRepo(t, "cloud", "aaa")
	endpoint, _ := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa"}); err != nil {
		t.Fatalf("cloud spawn: %v", err)
	}
	pushCloudWorkerBranch(t, remote, sha, "epic1", "aaa", "STATUS: DONE\n", map[string]string{"a.go": "package a\n"})
	before := readManifest(t, repo, "epic1", "aaa")

	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"cloud", "reconcile", "--epic", "epic1"}); err != nil {
		t.Fatalf("cloud reconcile: %v", err)
	}
	if after := readManifest(t, repo, "epic1", "aaa"); after != before {
		t.Errorf("reconcile rewrote the manifest: %+v -> %+v", before, after)
	}
	if status := strings.TrimSpace(string(execTestOutput(t, repo, "git", "status", "--porcelain"))); status != "" {
		t.Errorf("reconcile dirtied the checkout: %q", status)
	}
	if branches := strings.TrimSpace(string(execTestOutput(t, repo, "git", "branch", "--list", "tick/*"))); branches != "" {
		t.Errorf("reconcile created local branches: %q", branches)
	}
}

// execTestCmd with an empty dir runs in the process's working directory; the
// clone helper above needs that, and setupCloudRepo has already chdir'd into
// the checkout.
var _ = exec.Command
