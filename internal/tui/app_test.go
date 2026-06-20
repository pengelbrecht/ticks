package tui

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func keyMsg(s string) tea.KeyMsg {
	if s == "tab" {
		return tea.KeyMsg{Type: tea.KeyTab}
	}
	if s == "shift+tab" {
		return tea.KeyMsg{Type: tea.KeyShiftTab}
	}
	if s == "enter" {
		return tea.KeyMsg{Type: tea.KeyEnter}
	}
	return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)}
}

func sampleTicks() []tick.Tick {
	epic := fixtureTick("ep1", "Auth revamp", tick.StatusInProgress, 1)
	epic.Type = tick.TypeEpic
	child1 := fixtureTick("a1b", "token refresh", tick.StatusInProgress, 1)
	child1.Parent = "ep1"
	child2 := fixtureTick("x9k", "login UI polish", tick.StatusOpen, 2)
	child2.Parent = "ep1"
	solo := fixtureTick("q2m", "SAML config", tick.StatusOpen, 2)
	return []tick.Tick{epic, child1, child2, solo}
}

// TestFocusRoutingTabCycles verifies Tab cycles through the three focus zones
// (sidebar → main → detail → sidebar) at the root model (acceptance: focus
// routing).
func TestFocusRoutingTabCycles(t *testing.T) {
	a := newTestApp(t, sampleTicks())
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()

	if a.focus != focusSidebar {
		t.Fatalf("initial focus = %v, want sidebar", a.focus)
	}
	want := []focusZone{focusMain, focusDetail, focusSidebar, focusMain}
	var m tea.Model = a
	for i, w := range want {
		m, _ = m.Update(keyMsg("tab"))
		got := m.(App).focus
		if got != w {
			t.Fatalf("after %d tabs: focus = %v, want %v", i+1, got, w)
		}
	}
}

// TestShiftTabCyclesBackward verifies shift+tab cycles in reverse.
func TestShiftTabCyclesBackward(t *testing.T) {
	a := newTestApp(t, sampleTicks())
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()

	var m tea.Model = a
	m, _ = m.Update(keyMsg("shift+tab"))
	if got := m.(App).focus; got != focusDetail {
		t.Fatalf("shift+tab from sidebar: focus = %v, want detail", got)
	}
}

// TestFocusRoutesKeysToChild verifies j/k routes to the focused child only: in
// main focus it moves the list selection; in sidebar focus it does not.
func TestFocusRoutesKeysToChild(t *testing.T) {
	a := newTestApp(t, sampleTicks())
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()

	// Scope to the populated project subtree, then focus main and move down —
	// list selection should advance.
	var m tea.Model = a
	for i := 0; i < 5; i++ {
		m, _ = m.Update(keyMsg("j")) // step sidebar to the "Auth revamp" node
	}
	m, _ = m.Update(keyMsg("tab")) // -> main
	app1 := m.(App)
	before := app1.activeView().(Selector).SelectedTickID()
	m, _ = m.Update(keyMsg("j"))
	app2 := m.(App)
	after := app2.activeView().(Selector).SelectedTickID()
	if before == after {
		t.Fatalf("j in main focus did not move list selection (stayed %q)", before)
	}
}

// TestWidthThresholdsSelectPanes verifies the adaptive layout picks 3/2/1 panes
// by terminal width via layout.go (acceptance: width thresholds).
func TestWidthThresholdsSelectPanes(t *testing.T) {
	cases := []struct {
		width int
		want  layoutMode
	}{
		{130, layoutThree},
		{120, layoutThree},
		{119, layoutTwo},
		{80, layoutTwo},
		{79, layoutOne},
		{40, layoutOne},
	}
	for _, c := range cases {
		if got := modeForWidth(c.width); got != c.want {
			t.Errorf("modeForWidth(%d) = %v, want %v", c.width, got, c.want)
		}
	}
}

// TestComputeLayoutThreePanes verifies the wide layout shows all three zones
// and that widths sum to the terminal width.
func TestComputeLayoutThreePanes(t *testing.T) {
	l := computeLayout(120, 40, true)
	if l.mode != layoutThree {
		t.Fatalf("mode = %v, want three", l.mode)
	}
	if !l.sidebar.show || !l.main.show || !l.detail.show {
		t.Fatalf("expected all three panes shown, got %+v", l)
	}
	sum := l.sidebar.width + l.main.width + l.detail.width
	if sum != 120 {
		t.Errorf("pane widths sum = %d, want 120", sum)
	}
}

// TestComputeLayoutTwoPanesSwapsDetail verifies medium width shows nav plus one
// of main/detail depending on detailVisible.
func TestComputeLayoutTwoPanesSwapsDetail(t *testing.T) {
	main := computeLayout(100, 40, false)
	if !main.sidebar.show || !main.main.show || main.detail.show {
		t.Fatalf("medium/!detail: want nav+main, got %+v", main)
	}
	det := computeLayout(100, 40, true)
	if !det.sidebar.show || det.main.show || !det.detail.show {
		t.Fatalf("medium/detail: want nav+detail, got %+v", det)
	}
}

// TestComputeLayoutOnePane verifies narrow width shows a single pane.
func TestComputeLayoutOnePane(t *testing.T) {
	l := computeLayout(60, 40, false)
	if l.sidebar.show || l.detail.show || !l.main.show {
		t.Fatalf("narrow: want single main pane, got %+v", l)
	}
	if l.main.width != 60 {
		t.Errorf("narrow main width = %d, want 60", l.main.width)
	}
}

// TestViewHotkeySwitchesView verifies the 1..N hotkeys select a registered view
// (only List exists in the foundation, so "1" is a no-op selection that stays
// valid and does not panic).
func TestViewHotkeySwitchesView(t *testing.T) {
	a := newTestApp(t, sampleTicks())
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()
	var m tea.Model = a
	m, _ = m.Update(keyMsg("1"))
	got := m.(App)
	if got.activeIx != 0 {
		t.Fatalf("hotkey 1 set activeIx=%d, want 0", got.activeIx)
	}
}

// TestQuitKey verifies q issues tea.Quit.
func TestQuitKey(t *testing.T) {
	a := newTestApp(t, sampleTicks())
	_, cmd := a.Update(keyMsg("q"))
	if cmd == nil {
		t.Fatal("q produced no command, want tea.Quit")
	}
	if msg := cmd(); msg == nil {
		t.Fatal("q command produced nil msg")
	} else if _, ok := msg.(tea.QuitMsg); !ok {
		t.Fatalf("q command msg = %T, want tea.QuitMsg", msg)
	}
}

// TestRoadmapJumpSetsListView verifies that receiving a jumpToEpicMsg (emitted
// when the user presses Enter on a selected epic in the Roadmap view) switches
// the active content view to List and scopes the sidebar to the target epic's
// tree node, so the jump is visible to the user.
func TestRoadmapJumpSetsListView(t *testing.T) {
	ticks := sampleTicks() // ep1 is the epic, children a1b and x9k, solo q2m
	a := newTestApp(t, ticks)
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()

	// Switch to the Roadmap view (index 2) so we are not already on List.
	var m tea.Model = a
	m, _ = m.Update(keyMsg("3")) // hotkey 3 → Roadmap (List=1, Board=2, Roadmap=3)
	if got := m.(App).activeIx; got != 2 {
		t.Fatalf("after '3': activeIx = %d, want 2 (Roadmap)", got)
	}

	// Deliver the jumpToEpicMsg for ep1.
	m, _ = m.Update(jumpToEpicMsg{EpicID: "ep1"})
	app := m.(App)

	// Active view must now be List (index 0).
	if app.activeIx != 0 {
		t.Fatalf("after jump: activeIx = %d, want 0 (List)", app.activeIx)
	}

	// Scope must be the epic's tree node.
	if app.scope.Kind != scopeNode {
		t.Fatalf("after jump: scope.Kind = %v, want scopeNode", app.scope.Kind)
	}
	if app.scope.Node != "ep1" {
		t.Fatalf("after jump: scope.Node = %q, want %q", app.scope.Node, "ep1")
	}

	// The list view's selection should include the target epic.
	selID := app.activeView().(Selector).SelectedTickID()
	if selID == "" {
		t.Fatal("after jump: list selection is empty, want ep1 or one of its children")
	}
	// Focus is on Main after the jump.
	if app.focus != focusMain {
		t.Fatalf("after jump: focus = %v, want focusMain", app.focus)
	}
}

// TestPaletteJumpFromNonListViewSwitchesToList verifies that a paletteJumpMsg
// delivered while a non-List view (e.g. Roadmap) is active switches the active
// view to List before performing the jump, so the target tick is visible.
func TestPaletteJumpFromNonListViewSwitchesToList(t *testing.T) {
	ticks := sampleTicks()
	a := newTestApp(t, ticks)
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()

	// Navigate the sidebar to the project node so the list has ticks.
	var m tea.Model = a
	for i := 0; i < 5; i++ {
		m, _ = m.Update(keyMsg("j"))
	}

	// Switch to the Roadmap view (index 2).
	m, _ = m.Update(keyMsg("3"))
	if got := m.(App).activeIx; got != 2 {
		t.Fatalf("after '3': activeIx = %d, want 2 (Roadmap)", got)
	}

	// Deliver a paletteJumpMsg for a known tick while on Roadmap.
	m, _ = m.Update(paletteJumpMsg{id: "a1b"})
	app := m.(App)

	// Active view must be List (index 0).
	if app.activeIx != 0 {
		t.Fatalf("after palette jump from Roadmap: activeIx = %d, want 0 (List)", app.activeIx)
	}
	// Focus must be Main.
	if app.focus != focusMain {
		t.Fatalf("after palette jump: focus = %v, want focusMain", app.focus)
	}
}

// TestDetailMirrorsSelection verifies the detail pane tracks the active list
// view's selected tick (read-only detail stub seam, §6).
func TestDetailMirrorsSelection(t *testing.T) {
	a := newTestApp(t, sampleTicks())
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()
	// Scope to the populated project subtree so the list has a selection, then
	// the detail tick id should equal the list selection.
	var m tea.Model = a
	for i := 0; i < 5; i++ {
		m, _ = m.Update(keyMsg("j")) // step sidebar to the "Auth revamp" node
	}
	app := m.(App)
	listID := app.activeView().(Selector).SelectedTickID()
	if app.detail.tick == nil {
		t.Fatal("detail tick is nil after scope; want mirrored selection")
	}
	if app.detail.tick.ID != listID {
		t.Fatalf("detail tick = %s, list selection = %s; want equal", app.detail.tick.ID, listID)
	}
}
