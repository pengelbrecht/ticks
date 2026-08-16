package operator

import (
	"context"
	"fmt"
	"sync"
)

// fakeEventBuffer is how many scripted events a FakeChannel holds. Generous
// enough that tests can script a whole exchange before subscribing with Events;
// overflowing it panics rather than deadlocking the test (see FakeChannel.Script).
const fakeEventBuffer = 64

// Resolution is one recorded [FakeChannel.Resolve] call.
type Resolution struct {
	Ref     MessageRef
	Outcome Outcome
}

// FakeChannel is an in-memory [Channel] for tests: it records what a run sent,
// asked and resolved, and delivers events the test scripts. Its methods are safe
// for concurrent use.
//
// The zero value is not usable — construct it with [NewFakeChannel].
type FakeChannel struct {
	// SendErr, AskErr and ResolveErr, when set, are returned by the
	// corresponding method instead of performing it. Failed calls are not
	// recorded.
	//
	// These fields are read without holding the mutex: set them before the
	// fake is handed to concurrent callers, and do not mutate them while a
	// call may be in flight.
	SendErr    error
	AskErr     error
	ResolveErr error

	mu          sync.Mutex
	sent        []string
	asked       []Question
	questions   map[MessageRef]Question
	resolutions []Resolution
	outcomes    map[MessageRef]Outcome
	nextID      int

	events chan Event
}

// NewFakeChannel returns an empty fake channel.
func NewFakeChannel() *FakeChannel {
	return &FakeChannel{
		questions: make(map[MessageRef]Question),
		outcomes:  make(map[MessageRef]Outcome),
		events:    make(chan Event, fakeEventBuffer),
	}
}

// Send records the message. It respects ctx cancellation.
func (f *FakeChannel) Send(ctx context.Context, text string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if f.SendErr != nil {
		return f.SendErr
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.sent = append(f.sent, text)
	return nil
}

// AskDeliver records the question and hands back a synthetic message ref. It
// respects ctx cancellation.
func (f *FakeChannel) AskDeliver(ctx context.Context, q Question) (MessageRef, error) {
	if err := ctx.Err(); err != nil {
		return MessageRef{}, err
	}
	if f.AskErr != nil {
		return MessageRef{}, f.AskErr
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextID++
	ref := MessageRef{ChannelID: "fake", MessageID: fmt.Sprintf("%d", f.nextID)}
	f.asked = append(f.asked, q)
	f.questions[ref] = q
	return ref, nil
}

// Events delivers scripted events until ctx is cancelled, then closes the
// returned channel. Events scripted before the call are delivered too.
//
// One subscriber at a time: the scripted queue is shared, so concurrent
// subscribers compete for events rather than each receiving all of them.
// Cancellation may drop an in-flight event — one already taken off the queue
// but not yet handed to the consumer is lost, not requeued.
func (f *FakeChannel) Events(ctx context.Context) <-chan Event {
	out := make(chan Event)
	go func() {
		defer close(out)
		for {
			select {
			case <-ctx.Done():
				return
			case ev := <-f.events:
				select {
				case out <- ev:
				case <-ctx.Done():
					return
				}
			}
		}
	}()
	return out
}

// Script queues events for delivery on Events. It may be called before or after
// subscribing, and never blocks: queueing more than fakeEventBuffer undelivered
// events panics, since a test that scripts that much has lost its consumer.
func (f *FakeChannel) Script(events ...Event) {
	for _, ev := range events {
		select {
		case f.events <- ev:
		default:
			panic(fmt.Sprintf("operator: FakeChannel event buffer full (%d undelivered events) while scripting %+v — is anything consuming Events?", fakeEventBuffer, ev))
		}
	}
}

// Resolve records the outcome for a previously delivered question. It respects
// ctx cancellation, and reports an error for an unknown ref or one that has
// already been resolved — a resolved question cannot be answered twice.
func (f *FakeChannel) Resolve(ctx context.Context, ref MessageRef, outcome Outcome) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if f.ResolveErr != nil {
		return f.ResolveErr
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.questions[ref]; !ok {
		return fmt.Errorf("operator: no delivered question for message ref %+v", ref)
	}
	if prev, ok := f.outcomes[ref]; ok {
		return fmt.Errorf("operator: message ref %+v already resolved as %q", ref, prev.Status)
	}
	f.resolutions = append(f.resolutions, Resolution{Ref: ref, Outcome: outcome})
	f.outcomes[ref] = outcome
	return nil
}

// Sent returns the messages passed to Send, in order.
func (f *FakeChannel) Sent() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.sent...)
}

// Asked returns the questions passed to AskDeliver, in order.
func (f *FakeChannel) Asked() []Question {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]Question(nil), f.asked...)
}

// Question returns the question delivered under ref.
func (f *FakeChannel) Question(ref MessageRef) (Question, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	q, ok := f.questions[ref]
	return q, ok
}

// Resolutions returns the recorded Resolve calls, in order.
func (f *FakeChannel) Resolutions() []Resolution {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]Resolution(nil), f.resolutions...)
}

// Outcome returns the outcome recorded for ref.
func (f *FakeChannel) Outcome(ref MessageRef) (Outcome, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	o, ok := f.outcomes[ref]
	return o, ok
}
