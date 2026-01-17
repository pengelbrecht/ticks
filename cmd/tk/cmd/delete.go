package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var deleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a tick",
	Long: `Delete a tick permanently.

By default, a confirmation prompt is shown before deleting.
Use --force to skip the confirmation.

Examples:
  tk delete abc123         # Delete tick (with confirmation)
  tk delete abc123 --force # Delete without confirmation`,
	Args: cobra.ExactArgs(1),
	RunE: runDelete,
}

var deleteForce bool

func init() {
	deleteCmd.Flags().BoolVar(&deleteForce, "force", false, "skip confirmation")

	rootCmd.AddCommand(deleteCmd)
}

func runDelete(cmd *cobra.Command, args []string) error {
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

	if !deleteForce {
		fmt.Printf("Delete %s? (y/N): ", id)
		var response string
		if _, err := fmt.Fscanln(os.Stdin, &response); err != nil || strings.ToLower(strings.TrimSpace(response)) != "y" {
			fmt.Println("Aborted.")
			return nil
		}
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	if err := store.Delete(id); err != nil {
		return fmt.Errorf("failed to delete tick: %w", err)
	}

	// Cleanup references in other ticks
	ticks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	for _, t := range ticks {
		updated := removeString(t.BlockedBy, id)
		if len(updated) == len(t.BlockedBy) {
			continue
		}
		t.BlockedBy = updated
		t.UpdatedAt = time.Now().UTC()
		if err := store.Write(t); err != nil {
			return fmt.Errorf("failed to update tick: %w", err)
		}
	}

	fmt.Printf("Deleted %s\n", id)
	return nil
}
