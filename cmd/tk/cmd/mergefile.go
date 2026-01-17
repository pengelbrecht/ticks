package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/merge"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var mergeFileCmd = &cobra.Command{
	Use:   "merge-file <base> <ours> <theirs> <path>",
	Short: "Merge tick files for git custom merge driver",
	Long: `Merge tick files using three-way merge for git conflict resolution.

This command is used as a custom merge driver for git to automatically
resolve conflicts in tick JSON files. It takes three versions of a tick
(base, ours, theirs) and writes the merged result to the output path.

Arguments:
  base    Path to the common ancestor version
  ours    Path to our version (current branch)
  theirs  Path to their version (incoming branch)
  path    Path to write the merged result`,
	Args: cobra.ExactArgs(4),
	RunE: runMergeFile,
}

func init() {
	rootCmd.AddCommand(mergeFileCmd)
}

func runMergeFile(cmd *cobra.Command, args []string) error {
	base, err := tickFromPath(args[0])
	if err != nil {
		return fmt.Errorf("failed to read base: %w", err)
	}
	ours, err := tickFromPath(args[1])
	if err != nil {
		return fmt.Errorf("failed to read ours: %w", err)
	}
	theirs, err := tickFromPath(args[2])
	if err != nil {
		return fmt.Errorf("failed to read theirs: %w", err)
	}

	merged := merge.Merge(base, ours, theirs)
	if err := writeTickPath(args[3], merged); err != nil {
		return fmt.Errorf("failed to write merged: %w", err)
	}
	return nil
}

// tickFromPath reads a tick from a JSON file path.
func tickFromPath(path string) (tick.Tick, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return tick.Tick{}, err
	}
	var t tick.Tick
	if err := json.Unmarshal(data, &t); err != nil {
		return tick.Tick{}, err
	}
	return t, t.Validate()
}

// writeTickPath writes a tick to a JSON file path.
func writeTickPath(path string, t tick.Tick) error {
	data, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}
