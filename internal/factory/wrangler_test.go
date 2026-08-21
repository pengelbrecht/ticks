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

// A deploy whose bundle declares a container prints the image's whole Docker
// build log before it prints the deployment. That log is full of URLs — this
// is the real output shape that made a deploy record `factory_url=https://go.dev`
// and push it as the Worker's own base URL.
func TestParseDeployedURLIgnoresTheImageBuildLog(t *testing.T) {
	out := strings.Join([]string{
		"  Total Upload: 732.65 KiB / gzip: 161.31 KiB",
		`  #15 [ 3/14] RUN curl -fsSL -o /tmp/go.tar.gz "https://go.dev/dl/go1.24.11.linux-amd64.tar.gz"`,
		`  #16 [10/14] RUN curl -fsSL -o /tmp/tk.tar.gz "https://github.com/pengelbrecht/ticks/releases/download/v0.31.0/tk.tar.gz"`,
		"  https://docs.docker.com/go/credential-store/",
		"  Uploaded ticks-factory (7.87 sec)",
		"  Deployed ticks-factory triggers (6.19 sec)",
		"    https://ticks-factory.example.workers.dev",
		"    workflow: ticks-run",
		"  Current Version ID: 08f93d0c-b20c-43c4-8b88-797c875a7c9a",
	}, "\n")

	if got := parseDeployedURL(out); got != "https://ticks-factory.example.workers.dev" {
		t.Errorf("parseDeployedURL = %q, want the deployment's own endpoint", got)
	}
}

// A custom route prints something that is not a workers.dev host, and it still
// appears under the trigger banner.
func TestParseDeployedURLReadsACustomRoute(t *testing.T) {
	out := strings.Join([]string{
		`  #4 RUN curl https://go.dev/dl/go.tar.gz`,
		"  Deployed ticks-factory triggers (1.20 sec)",
		"    https://factory.example.com/*",
	}, "\n")

	if got := parseDeployedURL(out); got != "https://factory.example.com" {
		t.Errorf("parseDeployedURL = %q, want the custom route's host", got)
	}
}

// "I could not tell" has to stay a stop. Returning a URL scraped from
// somewhere else would be recorded in ~/.ticksrc and pushed as the Worker's
// own base URL, which is where every run's model traffic is pointed.
func TestParseDeployedURLRefusesToGuess(t *testing.T) {
	out := strings.Join([]string{
		`  #4 RUN curl -fsSL "https://go.dev/dl/go1.24.11.linux-amd64.tar.gz"`,
		"  Uploaded ticks-factory (7.87 sec)",
	}, "\n")

	if got := parseDeployedURL(out); got != "" {
		t.Errorf("parseDeployedURL = %q, want \"\" so the caller asks for --url", got)
	}
}
