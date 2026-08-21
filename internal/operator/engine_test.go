package operator

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// newTickRepo returns a temp repo root with a .tick store holding one tick
// parked in the given awaiting state.
func newTickRepo(t *testing.T, id, awaiting string) (string, *tick.Store) {
	t.Helper()
	root := t.TempDir()
	store := tick.NewStore(filepath.Join(root, ".tick"))
	if err := store.Ensure(); err != nil {
		t.Fatalf("Ensure: %v", err)
	}
	now := time.Now().UTC()
	tk := tick.Tick{
		ID:        id,
		Title:     "Wire up payments",
		Status:    tick.StatusInProgress,
		Type:      tick.TypeTask,
		Owner:     "agent",
		CreatedBy: "agent",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if awaiting != "" {
		tk.SetAwaiting(awaiting)
	}
	if err := store.Write(tk); err != nil {
		t.Fatalf("Write tick: %v", err)
	}
	return root, store
}

func mustLoad(t *testing.T, store *tick.Store, id string) tick.Tick {
	t.Helper()
	tk, err := store.Read(id)
	if err != nil {
		t.Fatalf("Read tick: %v", err)
	}
	return tk
}

func TestEngineRegisterParksTick(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", "")
	engine := NewEngine(root)

	p, err := engine.Register(Registration{
		TickID:   "abc",
		Kind:     PendingAsk,
		Question: Question{Text: "Which provider?"},
	})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if p.ID == "" {
		t.Fatal("Register did not assign a question id")
	}
	if p.Awaiting != tick.AwaitingInput {
		t.Fatalf("awaiting = %q, want %q", p.Awaiting, tick.AwaitingInput)
	}
	if p.Question.ID != p.ID {
		t.Fatalf("question id %q does not match entry id %q", p.Question.ID, p.ID)
	}

	stored, err := engine.Pending().Load(p.ID)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if stored.TickID != "abc" {
		t.Fatalf("stored entry = %+v", stored)
	}

	tk := mustLoad(t, ticks, "abc")
	if tk.Awaiting == nil || *tk.Awaiting != tick.AwaitingInput {
		t.Fatalf("tick awaiting = %v, want input", tk.Awaiting)
	}
}

func TestEngineRegisterGateParksForApproval(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", "")
	engine := NewEngine(root)

	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingGate, Question: Question{Text: "Ship it?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if p.Awaiting != tick.AwaitingApproval {
		t.Fatalf("awaiting = %q, want approval", p.Awaiting)
	}
	if len(p.Question.Options) != 2 || p.Question.Options[0].ID != OptionApprove || p.Question.Options[1].ID != OptionReject {
		t.Fatalf("gate question options = %+v, want approve/reject", p.Question.Options)
	}
	tk := mustLoad(t, ticks, "abc")
	if tk.GetAwaitingType() != tick.AwaitingApproval {
		t.Fatalf("tick awaiting = %q", tk.GetAwaitingType())
	}
}

func TestEngineApplyAnswerWritesHumanNote(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "Which provider?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	resolved, err := engine.Pending().Resolve(p.ID, PendingResolution{
		Outcome:        Outcome{Status: OutcomeAnswered, Text: "Use Stripe"},
		AnsweredBy:     AnsweredByTelegram,
		TelegramUserID: "424242",
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}

	applied, err := engine.Apply(resolved)
	if err != nil {
		t.Fatalf("Apply: %v", err)
	}
	if applied.OutOfBand {
		t.Fatal("Apply reported out-of-band for a live awaiting tick")
	}
	if applied.Closed {
		t.Fatal("an input answer must not close the tick")
	}
	if applied.Outcome.Status != OutcomeAnswered || applied.Outcome.Text != "Use Stripe" {
		t.Fatalf("outcome = %+v", applied.Outcome)
	}

	tk := mustLoad(t, ticks, "abc")
	if tk.Awaiting != nil {
		t.Fatalf("awaiting not cleared: %v", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "[human] Use Stripe") {
		t.Fatalf("note lacks human provenance: %q", tk.Notes)
	}
	if !strings.Contains(tk.Notes, "424242") {
		t.Fatalf("note lacks telegram identity: %q", tk.Notes)
	}
}

func TestEngineApplyTerminalAnswerOmitsChannelIdentity(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "Which provider?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	resolved, err := engine.Pending().Resolve(p.ID, PendingResolution{
		Outcome:    Outcome{Status: OutcomeAnswered, Text: "Use Adyen"},
		AnsweredBy: AnsweredByTerminal,
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if _, err := engine.Apply(resolved); err != nil {
		t.Fatalf("Apply: %v", err)
	}
	tk := mustLoad(t, ticks, "abc")
	if !strings.Contains(tk.Notes, "[human] Use Adyen") {
		t.Fatalf("note = %q", tk.Notes)
	}
	if strings.Contains(tk.Notes, "telegram") {
		t.Fatalf("terminal answer should not claim a telegram identity: %q", tk.Notes)
	}
}

func TestEngineApplyGateApproveClosesTick(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingApproval)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingGate, Question: Question{Text: "Ship it?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	resolved, err := engine.Pending().Resolve(p.ID, PendingResolution{
		Outcome:        Outcome{Status: OutcomeAnswered, OptionIDs: []string{OptionApprove}, Text: "Approve"},
		AnsweredBy:     AnsweredByTelegram,
		TelegramUserID: "424242",
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}

	applied, err := engine.Apply(resolved)
	if err != nil {
		t.Fatalf("Apply: %v", err)
	}
	if !applied.Closed {
		t.Fatal("approving an approval gate should close the tick")
	}

	tk := mustLoad(t, ticks, "abc")
	if tk.Status != tick.StatusClosed {
		t.Fatalf("status = %q, want closed", tk.Status)
	}
	if tk.Verdict == nil || *tk.Verdict != tick.VerdictApproved {
		t.Fatalf("verdict = %v, want approved", tk.Verdict)
	}
	if !strings.Contains(tk.Notes, "[human]") || !strings.Contains(tk.Notes, "424242") {
		t.Fatalf("gate note lacks human provenance with telegram id: %q", tk.Notes)
	}
}

func TestEngineApplyGateRejectReturnsToAgent(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingApproval)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingGate, Question: Question{Text: "Ship it?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	resolved, err := engine.Pending().Resolve(p.ID, PendingResolution{
		Outcome:    Outcome{Status: OutcomeAnswered, OptionIDs: []string{OptionReject}, Text: "Not yet — fix the copy"},
		AnsweredBy: AnsweredByTerminal,
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}

	applied, err := engine.Apply(resolved)
	if err != nil {
		t.Fatalf("Apply: %v", err)
	}
	if applied.Closed {
		t.Fatal("rejecting an approval gate must not close the tick")
	}
	tk := mustLoad(t, ticks, "abc")
	if tk.Status == tick.StatusClosed {
		t.Fatal("tick closed on reject")
	}
	if tk.Awaiting != nil {
		t.Fatalf("awaiting not cleared: %v", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "[human] Not yet — fix the copy") {
		t.Fatalf("note = %q", tk.Notes)
	}
}

// TestEngineApplyDetectsOutOfBand covers the source-of-truth rule: someone
// cleared the gate on the tick while the question was in flight, so the answer
// is not applied — the caller only resolves the channel message.
func TestEngineApplyDetectsOutOfBand(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingApproval)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingGate, Question: Question{Text: "Ship it?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	// Out-of-band: a human cleared the gate directly on the tick.
	tk := mustLoad(t, ticks, "abc")
	tk.ClearAwaiting()
	tk.UpdatedAt = time.Now().UTC()
	if err := ticks.WriteAs(tk, "human"); err != nil {
		t.Fatalf("clear awaiting: %v", err)
	}

	resolved, err := engine.Pending().Resolve(p.ID, PendingResolution{
		Outcome:    Outcome{Status: OutcomeAnswered, OptionIDs: []string{OptionApprove}},
		AnsweredBy: AnsweredByTelegram,
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}

	applied, err := engine.Apply(resolved)
	if err != nil {
		t.Fatalf("Apply: %v", err)
	}
	if !applied.OutOfBand {
		t.Fatal("Apply did not detect the out-of-band clear")
	}
	if applied.Outcome.Status != OutcomeCancelled {
		t.Fatalf("out-of-band outcome = %+v, want cancelled", applied.Outcome)
	}
	after := mustLoad(t, ticks, "abc")
	if after.Notes != "" {
		t.Fatalf("out-of-band resolution must not write a note, got %q", after.Notes)
	}
	if after.Status == tick.StatusClosed {
		t.Fatal("out-of-band resolution must not close the tick")
	}
}

func TestEngineAwaitReturnsOutOfBand(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "Which provider?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	go func() {
		time.Sleep(20 * time.Millisecond)
		tk, err := ticks.Read("abc")
		if err != nil {
			return
		}
		tk.ClearAwaiting()
		tk.UpdatedAt = time.Now().UTC()
		_ = ticks.WriteAs(tk, "human")
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	applied, err := engine.Await(ctx, p.ID, 5*time.Millisecond)
	if err != nil {
		t.Fatalf("Await: %v", err)
	}
	if !applied.OutOfBand {
		t.Fatalf("Await = %+v, want out-of-band", applied)
	}

	// The entry is settled so a restart does not wait on it again.
	stored, err := engine.Pending().Load(p.ID)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if stored.Resolution == nil || stored.Resolution.AnsweredBy != AnsweredByOutOfBand {
		t.Fatalf("stored resolution = %+v", stored.Resolution)
	}
}

func TestEngineAwaitAppliesChannelAnswer(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "Which provider?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	go func() {
		time.Sleep(20 * time.Millisecond)
		_, _ = engine.Pending().Resolve(p.ID, PendingResolution{
			Outcome:        Outcome{Status: OutcomeAnswered, Text: "Stripe"},
			AnsweredBy:     AnsweredByTelegram,
			TelegramUserID: "7",
		})
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	applied, err := engine.Await(ctx, p.ID, 5*time.Millisecond)
	if err != nil {
		t.Fatalf("Await: %v", err)
	}
	if applied.OutOfBand || applied.Outcome.Text != "Stripe" {
		t.Fatalf("Await = %+v", applied)
	}
	tk := mustLoad(t, ticks, "abc")
	if !strings.Contains(tk.Notes, "[human] Stripe") {
		t.Fatalf("note = %q", tk.Notes)
	}
}

func TestEngineApplyRefusesUnresolvedEntry(t *testing.T) {
	root, _ := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if _, err := engine.Apply(p); !errors.Is(err, ErrNotResolved) {
		t.Fatalf("Apply error = %v, want ErrNotResolved", err)
	}
}

func TestEngineApplyNonAnswerLeavesTickAlone(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	resolved, err := engine.Pending().Resolve(p.ID, PendingResolution{
		Outcome:    Outcome{Status: OutcomeTimedOut, Text: "no answer in time"},
		AnsweredBy: AnsweredByTerminal,
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	applied, err := engine.Apply(resolved)
	if err != nil {
		t.Fatalf("Apply: %v", err)
	}
	if applied.Outcome.Status != OutcomeTimedOut {
		t.Fatalf("outcome = %+v", applied.Outcome)
	}
	tk := mustLoad(t, ticks, "abc")
	if tk.Awaiting == nil {
		t.Fatal("a timeout must leave the tick awaiting")
	}
	if tk.Notes != "" {
		t.Fatalf("a timeout must not write a note, got %q", tk.Notes)
	}
}

func TestConsumerRoutesEventToPendingByRef(t *testing.T) {
	root, _ := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	store := engine.Pending()
	other, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "first?"}})
	if err != nil {
		t.Fatalf("Register other: %v", err)
	}
	target, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "second?"}})
	if err != nil {
		t.Fatalf("Register target: %v", err)
	}

	channel := NewFakeChannel()
	consumer := NewConsumer(store, channel)
	consumer.TelegramUserID = "424242"

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := consumer.Deliver(ctx); err != nil {
		t.Fatalf("Deliver: %v", err)
	}
	if len(channel.Asked()) != 2 {
		t.Fatalf("delivered %d questions, want 2", len(channel.Asked()))
	}

	targetEntry, err := store.Load(target.ID)
	if err != nil {
		t.Fatalf("Load target: %v", err)
	}
	if targetEntry.Ref.IsZero() {
		t.Fatal("delivery did not record a message ref")
	}

	matched, ok, err := consumer.Route(ctx, Event{Kind: EventAnswer, Ref: targetEntry.Ref, Text: "Stripe"})
	if err != nil {
		t.Fatalf("Route: %v", err)
	}
	if !ok {
		t.Fatal("Route did not match the delivered ref")
	}
	if matched.ID != target.ID {
		t.Fatalf("routed to %q, want %q", matched.ID, target.ID)
	}
	if matched.Resolution == nil || matched.Resolution.Outcome.Text != "Stripe" {
		t.Fatalf("resolution = %+v", matched.Resolution)
	}
	if matched.Resolution.TelegramUserID != "424242" {
		t.Fatalf("resolution identity = %q", matched.Resolution.TelegramUserID)
	}

	// The sibling entry is untouched — routing is by ref, not by tick.
	otherEntry, err := store.Load(other.ID)
	if err != nil {
		t.Fatalf("Load other: %v", err)
	}
	if otherEntry.Resolution != nil {
		t.Fatalf("sibling entry was resolved: %+v", otherEntry.Resolution)
	}

	// An unknown ref matches nothing rather than resolving something at random.
	if _, ok, err := consumer.Route(ctx, Event{Kind: EventAnswer, Ref: MessageRef{ChannelID: "fake", MessageID: "999"}, Text: "hi"}); err != nil || ok {
		t.Fatalf("Route(unknown ref) = %v, %v", ok, err)
	}

	// A press on an already-resolved question does not resolve it twice.
	if _, ok, err := consumer.Route(ctx, Event{Kind: EventOptionPress, Ref: targetEntry.Ref, OptionIDs: []string{"x"}}); err != nil || ok {
		t.Fatalf("Route(stale press) = %v, %v", ok, err)
	}
}

func TestConsumerRouteOptionPressCarriesLabels(t *testing.T) {
	root, _ := newTickRepo(t, "abc", tick.AwaitingApproval)
	engine := NewEngine(root)
	store := engine.Pending()
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingGate, Question: Question{Text: "Ship it?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	channel := NewFakeChannel()
	consumer := NewConsumer(store, channel)
	ctx := context.Background()
	if err := consumer.Deliver(ctx); err != nil {
		t.Fatalf("Deliver: %v", err)
	}
	entry, err := store.Load(p.ID)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	matched, ok, err := consumer.Route(ctx, Event{Kind: EventOptionPress, Ref: entry.Ref, OptionIDs: []string{OptionApprove}})
	if err != nil || !ok {
		t.Fatalf("Route = %v, %v", ok, err)
	}
	if matched.Resolution.Outcome.Text != "Approve" {
		t.Fatalf("outcome text = %q, want the option label", matched.Resolution.Outcome.Text)
	}
}

// TestConsumerDeliverHonorsNotBefore covers escalation delay: local surfaces see
// the entry immediately, the channel only after the grace window.
func TestConsumerDeliverHonorsNotBefore(t *testing.T) {
	root, _ := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	store := engine.Pending()

	now := time.Date(2026, 8, 16, 12, 0, 0, 0, time.UTC)
	engine.Now = func() time.Time { return now }
	p, err := engine.Register(Registration{
		TickID:    "abc",
		Kind:      PendingAsk,
		Question:  Question{Text: "Which provider?"},
		NotBefore: now.Add(10 * time.Minute),
	})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	// Visible to local surfaces straight away.
	list, err := store.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("List = %+v, want the entry immediately", list)
	}

	channel := NewFakeChannel()
	consumer := NewConsumer(store, channel)
	consumer.Now = func() time.Time { return now }

	ctx := context.Background()
	if err := consumer.Deliver(ctx); err != nil {
		t.Fatalf("Deliver before window: %v", err)
	}
	if len(channel.Asked()) != 0 {
		t.Fatalf("delivered %d questions before not_before", len(channel.Asked()))
	}
	entry, err := store.Load(p.ID)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !entry.Ref.IsZero() {
		t.Fatalf("undelivered entry has a ref: %+v", entry.Ref)
	}

	consumer.Now = func() time.Time { return now.Add(11 * time.Minute) }
	if err := consumer.Deliver(ctx); err != nil {
		t.Fatalf("Deliver after window: %v", err)
	}
	if len(channel.Asked()) != 1 {
		t.Fatalf("delivered %d questions after not_before, want 1", len(channel.Asked()))
	}
	entry, err = store.Load(p.ID)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if entry.Ref.IsZero() {
		t.Fatal("delivery did not record a message ref")
	}
}

// TestConsumerRunIsSingleOwner proves the poll loop is elected once per repo:
// the second Run is told to become a waiter instead.
func TestConsumerRunIsSingleOwner(t *testing.T) {
	root := t.TempDir()
	store := NewPendingStore(root)
	channel := NewFakeChannel()

	owner := NewConsumer(store, channel)
	owner.Interval = 5 * time.Millisecond

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- owner.Run(ctx) }()

	// Wait for the owner to take the lock — by observing the subscription it
	// makes immediately afterwards, NOT by acquiring the lock to look at it.
	// A probe that acquires competes with the owner: when the probe wins,
	// owner.Run returns ErrConsumerBusy and exits, and the probe loop then
	// spins to its deadline reporting "owner never took the consumer lock",
	// which describes the test's own interference rather than the code.
	select {
	case <-channel.Subscribed():
	case err := <-done:
		t.Fatalf("owner exited before taking the lock: %v", err)
	case <-time.After(30 * time.Second):
		t.Fatal("owner never took the consumer lock")
	}

	waiter := NewConsumer(NewPendingStore(root), NewFakeChannel())
	if err := waiter.Run(ctx); !errors.Is(err, ErrConsumerBusy) {
		t.Fatalf("second Run error = %v, want ErrConsumerBusy", err)
	}

	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("owner Run: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("owner Run did not return after cancel")
	}

	// The lock was handed off cleanly on exit.
	lock, err := NewPendingStore(root).AcquireConsumer()
	if err != nil {
		t.Fatalf("AcquireConsumer after owner exit: %v", err)
	}
	_ = lock.Release()
}

// TestConsumerRunDeliversAndRoutes is the end-to-end loop: an entry registered
// while the owner runs is delivered, and the operator's answer lands in the
// pending file, which is what a waiter is watching.
func TestConsumerRunDeliversAndRoutes(t *testing.T) {
	root, _ := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	store := engine.Pending()
	channel := NewFakeChannel()

	consumer := NewConsumer(store, channel)
	consumer.Interval = 5 * time.Millisecond
	consumer.TelegramUserID = "424242"

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- consumer.Run(ctx) }()

	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "Which provider?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	// Wait for the loop to deliver it, then answer on the channel.
	var ref MessageRef
	deadline := time.Now().Add(5 * time.Second)
	for ref.IsZero() {
		entry, err := store.Load(p.ID)
		if err != nil {
			t.Fatalf("Load: %v", err)
		}
		ref = entry.Ref
		if time.Now().After(deadline) {
			t.Fatal("consumer never delivered the question")
		}
		time.Sleep(2 * time.Millisecond)
	}
	channel.Script(Event{Kind: EventAnswer, Ref: ref, Text: "Stripe"})

	waitCtx, waitCancel := context.WithTimeout(ctx, 5*time.Second)
	defer waitCancel()
	applied, err := engine.Await(waitCtx, p.ID, 5*time.Millisecond)
	if err != nil {
		t.Fatalf("Await: %v", err)
	}
	if applied.Outcome.Text != "Stripe" {
		t.Fatalf("applied = %+v", applied)
	}
	if applied.Pending.Resolution.TelegramUserID != "424242" {
		t.Fatalf("identity = %+v", applied.Pending.Resolution)
	}

	cancel()
	if err := <-done; err != nil {
		t.Fatalf("Run: %v", err)
	}
}
