package factory

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// `tk factory status` answers two questions the ladder leaves open: what is
// configured, and does it still work. It follows `tk channel status` exactly —
// live checks by default, --offline to skip them, and a rejected credential
// reported either way, because a status call has to be safe to make
// unconditionally (in a script, on a plane, before a run).
//
// Nothing here prints a credential. It reports the public half — the account a
// token authenticates as, the repository it can reach, the provider behind the
// gateway — and whether the live check passed.

// StatusOptions configures a status report.
type StatusOptions struct {
	// ConfigPath overrides the ~/.ticksrc location (tests).
	ConfigPath string

	// Offline skips every live check.
	Offline bool

	// HTTPClient makes the live checks. Nil means a client with a short
	// timeout.
	HTTPClient *http.Client

	// GitHubAPIBase overrides https://api.github.com (tests, GHES).
	GitHubAPIBase string

	// CloudflareAPIBase overrides https://api.cloudflare.com/client/v4
	// (tests).
	CloudflareAPIBase string
}

// CredentialState is one rung's line in the report.
type CredentialState struct {
	// Name is the rung's stable identifier, and what Failures() reports.
	Name string
	// Configured reports whether anything is stored for this rung.
	Configured bool
	// Summary is the public description of what is configured.
	Summary string
	// Checked reports whether a live check ran; OK is its verdict.
	Checked bool
	OK      bool
	// Detail carries the live check's outcome, or why it did not run.
	Detail string
}

// StatusReport is the whole ladder's state.
type StatusReport struct {
	ConfigPath string
	Deployment CredentialState
	GitHub     CredentialState
	Gateway    CredentialState
	// Telemetry is the credential a run's cost is read with (D17). It is its
	// own rung because "model traffic routes" and "spend is visible" fail
	// separately, and a factory whose budget has nothing to act on must not
	// look like a healthy one.
	Telemetry CredentialState
	// Billing is which pot the gateway's Workers AI traffic bills to. It is
	// not a credential at all — it is a per-gateway setting one dashboard
	// click changes, moving every run from the Cloudflare invoice an account
	// credit pays onto a separately purchased prepaid wallet, with the
	// identical cost reported either way. Status is where an operator can see
	// that before submitting a run.
	Billing CredentialState
}

// rungs returns the report's states in the order the ladder is walked.
func (r *StatusReport) rungs() []CredentialState {
	return []CredentialState{r.Deployment, r.GitHub, r.Gateway, r.Telemetry, r.Billing}
}

// Configured reports whether any rung has been walked at all.
func (r *StatusReport) Configured() bool {
	for _, state := range r.rungs() {
		if state.Configured {
			return true
		}
	}
	return false
}

// Failures names the rungs that are configured and were checked and rejected.
// A rung that is not configured, or was not checked, is not a failure — that
// is what keeps `tk factory status --offline` and a half-walked ladder from
// reporting problems that do not exist.
func (r *StatusReport) Failures() []string {
	var failed []string
	for _, state := range r.rungs() {
		if state.Configured && state.Checked && !state.OK {
			failed = append(failed, state.Name)
		}
	}
	return failed
}

// Status reads the local mirror and, unless offline, re-checks each credential
// against the service that issued it.
func Status(ctx context.Context, opts StatusOptions) (*StatusReport, error) {
	cfg, err := loadConfig(opts.ConfigPath)
	if err != nil {
		return nil, err
	}
	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	apiBase := strings.TrimSuffix(strings.TrimSpace(opts.GitHubAPIBase), "/")
	if apiBase == "" {
		apiBase = defaultGitHubAPIBase
	}

	report := &StatusReport{ConfigPath: cfg.Path()}

	// Deployment.
	url := strings.TrimSuffix(cfg.Get(ticksrc.KeyFactoryURL), "/")
	report.Deployment = CredentialState{Name: "deployment"}
	if url != "" {
		report.Deployment.Configured = true
		report.Deployment.Summary = url
		if version := cfg.Get(ticksrc.KeyFactoryVersion); version != "" {
			report.Deployment.Summary += " (tk " + version + ")"
		}
		switch {
		case opts.Offline:
			report.Deployment.Detail = "not checked (--offline)"
		default:
			report.Deployment.Checked = true
			if err := verifyOnce(ctx, client, url, cfg.Get(ticksrc.KeyFactoryToken)); err != nil {
				report.Deployment.Detail = "rejected: " + err.Error()
			} else {
				report.Deployment.OK = true
				report.Deployment.Detail = "live, and it accepts your token"
			}
		}
	}

	// GitHub.
	token := cfg.Get(ticksrc.KeyFactoryGitHubToken)
	repo := cfg.Get(ticksrc.KeyFactoryGitHubRepo)
	report.GitHub = CredentialState{Name: "github"}
	if token != "" {
		report.GitHub.Configured = true
		report.GitHub.Summary = describeGitHub(cfg.Get(ticksrc.KeyFactoryGitHubLogin), repo)
		switch {
		case opts.Offline:
			report.GitHub.Detail = "not checked (--offline)"
		default:
			report.GitHub.Checked = true
			login, err := probeGitHubUser(ctx, client, apiBase, token)
			if err != nil {
				report.GitHub.Detail = "rejected: " + err.Error()
				break
			}
			if repo == "" {
				report.GitHub.OK = true
				report.GitHub.Detail = fmt.Sprintf("live (@%s); no repository recorded to check the scope against", login)
				break
			}
			push, err := probeGitHubRepo(ctx, client, apiBase, token, repo)
			switch {
			case err != nil:
				report.GitHub.Detail = fmt.Sprintf("rejected for %s: %v", repo, err)
			case !push:
				report.GitHub.Detail = fmt.Sprintf("rejected: read-only on %s — the factory could not push", repo)
			default:
				report.GitHub.OK = true
				report.GitHub.Detail = fmt.Sprintf("live (@%s), can write to %s", login, repo)
			}
		}
	}

	// Gateway and the provider behind it.
	gateway := strings.TrimSuffix(cfg.Get(ticksrc.KeyFactoryGatewayURL), "/")
	providerID := cfg.Get(ticksrc.KeyFactoryGatewayProvider)
	key := cfg.Get(ticksrc.KeyFactoryGatewayKey)
	report.Gateway = CredentialState{Name: "gateway"}
	if gateway != "" {
		report.Gateway.Configured = true
		report.Gateway.Summary = describeGateway(gateway, providerID, key != "")
		switch {
		case opts.Offline:
			report.Gateway.Detail = "not checked (--offline)"
		default:
			report.Gateway.Checked = true
			probe, err := probeGateway(ctx, client, gateway, key)
			provider, known := LookupProvider(providerID)
			switch {
			case err != nil:
				report.Gateway.Detail = "rejected: " + err.Error()
			case probe.AuthRejected && known && !provider.NeedsKey():
				// Workers AI is called from the Worker with the account's own
				// credentials, so an anonymous model list is not expected to
				// succeed: reachability is the whole local claim.
				report.Gateway.OK = true
				report.Gateway.Detail = "reachable (Workers AI needs no key from here)"
			case probe.AuthRejected:
				report.Gateway.Detail = "rejected: the gateway refused the stored provider key"
			default:
				report.Gateway.OK = true
				report.Gateway.Detail = fmt.Sprintf("live, %d models (%s)", len(probe.Models), summarizeModels(probe.Models))
			}
		}
	}

	// Cost telemetry: the credential the Run Workflow reads gateway spend with.
	telemetry := cfg.Get(ticksrc.KeyFactoryCloudflareAPIToken)
	report.Telemetry = CredentialState{Name: "cost telemetry"}
	if telemetry != "" {
		report.Telemetry.Configured = true
		report.Telemetry.Summary = "Cloudflare API token — run cost comes from gateway logs"
		account, gatewayID, ok := gatewayIDs(gateway)
		switch {
		case opts.Offline:
			report.Telemetry.Detail = "not checked (--offline)"
		case !ok:
			report.Telemetry.Checked = true
			report.Telemetry.Detail = "rejected: the gateway URL names no Cloudflare account and gateway to read logs from"
		default:
			report.Telemetry.Checked = true
			if err := probeGatewayLogs(ctx, client, opts.CloudflareAPIBase, account, gatewayID, telemetry); err != nil {
				report.Telemetry.Detail = "rejected: " + err.Error()
			} else {
				report.Telemetry.OK = true
				report.Telemetry.Detail = "live, gateway logs readable"
			}
		}
	}

	// Workers AI billing mode: which wallet the spend above comes out of.
	report.Billing = CredentialState{Name: "workers ai billing"}
	if gateway != "" {
		report.Billing.Configured = true
		stored := cfg.Get(ticksrc.KeyFactoryWorkersAIBillingMode)
		expected, expectedErr := ExpectedBillingMode(stored)
		_, gatewayID, ok := gatewayIDs(gateway)
		switch {
		case expectedErr != nil:
			report.Billing.Summary = fmt.Sprintf("%s (recorded in %s)", stored, cfg.Path())
			report.Billing.Checked = true
			report.Billing.Detail = "rejected: " + expectedErr.Error()
		case opts.Offline:
			report.Billing.Summary = describeBillingExpectation(expected, stored)
			report.Billing.Detail = "not checked (--offline)"
		case telemetry == "":
			report.Billing.Summary = describeBillingExpectation(expected, stored)
			report.Billing.Detail = "not checked — reading the gateway's billing mode needs the same " +
				"Cloudflare API token as cost telemetry"
		case !ok:
			report.Billing.Summary = describeBillingExpectation(expected, stored)
			report.Billing.Checked = true
			report.Billing.Detail = "rejected: the gateway URL names no Cloudflare account and gateway to read the billing mode from"
		default:
			report.Billing.Summary = describeBillingExpectation(expected, stored)
			report.Billing.Checked = true
			mode, err := CheckWorkersAIBilling(ctx, BillingOptions{
				HTTPClient:         client,
				CloudflareAPIBase:  opts.CloudflareAPIBase,
				GatewayURL:         gateway,
				CloudflareAPIToken: telemetry,
				Expected:           expected,
			})
			if err != nil {
				report.Billing.Detail = "rejected: " + err.Error()
			} else {
				report.Billing.OK = true
				report.Billing.Detail = fmt.Sprintf("live, gateway %s reports %s billing", gatewayID, mode)
			}
		}
	}

	return report, nil
}

// describeBillingExpectation says which mode is asserted and whether that was
// chosen or defaulted, because "postpaid because nobody said otherwise" and
// "postpaid because the operator settled on it" read the same in a report and
// are not the same claim.
func describeBillingExpectation(expected, stored string) string {
	source := "the default"
	if strings.TrimSpace(stored) != "" {
		source = "recorded"
	}
	return fmt.Sprintf("expects %s (%s) — %s", expected, source, DescribeBillingMode(expected))
}

// Write renders the report the way `tk channel status` renders channels: what
// is configured first, then whether it works.
func (r *StatusReport) Write(w io.Writer) {
	if !r.Configured() {
		fmt.Fprintln(w, "No factory is configured.")
		fmt.Fprintln(w, "Run 'tk factory setup' to deploy one and walk the credential ladder.")
		return
	}

	fmt.Fprintf(w, "Factory config: %s\n", r.ConfigPath)
	for _, state := range r.rungs() {
		fmt.Fprintf(w, "\n%s\n", state.Name)
		if !state.Configured {
			hint := "run 'tk factory setup'"
			if state.Name == "cost telemetry" {
				// The one rung a factory runs without. Say what it costs, and
				// say the flag: a budget with nothing to act on is a fact the
				// operator should choose, not discover after a run.
				hint = "run cost is unknown and the cost budget cannot act — add one with 'tk factory setup --cloudflare-api-token <token>'"
			}
			fmt.Fprintf(w, "  state         not configured — %s\n", hint)
			continue
		}
		fmt.Fprintf(w, "  configured    %s\n", state.Summary)
		fmt.Fprintf(w, "  check         %s\n", orUnchecked(state.Detail))
	}
}

func orUnchecked(detail string) string {
	if detail == "" {
		return "not checked"
	}
	return detail
}

func describeGitHub(login, repo string) string {
	parts := []string{"fine-grained PAT"}
	if login != "" {
		parts = append(parts, "@"+login)
	}
	if repo != "" {
		parts = append(parts, "for "+repo)
	}
	return strings.Join(parts, " ")
}

func describeGateway(url, provider string, hasKey bool) string {
	if provider == "" {
		provider = "(no provider recorded)"
	}
	suffix := "no key needed"
	if hasKey {
		suffix = "key stored as a Worker secret"
	}
	return fmt.Sprintf("%s — %s, %s", url, provider, suffix)
}
