package cmd

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Tick t62: the guard judged a repository-wide frontier, so a run scoped to
// one epic was nudged about every unrelated open tick in the repository, and
// `tk herd watch --clear` was undone by the next spawn. These tests pin the
// fix: a scope covers descendants at any depth, spawn records the epic as the
// scope, the guard judges that scope only and names it, and a cleared watch
// stays cleared.

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

// Spawn arms the watch with the dispatched tick's epic as the scope; a later
// spawn for the same run does not change the target and fills in a missing
// scope only.
func TestArmOrchestratorWatchRecordsScope(t *testing.T) {
	root := armTestRepo(t)
	t.Setenv("HERDR_PANE_ID", "w9T:p1")

	if _, err := armOrchestratorWatch(root, "692"); err != nil {
		t.Fatalf("arm: %v", err)
	}
	s, ok := loadWatchState(root)
	if !ok || s.Scope != "692" {
		t.Fatalf("scope = %q (ok=%v), want 692", s.Scope, ok)
	}

	// A hand registration with no scope gets the spawn's epic filled in, and
	// nothing else touched.
	if err := saveWatchState(root, watchState{Target: "orc", NudgeMax: 7, NudgeIntervalSeconds: 30, NudgeCount: 2}); err != nil {
		t.Fatalf("save: %v", err)
	}
	if target, err := armOrchestratorWatch(root, "abc"); err != nil || target != "" {
		t.Fatalf("arm over existing: target=%q err=%v", target, err)
	}
	s, _ = loadWatchState(root)
	if s.Target != "orc" || s.NudgeMax != 7 || s.NudgeCount != 2 || s.Scope != "abc" {
		t.Fatalf("existing registration altered beyond scope: %+v", s)
	}
}

// `tk herd watch --clear` leaves a tombstone: the next spawn must not re-arm
// the watch. Field-observed: cleared at wave 1, re-armed by the wave-2 spawn,
// six false nudges in one run. An explicit `tk herd watch <target>` replaces
// the tombstone.
func TestClearedWatchIsNotRearmedBySpawn(t *testing.T) {
	ResetFlags()
	root, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure: %v", err)
	}
	t.Setenv("HERDR_PANE_ID", "w9T:p1")

	if _, err := armOrchestratorWatch(root, "692"); err != nil {
		t.Fatalf("arm: %v", err)
	}
	ResetFlags()
	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "watch", "--clear"}); err != nil {
		t.Fatalf("clear: %v\n%s", err, buf.String())
	}

	target, err := armOrchestratorWatch(root, "692")
	if err != nil {
		t.Fatalf("arm after clear: %v", err)
	}
	if target != "" {
		t.Fatalf("spawn re-armed a cleared watch on %q", target)
	}
	if _, ok := loadWatchState(root); ok {
		t.Fatal("watch state present after clear + spawn")
	}

	ResetFlags()
	buf = captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "watch", "--status"}); err != nil {
		t.Fatalf("status: %v", err)
	}
	if !strings.Contains(buf.String(), "cleared for this run") {
		t.Errorf("status should say the watch was cleared: %s", buf.String())
	}

	// Explicit registration replaces the tombstone, scope included.
	ResetFlags()
	buf = captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "watch", "orc", "--scope", "692"}); err != nil {
		t.Fatalf("watch: %v\n%s", err, buf.String())
	}
	s, ok := loadWatchState(root)
	if !ok || s.Target != "orc" || s.Scope != "692" {
		t.Fatalf("explicit watch after clear: ok=%v %+v", ok, s)
	}
}

// The guard judges the run's scope, not the repository: unrelated ready ticks
// do not earn a nudge, and when the scope has work the nudge names it.
func TestGuardJudgesScopedFrontier(t *testing.T) {
	srv, _, store, prompts := guardFixture(t, "idle", 3)

	// Re-register with a scope (guardFixture registers without one).
	ResetFlags()
	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "watch", "orc", "--scope", "ep1", "--nudge-max", "3", "--nudge-interval", "0s"}); err != nil {
		t.Fatalf("watch: %v\n%s", err, buf.String())
	}

	epic := makeTestEpic("ep1")
	closed := makeTestTask("c1")
	closed.Parent = "ep1"
	closed.Status = tick.StatusClosed
	unrelated := makeTestTask("out")
	writeTicks(t, store, epic, closed, unrelated)

	out := runGuard(t, srv)
	if !strings.Contains(out, "at-rest") {
		t.Fatalf("scope ep1 has no open work; guard must be at rest, got: %s", out)
	}
	if prompts.count() != 0 {
		t.Fatalf("guard nudged about work outside the scope: %q", prompts.lastText())
	}

	inScope := makeTestTask("in1")
	inScope.Parent = "ep1"
	writeTicks(t, store, inScope)
	out = runGuard(t, srv)
	if !strings.Contains(out, "nudge") {
		t.Fatalf("scope ep1 now has work; guard must nudge, got: %s", out)
	}
	if prompts.count() != 1 {
		t.Fatalf("nudges = %d, want 1", prompts.count())
	}
	if text := prompts.lastText(); !strings.Contains(text, "frontier of ep1 is actionable: implement in1") {
		t.Errorf("nudge should name the scope and its work: %q", text)
	}
	if strings.Contains(prompts.lastText(), "out") && strings.Contains(prompts.lastText(), "implement out") {
		t.Errorf("nudge must not name unrelated work: %q", prompts.lastText())
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
