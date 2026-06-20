package tui

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func awaitingTick(id, owner string) tick.Tick {
	t := fixtureTick(id, "needs review", tick.StatusInProgress, 1)
	t.Owner = owner
	aw := tick.AwaitingApproval
	t.Awaiting = &aw
	return t
}

// TestSidebarAwaitingCount verifies the Awaiting smart-view badge counts ticks
// gated on the current user (acceptance: Awaiting count).
func TestSidebarAwaitingCount(t *testing.T) {
	ticks := []tick.Tick{
		awaitingTick("a1", "peter"),
		awaitingTick("a2", ""), // ownerless awaiting always counts
		awaitingTick("a3", "ana"),
		fixtureTick("n1", "normal", tick.StatusOpen, 2),
	}
	s := NewSidebar(ticks, "peter")
	if got := s.awaitingCount(); got != 2 {
		t.Fatalf("awaitingCount(peter) = %d, want 2 (a1 + ownerless a2)", got)
	}

	sAll := NewSidebar(ticks, "")
	if got := sAll.awaitingCount(); got != 3 {
		t.Fatalf("awaitingCount(no owner) = %d, want 3", got)
	}
}

// TestSidebarAwaitingBadgeRendered verifies the count appears in the rendered
// Awaiting row.
func TestSidebarAwaitingBadgeRendered(t *testing.T) {
	ticks := []tick.Tick{awaitingTick("a1", "peter"), awaitingTick("a2", "peter")}
	s := NewSidebar(ticks, "peter")
	s.SetSize(28, 40)
	out := s.View(true)
	if !strings.Contains(out, "Awaiting (2)") {
		t.Fatalf("sidebar render missing 'Awaiting (2)':\n%s", out)
	}
}

// TestSidebarSmartViewSelection verifies moving the cursor selects the expected
// smart view and reports a scope change (acceptance: smart-view selection).
func TestSidebarSmartViewSelection(t *testing.T) {
	s := NewSidebar(sampleTicks(), "peter")

	if got := s.SelectedScope(); got.Kind != scopeSmart || got.Smart != smartAwaiting {
		t.Fatalf("initial scope = %+v, want Awaiting", got)
	}

	// Move down to "My ticks".
	s2, changed := s.Update(keyMsg("j"))
	if !changed {
		t.Fatal("moving to My ticks reported no scope change")
	}
	if got := s2.SelectedScope(); got.Smart != smartMyTicks {
		t.Fatalf("after j: smart = %v, want My ticks", got.Smart)
	}
}

// TestSidebarProjectTreeCollapseExpand verifies space/enter collapses and
// expands a project-tree node via Update, hiding/showing its child containers
// (acceptance: project-tree collapse/expand via Update).
func TestSidebarProjectTreeCollapseExpand(t *testing.T) {
	// project -> epic -> child (epic is a container so it shows in the tree).
	proj := fixtureTick("prj", "Q3 Platform", tick.StatusOpen, 1)
	epic := fixtureTick("ep1", "Auth revamp", tick.StatusInProgress, 1)
	epic.Type = tick.TypeEpic
	epic.Parent = "prj"
	child := fixtureTick("a1b", "token refresh", tick.StatusInProgress, 1)
	child.Parent = "ep1"
	ticks := []tick.Tick{proj, epic, child}

	s := NewSidebar(ticks, "")

	// Find and select the project row (prj), then collapse it.
	if !selectNode(&s, "prj") {
		t.Fatal("project node prj not present in tree")
	}
	if !treeHasNode(s, "ep1") {
		t.Fatal("expected epic ep1 visible under expanded project")
	}

	s, _ = s.Update(keyMsg(" ")) // collapse prj
	if treeHasNode(s, "ep1") {
		t.Fatal("epic ep1 still visible after collapsing project")
	}

	s, _ = s.Update(keyMsg(" ")) // expand prj
	if !treeHasNode(s, "ep1") {
		t.Fatal("epic ep1 not restored after expanding project")
	}
}

// TestSidebarNodeScopeFiltersSubtree verifies selecting a tree node scopes the
// content set to that node's subtree.
func TestSidebarNodeScopeFiltersSubtree(t *testing.T) {
	ticks := sampleTicks() // ep1 -> {a1b, x9k}, plus solo q2m
	sub := FilterScope(ticks, Scope{Kind: scopeNode, Node: "ep1"}, "")
	ids := map[string]bool{}
	for _, t := range sub {
		ids[t.ID] = true
	}
	if !ids["ep1"] || !ids["a1b"] || !ids["x9k"] {
		t.Fatalf("subtree(ep1) missing members: %v", ids)
	}
	if ids["q2m"] {
		t.Fatal("subtree(ep1) wrongly included unrelated tick q2m")
	}
}

// selectNode moves the sidebar cursor onto the tree node with the given id.
func selectNode(s *Sidebar, id string) bool {
	for i, r := range s.rows {
		if r.node != nil && r.node.id == id {
			s.selected = i
			return true
		}
	}
	return false
}

// treeHasNode reports whether a tree node with id is currently visible.
func treeHasNode(s Sidebar, id string) bool {
	for _, r := range s.rows {
		if r.node != nil && r.node.id == id {
			return true
		}
	}
	return false
}
