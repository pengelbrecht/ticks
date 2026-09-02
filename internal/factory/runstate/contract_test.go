package runstate

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tkcontract"
)

const (
	contractFile = "../../../contracts/ticfac-run-state.json"
	repoRoot     = "../../.."
)

type layoutEntry struct {
	Path             string `json:"path"`
	Record           string `json:"record"`
	Committed        bool   `json:"committed"`
	Cardinality      string `json:"cardinality"`
	CAS              string `json:"cas"`
	FirstWrite       string `json:"first_write"`
	Rebuildable      bool   `json:"rebuildable"`
	HostedEquivalent string `json:"hosted_equivalent"`
	Why              string `json:"why"`
}

type casMode struct {
	Mode                      string   `json:"mode"`
	Guard                     string   `json:"guard"`
	OnConflict                string   `json:"on_conflict"`
	EffectPermittedOnConflict bool     `json:"effect_permitted_on_conflict"`
	Records                   []string `json:"records"`
	Why                       string   `json:"why"`
}

type casStep struct {
	Actor           string         `json:"actor"`
	Op              string         `json:"op"`
	Path            string         `json:"path"`
	Content         map[string]any `json:"content"`
	Expect          string         `json:"expect"`
	EffectPermitted *bool          `json:"effect_permitted"`
}

type casSequence struct {
	ID    string    `json:"id"`
	Why   string    `json:"why"`
	Steps []casStep `json:"steps"`
	Final struct {
		OriginWrites int                       `json:"origin_writes"`
		Files        map[string]map[string]any `json:"files"`
	} `json:"final"`
}

type runStateContract struct {
	SchemaVersion int      `json:"schema_version"`
	Contract      string   `json:"contract"`
	Spec          string   `json:"spec"`
	SpecSections  []string `json:"spec_sections"`

	Layout struct {
		Root             string        `json:"root"`
		Mirrors          string        `json:"mirrors"`
		RunDir           string        `json:"run_dir"`
		OneFilePerRecord bool          `json:"one_file_per_record"`
		Entries          []layoutEntry `json:"entries"`
	} `json:"layout"`

	Authority struct {
		DurableAuthority     string `json:"durable_authority"`
		D1IsAuthority        bool   `json:"d1_is_authority"`
		HostedIndexIsDerived bool   `json:"hosted_index_is_derived"`
	} `json:"authority"`

	Boundary struct {
		OnlyWriter                     string   `json:"only_writer"`
		WorkersWrite                   bool     `json:"workers_write"`
		TicksReadsTicfac               bool     `json:"ticks_reads_ticfac"`
		IsConfiguration                bool     `json:"is_configuration"`
		ConfigurationLivesIn           []string `json:"configuration_lives_in"`
		RelocatableToSiblingRepository bool     `json:"relocatable_to_sibling_repository"`
		DefaultLocation                string   `json:"default_location"`
	} `json:"boundary"`

	Persistence struct {
		DurableMeans            string `json:"durable_means"`
		LocalCommitIsDurable    bool   `json:"local_commit_is_durable"`
		WriteCommitPushIsOneOp  bool   `json:"write_commit_push_is_one_operation"`
		CASRef                  string `json:"cas_ref"`
		ChurnBranch             string `json:"churn_branch"`
		AuditCommand            string `json:"audit_command"`
		CheckpointOn            string `json:"checkpoint_on"`
		CheckpointOnObservation bool   `json:"checkpoint_on_observation"`
		TerminalRecord          struct {
			LandsOn                         string `json:"lands_on"`
			Times                           int    `json:"times"`
			Through                         string `json:"through"`
			Form                            string `json:"form"`
			IntermediateCommitsLandOnTarget bool   `json:"intermediate_commits_land_on_target"`
			CollapsedBy                     string `json:"collapsed_by"`
		} `json:"terminal_record"`
		Tag struct {
			Pattern                 string `json:"pattern"`
			PlacedAt                string `json:"placed_at"`
			PlacedBefore            string `json:"placed_before"`
			PlacedOnUnpublishedRuns bool   `json:"placed_on_unpublished_runs"`
		} `json:"tag"`
		GC struct {
			Command   string   `json:"command"`
			Prunes    []string `json:"prunes"`
			By        []string `json:"by"`
			ModeledOn string   `json:"modeled_on"`
		} `json:"gc"`
		ConflictIs           string `json:"conflict_is"`
		ConflictRetryBlindly bool   `json:"conflict_retry_blindly"`
	} `json:"persistence"`

	Gitignore struct {
		Target          string   `json:"target"`
		BeginMarker     string   `json:"begin_marker"`
		EndMarker       string   `json:"end_marker"`
		Fragment        []string `json:"fragment"`
		IgnoredExamples []string `json:"ignored_examples"`
		TrackedExamples []string `json:"tracked_examples"`
	} `json:"gitignore"`

	Envelope struct {
		RequiredOnEveryCommittedRecord []string `json:"required_on_every_committed_record"`
		ProvenanceIs                   string   `json:"provenance_is"`
	} `json:"envelope"`

	References map[string]struct {
		Record           string `json:"record"`
		Why              string `json:"why"`
		SchemaID         string `json:"schema_id"`
		Contract         string `json:"contract"`
		File             string `json:"file"`
		Pointer          string `json:"pointer"`
		DivisionOfLabour string `json:"division_of_labour"`
		KeyIs            string `json:"key_is"`
	} `json:"references"`

	Defs    map[string]json.RawMessage `json:"$defs"`
	Schemas map[string]json.RawMessage `json:"schemas"`
	Golden  map[string]json.RawMessage `json:"golden"`
	Invalid []struct {
		Record   string         `json:"record"`
		Why      string         `json:"why"`
		Document map[string]any `json:"document"`
	} `json:"invalid"`

	CAS struct {
		Ref              string            `json:"ref"`
		LocalIsAuthority bool              `json:"local_ref_is_authority"`
		Mechanisms       map[string]string `json:"mechanisms"`
		Modes            []casMode         `json:"modes"`
		Fake             struct {
			Ops []struct {
				Op       string   `json:"op"`
				Does     string   `json:"does"`
				Outcomes []string `json:"outcomes"`
			} `json:"ops"`
			Rules []string `json:"rules"`
		} `json:"fake"`
		Sequences []casSequence `json:"sequences"`
	} `json:"cas"`
}

func load(t *testing.T) runStateContract {
	t.Helper()
	data, err := os.ReadFile(contractFile)
	if err != nil {
		t.Fatalf("read %s: %v", contractFile, err)
	}
	var c runStateContract
	if err := json.Unmarshal(data, &c); err != nil {
		t.Fatalf("parse %s: %v", contractFile, err)
	}
	return c
}

// referenced reports whether a record is PLACED by this contract but DEFINED by
// another one, named in `references`. `evidence` is the only such record: this
// contract owns where the file goes and how it is written, and
// contracts/job-protocol.json owns what is in it (SPEC §10.1). Bundle 1.2.0
// kept a second, looser schema here as well; two definitions of one record is
// what that cost, so there is now a pointer and no schema.
func referenced(c runStateContract, record string) bool {
	_, ok := c.References[record]
	return ok
}

func TestContractIdentifiesItself(t *testing.T) {
	c := load(t)
	if c.SchemaVersion != 1 {
		t.Errorf("schema_version = %d, want 1", c.SchemaVersion)
	}
	if c.Contract != "ticfac.run_state" {
		t.Errorf("contract = %q, want ticfac.run_state", c.Contract)
	}
	if c.Spec == "" || len(c.SpecSections) == 0 {
		t.Error("the contract must name the spec and the sections it freezes")
	}
}

// The layout is the whole point of the file: SPEC §10.4's tree, with every path
// classified as committed record or gitignored exhaust. A path that is neither
// is a path nobody knows what to do with.
func TestLayoutCoversTheSpecTree(t *testing.T) {
	c := load(t)

	want := map[string]bool{
		".ticfac/runs/<run-id>/checkpoint.json":     true,
		".ticfac/runs/<run-id>/attempts/<n>.json":   true,
		".ticfac/runs/<run-id>/evidence/<key>.json": true,
		".ticfac/runs/<run-id>/decisions/<n>.json":  true,
		".ticfac/.index.json":                       false,
		".ticfac/logs/":                             false,
	}

	got := map[string]bool{}
	for _, e := range c.Layout.Entries {
		if _, dup := got[e.Path]; dup {
			t.Errorf("layout lists %s twice", e.Path)
		}
		got[e.Path] = e.Committed
	}
	for path, committed := range want {
		actual, ok := got[path]
		if !ok {
			t.Errorf("layout is missing %s (SPEC §10.4)", path)
			continue
		}
		if actual != committed {
			t.Errorf("%s: committed = %v, want %v", path, actual, committed)
		}
	}
	for path := range got {
		if _, ok := want[path]; !ok {
			t.Errorf("layout lists %s, which is not in the SPEC §10.4 tree", path)
		}
	}

	if c.Layout.Root != ".ticfac" || c.Layout.Mirrors != ".tick" {
		t.Errorf("root/mirrors = %q/%q, want .ticfac/.tick", c.Layout.Root, c.Layout.Mirrors)
	}
	if !c.Layout.OneFilePerRecord {
		t.Error("one_file_per_record must hold — it is what makes concurrent EpicRuns merge cleanly")
	}
}

// Every committed entry declares which CAS mode guards it, and every
// uncommitted one declares neither a record nor a guard. An uncommitted file
// with a CAS mode would be a guard against a ref it never reaches.
func TestEveryCommittedEntryIsGuarded(t *testing.T) {
	c := load(t)

	modes := map[string]casMode{}
	for _, m := range c.CAS.Modes {
		modes[m.Mode] = m
	}

	for _, e := range c.Layout.Entries {
		if !e.Committed {
			if e.Record != "" || e.CAS != "" {
				t.Errorf("%s is not committed but declares record %q / cas %q", e.Path, e.Record, e.CAS)
			}
			if e.Why == "" {
				t.Errorf("%s: an uncommitted path must say why it is exhaust", e.Path)
			}
			continue
		}
		if e.Record == "" {
			t.Errorf("%s is committed but names no record", e.Path)
		}
		mode, ok := modes[e.CAS]
		if !ok {
			t.Errorf("%s: cas %q is not one of the declared modes", e.Path, e.CAS)
			continue
		}
		if mode.EffectPermittedOnConflict {
			t.Errorf("%s: mode %q permits the effect on conflict — then it guards nothing", e.Path, mode.Mode)
		}
		if !contains(mode.Records, e.Record) {
			t.Errorf("%s: record %q is not listed under cas mode %q", e.Path, e.Record, e.CAS)
		}
		if e.Cardinality == "" {
			t.Errorf("%s: committed entries declare their cardinality", e.Path)
		}
	}

	// The checkpoint is the only record that is ever updated, so it is the only
	// one whose first write needs a different mode from its later ones.
	for _, e := range c.Layout.Entries {
		if e.Record == "checkpoint" {
			if e.CAS != "sha_guarded_update" || e.FirstWrite != "create_if_absent" {
				t.Errorf("checkpoint: cas/first_write = %q/%q, want sha_guarded_update/create_if_absent", e.CAS, e.FirstWrite)
			}
		} else if e.Committed && e.FirstWrite != "" {
			t.Errorf("%s: only the checkpoint has a distinct first_write; a create-if-absent record has one write", e.Path)
		}
	}

	// Every record named by a CAS mode is a record the layout actually places.
	placed := map[string]bool{}
	for _, e := range c.Layout.Entries {
		if e.Committed {
			placed[e.Record] = true
		}
	}
	for _, m := range c.CAS.Modes {
		for _, r := range m.Records {
			if !placed[r] {
				t.Errorf("cas mode %q guards record %q, which the layout never places", m.Mode, r)
			}
		}
	}
}

// A record with a schema and no golden example is unproven; a golden example
// with no schema validates against nothing. Both directions are errors.
func TestEveryRecordHasASchemaAndAGoldenExample(t *testing.T) {
	c := load(t)

	for _, e := range c.Layout.Entries {
		if !e.Committed {
			continue
		}
		_, hasSchema := c.Schemas[e.Record]
		if !hasSchema && !referenced(c, e.Record) {
			t.Errorf("record %q has neither a schema here nor a reference to the contract that defines it", e.Record)
		}
		if hasSchema && referenced(c, e.Record) {
			t.Errorf("record %q is both defined here and referenced elsewhere — "+
				"two definitions of one record is what bundle 1.2.0 shipped", e.Record)
		}
		if _, ok := c.Golden[e.Record]; !ok {
			t.Errorf("record %q has no golden example", e.Record)
		}
	}

	for name := range c.Schemas {
		found := false
		for _, e := range c.Layout.Entries {
			if e.Committed && e.Record == name {
				found = true
			}
		}
		if !found {
			t.Errorf("schema %q validates no record the layout places", name)
		}
	}

	// A reference names a record this contract places, and says where the
	// record is defined. A pointer at nothing is worse than no pointer.
	for name, ref := range c.References {
		placed := false
		for _, e := range c.Layout.Entries {
			if e.Committed && e.Record == name {
				placed = true
			}
		}
		if !placed {
			t.Errorf("references.%s points at a record this contract does not place", name)
		}
		if ref.SchemaID == "" || ref.File == "" || ref.Pointer == "" || ref.Contract == "" {
			t.Errorf("references.%s must name the contract, the file, the schema_id and the pointer", name)
		}
		if ref.Why == "" || ref.DivisionOfLabour == "" {
			t.Errorf("references.%s must say what each contract owns", name)
		}
	}
}

// SPEC §10.4: every committed file carries a schema_version and the provenance
// fields of an evidence record. That sentence is what makes a loose JSON file
// readable later by something that did not write it, so it is asserted against
// every schema rather than trusted.
func TestEveryRecordSchemaRequiresTheEnvelope(t *testing.T) {
	c := load(t)

	if len(c.Envelope.RequiredOnEveryCommittedRecord) == 0 {
		t.Fatal("envelope.required_on_every_committed_record is empty")
	}

	for name, raw := range c.Schemas {
		var s struct {
			Required   []string                   `json:"required"`
			Properties map[string]json.RawMessage `json:"properties"`
		}
		if err := json.Unmarshal(raw, &s); err != nil {
			t.Fatalf("schema %s: %v", name, err)
		}
		for _, field := range c.Envelope.RequiredOnEveryCommittedRecord {
			if !contains(s.Required, field) {
				t.Errorf("schema %q does not require %q", name, field)
			}
			if _, ok := s.Properties[field]; !ok {
				t.Errorf("schema %q requires %q but does not describe it", name, field)
			}
		}
	}

	// And provenance is one shared definition, not four drifting copies.
	if _, ok := c.Defs["provenance"]; !ok {
		t.Fatal("$defs.provenance is missing")
	}
	for name, raw := range c.Schemas {
		var s struct {
			Properties map[string]struct {
				Ref string `json:"$ref"`
			} `json:"properties"`
		}
		if err := json.Unmarshal(raw, &s); err != nil {
			t.Fatalf("schema %s: %v", name, err)
		}
		if got := s.Properties["provenance"].Ref; got != "#/$defs/provenance" {
			t.Errorf("schema %q: provenance is %q, want a $ref to the shared definition", name, got)
		}
	}
}

func parseSchemas(t *testing.T, c runStateContract) (map[string]*tkcontract.Schema, map[string]*tkcontract.Schema) {
	t.Helper()
	defs := map[string]*tkcontract.Schema{}
	for name, raw := range c.Defs {
		s, err := tkcontract.ParseSchema(raw)
		if err != nil {
			t.Fatalf("$defs.%s: %v", name, err)
		}
		defs[name] = s
	}
	schemas := map[string]*tkcontract.Schema{}
	for name, raw := range c.Schemas {
		s, err := tkcontract.ParseSchema(raw)
		if err != nil {
			t.Fatalf("schemas.%s: %v", name, err)
		}
		schemas[name] = s
	}
	return defs, schemas
}

// The schemas parse under the strict subset validator, which refuses any
// keyword it cannot enforce. A schema that used one would read as if it
// asserted something while asserting nothing.
func TestSchemasParseUnderTheStrictSubset(t *testing.T) {
	c := load(t)
	defs, schemas := parseSchemas(t, c)
	if len(defs) == 0 || len(schemas) == 0 {
		t.Fatal("contract declares no schemas")
	}
}

func TestGoldenExamplesValidate(t *testing.T) {
	c := load(t)
	defs, schemas := parseSchemas(t, c)

	for record, raw := range c.Golden {
		var doc any
		if err := json.Unmarshal(raw, &doc); err != nil {
			t.Fatalf("golden.%s: %v", record, err)
		}
		name := record
		// Per iteration, exactly as TestInvalidExamplesAreRefused does it: the
		// referenced record brings the OTHER contract's $defs, and assigning
		// them to the loop-invariant `defs` leaked job-protocol's definitions
		// into whichever golden example map iteration happened to visit next.
		// That made this test fail or pass on Go's map ordering — `checkpoint`
		// validated against defs with no `tick_state` roughly half the time.
		validatorDefs := defs
		s, ok := schemas[name]
		if !ok {
			if !referenced(c, record) {
				t.Errorf("golden.%s has no schema %q", record, name)
				continue
			}
			// A referenced record is validated against the contract that
			// defines it, not against a looser copy kept here.
			name = c.References[record].SchemaID
			s, validatorDefs = referencedSchema(t, c, record)
		}
		if errs := tkcontract.Validate(s, validatorDefs, doc); len(errs) > 0 {
			t.Errorf("golden.%s does not validate against schema %q:\n  %s",
				record, name, strings.Join(errs, "\n  "))
		}
		// A golden example that is empty validates against almost anything and
		// proves nothing — the same trap tk-json-manifest's fixtures guard.
		obj, ok := doc.(map[string]any)
		if !ok || len(obj) < 4 {
			t.Errorf("golden.%s is too thin to prove anything", record)
		}
	}
}

// The negative controls. A schema nothing has ever seen refuse a document is
// not known to refuse anything.
func TestInvalidExamplesAreRefused(t *testing.T) {
	c := load(t)
	defs, schemas := parseSchemas(t, c)

	if len(c.Invalid) < len(c.Schemas)+len(c.References) {
		t.Errorf("%d negative examples for %d schemas and %d referenced record(s) — each needs at least one",
			len(c.Invalid), len(c.Schemas), len(c.References))
	}

	covered := map[string]bool{}
	for i, bad := range c.Invalid {
		s, ok := schemas[bad.Record]
		validatorDefs := defs
		if !ok {
			if !referenced(c, bad.Record) {
				t.Errorf("invalid[%d]: no schema %q", i, bad.Record)
				continue
			}
			s, validatorDefs = referencedSchema(t, c, bad.Record)
		}
		covered[bad.Record] = true
		if bad.Why == "" {
			t.Errorf("invalid[%d]: a negative example must say what it is proving", i)
		}
		if errs := tkcontract.Validate(s, validatorDefs, any(bad.Document)); len(errs) == 0 {
			t.Errorf("invalid[%d] (%s: %s) VALIDATED — the schema is not refusing what it claims to",
				i, bad.Record, bad.Why)
		}
	}
	for name := range schemas {
		if !covered[name] {
			t.Errorf("schema %q has no negative example", name)
		}
	}
	// A referenced record needs one too. The refusal this contract claims for
	// a file it commits is made by another contract's schema, and an unproven
	// claim about someone else's schema is the drift of bundle 1.2.0 exactly.
	for name := range c.References {
		if !covered[name] {
			t.Errorf("referenced record %q has no negative example", name)
		}
	}
}

// SPEC §10.4's persistence policy, which is the half of this contract that is
// not a shape. Every clause is pinned by value because each one is a rule some
// implementation could quietly stop honouring while staying green.
func TestPersistencePolicy(t *testing.T) {
	c := load(t)
	p := c.Persistence

	if p.DurableMeans != "pushed on origin" {
		t.Errorf("durable_means = %q, want %q", p.DurableMeans, "pushed on origin")
	}
	if p.LocalCommitIsDurable {
		t.Error("a local commit must not count as durable — the writer is a sandbox that can be wiped")
	}
	if !p.WriteCommitPushIsOneOp {
		t.Error("write, commit and push are one operation")
	}
	if p.CASRef != "origin" || c.CAS.Ref != "origin" {
		t.Errorf("the compare-and-swap is against origin, got %q / %q", p.CASRef, c.CAS.Ref)
	}
	if c.CAS.LocalIsAuthority {
		t.Error("the local ref is not the authority")
	}
	if p.CheckpointOn != "state change" || p.CheckpointOnObservation {
		t.Errorf("checkpoint on state change, not observation; got on=%q observation=%v",
			p.CheckpointOn, p.CheckpointOnObservation)
	}
	if !strings.Contains(p.AuditCommand, "git log") || !strings.Contains(p.AuditCommand, ".ticfac/runs/") {
		t.Errorf("audit_command = %q, want the run directory's git log", p.AuditCommand)
	}
	if !strings.Contains(p.ChurnBranch, "integration branch") {
		t.Errorf("churn_branch = %q, want the EpicRun integration branch", p.ChurnBranch)
	}

	if p.TerminalRecord.Times != 1 {
		t.Errorf("terminal_record.times = %d, want 1 — it lands on the target ref once", p.TerminalRecord.Times)
	}
	if p.TerminalRecord.IntermediateCommitsLandOnTarget {
		t.Error("intermediate checkpoints must not land on the target ref; a squash merge collapses them")
	}
	if p.TerminalRecord.LandsOn == "" || p.TerminalRecord.Through == "" || p.TerminalRecord.Form == "" {
		t.Error("terminal_record must say where it lands, through what, and in what form")
	}

	if p.Tag.Pattern != "ticfac/run-<run-id>" {
		t.Errorf("tag.pattern = %q, want ticfac/run-<run-id>", p.Tag.Pattern)
	}
	if p.Tag.PlacedAt != "terminal state" {
		t.Errorf("tag.placed_at = %q, want terminal state (not merge)", p.Tag.PlacedAt)
	}
	if !p.Tag.PlacedOnUnpublishedRuns {
		t.Error("a run that never publishes still has its record — the tag is placed at terminal state")
	}
	if !strings.Contains(p.Tag.PlacedBefore, "deletion") {
		t.Errorf("tag.placed_before = %q, want it placed before the run branch is deleted", p.Tag.PlacedBefore)
	}

	if p.GC.Command != "ticfac gc" {
		t.Errorf("gc.command = %q, want ticfac gc", p.GC.Command)
	}
	if len(p.GC.Prunes) == 0 || len(p.GC.By) == 0 {
		t.Error("gc must say what it prunes and by what")
	}
	if !contains(p.GC.By, "age") || !contains(p.GC.By, "terminal state") {
		t.Errorf("gc.by = %v, want age and terminal state", p.GC.By)
	}

	if p.ConflictRetryBlindly {
		t.Error("a compare-and-swap conflict is the desired outcome, not an error to retry blindly")
	}
	if p.ConflictIs != "the signal" {
		t.Errorf("conflict_is = %q, want %q", p.ConflictIs, "the signal")
	}

	if c.Authority.D1IsAuthority {
		t.Error("SPEC §12 Phase 0 step 6: run state never lands in D1 as authority")
	}
	if !c.Authority.HostedIndexIsDerived {
		t.Error("the hosted index is derived, and must be rebuildable from the committed records")
	}
	if !strings.Contains(c.Authority.DurableAuthority, "origin") {
		t.Errorf("durable_authority = %q, want it to name origin", c.Authority.DurableAuthority)
	}
}

// The `.tick/` boundary rule, mirrored. It is what keeps the dependency
// direction one-way: ticks never reads `.ticfac/`.
func TestBoundaryMirrorsTheTrackerRule(t *testing.T) {
	c := load(t)
	b := c.Boundary

	if b.OnlyWriter != "the reconciler" {
		t.Errorf("only_writer = %q, want the reconciler", b.OnlyWriter)
	}
	if b.WorkersWrite {
		t.Error("workers never write .ticfac/")
	}
	if b.TicksReadsTicfac {
		t.Error("ticks never reads .ticfac/ — that is the one-way dependency")
	}
	if b.IsConfiguration {
		t.Error(".ticfac/ is run state, not a second configuration surface")
	}
	if len(b.ConfigurationLivesIn) < 2 {
		t.Error("the contract must name where configuration lives instead")
	}
	if !b.RelocatableToSiblingRepository || b.DefaultLocation == "" {
		t.Error("a deployment MAY point .ticfac/ at a sibling repository; the default is the project repository")
	}
}

// The .gitignore fragment, in the repository it describes. ticks is a ticfac
// target like any other, so "the fragment is defined" means it is actually in
// this repository's .gitignore — not that a JSON file mentions it.
func TestGitignoreFragmentIsInTheRepository(t *testing.T) {
	c := load(t)

	if len(c.Gitignore.Fragment) == 0 {
		t.Fatal("the contract declares no .gitignore fragment")
	}
	if c.Gitignore.Fragment[0] != c.Gitignore.BeginMarker {
		t.Errorf("the fragment must open with the begin marker %q", c.Gitignore.BeginMarker)
	}
	if c.Gitignore.Fragment[len(c.Gitignore.Fragment)-1] != c.Gitignore.EndMarker {
		t.Errorf("the fragment must close with the end marker %q", c.Gitignore.EndMarker)
	}

	target := filepath.Join(repoRoot, c.Gitignore.Target)
	data, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read %s: %v", target, err)
	}
	lines := strings.Split(strings.ReplaceAll(string(data), "\r\n", "\n"), "\n")

	if !containsRun(lines, c.Gitignore.Fragment) {
		t.Errorf("%s does not contain the contract's fragment, contiguously:\n%s",
			c.Gitignore.Target, strings.Join(c.Gitignore.Fragment, "\n"))
	}

	// Every uncommitted layout path is covered by the fragment, and no
	// committed one is. A layout entry marked exhaust that git still tracks is
	// the failure this pairing exists to catch.
	for _, e := range c.Layout.Entries {
		if e.Committed {
			continue
		}
		if !contains(c.Gitignore.Fragment, e.Path) {
			t.Errorf("%s is not committed but the fragment does not ignore it", e.Path)
		}
	}
	for _, e := range c.Layout.Entries {
		if e.Committed && contains(c.Gitignore.Fragment, e.Path) {
			t.Errorf("%s is committed but the fragment ignores it", e.Path)
		}
	}
}

// And git agrees. A fragment that reads correctly but that git does not apply
// the way the contract claims is worse than none: the run's durable record
// would silently never be committed.
func TestGitHonoursTheFragment(t *testing.T) {
	c := load(t)

	if _, err := exec.LookPath("git"); err != nil {
		t.Skipf("git not on PATH: %v", err)
	}

	ignored := func(path string) bool {
		cmd := exec.Command("git", "check-ignore", "-q", "--", path)
		cmd.Dir = repoRoot
		return cmd.Run() == nil
	}

	for _, path := range c.Gitignore.IgnoredExamples {
		if !ignored(path) {
			t.Errorf("git does not ignore %s, but the contract says it is exhaust", path)
		}
	}
	for _, path := range c.Gitignore.TrackedExamples {
		if ignored(path) {
			t.Errorf("git ignores %s, but it is the run's durable record", path)
		}
	}
	if len(c.Gitignore.TrackedExamples) < 4 {
		t.Error("every committed record kind needs a tracked example, or the fragment is only half tested")
	}
}

func contains(haystack []string, needle string) bool {
	for _, s := range haystack {
		if s == needle {
			return true
		}
	}
	return false
}

// containsRun reports whether `want` appears in `lines` as a contiguous run.
func containsRun(lines, want []string) bool {
	if len(want) == 0 || len(want) > len(lines) {
		return false
	}
	for i := 0; i+len(want) <= len(lines); i++ {
		match := true
		for j, w := range want {
			if lines[i+j] != w {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

// Keeps the failure output of the table tests deterministic.
func sortedKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
