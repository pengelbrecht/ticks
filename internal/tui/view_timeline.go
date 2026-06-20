package tui

import (
	"fmt"
	"sort"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// Timeline slip-signal styles: overdue rows are red, on-track rows are green,
// undated rows are dim (no date signal). The selected row is blue+bold
// regardless of slip status (matching the List and Roadmap selection style).
var (
	timelineOverdueStyle  = lipgloss.NewStyle().Foreground(styles.ColorRed)
	timelineOnTrackStyle  = lipgloss.NewStyle().Foreground(styles.ColorGreen)
	timelineUndatedStyle  = styles.DimStyle
	timelineSelectedStyle = lipgloss.NewStyle().Foreground(styles.ColorBlue).Bold(true)
)

// timelineRow is the precomputed display row derived from a single tick.
type timelineRow struct {
	t      tick.Tick
	slip   query.SlipStatus
	dateFmt string // formatted target_date or "(no date)"
}

// timelineView is the Timeline content view (§5 — "Timeline" tab). It renders
// a gantt-style table of ticks keyed on target_date, sorted earliest-first
// with undated ticks last. Each row shows the Slip signal (overdue in red,
// on-track in green, undated dim).
//
// The clock is injected via the `now` field and never read from time.Now()
// so tests can inject a fixed instant for deterministic goldens.
type timelineView struct {
	storePath string

	// now is the reference instant for Slip computation. It is set by
	// SetNow (tests) or by the App on each reScope (production: time.Now()).
	// It must NEVER be zero — callers must set it before View() is called.
	now time.Time

	allTicks []tick.Tick // full set (for Slip / DescendantProgress)
	rows     []timelineRow

	selected int

	width  int
	height int
}

// newTimelineView constructs the Timeline view. This is the constructor
// referenced by the one-line registration in registerViews.
func newTimelineView(storePath string) View {
	return &timelineView{
		storePath: storePath,
		now:       time.Now(), // overridden in tests via SetNow
	}
}

func (v *timelineView) Title() string { return "Timeline" }
func (v *timelineView) Tab() string   { return "Timeline" }

// SetSize records the content dimensions.
func (v *timelineView) SetSize(width, height int) {
	v.width = width
	v.height = height
}

// SetNow injects the reference clock. Call this in tests with a fixed instant
// so Slip classification and goldens are deterministic.
func (v *timelineView) SetNow(now time.Time) {
	v.now = now
	v.rebuild()
}

// SetScope re-scopes the view. allTicks is the full set (for Slip); the
// scoped subset is derived via FilterScope and then sorted by target_date.
func (v *timelineView) SetScope(scope Scope, allTicks []tick.Tick) {
	v.allTicks = allTicks
	scoped := FilterScope(allTicks, scope, "")
	v.buildRows(scoped)
	// Clamp selection.
	if v.selected >= len(v.rows) {
		v.selected = len(v.rows) - 1
	}
	if v.selected < 0 {
		v.selected = 0
	}
}

// rebuild recomputes slip signals for the current row set (called after a
// clock update). It reuses the existing tick slice so FilterScope is not
// re-run.
func (v *timelineView) rebuild() {
	ticks := make([]tick.Tick, 0, len(v.rows))
	for _, r := range v.rows {
		ticks = append(ticks, r.t)
	}
	v.buildRows(ticks)
}

// buildRows sorts ticks by target_date (undated last) and computes the Slip
// signal for each row. It replaces v.rows in place.
func (v *timelineView) buildRows(ticks []tick.Tick) {
	// Stable-sort: dated ticks ascending by date, undated ticks at the end.
	sorted := make([]tick.Tick, len(ticks))
	copy(sorted, ticks)
	sort.SliceStable(sorted, func(i, j int) bool {
		di, dj := sorted[i].TargetDate, sorted[j].TargetDate
		if di == "" && dj == "" {
			return false
		}
		if di == "" {
			return false // undated sorts last
		}
		if dj == "" {
			return true // dated sorts before undated
		}
		return di < dj // ISO dates sort lexicographically
	})

	v.rows = make([]timelineRow, 0, len(sorted))
	for _, t := range sorted {
		slip := query.Slip(t, v.allTicks, v.now)
		dateFmt := t.TargetDate
		if dateFmt == "" {
			dateFmt = "(no date)"
		}
		v.rows = append(v.rows, timelineRow{
			t:       t,
			slip:    slip,
			dateFmt: dateFmt,
		})
	}
}

// SelectedTickID satisfies Selector: returns the highlighted tick's ID.
func (v *timelineView) SelectedTickID() string {
	if v.selected >= 0 && v.selected < len(v.rows) {
		return v.rows[v.selected].t.ID
	}
	return ""
}

// Update handles j/k/g/G navigation.
func (v *timelineView) Update(msg tea.Msg) (View, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "j", "down":
			if v.selected < len(v.rows)-1 {
				v.selected++
			}
		case "k", "up":
			if v.selected > 0 {
				v.selected--
			}
		case "g", "home":
			v.selected = 0
		case "G", "end":
			if len(v.rows) > 0 {
				v.selected = len(v.rows) - 1
			}
		}
	}
	return v, nil
}

// View renders the timeline body: one row per tick, sorted by target_date,
// with Slip-driven color coding and the selected row highlighted in blue.
func (v *timelineView) View() string {
	if len(v.rows) == 0 {
		return dimStyle.Render("No ticks in scope")
	}

	lines := make([]string, 0, len(v.rows))
	for i, row := range v.rows {
		line := renderTimelineRow(row, i == v.selected, v.width)
		lines = append(lines, line)
	}

	return strings.Join(v.scrollWindow(lines), "\n")
}

// renderTimelineRow is the PURE data-to-string row renderer. It takes no
// global state — all inputs are explicit so unit tests can call it directly
// with any (row, selected, width) triple.
//
// Format: "cursor  date        slip  id    status priority  title"
func renderTimelineRow(row timelineRow, selected bool, width int) string {
	cursor := " "
	if selected {
		cursor = ">"
	}

	slipTag := slipTag(row.slip)

	// Raw (unstyled) line for truncation width accounting.
	raw := fmt.Sprintf("%s  %-12s  %-8s  %-6s  %s  %s  %s",
		cursor,
		row.dateFmt,
		string(row.slip),
		row.t.ID,
		styles.IconOpen, // placeholder; we'll use status below
		styles.RenderPriority(row.t.Priority),
		row.t.Title,
	)
	_ = raw // used only to size; we build the styled version separately

	// Build styled parts.
	statusIcon := renderStatus(row.t.Status)
	priorityStr := renderPriority(row.t.Priority)
	line := fmt.Sprintf("%s  %-12s  %s  %s  %s  %s  %s",
		cursor,
		row.dateFmt,
		slipTag,
		row.t.ID,
		statusIcon,
		priorityStr,
		row.t.Title,
	)
	line = truncate(line, width)

	if selected {
		return timelineSelectedStyle.Render(line)
	}
	// Apply slip-driven color only to non-selected rows so selection always
	// wins visually.
	switch row.slip {
	case query.SlipOverdue:
		return timelineOverdueStyle.Render(line)
	case query.SlipOnTrack:
		return timelineOnTrackStyle.Render(line)
	default:
		return timelineUndatedStyle.Render(line)
	}
}

// slipTag returns a short fixed-width label for the slip status column.
func slipTag(s query.SlipStatus) string {
	switch s {
	case query.SlipOverdue:
		return timelineOverdueStyle.Render("OVERDUE ")
	case query.SlipOnTrack:
		return timelineOnTrackStyle.Render("ON TRACK")
	default:
		return timelineUndatedStyle.Render("        ")
	}
}

// scrollWindow returns the slice of lines visible given the content height,
// keeping the selected row in view (mirrors listView.scrollWindow).
func (v *timelineView) scrollWindow(lines []string) []string {
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
