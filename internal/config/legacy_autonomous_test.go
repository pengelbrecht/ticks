package config

import (
	"os"
	"path/filepath"
	"testing"
)

// policy.autonomous_mode was a runner switch and left with the runner (epic
// chz). A config.json written while it existed must still load: the key is
// ignored, never an error.
func TestLegacyAutonomousModeKeyStillLoads(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	data := []byte(`{"version": 1, "id_length": 3, "policy": {"autonomous_mode": true, "max_attempts": 5}}`)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("a config carrying the retired autonomous_mode key must load: %v", err)
	}
	if got := cfg.Policy.GetMaxAttempts(); got != 5 {
		t.Fatalf("max_attempts = %d, want 5 (the rest of the policy must still parse)", got)
	}
}
