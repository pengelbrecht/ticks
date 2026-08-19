package factory

import (
	"os"
	"path/filepath"
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
