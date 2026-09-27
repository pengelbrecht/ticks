package merge

import (
	"bytes"
	"encoding/json"
	"fmt"
	"reflect"
	"sort"
	"strings"
	"testing"
	"time"

	"hegel.dev/go/hegel"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Property-based tests for the tick merge driver (tick jd5).
//
// merge-file is git's three-way merge for a tick record: base is the common
// ancestor, ours and theirs are the two sides. A merge must not lose an edit
// that only one side made — that is what "three-way" buys over "last writer
// wins" — and must be the identity when one side changed nothing.

var (
	words     = []string{"alpha", "beta", "gamma", "delta"}
	statuses  = []string{tick.StatusOpen, tick.StatusInProgress, tick.StatusClosed}
	baseClock = time.Date(2026, 9, 27, 0, 0, 0, 0, time.UTC)
)

func genTick(tc hegel.TestCase) tick.Tick {
	return tick.Tick{
		ID:          "t1",
		Title:       hegel.Draw(tc, hegel.SampledFrom(words)),
		Gloss:       hegel.Draw(tc, hegel.SampledFrom(append([]string{""}, words...))),
		Description: hegel.Draw(tc, hegel.SampledFrom(append([]string{""}, words...))),
		Status:      hegel.Draw(tc, hegel.SampledFrom(statuses)),
		Priority:    hegel.Draw(tc, hegel.Integers(0, 4)),
		Type:        "task",
		Owner:       hegel.Draw(tc, hegel.SampledFrom([]string{"a@x", "b@x"})),
		Labels:      hegel.Draw(tc, hegel.Lists(hegel.SampledFrom(words)).MaxSize(2)),
		UpdatedAt:   baseClock,
	}
}

// scalarFields are the fields Merge carries from the winning side wholesale.
// Each is a function that sets a distinct value on a copy, so a test can make
// a one-sided edit to exactly one of them.
var scalarFields = map[string]func(t *tick.Tick, v string){
	"title":       func(t *tick.Tick, v string) { t.Title = "edited-" + v },
	"gloss":       func(t *tick.Tick, v string) { t.Gloss = "edited-" + v },
	"description": func(t *tick.Tick, v string) { t.Description = "edited-" + v },
	"owner":       func(t *tick.Tick, v string) { t.Owner = "edited-" + v },
	// A reopen (closed -> open) and a de-prioritisation are the one-sided
	// edits the old rank rules undid.
	"status": func(t *tick.Tick, v string) {
		if t.Status == tick.StatusClosed {
			t.Status = tick.StatusOpen
		} else {
			t.Status = tick.StatusClosed
		}
	},
	"priority": func(t *tick.Tick, v string) { t.Priority = (t.Priority + 1) % 5 },
	"labels": func(t *tick.Tick, v string) {
		if len(t.Labels) > 0 {
			t.Labels = t.Labels[1:] // a removal
		} else {
			t.Labels = []string{"edited-" + v}
		}
	},
}

func fieldValue(t tick.Tick, name string) string {
	switch name {
	case "status":
		return t.Status
	case "priority":
		return fmt.Sprint(t.Priority)
	case "labels":
		return fmt.Sprint(normalize(t).Labels)
	case "title":
		return t.Title
	case "gloss":
		return t.Gloss
	case "description":
		return t.Description
	case "owner":
		return t.Owner
	}
	panic(name)
}

func fieldNames() []string {
	names := make([]string, 0, len(scalarFields))
	for n := range scalarFields {
		names = append(names, n)
	}
	sort.Strings(names)
	return names
}

// An edit made on one side only survives the merge, whichever side was
// updated last. Two people editing DIFFERENT fields of one tick is the common
// case on a shared tracker (a run claims it while a person retitles it).
func TestPBTAOneSidedEditSurvivesTheMerge(t *testing.T) {
	hegel.Test(t, func(ht *hegel.T) {
		base := genTick(ht)
		names := fieldNames()
		oursField := hegel.Draw(ht, hegel.SampledFrom(names))
		theirsField := hegel.Draw(ht, hegel.SampledFrom(names))
		ht.Assume(oursField != theirsField)

		ours, theirs := base, base
		scalarFields[oursField](&ours, "ours")
		scalarFields[theirsField](&theirs, "theirs")
		ours.UpdatedAt = baseClock.Add(time.Duration(hegel.Draw(ht, hegel.Integers(1, 100))) * time.Minute)
		theirs.UpdatedAt = baseClock.Add(time.Duration(hegel.Draw(ht, hegel.Integers(1, 100))) * time.Minute)

		merged := Merge(base, ours, theirs)
		if got := fieldValue(merged, oursField); got != fieldValue(ours, oursField) {
			ht.Fatalf("ours edited %s to %q, theirs edited %s; the merge kept %s=%q (ours@%s theirs@%s)",
				oursField, fieldValue(ours, oursField), theirsField, oursField, got,
				ours.UpdatedAt.Format("15:04"), theirs.UpdatedAt.Format("15:04"))
		}
		if got := fieldValue(merged, theirsField); got != fieldValue(theirs, theirsField) {
			ht.Fatalf("theirs edited %s to %q, ours edited %s; the merge kept %s=%q (ours@%s theirs@%s)",
				theirsField, fieldValue(theirs, theirsField), oursField, theirsField, got,
				ours.UpdatedAt.Format("15:04"), theirs.UpdatedAt.Format("15:04"))
		}
	}, hegel.WithTestCases(300))
}

// A side that changed nothing contributes nothing: merging it returns the
// other side exactly.
func TestPBTAnUnchangedSideIsTheIdentity(t *testing.T) {
	hegel.Test(t, func(ht *hegel.T) {
		base := genTick(ht)
		ours := genTick(ht)
		ours.UpdatedAt = baseClock.Add(time.Duration(hegel.Draw(ht, hegel.Integers(0, 100))) * time.Minute)

		merged := Merge(base, ours, base)
		if !reflect.DeepEqual(normalize(merged), normalize(ours)) {
			ht.Fatalf("merging an unchanged theirs changed ours:\nbase   %+v\nours   %+v\nmerged %+v", base, ours, merged)
		}
	}, hegel.WithTestCases(300))
}

// Merging a side with itself is that side.
func TestPBTMergingASideWithItselfIsThatSide(t *testing.T) {
	hegel.Test(t, func(ht *hegel.T) {
		base := genTick(ht)
		x := genTick(ht)
		merged := Merge(base, x, x)
		if !reflect.DeepEqual(normalize(merged), normalize(x)) {
			ht.Fatalf("Merge(base, x, x) != x:\nx      %+v\nmerged %+v", x, merged)
		}
	}, hegel.WithTestCases(300))
}

// normalize makes nil and empty slices compare equal and sorts set-valued
// fields, which Merge sorts.
func normalize(t tick.Tick) tick.Tick {
	fix := func(s []string) []string {
		if len(s) == 0 {
			return nil
		}
		out := append([]string(nil), s...)
		sort.Strings(out)
		// Merge also removes duplicates.
		uniq := out[:0]
		for i, v := range out {
			if i == 0 || v != out[i-1] {
				uniq = append(uniq, v)
			}
		}
		return uniq
	}
	t.Labels, t.BlockedBy, t.After = fix(t.Labels), fix(t.BlockedBy), fix(t.After)
	return t
}

// merge-activity: every distinct line on either side survives, exactly once.
// Lines are distinct when their bytes differ.
func TestPBTEveryDistinctActivityLineSurvivesOnce(t *testing.T) {
	type line struct{ ts, tickID, action, actor, note string }
	genLine := hegel.Composite(func(tc hegel.TestCase) line {
		return line{
			ts:     fmt.Sprintf("2026-09-27T00:00:0%dZ", hegel.Draw(tc, hegel.Integers(0, 2))),
			tickID: hegel.Draw(tc, hegel.SampledFrom([]string{"a1", "b2"})),
			action: hegel.Draw(tc, hegel.SampledFrom([]string{"note", "close"})),
			actor:  "ticfac",
			note:   hegel.Draw(tc, hegel.SampledFrom(words)),
		}
	})
	render := func(ls []line) string {
		var b strings.Builder
		for _, l := range ls {
			data, _ := json.Marshal(map[string]any{
				"ts": l.ts, "tick": l.tickID, "action": l.action, "actor": l.actor,
				"data": map[string]string{"note": l.note},
			})
			b.Write(data)
			b.WriteByte('\n')
		}
		return b.String()
	}
	hegel.Test(t, func(ht *hegel.T) {
		ours := hegel.Draw(ht, hegel.Lists(genLine).MaxSize(4))
		theirs := hegel.Draw(ht, hegel.Lists(genLine).MaxSize(4))
		var out bytes.Buffer
		if err := MergeActivity(strings.NewReader(""), strings.NewReader(render(ours)),
			strings.NewReader(render(theirs)), &out); err != nil {
			ht.Fatalf("merge: %v", err)
		}
		want := map[string]bool{}
		for _, l := range strings.Split(strings.TrimSpace(render(ours)+render(theirs)), "\n") {
			if l != "" {
				want[l] = true
			}
		}
		got := map[string]int{}
		for _, l := range strings.Split(strings.TrimSpace(out.String()), "\n") {
			if l != "" {
				got[l]++
			}
		}
		for l := range want {
			if got[l] == 0 {
				ht.Fatalf("a distinct activity line was dropped by the merge: %s\nmerged:\n%s", l, out.String())
			}
		}
		for l, n := range got {
			if n > 1 {
				ht.Fatalf("a line appears %d times: %s", n, l)
			}
		}
	}, hegel.WithTestCases(300))
}
