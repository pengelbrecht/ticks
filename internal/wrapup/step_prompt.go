package wrapup

import (
	"fmt"
	"strings"
)

// WrapupStep is a single agent-driven wrapup step parsed from .tick/wrapup.md.
// Steps with the same Group number run in parallel; groups execute sequentially
// (group 1 before group 2). Group 0 means sequential (no parallelism).
type WrapupStep struct {
	Title  string `json:"title"`
	Prompt string `json:"prompt"`
	Verify string `json:"verify"`
	Group  int    `json:"group"`
}

// BuildStepPrompt generates the prompt sent to the agent for a wrapup step.
// It includes a header, progress checklist, the step prompt, verification
// criteria, and signal instructions.
func BuildStepPrompt(step WrapupStep, index int, total int, completed []string) string {
	var b strings.Builder

	// Header
	fmt.Fprintf(&b, "# Epic Wrapup — Step %d of %d: %s\n\n", index+1, total, step.Title)

	// Progress checklist
	b.WriteString("## Progress\n\n")
	for i, title := range completed {
		fmt.Fprintf(&b, "- [x] Step %d: %s\n", i+1, title)
	}
	fmt.Fprintf(&b, "- [ ] Step %d: %s (current)\n", index+1, step.Title)
	for i := index + 1; i < total; i++ {
		fmt.Fprintf(&b, "- [ ] Step %d: (pending)\n", i+1)
	}
	b.WriteString("\n")

	// Step prompt
	b.WriteString("## Task\n\n")
	b.WriteString(step.Prompt)
	b.WriteString("\n\n")

	// Verification criteria
	if step.Verify != "" {
		b.WriteString("## Completion Criteria\n\n")
		b.WriteString(step.Verify)
		b.WriteString("\n\n")
	}

	// Signal instructions
	b.WriteString("## When Done\n\n")
	b.WriteString("When you have completed this step and verified the criteria above, emit:\n")
	b.WriteString("  <promise>STEP_DONE</promise>\n\n")
	b.WriteString("If you cannot complete this step, emit:\n")
	b.WriteString("  <promise>ESCALATE: reason</promise>\n")

	return b.String()
}

// BuildRetryPrompt generates a re-prompt when the agent did not emit STEP_DONE.
func BuildRetryPrompt(step WrapupStep, previousOutput string) string {
	var b strings.Builder

	fmt.Fprintf(&b, "# Retry: %s\n\n", step.Title)

	b.WriteString("Your previous response did not include a STEP_DONE signal. ")
	b.WriteString("Please review what you were working on and complete the step.\n\n")

	if step.Verify != "" {
		b.WriteString("## Completion Criteria\n\n")
		b.WriteString(step.Verify)
		b.WriteString("\n\n")
	}

	b.WriteString("When complete, you MUST emit:\n")
	b.WriteString("  <promise>STEP_DONE</promise>\n\n")
	b.WriteString("If you cannot complete this step, emit:\n")
	b.WriteString("  <promise>ESCALATE: reason</promise>\n")

	return b.String()
}
