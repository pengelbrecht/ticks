package cmd

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var unblockCmd = &cobra.Command{
	Use:   "unblock <id> <blocker-id>",
	Short: "Remove a blocker from a tick",
	Long: `Remove a blocker relationship between two ticks.

The first argument is the tick to be unblocked, and the second
argument is the tick that currently blocks it.

Examples:
  tk unblock abc123 xyz789   # abc123 is no longer blocked by xyz789`,
	Args: cobra.ExactArgs(2),
	RunE: runUnblock,
}

func init() {
	rootCmd.AddCommand(unblockCmd)
}

func runUnblock(cmd *cobra.Command, args []string) error {
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

	t.BlockedBy = removeString(t.BlockedBy, blockerID)
	t.UpdatedAt = time.Now().UTC()

	if err := store.Write(t); err != nil {
		return fmt.Errorf("failed to update tick: %w", err)
	}

	return nil
}
