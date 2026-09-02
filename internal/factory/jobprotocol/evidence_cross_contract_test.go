package jobprotocol

import (
	"encoding/json"
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tkcontract"
)

// runStateFile is contracts/ticfac-run-state.json — the contract that PLACES
// an evidence record without defining it.
const runStateFile = "../../../contracts/ticfac-run-state.json"

// THE TEST THAT WOULD HAVE CAUGHT IT.
//
// Bundle 1.2.0 described one file — .ticfac/runs/<run-id>/evidence/<key>.json —
// with two incompatible shapes: records.evidence here was flat and closed,
// evidence_envelope over there required a nested provenance object and a key.
// No document satisfied both, and both suites were green, because each
// validated its own examples against its own schema. Nothing in either reader
// ever put one contract's document in front of the other contract's schema.
//
// This does. It is the whole point of the reconciliation and it is
// deliberately cheap: read the other file, take its golden evidence example,
// and validate it here.
func TestRunStateGoldenEvidenceValidatesAgainstThisRecord(t *testing.T) {
	c := load(t)
	records, defs := parsed(t, c)

	rs := loadRunState(t)

	evidence, ok := records["evidence"]
	if !ok {
		t.Fatal("no evidence record")
	}

	var document any
	if err := json.Unmarshal(rs.Golden["evidence"], &document); err != nil {
		t.Fatalf("ticfac-run-state.json golden.evidence: %v", err)
	}
	if document == nil {
		t.Fatal("ticfac-run-state.json ships no golden evidence example to check")
	}

	if errs := tkcontract.Validate(evidence, defs, document); len(errs) > 0 {
		t.Errorf("the run-state contract's golden evidence example does not validate against\n"+
			"records.evidence (%s), which is the ONLY definition of the record:\n  %s\n\n"+
			"One file, one schema. Whichever side is wrong, fixing it is a bundle bump on both.",
			SchemaIDs["evidence"], strings.Join(errs, "\n  "))
	}
}

// The negative examples travel the same way. A run-state document that this
// contract's schema accepts is a refusal the other side only believes it makes.
func TestRunStateInvalidEvidenceIsRefusedHere(t *testing.T) {
	c := load(t)
	records, defs := parsed(t, c)
	rs := loadRunState(t)

	var checked int
	for i, bad := range rs.Invalid {
		if bad.Record != "evidence" {
			continue
		}
		checked++
		var document any
		if err := json.Unmarshal(bad.Document, &document); err != nil {
			t.Fatalf("ticfac-run-state.json invalid[%d]: %v", i, err)
		}
		if errs := tkcontract.Validate(records["evidence"], defs, document); len(errs) == 0 {
			t.Errorf("ticfac-run-state.json invalid[%d] (%s) VALIDATES against records.evidence — "+
				"the refusal that contract claims is not one this one makes", i, bad.Why)
		}
	}
	if checked == 0 {
		t.Error("the run-state contract carries no invalid evidence document — " +
			"the cross-file refusal is unproven")
	}
}

// The run-state contract must not carry a second evidence schema. A pointer is
// only worth anything while there is nothing beside it to drift from: two
// definitions of one record is exactly what 1.2.0 shipped.
func TestRunStateDefinesNoEvidenceSchemaOfItsOwn(t *testing.T) {
	rs := loadRunState(t)

	for name := range rs.Schemas {
		if strings.Contains(name, "evidence") {
			t.Errorf("contracts/ticfac-run-state.json still defines schemas.%s — "+
				"the evidence record is defined once, here, and referenced there", name)
		}
	}

	ref, ok := rs.References["evidence"]
	if !ok {
		t.Fatal("contracts/ticfac-run-state.json has no references.evidence pointing at this contract")
	}
	if ref.SchemaID != SchemaIDs["evidence"] {
		t.Errorf("references.evidence.schema_id = %q, want %q", ref.SchemaID, SchemaIDs["evidence"])
	}
	if ref.Contract != Contract {
		t.Errorf("references.evidence.contract = %q, want %q", ref.Contract, Contract)
	}
	if ref.File != "job-protocol.json" {
		t.Errorf("references.evidence.file = %q, want job-protocol.json", ref.File)
	}
	if ref.Pointer != "#/records/evidence" {
		t.Errorf("references.evidence.pointer = %q, want #/records/evidence", ref.Pointer)
	}
}

// Provenance is one shape, not two compatible ones. The run-state contract
// copies these $defs so its own local $refs resolve — the strict subset has no
// cross-file $ref — so the copy is compared structurally rather than trusted.
// A field added on one side only is the 1.2.0 failure in miniature.
func TestSharedDefsAreIdentical(t *testing.T) {
	c := load(t)
	rs := loadRunState(t)

	for _, name := range []string{"provenance", "phase", "executor", "role"} {
		here, ok := c.Defs[name]
		if !ok {
			t.Errorf("$defs.%s is missing from job-protocol.json", name)
			continue
		}
		there, ok := rs.Defs[name]
		if !ok {
			t.Errorf("$defs.%s is missing from ticfac-run-state.json, which references it", name)
			continue
		}
		var a, b any
		if err := json.Unmarshal(here, &a); err != nil {
			t.Fatalf("job-protocol.json $defs.%s: %v", name, err)
		}
		if err := json.Unmarshal(there, &b); err != nil {
			t.Fatalf("ticfac-run-state.json $defs.%s: %v", name, err)
		}
		if !reflect.DeepEqual(a, b) {
			t.Errorf("$defs.%s differs between job-protocol.json and ticfac-run-state.json.\n"+
				"They describe the same object in the same records; copy this one over rather\n"+
				"than letting the two spellings diverge.", name)
		}
	}
}

// runStateContract is the part of contracts/ticfac-run-state.json this package
// reads. The rest of it belongs to internal/factory/runstate.
type runStateContract struct {
	Envelope struct {
		RequiredOnEveryCommittedRecord []string `json:"required_on_every_committed_record"`
	} `json:"envelope"`
	References map[string]struct {
		Record   string `json:"record"`
		SchemaID string `json:"schema_id"`
		Contract string `json:"contract"`
		File     string `json:"file"`
		Pointer  string `json:"pointer"`
	} `json:"references"`
	Defs    map[string]json.RawMessage `json:"$defs"`
	Schemas map[string]json.RawMessage `json:"schemas"`
	Golden  map[string]json.RawMessage `json:"golden"`
	Invalid []struct {
		Record   string          `json:"record"`
		Why      string          `json:"why"`
		Document json.RawMessage `json:"document"`
	} `json:"invalid"`
}

func loadRunState(t *testing.T) runStateContract {
	t.Helper()
	raw, err := os.ReadFile(runStateFile)
	if err != nil {
		t.Fatalf("read %s: %v", runStateFile, err)
	}
	var c runStateContract
	if err := json.Unmarshal(raw, &c); err != nil {
		t.Fatalf("parse %s: %v", runStateFile, err)
	}
	return c
}
