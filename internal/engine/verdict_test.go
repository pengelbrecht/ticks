package engine

import (
	"testing"

	"github.com/pengelbrecht/ticks/internal/ticks"
)

// TestVerdictProcessing tests verdict processing logic for all awaiting types.
// This validates the full verdict processing matrix from Task.ProcessVerdict.
func TestVerdictProcessing(t *testing.T) {
	tests := []struct {
		name       string
		awaiting   string
		verdict    string
		wantClosed bool
		wantBackTo string // "agent" or "closed"
	}{
		// Terminal states - approved closes
		{"work_approved", "work", "approved", true, "closed"},
		{"approval_approved", "approval", "approved", true, "closed"},
		{"review_approved", "review", "approved", true, "closed"},
		{"content_approved", "content", "approved", true, "closed"},

		// Terminal states - rejected back to agent
		{"approval_rejected", "approval", "rejected", false, "agent"},
		{"review_rejected", "review", "rejected", false, "agent"},
		{"content_rejected", "content", "rejected", false, "agent"},
		{"work_rejected", "work", "rejected", false, "agent"},

		// Non-terminal states - approved back to agent
		{"input_approved", "input", "approved", false, "agent"},
		{"escalation_approved", "escalation", "approved", false, "agent"},
		{"checkpoint_approved", "checkpoint", "approved", false, "agent"},

		// Non-terminal states - rejected closes
		{"input_rejected", "input", "rejected", true, "closed"},
		{"escalation_rejected", "escalation", "rejected", true, "closed"},
		// Checkpoint is special - NEVER closes, always back to agent
		{"checkpoint_rejected", "checkpoint", "rejected", false, "agent"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			awaiting := tt.awaiting
			verdict := tt.verdict

			task := &ticks.Task{
				ID:       "test-task",
				Status:   "open",
				Awaiting: &awaiting,
				Verdict:  &verdict,
			}

			result := task.ProcessVerdict()

			// Verify closure behavior
			if result.ShouldClose != tt.wantClosed {
				t.Errorf("ShouldClose = %v, want %v", result.ShouldClose, tt.wantClosed)
			}

			// Verify back-to behavior matches closure
			gotBackTo := "agent"
			if result.ShouldClose {
				gotBackTo = "closed"
			}
			if gotBackTo != tt.wantBackTo {
				t.Errorf("backTo = %q, want %q", gotBackTo, tt.wantBackTo)
			}

			// Verify task status reflects closure
			if tt.wantClosed && task.Status != "closed" {
				t.Errorf("task.Status = %q, want 'closed' when ShouldClose=true", task.Status)
			}
			if !tt.wantClosed && task.Status != "open" {
				t.Errorf("task.Status = %q, want 'open' when ShouldClose=false", task.Status)
			}

			// Verify transient fields are always cleared after processing
			if !result.TransientCleared {
				t.Error("TransientCleared should be true after processing")
			}
			if task.Awaiting != nil {
				t.Errorf("Awaiting should be nil after processing, got %v", task.Awaiting)
			}
			if task.Verdict != nil {
				t.Errorf("Verdict should be nil after processing, got %v", task.Verdict)
			}
			if task.Manual {
				t.Error("Manual should be false after processing")
			}
		})
	}
}

// TestVerdictProcessing_RequiresNotCleared tests that the requires field
// is NOT cleared by verdict processing for any awaiting/verdict combination.
func TestVerdictProcessing_RequiresNotCleared(t *testing.T) {
	requiresValues := []string{"approval", "review", "content"}
	awaitingTypes := []string{"work", "approval", "input", "review", "content", "escalation", "checkpoint"}
	verdicts := []string{"approved", "rejected"}

	for _, requires := range requiresValues {
		for _, awaiting := range awaitingTypes {
			for _, verdict := range verdicts {
				name := requires + "_requires_with_" + awaiting + "_" + verdict
				t.Run(name, func(t *testing.T) {
					req := requires
					await := awaiting
					verd := verdict

					task := &ticks.Task{
						ID:       "test-task",
						Status:   "open",
						Requires: &req,
						Awaiting: &await,
						Verdict:  &verd,
					}

					task.ProcessVerdict()

					// Requires must persist through verdict processing
					if task.Requires == nil {
						t.Fatalf("Requires should NOT be nil after verdict processing")
					}
					if *task.Requires != requires {
						t.Errorf("Requires = %q, want %q (should persist)", *task.Requires, requires)
					}
				})
			}
		}
	}
}

// TestVerdictProcessing_TransientFieldsCleared tests that transient fields
// (Awaiting, Verdict, Manual) are always cleared after verdict processing.
func TestVerdictProcessing_TransientFieldsCleared(t *testing.T) {
	awaitingTypes := []string{"work", "approval", "input", "review", "content", "escalation", "checkpoint", "unknown"}
	verdicts := []string{"approved", "rejected"}

	for _, awaiting := range awaitingTypes {
		for _, verdict := range verdicts {
			name := awaiting + "_" + verdict
			t.Run(name, func(t *testing.T) {
				await := awaiting
				verd := verdict

				task := &ticks.Task{
					ID:       "test-task",
					Status:   "open",
					Awaiting: &await,
					Verdict:  &verd,
					Manual:   true, // Also set Manual to verify it gets cleared
				}

				result := task.ProcessVerdict()

				// All transient fields must be cleared
				if !result.TransientCleared {
					t.Error("TransientCleared should be true")
				}
				if task.Awaiting != nil {
					t.Errorf("Awaiting should be nil, got %v", task.Awaiting)
				}
				if task.Verdict != nil {
					t.Errorf("Verdict should be nil, got %v", task.Verdict)
				}
				if task.Manual {
					t.Error("Manual should be false")
				}
			})
		}
	}
}

// TestVerdictProcessing_NoProcessingWhenMissingFields tests that nothing
// happens when either Awaiting or Verdict is nil.
func TestVerdictProcessing_NoProcessingWhenMissingFields(t *testing.T) {
	tests := []struct {
		name     string
		awaiting *string
		verdict  *string
	}{
		{"nil_awaiting", nil, strPtr("approved")},
		{"nil_verdict", strPtr("approval"), nil},
		{"both_nil", nil, nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			task := &ticks.Task{
				ID:       "test-task",
				Status:   "open",
				Awaiting: tt.awaiting,
				Verdict:  tt.verdict,
			}

			result := task.ProcessVerdict()

			// No processing should occur
			if result.ShouldClose {
				t.Error("ShouldClose should be false when fields are missing")
			}
			if result.TransientCleared {
				t.Error("TransientCleared should be false when no processing occurs")
			}
			if task.Status != "open" {
				t.Errorf("Status should remain 'open', got %q", task.Status)
			}
		})
	}
}

// TestVerdictProcessing_UnknownAwaitingType tests that unknown awaiting types
// are handled gracefully (never close, always back to agent).
func TestVerdictProcessing_UnknownAwaitingType(t *testing.T) {
	unknownTypes := []string{"unknown", "invalid", "custom", ""}

	for _, awaiting := range unknownTypes {
		for _, verdict := range []string{"approved", "rejected"} {
			name := "unknown_" + awaiting + "_" + verdict
			if awaiting == "" {
				name = "empty_awaiting_" + verdict
			}
			t.Run(name, func(t *testing.T) {
				await := awaiting
				verd := verdict

				task := &ticks.Task{
					ID:       "test-task",
					Status:   "open",
					Awaiting: &await,
					Verdict:  &verd,
				}

				result := task.ProcessVerdict()

				// Unknown types should never close
				if result.ShouldClose {
					t.Error("ShouldClose should be false for unknown awaiting type")
				}
				if task.Status != "open" {
					t.Errorf("Status should remain 'open' for unknown type, got %q", task.Status)
				}
				// But transient fields should still be cleared
				if !result.TransientCleared {
					t.Error("TransientCleared should be true even for unknown types")
				}
			})
		}
	}
}

// TestVerdictProcessing_RejectionCycle tests the complete rejection cycle:
// task has requires, gets rejected, requires persists for next completion.
func TestVerdictProcessing_RejectionCycle(t *testing.T) {
	// Scenario: Task with requires="approval" goes through rejection cycle
	requires := "approval"
	awaiting := "approval"
	verdict := "rejected"

	task := &ticks.Task{
		ID:       "rejection-cycle-task",
		Status:   "open",
		Requires: &requires,
		Awaiting: &awaiting,
		Verdict:  &verdict,
	}

	// Process rejection
	result := task.ProcessVerdict()

	// Verify rejected approval goes back to agent (not closed)
	if result.ShouldClose {
		t.Error("rejected approval should NOT close task")
	}
	if task.Status != "open" {
		t.Errorf("Status should be 'open' after rejection, got %q", task.Status)
	}

	// Verify requires persists for next completion attempt
	if task.Requires == nil || *task.Requires != "approval" {
		t.Errorf("Requires should persist as 'approval', got %v", task.Requires)
	}

	// Verify transient fields are cleared
	if task.Awaiting != nil || task.Verdict != nil {
		t.Error("Awaiting and Verdict should be cleared after processing")
	}

	// Now simulate agent completing again - would set awaiting=approval again
	// (This tests that the workflow can repeat)
	newAwaiting := "approval"
	newVerdict := "approved"
	task.Awaiting = &newAwaiting
	task.Verdict = &newVerdict

	result2 := task.ProcessVerdict()

	// This time it should close
	if !result2.ShouldClose {
		t.Error("approved approval should close task")
	}
	if task.Status != "closed" {
		t.Errorf("Status should be 'closed' after approval, got %q", task.Status)
	}
	// Requires still persists even after closure
	if task.Requires == nil || *task.Requires != "approval" {
		t.Errorf("Requires should persist even after closure, got %v", task.Requires)
	}
}

// Helper function to create string pointers
func strPtr(s string) *string {
	return &s
}
