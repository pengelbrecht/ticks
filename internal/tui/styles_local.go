package tui

import (
	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/styles"
)

// TUI-specific layout styles (the panel chrome and footer) shared by the App
// shell and the content views.
var (
	panelStyle        = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(styles.ColorGray).Padding(0, 1)
	panelFocusedStyle = lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).BorderForeground(styles.ColorBlue).Padding(0, 1)
	selectedStyle     = lipgloss.NewStyle().Foreground(styles.ColorBlue).Bold(true)
	footerStyle       = lipgloss.NewStyle().Foreground(styles.ColorDim)

	// paletteBackdropStyle dims the composed frame rendered behind the command
	// palette modal so the box pops. Faint is width-neutral (an SGR attribute,
	// no extra columns) and is a no-op under the Ascii profile the goldens pin.
	paletteBackdropStyle = lipgloss.NewStyle().Faint(true)
)

// Aliases for shared styles, referenced by the content views and render
// helpers in this package.
var (
	headerStyle           = styles.HeaderStyle
	dimStyle              = styles.DimStyle
	labelStyle            = styles.LabelStyle
	statusOpenStyle       = styles.StatusOpenStyle
	statusInProgressStyle = styles.StatusInProgressStyle
	statusClosedStyle     = styles.StatusClosedStyle
	statusAwaitingStyle   = styles.StatusAwaitingStyle
	statusBlockedStyle    = styles.StatusBlockedStyle
	typeEpicStyle         = styles.TypeEpicStyle
	typeBugStyle          = styles.TypeBugStyle
	typeFeatureStyle      = styles.TypeFeatureStyle
	verdictApprovedStyle  = styles.VerdictApprovedStyle
	verdictRejectedStyle  = styles.VerdictRejectedStyle
)
