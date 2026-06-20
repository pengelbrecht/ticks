package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// smartViewKind identifies one of the fixed five cross-cutting smart views (§4).
type smartViewKind int

const (
	smartAwaiting smartViewKind = iota // ticks gated on the current user
	smartMyTicks                       // owner == me
	smartRoadmap                       // wave/frontier view
	smartActive                        // the ready frontier (workable now)
	smartBacklog                       // everything open and not active
)

// scopeKind distinguishes a smart-view scope from a project-tree-node scope.
type scopeKind int

const (
	scopeSmart scopeKind = iota
	scopeNode
)

// Scope is the App's active selection: either one of the smart views or a node
// in the project tree. Selecting a sidebar row sets the App's Scope, which the
// content views read to decide what set of ticks to show (§4).
type Scope struct {
	Kind  scopeKind
	Smart smartViewKind // valid when Kind == scopeSmart
	Node  string        // tick ID, valid when Kind == scopeNode
}

// smartView is a static descriptor for one smart-view row.
type smartView struct {
	kind  smartViewKind
	label string
	icon  string
}

// the fixed five (§4, resolved decisions: no user-defined views in v1).
var smartViews = []smartView{
	{smartAwaiting, "Awaiting", "◳"},
	{smartMyTicks, "My ticks", "◔"},
	{smartRoadmap, "Roadmap", "⊹"},
	{smartActive, "Active", "◇"},
	{smartBacklog, "Backlog", "▤"},
}

// treeNode is one rendered row of the collapsible project tree.
type treeNode struct {
	id     string
	title  string
	role   query.RoleKind
	depth  int
	hasKid bool
}

// Sidebar is the left navigation pane: two stacked lists (smart views + the
// collapsible project tree). It owns its own selection cursor and collapse
// state; selecting a row yields a Scope via SelectedScope (§4).
type Sidebar struct {
	owner    string
	allTicks []tick.Tick

	// flat list of selectable rows: the smart views first, then the visible
	// (uncollapsed) project-tree nodes.
	rows     []sidebarRow
	selected int

	collapsed map[string]bool
	width     int
	height    int
}

// sidebarRow is a single selectable line: either a smart view or a tree node.
type sidebarRow struct {
	smart   *smartView
	node    *treeNode
	scope   Scope
	awaitN  int // awaiting badge count (smart Awaiting only)
	heading bool
}

// NewSidebar builds the sidebar from the full tick set and the current user.
func NewSidebar(allTicks []tick.Tick, owner string) Sidebar {
	s := Sidebar{
		owner:     owner,
		collapsed: make(map[string]bool),
	}
	s.SetTicks(allTicks)
	return s
}

// SetTicks updates the underlying ticks and rebuilds the row list, preserving
// the current selection by identity where possible.
func (s *Sidebar) SetTicks(allTicks []tick.Tick) {
	s.allTicks = allTicks
	prev := s.SelectedScope()
	s.rebuild()
	s.restoreSelection(prev)
}

// SetSize records the available pane dimensions.
func (s *Sidebar) SetSize(width, height int) {
	s.width = width
	s.height = height
}

// awaitingCount returns the number of ticks gated on the current user (the
// Awaiting badge, §4). It counts ticks awaiting human action; when an owner is
// set it narrows to that owner (ownerless awaiting ticks always count).
func (s *Sidebar) awaitingCount() int {
	n := 0
	for _, t := range s.allTicks {
		if !t.IsAwaitingHuman() {
			continue
		}
		if s.owner != "" && t.Owner != "" && t.Owner != s.owner {
			continue
		}
		n++
	}
	return n
}

// rebuild recomputes the flat row list: the five smart views, a PROJECTS
// heading, then the visible project-tree rows.
func (s *Sidebar) rebuild() {
	rows := make([]sidebarRow, 0, len(smartViews)+len(s.allTicks)+1)

	awaitN := s.awaitingCount()
	for i := range smartViews {
		sv := smartViews[i]
		row := sidebarRow{
			smart: &smartViews[i],
			scope: Scope{Kind: scopeSmart, Smart: sv.kind},
		}
		if sv.kind == smartAwaiting {
			row.awaitN = awaitN
		}
		rows = append(rows, row)
	}

	nodes := s.buildTreeNodes()
	if len(nodes) > 0 {
		rows = append(rows, sidebarRow{heading: true})
		for i := range nodes {
			rows = append(rows, sidebarRow{
				node:  &nodes[i],
				scope: Scope{Kind: scopeNode, Node: nodes[i].id},
			})
		}
	}

	s.rows = rows
	if s.selected >= len(s.rows) {
		s.selected = len(s.rows) - 1
	}
	if s.selected < 0 {
		s.selected = 0
	}
	s.skipNonSelectable(1)
}

// buildTreeNodes walks the project → epic hierarchy (containers and their
// descendants) into a flat, collapse-aware ordered list (§4). Roots are
// container ticks (project/epic/bucket) plus any tick that has children;
// individual leaf ticks with no parent are not shown as their own tree roots
// (they live under the smart views).
func (s *Sidebar) buildTreeNodes() []treeNode {
	index := query.BuildChildIndex(s.allTicks)
	byID := make(map[string]tick.Tick, len(s.allTicks))
	for _, t := range s.allTicks {
		byID[t.ID] = t
	}

	// Roots: container ticks with no container parent in the set. A tick is a
	// tree root if it is a container (has children) and has no parent in the
	// set, or its parent is not itself in the set.
	var roots []tick.Tick
	for _, t := range s.allTicks {
		if len(index[t.ID]) == 0 {
			continue // leaf — not a tree root
		}
		if t.Parent == "" {
			roots = append(roots, t)
			continue
		}
		if _, ok := byID[t.Parent]; !ok {
			roots = append(roots, t)
		}
	}
	query.SortByPriorityCreatedAt(roots)

	var out []treeNode
	var walk func(t tick.Tick, depth int)
	walk = func(t tick.Tick, depth int) {
		childIDs := index[t.ID]
		out = append(out, treeNode{
			id:     t.ID,
			title:  t.Title,
			role:   query.Role(t, index),
			depth:  depth,
			hasKid: len(childIDs) > 0,
		})
		if len(childIDs) == 0 || s.collapsed[t.ID] {
			return
		}
		// Only descend into child containers (the tree is the project → epic
		// spine; leaf ticks belong to the content pane, not the nav tree).
		var childContainers []tick.Tick
		for _, cid := range childIDs {
			if len(index[cid]) > 0 {
				childContainers = append(childContainers, byID[cid])
			}
		}
		query.SortByPriorityCreatedAt(childContainers)
		for _, c := range childContainers {
			walk(c, depth+1)
		}
	}
	for _, r := range roots {
		walk(r, 0)
	}
	return out
}

// SelectedScope returns the Scope for the currently highlighted row. When the
// selection rests on a non-selectable row (heading) or there are no rows, it
// falls back to the Awaiting smart view.
func (s *Sidebar) SelectedScope() Scope {
	if s.selected >= 0 && s.selected < len(s.rows) {
		r := s.rows[s.selected]
		if !r.heading {
			return r.scope
		}
	}
	return Scope{Kind: scopeSmart, Smart: smartAwaiting}
}

// restoreSelection moves the cursor back onto the row matching prev after a
// rebuild, or leaves it clamped if that row is gone.
func (s *Sidebar) restoreSelection(prev Scope) {
	for i, r := range s.rows {
		if r.heading {
			continue
		}
		if r.scope == prev {
			s.selected = i
			return
		}
	}
}

// Update handles navigation and collapse/expand for the sidebar (§4). It moves
// the selection cursor (j/k or arrows), and toggles tree-node collapse on
// space/enter. It returns the updated sidebar and whether the selected scope
// changed (so the App can re-scope the content views).
func (s Sidebar) Update(msg tea.Msg) (Sidebar, bool) {
	prev := s.SelectedScope()
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "j", "down":
			s.moveSelection(1)
		case "k", "up":
			s.moveSelection(-1)
		case "g", "home":
			s.selected = 0
			s.skipNonSelectable(1)
		case "G", "end":
			s.selected = len(s.rows) - 1
			s.skipNonSelectable(-1)
		case " ", "enter":
			s.toggleCollapse()
		}
	}
	return s, s.SelectedScope() != prev
}

// moveSelection shifts the cursor by delta, skipping heading rows.
func (s *Sidebar) moveSelection(delta int) {
	if len(s.rows) == 0 {
		return
	}
	next := s.selected + delta
	for next >= 0 && next < len(s.rows) {
		if !s.rows[next].heading {
			s.selected = next
			return
		}
		next += delta
	}
}

// skipNonSelectable nudges the cursor off a heading row in the given direction
// (+1 forward, -1 backward), clamping into range.
func (s *Sidebar) skipNonSelectable(dir int) {
	if len(s.rows) == 0 {
		s.selected = 0
		return
	}
	if s.selected < 0 {
		s.selected = 0
	}
	if s.selected >= len(s.rows) {
		s.selected = len(s.rows) - 1
	}
	for s.selected >= 0 && s.selected < len(s.rows) && s.rows[s.selected].heading {
		s.selected += dir
	}
	if s.selected < 0 {
		s.selected = 0
		for s.selected < len(s.rows) && s.rows[s.selected].heading {
			s.selected++
		}
	}
	if s.selected >= len(s.rows) {
		s.selected = len(s.rows) - 1
	}
}

// toggleCollapse flips the collapse state of the selected tree node (no-op for
// smart views or leaf nodes), then rebuilds the visible rows.
func (s *Sidebar) toggleCollapse() {
	if s.selected < 0 || s.selected >= len(s.rows) {
		return
	}
	r := s.rows[s.selected]
	if r.node == nil || !r.node.hasKid {
		return
	}
	id := r.node.id
	s.collapsed[id] = !s.collapsed[id]
	s.rebuild()
	// Keep the cursor on the same node after the rebuild.
	for i, row := range s.rows {
		if row.node != nil && row.node.id == id {
			s.selected = i
			break
		}
	}
}

// View renders the sidebar body (§4). focused controls the selection highlight.
func (s Sidebar) View(focused bool) string {
	var b strings.Builder

	b.WriteString(sidebarSectionStyle.Render("VIEWS"))
	b.WriteString("\n")
	for i, r := range s.rows {
		if r.heading {
			b.WriteString("\n")
			b.WriteString(sidebarSectionStyle.Render("PROJECTS"))
			b.WriteString("\n")
			continue
		}
		b.WriteString(s.renderRow(i, r, focused))
		b.WriteString("\n")
	}
	return strings.TrimRight(b.String(), "\n")
}

// renderRow renders a single sidebar row (smart view or tree node).
func (s Sidebar) renderRow(i int, r sidebarRow, focused bool) string {
	var line string
	if r.smart != nil {
		label := r.smart.label
		if r.smart.kind == smartAwaiting && r.awaitN > 0 {
			label = fmt.Sprintf("%s (%d)", label, r.awaitN)
		}
		line = fmt.Sprintf(" %s %s", r.smart.icon, label)
	} else if r.node != nil {
		marker := " "
		if r.node.hasKid {
			if s.collapsed[r.node.id] {
				marker = "▸"
			} else {
				marker = "▾"
			}
		}
		indent := strings.Repeat("  ", r.node.depth)
		line = fmt.Sprintf(" %s%s %s", indent, marker, r.node.title)
	}

	line = truncate(line, s.width)
	if i == s.selected {
		if focused {
			return sidebarSelectedStyle.Render(line)
		}
		return selectedStyle.Render(line)
	}
	return dimStyle.Render(line)
}

// FilterScope filters allTicks to the set a content view should render for the
// given scope (§4–§5). Smart views are cross-cutting queries; a tree node scopes
// to that node's subtree (the node plus its descendants).
func FilterScope(allTicks []tick.Tick, scope Scope, owner string) []tick.Tick {
	switch scope.Kind {
	case scopeSmart:
		return filterSmart(allTicks, scope.Smart, owner)
	case scopeNode:
		return subtree(allTicks, scope.Node)
	}
	return allTicks
}

// filterSmart applies one smart-view query to the tick set (§4).
func filterSmart(allTicks []tick.Tick, kind smartViewKind, owner string) []tick.Tick {
	switch kind {
	case smartAwaiting:
		var out []tick.Tick
		for _, t := range allTicks {
			if t.IsAwaitingHuman() && (owner == "" || t.Owner == "" || t.Owner == owner) {
				out = append(out, t)
			}
		}
		return out
	case smartMyTicks:
		var out []tick.Tick
		for _, t := range allTicks {
			if owner != "" && t.Owner == owner {
				out = append(out, t)
			}
		}
		return out
	case smartActive:
		return query.Ready(allTicks, allTicks)
	case smartBacklog:
		ready := make(map[string]bool)
		for _, t := range query.Ready(allTicks, allTicks) {
			ready[t.ID] = true
		}
		var out []tick.Tick
		for _, t := range allTicks {
			if t.Status != tick.StatusClosed && !ready[t.ID] {
				out = append(out, t)
			}
		}
		return out
	case smartRoadmap:
		// The Roadmap smart view scopes to all epics; the dedicated Roadmap
		// content view (later tick) renders the wave layout. For now the List
		// view shows the full set.
		return allTicks
	}
	return allTicks
}

// subtree returns the tick with id root plus all of its descendants.
func subtree(allTicks []tick.Tick, root string) []tick.Tick {
	index := query.BuildChildIndex(allTicks)
	byID := make(map[string]tick.Tick, len(allTicks))
	for _, t := range allTicks {
		byID[t.ID] = t
	}
	keep := make(map[string]bool)
	var mark func(id string)
	mark = func(id string) {
		if keep[id] {
			return
		}
		keep[id] = true
		for _, c := range index[id] {
			mark(c)
		}
	}
	mark(root)
	var out []tick.Tick
	for _, t := range allTicks {
		if keep[t.ID] {
			out = append(out, t)
		}
	}
	return out
}

// Sidebar-specific styles.
var (
	sidebarSectionStyle  = lipgloss.NewStyle().Bold(true).Foreground(styles.ColorDim)
	sidebarSelectedStyle = lipgloss.NewStyle().Foreground(styles.ColorBlue).Bold(true)
)
