package tick

import (
	"strings"
	"testing"
	"time"
)

func glossTick(title, gloss string) Tick {
	now := time.Date(2026, 9, 26, 12, 0, 0, 0, time.UTC)
	return Tick{
		ID: "kdn", Title: title, Gloss: gloss, Status: StatusOpen, Priority: 2,
		Type: TypeTask, Owner: "o", CreatedBy: "o", CreatedAt: now, UpdatedAt: now,
	}
}

func TestValidateRefusesAnOverlongGlossNamingTheLimit(t *testing.T) {
	err := glossTick("t", strings.Repeat("x", GlossMaxRunes+1)).Validate()
	if err == nil {
		t.Fatal("a 41-character gloss validated")
	}
	if !strings.Contains(err.Error(), "the limit is 40") {
		t.Errorf("error does not name the limit: %v", err)
	}
}

func TestValidateCountsGlossInCharactersNotBytes(t *testing.T) {
	// 40 two-byte runes: within the limit though 80 bytes long.
	if err := glossTick("t", strings.Repeat("é", GlossMaxRunes)).Validate(); err != nil {
		t.Errorf("a 40-character gloss was refused: %v", err)
	}
}

func TestValidateRefusesAMultiLineGloss(t *testing.T) {
	if err := glossTick("t", "add oauth\nlogin").Validate(); err == nil {
		t.Error("a gloss spanning two lines validated")
	}
}

func TestLabelPrefersTheGloss(t *testing.T) {
	tk := glossTick("Add Google OAuth login to the signup and settings flows", "add google oauth login")
	if got := tk.Ref(); got != "kdn (add google oauth login)" {
		t.Errorf("Ref() = %q", got)
	}
}

func TestLabelFallsBackToTheTitleCutToTheCap(t *testing.T) {
	short := glossTick("Fix auth", "")
	if got := short.Label(); got != "Fix auth" {
		t.Errorf("short title: Label() = %q", got)
	}

	long := glossTick("Running the done is the authoritative verdict on a finding", "")
	got := long.Label()
	if n := len([]rune(got)); n > GlossMaxRunes {
		t.Errorf("fallback label is %d characters, over the %d cap: %q", n, GlossMaxRunes, got)
	}
	if !strings.HasSuffix(got, "…") || !strings.HasPrefix(got, "Running the done") {
		t.Errorf("fallback label is not the cut title: %q", got)
	}
}
