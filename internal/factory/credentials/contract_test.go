package credentials

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tkcontract"
)

const credentialOwnershipContractFile = "../../../contracts/credential-ownership.json"

type credentialContract struct {
	SchemaVersion int    `json:"schema_version"`
	Contract      string `json:"contract"`
	File          struct {
		Path         string `json:"path"`
		Mode         string `json:"mode"`
		Format       string `json:"format"`
		Encoding     string `json:"encoding"`
		UnknownLines string `json:"unknown_lines"`
		AtomicWrites string `json:"atomic_writes"`
	} `json:"file"`
	Ownership []struct {
		CredentialType string   `json:"credential_type"`
		Owner          string   `json:"owner"`
		FileKeys       []string `json:"file_keys"`
	} `json:"ownership"`
	Ticks struct {
		ExecutionCredentials []string `json:"execution_credentials"`
		BoardSyncFile        string   `json:"board_sync_file"`
		Git                  string   `json:"git"`
	} `json:"ticks"`
	Keys []struct {
		Name           string   `json:"name"`
		CredentialType string   `json:"credential_type"`
		Secret         bool     `json:"secret"`
		StoredIn       []string `json:"stored_in"`
	} `json:"keys"`
	// Schema is kept RAW on purpose. Until bundle 3.0.0 it was decoded into a
	// hand-rolled struct that ignored every keyword it did not carry, which
	// meant the file could declare a constraint no validator enforced. It is
	// now written in the strict subset and parsed by the one validator this
	// repository has, so a keyword outside that subset fails to parse rather
	// than reading as if it constrained something.
	Schema       json.RawMessage   `json:"schema"`
	ValidExample map[string]string `json:"valid_example"`
	Invalid      []struct {
		Name                string         `json:"name"`
		Why                 string         `json:"why"`
		ExpectErrorContains string         `json:"expect_error_contains"`
		Document            map[string]any `json:"document"`
	} `json:"invalid"`
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
				NoCostBudget          bool   `json:"no_cost_budget"`
				WallClockStillApplies bool   `json:"wall_clock_still_applies"`
				QuotaFailure          string `json:"quota_failure"`
			} `json:"flat_rate_seat"`
		} `json:"cost"`
		Security struct {
			NeverPrintTokens bool `json:"never_print_tokens"`
			ReadOnlyGrade    struct {
				OperatorGitHubTokenNeverIssued bool   `json:"operator_github_token_never_issued"`
				Credential                     string `json:"credential"`
				GitWrite                       string `json:"git_write"`
			} `json:"read_only_grade"`
		} `json:"security"`
	} `json:"lifecycle"`
	Migration struct {
		Source      string   `json:"source"`
		Destination string   `json:"destination"`
		Match       string   `json:"match"`
		Steps       []string `json:"steps"`
		CrashSafety string   `json:"crash_safety"`
		Retention   string   `json:"retention"`
	} `json:"migration"`
}

func readCredentialContract(t *testing.T) credentialContract {
	t.Helper()
	data, err := os.ReadFile(credentialOwnershipContractFile)
	if err != nil {
		t.Fatalf("read %s: %v", credentialOwnershipContractFile, err)
	}
	var contract credentialContract
	if err := json.Unmarshal(data, &contract); err != nil {
		t.Fatalf("parse %s: %v", credentialOwnershipContractFile, err)
	}
	return contract
}

func currentCredentialKeys() []string {
	return []string{
		KeyURL, KeyToken, KeyVersion,
		KeyGitHubToken, KeyGitHubLogin, KeyGitHubRepo, KeyGitHubAuth,
		KeyGitHubTokenExpires, KeyGitHubRefreshToken, KeyGitHubRefreshExpires,
		KeyGatewayURL, KeyGatewayProvider, KeyGatewayKey,
		KeyCloudflareAPIToken, KeyWorkersAIBillingMode,
	}
}

func sortedStrings(values []string) []string {
	copy := append([]string(nil), values...)
	sort.Strings(copy)
	return copy
}

func TestCredentialOwnershipContractHasAValidatingExample(t *testing.T) {
	contract := readCredentialContract(t)

	if contract.SchemaVersion != 1 {
		t.Fatalf("schema_version = %d, want 1", contract.SchemaVersion)
	}
	if contract.Contract != "ticfac.credentials" {
		t.Fatalf("contract = %q, want ticfac.credentials", contract.Contract)
	}
	if contract.File.Path != "~/.ticfacrc" || contract.File.Mode != "0600" {
		t.Fatalf("file = (%q, %q), want (~/.ticfacrc, 0600)", contract.File.Path, contract.File.Mode)
	}
	if contract.File.Format != "line-oriented key=value" {
		t.Errorf("file format = %q, want line-oriented key=value", contract.File.Format)
	}
	if contract.File.Encoding != "UTF-8" {
		t.Errorf("file encoding = %q, want UTF-8", contract.File.Encoding)
	}
	if contract.File.UnknownLines != "preserved" || contract.File.AtomicWrites != "temp+rename" {
		t.Errorf("file safety = unknown lines %q, writes %q; want preserved/temp+rename", contract.File.UnknownLines, contract.File.AtomicWrites)
	}
	schema := parseCredentialSchema(t, contract)
	if len(schema.Type) != 1 || schema.Type[0] != "object" {
		t.Errorf("logical schema type = %v, want object", schema.Type)
	}
	if schema.AdditionalProperties == nil || *schema.AdditionalProperties {
		t.Error("logical schema must be closed (additionalProperties: false): an unknown factory_ key is a typo, and a typo that persists is a credential the operator believes they set")
	}
	if len(schema.Required) != 0 {
		t.Errorf("required = %v, want no required keys because setup is incremental", schema.Required)
	}

	wantKeys := sortedStrings(currentCredentialKeys())
	gotSchemaKeys := make([]string, 0, len(schema.Properties))
	for key := range schema.Properties {
		gotSchemaKeys = append(gotSchemaKeys, key)
	}
	if got := sortedStrings(gotSchemaKeys); fmt.Sprint(got) != fmt.Sprint(wantKeys) {
		t.Fatalf("schema keys = %v, want exactly current factory keys %v", got, wantKeys)
	}

	keyMetadata := make(map[string]struct {
		credentialType string
		secret         bool
		storedIn       []string
	}, len(contract.Keys))
	for _, key := range contract.Keys {
		if key.Name == "" {
			t.Error("a key declaration has no name")
		}
		if keyMetadata[key.Name].credentialType != "" {
			t.Errorf("duplicate key declaration for %q", key.Name)
		}
		if key.CredentialType == "" || len(key.StoredIn) == 0 {
			t.Errorf("key %q has incomplete ownership metadata: type=%q stored_in=%v", key.Name, key.CredentialType, key.StoredIn)
		}
		keyMetadata[key.Name] = struct {
			credentialType string
			secret         bool
			storedIn       []string
		}{key.CredentialType, key.Secret, key.StoredIn}
	}
	gotMetadataKeys := make([]string, 0, len(keyMetadata))
	for key := range keyMetadata {
		gotMetadataKeys = append(gotMetadataKeys, key)
	}
	if got := sortedStrings(gotMetadataKeys); fmt.Sprint(got) != fmt.Sprint(wantKeys) {
		t.Fatalf("metadata keys = %v, want exactly current factory keys %v", got, wantKeys)
	}

	// The example is validated by the VALIDATOR, not by a reader that walks
	// the schema's keywords by hand and skips the ones it does not carry.
	// `~/.ticfacrc` is line-oriented text, so every value is a string; the
	// closed shape and the enums are what the subset can enforce, and the rest
	// of what a value must look like is a `description`, which is honest about
	// being prose rather than pretending to be a constraint.
	example := make(map[string]any, len(contract.ValidExample))
	for key, value := range contract.ValidExample {
		example[key] = value
	}
	if errs := tkcontract.Validate(schema, nil, example); len(errs) > 0 {
		t.Errorf("valid_example does not validate against the contract's own schema:\n  %s", strings.Join(errs, "\n  "))
	}
	for _, key := range wantKeys {
		if _, ok := contract.ValidExample[key]; !ok {
			t.Errorf("valid_example is missing %q", key)
			continue
		}
		if keyMetadata[key].secret {
			assertRedacted(t, key, contract.ValidExample[key])
		}
	}

	credentialTypes := make(map[string]bool, len(contract.Ownership))
	ownershipKeys := make(map[string]map[string]bool, len(contract.Ownership))
	for _, item := range contract.Ownership {
		if item.CredentialType == "" {
			t.Error("an ownership entry has no credential type")
		}
		if item.Owner != "ticfac" {
			t.Errorf("credential type %q is owned by %q, want ticfac", item.CredentialType, item.Owner)
		}
		if _, duplicate := ownershipKeys[item.CredentialType]; duplicate {
			t.Errorf("duplicate ownership entry for %q", item.CredentialType)
		}
		credentialTypes[item.CredentialType] = true
		ownedKeys := make(map[string]bool, len(item.FileKeys))
		for _, key := range item.FileKeys {
			if ownedKeys[key] {
				t.Errorf("ownership entry %q repeats key %q", item.CredentialType, key)
			}
			ownedKeys[key] = true
		}
		ownershipKeys[item.CredentialType] = ownedKeys
	}
	for _, want := range []string{"model_access", "gateway", "subscription_broker", "github_app_installation", "run_token"} {
		if !credentialTypes[want] {
			t.Errorf("ownership table does not define %q", want)
		}
	}
	for key, metadata := range keyMetadata {
		ownedKeys, ok := ownershipKeys[metadata.credentialType]
		if !ok || !ownedKeys[key] {
			t.Errorf("key %q is not assigned to ownership type %q", key, metadata.credentialType)
		}
	}
	if len(contract.Ticks.ExecutionCredentials) != 0 {
		t.Errorf("ticks execution credentials = %v, want none", contract.Ticks.ExecutionCredentials)
	}
	if contract.Ticks.BoardSyncFile != "~/.ticksrc" || contract.Ticks.Git == "" {
		t.Errorf("ticks boundary = board file %q, git %q", contract.Ticks.BoardSyncFile, contract.Ticks.Git)
	}

	if !contract.Lifecycle.Stop.RevokeBeforeStop ||
		!contract.Lifecycle.Stop.RefuseIssueBeforeEveryBoot ||
		!contract.Lifecycle.Stop.CancelledHandleCannotReissue {
		t.Error("stop contract must revoke before stopping and durably refuse re-issue before every boot")
	}
	if contract.Lifecycle.Cost.Metered.BudgetField != "max_cost_usd" || contract.Lifecycle.Cost.Metered.Telemetry != "gateway" {
		t.Errorf("metered cost contract = %+v", contract.Lifecycle.Cost.Metered)
	}
	if !contract.Lifecycle.Cost.FlatRateSeat.NoCostBudget ||
		!contract.Lifecycle.Cost.FlatRateSeat.WallClockStillApplies ||
		contract.Lifecycle.Cost.FlatRateSeat.QuotaFailure != "quota_exhausted" {
		t.Errorf("flat-rate seat contract = %+v", contract.Lifecycle.Cost.FlatRateSeat)
	}
	if !contract.Lifecycle.Security.NeverPrintTokens ||
		!contract.Lifecycle.Security.ReadOnlyGrade.OperatorGitHubTokenNeverIssued ||
		contract.Lifecycle.Security.ReadOnlyGrade.Credential != "run_token" ||
		contract.Lifecycle.Security.ReadOnlyGrade.GitWrite != "refused" {
		t.Errorf("security contract = %+v", contract.Lifecycle.Security)
	}

	if contract.Migration.Source != "~/.ticksrc" || contract.Migration.Destination != "~/.ticfacrc" || contract.Migration.Match != "factory_*" {
		t.Errorf("migration endpoints = (%q, %q, %q)", contract.Migration.Source, contract.Migration.Destination, contract.Migration.Match)
	}
	if len(contract.Migration.Steps) != 4 {
		t.Errorf("migration steps = %d, want the four merge-and-drain steps", len(contract.Migration.Steps))
	}
	if contract.Migration.CrashSafety == "" || contract.Migration.Retention == "" {
		t.Error("migration must state crash safety and how long the legacy shape remains readable")
	}
}

// parseCredentialSchema reads the contract's `schema` block through the ONE
// strict-subset validator this repository has (its TypeScript twin is
// cloud/factory/test/json-schema.ts, which refuses the same documents with the
// same words). Parsing is itself an assertion: a keyword outside the subset —
// `oneOf`, `const`, `minLength`, `format`, `pattern`, all of which this block
// carried until bundle 3.0.0 — fails here rather than being ignored, so the
// file cannot read as if it constrained something no validator checks.
func parseCredentialSchema(t *testing.T, contract credentialContract) *tkcontract.Schema {
	t.Helper()
	schema, err := tkcontract.ParseSchema(contract.Schema)
	if err != nil {
		t.Fatalf("contracts/credential-ownership.json `schema` is not in the strict subset: %v", err)
	}
	return schema
}

// This file is committed to a PUBLIC repository. A real token in the example is
// not a fixture problem, it is a disclosure.
func assertRedacted(t *testing.T, key, value string) {
	t.Helper()
	if !strings.HasPrefix(value, "<redacted-") || !strings.HasSuffix(value, ">") {
		t.Errorf("valid_example[%q] contains a non-redacted secret placeholder %q", key, value)
	}
}

// TestCredentialSchemaRefusesItsNegativeExamples is the half that matters more:
// a validator nobody has watched refuse anything is not known to refuse
// anything. Until bundle 3.0.0 this contract shipped no negative at all — both
// readers walked `valid_example` and neither had ever seen the schema say no.
//
// Every negative pins the refusal it expects. Without that a case can start
// failing for a completely different reason and stay green, which is a
// validator that has quietly stopped checking the thing the case was written
// about. `cloud/factory/test/json-schema.ts` matches Go's message text
// character for character, so one pin means the same thing to both readers.
func TestCredentialSchemaRefusesItsNegativeExamples(t *testing.T) {
	contract := readCredentialContract(t)
	schema := parseCredentialSchema(t, contract)

	if len(contract.Invalid) == 0 {
		t.Fatal("the contract ships no negative example, so nothing has ever seen its schema refuse a document")
	}

	for i, bad := range contract.Invalid {
		if bad.Name == "" || bad.Why == "" {
			t.Errorf("invalid[%d]: a negative example must name itself and say what it is proving", i)
		}
		errs := tkcontract.Validate(schema, nil, any(bad.Document))
		if len(errs) == 0 {
			t.Errorf("invalid[%d] (%s) VALIDATED — the schema does not refuse it", i, bad.Name)
			continue
		}
		if bad.ExpectErrorContains == "" {
			t.Errorf("invalid[%d] (%s) does not pin the refusal it expects", i, bad.Name)
			continue
		}
		if !strings.Contains(strings.Join(errs, "\n"), bad.ExpectErrorContains) {
			t.Errorf("invalid[%d] (%s): no error contains %q; got:\n  %s",
				i, bad.Name, bad.ExpectErrorContains, strings.Join(errs, "\n  "))
		}
	}
}
