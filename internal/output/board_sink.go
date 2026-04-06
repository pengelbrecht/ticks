package output

import (
	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/runrecord"
	"github.com/pengelbrecht/ticks/internal/tickboard/server"
)

// BoardSinkAdapter bridges the BoardSink interface to the board server and run record store.
type BoardSinkAdapter struct {
	server *server.Server
	store  *runrecord.Store
}

// NewBoardSink creates a BoardSinkAdapter wrapping the given server and store.
func NewBoardSink(srv *server.Server, store *runrecord.Store) *BoardSinkAdapter {
	return &BoardSinkAdapter{server: srv, store: store}
}

// BroadcastRunEvent delegates to the server's BroadcastRunStreamEvent.
func (a *BoardSinkAdapter) BroadcastRunEvent(epicID string, eventType string, data any) {
	if a.server != nil {
		a.server.BroadcastRunStreamEvent(epicID, eventType, data)
	}
}

// WriteEpicStatus delegates to the run record store.
// The status parameter must be a *runrecord.EpicStatus.
func (a *BoardSinkAdapter) WriteEpicStatus(epicID string, status any) error {
	if a.store == nil {
		return nil
	}
	s, ok := status.(*runrecord.EpicStatus)
	if !ok {
		return nil
	}
	return a.store.WriteEpicStatus(epicID, s)
}

// WriteLiveRecord delegates to the run record store.
// The snap parameter must be an agent.AgentStateSnapshot.
func (a *BoardSinkAdapter) WriteLiveRecord(tickID string, snap any) error {
	if a.store == nil {
		return nil
	}
	s, ok := snap.(agent.AgentStateSnapshot)
	if !ok {
		return nil
	}
	return a.store.WriteLive(tickID, s)
}
