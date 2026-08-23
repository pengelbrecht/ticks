package dashboard

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/operator"
)

func gate(id, tick string, resolution *operator.PendingResolution) operator.Pending {
	return operator.Pending{
		ID:         id,
		TickID:     tick,
		Kind:       operator.PendingGate,
		Question:   operator.Question{Text: "merge wave 6?"},
		CreatedAt:  at("2026-08-22T05:59:00Z"),
		Resolution: resolution,
	}
}

func boardModel(t *testing.T, snap Snapshot) *Model {
	t.Helper()
	model := New(context.Background(), Config{
		Source:   &fakeSource{},
		Endpoint: "https://factory.example.com",
		Now:      func() time.Time { return at("2026-08-22T06:00:30Z") },
	})
	model.Update(tea.WindowSizeMsg{Width: 120, Height: 40})
	model.Update(SnapshotMsg{Snapshot: snap})
	return model
}

func loaded() Snapshot {
	observation := frame()
	observation.Focus.Gates = []operator.Pending{
		gate("q1", "bmo", nil),
		gate("q2", "s7f", &operator.PendingResolution{AnsweredBy: operator.AnsweredByTelegram, AnsweredAt: at("2026-08-22T05:58:00Z")}),
	}
	return Snapshot{
		Observation: observation,
		Harness:     Harness{RunID: "run_a", Text: "dispatching wave 6\nworker t9s booted\n"},
		FocusRun:    "run_a",
		LoadedAt:    at("2026-08-22T06:00:00Z"),
	}
}

func press(model *Model, key string) {
	var msg tea.KeyMsg
	switch key {
	case "enter":
		msg = tea.KeyMsg{Type: tea.KeyEnter}
	case "esc":
		msg = tea.KeyMsg{Type: tea.KeyEsc}
	default:
		msg = tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(key)}
	}
	model.Update(msg)
}

func rowTexts(model *Model) []string {
	var out []string
	for _, r := range model.rows() {
		out = append(out, r.Text)
	}
	return out
}

func TestTheBoardListsRunsGatesAndRefusals(t *testing.T) {
	model := boardModel(t, loaded())
	body := strings.Join(rowTexts(model), "\n")

	for _, want := range []string{"run_a", "example-org/repo", "t9s", "running", "GATES", "REFUSALS", "lease_held_by"} {
		if !strings.Contains(body, want) {
			t.Fatalf("the board does not mention %q:\n%s", want, body)
		}
	}
}

// Folding is the herd board's: a header row toggles, and an operator's choice
// survives the next refresh rather than being re-derived under the cursor.
func TestFoldingAHeaderHidesItsChildrenAndSurvivesARefresh(t *testing.T) {
	model := boardModel(t, loaded())
	before := len(model.rows())

	press(model, "enter") // the cursor starts on the first run header
	folded := len(model.rows())
	if folded >= before {
		t.Fatalf("folding a run must hide its lines: %d rows before, %d after", before, folded)
	}

	model.Update(SnapshotMsg{Snapshot: loaded()})
	if got := len(model.rows()); got != folded {
		t.Fatalf("a refresh re-derived the fold: %d rows, want %d", got, folded)
	}

	press(model, "enter")
	if got := len(model.rows()); got != before {
		t.Fatalf("unfolding must restore the lines: %d rows, want %d", got, before)
	}
}

func TestNavigationKeysMatchTheHerdBoard(t *testing.T) {
	model := boardModel(t, loaded())
	last := len(model.rows()) - 1

	press(model, "j")
	if model.cursor != 1 {
		t.Fatalf("j must move down, cursor %d", model.cursor)
	}
	press(model, "k")
	if model.cursor != 0 {
		t.Fatalf("k must move up, cursor %d", model.cursor)
	}
	press(model, "G")
	if model.cursor != last {
		t.Fatalf("G must jump to the last row, cursor %d of %d", model.cursor, last)
	}
	press(model, "g")
	if model.cursor != 0 {
		t.Fatalf("g must jump to the first row, cursor %d", model.cursor)
	}
	press(model, "q")
	if !model.Quitting() {
		t.Fatal("q must quit")
	}
}

func TestEnterOnARunLineOpensDetailAndEscCloses(t *testing.T) {
	model := boardModel(t, loaded())
	press(model, "j") // onto the run's first child line
	press(model, "enter")
	if model.mode != modeDetail {
		t.Fatal("enter on a run line must open the detail view")
	}
	detail := model.View()
	for _, want := range []string{"run_a", "boot", "dispatching wave 6"} {
		if !strings.Contains(detail, want) {
			t.Fatalf("the detail view does not show %q:\n%s", want, detail)
		}
	}
	press(model, "esc")
	if model.mode != modeBoard {
		t.Fatal("esc must close the detail view")
	}
	if model.Quitting() {
		t.Fatal("esc must close the detail view, not quit the board")
	}
}

// The whole point of the board: the harness tail follows the selected run, so
// the operator can see what the agent is doing without fetching R2 keys.
func TestMovingTheSelectionRetargetsTheHarnessTail(t *testing.T) {
	source := &fakeSource{
		observe: func(query ObserveQuery) (Observation, error) { return frame(), nil },
		harness: func(runID string, _ int) (Harness, error) { return Harness{RunID: runID}, nil },
	}
	model := New(context.Background(), Config{Source: source, Now: func() time.Time { return at("2026-08-22T06:00:30Z") }})
	model.Update(tea.WindowSizeMsg{Width: 120, Height: 40})
	model.Update(SnapshotMsg{Snapshot: loaded()})

	if model.FocusRun() != "run_a" {
		t.Fatalf("focus: %q", model.FocusRun())
	}
	// Fold the first run so the next row is the second run's header.
	press(model, "enter")
	press(model, "j")
	if model.FocusRun() != "run_old" {
		t.Fatalf("moving to another run must retarget the focus, got %q", model.FocusRun())
	}
	if _, cmd := model.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("r")}); cmd != nil {
		if msg := cmd(); msg != nil {
			if _, ok := msg.(SnapshotMsg); !ok {
				t.Fatalf("r must reload the board, got %T", msg)
			}
		}
	}
	if len(source.tails) == 0 || source.tails[len(source.tails)-1] != "run_old" {
		t.Fatalf("the tail read must follow the selection, reads: %v", source.tails)
	}
}

// The constraint the tick states outright: when the factory is unreachable the
// board keeps the last known state and says plainly that it is stale.
func TestAnUnreachableFactoryKeepsTheLastKnownStateAndSaysSo(t *testing.T) {
	model := boardModel(t, loaded())
	model.Update(SnapshotMsg{Err: errors.New("dial tcp: connection refused")})

	if !model.Stale() {
		t.Fatal("a failed read must mark the board stale")
	}
	if len(model.Snapshot().Runs) != 2 {
		t.Fatal("the last known runs must still be on the board")
	}
	view := model.View()
	if !strings.Contains(strings.ToUpper(view), "STALE") {
		t.Fatalf("the header must say the board is stale:\n%s", view)
	}
	if !strings.Contains(view, "connection refused") {
		t.Fatalf("the header must say why:\n%s", view)
	}
	// The age of what is being shown, not of the failed attempt.
	if !strings.Contains(view, "30s") {
		t.Fatalf("the header must age the last known state:\n%s", view)
	}

	model.Update(SnapshotMsg{Snapshot: loaded()})
	if model.Stale() {
		t.Fatal("a good read must clear the staleness")
	}
}

// A board opened while the factory is already down has nothing in memory —
// which is exactly the session an operator debugging a broken factory opens.
func TestAColdStartAgainstADeadFactoryShowsTheCachedFrame(t *testing.T) {
	cache := Cache{Path: t.TempDir() + "/board.json"}
	if err := cache.Save(loaded()); err != nil {
		t.Fatalf("Save: %v", err)
	}
	model := New(context.Background(), Config{
		Source: &fakeSource{observe: func(ObserveQuery) (Observation, error) {
			return Observation{}, errors.New("no route to host")
		}},
		Cache: cache,
		Now:   func() time.Time { return at("2026-08-22T06:00:30Z") },
	})
	model.Update(tea.WindowSizeMsg{Width: 120, Height: 40})
	model.Update(SnapshotMsg{Err: errors.New("no route to host")})

	if len(model.Snapshot().Runs) != 2 {
		t.Fatalf("the cached frame must be shown: %+v", model.Snapshot().Runs)
	}
	if !model.Stale() {
		t.Fatal("a cached frame is stale by construction")
	}
}

func TestCostsComeFromTelemetryAndAreShownOnTheRunRow(t *testing.T) {
	model := boardModel(t, loaded())
	model.Update(CostMsg{Costs: map[string]Cost{"run_a": {RunID: "run_a", USD: 2.5, Calls: 20}}, At: at("2026-08-22T06:00:20Z")})

	body := strings.Join(rowTexts(model), "\n")
	if !strings.Contains(body, "$2.50") {
		t.Fatalf("the run row must carry the telemetry cost:\n%s", body)
	}
	// A run with no telemetry read shows no cost rather than a free run.
	if strings.Contains(body, "$0.00") {
		t.Fatalf("an unread cost must not render as zero:\n%s", body)
	}
}

// Read-only is a property of the whole input surface, not of one handler: no
// key may do anything but move, fold, reload or quit.
func TestNoKeyCommandsTheFactory(t *testing.T) {
	source := &fakeSource{observe: func(ObserveQuery) (Observation, error) { return frame(), nil }}
	model := New(context.Background(), Config{Source: source, Now: time.Now})
	model.Update(tea.WindowSizeMsg{Width: 120, Height: 40})
	model.Update(SnapshotMsg{Snapshot: loaded()})

	for _, key := range strings.Split("abcdefhilmnopstuvwxyzABCDEFHIJKLMNOPQRSTUVWXYZ0123456789", "") {
		_, cmd := model.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(key)})
		if cmd == nil {
			continue
		}
		switch msg := cmd().(type) {
		case SnapshotMsg, CostMsg, nil:
		default:
			t.Fatalf("key %q produced %T — the board is read-only", key, msg)
		}
	}
}

// A gate belongs to the project, not to a run: a factory with nothing running
// can still have an operator's answer parked in front of it.
func TestGatesShowWithNoRunFocused(t *testing.T) {
	snap := loaded()
	snap.Focus = nil
	snap.Gates = []operator.Pending{gate("q9", "bmo", nil)}
	model := boardModel(t, snap)

	body := strings.Join(rowTexts(model), "\n")
	if !strings.Contains(body, "q9") || !strings.Contains(body, "GATES · 1 pending") {
		t.Fatalf("a project gate must show without a focused run:\n%s", body)
	}
}
