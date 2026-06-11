package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
)

var migrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Run data migrations",
	Long: `Run data migrations to upgrade .tick data to the latest format.

There are currently no data migrations to run.`,
	RunE: runMigrate,
}

func init() {
	rootCmd.AddCommand(migrateCmd)
}

func runMigrate(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	tickDir := filepath.Join(root, ".tick")
	if _, err := os.Stat(tickDir); os.IsNotExist(err) {
		return fmt.Errorf("no .tick directory found - run 'tk init' first")
	}

	// No migrations are currently registered.
	fmt.Println("No migrations needed - all data is up to date.")
	return nil
}
