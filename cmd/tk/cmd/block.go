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
	Use:   "block <id> <blocker-id>...",
	Short: "Add one or more blockers to a tick",
	Long: `Add blocker relationships to a tick.

The first argument is the tick to be blocked; every following
argument is a tick that blocks it.

Examples:
  tk block abc123 xyz789          # abc123 is now blocked by xyz789
  tk block abc123 xyz789 qrs456   # abc123 is blocked by both`,
	Args: cobra.MinimumNArgs(2),
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

	blockerIDs := make([]string, 0, len(args)-1)
	for _, arg := range args[1:] {
		blockerID, err := github.NormalizeID(project, arg)
		if err != nil {
			return fmt.Errorf("invalid blocker id %q: %w", arg, err)
		}
		blockerIDs = append(blockerIDs, blockerID)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		return fmt.Errorf("failed to read tick: %w", err)
	}

	// Validate every blocker before mutating so a bad id leaves the tick untouched.
	for _, blockerID := range blockerIDs {
		if _, err := store.Read(blockerID); err != nil {
			return fmt.Errorf("failed to read blocker tick %s: %w", blockerID, err)
		}
	}

	for _, blockerID := range blockerIDs {
		t.BlockedBy = appendUnique(t.BlockedBy, blockerID)
	}
	t.UpdatedAt = time.Now().UTC()

	if err := store.Write(t); err != nil {
		return fmt.Errorf("failed to update tick: %w", err)
	}

	return nil
}
