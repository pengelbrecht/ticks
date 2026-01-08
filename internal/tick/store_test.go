package tick

import (
	"path/filepath"
	"testing"
	"time"
)

func TestStoreCRUD(t *testing.T) {
	root := filepath.Join(t.TempDir(), ".tick")
	store := NewStore(root)

	now := time.Date(2025, 1, 8, 10, 30, 0, 0, time.UTC)
	tick := Tick{
		ID:        "a1b",
		Title:     "Fix auth",
		Status:    StatusOpen,
		Priority:  2,
		Type:      TypeBug,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := store.Write(tick); err != nil {
		t.Fatalf("write tick: %v", err)
	}

	loaded, err := store.Read("a1b")
	if err != nil {
		t.Fatalf("read tick: %v", err)
	}
	if loaded.ID != tick.ID {
		t.Fatalf("expected id %s, got %s", tick.ID, loaded.ID)
	}

	list, err := store.List()
	if err != nil {
		t.Fatalf("list ticks: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 tick, got %d", len(list))
	}

	if err := store.Delete("a1b"); err != nil {
		t.Fatalf("delete tick: %v", err)
	}
}
