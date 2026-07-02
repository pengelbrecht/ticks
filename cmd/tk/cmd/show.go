package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var showCmd = &cobra.Command{
	Use:   "show <id>",
	Short: "Show details of a tick",
	Long: `Show the full details of a tick by its ID.

Displays all tick metadata including title, description, notes, labels,
blockers, and timestamps. Use --json for machine-readable output.`,
	Args: cobra.ExactArgs(1),
	RunE: runShow,
}

var showJSON bool

func init() {
	showCmd.Flags().BoolVar(&showJSON, "json", false, "output as JSON")
	rootCmd.AddCommand(showCmd)
}

func runShow(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		return fmt.Errorf("failed to detect project: %w", err)
	}

	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		return fmt.Errorf("failed to read tick: %w", err)
	}

	if showJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	// Check if tick is blocked
	isBlocked := false
	if len(t.BlockedBy) > 0 {
		allTicks, _ := store.List()
		openTicks := make(map[string]bool)
		for _, tk := range allTicks {
			if tk.Status != tick.StatusClosed {
				openTicks[tk.ID] = true
			}
		}
		for _, blockerID := range t.BlockedBy {
			if openTicks[blockerID] {
				isBlocked = true
				break
			}
		}
	}

	// Build content
	var lines []string

	// Header line: ID  Priority  Type  Status  @owner
	header := fmt.Sprintf("%s  %s  %s  %s  %s",
		styles.RenderID(t.ID),
		styles.RenderPriority(t.Priority),
		styles.RenderType(t.Type),
		styles.RenderTickStatusWithBlocked(t, isBlocked),
		styles.RenderOwner(t.Owner),
	)
	lines = append(lines, header)
	lines = append(lines, "")

	// Title
	lines = append(lines, styles.BoldStyle.Render(t.Title))
	lines = append(lines, "")

	// Content width for wrapping (box width minus borders and padding)
	const boxWidth = 76
	const indent = "  "

	// Description
	if strings.TrimSpace(t.Description) != "" {
		lines = append(lines, styles.RenderHeader("Description:"))
		lines = append(lines, wrapText(t.Description, boxWidth, indent)...)
		lines = append(lines, "")
	}

	// Notes
	if strings.TrimSpace(t.Notes) != "" {
		lines = append(lines, styles.RenderHeader("Notes:"))
		lines = append(lines, wrapText(t.Notes, boxWidth, indent)...)
		lines = append(lines, "")
	}

	// Acceptance Criteria
	if strings.TrimSpace(t.AcceptanceCriteria) != "" {
		lines = append(lines, styles.RenderHeader("Acceptance Criteria:"))
		lines = append(lines, wrapText(t.AcceptanceCriteria, boxWidth, indent)...)
		lines = append(lines, "")
	}

	// Metadata section
	if len(t.Labels) > 0 {
		lines = append(lines, styles.RenderLabel("Labels:")+"  "+strings.Join(t.Labels, ", "))
	}
	if len(t.BlockedBy) > 0 {
		var blocked []string
		for _, blocker := range t.BlockedBy {
			blk, err := store.Read(blocker)
			if err != nil {
				blocked = append(blocked, fmt.Sprintf("%s (unknown)", blocker))
				continue
			}
			blocked = append(blocked, fmt.Sprintf("%s (%s)", blocker, blk.Status))
		}
		lines = append(lines, styles.RenderLabel("Blocked by:")+"  "+strings.Join(blocked, ", "))
	}
	if len(t.After) > 0 {
		var after []string
		for _, target := range t.After {
			at, err := store.Read(target)
			if err != nil {
				after = append(after, fmt.Sprintf("%s (unknown)", target))
				continue
			}
			after = append(after, fmt.Sprintf("%s (%s)", target, at.Status))
		}
		lines = append(lines, styles.RenderLabel("After:")+"  "+strings.Join(after, ", "))
	}
	if t.Parent != "" {
		lines = append(lines, styles.RenderLabel("Parent:")+"  "+t.Parent)
	}
	if t.Role != "" {
		lines = append(lines, styles.RenderLabel("Role:")+"  "+t.Role+" (epic process tick)")
	}
	if t.Type == tick.TypeEpic && strings.TrimSpace(t.BaseBranch) != "" {
		lines = append(lines, styles.RenderLabel("Base branch:")+"  "+t.BaseBranch)
	}
	if t.DeferUntil != nil {
		lines = append(lines, styles.RenderLabel("Deferred:")+"  "+t.DeferUntil.Format("2006-01-02"))
	}
	if strings.TrimSpace(t.ExternalRef) != "" {
		lines = append(lines, styles.RenderLabel("External:")+"  "+t.ExternalRef)
	}

	// Timestamps
	lines = append(lines, "")
	lines = append(lines, styles.RenderDim(fmt.Sprintf("Created: %s by %s", formatTime(t.CreatedAt), t.CreatedBy)))
	lines = append(lines, styles.RenderDim(fmt.Sprintf("Updated: %s", formatTime(t.UpdatedAt))))
	lines = append(lines, styles.RenderDim(fmt.Sprintf("Global:  %s:%s", project, t.ID)))

	// Render in box
	content := strings.Join(lines, "\n")
	box := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(styles.ColorGray).
		Padding(0, 1).
		Render(content)

	fmt.Println(box)
	return nil
}

// formatTime formats a time value for display.
func formatTime(t time.Time) string {
	if t.IsZero() {
		return "unknown"
	}
	return t.Format("2006-01-02 15:04")
}

// wrapText wraps text to fit within maxWidth, preserving existing newlines.
// Each line is prefixed with the given indent.
func wrapText(text string, maxWidth int, indent string) []string {
	var result []string
	contentWidth := maxWidth - len(indent)
	if contentWidth < 20 {
		contentWidth = 20
	}

	for _, paragraph := range strings.Split(text, "\n") {
		paragraph = strings.TrimSpace(paragraph)
		if paragraph == "" {
			result = append(result, indent)
			continue
		}

		words := strings.Fields(paragraph)
		if len(words) == 0 {
			result = append(result, indent)
			continue
		}

		line := indent + words[0]
		for _, word := range words[1:] {
			if len(line)+1+len(word) > maxWidth {
				result = append(result, line)
				line = indent + word
			} else {
				line += " " + word
			}
		}
		result = append(result, line)
	}
	return result
}
