package lifecycle

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"testing"
)

const (
	contractFile    = "../../../contracts/lifecycle-invariants.json"
	jobProtocolFile = "../../../contracts/job-protocol.json"
)

// ------------------------------------------------------------ the fixture ---

type opDecl struct {
	Op       string   `json:"op"`
	Does     string   `json:"does"`
	Args     []string `json:"args"`
	Outcomes []string `json:"outcomes"`
}

type guardDecl struct {
	Guard    string `json:"guard"`
	Enforces string `json:"enforces"`
	Off      string `json:"off"`
}

// step is one operation in a sequence. Every op's arguments share this shape
// rather than getting a variant each: the fake dispatches on Op, and a field an
// op does not use is simply absent.
type step struct {
	Op     string `json:"op"`
	Expect string `json:"expect"`

	Job          string         `json:"job"`
	By           string         `json:"by"`
	As           string         `json:"as"`
	Tick         string         `json:"tick"`
	Path         string         `json:"path"`
	EvidencePath string         `json:"evidence_path"`
	Actor        string         `json:"actor"`
	Content      map[string]any `json:"content"`
	SilentlyDrop bool           `json:"silently_drops"`
	Ms           int64          `json:"ms"`
	CapMs        int64          `json:"cap_ms"`
	Class        string         `json:"class"`
	Message      string         `json:"message"`
	Unit         string         `json:"unit"`
	Requested    float64        `json:"requested"`
	Ceiling      float64        `json:"ceiling"`
	Key          string         `json:"key"`

	Fingerprint map[string]string `json:"fingerprint"`
	Target      map[string]string `json:"target"`
}

type budgetFinal struct {
	Requested float64 `json:"requested"`
	Ceiling   float64 `json:"ceiling"`
	Effective float64 `json:"effective"`
	Reported  float64 `json:"reported"`
	Clamped   bool    `json:"clamped"`
}

// finalState is the assertion after a sequence. Every field is optional: a
// sequence asserts the part of the model its invariant is about, and asserting
// the rest would make each sequence a test of the fake instead of a test of
// the rule.
type finalState struct {
	BootedJobs        []string                  `json:"booted_jobs"`
	IssuedCredentials []string                  `json:"issued_credentials"`
	TornDown          []string                  `json:"torn_down"`
	Liveness          map[string]string         `json:"liveness"`
	StepSpentMs       *int64                    `json:"step_spent_ms"`
	Origin            map[string]map[string]any `json:"origin"`
	Dispatches        map[string]int            `json:"dispatches"`
	Settled           []string                  `json:"settled"`
	ReportedClasses   []string                  `json:"reported_classes"`
	BoundaryReports   []string                  `json:"boundary_reports"`
	ReleasedBy        map[string]string         `json:"released_by"`
	Budget            *budgetFinal              `json:"budget"`
	EvidenceKeys      []string                  `json:"evidence_keys"`
	PublishedKeys     []string                  `json:"published_keys"`
}

type sequence struct {
	ID    string     `json:"id"`
	Why   string     `json:"why"`
	Steps []step     `json:"steps"`
	Final finalState `json:"final"`
}

type site struct {
	File    string   `json:"file"`
	Symbols []string `json:"symbols"`
	Note    string   `json:"note"`
}

type invariant struct {
	ID         string     `json:"id"`
	Number     int        `json:"number"`
	Name       string     `json:"name"`
	Title      string     `json:"title"`
	Statement  string     `json:"statement"`
	EarnedFrom string     `json:"earned_from"`
	Guards     []string   `json:"guards"`
	Today      []site     `json:"today"`
	Sequences  []sequence `json:"sequences"`
}

type thresholds struct {
	WipeThresholdMs int64 `json:"wipe_threshold_ms"`
	MaxPollMs       int64 `json:"max_poll_ms"`
	PushIntervalMs  int64 `json:"push_interval_ms"`
	StepCapMs       int64 `json:"step_cap_ms"`
}

type fingerprintFields struct {
	DefinedBy struct {
		Contract string `json:"contract"`
		File     string `json:"file"`
		Pointer  string `json:"pointer"`
		SchemaID string `json:"schema_id"`
	} `json:"defined_by"`
	Fields []struct {
		AppendixA       string `json:"appendix_a"`
		ProvenanceField string `json:"provenance_field"`
	} `json:"fields"`
}

type contract struct {
	SchemaVersion int      `json:"schema_version"`
	Contract      string   `json:"contract"`
	Spec          string   `json:"spec"`
	SpecSections  []string `json:"spec_sections"`
	Why           []string `json:"why"`

	Gate struct {
		Statement      string   `json:"statement"`
		AppliesTo      []string `json:"applies_to"`
		NotAStyleGuide string   `json:"not_a_style_guide"`
		WhyOneSuite    string   `json:"why_one_suite"`
	} `json:"gate"`

	Harness struct {
		Why               []string          `json:"why"`
		State             []string          `json:"state"`
		Thresholds        thresholds        `json:"thresholds"`
		Rules             []string          `json:"rules"`
		Ops               []opDecl          `json:"ops"`
		Guards            []guardDecl       `json:"guards"`
		FingerprintFields fingerprintFields `json:"fingerprint_fields"`
	} `json:"harness"`

	Invariants []invariant `json:"invariants"`
}

func load(t *testing.T) contract {
	t.Helper()
	data, err := os.ReadFile(contractFile)
	if err != nil {
		t.Fatalf("read %s: %v", contractFile, err)
	}
	var c contract
	if err := json.Unmarshal(data, &c); err != nil {
		t.Fatalf("parse %s: %v", contractFile, err)
	}
	return c
}

// byID finds one invariant. Each of the thirteen named tests below calls this,
// so a fixture that loses an invariant fails as thirteen missing tests rather
// than as a table that quietly got shorter.
func byID(t *testing.T, id string) (contract, invariant) {
	t.Helper()
	c := load(t)
	for _, inv := range c.Invariants {
		if inv.ID == id {
			return c, inv
		}
	}
	t.Fatalf("contracts/lifecycle-invariants.json declares no invariant %s", id)
	return c, invariant{}
}

// ------------------------------------------------------------- the shape ---

func TestContractIdentifiesItself(t *testing.T) {
	c := load(t)
	if c.SchemaVersion != 1 {
		t.Errorf("schema_version = %d, want 1", c.SchemaVersion)
	}
	if c.Contract != "ticfac.lifecycle_invariants" {
		t.Errorf("contract = %q, want ticfac.lifecycle_invariants", c.Contract)
	}
	if c.Spec == "" || len(c.SpecSections) == 0 {
		t.Error("the contract must name the spec and the sections it freezes")
	}
	if len(c.Why) == 0 || len(c.Harness.Why) == 0 {
		t.Error("both the contract and its harness must say why they exist")
	}
}

// The gate is the deliverable as much as the sequences are: SPEC §12 Phase 0
// step 7 asks for a conformance suite "the reconciler and every executor must
// pass", which is a claim about who has to run it, not only about what it
// asserts.
func TestGateNamesWhoMustPassIt(t *testing.T) {
	c := load(t)
	if c.Gate.Statement == "" || c.Gate.NotAStyleGuide == "" || c.Gate.WhyOneSuite == "" {
		t.Error("the gate must state itself, and say why it is not waivable and why it is one suite")
	}
	if len(c.Gate.AppliesTo) < 3 {
		t.Errorf("the gate names %d subjects; it must name the reconciler and each executor the SPEC plans",
			len(c.Gate.AppliesTo))
	}
	for _, who := range c.Gate.AppliesTo {
		if !strings.Contains(who, "Phase") {
			t.Errorf("gate subject %q does not say which SPEC phase brings it", who)
		}
	}
}

// Thirteen, numbered one to thirteen, each with the Appendix A statement it
// encodes and the live failure that earned it. An invariant with no
// `earned_from` is guidance wearing a conformance test's clothes, which is the
// one thing Appendix A's preamble says these are not.
func TestThirteenInvariantsOnePerAppendixAEntry(t *testing.T) {
	c := load(t)

	if len(c.Invariants) != 13 {
		t.Fatalf("the contract declares %d invariants; Appendix A has 13", len(c.Invariants))
	}

	seen := map[int]bool{}
	names := map[string]bool{}
	for i, inv := range c.Invariants {
		if inv.Number != i+1 {
			t.Errorf("invariant %d is numbered %d; the order must be Appendix A's", i+1, inv.Number)
		}
		if inv.ID != fmt.Sprintf("A%d", inv.Number) {
			t.Errorf("invariant %d has id %q, want A%d", inv.Number, inv.ID, inv.Number)
		}
		if seen[inv.Number] {
			t.Errorf("invariant number %d appears twice", inv.Number)
		}
		seen[inv.Number] = true
		if names[inv.Name] {
			t.Errorf("invariant name %q appears twice", inv.Name)
		}
		names[inv.Name] = true
		if inv.Name == "" || strings.ToLower(inv.Name) != inv.Name || strings.Contains(inv.Name, " ") {
			t.Errorf("%s: name %q must be a kebab-case test name", inv.ID, inv.Name)
		}
		if inv.Title == "" || inv.Statement == "" {
			t.Errorf("%s must carry Appendix A's title and statement", inv.ID)
		}
		if len(inv.EarnedFrom) < 60 {
			t.Errorf("%s: earned_from is %d characters; each invariant names the live failure that earned it",
				inv.ID, len(inv.EarnedFrom))
		}
		if len(inv.Guards) == 0 {
			t.Errorf("%s names no guard, so nothing can prove its sequences test anything", inv.ID)
		}
		if len(inv.Sequences) == 0 {
			t.Errorf("%s has no sequence, so it is not runnable", inv.ID)
		}
		for _, seq := range inv.Sequences {
			if seq.ID == "" || seq.Why == "" {
				t.Errorf("%s: every sequence must have an id and say what it proves", inv.ID)
			}
			if len(seq.Steps) == 0 {
				t.Errorf("%s/%s has no steps", inv.ID, seq.ID)
			}
		}
	}
}

// §12 Phase 0 step 7: "run-workflow.ts is 3,500 lines because of these
// orderings; §9.2 preserves the symbols, this preserves the reasons." So every
// invariant names where it lives TODAY, and the cross-reference is checked
// rather than trusted: a symbol list nobody verifies rots into a list of names
// that used to exist.
func TestEveryInvariantCrossReferencesWhereItLivesToday(t *testing.T) {
	c := load(t)

	runWorkflow := 0
	for _, inv := range c.Invariants {
		if len(inv.Today) == 0 {
			t.Errorf("%s names no implementation it was extracted from", inv.ID)
			continue
		}
		named := false
		for _, s := range inv.Today {
			if s.File == "" || len(s.Symbols) == 0 {
				t.Errorf("%s: a `today` site must name a file and at least one symbol", inv.ID)
			}
			if s.Note == "" {
				t.Errorf("%s: %s carries no note saying what the symbols do about this invariant", inv.ID, s.File)
			}
			if s.File == "cloud/factory/src/run-workflow.ts" {
				named = true
			}
		}
		if named {
			runWorkflow++
		}
	}

	// Not every invariant lives in run-workflow.ts — A5's timer is in the
	// sandbox entrypoint and A11's release is in ci-remediation.ts — but most
	// do, and an invariant that names no site in the file the SPEC says is
	// 3,500 lines BECAUSE of these orderings has almost certainly lost its
	// cross-reference rather than genuinely lacking one.
	if runWorkflow < 10 {
		t.Errorf("only %d of 13 invariants cross-reference cloud/factory/src/run-workflow.ts", runWorkflow)
	}
}

// The symbols are real. A cross-reference to a symbol that no longer exists is
// worse than none: it sends the next reader looking for a rule where it is not.
func TestNamedSymbolsExistInTheFilesThatClaimThem(t *testing.T) {
	c := load(t)

	// Prose entries — a note pointing at a concept rather than an identifier.
	// Listed explicitly so that adding one is a decision, not an accident.
	prose := map[string]bool{
		"boundary check":      true,
		"authority.ts":        true,
		"branch ownership":    true,
		"cas.modes":           true,
		"cas.sequences":       true,
		"records.evidence":    true,
		"$defs.provenance":    true,
		"$defs.check_result":  true,
		"$defs.acceptance":    true,
		"references.evidence": true,
		"layout.entries":      true,
		"lifecycle.stop":      true,
	}

	sources := map[string]string{}
	for _, inv := range c.Invariants {
		for _, s := range inv.Today {
			body, ok := sources[s.File]
			if !ok {
				data, err := os.ReadFile("../../../" + s.File)
				if err != nil {
					t.Errorf("%s names %s, which does not exist: %v", inv.ID, s.File, err)
					sources[s.File] = ""
					continue
				}
				body = string(data)
				sources[s.File] = body
			}
			if body == "" {
				continue
			}
			for _, symbol := range s.Symbols {
				if prose[symbol] {
					continue
				}
				if !strings.Contains(body, symbol) {
					t.Errorf("%s: %s does not contain %q", inv.ID, s.File, symbol)
				}
			}
		}
	}
}

// ------------------------------------------------------- the op vocabulary ---

// Every op and outcome a sequence uses is declared, and every declared op and
// outcome is reached. A vocabulary a second implementation reads has to be
// closed, or that implementation writes an op this side never exercises — and
// an outcome no sequence reaches is a branch no test has ever seen.
func TestFixtureUsesOnlyDeclaredOpsAndOutcomes(t *testing.T) {
	c := load(t)

	declared := map[string]map[string]bool{}
	for _, op := range c.Harness.Ops {
		if op.Does == "" {
			t.Errorf("op %q does not say what it does", op.Op)
		}
		outcomes := map[string]bool{}
		for _, o := range op.Outcomes {
			outcomes[o] = true
		}
		declared[op.Op] = outcomes
	}
	if len(declared) == 0 {
		t.Fatal("the harness declares no ops")
	}
	if len(c.Harness.Rules) == 0 || len(c.Harness.State) == 0 {
		t.Fatal("the harness's state and rules are what a second implementation copies; they are missing")
	}

	// Reached with the guards ON — what the contract says happens — and with
	// them OFF, which is where the violation outcomes live: `recorded` for a
	// supervisor's self-report, `stuck_awaiting_claimer`, `reported_requested`
	// and a clock's `released` are reachable only once their guard is disabled,
	// and every one of them is an outcome a WRONG implementation produces. A
	// vocabulary that omitted them would leave the negative control describing
	// behaviour the contract never names.
	used := map[string]map[string]bool{}
	reach := func(op, outcome string) {
		if used[op] == nil {
			used[op] = map[string]bool{}
		}
		used[op][outcome] = true
	}

	for _, inv := range c.Invariants {
		for _, seq := range inv.Sequences {
			for i, s := range seq.Steps {
				outcomes, ok := declared[s.Op]
				if !ok {
					t.Errorf("%s/%s step %d uses undeclared op %q", inv.ID, seq.ID, i, s.Op)
					continue
				}
				if !outcomes[s.Expect] {
					t.Errorf("%s/%s step %d expects %q, which op %q does not declare",
						inv.ID, seq.ID, i, s.Expect, s.Op)
				}
				reach(s.Op, s.Expect)
			}

			// The same sequence with this invariant's guards off. Whatever the
			// fake answers then is a real outcome of this op and has to be in
			// the vocabulary a second implementation reads.
			h := newHarness(c)
			for _, g := range inv.Guards {
				h.off[g] = true
			}
			for _, s := range seq.Steps {
				reach(s.Op, h.run(t, s))
			}
		}
	}

	for _, op := range sortedKeys(declared) {
		if used[op] == nil {
			t.Errorf("op %q is declared but no sequence uses it", op)
			continue
		}
		for _, outcome := range sortedKeys(declared[op]) {
			if !used[op][outcome] {
				t.Errorf("op %q declares outcome %q, which no sequence reaches in either guard mode", op, outcome)
			}
		}
		for outcome := range used[op] {
			if !declared[op][outcome] {
				t.Errorf("op %q produced undeclared outcome %q", op, outcome)
			}
		}
	}
}

// Every guard belongs to an invariant and every invariant's guards exist. A
// guard nothing claims is a switch with no rule behind it; a guard an invariant
// claims and the harness does not declare cannot be turned off, so that
// invariant has no negative control.
func TestGuardsAndInvariantsAccountForEachOther(t *testing.T) {
	c := load(t)

	declared := map[string]bool{}
	for _, g := range c.Harness.Guards {
		if g.Enforces == "" || g.Off == "" {
			t.Errorf("guard %q must say what it enforces and what happens with it off", g.Guard)
		}
		if declared[g.Guard] {
			t.Errorf("guard %q is declared twice", g.Guard)
		}
		declared[g.Guard] = true
	}

	claimed := map[string]bool{}
	for _, inv := range c.Invariants {
		for _, g := range inv.Guards {
			if !declared[g] {
				t.Errorf("%s names guard %q, which the harness does not declare", inv.ID, g)
			}
			if claimed[g] {
				t.Errorf("guard %q is claimed by more than one invariant; a guard belongs to the rule it enforces", g)
			}
			claimed[g] = true
		}
	}
	for _, g := range sortedKeys(declared) {
		if !claimed[g] {
			t.Errorf("guard %q is declared but no invariant claims it", g)
		}
	}
}

// A4's whole point: the relationship between the poll cadence and the
// substrate's wipe threshold is pinned in ONE place, not recomputed in two
// files. This is that place, so this is where it is asserted.
func TestPollCadenceIsPinnedUnderTheWipeThreshold(t *testing.T) {
	c := load(t)
	th := c.Harness.Thresholds

	if th.WipeThresholdMs <= 0 || th.MaxPollMs <= 0 || th.PushIntervalMs <= 0 || th.StepCapMs <= 0 {
		t.Fatalf("every threshold must be positive: %+v", th)
	}
	if th.MaxPollMs >= th.WipeThresholdMs {
		t.Errorf("max_poll_ms %d is not under wipe_threshold_ms %d — polling is not a keepalive",
			th.MaxPollMs, th.WipeThresholdMs)
	}
	if th.MaxPollMs*2 > th.WipeThresholdMs {
		t.Errorf("max_poll_ms %d leaves no margin under wipe_threshold_ms %d; Appendix A #4 says WELL under",
			th.MaxPollMs, th.WipeThresholdMs)
	}
	if th.PushIntervalMs >= th.MaxPollMs {
		t.Errorf("push_interval_ms %d is not under max_poll_ms %d; a job's work must reach origin more often than the reconciler looks",
			th.PushIntervalMs, th.MaxPollMs)
	}
}

// ---------------------------------------------------------- the cross-file ---

// A13's fingerprint fields are NOT defined here. They are the provenance object
// of the bundle's one evidence record, and this contract maps Appendix A's four
// English names onto it. Bundle 2.0.0 was cut because two contracts described
// one record and disagreed with nobody noticing, so the mapping is followed
// rather than trusted.
func TestFingerprintFieldsResolveToTheEvidenceRecordsProvenance(t *testing.T) {
	c := load(t)
	ff := c.Harness.FingerprintFields

	if ff.DefinedBy.File != "job-protocol.json" || ff.DefinedBy.Pointer != "#/$defs/provenance" {
		t.Fatalf("fingerprint_fields must point at job-protocol.json #/$defs/provenance, got %s %s",
			ff.DefinedBy.File, ff.DefinedBy.Pointer)
	}
	if len(ff.Fields) != 4 {
		t.Fatalf("Appendix A #13 names four fingerprint fields; the contract maps %d", len(ff.Fields))
	}

	data, err := os.ReadFile(jobProtocolFile)
	if err != nil {
		t.Fatalf("read %s: %v", jobProtocolFile, err)
	}
	var jp struct {
		Records map[string]struct {
			SchemaID string `json:"schema_id"`
		} `json:"records"`
		Defs map[string]struct {
			Required   []string       `json:"required"`
			Properties map[string]any `json:"properties"`
		} `json:"$defs"`
	}
	if err := json.Unmarshal(data, &jp); err != nil {
		t.Fatalf("parse %s: %v", jobProtocolFile, err)
	}

	if got := jp.Records["evidence"].SchemaID; got != ff.DefinedBy.SchemaID {
		t.Errorf("this contract names schema_id %q; job-protocol.json's evidence record is %q",
			ff.DefinedBy.SchemaID, got)
	}

	prov, ok := jp.Defs["provenance"]
	if !ok {
		t.Fatal("job-protocol.json has no $defs.provenance")
	}
	required := map[string]bool{}
	for _, name := range prov.Required {
		required[name] = true
	}
	for _, f := range ff.Fields {
		if f.AppendixA == "" {
			t.Errorf("fingerprint field %q does not say which Appendix A name it carries", f.ProvenanceField)
		}
		if _, ok := prov.Properties[f.ProvenanceField]; !ok {
			t.Errorf("fingerprint field %q is not a property of job-protocol.json $defs.provenance", f.ProvenanceField)
		}
		if !required[f.ProvenanceField] {
			t.Errorf("fingerprint field %q is not REQUIRED by $defs.provenance; evidence that may omit it is not fingerprinted",
				f.ProvenanceField)
		}
	}
}

// ------------------------------------------------------------- the runner ---

// runSequences replays every sequence of one invariant against a fresh fake and
// checks each step's outcome and the final state. Every named test below is a
// call to this plus its own negative control.
func runSequences(t *testing.T, c contract, inv invariant) {
	t.Helper()
	for _, seq := range inv.Sequences {
		seq := seq
		t.Run(seq.ID, func(t *testing.T) {
			h := newHarness(c)
			for i, s := range seq.Steps {
				got := h.run(t, s)
				if got != s.Expect {
					t.Fatalf("step %d (%s): outcome %q, contract says %q", i, s.Op, got, s.Expect)
				}
			}
			checkFinal(t, h, seq.Final)
		})
	}
}

// disablingTheGuardBreaksIt is the negative control, one per invariant. Turn
// this invariant's guards off and at least one sequence must stop matching the
// contract — otherwise the sequences describe a series of operations that
// happens to end somewhere, and prove nothing about the rule.
func disablingTheGuardBreaksIt(t *testing.T, c contract, inv invariant) {
	t.Helper()

	broke := false
	for _, seq := range inv.Sequences {
		h := newHarness(c)
		for _, g := range inv.Guards {
			h.off[g] = true
		}
		diverged := false
		for _, s := range seq.Steps {
			if got := h.run(t, s); got != s.Expect {
				diverged = true
			}
		}
		if !diverged && finalMatches(h, seq.Final) {
			continue
		}
		broke = true
	}

	if !broke {
		t.Errorf("%s passes with %v disabled — its sequences are not testing the guard",
			inv.ID, inv.Guards)
	}
}

func sortedKeys[V any](m map[string]V) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
