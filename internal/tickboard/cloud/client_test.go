package cloud

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfig_NoToken(t *testing.T) {
	// Ensure no environment variable is set
	os.Unsetenv(EnvToken)
	os.Unsetenv(EnvCloudURL)

	cfg := LoadConfig("/tmp/test/.tick", 3000)
	if cfg != nil {
		t.Error("expected nil config when no token is set")
	}
}

func TestLoadConfig_FromEnv(t *testing.T) {
	os.Setenv(EnvToken, "test-token-123")
	defer os.Unsetenv(EnvToken)

	cfg := LoadConfig("/tmp/myrepo/.tick", 3000)
	if cfg == nil {
		t.Fatal("expected config when token is set")
	}

	if cfg.Token != "test-token-123" {
		t.Errorf("expected token 'test-token-123', got '%s'", cfg.Token)
	}
	if cfg.BoardName != "myrepo" {
		t.Errorf("expected board name 'myrepo', got '%s'", cfg.BoardName)
	}
	if cfg.LocalAddr != "http://localhost:3000" {
		t.Errorf("expected local addr 'http://localhost:3000', got '%s'", cfg.LocalAddr)
	}
	if cfg.CloudURL != DefaultCloudURL {
		t.Errorf("expected default cloud URL, got '%s'", cfg.CloudURL)
	}
}

func TestLoadConfig_CustomCloudURL(t *testing.T) {
	os.Setenv(EnvToken, "test-token")
	os.Setenv(EnvCloudURL, "wss://custom.example.com/agent")
	defer os.Unsetenv(EnvToken)
	defer os.Unsetenv(EnvCloudURL)

	cfg := LoadConfig("/tmp/test/.tick", 8080)
	if cfg == nil {
		t.Fatal("expected config")
	}

	if cfg.CloudURL != "wss://custom.example.com/agent" {
		t.Errorf("expected custom cloud URL, got '%s'", cfg.CloudURL)
	}
}

func TestLoadConfig_FromFile(t *testing.T) {
	// Create a temporary config file
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skip("cannot get home directory")
	}

	configPath := filepath.Join(home, ConfigFileName)

	// Check if config already exists
	_, err = os.Stat(configPath)
	configExists := err == nil

	if !configExists {
		// Create test config
		err = os.WriteFile(configPath, []byte("token=file-token-456\n"), 0600)
		if err != nil {
			t.Skipf("cannot create test config: %v", err)
		}
		defer os.Remove(configPath)

		os.Unsetenv(EnvToken) // Ensure env var doesn't take precedence

		cfg := LoadConfig("/tmp/test/.tick", 3000)
		if cfg == nil {
			t.Fatal("expected config from file")
		}
		if cfg.Token != "file-token-456" {
			t.Errorf("expected token 'file-token-456', got '%s'", cfg.Token)
		}
	} else {
		t.Skip("config file already exists, skipping file-based test")
	}
}

func TestDeriveBoardName(t *testing.T) {
	tests := []struct {
		tickDir  string
		expected string
	}{
		{"/home/user/projects/myapp/.tick", "myapp"},
		{"/var/repos/api-server/.tick", "api-server"},
		{"/.tick", "/"}, // Edge case: root returns "/"
	}

	for _, tt := range tests {
		got := deriveBoardName(tt.tickDir)
		if got != tt.expected {
			t.Errorf("deriveBoardName(%q) = %q, want %q", tt.tickDir, got, tt.expected)
		}
	}
}

func TestNewClient_RequiresToken(t *testing.T) {
	_, err := NewClient(Config{})
	if err == nil {
		t.Error("expected error when token is empty")
	}
}

func TestNewClient_Success(t *testing.T) {
	client, err := NewClient(Config{
		Token:     "test-token",
		BoardName: "myboard",
		MachineID: "machine1",
		LocalAddr: "http://localhost:3000",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client == nil {
		t.Fatal("expected client to be created")
	}
	if client.cloudURL != DefaultCloudURL {
		t.Errorf("expected default cloud URL, got '%s'", client.cloudURL)
	}
}
