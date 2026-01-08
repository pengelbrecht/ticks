package tui

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"

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
	items     []item
	collapsed map[string]bool
	selected  int
}

// NewModel builds a tree view model from ticks.
func NewModel(ticks []tick.Tick) Model {
	collapsed := make(map[string]bool)
	items := buildItems(ticks, collapsed)
	return Model{items: items, collapsed: collapsed}
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "j", "down":
			if m.selected < len(m.items)-1 {
				m.selected++
			}
		case "k", "up":
			if m.selected > 0 {
				m.selected--
			}
		case " ", "enter":
			if len(m.items) == 0 {
				return m, nil
			}
			current := m.items[m.selected]
			if current.IsEpic && current.HasKids {
				m.collapsed[current.Tick.ID] = !m.collapsed[current.Tick.ID]
				m.items = buildItemsFromState(m.items, m.collapsed)
				if m.selected >= len(m.items) {
					m.selected = len(m.items) - 1
				}
			}
		}
	}
	return m, nil
}

func (m Model) View() string {
	if len(m.items) == 0 {
		return "No ticks\n"
	}

	out := ""
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
		line := fmt.Sprintf("%s %s%s %s  P%d %s\n", cursor, indent, marker, item.Tick.ID, item.Tick.Priority, item.Tick.Title)
		out += line
	}
	return out
}

func buildItems(ticks []tick.Tick, collapsed map[string]bool) []item {
	roots, children := splitRoots(ticks)
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

func buildItemsFromState(current []item, collapsed map[string]bool) []item {
	var ticks []tick.Tick
	seen := make(map[string]bool)
	for _, item := range current {
		if seen[item.Tick.ID] {
			continue
		}
		seen[item.Tick.ID] = true
		ticks = append(ticks, item.Tick)
	}
	return buildItems(ticks, collapsed)
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
