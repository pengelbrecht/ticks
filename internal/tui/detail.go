package tui

import (
	"strings"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// detail is the right-hand pane: a READ-ONLY rendering of the highlighted tick
// (§6). The editable detail pane is a later tick; this stub establishes the seam
// (the App mirrors the focused view's selection here) without the edit surface.
type detail struct {
	tick    *tick.Tick
	width   int
	height  int
	yOffset int
}

// SetSize records the pane dimensions.
func (d *detail) SetSize(width, height int) {
	d.width = width
	d.height = height
}

// SetTick points the detail pane at a tick (nil clears it). Scrolling resets to
// the top on a new selection.
func (d *detail) SetTick(t *tick.Tick) {
	if t == nil || d.tick == nil || t.ID != d.tick.ID {
		d.yOffset = 0
	}
	d.tick = t
}

// scroll moves the detail viewport by delta lines (clamped).
func (d *detail) scroll(delta int) {
	d.yOffset += delta
	if d.yOffset < 0 {
		d.yOffset = 0
	}
}

// View renders the read-only detail body, scrolled by yOffset and clipped to
// the pane height.
func (d detail) View() string {
	if d.tick == nil {
		return dimStyle.Render("No tick selected")
	}
	content := buildDetailContent(*d.tick, d.width)
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
