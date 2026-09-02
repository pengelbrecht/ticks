package jobprotocol

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tkcontract"
)

const (
	credentialOwnershipFile = "../../../contracts/credential-ownership.json"
	collectVocabularyFile   = "../../../contracts/collect-vocabulary.json"

	// illustrationSource marks the one golden example that is SPEC §4.3's
	// printed JobSpec byte for byte.
	illustrationSource = "SPEC §4.3 — the illustrative JobSpec"
)

// contract is the decoded contracts/job-protocol.json. Schemas stay as raw
// JSON so ParseSchema — not encoding/json — is what decides whether a schema
// is expressible, which is the check that makes the file a contract.
type contract struct {
	SchemaVersion int    `json:"schema_version"`
	Contract      string `json:"contract"`
	Why           []string
	Versioning    struct {
		Rule             string `json:"rule"`
		AddingAField     string `json:"adding_a_field"`
		RecordsAreClosed string `json:"records_are_closed"`
	} `json:"versioning"`
	Operations []struct {
		Operation string `json:"operation"`
		Argv      string `json:"argv"`
		Input     string `json:"input"`
		Output    string `json:"output"`
		Rule      string `json:"rule"`
	} `json:"operations"`
	Credentials struct {
		Issuer     string `json:"issuer"`
		OwnedBy    string `json:"owned_by"`
		Revocation struct {
			OnCancel                     string `json:"on_cancel"`
			Order                        string `json:"order"`
			ReissueAfterCancel           string `json:"reissue_after_cancel"`
			RefuseIssueBeforeEveryBoot   bool   `json:"refuse_issue_before_every_boot"`
			CancelledHandleCannotReissue bool   `json:"cancelled_handle_cannot_reissue"`
			RevokeBeforeStop             bool   `json:"revoke_before_stop"`
		} `json:"revocation"`
		Cost struct {
			MeteredBudgetField string `json:"metered_budget_field"`
			MeteredBudgetPath  string `json:"metered_budget_path"`
			FlatRateFailure    string `json:"flat_rate_quota_failure"`
			Rule               string `json:"rule"`
		} `json:"cost"`
	} `json:"credentials"`
	Rules struct {
		CompletionContract struct {
			DrivesCollection      []string `json:"drives_collection"`
			NeverDrivesCollection []string `json:"never_drives_collection"`
			Why                   string   `json:"why"`
		} `json:"completion_contract"`
		Disposal struct {
			AllowedOnlyAfter []string `json:"allowed_only_after"`
			Why              string   `json:"why"`
		} `json:"disposal"`
	} `json:"rules"`
	Records map[string]struct {
		SchemaID    string          `json:"schema_id"`
		Description string          `json:"description"`
		Schema      json.RawMessage `json:"schema"`
	} `json:"records"`
	Defs     map[string]json.RawMessage `json:"$defs"`
	Examples struct {
		Golden []struct {
			Name     string          `json:"name"`
			Record   string          `json:"record"`
			Source   string          `json:"source"`
			Document json.RawMessage `json:"document"`
		} `json:"golden"`
		Negative []struct {
			Name                string          `json:"name"`
			Record              string          `json:"record"`
			Why                 string          `json:"why"`
			ExpectErrorContains string          `json:"expect_error_contains"`
			Document            json.RawMessage `json:"document"`
		} `json:"negative"`
	} `json:"examples"`
}

func load(t *testing.T) *contract {
	t.Helper()
	raw, err := os.ReadFile(ContractFile)
	if err != nil {
		t.Fatalf("read %s: %v", ContractFile, err)
	}
	var c contract
	if err := json.Unmarshal(raw, &c); err != nil {
		t.Fatalf("parse %s: %v", ContractFile, err)
	}
	return &c
}

// parsed returns every record schema and every $def, already through
// ParseSchema. A schema the validator cannot express fails here.
func parsed(t *testing.T, c *contract) (map[string]*tkcontract.Schema, map[string]*tkcontract.Schema) {
	t.Helper()
	defs := make(map[string]*tkcontract.Schema, len(c.Defs))
	for name, raw := range c.Defs {
		schema, err := tkcontract.ParseSchema(raw)
		if err != nil {
			t.Fatalf("$defs.%s: %v", name, err)
		}
		defs[name] = schema
	}
	records := make(map[string]*tkcontract.Schema, len(c.Records))
	for name, record := range c.Records {
		if len(record.Schema) == 0 {
			t.Fatalf("record %s carries no schema", name)
		}
		schema, err := tkcontract.ParseSchema(record.Schema)
		if err != nil {
			t.Fatalf("record %s: %v", name, err)
		}
		records[name] = schema
	}
	return records, defs
}

func decode(t *testing.T, raw json.RawMessage) any {
	t.Helper()
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		t.Fatalf("decode document: %v", err)
	}
	return value
}

func TestContractIdentity(t *testing.T) {
	c := load(t)

	if c.SchemaVersion != 1 {
		t.Errorf("schema_version = %d, want 1", c.SchemaVersion)
	}
	if c.Contract != Contract {
		t.Errorf("contract = %q, want %q", c.Contract, Contract)
	}
	// The versioning rule is the whole reason these records may be closed.
	// Without it, `additionalProperties: false` would make every added field a
	// silent break instead of a version bump.
	if c.Versioning.Rule == "" || c.Versioning.AddingAField == "" {
		t.Error("versioning must state the rule and what adding a field costs")
	}
}

// TestRecordsAreTheSevenTheProtocolNeeds pins the record set. A record dropped
// or renamed in the file alone fails here, which is the drift a consumer in
// another repository cannot see.
func TestRecordsAreTheSevenTheProtocolNeeds(t *testing.T) {
	c := load(t)

	for name, want := range SchemaIDs {
		record, ok := c.Records[name]
		if !ok {
			t.Errorf("record %q is missing from the contract", name)
			continue
		}
		if record.SchemaID != want {
			t.Errorf("record %s: schema_id = %q, want %q", name, record.SchemaID, want)
		}
		if record.Description == "" {
			t.Errorf("record %s: no description", name)
		}
	}
	for name := range c.Records {
		if _, ok := SchemaIDs[name]; !ok {
			t.Errorf("record %q is in the contract but not declared in SchemaIDs", name)
		}
	}
}

// TestOperationsAreTheFour pins start/inspect/cancel/collect and the record
// each one takes and returns. The protocol collapses WorkerProvider, Worker,
// Workspace and AgentRunner into exactly these four (SPEC §4.3); a fifth
// operation, or one wired to the wrong record, is a different protocol.
func TestOperationsAreTheFour(t *testing.T) {
	c := load(t)

	want := []struct{ op, in, out string }{
		{"start", "job_spec", "job_handle"},
		{"inspect", "job_handle", "job_status"},
		{"cancel", "job_handle", "cancel_ack"},
		{"collect", "job_handle", "job_result"},
	}
	if len(c.Operations) != len(want) {
		t.Fatalf("got %d operations, want exactly %d", len(c.Operations), len(want))
	}
	for i, w := range want {
		got := c.Operations[i]
		if got.Operation != w.op {
			t.Errorf("operation[%d] = %q, want %q", i, got.Operation, w.op)
			continue
		}
		if got.Input != w.in {
			t.Errorf("%s: input = %q, want %q", w.op, got.Input, w.in)
		}
		if got.Output != w.out {
			t.Errorf("%s: output = %q, want %q", w.op, got.Output, w.out)
		}
		// The protocol has to be usable as Unix-style JSON commands, not only
		// as a library (SPEC §4.3), so the argv form is part of the contract.
		if wantArgv := "ticfac-exec-<name> " + w.op; got.Argv != wantArgv {
			t.Errorf("%s: argv = %q, want %q", w.op, got.Argv, wantArgv)
		}
		if _, ok := c.Records[got.Input]; !ok {
			t.Errorf("%s: input names unknown record %q", w.op, got.Input)
		}
		if _, ok := c.Records[got.Output]; !ok {
			t.Errorf("%s: output names unknown record %q", w.op, got.Output)
		}
	}
}

// TestEverySchemaIsExpressible is the strictness gate. ParseSchema refuses a
// keyword it cannot enforce, so a schema that reads as if it constrains
// something the validator ignores cannot enter the bundle.
func TestEverySchemaIsExpressible(t *testing.T) {
	c := load(t)
	records, defs := parsed(t, c)

	if len(records) == 0 || len(defs) == 0 {
		t.Fatal("the contract has no records or no $defs")
	}
}

// TestEveryRefResolves catches the failure that leaves a contract structurally
// intact and unusable: a $ref pointing at a $def that was renamed away.
func TestEveryRefResolves(t *testing.T) {
	c := load(t)

	var raw map[string]any
	body, err := os.ReadFile(ContractFile)
	if err != nil {
		t.Fatalf("read %s: %v", ContractFile, err)
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		t.Fatalf("parse %s: %v", ContractFile, err)
	}

	var refs []string
	var walk func(node any)
	walk = func(node any) {
		switch v := node.(type) {
		case map[string]any:
			for key, value := range v {
				if key == "$ref" {
					if s, ok := value.(string); ok {
						refs = append(refs, s)
					}
					continue
				}
				walk(value)
			}
		case []any:
			for _, item := range v {
				walk(item)
			}
		}
	}
	walk(raw["records"])
	walk(raw["$defs"])

	if len(refs) == 0 {
		t.Fatal("the contract uses no $ref at all — have the $defs been inlined away?")
	}
	for _, ref := range refs {
		name := strings.TrimPrefix(ref, "#/$defs/")
		if name == ref {
			t.Errorf("$ref %q is not a local #/$defs/<name> reference", ref)
			continue
		}
		if _, ok := c.Defs[name]; !ok {
			t.Errorf("$ref %q points at a $def that does not exist", ref)
		}
	}
}

// TestGoldenExamplesValidate is one half of the acceptance criterion. Every
// record must carry at least one golden document, because a schema no document
// has ever been checked against is a schema nobody has read carefully.
func TestGoldenExamplesValidate(t *testing.T) {
	c := load(t)
	records, defs := parsed(t, c)

	if len(c.Examples.Golden) == 0 {
		t.Fatal("the contract ships no golden examples")
	}

	covered := map[string]bool{}
	for _, example := range c.Examples.Golden {
		schema, ok := records[example.Record]
		if !ok {
			t.Errorf("golden %q names unknown record %q", example.Name, example.Record)
			continue
		}
		if example.Source == "" {
			t.Errorf("golden %q does not say where it comes from", example.Name)
		}
		if errs := tkcontract.Validate(schema, defs, decode(t, example.Document)); len(errs) > 0 {
			t.Errorf("golden %q (%s) does not validate:\n  %s",
				example.Name, example.Record, strings.Join(errs, "\n  "))
		}
		covered[example.Record] = true
	}

	names := make([]string, 0, len(records))
	for name := range records {
		names = append(names, name)
	}
	sort.Strings(names)
	for _, name := range names {
		if !covered[name] {
			t.Errorf("record %q has no golden example", name)
		}
	}
}

// TestNegativeExamplesFail is the other half, and the more important one: a
// validator nobody has watched refuse anything is not known to refuse
// anything.
func TestNegativeExamplesFail(t *testing.T) {
	c := load(t)
	records, defs := parsed(t, c)

	if len(c.Examples.Negative) == 0 {
		t.Fatal("the contract ships no negative examples")
	}

	for _, example := range c.Examples.Negative {
		schema, ok := records[example.Record]
		if !ok {
			t.Errorf("negative %q names unknown record %q", example.Name, example.Record)
			continue
		}
		if example.Why == "" {
			t.Errorf("negative %q does not say what it is testing", example.Name)
		}
		errs := tkcontract.Validate(schema, defs, decode(t, example.Document))
		if len(errs) == 0 {
			t.Errorf("negative %q (%s) VALIDATED — the schema does not refuse it", example.Name, example.Record)
			continue
		}
		if example.ExpectErrorContains == "" {
			t.Errorf("negative %q does not pin the refusal it expects", example.Name)
			continue
		}
		joined := strings.Join(errs, "\n")
		if !strings.Contains(joined, example.ExpectErrorContains) {
			t.Errorf("negative %q: no error contains %q; got:\n  %s",
				example.Name, example.ExpectErrorContains, strings.Join(errs, "\n  "))
		}
	}
}

// TestJobSpecCarriesTheCredentialGrant is the tick's own acceptance criterion:
// credentials are part of the protocol, not an adapter detail (SPEC §4.3), so
// they are required on JobSpec and they name both halves of the grant.
func TestJobSpecCarriesTheCredentialGrant(t *testing.T) {
	c := load(t)
	records, defs := parsed(t, c)

	spec := resolve(t, records["job_spec"], defs)
	if spec == nil {
		t.Fatal("no job_spec record")
	}
	if !contains(spec.Required, "credentials") {
		t.Fatalf("job_spec does not require credentials; required = %v", spec.Required)
	}

	creds := resolve(t, spec.Properties["credentials"], defs)
	if !contains(creds.Required, "model") || !contains(creds.Required, "source") {
		t.Fatalf("credentials must require both model and source; required = %v", creds.Required)
	}

	// The source grade is a closed vocabulary, and `write` is not a synonym
	// for "whatever the operator's own token can do": SPEC §4.3 says the host
	// issues source access AT A DECLARED GRADE.
	grade := mustDef(t, defs, "source_grade")
	if got := enumStrings(grade); !equalStrings(got, []string{"read-only", "write"}) {
		t.Errorf("source_grade enum = %v, want [read-only write]", got)
	}
}

// TestCostSemanticsMatchCredentialOwnership is the cross-contract half. The
// metered/flat-rate split already exists in credential-ownership.json; if this
// file spelled it differently the two would describe different systems and
// nothing would notice.
func TestCostSemanticsMatchCredentialOwnership(t *testing.T) {
	c := load(t)
	_, defs := parsed(t, c)

	var owner struct {
		Lifecycle struct {
			Stop struct {
				RevokeBeforeStop             bool `json:"revoke_before_stop"`
				RefuseIssueBeforeEveryBoot   bool `json:"refuse_issue_before_every_boot"`
				CancelledHandleCannotReissue bool `json:"cancelled_handle_cannot_reissue"`
			} `json:"stop"`
			Cost struct {
				Metered struct {
					BudgetField string `json:"budget_field"`
					Telemetry   string `json:"telemetry"`
				} `json:"metered"`
				FlatRateSeat struct {
					QuotaFailure string `json:"quota_failure"`
				} `json:"flat_rate_seat"`
			} `json:"cost"`
		} `json:"lifecycle"`
	}
	raw, err := os.ReadFile(credentialOwnershipFile)
	if err != nil {
		t.Fatalf("read %s: %v", credentialOwnershipFile, err)
	}
	if err := json.Unmarshal(raw, &owner); err != nil {
		t.Fatalf("parse %s: %v", credentialOwnershipFile, err)
	}

	metered := mustDef(t, defs, "metered_cost")
	if got := enumStrings(metered.Properties["budget_field"]); !equalStrings(got, []string{owner.Lifecycle.Cost.Metered.BudgetField}) {
		t.Errorf("metered_cost.budget_field = %v, want [%s] from credential-ownership.json",
			got, owner.Lifecycle.Cost.Metered.BudgetField)
	}
	if got := enumStrings(metered.Properties["telemetry"]); !equalStrings(got, []string{owner.Lifecycle.Cost.Metered.Telemetry}) {
		t.Errorf("metered_cost.telemetry = %v, want [%s] from credential-ownership.json",
			got, owner.Lifecycle.Cost.Metered.Telemetry)
	}

	// "A flat-rate credential has no per-request cost to bound AND SAYS SO"
	// (SPEC §4.3). Saying so is what makes it checkable: budget_field is
	// required and typed null, so a flat-rate grant that quietly carries a
	// budget is refused rather than half-enforced.
	flat := mustDef(t, defs, "flat_rate_cost")
	if !contains(flat.Required, "budget_field") {
		t.Error("flat_rate_cost must REQUIRE budget_field so the absence of a budget is stated, not implied")
	}
	if got := typeNames(flat.Properties["budget_field"]); !equalStrings(got, []string{"null"}) {
		t.Errorf("flat_rate_cost.budget_field type = %v, want [null]", got)
	}
	if got := enumStrings(flat.Properties["quota_failure"]); !equalStrings(got, []string{owner.Lifecycle.Cost.FlatRateSeat.QuotaFailure}) {
		t.Errorf("flat_rate_cost.quota_failure = %v, want [%s] from credential-ownership.json",
			got, owner.Lifecycle.Cost.FlatRateSeat.QuotaFailure)
	}

	// Quota exhaustion is its own failure class and is never reported as a
	// broken route (SPEC §4.3), so the JobResult vocabulary has to have a slot
	// for it.
	classes := enumStrings(mustDef(t, defs, "failure_class"))
	if !contains(classes, owner.Lifecycle.Cost.FlatRateSeat.QuotaFailure) {
		t.Errorf("failure_class %v does not include %q", classes, owner.Lifecycle.Cost.FlatRateSeat.QuotaFailure)
	}

	// And the stop rules, which are the same three booleans on both sides.
	rev := c.Credentials.Revocation
	if rev.RevokeBeforeStop != owner.Lifecycle.Stop.RevokeBeforeStop ||
		rev.RefuseIssueBeforeEveryBoot != owner.Lifecycle.Stop.RefuseIssueBeforeEveryBoot ||
		rev.CancelledHandleCannotReissue != owner.Lifecycle.Stop.CancelledHandleCannotReissue {
		t.Errorf("credentials.revocation disagrees with credential-ownership.json lifecycle.stop: %+v vs %+v",
			rev, owner.Lifecycle.Stop)
	}
}

// TestCancelAckEncodesRevocation turns the SPEC's MUST into something a
// document can fail. `cancel` MUST revoke credentials BEFORE requesting a
// stop, and a cancelled handle can never obtain a fresh one — so an
// acknowledgement that admits either is not a valid acknowledgement.
func TestCancelAckEncodesRevocation(t *testing.T) {
	c := load(t)
	records, defs := parsed(t, c)

	ack := resolve(t, records["cancel_ack"], defs)
	if ack == nil {
		t.Fatal("no cancel_ack record")
	}
	for _, field := range []string{"credentials_revoked", "reissue", "order"} {
		if !contains(ack.Required, field) {
			t.Errorf("cancel_ack must require %q; required = %v", field, ack.Required)
		}
	}
	if got := enumValues(ack.Properties["credentials_revoked"]); len(got) != 1 || got[0] != true {
		t.Errorf("cancel_ack.credentials_revoked enum = %v, want [true] — an ack that admits it did not revoke is not an ack", got)
	}
	if got := enumStrings(resolve(t, ack.Properties["reissue"], defs)); !equalStrings(got, []string{"refused"}) {
		t.Errorf("cancel_ack.reissue enum = %v, want [refused]", got)
	}
	if got := enumStrings(ack.Properties["order"]); !equalStrings(got, []string{"revoke-then-stop"}) {
		t.Errorf("cancel_ack.order enum = %v, want [revoke-then-stop]", got)
	}
}

// TestRoleResultStatusMatchesCollectVocabulary keeps the role-result envelope
// on the ONE status vocabulary this repository already has. A fifth spelling
// would make a cloud run and a herd run disagree about what happened to the
// same tick with nothing failing — the exact bug collect-vocabulary.json was
// written to stop.
func TestRoleResultStatusMatchesCollectVocabulary(t *testing.T) {
	c := load(t)
	records, defs := parsed(t, c)

	var vocab struct {
		Statuses map[string]any `json:"statuses"`
	}
	raw, err := os.ReadFile(collectVocabularyFile)
	if err != nil {
		t.Fatalf("read %s: %v", collectVocabularyFile, err)
	}
	if err := json.Unmarshal(raw, &vocab); err != nil {
		t.Fatalf("parse %s: %v", collectVocabularyFile, err)
	}

	want := make([]string, 0, len(vocab.Statuses))
	for key, value := range vocab.Statuses {
		if key == "why" {
			continue
		}
		s, ok := value.(string)
		if !ok {
			t.Fatalf("collect-vocabulary statuses.%s is not a string", key)
		}
		want = append(want, s)
	}
	sort.Strings(want)

	role := resolve(t, records["role_result"], defs)
	if role == nil {
		t.Fatal("no role_result record")
	}
	got := enumStrings(resolve(t, role.Properties["status"], defs))
	sort.Strings(got)
	if !equalStrings(got, want) {
		t.Errorf("role_result.status enum = %v, want the collect vocabulary %v", got, want)
	}
}

// TestEvidenceCarriesTheMinimalRecord walks the field list SPEC §10.1 calls
// the minimum. Every one of them is REQUIRED, including the ones that are
// often empty: an evidence record that omits `integration_ref` and one that
// records it as null are different claims, and only the second is evidence.
func TestEvidenceCarriesTheMinimalRecord(t *testing.T) {
	c := load(t)
	records, defs := parsed(t, c)

	evidence := resolve(t, records["evidence"], defs)
	if evidence == nil {
		t.Fatal("no evidence record")
	}
	minimal := []string{
		"schema_version",
		"run_id", "tick_id", "attempt",
		"source_ref", "source_sha", "integration_ref",
		"phase", "executor", "workspace_id", "backend",
		"role", "profile_digest", "model", "context_manifest_digest",
		"check",
		"started_at", "finished_at", "exit_code",
		"output",
		"result", "acceptance",
		"content_digest", "persistence_uri",
	}
	for _, field := range minimal {
		if !contains(evidence.Required, field) {
			t.Errorf("evidence must require %q (SPEC §10.1 minimal record); required = %v", field, evidence.Required)
		}
	}

	// Terminal output is diagnostic material, not a completion contract
	// (SPEC §10.1). That rule survives only if the file states it.
	rules := c.Rules.CompletionContract
	if len(rules.DrivesCollection) == 0 || len(rules.NeverDrivesCollection) == 0 || rules.Why == "" {
		t.Error("rules.completion_contract must say what drives collection and what does not")
	}
	if !contains(rules.NeverDrivesCollection, "terminal output") {
		t.Errorf("rules.completion_contract.never_drives_collection = %v, want it to name terminal output",
			rules.NeverDrivesCollection)
	}
	if len(c.Rules.Disposal.AllowedOnlyAfter) == 0 || c.Rules.Disposal.Why == "" {
		t.Error("rules.disposal must state when a workspace may be disposed (SPEC §10.3)")
	}
}

// TestTheSpecIllustrationIsAGoldenExample is the join between the design
// document and the bundle. The JobSpec printed in SPEC §4.3 is what a reader
// will copy; if it stops validating, either the schema or the SPEC is wrong
// and somebody has to say which.
func TestTheSpecIllustrationIsAGoldenExample(t *testing.T) {
	c := load(t)
	records, defs := parsed(t, c)

	var found bool
	for _, example := range c.Examples.Golden {
		// The verbatim illustration specifically — the other §4.3 examples
		// elaborate the credential grant and are not what a reader copies.
		if example.Record != "job_spec" || !strings.HasPrefix(example.Source, illustrationSource) {
			continue
		}
		found = true
		document := decode(t, example.Document)
		if errs := tkcontract.Validate(records["job_spec"], defs, document); len(errs) > 0 {
			t.Fatalf("the SPEC §4.3 illustration does not validate:\n  %s", strings.Join(errs, "\n  "))
		}
		// And it is the illustration, not a lookalike: the credential
		// shorthand the SPEC prints is exactly these two values.
		fields, _ := document.(map[string]any)
		creds, _ := fields["credentials"].(map[string]any)
		if creds["model"] != "issued-by-host" || creds["source"] != "read-only" {
			t.Errorf("credentials = %v, want the SPEC's {model: issued-by-host, source: read-only}", creds)
		}
	}
	if !found {
		t.Error("no golden example is sourced from SPEC §4.3 — the illustration is unchecked")
	}
}

// --- small helpers over the parsed schema ------------------------------------

func resolve(t *testing.T, s *tkcontract.Schema, defs map[string]*tkcontract.Schema) *tkcontract.Schema {
	t.Helper()
	if s == nil {
		t.Fatal("expected a schema, got none")
	}
	if s.Ref == "" {
		return s
	}
	name := strings.TrimPrefix(s.Ref, "#/$defs/")
	target, ok := defs[name]
	if !ok {
		t.Fatalf("unresolvable $ref %q", s.Ref)
	}
	return target
}

func mustDef(t *testing.T, defs map[string]*tkcontract.Schema, name string) *tkcontract.Schema {
	t.Helper()
	def, ok := defs[name]
	if !ok {
		t.Fatalf("$defs.%s is missing", name)
	}
	return def
}

func enumValues(s *tkcontract.Schema) []any {
	if s == nil {
		return nil
	}
	return s.Enum
}

func enumStrings(s *tkcontract.Schema) []string {
	out := make([]string, 0, len(enumValues(s)))
	for _, value := range enumValues(s) {
		out = append(out, fmt.Sprint(value))
	}
	return out
}

func typeNames(s *tkcontract.Schema) []string {
	if s == nil {
		return nil
	}
	return []string(s.Type)
}

func contains(haystack []string, needle string) bool {
	for _, item := range haystack {
		if item == needle {
			return true
		}
	}
	return false
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
