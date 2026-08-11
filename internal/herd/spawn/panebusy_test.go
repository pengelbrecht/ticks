package spawn

import (
	"sync"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
)

// The agent_pane_busy retry budget is the CALLER'S startup timeout, not a
// fixed attempt count. It used to be twelve tries at 250ms — a hard ~3s
// ceiling that ignored --startup-timeout entirely.

// busyThenReady routes agent.start to answer agent_pane_busy the first n times
// and then succeed, and reports how many starts were attempted.
func busyThenReady(srv *fakeHerd, n int) func() int {
	var mu sync.Mutex
	calls := 0
	// The override falls through to the fake's canonical agent.start reply
	// once the scripted busy run is over, so the success path keeps every
	// field herdr really sends (interactive_ready included).
	happy := srv.Builtin(client.MethodAgentStart)
	srv.Route(client.MethodAgentStart, func(t *testing.T, req herdtest.Request, w *herdtest.ConnWriter) error {
		mu.Lock()
		calls++
		busy := calls <= n
		mu.Unlock()
		if busy {
			return herdtest.RespondErr(w, req.ID, client.CodeAgentPaneBusy,
				"pane w7:p1 is not an available shell")
		}
		return happy(t, req, w)
	})
	return func() int {
		mu.Lock()
		defer mu.Unlock()
		return calls
	}
}

// TestPaneBusyRetriesPastTheOldFixedCap is the regression pin: a fake that
// stays busy for twenty attempts — well past the old twelve-attempt cap and
// well inside the requested timeout — must still come up.
func TestPaneBusyRetriesPastTheOldFixedCap(t *testing.T) {
	// Compress the poll interval so the test spends milliseconds rather than
	// seconds; what is under test is the ceiling, not the interval.
	restore := paneReadyBackoff
	paneReadyBackoff = time.Millisecond
	t.Cleanup(func() { paneReadyBackoff = restore })

	srv := newFakeHerd(t)
	srv.setPaneTexts(paneAfterAnswer(DefaultGateProbe))
	starts := busyThenReady(srv, 20)

	opts := baseOptions()
	opts.StartupTimeout = 30 * time.Second

	res, err := Run(t.Context(), srv.Client(t), opts)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if n := starts(); n != 21 {
		t.Errorf("agent.start attempts = %d, want 21 (20 busy + the one that stuck)", n)
	}
	if res.WorkspaceID != "w7" {
		t.Errorf("WorkspaceID = %q, want the spawn to have completed", res.WorkspaceID)
	}
}

// TestPaneBusyGivesUpAtTheWindow pins the other edge: the retries ARE bounded,
// a permanently wedged pane cannot hang a wave, and the error an operator sees
// is still herdr's own.
func TestPaneBusyGivesUpAtTheWindow(t *testing.T) {
	srv := newFakeHerd(t)
	starts := busyThenReady(srv, 1000000) // never becomes ready

	_, err := startWhenPaneReadyWithin(t.Context(), srv.Client(t),
		client.AgentStartParams{Name: "tick-1aw", Kind: "claude", PaneID: "w7:p1"},
		50*time.Millisecond, 10*time.Millisecond)
	if err == nil {
		t.Fatal("a permanently busy pane returned no error")
	}
	if !client.IsCode(err, client.CodeAgentPaneBusy) {
		t.Errorf("err = %v, want herdr's own agent_pane_busy unchanged", err)
	}
	// 50ms of window at 10ms per retry: a handful of attempts, not one and
	// not thousands.
	if n := starts(); n < 2 || n > 8 {
		t.Errorf("agent.start attempts = %d, want the window to bound them (2..8)", n)
	}
}

// TestPaneReadyWindowFollowsStartupTimeout pins the ceiling itself: it is the
// caller's startup timeout, with the package default standing in for "let
// herdr decide".
func TestPaneReadyWindowFollowsStartupTimeout(t *testing.T) {
	for _, tc := range []struct {
		timeout time.Duration
		want    time.Duration
	}{
		{0, DefaultStartupTimeout},
		{-time.Second, DefaultStartupTimeout},
		{10 * time.Second, 10 * time.Second},
		{300 * time.Second, 300 * time.Second},
	} {
		if got := paneReadyWindow(tc.timeout); got != tc.want {
			t.Errorf("paneReadyWindow(%s) = %s, want %s", tc.timeout, got, tc.want)
		}
	}
}
