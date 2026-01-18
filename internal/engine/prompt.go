package engine

import (
	"fmt"
	"strings"
	"text/template"

	"github.com/pengelbrecht/ticks/internal/ticks"
)

// IterationContext contains all context needed to build an iteration prompt.
type IterationContext struct {
	// Iteration is the current iteration number (1-indexed).
	Iteration int

	// Epic is the parent epic for the current task.
	Epic *ticks.Epic

	// Task is the current task to complete.
	Task *ticks.Task

	// EpicNotes are notes from previous iterations stored in the epic.
	EpicNotes []string

	// HumanFeedback contains notes from humans on this task.
	// These are feedback/responses from human reviewers after handoff.
	HumanFeedback []ticks.Note

	// EpicContext contains pre-computed context for the epic.
	// This is the contents of .ticker/context/<epic-id>.md if it exists,
	// or an empty string if no context has been generated.
	EpicContext string
}

// PromptBuilder constructs prompts for autonomous agent iterations.
type PromptBuilder struct {
	tmpl *template.Template
}

// NewPromptBuilder creates a new PromptBuilder with the default template.
func NewPromptBuilder() *PromptBuilder {
	tmpl := template.Must(template.New("prompt").Parse(promptTemplate))
	return &PromptBuilder{tmpl: tmpl}
}

// Build generates a prompt string from the given iteration context.
func (pb *PromptBuilder) Build(ctx IterationContext) string {
	var buf strings.Builder

	data := templateData{
		Iteration:     ctx.Iteration,
		EpicNotes:     ctx.EpicNotes,
		HumanFeedback: ctx.HumanFeedback,
		EpicContext:   ctx.EpicContext,
	}

	if ctx.Epic != nil {
		data.EpicID = ctx.Epic.ID
		data.EpicTitle = ctx.Epic.Title
		data.EpicDescription = ctx.Epic.Description
	}

	if ctx.Task != nil {
		data.TaskID = ctx.Task.ID
		data.TaskTitle = ctx.Task.Title
		data.TaskDescription = ctx.Task.Description
		data.AcceptanceCriteria = extractAcceptanceCriteria(ctx.Task.Description)
		if ctx.Task.Requires != nil {
			data.Requires = *ctx.Task.Requires
		}
	}

	if err := pb.tmpl.Execute(&buf, data); err != nil {
		// This should never happen with a valid template
		return fmt.Sprintf("Error generating prompt: %v", err)
	}

	return buf.String()
}

// templateData holds the data passed to the prompt template.
type templateData struct {
	Iteration          int
	EpicID             string
	EpicTitle          string
	EpicDescription    string
	TaskID             string
	TaskTitle          string
	TaskDescription    string
	AcceptanceCriteria string
	Requires           string // Pre-declared gate: approval, review, content
	EpicNotes          []string
	HumanFeedback      []ticks.Note
	EpicContext        string
}

// extractAcceptanceCriteria parses acceptance criteria from a task description.
// Looks for a section starting with "Acceptance Criteria:" or "## Acceptance Criteria".
func extractAcceptanceCriteria(description string) string {
	// Look for acceptance criteria section
	markers := []string{
		"Acceptance Criteria:",
		"## Acceptance Criteria",
		"### Acceptance Criteria",
		"acceptance criteria:",
	}

	lower := strings.ToLower(description)
	for _, marker := range markers {
		idx := strings.Index(lower, strings.ToLower(marker))
		if idx >= 0 {
			// Return everything from the marker onwards
			return strings.TrimSpace(description[idx:])
		}
	}

	return ""
}

// promptTemplate is the Go template for generating iteration prompts.
const promptTemplate = `# Iteration {{.Iteration}}
{{if .EpicContext}}
## Epic Context

The following context was generated for this epic. Use it to understand the codebase.

{{.EpicContext}}
{{end}}
{{if .EpicNotes}}
## IMPORTANT: Review Epic Notes First

These notes were left by previous iterations. Read them carefully before starting work.

{{range .EpicNotes}}- {{.}}
{{end}}
{{end}}
## Epic: {{.EpicTitle}}
{{if .EpicDescription}}
{{.EpicDescription}}
{{end}}

## Current Task
{{if .TaskID}}**[{{.TaskID}}] {{.TaskTitle}}**{{else}}**{{.TaskTitle}}**{{end}}

{{.TaskDescription}}
{{if .AcceptanceCriteria}}

### Acceptance Criteria
{{.AcceptanceCriteria}}
{{end}}
{{if .HumanFeedback}}

## Human Feedback

This task was previously handed to a human. Their response:

{{range .HumanFeedback}}- {{.Content}}
{{end}}
Address this feedback before proceeding.
{{end}}

## Instructions

1. **Review epic notes above** - Previous iterations may have left important context.
2. **Complete the current task** - Implement the required functionality as specified.
3. **Run tests** - Ensure all existing tests pass and add new tests if appropriate.
4. **Close the task** - Run ` + "`tk close {{.TaskID}} --reason \"<solution summary>\"`" + ` when complete. The reason should summarize HOW you solved the task (approach taken, key changes made, files modified).
5. **Simplify your code (optional)** - If you have access to the code-simplifier skill, consider running it on your modified files before committing to ensure clean, maintainable code.
6. **Commit your changes** - Create a commit with the task ID in the message.
7. **Add epic note** - Run ` + "`tk note {{.EpicID}} \"<message>\"`" + ` to leave context for future iterations. Include learnings, gotchas, architectural decisions, or anything the next iteration should know.
{{if eq .Requires "content"}}

## ⚠️ Content Review Required

This task requires **human content review** before closing. When you signal COMPLETE, a human will review your work for UI/copy quality.

**CRITICAL: Before signaling COMPLETE, you MUST add a note to this task explaining where and how to review your changes:**

` + "```bash" + `
tk note {{.TaskID}} "Review: <specific files and locations to check, what to look for>"
` + "```" + `

**Good review note examples:**
- "Review: Error messages in src/components/PaymentForm.tsx lines 45-60. Check tone is user-friendly."
- "Review: New onboarding copy in src/pages/Welcome.tsx. Verify clarity and brand voice."
- "Review: Button labels changed in src/components/Header.tsx - 'Submit' → 'Save Changes'"

**Bad review notes:**
- "Review: UI changes" (too vague - WHERE?)
- "Done with the task" (not helpful - WHAT to review?)

The human reviewer needs to know exactly what to look at and what to evaluate.
{{else if eq .Requires "review"}}

## ⚠️ Code Review Required

This task requires **code review** before closing. When you signal COMPLETE, a human will review your PR.

**Before signaling COMPLETE:**
1. Create a PR with your changes
2. Add a note to this task with the PR URL and key areas to review:

` + "```bash" + `
tk note {{.TaskID}} "PR: <url> - Key changes: <what to focus on during review>"
` + "```" + `
{{else if eq .Requires "approval"}}

## ⚠️ Approval Required

This task requires **human approval** before closing. When you signal COMPLETE, a human will review and approve your work.

**Before signaling COMPLETE, add a note explaining what was done and any risks:**

` + "```bash" + `
tk note {{.TaskID}} "Summary: <what changed, any risks or considerations for approval>"
` + "```" + `
{{end}}

## Handoff Signals

When you need human involvement, emit a signal and the system will hand off the task:

| Signal | When to Use |
|--------|-------------|
| ` + "`<promise>APPROVAL_NEEDED: reason</promise>`" + ` | Work complete, needs human sign-off |
| ` + "`<promise>INPUT_NEEDED: question</promise>`" + ` | Need human to answer a question |
| ` + "`<promise>REVIEW_REQUESTED: pr_url</promise>`" + ` | PR created, needs code review |
| ` + "`<promise>CONTENT_REVIEW: description</promise>`" + ` | UI/copy needs human judgment |
| ` + "`<promise>ESCALATE: issue</promise>`" + ` | Found unexpected issue needing direction |
| ` + "`<promise>CHECKPOINT: summary</promise>`" + ` | Completed phase, need verification |
| ` + "`<promise>EJECT: reason</promise>`" + ` | Cannot complete - requires human work |

**IMPORTANT: Include Complete Context in Handoff Signals**

The human reviewer only sees the signal reason - they do NOT have access to your output logs. Your signal must be completely self-contained with all context needed to respond.

**Good examples:**
- ` + "`<promise>CONTENT_REVIEW: Error message options - A: 'Invalid input', B: 'Please check your entry', C: 'Oops! Something went wrong'</promise>`" + `
- ` + "`<promise>INPUT_NEEDED: Should retry logic use exponential backoff (2s, 4s, 8s) or linear (2s, 2s, 2s)?</promise>`" + `

**Bad examples:**
- ` + "`<promise>CONTENT_REVIEW: Need approval on error messages</promise>`" + ` (Which messages? Human can't see your output!)
- ` + "`<promise>INPUT_NEEDED: Which option should I use?</promise>`" + ` (What options? Include them!)

After emitting a handoff signal, the system moves to another task. When a human responds, you may be assigned this task again with their feedback in the notes.

## Reading Human Feedback

If this task was previously handed off, check the "Human Feedback" section above for the human's response. Address their feedback before proceeding.

## Rules

1. **One task per iteration** - Focus only on the current task. Do not work on other tasks.
2. **No questions** - You are autonomous. Make reasonable decisions based on the context provided.
3. **Always leave notes** - Before finishing, add a note summarizing what you did and any context for the next iteration.
4. **Don't modify ticker internals** - Never modify .tick/, .ticker/, or .gitignore unless explicitly required by the task. These are managed by ticker.
5. **Task completion** - Just close your task with ` + "`tk close`" + ` when done. Ticker automatically detects when all tasks in the epic are complete.
6. **Never revert other tasks' work** - Code already in the repo was committed by previous tasks and is intentional. You may revert your own changes from this iteration, but NEVER revert commits from other tasks. If you think existing code is wrong, leave a note or escalate - do not "clean up" or revert code you didn't write.

Begin working on the task now.
`
