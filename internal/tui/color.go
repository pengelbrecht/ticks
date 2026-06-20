package tui

import (
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

// PinColorProfile fixes the lipgloss/termenv color profile process-wide. It
// replaces the old `COLORTERM=truecolor` init() hack in model.go with an
// explicit, test-pinnable seam (§11 determinism pins): production pins
// TrueColor so terminals that misreport (e.g. TERM=screen under tmux) still get
// full color; tests pin a fixed profile so ANSI output does not vary by
// environment.
//
//	tui.PinColorProfile(termenv.TrueColor) // production
//	tui.PinColorProfile(termenv.Ascii)     // golden tests (no ANSI noise)
func PinColorProfile(p termenv.Profile) {
	lipgloss.SetColorProfile(p)
}
