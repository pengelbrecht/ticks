package cmd

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// tk decide is the decide-and-log rung of the mid-run decision ladder: it must
// record a parseable decision line, refuse to stand in for a human's parked
// decision, and round-trip through tk decisions.

func decideTestSetup(t *testing.T) (string, *tick.Store) {
	t.Helper()
	ResetFlags()
	repo, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}
	return repo, store
}

func TestDecideRecordsStructuredNote(t *testing.T) {
	_, store := decideTestSetup(t)
	if err := store.Write(makeTestTask("abc123")); err != nil {
		t.Fatalf("write tick: %v", err)
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"decide", "abc123",
			"--question", "Which DB driver?",
			"--choice", "pgx",
			"--reason", "maintained, ctx support",
			"--class", "library-choice"})
	})
	if !strings.Contains(out, "decision: Which DB driver? → pgx — maintained, ctx support [class:library-choice]") {
		t.Errorf("decide output missing decision line: %q", out)
	}

	updated, err := store.Read("abc123")
	if err != nil {
		t.Fatalf("read tick: %v", err)
	}
	if !strings.Contains(updated.Notes, "decision: Which DB driver? → pgx — maintained, ctx support [class:library-choice]") {
		t.Errorf("notes missing decision line:\n%s", updated.Notes)
	}
}

func TestDecideRequiresAllFields(t *testing.T) {
	_, store := decideTestSetup(t)
	if err := store.Write(makeTestTask("abc123")); err != nil {
		t.Fatalf("write tick: %v", err)
	}

	err := ExecuteArgs([]string{"decide", "abc123", "--question", "Q?", "--choice", "yes"})
	if err == nil {
		t.Fatal("decide without --reason should fail")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

func TestDecideRefusesAwaitingTick(t *testing.T) {
	_, store := decideTestSetup(t)
	tk := makeTestTask("abc123")
	awaiting := tick.AwaitingInput
	tk.Awaiting = &awaiting
	if err := store.Write(tk); err != nil {
		t.Fatalf("write tick: %v", err)
	}

	err := ExecuteArgs([]string{"decide", "abc123",
		"--question", "Q?", "--choice", "yes", "--reason", "because"})
	if err == nil {
		t.Fatal("decide on an awaiting tick should refuse: the parked decision is the human's")
	}
	if !strings.Contains(err.Error(), "awaiting") {
		t.Errorf("refusal should name the awaiting state, got: %v", err)
	}

	// The refusal must leave the tick untouched.
	after, readErr := store.Read("abc123")
	if readErr != nil {
		t.Fatalf("read tick: %v", readErr)
	}
	if strings.Contains(after.Notes, "decision:") {
		t.Errorf("refused decide still wrote a note:\n%s", after.Notes)
	}
}

func TestDecideAllowsRequiresGate(t *testing.T) {
	// A --requires gate routes the tick to a human at close; recording
	// decisions on it is exactly the material that human reviews there.
	_, store := decideTestSetup(t)
	tk := makeTestTask("abc123")
	requires := tick.RequiresApproval
	tk.Requires = &requires
	if err := store.Write(tk); err != nil {
		t.Fatalf("write tick: %v", err)
	}

	_ = captureStdout(t, func() error {
		return ExecuteArgs([]string{"decide", "abc123",
			"--question", "Q?", "--choice", "yes", "--reason", "because"})
	})
}

func TestDecisionsListsAndScopes(t *testing.T) {
	_, store := decideTestSetup(t)

	epic := makeTestEpic("epi")
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	child := makeTestTask("chi")
	child.Parent = "epi"
	if err := store.Write(child); err != nil {
		t.Fatalf("write child: %v", err)
	}
	outside := makeTestTask("out")
	if err := store.Write(outside); err != nil {
		t.Fatalf("write outside tick: %v", err)
	}

	for _, args := range [][]string{
		{"decide", "chi", "--question", "In scope?", "--choice", "yes", "--reason", "child of epi"},
		{"decide", "out", "--question", "Outside?", "--choice", "also yes", "--reason", "not under epi"},
	} {
		args := args
		ResetFlags()
		_ = captureStdout(t, func() error { return ExecuteArgs(args) })
	}

	// Scoped: only the child's decision.
	ResetFlags()
	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"decisions", "epi", "--json"})
	})
	var scoped decisionsOutput
	if err := json.Unmarshal([]byte(out), &scoped); err != nil {
		t.Fatalf("decode scoped json: %v\n%s", err, out)
	}
	if len(scoped.Decisions) != 1 {
		t.Fatalf("scoped decisions = %d, want 1: %s", len(scoped.Decisions), out)
	}
	d := scoped.Decisions[0]
	if d.TickID != "chi" || d.Question != "In scope?" || d.Choice != "yes" || d.Reason != "child of epi" {
		t.Errorf("parsed decision wrong: %+v", d)
	}

	// Unscoped: both.
	ResetFlags()
	out = captureStdout(t, func() error {
		return ExecuteArgs([]string{"decisions", "--json"})
	})
	var all decisionsOutput
	if err := json.Unmarshal([]byte(out), &all); err != nil {
		t.Fatalf("decode json: %v\n%s", err, out)
	}
	if len(all.Decisions) != 2 {
		t.Errorf("unscoped decisions = %d, want 2: %s", len(all.Decisions), out)
	}
}

func TestDecisionsParsesClassAndHandRolledNotes(t *testing.T) {
	_, store := decideTestSetup(t)
	tk := makeTestTask("abc123")
	// The hand-rolled convention from agent-runner.md: a `tk note` line, with
	// the [human] marker a relayed human decision carries.
	tk.Notes = "2026-08-30 10:00 - [human] decision: Deploy target? → fly.io — cheapest region match [class:infra]\n" +
		"2026-08-30 10:05 - ordinary note, not a decision"
	if err := store.Write(tk); err != nil {
		t.Fatalf("write tick: %v", err)
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"decisions", "--json"})
	})
	var got decisionsOutput
	if err := json.Unmarshal([]byte(out), &got); err != nil {
		t.Fatalf("decode json: %v\n%s", err, out)
	}
	if len(got.Decisions) != 1 {
		t.Fatalf("decisions = %d, want 1 (the ordinary note must not parse): %s", len(got.Decisions), out)
	}
	d := got.Decisions[0]
	if d.Class != "infra" {
		t.Errorf("class = %q, want infra", d.Class)
	}
	if d.Question != "Deploy target?" || d.Choice != "fly.io" || d.Reason != "cheapest region match" {
		t.Errorf("parsed decision wrong: %+v", d)
	}
}
