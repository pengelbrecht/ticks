package query

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func TestSortBySoftOrderPriorityCreatedAt(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	later := now.Add(time.Minute)

	mk := func(id string, priority int, createdAt time.Time, after ...string) tick.Tick {
		return tick.Tick{
			ID:        id,
			Status:    tick.StatusOpen,
			Priority:  priority,
			After:     after,
			CreatedAt: createdAt,
			UpdatedAt: createdAt,
		}
	}

	t.Run("open after-target sorts soft-deferred tick last", func(t *testing.T) {
		open := mk("dep", 2, now)
		t1 := mk("t1", 2, now, "dep") // soft-deferred (dep is open)
		t2 := mk("t2", 2, later)      // created later, but not deferred
		all := []tick.Tick{open, t1, t2}

		ticks := []tick.Tick{t1, t2}
		SortBySoftOrderPriorityCreatedAt(ticks, all)
		if ticks[0].ID != "t2" || ticks[1].ID != "t1" {
			t.Fatalf("expected [t2, t1], got %v", ids(ticks))
		}
	})

	t.Run("closed after-target is not soft-deferred", func(t *testing.T) {
		closed := mk("dep", 2, now)
		closed.Status = tick.StatusClosed
		t1 := mk("t1", 2, now, "dep") // not deferred (dep is closed)
		t2 := mk("t2", 2, later)
		all := []tick.Tick{closed, t1, t2}

		ticks := []tick.Tick{t2, t1}
		SortBySoftOrderPriorityCreatedAt(ticks, all)
		if ticks[0].ID != "t1" || ticks[1].ID != "t2" {
			t.Fatalf("expected plain created_at order [t1, t2], got %v", ids(ticks))
		}
	})

	t.Run("missing after-target treated as closed", func(t *testing.T) {
		t1 := mk("t1", 2, now, "gone") // target absent from store -> not deferred
		t2 := mk("t2", 2, later)
		all := []tick.Tick{t1, t2}

		ticks := []tick.Tick{t2, t1}
		SortBySoftOrderPriorityCreatedAt(ticks, all)
		if ticks[0].ID != "t1" || ticks[1].ID != "t2" {
			t.Fatalf("expected plain created_at order [t1, t2], got %v", ids(ticks))
		}
	})

	t.Run("soft-deferred flag beats priority", func(t *testing.T) {
		open := mk("dep", 2, now)
		t1 := mk("t1", 0, now, "dep") // higher priority but soft-deferred
		t2 := mk("t2", 3, later)      // lower priority, undeferred
		all := []tick.Tick{open, t1, t2}

		ticks := []tick.Tick{t1, t2}
		SortBySoftOrderPriorityCreatedAt(ticks, all)
		if ticks[0].ID != "t2" || ticks[1].ID != "t1" {
			t.Fatalf("expected undeferred t2 first, got %v", ids(ticks))
		}
	})

	t.Run("one open target among closed targets still defers", func(t *testing.T) {
		closed := mk("c", 2, now)
		closed.Status = tick.StatusClosed
		open := mk("o", 2, now)
		t1 := mk("t1", 2, now, "c", "o") // one target still open -> deferred
		t2 := mk("t2", 2, later)
		all := []tick.Tick{closed, open, t1, t2}

		ticks := []tick.Tick{t1, t2}
		SortBySoftOrderPriorityCreatedAt(ticks, all)
		if ticks[0].ID != "t2" || ticks[1].ID != "t1" {
			t.Fatalf("expected [t2, t1], got %v", ids(ticks))
		}
	})

	t.Run("in_progress still sorts first (resume incomplete work)", func(t *testing.T) {
		open := mk("dep", 2, now)
		t1 := mk("t1", 2, now, "dep") // in_progress and soft-deferred
		t1.Status = tick.StatusInProgress
		t2 := mk("t2", 0, now) // open, undeferred, higher priority
		all := []tick.Tick{open, t1, t2}

		ticks := []tick.Tick{t2, t1}
		SortBySoftOrderPriorityCreatedAt(ticks, all)
		if ticks[0].ID != "t1" || ticks[1].ID != "t2" {
			t.Fatalf("expected in_progress t1 first, got %v", ids(ticks))
		}
	})

	t.Run("undeferred ties fall back to priority then created_at then id", func(t *testing.T) {
		a := mk("a", 1, later)
		b := mk("b", 0, later)
		c := mk("c", 1, now)
		d := mk("d", 1, now)
		all := []tick.Tick{a, b, c, d}

		ticks := []tick.Tick{a, d, c, b}
		SortBySoftOrderPriorityCreatedAt(ticks, all)
		want := []string{"b", "c", "d", "a"}
		got := ids(ticks)
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("expected %v, got %v", want, got)
			}
		}
	})
}

func ids(ticks []tick.Tick) []string {
	out := make([]string, len(ticks))
	for i, t := range ticks {
		out[i] = t.ID
	}
	return out
}
