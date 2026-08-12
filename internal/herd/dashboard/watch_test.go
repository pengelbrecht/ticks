package dashboard

import (
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
)

// These run against internal/herd/herdtest — a real unix listener speaking the
// real wire protocol — so the subscription shape, the conditional replay and
// the stream-death path are exercised end to end rather than stubbed.

// nextMsg drains one watcher message, failing the test rather than hanging.
func nextMsg(t *testing.T, w *Watcher) tea.Msg {
	t.Helper()
	select {
	case msg := <-w.msgs:
		return msg
	case <-time.After(10 * time.Second):
		t.Fatal("timed out waiting for a watcher message")
		return nil
	}
}

// waitForStatus drains until a StatusMsg arrives, so a StreamMsg in between
// does not fail the test.
func waitForStatus(t *testing.T, w *Watcher) StatusMsg {
	t.Helper()
	deadline := time.After(10 * time.Second)
	for {
		select {
		case msg := <-w.msgs:
			if s, ok := msg.(StatusMsg); ok {
				return s
			}
		case <-deadline:
			t.Fatal("timed out waiting for a StatusMsg")
		}
	}
}

// The subscription must be pane-scoped AND carry a concrete status: that is
// what makes herdr replay the pane's current status at subscribe time, which
// is how the board is correct the instant it connects.
func TestWatcherSubscribesPerPanePerConcreteStatus(t *testing.T) {
	srv := newFakeHerd(t,
		herdtest.Agent{Name: "tick-a", PaneID: "w1:p1", Status: "working"},
		herdtest.Agent{Name: "tick-b", PaneID: "w1:p2", Status: "idle"},
	)
	w := NewWatcher(dial(t, srv))
	w.Track([]string{"w1:p1", "w1:p2"})
	w.Start(testContext(t))
	t.Cleanup(w.Stop)

	srv.WaitForStreams(1)
	subs := srv.LastSubscriptions()
	if want := 2 * len(SubscribedStatuses); len(subs) != want {
		t.Fatalf("subscriptions = %d, want %d (2 panes × %d statuses)", len(subs), want, len(SubscribedStatuses))
	}
	seen := map[string]map[string]bool{}
	for _, s := range subs {
		if s.Type != herdtest.SubPaneAgentStatusChanged {
			t.Errorf("subscription type = %q, want %q", s.Type, herdtest.SubPaneAgentStatusChanged)
		}
		if s.AgentStatus == "" {
			t.Errorf("subscription for %s carries no agent_status; an unfiltered one does not replay", s.PaneID)
		}
		if seen[s.PaneID] == nil {
			seen[s.PaneID] = map[string]bool{}
		}
		seen[s.PaneID][s.AgentStatus] = true
	}
	for _, pane := range []string{"w1:p1", "w1:p2"} {
		for _, st := range SubscribedStatuses {
			if !seen[pane][string(st)] {
				t.Errorf("pane %s not subscribed for status %q", pane, st)
			}
		}
	}
}

// The conditional-replay property, live-verified in herd/client and reproduced
// by herdtest: a concrete filter reports the pane's CURRENT status immediately,
// closing the window between the board's listing and its subscription.
func TestWatcherReplaysCurrentStatusOnSubscribe(t *testing.T) {
	srv := newFakeHerd(t, herdtest.Agent{Name: "tick-a", PaneID: "w1:p1", Status: "working"})
	w := NewWatcher(dial(t, srv))
	w.Track([]string{"w1:p1"})
	w.Start(testContext(t))
	t.Cleanup(w.Stop)

	got := waitForStatus(t, w)
	if got.PaneID != "w1:p1" || got.Status != client.StatusWorking {
		t.Errorf("replayed %+v, want w1:p1 working", got)
	}
	if got.At.IsZero() {
		t.Error("StatusMsg has no arrival time")
	}
}

func TestWatcherForwardsPushedStatusChanges(t *testing.T) {
	srv := newFakeHerd(t, herdtest.Agent{Name: "tick-a", PaneID: "w1:p1", Status: "working"})
	w := NewWatcher(dial(t, srv))
	w.Track([]string{"w1:p1"})
	w.Start(testContext(t))
	t.Cleanup(w.Stop)

	srv.WaitForStreams(1)
	waitForStatus(t, w) // the replay
	srv.PushStatus("tick-a", "blocked")

	got := waitForStatus(t, w)
	if got.Status != client.StatusBlocked {
		t.Errorf("forwarded %q, want blocked", got.Status)
	}
}

// A newly spawned worker's pane only becomes known through the safety re-list.
// Track must therefore resubscribe — and the new subscription's replay must
// deliver that pane's current status without anything being pushed.
func TestTrackResubscribesForANewPane(t *testing.T) {
	srv := newFakeHerd(t,
		herdtest.Agent{Name: "tick-a", PaneID: "w1:p1", Status: "working"},
		herdtest.Agent{Name: "tick-b", PaneID: "w1:p2", Status: "done"},
	)
	w := NewWatcher(dial(t, srv))
	w.Track([]string{"w1:p1"})
	w.Start(testContext(t))
	t.Cleanup(w.Stop)

	srv.WaitForStreams(1)
	waitForStatus(t, w)

	w.Track([]string{"w1:p1", "w1:p2"})

	deadline := time.After(10 * time.Second)
	for {
		select {
		case msg := <-w.msgs:
			if s, ok := msg.(StatusMsg); ok && s.PaneID == "w1:p2" {
				if s.Status != client.StatusDone {
					t.Errorf("new pane replayed %q, want done", s.Status)
				}
				if n := srv.Subscribes(); n < 2 {
					t.Errorf("events.subscribe called %d times, want a resubscribe", n)
				}
				return
			}
		case <-deadline:
			t.Fatal("the new pane was never subscribed to")
		}
	}
}

// An unchanged pane set must NOT churn the stream: the safety ticker calls
// Track every 30s and a resubscribe each time would be a poll in disguise.
func TestTrackWithAnUnchangedSetDoesNotResubscribe(t *testing.T) {
	srv := newFakeHerd(t, herdtest.Agent{Name: "tick-a", PaneID: "w1:p1", Status: "idle"})
	w := NewWatcher(dial(t, srv))
	w.Track([]string{"w1:p1"})
	w.Start(testContext(t))
	t.Cleanup(w.Stop)

	srv.WaitForStreams(1)
	waitForStatus(t, w)
	before := srv.Subscribes()

	for i := 0; i < 5; i++ {
		w.Track([]string{"w1:p1"})
		// Order-insensitive too: the pane set is normalised.
		w.Track([]string{" w1:p1 ", "w1:p1"})
	}
	time.Sleep(200 * time.Millisecond)

	if after := srv.Subscribes(); after != before {
		t.Errorf("events.subscribe went %d → %d on an unchanged pane set", before, after)
	}
}

// Stream death: report it, ask for a reload (closing the gap in which nothing
// was subscribed), then resubscribe. Unlike internal/herd/wait, a second break
// is not fatal — a dashboard reconnects for as long as it is open.
func TestWatcherRecoversFromStreamDeath(t *testing.T) {
	srv := newFakeHerd(t, herdtest.Agent{Name: "tick-a", PaneID: "w1:p1", Status: "working"})
	w := NewWatcher(dial(t, srv))
	w.backoff = 20 * time.Millisecond
	w.Track([]string{"w1:p1"})
	w.Start(testContext(t))
	t.Cleanup(w.Stop)

	srv.WaitForStreams(1)
	waitForStatus(t, w)

	srv.SetStatus("tick-a", "blocked")
	srv.KillStreams()

	var sawDown, sawReload bool
	deadline := time.After(10 * time.Second)
	for !sawDown || !sawReload {
		select {
		case msg := <-w.msgs:
			switch v := msg.(type) {
			case StreamMsg:
				if !v.Up && v.Err != nil {
					sawDown = true
				}
			case ReloadMsg:
				sawReload = true
			}
		case <-deadline:
			t.Fatalf("after a stream death: down=%v reload=%v", sawDown, sawReload)
		}
	}

	// The resubscribe replays whatever the pane became while nothing was
	// listening — no event was pushed for "blocked".
	got := waitForStatus(t, w)
	if got.Status != client.StatusBlocked {
		t.Errorf("post-recovery replay = %q, want blocked", got.Status)
	}
	if n := srv.Subscribes(); n < 2 {
		t.Errorf("events.subscribe called %d times, want a resubscribe", n)
	}
}

// herdr rejects an empty subscription list, so an unspawned board must simply
// not subscribe — and must say so.
func TestWatcherWithNoPanesReportsIdleWithoutSubscribing(t *testing.T) {
	srv := newFakeHerd(t)
	w := NewWatcher(dial(t, srv))
	w.backoff = 20 * time.Millisecond
	w.Start(testContext(t))
	t.Cleanup(w.Stop)

	msg := nextMsg(t, w)
	sm, ok := msg.(StreamMsg)
	if !ok || sm.Up || sm.Panes != 0 {
		t.Fatalf("got %+v, want StreamMsg{Up:false, Panes:0}", msg)
	}
	if n := srv.Subscribes(); n != 0 {
		t.Errorf("events.subscribe called %d times with no panes to watch", n)
	}
}

// A nil herd client must not panic or spawn anything: the board then runs on
// the safety re-list alone.
func TestWatcherWithNilHerdIsInert(t *testing.T) {
	w := NewWatcher(nil)
	w.Start(testContext(t))
	w.Track([]string{"w1:p1"})
	w.Stop()
	if cmd := w.Next(); cmd == nil {
		t.Fatal("Next returned no command")
	}
}

func TestNormalizePanes(t *testing.T) {
	got := normalizePanes([]string{"w1:p2", "", "  w1:p1  ", "w1:p2"})
	if len(got) != 2 || got[0] != "w1:p1" || got[1] != "w1:p2" {
		t.Errorf("normalizePanes = %v, want [w1:p1 w1:p2]", got)
	}
}
