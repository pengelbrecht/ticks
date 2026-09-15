package workerprompt

import (
	"strings"
	"testing"
)

// TestBuildPrompt pins the parts of the worker prompt the result contract
// depends on.
func TestBuildPrompt(t *testing.T) {
	got := BuildPrompt(PromptInput{
		TickID:      "1aw",
		Title:       "tk herd spawn",
		Description: "do the thing",
		Acceptance:  "tests green",
		EpicID:      "gyz",
		EpicTitle:   "Herd helper CLI",
		Branch:      "tick/1aw",
		Base:        "abc1234",
	})
	for _, want := range []string{
		"branch tick/1aw",
		"RESULT-1aw.md",
		"abc1234",
		"Herd helper CLI (gyz)",
		"do the thing",
		"tests green",
		"Do NOT run any `tk` command",
		"STATUS: DONE",
		"STATUS: BLOCKED",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("prompt missing %q\n---\n%s", want, got)
		}
	}
	if strings.Contains(got, "RESULT.md\n") {
		t.Error("prompt names a shared RESULT.md, which collides on the second merge of a wave")
	}
}
