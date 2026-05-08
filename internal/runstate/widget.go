package runstate

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
)

// Catppuccin Mocha palette (shared with styles package).
var (
	colorGreen  = lipgloss.Color("#A6E3A1")
	colorRed    = lipgloss.Color("#F38BA8")
	colorYellow = lipgloss.Color("#F9E2AF")
	colorBlue   = lipgloss.Color("#89DCEB")
	colorPeach  = lipgloss.Color("#FAB387")
	colorPurple = lipgloss.Color("#CBA6F7")
	colorPink   = lipgloss.Color("#F5C2E7")
	colorDim    = lipgloss.Color("#7F849C")
	colorGray   = lipgloss.Color("#6C7086")
	colorText   = lipgloss.Color("#CDD6F4")
)

// Widget styles.
var (
	wBorder = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(colorGray).
		Padding(0, 1)

	wHeader  = lipgloss.NewStyle().Bold(true).Foreground(colorPink)
	wLabel   = lipgloss.NewStyle().Foreground(colorDim)
	wDim     = lipgloss.NewStyle().Foreground(colorDim)
	wBold    = lipgloss.NewStyle().Bold(true).Foreground(colorText)
	wGreen   = lipgloss.NewStyle().Foreground(colorGreen)
	wRed     = lipgloss.NewStyle().Foreground(colorRed)
	wYellow  = lipgloss.NewStyle().Foreground(colorYellow)
	wBlue    = lipgloss.NewStyle().Foreground(colorBlue)
	wPeach   = lipgloss.NewStyle().Foreground(colorPeach)
	wPurple  = lipgloss.NewStyle().Foreground(colorPurple)

	wProgressFull  = lipgloss.NewStyle().Foreground(colorGreen)
	wProgressEmpty = lipgloss.NewStyle().Foreground(colorGray)
)

// RenderWidget renders a compact, single-panel status widget for a Tickflow
// run. The widget shows phase, progress, task states, budget, and the most
// recent signal. It is designed for inline terminal display during `tk run`.
//
// width controls the outer width. If 0, a default of 60 is used.
func RenderWidget(vm *ViewModel, width int) string {
	if width <= 0 {
		width = 60
	}
	// Inner content width (minus border + padding: 2 border + 2 padding = 4)
	inner := width - 4
	if inner < 30 {
		inner = 30
	}

	var lines []string

	// Header line: epic title + phase badge
	title := vm.EpicTitle
	if title == "" {
		title = vm.EpicID
	}
	phaseBadge := renderPhase(vm.Phase)
	titleMax := inner - lipgloss.Width(phaseBadge) - 1
	if lipgloss.Width(title) > titleMax {
		title = title[:titleMax-1] + "…"
	}
	lines = append(lines, wBold.Render(title)+" "+phaseBadge)

	// Progress bar
	lines = append(lines, renderProgress(vm.Progress(), inner))

	// Metrics row: tasks completed / total, wave, duration, cost
	total := len(vm.Tasks)
	metricsLine := fmt.Sprintf("%s %d/%d tasks  %s wave %d  %s %s",
		wGreen.Render("✓"),
		vm.Metrics.TasksCompleted,
		total,
		wBlue.Render("●"),
		vm.Wave,
		wDim.Render("⏱"),
		vm.Metrics.Duration.Truncate(time.Second),
	)
	if vm.Metrics.TotalCost > 0 {
		metricsLine += fmt.Sprintf("  %s $%.2f", wDim.Render("$"), vm.Metrics.TotalCost)
	}
	lines = append(lines, metricsLine)

	// Task state summary: running, awaiting, blocked, failed, remaining
	var stateParts []string
	runningCount := countTasks(vm.Tasks, TaskRunning)
	if runningCount > 0 {
		stateParts = append(stateParts, wPeach.Render(fmt.Sprintf("● %d running", runningCount)))
	}
	if vm.Metrics.TasksAwaiting > 0 {
		stateParts = append(stateParts, wYellow.Render(fmt.Sprintf("◐ %d awaiting", vm.Metrics.TasksAwaiting)))
	}
	if vm.Metrics.TasksBlocked > 0 {
		stateParts = append(stateParts, wRed.Render(fmt.Sprintf("⊘ %d blocked", vm.Metrics.TasksBlocked)))
	}
	if vm.Metrics.TasksFailed > 0 {
		stateParts = append(stateParts, wRed.Render(fmt.Sprintf("✗ %d failed", vm.Metrics.TasksFailed)))
	}
	if vm.Metrics.TasksRemaining > 0 {
		stateParts = append(stateParts, wDim.Render(fmt.Sprintf("○ %d ready", vm.Metrics.TasksRemaining)))
	}
	if len(stateParts) > 0 {
		lines = append(lines, strings.Join(stateParts, "  "))
	}

	// Active tasks (show what's running right now)
	for _, tid := range vm.ActiveTaskIDs {
		tv := vm.TaskByID(tid)
		if tv == nil {
			continue
		}
		taskLine := fmt.Sprintf("  %s %s", wPeach.Render("▶"), tv.Title)
		if tv.ActiveTool != nil {
			taskLine += wDim.Render(fmt.Sprintf(" [%s]", tv.ActiveTool.Name))
		}
		if tv.NumTurns > 0 {
			taskLine += wDim.Render(fmt.Sprintf(" t%d", tv.NumTurns))
		}
		lines = append(lines, taskLine)
	}

	// Budget line (only if limits are configured)
	budgetLine := renderBudget(vm.Budget)
	if budgetLine != "" {
		lines = append(lines, budgetLine)
	}

	// Context line (only during generation)
	if vm.Context.Status == "generating" {
		lines = append(lines, wPurple.Render("⟳ generating context...")+
			wDim.Render(fmt.Sprintf(" (%d tasks)", vm.Context.TaskCount)))
	}

	// Latest signal (most recent)
	if len(vm.Signals) > 0 {
		sig := vm.Signals[0]
		reason := sig.Reason
		if len(reason) > 50 {
			reason = reason[:47] + "..."
		}
		lines = append(lines, wYellow.Render("⚡ "+sig.Signal)+
			wDim.Render(fmt.Sprintf(" [%s] %s", sig.TaskID, reason)))
	}

	// Exit info
	if vm.Phase == PhaseDone {
		if vm.Error != "" {
			lines = append(lines, wRed.Render("✗ "+vm.Error))
		} else if vm.ExitReason != "" {
			lines = append(lines, wGreen.Render("→ "+vm.ExitReason))
		}
	}

	content := strings.Join(lines, "\n")
	return wBorder.Width(inner).Render(content)
}

// renderPhase returns a styled phase badge.
func renderPhase(p Phase) string {
	switch p {
	case PhaseStarting:
		return wDim.Render("[starting]")
	case PhaseContextGenerating:
		return wPurple.Render("[context]")
	case PhaseRunning:
		return wGreen.Render("[running]")
	case PhaseIdle:
		return wYellow.Render("[idle]")
	case PhaseWrapUp:
		return wPeach.Render("[wrap-up]")
	case PhaseDone:
		return wGreen.Render("[done]")
	default:
		return wDim.Render("[" + string(p) + "]")
	}
}

// renderProgress draws a progress bar using block characters.
func renderProgress(frac float64, width int) string {
	barWidth := width - 6 // space for "XXX% "
	if barWidth < 10 {
		barWidth = 10
	}
	filled := int(frac * float64(barWidth))
	if filled > barWidth {
		filled = barWidth
	}
	empty := barWidth - filled

	bar := wProgressFull.Render(strings.Repeat("█", filled)) +
		wProgressEmpty.Render(strings.Repeat("░", empty))
	pct := fmt.Sprintf("%3d%%", int(frac*100))
	return bar + " " + wDim.Render(pct)
}

// renderBudget shows budget consumption.
func renderBudget(b BudgetView) string {
	var parts []string

	if b.MaxIterations > 0 {
		rem := b.IterationsRemaining()
		style := wDim
		if rem <= 2 && rem >= 0 {
			style = wYellow
		}
		parts = append(parts, style.Render(fmt.Sprintf("iters %d/%d", b.IterationsUsed, b.MaxIterations)))
	}

	if b.MaxCost > 0 {
		rem := b.CostRemaining()
		style := wDim
		if rem >= 0 && rem < b.MaxCost*0.1 {
			style = wYellow
		}
		parts = append(parts, style.Render(fmt.Sprintf("cost $%.2f/$%.2f", b.CostUsed, b.MaxCost)))
	}

	if len(parts) == 0 {
		return ""
	}
	return wLabel.Render("Budget: ") + strings.Join(parts, "  ")
}

// countTasks counts tasks in a given state.
func countTasks(tasks []TaskView, state TaskState) int {
	n := 0
	for _, t := range tasks {
		if t.State == state {
			n++
		}
	}
	return n
}
