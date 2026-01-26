package tick

import (
	"encoding/json"
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

	// Test invalid verdict
	invalidVerdict := "invalid_verdict"
	badVerdict := base
	badVerdict.Verdict = &invalidVerdict
	if err := badVerdict.Validate(); err == nil || !strings.Contains(err.Error(), "invalid verdict") {
		t.Fatalf("expected invalid verdict error, got %v", err)
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

func TestTickValidateVerdict(t *testing.T) {
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

	// nil verdict should be valid
	if err := base.Validate(); err != nil {
		t.Fatalf("nil verdict should be valid, got error: %v", err)
	}

	// valid verdict values
	validVerdicts := []string{VerdictApproved, VerdictRejected}
	for _, v := range validVerdicts {
		t.Run(v, func(t *testing.T) {
			tick := base
			vd := v
			tick.Verdict = &vd
			if err := tick.Validate(); err != nil {
				t.Fatalf("verdict=%q should be valid, got error: %v", v, err)
			}
		})
	}
}

func TestValidValueSlices(t *testing.T) {
	// Test ValidRequiresValues contains all valid requires values
	expectedRequires := []string{RequiresApproval, RequiresReview, RequiresContent}
	if len(ValidRequiresValues) != len(expectedRequires) {
		t.Errorf("ValidRequiresValues has %d elements, expected %d", len(ValidRequiresValues), len(expectedRequires))
	}
	for i, v := range expectedRequires {
		if ValidRequiresValues[i] != v {
			t.Errorf("ValidRequiresValues[%d] = %q, expected %q", i, ValidRequiresValues[i], v)
		}
	}

	// Test ValidAwaitingValues contains all valid awaiting values
	expectedAwaiting := []string{AwaitingWork, AwaitingApproval, AwaitingInput, AwaitingReview, AwaitingContent, AwaitingEscalation, AwaitingCheckpoint}
	if len(ValidAwaitingValues) != len(expectedAwaiting) {
		t.Errorf("ValidAwaitingValues has %d elements, expected %d", len(ValidAwaitingValues), len(expectedAwaiting))
	}
	for i, v := range expectedAwaiting {
		if ValidAwaitingValues[i] != v {
			t.Errorf("ValidAwaitingValues[%d] = %q, expected %q", i, ValidAwaitingValues[i], v)
		}
	}

	// Test ValidVerdictValues contains all valid verdict values
	expectedVerdict := []string{VerdictApproved, VerdictRejected}
	if len(ValidVerdictValues) != len(expectedVerdict) {
		t.Errorf("ValidVerdictValues has %d elements, expected %d", len(ValidVerdictValues), len(expectedVerdict))
	}
	for i, v := range expectedVerdict {
		if ValidVerdictValues[i] != v {
			t.Errorf("ValidVerdictValues[%d] = %q, expected %q", i, ValidVerdictValues[i], v)
		}
	}
}

func TestIsAwaitingHuman(t *testing.T) {
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

	// No awaiting or manual - not waiting
	if base.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman() to be false when neither Awaiting nor Manual is set")
	}

	// With Awaiting set
	awaiting := AwaitingApproval
	withAwaiting := base
	withAwaiting.Awaiting = &awaiting
	if !withAwaiting.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman() to be true when Awaiting is set")
	}

	// With Manual set (backwards compat)
	withManual := base
	withManual.Manual = true
	if !withManual.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman() to be true when Manual is set")
	}

	// With both set
	withBoth := base
	withBoth.Awaiting = &awaiting
	withBoth.Manual = true
	if !withBoth.IsAwaitingHuman() {
		t.Error("expected IsAwaitingHuman() to be true when both Awaiting and Manual are set")
	}
}

func TestGetAwaitingType(t *testing.T) {
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

	// No awaiting or manual - empty string
	if got := base.GetAwaitingType(); got != "" {
		t.Errorf("expected empty string, got %q", got)
	}

	// With Awaiting set - returns awaiting value
	awaiting := AwaitingApproval
	withAwaiting := base
	withAwaiting.Awaiting = &awaiting
	if got := withAwaiting.GetAwaitingType(); got != AwaitingApproval {
		t.Errorf("expected %q, got %q", AwaitingApproval, got)
	}

	// With Manual set (backwards compat) - returns work
	withManual := base
	withManual.Manual = true
	if got := withManual.GetAwaitingType(); got != AwaitingWork {
		t.Errorf("expected %q for Manual=true, got %q", AwaitingWork, got)
	}

	// With both set - Awaiting takes precedence
	withBoth := base
	input := AwaitingInput
	withBoth.Awaiting = &input
	withBoth.Manual = true
	if got := withBoth.GetAwaitingType(); got != AwaitingInput {
		t.Errorf("expected %q (Awaiting takes precedence), got %q", AwaitingInput, got)
	}
}

func TestHasRequiredGate(t *testing.T) {
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

	// No requires - false
	if base.HasRequiredGate() {
		t.Error("expected HasRequiredGate() to be false when Requires is nil")
	}

	// With requires set - true
	requires := RequiresApproval
	withRequires := base
	withRequires.Requires = &requires
	if !withRequires.HasRequiredGate() {
		t.Error("expected HasRequiredGate() to be true when Requires is set")
	}
}

func TestIsTerminalAwaiting(t *testing.T) {
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

	// Terminal awaiting types
	terminalTypes := []string{AwaitingApproval, AwaitingReview, AwaitingContent, AwaitingWork}
	for _, awType := range terminalTypes {
		t.Run("terminal_"+awType, func(t *testing.T) {
			tick := base
			a := awType
			tick.Awaiting = &a
			if !tick.IsTerminalAwaiting() {
				t.Errorf("expected IsTerminalAwaiting() to be true for %q", awType)
			}
		})
	}

	// Non-terminal awaiting types
	nonTerminalTypes := []string{AwaitingInput, AwaitingEscalation, AwaitingCheckpoint}
	for _, awType := range nonTerminalTypes {
		t.Run("non_terminal_"+awType, func(t *testing.T) {
			tick := base
			a := awType
			tick.Awaiting = &a
			if tick.IsTerminalAwaiting() {
				t.Errorf("expected IsTerminalAwaiting() to be false for %q", awType)
			}
		})
	}

	// Manual flag (backwards compat) should be terminal since it maps to work
	withManual := base
	withManual.Manual = true
	if !withManual.IsTerminalAwaiting() {
		t.Error("expected IsTerminalAwaiting() to be true for Manual=true (maps to work)")
	}

	// No awaiting - not terminal
	if base.IsTerminalAwaiting() {
		t.Error("expected IsTerminalAwaiting() to be false when not awaiting")
	}
}

func TestSetAwaiting(t *testing.T) {
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

	t.Run("set_awaiting_clears_manual", func(t *testing.T) {
		tick := base
		tick.Manual = true

		tick.SetAwaiting(AwaitingApproval)

		if tick.Awaiting == nil || *tick.Awaiting != AwaitingApproval {
			t.Errorf("expected Awaiting=%q, got %v", AwaitingApproval, tick.Awaiting)
		}
		if tick.Manual {
			t.Error("expected Manual=false after SetAwaiting, got true")
		}
	})

	t.Run("set_awaiting_empty_clears_both", func(t *testing.T) {
		tick := base
		tick.Manual = true
		awaiting := AwaitingWork
		tick.Awaiting = &awaiting

		tick.SetAwaiting("")

		if tick.Awaiting != nil {
			t.Errorf("expected Awaiting=nil after SetAwaiting(\"\"), got %v", *tick.Awaiting)
		}
		if tick.Manual {
			t.Error("expected Manual=false after SetAwaiting(\"\"), got true")
		}
	})

	t.Run("set_awaiting_from_fresh_tick", func(t *testing.T) {
		tick := base

		tick.SetAwaiting(AwaitingInput)

		if tick.Awaiting == nil || *tick.Awaiting != AwaitingInput {
			t.Errorf("expected Awaiting=%q, got %v", AwaitingInput, tick.Awaiting)
		}
		if tick.Manual {
			t.Error("expected Manual=false, got true")
		}
	})
}

func TestClearAwaiting(t *testing.T) {
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

	t.Run("clear_awaiting_clears_both_fields", func(t *testing.T) {
		tick := base
		tick.Manual = true
		awaiting := AwaitingWork
		tick.Awaiting = &awaiting

		tick.ClearAwaiting()

		if tick.Awaiting != nil {
			t.Errorf("expected Awaiting=nil, got %v", *tick.Awaiting)
		}
		if tick.Manual {
			t.Error("expected Manual=false, got true")
		}
	})

	t.Run("clear_awaiting_only_manual", func(t *testing.T) {
		tick := base
		tick.Manual = true

		tick.ClearAwaiting()

		if tick.Awaiting != nil {
			t.Errorf("expected Awaiting=nil, got %v", *tick.Awaiting)
		}
		if tick.Manual {
			t.Error("expected Manual=false, got true")
		}
	})

	t.Run("clear_awaiting_only_awaiting", func(t *testing.T) {
		tick := base
		awaiting := AwaitingApproval
		tick.Awaiting = &awaiting

		tick.ClearAwaiting()

		if tick.Awaiting != nil {
			t.Errorf("expected Awaiting=nil, got %v", *tick.Awaiting)
		}
		if tick.Manual {
			t.Error("expected Manual=false, got true")
		}
	})
}

func TestWorkflowFieldsJSONSerialization(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 30, 0, 0, time.UTC)

	t.Run("all_workflow_fields_set", func(t *testing.T) {
		requires := RequiresApproval
		awaiting := AwaitingReview
		verdict := VerdictApproved
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
			Requires:  &requires,
			Awaiting:  &awaiting,
			Verdict:   &verdict,
		}

		// Marshal to JSON
		data, err := json.Marshal(tick)
		if err != nil {
			t.Fatalf("failed to marshal tick: %v", err)
		}

		// Verify JSON contains expected fields
		jsonStr := string(data)
		if !strings.Contains(jsonStr, `"requires":"approval"`) {
			t.Errorf("JSON missing requires field: %s", jsonStr)
		}
		if !strings.Contains(jsonStr, `"awaiting":"review"`) {
			t.Errorf("JSON missing awaiting field: %s", jsonStr)
		}
		if !strings.Contains(jsonStr, `"verdict":"approved"`) {
			t.Errorf("JSON missing verdict field: %s", jsonStr)
		}

		// Unmarshal back
		var decoded Tick
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("failed to unmarshal tick: %v", err)
		}

		// Verify round-trip
		if decoded.Requires == nil || *decoded.Requires != RequiresApproval {
			t.Errorf("Requires mismatch: got %v, want %q", decoded.Requires, RequiresApproval)
		}
		if decoded.Awaiting == nil || *decoded.Awaiting != AwaitingReview {
			t.Errorf("Awaiting mismatch: got %v, want %q", decoded.Awaiting, AwaitingReview)
		}
		if decoded.Verdict == nil || *decoded.Verdict != VerdictApproved {
			t.Errorf("Verdict mismatch: got %v, want %q", decoded.Verdict, VerdictApproved)
		}
	})

	t.Run("workflow_fields_nil_omitted", func(t *testing.T) {
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
			// Requires, Awaiting, Verdict all nil
		}

		data, err := json.Marshal(tick)
		if err != nil {
			t.Fatalf("failed to marshal tick: %v", err)
		}

		// Verify JSON omits nil fields
		jsonStr := string(data)
		if strings.Contains(jsonStr, `"requires"`) {
			t.Errorf("JSON should omit nil requires: %s", jsonStr)
		}
		if strings.Contains(jsonStr, `"awaiting"`) {
			t.Errorf("JSON should omit nil awaiting: %s", jsonStr)
		}
		if strings.Contains(jsonStr, `"verdict"`) {
			t.Errorf("JSON should omit nil verdict: %s", jsonStr)
		}

		// Unmarshal and verify still nil
		var decoded Tick
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("failed to unmarshal tick: %v", err)
		}
		if decoded.Requires != nil {
			t.Errorf("decoded Requires should be nil, got %v", decoded.Requires)
		}
		if decoded.Awaiting != nil {
			t.Errorf("decoded Awaiting should be nil, got %v", decoded.Awaiting)
		}
		if decoded.Verdict != nil {
			t.Errorf("decoded Verdict should be nil, got %v", decoded.Verdict)
		}
	})

	t.Run("requires_values_roundtrip", func(t *testing.T) {
		for _, reqVal := range ValidRequiresValues {
			t.Run(reqVal, func(t *testing.T) {
				req := reqVal
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
					Requires:  &req,
				}

				data, err := json.Marshal(tick)
				if err != nil {
					t.Fatalf("marshal failed: %v", err)
				}

				var decoded Tick
				if err := json.Unmarshal(data, &decoded); err != nil {
					t.Fatalf("unmarshal failed: %v", err)
				}

				if decoded.Requires == nil || *decoded.Requires != reqVal {
					t.Errorf("round-trip failed: got %v, want %q", decoded.Requires, reqVal)
				}
			})
		}
	})

	t.Run("awaiting_values_roundtrip", func(t *testing.T) {
		for _, awVal := range ValidAwaitingValues {
			t.Run(awVal, func(t *testing.T) {
				aw := awVal
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
					Awaiting:  &aw,
				}

				data, err := json.Marshal(tick)
				if err != nil {
					t.Fatalf("marshal failed: %v", err)
				}

				var decoded Tick
				if err := json.Unmarshal(data, &decoded); err != nil {
					t.Fatalf("unmarshal failed: %v", err)
				}

				if decoded.Awaiting == nil || *decoded.Awaiting != awVal {
					t.Errorf("round-trip failed: got %v, want %q", decoded.Awaiting, awVal)
				}
			})
		}
	})

	t.Run("verdict_values_roundtrip", func(t *testing.T) {
		for _, vVal := range ValidVerdictValues {
			t.Run(vVal, func(t *testing.T) {
				v := vVal
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
					Verdict:   &v,
				}

				data, err := json.Marshal(tick)
				if err != nil {
					t.Fatalf("marshal failed: %v", err)
				}

				var decoded Tick
				if err := json.Unmarshal(data, &decoded); err != nil {
					t.Fatalf("unmarshal failed: %v", err)
				}

				if decoded.Verdict == nil || *decoded.Verdict != vVal {
					t.Errorf("round-trip failed: got %v, want %q", decoded.Verdict, vVal)
				}
			})
		}
	})

	t.Run("unmarshal_from_json_string", func(t *testing.T) {
		// Test parsing JSON that might come from external source
		jsonStr := `{
			"id": "xyz",
			"title": "Test ticket",
			"status": "open",
			"priority": 1,
			"type": "task",
			"owner": "agent",
			"created_by": "human",
			"created_at": "2025-01-08T10:30:00Z",
			"updated_at": "2025-01-08T10:30:00Z",
			"requires": "review",
			"awaiting": "approval",
			"verdict": "rejected"
		}`

		var tick Tick
		if err := json.Unmarshal([]byte(jsonStr), &tick); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}

		if tick.Requires == nil || *tick.Requires != RequiresReview {
			t.Errorf("Requires: got %v, want %q", tick.Requires, RequiresReview)
		}
		if tick.Awaiting == nil || *tick.Awaiting != AwaitingApproval {
			t.Errorf("Awaiting: got %v, want %q", tick.Awaiting, AwaitingApproval)
		}
		if tick.Verdict == nil || *tick.Verdict != VerdictRejected {
			t.Errorf("Verdict: got %v, want %q", tick.Verdict, VerdictRejected)
		}
	})

	t.Run("unmarshal_without_workflow_fields", func(t *testing.T) {
		// Test parsing JSON without workflow fields (backwards compat)
		jsonStr := `{
			"id": "xyz",
			"title": "Test ticket",
			"status": "open",
			"priority": 1,
			"type": "task",
			"owner": "agent",
			"created_by": "human",
			"created_at": "2025-01-08T10:30:00Z",
			"updated_at": "2025-01-08T10:30:00Z"
		}`

		var tick Tick
		if err := json.Unmarshal([]byte(jsonStr), &tick); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}

		if tick.Requires != nil {
			t.Errorf("Requires should be nil, got %v", tick.Requires)
		}
		if tick.Awaiting != nil {
			t.Errorf("Awaiting should be nil, got %v", tick.Awaiting)
		}
		if tick.Verdict != nil {
			t.Errorf("Verdict should be nil, got %v", tick.Verdict)
		}
	})

	t.Run("workflow_fields_with_manual_flag", func(t *testing.T) {
		// Test that workflow fields work alongside legacy Manual flag
		awaiting := AwaitingContent
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
			Manual:    true,
			Awaiting:  &awaiting,
		}

		data, err := json.Marshal(tick)
		if err != nil {
			t.Fatalf("marshal failed: %v", err)
		}

		jsonStr := string(data)
		if !strings.Contains(jsonStr, `"manual":true`) {
			t.Errorf("JSON missing manual field: %s", jsonStr)
		}
		if !strings.Contains(jsonStr, `"awaiting":"content"`) {
			t.Errorf("JSON missing awaiting field: %s", jsonStr)
		}

		var decoded Tick
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}

		if !decoded.Manual {
			t.Error("decoded Manual should be true")
		}
		if decoded.Awaiting == nil || *decoded.Awaiting != AwaitingContent {
			t.Errorf("decoded Awaiting: got %v, want %q", decoded.Awaiting, AwaitingContent)
		}
	})
}

func TestStart(t *testing.T) {
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

	t.Run("start_sets_in_progress_and_started_at", func(t *testing.T) {
		tick := base

		tick.Start()

		if tick.Status != StatusInProgress {
			t.Errorf("expected Status=%q, got %q", StatusInProgress, tick.Status)
		}
		if tick.StartedAt == nil {
			t.Error("expected StartedAt to be set")
		}
		if tick.UpdatedAt.Before(now) || tick.UpdatedAt.Equal(now) {
			t.Error("expected UpdatedAt to be updated")
		}
	})

	t.Run("start_from_closed", func(t *testing.T) {
		tick := base
		tick.Status = StatusClosed
		closedTime := now.Add(-1 * time.Hour)
		tick.ClosedAt = &closedTime

		tick.Start()

		if tick.Status != StatusInProgress {
			t.Errorf("expected Status=%q, got %q", StatusInProgress, tick.Status)
		}
		if tick.StartedAt == nil {
			t.Error("expected StartedAt to be set")
		}
	})

	t.Run("start_overwrites_existing_started_at", func(t *testing.T) {
		tick := base
		oldStarted := now.Add(-2 * time.Hour)
		tick.StartedAt = &oldStarted

		tick.Start()

		if tick.StartedAt == nil {
			t.Fatal("expected StartedAt to be set")
		}
		if tick.StartedAt.Equal(oldStarted) {
			t.Error("expected StartedAt to be updated to new time")
		}
	})
}

func TestRelease(t *testing.T) {
	now := time.Date(2025, 1, 8, 10, 30, 0, 0, time.UTC)
	base := Tick{
		ID:        "a1b",
		Title:     "Fix auth",
		Status:    StatusInProgress,
		Priority:  2,
		Type:      TypeBug,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: now,
		UpdatedAt: now,
	}

	t.Run("release_sets_open_and_clears_started_at", func(t *testing.T) {
		tick := base
		startedTime := now.Add(-1 * time.Hour)
		tick.StartedAt = &startedTime

		tick.Release()

		if tick.Status != StatusOpen {
			t.Errorf("expected Status=%q, got %q", StatusOpen, tick.Status)
		}
		if tick.StartedAt != nil {
			t.Error("expected StartedAt to be nil after release")
		}
		if tick.UpdatedAt.Before(now) || tick.UpdatedAt.Equal(now) {
			t.Error("expected UpdatedAt to be updated")
		}
	})

	t.Run("release_without_started_at", func(t *testing.T) {
		tick := base
		tick.StartedAt = nil

		tick.Release()

		if tick.Status != StatusOpen {
			t.Errorf("expected Status=%q, got %q", StatusOpen, tick.Status)
		}
		if tick.StartedAt != nil {
			t.Error("expected StartedAt to remain nil")
		}
	})

	t.Run("release_from_closed", func(t *testing.T) {
		tick := base
		tick.Status = StatusClosed
		closedTime := now.Add(-1 * time.Hour)
		tick.ClosedAt = &closedTime

		tick.Release()

		if tick.Status != StatusOpen {
			t.Errorf("expected Status=%q, got %q", StatusOpen, tick.Status)
		}
		if tick.StartedAt != nil {
			t.Error("expected StartedAt to be nil")
		}
	})
}
