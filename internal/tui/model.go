package tui

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/bubbles/textinput"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/fsnotify/fsnotify"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

func init() {
	// Force TrueColor for terminals that misreport capabilities (e.g., TERM=screen in tmux)
	os.Setenv("COLORTERM", "truecolor")
}

type item struct {
	Tick    tick.Tick
	Depth   int
	IsEpic  bool
	HasKids bool
}

// keyMap defines all keybindings for the TUI.
type keyMap struct {
	Up            key.Binding
	Down          key.Binding
	ScrollUp      key.Binding
	ScrollDn      key.Binding
	Top           key.Binding
	Bottom        key.Binding
	Fold          key.Binding
	Focus         key.Binding
	Search        key.Binding
	HideClosed    key.Binding
	Approve       key.Binding
	Reject        key.Binding
	HumanQueue    key.Binding
	CycleAwaiting key.Binding
	SwitchPane    key.Binding
	Quit          key.Binding
}

// ShortHelp returns bindings for the short help view (single line).
func (k keyMap) ShortHelp() []key.Binding {
	return []key.Binding{k.Up, k.ScrollUp, k.Fold, k.Focus, k.Search, k.HideClosed, k.HumanQueue, k.Approve, k.SwitchPane, k.Quit}
}

// FullHelp returns bindings for the full help view (multiple columns).
func (k keyMap) FullHelp() [][]key.Binding {
	return [][]key.Binding{
		{k.Up, k.Down},
		{k.ScrollUp, k.ScrollDn, k.Top, k.Bottom},
		{k.Fold, k.Focus, k.Search, k.HideClosed},
		{k.HumanQueue, k.CycleAwaiting},
		{k.Approve, k.Reject, k.SwitchPane, k.Quit},
	}
}

var defaultKeyMap = keyMap{
	Up: key.NewBinding(
		key.WithKeys("k", "up"),
		key.WithHelp("j/k", "move"),
	),
	Down: key.NewBinding(
		key.WithKeys("j", "down"),
		key.WithHelp("j/k", "move"),
	),
	ScrollUp: key.NewBinding(
		key.WithKeys("ctrl+u"),
		key.WithHelp("^d/u", "scroll"),
	),
	ScrollDn: key.NewBinding(
		key.WithKeys("ctrl+d"),
		key.WithHelp("^d/u", "scroll"),
	),
	Top: key.NewBinding(
		key.WithKeys("g"),
		key.WithHelp("g/G", "top/bottom"),
	),
	Bottom: key.NewBinding(
		key.WithKeys("G"),
		key.WithHelp("g/G", "top/bottom"),
	),
	Fold: key.NewBinding(
		key.WithKeys(" ", "enter"),
		key.WithHelp("space", "fold"),
	),
	Focus: key.NewBinding(
		key.WithKeys("z"),
		key.WithHelp("z", "focus"),
	),
	Search: key.NewBinding(
		key.WithKeys("/"),
		key.WithHelp("/", "search"),
	),
	HideClosed: key.NewBinding(
		key.WithKeys("c"),
		key.WithHelp("c", "closed"),
	),
	Approve: key.NewBinding(
		key.WithKeys("a"),
		key.WithHelp("a/r", "approve/reject"),
	),
	Reject: key.NewBinding(
		key.WithKeys("r"),
		key.WithHelp("a/r", "approve/reject"),
	),
	HumanQueue: key.NewBinding(
		key.WithKeys("h"),
		key.WithHelp("h/H", "human/cycle"),
	),
	CycleAwaiting: key.NewBinding(
		key.WithKeys("H"),
		key.WithHelp("h/H", "human/cycle"),
	),
	SwitchPane: key.NewBinding(
		key.WithKeys("tab"),
		key.WithHelp("tab", "pane"),
	),
	Quit: key.NewBinding(
		key.WithKeys("q", "ctrl+c"),
		key.WithHelp("q", "quit"),
	),
}

// awaitingFilterMode represents the current awaiting filter state.
type awaitingFilterMode int

const (
	awaitingFilterOff       awaitingFilterMode = iota // No filter (show all)
	awaitingFilterHumanOnly                           // Show only awaiting human tasks
	awaitingFilterAgentOnly                           // Show only non-awaiting tasks
	awaitingFilterByType                              // Filter by specific awaiting type
)

// ticksReloadedMsg is sent when the filesystem watcher detects changes.
type ticksReloadedMsg struct {
	ticks []tick.Tick
	err   error
}

// awaitingTypes lists all awaiting types for cycling.
var awaitingTypes = []string{
	tick.AwaitingWork,
	tick.AwaitingApproval,
	tick.AwaitingInput,
	tick.AwaitingReview,
	tick.AwaitingContent,
	tick.AwaitingEscalation,
	tick.AwaitingCheckpoint,
}

type Model struct {
	allTicks     []tick.Tick
	items        []item
	collapsed    map[string]bool
	selected     int
	filter       string
	searching    bool
	searchInput  textinput.Model
	focusedEpic  string
	hideClosed   bool // filter out closed ticks (default true)
	width        int
	height       int
	viewport     viewport.Model // right pane detail view
	listViewport viewport.Model // left pane tick list
	ready        bool           // viewport initialized
	keys         keyMap
	help         help.Model

	// Awaiting filter state
	awaitingFilter     awaitingFilterMode // Current filter mode
	awaitingTypeFilter string             // Specific type when mode is awaitingFilterByType
	awaitingTypeIdx    int                // Index in awaitingTypes for cycling

	// Store path for approve/reject operations
	storePath string

	// Status message (shown briefly after actions)
	statusMsg     string
	statusIsError bool

	// Reject feedback input mode
	rejecting     bool
	rejectInput   textinput.Model
	rejectTickIdx int // Index of tick being rejected

	// Filesystem watcher for live updates
	watcher *fsnotify.Watcher

	// Pane focus: false = left (list), true = right (details)
	rightPaneFocused bool
}

var (
	headerStyle        = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#F5C2E7"))
	panelStyle         = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("#6C7086")).Padding(0, 1)
	panelFocusedStyle  = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("#89DCEB")).Padding(0, 1)
	selectedStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#89DCEB")).Bold(true)
	dimStyle      = lipgloss.NewStyle().Foreground(lipgloss.Color("#A6ADC8"))
	footerStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("#7F849C"))
	labelStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("#7F849C")).Width(10)

	// Priority color styles (Catppuccin Mocha palette)
	priorityP1Style = lipgloss.NewStyle().Foreground(lipgloss.Color("#F38BA8")) // Red
	priorityP2Style = lipgloss.NewStyle().Foreground(lipgloss.Color("#FAB387")) // Peach
	priorityP3Style = lipgloss.NewStyle().Foreground(lipgloss.Color("#A6E3A1")) // Green

	// Status color styles (Catppuccin Mocha palette)
	statusOpenStyle       = lipgloss.NewStyle().Foreground(lipgloss.Color("#6C7086")) // Gray (Overlay0)
	statusInProgressStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#89B4FA")) // Blue
	statusClosedStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("#A6E3A1")) // Green
	statusAwaitingStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("#F9E2AF")) // Yellow (awaiting human)
	statusBlockedStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("#F38BA8")) // Red (blocked)

	// Type color styles (Catppuccin Mocha palette)
	typeEpicStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("#CBA6F7")) // Purple (Mauve)
	typeBugStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("#F38BA8")) // Red
	typeFeatureStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#94E2D5")) // Teal

	// Verdict color styles (Catppuccin Mocha palette)
	verdictApprovedStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#A6E3A1")) // Green
	verdictRejectedStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#F38BA8")) // Red
)

// renderPriority returns a color-coded priority string.
func renderPriority(priority int) string {
	text := fmt.Sprintf("P%d", priority)
	switch priority {
	case 1:
		return priorityP1Style.Render(text)
	case 2:
		return priorityP2Style.Render(text)
	case 3:
		return priorityP3Style.Render(text)
	default:
		return text
	}
}

// renderStatus returns a color-coded status symbol.
// open: gray ○, in_progress: blue ●, closed: green ✓
func renderStatus(status string) string {
	switch status {
	case tick.StatusOpen:
		return statusOpenStyle.Render("○")
	case tick.StatusInProgress:
		return statusInProgressStyle.Render("●")
	case tick.StatusClosed:
		return statusClosedStyle.Render("✓")
	default:
		return status
	}
}

// isTickBlocked checks if a tick is blocked by looking up its blockers.
// A tick is blocked if it has BlockedBy entries and at least one is open.
func (m *Model) isTickBlocked(t tick.Tick) bool {
	if len(t.BlockedBy) == 0 {
		return false
	}
	// Build a map of open tick IDs for quick lookup
	openTicks := make(map[string]bool)
	for _, tk := range m.allTicks {
		if tk.Status != tick.StatusClosed {
			openTicks[tk.ID] = true
		}
	}
	// Check if any blocker is still open
	for _, blockerID := range t.BlockedBy {
		if openTicks[blockerID] {
			return true
		}
	}
	return false
}

// renderTickStatusIcon returns a color-coded status icon for a tick,
// accounting for workflow state priority:
// 1. Awaiting human → ◐ yellow
// 2. Blocked → ⊘ red
// 3. Status (open/in_progress/closed)
func (m *Model) renderTickStatusIcon(t tick.Tick) string {
	// Awaiting human takes priority
	if t.IsAwaitingHuman() {
		return statusAwaitingStyle.Render("◐")
	}
	// Blocked status (open tick with open blockers)
	if t.Status == tick.StatusOpen && m.isTickBlocked(t) {
		return statusBlockedStyle.Render("⊘")
	}
	return renderStatus(t.Status)
}

// renderTickStatus returns a color-coded status symbol for a tick,
// accounting for awaiting state. Awaiting ticks show yellow ◐.
// Deprecated: Use Model.renderTickStatusIcon for blocked detection.
func renderTickStatus(t tick.Tick) string {
	if t.IsAwaitingHuman() {
		return statusAwaitingStyle.Render("◐")
	}
	return renderStatus(t.Status)
}

// renderType returns a color-coded type string.
// epic: purple, bug: red, feature: teal, task/chore: default
func renderType(tickType string) string {
	switch tickType {
	case tick.TypeEpic:
		return typeEpicStyle.Render(tickType)
	case tick.TypeBug:
		return typeBugStyle.Render(tickType)
	case tick.TypeFeature:
		return typeFeatureStyle.Render(tickType)
	default:
		return tickType
	}
}

// renderVerdict returns a color-coded verdict string.
// approved: green, rejected: red
func renderVerdict(verdict string) string {
	switch verdict {
	case tick.VerdictApproved:
		return verdictApprovedStyle.Render(verdict)
	case tick.VerdictRejected:
		return verdictRejectedStyle.Render(verdict)
	default:
		return verdict
	}
}

// describeRequires returns a human-readable description for a requires value.
func describeRequires(requires string) string {
	switch requires {
	case tick.RequiresApproval:
		return "Requires human approval before closing"
	case tick.RequiresReview:
		return "Requires code review before closing"
	case tick.RequiresContent:
		return "Requires content review before closing"
	default:
		return "Requires: " + requires
	}
}

// describeAwaiting returns a human-readable description for an awaiting value.
func describeAwaiting(awaiting string) string {
	switch awaiting {
	case tick.AwaitingWork:
		return "Awaiting manual work (not automatable)"
	case tick.AwaitingApproval:
		return "Awaiting human approval"
	case tick.AwaitingInput:
		return "Awaiting human input"
	case tick.AwaitingReview:
		return "Awaiting code review"
	case tick.AwaitingContent:
		return "Awaiting content review"
	case tick.AwaitingEscalation:
		return "Awaiting escalation/help"
	case tick.AwaitingCheckpoint:
		return "Awaiting checkpoint review"
	default:
		return "Awaiting: " + awaiting
	}
}

// describeVerdict returns a human-readable description for a verdict value.
func describeVerdict(verdict string) string {
	switch verdict {
	case tick.VerdictApproved:
		return "Approved ✓"
	case tick.VerdictRejected:
		return "Rejected ✗"
	default:
		return "Verdict: " + verdict
	}
}

// NewModel builds a tree view model from ticks.
func NewModel(ticks []tick.Tick, storePath string) Model {
	collapsed := make(map[string]bool)
	hideClosed := true // default to hiding closed ticks
	items := buildItems(ticks, collapsed, "", "", hideClosed, awaitingFilterOff, "")

	ti := textinput.New()
	ti.Placeholder = "search..."
	ti.CharLimit = 100
	ti.Width = 30

	// Reject feedback input
	ri := textinput.New()
	ri.Placeholder = "feedback (optional, enter to submit, esc to cancel)"
	ri.CharLimit = 500
	ri.Width = 50

	h := help.New()
	h.Styles.ShortKey = footerStyle.Bold(true)
	h.Styles.ShortDesc = footerStyle
	h.Styles.ShortSeparator = footerStyle

	// Set up filesystem watcher
	var watcher *fsnotify.Watcher
	if storePath != "" {
		w, err := fsnotify.NewWatcher()
		if err == nil {
			issuesDir := filepath.Join(storePath, "issues")
			if err := w.Add(issuesDir); err == nil {
				watcher = w
			} else {
				w.Close()
			}
		}
	}

	return Model{
		allTicks:    ticks,
		items:       items,
		collapsed:   collapsed,
		hideClosed:  hideClosed,
		searchInput: ti,
		rejectInput: ri,
		keys:        defaultKeyMap,
		help:        h,
		storePath:   storePath,
		watcher:     watcher,
	}
}

func (m Model) Init() tea.Cmd {
	if m.watcher != nil {
		return m.watchForChanges()
	}
	return nil
}

// watchForChanges returns a command that waits for filesystem events and reloads ticks.
func (m Model) watchForChanges() tea.Cmd {
	return func() tea.Msg {
		if m.watcher == nil {
			return nil
		}

		for {
			select {
			case event, ok := <-m.watcher.Events:
				if !ok {
					return nil
				}
				// Only react to write/create/remove events on .json files
				if !strings.HasSuffix(event.Name, ".json") {
					continue
				}
				if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Remove) == 0 {
					continue
				}
				// Debounce: wait a bit for multiple rapid changes to settle
				time.Sleep(50 * time.Millisecond)
				// Drain any additional events that arrived during the wait
				drainEvents(m.watcher)
				// Reload ticks from disk
				store := tick.NewStore(m.storePath)
				ticks, err := store.List()
				return ticksReloadedMsg{ticks: ticks, err: err}
			case err, ok := <-m.watcher.Errors:
				if !ok {
					return nil
				}
				return ticksReloadedMsg{err: err}
			}
		}
	}
}

// drainEvents removes any pending events from the watcher channel.
func drainEvents(w *fsnotify.Watcher) {
	for {
		select {
		case <-w.Events:
		default:
			return
		}
	}
}

// Close cleans up the filesystem watcher.
func (m *Model) Close() {
	if m.watcher != nil {
		m.watcher.Close()
		m.watcher = nil
	}
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	var cmds []tea.Cmd
	prevSelected := m.selected

	switch msg := msg.(type) {
	case ticksReloadedMsg:
		if msg.err == nil && msg.ticks != nil {
			// Preserve selection by ID if possible
			var selectedID string
			if m.selected >= 0 && m.selected < len(m.items) {
				selectedID = m.items[m.selected].Tick.ID
			}
			m.allTicks = msg.ticks
			m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed, m.awaitingFilter, m.awaitingTypeFilter)
			// Restore selection
			m.selected = 0
			for i, item := range m.items {
				if item.Tick.ID == selectedID {
					m.selected = i
					break
				}
			}
			if m.selected >= len(m.items) {
				m.selected = len(m.items) - 1
			}
			if m.selected < 0 {
				m.selected = 0
			}
			m.updateListViewportContent()
			m.updateViewportContent()
		}
		// Continue watching for more changes
		if m.watcher != nil {
			cmds = append(cmds, m.watchForChanges())
		}
		return m, tea.Batch(cmds...)

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.help.Width = msg.Width
		m.updateViewportSize()
		if !m.ready {
			m.ready = true
		}
	case tea.KeyMsg:
		// Clear status message on any keypress
		m.statusMsg = ""
		m.statusIsError = false

		// Handle reject feedback input mode
		if m.rejecting {
			switch msg.String() {
			case "esc":
				m.rejecting = false
				m.rejectInput.Reset()
				m.rejectInput.Blur()
			case "enter":
				// Execute reject with feedback
				feedback := m.rejectInput.Value()
				m.rejecting = false
				m.rejectInput.Reset()
				m.rejectInput.Blur()
				if m.rejectTickIdx >= 0 && m.rejectTickIdx < len(m.items) {
					m.doReject(m.rejectTickIdx, feedback)
				}
				m.updateListViewportContent()
				m.updateViewportContent()
			default:
				// Forward all other keys to textinput
				m.rejectInput, cmd = m.rejectInput.Update(msg)
				cmds = append(cmds, cmd)
			}
			return m, tea.Batch(cmds...)
		}

		// Handle search mode input
		if m.searching {
			switch msg.String() {
			case "esc":
				m.searching = false
				m.searchInput.Reset()
				m.searchInput.Blur()
			case "enter":
				m.filter = m.searchInput.Value()
				m.searching = false
				m.searchInput.Reset()
				m.searchInput.Blur()
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed, m.awaitingFilter, m.awaitingTypeFilter)
				if m.selected >= len(m.items) {
					m.selected = len(m.items) - 1
				}
				if m.selected < 0 {
					m.selected = 0
				}
				m.updateListViewportContent()
				m.updateViewportContent()
			default:
				// Forward all other keys to textinput
				m.searchInput, cmd = m.searchInput.Update(msg)
				cmds = append(cmds, cmd)
			}
			return m, tea.Batch(cmds...)
		}

		// Normal mode key handling
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "/":
			m.searching = true
			m.searchInput.Reset()
			m.searchInput.Focus()
			return m, m.searchInput.Cursor.BlinkCmd()
		case "esc":
			if m.focusedEpic != "" {
				m.focusedEpic = ""
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed, m.awaitingFilter, m.awaitingTypeFilter)
				m.selected = 0
				m.updateListViewportContent()
				m.updateViewportContent()
			} else {
				return m, tea.Quit
			}
		case "tab":
			m.rightPaneFocused = !m.rightPaneFocused
		case "j", "down":
			if m.rightPaneFocused {
				m.viewport.LineDown(1)
			} else if m.selected < len(m.items)-1 {
				m.selected++
			}
		case "k", "up":
			if m.rightPaneFocused {
				m.viewport.LineUp(1)
			} else if m.selected > 0 {
				m.selected--
			}
		case "ctrl+d":
			m.viewport.HalfViewDown()
		case "ctrl+u":
			m.viewport.HalfViewUp()
		case "g":
			if m.rightPaneFocused {
				m.viewport.GotoTop()
			}
		case "G":
			if m.rightPaneFocused {
				m.viewport.GotoBottom()
			}
		case "z":
			if len(m.items) == 0 {
				return m, nil
			}
			current := m.items[m.selected]
			if current.IsEpic {
				if m.focusedEpic == current.Tick.ID {
					m.focusedEpic = ""
				} else {
					m.focusedEpic = current.Tick.ID
				}
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed, m.awaitingFilter, m.awaitingTypeFilter)
				m.selected = 0
				m.updateListViewportContent()
				m.updateViewportContent()
			}
		case "c":
			m.hideClosed = !m.hideClosed
			m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed, m.awaitingFilter, m.awaitingTypeFilter)
			if m.selected >= len(m.items) {
				m.selected = len(m.items) - 1
			}
			if m.selected < 0 {
				m.selected = 0
			}
			m.updateListViewportContent()
			m.updateViewportContent()
		case " ", "enter":
			if len(m.items) == 0 {
				return m, nil
			}
			current := m.items[m.selected]
			if current.IsEpic && current.HasKids {
				m.collapsed[current.Tick.ID] = !m.collapsed[current.Tick.ID]
				m.items = buildItemsFromState(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed, m.awaitingFilter, m.awaitingTypeFilter)
				if m.selected >= len(m.items) {
					m.selected = len(m.items) - 1
				}
				m.updateListViewportContent()
				m.updateViewportContent()
			}
		case "a":
			// Approve selected tick if awaiting
			if len(m.items) == 0 {
				return m, nil
			}
			m.doApprove(m.selected)
			m.updateListViewportContent()
			m.updateViewportContent()
		case "r":
			// Reject selected tick - enter feedback mode
			if len(m.items) == 0 {
				return m, nil
			}
			current := m.items[m.selected]
			if !current.Tick.IsAwaitingHuman() {
				m.statusMsg = "tick is not awaiting human decision"
				m.statusIsError = true
				return m, nil
			}
			m.rejecting = true
			m.rejectTickIdx = m.selected
			m.rejectInput.Reset()
			m.rejectInput.Focus()
			return m, m.rejectInput.Cursor.BlinkCmd()
		case "h":
			// Toggle human queue filter: off -> human only -> agent only -> off
			switch m.awaitingFilter {
			case awaitingFilterOff:
				m.awaitingFilter = awaitingFilterHumanOnly
			case awaitingFilterHumanOnly:
				m.awaitingFilter = awaitingFilterAgentOnly
			case awaitingFilterAgentOnly, awaitingFilterByType:
				m.awaitingFilter = awaitingFilterOff
				m.awaitingTypeFilter = ""
			}
			m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed, m.awaitingFilter, m.awaitingTypeFilter)
			if m.selected >= len(m.items) {
				m.selected = len(m.items) - 1
			}
			if m.selected < 0 {
				m.selected = 0
			}
			m.updateListViewportContent()
			m.updateViewportContent()
		case "H":
			// Cycle through specific awaiting types
			m.awaitingFilter = awaitingFilterByType
			m.awaitingTypeIdx = (m.awaitingTypeIdx + 1) % len(awaitingTypes)
			m.awaitingTypeFilter = awaitingTypes[m.awaitingTypeIdx]
			m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed, m.awaitingFilter, m.awaitingTypeFilter)
			if m.selected >= len(m.items) {
				m.selected = len(m.items) - 1
			}
			if m.selected < 0 {
				m.selected = 0
			}
			m.updateListViewportContent()
			m.updateViewportContent()
		}
	}

	// Update viewport content when selection changes
	if prevSelected != m.selected {
		m.updateListViewportContent()
		m.updateViewportContent()
	}

	return m, cmd
}

// doApprove approves the tick at the given index.
func (m *Model) doApprove(idx int) {
	if idx < 0 || idx >= len(m.items) {
		return
	}

	current := m.items[idx]
	if !current.Tick.IsAwaitingHuman() {
		m.statusMsg = "tick is not awaiting human decision"
		m.statusIsError = true
		return
	}

	if m.storePath == "" {
		m.statusMsg = "no store path configured"
		m.statusIsError = true
		return
	}

	store := tick.NewStore(m.storePath)
	t, err := store.Read(current.Tick.ID)
	if err != nil {
		m.statusMsg = fmt.Sprintf("failed to read tick: %v", err)
		m.statusIsError = true
		return
	}

	// Handle legacy manual flag
	if t.Awaiting == nil && t.Manual {
		t.SetAwaiting(tick.AwaitingWork)
	}

	// Set verdict and process
	verdict := tick.VerdictApproved
	t.Verdict = &verdict
	t.UpdatedAt = time.Now().UTC()

	closed, err := tick.ProcessVerdict(&t)
	if err != nil {
		m.statusMsg = fmt.Sprintf("failed to process verdict: %v", err)
		m.statusIsError = true
		return
	}

	if err := store.Write(t); err != nil {
		m.statusMsg = fmt.Sprintf("failed to save tick: %v", err)
		m.statusIsError = true
		return
	}

	// Update the tick in our model
	m.items[idx].Tick = t
	for i := range m.allTicks {
		if m.allTicks[i].ID == t.ID {
			m.allTicks[i] = t
			break
		}
	}

	if closed {
		m.statusMsg = fmt.Sprintf("approved %s (closed)", t.ID)
	} else {
		m.statusMsg = fmt.Sprintf("approved %s (returned to agent)", t.ID)
	}
	m.statusIsError = false
}

// doReject rejects the tick at the given index with optional feedback.
func (m *Model) doReject(idx int, feedback string) {
	if idx < 0 || idx >= len(m.items) {
		return
	}

	current := m.items[idx]
	if !current.Tick.IsAwaitingHuman() {
		m.statusMsg = "tick is not awaiting human decision"
		m.statusIsError = true
		return
	}

	if m.storePath == "" {
		m.statusMsg = "no store path configured"
		m.statusIsError = true
		return
	}

	store := tick.NewStore(m.storePath)
	t, err := store.Read(current.Tick.ID)
	if err != nil {
		m.statusMsg = fmt.Sprintf("failed to read tick: %v", err)
		m.statusIsError = true
		return
	}

	// Handle legacy manual flag
	if t.Awaiting == nil && t.Manual {
		t.SetAwaiting(tick.AwaitingWork)
	}

	// Add feedback note if provided
	feedback = strings.TrimSpace(feedback)
	if feedback != "" {
		timestamp := time.Now().Format("2006-01-02 15:04")
		line := fmt.Sprintf("%s - [human] %s", timestamp, feedback)
		if strings.TrimSpace(t.Notes) == "" {
			t.Notes = line
		} else {
			t.Notes = strings.TrimRight(t.Notes, "\n") + "\n" + line
		}
	}

	// Set verdict and process
	verdict := tick.VerdictRejected
	t.Verdict = &verdict
	t.UpdatedAt = time.Now().UTC()

	closed, err := tick.ProcessVerdict(&t)
	if err != nil {
		m.statusMsg = fmt.Sprintf("failed to process verdict: %v", err)
		m.statusIsError = true
		return
	}

	if err := store.Write(t); err != nil {
		m.statusMsg = fmt.Sprintf("failed to save tick: %v", err)
		m.statusIsError = true
		return
	}

	// Update the tick in our model
	m.items[idx].Tick = t
	for i := range m.allTicks {
		if m.allTicks[i].ID == t.ID {
			m.allTicks[i] = t
			break
		}
	}

	if closed {
		m.statusMsg = fmt.Sprintf("rejected %s (closed)", t.ID)
	} else {
		m.statusMsg = fmt.Sprintf("rejected %s (returned to agent)", t.ID)
	}
	m.statusIsError = false
}

func (m Model) View() string {
	if m.width == 0 || m.height == 0 {
		return "Loading...\n"
	}

	if len(m.items) == 0 {
		return "No ticks\n"
	}

	leftWidth := m.width / 2
	if leftWidth < 36 {
		leftWidth = 36
	}

	rightWidth := m.width - leftWidth
	if rightWidth < 28 {
		rightWidth = 28
	}

	// Height budget: panel content + 2 (borders) + 1 (help) + 1 (trailing newline)
	// So panel content = m.height - 4
	panelHeight := m.height - 4
	if panelHeight < 4 {
		panelHeight = 4
	}

	// Build left panel header with indicators
	leftHeader := "Ticks"
	if m.rejecting {
		leftHeader = fmt.Sprintf("Reject: %s", m.rejectInput.View())
	} else if m.searching {
		leftHeader = fmt.Sprintf("Search: %s", m.searchInput.View())
	} else if m.filter != "" {
		leftHeader = fmt.Sprintf("Filter: %s", m.filter)
	} else if m.focusedEpic != "" {
		leftHeader = fmt.Sprintf("Focus: %s", m.focusedEpic)
	}
	// Add indicator for hiding closed ticks
	if m.hideClosed {
		leftHeader += " [hiding closed]"
	}
	// Add indicator for awaiting filter
	switch m.awaitingFilter {
	case awaitingFilterHumanOnly:
		leftHeader += " [human queue]"
	case awaitingFilterAgentOnly:
		leftHeader += " [agent queue]"
	case awaitingFilterByType:
		leftHeader += fmt.Sprintf(" [awaiting:%s]", m.awaitingTypeFilter)
	}

	// Build right panel header with title and scroll indicator
	rightHeader := "Details"
	if len(m.items) > 0 {
		rightHeader = m.items[m.selected].Tick.Title
		if m.ready && m.viewport.TotalLineCount() > m.viewport.VisibleLineCount() {
			scrollPct := int(m.viewport.ScrollPercent() * 100)
			rightHeader = fmt.Sprintf("%s (%d%%)", rightHeader, scrollPct)
		}
	}

	// Panel content width = total width - border (2); padding is inside width
	// Use focused style for the active pane
	leftStyle := panelStyle
	rightStyle := panelStyle
	if m.rightPaneFocused {
		rightStyle = panelFocusedStyle
	} else {
		leftStyle = panelFocusedStyle
	}
	leftPanel := leftStyle.
		Width(leftWidth - 2).
		Height(panelHeight).
		Render(headerStyle.Render(leftHeader) + "\n" + m.listViewport.View())
	rightPanel := rightStyle.
		Width(rightWidth - 2).
		Height(panelHeight).
		Render(headerStyle.Render(rightHeader) + "\n" + m.viewport.View())

	// Build footer with help or status message
	var footerView string
	if m.statusMsg != "" {
		if m.statusIsError {
			footerView = lipgloss.NewStyle().Foreground(lipgloss.Color("#F38BA8")).Render(m.statusMsg)
		} else {
			footerView = lipgloss.NewStyle().Foreground(lipgloss.Color("#A6E3A1")).Render(m.statusMsg)
		}
	} else {
		footerView = m.help.View(m.keys)
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, leftPanel, rightPanel) + "\n" + footerView
}

// buildListContent builds the tick list content string for the left pane viewport.
func buildListContent(m Model, width int) string {
	var lines []string
	for i, item := range m.items {
		cursor := " "
		if i == m.selected {
			cursor = ">"
		}
		indent := ""
		for j := 0; j < item.Depth; j++ {
			indent += "  "
		}
		marker := " "
		if item.IsEpic && item.HasKids {
			if m.collapsed[item.Tick.ID] {
				marker = "+"
			} else {
				marker = "-"
			}
		}

		// Status icon with blocked detection
		statusIcon := m.renderTickStatusIcon(item.Tick)

		line := fmt.Sprintf("%s %s%s %s  %s %s %s", cursor, indent, marker, item.Tick.ID, statusIcon, renderPriority(item.Tick.Priority), item.Tick.Title)
		line = truncate(line, width)
		if i == m.selected {
			lines = append(lines, selectedStyle.Render(line))
		} else {
			lines = append(lines, dimStyle.Render(line))
		}
	}
	return strings.Join(lines, "\n")
}

func buildDetailContent(t tick.Tick, width int) string {
	var out []string

	// Labeled key-value fields
	out = append(out, labelStyle.Render("ID:")+t.ID)
	out = append(out, labelStyle.Render("Priority:")+renderPriority(t.Priority))
	out = append(out, labelStyle.Render("Type:")+renderType(t.Type))
	out = append(out, labelStyle.Render("Status:")+renderStatus(t.Status)+" "+t.Status)
	out = append(out, labelStyle.Render("Owner:")+t.Owner)

	// Workflow section - only show if at least one workflow field is set
	hasWorkflowFields := t.Requires != nil || t.IsAwaitingHuman() || t.Verdict != nil
	if hasWorkflowFields {
		out = append(out, "")
		out = append(out, headerStyle.Render("Workflow:"))

		// Show gate requirement with its current state
		if t.Requires != nil {
			gateLine := "  " + describeRequires(*t.Requires)
			// Show state of this gate
			if t.Verdict != nil && *t.Verdict == tick.VerdictApproved {
				gateLine += " → " + verdictApprovedStyle.Render("Approved ✓")
			} else if t.Verdict != nil && *t.Verdict == tick.VerdictRejected && t.IsAwaitingHuman() {
				// Rejected but retrying
				gateLine += " → " + verdictRejectedStyle.Render("Rejected ✗") + " → " + statusAwaitingStyle.Render("Pending retry")
			} else if t.Verdict != nil && *t.Verdict == tick.VerdictRejected {
				gateLine += " → " + verdictRejectedStyle.Render("Rejected ✗")
			} else if t.IsAwaitingHuman() {
				gateLine += " → " + statusAwaitingStyle.Render("Pending")
			} else {
				gateLine += " → " + dimStyle.Render("Not yet requested")
			}
			out = append(out, gateLine)
		} else {
			// No gate, but has awaiting/verdict - show standalone
			if t.IsAwaitingHuman() {
				out = append(out, "  "+statusAwaitingStyle.Render(describeAwaiting(t.GetAwaitingType())))
			}
			if t.Verdict != nil {
				if *t.Verdict == tick.VerdictApproved {
					out = append(out, "  "+verdictApprovedStyle.Render(describeVerdict(*t.Verdict)))
				} else {
					out = append(out, "  "+verdictRejectedStyle.Render(describeVerdict(*t.Verdict)))
				}
			}
		}
	}

	if strings.TrimSpace(t.Description) != "" {
		out = append(out, "")
		out = append(out, headerStyle.Render("Description:"))
		out = append(out, wrapAndIndent(t.Description, 2, width)...)
	}

	if strings.TrimSpace(t.Notes) != "" {
		out = append(out, "")
		out = append(out, headerStyle.Render("Notes:"))
		out = append(out, wrapAndIndent(t.Notes, 2, width)...)
	}

	if strings.TrimSpace(t.AcceptanceCriteria) != "" {
		out = append(out, "")
		out = append(out, headerStyle.Render("Acceptance Criteria:"))
		out = append(out, wrapAndIndent(t.AcceptanceCriteria, 2, width)...)
	}

	if len(t.Labels) > 0 {
		out = append(out, "")
		out = append(out, labelStyle.Render("Labels:")+strings.Join(t.Labels, ", "))
	}
	if len(t.BlockedBy) > 0 {
		out = append(out, labelStyle.Render("Blocked:")+strings.Join(t.BlockedBy, ", "))
	}
	if t.Parent != "" {
		out = append(out, labelStyle.Render("Parent:")+t.Parent)
	}
	if t.DiscoveredFrom != "" {
		out = append(out, labelStyle.Render("From:")+t.DiscoveredFrom)
	}
	if t.ClosedReason != "" {
		out = append(out, labelStyle.Render("Closed:")+t.ClosedReason)
	}

	return strings.Join(out, "\n")
}

// updateViewportSize recalculates viewport dimensions based on terminal size.
func (m *Model) updateViewportSize() {
	// Left pane dimensions
	leftWidth := m.width / 2
	if leftWidth < 36 {
		leftWidth = 36
	}
	// Subtract border (2), padding (2), and header line (1)
	listContentWidth := leftWidth - 4
	listContentHeight := m.height - 2 - 2 - 1
	if listContentHeight < 1 {
		listContentHeight = 1
	}
	m.listViewport.Width = listContentWidth
	m.listViewport.Height = listContentHeight

	// Right pane dimensions
	rightWidth := m.width - leftWidth
	if rightWidth < 28 {
		rightWidth = 28
	}
	contentWidth := rightWidth - 4
	contentHeight := m.height - 2 - 2 - 1
	if contentHeight < 1 {
		contentHeight = 1
	}
	m.viewport.Width = contentWidth
	m.viewport.Height = contentHeight

	m.updateListViewportContent()
	m.updateViewportContent()
}

// updateListViewportContent sets the list viewport content and ensures selected item is visible.
func (m *Model) updateListViewportContent() {
	if len(m.items) == 0 {
		m.listViewport.SetContent("")
		return
	}
	content := buildListContent(*m, m.listViewport.Width)
	m.listViewport.SetContent(content)

	// Ensure selected item is visible
	// Each item is one line, so line number = selected index
	visibleHeight := m.listViewport.Height
	if visibleHeight > 0 && m.selected >= 0 {
		topLine := m.listViewport.YOffset
		bottomLine := topLine + visibleHeight - 1

		if m.selected < topLine {
			// Selected is above visible area - scroll up
			m.listViewport.SetYOffset(m.selected)
		} else if m.selected > bottomLine {
			// Selected is below visible area - scroll down
			m.listViewport.SetYOffset(m.selected - visibleHeight + 1)
		}
	}
}

// updateViewportContent sets the viewport content based on current selection.
func (m *Model) updateViewportContent() {
	if len(m.items) == 0 {
		m.viewport.SetContent("")
		return
	}
	content := buildDetailContent(m.items[m.selected].Tick, m.viewport.Width)
	m.viewport.SetContent(content)
	m.viewport.GotoTop()
}

func buildItems(ticks []tick.Tick, collapsed map[string]bool, filter string, focus string, hideClosed bool, awaitingMode awaitingFilterMode, awaitingType string) []item {
	filtered := applyFilter(applyFocus(ticks, focus), filter)
	if hideClosed {
		filtered = applyHideClosed(filtered)
	}
	filtered = applyAwaitingFilter(filtered, awaitingMode, awaitingType)
	roots, children := splitRoots(filtered)
	query.SortByPriorityCreatedAt(roots)

	items := make([]item, 0, len(ticks))
	for _, root := range roots {
		kids := children[root.ID]
		query.SortByPriorityCreatedAt(kids)
		items = append(items, item{Tick: root, Depth: 0, IsEpic: root.Type == tick.TypeEpic, HasKids: len(kids) > 0})
		if root.Type == tick.TypeEpic && len(kids) > 0 && collapsed[root.ID] {
			continue
		}
		for _, child := range kids {
			items = append(items, item{Tick: child, Depth: 1, IsEpic: child.Type == tick.TypeEpic, HasKids: len(children[child.ID]) > 0})
		}
	}
	return items
}

func buildItemsFromState(all []tick.Tick, collapsed map[string]bool, filter string, focus string, hideClosed bool, awaitingMode awaitingFilterMode, awaitingType string) []item {
	return buildItems(all, collapsed, filter, focus, hideClosed, awaitingMode, awaitingType)
}

// applyHideClosed filters out closed ticks following these rules:
// - Filter out closed epics (and their children will become orphaned)
// - Filter out orphaned closed ticks (closed with no parent or parent not in list)
// - Keep closed children of open epics
func applyHideClosed(ticks []tick.Tick) []tick.Tick {
	// Build map for lookups
	byID := make(map[string]tick.Tick)
	for _, t := range ticks {
		byID[t.ID] = t
	}

	var out []tick.Tick
	for _, t := range ticks {
		// Always filter closed epics
		if t.Status == tick.StatusClosed && t.Type == tick.TypeEpic {
			continue
		}
		// For closed non-epics: only keep if parent exists and is open
		if t.Status == tick.StatusClosed {
			if t.Parent == "" {
				// Orphaned closed tick - filter out
				continue
			}
			parent, exists := byID[t.Parent]
			if !exists {
				// Parent not in filtered list - orphaned closed tick
				continue
			}
			if parent.Status == tick.StatusClosed {
				// Parent is closed - filter out
				continue
			}
			// Parent is open - keep this closed child
		}
		out = append(out, t)
	}
	return out
}

func splitRoots(ticks []tick.Tick) ([]tick.Tick, map[string][]tick.Tick) {
	children := make(map[string][]tick.Tick)
	var roots []tick.Tick

	byID := make(map[string]tick.Tick)
	for _, t := range ticks {
		byID[t.ID] = t
	}

	for _, t := range ticks {
		if t.Parent != "" {
			children[t.Parent] = append(children[t.Parent], t)
			continue
		}
		roots = append(roots, t)
	}

	for parent, kids := range children {
		if _, ok := byID[parent]; ok {
			continue
		}
		roots = append(roots, kids...)
		delete(children, parent)
	}

	return roots, children
}

func applyFilter(ticks []tick.Tick, filter string) []tick.Tick {
	filter = strings.TrimSpace(strings.ToLower(filter))
	if filter == "" {
		return ticks
	}
	var out []tick.Tick
	for _, t := range ticks {
		if strings.Contains(strings.ToLower(t.Title), filter) {
			out = append(out, t)
			continue
		}
		for _, label := range t.Labels {
			if strings.Contains(strings.ToLower(label), filter) {
				out = append(out, t)
				break
			}
		}
	}
	return out
}

func applyFocus(ticks []tick.Tick, focus string) []tick.Tick {
	focus = strings.TrimSpace(focus)
	if focus == "" {
		return ticks
	}
	var out []tick.Tick
	for _, t := range ticks {
		if t.ID == focus || t.Parent == focus {
			out = append(out, t)
		}
	}
	return out
}

// applyAwaitingFilter filters ticks based on awaiting state.
func applyAwaitingFilter(ticks []tick.Tick, mode awaitingFilterMode, typeFilter string) []tick.Tick {
	if mode == awaitingFilterOff {
		return ticks
	}

	var out []tick.Tick
	for _, t := range ticks {
		switch mode {
		case awaitingFilterHumanOnly:
			// Show only ticks awaiting human action
			if t.IsAwaitingHuman() {
				out = append(out, t)
			}
		case awaitingFilterAgentOnly:
			// Show only ticks NOT awaiting human action
			if !t.IsAwaitingHuman() {
				out = append(out, t)
			}
		case awaitingFilterByType:
			// Show only ticks with specific awaiting type
			if t.GetAwaitingType() == typeFilter {
				out = append(out, t)
			}
		}
	}
	return out
}

func indentLines(value string, spaces int) []string {
	prefix := strings.Repeat(" ", spaces)
	lines := splitLines(value)
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		out = append(out, prefix+line)
	}
	return out
}

// wrapAndIndent wraps text to fit within width and indents each line.
func wrapAndIndent(value string, spaces int, width int) []string {
	prefix := strings.Repeat(" ", spaces)
	wrapWidth := width - spaces
	if wrapWidth < 10 {
		wrapWidth = 10
	}

	// Use lipgloss to wrap text
	wrapped := lipgloss.NewStyle().Width(wrapWidth).Render(value)
	lines := splitLines(wrapped)
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		out = append(out, prefix+line)
	}
	return out
}

func truncate(value string, width int) string {
	if width <= 0 {
		return ""
	}
	return ansi.Truncate(value, width, ".")
}

func splitLines(value string) []string {
	value = strings.TrimRight(value, "\n")
	if value == "" {
		return nil
	}
	return strings.Split(value, "\n")
}
