package factory

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestFindWranglerFromRepositoryFactoryNodeModules(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("the wrangler fake is a POSIX shell script")
	}

	repoRoot := t.TempDir()
	localBin := filepath.Join(repoRoot, "cloud", "factory", "node_modules", ".bin")
	if err := os.MkdirAll(localBin, 0o755); err != nil {
		t.Fatal(err)
	}
	fake, err := filepath.Abs(filepath.Join("testdata", "fake-wrangler.sh"))
	if err != nil {
		t.Fatal(err)
	}
	localWrangler := filepath.Join(localBin, "wrangler")
	if err := os.Symlink(fake, localWrangler); err != nil {
		t.Fatal(err)
	}

	stateDir := t.TempDir()
	t.Setenv("FAKE_WRANGLER_STATE", stateDir)
	t.Setenv("FAKE_WRANGLER_LOG", filepath.Join(stateDir, "wrangler.log"))
	pathBin := t.TempDir()
	t.Setenv("PATH", pathBin+string(os.PathListSeparator)+"/bin")

	w, version, err := findWranglerFrom(context.Background(), io.Discard,
		filepath.Join(repoRoot, "staged-bundle"), repoRoot)
	if err != nil {
		t.Fatalf("findWranglerFrom: %v", err)
	}
	if version != "4.123.0" {
		t.Errorf("version = %q, want 4.123.0", version)
	}
	if filepath.Clean(w.bin) != filepath.Clean(localWrangler) {
		t.Errorf("resolved binary = %q, want repository copy %q", w.bin, localWrangler)
	}
	if !strings.Contains(w.label, "cloud/factory/node_modules/.bin/wrangler") {
		t.Errorf("label = %q, want the repository-local path", w.label)
	}
}

func TestFindWranglerFromStagedBundleNodeModules(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("the wrangler fake is a POSIX shell script")
	}

	root := t.TempDir()
	staged := filepath.Join(root, "staged-bundle")
	localBin := filepath.Join(staged, "node_modules", ".bin")
	if err := os.MkdirAll(localBin, 0o755); err != nil {
		t.Fatal(err)
	}
	fake, err := filepath.Abs(filepath.Join("testdata", "fake-wrangler.sh"))
	if err != nil {
		t.Fatal(err)
	}
	localWrangler := filepath.Join(localBin, "wrangler")
	if err := os.Symlink(fake, localWrangler); err != nil {
		t.Fatal(err)
	}

	stateDir := t.TempDir()
	t.Setenv("FAKE_WRANGLER_STATE", stateDir)
	t.Setenv("FAKE_WRANGLER_LOG", filepath.Join(stateDir, "wrangler.log"))
	pathBin := t.TempDir()
	t.Setenv("PATH", pathBin+string(os.PathListSeparator)+"/bin")

	w, version, err := findWranglerFrom(context.Background(), io.Discard, staged, filepath.Join(root, "repo"))
	if err != nil {
		t.Fatalf("findWranglerFrom: %v", err)
	}
	if version != "4.123.0" {
		t.Errorf("version = %q, want 4.123.0", version)
	}
	if filepath.Clean(w.bin) != filepath.Clean(localWrangler) {
		t.Errorf("resolved binary = %q, want staged copy %q", w.bin, localWrangler)
	}
	if w.label != "staged bundle Wrangler" {
		t.Errorf("label = %q, want staged bundle Wrangler", w.label)
	}
}

func TestFindWranglerSkipsNpxThatReportsItsOwnVersion(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("the wrangler fakes are POSIX shell scripts")
	}

	repoRoot := t.TempDir()
	localBin := filepath.Join(repoRoot, "cloud", "factory", "node_modules", ".bin")
	if err := os.MkdirAll(localBin, 0o755); err != nil {
		t.Fatal(err)
	}
	fakeWrangler, err := filepath.Abs(filepath.Join("testdata", "fake-wrangler.sh"))
	if err != nil {
		t.Fatal(err)
	}
	localWrangler := filepath.Join(localBin, "wrangler")
	if err := os.Symlink(fakeWrangler, localWrangler); err != nil {
		t.Fatal(err)
	}

	stateDir := t.TempDir()
	t.Setenv("FAKE_WRANGLER_STATE", stateDir)
	t.Setenv("FAKE_WRANGLER_LOG", filepath.Join(stateDir, "wrangler.log"))

	pathBin := t.TempDir()
	npxPath := filepath.Join(pathBin, "npx")
	if err := os.WriteFile(npxPath, []byte("#!/bin/sh\nprintf '%s\\n' '11.13.0'\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", pathBin+string(os.PathListSeparator)+"/bin")

	// This is the green-start trap: npx exits successfully but answered with
	// npm's version, so the resolver must reject it as a Wrangler candidate.
	npx := &wrangler{
		bin:    npxPath,
		prefix: []string{"--no", "wrangler"},
		out:    io.Discard,
	}
	if version, err := npx.probeVersion(context.Background()); err == nil {
		t.Fatalf("npx probe accepted unrelated version %q", version)
	}

	w, version, err := findWranglerFrom(context.Background(), io.Discard,
		filepath.Join(repoRoot, "staged-bundle"), repoRoot)
	if err != nil {
		t.Fatalf("findWranglerFrom: %v", err)
	}
	if version != "4.123.0" {
		t.Errorf("version = %q, want 4.123.0", version)
	}
	if filepath.Clean(w.bin) != filepath.Clean(localWrangler) {
		t.Errorf("resolved binary = %q, want repository copy %q", w.bin, localWrangler)
	}
	if w.label != "cloud/factory/node_modules/.bin/wrangler" {
		t.Errorf("label = %q, want repository-local Wrangler", w.label)
	}
}
