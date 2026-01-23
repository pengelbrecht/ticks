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

	// Check if user has a config file - if so, test would pass with that token
	home, err := os.UserHomeDir()
	if err == nil {
		if _, err := os.Stat(filepath.Join(home, ConfigFileName)); err == nil {
			t.Skip("skipping: user has ~/.tickboardrc config file")
		}
	}

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

// ============================================================================
// Sync Mode Tests
// ============================================================================

func TestNewClient_SyncMode(t *testing.T) {
	// Create temp tick dir
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick")
	issuesDir := filepath.Join(tickDir, "issues")
	if err := os.MkdirAll(issuesDir, 0755); err != nil {
		t.Fatalf("failed to create issues dir: %v", err)
	}

	client, err := NewClient(Config{
		Token:     "test-token",
		BoardName: "myboard",
		TickDir:   tickDir,
		Mode:      ModeSync,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client.mode != ModeSync {
		t.Errorf("expected ModeSync, got %v", client.mode)
	}
	if client.tickDir != tickDir {
		t.Errorf("expected tickDir %q, got %q", tickDir, client.tickDir)
	}
}

func TestNewClient_SyncMode_RequiresTickDir(t *testing.T) {
	_, err := NewClient(Config{
		Token:     "test-token",
		BoardName: "myboard",
		Mode:      ModeSync,
		// TickDir not set
	})
	if err == nil {
		t.Error("expected error when TickDir is empty in sync mode")
	}
}

func TestSyncState_String(t *testing.T) {
	tests := []struct {
		state    SyncState
		expected string
	}{
		{SyncDisconnected, "disconnected"},
		{SyncConnecting, "connecting"},
		{SyncConnected, "connected"},
		{SyncError, "error"},
		{SyncState(99), "unknown"},
	}

	for _, tt := range tests {
		got := tt.state.String()
		if got != tt.expected {
			t.Errorf("SyncState(%d).String() = %q, want %q", tt.state, got, tt.expected)
		}
	}
}

func TestClient_SyncStateTracking(t *testing.T) {
	client, err := NewClient(Config{
		Token:     "test-token",
		BoardName: "myboard",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Initial state should be disconnected
	if client.GetSyncState() != SyncDisconnected {
		t.Errorf("expected initial state SyncDisconnected, got %v", client.GetSyncState())
	}

	// Track state changes via callback
	var stateChanges []SyncState
	client.OnStateChange = func(state SyncState) {
		stateChanges = append(stateChanges, state)
	}

	// Simulate state changes
	client.setSyncState(SyncConnecting)
	client.setSyncState(SyncConnected)
	client.setSyncState(SyncDisconnected)

	if len(stateChanges) != 3 {
		t.Errorf("expected 3 state changes, got %d", len(stateChanges))
	}
	if stateChanges[0] != SyncConnecting {
		t.Errorf("expected first change to SyncConnecting, got %v", stateChanges[0])
	}
	if stateChanges[1] != SyncConnected {
		t.Errorf("expected second change to SyncConnected, got %v", stateChanges[1])
	}

	// GetLastSync should be set when connected
	if client.GetLastSync().IsZero() {
		t.Error("expected lastSync to be set after SyncConnected")
	}
}

func TestClient_OfflineQueue(t *testing.T) {
	client, err := NewClient(Config{
		Token:     "test-token",
		BoardName: "myboard",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Initially empty
	if client.PendingCount() != 0 {
		t.Errorf("expected 0 pending, got %d", client.PendingCount())
	}

	// Queue some messages
	client.queueMessage([]byte(`{"type":"test1"}`))
	client.queueMessage([]byte(`{"type":"test2"}`))
	client.queueMessage([]byte(`{"type":"test3"}`))

	if client.PendingCount() != 3 {
		t.Errorf("expected 3 pending, got %d", client.PendingCount())
	}
}

func TestClient_IsConnected(t *testing.T) {
	client, err := NewClient(Config{
		Token:     "test-token",
		BoardName: "myboard",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Not connected initially
	if client.IsConnected() {
		t.Error("expected IsConnected() to be false initially")
	}
}

func TestLoadConfig_SyncMode(t *testing.T) {
	os.Setenv(EnvToken, "test-token")
	defer os.Unsetenv(EnvToken)

	tickDir := "/tmp/myrepo/.tick"
	cfg := LoadConfig(tickDir, 3000)
	if cfg == nil {
		t.Fatal("expected config")
	}

	// Default mode should be relay
	if cfg.Mode != ModeRelay {
		t.Errorf("expected default mode ModeRelay, got %v", cfg.Mode)
	}

	// TickDir should be set
	if cfg.TickDir != tickDir {
		t.Errorf("expected TickDir %q, got %q", tickDir, cfg.TickDir)
	}

	// Can switch to sync mode
	cfg.Mode = ModeSync
	client, err := NewClient(*cfg)
	if err != nil {
		// Expected error since tickDir doesn't exist
		return
	}
	if client.mode != ModeSync {
		t.Errorf("expected ModeSync, got %v", client.mode)
	}
}
