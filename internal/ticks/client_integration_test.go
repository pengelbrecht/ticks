//go:build integration

package ticks

import (
	"testing"
)

// TestClientIntegration tests the ticks client against the real tk CLI.
// Run with: go test -tags=integration ./internal/ticks/...
func TestClientIntegration(t *testing.T) {
	c := NewClient()

	// Test GetEpic
	t.Run("GetEpic", func(t *testing.T) {
		epic, err := c.GetEpic("cv5")
		if err != nil {
			t.Fatalf("GetEpic failed: %v", err)
		}
		if epic.ID != "cv5" {
			t.Errorf("expected ID 'cv5', got %q", epic.ID)
		}
		if epic.Type != "epic" {
			t.Errorf("expected Type 'epic', got %q", epic.Type)
		}
	})

	// Test NextTask
	t.Run("NextTask", func(t *testing.T) {
		task, err := c.NextTask("cv5")
		if err != nil {
			t.Fatalf("NextTask failed: %v", err)
		}
		// Task may or may not exist depending on state
		if task != nil {
			if task.Parent != "cv5" {
				t.Errorf("expected task Parent 'cv5', got %q", task.Parent)
			}
		}
	})

	// Test GetNotes
	t.Run("GetNotes", func(t *testing.T) {
		notes, err := c.GetNotes("cv5")
		if err != nil {
			t.Fatalf("GetNotes failed: %v", err)
		}
		// Notes exist from previous iterations
		if len(notes) == 0 {
			t.Log("No notes found (this is OK if epic has no notes)")
		}
	})
}
