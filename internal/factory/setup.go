package factory

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"golang.org/x/term"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// `tk factory setup` is the first-run walk for a personal factory, and it is
// deliberately shaped like `tk channel setup telegram`: one rung at a time,
// each one proven against the live service before it is written anywhere.
//
// The ladder, in the order the deployment model (docs/design/cloud-factory.md)
// puts it:
//
//  0. wrangler, logged in — the precondition everything else needs.
//  1. a deployment — offered, never assumed (D16: the factory runs in the
//     operator's own account or not at all).
//  2. a GitHub credential — the DEVICE FLOW against the ticks GitHub App is
//     the shipped rung (D11): a code, one browser approval, and the operator
//     picks the repositories right there. --github-token stays the manual
//     escape hatch, and an operator who registers their OWN App gets the
//     private-key rung and its per-run installation tokens as the upgrade.
//  3. model access — the operator's own AI Gateway (D17) plus the provider
//     behind it. Workers AI is the rung with no key at all: inference bills to
//     the same Cloudflare account through the Worker's own binding.
//
// Two rules hold for every rung. A credential is verified with a real call
// before it is stored — a token that authenticates nowhere is not a
// configuration, it is a future green-start trap. And a stored credential goes
// to exactly two places: a Worker secret in the operator's account
// (write-only) and ~/.ticksrc (0600), so `tk factory status` can re-check it.
// Never the repository — see SecretSinks and the test that walks it.

const (
	// SecretGitHubToken is the Worker secret holding the GitHub credential the
	// factory clones and pushes with.
	SecretGitHubToken = "GITHUB_TOKEN"

	// SecretGatewayBaseURL is the Worker secret holding the operator's AI
	// Gateway base URL. It is a secret rather than a wrangler.toml var because
	// it carries their Cloudflare account id, and this repo is public.
	SecretGatewayBaseURL = "AI_GATEWAY_BASE_URL"

	// SecretCloudflareAPIToken is the Worker secret holding a Cloudflare API
	// token with AI Gateway read access.
	//
	// It is what makes a run's cost ground truth: the Run Workflow reads the
	// gateway's own per-request logs, filtered by the run id it stamped on
	// every request, and enforces the cost budget on that number rather than
	// on anything the agent says about itself (D14, D17). Optional, and
	// visibly so — a factory without one still routes and attributes model
	// traffic, but its cost budget has nothing to act on, which `tk factory
	// status` and the run record both say out loud rather than reporting $0.
	SecretCloudflareAPIToken = "CLOUDFLARE_API_TOKEN"
)

// ProviderSpec is one rung of the model-access ladder: the vendor behind the
// gateway, and the Worker secret its key lands in (empty when there is no key).
type ProviderSpec struct {
	ID         string
	Label      string
	SecretName string
	// KeyHint is what the prompt tells the operator to paste.
	KeyHint string
}

// NeedsKey reports whether this provider is BYOK.
func (p ProviderSpec) NeedsKey() bool { return p.SecretName != "" }

// Providers is the choice offered at the model-access rung, in the order it is
// offered. Workers AI leads because for a factory living in the operator's own
// Cloudflare account it is the rung where compute, storage and inference all
// draw one pre-paid pool — and the only one that needs no key.
var Providers = []ProviderSpec{
	{
		ID:    "workers-ai",
		Label: "Workers AI — same Cloudflare account, no key needed",
	},
	{
		ID:         "anthropic",
		Label:      "Anthropic (BYOK)",
		SecretName: "ANTHROPIC_API_KEY",
		KeyHint:    "Anthropic API key",
	},
	{
		ID:         "openai",
		Label:      "OpenAI (BYOK)",
		SecretName: "OPENAI_API_KEY",
		KeyHint:    "OpenAI API key",
	},
	{
		ID:         "openrouter",
		Label:      "OpenRouter — one key, many models",
		SecretName: "OPENROUTER_API_KEY",
		KeyHint:    "OpenRouter API key",
	},
}

// LookupProvider resolves a provider by id, or by its 1-based position in the
// menu, which is what the prompt accepts.
func LookupProvider(choice string) (ProviderSpec, bool) {
	choice = strings.ToLower(strings.TrimSpace(choice))
	for i, spec := range Providers {
		if choice == spec.ID || choice == fmt.Sprint(i+1) {
			return spec, true
		}
	}
	return ProviderSpec{}, false
}

// SecretSinks names every place a credential this command handles is allowed
// to end up: Worker secrets in the operator's Cloudflare account (write-only —
// nothing reads them back) and one local file. The repository is not on the
// list, and TestSetupNeverWritesASecretIntoTheRepository proves it stays that
// way by running the whole walk inside a checkout.
func SecretSinks(configPath string) (workerSecrets []string, localFiles []string) {
	workerSecrets = []string{
		SecretName,
		SecretFactoryBaseURL,
		SecretGitHubToken,
		SecretGatewayBaseURL,
		SecretCloudflareAPIToken,
	}
	for _, spec := range Providers {
		if spec.NeedsKey() {
			workerSecrets = append(workerSecrets, spec.SecretName)
		}
	}
	return workerSecrets, []string{configPath}
}

// SetupOptions configures the walk. Every credential field doubles as the
// non-interactive answer to its prompt: supplied means "do not ask", so the
// same code path serves `tk factory setup` typed by a human and one driven by
// flags in a script.
type SetupOptions struct {
	// Version is the tk version a deploy started from here pins to.
	Version string

	// BundleDir is where the bundle is staged and wrangler runs. Empty means
	// the default under the ticks home directory.
	BundleDir string

	// ConfigPath overrides the ~/.ticksrc location (tests).
	ConfigPath string

	// HasCommand is passed straight through to a deploy started from the
	// deployment rung — see Options.HasCommand.
	HasCommand func(chain []string) bool

	// In/Out are the prompt streams. Nil means stdin/stdout.
	In  io.Reader
	Out io.Writer

	// HTTPClient makes the live probes. Nil means a client with a short
	// timeout.
	HTTPClient *http.Client

	// GitHubAPIBase overrides https://api.github.com (tests, GHES).
	GitHubAPIBase string

	// Repo is the owner/repo the GitHub credential must be able to reach.
	// Empty means detect it from the git remote; undetectable means the repo
	// scope check is reported as skipped rather than failing the rung.
	Repo string

	// CloudflareAPIBase overrides https://api.cloudflare.com/client/v4
	// (tests).
	CloudflareAPIBase string

	// GitHubClientID names the GitHub App the device flow authenticates
	// against. Empty falls back to the environment and then to the client id
	// shipped in this build (githubapp.go); still empty means this build ships
	// no App, and the walk asks for a token by hand instead of offering a flow
	// that cannot work.
	GitHubClientID string
	// GitHubOAuthBase overrides https://github.com — the host the device flow
	// runs on, which is NOT the REST API host (GHES, tests).
	GitHubOAuthBase string

	// Answers supplied up front instead of prompted for.
	GitHubToken string
	GatewayURL  string
	Provider    string
	ProviderKey string
	// CloudflareAPIToken enables gateway cost telemetry (D17). It is a flag
	// rather than a prompt: it is the one rung a factory can run without, and
	// the walk says exactly what is lost when it is absent instead of asking
	// every operator for an API token they may not have minted yet.
	CloudflareAPIToken string
	// WorkersAIBillingMode is the AI Gateway billing mode the operator has
	// settled on: postpaid (the default — Workers AI on the Cloudflare
	// invoice) or unified (a separately purchased prepaid wallet). The walk
	// asserts the gateway is actually on it before it stores anything, so
	// moving to unified is an explicit act rather than a dashboard click
	// nobody notices.
	WorkersAIBillingMode string

	// onSecretPut runs after every `wrangler secret put`, so the test harness
	// can propagate a secret into its fake worker the way Cloudflare does.
	onSecretPut func()

	// deployFn overrides the deploy invoked from the deployment rung (tests).
	deployFn func(context.Context, Options) (*Result, error)

	// deviceFlowNow and deviceFlowSleep are the device flow's clock. Tests
	// replace them so a poll cadence measured in seconds is asserted on rather
	// than waited out.
	deviceFlowNow   func() time.Time
	deviceFlowSleep func(context.Context, time.Duration) error
}

// deviceFlow builds the device-flow configuration this walk runs with. A zero
// ClientID is the supported "this build ships no App" state, not an error.
func (o SetupOptions) deviceFlow(out io.Writer) DeviceFlowOptions {
	return DeviceFlowOptions{
		ClientID:   ResolveGitHubAppClientID(o.GitHubClientID),
		OAuthBase:  o.GitHubOAuthBase,
		HTTPClient: o.HTTPClient,
		Out:        out,
		now:        o.deviceFlowNow,
		sleep:      o.deviceFlowSleep,
	}
}

// SetupResult is what the walk settled.
type SetupResult struct {
	URL        string
	Version    string
	ConfigPath string
	// Deployed reports whether this run deployed the factory.
	Deployed bool

	GitHubLogin string
	GitHubRepo  string
	// GitHubRepoChecked reports whether the repo-scope probe ran; false means
	// no repository could be resolved to check against.
	GitHubRepoChecked bool
	// GitHubAuth is how the credential was obtained: AuthDeviceFlow or AuthPAT.
	GitHubAuth string
	// GitHubTokenExpiresAt is when the credential stops working. Zero means it
	// does not expire, which is what a GitHub App registered with user-token
	// expiration turned off issues.
	GitHubTokenExpiresAt time.Time
	// GitHubRefreshed reports that this walk RENEWED a stored credential
	// instead of minting a new one — no browser was involved.
	GitHubRefreshed bool

	GatewayURL        string
	Provider          string
	ProviderKeyStored bool
	// CostTelemetry reports whether gateway cost telemetry is configured — the
	// credential the Run Workflow reads spend with.
	CostTelemetry bool
	// WorkersAIBillingMode is the mode the gateway reported and the walk
	// recorded, or "" when there was no token to read it with.
	WorkersAIBillingMode string
	// Models is what the gateway listed during verification, if anything.
	Models []string
}

// defaultGitHubAPIBase is GitHub's REST root.
const defaultGitHubAPIBase = "https://api.github.com"

// gitHubAppUpgradeNote is the TOP rung of the D11 ladder. It is printed, not
// walked, and it always will be: minting per-run installation tokens needs a
// GitHub App's PRIVATE KEY, and a key shipped inside tk would let any holder
// mint tokens for every installation of the shared App. So that rung belongs
// to an operator who registers an App under their own account; the flow below
// needs only the shared App's public client id.
const gitHubAppUpgradeNote = "Upgrade path (later, optional): your OWN GitHub App gives the factory\n" +
	"per-run installation tokens and the two credential grades of D11. It needs\n" +
	"that App's private key, which is why ticks cannot ship it.\n" +
	"See docs/factory-credentials.md."

// GitHub credential kinds, as recorded in ~/.ticksrc. They are not cosmetic:
// only a device-flow credential can be renewed without a browser, and only a
// device-flow credential is bounded by the repositories chosen at install — so
// the two fail differently and recover differently, and a report that cannot
// tell them apart names the wrong remedy.
const (
	// AuthDeviceFlow is a user-to-server token from the device flow.
	AuthDeviceFlow = "device-flow"
	// AuthPAT is a token supplied by hand (--github-token, or the prompt a
	// build with no App client id falls back to).
	AuthPAT = "pat"
)

// githubRefreshWindow is how much life a stored credential must have left for
// setup to reuse it rather than renew it. It is generous on purpose: a cloud
// run lasts hours, and a credential that expires mid-run fails at its push —
// the most expensive possible moment to discover it.
const githubRefreshWindow = 2 * time.Hour

// githubCredential is the GitHub rung's whole state: the token, how it was
// obtained, and everything needed to know when it stops working and whether it
// can be renewed without a browser.
type githubCredential struct {
	Token            string
	Auth             string
	ExpiresAt        time.Time
	RefreshToken     string
	RefreshExpiresAt time.Time
}

// credentialFromUserToken adapts a device-flow grant to what gets stored.
func credentialFromUserToken(token *UserToken) githubCredential {
	return githubCredential{
		Token:            token.AccessToken,
		Auth:             AuthDeviceFlow,
		ExpiresAt:        token.ExpiresAt,
		RefreshToken:     token.RefreshToken,
		RefreshExpiresAt: token.RefreshExpiresAt,
	}
}

// storedGitHubCredential reads back what a previous walk settled.
func storedGitHubCredential(cfg *ticksrc.File) githubCredential {
	cred := githubCredential{
		Token:        cfg.Get(ticksrc.KeyFactoryGitHubToken),
		Auth:         cfg.Get(ticksrc.KeyFactoryGitHubAuth),
		RefreshToken: cfg.Get(ticksrc.KeyFactoryGitHubRefreshToken),
	}
	if cred.Auth == "" && cred.Token != "" {
		// Written before this file recorded how the credential was obtained.
		// Anything already there was typed in by hand.
		cred.Auth = AuthPAT
	}
	cred.ExpiresAt = parseDeadline(cfg.Get(ticksrc.KeyFactoryGitHubTokenExpires))
	cred.RefreshExpiresAt = parseDeadline(cfg.Get(ticksrc.KeyFactoryGitHubRefreshExpires))
	return cred
}

// parseDeadline reads a stored RFC 3339 deadline. An unparseable or absent
// value is the zero time, which every caller reads as "does not expire" —
// deliberately, because the alternative (treating it as long past) would
// condemn the recommended App registration, which issues no deadline at all.
func parseDeadline(value string) time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}
	}
	return parsed
}

func formatDeadline(deadline time.Time) string {
	if deadline.IsZero() {
		return ""
	}
	return deadline.UTC().Format(time.RFC3339)
}

// DescribeGitHubLifetime says how long a credential has left, in the words a
// report can use directly. It is shared by setup and status so the two cannot
// disagree about whether a credential is live.
func DescribeGitHubLifetime(expiresAt, now time.Time) string {
	if expiresAt.IsZero() {
		return "does not expire"
	}
	remaining := expiresAt.Sub(now)
	if remaining <= 0 {
		return "EXPIRED " + expiresAt.UTC().Format(time.RFC3339)
	}
	return "expires in " + roundDuration(remaining) + " (" + expiresAt.UTC().Format(time.RFC3339) + ")"
}

// roundDuration renders a lifetime at the precision a human acts on: whole
// hours for anything over a day, minutes below that.
func roundDuration(d time.Duration) string {
	switch {
	case d >= 24*time.Hour:
		return fmt.Sprintf("%dd%dh", int(d.Hours())/24, int(d.Hours())%24)
	case d >= time.Hour:
		return d.Round(time.Minute).String()
	default:
		return d.Round(time.Second).String()
	}
}

// Setup walks the credential ladder and returns what it settled.
func Setup(ctx context.Context, opts SetupOptions) (*SetupResult, error) {
	out := opts.Out
	if out == nil {
		out = os.Stdout
	}
	raw := opts.In
	if raw == nil {
		raw = os.Stdin
	}
	// One buffered reader for the whole walk: a second one over the same
	// stream would swallow whatever the first read ahead, so a piped answer
	// sheet would only answer the first prompt.
	in := bufio.NewReader(raw)

	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}

	bundleDir := opts.BundleDir
	if bundleDir == "" {
		var err error
		if bundleDir, err = DefaultBundleDir(); err != nil {
			return nil, err
		}
	}

	// Rung 0 — the precondition. Nothing is asked for, and nothing is written,
	// until there is a wrangler that can reach the operator's account.
	w, wranglerVersion, err := findWrangler(ctx, out, bundleDir)
	if err != nil {
		return nil, err
	}
	if err := w.requireAuth(ctx); err != nil {
		return nil, err
	}
	fmt.Fprintf(out, "%s %s, authenticated\n", w.label, wranglerVersion)

	cfg, err := loadConfig(opts.ConfigPath)
	if err != nil {
		return nil, err
	}

	result := &SetupResult{ConfigPath: cfg.Path(), Version: opts.Version}

	// Rung 1 — a deployment to hold the secrets.
	if err := setupDeployment(ctx, in, out, client, &cfg, opts, bundleDir, result); err != nil {
		return nil, err
	}

	// Every later rung pushes Worker secrets, which wrangler resolves through
	// the bundle's own config, so the bundle has to be on disk first.
	if err := os.MkdirAll(bundleDir, 0o755); err != nil {
		return nil, fmt.Errorf("preparing %s: %w", bundleDir, err)
	}
	if err := Materialize(bundleDir); err != nil {
		return nil, err
	}
	w.dir = bundleDir

	// Rung 2 — the GitHub credential.
	if err := setupGitHub(ctx, w, in, raw, out, client, cfg, opts, result); err != nil {
		return nil, err
	}

	// Rung 3 — model access.
	if err := setupGateway(ctx, w, in, raw, out, client, cfg, opts, result); err != nil {
		return nil, err
	}

	fmt.Fprintf(out, "\nFactory configured: %s\n", result.URL)
	fmt.Fprintf(out, "  credentials: Worker secrets in your Cloudflare account, mirrored in %s (0600)\n", cfg.Path())
	fmt.Fprintf(out, "  check them any time with `tk factory status`\n")
	return result, nil
}

// setupDeployment settles rung 1: a factory to configure. An existing one is
// probed the same way a fresh deploy is, so a stale ~/.ticksrc entry pointing
// at a factory that no longer answers is caught here rather than at run time.
func setupDeployment(
	ctx context.Context,
	in *bufio.Reader,
	out io.Writer,
	client *http.Client,
	cfgp **ticksrc.File,
	opts SetupOptions,
	bundleDir string,
	result *SetupResult,
) error {
	cfg := *cfgp
	url := strings.TrimSuffix(cfg.Get(ticksrc.KeyFactoryURL), "/")

	if url == "" {
		fmt.Fprintf(out, "\nNo factory is deployed for this account yet.\n")
		fmt.Fprintf(out, "It deploys into your own Cloudflare account: your compute, your keys, your spend.\n")
		answer, err := promptLine(in, out, "Deploy it now with the bundle in this tk build? [Y/n] ")
		if err != nil {
			return err
		}
		if !isYesDefaultYes(answer) {
			return errors.New("no factory is deployed — run `tk factory deploy` (or answer yes here) before configuring credentials")
		}

		deploy := opts.deployFn
		if deploy == nil {
			deploy = Deploy
		}
		deployed, err := deploy(ctx, Options{
			Version:     opts.Version,
			BundleDir:   bundleDir,
			ConfigPath:  opts.ConfigPath,
			Out:         out,
			HasCommand:  opts.HasCommand,
			onSecretPut: opts.onSecretPut,
		})
		if err != nil {
			return err
		}

		// The deploy wrote the endpoint and token; re-read so the credential
		// rungs below persist onto that file rather than over it.
		reloaded, err := loadConfig(opts.ConfigPath)
		if err != nil {
			return err
		}
		*cfgp = reloaded
		result.Deployed = true
		result.URL = deployed.URL
		return nil
	}

	if err := verifyOnce(ctx, client, url, cfg.Get(ticksrc.KeyFactoryToken)); err != nil {
		return fmt.Errorf("the factory recorded in %s did not answer: %w\n"+
			"Run `tk factory deploy` to (re)deploy it, then run setup again", cfg.Path(), err)
	}
	fmt.Fprintf(out, "\nFactory %s answers and accepts your token\n", url)
	result.URL = url
	return nil
}

// setupGitHub settles rung 2, the one operator friction lived in: the walk no
// longer stops and asks anyone to hand-build a fine-grained PAT in the GitHub
// UI. It prints a code, the operator approves it at github.com/login/device and
// picks the repositories the factory may use, and what comes back is a
// user-to-server token — narrower than `gh auth token` (every repo, plus
// admin:org) and cheaper than the PAT form.
//
// The credential is still proven TWICE before anything is stored — it
// authenticates, and it can write to the repository the factory will clone —
// because "approved the App but did not tick this repository" is now the single
// most common way this rung is misconfigured, exactly as un-granted repository
// access was for a PAT.
func setupGitHub(
	ctx context.Context,
	w *wrangler,
	in *bufio.Reader,
	raw io.Reader,
	out io.Writer,
	client *http.Client,
	cfg *ticksrc.File,
	opts SetupOptions,
	result *SetupResult,
) error {
	repo := strings.TrimSpace(opts.Repo)
	if repo == "" {
		if detected, err := github.DetectProject(nil); err == nil {
			repo = detected
		}
	}

	apiBase := strings.TrimSuffix(strings.TrimSpace(opts.GitHubAPIBase), "/")
	if apiBase == "" {
		apiBase = defaultGitHubAPIBase
	}

	// --github-token is the manual escape hatch, and it bypasses everything
	// below: an operator who supplies a credential is not asked to approve one.
	cred := githubCredential{Token: strings.TrimSpace(opts.GitHubToken), Auth: AuthPAT}

	if cred.Token == "" {
		kept, next, err := reuseStoredGitHubCredential(ctx, w, in, out, client, cfg, opts, apiBase, repo, result)
		if err != nil {
			return err
		}
		if kept {
			return nil
		}
		if next.Token == "" {
			obtained, err := obtainGitHubCredential(ctx, in, raw, out, opts, repo)
			if err != nil {
				return err
			}
			next = obtained
		}
		cred = next
	}
	if cred.Token == "" {
		return errors.New("a GitHub credential is required — run setup again and approve the ticks App, " +
			"or pass --github-token to supply one directly")
	}

	// Verify before anything is stored.
	login, err := probeGitHubUser(ctx, client, apiBase, cred.Token)
	if err != nil {
		return fmt.Errorf("verifying the GitHub credential: %w", err)
	}
	fmt.Fprintf(out, "GitHub credential accepted for @%s\n", login)

	if repo != "" {
		push, err := probeGitHubRepo(ctx, client, apiBase, cred.Token, repo)
		if err != nil {
			return fmt.Errorf("verifying the GitHub credential against %s: %w\n%s", repo, err, repoScopeRemedy(cred.Auth, repo))
		}
		if !push {
			return fmt.Errorf("the GitHub credential can read %s but cannot write to it\n%s", repo, writeScopeRemedy(cred.Auth, repo))
		}
		fmt.Fprintf(out, "GitHub credential can write to %s\n", repo)
		result.GitHubRepoChecked = true
	} else {
		fmt.Fprintf(out, "note: no git remote to check the repository scope against — "+
			"pass --repo owner/name to verify it\n")
	}

	if err := storeGitHubCredential(ctx, w, out, cfg, opts, cred, login, repo); err != nil {
		return err
	}

	result.GitHubLogin = login
	result.GitHubRepo = repo
	result.GitHubAuth = cred.Auth
	result.GitHubTokenExpiresAt = cred.ExpiresAt
	return nil
}

// reuseStoredGitHubCredential offers back what a previous walk settled, after
// renewing it when it is close enough to its deadline that a run started after
// this walk could outlive it.
//
// It reports kept=true when the operator chose to keep the stored credential
// untouched (nothing more to verify or write), or hands back the credential the
// walk should carry forward — which is the renewed one when a refresh
// succeeded, so the caller re-proves and re-pushes it like any other.
func reuseStoredGitHubCredential(
	ctx context.Context,
	w *wrangler,
	in *bufio.Reader,
	out io.Writer,
	client *http.Client,
	cfg *ticksrc.File,
	opts SetupOptions,
	apiBase string,
	repo string,
	result *SetupResult,
) (bool, githubCredential, error) {
	stored := storedGitHubCredential(cfg)
	if stored.Token == "" {
		return false, githubCredential{}, nil
	}

	flow := opts.deviceFlow(out)
	renewed, didRenew, err := renewGitHubCredential(ctx, flow, out, stored)
	if err != nil {
		// A renewal that could not happen is not fatal: the stored credential
		// may still be live, and if it is not, the probe below says so and the
		// walk mints a fresh one.
		fmt.Fprintf(out, "\nGitHub: the stored credential could not be renewed — %v\n", err)
	}
	if didRenew {
		stored = renewed
	}

	login, probeErr := probeGitHubUser(ctx, client, apiBase, stored.Token)
	if probeErr != nil {
		fmt.Fprintf(out, "\nGitHub: the stored credential no longer works (%v) — a new one is needed\n", probeErr)
		return false, githubCredential{}, nil
	}

	fmt.Fprintf(out, "\nGitHub: the stored credential still works (@%s, %s, %s)\n",
		login, describeAuth(stored.Auth), DescribeGitHubLifetime(stored.ExpiresAt, flow.clock()))

	if didRenew {
		// A renewed token is a NEW credential. It has to reach the Worker and
		// the mirror here, or the factory keeps running on the one that is
		// about to expire.
		storedRepo := repo
		if storedRepo == "" {
			storedRepo = cfg.Get(ticksrc.KeyFactoryGitHubRepo)
		}
		if err := storeGitHubCredential(ctx, w, out, cfg, opts, stored, login, storedRepo); err != nil {
			return false, githubCredential{}, err
		}
		result.GitHubRefreshed = true
	}

	answer, err := promptLine(in, out, "Replace it? [y/N] ")
	if err != nil {
		return false, githubCredential{}, err
	}
	if isYes(answer) {
		return false, githubCredential{}, nil
	}

	result.GitHubLogin = login
	result.GitHubRepo = cfg.Get(ticksrc.KeyFactoryGitHubRepo)
	result.GitHubAuth = stored.Auth
	result.GitHubTokenExpiresAt = stored.ExpiresAt
	fmt.Fprintf(out, "Keeping the stored GitHub credential.\n")
	return true, githubCredential{}, nil
}

// renewGitHubCredential exchanges the refresh token for a fresh one when the
// stored credential is inside githubRefreshWindow of its deadline.
//
// A credential with no deadline is left alone — that is the recommended
// registration for the shared App, which has no client secret to refresh with —
// and so is a PAT, which has no refresh token at all.
func renewGitHubCredential(ctx context.Context, flow DeviceFlowOptions, out io.Writer, stored githubCredential) (githubCredential, bool, error) {
	switch {
	case stored.Auth != AuthDeviceFlow, stored.ExpiresAt.IsZero(), flow.ClientID == "":
		return stored, false, nil
	}
	now := flow.clock()
	if stored.ExpiresAt.Sub(now) > githubRefreshWindow {
		return stored, false, nil
	}
	if stored.RefreshToken == "" {
		return stored, false, fmt.Errorf("it %s and no refresh token was stored with it",
			DescribeGitHubLifetime(stored.ExpiresAt, now))
	}
	if !stored.RefreshExpiresAt.IsZero() && !stored.RefreshExpiresAt.After(now) {
		return stored, false, fmt.Errorf("its refresh token expired on %s, so renewal needs one browser approval again",
			formatDeadline(stored.RefreshExpiresAt))
	}

	fmt.Fprintf(out, "\nGitHub: the stored credential %s — renewing it without a browser\n",
		DescribeGitHubLifetime(stored.ExpiresAt, now))
	token, err := RefreshUserToken(ctx, flow, stored.RefreshToken)
	if err != nil {
		return stored, false, err
	}
	return credentialFromUserToken(token), true, nil
}

// obtainGitHubCredential gets a credential the operator does not yet have: the
// device flow when this build names an App, and the manual PAT prompt when it
// does not — so a build with no client id is a build with the old walk, never a
// build with a broken one.
func obtainGitHubCredential(
	ctx context.Context,
	in *bufio.Reader,
	raw io.Reader,
	out io.Writer,
	opts SetupOptions,
	repo string,
) (githubCredential, error) {
	flow := opts.deviceFlow(out)

	fmt.Fprintf(out, "\nGitHub credential\n")
	if flow.ClientID != "" {
		fmt.Fprintf(out, "No access token to create by hand: approve the ticks GitHub App instead.\n")
		fmt.Fprintf(out, "It asks for Contents and Pull requests on the repositories YOU pick, and\n")
		fmt.Fprintf(out, "the credential it hands back can reach nothing else.\n")
		token, err := DeviceFlow(ctx, flow)
		if err != nil {
			return githubCredential{}, err
		}
		return credentialFromUserToken(token), nil
	}

	fmt.Fprintf(out, "This tk build ships no GitHub App client id, so the device flow is not\n")
	fmt.Fprintf(out, "available and a token has to be supplied by hand.\n")
	fmt.Fprintf(out, "Create a fine-grained personal access token scoped to %s with\n", orThisRepo(repo))
	fmt.Fprintf(out, "Contents: Read and write, and Pull requests: Read and write:\n")
	fmt.Fprintf(out, "  https://github.com/settings/personal-access-tokens/new\n")
	fmt.Fprintf(out, "%s\n\n", gitHubAppUpgradeNote)

	typed, err := promptSecret(in, raw, out, "Fine-grained PAT: ")
	if err != nil {
		return githubCredential{}, err
	}
	return githubCredential{Token: strings.TrimSpace(typed), Auth: AuthPAT}, nil
}

// storeGitHubCredential persists a VERIFIED credential: the Worker secret first
// (the copy that matters to a run), the local mirror second (the copy `tk
// factory status` reads).
//
// The refresh token is written to the mirror and NOWHERE else. It outlives the
// token it mints, so pushing it as a Worker secret — from where a sandbox could
// read it — would hand a run a longer-lived credential than the one it needs,
// which is exactly what D11 forbids.
func storeGitHubCredential(
	ctx context.Context,
	w *wrangler,
	out io.Writer,
	cfg *ticksrc.File,
	opts SetupOptions,
	cred githubCredential,
	login string,
	repo string,
) error {
	if err := putSecret(ctx, w, opts, SecretGitHubToken, cred.Token); err != nil {
		return err
	}
	cfg.Set(ticksrc.KeyFactoryGitHubToken, cred.Token)
	cfg.Set(ticksrc.KeyFactoryGitHubLogin, login)
	cfg.Set(ticksrc.KeyFactoryGitHubRepo, repo)
	cfg.Set(ticksrc.KeyFactoryGitHubAuth, cred.Auth)
	cfg.Set(ticksrc.KeyFactoryGitHubTokenExpires, formatDeadline(cred.ExpiresAt))
	cfg.Set(ticksrc.KeyFactoryGitHubRefreshToken, cred.RefreshToken)
	cfg.Set(ticksrc.KeyFactoryGitHubRefreshExpires, formatDeadline(cred.RefreshExpiresAt))
	if err := cfg.Save(); err != nil {
		return err
	}
	fmt.Fprintf(out, "%s stored as a Worker secret\n", SecretGitHubToken)
	if cred.Auth == AuthDeviceFlow && !cred.ExpiresAt.IsZero() {
		// Say the deadline out loud at the moment it is created. A run that
		// outlives it fails at its push, and the operator should have read the
		// number once before that happens.
		fmt.Fprintf(out, "  the credential %s; `tk factory setup` renews it without a browser\n",
			DescribeGitHubLifetime(cred.ExpiresAt, opts.deviceFlow(io.Discard).clock()))
	}
	return nil
}

// describeAuth names the rung a stored credential came from.
func describeAuth(auth string) string {
	switch auth {
	case AuthDeviceFlow:
		return "device flow"
	case AuthPAT:
		return "token supplied by hand"
	default:
		return auth
	}
}

// repoScopeRemedy names what to fix when the credential cannot SEE the repo.
// The two rungs fail identically at the API and are fixed in completely
// different places, so one message for both would send half the operators to
// the wrong screen.
func repoScopeRemedy(auth, repo string) string {
	if auth == AuthDeviceFlow {
		return fmt.Sprintf("The ticks App is not installed on %s, or you did not select it when you "+
			"approved the code. Run `tk factory setup` again and tick that repository.", repo)
	}
	return fmt.Sprintf("List %s under the token's Repository access, then run setup again.", repo)
}

// writeScopeRemedy names what to fix when the credential can read but not push.
func writeScopeRemedy(auth, repo string) string {
	if auth == AuthDeviceFlow {
		return fmt.Sprintf("Grant the ticks App Contents: Read and write on %s in your GitHub App "+
			"installation settings, then run setup again.", repo)
	}
	return fmt.Sprintf("Grant the token Contents: Read and write on %s, then run setup again.", repo)
}

// setupGateway settles rung 3: all cloud model traffic goes through the
// operator's own AI Gateway (D17), so the gateway URL and the provider key
// behind it are configured — and proven — together, with one model-list call
// through the gateway.
func setupGateway(
	ctx context.Context,
	w *wrangler,
	in *bufio.Reader,
	raw io.Reader,
	out io.Writer,
	client *http.Client,
	cfg *ticksrc.File,
	opts SetupOptions,
	result *SetupResult,
) error {
	gatewayURL := strings.TrimSpace(opts.GatewayURL)
	if gatewayURL == "" {
		stored := cfg.Get(ticksrc.KeyFactoryGatewayURL)
		fmt.Fprintf(out, "\nModel access\n")
		fmt.Fprintf(out, "All cloud model traffic goes through one AI Gateway in your own Cloudflare\n")
		fmt.Fprintf(out, "account, which is what makes spend visible and a run's access revocable.\n")
		fmt.Fprintf(out, "Create one at https://dash.cloudflare.com → AI → AI Gateway; its base URL\n")
		fmt.Fprintf(out, "looks like https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway>\n")
		prompt := "AI Gateway base URL: "
		if stored != "" {
			prompt = fmt.Sprintf("AI Gateway base URL [%s]: ", stored)
		}
		typed, err := promptLine(in, out, prompt)
		if err != nil {
			return err
		}
		gatewayURL = strings.TrimSpace(typed)
		if gatewayURL == "" {
			gatewayURL = stored
		}
	}
	gatewayURL = strings.TrimSuffix(strings.TrimSpace(gatewayURL), "/")
	if gatewayURL == "" {
		return errors.New("an AI Gateway base URL is required — create a gateway in your Cloudflare account and run setup again")
	}
	if parsed, err := url.Parse(gatewayURL); err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" {
		return fmt.Errorf("gateway: %q is not a base URL — it should look like https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway>", gatewayURL)
	}

	choice := strings.TrimSpace(opts.Provider)
	if choice == "" {
		if stored := cfg.Get(ticksrc.KeyFactoryGatewayProvider); stored != "" {
			choice = stored
		} else {
			fmt.Fprintf(out, "\nWhich provider is behind the gateway?\n")
			for i, spec := range Providers {
				fmt.Fprintf(out, "  %d) %s\n", i+1, spec.Label)
			}
			typed, err := promptLine(in, out, "Provider [1]: ")
			if err != nil {
				return err
			}
			choice = strings.TrimSpace(typed)
			if choice == "" {
				choice = Providers[0].ID
			}
		}
	}
	provider, ok := LookupProvider(choice)
	if !ok {
		return fmt.Errorf("gateway: unknown provider %q — choose one of %s", choice, providerIDs())
	}

	key := strings.TrimSpace(opts.ProviderKey)
	if provider.NeedsKey() {
		if key == "" {
			key = cfg.Get(ticksrc.KeyFactoryGatewayKey)
		}
		if key == "" {
			typed, err := promptSecret(in, raw, out, provider.KeyHint+": ")
			if err != nil {
				return err
			}
			key = typed
		}
		if key == "" {
			return fmt.Errorf("gateway: %s needs an API key — paste one and run setup again", provider.ID)
		}
	} else {
		key = ""
		fmt.Fprintf(out, "Workers AI needs no key: inference bills to the same Cloudflare account,\n")
		fmt.Fprintf(out, "through the factory's own AI binding.\n")
	}

	// One live call through the gateway proves both halves of this rung: that
	// the URL is a gateway and that the key behind it is accepted.
	probe, err := probeGateway(ctx, client, gatewayURL, key)
	if err != nil {
		return fmt.Errorf("verifying the AI Gateway at %s: %w", gatewayURL, err)
	}
	switch {
	case probe.AuthRejected && provider.NeedsKey():
		return fmt.Errorf("the AI Gateway at %s rejected the %s key — check the key and the gateway's provider configuration, then run setup again",
			gatewayURL, provider.ID)
	case probe.AuthRejected:
		// Workers AI is called with the account's own credentials from inside
		// the Worker, so a gateway that will not list models to an anonymous
		// caller is expected: reachability is all this rung can prove locally.
		fmt.Fprintf(out, "AI Gateway %s is reachable (it lists no models without a key, which is expected)\n", gatewayURL)
	default:
		fmt.Fprintf(out, "AI Gateway %s answered with %d models (%s)\n", gatewayURL, len(probe.Models), summarizeModels(probe.Models))
		result.Models = probe.Models
	}

	if err := putSecret(ctx, w, opts, SecretGatewayBaseURL, gatewayURL); err != nil {
		return err
	}
	if provider.NeedsKey() {
		if err := putSecret(ctx, w, opts, provider.SecretName, key); err != nil {
			return err
		}
		fmt.Fprintf(out, "%s stored as a Worker secret\n", provider.SecretName)
		result.ProviderKeyStored = true
	}
	cfg.Set(ticksrc.KeyFactoryGatewayURL, gatewayURL)
	cfg.Set(ticksrc.KeyFactoryGatewayProvider, provider.ID)
	cfg.Set(ticksrc.KeyFactoryGatewayKey, key)
	if err := cfg.Save(); err != nil {
		return err
	}

	result.GatewayURL = gatewayURL
	result.Provider = provider.ID

	return setupCostTelemetry(ctx, w, out, client, cfg, opts, gatewayURL, result)
}

// gatewayIDs pulls the account and gateway out of a Cloudflare AI Gateway base
// URL (https://gateway.ai.cloudflare.com/v1/<account>/<gateway>). A gateway
// hosted anywhere else has no logs API to read, which the caller reports
// rather than guessing at.
func gatewayIDs(gatewayURL string) (account, gateway string, ok bool) {
	parsed, err := url.Parse(gatewayURL)
	if err != nil {
		return "", "", false
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) < 3 || parts[0] != "v1" {
		return "", "", false
	}
	return parts[1], parts[2], true
}

// defaultCloudflareAPIBase is Cloudflare's REST root.
const defaultCloudflareAPIBase = "https://api.cloudflare.com/client/v4"

// setupCostTelemetry settles the half of the gateway rung that makes spend
// visible: a Cloudflare API token the factory reads the gateway's logs with.
//
// Optional, and loudly so. Everything else on this rung is required because
// without it a run cannot make a model call at all; this one only decides
// whether the cost budget has a number to act on, and a factory that silently
// reported $0 for every run would be worse than one that says it cannot tell.
func setupCostTelemetry(
	ctx context.Context,
	w *wrangler,
	out io.Writer,
	client *http.Client,
	cfg *ticksrc.File,
	opts SetupOptions,
	gatewayURL string,
	result *SetupResult,
) error {
	token := strings.TrimSpace(opts.CloudflareAPIToken)
	if token == "" {
		token = cfg.Get(ticksrc.KeyFactoryCloudflareAPIToken)
	}
	if token == "" {
		fmt.Fprintf(out, "\nCost telemetry is not configured.\n")
		fmt.Fprintf(out, "A run's budget is enforced on what the GATEWAY billed, never on what the\n")
		fmt.Fprintf(out, "agent says it spent — which needs a Cloudflare API token with AI Gateway\n")
		fmt.Fprintf(out, "read access. Without one, runs still route and attribute their model\n")
		fmt.Fprintf(out, "traffic, but the cost budget has nothing to act on and each run records\n")
		fmt.Fprintf(out, "its cost as unknown.\n")
		fmt.Fprintf(out, "The same token is what reads the gateway's Workers AI billing mode, so\n")
		fmt.Fprintf(out, "without it nothing checks whether Workers AI still bills to your Cloudflare\n")
		fmt.Fprintf(out, "invoice or has been moved onto a prepaid AI Gateway wallet.\n")
		fmt.Fprintf(out, "Add one with: tk factory setup --cloudflare-api-token <token>\n")
		if chosen := strings.TrimSpace(opts.WorkersAIBillingMode); chosen != "" {
			mode, err := ExpectedBillingMode(chosen)
			if err != nil {
				return err
			}
			cfg.Set(ticksrc.KeyFactoryWorkersAIBillingMode, mode)
			if err := cfg.Save(); err != nil {
				return err
			}
			result.WorkersAIBillingMode = mode
			fmt.Fprintf(out, "Recorded %s as the expected billing mode — nothing can verify it until a token is configured.\n", mode)
		}
		return nil
	}

	account, gateway, ok := gatewayIDs(gatewayURL)
	if !ok {
		return fmt.Errorf("gateway: %s does not name a Cloudflare account and gateway, so its logs cannot be read — remove --cloudflare-api-token or point the gateway at https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway>", gatewayURL)
	}
	if err := probeGatewayLogs(ctx, client, opts.CloudflareAPIBase, account, gateway, token); err != nil {
		return fmt.Errorf("verifying the Cloudflare API token against gateway %s: %w", gateway, err)
	}

	// The same token answers a second question the logs cannot: which wallet
	// the spend it reports comes out of. Assert it before anything is stored,
	// so a factory is never configured against a gateway that has quietly
	// moved off the invoice.
	expected := strings.TrimSpace(opts.WorkersAIBillingMode)
	if expected == "" {
		expected = cfg.Get(ticksrc.KeyFactoryWorkersAIBillingMode)
	}
	mode, err := CheckWorkersAIBilling(ctx, BillingOptions{
		HTTPClient:         client,
		CloudflareAPIBase:  opts.CloudflareAPIBase,
		GatewayURL:         gatewayURL,
		CloudflareAPIToken: token,
		Expected:           expected,
	})
	if err != nil {
		return fmt.Errorf("Workers AI billing: %w", err)
	}

	if err := putSecret(ctx, w, opts, SecretCloudflareAPIToken, token); err != nil {
		return err
	}
	cfg.Set(ticksrc.KeyFactoryCloudflareAPIToken, token)
	cfg.Set(ticksrc.KeyFactoryWorkersAIBillingMode, mode)
	if err := cfg.Save(); err != nil {
		return err
	}
	fmt.Fprintf(out, "%s stored as a Worker secret — run cost comes from gateway logs\n", SecretCloudflareAPIToken)
	fmt.Fprintf(out, "Workers AI billing mode: %s — %s\n", mode, DescribeBillingMode(mode))
	result.CostTelemetry = true
	result.WorkersAIBillingMode = mode
	return nil
}

// probeGatewayLogs proves the token can read THIS gateway's logs, which is the
// call the Run Workflow will make: a token that authenticates but cannot see
// the gateway is a green start waiting to happen.
func probeGatewayLogs(ctx context.Context, client *http.Client, apiBase, account, gateway, token string) error {
	if apiBase == "" {
		apiBase = defaultCloudflareAPIBase
	}
	endpoint := fmt.Sprintf("%s/accounts/%s/ai-gateway/gateways/%s/logs?per_page=1",
		strings.TrimSuffix(apiBase, "/"), account, gateway)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<10))
	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		return fmt.Errorf("the token was rejected (%s) — it needs AI Gateway read access on this account", resp.Status)
	case resp.StatusCode == http.StatusNotFound:
		return fmt.Errorf("no gateway %q in account %s", gateway, account)
	case resp.StatusCode >= 300:
		return fmt.Errorf("the logs API answered %s: %s", resp.Status, strings.TrimSpace(string(body)))
	}
	var payload struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return fmt.Errorf("the logs API answered something that is not JSON")
	}
	if !payload.Success {
		message := "the API reported failure"
		if len(payload.Errors) > 0 && payload.Errors[0].Message != "" {
			message = payload.Errors[0].Message
		}
		return fmt.Errorf("the logs API refused the read: %s", message)
	}
	return nil
}

// putSecret pushes one Worker secret and notifies the test hook, so every
// secret this command stores travels the same single path.
func putSecret(ctx context.Context, w *wrangler, opts SetupOptions, name, value string) error {
	if err := w.putSecret(ctx, name, value); err != nil {
		return fmt.Errorf("setting the %s secret: %w", name, err)
	}
	if opts.onSecretPut != nil {
		opts.onSecretPut()
	}
	return nil
}

// ---------------------------------------------------------------------------
// Live probes
// ---------------------------------------------------------------------------

// probeGitHubUser asks GitHub who the token is. It is the cheapest call that
// distinguishes a live token from a revoked, mistyped or expired one.
func probeGitHubUser(ctx context.Context, client *http.Client, apiBase, token string) (string, error) {
	var payload struct {
		Login string `json:"login"`
	}
	if err := githubGet(ctx, client, apiBase+"/user", token, &payload); err != nil {
		return "", err
	}
	if payload.Login == "" {
		return "", errors.New("GitHub accepted the token but named no account")
	}
	return payload.Login, nil
}

// probeGitHubRepo reports whether the token can write to owner/repo.
func probeGitHubRepo(ctx context.Context, client *http.Client, apiBase, token, repo string) (bool, error) {
	var payload struct {
		FullName    string `json:"full_name"`
		Permissions struct {
			Push bool `json:"push"`
		} `json:"permissions"`
	}
	if err := githubGet(ctx, client, apiBase+"/repos/"+repo, token, &payload); err != nil {
		return false, err
	}
	return payload.Permissions.Push, nil
}

// githubGet performs one authenticated GitHub request, turning the API's own
// error shapes into messages that name what to fix.
func githubGet(ctx context.Context, client *http.Client, endpoint, token string, into any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	switch resp.StatusCode {
	case http.StatusOK:
		if err := json.Unmarshal(body, into); err != nil {
			return fmt.Errorf("could not read GitHub's response: %w", err)
		}
		return nil
	case http.StatusUnauthorized:
		return errors.New("GitHub rejected the token (401) — it is wrong, expired or revoked")
	case http.StatusForbidden:
		return fmt.Errorf("GitHub refused the request (403): %s", githubMessage(body))
	case http.StatusNotFound:
		// A credential sees a 404, not a 403, for a repository it was never
		// granted — so this is the repo-scope message, not a typo one. WHICH
		// grant is missing depends on the rung, so the remedy is added by the
		// caller that knows it (repoScopeRemedy).
		return errors.New("not visible to this credential (404) — it was never granted access to this repository")
	default:
		return fmt.Errorf("GitHub returned %s: %s", resp.Status, githubMessage(body))
	}
}

func githubMessage(body []byte) string {
	var payload struct {
		Message string `json:"message"`
	}
	if err := json.Unmarshal(body, &payload); err == nil && payload.Message != "" {
		return payload.Message
	}
	return strings.TrimSpace(string(body))
}

// gatewayProbe is what a model-list call through the gateway learned.
type gatewayProbe struct {
	Models []string
	// AuthRejected reports a gateway that answered but refused the caller —
	// a wrong key for a BYOK provider, and the expected answer for Workers AI,
	// which is called with the account's own credentials from the Worker.
	AuthRejected bool
}

// probeGateway lists models through the gateway's OpenAI-compatible endpoint.
// It is the one call that exercises the whole path the runs will use: the
// gateway route, the provider binding behind it, and the key.
func probeGateway(ctx context.Context, client *http.Client, base, key string) (gatewayProbe, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimSuffix(base, "/")+"/compat/models", nil)
	if err != nil {
		return gatewayProbe{}, err
	}
	if key != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	resp, err := client.Do(req)
	if err != nil {
		return gatewayProbe{}, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		return gatewayProbe{AuthRejected: true}, nil
	case resp.StatusCode != http.StatusOK:
		return gatewayProbe{}, fmt.Errorf("GET /compat/models returned %s: %s", resp.Status, firstLine(body))
	}

	var payload struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return gatewayProbe{}, fmt.Errorf("the endpoint answered but not with a model list — check the base URL: %w", err)
	}
	models := make([]string, 0, len(payload.Data))
	for _, m := range payload.Data {
		if m.ID != "" {
			models = append(models, m.ID)
		}
	}
	if len(models) == 0 {
		return gatewayProbe{}, errors.New("the gateway listed no models — check that the gateway has a provider configured")
	}
	return gatewayProbe{Models: models}, nil
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

// promptLine asks a question and reads one line. EOF is an empty answer, not a
// failure: a piped answer sheet that runs out means "take the default".
func promptLine(in *bufio.Reader, out io.Writer, label string) (string, error) {
	fmt.Fprint(out, label)
	line, err := in.ReadString('\n')
	line = strings.TrimRight(line, "\r\n")
	if err != nil && !errors.Is(err, io.EOF) {
		return "", fmt.Errorf("reading the response: %w", err)
	}
	return strings.TrimSpace(line), nil
}

// promptSecret reads a credential without echoing it on a terminal, so it does
// not survive in the scrollback of a shared session. A pipe (or a test reader)
// takes the shared buffered path, which is what keeps a piped answer sheet
// answering every prompt in order.
func promptSecret(in *bufio.Reader, raw io.Reader, out io.Writer, label string) (string, error) {
	fmt.Fprint(out, label)
	if file, ok := raw.(*os.File); ok {
		fd := int(file.Fd())
		if term.IsTerminal(fd) {
			secret, err := term.ReadPassword(fd)
			fmt.Fprintln(out)
			if err != nil {
				return "", fmt.Errorf("reading the value: %w", err)
			}
			return strings.TrimSpace(string(secret)), nil
		}
	}
	line, err := in.ReadString('\n')
	line = strings.TrimRight(line, "\r\n")
	if err != nil && !errors.Is(err, io.EOF) {
		return "", fmt.Errorf("reading the value: %w", err)
	}
	return strings.TrimSpace(line), nil
}

func isYes(answer string) bool {
	switch strings.ToLower(strings.TrimSpace(answer)) {
	case "y", "yes":
		return true
	}
	return false
}

// isYesDefaultYes is for the [Y/n] prompts: silence accepts.
func isYesDefaultYes(answer string) bool {
	switch strings.ToLower(strings.TrimSpace(answer)) {
	case "", "y", "yes":
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

func providerIDs() string {
	ids := make([]string, 0, len(Providers))
	for _, spec := range Providers {
		ids = append(ids, spec.ID)
	}
	return strings.Join(ids, ", ")
}

func orThisRepo(repo string) string {
	if repo == "" {
		return "the repository the factory will run on"
	}
	return repo
}

func summarizeModels(models []string) string {
	const shown = 3
	if len(models) <= shown {
		return strings.Join(models, ", ")
	}
	return strings.Join(models[:shown], ", ") + ", …"
}

func firstLine(body []byte) string {
	text := strings.TrimSpace(string(body))
	if i := strings.IndexByte(text, '\n'); i >= 0 {
		return text[:i]
	}
	if len(text) > 200 {
		return text[:200]
	}
	return text
}
