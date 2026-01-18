package engine

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/ticks"
)

func TestNewPromptBuilder(t *testing.T) {
	pb := NewPromptBuilder()
	if pb == nil {
		t.Fatal("NewPromptBuilder() returned nil")
	}
	if pb.tmpl == nil {
		t.Fatal("PromptBuilder.tmpl is nil")
	}
}

func TestPromptBuilder_Build_FullContext(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 3,
		Epic: &ticks.Epic{
			ID:          "abc",
			Title:       "Build authentication system",
			Description: "Implement JWT-based authentication for the API.",
		},
		Task: &ticks.Task{
			ID:          "xyz",
			Title:       "Create login endpoint",
			Description: "Implement POST /api/login endpoint.\n\nAcceptance Criteria:\n- Validates email and password\n- Returns JWT token on success\n- Returns 401 on invalid credentials",
		},
		EpicNotes: []string{
			"Using bcrypt for password hashing",
			"JWT secret stored in environment variable",
		},
	}

	prompt := pb.Build(ctx)

	// Check iteration number
	if !strings.Contains(prompt, "# Iteration 3") {
		t.Error("prompt missing iteration number")
	}

	// Check epic title
	if !strings.Contains(prompt, "Build authentication system") {
		t.Error("prompt missing epic title")
	}

	// Check epic description
	if !strings.Contains(prompt, "Implement JWT-based authentication for the API.") {
		t.Error("prompt missing epic description")
	}

	// Check task title with ID
	if !strings.Contains(prompt, "**[xyz] Create login endpoint**") {
		t.Error("prompt missing task title with ID")
	}

	// Check task description
	if !strings.Contains(prompt, "Implement POST /api/login endpoint.") {
		t.Error("prompt missing task description")
	}

	// Check acceptance criteria
	if !strings.Contains(prompt, "Validates email and password") {
		t.Error("prompt missing acceptance criteria")
	}

	// Check epic notes
	if !strings.Contains(prompt, "Using bcrypt for password hashing") {
		t.Error("prompt missing epic notes")
	}
	if !strings.Contains(prompt, "JWT secret stored in environment variable") {
		t.Error("prompt missing second epic note")
	}

	// Check epic notes section header
	if !strings.Contains(prompt, "Review Epic Notes First") {
		t.Error("prompt missing epic notes section header")
	}

	// Check instructions section
	if !strings.Contains(prompt, "## Instructions") {
		t.Error("prompt missing instructions section")
	}
	if !strings.Contains(prompt, "Complete the current task") {
		t.Error("prompt missing complete task instruction")
	}
	if !strings.Contains(prompt, "Run tests") {
		t.Error("prompt missing run tests instruction")
	}
	if !strings.Contains(prompt, "Close the task") {
		t.Error("prompt missing close task instruction")
	}
	if !strings.Contains(prompt, "Commit your changes") {
		t.Error("prompt missing commit instruction")
	}
	if !strings.Contains(prompt, "Add epic note") {
		t.Error("prompt missing add epic note instruction")
	}

	// Check tk note command includes epic ID
	if !strings.Contains(prompt, "tk note abc") {
		t.Error("prompt should contain tk note command with epic ID")
	}

	// Check rules section
	if !strings.Contains(prompt, "## Rules") {
		t.Error("prompt missing rules section")
	}
	if !strings.Contains(prompt, "One task per iteration") {
		t.Error("prompt missing one task rule")
	}
	if !strings.Contains(prompt, "No questions") {
		t.Error("prompt missing no questions rule")
	}
	if !strings.Contains(prompt, "Always leave notes") {
		t.Error("prompt missing always leave notes rule")
	}
	// Check handoff signals section (all 7 signal types documented)
	if !strings.Contains(prompt, "## Handoff Signals") {
		t.Error("prompt missing handoff signals section")
	}
	// Verify all 7 signals are documented
	// Note: COMPLETE is intentionally not documented - it's parsed for backwards
	// compatibility but agents should not emit it (the engine ignores it with a warning)
	handoffSignals := []string{
		"<promise>APPROVAL_NEEDED:",
		"<promise>INPUT_NEEDED:",
		"<promise>REVIEW_REQUESTED:",
		"<promise>CONTENT_REVIEW:",
		"<promise>ESCALATE:",
		"<promise>CHECKPOINT:",
		"<promise>EJECT:",
	}
	for _, sig := range handoffSignals {
		if !strings.Contains(prompt, sig) {
			t.Errorf("prompt missing handoff signal: %s", sig)
		}
	}
	// Check human feedback documentation
	if !strings.Contains(prompt, "## Reading Human Feedback") {
		t.Error("prompt missing reading human feedback section")
	}
}

func TestPromptBuilder_Build_MinimalContext(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			Title: "Simple epic",
		},
		Task: &ticks.Task{
			Title:       "Simple task",
			Description: "Do something simple.",
		},
	}

	prompt := pb.Build(ctx)

	// Should still have iteration, epic, and task
	if !strings.Contains(prompt, "# Iteration 1") {
		t.Error("prompt missing iteration number")
	}
	if !strings.Contains(prompt, "Simple epic") {
		t.Error("prompt missing epic title")
	}
	if !strings.Contains(prompt, "**Simple task**") {
		t.Error("prompt missing task title")
	}

	// Should not have epic notes header if none provided
	if strings.Contains(prompt, "Review Epic Notes First") {
		t.Error("prompt should not have epic notes section when none provided")
	}
}

func TestPromptBuilder_Build_NilEpicAndTask(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic:      nil,
		Task:      nil,
	}

	// Should not panic
	prompt := pb.Build(ctx)

	// Should still have basic structure
	if !strings.Contains(prompt, "# Iteration 1") {
		t.Error("prompt missing iteration number")
	}
	if !strings.Contains(prompt, "## Instructions") {
		t.Error("prompt missing instructions section")
	}
}

func TestExtractAcceptanceCriteria(t *testing.T) {
	tests := []struct {
		name        string
		description string
		wantEmpty   bool
		wantContain string
	}{
		{
			name:        "no acceptance criteria",
			description: "Just a simple description.",
			wantEmpty:   true,
		},
		{
			name:        "acceptance criteria with colon",
			description: "Do something.\n\nAcceptance Criteria:\n- Test passes\n- Code compiles",
			wantContain: "Test passes",
		},
		{
			name:        "acceptance criteria with markdown header",
			description: "Do something.\n\n## Acceptance Criteria\n- Test passes",
			wantContain: "Test passes",
		},
		{
			name:        "acceptance criteria lowercase",
			description: "Do something.\n\nacceptance criteria:\n- Test passes",
			wantContain: "Test passes",
		},
		{
			name:        "acceptance criteria with h3 header",
			description: "Do something.\n\n### Acceptance Criteria\n- Check 1\n- Check 2",
			wantContain: "Check 1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractAcceptanceCriteria(tt.description)
			if tt.wantEmpty && result != "" {
				t.Errorf("expected empty result, got %q", result)
			}
			if tt.wantContain != "" && !strings.Contains(result, tt.wantContain) {
				t.Errorf("expected result to contain %q, got %q", tt.wantContain, result)
			}
		})
	}
}

func TestPromptBuilder_Build_ContainsAllRequiredSections(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			ID:          "epic1",
			Title:       "Test Epic",
			Description: "Epic description",
		},
		Task: &ticks.Task{
			ID:          "t1",
			Title:       "Test Task",
			Description: "Task description",
		},
		EpicNotes: []string{"Note 1"},
	}

	prompt := pb.Build(ctx)

	requiredSections := []string{
		"# Iteration",
		"## Epic:",
		"## Current Task",
		"Review Epic Notes First",
		"## Instructions",
		"## Handoff Signals",
		"## Reading Human Feedback",
		"## Rules",
	}

	for _, section := range requiredSections {
		if !strings.Contains(prompt, section) {
			t.Errorf("prompt missing required section: %s", section)
		}
	}
}

func TestPromptBuilder_Build_TaskIDInCloseCommand(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			Title: "Epic",
		},
		Task: &ticks.Task{
			ID:          "abc123",
			Title:       "Task",
			Description: "Description",
		},
	}

	prompt := pb.Build(ctx)

	// The close command should reference the task ID
	if !strings.Contains(prompt, "tk close abc123") {
		t.Error("prompt should contain tk close command with task ID")
	}
}

func TestPromptBuilder_Build_WithHumanFeedback(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 2,
		Epic: &ticks.Epic{
			ID:    "epic1",
			Title: "Test Epic",
		},
		Task: &ticks.Task{
			ID:          "task1",
			Title:       "Fix login bug",
			Description: "The login form has a bug.",
		},
		HumanFeedback: []ticks.Note{
			{Content: "The fix didn't work, login still fails for users with special characters in password", Author: "human"},
			{Content: "Also please add input validation", Author: "human"},
		},
	}

	prompt := pb.Build(ctx)

	// Check for human feedback section
	if !strings.Contains(prompt, "## Human Feedback") {
		t.Error("prompt missing human feedback section")
	}
	if !strings.Contains(prompt, "This task was previously handed to a human") {
		t.Error("prompt missing human feedback intro text")
	}
	if !strings.Contains(prompt, "The fix didn't work, login still fails for users with special characters in password") {
		t.Error("prompt missing first human feedback note")
	}
	if !strings.Contains(prompt, "Also please add input validation") {
		t.Error("prompt missing second human feedback note")
	}
	if !strings.Contains(prompt, "Address this feedback before proceeding") {
		t.Error("prompt missing feedback instruction")
	}
}

func TestPromptBuilder_Build_NoHumanFeedback(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			ID:    "epic1",
			Title: "Test Epic",
		},
		Task: &ticks.Task{
			ID:          "task1",
			Title:       "Simple task",
			Description: "Do something.",
		},
		HumanFeedback: nil,
	}

	prompt := pb.Build(ctx)

	// Should not have human feedback section when none provided
	if strings.Contains(prompt, "## Human Feedback") {
		t.Error("prompt should not have human feedback section when none provided")
	}
	if strings.Contains(prompt, "This task was previously handed to a human") {
		t.Error("prompt should not have human feedback intro when none provided")
	}
}

func TestPromptBuilder_Build_EmptyHumanFeedback(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			ID:    "epic1",
			Title: "Test Epic",
		},
		Task: &ticks.Task{
			ID:          "task1",
			Title:       "Simple task",
			Description: "Do something.",
		},
		HumanFeedback: []ticks.Note{},
	}

	prompt := pb.Build(ctx)

	// Should not have human feedback section when slice is empty
	if strings.Contains(prompt, "## Human Feedback") {
		t.Error("prompt should not have human feedback section when slice is empty")
	}
}

func TestPromptBuilder_Build_RequiresContent(t *testing.T) {
	pb := NewPromptBuilder()

	content := "content"
	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			ID:    "epic1",
			Title: "Test Epic",
		},
		Task: &ticks.Task{
			ID:          "task1",
			Title:       "Update error messages",
			Description: "Improve error message copy.",
			Requires:    &content,
		},
	}

	prompt := pb.Build(ctx)

	// Should have content review section
	if !strings.Contains(prompt, "## ⚠️ Content Review Required") {
		t.Error("prompt missing content review section")
	}
	if !strings.Contains(prompt, "human content review") {
		t.Error("prompt missing content review description")
	}
	// Should instruct to add note about where to review
	if !strings.Contains(prompt, "CRITICAL") {
		t.Error("prompt missing critical instruction about review note")
	}
	if !strings.Contains(prompt, "tk note task1") {
		t.Error("prompt should include tk note command with task ID")
	}
	if !strings.Contains(prompt, "Good review note examples") {
		t.Error("prompt missing good review note examples")
	}
	if !strings.Contains(prompt, "Bad review notes") {
		t.Error("prompt missing bad review note examples")
	}
}

func TestPromptBuilder_Build_RequiresReview(t *testing.T) {
	pb := NewPromptBuilder()

	review := "review"
	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			ID:    "epic1",
			Title: "Test Epic",
		},
		Task: &ticks.Task{
			ID:          "task1",
			Title:       "Add new API endpoint",
			Description: "Add GET /api/users endpoint.",
			Requires:    &review,
		},
	}

	prompt := pb.Build(ctx)

	// Should have code review section
	if !strings.Contains(prompt, "## ⚠️ Code Review Required") {
		t.Error("prompt missing code review section")
	}
	if !strings.Contains(prompt, "code review") {
		t.Error("prompt missing code review description")
	}
	if !strings.Contains(prompt, "Create a PR") {
		t.Error("prompt missing PR instruction")
	}
}

func TestPromptBuilder_Build_RequiresApproval(t *testing.T) {
	pb := NewPromptBuilder()

	approval := "approval"
	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			ID:    "epic1",
			Title: "Test Epic",
		},
		Task: &ticks.Task{
			ID:          "task1",
			Title:       "Database migration",
			Description: "Add new column to users table.",
			Requires:    &approval,
		},
	}

	prompt := pb.Build(ctx)

	// Should have approval section
	if !strings.Contains(prompt, "## ⚠️ Approval Required") {
		t.Error("prompt missing approval section")
	}
	if !strings.Contains(prompt, "human approval") {
		t.Error("prompt missing approval description")
	}
	if !strings.Contains(prompt, "risks") {
		t.Error("prompt should mention risks for approval")
	}
}

func TestPromptBuilder_Build_NoRequires(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			ID:    "epic1",
			Title: "Test Epic",
		},
		Task: &ticks.Task{
			ID:          "task1",
			Title:       "Simple task",
			Description: "Do something simple.",
			Requires:    nil,
		},
	}

	prompt := pb.Build(ctx)

	// Should not have any requires section
	if strings.Contains(prompt, "Content Review Required") {
		t.Error("prompt should not have content review section when requires is nil")
	}
	if strings.Contains(prompt, "Code Review Required") {
		t.Error("prompt should not have code review section when requires is nil")
	}
	if strings.Contains(prompt, "Approval Required") {
		t.Error("prompt should not have approval section when requires is nil")
	}
}

func TestPromptBuilder_Build_WithEpicContext(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			ID:    "epic1",
			Title: "Test Epic",
		},
		Task: &ticks.Task{
			ID:          "task1",
			Title:       "Test task",
			Description: "Do something.",
		},
		EpicContext: "## Architecture\n\nThis codebase uses MVC pattern.\n\n## Key Files\n\n- main.go: Entry point",
	}

	prompt := pb.Build(ctx)

	// Should have epic context section
	if !strings.Contains(prompt, "## Epic Context") {
		t.Error("prompt missing epic context section header")
	}
	if !strings.Contains(prompt, "The following context was generated for this epic") {
		t.Error("prompt missing epic context intro text")
	}
	// Should contain the actual context content
	if !strings.Contains(prompt, "This codebase uses MVC pattern") {
		t.Error("prompt missing epic context content")
	}
	if !strings.Contains(prompt, "main.go: Entry point") {
		t.Error("prompt missing epic context key files")
	}
}

func TestPromptBuilder_Build_NoEpicContext(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			ID:    "epic1",
			Title: "Test Epic",
		},
		Task: &ticks.Task{
			ID:          "task1",
			Title:       "Test task",
			Description: "Do something.",
		},
		EpicContext: "",
	}

	prompt := pb.Build(ctx)

	// Should NOT have epic context section when empty
	if strings.Contains(prompt, "## Epic Context") {
		t.Error("prompt should not have epic context section when EpicContext is empty")
	}
	if strings.Contains(prompt, "The following context was generated for this epic") {
		t.Error("prompt should not have epic context intro when EpicContext is empty")
	}
}

func TestPromptBuilder_Build_EpicContextBeforeEpicNotes(t *testing.T) {
	pb := NewPromptBuilder()

	ctx := IterationContext{
		Iteration: 1,
		Epic: &ticks.Epic{
			ID:    "epic1",
			Title: "Test Epic",
		},
		Task: &ticks.Task{
			ID:          "task1",
			Title:       "Test task",
			Description: "Do something.",
		},
		EpicContext: "Some pre-computed context here",
		EpicNotes:   []string{"Note from previous iteration"},
	}

	prompt := pb.Build(ctx)

	// Both sections should exist
	contextIdx := strings.Index(prompt, "## Epic Context")
	notesIdx := strings.Index(prompt, "## IMPORTANT: Review Epic Notes First")

	if contextIdx == -1 {
		t.Fatal("prompt missing epic context section")
	}
	if notesIdx == -1 {
		t.Fatal("prompt missing epic notes section")
	}

	// Epic Context should appear before Epic Notes
	if contextIdx >= notesIdx {
		t.Error("epic context section should appear before epic notes section")
	}
}
