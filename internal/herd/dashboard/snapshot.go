package dashboard

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/wave"
)

// Herd is the slice of the herdr client this package needs. [client.Client]
// satisfies it; tests inject the same client over internal/herd/herdtest.
type Herd interface {
	AgentList(ctx context.Context) ([]client.AgentInfo, error)
	EventsSubscribe(ctx context.Context, subs []client.Subscription) (*client.EventStream, error)
}

// TickRow is one tick on the board.
type TickRow struct {
	ID     string
	Title  string
	Status string
	Type   string
	// Blocked reports that the tick still has open blockers.
	Blocked bool
	// PaneID is the pane of the worker implementing this tick, empty when
	// no manifest names it. It is how a live status finds its row.
	PaneID string
	// Agent is the herdr agent name from the manifest, empty when unspawned.
	Agent string
}

// WaveRow is one parallel execution wave of an epic. Wave 0 is this package's
// own bucket for ticks internal/wave excludes (closed, or awaiting a human):
// they are still part of the run and an operator wants to see them.
type WaveRow struct {
	Number int
	Ticks  []TickRow
}

// WorkerRow is one spawned worker: what the manifest recorded, plus what herdr
// currently reports about its pane.
type WorkerRow struct {
	Tick     string
	Epic     string
	Agent    string
	PaneID   string
	Kind     string
	Branch   string
	Worktree string
	// Status is herdr's live agent status. [StatusGone] means the manifest
	// exists but herdr does not know the pane.
	Status client.AgentStatus
	// CreatedAt is the manifest's spawn timestamp, unparsed.
	CreatedAt string
}

// StatusGone is the reported status of a worker with a manifest that herdr's
// agent listing does not contain — its pane is closed, or was never started.
// It is deliberately not one of herdr's own statuses: it is an absence.
const StatusGone client.AgentStatus = "gone"

// EpicBoard is one epic's slice of the run.
type EpicBoard struct {
	// Epic is the epic id, or [state.NoEpic] for parentless ticks.
	Epic    string
	Title   string
	Waves   []WaveRow
	Workers []WorkerRow
}

// Snapshot is the whole board at one instant: everything the view renders,
// resolved from disk plus one agent listing.
type Snapshot struct {
	RepoRoot string
	// Epic is the --epic filter this snapshot was loaded under, empty when
	// every epic with run state is included.
	Epic     string
	Epics    []EpicBoard
	LoadedAt time.Time
	// HerdErr records a failed agent listing. It is not fatal: the board
	// still renders manifests and ticks, with statuses shown as unknown.
	HerdErr error
}

// Workers flattens every epic's workers, in board order.
func (s Snapshot) Workers() []WorkerRow {
	var out []WorkerRow
	for _, e := range s.Epics {
		out = append(out, e.Workers...)
	}
	return out
}

// Loader resolves a [Snapshot]. RepoRoot is the controller checkout: the
// tracker under .tick/ and the manifests under .tick/logs/herd both live there.
type Loader struct {
	// RepoRoot is the repository whose run is displayed.
	RepoRoot string
	// Epic narrows the board to one epic. Empty means every epic that has a
	// manifest directory.
	Epic string
	// Now supplies the snapshot timestamp; nil means [time.Now].
	Now func() time.Time
}

// Load reads tick state and run state off disk and joins one herdr agent
// listing onto it.
//
// A herd error is recorded on the snapshot rather than returned: a board that
// blanks because herdr blinked is worse than one that shows the durable state
// and says the live layer is stale. Only an unreadable tracker is an error.
func (l Loader) Load(ctx context.Context, herd Herd) (Snapshot, error) {
	now := time.Now
	if l.Now != nil {
		now = l.Now
	}
	snap := Snapshot{RepoRoot: l.RepoRoot, Epic: l.Epic, LoadedAt: now()}

	ticks, err := tick.NewStore(filepath.Join(l.RepoRoot, ".tick")).List()
	if err != nil {
		return snap, fmt.Errorf("herd/dashboard: reading tick state: %w", err)
	}
	byID := make(map[string]tick.Tick, len(ticks))
	for _, t := range ticks {
		byID[t.ID] = t
	}

	epicIDs, err := l.epics(ticks)
	if err != nil {
		return snap, err
	}

	// The live layer: one listing for the whole board, indexed by pane.
	live := map[string]client.AgentStatus{}
	if herd != nil {
		agents, listErr := herd.AgentList(ctx)
		if listErr != nil {
			snap.HerdErr = listErr
		}
		for _, a := range agents {
			live[a.PaneID] = a.AgentStatus
		}
	}

	for _, epicID := range epicIDs {
		manifests, err := state.List(l.RepoRoot, epicID)
		if err != nil {
			return snap, fmt.Errorf("herd/dashboard: reading run state for %q: %w", epicID, err)
		}
		board := EpicBoard{Epic: epicID}
		if e, ok := byID[epicID]; ok {
			board.Title = e.Title
		}
		paneByTick := make(map[string]state.Manifest, len(manifests))
		for _, m := range manifests {
			paneByTick[m.Tick] = m
			status := StatusGone
			if s, ok := live[m.PaneID]; ok {
				status = s
			} else if snap.HerdErr != nil || herd == nil {
				// Never report a worker as gone on the strength of a
				// listing that failed or was never taken.
				status = client.StatusUnknown
			}
			board.Workers = append(board.Workers, WorkerRow{
				Tick:      m.Tick,
				Epic:      m.Epic,
				Agent:     m.Agent,
				PaneID:    m.PaneID,
				Kind:      m.Kind,
				Branch:    m.Branch,
				Worktree:  m.Worktree,
				Status:    status,
				CreatedAt: m.CreatedAt,
			})
		}
		board.Waves = computeWaves(ticks, byID, epicID, paneByTick)
		snap.Epics = append(snap.Epics, board)
	}
	return snap, nil
}

// epics resolves which epic boards to build: the explicit filter, or every
// epic directory that has run state, or — when nothing has been spawned yet —
// every epic in the tracker that still has open children, so a board opened
// before the first spawn is not blank.
func (l Loader) epics(ticks []tick.Tick) ([]string, error) {
	if l.Epic != "" {
		return []string{l.Epic}, nil
	}
	dir := filepath.Join(l.RepoRoot, filepath.FromSlash(state.RelDir))
	entries, err := os.ReadDir(dir)
	if err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("herd/dashboard: reading %s: %w", dir, err)
	}
	var ids []string
	for _, e := range entries {
		if e.IsDir() {
			ids = append(ids, e.Name())
		}
	}
	if len(ids) > 0 {
		sort.Strings(ids)
		return ids, nil
	}
	seen := map[string]bool{}
	for _, t := range ticks {
		if t.Type != tick.TypeEpic || t.Status == tick.StatusClosed || seen[t.ID] {
			continue
		}
		seen[t.ID] = true
		ids = append(ids, t.ID)
	}
	sort.Strings(ids)
	return ids, nil
}

// computeWaves groups one epic's children into execution waves.
//
// internal/wave.Compute is the single source of wave numbering — the same
// function `tk graph` and the orchestrator use, so the board never invents its
// own ordering. What it excludes (closed ticks, ticks awaiting a human) still
// belongs on a mission-control board, so those land in wave 0.
func computeWaves(all []tick.Tick, byID map[string]tick.Tick, epicID string, manifests map[string]state.Manifest) []WaveRow {
	var children []*tick.Tick
	for i := range all {
		if all[i].Parent == epicID {
			children = append(children, &all[i])
		}
	}
	if len(children) == 0 {
		return nil
	}

	res := wave.Compute(children, all)
	placed := map[string]bool{}
	var rows []WaveRow
	for _, w := range res.Waves {
		row := WaveRow{Number: w.Number}
		for _, t := range w.Tasks {
			placed[t.ID] = true
			row.Ticks = append(row.Ticks, tickRow(*t, byID, manifests))
		}
		rows = append(rows, row)
	}

	var rest WaveRow
	for _, c := range children {
		if placed[c.ID] {
			continue
		}
		rest.Ticks = append(rest.Ticks, tickRow(*c, byID, manifests))
	}
	if len(rest.Ticks) > 0 {
		sort.Slice(rest.Ticks, func(i, j int) bool { return rest.Ticks[i].ID < rest.Ticks[j].ID })
		rows = append([]WaveRow{rest}, rows...)
	}
	return rows
}

// tickRow builds one board row, joining the manifest that names the tick.
func tickRow(t tick.Tick, byID map[string]tick.Tick, manifests map[string]state.Manifest) TickRow {
	row := TickRow{ID: t.ID, Title: t.Title, Status: t.Status, Type: t.Type}
	for _, b := range t.BlockedBy {
		blocker, ok := byID[b]
		if !ok || blocker.Status == tick.StatusClosed {
			continue
		}
		row.Blocked = true
		break
	}
	if m, ok := manifests[t.ID]; ok {
		row.PaneID = m.PaneID
		row.Agent = m.Agent
	}
	return row
}
