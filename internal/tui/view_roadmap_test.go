package tui

import (
	"bytes"
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/exp/teatest"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// roadmapFixtureTicks returns a two-wave fixture set:
//
//	wave 1 — epic1 (in_progress), epic2 (open, no children → ready)
//	wave 2 — epic3 (blocked by epic1)
//
// Tasks are attached to epic1 to give it progress counts.
func roadmapFixtureTicks() []tick.Tick {
	now := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)

	epic1 := tick.Tick{
		ID: "e1a", Title: "Foundation Epic", Status: tick.StatusInProgress,
		Type: tick.TypeEpic, CreatedAt: now, UpdatedAt: now, CreatedBy: "test",
	}
	epic2 := tick.Tick{
		ID: "e2b", Title: "Parallel Epic", Status: tick.StatusOpen,
		Type: tick.TypeEpic, CreatedAt: now, UpdatedAt: now, CreatedBy: "test",
	}
	epic3 := tick.Tick{
		ID: "e3c", Title: "Dependent Epic", Status: tick.StatusOpen,
		Type: tick.TypeEpic, CreatedAt: now, UpdatedAt: now, CreatedBy: "test",
		BlockedBy: []string{"e1a"},
	}
	task1 := tick.Tick{
		ID: "t1", Title: "task one", Status: tick.StatusClosed,
		Type: tick.TypeTask, Parent: "e1a", CreatedAt: now, UpdatedAt: now, CreatedBy: "test",
	}
	task2 := tick.Tick{
		ID: "t2", Title: "task two", Status: tick.StatusOpen,
		Type: tick.TypeTask, Parent: "e1a", CreatedAt: now, UpdatedAt: now, CreatedBy: "test",
	}
	return []tick.Tick{epic1, epic2, epic3, task1, task2}
}

// roadmapScope returns a scope that passes all ticks through FilterScope
// (the Roadmap smart-view scope), suitable for testing the Roadmap view in
// isolation.
func roadmapScope() Scope {
	return Scope{Kind: scopeSmart, Smart: smartRoadmap}
}

// newRoadmapViewFixture builds a sized roadmapView from fixture ticks.
func newRoadmapViewFixture(t *testing.T, ticks []tick.Tick, width, height int) *roadmapView {
	t.Helper()
	v := newRoadmapView("").(*roadmapView)
	v.SetSize(width, height)
	v.SetScope(roadmapScope(), ticks)
	return v
}

// sendViewKey sends a single key to a View and returns the updated View.
func sendViewKey(v View, key string) (View, tea.Cmd) {
	var msg tea.KeyMsg
	switch key {
	case "enter":
		msg = tea.KeyMsg{Type: tea.KeyEnter}
	case "up":
		msg = tea.KeyMsg{Type: tea.KeyUp}
	case "down":
		msg = tea.KeyMsg{Type: tea.KeyDown}
	default:
		msg = tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(key)}
	}
	return v.Update(msg)
}

// ─────────────────────────────────────────────────────────────────────────────
// Interface compliance
// ─────────────────────────────────────────────────────────────────────────────

// TestRoadmapView_ImplementsInterfaces verifies roadmapView satisfies all four
// optional capability interfaces the App relies on.
func TestRoadmapView_ImplementsInterfaces(t *testing.T) {
	var _ View = (*roadmapView)(nil)
	var _ Sizable = (*roadmapView)(nil)
	var _ ScopeAware = (*roadmapView)(nil)
	var _ Selector = (*roadmapView)(nil)
}

func TestRoadmapView_TitleAndTab(t *testing.T) {
	v := newRoadmapView("")
	if v.Title() != "Roadmap" {
		t.Errorf("Title() = %q, want %q", v.Title(), "Roadmap")
	}
	if v.Tab() != "Roadmap" {
		t.Errorf("Tab() = %q, want %q", v.Tab(), "Roadmap")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Selection navigation (wave-by-wave via Update)
// ─────────────────────────────────────────────────────────────────────────────

func TestRoadmapView_InitialSelection(t *testing.T) {
	v := newRoadmapViewFixture(t, roadmapFixtureTicks(), 120, 40)
	// First epic in wave order.
	if got := v.SelectedTickID(); got == "" {
		t.Fatal("expected a selected epic, got empty")
	}
	// Should be e1a (wave 1, first in sort order for InProgress).
	got := v.SelectedTickID()
	if got != "e1a" && got != "e2b" {
		t.Errorf("initial selection %q not in wave 1 (expected e1a or e2b)", got)
	}
}

func TestRoadmapView_NavigateDown(t *testing.T) {
	v := newRoadmapViewFixture(t, roadmapFixtureTicks(), 120, 40)

	// Record initial position.
	start := v.SelectedTickID()

	// One down-press advances the cursor.
	v2, _ := sendViewKey(v, "j")
	rv := v2.(*roadmapView)
	after := rv.SelectedTickID()
	if after == start {
		t.Error("j did not advance selection")
	}
}

func TestRoadmapView_NavigateAcrossWaves(t *testing.T) {
	v := newRoadmapViewFixture(t, roadmapFixtureTicks(), 120, 40)

	// Three down-presses should cross the wave boundary (wave 1 has 2 epics,
	// wave 2 has 1). We expect to land on e3c.
	var cur View = v
	for i := 0; i < 3; i++ {
		cur, _ = sendViewKey(cur, "j")
	}
	rv := cur.(*roadmapView)
	if got := rv.SelectedTickID(); got != "e3c" {
		t.Errorf("expected e3c after crossing waves, got %q", got)
	}

	// Down at the bottom stays put.
	before := rv.SelectedTickID()
	cur, _ = sendViewKey(rv, "down")
	if got := cur.(*roadmapView).SelectedTickID(); got != before {
		t.Errorf("down at bottom: selection moved from %q to %q", before, got)
	}
}

func TestRoadmapView_NavigateUp(t *testing.T) {
	v := newRoadmapViewFixture(t, roadmapFixtureTicks(), 120, 40)

	// Move to end, then come back up.
	var cur View = v
	for i := 0; i < 3; i++ {
		cur, _ = sendViewKey(cur, "j")
	}
	// Now at e3c. Move up.
	cur, _ = sendViewKey(cur, "k")
	rv := cur.(*roadmapView)
	// Should be back in wave 1.
	if got := rv.SelectedTickID(); got == "e3c" {
		t.Error("up did not move back from e3c")
	}

	// Up at the top stays put.
	topV := newRoadmapViewFixture(t, roadmapFixtureTicks(), 120, 40)
	first := topV.SelectedTickID()
	cur2, _ := sendViewKey(topV, "k")
	if got := cur2.(*roadmapView).SelectedTickID(); got != first {
		t.Errorf("up at top moved from %q to %q", first, got)
	}
}

func TestRoadmapView_HomeEnd(t *testing.T) {
	v := newRoadmapViewFixture(t, roadmapFixtureTicks(), 120, 40)
	first := v.SelectedTickID()

	// Go to end with G, then back to start with g.
	cur, _ := sendViewKey(v, "G")
	last := cur.(*roadmapView).SelectedTickID()
	if last == first {
		t.Error("G did not move to last epic")
	}

	cur2, _ := sendViewKey(cur, "g")
	if got := cur2.(*roadmapView).SelectedTickID(); got != first {
		t.Errorf("g did not return to first epic; got %q, want %q", got, first)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Enter emits jumpToEpicMsg
// ─────────────────────────────────────────────────────────────────────────────

func TestRoadmapView_EnterEmitsJumpMessage(t *testing.T) {
	v := newRoadmapViewFixture(t, roadmapFixtureTicks(), 120, 40)
	epicID := v.SelectedTickID()
	if epicID == "" {
		t.Fatal("no epic selected; cannot test Enter")
	}

	_, cmd := sendViewKey(v, "enter")
	if cmd == nil {
		t.Fatal("Enter returned nil command; expected jumpToEpicMsg command")
	}
	msg := cmd()
	jump, ok := msg.(jumpToEpicMsg)
	if !ok {
		t.Fatalf("command returned %T, want jumpToEpicMsg", msg)
	}
	if jump.EpicID != epicID {
		t.Errorf("jumpToEpicMsg.EpicID = %q, want %q", jump.EpicID, epicID)
	}
}

func TestRoadmapView_EnterNoEpicsIsNoop(t *testing.T) {
	// Only a task (no epics) → Enter must not emit a command.
	task := fixtureTick("tk1", "only task", tick.StatusOpen, 1)
	v := newRoadmapViewFixture(t, []tick.Tick{task}, 120, 40)

	if got := v.SelectedTickID(); got != "" {
		t.Errorf("expected no selection with no epics, got %q", got)
	}
	_, cmd := sendViewKey(v, "enter")
	if cmd != nil {
		t.Error("Enter with no epics returned a non-nil command; want nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SetScope preserves selection by ID
// ─────────────────────────────────────────────────────────────────────────────

func TestRoadmapView_SetScopePreservesSelection(t *testing.T) {
	ticks := roadmapFixtureTicks()
	v := newRoadmapViewFixture(t, ticks, 120, 40)

	// Move to the last epic.
	var cur View = v
	for i := 0; i < 3; i++ {
		cur, _ = sendViewKey(cur, "j")
	}
	rv := cur.(*roadmapView)
	prevID := rv.SelectedTickID() // e3c

	// Re-scope with the same ticks (simulating a reload) — selection must stick.
	rv.SetScope(roadmapScope(), ticks)
	if got := rv.SelectedTickID(); got != prevID {
		t.Errorf("SetScope lost selection: got %q, want %q", got, prevID)
	}

	// Re-scope with the selected epic removed — falls back to first.
	without := ticks[:2] // only e1a, e2b
	rv.SetScope(roadmapScope(), without)
	if got := rv.SelectedTickID(); got == "e3c" {
		t.Error("selection should have fallen back when e3c removed; still points at e3c")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// View() renders waves with the selected epic highlighted
// ─────────────────────────────────────────────────────────────────────────────

func TestRoadmapView_ViewContainsWaveHeaders(t *testing.T) {
	v := newRoadmapViewFixture(t, roadmapFixtureTicks(), 120, 40)
	out := stripANSI(v.View())

	if !strings.Contains(out, "Wave 1") {
		t.Errorf("View() missing 'Wave 1':\n%s", out)
	}
	if !strings.Contains(out, "Wave 2") {
		t.Errorf("View() missing 'Wave 2':\n%s", out)
	}
}

func TestRoadmapView_ViewHighlightsSelectedEpic(t *testing.T) {
	v := newRoadmapViewFixture(t, roadmapFixtureTicks(), 120, 40)
	epicID := v.SelectedTickID()
	out := stripANSI(v.View())

	// The selected line carries the "> " prefix.
	var selectedLines []string
	for _, line := range strings.Split(out, "\n") {
		if strings.HasPrefix(line, "> ") {
			selectedLines = append(selectedLines, line)
		}
	}
	if len(selectedLines) != 1 {
		t.Fatalf("expected exactly 1 selected line, got %d:\n%s", len(selectedLines), out)
	}
	if !strings.Contains(selectedLines[0], epicID) {
		t.Errorf("selected line does not contain epicID %q:\n%s", epicID, selectedLines[0])
	}
}

func TestRoadmapView_EmptyScopeShowsNoTicksMessage(t *testing.T) {
	v := newRoadmapView("").(*roadmapView)
	v.SetSize(120, 40)
	// No scope set — allTicks is nil.
	out := stripANSI(v.View())
	if !strings.Contains(out, "No ticks") {
		t.Errorf("empty view should say 'No ticks', got:\n%s", out)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// teatest golden: Roadmap tab renders waves with selection at fixed size
// ─────────────────────────────────────────────────────────────────────────────

// roadmapGoldenTicks are the fixture ticks for the roadmap golden: an active
// epic, a ready epic, and a dependent epic in wave 2.
func roadmapGoldenTicks() []tick.Tick {
	now := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	epic1 := tick.Tick{
		ID: "ep1", Title: "Auth revamp", Status: tick.StatusInProgress,
		Type: tick.TypeEpic, CreatedAt: now, UpdatedAt: now, CreatedBy: "test",
	}
	epic2 := tick.Tick{
		ID: "ep2", Title: "Billing setup", Status: tick.StatusOpen,
		Type: tick.TypeEpic, CreatedAt: now, UpdatedAt: now, CreatedBy: "test",
	}
	epic3 := tick.Tick{
		ID: "ep3", Title: "OAuth wiring", Status: tick.StatusOpen,
		Type: tick.TypeEpic, CreatedAt: now, UpdatedAt: now, CreatedBy: "test",
		BlockedBy: []string{"ep1"},
	}
	child1 := tick.Tick{
		ID: "t1a", Title: "token refresh", Status: tick.StatusClosed,
		Type: tick.TypeTask, Parent: "ep1", CreatedAt: now, UpdatedAt: now, CreatedBy: "test",
	}
	child2 := tick.Tick{
		ID: "t2b", Title: "login UI", Status: tick.StatusOpen,
		Type: tick.TypeTask, Parent: "ep1", CreatedAt: now, UpdatedAt: now, CreatedBy: "test",
	}
	return []tick.Tick{epic1, epic2, epic3, child1, child2}
}

// TestRoadmapGolden is the teatest golden for the Roadmap view: the App
// launches at 120×40, navigates the sidebar to the Roadmap smart view (2
// j-presses from the initial Awaiting row), then switches to the Roadmap
// content tab (hotkey "2"), focuses main and moves the selection down once.
// Regenerate with:
//
//	go test -run TestRoadmapGolden -update ./internal/tui/
func TestRoadmapGolden(t *testing.T) {
	ticks := roadmapGoldenTicks()
	tm := newTestProgram(t, ticks, defaultTermWidth, defaultTermHeight)

	// Navigate the sidebar to the Roadmap smart view (row 2, 0-based).
	// Row 0 = Awaiting (initial), j → My ticks, j → Roadmap.
	sendKey(tm, "j")
	sendKey(tm, "j")
	// Switch to the Roadmap content tab (hotkey "3": List=1, Board=2, Roadmap=3).
	sendKey(tm, "3")
	// Focus the main pane and move selection down once.
	tm.Send(keyMsg("tab")) // sidebar → main
	sendKey(tm, "j")

	// Wait for the settled frame: the Roadmap tab must be active and Wave 1
	// header visible.
	var frame []byte
	teatest.WaitFor(t, tm.Output(), func(b []byte) bool {
		f := lastFrame(b)
		if strings.Contains(f, "Wave 1") && strings.Contains(f, "‹Roadmap›") {
			frame = normalizeTimestamps([]byte(f))
			return true
		}
		return false
	}, teatest.WithDuration(5*time.Second))

	sendKey(tm, "q")
	tm.WaitFinished(t, teatest.WithFinalTimeout(3*time.Second))

	// Sanity: wave headers and both epic IDs visible.
	for _, want := range []string{"Wave 1", "Wave 2", "ep1", "ep2", "ep3"} {
		if !bytes.Contains(frame, []byte(want)) {
			t.Errorf("golden frame missing %q", want)
		}
	}

	teatest.RequireEqualOutput(t, frame)
}
