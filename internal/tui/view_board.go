package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// boardColumn identifies one of the four kanban columns.
type boardColumn int

const (
	colOpen       boardColumn = 0
	colInProgress boardColumn = 1
	colAwaiting   boardColumn = 2
	colClosed     boardColumn = 3
)

// boardColumnCount is the total number of kanban columns.
const boardColumnCount = 4

// boardColumnLabel returns the human-readable header for each column.
func boardColumnLabel(col boardColumn) string {
	switch col {
	case colOpen:
		return "Open"
	case colInProgress:
		return "In Progress"
	case colAwaiting:
		return "Awaiting"
	case colClosed:
		return "Closed"
	default:
		return "?"
	}
}

// boardDragMsg is emitted by the Board view when the user drag-drops a card
// from one column to another. The App's handleKey / Update path receives this
// as a tea.Cmd result. The Board handles it directly in its own Update to go
// through the shared edit write-path.
type boardDragMsg struct {
	tickID    string
	fromCol   boardColumn
	toCol     boardColumn
}

// boardCard is a single card in the kanban grid.
type boardCard struct {
	t   tick.Tick
	col boardColumn // which column this card sits in
	row int         // row within the column (0-based)
}

// boardView is the Board content view (§5 — "Board" tab): a four-column kanban
// with columns Open / In Progress / Awaiting / Closed. The Awaiting column is
// its own lane: any tick where tick.IsAwaitingHuman() goes in the Awaiting
// column regardless of its underlying status (which stays visible via the tick
// glyph). Mouse drag between columns sets status via the shared edit write-path
// (edit.go).
type boardView struct {
	storePath string

	// cards is the flat list of all cards (built by SetScope / SetTicks).
	// Indexed by column for rendering; the selection cursor is an index into
	// cards.
	cards    []boardCard
	selected int // index into cards

	// drag state: non-nil when a drag is in progress.
	drag *boardDragState

	width  int
	height int
}

// boardDragState tracks an in-progress mouse drag.
type boardDragState struct {
	cardIdx int         // index of the card being dragged
	fromCol boardColumn // column the drag started in
}

// newBoardView constructs the Board view. Referenced by the one-line
// registration in registerViews.
func newBoardView(storePath string) View {
	return &boardView{storePath: storePath}
}

func (v *boardView) Title() string { return "Board" }
func (v *boardView) Tab() string   { return "Board" }

// SetSize records the content dimensions.
func (v *boardView) SetSize(width, height int) {
	v.width = width
	v.height = height
}

// SetScope re-scopes the view. allTicks is the full set; scoped is derived via
// FilterScope. The Awaiting column captures any tick where IsAwaitingHuman()
// regardless of its underlying status; all other ticks are grouped by status.
func (v *boardView) SetScope(scope Scope, allTicks []tick.Tick) {
	scoped := FilterScope(allTicks, scope, "")
	v.buildCards(scoped)
}

// SetTicks builds the board from an already-scoped slice (used directly in
// tests).
func (v *boardView) SetTicks(scoped []tick.Tick) {
	v.buildCards(scoped)
}

// buildCards classifies each tick into its column and rebuilds v.cards.
// Column assignment rules:
//  1. IsAwaitingHuman() → Awaiting (regardless of real status).
//  2. StatusClosed → Closed.
//  3. StatusInProgress → In Progress.
//  4. Otherwise → Open.
func (v *boardView) buildCards(ticks []tick.Tick) {
	// Group by column.
	cols := [boardColumnCount][]tick.Tick{}
	for _, t := range ticks {
		col := tickBoardColumn(t)
		cols[col] = append(cols[col], t)
	}

	// Flatten into cards, preserving stable column-row order.
	prevID := v.selectedID()
	v.cards = v.cards[:0]
	for c := boardColumn(0); c < boardColumnCount; c++ {
		for r, t := range cols[c] {
			v.cards = append(v.cards, boardCard{t: t, col: c, row: r})
		}
	}

	// Restore selection by ID; fall back to first card.
	v.selected = 0
	if prevID != "" {
		for i, card := range v.cards {
			if card.t.ID == prevID {
				v.selected = i
				return
			}
		}
	}
}

// tickBoardColumn returns the column a tick belongs in. Awaiting overrides
// everything; otherwise it's determined by status.
func tickBoardColumn(t tick.Tick) boardColumn {
	if t.IsAwaitingHuman() {
		return colAwaiting
	}
	switch t.Status {
	case tick.StatusClosed:
		return colClosed
	case tick.StatusInProgress:
		return colInProgress
	default:
		return colOpen
	}
}

// selectedID returns the ID of the currently selected card, or "".
func (v *boardView) selectedID() string {
	if v.selected >= 0 && v.selected < len(v.cards) {
		return v.cards[v.selected].t.ID
	}
	return ""
}

// SelectedTickID satisfies Selector.
func (v *boardView) SelectedTickID() string { return v.selectedID() }

// Update handles keyboard navigation and mouse drag between columns.
func (v *boardView) Update(msg tea.Msg) (View, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "j", "down":
			v.moveSelection(+1, false)
		case "k", "up":
			v.moveSelection(-1, false)
		case "h", "left":
			v.moveSelection(-1, true)
		case "l", "right":
			v.moveSelection(+1, true)
		case "g", "home":
			v.selected = 0
		case "G", "end":
			if len(v.cards) > 0 {
				v.selected = len(v.cards) - 1
			}
		}

	case tea.MouseMsg:
		return v.handleMouse(msg)

	case boardDragMsg:
		return v.handleDrag(msg)
	}
	return v, nil
}

// moveSelection moves the cursor within the card list. When crossCol is true
// the move tries to jump to the next/previous column; otherwise it steps
// within-column (by card row).
func (v *boardView) moveSelection(delta int, crossCol bool) {
	if len(v.cards) == 0 {
		return
	}
	if crossCol {
		// Jump to the first card in the previous/next column.
		if v.selected < 0 || v.selected >= len(v.cards) {
			v.selected = 0
			return
		}
		cur := v.cards[v.selected]
		targetCol := boardColumn(int(cur.col) + delta)
		if targetCol < 0 || targetCol >= boardColumnCount {
			return
		}
		for i, c := range v.cards {
			if c.col == targetCol {
				v.selected = i
				return
			}
		}
	} else {
		next := v.selected + delta
		if next < 0 {
			next = 0
		}
		if next >= len(v.cards) {
			next = len(v.cards) - 1
		}
		v.selected = next
	}
}

// handleMouse maps mouse press/release events to drag-drop column changes.
// A mouse ButtonLeft press on a card row starts a drag; a release in a
// different column area emits a boardDragMsg. Because teatest goldens use
// tea.MouseMsg, we model this as: press starts drag state, release completes it.
func (v *boardView) handleMouse(msg tea.MouseMsg) (View, tea.Cmd) {
	switch msg.Button {
	case tea.MouseButtonLeft:
		if msg.Action == tea.MouseActionPress {
			// Detect which card (if any) the click lands on.
			cardIdx := v.cardAtPosition(msg.X, msg.Y)
			if cardIdx >= 0 {
				v.selected = cardIdx
				v.drag = &boardDragState{
					cardIdx: cardIdx,
					fromCol: v.cards[cardIdx].col,
				}
			}
		} else if msg.Action == tea.MouseActionRelease {
			if v.drag == nil {
				break
			}
			dr := v.drag
			v.drag = nil
			// Detect target column from X coordinate.
			toColInt := v.columnAtX(msg.X)
			toCol := boardColumn(toColInt)
			if toColInt >= 0 && toCol != dr.fromCol && dr.cardIdx < len(v.cards) {
				id := v.cards[dr.cardIdx].t.ID
				return v, func() tea.Msg {
					return boardDragMsg{
						tickID:  id,
						fromCol: dr.fromCol,
						toCol:   toCol,
					}
				}
			}
		}
	}
	return v, nil
}

// handleDrag applies a drag completion: it calls the appropriate edit func
// to transition the tick's status, then rebuilds the card set from the
// updated in-memory slice.
func (v *boardView) handleDrag(msg boardDragMsg) (View, tea.Cmd) {
	// Map the target column to a status transition using the shared edit funcs.
	var err error
	var updated tick.Tick
	switch msg.toCol {
	case colOpen:
		updated, err = editReopen(v.storePath, "", msg.tickID)
	case colInProgress:
		updated, err = editSetStatus(v.storePath, "", msg.tickID, tick.StatusInProgress)
	case colAwaiting:
		// Moving to the Awaiting column sets status to in_progress with an
		// awaiting flag (AwaitingWork). Since edit.go has no editSetAwaiting,
		// we use editSetStatus to in_progress — the card was already in
		// Awaiting by virtue of IsAwaitingHuman(), so this path is an edge
		// case (user dragging an awaiting tick back to Awaiting). No-op if
		// the tick already IsAwaitingHuman.
		for _, c := range v.cards {
			if c.t.ID == msg.tickID && c.t.IsAwaitingHuman() {
				return v, nil
			}
		}
		updated, err = editSetStatus(v.storePath, "", msg.tickID, tick.StatusInProgress)
	case colClosed:
		updated, err = editClose(v.storePath, "", msg.tickID, "")
	}
	if err != nil || updated.ID == "" {
		return v, nil
	}
	// Patch the in-memory card.
	for i, c := range v.cards {
		if c.t.ID == updated.ID {
			v.cards[i].t = updated
			v.cards[i].col = tickBoardColumn(updated)
			break
		}
	}
	// Rebuild sorted order.
	ticks := make([]tick.Tick, 0, len(v.cards))
	for _, c := range v.cards {
		ticks = append(ticks, c.t)
	}
	v.buildCards(ticks)
	return v, nil
}

// cardAtPosition returns the index into v.cards of the card whose rendered
// position overlaps (x, y), or -1 if none. The calculation mirrors the column
// layout used by View().
func (v *boardView) cardAtPosition(x, y int) int {
	if v.width <= 0 {
		return -1
	}
	col := v.columnAtX(x)
	if col < 0 {
		return -1
	}
	// Each card occupies boardCardHeight lines; y=0 is the header.
	const headerLines = 1
	const cardHeight = 3
	cardRow := (y - headerLines) / cardHeight
	if cardRow < 0 {
		return -1
	}

	// Find the card at (col, cardRow).
	rowInCol := 0
	for i, c := range v.cards {
		if int(c.col) != col {
			continue
		}
		if rowInCol == cardRow {
			return i
		}
		rowInCol++
	}
	return -1
}

// columnAtX maps a pixel X coordinate to a column index (0-3) or -1 if out of
// bounds. Columns are equal-width slices of v.width.
func (v *boardView) columnAtX(x int) int {
	if v.width <= 0 || boardColumnCount == 0 {
		return -1
	}
	colW := v.width / boardColumnCount
	if colW == 0 {
		return -1
	}
	col := x / colW
	if col < 0 {
		col = 0
	}
	if col >= boardColumnCount {
		col = boardColumnCount - 1
	}
	return col
}

// View renders the kanban body: four equal-width columns, each with a header
// and one card per tick. The selected card carries a ">" cursor. Columns are
// joined horizontally with lipgloss.JoinHorizontal.
func (v *boardView) View() string {
	if len(v.cards) == 0 {
		return dimStyle.Render("No ticks in scope")
	}
	if v.width <= 0 {
		return ""
	}

	colW := v.width / boardColumnCount
	if colW < 4 {
		colW = 4
	}

	// Build per-column card slices for lookup.
	colCards := [boardColumnCount][]int{} // indices into v.cards
	for i, c := range v.cards {
		colCards[c.col] = append(colCards[c.col], i)
	}

	// Render each column independently.
	cols := make([]string, boardColumnCount)
	for c := boardColumn(0); c < boardColumnCount; c++ {
		cols[c] = v.renderColumn(c, colCards[c], colW)
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, cols...)
}

// columnHeaderStyle is used for the column title row.
var boardColumnHeaderStyle = lipgloss.NewStyle().Bold(true).Foreground(styles.ColorPurple)

// boardCardBorderStyle draws the card box.
var boardCardBorderStyle = lipgloss.NewStyle().
	Border(lipgloss.NormalBorder()).
	BorderForeground(styles.ColorGray)

// boardCardSelectedStyle highlights the selected card.
var boardCardSelectedStyle = lipgloss.NewStyle().
	Border(lipgloss.NormalBorder()).
	BorderForeground(styles.ColorBlue).
	Bold(true)

// renderColumn renders one column with its header and cards.
func (v *boardView) renderColumn(col boardColumn, cardIdxs []int, colW int) string {
	innerW := colW - 2 // subtract left/right border padding of card box
	if innerW < 2 {
		innerW = 2
	}

	// Header.
	label := boardColumnLabel(col)
	count := len(cardIdxs)
	header := boardColumnHeaderStyle.Render(
		truncate(fmt.Sprintf("%-*s  [%d]", innerW-5, label, count), colW),
	)

	var lines []string
	lines = append(lines, header)

	// Cards.
	for _, idx := range cardIdxs {
		c := v.cards[idx]
		cardText := renderBoardCard(c.t, innerW)
		selected := idx == v.selected
		if selected {
			lines = append(lines, boardCardSelectedStyle.Width(innerW).Render(cardText))
		} else {
			lines = append(lines, boardCardBorderStyle.Width(innerW).Render(cardText))
		}
	}

	return strings.Join(lines, "\n")
}

// renderBoardCard renders the body of a single card (two lines: id+status, title).
// It is a PURE data-to-string renderer taking no global state.
func renderBoardCard(t tick.Tick, width int) string {
	statusIcon := renderBoardStatus(t)
	idLine := fmt.Sprintf("%s %s  %s", t.ID, statusIcon, renderPriority(t.Priority))
	idLine = truncate(idLine, width)
	titleLine := truncate(t.Title, width)
	return idLine + "\n" + titleLine
}

// renderBoardStatus renders the tick's status glyph, with awaiting taking
// priority (so the glyph always reflects the real awaiting state even when the
// tick is in the Awaiting column).
func renderBoardStatus(t tick.Tick) string {
	if t.IsAwaitingHuman() {
		return statusAwaitingStyle.Render(styles.IconAwaiting)
	}
	return renderStatus(t.Status)
}

