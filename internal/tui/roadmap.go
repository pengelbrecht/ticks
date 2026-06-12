package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// Roadmap status glyphs and colors. These parallel the existing status icon
// conventions in model.go but express the higher-level epic status enum from
// query.ComputeRoadmap.
//
//	done   — green  ✓  (same as StatusClosed)
//	active — blue   ●  (same as StatusInProgress)
//	ready  — gray   ○  (open, needs planning — matches the tk roadmap CLI
//	         convention; the "needs planning" annotation carries the meaning)
//	queued — gray   ○  (open, blocked by another open epic)
//	gated  — yellow ◐  (same as StatusAwaiting)
var (
	roadmapStatusDoneStyle   = styles.StatusClosedStyle     // green
	roadmapStatusActiveStyle = styles.StatusInProgressStyle // blue
	roadmapStatusReadyStyle  = styles.StatusOpenStyle       // gray (matches CLI)
	roadmapStatusQueuedStyle = styles.StatusOpenStyle       // gray
	roadmapStatusGatedStyle  = styles.StatusAwaitingStyle   // yellow

	roadmapWaveHeaderStyle = lipgloss.NewStyle().Bold(true).Foreground(styles.ColorPink)
	roadmapGateBadgeStyle  = lipgloss.NewStyle().Foreground(styles.ColorYellow)
	roadmapBlockedStyle    = lipgloss.NewStyle().Foreground(styles.ColorDim)
	// roadmapAfterStyle renders soft-ordering (After) edges. Softer than
	// roadmapBlockedStyle: After is a preference, never a constraint, so it
	// gets the dimmer Overlay0 gray.
	roadmapAfterStyle    = lipgloss.NewStyle().Foreground(styles.ColorGray)
	roadmapProgressStyle = lipgloss.NewStyle().Foreground(styles.ColorDim)
	roadmapIDStyle       = lipgloss.NewStyle().Foreground(styles.ColorSubtext)
)

// roadmapStatusGlyphChar returns the uncolored status glyph character for the
// given roadmap epic status. Used for the selected line, which is styled as a
// whole by the tree's selection style instead of per-segment colors.
func roadmapStatusGlyphChar(status string) string {
	switch status {
	case "done":
		return styles.IconClosed
	case "active":
		return styles.IconInProgress
	case "ready", "queued":
		return styles.IconOpen
	case "gated":
		return styles.IconAwaiting
	default:
		return status
	}
}

// renderRoadmapStatusGlyph returns a colored status glyph for the given
// roadmap epic status.
func renderRoadmapStatusGlyph(status string) string {
	switch status {
	case "done":
		return roadmapStatusDoneStyle.Render(styles.IconClosed)
	case "active":
		return roadmapStatusActiveStyle.Render(styles.IconInProgress)
	case "ready":
		return roadmapStatusReadyStyle.Render(styles.IconOpen)
	case "queued":
		return roadmapStatusQueuedStyle.Render(styles.IconOpen)
	case "gated":
		return roadmapStatusGatedStyle.Render(styles.IconAwaiting)
	default:
		return status
	}
}

// RenderRoadmap renders the roadmap view for the left pane. It takes the full
// tick slice (to call ComputeRoadmap) and the available width for the pane.
// The function is pure (no model state) so it is trivially unit-testable.
//
// Visual layout per epic line:
//
//	<glyph> <id>  [closed/total] <title> [gate-badge] [← blocked by: id1 id2] [← after: id1 id2]
//
// Each wave is preceded by a "Wave N" header (1-indexed).
func RenderRoadmap(allTicks []tick.Tick, width int) string {
	content, _ := RenderRoadmapWithSelection(allTicks, width, "")
	return content
}

// RenderRoadmapWithSelection renders the roadmap like RenderRoadmap, but the
// epic whose ID matches selectedID gets a "> " cursor and the tree's selection
// style; all other lines keep their per-segment styles (status glyph, blocked
// and after annotations) untouched. It also returns the 0-based content line
// index of the selected epic line (-1 when nothing is selected) so callers can
// scroll it into view.
func RenderRoadmapWithSelection(allTicks []tick.Tick, width int, selectedID string) (string, int) {
	roadmap := query.ComputeRoadmap(allTicks)

	if len(roadmap.Waves) == 0 {
		return dimStyle.Render("No epics found"), -1
	}

	var lines []string
	selectedLine := -1

	for waveIdx, wave := range roadmap.Waves {
		// Wave header
		header := roadmapWaveHeaderStyle.Render(fmt.Sprintf("Wave %d", waveIdx+1))
		lines = append(lines, header)

		for _, epic := range wave {
			selected := selectedID != "" && epic.ID == selectedID
			if selected {
				selectedLine = len(lines)
			}
			line := renderRoadmapEpicLine(epic, width, selected)
			lines = append(lines, line)
		}

		// Blank line between waves (except after the last one)
		if waveIdx < len(roadmap.Waves)-1 {
			lines = append(lines, "")
		}
	}

	return strings.Join(lines, "\n"), selectedLine
}

// roadmapEpicOrder returns all epic IDs in roadmap order (wave by wave, the
// same order RenderRoadmap draws them). The TUI uses it to drive the
// roadmap-mode selection cursor.
func roadmapEpicOrder(allTicks []tick.Tick) []string {
	roadmap := query.ComputeRoadmap(allTicks)
	var ids []string
	for _, wave := range roadmap.Waves {
		for _, epic := range wave {
			ids = append(ids, epic.ID)
		}
	}
	return ids
}

// renderRoadmapEpicLine renders one epic line within the roadmap.
// Format:
//
//	<glyph> <id>  [closed/total]  <title>  [gate:<type>]  (needs planning)  [← blocked by: id1 id2]  [← after: id1 id2]
//
// The after annotation marks soft-ordering (After) edges and is rendered in
// a more muted style than the blocked-by annotation; it is omitted when the
// epic has no After targets.
//
// When selected, the two-space indent becomes a "> " cursor and the whole
// line is rendered with the tree's selection style (per-segment styles are
// skipped: their reset sequences would cut the highlight off mid-line).
func renderRoadmapEpicLine(epic query.RoadmapEpic, width int, selected bool) string {
	progress := fmt.Sprintf("[%d/%d]", epic.ChildrenClosed, epic.ChildrenTotal)

	// Gate badge: only for gated status
	gateBadge := ""
	if epic.Status == "gated" && epic.AwaitingType != "" {
		gateBadge = fmt.Sprintf("[gate:%s]", epic.AwaitingType)
	}

	// Needs-planning annotation: only for ready status (consumer-facing,
	// matches "(needs planning)" in tk roadmap and the web "Needs planning" badge).
	needsPlanning := ""
	if epic.Status == "ready" {
		needsPlanning = "(needs planning)"
	}

	// Blocked-by annotation
	blockedAnnotation := ""
	if len(epic.BlockedBy) > 0 {
		blockedAnnotation = fmt.Sprintf("← blocked by: %s", strings.Join(epic.BlockedBy, " "))
	}

	// After annotation: soft-ordering edges, more muted than blocked-by
	afterAnnotation := ""
	if len(epic.After) > 0 {
		afterAnnotation = fmt.Sprintf("← after: %s", strings.Join(epic.After, " "))
	}

	if selected {
		line := joinRoadmapLine("> ",
			roadmapStatusGlyphChar(epic.Status), epic.ID, progress, epic.Title,
			gateBadge, needsPlanning, blockedAnnotation, afterAnnotation)
		return selectedStyle.Render(truncate(line, width))
	}

	// Indented two spaces to sit under the Wave header
	line := joinRoadmapLine("  ",
		renderRoadmapStatusGlyph(epic.Status),
		roadmapIDStyle.Render(epic.ID),
		roadmapProgressStyle.Render(progress),
		dimStyle.Render(epic.Title), // default dim style (matches tree view)
		styleIfNonEmpty(roadmapGateBadgeStyle, gateBadge),
		styleIfNonEmpty(roadmapStatusReadyStyle, needsPlanning),
		styleIfNonEmpty(roadmapBlockedStyle, blockedAnnotation),
		styleIfNonEmpty(roadmapAfterStyle, afterAnnotation))

	return truncate(line, width)
}

// joinRoadmapLine assembles an epic line from its (possibly pre-styled)
// segments, skipping empty optional annotations so no stray spaces appear.
func joinRoadmapLine(prefix, glyph, id, progress, title string, optional ...string) string {
	line := prefix + glyph + " " + id + " " + progress + " " + title
	for _, seg := range optional {
		if seg != "" {
			line += " " + seg
		}
	}
	return line
}

// styleIfNonEmpty renders s with the given style, or returns "" when s is
// empty so absent annotations vanish entirely from the assembled line.
func styleIfNonEmpty(style lipgloss.Style, s string) string {
	if s == "" {
		return ""
	}
	return style.Render(s)
}
