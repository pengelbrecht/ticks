package tui

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/exp/teatest"
	"github.com/muesli/termenv"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// This file is the reusable e2e harness scaffold (§11). Later view ticks
// (palette, board, roadmap, timeline) build their goldens on these helpers.
//
// Helper API:
//
//	pinTestProfile(t)                       — pin a deterministic color profile
//	seedTickFixtures(t, ticks)              — write a hermetic .tick/ in t.TempDir
//	newTestApp(t, ticks)                    — App over seeded fixtures (no watcher)
//	newTestProgram(t, ticks, w, h, opts...) — teatest.TestModel at a fixed size
//	normalizeTimestamps(b)                  — strip dates so goldens are stable
//	defaultTermSize                         — the standard golden terminal (120×40)
//
// Determinism pins per §11: fixed color profile, fixed terminal size, no real
// time (WaitFor on output, normalize timestamps), temp .tick/ fixtures.

// defaultTermWidth/Height is the standard golden terminal: wide enough for the
// 3-pane layout (≥120, §3).
const (
	defaultTermWidth  = 120
	defaultTermHeight = 40
)

// pinTestProfile pins the lipgloss/termenv color profile for the duration of
// the test so ANSI output does not vary by environment (§11). We pin Ascii so
// goldens carry no escape sequences and stay legible in review; switch to
// termenv.TrueColor if a test needs to assert on color.
func pinTestProfile(t *testing.T) {
	t.Helper()
	PinColorProfile(termenv.Ascii)
}

// seedTickFixtures writes the given ticks into a hermetic .tick/ store under
// t.TempDir() and returns the store path (the `.tick` dir). Timestamps on the
// fixtures should be fixed by the caller for stable goldens.
func seedTickFixtures(t *testing.T, ticks []tick.Tick) string {
	t.Helper()
	tickDir := filepath.Join(t.TempDir(), ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0o755); err != nil {
		t.Fatalf("mkdir fixtures: %v", err)
	}
	for _, tk := range ticks {
		b, err := json.MarshalIndent(tk, "", "  ")
		if err != nil {
			t.Fatalf("marshal fixture %s: %v", tk.ID, err)
		}
		if err := os.WriteFile(filepath.Join(issuesDir, tk.ID+".json"), b, 0o644); err != nil {
			t.Fatalf("write fixture %s: %v", tk.ID, err)
		}
	}
	return tickDir
}

// newTestApp builds an App over the given ticks WITHOUT a filesystem watcher
// (hermetic: no background goroutine, no real .tick path required). Use this for
// unit-level Update/View assertions.
func newTestApp(t *testing.T, ticks []tick.Tick) App {
	t.Helper()
	a := App{
		allTicks: ticks,
		views:    registerViews(""),
		sidebar:  NewSidebar(ticks, ""),
		detail:   newDetail("", ""),
		focus:    focusSidebar,
	}
	a.indexTicks()
	a.scope = a.sidebar.SelectedScope()
	a.reScope()
	return a
}

// newTestProgram launches the real App through teatest at a fixed terminal
// size with a pinned profile and seeded fixtures (§11 integration layer). The
// returned TestModel drives keys via Send and asserts output via WaitFor /
// FinalOutput. A watcher is attached (it reads the seeded .tick/), matching the
// production wiring; the test owns quitting via `q`.
func newTestProgram(t *testing.T, ticks []tick.Tick, width, height int) *teatest.TestModel {
	t.Helper()
	pinTestProfile(t)
	storePath := seedTickFixtures(t, ticks)
	app := NewApp(ticks, storePath, "")
	t.Cleanup(app.Close)
	return teatest.NewTestModel(t, app, teatest.WithInitialTermSize(width, height))
}

// timestampPattern matches the timestamps the TUI can render (ISO-ish dates and
// the note-line "2006-01-02 15:04" form) so goldens don't churn on clock time.
var timestampPattern = regexp.MustCompile(`\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?`)

// normalizeTimestamps replaces any timestamp-shaped substring with a fixed
// token so goldens are time-independent (§11: no real time).
func normalizeTimestamps(b []byte) []byte {
	return timestampPattern.ReplaceAll(b, []byte("<TS>"))
}

// fixedTime is a stable timestamp for fixtures so any rendered date is constant.
var fixedTime = time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)

// fixtureTick builds a fixture tick with fixed timestamps.
func fixtureTick(id, title, status string, priority int) tick.Tick {
	return tick.Tick{
		ID:        id,
		Title:     title,
		Status:    status,
		Priority:  priority,
		Type:      tick.TypeTask,
		CreatedAt: fixedTime,
		UpdatedAt: fixedTime,
	}
}

// validFixture returns a fixtureTick augmented with the fields tick.Validate()
// requires when the tick is re-read through the store (Owner + CreatedBy). Used
// by edit/detail tests that round-trip through the validating store.
func validFixture(id, title, status string, priority int) tick.Tick {
	t := fixtureTick(id, title, status, priority)
	t.Owner = "alice"
	t.CreatedBy = "alice"
	return t
}

// sendKey is a small convenience around tm.Send for a single rune key.
func sendKey(tm *teatest.TestModel, s string) {
	tm.Send(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)})
}
