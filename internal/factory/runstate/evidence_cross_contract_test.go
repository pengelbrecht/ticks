package runstate

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tkcontract"
)

// The contract that DEFINES the record this one places.
const jobProtocolFile = "../../../contracts/job-protocol.json"

// jobProtocol is the part of contracts/job-protocol.json this package reads:
// the records it publishes, and the $defs their schemas resolve through.
type jobProtocol struct {
	Contract string `json:"contract"`
	Records  map[string]struct {
		SchemaID string          `json:"schema_id"`
		Schema   json.RawMessage `json:"schema"`
	} `json:"records"`
	Defs     map[string]json.RawMessage `json:"$defs"`
	Examples struct {
		Golden []struct {
			Name     string          `json:"name"`
			Record   string          `json:"record"`
			Document map[string]any  `json:"document"`
			Raw      json.RawMessage `json:"-"`
		} `json:"golden"`
	} `json:"examples"`
}

func loadJobProtocol(t *testing.T) jobProtocol {
	t.Helper()
	raw, err := os.ReadFile(jobProtocolFile)
	if err != nil {
		t.Fatalf("read %s: %v", jobProtocolFile, err)
	}
	var c jobProtocol
	if err := json.Unmarshal(raw, &c); err != nil {
		t.Fatalf("parse %s: %v", jobProtocolFile, err)
	}
	return c
}

// referencedSchema resolves a record this contract references but does not
// define: contracts/ticfac-run-state.json says WHICH contract, which file and
// which schema_id, and this follows the pointer rather than trusting it.
//
// The strict subset has no cross-file $ref on purpose — a validator that could
// fetch another document would need a resolver both languages agree about —
// so the join is made here, in the readers, where it fails loudly.
func referencedSchema(t *testing.T, c runStateContract, record string) (*tkcontract.Schema, map[string]*tkcontract.Schema) {
	t.Helper()

	ref, ok := c.References[record]
	if !ok {
		t.Fatalf("record %q is not referenced", record)
	}
	if ref.File != "job-protocol.json" {
		t.Fatalf("references.%s names %s, which this reader does not know how to follow", record, ref.File)
	}

	jp := loadJobProtocol(t)
	if jp.Contract != ref.Contract {
		t.Fatalf("references.%s.contract = %q, but %s says it is %q", record, ref.Contract, ref.File, jp.Contract)
	}

	entry, ok := jp.Records[strings.TrimPrefix(ref.Pointer, "#/records/")]
	if !ok {
		t.Fatalf("references.%s.pointer %q resolves to nothing in %s", record, ref.Pointer, ref.File)
	}
	if entry.SchemaID != ref.SchemaID {
		t.Fatalf("references.%s.schema_id = %q, but %s publishes %q at %s",
			record, ref.SchemaID, ref.File, entry.SchemaID, ref.Pointer)
	}

	defs := map[string]*tkcontract.Schema{}
	for name, raw := range jp.Defs {
		s, err := tkcontract.ParseSchema(raw)
		if err != nil {
			t.Fatalf("%s $defs.%s: %v", ref.File, name, err)
		}
		defs[name] = s
	}
	schema, err := tkcontract.ParseSchema(entry.Schema)
	if err != nil {
		t.Fatalf("%s %s: %v", ref.File, ref.Pointer, err)
	}
	return schema, defs
}

// THE OTHER HALF OF THE TEST THAT WOULD HAVE CAUGHT IT.
//
// The job-protocol reader validates this contract's golden evidence example
// against the one definition. This one goes the other way: every golden
// evidence document THERE has to satisfy what this contract requires of a file
// it commits — the SPEC §10.4 envelope, and a key that can be the filename.
//
// Bundle 1.2.0 had neither direction. Each suite validated its own examples
// against its own schema, so a document that satisfied one and violated the
// other 22 ways was invisible to both.
func TestJobProtocolGoldenEvidenceSatisfiesTheEnvelope(t *testing.T) {
	c := load(t)
	jp := loadJobProtocol(t)

	if len(c.Envelope.RequiredOnEveryCommittedRecord) == 0 {
		t.Fatal("envelope.required_on_every_committed_record is empty")
	}

	var checked int
	for _, example := range jp.Examples.Golden {
		if example.Record != "evidence" {
			continue
		}
		checked++
		for _, field := range c.Envelope.RequiredOnEveryCommittedRecord {
			if _, ok := example.Document[field]; !ok {
				t.Errorf("job-protocol.json golden %q does not carry %q — SPEC §10.4 requires it "+
					"of every committed .ticfac/ file, and this record is one", example.Name, field)
			}
		}
		key, ok := example.Document["key"].(string)
		if !ok || key == "" {
			t.Errorf("job-protocol.json golden %q has no key — <key> is the filename at %s",
				example.Name, evidencePath(t, c))
			continue
		}
		if strings.ContainsAny(key, "/\\") || strings.HasPrefix(key, ".") {
			t.Errorf("job-protocol.json golden %q has key %q, which is not a single path segment",
				example.Name, key)
		}
	}
	if checked == 0 {
		t.Error("job-protocol.json ships no golden evidence example — nothing crossed the seam")
	}
}

// And the record this contract places validates against the definition it
// points at, followed rather than assumed. Same document, same schema, from
// the side that owns the path.
func TestGoldenEvidenceValidatesAgainstTheReferencedDefinition(t *testing.T) {
	c := load(t)
	schema, defs := referencedSchema(t, c, "evidence")

	raw, ok := c.Golden["evidence"]
	if !ok {
		t.Fatal("golden.evidence is missing")
	}
	var doc any
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("golden.evidence: %v", err)
	}
	if errs := tkcontract.Validate(schema, defs, doc); len(errs) > 0 {
		t.Errorf("golden.evidence does not validate against %s, the one definition of the record:\n  %s",
			c.References["evidence"].SchemaID, strings.Join(errs, "\n  "))
	}
}

// evidencePath is the layout path of the evidence record, for error messages
// that name the file rather than the record.
func evidencePath(t *testing.T, c runStateContract) string {
	t.Helper()
	for _, e := range c.Layout.Entries {
		if e.Record == "evidence" {
			return e.Path
		}
	}
	return fmt.Sprintf("(no layout entry for evidence)")
}
