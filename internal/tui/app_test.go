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
