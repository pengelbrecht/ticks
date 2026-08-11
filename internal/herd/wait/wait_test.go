package wait

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
)

// resultsByName indexes a summary for assertions.
func resultsByName(s *Summary) map[string]Result {
	out := make(map[string]Result, len(s.Workers))
	for _, r := range s.Workers {
		out[r.Name] = r
	}
	return out
}

// TestWaitPreSettledFastPath pins the cheap path: workers that have already
// settled are answered from the opening agent.list and never subscribed to.
func TestWaitPreSettledFastPath(t *testing.T) {
	srv := newFakeHerd(t,
		&fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusIdle},
		&fakeAgent{name: "tick-b", paneID: "w1:p2", status: client.StatusDone},
	)
	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a", "tick-b"},
		Timeout: 5 * time.Second,
	})
	if err != nil {
		t.Fatalf("Wait: %v", err)
	}
	if !sum.OK() || sum.Settled != 2 {
		t.Fatalf("want 2 settled and OK, got %+v", sum)
	}
	if got := srv.Lists(); got != 1 {
		t.Errorf("agent.list calls = %d, want 1 (one round trip resolves current state)", got)
	}
	if got := srv.Subscribes(); got != 0 {
		t.Errorf("events.subscribe calls = %d, want 0 for pre-settled workers", got)
	}
	byName := resultsByName(sum)
	if byName["tick-a"].State != "idle" || byName["tick-b"].State != "done" {
		t.Errorf("unexpected states: %+v", sum.Workers)
	}
}

// TestWaitAbsentWorkerIsExited pins that an unknown worker is reported, not
// waited on.
func TestWaitAbsentWorkerIsExited(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusIdle})
	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a", "tick-gone"},
		Timeout: 5 * time.Second,
	})
	if err != nil {
		t.Fatalf("Wait: %v", err)
	}
	gone := resultsByName(sum)["tick-gone"]
	if !gone.Exited || gone.State != StateExited {
		t.Fatalf("absent worker = %+v, want exited", gone)
	}
	if sum.Exited != 1 || !sum.OK() {
		t.Errorf("summary = %+v, want one exited and OK", sum)
	}
	if got := srv.Subscribes(); got != 0 {
		t.Errorf("events.subscribe calls = %d, want 0 — an absent worker must not be waited on", got)
	}
}

// TestWaitEventDrivenSettle pins the core behaviour: the wait returns on a
// pushed event, with no polling.
func TestWaitEventDrivenSettle(t *testing.T) {
	srv := newFakeHerd(t,
		&fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking},
		&fakeAgent{name: "tick-b", paneID: "w1:p2", status: client.StatusWorking},
	)
	go func() {
		srv.waitForStreams(1)
		srv.pushStatus("tick-a", client.StatusIdle)
		srv.pushStatus("tick-b", client.StatusDone)
	}()

	var settled []string
	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers:  []string{"tick-a", "tick-b"},
		Timeout:  10 * time.Second,
		OnSettle: func(r Result) { settled = append(settled, r.Name+"="+r.State) },
	})
	if err != nil {
		t.Fatalf("Wait: %v", err)
	}
	if sum.Settled != 2 || !sum.OK() {
		t.Fatalf("summary = %+v, want 2 settled", sum)
	}
	if len(settled) != 2 {
		t.Errorf("OnSettle calls = %v, want one per worker", settled)
	}
	if got := srv.Lists(); got != 1 {
		t.Errorf("agent.list calls = %d, want 1 — the stream, not a poll loop, drives the wait", got)
	}
	if got := srv.Subscribes(); got != 1 {
		t.Errorf("events.subscribe calls = %d, want a single stream for the whole wave", got)
	}
}

// TestWaitSubscribesPerTerminalStatus pins the subscription design: one
// subscription per (pending pane, terminal status), each carrying a concrete
// agent_status filter. Without that filter herdr does not replay current
// status and the list→subscribe window loses a settle.
func TestWaitSubscribesPerTerminalStatus(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	go func() {
		srv.waitForStreams(1)
		srv.pushStatus("tick-a", client.StatusIdle)
	}()
	if _, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a"},
		Timeout: 10 * time.Second,
	}); err != nil {
		t.Fatalf("Wait: %v", err)
	}

	subs := srv.LastSubs()
	if len(subs) != 3 {
		t.Fatalf("subscriptions = %d, want 3 (idle|done|blocked) for one pending worker: %+v", len(subs), subs)
	}
	seen := map[client.AgentStatus]bool{}
	for _, sub := range subs {
		if sub.Type != client.SubPaneAgentStatusChanged {
			t.Errorf("subscription type = %s, want %s", sub.Type, client.SubPaneAgentStatusChanged)
		}
		if sub.PaneID != "w1:p1" {
			t.Errorf("subscription pane = %q, want w1:p1", sub.PaneID)
		}
		if sub.AgentStatus == "" {
			t.Fatalf("subscription %+v has no agent_status filter — no replay, missed wakeup", sub)
		}
		seen[sub.AgentStatus] = true
	}
	for _, want := range []client.AgentStatus{client.StatusIdle, client.StatusDone, client.StatusBlocked} {
		if !seen[want] {
			t.Errorf("no subscription for terminal status %q", want)
		}
	}
}

// TestWaitRaceListThenSubscribe pins the missed-wakeup race closed: the worker
// settles in the window between the opening agent.list and the subscribe, so
// no transition is ever pushed. Only the replay of a status-filtered
// subscription can report it.
func TestWaitRaceListThenSubscribe(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	srv.afterList = func(n int) {
		if n == 1 {
			// Settle silently: no live stream exists, so nothing is pushed.
			srv.setStatus("tick-a", client.StatusDone)
		}
	}

	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a"},
		Timeout: 10 * time.Second,
	})
	if err != nil {
		t.Fatalf("Wait: %v", err)
	}
	if got := resultsByName(sum)["tick-a"].State; got != "done" {
		t.Fatalf("state = %q, want done — the settle in the list→subscribe window was lost", got)
	}
	if got := srv.Lists(); got != 1 {
		t.Errorf("agent.list calls = %d, want 1 — the race is closed by the subscription, not a re-list", got)
	}
}

// TestWaitBlockedWorker pins that a blocked settle is terminal but not OK.
func TestWaitBlockedWorker(t *testing.T) {
	srv := newFakeHerd(t,
		&fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusIdle},
		&fakeAgent{name: "tick-b", paneID: "w1:p2", status: client.StatusWorking},
	)
	go func() {
		srv.waitForStreams(1)
		srv.pushStatus("tick-b", client.StatusBlocked)
	}()

	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a", "tick-b"},
		Timeout: 10 * time.Second,
	})
	if err != nil {
		t.Fatalf("Wait: %v", err)
	}
	if sum.Blocked != 1 || sum.Settled != 1 {
		t.Fatalf("summary = %+v, want 1 blocked and 1 settled", sum)
	}
	if sum.OK() {
		t.Error("summary.OK() = true for a blocked worker, want false (non-zero exit)")
	}
}

// TestWaitTimeout pins the hard deadline: the wait returns a partial answer
// rather than an error, naming who never settled.
func TestWaitTimeout(t *testing.T) {
	srv := newFakeHerd(t,
		&fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusIdle},
		&fakeAgent{name: "tick-b", paneID: "w1:p2", status: client.StatusWorking},
	)
	start := time.Now()
	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a", "tick-b"},
		Timeout: 150 * time.Millisecond,
	})
	if err != nil {
		t.Fatalf("Wait: %v (a timeout is an outcome, not an error)", err)
	}
	if elapsed := time.Since(start); elapsed > 5*time.Second {
		t.Fatalf("wait took %s, want to stop at the deadline", elapsed)
	}
	if !sum.TimeoutFired || len(sum.TimedOut) != 1 || sum.TimedOut[0] != "tick-b" {
		t.Fatalf("summary = %+v, want timeout naming tick-b", sum)
	}
	if sum.OK() {
		t.Error("summary.OK() = true after a timeout, want false")
	}
	if got := resultsByName(sum)["tick-b"].State; got != "working" {
		t.Errorf("timed-out worker state = %q, want its last known status", got)
	}
}

// TestWaitContextCancelled pins clean cancellation: the caller's cancel is an
// error, distinct from the wait's own deadline.
func TestWaitContextCancelled(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	ctx, cancel := context.WithCancel(testContext(t))
	go func() {
		srv.waitForStreams(1)
		cancel()
	}()
	_, err := Wait(ctx, srv.Client(t), Options{Workers: []string{"tick-a"}, Timeout: 10 * time.Second})
	if err == nil {
		t.Fatal("Wait returned nil error after cancellation")
	}
	if !strings.Contains(err.Error(), "context canceled") {
		t.Errorf("error = %v, want the cancellation", err)
	}
}

// TestWaitStreamDeathReconcileClosesGap pins the documented recovery: a broken
// stream is followed by an agent.list that closes the gap. Here the worker
// settled while nothing was subscribed, so the reconcile alone answers it.
func TestWaitStreamDeathReconcileClosesGap(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	srv.killSub = func(n int) bool {
		if n != 1 {
			return false
		}
		// The worker settles while no stream is watching.
		srv.setStatus("tick-a", client.StatusIdle)
		return true
	}

	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a"},
		Timeout: 10 * time.Second,
	})
	if err != nil {
		t.Fatalf("Wait: %v", err)
	}
	if got := resultsByName(sum)["tick-a"].State; got != "idle" {
		t.Fatalf("state = %q, want idle from the post-failure reconcile", got)
	}
	if got := srv.Lists(); got != 2 {
		t.Errorf("agent.list calls = %d, want 2 (opening + reconcile after the stream died)", got)
	}
}

// TestWaitStreamDeathResubscribes pins that a broken stream is replaced once
// and the wait then completes on a pushed event.
func TestWaitStreamDeathResubscribes(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	srv.killSub = func(n int) bool { return n == 1 }
	go func() {
		srv.waitForStreams(1) // the second subscribe is the first live stream
		srv.pushStatus("tick-a", client.StatusDone)
	}()

	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a"},
		Timeout: 10 * time.Second,
	})
	if err != nil {
		t.Fatalf("Wait: %v", err)
	}
	if got := resultsByName(sum)["tick-a"].State; got != "done" {
		t.Fatalf("state = %q, want done", got)
	}
	if got := srv.Subscribes(); got != 2 {
		t.Errorf("events.subscribe calls = %d, want 2 (original + one resubscribe)", got)
	}
	if got := srv.Lists(); got != 2 {
		t.Errorf("agent.list calls = %d, want 2 (opening + reconcile)", got)
	}
}

// TestWaitStreamDiesTwice pins the failure stop: one resubscribe, not a retry
// loop.
func TestWaitStreamDiesTwice(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	srv.killSub = func(n int) bool { return true }

	_, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a"},
		Timeout: 10 * time.Second,
	})
	if err == nil {
		t.Fatal("Wait returned nil error after two stream failures")
	}
	if !strings.Contains(err.Error(), "resubscrib") {
		t.Errorf("error = %v, want it to name the failed resubscribe", err)
	}
	if got := srv.Subscribes(); got != 2 {
		t.Errorf("events.subscribe calls = %d, want exactly 2 attempts", got)
	}
}

// TestWaitInvalidPaneAttribution pins that a rejected subscription is reported
// against the worker it belongs to. herdr names only the first bad
// subscription, by index, so the index has to be mapped back to a worker.
func TestWaitInvalidPaneAttribution(t *testing.T) {
	srv := newFakeHerd(t,
		&fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking},
		&fakeAgent{name: "tick-b", paneID: "w1:p2", status: client.StatusWorking},
	)
	// Index 4 is the second worker's second subscription.
	srv.rejectSub = func(n int) (int, bool) { return 4, true }

	_, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a", "tick-b"},
		Timeout: 5 * time.Second,
	})
	if err == nil {
		t.Fatal("Wait returned nil error for a rejected subscription")
	}
	if !strings.Contains(err.Error(), "tick-b") || !strings.Contains(err.Error(), "w1:p2") {
		t.Fatalf("error = %v, want it to name worker tick-b and pane w1:p2", err)
	}
	if !client.IsCode(err, client.CodePaneNotFound) {
		t.Errorf("error = %v, want the underlying pane_not_found to stay inspectable", err)
	}
}

// TestWaitNoWorkers pins the argument check.
func TestWaitNoWorkers(t *testing.T) {
	srv := newFakeHerd(t)
	if _, err := Wait(testContext(t), srv.Client(t), Options{Timeout: time.Second}); err == nil {
		t.Fatal("Wait with no workers returned nil error")
	}
}
