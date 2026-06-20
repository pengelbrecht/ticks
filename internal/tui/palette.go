package tui

import (
	"fmt"
	"strconv"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// ── Messages emitted by the palette ──────────────────────────────────────────

// paletteCloseMsg tells the App to close the palette and restore focus.
type paletteCloseMsg struct{}

// paletteJumpMsg tells the App to jump to a specific tick by ID.
type paletteJumpMsg struct{ id string }

// paletteSwitchViewMsg tells the App to switch the main-pane view by registry
// index.
type paletteSwitchViewMsg struct{ viewIndex int }

// paletteEditMsg tells the App to run an EDIT action against the currently
// selected tick via the shared edit funcs (edit.go). The App owns the selection
// and the store path, so the palette only carries the action and any inline
// argument it captured (e.g. a concrete status/priority); free-text actions
// (reassign, add-blocker) carry no value and the App opens the detail inline
// editor instead.
type paletteEditMsg struct {
	action editAction
	value  string // concrete value for set-status/set-priority; else ""
}

// editAction enumerates the palette EDIT actions (§6/§8).
type editAction int

const (
	editActionApprove editAction = iota
	editActionReject
	editActionClose
	editActionReopen
	editActionSetStatus // value carries the target status
	editActionSetPriority
	editActionReassign   // App opens the inline owner editor
	editActionAddBlocker // App opens the inline blocker editor
)

// ── Candidate ────────────────────────────────────────────────────────────────

// candidateKind distinguishes the classes of palette entry.
type candidateKind int

const (
	candidateTickKind candidateKind = iota // jump to a tick/epic/project
	candidateViewKind                      // switch the main-pane view
	candidateEditKind                      // run an edit action on the selection
)

// candidate is one entry in the palette list.
type candidate struct {
	kind      candidateKind
	id        string // tick ID (candidateTickKind only)
	title     string // display title
	viewIndex int    // registry index (candidateViewKind only)

	action editAction // edit action (candidateEditKind only)
	value  string     // edit argument (candidateEditKind only)

	// searchKey is the lowercase string matched against the fuzzy query.
	searchKey string
}

// ── Palette view-model ────────────────────────────────────────────────────────

// palette is the command-palette overlay (§8). It is NOT a View registered in
// the view registry; it is a focus state owned by App (focusPalette). The App
// opens it via Ctrl-K, routes keys to it while focused, and closes it on Esc
// or after a confirmed action.
type palette struct {
	all      []candidate // full unfiltered list
	filtered []candidate // after fuzzy match
	query    string      // current search string
	selected int         // cursor in filtered list

	width  int
	height int
}

// newPalette builds a fresh palette from the current tick set and view registry.
// It is called every time the palette opens so the list is always current.
func newPalette(ticks []tick.Tick, views *registry) palette {
	var all []candidate

	// View-switch actions come first: they are structural actions, high priority.
	for i := 0; i < views.len(); i++ {
		v := views.at(i)
		title := "Switch view → " + v.Title()
		all = append(all, candidate{
			kind:      candidateViewKind,
			title:     title,
			viewIndex: i,
			searchKey: strings.ToLower(title),
		})
	}

	// Edit actions on the currently-selected tick (the App resolves "selected").
	all = append(all, editCandidates()...)

	// Jump targets: every tick/epic in the set, keyed by id + title.
	for _, t := range ticks {
		title := fmt.Sprintf("%s  %s", t.ID, t.Title)
		all = append(all, candidate{
			kind:      candidateTickKind,
			id:        t.ID,
			title:     title,
			searchKey: strings.ToLower(t.ID + " " + t.Title),
		})
	}

	p := palette{all: all}
	p.applyFilter()
	return p
}

// editCandidates builds the fixed set of EDIT-action palette entries. They all
// operate on the App's currently-selected tick; the App calls the shared edit
// funcs (edit.go) when one is confirmed. Status/priority expand to one entry per
// concrete target so the action is a single Enter with no follow-up prompt.
func editCandidates() []candidate {
	var out []candidate
	add := func(title string, a editAction, value string) {
		out = append(out, candidate{
			kind:      candidateEditKind,
			title:     title,
			action:    a,
			value:     value,
			searchKey: strings.ToLower(title),
		})
	}

	add("Approve selected tick", editActionApprove, "")
	add("Reject selected tick", editActionReject, "")
	add("Close selected tick", editActionClose, "")
	add("Reopen selected tick", editActionReopen, "")
	add("Reassign selected tick…", editActionReassign, "")
	add("Add blocker to selected tick…", editActionAddBlocker, "")
	add("Set status → open", editActionSetStatus, tick.StatusOpen)
	add("Set status → in_progress", editActionSetStatus, tick.StatusInProgress)
	add("Set status → closed", editActionSetStatus, tick.StatusClosed)
	for _, p := range []int{0, 1, 2, 3, 4} {
		add(fmt.Sprintf("Set priority → P%d", p), editActionSetPriority, strconv.Itoa(p))
	}
	return out
}

// SetSize records the terminal dimensions so the overlay can be centred.
func (p *palette) SetSize(width, height int) {
	p.width = width
	p.height = height
}

// Update handles key input while the palette is focused. It returns the updated
// palette and an optional command. Recognised keys:
//
//   - Printable rune → append to query; re-filter.
//   - Backspace      → remove last query char; re-filter.
//   - j / down       → move cursor down.
//   - k / up         → move cursor up.
//   - Enter          → confirm; emit jump or switch-view command.
//   - Esc            → close palette with no action.
func (p palette) Update(msg tea.KeyMsg) (palette, tea.Cmd) {
	switch msg.String() {
	case "esc":
		return p, func() tea.Msg { return paletteCloseMsg{} }

	case "enter":
		if len(p.filtered) == 0 {
			return p, func() tea.Msg { return paletteCloseMsg{} }
		}
		c := p.filtered[p.selected]
		switch c.kind {
		case candidateTickKind:
			id := c.id
			return p, func() tea.Msg { return paletteJumpMsg{id: id} }
		case candidateViewKind:
			ix := c.viewIndex
			return p, func() tea.Msg { return paletteSwitchViewMsg{viewIndex: ix} }
		case candidateEditKind:
			act, val := c.action, c.value
			return p, func() tea.Msg { return paletteEditMsg{action: act, value: val} }
		}

	case "j", "down":
		if p.selected < len(p.filtered)-1 {
			p.selected++
		}

	case "k", "up":
		if p.selected > 0 {
			p.selected--
		}

	case "backspace", "ctrl+h":
		if len(p.query) > 0 {
			runes := []rune(p.query)
			p.query = string(runes[:len(runes)-1])
			p.applyFilter()
		}

	default:
		// Append printable runes to the search query.
		if len(msg.Runes) > 0 {
			p.query += string(msg.Runes)
			p.applyFilter()
		}
	}
	return p, nil
}

// applyFilter rebuilds filtered from all using a simple substring fuzzy match
// against each candidate's searchKey. The cursor is reset to 0.
func (p *palette) applyFilter() {
	q := strings.ToLower(p.query)
	p.filtered = nil
	for _, c := range p.all {
		if q == "" || fuzzyMatch(c.searchKey, q) {
			p.filtered = append(p.filtered, c)
		}
	}
	p.selected = 0
}

// fuzzyMatch reports whether every character of query appears in s in order
// (case-insensitive subsequence / "fuzzy" filter).
func fuzzyMatch(s, query string) bool {
	si := 0
	sRunes := []rune(s)
	for _, qr := range query {
		found := false
		for si < len(sRunes) {
			if sRunes[si] == qr {
				si++
				found = true
				break
			}
			si++
		}
		if !found {
			return false
		}
	}
	return true
}

// ── Rendering ─────────────────────────────────────────────────────────────────

// paletteBoxWidth is the total width (including border) of the command-palette
// box. The App reads this when compositing the overlay so the centre offset and
// the box render stay in sync (one source of truth).
const paletteBoxWidth = 60

// paletteBoxStyle is the centred overlay box.
var paletteBoxStyle = lipgloss.NewStyle().
	Border(lipgloss.RoundedBorder()).
	BorderForeground(lipgloss.Color("#a6e3a1")). // Catppuccin green
	Padding(0, 1)

// paletteSelectedStyle highlights the cursor row.
var paletteSelectedStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#a6e3a1")).Bold(true)

// paletteDimStyle is the normal (unselected) row style.
var paletteDimStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#6c7086")) // Catppuccin subtext0

// View renders the palette as a centred floating overlay. The parent App places
// this on top of its own rendered frame.
func (p palette) View() string {
	const boxWidth = paletteBoxWidth
	const maxRows = 12

	// Header: the search prompt.
	prompt := "> " + p.query + "█"
	header := paletteSelectedStyle.Render(prompt)

	// Candidate rows (scrolled so the cursor row stays visible).
	rows := p.filtered
	start := 0
	if p.selected >= maxRows {
		start = p.selected - maxRows + 1
	}
	end := start + maxRows
	if end > len(rows) {
		end = len(rows)
	}
	visible := rows[start:end]

	var lines []string
	lines = append(lines, header)
	// boxWidth includes the border (−2) and Padding(0,1) (−2): the inner text
	// area is boxWidth−4. The rule must match it exactly or it wraps a dangling
	// segment onto the next line.
	lines = append(lines, strings.Repeat("─", boxWidth-4))
	if len(visible) == 0 {
		lines = append(lines, paletteDimStyle.Render("  No matches"))
	}
	for i, c := range visible {
		label := truncate(c.title, boxWidth-6) // −4 inner width, −2 for the "  " indent
		absIdx := start + i
		if absIdx == p.selected {
			lines = append(lines, paletteSelectedStyle.Render("  "+label))
		} else {
			lines = append(lines, paletteDimStyle.Render("  "+label))
		}
	}

	box := paletteBoxStyle.Width(boxWidth - 2).Render(strings.Join(lines, "\n"))
	return box
}
