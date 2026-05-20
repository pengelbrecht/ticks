package recovery

import (
	"github.com/pengelbrecht/ticks/internal/tick"
)

// TickStoreAdapter wraps tick.Store to implement TickWriter.
type TickStoreAdapter struct {
	store *tick.Store
}

// NewTickStoreAdapter creates an adapter around the given tick store.
func NewTickStoreAdapter(s *tick.Store) *TickStoreAdapter {
	return &TickStoreAdapter{store: s}
}

func (a *TickStoreAdapter) Read(id string) (tick.Tick, error) {
	return a.store.Read(id)
}

func (a *TickStoreAdapter) Write(t tick.Tick) error {
	return a.store.WriteAs(t, "recovery")
}

func (a *TickStoreAdapter) LogActivity(tickID, action, actor, epic string, data map[string]interface{}) error {
	return a.store.LogActivity(tickID, action, actor, epic, data)
}
