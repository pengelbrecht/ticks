package query

import (
	"fmt"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

func BenchmarkReady100(b *testing.B) {
	benchmarkReady(b, 100)
}

func BenchmarkReady500(b *testing.B) {
	benchmarkReady(b, 500)
}

func benchmarkReady(b *testing.B, n int) {
	items := make([]tick.Tick, 0, n)
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	for i := 0; i < n; i++ {
		items = append(items, tick.Tick{
			ID:        fmt.Sprintf("id%03d", i),
			Title:     "Benchmark",
			Status:    tick.StatusOpen,
			Priority:  i % 5,
			Type:      tick.TypeTask,
			Owner:     "bench",
			CreatedBy: "bench",
			CreatedAt: now,
			UpdatedAt: now,
		})
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ready := Ready(items)
		SortByPriorityCreatedAt(ready)
	}
}
