package contracts

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The rule, against the real bundle: a record described by two contracts is
// defined by exactly one of them.
func TestSchemaIDsResolveToOneDefinition(t *testing.T) {
	if err := VerifySchemaIDs(bundleDir); err != nil {
		t.Fatalf("%v", err)
	}
}

// The evidence record is the one that crosses a file boundary today, and the
// one bundle 1.2.0 got wrong. Pinning it by name keeps the check above from
// passing merely because nothing crosses any more.
func TestTheEvidenceRecordCrossesTwoContractsAndIsDefinedOnce(t *testing.T) {
	uses := map[string][]SchemaIDUse{}
	names, err := contractFilesOnDisk(bundleDir)
	if err != nil {
		t.Fatalf("scan %s: %v", bundleDir, err)
	}
	for _, name := range names {
		raw, err := os.ReadFile(filepath.Join(bundleDir, name))
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		var document any
		if err := json.Unmarshal(raw, &document); err != nil {
			t.Fatalf("parse %s: %v", name, err)
		}
		collectSchemaIDs(document, name, "", uses)
	}

	const evidence = "ticfac.evidence.v1"
	appearances := uses[evidence]
	if len(appearances) == 0 {
		t.Fatalf("no contract in the bundle publishes %s", evidence)
	}

	files := map[string]bool{}
	definitions := map[string]string{}
	for _, use := range appearances {
		files[use.File] = true
		if use.Defines {
			definitions[use.File] = use.Pointer
		}
	}

	if len(files) < 2 {
		t.Errorf("%s appears in %v — it is the record two contracts share (job-protocol.json "+
			"defines it, ticfac-run-state.json places the file), so a single file means one of "+
			"the two stopped naming it", evidence, sortedKeys(files))
	}
	if len(definitions) != 1 {
		t.Fatalf("%s is defined in %v, want exactly one contract", evidence, definitions)
	}
	if pointer, ok := definitions["job-protocol.json"]; !ok || pointer != "records.evidence" {
		t.Errorf("%s is defined at %v, want job-protocol.json records.evidence", evidence, definitions)
	}
}

// THE NEGATIVE CONTROL. contracts/README.md: a check nothing has ever seen fail
// is not known to be a check. This rebuilds the exact shape bundle 1.2.0
// shipped — the same schema_id defined in two files — in a throwaway copy, and
// asserts the check refuses it.
func TestSchemaIDCheckRefusesASecondDefinition(t *testing.T) {
	dir := t.TempDir()

	names, err := contractFilesOnDisk(bundleDir)
	if err != nil {
		t.Fatalf("scan %s: %v", bundleDir, err)
	}
	for _, name := range names {
		raw, err := os.ReadFile(filepath.Join(bundleDir, name))
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		if err := os.WriteFile(filepath.Join(dir, name), raw, 0o644); err != nil {
			t.Fatalf("write %s: %v", name, err)
		}
	}

	// Give the run-state contract an evidence schema of its own again.
	path := filepath.Join(dir, "ticfac-run-state.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	var runState map[string]any
	if err := json.Unmarshal(raw, &runState); err != nil {
		t.Fatalf("parse %s: %v", path, err)
	}
	schemas, ok := runState["schemas"].(map[string]any)
	if !ok {
		t.Fatal("ticfac-run-state.json has no schemas object; update this control")
	}
	schemas["evidence_envelope"] = map[string]any{
		"schema_id": "ticfac.evidence.v1",
		"schema": map[string]any{
			"type":                 "object",
			"required":             []any{"schema_version", "key", "provenance"},
			"additionalProperties": true,
		},
	}
	patched, err := json.MarshalIndent(runState, "", "  ")
	if err != nil {
		t.Fatalf("re-encode: %v", err)
	}
	if err := os.WriteFile(path, patched, 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}

	err = VerifySchemaIDs(dir)
	if err == nil {
		t.Fatal("VerifySchemaIDs accepted two definitions of ticfac.evidence.v1 — " +
			"the check is not a check, and this is exactly what bundle 1.2.0 shipped")
	}
	if !strings.Contains(err.Error(), "ticfac.evidence.v1") {
		t.Errorf("the refusal does not name the record: %v", err)
	}
	if !strings.Contains(err.Error(), "defined 2 times") {
		t.Errorf("the refusal does not say what is wrong: %v", err)
	}
}

// And the other failure the rule covers: a reference with nothing behind it.
func TestSchemaIDCheckRefusesADanglingReference(t *testing.T) {
	dir := t.TempDir()

	for _, name := range []string{"a-contract.json", "b-contract.json"} {
		body := `{"records":{"thing":{"schema_id":"ticfac.thing.v1"}}}`
		if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o644); err != nil {
			t.Fatalf("write %s: %v", name, err)
		}
	}

	err := VerifySchemaIDs(dir)
	if err == nil {
		t.Fatal("VerifySchemaIDs accepted a schema_id two contracts name and neither defines")
	}
	if !strings.Contains(err.Error(), "defined nowhere") {
		t.Errorf("the refusal does not say the definition is missing: %v", err)
	}
}
