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

func TestComputeExternalOpenBlockerWithLookup(t *testing.T) {
	// B blocked by "ext" which is open but outside the task set. With the
	// all-ticks lookup, B must not land in wave 1 (ext acts as a virtual
	// wave-1 node), while A stays in wave 1.
	tasks := []*tick.Tick{
		makeTick("a"),
		makeTick("b", withBlockedBy("ext")),
	}
	all := []tick.Tick{*tasks[0], *tasks[1], *makeTick("ext")}
	r := Compute(tasks, all)
	if len(r.Waves) != 2 {
		t.Fatalf("expected 2 waves, got %d", len(r.Waves))
	}
	if r.Waves[0].Number != 1 || len(r.Waves[0].Tasks) != 1 || r.Waves[0].Tasks[0].ID != "a" {
		t.Fatalf("wave 1 should be [a], got %+v", r.Waves[0])
	}
	if r.Waves[1].Number != 2 || len(r.Waves[1].Tasks) != 1 || r.Waves[1].Tasks[0].ID != "b" {
		t.Fatalf("wave 2 should be [b], got %+v", r.Waves[1])
	}
}

func TestComputeExternalClosedBlockerWithLookup(t *testing.T) {
	// B blocked by "ext" which is closed -> B is ready (wave 1).
	tasks := []*tick.Tick{
		makeTick("a"),
		makeTick("b", withBlockedBy("ext")),
	}
	all := []tick.Tick{*tasks[0], *tasks[1], *makeTick("ext", withStatus(tick.StatusClosed))}
	r := Compute(tasks, all)
	if len(r.Waves) != 1 {
		t.Fatalf("expected 1 wave (closed external blocker ignored), got %d", len(r.Waves))
	}
	if len(r.Waves[0].Tasks) != 2 {
		t.Fatalf("expected 2 tasks in wave 1, got %d", len(r.Waves[0].Tasks))
	}
}

func TestComputeMissingBlockerWithLookup(t *testing.T) {
	// B blocked by "gone" which is absent from the lookup -> treated as
	// closed (orphaned reference), so B is ready.
	tasks := []*tick.Tick{
		makeTick("b", withBlockedBy("gone")),
	}
	all := []tick.Tick{*tasks[0]}
	r := Compute(tasks, all)
	if len(r.Waves) != 1 || r.Waves[0].Number != 1 {
		t.Fatalf("expected b in wave 1 (missing blocker treated as closed), got %+v", r.Waves)
	}
}

func TestComputeOnlyExternalBlockedStartsAtWaveTwo(t *testing.T) {
	// The only task is blocked by an open external tick: no wave 1 exists,
	// the task lands in wave 2.
	tasks := []*tick.Tick{
		makeTick("b", withBlockedBy("ext")),
	}
	all := []tick.Tick{*tasks[0], *makeTick("ext")}
	r := Compute(tasks, all)
	if len(r.Waves) != 1 {
		t.Fatalf("expected 1 wave, got %d", len(r.Waves))
	}
	if r.Waves[0].Number != 2 {
		t.Fatalf("expected wave number 2 for externally blocked task, got %d", r.Waves[0].Number)
	}
	if len(r.CycleIDs) != 0 {
		t.Fatalf("expected no cycle, got %v", r.CycleIDs)
	}
}

func TestComputeExternalBlockerChainDepth(t *testing.T) {
	// a blocked by open ext, c blocked by a -> a in wave 2, c in wave 3.
	tasks := []*tick.Tick{
		makeTick("a", withBlockedBy("ext")),
		makeTick("c", withBlockedBy("a")),
	}
	all := []tick.Tick{*tasks[0], *tasks[1], *makeTick("ext")}
	r := Compute(tasks, all)
	if len(r.Waves) != 2 {
		t.Fatalf("expected 2 waves, got %d", len(r.Waves))
	}
	if r.Waves[0].Number != 2 || r.Waves[0].Tasks[0].ID != "a" {
		t.Fatalf("expected a in wave 2, got %+v", r.Waves[0])
	}
	if r.Waves[1].Number != 3 || r.Waves[1].Tasks[0].ID != "c" {
		t.Fatalf("expected c in wave 3, got %+v", r.Waves[1])
	}
}

func TestComputeAwaitingBlockerWithLookup(t *testing.T) {
	// B blocked by an awaiting-human task in the same set. The blocker is
	// excluded from the waves but is still open, so B must not be in wave 1.
	tasks := []*tick.Tick{
		makeTick("a", withAwaiting(tick.AwaitingApproval)),
		makeTick("b", withBlockedBy("a")),
	}
	all := []tick.Tick{*tasks[0], *tasks[1]}
	r := Compute(tasks, all)
	if len(r.Waves) != 1 {
		t.Fatalf("expected 1 wave, got %d", len(r.Waves))
	}
	if r.Waves[0].Number != 2 || r.Waves[0].Tasks[0].ID != "b" {
		t.Fatalf("expected b in wave 2 (blocked by open awaiting task), got %+v", r.Waves[0])
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
