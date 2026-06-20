package tui

import (
	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// View is a swappable content view-model for the main pane (§2, §5). Each view
// renders the App's current scope over the shared tick set. Views are small
// Update/View pairs, testable in isolation.
//
// The interface is deliberately minimal so downstream view ticks (Board,
// Roadmap, Timeline) can implement it cheaply and register with one line. It is
// the load-bearing seam every later view tick depends on — change it only with
// care.
type View interface {
	// Update handles a message and returns the (possibly mutated) view plus an
	// optional command. Views are value types: return the updated copy.
	Update(tea.Msg) (View, tea.Cmd)
	// View renders the view body to a string sized to the most recent
	// SetSize call.
	View() string
	// Title is the human-readable view name shown in the content header.
	Title() string
	// Tab is the short label shown in the view-tab strip (e.g. "List").
	Tab() string
}

// Sizable is implemented by views that need to know their content dimensions.
// The App calls SetSize whenever the layout changes. Views that render purely
// from data may ignore size and omit this.
type Sizable interface {
	SetSize(width, height int)
}

// ScopeAware is implemented by views that react to the active sidebar scope and
// the underlying tick set. The App calls SetScope when the selection in the
// sidebar changes or the ticks reload.
type ScopeAware interface {
	SetScope(scope Scope, allTicks []tick.Tick)
}

// Selector is implemented by views that track a "current" tick so the detail
// pane can mirror the highlighted row. Returns "" when nothing is selected.
type Selector interface {
	SelectedTickID() string
}

// registry is the ordered set of views available in the content pane. Order is
// the tab order (keys 1..N).
type registry struct {
	views []View
}

// registerViews builds the content-view registry. THIS IS THE ONE-LINE
// REGISTRATION SEAM (§2): a new view tick appends exactly one line here and is
// otherwise self-contained. Order here is the on-screen tab order and the
// 1..N hotkey order.
//
// To add a view, implement the View interface in a new view_*.go and append:
//
//	reg.add(newBoardView(storePath))
func registerViews(storePath string) *registry {
	reg := &registry{}
	reg.add(newListView(storePath))
	// Downstream view ticks append here, one line each:
	// reg.add(newBoardView(storePath))    // tick: board
	reg.add(newRoadmapView(storePath))  // tick: roadmap
	// reg.add(newTimelineView(storePath)) // tick: timeline
	return reg
}

// add appends a view to the registry.
func (r *registry) add(v View) {
	r.views = append(r.views, v)
}

// at returns the view at index i, clamped into range. Returns nil only when the
// registry is empty (which registerViews never produces).
func (r *registry) at(i int) View {
	if len(r.views) == 0 {
		return nil
	}
	if i < 0 {
		i = 0
	}
	if i >= len(r.views) {
		i = len(r.views) - 1
	}
	return r.views[i]
}

// len returns the number of registered views.
func (r *registry) len() int { return len(r.views) }

// replace stores v back at index i (views are value types; Update returns a
// new copy that must be written back into the registry).
func (r *registry) replace(i int, v View) {
	if i >= 0 && i < len(r.views) {
		r.views[i] = v
	}
}
