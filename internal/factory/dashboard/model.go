package dashboard

import (
	"context"
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
)

// DefaultRefreshInterval is how often the board re-reads the factory.
//
// Unlike the herd board this one polls, and says so: the `run_event` stream
// reaches a BOARD, not a terminal, so what a local TUI can read is the tail
// the RunRoom keeps (`GET /api/observe`). Two seconds is chosen against the
// standard the tick sets — "a working run and a hung one must be
// distinguishable at a glance" — not against a rate limit.
const DefaultRefreshInterval = 2 * time.Second

// DefaultCostInterval is how often gateway telemetry is re-totalled. It is far
// slower than the frame because each read pages a log API, and a cost that is
// thirty seconds old is still a true cost.
const DefaultCostInterval = 30 * time.Second

// DefaultCostRuns bounds how many live runs one cost pass reads.
const DefaultCostRuns = 4

// displayTickInterval redraws elapsed timers without reading anything.
const displayTickInterval = time.Second

// harnessBoardLines is how much of the tail rides on the board itself. The
// whole tail is in the detail view, which scrolls.
const harnessBoardLines = 8

// SnapshotMsg carries a freshly read frame. Err non-nil means the read failed;
// the model keeps the previous frame and marks it stale.
type SnapshotMsg struct {
	Snapshot Snapshot
	Err      error
}

// CostMsg carries a gateway telemetry pass.
type CostMsg struct {
	Costs    map[string]Cost
	Problems []string
	At       time.Time
}

type refreshTickMsg time.Time
type costTickMsg time.Time
type displayTickMsg time.Time

type viewMode int

const (
	modeBoard viewMode = iota
	modeDetail
)

// Config builds a [Model].
type Config struct {
	// Source is the factory. Required.
	Source Source
	// Costs reads spend from gateway telemetry. Nil runs the board without a
	// cost column rather than with a guessed one.
	Costs CostSource
	// Project narrows the board to one project.
	Project string
	// Endpoint is the factory URL, shown in the header.
	Endpoint string
	// RefreshInterval and CostInterval override the defaults. Negative
	// disables that loop (tests do this).
	RefreshInterval time.Duration
	CostInterval    time.Duration
	// HarnessBytes bounds each tail read.
	HarnessBytes int
	// Cache holds the last good frame across processes.
	Cache Cache
	// Notes are startup facts the header should keep saying — chiefly a
	// capability this deployment does not have, such as an AI Gateway with
	// no log-reading token, which is why the cost column is empty. A board
	// that silently omits a column teaches an operator that the number is
	// zero.
	Notes []string
	// Now supplies the clock; nil means time.Now.
	Now func() time.Time
}

// Model is the read-only factory board.
type Model struct {
	loader   Loader
	costs    CostSource
	ctx      context.Context
	endpoint string
	interval time.Duration
	costEvry time.Duration
	cache    Cache
	now      func() time.Time
	notes    []string

	snap      Snapshot
	haveFrame bool
	// stale means the newest read failed (or the frame came off disk), so
	// everything on screen is last-known state rather than the factory now.
	stale      bool
	staleErr   error
	cost       map[string]Cost
	costAt     time.Time
	costIssues []string

	// expanded records explicit fold choices by row key. Absent means "use
	// the default" — seeded once per key, never re-derived, so a refresh
	// cannot fold a row up under the cursor (the herd board's rule).
	expanded map[string]bool

	cursor int
	width  int
	height int

	mode         viewMode
	detailScroll int
	detailRun    string

	displayTicking bool
	quitting       bool
}

// New builds the board.
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
	costEvry := cfg.CostInterval
	if costEvry == 0 {
		costEvry = DefaultCostInterval
	}
	return &Model{
		loader: Loader{
			Source:       cfg.Source,
			Project:      cfg.Project,
			HarnessBytes: cfg.HarnessBytes,
			Now:          now,
		},
		costs:    cfg.Costs,
		ctx:      ctx,
		endpoint: cfg.Endpoint,
		interval: interval,
		costEvry: costEvry,
		cache:    cfg.Cache,
		now:      now,
		notes:    cfg.Notes,
		cost:     map[string]Cost{},
		expanded: map[string]bool{},
		width:    100,
		height:   30,
	}
}

// Init reads the first frame and arms the loops.
func (m *Model) Init() tea.Cmd {
	cmds := []tea.Cmd{m.load()}
	if m.interval > 0 {
		cmds = append(cmds, m.tick())
	}
	if m.costs != nil && m.costEvry > 0 {
		cmds = append(cmds, m.loadCosts(), m.costTick())
	}
	return tea.Batch(cmds...)
}

// Close exists so callers can defer it beside the herd board's. The factory
// board holds no goroutines and no sockets of its own.
func (m *Model) Close() {}

func (m *Model) load() tea.Cmd {
	loader, ctx, focus := m.loader, m.ctx, m.FocusRun()
	return func() tea.Msg {
		snap, err := loader.Load(ctx, focus)
		return SnapshotMsg{Snapshot: snap, Err: err}
	}
}

func (m *Model) loadCosts() tea.Cmd {
	source, ctx, runs, now := m.costs, m.ctx, m.snap.Runs, m.now
	if source == nil {
		return nil
	}
	return func() tea.Msg {
		costs, problems := LoadCosts(ctx, source, runs, DefaultCostRuns)
		return CostMsg{Costs: costs, Problems: problems, At: now()}
	}
}

func (m *Model) tick() tea.Cmd {
	return tea.Tick(m.interval, func(t time.Time) tea.Msg { return refreshTickMsg(t) })
}

func (m *Model) costTick() tea.Cmd {
	return tea.Tick(m.costEvry, func(t time.Time) tea.Msg { return costTickMsg(t) })
}

func (m *Model) displayTick() tea.Cmd {
	return tea.Tick(displayTickInterval, func(t time.Time) tea.Msg { return displayTickMsg(t) })
}

// Update is the whole input surface.
func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		return m, nil

	case tea.KeyMsg:
		return m.handleKey(msg)

	case SnapshotMsg:
		return m, m.applySnapshot(msg)

	case CostMsg:
		for id, cost := range msg.Costs {
			m.cost[id] = cost
		}
		m.costIssues = msg.Problems
		m.costAt = msg.At
		return m, nil

	case refreshTickMsg:
		return m, tea.Batch(m.load(), m.tick())

	case costTickMsg:
		return m, tea.Batch(m.loadCosts(), m.costTick())

	case displayTickMsg:
		if !m.anyLive() {
			m.displayTicking = false
			return m, nil
		}
		return m, m.displayTick()
	}
	return m, nil
}

// applySnapshot folds a read into the board — including a failed one, which is
// the case the tick cares about: keep what is known and label it.
func (m *Model) applySnapshot(msg SnapshotMsg) tea.Cmd {
	if msg.Err != nil {
		m.stale = true
		m.staleErr = msg.Err
		if !m.haveFrame {
			// Nothing in memory: fall back to the frame the last session
			// left on disk, which is why the cache exists at all.
			if cached, ok := m.cache.Load(); ok {
				m.snap = cached
				m.haveFrame = true
				m.seedFolds()
				m.clampCursor()
			}
		}
		return nil
	}
	m.snap = msg.Snapshot
	m.haveFrame = true
	m.stale = false
	m.staleErr = nil
	m.seedFolds()
	m.clampCursor()
	m.clampDetailScroll()
	_ = m.cache.Save(msg.Snapshot)
	if cmd := m.maybeStartDisplayTick(); cmd != nil {
		return cmd
	}
	return nil
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
		selected, ok := m.Selected()
		if !ok {
			break
		}
		if selected.Kind == rowRunHeader || selected.Kind == rowSection {
			m.toggleFold(selected.Key)
			m.clampCursor()
			break
		}
		if selected.RunID != "" {
			m.mode = modeDetail
			m.detailRun = selected.RunID
			m.detailScroll = 0
		}
	case "j", "down":
		return m, m.moveCursor(1)
	case "k", "up":
		return m, m.moveCursor(-1)
	case "g", "home":
		return m, m.jump(0)
	case "G", "end":
		return m, m.jump(len(m.rows()) - 1)
	case "r":
		return m, m.load()
	}
	return m, nil
}

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
	case "r":
		return m, m.load()
	}
	return m, nil
}

// moveCursor moves the selection and, when that lands on a different run,
// re-reads so the harness tail follows it.
func (m *Model) moveCursor(delta int) tea.Cmd {
	return m.jump(m.cursor + delta)
}

func (m *Model) jump(to int) tea.Cmd {
	before := m.FocusRun()
	m.cursor = to
	m.clampCursor()
	if m.FocusRun() != before {
		return m.load()
	}
	return nil
}

func (m *Model) clampCursor() {
	rows := len(m.rows())
	if m.cursor >= rows {
		m.cursor = rows - 1
	}
	if m.cursor < 0 {
		m.cursor = 0
	}
}

func (m *Model) clampDetailScroll() {
	if m.detailScroll < 0 {
		m.detailScroll = 0
	}
	if m.mode != modeDetail {
		return
	}
	budget := m.height - 5
	if budget < 1 {
		budget = 1
	}
	max := len(m.detailBody()) - budget
	if max < 0 {
		max = 0
	}
	if m.detailScroll > max {
		m.detailScroll = max
	}
}

func (m *Model) maybeStartDisplayTick() tea.Cmd {
	if m.displayTicking || !m.anyLive() {
		return nil
	}
	m.displayTicking = true
	return m.displayTick()
}

func (m *Model) anyLive() bool {
	for _, run := range m.snap.Runs {
		if run.Active() {
			return true
		}
	}
	return false
}

// View renders the board, or the focused run's detail.
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

// Snapshot is the frame currently on screen — the factory's last answer, which
// while [Model.Stale] is true is a memory rather than a reading.
func (m *Model) Snapshot() Snapshot { return m.snap }

// Stale reports whether what is on screen is last-known state.
func (m *Model) Stale() bool { return m.stale }

// StaleErr is why the last read failed.
func (m *Model) StaleErr() error { return m.staleErr }

// FocusRun is the run the board is watching: whatever the cursor is on.
func (m *Model) FocusRun() string {
	if m.mode == modeDetail && m.detailRun != "" {
		return m.detailRun
	}
	if selected, ok := m.Selected(); ok && selected.RunID != "" {
		return selected.RunID
	}
	if len(m.snap.Runs) > 0 {
		return m.snap.Runs[0].RunID
	}
	return ""
}

// Costs is the telemetry the board has read so far, by run id.
func (m *Model) Costs() map[string]Cost { return m.cost }

type rowKind int

const (
	// rowRunHeader is a run's own line: foldable, and the cursor's anchor
	// for which run the tail follows.
	rowRunHeader rowKind = iota
	// rowRunLine is one of a run's detail lines (phase, boot, output).
	rowRunLine
	// rowSection is a GATES or REFUSALS header: foldable, like a run.
	rowSection
	// rowSectionLine is one line inside such a section.
	rowSectionLine
)

// row is one selectable line.
type row struct {
	Kind  rowKind
	Key   string
	RunID string
	Text  string
	// Warn marks a line worth colouring as a problem (a refusal, a failed
	// read, an unanswered gate).
	Warn bool
}

// Selected is the row under the cursor.
func (m *Model) Selected() (row, bool) {
	rows := m.rows()
	if m.cursor < 0 || m.cursor >= len(rows) {
		return row{}, false
	}
	return rows[m.cursor], true
}

// rows flattens the board into selection order: every run, then the gates and
// the refusals. Sections are always present — "no pending gates" is an answer
// an operator needs, and a section that disappears when empty cannot give it.
func (m *Model) rows() []row {
	var out []row
	for _, run := range m.snap.Runs {
		key := "run:" + run.RunID
		out = append(out, row{Kind: rowRunHeader, Key: key, RunID: run.RunID, Text: m.runLine(run)})
		if !m.folded(key) {
			for _, line := range m.runLines(run, true) {
				out = append(out, row{Kind: rowRunLine, Key: key, RunID: run.RunID, Text: "    " + line.text, Warn: line.warn})
			}
		}
	}

	gates := m.gates()
	out = append(out, row{Kind: rowSection, Key: "gates", Text: fmt.Sprintf("GATES · %d pending", pendingGates(gates))})
	if !m.folded("gates") {
		if len(gates) == 0 {
			out = append(out, row{Kind: rowSectionLine, Key: "gates", Text: "    no questions are registered"})
		}
		for _, entry := range gates {
			out = append(out, row{Kind: rowSectionLine, Key: "gates", Text: "    " + gateLine(entry), Warn: !entry.Resolved()})
		}
	}

	refusals := m.refusals()
	out = append(out, row{Kind: rowSection, Key: "refusals", Text: fmt.Sprintf("REFUSALS · %d", len(refusals))})
	if !m.folded("refusals") {
		if len(refusals) == 0 {
			out = append(out, row{Kind: rowSectionLine, Key: "refusals", Text: "    nothing has been refused"})
		}
		for _, refusal := range refusals {
			out = append(out, row{Kind: rowSectionLine, Key: "refusals", Text: "    " + refusalLine(refusal), Warn: true})
		}
	}
	return out
}

// runLine is a run's own row: what it is, how long it has been at it, what it
// has cost, and who holds the project lease.
func (m *Model) runLine(run Run) string {
	parts := []string{
		run.RunID,
		run.Project,
		"epic " + orDash(run.Epic),
		run.State,
		m.elapsed(run),
	}
	if cost, ok := m.cost[run.RunID]; ok {
		parts = append(parts, fmt.Sprintf("$%.2f", cost.USD))
	} else if run.Active() {
		// An unread cost is not a free run.
		parts = append(parts, "cost —")
	}
	if holder := m.leaseHolder(run.Project); holder != "" {
		if holder == run.RunID {
			parts = append(parts, "holds lease")
		} else {
			parts = append(parts, "lease "+holder)
		}
	}
	return strings.Join(parts, "  ")
}

type detailLine struct {
	text string
	warn bool
}

// runLines are a run's folded-out lines: the phase it is in, the boot and
// image it is on, and — when withTail is set — the last of what it printed.
// The detail view clears withTail because it renders the whole tail as its
// body, and the same eight lines twice on one screen is not two facts.
func (m *Model) runLines(run Run, withTail bool) []detailLine {
	lines := []detailLine{{text: "phase: " + m.phaseText(run)}}

	if focus := m.focusFor(run.RunID); focus != nil {
		lines = append(lines, detailLine{text: "boot: " + bootText(focus.Boot)})
		lines = append(lines, detailLine{text: "image: " + imageText(focus.Image)})
		if focus.Progress != nil {
			lines = append(lines, detailLine{text: "progress: " + strings.TrimSpace(focus.Progress.Progress+" "+focus.Progress.Detail)})
		}
		if focus.Stop != nil {
			lines = append(lines, detailLine{text: fmt.Sprintf("stop: %s requested by %s", focus.Stop.Mode, focus.Stop.RequestedBy), warn: true})
		}
	}

	if withTail && run.RunID == m.snap.FocusRun {
		if m.snap.HarnessDetail != "" {
			lines = append(lines, detailLine{text: "output: " + m.snap.HarnessDetail, warn: true})
		}
		tail := lastLines(m.snap.Harness.Text, harnessBoardLines)
		if len(tail) == 0 {
			lines = append(lines, detailLine{text: "output: nothing has been printed yet"})
		}
		for _, line := range tail {
			lines = append(lines, detailLine{text: "│ " + line})
		}
	}
	return lines
}

// phaseText is where the run is: the Workflow instance's state, and what the
// run_event stream last said it was doing. The Workflow binding reports an
// instance status and not a step name, so the stream is what names the step —
// which is the protocol doing the job it was built for (tick bne).
func (m *Model) phaseText(run Run) string {
	parts := []string{}
	if focus := m.focusFor(run.RunID); focus != nil && focus.Phase.Workflow != nil {
		parts = append(parts, "workflow "+focus.Phase.Workflow.Status)
	} else {
		parts = append(parts, "workflow unknown")
	}
	if event, ok := m.latestEvent(run.Epic); ok {
		step := event.Type
		if event.Status != "" {
			step += " (" + event.Status + ")"
		}
		if event.Tick != "" {
			step += " · tick " + event.Tick
		}
		parts = append(parts, step)
		parts = append(parts, "last event "+m.age(event.At))
	} else if m.snap.EventsDetail != "" {
		parts = append(parts, "no events: "+m.snap.EventsDetail)
	}
	return strings.Join(parts, " · ")
}

func (m *Model) latestEvent(epic string) (Event, bool) {
	for _, event := range m.snap.Events {
		if epic == "" || event.Epic == epic {
			return event, true
		}
	}
	return Event{}, false
}

func (m *Model) focusFor(runID string) *Focus {
	if m.snap.Focus != nil && m.snap.Focus.Run.RunID == runID {
		return m.snap.Focus
	}
	return nil
}

// gates are the project's pending questions. The frame carries them at the top
// level; a focused run's copy is the fallback for a factory deployed before
// that field existed.
func (m *Model) gates() []Gate {
	if len(m.snap.Gates) > 0 {
		return m.snap.Gates
	}
	if m.snap.Focus == nil {
		return nil
	}
	return m.snap.Focus.Gates
}

// refusals are the dispatch decisions that DECLINED work. An ignition is
// already visible as a run, so repeating it here would bury the refusals.
func (m *Model) refusals() []Refusal {
	var out []Refusal
	for _, entry := range m.snap.Dispatch {
		if entry.Refused() {
			out = append(out, entry)
		}
	}
	return out
}

func (m *Model) leaseHolder(project string) string {
	for _, entry := range m.snap.Projects {
		if entry.Project == project && entry.Lease != nil {
			return entry.Lease.RunID
		}
	}
	return ""
}

// folded reports whether a row key is collapsed.
func (m *Model) folded(key string) bool {
	expanded, ok := m.expanded[key]
	return ok && !expanded
}

func (m *Model) toggleFold(key string) {
	m.expanded[key] = m.folded(key)
}

// seedFolds decides the fold state of keys the board has not seen before, ONCE
// per key: a run that has ended starts collapsed, everything else open. It
// never re-derives, so an operator's toggle survives the next refresh and a run
// that ends while being read does not fold up under the cursor.
func (m *Model) seedFolds() {
	if m.expanded == nil {
		m.expanded = map[string]bool{}
	}
	for _, run := range m.snap.Runs {
		key := "run:" + run.RunID
		if _, seen := m.expanded[key]; !seen {
			m.expanded[key] = run.Active()
		}
	}
	for _, key := range []string{"gates", "refusals"} {
		if _, seen := m.expanded[key]; !seen {
			m.expanded[key] = true
		}
	}
}

func pendingGates(gates []Gate) int {
	open := 0
	for _, gate := range gates {
		if !gate.Resolved() {
			open++
		}
	}
	return open
}

// gateLine says which tick is waiting, and — once someone answers — whether the
// phone or the terminal got there first (D5's first-wins arbitration).
func gateLine(entry Gate) string {
	tick := entry.TickID
	if tick == "" {
		tick = entry.AgentTarget
	}
	text := strings.TrimSpace(entry.Question.Text)
	if entry.Question.Header != "" {
		text = strings.TrimSpace(entry.Question.Header)
	}
	line := fmt.Sprintf("%s · tick %s · %s", entry.ID, orDash(tick), truncateText(text, 60))
	if entry.Resolution == nil {
		if entry.Delivered() {
			return line + " · waiting (delivered)"
		}
		return line + " · waiting"
	}
	answered := string(entry.Resolution.AnsweredBy)
	switch entry.Resolution.AnsweredBy {
	case GateAnsweredByTelegram:
		answered = "phone"
	case GateAnsweredByTerminal:
		answered = "terminal"
	}
	return line + " · answered by " + answered
}

// refusalLine explains one declined submission in the policy's own vocabulary.
func refusalLine(refusal Refusal) string {
	line := fmt.Sprintf("%s · epic %s · %s", refusal.RunID, orDash(refusal.TickID), refusal.Reason)
	if refusal.Decision != "" && refusal.Decision != refusal.Reason {
		line += " (" + refusal.Decision + ")"
	}
	if refusal.At != "" {
		line += " · " + refusal.At
	}
	return line
}

func bootText(boot Boot) string {
	if boot.Boots == 0 {
		return "no boot has been recorded"
	}
	text := fmt.Sprintf("attempt %d of %d", boot.Attempt, boot.Boots)
	if boot.LastIssuedAt != "" {
		text += " · since " + boot.LastIssuedAt
	}
	return text
}

func imageText(image *Image) string {
	if image == nil {
		return "unrecorded — this run started before any deploy confirmed one"
	}
	return strings.TrimSpace(image.Digest + " (" + image.Ref + ")")
}

// elapsed is how long a run has been alive, or how long it ran.
func (m *Model) elapsed(run Run) string {
	start, ok := parseStamp(run.StartedAt)
	if !ok {
		return "elapsed —"
	}
	end := m.now()
	suffix := ""
	if stop, ok := parseStamp(run.EndedAt); ok {
		end = stop
		suffix = " (ended)"
	}
	return shortDuration(end.Sub(start)) + suffix
}

func (m *Model) age(stamp string) string {
	parsed, ok := parseStamp(stamp)
	if !ok {
		return "—"
	}
	return shortDuration(m.now().Sub(parsed)) + " ago"
}

func parseStamp(value string) (time.Time, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, false
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, false
	}
	return parsed, true
}

func shortDuration(d time.Duration) string {
	if d < 0 {
		d = 0
	}
	switch {
	case d < time.Minute:
		return fmt.Sprintf("%ds", int(d.Seconds()))
	case d < time.Hour:
		return fmt.Sprintf("%dm%02ds", int(d.Minutes()), int(d.Seconds())%60)
	default:
		return fmt.Sprintf("%dh%02dm", int(d.Hours()), int(d.Minutes())%60)
	}
}

func orDash(value string) string {
	if strings.TrimSpace(value) == "" {
		return "—"
	}
	return value
}

func truncateText(value string, max int) string {
	value = strings.ReplaceAll(strings.TrimSpace(value), "\n", " ")
	if len([]rune(value)) <= max {
		return value
	}
	return string([]rune(value)[:max-1]) + "…"
}

// lastLines is the tail of a text block, without its trailing blank.
func lastLines(text string, n int) []string {
	text = strings.TrimRight(text, "\n")
	if text == "" {
		return nil
	}
	lines := strings.Split(text, "\n")
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	return lines
}
