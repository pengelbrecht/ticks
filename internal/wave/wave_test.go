package wave

import (
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func ptr(s string) *string { return &s }

func makeTick(id string, opts ...func(*tick.Tick)) *tick.Tick {
	t := &tick.Tick{
		ID:     id,
		Title:  "Task " + id,
		Status: tick.StatusOpen,
		Type:   tick.TypeTask,
	}
	for _, o := range opts {
		o(t)
	}
	return t
}

func withBlockedBy(ids ...string) func(*tick.Tick) {
	return func(t *tick.Tick) { t.BlockedBy = ids }
}

func withStatus(s string) func(*tick.Tick) {
	return func(t *tick.Tick) { t.Status = s }
}

func withAwaiting(a string) func(*tick.Tick) {
	return func(t *tick.Tick) { t.Awaiting = ptr(a) }
}

func withPriority(p int) func(*tick.Tick) {
	return func(t *tick.Tick) { t.Priority = p }
}

func TestComputeEmpty(t *testing.T) {
	r := Compute(nil)
	if len(r.Waves) != 0 {
		t.Fatalf("expected 0 waves, got %d", len(r.Waves))
	}
	if len(r.CycleIDs) != 0 {
		t.Fatalf("expected no cycle, got %v", r.CycleIDs)
	}
}

func TestComputeAllClosed(t *testing.T) {
	tasks := []*tick.Tick{
		makeTick("a", withStatus(tick.StatusClosed)),
		makeTick("b", withStatus(tick.StatusClosed)),
	}
	r := Compute(tasks)
	if len(r.Waves) != 0 {
		t.Fatalf("expected 0 waves for all-closed tasks, got %d", len(r.Waves))
	}
}

func TestComputeParallel(t *testing.T) {
	tasks := []*tick.Tick{
		makeTick("a"),
		makeTick("b"),
		makeTick("c"),
	}
	r := Compute(tasks)
	if len(r.Waves) != 1 {
		t.Fatalf("expected 1 wave, got %d", len(r.Waves))
	}
	if len(r.Waves[0].Tasks) != 3 {
		t.Fatalf("expected 3 tasks in wave 1, got %d", len(r.Waves[0].Tasks))
	}
	if r.Waves[0].Number != 1 {
		t.Fatalf("expected wave number 1, got %d", r.Waves[0].Number)
	}
	if r.MaxWidth() != 3 {
		t.Fatalf("expected max width 3, got %d", r.MaxWidth())
	}
}

func TestComputeLinear(t *testing.T) {
	// A -> B -> C (3 waves)
	tasks := []*tick.Tick{
		makeTick("a"),
		makeTick("b", withBlockedBy("a")),
		makeTick("c", withBlockedBy("b")),
	}
	r := Compute(tasks)
	if len(r.Waves) != 3 {
		t.Fatalf("expected 3 waves, got %d", len(r.Waves))
	}
	if r.Waves[0].Tasks[0].ID != "a" {
		t.Fatalf("wave 1 should contain a, got %s", r.Waves[0].Tasks[0].ID)
	}
	if r.Waves[1].Tasks[0].ID != "b" {
		t.Fatalf("wave 2 should contain b, got %s", r.Waves[1].Tasks[0].ID)
	}
	if r.Waves[2].Tasks[0].ID != "c" {
		t.Fatalf("wave 3 should contain c, got %s", r.Waves[2].Tasks[0].ID)
	}
}

func TestComputeDiamond(t *testing.T) {
	// A -> B, A -> C, B+C -> D  = 3 waves
	tasks := []*tick.Tick{
		makeTick("a"),
		makeTick("b", withBlockedBy("a")),
		makeTick("c", withBlockedBy("a")),
		makeTick("d", withBlockedBy("b", "c")),
	}
	r := Compute(tasks)
	if len(r.Waves) != 3 {
		t.Fatalf("expected 3 waves, got %d", len(r.Waves))
	}
	if len(r.Waves[0].Tasks) != 1 || r.Waves[0].Tasks[0].ID != "a" {
		t.Fatal("wave 1 should be [a]")
	}
	if len(r.Waves[1].Tasks) != 2 {
		t.Fatalf("wave 2 should have 2 tasks, got %d", len(r.Waves[1].Tasks))
	}
	if len(r.Waves[2].Tasks) != 1 || r.Waves[2].Tasks[0].ID != "d" {
		t.Fatal("wave 3 should be [d]")
	}
}

func TestComputeCycle(t *testing.T) {
	// A -> B -> A (cycle)
	tasks := []*tick.Tick{
		makeTick("a", withBlockedBy("b")),
		makeTick("b", withBlockedBy("a")),
	}
	r := Compute(tasks)
	if len(r.CycleIDs) != 2 {
		t.Fatalf("expected 2 cycle IDs, got %d: %v", len(r.CycleIDs), r.CycleIDs)
	}
	if len(r.Waves) != 0 {
		t.Fatalf("expected 0 waves with cycle, got %d", len(r.Waves))
	}
}

func TestComputeExcludesAwaiting(t *testing.T) {
	tasks := []*tick.Tick{
		makeTick("a"),
		makeTick("b", withAwaiting(tick.AwaitingApproval)),
		makeTick("c"),
	}
	r := Compute(tasks)
	if len(r.Waves) != 1 {
		t.Fatalf("expected 1 wave, got %d", len(r.Waves))
	}
	if len(r.Waves[0].Tasks) != 2 {
		t.Fatalf("expected 2 tasks (excluding awaiting), got %d", len(r.Waves[0].Tasks))
	}
}

func TestComputeExcludesManual(t *testing.T) {
	tasks := []*tick.Tick{
		makeTick("a"),
		{ID: "b", Title: "Manual", Status: tick.StatusOpen, Type: tick.TypeTask, Manual: true},
		makeTick("c"),
	}
	r := Compute(tasks)
	if len(r.Waves) != 1 {
		t.Fatalf("expected 1 wave, got %d", len(r.Waves))
	}
	if len(r.Waves[0].Tasks) != 2 {
		t.Fatalf("expected 2 tasks (excluding manual), got %d", len(r.Waves[0].Tasks))
	}
}

func TestComputeIgnoresClosedBlockers(t *testing.T) {
	// B blocked by A, but A is closed -> B should be in wave 1
	tasks := []*tick.Tick{
		makeTick("a", withStatus(tick.StatusClosed)),
		makeTick("b", withBlockedBy("a")),
	}
	r := Compute(tasks)
	if len(r.Waves) != 1 {
		t.Fatalf("expected 1 wave (closed blocker ignored), got %d", len(r.Waves))
	}
	if r.Waves[0].Tasks[0].ID != "b" {
		t.Fatalf("expected b in wave 1, got %s", r.Waves[0].Tasks[0].ID)
	}
}

func TestComputeIgnoresExternalBlockers(t *testing.T) {
	// B blocked by "ext" which is not in the task set -> should be wave 1
	tasks := []*tick.Tick{
		makeTick("a"),
		makeTick("b", withBlockedBy("ext")),
	}
	r := Compute(tasks)
	if len(r.Waves) != 1 {
		t.Fatalf("expected 1 wave (external blocker ignored), got %d", len(r.Waves))
	}
	if len(r.Waves[0].Tasks) != 2 {
		t.Fatalf("expected 2 tasks in wave 1, got %d", len(r.Waves[0].Tasks))
	}
}

func TestComputePrioritySorting(t *testing.T) {
	tasks := []*tick.Tick{
		makeTick("c", withPriority(3)),
		makeTick("a", withPriority(1)),
		makeTick("b", withPriority(2)),
	}
	r := Compute(tasks)
	if r.Waves[0].Tasks[0].ID != "a" || r.Waves[0].Tasks[1].ID != "b" || r.Waves[0].Tasks[2].ID != "c" {
		ids := []string{r.Waves[0].Tasks[0].ID, r.Waves[0].Tasks[1].ID, r.Waves[0].Tasks[2].ID}
		t.Fatalf("expected [a b c] order by priority, got %v", ids)
	}
}

func TestMaxWidthEmpty(t *testing.T) {
	r := Result{}
	if r.MaxWidth() != 0 {
		t.Fatalf("expected 0 max width for empty result, got %d", r.MaxWidth())
	}
}

