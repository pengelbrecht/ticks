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
(base, ours, theirs) and writes the merged result over OURS, which is where
git reads a merge driver's result from.

Arguments:
  base    Path to the common ancestor version (git's %O)
  ours    Path to our version, overwritten with the result (git's %A)
  theirs  Path to their version (git's %B)
  path    The file's logical path in the repository (git's %P); never written`,
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

	// The result goes to %A, args[1]. That is git's contract for a merge
	// driver - "leave the result of the merge in the file named with %A by
	// overwriting it" - and it is the ONLY file git reads back. %P (args[3])
	// is the file's logical path in the repository, relative to the driver's
	// working directory.
	//
	// This used to write to %P, which did two things at once and both were
	// silent. The commit kept %A untouched - OURS - so every tick record both
	// sides had changed lost the other side's change in the merge. And the
	// correct merge landed in the working tree at %P as an unstaged
	// modification nobody asked for: found when a run's closed-and-regated
	// record for one tick appeared uncommitted in an unrelated checkout
	// (ticfac, 2026-09-23). args[3] is deliberately not used.
	merged := merge.Merge(base, ours, theirs)
	if err := writeTickPath(args[1], merged); err != nil {
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
