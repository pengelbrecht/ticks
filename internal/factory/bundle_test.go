package factory

import (
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"testing"
)

func TestBundlePathsCoverWhatWranglerNeeds(t *testing.T) {
	paths := BundlePaths()
	want := []string{
		"wrangler.toml",
		"src/index.ts",
		"src/auth.ts",
		"src/run-room.ts",
		"src/run-workflow.ts",
		"src/sandbox.ts",
		"src/artifacts.ts",
		"src/env.d.ts",
		"migrations/0001_init.sql",
		"package.json",
	}
	have := make(map[string]bool, len(paths))
	for _, p := range paths {
		have[p] = true
	}
	for _, w := range want {
		if !have[w] {
			t.Errorf("embedded factory bundle is missing %s (got %v)", w, paths)
		}
	}
}

// node_modules is never committed, but a developer who ran `pnpm install` in
// cloud/factory must not end up embedding it into the binary.
func TestBundleExcludesDependenciesAndTests(t *testing.T) {
	for _, p := range BundlePaths() {
		if strings.HasPrefix(p, "node_modules/") || strings.HasPrefix(p, ".wrangler/") {
			t.Errorf("bundle contains build output: %s", p)
		}
	}
}

func TestMaterializeWritesTheBundle(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "bundle")

	if err := Materialize(dir); err != nil {
		t.Fatalf("Materialize: %v", err)
	}

	for _, p := range []string{"wrangler.toml", "src/index.ts", "migrations/0001_init.sql"} {
		if _, err := os.Stat(filepath.Join(dir, filepath.FromSlash(p))); err != nil {
			t.Errorf("materialized bundle missing %s: %v", p, err)
		}
	}
	toml, err := os.ReadFile(filepath.Join(dir, "wrangler.toml"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(toml), `name = "ticks-factory"`) {
		t.Errorf("wrangler.toml does not look like the factory config:\n%s", toml)
	}
}

// Re-running a deploy must not leave a file from the previous tk version
// behind: the deployed bundle is exactly the embedded one, or the pin is a lie.
func TestMaterializeReplacesStaleFiles(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "bundle")
	if err := Materialize(dir); err != nil {
		t.Fatal(err)
	}
	stale := filepath.Join(dir, "src", "left-over.ts")
	if err := os.WriteFile(stale, []byte("// from an older tk"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := Materialize(dir); err != nil {
		t.Fatalf("re-Materialize: %v", err)
	}

	if _, err := os.Stat(stale); !os.IsNotExist(err) {
		t.Errorf("stale file survived re-materialization (err=%v)", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "wrangler.toml")); err != nil {
		t.Errorf("re-materialization lost the bundle: %v", err)
	}
}

func TestBundleSHAIsStableAndContentAddressed(t *testing.T) {
	first := BundleSHA()
	if len(first) != 64 {
		t.Fatalf("BundleSHA() = %q, want 64 hex chars", first)
	}
	if second := BundleSHA(); second != first {
		t.Errorf("BundleSHA is not stable: %s then %s", first, second)
	}
}

func TestSetDatabaseIDRewritesOnlyTheID(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "bundle")
	if err := Materialize(dir); err != nil {
		t.Fatal(err)
	}

	const id = "11111111-2222-3333-4444-555555555555"
	if err := SetDatabaseID(dir, id); err != nil {
		t.Fatalf("SetDatabaseID: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(dir, "wrangler.toml"))
	if err != nil {
		t.Fatal(err)
	}
	toml := string(data)
	if !strings.Contains(toml, `database_id = "`+id+`"`) {
		t.Errorf("database_id not rewritten:\n%s", toml)
	}
	if strings.Contains(toml, placeholderDatabaseID) {
		t.Errorf("placeholder database_id survived:\n%s", toml)
	}
	if !strings.Contains(toml, `bucket_name = "ticks-factory-artifacts"`) {
		t.Errorf("SetDatabaseID disturbed the rest of the config:\n%s", toml)
	}
	// One assignment only ("database_id" also appears in a comment).
	if n := strings.Count(toml, "database_id = "); n != 1 {
		t.Errorf("database_id assigned %d times, want 1:\n%s", n, toml)
	}
}

func TestSetDatabaseIDRejectsAMalformedID(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "bundle")
	if err := Materialize(dir); err != nil {
		t.Fatal(err)
	}

	if err := SetDatabaseID(dir, `oops" \n name = "not-the-factory`); err == nil {
		t.Error("a database id that would break out of the TOML string was accepted")
	}
}

func TestMaterializedFilesAreOwnerWritable(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("unix permission bits")
	}
	dir := filepath.Join(t.TempDir(), "bundle")
	if err := Materialize(dir); err != nil {
		t.Fatal(err)
	}
	// SetDatabaseID rewrites wrangler.toml on every deploy; a read-only copy
	// would make the second run fail.
	info, err := os.Stat(filepath.Join(dir, "wrangler.toml"))
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm()&0o200 == 0 {
		t.Errorf("wrangler.toml is not writable: %o", info.Mode().Perm())
	}
}

// The bundle has to DECLARE the container, or a deployment is a control plane
// that refuses every run with a message naming a remedy — `tk factory deploy` —
// that cannot supply what the bundle never contained. That is the shape the
// live factory shipped in, and it is what this guards.
func TestBundleDeclaresTheContainerBinding(t *testing.T) {
	data, err := ReadBundleFile(WranglerConfigFile)
	if err != nil {
		t.Fatal(err)
	}
	toml := string(data)

	for _, want := range []string{
		`name = "SANDBOXES"`,
		`class_name = "Sandbox"`,
		"[[containers]]",
		`new_sqlite_classes = ["Sandbox"]`,
	} {
		if !strings.Contains(toml, want) {
			t.Errorf("wrangler.toml does not declare %s:\n%s", want, toml)
		}
	}
}

// The image path in the committed config has to resolve to the tree the deploy
// stages — the same relative path, true in the repository and in the bundle.
func TestContainerImagePathResolvesToTheStagedContext(t *testing.T) {
	bundleDir := filepath.Join(t.TempDir(), "bundle")
	if err := Materialize(bundleDir); err != nil {
		t.Fatal(err)
	}
	if err := MaterializeSandbox(SandboxDir(bundleDir)); err != nil {
		t.Fatal(err)
	}

	data, err := os.ReadFile(filepath.Join(bundleDir, WranglerConfigFile))
	if err != nil {
		t.Fatal(err)
	}
	image := containerImagePath(t, string(data))
	if _, err := os.Stat(filepath.Join(bundleDir, filepath.FromSlash(image))); err != nil {
		t.Errorf("the container image path %q does not resolve from the staged bundle: %v", image, err)
	}
}

// containerImagePath reads the single `image = "..."` assignment out of the
// config. A regex rather than a TOML parser because the assertion is about one
// literal line, and a parser here would be a second grammar to keep honest.
func containerImagePath(t *testing.T, toml string) string {
	t.Helper()
	match := regexp.MustCompile(`(?m)^image\s*=\s*"([^"]+)"`).FindStringSubmatch(toml)
	if match == nil {
		t.Fatalf("wrangler.toml declares no container image:\n%s", toml)
	}
	return match[1]
}

// The Worker imports the Cloudflare Sandbox SDK, so the deploy installs the
// bundle before deploying it — with the lockfile, or the deployed dependency
// tree is whatever npm published today rather than what this build pins.
func TestBundleShipsTheLockfileTheInstallNeeds(t *testing.T) {
	have := make(map[string]bool)
	for _, p := range BundlePaths() {
		have[p] = true
	}
	for _, want := range []string{"package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"} {
		if !have[want] {
			t.Errorf("the bundle does not ship %s, so `pnpm install --frozen-lockfile` cannot run", want)
		}
	}
}

func TestSandboxContextShipsTheImage(t *testing.T) {
	have := make(map[string]bool)
	for _, p := range SandboxPaths() {
		have[p] = true
	}
	// What the Dockerfile COPYs, plus the Dockerfile: the build context is
	// the image, and an image missing its entrypoint boots into nothing.
	for _, want := range []string{"Dockerfile", "entrypoint.sh", "preflight.sh"} {
		if !have[want] {
			t.Errorf("the embedded image context is missing %s (got %v)", want, SandboxPaths())
		}
	}
}

func TestMaterializeSandboxStagesTheBuildContext(t *testing.T) {
	bundleDir := filepath.Join(t.TempDir(), "bundle")
	dir := SandboxDir(bundleDir)

	if err := MaterializeSandbox(dir); err != nil {
		t.Fatalf("MaterializeSandbox: %v", err)
	}

	if filepath.Dir(dir) != filepath.Dir(bundleDir) {
		t.Errorf("the image context %q is not a sibling of the bundle %q", dir, bundleDir)
	}
	data, err := os.ReadFile(filepath.Join(dir, "Dockerfile"))
	if err != nil {
		t.Fatalf("staged Dockerfile: %v", err)
	}
	if !strings.Contains(string(data), "FROM docker.io/cloudflare/sandbox") {
		t.Errorf("the staged Dockerfile is not the orchestrator image:\n%s", data)
	}
}
