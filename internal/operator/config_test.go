package operator

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"testing"
)

func TestConfigPathHonorsTicksHome(t *testing.T) {
	home := t.TempDir()
	t.Setenv("TICKS_HOME", home)

	got, err := ConfigPath()
	if err != nil {
		t.Fatalf("ConfigPath() error: %v", err)
	}
	want := filepath.Join(home, ConfigFileName)
	if got != want {
		t.Errorf("ConfigPath() = %q, want %q", got, want)
	}
}

func TestSaveLoadRoundTrip(t *testing.T) {
	home := filepath.Join(t.TempDir(), "ticks")
	t.Setenv("TICKS_HOME", home)

	cfg := OperatorConfig{}
	cfg.SetChannel("telegram", ChannelConfig{
		Token:       "12345:secret",
		UserID:      "424242",
		ChatID:      "424242",
		BotUsername: "my_ticks_bot",
		APIBase:     "https://api.telegram.org",
	})

	if err := SaveOperatorConfig(cfg); err != nil {
		t.Fatalf("SaveOperatorConfig() error: %v", err)
	}

	loaded, err := LoadOperatorConfig()
	if err != nil {
		t.Fatalf("LoadOperatorConfig() error: %v", err)
	}
	if !reflect.DeepEqual(loaded, cfg) {
		t.Errorf("round trip mismatch:\n got %#v\nwant %#v", loaded, cfg)
	}

	ch, ok := loaded.Channel("telegram")
	if !ok {
		t.Fatal("Channel(\"telegram\") not found after round trip")
	}
	if ch.Token != "12345:secret" || ch.BotUsername != "my_ticks_bot" {
		t.Errorf("channel entry mismatch: %#v", ch)
	}
	if _, ok := loaded.Channel("slack"); ok {
		t.Error("Channel(\"slack\") reported present")
	}
}

func TestSaveWritesPerChannelMapJSON(t *testing.T) {
	home := t.TempDir()
	t.Setenv("TICKS_HOME", home)

	cfg := OperatorConfig{}
	cfg.SetChannel("telegram", ChannelConfig{Token: "t", UserID: "1"})
	if err := SaveOperatorConfig(cfg); err != nil {
		t.Fatalf("SaveOperatorConfig() error: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(home, ConfigFileName))
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	var raw map[string]map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("stored config is not a per-channel map: %v (%s)", err, data)
	}
	entry, ok := raw["telegram"]
	if !ok {
		t.Fatalf("no telegram key in stored config: %s", data)
	}
	if entry["token"] != "t" || entry["user_id"] != "1" {
		t.Errorf("unexpected telegram entry: %#v", entry)
	}
	if _, ok := entry["chat_id"]; ok {
		t.Errorf("empty fields should be omitted, got: %#v", entry)
	}
}

func TestSavePermissions(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("POSIX file modes are not meaningful on Windows")
	}
	home := filepath.Join(t.TempDir(), "nested", "ticks")
	t.Setenv("TICKS_HOME", home)

	cfg := OperatorConfig{}
	cfg.SetChannel("telegram", ChannelConfig{Token: "secret"})
	if err := SaveOperatorConfig(cfg); err != nil {
		t.Fatalf("SaveOperatorConfig() error: %v", err)
	}

	fi, err := os.Stat(filepath.Join(home, ConfigFileName))
	if err != nil {
		t.Fatalf("Stat config: %v", err)
	}
	if got := fi.Mode().Perm(); got != 0o600 {
		t.Errorf("config file mode = %o, want 600", got)
	}

	di, err := os.Stat(home)
	if err != nil {
		t.Fatalf("Stat home: %v", err)
	}
	if got := di.Mode().Perm(); got != 0o700 {
		t.Errorf("config dir mode = %o, want 700", got)
	}
}

func TestSaveTightensPreExistingLooseDir(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("POSIX file modes are not meaningful on Windows")
	}
	home := filepath.Join(t.TempDir(), "ticks")
	if err := os.Mkdir(home, 0o755); err != nil {
		t.Fatalf("Mkdir: %v", err)
	}
	t.Setenv("TICKS_HOME", home)

	cfg := OperatorConfig{}
	cfg.SetChannel("telegram", ChannelConfig{Token: "secret"})
	if err := SaveOperatorConfig(cfg); err != nil {
		t.Fatalf("SaveOperatorConfig() error: %v", err)
	}

	di, err := os.Stat(home)
	if err != nil {
		t.Fatalf("Stat home: %v", err)
	}
	if got := di.Mode().Perm(); got != 0o700 {
		t.Errorf("pre-existing loose dir mode = %o, want 700", got)
	}
}

func TestEmptyConfigMarshalsToEmptyObjectAndRoundTrips(t *testing.T) {
	data, err := json.Marshal(OperatorConfig{})
	if err != nil {
		t.Fatalf("Marshal(OperatorConfig{}) error: %v", err)
	}
	if string(data) != "{}" {
		t.Errorf("Marshal(OperatorConfig{}) = %s, want {}", data)
	}

	home := t.TempDir()
	t.Setenv("TICKS_HOME", home)
	if err := SaveOperatorConfig(OperatorConfig{}); err != nil {
		t.Fatalf("SaveOperatorConfig(empty) error: %v", err)
	}

	stored, err := os.ReadFile(filepath.Join(home, ConfigFileName))
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	if got := strings.TrimSpace(string(stored)); got != "{}" {
		t.Errorf("stored empty config = %q, want {}", got)
	}

	loaded, err := LoadOperatorConfig()
	if err != nil {
		t.Fatalf("LoadOperatorConfig() error: %v", err)
	}
	if len(loaded.Channels) != 0 {
		t.Errorf("round-tripped empty config = %#v, want no channels", loaded)
	}
	if _, ok := loaded.Channel("telegram"); ok {
		t.Error("round-tripped empty config reported a telegram channel")
	}
	loaded.SetChannel("telegram", ChannelConfig{Token: "t"})
	if got, ok := loaded.Channel("telegram"); !ok || got.Token != "t" {
		t.Error("round-tripped empty config is not usable with SetChannel")
	}
}

func TestSaveOverwritesExistingFile(t *testing.T) {
	home := t.TempDir()
	t.Setenv("TICKS_HOME", home)

	first := OperatorConfig{}
	first.SetChannel("telegram", ChannelConfig{Token: "old", ChatID: "9"})
	if err := SaveOperatorConfig(first); err != nil {
		t.Fatalf("first save: %v", err)
	}

	second := OperatorConfig{}
	second.SetChannel("telegram", ChannelConfig{Token: "new"})
	if err := SaveOperatorConfig(second); err != nil {
		t.Fatalf("second save: %v", err)
	}

	loaded, err := LoadOperatorConfig()
	if err != nil {
		t.Fatalf("LoadOperatorConfig() error: %v", err)
	}
	ch, _ := loaded.Channel("telegram")
	if ch.Token != "new" || ch.ChatID != "" {
		t.Errorf("save did not replace previous contents: %#v", ch)
	}
}

func TestLoadMissingFileReturnsZeroConfig(t *testing.T) {
	t.Setenv("TICKS_HOME", filepath.Join(t.TempDir(), "does-not-exist"))

	cfg, err := LoadOperatorConfig()
	if err != nil {
		t.Fatalf("LoadOperatorConfig() on missing file returned error: %v", err)
	}
	if len(cfg.Channels) != 0 {
		t.Errorf("expected zero-value config, got %#v", cfg)
	}
	if _, ok := cfg.Channel("telegram"); ok {
		t.Error("zero-value config reported a telegram channel")
	}
}

func TestLoadMalformedFileReturnsError(t *testing.T) {
	home := t.TempDir()
	t.Setenv("TICKS_HOME", home)
	if err := os.WriteFile(filepath.Join(home, ConfigFileName), []byte("{not json"), 0o600); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	if _, err := LoadOperatorConfig(); err == nil {
		t.Error("expected an error for malformed config, got nil")
	}
}

func TestSetChannelOnZeroValueConfig(t *testing.T) {
	var cfg OperatorConfig
	cfg.SetChannel("telegram", ChannelConfig{Token: "t"})
	if got, ok := cfg.Channel("telegram"); !ok || got.Token != "t" {
		t.Errorf("SetChannel on zero-value config failed: %#v", cfg)
	}
}
