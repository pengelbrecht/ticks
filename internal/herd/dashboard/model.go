package dashboard

import (
	"context"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/herd/client"
)

// DefaultRefreshInterval is the safety re-list period. It is deliberately slow:
// status changes arrive as events in milliseconds, and this only has to catch
// what no subscription covers (a new manifest, a closed tick, a vanished pane).
// See the package doc.
const DefaultRefreshInterval = 30 * time.Second

// SnapshotMsg carries a freshly loaded board. Err non-nil means the load
// failed; the model keeps the previous snapshot and shows the error.
type SnapshotMsg struct {
	Snapshot Snapshot
	Err      error
}

// refreshTickMsg is the safety ticker firing.
type refreshTickMsg time.Time

// displayTickInterval is how often worker-row elapsed timers redraw. Unlike
// [DefaultRefreshInterval] it is not configurable: it never reads anything
// off disk or the network, it only asks bubbletea to repaint what [Model]
// already knows, so there is no cost to tune away.
const displayTickInterval = time.Second

// displayTickMsg is the once-a-second timer-display tick. It is armed only
// while at least one worker is unsettled (see [Model.anyUnsettled]) and stops
// rescheduling itself the moment the board settles, so an idle board never
// wakes on its own. See the package doc's "why events and not a poll loop".
type displayTickMsg time.Time

// viewMode is which of the board's two screens [Model] is showing.
type viewMode int

const (
	// modeBoard is the wave/tick/worker list — the board's only screen
	// before tick 7hm.
	modeBoard viewMode = iota
	// modeDetail is the read-only detail view for [Model.Selected]: full
	// description, acceptance criteria, blockers and worker info.
	modeDetail
)

// Config builds a [Model].
type Config struct {
	// RepoRoot is the repository whose run is displayed. Required.
	RepoRoot string
	// Epic narrows the board to one epic; empty means every epic with run
	// state.
	Epic string
	// Herd is the herdr client. Nil runs the board without a live layer:
	// manifests and ticks still render, statuses show as unknown.
	Herd Herd
	// RefreshInterval overrides [DefaultRefreshInterval]. Negative disables
	// the safety re-list entirely (tests do this to prove the board updates
	// on events alone).
	RefreshInterval time.Duration
	// Now supplies the clock; nil means [time.Now].
	Now func() time.Time
}

// Model is the read-only mission-control board.
//
// Every input is a message, and the two that matter arrive from different
// places: [SnapshotMsg] from a disk read plus one agent listing, and [StatusMsg]
// pushed by herdr through [Watcher]. Nothing here polls.
type Model struct {
	loader   Loader
	watcher  *Watcher
	fswatch  *FSWatcher
	herd     Herd
	interval time.Duration
	now      func() time.Time
	ctx      context.Context

	snap Snapshot
	// live overlays event-delivered statuses onto the snapshot's panes, so a
	// status change is visible without waiting for the next re-list. Entries
	// carry their arrival time because a snapshot's listing supersedes every
	// event older than it — that is how a reload after a stream break clears
	// a status nothing was subscribed to observe changing.
	live map[string]liveStatus

	// statusSince is when each pane's CURRENT status was first observed —
	// through a snapshot listing delta or a pushed event, whichever noticed
	// it first. History before the dashboard was watching is unknowable, so
	// the very first observation of a pane starts its timer at zero rather
	// than guessing when the status actually began.
	statusSince map[string]statusObservation
	// displayTicking reports whether the once-a-second display tick is
	// currently scheduled. It exists so a settled board (and a board with no
	// workers at all) never arms a redundant tick, and so a tick already in
	// flight when the board settles does not reschedule itself again.
	displayTicking bool

	loadErr    error
	streamUp   bool
	streamErr  error
	panesWatch int
	fsWatchErr error

	events    int
	lastEvent time.Time

	cursor int
	width  int
	height int

	// epicExpanded records an operator's explicit collapse choices by epic id.
	// Absent means "use the default" — see [Model.expanded].
	epicExpanded map[string]bool

	// mode is board or detail (tick 7hm). detailScroll is the detail body's
	// scroll offset, reset whenever detail opens or closes; it is clamped
	// against the rendered content in [Model.clampDetailScroll], which both
	// the key handler and a snapshot refresh call.
	mode         viewMode
	detailScroll int

	quitting bool
}

// statusObservation is the status a pane was last seen in, and when the
// dashboard first observed it — the anchor for the "time in current status"
// timer on a worker row.
type statusObservation struct {
	Status client.AgentStatus
	Since  time.Time
}

// New builds the board. Call [Model.Close] when the program exits.
func New(ctx context.Context, cfg Config) *Model {
	if ctx == nil {
		ctx = context.Background()
	}
	now := cfg.Now
	if now == nil {
		now = time.Now
	}
	interval := cfg.RefreshInterval
	if interval == 0 {
		interval = DefaultRefreshInterval
	}
	watcher := NewWatcher(cfg.Herd)
	return &Model{
		loader:       Loader{RepoRoot: cfg.RepoRoot, Epic: cfg.Epic, Now: now},
		watcher:      watcher,
		fswatch:      NewFSWatcher(cfg.RepoRoot, watcher.emit),
		herd:         cfg.Herd,
		interval:     interval,
		now:          now,
		ctx:          ctx,
		live:         map[string]liveStatus{},
		statusSince:  map[string]statusObservation{},
		epicExpanded: map[string]bool{},
		width:        100,
		height:       30,
	}
}

// Close stops the watcher goroutines.
func (m *Model) Close() {
	if m.watcher != nil {
		m.watcher.Stop()
	}
	if m.fswatch != nil {
		m.fswatch.Stop()
	}
}

// Init loads the first snapshot, starts the event watcher and the filesystem
// watcher, and arms the safety ticker.
func (m *Model) Init() tea.Cmd {
	m.watcher.Start(m.ctx)
	m.fswatch.Start(m.ctx)
	cmds := []tea.Cmd{m.load(), m.watcher.Next()}
	if m.interval > 0 {
		cmds = append(cmds, m.tick())
	}
	return tea.Batch(cmds...)
}

// load reads the board off disk and takes one agent listing.
func (m *Model) load() tea.Cmd {
	loader, herd, ctx := m.loader, m.herd, m.ctx
	return func() tea.Msg {
		snap, err := loader.Load(ctx, herd)
		return SnapshotMsg{Snapshot: snap, Err: err}
	}
}

// tick arms the safety re-list.
func (m *Model) tick() tea.Cmd {
	return tea.Tick(m.interval, func(t time.Time) tea.Msg { return refreshTickMsg(t) })
}

// displayTick arms the once-a-second worker-row timer redraw. Structured
// exactly like [Model.tick]: a tea.Tick producing one typed message, rearmed
// by its own Update case rather than by a separate ticker goroutine.
func (m *Model) displayTick() tea.Cmd {
	return tea.Tick(displayTickInterval, func(t time.Time) tea.Msg { return displayTickMsg(t) })
}

// Update is the whole input surface. It is pure with respect to the messages
// it receives, which is what makes the board testable without a socket.
func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		return m, nil

	case tea.KeyMsg:
		return m.handleKey(msg)

	case SnapshotMsg:
		if msg.Err != nil {
			m.loadErr = msg.Err
			return m, nil
		}
		m.loadErr = nil
		m.snap = msg.Snapshot
		m.seedEpicDefaults()
		// The snapshot's listing is newer than any event that preceded
		// it, so the overlay starts from it and only keeps entries for
		// panes still on the board.
		m.pruneLive()
		m.clampCursor()
		// This is the one place the safety re-list feeds the event
		// mechanism: a newly spawned worker's pane becomes watched here.
		m.watcher.Track(m.panes())
		// A re-list is a listing delta: it is how the board observes a
		// status transition nothing subscribed to (or the very first
		// status of a pane it has never seen before).
		m.updateStatusSince(msg.Snapshot.LoadedAt)
		m.pruneStatusSince()
		// A reload can change the selected tick's own content (a closed
		// tick's new status, a worker's timer) or shrink it, so the detail
		// scroll — set against the PREVIOUS content — needs re-bounding.
		m.clampDetailScroll()
		if cmd := m.maybeStartDisplayTick(); cmd != nil {
			return m, cmd
		}
		return m, nil

	case StatusMsg:
		at := msg.At
		if at.IsZero() {
			at = m.now()
		}
		m.live[msg.PaneID] = liveStatus{Status: msg.Status, At: at}
		m.events++
		m.lastEvent = at
		m.observeStatus(msg.PaneID, msg.Status, at)
		cmds := []tea.Cmd{m.watcher.Next()}
		if cmd := m.maybeStartDisplayTick(); cmd != nil {
			cmds = append(cmds, cmd)
		}
		return m, tea.Batch(cmds...)

	case displayTickMsg:
		if !m.anyUnsettled() {
			m.displayTicking = false
			return m, nil
		}
		return m, m.displayTick()

	case StreamMsg:
		m.streamUp, m.streamErr, m.panesWatch = msg.Up, msg.Err, msg.Panes
		return m, m.watcher.Next()

	case FSWatchMsg:
		if msg.Up {
			m.fsWatchErr = nil
		} else {
			m.fsWatchErr = msg.Err
		}
		return m, m.watcher.Next()

	case ReloadMsg:
		return m, tea.Batch(m.load(), m.watcher.Next())

	case refreshTickMsg:
		return m, tea.Batch(m.load(), m.tick())
	}
	return m, nil
}

func (m *Model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.mode == modeDetail {
		return m.handleDetailKey(msg)
	}
	switch msg.String() {
	case "q", "esc", "ctrl+c":
		m.quitting = true
		return m, tea.Quit
	case "enter":
		if id, ok := m.SelectedEpic(); ok {
			m.toggleEpic(id)
			m.clampCursor()
			break
		}
		if _, ok := m.Selected(); ok {
			m.mode = modeDetail
			m.detailScroll = 0
		}
	case "j", "down":
		m.moveCursor(1)
	case "k", "up":
		m.moveCursor(-1)
	case "g", "home":
		m.cursor = 0
	case "G", "end":
		m.cursor = len(m.rows()) - 1
		m.clampCursor()
	case "r":
		return m, m.load()
	}
	return m, nil
}

// handleDetailKey is the detail view's input surface: esc or enter closes it,
// j/k scroll its body, and q still quits — everything else is a no-op, unlike
// the board (no reload, no cursor movement; the selected tick is fixed while
// its detail is open).
func (m *Model) handleDetailKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "ctrl+c":
		m.quitting = true
		return m, tea.Quit
	case "esc", "enter":
		m.mode = modeBoard
		m.detailScroll = 0
	case "j", "down":
		m.detailScroll++
		m.clampDetailScroll()
	case "k", "up":
		m.detailScroll--
		m.clampDetailScroll()
	}
	return m, nil
}

// clampDetailScroll bounds [Model.detailScroll] to the selected tick's
// rendered content: never negative, never past the point where the last line
// is already on screen. It is idempotent and safe to call whether or not the
// board is in detail mode, which is what lets [Model.Update]'s SnapshotMsg
// case call it unconditionally after every reload.
func (m *Model) clampDetailScroll() {
	if m.detailScroll < 0 {
		m.detailScroll = 0
	}
	sel, ok := m.Selected()
	if !ok {
		m.detailScroll = 0
		return
	}
	lines := m.detailBody(sel)
	budget := m.detailScrollBudget()
	max := len(lines) - budget
	if max < 0 {
		max = 0
	}
	if m.detailScroll > max {
		m.detailScroll = max
	}
}

// View renders the board, or the detail view for [Model.Selected] while in
// detail mode.
func (m *Model) View() string {
	if m.quitting {
		return ""
	}
	if m.mode == modeDetail {
		return m.renderDetail()
	}
	return m.render()
}

// Quitting reports whether the model has asked bubbletea to exit.
func (m *Model) Quitting() bool { return m.quitting }

// Snapshot returns the board's current durable state. Exported for tests and
// for tick 5yt, which needs the selected row's manifest to act on it.
func (m *Model) Snapshot() Snapshot { return m.snap }

// Status reports the effective status of a pane: the newest pushed event when
// there is one, otherwise what the last listing said.
func (m *Model) Status(paneID string, fallback client.AgentStatus) client.AgentStatus {
	if s, ok := m.live[paneID]; ok {
		return s.Status
	}
	return fallback
}

// paneStatus is [Model.Status] with the snapshot's own worker row as the
// fallback, which is what the view wants: an event when there is one, the last
// listing otherwise.
func (m *Model) paneStatus(paneID string) client.AgentStatus {
	fallback := client.StatusUnknown
	for _, w := range m.snap.Workers() {
		if w.PaneID == paneID {
			fallback = w.Status
			break
		}
	}
	return m.Status(paneID, fallback)
}

// liveStatus is one event-delivered status and when it arrived.
type liveStatus struct {
	Status client.AgentStatus
	At     time.Time
}

// Events counts the pushed status events this board has consumed. It is the
// evidence that updates are event-driven and not a re-list artefact.
func (m *Model) Events() int { return m.events }

// row is one selectable line: a tick, with the epic it belongs to.
type row struct {
	Epic string
	Wave int
	Tick TickRow
	// Header marks the epic's own line. It is a selection row so the cursor
	// can land on an epic and toggle it; Tick is zero on such a row, which is
	// what [Model.Selected] keys off.
	Header bool
}

// rows flattens the board into selection order: each epic's header, followed
// by its ticks when the epic is expanded.
func (m *Model) rows() []row {
	var out []row
	for _, e := range m.snap.Epics {
		out = append(out, row{Epic: e.Epic, Header: true})
		if !m.expanded(e) {
			continue
		}
		for _, w := range e.Waves {
			for _, t := range w.Ticks {
				out = append(out, row{Epic: e.Epic, Wave: w.Number, Tick: t})
			}
		}
	}
	return out
}

// seedEpicDefaults decides the collapse state of epics the board has not seen
// before: a fully-closed epic starts collapsed, anything else expanded.
//
// It runs ONCE PER EPIC, on first sight, and never re-derives. Two reasons.
// An operator's explicit toggle has to survive the next refresh, which lands
// within a second (timer or filesystem event). And an epic that closes its
// last tick while being watched must not fold up under the cursor mid-look —
// re-deriving every snapshot did exactly that, taking the tick out of the
// selection list while its detail view was open.
func (m *Model) seedEpicDefaults() {
	if m.epicExpanded == nil {
		m.epicExpanded = map[string]bool{}
	}
	for _, e := range m.snap.Epics {
		if _, seen := m.epicExpanded[e.Epic]; !seen {
			m.epicExpanded[e.Epic] = !e.AllClosed()
		}
	}
}

// expanded reports whether an epic's ticks are shown. Unseen epics default to
// expanded; [Model.seedEpicDefaults] is what records the real answer.
func (m *Model) expanded(e EpicBoard) bool {
	if v, ok := m.epicExpanded[e.Epic]; ok {
		return v
	}
	return true
}

// toggleEpic flips one epic's expansion, recording it as an explicit choice.
func (m *Model) toggleEpic(id string) {
	if m.epicExpanded == nil {
		m.epicExpanded = map[string]bool{}
	}
	for _, e := range m.snap.Epics {
		if e.Epic == id {
			m.epicExpanded[id] = !m.expanded(e)
			return
		}
	}
}

// SelectedEpic returns the epic id under the cursor when the cursor is on an
// epic header, which is the only place the collapse toggle applies.
func (m *Model) SelectedEpic() (string, bool) {
	rows := m.rows()
	if len(rows) == 0 || m.cursor < 0 || m.cursor >= len(rows) {
		return "", false
	}
	if !rows[m.cursor].Header {
		return "", false
	}
	return rows[m.cursor].Epic, true
}

// Selected returns the highlighted tick. This is the seam tick 5yt hangs
// actions off: an action operates on the selected tick and, when it has one,
// the worker in [Model.Worker].
func (m *Model) Selected() (TickRow, bool) {
	rows := m.rows()
	if len(rows) == 0 || m.cursor < 0 || m.cursor >= len(rows) {
		return TickRow{}, false
	}
	if rows[m.cursor].Header {
		return TickRow{}, false
	}
	return rows[m.cursor].Tick, true
}

// Worker returns the worker row for a tick id, when one has been spawned.
func (m *Model) Worker(tickID string) (WorkerRow, bool) {
	for _, w := range m.snap.Workers() {
		if w.Tick == tickID {
			return w, true
		}
	}
	return WorkerRow{}, false
}

func (m *Model) moveCursor(delta int) {
	m.cursor += delta
	m.clampCursor()
}

func (m *Model) clampCursor() {
	n := len(m.rows())
	if n == 0 {
		m.cursor = 0
		return
	}
	if m.cursor < 0 {
		m.cursor = 0
	}
	if m.cursor >= n {
		m.cursor = n - 1
	}
}

// panes lists every worker pane on the board — what the watcher subscribes to.
func (m *Model) panes() []string {
	workers := m.snap.Workers()
	out := make([]string, 0, len(workers))
	for _, w := range workers {
		if w.PaneID != "" {
			out = append(out, w.PaneID)
		}
	}
	return out
}

// pruneLive drops overlay entries a fresh snapshot has superseded: panes that
// left the board, and events older than the listing the snapshot carries. What
// survives is exactly the events that arrived while the load was in flight.
func (m *Model) pruneLive() {
	if len(m.live) == 0 {
		return
	}
	keep := make(map[string]bool, len(m.live))
	for _, p := range m.panes() {
		keep[p] = true
	}
	for pane, s := range m.live {
		if !keep[pane] || s.At.Before(m.snap.LoadedAt) {
			delete(m.live, pane)
		}
	}
}

// updateStatusSince reconciles [Model.statusSince] against the freshly loaded
// snapshot: a listing delta. observedAt is when the listing was taken (the
// snapshot's LoadedAt), not [Model.now] — a re-list that happened a moment
// ago must not appear to have observed the transition just now.
func (m *Model) updateStatusSince(observedAt time.Time) {
	if observedAt.IsZero() {
		observedAt = m.now()
	}
	for _, w := range m.snap.Workers() {
		if w.PaneID == "" {
			continue
		}
		m.observeStatus(w.PaneID, m.Status(w.PaneID, w.Status), observedAt)
	}
}

// observeStatus records paneID's status as of at, starting or resetting the
// "time in current status" timer whenever this is the first time the pane has
// been seen, or the status differs from what was last observed. History
// before the dashboard was watching is unknowable, so the first observation
// of a pane always starts its timer at zero rather than inventing a start
// time — this is deliberate, not a gap to fill in later.
func (m *Model) observeStatus(paneID string, status client.AgentStatus, at time.Time) {
	if prev, ok := m.statusSince[paneID]; ok && prev.Status == status {
		return
	}
	m.statusSince[paneID] = statusObservation{Status: status, Since: at}
}

// pruneStatusSince drops timer state for panes that left the board — the
// same cleanup [Model.pruneLive] does for the event overlay.
func (m *Model) pruneStatusSince() {
	if len(m.statusSince) == 0 {
		return
	}
	keep := make(map[string]bool, len(m.statusSince))
	for _, p := range m.panes() {
		keep[p] = true
	}
	for pane := range m.statusSince {
		if !keep[pane] {
			delete(m.statusSince, pane)
		}
	}
}

// unsettled reports whether a worker in this status still warrants a
// per-second timer redraw. Done and [StatusGone] are the board's terminal
// states — idle is not: an idle worker is mid-run, awaiting its next turn
// (see the package doc), and its elapsed timers keep moving.
func unsettled(s client.AgentStatus) bool {
	return s != client.StatusDone && s != StatusGone
}

// anyUnsettled reports whether the display tick has any reason to keep
// running: at least one worker not yet done or gone.
func (m *Model) anyUnsettled() bool {
	for _, w := range m.snap.Workers() {
		if unsettled(m.Status(w.PaneID, w.Status)) {
			return true
		}
	}
	return false
}

// maybeStartDisplayTick arms the once-a-second display tick when the board
// has unsettled workers and nothing is ticking yet. It is idempotent: a tick
// already in flight, or a fully settled board, produce no command — an idle
// board is never woken on its own (see the package doc).
func (m *Model) maybeStartDisplayTick() tea.Cmd {
	if m.displayTicking || !m.anyUnsettled() {
		return nil
	}
	m.displayTicking = true
	return m.displayTick()
}
