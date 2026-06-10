package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// captureRoadmapHuman runs renderRoadmapHuman with the given roadmap and
// returns the captured stdout.
func captureRoadmapHuman(t *testing.T, roadmap query.Roadmap) string {
	t.Helper()

	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	renderErr := renderRoadmapHuman(roadmap)

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	if renderErr != nil {
		t.Fatalf("renderRoadmapHuman returned error: %v", renderErr)
	}
	return buf.String()
}

// makeEpic is a small helper to build test RoadmapEpics quickly.
func makeEpic(id, title, status string, total, closed int, awaitingType string, blockedBy []string) query.RoadmapEpic {
	re := query.RoadmapEpic{
		ID:             id,
		Title:          title,
		Status:         status,
		AwaitingType:   awaitingType,
		BlockedBy:      blockedBy,
		ChildrenTotal:  total,
		ChildrenClosed: closed,
	}
	return re
}

// ---------------------------------------------------------------------------
// filterRoadmapChain tests
// ---------------------------------------------------------------------------

func TestFilterRoadmapChain_SingleEpic(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("a1", "Alpha", "done", 2, 2, "", nil)},
			{makeEpic("b1", "Beta", "active", 3, 1, "", []string{"a1"})},
			{makeEpic("c1", "Gamma", "queued", 0, 0, "", []string{"b1"})},
			{makeEpic("z1", "Zeta", "ready", 0, 0, "", nil)}, // unrelated
		},
	}

	// Request the chain containing b1: should get a1, b1, c1 but not z1.
	result := filterRoadmapChain(roadmap, "b1")

	// Collect all IDs in the result.
	ids := collectIDs(result)

	for _, want := range []string{"a1", "b1", "c1"} {
		if !ids[want] {
			t.Errorf("expected epic %q in chain result, but it was absent; got ids: %v", want, sortedKeys(ids))
		}
	}
	if ids["z1"] {
		t.Errorf("expected epic z1 to be excluded from chain result")
	}
}

func TestFilterRoadmapChain_NoChain(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("a1", "Alpha", "done", 2, 2, "", nil)},
		},
	}

	result := filterRoadmapChain(roadmap, "missing")
	if len(result.Waves) != 0 {
		t.Errorf("expected empty roadmap for missing epic, got %d waves", len(result.Waves))
	}
}

func TestFilterRoadmapChain_UnconnectedEpicExcluded(t *testing.T) {
	// Two independent chains: a1→b1, and x1→y1. Filter for a1 — y1/x1 must be absent.
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{
				makeEpic("a1", "Alpha", "done", 1, 1, "", nil),
				makeEpic("x1", "Xi", "done", 1, 1, "", nil),
			},
			{
				makeEpic("b1", "Beta", "active", 0, 0, "", []string{"a1"}),
				makeEpic("y1", "Psi", "active", 0, 0, "", []string{"x1"}),
			},
		},
	}

	result := filterRoadmapChain(roadmap, "a1")
	ids := collectIDs(result)

	if ids["x1"] || ids["y1"] {
		t.Errorf("expected x1 and y1 to be excluded; got ids: %v", sortedKeys(ids))
	}
	if !ids["a1"] || !ids["b1"] {
		t.Errorf("expected a1 and b1 in result; got ids: %v", sortedKeys(ids))
	}
}

func TestFilterRoadmapChain_EmptyWavesDropped(t *testing.T) {
	// Wave 1 has x1 (unrelated) and a1. Wave 2 has b1 (blocks a1) only.
	// Filtering for b1: wave 1 should retain only a1; x1 is dropped.
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{
				makeEpic("x1", "Xi", "done", 0, 0, "", nil),
				makeEpic("a1", "Alpha", "done", 0, 0, "", nil),
			},
			{
				makeEpic("b1", "Beta", "active", 0, 0, "", []string{"a1"}),
			},
		},
	}

	result := filterRoadmapChain(roadmap, "b1")

	if len(result.Waves) != 2 {
		t.Errorf("expected 2 waves after filtering, got %d", len(result.Waves))
	}
	// Wave 1 should have only a1.
	if len(result.Waves[0]) != 1 || result.Waves[0][0].ID != "a1" {
		t.Errorf("expected wave 1 to contain only a1, got %v", result.Waves[0])
	}
}

// ---------------------------------------------------------------------------
// renderRoadmapHuman output tests
// ---------------------------------------------------------------------------

func TestRenderRoadmapHuman_WaveHeaders(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("a1", "Alpha", "done", 2, 2, "", nil)},
			{makeEpic("b1", "Beta", "active", 3, 1, "", []string{"a1"})},
		},
	}

	out := captureRoadmapHuman(t, roadmap)

	if !strings.Contains(out, "Wave 1") {
		t.Errorf("expected 'Wave 1' in output; got:\n%s", out)
	}
	if !strings.Contains(out, "Wave 2") {
		t.Errorf("expected 'Wave 2' in output; got:\n%s", out)
	}
}

func TestRenderRoadmapHuman_EpicIDAndTitlePresent(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("abc", "My Epic Title", "active", 5, 3, "", nil)},
		},
	}

	out := captureRoadmapHuman(t, roadmap)

	if !strings.Contains(out, "abc") {
		t.Errorf("expected epic id 'abc' in output; got:\n%s", out)
	}
	if !strings.Contains(out, "My Epic Title") {
		t.Errorf("expected epic title in output; got:\n%s", out)
	}
}

func TestRenderRoadmapHuman_TickCountBadge(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("e1", "Epic", "active", 10, 7, "", nil)},
		},
	}

	out := captureRoadmapHuman(t, roadmap)

	if !strings.Contains(out, "7/10") {
		t.Errorf("expected '7/10' tick count in output; got:\n%s", out)
	}
}

func TestRenderRoadmapHuman_ReadyAnnotation(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("r1", "Ready Epic", "ready", 0, 0, "", nil)},
		},
	}

	out := captureRoadmapHuman(t, roadmap)

	if !strings.Contains(out, "needs planning") {
		t.Errorf("expected 'needs planning' annotation for ready epic; got:\n%s", out)
	}
}

func TestRenderRoadmapHuman_GatedBadge(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("g1", "Gated Epic", "gated", 3, 1, "approval", nil)},
		},
	}

	out := captureRoadmapHuman(t, roadmap)

	if !strings.Contains(out, "awaiting:approval") {
		t.Errorf("expected 'awaiting:approval' badge for gated epic; got:\n%s", out)
	}
}

func TestRenderRoadmapHuman_DoneEpicNoAnnotation(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("d1", "Done Epic", "done", 5, 5, "", nil)},
		},
	}

	out := captureRoadmapHuman(t, roadmap)

	if strings.Contains(out, "needs planning") {
		t.Errorf("expected no 'needs planning' for done epic; got:\n%s", out)
	}
	if strings.Contains(out, "awaiting:") {
		t.Errorf("expected no 'awaiting:' badge for done epic; got:\n%s", out)
	}
}

func TestRenderRoadmapHuman_LegendPresent(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("a1", "Alpha", "done", 1, 1, "", nil)},
		},
	}

	out := captureRoadmapHuman(t, roadmap)

	if !strings.Contains(out, "Legend:") {
		t.Errorf("expected 'Legend:' line in output; got:\n%s", out)
	}
}

func TestRenderRoadmapHuman_SummaryLine(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("a1", "Alpha", "done", 1, 1, "", nil)},
			{
				makeEpic("b1", "Beta", "active", 3, 1, "", []string{"a1"}),
				makeEpic("c1", "Gamma", "ready", 0, 0, "", nil),
			},
		},
	}

	out := captureRoadmapHuman(t, roadmap)

	if !strings.Contains(out, "3 epics") {
		t.Errorf("expected '3 epics' in summary; got:\n%s", out)
	}
	if !strings.Contains(out, "1 done") {
		t.Errorf("expected '1 done' in summary; got:\n%s", out)
	}
	if !strings.Contains(out, "1 active") {
		t.Errorf("expected '1 active' in summary; got:\n%s", out)
	}
	if !strings.Contains(out, "1 ready") {
		t.Errorf("expected '1 ready' in summary; got:\n%s", out)
	}
}

// ---------------------------------------------------------------------------
// JSON output test
// ---------------------------------------------------------------------------

func TestRoadmapJSONShape(t *testing.T) {
	// Build a minimal roadmap and marshal it; verify the query.Roadmap shape.
	now := time.Now()
	allTicks := []tick.Tick{
		{
			ID: "ep1", Title: "First Epic", Type: tick.TypeEpic,
			Status: tick.StatusOpen, CreatedAt: now, UpdatedAt: now,
		},
		{
			ID: "ep2", Title: "Second Epic", Type: tick.TypeEpic,
			Status: tick.StatusOpen, BlockedBy: []string{"ep1"},
			CreatedAt: now, UpdatedAt: now,
		},
	}

	roadmap := query.ComputeRoadmap(allTicks)

	data, err := json.Marshal(roadmap)
	if err != nil {
		t.Fatalf("marshal roadmap: %v", err)
	}

	// Must have top-level "waves" key.
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	waves, ok := m["waves"]
	if !ok {
		t.Fatalf("expected 'waves' key in JSON output")
	}
	waveSlice, ok := waves.([]any)
	if !ok || len(waveSlice) == 0 {
		t.Fatalf("expected non-empty waves array, got %v", waves)
	}

	// Each wave must be an array; first element of first wave must have id/title/status.
	firstWave, ok := waveSlice[0].([]any)
	if !ok || len(firstWave) == 0 {
		t.Fatalf("expected non-empty first wave, got %v", waveSlice[0])
	}
	firstEpic, ok := firstWave[0].(map[string]any)
	if !ok {
		t.Fatalf("expected object in first wave, got %T", firstWave[0])
	}
	for _, key := range []string{"id", "title", "status"} {
		if _, exists := firstEpic[key]; !exists {
			t.Errorf("expected key %q in epic JSON object; got keys: %v", key, mapKeys(firstEpic))
		}
	}
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

func collectIDs(r query.Roadmap) map[string]bool {
	ids := make(map[string]bool)
	for _, wave := range r.Waves {
		for _, re := range wave {
			ids[re.ID] = true
		}
	}
	return ids
}

func sortedKeys(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

func mapKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
