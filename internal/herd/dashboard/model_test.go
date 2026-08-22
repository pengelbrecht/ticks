package dashboard

import (
	"fmt"
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/muesli/termenv"

	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// The model is driven entirely by synthetic messages here: no socket, no
// goroutine, no clock. That is deliberate — teatest goldens over this view
// would have to stand up a herdtest socket and a temp repo per frame, and the
// frame's content is dominated by ids and timings a golden would have to
// normalise away. The model tests below assert the behaviour a golden would
// only imply (that a pushed event, and nothing else, moves a status), so the
// goldens are not carried. See the report notes on this choice.

// pinProfile fixes the color profile so View() output carries no escape
// sequences and substring assertions are legible.
func pinProfile(t *testing.T) {
	t.Helper()
	before := lipgloss.ColorProfile()
	lipgloss.SetColorProfile(termenv.Ascii)
	t.Cleanup(func() { lipgloss.SetColorProfile(before) })
}

// testModel builds a model with no herd client (so nothing starts a goroutine)
// and a frozen clock.
func testModel(t *testing.T) *Model {
	t.Helper()
	m := New(t.Context(), Config{
		RepoRoot:        t.TempDir(),
		Epic:            "zz0",
		RefreshInterval: -1,
		Now:             func() time.Time { return fixedTime },
	})
	t.Cleanup(m.Close)
	m.width, m.height = 120, 40
	return m
}

// boardSnapshot is a two-worker board at the frozen clock.
func boardSnapshot() Snapshot {
	return Snapshot{
		RepoRoot: "/repo",
		Epic:     "zz0",
		LoadedAt: fixedTime,
		Epics: []EpicBoard{{
			Epic:  "zz0",
			Title: "mission control",
			Waves: []WaveRow{
				{Number: 1, Ticks: []TickRow{
					{ID: "m05", Title: "dashboard pane", Status: tick.StatusInProgress, PaneID: "w1:p1", Agent: "tick-m05"},
				}},
				{Number: 2, Ticks: []TickRow{
					{ID: "o83", Title: "paint hook", Status: tick.StatusOpen, Blocked: true, PaneID: "w1:p2", Agent: "tick-o83"},
				}},
			},
			Workers: []WorkerRow{
				{Tick: "m05", Agent: "tick-m05", PaneID: "w1:p1", Kind: "claude", Branch: "tick/m05", Status: client.StatusWorking},
				{Tick: "o83", Agent: "tick-o83", PaneID: "w1:p2", Kind: "claude", Branch: "tick/o83", Status: client.StatusIdle},
			},
		}},
	}
}

func apply(m *Model, msg tea.Msg) tea.Cmd {
	_, cmd := m.Update(msg)
	return cmd
}

func TestSnapshotRendersWavesTicksAndWorkers(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})

	view := m.View()
	for _, want := range []string{
		"Ticks mission control", "epic zz0", "mission control",
		"wave 1", "wave 2", "m05", "dashboard pane", "o83", "paint hook",
		"workers", "claude", "2 workers",
	} {
		if !strings.Contains(view, want) {
			t.Errorf("view missing %q:\n%s", want, view)
		}
	}
}

// The load-bearing behaviour: a pushed status event alone changes what the
// board shows. No re-list happens in this test — the ticker is disabled and
// there is no herd client — so nothing but the event could have moved it.
func TestPushedEventUpdatesStatusWithoutReload(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})

	if got := m.Status("w1:p1", client.StatusUnknown); got != client.StatusUnknown {
		t.Fatalf("overlay pre-seeded with %q, want nothing before any event", got)
	}
	before := m.View()
	if !strings.Contains(before, "working") {
		t.Fatalf("snapshot status not rendered:\n%s", before)
	}

	apply(m, StatusMsg{PaneID: "w1:p1", Status: client.StatusBlocked, At: fixedTime.Add(time.Second)})

	if got := m.Status("w1:p1", client.StatusWorking); got != client.StatusBlocked {
		t.Errorf("status after event = %q, want blocked", got)
	}
	if m.Events() != 1 {
		t.Errorf("Events() = %d, want 1", m.Events())
	}
	after := m.View()
	if !strings.Contains(after, "blocked") {
		t.Errorf("view did not pick up the pushed status:\n%s", after)
	}
	if !strings.Contains(after, "1 blocked") {
		t.Errorf("header counts did not follow the event:\n%s", after)
	}
}

// Every event message must re-arm the channel read, or the board goes deaf
// after one event.
func TestEventMessagesReArmTheWatcher(t *testing.T) {
	m := testModel(t)
	for _, msg := range []tea.Msg{
		StatusMsg{PaneID: "w1:p1", Status: client.StatusDone},
		StreamMsg{Up: true, Panes: 2},
		FSWatchMsg{Up: true},
		ReloadMsg{},
	} {
		if cmd := apply(m, msg); cmd == nil {
			t.Errorf("%T produced no follow-up command; the watcher read is not re-armed", msg)
		}
	}
}

// A newer listing supersedes an older event; an event that arrived DURING the
// load does not get thrown away.
func TestSnapshotSupersedesOlderEventsOnly(t *testing.T) {
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})

	stale := StatusMsg{PaneID: "w1:p1", Status: client.StatusBlocked, At: fixedTime.Add(-time.Minute)}
	fresh := StatusMsg{PaneID: "w1:p2", Status: client.StatusDone, At: fixedTime.Add(time.Minute)}
	apply(m, stale)
	apply(m, fresh)

	newer := boardSnapshot()
	newer.LoadedAt = fixedTime
	apply(m, SnapshotMsg{Snapshot: newer})

	if got := m.Status("w1:p1", client.StatusWorking); got != client.StatusWorking {
		t.Errorf("stale event survived the re-list: status = %q, want working", got)
	}
	if got := m.Status("w1:p2", client.StatusIdle); got != client.StatusDone {
		t.Errorf("in-flight event was dropped by the re-list: status = %q, want done", got)
	}
}

// A worker leaving the board must not leave its status behind.
func TestOverlayDropsVanishedPanes(t *testing.T) {
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})
	apply(m, StatusMsg{PaneID: "w1:p2", Status: client.StatusDone, At: fixedTime.Add(time.Minute)})

	shrunk := boardSnapshot()
	shrunk.Epics[0].Workers = shrunk.Epics[0].Workers[:1]
	apply(m, SnapshotMsg{Snapshot: shrunk})

	if got := m.Status("w1:p2", client.StatusUnknown); got != client.StatusUnknown {
		t.Errorf("status kept for a pane no longer on the board: %q", got)
	}
}

func TestFailedLoadKeepsPreviousBoard(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})
	apply(m, SnapshotMsg{Err: errTest})

	view := m.View()
	if !strings.Contains(view, "dashboard pane") {
		t.Errorf("board blanked on a failed reload:\n%s", view)
	}
	if !strings.Contains(view, "load: boom") {
		t.Errorf("load error not surfaced:\n%s", view)
	}
}

func TestStreamHealthIsRendered(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})

	apply(m, StreamMsg{Up: true, Panes: 2})
	if v := m.View(); !strings.Contains(v, "events live (2 panes)") {
		t.Errorf("live stream not reported:\n%s", v)
	}
	apply(m, StreamMsg{Up: false, Panes: 2, Err: errTest})
	if v := m.View(); !strings.Contains(v, "events down") {
		t.Errorf("stream outage not reported:\n%s", v)
	}
}

// A filesystem watcher failure must show up in the header, exactly like a
// dead herdr event stream, and must not stop the safety ticker from asking
// for a reload — this is the degrade-gracefully path fswatch.go promises.
func TestFSWatchErrorIsRenderedAndTickerStillReloads(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})

	apply(m, FSWatchMsg{Up: false, Err: errTest})
	v := m.View()
	if !strings.Contains(v, "fswatch: boom") {
		t.Errorf("fs watch error not rendered:\n%s", v)
	}

	if cmd := apply(m, refreshTickMsg(time.Time{})); cmd == nil {
		t.Error("safety ticker produced no reload command while fswatch is degraded")
	}

	// A subsequent Up:true recovers the header.
	apply(m, FSWatchMsg{Up: true})
	if v := m.View(); strings.Contains(v, "fswatch:") {
		t.Errorf("fs watch error still rendered after recovery:\n%s", v)
	}
}

func TestCursorNavigationAndSelection(t *testing.T) {
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})

	// Row 0 is the epic header, so nothing is selected until the cursor
	// steps into the epic's ticks.
	if _, ok := m.Selected(); ok {
		t.Fatal("cursor started on a tick, not the epic header")
	}
	apply(m, key("j"))
	sel, ok := m.Selected()
	if !ok || sel.ID != "m05" {
		t.Fatalf("first tick selection = %q (%v), want m05", sel.ID, ok)
	}
	apply(m, key("j"))
	if sel, _ = m.Selected(); sel.ID != "o83" {
		t.Errorf("after j selection = %q, want o83", sel.ID)
	}
	// Clamped at the end, not wrapped: a board is a list, not a carousel.
	apply(m, key("j"))
	if sel, _ = m.Selected(); sel.ID != "o83" {
		t.Errorf("selection ran past the end: %q", sel.ID)
	}
	apply(m, key("k"))
	if sel, _ = m.Selected(); sel.ID != "m05" {
		t.Errorf("k did not step back to the first tick: %q", sel.ID)
	}
	apply(m, key("k"))
	apply(m, key("k"))
	if _, ok := m.Selected(); ok {
		t.Error("selection ran past the epic header at the top")
	}

	// The seam tick 5yt hangs actions off.
	w, ok := m.Worker("m05")
	if !ok || w.PaneID != "w1:p1" {
		t.Errorf("Worker(m05) = %+v, %v; want the manifest's pane", w, ok)
	}
	if _, ok := m.Worker("nope"); ok {
		t.Error("Worker returned a row for an unspawned tick")
	}
}

// The cursor must survive a board that shrank under it.
func TestCursorClampsOnSmallerSnapshot(t *testing.T) {
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})
	apply(m, key("G"))

	shrunk := boardSnapshot()
	shrunk.Epics[0].Waves = shrunk.Epics[0].Waves[:1]
	apply(m, SnapshotMsg{Snapshot: shrunk})

	sel, ok := m.Selected()
	if !ok || sel.ID != "m05" {
		t.Errorf("selection = %q (%v) after the board shrank, want m05", sel.ID, ok)
	}
}

// A board taller than the terminal must scroll to follow the cursor, not
// truncate: j/k/g/G have to reach the last epic and every tick under it, and
// a new tick must be reachable without resizing the terminal.
func TestBoardScrollsToFollowCursor(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	m.width, m.height = 120, 12

	snap := tallBoard()
	apply(m, SnapshotMsg{Snapshot: snap})

	// The last tick must not be visible before navigation: it sits beyond the
	// terminal's window, and a truncating board drops it silently.
	if strings.Contains(m.View(), "ep-z9") {
		t.Fatalf("last tick rendered before navigation (board is not truncating):\n%s", m.View())
	}

	// g reaches the first selectable row: the first epic header.
	apply(m, key("G"))
	apply(m, key("g"))
	sel, ok := m.SelectedEpic()
	if !ok || sel != "ep-a" {
		t.Fatalf("g landed on %q (%v), want ep-a", sel, ok)
	}
	if !strings.Contains(m.View(), "ep-a") {
		t.Fatalf("g did not scroll the first epic into view:\n%s", m.View())
	}

	// G reaches the very last selectable row: the last tick under the last
	// epic. That is the deepest reachable row in the board.
	apply(m, key("G"))
	got, ok := m.Selected()
	if !ok || got.ID != "ep-z9" {
		t.Fatalf("G selection = %q (%v), want ep-z9", got.ID, ok)
	}
	if !strings.Contains(m.View(), "ep-z9") {
		t.Fatalf("G did not scroll the last tick into view:\n%s", m.View())
	}
	if !strings.Contains(m.View(), "ep-z") {
		t.Fatalf("G did not scroll the last epic header into view:\n%s", m.View())
	}

	// Step back one: the previous tick stays reachable and visible.
	apply(m, key("k"))
	if got, _ = m.Selected(); got.ID != "ep-z8" {
		t.Fatalf("k selection = %q, want ep-z8", got.ID)
	}
	if !strings.Contains(m.View(), "ep-z8") {
		t.Fatalf("k did not keep the previous tick visible:\n%s", m.View())
	}
}

// A tick that lands under the last epic after the board grows must be
// reachable without resizing: a single j from the epic header selects it and
// scrolls it into view.
func TestNewTickReachableWithoutResize(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	m.width, m.height = 120, 12

	apply(m, SnapshotMsg{Snapshot: tallBoard()})
	apply(m, key("G"))

	// A new tick appears under the last epic, after the board was already at
	// the bottom.
	grown := tallBoard()
	ep := &grown.Epics[len(grown.Epics)-1]
	ep.Waves[0].Ticks = append(ep.Waves[0].Ticks, TickRow{ID: "ep-z10", Title: "fresh", Status: tick.StatusOpen})
	apply(m, SnapshotMsg{Snapshot: grown})

	apply(m, key("j"))
	got, ok := m.Selected()
	if !ok || got.ID != "ep-z10" {
		t.Fatalf("new tick selection = %q (%v), want ep-z10", got.ID, ok)
	}
	if !strings.Contains(m.View(), "ep-z10") {
		t.Fatalf("new tick not visible without resizing:\n%s", m.View())
	}
}

// tallBoard is a board far taller than a 12-line terminal: 10 epics with one
// tick each (ep-a through ep-j), plus a last epic ep-z carrying 10 ticks.
// Every epic is open so every tick is a selectable row.
func tallBoard() Snapshot {
	var epics []EpicBoard
	for _, id := range []string{"ep-a", "ep-b", "ep-c", "ep-d", "ep-e", "ep-f", "ep-g", "ep-h", "ep-i", "ep-j"} {
		epics = append(epics, EpicBoard{
			Epic:  id,
			Title: id + " title",
			Waves: []WaveRow{{Number: 1, Ticks: []TickRow{{ID: id + "0", Title: id + " tick", Status: tick.StatusOpen}}}},
		})
	}
	z := EpicBoard{Epic: "ep-z", Title: "ep-z title"}
	var zticks []TickRow
	for i := range 10 {
		zticks = append(zticks, TickRow{ID: fmt.Sprintf("ep-z%d", i), Title: "tick", Status: tick.StatusOpen})
	}
	z.Waves = []WaveRow{{Number: 1, Ticks: zticks}}
	epics = append(epics, z)
	return Snapshot{RepoRoot: "/repo", LoadedAt: fixedTime, Epics: epics}
}

func TestQuitKeys(t *testing.T) {
	for _, k := range []string{"q", "esc", "ctrl+c"} {
		m := testModel(t)
		cmd := apply(m, key(k))
		if cmd == nil {
			t.Fatalf("%q produced no command, want tea.Quit", k)
		}
		if msg := cmd(); msg == nil {
			t.Fatalf("%q command produced no message", k)
		} else if _, ok := msg.(tea.QuitMsg); !ok {
			t.Errorf("%q produced %T, want tea.QuitMsg", k, msg)
		}
		if !m.Quitting() {
			t.Errorf("%q did not mark the model quitting", k)
		}
		if m.View() != "" {
			t.Errorf("%q left a frame behind after quitting", k)
		}
		m.Close()
	}
}

func TestReloadKeyRequestsASnapshot(t *testing.T) {
	m := testModel(t)
	if apply(m, key("r")) == nil {
		t.Error("r produced no reload command")
	}
}

func TestEmptyBoardExplainsItself(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: Snapshot{RepoRoot: "/repo", LoadedAt: fixedTime}})
	if v := m.View(); !strings.Contains(v, "no epics with run state") {
		t.Errorf("empty board did not explain itself:\n%s", v)
	}
}

// A narrow pane must not produce lines wider than the terminal, or herdr's
// split wraps the board into unreadable noise.
func TestViewRespectsTerminalSize(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	m.width, m.height = 40, 12
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})

	view := m.View()
	for _, line := range strings.Split(view, "\n") {
		if w := lipgloss.Width(line); w > 40 {
			t.Errorf("line %d cells wide in a 40-cell terminal: %q", w, line)
		}
	}
	if n := len(strings.Split(view, "\n")); n > 12 {
		t.Errorf("view is %d lines in a 12-line terminal", n)
	}
}

// The manifest's CreatedAt is the total age since spawn, independent of
// status.
func TestWorkerRowShowsAgeFromCreatedAt(t *testing.T) {
	pinProfile(t)
	m := testModel(t)

	snap := boardSnapshot()
	snap.Epics[0].Workers[0].CreatedAt = fixedTime.Add(-9*time.Minute - time.Second).Format(state.TimeLayout)
	apply(m, SnapshotMsg{Snapshot: snap})

	// The row's single timer is unlabelled — the detail view is where the
	// labelled "age" and the time-in-status live.
	if v := m.View(); !strings.Contains(v, "9m01s") {
		t.Errorf("worker row age not rendered from CreatedAt:\n%s", v)
	}
}

// A worker row with no parseable CreatedAt (an empty manifest field, or one
// this board version cannot read) must not render a fabricated age.
func TestWorkerRowHidesAgeWithoutCreatedAt(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})

	if v := m.View(); strings.Contains(v, "age ") {
		t.Errorf("age rendered without a CreatedAt to derive it from:\n%s", v)
	}
}

// The status timer lives in the DETAIL view: the worker row carries only the
// worker's age, because the row's status column already names the status.
// The status timer starts at zero on the pane's first observation (history
// before the dashboard was watching is unknowable), then advances with the
// clock, and resets to zero the moment a transition is observed — whether
// through a re-list's listing delta or a pushed event.
func TestStatusTimerStartsAtFirstObservationAndResetsOnTransition(t *testing.T) {
	pinProfile(t)
	clock := fixedTime
	m := New(t.Context(), Config{
		RepoRoot:        t.TempDir(),
		Epic:            "zz0",
		RefreshInterval: -1,
		Now:             func() time.Time { return clock },
	})
	t.Cleanup(m.Close)
	m.width, m.height = 120, 40

	// First observation: the worker's status (working) starts at zero even
	// though it may have been working for a while before the board opened.
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})
	apply(m, key("j"))     // off the epic header, onto m05
	apply(m, key("enter")) // into the detail view, where the status timer lives
	if v := m.View(); !strings.Contains(v, "working 0s") {
		t.Fatalf("first observation did not start the status timer at zero:\n%s", v)
	}

	clock = fixedTime.Add(90 * time.Second)
	if v := m.View(); !strings.Contains(v, "working 1m30s") {
		t.Errorf("status timer did not advance with the clock:\n%s", v)
	}

	// A transition observed through a re-list's listing delta resets it.
	relisted := boardSnapshot()
	relisted.Epics[0].Workers[0].Status = client.StatusIdle
	relisted.LoadedAt = clock
	apply(m, SnapshotMsg{Snapshot: relisted})
	if v := m.View(); !strings.Contains(v, "idle 0s") {
		t.Fatalf("transition observed via re-list did not reset the timer:\n%s", v)
	}

	// A transition observed through a pushed event also resets it.
	clock = clock.Add(30 * time.Second)
	apply(m, StatusMsg{PaneID: "w1:p1", Status: client.StatusBlocked, At: clock})
	if v := m.View(); !strings.Contains(v, "blocked 0s") {
		t.Fatalf("transition observed via event did not reset the timer:\n%s", v)
	}

	clock = clock.Add(4 * time.Second)
	if v := m.View(); !strings.Contains(v, "blocked 4s") {
		t.Errorf("status timer did not advance after the event reset it:\n%s", v)
	}
}

// The once-a-second display tick must run only while a worker is unsettled,
// and must stop rescheduling itself the moment the board settles — an idle
// board is never woken on its own.
func TestDisplayTickerRunsOnlyWhileUnsettled(t *testing.T) {
	m := testModel(t)

	// No workers at all: nothing to tick for.
	if cmd := apply(m, SnapshotMsg{Snapshot: Snapshot{RepoRoot: "/repo", LoadedAt: fixedTime}}); cmd != nil {
		t.Error("an empty board armed a display tick")
	}

	// boardSnapshot has a working worker and an idle one — both unsettled.
	if cmd := apply(m, SnapshotMsg{Snapshot: boardSnapshot()}); cmd == nil {
		t.Fatal("an unsettled board did not arm a display tick")
	}

	// While still unsettled, a firing tick must reschedule itself.
	if cmd := apply(m, displayTickMsg(fixedTime)); cmd == nil {
		t.Error("display tick did not reschedule itself while the board is unsettled")
	}

	// Every worker settles (done).
	settled := boardSnapshot()
	for i := range settled.Epics[0].Workers {
		settled.Epics[0].Workers[i].Status = client.StatusDone
	}
	if cmd := apply(m, SnapshotMsg{Snapshot: settled}); cmd != nil {
		t.Error("a fully settled board kept arming the display tick")
	}

	// A tick already in flight when the board settled must stop
	// rescheduling itself instead of ticking an idle board forever.
	if cmd := apply(m, displayTickMsg(fixedTime)); cmd != nil {
		t.Error("display tick kept rescheduling after the board settled")
	}
}

// formatDuration's three rendering tiers, pinned at their boundaries.
func TestFormatDurationRenderingCaps(t *testing.T) {
	cases := []struct {
		d    time.Duration
		want string
	}{
		{0, "0s"},
		{45 * time.Second, "45s"},
		{59 * time.Second, "59s"},
		{60 * time.Second, "1m00s"},
		{90 * time.Second, "1m30s"},
		{59*time.Minute + 59*time.Second, "59m59s"},
		{60 * time.Minute, "1h00m"},
		{2*time.Hour + 5*time.Minute, "2h05m"},
		{-5 * time.Second, "0s"},
	}
	for _, c := range cases {
		if got := formatDuration(c.d); got != c.want {
			t.Errorf("formatDuration(%s) = %q, want %q", c.d, got, c.want)
		}
	}
}

func key(s string) tea.KeyMsg {
	switch s {
	case "esc":
		return tea.KeyMsg{Type: tea.KeyEsc}
	case "enter":
		return tea.KeyMsg{Type: tea.KeyEnter}
	case "ctrl+c":
		return tea.KeyMsg{Type: tea.KeyCtrlC}
	case "up":
		return tea.KeyMsg{Type: tea.KeyUp}
	case "down":
		return tea.KeyMsg{Type: tea.KeyDown}
	default:
		return tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(s)}
	}
}

// errTest is the stand-in failure the error-path tests assert on.
var errTest = testErr("boom")

type testErr string

func (e testErr) Error() string { return string(e) }
