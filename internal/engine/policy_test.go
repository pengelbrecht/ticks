package engine

import (
	"testing"

	"github.com/pengelbrecht/ticks/internal/config"
)

func TestInitPolicyTracking(t *testing.T) {
	state := &runState{}
	initPolicyTracking(state)

	if state.taskAttempts == nil {
		t.Error("taskAttempts should be initialized")
	}
	if state.taskNoProgressCount == nil {
		t.Error("taskNoProgressCount should be initialized")
	}
	if state.taskVerifierFailures == nil {
		t.Error("taskVerifierFailures should be initialized")
	}
	if state.taskLastOutputHash == nil {
		t.Error("taskLastOutputHash should be initialized")
	}
}

func TestOutputHash(t *testing.T) {
	h1 := outputHash("hello world")
	h2 := outputHash("hello world")
	h3 := outputHash("different output")

	if h1 != h2 {
		t.Error("same input should produce same hash")
	}
	if h1 == h3 {
		t.Error("different inputs should produce different hashes")
	}
	if len(h1) == 0 {
		t.Error("hash should not be empty")
	}
}

func TestRecordTaskAttempt_TracksAttempts(t *testing.T) {
	state := &runState{}
	initPolicyTracking(state)

	recordTaskAttempt(state, "task-1", "output 1")
	if state.taskAttempts["task-1"] != 1 {
		t.Errorf("attempts = %d, want 1", state.taskAttempts["task-1"])
	}

	recordTaskAttempt(state, "task-1", "output 2")
	if state.taskAttempts["task-1"] != 2 {
		t.Errorf("attempts = %d, want 2", state.taskAttempts["task-1"])
	}
}

func TestRecordTaskAttempt_DetectsNoProgress(t *testing.T) {
	state := &runState{}
	initPolicyTracking(state)

	// First attempt - no previous output, so no progress tracking
	recordTaskAttempt(state, "task-1", "same output")
	if state.taskNoProgressCount["task-1"] != 0 {
		t.Errorf("no-progress count = %d, want 0 after first attempt", state.taskNoProgressCount["task-1"])
	}

	// Second attempt with same output - no progress
	recordTaskAttempt(state, "task-1", "same output")
	if state.taskNoProgressCount["task-1"] != 1 {
		t.Errorf("no-progress count = %d, want 1 after same output", state.taskNoProgressCount["task-1"])
	}

	// Third attempt with different output - progress made
	recordTaskAttempt(state, "task-1", "different output")
	if state.taskNoProgressCount["task-1"] != 0 {
		t.Errorf("no-progress count = %d, want 0 after progress", state.taskNoProgressCount["task-1"])
	}
}

func TestRecordVerifierFailure(t *testing.T) {
	state := &runState{}
	initPolicyTracking(state)

	recordVerifierFailure(state, "task-1", "npm test")
	if state.taskVerifierFailures["task-1"]["npm test"] != 1 {
		t.Errorf("verifier failures = %d, want 1", state.taskVerifierFailures["task-1"]["npm test"])
	}

	recordVerifierFailure(state, "task-1", "npm test")
	if state.taskVerifierFailures["task-1"]["npm test"] != 2 {
		t.Errorf("verifier failures = %d, want 2", state.taskVerifierFailures["task-1"]["npm test"])
	}

	// Different verifier command
	recordVerifierFailure(state, "task-1", "go test")
	if state.taskVerifierFailures["task-1"]["go test"] != 1 {
		t.Errorf("verifier failures for go test = %d, want 1", state.taskVerifierFailures["task-1"]["go test"])
	}
}

func TestCheckPolicyLimits_MaxAttempts(t *testing.T) {
	state := &runState{}
	initPolicyTracking(state)

	maxAttempts := 3
	policy := &config.PolicyConfig{MaxAttempts: &maxAttempts}

	// Under limit
	state.taskAttempts["task-1"] = 2
	skip, _ := checkPolicyLimits(state, policy, "task-1")
	if skip {
		t.Error("should not skip when under max_attempts")
	}

	// At limit
	state.taskAttempts["task-1"] = 3
	skip, reason := checkPolicyLimits(state, policy, "task-1")
	if !skip {
		t.Error("should skip when at max_attempts")
	}
	if reason == "" {
		t.Error("should provide reason")
	}
}

func TestCheckPolicyLimits_MaxNoProgress(t *testing.T) {
	state := &runState{}
	initPolicyTracking(state)

	maxNoProg := 2
	policy := &config.PolicyConfig{MaxNoProgressAttempts: &maxNoProg}

	// Under limit
	state.taskNoProgressCount["task-1"] = 1
	skip, _ := checkPolicyLimits(state, policy, "task-1")
	if skip {
		t.Error("should not skip when under no-progress limit")
	}

	// At limit
	state.taskNoProgressCount["task-1"] = 2
	skip, reason := checkPolicyLimits(state, policy, "task-1")
	if !skip {
		t.Error("should skip when at no-progress limit")
	}
	if reason == "" {
		t.Error("should provide reason")
	}
}

func TestCheckPolicyLimits_MaxVerifierFailures(t *testing.T) {
	state := &runState{}
	initPolicyTracking(state)

	maxFails := 2
	policy := &config.PolicyConfig{MaxSameVerifierFailures: &maxFails}

	// Record verifier failures
	recordVerifierFailure(state, "task-1", "npm test")

	skip, _ := checkPolicyLimits(state, policy, "task-1")
	if skip {
		t.Error("should not skip when under verifier failure limit")
	}

	recordVerifierFailure(state, "task-1", "npm test")

	skip, reason := checkPolicyLimits(state, policy, "task-1")
	if !skip {
		t.Error("should skip when at verifier failure limit")
	}
	if reason == "" {
		t.Error("should provide reason")
	}
}

func TestCheckPolicyLimits_DefaultPolicy(t *testing.T) {
	state := &runState{}
	initPolicyTracking(state)

	// With nil/empty policy, defaults should apply
	policy := &config.PolicyConfig{}

	// Under default max_attempts (3)
	state.taskAttempts["task-1"] = 2
	skip, _ := checkPolicyLimits(state, policy, "task-1")
	if skip {
		t.Error("should not skip under default limit")
	}

	// At default max_attempts (3)
	state.taskAttempts["task-1"] = 3
	skip, _ = checkPolicyLimits(state, policy, "task-1")
	if !skip {
		t.Error("should skip at default limit")
	}
}

func TestCheckPolicyLimits_UnknownTask(t *testing.T) {
	state := &runState{}
	initPolicyTracking(state)

	policy := &config.PolicyConfig{}

	// Unknown task should not be skipped (0 attempts)
	skip, _ := checkPolicyLimits(state, policy, "unknown-task")
	if skip {
		t.Error("unknown task with 0 attempts should not be skipped")
	}
}

func TestPolicySummary(t *testing.T) {
	maxAttempts := 5
	secrets := config.SecretsExposureEnv
	policy := &config.PolicyConfig{
		MaxAttempts:     &maxAttempts,
		SecretsExposure: &secrets,
	}

	summary := PolicySummary(policy)

	if summary["max_attempts"] != 5 {
		t.Errorf("max_attempts = %v, want 5", summary["max_attempts"])
	}
	if summary["secrets_exposure"] != "env" {
		t.Errorf("secrets_exposure = %v, want env", summary["secrets_exposure"])
	}
	// Non-set fields should have defaults
	if summary["max_no_progress_attempts"] != config.DefaultMaxNoProgressAttempts {
		t.Errorf("max_no_progress_attempts = %v, want %d", summary["max_no_progress_attempts"], config.DefaultMaxNoProgressAttempts)
	}
	if summary["require_commit"] != false {
		t.Errorf("require_commit = %v, want false", summary["require_commit"])
	}
}

func TestPolicySummary_NilPolicy(t *testing.T) {
	var policy *config.PolicyConfig
	summary := PolicySummary(policy)

	// All values should be defaults
	if summary["max_attempts"] != config.DefaultMaxAttempts {
		t.Errorf("max_attempts = %v, want %d", summary["max_attempts"], config.DefaultMaxAttempts)
	}
	if summary["secrets_exposure"] != "none" {
		t.Errorf("secrets_exposure = %v, want none", summary["secrets_exposure"])
	}
}

func TestPolicyInfo_InPromptContext(t *testing.T) {
	// Test that PolicyInfo is correctly populated and used in prompts
	info := &PolicyInfo{
		MaxAttempts:           5,
		MaxNoProgressAttempts: 3,
		RequireCommit:         true,
		SecretsExposure:       "none",
		Sandbox:               false,
	}

	ctx := IterationContext{
		Iteration: 1,
		Policy:    info,
	}

	if ctx.Policy.MaxAttempts != 5 {
		t.Errorf("Policy.MaxAttempts = %d, want 5", ctx.Policy.MaxAttempts)
	}
	if ctx.Policy.SecretsExposure != "none" {
		t.Errorf("Policy.SecretsExposure = %q, want none", ctx.Policy.SecretsExposure)
	}
}

func TestPromptBuilder_WithPolicy(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic:      nil,
		Task:      nil,
		Policy: &PolicyInfo{
			MaxAttempts:           5,
			MaxNoProgressAttempts: 3,
			RequireCommit:         true,
			SecretsExposure:       "none",
			Sandbox:               true,
		},
	}

	prompt := pb.Build(ctx)

	// Should contain policy contract section
	if !containsStr(prompt, "Tick Contract") {
		t.Error("prompt should contain Tick Contract section when policy is set")
	}
	if !containsStr(prompt, "Max attempts per task") {
		t.Error("prompt should contain max attempts info")
	}
	if !containsStr(prompt, "5") {
		t.Error("prompt should contain max attempts value")
	}
	if !containsStr(prompt, "Require commit") {
		t.Error("prompt should contain require commit info")
	}
	if !containsStr(prompt, "Sandbox") {
		t.Error("prompt should contain sandbox info when enabled")
	}
}

func TestPromptBuilder_WithoutPolicy(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Policy:    nil,
	}

	prompt := pb.Build(ctx)

	// Should NOT contain policy contract section
	if containsStr(prompt, "Tick Contract") {
		t.Error("prompt should not contain Tick Contract when policy is nil")
	}
}

func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && findStr(s, substr)
}

func findStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
