package cmd

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// tk frontier is the continuation predicate: exit 0 must mean "someone should
// be picking up work", exit 1 must mean "legitimately at rest", and a claimed
// tick is never read as actionable.

func frontierTestSetup(t *testing.T) (string, *tick.Store) {
	t.Helper()
	ResetFlags()
	repo, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}
	return repo, store
}

func frontierJSONReport(t *testing.T, args ...string) frontierReport {
	t.Helper()
	ResetFlags()
	full := append([]string{"frontier"}, args...)
	full = append(full, "--json")
	out := captureStdout(t, func() error { return ExecuteArgs(full) })
	var r frontierReport
	if err := json.Unmarshal([]byte(out), &r); err != nil {
		t.Fatalf("decode frontier json: %v\n%s", err, out)
	}
	return r
}

func TestFrontierActionableImplementAndPlan(t *testing.T) {
	_, store := frontierTestSetup(t)
	if err := store.Write(makeTestTask("t01")); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := store.Write(makeTestEpic("e01")); err != nil {
		t.Fatalf("write: %v", err)
	}

	r := frontierJSONReport(t)
	if !r.Actionable {
		t.Fatalf("expected actionable, got %+v", r)
	}
	actions := map[string]string{}
	for _, it := range r.Items {
		actions[it.TickID] = it.Action
	}
	if actions["t01"] != "implement" {
		t.Errorf("t01 action = %q, want implement", actions["t01"])
	}
	if actions["e01"] != "plan" {
		t.Errorf("e01 action = %q, want plan (childless unblocked epic)", actions["e01"])
	}

	// --check: actionable is exit 0.
	ResetFlags()
	_ = captureStdout(t, func() error {
		return ExecuteArgs([]string{"frontier", "--check"})
	})
}

func TestFrontierAtRestOnAwaiting(t *testing.T) {
	_, store := frontierTestSetup(t)
	tk := makeTestTask("t01")
	awaiting := tick.AwaitingApproval
	tk.Awaiting = &awaiting
	if err := store.Write(tk); err != nil {
		t.Fatalf("write: %v", err)
	}

	r := frontierJSONReport(t)
	if r.Actionable {
		t.Fatalf("awaiting-only scope must be at rest: %+v", r)
	}
	if len(r.Waiting) != 1 || r.Waiting[0].Awaiting != "approval" {
		t.Errorf("waiting = %+v, want one approval entry", r.Waiting)
	}

	// --check: at rest is exit 1 (ExitGeneric), distinguishable from usage/repo errors.
	ResetFlags()
	err := ExecuteArgs([]string{"frontier", "--check"})
	if err == nil {
		t.Fatal("frontier --check at rest should exit nonzero")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("at-rest exit code = %d, want %d", code, ExitGeneric)
	}
	if !strings.Contains(err.Error(), "at rest") {
		t.Errorf("at-rest error should say so: %v", err)
	}
}

// A claimed tick is in flight, never actionable: tk has no worker evidence to
// judge it by, and a claim is the claimant's to finish. A RESULT file lying in
// the repository changes nothing — the tracker no longer reads runner output.
func TestFrontierInProgressIsInFlight(t *testing.T) {
	repo, store := frontierTestSetup(t)

	epic := makeTestEpic("e01")
	if err := store.Write(epic); err != nil {
		t.Fatalf("write: %v", err)
	}
	for _, id := range []string{"t01", "t02"} {
		tk := makeTestTask(id)
		tk.Parent = "e01"
		tk.Status = tick.StatusInProgress
		if err := store.Write(tk); err != nil {
			t.Fatalf("write: %v", err)
		}
	}
	if err := os.WriteFile(filepath.Join(repo, "RESULT-t01.md"), []byte("STATUS: DONE\n"), 0o644); err != nil {
		t.Fatalf("write result: %v", err)
	}

	r := frontierJSONReport(t)
	if r.Actionable {
		t.Fatalf("claimed ticks are in flight, not actionable: %+v", r)
	}
	if len(r.InFlight) != 2 {
		t.Errorf("in_flight = %+v, want t01 and t02", r.InFlight)
	}
}

// Roles pick the action; a checkpoint waits on a human like every other
// awaiting type, and there is no flag that flows through it.
func TestFrontierRolesAndCheckpoint(t *testing.T) {
	_, store := frontierTestSetup(t)

	review := makeTestTask("rev")
	review.Role = tick.RoleReview
	if err := store.Write(review); err != nil {
		t.Fatalf("write: %v", err)
	}
	checkpoint := makeTestTask("chk")
	awaiting := tick.AwaitingCheckpoint
	checkpoint.Awaiting = &awaiting
	if err := store.Write(checkpoint); err != nil {
		t.Fatalf("write: %v", err)
	}

	r := frontierJSONReport(t)
	if len(r.Items) != 1 || r.Items[0].Action != "review" {
		t.Errorf("items = %+v, want [review rev]", r.Items)
	}
	if len(r.Waiting) != 1 || r.Waiting[0].TickID != "chk" {
		t.Errorf("waiting = %+v, want [chk]", r.Waiting)
	}

	ResetFlags()
	if err := ExecuteArgs([]string{"frontier", "--autonomous", "--json"}); GetExitCode(err) != ExitUsage {
		t.Errorf("--autonomous is gone and must be a usage error, got %v", err)
	}
}

func TestFrontierDone(t *testing.T) {
	_, store := frontierTestSetup(t)
	tk := makeTestTask("t01")
	tk.Status = tick.StatusClosed
	if err := store.Write(tk); err != nil {
		t.Fatalf("write: %v", err)
	}

	r := frontierJSONReport(t)
	if r.Actionable || !r.Done {
		t.Errorf("all-closed scope should be done and not actionable: %+v", r)
	}
}

func TestFrontierScoped(t *testing.T) {
	_, store := frontierTestSetup(t)

	epic := makeTestEpic("e01")
	if err := store.Write(epic); err != nil {
		t.Fatalf("write: %v", err)
	}
	child := makeTestTask("in1")
	child.Parent = "e01"
	if err := store.Write(child); err != nil {
		t.Fatalf("write: %v", err)
	}
	outside := makeTestTask("out")
	if err := store.Write(outside); err != nil {
		t.Fatalf("write: %v", err)
	}

	r := frontierJSONReport(t, "e01")
	ids := map[string]bool{}
	for _, it := range r.Items {
		ids[it.TickID] = true
	}
	if !ids["in1"] || ids["out"] {
		t.Errorf("scoped frontier should see in1 and not out: %+v", r.Items)
	}
}

func TestFrontierScopedChildlessEpicIsNotDone(t *testing.T) {
	// A childless open epic scoped by id yields a plan item; the report must
	// not simultaneously claim "done: no open ticks in scope" — the scope
	// container itself is part of the scope.
	_, store := frontierTestSetup(t)
	if err := store.Write(makeTestEpic("e01")); err != nil {
		t.Fatalf("write: %v", err)
	}

	r := frontierJSONReport(t, "e01")
	if !r.Actionable || len(r.Items) != 1 || r.Items[0].Action != "plan" {
		t.Fatalf("childless scoped epic should be [plan e01]: %+v", r)
	}
	if r.Done {
		t.Errorf("an actionable scope must not also report done: %+v", r)
	}
}
