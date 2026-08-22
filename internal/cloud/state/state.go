// Package state persists the per-worker run state a CLOUD wave produces.
//
// # Why a second manifest package
//
// `internal/herd/state` records what a herdr spawn produced: a worktree, a
// workspace, a pane, an agent session. A cloud worker has none of those — it
// is a container that clones, pushes a branch and is destroyed. What a local
// orchestrator has to remember about it is therefore a different, smaller set
// of facts: which run dispatched it, which branch on which remote carries its
// work, and which commit that branch is measured against.
//
// The shape is deliberately herd-shaped anyway — one JSON file per tick under
// an epic directory, written atomically — so that `tk cloud collect` and
// `tk cloud reconcile` enumerate a wave exactly as their herd counterparts do,
// with one readdir and no guessing.
//
// # Where it lives, and why that is not tracker state
//
// `.tick/logs/cloud/<epic-id>/<tick-id>.json`. `.tick/` is orchestrator-owned
// and `logs/` is already excluded from git by `.tick/.gitignore`: a manifest is
// local, per-machine, disposable run state, not tracker state. Nothing else
// under `.tick/` is touched by this package, and the `runner-state:` note stays
// the orchestrator's job — [NoteLine] only renders the text.
package state

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ErrNoTick reports a JSON file that parsed as a manifest but carries no
// `tick` field. Same rule as the herd manifests: the tick id is a manifest's
// identity, and `.tick/logs/cloud/<epic>/` is an ordinary directory anything
// may drop a stray `.json` into.
var ErrNoTick = errors.New("manifest has no tick id")

// RelDir is the repo-relative directory every cloud manifest lives under.
const RelDir = ".tick/logs/cloud"

// NoEpic is the directory used for a tick with no parent epic.
const NoEpic = "no-epic"

// TimeLayout is the timestamp format of [Manifest.CreatedAt].
const TimeLayout = time.RFC3339

// DefaultRemote is the git remote a cloud worker pushes to, and therefore the
// one a local orchestrator reads its durable evidence from.
const DefaultRemote = "origin"

// Manifest is the run state of one dispatched cloud worker.
//
// Every field is what the dispatch actually produced or was pinned to, so a
// later reader never re-derives anything — in particular Branch is recorded
// rather than recomputed, because the worker entrypoint may push to a
// suffixed branch when origin already carries an attempt from another base.
type Manifest struct {
	// Tick is the tick id this container implements.
	Tick string `json:"tick"`
	// Epic is the parent epic id, or "" when the tick has no parent.
	Epic string `json:"epic,omitempty"`
	// Project is the canonical owner/repo pair the run was submitted for.
	Project string `json:"project,omitempty"`
	// RunID is the factory run that dispatched this wave. It is what
	// `tk cloud wait` and `tk cloud reconcile` ask the factory about.
	RunID string `json:"run_id"`
	// Branch is the worker branch on the remote, `tick/<epic-id>/<tick-id>`.
	Branch string `json:"branch"`
	// Base is the commit the wave was submitted at; the branch is measured
	// against it, never against a moving default branch.
	Base string `json:"base"`
	// Remote is the git remote the branch is read from ("origin").
	Remote string `json:"remote,omitempty"`
	// LeaseOrigin records where the orchestrator that took the project's
	// dispatch lease was sitting: "local" for a laptop session driving cloud
	// workers, "cloud" for a Workflow-hosted run.
	LeaseOrigin string `json:"lease_origin,omitempty"`
	// Arbiter names the lease arbiter that governed this dispatch, so a later
	// reader can tell an enrolled project's RunRoom lease from the local file
	// lease without re-resolving enrolment.
	Arbiter string `json:"arbiter,omitempty"`
	// CreatedAt is when the dispatch was recorded, RFC3339.
	CreatedAt string `json:"created_at"`
}

// BranchFor is the branch a cloud worker pushes for one tick, matching
// `worker_branch_name` in cloud/sandbox/worker.sh.
func BranchFor(epicID, tickID string) string {
	return "tick/" + EpicDir(epicID) + "/" + tickID
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

// Path is the manifest path for one tick.
func Path(repoRoot, epicID, tickID string) string {
	return filepath.Join(Dir(repoRoot, epicID), tickID+".json")
}

// RelPath is [Path] relative to the repo root, for printing.
func RelPath(epicID, tickID string) string {
	return RelDir + "/" + EpicDir(epicID) + "/" + tickID + ".json"
}

// Write persists a manifest atomically and returns the path written.
func Write(repoRoot string, m Manifest) (string, error) {
	if m.Tick == "" {
		return "", fmt.Errorf("cloud/state: %w", ErrNoTick)
	}
	if m.CreatedAt == "" {
		m.CreatedAt = time.Now().UTC().Format(TimeLayout)
	}
	if m.Remote == "" {
		m.Remote = DefaultRemote
	}

	dir := Dir(repoRoot, m.Epic)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("cloud/state: creating %s: %w", dir, err)
	}
	body, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return "", fmt.Errorf("cloud/state: encoding manifest for %s: %w", m.Tick, err)
	}
	body = append(body, '\n')

	tmp, err := os.CreateTemp(dir, "."+m.Tick+".json.*")
	if err != nil {
		return "", fmt.Errorf("cloud/state: creating temp manifest in %s: %w", dir, err)
	}
	tmpName := tmp.Name()
	cleanup := func() { _ = tmp.Close(); _ = os.Remove(tmpName) }

	if _, err := tmp.Write(body); err != nil {
		cleanup()
		return "", fmt.Errorf("cloud/state: writing %s: %w", tmpName, err)
	}
	if err := tmp.Sync(); err != nil {
		cleanup()
		return "", fmt.Errorf("cloud/state: syncing %s: %w", tmpName, err)
	}
	if err := tmp.Close(); err != nil {
		_ = os.Remove(tmpName)
		return "", fmt.Errorf("cloud/state: closing %s: %w", tmpName, err)
	}
	if err := os.Chmod(tmpName, 0o644); err != nil {
		_ = os.Remove(tmpName)
		return "", fmt.Errorf("cloud/state: chmod %s: %w", tmpName, err)
	}

	final := Path(repoRoot, m.Epic, m.Tick)
	if err := os.Rename(tmpName, final); err != nil {
		_ = os.Remove(tmpName)
		return "", fmt.Errorf("cloud/state: renaming manifest into %s: %w", final, err)
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
		return m, fmt.Errorf("cloud/state: parsing %s: %w", path, err)
	}
	if m.Tick == "" {
		return Manifest{}, fmt.Errorf("cloud/state: %s: %w", path, ErrNoTick)
	}
	return m, nil
}

// List loads every manifest of one epic, sorted by tick id. A missing
// directory is not an error: an epic nothing was dispatched for simply has no
// manifests.
func List(repoRoot, epicID string) ([]Manifest, error) {
	dir := Dir(repoRoot, epicID)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	out := make([]Manifest, 0, len(entries))
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || strings.HasPrefix(name, ".") || !strings.HasSuffix(name, ".json") {
			continue
		}
		m, err := Read(filepath.Join(dir, name))
		if err != nil {
			if errors.Is(err, ErrNoTick) {
				continue
			}
			return nil, err
		}
		out = append(out, m)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Tick < out[j].Tick })
	return out, nil
}

// Epics lists the epic directories that carry cloud manifests, sorted.
func Epics(repoRoot string) ([]string, error) {
	entries, err := os.ReadDir(filepath.Join(repoRoot, filepath.FromSlash(RelDir)))
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	out := make([]string, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() && !strings.HasPrefix(e.Name(), ".") {
			out = append(out, e.Name())
		}
	}
	sort.Strings(out)
	return out, nil
}

// NoteLine renders the `runner-state:` note text for a dispatched cloud
// worker. It only renders the text: writing the note is the orchestrator's
// job, and a dispatch command never runs `tk`.
func NoteLine(m Manifest) string {
	fields := []struct{ k, v string }{
		{"substrate", "cloud"},
		{"run", m.RunID},
		{"branch", m.Branch},
		{"base", m.Base},
		{"project", m.Project},
		{"lease", m.LeaseOrigin},
		{"arbiter", m.Arbiter},
	}
	var b strings.Builder
	b.WriteString("runner-state:")
	for _, f := range fields {
		if f.v == "" {
			continue
		}
		b.WriteString(" " + f.k + "=" + f.v)
	}
	return b.String()
}
