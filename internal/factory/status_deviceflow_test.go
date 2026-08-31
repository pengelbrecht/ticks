package factory

import (
	"bytes"
	"context"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/factory/credentials"
)

// storeGitHubRung writes the GitHub half of the mirror the way a device-flow
// setup leaves it.
func (h *setupHarness) storeGitHubRung(t *testing.T, token, auth string, expiresAt time.Time) {
	t.Helper()
	rc, err := credentials.LoadFrom(h.ticfacrc)
	if err != nil {
		t.Fatal(err)
	}
	rc.Set(credentials.KeyGitHubToken, token)
	rc.Set(credentials.KeyGitHubLogin, testLogin)
	rc.Set(credentials.KeyGitHubRepo, testRepo)
	rc.Set(credentials.KeyGitHubAuth, auth)
	rc.Set(credentials.KeyGitHubTokenExpires, formatDeadline(expiresAt))
	if err := rc.Save(); err != nil {
		t.Fatal(err)
	}
}

// A credential with a deadline is a credential a run can outlive, so status has
// to report the deadline — not just "live". Reading "live" an hour before a
// push fails is the whole problem.
func TestStatusReportsWhenTheGitHubCredentialExpires(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.configure(t, "sk-provider-key")
	h.storeGitHubRung(t, testPAT, AuthDeviceFlow, time.Now().Add(5*time.Hour))

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if !report.GitHub.OK {
		t.Fatalf("a live credential was reported rejected: %s", report.GitHub.Detail)
	}
	if !strings.Contains(report.GitHub.Detail, "expires in") {
		t.Errorf("status does not say when the credential expires:\n%s", report.GitHub.Detail)
	}
	if !strings.Contains(report.GitHub.Summary, "device flow") {
		t.Errorf("status does not say how the credential was obtained:\n%s", report.GitHub.Summary)
	}

	var buf bytes.Buffer
	report.Write(&buf)
	if strings.Contains(buf.String(), testPAT) {
		t.Errorf("status printed the credential:\n%s", buf.String())
	}
}

// A recorded deadline that has already passed is a LOCAL fact, and a rejection
// on its own: reporting "live" because a probe happened to pass would hide the
// state the operator has to act on.
func TestStatusRejectsAnExpiredGitHubCredential(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.configure(t, "sk-provider-key")
	h.storeGitHubRung(t, testPAT, AuthDeviceFlow, time.Now().Add(-1*time.Minute))

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if report.GitHub.OK {
		t.Error("an expired credential was reported as live")
	}
	if !strings.Contains(report.GitHub.Detail, "tk factory setup") {
		t.Errorf("status does not name the command that renews it:\n%s", report.GitHub.Detail)
	}
	if !slices.Contains(report.Failures(), "github") {
		t.Errorf("Failures() = %v, want it to name github so --check exits nonzero", report.Failures())
	}
}

// A credential with no deadline is the recommended registration for a shipped
// App, not a broken record: it must not read as "expired at the zero time".
func TestStatusTreatsAnAbsentDeadlineAsNonExpiring(t *testing.T) {
	h := newSetupHarness(t, "sk-provider-key")
	h.configure(t, "sk-provider-key")
	h.storeGitHubRung(t, testPAT, AuthDeviceFlow, time.Time{})

	report, err := Status(context.Background(), h.statusOptions())
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if !report.GitHub.OK {
		t.Fatalf("a non-expiring credential was reported rejected: %s", report.GitHub.Detail)
	}
	if !strings.Contains(report.GitHub.Detail, "does not expire") {
		t.Errorf("status does not say the credential has no deadline:\n%s", report.GitHub.Detail)
	}
}
