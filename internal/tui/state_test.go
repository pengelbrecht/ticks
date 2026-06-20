package tui

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// ---------------------------------------------------------------------------
// Unit: round-trip marshal / unmarshal
// ---------------------------------------------------------------------------

// TestStateRoundTrip verifies that a PersistedState survives JSON encoding and
// decoding without losing any fields.
func TestStateRoundTrip(t *testing.T) {
	t.Parallel()
	orig := PersistedState{
		ActiveViewIndex: 2,
		Scope: Scope{
			Kind:  scopeNode,
			Smart: smartRoadmap,
			Node:  "abc123",
		},
		CollapsedNodes: map[string]bool{"epic1": true, "epic2": false},
		Focus:          focusDetail,
		DetailVisible:  true,
	}

	data, err := json.MarshalIndent(orig, "", "  ")
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var got PersistedState
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if got.ActiveViewIndex != orig.ActiveViewIndex {
		t.Errorf("ActiveViewIndex: got %d, want %d", got.ActiveViewIndex, orig.ActiveViewIndex)
	}
	if got.Scope != orig.Scope {
		t.Errorf("Scope: got %+v, want %+v", got.Scope, orig.Scope)
	}
	if got.Focus != orig.Focus {
		t.Errorf("Focus: got %d, want %d", got.Focus, orig.Focus)
	}
	if got.DetailVisible != orig.DetailVisible {
		t.Errorf("DetailVisible: got %v, want %v", got.DetailVisible, orig.DetailVisible)
	}
	if len(got.CollapsedNodes) != len(orig.CollapsedNodes) {
		t.Errorf("CollapsedNodes len: got %d, want %d", len(got.CollapsedNodes), len(orig.CollapsedNodes))
	}
	for k, v := range orig.CollapsedNodes {
		if got.CollapsedNodes[k] != v {
			t.Errorf("CollapsedNodes[%q]: got %v, want %v", k, got.CollapsedNodes[k], v)
		}
	}
}

// TestLoadStateMissingFile verifies that LoadState returns defaults without an
// error when the state file does not exist.
func TestLoadStateMissingFile(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	if err := os.MkdirAll(tickDir, 0o755); err != nil {
		t.Fatal(err)
	}

	st, err := LoadState(tickDir)
	if err != nil {
		t.Fatalf("expected no error for missing file, got %v", err)
	}

	def := DefaultState()
	if st.ActiveViewIndex != def.ActiveViewIndex {
		t.Errorf("ActiveViewIndex default: got %d, want %d", st.ActiveViewIndex, def.ActiveViewIndex)
	}
	if st.Scope != def.Scope {
		t.Errorf("Scope default: got %+v, want %+v", st.Scope, def.Scope)
	}
	if st.Focus != def.Focus {
		t.Errorf("Focus default: got %d, want %d", st.Focus, def.Focus)
	}
}

// TestLoadStateCorruptFile verifies that a corrupt JSON file yields defaults
// without an error (so the TUI still starts).
func TestLoadStateCorruptFile(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	if err := os.MkdirAll(tickDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tickDir, stateFileName), []byte("not-json"), 0o644); err != nil {
		t.Fatal(err)
	}

	st, err := LoadState(tickDir)
	if err != nil {
		t.Fatalf("corrupt file should return defaults without error, got %v", err)
	}
	def := DefaultState()
	if st.Scope != def.Scope {
		t.Errorf("Scope default from corrupt file: got %+v, want %+v", st.Scope, def.Scope)
	}
}

// ---------------------------------------------------------------------------
// Integration: write, load back, confirm restored fields
// ---------------------------------------------------------------------------

// TestSaveLoadState verifies the full save→load cycle in a temp .tick directory.
func TestSaveLoadState(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	tickDir := filepath.Join(dir, ".tick")
	if err := os.MkdirAll(tickDir, 0o755); err != nil {
		t.Fatal(err)
	}

	want := PersistedState{
		ActiveViewIndex: 1,
		Scope: Scope{
			Kind:  scopeSmart,
			Smart: smartMyTicks,
		},
		CollapsedNodes: map[string]bool{"epic-x": true},
		Focus:          focusMain,
		DetailVisible:  true,
	}

	if err := SaveState(tickDir, want); err != nil {
		t.Fatalf("SaveState: %v", err)
	}

	got, err := LoadState(tickDir)
	if err != nil {
		t.Fatalf("LoadState: %v", err)
	}

	if got.ActiveViewIndex != want.ActiveViewIndex {
		t.Errorf("ActiveViewIndex: got %d, want %d", got.ActiveViewIndex, want.ActiveViewIndex)
	}
	if got.Scope != want.Scope {
		t.Errorf("Scope: got %+v, want %+v", got.Scope, want.Scope)
	}
	if got.Focus != want.Focus {
		t.Errorf("Focus: got %d, want %d", got.Focus, want.Focus)
	}
	if got.DetailVisible != want.DetailVisible {
		t.Errorf("DetailVisible: got %v, want %v", got.DetailVisible, want.DetailVisible)
	}
	if got.CollapsedNodes["epic-x"] != true {
		t.Errorf("CollapsedNodes[epic-x]: got %v, want true", got.CollapsedNodes["epic-x"])
	}
}

// TestExtractApplyRoundTrip verifies that ExtractState / ApplyState compose
// correctly: state extracted from one App restores correctly into a new App.
func TestExtractApplyRoundTrip(t *testing.T) {
	t.Parallel()

	// Build an App, mutate it, extract, then restore into a fresh App.
	orig := newTestApp(t, nil)
	orig.activeIx = 0
	orig.focus = focusMain
	orig.detailVisible = true
	orig.scope = Scope{Kind: scopeSmart, Smart: smartBacklog}

	st := orig.ExtractState()

	fresh := newTestApp(t, nil)
	fresh.ApplyState(st)

	if fresh.activeIx != orig.activeIx {
		t.Errorf("activeIx: got %d, want %d", fresh.activeIx, orig.activeIx)
	}
	if fresh.focus != orig.focus {
		t.Errorf("focus: got %d, want %d", fresh.focus, orig.focus)
	}
	if fresh.detailVisible != orig.detailVisible {
		t.Errorf("detailVisible: got %v, want %v", fresh.detailVisible, orig.detailVisible)
	}
	if fresh.scope != orig.scope {
		t.Errorf("scope: got %+v, want %+v", fresh.scope, orig.scope)
	}
}

// TestApplyStateActiveIxClamped verifies that an out-of-bounds activeIx in the
// state file does not panic but falls back to 0.
func TestApplyStateActiveIxClamped(t *testing.T) {
	t.Parallel()
	a := newTestApp(t, nil)
	st := PersistedState{
		ActiveViewIndex: 9999, // out of range
		Scope:           DefaultState().Scope,
		Focus:           focusSidebar,
	}
	a.ApplyState(st)
	if a.activeIx != 0 {
		t.Errorf("activeIx should be clamped to 0, got %d", a.activeIx)
	}
}

// ---------------------------------------------------------------------------
// Gitignore assertion
// ---------------------------------------------------------------------------

// TestTuiStateGitignored asserts that .tick/.tui-state.json is matched by the
// gitignore entry we added to .tick/.gitignore. It does so by walking up from
// the test file's known package location.
func TestTuiStateGitignored(t *testing.T) {
	t.Parallel()
	// Find the repo root by looking for the .tick/.gitignore relative to the
	// module root. In tests the working directory is the package dir.
	repoRoot, err := findRepoRoot()
	if err != nil {
		t.Skipf("could not locate repo root: %v", err)
	}
	gitignorePath := filepath.Join(repoRoot, ".tick", ".gitignore")
	data, err := os.ReadFile(gitignorePath)
	if err != nil {
		t.Fatalf("reading .tick/.gitignore: %v", err)
	}

	const needle = ".tui-state.json"
	if !containsLine(string(data), needle) {
		t.Errorf(".tick/.gitignore does not contain %q\ncontent:\n%s", needle, data)
	}
}

// findRepoRoot walks up from the current directory until it finds a directory
// containing .tick/.gitignore.
func findRepoRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		candidate := filepath.Join(dir, ".tick", ".gitignore")
		if _, err := os.Stat(candidate); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", os.ErrNotExist
		}
		dir = parent
	}
}

// containsLine reports whether s contains a non-empty line equal to needle.
func containsLine(s, needle string) bool {
	for _, line := range splitLines(s) {
		if line == needle {
			return true
		}
	}
	return false
}
