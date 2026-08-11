package dashboard

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/herd/client"
)

// SubscribedStatuses are the agent statuses the board subscribes to, per known
// worker pane.
//
// It is every status herdr reports, not the terminal subset internal/herd/wait
// watches: a dashboard wants the working→idle transition as much as the
// settle. [client.StatusUnknown] is deliberately absent — it is the client's
// zero value for "nothing reported", not a state herdr transitions a pane into.
var SubscribedStatuses = []client.AgentStatus{
	client.StatusWorking,
	client.StatusIdle,
	client.StatusDone,
	client.StatusBlocked,
}

// DefaultResubscribeBackoff is the pause before a resubscribe after the event
// stream dies. A dashboard is long-lived, so it retries forever rather than
// failing like internal/herd/wait does; the backoff keeps a herdr that is down
// from becoming a reconnect loop.
const DefaultResubscribeBackoff = 2 * time.Second

// StatusMsg is one pushed pane.agent_status_changed, delivered to the model.
type StatusMsg struct {
	PaneID string
	Status client.AgentStatus
	// At is when the watcher received it.
	At time.Time
}

// StreamMsg reports the health of the event stream. Up=false with a non-nil
// Err is a break the watcher is recovering from; Up=true is a live
// subscription. The model renders it; it never quits on it.
type StreamMsg struct {
	Up bool
	// Panes is how many worker panes the live subscription covers.
	Panes int
	Err   error
}

// ReloadMsg asks the model for a fresh snapshot. The watcher emits it after a
// stream break, so the gap in which nothing was subscribed is closed from disk
// and from a fresh listing before the new subscription replays current status.
type ReloadMsg struct{}

// Watcher owns the board's single events.subscribe stream.
//
// It runs one goroutine that subscribes to every known worker pane, forwards
// pushed status changes onto a channel the model drains, and re-establishes the
// subscription whenever the stream dies or the pane set changes. The pane set
// comes from [Watcher.Track], which the model calls after every snapshot — that
// is the one coupling between the safety re-list and the event mechanism.
type Watcher struct {
	herd    Herd
	backoff time.Duration

	msgs chan tea.Msg

	mu      sync.Mutex
	panes   []string
	wake    chan struct{}
	started bool
	stop    context.CancelFunc
	done    chan struct{}
}

// NewWatcher returns a watcher over herd. A nil herd yields a watcher that
// never emits — the board then runs on the safety re-list alone, which is the
// right degradation when herdr is unreachable.
func NewWatcher(herd Herd) *Watcher {
	return &Watcher{
		herd:    herd,
		backoff: DefaultResubscribeBackoff,
		msgs:    make(chan tea.Msg, 128),
		wake:    make(chan struct{}, 1),
		done:    make(chan struct{}),
	}
}

// Start launches the subscription goroutine. It is idempotent.
func (w *Watcher) Start(ctx context.Context) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.started || w.herd == nil {
		return
	}
	w.started = true
	ctx, cancel := context.WithCancel(ctx)
	w.stop = cancel
	go w.run(ctx)
}

// Stop tears the watcher down and waits for its goroutine to exit.
func (w *Watcher) Stop() {
	w.mu.Lock()
	stop, started := w.stop, w.started
	w.mu.Unlock()
	if !started || stop == nil {
		return
	}
	stop()
	<-w.done
}

// Track sets the worker panes to subscribe to. When the set differs from the
// live subscription's, the watcher resubscribes; an unchanged set is a no-op,
// so the safety ticker does not churn the stream.
func (w *Watcher) Track(panes []string) {
	next := normalizePanes(panes)
	w.mu.Lock()
	same := equalPanes(w.panes, next)
	if !same {
		w.panes = next
	}
	w.mu.Unlock()
	if !same {
		w.signal()
	}
}

// Next returns a tea.Cmd that blocks until the watcher has something to say.
// The model re-issues it after every message, which is the bubbletea idiom for
// draining a channel (see internal/tui's filesystem watcher).
func (w *Watcher) Next() tea.Cmd {
	return func() tea.Msg {
		msg, ok := <-w.msgs
		if !ok {
			return nil
		}
		return msg
	}
}

// signal nudges the run loop without blocking; the channel holds one pending
// wake, which is all a "the set changed, resubscribe" edge needs.
func (w *Watcher) signal() {
	select {
	case w.wake <- struct{}{}:
	default:
	}
}

// emit hands a message to the model, dropping it if the model has stopped
// draining and the buffer is full. A dashboard must never block herdr's stream.
func (w *Watcher) emit(msg tea.Msg) {
	select {
	case w.msgs <- msg:
	default:
	}
}

// run is the subscription lifecycle: subscribe, consume, recover, repeat.
func (w *Watcher) run(ctx context.Context) {
	defer close(w.done)
	for ctx.Err() == nil {
		panes := w.currentPanes()
		if len(panes) == 0 {
			// Nothing to watch yet. Sleep until Track says otherwise
			// rather than opening an empty subscription, which herdr
			// rejects.
			w.emit(StreamMsg{Up: false, Panes: 0})
			if !w.sleep(ctx, w.backoff) {
				return
			}
			continue
		}

		stream, err := w.subscribe(ctx, panes)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			w.emit(StreamMsg{Up: false, Panes: len(panes), Err: err})
			if !w.sleep(ctx, w.backoff) {
				return
			}
			continue
		}
		w.emit(StreamMsg{Up: true, Panes: len(panes)})

		consumeErr := w.consume(ctx, stream, panes)
		_ = stream.Close()
		if ctx.Err() != nil {
			return
		}
		if consumeErr == nil {
			// The pane set changed; resubscribe immediately, no backoff.
			continue
		}
		// A break leaves a window in which nothing was subscribed. Ask
		// for a reload so the model's next Track carries fresh panes,
		// then resubscribe — the concrete-status filter replays current
		// status, so this order has no gap of its own.
		w.emit(StreamMsg{Up: false, Panes: len(panes), Err: consumeErr})
		w.emit(ReloadMsg{})
		if !w.sleep(ctx, w.backoff) {
			return
		}
	}
}

// subscribe opens one stream carrying every pane × every status in
// [SubscribedStatuses].
func (w *Watcher) subscribe(ctx context.Context, panes []string) (*client.EventStream, error) {
	subs := make([]client.Subscription, 0, len(panes)*len(SubscribedStatuses))
	for _, pane := range panes {
		for _, status := range SubscribedStatuses {
			subs = append(subs, client.SubscribeAgentStatus(pane, status))
		}
	}
	return w.herd.EventsSubscribe(ctx, subs)
}

// consume forwards status events until the pane set changes (nil), the context
// ends (nil) or the stream breaks (the stream's error).
func (w *Watcher) consume(ctx context.Context, stream *client.EventStream, subscribed []string) error {
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-w.wake:
			if equalPanes(w.currentPanes(), subscribed) {
				continue
			}
			return nil
		case ev, open := <-stream.Events():
			if !open {
				if err := stream.Err(); err != nil {
					return err
				}
				if ctx.Err() != nil {
					return nil
				}
				return errors.New("herd/dashboard: event stream closed unexpectedly")
			}
			if !ev.IsAgentStatusChanged() {
				continue
			}
			changed, err := ev.AgentStatusChanged()
			if err != nil {
				return err
			}
			w.emit(StatusMsg{PaneID: changed.PaneID, Status: changed.AgentStatus, At: time.Now()})
		}
	}
}

// sleep waits for d, an early wake, or the context. It reports whether the
// caller should keep running.
func (w *Watcher) sleep(ctx context.Context, d time.Duration) bool {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-w.wake:
		return true
	case <-timer.C:
		return true
	}
}

func (w *Watcher) currentPanes() []string {
	w.mu.Lock()
	defer w.mu.Unlock()
	return append([]string(nil), w.panes...)
}

// normalizePanes trims, drops empties, dedupes and sorts, so two pane sets
// compare equal whenever they mean the same thing.
func normalizePanes(panes []string) []string {
	seen := make(map[string]bool, len(panes))
	out := make([]string, 0, len(panes))
	for _, p := range panes {
		p = strings.TrimSpace(p)
		if p == "" || seen[p] {
			continue
		}
		seen[p] = true
		out = append(out, p)
	}
	sort.Strings(out)
	return out
}

func equalPanes(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
