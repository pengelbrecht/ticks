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
	roadmapProgressStyle   = lipgloss.NewStyle().Foreground(styles.ColorDim)
	roadmapIDStyle         = lipgloss.NewStyle().Foreground(styles.ColorSubtext)
)

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
//	<glyph> <id>  [closed/total] <title> [gate-badge] [← blocked by: id1 id2]
//
// Each wave is preceded by a "Wave N" header (1-indexed).
func RenderRoadmap(allTicks []tick.Tick, width int) string {
	roadmap := query.ComputeRoadmap(allTicks)

	if len(roadmap.Waves) == 0 {
		return dimStyle.Render("No epics found")
	}

	var lines []string

	for waveIdx, wave := range roadmap.Waves {
		// Wave header
		header := roadmapWaveHeaderStyle.Render(fmt.Sprintf("Wave %d", waveIdx+1))
		lines = append(lines, header)

		for _, epic := range wave {
			line := renderRoadmapEpicLine(epic, width)
			lines = append(lines, line)
		}

		// Blank line between waves (except after the last one)
		if waveIdx < len(roadmap.Waves)-1 {
			lines = append(lines, "")
		}
	}

	return strings.Join(lines, "\n")
}

// renderRoadmapEpicLine renders one epic line within the roadmap.
// Format:
//
//	<glyph> <id>  [closed/total]  <title>  [gate:<type>]  (needs planning)  [← blocked by: id1 id2]
func renderRoadmapEpicLine(epic query.RoadmapEpic, width int) string {
	glyph := renderRoadmapStatusGlyph(epic.Status)

	id := roadmapIDStyle.Render(epic.ID)

	progress := roadmapProgressStyle.Render(
		fmt.Sprintf("[%d/%d]", epic.ChildrenClosed, epic.ChildrenTotal),
	)

	// Title in default dim style (matches tree view)
	title := dimStyle.Render(epic.Title)

	// Gate badge: only for gated status
	gateBadge := ""
	if epic.Status == "gated" && epic.AwaitingType != "" {
		gateBadge = " " + roadmapGateBadgeStyle.Render(fmt.Sprintf("[gate:%s]", epic.AwaitingType))
	}

	// Needs-planning annotation: only for ready status (consumer-facing,
	// matches "(needs planning)" in tk roadmap and the web "Needs planning" badge).
	needsPlanning := ""
	if epic.Status == "ready" {
		needsPlanning = " " + roadmapStatusReadyStyle.Render("(needs planning)")
	}

	// Blocked-by annotation
	blockedAnnotation := ""
	if len(epic.BlockedBy) > 0 {
		blockedAnnotation = " " + roadmapBlockedStyle.Render(
			fmt.Sprintf("← blocked by: %s", strings.Join(epic.BlockedBy, " ")),
		)
	}

	// Indented two spaces to sit under the Wave header
	line := fmt.Sprintf("  %s %s %s %s%s%s%s",
		glyph, id, progress, title, gateBadge, needsPlanning, blockedAnnotation)

	return truncate(line, width)
}
