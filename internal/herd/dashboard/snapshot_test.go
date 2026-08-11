package dashboard

import (
	"context"
	"errors"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// stubHerd is a hand-rolled Herd for the loader tests: the loader only ever
// calls AgentList, and driving a socket for a listing would prove nothing the
// herdtest-backed watcher tests do not already prove.
type stubHerd struct {
	agents []client.AgentInfo
	err    error
}

func (s stubHerd) AgentList(context.Context) ([]client.AgentInfo, error) { return s.agents, s.err }
func (s stubHerd) EventsSubscribe(context.Context, []client.Subscription) (*client.EventStream, error) {
	return nil, errors.New("not used")
}

func namePtr(s string) *string { return &s }

// epicFixture is one epic with three children in a two-wave dependency shape
// (b depends on a), a closed one, plus manifests for the two live workers.
func epicFixture() ([]tick.Tick, []state.Manifest) {
	epic := fixtureTick("zz0", "mission control", tick.StatusInProgress)
	epic.Type = tick.TypeEpic

	a := fixtureTick("m05", "dashboard pane", tick.StatusInProgress)
	a.Parent = "zz0"
	b := fixtureTick("o83", "paint hook", tick.StatusOpen)
	b.Parent = "zz0"
	b.BlockedBy = []string{"m05"}
	done := fixtureTick("qs1", "scaffold", tick.StatusClosed)
	done.Parent = "zz0"

	return []tick.Tick{epic, a, b, done}, []state.Manifest{
			fixtureManifest("zz0", "m05", "tick-m05", "w1:p1"),
			fixtureManifest("zz0", "o83", "tick-o83", "w1:p2"),
		}
}

func TestLoadJoinsTicksManifestsAndLiveStatus(t *testing.T) {
	ticks, manifests := epicFixture()
	root := seedRepo(t, ticks, manifests)

	herd := stubHerd{agents: []client.AgentInfo{
		{PaneID: "w1:p1", AgentStatus: client.StatusWorking, Name: namePtr("tick-m05")},
		{PaneID: "w1:p2", AgentStatus: client.StatusIdle, Name: namePtr("tick-o83")},
	}}

	snap, err := Loader{RepoRoot: root, Epic: "zz0"}.Load(t.Context(), herd)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(snap.Epics) != 1 {
		t.Fatalf("epics = %d, want 1", len(snap.Epics))
	}
	board := snap.Epics[0]
	if board.Title != "mission control" {
		t.Errorf("epic title = %q, want the tracker's title", board.Title)
	}

	// Waves: the closed tick is in the wave-0 bucket, m05 in wave 1, o83
	// (blocked by m05) in wave 2.
	got := map[string]int{}
	for _, w := range board.Waves {
		for _, tr := range w.Ticks {
			got[tr.ID] = w.Number
		}
	}
	want := map[string]int{"qs1": 0, "m05": 1, "o83": 2}
	for id, n := range want {
		if got[id] != n {
			t.Errorf("tick %s in wave %d, want %d (all: %v)", id, got[id], n, got)
		}
	}

	// The o83 row must show as blocked; m05 must not.
	for _, w := range board.Waves {
		for _, tr := range w.Ticks {
			if tr.ID == "o83" && !tr.Blocked {
				t.Error("o83 has an open blocker but Blocked is false")
			}
			if tr.ID == "m05" && tr.Blocked {
				t.Error("m05 has no open blockers but Blocked is true")
			}
		}
	}

	// Manifests joined onto the tick rows and onto the worker rows.
	if len(board.Workers) != 2 {
		t.Fatalf("workers = %d, want 2", len(board.Workers))
	}
	byTick := map[string]WorkerRow{}
	for _, w := range board.Workers {
		byTick[w.Tick] = w
	}
	if s := byTick["m05"].Status; s != client.StatusWorking {
		t.Errorf("m05 status = %q, want working", s)
	}
	if s := byTick["o83"].Status; s != client.StatusIdle {
		t.Errorf("o83 status = %q, want idle", s)
	}
	if byTick["m05"].Branch != "tick/m05" {
		t.Errorf("branch = %q, want the manifest's branch", byTick["m05"].Branch)
	}
}

func TestLoadReportsAbsentPaneAsGone(t *testing.T) {
	ticks, manifests := epicFixture()
	root := seedRepo(t, ticks, manifests)

	// herdr knows only one of the two panes.
	herd := stubHerd{agents: []client.AgentInfo{
		{PaneID: "w1:p1", AgentStatus: client.StatusWorking},
	}}
	snap, err := Loader{RepoRoot: root, Epic: "zz0"}.Load(t.Context(), herd)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	for _, w := range snap.Epics[0].Workers {
		if w.Tick == "o83" && w.Status != StatusGone {
			t.Errorf("o83 status = %q, want %q", w.Status, StatusGone)
		}
	}
}

// A herdr that is down must not turn every worker into a tombstone: the
// durable layer is still true, and the board says the live layer is stale.
func TestLoadKeepsBoardWhenHerdListingFails(t *testing.T) {
	ticks, manifests := epicFixture()
	root := seedRepo(t, ticks, manifests)

	herd := stubHerd{err: errors.New("connection refused")}
	snap, err := Loader{RepoRoot: root, Epic: "zz0"}.Load(t.Context(), herd)
	if err != nil {
		t.Fatalf("Load returned an error for a herdr outage: %v", err)
	}
	if snap.HerdErr == nil {
		t.Fatal("HerdErr is nil, want the listing failure recorded")
	}
	for _, w := range snap.Epics[0].Workers {
		if w.Status != client.StatusUnknown {
			t.Errorf("worker %s status = %q, want unknown (never gone) after a failed listing", w.Tick, w.Status)
		}
	}
}

// With no --epic the board enumerates the manifest directories.
func TestLoadWithoutEpicEnumeratesRunState(t *testing.T) {
	ticks, manifests := epicFixture()
	manifests = append(manifests, fixtureManifest("other", "zzz", "tick-zzz", "w2:p1"))
	root := seedRepo(t, ticks, manifests)

	snap, err := Loader{RepoRoot: root}.Load(t.Context(), stubHerd{})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	var ids []string
	for _, e := range snap.Epics {
		ids = append(ids, e.Epic)
	}
	if len(ids) != 2 || ids[0] != "other" || ids[1] != "zz0" {
		t.Errorf("epics = %v, want sorted [other zz0]", ids)
	}
}

// Before the first spawn there is no run state at all; the board must still
// show the epic's plan rather than rendering blank.
func TestLoadWithoutRunStateFallsBackToOpenEpics(t *testing.T) {
	ticks, _ := epicFixture()
	root := seedRepo(t, ticks, nil)

	snap, err := Loader{RepoRoot: root}.Load(t.Context(), stubHerd{})
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(snap.Epics) != 1 || snap.Epics[0].Epic != "zz0" {
		t.Fatalf("epics = %+v, want the one open epic", snap.Epics)
	}
	if len(snap.Epics[0].Waves) == 0 {
		t.Error("no waves rendered for an epic with children")
	}
	if len(snap.Epics[0].Workers) != 0 {
		t.Error("workers listed for an epic that was never spawned")
	}
}

// The loader must not need herdr at all — a dashboard opened with no session
// still shows the durable state.
func TestLoadWithNilHerd(t *testing.T) {
	ticks, manifests := epicFixture()
	root := seedRepo(t, ticks, manifests)

	snap, err := Loader{RepoRoot: root, Epic: "zz0"}.Load(t.Context(), nil)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	for _, w := range snap.Epics[0].Workers {
		if w.Status != client.StatusUnknown {
			t.Errorf("worker %s status = %q, want unknown with no herd client", w.Tick, w.Status)
		}
	}
}
