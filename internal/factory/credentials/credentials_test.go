package credentials

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
	if got := f.Get(KeyToken); got != "" {
		t.Errorf("Get(%s) = %q, want empty", KeyToken, got)
	}
}

func TestSetThenGetRoundTrips(t *testing.T) {
	path := filepath.Join(t.TempDir(), FileName)

	f, err := LoadFrom(path)
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}
	f.Set(KeyURL, "https://ticks-factory.acme.workers.dev")
	f.Set(KeyToken, "tkf_abc")
	if err := f.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	reloaded, err := LoadFrom(path)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if got := reloaded.Get(KeyURL); got != "https://ticks-factory.acme.workers.dev" {
		t.Errorf("factory_url = %q", got)
	}
	if got := reloaded.Get(KeyToken); got != "tkf_abc" {
		t.Errorf("factory_token = %q", got)
	}
}

func TestSavePreservesUnknownLinesAndComments(t *testing.T) {
	path := filepath.Join(t.TempDir(), FileName)
	original := "# my factory config\nfactory_github_repo=acme/widgets\nsomething_else=keep me\n"
	if err := os.WriteFile(path, []byte(original), 0o600); err != nil {
		t.Fatal(err)
	}

	f, err := LoadFrom(path)
	if err != nil {
		t.Fatalf("LoadFrom: %v", err)
	}
	f.Set(KeyURL, "https://f.example.com")
	if err := f.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	got := string(data)
	for _, want := range []string{
		"# my factory config", "factory_github_repo=acme/widgets", "something_else=keep me",
		"factory_url=https://f.example.com",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("saved file lost %q:\n%s", want, got)
		}
	}
}

func TestSetReplacesInPlace(t *testing.T) {
	path := filepath.Join(t.TempDir(), FileName)
	if err := os.WriteFile(path, []byte("factory_url=https://old\nfactory_token=t\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	f, _ := LoadFrom(path)
	f.Set(KeyURL, "https://new")
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

// The file holds bearer tokens: it must never be group- or world-readable.
func TestSaveUsesOwnerOnlyPermissions(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("unix permission bits")
	}
	path := filepath.Join(t.TempDir(), FileName)

	f, _ := LoadFrom(path)
	f.Set(KeyToken, "tkf_secret")
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
	if err := os.WriteFile(path, []byte("factory_token=t\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	f, _ := LoadFrom(path)
	f.Set(KeyToken, "tkf_secret")
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
