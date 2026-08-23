package factory

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// An AI Gateway carries a per-gateway Workers AI billing mode, and it decides
// which pot a run's model spend comes out of (repo-wiki/cloud-factory-billing.md):
//
//   - postpaid — Workers AI lands on the normal Cloudflare invoice, where an
//     account credit can absorb it.
//   - unified  — the same traffic drains a separately purchased prepaid AI
//     Gateway wallet, bought at a 5% premium.
//
// The trap is that flipping between them is one click in the dashboard. It is
// not in wrangler.toml, it is not versioned, it is not reviewed, and NOTHING in
// a run's telemetry records which mode was in force: the gateway logs report
// the same `cost` either way. So a factory can move from credit-funded to
// cash-funded with no signal at all.
//
// The only place to catch that is before a run starts, by reading the mode off
// the gateway itself and asserting it is the one the operator settled on.

// The modes Cloudflare's AI Gateway API reports.
const (
	// BillingModePostpaid bills Workers AI to the Cloudflare invoice.
	BillingModePostpaid = "postpaid"
	// BillingModeUnified bills Workers AI to the prepaid AI Gateway wallet.
	BillingModeUnified = "unified"
)

// DefaultWorkersAIBillingMode is what a factory asserts when the operator has
// settled nothing. It is postpaid because that is the mode that reaches the
// invoice an account credit pays: a factory that has never been told otherwise
// must fail on unified rather than quietly spend cash.
const DefaultWorkersAIBillingMode = BillingModePostpaid

// billingModes is the set a configured expectation is validated against, so a
// typo in ~/.ticksrc cannot disable the assertion by naming a mode that can
// never match.
var billingModes = []string{BillingModePostpaid, BillingModeUnified}

// BillingOptions describes one Workers AI billing-mode assertion.
type BillingOptions struct {
	// HTTPClient makes the read. Nil means a client with a short timeout.
	HTTPClient *http.Client

	// CloudflareAPIBase overrides https://api.cloudflare.com/client/v4
	// (tests).
	CloudflareAPIBase string

	// GatewayURL is the operator's AI Gateway base URL — the account and
	// gateway to read are taken from it, so one configured value names the
	// gateway everywhere.
	GatewayURL string

	// CloudflareAPIToken is the token with AI Gateway read access. It is the
	// same credential the cost telemetry rung installs; without it the mode
	// cannot be read at all.
	CloudflareAPIToken string

	// Expected is the mode the operator settled on. Empty means
	// DefaultWorkersAIBillingMode.
	Expected string
}

// CheckWorkersAIBilling reads the gateway's Workers AI billing mode and asserts
// it is the one the operator configured. It returns the mode the gateway
// reported — including alongside a mismatch, so a caller can report what it
// found rather than only that it was wrong.
//
// Every way this fails is its own message. "The gateway moved to unified",
// "the token cannot read this gateway" and "the gateway named no mode at all"
// send an operator to three different places, and collapsing them into one
// refusal has already cost this project a misdiagnosis.
func CheckWorkersAIBilling(ctx context.Context, opts BillingOptions) (string, error) {
	expected, err := ExpectedBillingMode(opts.Expected)
	if err != nil {
		return "", err
	}
	account, gateway, ok := gatewayIDs(opts.GatewayURL)
	if !ok {
		return "", fmt.Errorf("gateway: %s names no Cloudflare account and gateway, so its Workers AI billing mode cannot be read — point the gateway at https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway>", opts.GatewayURL)
	}
	token := strings.TrimSpace(opts.CloudflareAPIToken)
	if token == "" {
		return "", errors.New("no Cloudflare API token is configured, so the gateway's Workers AI billing mode cannot be read — add one with 'tk factory setup --cloudflare-api-token <token>'")
	}
	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}

	observed, err := probeGatewayBillingMode(ctx, client, opts.CloudflareAPIBase, account, gateway, token)
	if err != nil {
		return "", err
	}
	if observed != expected {
		return observed, billingModeMismatch(gateway, expected, observed)
	}
	return observed, nil
}

// ExpectedBillingMode normalises a configured expectation, defaulting an empty
// one. An unrecognised value is an error rather than a mode that never
// matches: a mis-typed expectation must be loud, not permanently red for a
// reason nobody can act on.
func ExpectedBillingMode(configured string) (string, error) {
	mode := strings.ToLower(strings.TrimSpace(configured))
	if mode == "" {
		return DefaultWorkersAIBillingMode, nil
	}
	for _, known := range billingModes {
		if mode == known {
			return mode, nil
		}
	}
	return "", fmt.Errorf("%q is not a Workers AI billing mode — it is one of %s",
		configured, strings.Join(billingModes, " or "))
}

// DescribeBillingMode says which pot a mode spends from, in one clause.
func DescribeBillingMode(mode string) string {
	switch mode {
	case BillingModeUnified:
		return "Workers AI drains the prepaid AI Gateway wallet"
	case BillingModePostpaid:
		return "Workers AI lands on the Cloudflare invoice"
	default:
		return "unknown billing mode"
	}
}

// billingModeMismatch is the loud refusal. It names both modes, what the
// difference costs, and the two ways out — flip the gateway back, or record
// that the change was deliberate.
func billingModeMismatch(gateway, expected, observed string) error {
	return fmt.Errorf(
		"gateway %s is on %s Workers AI billing, but this factory is configured for %s: %s. "+
			"Check it in the dashboard under AI → AI Gateway → %s → Settings, "+
			"or record the change with 'tk factory setup --workers-ai-billing-mode %s'",
		gateway, observed, expected, billingModeConsequence(observed), gateway, observed)
}

// billingModeConsequence is the money sentence for the mode that was found.
func billingModeConsequence(observed string) string {
	switch observed {
	case BillingModeUnified:
		return "unified drains a separately purchased prepaid AI Gateway wallet, bought at a 5% premium, " +
			"instead of the Cloudflare invoice an account credit can absorb — and a run's telemetry reports " +
			"the identical cost either way, so nothing downstream would show the difference"
	case BillingModePostpaid:
		return "postpaid bills Workers AI to the Cloudflare invoice rather than to the prepaid AI Gateway " +
			"wallet this factory was told to spend from"
	default:
		return "the two modes spend from different pots"
	}
}

// probeGatewayBillingMode reads workers_ai_billing_mode off the gateway object.
// It is a different endpoint from the logs read the telemetry rung proves its
// token with — the logs say what was spent, this says which wallet it came out
// of — so the two are probed separately and fail separately.
func probeGatewayBillingMode(ctx context.Context, client *http.Client, apiBase, account, gateway, token string) (string, error) {
	if apiBase == "" {
		apiBase = defaultCloudflareAPIBase
	}
	endpoint := fmt.Sprintf("%s/accounts/%s/ai-gateway/gateways/%s",
		strings.TrimSuffix(apiBase, "/"), account, gateway)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<10))
	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		return "", fmt.Errorf("the token was rejected (%s) reading gateway %q — it needs AI Gateway read access on this account", resp.Status, gateway)
	case resp.StatusCode == http.StatusNotFound:
		return "", fmt.Errorf("no gateway %q in account %s", gateway, account)
	case resp.StatusCode >= 300:
		return "", fmt.Errorf("the AI Gateway API answered %s reading gateway %q: %s", resp.Status, gateway, strings.TrimSpace(string(body)))
	}

	var payload struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
		Result struct {
			BillingMode string `json:"workers_ai_billing_mode"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", fmt.Errorf("the AI Gateway API answered something that is not JSON reading gateway %q", gateway)
	}
	if !payload.Success {
		message := "the API reported failure"
		if len(payload.Errors) > 0 && payload.Errors[0].Message != "" {
			message = payload.Errors[0].Message
		}
		return "", fmt.Errorf("the AI Gateway API refused to describe gateway %q: %s", gateway, message)
	}
	mode := strings.ToLower(strings.TrimSpace(payload.Result.BillingMode))
	if mode == "" {
		// Fail closed. An absent field is not evidence of postpaid, and a
		// pre-flight that cannot read the mode has not asserted anything.
		return "", fmt.Errorf("gateway %q named no workers_ai_billing_mode, so which pot its Workers AI traffic bills to cannot be proven", gateway)
	}
	return mode, nil
}
