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
	Version      int               `json:"version"`
	IDLength     int               `json:"id_length"`
	Agent        *AgentConfig        `json:"agent,omitempty"`
	Verification *VerificationConfig `json:"verification,omitempty"`
	Context      *ContextConfig      `json:"context,omitempty"`
}

// AgentConfig holds agent selection and configuration.
type AgentConfig struct {
	// Backend selects the agent backend: "claude" (default) or "acpx".
	Backend *string `json:"backend,omitempty"`

	// Name is the agent name for acpx (e.g., "claude", "codex", "gemini").
	// Only used when Backend is "acpx". Defaults to "claude".
	Name *string `json:"name,omitempty"`
}

// GetBackend returns the agent backend (default "claude").
func (c *AgentConfig) GetBackend() string {
	if c == nil || c.Backend == nil {
		return "claude"
	}
	return *c.Backend
}

// GetName returns the agent name for acpx (default "claude").
func (c *AgentConfig) GetName() string {
	if c == nil || c.Name == nil {
		return "claude"
	}
	return *c.Name
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
