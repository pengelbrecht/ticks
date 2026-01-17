package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var depsCmd = &cobra.Command{
	Use:   "deps <id>",
	Short: "Show dependency graph for a tick",
	Long: `Show what a tick is blocked by and what it blocks.

Displays the dependency relationships for the specified tick,
showing both upstream blockers and downstream dependents.`,
	Args: cobra.ExactArgs(1),
	RunE: runDeps,
}

var depsJSON bool

func init() {
	depsCmd.Flags().BoolVar(&depsJSON, "json", false, "output as JSON")
	rootCmd.AddCommand(depsCmd)
}

func runDeps(cmd *cobra.Command, args []string) error {
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
	ticks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	target, err := store.Read(id)
	if err != nil {
		return fmt.Errorf("failed to read tick: %w", err)
	}

	var dependents []tick.Tick
	for _, t := range ticks {
		for _, blocker := range t.BlockedBy {
			if blocker == target.ID {
				dependents = append(dependents, t)
				break
			}
		}
	}

	if depsJSON {
		payload := map[string]any{"blocked_by": target.BlockedBy, "blocks": dependents}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	fmt.Printf("%s is blocked by: %s\n", target.ID, strings.Join(target.BlockedBy, ", "))
	if len(dependents) == 0 {
		fmt.Printf("%s blocks: none\n", target.ID)
		return nil
	}
	fmt.Printf("%s blocks:\n", target.ID)
	for _, t := range dependents {
		fmt.Printf("- %s %s (%s)\n", t.ID, t.Title, t.Status)
	}
	return nil
}
