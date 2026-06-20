package tui

import (
	"bytes"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/charmbracelet/x/exp/teatest"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// smokeTicks is a small, fixed fixture set for the golden: one epic with two
// children plus a standalone tick (exercises the tree render and the sidebar
// project tree).
func smokeTicks() []tick.Tick {
	epic := fixtureTick("ep1", "Auth revamp", tick.StatusInProgress, 1)
	epic.Type = tick.TypeEpic
	c1 := fixtureTick("a1b", "token refresh", tick.StatusInProgress, 1)
	c1.Parent = "ep1"
	c2 := fixtureTick("x9k", "login UI polish", tick.StatusOpen, 2)
	c2.Parent = "ep1"
	solo := fixtureTick("q2m", "SAML config", tick.StatusOpen, 2)
	return []tick.Tick{epic, c1, c2, solo}
}

// ansiPattern strips ANSI escape sequences (cursor moves, color, mode toggles)
// so the golden is a legible plain-text frame independent of the renderer's
// control codes.
var ansiPattern = regexp.MustCompile(`\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07`)

// cursorUpPattern matches the renderer's "move cursor up N lines" sequence that
// bubbletea emits at the start of every repaint. Splitting on it isolates the
// individual frames so we can golden just the last one.
var cursorUpPattern = regexp.MustCompile(`\x1b\[\d+A`)

// lastFrame extracts the final rendered frame from the teatest output stream:
// frames are delimited by the renderer's cursor-up repaint sequence, so the
// last segment is the most recent frame. Remaining ANSI is stripped and
// per-line trailing whitespace trimmed. Determinism per §11: profile + size are
// pinned, so the frame is stable.
func lastFrame(raw []byte) string {
	frames := cursorUpPattern.Split(string(raw), -1)
	last := frames[len(frames)-1]
	stripped := ansiPattern.ReplaceAllString(last, "")
	lines := strings.Split(stripped, "\n")
	for i := range lines {
		lines[i] = strings.TrimRight(lines[i], " \t")
	}
	return strings.Trim(strings.Join(lines, "\n"), "\n")
}

// TestSmokeGolden is the §11 integration golden: launch the real App at a fixed
// 120×40 terminal with a pinned profile, confirm the shell renders (nav │ list
// │ detail), move the List selection with j/k, then quit with q. The final
// frame is golden-compared (regenerate with `go test -run TestSmokeGolden
// -update ./internal/tui`).
func TestSmokeGolden(t *testing.T) {
	tm := newTestProgram(t, smokeTicks(), defaultTermWidth, defaultTermHeight)

	// Drive the whole interaction up front; bubbletea processes the queued keys
	// in order. Scope the List to the project tree (5 j-presses step through the
	// five smart views to the "Auth revamp" project row), then focus the main
	// pane and move the List selection with j/k.
	for i := 0; i < 5; i++ {
		sendKey(tm, "j")
	}
	tm.Send(keyMsg("tab")) // sidebar -> main
	sendKey(tm, "j")
	sendKey(tm, "k")

	// A single WaitFor on the cumulative output captures the settled frame once
	// the list shows the scoped subtree with main focused.
	var frame []byte
	teatest.WaitFor(t, tm.Output(), func(b []byte) bool {
		f := lastFrame(b)
		if strings.Contains(f, "ep1") && strings.Contains(f, "[main]") {
			frame = normalizeTimestamps([]byte(f))
			return true
		}
		return false
	}, teatest.WithDuration(5*time.Second))

	// Quit cleanly.
	sendKey(tm, "q")
	tm.WaitFinished(t, teatest.WithFinalTimeout(3*time.Second))

	// Sanity assertions before the golden compare: the shell wired up.
	for _, want := range []string{"VIEWS", "PROJECTS", "Auth revamp", "List"} {
		if !bytes.Contains(frame, []byte(want)) {
			t.Errorf("final frame missing %q:\n%s", want, frame)
		}
	}

	teatest.RequireEqualOutput(t, frame)
}

// TestSmokeQuitsClean is the teatest equivalent of the tmux smoke (no tmux in
// the worktree): the real App launches, the sidebar renders, and q exits
// cleanly without hanging.
func TestSmokeQuitsClean(t *testing.T) {
	tm := newTestProgram(t, smokeTicks(), defaultTermWidth, defaultTermHeight)
	teatest.WaitFor(t, tm.Output(), func(b []byte) bool {
		return strings.Contains(lastFrame(b), "VIEWS")
	}, teatest.WithDuration(3*time.Second))
	sendKey(tm, "q")
	tm.WaitFinished(t, teatest.WithFinalTimeout(3*time.Second))
}
