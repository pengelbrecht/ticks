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
}

// rungs returns the report's states in the order the ladder is walked.
func (r *StatusReport) rungs() []CredentialState {
	return []CredentialState{r.Deployment, r.GitHub, r.Gateway}
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

	return report, nil
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
			fmt.Fprintf(w, "  state         not configured — run 'tk factory setup'\n")
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
