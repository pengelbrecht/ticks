package cmd

import (
	"fmt"
	"os"

	"github.com/pengelbrecht/ticks/internal/update"
	"github.com/spf13/cobra"
)

var upgradeCmd = &cobra.Command{
	Use:   "upgrade",
	Short: "Upgrade tk to the latest version",
	Long:  `Upgrade tk to the latest version by downloading and installing the newest release.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("Current version: %s\n", Version)

		method := update.DetectInstallMethod()
		if method == update.InstallHomebrew {
			fmt.Println("\ntk was installed via Homebrew.")
			fmt.Println("Run: brew upgrade pengelbrecht/tap/ticks")
			return
		}

		fmt.Println("Checking for updates...")

		release, hasUpdate, err := update.CheckForUpdate(Version)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to check for updates: %v\n", err)
			os.Exit(1)
		}

		if !hasUpdate {
			fmt.Println("Already at latest version.")
			return
		}

		fmt.Printf("Updating to %s...\n", release.Version)

		if err := update.Update(Version); err != nil {
			fmt.Fprintf(os.Stderr, "Update failed: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("Successfully updated to %s\n", release.Version)
	},
}

func init() {
	rootCmd.AddCommand(upgradeCmd)
}
