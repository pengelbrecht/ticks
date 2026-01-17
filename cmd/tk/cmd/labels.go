package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/tick"
)

var labelsCmd = &cobra.Command{
	Use:   "labels",
	Short: "List all labels used across ticks",
	Long: `List all labels used across ticks with their counts.

Output shows each label and the number of ticks that have it.`,
	Args: cobra.NoArgs,
	RunE: runLabels,
}

var labelsJSON bool

func init() {
	labelsCmd.Flags().BoolVar(&labelsJSON, "json", false, "output as JSON")
	rootCmd.AddCommand(labelsCmd)
}

func runLabels(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	counts := make(map[string]int)
	for _, t := range ticks {
		for _, label := range t.Labels {
			counts[label]++
		}
	}

	if labelsJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(counts); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	for label, count := range counts {
		fmt.Printf("%s: %d\n", label, count)
	}

	return nil
}
