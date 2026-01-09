package tui

import (
	"fmt"
	"strings"

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
}

var (
	headerStyle   = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#F5C2E7"))
	panelStyle    = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(lipgloss.Color("#6C7086")).Padding(0, 1)
	selectedStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#89DCEB")).Bold(true)
	dimStyle      = lipgloss.NewStyle().Foreground(lipgloss.Color("#A6ADC8"))
	footerStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("#7F849C"))
)

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
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
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
			}
		case "j", "down":
			if m.selected < len(m.items)-1 {
				m.selected++
			}
		case "k", "up":
			if m.selected > 0 {
				m.selected--
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
				m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic)
				m.selected = 0
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
	return m, nil
}

func (m Model) View() string {
	if m.width == 0 || m.height == 0 {
		return "Loading...\n"
	}

	out := ""
	if m.searching {
		out += fmt.Sprintf("Search: %s\n\n", m.searchInput)
	} else if m.filter != "" {
		out += fmt.Sprintf("Filter: %s (press / to change)\n\n", m.filter)
	}
	if m.focusedEpic != "" {
		out += fmt.Sprintf("Focus: %s (press z to clear)\n\n", m.focusedEpic)
	}

	if len(m.items) == 0 {
		return out + "No ticks\n"
	}

	list := buildListView(m)
	detail := buildDetailView(m)

	leftWidth := m.width / 2
	if leftWidth < 36 {
		leftWidth = 36
	}
	rightWidth := m.width - leftWidth - 1
	if rightWidth < 28 {
		rightWidth = 28
	}

	panelHeight := m.height - 2
	if panelHeight < 6 {
		panelHeight = 6
	}

	leftPanel := panelStyle.
		Width(leftWidth).
		Height(panelHeight).
		Render(headerStyle.Render("Ticks") + "\n" + list)
	rightPanel := panelStyle.
		Width(rightWidth).
		Height(panelHeight).
		Render(headerStyle.Render("Details") + "\n" + detail)

	footer := footerStyle.Render("j/k or arrows: move  space/enter: fold  z: focus  /: search  esc: clear  q: quit")

	return out + lipgloss.JoinHorizontal(lipgloss.Top, leftPanel, rightPanel) + "\n" + footer + "\n"
}

func buildListView(m Model) string {
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
		line := fmt.Sprintf("%s %s%s %s  P%d %s", cursor, indent, marker, item.Tick.ID, item.Tick.Priority, item.Tick.Title)
		if i == m.selected {
			out += selectedStyle.Render(line) + "\n"
		} else {
			out += dimStyle.Render(line) + "\n"
		}
	}
	return out
}

func buildDetailView(m Model) string {
	if len(m.items) == 0 {
		return ""
	}
	current := m.items[m.selected].Tick
	var out []string
	out = append(out, fmt.Sprintf("%s  P%d %s  %s  @%s", current.ID, current.Priority, current.Type, current.Status, current.Owner))
	out = append(out, current.Title)

	if strings.TrimSpace(current.Description) != "" {
		out = append(out, "")
		out = append(out, headerStyle.Render("Description:"))
		out = append(out, indentLines(current.Description, 2)...)
	}

	if strings.TrimSpace(current.Notes) != "" {
		out = append(out, "")
		out = append(out, headerStyle.Render("Notes:"))
		out = append(out, indentLines(current.Notes, 2)...)
	}

	if len(current.Labels) > 0 {
		out = append(out, "")
		out = append(out, fmt.Sprintf("Labels: %s", strings.Join(current.Labels, ", ")))
	}
	if len(current.BlockedBy) > 0 {
		out = append(out, fmt.Sprintf("Blocked by: %s", strings.Join(current.BlockedBy, ", ")))
	}
	if current.Parent != "" {
		out = append(out, fmt.Sprintf("Parent: %s", current.Parent))
	}
	if current.DiscoveredFrom != "" {
		out = append(out, fmt.Sprintf("Discovered from: %s", current.DiscoveredFrom))
	}

	return strings.Join(out, "\n")
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
