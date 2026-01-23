// Package styles provides shared terminal styling for tk commands.
// Uses Catppuccin Mocha color palette with lipgloss.
//
// Brand fonts (for web/marketing):
//   - Geist: Headings & body text (https://vercel.com/font)
//   - Geist Mono: Code, CLI, logo
//
// See logos/brand.html for full brand guidelines.
package styles

import (
	"github.com/charmbracelet/lipgloss"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Catppuccin Mocha color palette
const (
	// Accent colors
	ColorRed     = lipgloss.Color("#F38BA8") // Red
	ColorPeach   = lipgloss.Color("#FAB387") // Peach
	ColorYellow  = lipgloss.Color("#F9E2AF") // Yellow
	ColorGreen   = lipgloss.Color("#A6E3A1") // Green (primary brand color)
	ColorTeal    = lipgloss.Color("#94E2D5") // Teal
	ColorBlue    = lipgloss.Color("#89DCEB") // Sky
	ColorPurple  = lipgloss.Color("#CBA6F7") // Mauve
	ColorPink    = lipgloss.Color("#F5C2E7") // Pink

	// Text colors
	ColorText    = lipgloss.Color("#CDD6F4") // Text
	ColorSubtext = lipgloss.Color("#A6ADC8") // Subtext0
	ColorDim     = lipgloss.Color("#7F849C") // Overlay1
	ColorGray    = lipgloss.Color("#6C7086") // Overlay0

	// Background colors
	ColorSurface = lipgloss.Color("#313244") // Surface0
	ColorBase    = lipgloss.Color("#1E1E2E") // Base
	ColorMantle  = lipgloss.Color("#181825") // Mantle
	ColorCrust   = lipgloss.Color("#11111B") // Crust
)

// Status icons (aligned with web UI)
const (
	IconOpen       = "○"
	IconInProgress = "●"
	IconClosed     = "✓"
	IconAwaiting   = "◐"
	IconBlocked    = "⊘"
	IconManual     = "👤"
	IconPending    = "⏳"
)

// Verification icons
const (
	IconVerified = "✓"
	IconFailed   = "✗"
	IconPendingV = "⋯"
)

// Base styles
var (
	HeaderStyle = lipgloss.NewStyle().Bold(true).Foreground(ColorPink)
	LabelStyle  = lipgloss.NewStyle().Foreground(ColorDim).Width(12)
	DimStyle    = lipgloss.NewStyle().Foreground(ColorSubtext)
	BoldStyle   = lipgloss.NewStyle().Bold(true)
	Yellow      = lipgloss.NewStyle().Foreground(ColorYellow)
	Dim         = lipgloss.NewStyle().Foreground(ColorDim)
)

// Priority styles (aligned with web UI)
// P0=Critical(red), P1=High(peach), P2=Medium(yellow), P3=Low(green), P4=Backlog(gray)
var (
	PriorityP0Style = lipgloss.NewStyle().Foreground(ColorRed).Bold(true)
	PriorityP1Style = lipgloss.NewStyle().Foreground(ColorPeach)
	PriorityP2Style = lipgloss.NewStyle().Foreground(ColorYellow)
	PriorityP3Style = lipgloss.NewStyle().Foreground(ColorGreen)
	PriorityP4Style = lipgloss.NewStyle().Foreground(ColorSubtext)
)

// Status styles
var (
	StatusOpenStyle       = lipgloss.NewStyle().Foreground(ColorGray)
	StatusInProgressStyle = lipgloss.NewStyle().Foreground(ColorBlue)
	StatusClosedStyle     = lipgloss.NewStyle().Foreground(ColorGreen)
	StatusAwaitingStyle   = lipgloss.NewStyle().Foreground(ColorYellow)
	StatusBlockedStyle    = lipgloss.NewStyle().Foreground(ColorRed)
)

// Type styles
var (
	TypeEpicStyle    = lipgloss.NewStyle().Foreground(ColorPurple)
	TypeBugStyle     = lipgloss.NewStyle().Foreground(ColorRed)
	TypeFeatureStyle = lipgloss.NewStyle().Foreground(ColorTeal)
	TypeTaskStyle    = lipgloss.NewStyle().Foreground(ColorSubtext)
	TypeChoreStyle   = lipgloss.NewStyle().Foreground(ColorGray)
)

// Verdict styles
var (
	VerdictApprovedStyle = lipgloss.NewStyle().Foreground(ColorGreen)
	VerdictRejectedStyle = lipgloss.NewStyle().Foreground(ColorRed)
)

// Box styles for show command
var (
	BoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorGray).
			Padding(0, 1)
	BoxFocusedStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(ColorBlue).
			Padding(0, 1)
)

// RenderPriority returns a color-coded priority string.
func RenderPriority(priority int) string {
	label := "P" + string(rune('0'+priority))
	switch priority {
	case 0:
		return PriorityP0Style.Render(label)
	case 1:
		return PriorityP1Style.Render(label)
	case 2:
		return PriorityP2Style.Render(label)
	case 3:
		return PriorityP3Style.Render(label)
	default:
		return PriorityP4Style.Render(label)
	}
}

// RenderStatus returns a color-coded status symbol.
func RenderStatus(status string) string {
	switch status {
	case tick.StatusOpen:
		return StatusOpenStyle.Render(IconOpen)
	case tick.StatusInProgress:
		return StatusInProgressStyle.Render(IconInProgress)
	case tick.StatusClosed:
		return StatusClosedStyle.Render(IconClosed)
	default:
		return status
	}
}

// RenderStatusWithLabel returns a color-coded status icon plus text.
func RenderStatusWithLabel(status string) string {
	switch status {
	case tick.StatusOpen:
		return StatusOpenStyle.Render(IconOpen + " " + status)
	case tick.StatusInProgress:
		return StatusInProgressStyle.Render(IconInProgress + " " + status)
	case tick.StatusClosed:
		return StatusClosedStyle.Render(IconClosed + " " + status)
	default:
		return status
	}
}

// RenderTickStatus returns a color-coded status symbol for a tick,
// accounting for awaiting state. Awaiting ticks show yellow half-circle.
func RenderTickStatus(t tick.Tick) string {
	if t.IsAwaitingHuman() {
		return StatusAwaitingStyle.Render(IconAwaiting)
	}
	return RenderStatus(t.Status)
}

// RenderTickStatusWithBlocked returns a color-coded status icon for a tick,
// accounting for workflow state priority:
// 1. Awaiting human -> yellow half-circle
// 2. Blocked -> red no-entry
// 3. Status (open/in_progress/closed)
func RenderTickStatusWithBlocked(t tick.Tick, isBlocked bool) string {
	if t.IsAwaitingHuman() {
		return StatusAwaitingStyle.Render(IconAwaiting)
	}
	if t.Status == tick.StatusOpen && isBlocked {
		return StatusBlockedStyle.Render(IconBlocked)
	}
	return RenderStatus(t.Status)
}

// RenderType returns a color-coded type string.
func RenderType(tickType string) string {
	switch tickType {
	case tick.TypeEpic:
		return TypeEpicStyle.Render(tickType)
	case tick.TypeBug:
		return TypeBugStyle.Render(tickType)
	case tick.TypeFeature:
		return TypeFeatureStyle.Render(tickType)
	case tick.TypeTask:
		return TypeTaskStyle.Render(tickType)
	case tick.TypeChore:
		return TypeChoreStyle.Render(tickType)
	default:
		return tickType
	}
}

// RenderVerdict returns a color-coded verdict string.
func RenderVerdict(verdict string) string {
	switch verdict {
	case tick.VerdictApproved:
		return VerdictApprovedStyle.Render(verdict)
	case tick.VerdictRejected:
		return VerdictRejectedStyle.Render(verdict)
	default:
		return verdict
	}
}

// RenderID returns a styled tick ID.
func RenderID(id string) string {
	return BoldStyle.Render(id)
}

// RenderOwner returns a styled owner string with @ prefix.
func RenderOwner(owner string) string {
	return DimStyle.Render("@" + owner)
}

// RenderLabel renders a label with fixed width.
func RenderLabel(label string) string {
	return LabelStyle.Render(label)
}

// RenderHeader renders a section header.
func RenderHeader(text string) string {
	return HeaderStyle.Render(text)
}

// RenderDim renders text in dim style.
func RenderDim(text string) string {
	return DimStyle.Render(text)
}
