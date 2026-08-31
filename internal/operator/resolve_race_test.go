package operator

import (
	"errors"
	"strings"
	"sync"
	"testing"
)

// First resolution wins is the rule the whole dual-surface story rests on, and
// it has to hold when the two surfaces arrive at the same instant: the phone
// and a terminal are different processes, so load-check-save without a lock is
// a lost update, not a race that "probably won't happen".

// TestResolveRaceHasExactlyOneWinner drives two resolvers at one entry and pins
// the outcome: one nil error, one ErrAlreadyResolved carrying the winner, and
// one stored resolution.
func TestResolveRaceHasExactlyOneWinner(t *testing.T) {
	store := NewPendingStore(t.TempDir())
	if err := store.Save(Pending{ID: "q1", TickID: "abc", Kind: PendingAsk}); err != nil {
		t.Fatalf("Save: %v", err)
	}

	texts := []string{"eu-west-1", "us-east-1"}
	entries := make([]Pending, len(texts))
	errs := make([]error, len(texts))

	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := range texts {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			entries[i], errs[i] = store.Resolve("q1", PendingResolution{
				Outcome:    Outcome{Status: OutcomeAnswered, Text: texts[i]},
				AnsweredBy: AnsweredByTerminal,
			})
		}(i)
	}
	close(start)
	wg.Wait()

	winners := 0
	for i, err := range errs {
		switch {
		case err == nil:
			winners++
			if entries[i].Resolution == nil || entries[i].Resolution.Outcome.Text != texts[i] {
				t.Errorf("winner %d got back %+v, want its own outcome", i, entries[i].Resolution)
			}
		case errors.Is(err, ErrAlreadyResolved):
			// The loser must be told what the winner decided, not merely that
			// it lost: a waiter that lost the race still has to report the
			// operator's actual answer.
			if entries[i].Resolution == nil {
				t.Errorf("loser %d got no resolution back with %v", i, err)
				continue
			}
			if entries[i].Resolution.Outcome.Text == texts[i] {
				t.Errorf("loser %d got its own outcome back: %+v", i, entries[i].Resolution)
			}
		default:
			t.Errorf("resolver %d failed with an unexpected error: %v", i, err)
		}
	}
	if winners != 1 {
		t.Fatalf("winners = %d, want exactly 1 (errors: %v)", winners, errs)
	}

	stored, err := store.Load("q1")
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if stored.Resolution == nil {
		t.Fatal("the race left the entry unresolved")
	}
	if stored.Resolution.AnsweredAt.IsZero() {
		t.Error("the stored resolution has no answered-at stamp")
	}
}

// TestResolveRaceAppliesAndRendersOnlyTheWinner carries that through to the
// place the loser would otherwise be visible: the tick's notes.
func TestResolveRaceAppliesAndRendersOnlyTheWinner(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", "")
	engine := NewEngine(root)

	p, err := engine.Register(Registration{TickID: "abc", Question: Question{Text: "Which region?"}})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	texts := []string{"eu-west-1", "us-east-1"}
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := range texts {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			_, _ = engine.Pending().Resolve(p.ID, PendingResolution{
				Outcome:    Outcome{Status: OutcomeAnswered, Text: texts[i]},
				AnsweredBy: AnsweredByTerminal,
			})
		}(i)
	}
	close(start)
	wg.Wait()

	stored, err := engine.Pending().Load(p.ID)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	winner := stored.Resolution.Outcome.Text
	loser := texts[0]
	if winner == loser {
		loser = texts[1]
	}

	if _, err := engine.Apply(stored); err != nil {
		t.Fatalf("Apply: %v", err)
	}

	tk := mustLoad(t, ticks, "abc")
	if !strings.Contains(tk.Notes, winner) {
		t.Errorf("notes do not carry the winning answer %q:\n%s", winner, tk.Notes)
	}
	if strings.Contains(tk.Notes, loser) {
		t.Errorf("notes carry the losing answer %q:\n%s", loser, tk.Notes)
	}
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after the answer", *tk.Awaiting)
	}
}
