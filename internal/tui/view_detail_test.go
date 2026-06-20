package tui

import (
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/x/exp/teatest"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// newBoundDetail builds a detail pane bound to a seeded store with one tick and
// returns the detail, the store path, and the tick id.
func newBoundDetail(t *testing.T, mut func(*tick.Tick)) (detail, string, string) {
	t.Helper()
	tk := validFixture("d1a", "detail tick", tick.StatusOpen, 2)
	if mut != nil {
		mut(&tk)
	}
	path := seedTickFixtures(t, []tick.Tick{tk})
	d := newDetail(path, "tester")
	d.SetSize(40, 30)
	tc := tk
	d.SetTick(&tc)
	return d, path, tk.ID
}

// TestDetailInlineStatusEditPersists drives the status field cycle (the active
// field on a fresh selection) and asserts the edit lands in the store.
func TestDetailInlineStatusEditPersists(t *testing.T) {
	d, path, id := newBoundDetail(t, nil)

	// fieldStatus is index 0 (active on fresh selection). "e" begins the edit,
	// which for status cycles open → in_progress and writes immediately.
	d, _, consumed := d.Update(keyMsg("e"))
	if !consumed {
		t.Fatal("status edit key not consumed")
	}
	if d.tick.Status != tick.StatusInProgress {
		t.Errorf("in-memory status = %q, want in_progress", d.tick.Status)
	}
	rr := reread(t, path, id)
	if rr.Status != tick.StatusInProgress {
		t.Errorf("persisted status = %q, want in_progress", rr.Status)
	}
}

// TestDetailInlinePriorityEditPersists cycles to the priority field and edits it.
func TestDetailInlinePriorityEditPersists(t *testing.T) {
	d, path, id := newBoundDetail(t, nil) // priority 2

	d, _, _ = d.Update(keyMsg("n")) // status -> priority
	if d.activeField() != fieldPriority {
		t.Fatalf("active field = %v, want priority", d.activeField())
	}
	d, _, _ = d.Update(keyMsg("e")) // 2 -> 3
	if d.tick.Priority != 3 {
		t.Errorf("in-memory priority = %d, want 3", d.tick.Priority)
	}
	if rr := reread(t, path, id); rr.Priority != 3 {
		t.Errorf("persisted priority = %d, want 3", rr.Priority)
	}
}

// TestDetailInlineOwnerEditPersists opens the owner textinput, types a value,
// and commits it with Enter.
func TestDetailInlineOwnerEditPersists(t *testing.T) {
	d, path, id := newBoundDetail(t, nil)

	// Cycle to the owner field (status, priority, owner = 2 next-presses).
	d, _, _ = d.Update(keyMsg("n"))
	d, _, _ = d.Update(keyMsg("n"))
	if d.activeField() != fieldOwner {
		t.Fatalf("active field = %v, want owner", d.activeField())
	}
	// Begin edit (opens textinput seeded with "alice").
	d, _, _ = d.Update(keyMsg("e"))
	if !d.editing {
		t.Fatal("owner edit did not enter editing mode")
	}
	// Clear and type a new owner.
	d.input.SetValue("")
	d, _, _ = d.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("bob")})
	d, _, _ = d.Update(keyMsg("enter")) // commit
	if d.editing {
		t.Fatal("owner edit still in editing mode after commit")
	}
	if d.tick.Owner != "bob" {
		t.Errorf("in-memory owner = %q, want bob", d.tick.Owner)
	}
	if rr := reread(t, path, id); rr.Owner != "bob" {
		t.Errorf("persisted owner = %q, want bob", rr.Owner)
	}
}

// TestDetailEscCancelsInlineEdit verifies Esc abandons a free-text edit without
// writing.
func TestDetailEscCancelsInlineEdit(t *testing.T) {
	d, path, id := newBoundDetail(t, nil)
	d, _, _ = d.Update(keyMsg("n"))
	d, _, _ = d.Update(keyMsg("n")) // owner
	d, _, _ = d.Update(keyMsg("e")) // open input
	d.input.SetValue("zzz")
	d, _, consumed := d.Update(keyMsg("esc"))
	if !consumed {
		t.Fatal("esc not consumed during edit")
	}
	if d.editing {
		t.Fatal("esc did not cancel edit")
	}
	if rr := reread(t, path, id); rr.Owner != "alice" {
		t.Errorf("owner persisted despite cancel = %q, want alice", rr.Owner)
	}
}

// TestDetailAddBlockerPersists exercises the palette-driven free-text blocker
// prompt on the detail pane.
func TestDetailAddBlockerPersists(t *testing.T) {
	d, path, id := newBoundDetail(t, nil)
	d.beginAddBlocker()
	if !d.editing || !d.addingBlocker {
		t.Fatal("beginAddBlocker did not enter blocker edit mode")
	}
	d, _, _ = d.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("blk9")})
	d, _, _ = d.Update(keyMsg("enter"))
	if rr := reread(t, path, id); len(rr.BlockedBy) != 1 || rr.BlockedBy[0] != "blk9" {
		t.Errorf("persisted blockers = %v, want [blk9]", rr.BlockedBy)
	}
}

// ── App integration: inline status edit reflected, and 2-pane Enter swap ──────

// detailTicks is a fixture set with a populated project subtree for the App
// integration tests.
func detailTicks() []tick.Tick {
	epic := validFixture("ep1", "Auth revamp", tick.StatusInProgress, 1)
	epic.Type = tick.TypeEpic
	c1 := validFixture("a1b", "token refresh", tick.StatusOpen, 1)
	c1.Parent = "ep1"
	return []tick.Tick{epic, c1}
}

// appAt builds an App over a seeded store at a given width so layout mode is
// deterministic, focuses the populated subtree, and returns it.
func appAt(t *testing.T, ticks []tick.Tick, width int) (App, string) {
	t.Helper()
	path := seedTickFixtures(t, ticks)
	a := NewApp(ticks, path, "tester")
	t.Cleanup(a.Close)
	a.width, a.height = width, 40
	a.applyLayout()
	return a, path
}

// TestAppInlineStatusEditRoundTrips selects a tick, edits its status inline via
// the detail pane, and asserts the persisted tick reflects the new status
// (round-trip through the temp store).
func TestAppInlineStatusEditRoundTrips(t *testing.T) {
	a, path := appAt(t, detailTicks(), defaultTermWidth) // 3-pane

	var m tea.Model = a
	// Step the sidebar to the project subtree.
	for i := 0; i < 6; i++ {
		m, _ = m.Update(keyMsg("j"))
	}
	m, _ = m.Update(keyMsg("tab")) // sidebar -> main
	app := m.(App)
	id := app.activeView().(Selector).SelectedTickID()
	if id == "" {
		t.Fatal("no tick selected in main pane")
	}
	before := app.byID[id].Status

	m, _ = m.Update(keyMsg("tab")) // main -> detail (3-pane peek stays focused)
	if m.(App).focus != focusDetail {
		t.Fatalf("focus = %v, want detail", m.(App).focus)
	}
	// "e" on the status field cycles + writes.
	m, _ = m.Update(keyMsg("e"))
	app = m.(App)

	wantNext := nextStatus(before)
	if app.detail.tick == nil || app.detail.tick.Status != wantNext {
		t.Fatalf("detail status = %v, want %q", app.detail.tick, wantNext)
	}
	// App mirrored the edit into its index.
	if app.byID[id].Status != wantNext {
		t.Errorf("byID status = %q, want %q", app.byID[id].Status, wantNext)
	}
	// Round-trip: re-read from the temp store.
	if rr := reread(t, path, id); rr.Status != wantNext {
		t.Errorf("persisted status = %q, want %q", rr.Status, wantNext)
	}
}

func nextStatus(s string) string {
	for i, v := range statusCycle {
		if v == s {
			return statusCycle[(i+1)%len(statusCycle)]
		}
	}
	return statusCycle[0]
}

// TestAppTwoPaneEnterSwapsDetailEscReturns verifies the medium-width adaptive
// behaviour: Enter on the main pane swaps to the detail pane; Esc returns.
func TestAppTwoPaneEnterSwapsDetailEscReturns(t *testing.T) {
	a, _ := appAt(t, detailTicks(), 100) // medium width -> 2-pane
	if modeForWidth(a.width) != layoutTwo {
		t.Fatalf("width 100 mode = %v, want layoutTwo", modeForWidth(a.width))
	}

	var m tea.Model = a
	for i := 0; i < 6; i++ {
		m, _ = m.Update(keyMsg("j"))
	}
	m, _ = m.Update(keyMsg("tab")) // -> main
	if m.(App).focus != focusMain {
		t.Fatalf("focus = %v, want main", m.(App).focus)
	}
	// Enter swaps to detail in the 2-pane layout.
	m, _ = m.Update(keyMsg("enter"))
	app := m.(App)
	if app.focus != focusDetail {
		t.Fatalf("after Enter: focus = %v, want detail", app.focus)
	}
	if !app.detailVisible {
		t.Errorf("after Enter: detail not visible in 2-pane swap")
	}
	// Esc returns to the main pane.
	m, _ = app.Update(keyMsg("esc"))
	app = m.(App)
	if app.focus != focusMain {
		t.Fatalf("after Esc: focus = %v, want main", app.focus)
	}
	if app.detailVisible {
		t.Errorf("after Esc: detail still visible, want main shown")
	}
}

// TestPaletteEditApproveActsOnSelection verifies a palette EDIT action runs
// through the shared edit func against the selected tick.
func TestPaletteEditApproveActsOnSelection(t *testing.T) {
	ticks := detailTicks()
	// Make the child awaiting approval so approve closes it.
	ticks[1].Status = tick.StatusInProgress
	req := tick.RequiresApproval
	ticks[1].Requires = &req
	aw := tick.AwaitingApproval
	ticks[1].Awaiting = &aw

	a, path := appAt(t, ticks, defaultTermWidth)
	var m tea.Model = a
	for i := 0; i < 6; i++ {
		m, _ = m.Update(keyMsg("j"))
	}
	m, _ = m.Update(keyMsg("tab")) // -> main, select child
	app := m.(App)
	id := app.activeView().(Selector).SelectedTickID()
	if id != "a1b" {
		t.Fatalf("selected = %q, want a1b", id)
	}
	// Open palette, dispatch an approve edit message directly.
	m, _ = m.Update(tea.KeyMsg{Type: tea.KeyCtrlK})
	m, _ = m.Update(paletteEditMsg{action: editActionApprove})
	app = m.(App)
	if app.focus != focusMain {
		t.Errorf("after edit action: focus = %v, want main", app.focus)
	}
	if rr := reread(t, path, "a1b"); rr.Status != tick.StatusClosed {
		t.Errorf("a1b persisted status = %q, want closed (approved)", rr.Status)
	}
}

// ── Golden: inline status edit reflected in the frame ─────────────────────────

// TestDetailStatusEditGolden launches the real App, selects a tick, edits its
// status inline, and golden-compares the settled frame (the detail metadata now
// shows the cycled status). Regenerate with:
//
//	go test -run TestDetailStatusEditGolden -update ./internal/tui/
func TestDetailStatusEditGolden(t *testing.T) {
	tm := newTestProgram(t, detailGoldenTicks(), defaultTermWidth, defaultTermHeight)

	// Step the sidebar to the Auth revamp project node, focus main, move to the
	// open child (a1b), then focus the detail peek and edit its status.
	for i := 0; i < 6; i++ {
		sendKey(tm, "j")
	}
	tm.Send(keyMsg("tab")) // sidebar -> main
	sendKey(tm, "j")       // ep1 -> a1b (the open child)
	tm.Send(keyMsg("tab")) // main -> detail (3-pane peek)
	sendKey(tm, "e")       // cycle status open -> in_progress, write

	var frame []byte
	teatest.WaitFor(t, tm.Output(), func(b []byte) bool {
		f := lastFrame(b)
		if strings.Contains(f, "[detail]") && strings.Contains(f, "in_progress") {
			frame = normalizeTimestamps([]byte(f))
			return true
		}
		return false
	}, teatest.WithDuration(5*time.Second))

	sendKey(tm, "q")
	tm.WaitFinished(t, teatest.WithFinalTimeout(3*time.Second))

	if !strings.Contains(string(frame), "in_progress") {
		t.Errorf("frame missing edited status 'in_progress':\n%s", frame)
	}
	teatest.RequireEqualOutput(t, frame)
}

// detailGoldenTicks is a fixed fixture for the detail golden: one epic and one
// open child (the child is selected and edited).
func detailGoldenTicks() []tick.Tick {
	epic := validFixture("ep1", "Auth revamp", tick.StatusInProgress, 1)
	epic.Type = tick.TypeEpic
	c1 := validFixture("a1b", "token refresh", tick.StatusOpen, 1)
	c1.Parent = "ep1"
	return []tick.Tick{epic, c1}
}
