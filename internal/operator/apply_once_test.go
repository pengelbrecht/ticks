package operator

import (
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
