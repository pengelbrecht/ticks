package dashboard

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"

	"github.com/pengelbrecht/ticks/internal/styles"
)

// The repo's shared Catppuccin palette, reused rather than redefined so this
// board matches `tk herd dashboard`, `tk tui` and `tk board`.
var (
	titleStyle    = lipgloss.NewStyle().Bold(true).Foreground(styles.ColorPink)
	metaStyle     = lipgloss.NewStyle().Foreground(styles.ColorDim)
	runStyle      = lipgloss.NewStyle().Foreground(styles.ColorTeal).Bold(true)
	sectionStyle  = lipgloss.NewStyle().Foreground(styles.ColorPurple).Bold(true)
	selectedStyle = lipgloss.NewStyle().Foreground(styles.ColorBlue).Bold(true)
	errStyle      = lipgloss.NewStyle().Foreground(styles.ColorRed)
	okStyle       = lipgloss.NewStyle().Foreground(styles.ColorGreen)
	outputStyle   = lipgloss.NewStyle().Foreground(styles.ColorSubtext)
)

// keyHint is the footer. The verbs and their keys are the herd board's, in the
// herd board's order: an operator who has driven one drives this one.
const keyHint = "j/k move · enter details / fold · g/G first/last · r reload · q quit · read-only"

func (m *Model) render() string {
	var b strings.Builder
	b.WriteString(m.header())
	b.WriteString("\n")

	rows := m.rows()
	budget := m.height - 6
	if budget < 1 {
		budget = 1
	}
	start := 0
	if m.cursor >= budget {
		start = m.cursor - budget + 1
	}
	end := start + budget
	if end > len(rows) {
		end = len(rows)
	}
	for i := start; i < end; i++ {
		b.WriteString(truncate(m.renderRow(rows[i], i == m.cursor), m.width))
		b.WriteString("\n")
	}
	if end < len(rows) {
		b.WriteString(truncate(metaStyle.Render(fmt.Sprintf("  … %d more lines", len(rows)-end)), m.width))
		b.WriteString("\n")
	}

	b.WriteString("\n")
	b.WriteString(truncate(metaStyle.Render(keyHint), m.width))
	return b.String()
}

func (m *Model) renderRow(r row, selected bool) string {
	prefix := "  "
	if selected {
		prefix = "> "
	}
	text := r.Text
	switch {
	case selected:
		text = selectedStyle.Render(text)
	case r.Kind == rowRunHeader:
		text = runStyle.Render(text)
	case r.Kind == rowSection:
		text = sectionStyle.Render(text)
	case r.Warn:
		text = errStyle.Render(text)
	case strings.Contains(r.Text, "│ "):
		text = outputStyle.Render(text)
	default:
		text = metaStyle.Render(text)
	}
	fold := ""
	if r.Kind == rowRunHeader || r.Kind == rowSection {
		fold = "▸ "
		if !m.folded(r.Key) {
			fold = "▾ "
		}
	}
	return prefix + fold + text
}

// header is the status bar: which factory is being watched, how many runs are
// live, and — the line that matters when things are wrong — whether what is on
// screen is a reading or a memory.
func (m *Model) header() string {
	scope := m.endpoint
	if scope == "" {
		scope = "the configured factory"
	}
	if m.loader.Project != "" {
		scope += " · " + m.loader.Project
	}
	title := titleStyle.Render("Ticks factory") + metaStyle.Render(" · "+scope)

	live, total := 0, len(m.snap.Runs)
	for _, run := range m.snap.Runs {
		if run.Active() {
			live++
		}
	}
	meta := []string{fmt.Sprintf("%d runs, %d live", total, live)}
	if gates := pendingGates(m.gates()); gates > 0 {
		meta = append(meta, fmt.Sprintf("%s waiting", plural(gates, "gate")))
	}
	if refusals := len(m.refusals()); refusals > 0 {
		meta = append(meta, plural(refusals, "refusal"))
	}
	if len(m.snap.Events) > 0 {
		meta = append(meta, fmt.Sprintf("run_event tail %d", len(m.snap.Events)))
	}
	if !m.costAt.IsZero() {
		meta = append(meta, "cost telemetry "+m.age(m.costAt.Format(stampLayout)))
	}

	var statusLine string
	if m.stale {
		age := "never read"
		if !m.snap.LoadedAt.IsZero() {
			age = m.age(m.snap.LoadedAt.Format(stampLayout))
		}
		reason := "the factory could not be reached"
		if m.staleErr != nil {
			reason = m.staleErr.Error()
		}
		if !m.haveFrame {
			statusLine = errStyle.Render("STALE · no state has ever been read · " + reason)
		} else {
			statusLine = errStyle.Render(fmt.Sprintf(
				"STALE · showing the last known state from %s · %s", age, reason))
		}
	} else if !m.snap.LoadedAt.IsZero() {
		statusLine = okStyle.Render("live · read " + m.age(m.snap.LoadedAt.Format(stampLayout)))
	} else {
		statusLine = metaStyle.Render("reading the factory…")
	}

	lines := []string{
		truncate(title, m.width),
		truncate(metaStyle.Render(strings.Join(meta, " · ")), m.width),
		truncate(statusLine, m.width),
	}
	problems := append([]string(nil), m.notes...)
	if m.snap.FocusDetail != "" {
		problems = append(problems, m.snap.FocusDetail)
	}
	problems = append(problems, m.costIssues...)
	if len(problems) > 0 {
		lines = append(lines, truncate(metaStyle.Render(strings.Join(problems, " · ")), m.width))
	}
	return strings.Join(lines, "\n")
}

const stampLayout = "2006-01-02T15:04:05Z07:00"

// renderDetail is the focused run in full, with its harness output as the body
// — the thing the tick calls the single most useful view here.
func (m *Model) renderDetail() string {
	var b strings.Builder
	b.WriteString(titleStyle.Render("Run "+m.detailRun) + "\n")
	if m.stale {
		b.WriteString(errStyle.Render("STALE · last known state") + "\n")
	}
	b.WriteString("\n")

	body := m.detailBody()
	budget := m.height - 5
	if budget < 1 {
		budget = 1
	}
	start := m.detailScroll
	if start > len(body) {
		start = len(body)
	}
	end := start + budget
	if end > len(body) {
		end = len(body)
	}
	for _, line := range body[start:end] {
		b.WriteString(truncate(line, m.width))
		b.WriteString("\n")
	}
	b.WriteString("\n")
	b.WriteString(truncate(metaStyle.Render("j/k scroll · esc/enter back · r reload · q quit · read-only"), m.width))
	return b.String()
}

// detailBody is the run, its phase, its gates and refusals, then everything
// its container has printed that the tail read covers.
func (m *Model) detailBody() []string {
	var out []string
	run, found := m.runByID(m.detailRun)
	if !found {
		return []string{errStyle.Render("this run is not in the last frame the board read")}
	}

	out = append(out, runStyle.Render(m.runLine(run)))
	out = append(out, metaStyle.Render("requested by "+orDash(run.RequestedBy)+" · base "+shortSHA(run.BaseSHA)))
	for _, line := range m.runLines(run, false) {
		text := "  " + strings.TrimPrefix(line.text, "    ")
		if line.warn {
			out = append(out, errStyle.Render(text))
			continue
		}
		out = append(out, metaStyle.Render(text))
	}

	if gates := m.gates(); len(gates) > 0 {
		out = append(out, "", sectionStyle.Render("GATES"))
		for _, gate := range gates {
			line := "  " + gateLine(gate)
			if gate.Resolved() {
				out = append(out, metaStyle.Render(line))
			} else {
				out = append(out, errStyle.Render(line))
			}
		}
	}

	if refusals := m.refusals(); len(refusals) > 0 {
		out = append(out, "", sectionStyle.Render("REFUSALS"))
		for _, refusal := range refusals {
			out = append(out, errStyle.Render("  "+refusalLine(refusal)))
		}
	}

	if len(m.snap.Events) > 0 {
		out = append(out, "", sectionStyle.Render("RUN EVENTS"))
		for _, event := range m.snap.Events {
			delivered := "board ok"
			if !event.Delivered {
				delivered = "board unreachable"
			}
			out = append(out, metaStyle.Render(fmt.Sprintf("  %s · %s · %s · tick %s · %s",
				event.At, event.Source, event.Type, orDash(event.Tick), delivered)))
		}
	}

	out = append(out, "", sectionStyle.Render(m.harnessHeading(run)))
	if m.snap.HarnessDetail != "" {
		out = append(out, errStyle.Render("  "+m.snap.HarnessDetail))
	}
	if m.snap.FocusRun != run.RunID {
		out = append(out, metaStyle.Render("  the tail follows the selected run; reload to read this one"))
		return out
	}
	tail := lastLines(m.snap.Harness.Text, 5000)
	if len(tail) == 0 {
		out = append(out, metaStyle.Render("  nothing has been printed yet"))
	}
	for _, line := range tail {
		out = append(out, outputStyle.Render("  "+line))
	}
	return out
}

func (m *Model) harnessHeading(run Run) string {
	if m.snap.FocusRun != run.RunID {
		return "HARNESS OUTPUT"
	}
	if m.snap.Harness.Truncated {
		return fmt.Sprintf("HARNESS OUTPUT · last %d of %d bytes", m.snap.Harness.Bytes, m.snap.Harness.TotalBytes)
	}
	if m.snap.Harness.TotalBytes > 0 {
		return fmt.Sprintf("HARNESS OUTPUT · %d bytes", m.snap.Harness.TotalBytes)
	}
	return "HARNESS OUTPUT"
}

func (m *Model) runByID(runID string) (Run, bool) {
	for _, run := range m.snap.Runs {
		if run.RunID == runID {
			return run, true
		}
	}
	return Run{}, false
}

func shortSHA(sha string) string {
	if len(sha) > 12 {
		return sha[:12]
	}
	return orDash(sha)
}

// truncate cuts a styled line to width without counting escape sequences.
func truncate(line string, width int) string {
	if width <= 0 {
		return line
	}
	return ansi.Truncate(line, width, "…")
}

// plural renders a count with its noun: "1 gate", "2 gates".
func plural(n int, noun string) string {
	if n == 1 {
		return fmt.Sprintf("%d %s", n, noun)
	}
	return fmt.Sprintf("%d %ss", n, noun)
}
