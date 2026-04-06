package context

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/ticks"
)

func TestNewPromptBuilder(t *testing.T) {
	pb, err := NewPromptBuilder()
	if err != nil {
		t.Fatalf("NewPromptBuilder() error = %v", err)
	}
	if pb == nil {
		t.Fatal("NewPromptBuilder() returned nil")
	}
	if pb.tmpl == nil {
		t.Fatal("NewPromptBuilder() template is nil")
	}
	if pb.maxTokens != DefaultMaxTokens {
		t.Errorf("NewPromptBuilder() maxTokens = %d, want %d", pb.maxTokens, DefaultMaxTokens)
	}
}

func TestNewPromptBuilder_WithMaxTokens(t *testing.T) {
	customTokens := 8000
	pb, err := NewPromptBuilder(PromptWithMaxTokens(customTokens))
	if err != nil {
		t.Fatalf("NewPromptBuilder() error = %v", err)
	}
	if pb.maxTokens != customTokens {
		t.Errorf("NewPromptBuilder() maxTokens = %d, want %d", pb.maxTokens, customTokens)
	}

	// Verify the custom token count appears in the built prompt
	epic := &ticks.Epic{
		ID:          "test",
		Title:       "Test Epic",
		Description: "Description",
	}
	result, err := pb.Build(epic, nil)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	if !strings.Contains(result, "8000 tokens") {
		t.Error("Build() result should contain custom token limit")
	}
}

func TestPromptBuilder_Build(t *testing.T) {
	pb, err := NewPromptBuilder()
	if err != nil {
		t.Fatalf("NewPromptBuilder() error = %v", err)
	}

	epic := &ticks.Epic{
		ID:          "h8d",
		Title:       "Parallel test execution",
		Description: "Add support for running tests in parallel to improve build times.",
	}

	tasks := []ticks.Task{
		{
			ID:          "abc",
			Title:       "Add worker pool",
			Description: "Implement a worker pool for concurrent test execution.",
		},
		{
			ID:          "def",
			Title:       "Add result aggregation",
			Description: "Aggregate test results from parallel workers.",
		},
	}

	result, err := pb.Build(epic, tasks)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}

	// Check epic information is included
	if !strings.Contains(result, "[h8d]") {
		t.Error("Build() result missing epic ID")
	}
	if !strings.Contains(result, "Parallel test execution") {
		t.Error("Build() result missing epic title")
	}
	if !strings.Contains(result, "Add support for running tests in parallel") {
		t.Error("Build() result missing epic description")
	}

	// Check task information is included
	if !strings.Contains(result, "[abc]") {
		t.Error("Build() result missing first task ID")
	}
	if !strings.Contains(result, "Add worker pool") {
		t.Error("Build() result missing first task title")
	}
	if !strings.Contains(result, "Implement a worker pool") {
		t.Error("Build() result missing first task description")
	}
	if !strings.Contains(result, "[def]") {
		t.Error("Build() result missing second task ID")
	}
	if !strings.Contains(result, "Add result aggregation") {
		t.Error("Build() result missing second task title")
	}

	// Check template sections are present
	sections := []string{
		"# Generate Epic Context",
		"## Epic",
		"## Tasks",
		"## Instructions",
		"**Key types and interfaces**",
		"**Patterns to follow**",
		"**Integration points**",
		"## Constraints",
		"4000 tokens", // default max tokens
	}

	for _, section := range sections {
		if !strings.Contains(result, section) {
			t.Errorf("Build() result missing section: %q", section)
		}
	}
}

func TestPromptBuilder_Build_EmptyTasks(t *testing.T) {
	pb, err := NewPromptBuilder()
	if err != nil {
		t.Fatalf("NewPromptBuilder() error = %v", err)
	}

	epic := &ticks.Epic{
		ID:          "xyz",
		Title:       "Empty epic",
		Description: "An epic with no tasks.",
	}

	result, err := pb.Build(epic, nil)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}

	if !strings.Contains(result, "[xyz]") {
		t.Error("Build() result missing epic ID")
	}
	if !strings.Contains(result, "Empty epic") {
		t.Error("Build() result missing epic title")
	}
	// Should still have the tasks section header even if empty
	if !strings.Contains(result, "## Tasks") {
		t.Error("Build() result missing tasks section")
	}
}

func TestPromptBuilder_Build_EmptyDescriptions(t *testing.T) {
	pb, err := NewPromptBuilder()
	if err != nil {
		t.Fatalf("NewPromptBuilder() error = %v", err)
	}

	epic := &ticks.Epic{
		ID:          "abc",
		Title:       "Minimal epic",
		Description: "", // empty description
	}

	tasks := []ticks.Task{
		{
			ID:          "t1",
			Title:       "Task one",
			Description: "", // empty description
		},
	}

	result, err := pb.Build(epic, tasks)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}

	// Should still work with empty descriptions
	if !strings.Contains(result, "[abc]") {
		t.Error("Build() result missing epic ID")
	}
	if !strings.Contains(result, "Minimal epic") {
		t.Error("Build() result missing epic title")
	}
	if !strings.Contains(result, "[t1]") {
		t.Error("Build() result missing task ID")
	}
}

func TestPromptBuilder_Build_SpecialCharacters(t *testing.T) {
	pb, err := NewPromptBuilder()
	if err != nil {
		t.Fatalf("NewPromptBuilder() error = %v", err)
	}

	tests := []struct {
		name        string
		epic        *ticks.Epic
		tasks       []ticks.Task
		wantContain []string
	}{
		{
			name: "markdown in description",
			epic: &ticks.Epic{
				ID:          "md1",
				Title:       "Epic with **bold** and _italic_",
				Description: "Use `code` and [links](http://example.com)",
			},
			tasks: []ticks.Task{
				{
					ID:          "t1",
					Title:       "Task with ```code blocks```",
					Description: "Handle <html> and &amp; entities",
				},
			},
			wantContain: []string{
				"**bold**",
				"_italic_",
				"`code`",
				"[links](http://example.com)",
				"```code blocks```",
				"<html>",
				"&amp;",
			},
		},
		{
			name: "unicode characters",
			epic: &ticks.Epic{
				ID:          "uni",
				Title:       "Epic with émojis 🚀 and ñ",
				Description: "Support für internationale Zeichen",
			},
			tasks: []ticks.Task{},
			wantContain: []string{
				"émojis 🚀",
				"ñ",
				"für internationale",
			},
		},
		{
			name: "newlines and whitespace",
			epic: &ticks.Epic{
				ID:    "ws",
				Title: "Whitespace epic",
				Description: `Multi-line
description with
tabs	and spaces`,
			},
			tasks: []ticks.Task{},
			wantContain: []string{
				"Multi-line",
				"tabs\tand spaces",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := pb.Build(tt.epic, tt.tasks)
			if err != nil {
				t.Fatalf("Build() error = %v", err)
			}
			for _, want := range tt.wantContain {
				if !strings.Contains(result, want) {
					t.Errorf("Build() result missing: %q", want)
				}
			}
		})
	}
}

func TestPromptBuilder_Build_ManyTasks(t *testing.T) {
	pb, err := NewPromptBuilder()
	if err != nil {
		t.Fatalf("NewPromptBuilder() error = %v", err)
	}

	epic := &ticks.Epic{
		ID:          "big",
		Title:       "Large epic",
		Description: "Epic with many tasks.",
	}

	// Create 10 tasks
	tasks := make([]ticks.Task, 10)
	for i := 0; i < 10; i++ {
		tasks[i] = ticks.Task{
			ID:          string(rune('a' + i)),
			Title:       "Task " + string(rune('A'+i)),
			Description: "Description for task " + string(rune('A'+i)),
		}
	}

	result, err := pb.Build(epic, tasks)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}

	// Verify all tasks are included
	for i := 0; i < 10; i++ {
		taskTitle := "Task " + string(rune('A'+i))
		if !strings.Contains(result, taskTitle) {
			t.Errorf("Build() result missing task: %q", taskTitle)
		}
	}
}

func TestExtractFileHints(t *testing.T) {
	tasks := []ticks.Task{
		{
			ID:          "t1",
			Title:       "Update internal/engine/signals.go",
			Description: "Modify internal/wrapup/wrapup.go and internal/wrapup/parse.go",
		},
		{
			ID:          "t2",
			Title:       "Fix bug",
			Description: "Check cmd/tk/cmd/run.go for the issue. Also see config.yaml.",
		},
	}

	hints := extractFileHints(tasks)

	expected := []string{
		"cmd/tk/cmd/run.go",
		"config.yaml",
		"internal/engine/signals.go",
		"internal/wrapup/parse.go",
		"internal/wrapup/wrapup.go",
	}

	if len(hints) != len(expected) {
		t.Fatalf("extractFileHints() got %d hints, want %d: %v", len(hints), len(expected), hints)
	}
	for i, want := range expected {
		if hints[i] != want {
			t.Errorf("extractFileHints()[%d] = %q, want %q", i, hints[i], want)
		}
	}
}

func TestExtractFileHints_NoFiles(t *testing.T) {
	tasks := []ticks.Task{
		{ID: "t1", Title: "Do something", Description: "No file paths here"},
	}
	hints := extractFileHints(tasks)
	if len(hints) != 0 {
		t.Errorf("extractFileHints() got %v, want empty", hints)
	}
}

func TestPromptBuilder_Build_IncludesFileHints(t *testing.T) {
	pb, err := NewPromptBuilder()
	if err != nil {
		t.Fatalf("NewPromptBuilder() error = %v", err)
	}

	epic := &ticks.Epic{ID: "fh1", Title: "File hints test"}
	tasks := []ticks.Task{
		{ID: "t1", Title: "Edit signals", Description: "Modify internal/engine/signals.go"},
	}

	result, err := pb.Build(epic, tasks)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}

	if !strings.Contains(result, "## Start Here") {
		t.Error("Build() should include Start Here section when file hints exist")
	}
	if !strings.Contains(result, "internal/engine/signals.go") {
		t.Error("Build() should include extracted file path in hints")
	}
}
