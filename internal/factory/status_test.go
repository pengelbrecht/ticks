package factory

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// configure writes the local mirror a completed `tk factory setup` leaves
// behind, which is what status reads.
func (h *setupHarness) configure(t *testing.T, gatewayKey string) {
	t.Helper()
	rc, err := ticksrc.LoadFrom(h.ticksrc)
	if err != nil {
		t.Fatal(err)
	}
	rc.Set(ticksrc.KeyFactoryURL, h.server.URL)
	rc.Set(ticksrc.KeyFactoryVersion, "1.2.3")
	rc.Set(ticksrc.KeyFactoryGitHubToken, testPAT)
	rc.Set(ticksrc.KeyFactoryGitHubLogin, testLogin)
	rc.Set(ticksrc.KeyFactoryGitHubRepo, testRepo)
	rc.Set(ticksrc.KeyFactoryGatewayURL, h.gateway.base())
	rc.Set(ticksrc.KeyFactoryGatewayProvider, "anthropic")
	rc.Set(ticksrc.KeyFactoryGatewayKey, gatewayKey)
	if err := rc.Save(); err != nil {
		t.Fatal(err)
	}
}

func (h *setupHarness) statusOptions() StatusOptions {
	return StatusOptions{
		ConfigPath:    h.ticksrc,
		GitHubAPIBase: h.github.base(),
	}
}

// Nothing configured is a normal state, not an error.
func TestStatusWithNothingConfigured(t *testing.T) {
	h := newSetupHarness(t, "")

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if report.Deployment.Configured || report.GitHub.Configured || report.Gateway.Configured {
		t.Errorf("status reports configuration that does not exist: %+v", report)
	}
	if len(report.Failures()) != 0 {
		t.Errorf("nothing configured must not count as a failure: %v", report.Failures())
	}

	var buf bytes.Buffer
	report.Write(&buf)
	out := buf.String()
	if !strings.Contains(out, "tk factory setup") {
		t.Errorf("status does not point at the command that configures it:\n%s", out)
	}
	if h.github.calls.Load() != 0 || h.gateway.calls.Load() != 0 {
		t.Error("status probed endpoints for credentials that do not exist")
	}
}

// Configured and healthy: each credential is checked live and reported working.
func TestStatusChecksEveryCredentialLive(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.configure(t, "sk-provider-key")
	// The deployment probe needs the worker to accept the stored token.
	seedDeployment(t, h)
	h.configure(t, "sk-provider-key")

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}

	for name, state := range map[string]CredentialState{
		"deployment": report.Deployment,
		"github":     report.GitHub,
		"gateway":    report.Gateway,
	} {
		if !state.Configured {
			t.Errorf("%s: Configured = false, want true", name)
		}
		if !state.Checked {
			t.Errorf("%s: Checked = false, want a live check", name)
		}
		if !state.OK {
			t.Errorf("%s: OK = false (%s)", name, state.Detail)
		}
	}
	if len(report.Failures()) != 0 {
		t.Errorf("Failures() = %v, want none", report.Failures())
	}

	var buf bytes.Buffer
	report.Write(&buf)
	out := buf.String()
	for _, want := range []string{testLogin, testRepo, "anthropic"} {
		if !strings.Contains(out, want) {
			t.Errorf("status output does not report %q:\n%s", want, out)
		}
	}
	if strings.Contains(out, testPAT) || strings.Contains(out, "sk-provider-key") {
		t.Errorf("status printed a secret:\n%s", out)
	}
}

// --offline is the flag that makes status safe to run with no network.
func TestStatusOfflineMakesNoProbes(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.configure(t, "sk-provider-key")

	opts := h.statusOptions()
	opts.Offline = true
	report, err := Status(context.Background(), opts)
	if err != nil {
		t.Fatalf("Status: %v", err)
	}

	if h.github.calls.Load() != 0 || h.gateway.calls.Load() != 0 {
		t.Errorf("--offline still probed: github=%d gateway=%d", h.github.calls.Load(), h.gateway.calls.Load())
	}
	if report.GitHub.Checked || report.Gateway.Checked || report.Deployment.Checked {
		t.Error("--offline reported live checks it did not make")
	}
	if !report.GitHub.Configured || !report.Gateway.Configured {
		t.Error("--offline lost track of what is configured")
	}
	if len(report.Failures()) != 0 {
		t.Errorf("an unchecked credential is not a failure: %v", report.Failures())
	}
}

// A credential that no longer works is reported as such, and named by
// Failures() so a caller can turn it into a nonzero exit.
func TestStatusReportsARejectedCredential(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	seedDeployment(t, h)
	h.configure(t, "sk-wrong-key")
	rc, err := ticksrc.LoadFrom(h.ticksrc)
	if err != nil {
		t.Fatal(err)
	}
	rc.Set(ticksrc.KeyFactoryGitHubToken, "github_pat_revoked")
	if err := rc.Save(); err != nil {
		t.Fatal(err)
	}

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}

	if report.GitHub.OK {
		t.Error("a revoked PAT was reported as working")
	}
	if report.Gateway.OK {
		t.Error("a rejected gateway key was reported as working")
	}
	failures := strings.Join(report.Failures(), " ")
	if !strings.Contains(failures, "github") || !strings.Contains(failures, "gateway") {
		t.Errorf("Failures() = %v, want both rungs named", report.Failures())
	}

	var buf bytes.Buffer
	report.Write(&buf)
	if out := buf.String(); !strings.Contains(strings.ToLower(out), "rejected") {
		t.Errorf("status does not say the credential was rejected:\n%s", out)
	}
}

// A partially walked ladder is the common real state: report what is there and
// what is missing without treating the gap as a failure.
func TestStatusReportsAPartialConfiguration(t *testing.T) {
	h := newSetupHarness(t, "")
	seedDeployment(t, h)
	rc, err := ticksrc.LoadFrom(h.ticksrc)
	if err != nil {
		t.Fatal(err)
	}
	rc.Set(ticksrc.KeyFactoryGitHubToken, testPAT)
	rc.Set(ticksrc.KeyFactoryGitHubRepo, testRepo)
	if err := rc.Save(); err != nil {
		t.Fatal(err)
	}

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if !report.GitHub.Configured || !report.GitHub.OK {
		t.Errorf("github rung: %+v", report.GitHub)
	}
	if report.Gateway.Configured {
		t.Error("an unconfigured gateway was reported as configured")
	}
	if len(report.Failures()) != 0 {
		t.Errorf("a missing rung is not a rejected credential: %v", report.Failures())
	}

	var buf bytes.Buffer
	report.Write(&buf)
	if out := buf.String(); !strings.Contains(out, "not configured") {
		t.Errorf("status does not name the missing rung:\n%s", out)
	}
}
