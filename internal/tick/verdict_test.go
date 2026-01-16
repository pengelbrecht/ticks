package tick

import (
	"testing"
	"time"
)

func TestProcessVerdict(t *testing.T) {
	tests := []struct {
		name         string
		awaiting     *string
		verdict      *string
		wantClosed   bool
		wantStatus   string
		wantAwaiting *string
		wantVerdict  *string
	}{
		// No-op cases
		{
			name:         "nil verdict and nil awaiting",
			awaiting:     nil,
			verdict:      nil,
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: nil,
			wantVerdict:  nil,
		},
		{
			name:         "nil verdict with awaiting",
			awaiting:     ptr(AwaitingApproval),
			verdict:      nil,
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: ptr(AwaitingApproval), // Not cleared when no verdict
			wantVerdict:  nil,
		},
		{
			name:         "verdict with nil awaiting",
			awaiting:     nil,
			verdict:      ptr(VerdictApproved),
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: nil,
			wantVerdict:  ptr(VerdictApproved), // Not cleared when no awaiting
		},

		// Terminal states - close on approved
		// Terminal states - close on approved (verdict preserved on close)
		{
			name:         "work approved closes",
			awaiting:     ptr(AwaitingWork),
			verdict:      ptr(VerdictApproved),
			wantClosed:   true,
			wantStatus:   StatusClosed,
			wantAwaiting: nil,
			wantVerdict:  ptr(VerdictApproved), // Preserved for audit trail
		},
		{
			name:         "work rejected does not close",
			awaiting:     ptr(AwaitingWork),
			verdict:      ptr(VerdictRejected),
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: nil,
			wantVerdict:  nil, // Cleared so agent can retry
		},
		{
			name:         "approval approved closes",
			awaiting:     ptr(AwaitingApproval),
			verdict:      ptr(VerdictApproved),
			wantClosed:   true,
			wantStatus:   StatusClosed,
			wantAwaiting: nil,
			wantVerdict:  ptr(VerdictApproved),
		},
		{
			name:         "approval rejected does not close",
			awaiting:     ptr(AwaitingApproval),
			verdict:      ptr(VerdictRejected),
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: nil,
			wantVerdict:  nil,
		},
		{
			name:         "review approved closes",
			awaiting:     ptr(AwaitingReview),
			verdict:      ptr(VerdictApproved),
			wantClosed:   true,
			wantStatus:   StatusClosed,
			wantAwaiting: nil,
			wantVerdict:  ptr(VerdictApproved),
		},
		{
			name:         "review rejected does not close",
			awaiting:     ptr(AwaitingReview),
			verdict:      ptr(VerdictRejected),
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: nil,
			wantVerdict:  nil,
		},
		{
			name:         "content approved closes",
			awaiting:     ptr(AwaitingContent),
			verdict:      ptr(VerdictApproved),
			wantClosed:   true,
			wantStatus:   StatusClosed,
			wantAwaiting: nil,
			wantVerdict:  ptr(VerdictApproved),
		},
		{
			name:         "content rejected does not close",
			awaiting:     ptr(AwaitingContent),
			verdict:      ptr(VerdictRejected),
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: nil,
			wantVerdict:  nil,
		},

		// Non-terminal states - close on rejected (verdict preserved on close)
		{
			name:         "input approved does not close",
			awaiting:     ptr(AwaitingInput),
			verdict:      ptr(VerdictApproved),
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: nil,
			wantVerdict:  nil, // Cleared so agent continues
		},
		{
			name:         "input rejected closes",
			awaiting:     ptr(AwaitingInput),
			verdict:      ptr(VerdictRejected),
			wantClosed:   true,
			wantStatus:   StatusClosed,
			wantAwaiting: nil,
			wantVerdict:  ptr(VerdictRejected), // Preserved for audit trail
		},
		{
			name:         "escalation approved does not close",
			awaiting:     ptr(AwaitingEscalation),
			verdict:      ptr(VerdictApproved),
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: nil,
			wantVerdict:  nil,
		},
		{
			name:         "escalation rejected closes",
			awaiting:     ptr(AwaitingEscalation),
			verdict:      ptr(VerdictRejected),
			wantClosed:   true,
			wantStatus:   StatusClosed,
			wantAwaiting: nil,
			wantVerdict:  ptr(VerdictRejected),
		},

		// Checkpoint - never closes (verdict always cleared)
		{
			name:         "checkpoint approved does not close",
			awaiting:     ptr(AwaitingCheckpoint),
			verdict:      ptr(VerdictApproved),
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: nil,
			wantVerdict:  nil,
		},
		{
			name:         "checkpoint rejected does not close",
			awaiting:     ptr(AwaitingCheckpoint),
			verdict:      ptr(VerdictRejected),
			wantClosed:   false,
			wantStatus:   StatusInProgress,
			wantAwaiting: nil,
			wantVerdict:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tick := &Tick{
				ID:        "test",
				Title:     "Test Tick",
				Status:    StatusInProgress,
				Priority:  2,
				Type:      TypeTask,
				Owner:     "agent",
				CreatedBy: "agent",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
				Awaiting:  tt.awaiting,
				Verdict:   tt.verdict,
			}

			closed, err := ProcessVerdict(tick)
			if err != nil {
				t.Fatalf("ProcessVerdict() error = %v", err)
			}

			if closed != tt.wantClosed {
				t.Errorf("ProcessVerdict() closed = %v, want %v", closed, tt.wantClosed)
			}

			if tick.Status != tt.wantStatus {
				t.Errorf("tick.Status = %v, want %v", tick.Status, tt.wantStatus)
			}

			if !ptrEqual(tick.Awaiting, tt.wantAwaiting) {
				t.Errorf("tick.Awaiting = %v, want %v", ptrStr(tick.Awaiting), ptrStr(tt.wantAwaiting))
			}

			if !ptrEqual(tick.Verdict, tt.wantVerdict) {
				t.Errorf("tick.Verdict = %v, want %v", ptrStr(tick.Verdict), ptrStr(tt.wantVerdict))
			}

			// If closed, ClosedAt should be set
			if closed && tick.ClosedAt == nil {
				t.Error("tick.ClosedAt should be set when closed")
			}
			if !closed && tick.ClosedAt != nil {
				t.Error("tick.ClosedAt should not be set when not closed")
			}
		})
	}
}

func TestProcessVerdictDoesNotReturnError(t *testing.T) {
	// ProcessVerdict currently never returns an error, but the signature
	// allows for future validation or other error conditions
	tick := &Tick{
		ID:        "test",
		Title:     "Test",
		Status:    StatusInProgress,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "agent",
		CreatedBy: "agent",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Awaiting:  ptr(AwaitingApproval),
		Verdict:   ptr(VerdictApproved),
	}

	_, err := ProcessVerdict(tick)
	if err != nil {
		t.Errorf("ProcessVerdict() should not return error, got: %v", err)
	}
}

func TestProcessVerdictClosedAtTimestamp(t *testing.T) {
	// Verify ClosedAt is set to a reasonable time when closing
	before := time.Now()

	tick := &Tick{
		ID:        "test",
		Title:     "Test",
		Status:    StatusInProgress,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "agent",
		CreatedBy: "agent",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Awaiting:  ptr(AwaitingApproval),
		Verdict:   ptr(VerdictApproved),
	}

	closed, _ := ProcessVerdict(tick)
	after := time.Now()

	if !closed {
		t.Fatal("expected tick to be closed")
	}
	if tick.ClosedAt == nil {
		t.Fatal("expected ClosedAt to be set")
	}
	if tick.ClosedAt.Before(before) || tick.ClosedAt.After(after) {
		t.Error("ClosedAt should be between before and after test execution")
	}
}

func TestProcessVerdictPreservesOtherFields(t *testing.T) {
	// Ensure ProcessVerdict doesn't modify fields it shouldn't
	now := time.Now()
	tick := &Tick{
		ID:          "test",
		Title:       "Test Title",
		Description: "Test description",
		Notes:       "Some notes",
		Status:      StatusInProgress,
		Priority:    3,
		Type:        TypeFeature,
		Owner:       "human@example.com",
		Labels:      []string{"important", "urgent"},
		BlockedBy:   []string{"abc", "def"},
		Parent:      "parent123",
		CreatedBy:   "creator@example.com",
		CreatedAt:   now.Add(-24 * time.Hour),
		UpdatedAt:   now.Add(-1 * time.Hour),
		Awaiting:    ptr(AwaitingApproval),
		Verdict:     ptr(VerdictApproved),
	}

	ProcessVerdict(tick)

	// Verify unchanged fields
	if tick.ID != "test" {
		t.Error("ID should not change")
	}
	if tick.Title != "Test Title" {
		t.Error("Title should not change")
	}
	if tick.Description != "Test description" {
		t.Error("Description should not change")
	}
	if tick.Notes != "Some notes" {
		t.Error("Notes should not change")
	}
	if tick.Priority != 3 {
		t.Error("Priority should not change")
	}
	if tick.Type != TypeFeature {
		t.Error("Type should not change")
	}
	if tick.Owner != "human@example.com" {
		t.Error("Owner should not change")
	}
	if len(tick.Labels) != 2 || tick.Labels[0] != "important" {
		t.Error("Labels should not change")
	}
	if len(tick.BlockedBy) != 2 || tick.BlockedBy[0] != "abc" {
		t.Error("BlockedBy should not change")
	}
	if tick.Parent != "parent123" {
		t.Error("Parent should not change")
	}
	if tick.CreatedBy != "creator@example.com" {
		t.Error("CreatedBy should not change")
	}
	if !tick.CreatedAt.Equal(now.Add(-24 * time.Hour)) {
		t.Error("CreatedAt should not change")
	}
	// Note: UpdatedAt is also not modified by ProcessVerdict (caller should update it)
}

func TestProcessVerdictWithDifferentInitialStatuses(t *testing.T) {
	// Test that ProcessVerdict works correctly from different initial statuses
	tests := []struct {
		name          string
		initialStatus string
		awaiting      string
		verdict       string
		wantClosed    bool
		wantStatus    string
	}{
		{
			name:          "from open status with approval approved",
			initialStatus: StatusOpen,
			awaiting:      AwaitingApproval,
			verdict:       VerdictApproved,
			wantClosed:    true,
			wantStatus:    StatusClosed,
		},
		{
			name:          "from open status with approval rejected",
			initialStatus: StatusOpen,
			awaiting:      AwaitingApproval,
			verdict:       VerdictRejected,
			wantClosed:    false,
			wantStatus:    StatusOpen, // Preserves original status
		},
		{
			name:          "from in_progress with checkpoint approved",
			initialStatus: StatusInProgress,
			awaiting:      AwaitingCheckpoint,
			verdict:       VerdictApproved,
			wantClosed:    false,
			wantStatus:    StatusInProgress,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tick := &Tick{
				ID:        "test",
				Title:     "Test",
				Status:    tt.initialStatus,
				Priority:  2,
				Type:      TypeTask,
				Owner:     "agent",
				CreatedBy: "agent",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
				Awaiting:  ptr(tt.awaiting),
				Verdict:   ptr(tt.verdict),
			}

			closed, _ := ProcessVerdict(tick)

			if closed != tt.wantClosed {
				t.Errorf("closed = %v, want %v", closed, tt.wantClosed)
			}
			if tick.Status != tt.wantStatus {
				t.Errorf("status = %v, want %v", tick.Status, tt.wantStatus)
			}
		})
	}
}

func TestProcessVerdictRequiresFieldNotAffected(t *testing.T) {
	// ProcessVerdict should not touch the Requires field
	requires := RequiresApproval
	tick := &Tick{
		ID:        "test",
		Title:     "Test",
		Status:    StatusInProgress,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "agent",
		CreatedBy: "agent",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Requires:  &requires,
		Awaiting:  ptr(AwaitingApproval),
		Verdict:   ptr(VerdictApproved),
	}

	ProcessVerdict(tick)

	if tick.Requires == nil || *tick.Requires != RequiresApproval {
		t.Error("Requires field should not be modified by ProcessVerdict")
	}
}

func TestProcessVerdictMatrix(t *testing.T) {
	// Comprehensive matrix test covering every awaiting+verdict combination
	// This serves as documentation of expected behavior
	matrix := []struct {
		awaiting      string
		verdictValue  string
		expectClosed  bool
		description   string
	}{
		// Terminal states: close on approved
		{AwaitingWork, VerdictApproved, true, "Human completed work successfully"},
		{AwaitingWork, VerdictRejected, false, "Human says work not done yet"},
		{AwaitingApproval, VerdictApproved, true, "Human approved the deliverable"},
		{AwaitingApproval, VerdictRejected, false, "Human rejected, needs more work"},
		{AwaitingReview, VerdictApproved, true, "Code review passed"},
		{AwaitingReview, VerdictRejected, false, "Code review failed, needs fixes"},
		{AwaitingContent, VerdictApproved, true, "Content approved"},
		{AwaitingContent, VerdictRejected, false, "Content needs revision"},

		// Non-terminal states: close on rejected
		{AwaitingInput, VerdictApproved, false, "Human provided input, continue work"},
		{AwaitingInput, VerdictRejected, true, "Human can't provide input, close"},
		{AwaitingEscalation, VerdictApproved, false, "Human gave direction, continue"},
		{AwaitingEscalation, VerdictRejected, true, "Human won't proceed, close"},

		// Checkpoint: never closes
		{AwaitingCheckpoint, VerdictApproved, false, "Checkpoint acknowledged"},
		{AwaitingCheckpoint, VerdictRejected, false, "Checkpoint acknowledged with concerns"},
	}

	for _, tc := range matrix {
		name := tc.awaiting + "_" + tc.verdictValue
		t.Run(name, func(t *testing.T) {
			tick := &Tick{
				ID:        "test",
				Title:     "Test",
				Status:    StatusInProgress,
				Priority:  2,
				Type:      TypeTask,
				Owner:     "agent",
				CreatedBy: "agent",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
				Awaiting:  ptr(tc.awaiting),
				Verdict:   ptr(tc.verdictValue),
			}

			closed, err := ProcessVerdict(tick)

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if closed != tc.expectClosed {
				t.Errorf("%s: closed=%v, want %v", tc.description, closed, tc.expectClosed)
			}
			// Verify awaiting always cleared
			if tick.Awaiting != nil {
				t.Error("Awaiting should be cleared")
			}
			// Verdict preserved on close, cleared otherwise
			if closed && tick.Verdict == nil {
				t.Error("Verdict should be preserved when closed")
			}
			if !closed && tick.Verdict != nil {
				t.Error("Verdict should be cleared when not closed")
			}
			// Verify status
			if closed && tick.Status != StatusClosed {
				t.Error("Status should be closed when closed=true")
			}
			if !closed && tick.Status == StatusClosed {
				t.Error("Status should not be closed when closed=false")
			}
			// Verify ClosedAt
			if closed && tick.ClosedAt == nil {
				t.Error("ClosedAt should be set when closed")
			}
			if !closed && tick.ClosedAt != nil {
				t.Error("ClosedAt should not be set when not closed")
			}
		})
	}
}

func TestVerdictProcessingWorkflow(t *testing.T) {
	// Integration test: Full workflow of HandleClose -> ProcessVerdict
	// Tests the interaction between requires field routing and verdict processing

	t.Run("requires_approval_full_cycle_approved", func(t *testing.T) {
		requires := RequiresApproval
		tick := &Tick{
			ID:        "test",
			Title:     "Test",
			Status:    StatusInProgress,
			Priority:  2,
			Type:      TypeTask,
			Owner:     "agent",
			Requires:  &requires,
			CreatedBy: "agent",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		// Step 1: Agent tries to close -> routes to human for approval
		routed := HandleClose(tick, "completed")
		if !routed {
			t.Fatal("expected routing to human")
		}
		if tick.Awaiting == nil || *tick.Awaiting != AwaitingApproval {
			t.Fatal("expected Awaiting=approval")
		}

		// Step 2: Human approves
		tick.Verdict = ptr(VerdictApproved)
		closed, _ := ProcessVerdict(tick)

		// Verify final state
		if !closed {
			t.Error("expected tick to close after approval")
		}
		if tick.Status != StatusClosed {
			t.Errorf("expected status=closed, got %s", tick.Status)
		}
		if tick.Awaiting != nil {
			t.Error("expected Awaiting to be cleared")
		}
		if tick.Verdict == nil || *tick.Verdict != VerdictApproved {
			t.Error("expected Verdict to be preserved on close")
		}
		// Requires persists even after close
		if tick.Requires == nil || *tick.Requires != RequiresApproval {
			t.Error("expected Requires to persist")
		}
	})

	t.Run("requires_approval_rejection_retry_cycle", func(t *testing.T) {
		requires := RequiresApproval
		tick := &Tick{
			ID:        "test",
			Title:     "Test",
			Status:    StatusInProgress,
			Priority:  2,
			Type:      TypeTask,
			Owner:     "agent",
			Requires:  &requires,
			CreatedBy: "agent",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		// Cycle 1: Route -> Reject
		HandleClose(tick, "first attempt")
		tick.Verdict = ptr(VerdictRejected)
		closed, _ := ProcessVerdict(tick)

		if closed {
			t.Fatal("should not close on rejection")
		}
		if tick.Status == StatusClosed {
			t.Fatal("status should remain in_progress")
		}

		// Cycle 2: Route again -> Approve
		routed := HandleClose(tick, "second attempt")
		if !routed {
			t.Fatal("expected second routing")
		}
		if tick.Awaiting == nil || *tick.Awaiting != AwaitingApproval {
			t.Fatal("expected Awaiting=approval on retry")
		}

		tick.Verdict = ptr(VerdictApproved)
		closed, _ = ProcessVerdict(tick)

		if !closed {
			t.Error("expected close on second approval")
		}
	})

	t.Run("requires_review_full_cycle", func(t *testing.T) {
		requires := RequiresReview
		tick := &Tick{
			ID:        "test",
			Title:     "Test",
			Status:    StatusInProgress,
			Priority:  2,
			Type:      TypeTask,
			Owner:     "agent",
			Requires:  &requires,
			CreatedBy: "agent",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		HandleClose(tick, "done")
		if tick.Awaiting == nil || *tick.Awaiting != AwaitingReview {
			t.Fatal("expected Awaiting=review")
		}

		tick.Verdict = ptr(VerdictApproved)
		closed, _ := ProcessVerdict(tick)

		if !closed {
			t.Error("expected close after review approval")
		}
	})

	t.Run("requires_content_rejection_closes_workflow", func(t *testing.T) {
		requires := RequiresContent
		tick := &Tick{
			ID:        "test",
			Title:     "Test",
			Status:    StatusInProgress,
			Priority:  2,
			Type:      TypeTask,
			Owner:     "agent",
			Requires:  &requires,
			CreatedBy: "agent",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		HandleClose(tick, "done")
		if tick.Awaiting == nil || *tick.Awaiting != AwaitingContent {
			t.Fatal("expected Awaiting=content")
		}

		// Rejection doesn't close for terminal awaiting types
		tick.Verdict = ptr(VerdictRejected)
		closed, _ := ProcessVerdict(tick)

		if closed {
			t.Error("content rejection should not close (back to agent for fixes)")
		}
	})
}

func TestProcessVerdictIdempotency(t *testing.T) {
	// Calling ProcessVerdict multiple times should be safe
	tick := &Tick{
		ID:        "test",
		Title:     "Test",
		Status:    StatusInProgress,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "agent",
		CreatedBy: "agent",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Awaiting:  ptr(AwaitingApproval),
		Verdict:   ptr(VerdictApproved),
	}

	// First call - should close
	closed1, _ := ProcessVerdict(tick)
	closedAt := tick.ClosedAt

	// Second call - no-op since awaiting/verdict are nil
	closed2, _ := ProcessVerdict(tick)

	if !closed1 {
		t.Error("first call should close")
	}
	if closed2 {
		t.Error("second call should not close (already processed)")
	}
	if tick.ClosedAt != closedAt {
		t.Error("ClosedAt should not change on second call")
	}
}

// Helper functions
func ptr(s string) *string {
	return &s
}

func ptrEqual(a, b *string) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func ptrStr(s *string) string {
	if s == nil {
		return "<nil>"
	}
	return *s
}
