package dashboard

import (
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

// keyTokens is the key each footer segment binds, in order: "j/k move" -> "j/k".
func keyTokens(footer string) []string {
	var out []string
	for _, segment := range strings.Split(footer, "·") {
		fields := strings.Fields(strings.TrimSpace(segment))
		if len(fields) > 0 {
			out = append(out, fields[0])
		}
	}
	return out
}

func footerOf(view string) string {
	lines := strings.Split(strings.TrimRight(ansi.Strip(view), "\n"), "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		if strings.Contains(lines[i], "j/k") {
			return lines[i]
		}
	}
	return ""
}

// herdBoardKeys is `tk herd dashboard`'s footer, in its order. It was read
// live from that board's rendered footer until the factory stopped importing
// ticks internals (epic 3j4); the value below is that same sequence, frozen.
//
// The requirement it pins is unchanged and is this board's own acceptance
// criterion: an operator who has driven the herd board drives this one. What
// changed is who enforces it — a rebinding in the herd board no longer fails
// this test, so the two boards agreeing is now a decision someone makes rather
// than a fact the compiler keeps. That is the price of the extraction, and it
// is the same trade the palette above makes.
var herdBoardKeys = []string{"j/k", "enter", "g/G", "r", "q", "read-only"}

func TestKeyBindingsAreTheHerdBoards(t *testing.T) {
	model := boardModel(t, loaded())
	footer := footerOf(model.View())
	if footer == "" {
		t.Fatalf("this board has no key footer:\n%s", model.View())
	}

	want, got := herdBoardKeys, keyTokens(footer)
	if len(want) != len(got) {
		t.Fatalf("key bindings differ:\n herd: %v\n this: %v", want, got)
	}
	for i := range want {
		if want[i] != got[i] {
			t.Fatalf("key binding %d differs: herd %q, this %q\n herd: %v\n this: %v",
				i, want[i], got[i], want, got)
		}
	}
	if !strings.Contains(footer, "read-only") {
		t.Fatalf("the footer must say the board is read-only: %q", footer)
	}
}

func TestTheBoardShowsWhatTheTickAsksFor(t *testing.T) {
	model := boardModel(t, loaded())
	model.Update(CostMsg{Costs: map[string]Cost{"run_a": {RunID: "run_a", USD: 3.75}}, At: at("2026-08-22T06:00:10Z")})
	view := ansi.Strip(model.View())

	for name, want := range map[string]string{
		"the run id":       "run_a",
		"the project":      "example-org/repo",
		"the epic":         "t9s",
		"the state":        "running",
		"the cost":         "$3.75",
		"the lease holder": "holds lease",
		"the phase":        "task-started",
		"the boot attempt": "attempt 2 of 2",
		"the gates":        "GATES",
		"the refusals":     "lease_held_by",
		"the output":       "dispatching wave 6",
	} {
		if !strings.Contains(view, want) {
			t.Fatalf("the board does not show %s (%q):\n%s", name, want, view)
		}
	}
}

// Which surface answered a gate is the fact D5's first-wins arbitration makes
// worth showing: a phone and a terminal race, and only one wins.
func TestAnAnsweredGateNamesTheSurfaceThatAnsweredIt(t *testing.T) {
	model := boardModel(t, loaded())
	view := ansi.Strip(model.View())
	if !strings.Contains(view, "answered by phone") {
		t.Fatalf("a telegram answer must read as the phone:\n%s", view)
	}
	if !strings.Contains(view, "waiting") {
		t.Fatalf("an unanswered gate must read as waiting:\n%s", view)
	}
}

func TestTheImageDigestIsOnScreenNotJustTheRef(t *testing.T) {
	snap := loaded()
	snap.Focus.Image = &Image{Ref: "registry.example.com/orchestrator:latest", Digest: "sha256:c0ffee"}
	model := boardModel(t, snap)
	view := ansi.Strip(model.View())
	if !strings.Contains(view, "sha256:c0ffee") {
		t.Fatalf("the digest a run booted must be visible:\n%s", view)
	}
}
