package cmd

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The add/add guard, and why it is a concurrency invariant.
//
// A tick's id IS its filename, and ids are minted against one checkout
// (internal/tick/id.go asks `exists` about the local tree). Two orchestrators
// working the same project on different branches can therefore mint the SAME
// 3-char id for two entirely different ticks, and git will present that to the
// merge driver as an add/add: no common ancestor, an EMPTY base file.
//
// The driver must refuse. A driver that treated a missing base as a zero tick
// would run the field-level merge over two unrelated ticks — union the labels,
// take the later title, keep the higher status rank — and produce one plausible
// tick where there were two, with no marker and no conflict. That is the only
// silent-corruption path in the tracker's concurrency story (see
// docs/design/cloud-factory.md → UC1c), so the refusal is pinned here rather
// than left as a side effect of json.Unmarshal disliking an empty file.
//
// This is a guard test: the behaviour is correct today. It exists to fail if
// someone makes the driver tolerant of an empty base.
func TestMergeFileRefusesAddAdd(t *testing.T) {
	const ours = `{"id":"abc","title":"run A repair tick","status":"open","priority":2,` +
		`"type":"task","owner":"a","created_by":"a",` +
		`"created_at":"2026-08-21T10:00:00Z","updated_at":"2026-08-21T10:00:00Z"}`
	const theirs = `{"id":"abc","title":"run B unrelated tick","status":"in_progress","priority":3,` +
		`"type":"bug","owner":"b","created_by":"b",` +
		`"created_at":"2026-08-21T11:00:00Z","updated_at":"2026-08-21T11:00:00Z"}`

	dir := t.TempDir()
	basePath := filepath.Join(dir, "base.json")
	oursPath := filepath.Join(dir, "ours.json")
	theirsPath := filepath.Join(dir, "theirs.json")

	// git hands the driver an empty file for %O when neither side has an
	// ancestor for the path.
	writeFile(t, basePath, "")
	writeFile(t, oursPath, ours)
	writeFile(t, theirsPath, theirs)

	captureCmdOutput(t)
	err := ExecuteArgs([]string{"merge-file", basePath, oursPath, theirsPath, oursPath})
	if err == nil {
		t.Fatal("merge-file merged two ticks that share an id with no common ancestor; git would record a clean merge and one of the two ticks would vanish")
	}

	// A non-zero exit is what makes git leave the conflict in place; the
	// working-tree file must be untouched so `git status` still shows AA.
	if got := readFile(t, oursPath); got != ours {
		t.Fatalf("driver rewrote its output path on a refusal:\n got %s\nwant %s", got, ours)
	}
	if !strings.Contains(err.Error(), "base") {
		t.Fatalf("refusal does not mention the unreadable base: %v", err)
	}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(data)
}
