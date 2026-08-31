package operator

import (
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
