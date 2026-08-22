package lease

import (
	"strings"
	"testing"
)

// TestEnrolmentUpgradesTheArbiter is the D19 rule in one table: enrolment
// decides, the orchestrator's location never does.
func TestEnrolmentUpgradesTheArbiter(t *testing.T) {
	tests := []struct {
		name              string
		factory, enrolled bool
		want              Kind
	}{
		{"no factory at all", false, false, File},
		{"a factory that never heard of this project", true, false, File},
		{"enrolled", true, true, RunRoom},
		{"enrolment without a factory cannot happen and is not believed", false, true, File},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			a := Resolve("acme/project", tc.factory, tc.enrolled)
			if a.Kind != tc.want {
				t.Fatalf("arbiter = %q, want %q", a.Kind, tc.want)
			}
			if tc.want == RunRoom && !a.Upgraded() {
				t.Error("Upgraded() disagrees with Kind")
			}
		})
	}
}

// TestTheUpgradedArbiterIsNeverAccompaniedByALocalOne: there is no acquire
// path here at all. This test pins the design decision so a later change that
// adds a Go file lease has to argue with it first — a lease file taken
// alongside the RunRoom lease is D4's second enforcement point.
func TestTheUpgradedArbiterExplainsItselfAsTheOnlyOne(t *testing.T) {
	a := Resolve("acme/project", true, true)
	explain := a.Explain()
	if !strings.Contains(explain, "RunRoom") || !strings.Contains(explain, "acme/project") {
		t.Fatalf("explanation %q does not name the arbiter and the project", explain)
	}
	if !strings.Contains(explain, "local") || !strings.Contains(explain, "cloud") {
		t.Errorf("explanation %q does not say the lease is the same for both orchestrator locations", explain)
	}
}

// TestTheOfflineCheckoutSaysSoWithoutBlamingTheOperator: the degenerate case
// is supported, not degraded, and the message says which substrates still work.
func TestTheOfflineCheckoutExplainsItself(t *testing.T) {
	a := Resolve("acme/project", false, false)
	if !strings.Contains(a.Explain(), "offline") {
		t.Errorf("explanation %q does not say the checkout works offline", a.Explain())
	}
	refusal := a.DispatchRefusal()
	for _, want := range []string{"factory", "tk factory setup"} {
		if !strings.Contains(refusal, want) {
			t.Errorf("refusal %q does not contain %q", refusal, want)
		}
	}
	if strings.Contains(strings.ToLower(refusal), "falling back") {
		t.Error("a dispatch refusal must never propose falling back to another substrate")
	}
}

func TestAnUnenrolledProjectOnAConfiguredFactoryNamesEnrolment(t *testing.T) {
	refusal := Resolve("acme/project", true, false).DispatchRefusal()
	if !strings.Contains(refusal, "acme/project") || !strings.Contains(refusal, "not enrolled") {
		t.Fatalf("refusal %q does not say the project is not enrolled", refusal)
	}
}

// TestHeldErrorNamesTheHolder is acceptance criterion 2: a refusal that does
// not say who is in the way is not actionable.
func TestHeldErrorNamesTheHolder(t *testing.T) {
	err := HeldError{
		Project: "acme/project",
		Holder:  Holder{RunID: "run_holder", Epic: "gyz", Origin: OriginCloud, ExpiresAt: "2026-08-22T10:00:00Z"},
	}
	msg := err.Error()
	for _, want := range []string{"acme/project", "run_holder", "gyz", "cloud orchestrator", "tk cloud stop run_holder"} {
		if !strings.Contains(msg, want) {
			t.Errorf("refusal %q does not contain %q", msg, want)
		}
	}
}

func TestHeldErrorWithAThinHolderStillSaysSomethingUseful(t *testing.T) {
	msg := HeldError{Project: "acme/project", Holder: Holder{RunID: "run_x"}}.Error()
	if !strings.Contains(msg, "run_x") {
		t.Fatalf("refusal %q does not name the holder", msg)
	}
	if strings.Contains(msg, "(epic") {
		t.Errorf("refusal %q invents an epic it was not told", msg)
	}
}
