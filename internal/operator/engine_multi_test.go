package operator

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// One tick can carry more than one open question — a run that asks two things
// before waiting, or an escalation asked alongside an earlier ask. Applying an
// answer therefore cannot assume it is the last one: clearing the tick's
// awaiting would strand every sibling behind a tick the engine then reads as
// out of band.

// TestApplyKeepsAwaitingWhileSiblingQuestionsAreOpen answers one of two
// questions and pins that the other is still open, still answerable, and still
// parked; then answers it and pins that the awaiting finally clears.
func TestApplyKeepsAwaitingWhileSiblingQuestionsAreOpen(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", "")
	engine := NewEngine(root)

	first, err := engine.Register(Registration{TickID: "abc", Question: Question{Text: "Which region?"}})
	if err != nil {
		t.Fatalf("Register first: %v", err)
	}
	second, err := engine.Register(Registration{TickID: "abc", Question: Question{Text: "Which size?"}})
	if err != nil {
		t.Fatalf("Register second: %v", err)
	}

	resolved, err := engine.Pending().Resolve(first.ID, PendingResolution{
		Outcome:    Outcome{Status: OutcomeAnswered, Text: "eu-west-1"},
		AnsweredBy: AnsweredByTerminal,
	})
	if err != nil {
		t.Fatalf("Resolve first: %v", err)
	}
	applied, err := engine.Apply(resolved)
	if err != nil {
		t.Fatalf("Apply first: %v", err)
	}
	if applied.OutOfBand {
		t.Fatal("the first answer was reported out of band")
	}

	tk := mustLoad(t, ticks, "abc")
	if tk.Awaiting == nil || *tk.Awaiting != tick.AwaitingInput {
		t.Errorf("tick awaiting = %v, want it still parked for the open sibling", tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "eu-west-1") {
		t.Errorf("notes do not carry the first answer:\n%s", tk.Notes)
	}

	// The sibling must still be answerable: out-of-band is exactly the state
	// that would cancel it instead.
	sibling, err := engine.Pending().Load(second.ID)
	if err != nil {
		t.Fatalf("Load sibling: %v", err)
	}
	if sibling.Resolved() {
		t.Fatalf("the sibling was resolved by the first answer: %+v", sibling.Resolution)
	}
	out, err := engine.OutOfBand(sibling)
	if err != nil {
		t.Fatalf("OutOfBand: %v", err)
	}
	if out {
		t.Fatal("the sibling question was cancelled as out of band")
	}

	resolved, err = engine.Pending().Resolve(second.ID, PendingResolution{
		Outcome:    Outcome{Status: OutcomeAnswered, Text: "large"},
		AnsweredBy: AnsweredByTerminal,
	})
	if err != nil {
		t.Fatalf("Resolve second: %v", err)
	}
	applied, err = engine.Apply(resolved)
	if err != nil {
		t.Fatalf("Apply second: %v", err)
	}
	if applied.OutOfBand {
		t.Fatal("the second answer was reported out of band")
	}

	tk = mustLoad(t, ticks, "abc")
	if tk.Awaiting != nil {
		t.Errorf("tick awaiting = %v, want it cleared once every question is answered", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "large") {
		t.Errorf("notes do not carry the second answer:\n%s", tk.Notes)
	}
}

// TestApplyNoteCarriesDecisionTime pins the note's timestamp to when the
// operator decided, not when a drain happened to run. `tk ask --async` plus a
// much later `tk ask --collect` is the normal shape, and a note stamped at
// collect time misdates the audit trail by however long the drain lagged.
func TestApplyNoteCarriesDecisionTime(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", "")
	engine := NewEngine(root)

	decidedAt := time.Date(2026, 3, 4, 9, 30, 0, 0, time.UTC)
	appliedAt := decidedAt.Add(37 * time.Hour)
	engine.Now = func() time.Time { return appliedAt }

	p, err := engine.Register(Registration{TickID: "abc", Question: Question{Text: "Which region?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	resolved, err := engine.Pending().Resolve(p.ID, PendingResolution{
		Outcome:    Outcome{Status: OutcomeAnswered, Text: "eu-west-1"},
		AnsweredBy: AnsweredByTerminal,
		AnsweredAt: decidedAt,
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if _, err := engine.Apply(resolved); err != nil {
		t.Fatalf("Apply: %v", err)
	}

	tk := mustLoad(t, ticks, "abc")
	want := decidedAt.Local().Format(noteTimestampLayout)
	if !strings.Contains(tk.Notes, want) {
		t.Errorf("notes do not carry the decision time %q:\n%s", want, tk.Notes)
	}
	if stale := appliedAt.Local().Format(noteTimestampLayout); strings.Contains(tk.Notes, stale) {
		t.Errorf("notes carry the apply time %q instead:\n%s", stale, tk.Notes)
	}
}

// TestConsumerStampsEventSenderID pins provenance honesty: the id written onto
// the resolution is the sender of the event, not the id the run was configured
// with. The transport already drops everyone else, so the two agree in
// practice — but the note says "this person decided", and it should be true
// because it was read off the decision.
func TestConsumerStampsEventSenderID(t *testing.T) {
	store := NewPendingStore(t.TempDir())
	channel := NewFakeChannel()
	consumer := NewConsumer(store, channel)
	consumer.TelegramUserID = "424242"

	ref, err := channel.AskDeliver(context.Background(), Question{ID: "q1", Text: "Which region?"})
	if err != nil {
		t.Fatalf("AskDeliver: %v", err)
	}
	if err := store.Save(Pending{ID: "q1", TickID: "abc", Kind: PendingAsk, Ref: ref}); err != nil {
		t.Fatalf("Save: %v", err)
	}

	resolved, matched, err := consumer.Route(context.Background(), Event{
		Kind:     EventAnswer,
		Ref:      ref,
		Text:     "eu-west-1",
		SenderID: "515151",
	})
	if err != nil || !matched {
		t.Fatalf("Route: matched=%v err=%v", matched, err)
	}
	if got := resolved.Resolution.TelegramUserID; got != "515151" {
		t.Errorf("telegram_user_id = %q, want the event's sender 515151", got)
	}
}

// TestConsumerFallsBackToBoundUserID keeps a sender-less event (a transport
// that does not report one) stamped with the configured operator rather than
// with nothing at all.
func TestConsumerFallsBackToBoundUserID(t *testing.T) {
	store := NewPendingStore(t.TempDir())
	channel := NewFakeChannel()
	consumer := NewConsumer(store, channel)
	consumer.TelegramUserID = "424242"

	ref, err := channel.AskDeliver(context.Background(), Question{ID: "q1", Text: "Which region?"})
	if err != nil {
		t.Fatalf("AskDeliver: %v", err)
	}
	if err := store.Save(Pending{ID: "q1", TickID: "abc", Kind: PendingAsk, Ref: ref}); err != nil {
		t.Fatalf("Save: %v", err)
	}

	resolved, matched, err := consumer.Route(context.Background(), Event{Kind: EventAnswer, Ref: ref, Text: "eu-west-1"})
	if err != nil || !matched {
		t.Fatalf("Route: matched=%v err=%v", matched, err)
	}
	if got := resolved.Resolution.TelegramUserID; got != "424242" {
		t.Errorf("telegram_user_id = %q, want the configured operator 424242", got)
	}
}

// TestConsumerPreservesRemoteAnswerProvenance pins the cloud bridge's return
// path: a terminal answer was arbitrated by RunRoom, so the local waiter must
// carry that provenance through instead of relabelling it as Telegram.
func TestConsumerPreservesRemoteAnswerProvenance(t *testing.T) {
	store := NewPendingStore(t.TempDir())
	channel := NewFakeChannel()
	consumer := NewConsumer(store, channel)
	consumer.TelegramUserID = "424242"

	ref, err := channel.AskDeliver(context.Background(), Question{
		ID:      "q1",
		Text:    "Ship it?",
		Options: GateOptions(),
	})
	if err != nil {
		t.Fatalf("AskDeliver: %v", err)
	}
	if err := store.Save(Pending{ID: "q1", TickID: "abc", Kind: PendingGate, Ref: ref, Question: Question{
		ID:      "q1",
		Text:    "Ship it?",
		Options: GateOptions(),
	}}); err != nil {
		t.Fatalf("Save: %v", err)
	}

	resolved, matched, err := consumer.Route(context.Background(), Event{
		Kind:       EventOptionPress,
		Ref:        ref,
		OptionIDs:  []string{OptionApprove},
		SenderID:   "515151",
		AnsweredBy: AnsweredByTerminal,
	})
	if err != nil || !matched {
		t.Fatalf("Route: matched=%v err=%v", matched, err)
	}
	if got := resolved.Resolution.AnsweredBy; got != AnsweredByTerminal {
		t.Errorf("answered_by = %q, want terminal", got)
	}
	if got := resolved.Resolution.TelegramUserID; got != "" {
		t.Errorf("telegram_user_id = %q, want it empty for terminal provenance", got)
	}
}
