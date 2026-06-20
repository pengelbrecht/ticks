package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"

	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// item is a flattened tree row shared by the list-style views: a tick plus its
// rendering depth and epic/children flags.
type item struct {
	Tick    tick.Tick
	Depth   int
	IsEpic  bool
	HasKids bool
}

// renderPriority returns a color-coded priority string using shared styles.
func renderPriority(priority int) string {
	return styles.RenderPriority(priority)
}

// renderStatus returns a color-coded status symbol.
// open: gray ○, in_progress: blue ●, closed: green ✓
func renderStatus(status string) string {
	switch status {
	case tick.StatusOpen:
		return statusOpenStyle.Render(styles.IconOpen)
	case tick.StatusInProgress:
		return statusInProgressStyle.Render(styles.IconInProgress)
	case tick.StatusClosed:
		return statusClosedStyle.Render(styles.IconClosed)
	default:
		return status
	}
}

// renderType returns a color-coded type string.
// epic: purple, bug: red, feature: teal, task/chore: default
func renderType(tickType string) string {
	switch tickType {
	case tick.TypeEpic:
		return typeEpicStyle.Render(tickType)
	case tick.TypeBug:
		return typeBugStyle.Render(tickType)
	case tick.TypeFeature:
		return typeFeatureStyle.Render(tickType)
	default:
		return tickType
	}
}

// describeRequires returns a human-readable description for a requires value.
func describeRequires(requires string) string {
	switch requires {
	case tick.RequiresApproval:
		return "Requires human approval before closing"
	case tick.RequiresReview:
		return "Requires code review before closing"
	case tick.RequiresContent:
		return "Requires content review before closing"
	default:
		return "Requires: " + requires
	}
}

// describeAwaiting returns a human-readable description for an awaiting value.
func describeAwaiting(awaiting string) string {
	switch awaiting {
	case tick.AwaitingWork:
		return "Awaiting manual work (not automatable)"
	case tick.AwaitingApproval:
		return "Awaiting human approval"
	case tick.AwaitingInput:
		return "Awaiting human input"
	case tick.AwaitingReview:
		return "Awaiting code review"
	case tick.AwaitingContent:
		return "Awaiting content review"
	case tick.AwaitingEscalation:
		return "Awaiting escalation/help"
	case tick.AwaitingCheckpoint:
		return "Awaiting checkpoint review"
	default:
		return "Awaiting: " + awaiting
	}
}

// describeVerdict returns a human-readable description for a verdict value.
func describeVerdict(verdict string) string {
	switch verdict {
	case tick.VerdictApproved:
		return "Approved ✓"
	case tick.VerdictRejected:
		return "Rejected ✗"
	default:
		return "Verdict: " + verdict
	}
}

// splitRoots partitions ticks into root rows and a parent→children map. Ticks
// whose parent is absent from the set are promoted to roots.
func splitRoots(ticks []tick.Tick) ([]tick.Tick, map[string][]tick.Tick) {
	children := make(map[string][]tick.Tick)
	var roots []tick.Tick

	byID := make(map[string]tick.Tick)
	for _, t := range ticks {
		byID[t.ID] = t
	}

	for _, t := range ticks {
		if t.Parent != "" {
			children[t.Parent] = append(children[t.Parent], t)
			continue
		}
		roots = append(roots, t)
	}

	for parent, kids := range children {
		if _, ok := byID[parent]; ok {
			continue
		}
		roots = append(roots, kids...)
		delete(children, parent)
	}

	return roots, children
}

// wrapAndIndent wraps text to fit within width and indents each line.
func wrapAndIndent(value string, spaces int, width int) []string {
	prefix := strings.Repeat(" ", spaces)
	wrapWidth := width - spaces
	if wrapWidth < 10 {
		wrapWidth = 10
	}

	// Use lipgloss to wrap text
	wrapped := lipgloss.NewStyle().Width(wrapWidth).Render(value)
	lines := splitLines(wrapped)
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		out = append(out, prefix+line)
	}
	return out
}

// truncate clips a string to width visible cells, appending "." when cut.
func truncate(value string, width int) string {
	if width <= 0 {
		return ""
	}
	return ansi.Truncate(value, width, ".")
}

// splitLines splits a string on newlines, trimming a trailing newline and
// returning nil for empty input.
func splitLines(value string) []string {
	value = strings.TrimRight(value, "\n")
	if value == "" {
		return nil
	}
	return strings.Split(value, "\n")
}
