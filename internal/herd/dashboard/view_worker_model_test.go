package dashboard

import (
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// The worker row shows the RESOLVED model beside the kind. "claude" alone does
// not say whether that worker is a haiku or an opus, which is the whole point
// of tier routing — and after a cross-vendor tier the kind is the only thing
// that changes, so the model is what an operator actually needs to see.
func TestWorkerLineShowsResolvedModel(t *testing.T) {
	pinProfile(t)
	m := testModel(t)

	line := m.workerLine(WorkerRow{
		Tick:   "a1b",
		Kind:   "claude",
		Model:  "sonnet",
		PaneID: "%1",
		Branch: "tick/a1b",
		Status: client.StatusWorking,
	})

	if !strings.Contains(line, "claude") {
		t.Errorf("worker line lost the kind: %q", line)
	}
	if !strings.Contains(line, "sonnet") {
		t.Errorf("worker line missing the resolved model: %q", line)
	}
	if strings.Index(line, "claude") > strings.Index(line, "sonnet") {
		t.Errorf("model should follow the kind, not precede it: %q", line)
	}
}

// An empty Model means "the kind's own default", never a substituted value
// (see state.Manifest). Render the same em dash the detail view uses rather
// than inventing a model name or leaving the column blank.
func TestWorkerLineRendersDefaultModelAsEmDash(t *testing.T) {
	pinProfile(t)
	m := testModel(t)

	line := m.workerLine(WorkerRow{
		Tick:   "e5f",
		Kind:   "claude",
		PaneID: "%3",
		Branch: "tick/e5f",
		Status: client.StatusIdle,
	})

	if !strings.Contains(line, "—") {
		t.Errorf("default model should render as an em dash: %q", line)
	}
}

// A long model id must not push the branch off the row or break the column
// alignment the padded layout depends on.
func TestWorkerLineKeepsColumnsAlignedAcrossModelWidths(t *testing.T) {
	pinProfile(t)
	m := testModel(t)

	short := m.workerLine(WorkerRow{Tick: "a1b", Kind: "claude", Model: "haiku", PaneID: "%1", Branch: "tick/a1b", Status: client.StatusIdle})
	long := m.workerLine(WorkerRow{Tick: "c3d", Kind: "codex", Model: "gpt-5.6-luna", PaneID: "%2", Branch: "tick/c3d", Status: client.StatusIdle})

	if strings.Index(short, "tick/a1b") != strings.Index(long, "tick/c3d") {
		t.Errorf("branch column misaligned across model widths:\n%q\n%q", short, long)
	}
}

// The worker row carries ONE duration: how long the worker has been alive.
// The status column already names the status, so the timer must not repeat it,
// and the branch is the conventional prefix + tick id, which the first column
// already shows. Both survive in the detail view, which has room for them.
func TestWorkerLineShowsOneAgeTimerAndNoBranch(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	spawned := fixedTime.Add(-9*time.Minute - time.Second)

	line := m.workerLine(WorkerRow{
		Tick:      "a0p",
		Kind:      "claude",
		Model:     "sonnet",
		PaneID:    "w8Y:p1",
		Branch:    "tick/a0p",
		Status:    client.StatusWorking,
		CreatedAt: spawned.Format(state.TimeLayout),
	})

	if strings.Contains(line, "tick/a0p") {
		t.Errorf("worker row still repeats the branch: %q", line)
	}
	if strings.Count(line, "working") != 1 {
		t.Errorf("status word appears more than once: %q", line)
	}
	if strings.Contains(line, "age ") {
		t.Errorf("single timer should not be labelled: %q", line)
	}
	if !strings.Contains(line, "9m01s") {
		t.Errorf("worker row missing the elapsed timer: %q", line)
	}
}

// A worker whose manifest has no parseable spawn time renders without a timer
// rather than a zero or a bogus duration.
func TestWorkerLineOmitsTimerWithoutSpawnTime(t *testing.T) {
	pinProfile(t)
	m := testModel(t)

	line := m.workerLine(WorkerRow{Tick: "a0p", Kind: "claude", PaneID: "%1", Status: client.StatusIdle})

	if strings.Contains(line, "0s") {
		t.Errorf("unparseable spawn time produced a timer: %q", line)
	}
}

// The detail view keeps the fuller picture the row gave up: the branch, and
// time-in-current-status alongside the age.
func TestDetailKeepsBranchAndStatusTimer(t *testing.T) {
	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: detailSnapshot()})
	apply(m, key("j"))
	apply(m, key("enter"))

	view := m.View()
	if !strings.Contains(view, "tick/m05") {
		t.Errorf("detail view lost the branch:\n%s", view)
	}
	if !strings.Contains(view, "age ") {
		t.Errorf("detail view lost the labelled age timer:\n%s", view)
	}
}
