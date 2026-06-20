package tui

import (
	"strings"

	"github.com/charmbracelet/x/ansi"
)

// overlay composites the foreground block fg onto the background bg, drawing
// each line of fg starting at visible column x and row y. The parts of every bg
// line to the LEFT and RIGHT of the fg block are preserved, so bg shows through
// around the box. The result keeps bg's line count and per-line width exactly:
// fg never grows or shrinks the canvas.
//
// Slicing is ANSI-aware via github.com/charmbracelet/x/ansi: StringWidth gives
// the visible width and Cut slices on visible columns without breaking escape
// sequences, so colored bg lines composite correctly. fg lines are assumed to
// be space-filled to their box width (opaque), cleanly covering bg underneath.
func overlay(bg, fg string, x, y int) string {
	bgLines := strings.Split(bg, "\n")
	fgLines := strings.Split(fg, "\n")

	for i, fgLine := range fgLines {
		row := y + i
		if row < 0 || row >= len(bgLines) {
			continue
		}
		bgLine := bgLines[row]
		bgWidth := ansi.StringWidth(bgLine)
		fgWidth := ansi.StringWidth(fgLine)

		// Left slice: bg columns [0, x). If x exceeds the bg line width, pad
		// with spaces so the fg block lands at the requested column.
		var left string
		if x <= bgWidth {
			left = ansi.Cut(bgLine, 0, x)
			if x > bgWidth {
				left += strings.Repeat(" ", x-bgWidth)
			}
		} else {
			left = bgLine + strings.Repeat(" ", x-bgWidth)
		}

		// Right slice: bg columns [x+fgWidth, bgWidth). Preserves bg content to
		// the right of the box so the backdrop is visible on that side.
		var right string
		if rightStart := x + fgWidth; rightStart < bgWidth {
			right = ansi.Cut(bgLine, rightStart, bgWidth)
		}

		bgLines[row] = left + fgLine + right
	}

	return strings.Join(bgLines, "\n")
}
