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
