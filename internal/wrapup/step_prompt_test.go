package wrapup

import (
	"strings"
	"testing"
)

func TestBuildStepPrompt(t *testing.T) {
	tests := []struct {
		name      string
		step      WrapupStep
		index     int
		total     int
		completed []string
		wantIn    []string // substrings that must appear
		wantOut   []string // substrings that must NOT appear
	}{
		{
			name: "first step of three",
			step: WrapupStep{
				Title:  "Run linter",
				Prompt: "Run golangci-lint and fix any issues.",
				Verify: "No lint errors remain.",
			},
			index:     0,
			total:     3,
			completed: nil,
			wantIn: []string{
				"Step 1 of 3: Run linter",
				"- [ ] Step 1: Run linter (current)",
				"- [ ] Step 2: (pending)",
				"- [ ] Step 3: (pending)",
				"Run golangci-lint and fix any issues.",
				"No lint errors remain.",
				"<promise>STEP_DONE</promise>",
				"<promise>ESCALATE: reason</promise>",
			},
			wantOut: []string{
				"[x]",
			},
		},
		{
			name: "middle step with completed steps",
			step: WrapupStep{
				Title:  "Update changelog",
				Prompt: "Add entries to CHANGELOG.md.",
				Verify: "Changelog has new entries.",
			},
			index:     1,
			total:     3,
			completed: []string{"Run linter"},
			wantIn: []string{
				"Step 2 of 3: Update changelog",
				"- [x] Step 1: Run linter",
				"- [ ] Step 2: Update changelog (current)",
				"- [ ] Step 3: (pending)",
				"Add entries to CHANGELOG.md.",
			},
		},
		{
			name: "last step all previous completed",
			step: WrapupStep{
				Title:  "Final review",
				Prompt: "Review all changes.",
				Verify: "",
			},
			index:     2,
			total:     3,
			completed: []string{"Run linter", "Update changelog"},
			wantIn: []string{
				"Step 3 of 3: Final review",
				"- [x] Step 1: Run linter",
				"- [x] Step 2: Update changelog",
				"- [ ] Step 3: Final review (current)",
				"Review all changes.",
			},
			wantOut: []string{
				"Completion Criteria", // no verify field
				"(pending)",
			},
		},
		{
			name: "single step",
			step: WrapupStep{
				Title:  "Only step",
				Prompt: "Do the thing.",
				Verify: "Thing is done.",
			},
			index:     0,
			total:     1,
			completed: nil,
			wantIn: []string{
				"Step 1 of 1: Only step",
				"- [ ] Step 1: Only step (current)",
				"Thing is done.",
			},
			wantOut: []string{
				"(pending)",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildStepPrompt(tt.step, tt.index, tt.total, tt.completed)

			for _, want := range tt.wantIn {
				if !strings.Contains(got, want) {
					t.Errorf("prompt missing expected substring: %q\n\ngot:\n%s", want, got)
				}
			}
			for _, bad := range tt.wantOut {
				if strings.Contains(got, bad) {
					t.Errorf("prompt contains unexpected substring: %q\n\ngot:\n%s", bad, got)
				}
			}
		})
	}
}

func TestBuildRetryPrompt(t *testing.T) {
	tests := []struct {
		name           string
		step           WrapupStep
		previousOutput string
		wantIn         []string
		wantOut        []string
	}{
		{
			name: "retry with verify",
			step: WrapupStep{
				Title:  "Run tests",
				Prompt: "Run all tests.",
				Verify: "All tests pass.",
			},
			previousOutput: "I ran some tests but got distracted.",
			wantIn: []string{
				"Retry: Run tests",
				"did not include a STEP_DONE signal",
				"All tests pass.",
				"<promise>STEP_DONE</promise>",
				"<promise>ESCALATE: reason</promise>",
			},
		},
		{
			name: "retry without verify",
			step: WrapupStep{
				Title:  "Clean up",
				Prompt: "Remove temp files.",
				Verify: "",
			},
			previousOutput: "working on it...",
			wantIn: []string{
				"Retry: Clean up",
				"STEP_DONE",
			},
			wantOut: []string{
				"Completion Criteria",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildRetryPrompt(tt.step, tt.previousOutput)

			for _, want := range tt.wantIn {
				if !strings.Contains(got, want) {
					t.Errorf("retry prompt missing expected substring: %q\n\ngot:\n%s", want, got)
				}
			}
			for _, bad := range tt.wantOut {
				if strings.Contains(got, bad) {
					t.Errorf("retry prompt contains unexpected substring: %q\n\ngot:\n%s", bad, got)
				}
			}
		})
	}
}
