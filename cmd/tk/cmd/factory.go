package cmd

import (
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/factory"
)

var (
	factoryDeployRotateToken bool
	factoryDeployURL         string
	factoryDeployBundleDir   string

	factorySetupRepo        string
	factorySetupGitHubToken string
	factorySetupGitHubAPI   string
	factorySetupGatewayURL  string
	factorySetupProvider    string
	factorySetupProviderKey string
	factorySetupBundleDir   string

	factoryStatusOffline   bool
	factoryStatusCheck     bool
	factoryStatusGitHubAPI string
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

var factorySetupCmd = &cobra.Command{
	Use:   "setup",
	Short: "Walk the factory's credential ladder, one verified rung at a time",
	Long: `Configure your factory by answering prompts, the way ` + "`tk channel setup telegram`" + `
pairs a bot.

Setup walks four rungs and proves each one before it stores anything:

  1. wrangler, logged in to your Cloudflare account.
  2. a deployment — if none exists, it offers ` + "`tk factory deploy`" + ` right here.
  3. a GitHub credential — a fine-grained personal access token scoped to the
     repository the factory works on. It is checked against the GitHub API and
     against that repository before it is stored. A personal GitHub App, which
     mints per-run installation tokens, is the documented upgrade path; see
     docs/factory-credentials.md.
  4. model access — your own AI Gateway base URL and the provider behind it.
     Workers AI needs no key (inference bills to the same Cloudflare account);
     a BYOK provider's key is verified with a live model-list call through the
     gateway before it is stored.

Everything it stores goes to two places: a Worker secret in your own Cloudflare
account, and ~/.ticksrc (0600) so ` + "`tk factory status`" + ` can re-check it. Nothing is
ever written into the repository.

Re-running is the reconfiguration path: an existing deployment is reused, and a
GitHub token that still works is offered back to you rather than re-asked.

Any answer can be supplied as a flag instead of typed, which is what makes the
walk scriptable.`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE: func(cmd *cobra.Command, args []string) error {
		_, err := factory.Setup(cmd.Context(), factory.SetupOptions{
			Version:       Version,
			BundleDir:     factorySetupBundleDir,
			In:            cmd.InOrStdin(),
			Out:           cmd.OutOrStdout(),
			GitHubAPIBase: factorySetupGitHubAPI,
			Repo:          factorySetupRepo,
			GitHubToken:   factorySetupGitHubToken,
			GatewayURL:    factorySetupGatewayURL,
			Provider:      factorySetupProvider,
			ProviderKey:   factorySetupProviderKey,
		})
		if err != nil {
			// A rung that did not verify is a stop with an explanation, never
			// a partially configured factory left behind quietly.
			return NewExitError(ExitGeneric, "%v", err)
		}
		return nil
	},
}

var factoryStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show what the factory has configured and whether each credential works",
	Long: `Report each rung of the factory's credential ladder: the deployment, the
GitHub credential and the AI Gateway with the provider behind it.

Each check is live by default — the factory's own health route, a GitHub API
call with the stored token, a model-list call through the gateway. --offline
skips them all, so status is safe to run with no network.

A rejected credential is always reported, but only --check turns it into a
nonzero exit, so a status call can be made unconditionally in a script. With
nothing configured, status says so and exits 0. No credential is ever printed.`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE: func(cmd *cobra.Command, args []string) error {
		report, err := factory.Status(cmd.Context(), factory.StatusOptions{
			Offline:       factoryStatusOffline,
			GitHubAPIBase: factoryStatusGitHubAPI,
		})
		if err != nil {
			return NewExitError(ExitIO, "%v", err)
		}
		report.Write(cmd.OutOrStdout())

		if failures := report.Failures(); len(failures) > 0 && factoryStatusCheck {
			return NewExitError(ExitGeneric, "credential rejected for: %s", strings.Join(failures, ", "))
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

	factorySetupCmd.Flags().StringVar(&factorySetupRepo, "repo", "",
		"owner/name the GitHub credential must reach (default: this checkout's origin remote)")
	factorySetupCmd.Flags().StringVar(&factorySetupGitHubToken, "github-token", "",
		"fine-grained GitHub PAT (prompted for when omitted)")
	factorySetupCmd.Flags().StringVar(&factorySetupGatewayURL, "gateway-url", "",
		"AI Gateway base URL (prompted for when omitted)")
	factorySetupCmd.Flags().StringVar(&factorySetupProvider, "provider", "",
		"model provider behind the gateway: "+providerFlagHelp())
	factorySetupCmd.Flags().StringVar(&factorySetupProviderKey, "provider-key", "",
		"API key for a BYOK provider (prompted for when omitted; workers-ai needs none)")
	factorySetupCmd.Flags().StringVar(&factorySetupBundleDir, "bundle-dir", "",
		"directory to stage the worker bundle in (default ~/.tick/factory/bundle)")
	factorySetupCmd.Flags().StringVar(&factorySetupGitHubAPI, "github-api-base", "",
		"override the GitHub API root (testing)")
	_ = factorySetupCmd.Flags().MarkHidden("github-api-base")

	factoryStatusCmd.Flags().BoolVar(&factoryStatusOffline, "offline", false, "skip the live credential checks")
	factoryStatusCmd.Flags().BoolVar(&factoryStatusCheck, "check", false, "exit nonzero when a configured credential is rejected")
	factoryStatusCmd.Flags().StringVar(&factoryStatusGitHubAPI, "github-api-base", "",
		"override the GitHub API root (testing)")
	_ = factoryStatusCmd.Flags().MarkHidden("github-api-base")

	factoryCmd.AddCommand(factoryDeployCmd)
	factoryCmd.AddCommand(factorySetupCmd)
	factoryCmd.AddCommand(factoryStatusCmd)
	rootCmd.AddCommand(factoryCmd)
}

// providerFlagHelp lists the provider ids the setup flag accepts, so the help
// text cannot drift from the table the walk offers.
func providerFlagHelp() string {
	ids := make([]string, 0, len(factory.Providers))
	for _, spec := range factory.Providers {
		ids = append(ids, spec.ID)
	}
	return strings.Join(ids, " | ")
}
