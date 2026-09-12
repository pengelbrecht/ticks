package cmd

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// The readiness lint: the machine half of the Definition of Ready. A warning
// surface only — the graph must still render, and nothing may be refused.

func TestGraphReadinessLint(t *testing.T) {
	ResetFlags()
	_, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}

	if err := store.Write(makeTestEpic("epi")); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	write := func(id string, mutate func(*tick.Tick)) {
		tk := makeTestTask(id)
		tk.Parent = "epi"
		mutate(&tk)
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", id, err)
		}
	}

	// A well-formed tick: names its command, its files, quantifies everything.
	write("gud", func(t *tick.Tick) {
		t.Description = "Validate email on blur.\n\nFiles likely touched: internal/validation/email.go\n\nRun: go test ./internal/validation/..."
		t.AcceptanceCriteria = "All validation tests pass"
	})

	// No command anywhere: the implementer has nothing to prove itself with.
	write("nov", func(t *tick.Tick) {
		t.Description = "Tidy up internal/validation/email.go a bit."
		t.AcceptanceCriteria = "It is tidier"
	})

	// Command and files present, but the acceptance hides behind an adjective.
	write("vag", func(t *tick.Tick) {
		t.Description = "Rework internal/auth/session.go.\n\nRun: go test ./internal/auth/..."
		t.AcceptanceCriteria = "Sessions are handled appropriately and the flow is intuitive"
	})

	// An unresolved marker survived into the tick.
	write("plc", func(t *tick.Tick) {
		t.Description = "Add the retry path to internal/herd/spawn.go.\n\nBackoff: TODO decide\n\nRun: go test ./internal/herd/..."
		t.AcceptanceCriteria = "Retry tests pass"
	})

	// Command present, no path and no files label: wave safety has no input.
	write("nof", func(t *tick.Tick) {
		t.Description = "Add a retry to the spawn path.\n\nRun: go test ./internal/herd/..."
		t.AcceptanceCriteria = "Retry tests pass"
	})

	// A bare filename names the file as usefully as a full path does, and
	// prose abbreviations must not read as one. Field-observed: requiring a
	// directory separator flagged tick uhw, which named its files correctly.
	write("bar", func(t *tick.Tick) {
		t.Description = "The smoke script verify-herd-plugin.sh misses the guard hook, e.g. on startup.\n\nRun: bash scripts/verify-herd-plugin.sh"
		t.AcceptanceCriteria = "The script fails when the hook is missing"
	})

	// Prose alone, no filename at all: "e.g." and "etc." must not rescue it.
	write("prz", func(t *tick.Tick) {
		t.Description = "Tighten the spawn path, e.g. around retries, timeouts, etc.\n\nRun: go test ./internal/herd/..."
		t.AcceptanceCriteria = "Spawn tests pass"
	})

	// Not linted: a process tick carries the skeleton's acceptance.
	write("rev", func(t *tick.Tick) { t.Role = tick.RoleReview })

	// Not linted: a gated tick's verification is a human verdict.
	input := tick.AwaitingInput
	write("inp", func(t *tick.Tick) {
		t.Awaiting = &input
		t.Description = "Pick the ranking model. gate: needs product taste"
	})

	// Not linted: closed work is done being ready.
	write("cls", func(t *tick.Tick) {
		t.Status = tick.StatusClosed
		t.Description = "whatever"
	})

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"graph", "epi", "--json"})
	})
	var g graphOutput
	if err := json.Unmarshal([]byte(out), &g); err != nil {
		t.Fatalf("decode graph json: %v\n%s", err, out)
	}

	got := map[string][]string{}
	for _, f := range g.Readiness {
		got[f.ID] = f.Misses
	}

	for _, id := range []string{"gud", "rev", "inp", "cls", "bar"} {
		if _, flagged := got[id]; flagged {
			t.Errorf("%s must not be linted, got %v", id, got[id])
		}
	}

	has := func(id, want string) bool {
		for _, m := range got[id] {
			if m == want {
				return true
			}
		}
		return false
	}

	if !has("nov", readinessNoVerification) {
		t.Errorf("nov should miss %s, got %v", readinessNoVerification, got["nov"])
	}
	if !has("vag", readinessVagueAdjective) {
		t.Errorf("vag should miss %s, got %v", readinessVagueAdjective, got["vag"])
	}
	if has("vag", readinessNoVerification) {
		t.Errorf("vag names a command; it must not miss %s", readinessNoVerification)
	}
	if !has("plc", readinessPlaceholder) {
		t.Errorf("plc should miss %s, got %v", readinessPlaceholder, got["plc"])
	}
	if !has("nof", readinessNoFiles) {
		t.Errorf("nof should miss %s, got %v", readinessNoFiles, got["nof"])
	}
	if has("plc", readinessNoFiles) {
		t.Errorf("plc names a path; it must not miss %s", readinessNoFiles)
	}
	if has("bar", readinessNoFiles) {
		t.Errorf("bar names a bare filename; it must not miss %s", readinessNoFiles)
	}
	if !has("prz", readinessNoFiles) {
		t.Errorf("prz names no file; \"e.g.\"/\"etc.\" must not read as one, got %v", got["prz"])
	}

	// Findings are sorted by id, so a planner diffing two runs sees real change.
	ids := make([]string, 0, len(g.Readiness))
	for _, f := range g.Readiness {
		ids = append(ids, f.ID)
	}
	for i := 1; i < len(ids); i++ {
		if ids[i-1] > ids[i] {
			t.Errorf("readiness findings not sorted by id: %v", ids)
			break
		}
	}

	// Human output warns but still renders the graph.
	ResetFlags()
	human := captureStdout(t, func() error {
		return ExecuteArgs([]string{"graph", "epi"})
	})
	if !strings.Contains(human, "not ready for an agent") {
		t.Errorf("human output should carry the readiness warning:\n%s", human)
	}
	if !strings.Contains(human, "Wave") {
		t.Errorf("lint must not suppress the graph itself:\n%s", human)
	}
}

// A container's deliverable is its children's, so it is not linted for a test
// command of its own — even though it carries none.
func TestGraphReadinessSkipsContainers(t *testing.T) {
	ResetFlags()
	_, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}
	if err := store.Write(makeTestEpic("epi")); err != nil {
		t.Fatalf("write epic: %v", err)
	}

	parent := makeTestTask("par")
	parent.Parent = "epi"
	parent.Description = "Group the storage work."
	if err := store.Write(parent); err != nil {
		t.Fatalf("write parent: %v", err)
	}

	child := makeTestTask("chi")
	child.Parent = "par"
	child.Description = "Port the row codec in internal/store/codec.go.\n\nRun: go test ./internal/store/..."
	child.AcceptanceCriteria = "Codec tests pass"
	if err := store.Write(child); err != nil {
		t.Fatalf("write child: %v", err)
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"graph", "epi", "--json"})
	})
	var g graphOutput
	if err := json.Unmarshal([]byte(out), &g); err != nil {
		t.Fatalf("decode graph json: %v\n%s", err, out)
	}
	for _, f := range g.Readiness {
		if f.ID == "par" {
			t.Errorf("container par must not be linted, got %v", f.Misses)
		}
	}
}

// A clean epic must serialize readiness as [] rather than null, so a consumer
// can len() the field without special-casing the good outcome. (The sibling
// unjustified_gates lint gets this right; a nil slice here broke every caller
// that treated the two the same way.)
func TestGraphReadinessEmptyIsNotNull(t *testing.T) {
	ResetFlags()
	_, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}
	if err := store.Write(makeTestEpic("epi")); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	clean := makeTestTask("cln")
	clean.Parent = "epi"
	clean.Description = "Port the codec in internal/store/codec.go.\n\nRun: go test ./internal/store/..."
	clean.AcceptanceCriteria = "Codec tests pass"
	if err := store.Write(clean); err != nil {
		t.Fatalf("write clean: %v", err)
	}

	out := captureStdout(t, func() error {
		return ExecuteArgs([]string{"graph", "epi", "--json"})
	})
	if !strings.Contains(out, `"readiness": []`) {
		t.Errorf("clean epic must emit an empty array, not null:\n%s", out)
	}
}
