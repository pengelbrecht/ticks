package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

type item struct {
	Tick    tick.Tick
	Depth   int
	IsEpic  bool
	HasKids bool
}

type Model struct {
	allTicks    []tick.Tick
	items       []item
	collapsed   map[string]bool
	selected    int
	filter      string
	searching   bool
	searchInput string
	focusedEpic string
	width       int
	height      int
	viewport    viewport.Model
	ready       bool // viewport initialized
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
	return Model{allTicks: ticks, items: items, collapsed: collapsed}
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	prevSelected := m.selected

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.updateViewportSize()
		if !m.ready {
			m.ready = true
		}
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "/":
			m.searching = true
			m.searchInput = ""
		case "esc":
			if m.searching {
				m.searching = false
				m.searchInput = ""
			} else if m.focusedEpic != "" {
				m.focusedEpic = ""
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic)
				m.selected = 0
				m.updateViewportContent()
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
			if m.searching {
				m.filter = m.searchInput
				m.searching = false
				m.searchInput = ""
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic)
				if m.selected >= len(m.items) {
					m.selected = len(m.items) - 1
				}
				if m.selected < 0 {
					m.selected = 0
				}
				m.updateViewportContent()
				return m, nil
			}
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
		default:
			if m.searching && msg.Type == tea.KeyRunes {
				m.searchInput += msg.String()
			}
		}
		if m.searching && msg.Type == tea.KeyBackspace {
			if len(m.searchInput) > 0 {
				m.searchInput = m.searchInput[:len(m.searchInput)-1]
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

	rightWidth := m.width - leftWidth - 1
	if rightWidth < 28 {
		rightWidth = 28
	}

	panelHeight := m.height - 2
	if panelHeight < 6 {
		panelHeight = 6
	}

	// Build left panel header with indicators
	leftHeader := "Ticks"
	if m.searching {
		leftHeader = fmt.Sprintf("Search: %s", m.searchInput)
	} else if m.filter != "" {
		leftHeader = fmt.Sprintf("Filter: %s", m.filter)
	} else if m.focusedEpic != "" {
		leftHeader = fmt.Sprintf("Focus: %s", m.focusedEpic)
	}

	// Build right panel header with scroll indicator
	rightHeader := "Details"
	if m.ready && m.viewport.TotalLineCount() > m.viewport.VisibleLineCount() {
		scrollPct := int(m.viewport.ScrollPercent() * 100)
		rightHeader = fmt.Sprintf("Details (%d%%)", scrollPct)
	}

	leftPanel := panelStyle.
		Width(leftWidth).
		Height(panelHeight).
		Render(headerStyle.Render(leftHeader) + "\n" + list)
	rightPanel := panelStyle.
		Width(rightWidth).
		Height(panelHeight).
		Render(headerStyle.Render(rightHeader) + "\n" + m.viewport.View())

	footer := footerStyle.Render("j/k: move  ctrl+d/u: scroll  g/G: top/bottom  space: fold  z: focus  /: search  q: quit")

	return lipgloss.JoinHorizontal(lipgloss.Top, leftPanel, rightPanel) + "\n" + footer + "\n"
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
	out = append(out, "")
	out = append(out, headerStyle.Render("Title:"))
	out = append(out, "  "+t.Title)

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
		out = append(out, fmt.Sprintf("Labels: %s", strings.Join(t.Labels, ", ")))
	}
	if len(t.BlockedBy) > 0 {
		out = append(out, fmt.Sprintf("Blocked by: %s", strings.Join(t.BlockedBy, ", ")))
	}
	if t.Parent != "" {
		out = append(out, fmt.Sprintf("Parent: %s", t.Parent))
	}
	if t.DiscoveredFrom != "" {
		out = append(out, fmt.Sprintf("Discovered from: %s", t.DiscoveredFrom))
	}

	return strings.Join(out, "\n")
}

// updateViewportSize recalculates viewport dimensions based on terminal size.
func (m *Model) updateViewportSize() {
	rightWidth := m.width - m.width/2 - 1
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
	if len(value) <= width {
		return value
	}
	if width <= 1 {
		return value[:width]
	}
	return value[:width-1] + "."
}

func splitLines(value string) []string {
	value = strings.TrimRight(value, "\n")
	if value == "" {
		return nil
	}
	return strings.Split(value, "\n")
}
