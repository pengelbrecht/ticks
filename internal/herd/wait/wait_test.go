package wait

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
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
	srv.SetAfterList(func(n int) {
		if n == 1 {
			// Settle silently: no live stream exists, so nothing is pushed.
			srv.setStatus("tick-a", client.StatusDone)
		}
	})

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

// TestWaitBlockedHandlerResumesWorker pins the opt-in escalation seam: blocked
// is handed to the operator callback without settling the worker, and a working
// result puts the same worker back under the original event stream.
func TestWaitBlockedHandlerResumesWorker(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	started := make(chan Result, 1)
	release := make(chan struct{})
	resumed := make(chan struct{})
	go func() {
		srv.waitForStreams(1)
		srv.pushStatus("tick-a", client.StatusBlocked)
		blocked := <-started
		if blocked.AgentName != "tick-a" {
			t.Errorf("blocked agent name = %q, want tick-a", blocked.AgentName)
		}
		close(release)
		<-resumed
		srv.pushStatus("tick-a", client.StatusDone)
	}()

	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a"},
		Timeout: 10 * time.Second,
		OnBlocked: func(ctx context.Context, r Result) (client.AgentStatus, error) {
			started <- r
			select {
			case <-release:
				close(resumed)
				return client.StatusWorking, nil
			case <-ctx.Done():
				return client.StatusBlocked, ctx.Err()
			}
		},
	})
	if err != nil {
		t.Fatalf("Wait: %v", err)
	}
	if sum.Blocked != 0 || sum.Settled != 1 || !sum.OK() {
		t.Fatalf("summary = %+v, want one resumed settled worker", sum)
	}
	if got := resultsByName(sum)["tick-a"].State; got != string(client.StatusDone) {
		t.Errorf("tick-a state = %q, want done after the resumed wait", got)
	}
}

// TestWaitBlockedHandlerErrorIsNotStreamFailure pins error ownership: a relay
// failure belongs to the caller and must not trigger the waiter's one allowed
// event-stream resubscription.
func TestWaitBlockedHandlerErrorIsNotStreamFailure(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	want := errors.New("operator unavailable")
	go func() {
		srv.waitForStreams(1)
		srv.pushStatus("tick-a", client.StatusBlocked)
	}()

	_, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a"},
		Timeout: 10 * time.Second,
		OnBlocked: func(context.Context, Result) (client.AgentStatus, error) {
			return client.StatusBlocked, want
		},
	})
	if !errors.Is(err, want) {
		t.Fatalf("Wait error = %v, want blocked-handler error %v", err, want)
	}
	if got := srv.Subscribes(); got != 1 {
		t.Errorf("events.subscribe calls = %d, want 1 — handler failure is not stream failure", got)
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
		// 2s, not 150ms: the opening AgentList round-trip runs inside this
		// budget, and under full-suite machine load a slow accept alone can
		// eat 150ms — flaking the test for contention, not behavior. tick-b
		// never settles, so any bounded timeout exercises the same path.
		Timeout: 2 * time.Second,
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
	srv.SetKillSubscribe(func(n int) bool {
		if n != 1 {
			return false
		}
		// The worker settles while no stream is watching.
		srv.setStatus("tick-a", client.StatusIdle)
		return true
	})

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

// TestWaitDuplicateTerminalEventsSettleOnce pins settle dedupe against the
// duplicates the three-subscription design guarantees. One pending pane carries
// three subscriptions (idle|done|blocked), so a worker that bounces idle→done
// delivers two terminal events for the same pane — and herdr can repeat a
// status event on its own. The first one is the answer: later ones must not
// re-report the worker, overwrite its state or fire OnSettle again.
//
// tick-b stays pending across all of tick-a's duplicates, so the waiter is
// guaranteed to have consumed them (one ordered stream) rather than to have
// exited before they arrived.
func TestWaitDuplicateTerminalEventsSettleOnce(t *testing.T) {
	srv := newFakeHerd(t,
		&fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking},
		&fakeAgent{name: "tick-b", paneID: "w1:p2", status: client.StatusWorking},
	)
	go func() {
		srv.waitForStreams(1)
		srv.pushStatus("tick-a", client.StatusIdle)
		srv.pushStatus("tick-a", client.StatusIdle) // herdr repeating itself
		srv.pushStatus("tick-a", client.StatusDone) // the second terminal sub
		srv.pushStatus("tick-b", client.StatusDone) // releases the wait
	}()

	var settled []Result
	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers:  []string{"tick-a", "tick-b"},
		Timeout:  10 * time.Second,
		OnSettle: func(r Result) { settled = append(settled, r) },
	})
	if err != nil {
		t.Fatalf("Wait: %v", err)
	}
	if len(settled) != 2 {
		t.Fatalf("OnSettle fired %d times (%+v), want exactly one per worker", len(settled), settled)
	}
	if settled[0].Name != "tick-a" || settled[0].State != "idle" {
		t.Errorf("first settle = %+v, want tick-a idle — the first terminal event is the answer", settled[0])
	}
	if got := resultsByName(sum)["tick-a"].State; got != "idle" {
		t.Errorf("tick-a state = %q, want idle — a later duplicate overwrote the settled result", got)
	}
	if sum.Settled != 2 || !sum.OK() {
		t.Errorf("summary = %+v, want 2 settled and OK", sum)
	}
	if len(sum.Workers) != 2 {
		t.Errorf("workers = %+v, want one row per requested worker", sum.Workers)
	}
	if got := srv.Subscribes(); got != 1 {
		t.Errorf("events.subscribe calls = %d, want 1 — a duplicate must not restart the stream", got)
	}
}

// TestWaitStreamDeathAfterPartialDelivery pins recovery from a stream that dies
// mid-wave: some workers have already been answered from pushed events, others
// are still pending. The reconcile-then-resubscribe must keep the delivered
// answers AND pick up the stragglers.
//
// tick-a is removed from the session before the kill, so a reconcile that
// re-answered settled workers would report it "exited" — the only way the test
// can see the difference between "kept the event" and "re-derived from the
// listing".
func TestWaitStreamDeathAfterPartialDelivery(t *testing.T) {
	srv := newFakeHerd(t,
		&fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking},
		&fakeAgent{name: "tick-b", paneID: "w1:p2", status: client.StatusWorking},
	)
	settledA := make(chan struct{})
	go func() {
		srv.waitForStreams(1)
		srv.pushStatus("tick-a", client.StatusIdle)
		<-settledA // the partial delivery has landed; now break the stream
		srv.RemoveAgent("tick-a")
		srv.KillStreams()
		srv.waitForStreams(1) // the resubscribed stream
		srv.pushStatus("tick-b", client.StatusDone)
	}()

	var settled []Result
	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a", "tick-b"},
		Timeout: 15 * time.Second,
		OnSettle: func(r Result) {
			settled = append(settled, r)
			if r.Name == "tick-a" {
				close(settledA)
			}
		},
	})
	if err != nil {
		t.Fatalf("Wait: %v", err)
	}
	byName := resultsByName(sum)
	if got := byName["tick-a"]; got.State != "idle" || got.Exited {
		t.Errorf("tick-a = %+v, want the idle it was answered with before the stream died", got)
	}
	if got := byName["tick-b"].State; got != "done" {
		t.Errorf("tick-b state = %q, want done — the straggler was not picked up after resubscribing", got)
	}
	if len(settled) != 2 {
		t.Errorf("OnSettle fired %d times (%+v), want one per worker across the stream break", len(settled), settled)
	}
	if got := srv.Lists(); got != 2 {
		t.Errorf("agent.list calls = %d, want 2 (opening + one gap-closing reconcile)", got)
	}
	if got := srv.Subscribes(); got != 2 {
		t.Errorf("events.subscribe calls = %d, want 2 (original + one resubscribe)", got)
	}
	// The resubscribe watches only what is still pending: re-subscribing to a
	// settled worker's pane would re-deliver its status and cost a replay.
	subs := srv.LastSubs()
	if len(subs) != len(terminalStatuses) {
		t.Fatalf("resubscribe carried %d subscriptions, want %d — only tick-b was still pending: %+v",
			len(subs), len(terminalStatuses), subs)
	}
	for _, sub := range subs {
		if sub.PaneID != "w1:p2" {
			t.Errorf("resubscribe watches pane %q, want only the pending worker's w1:p2", sub.PaneID)
		}
	}
}

// TestWaitIgnoresStrayEvents pins consume's ignore paths. A stream carries more
// than the events this waiter asked for — session-wide kinds, kinds newer than
// this code, status events for panes nobody is waiting on, and lines that are
// not event envelopes at all — and none of them may settle a worker, break the
// stream or cost a resubscribe.
func TestWaitIgnoresStrayEvents(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	go func() {
		srv.waitForStreams(1)
		// A session-wide kind the client passes through untyped.
		srv.PushLine(herdtest.EventLine("pane_updated", map[string]any{
			"pane_id": "w1:p1", "workspace_id": "w1",
		}))
		// A kind this code has never heard of.
		srv.PushLine(herdtest.EventLine("something_new", map[string]any{"pane_id": "w1:p1"}))
		// A well-formed status event for a pane this wave does not include.
		srv.PushLine(herdtest.StatusEventLine("w9:p9", string(client.StatusIdle)))
		// A line that is not an event envelope at all.
		srv.PushLine(herdtest.IgnoredNonEventLine)
		// Only now the real settle.
		srv.pushStatus("tick-a", client.StatusDone)
	}()

	var settled []Result
	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers:  []string{"tick-a"},
		Timeout:  10 * time.Second,
		OnSettle: func(r Result) { settled = append(settled, r) },
	})
	if err != nil {
		t.Fatalf("Wait: %v (stray traffic must not fail the wait)", err)
	}
	if len(settled) != 1 || settled[0].Name != "tick-a" || settled[0].State != "done" {
		t.Fatalf("settles = %+v, want exactly one: tick-a done", settled)
	}
	if !sum.OK() || sum.Settled != 1 {
		t.Errorf("summary = %+v, want one settled worker and OK", sum)
	}
	if got := srv.Subscribes(); got != 1 {
		t.Errorf("events.subscribe calls = %d, want 1 — a stray line read as a break costs a resubscribe", got)
	}
	if got := srv.Lists(); got != 1 {
		t.Errorf("agent.list calls = %d, want 1 — a stray line must not trigger a reconcile", got)
	}
}

// TestWaitStreamDeathResubscribes pins that a broken stream is replaced once
// and the wait then completes on a pushed event.
func TestWaitStreamDeathResubscribes(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	srv.SetKillSubscribe(func(n int) bool { return n == 1 })
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
	srv.SetKillSubscribe(func(n int) bool { return true })

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
	srv.SetRejectSubscribe(func(n int) (int, bool) { return 4, true })

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

// TestWaitDeadlineDuringRecoveryIsATimeout pins the boundary the CI flake
// exposed: the stream dies just before the deadline and the recovery re-list
// is cut off by it. That recovery failure is a symptom of the deadline — Wait
// must return the timeout summary, never the recovery error.
func TestWaitDeadlineDuringRecoveryIsATimeout(t *testing.T) {
	srv := newFakeHerd(t, &fakeAgent{name: "tick-a", paneID: "w1:p1", status: client.StatusWorking})
	// The recovery re-list (list call 2) stalls past the wait's deadline.
	srv.RouteN("agent.list", func(tt *testing.T, req herdtest.Request, w *herdtest.ConnWriter, n int) error {
		if n < 2 {
			return srv.Builtin("agent.list")(tt, req, w)
		}
		time.Sleep(600 * time.Millisecond)
		return herdtest.RespondJSON(w, req.ID, map[string]any{"type": "agent_list", "agents": []map[string]any{}})
	})
	go func() {
		srv.waitForStreams(1)
		time.Sleep(250 * time.Millisecond) // die close to the 500ms deadline
		srv.KillStreams()
	}()

	sum, err := Wait(testContext(t), srv.Client(t), Options{
		Workers: []string{"tick-a"},
		Timeout: 500 * time.Millisecond,
	})
	if err != nil {
		t.Fatalf("Wait returned an error at the deadline boundary: %v (a timeout is an outcome, not an error)", err)
	}
	if !sum.TimeoutFired {
		t.Fatalf("summary = %+v, want TimeoutFired", sum)
	}
	if got := resultsByName(sum)["tick-a"].State; got != "working" {
		t.Errorf("timed-out worker state = %q, want last known status", got)
	}
}
