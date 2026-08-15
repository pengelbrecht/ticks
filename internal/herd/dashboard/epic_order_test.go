package dashboard

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/client"
)

// board builds a snapshot from (epic id, worker statuses, tick statuses).
func orderBoard(specs ...epicSpec) Snapshot {
	var snap Snapshot
	for _, s := range specs {
		e := EpicBoard{Epic: s.id, Title: s.id + " title"}
		for i, st := range s.workers {
			e.Workers = append(e.Workers, WorkerRow{Tick: s.id, PaneID: s.id + string(rune('a'+i)), Status: st})
		}
		var w WaveRow
		w.Number = 1
		for i, st := range s.ticks {
			w.Ticks = append(w.Ticks, TickRow{ID: s.id + string(rune('0'+i)), Status: st})
		}
		e.Waves = []WaveRow{w}
		snap.Epics = append(snap.Epics, e)
	}
	return snap
}

type epicSpec struct {
	id      string
	workers []client.AgentStatus
	ticks   []string
}

func epicOrder(snap Snapshot) []string {
	out := make([]string, 0, len(snap.Epics))
	for _, e := range snap.Epics {
		out = append(out, e.Epic)
	}
	return out
}

// Running workers are the primary key: the epic with agents in flight is the
// one an operator is watching.
func TestSortEpicsPutsRunningWorkersFirst(t *testing.T) {
	snap := orderBoard(
		epicSpec{id: "aaa", ticks: []string{"open", "open", "open"}},
		epicSpec{id: "bbb", workers: []client.AgentStatus{client.StatusWorking}, ticks: []string{"in_progress"}},
	)
	SortEpics(snap.Epics)
	if got := epicOrder(snap); got[0] != "bbb" {
		t.Errorf("order = %v, want the epic with a working agent first", got)
	}
}

// done and idle are herdr's TERMINAL statuses (client.TerminalStatuses), and a
// closed epic keeps its done workers until cleanup — counting them would pin a
// finished epic to the top of the board, which is the bug this sort fixes.
func TestSortEpicsIgnoresTerminalAndGoneWorkers(t *testing.T) {
	snap := orderBoard(
		epicSpec{id: "closed-with-done", workers: []client.AgentStatus{client.StatusDone, client.StatusIdle, StatusGone}, ticks: []string{"closed", "closed"}},
		epicSpec{id: "live", ticks: []string{"open"}},
	)
	SortEpics(snap.Epics)
	if got := epicOrder(snap); got[0] != "live" {
		t.Errorf("order = %v, want the epic with open work above one holding only finished workers", got)
	}
}

// A blocked agent wants a human — maximally active for an operator's purposes.
func TestSortEpicsCountsBlockedAsRunning(t *testing.T) {
	snap := orderBoard(
		epicSpec{id: "quiet", ticks: []string{"open", "open", "open", "open"}},
		epicSpec{id: "stuck", workers: []client.AgentStatus{client.StatusBlocked}, ticks: []string{"open"}},
	)
	SortEpics(snap.Epics)
	if got := epicOrder(snap); got[0] != "stuck" {
		t.Errorf("order = %v, want the blocked worker's epic first", got)
	}
}

// Open-tick count is the secondary key, applied only among epics with equal
// running-worker counts.
func TestSortEpicsBreaksTiesOnOpenTicks(t *testing.T) {
	snap := orderBoard(
		epicSpec{id: "few", ticks: []string{"open", "closed"}},
		epicSpec{id: "many", ticks: []string{"open", "open", "in_progress"}},
	)
	SortEpics(snap.Epics)
	if got := epicOrder(snap); got[0] != "many" {
		t.Errorf("order = %v, want the epic with more open ticks first", got)
	}
}

// Equal on both keys must be stable and deterministic, or the board reshuffles
// under the cursor on every refresh.
func TestSortEpicsIsDeterministicOnFullTies(t *testing.T) {
	snap := orderBoard(
		epicSpec{id: "zzz", ticks: []string{"open"}},
		epicSpec{id: "aaa", ticks: []string{"open"}},
	)
	SortEpics(snap.Epics)
	if got := epicOrder(snap); got[0] != "aaa" || got[1] != "zzz" {
		t.Errorf("order = %v, want id order on a full tie", got)
	}
}

// Fully-closed epics sink to the bottom: zero running workers, zero open ticks.
func TestSortEpicsSinksFullyClosedEpics(t *testing.T) {
	snap := orderBoard(
		epicSpec{id: "done1", workers: []client.AgentStatus{client.StatusDone}, ticks: []string{"closed", "closed"}},
		epicSpec{id: "done2", ticks: []string{"closed"}},
		epicSpec{id: "active", workers: []client.AgentStatus{client.StatusWorking}, ticks: []string{"in_progress", "open"}},
	)
	SortEpics(snap.Epics)
	if got := epicOrder(snap); got[0] != "active" {
		t.Errorf("order = %v, want the active epic first", got)
	}
}

// ---- collapse ----

// A fully-closed epic is collapsed by default: it is finished business, and
// on a multi-epic board its ticks crowd out the run in flight.
func TestFullyClosedEpicCollapsesByDefault(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: orderBoard(
		epicSpec{id: "act", workers: []client.AgentStatus{client.StatusWorking}, ticks: []string{"in_progress"}},
		epicSpec{id: "fin", ticks: []string{"closed", "closed"}},
	)})

	view := m.View()
	if !strings.Contains(view, "fin") {
		t.Fatalf("collapsed epic lost its header:\n%s", view)
	}
	if strings.Contains(view, "fin0") || strings.Contains(view, "fin1") {
		t.Errorf("collapsed epic still lists its ticks:\n%s", view)
	}
	if !strings.Contains(view, "act0") {
		t.Errorf("active epic must stay expanded:\n%s", view)
	}
}

// The header is a cursor row, and enter toggles the epic under it.
func TestEnterOnEpicHeaderTogglesCollapse(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: orderBoard(
		epicSpec{id: "act", workers: []client.AgentStatus{client.StatusWorking}, ticks: []string{"in_progress"}},
		epicSpec{id: "fin", ticks: []string{"closed"}},
	)})

	// Cursor starts on the first epic header, so no tick is selected.
	if _, ok := m.Selected(); ok {
		t.Error("cursor on an epic header must not select a tick")
	}
	id, ok := m.SelectedEpic()
	if !ok || id != "act" {
		t.Fatalf("SelectedEpic = %q (%v), want act", id, ok)
	}

	// Collapse the active epic; its tick leaves the selection list.
	apply(m, key("enter"))
	if strings.Contains(m.View(), "act0") {
		t.Errorf("enter did not collapse the epic:\n%s", m.View())
	}
	// And expand it again.
	apply(m, key("enter"))
	if !strings.Contains(m.View(), "act0") {
		t.Errorf("enter did not re-expand the epic:\n%s", m.View())
	}
}

// An explicit expand must survive the refresh that lands a second later —
// otherwise the board re-collapses what the operator just opened.
func TestManualExpandSurvivesReload(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	snap := orderBoard(
		epicSpec{id: "act", workers: []client.AgentStatus{client.StatusWorking}, ticks: []string{"in_progress"}},
		epicSpec{id: "fin", ticks: []string{"closed"}},
	)
	apply(m, SnapshotMsg{Snapshot: snap})

	apply(m, key("j")) // onto fin's header (act's single tick sits between)
	apply(m, key("j"))
	id, ok := m.SelectedEpic()
	if !ok || id != "fin" {
		t.Fatalf("SelectedEpic = %q (%v), want fin", id, ok)
	}
	apply(m, key("enter"))
	if !strings.Contains(m.View(), "fin0") {
		t.Fatalf("expanding the closed epic did not reveal its tick:\n%s", m.View())
	}

	apply(m, SnapshotMsg{Snapshot: orderBoard(
		epicSpec{id: "act", workers: []client.AgentStatus{client.StatusWorking}, ticks: []string{"in_progress"}},
		epicSpec{id: "fin", ticks: []string{"closed"}},
	)})
	if !strings.Contains(m.View(), "fin0") {
		t.Errorf("reload re-collapsed a manually expanded epic:\n%s", m.View())
	}
}

// Enter on a tick still opens the detail view — the header row must not
// swallow the board's existing action.
func TestEnterOnTickStillOpensDetail(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: orderBoard(
		epicSpec{id: "act", workers: []client.AgentStatus{client.StatusWorking}, ticks: []string{"in_progress"}},
	)})

	apply(m, key("j")) // onto the tick
	sel, ok := m.Selected()
	if !ok || sel.ID != "act0" {
		t.Fatalf("Selected = %q (%v), want act0", sel.ID, ok)
	}
	apply(m, key("enter"))
	if m.mode != modeDetail {
		t.Error("enter on a tick no longer opens the detail view")
	}
}
