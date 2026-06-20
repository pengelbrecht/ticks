package query

import (
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// mk builds a minimal tick with the given id, type, and parent.
func mk(id, typ, parent string) tick.Tick {
	return tick.Tick{ID: id, Type: typ, Parent: parent}
}

func TestRole_LeafTask(t *testing.T) {
	// A leaf, not marked epic -> atomic work.
	ticks := []tick.Tick{mk("t1", tick.TypeTask, "")}
	idx := BuildChildIndex(ticks)

	if IsContainer(ticks[0], idx) {
		t.Fatalf("leaf task should not be a container")
	}
	if got := Role(ticks[0], idx); got != RoleTick {
		t.Fatalf("Role = %q, want %q", got, RoleTick)
	}
}

func TestRole_EmptyEpic(t *testing.T) {
	// A leaf marked type:epic -> empty epic (needs planning).
	ticks := []tick.Tick{mk("e1", tick.TypeEpic, "")}
	idx := BuildChildIndex(ticks)

	if IsContainer(ticks[0], idx) {
		t.Fatalf("childless epic should not be a container")
	}
	if got := Role(ticks[0], idx); got != RoleEmptyEpic {
		t.Fatalf("Role = %q, want %q", got, RoleEmptyEpic)
	}
}

func TestRole_EpicWithChildren(t *testing.T) {
	// A container marked type:epic -> epic (run as a unit).
	ticks := []tick.Tick{
		mk("e1", tick.TypeEpic, ""),
		mk("c1", tick.TypeTask, "e1"),
		mk("c2", tick.TypeBug, "e1"),
	}
	idx := BuildChildIndex(ticks)
	epic := ticks[0]

	if !IsContainer(epic, idx) {
		t.Fatalf("epic with children should be a container")
	}
	if got := Role(epic, idx); got != RoleEpic {
		t.Fatalf("Role = %q, want %q", got, RoleEpic)
	}
}

func TestRole_Bucket(t *testing.T) {
	// A container NOT marked epic whose children are all leaves -> bucket.
	ticks := []tick.Tick{
		mk("b1", tick.TypeTask, ""), // plain container, no epic marker
		mk("c1", tick.TypeBug, "b1"),
		mk("c2", tick.TypeBug, "b1"),
	}
	idx := BuildChildIndex(ticks)
	bucket := ticks[0]

	if !IsContainer(bucket, idx) {
		t.Fatalf("bucket should be a container")
	}
	if got := Role(bucket, idx); got != RoleBucket {
		t.Fatalf("Role = %q, want %q", got, RoleBucket)
	}
}

func TestRole_Project(t *testing.T) {
	// A container NOT marked epic with a child that is itself a container ->
	// project (checkpoint boundary). The child here is an epic-with-children.
	ticks := []tick.Tick{
		mk("p1", tick.TypeTask, ""),    // project: plain container
		mk("e1", tick.TypeEpic, "p1"),  // child container (an epic)
		mk("gc1", tick.TypeTask, "e1"), // grandchild leaf
	}
	idx := BuildChildIndex(ticks)
	project := ticks[0]

	if got := Role(project, idx); got != RoleProject {
		t.Fatalf("Role = %q, want %q", got, RoleProject)
	}
	// The child container should classify as an epic, not as part of the project.
	if got := Role(ticks[1], idx); got != RoleEpic {
		t.Fatalf("child Role = %q, want %q", got, RoleEpic)
	}
}

func TestRole_ProjectWithBucketChild(t *testing.T) {
	// A project whose nested container is itself a plain bucket (not an epic):
	// container-ness, not the epic marker, makes the parent a project.
	ticks := []tick.Tick{
		mk("p1", tick.TypeTask, ""),     // project
		mk("b1", tick.TypeTask, "p1"),   // child bucket (plain container)
		mk("leaf", tick.TypeBug, "b1"),  // grandchild leaf
		mk("loose", tick.TypeTask, "p1"), // a loose leaf directly under the project
	}
	idx := BuildChildIndex(ticks)

	if got := Role(ticks[0], idx); got != RoleProject {
		t.Fatalf("p1 Role = %q, want %q", got, RoleProject)
	}
	if got := Role(ticks[1], idx); got != RoleBucket {
		t.Fatalf("b1 Role = %q, want %q", got, RoleBucket)
	}
}

func TestBuildChildIndex(t *testing.T) {
	ticks := []tick.Tick{
		mk("a", tick.TypeTask, ""),
		mk("b", tick.TypeTask, "a"),
		mk("c", tick.TypeTask, "a"),
		mk("d", tick.TypeTask, "b"),
	}
	idx := BuildChildIndex(ticks)

	if len(idx["a"]) != 2 {
		t.Fatalf("a should have 2 children, got %v", idx["a"])
	}
	if len(idx["b"]) != 1 {
		t.Fatalf("b should have 1 child, got %v", idx["b"])
	}
	if _, ok := idx["d"]; ok {
		t.Fatalf("leaf d should not appear as a parent key")
	}
	if _, ok := idx[""]; ok {
		t.Fatalf("empty parent should never be indexed")
	}
}
