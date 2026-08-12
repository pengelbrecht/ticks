package dashboard

import (
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// detailSnapshot is a one-tick board carrying everything the detail view
// renders: description, acceptance criteria, a closed blocker, notes, and a
// spawned worker with every field the worker panel shows.
func detailSnapshot() Snapshot {
	return Snapshot{
		RepoRoot: "/repo",
		Epic:     "zz0",
		LoadedAt: fixedTime,
		Epics: []EpicBoard{{
			Epic:  "zz0",
			Title: "mission control",
			Waves: []WaveRow{
				{Number: 1, Ticks: []TickRow{
					{
						ID:                 "m05",
						Title:              "dashboard pane",
						Status:             tick.StatusInProgress,
						Priority:           2,
						Type:               tick.TypeTask,
						Description:        "Render the mission-control pane.",
						AcceptanceCriteria: "Board shows waves and workers.",
						Notes:              "started after the spike landed",
						BlockedBy:          []BlockerRow{{ID: "abc", Title: "spike", Status: tick.StatusClosed}},
						PaneID:             "w1:p1",
						Agent:              "tick-m05",
					},
				}},
			},
			Workers: []WorkerRow{
				{
					Tick:        "m05",
					Agent:       "tick-m05",
					PaneID:      "w1:p1",
					Kind:        "claude",
					Model:       "sonnet",
					Branch:      "tick/m05",
					Worktree:    "/tmp/wt-m05",
					WorkspaceID: "w1",
					Status:      client.StatusWorking,
					CreatedAt:   fixedTime.Format(state.TimeLayout),
				},
			},
		}},
	}
}

func TestEnterOpensDetailEscCloses(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: detailSnapshot()})

	if strings.Contains(m.View(), "Description") {
		t.Fatalf("board view rendered detail content before enter:\n%s", m.View())
	}

	apply(m, key("enter"))
	view := m.View()
	if !strings.Contains(view, "dashboard pane") || !strings.Contains(view, "Render the mission-control pane") {
		t.Fatalf("detail view missing tick content:\n%s", view)
	}

	apply(m, key("esc"))
	if strings.Contains(m.View(), "Render the mission-control pane") {
		t.Fatalf("esc did not return to the board:\n%s", m.View())
	}

	// enter opens again, and a second enter (not esc) closes it too.
	apply(m, key("enter"))
	if !strings.Contains(m.View(), "Render the mission-control pane") {
		t.Fatalf("enter did not reopen the detail view:\n%s", m.View())
	}
	apply(m, key("enter"))
	if strings.Contains(m.View(), "Render the mission-control pane") {
		t.Fatalf("a second enter did not close the detail view:\n%s", m.View())
	}
}

// enter on a board with no rows (nothing to select) must not crash or open a
// blank detail view.
func TestEnterOnEmptyBoardDoesNothing(t *testing.T) {
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: Snapshot{RepoRoot: "/repo", LoadedAt: fixedTime}})
	apply(m, key("enter"))
	if m.mode != modeBoard {
		t.Errorf("enter opened detail mode with nothing selected")
	}
}

func TestDetailRendersSelectedTickFields(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: detailSnapshot()})
	apply(m, key("enter"))

	view := m.View()
	for _, want := range []string{
		"m05", "dashboard pane",
		"status: in_progress", "priority: 2",
		"Render the mission-control pane.",
		"Board shows waves and workers.",
		"spike",
		"started after the spike landed",
		"claude", "sonnet", "w1:p1", "w1", "tick/m05", "/tmp/wt-m05",
	} {
		if !strings.Contains(view, want) {
			t.Errorf("detail view missing %q:\n%s", want, view)
		}
	}
}

// A tick with no manifest must show the worker panel as "not spawned" rather
// than an empty section or a rendering error.
func TestDetailShowsNotSpawnedWithoutManifest(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	snap := detailSnapshot()
	snap.Epics[0].Workers = nil
	apply(m, SnapshotMsg{Snapshot: snap})
	apply(m, key("enter"))

	if v := m.View(); !strings.Contains(v, "not spawned") {
		t.Errorf("detail view did not report the tick as unspawned:\n%s", v)
	}
}

// The load-bearing behaviour from the tick: events and reloads keep flowing
// while in detail mode, and the detail content reflects them — a closed tick
// shows its new status live without leaving the view.
func TestDetailReflectsSnapshotRefresh(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: detailSnapshot()})
	apply(m, key("enter"))

	if v := m.View(); !strings.Contains(v, "status: in_progress") {
		t.Fatalf("detail did not show the initial status:\n%s", v)
	}

	updated := detailSnapshot()
	updated.LoadedAt = fixedTime
	updated.Epics[0].Waves[0].Ticks[0].Status = tick.StatusClosed
	apply(m, SnapshotMsg{Snapshot: updated})

	if m.mode != modeDetail {
		t.Fatalf("a snapshot refresh kicked the model out of detail mode")
	}
	if v := m.View(); !strings.Contains(v, "status: closed") {
		t.Errorf("detail did not pick up the live status change while open:\n%s", v)
	}
}

// Overflow scrolling: j must advance without ever stepping past the point
// where the last line is already visible, and k must never go below zero.
func TestDetailScrollBounds(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	m.width, m.height = 60, 10

	snap := detailSnapshot()
	snap.Epics[0].Waves[0].Ticks[0].Description = strings.Repeat("word ", 200)
	apply(m, SnapshotMsg{Snapshot: snap})
	apply(m, key("enter"))

	if m.detailScroll != 0 {
		t.Fatalf("detail opened with a non-zero scroll: %d", m.detailScroll)
	}

	for i := 0; i < 500; i++ {
		apply(m, key("j"))
	}
	if v := m.View(); len(strings.Split(v, "\n")) > m.height {
		t.Errorf("detail view exceeded terminal height %d: %d lines", m.height, len(strings.Split(v, "\n")))
	}
	if m.detailScroll <= 0 {
		t.Fatalf("scrolling down never advanced past zero: %d", m.detailScroll)
	}
	maxScroll := m.detailScroll

	apply(m, key("j"))
	if m.detailScroll != maxScroll {
		t.Errorf("scroll advanced past the bottom of the content: %d -> %d", maxScroll, m.detailScroll)
	}

	for i := 0; i < 500; i++ {
		apply(m, key("k"))
	}
	if m.detailScroll != 0 {
		t.Errorf("scrolling up did not clamp at zero: %d", m.detailScroll)
	}
}

// A shorter viewport that fits the whole body must never let scroll advance
// at all — there's nothing to scroll to.
func TestDetailScrollNoopWhenContentFits(t *testing.T) {
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: detailSnapshot()})
	apply(m, key("enter"))

	apply(m, key("j"))
	if m.detailScroll != 0 {
		t.Errorf("scroll advanced on content that fits the viewport: %d", m.detailScroll)
	}
}

func TestQuitFromDetail(t *testing.T) {
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: detailSnapshot()})
	apply(m, key("enter"))

	cmd := apply(m, key("q"))
	if cmd == nil {
		t.Fatal("q produced no command from the detail view")
	}
	if msg := cmd(); msg == nil {
		t.Fatal("q command produced no message")
	} else if _, ok := msg.(tea.QuitMsg); !ok {
		t.Errorf("q produced %T, want tea.QuitMsg", msg)
	}
	if !m.Quitting() {
		t.Error("q did not mark the model quitting from the detail view")
	}
	if m.View() != "" {
		t.Errorf("quitting from detail left a frame behind")
	}
}

func TestFooterAdvertisesEnter(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})
	if v := m.View(); !strings.Contains(v, "enter details") {
		t.Errorf("board footer does not advertise enter:\n%s", v)
	}
}
