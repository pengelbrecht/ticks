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
	// FormattedErr and AttachmentErr do the same for the optional capabilities
	// [FormattedSender] and [AttachmentSender].
	FormattedErr  error
	AttachmentErr error

	mu           sync.Mutex
	sent         []string
	formatted    []FormattedText
	attachments  []Attachment
	attachedRefs map[MessageRef]Attachment
	asked        []Question
	questions    map[MessageRef]Question
	resolutions  []Resolution
	outcomes     map[MessageRef]Outcome
	nextID       int

	events chan Event
	// subscribed closes on the first Events call. A test that needs to know a
	// Consumer is running cannot learn it by probing the consumer lock —
	// acquiring the lock to look at it COMPETES with the Consumer, which
	// returns ErrConsumerBusy and exits if the probe wins the race. Events is
	// subscribed immediately after the lock is taken, so waiting here observes
	// the same fact without contending for it.
	subscribed    chan struct{}
	subscribeOnce sync.Once
}

// The fake opts into both optional capabilities, so a test can drive the rich
// paths and a capability probe ([SupportsAttachments]) sees what a fully
// featured transport looks like.
var (
	_ FormattedSender  = (*FakeChannel)(nil)
	_ AttachmentSender = (*FakeChannel)(nil)
)

// NewFakeChannel returns an empty fake channel.
func NewFakeChannel() *FakeChannel {
	return &FakeChannel{
		attachedRefs: make(map[MessageRef]Attachment),
		questions:    make(map[MessageRef]Question),
		outcomes:     make(map[MessageRef]Outcome),
		events:       make(chan Event, fakeEventBuffer),
		subscribed:   make(chan struct{}),
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

// SendFormatted records the formatted message. It respects ctx cancellation.
//
// The fake stores the markup verbatim — rendering it is a transport's job — so
// a test asserts what the caller authored, not what Telegram would show.
func (f *FakeChannel) SendFormatted(ctx context.Context, msg FormattedText) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if f.FormattedErr != nil {
		return f.FormattedErr
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.formatted = append(f.formatted, msg)
	return nil
}

// SendAttachment records the attachment and hands back a synthetic message ref
// from the same sequence AskDeliver uses. It respects ctx cancellation.
//
// Nothing reads the file: the fake stands in for the transport, and a test that
// cares about a real upload belongs in the transport's own package.
//
// A gated attachment gets no question registered against its ref here, matching
// a transport that knows only that it hung approve/reject buttons on a message.
// The question reaches the fake the way it reaches a real one — through
// [Adopter] on the consumer's next sweep — which is also what makes
// [FakeChannel.Resolve] work on the ref afterwards.
func (f *FakeChannel) SendAttachment(ctx context.Context, a Attachment) (MessageRef, error) {
	if err := ctx.Err(); err != nil {
		return MessageRef{}, err
	}
	if f.AttachmentErr != nil {
		return MessageRef{}, f.AttachmentErr
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextID++
	ref := MessageRef{ChannelID: "fake", MessageID: fmt.Sprintf("%d", f.nextID)}
	f.attachments = append(f.attachments, a)
	f.attachedRefs[ref] = a
	return ref, nil
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

// Adopt records a question delivered by an earlier run under ref, so the fake
// answers [FakeChannel.Question] for it as if it had delivered it itself. It
// implements [Adopter] and is idempotent.
func (f *FakeChannel) Adopt(ref MessageRef, q Question) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.questions[ref]; ok {
		return nil
	}
	f.questions[ref] = q
	return nil
}

// Events delivers scripted events until ctx is cancelled, then closes the
// returned channel. Events scripted before the call are delivered too.
//
// One subscriber at a time: the scripted queue is shared, so concurrent
// subscribers compete for events rather than each receiving all of them.
// Cancellation may drop an in-flight event — one already taken off the queue
// but not yet handed to the consumer is lost, not requeued.
func (f *FakeChannel) Events(ctx context.Context) <-chan Event {
	f.subscribeOnce.Do(func() { close(f.subscribed) })
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

// Subscribed closes once Events has been called, which a Consumer does directly
// after it takes the consumer lock. Wait on it instead of probing that lock.
func (f *FakeChannel) Subscribed() <-chan struct{} { return f.subscribed }

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

// Formatted returns the messages passed to SendFormatted, in order.
func (f *FakeChannel) Formatted() []FormattedText {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]FormattedText(nil), f.formatted...)
}

// Attachments returns the attachments passed to SendAttachment, in order and
// exactly as the caller wrote them — [KindAuto] is not resolved on the way in,
// so a test can assert what was asked for and check the resolution separately
// with [Attachment.ResolvedKind].
func (f *FakeChannel) Attachments() []Attachment {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]Attachment(nil), f.attachments...)
}

// Attachment returns the attachment delivered under ref.
func (f *FakeChannel) Attachment(ref MessageRef) (Attachment, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.attachedRefs[ref]
	return a, ok
}

// Gated reports whether ref is an attachment this fake delivered with
// approve/reject controls under it.
func (f *FakeChannel) Gated(ref MessageRef) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.attachedRefs[ref]
	return ok && a.Gate
}

// ScriptGatePress queues an operator press on a gated attachment's controls,
// stamped with senderID as the provenance a resolution is recorded under.
//
// It panics for a ref that is not a gated attachment: those controls do not
// exist, so a test scripting a press on them is asserting something the
// transport could never produce.
func (f *FakeChannel) ScriptGatePress(ref MessageRef, senderID string, optionIDs ...string) {
	if !f.Gated(ref) {
		panic(fmt.Sprintf("operator: FakeChannel ref %+v is not a gated attachment — nothing to press", ref))
	}
	f.Script(Event{Kind: EventOptionPress, Ref: ref, SenderID: senderID, OptionIDs: optionIDs})
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
