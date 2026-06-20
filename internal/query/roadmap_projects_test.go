package query

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// makeContainerParent builds a non-epic container tick (a plain parent). Whether
// it derives as a project or a bucket depends purely on whether its children are
// themselves containers — the role helpers decide, not this constructor.
func makeContainerParent(id, title, status, parent string) tick.Tick {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return tick.Tick{
		ID:        id,
		Title:     title,
		Status:    status,
		Type:      tick.TypeTask, // NOT an epic → passive container
		Parent:    parent,
		Owner:     "test",
		CreatedBy: "test",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// roadmapNodes returns every node in the roadmap keyed by ID.
func roadmapNodes(r Roadmap) map[string]RoadmapEpic {
	out := make(map[string]RoadmapEpic)
	for _, w := range r.Waves {
		for _, re := range w {
			out[re.ID] = re
		}
	}
	return out
}

// TestRoadmap_BucketIsNotAnOrchestrationNode verifies that a passive bucket (a
// non-epic container whose children are all leaves) never appears as a roadmap
// node — only its children would surface elsewhere, and the bucket itself is not
// run as a unit (design §1).
func TestRoadmap_BucketIsNotAnOrchestrationNode(t *testing.T) {
	// b1 is a bucket: plain container with two leaf bug children.
	bucket := makeContainerParent("b1", "Q3 bug triage", tick.StatusOpen, "")
	bug1 := makeTask("g1", "b1", tick.StatusOpen)
	bug2 := makeTask("g2", "b1", tick.StatusClosed)
	// e1 is a normal epic so the roadmap is non-empty.
	epic := makeEpic("e1", "Real epic", tick.StatusOpen)

	got := ComputeRoadmap([]tick.Tick{bucket, bug1, bug2, epic})
	nodes := roadmapNodes(got)

	if _, ok := nodes["b1"]; ok {
		t.Fatalf("bucket b1 must NOT be a roadmap node; nodes = %v", flatWaves(got))
	}
	if _, ok := nodes["e1"]; !ok {
		t.Fatalf("epic e1 must be a roadmap node; nodes = %v", flatWaves(got))
	}
	// The bucket's leaf children are not orchestration nodes either.
	if _, ok := nodes["g1"]; ok {
		t.Fatalf("bucket child g1 must NOT be a roadmap node")
	}
}

// TestRoadmap_ProjectGroupsEpics verifies that a project (a non-epic container
// of containers) is a roadmap node tagged Role=="project", that its child epics
// stay epic nodes, and that each child epic records the project as its Parent.
func TestRoadmap_ProjectGroupsEpics(t *testing.T) {
	// p1 (project) -> e1, e2 (epics) -> tasks.
	project := makeContainerParent("p1", "v2.0 launch", tick.StatusOpen, "")
	e1 := makeEpic("e1", "Auth revamp", tick.StatusInProgress)
	e1.Parent = "p1"
	e2 := makeEpic("e2", "Billing", tick.StatusOpen)
	e2.Parent = "p1"
	e2.After = []string{"e1"}
	t1 := makeTask("t1", "e1", tick.StatusClosed)
	t2 := makeTask("t2", "e2", tick.StatusOpen)

	got := ComputeRoadmap([]tick.Tick{project, e1, e2, t1, t2})
	nodes := roadmapNodes(got)

	p, ok := nodes["p1"]
	if !ok {
		t.Fatalf("project p1 must be a roadmap node; nodes = %v", flatWaves(got))
	}
	if p.Role != "project" {
		t.Errorf("p1 Role = %q, want \"project\"", p.Role)
	}
	if p.Parent != "" {
		t.Errorf("root project p1 Parent = %q, want \"\"", p.Parent)
	}

	for _, id := range []string{"e1", "e2"} {
		e, ok := nodes[id]
		if !ok {
			t.Fatalf("epic %q must be a roadmap node", id)
		}
		if e.Role == "project" {
			t.Errorf("epic %q must not be tagged a project", id)
		}
		if e.Parent != "p1" {
			t.Errorf("epic %q Parent = %q, want \"p1\"", id, e.Parent)
		}
	}

	// Soft ordering between sibling epics is preserved.
	if e2 := nodes["e2"]; len(e2.After) != 1 || e2.After[0] != "e1" {
		t.Errorf("e2 After = %v, want [e1]", nodes["e2"].After)
	}
}

// TestRoadmap_DescendantRollupAtProjectLevel verifies that a project's progress
// counts ALL leaf descendants across its epics (recursive rollup, design §3),
// not just its direct children.
func TestRoadmap_DescendantRollupAtProjectLevel(t *testing.T) {
	project := makeContainerParent("p1", "Release", tick.StatusOpen, "")
	e1 := makeEpic("e1", "E1", tick.StatusInProgress)
	e1.Parent = "p1"
	e2 := makeEpic("e2", "E2", tick.StatusOpen)
	e2.Parent = "p1"
	// e1: 2 leaves, both closed. e2: 2 leaves, 1 closed. Project total = 4, closed = 3.
	leaves := []tick.Tick{
		makeTask("a1", "e1", tick.StatusClosed),
		makeTask("a2", "e1", tick.StatusClosed),
		makeTask("b1", "e2", tick.StatusClosed),
		makeTask("b2", "e2", tick.StatusOpen),
	}
	all := append([]tick.Tick{project, e1, e2}, leaves...)

	got := ComputeRoadmap(all)
	nodes := roadmapNodes(got)

	p := nodes["p1"]
	if p.ChildrenTotal != 4 || p.ChildrenClosed != 3 {
		t.Errorf("project rollup = %d/%d, want 3/4", p.ChildrenClosed, p.ChildrenTotal)
	}
	// Each epic still reports its own leaf rollup.
	if e1 := nodes["e1"]; e1.ChildrenTotal != 2 || e1.ChildrenClosed != 2 {
		t.Errorf("e1 rollup = %d/%d, want 2/2", e1.ChildrenClosed, e1.ChildrenTotal)
	}
	if e2 := nodes["e2"]; e2.ChildrenTotal != 2 || e2.ChildrenClosed != 1 {
		t.Errorf("e2 rollup = %d/%d, want 1/2", e2.ChildrenClosed, e2.ChildrenTotal)
	}

	// A project with at least one open leaf is active, not done.
	if p.Status != epicStatusActive {
		t.Errorf("project status = %q, want %q", p.Status, epicStatusActive)
	}
}

// TestRoadmap_FullyClosedProjectIsDone verifies a project whose every leaf is
// closed rolls up to "done".
func TestRoadmap_FullyClosedProjectIsDone(t *testing.T) {
	project := makeContainerParent("p1", "Shipped", tick.StatusOpen, "")
	e1 := makeEpic("e1", "E1", tick.StatusClosed)
	e1.Parent = "p1"
	t1 := makeTask("t1", "e1", tick.StatusClosed)

	got := ComputeRoadmap([]tick.Tick{project, e1, t1})
	p := roadmapNodes(got)["p1"]
	if p.Status != epicStatusDone {
		t.Errorf("fully-closed project status = %q, want %q", p.Status, epicStatusDone)
	}
}

// TestRoadmap_NestedProjects verifies a project-of-projects: the inner project
// is a node whose Parent is the outer project, and the epic under it is parented
// to the inner project.
func TestRoadmap_NestedProjects(t *testing.T) {
	outer := makeContainerParent("q3", "Q3 Platform", tick.StatusOpen, "")
	inner := makeContainerParent("pay", "Payments", tick.StatusOpen, "q3")
	e1 := makeEpic("e1", "Auth", tick.StatusOpen)
	e1.Parent = "pay"
	t1 := makeTask("t1", "e1", tick.StatusOpen)

	got := ComputeRoadmap([]tick.Tick{outer, inner, e1, t1})
	nodes := roadmapNodes(got)

	if o := nodes["q3"]; o.Role != "project" || o.Parent != "" {
		t.Errorf("outer q3: Role=%q Parent=%q, want project / \"\"", o.Role, o.Parent)
	}
	if in := nodes["pay"]; in.Role != "project" || in.Parent != "q3" {
		t.Errorf("inner pay: Role=%q Parent=%q, want project / q3", in.Role, in.Parent)
	}
	if e := nodes["e1"]; e.Role == "project" || e.Parent != "pay" {
		t.Errorf("epic e1: Role=%q Parent=%q, want epic / pay", e.Role, e.Parent)
	}
}

// TestRoadmap_ProjectlessRoadmapHasNoRoleOrParent is the backwards-compat guard
// at the data level: the only shape that exists today (plain epics, no project)
// must leave Role and Parent empty so the JSON and the flat render are unchanged.
func TestRoadmap_ProjectlessRoadmapHasNoRoleOrParent(t *testing.T) {
	e1 := makeEpic("e1", "A", tick.StatusOpen)
	e2 := makeEpic("e2", "B", tick.StatusInProgress)
	t1 := makeTask("t1", "e2", tick.StatusOpen)

	got := ComputeRoadmap([]tick.Tick{e1, e2, t1})
	for id, n := range roadmapNodes(got) {
		if n.Role != "" {
			t.Errorf("node %q Role = %q, want empty in a project-less roadmap", id, n.Role)
		}
		if n.Parent != "" {
			t.Errorf("node %q Parent = %q, want empty in a project-less roadmap", id, n.Parent)
		}
	}
}
