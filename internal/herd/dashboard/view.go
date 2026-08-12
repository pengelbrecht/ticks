package dashboard

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// Styles are the repo's shared Catppuccin palette (internal/styles), reused
// rather than redefined so the board matches `tk tui` and `tk board`.
var (
	titleStyle    = lipgloss.NewStyle().Bold(true).Foreground(styles.ColorPink)
	metaStyle     = lipgloss.NewStyle().Foreground(styles.ColorDim)
	waveStyle     = lipgloss.NewStyle().Foreground(styles.ColorPurple).Bold(true)
	epicStyle     = lipgloss.NewStyle().Foreground(styles.ColorTeal).Bold(true)
	selectedStyle = lipgloss.NewStyle().Foreground(styles.ColorBlue).Bold(true)
	errStyle      = lipgloss.NewStyle().Foreground(styles.ColorRed)
	okStyle       = lipgloss.NewStyle().Foreground(styles.ColorGreen)
	idStyle       = lipgloss.NewStyle().Foreground(styles.ColorSubtext)
)

// statusStyle colours a herdr agent status.
func statusStyle(s client.AgentStatus) lipgloss.Style {
	switch s {
	case client.StatusWorking:
		return lipgloss.NewStyle().Foreground(styles.ColorBlue)
	case client.StatusDone:
		return lipgloss.NewStyle().Foreground(styles.ColorGreen)
	case client.StatusBlocked:
		return lipgloss.NewStyle().Foreground(styles.ColorRed)
	case client.StatusIdle:
		return lipgloss.NewStyle().Foreground(styles.ColorYellow)
	case StatusGone:
		return lipgloss.NewStyle().Foreground(styles.ColorGray)
	default:
		return lipgloss.NewStyle().Foreground(styles.ColorDim)
	}
}

// tickStatusStyle colours a tick's tracker status.
func tickStatusStyle(s string) lipgloss.Style {
	switch s {
	case tick.StatusClosed:
		return styles.StatusClosedStyle
	case tick.StatusInProgress:
		return styles.StatusInProgressStyle
	default:
		return styles.StatusOpenStyle
	}
}

// render draws the whole board: a header, one block per epic (waves, then
// workers), and a key hint.
func (m *Model) render() string {
	var b strings.Builder
	b.WriteString(m.header())
	b.WriteString("\n")

	body := m.body()
	// Leave room for the header (2 lines), the blank line and the footer.
	if budget := m.height - 5; budget > 0 && len(body) > budget {
		hidden := len(body) - budget + 1
		body = append(body[:budget-1], metaStyle.Render(fmt.Sprintf("  … %d more lines (resize to see them)", hidden)))
	}
	for _, line := range body {
		b.WriteString(truncate(line, m.width))
		b.WriteString("\n")
	}

	b.WriteString("\n")
	b.WriteString(truncate(metaStyle.Render("j/k move · g/G first/last · r reload · q quit · read-only"), m.width))
	return b.String()
}

// header is the two-line status bar: what is being watched, and how the board
// is being kept current.
func (m *Model) header() string {
	scope := "all epics"
	if m.snap.Epic != "" {
		scope = "epic " + m.snap.Epic
	} else if m.loader.Epic != "" {
		scope = "epic " + m.loader.Epic
	}
	title := titleStyle.Render("Ticks mission control") + metaStyle.Render(" · "+scope)

	counts := map[client.AgentStatus]int{}
	total := 0
	for _, w := range m.snap.Workers() {
		counts[m.Status(w.PaneID, w.Status)]++
		total++
	}
	parts := []string{fmt.Sprintf("%d workers", total)}
	for _, s := range []client.AgentStatus{client.StatusWorking, client.StatusIdle, client.StatusDone, client.StatusBlocked, StatusGone} {
		if counts[s] > 0 {
			parts = append(parts, fmt.Sprintf("%d %s", counts[s], s))
		}
	}

	var stream string
	switch {
	case m.streamUp:
		stream = okStyle.Render(fmt.Sprintf("events live (%d panes)", m.panesWatch))
	case m.streamErr != nil:
		stream = errStyle.Render("events down — reconnecting")
	case m.herd == nil:
		stream = errStyle.Render("events off (no herdr)")
	case m.panesWatch == 0 && total == 0:
		stream = metaStyle.Render("events idle (no workers)")
	default:
		stream = metaStyle.Render("events connecting")
	}

	meta := []string{strings.Join(parts, " · "), stream}
	if m.events > 0 {
		meta = append(meta, fmt.Sprintf("%d events, last %s ago", m.events, since(m.now(), m.lastEvent)))
	}
	if !m.snap.LoadedAt.IsZero() {
		meta = append(meta, fmt.Sprintf("re-listed %s ago", since(m.now(), m.snap.LoadedAt)))
	}
	line := metaStyle.Render(strings.Join(meta, " · "))

	var problems []string
	if m.loadErr != nil {
		problems = append(problems, "load: "+m.loadErr.Error())
	}
	if m.snap.HerdErr != nil {
		problems = append(problems, "herdr: "+m.snap.HerdErr.Error())
	}
	if m.fsWatchErr != nil {
		problems = append(problems, "fswatch: "+m.fsWatchErr.Error())
	}
	out := truncate(title, m.width) + "\n" + truncate(line, m.width)
	if len(problems) > 0 {
		out += "\n" + truncate(errStyle.Render(strings.Join(problems, " · ")), m.width)
	}
	return out
}

// body renders the epic blocks as a flat line list so the height clamp can cut
// it without disturbing the layout.
func (m *Model) body() []string {
	if len(m.snap.Epics) == 0 {
		if m.snap.LoadedAt.IsZero() {
			return []string{metaStyle.Render("  loading…")}
		}
		return []string{metaStyle.Render("  no epics with run state in " + m.snap.RepoRoot)}
	}

	var lines []string
	cursorIx := 0
	for _, e := range m.snap.Epics {
		label := e.Epic
		if e.Title != "" {
			label += " — " + e.Title
		}
		lines = append(lines, "", epicStyle.Render(label))
		if len(e.Waves) == 0 {
			lines = append(lines, metaStyle.Render("  (no child ticks)"))
		}
		for _, w := range e.Waves {
			lines = append(lines, waveStyle.Render("  "+waveLabel(w.Number)))
			for _, t := range w.Ticks {
				lines = append(lines, m.tickLine(t, cursorIx == m.cursor))
				cursorIx++
			}
		}
		if len(e.Workers) > 0 {
			lines = append(lines, waveStyle.Render("  workers"))
			for _, wk := range e.Workers {
				lines = append(lines, m.workerLine(wk))
			}
		}
	}
	return lines
}

// waveLabel names a wave; wave 0 is this package's bucket for ticks the wave
// computation excludes.
func waveLabel(n int) string {
	if n == 0 {
		return "closed / awaiting"
	}
	return fmt.Sprintf("wave %d", n)
}

// tickLine renders one tick row, with its worker's live status when spawned.
func (m *Model) tickLine(t TickRow, selected bool) string {
	marker := "  "
	if selected {
		marker = "▸ "
	}
	flag := " "
	if t.Blocked {
		flag = "⊘"
	}
	// Widths are applied by pad() BEFORE styling: a %-14s on an
	// already-rendered string counts escape bytes as columns.
	line := fmt.Sprintf("    %s%s %s %s %s",
		marker, flag,
		idStyle.Render(pad(t.ID, 5)),
		tickStatusStyle(t.Status).Render(pad(t.Status, 12)),
		t.Title)
	if t.PaneID != "" {
		st := m.paneStatus(t.PaneID)
		line += "  " + statusStyle(st).Render("["+string(st)+"]")
	}
	if selected {
		return selectedStyle.Render(line)
	}
	return line
}

// workerLine renders one manifest, joined with its live status and elapsed
// timers.
func (m *Model) workerLine(w WorkerRow) string {
	st := m.Status(w.PaneID, w.Status)
	line := fmt.Sprintf("    %s %s %s %s %s",
		idStyle.Render(pad(w.Tick, 5)),
		statusStyle(st).Render(pad(string(st), 9)),
		pad(w.Kind, 8),
		pad(w.PaneID, 10),
		metaStyle.Render(w.Branch))
	if timer := m.workerTimer(w, st); timer != "" {
		line += "  " + metaStyle.Render(timer)
	}
	return line
}

// workerTimer renders the compact elapsed-time summary for a worker row,
// e.g. "working 4m12s · age 9m01s": time in the current status (anchored at
// [Model.statusSince], which starts at first observation — see
// [Model.observeStatus]), then total age since the manifest's spawn.
func (m *Model) workerTimer(w WorkerRow, status client.AgentStatus) string {
	var parts []string
	if obs, ok := m.statusSince[w.PaneID]; ok {
		parts = append(parts, fmt.Sprintf("%s %s", status, formatDuration(m.now().Sub(obs.Since))))
	}
	if createdAt, err := time.Parse(state.TimeLayout, w.CreatedAt); err == nil {
		parts = append(parts, "age "+formatDuration(m.now().Sub(createdAt)))
	}
	return strings.Join(parts, " · ")
}

// since renders a coarse age; the board never shows sub-second churn.
func since(now, then time.Time) string {
	if then.IsZero() {
		return "never"
	}
	d := now.Sub(then)
	if d < 0 {
		d = 0
	}
	switch {
	case d < time.Minute:
		return fmt.Sprintf("%ds", int(d.Seconds()))
	case d < time.Hour:
		return fmt.Sprintf("%dm", int(d.Minutes()))
	default:
		return fmt.Sprintf("%dh", int(d.Hours()))
	}
}

// formatDuration renders an elapsed worker-row timer compactly: seconds
// alone under a minute, minutes+seconds under an hour, hours+minutes beyond
// that. Unlike [since], which deliberately drops precision for the header,
// this is the fine-grained rendering the row timers need.
func formatDuration(d time.Duration) string {
	if d < 0 {
		d = 0
	}
	switch {
	case d < time.Minute:
		return fmt.Sprintf("%ds", int(d.Seconds()))
	case d < time.Hour:
		mins := int(d.Minutes())
		secs := int(d.Seconds()) - mins*60
		return fmt.Sprintf("%dm%02ds", mins, secs)
	default:
		hours := int(d.Hours())
		mins := int(d.Minutes()) - hours*60
		return fmt.Sprintf("%dh%02dm", hours, mins)
	}
}

// pad right-pads to n display cells without truncating longer text, so a wide
// id never silently loses characters.
func pad(s string, n int) string {
	if lipgloss.Width(s) >= n {
		return s
	}
	return s + strings.Repeat(" ", n-lipgloss.Width(s))
}

// truncate clips a rendered line to width, ANSI-aware.
func truncate(s string, width int) string {
	if width <= 0 || lipgloss.Width(s) <= width {
		return s
	}
	return lipgloss.NewStyle().MaxWidth(width).Render(s)
}
