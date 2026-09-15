package cloudcredentials

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadFromMissingFileIsEmpty(t *testing.T) {
	f, err := LoadFrom(filepath.Join(t.TempDir(), ".ticfacrc"))
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}
	if got := f.Get(KeyURL); got != "" {
		t.Fatalf("Get(KeyURL) on a missing file = %q, want empty", got)
	}
}

func TestSetSaveLoadRoundTrips(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".ticfacrc")
	f, err := LoadFrom(path)
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}
	f.Set(KeyURL, "https://example.workers.dev")
	f.Set(KeyToken, "tkf_abc")
	if err := f.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	if perm := info.Mode().Perm(); perm != fileMode {
		t.Errorf("file mode = %o, want %o", perm, fileMode)
	}

	reloaded, err := LoadFrom(path)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if got := reloaded.Get(KeyURL); got != "https://example.workers.dev" {
		t.Errorf("Get(KeyURL) = %q", got)
	}
	if got := reloaded.Get(KeyToken); got != "tkf_abc" {
		t.Errorf("Get(KeyToken) = %q", got)
	}
}

func TestSetReplacesExistingKeyInPlace(t *testing.T) {
	f, err := LoadFrom(filepath.Join(t.TempDir(), ".ticfacrc"))
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}
	f.Set(KeyURL, "https://one.example")
	f.Set(KeyToken, "tok")
	f.Set(KeyURL, "https://two.example")

	if got := f.Get(KeyURL); got != "https://two.example" {
		t.Errorf("Get(KeyURL) after replace = %q", got)
	}
	if got := f.Get(KeyToken); got != "tok" {
		t.Errorf("unrelated key disturbed: Get(KeyToken) = %q", got)
	}
}
