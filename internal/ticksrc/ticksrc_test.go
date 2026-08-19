package ticksrc

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestLoadMissingFileIsEmpty(t *testing.T) {
	path := filepath.Join(t.TempDir(), FileName)

	f, err := LoadFrom(path)
	if err != nil {
		t.Fatalf("LoadFrom on missing file: %v", err)
	}
	if got := f.Get(KeyFactoryToken); got != "" {
		t.Errorf("Get(%s) = %q, want empty", KeyFactoryToken, got)
	}
}

func TestSetThenGetRoundTrips(t *testing.T) {
	path := filepath.Join(t.TempDir(), FileName)

	f, err := LoadFrom(path)
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}
	f.Set(KeyFactoryURL, "https://ticks-factory.acme.workers.dev")
	f.Set(KeyFactoryToken, "tkf_abc")
	if err := f.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	reloaded, err := LoadFrom(path)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if got := reloaded.Get(KeyFactoryURL); got != "https://ticks-factory.acme.workers.dev" {
		t.Errorf("factory_url = %q", got)
	}
	if got := reloaded.Get(KeyFactoryToken); got != "tkf_abc" {
		t.Errorf("factory_token = %q", got)
	}
}

// The factory keys must land *alongside* the existing TICKS_TOKEN convention:
// board sync reads token=/url= from the same file and a deploy that dropped
// them would silently unconfigure the board.
func TestSavePreservesUnknownLinesAndComments(t *testing.T) {
	path := filepath.Join(t.TempDir(), FileName)
	original := "# my ticks config\ntoken=board-token\nurl=wss://ticks.sh/api/projects\nsomething_else=keep me\n"
	if err := os.WriteFile(path, []byte(original), 0o600); err != nil {
		t.Fatal(err)
	}

	f, err := LoadFrom(path)
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}
	f.Set(KeyFactoryURL, "https://f.example.com")
	if err := f.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	got := string(data)
	for _, want := range []string{"# my ticks config", "token=board-token", "url=wss://ticks.sh/api/projects", "something_else=keep me", "factory_url=https://f.example.com"} {
		if !strings.Contains(got, want) {
			t.Errorf("saved file lost %q:\n%s", want, got)
		}
	}
	// url= must not be confused with factory_url= (prefix collision).
	if f.Get(KeyURL) != "wss://ticks.sh/api/projects" {
		t.Errorf("url = %q, want the board URL", f.Get(KeyURL))
	}
}

func TestSetReplacesInPlace(t *testing.T) {
	path := filepath.Join(t.TempDir(), FileName)
	if err := os.WriteFile(path, []byte("factory_url=https://old\ntoken=t\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	f, _ := LoadFrom(path)
	f.Set(KeyFactoryURL, "https://new")
	if err := f.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	data, _ := os.ReadFile(path)
	if strings.Contains(string(data), "https://old") {
		t.Errorf("old value still present:\n%s", data)
	}
	if strings.Count(string(data), "factory_url=") != 1 {
		t.Errorf("factory_url duplicated:\n%s", data)
	}
}

// The file holds a bearer token: it must never be group- or world-readable.
func TestSaveUsesOwnerOnlyPermissions(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("unix permission bits")
	}
	path := filepath.Join(t.TempDir(), FileName)

	f, _ := LoadFrom(path)
	f.Set(KeyFactoryToken, "tkf_secret")
	if err := f.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Errorf("mode = %o, want 600", perm)
	}
}

func TestSaveTightensPermissionsOnExistingFile(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("unix permission bits")
	}
	path := filepath.Join(t.TempDir(), FileName)
	if err := os.WriteFile(path, []byte("token=t\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	f, _ := LoadFrom(path)
	f.Set(KeyFactoryToken, "tkf_secret")
	if err := f.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	info, _ := os.Stat(path)
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Errorf("mode = %o, want 600", perm)
	}
}

func TestPathHonoursHome(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if runtime.GOOS == "windows" {
		t.Setenv("USERPROFILE", home)
	}

	path, err := Path()
	if err != nil {
		t.Fatalf("Path: %v", err)
	}
	if want := filepath.Join(home, FileName); path != want {
		t.Errorf("Path() = %q, want %q", path, want)
	}
}

func TestLegacyBareTokenLineIsPreserved(t *testing.T) {
	path := filepath.Join(t.TempDir(), FileName)
	if err := os.WriteFile(path, []byte("bare-legacy-token\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	f, _ := LoadFrom(path)
	f.Set(KeyFactoryToken, "tkf_new")
	if err := f.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	data, _ := os.ReadFile(path)
	if !strings.Contains(string(data), "bare-legacy-token") {
		t.Errorf("legacy bare token line dropped:\n%s", data)
	}
}
