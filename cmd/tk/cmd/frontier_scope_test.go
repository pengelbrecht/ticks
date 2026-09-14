package cmd

import (
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Tick t62 fixed the guard's frontier scope to cover descendants at any
// depth rather than the whole repository; the guard/watch machinery itself
// has since moved to ticfac (tick nkf). These tests pin what is left in
// ticks: a scope's frontier reaches its grandchildren, and the close-time
// verdict is judged against the closed tick's container.

func writeTicks(t *testing.T, store *tick.Store, ticks ...tick.Tick) {
	t.Helper()
	for _, tk := range ticks {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}
}

// A project holds epics; the epics hold ticks. Judging the project must see
// the grandchildren — query.Filter.Parent is one level, the scope is a tree.
func TestFrontierScopeCoversDescendants(t *testing.T) {
	_, store := frontierTestSetup(t)
	project := makeTestTask("prj")
	epic := makeTestEpic("ep1")
	epic.Parent = "prj"
	leaf := makeTestTask("lf1")
	leaf.Parent = "ep1"
	outside := makeTestTask("out")
	writeTicks(t, store, project, epic, leaf, outside)

	r := frontierJSONReport(t, "prj")
	if r.Scope != "prj" {
		t.Fatalf("scope = %q, want prj", r.Scope)
	}
	ids := map[string]bool{}
	for _, it := range r.Items {
		ids[it.TickID] = true
	}
	if !ids["lf1"] {
		t.Errorf("project scope must reach the grandchild lf1: %+v", r.Items)
	}
	if ids["out"] {
		t.Errorf("project scope must not see the unrelated tick out: %+v", r.Items)
	}

	// A scope whose only open work is elsewhere is at rest, however busy the
	// repository is — that is the whole point.
	quiet := makeTestEpic("ep2")
	done := makeTestTask("dn2")
	done.Parent = "ep2"
	done.Status = tick.StatusClosed
	writeTicks(t, store, quiet, done)
	r = frontierJSONReport(t, "ep2")
	if r.Actionable {
		t.Errorf("ep2 has no open work and must be at rest, got %+v", r.Items)
	}
	if r.scopeLabel() != " of ep2" {
		t.Errorf("scope label should name the scope: %q", r.scopeLabel())
	}
}

// The close-time verdict is judged against the closed tick's container.
func TestCloseFrontierScope(t *testing.T) {
	root, store := frontierTestSetup(t)
	project := makeTestTask("prj")
	epic := makeTestEpic("ep1")
	epic.Parent = "prj"
	closeout := makeTestTask("co1")
	closeout.Parent = "ep1"
	closeout.Role = tick.RoleCloseout
	leaf := makeTestTask("lf1")
	leaf.Parent = "ep1"
	writeTicks(t, store, project, epic, closeout, leaf)

	if got := closeFrontierScope(root, leaf); got != "ep1" {
		t.Errorf("leaf scope = %q, want ep1", got)
	}
	if got := closeFrontierScope(root, closeout); got != "prj" {
		t.Errorf("closeout scope = %q, want the enclosing project prj", got)
	}
	if got := closeFrontierScope(root, epic); got != "prj" {
		t.Errorf("epic scope = %q, want prj", got)
	}
	if got := closeFrontierScope(root, project); got != "" {
		t.Errorf("top-level scope = %q, want repository-wide", got)
	}
}
