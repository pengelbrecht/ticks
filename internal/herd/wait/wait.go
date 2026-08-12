// Package wait is the event-driven wave fan-in: block until every dispatched
// herdr worker has settled, without polling.
//
// # Why events and not a loop
//
// A wave of workers is watched by ONE herdr events.subscribe stream. herdr
// pushes a pane.agent_status_changed event when a worker settles, so the waiter
// sleeps in a select rather than re-listing on a timer. The only round trips
// are the opening agent.list, the subscribe, and one reconcile per stream
// failure.
//
// # The missed-wakeup race, and how it is closed
//
// Current state is resolved FIRST, with a single [Herd.AgentList]: a worker
// that has already settled (or vanished) is answered from that listing and
// never subscribed to. A worker that settles in the window BETWEEN that listing
// and the subscribe would, with a naive subscription, never be reported —
// nothing observed the transition and a subscription does not replay history.
//
// herd/client documents the property that closes the gap (live-verified against
// herdr 0.8.0): a pane.agent_status_changed subscription carrying a CONCRETE
// agent_status filter fires immediately when the pane is already in that
// status. A subscription carries exactly one status and settled means any of
// idle, done or blocked, so this package subscribes three times per pending
// worker — one per terminal status. Whatever the worker did during the window,
// one of its three subscriptions replays it at subscribe time.
//
// The alternative (subscribe with no filter, then re-list to close the gap)
// needs a second listing and still has to reconcile two sources of truth; the
// filtered form is airtight by the client's documented contract and costs
// nothing but subscription entries. See TestWaitRaceListThenSubscribe, which
// settles a worker in exactly that window.
//
// # Stream death
//
// An [client.EventStream] never reconnects, and [client.EventStream.Err]
// distinguishes "the caller stopped it" (nil) from "it broke" (non-nil). On a
// break this package reconciles against agent.list — closing the gap for events
// that occurred while nothing was subscribed — and resubscribes ONCE. Because
// the resubscribe replays current status, the reconcile-then-resubscribe order
// has no window of its own. A second failure is a hard error.
package wait

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
)

// DefaultTimeout bounds a wait whose caller supplied none. There is
// deliberately no indefinite mode: one wedged worker must not wedge the epic.
const DefaultTimeout = 30 * time.Minute

// StateExited is the reported state of a worker that is not in herdr's agent
// listing at all — it was never started, or its pane is gone. It is a terminal
// answer, not something to wait on.
const StateExited = "exited"

// terminalStatuses are the statuses a finished worker settles in. Each becomes
// one subscription per pending worker; see the package doc.
var terminalStatuses = []client.AgentStatus{client.StatusIdle, client.StatusDone, client.StatusBlocked}

// IsTerminal reports whether a status means the worker has settled.
func IsTerminal(s client.AgentStatus) bool {
	for _, t := range terminalStatuses {
		if s == t {
			return true
		}
	}
	return false
}

// Herd is the slice of the herdr client this package needs. [client.Client]
// satisfies it; tests inject the same client over a fake server.
type Herd interface {
	AgentList(ctx context.Context) ([]client.AgentInfo, error)
	EventsSubscribe(ctx context.Context, subs []client.Subscription) (*client.EventStream, error)
}

// Result is one worker's outcome.
type Result struct {
	// Name is the worker as the caller named it (a herdr agent name or pane id).
	Name string `json:"name"`
	// State is the settled agent status ("idle", "done", "blocked"),
	// [StateExited] for an absent worker, or the last known non-terminal
	// status for a worker the timeout caught.
	State string `json:"state"`
	// PaneID is the pane the worker occupies, empty when it was never found.
	PaneID string `json:"pane_id"`
	// Exited reports that herdr does not know this worker.
	Exited bool `json:"exited"`
	// WaitedMs is how long the wait ran before this worker was answered.
	WaitedMs int64 `json:"waited_ms"`
}

// Settled reports whether this worker reached a terminal status.
func (r Result) Settled() bool { return r.Exited || IsTerminal(client.AgentStatus(r.State)) }

// Summary is the whole wave's outcome. A timeout is an outcome, not an error:
// it comes back here with TimedOut naming the workers that never settled.
type Summary struct {
	// Workers are the results in the order the caller asked for them.
	Workers []Result `json:"workers"`
	// Settled counts workers that reached idle or done.
	Settled int `json:"settled"`
	// Blocked counts workers that settled in blocked.
	Blocked int `json:"blocked"`
	// Exited counts workers herdr did not know.
	Exited int `json:"exited"`
	// TimedOut names the workers that never settled before the deadline.
	TimedOut []string `json:"timed_out"`
	// ElapsedMs is the wall time of the whole wait.
	ElapsedMs int64 `json:"elapsed_ms"`
	// TimeoutFired reports that the deadline ended the wait.
	TimeoutFired bool `json:"timeout_fired"`
}

// OK reports whether the wave finished cleanly: nothing blocked, no timeout.
// An exited worker is reported, not failed — deciding what an absent worker
// means belongs to the caller.
func (s *Summary) OK() bool { return s.Blocked == 0 && !s.TimeoutFired }

// Options configures [Wait].
type Options struct {
	// Workers are the herdr agent names (or pane ids) to wait for. Required.
	Workers []string
	// Timeout bounds the whole wait. Zero means [DefaultTimeout].
	Timeout time.Duration
	// OnSettle, when set, is called as each worker is answered — the hook the
	// CLI streams its per-worker lines from. It runs on the waiter's
	// goroutine, so keep it cheap.
	OnSettle func(Result)
}

// Wait blocks until every named worker has settled, the deadline fires, or ctx
// is cancelled.
//
// A cancelled parent context is an error; an elapsed timeout is not — it comes
// back as a [Summary] with TimeoutFired set, because the partial answer (which
// workers did settle, and where the rest were left) is what the caller acts on.
func Wait(ctx context.Context, herd Herd, opts Options) (*Summary, error) {
	if len(opts.Workers) == 0 {
		return nil, errors.New("herd/wait: no workers to wait for")
	}
	if herd == nil {
		return nil, errors.New("herd/wait: no herd client")
	}
	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = DefaultTimeout
	}

	parent := ctx
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	w := &waiter{
		herd:      herd,
		start:     time.Now(),
		onSettle:  opts.OnSettle,
		order:     append([]string(nil), opts.Workers...),
		results:   make(map[string]Result, len(opts.Workers)),
		unsettled: make(map[string]bool, len(opts.Workers)),
		panes:     make(map[string]string, len(opts.Workers)),
		last:      make(map[string]client.AgentStatus, len(opts.Workers)),
	}
	for _, name := range w.order {
		w.unsettled[name] = true
	}

	// Step 1: resolve current state in one round trip. Everything already
	// settled or absent is answered here and never subscribed to.
	if err := w.reconcile(ctx); err != nil {
		return nil, err
	}

	// Step 2: one stream for the rest, resubscribed at most once.
	deaths := 0
	for len(w.unsettled) > 0 && ctx.Err() == nil {
		stream, err := w.subscribe(ctx)
		if err != nil {
			if ctx.Err() != nil {
				break
			}
			return nil, err
		}
		streamErr := w.consume(ctx, stream)
		_ = stream.Close()
		if streamErr == nil {
			break
		}
		deaths++
		if deaths > 1 {
			if ctx.Err() != nil {
				break
			}
			return nil, fmt.Errorf("herd/wait: event stream failed again after resubscribing: %w", streamErr)
		}
		if ctx.Err() != nil {
			break
		}
		// Close the gap the dead stream left before opening a new one. The
		// replaying subscriptions make this order safe; see the package doc.
		if err := w.reconcile(ctx); err != nil {
			if ctx.Err() != nil {
				// The deadline expired while recovery was in flight: the
				// recovery failure (a dial or call cut off mid-attempt) is a
				// symptom of the deadline, not a distinct fault. A timeout is
				// an outcome, not an error.
				break
			}
			return nil, fmt.Errorf("herd/wait: reconciling after stream failure: %w", err)
		}
	}

	if err := parent.Err(); err != nil {
		return nil, err
	}
	return w.summary(), nil
}

// waiter holds the state of one Wait call.
type waiter struct {
	herd     Herd
	start    time.Time
	onSettle func(Result)

	order     []string                      // requested names, output order
	results   map[string]Result             // answered workers
	unsettled map[string]bool               // names still being waited on
	panes     map[string]string             // name -> pane id
	last      map[string]client.AgentStatus // name -> last observed status
}

// reconcile resolves every unsettled worker against a fresh agent listing:
// settling the ones that are terminal, reporting the absent ones as exited and
// recording pane ids for the rest. It is both the opening round trip and the
// gap-closer after a stream failure.
func (w *waiter) reconcile(ctx context.Context) error {
	agents, err := w.herd.AgentList(ctx)
	if err != nil {
		return fmt.Errorf("herd/wait: listing agents: %w", err)
	}
	byName := make(map[string]*client.AgentInfo, len(agents))
	for i := range agents {
		a := &agents[i]
		byName[a.PaneID] = a
		if a.Name != nil && *a.Name != "" {
			byName[*a.Name] = a
		}
	}

	for _, name := range w.order {
		if !w.unsettled[name] {
			continue
		}
		info, ok := byName[name]
		if !ok {
			w.settle(Result{Name: name, State: StateExited, PaneID: w.panes[name], Exited: true})
			continue
		}
		w.panes[name] = info.PaneID
		w.last[name] = info.AgentStatus
		if IsTerminal(info.AgentStatus) {
			w.settle(Result{Name: name, State: string(info.AgentStatus), PaneID: info.PaneID})
		}
	}
	return nil
}

// subscribe opens one stream carrying three subscriptions per pending worker,
// one per terminal status. The concrete agent_status filter is what makes a
// worker that settled just before the subscribe report immediately.
func (w *waiter) subscribe(ctx context.Context) (*client.EventStream, error) {
	subs := make([]client.Subscription, 0, len(w.unsettled)*len(terminalStatuses))
	for _, name := range w.order {
		if !w.unsettled[name] {
			continue
		}
		pane := w.panes[name]
		for _, status := range terminalStatuses {
			subs = append(subs, client.SubscribeAgentStatus(pane, status))
		}
	}
	stream, err := w.herd.EventsSubscribe(ctx, subs)
	if err != nil {
		// herdr reports only the FIRST bad subscription, by index; name the
		// worker it belongs to rather than making the caller count entries.
		var subErr *client.SubscribeError
		if errors.As(err, &subErr) && subErr.Index >= 0 && subErr.Index < len(subs) {
			pane := subs[subErr.Index].PaneID
			return nil, fmt.Errorf("herd/wait: worker %q (pane %s) cannot be watched: %w",
				w.workerForPane(pane), pane, err)
		}
		return nil, fmt.Errorf("herd/wait: subscribing to agent status events: %w", err)
	}
	return stream, nil
}

// workerForPane maps a pane id back to the worker name that asked for it.
func (w *waiter) workerForPane(pane string) string {
	for name, p := range w.panes {
		if p == pane {
			return name
		}
	}
	return pane
}

// consume settles workers from pushed events until they are all answered or ctx
// ends (both nil), or the stream breaks (the stream's error).
func (w *waiter) consume(ctx context.Context, stream *client.EventStream) error {
	for len(w.unsettled) > 0 {
		select {
		case <-ctx.Done():
			return nil
		case ev, open := <-stream.Events():
			if !open {
				if err := stream.Err(); err != nil {
					return err
				}
				if ctx.Err() != nil {
					return nil
				}
				// A clean close nobody asked for is still a gap: treat it
				// like a break so the caller reconciles and resubscribes.
				return errors.New("herd/wait: event stream closed while workers were still pending")
			}
			if !ev.IsAgentStatusChanged() {
				continue
			}
			changed, err := ev.AgentStatusChanged()
			if err != nil {
				return err
			}
			name, ok := w.pendingWorker(changed.PaneID)
			if !ok {
				continue
			}
			w.last[name] = changed.AgentStatus
			if IsTerminal(changed.AgentStatus) {
				w.settle(Result{Name: name, State: string(changed.AgentStatus), PaneID: changed.PaneID})
			}
		}
	}
	return nil
}

// pendingWorker finds the unsettled worker occupying a pane.
func (w *waiter) pendingWorker(pane string) (string, bool) {
	for name := range w.unsettled {
		if w.panes[name] == pane {
			return name, true
		}
	}
	return "", false
}

// settle records a worker's answer, stamps how long it waited and notifies the
// caller. Repeat settles for one worker are ignored.
func (w *waiter) settle(r Result) {
	if !w.unsettled[r.Name] {
		return
	}
	delete(w.unsettled, r.Name)
	r.WaitedMs = time.Since(w.start).Milliseconds()
	w.results[r.Name] = r
	if w.onSettle != nil {
		w.onSettle(r)
	}
}

// summary assembles the final report, filling in the workers the deadline
// caught with their last known state.
func (w *waiter) summary() *Summary {
	s := &Summary{ElapsedMs: time.Since(w.start).Milliseconds()}
	for _, name := range w.order {
		r, ok := w.results[name]
		if !ok {
			state := string(w.last[name])
			if state == "" {
				state = string(client.StatusUnknown)
			}
			r = Result{
				Name:     name,
				State:    state,
				PaneID:   w.panes[name],
				WaitedMs: s.ElapsedMs,
			}
			s.TimedOut = append(s.TimedOut, name)
			s.TimeoutFired = true
		}
		switch {
		case r.Exited:
			s.Exited++
		case client.AgentStatus(r.State) == client.StatusBlocked:
			s.Blocked++
		case IsTerminal(client.AgentStatus(r.State)):
			s.Settled++
		}
		s.Workers = append(s.Workers, r)
	}
	return s
}
