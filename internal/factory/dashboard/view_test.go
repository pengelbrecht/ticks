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
// packages that stay in ticks (epic 3j4); the value below is that same
// sequence, frozen.
//
// The requirement it pins is this board's own acceptance criterion: an
// operator who has driven the herd board drives this one.
//
// WHO ENFORCES IT. Between epic 3j4 and tick o31, nobody did — a rebinding in
// the herd board did not fail anything, and the agreement was carried by this
// comment. o31 decided that was not good enough, because unlike the palette
// below it a divergence here is not a legitimate outcome: it is two boards in
// one binary where the same key means different things, which an operator
// notices by pressing it. The real comparison now lives in
// cmd/tk/cmd/board_keys_test.go, which renders BOTH boards and diffs their
// footers — `tk` already imports both, so it costs no new dependency edge.
//
// This literal stays as the second half of the pin, for two reasons: it fails
// on a change to THIS board alone (naming which side moved, which a diff of
// two live footers cannot), and it is the guard that survives if the factory
// board ever leaves this repo and the parity test goes with the commands.
// Change it only together with the parity test — see the note there.
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
