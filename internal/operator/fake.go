package operator

import (
	"context"
	"fmt"
	"sync"
)

// fakeEventBuffer is how many scripted events a FakeChannel holds before
// [FakeChannel.Script] blocks. Generous enough that tests can script a whole
// exchange before subscribing with Events.
const fakeEventBuffer = 64

// Resolution is one recorded [FakeChannel.Resolve] call.
type Resolution struct {
	Ref     MessageRef
	Outcome Outcome
}

// FakeChannel is an in-memory [Channel] for tests: it records what a run sent,
// asked and resolved, and delivers events the test scripts. It is safe for
// concurrent use.
//
// The zero value is not usable — construct it with [NewFakeChannel].
type FakeChannel struct {
	// SendErr, AskErr and ResolveErr, when set, are returned by the
	// corresponding method instead of performing it. Failed calls are not
	// recorded.
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

// Send records the message.
func (f *FakeChannel) Send(text string) error {
	if f.SendErr != nil {
		return f.SendErr
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.sent = append(f.sent, text)
	return nil
}

// AskDeliver records the question and hands back a synthetic message ref.
func (f *FakeChannel) AskDeliver(q Question) (MessageRef, error) {
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
// subscribing.
func (f *FakeChannel) Script(events ...Event) {
	for _, ev := range events {
		f.events <- ev
	}
}

// Resolve records the outcome for a previously delivered question.
func (f *FakeChannel) Resolve(ref MessageRef, outcome Outcome) error {
	if f.ResolveErr != nil {
		return f.ResolveErr
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.questions[ref]; !ok {
		return fmt.Errorf("operator: no delivered question for message ref %+v", ref)
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

// Outcome returns the most recent outcome recorded for ref.
func (f *FakeChannel) Outcome(ref MessageRef) (Outcome, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	o, ok := f.outcomes[ref]
	return o, ok
}
