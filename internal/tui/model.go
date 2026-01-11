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
	Up       key.Binding
	Down     key.Binding
	ScrollUp key.Binding
	ScrollDn key.Binding
	Top      key.Binding
	Bottom   key.Binding
	Fold     key.Binding
	Focus    key.Binding
	Search   key.Binding
	Quit     key.Binding
}

// ShortHelp returns bindings for the short help view (single line).
func (k keyMap) ShortHelp() []key.Binding {
	return []key.Binding{k.Up, k.ScrollUp, k.Fold, k.Focus, k.Search, k.Quit}
}

// FullHelp returns bindings for the full help view (multiple columns).
func (k keyMap) FullHelp() [][]key.Binding {
	return [][]key.Binding{
		{k.Up, k.Down},
		{k.ScrollUp, k.ScrollDn, k.Top, k.Bottom},
		{k.Fold, k.Focus, k.Search, k.Quit},
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
	Quit: key.NewBinding(
		key.WithKeys("q", "ctrl+c"),
		key.WithHelp("q", "quit"),
	),
}

type Model struct {
	allTicks    []tick.Tick
	items       []item
	collapsed   map[string]bool
	selected    int
	filter      string
	searching   bool
	searchInput textinput.Model
	focusedEpic string
	width       int
	height      int
	viewport    viewport.Model
	ready       bool // viewport initialized
	keys        keyMap
	help        help.Model
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
	items := buildItems(ticks, collapsed, "", "")

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
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic)
				if m.selected >= len(m.items) {
					m.selected = len(m.items) - 1
				}
				if m.selected < 0 {
					m.selected = 0
				}
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
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic)
				m.selected = 0
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
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic)
				m.selected = 0
				m.updateViewportContent()
			}
		case " ", "enter":
			if len(m.items) == 0 {
				return m, nil
			}
			current := m.items[m.selected]
			if current.IsEpic && current.HasKids {
				m.collapsed[current.Tick.ID] = !m.collapsed[current.Tick.ID]
				m.items = buildItemsFromState(m.allTicks, m.collapsed, m.filter, m.focusedEpic)
				if m.selected >= len(m.items) {
					m.selected = len(m.items) - 1
				}
				m.updateViewportContent()
			}
		}
	}

	// Update viewport content when selection changes
	if prevSelected != m.selected {
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
	// Content width accounts for border (2) and padding (2)
	listWidth := leftWidth - 4

	list := buildListView(m, listWidth)

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
		Render(headerStyle.Render(leftHeader) + "\n" + list)
	rightPanel := panelStyle.
		Width(rightWidth - 2).
		Height(panelHeight).
		Render(headerStyle.Render(rightHeader) + "\n" + m.viewport.View())

	helpView := m.help.View(m.keys)

	return lipgloss.JoinHorizontal(lipgloss.Top, leftPanel, rightPanel) + "\n" + helpView
}

func buildListView(m Model, width int) string {
	var out string
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
		line := fmt.Sprintf("%s %s%s %s  %s %s %s", cursor, indent, marker, item.Tick.ID, renderStatus(item.Tick.Status), renderPriority(item.Tick.Priority), item.Tick.Title)
		line = truncate(line, width)
		if i == m.selected {
			out += selectedStyle.Render(line) + "\n"
		} else {
			out += dimStyle.Render(line) + "\n"
		}
	}
	return out
}

func buildDetailContent(t tick.Tick) string {
	var out []string

	// Labeled key-value fields
	out = append(out, labelStyle.Render("ID:")+t.ID)
	out = append(out, labelStyle.Render("Priority:")+renderPriority(t.Priority))
	out = append(out, labelStyle.Render("Type:")+renderType(t.Type))
	out = append(out, labelStyle.Render("Status:")+renderStatus(t.Status)+" "+t.Status)
	out = append(out, labelStyle.Render("Owner:")+t.Owner)

	if strings.TrimSpace(t.Description) != "" {
		out = append(out, "")
		out = append(out, headerStyle.Render("Description:"))
		out = append(out, indentLines(t.Description, 2)...)
	}

	if strings.TrimSpace(t.Notes) != "" {
		out = append(out, "")
		out = append(out, headerStyle.Render("Notes:"))
		out = append(out, indentLines(t.Notes, 2)...)
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
	rightWidth := m.width - m.width/2
	if rightWidth < 28 {
		rightWidth = 28
	}
	// Subtract border (2), padding (2), and header line (1)
	contentWidth := rightWidth - 4
	contentHeight := m.height - 2 - 2 - 1
	if contentHeight < 1 {
		contentHeight = 1
	}
	m.viewport.Width = contentWidth
	m.viewport.Height = contentHeight
	m.updateViewportContent()
}

// updateViewportContent sets the viewport content based on current selection.
func (m *Model) updateViewportContent() {
	if len(m.items) == 0 {
		m.viewport.SetContent("")
		return
	}
	content := buildDetailContent(m.items[m.selected].Tick)
	m.viewport.SetContent(content)
	m.viewport.GotoTop()
}

func buildItems(ticks []tick.Tick, collapsed map[string]bool, filter string, focus string) []item {
	filtered := applyFilter(applyFocus(ticks, focus), filter)
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

func buildItemsFromState(all []tick.Tick, collapsed map[string]bool, filter string, focus string) []item {
	return buildItems(all, collapsed, filter, focus)
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
