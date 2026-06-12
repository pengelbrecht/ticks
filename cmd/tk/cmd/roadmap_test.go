package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/styles"
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
// renderEpicGlyph style tests
// ---------------------------------------------------------------------------

// TestRenderEpicGlyph_Styles pins the glyph + style per status. In particular,
// "queued" must render as a MUTED gray ⊘ (StatusOpenStyle), not blocked-red:
// queued means "waiting on an upstream epic" — a planned state, not a problem.
// This matches the TUI and web roadmap renderings.
func TestRenderEpicGlyph_Styles(t *testing.T) {
	cases := []struct {
		status string
		want   string
	}{
		{"done", styles.StatusClosedStyle.Render(styles.IconClosed)},
		{"active", styles.StatusInProgressStyle.Render(styles.IconInProgress)},
		{"gated", styles.StatusAwaitingStyle.Render(styles.IconAwaiting)},
		{"queued", styles.StatusOpenStyle.Render(styles.IconBlocked)},
		{"ready", styles.StatusOpenStyle.Render(styles.IconOpen)},
	}

	for _, tc := range cases {
		t.Run(tc.status, func(t *testing.T) {
			got := renderEpicGlyph(query.RoadmapEpic{ID: "x", Status: tc.status})
			if got != tc.want {
				t.Errorf("glyph for %q: got %q, want %q", tc.status, got, tc.want)
			}
		})
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
// after-edge chain + annotation tests (driven via ExecuteArgs)
// ---------------------------------------------------------------------------

// writeRoadmapEpics writes the given epics into a fresh test repo.
func writeRoadmapEpics(t *testing.T, epics ...tick.Tick) {
	t.Helper()
	_, store := setupTestRepo(t)
	for _, e := range epics {
		if err := store.Write(e); err != nil {
			t.Fatalf("write epic %s: %v", e.ID, err)
		}
	}
}

// TestRoadmapChainFollowsAfterEdges verifies that the chain filter follows
// soft (after) edges in both directions: with B after A, scoping to either
// epic includes the other.
func TestRoadmapChainFollowsAfterEdges(t *testing.T) {
	epicA := makeTestEpic("aa1")
	epicB := makeTestEpic("bb2")
	epicB.After = []string{"aa1"}
	writeRoadmapEpics(t, epicA, epicB)

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"roadmap", "aa1"})
	})
	if !strings.Contains(out, "bb2") {
		t.Errorf("tk roadmap aa1 should include soft-linked epic bb2; got:\n%s", out)
	}

	out = captureStdout(t, func() error {
		return ExecuteArgs([]string{"roadmap", "bb2"})
	})
	if !strings.Contains(out, "aa1") {
		t.Errorf("tk roadmap bb2 should include soft-linked epic aa1; got:\n%s", out)
	}
}

// TestRoadmapAfterAnnotationRendered verifies that an after edge renders as
// an "after:" annotation, not a "blocked by:" annotation.
func TestRoadmapAfterAnnotationRendered(t *testing.T) {
	epicA := makeTestEpic("aa1")
	epicB := makeTestEpic("bb2")
	epicB.After = []string{"aa1"}
	writeRoadmapEpics(t, epicA, epicB)

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"roadmap", "bb2"})
	})
	if !strings.Contains(out, "after: aa1") {
		t.Errorf("expected 'after: aa1' annotation; got:\n%s", out)
	}
	if strings.Contains(out, "blocked by: aa1") {
		t.Errorf("after edge must not render as 'blocked by: aa1'; got:\n%s", out)
	}
}

// TestRoadmapMixedAnnotationsOrder verifies that an epic with both hard and
// soft edges shows both annotations on its line, blocked-by first.
func TestRoadmapMixedAnnotationsOrder(t *testing.T) {
	epicA := makeTestEpic("aa1")
	epicB := makeTestEpic("bb2")
	epicC := makeTestEpic("cc3")
	epicC.BlockedBy = []string{"aa1"}
	epicC.After = []string{"bb2"}
	writeRoadmapEpics(t, epicA, epicB, epicC)

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"roadmap", "cc3"})
	})

	var line string
	for _, l := range strings.Split(out, "\n") {
		if strings.Contains(l, "cc3") {
			line = l
			break
		}
	}
	if line == "" {
		t.Fatalf("no line for epic cc3 in output:\n%s", out)
	}

	blockedIdx := strings.Index(line, "blocked by: aa1")
	afterIdx := strings.Index(line, "after: bb2")
	if blockedIdx < 0 {
		t.Errorf("expected 'blocked by: aa1' on cc3 line; got: %s", line)
	}
	if afterIdx < 0 {
		t.Errorf("expected 'after: bb2' on cc3 line; got: %s", line)
	}
	if blockedIdx >= 0 && afterIdx >= 0 && blockedIdx > afterIdx {
		t.Errorf("blocked-by annotation must come before after annotation; got: %s", line)
	}
}

// TestRoadmapJSONShapeWithAfter verifies that --json output keeps the
// query.Roadmap shape with after edges present (the after key comes straight
// from ComputeRoadmap; rendering changes must not alter the JSON).
func TestRoadmapJSONShapeWithAfter(t *testing.T) {
	epicA := makeTestEpic("aa1")
	epicB := makeTestEpic("bb2")
	epicB.After = []string{"aa1"}
	writeRoadmapEpics(t, epicA, epicB)

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"roadmap", "--json"})
	})

	var m map[string]any
	if err := json.Unmarshal([]byte(out), &m); err != nil {
		t.Fatalf("unmarshal --json output: %v\noutput: %s", err, out)
	}
	waves, ok := m["waves"].([]any)
	if !ok || len(waves) == 0 {
		t.Fatalf("expected non-empty 'waves' array, got %v", m["waves"])
	}

	var found bool
	for _, w := range waves {
		wave, ok := w.([]any)
		if !ok {
			t.Fatalf("expected wave to be an array, got %T", w)
		}
		for _, e := range wave {
			epic, ok := e.(map[string]any)
			if !ok {
				t.Fatalf("expected epic object, got %T", e)
			}
			for _, key := range []string{"id", "title", "status"} {
				if _, exists := epic[key]; !exists {
					t.Errorf("expected key %q in epic JSON; got keys: %v", key, mapKeys(epic))
				}
			}
			if epic["id"] == "bb2" {
				found = true
				after, ok := epic["after"].([]any)
				if !ok || len(after) != 1 || after[0] != "aa1" {
					t.Errorf("expected bb2 'after' to be [\"aa1\"], got %v", epic["after"])
				}
			}
		}
	}
	if !found {
		t.Errorf("epic bb2 not found in JSON output:\n%s", out)
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
