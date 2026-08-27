package cmd

import (
	"context"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/ansi"

	factoryboard "github.com/pengelbrecht/ticks/internal/factory/dashboard"
	herdboard "github.com/pengelbrecht/ticks/internal/herd/dashboard"
)

// This file enforces one agreement: `tk herd dashboard` and `tk factory
// dashboard` bind the same keys to the same verbs, in the same order. It is
// stated as an acceptance criterion in both boards' package docs — an operator
// who has driven one drives the other — and until epic 3j4 it was enforced by
// a test inside internal/factory/dashboard that rendered the herd board's real
// footer. That test had to drop its import when the factory packages stopped
// importing packages that stay in ticks, and the agreement became a frozen
// literal plus a comment (tick psh).
//
// Tick o31 decided to restore it here rather than leave it human-carried. Two
// things made that cheap enough to be worth doing:
//
//   - This package ALREADY imports both boards — factory_dashboard.go and
//     herd_dashboard.go are what wire them into `tk`. The comparison therefore
//     introduces no new dependency edge anywhere, and in particular none in the
//     direction the boundary forbids (repo-wiki/factory-ticks-boundary.md).
//     `tk` is the one place that ships both boards, so it is the honest place
//     to assert that its two boards agree.
//   - It compares the two REAL rendered footers, so there is no third artifact
//     to keep true. A rebinding on either side fails here, loudly, in the same
//     build as the change.
//
// The other Phase 1 copy, the eight-colour palette in
// internal/factory/dashboard/view.go, deliberately has NO equivalent of this
// test; the reasoning is recorded at that copy.

// footerKeys is the key each segment of a board footer binds, in order:
// "j/k move · enter details" -> ["j/k", "enter"].
func footerKeys(view string) []string {
	lines := strings.Split(strings.TrimRight(ansi.Strip(view), "\n"), "\n")
	footer := ""
	for i := len(lines) - 1; i >= 0; i-- {
		if strings.Contains(lines[i], "j/k") {
			footer = lines[i]
			break
		}
	}
	if footer == "" {
		return nil
	}
	var out []string
	for _, segment := range strings.Split(footer, "·") {
		if fields := strings.Fields(strings.TrimSpace(segment)); len(fields) > 0 {
			out = append(out, fields[0])
		}
	}
	return out
}

// TestTheTwoBoardsBindTheSameKeys renders both mission-control boards and
// compares their key sequences.
//
// If this fails, the two boards have drifted. The fix is a decision, not a
// mechanical edit: either restore the agreement, or — if the boards are meant
// to diverge — delete this test and say why at both call sites, the way the
// palette copy does. Do not "fix" it by editing only herdBoardKeys in
// internal/factory/dashboard/view_test.go; that literal is this agreement's
// second copy and must move with it.
func TestTheTwoBoardsBindTheSameKeys(t *testing.T) {
	// A temp dir with no run state: the board renders its empty frame, which
	// still carries the footer. Negative interval disables the safety re-list
	// so nothing is polled.
	herdModel := herdboard.New(context.Background(), herdboard.Config{
		RepoRoot:        t.TempDir(),
		RefreshInterval: -1,
	})
	defer herdModel.Close()
	herdModel.Update(tea.WindowSizeMsg{Width: 200, Height: 40})
	herdKeys := footerKeys(herdModel.View())
	if len(herdKeys) == 0 {
		t.Fatalf("the herd board rendered no key footer:\n%s", herdModel.View())
	}

	// The factory board with no factory to read: same story, the empty frame
	// carries the footer.
	factoryModel := factoryboard.New(context.Background(), factoryboard.Config{})
	defer factoryModel.Close()
	factoryModel.Update(tea.WindowSizeMsg{Width: 200, Height: 40})
	factoryKeys := footerKeys(factoryModel.View())
	if len(factoryKeys) == 0 {
		t.Fatalf("the factory board rendered no key footer:\n%s", factoryModel.View())
	}

	if len(herdKeys) != len(factoryKeys) {
		t.Fatalf("the two boards bind a different number of keys:\n herd:    %v\n factory: %v",
			herdKeys, factoryKeys)
	}
	for i := range herdKeys {
		if herdKeys[i] != factoryKeys[i] {
			t.Fatalf("key %d differs: herd binds %q, factory binds %q\n herd:    %v\n factory: %v",
				i, herdKeys[i], factoryKeys[i], herdKeys, factoryKeys)
		}
	}
}
