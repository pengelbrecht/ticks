package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// listView is the default content view (§5): the grouped/indented tree render
// ported out of model.go. It is the workhorse view and the first one wired into
// the registry.
//
// It owns its own selection cursor and collapse state over the scoped tick set.
// The App calls SetScope to re-scope it and SetSize to resize it; SelectedTickID
// drives the detail pane.
type listView struct {
	storePath string

	allTicks []tick.Tick // full set (for blocked detection)
	items    []item      // scoped, flattened rows

	collapsed map[string]bool
	selected  int

	width  int
	height int
}

// newListView constructs the List view. This is the constructor referenced by
// the one-line registration in registerViews.
func newListView(storePath string) View {
	return &listView{
		storePath: storePath,
		collapsed: make(map[string]bool),
	}
}

func (v *listView) Title() string { return "List" }
func (v *listView) Tab() string   { return "List" }

// SetSize records the content dimensions.
func (v *listView) SetSize(width, height int) {
	v.width = width
	v.height = height
}

// SetScope re-scopes the view to scoped (the ticks the sidebar selection
// resolves to) while keeping allTicks for blocked-status lookups.
func (v *listView) SetScope(scope Scope, allTicks []tick.Tick) {
	v.allTicks = allTicks
	scoped := FilterScope(allTicks, scope, "")
	prevID := v.SelectedTickID()
	v.items = buildListItems(scoped, v.collapsed)
	v.restoreSelection(prevID)
}

// SetTicks is used directly in tests and by the App when ticks reload without a
// scope change; it rebuilds from the given (already-scoped) set.
func (v *listView) SetTicks(scoped, allTicks []tick.Tick) {
	v.allTicks = allTicks
	prevID := v.SelectedTickID()
	v.items = buildListItems(scoped, v.collapsed)
	v.restoreSelection(prevID)
}

func (v *listView) restoreSelection(id string) {
	v.selected = 0
	if id == "" {
		return
	}
	for i, it := range v.items {
		if it.Tick.ID == id {
			v.selected = i
			return
		}
	}
	if v.selected >= len(v.items) {
		v.selected = len(v.items) - 1
	}
	if v.selected < 0 {
		v.selected = 0
	}
}

// SelectedTickID returns the highlighted tick's ID (or "" when empty).
func (v *listView) SelectedTickID() string {
	if v.selected >= 0 && v.selected < len(v.items) {
		return v.items[v.selected].Tick.ID
	}
	return ""
}

// JumpTo moves the list selection to the item with the given tick ID. If the
// tick is not in the current scope the cursor stays at its previous position.
// This implements the JumpTo seam consumed by App.handlePaletteJump.
func (v *listView) JumpTo(id string) {
	for i, it := range v.items {
		if it.Tick.ID == id {
			v.selected = i
			return
		}
	}
	// Target not in current scope: expand all epics and retry so a jump from
	// the palette can reach collapsed children.
	for k := range v.collapsed {
		v.collapsed[k] = false
	}
	scoped := itemsToTicks(v.items)
	v.items = buildListItems(scoped, v.collapsed)
	for i, it := range v.items {
		if it.Tick.ID == id {
			v.selected = i
			return
		}
	}
}

// Update handles list navigation and collapse/expand (ported from model.go's
// tree handling).
func (v *listView) Update(msg tea.Msg) (View, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "j", "down":
			if v.selected < len(v.items)-1 {
				v.selected++
			}
		case "k", "up":
			if v.selected > 0 {
				v.selected--
			}
		case "g", "home":
			v.selected = 0
		case "G", "end":
			if len(v.items) > 0 {
				v.selected = len(v.items) - 1
			}
		case " ", "enter":
			v.toggleCollapse()
		}
	}
	return v, nil
}

// toggleCollapse folds/unfolds the selected epic row, preserving cursor.
func (v *listView) toggleCollapse() {
	if v.selected < 0 || v.selected >= len(v.items) {
		return
	}
	cur := v.items[v.selected]
	if !(cur.IsEpic && cur.HasKids) {
		return
	}
	v.collapsed[cur.Tick.ID] = !v.collapsed[cur.Tick.ID]
	// Rebuild from the currently-scoped roots/children: reconstruct the scoped
	// set from the existing items (they are the current scope, pre-fold).
	scoped := itemsToTicks(v.items)
	v.items = buildListItems(scoped, v.collapsed)
	if v.selected >= len(v.items) {
		v.selected = len(v.items) - 1
	}
	if v.selected < 0 {
		v.selected = 0
	}
}

// View renders the list body (ported from buildListContent), scrolled so the
// selected row stays visible within the content height.
func (v *listView) View() string {
	if len(v.items) == 0 {
		return dimStyle.Render("No ticks in scope")
	}

	lines := make([]string, 0, len(v.items))
	for i, it := range v.items {
		cursor := " "
		if i == v.selected {
			cursor = ">"
		}
		indent := strings.Repeat("  ", it.Depth)
		marker := " "
		if it.IsEpic && it.HasKids {
			if v.collapsed[it.Tick.ID] {
				marker = "+"
			} else {
				marker = "-"
			}
		}
		statusIcon := v.renderStatusIcon(it.Tick)
		line := fmt.Sprintf("%s %s%s %s  %s %s %s",
			cursor, indent, marker, it.Tick.ID, statusIcon, renderPriority(it.Tick.Priority), it.Tick.Title)
		line = truncate(line, v.width)
		if i == v.selected {
			lines = append(lines, selectedStyle.Render(line))
		} else {
			lines = append(lines, dimStyle.Render(line))
		}
	}

	return strings.Join(v.scrollWindow(lines), "\n")
}

// scrollWindow returns the slice of lines visible given the content height,
// keeping the selected row in view.
func (v *listView) scrollWindow(lines []string) []string {
	h := v.height
	if h <= 0 || len(lines) <= h {
		return lines
	}
	top := v.selected - h/2
	if top < 0 {
		top = 0
	}
	if top+h > len(lines) {
		top = len(lines) - h
	}
	return lines[top : top+h]
}

// renderStatusIcon mirrors Model.renderTickStatusIcon: awaiting → blocked →
// status, using the full tick set for blocked detection.
func (v *listView) renderStatusIcon(t tick.Tick) string {
	if t.IsAwaitingHuman() {
		return statusAwaitingStyle.Render(styles.IconAwaiting)
	}
	if t.Status == tick.StatusOpen && v.isBlocked(t) {
		return statusBlockedStyle.Render(styles.IconBlocked)
	}
	return renderStatus(t.Status)
}

func (v *listView) isBlocked(t tick.Tick) bool {
	if len(t.BlockedBy) == 0 {
		return false
	}
	open := make(map[string]bool)
	for _, x := range v.allTicks {
		if x.Status != tick.StatusClosed {
			open[x.ID] = true
		}
	}
	for _, b := range t.BlockedBy {
		if open[b] {
			return true
		}
	}
	return false
}

// buildListItems flattens scoped ticks into the indented item list used by the
// List view (ported from model.buildItems, sans the cross-cutting filters which
// now live in the sidebar scope). Roots are sorted by priority/created-at; epics
// with children honor the collapse map.
func buildListItems(scoped []tick.Tick, collapsed map[string]bool) []item {
	roots, children := splitRoots(scoped)
	query.SortByPriorityCreatedAt(roots)

	items := make([]item, 0, len(scoped))
	for _, root := range roots {
		kids := children[root.ID]
		query.SortByPriorityCreatedAt(kids)
		items = append(items, item{
			Tick:    root,
			Depth:   0,
			IsEpic:  root.Type == tick.TypeEpic,
			HasKids: len(kids) > 0,
		})
		if root.Type == tick.TypeEpic && len(kids) > 0 && collapsed[root.ID] {
			continue
		}
		for _, child := range kids {
			items = append(items, item{
				Tick:    child,
				Depth:   1,
				IsEpic:  child.Type == tick.TypeEpic,
				HasKids: len(children[child.ID]) > 0,
			})
		}
	}
	return items
}

// itemsToTicks recovers the scoped tick slice from a flattened item list (used
// when re-folding without re-scoping).
func itemsToTicks(items []item) []tick.Tick {
	out := make([]tick.Tick, 0, len(items))
	for _, it := range items {
		out = append(out, it.Tick)
	}
	return out
}
