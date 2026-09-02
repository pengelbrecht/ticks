package lifecycle

import (
	"encoding/json"
	"sort"
	"strings"
	"testing"
)

// The fake harness: a model of exactly the behaviour SPEC Appendix A's thirteen
// invariants depend on, and nothing else.
//
// It is not an executor and it is not a reconciler. It is the smallest state
// machine in which the difference between obeying an invariant and violating
// one is OBSERVABLE — which is what lets the suite exist in Phase 0, before any
// reconciler code does, and lets ticfac inherit it unchanged in Phase 1.
//
// The TypeScript half (cloud/factory/test/lifecycle-harness.ts) implements this
// independently against the same fixture. That duplication is the deliverable:
// contracts/README.md's rule is that a fixture with one reader detects nothing,
// and the failure this suite guards is the quiet kind — a guard that has
// stopped guarding does not raise, it just lets the wrong thing happen.
type harness struct {
	thresholds thresholds

	// protectedPrefixes is A10's boundary, read from the fixture rather than
	// hard-coded here. Two hard-coded copies of one boundary is two copies
	// that can drift apart with both suites green.
	protectedPrefixes []string

	now int64

	stopped bool

	credentials map[string]*credential
	jobs        map[string]*fakeJob
	liveness    map[string]string

	origin    map[string]map[string]any
	confirmed map[string]bool

	// lastPolled is when the reconciler last ADDRESSED each job. A4's whole
	// claim is that this, and not a separate heartbeat, is what keeps a job
	// alive on the substrate.
	lastPolled map[string]int64

	step *fakeStep

	reports []failureReport
	holds   map[string]*hold
	claims  map[string]*claimRecord

	dispatches      map[string]int
	boundaryReports []string

	budget budgetState

	evidence  map[string]map[string]string
	published []string

	fingerprintFields []string

	// off turns a named guard off. It exists for the negative control: a guard
	// nothing has ever seen refuse is not known to be a guard.
	off map[string]bool
}

type credential struct{ revoked bool }

type fakeJob struct {
	booted     bool
	tornDown   bool
	lastPushMs int64
	pushed     bool
}

type fakeStep struct {
	capMs   int64
	spentMs int64
}

type failureReport struct{ class, message string }

type hold struct {
	struck     bool
	releasedBy string
}

type claimRecord struct {
	actor    string
	settled  bool
	settleAs string
}

type budgetState struct {
	requested float64
	ceiling   float64
	effective float64
	reported  float64
	clamped   bool
	set       bool
}

func newHarness(c contract) *harness {
	h := &harness{
		thresholds:  c.Harness.Thresholds,
		credentials: map[string]*credential{},
		jobs:        map[string]*fakeJob{},
		liveness:    map[string]string{},
		origin:      map[string]map[string]any{},
		confirmed:   map[string]bool{},
		lastPolled:  map[string]int64{},
		holds:       map[string]*hold{},
		claims:      map[string]*claimRecord{},
		dispatches:  map[string]int{},
		evidence:    map[string]map[string]string{},
		off:         map[string]bool{},
	}
	h.protectedPrefixes = append(h.protectedPrefixes, c.Harness.ProtectedPrefixes.Prefixes...)
	for _, f := range c.Harness.FingerprintFields.Fields {
		h.fingerprintFields = append(h.fingerprintFields, f.ProvenanceField)
	}
	return h
}

// guarded reports whether a named guard is in force.
func (h *harness) guarded(name string) bool { return !h.off[name] }

func (h *harness) job(name string) *fakeJob {
	j, ok := h.jobs[name]
	if !ok {
		j = &fakeJob{}
		h.jobs[name] = j
	}
	return j
}

func (h *harness) run(t *testing.T, s step) string {
	t.Helper()
	switch s.Op {

	// ---- A1: the stop, and the ordering that keeps money from outliving work.

	case "advance_clock":
		h.now += s.Ms
		return "advanced"

	case "request_stop":
		// Durable, and written once. Nothing in this model unwrites it, which
		// is the whole of "not a revocation a restart can undo".
		h.stopped = true
		return "stop_recorded"

	case "issue_credential":
		if h.guarded("stop_refuses_issue") && h.stopped {
			return "refused_stopped"
		}
		h.credentials[s.Job] = &credential{}
		return "issued"

	case "boot":
		cred, ok := h.credentials[s.Job]
		if !ok || cred.revoked {
			return "refused_no_credential"
		}
		j := h.job(s.Job)
		j.booted = true
		j.lastPushMs = h.now
		h.lastPolled[s.Job] = h.now
		h.liveness[s.Job] = "live"
		return "booted"

	case "revoke_credential":
		if cred, ok := h.credentials[s.Job]; ok {
			cred.revoked = true
		}
		return "revoked"

	case "teardown":
		cred, ok := h.credentials[s.Job]
		if h.guarded("revoke_before_teardown") && ok && !cred.revoked {
			return "refused_credential_live"
		}
		h.job(s.Job).tornDown = true
		return "torn_down"

	// ---- A2: liveness comes from outside, never from the thing that may be gone.

	case "supervisor_reports_liveness":
		if h.guarded("liveness_from_outside") {
			return "refused_self_report"
		}
		h.liveness[s.Job] = "live"
		return "recorded"

	case "observe_liveness":
		h.liveness[s.Job] = s.As
		return s.As

	// ---- A3: the host's step cap.

	case "open_step":
		h.step = &fakeStep{capMs: s.CapMs}
		return "opened"

	case "spend_in_step":
		if h.step == nil {
			t.Fatalf("spend_in_step with no open step")
		}
		if h.guarded("step_cap") && h.step.spentMs+s.Ms > h.step.capMs {
			// A refused spend changes nothing: the step does not grow past the
			// cap, because on the real host it would not have been allowed to.
			return "exceeded_cap"
		}
		h.step.spentMs += s.Ms
		return "within_cap"

	// ---- A4: polling IS the keepalive.

	case "poll":
		if h.guarded("poll_under_wipe") && h.now-h.lastPolled[s.Job] > h.thresholds.WipeThresholdMs {
			h.liveness[s.Job] = "dead"
			h.lastPolled[s.Job] = h.now
			return "wiped"
		}
		h.lastPolled[s.Job] = h.now
		return "polled"

	// ---- A5: durability is a timer, not a job's good intentions.

	case "push_partial":
		j := h.job(s.Job)
		if !h.guarded("push_on_timer") {
			// With the timer off, durability depends on the job remembering to
			// push at exit — which is exactly what a killed job never does.
			return "pushed"
		}
		if h.now-j.lastPushMs < h.thresholds.PushIntervalMs {
			return "not_due"
		}
		h.origin[s.Path] = s.Content
		j.lastPushMs = h.now
		j.pushed = true
		return "pushed"

	case "kill_job":
		h.liveness[s.Job] = "dead"
		return "killed"

	case "collect":
		// Only the durable layer is consulted. A container's terminal output is
		// never evidence (src/reconcile.ts's evidence order).
		if _, ok := h.origin[s.Path]; ok {
			return "partial_on_origin"
		}
		return "work_lost"

	// ---- A6: adopt by identity; a fresh attempt needs a proven death.

	case "dispatch":
		if h.guarded("never_redispatch_live") {
			switch h.liveness[s.Job] {
			case "live":
				return "adopted"
			case "unknown":
				// "Nobody can say" is not "nothing is running", and it is
				// never a redispatch.
				return "refused_live"
			}
		}
		h.dispatches[s.Tick]++
		return "dispatched"

	// ---- A7: read back after write.

	case "write_record":
		if !s.SilentlyDrop {
			h.origin[s.Path] = s.Content
		}
		// The writer believes it landed either way. Only the read-back knows.
		return "written"

	case "read_back":
		if _, ok := h.origin[s.Path]; ok {
			h.confirmed[s.Path] = true
			return "confirmed"
		}
		h.confirmed[s.Path] = false
		return "write_did_not_land"

	case "act_on":
		if h.guarded("read_back_after_write") && !h.confirmed[s.Path] {
			return "refused_unconfirmed"
		}
		return "acted"

	// ---- A8: whoever finds an in-flight state settles it.

	case "claim":
		h.claims[s.Path] = &claimRecord{actor: s.Actor}
		return "claimed"

	case "find_in_flight":
		claim, ok := h.claims[s.Path]
		if !ok {
			t.Fatalf("find_in_flight on %s, which nobody claimed", s.Path)
		}
		if !h.guarded("settle_from_evidence") {
			return "stuck_awaiting_claimer"
		}
		claim.settled = true
		// The question is always "does the thing exist?", never "did the
		// claimer come back?" — and both answers settle it.
		if _, exists := h.origin[s.EvidencePath]; exists {
			claim.settleAs = "done"
		} else {
			claim.settleAs = "not_done"
		}
		return "settled_from_evidence"

	// ---- A9: distinct failure classes, distinct messages.

	case "report_failure":
		if h.guarded("distinct_failure_classes") {
			for _, r := range h.reports {
				if r.message == s.Message && r.class != s.Class {
					return "collapsed"
				}
			}
		}
		h.reports = append(h.reports, failureReport{class: s.Class, message: s.Message})
		return "reported"

	// ---- A10: the substrate enforces, and reports every attempt.

	case "attempt_boundary_write":
		protected := false
		for _, prefix := range h.protectedPrefixes {
			if strings.HasPrefix(s.Path, prefix) {
				protected = true
				break
			}
		}
		if h.guarded("substrate_enforces_boundary") && protected {
			h.boundaryReports = append(h.boundaryReports, s.Path)
			return "refused_and_reported"
		}
		return "permitted"

	// ---- A11: a person releases a struck-out unit; the clock never does.

	case "strike_out":
		h.holds[s.Unit] = &hold{struck: true}
		return "struck"

	case "clock_release":
		if h.guarded("release_by_person") {
			return "refused_clock_release"
		}
		if hd, ok := h.holds[s.Unit]; ok {
			hd.struck = false
			hd.releasedBy = "clock"
		}
		return "released"

	case "person_release":
		if hd, ok := h.holds[s.Unit]; ok {
			hd.struck = false
			hd.releasedBy = s.By
		}
		return "released"

	case "may_dispatch":
		// The READ site. The live bug was a table with two writes and zero
		// reads, so the model has to have somewhere the answer is asked.
		if hd, ok := h.holds[s.Unit]; ok && hd.struck {
			return "held"
		}
		return "permitted"

	// ---- A12: report the number that will govern.

	case "set_budget":
		h.budget = budgetState{requested: s.Requested, ceiling: s.Ceiling, set: true}
		if s.Requested > s.Ceiling {
			h.budget.effective = s.Ceiling
			h.budget.clamped = true
			return "clamped"
		}
		h.budget.effective = s.Requested
		return "as_requested"

	case "report_budget":
		if !h.budget.set {
			t.Fatal("report_budget with no budget set")
		}
		if h.guarded("report_after_clamping") {
			h.budget.reported = h.budget.effective
			return "reported_effective"
		}
		h.budget.reported = h.budget.requested
		return "reported_requested"

	// ---- A13: evidence is fingerprinted, and publication checks freshness.

	case "record_evidence":
		if h.guarded("evidence_fingerprinted") {
			for _, field := range h.fingerprintFields {
				if s.Fingerprint[field] == "" {
					return "refused_unfingerprinted"
				}
			}
		}
		h.evidence[s.Key] = s.Fingerprint
		return "recorded"

	case "publish_evidence":
		record, ok := h.evidence[s.Key]
		if !ok {
			t.Fatalf("publish_evidence for %s, which was never recorded", s.Key)
		}
		if h.guarded("publication_checks_freshness") {
			for _, field := range h.fingerprintFields {
				if record[field] != s.Target[field] {
					return "refused_stale"
				}
			}
		}
		h.published = append(h.published, s.Key)
		return "published"

	default:
		t.Fatalf("the fixture uses op %q, which this fake does not implement", s.Op)
		return ""
	}
}

// ------------------------------------------------------- the final state ---

func (h *harness) bootedJobs() []string {
	out := []string{}
	for name, j := range h.jobs {
		if j.booted {
			out = append(out, name)
		}
	}
	sort.Strings(out)
	return out
}

func (h *harness) issuedCredentials() []string {
	out := []string{}
	for name := range h.credentials {
		out = append(out, name)
	}
	sort.Strings(out)
	return out
}

func (h *harness) tornDownJobs() []string {
	out := []string{}
	for name, j := range h.jobs {
		if j.tornDown {
			out = append(out, name)
		}
	}
	sort.Strings(out)
	return out
}

func (h *harness) settledClaims() []string {
	out := []string{}
	for path, c := range h.claims {
		if c.settled {
			out = append(out, path)
		}
	}
	sort.Strings(out)
	return out
}

func (h *harness) reportedClasses() []string {
	out := []string{}
	for _, r := range h.reports {
		out = append(out, r.class)
	}
	return out
}

func (h *harness) evidenceKeys() []string {
	out := []string{}
	for key := range h.evidence {
		out = append(out, key)
	}
	sort.Strings(out)
	return out
}

func (h *harness) releasedBy() map[string]string {
	out := map[string]string{}
	for unit, hd := range h.holds {
		if hd.releasedBy != "" {
			out[unit] = hd.releasedBy
		}
	}
	return out
}

func canonical(v any) string {
	data, err := json.Marshal(v)
	if err != nil {
		return "<unmarshalable>"
	}
	return string(data)
}

// checkFinal asserts every field the sequence declared, and only those. A field
// a sequence does not mention is not part of what its invariant is about.
func checkFinal(t *testing.T, h *harness, want finalState) {
	t.Helper()
	for _, m := range finalMismatches(h, want) {
		t.Error(m)
	}
}

func finalMatches(h *harness, want finalState) bool {
	return len(finalMismatches(h, want)) == 0
}

func finalMismatches(h *harness, want finalState) []string {
	var bad []string
	cmp := func(label string, got, expect any) {
		if canonical(got) != canonical(expect) {
			bad = append(bad, label+":\n  harness holds  "+canonical(got)+"\n  contract says  "+canonical(expect))
		}
	}

	if want.BootedJobs != nil {
		cmp("booted_jobs", h.bootedJobs(), want.BootedJobs)
	}
	if want.IssuedCredentials != nil {
		cmp("issued_credentials", h.issuedCredentials(), want.IssuedCredentials)
	}
	if want.TornDown != nil {
		cmp("torn_down", h.tornDownJobs(), want.TornDown)
	}
	if want.Liveness != nil {
		got := map[string]string{}
		for job := range want.Liveness {
			got[job] = h.liveness[job]
		}
		cmp("liveness", got, want.Liveness)
	}
	if want.StepSpentMs != nil {
		var spent int64
		if h.step != nil {
			spent = h.step.spentMs
		}
		cmp("step_spent_ms", spent, *want.StepSpentMs)
	}
	if want.Origin != nil {
		cmp("origin", h.origin, want.Origin)
	}
	if want.Dispatches != nil {
		cmp("dispatches", h.dispatches, want.Dispatches)
	}
	if want.Settled != nil {
		cmp("settled", h.settledClaims(), want.Settled)
	}
	if want.ReportedClasses != nil {
		cmp("reported_classes", h.reportedClasses(), want.ReportedClasses)
	}
	if want.BoundaryReports != nil {
		got := h.boundaryReports
		if got == nil {
			got = []string{}
		}
		cmp("boundary_reports", got, want.BoundaryReports)
	}
	if want.ReleasedBy != nil {
		cmp("released_by", h.releasedBy(), want.ReleasedBy)
	}
	if want.Budget != nil {
		cmp("budget", budgetFinal{
			Requested: h.budget.requested,
			Ceiling:   h.budget.ceiling,
			Effective: h.budget.effective,
			Reported:  h.budget.reported,
			Clamped:   h.budget.clamped,
		}, *want.Budget)
	}
	if want.EvidenceKeys != nil {
		cmp("evidence_keys", h.evidenceKeys(), want.EvidenceKeys)
	}
	if want.PublishedKeys != nil {
		got := h.published
		if got == nil {
			got = []string{}
		}
		cmp("published_keys", got, want.PublishedKeys)
	}
	return bad
}
