package factory

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/factory/credentials"
)

// ---------------------------------------------------------------------------
// The assertion itself
//
// A gateway's workers_ai_billing_mode decides which pot a run's Workers AI
// spend comes out of: `postpaid` reaches the Cloudflare invoice an account
// credit can absorb, `unified` drains a separately purchased prepaid wallet
// bought at a 5% premium. It is one dashboard toggle, it is not in
// wrangler.toml, and nothing in a run's telemetry records which one was in
// force — so the only place it can be caught is before a run starts.
// ---------------------------------------------------------------------------

func (h *setupHarness) billingOptions() BillingOptions {
	return BillingOptions{
		CloudflareAPIBase:  h.cloudflare.base(),
		GatewayURL:         h.gateway.base(),
		CloudflareAPIToken: testCloudflareToken,
	}
}

func TestBillingCheckAcceptsThePostpaidDefault(t *testing.T) {
	h := newSetupHarness(t, "")

	mode, err := CheckWorkersAIBilling(context.Background(), h.billingOptions())
	if err != nil {
		t.Fatalf("CheckWorkersAIBilling: %v", err)
	}
	if mode != BillingModePostpaid {
		t.Errorf("mode = %q, want %q", mode, BillingModePostpaid)
	}
	if h.cloudflare.gatewayCalls.Load() == 0 {
		t.Error("the mode was reported without reading the gateway object")
	}
}

// The headline failure: the dashboard was flipped and every run since has been
// spending cash instead of credit.
func TestBillingCheckRefusesUnifiedAndSaysWhatItCosts(t *testing.T) {
	h := newSetupHarness(t, "")
	h.cloudflare.setMode(BillingModeUnified)

	mode, err := CheckWorkersAIBilling(context.Background(), h.billingOptions())
	if err == nil {
		t.Fatal("a gateway on unified billing passed pre-flight")
	}
	if mode != BillingModeUnified {
		t.Errorf("mode = %q, want the observed mode reported alongside the refusal", mode)
	}
	// Loud means it names both modes, the money, and the two ways out.
	for _, want := range []string{
		BillingModeUnified,
		BillingModePostpaid,
		"prepaid",
		"5%",
		"--workers-ai-billing-mode",
	} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("refusal never mentions %q: %v", want, err)
		}
	}
}

// An operator who deliberately bought a prepaid wallet is not misconfigured —
// the assertion is against what they configured, not against a constant.
func TestBillingCheckHonoursAnOperatorWhoChoseUnified(t *testing.T) {
	h := newSetupHarness(t, "")
	h.cloudflare.setMode(BillingModeUnified)

	opts := h.billingOptions()
	opts.Expected = BillingModeUnified
	mode, err := CheckWorkersAIBilling(context.Background(), opts)
	if err != nil {
		t.Fatalf("CheckWorkersAIBilling: %v", err)
	}
	if mode != BillingModeUnified {
		t.Errorf("mode = %q, want %q", mode, BillingModeUnified)
	}

	// And the mirror: postpaid is a mismatch when unified is what was chosen.
	h.cloudflare.setMode(BillingModePostpaid)
	if _, err := CheckWorkersAIBilling(context.Background(), opts); err == nil {
		t.Fatal("drift away from the configured mode passed pre-flight")
	}
}

// A gateway object that names no mode is not a gateway that is on postpaid: an
// assertion that cannot read the mode has not passed, and says so in its own
// words rather than borrowing the drift message.
func TestBillingCheckRefusesAGatewayThatNamesNoMode(t *testing.T) {
	h := newSetupHarness(t, "")
	h.cloudflare.setMode("")

	_, err := CheckWorkersAIBilling(context.Background(), h.billingOptions())
	if err == nil {
		t.Fatal("a gateway object with no workers_ai_billing_mode passed pre-flight")
	}
	if !strings.Contains(err.Error(), "workers_ai_billing_mode") {
		t.Errorf("error does not name the field it could not read: %v", err)
	}
	if strings.Contains(err.Error(), "5%") {
		t.Errorf("an unreadable mode was reported as a billing-mode drift: %v", err)
	}
}

// A typo in ~/.ticfacrc must not silently disable the assertion.
func TestBillingCheckRefusesAnUnknownConfiguredMode(t *testing.T) {
	h := newSetupHarness(t, "")
	opts := h.billingOptions()
	opts.Expected = "prepaid"

	if _, err := CheckWorkersAIBilling(context.Background(), opts); err == nil {
		t.Fatal("an unknown configured mode was accepted")
	} else if !strings.Contains(err.Error(), "prepaid") ||
		!strings.Contains(err.Error(), BillingModePostpaid) {
		t.Errorf("error does not name the bad value and the valid ones: %v", err)
	}
	if h.cloudflare.gatewayCalls.Load() != 0 {
		t.Error("an unreadable expectation still cost a live API call")
	}
}

// Four things can go wrong here and they need four answers, not one: the
// gateway is not a Cloudflare gateway, there is no token, the token is
// rejected, the gateway does not exist.
func TestBillingCheckKeepsItsFailureClassesApart(t *testing.T) {
	h := newSetupHarness(t, "")

	notAGateway := h.billingOptions()
	notAGateway.GatewayURL = "https://api.anthropic.com"
	_, err := CheckWorkersAIBilling(context.Background(), notAGateway)
	if err == nil || !strings.Contains(err.Error(), "no Cloudflare account") {
		t.Errorf("a non-Cloudflare gateway URL: %v", err)
	}

	noToken := h.billingOptions()
	noToken.CloudflareAPIToken = ""
	_, err = CheckWorkersAIBilling(context.Background(), noToken)
	if err == nil || !strings.Contains(err.Error(), "--cloudflare-api-token") {
		t.Errorf("a missing token does not point at the flag that supplies one: %v", err)
	}

	badToken := h.billingOptions()
	badToken.CloudflareAPIToken = "cf_wrong_token"
	_, err = CheckWorkersAIBilling(context.Background(), badToken)
	if err == nil || !strings.Contains(err.Error(), "AI Gateway read") {
		t.Errorf("a rejected token does not name the access it needs: %v", err)
	}

	missing := h.billingOptions()
	missing.GatewayURL = strings.TrimSuffix(h.gateway.base(), testGatewayID) + "no-such-gateway"
	_, err = CheckWorkersAIBilling(context.Background(), missing)
	if err == nil || !strings.Contains(err.Error(), "no-such-gateway") {
		t.Errorf("a gateway that does not exist: %v", err)
	}
}

// ---------------------------------------------------------------------------
// The walk records the mode, and refuses to configure a factory that drifted
// ---------------------------------------------------------------------------

func TestSetupRecordsTheWorkersAIBillingMode(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	opts := h.options(strings.Join([]string{"y", testPAT, h.gateway.base(), "anthropic", "sk-provider-key", ""}, "\n"))
	opts.CloudflareAPIToken = testCloudflareToken

	result, err := Setup(context.Background(), opts)
	if err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}
	if result.WorkersAIBillingMode != BillingModePostpaid {
		t.Errorf("WorkersAIBillingMode = %q, want %q", result.WorkersAIBillingMode, BillingModePostpaid)
	}
	if got := h.rc(t).Get(credentials.KeyWorkersAIBillingMode); got != BillingModePostpaid {
		t.Errorf("%s = %q, want %q", credentials.KeyWorkersAIBillingMode, got, BillingModePostpaid)
	}
	if h.cloudflare.gatewayCalls.Load() == 0 {
		t.Error("the walk recorded a billing mode it never read")
	}
}

func TestSetupRefusesAGatewayThatDriftedToUnifiedBilling(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.cloudflare.setMode(BillingModeUnified)
	opts := h.options(strings.Join([]string{"y", testPAT, h.gateway.base(), "anthropic", "sk-provider-key", ""}, "\n"))
	opts.CloudflareAPIToken = testCloudflareToken

	_, err := Setup(context.Background(), opts)
	if err == nil {
		t.Fatal("Setup configured a factory whose gateway had moved off the invoice")
	}
	if !strings.Contains(err.Error(), BillingModeUnified) {
		t.Errorf("error does not name the mode it found: %v", err)
	}
	if got := h.rc(t).Get(credentials.KeyWorkersAIBillingMode); got != "" {
		t.Errorf("a refused mode was recorded anyway: %q", got)
	}
	if got := h.secret(SecretCloudflareAPIToken); got != "" {
		t.Errorf("the walk stored secrets past a failed assertion: %q", got)
	}
}

// The opt-in: an operator who bought a prepaid wallet says so once, and the
// walk records it as the mode every later check asserts against.
func TestSetupAcceptsAnExplicitUnifiedBillingMode(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.cloudflare.setMode(BillingModeUnified)
	opts := h.options(strings.Join([]string{"y", testPAT, h.gateway.base(), "anthropic", "sk-provider-key", ""}, "\n"))
	opts.CloudflareAPIToken = testCloudflareToken
	opts.WorkersAIBillingMode = BillingModeUnified

	result, err := Setup(context.Background(), opts)
	if err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}
	if result.WorkersAIBillingMode != BillingModeUnified {
		t.Errorf("WorkersAIBillingMode = %q, want %q", result.WorkersAIBillingMode, BillingModeUnified)
	}
	if got := h.rc(t).Get(credentials.KeyWorkersAIBillingMode); got != BillingModeUnified {
		t.Errorf("%s = %q, want %q", credentials.KeyWorkersAIBillingMode, got, BillingModeUnified)
	}
}

// Without a telemetry token nothing can read the mode. That is a gap the walk
// names, exactly like the cost budget it already names — not a silent pass.
func TestSetupWithoutTelemetrySaysTheBillingModeIsUnverified(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	stdin := strings.Join([]string{"y", testPAT, h.gateway.base(), "anthropic", "sk-provider-key", ""}, "\n")

	if _, err := Setup(context.Background(), h.options(stdin)); err != nil {
		t.Fatalf("Setup: %v\n%s", err, h.out.String())
	}
	if out := h.out.String(); !strings.Contains(out, "billing mode") {
		t.Errorf("the walk never says the billing mode goes unchecked:\n%s", out)
	}
	if h.cloudflare.gatewayCalls.Load() != 0 {
		t.Error("the walk read the gateway object with no token to read it with")
	}
}

// ---------------------------------------------------------------------------
// Status: the pre-flight an operator can run before submitting a run
// ---------------------------------------------------------------------------

func (h *setupHarness) storeTelemetryToken(t *testing.T, token string) {
	t.Helper()
	rc, err := credentials.LoadFrom(h.ticfacrc)
	if err != nil {
		t.Fatal(err)
	}
	rc.Set(credentials.KeyCloudflareAPIToken, token)
	if err := rc.Save(); err != nil {
		t.Fatal(err)
	}
}

func TestStatusReportsTheWorkersAIBillingMode(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.configure(t, "sk-provider-key")
	h.storeTelemetryToken(t, testCloudflareToken)

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if !report.Billing.Configured || !report.Billing.Checked || !report.Billing.OK {
		t.Errorf("billing rung = %+v, want configured, checked and live", report.Billing)
	}
	var buf bytes.Buffer
	report.Write(&buf)
	if out := buf.String(); !strings.Contains(out, BillingModePostpaid) {
		t.Errorf("status never reports the mode it read:\n%s", out)
	}
}

// The whole point: a dashboard toggle nobody announced shows up as a failed
// rung, and --check turns it into a nonzero exit.
func TestStatusFailsWhenTheGatewayDriftedToUnifiedBilling(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.configure(t, "sk-provider-key")
	h.storeTelemetryToken(t, testCloudflareToken)
	h.cloudflare.setMode(BillingModeUnified)

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if report.Billing.OK {
		t.Error("a gateway on unified billing reads as healthy")
	}
	if !strings.Contains(strings.Join(report.Failures(), ","), "workers ai billing") {
		t.Errorf("Failures() = %v, want the billing rung named", report.Failures())
	}
	var buf bytes.Buffer
	report.Write(&buf)
	if out := buf.String(); !strings.Contains(out, "prepaid") {
		t.Errorf("status does not say what unified billing costs:\n%s", out)
	}
}

// No token to read the gateway's configuration with is a gap, not a rejection:
// it must not fail --check, and it must say why it could not look.
func TestStatusWithoutTelemetryCannotCheckTheBillingMode(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.configure(t, "sk-provider-key")

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if !report.Billing.Configured {
		t.Error("a configured gateway has a billing mode to assert")
	}
	if report.Billing.Checked {
		t.Error("the billing rung reported a check it could not make")
	}
	if strings.Contains(strings.Join(report.Failures(), ","), "workers ai billing") {
		t.Errorf("an unchecked rung counted as a failure: %v", report.Failures())
	}
	if h.cloudflare.gatewayCalls.Load() != 0 {
		t.Error("status read the gateway object with no token")
	}
}

// --offline stays offline.
func TestStatusOfflineSkipsTheBillingCheck(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.configure(t, "sk-provider-key")
	h.storeTelemetryToken(t, testCloudflareToken)

	opts := h.statusOptions()
	opts.Offline = true
	report, err := Status(context.Background(), opts)
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if report.Billing.Checked {
		t.Error("--offline reported a billing check it did not make")
	}
	if h.cloudflare.gatewayCalls.Load() != 0 {
		t.Error("--offline read the gateway object")
	}
}

// A mode nobody can parse is reported as a rejected rung rather than skipped,
// because a mis-typed expectation silently disables the assertion.
func TestStatusRejectsAnUnreadableConfiguredMode(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.configure(t, "sk-provider-key")
	h.storeTelemetryToken(t, testCloudflareToken)
	rc, err := credentials.LoadFrom(h.ticfacrc)
	if err != nil {
		t.Fatal(err)
	}
	rc.Set(credentials.KeyWorkersAIBillingMode, "invoice")
	if err := rc.Save(); err != nil {
		t.Fatal(err)
	}

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if report.Billing.OK {
		t.Error("an unreadable configured mode reads as healthy")
	}
	if !strings.Contains(strings.Join(report.Failures(), ","), "workers ai billing") {
		t.Errorf("Failures() = %v, want the billing rung named", report.Failures())
	}
}
