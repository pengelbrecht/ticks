package tick

import (
	"strings"
	"testing"
	"time"
)

func TestTickValidateValid(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 30, 0, 0, time.UTC)
	valid := Tick{
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

	if err := valid.Validate(); err != nil {
		t.Fatalf("expected valid tick, got error: %v", err)
	}
}

func TestTickValidateRequiredFields(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 30, 0, 0, time.UTC)
	base := Tick{
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

	cases := []struct {
		name     string
		mutate   func(t Tick) Tick
		expected string
	}{
		{"missing id", func(t Tick) Tick { t.ID = ""; return t }, "id is required"},
		{"missing title", func(t Tick) Tick { t.Title = ""; return t }, "title is required"},
		{"missing status", func(t Tick) Tick { t.Status = ""; return t }, "status is required"},
		{"missing type", func(t Tick) Tick { t.Type = ""; return t }, "type is required"},
		{"missing owner", func(t Tick) Tick { t.Owner = ""; return t }, "owner is required"},
		{"missing created_by", func(t Tick) Tick { t.CreatedBy = ""; return t }, "created_by is required"},
		{"missing created_at", func(t Tick) Tick { t.CreatedAt = time.Time{}; return t }, "created_at is required"},
		{"missing updated_at", func(t Tick) Tick { t.UpdatedAt = time.Time{}; return t }, "updated_at is required"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			mutated := tc.mutate(base)
			err := mutated.Validate()
			if err == nil {
				t.Fatalf("expected error for %s", tc.name)
			}
			if !strings.Contains(err.Error(), tc.expected) {
				t.Fatalf("expected error to contain %q, got %q", tc.expected, err.Error())
			}
		})
	}
}

func TestTickValidateEnums(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 30, 0, 0, time.UTC)
	base := Tick{
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

	invalidStatus := base
	invalidStatus.Status = "broken"
	if err := invalidStatus.Validate(); err == nil || !strings.Contains(err.Error(), "invalid status") {
		t.Fatalf("expected invalid status error, got %v", err)
	}

	invalidType := base
	invalidType.Type = "unknown"
	if err := invalidType.Validate(); err == nil || !strings.Contains(err.Error(), "invalid type") {
		t.Fatalf("expected invalid type error, got %v", err)
	}

	lowPriority := base
	lowPriority.Priority = -1
	if err := lowPriority.Validate(); err == nil || !strings.Contains(err.Error(), "priority") {
		t.Fatalf("expected priority error, got %v", err)
	}

	highPriority := base
	highPriority.Priority = 5
	if err := highPriority.Validate(); err == nil || !strings.Contains(err.Error(), "priority") {
		t.Fatalf("expected priority error, got %v", err)
	}

	// Test invalid requires
	invalidRequires := "invalid_gate"
	badRequires := base
	badRequires.Requires = &invalidRequires
	if err := badRequires.Validate(); err == nil || !strings.Contains(err.Error(), "invalid requires") {
		t.Fatalf("expected invalid requires error, got %v", err)
	}

	// Test invalid awaiting
	invalidAwaiting := "invalid_state"
	badAwaiting := base
	badAwaiting.Awaiting = &invalidAwaiting
	if err := badAwaiting.Validate(); err == nil || !strings.Contains(err.Error(), "invalid awaiting") {
		t.Fatalf("expected invalid awaiting error, got %v", err)
	}
}

func TestTickValidateRequires(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 30, 0, 0, time.UTC)
	base := Tick{
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

	// nil requires should be valid
	if err := base.Validate(); err != nil {
		t.Fatalf("nil requires should be valid, got error: %v", err)
	}

	// valid requires values
	validRequires := []string{RequiresApproval, RequiresReview, RequiresContent}
	for _, r := range validRequires {
		t.Run(r, func(t *testing.T) {
			tick := base
			req := r
			tick.Requires = &req
			if err := tick.Validate(); err != nil {
				t.Fatalf("requires=%q should be valid, got error: %v", r, err)
			}
		})
	}
}

func TestTickValidateAwaiting(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 30, 0, 0, time.UTC)
	base := Tick{
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

	// nil awaiting should be valid
	if err := base.Validate(); err != nil {
		t.Fatalf("nil awaiting should be valid, got error: %v", err)
	}

	// valid awaiting values
	validAwaiting := []string{AwaitingWork, AwaitingApproval, AwaitingInput, AwaitingReview, AwaitingContent, AwaitingEscalation, AwaitingCheckpoint}
	for _, a := range validAwaiting {
		t.Run(a, func(t *testing.T) {
			tick := base
			aw := a
			tick.Awaiting = &aw
			if err := tick.Validate(); err != nil {
				t.Fatalf("awaiting=%q should be valid, got error: %v", a, err)
			}
		})
	}
}
