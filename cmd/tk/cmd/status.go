package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/spf13/cobra"
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
