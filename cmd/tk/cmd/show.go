package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
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

	fmt.Printf("%s  P%d %s  %s  @%s\n\n", t.ID, t.Priority, t.Type, t.Status, t.Owner)
	fmt.Printf("%s\n\n", t.Title)

	if strings.TrimSpace(t.Description) != "" {
		fmt.Println("Description:")
		fmt.Printf("  %s\n\n", t.Description)
	}

	if strings.TrimSpace(t.Notes) != "" {
		fmt.Println("Notes:")
		for _, line := range strings.Split(t.Notes, "\n") {
			fmt.Printf("  %s\n", line)
		}
		fmt.Println()
	}

	if len(t.Labels) > 0 {
		fmt.Printf("Labels: %s\n", strings.Join(t.Labels, ", "))
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
		fmt.Printf("Blocked by: %s\n", strings.Join(blocked, ", "))
	}
	if strings.TrimSpace(t.AcceptanceCriteria) != "" {
		fmt.Printf("Acceptance: %s\n", t.AcceptanceCriteria)
	}
	if t.DeferUntil != nil {
		fmt.Printf("Deferred until: %s\n", t.DeferUntil.Format("2006-01-02"))
	}
	if strings.TrimSpace(t.ExternalRef) != "" {
		fmt.Printf("External: %s\n", t.ExternalRef)
	}

	fmt.Printf("Created: %s by %s\n", formatTime(t.CreatedAt), t.CreatedBy)
	fmt.Printf("Updated: %s\n\n", formatTime(t.UpdatedAt))

	fmt.Printf("Global: %s:%s\n", project, t.ID)

	return nil
}

// formatTime formats a time value for display.
func formatTime(t time.Time) string {
	if t.IsZero() {
		return "unknown"
	}
	return t.Format("2006-01-02 15:04")
}
