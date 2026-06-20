package tui

import (
	"fmt"
	"strconv"
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
	pal     palette // command palette overlay (§8); open via Ctrl-K

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
		detail:    newDetail(storePath, owner),
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

	// ── Palette messages ───────────────────────────────────────────────────
	case paletteCloseMsg:
		a.focus = focusMain
		return a, nil

	case paletteJumpMsg:
		// Jump: move the active view's selection to the target tick, then close.
		// JumpTo is implemented by views that support direct cursor placement
		// (e.g. listView). Views that don't implement it simply stay put.
		if jv, ok := a.activeView().(interface{ JumpTo(string) }); ok {
			jv.JumpTo(msg.id)
		}
		a.syncDetail()
		a.focus = focusMain
		return a, nil

	case paletteSwitchViewMsg:
		if msg.viewIndex >= 0 && msg.viewIndex < a.views.len() {
			a.activeIx = msg.viewIndex
			a.reScope()
		}
		a.focus = focusMain
		return a, nil

	case paletteEditMsg:
		return a.handlePaletteEdit(msg)
	}

	return a, nil
}

// handlePaletteEdit runs an EDIT action from the command palette against the
// currently-selected tick, going through the shared edit funcs (edit.go) so the
// tracker stays the source of truth. Free-text actions (reassign, add-blocker)
// instead focus the detail pane and open its inline editor for the relevant
// field. After a write it mirrors the persisted tick into shared state.
func (a App) handlePaletteEdit(msg paletteEditMsg) (tea.Model, tea.Cmd) {
	id := ""
	if sel, ok := a.activeView().(Selector); ok {
		id = sel.SelectedTickID()
	}
	if id == "" {
		a.focus = focusMain
		return a, nil
	}

	switch msg.action {
	case editActionReassign:
		// Open the inline owner editor in the detail pane.
		return a.openDetailEdit(id, fieldOwner), nil
	case editActionAddBlocker:
		// Open the free-text blocker prompt in the detail pane.
		if t, ok := a.byID[id]; ok {
			tc := t
			a.detail.SetTick(&tc)
		}
		a.focus = focusDetail
		a.syncDetailVisibility()
		a.detail.beginAddBlocker()
		return a, nil
	}

	var (
		t   tick.Tick
		err error
	)
	switch msg.action {
	case editActionApprove:
		t, _, err = editApprove(a.storePath, a.owner, id)
	case editActionReject:
		t, _, err = editReject(a.storePath, a.owner, id, "")
	case editActionClose:
		t, err = editClose(a.storePath, a.owner, id, "")
	case editActionReopen:
		t, err = editReopen(a.storePath, a.owner, id)
	case editActionSetStatus:
		t, err = editSetStatus(a.storePath, a.owner, id, msg.value)
	case editActionSetPriority:
		p, _ := strconv.Atoi(msg.value)
		t, err = editSetPriority(a.storePath, a.owner, id, p)
	}

	a.focus = focusMain
	if err == nil && t.ID != "" {
		a.mirrorEditedTick(t)
	}
	return a, nil
}

// openDetailEdit focuses the detail pane on the given tick and starts an inline
// edit of the named field (used by palette free-text actions like reassign).
func (a App) openDetailEdit(id string, f editableField) App {
	if t, ok := a.byID[id]; ok {
		tc := t
		a.detail.SetTick(&tc)
	}
	a.focus = focusDetail
	a.syncDetailVisibility()
	// Position the field cursor and open its editor.
	for i, ef := range editableFields {
		if ef == f {
			a.detail.fieldIdx = i
			break
		}
	}
	a.detail.beginEdit()
	return a
}

// mirrorEditedTick syncs a persisted tick into allTicks/byID, the sidebar, the
// active view, and the detail pane so the whole shell reflects the edit without
// waiting for the filesystem watcher.
func (a *App) mirrorEditedTick(t tick.Tick) {
	for i := range a.allTicks {
		if a.allTicks[i].ID == t.ID {
			a.allTicks[i] = t
			break
		}
	}
	a.indexTicks()
	a.sidebar.SetTicks(a.allTicks)
	a.scope = a.sidebar.SelectedScope()
	a.reScope()
}

// handleKey processes a key message: global keys first, then routing to the
// focused child.
func (a App) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// While the palette is open, route all keys to it and handle its outputs.
	if a.focus == focusPalette {
		var cmd tea.Cmd
		a.pal, cmd = a.pal.Update(msg)
		return a, cmd
	}

	// While an inline detail edit is in progress, the textinput owns every key
	// (including q/tab/digits): route them to the detail pane verbatim so typing
	// does not trigger global bindings.
	if a.focus == focusDetail && a.detail.editing {
		var cmd tea.Cmd
		a.detail, cmd, _ = a.detail.Update(msg)
		a.afterDetailEdit()
		return a, cmd
	}

	switch msg.String() {
	case "q", "ctrl+c":
		return a, tea.Quit
	case "ctrl+k":
		// Open the palette: build a fresh candidate list and focus the overlay.
		a.pal = newPalette(a.allTicks, a.views)
		a.pal.SetSize(a.width, a.height)
		a.focus = focusPalette
		return a, nil
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
		// Adaptive detail (§6): in the 2/1-pane layouts Enter on the main pane
		// swaps it out for the detail pane (and Esc in detail returns). In the
		// 3-pane layout the detail is always a peek, so Enter falls through to
		// the view (e.g. fold an epic).
		if msg.String() == "enter" && modeForWidth(a.width) != layoutThree {
			a.focus = focusDetail
			a.syncDetailVisibility()
			return a, nil
		}
		v, cmd := a.activeView().Update(msg)
		a.views.replace(a.activeIx, v)
		a.syncDetail()
		return a, cmd
	case focusDetail:
		d, cmd, consumed := a.detail.Update(msg)
		a.detail = d
		if consumed {
			a.afterDetailEdit()
			return a, cmd
		}
		// The detail pane did not handle the key. In the 2/1-pane layouts Esc
		// swaps back to the main pane (return-from-detail); in the 3-pane peek
		// Esc is a no-op here.
		if msg.String() == "esc" && modeForWidth(a.width) != layoutThree {
			a.focus = focusMain
			a.syncDetailVisibility()
		}
		return a, cmd
	}
	return a, nil
}

// afterDetailEdit syncs an inline detail edit back into the App's shared state:
// the detail pane re-reads the persisted tick into a.detail.tick, so we mirror
// that copy into allTicks/byID and re-scope the views so the list reflects the
// change immediately (without waiting for the filesystem watcher).
func (a *App) afterDetailEdit() {
	t := a.detail.tick
	if t == nil {
		return
	}
	found := false
	for i := range a.allTicks {
		if a.allTicks[i].ID == t.ID {
			a.allTicks[i] = *t
			found = true
			break
		}
	}
	if !found {
		return
	}
	a.indexTicks()
	a.sidebar.SetTicks(a.allTicks)
	if sa, ok := a.activeView().(ScopeAware); ok {
		sa.SetScope(a.scope, a.allTicks)
	}
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
	frame := body + "\n" + a.footer()

	// When the palette is open, render it as a floating overlay centred within
	// the shell frame. lipgloss.Place places the overlay at the top-centre of
	// the terminal area, keeping total height stable (no extra lines).
	if a.focus == focusPalette {
		overlay := a.pal.View()
		frame = lipgloss.Place(a.width, a.height, lipgloss.Center, lipgloss.Top,
			overlay,
			lipgloss.WithWhitespaceChars(""),
		) + "\n" + a.footer()
	}
	return frame
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

// footer renders the help/status strip. When the detail pane is focused it
// advertises the inline-edit keys instead of the navigation set.
func (a App) footer() string {
	var hints []string
	switch {
	case a.focus == focusDetail && a.detail.editing:
		hints = []string{"enter: save", "esc: cancel"}
	case a.focus == focusDetail:
		hints = []string{"n/p: field", "e: edit", "esc: back", "ctrl+k: palette", "q: quit"}
	default:
		hints = []string{"tab: focus", "j/k: move", "1: views", "ctrl+k: palette", "q: quit"}
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

