package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// focusZone is the global input focus (§2). The root model routes key messages
// to the child owning the focused zone. Palette is reserved here as a seam for a
// later tick; the foundation never focuses it.
type focusZone int

const (
	focusSidebar focusZone = iota
	focusMain
	focusDetail
	focusPalette // reserved seam — not summoned in the foundation
)

// focusZoneCount is the number of zones Tab cycles through in the foundation
// (sidebar → main → detail). Palette is excluded; it opens via its own key in a
// later tick.
const focusZoneCount = 3

// App is the root model (§2): it owns global focus, terminal size, the active
// scope (selected sidebar node), the active content view, and the view
// registry. It routes Update/View to the focused child and picks the adaptive
// 3/2/1-pane layout by terminal width (§3, layout.go).
type App struct {
	storePath string
	owner     string

	allTicks []tick.Tick
	byID     map[string]tick.Tick

	focus  focusZone
	width  int
	height int

	scope    Scope
	views    *registry
	activeIx int // index into the registry of the active content view

	sidebar Sidebar
	detail  detail

	// detailVisible governs whether the detail pane replaces main in the
	// 2/1-pane layouts (§3). In the 3-pane layout it is always shown.
	detailVisible bool

	watcher *tickWatcher
}

// NewApp builds the root model from the filtered tick set, the store path, and
// the current user. It wires the sidebar, the view registry (List registered),
// and the read-only detail stub.
func NewApp(ticks []tick.Tick, storePath, owner string) App {
	a := App{
		storePath: storePath,
		owner:     owner,
		allTicks:  ticks,
		views:     registerViews(storePath),
		sidebar:   NewSidebar(ticks, owner),
		focus:     focusSidebar,
	}
	a.indexTicks()
	a.scope = a.sidebar.SelectedScope()
	a.watcher = newTickWatcher(storePath)
	a.reScope()
	return a
}

func (a *App) indexTicks() {
	a.byID = make(map[string]tick.Tick, len(a.allTicks))
	for _, t := range a.allTicks {
		a.byID[t.ID] = t
	}
}

// Init satisfies tea.Model; it starts the filesystem watcher if available.
func (a App) Init() tea.Cmd {
	if a.watcher != nil {
		return a.watcher.wait()
	}
	return nil
}

// Close releases the filesystem watcher.
func (a *App) Close() {
	if a.watcher != nil {
		a.watcher.close()
		a.watcher = nil
	}
}

// activeView returns the currently-selected content view.
func (a *App) activeView() View { return a.views.at(a.activeIx) }

// Update routes messages to the focused child and handles global keys (§2).
func (a App) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		a.width = msg.Width
		a.height = msg.Height
		a.applyLayout()
		return a, nil

	case ticksReloadedMsg:
		var cmds []tea.Cmd
		if msg.err == nil && msg.ticks != nil {
			a.allTicks = msg.ticks
			a.indexTicks()
			a.sidebar.SetTicks(a.allTicks)
			a.scope = a.sidebar.SelectedScope()
			a.reScope()
		}
		if a.watcher != nil {
			cmds = append(cmds, a.watcher.wait())
		}
		return a, tea.Batch(cmds...)

	case tea.KeyMsg:
		return a.handleKey(msg)
	}

	return a, nil
}

// handleKey processes a key message: global keys first, then routing to the
// focused child.
func (a App) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "ctrl+c":
		return a, tea.Quit
	case "tab":
		a.focus = focusZone((int(a.focus) + 1) % focusZoneCount)
		a.syncDetailVisibility()
		return a, nil
	case "shift+tab":
		a.focus = focusZone((int(a.focus) - 1 + focusZoneCount) % focusZoneCount)
		a.syncDetailVisibility()
		return a, nil
	}

	// View-switch hotkeys (1..N) work from any zone.
	if n := viewHotkey(msg.String()); n >= 0 && n < a.views.len() {
		a.activeIx = n
		a.reScope()
		return a, nil
	}

	switch a.focus {
	case focusSidebar:
		var changed bool
		a.sidebar, changed = a.sidebar.Update(msg)
		if changed {
			a.scope = a.sidebar.SelectedScope()
			a.reScope()
		}
	case focusMain:
		v, cmd := a.activeView().Update(msg)
		a.views.replace(a.activeIx, v)
		a.syncDetail()
		return a, cmd
	case focusDetail:
		switch msg.String() {
		case "j", "down":
			a.detail.scroll(1)
		case "k", "up":
			a.detail.scroll(-1)
		}
	}
	return a, nil
}

// syncDetailVisibility makes the detail pane appear when the user focuses it in
// the 2/1-pane layouts (§3: Enter/focus swaps content→detail).
func (a *App) syncDetailVisibility() {
	if modeForWidth(a.width) != layoutThree {
		a.detailVisible = a.focus == focusDetail
	}
	a.applyLayout()
}

// viewHotkey maps "1".."9" to a zero-based view index, or -1.
func viewHotkey(s string) int {
	if len(s) == 1 && s[0] >= '1' && s[0] <= '9' {
		return int(s[0] - '1')
	}
	return -1
}

// reScope pushes the active scope and tick set into the active view and the
// sidebar, then refreshes the detail pane.
func (a *App) reScope() {
	if sa, ok := a.activeView().(ScopeAware); ok {
		sa.SetScope(a.scope, a.allTicks)
	}
	a.applyLayout()
	a.syncDetail()
}

// syncDetail points the read-only detail pane at the active view's selected
// tick (§6: detail mirrors the highlighted row).
func (a *App) syncDetail() {
	id := ""
	if sel, ok := a.activeView().(Selector); ok {
		id = sel.SelectedTickID()
	}
	if id == "" {
		a.detail.SetTick(nil)
		return
	}
	if t, ok := a.byID[id]; ok {
		tc := t
		a.detail.SetTick(&tc)
	} else {
		a.detail.SetTick(nil)
	}
}

// applyLayout recomputes pane geometry and pushes sizes into the children (§3).
func (a *App) applyLayout() {
	if a.width == 0 || a.height == 0 {
		return
	}
	mode := modeForWidth(a.width)
	if mode == layoutThree {
		a.detailVisible = true
	}
	l := computeLayout(a.width, a.height, a.detailVisible)

	// Subtract border (2) + padding (2) from each pane's content area.
	if l.sidebar.show {
		a.sidebar.SetSize(l.sidebar.width-4, l.sidebar.height-2)
	}
	if l.main.show {
		if sz, ok := a.activeView().(Sizable); ok {
			sz.SetSize(l.main.width-4, l.main.height-3)
		}
	}
	if l.detail.show {
		a.detail.SetSize(l.detail.width-4, l.detail.height-3)
	}
}

// View renders the adaptive shell (§3): nav │ main │ (detail), with the pane
// count chosen by terminal width.
func (a App) View() string {
	if a.width == 0 || a.height == 0 {
		return "Loading...\n"
	}

	l := computeLayout(a.width, a.height, a.detailVisible)
	var panes []string

	if l.sidebar.show {
		panes = append(panes, a.renderPane(
			"NAV",
			a.sidebar.View(a.focus == focusSidebar),
			l.sidebar, a.focus == focusSidebar))
	}
	if l.main.show {
		v := a.activeView()
		panes = append(panes, a.renderPane(
			a.mainHeader(v),
			v.View(),
			l.main, a.focus == focusMain))
	}
	if l.detail.show {
		panes = append(panes, a.renderPane(
			a.detailHeader(),
			a.detail.View(),
			l.detail, a.focus == focusDetail))
	}

	body := lipgloss.JoinHorizontal(lipgloss.Top, panes...)
	return body + "\n" + a.footer()
}

// mainHeader builds the content-pane header: the view-tab strip (§5).
func (a App) mainHeader(active View) string {
	var tabs []string
	for i := 0; i < a.views.len(); i++ {
		tab := a.views.at(i).Tab()
		if i == a.activeIx {
			tabs = append(tabs, selectedStyle.Render("‹"+tab+"›"))
		} else {
			tabs = append(tabs, dimStyle.Render(tab))
		}
	}
	return strings.Join(tabs, " ")
}

// detailHeader is the detail-pane title (the selected tick's id + title).
func (a App) detailHeader() string {
	if a.detail.tick == nil {
		return "Detail"
	}
	return fmt.Sprintf("%s · %s", a.detail.tick.ID, a.detail.tick.Title)
}

// renderPane frames a pane body with its header in a bordered box.
func (a App) renderPane(header, bodyText string, rect paneRect, focused bool) string {
	style := panelStyle
	if focused {
		style = panelFocusedStyle
	}
	body := headerStyle.Render(truncate(header, rect.width-4)) + "\n" + bodyText
	return style.Width(rect.width - 2).Height(rect.height - 2).Render(body)
}

// footer renders the help/status strip.
func (a App) footer() string {
	hints := []string{
		"tab: focus",
		"j/k: move",
		"1: views",
		"q: quit",
	}
	return footerStyle.Render(strings.Join(hints, "  ·  ")) +
		footerStyle.Render("  ["+a.focusLabel()+"]")
}

func (a App) focusLabel() string {
	switch a.focus {
	case focusSidebar:
		return "nav"
	case focusMain:
		return "main"
	case focusDetail:
		return "detail"
	default:
		return "palette"
	}
}

