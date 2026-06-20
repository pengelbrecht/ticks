package tui

import (
	"strings"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// jumpToEpicMsg is emitted by the Roadmap view when the user presses Enter on a
// selected epic. The App (or a later handler tick) listens for this message and
// navigates the sidebar/List view to the named epic, clearing any scope that
// would hide it. This is the view-model equivalent of the old model.go
// jumpToRoadmapEpic: instead of mutating a monolith, the view emits a message
// and lets the root decide what to do.
type jumpToEpicMsg struct {
	EpicID string
}

// roadmapView is the Roadmap content view (§5 — "Roadmap" tab). It wraps the
// pure renderer in roadmap.go behind the View/Sizable/ScopeAware/Selector
// interfaces so the App can manage it like any other view-model.
//
// Selection moves wave-by-wave through roadmapEpicOrder (same order the
// renderer draws them); Enter emits jumpToEpicMsg so the App can jump the
// sidebar/List to the chosen epic.
type roadmapView struct {
	storePath string

	allTicks []tick.Tick // scoped tick set (set by SetScope)

	// epicIDs is the wave-ordered sequence of epic IDs (from roadmapEpicOrder).
	// The selection cursor indexes into this slice.
	epicIDs  []string
	selected int // index into epicIDs

	width  int
	height int
}

// newRoadmapView constructs the Roadmap view. This is the constructor
// referenced by the one-line registration in registerViews.
func newRoadmapView(storePath string) View {
	return &roadmapView{storePath: storePath}
}

func (v *roadmapView) Title() string { return "Roadmap" }
func (v *roadmapView) Tab() string   { return "Roadmap" }

// SetSize records the content dimensions for scroll-window use.
func (v *roadmapView) SetSize(width, height int) {
	v.width = width
	v.height = height
}

// SetScope re-scopes the view. For the Roadmap, scope narrows the tick set:
// ComputeRoadmap only sees epics (and their children) in the scoped set, so
// selecting a project in the sidebar narrows the roadmap to that project's
// epics. After re-scoping, the epic list is rebuilt and the previous selection
// is preserved by ID (falls back to first on removal, matching
// syncRoadmapSelection behaviour).
func (v *roadmapView) SetScope(scope Scope, allTicks []tick.Tick) {
	scoped := FilterScope(allTicks, scope, "")
	prevID := v.selectedEpicID()
	v.allTicks = scoped
	v.rebuildEpicIDs(prevID)
}

// SelectedTickID satisfies Selector: returns the currently highlighted epic ID
// so the detail pane can mirror it. Returns "" when no epics exist.
func (v *roadmapView) SelectedTickID() string {
	return v.selectedEpicID()
}

// selectedEpicID returns the ID of the currently selected epic, or "".
func (v *roadmapView) selectedEpicID() string {
	if v.selected >= 0 && v.selected < len(v.epicIDs) {
		return v.epicIDs[v.selected]
	}
	return ""
}

// rebuildEpicIDs rebuilds the wave-ordered epic list from the current allTicks,
// restoring the selection to prevID when possible (falls back to first epic).
func (v *roadmapView) rebuildEpicIDs(prevID string) {
	v.epicIDs = roadmapEpicOrder(v.allTicks)
	v.selected = 0
	for i, id := range v.epicIDs {
		if id == prevID {
			v.selected = i
			return
		}
	}
}

// Update handles roadmap navigation and Enter (jump).
//
// j/down and k/up step the cursor wave-by-wave through the epic list (the same
// order RenderRoadmapWithSelection draws them, so the cursor always matches the
// highlighted line). Enter emits jumpToEpicMsg for the selected epic.
func (v *roadmapView) Update(msg tea.Msg) (View, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "j", "down":
			if v.selected < len(v.epicIDs)-1 {
				v.selected++
			}
		case "k", "up":
			if v.selected > 0 {
				v.selected--
			}
		case "g", "home":
			v.selected = 0
		case "G", "end":
			if len(v.epicIDs) > 0 {
				v.selected = len(v.epicIDs) - 1
			}
		case "enter":
			if id := v.selectedEpicID(); id != "" {
				id := id // capture for closure
				return v, func() tea.Msg { return jumpToEpicMsg{EpicID: id} }
			}
		}
	}
	return v, nil
}

// View renders the roadmap body, scrolled so the selected epic is visible
// within the content height. It delegates entirely to the shared pure renderer
// RenderRoadmapWithSelection (roadmap.go).
func (v *roadmapView) View() string {
	if len(v.allTicks) == 0 {
		return dimStyle.Render("No ticks in scope")
	}

	content, selectedLine := RenderRoadmapWithSelection(v.allTicks, v.width, v.selectedEpicID())

	// No epics in the scoped set — return the renderer's empty message.
	if len(v.epicIDs) == 0 {
		return content
	}

	// Scroll window: keep the selected epic line in view.
	return v.scrollContent(content, selectedLine)
}

// scrollContent clips the rendered content to v.height lines, keeping the
// selectedLine in view. When height is not set (0) or all content fits, the
// full content is returned unchanged.
func (v *roadmapView) scrollContent(content string, selectedLine int) string {
	h := v.height
	lines := strings.Split(content, "\n")
	if h <= 0 || len(lines) <= h {
		return content
	}
	if selectedLine < 0 {
		return strings.Join(lines[:h], "\n")
	}

	top := selectedLine - h/2
	if top < 0 {
		top = 0
	}
	if top+h > len(lines) {
		top = len(lines) - h
	}
	return strings.Join(lines[top:top+h], "\n")
}
