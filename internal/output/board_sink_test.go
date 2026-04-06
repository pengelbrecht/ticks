package output

import (
	"testing"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/runrecord"
)

// Compile-time check that BoardSinkAdapter implements BoardSink.
var _ BoardSink = (*BoardSinkAdapter)(nil)

func TestBoardSinkAdapter_BroadcastRunEvent_NilServer(t *testing.T) {
	a := NewBoardSink(nil, nil)
	// Should not panic with nil server.
	a.BroadcastRunEvent("epic-1", "test_event", map[string]any{"key": "val"})
}

func TestBoardSinkAdapter_WriteEpicStatus_NilStore(t *testing.T) {
	a := NewBoardSink(nil, nil)
	err := a.WriteEpicStatus("epic-1", &runrecord.EpicStatus{Status: "running"})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}

func TestBoardSinkAdapter_WriteEpicStatus_WrongType(t *testing.T) {
	store := runrecord.NewStore(t.TempDir())
	a := NewBoardSink(nil, store)
	// Passing wrong type should return nil (no-op), not panic.
	err := a.WriteEpicStatus("epic-1", "not-a-status")
	if err != nil {
		t.Fatalf("expected nil error for wrong type, got %v", err)
	}
}

func TestBoardSinkAdapter_WriteEpicStatus_Delegates(t *testing.T) {
	dir := t.TempDir()
	store := runrecord.NewStore(dir)
	a := NewBoardSink(nil, store)

	status := &runrecord.EpicStatus{
		EpicID:  "epic-1",
		Status:  "running",
		Message: "test",
	}
	err := a.WriteEpicStatus("epic-1", status)
	if err != nil {
		t.Fatalf("WriteEpicStatus returned error: %v", err)
	}
}

func TestBoardSinkAdapter_WriteLiveRecord_NilStore(t *testing.T) {
	a := NewBoardSink(nil, nil)
	err := a.WriteLiveRecord("tick-1", agent.AgentStateSnapshot{})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}

func TestBoardSinkAdapter_WriteLiveRecord_WrongType(t *testing.T) {
	store := runrecord.NewStore(t.TempDir())
	a := NewBoardSink(nil, store)
	err := a.WriteLiveRecord("tick-1", "not-a-snapshot")
	if err != nil {
		t.Fatalf("expected nil error for wrong type, got %v", err)
	}
}

func TestBoardSinkAdapter_WriteLiveRecord_Delegates(t *testing.T) {
	dir := t.TempDir()
	store := runrecord.NewStore(dir)
	a := NewBoardSink(nil, store)

	snap := agent.AgentStateSnapshot{
		Status: agent.StatusStarting,
	}
	err := a.WriteLiveRecord("tick-1", snap)
	if err != nil {
		t.Fatalf("WriteLiveRecord returned error: %v", err)
	}
}
