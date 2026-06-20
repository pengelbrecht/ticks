package config

import (
	"encoding/json"
	"path/filepath"
	"testing"
)

func TestPolicyConfig_AutonomousModeDefaultsFalse(t *testing.T) {
	var nilPolicy *PolicyConfig
	if nilPolicy.GetAutonomousMode() {
		t.Fatalf("nil PolicyConfig GetAutonomousMode() = true, want false")
	}
	if DefaultAutonomousMode {
		t.Fatalf("DefaultAutonomousMode = true, want false")
	}
	emptyPolicy := &PolicyConfig{}
	if emptyPolicy.GetAutonomousMode() {
		t.Fatalf("empty PolicyConfig GetAutonomousMode() = true, want false")
	}
}

func TestPolicyConfig_AutonomousModeExplicit(t *testing.T) {
	on := true
	off := false
	if !(&PolicyConfig{AutonomousMode: &on}).GetAutonomousMode() {
		t.Fatalf("AutonomousMode=true should report true")
	}
	if (&PolicyConfig{AutonomousMode: &off}).GetAutonomousMode() {
		t.Fatalf("AutonomousMode=false should report false")
	}
}

func TestPolicyConfig_AutonomousModeJSONParsing(t *testing.T) {
	data := []byte(`{"autonomous_mode": true}`)
	var p PolicyConfig
	if err := json.Unmarshal(data, &p); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !p.GetAutonomousMode() {
		t.Fatalf("parsed autonomous_mode should be true")
	}
}

func TestPolicyConfig_AutonomousModeRoundTrip(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	on := true
	cfg := Config{
		Version:  DefaultVersion,
		IDLength: DefaultIDLength,
		Policy:   &PolicyConfig{AutonomousMode: &on},
	}
	if err := Save(path, cfg); err != nil {
		t.Fatalf("save: %v", err)
	}
	loaded, err := Load(path)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if !loaded.Policy.GetAutonomousMode() {
		t.Fatalf("round-tripped autonomous_mode should be true")
	}
}

// TestPolicyConfig_AutonomousModeOmittedFromJSON confirms the field is omitted
// when nil (no behavioral change to existing configs).
func TestPolicyConfig_AutonomousModeOmittedFromJSON(t *testing.T) {
	p := &PolicyConfig{}
	data, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if string(data) != "{}" {
		t.Fatalf("empty policy should marshal to {}, got %s", data)
	}
}
