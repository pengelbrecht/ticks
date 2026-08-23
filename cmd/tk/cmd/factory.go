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
	factoryDeploySkipRollout bool

	factorySetupRepo        string
	factorySetupGitHubToken string
	factorySetupGitHubAPI   string
	factorySetupGatewayURL  string
	factorySetupProvider    string
	factorySetupProviderKey string
	factorySetupCFAPIToken  string
	factorySetupBillingMode string
	factorySetupCFAPIBase   string
	factorySetupBundleDir   string

	factoryStatusOffline   bool
	factoryStatusCheck     bool
	factoryStatusGitHubAPI string
	factoryStatusCFAPIBase string
)

var factoryCmd = &cobra.Command{
	Use:   "factory",
	Short: "Manage your personal cloud factory",
	Long: `Manage the ticks cloud factory that runs epics in the cloud.

The factory is a deployable, not a service: it runs in your own Cloudflare
account, on your compute, with your model keys. ticks.sh never operates one.
See docs/design/cloud-factory.md.

  deploy  put it in your account   |  status     what is configured, and works
  setup   walk the credentials     |  dashboard  watch it run, read-only

'tk factory dashboard' is observation, like 'tk cloud status/logs/trace': it
watches a deployed factory from a local terminal and cannot steer one, so the
operator-to-orchestrator command vocabulary stays run/stop/status/answer.`,
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

It then waits for the orchestrator container application to report the image this
deploy should serve. When ` + "`wrangler deploy`" + ` skips an unchanged image push,
the existing application record supplies that digest; a real rollout is still
waited for when a new image was pushed. ` + "`wrangler deploy`" + ` creates that rollout and returns without waiting
for it, so without this wait a run started immediately after a green deploy can
still boot the PREVIOUS container image — which makes a correct fix look like it
did not work. If the rollout cannot be confirmed within the bounded wait the deploy
says so and exits nonzero rather than reporting success; --skip-rollout-wait
accepts the unconfirmed state deliberately.

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
			Version:         Version,
			BundleDir:       factoryDeployBundleDir,
			RotateToken:     factoryDeployRotateToken,
			URL:             factoryDeployURL,
			Out:             cmd.OutOrStdout(),
			HasCommand:      hasCommand,
			SkipRolloutWait: factoryDeploySkipRollout,
		})
		if err != nil {
			// Every failure is a stop with an explanation the operator can
			// act on — a missing prerequisite included. Nothing here falls
			// back to a default deployment.
			return NewExitError(ExitGeneric, "%v", err)
		}

		// "Ready" is a claim about what a run started now would boot, so it is
		// only made when the container rollout was actually confirmed. An
		// unconfirmed one reaches here only through --skip-rollout-wait, and it
		// says so where the operator reads the verdict rather than only in the
		// progress above.
		if result.RolloutConfirmed {
			cmd.Printf("\nFactory ready at %s\n", result.URL)
		} else {
			cmd.Printf("\nFactory deployed at %s — container rollout NOT confirmed\n", result.URL)
		}
		cmd.Printf("  tk version:  %s\n", result.Version)
		cmd.Printf("  image tk:    built from %s\n", result.SourceRef)
		if result.ImageDigest != "" {
			cmd.Printf("  image:       %s\n", result.ImageDigest)
		}
		if !result.RolloutConfirmed {
			cmd.Printf("  rollout:     unconfirmed — a run started now may still boot the previous image\n")
		}
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
     gateway before it is stored. --cloudflare-api-token adds the optional half
     of this rung: a token with AI Gateway read access, which is what lets a
     run's cost budget act on what the gateway billed instead of on what the
     agent claims. Without it, runs still route and attribute their model
     traffic and record their cost as unknown.

     That token also reads the gateway's Workers AI billing mode, which decides
     which pot a run's spend comes out of: postpaid puts Workers AI on your
     Cloudflare invoice (where an account credit can absorb it), unified drains
     a separately purchased prepaid AI Gateway wallet bought at a 5% premium.
     It is one dashboard toggle, it appears nowhere in a run's telemetry, and
     setup refuses a gateway that is not on the mode you settled on. Postpaid is
     the default; --workers-ai-billing-mode unified records the other choice.

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
			HasCommand:    hasCommand,
			In:            cmd.InOrStdin(),
			Out:           cmd.OutOrStdout(),
			GitHubAPIBase: factorySetupGitHubAPI,
			Repo:          factorySetupRepo,
			GitHubToken:   factorySetupGitHubToken,
			GatewayURL:    factorySetupGatewayURL,
			Provider:      factorySetupProvider,
			ProviderKey:   factorySetupProviderKey,

			CloudflareAPIToken:   factorySetupCFAPIToken,
			CloudflareAPIBase:    factorySetupCFAPIBase,
			WorkersAIBillingMode: factorySetupBillingMode,
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
GitHub credential and the AI Gateway with the provider behind it, plus the
gateway's Workers AI billing mode — which decides whether a run's model spend
lands on your Cloudflare invoice or drains a prepaid AI Gateway wallet. That
last one is not a credential: it is a per-gateway setting one dashboard click
changes, and a run's telemetry reports the identical cost either way, so this
is the pre-flight that catches it.

Each check is live by default — the factory's own health route, a GitHub API
call with the stored token, a model-list call through the gateway, a read of
the gateway's own configuration. --offline skips them all, so status is safe to
run with no network.

A rejected credential is always reported, but only --check turns it into a
nonzero exit, so a status call can be made unconditionally in a script. With
nothing configured, status says so and exits 0. No credential is ever printed.`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE: func(cmd *cobra.Command, args []string) error {
		report, err := factory.Status(cmd.Context(), factory.StatusOptions{
			Offline:           factoryStatusOffline,
			GitHubAPIBase:     factoryStatusGitHubAPI,
			CloudflareAPIBase: factoryStatusCFAPIBase,
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
	factoryDeployCmd.Flags().BoolVar(&factoryDeploySkipRollout, "skip-rollout-wait", false,
		"do not wait for the orchestrator container application to serve the pushed image "+
			"(the deploy then reports the rollout as unconfirmed)")

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
	factorySetupCmd.Flags().StringVar(&factorySetupCFAPIToken, "cloudflare-api-token", "",
		"Cloudflare API token with AI Gateway read access — makes a run's cost gateway telemetry rather than a self-report")
	factorySetupCmd.Flags().StringVar(&factorySetupBillingMode, "workers-ai-billing-mode", "",
		"the gateway's Workers AI billing mode to assert: postpaid (default — the Cloudflare invoice) or unified (a prepaid AI Gateway wallet)")
	factorySetupCmd.Flags().StringVar(&factorySetupCFAPIBase, "cloudflare-api-base", "",
		"override the Cloudflare API root (testing)")
	_ = factorySetupCmd.Flags().MarkHidden("cloudflare-api-base")
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
	factoryStatusCmd.Flags().StringVar(&factoryStatusCFAPIBase, "cloudflare-api-base", "",
		"override the Cloudflare API root (testing)")
	_ = factoryStatusCmd.Flags().MarkHidden("cloudflare-api-base")

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

// hasCommand reports whether this binary implements a subcommand chain, which
// is how `tk factory deploy` proves the orchestrator image's tk will be able to
// run the entrypoint it ships with (internal/factory/tkcommands.go).
//
// cobra's Find returns the deepest command it resolved plus the arguments it
// could not. Leftovers on a command that HAS subcommands mean the chain named
// one this binary does not have — the exact failure being gated. Leftovers on a
// leaf are positional arguments, which is not a missing command.
func hasCommand(chain []string) bool {
	if len(chain) == 0 {
		return false
	}
	found, rest, err := rootCmd.Find(chain)
	if err != nil || found == nil || found == rootCmd {
		return false
	}
	if len(rest) > 0 && found.HasSubCommands() {
		return false
	}
	return true
}
