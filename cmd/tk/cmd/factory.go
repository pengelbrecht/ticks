package cmd

import (
	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/factory"
)

var (
	factoryDeployRotateToken bool
	factoryDeployURL         string
	factoryDeployBundleDir   string
)

var factoryCmd = &cobra.Command{
	Use:   "factory",
	Short: "Manage your personal cloud factory",
	Long: `Manage the ticks cloud factory that runs epics in the cloud.

The factory is a deployable, not a service: it runs in your own Cloudflare
account, on your compute, with your model keys. ticks.sh never operates one.
See docs/design/cloud-factory.md.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

var factoryDeployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "Deploy (or upgrade) the factory in your own Cloudflare account",
	Long: `Deploy the factory worker bundled with this tk build into your Cloudflare account.

It creates or reuses the D1 database and the R2 bucket, applies the bundle's D1
migrations, pushes the hash of your factory token as a Worker secret, deploys
the worker, and records the endpoint and token in ~/.ticksrc alongside the
existing board-sync token.

Re-running upgrades the deployment in place: nothing is duplicated and your
token is preserved unless you pass --rotate-token. The deployed bundle is
pinned to this tk version, so after ` + "`tk upgrade`" + ` you re-run this command to
move the factory forward.

Requires wrangler, logged in to your Cloudflare account:

    pnpm add -g wrangler   # or: npm install -g wrangler
    wrangler login`,
	Args: cobra.NoArgs,
	// A failing prerequisite or a wrangler error is not a usage mistake:
	// printing the flag list under it buries the actionable message.
	SilenceUsage: true,
	RunE: func(cmd *cobra.Command, args []string) error {
		result, err := factory.Deploy(cmd.Context(), factory.Options{
			Version:     Version,
			BundleDir:   factoryDeployBundleDir,
			RotateToken: factoryDeployRotateToken,
			URL:         factoryDeployURL,
			Out:         cmd.OutOrStdout(),
		})
		if err != nil {
			// Every failure is a stop with an explanation the operator can
			// act on — a missing prerequisite included. Nothing here falls
			// back to a default deployment.
			return NewExitError(ExitGeneric, "%v", err)
		}

		cmd.Printf("\nFactory ready at %s\n", result.URL)
		cmd.Printf("  tk version:  %s\n", result.Version)
		cmd.Printf("  credentials: %s\n", result.ConfigPath)
		if result.Rotated {
			cmd.Printf("  token:       rotated — anything holding the previous token must be updated\n")
		}
		return nil
	},
}

func init() {
	factoryDeployCmd.Flags().BoolVar(&factoryDeployRotateToken, "rotate-token", false,
		"mint a new factory token instead of reusing the one in ~/.ticksrc")
	factoryDeployCmd.Flags().StringVar(&factoryDeployURL, "url", "",
		"factory endpoint to record and verify, when wrangler's output does not name one (custom routes)")
	factoryDeployCmd.Flags().StringVar(&factoryDeployBundleDir, "bundle-dir", "",
		"directory to stage the worker bundle in (default ~/.tick/factory/bundle)")

	factoryCmd.AddCommand(factoryDeployCmd)
	rootCmd.AddCommand(factoryCmd)
}
