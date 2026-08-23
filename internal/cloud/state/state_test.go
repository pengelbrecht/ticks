package state

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func sampleManifest() Manifest {
	return Manifest{
		Tick:        "1aw",
		Epic:        "gyz",
		Project:     "acme/project",
		RunID:       "run_abc",
		Branch:      BranchFor("gyz", "1aw"),
		Base:        "abc1234",
		LeaseOrigin: "local",
		Arbiter:     "runroom",
		CreatedAt:   "2026-08-22T10:00:00Z",
	}
}

// TestWritePathIsTheOnlyTickPath pins the exact path: it is the one place
// under .tick/ a cloud dispatch may write, and it is git-ignored local state.
func TestWritePathIsTheOnlyTickPath(t *testing.T) {
	root := t.TempDir()
	path, err := Write(root, sampleManifest())
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	want := filepath.Join(root, ".tick", "logs", "cloud", "gyz", "1aw.json")
	if path != want {
		t.Errorf("path = %q, want %q", path, want)
	}

	var seen []string
	_ = filepath.Walk(filepath.Join(root, ".tick"), func(p string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		rel, _ := filepath.Rel(root, p)
		seen = append(seen, filepath.ToSlash(rel))
		return nil
	})
	if len(seen) != 1 || seen[0] != ".tick/logs/cloud/gyz/1aw.json" {
		t.Errorf("files under .tick/ = %v, want only the manifest", seen)
	}
}

// TestBranchMatchesTheWorkerEntrypoint pins the branch shape the container
// pushes. A local orchestrator that guessed `tick/<id>` would read the herdr
// substrate's branch and report every cloud worker as having no commits.
func TestBranchMatchesTheWorkerEntrypoint(t *testing.T) {
	if got := BranchFor("gyz", "1aw"); got != "tick/gyz/1aw" {
		t.Errorf("BranchFor = %q, want tick/gyz/1aw", got)
	}
	if got := BranchFor("", "1aw"); got != "tick/no-epic/1aw" {
		t.Errorf("BranchFor with no epic = %q, want tick/no-epic/1aw", got)
	}
}

func TestWriteFillsRemoteAndTimestamp(t *testing.T) {
	root := t.TempDir()
	m := sampleManifest()
	m.Remote, m.CreatedAt = "", ""
	path, err := Write(root, m)
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	read, err := Read(path)
	if err != nil {
		t.Fatalf("Read: %v", err)
	}
	if read.Remote != DefaultRemote {
		t.Errorf("remote = %q, want %q", read.Remote, DefaultRemote)
	}
	if read.CreatedAt == "" {
		t.Error("created_at was not filled in")
	}
}

func TestWriteRefusesAManifestWithNoTick(t *testing.T) {
	root := t.TempDir()
	m := sampleManifest()
	m.Tick = ""
	if _, err := Write(root, m); !errors.Is(err, ErrNoTick) {
		t.Fatalf("Write error = %v, want ErrNoTick", err)
	}
}

func TestListSortsAndSkipsStrayJSON(t *testing.T) {
	root := t.TempDir()
	for _, id := range []string{"zzz", "aaa"} {
		m := sampleManifest()
		m.Tick = id
		m.Branch = BranchFor(m.Epic, id)
		if _, err := Write(root, m); err != nil {
			t.Fatalf("Write %s: %v", id, err)
		}
	}
	stray := filepath.Join(Dir(root, "gyz"), "notes.json")
	if err := os.WriteFile(stray, []byte(`{"note":"not a manifest"}`), 0o644); err != nil {
		t.Fatalf("write stray: %v", err)
	}

	got, err := List(root, "gyz")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 2 || got[0].Tick != "aaa" || got[1].Tick != "zzz" {
		t.Fatalf("List = %+v, want aaa then zzz", got)
	}
}

func TestListOfAnUndispatchedEpicIsEmptyNotAnError(t *testing.T) {
	got, err := List(t.TempDir(), "gyz")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("List = %+v, want empty", got)
	}
}

func TestEpicsListsDispatchedEpics(t *testing.T) {
	root := t.TempDir()
	for _, epic := range []string{"gyz", "abc"} {
		m := sampleManifest()
		m.Epic = epic
		if _, err := Write(root, m); err != nil {
			t.Fatalf("Write: %v", err)
		}
	}
	got, err := Epics(root)
	if err != nil {
		t.Fatalf("Epics: %v", err)
	}
	if strings.Join(got, ",") != "abc,gyz" {
		t.Errorf("Epics = %v, want [abc gyz]", got)
	}
}

// TestNoteLineNamesTheSubstrateAndTheLease: the note is what a later reader
// has to tell a cloud-dispatched tick from a herdr one, and a locally-driven
// wave from a Workflow-hosted one.
func TestNoteLineNamesTheSubstrateAndTheLease(t *testing.T) {
	line := NoteLine(sampleManifest())
	for _, want := range []string{
		"runner-state:", "substrate=cloud", "run=run_abc",
		"branch=tick/gyz/1aw", "base=abc1234", "lease=local", "arbiter=runroom",
	} {
		if !strings.Contains(line, want) {
			t.Errorf("note %q does not contain %q", line, want)
		}
	}
}
