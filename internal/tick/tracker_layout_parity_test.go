package tick

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
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

const trackerLayoutFile = "../../cloud/factory/test/fixtures/tracker-layout.json"

type trackerLayout struct {
	RecordDir         string `json:"record_dir"`
	RecordPathExample struct {
		Tick string `json:"tick"`
		Path string `json:"path"`
	} `json:"record_path_example"`
	Fields struct {
		ID     string `json:"id"`
		Type   string `json:"type"`
		Parent string `json:"parent"`
	} `json:"fields"`
	EpicType               string `json:"epic_type"`
	ParentOmittedWhenEmpty bool   `json:"parent_omitted_when_empty"`
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
