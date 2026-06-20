package tick

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func baseTick() Tick {
	now := time.Date(2025, 1, 8, 10, 30, 0, 0, time.UTC)
	return Tick{
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
}

func TestValidateTargetDateAbsentIsValid(t *testing.T) {
	tk := baseTick()
	if tk.TargetDate != "" {
		t.Fatalf("expected empty target_date by default, got %q", tk.TargetDate)
	}
	if err := tk.Validate(); err != nil {
		t.Fatalf("expected valid tick with no target_date, got: %v", err)
	}
}

func TestValidateTargetDatePresentValid(t *testing.T) {
	tk := baseTick()
	tk.TargetDate = "2026-09-30"
	if err := tk.Validate(); err != nil {
		t.Fatalf("expected valid tick with target_date, got: %v", err)
	}
}

func TestValidateTargetDateInvalid(t *testing.T) {
	cases := []string{
		"2026-9-30",            // unpadded month
		"2026/09/30",           // wrong separator
		"30-09-2026",           // wrong order
		"2026-09",              // partial (no day)
		"2026-09-30T00:00:00Z", // has time-of-day
		"not-a-date",
		"2026-13-01", // impossible month
	}
	for _, c := range cases {
		tk := baseTick()
		tk.TargetDate = c
		err := tk.Validate()
		if err == nil {
			t.Errorf("expected invalid target_date %q to fail validation", c)
			continue
		}
		if !strings.Contains(err.Error(), "target_date") {
			t.Errorf("expected error to mention target_date for %q, got: %v", c, err)
		}
	}
}

func TestTargetDateJSONRoundTrip(t *testing.T) {
	tk := baseTick()
	tk.TargetDate = "2026-09-30"

	data, err := json.Marshal(tk)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if !strings.Contains(string(data), `"target_date":"2026-09-30"`) {
		t.Fatalf("expected target_date in JSON, got: %s", data)
	}

	var got Tick
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if got.TargetDate != "2026-09-30" {
		t.Fatalf("round-trip target_date = %q, want 2026-09-30", got.TargetDate)
	}
}

func TestTargetDateOmittedFromJSONWhenEmpty(t *testing.T) {
	tk := baseTick()
	data, err := json.Marshal(tk)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if strings.Contains(string(data), "target_date") {
		t.Fatalf("expected target_date omitted when empty, got: %s", data)
	}
}
