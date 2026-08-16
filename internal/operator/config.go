package operator

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

const (
	// ConfigFileName is the global operator config file, stored in the ticks
	// home directory (see [Home]).
	ConfigFileName = "operator.json"

	// HomeEnv overrides the ticks home directory. When set it IS the home
	// directory (not its parent), which lets tests redirect the whole thing.
	HomeEnv = "TK_HOME"

	// DirName is the ticks home directory under the user's home directory.
	DirName = ".tick"

	configFileMode = 0o600
	configDirMode  = 0o700
)

// ChannelConfig is one channel's persisted settings. The fields cover what a
// bot-style transport needs; identifiers are strings so channels that use
// non-numeric ids fit without changing the shape.
type ChannelConfig struct {
	// Token is the bot credential. Secret — this file is the only place it
	// is written, never the repo.
	Token string `json:"token,omitempty"`
	// UserID is the paired operator's identity on the channel. Traffic from
	// anyone else is dropped by the transport.
	UserID string `json:"user_id,omitempty"`
	// ChatID is the conversation messages are delivered to.
	ChatID string `json:"chat_id,omitempty"`
	// BotUsername is the bot's public handle, used in pairing links and
	// status output.
	BotUsername string `json:"bot_username,omitempty"`
	// APIBase overrides the channel's API root. Empty means the transport's
	// default; tests point it at a local fake server.
	APIBase string `json:"api_base,omitempty"`
}

// OperatorConfig is the global operator configuration: one entry per channel,
// keyed by channel name (e.g. "telegram"). It is stored as a bare per-channel
// map, so the file reads as {"telegram":{"token":...}}.
//
// The zero value is a valid, empty configuration.
type OperatorConfig struct {
	Channels map[string]ChannelConfig
}

// Channel returns the configuration for the named channel.
func (c OperatorConfig) Channel(name string) (ChannelConfig, bool) {
	cfg, ok := c.Channels[name]
	return cfg, ok
}

// SetChannel stores the configuration for the named channel, allocating the
// map if needed.
func (c *OperatorConfig) SetChannel(name string, cfg ChannelConfig) {
	if c.Channels == nil {
		c.Channels = make(map[string]ChannelConfig)
	}
	c.Channels[name] = cfg
}

// MarshalJSON writes the config as a bare per-channel map.
func (c OperatorConfig) MarshalJSON() ([]byte, error) {
	if c.Channels == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(c.Channels)
}

// UnmarshalJSON reads a bare per-channel map.
func (c *OperatorConfig) UnmarshalJSON(data []byte) error {
	var channels map[string]ChannelConfig
	if err := json.Unmarshal(data, &channels); err != nil {
		return err
	}
	c.Channels = channels
	return nil
}

// Home returns the ticks home directory: $TK_HOME when set, otherwise
// ~/.tick. The directory is not created.
func Home() (string, error) {
	if dir := os.Getenv(HomeEnv); dir != "" {
		return dir, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("locating home directory: %w", err)
	}
	return filepath.Join(home, DirName), nil
}

// ConfigPath returns the path of the global operator config file.
func ConfigPath() (string, error) {
	home, err := Home()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ConfigFileName), nil
}

// LoadOperatorConfig reads the global operator config. A missing file is not an
// error: it yields the zero-value config.
func LoadOperatorConfig() (OperatorConfig, error) {
	var cfg OperatorConfig

	path, err := ConfigPath()
	if err != nil {
		return cfg, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return cfg, fmt.Errorf("reading %s: %w", path, err)
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return OperatorConfig{}, fmt.Errorf("parsing %s: %w", path, err)
	}
	return cfg, nil
}

// SaveOperatorConfig writes the global operator config, creating the ticks home
// directory (0700) if needed. The file holds secrets and is written 0600, via a
// temp file in the same directory so a failed write cannot truncate the old one.
func SaveOperatorConfig(cfg OperatorConfig) error {
	path, err := ConfigPath()
	if err != nil {
		return err
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, configDirMode); err != nil {
		return fmt.Errorf("creating %s: %w", dir, err)
	}
	// MkdirAll's mode only applies to directories it creates, and umask can
	// loosen it. Tighten unconditionally so a pre-existing world-readable
	// ~/.tick does not leak the token file's directory listing.
	if err := os.Chmod(dir, configDirMode); err != nil {
		return fmt.Errorf("tightening permissions on %s: %w", dir, err)
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("encoding operator config: %w", err)
	}
	data = append(data, '\n')

	tmp, err := os.CreateTemp(dir, ConfigFileName+".*.tmp")
	if err != nil {
		return fmt.Errorf("creating temp file in %s: %w", dir, err)
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	if err := tmp.Chmod(configFileMode); err != nil {
		tmp.Close()
		return fmt.Errorf("setting mode on %s: %w", tmpPath, err)
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return fmt.Errorf("writing %s: %w", tmpPath, err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("closing %s: %w", tmpPath, err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("replacing %s: %w", path, err)
	}
	return nil
}
