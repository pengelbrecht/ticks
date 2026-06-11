package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestPolicyConfig_Defaults(t *testing.T) {
	var p *PolicyConfig // nil policy

	if p.GetMaxAttempts() != DefaultMaxAttempts {
		t.Errorf("GetMaxAttempts() = %d, want %d", p.GetMaxAttempts(), DefaultMaxAttempts)
	}
	if p.GetMaxNoProgressAttempts() != DefaultMaxNoProgressAttempts {
		t.Errorf("GetMaxNoProgressAttempts() = %d, want %d", p.GetMaxNoProgressAttempts(), DefaultMaxNoProgressAttempts)
	}
	if p.GetMaxSameVerifierFailures() != DefaultMaxSameVerifierFailures {
		t.Errorf("GetMaxSameVerifierFailures() = %d, want %d", p.GetMaxSameVerifierFailures(), DefaultMaxSameVerifierFailures)
	}
	if p.GetRequireCommit() != DefaultRequireCommit {
		t.Errorf("GetRequireCommit() = %v, want %v", p.GetRequireCommit(), DefaultRequireCommit)
	}
	if p.GetRequireVerifiersForPriority() != DefaultRequireVerifiersForPrio {
		t.Errorf("GetRequireVerifiersForPriority() = %d, want %d", p.GetRequireVerifiersForPriority(), DefaultRequireVerifiersForPrio)
	}
	if p.GetSandbox() != DefaultSandbox {
		t.Errorf("GetSandbox() = %v, want %v", p.GetSandbox(), DefaultSandbox)
	}
	if p.GetSecretsExposure() != SecretsExposureNone {
		t.Errorf("GetSecretsExposure() = %q, want %q", p.GetSecretsExposure(), SecretsExposureNone)
	}
}

func TestPolicyConfig_EmptyStruct(t *testing.T) {
	p := &PolicyConfig{} // non-nil but all fields nil

	if p.GetMaxAttempts() != DefaultMaxAttempts {
		t.Errorf("GetMaxAttempts() = %d, want %d", p.GetMaxAttempts(), DefaultMaxAttempts)
	}
	if p.GetSecretsExposure() != SecretsExposureNone {
		t.Errorf("GetSecretsExposure() = %q, want %q", p.GetSecretsExposure(), SecretsExposureNone)
	}
}

func TestPolicyConfig_CustomValues(t *testing.T) {
	maxAttempts := 5
	maxNoProg := 3
	maxVerifier := 4
	requireCommit := true
	requireVerifiers := 2
	sandbox := true
	secrets := SecretsExposureEnv

	p := &PolicyConfig{
		MaxAttempts:                 &maxAttempts,
		MaxNoProgressAttempts:       &maxNoProg,
		MaxSameVerifierFailures:     &maxVerifier,
		RequireCommit:               &requireCommit,
		RequireVerifiersForPriority: &requireVerifiers,
		Sandbox:                     &sandbox,
		SecretsExposure:             &secrets,
	}

	if p.GetMaxAttempts() != 5 {
		t.Errorf("GetMaxAttempts() = %d, want 5", p.GetMaxAttempts())
	}
	if p.GetMaxNoProgressAttempts() != 3 {
		t.Errorf("GetMaxNoProgressAttempts() = %d, want 3", p.GetMaxNoProgressAttempts())
	}
	if p.GetMaxSameVerifierFailures() != 4 {
		t.Errorf("GetMaxSameVerifierFailures() = %d, want 4", p.GetMaxSameVerifierFailures())
	}
	if !p.GetRequireCommit() {
		t.Error("GetRequireCommit() = false, want true")
	}
	if p.GetRequireVerifiersForPriority() != 2 {
		t.Errorf("GetRequireVerifiersForPriority() = %d, want 2", p.GetRequireVerifiersForPriority())
	}
	if !p.GetSandbox() {
		t.Error("GetSandbox() = false, want true")
	}
	if p.GetSecretsExposure() != SecretsExposureEnv {
		t.Errorf("GetSecretsExposure() = %q, want %q", p.GetSecretsExposure(), SecretsExposureEnv)
	}
}

func TestPolicyConfig_Validate(t *testing.T) {
	tests := []struct {
		name    string
		policy  *PolicyConfig
		wantErr bool
	}{
		{"nil policy", nil, false},
		{"empty policy", &PolicyConfig{}, false},
		{"valid max_attempts", policyWith(func(p *PolicyConfig) { v := 5; p.MaxAttempts = &v }), false},
		{"max_attempts too low", policyWith(func(p *PolicyConfig) { v := 0; p.MaxAttempts = &v }), true},
		{"max_attempts too high", policyWith(func(p *PolicyConfig) { v := 101; p.MaxAttempts = &v }), true},
		{"valid max_no_progress", policyWith(func(p *PolicyConfig) { v := 3; p.MaxNoProgressAttempts = &v }), false},
		{"max_no_progress too low", policyWith(func(p *PolicyConfig) { v := 0; p.MaxNoProgressAttempts = &v }), true},
		{"max_no_progress too high", policyWith(func(p *PolicyConfig) { v := 51; p.MaxNoProgressAttempts = &v }), true},
		{"valid max_verifier_failures", policyWith(func(p *PolicyConfig) { v := 3; p.MaxSameVerifierFailures = &v }), false},
		{"max_verifier_failures too low", policyWith(func(p *PolicyConfig) { v := 0; p.MaxSameVerifierFailures = &v }), true},
		{"valid secrets none", policyWith(func(p *PolicyConfig) { v := SecretsExposureNone; p.SecretsExposure = &v }), false},
		{"valid secrets env", policyWith(func(p *PolicyConfig) { v := SecretsExposureEnv; p.SecretsExposure = &v }), false},
		{"valid secrets file", policyWith(func(p *PolicyConfig) { v := SecretsExposureFile; p.SecretsExposure = &v }), false},
		{"invalid secrets", policyWith(func(p *PolicyConfig) { v := SecretsExposure("yolo"); p.SecretsExposure = &v }), true},
		{"valid require_verifiers 0", policyWith(func(p *PolicyConfig) { v := 0; p.RequireVerifiersForPriority = &v }), false},
		{"valid require_verifiers 2", policyWith(func(p *PolicyConfig) { v := 2; p.RequireVerifiersForPriority = &v }), false},
		{"require_verifiers negative", policyWith(func(p *PolicyConfig) { v := -1; p.RequireVerifiersForPriority = &v }), true},
		{"require_verifiers too high", policyWith(func(p *PolicyConfig) { v := 6; p.RequireVerifiersForPriority = &v }), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.policy.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestPolicyConfig_ValidateThroughConfig(t *testing.T) {
	// Policy validation is also called through Config.Validate
	v := 0
	cfg := Config{
		Version:  DefaultVersion,
		IDLength: DefaultIDLength,
		Policy: &PolicyConfig{
			MaxAttempts: &v,
		},
	}
	err := cfg.Validate()
	if err == nil {
		t.Error("Config.Validate() should fail with invalid policy")
	}
}

func TestPolicyConfig_SecretsExposureDefaultsToNone(t *testing.T) {
	// This is a critical security test: secrets exposure must default to "none"
	var nilPolicy *PolicyConfig
	if nilPolicy.GetSecretsExposure() != SecretsExposureNone {
		t.Fatalf("nil PolicyConfig secrets exposure = %q, MUST be %q", nilPolicy.GetSecretsExposure(), SecretsExposureNone)
	}

	emptyPolicy := &PolicyConfig{}
	if emptyPolicy.GetSecretsExposure() != SecretsExposureNone {
		t.Fatalf("empty PolicyConfig secrets exposure = %q, MUST be %q", emptyPolicy.GetSecretsExposure(), SecretsExposureNone)
	}
}

func TestPolicyConfig_RoundTrip(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	maxAttempts := 5
	secrets := SecretsExposureEnv
	requireCommit := true

	cfg := Config{
		Version:  DefaultVersion,
		IDLength: DefaultIDLength,
		Policy: &PolicyConfig{
			MaxAttempts:     &maxAttempts,
			SecretsExposure: &secrets,
			RequireCommit:   &requireCommit,
		},
	}

	if err := Save(path, cfg); err != nil {
		t.Fatalf("Save: %v", err)
	}

	loaded, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	if loaded.Policy == nil {
		t.Fatal("Policy should not be nil after round-trip")
	}
	if loaded.Policy.GetMaxAttempts() != 5 {
		t.Errorf("MaxAttempts = %d, want 5", loaded.Policy.GetMaxAttempts())
	}
	if loaded.Policy.GetSecretsExposure() != SecretsExposureEnv {
		t.Errorf("SecretsExposure = %q, want %q", loaded.Policy.GetSecretsExposure(), SecretsExposureEnv)
	}
	if !loaded.Policy.GetRequireCommit() {
		t.Error("RequireCommit = false, want true")
	}
	// Non-set fields should return defaults
	if loaded.Policy.GetMaxNoProgressAttempts() != DefaultMaxNoProgressAttempts {
		t.Errorf("MaxNoProgressAttempts = %d, want default %d", loaded.Policy.GetMaxNoProgressAttempts(), DefaultMaxNoProgressAttempts)
	}
}

func TestPolicyConfig_JSONParsing(t *testing.T) {
	raw := `{
		"version": 1,
		"id_length": 3,
		"policy": {
			"max_attempts": 10,
			"max_no_progress_attempts": 4,
			"max_same_verifier_failures": 3,
			"require_commit": true,
			"require_verifiers_for_priority": 2,
			"sandbox": true,
			"secrets_exposure": "file"
		}
	}`

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	if err := os.WriteFile(path, []byte(raw), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	p := cfg.Policy
	if p == nil {
		t.Fatal("Policy should not be nil")
	}
	if p.GetMaxAttempts() != 10 {
		t.Errorf("MaxAttempts = %d, want 10", p.GetMaxAttempts())
	}
	if p.GetMaxNoProgressAttempts() != 4 {
		t.Errorf("MaxNoProgressAttempts = %d, want 4", p.GetMaxNoProgressAttempts())
	}
	if p.GetMaxSameVerifierFailures() != 3 {
		t.Errorf("MaxSameVerifierFailures = %d, want 3", p.GetMaxSameVerifierFailures())
	}
	if !p.GetRequireCommit() {
		t.Error("RequireCommit should be true")
	}
	if p.GetRequireVerifiersForPriority() != 2 {
		t.Errorf("RequireVerifiersForPriority = %d, want 2", p.GetRequireVerifiersForPriority())
	}
	if !p.GetSandbox() {
		t.Error("Sandbox should be true")
	}
	if p.GetSecretsExposure() != SecretsExposureFile {
		t.Errorf("SecretsExposure = %q, want %q", p.GetSecretsExposure(), SecretsExposureFile)
	}
}

func TestPolicyConfig_OmittedFromJSON(t *testing.T) {
	// Config without policy should not include "policy" key in JSON
	cfg := Config{
		Version:  DefaultVersion,
		IDLength: DefaultIDLength,
	}
	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if _, ok := raw["policy"]; ok {
		t.Error("policy key should be omitted when nil")
	}
}

// Helper to create a PolicyConfig with one mutation
func policyWith(fn func(p *PolicyConfig)) *PolicyConfig {
	p := &PolicyConfig{}
	fn(p)
	return p
}
