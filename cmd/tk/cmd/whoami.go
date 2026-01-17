package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
)

var whoamiCmd = &cobra.Command{
	Use:   "whoami",
	Short: "Show current user and project",
	Long: `Show the current GitHub user (owner) and project detected from the repository.

This is useful for verifying that tk is correctly detecting your identity
for ownership assignment.`,
	RunE: runWhoami,
}

var whoamiJSON bool

func init() {
	whoamiCmd.Flags().BoolVar(&whoamiJSON, "json", false, "output as JSON")
	rootCmd.AddCommand(whoamiCmd)
}

func runWhoami(cmd *cobra.Command, args []string) error {
	project, err := github.DetectProject(nil)
	if err != nil {
		return fmt.Errorf("failed to detect project: %w", err)
	}
	owner, err := github.DetectOwner(nil)
	if err != nil {
		return fmt.Errorf("failed to detect owner: %w", err)
	}

	if whoamiJSON {
		payload := map[string]string{"owner": owner, "project": project}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	fmt.Printf("Owner: %s\n", owner)
	fmt.Printf("Project: %s\n", project)
	return nil
}
