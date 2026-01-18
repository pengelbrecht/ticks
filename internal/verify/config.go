package verify

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// Config holds verification configuration loaded from .ticker/config.json.
type Config struct {
	// Enabled controls whether verification runs (default true).
	// Set to false to completely skip verification.
	Enabled *bool `json:"enabled,omitempty"`
}

// IsEnabled returns whether verification is enabled (default true).
func (c *Config) IsEnabled() bool {
	if c == nil || c.Enabled == nil {
		return true
	}
	return *c.Enabled
}

// ContextConfig holds context generation configuration from .ticker/config.json.
type ContextConfig struct {
	// Enabled controls whether context generation runs (default true).
	// Set to false to completely skip context generation.
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

// Default values for context configuration.
const (
	DefaultContextMaxTokens       = 4000
	DefaultContextAutoRefreshDays = 0
	DefaultContextTimeout         = 5 * time.Minute
)

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

// Validate checks that config values are within sensible ranges.
// Returns nil if valid, or an error describing the problem.
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

	// generation_model is free-form string, no validation needed

	return nil
}

// TickerConfig is the root config structure for .ticker/config.json.
type TickerConfig struct {
	Verification *Config        `json:"verification,omitempty"`
	Context      *ContextConfig `json:"context,omitempty"`
}

// LoadTickerConfig loads the full configuration from .ticker/config.json in the given directory.
// Returns nil config (not error) if file doesn't exist.
// Returns error only for malformed JSON.
func LoadTickerConfig(dir string) (*TickerConfig, error) {
	configPath := filepath.Join(dir, ".ticker", "config.json")

	data, err := os.ReadFile(configPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			// Missing config file = defaults applied
			return nil, nil
		}
		return nil, err
	}

	var tickerConfig TickerConfig
	if err := json.Unmarshal(data, &tickerConfig); err != nil {
		return nil, err
	}

	// Validate context config if present
	if tickerConfig.Context != nil {
		if err := tickerConfig.Context.Validate(); err != nil {
			return nil, fmt.Errorf("invalid context config: %w", err)
		}
	}

	return &tickerConfig, nil
}

// LoadConfig loads verification configuration from .ticker/config.json in the given directory.
// Returns nil config (not error) if file doesn't exist.
// Returns error only for malformed JSON.
func LoadConfig(dir string) (*Config, error) {
	tickerConfig, err := LoadTickerConfig(dir)
	if err != nil {
		return nil, err
	}
	if tickerConfig == nil {
		return nil, nil
	}
	return tickerConfig.Verification, nil
}

// LoadContextConfig loads context configuration from .ticker/config.json in the given directory.
// Returns nil config (not error) if file doesn't exist (defaults will be applied via getter methods).
// Returns error only for malformed JSON or invalid config values.
func LoadContextConfig(dir string) (*ContextConfig, error) {
	tickerConfig, err := LoadTickerConfig(dir)
	if err != nil {
		return nil, err
	}
	if tickerConfig == nil {
		return nil, nil
	}
	return tickerConfig.Context, nil
}
