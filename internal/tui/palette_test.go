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

// ── Unit tests: palette Update ────────────────────────────────────────────────

// paletteTicks is a small fixture set for palette unit tests.
func paletteTicks() []tick.Tick {
	epic := fixtureTick("ep1", "Auth revamp", tick.StatusInProgress, 1)
	epic.Type = tick.TypeEpic
	c1 := fixtureTick("a1b", "token refresh", tick.StatusInProgress, 1)
	c1.Parent = "ep1"
	c2 := fixtureTick("x9k", "login UI polish", tick.StatusOpen, 2)
	c2.Parent = "ep1"
	solo := fixtureTick("q2m", "SAML config", tick.StatusOpen, 2)
	return []tick.Tick{epic, c1, c2, solo}
}

// buildTestPalette returns a fresh palette populated with paletteTicks and the
// default registry (only the List view).
func buildTestPalette() palette {
	reg := registerViews("")
	return newPalette(paletteTicks(), reg)
}

// sendPaletteKey sends a key message to the palette and returns the updated
// palette and command.
func sendPaletteKey(p palette, key string) (palette, tea.Cmd) {
	var msg tea.KeyMsg
	switch key {
	case "enter":
		msg = tea.KeyMsg{Type: tea.KeyEnter}
	case "esc":
		msg = tea.KeyMsg{Type: tea.KeyEscape}
	case "backspace":
		msg = tea.KeyMsg{Type: tea.KeyBackspace}
	case "j":
		msg = tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("j")}
	case "k":
		msg = tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("k")}
	default:
		msg = tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(key)}
	}
	return p.Update(msg)
}

// TestPaletteFuzzyFilter verifies that typing a query narrows the candidate
// list to matches only (subsequence fuzzy match).
func TestPaletteFuzzyFilter(t *testing.T) {
	p := buildTestPalette()

	// Initially all candidates are shown (view actions + ticks).
	allCount := len(p.filtered)
	if allCount == 0 {
		t.Fatal("expected candidates before typing, got 0")
	}

	// Type "a1b" — only the tick with id "a1b" should remain.
	p, _ = sendPaletteKey(p, "a")
	p, _ = sendPaletteKey(p, "1")
	p, _ = sendPaletteKey(p, "b")
	if len(p.filtered) == 0 {
		t.Fatalf("after typing 'a1b': expected ≥1 match, got 0 (query=%q)", p.query)
	}
	found := false
	for _, c := range p.filtered {
		if c.kind == candidateTickKind && c.id == "a1b" {
			found = true
		}
	}
	if !found {
		t.Errorf("after typing 'a1b': tick 'a1b' not in filtered results")
	}
}

// TestPaletteFilterNoMatch verifies that an unrecognised query yields zero
// results.
func TestPaletteFilterNoMatch(t *testing.T) {
	p := buildTestPalette()
	p, _ = sendPaletteKey(p, "z")
	p, _ = sendPaletteKey(p, "z")
	p, _ = sendPaletteKey(p, "z")
	if len(p.filtered) != 0 {
		t.Errorf("after typing 'zzz': expected 0 matches, got %d", len(p.filtered))
	}
}

// TestPaletteBackspaceRemovesChar verifies that Backspace removes the last
// query character and widens the filtered set.
func TestPaletteBackspaceRemovesChar(t *testing.T) {
	p := buildTestPalette()
	p, _ = sendPaletteKey(p, "a")
	p, _ = sendPaletteKey(p, "1")
	p, _ = sendPaletteKey(p, "b")
	narrowCount := len(p.filtered)

	p, _ = sendPaletteKey(p, "backspace")
	if p.query != "a1" {
		t.Errorf("after backspace: query = %q, want %q", p.query, "a1")
	}
	if len(p.filtered) < narrowCount {
		t.Errorf("after backspace: filtered shrank further (%d < %d)", len(p.filtered), narrowCount)
	}
}

// TestPaletteEscEmitsClose verifies that Esc returns a paletteCloseMsg command.
func TestPaletteEscEmitsClose(t *testing.T) {
	p := buildTestPalette()
	_, cmd := sendPaletteKey(p, "esc")
	if cmd == nil {
		t.Fatal("Esc: expected a command, got nil")
	}
	msg := cmd()
	if _, ok := msg.(paletteCloseMsg); !ok {
		t.Fatalf("Esc: command returned %T, want paletteCloseMsg", msg)
	}
}

// TestPaletteEnterTickEmitsJump verifies that pressing Enter on a tick
// candidate emits a paletteJumpMsg with the correct id.
func TestPaletteEnterTickEmitsJump(t *testing.T) {
	p := buildTestPalette()
	// Filter to a single tick by typing its id.
	p, _ = sendPaletteKey(p, "a")
	p, _ = sendPaletteKey(p, "1")
	p, _ = sendPaletteKey(p, "b")

	// Find and select a tick candidate.
	tickIdx := -1
	for i, c := range p.filtered {
		if c.kind == candidateTickKind && c.id == "a1b" {
			tickIdx = i
			break
		}
	}
	if tickIdx < 0 {
		t.Fatal("tick 'a1b' not in filtered list after typing 'a1b'")
	}
	p.selected = tickIdx

	_, cmd := sendPaletteKey(p, "enter")
	if cmd == nil {
		t.Fatal("Enter on tick: expected a command, got nil")
	}
	msg := cmd()
	jmp, ok := msg.(paletteJumpMsg)
	if !ok {
		t.Fatalf("Enter on tick: command returned %T, want paletteJumpMsg", msg)
	}
	if jmp.id != "a1b" {
		t.Errorf("paletteJumpMsg.id = %q, want %q", jmp.id, "a1b")
	}
}

// TestPaletteEnterViewEmitsSwitchView verifies that pressing Enter on a
// view-switch candidate emits paletteSwitchViewMsg with the correct index.
func TestPaletteEnterViewEmitsSwitchView(t *testing.T) {
	p := buildTestPalette()
	// Find the first view-switch candidate and select it.
	viewIdx := -1
	for i, c := range p.filtered {
		if c.kind == candidateViewKind {
			viewIdx = i
			break
		}
	}
	if viewIdx < 0 {
		t.Fatal("no view-switch candidate in palette")
	}
	p.selected = viewIdx
	wantVI := p.filtered[viewIdx].viewIndex

	_, cmd := sendPaletteKey(p, "enter")
	if cmd == nil {
		t.Fatal("Enter on view: expected a command, got nil")
	}
	msg := cmd()
	sw, ok := msg.(paletteSwitchViewMsg)
	if !ok {
		t.Fatalf("Enter on view: command returned %T, want paletteSwitchViewMsg", msg)
	}
	if sw.viewIndex != wantVI {
		t.Errorf("paletteSwitchViewMsg.viewIndex = %d, want %d", sw.viewIndex, wantVI)
	}
}

// TestPaletteNavigationJK verifies j/k move the cursor within the filtered list.
func TestPaletteNavigationJK(t *testing.T) {
	p := buildTestPalette()
	if len(p.filtered) < 2 {
		t.Skip("need at least 2 candidates for navigation test")
	}

	// Start at 0; j should move to 1.
	if p.selected != 0 {
		t.Fatalf("initial selected = %d, want 0", p.selected)
	}
	p, _ = sendPaletteKey(p, "j")
	if p.selected != 1 {
		t.Errorf("after j: selected = %d, want 1", p.selected)
	}
	// k should return to 0.
	p, _ = sendPaletteKey(p, "k")
	if p.selected != 0 {
		t.Errorf("after k: selected = %d, want 0", p.selected)
	}
	// k at 0 should not go negative.
	p, _ = sendPaletteKey(p, "k")
	if p.selected != 0 {
		t.Errorf("after k at 0: selected = %d, want 0 (no under-run)", p.selected)
	}
}

// TestAppCtrlKOpensPalette verifies that Ctrl-K sets the focus to focusPalette.
func TestAppCtrlKOpensPalette(t *testing.T) {
	a := newTestApp(t, paletteTicks())
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()

	var m tea.Model = a
	m, _ = m.Update(tea.KeyMsg{Type: tea.KeyCtrlK})
	app := m.(App)
	if app.focus != focusPalette {
		t.Fatalf("after ctrl+k: focus = %v, want focusPalette", app.focus)
	}
}

// TestAppEscClosesPalette verifies that Esc while the palette is focused
// restores focus to focusMain.
func TestAppEscClosesPalette(t *testing.T) {
	a := newTestApp(t, paletteTicks())
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()

	// Open palette.
	var m tea.Model = a
	m, _ = m.Update(tea.KeyMsg{Type: tea.KeyCtrlK})

	// The palette's Esc handler emits a command that returns paletteCloseMsg;
	// the tea runtime dispatches that back into Update. Simulate it:
	_, cmd := m.Update(tea.KeyMsg{Type: tea.KeyEscape})
	if cmd == nil {
		t.Fatal("Esc in palette produced no command")
	}
	closeMsg := cmd()
	m, _ = m.Update(closeMsg)
	if m.(App).focus != focusMain {
		t.Fatalf("after palette Esc+dispatch: focus = %v, want focusMain", m.(App).focus)
	}
}

// TestAppPaletteJumpSetsListSelection verifies that confirming a tick candidate
// in the palette moves the List view's selection to that tick.
func TestAppPaletteJumpSetsListSelection(t *testing.T) {
	ticks := paletteTicks()
	a := newTestApp(t, ticks)
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()

	// Scope to a subtree first so the list has items.
	var m tea.Model = a
	for i := 0; i < 5; i++ {
		m, _ = m.Update(keyMsg("j"))
	}

	// Open the palette.
	m, _ = m.Update(tea.KeyMsg{Type: tea.KeyCtrlK})

	// Simulate a jump to "x9k" (login UI polish) by dispatching paletteJumpMsg
	// directly (unit-testing the App seam without going through the full search).
	m, _ = m.Update(paletteJumpMsg{id: "x9k"})

	app := m.(App)
	if app.focus != focusMain {
		t.Errorf("after jump: focus = %v, want focusMain", app.focus)
	}
	gotID := app.activeView().(Selector).SelectedTickID()
	if gotID != "x9k" {
		t.Errorf("after jump to x9k: selectedTickID = %q, want %q", gotID, "x9k")
	}
}

// TestAppPaletteSwitchView verifies that a paletteSwitchViewMsg changes the
// active view index and restores focus.
func TestAppPaletteSwitchView(t *testing.T) {
	a := newTestApp(t, paletteTicks())
	a.width, a.height = defaultTermWidth, defaultTermHeight
	a.applyLayout()

	var m tea.Model = a
	m, _ = m.Update(tea.KeyMsg{Type: tea.KeyCtrlK})
	m, _ = m.Update(paletteSwitchViewMsg{viewIndex: 0})
	app := m.(App)
	if app.focus != focusMain {
		t.Errorf("after switch-view: focus = %v, want focusMain", app.focus)
	}
	if app.activeIx != 0 {
		t.Errorf("after switch-view 0: activeIx = %d, want 0", app.activeIx)
	}
}

// ── teatest golden: Ctrl-K opens palette, type partial id, Enter jumps ────────

// TestPaletteGolden is the §11 integration golden for the command palette.
// It opens the palette with Ctrl-K, types a partial tick id ("a1"), and presses
// Enter to jump the List selection. The final settled frame (showing the palette
// overlay and/or the post-jump state with the selected tick) is golden-compared.
// Regenerate with: go test -run TestPaletteGolden -update ./internal/tui/
func TestPaletteGolden(t *testing.T) {
	ticks := []tick.Tick{
		fixtureTick("ep1", "Auth revamp", tick.StatusInProgress, 1),
		func() tick.Tick {
			c := fixtureTick("a1b", "token refresh", tick.StatusInProgress, 1)
			c.Parent = "ep1"
			return c
		}(),
		func() tick.Tick {
			c := fixtureTick("x9k", "login UI polish", tick.StatusOpen, 2)
			c.Parent = "ep1"
			return c
		}(),
		fixtureTick("q2m", "SAML config", tick.StatusOpen, 2),
	}
	// Mark first tick as epic.
	ticks[0].Type = tick.TypeEpic

	tm := newTestProgram(t, ticks, defaultTermWidth, defaultTermHeight)

	// Step the sidebar to the Auth revamp project node (5 j-presses).
	for i := 0; i < 5; i++ {
		sendKey(tm, "j")
	}

	// Open the palette with Ctrl-K.
	tm.Send(tea.KeyMsg{Type: tea.KeyCtrlK})

	// Wait until the palette overlay appears in the output (focus label changes
	// to "palette" in the footer).
	teatest.WaitFor(t, tm.Output(), func(b []byte) bool {
		return bytes.Contains(b, []byte("[palette]"))
	}, teatest.WithDuration(5*time.Second))

	// Type partial id "a1" to narrow to "a1b".
	sendKey(tm, "a")
	sendKey(tm, "1")

	// Move to the first tick candidate with j (skip any view-switch entries).
	// We send a few j-presses to ensure we land on a tick candidate.
	sendKey(tm, "j")
	sendKey(tm, "j")

	// Confirm with Enter: the palette emits paletteJumpMsg and closes.
	tm.Send(tea.KeyMsg{Type: tea.KeyEnter})

	// Wait for the palette to close (cursor block gone) and List to show
	// "a1b" as the selected row.
	var frame []byte
	teatest.WaitFor(t, tm.Output(), func(b []byte) bool {
		f := lastFrame(b)
		// Post-jump: palette closed, list shows the scope, footer has palette hint.
		if strings.Contains(f, "ctrl+k: palette") && strings.Contains(f, "[main]") {
			frame = normalizeTimestamps([]byte(f))
			return true
		}
		return false
	}, teatest.WithDuration(5*time.Second))

	// Quit cleanly.
	sendKey(tm, "q")
	tm.WaitFinished(t, teatest.WithFinalTimeout(3*time.Second))

	// Sanity: the shell wired up and the palette hint is in the footer.
	for _, want := range []string{"ctrl+k: palette", "VIEWS", "PROJECTS"} {
		if !bytes.Contains(frame, []byte(want)) {
			t.Errorf("final frame missing %q:\n%s", want, frame)
		}
	}

	teatest.RequireEqualOutput(t, frame)
}
