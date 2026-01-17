package cmd

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var blockCmd = &cobra.Command{
	Use:   "block <id> <blocker-id>",
	Short: "Add a blocker to a tick",
	Long: `Add a blocker relationship between two ticks.

The first argument is the tick to be blocked, and the second
argument is the tick that blocks it.

Examples:
  tk block abc123 xyz789   # abc123 is now blocked by xyz789`,
	Args: cobra.ExactArgs(2),
	RunE: runBlock,
}

func init() {
	rootCmd.AddCommand(blockCmd)
}

func runBlock(cmd *cobra.Command, args []string) error {
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

	blockerID, err := github.NormalizeID(project, args[1])
	if err != nil {
		return fmt.Errorf("invalid blocker id: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		return fmt.Errorf("failed to read tick: %w", err)
	}

	if _, err := store.Read(blockerID); err != nil {
		return fmt.Errorf("failed to read blocker tick: %w", err)
	}

	t.BlockedBy = appendUnique(t.BlockedBy, blockerID)
	t.UpdatedAt = time.Now().UTC()

	if err := store.Write(t); err != nil {
		return fmt.Errorf("failed to update tick: %w", err)
	}

	return nil
}
