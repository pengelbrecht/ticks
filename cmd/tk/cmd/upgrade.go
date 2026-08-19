package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
	"github.com/pengelbrecht/ticks/internal/update"
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

		// The factory bundle is embedded in the binary and its deployment is
		// pinned to the tk version that installed it (D16, "upgrades ride the
		// repo"), so an upgrade leaves a deployed factory a version behind
		// until the operator redeploys. Nothing is done for them: their
		// Cloudflare account is theirs to change.
		if notice := factoryRedeployNotice(release.Version); notice != "" {
			fmt.Print(notice)
		}
	},
}

// factoryRedeployNotice returns the "your factory is now a version behind"
// message, or "" when there is no deployed factory or it already matches
// newVersion. An unreadable ~/.ticksrc is silent: an upgrade must not fail or
// nag over a file it only consults.
func factoryRedeployNotice(newVersion string) string {
	cfg, err := ticksrc.Load()
	if err != nil {
		return ""
	}
	if cfg.Get(ticksrc.KeyFactoryURL) == "" {
		return ""
	}
	deployed := cfg.Get(ticksrc.KeyFactoryVersion)
	if deployed == newVersion {
		return ""
	}
	if deployed == "" {
		deployed = "an unrecorded version"
	}
	return fmt.Sprintf("\nYour cloud factory at %s runs %s.\nRun `tk factory deploy` to redeploy it from this build.\n",
		cfg.Get(ticksrc.KeyFactoryURL), deployed)
}

func init() {
	rootCmd.AddCommand(upgradeCmd)
}
