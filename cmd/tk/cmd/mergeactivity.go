package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/merge"
)

var mergeActivityCmd = &cobra.Command{
	Use:   "merge-activity <ancestor> <current> <other> <path>",
	Short: "Merge activity JSONL files for git custom merge driver",
	Long: `Merge activity JSONL files using union-based merge for git conflict resolution.

This command is used as a custom merge driver for git to automatically
resolve conflicts in activity JSONL files. It takes three versions of an
activity log (ancestor, current, other) and writes the merged result back
to the current file.

Arguments:
  ancestor  Path to the common ancestor version (%O in gitattributes)
  current   Path to our version / output file (%A in gitattributes)
  other     Path to their version (%B in gitattributes)
  path      Logical file path (%P in gitattributes)`,
	Args: cobra.ExactArgs(4),
	RunE: runMergeActivity,
}

func init() {
	rootCmd.AddCommand(mergeActivityCmd)
}

func runMergeActivity(cmd *cobra.Command, args []string) error {
	ancestorPath := args[0]
	currentPath := args[1]
	otherPath := args[2]
	// args[3] is the logical path (%P), not used directly

	ancestorFile, err := os.Open(ancestorPath)
	if err != nil {
		return fmt.Errorf("failed to open ancestor: %w", err)
	}
	defer ancestorFile.Close()

	currentFile, err := os.Open(currentPath)
	if err != nil {
		return fmt.Errorf("failed to open current: %w", err)
	}
	defer currentFile.Close()

	otherFile, err := os.Open(otherPath)
	if err != nil {
		return fmt.Errorf("failed to open other: %w", err)
	}
	defer otherFile.Close()

	// Write result to a temp file, then atomically replace current.
	tmpFile, err := os.CreateTemp("", "merge-activity-*")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)

	if err := merge.MergeActivity(ancestorFile, currentFile, otherFile, tmpFile); err != nil {
		tmpFile.Close()
		return fmt.Errorf("failed to merge activity: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("failed to close temp file: %w", err)
	}

	if err := os.Rename(tmpPath, currentPath); err != nil {
		return fmt.Errorf("failed to write merged result: %w", err)
	}
	return nil
}
