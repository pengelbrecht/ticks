package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/tick"
)

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show git status of .tick directory",
	Long: `Show the git status of the .tick directory.

Displays any uncommitted changes to tick files, helping track
what modifications need to be committed.`,
	Args: cobra.NoArgs,
	RunE: runStatus,
}

var statusJSON bool

func init() {
	statusCmd.Flags().BoolVar(&statusJSON, "json", false, "output as JSON")
	rootCmd.AddCommand(statusCmd)
}

func runStatus(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	gitCmd := exec.Command("git", "status", "--short", "--", ".tick")
	gitCmd.Dir = root
	output, err := gitCmd.Output()
	if err != nil {
		return fmt.Errorf("failed to get git status: %w", err)
	}

	if statusJSON {
		changes := splitLines(strings.TrimSpace(string(output)))
		payload := map[string]any{"changes": changes}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	fmt.Printf("%s", output)

	// Warn if .tick/learnings.md exceeds the cap — never blocks status.
	if n, over, _ := tick.CheckLearningsCap(filepath.Join(root, ".tick")); over {
		fmt.Fprintf(os.Stderr,
			"warning: .tick/learnings.md is %d lines (cap %d) — compact it at the next retro\n",
			n, tick.LearningsCap)
	}

	return nil
}

// splitLines splits a string by newlines, returning nil for empty strings.
func splitLines(value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return strings.Split(value, "\n")
}
