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

	loadErr    error
	streamUp   bool
	streamErr  error
	panesWatch int

	events    int
	lastEvent time.Time

	cursor int
	width  int
	height int

	quitting bool
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
	return &Model{
		loader:   Loader{RepoRoot: cfg.RepoRoot, Epic: cfg.Epic, Now: now},
		watcher:  NewWatcher(cfg.Herd),
		herd:     cfg.Herd,
		interval: interval,
		now:      now,
		ctx:      ctx,
		live:     map[string]liveStatus{},
		width:    100,
		height:   30,
	}
}

// Close stops the watcher goroutine.
func (m *Model) Close() {
	if m.watcher != nil {
		m.watcher.Stop()
	}
}

// Init loads the first snapshot, starts the event watcher and arms the safety
// ticker.
func (m *Model) Init() tea.Cmd {
	m.watcher.Start(m.ctx)
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
		// The snapshot's listing is newer than any event that preceded
		// it, so the overlay starts from it and only keeps entries for
		// panes still on the board.
		m.pruneLive()
		m.clampCursor()
		// This is the one place the safety re-list feeds the event
		// mechanism: a newly spawned worker's pane becomes watched here.
		m.watcher.Track(m.panes())
		return m, nil

	case StatusMsg:
		at := msg.At
		if at.IsZero() {
			at = m.now()
		}
		m.live[msg.PaneID] = liveStatus{Status: msg.Status, At: at}
		m.events++
		m.lastEvent = at
		return m, m.watcher.Next()

	case StreamMsg:
		m.streamUp, m.streamErr, m.panesWatch = msg.Up, msg.Err, msg.Panes
		return m, m.watcher.Next()

	case ReloadMsg:
		return m, tea.Batch(m.load(), m.watcher.Next())

	case refreshTickMsg:
		return m, tea.Batch(m.load(), m.tick())
	}
	return m, nil
}

func (m *Model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "esc", "ctrl+c":
		m.quitting = true
		return m, tea.Quit
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

// View renders the board.
func (m *Model) View() string {
	if m.quitting {
		return ""
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
}

// rows flattens the board into selection order.
func (m *Model) rows() []row {
	var out []row
	for _, e := range m.snap.Epics {
		for _, w := range e.Waves {
			for _, t := range w.Ticks {
				out = append(out, row{Epic: e.Epic, Wave: w.Number, Tick: t})
			}
		}
	}
	return out
}

// Selected returns the highlighted tick. This is the seam tick 5yt hangs
// actions off: an action operates on the selected tick and, when it has one,
// the worker in [Model.Worker].
func (m *Model) Selected() (TickRow, bool) {
	rows := m.rows()
	if len(rows) == 0 || m.cursor < 0 || m.cursor >= len(rows) {
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
