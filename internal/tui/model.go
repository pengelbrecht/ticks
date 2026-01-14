package tui

import (
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/bubbles/textinput"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"

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
	Up         key.Binding
	Down       key.Binding
	ScrollUp   key.Binding
	ScrollDn   key.Binding
	Top        key.Binding
	Bottom     key.Binding
	Fold       key.Binding
	Focus      key.Binding
	Search     key.Binding
	HideClosed key.Binding
	Quit       key.Binding
}

// ShortHelp returns bindings for the short help view (single line).
func (k keyMap) ShortHelp() []key.Binding {
	return []key.Binding{k.Up, k.ScrollUp, k.Fold, k.Focus, k.Search, k.HideClosed, k.Quit}
}

// FullHelp returns bindings for the full help view (multiple columns).
func (k keyMap) FullHelp() [][]key.Binding {
	return [][]key.Binding{
		{k.Up, k.Down},
		{k.ScrollUp, k.ScrollDn, k.Top, k.Bottom},
		{k.Fold, k.Focus, k.Search, k.HideClosed, k.Quit},
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
	Quit: key.NewBinding(
		key.WithKeys("q", "ctrl+c"),
		key.WithHelp("q", "quit"),
	),
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
}

var (
	headerStyle   = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#F5C2E7"))
	panelStyle    = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("#6C7086")).Padding(0, 1)
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

	// Type color styles (Catppuccin Mocha palette)
	typeEpicStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("#CBA6F7")) // Purple (Mauve)
	typeBugStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("#F38BA8")) // Red
	typeFeatureStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#94E2D5")) // Teal
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

// renderTickStatus returns a color-coded status symbol for a tick,
// accounting for awaiting state. Awaiting ticks show yellow ◐.
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

// NewModel builds a tree view model from ticks.
func NewModel(ticks []tick.Tick) Model {
	collapsed := make(map[string]bool)
	hideClosed := true // default to hiding closed ticks
	items := buildItems(ticks, collapsed, "", "", hideClosed)

	ti := textinput.New()
	ti.Placeholder = "search..."
	ti.CharLimit = 100
	ti.Width = 30

	h := help.New()
	h.Styles.ShortKey = footerStyle.Bold(true)
	h.Styles.ShortDesc = footerStyle
	h.Styles.ShortSeparator = footerStyle

	return Model{
		allTicks:    ticks,
		items:       items,
		collapsed:   collapsed,
		hideClosed:  hideClosed,
		searchInput: ti,
		keys:        defaultKeyMap,
		help:        h,
	}
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	var cmds []tea.Cmd
	prevSelected := m.selected

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.help.Width = msg.Width
		m.updateViewportSize()
		if !m.ready {
			m.ready = true
		}
	case tea.KeyMsg:
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
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed)
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
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed)
				m.selected = 0
				m.updateListViewportContent()
				m.updateViewportContent()
			} else {
				return m, tea.Quit
			}
		case "j", "down":
			if m.selected < len(m.items)-1 {
				m.selected++
			}
		case "k", "up":
			if m.selected > 0 {
				m.selected--
			}
		case "ctrl+d":
			m.viewport.HalfViewDown()
		case "ctrl+u":
			m.viewport.HalfViewUp()
		case "g":
			m.viewport.GotoTop()
		case "G":
			m.viewport.GotoBottom()
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
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed)
				m.selected = 0
				m.updateListViewportContent()
				m.updateViewportContent()
			}
		case "c":
			m.hideClosed = !m.hideClosed
			m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed)
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
				m.items = buildItemsFromState(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed)
				if m.selected >= len(m.items) {
					m.selected = len(m.items) - 1
				}
				m.updateListViewportContent()
				m.updateViewportContent()
			}
		}
	}

	// Update viewport content when selection changes
	if prevSelected != m.selected {
		m.updateListViewportContent()
		m.updateViewportContent()
	}

	return m, cmd
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
	if m.searching {
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
	leftPanel := panelStyle.
		Width(leftWidth - 2).
		Height(panelHeight).
		Render(headerStyle.Render(leftHeader) + "\n" + m.listViewport.View())
	rightPanel := panelStyle.
		Width(rightWidth - 2).
		Height(panelHeight).
		Render(headerStyle.Render(rightHeader) + "\n" + m.viewport.View())

	helpView := m.help.View(m.keys)

	return lipgloss.JoinHorizontal(lipgloss.Top, leftPanel, rightPanel) + "\n" + helpView
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
		line := fmt.Sprintf("%s %s%s %s  %s %s %s", cursor, indent, marker, item.Tick.ID, renderTickStatus(item.Tick), renderPriority(item.Tick.Priority), item.Tick.Title)
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
	if t.IsAwaitingHuman() {
		out = append(out, labelStyle.Render("Awaiting:")+statusAwaitingStyle.Render(t.GetAwaitingType()))
	}
	out = append(out, labelStyle.Render("Owner:")+t.Owner)

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

func buildItems(ticks []tick.Tick, collapsed map[string]bool, filter string, focus string, hideClosed bool) []item {
	filtered := applyFilter(applyFocus(ticks, focus), filter)
	if hideClosed {
		filtered = applyHideClosed(filtered)
	}
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

func buildItemsFromState(all []tick.Tick, collapsed map[string]bool, filter string, focus string, hideClosed bool) []item {
	return buildItems(all, collapsed, filter, focus, hideClosed)
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
