package dashboard

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/client"
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
