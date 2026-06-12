package cmd

import (
	"strings"
	"testing"
)

func TestSnippetCommandIsRunnerNeutral(t *testing.T) {
	if !strings.Contains(snippetCmd.Long, "AGENTS.md") {
		t.Fatal("snippet help should mention AGENTS.md")
	}
	if !strings.Contains(snippetCmd.Long, "CLAUDE.md") {
		t.Fatal("snippet help should mention CLAUDE.md")
	}
	if strings.Contains(snippetCmd.Short, "CLAUDE.md") {
		t.Fatal("snippet short description should not be Claude-specific")
	}
}

func TestSnippetTextIsRunnerNeutral(t *testing.T) {
	if strings.Contains(snippetText, "CLAUDE.md") {
		t.Fatal("snippet text should not reference CLAUDE.md; it must work in any agent instruction file")
	}
	// Harness-specific tool names are allowed only as parenthesized examples,
	// never as the bare instruction.
	if strings.Contains(snippetText, "Use TodoWrite") {
		t.Fatal("snippet text should not instruct TodoWrite use directly; phrase it harness-neutrally")
	}
}
