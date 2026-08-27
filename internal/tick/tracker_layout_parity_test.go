package tick

import (
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/trace"
)

// The tracker's on-disk layout has a second reader since tick kya:
// cloud/factory/src/tick-membership.ts, which reads one tick's record at a
// commit through GitHub's contents API so `POST /api/wave` can refuse a wave
// naming ticks that do not belong to the run's epic — the check
// `tk cloud spawn` has always made at the other dispatch door.
//
// This package owns the format, so a change here is legitimate and a change
// there is a follow. What makes the follow easy to forget is the direction the
// Worker's check fails in: a tracker it cannot read ALLOWS the wave, on the
// grounds that a second reader of someone else's format must not fail a live
// run on its own authority. So a layout change landing in Go alone would not
// break the factory loudly — it would quietly turn every verdict into
// "unreadable", and the check would stop refusing anything while both suites
// stayed green.
//
// Hence the fixture, checked from here and from
// cloud/factory/test/tick-membership.test.ts.

// A record the Store accepts: the fields under test are the layout ones, and
// everything else here is only what validation insists on.
func validTick(id, kind, parent string) Tick {
	now := time.Now().UTC()
	return Tick{
		ID:        id,
		Title:     "parity",
		Status:    StatusOpen,
		Type:      kind,
		Parent:    parent,
		Owner:     "parity@example.com",
		CreatedBy: "parity@example.com",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

const trackerLayoutFile = "../../contracts/tracker-layout.json"

type trackerLayout struct {
	RecordDir         string `json:"record_dir"`
	RecordPathExample struct {
		Tick string `json:"tick"`
		Path string `json:"path"`
	} `json:"record_path_example"`
	Fields struct {
		ID          string `json:"id"`
		Type        string `json:"type"`
		Parent      string `json:"parent"`
		ExternalRef string `json:"external_ref"`
		TraceID     string `json:"trace_id"`
	} `json:"fields"`
	EpicType string `json:"epic_type"`
	Trace    struct {
		Prefix           string `json:"prefix"`
		HexLength        int    `json:"hex_length"`
		Pattern          string `json:"pattern"`
		Example          string `json:"example"`
		OmittedWhenEmpty bool   `json:"omitted_when_empty"`
	} `json:"trace_id"`
	ParentOmittedWhenEmpty bool `json:"parent_omitted_when_empty"`
	HumanGate              struct {
		Statuses        []string `json:"statuses"`
		CommittedStatus string   `json:"committed_status"`
		RejectedStatus  string   `json:"rejected_status"`
	} `json:"human_gate"`
	Written struct {
		RequiredFields              []string `json:"required_fields"`
		DefaultStatus               string   `json:"default_status"`
		DefaultType                 string   `json:"default_type"`
		DefaultPriority             int      `json:"default_priority"`
		IDAlphabet                  string   `json:"id_alphabet"`
		IDMinLength                 int      `json:"id_min_length"`
		IDMaxLength                 int      `json:"id_max_length"`
		IDAttemptsPerLength         int      `json:"id_attempts_per_length"`
		JSONIndent                  int      `json:"json_indent"`
		ExternalRefSeparator        string   `json:"external_ref_separator"`
		ExternalRefOmittedWhenEmpty bool     `json:"external_ref_omitted_when_empty"`
	} `json:"written_by_the_control_plane"`
}

func readTrackerLayout(t *testing.T) trackerLayout {
	t.Helper()
	data, err := os.ReadFile(trackerLayoutFile)
	if err != nil {
		t.Fatalf("read %s: %v", trackerLayoutFile, err)
	}
	var layout trackerLayout
	if err := json.Unmarshal(data, &layout); err != nil {
		t.Fatalf("parse %s: %v", trackerLayoutFile, err)
	}
	return layout
}

// The Store writes where the fixture says it does, so the control plane's
// contents-API path resolves to the same file this package created.
func TestTrackerLayoutRecordPathMatchesFixture(t *testing.T) {
	layout := readTrackerLayout(t)

	root := t.TempDir()
	store := NewStore(filepath.Join(root, ".tick"))
	id := layout.RecordPathExample.Tick
	if err := store.Write(validTick(id, TypeTask, "")); err != nil {
		t.Fatalf("write tick: %v", err)
	}

	want := filepath.Join(root, filepath.FromSlash(layout.RecordPathExample.Path))
	if _, err := os.Stat(want); err != nil {
		t.Fatalf("the fixture says a tick lands at %s; stat: %v", layout.RecordPathExample.Path, err)
	}
	if got := filepath.ToSlash(filepath.Join(layout.RecordDir, id+".json")); got != layout.RecordPathExample.Path {
		t.Fatalf("fixture is inconsistent with itself: record_dir gives %s, example says %s",
			got, layout.RecordPathExample.Path)
	}
}

// The three fields the Worker reads out of a record are spelled the way the
// fixture says, an epic's type is the value it says, and an empty parent is
// omitted rather than written as "" — which is why the Worker's parser treats
// a missing `parent` and an empty one as the same thing.
func TestTrackerLayoutRecordFieldsMatchFixture(t *testing.T) {
	layout := readTrackerLayout(t)

	if TypeEpic != layout.EpicType {
		t.Fatalf("epic type is %q, fixture says %q", TypeEpic, layout.EpicType)
	}

	child, err := json.Marshal(validTick("chi", TypeTask, "1vn"))
	if err != nil {
		t.Fatalf("marshal child: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(child, &decoded); err != nil {
		t.Fatalf("decode child: %v", err)
	}
	for _, field := range []string{layout.Fields.ID, layout.Fields.Type, layout.Fields.Parent} {
		if _, ok := decoded[field]; !ok {
			t.Fatalf("a tick record has no %q field; cloud/factory/src/tick-membership.ts reads it", field)
		}
	}
	if decoded[layout.Fields.Parent] != "1vn" {
		t.Fatalf("%s is %v, want the parent id", layout.Fields.Parent, decoded[layout.Fields.Parent])
	}
	if decoded[layout.Fields.Type] != TypeTask {
		t.Fatalf("%s is %v, want %q", layout.Fields.Type, decoded[layout.Fields.Type], TypeTask)
	}

	epic, err := json.Marshal(validTick("1vn", TypeEpic, ""))
	if err != nil {
		t.Fatalf("marshal epic: %v", err)
	}
	var rootless map[string]any
	if err := json.Unmarshal(epic, &rootless); err != nil {
		t.Fatalf("decode epic: %v", err)
	}
	if _, present := rootless[layout.Fields.Parent]; present != !layout.ParentOmittedWhenEmpty {
		t.Fatalf("a parentless tick %s a %q field; fixture says parent_omitted_when_empty=%v",
			map[bool]string{true: "has", false: "has no"}[present], layout.Fields.Parent,
			layout.ParentOmittedWhenEmpty)
	}
	if rootless[layout.Fields.Type] != layout.EpicType {
		t.Fatalf("an epic's %s is %v, want %q", layout.Fields.Type, rootless[layout.Fields.Type], layout.EpicType)
	}
}

// The control plane does not only READ this format since tick 8sm: the signal
// funnel (cloud/factory/src/tracker-write.ts) mints a tick id and encodes a
// record, then commits it to .tick/issues/<id>.json through GitHub's contents
// API. A signal arriving at the factory and `tk create` on a laptop are the
// same act by different doors, so the record the door over there writes has to
// be one this package would have written itself.
//
// The pin is stricter than the reader's for a reason. A reader that
// misunderstands the format answers "unreadable" and allows a wave; a WRITER
// that misunderstands it puts a record into the operator's repository that Go
// would have refused — and it is committed by then.

// The alphabet and the length bounds the Worker mints ids from are this
// package's, so an id filed by a signal is one `tk` would have minted.
func TestTrackerLayoutIDMintingMatchesFixture(t *testing.T) {
	layout := readTrackerLayout(t)

	if layout.Written.IDAlphabet != base36Chars {
		t.Fatalf("fixture id alphabet is %q, this package mints from %q",
			layout.Written.IDAlphabet, base36Chars)
	}
	if layout.Written.IDMinLength != minIDLength || layout.Written.IDMaxLength != maxIDLength {
		t.Fatalf("fixture id lengths are %d-%d, this package uses %d-%d",
			layout.Written.IDMinLength, layout.Written.IDMaxLength, minIDLength, maxIDLength)
	}
	if layout.Written.IDAttemptsPerLength != maxAttempts {
		t.Fatalf("fixture tries %d candidates per length, this package tries %d",
			layout.Written.IDAttemptsPerLength, maxAttempts)
	}
}

// The defaults the Worker fills in are values this package's Validate accepts,
// and the fields it always writes are the ones Validate insists on. A record
// short of them is one the factory could commit and `tk` would then refuse to
// read back, which is a corruption of .tick/ by any useful definition.
func TestTrackerLayoutWrittenRecordSatisfiesValidate(t *testing.T) {
	layout := readTrackerLayout(t)

	now := time.Now().UTC()
	filed := Tick{
		ID:          "sig",
		Title:       "a signal became a tick",
		Status:      layout.Written.DefaultStatus,
		Priority:    layout.Written.DefaultPriority,
		Type:        layout.Written.DefaultType,
		Owner:       "operator@example.com",
		ExternalRef: "telegram" + layout.Written.ExternalRefSeparator + "8412",
		CreatedBy:   "operator@example.com",
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := filed.Validate(); err != nil {
		t.Fatalf("a record the factory would commit is invalid here: %v", err)
	}

	encoded, err := json.Marshal(filed)
	if err != nil {
		t.Fatalf("marshal filed tick: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("decode filed tick: %v", err)
	}
	for _, field := range layout.Written.RequiredFields {
		if _, ok := decoded[field]; !ok {
			t.Fatalf("the fixture says every written record carries %q; this one does not", field)
		}
	}
	if decoded[layout.Fields.ExternalRef] != filed.ExternalRef {
		t.Fatalf("%s is %v, want %q", layout.Fields.ExternalRef,
			decoded[layout.Fields.ExternalRef], filed.ExternalRef)
	}

	// A tick with no external ref omits the field, so the Worker's encoder must
	// omit it too rather than writing "".
	bare, err := json.Marshal(validTick("bar", TypeTask, ""))
	if err != nil {
		t.Fatalf("marshal bare tick: %v", err)
	}
	var bareDecoded map[string]any
	if err := json.Unmarshal(bare, &bareDecoded); err != nil {
		t.Fatalf("decode bare tick: %v", err)
	}
	if _, present := bareDecoded[layout.Fields.ExternalRef]; present != !layout.Written.ExternalRefOmittedWhenEmpty {
		t.Fatalf("a tick with no external ref %s an %q field; fixture says external_ref_omitted_when_empty=%v",
			map[bool]string{true: "has", false: "has no"}[present], layout.Fields.ExternalRef,
			layout.Written.ExternalRefOmittedWhenEmpty)
	}
}

// The bytes on disk. Both writers commit to the same file in the same
// repository, so an indentation difference would turn every alternating write
// into a whole-file diff nobody can review.
func TestTrackerLayoutIndentMatchesFixture(t *testing.T) {
	layout := readTrackerLayout(t)

	root := t.TempDir()
	store := NewStore(filepath.Join(root, ".tick"))
	filed := validTick("ind", TypeTask, "")
	if err := store.Write(filed); err != nil {
		t.Fatalf("write tick: %v", err)
	}
	onDisk, err := os.ReadFile(filepath.Join(root, ".tick", "issues", "ind.json"))
	if err != nil {
		t.Fatalf("read written tick: %v", err)
	}

	want, err := json.MarshalIndent(filed, "", strings.Repeat(" ", layout.Written.JSONIndent))
	if err != nil {
		t.Fatalf("marshal with the fixture's indent: %v", err)
	}
	if string(onDisk) != string(want) {
		t.Fatalf("the Store's bytes are not %d-space indented JSON with no trailing newline;\n got: %q\nwant: %q",
			layout.Written.JSONIndent, string(onDisk), string(want))
	}
}

// The human gate (tick la9) rests on a claim about THIS package: a draft is not
// a tick in a special state, because there is no status that could express one.
//
// The control plane holds an ingested signal as a draft in its own storage and
// commits a record only when a person presses Create. What makes that
// structural rather than conventional is here: `tk next`, `tk ready` and a
// wave's sweep read tick records, and Validate accepts exactly three statuses.
// A record marked "draft" is not a record this package will read back, so no
// reader has to remember to filter one — there is nothing to filter.
//
// If a fourth status is ever added, this test is what makes somebody check
// whether the gate still holds before the factory's writer inherits it.
func TestHumanGateStatusVocabularyMatchesFixture(t *testing.T) {
	layout := readTrackerLayout(t)

	if len(layout.HumanGate.Statuses) == 0 {
		t.Fatal("the fixture names no statuses; the human gate's pin is the vocabulary")
	}
	for _, status := range layout.HumanGate.Statuses {
		tk := validTick("gat", TypeTask, "")
		tk.Status = status
		if err := tk.Validate(); err != nil {
			t.Fatalf("the fixture says %q is a status; this package refuses it: %v", status, err)
		}
	}

	// Every status this package has is one the fixture names, so a fourth one
	// added here fails this test rather than quietly becoming a value the
	// factory's writer could reach.
	for _, status := range []string{StatusOpen, StatusInProgress, StatusClosed} {
		if !slices.Contains(layout.HumanGate.Statuses, status) {
			t.Fatalf("this package has status %q, which the fixture does not name", status)
		}
	}

	// The one the control plane commits, and the one that must never be a
	// status at all: a draft that could be written as a record would be a tick
	// in the ready queue before a human had looked at it.
	if !slices.Contains(layout.HumanGate.Statuses, layout.HumanGate.CommittedStatus) {
		t.Fatalf("the committed status %q is not one of the statuses", layout.HumanGate.CommittedStatus)
	}
	if layout.HumanGate.CommittedStatus != StatusOpen {
		t.Fatalf("the control plane commits %q; this package's open status is %q",
			layout.HumanGate.CommittedStatus, StatusOpen)
	}
	draft := validTick("dra", TypeTask, "")
	draft.Status = layout.HumanGate.RejectedStatus
	if err := draft.Validate(); err == nil {
		t.Fatalf("a tick with status %q validated; a draft must not be expressible as a record",
			layout.HumanGate.RejectedStatus)
	}
}

// The trace id (tick hyi) is the identifier that joins "a message arrived" to
// "a container did this", and it crosses this boundary in BOTH directions:
// cloud/factory/src/trace.ts mints it and cloud/factory/src/tracker-write.ts
// writes it into the record, while this package owns the record format it
// lands in, refuses a malformed one, and reads it back for `tk cloud logs` and
// `tk cloud trace`.
//
// A prefix or a width that drifted in one language alone would produce records
// the other refuses — with both suites green, because each would be internally
// consistent. That is the exact failure .tick/learnings.md records under
// "Cross-language parity", so the format is pinned here rather than declared
// twice and hoped over.
func TestTraceIDFormatMatchesFixture(t *testing.T) {
	layout := readTrackerLayout(t)

	if layout.Trace.Prefix != trace.Prefix {
		t.Fatalf("fixture trace prefix is %q, this repository mints %q", layout.Trace.Prefix, trace.Prefix)
	}
	if layout.Trace.HexLength != trace.HexLength {
		t.Fatalf("fixture trace id carries %d hex characters, this repository mints %d",
			layout.Trace.HexLength, trace.HexLength)
	}
	if layout.Trace.Pattern != trace.Pattern.String() {
		t.Fatalf("fixture trace pattern is %q, this repository validates with %q",
			layout.Trace.Pattern, trace.Pattern.String())
	}
	if !trace.Valid(layout.Trace.Example) {
		t.Fatalf("the fixture's own example %q is not a trace id here", layout.Trace.Example)
	}
	// Minted ids are ones this package accepts, in both directions: a format
	// only one half can produce is not a shared format.
	for i := 0; i < 32; i++ {
		id := trace.New()
		if !trace.Valid(id) {
			t.Fatalf("this package minted %q and then refused it", id)
		}
	}
	// Case is folded on the way in, unlike an external ref's — two cases of a
	// hex id are two spellings of one value, and one causal chain must have
	// exactly one spelling.
	if got, ok := trace.Normalize("  " + strings.ToUpper(layout.Trace.Example) + " "); !ok || got != layout.Trace.Example {
		t.Fatalf("Normalize(%q) = %q, %v; want the lowercase example", layout.Trace.Example, got, ok)
	}
	if _, ok := trace.Normalize("tr_not-hex"); ok {
		t.Fatal("Normalize accepted a value that is not a trace id")
	}
}

// The record carries the trace id under the name the fixture states, omits it
// when there is none, and refuses one that is malformed.
//
// The refusal is the load-bearing half. The whole value of a trace id is that
// ONE spelling identifies one causal chain, so a record carrying a near-miss
// would look joined to a human and join to nothing in a query — which is worse
// than carrying no id at all, because it is a false negative that reads as an
// answer.
func TestTrackerLayoutTraceIDFieldMatchesFixture(t *testing.T) {
	layout := readTrackerLayout(t)

	traced := validTick("trc", TypeTask, "")
	traced.TraceID = layout.Trace.Example
	if err := traced.Validate(); err != nil {
		t.Fatalf("a tick carrying the fixture's trace id is invalid here: %v", err)
	}
	encoded, err := json.Marshal(traced)
	if err != nil {
		t.Fatalf("marshal traced tick: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("decode traced tick: %v", err)
	}
	if decoded[layout.Fields.TraceID] != layout.Trace.Example {
		t.Fatalf("%s is %v, want %q", layout.Fields.TraceID,
			decoded[layout.Fields.TraceID], layout.Trace.Example)
	}

	bare, err := json.Marshal(validTick("bre", TypeTask, ""))
	if err != nil {
		t.Fatalf("marshal bare tick: %v", err)
	}
	var bareDecoded map[string]any
	if err := json.Unmarshal(bare, &bareDecoded); err != nil {
		t.Fatalf("decode bare tick: %v", err)
	}
	if _, present := bareDecoded[layout.Fields.TraceID]; present != !layout.Trace.OmittedWhenEmpty {
		t.Fatalf("a tick with no trace id %s a %q field; fixture says omitted_when_empty=%v",
			map[bool]string{true: "has", false: "has no"}[present], layout.Fields.TraceID,
			layout.Trace.OmittedWhenEmpty)
	}

	malformed := validTick("bad", TypeTask, "")
	malformed.TraceID = strings.ToUpper(layout.Trace.Example)
	if err := malformed.Validate(); err == nil {
		t.Fatal("a tick carrying an upper-case trace id validated; one chain must have one spelling")
	}
	malformed.TraceID = "not-a-trace-id"
	if err := malformed.Validate(); err == nil {
		t.Fatal("a tick carrying a malformed trace id validated")
	}
}

// The trace id's field position, which is a byte-level contract rather than a
// cosmetic one. Both writers commit the same file in the same repository, so a
// field the control plane emits in a different place turns every alternating
// write into a whole-file diff nobody can review — the same argument the
// indent test makes.
func TestTrackerLayoutTraceIDFieldOrderMatchesFixture(t *testing.T) {
	layout := readTrackerLayout(t)

	filed := Tick{
		ID:          "ord",
		Title:       "a signal became a tick",
		Status:      layout.Written.DefaultStatus,
		Priority:    layout.Written.DefaultPriority,
		Type:        layout.Written.DefaultType,
		Owner:       "operator@example.com",
		ExternalRef: "telegram" + layout.Written.ExternalRefSeparator + "8412",
		TraceID:     layout.Trace.Example,
		CreatedBy:   "operator@example.com",
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
	encoded, err := json.MarshalIndent(filed, "", strings.Repeat(" ", layout.Written.JSONIndent))
	if err != nil {
		t.Fatalf("marshal filed tick: %v", err)
	}
	text := string(encoded)
	refAt := strings.Index(text, `"`+layout.Fields.ExternalRef+`"`)
	traceAt := strings.Index(text, `"`+layout.Fields.TraceID+`"`)
	createdAt := strings.Index(text, `"created_by"`)
	if refAt < 0 || traceAt < 0 || createdAt < 0 {
		t.Fatalf("a filed record is missing one of external_ref/trace_id/created_by:\n%s", text)
	}
	if !(refAt < traceAt && traceAt < createdAt) {
		t.Fatalf("trace_id must sit between external_ref and created_by, as cloud/factory/src/tracker-write.ts writes it:\n%s", text)
	}
}
