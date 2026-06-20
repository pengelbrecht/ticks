package tui

// layoutMode is the number of panes the shell shows at once (§3). The three
// pieces (nav / main / detail) are constant all the way down; only how many are
// visible at once changes with terminal width.
type layoutMode int

const (
	// layoutThree shows nav │ main │ detail (wide terminals).
	layoutThree layoutMode = iota
	// layoutTwo shows nav │ (main or detail). Enter swaps main→detail.
	layoutTwo
	// layoutOne shows a single pane; the sidebar collapses to an overlay
	// summoned by a key.
	layoutOne
)

// Width thresholds (§3): wide ≥120, medium ≥80, else narrow. These are the
// breakpoints the root model uses to pick the pane count.
const (
	widthThreeMin = 120 // nav │ main │ detail
	widthTwoMin   = 80  // nav │ (main|detail)
)

// Pane sizing constants.
const (
	sidebarWidth = 28 // fixed nav column width in 2/3-pane layouts
	minMainWidth = 24 // floor for the main content column
	detailRatio  = 36 // detail column target width in the 3-pane layout
)

// modeForWidth maps a terminal width to the adaptive pane count (§3).
func modeForWidth(width int) layoutMode {
	switch {
	case width >= widthThreeMin:
		return layoutThree
	case width >= widthTwoMin:
		return layoutTwo
	default:
		return layoutOne
	}
}

// paneRect is a computed pane geometry: its content width/height (inside any
// border/padding the caller adds) and whether it is shown at all.
type paneRect struct {
	width  int
	height int
	show   bool
}

// layout is the resolved geometry for the three zones at a given terminal size.
type layout struct {
	mode    layoutMode
	sidebar paneRect
	main    paneRect
	detail  paneRect
}

// computeLayout resolves the three-zone geometry for a terminal of the given
// size, with detailVisible controlling whether the detail pane is shown in the
// 2-pane (medium) and 1-pane (narrow) modes — in those modes only one of
// main/detail is on screen at a time.
//
// width/height are the full terminal dimensions. The returned pane widths are
// the column widths allotted to each zone (callers subtract their own
// border/padding). Heights are the body height (full terminal height minus the
// footer line) for every visible pane.
func computeLayout(width, height int, detailVisible bool) layout {
	mode := modeForWidth(width)

	bodyHeight := height - 1 // reserve one line for the footer/help strip
	if bodyHeight < 1 {
		bodyHeight = 1
	}

	l := layout{mode: mode}

	switch mode {
	case layoutThree:
		detailW := detailRatio
		// Keep detail to at most ~40% of the screen so the list stays usable.
		if detailW > width*2/5 {
			detailW = width * 2 / 5
		}
		mainW := width - sidebarWidth - detailW
		if mainW < minMainWidth {
			mainW = minMainWidth
		}
		l.sidebar = paneRect{width: sidebarWidth, height: bodyHeight, show: true}
		l.main = paneRect{width: mainW, height: bodyHeight, show: true}
		l.detail = paneRect{width: width - sidebarWidth - mainW, height: bodyHeight, show: true}

	case layoutTwo:
		mainW := width - sidebarWidth
		if mainW < minMainWidth {
			mainW = minMainWidth
		}
		l.sidebar = paneRect{width: sidebarWidth, height: bodyHeight, show: true}
		if detailVisible {
			l.detail = paneRect{width: mainW, height: bodyHeight, show: true}
		} else {
			l.main = paneRect{width: mainW, height: bodyHeight, show: true}
		}

	default: // layoutOne
		if detailVisible {
			l.detail = paneRect{width: width, height: bodyHeight, show: true}
		} else {
			l.main = paneRect{width: width, height: bodyHeight, show: true}
		}
	}

	return l
}
