package tick

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func validRoleTestTick() Tick {
	now := time.Date(2025, 1, 8, 10, 0, 0, 0, time.UTC)
	return Tick{
		ID:        "r1",
		Title:     "Role test",
		Status:    StatusOpen,
		Priority:  2,
		Type:      TypeTask,
		Owner:     "petere",
		CreatedBy: "petere",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func TestValidateRole(t *testing.T) {
	for _, role := range []string{"", RoleReview, RoleCloseout} {
		tk := validRoleTestTick()
		tk.Role = role
		if err := tk.Validate(); err != nil {
			t.Errorf("role %q should be valid, got: %v", role, err)
		}
	}

	tk := validRoleTestTick()
	tk.Role = "bogus"
	err := tk.Validate()
	if err == nil {
		t.Fatalf("expected validation error for role=bogus")
	}
	if !strings.Contains(err.Error(), "invalid role") {
		t.Errorf("expected 'invalid role' in error, got: %v", err)
	}
}

// TestRoleJSONRoundTrip verifies the role field serializes as "role" and is
// omitted when empty (backwards compatibility with pre-role tick files).
func TestRoleJSONRoundTrip(t *testing.T) {
	tk := validRoleTestTick()
	tk.Role = RoleCloseout
	data, err := json.Marshal(tk)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if !strings.Contains(string(data), `"role":"closeout"`) {
		t.Errorf("expected role in JSON, got: %s", data)
	}

	var back Tick
	if err := json.Unmarshal(data, &back); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if back.Role != RoleCloseout {
		t.Errorf("expected role closeout after round trip, got %q", back.Role)
	}

	tk.Role = ""
	data, err = json.Marshal(tk)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if strings.Contains(string(data), `"role"`) {
		t.Errorf("empty role must be omitted from JSON, got: %s", data)
	}
}
