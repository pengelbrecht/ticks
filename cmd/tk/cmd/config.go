package cmd

import "github.com/spf13/cobra"

// configCmd groups commands that inspect or edit repository configuration.
// It is intentionally separate from the legacy top-level `tk migrate`, which
// migrates tracker data rather than runner configuration.
var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Inspect and migrate repository run configuration",
}

func init() {
	rootCmd.AddCommand(configCmd)
}
