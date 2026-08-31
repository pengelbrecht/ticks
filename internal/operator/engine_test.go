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
