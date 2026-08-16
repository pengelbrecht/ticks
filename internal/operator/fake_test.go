package operator

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"
)

var _ Channel = (*FakeChannel)(nil)

func recvEvent(t *testing.T, ch <-chan Event) Event {
	t.Helper()
	select {
	case ev, ok := <-ch:
		if !ok {
			t.Fatal("event channel closed before an event arrived")
		}
		return ev
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for event")
		return Event{}
	}
}

func TestFakeChannelSendRecordsText(t *testing.T) {
	f := NewFakeChannel()
	if err := f.Send("run finished"); err != nil {
		t.Fatalf("Send() error: %v", err)
	}
	if err := f.Send("second"); err != nil {
		t.Fatalf("Send() error: %v", err)
	}
	if got, want := f.Sent(), []string{"run finished", "second"}; !reflect.DeepEqual(got, want) {
		t.Errorf("Sent() = %#v, want %#v", got, want)
	}
}

func TestFakeChannelAskDeliverAndScriptedEvent(t *testing.T) {
	f := NewFakeChannel()
	q := Question{
		ID:     "q1",
		Header: "Deploy",
		Text:   "Ship to production?",
		Options: []Option{
			{ID: "yes", Label: "Yes", Description: "Deploy now"},
			{ID: "no", Label: "No", Description: "Hold"},
		},
		AllowOther: true,
	}

	ref, err := f.AskDeliver(q)
	if err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}
	if ref.MessageID == "" {
		t.Error("AskDeliver() returned a MessageRef with an empty MessageID")
	}

	asked := f.Asked()
	if len(asked) != 1 || !reflect.DeepEqual(asked[0], q) {
		t.Fatalf("Asked() = %#v, want the delivered question", asked)
	}
	if got, ok := f.Question(ref); !ok || got.ID != "q1" {
		t.Errorf("Question(%v) = %#v, %v; want the delivered question", ref, got, ok)
	}

	f.Script(Event{Kind: EventOptionPress, Ref: ref, OptionIDs: []string{"yes"}})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ev := recvEvent(t, f.Events(ctx))
	if ev.Kind != EventOptionPress || ev.Ref != ref {
		t.Fatalf("unexpected event: %#v", ev)
	}
	if !reflect.DeepEqual(ev.OptionIDs, []string{"yes"}) {
		t.Errorf("event OptionIDs = %#v, want [yes]", ev.OptionIDs)
	}
}

func TestFakeChannelEventsScriptedAfterSubscribe(t *testing.T) {
	f := NewFakeChannel()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	events := f.Events(ctx)

	f.Script(
		Event{Kind: EventAnswer, Text: "use the staging cluster"},
		Event{Kind: EventMultiSelectCommit, OptionIDs: []string{"a", "c"}},
	)

	first := recvEvent(t, events)
	if first.Kind != EventAnswer || first.Text != "use the staging cluster" {
		t.Errorf("first event = %#v", first)
	}
	second := recvEvent(t, events)
	if second.Kind != EventMultiSelectCommit || !reflect.DeepEqual(second.OptionIDs, []string{"a", "c"}) {
		t.Errorf("second event = %#v", second)
	}
}

func TestFakeChannelEventsClosesOnContextCancel(t *testing.T) {
	f := NewFakeChannel()
	ctx, cancel := context.WithCancel(context.Background())
	events := f.Events(ctx)
	cancel()

	select {
	case _, ok := <-events:
		if ok {
			t.Error("expected the event channel to close after context cancel")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("event channel was not closed after context cancel")
	}
}

func TestFakeChannelResolveRecordsOutcome(t *testing.T) {
	f := NewFakeChannel()
	ref, err := f.AskDeliver(Question{ID: "q1", Text: "Ship it?", Options: []Option{{ID: "yes", Label: "Yes"}}})
	if err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}

	outcome := Outcome{Status: OutcomeAnswered, Text: "Answered: Yes", OptionIDs: []string{"yes"}}
	if err := f.Resolve(ref, outcome); err != nil {
		t.Fatalf("Resolve() error: %v", err)
	}

	got, ok := f.Outcome(ref)
	if !ok {
		t.Fatalf("Outcome(%v) not recorded", ref)
	}
	if !reflect.DeepEqual(got, outcome) {
		t.Errorf("Outcome() = %#v, want %#v", got, outcome)
	}

	res := f.Resolutions()
	if len(res) != 1 || res[0].Ref != ref || res[0].Outcome.Status != OutcomeAnswered {
		t.Errorf("Resolutions() = %#v", res)
	}
}

func TestFakeChannelResolveUnknownRef(t *testing.T) {
	f := NewFakeChannel()
	err := f.Resolve(MessageRef{ChannelID: "fake", MessageID: "nope"}, Outcome{Status: OutcomeAnswered})
	if err == nil {
		t.Error("expected an error resolving an unknown message ref")
	}
}

func TestFakeChannelInjectedErrors(t *testing.T) {
	sendErr := errors.New("send boom")
	askErr := errors.New("ask boom")
	resolveErr := errors.New("resolve boom")

	f := NewFakeChannel()
	f.SendErr = sendErr
	f.AskErr = askErr
	f.ResolveErr = resolveErr

	if err := f.Send("x"); !errors.Is(err, sendErr) {
		t.Errorf("Send() error = %v, want %v", err, sendErr)
	}
	if _, err := f.AskDeliver(Question{Text: "x"}); !errors.Is(err, askErr) {
		t.Errorf("AskDeliver() error = %v, want %v", err, askErr)
	}
	if err := f.Resolve(MessageRef{}, Outcome{}); !errors.Is(err, resolveErr) {
		t.Errorf("Resolve() error = %v, want %v", err, resolveErr)
	}
	if len(f.Sent()) != 0 || len(f.Asked()) != 0 || len(f.Resolutions()) != 0 {
		t.Error("failed calls should not be recorded")
	}
}
