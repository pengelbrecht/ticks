package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"
)

const (
	DefaultVersion  = 1
	DefaultIDLength = 3

	// Default values for context configuration.
	DefaultContextMaxTokens       = 4000
	DefaultContextAutoRefreshDays = 0
	DefaultContextTimeout         = 5 * time.Minute
)

// Config defines project configuration stored in .tick/config.json.
type Config struct {
	Version      int                 `json:"version"`
	IDLength     int                 `json:"id_length"`
	Agent        *AgentConfig        `json:"agent,omitempty"`
	Verification *VerificationConfig `json:"verification,omitempty"`
	Context      *ContextConfig      `json:"context,omitempty"`
	Policy       *PolicyConfig       `json:"policy,omitempty"`
}

// AgentConfig holds agent selection and configuration.
type AgentConfig struct {
	// Backend selects the agent backend: "claude" (default, direct CLI) or "acp".
	// When "acp", the agent is launched as an ACP subprocess using the Name field.
	Backend *string `json:"backend,omitempty"`

	// Name is the ACP agent name (e.g., "claude", "codex", "gemini").
	// Only used when Backend is "acp". Defaults to "claude".
	Name *string `json:"name,omitempty"`

	// Command overrides the default ACP launch command for the agent.
	// Only used when Backend is "acp". Example: ["npx", "my-custom-acp-agent"].
	Command []string `json:"command,omitempty"`
}

// GetBackend returns the agent backend (default "claude").
func (c *AgentConfig) GetBackend() string {
	if c == nil || c.Backend == nil {
		return "claude"
	}
	return *c.Backend
}

// GetName returns the ACP agent name (default "claude").
func (c *AgentConfig) GetName() string {
	if c == nil || c.Name == nil {
		return "claude"
	}
	return *c.Name
}

// GetCommand returns the custom ACP launch command, or nil for default.
func (c *AgentConfig) GetCommand() []string {
	if c == nil {
		return nil
	}
	return c.Command
}

// VerificationConfig holds verification settings.
type VerificationConfig struct {
	// Enabled controls whether verification runs (default true).
	Enabled *bool `json:"enabled,omitempty"`
}

// IsEnabled returns whether verification is enabled (default true).
func (c *VerificationConfig) IsEnabled() bool {
	if c == nil || c.Enabled == nil {
		return true
	}
	return *c.Enabled
}

// ContextConfig holds context generation configuration.
type ContextConfig struct {
	// Enabled controls whether context generation runs (default true).
	Enabled *bool `json:"enabled,omitempty"`

	// MaxTokens is the target size for context documents (default 4000).
	MaxTokens *int `json:"max_tokens,omitempty"`

	// AutoRefreshDays is how many days until auto-refresh (default 0 = never).
	AutoRefreshDays *int `json:"auto_refresh_days,omitempty"`

	// GenerationTimeout is the max duration for generation as a string (default "5m").
	GenerationTimeout *string `json:"generation_timeout,omitempty"`

	// GenerationModel overrides the model used for generation (default "" = use default agent).
	GenerationModel *string `json:"generation_model,omitempty"`
}

// IsEnabled returns whether context generation is enabled (default true).
func (c *ContextConfig) IsEnabled() bool {
	if c == nil || c.Enabled == nil {
		return true
	}
	return *c.Enabled
}

// GetMaxTokens returns the max tokens setting (default 4000).
func (c *ContextConfig) GetMaxTokens() int {
	if c == nil || c.MaxTokens == nil {
		return DefaultContextMaxTokens
	}
	return *c.MaxTokens
}

// GetAutoRefreshDays returns the auto-refresh days setting (default 0).
func (c *ContextConfig) GetAutoRefreshDays() int {
	if c == nil || c.AutoRefreshDays == nil {
		return DefaultContextAutoRefreshDays
	}
	return *c.AutoRefreshDays
}

// GetGenerationTimeout returns the generation timeout (default 5m).
func (c *ContextConfig) GetGenerationTimeout() time.Duration {
	if c == nil || c.GenerationTimeout == nil {
		return DefaultContextTimeout
	}
	d, err := time.ParseDuration(*c.GenerationTimeout)
	if err != nil {
		return DefaultContextTimeout
	}
	return d
}

// GetGenerationModel returns the generation model override (default "").
func (c *ContextConfig) GetGenerationModel() string {
	if c == nil || c.GenerationModel == nil {
		return ""
	}
	return *c.GenerationModel
}

// ValidateContext checks that context config values are within sensible ranges.
func (c *ContextConfig) Validate() error {
	if c == nil {
		return nil
	}

	if c.MaxTokens != nil {
		if *c.MaxTokens < 100 {
			return fmt.Errorf("max_tokens must be at least 100, got %d", *c.MaxTokens)
		}
		if *c.MaxTokens > 100000 {
			return fmt.Errorf("max_tokens must be at most 100000, got %d", *c.MaxTokens)
		}
	}

	if c.AutoRefreshDays != nil {
		if *c.AutoRefreshDays < 0 {
			return fmt.Errorf("auto_refresh_days must be non-negative, got %d", *c.AutoRefreshDays)
		}
		if *c.AutoRefreshDays > 365 {
			return fmt.Errorf("auto_refresh_days must be at most 365, got %d", *c.AutoRefreshDays)
		}
	}

	if c.GenerationTimeout != nil {
		d, err := time.ParseDuration(*c.GenerationTimeout)
		if err != nil {
			return fmt.Errorf("invalid generation_timeout: %w", err)
		}
		if d < time.Second {
			return fmt.Errorf("generation_timeout must be at least 1s, got %v", d)
		}
		if d > time.Hour {
			return fmt.Errorf("generation_timeout must be at most 1h, got %v", d)
		}
	}

	return nil
}

// SecretsExposure controls how secrets are made available to agents.
type SecretsExposure string

const (
	// SecretsExposureNone means no secrets are exposed (default, safest).
	SecretsExposureNone SecretsExposure = "none"

	// SecretsExposureEnv exposes secrets via environment variables.
	SecretsExposureEnv SecretsExposure = "env"

	// SecretsExposureFile writes secrets to a temporary file.
	SecretsExposureFile SecretsExposure = "file"
)

// PolicyConfig holds Tickflow run policy controls.
// These are supervisor-level constraints that govern persistence, retries,
// and verification behavior during autonomous runs.
type PolicyConfig struct {
	// MaxAttempts is the maximum number of attempts per task (default 3).
	// After this many attempts, the task is marked as stuck.
	MaxAttempts *int `json:"max_attempts,omitempty"`

	// MaxNoProgressAttempts is how many consecutive attempts without
	// measurable progress before the task is marked stuck (default 2).
	MaxNoProgressAttempts *int `json:"max_no_progress_attempts,omitempty"`

	// MaxSameVerifierFailures is how many times the same verifier command
	// can fail before the task is escalated (default 2).
	MaxSameVerifierFailures *int `json:"max_same_verifier_failures,omitempty"`

	// RequireCommit controls whether the agent must produce at least one
	// git commit for a task to be considered complete (default false).
	RequireCommit *bool `json:"require_commit,omitempty"`

	// RequireVerifiersForPriority is the minimum priority level (1=highest)
	// at or above which verifier commands must pass for task closure.
	// 0 means disabled (default). Example: 2 means P1 and P2 tasks require
	// passing verifiers.
	RequireVerifiersForPriority *int `json:"require_verifiers_for_priority,omitempty"`

	// Sandbox controls whether agents run in a sandboxed environment
	// (default false). When true, filesystem and network access may be
	// restricted.
	Sandbox *bool `json:"sandbox,omitempty"`

	// AutonomousMode controls whether the run is fully autonomous (default
	// false). When true, a project-checkpoint boundary (a tick whose only
	// reason to be gated is awaiting: checkpoint) no longer halts continuation
	// — the orchestrator flows through the project boundary without waiting for
	// a human. It NEVER bypasses any other awaiting type: approval, input,
	// review, content, escalation, and work always gate.
	AutonomousMode *bool `json:"autonomous_mode,omitempty"`

	// SecretsExposure controls how secrets are made available to agents
	// (default "none"). Valid values: "none", "env", "file".
	SecretsExposure *SecretsExposure `json:"secrets_exposure,omitempty"`
}

// Default policy values.
const (
	DefaultMaxAttempts             = 3
	DefaultMaxNoProgressAttempts   = 2
	DefaultMaxSameVerifierFailures = 2
	DefaultRequireCommit           = false
	DefaultRequireVerifiersForPrio = 0
	DefaultSandbox                 = false
	DefaultAutonomousMode          = false
)

// GetMaxAttempts returns the max attempts per task (default 3).
func (p *PolicyConfig) GetMaxAttempts() int {
	if p == nil || p.MaxAttempts == nil {
		return DefaultMaxAttempts
	}
	return *p.MaxAttempts
}

// GetMaxNoProgressAttempts returns the max no-progress attempts (default 2).
func (p *PolicyConfig) GetMaxNoProgressAttempts() int {
	if p == nil || p.MaxNoProgressAttempts == nil {
		return DefaultMaxNoProgressAttempts
	}
	return *p.MaxNoProgressAttempts
}

// GetMaxSameVerifierFailures returns the max same-verifier failures (default 2).
func (p *PolicyConfig) GetMaxSameVerifierFailures() int {
	if p == nil || p.MaxSameVerifierFailures == nil {
		return DefaultMaxSameVerifierFailures
	}
	return *p.MaxSameVerifierFailures
}

// GetRequireCommit returns whether commits are required (default false).
func (p *PolicyConfig) GetRequireCommit() bool {
	if p == nil || p.RequireCommit == nil {
		return DefaultRequireCommit
	}
	return *p.RequireCommit
}

// GetRequireVerifiersForPriority returns the priority threshold (default 0/disabled).
func (p *PolicyConfig) GetRequireVerifiersForPriority() int {
	if p == nil || p.RequireVerifiersForPriority == nil {
		return DefaultRequireVerifiersForPrio
	}
	return *p.RequireVerifiersForPriority
}

// GetSandbox returns whether sandbox mode is enabled (default false).
func (p *PolicyConfig) GetSandbox() bool {
	if p == nil || p.Sandbox == nil {
		return DefaultSandbox
	}
	return *p.Sandbox
}

// GetAutonomousMode returns whether autonomous mode is enabled (default false).
// When enabled, project-checkpoint boundaries no longer gate continuation; no
// other awaiting type is affected.
func (p *PolicyConfig) GetAutonomousMode() bool {
	if p == nil || p.AutonomousMode == nil {
		return DefaultAutonomousMode
	}
	return *p.AutonomousMode
}

// GetSecretsExposure returns the secrets exposure mode (default "none").
func (p *PolicyConfig) GetSecretsExposure() SecretsExposure {
	if p == nil || p.SecretsExposure == nil {
		return SecretsExposureNone
	}
	return *p.SecretsExposure
}

// Validate checks that policy config values are within sensible ranges.
func (p *PolicyConfig) Validate() error {
	if p == nil {
		return nil
	}

	if p.MaxAttempts != nil {
		if *p.MaxAttempts < 1 {
			return fmt.Errorf("policy.max_attempts must be at least 1, got %d", *p.MaxAttempts)
		}
		if *p.MaxAttempts > 100 {
			return fmt.Errorf("policy.max_attempts must be at most 100, got %d", *p.MaxAttempts)
		}
	}

	if p.MaxNoProgressAttempts != nil {
		if *p.MaxNoProgressAttempts < 1 {
			return fmt.Errorf("policy.max_no_progress_attempts must be at least 1, got %d", *p.MaxNoProgressAttempts)
		}
		if *p.MaxNoProgressAttempts > 50 {
			return fmt.Errorf("policy.max_no_progress_attempts must be at most 50, got %d", *p.MaxNoProgressAttempts)
		}
	}

	if p.MaxSameVerifierFailures != nil {
		if *p.MaxSameVerifierFailures < 1 {
			return fmt.Errorf("policy.max_same_verifier_failures must be at least 1, got %d", *p.MaxSameVerifierFailures)
		}
		if *p.MaxSameVerifierFailures > 50 {
			return fmt.Errorf("policy.max_same_verifier_failures must be at most 50, got %d", *p.MaxSameVerifierFailures)
		}
	}

	if p.RequireVerifiersForPriority != nil {
		if *p.RequireVerifiersForPriority < 0 {
			return fmt.Errorf("policy.require_verifiers_for_priority must be non-negative, got %d", *p.RequireVerifiersForPriority)
		}
		if *p.RequireVerifiersForPriority > 5 {
			return fmt.Errorf("policy.require_verifiers_for_priority must be at most 5, got %d", *p.RequireVerifiersForPriority)
		}
	}

	if p.SecretsExposure != nil {
		switch *p.SecretsExposure {
		case SecretsExposureNone, SecretsExposureEnv, SecretsExposureFile:
			// Valid
		default:
			return fmt.Errorf("policy.secrets_exposure must be \"none\", \"env\", or \"file\", got %q", *p.SecretsExposure)
		}
	}

	return nil
}

// Default returns the default config.
func Default() Config {
	return Config{
		Version:  DefaultVersion,
		IDLength: DefaultIDLength,
	}
}

// Load reads config from disk and applies defaults for zero values.
func Load(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Config{}, fmt.Errorf("config not found: %w", err)
		}
		return Config{}, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parse config: %w", err)
	}

	if cfg.Version == 0 {
		cfg.Version = DefaultVersion
	}
	if cfg.IDLength == 0 {
		cfg.IDLength = DefaultIDLength
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

// Save writes a config to disk.
func Save(path string, cfg Config) error {
	if cfg.Version == 0 {
		cfg.Version = DefaultVersion
	}
	if cfg.IDLength == 0 {
		cfg.IDLength = DefaultIDLength
	}

	if err := cfg.Validate(); err != nil {
		return err
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("encode config: %w", err)
	}

	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write config: %w", err)
	}

	return nil
}

// Validate ensures config values are within supported ranges.
func (c Config) Validate() error {
	if c.Version != DefaultVersion {
		return fmt.Errorf("unsupported config version: %d", c.Version)
	}
	if c.IDLength < 3 || c.IDLength > 4 {
		return fmt.Errorf("id_length must be 3 or 4, got %d", c.IDLength)
	}
	if c.Context != nil {
		if err := c.Context.Validate(); err != nil {
			return fmt.Errorf("invalid context config: %w", err)
		}
	}
	if c.Policy != nil {
		if err := c.Policy.Validate(); err != nil {
			return fmt.Errorf("invalid policy config: %w", err)
		}
	}
	return nil
}

// LoadOrDefault reads config from disk, returning defaults if file doesn't exist.
func LoadOrDefault(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Default(), nil
		}
		return Config{}, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parse config: %w", err)
	}

	if cfg.Version == 0 {
		cfg.Version = DefaultVersion
	}
	if cfg.IDLength == 0 {
		cfg.IDLength = DefaultIDLength
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}
