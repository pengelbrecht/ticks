// Package cmd implements tk CLI commands.
// Version command displays the current tk version and checks for updates.
package cmd

import (
	"fmt"

	"github.com/pengelbrecht/ticks/internal/update"
	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number of tk",
	Long:  `Print the version number of tk.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("tk %s\n", Version)

		// Check for updates (skip for dev builds)
		if Version == "dev" {
			return
		}

		release, hasUpdate, err := update.CheckForUpdate(Version)
		if err != nil {
			// Silently ignore update check errors
			return
		}

		if hasUpdate && release != nil {
			method := update.DetectInstallMethod()
			fmt.Printf("\nUpdate available: %s -> %s\n", Version, release.Version)
			fmt.Println(update.UpdateInstructions(method))
		}
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
