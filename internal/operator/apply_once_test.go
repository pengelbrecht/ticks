package operator

import (
	"context"
	"strings"
	"sync"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// TestEngineApplyIsExactlyOncePerResolution pins the rule that makes a local
// `tk answer` safe while an ask is blocked on the same question: both processes
// run the resolution through Apply, and the tick must end up with ONE human
// note, not two.
func TestEngineApplyIsExactlyOncePerResolution(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "Which provider?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	resolved, err := engine.Pending().Resolve(p.ID, PendingResolution{
		Outcome:    Outcome{Status: OutcomeAnswered, Text: "Use Stripe"},
		AnsweredBy: AnsweredByTerminal,
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}

	first, err := engine.Apply(resolved)
	if err != nil {
		t.Fatalf("Apply (first): %v", err)
	}
	if first.AlreadyApplied {
		t.Error("the first Apply reported the resolution as already applied")
	}

	second, err := engine.Apply(resolved)
	if err != nil {
		t.Fatalf("Apply (second): %v", err)
	}
	if !second.AlreadyApplied {
		t.Error("the second Apply did not report the resolution as already applied")
	}
	// The answer still comes back: a waiter that lost the race must still be
	// able to tell its caller what the operator decided.
	if second.Outcome.Text != "Use Stripe" {
		t.Errorf("second outcome = %+v, want the recorded answer", second.Outcome)
	}

	tk := mustLoad(t, ticks, "abc")
	if got := strings.Count(tk.Notes, "[human]"); got != 1 {
		t.Errorf("human notes = %d, want exactly 1:\n%s", got, tk.Notes)
	}
}

// TestEngineApplyConcurrentAppliersWriteOneNote is the same rule under a real
// race: the apply lock, not luck, is what keeps the note single.
func TestEngineApplyConcurrentAppliersWriteOneNote(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "Which provider?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	resolved, err := engine.Pending().Resolve(p.ID, PendingResolution{
		Outcome:    Outcome{Status: OutcomeAnswered, Text: "Use Stripe"},
		AnsweredBy: AnsweredByTerminal,
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}

	const appliers = 4
	var (
		wg    sync.WaitGroup
		start = make(chan struct{})
		errs  = make([]error, appliers)
	)
	for i := range appliers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			_, errs[i] = NewEngine(root).Apply(resolved)
		}()
	}
	close(start)
	wg.Wait()
	for i, err := range errs {
		if err != nil {
			t.Fatalf("applier %d: %v", i, err)
		}
	}

	tk := mustLoad(t, ticks, "abc")
	if got := strings.Count(tk.Notes, "[human]"); got != 1 {
		t.Errorf("human notes = %d, want exactly 1:\n%s", got, tk.Notes)
	}
}

// TestConsumerDeliverAdoptsDeliveredQuestions pins the cross-process half of
// async asking: a question delivered by an earlier run is handed back to this
// run's transport, so a press on it still routes to the right entry instead of
// being read as a stale button.
func TestConsumerDeliverAdoptsDeliveredQuestions(t *testing.T) {
	root, _ := newTickRepo(t, "abc", tick.AwaitingInput)
	engine := NewEngine(root)
	p, err := engine.Register(Registration{TickID: "abc", Kind: PendingAsk, Question: Question{Text: "Which region?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	// The first run delivers, then goes away.
	delivering := NewFakeChannel()
	if err := NewConsumer(engine.Pending(), delivering).Deliver(context.Background()); err != nil {
		t.Fatalf("Deliver: %v", err)
	}
	entry, err := engine.Pending().Load(p.ID)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !entry.Delivered() {
		t.Fatal("the entry was not marked delivered")
	}

	// A second run over a fresh transport must adopt it rather than re-deliver.
	adopting := NewFakeChannel()
	if err := NewConsumer(engine.Pending(), adopting).Deliver(context.Background()); err != nil {
		t.Fatalf("Deliver (second run): %v", err)
	}
	if asked := adopting.Asked(); len(asked) != 0 {
		t.Errorf("the second run re-delivered %d questions, want 0", len(asked))
	}
	q, ok := adopting.Question(entry.Ref)
	if !ok {
		t.Fatalf("the second transport did not adopt %+v", entry.Ref)
	}
	if q.Text != "Which region?" {
		t.Errorf("adopted question = %+v, want the registered one", q)
	}
}
