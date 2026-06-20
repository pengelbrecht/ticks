package tui

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

// stateFileName is the filename within the .tick directory where UI state is
// persisted between sessions. It is gitignored via .tick/.gitignore.
const stateFileName = ".tui-state.json"

// PersistedState is the subset of App state that survives across sessions. It
// is serialised to JSON as .tick/.tui-state.json on quit and loaded before the
// first tea.NewProgram call.
//
// Fields map directly to App internals — no re-definition: the types (Scope,
// focusZone, etc.) are the same ones App uses.
type PersistedState struct {
	// ActiveViewIndex is App.activeIx — which content view is shown (0=List …).
	ActiveViewIndex int `json:"activeViewIndex"`

	// Scope is App.scope — the selected sidebar row (smart view or tree node).
	Scope Scope `json:"scope"`

	// CollapsedNodes is Sidebar.collapsed — set of tick IDs whose tree rows are
	// collapsed. The zero value (nil map) means nothing is collapsed.
	CollapsedNodes map[string]bool `json:"collapsedNodes,omitempty"`

	// Focus is App.focus — which pane (sidebar/main/detail) holds keyboard focus.
	Focus focusZone `json:"focus"`

	// DetailVisible is App.detailVisible — whether the detail pane is shown in
	// narrow (2/1-pane) layouts.
	DetailVisible bool `json:"detailVisible"`
}

// DefaultState returns a PersistedState with sensible defaults matching
// NewApp's initial values (focusSidebar, first smart-view, all expanded, etc.).
func DefaultState() PersistedState {
	return PersistedState{
		ActiveViewIndex: 0,
		Scope: Scope{
			Kind:  scopeSmart,
			Smart: smartAwaiting,
		},
		CollapsedNodes: nil,
		Focus:          focusSidebar,
		DetailVisible:  false,
	}
}

// LoadState reads .tick/<stateFileName> from the given store path and returns
// the decoded state. If the file does not exist the defaults are returned with
// no error. Any other I/O or JSON error is returned to the caller.
func LoadState(storePath string) (PersistedState, error) {
	p := filepath.Join(storePath, stateFileName)
	data, err := os.ReadFile(p)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return DefaultState(), nil
		}
		return DefaultState(), err
	}
	var s PersistedState
	if err := json.Unmarshal(data, &s); err != nil {
		// Treat a corrupt file like a missing file so the TUI still starts.
		return DefaultState(), nil
	}
	return s, nil
}

// SaveState writes the current App state to .tick/<stateFileName> in the store
// path. The file is created (or truncated) with mode 0o644. Errors are
// returned to the caller; the .tick dir must already exist.
func SaveState(storePath string, s PersistedState) error {
	p := filepath.Join(storePath, stateFileName)
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, data, 0o644)
}

// ExtractState snapshots the App fields that belong in PersistedState.
// Call this just before tea.NewProgram exits (i.e. after Run() returns).
func (a *App) ExtractState() PersistedState {
	return PersistedState{
		ActiveViewIndex: a.activeIx,
		Scope:           a.scope,
		CollapsedNodes:  a.sidebar.collapsed,
		Focus:           a.focus,
		DetailVisible:   a.detailVisible,
	}
}

// ApplyState restores the PersistedState into the App fields.
// Call this after NewApp but before tea.NewProgram.
func (a *App) ApplyState(s PersistedState) {
	a.activeIx = s.ActiveViewIndex
	// Clamp activeIx to valid registry bounds.
	if a.activeIx < 0 {
		a.activeIx = 0
	}
	if a.views != nil && a.activeIx >= a.views.len() {
		a.activeIx = 0
	}

	a.scope = s.Scope
	if s.CollapsedNodes != nil {
		a.sidebar.collapsed = s.CollapsedNodes
	}
	a.focus = s.Focus
	a.detailVisible = s.DetailVisible

	// Rebuild sidebar rows so the restored scope gets applied.
	a.sidebar.rebuild()
	a.sidebar.restoreSelection(a.scope)
	a.reScope()
}
