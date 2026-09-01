package cmd

import (
	"bytes"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// "End a turn on a dispatch, never on a close" is the doctrine, and a close is
// where the stall reliably lands. Every earlier countermeasure was something
// separate that had to be installed or remembered — a herdr plugin hook, a
// run-start registration nobody typed, a rule in a reference file. This one
// rides the command the orchestrator is already running, so these tests pin
// that it says the right thing at the right volume.

func TestCloseContinuationIsLoudOnAnEpicWithWorkLeft(t *testing.T) {
	root, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure: %v", err)
	}
	if err := store.Write(makeTestTask("aaa")); err != nil {
		t.Fatalf("write: %v", err)
	}

	var buf bytes.Buffer
	printCloseContinuation(&buf, root, tick.Tick{ID: "bbb", Type: tick.TypeEpic})

	out := buf.String()
	if !strings.Contains(out, "NOT A STOPPING POINT") {
		t.Errorf("closing an epic with work left must be loud: %s", out)
	}
	if !strings.Contains(out, "aaa") {
		t.Errorf("should name the actionable tick: %s", out)
	}
}

// A closeout tick's own acceptance is "retro AND flesh out the next feasible
// epic", so closing one reads like the end and is the middle — the single most
// stall-prone moment in a run.
func TestCloseContinuationIsLoudOnACloseoutTick(t *testing.T) {
	root, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure: %v", err)
	}
	if err := store.Write(makeTestTask("aaa")); err != nil {
		t.Fatalf("write: %v", err)
	}

	var buf bytes.Buffer
	printCloseContinuation(&buf, root, tick.Tick{ID: "bbb", Role: tick.RoleCloseout})

	if !strings.Contains(buf.String(), "NOT A STOPPING POINT") {
		t.Errorf("closing a closeout tick must be loud: %s", buf.String())
	}
}

// An ordinary wave close gets one quiet line. A wave of loud banners would
// drown the signal this exists to carry.
func TestCloseContinuationIsQuietOnAnOrdinaryTick(t *testing.T) {
	root, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure: %v", err)
	}
	if err := store.Write(makeTestTask("aaa")); err != nil {
		t.Fatalf("write: %v", err)
	}

	var buf bytes.Buffer
	printCloseContinuation(&buf, root, tick.Tick{ID: "bbb"})

	out := buf.String()
	if strings.Contains(out, "NOT A STOPPING POINT") {
		t.Errorf("an ordinary close must stay quiet: %s", out)
	}
	if !strings.Contains(out, "frontier:") {
		t.Errorf("should still carry the one-line verdict: %s", out)
	}
}

// At rest is a legitimate stop, and saying so is the half that keeps the loud
// case credible: a banner that fires unconditionally is noise, not a signal.
func TestCloseContinuationSaysAtRestAndStaysSilentWhenOrdinary(t *testing.T) {
	root, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure: %v", err)
	}

	var loud bytes.Buffer
	printCloseContinuation(&loud, root, tick.Tick{ID: "bbb", Type: tick.TypeEpic})
	if !strings.Contains(loud.String(), "at rest") {
		t.Errorf("an epic close at rest should say so: %s", loud.String())
	}

	var quiet bytes.Buffer
	printCloseContinuation(&quiet, root, tick.Tick{ID: "ccc"})
	if quiet.String() != "" {
		t.Errorf("an ordinary close at rest should print nothing: %q", quiet.String())
	}
}
