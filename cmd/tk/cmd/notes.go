package cmd

import (
	"fmt"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var notesCmd = &cobra.Command{
	Use:   "notes <id>",
	Short: "Show notes for a tick",
	Long: `Show notes for a tick.

Examples:
  tk notes abc123`,
	Args: cobra.ExactArgs(1),
	RunE: runNotes,
}

func init() {
	rootCmd.AddCommand(notesCmd)
}

func runNotes(cmd *cobra.Command, args []string) error {
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
		return notFoundIfMissing("failed to read tick", err)
	}

	fmt.Printf("Notes for %s (%s):\n\n", t.ID, t.Title)
	fmt.Printf("%s\n", t.Notes)
	return nil
}
