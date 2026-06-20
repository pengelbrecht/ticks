package cmd

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// TestRenderRoadmapHuman_ProjectNestsEpics verifies the tree layout: a project
// header line is printed and its member epics are indented beneath it (deeper
// than the project's own indent), while the per-epic edge annotations survive.
func TestRenderRoadmapHuman_ProjectNestsEpics(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{
				query.RoadmapEpic{ID: "p1", Title: "v2.0 launch", Status: "active", Role: "project", ChildrenTotal: 4, ChildrenClosed: 1},
				query.RoadmapEpic{ID: "e1", Title: "Auth", Status: "active", Parent: "p1", ChildrenTotal: 2, ChildrenClosed: 1},
			},
			{
				query.RoadmapEpic{ID: "e2", Title: "Billing", Status: "ready", Parent: "p1", After: []string{"e1"}},
			},
		},
	}

	out := captureRoadmapHuman(t, roadmap)

	// Project, both epics present.
	for _, id := range []string{"p1", "e1", "e2"} {
		if !strings.Contains(out, id) {
			t.Errorf("expected %q in output; got:\n%s", id, out)
		}
	}

	pLine := lineContaining(t, out, "p1")
	e1Line := lineContaining(t, out, "e1")
	e2Line := lineContaining(t, out, "e2")

	pIndent := leadingSpaces(pLine)
	if leadingSpaces(e1Line) <= pIndent {
		t.Errorf("epic e1 must be indented deeper than its project p1\nproject: %q\nepic: %q", pLine, e1Line)
	}
	if leadingSpaces(e2Line) <= pIndent {
		t.Errorf("epic e2 must be indented deeper than its project p1\nproject: %q\nepic: %q", pLine, e2Line)
	}

	// Soft edge annotation preserved on the nested epic.
	if !strings.Contains(e2Line, "after: e1") {
		t.Errorf("expected 'after: e1' annotation on nested epic e2; got: %q", e2Line)
	}
	// No "Wave N" headers in tree mode.
	if strings.Contains(out, "Wave 1") {
		t.Errorf("tree layout should not print wave headers; got:\n%s", out)
	}
}

// TestRoadmapExcludesBucket is an end-to-end check via ExecuteArgs: a passive
// bucket (non-epic container of leaves) must not appear as a roadmap node, while
// a real epic does.
func TestRoadmapExcludesBucket(t *testing.T) {
	_, store := setupTestRepo(t)

	// Bucket: plain container (a task type) with two leaf children.
	bucket := makeTestTask("buck1")
	bucket.Title = "Q3 bug triage"
	child1 := makeTestTask("bg1")
	child1.Parent = "buck1"
	child2 := makeTestTask("bg2")
	child2.Parent = "buck1"
	// A real epic so the roadmap renders.
	epic := makeTestEpic("ep9")

	for _, tk := range []tick.Tick{bucket, child1, child2, epic} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"roadmap"})
	})

	if strings.Contains(out, "buck1") {
		t.Errorf("bucket buck1 must NOT appear as a roadmap node; got:\n%s", out)
	}
	if !strings.Contains(out, "ep9") {
		t.Errorf("epic ep9 must appear in roadmap; got:\n%s", out)
	}
}

// TestRoadmapProjectGroupsEpicsEndToEnd verifies via ExecuteArgs that a project
// container groups its epics in the rendered output.
func TestRoadmapProjectGroupsEpicsEndToEnd(t *testing.T) {
	_, store := setupTestRepo(t)

	project := makeTestTask("proj1") // non-epic container → project once it holds epics
	project.Title = "v2.0 launch"
	e1 := makeTestEpic("epa")
	e1.Parent = "proj1"
	e2 := makeTestEpic("epb")
	e2.Parent = "proj1"
	// Give the epics children so they are real (populated) epics, not empty ones.
	c1 := makeTestTask("ca")
	c1.Parent = "epa"
	c2 := makeTestTask("cb")
	c2.Parent = "epb"

	for _, tk := range []tick.Tick{project, e1, e2, c1, c2} {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"roadmap"})
	})

	for _, id := range []string{"proj1", "epa", "epb"} {
		if !strings.Contains(out, id) {
			t.Errorf("expected %q in roadmap output; got:\n%s", id, out)
		}
	}

	projLine := lineContaining(t, out, "proj1")
	epaLine := lineContaining(t, out, "epa")
	if leadingSpaces(epaLine) <= leadingSpaces(projLine) {
		t.Errorf("epic epa must be nested under project proj1\nproject: %q\nepic: %q", projLine, epaLine)
	}
}

// TestRoadmapProjectlessRendersFlat is the render-level backwards-compat guard:
// with no project, the wave headers and flat layout are preserved.
func TestRoadmapProjectlessRendersFlat(t *testing.T) {
	roadmap := query.Roadmap{
		Waves: [][]query.RoadmapEpic{
			{makeEpic("a1", "Alpha", "active", 2, 1, "", nil)},
		},
	}
	out := captureRoadmapHuman(t, roadmap)
	if !strings.Contains(out, "Wave 1") {
		t.Errorf("project-less roadmap must keep 'Wave 1' header; got:\n%s", out)
	}
}

// lineContaining returns the first output line containing sub, or fails.
func lineContaining(t *testing.T, out, sub string) string {
	t.Helper()
	for _, l := range strings.Split(out, "\n") {
		if strings.Contains(l, sub) {
			return l
		}
	}
	t.Fatalf("no line containing %q in output:\n%s", sub, out)
	return ""
}

// leadingSpaces counts the leading ASCII spaces of a line (the indent depth).
func leadingSpaces(s string) int {
	n := 0
	for _, r := range s {
		if r != ' ' {
			break
		}
		n++
	}
	return n
}
