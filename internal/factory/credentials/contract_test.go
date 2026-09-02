package credentials

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strings"
	"testing"
	"time"
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
	Schema struct {
		Type                 string                              `json:"type"`
		Required             []string                            `json:"required"`
		AdditionalProperties bool                                `json:"additionalProperties"`
		Properties           map[string]credentialSchemaProperty `json:"properties"`
	} `json:"schema"`
	ValidExample map[string]string `json:"valid_example"`
	Lifecycle    struct {
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

type credentialSchemaProperty struct {
	Type      string   `json:"type"`
	Format    string   `json:"format"`
	Pattern   string   `json:"pattern"`
	MinLength int      `json:"minLength"`
	Enum      []string `json:"enum"`
	OneOf     []struct {
		Type   string `json:"type"`
		Format string `json:"format"`
		Const  string `json:"const"`
	} `json:"oneOf"`
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
	if contract.Schema.Type != "object" || contract.Schema.AdditionalProperties {
		t.Errorf("logical schema = type %q, additional_properties %v; want object/false", contract.Schema.Type, contract.Schema.AdditionalProperties)
	}
	if len(contract.Schema.Required) != 0 {
		t.Errorf("required = %v, want no required keys because setup is incremental", contract.Schema.Required)
	}

	wantKeys := sortedStrings(currentCredentialKeys())
	gotSchemaKeys := make([]string, 0, len(contract.Schema.Properties))
	for key := range contract.Schema.Properties {
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

	for _, key := range wantKeys {
		property := contract.Schema.Properties[key]
		if property.Type != "string" && len(property.OneOf) == 0 {
			t.Errorf("schema property %q type = %q, want string", key, property.Type)
		}
		value, ok := contract.ValidExample[key]
		if !ok {
			t.Errorf("valid_example is missing %q", key)
			continue
		}
		validateCredentialExampleValue(t, key, value, property, keyMetadata[key].secret)
	}
	for key := range contract.ValidExample {
		if _, ok := contract.Schema.Properties[key]; !ok {
			t.Errorf("valid_example contains undeclared key %q", key)
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

func validateCredentialExampleValue(t *testing.T, key, value string, property credentialSchemaProperty, secret bool) {
	t.Helper()
	if property.MinLength > 0 && len(value) < property.MinLength {
		t.Errorf("valid_example[%q] has length %d, want at least %d", key, len(value), property.MinLength)
	}
	if len(property.Enum) > 0 {
		found := false
		for _, allowed := range property.Enum {
			if value == allowed {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("valid_example[%q] = %q is outside enum %v", key, value, property.Enum)
		}
	}
	if property.Pattern != "" {
		matched, err := regexp.MatchString(property.Pattern, value)
		if err != nil {
			t.Fatalf("schema pattern for %q is invalid: %v", key, err)
		}
		if !matched {
			t.Errorf("valid_example[%q] = %q does not match %q", key, value, property.Pattern)
		}
	}
	switch property.Format {
	case "uri":
		parsed, err := url.ParseRequestURI(value)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			t.Errorf("valid_example[%q] = %q is not a URI", key, value)
		}
	case "date-time":
		if _, err := time.Parse(time.RFC3339, value); err != nil {
			t.Errorf("valid_example[%q] = %q is not RFC3339: %v", key, value, err)
		}
	}
	if len(property.OneOf) > 0 {
		matched := false
		for _, alternative := range property.OneOf {
			if alternative.Const == value {
				matched = true
				break
			}
			if alternative.Format == "date-time" && value != "" {
				if _, err := time.Parse(time.RFC3339, value); err == nil {
					matched = true
					break
				}
			}
		}
		if !matched {
			t.Errorf("valid_example[%q] = %q matches none of the declared oneOf alternatives", key, value)
		}
	}
	if secret {
		if !strings.HasPrefix(value, "<redacted-") || !strings.HasSuffix(value, ">") {
			t.Errorf("valid_example[%q] contains a non-redacted secret placeholder %q", key, value)
		}
	}
}
