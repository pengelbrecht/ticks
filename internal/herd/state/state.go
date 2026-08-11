package state

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// RelDir is the repo-relative directory every manifest lives under. It is
// inside `.tick/logs/`, which `.tick/.gitignore` already excludes from git.
const RelDir = ".tick/logs/herd"

// NoEpic is the directory used for a tick with no parent epic. A manifest
// always lands under some epic directory so that a collect step can enumerate
// a wave with one readdir.
const NoEpic = "no-epic"

// TimeLayout is the timestamp format of [Manifest.CreatedAt].
const TimeLayout = time.RFC3339

// AgentSession is the worker's native session identity, as herdr reports it
// on `agent_session`. Kind is "id" or "path"; Value is the token the kind's
// own resume form takes. It is captured after the first round-trip, never at
// start — see skills/ticks/references/herdr-kinds.md.
type AgentSession struct {
	Kind  string `json:"kind"`
	Value string `json:"value"`
}

// Manifest is the run state of one spawned worker.
//
// It is written once, by `tk herd spawn`, and read by the collect and
// reconcile steps. Every field is what the spawn actually produced — argv is
// the argv herdr echoed, not the argv that was requested — so a reader never
// has to re-derive anything.
type Manifest struct {
	// Tick is the tick id this worker implements.
	Tick string `json:"tick"`
	// Epic is the parent epic id, or "" when the tick has no parent.
	Epic string `json:"epic,omitempty"`
	// Role and Tier are the routing that selected the worker, as REQUESTED —
	// the values the spawn was invoked with, not what they resolved to.
	Role string `json:"role,omitempty"`
	Tier string `json:"tier,omitempty"`
	// ResolvedRole is the role the routing values actually came from, and is
	// recorded ONLY when it differs from Role — i.e. the requested role had no
	// table in runners.toml and fell back to `implement`. Recording both is
	// what lets a reader tell a deliberate fallback from a typo (`--role
	// reveiw` routing a reviewer as an implementer) without re-resolving the
	// config, which may have changed since.
	ResolvedRole string `json:"resolved_role,omitempty"`
	// Branch is the worker's branch, `<worktree_branch_prefix><tick-id>`.
	Branch string `json:"branch"`
	// Worktree is the absolute path herdr chose for the worktree. Never
	// derive it; this is the recorded truth.
	Worktree string `json:"worktree"`
	// WorkspaceID is what `herdr worktree remove` takes at cleanup.
	WorkspaceID string `json:"workspace_id"`
	// PaneID is the pane the agent runs in.
	PaneID string `json:"pane_id"`
	// Agent is the herdr agent name — the handle `tk herd wait` matches on.
	Agent string `json:"agent"`
	// Kind is the herdr agent kind ("claude", "codex", …).
	Kind string `json:"kind"`
	// Model and Effort are the resolved capability dimension. Empty means
	// "the kind's own default", never a substituted value.
	Model  string `json:"model,omitempty"`
	Effort string `json:"effort,omitempty"`
	// Argv is the argv herdr reported executing.
	Argv []string `json:"argv,omitempty"`
	// AgentSession is the native session identity, when the kind reported
	// one by the end of the first round-trip.
	AgentSession *AgentSession `json:"agent_session,omitempty"`
	// Base is the integration commit the worktree branched from.
	Base string `json:"base"`
	// GateAttempts is how many first-round-trip probes it took (1, or 2
	// when the first prompt was silently dropped).
	GateAttempts int `json:"gate_attempts,omitempty"`
	// CreatedAt is when the spawn completed, RFC3339.
	CreatedAt string `json:"created_at"`
	// Warnings are the non-fatal spawn notes, e.g. a kind with no verified
	// full-auto template.
	Warnings []string `json:"warnings,omitempty"`
}

// EpicDir maps an epic id onto its directory name, folding the empty id onto
// [NoEpic] so every manifest has a home.
func EpicDir(epicID string) string {
	if strings.TrimSpace(epicID) == "" {
		return NoEpic
	}
	return epicID
}

// Dir is the directory holding one epic's manifests.
func Dir(repoRoot, epicID string) string {
	return filepath.Join(repoRoot, filepath.FromSlash(RelDir), EpicDir(epicID))
}

// Path is the manifest path for one tick: `.tick/logs/herd/<epic>/<tick>.json`.
func Path(repoRoot, epicID, tickID string) string {
	return filepath.Join(Dir(repoRoot, epicID), tickID+".json")
}

// RelPath is [Path] relative to the repo root, for printing.
func RelPath(epicID, tickID string) string {
	return RelDir + "/" + EpicDir(epicID) + "/" + tickID + ".json"
}

// Write persists a manifest atomically and returns the path written.
//
// The temp file is created in the destination directory so the rename never
// crosses a filesystem boundary, and it is removed on every failure path: a
// reader listing the directory sees complete manifests only.
func Write(repoRoot string, m Manifest) (string, error) {
	if m.Tick == "" {
		return "", fmt.Errorf("herd/state: manifest has no tick id")
	}
	if m.CreatedAt == "" {
		m.CreatedAt = time.Now().UTC().Format(TimeLayout)
	}

	dir := Dir(repoRoot, m.Epic)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("herd/state: creating %s: %w", dir, err)
	}

	body, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return "", fmt.Errorf("herd/state: encoding manifest for %s: %w", m.Tick, err)
	}
	body = append(body, '\n')

	tmp, err := os.CreateTemp(dir, "."+m.Tick+".json.*")
	if err != nil {
		return "", fmt.Errorf("herd/state: creating temp manifest in %s: %w", dir, err)
	}
	tmpName := tmp.Name()
	cleanup := func() { _ = tmp.Close(); _ = os.Remove(tmpName) }

	if _, err := tmp.Write(body); err != nil {
		cleanup()
		return "", fmt.Errorf("herd/state: writing %s: %w", tmpName, err)
	}
	if err := tmp.Sync(); err != nil {
		cleanup()
		return "", fmt.Errorf("herd/state: syncing %s: %w", tmpName, err)
	}
	if err := tmp.Close(); err != nil {
		_ = os.Remove(tmpName)
		return "", fmt.Errorf("herd/state: closing %s: %w", tmpName, err)
	}
	if err := os.Chmod(tmpName, 0o644); err != nil {
		_ = os.Remove(tmpName)
		return "", fmt.Errorf("herd/state: chmod %s: %w", tmpName, err)
	}

	final := Path(repoRoot, m.Epic, m.Tick)
	if err := os.Rename(tmpName, final); err != nil {
		_ = os.Remove(tmpName)
		return "", fmt.Errorf("herd/state: renaming manifest into %s: %w", final, err)
	}
	return final, nil
}

// Read loads one manifest by path.
func Read(path string) (Manifest, error) {
	var m Manifest
	data, err := os.ReadFile(path)
	if err != nil {
		return m, err
	}
	if err := json.Unmarshal(data, &m); err != nil {
		return m, fmt.Errorf("herd/state: parsing %s: %w", path, err)
	}
	return m, nil
}

// List loads every manifest of one epic, sorted by tick id. A missing
// directory is not an error: an epic that has not been spawned yet simply has
// no manifests.
func List(repoRoot, epicID string) ([]Manifest, error) {
	dir := Dir(repoRoot, epicID)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []Manifest
	for _, e := range entries {
		name := e.Name()
		// Skip the in-flight temp files of a concurrent Write.
		if e.IsDir() || strings.HasPrefix(name, ".") || !strings.HasSuffix(name, ".json") {
			continue
		}
		m, err := Read(filepath.Join(dir, name))
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Tick < out[j].Tick })
	return out, nil
}

// NoteLine renders the `runner-state:` note text for a manifest, in the shape
// skills/ticks/references/herdr-runner.md specifies.
//
// It only renders the text. Writing the note is the orchestrator's job — a
// spawn command never runs `tk`.
func NoteLine(m Manifest) string {
	fields := []struct{ k, v string }{
		{"substrate", "herdr"},
		{"kind", m.Kind},
		{"branch", m.Branch},
		{"worktree", m.Worktree},
		{"workspace", m.WorkspaceID},
		{"base", m.Base},
		{"agent", m.Agent},
		{"pane", m.PaneID},
	}
	var b strings.Builder
	b.WriteString("runner-state:")
	for _, f := range fields {
		if f.v == "" {
			continue
		}
		b.WriteString(" " + f.k + "=" + f.v)
	}
	if m.AgentSession != nil && m.AgentSession.Value != "" {
		b.WriteString(" session=" + m.AgentSession.Value)
	}
	return b.String()
}
