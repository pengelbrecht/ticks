package contracts

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The bundle directory as seen from this package.
const bundleDir = "../../contracts"

// The contract bundle is versioned so that a consumer outside this repository
// — cloud/factory today, ticfac tomorrow — can pin an EXACT version and have
// that pin mean something. A version that does not name a fixed set of bytes
// pins nothing, so the bundle records a sha256 per file and this test is what
// makes the recording true.
func TestBundleVerifies(t *testing.T) {
	if err := Verify(bundleDir); err != nil {
		t.Fatalf("contract bundle is not valid:\n%v", err)
	}
}

// The changelog rule, executable. A bundle version with no changelog entry is
// a version nobody can read the meaning of, which is the whole reason a
// downstream pin bump is supposed to be a deliberate act.
func TestBundleVersionIsInTheChangelog(t *testing.T) {
	b, err := Load(bundleDir)
	if err != nil {
		t.Fatalf("load bundle: %v", err)
	}
	if err := VerifyChangelog(bundleDir, b.Version); err != nil {
		t.Fatalf("%v", err)
	}
}

// Every contract file on disk is in the bundle. Adding a fixture without
// listing it would leave it unversioned and unpinned — present for the Go
// readers, absent from anything a consumer vendors.
func TestBundleListsEveryContractOnDisk(t *testing.T) {
	b, err := Load(bundleDir)
	if err != nil {
		t.Fatalf("load bundle: %v", err)
	}
	onDisk, err := contractFilesOnDisk(bundleDir)
	if err != nil {
		t.Fatalf("scan %s: %v", bundleDir, err)
	}
	listed := map[string]bool{}
	for _, name := range b.Files {
		listed[name] = true
	}
	for _, name := range onDisk {
		if !listed[name] {
			t.Errorf("contracts/%s exists but is not listed in %s — "+
				"add it to \"files\" and re-run `make contracts-bundle`", name, BundleFile)
		}
	}
	if len(onDisk) != len(b.Files) {
		t.Errorf("bundle lists %d file(s), %d contract(s) on disk", len(b.Files), len(onDisk))
	}
}

// ---------------------------------------------------------------------------
// Negative controls.
//
// `.tick/learnings.md` and contracts/README.md both say the same thing: a
// copied JSON file with no executable check is not a contract. These three
// tests are what proves the check is executable — each deliberately breaks a
// fixture in a throwaway copy of the bundle and asserts the verifier refuses
// it. If someone weakens Verify into a warn-and-continue, THESE go red, which
// is the only way a gate can be shown to be a gate rather than asserted to be
// one.
// ---------------------------------------------------------------------------

func TestVerifyRejectsAnEditedFixture(t *testing.T) {
	dir := copyBundle(t)
	target := filepath.Join(dir, "worker-boot-contract.json")
	raw, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	// A single-character behavioural edit: the marker the boot probe looks for.
	edited := strings.Replace(string(raw), "\"probe_marker\"", "\"probe_marker_typo\"", 1)
	if edited == string(raw) {
		t.Fatalf("fixture no longer contains probe_marker; update this negative control")
	}
	if err := os.WriteFile(target, []byte(edited), 0o644); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	err = Verify(dir)
	if err == nil {
		t.Fatal("Verify accepted an edited fixture — the digest check is not a gate")
	}
	if !strings.Contains(err.Error(), "worker-boot-contract.json") {
		t.Fatalf("Verify failed but did not name the edited file: %v", err)
	}
}

func TestVerifyRejectsAnUnlistedFixture(t *testing.T) {
	dir := copyBundle(t)
	if err := os.WriteFile(filepath.Join(dir, "smuggled-cases.json"), []byte("{}\n"), 0o644); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	err := Verify(dir)
	if err == nil {
		t.Fatal("Verify accepted a contract that the bundle does not list")
	}
	if !strings.Contains(err.Error(), "smuggled-cases.json") {
		t.Fatalf("Verify failed but did not name the unlisted file: %v", err)
	}
}

func TestVerifyRejectsAMissingFixture(t *testing.T) {
	dir := copyBundle(t)
	if err := os.Remove(filepath.Join(dir, "tracker-layout.json")); err != nil {
		t.Fatalf("remove fixture: %v", err)
	}

	err := Verify(dir)
	if err == nil {
		t.Fatal("Verify accepted a bundle with a pinned file missing")
	}
	if !strings.Contains(err.Error(), "tracker-layout.json") {
		t.Fatalf("Verify failed but did not name the missing file: %v", err)
	}
}

func TestVerifyChangelogRejectsAnUnrecordedVersion(t *testing.T) {
	dir := copyBundle(t)
	err := VerifyChangelog(dir, "99.0.0")
	if err == nil {
		t.Fatal("VerifyChangelog accepted a version with no changelog entry")
	}
	if !strings.Contains(err.Error(), "99.0.0") {
		t.Fatalf("VerifyChangelog failed but did not name the version: %v", err)
	}
}

// copyBundle materialises a throwaway copy of contracts/ so a negative control
// can break a fixture without touching the tree the other tests read.
func copyBundle(t *testing.T) string {
	t.Helper()
	dst := t.TempDir()
	entries, err := os.ReadDir(bundleDir)
	if err != nil {
		t.Fatalf("read %s: %v", bundleDir, err)
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(bundleDir, e.Name()))
		if err != nil {
			t.Fatalf("read %s: %v", e.Name(), err)
		}
		if err := os.WriteFile(filepath.Join(dst, e.Name()), raw, 0o644); err != nil {
			t.Fatalf("write %s: %v", e.Name(), err)
		}
	}
	return dst
}
