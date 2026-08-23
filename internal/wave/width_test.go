package wave

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func widthTick(id, parent, status string) tick.Tick {
	return tick.Tick{ID: id, Parent: parent, Status: status, Type: tick.TypeTask}
}

// TestAdmitCountsInProgressSiblings pins what holds a slot: a non-epic sibling
// under the same parent, in_progress, that is not the tick being claimed.
func TestAdmitCountsInProgressSiblings(t *testing.T) {
	all := []tick.Tick{
		{ID: "ep1", Type: tick.TypeEpic, Status: tick.StatusInProgress},
		widthTick("aaa", "ep1", tick.StatusInProgress),
		widthTick("bbb", "ep1", tick.StatusInProgress),
		widthTick("ccc", "ep1", tick.StatusOpen),
		widthTick("ddd", "ep1", tick.StatusClosed),
		widthTick("eee", "ep2", tick.StatusInProgress), // another epic's wave
	}

	a := Admit(all, 3, widthTick("ccc", "ep1", tick.StatusOpen))
	if got, want := strings.Join(a.InFlight, ","), "aaa,bbb"; got != want {
		t.Errorf("InFlight = %q, want %q — only in_progress non-epic siblings hold a slot", got, want)
	}
	if !a.Allowed() {
		t.Error("a third claim under width 3 must be admitted")
	}
	if a.Free() != 1 {
		t.Errorf("Free() = %d, want 1", a.Free())
	}
}

// TestAdmitRefusesBeyondWidth is the invariant this file exists for.
func TestAdmitRefusesBeyondWidth(t *testing.T) {
	all := []tick.Tick{
		widthTick("aaa", "ep1", tick.StatusInProgress),
		widthTick("bbb", "ep1", tick.StatusInProgress),
		widthTick("ccc", "ep1", tick.StatusInProgress),
	}
	a := Admit(all, 3, widthTick("ddd", "ep1", tick.StatusOpen))
	if a.Allowed() {
		t.Fatal("a fourth claim under width 3 was admitted — the width is not a width")
	}
	if a.Free() != 0 {
		t.Errorf("Free() = %d, want 0", a.Free())
	}
	msg := a.Refusal("ddd", ".tick/runners.toml")
	for _, want := range []string{"wave width 3", "aaa, bbb, ccc", "ddd", "max_parallel"} {
		if !strings.Contains(msg, want) {
			t.Errorf("refusal %q missing %q — the message is the contract", msg, want)
		}
	}
}

// TestAdmitReclaimHoldsItsOwnSlot: re-claiming a tick that is already in
// flight must never be refused, or a crash-recovery re-claim would deadlock a
// full wave.
func TestAdmitReclaimHoldsItsOwnSlot(t *testing.T) {
	all := []tick.Tick{
		widthTick("aaa", "ep1", tick.StatusInProgress),
		widthTick("bbb", "ep1", tick.StatusInProgress),
		widthTick("ccc", "ep1", tick.StatusInProgress),
	}
	a := Admit(all, 3, all[2])
	if !a.Allowed() {
		t.Error("re-claiming an in-flight tick was refused — it holds its own slot")
	}
}

// TestAdmitWithoutWidthOrParentIsUnlimited: no configured width, or a tick
// that is not part of an epic's wave, is not gated at all.
func TestAdmitWithoutWidthOrParentIsUnlimited(t *testing.T) {
	all := []tick.Tick{
		widthTick("aaa", "ep1", tick.StatusInProgress),
		widthTick("bbb", "ep1", tick.StatusInProgress),
	}
	if a := Admit(all, 0, widthTick("ccc", "ep1", tick.StatusOpen)); !a.Allowed() || a.Free() != -1 {
		t.Errorf("unset width must not gate: allowed=%v free=%d", a.Allowed(), a.Free())
	}
	if a := Admit(all, 1, widthTick("ccc", "", tick.StatusOpen)); !a.Allowed() {
		t.Error("a tick with no parent epic is not wave dispatch and must not be gated")
	}
}
