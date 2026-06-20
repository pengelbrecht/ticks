package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// detail is the right-hand pane (§6): it renders the highlighted tick and, when
// focused, supports inline field edits that write THROUGH the shared store
// edit funcs (edit.go) — the tracker stays the source of truth.
//
// Adaptive behaviour (§6) is owned by App via the layout/focus seam: in the
// 3-pane layout this pane is a read-along "peek"; in the 2-pane layout Enter
// swaps the main pane out for this one (and Esc returns); in the 1-pane layout
// it takes the full screen. This view-model is layout-agnostic — it just
// renders/edits the current tick.
//
// Inline editing: with the pane focused and not already editing, the user
// cycles the editable field with n/p (next/prev) and presses e or Enter to
// edit. Status and priority cycle in place (Enter/space advances the value and
// writes immediately). Owner, parent, labels and target_date open a textinput;
// Enter commits, Esc cancels. Every commit calls a shared edit func, which
// re-reads the tick, applies one change, and persists via Store.WriteAs.
type detail struct {
	tick      *tick.Tick
	storePath string
	owner     string

	width   int
	height  int
	yOffset int

	// editing field state.
	fieldIdx int  // index into editableFields; the highlighted field
	editing  bool // a textinput edit is in progress
	input    textinput.Model

	// addingBlocker is true when the in-progress edit is a free-text "add
	// blocker" prompt (driven from the command palette) rather than one of the
	// inline cycle fields. On commit it appends the value as a blocker.
	addingBlocker bool

	// statusMsg is a transient line shown under the metadata after an edit
	// (success or error). Cleared on the next selection change.
	statusMsg string
	statusErr bool
}

// editableField identifies an inline-editable metadata field (§6). The order
// here is the n/p cycle order.
type editableField int

const (
	fieldStatus editableField = iota
	fieldPriority
	fieldOwner
	fieldParent
	fieldLabels
	fieldTargetDate
)

// editableFields is the cycle order for the inline field selector.
var editableFields = []editableField{
	fieldStatus, fieldPriority, fieldOwner, fieldParent, fieldLabels, fieldTargetDate,
}

// statusCycle is the order status edits advance through.
var statusCycle = []string{tick.StatusOpen, tick.StatusInProgress, tick.StatusClosed}

func (f editableField) label() string {
	switch f {
	case fieldStatus:
		return "Status"
	case fieldPriority:
		return "Priority"
	case fieldOwner:
		return "Owner"
	case fieldParent:
		return "Parent"
	case fieldLabels:
		return "Labels"
	case fieldTargetDate:
		return "Target"
	default:
		return ""
	}
}

// newDetail constructs a detail pane bound to a store path and the current
// owner (used as the activity actor on edits).
func newDetail(storePath, owner string) detail {
	ti := textinput.New()
	ti.CharLimit = 200
	ti.Width = 30
	return detail{storePath: storePath, owner: owner, input: ti}
}

// SetSize records the pane dimensions.
func (d *detail) SetSize(width, height int) {
	d.width = width
	d.height = height
	d.input.Width = width - 12
	if d.input.Width < 8 {
		d.input.Width = 8
	}
}

// SetTick points the detail pane at a tick (nil clears it). A new selection
// resets scrolling, the field cursor, any in-progress edit, and the status line.
func (d *detail) SetTick(t *tick.Tick) {
	if t == nil || d.tick == nil || t.ID != d.tick.ID {
		d.yOffset = 0
		d.fieldIdx = 0
		d.cancelEdit()
		d.statusMsg = ""
		d.statusErr = false
	}
	d.tick = t
}

// scroll moves the detail viewport by delta lines (clamped at the top).
func (d *detail) scroll(delta int) {
	d.yOffset += delta
	if d.yOffset < 0 {
		d.yOffset = 0
	}
}

// activeField returns the currently-highlighted editable field.
func (d *detail) activeField() editableField {
	if d.fieldIdx < 0 || d.fieldIdx >= len(editableFields) {
		return fieldStatus
	}
	return editableFields[d.fieldIdx]
}

// cycleField moves the field selector by delta (wrapping).
func (d *detail) cycleField(delta int) {
	n := len(editableFields)
	d.fieldIdx = ((d.fieldIdx+delta)%n + n) % n
}

// cancelEdit blurs and clears any in-progress textinput edit.
func (d *detail) cancelEdit() {
	d.editing = false
	d.addingBlocker = false
	d.input.Blur()
	d.input.SetValue("")
}

// beginAddBlocker opens a free-text prompt to append a blocker id (palette
// action; not part of the inline field cycle).
func (d *detail) beginAddBlocker() {
	if d.tick == nil {
		return
	}
	d.addingBlocker = true
	d.openInput("")
}

// Update handles a key while the detail pane is focused. It returns the updated
// detail, an optional command, and whether it consumed the key (so the App can
// fall through to its own bindings — e.g. Esc to return from a swapped detail —
// when this pane did not handle it).
func (d detail) Update(msg tea.KeyMsg) (detail, tea.Cmd, bool) {
	// Editing mode: route keys to the textinput; Enter commits, Esc cancels.
	if d.editing {
		switch msg.String() {
		case "enter":
			d.commitEdit()
			return d, nil, true
		case "esc":
			d.cancelEdit()
			return d, nil, true
		default:
			var cmd tea.Cmd
			d.input, cmd = d.input.Update(msg)
			return d, cmd, true
		}
	}

	if d.tick == nil {
		return d, nil, false
	}

	switch msg.String() {
	case "j", "down":
		d.scroll(1)
		return d, nil, true
	case "k", "up":
		d.scroll(-1)
		return d, nil, true
	case "n", "right", "l":
		d.cycleField(1)
		return d, nil, true
	case "p", "left":
		d.cycleField(-1)
		return d, nil, true
	case "e", "enter", " ":
		d.beginEdit()
		return d, nil, true
	}
	return d, nil, false
}

// beginEdit acts on the active field. Status and priority cycle in place and
// write immediately; the free-text fields open a textinput seeded with the
// current value.
func (d *detail) beginEdit() {
	if d.tick == nil {
		return
	}
	switch d.activeField() {
	case fieldStatus:
		d.cycleStatusAndWrite()
	case fieldPriority:
		d.cyclePriorityAndWrite()
	case fieldOwner:
		d.openInput(d.tick.Owner)
	case fieldParent:
		d.openInput(d.tick.Parent)
	case fieldLabels:
		d.openInput(strings.Join(d.tick.Labels, ", "))
	case fieldTargetDate:
		d.openInput(d.tick.TargetDate)
	}
}

// openInput seeds and focuses the textinput for a free-text field edit.
func (d *detail) openInput(seed string) {
	d.editing = true
	d.input.SetValue(seed)
	d.input.CursorEnd()
	d.input.Focus()
}

// cycleStatusAndWrite advances the status to the next value and persists it.
func (d *detail) cycleStatusAndWrite() {
	next := statusCycle[0]
	for i, s := range statusCycle {
		if s == d.tick.Status {
			next = statusCycle[(i+1)%len(statusCycle)]
			break
		}
	}
	d.applyResult(editSetStatus(d.storePath, d.owner, d.tick.ID, next))
}

// cyclePriorityAndWrite advances priority 0→1→2→3→4→0 and persists it.
func (d *detail) cyclePriorityAndWrite() {
	next := (d.tick.Priority + 1) % 5
	d.applyResult(editSetPriority(d.storePath, d.owner, d.tick.ID, next))
}

// commitEdit applies the textinput value to the active free-text field via the
// matching shared edit func, then closes the input.
func (d *detail) commitEdit() {
	if d.tick == nil {
		d.cancelEdit()
		return
	}
	val := d.input.Value()
	if d.addingBlocker {
		t, err := editAddBlocker(d.storePath, d.owner, d.tick.ID, val)
		d.cancelEdit()
		if err != nil {
			d.statusMsg = err.Error()
			d.statusErr = true
			return
		}
		tc := t
		d.tick = &tc
		d.statusMsg = "added blocker"
		d.statusErr = false
		return
	}
	var (
		t   tick.Tick
		err error
	)
	switch d.activeField() {
	case fieldOwner:
		t, err = editSetOwner(d.storePath, d.owner, d.tick.ID, val)
	case fieldParent:
		t, err = editSetParent(d.storePath, d.owner, d.tick.ID, val)
	case fieldLabels:
		t, err = editSetLabels(d.storePath, d.owner, d.tick.ID, val)
	case fieldTargetDate:
		t, err = editSetTargetDate(d.storePath, d.owner, d.tick.ID, val)
	default:
		d.cancelEdit()
		return
	}
	d.cancelEdit()
	d.applyResult(t, err)
}

// applyResult records the outcome of an edit: on success it swaps the in-memory
// tick to the persisted copy and notes which field changed; on error it shows
// the message. Callers (App) read d.tick / d.statusMsg after Update.
func (d *detail) applyResult(t tick.Tick, err error) {
	if err != nil {
		d.statusMsg = err.Error()
		d.statusErr = true
		return
	}
	tc := t
	d.tick = &tc
	d.statusMsg = fmt.Sprintf("updated %s", d.activeField().label())
	d.statusErr = false
}

// View renders the detail body: metadata (with the active field highlighted and
// any in-progress edit), then the workflow / description / acceptance / notes
// sections ported from buildDetailContent. The result is scrolled by yOffset and
// clipped to the pane height.
func (d detail) View() string {
	if d.tick == nil {
		return dimStyle.Render("No tick selected")
	}

	var out []string
	out = append(out, d.renderMetadata()...)
	out = append(out, buildDetailBody(*d.tick, d.width)...)
	if d.statusMsg != "" {
		out = append(out, "")
		if d.statusErr {
			out = append(out, verdictRejectedStyle.Render(d.statusMsg))
		} else {
			out = append(out, verdictApprovedStyle.Render(d.statusMsg))
		}
	}

	content := strings.Join(out, "\n")
	lines := strings.Split(content, "\n")
	if d.height <= 0 || len(lines) <= d.height {
		return content
	}
	top := d.yOffset
	if top > len(lines)-d.height {
		top = len(lines) - d.height
	}
	if top < 0 {
		top = 0
	}
	return strings.Join(lines[top:top+d.height], "\n")
}

// renderMetadata renders the editable metadata block. The active field is
// marked with a ▸ cursor; the field being edited shows the live textinput.
func (d detail) renderMetadata() []string {
	t := *d.tick
	var out []string

	out = append(out, labelStyle.Render("ID:")+t.ID)
	out = append(out, labelStyle.Render("Type:")+renderType(t.Type))

	out = append(out, d.fieldLine(fieldStatus, renderStatus(t.Status)+" "+t.Status))
	out = append(out, d.fieldLine(fieldPriority, renderPriority(t.Priority)))
	out = append(out, d.fieldLine(fieldOwner, t.Owner))

	parent := t.Parent
	if parent == "" {
		parent = dimStyle.Render("(none)")
	}
	out = append(out, d.fieldLine(fieldParent, parent))

	labels := strings.Join(t.Labels, ", ")
	if labels == "" {
		labels = dimStyle.Render("(none)")
	}
	out = append(out, d.fieldLine(fieldLabels, labels))

	target := t.TargetDate
	if target == "" {
		target = dimStyle.Render("(none)")
	}
	out = append(out, d.fieldLine(fieldTargetDate, target))

	if len(t.BlockedBy) > 0 {
		out = append(out, labelStyle.Render("Blocked:")+strings.Join(t.BlockedBy, ", "))
	}
	if d.addingBlocker {
		out = append(out, selectedStyle.Render("▸ ")+labelStyle.Render("Add blocker:")+d.input.View())
	}

	return out
}

// fieldLine renders one editable metadata row, marking the active field and
// showing the textinput when that field is mid-edit.
func (d detail) fieldLine(f editableField, value string) string {
	cursor := "  "
	if d.activeField() == f {
		cursor = selectedStyle.Render("▸ ")
	}
	label := labelStyle.Render(f.label() + ":")
	if d.editing && d.activeField() == f {
		return cursor + label + d.input.View()
	}
	return cursor + label + value
}

// buildDetailBody renders the non-editable narrative sections (workflow,
// description, acceptance, notes, and trailing metadata) — the port of
// buildDetailContent minus the leading key-value block, which the editable
// metadata renderer now owns.
func buildDetailBody(t tick.Tick, width int) []string {
	var out []string

	hasWorkflowFields := t.Requires != nil || t.IsAwaitingHuman() || t.Verdict != nil
	if hasWorkflowFields {
		out = append(out, "")
		out = append(out, headerStyle.Render("Workflow:"))
		if t.Requires != nil {
			gateLine := "  " + describeRequires(*t.Requires)
			if t.Verdict != nil && *t.Verdict == tick.VerdictApproved {
				gateLine += " → " + verdictApprovedStyle.Render("Approved ✓")
			} else if t.Verdict != nil && *t.Verdict == tick.VerdictRejected && t.IsAwaitingHuman() {
				gateLine += " → " + verdictRejectedStyle.Render("Rejected ✗") + " → " + statusAwaitingStyle.Render("Pending retry")
			} else if t.Verdict != nil && *t.Verdict == tick.VerdictRejected {
				gateLine += " → " + verdictRejectedStyle.Render("Rejected ✗")
			} else if t.IsAwaitingHuman() {
				gateLine += " → " + statusAwaitingStyle.Render("Pending")
			} else {
				gateLine += " → " + dimStyle.Render("Not yet requested")
			}
			out = append(out, gateLine)
		} else {
			if t.IsAwaitingHuman() {
				out = append(out, "  "+statusAwaitingStyle.Render(describeAwaiting(t.GetAwaitingType())))
			}
			if t.Verdict != nil {
				if *t.Verdict == tick.VerdictApproved {
					out = append(out, "  "+verdictApprovedStyle.Render(describeVerdict(*t.Verdict)))
				} else {
					out = append(out, "  "+verdictRejectedStyle.Render(describeVerdict(*t.Verdict)))
				}
			}
		}
	}

	if strings.TrimSpace(t.Description) != "" {
		out = append(out, "")
		out = append(out, headerStyle.Render("Description:"))
		out = append(out, wrapAndIndent(t.Description, 2, width)...)
	}

	if strings.TrimSpace(t.AcceptanceCriteria) != "" {
		out = append(out, "")
		out = append(out, headerStyle.Render("Acceptance Criteria:"))
		out = append(out, wrapAndIndent(t.AcceptanceCriteria, 2, width)...)
	}

	if strings.TrimSpace(t.Notes) != "" {
		out = append(out, "")
		out = append(out, headerStyle.Render("Notes:"))
		out = append(out, wrapAndIndent(t.Notes, 2, width)...)
	}

	if t.DiscoveredFrom != "" {
		out = append(out, "")
		out = append(out, labelStyle.Render("From:")+t.DiscoveredFrom)
	}
	if t.ClosedReason != "" {
		out = append(out, labelStyle.Render("Closed:")+t.ClosedReason)
	}

	return out
}
