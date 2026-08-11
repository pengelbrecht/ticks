package client

import (
	"context"
	"os"
	"testing"
	"time"
)

// LiveTestEnv is the explicit opt-in for the live round-trip test. The test
// also requires HERDR_ENV=1, and is skipped under `go test -short`, so it
// never runs in CI by accident.
const LiveTestEnv = "TK_HERD_LIVE_TEST"

// TestLiveRoundTrip talks to the real herdr server on this machine. It is
// read-only: ping, session.snapshot, agent.list and worktree.list create no
// herdr state. It compiles everywhere and runs only when opted into.
func TestLiveRoundTrip(t *testing.T) {
	if testing.Short() {
		t.Skip("live herdr round-trip skipped in -short mode")
	}
	if os.Getenv("HERDR_ENV") != "1" {
		t.Skip("live herdr round-trip skipped: HERDR_ENV is not 1")
	}
	if os.Getenv(LiveTestEnv) == "" {
		t.Skipf("live herdr round-trip skipped: set %s=1 to opt in", LiveTestEnv)
	}

	ctx := t.Context()
	c, err := New(ctx, Options{CallTimeout: 15 * time.Second})
	if err != nil {
		t.Fatalf("New against the live server: %v", err)
	}
	t.Logf("connected to herdr %s (protocol %d) at %s", c.ServerInfo().Version, c.ServerInfo().Protocol, c.SocketPath())

	snap, err := c.SessionSnapshot(ctx)
	if err != nil {
		t.Fatalf("SessionSnapshot: %v", err)
	}
	if snap.Protocol != ProtocolVersion {
		t.Errorf("snapshot protocol = %d, want %d", snap.Protocol, ProtocolVersion)
	}
	if len(snap.Panes) == 0 {
		t.Error("live session reported no panes")
	}

	agents, err := c.AgentList(ctx)
	if err != nil {
		t.Fatalf("AgentList: %v", err)
	}
	t.Logf("live session has %d workspaces, %d panes, %d agents", len(snap.Workspaces), len(snap.Panes), len(agents))

	listing, err := c.WorktreeList(ctx, WorktreeListParams{})
	if err != nil {
		t.Fatalf("WorktreeList: %v", err)
	}
	if listing.Source.RepoRoot == "" {
		t.Error("worktree listing reported no repo root")
	}

	// An unknown target must map to a structured not-found error.
	if _, err := c.AgentGet(ctx, "tk-herd-live-test-nonexistent"); !IsCode(err, CodeAgentNotFound) {
		t.Errorf("AgentGet on an unknown target = %v, want %s", err, CodeAgentNotFound)
	}

	// The two-envelope behaviour is the thing fixtures cannot catch drifting.
	// Subscribing to a pane's current status must push immediately, in the
	// dotted subscription_event spelling, and the accessor must decode it.
	if len(agents) == 0 {
		t.Skip("no agents in the live session to subscribe to")
	}
	target := agents[0]

	subCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	stream, err := c.EventsSubscribe(subCtx, []Subscription{
		SubscribeAgentStatus(target.PaneID, target.AgentStatus),
	})
	if err != nil {
		t.Fatalf("EventsSubscribe on %s: %v", target.PaneID, err)
	}
	defer stream.Close()

	select {
	case ev, ok := <-stream.Events():
		if !ok {
			t.Fatalf("stream closed without an event: %v", stream.Err())
		}
		if ev.Kind != EventScopedPaneAgentStatusChanged {
			t.Errorf("live scoped event kind = %q, want %q — herdr's envelope spelling has drifted",
				ev.Kind, EventScopedPaneAgentStatusChanged)
		}
		changed, err := ev.AgentStatusChanged()
		if err != nil {
			t.Fatalf("AgentStatusChanged on a live scoped event: %v", err)
		}
		if changed.PaneID != target.PaneID || changed.AgentStatus != target.AgentStatus {
			t.Errorf("changed = %+v, want pane %s in status %s", changed, target.PaneID, target.AgentStatus)
		}
		t.Logf("immediate replay confirmed: %s already %s", changed.PaneID, changed.AgentStatus)
	case <-subCtx.Done():
		t.Error("subscribing to a pane's current status did not replay it immediately; " +
			"the missed-wakeup guarantee EventsSubscribe documents no longer holds")
	}

	// A session-wide subscription carrying a pane id must be refused
	// client-side, since herdr would accept it and fire for every pane.
	if _, err := c.EventsSubscribe(ctx, []Subscription{{Type: SubPaneUpdated, PaneID: target.PaneID}}); err == nil {
		t.Error("a mis-scoped session-wide subscription was not rejected")
	}
}
