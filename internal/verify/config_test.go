package verify

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestConfig_IsEnabled(t *testing.T) {
	trueVal := true
	falseVal := false

	tests := []struct {
		name   string
		config *Config
		want   bool
	}{
		{
			name:   "nil config defaults to enabled",
			config: nil,
			want:   true,
		},
		{
			name:   "nil Enabled field defaults to enabled",
			config: &Config{Enabled: nil},
			want:   true,
		},
		{
			name:   "explicitly enabled",
			config: &Config{Enabled: &trueVal},
			want:   true,
		},
		{
			name:   "explicitly disabled",
			config: &Config{Enabled: &falseVal},
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.config.IsEnabled()
			if got != tt.want {
				t.Errorf("Config.IsEnabled() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestLoadConfig(t *testing.T) {
	tests := []struct {
		name        string
		configJSON  string
		createFile  bool
		wantEnabled bool
		wantNil     bool
		wantErr     bool
	}{
		{
			name:       "missing file returns nil config",
			createFile: false,
			wantNil:    true,
			wantErr:    false,
		},
		{
			name:        "enabled true",
			configJSON:  `{"verification": {"enabled": true}}`,
			createFile:  true,
			wantEnabled: true,
			wantNil:     false,
			wantErr:     false,
		},
		{
			name:        "enabled false",
			configJSON:  `{"verification": {"enabled": false}}`,
			createFile:  true,
			wantEnabled: false,
			wantNil:     false,
			wantErr:     false,
		},
		{
			name:       "empty verification section defaults to enabled",
			configJSON: `{"verification": {}}`,
			createFile: true,
			wantNil:    false,
			wantErr:    false,
			// Config exists but Enabled is nil, so IsEnabled() returns true
			wantEnabled: true,
		},
		{
			name:       "missing verification section returns nil config",
			configJSON: `{}`,
			createFile: true,
			wantNil:    true,
			wantErr:    false,
		},
		{
			name:       "malformed JSON returns error",
			configJSON: `{"verification": {invalid json`,
			createFile: true,
			wantErr:    true,
		},
		{
			name:       "empty file returns error",
			configJSON: ``,
			createFile: true,
			wantErr:    true, // empty string is not valid JSON
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temp directory
			tmpDir := t.TempDir()

			if tt.createFile {
				// Create .ticker directory and config.json
				tickerDir := filepath.Join(tmpDir, ".ticker")
				if err := os.MkdirAll(tickerDir, 0755); err != nil {
					t.Fatalf("failed to create .ticker dir: %v", err)
				}
				configPath := filepath.Join(tickerDir, "config.json")
				if err := os.WriteFile(configPath, []byte(tt.configJSON), 0644); err != nil {
					t.Fatalf("failed to write config.json: %v", err)
				}
			}

			got, err := LoadConfig(tmpDir)

			if tt.wantErr {
				if err == nil {
					t.Error("LoadConfig() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("LoadConfig() unexpected error: %v", err)
				return
			}

			if tt.wantNil {
				if got != nil {
					t.Errorf("LoadConfig() = %+v, want nil", got)
				}
				return
			}

			if got == nil {
				t.Error("LoadConfig() = nil, want non-nil")
				return
			}

			if got.IsEnabled() != tt.wantEnabled {
				t.Errorf("LoadConfig().IsEnabled() = %v, want %v", got.IsEnabled(), tt.wantEnabled)
			}
		})
	}
}

func TestLoadConfig_ReadError(t *testing.T) {
	// Test that non-existent directory doesn't cause a crash
	// (should return nil, nil since file doesn't exist)
	config, err := LoadConfig("/nonexistent/directory/path")
	if err != nil {
		t.Errorf("LoadConfig() on non-existent dir returned error: %v", err)
	}
	if config != nil {
		t.Errorf("LoadConfig() on non-existent dir = %+v, want nil", config)
	}
}

// --- ContextConfig Tests ---

func TestContextConfig_IsEnabled(t *testing.T) {
	trueVal := true
	falseVal := false

	tests := []struct {
		name   string
		config *ContextConfig
		want   bool
	}{
		{
			name:   "nil config defaults to enabled",
			config: nil,
			want:   true,
		},
		{
			name:   "nil Enabled field defaults to enabled",
			config: &ContextConfig{Enabled: nil},
			want:   true,
		},
		{
			name:   "explicitly enabled",
			config: &ContextConfig{Enabled: &trueVal},
			want:   true,
		},
		{
			name:   "explicitly disabled",
			config: &ContextConfig{Enabled: &falseVal},
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.config.IsEnabled()
			if got != tt.want {
				t.Errorf("ContextConfig.IsEnabled() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestContextConfig_GetMaxTokens(t *testing.T) {
	val := 8000

	tests := []struct {
		name   string
		config *ContextConfig
		want   int
	}{
		{
			name:   "nil config returns default",
			config: nil,
			want:   DefaultContextMaxTokens,
		},
		{
			name:   "nil MaxTokens returns default",
			config: &ContextConfig{MaxTokens: nil},
			want:   DefaultContextMaxTokens,
		},
		{
			name:   "explicit value",
			config: &ContextConfig{MaxTokens: &val},
			want:   8000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.config.GetMaxTokens()
			if got != tt.want {
				t.Errorf("ContextConfig.GetMaxTokens() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestContextConfig_GetAutoRefreshDays(t *testing.T) {
	val := 7

	tests := []struct {
		name   string
		config *ContextConfig
		want   int
	}{
		{
			name:   "nil config returns default",
			config: nil,
			want:   DefaultContextAutoRefreshDays,
		},
		{
			name:   "nil AutoRefreshDays returns default",
			config: &ContextConfig{AutoRefreshDays: nil},
			want:   DefaultContextAutoRefreshDays,
		},
		{
			name:   "explicit value",
			config: &ContextConfig{AutoRefreshDays: &val},
			want:   7,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.config.GetAutoRefreshDays()
			if got != tt.want {
				t.Errorf("ContextConfig.GetAutoRefreshDays() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestContextConfig_GetGenerationTimeout(t *testing.T) {
	validDuration := "10m"
	invalidDuration := "invalid"

	tests := []struct {
		name   string
		config *ContextConfig
		want   time.Duration
	}{
		{
			name:   "nil config returns default",
			config: nil,
			want:   DefaultContextTimeout,
		},
		{
			name:   "nil GenerationTimeout returns default",
			config: &ContextConfig{GenerationTimeout: nil},
			want:   DefaultContextTimeout,
		},
		{
			name:   "valid duration",
			config: &ContextConfig{GenerationTimeout: &validDuration},
			want:   10 * time.Minute,
		},
		{
			name:   "invalid duration returns default",
			config: &ContextConfig{GenerationTimeout: &invalidDuration},
			want:   DefaultContextTimeout,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.config.GetGenerationTimeout()
			if got != tt.want {
				t.Errorf("ContextConfig.GetGenerationTimeout() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestContextConfig_GetGenerationModel(t *testing.T) {
	model := "sonnet"

	tests := []struct {
		name   string
		config *ContextConfig
		want   string
	}{
		{
			name:   "nil config returns empty",
			config: nil,
			want:   "",
		},
		{
			name:   "nil GenerationModel returns empty",
			config: &ContextConfig{GenerationModel: nil},
			want:   "",
		},
		{
			name:   "explicit value",
			config: &ContextConfig{GenerationModel: &model},
			want:   "sonnet",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.config.GetGenerationModel()
			if got != tt.want {
				t.Errorf("ContextConfig.GetGenerationModel() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestContextConfig_Validate(t *testing.T) {
	ptr := func(i int) *int { return &i }
	strPtr := func(s string) *string { return &s }

	tests := []struct {
		name    string
		config  *ContextConfig
		wantErr bool
		errMsg  string
	}{
		{
			name:    "nil config is valid",
			config:  nil,
			wantErr: false,
		},
		{
			name:    "empty config is valid",
			config:  &ContextConfig{},
			wantErr: false,
		},
		{
			name:    "valid max_tokens",
			config:  &ContextConfig{MaxTokens: ptr(4000)},
			wantErr: false,
		},
		{
			name:    "max_tokens too low",
			config:  &ContextConfig{MaxTokens: ptr(50)},
			wantErr: true,
			errMsg:  "max_tokens must be at least 100",
		},
		{
			name:    "max_tokens too high",
			config:  &ContextConfig{MaxTokens: ptr(200000)},
			wantErr: true,
			errMsg:  "max_tokens must be at most 100000",
		},
		{
			name:    "valid auto_refresh_days",
			config:  &ContextConfig{AutoRefreshDays: ptr(7)},
			wantErr: false,
		},
		{
			name:    "auto_refresh_days negative",
			config:  &ContextConfig{AutoRefreshDays: ptr(-1)},
			wantErr: true,
			errMsg:  "auto_refresh_days must be non-negative",
		},
		{
			name:    "auto_refresh_days too high",
			config:  &ContextConfig{AutoRefreshDays: ptr(500)},
			wantErr: true,
			errMsg:  "auto_refresh_days must be at most 365",
		},
		{
			name:    "valid generation_timeout",
			config:  &ContextConfig{GenerationTimeout: strPtr("10m")},
			wantErr: false,
		},
		{
			name:    "invalid generation_timeout format",
			config:  &ContextConfig{GenerationTimeout: strPtr("invalid")},
			wantErr: true,
			errMsg:  "invalid generation_timeout",
		},
		{
			name:    "generation_timeout too short",
			config:  &ContextConfig{GenerationTimeout: strPtr("100ms")},
			wantErr: true,
			errMsg:  "generation_timeout must be at least 1s",
		},
		{
			name:    "generation_timeout too long",
			config:  &ContextConfig{GenerationTimeout: strPtr("2h")},
			wantErr: true,
			errMsg:  "generation_timeout must be at most 1h",
		},
		{
			name:    "generation_model is free-form",
			config:  &ContextConfig{GenerationModel: strPtr("any-model-name")},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if tt.wantErr {
				if err == nil {
					t.Error("Validate() expected error, got nil")
					return
				}
				if tt.errMsg != "" && err.Error()[:len(tt.errMsg)] != tt.errMsg {
					t.Errorf("Validate() error = %v, want prefix %v", err, tt.errMsg)
				}
			} else {
				if err != nil {
					t.Errorf("Validate() unexpected error: %v", err)
				}
			}
		})
	}
}

func TestLoadContextConfig(t *testing.T) {
	tests := []struct {
		name          string
		configJSON    string
		createFile    bool
		wantEnabled   bool
		wantMaxTokens int
		wantTimeout   time.Duration
		wantModel     string
		wantNil       bool
		wantErr       bool
	}{
		{
			name:       "missing file returns nil config",
			createFile: false,
			wantNil:    true,
			wantErr:    false,
		},
		{
			name:          "enabled true",
			configJSON:    `{"context": {"enabled": true}}`,
			createFile:    true,
			wantEnabled:   true,
			wantMaxTokens: DefaultContextMaxTokens,
			wantTimeout:   DefaultContextTimeout,
			wantModel:     "",
			wantNil:       false,
			wantErr:       false,
		},
		{
			name:          "enabled false",
			configJSON:    `{"context": {"enabled": false}}`,
			createFile:    true,
			wantEnabled:   false,
			wantMaxTokens: DefaultContextMaxTokens,
			wantTimeout:   DefaultContextTimeout,
			wantModel:     "",
			wantNil:       false,
			wantErr:       false,
		},
		{
			name:          "full config",
			configJSON:    `{"context": {"enabled": true, "max_tokens": 8000, "auto_refresh_days": 14, "generation_timeout": "10m", "generation_model": "sonnet"}}`,
			createFile:    true,
			wantEnabled:   true,
			wantMaxTokens: 8000,
			wantTimeout:   10 * time.Minute,
			wantModel:     "sonnet",
			wantNil:       false,
			wantErr:       false,
		},
		{
			name:       "missing context section returns nil config",
			configJSON: `{}`,
			createFile: true,
			wantNil:    true,
			wantErr:    false,
		},
		{
			name:       "empty context section uses defaults",
			configJSON: `{"context": {}}`,
			createFile: true,
			// Empty config exists but all fields use defaults
			wantEnabled:   true,
			wantMaxTokens: DefaultContextMaxTokens,
			wantTimeout:   DefaultContextTimeout,
			wantModel:     "",
			wantNil:       false,
			wantErr:       false,
		},
		{
			name:       "malformed JSON returns error",
			configJSON: `{"context": {invalid json`,
			createFile: true,
			wantErr:    true,
		},
		{
			name:       "invalid max_tokens returns validation error",
			configJSON: `{"context": {"max_tokens": 50}}`,
			createFile: true,
			wantErr:    true,
		},
		{
			name:       "invalid generation_timeout returns validation error",
			configJSON: `{"context": {"generation_timeout": "invalid"}}`,
			createFile: true,
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir := t.TempDir()

			if tt.createFile {
				tickerDir := filepath.Join(tmpDir, ".ticker")
				if err := os.MkdirAll(tickerDir, 0755); err != nil {
					t.Fatalf("failed to create .ticker dir: %v", err)
				}
				configPath := filepath.Join(tickerDir, "config.json")
				if err := os.WriteFile(configPath, []byte(tt.configJSON), 0644); err != nil {
					t.Fatalf("failed to write config.json: %v", err)
				}
			}

			got, err := LoadContextConfig(tmpDir)

			if tt.wantErr {
				if err == nil {
					t.Error("LoadContextConfig() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("LoadContextConfig() unexpected error: %v", err)
				return
			}

			if tt.wantNil {
				if got != nil {
					t.Errorf("LoadContextConfig() = %+v, want nil", got)
				}
				return
			}

			if got == nil {
				t.Error("LoadContextConfig() = nil, want non-nil")
				return
			}

			if got.IsEnabled() != tt.wantEnabled {
				t.Errorf("IsEnabled() = %v, want %v", got.IsEnabled(), tt.wantEnabled)
			}

			if got.GetMaxTokens() != tt.wantMaxTokens {
				t.Errorf("GetMaxTokens() = %v, want %v", got.GetMaxTokens(), tt.wantMaxTokens)
			}

			if got.GetGenerationTimeout() != tt.wantTimeout {
				t.Errorf("GetGenerationTimeout() = %v, want %v", got.GetGenerationTimeout(), tt.wantTimeout)
			}

			if got.GetGenerationModel() != tt.wantModel {
				t.Errorf("GetGenerationModel() = %v, want %v", got.GetGenerationModel(), tt.wantModel)
			}
		})
	}
}

func TestLoadTickerConfig(t *testing.T) {
	tests := []struct {
		name                    string
		configJSON              string
		createFile              bool
		wantNil                 bool
		wantVerificationNil     bool
		wantContextNil          bool
		wantVerificationEnabled bool
		wantContextEnabled      bool
		wantErr                 bool
	}{
		{
			name:       "missing file returns nil config",
			createFile: false,
			wantNil:    true,
			wantErr:    false,
		},
		{
			name:                    "both sections present",
			configJSON:              `{"verification": {"enabled": true}, "context": {"enabled": false}}`,
			createFile:              true,
			wantNil:                 false,
			wantVerificationNil:     false,
			wantContextNil:          false,
			wantVerificationEnabled: true,
			wantContextEnabled:      false,
			wantErr:                 false,
		},
		{
			name:                    "verification only",
			configJSON:              `{"verification": {"enabled": true}}`,
			createFile:              true,
			wantNil:                 false,
			wantVerificationNil:     false,
			wantContextNil:          true,
			wantVerificationEnabled: true,
			wantErr:                 false,
		},
		{
			name:                "context only",
			configJSON:          `{"context": {"enabled": true}}`,
			createFile:          true,
			wantNil:             false,
			wantVerificationNil: true,
			wantContextNil:      false,
			wantContextEnabled:  true,
			wantErr:             false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir := t.TempDir()

			if tt.createFile {
				tickerDir := filepath.Join(tmpDir, ".ticker")
				if err := os.MkdirAll(tickerDir, 0755); err != nil {
					t.Fatalf("failed to create .ticker dir: %v", err)
				}
				configPath := filepath.Join(tickerDir, "config.json")
				if err := os.WriteFile(configPath, []byte(tt.configJSON), 0644); err != nil {
					t.Fatalf("failed to write config.json: %v", err)
				}
			}

			got, err := LoadTickerConfig(tmpDir)

			if tt.wantErr {
				if err == nil {
					t.Error("LoadTickerConfig() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("LoadTickerConfig() unexpected error: %v", err)
				return
			}

			if tt.wantNil {
				if got != nil {
					t.Errorf("LoadTickerConfig() = %+v, want nil", got)
				}
				return
			}

			if got == nil {
				t.Error("LoadTickerConfig() = nil, want non-nil")
				return
			}

			if tt.wantVerificationNil {
				if got.Verification != nil {
					t.Errorf("Verification = %+v, want nil", got.Verification)
				}
			} else if got.Verification == nil {
				t.Error("Verification = nil, want non-nil")
			} else if got.Verification.IsEnabled() != tt.wantVerificationEnabled {
				t.Errorf("Verification.IsEnabled() = %v, want %v", got.Verification.IsEnabled(), tt.wantVerificationEnabled)
			}

			if tt.wantContextNil {
				if got.Context != nil {
					t.Errorf("Context = %+v, want nil", got.Context)
				}
			} else if got.Context == nil {
				t.Error("Context = nil, want non-nil")
			} else if got.Context.IsEnabled() != tt.wantContextEnabled {
				t.Errorf("Context.IsEnabled() = %v, want %v", got.Context.IsEnabled(), tt.wantContextEnabled)
			}
		})
	}
}
