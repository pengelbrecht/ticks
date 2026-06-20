package tui

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/charmbracelet/x/exp/teatest"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

// fixedNow is the injected clock used in all Timeline unit tests and the golden.
// It must be past all "overdue" target dates in the fixtures and before all
// "on-track" dates.
var fixedNow = time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)

// timelineFixtureTicks returns a fixture set covering all three Slip states:
//
//	t1 — overdue: target_date 2026-01-15 (past), has open child → SlipOverdue
//	t2 — on-track: target_date 2026-12-31 (future) → SlipOnTrack
//	t3 — undated: no target_date → SlipNone
//	c1 — open child of t1 (makes t1 overdue)
func timelineFixtureTicks() []tick.Tick {
	now := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)

	// t1 is an epic with an open child → will be overdue relative to fixedNow.
	t1 := tick.Tick{
		ID: "ov1", Title: "Overdue epic", Status: tick.StatusInProgress,
		Type:       tick.TypeEpic,
		TargetDate: "2026-01-15", // past relative to fixedNow (2026-06-01)
		CreatedAt: now, UpdatedAt: now, CreatedBy: "test", Owner: "test",
	}
	// open child makes t1 overdue (not all work landed).
	c1 := tick.Tick{
		ID: "ov1c", Title: "open child", Status: tick.StatusOpen,
		Type: tick.TypeTask, Parent: "ov1",
		CreatedAt: now, UpdatedAt: now, CreatedBy: "test", Owner: "test",
	}
	// t2: dated in the future → on-track.
	t2 := tick.Tick{
		ID: "ok1", Title: "On-track epic", Status: tick.StatusOpen,
		Type:       tick.TypeEpic,
		TargetDate: "2026-12-31",
		CreatedAt: now, UpdatedAt: now, CreatedBy: "test", Owner: "test",
	}
	// t3: undated → SlipNone.
	t3 := tick.Tick{
		ID: "no1", Title: "Undated task", Status: tick.StatusOpen,
		Type:      tick.TypeTask,
		CreatedAt: now, UpdatedAt: now, CreatedBy: "test", Owner: "test",
	}
	return []tick.Tick{t1, c1, t2, t3}
}

// newTimelineViewFixture builds a sized timelineView from fixture ticks with the
// injected clock set to fixedNow. It bypasses FilterScope by calling buildRows
// directly so all fixture ticks are visible regardless of smart-view filtering.
func newTimelineViewFixture(t *testing.T, ticks []tick.Tick, width, height int) *timelineView {
	t.Helper()
	v := newTimelineView("").(*timelineView)
	v.SetSize(width, height)
	v.now = fixedNow
	v.allTicks = ticks
	v.buildRows(ticks)
	return v
}

// ─────────────────────────────────────────────────────────────────────────────
// Interface compliance
// ─────────────────────────────────────────────────────────────────────────────

func TestTimelineView_ImplementsInterfaces(t *testing.T) {
	var _ View = (*timelineView)(nil)
	var _ Sizable = (*timelineView)(nil)
	var _ ScopeAware = (*timelineView)(nil)
	var _ Selector = (*timelineView)(nil)
}

func TestTimelineView_TitleAndTab(t *testing.T) {
	v := newTimelineView("")
	if v.Title() != "Timeline" {
		t.Errorf("Title() = %q, want %q", v.Title(), "Timeline")
	}
	if v.Tab() != "Timeline" {
		t.Errorf("Tab() = %q, want %q", v.Tab(), "Timeline")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Slip classification drives row styling
// ─────────────────────────────────────────────────────────────────────────────

// TestTimelineView_SlipClassification verifies that the slip signal is computed
// correctly for each fixture row given the injected fixedNow clock.
func TestTimelineView_SlipClassification(t *testing.T) {
	ticks := timelineFixtureTicks()
	v := newTimelineViewFixture(t, ticks, 120, 40)

	byID := make(map[string]timelineRow, len(v.rows))
	for _, r := range v.rows {
		byID[r.t.ID] = r
	}

	tests := []struct {
		id       string
		wantSlip query.SlipStatus
	}{
		{"ov1", query.SlipOverdue},  // past date + open child
		{"ok1", query.SlipOnTrack}, // future date
		{"no1", query.SlipNone},    // undated
	}
	for _, tt := range tests {
		r, ok := byID[tt.id]
		if !ok {
			// c1 (child) may not be in the rows if it wasn't in scope — skip.
			if tt.id == "ov1c" {
				continue
			}
			t.Errorf("row %q not found in timeline rows", tt.id)
			continue
		}
		if r.slip != tt.wantSlip {
			t.Errorf("row %q: slip = %q, want %q", tt.id, r.slip, tt.wantSlip)
		}
	}
}

// TestTimelineView_RenderedSlipDistinction verifies that overdue and on-track
// rows render differently (contain their respective tags in the plain-text output).
func TestTimelineView_RenderedSlipDistinction(t *testing.T) {
	ticks := timelineFixtureTicks()
	v := newTimelineViewFixture(t, ticks, 120, 40)

	out := stripANSI(v.View())

	if !strings.Contains(out, "OVERDUE") {
		t.Errorf("View() missing OVERDUE tag:\n%s", out)
	}
	if !strings.Contains(out, "ON TRACK") {
		t.Errorf("View() missing ON TRACK tag:\n%s", out)
	}
	if !strings.Contains(out, "ov1") {
		t.Errorf("View() missing overdue tick id 'ov1':\n%s", out)
	}
	if !strings.Contains(out, "ok1") {
		t.Errorf("View() missing on-track tick id 'ok1':\n%s", out)
	}
	if !strings.Contains(out, "no1") {
		t.Errorf("View() missing undated tick id 'no1':\n%s", out)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Rows sort by target_date, undated last
// ─────────────────────────────────────────────────────────────────────────────

func TestTimelineView_RowSort(t *testing.T) {
	ticks := timelineFixtureTicks()
	v := newTimelineViewFixture(t, ticks, 120, 40)

	// Collect the (dated) row IDs in display order, skipping child rows.
	var order []string
	for _, r := range v.rows {
		order = append(order, r.t.ID)
	}

	// The expected sort: ov1 (2026-01-15) < ok1 (2026-12-31) < no1 (undated).
	// c1 (child, no date) will land with undated ticks but after no1 by stable
	// sort order; the exact child position among undated rows is implementation-
	// defined. We only assert the three "anchor" IDs are in the right relative
	// order.
	pos := func(id string) int {
		for i, x := range order {
			if x == id {
				return i
			}
		}
		return -1
	}

	posOv1 := pos("ov1")
	posOk1 := pos("ok1")
	posNo1 := pos("no1")

	if posOv1 < 0 || posOk1 < 0 || posNo1 < 0 {
		t.Fatalf("rows missing expected IDs; order=%v", order)
	}
	if posOv1 >= posOk1 {
		t.Errorf("ov1 (%d) should come before ok1 (%d)", posOv1, posOk1)
	}
	if posOk1 >= posNo1 {
		t.Errorf("ok1 (%d) should come before undated no1 (%d)", posOk1, posNo1)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────

func TestTimelineView_NavigateDownUp(t *testing.T) {
	ticks := timelineFixtureTicks()
	v := newTimelineViewFixture(t, ticks, 120, 40)

	start := v.SelectedTickID()

	// Move down.
	v2, _ := sendViewKey(v, "j")
	tv2 := v2.(*timelineView)
	after := tv2.SelectedTickID()
	if after == start {
		t.Error("j did not advance selection")
	}

	// Move back up.
	v3, _ := sendViewKey(tv2, "k")
	tv3 := v3.(*timelineView)
	if got := tv3.SelectedTickID(); got != start {
		t.Errorf("k did not restore selection; got %q, want %q", got, start)
	}

	// Up at top stays put.
	v4, _ := sendViewKey(v, "k")
	if got := v4.(*timelineView).SelectedTickID(); got != start {
		t.Errorf("k at top moved; got %q, want %q", got, start)
	}
}

func TestTimelineView_HomeEnd(t *testing.T) {
	ticks := timelineFixtureTicks()
	v := newTimelineViewFixture(t, ticks, 120, 40)
	first := v.SelectedTickID()

	cur, _ := sendViewKey(v, "G")
	last := cur.(*timelineView).SelectedTickID()
	if last == first {
		t.Error("G did not move to last row")
	}

	cur2, _ := sendViewKey(cur, "g")
	if got := cur2.(*timelineView).SelectedTickID(); got != first {
		t.Errorf("g did not return to first row; got %q, want %q", got, first)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty scope
// ─────────────────────────────────────────────────────────────────────────────

func TestTimelineView_EmptyScopeShowsNoTicksMessage(t *testing.T) {
	v := newTimelineView("").(*timelineView)
	v.SetSize(120, 40)
	v.SetNow(fixedNow)
	// No scope set — rows is nil/empty.
	out := stripANSI(v.View())
	if !strings.Contains(out, "No ticks") {
		t.Errorf("empty view should say 'No ticks', got:\n%s", out)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// renderTimelineRow pure renderer
// ─────────────────────────────────────────────────────────────────────────────

func TestRenderTimelineRow_OverdueContainsOVERDUE(t *testing.T) {
	row := timelineRow{
		t: tick.Tick{
			ID: "abc", Title: "Past deadline", Status: tick.StatusOpen,
			TargetDate: "2026-01-01",
		},
		slip:    query.SlipOverdue,
		dateFmt: "2026-01-01",
	}
	out := stripANSI(renderTimelineRow(row, false, 120))
	if !strings.Contains(out, "OVERDUE") {
		t.Errorf("overdue row missing OVERDUE tag:\n%s", out)
	}
}

func TestRenderTimelineRow_OnTrackContainsONTRACK(t *testing.T) {
	row := timelineRow{
		t: tick.Tick{
			ID: "abc", Title: "Future deadline", Status: tick.StatusOpen,
			TargetDate: "2026-12-31",
		},
		slip:    query.SlipOnTrack,
		dateFmt: "2026-12-31",
	}
	out := stripANSI(renderTimelineRow(row, false, 120))
	if !strings.Contains(out, "ON TRACK") {
		t.Errorf("on-track row missing ON TRACK tag:\n%s", out)
	}
}

func TestRenderTimelineRow_SelectedShowsCursor(t *testing.T) {
	row := timelineRow{
		t:       tick.Tick{ID: "sel", Title: "Selected row", Status: tick.StatusOpen},
		slip:    query.SlipNone,
		dateFmt: "(no date)",
	}
	out := stripANSI(renderTimelineRow(row, true, 120))
	if !strings.HasPrefix(out, "> ") {
		t.Errorf("selected row should start with '> ', got: %q", out)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// teatest golden: Timeline tab renders overdue vs on-track distinctly
// ─────────────────────────────────────────────────────────────────────────────

// timelineGoldenTicks are the fixture ticks for the golden: one overdue epic
// (past target_date + open child), one on-track epic (future date), one undated
// task. The injected clock is fixedNow (2026-06-01).
func timelineGoldenTicks() []tick.Tick {
	base := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)

	overdueEpic := tick.Tick{
		ID: "ov1", Title: "Auth revamp (overdue)", Status: tick.StatusInProgress,
		Type:       tick.TypeEpic,
		TargetDate: "2026-01-15",
		CreatedAt: base, UpdatedAt: base, CreatedBy: "test", Owner: "test",
	}
	overdueChild := tick.Tick{
		ID: "ov1c", Title: "token refresh", Status: tick.StatusOpen,
		Type: tick.TypeTask, Parent: "ov1",
		CreatedAt: base, UpdatedAt: base, CreatedBy: "test", Owner: "test",
	}
	onTrackEpic := tick.Tick{
		ID: "ok1", Title: "Billing setup (on-track)", Status: tick.StatusOpen,
		Type:       tick.TypeEpic,
		TargetDate: "2026-12-31",
		CreatedAt: base, UpdatedAt: base, CreatedBy: "test", Owner: "test",
	}
	undatedTask := tick.Tick{
		ID: "no1", Title: "Undated chore", Status: tick.StatusOpen,
		Type:      tick.TypeChore,
		CreatedAt: base, UpdatedAt: base, CreatedBy: "test", Owner: "test",
	}
	return []tick.Tick{overdueEpic, overdueChild, onTrackEpic, undatedTask}
}

// TestTimelineGolden is the teatest golden for the Timeline view: the App
// launches at 120×40 with the Timeline golden fixtures. It navigates the
// sidebar to the "Roadmap" smart view (j×2 from "Awaiting") which returns all
// ticks, then switches to the Timeline content tab (hotkey "3" — List=1,
// Roadmap=2, Timeline=3), focuses the main pane, and moves the selection down
// once.
//
// The injected clock (fixedNow = 2026-06-01) makes the overdue/on-track
// classification stable regardless of real wall time.
//
// Regenerate with:
//
//	go test -run TestTimelineGolden -update ./internal/tui/
func TestTimelineGolden(t *testing.T) {
	ticks := timelineGoldenTicks()
	pinTestProfile(t)
	storePath := seedTickFixtures(t, ticks)

	// Build the App with a patched timeline view that uses fixedNow.
	app := NewApp(ticks, storePath, "")
	t.Cleanup(app.Close)

	// Patch the timeline view's clock: find it in the registry and inject.
	// We must also rebuild rows with the correct clock before the program starts.
	for i := 0; i < app.views.len(); i++ {
		if tv, ok := app.views.at(i).(*timelineView); ok {
			tv.now = fixedNow
			tv.allTicks = ticks
			tv.buildRows(ticks)
			app.views.replace(i, tv)
		}
	}

	tm := teatest.NewTestModel(t, app, teatest.WithInitialTermSize(defaultTermWidth, defaultTermHeight))

	// Navigate sidebar to "Roadmap" smart view (j×2: Awaiting→My ticks→Roadmap).
	// The Roadmap smart view returns allTicks — all fixtures are visible.
	sendKey(tm, "j")
	sendKey(tm, "j")
	// Switch to the Timeline content tab (hotkey "4": List=1, Board=2, Roadmap=3, Timeline=4).
	sendKey(tm, "4")
	// Focus the main pane.
	tm.Send(keyMsg("tab"))
	// Move selection down once.
	sendKey(tm, "j")

	// Wait for the settled frame: Timeline tab active + OVERDUE visible.
	var frame []byte
	teatest.WaitFor(t, tm.Output(), func(b []byte) bool {
		f := lastFrame(b)
		if strings.Contains(f, "‹Timeline›") && strings.Contains(f, "OVERDUE") {
			frame = normalizeTimestamps([]byte(f))
			return true
		}
		return false
	}, teatest.WithDuration(5*time.Second))

	sendKey(tm, "q")
	tm.WaitFinished(t, teatest.WithFinalTimeout(3*time.Second))

	// Sanity: key tick IDs and slip tags visible.
	for _, want := range []string{"ov1", "ok1", "OVERDUE", "ON TRACK", "‹Timeline›"} {
		if !bytes.Contains(frame, []byte(want)) {
			t.Errorf("golden frame missing %q", want)
		}
	}

	teatest.RequireEqualOutput(t, frame)
}
