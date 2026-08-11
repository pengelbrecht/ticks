package dashboard

import (
	"context"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// The seam between this package's client types and internal/herd/herdtest, the
// repo's one canonical fake herdr server. herdtest cannot import herd/client
// (that package's own tests would become an import cycle), so every conversion
// happens here — the same arrangement internal/herd/wait uses.

// newFakeHerd starts a fake herdr server seeded with agent-bearing panes.
func newFakeHerd(t *testing.T, agents ...herdtest.Agent) *herdtest.Server {
	t.Helper()
	return herdtest.New(t, herdtest.Config{Agents: agents})
}

// dial returns a herdr client connected to a fake. The timeouts are generous
// on purpose: under full-suite parallel load a slow accept is machine
// contention, not the behaviour under test.
func dial(t *testing.T, s *herdtest.Server) *client.Client {
	t.Helper()
	c, err := client.New(t.Context(), client.Options{
		SocketPath:  s.Path(),
		DialTimeout: 30 * time.Second,
		CallTimeout: 30 * time.Second,
	})
	if err != nil {
		t.Fatalf("client.New: %v", err)
	}
	return c
}

// testContext is bounded well under `go test` patience, so a broken watcher
// fails the test rather than hanging it.
func testContext(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), 20*time.Second)
	t.Cleanup(cancel)
	return ctx
}

// fixedTime is the clock every fixture is stamped with, so nothing in a test
// depends on wall time.
var fixedTime = time.Date(2026, 8, 11, 12, 0, 0, 0, time.UTC)

// seedRepo writes a hermetic repo root: .tick/issues/ for the tracker and
// .tick/logs/herd/<epic>/ for the run manifests. It returns the root.
func seedRepo(t *testing.T, ticks []tick.Tick, manifests []state.Manifest) string {
	t.Helper()
	root := t.TempDir()
	store := tick.NewStore(root + "/.tick")
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}
	for _, tk := range ticks {
		if err := store.Write(tk); err != nil {
			t.Fatalf("write tick %s: %v", tk.ID, err)
		}
	}
	for _, m := range manifests {
		if _, err := state.Write(root, m); err != nil {
			t.Fatalf("write manifest %s: %v", m.Tick, err)
		}
	}
	return root
}

// fixtureTick builds a tick with fixed timestamps.
func fixtureTick(id, title, status string) tick.Tick {
	return tick.Tick{
		ID:        id,
		Title:     title,
		Status:    status,
		Priority:  1,
		Type:      tick.TypeTask,
		Owner:     "alice",
		CreatedBy: "alice",
		CreatedAt: fixedTime,
		UpdatedAt: fixedTime,
	}
}

// fixtureManifest builds a run-state manifest for a tick in an epic.
func fixtureManifest(epic, tickID, agent, pane string) state.Manifest {
	return state.Manifest{
		Tick:        tickID,
		Epic:        epic,
		Branch:      "tick/" + tickID,
		Worktree:    "/tmp/wt-" + tickID,
		WorkspaceID: "w1",
		PaneID:      pane,
		Agent:       agent,
		Kind:        "claude",
		Base:        "deadbeef",
		CreatedAt:   fixedTime.Format(state.TimeLayout),
	}
}
