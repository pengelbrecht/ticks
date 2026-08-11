package state

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func sampleManifest() Manifest {
	return Manifest{
		Tick:         "1aw",
		Epic:         "gyz",
		Role:         "implement",
		Tier:         "strong",
		Branch:       "tick/1aw",
		Worktree:     "/herdr/worktrees/repo/tick-1aw",
		WorkspaceID:  "w7",
		PaneID:       "w7:p1",
		Agent:        "tick-1aw",
		Kind:         "claude",
		Model:        "sonnet",
		Effort:       "high",
		Argv:         []string{"--permission-mode", "bypassPermissions", "--model", "sonnet"},
		AgentSession: &AgentSession{Kind: "id", Value: "sess-123"},
		Base:         "abc1234",
		GateAttempts: 1,
		CreatedAt:    "2026-08-11T10:00:00Z",
		Warnings:     []string{"kind has no verified full-auto template"},
	}
}

// TestWritePathIsTheOnlyTickPath pins the exact path, because it is the one
// place under .tick/ this whole feature is allowed to write.
func TestWritePathIsTheOnlyTickPath(t *testing.T) {
	root := t.TempDir()
	path, err := Write(root, sampleManifest())
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	want := filepath.Join(root, ".tick", "logs", "herd", "gyz", "1aw.json")
	if path != want {
		t.Errorf("path = %q, want %q", path, want)
	}

	// Nothing else under .tick/ may appear.
	var seen []string
	_ = filepath.Walk(filepath.Join(root, ".tick"), func(p string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		rel, _ := filepath.Rel(root, p)
		seen = append(seen, filepath.ToSlash(rel))
		return nil
	})
	if len(seen) != 1 || seen[0] != ".tick/logs/herd/gyz/1aw.json" {
		t.Errorf("files under .tick/ = %v, want only the manifest", seen)
	}
}

// TestWriteIsAtomic pins that the temp file is gone and the survivor is valid
// JSON — a reader listing the directory never sees a half-written document.
func TestWriteIsAtomic(t *testing.T) {
	root := t.TempDir()
	path, err := Write(root, sampleManifest())
	if err != nil {
		t.Fatalf("Write: %v", err)
	}

	entries, err := os.ReadDir(filepath.Dir(path))
	if err != nil {
		t.Fatalf("readdir: %v", err)
	}
	if len(entries) != 1 {
		var names []string
		for _, e := range entries {
			names = append(names, e.Name())
		}
		t.Fatalf("directory holds %v, want just the manifest (no temp leftovers)", names)
	}
	if strings.HasPrefix(entries[0].Name(), ".") {
		t.Errorf("survivor is a temp file: %q", entries[0].Name())
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("manifest is not valid JSON: %v", err)
	}
}

// TestWriteOverwritesInPlace pins that a re-spawn replaces the manifest rather
// than accumulating files.
func TestWriteOverwritesInPlace(t *testing.T) {
	root := t.TempDir()
	m := sampleManifest()
	if _, err := Write(root, m); err != nil {
		t.Fatalf("Write: %v", err)
	}
	m.Agent = "tick-1aw-r2"
	path, err := Write(root, m)
	if err != nil {
		t.Fatalf("second Write: %v", err)
	}
	got, err := Read(path)
	if err != nil {
		t.Fatalf("Read: %v", err)
	}
	if got.Agent != "tick-1aw-r2" {
		t.Errorf("Agent = %q, want the second write to win", got.Agent)
	}
	entries, _ := os.ReadDir(filepath.Dir(path))
	if len(entries) != 1 {
		t.Errorf("directory holds %d files, want 1", len(entries))
	}
}

// TestRoundTrip pins every field the collect and reconcile steps read.
func TestRoundTrip(t *testing.T) {
	root := t.TempDir()
	want := sampleManifest()
	path, err := Write(root, want)
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	got, err := Read(path)
	if err != nil {
		t.Fatalf("Read: %v", err)
	}
	if got.Tick != want.Tick || got.Epic != want.Epic || got.Branch != want.Branch ||
		got.Worktree != want.Worktree || got.WorkspaceID != want.WorkspaceID ||
		got.PaneID != want.PaneID || got.Agent != want.Agent || got.Kind != want.Kind ||
		got.Model != want.Model || got.Effort != want.Effort || got.Base != want.Base ||
		got.CreatedAt != want.CreatedAt {
		t.Errorf("round trip lost fields:\n got %+v\nwant %+v", got, want)
	}
	if len(got.Argv) != len(want.Argv) {
		t.Errorf("Argv = %v, want %v", got.Argv, want.Argv)
	}
	if got.AgentSession == nil || got.AgentSession.Kind != "id" || got.AgentSession.Value != "sess-123" {
		t.Errorf("AgentSession = %+v, want kind+value preserved", got.AgentSession)
	}
	if len(got.Warnings) != 1 {
		t.Errorf("Warnings = %v, want them preserved", got.Warnings)
	}
}

// TestCreatedAtDefaulted pins that a manifest always carries a timestamp.
func TestCreatedAtDefaulted(t *testing.T) {
	root := t.TempDir()
	m := sampleManifest()
	m.CreatedAt = ""
	path, err := Write(root, m)
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	got, _ := Read(path)
	if got.CreatedAt == "" {
		t.Error("CreatedAt is empty, want an RFC3339 stamp")
	}
}

// TestNoEpicFolding pins that a parentless tick still gets a home.
func TestNoEpicFolding(t *testing.T) {
	root := t.TempDir()
	m := sampleManifest()
	m.Epic = ""
	path, err := Write(root, m)
	if err != nil {
		t.Fatalf("Write: %v", err)
	}
	if !strings.Contains(filepath.ToSlash(path), "/herd/"+NoEpic+"/") {
		t.Errorf("path = %q, want it under %s", path, NoEpic)
	}
}

// TestList pins the collect step's entry point, including that it ignores an
// in-flight temp file and a missing directory.
func TestList(t *testing.T) {
	root := t.TempDir()
	if got, err := List(root, "gyz"); err != nil || got != nil {
		t.Fatalf("List on a fresh repo = %v, %v; want nil, nil", got, err)
	}

	for _, id := range []string{"9z6", "1aw"} {
		m := sampleManifest()
		m.Tick = id
		if _, err := Write(root, m); err != nil {
			t.Fatalf("Write %s: %v", id, err)
		}
	}
	if err := os.WriteFile(filepath.Join(Dir(root, "gyz"), ".xyz.json.tmp"), []byte("{bad"), 0o644); err != nil {
		t.Fatalf("temp fixture: %v", err)
	}

	got, err := List(root, "gyz")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 2 || got[0].Tick != "1aw" || got[1].Tick != "9z6" {
		t.Errorf("List = %+v, want the two manifests sorted by tick id", got)
	}
}

// TestNoteLine pins the note text the orchestrator pastes into tk note.
func TestNoteLine(t *testing.T) {
	got := NoteLine(sampleManifest())
	if !strings.HasPrefix(got, "runner-state: ") {
		t.Errorf("note = %q, want the runner-state: prefix", got)
	}
	for _, want := range []string{
		"substrate=herdr", "kind=claude", "branch=tick/1aw",
		"worktree=/herdr/worktrees/repo/tick-1aw", "workspace=w7",
		"base=abc1234", "agent=tick-1aw", "session=sess-123",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("note %q missing %q", got, want)
		}
	}
	if strings.Contains(got, "\n") {
		t.Error("note must be a single line")
	}
}
