package dashboard

import (
	"context"
	"errors"
	"net/http"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type fakeSource struct {
	observe func(ObserveQuery) (Observation, error)
	harness func(string, int) (Harness, error)
	queries []ObserveQuery
	tails   []string
}

func (f *fakeSource) Observe(_ context.Context, query ObserveQuery) (Observation, error) {
	f.queries = append(f.queries, query)
	if f.observe == nil {
		return Observation{}, nil
	}
	return f.observe(query)
}

func (f *fakeSource) Harness(_ context.Context, runID string, maxBytes int) (Harness, error) {
	f.tails = append(f.tails, runID)
	if f.harness == nil {
		return Harness{}, nil
	}
	return f.harness(runID, maxBytes)
}

func at(stamp string) time.Time {
	parsed, err := time.Parse(time.RFC3339, stamp)
	if err != nil {
		panic(err)
	}
	return parsed
}

func frame() Observation {
	return Observation{
		ObservedAt: "2026-08-22T06:00:00Z",
		Runs: []Run{
			{RunID: "run_a", Project: "example-org/repo", Epic: "t9s", State: "running", StartedAt: "2026-08-22T05:30:00Z"},
			{RunID: "run_old", Project: "example-org/repo", Epic: "k24", State: "completed", StartedAt: "2026-08-21T05:30:00Z", EndedAt: "2026-08-21T06:30:00Z"},
		},
		Projects: []ProjectStatus{{Project: "example-org/repo", Lease: &Lease{RunID: "run_a", Epic: "t9s"}}},
		Dispatch: []Refusal{{RunID: "run_b", TickID: "t9s", Decision: "lease_held_by:run_a", Reason: "lease_held_by", At: "2026-08-22T05:59:00Z"}},
		Events:   []Event{{At: "2026-08-22T06:00:00Z", Epic: "t9s", Tick: "abc", Source: "cloud:worker", Type: "task-started", Delivered: true}},
		Focus: &Focus{
			Run:   Run{RunID: "run_a", State: "running"},
			Phase: Phase{State: "running", Workflow: &Workflow{ID: "run_a", Status: "running"}},
			Boot:  Boot{Attempt: 2, Boots: 2},
		},
	}
}

func TestLoadComposesTheFrameAndTheFocusRunsTail(t *testing.T) {
	source := &fakeSource{
		observe: func(ObserveQuery) (Observation, error) { return frame(), nil },
		harness: func(runID string, _ int) (Harness, error) {
			return Harness{RunID: runID, Text: "working on t9s\n", Bytes: 15, TotalBytes: 15}, nil
		},
	}
	loader := Loader{Source: source, Project: "example-org/repo", Now: func() time.Time { return at("2026-08-22T06:00:01Z") }}

	snap, err := loader.Load(context.Background(), "run_a")
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(snap.Runs) != 2 || snap.Focus == nil {
		t.Fatalf("frame: %+v", snap.Observation)
	}
	if snap.Harness.Text != "working on t9s\n" {
		t.Fatalf("harness: %+v", snap.Harness)
	}
	if snap.LoadedAt != at("2026-08-22T06:00:01Z") {
		t.Fatalf("LoadedAt: %v", snap.LoadedAt)
	}
	if got := source.queries[0]; got.Run != "run_a" || got.Project != "example-org/repo" {
		t.Fatalf("query: %+v", got)
	}
	if len(source.tails) != 1 || source.tails[0] != "run_a" {
		t.Fatalf("tails: %v", source.tails)
	}
}

// A partial answer beats no answer: an operator debugging a broken factory is
// exactly who is reading this.
func TestATailThatCannotBeReadDoesNotCostTheWholeFrame(t *testing.T) {
	source := &fakeSource{
		observe: func(ObserveQuery) (Observation, error) { return frame(), nil },
		harness: func(string, int) (Harness, error) {
			return Harness{}, APIError{Status: http.StatusServiceUnavailable, Detail: "no artifacts bucket"}
		},
	}
	snap, err := Loader{Source: source}.Load(context.Background(), "run_a")
	if err != nil {
		t.Fatalf("a failed tail must not fail the load: %v", err)
	}
	if len(snap.Runs) != 2 {
		t.Fatal("the runs must still be there")
	}
	if !strings.Contains(snap.HarnessDetail, "no artifacts bucket") {
		t.Fatalf("the reason must be said, got %q", snap.HarnessDetail)
	}
}

// A run id that no longer resolves is a stale selection, not a dead factory.
func TestAForgottenFocusRunFallsBackToTheBoard(t *testing.T) {
	source := &fakeSource{
		observe: func(query ObserveQuery) (Observation, error) {
			if query.Run != "" {
				return Observation{}, APIError{Status: http.StatusNotFound, Detail: "no run run_gone"}
			}
			return frame(), nil
		},
	}
	snap, err := Loader{Source: source}.Load(context.Background(), "run_gone")
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(snap.Runs) != 2 {
		t.Fatalf("the board must still render: %+v", snap.Runs)
	}
	if !strings.Contains(snap.FocusDetail, "run_gone") {
		t.Fatalf("the vanished selection must be named, got %q", snap.FocusDetail)
	}
	if len(source.queries) != 2 {
		t.Fatalf("expected a retry without the focus, got %d queries", len(source.queries))
	}
}

func TestLoadReportsAnUnreachableFactory(t *testing.T) {
	source := &fakeSource{observe: func(ObserveQuery) (Observation, error) {
		return Observation{}, errors.New("dial tcp: connection refused")
	}}
	if _, err := (Loader{Source: source}).Load(context.Background(), ""); err == nil {
		t.Fatal("an unreachable factory must be an error, not an empty board")
	}
}

type fakeCost struct {
	costs map[string]Cost
	err   map[string]error
	asked []string
}

func (f *fakeCost) Cost(_ context.Context, runID string) (Cost, error) {
	f.asked = append(f.asked, runID)
	if err, ok := f.err[runID]; ok {
		return Cost{}, err
	}
	return f.costs[runID], nil
}

// Cost comes from gateway telemetry, and only for the runs still spending. A
// read that failed leaves NO cost rather than a zero: an unknown cost and a
// free run are different facts.
func TestCostsAreReadForActiveRunsAndNeverGuessed(t *testing.T) {
	source := &fakeCost{
		costs: map[string]Cost{"run_a": {RunID: "run_a", USD: 1.25, Calls: 12}},
		err:   map[string]error{"run_b": errors.New("the logs API answered HTTP 502")},
	}
	runs := []Run{
		{RunID: "run_a", State: "running"},
		{RunID: "run_b", State: "starting"},
		{RunID: "run_old", State: "completed"},
	}
	costs, problems := LoadCosts(context.Background(), source, runs, 5)

	if len(source.asked) != 2 {
		t.Fatalf("only live runs are worth a telemetry read, asked: %v", source.asked)
	}
	if costs["run_a"].USD != 1.25 {
		t.Fatalf("costs: %+v", costs)
	}
	if _, ok := costs["run_b"]; ok {
		t.Fatal("a failed telemetry read must not become a cost of zero")
	}
	if len(problems) != 1 || !strings.Contains(problems[0], "502") {
		t.Fatalf("problems: %v", problems)
	}
}

func TestCostsAreBoundedSoOneFrameCannotPageForever(t *testing.T) {
	source := &fakeCost{costs: map[string]Cost{}}
	var runs []Run
	for i := 0; i < 10; i++ {
		runs = append(runs, Run{RunID: string(rune('a' + i)), State: "running"})
	}
	if _, _ = LoadCosts(context.Background(), source, runs, 3); len(source.asked) != 3 {
		t.Fatalf("expected the bound to hold, asked %v", source.asked)
	}
}

// The board must still say something when the factory is unreachable at
// startup — the session that has never had a good frame is exactly the one an
// operator opens when the factory is broken.
func TestTheLastGoodFrameSurvivesTheProcess(t *testing.T) {
	cache := Cache{Path: filepath.Join(t.TempDir(), "nested", "board.json")}
	if _, ok := cache.Load(); ok {
		t.Fatal("an empty cache must report itself empty")
	}

	snap := Snapshot{Observation: frame(), LoadedAt: at("2026-08-22T06:00:01Z"), FocusRun: "run_a"}
	if err := cache.Save(snap); err != nil {
		t.Fatalf("Save: %v", err)
	}
	restored, ok := cache.Load()
	if !ok {
		t.Fatal("the saved frame must come back")
	}
	if len(restored.Runs) != 2 || restored.FocusRun != "run_a" || !restored.LoadedAt.Equal(snap.LoadedAt) {
		t.Fatalf("restored: %+v", restored)
	}
}

func TestCachePathIsPerFactoryEndpoint(t *testing.T) {
	one, err := CachePath("https://factory-a.example.com")
	if err != nil {
		t.Fatalf("CachePath: %v", err)
	}
	two, err := CachePath("https://factory-b.example.com")
	if err != nil {
		t.Fatalf("CachePath: %v", err)
	}
	if one == two {
		t.Fatal("two factories must not share one cached board")
	}
	if strings.Contains(filepath.Base(one), "factory-a.example.com") {
		t.Fatal("the cache file name must not spell out the operator's endpoint")
	}
}
